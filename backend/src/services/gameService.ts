import { GameEngine } from '../game/engine';
import { GameState, GameSettings } from '../types';
import { TexasHoldem, createDefaultTexasHoldemSettings } from '../game/variants/texasHoldem';
import { generateGameCode } from '../utils/gameCode';

/**
 * Manages active game instances
 */
export class GameService {
  private games: Map<string, GameEngine> = new Map();
  private gameCodes: Map<string, string> = new Map(); // code -> gameId

  /**
   * Creates a new game
   */
  createGame(settings?: Partial<GameSettings>, customCode?: string): {
    gameId: string;
    code: string;
  } {
    const defaultSettings = createDefaultTexasHoldemSettings();
    const fullSettings: GameSettings = {
      ...defaultSettings,
      ...settings,
      variant: settings?.variant || 'texas-holdem',
    };

    let code = customCode || generateGameCode();
    // Ensure code is unique
    while (this.gameCodes.has(code)) {
      code = generateGameCode();
    }

    const game = new TexasHoldem(fullSettings, code);
    const gameId = game.getState().id;

    this.games.set(gameId, game);
    this.gameCodes.set(code, gameId);

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
    const gameId = this.gameCodes.get(code);
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
    }
  }

  /**
   * Lists all active games
   */
  listGames(): Array<{ gameId: string; code: string; phase: string; playerCount: number }> {
    return Array.from(this.games.entries()).map(([gameId, game]) => {
      const state = game.getState();
      return {
        gameId,
        code: state.code,
        phase: state.phase,
        playerCount: state.players.length,
      };
    });
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

