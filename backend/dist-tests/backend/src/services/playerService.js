"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.playerService = exports.PlayerService = void 0;
/**
 * Player service for managing seed/test players
 * Provides predefined players for testing and development
 */
const prisma_1 = require("../utils/prisma");
function isDbPersistenceEnabled() {
    return String(process.env.ENABLE_DB_PERSISTENCE || '').toLowerCase() === 'true';
}
/**
 * Predefined seed players for testing
 */
const SEED_PLAYERS = [
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
class PlayerService {
    /**
     * Gets all available seed players
     */
    getSeedPlayers() {
        return [...SEED_PLAYERS];
    }
    /**
     * Gets a specific seed player by ID
     */
    getSeedPlayer(playerId) {
        return SEED_PLAYERS.find((p) => p.id === playerId);
    }
    /**
     * Gets a random selection of seed players
     */
    getRandomSeedPlayers(count) {
        const shuffled = [...SEED_PLAYERS].sort(() => Math.random() - 0.5);
        return shuffled.slice(0, Math.min(count, SEED_PLAYERS.length));
    }
    /**
     * Gets seed players by their IDs
     */
    getSeedPlayersByIds(playerIds) {
        return SEED_PLAYERS.filter((p) => playerIds.includes(p.id));
    }
    /**
     * Ensures an authenticated player exists in Postgres (for persistence + FK safety).
     * No-op when ENABLE_DB_PERSISTENCE is not enabled.
     */
    async getOrCreatePlayer(input) {
        if (!isDbPersistenceEnabled())
            return;
        const prisma = (0, prisma_1.getPrisma)();
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
exports.PlayerService = PlayerService;
// Singleton instance
exports.playerService = new PlayerService();
