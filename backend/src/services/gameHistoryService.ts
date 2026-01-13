import { v4 as uuidv4 } from 'uuid';
import { Card, GameAction, GameSettings, PokerVariant } from '../types';
import { getPrisma } from '../utils/prisma';

export type StoredHand = {
  handNumber: number;
  startedAt?: number;
  endedAt: number;
  reason: 'fold' | 'showdown';
  winners: Array<{ playerId: string; amount: number }>;
  pot: number;
  communityCards: Card[];
  actions: GameAction[];
  /**
   * Table snapshot needed for positional analytics (UTG/HJ/CO/BTN/SB/BB).
   * Older history entries may omit this.
   *
   * Indices refer to the `seats` array (which matches `GameState.players` order).
   */
  table?: {
    seats: string[]; // playerIds in seat order (same order as GameState.players)
    dealerPosition: number;
    smallBlindPosition: number;
    bigBlindPosition: number;
  };
  /**
   * Chip stacks captured at the start of the hand (before any action).
   * Used for effective stack depth bucketing and net-winnings calculation.
   */
  stacksStartByPlayerId?: Record<string, number>;
  /**
   * Chip stacks captured after the hand finishes (after pot distribution).
   * Used for net-winnings calculation.
   */
  stacksEndByPlayerId?: Record<string, number>;
};

export type StoredGame = {
  gameId: string;
  code: string;
  clubId?: string;
  variant: PokerVariant;
  settings: GameSettings;
  createdAt: number;
  endedAt?: number;
  hands: StoredHand[];
};

export type SeatSession = {
  sessionId: string;
  gameId: string;
  code: string;
  clubId?: string;
  playerId: string;
  joinedAt: number;
  leftAt?: number;
};

function isDbPersistenceEnabled(): boolean {
  return String(process.env.ENABLE_DB_PERSISTENCE || '').toLowerCase() === 'true';
}

