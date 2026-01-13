/**
 * Player service for managing seed/test players
 * Provides predefined players for testing and development
 */
import { getPrisma } from '../utils/prisma';

export interface SeedPlayer {
  id: string;
  name: string;
  avatar?: string;
}

export interface AuthedPlayerInput {
  id: string;
  name?: string;
  avatar?: string;
  email?: string;
}

function isDbPersistenceEnabled(): boolean {
  return String(process.env.ENABLE_DB_PERSISTENCE || '').toLowerCase() === 'true';
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

  /**
   * Ensures an authenticated player exists in Postgres (for persistence + FK safety).
   * No-op when ENABLE_DB_PERSISTENCE is not enabled.
   */
  async getOrCreatePlayer(input: AuthedPlayerInput): Promise<void> {
    if (!isDbPersistenceEnabled()) return;
    const prisma = getPrisma();
    const name = (input.name || '').trim() || input.email || input.id;

    await prisma.player.upsert({
      where: { id: input.id },
      create: {
        id: input.id,
        name,
        avatar: input.avatar,
        email: input.email,
        isSeed: false,
      },
      update: {
        name,
        avatar: input.avatar,
        email: input.email,
        isSeed: false,
      },
    });
  }
}

// Singleton instance
export const playerService = new PlayerService();
