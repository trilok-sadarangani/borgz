"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.evaluateHand = evaluateHand;
exports.compareHands = compareHands;
const RANK_VALUES = {
    '2': 2,
    '3': 3,
    '4': 4,
    '5': 5,
    '6': 6,
    '7': 7,
    '8': 8,
    '9': 9,
    '10': 10,
    'J': 11,
    'Q': 12,
    'K': 13,
    'A': 14,
};
/**
 * Evaluates the best 5-card hand from 7 cards (2 hole + 5 community)
 */
function evaluateHand(holeCards, communityCards) {
    const allCards = [...holeCards, ...communityCards];
    if (allCards.length < 5) {
        throw new Error('Need at least 5 cards to evaluate hand');
    }
    // Generate all possible 5-card combinations
    const combinations = getCombinations(allCards, 5);
    let bestHand = null;
    for (const combo of combinations) {
        const result = evaluateFiveCards(combo);
        if (!bestHand || compareHands(result, bestHand) > 0) {
            bestHand = result;
        }
    }
    return bestHand;
}
/**
 * Evaluates a 5-card hand
 */
function evaluateFiveCards(cards) {
    if (cards.length !== 5) {
        throw new Error('Must evaluate exactly 5 cards');
    }
    const sorted = sortCardsByRank(cards);
    const ranks = sorted.map((c) => RANK_VALUES[c.rank]);
    const suits = sorted.map((c) => c.suit);
    // Check for flush
    const isFlush = suits.every((suit) => suit === suits[0]);
    // Check for straight
    const isStraight = checkStraight(ranks);
    const isAceLowStraight = checkAceLowStraight(ranks);
    // Royal flush
    if (isFlush && isStraight && ranks[0] === 14 && ranks[4] === 10) {
        return {
            rank: 'royal-flush',
            value: 10,
            cards: sorted,
            kickers: [],
        };
    }
    // Straight flush
    if (isFlush && (isStraight || isAceLowStraight)) {
        return {
            rank: 'straight-flush',
            value: 9,
            cards: sorted,
            kickers: [isAceLowStraight ? 5 : ranks[0]],
        };
    }
    // Count rank occurrences
    const rankCounts = {};
    ranks.forEach((rank) => {
        rankCounts[rank] = (rankCounts[rank] || 0) + 1;
    });
    const counts = Object.values(rankCounts).sort((a, b) => b - a);
    const rankEntries = Object.entries(rankCounts)
        .map(([rank, count]) => ({ rank: parseInt(rank), count }))
        .sort((a, b) => {
        if (b.count !== a.count)
            return b.count - a.count;
        return b.rank - a.rank;
    });
    // Four of a kind
    if (counts[0] === 4) {
        return {
            rank: 'four-of-a-kind',
            value: 8,
            cards: sorted,
            kickers: [rankEntries[0].rank, rankEntries[1].rank],
        };
    }
    // Full house
    if (counts[0] === 3 && counts[1] === 2) {
        return {
            rank: 'full-house',
            value: 7,
            cards: sorted,
            kickers: [rankEntries[0].rank, rankEntries[1].rank],
        };
    }
    // Flush
    if (isFlush) {
        return {
            rank: 'flush',
            value: 6,
            cards: sorted,
            kickers: ranks.reverse(),
        };
    }
    // Straight
    if (isStraight || isAceLowStraight) {
        return {
            rank: 'straight',
            value: 5,
            cards: sorted,
            kickers: [isAceLowStraight ? 5 : ranks[0]],
        };
    }
    // Three of a kind
    if (counts[0] === 3) {
        const kickers = ranks.filter((r) => r !== rankEntries[0].rank).reverse();
        return {
            rank: 'three-of-a-kind',
            value: 4,
            cards: sorted,
            kickers: [rankEntries[0].rank, ...kickers],
        };
    }
    // Two pair
    if (counts[0] === 2 && counts[1] === 2) {
        const pairs = rankEntries.filter((e) => e.count === 2).map((e) => e.rank);
        const kicker = ranks.find((r) => !pairs.includes(r));
        return {
            rank: 'two-pair',
            value: 3,
            cards: sorted,
            kickers: [Math.max(...pairs), Math.min(...pairs), kicker],
        };
    }
    // Pair
    if (counts[0] === 2) {
        const pairRank = rankEntries[0].rank;
        const kickers = ranks.filter((r) => r !== pairRank).reverse();
        return {
            rank: 'pair',
            value: 2,
            cards: sorted,
            kickers: [pairRank, ...kickers],
        };
    }
    // High card
    return {
        rank: 'high-card',
        value: 1,
        cards: sorted,
        kickers: ranks.reverse(),
    };
}
/**
 * Compares two hand results. Returns positive if hand1 > hand2, negative if hand1 < hand2, 0 if equal
 */
function compareHands(hand1, hand2) {
    if (hand1.value !== hand2.value) {
        return hand1.value - hand2.value;
    }
    // Compare kickers
    for (let i = 0; i < Math.max(hand1.kickers.length, hand2.kickers.length); i++) {
        const k1 = hand1.kickers[i] || 0;
        const k2 = hand2.kickers[i] || 0;
        if (k1 !== k2) {
            return k1 - k2;
        }
    }
    return 0;
}
/**
 * Sorts cards by rank (high to low)
 */
function sortCardsByRank(cards) {
    return [...cards].sort((a, b) => RANK_VALUES[b.rank] - RANK_VALUES[a.rank]);
}
/**
 * Checks if ranks form a straight
 */
function checkStraight(ranks) {
    const sorted = [...ranks].sort((a, b) => b - a);
    for (let i = 0; i < sorted.length - 1; i++) {
        if (sorted[i] - sorted[i + 1] !== 1) {
            return false;
        }
    }
    return true;
}
/**
 * Checks for A-2-3-4-5 straight (wheel)
 */
function checkAceLowStraight(ranks) {
    const sorted = [...ranks].sort((a, b) => b - a);
    return (sorted[0] === 14 && // Ace
        sorted[1] === 5 &&
        sorted[2] === 4 &&
        sorted[3] === 3 &&
        sorted[4] === 2);
}
/**
 * Generates all combinations of k elements from array
 */
function getCombinations(array, k) {
    if (k === 0)
        return [[]];
    if (k > array.length)
        return [];
    const combinations = [];
    function combine(start, combo) {
        if (combo.length === k) {
            combinations.push([...combo]);
            return;
        }
        for (let i = start; i < array.length; i++) {
            combo.push(array[i]);
            combine(i + 1, combo);
            combo.pop();
        }
    }
    combine(0, []);
    return combinations;
}
