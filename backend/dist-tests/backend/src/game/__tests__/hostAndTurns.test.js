"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const engine_1 = require("../engine");
const defaultSettings = () => ({
    variant: 'texas-holdem',
    smallBlind: 10,
    bigBlind: 20,
    startingStack: 1000,
    maxPlayers: 9,
});
describe('GameEngine host + turn rotation', () => {
    it('sets hostPlayerId to the first player who joins', () => {
        const game = new engine_1.GameEngine(defaultSettings(), 'TEST01');
        game.addPlayer('p1', 'Host');
        game.addPlayer('p2', 'Other');
        const state = game.getState();
        expect(state.hostPlayerId).toBe('p1');
    });
    it('only allows host to start the game', () => {
        const game = new engine_1.GameEngine(defaultSettings(), 'TEST01');
        game.addPlayer('p1', 'Host');
        game.addPlayer('p2', 'Other');
        expect(() => game.startGame('p2')).toThrow('Only the host can start the game');
        expect(() => game.startGame('p1')).not.toThrow();
    });
    it('preflop with 2 players: action rotates from SB to BB (host does not act forever)', () => {
        const game = new engine_1.GameEngine(defaultSettings(), 'TEST01');
        game.addPlayer('p1', 'Host');
        game.addPlayer('p2', 'Other');
        game.startGame('p1');
        const s1 = game.getState();
        const firstToAct = s1.players[s1.activePlayerIndex];
        // First-to-act should be able to call/check depending on blinds.
        if (s1.currentBet > firstToAct.currentBet) {
            game.processPlayerAction(firstToAct.id, 'call');
        }
        else {
            game.processPlayerAction(firstToAct.id, 'check');
        }
        const s2 = game.getState();
        // If round didn't instantly advance, active player must change.
        if (s2.phase === s1.phase) {
            expect(s2.activePlayerIndex).not.toBe(s1.activePlayerIndex);
            expect(s2.players[s2.activePlayerIndex].id).not.toBe(firstToAct.id);
        }
    });
    it('a raise updates the last aggressor, so action continues until it returns to aggressor', () => {
        const game = new engine_1.GameEngine(defaultSettings(), 'TEST01');
        game.addPlayer('p1', 'Host');
        game.addPlayer('p2', 'Other');
        game.startGame('p1');
        // Force a raise from the current active player.
        const s1 = game.getState();
        const raiser = s1.players[s1.activePlayerIndex];
        const raiseTo = s1.currentBet + 40; // should satisfy min raise in this engine
        game.processPlayerAction(raiser.id, 'raise', raiseTo);
        // Next player should now be active
        const s2 = game.getState();
        expect(s2.phase).toBe(s1.phase);
        const caller = s2.players[s2.activePlayerIndex];
        expect(caller.id).not.toBe(raiser.id);
        // Caller calls to match
        game.processPlayerAction(caller.id, 'call');
        // After matching, either street advances OR action returns to raiser (aggressor closes action).
        const s3 = game.getState();
        if (s3.phase === s2.phase) {
            expect(s3.players[s3.activePlayerIndex].id).toBe(raiser.id);
        }
        else {
            expect(['flop', 'turn', 'river', 'showdown', 'finished']).toContain(s3.phase);
        }
    });
    it('heads-up: postflop first-to-act is the button/small blind (app UX)', () => {
        const game = new engine_1.GameEngine(defaultSettings(), 'TEST01');
        game.addPlayer('p1', 'Host');
        game.addPlayer('p2', 'Other');
        game.startGame('p1');
        // Close preflop by having both players act minimally.
        let s = game.getState();
        const safety = 10;
        let i = 0;
        while (s.phase === 'pre-flop' && i < safety) {
            const actor = s.players[s.activePlayerIndex];
            if (s.currentBet > actor.currentBet)
                game.processPlayerAction(actor.id, 'call');
            else
                game.processPlayerAction(actor.id, 'check');
            s = game.getState();
            i++;
        }
        expect(i).toBeLessThan(safety);
        expect(s.phase).toBe('flop');
        // After flop, first-to-act should be the small blind (button) per our UX rule.
        const firstToAct = s.players[s.activePlayerIndex];
        expect(firstToAct.id).toBe(s.players[s.smallBlindPosition].id);
    });
});
