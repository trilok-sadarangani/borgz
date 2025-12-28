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
describe('GameEngine history + sanitization', () => {
    it('records blinds (SB/BB) into history on start', () => {
        const game = new engine_1.GameEngine(defaultSettings(), 'TEST01');
        game.addPlayer('p1', 'A');
        game.addPlayer('p2', 'B');
        game.startGame('p1');
        const s = game.getState();
        const blinds = s.history.filter((h) => h.action === 'post-blind');
        expect(blinds.length).toBe(2);
        expect(blinds[0].amount).toBeGreaterThan(0);
        expect(blinds[1].amount).toBeGreaterThan(0);
    });
    it('records ante into history when enabled', () => {
        const settings = defaultSettings();
        settings.ante = { type: 'ante', amount: 5 };
        const game = new engine_1.GameEngine(settings, 'TEST01');
        game.addPlayer('p1', 'A');
        game.addPlayer('p2', 'B');
        game.startGame('p1');
        const s = game.getState();
        const antes = s.history.filter((h) => h.action === 'post-ante');
        expect(antes.length).toBe(2); // both players in a 2-player hand
        expect(antes.every((a) => a.amount === 5)).toBe(true);
    });
    it('records actions in history with timestamps and amounts', () => {
        const game = new engine_1.GameEngine(defaultSettings(), 'TEST01');
        game.addPlayer('p1', 'A');
        game.addPlayer('p2', 'B');
        game.startGame('p1');
        const s1 = game.getState();
        const initialHistoryLen = s1.history.length;
        const actor = s1.players[s1.activePlayerIndex];
        // Use a valid action for the current state.
        if (s1.currentBet > actor.currentBet) {
            game.processPlayerAction(actor.id, 'call');
        }
        else {
            game.processPlayerAction(actor.id, 'check');
        }
        const s2 = game.getState();
        expect(s2.history.length).toBe(initialHistoryLen + 1);
        const last = s2.history[s2.history.length - 1];
        expect(last.playerId).toBe(actor.id);
        expect(typeof last.timestamp).toBe('number');
    });
    it('hides other players hole cards but keeps your own in getStateForPlayer', () => {
        const game = new engine_1.GameEngine(defaultSettings(), 'TEST01');
        game.addPlayer('p1', 'A');
        game.addPlayer('p2', 'B');
        game.startGame('p1');
        const sForP1 = game.getStateForPlayer('p1');
        const p1 = sForP1.players.find((p) => p.id === 'p1');
        const p2 = sForP1.players.find((p) => p.id === 'p2');
        expect(p1.cards).toBeDefined();
        expect(p1.cards?.length).toBe(2);
        expect(p2.cards).toBeUndefined();
    });
    it('sets lastHandResult on fold win', () => {
        const game = new engine_1.GameEngine(defaultSettings(), 'TEST01');
        game.addPlayer('p1', 'A');
        game.addPlayer('p2', 'B');
        game.startGame('p1');
        const s1 = game.getState();
        const folder = s1.players[s1.activePlayerIndex];
        game.processPlayerAction(folder.id, 'fold');
        const s2 = game.getState();
        expect(s2.phase).toBe('finished');
        expect(s2.lastHandResult).toBeDefined();
        expect(s2.lastHandResult?.reason).toBe('fold');
        expect(s2.lastHandResult?.winners.length).toBe(1);
        expect(s2.lastHandResult?.pot).toBeGreaterThan(0);
    });
    it('nextHand resets per-hand state and deals a new hand (host only)', () => {
        const game = new engine_1.GameEngine(defaultSettings(), 'TEST01');
        game.addPlayer('p1', 'Host');
        game.addPlayer('p2', 'Other');
        game.startGame('p1');
        // End hand quickly by folding current actor
        const s1 = game.getState();
        game.processPlayerAction(s1.players[s1.activePlayerIndex].id, 'fold');
        const s2 = game.getState();
        expect(s2.phase).toBe('finished');
        // Non-host cannot advance
        expect(() => game.nextHand('p2')).toThrow('Only the host can start the next hand');
        // Host starts next hand
        game.nextHand('p1');
        const s3 = game.getState();
        expect(s3.phase).toBe('pre-flop');
        expect(s3.communityCards.length).toBe(0);
        expect(s3.history.length).toBeGreaterThanOrEqual(2); // blinds
        expect(s3.players.every((p) => (p.cards ? p.cards.length === 2 : false))).toBe(true);
        expect(s3.lastHandResult).toBeUndefined();
    });
});
