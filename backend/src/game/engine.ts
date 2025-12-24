import { v4 as uuidv4 } from 'uuid';
import {
  GameState,
  Player,
  Card,
  GameSettings,
  PlayerAction,
  GameAction,
} from '../types';
import { createDeck, shuffleDeck, dealCard, dealCards } from './utils/cards';
import { evaluateHand, compareHands, HandResult } from './utils/handEvaluation';
import {
  validateAction,
  processAction,
  calculateMinRaise,
  getNextActivePlayer,
  isBettingRoundComplete,
} from './rules';

export class GameEngine {
  private state: GameState;
  private deck: Card[] = [];
  private lastRaise: number = 0;

  constructor(settings: GameSettings, gameCode: string) {
    this.state = this.initializeGame(settings, gameCode);
  }

  /**
   * Initializes a new game
   */
  private initializeGame(settings: GameSettings, gameCode: string): GameState {
    return {
      id: uuidv4(),
      code: gameCode,
      variant: settings.variant,
      phase: 'waiting',
      players: [],
      communityCards: [],
      pot: 0,
      currentBet: 0,
      dealerPosition: 0,
      smallBlindPosition: 0,
      bigBlindPosition: 0,
      activePlayerIndex: 0,
      settings,
      history: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
  }

  /**
   * Adds a player to the game
   */
  addPlayer(playerId: string, name: string, avatar?: string): void {
    if (this.state.players.length >= this.state.settings.maxPlayers) {
      throw new Error('Game is full');
    }

    if (this.state.phase !== 'waiting') {
      throw new Error('Cannot add players after game has started');
    }

    const existingPlayer = this.state.players.find((p: Player) => p.id === playerId);
    if (existingPlayer) {
      throw new Error('Player already in game');
    }

    const player: Player = {
      id: playerId,
      name,
      avatar,
      stack: this.state.settings.startingStack,
      currentBet: 0,
      isActive: true,
      isAllIn: false,
      hasFolded: false,
      position: this.state.players.length,
    };

    this.state.players.push(player);
    this.state.updatedAt = Date.now();
  }

  /**
   * Removes a player from the game
   */
  removePlayer(playerId: string): void {
    if (this.state.phase !== 'waiting') {
      throw new Error('Cannot remove players during active game');
    }

    this.state.players = this.state.players.filter((p: Player) => p.id !== playerId);
    this.state.updatedAt = Date.now();
  }

  /**
   * Starts the game (deals cards, posts blinds)
   */
  startGame(): void {
    if (this.state.players.length < 2) {
      throw new Error('Need at least 2 players to start');
    }

    if (this.state.phase !== 'waiting') {
      throw new Error('Game already started');
    }

    // Initialize deck
    this.deck = shuffleDeck(createDeck());

    // Set positions
    this.updatePositions();

    // Post blinds
    this.postBlinds();

    // Deal hole cards
    this.dealHoleCards();

    // Start pre-flop betting
    this.state.phase = 'pre-flop';
    this.state.activePlayerIndex = this.getFirstToAct();
    this.state.updatedAt = Date.now();
  }

  /**
   * Processes a player action
   */
  processPlayerAction(playerId: string, action: PlayerAction, amount?: number): void {
    const player = this.state.players.find((p: Player) => p.id === playerId);
    if (!player) {
      throw new Error('Player not found');
    }

    if (this.state.players[this.state.activePlayerIndex].id !== playerId) {
      throw new Error('Not your turn');
    }

    const minRaise = calculateMinRaise(
      this.state.currentBet,
      this.lastRaise,
      this.state.settings.bigBlind
    );

    // Validate action
    const validation = validateAction(player, action, amount, this.state.currentBet, minRaise);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    // Process action
    const result = processAction(player, action, amount, this.state.currentBet, minRaise);

    // Update player state
    player.currentBet = result.newBet;
    player.stack -= result.chipsCommitted;
    player.isAllIn = result.isAllIn;

    if (action === 'fold') {
      player.hasFolded = true;
    }

    // Update game state
    if (result.chipsCommitted > 0) {
      this.state.pot += result.chipsCommitted;
    }

    if (action === 'raise' && amount) {
      this.lastRaise = amount - this.state.currentBet;
      this.state.currentBet = amount;
    } else if (action === 'call' || (action === 'raise' && result.isAllIn)) {
      this.state.currentBet = Math.max(this.state.currentBet, result.newBet);
    }

    // Record action
    const gameAction: GameAction = {
      playerId,
      action,
      amount,
      timestamp: Date.now(),
    };
    this.state.history.push(gameAction);

    // Move to next player or next phase
    if (isBettingRoundComplete(this.state.players, this.state.currentBet, this.state.activePlayerIndex)) {
      this.advancePhase();
    } else {
      this.state.activePlayerIndex = getNextActivePlayer(
        this.state.players,
        this.state.activePlayerIndex,
        this.state.dealerPosition
      );
    }

    this.state.updatedAt = Date.now();
  }

  /**
   * Advances to the next game phase
   */
  private advancePhase(): void {
    // Reset betting state
    this.state.players.forEach((p: Player) => {
      p.currentBet = 0;
    });
    this.state.currentBet = 0;
    this.lastRaise = 0;

    switch (this.state.phase) {
      case 'pre-flop':
        this.dealFlop();
        this.state.phase = 'flop';
        break;

      case 'flop':
        this.dealTurn();
        this.state.phase = 'turn';
        break;

      case 'turn':
        this.dealRiver();
        this.state.phase = 'river';
        break;

      case 'river':
        this.state.phase = 'showdown';
        this.determineWinners();
        break;

      default:
        break;
    }

    // Start new betting round if not showdown
    if (this.state.phase !== 'showdown' && this.state.phase !== 'finished') {
      this.state.activePlayerIndex = this.getFirstToAct();
    }
  }

  /**
   * Deals the flop (3 community cards)
   */
  private dealFlop(): void {
    const { cards, remainingDeck } = dealCards(this.deck, 3);
    this.deck = remainingDeck;
    this.state.communityCards = cards;
  }

  /**
   * Deals the turn (1 community card)
   */
  private dealTurn(): void {
    const { card, remainingDeck } = dealCard(this.deck);
    this.deck = remainingDeck;
    this.state.communityCards.push(card);
  }

  /**
   * Deals the river (1 community card)
   */
  private dealRiver(): void {
    const { card, remainingDeck } = dealCard(this.deck);
    this.deck = remainingDeck;
    this.state.communityCards.push(card);
  }

  /**
   * Deals hole cards to all players
   */
  private dealHoleCards(): void {
    this.state.players.forEach((player: Player) => {
      const { card: card1, remainingDeck: deck1 } = dealCard(this.deck);
      this.deck = deck1;
      const { card: card2, remainingDeck: deck2 } = dealCard(this.deck);
      this.deck = deck2;
      player.cards = [card1, card2];
    });
  }

  /**
   * Posts small and big blinds
   */
  private postBlinds(): void {
    const smallBlindPlayer = this.state.players[this.state.smallBlindPosition];
    const bigBlindPlayer = this.state.players[this.state.bigBlindPosition];

    const smallBlindAmount = Math.min(
      this.state.settings.smallBlind,
      smallBlindPlayer.stack
    );
    const bigBlindAmount = Math.min(
      this.state.settings.bigBlind,
      bigBlindPlayer.stack
    );

    smallBlindPlayer.stack -= smallBlindAmount;
    smallBlindPlayer.currentBet = smallBlindAmount;
    if (smallBlindPlayer.stack === 0) {
      smallBlindPlayer.isAllIn = true;
    }

    bigBlindPlayer.stack -= bigBlindAmount;
    bigBlindPlayer.currentBet = bigBlindAmount;
    if (bigBlindPlayer.stack === 0) {
      bigBlindPlayer.isAllIn = true;
    }

    this.state.pot = smallBlindAmount + bigBlindAmount;
    this.state.currentBet = bigBlindAmount;
  }

  /**
   * Updates dealer and blind positions
   */
  private updatePositions(): void {
    this.state.dealerPosition = (this.state.dealerPosition + 1) % this.state.players.length;
    this.state.smallBlindPosition = (this.state.dealerPosition + 1) % this.state.players.length;
    this.state.bigBlindPosition = (this.state.smallBlindPosition + 1) % this.state.players.length;
  }

  /**
   * Gets the first player to act (after big blind)
   */
  private getFirstToAct(): number {
    return (this.state.bigBlindPosition + 1) % this.state.players.length;
  }

  /**
   * Determines winners and distributes pot
   */
  private determineWinners(): void {
    const activePlayers = this.state.players.filter((p: Player) => !p.hasFolded && p.isActive);

    if (activePlayers.length === 1) {
      // Only one player left, they win
      activePlayers[0].stack += this.state.pot;
      this.state.phase = 'finished';
      return;
    }

    // Evaluate all hands
    const handResults: Array<{ player: Player; result: HandResult }> = activePlayers.map(
      (player: Player) => ({
        player,
        result: evaluateHand(player.cards!, this.state.communityCards),
      })
    );

    // Sort by hand strength (best first)
    handResults.sort((a, b) => compareHands(b.result, a.result));

    // Find all players with the best hand
    const bestHand = handResults[0].result;
    const winners = handResults.filter(
      (hr) => compareHands(hr.result, bestHand) === 0
    );

    // Distribute pot equally among winners
    const winningsPerPlayer = Math.floor(this.state.pot / winners.length);
    winners.forEach(({ player }) => {
      player.stack += winningsPerPlayer;
    });

    // Handle remainder (if any)
    const remainder = this.state.pot % winners.length;
    if (remainder > 0) {
      winners[0].player.stack += remainder;
    }

    this.state.phase = 'finished';
  }

  /**
   * Gets the current game state
   */
  getState(): GameState {
    return { ...this.state };
  }

  /**
   * Gets a sanitized state (without hole cards for other players)
   */
  getStateForPlayer(playerId: string): GameState {
    const state = this.getState();
    // Hide other players' hole cards
    state.players = state.players.map((p: Player) => {
      if (p.id === playerId) {
        return p;
      }
      return {
        ...p,
        cards: undefined,
      };
    });
    return state;
  }
}

