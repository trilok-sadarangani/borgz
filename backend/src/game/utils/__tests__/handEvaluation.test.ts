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
  });
});

