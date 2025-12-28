import { gameService } from '../../services/gameService';
import { GameState, PlayerAction } from '../../types';
import {
  connectClient,
  disconnectClient,
  startSocketTestServer,
  waitForEvent,
} from '../testUtils/socketTestHarness';

function getActivePlayerId(state: GameState): string {
  return state.players[state.activePlayerIndex]?.id;
}

describe('game socket integration', () => {
  beforeEach(() => {
    process.env.ENABLE_DB_PERSISTENCE = 'false';
  });

  test('leave-game then rejoin-game works (game stays until host ends)', async () => {
    const server = await startSocketTestServer();
    const { gameId, code } = gameService.createGame();
    const game = gameService.getGame(gameId)!;

    game.addPlayer('p1', 'Player 1');
    game.addPlayer('p2', 'Player 2');

    const p1 = await connectClient(server.url);

    // Join and start the game.
    await (async () => {
      const p = waitForEvent<GameState>(p1, 'game-state', 1500);
      p1.emit('join-game', { gameCode: code, playerId: 'p1' });
      await p;
    })();
    await (async () => {
      const p = waitForEvent<GameState>(p1, 'game-state', 1500);
      p1.emit('start-game');
      await p;
    })();

    // Leave the room.
    p1.emit('leave-game');

    // Rejoin should still succeed and emit a fresh state.
    const rejoinStateP = waitForEvent<GameState>(p1, 'game-state', 1500);
    p1.emit('join-game', { gameCode: code, playerId: 'p1' });
    const rejoinState = await rejoinStateP;
    expect(rejoinState.code).toBe(code);

    await disconnectClient(p1);
    await server.close();
    gameService.removeGame(gameId);
  });

  test('happyPath_twoPlayers_stateBroadcasts', async () => {
    const server = await startSocketTestServer();
    const { gameId, code } = gameService.createGame();
    const game = gameService.getGame(gameId)!;

    game.addPlayer('p1', 'Player 1');
    game.addPlayer('p2', 'Player 2');

    const p1 = await connectClient(server.url);
    const p2 = await connectClient(server.url);

    const p1JoinStateP = waitForEvent<GameState>(p1, 'game-state', 1500);
    p1.emit('join-game', { gameCode: code, playerId: 'p1' });
    const p1JoinState = await p1JoinStateP;

    const p2JoinStateP = waitForEvent<GameState>(p2, 'game-state', 1500);
    p2.emit('join-game', { gameCode: code, playerId: 'p2' });
    const p2JoinState = await p2JoinStateP;

    expect(p1JoinState.code).toBe(code);
    expect(p2JoinState.code).toBe(code);
    expect(p1JoinState.players).toHaveLength(2);
    expect(p2JoinState.players).toHaveLength(2);

    const p1StartStateP = waitForEvent<GameState>(p1, 'game-state', 1500);
    const p2StartStateP = waitForEvent<GameState>(p2, 'game-state', 1500);
    p1.emit('start-game');
    const [p1StartState, p2StartState] = await Promise.all([p1StartStateP, p2StartStateP]);

    expect(p1StartState.phase).toBe('pre-flop');
    expect(p2StartState.phase).toBe('pre-flop');
    expect(p1StartState.players).toHaveLength(2);
    expect(p2StartState.players).toHaveLength(2);

    // Both clients should see the same public table facts.
    expect(p1StartState.pot).toBe(p2StartState.pot);
    expect(p1StartState.currentBet).toBe(p2StartState.currentBet);
    expect(p1StartState.activePlayerIndex).toBe(p2StartState.activePlayerIndex);

    await disconnectClient(p1);
    await disconnectClient(p2);
    await server.close();
    gameService.removeGame(gameId);
  });

  test('rejectNotYourTurn_emitsError_andStateUnchanged', async () => {
    const server = await startSocketTestServer();
    const { gameId, code } = gameService.createGame();
    const game = gameService.getGame(gameId)!;

    game.addPlayer('p1', 'Player 1');
    game.addPlayer('p2', 'Player 2');

    const p1 = await connectClient(server.url);
    const p2 = await connectClient(server.url);

    await (async () => {
      const p = waitForEvent<GameState>(p1, 'game-state', 1500);
      p1.emit('join-game', { gameCode: code, playerId: 'p1' });
      await p;
    })();
    await (async () => {
      const p = waitForEvent<GameState>(p2, 'game-state', 1500);
      p2.emit('join-game', { gameCode: code, playerId: 'p2' });
      await p;
    })();

    const p1StartStateP = waitForEvent<GameState>(p1, 'game-state', 1500);
    const p2StartStateP = waitForEvent<GameState>(p2, 'game-state', 1500);
    p1.emit('start-game');
    const [p1State] = await Promise.all([p1StartStateP, p2StartStateP]);

    const activeId = getActivePlayerId(p1State);
    const nonActiveSocket = activeId === 'p1' ? p2 : p1;

    // Snapshot history length (includes blinds, etc.)
    const historyLenBefore = p1State.history.length;

    const errP = waitForEvent<{ message: string }>(nonActiveSocket, 'error', 1500);
    nonActiveSocket.emit('player-action', { action: 'call' satisfies PlayerAction });
    const err = await errP;
    expect(err.message).toBe('Not your turn');

    // Request state after the rejected action and confirm history didn't change.
    const p1AfterP = waitForEvent<GameState>(p1, 'game-state', 1500);
    p1.emit('get-game-state');
    const p1After = await p1AfterP;
    expect(p1After.history.length).toBe(historyLenBefore);

    await disconnectClient(p1);
    await disconnectClient(p2);
    await server.close();
    gameService.removeGame(gameId);
  });

  test('race_doubleAction_onlyOneApplied', async () => {
    const server = await startSocketTestServer();
    const { gameId, code } = gameService.createGame();
    const game = gameService.getGame(gameId)!;

    game.addPlayer('p1', 'Player 1');
    game.addPlayer('p2', 'Player 2');

    const p1 = await connectClient(server.url);
    const p2 = await connectClient(server.url);

    await (async () => {
      const p = waitForEvent<GameState>(p1, 'game-state', 1500);
      p1.emit('join-game', { gameCode: code, playerId: 'p1' });
      await p;
    })();
    await (async () => {
      const p = waitForEvent<GameState>(p2, 'game-state', 1500);
      p2.emit('join-game', { gameCode: code, playerId: 'p2' });
      await p;
    })();

    const p1StartStateP = waitForEvent<GameState>(p1, 'game-state', 1500);
    const p2StartStateP = waitForEvent<GameState>(p2, 'game-state', 1500);
    p1.emit('start-game');
    const [p1State] = await Promise.all([p1StartStateP, p2StartStateP]);

    const activeId = getActivePlayerId(p1State);
    const activeSocket = activeId === 'p1' ? p1 : p2;

    const historyLenBefore = p1State.history.length;

    // First action should succeed and broadcast state; second should be rejected (usually "Not your turn").
    const s1 = waitForEvent<GameState>(p1, 'game-state', 1500);
    const s2 = waitForEvent<GameState>(p2, 'game-state', 1500);
    const errP = waitForEvent<{ message: string }>(activeSocket, 'error', 500).catch(() => null);

    activeSocket.emit('player-action', { action: 'call' });
    activeSocket.emit('player-action', { action: 'call' });

    const [after1, after2] = await Promise.all([s1, s2]);
    const err = await errP;

    // Only one action should have been applied.
    expect(after1.history.length).toBe(historyLenBefore + 1);
    expect(after2.history.length).toBe(historyLenBefore + 1);

    // Optional: second action rejected.
    if (err) {
      expect(['Not your turn', 'Invalid action']).toContain(err.message);
    }

    await disconnectClient(p1);
    await disconnectClient(p2);
    await server.close();
    gameService.removeGame(gameId);
  });
});


