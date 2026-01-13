"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const gameHistoryService_1 = require("../gameHistoryService");
const prismaMod = __importStar(require("../../utils/prisma"));
describe('GameHistoryService persistence hydration', () => {
    const oldEnv = process.env.ENABLE_DB_PERSISTENCE;
    beforeEach(() => {
        process.env.ENABLE_DB_PERSISTENCE = 'true';
    });
    afterEach(() => {
        process.env.ENABLE_DB_PERSISTENCE = oldEnv;
        jest.restoreAllMocks();
    });
    it('loadFromDb hydrates games + hands and synthesizes player sessions', async () => {
        const gameCreatedAt = new Date('2026-01-03T00:00:00.000Z');
        const handStartedAt = new Date('2026-01-03T00:10:00.000Z');
        const handEndedAt = new Date('2026-01-03T00:15:00.000Z');
        const actionTs = new Date('2026-01-03T00:12:00.000Z');
        const prismaStub = {
            game: {
                findMany: jest.fn().mockResolvedValue([
                    {
                        id: 'g1',
                        code: 'CODE1',
                        clubId: 'club-1',
                        variant: 'texas-holdem',
                        settings: { variant: 'texas-holdem', smallBlind: 1, bigBlind: 2, startingStack: 200, maxPlayers: 9 },
                        createdAt: gameCreatedAt,
                        finishedAt: null,
                        hands: [
                            {
                                handNumber: 1,
                                pot: 10,
                                communityCards: [{ suit: 'spades', rank: 'A' }],
                                table: { seats: ['p1', 'p2'], dealerPosition: 0, smallBlindPosition: 0, bigBlindPosition: 1 },
                                stacksStartByPlayerId: { p1: 200, p2: 200 },
                                stacksEndByPlayerId: { p1: 205, p2: 195 },
                                winners: [{ playerId: 'p1', amount: 10 }],
                                endReason: 'showdown',
                                startedAt: handStartedAt,
                                endedAt: handEndedAt,
                                actions: [
                                    {
                                        playerId: 'p1',
                                        action: 'raise',
                                        amount: 4,
                                        phase: 'pre-flop',
                                        betTo: 4,
                                        currentBetAfter: 4,
                                        timestamp: actionTs,
                                    },
                                ],
                            },
                        ],
                    },
                ]),
            },
        };
        jest.spyOn(prismaMod, 'getPrisma').mockReturnValue(prismaStub);
        const history = new gameHistoryService_1.GameHistoryService();
        await history.loadFromDb();
        const g = history.getGame('g1');
        expect(g).toBeTruthy();
        expect(g.code).toBe('CODE1');
        expect(g.clubId).toBe('club-1');
        expect(g.hands).toHaveLength(1);
        expect(g.hands[0].handNumber).toBe(1);
        expect(g.hands[0].endedAt).toBe(handEndedAt.getTime());
        expect(g.hands[0].reason).toBe('showdown');
        expect(g.hands[0].actions[0].playerId).toBe('p1');
        expect(g.hands[0].actions[0].timestamp).toBe(actionTs.getTime());
        // Sessions are synthesized from hand snapshots; both players should have one.
        const p1Sessions = history.getPlayerSessions('p1');
        const p2Sessions = history.getPlayerSessions('p2');
        expect(p1Sessions.length).toBeGreaterThan(0);
        expect(p2Sessions.length).toBeGreaterThan(0);
        expect(p1Sessions[0].gameId).toBe('g1');
        expect(p1Sessions[0].joinedAt).toBe(gameCreatedAt.getTime());
        const handsForSession = history.getHandsForSession(p1Sessions[0]);
        expect(handsForSession).toHaveLength(1);
        expect(handsForSession[0].handNumber).toBe(1);
    });
    it('ensureHydratedFromDb only hydrates once', async () => {
        const prismaStub = {
            game: {
                findMany: jest.fn().mockResolvedValue([]),
            },
        };
        jest.spyOn(prismaMod, 'getPrisma').mockReturnValue(prismaStub);
        const history = new gameHistoryService_1.GameHistoryService();
        await history.ensureHydratedFromDb();
        await history.ensureHydratedFromDb();
        expect(prismaStub.game.findMany).toHaveBeenCalledTimes(1);
    });
});
