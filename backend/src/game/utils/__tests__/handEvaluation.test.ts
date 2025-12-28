import { evaluateHand, compareHands, HandResult } from '../handEvaluation';
import { Card } from '../../../types';

describe('Hand Evaluation', () => {
  describe('Royal Flush', () => {
    it('should identify a royal flush', () => {
      const holeCards: Card[] = [
        { suit: 'hearts', rank: 'A' },
        { suit: 'hearts', rank: 'K' },
      ];
      const communityCards: Card[] = [
        { suit: 'hearts', rank: 'Q' },
        { suit: 'hearts', rank: 'J' },
        { suit: 'hearts', rank: '10' },
        { suit: 'diamonds', rank: '2' },
        { suit: 'clubs', rank: '3' },
      ];

      const result = evaluateHand(holeCards, communityCards);
      expect(result.rank).toBe('royal-flush');
      expect(result.value).toBe(10);
    });
  });

  describe('Straight Flush', () => {
    it('should identify a straight flush', () => {
      const holeCards: Card[] = [
        { suit: 'spades', rank: '9' },
        { suit: 'spades', rank: '8' },
      ];
      const communityCards: Card[] = [
        { suit: 'spades', rank: '7' },
        { suit: 'spades', rank: '6' },
        { suit: 'spades', rank: '5' },
        { suit: 'hearts', rank: '2' },
        { suit: 'diamonds', rank: '3' },
      ];

      const result = evaluateHand(holeCards, communityCards);
      expect(result.rank).toBe('straight-flush');
      expect(result.value).toBe(9);
    });

    it('should identify a wheel straight flush (A-2-3-4-5 same suit)', () => {
      const holeCards: Card[] = [
        { suit: 'spades', rank: 'A' },
        { suit: 'spades', rank: '2' },
      ];
      const communityCards: Card[] = [
        { suit: 'spades', rank: '3' },
        { suit: 'spades', rank: '4' },
        { suit: 'spades', rank: '5' },
        { suit: 'hearts', rank: 'K' },
        { suit: 'diamonds', rank: 'Q' },
      ];

      const result = evaluateHand(holeCards, communityCards);
      expect(result.rank).toBe('straight-flush');
      expect(result.value).toBe(9);
      expect(result.kickers[0]).toBe(5);
    });
  });

  describe('Four of a Kind', () => {
    it('should identify four of a kind', () => {
      const holeCards: Card[] = [
        { suit: 'hearts', rank: 'A' },
        { suit: 'diamonds', rank: 'A' },
      ];
      const communityCards: Card[] = [
        { suit: 'clubs', rank: 'A' },
        { suit: 'spades', rank: 'A' },
        { suit: 'hearts', rank: 'K' },
        { suit: 'diamonds', rank: '2' },
        { suit: 'clubs', rank: '3' },
      ];

      const result = evaluateHand(holeCards, communityCards);
      expect(result.rank).toBe('four-of-a-kind');
      expect(result.value).toBe(8);
    });
  });

  describe('Full House', () => {
    it('should identify a full house', () => {
      const holeCards: Card[] = [
        { suit: 'hearts', rank: 'K' },
        { suit: 'diamonds', rank: 'K' },
      ];
      const communityCards: Card[] = [
        { suit: 'clubs', rank: 'K' },
        { suit: 'spades', rank: 'Q' },
        { suit: 'hearts', rank: 'Q' },
        { suit: 'diamonds', rank: '2' },
        { suit: 'clubs', rank: '3' },
      ];

      const result = evaluateHand(holeCards, communityCards);
      expect(result.rank).toBe('full-house');
      expect(result.value).toBe(7);
    });
  });

  describe('Flush', () => {
    it('should identify a flush', () => {
      const holeCards: Card[] = [
        { suit: 'hearts', rank: 'A' },
        { suit: 'hearts', rank: 'K' },
      ];
      const communityCards: Card[] = [
        { suit: 'hearts', rank: 'Q' },
        { suit: 'hearts', rank: 'J' },
        { suit: 'hearts', rank: '9' },
        { suit: 'diamonds', rank: '2' },
        { suit: 'clubs', rank: '3' },
      ];

      const result = evaluateHand(holeCards, communityCards);
      expect(result.rank).toBe('flush');
      expect(result.value).toBe(6);
    });
  });

  describe('Straight', () => {
    it('should identify a straight', () => {
      const holeCards: Card[] = [
        { suit: 'hearts', rank: '10' },
        { suit: 'diamonds', rank: '9' },
      ];
      const communityCards: Card[] = [
        { suit: 'clubs', rank: '8' },
        { suit: 'spades', rank: '7' },
        { suit: 'hearts', rank: '6' },
        { suit: 'diamonds', rank: '2' },
        { suit: 'clubs', rank: '3' },
      ];

      const result = evaluateHand(holeCards, communityCards);
      expect(result.rank).toBe('straight');
      expect(result.value).toBe(5);
    });

    it('should identify an ace-low straight (wheel)', () => {
      const holeCards: Card[] = [
        { suit: 'hearts', rank: 'A' },
        { suit: 'diamonds', rank: '2' },
      ];
      const communityCards: Card[] = [
        { suit: 'clubs', rank: '3' },
        { suit: 'spades', rank: '4' },
        { suit: 'hearts', rank: '5' },
        { suit: 'diamonds', rank: 'K' },
        { suit: 'clubs', rank: 'Q' },
      ];

      const result = evaluateHand(holeCards, communityCards);
      expect(result.rank).toBe('straight');
      expect(result.value).toBe(5);
      expect(result.kickers[0]).toBe(5); // Ace-low straight has kicker value 5
    });

    it('should prefer the highest straight when duplicates exist in the 7 cards', () => {
      // Cards contain both A-2-3-4-5 and 2-3-4-5-6 possibilities.
      const holeCards: Card[] = [
        { suit: 'hearts', rank: 'A' },
        { suit: 'diamonds', rank: '6' },
      ];
      const communityCards: Card[] = [
        { suit: 'clubs', rank: '2' },
        { suit: 'spades', rank: '3' },
        { suit: 'hearts', rank: '4' },
        { suit: 'diamonds', rank: '5' },
        { suit: 'clubs', rank: '2' }, // duplicate rank in 7-card set (different suit)
      ];

      const result = evaluateHand(holeCards, communityCards);
      expect(result.rank).toBe('straight');
      expect(result.kickers[0]).toBe(6); // should pick 6-high straight, not the wheel
    });
  });

  describe('Three of a Kind', () => {
    it('should identify three of a kind', () => {
      const holeCards: Card[] = [
        { suit: 'hearts', rank: 'Q' },
        { suit: 'diamonds', rank: 'Q' },
      ];
      const communityCards: Card[] = [
        { suit: 'clubs', rank: 'Q' },
        { suit: 'spades', rank: 'K' },
        { suit: 'hearts', rank: 'J' },
        { suit: 'diamonds', rank: '2' },
        { suit: 'clubs', rank: '3' },
      ];

      const result = evaluateHand(holeCards, communityCards);
      expect(result.rank).toBe('three-of-a-kind');
      expect(result.value).toBe(4);
    });
  });

  describe('Two Pair', () => {
    it('should identify two pair', () => {
      const holeCards: Card[] = [
        { suit: 'hearts', rank: 'J' },
        { suit: 'diamonds', rank: 'J' },
      ];
      const communityCards: Card[] = [
        { suit: 'clubs', rank: '10' },
        { suit: 'spades', rank: '10' },
        { suit: 'hearts', rank: 'K' },
        { suit: 'diamonds', rank: '2' },
        { suit: 'clubs', rank: '3' },
      ];

      const result = evaluateHand(holeCards, communityCards);
      expect(result.rank).toBe('two-pair');
      expect(result.value).toBe(3);
    });
  });

  describe('Pair', () => {
    it('should identify a pair', () => {
      const holeCards: Card[] = [
        { suit: 'hearts', rank: 'A' },
        { suit: 'diamonds', rank: 'A' },
      ];
      const communityCards: Card[] = [
        { suit: 'clubs', rank: 'K' },
        { suit: 'spades', rank: 'Q' },
        { suit: 'hearts', rank: 'J' },
        { suit: 'diamonds', rank: '2' },
        { suit: 'clubs', rank: '3' },
      ];

      const result = evaluateHand(holeCards, communityCards);
      expect(result.rank).toBe('pair');
      expect(result.value).toBe(2);
    });
  });

  describe('High Card', () => {
    it('should identify high card', () => {
      const holeCards: Card[] = [
        { suit: 'hearts', rank: 'A' },
        { suit: 'diamonds', rank: 'K' },
      ];
      const communityCards: Card[] = [
        { suit: 'clubs', rank: 'Q' },
        { suit: 'spades', rank: 'J' },
        { suit: 'hearts', rank: '9' },
        { suit: 'diamonds', rank: '2' },
        { suit: 'clubs', rank: '3' },
      ];

      const result = evaluateHand(holeCards, communityCards);
      expect(result.rank).toBe('high-card');
      expect(result.value).toBe(1);
    });
  });

  describe('Edge Cases and Best 5-Card Selection', () => {
    it('should select best hand when multiple possibilities exist', () => {
      // Player has pair of Aces, but board has flush
      const holeCards: Card[] = [
        { suit: 'hearts', rank: 'A' },
        { suit: 'diamonds', rank: 'A' },
      ];
      const communityCards: Card[] = [
        { suit: 'hearts', rank: 'K' },
        { suit: 'hearts', rank: 'Q' },
        { suit: 'hearts', rank: 'J' },
        { suit: 'hearts', rank: '9' },
        { suit: 'clubs', rank: '2' },
      ];

      const result = evaluateHand(holeCards, communityCards);
      // Should choose flush over pair (Ace of hearts makes flush)
      expect(result.rank).toBe('flush');
      expect(result.value).toBe(6);
    });

    it('should select best straight when multiple straights exist', () => {
      const holeCards: Card[] = [
        { suit: 'hearts', rank: '9' },
        { suit: 'diamonds', rank: '8' },
      ];
      const communityCards: Card[] = [
        { suit: 'clubs', rank: '7' },
        { suit: 'spades', rank: '6' },
        { suit: 'hearts', rank: '5' },
        { suit: 'diamonds', rank: '4' },
        { suit: 'clubs', rank: '3' },
      ];

      const result = evaluateHand(holeCards, communityCards);
      expect(result.rank).toBe('straight');
      // Should choose 9-high straight over 6-high
      expect(result.kickers[0]).toBe(9);
    });

    it('should handle pair on board vs pair in hand', () => {
      // Pair on board (lower) vs pair in hand (higher)
      const holeCards: Card[] = [
        { suit: 'hearts', rank: 'K' },
        { suit: 'diamonds', rank: 'K' },
      ];
      const communityCards: Card[] = [
        { suit: 'clubs', rank: '5' },
        { suit: 'spades', rank: '5' },
        { suit: 'hearts', rank: 'Q' },
        { suit: 'diamonds', rank: 'J' },
        { suit: 'clubs', rank: '10' },
      ];

      const result = evaluateHand(holeCards, communityCards);
      expect(result.rank).toBe('two-pair');
      // Should use both pairs (Kings and 5s)
      expect(result.kickers[0]).toBe(13); // Kings
      expect(result.kickers[1]).toBe(5); // 5s
    });

    it('should correctly evaluate when only 5 cards are available', () => {
      const holeCards: Card[] = [
        { suit: 'hearts', rank: 'A' },
        { suit: 'diamonds', rank: 'K' },
      ];
      const communityCards: Card[] = [
        { suit: 'clubs', rank: 'Q' },
        { suit: 'spades', rank: 'J' },
        { suit: 'hearts', rank: '10' },
      ];

      const result = evaluateHand(holeCards, communityCards);
      expect(result.rank).toBe('straight');
      expect(result.cards).toHaveLength(5);
    });

    it('should throw error when less than 5 cards available', () => {
      const holeCards: Card[] = [
        { suit: 'hearts', rank: 'A' },
        { suit: 'diamonds', rank: 'K' },
      ];
      const communityCards: Card[] = [
        { suit: 'clubs', rank: 'Q' },
        { suit: 'spades', rank: 'J' },
      ];

      expect(() => evaluateHand(holeCards, communityCards)).toThrow('Need at least 5 cards');
    });

    it('should recognize when the board plays (no improvement from hole cards)', () => {
      // Board is a straight; hole cards don't improve.
      const board: Card[] = [
        { suit: 'hearts', rank: 'A' },
        { suit: 'diamonds', rank: 'K' },
        { suit: 'clubs', rank: 'Q' },
        { suit: 'spades', rank: 'J' },
        { suit: 'hearts', rank: '10' },
      ];
      const p1 = evaluateHand(
        [
          { suit: 'clubs', rank: '2' },
          { suit: 'diamonds', rank: '3' },
        ],
        board
      );
      const p2 = evaluateHand(
        [
          { suit: 'clubs', rank: '4' },
          { suit: 'diamonds', rank: '5' },
        ],
        board
      );

      expect(p1.rank).toBe('straight');
      expect(p2.rank).toBe('straight');
      expect(compareHands(p1, p2)).toBe(0);
    });

    it('should pick the best full house when two trips are present', () => {
      // Board: QQQJJ (full house queens over jacks on board)
      // Player holds JJ, making JJJQQ which should beat QQQJJ.
      const holeCards: Card[] = [
        { suit: 'hearts', rank: 'J' },
        { suit: 'diamonds', rank: 'J' },
      ];
      const communityCards: Card[] = [
        { suit: 'clubs', rank: 'Q' },
        { suit: 'spades', rank: 'Q' },
        { suit: 'hearts', rank: 'Q' },
        { suit: 'diamonds', rank: 'J' },
        { suit: 'clubs', rank: '2' },
      ];

      const result = evaluateHand(holeCards, communityCards);
      expect(result.rank).toBe('full-house');
      // kickers: [tripRank, pairRank]; higher trips wins => QQQJJ
      expect(result.kickers[0]).toBe(12);
      expect(result.kickers[1]).toBe(11);
    });
  });

  describe('compareHands', () => {
    it('should correctly compare hand ranks', () => {
      const royalFlush: HandResult = {
        rank: 'royal-flush',
        value: 10,
        cards: [],
        kickers: [],
      };
      const pair: HandResult = {
        rank: 'pair',
        value: 2,
        cards: [],
        kickers: [14, 13, 12],
      };

      expect(compareHands(royalFlush, pair)).toBeGreaterThan(0);
      expect(compareHands(pair, royalFlush)).toBeLessThan(0);
    });

    it('should compare kickers when ranks are equal', () => {
      const pairAces: HandResult = {
        rank: 'pair',
        value: 2,
        cards: [],
        kickers: [14, 13, 12],
      };
      const pairKings: HandResult = {
        rank: 'pair',
        value: 2,
        cards: [],
        kickers: [13, 12, 11],
      };

      expect(compareHands(pairAces, pairKings)).toBeGreaterThan(0);
    });

    it('should return 0 for identical hands', () => {
      const hand1: HandResult = {
        rank: 'pair',
        value: 2,
        cards: [],
        kickers: [14, 13, 12],
      };
      const hand2: HandResult = {
        rank: 'pair',
        value: 2,
        cards: [],
        kickers: [14, 13, 12],
      };

      expect(compareHands(hand1, hand2)).toBe(0);
    });

    it('should compare full houses correctly', () => {
      const fullHouseKingsOverQueens: HandResult = {
        rank: 'full-house',
        value: 7,
        cards: [],
        kickers: [13, 12], // Kings over Queens
      };
      const fullHouseQueensOverKings: HandResult = {
        rank: 'full-house',
        value: 7,
        cards: [],
        kickers: [12, 13], // Queens over Kings
      };

      // Kings over Queens beats Queens over Kings
      expect(compareHands(fullHouseKingsOverQueens, fullHouseQueensOverKings)).toBeGreaterThan(0);
    });

    it('should compare two pairs correctly', () => {
      const twoPairAcesAndKings: HandResult = {
        rank: 'two-pair',
        value: 3,
        cards: [],
        kickers: [14, 13, 12], // Aces, Kings, Queen kicker
      };
      const twoPairAcesAndQueens: HandResult = {
        rank: 'two-pair',
        value: 3,
        cards: [],
        kickers: [14, 12, 13], // Aces, Queens, King kicker
      };

      // Aces and Kings beats Aces and Queens
      expect(compareHands(twoPairAcesAndKings, twoPairAcesAndQueens)).toBeGreaterThan(0);
    });

    it('should compare three of a kind with different kickers', () => {
      const tripsAcesWithKing: HandResult = {
        rank: 'three-of-a-kind',
        value: 4,
        cards: [],
        kickers: [14, 13, 12], // Aces, King, Queen
      };
      const tripsAcesWithQueen: HandResult = {
        rank: 'three-of-a-kind',
        value: 4,
        cards: [],
        kickers: [14, 12, 11], // Aces, Queen, Jack
      };

      expect(compareHands(tripsAcesWithKing, tripsAcesWithQueen)).toBeGreaterThan(0);
    });

    it('should compare straights correctly', () => {
      const straightKingHigh: HandResult = {
        rank: 'straight',
        value: 5,
        cards: [],
        kickers: [13], // King-high straight
      };
      const straightQueenHigh: HandResult = {
        rank: 'straight',
        value: 5,
        cards: [],
        kickers: [12], // Queen-high straight
      };

      expect(compareHands(straightKingHigh, straightQueenHigh)).toBeGreaterThan(0);
    });

    it('should compare flushes correctly by high card', () => {
      const flushAceHigh: HandResult = {
        rank: 'flush',
        value: 6,
        cards: [],
        kickers: [14, 13, 12, 11, 9], // Ace-high flush
      };
      const flushKingHigh: HandResult = {
        rank: 'flush',
        value: 6,
        cards: [],
        kickers: [13, 12, 11, 10, 9], // King-high flush
      };

      expect(compareHands(flushAceHigh, flushKingHigh)).toBeGreaterThan(0);
    });

    it('should compare high cards correctly', () => {
      const aceHigh: HandResult = {
        rank: 'high-card',
        value: 1,
        cards: [],
        kickers: [14, 13, 12, 11, 9],
      };
      const kingHigh: HandResult = {
        rank: 'high-card',
        value: 1,
        cards: [],
        kickers: [13, 12, 11, 10, 9],
      };

      expect(compareHands(aceHigh, kingHigh)).toBeGreaterThan(0);
    });

    it('should handle different length kickers', () => {
      const hand1: HandResult = {
        rank: 'pair',
        value: 2,
        cards: [],
        kickers: [14, 13, 12],
      };
      const hand2: HandResult = {
        rank: 'pair',
        value: 2,
        cards: [],
        kickers: [14, 13, 12, 11],
      };

      // Should compare up to the minimum length
      expect(compareHands(hand1, hand2)).toBeLessThan(0);
    });
  });
});

