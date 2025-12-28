import { GameEngine } from '../game/engine';
import { GameState, GameSettings } from '../types';
import { TexasHoldem, createDefaultTexasHoldemSettings } from '../game/variants/texasHoldem';
import { generateGameCode, isValidGameCode } from '../utils/gameCode';
import { validateGameSettings } from '../utils/validateSettings';
import { gameHistoryService } from './gameHistoryService';
import { dbPersistenceService } from './dbPersistenceService';
import { logger, toErrorMeta } from '../utils/logger';

/**
 * Manages active game instances
 */
export class GameService {
  private games: Map<string, GameEngine> = new Map();
  private gameCodes: Map<string, string> = new Map(); // code -> gameId
  private gameMeta: Map<string, { clubId?: string; createdAt: number }> = new Map(); // gameId -> meta

  /**
   * Creates a new game
   */
  createGame(settings?: Partial<GameSettings>, customCode?: string, clubId?: string): {
    gameId: string;
    code: string;
  } {
    // Validate settings if provided
    if (settings) {
      const validation = validateGameSettings(settings);
      if (!validation.valid) {
        throw new Error(validation.error || 'Invalid game settings');
      }
    }

    const defaultSettings = createDefaultTexasHoldemSettings();
    const fullSettings: GameSettings = {
      ...defaultSettings,
      ...settings,
      variant: settings?.variant || 'texas-holdem',
    };

    // Validate the final merged settings
    const finalValidation = validateGameSettings(fullSettings);
    if (!finalValidation.valid) {
      throw new Error(finalValidation.error || 'Invalid game settings');
    }

    let code = (customCode || generateGameCode()).toUpperCase();
    if (customCode && !isValidGameCode(code)) {
      throw new Error('Invalid game code format. Use 6-8 characters A-Z and 0-9.');
    }
    // Ensure code is unique
    while (this.gameCodes.has(code)) {
      code = generateGameCode();
    }

    const game = new TexasHoldem(fullSettings, code);
    const gameId = game.getState().id;

    this.games.set(gameId, game);
    this.gameCodes.set(code, gameId);
    this.gameMeta.set(gameId, { clubId, createdAt: Date.now() });

    const state = game.getState();
    logger.info('game.created', {
      gameId,
      code: state.code,
      clubId,
      variant: state.variant,
    });
    gameHistoryService.registerGame({
      gameId,
      code: state.code,
      clubId,
      variant: state.variant,
      settings: state.settings,
      createdAt: state.createdAt,
      endedAt: undefined,
    });

    // Best-effort DB persistence (behind ENABLE_DB_PERSISTENCE=true).
    void dbPersistenceService
      .persistGameCreated({
        gameId,
        code: state.code,
        clubId,
        variant: state.variant,
        settings: state.settings,
        createdAt: state.createdAt,
      })
      .catch((err) => {
        logger.warn('db.persistGameCreated.failed', { gameId, code: state.code, err: toErrorMeta(err) });
      });

    return { gameId, code };
  }

  /**
   * Gets a game by ID
   */
  getGame(gameId: string): GameEngine | undefined {
    return this.games.get(gameId);
  }

  /**
   * Gets a game by code
   */
  getGameByCode(code: string): GameEngine | undefined {
    const normalized = code.toUpperCase();
    const gameId = this.gameCodes.get(normalized);
    if (!gameId) {
      return undefined;
    }
    return this.games.get(gameId);
  }

  /**
   * Gets game state by code
   */
  getGameStateByCode(code: string): GameState | undefined {
    const game = this.getGameByCode(code);
    return game?.getState();
  }

  /**
   * Removes a game
   */
  removeGame(gameId: string): void {
    const game = this.games.get(gameId);
    if (game) {
      const code = game.getState().code;
      this.games.delete(gameId);
      this.gameCodes.delete(code);
      this.gameMeta.delete(gameId);

      // Keep history around; just mark ended.
      const endedAt = Date.now();
      gameHistoryService.markGameEnded(gameId, endedAt);
      gameHistoryService.closeAllOpenSessionsForGame(gameId, endedAt);
      logger.info('game.removed', { gameId, code });
      void dbPersistenceService.persistGameEnded(gameId, endedAt).catch((err) => {
        logger.warn('db.persistGameEnded.failed', { gameId, code, err: toErrorMeta(err) });
      });
    }
  }

  /**
   * Lists all active games
   */
  listGames(): Array<{ gameId: string; code: string; phase: string; playerCount: number; clubId?: string }> {
    return Array.from(this.games.entries()).map(([gameId, game]) => {
      const state = game.getState();
      const meta = this.gameMeta.get(gameId);
      return {
        gameId,
        code: state.code,
        phase: state.phase,
        playerCount: state.players.length,
        clubId: meta?.clubId,
      };
    });
  }

  /**
   * Lists active games for a specific club
   */
  listGamesByClub(clubId: string): Array<{ gameId: string; code: string; phase: string; playerCount: number }> {
    return this.listGames()
      .filter((g) => g.clubId === clubId)
      .map(({ clubId: _clubId, ...rest }) => rest);
  }

  /**
   * Checks if a game code exists
   */
  gameCodeExists(code: string): boolean {
    return this.gameCodes.has(code);
  }
}

// Singleton instance
export const gameService = new GameService();

