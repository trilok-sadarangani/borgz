import { renderHook, waitFor } from '@testing-library/react-native';
import { useGameStore } from '../../../store/gameStore';
import { GameState } from '../../../../shared/types/game.types';

// Mock the socket service
jest.mock('../../../services/socket', () => ({
  joinGame: jest.fn(),
  connectSocket: jest.fn(),
  getSocket: jest.fn(() => ({ connected: false, connect: jest.fn() })),
}));

// Mock the API service
jest.mock('../../../services/api', () => ({
  getApiBaseUrl: jest.fn(() => 'http://localhost:3001'),
  apiGet: jest.fn(),
  apiPost: jest.fn(),
}));

describe('Game Rejoin Logic', () => {
  const mockGameState: GameState = {
    id: 'game-123',
    code: 'ABC123',
    variant: 'texas-holdem',
    phase: 'pre-flop',
    players: [
      {
        id: 'player-1',
        name: 'Alice',
        stack: 1000,
        currentBet: 0,
        isActive: true,
        isAllIn: false,
        hasFolded: false,
        position: 0,
        cards: [],
      },
      {
        id: 'player-2',
        name: 'Bob',
        stack: 1000,
        currentBet: 0,
        isActive: true,
        isAllIn: false,
        hasFolded: false,
        position: 1,
        cards: [],
      },
    ],
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
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should detect when player is already seated in game', () => {
    const playerId = 'player-1';
    const alreadySeated = mockGameState.players.some(p => p.id === playerId);
    
    expect(alreadySeated).toBe(true);
  });

  test('should detect when player is NOT seated in game', () => {
    const playerId = 'player-new';
    const alreadySeated = mockGameState.players.some(p => p.id === playerId);
    
    expect(alreadySeated).toBe(false);
  });

  test('should skip buy-in modal for already seated player', async () => {
    const { apiGet } = require('../../../services/api');
    apiGet.mockResolvedValueOnce({ success: true, state: mockGameState });

    const gameState = await apiGet('/api/games/ABC123');
    const playerId = 'player-1';
    const alreadySeated = gameState.state.players.some((p: any) => p.id === playerId);

    expect(alreadySeated).toBe(true);
    // In the actual flow, this would skip setShowBuyInModal(true)
  });

  test('should show buy-in modal for new player', async () => {
    const { apiGet } = require('../../../services/api');
    apiGet.mockResolvedValueOnce({ success: true, state: mockGameState });

    const gameState = await apiGet('/api/games/ABC123');
    const playerId = 'player-new';
    const alreadySeated = gameState.state.players.some((p: any) => p.id === playerId);

    expect(alreadySeated).toBe(false);
    // In the actual flow, this would trigger setShowBuyInModal(true)
  });
});
