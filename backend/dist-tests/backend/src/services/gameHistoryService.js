"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.gameHistoryService = exports.GameHistoryService = void 0;
const uuid_1 = require("uuid");
const prisma_1 = require("../utils/prisma");
function isDbPersistenceEnabled() {
    return String(process.env.ENABLE_DB_PERSISTENCE || '').toLowerCase() === 'true';
}
function toMs(d) {
    if (!d)
        return undefined;
    return d.getTime();
}
/**
 * In-memory game history store (Phase 1).
 * Persists:
 * - per-game hands (with per-hand action log)
 * - per-player seat sessions (join/leave boundaries)
 *
 * Note: This does not survive server restarts. Later we can back it with Prisma.
 */
class GameHistoryService {
    constructor() {
        this.gamesById = new Map();
        this.gameIdByCode = new Map(); // code -> gameId
        this.sessionsByPlayerId = new Map(); // playerId -> sessions (newest-first)
        this.openSessionIdByGameAndPlayer = new Map(); // `${gameId}:${playerId}` -> sessionId
        this.lastHandEndedAtByGameId = new Map(); // gameId -> endedAt
        this.hydratedFromDb = false;
    }
    /**
     * Hydrate in-memory history from Postgres/Prisma.
     *
     * Note: We do not currently persist explicit seat sessions. During hydration we synthesize
     * a single session per (game, player) covering the whole game based on hand snapshots.
     */
    async loadFromDb(options) {
        if (!isDbPersistenceEnabled())
            return;
        const prisma = (0, prisma_1.getPrisma)();
        const since = typeof options?.sinceMs === 'number' ? new Date(options.sinceMs) : undefined;
        const games = await prisma.game.findMany({
            include: {
                hands: {
                    where: since ? { endedAt: { gte: since } } : undefined,
                    include: { actions: true },
                    orderBy: { handNumber: 'asc' },
                },
            },
            orderBy: { createdAt: 'desc' },
        });
        // Replace in-memory state with DB snapshot.
        this.gamesById.clear();
        this.gameIdByCode.clear();
        this.sessionsByPlayerId.clear();
        this.openSessionIdByGameAndPlayer.clear();
        this.lastHandEndedAtByGameId.clear();
        for (const g of games) {
            const stored = {
                gameId: g.id,
                code: g.code,
                clubId: g.clubId || undefined,
                variant: g.variant,
                settings: g.settings,
                createdAt: toMs(g.createdAt) ?? Date.now(),
                endedAt: toMs(g.finishedAt) || undefined,
                hands: [],
            };
            let lastEndedAt = 0;
            const participants = new Set();
            for (const h of g.hands || []) {
                const endedAt = toMs(h.endedAt);
                if (!endedAt)
                    continue;
                lastEndedAt = Math.max(lastEndedAt, endedAt);
                const table = (h.table || undefined);
                const seats = table?.seats || [];
                for (const pid of seats)
                    participants.add(pid);
                const stacksStart = (h.stacksStartByPlayerId || undefined);
                if (stacksStart)
                    for (const pid of Object.keys(stacksStart))
                        participants.add(pid);
                const winners = (h.winners || undefined);
                if (winners)
                    for (const w of winners)
                        if (w?.playerId)
                            participants.add(w.playerId);
                const actions = (h.actions || []).map((a) => ({
                    playerId: a.playerId,
                    action: a.action,
                    amount: typeof a.amount === 'number' ? a.amount : undefined,
                    phase: (a.phase || undefined),
                    betTo: typeof a.betTo === 'number' ? a.betTo : undefined,
                    currentBetAfter: typeof a.currentBetAfter === 'number' ? a.currentBetAfter : undefined,
                    timestamp: toMs(a.timestamp) ?? endedAt,
                }));
                for (const a of actions)
                    if (a.playerId)
                        participants.add(a.playerId);
                const reason = h.endReason === 'showdown' ? 'showdown' : 'fold';
                const full = {
                    handNumber: h.handNumber,
                    startedAt: toMs(h.startedAt),
                    endedAt,
                    reason,
                    winners: winners || [],
                    pot: h.pot,
                    communityCards: (h.communityCards || []),
                    actions,
                    table,
                    stacksStartByPlayerId: stacksStart,
                    stacksEndByPlayerId: (h.stacksEndByPlayerId || undefined),
                };
                stored.hands.push(full);
            }
            this.gamesById.set(stored.gameId, stored);
            this.gameIdByCode.set(stored.code.toUpperCase(), stored.gameId);
            if (lastEndedAt)
                this.lastHandEndedAtByGameId.set(stored.gameId, lastEndedAt);
            const leftAt = stored.endedAt ?? (lastEndedAt || undefined);
            for (const playerId of participants) {
                const session = {
                    sessionId: (0, uuid_1.v4)(),
                    gameId: stored.gameId,
                    code: stored.code,
                    clubId: stored.clubId,
                    playerId,
                    joinedAt: stored.createdAt,
                    leftAt,
                };
                const existing = this.sessionsByPlayerId.get(playerId) || [];
                this.sessionsByPlayerId.set(playerId, [session, ...existing]);
            }
        }
        this.hydratedFromDb = true;
    }
    async ensureHydratedFromDb(options) {
        if (this.hydratedFromDb)
            return;
        await this.loadFromDb(options);
    }
    registerGame(game) {
        if (this.gamesById.has(game.gameId))
            return;
        this.gamesById.set(game.gameId, { ...game, hands: [] });
        this.gameIdByCode.set(game.code.toUpperCase(), game.gameId);
    }
    markGameEnded(gameId, endedAt) {
        const g = this.gamesById.get(gameId);
        if (!g)
            return;
        g.endedAt = endedAt;
        this.gamesById.set(gameId, g);
    }
    recordHandFinished(gameId, hand) {
        const g = this.gamesById.get(gameId);
        if (!g)
            return null;
        // Idempotency: if we already recorded a hand at this exact endedAt, skip.
        const lastEndedAt = this.lastHandEndedAtByGameId.get(gameId);
        if (lastEndedAt && lastEndedAt === hand.endedAt)
            return null;
        const handNumber = g.hands.length + 1;
        const full = { handNumber, ...hand };
        g.hands.push(full);
        this.gamesById.set(gameId, g);
        this.lastHandEndedAtByGameId.set(gameId, hand.endedAt);
        return full;
    }
    recordPlayerJoined(gameCode, playerId, joinedAt) {
        const gameId = this.gameIdByCode.get(gameCode.toUpperCase());
        if (!gameId)
            return null;
        const g = this.gamesById.get(gameId);
        if (!g)
            return null;
        const key = `${gameId}:${playerId}`;
        if (this.openSessionIdByGameAndPlayer.has(key)) {
            // Already "seated" (socket re-join). Don’t create a duplicate open session.
            return null;
        }
        const session = {
            sessionId: (0, uuid_1.v4)(),
            gameId,
            code: g.code,
            clubId: g.clubId,
            playerId,
            joinedAt,
        };
        const existing = this.sessionsByPlayerId.get(playerId) || [];
        this.sessionsByPlayerId.set(playerId, [session, ...existing]);
        this.openSessionIdByGameAndPlayer.set(key, session.sessionId);
        return session;
    }
    recordPlayerLeft(gameCode, playerId, leftAt) {
        const gameId = this.gameIdByCode.get(gameCode.toUpperCase());
        if (!gameId)
            return;
        const key = `${gameId}:${playerId}`;
        const sessionId = this.openSessionIdByGameAndPlayer.get(key);
        if (!sessionId)
            return;
        const sessions = this.sessionsByPlayerId.get(playerId) || [];
        const idx = sessions.findIndex((s) => s.sessionId === sessionId);
        if (idx >= 0) {
            const s = sessions[idx];
            if (!s.leftAt) {
                sessions[idx] = { ...s, leftAt };
                this.sessionsByPlayerId.set(playerId, sessions);
            }
        }
        this.openSessionIdByGameAndPlayer.delete(key);
    }
    closeAllOpenSessionsForGame(gameId, leftAt) {
        for (const [key, sessionId] of this.openSessionIdByGameAndPlayer.entries()) {
            if (!key.startsWith(`${gameId}:`))
                continue;
            const [, playerId] = key.split(':');
            const sessions = this.sessionsByPlayerId.get(playerId) || [];
            const idx = sessions.findIndex((s) => s.sessionId === sessionId);
            if (idx >= 0 && !sessions[idx].leftAt) {
                sessions[idx] = { ...sessions[idx], leftAt };
                this.sessionsByPlayerId.set(playerId, sessions);
            }
            this.openSessionIdByGameAndPlayer.delete(key);
        }
    }
    getPlayerSessions(playerId) {
        return this.sessionsByPlayerId.get(playerId) || [];
    }
    getGame(gameId) {
        return this.gamesById.get(gameId) || null;
    }
    listGamesForClub(clubId) {
        return Array.from(this.gamesById.values())
            .filter((g) => g.clubId === clubId)
            .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    }
    listGamesForPlayer(playerId) {
        const sessions = this.getPlayerSessions(playerId);
        const gameIds = new Set(sessions.map((s) => s.gameId));
        const games = [];
        for (const gid of gameIds) {
            const g = this.gamesById.get(gid);
            if (g)
                games.push(g);
        }
        return games.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    }
    /**
     * Returns hands for a player's seat session: hands whose `endedAt` is within [joinedAt, leftAt].
     * If `leftAt` is missing, returns all hands with endedAt >= joinedAt.
     */
    getHandsForSession(session) {
        const g = this.gamesById.get(session.gameId);
        if (!g)
            return [];
        const leftAt = session.leftAt ?? Number.POSITIVE_INFINITY;
        return g.hands.filter((h) => h.endedAt >= session.joinedAt && h.endedAt <= leftAt);
    }
}
exports.GameHistoryService = GameHistoryService;
exports.gameHistoryService = new GameHistoryService();
