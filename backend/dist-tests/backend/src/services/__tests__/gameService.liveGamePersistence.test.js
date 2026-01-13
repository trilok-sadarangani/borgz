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
const gameService_1 = require("../gameService");
const texasHoldem_1 = require("../../game/variants/texasHoldem");
const prismaModule = __importStar(require("../../utils/prisma"));
const historyModule = __importStar(require("../gameHistoryService"));
describe('GameService Live Game Persistence', () => {
    const originalEnv = process.env.ENABLE_DB_PERSISTENCE;
    beforeEach(() => {
        jest.clearAllMocks();
        // Mock gameHistoryService to avoid side effects
        jest.spyOn(historyModule.gameHistoryService, 'registerGame').mockImplementation(() => { });
        jest.spyOn(historyModule.gameHistoryService, 'markGameEnded').mockImplementation(() => { });
        jest.spyOn(historyModule.gameHistoryService, 'closeAllOpenSessionsForGame').mockImplementation(() => { });
    });
    afterEach(() => {
        process.env.ENABLE_DB_PERSISTENCE = originalEnv;
        jest.restoreAllMocks();
    });
    describe('loadLiveGamesFromDb', () => {
        it('should skip loading when DB persistence is disabled', async () => {
            process.env.ENABLE_DB_PERSISTENCE = 'false';
            const mockFindMany = jest.fn();
            jest.spyOn(prismaModule, 'getPrisma').mockReturnValue({
                game: { findMany: mockFindMany },
            });
            const service = new gameService_1.GameService();
            await service.loadLiveGamesFromDb();
            expect(mockFindMany).not.toHaveBeenCalled();
        });
        it('should load and restore live games from DB', async () => {
            process.env.ENABLE_DB_PERSISTENCE = 'true';
            // Create a real game to get a valid snapshot
            const settings = (0, texasHoldem_1.createDefaultTexasHoldemSettings)();
            const tempGame = new texasHoldem_1.TexasHoldem(settings, 'LIVE01');
            tempGame.addPlayer('p1', 'Alice');
            tempGame.addPlayer('p2', 'Bob');
            tempGame.startGame('p1');
            const snapshot = tempGame.getSnapshot();
            const mockFindMany = jest.fn().mockResolvedValue([
                {
                    id: 'game-123',
                    code: 'LIVE01',
                    clubId: 'club-1',
                    createdAt: new Date('2025-01-01'),
                    finishedAt: null,
                    snapshot: snapshot,
                },
            ]);
            jest.spyOn(prismaModule, 'getPrisma').mockReturnValue({
                game: { findMany: mockFindMany },
            });
            const service = new gameService_1.GameService();
            await service.loadLiveGamesFromDb();
            // Verify game was restored
            const restoredGame = service.getGameByCode('LIVE01');
            expect(restoredGame).toBeDefined();
            expect(restoredGame?.getState().phase).toBe('pre-flop');
            expect(restoredGame?.getState().players).toHaveLength(2);
        });
        it('should skip games without snapshots', async () => {
            process.env.ENABLE_DB_PERSISTENCE = 'true';
            const mockFindMany = jest.fn().mockResolvedValue([
                {
                    id: 'game-no-snapshot',
                    code: 'NOSN01',
                    clubId: null,
                    createdAt: new Date('2025-01-01'),
                    finishedAt: null,
                    snapshot: null, // No snapshot
                },
            ]);
            jest.spyOn(prismaModule, 'getPrisma').mockReturnValue({
                game: { findMany: mockFindMany },
            });
            const service = new gameService_1.GameService();
            await service.loadLiveGamesFromDb();
            expect(service.getGameByCode('NOSN01')).toBeUndefined();
        });
        it('should skip games with invalid snapshots', async () => {
            process.env.ENABLE_DB_PERSISTENCE = 'true';
            const mockFindMany = jest.fn().mockResolvedValue([
                {
                    id: 'game-invalid',
                    code: 'INV001',
                    clubId: null,
                    createdAt: new Date('2025-01-01'),
                    finishedAt: null,
                    snapshot: { invalid: 'data' }, // Invalid snapshot structure
                },
            ]);
            jest.spyOn(prismaModule, 'getPrisma').mockReturnValue({
                game: { findMany: mockFindMany },
            });
            const service = new gameService_1.GameService();
            await service.loadLiveGamesFromDb();
            expect(service.getGameByCode('INV001')).toBeUndefined();
        });
        it('should handle DB errors gracefully', async () => {
            process.env.ENABLE_DB_PERSISTENCE = 'true';
            const mockFindMany = jest.fn().mockRejectedValue(new Error('DB connection failed'));
            jest.spyOn(prismaModule, 'getPrisma').mockReturnValue({
                game: { findMany: mockFindMany },
            });
            const service = new gameService_1.GameService();
            // Should not throw
            await expect(service.loadLiveGamesFromDb()).resolves.not.toThrow();
        });
        it('should restore multiple live games', async () => {
            process.env.ENABLE_DB_PERSISTENCE = 'true';
            // Create snapshots for two games
            const settings = (0, texasHoldem_1.createDefaultTexasHoldemSettings)();
            const game1 = new texasHoldem_1.TexasHoldem(settings, 'MULTI1');
            game1.addPlayer('p1', 'Alice');
            game1.addPlayer('p2', 'Bob');
            game1.startGame('p1');
            const snapshot1 = game1.getSnapshot();
            const game2 = new texasHoldem_1.TexasHoldem(settings, 'MULTI2');
            game2.addPlayer('p3', 'Charlie');
            game2.addPlayer('p4', 'Diana');
            game2.startGame('p3');
            const snapshot2 = game2.getSnapshot();
            const mockFindMany = jest.fn().mockResolvedValue([
                {
                    id: 'game-1',
                    code: 'MULTI1',
                    clubId: null,
                    createdAt: new Date('2025-01-01'),
                    finishedAt: null,
                    snapshot: snapshot1,
                },
                {
                    id: 'game-2',
                    code: 'MULTI2',
                    clubId: 'club-1',
                    createdAt: new Date('2025-01-02'),
                    finishedAt: null,
                    snapshot: snapshot2,
                },
            ]);
            jest.spyOn(prismaModule, 'getPrisma').mockReturnValue({
                game: { findMany: mockFindMany },
            });
            const service = new gameService_1.GameService();
            await service.loadLiveGamesFromDb();
            expect(service.getGameByCode('MULTI1')).toBeDefined();
            expect(service.getGameByCode('MULTI2')).toBeDefined();
            expect(service.listGames()).toHaveLength(2);
        });
        it('should register restored games with history service', async () => {
            process.env.ENABLE_DB_PERSISTENCE = 'true';
            const settings = (0, texasHoldem_1.createDefaultTexasHoldemSettings)();
            const tempGame = new texasHoldem_1.TexasHoldem(settings, 'HIST01');
            tempGame.addPlayer('p1', 'Alice');
            tempGame.addPlayer('p2', 'Bob');
            tempGame.startGame('p1');
            const snapshot = tempGame.getSnapshot();
            const mockFindMany = jest.fn().mockResolvedValue([
                {
                    id: 'game-hist',
                    code: 'HIST01',
                    clubId: 'club-1',
                    createdAt: new Date('2025-01-01'),
                    finishedAt: null,
                    snapshot: snapshot,
                },
            ]);
            jest.spyOn(prismaModule, 'getPrisma').mockReturnValue({
                game: { findMany: mockFindMany },
            });
            const service = new gameService_1.GameService();
            await service.loadLiveGamesFromDb();
            expect(historyModule.gameHistoryService.registerGame).toHaveBeenCalledWith(expect.objectContaining({
                gameId: 'game-hist',
                code: 'HIST01',
                clubId: 'club-1',
            }));
        });
    });
});
