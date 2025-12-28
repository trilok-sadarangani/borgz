"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dbPersistenceService = exports.DbPersistenceService = void 0;
const prisma_1 = require("../utils/prisma");
const playerService_1 = require("./playerService");
const clubService_1 = require("./clubService");
const statsService_1 = require("./statsService");
function isEnabled() {
    return String(process.env.ENABLE_DB_PERSISTENCE || '').toLowerCase() === 'true';
}
function toDate(ms) {
    if (typeof ms !== 'number')
        return undefined;
    return new Date(ms);
}
function inferHandEndPhase(hand) {
    const n = (hand.communityCards || []).length;
    if (n >= 5)
        return 'river';
    if (n === 4)
        return 'turn';
    if (n === 3)
        return 'flop';
    // No board cards => hand ended preflop (either fold or all-in preflop)
    return 'pre-flop';
}
class DbPersistenceService {
    async persistPlayerStats(playerId) {
        if (!isEnabled())
            return;
        const prisma = (0, prisma_1.getPrisma)();
        const out = statsService_1.playerStatsService.getMyStats(playerId, {});
        // Store a compact subset of stats in the DB. The full breakdown still lives in the API response.
        const positionStats = {};
        for (const r of out.preflop.byPosition) {
            positionStats[r.position] = {
                hands: r.hands,
                pfr: r.hands ? (r.pfrCount / r.hands) * 100 : 0,
                rfi: r.openOpps ? (r.openRaiseCount / r.openOpps) * 100 : 0,
                threeBet: r.threeBetOpps ? (r.threeBetCount / r.threeBetOpps) * 100 : 0,
                fourBet: r.fourBetOpps ? (r.fourBetCount / r.fourBetOpps) * 100 : 0,
            };
        }
        await prisma.playerStats.upsert({
            where: { playerId },
            create: {
                playerId,
                totalHands: out.summary.totalHands,
                handsWon: out.summary.handsWon,
                winPercentage: out.summary.winPercentage,
                vpip: out.summary.vpip,
                pfr: out.summary.pfr,
                threeBetPercentage: out.summary.threeBetPercentage,
                cbetPercentage: out.summary.cbetPercentage,
                aggressionFactor: out.summary.aggressionFactor,
                averagePotSize: 0,
                totalWinnings: out.summary.totalWinnings,
                positionStats,
            },
            update: {
                totalHands: out.summary.totalHands,
                handsWon: out.summary.handsWon,
                winPercentage: out.summary.winPercentage,
                vpip: out.summary.vpip,
                pfr: out.summary.pfr,
                threeBetPercentage: out.summary.threeBetPercentage,
                cbetPercentage: out.summary.cbetPercentage,
                aggressionFactor: out.summary.aggressionFactor,
                totalWinnings: out.summary.totalWinnings,
                positionStats,
            },
        });
    }
    async ensurePlayer(playerId) {
        if (!isEnabled())
            return;
        const prisma = (0, prisma_1.getPrisma)();
        const seed = playerService_1.playerService.getSeedPlayer(playerId);
        await prisma.player.upsert({
            where: { id: playerId },
            create: { id: playerId, name: seed?.name || playerId, avatar: seed?.avatar, isSeed: !!seed },
            update: { name: seed?.name || playerId, avatar: seed?.avatar, isSeed: !!seed },
        });
    }
    async ensureClub(clubId) {
        if (!isEnabled())
            return;
        const prisma = (0, prisma_1.getPrisma)();
        const club = clubService_1.clubService.getClub(clubId);
        if (!club)
            return;
        // Ensure owner player exists to satisfy FK.
        await this.ensurePlayer(club.ownerId);
        await prisma.club.upsert({
            where: { id: club.id },
            create: {
                id: club.id,
                name: club.name,
                description: club.description,
                inviteCode: club.inviteCode,
                ownerId: club.ownerId,
            },
            update: {
                name: club.name,
                description: club.description,
                inviteCode: club.inviteCode,
                ownerId: club.ownerId,
            },
        });
        // Persist club members so Prisma Studio shows memberships too.
        const members = clubService_1.clubService.listMembers(club.id);
        for (const m of members) {
            await this.ensurePlayer(m.playerId);
            await prisma.clubMember.upsert({
                where: { clubId_playerId: { clubId: club.id, playerId: m.playerId } },
                create: {
                    clubId: club.id,
                    playerId: m.playerId,
                    role: m.role || 'member',
                    joinedAt: new Date(m.joinedAt),
                },
                update: {
                    role: m.role || 'member',
                },
            });
        }
    }
    async persistGameCreated(params) {
        if (!isEnabled())
            return;
        const prisma = (0, prisma_1.getPrisma)();
        if (params.clubId) {
            await this.ensureClub(params.clubId);
        }
        await prisma.game.upsert({
            where: { id: params.gameId },
            create: {
                id: params.gameId,
                code: params.code,
                variant: params.variant,
                phase: 'waiting',
                clubId: params.clubId,
                pot: 0,
                currentBet: 0,
                dealerPosition: 0,
                smallBlindPosition: 0,
                bigBlindPosition: 0,
                activePlayerIndex: 0,
                settings: params.settings,
                communityCards: [],
                createdAt: new Date(params.createdAt),
            },
            update: {
                code: params.code,
                variant: params.variant,
                clubId: params.clubId,
                settings: params.settings,
            },
        });
    }
    async persistGameEnded(gameId, endedAtMs) {
        if (!isEnabled())
            return;
        const prisma = (0, prisma_1.getPrisma)();
        await prisma.game.updateMany({
            where: { id: gameId },
            data: { finishedAt: new Date(endedAtMs), phase: 'finished' },
        });
    }
    async persistHandFinished(gameId, hand) {
        if (!isEnabled())
            return;
        const prisma = (0, prisma_1.getPrisma)();
        // Ensure all players referenced exist (FK safety).
        const playerIds = new Set();
        for (const a of hand.actions || [])
            playerIds.add(a.playerId);
        for (const w of hand.winners || [])
            playerIds.add(w.playerId);
        if (hand.table?.seats?.length) {
            for (const pid of hand.table.seats)
                playerIds.add(pid);
        }
        for (const pid of playerIds) {
            await this.ensurePlayer(pid);
        }
        const endPhase = inferHandEndPhase(hand);
        const winnerIds = (hand.winners || []).map((w) => w.playerId);
        await prisma.gameHand.create({
            data: {
                gameId,
                handNumber: hand.handNumber,
                phase: endPhase,
                endReason: hand.reason,
                winnerIds,
                winners: hand.winners,
                pot: hand.pot,
                communityCards: hand.communityCards,
                table: (hand.table || null),
                stacksStartByPlayerId: (hand.stacksStartByPlayerId || null),
                stacksEndByPlayerId: (hand.stacksEndByPlayerId || null),
                startedAt: toDate(hand.startedAt) || new Date(),
                endedAt: new Date(hand.endedAt),
                actions: {
                    create: (hand.actions || []).map((a) => {
                        const seats = hand.table?.seats || [];
                        const position = seats.length ? seats.indexOf(a.playerId) : 0;
                        return {
                            gameId,
                            playerId: a.playerId,
                            action: a.action,
                            amount: typeof a.amount === 'number' ? Math.floor(a.amount) : null,
                            phase: a.phase || 'unknown',
                            position: position >= 0 ? position : 0,
                            betTo: typeof a.betTo === 'number' ? Math.floor(a.betTo) : null,
                            currentBetAfter: typeof a.currentBetAfter === 'number' ? Math.floor(a.currentBetAfter) : null,
                            timestamp: new Date(a.timestamp),
                        };
                    }),
                },
            },
        });
        // Best-effort player stats persistence so Prisma Studio can show stats rows.
        for (const pid of playerIds) {
            void this.persistPlayerStats(pid).catch(() => { });
        }
    }
}
exports.DbPersistenceService = DbPersistenceService;
exports.dbPersistenceService = new DbPersistenceService();
