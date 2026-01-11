// Shared game types between frontend and backend

export type PokerVariant = 'texas-holdem' | 'omaha' | 'omaha-hi-lo';

export type Suit = 'hearts' | 'diamonds' | 'clubs' | 'spades';
export type Rank = '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'A';

export interface Card {
  suit: Suit;
  rank: Rank;
}

export type PlayerAction =
  | 'fold'
  | 'check'
  | 'call'
  | 'raise'
  | 'all-in'
  | 'post-blind'
  | 'post-ante';

export interface GameAction {
  playerId: string;
  action: PlayerAction;
  amount?: number;
  /**
   * Phase/street when the action occurred. Useful for analytics and stats.
   * Older history entries may omit this.
   */
  phase?: GamePhase;
  /**
   * Player's total bet after this action (e.g. after raise/call/all-in).
   * Older history entries may omit this.
   */
  betTo?: number;
  /**
   * Table current bet after this action is applied.
   * Older history entries may omit this.
   */
  currentBetAfter?: number;
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
  /** For now we only support Texas Hold'em in the app UI. */
  smallBlind: number;
  bigBlind: number;
  startingStack: number;
  /** Buy-in / stack range guidance (not enforced yet) */
  stackRange?: { min: number; max: number };
  maxPlayers: number;
  /** Per-turn timer in seconds (base time per decision) */
  turnTimerSeconds?: number;
  /**
   * Extra time bank "packs", e.g. 5 banks of 20 seconds each.
   * Consumed during decision making when needed (future).
   */
  timeBankConfig?: { banks: number; secondsPerBank: number };
  /** Optional ante settings */
  ante?: { type: 'none' | 'ante' | 'bb-ante'; amount: number };
  /** Total game length in minutes (future) */
  gameLengthMinutes?: number;
}

export interface GameState {
  id: string;
  code: string;
  /** Player who "owns"/hosts the table (first player to join, i.e. creator in current flow) */
  hostPlayerId?: string;
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
  /** Populated when a hand ends (fold/showdown) so clients can display winners */
  lastHandResult?: {
    reason: 'fold' | 'showdown';
    winners: Array<{ playerId: string; amount: number }>;
    pot: number;
    endedAt: number;
  };
  createdAt: number;
  updatedAt: number;
}

// Chat types
export interface ChatMessage {
  id: string;
  gameCode: string;
  playerId: string;
  playerName: string;
  message: string;
  timestamp: number;
}