function toMs(d: Date | null | undefined): number | undefined {
  if (!d) return undefined;
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
export class GameHistoryService {
  private gamesById = new Map<string, StoredGame>();
  private gameIdByCode = new Map<string, string>(); // code -> gameId
  private sessionsByPlayerId = new Map<string, SeatSession[]>(); // playerId -> sessions (newest-first)
  private openSessionIdByGameAndPlayer = new Map<string, string>(); // `${gameId}:${playerId}` -> sessionId
  private lastHandEndedAtByGameId = new Map<string, number>(); // gameId -> endedAt
  private hydratedFromDb = false;

  /**
   * Hydrate in-memory history from Postgres/Prisma.
   *
   * Note: We do not currently persist explicit seat sessions. During hydration we synthesize
   * a single session per (game, player) covering the whole game based on hand snapshots.
   */
  async loadFromDb(options?: { sinceMs?: number }): Promise<void> {
    if (!isDbPersistenceEnabled()) return;

    const prisma = getPrisma();
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
      const stored: StoredGame = {
        gameId: g.id,
        code: g.code,
        clubId: g.clubId || undefined,
        variant: g.variant as PokerVariant,
        settings: g.settings as unknown as GameSettings,
        createdAt: toMs(g.createdAt) ?? Date.now(),
        endedAt: toMs(g.finishedAt) || undefined,
        hands: [],
      };

      let lastEndedAt = 0;
      const participants = new Set<string>();

      for (const h of g.hands || []) {
        const endedAt = toMs(h.endedAt);
        if (!endedAt) continue;
        lastEndedAt = Math.max(lastEndedAt, endedAt);

        const table = (h.table || undefined) as unknown as StoredHand['table'] | undefined;
        const seats = table?.seats || [];
        for (const pid of seats) participants.add(pid);

        const stacksStart = (h.stacksStartByPlayerId || undefined) as unknown as
          | Record<string, number>
          | undefined;
        if (stacksStart) for (const pid of Object.keys(stacksStart)) participants.add(pid);

        const winners = (h.winners || undefined) as unknown as StoredHand['winners'] | undefined;
        if (winners) for (const w of winners) if (w?.playerId) participants.add(w.playerId);

        const actions: GameAction[] = (h.actions || []).map((a) => ({
          playerId: a.playerId,
          action: a.action as GameAction['action'],
          amount: typeof a.amount === 'number' ? a.amount : undefined,
          phase: (a.phase || undefined) as GameAction['phase'],
          betTo: typeof a.betTo === 'number' ? a.betTo : undefined,
          currentBetAfter: typeof a.currentBetAfter === 'number' ? a.currentBetAfter : undefined,
          timestamp: toMs(a.timestamp) ?? endedAt,
        }));
        for (const a of actions) if (a.playerId) participants.add(a.playerId);

        const reason = h.endReason === 'showdown' ? 'showdown' : 'fold';

        const full: StoredHand = {
          handNumber: h.handNumber,
          startedAt: toMs(h.startedAt),
          endedAt,
          reason,
          winners: winners || [],
          pot: h.pot,
          communityCards: (h.communityCards || []) as unknown as Card[],
          actions,
          table,
          stacksStartByPlayerId: stacksStart,
          stacksEndByPlayerId: (h.stacksEndByPlayerId || undefined) as unknown as
            | Record<string, number>
            | undefined,
        };

        stored.hands.push(full);
      }

      this.gamesById.set(stored.gameId, stored);
      this.gameIdByCode.set(stored.code.toUpperCase(), stored.gameId);
      if (lastEndedAt) this.lastHandEndedAtByGameId.set(stored.gameId, lastEndedAt);

      const leftAt = stored.endedAt ?? (lastEndedAt || undefined);
      for (const playerId of participants) {
        const session: SeatSession = {
          sessionId: uuidv4(),
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

  async ensureHydratedFromDb(options?: { sinceMs?: number }): Promise<void> {
    if (this.hydratedFromDb) return;
    await this.loadFromDb(options);
  }

  registerGame(game: Omit<StoredGame, 'hands'>): void {
    if (this.gamesById.has(game.gameId)) return;
    this.gamesById.set(game.gameId, { ...game, hands: [] });
    this.gameIdByCode.set(game.code.toUpperCase(), game.gameId);
  }

  markGameEnded(gameId: string, endedAt: number): void {
    const g = this.gamesById.get(gameId);
    if (!g) return;
    g.endedAt = endedAt;
    this.gamesById.set(gameId, g);
  }

  recordHandFinished(gameId: string, hand: Omit<StoredHand, 'handNumber'>): StoredHand | null {
    const g = this.gamesById.get(gameId);
    if (!g) return null;

    // Idempotency: if we already recorded a hand at this exact endedAt, skip.
    const lastEndedAt = this.lastHandEndedAtByGameId.get(gameId);
    if (lastEndedAt && lastEndedAt === hand.endedAt) return null;

    const handNumber = g.hands.length + 1;
    const full: StoredHand = { handNumber, ...hand };
    g.hands.push(full);
    this.gamesById.set(gameId, g);
    this.lastHandEndedAtByGameId.set(gameId, hand.endedAt);
    return full;
  }

  recordPlayerJoined(gameCode: string, playerId: string, joinedAt: number): SeatSession | null {
    const gameId = this.gameIdByCode.get(gameCode.toUpperCase());
    if (!gameId) return null;
    const g = this.gamesById.get(gameId);
    if (!g) return null;

    const key = `${gameId}:${playerId}`;
    if (this.openSessionIdByGameAndPlayer.has(key)) {
      // Already "seated" (socket re-join). Don’t create a duplicate open session.
      return null;
    }

    const session: SeatSession = {
      sessionId: uuidv4(),
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

  recordPlayerLeft(gameCode: string, playerId: string, leftAt: number): void {
    const gameId = this.gameIdByCode.get(gameCode.toUpperCase());
    if (!gameId) return;
    const key = `${gameId}:${playerId}`;
    const sessionId = this.openSessionIdByGameAndPlayer.get(key);
    if (!sessionId) return;

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

  closeAllOpenSessionsForGame(gameId: string, leftAt: number): void {
    for (const [key, sessionId] of this.openSessionIdByGameAndPlayer.entries()) {
      if (!key.startsWith(`${gameId}:`)) continue;
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

  getPlayerSessions(playerId: string): SeatSession[] {
    return this.sessionsByPlayerId.get(playerId) || [];
  }

  getGame(gameId: string): StoredGame | null {
    return this.gamesById.get(gameId) || null;
  }

  listGamesForClub(clubId: string): StoredGame[] {
    return Array.from(this.gamesById.values())
      .filter((g) => g.clubId === clubId)
      .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  }

  listGamesForPlayer(playerId: string): StoredGame[] {
    const sessions = this.getPlayerSessions(playerId);
    const gameIds = new Set(sessions.map((s) => s.gameId));
    const games: StoredGame[] = [];
    for (const gid of gameIds) {
      const g = this.gamesById.get(gid);
      if (g) games.push(g);
    }
    return games.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  }

  /**
   * Returns hands for a player's seat session: hands whose `endedAt` is within [joinedAt, leftAt].
   * If `leftAt` is missing, returns all hands with endedAt >= joinedAt.
   */
  getHandsForSession(session: SeatSession): StoredHand[] {
    const g = this.gamesById.get(session.gameId);
    if (!g) return [];
    const leftAt = session.leftAt ?? Number.POSITIVE_INFINITY;
    return g.hands.filter((h) => h.endedAt >= session.joinedAt && h.endedAt <= leftAt);
  }
}

export const gameHistoryService = new GameHistoryService();


