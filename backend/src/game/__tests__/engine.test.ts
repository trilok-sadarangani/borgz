import { GameEngine } from '../engine';
import { GameSettings } from '../../types';

describe('GameEngine', () => {
  const createDefaultSettings = (): GameSettings => ({
    variant: 'texas-holdem',
    smallBlind: 10,
    bigBlind: 20,
    startingStack: 1000,
    maxPlayers: 9,
  });

  describe('Game Initialization', () => {
    it('should create a new game', () => {
      const settings = createDefaultSettings();
      const game = new GameEngine(settings, 'TEST01');
      const state = game.getState();

      expect(state.code).toBe('TEST01');
      expect(state.variant).toBe('texas-holdem');
      expect(state.phase).toBe('waiting');
      expect(state.players).toHaveLength(0);
      expect(state.pot).toBe(0);
    });
  });

  describe('Player Management', () => {
    it('should add a player to the game', () => {
      const settings = createDefaultSettings();
      const game = new GameEngine(settings, 'TEST01');

      game.addPlayer('player1', 'Alice');
      const state = game.getState();

      expect(state.players).toHaveLength(1);
      expect(state.players[0].id).toBe('player1');
      expect(state.players[0].name).toBe('Alice');
      expect(state.players[0].stack).toBe(1000);
    });

    it('should add multiple players', () => {
      const settings = createDefaultSettings();
      const game = new GameEngine(settings, 'TEST01');

      game.addPlayer('player1', 'Alice');
      game.addPlayer('player2', 'Bob');
      game.addPlayer('player3', 'Charlie');

      const state = game.getState();
      expect(state.players).toHaveLength(3);
    });

    it('should not allow adding more than max players', () => {
      const settings = createDefaultSettings();
      settings.maxPlayers = 2;
      const game = new GameEngine(settings, 'TEST01');

      game.addPlayer('player1', 'Alice');
      game.addPlayer('player2', 'Bob');

      expect(() => game.addPlayer('player3', 'Charlie')).toThrow('Game is full');
    });

    it('should not allow duplicate players', () => {
      const settings = createDefaultSettings();
      const game = new GameEngine(settings, 'TEST01');

      game.addPlayer('player1', 'Alice');
      expect(() => game.addPlayer('player1', 'Alice')).toThrow('Player already in game');
    });

    it('should not allow adding players after game starts', () => {
      const settings = createDefaultSettings();
      const game = new GameEngine(settings, 'TEST01');

      game.addPlayer('player1', 'Alice');
      game.addPlayer('player2', 'Bob');
      game.startGame();

      expect(() => game.addPlayer('player3', 'Charlie')).toThrow(
        'Cannot add players after game has started'
      );
    });

    it('should remove a player from waiting game', () => {
      const settings = createDefaultSettings();
      const game = new GameEngine(settings, 'TEST01');

      game.addPlayer('player1', 'Alice');
      game.addPlayer('player2', 'Bob');
      game.removePlayer('player1');

      const state = game.getState();
      expect(state.players).toHaveLength(1);
      expect(state.players[0].id).toBe('player2');
    });

    it('should not allow removing players during active game', () => {
      const settings = createDefaultSettings();
      const game = new GameEngine(settings, 'TEST01');

      game.addPlayer('player1', 'Alice');
      game.addPlayer('player2', 'Bob');
      game.startGame();

      expect(() => game.removePlayer('player1')).toThrow(
        'Cannot remove players during active game'
      );
    });
  });

  describe('Starting Game', () => {
    it('should start game with 2 players', () => {
      const settings = createDefaultSettings();
      const game = new GameEngine(settings, 'TEST01');

      game.addPlayer('player1', 'Alice');
      game.addPlayer('player2', 'Bob');
      game.startGame();

      const state = game.getState();
      expect(state.phase).toBe('pre-flop');
      expect(state.players[0].cards).toHaveLength(2);
      expect(state.players[1].cards).toHaveLength(2);
      expect(state.pot).toBeGreaterThan(0);
    });

    it('should not start game with less than 2 players', () => {
      const settings = createDefaultSettings();
      const game = new GameEngine(settings, 'TEST01');

      game.addPlayer('player1', 'Alice');
      expect(() => game.startGame()).toThrow('Need at least 2 players to start');
    });

    it('should post blinds correctly', () => {
      const settings = createDefaultSettings();
      settings.smallBlind = 10;
      settings.bigBlind = 20;
      const game = new GameEngine(settings, 'TEST01');

      game.addPlayer('player1', 'Alice');
      game.addPlayer('player2', 'Bob');
      game.startGame();

      const state = game.getState();
      const smallBlindPlayer = state.players[state.smallBlindPosition];
      const bigBlindPlayer = state.players[state.bigBlindPosition];

      expect(smallBlindPlayer.currentBet).toBe(10);
      expect(bigBlindPlayer.currentBet).toBe(20);
      expect(state.pot).toBe(30);
      expect(state.currentBet).toBe(20);
    });

    it('should set active player after big blind', () => {
      const settings = createDefaultSettings();
      const game = new GameEngine(settings, 'TEST01');

      game.addPlayer('player1', 'Alice');
      game.addPlayer('player2', 'Bob');
      game.addPlayer('player3', 'Charlie');
      game.startGame();

      const state = game.getState();
      const firstToAct = (state.bigBlindPosition + 1) % state.players.length;
      expect(state.activePlayerIndex).toBe(firstToAct);
    });
  });

  describe('Player Actions', () => {
    let game: GameEngine;

    beforeEach(() => {
      const settings = createDefaultSettings();
      game = new GameEngine(settings, 'TEST01');
      game.addPlayer('player1', 'Alice');
      game.addPlayer('player2', 'Bob');
      game.startGame();
    });

    it('should process fold action', () => {
      const state = game.getState();
      const activePlayer = state.players[state.activePlayerIndex];

      game.processPlayerAction(activePlayer.id, 'fold');

      const newState = game.getState();
      const player = newState.players.find((p: any) => p.id === activePlayer.id);
      expect(player?.hasFolded).toBe(true);
    });

    it('should process call action', () => {
      const state = game.getState();
      const activePlayer = state.players[state.activePlayerIndex];
      const initialStack = activePlayer.stack;
      const callAmount = state.currentBet - activePlayer.currentBet;
      const initialPhase = state.phase;

      game.processPlayerAction(activePlayer.id, 'call');

      const newState = game.getState();
      const player = newState.players.find((p: any) => p.id === activePlayer.id);
      expect(player?.stack).toBe(initialStack - callAmount);
      
      // If betting round completed, phase advanced and bets were reset
      if (newState.phase !== initialPhase) {
        expect(player?.currentBet).toBe(0);
      } else {
        expect(player?.currentBet).toBe(state.currentBet);
      }
    });

    it('should process raise action', () => {
      const state = game.getState();
      const activePlayer = state.players[state.activePlayerIndex];
      const initialStack = activePlayer.stack;
      const initialCurrentBet = activePlayer.currentBet;
      const raiseAmount = 100;
      const chipsCommitted = raiseAmount - initialCurrentBet;
      const initialPhase = state.phase;

      game.processPlayerAction(activePlayer.id, 'raise', raiseAmount);

      const newState = game.getState();
      const player = newState.players.find((p: any) => p.id === activePlayer.id);
      
      // If betting round completed, phase advanced and bets were reset
      if (newState.phase !== initialPhase) {
        expect(player?.currentBet).toBe(0);
        expect(newState.currentBet).toBe(0);
      } else {
        expect(player?.currentBet).toBe(raiseAmount);
        expect(newState.currentBet).toBe(raiseAmount);
      }
      
      // Stack should always decrease by chips committed
      expect(player?.stack).toBe(initialStack - chipsCommitted);
    });

    it('should not allow action when not player turn', () => {
      const state = game.getState();
      const inactivePlayer = state.players.find(
        (p: any) => p.id !== state.players[state.activePlayerIndex].id
      );

      expect(() => game.processPlayerAction(inactivePlayer!.id, 'fold')).toThrow(
        'Not your turn'
      );
    });

    it('should advance phase after betting round completes', () => {
      const state = game.getState();
      const activePlayer = state.players[state.activePlayerIndex];

      // All players fold except one
      game.processPlayerAction(activePlayer.id, 'fold');

      const newState = game.getState();
      // Game should advance or end
      expect(newState.phase).not.toBe('pre-flop');
    });
  });

  describe('State Sanitization', () => {
    it('should hide other players cards', () => {
      const settings = createDefaultSettings();
      const game = new GameEngine(settings, 'TEST01');

      game.addPlayer('player1', 'Alice');
      game.addPlayer('player2', 'Bob');
      game.startGame();

      const state = game.getStateForPlayer('player1');
      const otherPlayer = state.players.find((p: any) => p.id !== 'player1');

      expect(state.players.find((p: any) => p.id === 'player1')?.cards).toBeDefined();
      expect(otherPlayer?.cards).toBeUndefined();
    });
  });
});

