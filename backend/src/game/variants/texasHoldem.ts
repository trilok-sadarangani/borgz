import { GameSettings } from '../../types';
import { GameEngine } from '../engine';

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
  validateSettings(_settings: Partial<GameSettings>): boolean {
    // Add any Texas Hold'em specific validation here
    return true;
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
    maxPlayers: 9,
    blindTimer: undefined,
    timeBank: 30,
  };
}

