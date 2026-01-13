"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const gameService_1 = require("../../services/gameService");
const dbPersistenceService_1 = require("../../services/dbPersistenceService");
const socketTestHarness_1 = require("../testUtils/socketTestHarness");
function getActivePlayerId(state) {
    return state.players[state.activePlayerIndex]?.id;
}
describe('game socket snapshot persistence', () => {
    let persistSnapshotSpy;
    beforeEach(() => {
        process.env.ENABLE_DB_PERSISTENCE = 'true';
        // Spy on the persistence method - it will be called but we mock it to avoid DB calls
        persistSnapshotSpy = jest
            .spyOn(dbPersistenceService_1.dbPersistenceService, 'persistGameSnapshot')
            .mockResolvedValue(undefined);
    });
    afterEach(() => {
        process.env.ENABLE_DB_PERSISTENCE = 'false';
        jest.restoreAllMocks();
    });
    test('start-game triggers snapshot persistence', async () => {
        const server = await (0, socketTestHarness_1.startSocketTestServer)();
        const { gameId, code } = gameService_1.gameService.createGame();
        const game = gameService_1.gameService.getGame(gameId);
        game.addPlayer('p1', 'Player 1');
        game.addPlayer('p2', 'Player 2');
        const p1 = await (0, socketTestHarness_1.connectClient)(server.url);
        // Join game
        await (async () => {
            const p = (0, socketTestHarness_1.waitForEvent)(p1, 'game-state', 1500);
            p1.emit('join-game', { gameCode: code, playerId: 'p1' });
            await p;
        })();
        // Start game - should trigger snapshot persistence
        persistSnapshotSpy.mockClear();
        const startStateP = (0, socketTestHarness_1.waitForEvent)(p1, 'game-state', 1500);
        p1.emit('start-game');
        await startStateP;
        // Verify snapshot was persisted
        expect(persistSnapshotSpy).toHaveBeenCalled();
        const [calledGameId, snapshot] = persistSnapshotSpy.mock.calls[0];
        expect(calledGameId).toBe(gameId);
        expect(snapshot.state.phase).toBe('pre-flop');
        await (0, socketTestHarness_1.disconnectClient)(p1);
        await server.close();
        gameService_1.gameService.removeGame(gameId);
    });
    test('player-action triggers snapshot persistence', async () => {
        const server = await (0, socketTestHarness_1.startSocketTestServer)();
        const { gameId, code } = gameService_1.gameService.createGame();
        const game = gameService_1.gameService.getGame(gameId);
        game.addPlayer('p1', 'Player 1');
        game.addPlayer('p2', 'Player 2');
        const p1 = await (0, socketTestHarness_1.connectClient)(server.url);
        const p2 = await (0, socketTestHarness_1.connectClient)(server.url);
        // Both join
        await (async () => {
            const p = (0, socketTestHarness_1.waitForEvent)(p1, 'game-state', 1500);
            p1.emit('join-game', { gameCode: code, playerId: 'p1' });
            await p;
        })();
        await (async () => {
            const p = (0, socketTestHarness_1.waitForEvent)(p2, 'game-state', 1500);
            p2.emit('join-game', { gameCode: code, playerId: 'p2' });
            await p;
        })();
        // Start game
        const p1StartStateP = (0, socketTestHarness_1.waitForEvent)(p1, 'game-state', 1500);
        p1.emit('start-game');
        const startState = await p1StartStateP;
        // Clear mock and make an action
        persistSnapshotSpy.mockClear();
        const activeId = getActivePlayerId(startState);
        const activeSocket = activeId === 'p1' ? p1 : p2;
        const actionStateP = (0, socketTestHarness_1.waitForEvent)(p1, 'game-state', 1500);
        activeSocket.emit('player-action', { action: 'call' });
        await actionStateP;
        // Verify snapshot was persisted after action
        expect(persistSnapshotSpy).toHaveBeenCalled();
        await (0, socketTestHarness_1.disconnectClient)(p1);
        await (0, socketTestHarness_1.disconnectClient)(p2);
        await server.close();
        gameService_1.gameService.removeGame(gameId);
    });
    test('next-hand triggers snapshot persistence', async () => {
        const server = await (0, socketTestHarness_1.startSocketTestServer)();
        const { gameId, code } = gameService_1.gameService.createGame();
        const game = gameService_1.gameService.getGame(gameId);
        game.addPlayer('p1', 'Player 1');
        game.addPlayer('p2', 'Player 2');
        const p1 = await (0, socketTestHarness_1.connectClient)(server.url);
        const p2 = await (0, socketTestHarness_1.connectClient)(server.url);
        // Join and start
        await (async () => {
            const p = (0, socketTestHarness_1.waitForEvent)(p1, 'game-state', 1500);
            p1.emit('join-game', { gameCode: code, playerId: 'p1' });
            await p;
        })();
        await (async () => {
            const p = (0, socketTestHarness_1.waitForEvent)(p2, 'game-state', 1500);
            p2.emit('join-game', { gameCode: code, playerId: 'p2' });
            await p;
        })();
        let stateP = (0, socketTestHarness_1.waitForEvent)(p1, 'game-state', 1500);
        p1.emit('start-game');
        let state = await stateP;
        // Play until finished
        while (state.phase !== 'finished') {
            const activeId = getActivePlayerId(state);
            const activeSocket = activeId === 'p1' ? p1 : p2;
            stateP = (0, socketTestHarness_1.waitForEvent)(p1, 'game-state', 1500);
            activeSocket.emit('player-action', { action: 'fold' });
            state = await stateP;
        }
        // Clear mock and start next hand
        persistSnapshotSpy.mockClear();
        stateP = (0, socketTestHarness_1.waitForEvent)(p1, 'game-state', 1500);
        p1.emit('next-hand');
        await stateP;
        // Verify snapshot was persisted
        expect(persistSnapshotSpy).toHaveBeenCalled();
        await (0, socketTestHarness_1.disconnectClient)(p1);
        await (0, socketTestHarness_1.disconnectClient)(p2);
        await server.close();
        gameService_1.gameService.removeGame(gameId);
    });
    test('rebuy triggers snapshot persistence', async () => {
        const server = await (0, socketTestHarness_1.startSocketTestServer)();
        const { gameId, code } = gameService_1.gameService.createGame();
        const game = gameService_1.gameService.getGame(gameId);
        game.addPlayer('p1', 'Player 1');
        game.addPlayer('p2', 'Player 2');
        const p1 = await (0, socketTestHarness_1.connectClient)(server.url);
        // Join game (but don't start - rebuy only allowed between hands)
        await (async () => {
            const p = (0, socketTestHarness_1.waitForEvent)(p1, 'game-state', 1500);
            p1.emit('join-game', { gameCode: code, playerId: 'p1' });
            await p;
        })();
        // Clear mock and do rebuy
        persistSnapshotSpy.mockClear();
        const rebuyStateP = (0, socketTestHarness_1.waitForEvent)(p1, 'game-state', 1500);
        p1.emit('rebuy', { amount: 500 });
        await rebuyStateP;
        // Verify snapshot was persisted
        expect(persistSnapshotSpy).toHaveBeenCalled();
        await (0, socketTestHarness_1.disconnectClient)(p1);
        await server.close();
        gameService_1.gameService.removeGame(gameId);
    });
    test('snapshot includes correct game state after multiple actions', async () => {
        const server = await (0, socketTestHarness_1.startSocketTestServer)();
        const { gameId, code } = gameService_1.gameService.createGame();
        const game = gameService_1.gameService.getGame(gameId);
        game.addPlayer('p1', 'Player 1');
        game.addPlayer('p2', 'Player 2');
        const p1 = await (0, socketTestHarness_1.connectClient)(server.url);
        const p2 = await (0, socketTestHarness_1.connectClient)(server.url);
        // Join
        await (async () => {
            const p = (0, socketTestHarness_1.waitForEvent)(p1, 'game-state', 1500);
            p1.emit('join-game', { gameCode: code, playerId: 'p1' });
            await p;
        })();
        await (async () => {
            const p = (0, socketTestHarness_1.waitForEvent)(p2, 'game-state', 1500);
            p2.emit('join-game', { gameCode: code, playerId: 'p2' });
            await p;
        })();
        // Start
        let stateP = (0, socketTestHarness_1.waitForEvent)(p1, 'game-state', 1500);
        p1.emit('start-game');
        let state = await stateP;
        // Make a call action
        const activeId = getActivePlayerId(state);
        const activeSocket = activeId === 'p1' ? p1 : p2;
        persistSnapshotSpy.mockClear();
        stateP = (0, socketTestHarness_1.waitForEvent)(p1, 'game-state', 1500);
        activeSocket.emit('player-action', { action: 'call' });
        state = await stateP;
        // Verify the persisted snapshot matches the current state
        expect(persistSnapshotSpy).toHaveBeenCalled();
        const [, snapshot] = persistSnapshotSpy.mock.calls[0];
        expect(snapshot.state.pot).toBe(state.pot);
        expect(snapshot.state.currentBet).toBe(state.currentBet);
        expect(snapshot.state.history.length).toBe(state.history.length);
        await (0, socketTestHarness_1.disconnectClient)(p1);
        await (0, socketTestHarness_1.disconnectClient)(p2);
        await server.close();
        gameService_1.gameService.removeGame(gameId);
    });
});
