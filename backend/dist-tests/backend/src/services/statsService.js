"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.playerStatsService = exports.PlayerStatsService = void 0;
const gameHistoryService_1 = require("./gameHistoryService");
function getNonBlindPositionLabels(n) {
    // n is table size (seats length). This app caps at 9.
    // Returns labels for the non-blind seats in order from UTG (left of BB) to BTN (dealer), inclusive.
    // Length must be n-2 (excluding SB and BB).
    switch (n) {
        case 2:
            return ['BTN/SB']; // only used for the dealer seat in HU
        case 3:
            return ['BTN'];
        case 4:
            return ['UTG', 'BTN'];
        case 5:
            return ['UTG', 'CO', 'BTN'];
        case 6:
            return ['UTG', 'HJ', 'CO', 'BTN'];
        case 7:
            return ['UTG', 'UTG+1', 'HJ', 'CO', 'BTN'];
        case 8:
            return ['UTG', 'UTG+1', 'UTG+2', 'HJ', 'CO', 'BTN'];
        case 9:
            return ['UTG', 'UTG+1', 'UTG+2', 'LJ', 'HJ', 'CO', 'BTN'];
        default:
            // Fallback for unexpected sizes: label everything as UTG+X ending at BTN.
            // Keep SB/BB separate; this only covers non-blinds.
            if (n < 2)
                return [];
            const count = Math.max(0, n - 2);
            if (count === 0)
                return [];
            if (count === 1)
                return ['BTN'];
            const out = ['UTG'];
            for (let i = 1; i < count - 1; i += 1)
                out.push(`UTG+${i}`);
            out.push('BTN');
            return out;
    }
}
function computePlayerPreflopPosition(hand, playerId) {
    const t = hand.table;
    if (!t)
        return null;
    const { seats, dealerPosition, smallBlindPosition, bigBlindPosition } = t;
    const n = seats.length;
    if (n < 2)
        return null;
    const seatIdx = seats.indexOf(playerId);
    if (seatIdx < 0)
        return null;
    if (n === 2) {
        // Heads-up: dealer is BTN/SB, other is BB.
        if (seatIdx === dealerPosition)
            return 'BTN/SB';
        if (seatIdx === bigBlindPosition)
            return 'BB';
        // Defensive fallback
        if (seatIdx === smallBlindPosition)
            return 'BTN/SB';
        return null;
    }
    if (seatIdx === smallBlindPosition)
        return 'SB';
    if (seatIdx === bigBlindPosition)
        return 'BB';
    if (seatIdx === dealerPosition)
        return 'BTN';
    // Non-blinds: map in order from UTG (left of BB) to BTN.
    const labels = getNonBlindPositionLabels(n);
    const utgSeat = (bigBlindPosition + 1) % n;
    const distanceFromUTG = (seatIdx - utgSeat + n) % n;
    // distanceFromUTG should be within non-blinds range; SB/BB already handled.
    if (distanceFromUTG < 0)
        return null;
    // Build the seat order for non-blinds starting at UTG by walking clockwise and skipping blinds.
    const nonBlindSeats = [];
    for (let step = 0; step < n; step += 1) {
        const s = (utgSeat + step) % n;
        if (s === smallBlindPosition || s === bigBlindPosition)
            continue;
        nonBlindSeats.push(s);
    }
    const idxInNonBlinds = nonBlindSeats.indexOf(seatIdx);
    if (idxInNonBlinds < 0)
        return null;
    return labels[idxInNonBlinds] || null;
}
function computePreflopOpportunitiesAndActions(hand, playerId) {
    const actions = (hand.actions || [])
        .filter((a) => a.phase === 'pre-flop')
        .slice()
        .sort((a, b) => a.timestamp - b.timestamp);
    const hasPreflopPhases = actions.length > 0;
    if (!hasPreflopPhases) {
        return {
            hasPreflopPhases: false,
            hadDecision: false,
            pfr: false,
            openOpp: false,
            openRaise: false,
            threeBetOpp: false,
            threeBet: false,
            fourBetOpp: false,
            fourBet: false,
        };
    }
    let currentBet = 0;
    let raiseCount = 0;
    let priorVoluntaryMoney = false; // any non-forced call/raise/all-in before player's first action
    let hadDecision = false; // player took at least one non-forced preflop action
    let pfr = false;
    let openOpp = false;
    let openRaise = false;
    let threeBetOpp = false;
    let threeBet = false;
    let fourBetOpp = false;
    let fourBet = false;
    let openEvaluated = false;
    let threeBetEvaluated = false;
    let fourBetEvaluated = false;
    for (const a of actions) {
        const isForced = a.action === 'post-blind' || a.action === 'post-ante';
        const betAfter = typeof a.currentBetAfter === 'number' ? a.currentBetAfter : undefined;
        const explicitRaiseTo = a.action === 'raise' && typeof a.amount === 'number' ? a.amount : undefined;
        const raiseTo = explicitRaiseTo ?? betAfter;
        if (isForced) {
            if (typeof betAfter === 'number')
                currentBet = Math.max(currentBet, betAfter);
            continue;
        }
        const isPlayer = a.playerId === playerId;
        const isRaise = typeof raiseTo === 'number' && raiseTo > currentBet;
        if (isPlayer) {
            hadDecision = true;
            if (isRaise)
                pfr = true;
            // Open opportunity is defined only at the player's first action.
            if (!openEvaluated) {
                openEvaluated = true;
                openOpp = raiseCount === 0 && !priorVoluntaryMoney;
                if (openOpp && isRaise)
                    openRaise = true;
            }
            // 3bet opportunity is the first time the player acts while facing exactly 1 raise.
            if (!threeBetEvaluated && raiseCount === 1) {
                threeBetEvaluated = true;
                threeBetOpp = true;
                if (isRaise)
                    threeBet = true;
            }
            // 4bet opportunity is the first time the player acts while facing exactly 2 raises.
            if (!fourBetEvaluated && raiseCount === 2) {
                fourBetEvaluated = true;
                fourBetOpp = true;
                if (isRaise)
                    fourBet = true;
            }
        }
        else if (!openEvaluated) {
            // Only track "prior voluntary money" until the player's first action (for RFI).
            if (a.action === 'call' || a.action === 'raise' || a.action === 'all-in')
                priorVoluntaryMoney = true;
        }
        // Track global raiseCount/currentBet as we walk actions.
        if (typeof raiseTo === 'number' && raiseTo > currentBet) {
            raiseCount += 1;
            currentBet = raiseTo;
        }
        else if (typeof betAfter === 'number') {
            currentBet = Math.max(currentBet, betAfter);
        }
    }
    return {
        hasPreflopPhases,
        hadDecision,
        pfr,
        openOpp,
        openRaise,
        threeBetOpp,
        threeBet,
        fourBetOpp,
        fourBet,
    };
}
function parseDepthBucket(bb) {
    if (bb < 50)
        return '0-50';
    if (bb < 100)
        return '50-100';
    if (bb < 150)
        return '100-150';
    if (bb < 500)
        return '150-500';
    return '500+';
}
function computeEffectiveStackBbForPlayer(hand, settings, playerId) {
    const stacks = hand.stacksStartByPlayerId;
    if (!stacks)
        return null;
    const playerStack = stacks[playerId];
    if (typeof playerStack !== 'number')
        return null;
    const opponents = Object.entries(stacks)
        .filter(([pid, s]) => pid !== playerId && typeof s === 'number' && s > 0)
        .map(([, s]) => s);
    const maxOpp = opponents.length ? Math.max(...opponents) : playerStack;
    const effective = Math.min(playerStack, maxOpp);
    const bb = settings.bigBlind || 1;
    return effective / bb;
}
function getNetWinningsForHand(hand, playerId) {
    const start = hand.stacksStartByPlayerId?.[playerId];
    const end = hand.stacksEndByPlayerId?.[playerId];
    if (typeof start !== 'number' || typeof end !== 'number')
        return null;
    return end - start;
}
function computePreflopFlags(hand, playerId) {
    const actions = (hand.actions || [])
        .filter((a) => a.phase === 'pre-flop')
        .slice()
        .sort((a, b) => a.timestamp - b.timestamp);
    let currentBet = 0;
    let raiseCount = 0;
    let vpip = false;
    let pfr = false;
    let threeBet = false;
    for (const a of actions) {
        const isForced = a.action === 'post-blind' || a.action === 'post-ante';
        if (!isForced && a.playerId === playerId) {
            if (a.action === 'call' || a.action === 'raise' || a.action === 'all-in') {
                vpip = true;
            }
        }
        // Track raises for 3bet detection.
        const betAfter = typeof a.currentBetAfter === 'number' ? a.currentBetAfter : undefined;
        const explicitRaiseTo = a.action === 'raise' && typeof a.amount === 'number' ? a.amount : undefined;
        const raiseTo = explicitRaiseTo ?? betAfter;
        // Forced blinds/antes set the initial currentBet but must NOT count as a raise.
        if (isForced) {
            if (typeof betAfter === 'number')
                currentBet = Math.max(currentBet, betAfter);
            continue;
        }
        if (typeof raiseTo === 'number' && raiseTo > currentBet) {
            raiseCount += 1;
            if (a.playerId === playerId) {
                // PFR: any pre-flop raise (including 3bet/4bet).
                pfr = true;
                if (raiseCount === 2)
                    threeBet = true;
                // Any later raise is 4bet+; ignore for v1.
            }
            currentBet = raiseTo;
        }
        else if (typeof betAfter === 'number') {
            // Keep current bet in sync even on calls/all-ins that don't raise.
            currentBet = Math.max(currentBet, betAfter);
        }
    }
    return { vpip, pfr, threeBet };
}
function didPlayerFold(hand, playerId) {
    return (hand.actions || []).some((a) => a.playerId === playerId && a.action === 'fold');
}
function sawShowdown(hand, playerId) {
    if (hand.reason !== 'showdown')
        return false;
    // Approximation: if player folded at any point, they didn't see showdown.
    return !didPlayerFold(hand, playerId);
}
function wonAtShowdown(hand, playerId) {
    if (!sawShowdown(hand, playerId))
        return false;
    return hand.winners.some((w) => w.playerId === playerId);
}
function getPreflopAggressor(hand) {
    const actions = (hand.actions || [])
        .filter((a) => a.phase === 'pre-flop')
        .slice()
        .sort((a, b) => a.timestamp - b.timestamp);
    let aggressor = null;
    let currentBet = 0;
    for (const a of actions) {
        const isForced = a.action === 'post-blind' || a.action === 'post-ante';
        if (isForced) {
            if (typeof a.currentBetAfter === 'number')
                currentBet = Math.max(currentBet, a.currentBetAfter);
            continue;
        }
        const raiseTo = (a.action === 'raise' && typeof a.amount === 'number' ? a.amount : undefined) ?? a.currentBetAfter;
        if (typeof raiseTo === 'number' && raiseTo > currentBet) {
            currentBet = raiseTo;
            aggressor = a.playerId;
        }
    }
    return aggressor;
}
function computeCbetOnFlop(hand) {
    // Only consider hands that reached flop.
    const hasFlop = (hand.communityCards || []).length >= 3;
    if (!hasFlop)
        return { opp: false, made: false };
    const aggressor = getPreflopAggressor(hand);
    if (!aggressor)
        return { opp: false, made: false };
    // If aggressor folded before flop, no opportunity.
    const foldedPreflop = (hand.actions || []).some((a) => a.phase === 'pre-flop' && a.playerId === aggressor && a.action === 'fold');
    if (foldedPreflop)
        return { opp: false, made: false };
    // Find first flop action that creates a bet (currentBetAfter > 0).
    const flopActions = (hand.actions || [])
        .filter((a) => a.phase === 'flop')
        .slice()
        .sort((a, b) => a.timestamp - b.timestamp);
    const firstBet = flopActions.find((a) => (a.currentBetAfter || 0) > 0);
    if (!firstBet)
        return { opp: true, made: false };
    return { opp: true, made: firstBet.playerId === aggressor };
}
function computeAggressionCounts(hand, playerId) {
    // Only postflop for v1.
    const actions = (hand.actions || [])
        .filter((a) => a.playerId === playerId && a.phase && a.phase !== 'pre-flop' && a.phase !== 'waiting')
        .slice()
        .sort((a, b) => a.timestamp - b.timestamp);
    let aggressive = 0;
    let calls = 0;
    for (const a of actions) {
        if (a.action === 'call')
            calls += 1;
        if (a.action === 'raise')
            aggressive += 1;
        if (a.action === 'all-in') {
            // Count as aggressive only if it sets/raises the table bet.
            if ((a.currentBetAfter || 0) > 0)
                aggressive += 1;
        }
    }
    return { aggressive, calls };
}
class PlayerStatsService {
    constructor(history) {
        this.history = history;
    }
    /**
     * Returns stats for a player over finished hands only, with filters.
     * Also returns the list of games the player played (hands finished) in the requested date range,
     * excluding any `gameId` filter so the client can populate a game picker.
     */
    getMyStats(playerId, query) {
        const sessions = this.history.getPlayerSessions(playerId);
        const contexts = [];
        for (const s of sessions) {
            const g = this.history.getGame(s.gameId);
            if (!g)
                continue;
            const hands = this.history.getHandsForSession(s);
            for (const h of hands) {
                contexts.push({
                    sessionId: s.sessionId,
                    gameId: g.gameId,
                    code: g.code,
                    clubId: g.clubId,
                    variant: g.variant,
                    settings: g.settings,
                    createdAt: g.createdAt,
                    endedAt: g.endedAt,
                    hand: h,
                });
            }
        }
        const from = typeof query.from === 'number' ? query.from : Number.NEGATIVE_INFINITY;
        const to = typeof query.to === 'number' ? query.to : Number.POSITIVE_INFINITY;
        // Build gamesInRange with all non-game filters applied (date + club + variant + depth bucket).
        const contextsInRangeForGames = contexts.filter((c) => c.hand.endedAt >= from && c.hand.endedAt <= to);
        const gamesMap = new Map();
        for (const c of contextsInRangeForGames) {
            if (query.clubId && c.clubId !== query.clubId)
                continue;
            if (query.variant && c.variant !== query.variant)
                continue;
            if (query.depthBucket) {
                const bb = computeEffectiveStackBbForPlayer(c.hand, c.settings, playerId);
                if (bb === null)
                    continue; // no snapshot -> skip from bucketed views
                if (parseDepthBucket(bb) !== query.depthBucket)
                    continue;
            }
            const prev = gamesMap.get(c.gameId);
            if (!prev) {
                gamesMap.set(c.gameId, {
                    gameId: c.gameId,
                    code: c.code,
                    clubId: c.clubId,
                    variant: c.variant,
                    settings: c.settings,
                    createdAt: c.createdAt,
                    endedAt: c.endedAt,
                    handsInRange: 1,
                });
            }
            else {
                prev.handsInRange += 1;
            }
        }
        const gamesInRange = Array.from(gamesMap.values()).sort((a, b) => b.createdAt - a.createdAt);
        // Now apply full filters (including gameId/code) for the stats computation.
        const filtered = contexts.filter((c) => c.hand.endedAt >= from && c.hand.endedAt <= to);
        const fullyFiltered = filtered.filter((c) => {
            if (query.clubId && c.clubId !== query.clubId)
                return false;
            if (query.variant && c.variant !== query.variant)
                return false;
            if (query.gameId && c.gameId !== query.gameId)
                return false;
            if (query.code && c.code.toUpperCase() !== query.code.toUpperCase())
                return false;
            if (query.depthBucket) {
                const bb = computeEffectiveStackBbForPlayer(c.hand, c.settings, playerId);
                if (bb === null)
                    return false;
                if (parseDepthBucket(bb) !== query.depthBucket)
                    return false;
            }
            return true;
        });
        let totalHands = 0;
        let handsWon = 0;
        let totalWinnings = 0;
        let bbSum = 0;
        let bbHands = 0;
        let vpipCount = 0;
        let pfrCount = 0;
        let threeBetCount = 0;
        let preflopHandsCounted = 0;
        let wtsdCount = 0;
        let wsdCount = 0;
        let showdownHands = 0;
        let aggActions = 0;
        let callActions = 0;
        let cbetOpp = 0;
        let cbetMade = 0;
        const preflopByPos = new Map();
        for (const c of fullyFiltered) {
            const hand = c.hand;
            totalHands += 1;
            if (hand.winners.some((w) => w.playerId === playerId))
                handsWon += 1;
            const net = getNetWinningsForHand(hand, playerId);
            if (typeof net === 'number')
                totalWinnings += net;
            // bb/100: only when we have net and bigBlind.
            if (typeof net === 'number' && c.settings.bigBlind > 0) {
                bbSum += net / c.settings.bigBlind;
                bbHands += 1;
            }
            // Preflop stats require per-action phase info; if missing, skip this hand for those metrics.
            const hasPreflopPhases = (hand.actions || []).some((a) => a.phase === 'pre-flop');
            if (hasPreflopPhases) {
                const flags = computePreflopFlags(hand, playerId);
                if (flags.vpip)
                    vpipCount += 1;
                if (flags.pfr)
                    pfrCount += 1;
                if (flags.threeBet)
                    threeBetCount += 1;
                preflopHandsCounted += 1;
            }
            // Positional preflop charts require both phase info and a table snapshot.
            const pos = computePlayerPreflopPosition(hand, playerId);
            if (pos && hasPreflopPhases) {
                const pf = computePreflopOpportunitiesAndActions(hand, playerId);
                if (pf.hadDecision) {
                    const prev = preflopByPos.get(pos) || {
                        position: pos,
                        hands: 0,
                        pfrCount: 0,
                        openOpps: 0,
                        openRaiseCount: 0,
                        threeBetOpps: 0,
                        threeBetCount: 0,
                        fourBetOpps: 0,
                        fourBetCount: 0,
                    };
                    prev.hands += 1;
                    if (pf.pfr)
                        prev.pfrCount += 1;
                    if (pf.openOpp)
                        prev.openOpps += 1;
                    if (pf.openRaise)
                        prev.openRaiseCount += 1;
                    if (pf.threeBetOpp)
                        prev.threeBetOpps += 1;
                    if (pf.threeBet)
                        prev.threeBetCount += 1;
                    if (pf.fourBetOpp)
                        prev.fourBetOpps += 1;
                    if (pf.fourBet)
                        prev.fourBetCount += 1;
                    preflopByPos.set(pos, prev);
                }
            }
            // Showdown stats
            if (sawShowdown(hand, playerId)) {
                showdownHands += 1;
                wtsdCount += 1;
                if (wonAtShowdown(hand, playerId))
                    wsdCount += 1;
            }
            // Aggression
            const agg = computeAggressionCounts(hand, playerId);
            aggActions += agg.aggressive;
            callActions += agg.calls;
            // C-bet opportunity is evaluated per hand, not per player.
            // Only count c-bet if the player is the preflop aggressor.
            const aggressor = getPreflopAggressor(hand);
            if (aggressor === playerId) {
                const cbet = computeCbetOnFlop(hand);
                if (cbet.opp)
                    cbetOpp += 1;
                if (cbet.made)
                    cbetMade += 1;
            }
        }
        const winPercentage = totalHands ? (handsWon / totalHands) * 100 : 0;
        const bb100 = bbHands ? (bbSum / bbHands) * 100 : null;
        const summary = {
            playerId,
            totalHands,
            handsWon,
            winPercentage,
            totalWinnings,
            bb100,
            vpip: preflopHandsCounted ? (vpipCount / preflopHandsCounted) * 100 : 0,
            pfr: preflopHandsCounted ? (pfrCount / preflopHandsCounted) * 100 : 0,
            threeBetPercentage: preflopHandsCounted ? (threeBetCount / preflopHandsCounted) * 100 : 0,
            wtsd: totalHands ? (wtsdCount / totalHands) * 100 : 0,
            wsd: showdownHands ? (wsdCount / showdownHands) * 100 : 0,
            aggressionFactor: callActions === 0 ? (aggActions > 0 ? aggActions : 0) : aggActions / callActions,
            cbetPercentage: cbetOpp ? (cbetMade / cbetOpp) * 100 : 0,
        };
        const positionOrder = [
            'UTG',
            'UTG+1',
            'UTG+2',
            'LJ',
            'HJ',
            'CO',
            'BTN',
            'SB',
            'BB',
            'BTN/SB',
        ];
        const preflop = {
            byPosition: Array.from(preflopByPos.values()).sort((a, b) => positionOrder.indexOf(a.position) - positionOrder.indexOf(b.position)),
        };
        // Versus-opponents breakdown (hands where opponent was dealt in / seated at hand start).
        const oppMap = new Map();
        for (const c of fullyFiltered) {
            const stacks = c.hand.stacksStartByPlayerId;
            if (!stacks)
                continue;
            if (typeof stacks[playerId] !== 'number')
                continue;
            const opponentIds = Object.keys(stacks).filter((pid) => pid !== playerId);
            if (!opponentIds.length)
                continue;
            const net = getNetWinningsForHand(c.hand, playerId);
            const bb = typeof net === 'number' && c.settings.bigBlind > 0 ? net / c.settings.bigBlind : null;
            // Showdown participation for vs metrics: both players did not fold and hand ended at showdown.
            const playerSaw = sawShowdown(c.hand, playerId);
            const playerWon = wonAtShowdown(c.hand, playerId);
            for (const oppId of opponentIds) {
                const e = oppMap.get(oppId) || { hands: 0, winnings: 0, bbSum: 0, bbHands: 0, sdTogether: 0, sdWon: 0 };
                e.hands += 1;
                if (typeof net === 'number')
                    e.winnings += net;
                if (typeof bb === 'number') {
                    e.bbSum += bb;
                    e.bbHands += 1;
                }
                const oppSaw = sawShowdown(c.hand, oppId);
                const oppWon = wonAtShowdown(c.hand, oppId);
                if (playerSaw && oppSaw) {
                    e.sdTogether += 1;
                    // Count a "win vs opponent" only if player won and opponent did not (ties don't count).
                    if (playerWon && !oppWon)
                        e.sdWon += 1;
                }
                oppMap.set(oppId, e);
            }
        }
        const vsOpponents = Array.from(oppMap.entries())
            .map(([opponentId, e]) => ({
            opponentId,
            handsTogether: e.hands,
            totalWinnings: e.winnings,
            bb100: e.bbHands ? (e.bbSum / e.bbHands) * 100 : null,
            showdownsTogether: e.sdTogether,
            showdownsWon: e.sdWon,
            wsdVsOpponent: e.sdTogether ? (e.sdWon / e.sdTogether) * 100 : 0,
        }))
            .sort((a, b) => b.handsTogether - a.handsTogether);
        return { summary, gamesInRange, vsOpponents, preflop };
    }
}
exports.PlayerStatsService = PlayerStatsService;
exports.playerStatsService = new PlayerStatsService(gameHistoryService_1.gameHistoryService);
