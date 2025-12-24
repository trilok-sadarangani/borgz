// Shared game types between frontend and backend

export type PokerVariant = 'texas-holdem' | 'omaha' | 'omaha-hi-lo';

export type Suit = 'hearts' | 'diamonds' | 'clubs' | 'spades';
export type Rank = '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'A';

export interface Card {
  suit: Suit;
  rank: Rank;
}

export type PlayerAction = 'fold' | 'check' | 'call' | 'raise' | 'all-in';

export interface GameAction {
  playerId: string;
  action: PlayerAction;
  amount?: number;
  timestamp: number;
}

export type GamePhase = 'waiting' | 'pre-flop' | 'flop' | 'turn' | 'river' | 'showdown' | 'finished';

export interface Player {
  id: string;
  name: string;
  avatar?: string;
  stack: number;
  currentBet: number;
  isActive: boolean;
  isAllIn: boolean;
  hasFolded: boolean;
  position: number;
  cards?: Card[];
}

export interface GameSettings {
  variant: PokerVariant;
  smallBlind: number;
  bigBlind: number;
  startingStack: number;
  maxPlayers: number;
  blindTimer?: number; // minutes
  timeBank?: number; // seconds per player
}

export interface GameState {
  id: string;
  code: string;
  variant: PokerVariant;
  phase: GamePhase;
  players: Player[];
  communityCards: Card[];
  pot: number;
  currentBet: number;
  dealerPosition: number;
  smallBlindPosition: number;
  bigBlindPosition: number;
  activePlayerIndex: number;
  settings: GameSettings;
  history: GameAction[];
  createdAt: number;
  updatedAt: number;
}

