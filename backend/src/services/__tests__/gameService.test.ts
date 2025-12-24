import { gameService } from '../gameService';
import { GameSettings } from '../../types';

describe('GameService', () => {
  beforeEach(() => {
    // Clear all games before each test
    const service = gameService as any;
    service.games.clear();
    service.gameCodes.clear();
  });

  describe('createGame', () => {
    it('should create a new game', () => {
      const { gameId, code } = gameService.createGame();

      expect(gameId).toBeDefined();
      expect(code).toBeDefined();
      expect(code).toHaveLength(6);
    });

    it('should create game with custom code', () => {
      const { code } = gameService.createGame(undefined, 'CUSTOM');

      expect(code).toBe('CUSTOM');
      expect(gameService.getGameByCode('CUSTOM')).toBeDefined();
    });

    it('should create game with custom settings', () => {
      const settings: Partial<GameSettings> = {
        smallBlind: 25,
        bigBlind: 50,
        startingStack: 2000,
      };

      const { gameId } = gameService.createGame(settings);
      const game = gameService.getGame(gameId);
      const state = game?.getState();

      expect(state?.settings.smallBlind).toBe(25);
      expect(state?.settings.bigBlind).toBe(50);
      expect(state?.settings.startingStack).toBe(2000);
    });

    it('should ensure unique game codes', () => {
      const codes = new Set<string>();
      for (let i = 0; i < 10; i++) {
        const { code } = gameService.createGame();
        codes.add(code);
      }

      // All codes should be unique
      expect(codes.size).toBe(10);
    });
  });

  describe('getGame', () => {
    it('should retrieve game by ID', () => {
      const { gameId } = gameService.createGame();
      const game = gameService.getGame(gameId);

      expect(game).toBeDefined();
      expect(game?.getState().id).toBe(gameId);
    });

    it('should return undefined for non-existent game', () => {
      const game = gameService.getGame('non-existent-id');
      expect(game).toBeUndefined();
    });
  });

  describe('getGameByCode', () => {
    it('should retrieve game by code', () => {
      const { code } = gameService.createGame();
      const game = gameService.getGameByCode(code);

      expect(game).toBeDefined();
      expect(game?.getState().code).toBe(code);
    });

    it('should return undefined for non-existent code', () => {
      const game = gameService.getGameByCode('INVALID');
      expect(game).toBeUndefined();
    });
  });

  describe('getGameStateByCode', () => {
    it('should retrieve game state by code', () => {
      const { code } = gameService.createGame();
      const state = gameService.getGameStateByCode(code);

      expect(state).toBeDefined();
      expect(state?.code).toBe(code);
    });

    it('should return undefined for non-existent code', () => {
      const state = gameService.getGameStateByCode('INVALID');
      expect(state).toBeUndefined();
    });
  });

  describe('removeGame', () => {
    it('should remove a game', () => {
      const { gameId, code } = gameService.createGame();

      gameService.removeGame(gameId);

      expect(gameService.getGame(gameId)).toBeUndefined();
      expect(gameService.getGameByCode(code)).toBeUndefined();
    });
  });

  describe('listGames', () => {
    it('should list all active games', () => {
      gameService.createGame();
      gameService.createGame();
      gameService.createGame();

      const games = gameService.listGames();

      expect(games).toHaveLength(3);
      games.forEach((game) => {
        expect(game.gameId).toBeDefined();
        expect(game.code).toBeDefined();
        expect(game.phase).toBeDefined();
        expect(game.playerCount).toBeDefined();
      });
    });

    it('should return empty array when no games', () => {
      const games = gameService.listGames();
      expect(games).toHaveLength(0);
    });
  });

  describe('gameCodeExists', () => {
    it('should return true for existing code', () => {
      const { code } = gameService.createGame();
      expect(gameService.gameCodeExists(code)).toBe(true);
    });

    it('should return false for non-existent code', () => {
      expect(gameService.gameCodeExists('INVALID')).toBe(false);
    });
  });
});

