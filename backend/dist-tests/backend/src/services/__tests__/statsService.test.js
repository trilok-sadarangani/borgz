"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const gameHistoryService_1 = require("../gameHistoryService");
const statsService_1 = require("../statsService");
function baseSettings(overrides = {}) {
    return {
        variant: 'texas-holdem',
        smallBlind: 10,
        bigBlind: 20,
        startingStack: 1000,
        maxPlayers: 9,
        ...overrides,
    };
}
describe('PlayerStatsService', () => {
    it('filters hands by endedAt date range and returns gamesInRange', () => {
        const history = new gameHistoryService_1.GameHistoryService();
        const stats = new statsService_1.PlayerStatsService(history);
        history.registerGame({
            gameId: 'g1',
            code: 'CODE1',
            clubId: 'club1',
            variant: 'texas-holdem',
            settings: baseSettings(),
            createdAt: 100,
            endedAt: undefined,
        });
        history.recordPlayerJoined('CODE1', 'seed-alice', 0);
        const s = history.getPlayerSessions('seed-alice')[0];
        // Two finished hands with different endedAt values.
        history.recordHandFinished('g1', {
            startedAt: 1000,
            endedAt: 2000,
            reason: 'showdown',
            winners: [{ playerId: 'seed-alice', amount: 100 }],
            pot: 100,
            communityCards: [],
            actions: [],
            stacksStartByPlayerId: { 'seed-alice': 1000, 'seed-bob': 1000 },
            stacksEndByPlayerId: { 'seed-alice': 1100, 'seed-bob': 900 },
        });
        history.recordHandFinished('g1', {
            startedAt: 3000,
            endedAt: 4000,
            reason: 'fold',
            winners: [{ playerId: 'seed-bob', amount: 60 }],
            pot: 60,
            communityCards: [],
            actions: [],
            stacksStartByPlayerId: { 'seed-alice': 1100, 'seed-bob': 900 },
            stacksEndByPlayerId: { 'seed-alice': 1080, 'seed-bob': 920 },
        });
        // Session should include both hands (joinedAt=0, leftAt=undefined).
        expect(history.getHandsForSession(s).length).toBe(2);
        const out = stats.getMyStats('seed-alice', { from: 2500, to: 4500 });
        expect(out.summary.totalHands).toBe(1);
        expect(out.gamesInRange.length).toBe(1);
        expect(out.gamesInRange[0].gameId).toBe('g1');
        expect(out.gamesInRange[0].handsInRange).toBe(1);
    });
    it('filters by effective stack depth bucket (using stacksStartByPlayerId)', () => {
        const history = new gameHistoryService_1.GameHistoryService();
        const stats = new statsService_1.PlayerStatsService(history);
        history.registerGame({
            gameId: 'g1',
            code: 'CODE1',
            clubId: 'club1',
            variant: 'texas-holdem',
            settings: baseSettings({ bigBlind: 20 }),
            createdAt: 100,
            endedAt: undefined,
        });
        history.recordPlayerJoined('CODE1', 'seed-alice', 0);
        // Effective stack for alice: min(alice=800, maxOpp=800)/20 = 40bb => bucket 0-50
        history.recordHandFinished('g1', {
            startedAt: 1000,
            endedAt: 2000,
            reason: 'showdown',
            winners: [{ playerId: 'seed-alice', amount: 40 }],
            pot: 40,
            communityCards: [],
            actions: [],
            stacksStartByPlayerId: { 'seed-alice': 800, 'seed-bob': 800 },
            stacksEndByPlayerId: { 'seed-alice': 840, 'seed-bob': 760 },
        });
        const out1 = stats.getMyStats('seed-alice', { depthBucket: '0-50' });
        expect(out1.summary.totalHands).toBe(1);
        const out2 = stats.getMyStats('seed-alice', { depthBucket: '50-100' });
        expect(out2.summary.totalHands).toBe(0);
    });
    it('treats from/to bounds as inclusive (endedAt exactly on boundary counts)', () => {
        const history = new gameHistoryService_1.GameHistoryService();
        const stats = new statsService_1.PlayerStatsService(history);
        history.registerGame({
            gameId: 'g1',
            code: 'CODE1',
            clubId: 'club1',
            variant: 'texas-holdem',
            settings: baseSettings(),
            createdAt: 100,
            endedAt: undefined,
        });
        history.recordPlayerJoined('CODE1', 'seed-alice', 0);
        history.recordHandFinished('g1', {
            endedAt: 1000,
            reason: 'showdown',
            winners: [{ playerId: 'seed-alice', amount: 10 }],
            pot: 10,
            communityCards: [],
            actions: [],
            stacksStartByPlayerId: { 'seed-alice': 1000, 'seed-bob': 1000 },
            stacksEndByPlayerId: { 'seed-alice': 1010, 'seed-bob': 990 },
        });
        history.recordHandFinished('g1', {
            endedAt: 2000,
            reason: 'fold',
            winners: [{ playerId: 'seed-bob', amount: 10 }],
            pot: 10,
            communityCards: [],
            actions: [],
            stacksStartByPlayerId: { 'seed-alice': 1010, 'seed-bob': 990 },
            stacksEndByPlayerId: { 'seed-alice': 1000, 'seed-bob': 1000 },
        });
        const out = stats.getMyStats('seed-alice', { from: 1000, to: 2000 });
        expect(out.summary.totalHands).toBe(2);
    });
    it('handles missing action phases gracefully (still counts hands; action-derived stats skip)', () => {
        const history = new gameHistoryService_1.GameHistoryService();
        const stats = new statsService_1.PlayerStatsService(history);
        history.registerGame({
            gameId: 'g1',
            code: 'CODE1',
            clubId: 'club1',
            variant: 'texas-holdem',
            settings: baseSettings({ bigBlind: 20 }),
            createdAt: 100,
            endedAt: undefined,
        });
        history.recordPlayerJoined('CODE1', 'seed-alice', 0);
        history.recordHandFinished('g1', {
            endedAt: 2000,
            reason: 'showdown',
            winners: [{ playerId: 'seed-alice', amount: 40 }],
            pot: 40,
            communityCards: [],
            // No phase info -> should not crash; VPIP/PFR/3bet remain 0 because hand not counted for preflop metrics.
            actions: [{ playerId: 'seed-alice', action: 'raise', amount: 60, timestamp: 1 }],
            stacksStartByPlayerId: { 'seed-alice': 1000, 'seed-bob': 1000 },
            stacksEndByPlayerId: { 'seed-alice': 1040, 'seed-bob': 960 },
        });
        const out = stats.getMyStats('seed-alice', {});
        expect(out.summary.totalHands).toBe(1);
        expect(out.summary.totalWinnings).toBe(40);
        expect(out.summary.vpip).toBe(0);
        expect(out.summary.pfr).toBe(0);
        expect(out.summary.threeBetPercentage).toBe(0);
    });
    it('handles missing stack snapshots gracefully (winnings/bb100 skip, but hands still count)', () => {
        const history = new gameHistoryService_1.GameHistoryService();
        const stats = new statsService_1.PlayerStatsService(history);
        history.registerGame({
            gameId: 'g1',
            code: 'CODE1',
            clubId: 'club1',
            variant: 'texas-holdem',
            settings: baseSettings({ bigBlind: 20 }),
            createdAt: 100,
            endedAt: undefined,
        });
        history.recordPlayerJoined('CODE1', 'seed-alice', 0);
        history.recordHandFinished('g1', {
            endedAt: 2000,
            reason: 'showdown',
            winners: [{ playerId: 'seed-alice', amount: 40 }],
            pot: 40,
            communityCards: [],
            actions: [],
            // no stacksStart/End
        });
        const out = stats.getMyStats('seed-alice', {});
        expect(out.summary.totalHands).toBe(1);
        expect(out.summary.totalWinnings).toBe(0);
        expect(out.summary.bb100).toBeNull();
    });
    it('computes bb100 correctly across mixed blind sizes (per-hand normalization)', () => {
        const history = new gameHistoryService_1.GameHistoryService();
        const stats = new statsService_1.PlayerStatsService(history);
        history.registerGame({
            gameId: 'g1',
            code: 'CODE1',
            clubId: 'club1',
            variant: 'texas-holdem',
            settings: baseSettings({ bigBlind: 20 }),
            createdAt: 100,
            endedAt: undefined,
        });
        history.registerGame({
            gameId: 'g2',
            code: 'CODE2',
            clubId: 'club1',
            variant: 'texas-holdem',
            settings: baseSettings({ bigBlind: 50 }),
            createdAt: 200,
            endedAt: undefined,
        });
        history.recordPlayerJoined('CODE1', 'seed-alice', 0);
        history.recordPlayerJoined('CODE2', 'seed-alice', 0);
        // +40 chips at bb=20 => +2bb
        history.recordHandFinished('g1', {
            endedAt: 2000,
            reason: 'showdown',
            winners: [{ playerId: 'seed-alice', amount: 40 }],
            pot: 40,
            communityCards: [],
            actions: [],
            stacksStartByPlayerId: { 'seed-alice': 1000, 'seed-bob': 1000 },
            stacksEndByPlayerId: { 'seed-alice': 1040, 'seed-bob': 960 },
        });
        // +50 chips at bb=50 => +1bb
        history.recordHandFinished('g2', {
            endedAt: 3000,
            reason: 'showdown',
            winners: [{ playerId: 'seed-alice', amount: 50 }],
            pot: 50,
            communityCards: [],
            actions: [],
            stacksStartByPlayerId: { 'seed-alice': 1000, 'seed-bob': 1000 },
            stacksEndByPlayerId: { 'seed-alice': 1050, 'seed-bob': 950 },
        });
        const out = stats.getMyStats('seed-alice', {});
        // average bb won per hand = (2 + 1)/2 = 1.5 => bb100 = 150
        expect(out.summary.bb100).toBeCloseTo(150, 5);
    });
    it('counts c-bet opportunity as missed when villain donk-bets first on flop', () => {
        const history = new gameHistoryService_1.GameHistoryService();
        const stats = new statsService_1.PlayerStatsService(history);
        history.registerGame({
            gameId: 'g1',
            code: 'CODE1',
            clubId: 'club1',
            variant: 'texas-holdem',
            settings: baseSettings({ bigBlind: 20 }),
            createdAt: 100,
            endedAt: undefined,
        });
        history.recordPlayerJoined('CODE1', 'seed-alice', 0);
        history.recordHandFinished('g1', {
            endedAt: 2000,
            reason: 'showdown',
            winners: [{ playerId: 'seed-bob', amount: 40 }],
            pot: 40,
            communityCards: [{ suit: 'hearts', rank: '2' }, { suit: 'hearts', rank: '3' }, { suit: 'hearts', rank: '4' }],
            actions: [
                { playerId: 'seed-alice', action: 'raise', amount: 60, phase: 'pre-flop', currentBetAfter: 60, betTo: 60, timestamp: 1 },
                { playerId: 'seed-bob', action: 'call', phase: 'pre-flop', currentBetAfter: 60, betTo: 60, timestamp: 2 },
                // Donk bet by Bob is the first flop bet.
                { playerId: 'seed-bob', action: 'raise', amount: 20, phase: 'flop', currentBetAfter: 20, betTo: 20, timestamp: 3 },
            ],
            stacksStartByPlayerId: { 'seed-alice': 1000, 'seed-bob': 1000 },
            stacksEndByPlayerId: { 'seed-alice': 980, 'seed-bob': 1020 },
        });
        const out = stats.getMyStats('seed-alice', {});
        expect(out.summary.cbetPercentage).toBeCloseTo(0, 5);
    });
    it('does not count showdown ties as a win vs opponent (wsdVsOpponent)', () => {
        const history = new gameHistoryService_1.GameHistoryService();
        const stats = new statsService_1.PlayerStatsService(history);
        history.registerGame({
            gameId: 'g1',
            code: 'CODE1',
            clubId: 'club1',
            variant: 'texas-holdem',
            settings: baseSettings({ bigBlind: 20 }),
            createdAt: 100,
            endedAt: undefined,
        });
        history.recordPlayerJoined('CODE1', 'seed-alice', 0);
        history.recordHandFinished('g1', {
            endedAt: 2000,
            reason: 'showdown',
            winners: [
                { playerId: 'seed-alice', amount: 20 },
                { playerId: 'seed-bob', amount: 20 },
            ],
            pot: 40,
            communityCards: [],
            actions: [{ playerId: 'seed-alice', action: 'call', phase: 'river', currentBetAfter: 10, betTo: 10, timestamp: 1 }],
            stacksStartByPlayerId: { 'seed-alice': 1000, 'seed-bob': 1000 },
            stacksEndByPlayerId: { 'seed-alice': 1020, 'seed-bob': 1020 },
        });
        const out = stats.getMyStats('seed-alice', {});
        const vsBob = out.vsOpponents.find((o) => o.opponentId === 'seed-bob');
        expect(vsBob?.showdownsTogether).toBe(1);
        expect(vsBob?.showdownsWon).toBe(0);
        expect(vsBob?.wsdVsOpponent).toBe(0);
    });
    it('computes VPIP/PFR/3bet from pre-flop action log (phase + currentBetAfter)', () => {
        const history = new gameHistoryService_1.GameHistoryService();
        const stats = new statsService_1.PlayerStatsService(history);
        history.registerGame({
            gameId: 'g1',
            code: 'CODE1',
            clubId: 'club1',
            variant: 'texas-holdem',
            settings: baseSettings({ bigBlind: 20 }),
            createdAt: 100,
            endedAt: undefined,
        });
        history.recordPlayerJoined('CODE1', 'seed-alice', 0);
        // Preflop line:
        // - Bob opens to 60 (raiseCount=1)
        // - Alice 3bets to 180 (raiseCount=2 => alice threeBet=true)
        // - Bob calls (vpip for bob too, but we only check alice here)
        history.recordHandFinished('g1', {
            startedAt: 1000,
            endedAt: 2000,
            reason: 'showdown',
            winners: [{ playerId: 'seed-alice', amount: 200 }],
            pot: 200,
            communityCards: [],
            actions: [
                { playerId: 'seed-bob', action: 'post-blind', amount: 10, phase: 'pre-flop', currentBetAfter: 20, betTo: 10, timestamp: 1 },
                { playerId: 'seed-alice', action: 'post-blind', amount: 20, phase: 'pre-flop', currentBetAfter: 20, betTo: 20, timestamp: 2 },
                { playerId: 'seed-bob', action: 'raise', amount: 60, phase: 'pre-flop', currentBetAfter: 60, betTo: 60, timestamp: 3 },
                { playerId: 'seed-alice', action: 'raise', amount: 180, phase: 'pre-flop', currentBetAfter: 180, betTo: 180, timestamp: 4 },
                { playerId: 'seed-bob', action: 'call', phase: 'pre-flop', currentBetAfter: 180, betTo: 180, timestamp: 5 },
            ],
            stacksStartByPlayerId: { 'seed-alice': 1000, 'seed-bob': 1000 },
            stacksEndByPlayerId: { 'seed-alice': 1100, 'seed-bob': 900 },
        });
        const out = stats.getMyStats('seed-alice', {});
        expect(out.summary.totalHands).toBe(1);
        expect(out.summary.vpip).toBe(100);
        expect(out.summary.pfr).toBe(100);
        expect(out.summary.threeBetPercentage).toBe(100);
    });
    it('computes net winnings from stacksEnd - stacksStart and bb100', () => {
        const history = new gameHistoryService_1.GameHistoryService();
        const stats = new statsService_1.PlayerStatsService(history);
        history.registerGame({
            gameId: 'g1',
            code: 'CODE1',
            clubId: 'club1',
            variant: 'texas-holdem',
            settings: baseSettings({ bigBlind: 20 }),
            createdAt: 100,
            endedAt: undefined,
        });
        history.recordPlayerJoined('CODE1', 'seed-alice', 0);
        history.recordHandFinished('g1', {
            startedAt: 1000,
            endedAt: 2000,
            reason: 'showdown',
            winners: [{ playerId: 'seed-alice', amount: 40 }],
            pot: 40,
            communityCards: [],
            actions: [],
            stacksStartByPlayerId: { 'seed-alice': 1000, 'seed-bob': 1000 },
            stacksEndByPlayerId: { 'seed-alice': 1040, 'seed-bob': 960 },
        });
        const out = stats.getMyStats('seed-alice', {});
        expect(out.summary.totalWinnings).toBe(40);
        // bb won = 40/20 = 2bb over 1 hand => bb100 = 200
        expect(out.summary.bb100).toBe(200);
    });
    it('computes WTSD and W$SD (showdown participation and win rate)', () => {
        const history = new gameHistoryService_1.GameHistoryService();
        const stats = new statsService_1.PlayerStatsService(history);
        history.registerGame({
            gameId: 'g1',
            code: 'CODE1',
            clubId: 'club1',
            variant: 'texas-holdem',
            settings: baseSettings({ bigBlind: 20 }),
            createdAt: 100,
            endedAt: undefined,
        });
        history.recordPlayerJoined('CODE1', 'seed-alice', 0);
        // Hand 1: showdown, alice wins.
        history.recordHandFinished('g1', {
            startedAt: 1000,
            endedAt: 2000,
            reason: 'showdown',
            winners: [{ playerId: 'seed-alice', amount: 40 }],
            pot: 40,
            communityCards: [],
            actions: [{ playerId: 'seed-alice', action: 'call', phase: 'flop', currentBetAfter: 10, betTo: 10, timestamp: 1 }],
            stacksStartByPlayerId: { 'seed-alice': 1000, 'seed-bob': 1000 },
            stacksEndByPlayerId: { 'seed-alice': 1040, 'seed-bob': 960 },
        });
        // Hand 2: showdown, alice loses.
        history.recordHandFinished('g1', {
            startedAt: 3000,
            endedAt: 4000,
            reason: 'showdown',
            winners: [{ playerId: 'seed-bob', amount: 20 }],
            pot: 20,
            communityCards: [],
            actions: [{ playerId: 'seed-alice', action: 'call', phase: 'turn', currentBetAfter: 10, betTo: 10, timestamp: 2 }],
            stacksStartByPlayerId: { 'seed-alice': 1040, 'seed-bob': 960 },
            stacksEndByPlayerId: { 'seed-alice': 1020, 'seed-bob': 980 },
        });
        // Hand 3: non-showdown (fold), should not count toward showdown hands.
        history.recordHandFinished('g1', {
            startedAt: 5000,
            endedAt: 6000,
            reason: 'fold',
            winners: [{ playerId: 'seed-alice', amount: 10 }],
            pot: 10,
            communityCards: [],
            actions: [{ playerId: 'seed-bob', action: 'fold', phase: 'flop', currentBetAfter: 0, betTo: 0, timestamp: 3 }],
            stacksStartByPlayerId: { 'seed-alice': 1020, 'seed-bob': 980 },
            stacksEndByPlayerId: { 'seed-alice': 1030, 'seed-bob': 970 },
        });
        const out = stats.getMyStats('seed-alice', {});
        expect(out.summary.totalHands).toBe(3);
        // WTSD = 2/3 * 100
        expect(out.summary.wtsd).toBeCloseTo((2 / 3) * 100, 5);
        // W$SD = 1/2 * 100
        expect(out.summary.wsd).toBeCloseTo(50, 5);
    });
    it('computes aggressionFactor from postflop raises/all-ins vs calls', () => {
        const history = new gameHistoryService_1.GameHistoryService();
        const stats = new statsService_1.PlayerStatsService(history);
        history.registerGame({
            gameId: 'g1',
            code: 'CODE1',
            clubId: 'club1',
            variant: 'texas-holdem',
            settings: baseSettings({ bigBlind: 20 }),
            createdAt: 100,
            endedAt: undefined,
        });
        history.recordPlayerJoined('CODE1', 'seed-alice', 0);
        history.recordHandFinished('g1', {
            startedAt: 1000,
            endedAt: 2000,
            reason: 'showdown',
            winners: [{ playerId: 'seed-alice', amount: 40 }],
            pot: 40,
            communityCards: [],
            actions: [
                { playerId: 'seed-alice', action: 'raise', amount: 10, phase: 'flop', currentBetAfter: 10, betTo: 10, timestamp: 1 },
                { playerId: 'seed-alice', action: 'call', phase: 'turn', currentBetAfter: 10, betTo: 10, timestamp: 2 },
                { playerId: 'seed-alice', action: 'all-in', phase: 'river', currentBetAfter: 20, betTo: 20, timestamp: 3 },
            ],
            stacksStartByPlayerId: { 'seed-alice': 1000, 'seed-bob': 1000 },
            stacksEndByPlayerId: { 'seed-alice': 1040, 'seed-bob': 960 },
        });
        const out = stats.getMyStats('seed-alice', {});
        // aggressive = 2 (raise + all-in), calls = 1 => AF = 2
        expect(out.summary.aggressionFactor).toBeCloseTo(2, 5);
    });
    it('computes cbetPercentage for preflop aggressor (first flop bet)', () => {
        const history = new gameHistoryService_1.GameHistoryService();
        const stats = new statsService_1.PlayerStatsService(history);
        history.registerGame({
            gameId: 'g1',
            code: 'CODE1',
            clubId: 'club1',
            variant: 'texas-holdem',
            settings: baseSettings({ bigBlind: 20 }),
            createdAt: 100,
            endedAt: undefined,
        });
        history.recordPlayerJoined('CODE1', 'seed-alice', 0);
        // Hand 1: Alice is preflop aggressor and makes first flop bet => cbet made
        history.recordHandFinished('g1', {
            startedAt: 1000,
            endedAt: 2000,
            reason: 'showdown',
            winners: [{ playerId: 'seed-alice', amount: 40 }],
            pot: 40,
            communityCards: [{ suit: 'hearts', rank: '2' }, { suit: 'hearts', rank: '3' }, { suit: 'hearts', rank: '4' }],
            actions: [
                { playerId: 'seed-alice', action: 'raise', amount: 60, phase: 'pre-flop', currentBetAfter: 60, betTo: 60, timestamp: 1 },
                { playerId: 'seed-bob', action: 'call', phase: 'pre-flop', currentBetAfter: 60, betTo: 60, timestamp: 2 },
                { playerId: 'seed-alice', action: 'raise', amount: 20, phase: 'flop', currentBetAfter: 20, betTo: 20, timestamp: 3 },
            ],
            stacksStartByPlayerId: { 'seed-alice': 1000, 'seed-bob': 1000 },
            stacksEndByPlayerId: { 'seed-alice': 1040, 'seed-bob': 960 },
        });
        // Hand 2: Alice is preflop aggressor but Bob makes first flop bet => cbet missed
        history.recordHandFinished('g1', {
            startedAt: 3000,
            endedAt: 4000,
            reason: 'showdown',
            winners: [{ playerId: 'seed-bob', amount: 40 }],
            pot: 40,
            communityCards: [{ suit: 'hearts', rank: '2' }, { suit: 'hearts', rank: '3' }, { suit: 'hearts', rank: '4' }],
            actions: [
                { playerId: 'seed-alice', action: 'raise', amount: 60, phase: 'pre-flop', currentBetAfter: 60, betTo: 60, timestamp: 4 },
                { playerId: 'seed-bob', action: 'call', phase: 'pre-flop', currentBetAfter: 60, betTo: 60, timestamp: 5 },
                { playerId: 'seed-bob', action: 'raise', amount: 20, phase: 'flop', currentBetAfter: 20, betTo: 20, timestamp: 6 },
            ],
            stacksStartByPlayerId: { 'seed-alice': 1040, 'seed-bob': 960 },
            stacksEndByPlayerId: { 'seed-alice': 1000, 'seed-bob': 1000 },
        });
        const out = stats.getMyStats('seed-alice', {});
        // 1/2 cbets
        expect(out.summary.cbetPercentage).toBeCloseTo(50, 5);
    });
    it('computes vsOpponents breakdown (hands together + net)', () => {
        const history = new gameHistoryService_1.GameHistoryService();
        const stats = new statsService_1.PlayerStatsService(history);
        history.registerGame({
            gameId: 'g1',
            code: 'CODE1',
            clubId: 'club1',
            variant: 'texas-holdem',
            settings: baseSettings({ bigBlind: 20 }),
            createdAt: 100,
            endedAt: undefined,
        });
        history.recordPlayerJoined('CODE1', 'seed-alice', 0);
        // Hand includes Bob + Charlie at start.
        history.recordHandFinished('g1', {
            startedAt: 1000,
            endedAt: 2000,
            reason: 'showdown',
            winners: [{ playerId: 'seed-alice', amount: 60 }],
            pot: 60,
            communityCards: [{ suit: 'hearts', rank: '2' }, { suit: 'hearts', rank: '3' }, { suit: 'hearts', rank: '4' }],
            actions: [],
            stacksStartByPlayerId: { 'seed-alice': 1000, 'seed-bob': 1000, 'seed-charlie': 1000 },
            stacksEndByPlayerId: { 'seed-alice': 1060, 'seed-bob': 970, 'seed-charlie': 970 },
        });
        // Second hand only includes Bob.
        history.recordHandFinished('g1', {
            startedAt: 3000,
            endedAt: 4000,
            reason: 'fold',
            winners: [{ playerId: 'seed-bob', amount: 20 }],
            pot: 20,
            communityCards: [],
            actions: [],
            stacksStartByPlayerId: { 'seed-alice': 1060, 'seed-bob': 970 },
            stacksEndByPlayerId: { 'seed-alice': 1040, 'seed-bob': 990 },
        });
        const out = stats.getMyStats('seed-alice', {});
        expect(out.vsOpponents.length).toBeGreaterThan(0);
        const vsBob = out.vsOpponents.find((o) => o.opponentId === 'seed-bob');
        const vsCharlie = out.vsOpponents.find((o) => o.opponentId === 'seed-charlie');
        expect(vsBob?.handsTogether).toBe(2);
        expect(vsCharlie?.handsTogether).toBe(1);
        // Net for alice: +60 then -20 => +40, attributed to each opponent they played with in those hands.
        expect(vsBob?.totalWinnings).toBe(40);
        expect(vsCharlie?.totalWinnings).toBe(60);
    });
    it('computes positional preflop charts (RFI/PFR/3bet/4bet) when table snapshot is present', () => {
        const history = new gameHistoryService_1.GameHistoryService();
        const stats = new statsService_1.PlayerStatsService(history);
        history.registerGame({
            gameId: 'g1',
            code: 'CODE1',
            clubId: 'club1',
            variant: 'texas-holdem',
            settings: baseSettings({ maxPlayers: 6 }),
            createdAt: 100,
            endedAt: undefined,
        });
        // Seats (0..5), dealer = 3 (BTN), SB=4, BB=5, UTG=0.
        const seats = ['seed-alice', 'seed-bob', 'seed-charlie', 'seed-dana', 'seed-erin', 'seed-frank'];
        history.recordPlayerJoined('CODE1', 'seed-alice', 0);
        history.recordPlayerJoined('CODE1', 'seed-bob', 0);
        history.recordPlayerJoined('CODE1', 'seed-charlie', 0);
        history.recordPlayerJoined('CODE1', 'seed-dana', 0);
        history.recordPlayerJoined('CODE1', 'seed-erin', 0);
        history.recordPlayerJoined('CODE1', 'seed-frank', 0);
        // Hand 1: Alice (UTG) open-raises => RFI+PFR.
        history.recordHandFinished('g1', {
            startedAt: 1000,
            endedAt: 2000,
            reason: 'fold',
            winners: [{ playerId: 'seed-alice', amount: 30 }],
            pot: 30,
            communityCards: [],
            actions: [
                { playerId: 'seed-erin', action: 'post-blind', amount: 10, phase: 'pre-flop', currentBetAfter: 20, betTo: 10, timestamp: 1 },
                { playerId: 'seed-frank', action: 'post-blind', amount: 20, phase: 'pre-flop', currentBetAfter: 20, betTo: 20, timestamp: 2 },
                { playerId: 'seed-alice', action: 'raise', amount: 60, phase: 'pre-flop', currentBetAfter: 60, betTo: 60, timestamp: 3 },
            ],
            table: { seats, dealerPosition: 3, smallBlindPosition: 4, bigBlindPosition: 5 },
            stacksStartByPlayerId: Object.fromEntries(seats.map((p) => [p, 1000])),
            stacksEndByPlayerId: Object.fromEntries(seats.map((p) => [p, 1000])),
        });
        // Hand 2: Bob (HJ) faces open (raiseCount=1) and 3bets => 3B+PFR.
        history.recordHandFinished('g1', {
            startedAt: 3000,
            endedAt: 4000,
            reason: 'fold',
            winners: [{ playerId: 'seed-bob', amount: 40 }],
            pot: 40,
            communityCards: [],
            actions: [
                { playerId: 'seed-erin', action: 'post-blind', amount: 10, phase: 'pre-flop', currentBetAfter: 20, betTo: 10, timestamp: 1 },
                { playerId: 'seed-frank', action: 'post-blind', amount: 20, phase: 'pre-flop', currentBetAfter: 20, betTo: 20, timestamp: 2 },
                { playerId: 'seed-alice', action: 'raise', amount: 60, phase: 'pre-flop', currentBetAfter: 60, betTo: 60, timestamp: 3 },
                { playerId: 'seed-bob', action: 'raise', amount: 180, phase: 'pre-flop', currentBetAfter: 180, betTo: 180, timestamp: 4 },
            ],
            table: { seats, dealerPosition: 3, smallBlindPosition: 4, bigBlindPosition: 5 },
            stacksStartByPlayerId: Object.fromEntries(seats.map((p) => [p, 1000])),
            stacksEndByPlayerId: Object.fromEntries(seats.map((p) => [p, 1000])),
        });
        // Hand 3: Alice (UTG) opens, Bob (HJ) 3bets, Alice 4bets => 4B+PFR for Alice with 4B opp.
        history.recordHandFinished('g1', {
            startedAt: 5000,
            endedAt: 6000,
            reason: 'fold',
            winners: [{ playerId: 'seed-alice', amount: 60 }],
            pot: 60,
            communityCards: [],
            actions: [
                { playerId: 'seed-erin', action: 'post-blind', amount: 10, phase: 'pre-flop', currentBetAfter: 20, betTo: 10, timestamp: 1 },
                { playerId: 'seed-frank', action: 'post-blind', amount: 20, phase: 'pre-flop', currentBetAfter: 20, betTo: 20, timestamp: 2 },
                { playerId: 'seed-alice', action: 'raise', amount: 60, phase: 'pre-flop', currentBetAfter: 60, betTo: 60, timestamp: 3 },
                { playerId: 'seed-bob', action: 'raise', amount: 180, phase: 'pre-flop', currentBetAfter: 180, betTo: 180, timestamp: 4 },
                { playerId: 'seed-alice', action: 'raise', amount: 400, phase: 'pre-flop', currentBetAfter: 400, betTo: 400, timestamp: 5 },
            ],
            table: { seats, dealerPosition: 3, smallBlindPosition: 4, bigBlindPosition: 5 },
            stacksStartByPlayerId: Object.fromEntries(seats.map((p) => [p, 1000])),
            stacksEndByPlayerId: Object.fromEntries(seats.map((p) => [p, 1000])),
        });
        const outAlice = stats.getMyStats('seed-alice', {});
        const utg = outAlice.preflop.byPosition.find((p) => p.position === 'UTG');
        expect(utg).toBeTruthy();
        expect(utg?.openOpps).toBe(3); // Hand 1 + Hand 2 + Hand 3
        expect(utg?.openRaiseCount).toBe(3);
        expect(utg?.fourBetOpps).toBe(1); // Hand 3 only
        expect(utg?.fourBetCount).toBe(1);
        const outBob = stats.getMyStats('seed-bob', {});
        const hj = outBob.preflop.byPosition.find((p) => p.position === 'HJ');
        expect(hj).toBeTruthy();
        expect(hj?.threeBetOpps).toBe(2); // Hand 2 + Hand 3 (faces Alice open both times)
        expect(hj?.threeBetCount).toBe(2);
    });
});
