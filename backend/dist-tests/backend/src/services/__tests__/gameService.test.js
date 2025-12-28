"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const gameService_1 = require("../gameService");
describe('GameService', () => {
    beforeEach(() => {
        // Clear all games before each test
        const service = gameService_1.gameService;
        service.games.clear();
        service.gameCodes.clear();
    });
    describe('createGame', () => {
        it('should create a new game', () => {
            const { gameId, code } = gameService_1.gameService.createGame();
            expect(gameId).toBeDefined();
            expect(code).toBeDefined();
            expect(code).toHaveLength(6);
        });
        it('should create game with custom code', () => {
            const { code } = gameService_1.gameService.createGame(undefined, 'CUSTOM');
            expect(code).toBe('CUSTOM');
            expect(gameService_1.gameService.getGameByCode('CUSTOM')).toBeDefined();
        });
        it('should create game with custom settings', () => {
            const settings = {
                smallBlind: 25,
                bigBlind: 50,
                startingStack: 2000,
            };
            const { gameId } = gameService_1.gameService.createGame(settings);
            const game = gameService_1.gameService.getGame(gameId);
            const state = game?.getState();
            expect(state?.settings.smallBlind).toBe(25);
            expect(state?.settings.bigBlind).toBe(50);
            expect(state?.settings.startingStack).toBe(2000);
        });
        it('should ensure unique game codes', () => {
            const codes = new Set();
            for (let i = 0; i < 10; i++) {
                const { code } = gameService_1.gameService.createGame();
                codes.add(code);
            }
            // All codes should be unique
            expect(codes.size).toBe(10);
        });
    });
    describe('getGame', () => {
        it('should retrieve game by ID', () => {
            const { gameId } = gameService_1.gameService.createGame();
            const game = gameService_1.gameService.getGame(gameId);
            expect(game).toBeDefined();
            expect(game?.getState().id).toBe(gameId);
        });
        it('should return undefined for non-existent game', () => {
            const game = gameService_1.gameService.getGame('non-existent-id');
            expect(game).toBeUndefined();
        });
    });
    describe('getGameByCode', () => {
        it('should retrieve game by code', () => {
            const { code } = gameService_1.gameService.createGame();
            const game = gameService_1.gameService.getGameByCode(code);
            expect(game).toBeDefined();
            expect(game?.getState().code).toBe(code);
        });
        it('should return undefined for non-existent code', () => {
            const game = gameService_1.gameService.getGameByCode('INVALID');
            expect(game).toBeUndefined();
        });
    });
    describe('getGameStateByCode', () => {
        it('should retrieve game state by code', () => {
            const { code } = gameService_1.gameService.createGame();
            const state = gameService_1.gameService.getGameStateByCode(code);
            expect(state).toBeDefined();
            expect(state?.code).toBe(code);
        });
        it('should return undefined for non-existent code', () => {
            const state = gameService_1.gameService.getGameStateByCode('INVALID');
            expect(state).toBeUndefined();
        });
    });
    describe('removeGame', () => {
        it('should remove a game', () => {
            const { gameId, code } = gameService_1.gameService.createGame();
            gameService_1.gameService.removeGame(gameId);
            expect(gameService_1.gameService.getGame(gameId)).toBeUndefined();
            expect(gameService_1.gameService.getGameByCode(code)).toBeUndefined();
        });
    });
    describe('listGames', () => {
        it('should list all active games', () => {
            gameService_1.gameService.createGame();
            gameService_1.gameService.createGame();
            gameService_1.gameService.createGame();
            const games = gameService_1.gameService.listGames();
            expect(games).toHaveLength(3);
            games.forEach((game) => {
                expect(game.gameId).toBeDefined();
                expect(game.code).toBeDefined();
                expect(game.phase).toBeDefined();
                expect(game.playerCount).toBeDefined();
            });
        });
        it('should return empty array when no games', () => {
            const games = gameService_1.gameService.listGames();
            expect(games).toHaveLength(0);
        });
    });
    describe('gameCodeExists', () => {
        it('should return true for existing code', () => {
            const { code } = gameService_1.gameService.createGame();
            expect(gameService_1.gameService.gameCodeExists(code)).toBe(true);
        });
        it('should return false for non-existent code', () => {
            expect(gameService_1.gameService.gameCodeExists('INVALID')).toBe(false);
        });
    });
});
