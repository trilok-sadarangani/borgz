"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createDeck = createDeck;
exports.shuffleDeck = shuffleDeck;
exports.dealCard = dealCard;
exports.dealCards = dealCards;
const SUITS = ['hearts', 'diamonds', 'clubs', 'spades'];
const RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
/**
 * Creates a standard 52-card deck
 */
function createDeck() {
    const deck = [];
    for (const suit of SUITS) {
        for (const rank of RANKS) {
            deck.push({ suit, rank });
        }
    }
    return deck;
}
/**
 * Shuffles a deck using Fisher-Yates algorithm
 */
function shuffleDeck(deck) {
    const shuffled = [...deck];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}
/**
 * Deals a single card from the deck
 */
function dealCard(deck) {
    if (deck.length === 0) {
        throw new Error('Cannot deal from empty deck');
    }
    const card = deck[0];
    const remainingDeck = deck.slice(1);
    return { card, remainingDeck };
}
/**
 * Deals multiple cards from the deck
 */
function dealCards(deck, count) {
    if (deck.length < count) {
        throw new Error(`Not enough cards in deck. Need ${count}, have ${deck.length}`);
    }
    const cards = deck.slice(0, count);
    const remainingDeck = deck.slice(count);
    return { cards, remainingDeck };
}
