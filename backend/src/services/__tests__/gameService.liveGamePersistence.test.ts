import { GameService } from '../gameService';
import { TexasHoldem, createDefaultTexasHoldemSettings } from '../../game/variants/texasHoldem';
import * as prismaModule from '../../utils/prisma';
import * as historyModule from '../gameHistoryService';

describe('GameService Live Game Persistence', () => {
  const originalEnv = process.env.ENABLE_DB_PERSISTENCE;

  beforeEach(() => {
    jest.clearAllMocks();
    // Mock gameHistoryService to avoid side effects
    jest.spyOn(historyModule.gameHistoryService, 'registerGame').mockImplementation(() => {});
    jest.spyOn(historyModule.gameHistoryService, 'markGameEnded').mockImplementation(() => {});
    jest.spyOn(historyModule.gameHistoryService, 'closeAllOpenSessionsForGame').mockImplementation(() => {});
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
      } as unknown as ReturnType<typeof prismaModule.getPrisma>);

      const service = new GameService();
      await service.loadLiveGamesFromDb();

      expect(mockFindMany).not.toHaveBeenCalled();
    });

    it('should load and restore live games from DB', async () => {
      process.env.ENABLE_DB_PERSISTENCE = 'true';

      // Create a real game to get a valid snapshot
      const settings = createDefaultTexasHoldemSettings();
      const tempGame = new TexasHoldem(settings, 'LIVE01');
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
      } as unknown as ReturnType<typeof prismaModule.getPrisma>);

      const service = new GameService();
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
      } as unknown as ReturnType<typeof prismaModule.getPrisma>);

      const service = new GameService();
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
      } as unknown as ReturnType<typeof prismaModule.getPrisma>);

      const service = new GameService();
      await service.loadLiveGamesFromDb();

      expect(service.getGameByCode('INV001')).toBeUndefined();
    });

    it('should handle DB errors gracefully', async () => {
      process.env.ENABLE_DB_PERSISTENCE = 'true';

      const mockFindMany = jest.fn().mockRejectedValue(new Error('DB connection failed'));
      jest.spyOn(prismaModule, 'getPrisma').mockReturnValue({
        game: { findMany: mockFindMany },
      } as unknown as ReturnType<typeof prismaModule.getPrisma>);

      const service = new GameService();

      // Should not throw
      await expect(service.loadLiveGamesFromDb()).resolves.not.toThrow();
    });

    it('should restore multiple live games', async () => {
      process.env.ENABLE_DB_PERSISTENCE = 'true';

      // Create snapshots for two games
      const settings = createDefaultTexasHoldemSettings();

      const game1 = new TexasHoldem(settings, 'MULTI1');
      game1.addPlayer('p1', 'Alice');
      game1.addPlayer('p2', 'Bob');
      game1.startGame('p1');
      const snapshot1 = game1.getSnapshot();

      const game2 = new TexasHoldem(settings, 'MULTI2');
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
      } as unknown as ReturnType<typeof prismaModule.getPrisma>);

      const service = new GameService();
      await service.loadLiveGamesFromDb();

      expect(service.getGameByCode('MULTI1')).toBeDefined();
      expect(service.getGameByCode('MULTI2')).toBeDefined();
      expect(service.listGames()).toHaveLength(2);
    });

    it('should register restored games with history service', async () => {
      process.env.ENABLE_DB_PERSISTENCE = 'true';

      const settings = createDefaultTexasHoldemSettings();
      const tempGame = new TexasHoldem(settings, 'HIST01');
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
      } as unknown as ReturnType<typeof prismaModule.getPrisma>);

      const service = new GameService();
      await service.loadLiveGamesFromDb();

      expect(historyModule.gameHistoryService.registerGame).toHaveBeenCalledWith(
        expect.objectContaining({
          gameId: 'game-hist',
          code: 'HIST01',
          clubId: 'club-1',
        })
      );
    });
  });
});
