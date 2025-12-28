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
} from './rules';

export class GameEngine {
  private state: GameState;
  private deck: Card[] = [];
  private lastRaise: number = 0;
  private handStartedAt: number = 0;
  private handStartStacksByPlayerId: Record<string, number> = {};
  // Index that closes the betting round:
  // - If nobody raises during the round: closes when action would return to the round starter.
  // - If someone raises: closes when action would return to the last raiser.
  private closingActionIndex: number = 0;

  constructor(settings: GameSettings, gameCode: string) {
    this.state = this.initializeGame(settings, gameCode);
  }

  private syncActiveFlags(): void {
    // A player with 0 chips cannot be dealt in / act until they rebuy.
    for (const p of this.state.players) {
      if (p.stack <= 0) {
        p.isActive = false;
        p.isAllIn = false;
        p.currentBet = 0;
        p.cards = undefined;
      }
    }
  }

  private countPlayersWithChips(): number {
    return this.state.players.filter((p) => p.isActive && p.stack > 0).length;
  }

  private findNextIndexWithChips(fromIndex: number): number {
    const n = this.state.players.length;
    if (n === 0) return -1;
    for (let i = 0; i < n; i += 1) {
      const idx = (fromIndex + i) % n;
      const p = this.state.players[idx];
      if (p.isActive && p.stack > 0) return idx;
    }
    return -1;
  }

