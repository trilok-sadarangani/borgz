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
const dbPersistenceService_1 = require("../dbPersistenceService");
const texasHoldem_1 = require("../../game/variants/texasHoldem");
const prismaModule = __importStar(require("../../utils/prisma"));
describe('DbPersistenceService Snapshot', () => {
    const originalEnv = process.env.ENABLE_DB_PERSISTENCE;
    let svc;
    beforeEach(() => {
        jest.clearAllMocks();
        svc = new dbPersistenceService_1.DbPersistenceService();
    });
    afterEach(() => {
        process.env.ENABLE_DB_PERSISTENCE = originalEnv;
        jest.restoreAllMocks();
    });
    describe('persistGameSnapshot', () => {
        it('should skip when DB persistence is disabled', async () => {
            process.env.ENABLE_DB_PERSISTENCE = 'false';
            const mockUpdate = jest.fn();
            jest.spyOn(prismaModule, 'getPrisma').mockReturnValue({
                game: { update: mockUpdate },
            });
            const settings = (0, texasHoldem_1.createDefaultTexasHoldemSettings)();
            const game = new texasHoldem_1.TexasHoldem(settings, 'TEST01');
            game.addPlayer('p1', 'Alice');
            game.addPlayer('p2', 'Bob');
            const snapshot = game.getSnapshot();
            await svc.persistGameSnapshot('game-123', snapshot);
            expect(mockUpdate).not.toHaveBeenCalled();
        });
        it('should persist snapshot and game state fields', async () => {
            process.env.ENABLE_DB_PERSISTENCE = 'true';
            const mockUpdate = jest.fn().mockResolvedValue({});
            jest.spyOn(prismaModule, 'getPrisma').mockReturnValue({
                game: { update: mockUpdate },
            });
            const settings = (0, texasHoldem_1.createDefaultTexasHoldemSettings)();
            const game = new texasHoldem_1.TexasHoldem(settings, 'TEST01');
            game.addPlayer('p1', 'Alice');
            game.addPlayer('p2', 'Bob');
            game.startGame('p1');
            const snapshot = game.getSnapshot();
            await svc.persistGameSnapshot('game-123', snapshot);
            expect(mockUpdate).toHaveBeenCalledWith({
                where: { id: 'game-123' },
                data: expect.objectContaining({
                    snapshot: snapshot,
                    phase: 'pre-flop',
                    pot: expect.any(Number),
                    currentBet: expect.any(Number),
                    dealerPosition: expect.any(Number),
                    smallBlindPosition: expect.any(Number),
                    bigBlindPosition: expect.any(Number),
                    activePlayerIndex: expect.any(Number),
                    communityCards: [],
                }),
            });
        });
        it('should persist updated state after action', async () => {
            process.env.ENABLE_DB_PERSISTENCE = 'true';
            const mockUpdate = jest.fn().mockResolvedValue({});
            jest.spyOn(prismaModule, 'getPrisma').mockReturnValue({
                game: { update: mockUpdate },
            });
            const settings = (0, texasHoldem_1.createDefaultTexasHoldemSettings)();
            const game = new texasHoldem_1.TexasHoldem(settings, 'TEST01');
            game.addPlayer('p1', 'Alice');
            game.addPlayer('p2', 'Bob');
            game.startGame('p1');
            // Make an action
            const state = game.getState();
            const activePlayer = state.players[state.activePlayerIndex];
            game.processPlayerAction(activePlayer.id, 'call');
            const snapshot = game.getSnapshot();
            await svc.persistGameSnapshot('game-123', snapshot);
            const callData = mockUpdate.mock.calls[0][0].data;
            expect(callData.pot).toBeGreaterThan(0);
        });
    });
    describe('persistGameEnded', () => {
        it('should clear snapshot when game ends', async () => {
            process.env.ENABLE_DB_PERSISTENCE = 'true';
            const mockUpdate = jest.fn().mockResolvedValue({});
            jest.spyOn(prismaModule, 'getPrisma').mockReturnValue({
                game: { update: mockUpdate },
            });
            const endedAt = Date.now();
            await svc.persistGameEnded('game-123', endedAt);
            expect(mockUpdate).toHaveBeenCalledWith({
                where: { id: 'game-123' },
                data: expect.objectContaining({
                    finishedAt: expect.any(Date),
                    phase: 'finished',
                    snapshot: expect.anything(), // Prisma.JsonNull
                }),
            });
        });
    });
    describe('Round-trip persistence', () => {
        it('should persist and restore game state correctly', () => {
            // This is more of an integration-style test to verify the snapshot format
            const settings = (0, texasHoldem_1.createDefaultTexasHoldemSettings)();
            const originalGame = new texasHoldem_1.TexasHoldem(settings, 'ROUND1');
            originalGame.addPlayer('p1', 'Alice');
            originalGame.addPlayer('p2', 'Bob');
            originalGame.startGame('p1');
            // Make some actions
            const state = originalGame.getState();
            const activePlayer = state.players[state.activePlayerIndex];
            originalGame.processPlayerAction(activePlayer.id, 'call');
            // Get snapshot (what would be persisted)
            const snapshot = originalGame.getSnapshot();
            // Verify snapshot is JSON serializable (as it would be stored in DB)
            const serialized = JSON.stringify(snapshot);
            const deserialized = JSON.parse(serialized);
            // Restore from deserialized snapshot
            const restoredGame = texasHoldem_1.TexasHoldem.fromSnapshot(deserialized);
            // Verify state matches
            const originalState = originalGame.getState();
            const restoredState = restoredGame.getState();
            expect(restoredState.phase).toBe(originalState.phase);
            expect(restoredState.pot).toBe(originalState.pot);
            expect(restoredState.currentBet).toBe(originalState.currentBet);
            expect(restoredState.players.length).toBe(originalState.players.length);
            expect(restoredState.communityCards).toEqual(originalState.communityCards);
            expect(restoredState.history.length).toBe(originalState.history.length);
            // Verify deck is identical (important for fairness)
            const originalSnapshot = originalGame.getSnapshot();
            const restoredSnapshot = restoredGame.getSnapshot();
            expect(restoredSnapshot.deck).toEqual(originalSnapshot.deck);
        });
        it('should preserve player cards through serialization', () => {
            const settings = (0, texasHoldem_1.createDefaultTexasHoldemSettings)();
            const game = new texasHoldem_1.TexasHoldem(settings, 'CARDS1');
            game.addPlayer('p1', 'Alice');
            game.addPlayer('p2', 'Bob');
            game.startGame('p1');
            const snapshot = game.getSnapshot();
            // Simulate DB round-trip
            const serialized = JSON.stringify(snapshot);
            const deserialized = JSON.parse(serialized);
            const restored = texasHoldem_1.TexasHoldem.fromSnapshot(deserialized);
            const restoredState = restored.getState();
            const originalState = game.getState();
            // Check that hole cards are preserved
            for (let i = 0; i < originalState.players.length; i++) {
                expect(restoredState.players[i].cards).toEqual(originalState.players[i].cards);
            }
        });
    });
});
