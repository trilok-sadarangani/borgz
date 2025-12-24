import { createDeck, shuffleDeck, dealCard, dealCards } from '../cards';
import { Card } from '../../../types';

describe('Card Utilities', () => {
  describe('createDeck', () => {
    it('should create a standard 52-card deck', () => {
      const deck = createDeck();
      expect(deck).toHaveLength(52);
    });

    it('should contain all 4 suits', () => {
      const deck = createDeck();
      const suits = new Set(deck.map((card) => card.suit));
      expect(suits.size).toBe(4);
      expect(suits.has('hearts')).toBe(true);
      expect(suits.has('diamonds')).toBe(true);
      expect(suits.has('clubs')).toBe(true);
      expect(suits.has('spades')).toBe(true);
    });

    it('should contain all 13 ranks', () => {
      const deck = createDeck();
      const ranks = new Set(deck.map((card) => card.rank));
      expect(ranks.size).toBe(13);
    });

    it('should have exactly 13 cards of each suit', () => {
      const deck = createDeck();
      const hearts = deck.filter((card) => card.suit === 'hearts');
      const diamonds = deck.filter((card) => card.suit === 'diamonds');
      const clubs = deck.filter((card) => card.suit === 'clubs');
      const spades = deck.filter((card) => card.suit === 'spades');

      expect(hearts).toHaveLength(13);
      expect(diamonds).toHaveLength(13);
      expect(clubs).toHaveLength(13);
      expect(spades).toHaveLength(13);
    });
  });

  describe('shuffleDeck', () => {
    it('should return a deck with the same number of cards', () => {
      const deck = createDeck();
      const shuffled = shuffleDeck(deck);
      expect(shuffled).toHaveLength(52);
    });

    it('should not modify the original deck', () => {
      const deck = createDeck();
      const originalOrder = [...deck];
      shuffleDeck(deck);
      expect(deck).toEqual(originalOrder);
    });

    it('should return a new deck array', () => {
      const deck = createDeck();
      const shuffled = shuffleDeck(deck);
      expect(shuffled).not.toBe(deck);
    });

    it('should contain all the same cards', () => {
      const deck = createDeck();
      const shuffled = shuffleDeck(deck);

      // Sort both decks by suit and rank for comparison
      const sortCards = (a: Card, b: Card) => {
        if (a.suit !== b.suit) return a.suit.localeCompare(b.suit);
        return a.rank.localeCompare(b.rank);
      };

      const sortedOriginal = [...deck].sort(sortCards);
      const sortedShuffled = [...shuffled].sort(sortCards);

      expect(sortedShuffled).toEqual(sortedOriginal);
    });
  });

  describe('dealCard', () => {
    it('should deal one card from the deck', () => {
      const deck = createDeck();
      const { card, remainingDeck } = dealCard(deck);

      expect(card).toBeDefined();
      expect(card.suit).toBeDefined();
      expect(card.rank).toBeDefined();
      expect(remainingDeck).toHaveLength(51);
    });

    it('should deal the first card from the deck', () => {
      const deck = createDeck();
      const firstCard = deck[0];
      const { card } = dealCard(deck);

      expect(card).toEqual(firstCard);
    });

    it('should throw error when deck is empty', () => {
      const deck: Card[] = [];
      expect(() => dealCard(deck)).toThrow('Cannot deal from empty deck');
    });
  });

  describe('dealCards', () => {
    it('should deal multiple cards from the deck', () => {
      const deck = createDeck();
      const { cards, remainingDeck } = dealCards(deck, 5);

      expect(cards).toHaveLength(5);
      expect(remainingDeck).toHaveLength(47);
    });

    it('should deal the first N cards from the deck', () => {
      const deck = createDeck();
      const firstFive = deck.slice(0, 5);
      const { cards } = dealCards(deck, 5);

      expect(cards).toEqual(firstFive);
    });

    it('should throw error when not enough cards', () => {
      const deck = createDeck();
      expect(() => dealCards(deck, 100)).toThrow('Not enough cards in deck');
    });

    it('should handle dealing all cards', () => {
      const deck = createDeck();
      const { cards, remainingDeck } = dealCards(deck, 52);

      expect(cards).toHaveLength(52);
      expect(remainingDeck).toHaveLength(0);
    });
  });
});

