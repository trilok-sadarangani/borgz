/**
 * Player service for managing seed/test players
 * Provides predefined players for testing and development
 */

export interface SeedPlayer {
  id: string;
  name: string;
  avatar?: string;
}

/**
 * Predefined seed players for testing
 */
const SEED_PLAYERS: SeedPlayer[] = [
  { id: 'seed-alice', name: 'Alice', avatar: '👩' },
  { id: 'seed-bob', name: 'Bob', avatar: '👨' },
  { id: 'seed-charlie', name: 'Charlie', avatar: '🧑' },
  { id: 'seed-diana', name: 'Diana', avatar: '👩‍🦰' },
  { id: 'seed-eve', name: 'Eve', avatar: '👱‍♀️' },
  { id: 'seed-frank', name: 'Frank', avatar: '👨‍🦱' },
  { id: 'seed-grace', name: 'Grace', avatar: '👩‍🦳' },
  { id: 'seed-henry', name: 'Henry', avatar: '👨‍🦳' },
  { id: 'seed-ivy', name: 'Ivy', avatar: '👱' },
];

/**
 * Player service for managing seed players
 */
export class PlayerService {
  /**
   * Gets all available seed players
   */
  getSeedPlayers(): SeedPlayer[] {
    return [...SEED_PLAYERS];
  }

  /**
   * Gets a specific seed player by ID
   */
  getSeedPlayer(playerId: string): SeedPlayer | undefined {
    return SEED_PLAYERS.find((p) => p.id === playerId);
  }

  /**
   * Gets a random selection of seed players
   */
  getRandomSeedPlayers(count: number): SeedPlayer[] {
    const shuffled = [...SEED_PLAYERS].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, Math.min(count, SEED_PLAYERS.length));
  }

  /**
   * Gets seed players by their IDs
   */
  getSeedPlayersByIds(playerIds: string[]): SeedPlayer[] {
    return SEED_PLAYERS.filter((p) => playerIds.includes(p.id));
  }
}

// Singleton instance
export const playerService = new PlayerService();
