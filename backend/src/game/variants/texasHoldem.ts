import { GameSettings } from '../../types';
import { GameEngine, EngineSnapshot } from '../engine';
import { validateGameSettings } from '../../utils/validateSettings';

/**
 * Texas Hold'em variant
 * Each player receives 2 hole cards, 5 community cards are dealt
 */
export class TexasHoldem extends GameEngine {
  constructor(settings: Omit<GameSettings, 'variant'>, gameCode: string) {
    const fullSettings: GameSettings = {
      ...settings,
      variant: 'texas-holdem',
    };
    super(fullSettings, gameCode);
  }

  /**
   * Texas Hold'em specific validation
   */
  validateSettings(settings: Partial<GameSettings>): boolean {
    const validation = validateGameSettings(settings);
    if (!validation.valid) {
      throw new Error(validation.error || 'Invalid game settings');
    }
    return true;
  }

  /**
   * Restores a TexasHoldem game from a snapshot.
   * Used to resume live games after server restart.
   */
  static fromSnapshot(snapshot: EngineSnapshot): TexasHoldem {
    // Use the parent class's fromSnapshot, then set the prototype to TexasHoldem
    const engine = GameEngine.fromSnapshot(snapshot);
    Object.setPrototypeOf(engine, TexasHoldem.prototype);
    return engine as TexasHoldem;
  }
}

/**
 * Creates default Texas Hold'em settings
 */
export function createDefaultTexasHoldemSettings(): Omit<GameSettings, 'variant'> {
  return {
    smallBlind: 10,
    bigBlind: 20,
    startingStack: 1000,
    stackRange: { min: 500, max: 5000 },
    maxPlayers: 9,
    turnTimerSeconds: 20,
    timeBankConfig: { banks: 5, secondsPerBank: 20 },
    ante: { type: 'none', amount: 0 },
    gameLengthMinutes: undefined,
  };
}

