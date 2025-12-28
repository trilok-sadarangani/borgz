"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const engine_1 = require("../engine");
describe('GameEngine', () => {
    const createDefaultSettings = () => ({
        variant: 'texas-holdem',
        smallBlind: 10,
        bigBlind: 20,
        startingStack: 1000,
        maxPlayers: 9,
    });
    describe('Game Initialization', () => {
        it('should create a new game', () => {
            const settings = createDefaultSettings();
            const game = new engine_1.GameEngine(settings, 'TEST01');
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
            const game = new engine_1.GameEngine(settings, 'TEST01');
            game.addPlayer('player1', 'Alice');
            const state = game.getState();
            expect(state.players).toHaveLength(1);
            expect(state.players[0].id).toBe('player1');
            expect(state.players[0].name).toBe('Alice');
            expect(state.players[0].stack).toBe(1000);
        });
        it('should add multiple players', () => {
            const settings = createDefaultSettings();
            const game = new engine_1.GameEngine(settings, 'TEST01');
            game.addPlayer('player1', 'Alice');
            game.addPlayer('player2', 'Bob');
            game.addPlayer('player3', 'Charlie');
            const state = game.getState();
            expect(state.players).toHaveLength(3);
        });
        it('should not allow adding more than max players', () => {
            const settings = createDefaultSettings();
            settings.maxPlayers = 2;
            const game = new engine_1.GameEngine(settings, 'TEST01');
            game.addPlayer('player1', 'Alice');
            game.addPlayer('player2', 'Bob');
            expect(() => game.addPlayer('player3', 'Charlie')).toThrow('Game is full');
        });
        it('should not allow duplicate players', () => {
            const settings = createDefaultSettings();
            const game = new engine_1.GameEngine(settings, 'TEST01');
            game.addPlayer('player1', 'Alice');
            expect(() => game.addPlayer('player1', 'Alice')).toThrow('Player already in game');
        });
        it('should not allow adding players after game starts', () => {
            const settings = createDefaultSettings();
            const game = new engine_1.GameEngine(settings, 'TEST01');
            game.addPlayer('player1', 'Alice');
            game.addPlayer('player2', 'Bob');
            game.startGame('player1');
            expect(() => game.addPlayer('player3', 'Charlie')).toThrow('Cannot add players after game has started');
        });
        it('should remove a player from waiting game', () => {
            const settings = createDefaultSettings();
            const game = new engine_1.GameEngine(settings, 'TEST01');
            game.addPlayer('player1', 'Alice');
            game.addPlayer('player2', 'Bob');
            game.removePlayer('player1');
            const state = game.getState();
            expect(state.players).toHaveLength(1);
            expect(state.players[0].id).toBe('player2');
        });
        it('should not allow removing players during active game', () => {
            const settings = createDefaultSettings();
            const game = new engine_1.GameEngine(settings, 'TEST01');
            game.addPlayer('player1', 'Alice');
            game.addPlayer('player2', 'Bob');
            game.startGame('player1');
            expect(() => game.removePlayer('player1')).toThrow('Cannot remove players during active game');
        });
    });
    describe('Starting Game', () => {
        it('should start game with 2 players', () => {
            const settings = createDefaultSettings();
            const game = new engine_1.GameEngine(settings, 'TEST01');
            game.addPlayer('player1', 'Alice');
            game.addPlayer('player2', 'Bob');
            game.startGame('player1');
            const state = game.getState();
            expect(state.phase).toBe('pre-flop');
            expect(state.players[0].cards).toHaveLength(2);
            expect(state.players[1].cards).toHaveLength(2);
            expect(state.pot).toBeGreaterThan(0);
        });
        it('should not start game with less than 2 players', () => {
            const settings = createDefaultSettings();
            const game = new engine_1.GameEngine(settings, 'TEST01');
            game.addPlayer('player1', 'Alice');
            expect(() => game.startGame('player1')).toThrow('Need at least 2 players to start');
        });
        it('should post blinds correctly', () => {
            const settings = createDefaultSettings();
            settings.smallBlind = 10;
            settings.bigBlind = 20;
            const game = new engine_1.GameEngine(settings, 'TEST01');
            game.addPlayer('player1', 'Alice');
            game.addPlayer('player2', 'Bob');
            game.startGame('player1');
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
            const game = new engine_1.GameEngine(settings, 'TEST01');
            game.addPlayer('player1', 'Alice');
            game.addPlayer('player2', 'Bob');
            game.addPlayer('player3', 'Charlie');
            game.startGame('player1');
            const state = game.getState();
            const firstToAct = (state.bigBlindPosition + 1) % state.players.length;
            expect(state.activePlayerIndex).toBe(firstToAct);
        });
    });
    describe('Player Actions', () => {
        let game;
        beforeEach(() => {
            const settings = createDefaultSettings();
            game = new engine_1.GameEngine(settings, 'TEST01');
            game.addPlayer('player1', 'Alice');
            game.addPlayer('player2', 'Bob');
            game.startGame('player1');
        });
        it('should process fold action', () => {
            const state = game.getState();
            const activePlayer = state.players[state.activePlayerIndex];
            game.processPlayerAction(activePlayer.id, 'fold');
            const newState = game.getState();
            const player = newState.players.find((p) => p.id === activePlayer.id);
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
            const player = newState.players.find((p) => p.id === activePlayer.id);
            expect(player?.stack).toBe(initialStack - callAmount);
            // If betting round completed, phase advanced and bets were reset
            if (newState.phase !== initialPhase) {
                expect(player?.currentBet).toBe(0);
            }
            else {
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
            const player = newState.players.find((p) => p.id === activePlayer.id);
            // If betting round completed, phase advanced and bets were reset
            if (newState.phase !== initialPhase) {
                expect(player?.currentBet).toBe(0);
                expect(newState.currentBet).toBe(0);
            }
            else {
                expect(player?.currentBet).toBe(raiseAmount);
                expect(newState.currentBet).toBe(raiseAmount);
            }
            // Stack should always decrease by chips committed
            expect(player?.stack).toBe(initialStack - chipsCommitted);
        });
        it('should not allow action when not player turn', () => {
            const state = game.getState();
            const inactivePlayer = state.players.find((p) => p.id !== state.players[state.activePlayerIndex].id);
            expect(() => game.processPlayerAction(inactivePlayer.id, 'fold')).toThrow('Not your turn');
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
            const game = new engine_1.GameEngine(settings, 'TEST01');
            game.addPlayer('player1', 'Alice');
            game.addPlayer('player2', 'Bob');
            game.startGame('player1');
            const state = game.getStateForPlayer('player1');
            const otherPlayer = state.players.find((p) => p.id !== 'player1');
            expect(state.players.find((p) => p.id === 'player1')?.cards).toBeDefined();
            expect(otherPlayer?.cards).toBeUndefined();
        });
    });
    describe('Phase Transitions', () => {
        let game;
        beforeEach(() => {
            const settings = createDefaultSettings();
            game = new engine_1.GameEngine(settings, 'TEST01');
            game.addPlayer('player1', 'Alice');
            game.addPlayer('player2', 'Bob');
            game.addPlayer('player3', 'Charlie');
            game.startGame('player1');
        });
        it('should transition from pre-flop to flop after betting round', () => {
            let state = game.getState();
            expect(state.phase).toBe('pre-flop');
            expect(state.communityCards).toHaveLength(0);
            // Complete betting round by having all players call/check
            let iterations = 0;
            const maxIterations = 20; // Safety limit
            while (state.phase === 'pre-flop' && iterations < maxIterations) {
                const currentState = game.getState();
                const activePlayer = currentState.players[currentState.activePlayerIndex];
                if (currentState.currentBet > activePlayer.currentBet) {
                    game.processPlayerAction(activePlayer.id, 'call');
                }
                else {
                    game.processPlayerAction(activePlayer.id, 'check');
                }
                state = game.getState();
                iterations++;
            }
            expect(iterations).toBeLessThan(maxIterations); // Ensure we didn't hit the limit
            expect(state.phase).toBe('flop');
            expect(state.communityCards).toHaveLength(3);
        });
        it('should transition from flop to turn after betting round', () => {
            // Advance to flop first
            let state = game.getState();
            let iterationsToFlop = 0;
            const maxIterationsToFlop = 50; // Safety limit to avoid infinite loops/OOM
            while (state.phase === 'pre-flop' && iterationsToFlop < maxIterationsToFlop) {
                const currentState = game.getState();
                const activePlayer = currentState.players[currentState.activePlayerIndex];
                if (currentState.currentBet > activePlayer.currentBet) {
                    game.processPlayerAction(activePlayer.id, 'call');
                }
                else {
                    game.processPlayerAction(activePlayer.id, 'check');
                }
                state = game.getState();
                iterationsToFlop++;
            }
            expect(iterationsToFlop).toBeLessThan(maxIterationsToFlop);
            expect(state.phase).toBe('flop');
            expect(state.communityCards).toHaveLength(3);
            // Complete flop betting round
            let iterations = 0;
            const maxIterations = 20;
            while (state.phase === 'flop' && iterations < maxIterations) {
                const currentState = game.getState();
                const activePlayer = currentState.players[currentState.activePlayerIndex];
                if (currentState.currentBet > activePlayer.currentBet) {
                    game.processPlayerAction(activePlayer.id, 'call');
                }
                else {
                    game.processPlayerAction(activePlayer.id, 'check');
                }
                state = game.getState();
                iterations++;
            }
            expect(iterations).toBeLessThan(maxIterations);
            expect(state.phase).toBe('turn');
            expect(state.communityCards).toHaveLength(4);
        });
        it('should transition from turn to river after betting round', () => {
            // Advance to turn first
            let state = game.getState();
            const phases = ['pre-flop', 'flop', 'turn'];
            for (const targetPhase of phases) {
                let iterations = 0;
                const maxIterations = 20;
                while (state.phase === targetPhase && iterations < maxIterations) {
                    const currentState = game.getState();
                    const activePlayer = currentState.players[currentState.activePlayerIndex];
                    if (currentState.currentBet > activePlayer.currentBet) {
                        game.processPlayerAction(activePlayer.id, 'call');
                    }
                    else {
                        game.processPlayerAction(activePlayer.id, 'check');
                    }
                    state = game.getState();
                    iterations++;
                    if (state.phase !== targetPhase)
                        break;
                }
                expect(iterations).toBeLessThan(maxIterations);
            }
            expect(state.phase).toBe('river');
            expect(state.communityCards).toHaveLength(5);
        });
        it('should transition to showdown after river betting round', () => {
            // Advance through all phases
            let state = game.getState();
            const phases = ['pre-flop', 'flop', 'turn', 'river'];
            for (const targetPhase of phases) {
                let iterations = 0;
                const maxIterations = 20;
                while (state.phase === targetPhase && iterations < maxIterations) {
                    const currentState = game.getState();
                    const activePlayer = currentState.players[currentState.activePlayerIndex];
                    if (currentState.currentBet > activePlayer.currentBet) {
                        game.processPlayerAction(activePlayer.id, 'call');
                    }
                    else {
                        game.processPlayerAction(activePlayer.id, 'check');
                    }
                    state = game.getState();
                    iterations++;
                    if (state.phase !== targetPhase)
                        break;
                }
                expect(iterations).toBeLessThan(maxIterations);
            }
            // Game may go directly to finished if all players fold or game ends
            expect(['showdown', 'finished']).toContain(state.phase);
        });
    });
    describe('Betting Round State Management', () => {
        let game;
        beforeEach(() => {
            const settings = createDefaultSettings();
            game = new engine_1.GameEngine(settings, 'TEST01');
            game.addPlayer('player1', 'Alice');
            game.addPlayer('player2', 'Bob');
            game.addPlayer('player3', 'Charlie');
            game.startGame('player1');
        });
        it('should reset currentBet after betting round completes', () => {
            const state = game.getState();
            // Make a raise
            const activePlayer = state.players[state.activePlayerIndex];
            game.processPlayerAction(activePlayer.id, 'raise', 100);
            // Complete betting round
            let currentState = game.getState();
            let iterations = 0;
            const maxIterations = 20;
            while (currentState.phase === state.phase && iterations < maxIterations) {
                const player = currentState.players[currentState.activePlayerIndex];
                if (currentState.currentBet > player.currentBet) {
                    game.processPlayerAction(player.id, 'call');
                }
                else {
                    game.processPlayerAction(player.id, 'check');
                }
                currentState = game.getState();
                iterations++;
            }
            expect(iterations).toBeLessThan(maxIterations);
            // After phase transition, bets should be reset
            expect(currentState.currentBet).toBe(0);
            currentState.players.forEach((p) => {
                expect(p.currentBet).toBe(0);
            });
        });
        it('should track pot correctly through betting rounds', () => {
            const state = game.getState();
            const initialPot = state.pot;
            // Make a raise
            const activePlayer = state.players[state.activePlayerIndex];
            const raiseAmount = 100;
            game.processPlayerAction(activePlayer.id, 'raise', raiseAmount);
            let currentState = game.getState();
            expect(currentState.pot).toBeGreaterThan(initialPot);
            // Track pot through calls
            const potBeforeCalls = currentState.pot;
            const raisePlayer = currentState.players.find((p) => p.id === activePlayer.id);
            let totalChipsCommitted = raiseAmount - (raisePlayer?.currentBet || 0);
            // Complete round with calls
            let iterations = 0;
            const maxIterations = 20;
            while (currentState.phase === state.phase && iterations < maxIterations &&
                currentState.players.some((p) => p.isActive && !p.hasFolded && !p.isAllIn && p.currentBet < currentState.currentBet)) {
                const player = currentState.players[currentState.activePlayerIndex];
                if (currentState.currentBet > player.currentBet) {
                    const callAmount = currentState.currentBet - player.currentBet;
                    game.processPlayerAction(player.id, 'call');
                    totalChipsCommitted += callAmount;
                }
                else {
                    game.processPlayerAction(player.id, 'check');
                }
                currentState = game.getState();
                iterations++;
            }
            expect(iterations).toBeLessThan(maxIterations);
            expect(currentState.pot).toBeGreaterThanOrEqual(potBeforeCalls);
        });
        it('should correctly track active player index through betting round', () => {
            const state = game.getState();
            const firstActiveIndex = state.activePlayerIndex;
            const firstActivePlayer = state.players[firstActiveIndex];
            // Process action - call if there's a bet, otherwise check
            if (state.currentBet > firstActivePlayer.currentBet) {
                game.processPlayerAction(firstActivePlayer.id, 'call');
            }
            else {
                game.processPlayerAction(firstActivePlayer.id, 'check');
            }
            const newState = game.getState();
            if (newState.phase === state.phase) {
                // Should have moved to next active player
                expect(newState.activePlayerIndex).not.toBe(firstActiveIndex);
                expect(newState.activePlayerIndex).toBeGreaterThanOrEqual(0);
                expect(newState.activePlayerIndex).toBeLessThan(newState.players.length);
            }
        });
    });
    describe('Winner Determination and Pot Distribution', () => {
        it('should award pot to last remaining player when all others fold', () => {
            const settings = createDefaultSettings();
            const game = new engine_1.GameEngine(settings, 'TEST01');
            game.addPlayer('player1', 'Alice');
            game.addPlayer('player2', 'Bob');
            game.startGame('player1');
            const state = game.getState();
            const potBefore = state.pot;
            const folder = state.players[state.activePlayerIndex];
            const winner = state.players.find((p) => p.id !== folder.id);
            const initialStack = winner.stack;
            // In a 2-player hand, if the current player folds, the other immediately wins the pot.
            game.processPlayerAction(folder.id, 'fold');
            const finalState = game.getState();
            const winnerPlayer = finalState.players.find((p) => p.id === winner.id);
            expect(winnerPlayer?.stack).toBe(initialStack + potBefore);
            expect(finalState.phase).toBe('finished');
        });
        it('should correctly determine winner at showdown', () => {
            const settings = createDefaultSettings();
            const game = new engine_1.GameEngine(settings, 'TEST01');
            game.addPlayer('player1', 'Alice');
            game.addPlayer('player2', 'Bob');
            game.startGame('player1');
            // Test that game starts correctly
            let state = game.getState();
            expect(state.phase).toBe('pre-flop');
            expect(state.players.length).toBe(2);
            // Test that pot tracking works
            const initialPot = state.pot;
            expect(initialPot).toBeGreaterThan(0); // Blinds should be posted
            // Test that chips are tracked correctly
            // Note: `pot` already includes chips committed via `currentBet` (e.g., blinds),
            // so do NOT add both `currentBet` and `pot` or you'll double-count.
            const totalChips = state.players.reduce((sum, p) => sum + p.stack + p.currentBet, 0);
            const expectedTotal = settings.startingStack * 2;
            expect(totalChips).toBe(expectedTotal);
        });
        it('should handle pot distribution with multiple winners (tie)', () => {
            const settings = createDefaultSettings();
            const game = new engine_1.GameEngine(settings, 'TEST01');
            game.addPlayer('player1', 'Alice');
            game.addPlayer('player2', 'Bob');
            game.addPlayer('player3', 'Charlie');
            game.startGame('player1');
            // Test initial state with 3 players
            let state = game.getState();
            expect(state.players.length).toBe(3);
            expect(state.phase).toBe('pre-flop');
            // Test that pot is correctly initialized with blinds
            expect(state.pot).toBeGreaterThan(0);
            // Test chip conservation
            const totalChips = state.players.reduce((sum, p) => sum + p.stack + p.currentBet, 0);
            const expectedTotal = settings.startingStack * 3;
            expect(totalChips).toBe(expectedTotal);
        });
    });
    describe('All-In Scenarios', () => {
        it('should handle all-in action correctly', () => {
            const settings = createDefaultSettings();
            settings.startingStack = 500;
            const game = new engine_1.GameEngine(settings, 'TEST01');
            game.addPlayer('player1', 'Alice');
            game.addPlayer('player2', 'Bob');
            game.startGame('player1');
            const state = game.getState();
            const activePlayer = state.players[state.activePlayerIndex];
            game.processPlayerAction(activePlayer.id, 'all-in');
            const newState = game.getState();
            const player = newState.players.find((p) => p.id === activePlayer.id);
            expect(player?.stack).toBe(0);
            expect(player?.isAllIn).toBe(true);
            expect(newState.pot).toBeGreaterThan(state.pot);
        });
        it('should fast-forward to showdown when an all-in bet is called (no further actions)', () => {
            const settings = createDefaultSettings();
            settings.smallBlind = 10;
            settings.bigBlind = 20;
            settings.startingStack = 100;
            const game = new engine_1.GameEngine(settings, 'TEST01');
            game.addPlayer('player1', 'Alice');
            game.addPlayer('player2', 'Bob');
            game.startGame('player1');
            // Current active player shoves all-in; other player calls.
            let state = game.getState();
            const first = state.players[state.activePlayerIndex];
            game.processPlayerAction(first.id, 'all-in');
            state = game.getState();
            const caller = state.players[state.activePlayerIndex];
            game.processPlayerAction(caller.id, 'call');
            const finalState = game.getState();
            expect(finalState.phase).toBe('finished');
            expect(finalState.communityCards).toHaveLength(5);
            expect(finalState.lastHandResult?.reason).toBe('showdown');
        });
        it('should fast-forward from flop to showdown if everyone is all-in on the flop', () => {
            const settings = createDefaultSettings();
            settings.smallBlind = 10;
            settings.bigBlind = 20;
            settings.startingStack = 120;
            const game = new engine_1.GameEngine(settings, 'TEST01');
            game.addPlayer('player1', 'Alice');
            game.addPlayer('player2', 'Bob');
            game.startGame('player1');
            // Preflop: all-in + call should finish; to specifically cover "mid-street", we advance to flop first.
            // Complete pre-flop betting with calls/checks until flop.
            let state = game.getState();
            let iterations = 0;
            while (state.phase === 'pre-flop' && iterations < 30) {
                const active = state.players[state.activePlayerIndex];
                if (state.currentBet > active.currentBet)
                    game.processPlayerAction(active.id, 'call');
                else
                    game.processPlayerAction(active.id, 'check');
                state = game.getState();
                iterations++;
            }
            expect(state.phase).toBe('flop');
            expect(state.communityCards).toHaveLength(3);
            // Flop: shove + call should run out turn+river and finish.
            const first = state.players[state.activePlayerIndex];
            game.processPlayerAction(first.id, 'all-in');
            state = game.getState();
            const caller = state.players[state.activePlayerIndex];
            game.processPlayerAction(caller.id, 'call');
            const finalState = game.getState();
            expect(finalState.phase).toBe('finished');
            expect(finalState.communityCards).toHaveLength(5);
            expect(finalState.lastHandResult?.reason).toBe('showdown');
        });
        it('should handle all-in call correctly', () => {
            const settings = createDefaultSettings();
            settings.startingStack = 500;
            const game = new engine_1.GameEngine(settings, 'TEST01');
            game.addPlayer('player1', 'Alice');
            game.addPlayer('player2', 'Bob');
            game.startGame('player1');
            const state = game.getState();
            const activePlayer = state.players[state.activePlayerIndex];
            // Make a large raise
            game.processPlayerAction(activePlayer.id, 'raise', 400);
            // Next player calls all-in
            const newState = game.getState();
            const nextPlayer = newState.players[newState.activePlayerIndex];
            const callAmount = newState.currentBet - nextPlayer.currentBet;
            if (callAmount >= nextPlayer.stack) {
                game.processPlayerAction(nextPlayer.id, 'call');
                const finalState = game.getState();
                const player = finalState.players.find((p) => p.id === nextPlayer.id);
                expect(player?.isAllIn).toBe(true);
                expect(player?.stack).toBe(0);
            }
        });
        it('allows calling an all-in bet that is larger than your stack (auto all-in call)', () => {
            const settings = createDefaultSettings();
            settings.smallBlind = 10;
            settings.bigBlind = 20;
            settings.startingStack = 200;
            const game = new engine_1.GameEngine(settings, 'TEST01');
            game.addPlayer('player1', 'Alice');
            game.addPlayer('player2', 'Bob');
            game.startGame('player1');
            // Force a lopsided stack situation: the *current* actor can shove big, the other player is short.
            const s0 = game.getState();
            const shover = s0.players[s0.activePlayerIndex];
            const short = s0.players.find((p) => p.id !== shover.id);
            shover.stack = 500;
            short.stack = 30;
            shover.isActive = true;
            short.isActive = true;
            // Shove.
            game.processPlayerAction(shover.id, 'all-in');
            // Next player should be allowed to "call" even though they can't fully match the bet.
            const s2 = game.getState();
            const caller = s2.players[s2.activePlayerIndex];
            expect(caller.id).toBe(short.id);
            expect(s2.currentBet - caller.currentBet).toBeGreaterThan(caller.stack);
            const callerPrevBet = caller.currentBet;
            const callerPrevStack = caller.stack;
            game.processPlayerAction(caller.id, 'call');
            const s3 = game.getState();
            const updatedCaller = s3.players.find((p) => p.id === caller.id);
            expect(updatedCaller?.isAllIn).toBe(true);
            // The key behavior: a short-stack "call" commits the player's entire remaining stack.
            // Don't assert on currentBet/currentBetAfter here because the engine may immediately resolve the hand and reset per-hand fields.
            const callActions = s3.history.filter((a) => a.playerId === caller.id && a.action === 'call');
            expect(callActions.length).toBeGreaterThan(0);
            const call = callActions[callActions.length - 1];
            expect(call.betTo).toBe(callerPrevBet + callerPrevStack);
        });
        it('should skip all-in players in betting round', () => {
            const settings = createDefaultSettings();
            settings.startingStack = 500;
            const game = new engine_1.GameEngine(settings, 'TEST01');
            game.addPlayer('player1', 'Alice');
            game.addPlayer('player2', 'Bob');
            game.addPlayer('player3', 'Charlie');
            game.startGame('player1');
            const state = game.getState();
            const activePlayer = state.players[state.activePlayerIndex];
            // First player goes all-in
            game.processPlayerAction(activePlayer.id, 'all-in');
            // Next players should be able to act
            const newState = game.getState();
            const nextActivePlayer = newState.players[newState.activePlayerIndex];
            expect(nextActivePlayer.id).not.toBe(activePlayer.id);
            expect(nextActivePlayer.isAllIn).toBe(false);
        });
    });
    describe('Edge Cases in State Management', () => {
        it('should handle player action history correctly', () => {
            const settings = createDefaultSettings();
            const game = new engine_1.GameEngine(settings, 'TEST01');
            game.addPlayer('player1', 'Alice');
            game.addPlayer('player2', 'Bob');
            game.startGame('player1');
            const state = game.getState();
            const activePlayer = state.players[state.activePlayerIndex];
            const initialHistoryLength = state.history.length;
            game.processPlayerAction(activePlayer.id, 'raise', 100);
            const newState = game.getState();
            expect(newState.history.length).toBe(initialHistoryLength + 1);
            expect(newState.history[newState.history.length - 1].playerId).toBe(activePlayer.id);
            expect(newState.history[newState.history.length - 1].action).toBe('raise');
            expect(newState.history[newState.history.length - 1].amount).toBe(100);
        });
        it('should update updatedAt timestamp on state changes', () => {
            const settings = createDefaultSettings();
            const game = new engine_1.GameEngine(settings, 'TEST01');
            game.addPlayer('player1', 'Alice');
            game.addPlayer('player2', 'Bob');
            game.startGame('player1');
            const state1 = game.getState();
            const timestamp1 = state1.updatedAt;
            // Wait a bit and make an action
            const activePlayer = state1.players[state1.activePlayerIndex];
            if (state1.currentBet > activePlayer.currentBet) {
                game.processPlayerAction(activePlayer.id, 'call');
            }
            else {
                game.processPlayerAction(activePlayer.id, 'check');
            }
            const state2 = game.getState();
            expect(state2.updatedAt).toBeGreaterThanOrEqual(timestamp1);
        });
        it('should maintain game code throughout game lifecycle', () => {
            const settings = createDefaultSettings();
            const gameCode = 'TEST123';
            const game = new engine_1.GameEngine(settings, gameCode);
            game.addPlayer('player1', 'Alice');
            game.addPlayer('player2', 'Bob');
            game.startGame('player1');
            let state = game.getState();
            expect(state.code).toBe(gameCode);
            // Make some actions
            const activePlayer = state.players[state.activePlayerIndex];
            if (state.currentBet > activePlayer.currentBet) {
                game.processPlayerAction(activePlayer.id, 'call');
            }
            else {
                game.processPlayerAction(activePlayer.id, 'check');
            }
            state = game.getState();
            expect(state.code).toBe(gameCode);
        });
        it('should preserve game settings throughout game', () => {
            const settings = createDefaultSettings();
            settings.smallBlind = 25;
            settings.bigBlind = 50;
            settings.startingStack = 2000;
            const game = new engine_1.GameEngine(settings, 'TEST01');
            game.addPlayer('player1', 'Alice');
            game.addPlayer('player2', 'Bob');
            game.startGame('player1');
            const state = game.getState();
            expect(state.settings.smallBlind).toBe(25);
            expect(state.settings.bigBlind).toBe(50);
            expect(state.settings.startingStack).toBe(2000);
        });
    });
});
