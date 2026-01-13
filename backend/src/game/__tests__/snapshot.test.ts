import { GameEngine } from '../engine';
import { TexasHoldem, createDefaultTexasHoldemSettings } from '../variants/texasHoldem';

describe('GameEngine Snapshot', () => {
  let game: TexasHoldem;
  const player1 = { id: 'p1', name: 'Alice' };
  const player2 = { id: 'p2', name: 'Bob' };
  const player3 = { id: 'p3', name: 'Charlie' };

  beforeEach(() => {
    const settings = createDefaultTexasHoldemSettings();
    game = new TexasHoldem(settings, 'TEST01');
    game.addPlayer(player1.id, player1.name);
    game.addPlayer(player2.id, player2.name);
  });

  describe('getSnapshot()', () => {
    it('should return a complete snapshot of waiting game', () => {
      const snapshot = game.getSnapshot();

      expect(snapshot).toBeDefined();
      expect(snapshot.state).toBeDefined();
      expect(snapshot.state.phase).toBe('waiting');
      expect(snapshot.state.players).toHaveLength(2);
      expect(snapshot.deck).toEqual([]);
      expect(snapshot.lastRaise).toBe(0);
      expect(snapshot.closingActionIndex).toBe(0);
      expect(snapshot.handStartedAt).toBe(0);
      expect(snapshot.handStartStacksByPlayerId).toEqual({});
    });

    it('should capture deck and betting state after game starts', () => {
      game.startGame(player1.id);
      const snapshot = game.getSnapshot();

      expect(snapshot.state.phase).toBe('pre-flop');
      expect(snapshot.deck.length).toBeGreaterThan(0);
      expect(snapshot.deck.length).toBe(52 - 4); // 52 cards minus 2 cards per player
      expect(snapshot.handStartedAt).toBeGreaterThan(0);
      expect(Object.keys(snapshot.handStartStacksByPlayerId)).toHaveLength(2);
    });

    it('should capture mid-hand state with player actions', () => {
      game.startGame(player1.id);
      const state = game.getState();

      // Make a call action (player to act varies by position)
      const activePlayer = state.players[state.activePlayerIndex];
      game.processPlayerAction(activePlayer.id, 'call');

      const snapshot = game.getSnapshot();
      expect(snapshot.state.history.length).toBeGreaterThan(0);
    });
  });

  describe('fromSnapshot()', () => {
    it('should restore waiting game state', () => {
      const originalSnapshot = game.getSnapshot();
      const restoredGame = GameEngine.fromSnapshot(originalSnapshot);

      const restoredState = restoredGame.getState();
      expect(restoredState.phase).toBe('waiting');
      expect(restoredState.players).toHaveLength(2);
      expect(restoredState.code).toBe('TEST01');
    });

    it('should restore started game with deck intact', () => {
      game.startGame(player1.id);
      const originalSnapshot = game.getSnapshot();
      const originalDeckLength = originalSnapshot.deck.length;

      const restoredGame = GameEngine.fromSnapshot(originalSnapshot);
      const restoredSnapshot = restoredGame.getSnapshot();

      expect(restoredSnapshot.deck.length).toBe(originalDeckLength);
      expect(restoredSnapshot.deck).toEqual(originalSnapshot.deck);
    });

    it('should restore game and allow continued play', () => {
      game.startGame(player1.id);
      const state = game.getState();
      const activePlayer = state.players[state.activePlayerIndex];
      game.processPlayerAction(activePlayer.id, 'call');

      const snapshot = game.getSnapshot();
      const restoredGame = GameEngine.fromSnapshot(snapshot);

      // Continue play on restored game
      const restoredState = restoredGame.getState();
      const nextActivePlayer = restoredState.players[restoredState.activePlayerIndex];

      // Should be able to continue with next action
      expect(() => {
        restoredGame.processPlayerAction(nextActivePlayer.id, 'check');
      }).not.toThrow();
    });

    it('should preserve betting state (lastRaise, closingActionIndex)', () => {
      game.startGame(player1.id);
      const state = game.getState();
      const activePlayer = state.players[state.activePlayerIndex];

      // Make a raise to set lastRaise
      game.processPlayerAction(activePlayer.id, 'raise', 100);

      const snapshot = game.getSnapshot();
      const restoredGame = GameEngine.fromSnapshot(snapshot);
      const restoredSnapshot = restoredGame.getSnapshot();

      expect(restoredSnapshot.lastRaise).toBe(snapshot.lastRaise);
      expect(restoredSnapshot.closingActionIndex).toBe(snapshot.closingActionIndex);
    });

    it('should preserve hand start data for stats', () => {
      game.startGame(player1.id);
      const snapshot = game.getSnapshot();

      const restoredGame = GameEngine.fromSnapshot(snapshot);
      const restoredSnapshot = restoredGame.getSnapshot();

      expect(restoredSnapshot.handStartedAt).toBe(snapshot.handStartedAt);
      expect(restoredSnapshot.handStartStacksByPlayerId).toEqual(snapshot.handStartStacksByPlayerId);
    });
  });

  describe('TexasHoldem.fromSnapshot()', () => {
    it('should return a TexasHoldem instance', () => {
      game.startGame(player1.id);
      const snapshot = game.getSnapshot();

      const restored = TexasHoldem.fromSnapshot(snapshot);

      expect(restored).toBeInstanceOf(TexasHoldem);
      expect(restored).toBeInstanceOf(GameEngine);
    });

    it('should restore and allow variant-specific operations', () => {
      game.startGame(player1.id);

      // Play to finish
      let currentState = game.getState();
      while (currentState.phase !== 'finished') {
        const activePlayer = currentState.players[currentState.activePlayerIndex];
        if (!activePlayer.hasFolded && !activePlayer.isAllIn) {
          if (currentState.currentBet === 0 || activePlayer.currentBet === currentState.currentBet) {
            game.processPlayerAction(activePlayer.id, 'check');
          } else {
            game.processPlayerAction(activePlayer.id, 'call');
          }
        }
        currentState = game.getState();
      }

      // Get snapshot before starting next hand
      const snapshot = game.getSnapshot();
      const restored = TexasHoldem.fromSnapshot(snapshot);

      // Should be able to start next hand
      expect(() => {
        restored.nextHand(player1.id);
      }).not.toThrow();
    });
  });

  describe('Edge Cases', () => {
    it('should handle 3+ player game snapshot', () => {
      game.addPlayer(player3.id, player3.name);
      game.startGame(player1.id);

      const snapshot = game.getSnapshot();
      expect(snapshot.state.players).toHaveLength(3);

      const restored = TexasHoldem.fromSnapshot(snapshot);
      expect(restored.getState().players).toHaveLength(3);
    });

    it('should handle all-in situation', () => {
      // Create game with low stacks to force all-in
      const lowStackSettings = { ...createDefaultTexasHoldemSettings(), startingStack: 50 };
      const lowStackGame = new TexasHoldem(lowStackSettings, 'ALLIN1');
      lowStackGame.addPlayer(player1.id, player1.name);
      lowStackGame.addPlayer(player2.id, player2.name);
      lowStackGame.startGame(player1.id);

      const state = lowStackGame.getState();
      const activePlayer = state.players[state.activePlayerIndex];

      // Go all-in
      lowStackGame.processPlayerAction(activePlayer.id, 'all-in');

      const snapshot = lowStackGame.getSnapshot();
      const restored = TexasHoldem.fromSnapshot(snapshot);
      const restoredState = restored.getState();

      // Verify all-in state was preserved
      const allInPlayer = restoredState.players.find((p) => p.id === activePlayer.id);
      expect(allInPlayer?.isAllIn).toBe(true);
    });

    it('should preserve community cards through snapshot', () => {
      game.startGame(player1.id);

      // Play to flop
      let state = game.getState();
      while (state.phase === 'pre-flop') {
        const activePlayer = state.players[state.activePlayerIndex];
        if (!activePlayer.hasFolded && !activePlayer.isAllIn) {
          if (activePlayer.currentBet < state.currentBet) {
            game.processPlayerAction(activePlayer.id, 'call');
          } else {
            game.processPlayerAction(activePlayer.id, 'check');
          }
        }
        state = game.getState();
      }

      if (state.communityCards.length > 0) {
        const snapshot = game.getSnapshot();
        const restored = TexasHoldem.fromSnapshot(snapshot);

        expect(restored.getState().communityCards).toEqual(state.communityCards);
      }
    });

    it('should handle heads-up game', () => {
      // Already a heads-up game with 2 players
      game.startGame(player1.id);
      const snapshot = game.getSnapshot();

      expect(snapshot.state.players).toHaveLength(2);

      const restored = TexasHoldem.fromSnapshot(snapshot);
      const restoredState = restored.getState();

      // Verify heads-up positions are correct
      expect(restoredState.smallBlindPosition).toBe(restoredState.dealerPosition);
    });
  });

  describe('Snapshot Immutability', () => {
    it('should not mutate snapshot when game state changes', () => {
      game.startGame(player1.id);
      const snapshot = game.getSnapshot();
      const originalPot = snapshot.state.pot;

      // Make action that changes pot
      const state = game.getState();
      const activePlayer = state.players[state.activePlayerIndex];
      game.processPlayerAction(activePlayer.id, 'raise', 100);

      // Original snapshot should be unchanged
      expect(snapshot.state.pot).toBe(originalPot);
    });

    it('should not share references between snapshot and game', () => {
      game.startGame(player1.id);
      const snapshot = game.getSnapshot();

      // Mutate snapshot directly (shouldn't affect game)
      snapshot.state.pot = 999999;

      expect(game.getState().pot).not.toBe(999999);
    });
  });

  describe('Fold Scenario Snapshots', () => {
    it('should capture state after fold wins pot', () => {
      game.startGame(player1.id);
      const state = game.getState();
      const activePlayer = state.players[state.activePlayerIndex];

      // Fold to end hand
      game.processPlayerAction(activePlayer.id, 'fold');

      const snapshot = game.getSnapshot();
      expect(snapshot.state.phase).toBe('finished');
      expect(snapshot.state.lastHandResult).toBeDefined();
      expect(snapshot.state.lastHandResult?.reason).toBe('fold');
    });

    it('should restore after fold and allow next hand', () => {
      game.startGame(player1.id);
      const state = game.getState();
      const activePlayer = state.players[state.activePlayerIndex];

      game.processPlayerAction(activePlayer.id, 'fold');

      const snapshot = game.getSnapshot();
      const restored = TexasHoldem.fromSnapshot(snapshot);

      // Should be able to start next hand
      expect(() => {
        restored.nextHand(player1.id);
      }).not.toThrow();

      expect(restored.getState().phase).toBe('pre-flop');
    });
  });

  describe('Complex Game State Snapshots', () => {
    it('should handle snapshot at flop phase', () => {
      game.startGame(player1.id);

      // Play to flop
      let state = game.getState();
      while (state.phase === 'pre-flop') {
        const activePlayer = state.players[state.activePlayerIndex];
        if (!activePlayer.hasFolded && !activePlayer.isAllIn) {
          if (activePlayer.currentBet < state.currentBet) {
            game.processPlayerAction(activePlayer.id, 'call');
          } else {
            game.processPlayerAction(activePlayer.id, 'check');
          }
        }
        state = game.getState();
      }

      if (state.phase === 'flop') {
        const snapshot = game.getSnapshot();
        expect(snapshot.state.communityCards).toHaveLength(3);

        const restored = TexasHoldem.fromSnapshot(snapshot);
        expect(restored.getState().communityCards).toHaveLength(3);
        expect(restored.getState().phase).toBe('flop');
      }
    });

    it('should preserve action history through snapshot', () => {
      game.startGame(player1.id);
      const state = game.getState();
      const activePlayer = state.players[state.activePlayerIndex];

      // Make a raise
      game.processPlayerAction(activePlayer.id, 'raise', 100);

      const snapshot = game.getSnapshot();
      const historyLength = snapshot.state.history.length;

      const restored = TexasHoldem.fromSnapshot(snapshot);
      expect(restored.getState().history).toHaveLength(historyLength);

      // Verify action details are preserved
      const lastAction = restored.getState().history[historyLength - 1];
      expect(lastAction.action).toBe('raise');
      expect(lastAction.amount).toBe(100);
    });

    it('should handle game with different stack sizes', () => {
      // Create game with custom stack
      const settings = { ...createDefaultTexasHoldemSettings(), startingStack: 5000 };
      const customGame = new TexasHoldem(settings, 'STACK1');
      customGame.addPlayer(player1.id, player1.name);
      customGame.addPlayer(player2.id, player2.name);
      customGame.startGame(player1.id);

      const snapshot = customGame.getSnapshot();
      const restored = TexasHoldem.fromSnapshot(snapshot);

      const originalState = customGame.getState();
      const restoredState = restored.getState();

      // Verify stacks are preserved
      for (let i = 0; i < originalState.players.length; i++) {
        expect(restoredState.players[i].stack).toBe(originalState.players[i].stack);
      }
    });
  });

  describe('Multiple Snapshot/Restore Cycles', () => {
    it('should handle multiple snapshot/restore cycles', () => {
      game.startGame(player1.id);

      // First snapshot/restore
      let snapshot = game.getSnapshot();
      let restored = TexasHoldem.fromSnapshot(snapshot);

      // Make action on restored game
      let state = restored.getState();
      let activePlayer = state.players[state.activePlayerIndex];
      restored.processPlayerAction(activePlayer.id, 'call');

      // Second snapshot/restore
      snapshot = restored.getSnapshot();
      restored = TexasHoldem.fromSnapshot(snapshot);

      // Make another action
      state = restored.getState();
      activePlayer = state.players[state.activePlayerIndex];

      // Should still work
      expect(() => {
        if (!activePlayer.hasFolded && !activePlayer.isAllIn) {
          restored.processPlayerAction(activePlayer.id, 'check');
        }
      }).not.toThrow();
    });

    it('should maintain consistency through 5 snapshot cycles', () => {
      game.startGame(player1.id);
      let currentGame: TexasHoldem = game;

      for (let i = 0; i < 5; i++) {
        const state = currentGame.getState();
        if (state.phase === 'finished') break;

        const activePlayer = state.players[state.activePlayerIndex];
        if (activePlayer && !activePlayer.hasFolded && !activePlayer.isAllIn) {
          if (activePlayer.currentBet < state.currentBet) {
            currentGame.processPlayerAction(activePlayer.id, 'call');
          } else {
            currentGame.processPlayerAction(activePlayer.id, 'check');
          }
        }

        // Snapshot and restore
        const snapshot = currentGame.getSnapshot();
        currentGame = TexasHoldem.fromSnapshot(snapshot);
      }

      // Game should still be in a valid state
      const finalState = currentGame.getState();
      expect(finalState.players).toHaveLength(2);
      expect(['pre-flop', 'flop', 'turn', 'river', 'showdown', 'finished']).toContain(
        finalState.phase
      );
    });
  });

  describe('Settings Preservation', () => {
    it('should preserve game settings through snapshot', () => {
      const customSettings = {
        ...createDefaultTexasHoldemSettings(),
        smallBlind: 25,
        bigBlind: 50,
        maxPlayers: 6,
        turnTimerSeconds: 30,
      };
      const customGame = new TexasHoldem(customSettings, 'SETT01');
      customGame.addPlayer(player1.id, player1.name);
      customGame.addPlayer(player2.id, player2.name);

      const snapshot = customGame.getSnapshot();
      const restored = TexasHoldem.fromSnapshot(snapshot);

      expect(restored.getState().settings.smallBlind).toBe(25);
      expect(restored.getState().settings.bigBlind).toBe(50);
      expect(restored.getState().settings.maxPlayers).toBe(6);
      expect(restored.getState().settings.turnTimerSeconds).toBe(30);
    });

    it('should preserve game code through snapshot', () => {
      const snapshot = game.getSnapshot();
      const restored = TexasHoldem.fromSnapshot(snapshot);

      expect(restored.getState().code).toBe('TEST01');
    });

    it('should preserve game ID through snapshot', () => {
      const originalId = game.getState().id;
      const snapshot = game.getSnapshot();
      const restored = TexasHoldem.fromSnapshot(snapshot);

      expect(restored.getState().id).toBe(originalId);
    });
  });

  describe('Player State Preservation', () => {
    it('should preserve player positions', () => {
      game.addPlayer(player3.id, player3.name);
      game.startGame(player1.id);

      const snapshot = game.getSnapshot();
      const restored = TexasHoldem.fromSnapshot(snapshot);

      const originalState = game.getState();
      const restoredState = restored.getState();

      expect(restoredState.dealerPosition).toBe(originalState.dealerPosition);
      expect(restoredState.smallBlindPosition).toBe(originalState.smallBlindPosition);
      expect(restoredState.bigBlindPosition).toBe(originalState.bigBlindPosition);
      expect(restoredState.activePlayerIndex).toBe(originalState.activePlayerIndex);
    });

    it('should preserve player bet states', () => {
      game.startGame(player1.id);
      const state = game.getState();
      const activePlayer = state.players[state.activePlayerIndex];

      // Make a raise to set bet states
      game.processPlayerAction(activePlayer.id, 'raise', 80);

      const snapshot = game.getSnapshot();
      const restored = TexasHoldem.fromSnapshot(snapshot);

      const originalPlayers = game.getState().players;
      const restoredPlayers = restored.getState().players;

      for (let i = 0; i < originalPlayers.length; i++) {
        expect(restoredPlayers[i].currentBet).toBe(originalPlayers[i].currentBet);
        expect(restoredPlayers[i].isAllIn).toBe(originalPlayers[i].isAllIn);
        expect(restoredPlayers[i].hasFolded).toBe(originalPlayers[i].hasFolded);
      }
    });

    it('should preserve host player ID', () => {
      const snapshot = game.getSnapshot();
      const restored = TexasHoldem.fromSnapshot(snapshot);

      expect(restored.getState().hostPlayerId).toBe(game.getState().hostPlayerId);
    });
  });
});