  private findNextCanAct(fromIndex: number): number {
    const n = this.state.players.length;
    if (n === 0) return -1;
    for (let i = 0; i < n; i += 1) {
      const idx = (fromIndex + i) % n;
      const p = this.state.players[idx];
      if (p.isActive && !p.hasFolded && !p.isAllIn && p.stack > 0) return idx;
    }
    return -1;
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

    // First player to join becomes the host (current UX: create+join makes creator host).
    if (!this.state.hostPlayerId) {
      this.state.hostPlayerId = playerId;
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
  startGame(requesterId: string): void {
    if (this.state.players.length < 2) {
      throw new Error('Need at least 2 players to start');
    }

    if (this.state.phase !== 'waiting') {
      throw new Error('Game already started');
    }

    if (this.state.hostPlayerId && this.state.hostPlayerId !== requesterId) {
      throw new Error('Only the host can start the game');
    }

    this.syncActiveFlags();
    if (this.countPlayersWithChips() < 2) {
      throw new Error('Need at least 2 players with chips to start');
    }

    // Initialize deck
    this.deck = shuffleDeck(createDeck());

    // Set positions
    this.updatePositions();

    // Snapshot stacks for stats (start-of-hand depth and net winnings).
    this.handStartedAt = Date.now();
    this.handStartStacksByPlayerId = {};
    for (const p of this.state.players) {
      this.handStartStacksByPlayerId[p.id] = p.stack;
    }

    // Post antes (if configured)
    this.postAntes();

    // Post blinds
    this.postBlinds();

    // Deal hole cards
    this.dealHoleCards();

    // Start pre-flop betting
    this.state.phase = 'pre-flop';
    this.state.activePlayerIndex = this.getFirstToActForPhase('pre-flop');
    // If nobody raises, the betting round closes when action returns to the first-to-act.
    this.closingActionIndex = this.state.activePlayerIndex;
    // Clear any previous hand result when a new hand starts.
    this.state.lastHandResult = undefined;
    this.state.updatedAt = Date.now();

    // If fewer than 2 players can act (everyone else all-in / folded / out of chips), fast-forward.
    void this.fastForwardIfNoFurtherBetting();
  }

  /**
   * Starts the next hand (host action). Requires the current hand to be finished.
   */
  nextHand(requesterId: string): void {
    if (this.state.hostPlayerId && this.state.hostPlayerId !== requesterId) {
      throw new Error('Only the host can start the next hand');
    }
    if (this.state.phase !== 'finished') {
      throw new Error('Hand is not finished');
    }

    // Reset per-hand state
    this.state.communityCards = [];
    this.state.pot = 0;
    this.state.currentBet = 0;
    this.state.history = [];
    this.lastRaise = 0;
    this.deck = [];

    // Reset player per-hand state
    this.state.players.forEach((p) => {
      p.currentBet = 0;
      p.hasFolded = false;
      p.isAllIn = false;
      p.isActive = p.stack > 0;
      p.cards = undefined;
    });

    // New hand begins
    this.state.phase = 'waiting';
    this.state.updatedAt = Date.now();

    // Reuse startGame to deal/shuffle/post blinds (keeps host-only semantics).
    this.startGame(requesterId);
  }

  /**
   * Adds chips to a player's stack (rebuy/top-up).
   * Allowed only between hands (waiting/finished) so it can't affect an in-progress hand.
   */
  rebuy(playerId: string, amount: number): void {
    if (this.state.phase !== 'waiting' && this.state.phase !== 'finished') {
      throw new Error('Can only rebuy between hands');
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new Error('Invalid rebuy amount');
    }
    const player = this.state.players.find((p: Player) => p.id === playerId);
    if (!player) {
      throw new Error('Player not found');
    }
    player.stack += Math.floor(amount);
    if (player.stack > 0) {
      player.isActive = true;
      player.isAllIn = false;
    }
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

    const prevCurrentBet = this.state.currentBet;
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
    } else if (action === 'call' || action === 'all-in' || (action === 'raise' && result.isAllIn)) {
      this.state.currentBet = Math.max(this.state.currentBet, result.newBet);
      // If an all-in increases the bet, treat it like a raise for min-raise tracking.
      if (action === 'all-in' && this.state.currentBet > prevCurrentBet) {
        this.lastRaise = this.state.currentBet - prevCurrentBet;
      }
    }

    // If this action increased the current bet, the round closes when action returns to the raiser.
    if (this.state.currentBet > prevCurrentBet) {
      this.closingActionIndex = this.state.activePlayerIndex;
    }

    // Record action
    const gameAction: GameAction = {
      playerId,
      action,
      amount,
      phase: this.state.phase,
      betTo: result.newBet,
      currentBetAfter: this.state.currentBet,
      timestamp: Date.now(),
    };
    this.state.history.push(gameAction);

    // Move to next player or next phase.
    // Betting round is complete when:
    // - all non-folded active players have matched the current bet or are all-in, AND
    // - the next player to act would be the closingActionIndex
    const nextIndex = getNextActivePlayer(
      this.state.players,
      this.state.activePlayerIndex,
      this.state.dealerPosition
    );

    const stillInHand = this.state.players.filter((p) => p.isActive && !p.hasFolded);
    if (stillInHand.length <= 1) {
      // End immediately if everyone else folded
      this.state.phase = 'finished';
      if (stillInHand.length === 1) {
        const winner = stillInHand[0];
        winner.stack += this.state.pot;
        this.state.lastHandResult = {
          reason: 'fold',
          winners: [{ playerId: winner.id, amount: this.state.pot }],
          pot: this.state.pot,
          endedAt: Date.now(),
        };
      }
      this.state.updatedAt = Date.now();
      return;
    }

    const activePlayers = this.state.players.filter((p) => p.isActive && !p.hasFolded);
    const allMatched = activePlayers.every(
      (p) => p.currentBet === this.state.currentBet || p.isAllIn || p.stack === 0
    );

    // If there is no next player who can act (all remaining are all-in), `nextIndex` will be -1.
    // Also, when only one player can act, `getNextActivePlayer` may return the same index.
    if (allMatched && (nextIndex === this.closingActionIndex || nextIndex === -1 || nextIndex === this.state.activePlayerIndex)) {
      this.advancePhase();
    } else {
      this.state.activePlayerIndex = nextIndex;
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
      // If there are not at least 2 players who can act (i.e. bet/call), there is no further betting.
      // Fast-forward the board to the river and go to showdown.
      const finished = this.fastForwardIfNoFurtherBetting();
      if (finished) return;

      this.state.activePlayerIndex = this.getFirstToActForPhase(this.state.phase);
      this.closingActionIndex = this.state.activePlayerIndex;
    }
  }

  /**
   * If fewer than 2 players can act (everyone else is all-in), run out remaining streets to showdown.
   */
  private fastForwardIfNoFurtherBetting(): boolean {
    const canActCount = this.state.players.filter(
      (p) => p.isActive && !p.hasFolded && !p.isAllIn && p.stack > 0
    ).length;
    if (canActCount >= 2) return false;

    // Deal remaining community cards up to 5, then determine winners.
    while (this.state.phase !== 'showdown' && this.state.phase !== 'finished') {
      if (this.state.phase === 'pre-flop') {
        this.dealFlop();
        this.state.phase = 'flop';
        continue;
      }
      if (this.state.phase === 'flop') {
        this.dealTurn();
        this.state.phase = 'turn';
        continue;
      }
      if (this.state.phase === 'turn') {
        this.dealRiver();
        this.state.phase = 'river';
        continue;
      }
      if (this.state.phase === 'river') {
        this.state.phase = 'showdown';
        this.determineWinners();
        return true;
      }
      // Safety: if we ever land in an unexpected phase, bail.
      return false;
    }
    return this.state.phase === 'finished';
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
      if (!player.isActive || player.stack <= 0) {
        player.cards = undefined;
        return;
      }
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

    const ts = Date.now();
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

    // Record blinds in history so clients can show them in the action log.
    this.state.history.push({
      playerId: smallBlindPlayer.id,
      action: 'post-blind',
      amount: smallBlindAmount,
      phase: 'pre-flop',
      betTo: smallBlindAmount,
      currentBetAfter: bigBlindAmount,
      timestamp: ts,
    });
    this.state.history.push({
      playerId: bigBlindPlayer.id,
      action: 'post-blind',
      amount: bigBlindAmount,
      phase: 'pre-flop',
      betTo: bigBlindAmount,
      currentBetAfter: bigBlindAmount,
      timestamp: ts,
    });
  }

  /**
   * Posts antes into the pot based on settings:
   * - ante: everyone posts `amount`
   * - bb-ante: big blind posts `amount * playersInHand`
   */
  private postAntes(): void {
    const ante = this.state.settings.ante;
    if (!ante || ante.type === 'none' || ante.amount <= 0) return;

    const inHand = this.state.players.filter((p) => p.isActive && p.stack > 0);
    if (!inHand.length) return;

    const ts = Date.now();

    if (ante.type === 'ante') {
      for (const p of inHand) {
        const amt = Math.min(ante.amount, p.stack);
        if (amt <= 0) continue;
        p.stack -= amt;
        if (p.stack === 0) p.isAllIn = true;
        this.state.pot += amt;
        this.state.history.push({
          playerId: p.id,
          action: 'post-ante',
          amount: amt,
          phase: 'pre-flop',
          betTo: p.currentBet,
          currentBetAfter: this.state.currentBet,
          timestamp: ts,
        });
      }
      return;
    }

    // bb-ante
    const bb = this.state.players[this.state.bigBlindPosition];
    const total = ante.amount * inHand.length;
    const amt = Math.min(total, bb.stack);
    if (amt <= 0) return;
    bb.stack -= amt;
    if (bb.stack === 0) bb.isAllIn = true;
    this.state.pot += amt;
    this.state.history.push({
      playerId: bb.id,
      action: 'post-ante',
      amount: amt,
      phase: 'pre-flop',
      betTo: bb.currentBet,
      currentBetAfter: this.state.currentBet,
      timestamp: ts,
    });
  }

  /**
   * Exposes start-of-hand stack snapshot for stats/history.
   */
  getHandStartStacksByPlayerId(): Record<string, number> {
    return { ...this.handStartStacksByPlayerId };
  }

  /**
   * Exposes hand started timestamp for stats/history.
   */
  getHandStartedAt(): number {
    return this.handStartedAt;
  }

  /**
   * Updates dealer and blind positions
   */
  private updatePositions(): void {
    const n = this.state.players.length;
    if (n === 0) return;

    // Move the button to the next player with chips.
    const nextDealer = this.findNextIndexWithChips((this.state.dealerPosition + 1) % n);
    if (nextDealer === -1) return;
    this.state.dealerPosition = nextDealer;

    const withChips = this.countPlayersWithChips();
    if (withChips < 2) return;

    if (withChips === 2) {
      // Heads-up: dealer is also the small blind (button), other is big blind.
      this.state.smallBlindPosition = this.state.dealerPosition;
      this.state.bigBlindPosition = this.findNextIndexWithChips((this.state.dealerPosition + 1) % n);
      return;
    }

    // 3+ active players: SB is next active after dealer; BB next active after SB.
    this.state.smallBlindPosition = this.findNextIndexWithChips((this.state.dealerPosition + 1) % n);
    this.state.bigBlindPosition = this.findNextIndexWithChips((this.state.smallBlindPosition + 1) % n);
  }

  /**
   * Gets the first player to act (after big blind)
   */
  private getFirstToActForPhase(phase: GameState['phase']): number {
    const n = this.state.players.length;
    if (n === 0) return 0;

    // Pre-flop: first to act is left of big blind (UTG), including heads-up where SB acts first.
    if (phase === 'pre-flop') {
      const start = (this.state.bigBlindPosition + 1) % n;
      const idx = this.findNextCanAct(start);
      return idx === -1 ? this.state.bigBlindPosition : idx;
    }

    // Post-flop:
    // - heads-up: for this app UX, button/small blind acts first (avoids same player acting twice across street)
    // - 3+ players: left of dealer acts first (small blind)
    if (n === 2) {
      const idx = this.findNextCanAct(this.state.smallBlindPosition);
      return idx === -1 ? this.state.smallBlindPosition : idx;
    }
    const start = (this.state.dealerPosition + 1) % n;
    const idx = this.findNextCanAct(start);
    return idx === -1 ? start : idx;
  }

  /**
   * Determines winners and distributes pot
   */
  private determineWinners(): void {
    const activePlayers = this.state.players.filter((p: Player) => !p.hasFolded && p.isActive);

    if (activePlayers.length === 1) {
      // Only one player left, they win
      activePlayers[0].stack += this.state.pot;
      this.state.lastHandResult = {
        reason: 'fold',
        winners: [{ playerId: activePlayers[0].id, amount: this.state.pot }],
        pot: this.state.pot,
        endedAt: Date.now(),
      };
      this.state.phase = 'finished';

    // Mark busted players as inactive between hands (they must rebuy to re-enter).
    this.syncActiveFlags();
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

    this.state.lastHandResult = {
      reason: 'showdown',
      winners: winners.map(({ player }) => ({
        playerId: player.id,
        amount: winningsPerPlayer + (player.id === winners[0].player.id ? remainder : 0),
      })),
      pot: this.state.pot,
      endedAt: Date.now(),
    };
    this.state.phase = 'finished';
  }

  /**
   * Gets the current game state
   */
  getState(): GameState {
    return { ...this.state };
  }

  /**
   * Gets a public state (no hole cards for anyone).
   * Useful for lobby/observers and "player joined" announcements.
   */
  getPublicState(): GameState {
    const state = this.getState();
    state.players = state.players.map((p: Player) => ({ ...p, cards: undefined }));
    return state;
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

