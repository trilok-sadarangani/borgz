"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const gameService_1 = require("../services/gameService");
const playerService_1 = require("../services/playerService");
const gameCode_1 = require("../utils/gameCode");
const router = (0, express_1.Router)();
/**
 * POST /api/games - Create a new game
 */
router.post('/', (req, res) => {
    try {
        const settings = req.body.settings;
        const customCode = req.body.code;
        const { gameId, code } = gameService_1.gameService.createGame(settings, customCode);
        const game = gameService_1.gameService.getGame(gameId);
        const state = game?.getState();
        return res.status(201).json({
            success: true,
            gameId,
            code,
            state,
        });
    }
    catch (error) {
        return res.status(400).json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to create game',
        });
    }
});
/**
 * GET /api/games/:code - Get game state by code
 */
router.get('/:code', (req, res) => {
    try {
        const code = req.params.code.toUpperCase();
        if (!(0, gameCode_1.isValidGameCode)(code)) {
            return res.status(400).json({ success: false, error: 'Invalid game code format' });
        }
        const game = gameService_1.gameService.getGameByCode(code);
        if (!game) {
            return res.status(404).json({
                success: false,
                error: 'Game not found',
            });
        }
        const state = game.getState();
        return res.json({
            success: true,
            state,
        });
    }
    catch (error) {
        return res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to get game',
        });
    }
});
/**
 * POST /api/games/:code/join - Join a game
 */
router.post('/:code/join', (req, res) => {
    try {
        const code = req.params.code.toUpperCase();
        if (!(0, gameCode_1.isValidGameCode)(code)) {
            return res.status(400).json({ success: false, error: 'Invalid game code format' });
        }
        const { playerId, name, avatar } = req.body;
        if (!playerId || !name) {
            return res.status(400).json({
                success: false,
                error: 'playerId and name are required',
            });
        }
        const game = gameService_1.gameService.getGameByCode(code);
        if (!game) {
            return res.status(404).json({
                success: false,
                error: 'Game not found',
            });
        }
        // Idempotent join: if the player already exists in the game state (e.g. they disconnected and are rejoining),
        // don't fail the request. The game engine currently doesn't remove players on socket leave/disconnect.
        const existing = game.getState().players.some((p) => p.id === playerId);
        if (!existing) {
            game.addPlayer(playerId, name, avatar);
        }
        const state = game.getState();
        return res.json({
            success: true,
            state,
        });
    }
    catch (error) {
        return res.status(400).json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to join game',
        });
    }
});
/**
 * POST /api/games/:code/seed - Add seed players to a game (for testing)
 */
router.post('/:code/seed', (req, res) => {
    try {
        const code = req.params.code.toUpperCase();
        if (!(0, gameCode_1.isValidGameCode)(code)) {
            return res.status(400).json({ success: false, error: 'Invalid game code format' });
        }
        const game = gameService_1.gameService.getGameByCode(code);
        if (!game) {
            return res.status(404).json({
                success: false,
                error: 'Game not found',
            });
        }
        const { count, playerIds } = req.body;
        let seedPlayers;
        if (playerIds && Array.isArray(playerIds)) {
            // Add specific seed players by IDs
            seedPlayers = playerService_1.playerService.getSeedPlayersByIds(playerIds);
            if (seedPlayers.length !== playerIds.length) {
                return res.status(400).json({
                    success: false,
                    error: 'Some player IDs are invalid',
                });
            }
        }
        else if (count && typeof count === 'number') {
            // Add random seed players
            seedPlayers = playerService_1.playerService.getRandomSeedPlayers(count);
        }
        else {
            // Default: add all available seed players (up to max players)
            const gameState = game.getState();
            const availableSlots = gameState.settings.maxPlayers - gameState.players.length;
            seedPlayers = playerService_1.playerService.getRandomSeedPlayers(availableSlots);
        }
        // Add each seed player to the game
        const addedPlayers = [];
        for (const seedPlayer of seedPlayers) {
            try {
                game.addPlayer(seedPlayer.id, seedPlayer.name, seedPlayer.avatar);
                addedPlayers.push(seedPlayer);
            }
            catch (error) {
                // Skip if player can't be added (game full, etc.)
                console.warn(`Failed to add seed player ${seedPlayer.id}:`, error);
            }
        }
        const state = game.getState();
        return res.json({
            success: true,
            addedPlayers: addedPlayers.length,
            players: addedPlayers,
            state,
        });
    }
    catch (error) {
        return res.status(400).json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to seed players',
        });
    }
});
/**
 * POST /api/games/:code/start - Start a game
 */
router.post('/:code/start', (req, res) => {
    try {
        const code = req.params.code.toUpperCase();
        if (!(0, gameCode_1.isValidGameCode)(code)) {
            return res.status(400).json({ success: false, error: 'Invalid game code format' });
        }
        const { playerId } = req.body;
        if (!playerId) {
            return res.status(400).json({ success: false, error: 'playerId is required' });
        }
        const game = gameService_1.gameService.getGameByCode(code);
        if (!game) {
            return res.status(404).json({
                success: false,
                error: 'Game not found',
            });
        }
        game.startGame(playerId);
        const state = game.getState();
        return res.json({
            success: true,
            state,
        });
    }
    catch (error) {
        return res.status(400).json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to start game',
        });
    }
});
/**
 * POST /api/games/:code/next-hand - Start the next hand (host only)
 */
router.post('/:code/next-hand', (req, res) => {
    try {
        const code = req.params.code.toUpperCase();
        if (!(0, gameCode_1.isValidGameCode)(code)) {
            return res.status(400).json({ success: false, error: 'Invalid game code format' });
        }
        const { playerId } = req.body;
        if (!playerId) {
            return res.status(400).json({ success: false, error: 'playerId is required' });
        }
        const game = gameService_1.gameService.getGameByCode(code);
        if (!game) {
            return res.status(404).json({
                success: false,
                error: 'Game not found',
            });
        }
        game.nextHand(playerId);
        const state = game.getState();
        return res.json({ success: true, state });
    }
    catch (error) {
        return res.status(400).json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to start next hand',
        });
    }
});
/**
 * GET /api/games - List all active games
 */
router.get('/', (_req, res) => {
    try {
        const games = gameService_1.gameService.listGames();
        return res.json({
            success: true,
            games,
        });
    }
    catch (error) {
        return res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to list games',
        });
    }
});
/**
 * GET /api/games/seed/players - List all available seed players
 */
router.get('/seed/players', (_req, res) => {
    try {
        const seedPlayers = playerService_1.playerService.getSeedPlayers();
        return res.json({
            success: true,
            players: seedPlayers,
            count: seedPlayers.length,
        });
    }
    catch (error) {
        return res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to list seed players',
        });
    }
});
exports.default = router;
