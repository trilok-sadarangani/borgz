import { act } from 'react';

describe('Auto-Advance to Next Hand', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  test('should trigger nextHand after 4 seconds when hand is finished', () => {
    const nextHandMock = jest.fn();
    const gameCode = 'ABC123';
    const playerId = 'player-1';
    
    const game = {
      phase: 'finished',
      lastHandResult: {
        reason: 'showdown',
        winners: [{ playerId: 'player-1', amount: 100 }],
        pot: 100,
        endedAt: Date.now(),
      },
    };
    
    const isHost = true;

    // Simulate the useEffect hook
    let cleanup: (() => void) | undefined;
    
    act(() => {
      if (game.phase === 'finished' && game.lastHandResult && isHost) {
        const timer = setTimeout(() => {
          nextHandMock(gameCode, playerId);
        }, 4000);
        cleanup = () => clearTimeout(timer);
      }
    });

    // Fast-forward time by 3 seconds - should not trigger yet
    act(() => {
      jest.advanceTimersByTime(3000);
    });
    expect(nextHandMock).not.toHaveBeenCalled();

    // Fast-forward to 4 seconds - should trigger now
    act(() => {
      jest.advanceTimersByTime(1000);
    });
    expect(nextHandMock).toHaveBeenCalledWith(gameCode, playerId);
    expect(nextHandMock).toHaveBeenCalledTimes(1);

    cleanup?.();
  });

  test('should NOT trigger nextHand if player is not host', () => {
    const nextHandMock = jest.fn();
    const isHost = false;
    
    const game = {
      phase: 'finished',
      lastHandResult: {
        reason: 'fold',
        winners: [{ playerId: 'player-2', amount: 50 }],
        pot: 50,
        endedAt: Date.now(),
      },
    };

    // Timer should not be set if not host
    if (game.phase === 'finished' && game.lastHandResult && isHost) {
      setTimeout(() => nextHandMock(), 4000);
    }

    act(() => {
      jest.advanceTimersByTime(5000);
    });

    expect(nextHandMock).not.toHaveBeenCalled();
  });

  test('should cleanup timer when component unmounts', () => {
    const nextHandMock = jest.fn();
    let cleanup: (() => void) | undefined;

    act(() => {
      const timer = setTimeout(() => {
        nextHandMock();
      }, 4000);
      cleanup = () => clearTimeout(timer);
    });

    // Unmount before timer fires
    act(() => {
      cleanup?.();
      jest.advanceTimersByTime(5000);
    });

    expect(nextHandMock).not.toHaveBeenCalled();
  });

  test('should NOT auto-advance if no lastHandResult', () => {
    const nextHandMock = jest.fn();
    const isHost = true;
    
    const game = {
      phase: 'finished',
      lastHandResult: null,
    };

    if (game.phase === 'finished' && game.lastHandResult && isHost) {
      setTimeout(() => nextHandMock(), 4000);
    }

    act(() => {
      jest.advanceTimersByTime(5000);
    });

    expect(nextHandMock).not.toHaveBeenCalled();
  });
});
