import { GameState } from '../../../../shared/types/game.types';

describe('Winner Display Formatting', () => {
  const mockGameState: GameState = {
    id: 'game-123',
    code: 'ABC123',
    variant: 'texas-holdem',
    phase: 'finished',
    players: [
      {
        id: 'google-oauth2|117624972889269047603',
        name: 'Alice',
        stack: 2430,
        currentBet: 0,
        isActive: true,
        isAllIn: false,
        hasFolded: false,
        position: 0,
      },
      {
        id: 'google-oauth2|101580662098686594989',
        name: 'Bob',
        stack: 570,
        currentBet: 0,
        isActive: true,
        isAllIn: false,
        hasFolded: false,
        position: 1,
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
    lastHandResult: {
      reason: 'showdown',
      winners: [
        { playerId: 'google-oauth2|117624972889269047603', amount: 1430 },
      ],
      pot: 1430,
      endedAt: Date.now(),
    },
  };

  test('should display player name instead of Auth0 ID in winner message', () => {
    const game = mockGameState;
    
    // Simulate the winner display logic
    const winnerMessages = game.lastHandResult!.winners.map((w) => {
      const winner = game.players.find(p => p.id === w.playerId);
      const winnerName = winner?.name || 'Player';
      return `${winnerName} won $${w.amount}`;
    });

    expect(winnerMessages[0]).toBe('Alice won $1430');
    expect(winnerMessages[0]).not.toContain('google-oauth2');
  });

  test('should handle multiple winners', () => {
    const gameWithTie: GameState = {
      ...mockGameState,
      lastHandResult: {
        reason: 'showdown',
        winners: [
          { playerId: 'google-oauth2|117624972889269047603', amount: 715 },
          { playerId: 'google-oauth2|101580662098686594989', amount: 715 },
        ],
        pot: 1430,
        endedAt: Date.now(),
      },
    };

    const winnerMessages = gameWithTie.lastHandResult!.winners.map((w) => {
      const winner = gameWithTie.players.find(p => p.id === w.playerId);
      const winnerName = winner?.name || 'Player';
      return `${winnerName} won $${w.amount}`;
    });

    expect(winnerMessages[0]).toBe('Alice won $715');
    expect(winnerMessages[1]).toBe('Bob won $715');
    expect(winnerMessages.join(' | ')).toBe('Alice won $715 | Bob won $715');
  });

  test('should handle missing player gracefully', () => {
    const gameWithMissingPlayer: GameState = {
      ...mockGameState,
      lastHandResult: {
        reason: 'fold',
        winners: [
          { playerId: 'unknown-player-id', amount: 500 },
        ],
        pot: 500,
        endedAt: Date.now(),
      },
    };

    const winnerMessages = gameWithMissingPlayer.lastHandResult!.winners.map((w) => {
      const winner = gameWithMissingPlayer.players.find(p => p.id === w.playerId);
      const winnerName = winner?.name || 'Player';
      return `${winnerName} won $${w.amount}`;
    });

    expect(winnerMessages[0]).toBe('Player won $500');
  });
});
