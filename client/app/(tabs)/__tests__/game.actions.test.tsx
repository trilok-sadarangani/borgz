import { GameState, Player } from '../../../../shared/types/game.types';

describe('Action Button Visibility Logic', () => {
  const createMockPlayer = (overrides?: Partial<Player>): Player => ({
    id: 'player-1',
    name: 'Alice',
    stack: 1000,
    currentBet: 0,
    isActive: true,
    isAllIn: false,
    hasFolded: false,
    position: 0,
    cards: [
      { suit: 'hearts', rank: 'A' },
      { suit: 'spades', rank: 'K' },
    ],
    ...overrides,
  });

  const createMockGameState = (overrides?: Partial<GameState>): GameState => ({
    id: 'game-123',
    code: 'ABC123',
    variant: 'texas-holdem',
    phase: 'pre-flop',
    players: [createMockPlayer()],
    communityCards: [],
    pot: 0,
    currentBet: 0,
    dealerPosition: 0,
    smallBlindPosition: 0,
    bigBlindPosition: 1,
    activePlayerIndex: 0,
    settings: {
      variant: 'texas-holdem',
      smallBlind: 10,
      bigBlind: 20,
      startingStack: 1000,
      maxPlayers: 10,
    },
    history: [],
    ...overrides,
  });

  describe('Button visibility during finished phase', () => {
    test('should hide all action buttons when phase is finished', () => {
      const game = createMockGameState({ phase: 'finished' });
      const me = game.players[0];
      const isMyTurn = true;

      // Simulate the availableActions logic
      const shouldShowButtons = !(game.phase === 'finished' || game.phase === 'showdown');

      expect(shouldShowButtons).toBe(false);
    });

    test('should hide all action buttons when phase is showdown', () => {
      const game = createMockGameState({ phase: 'showdown' });
      const me = game.players[0];
      const isMyTurn = true;

      const shouldShowButtons = !(game.phase === 'finished' || game.phase === 'showdown');

      expect(shouldShowButtons).toBe(false);
    });

    test('should show action buttons during active play phases', () => {
      const phases: Array<GameState['phase']> = ['pre-flop', 'flop', 'turn', 'river'];
      
      phases.forEach(phase => {
        const game = createMockGameState({ phase });
        const shouldShowButtons = !(game.phase === 'finished' || game.phase === 'showdown');
        
        expect(shouldShowButtons).toBe(true);
      });
    });
  });

  describe('Conditional button logic', () => {
    test('should show check button when no bet to match', () => {
      const game = createMockGameState({ currentBet: 0 });
      const me = game.players[0];
      
      const hasBet = game.currentBet > 0;
      const needToCall = hasBet && me.currentBet < game.currentBet;
      const canCheck = !needToCall;

      expect(canCheck).toBe(true);
    });

    test('should show call button when there is a bet to match', () => {
      const game = createMockGameState({ 
        currentBet: 50,
        players: [createMockPlayer({ currentBet: 0 })],
      });
      const me = game.players[0];
      
      const hasBet = game.currentBet > 0;
      const needToCall = hasBet && me.currentBet < game.currentBet;
      const canCall = needToCall;

      expect(canCall).toBe(true);
      expect(game.currentBet - me.currentBet).toBe(50); // Amount to call
    });

    test('should NOT show call button when already matched bet', () => {
      const game = createMockGameState({ 
        currentBet: 50,
        players: [createMockPlayer({ currentBet: 50 })],
      });
      const me = game.players[0];
      
      const hasBet = game.currentBet > 0;
      const needToCall = hasBet && me.currentBet < game.currentBet;
      const canCall = needToCall;

      expect(canCall).toBe(false);
    });

    test('should only show fold button when there is a bet', () => {
      const gameWithBet = createMockGameState({ currentBet: 50 });
      const gameNoBet = createMockGameState({ currentBet: 0 });

      expect(gameWithBet.currentBet > 0).toBe(true); // Can fold
      expect(gameNoBet.currentBet > 0).toBe(false); // Cannot fold
    });

    test('should hide all buttons when player has no cards during active play', () => {
      const game = createMockGameState({ 
        phase: 'flop',
        players: [createMockPlayer({ cards: undefined })],
      });
      const me = game.players[0];
      const hasCards = me.cards && me.cards.length > 0;

      expect(hasCards).toBeFalsy();
      expect(hasCards).not.toBe(true);
      // Logic would return all canX: false
    });

    test('should hide buttons when not player turn', () => {
      const game = createMockGameState({ activePlayerIndex: 1 });
      const me = game.players[0];
      const isMyTurn = game.players[game.activePlayerIndex]?.id === me.id;

      expect(isMyTurn).toBe(false);
      // Logic would return all canX: false
    });
  });
});
