"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.gameService = exports.GameService = void 0;
const texasHoldem_1 = require("../game/variants/texasHoldem");
const gameCode_1 = require("../utils/gameCode");
const validateSettings_1 = require("../utils/validateSettings");
const gameHistoryService_1 = require("./gameHistoryService");
const dbPersistenceService_1 = require("./dbPersistenceService");
const logger_1 = require("../utils/logger");
const prisma_1 = require("../utils/prisma");
function isDbEnabled() {
    return String(process.env.ENABLE_DB_PERSISTENCE || '').toLowerCase() === 'true';
}
/**
 * Manages active game instances
 */
class GameService {
    constructor() {
        this.games = new Map();
        this.gameCodes = new Map(); // code -> gameId
        this.gameMeta = new Map(); // gameId -> meta
    }
    /**
     * Creates a new game
     */
    createGame(settings, customCode, clubId) {
        // Validate settings if provided
        if (settings) {
            const validation = (0, validateSettings_1.validateGameSettings)(settings);
            if (!validation.valid) {
                throw new Error(validation.error || 'Invalid game settings');
            }
        }
        const defaultSettings = (0, texasHoldem_1.createDefaultTexasHoldemSettings)();
        const fullSettings = {
            ...defaultSettings,
            ...settings,
            variant: settings?.variant || 'texas-holdem',
        };
        // Validate the final merged settings
        const finalValidation = (0, validateSettings_1.validateGameSettings)(fullSettings);
        if (!finalValidation.valid) {
            throw new Error(finalValidation.error || 'Invalid game settings');
        }
        let code = (customCode || (0, gameCode_1.generateGameCode)()).toUpperCase();
        if (customCode && !(0, gameCode_1.isValidGameCode)(code)) {
            throw new Error('Invalid game code format. Use 6-8 characters A-Z and 0-9.');
        }
        // Ensure code is unique
        while (this.gameCodes.has(code)) {
            code = (0, gameCode_1.generateGameCode)();
        }
        const game = new texasHoldem_1.TexasHoldem(fullSettings, code);
        const gameId = game.getState().id;
        this.games.set(gameId, game);
        this.gameCodes.set(code, gameId);
        this.gameMeta.set(gameId, { clubId, createdAt: Date.now() });
        const state = game.getState();
        logger_1.logger.info('game.created', {
            gameId,
            code: state.code,
            clubId,
            variant: state.variant,
        });
        gameHistoryService_1.gameHistoryService.registerGame({
            gameId,
            code: state.code,
            clubId,
            variant: state.variant,
            settings: state.settings,
            createdAt: state.createdAt,
            endedAt: undefined,
        });
        // Best-effort DB persistence (behind ENABLE_DB_PERSISTENCE=true).
        void dbPersistenceService_1.dbPersistenceService
            .persistGameCreated({
            gameId,
            code: state.code,
            clubId,
            variant: state.variant,
            settings: state.settings,
            createdAt: state.createdAt,
        })
            .catch((err) => {
            logger_1.logger.warn('db.persistGameCreated.failed', { gameId, code: state.code, err: (0, logger_1.toErrorMeta)(err) });
        });
        return { gameId, code };
    }
    /**
     * Gets a game by ID
     */
    getGame(gameId) {
        return this.games.get(gameId);
    }
    /**
     * Gets a game by code
     */
    getGameByCode(code) {
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
    getGameStateByCode(code) {
        const game = this.getGameByCode(code);
        return game?.getState();
    }
    /**
     * Removes a game
     */
    removeGame(gameId) {
        const game = this.games.get(gameId);
        if (game) {
            const code = game.getState().code;
            this.games.delete(gameId);
            this.gameCodes.delete(code);
            this.gameMeta.delete(gameId);
            // Keep history around; just mark ended.
            const endedAt = Date.now();
            gameHistoryService_1.gameHistoryService.markGameEnded(gameId, endedAt);
            gameHistoryService_1.gameHistoryService.closeAllOpenSessionsForGame(gameId, endedAt);
            logger_1.logger.info('game.removed', { gameId, code });
            void dbPersistenceService_1.dbPersistenceService.persistGameEnded(gameId, endedAt).catch((err) => {
                logger_1.logger.warn('db.persistGameEnded.failed', { gameId, code, err: (0, logger_1.toErrorMeta)(err) });
            });
        }
    }
    /**
     * Lists all active games
     */
    listGames() {
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
    listGamesByClub(clubId) {
        return this.listGames()
            .filter((g) => g.clubId === clubId)
            .map(({ clubId: _clubId, ...rest }) => rest);
    }
    /**
     * Checks if a game code exists
     */
    gameCodeExists(code) {
        return this.gameCodes.has(code);
    }
    /**
     * Loads live games from the database and restores them into memory.
     * Called at server startup to resume games that were active before restart.
     */
    async loadLiveGamesFromDb() {
        if (!isDbEnabled()) {
            logger_1.logger.info('gameService.loadLiveGamesFromDb.skipped', { reason: 'DB persistence disabled' });
            return;
        }
        try {
            const prisma = (0, prisma_1.getPrisma)();
            // Query games that haven't finished - we'll filter for non-null snapshots in JS
            const liveGames = await prisma.game.findMany({
                where: {
                    finishedAt: null,
                },
            });
            let restored = 0;
            for (const row of liveGames) {
                try {
                    // Skip games without a snapshot
                    if (!row.snapshot)
                        continue;
                    const snapshot = row.snapshot;
                    if (!snapshot || !snapshot.state) {
                        logger_1.logger.warn('gameService.loadLiveGamesFromDb.invalidSnapshot', { gameId: row.id });
                        continue;
                    }
                    // Restore the game engine from the snapshot
                    const engine = texasHoldem_1.TexasHoldem.fromSnapshot(snapshot);
                    const state = engine.getState();
                    // Register in memory
                    this.games.set(row.id, engine);
                    this.gameCodes.set(state.code.toUpperCase(), row.id);
                    this.gameMeta.set(row.id, {
                        clubId: row.clubId || undefined,
                        createdAt: row.createdAt.getTime(),
                    });
                    // Also register in history service so stats/history work
                    gameHistoryService_1.gameHistoryService.registerGame({
                        gameId: row.id,
                        code: state.code,
                        clubId: row.clubId || undefined,
                        variant: state.variant,
                        settings: state.settings,
                        createdAt: state.createdAt,
                        endedAt: undefined,
                    });
                    restored += 1;
                    logger_1.logger.info('gameService.loadLiveGamesFromDb.restored', {
                        gameId: row.id,
                        code: state.code,
                        phase: state.phase,
                        playerCount: state.players.length,
                    });
                }
                catch (err) {
                    logger_1.logger.warn('gameService.loadLiveGamesFromDb.restoreFailed', {
                        gameId: row.id,
                        err: (0, logger_1.toErrorMeta)(err),
                    });
                }
            }
            logger_1.logger.info('gameService.loadLiveGamesFromDb.complete', {
                found: liveGames.length,
                restored,
            });
        }
        catch (err) {
            logger_1.logger.warn('gameService.loadLiveGamesFromDb.failed', { err: (0, logger_1.toErrorMeta)(err) });
        }
    }
}
exports.GameService = GameService;
// Singleton instance
exports.gameService = new GameService();
