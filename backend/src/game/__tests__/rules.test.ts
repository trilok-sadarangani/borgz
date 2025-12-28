import { validateAction, processAction, calculateMinRaise, getNextActivePlayer } from '../rules';
import { Player } from '../../types';

describe('Game Rules', () => {
  describe('validateAction', () => {
    const createPlayer = (overrides: Partial<Player> = {}): Player => ({
      id: '1',
      name: 'Test Player',
      stack: 1000,
      currentBet: 0,
      isActive: true,
      isAllIn: false,
      hasFolded: false,
      position: 0,
      ...overrides,
    });

    describe('fold', () => {
      it('should allow fold when player is active', () => {
        const player = createPlayer();
        const result = validateAction(player, 'fold', undefined, 0, 20);
        expect(result.valid).toBe(true);
      });

      it('should not allow fold when player has folded', () => {
        const player = createPlayer({ hasFolded: true });
        const result = validateAction(player, 'fold', undefined, 0, 20);
        expect(result.valid).toBe(false);
      });
    });

    describe('check', () => {
      it('should allow check when no bet', () => {
        const player = createPlayer();
        const result = validateAction(player, 'check', undefined, 0, 20);
        expect(result.valid).toBe(true);
      });

      it('should not allow check when there is a bet', () => {
        const player = createPlayer();
        const result = validateAction(player, 'check', undefined, 50, 20);
        expect(result.valid).toBe(false);
        expect(result.error).toContain('Cannot check when there is a bet');
      });
    });

    describe('call', () => {
      it('should allow call when there is a bet', () => {
        const player = createPlayer();
        const result = validateAction(player, 'call', undefined, 50, 20);
        expect(result.valid).toBe(true);
      });

      it('should not allow call when no bet', () => {
        const player = createPlayer();
        const result = validateAction(player, 'call', undefined, 0, 20);
        expect(result.valid).toBe(false);
        expect(result.error).toContain('No bet to call');
      });

      it('should allow call when insufficient chips (all-in call)', () => {
        const player = createPlayer({ stack: 10, currentBet: 0 });
        const result = validateAction(player, 'call', undefined, 50, 20);
        expect(result.valid).toBe(true);
      });
    });

    describe('raise', () => {
      it('should allow valid raise', () => {
        const player = createPlayer();
        const result = validateAction(player, 'raise', 100, 50, 20);
        expect(result.valid).toBe(true);
      });

      it('should require raise amount', () => {
        const player = createPlayer();
        const result = validateAction(player, 'raise', undefined, 50, 20);
        expect(result.valid).toBe(false);
        expect(result.error).toContain('Raise amount required');
      });

      it('should not allow raise lower than current bet', () => {
        const player = createPlayer();
        const result = validateAction(player, 'raise', 40, 50, 20);
        expect(result.valid).toBe(false);
        expect(result.error).toContain('Raise must be higher');
      });

      it('should enforce minimum raise', () => {
        const player = createPlayer();
        // minRaise is a raise-to threshold (e.g. currentBet + bigBlind/lastRaise)
        // currentBet=50, minRaiseTo=70 => raising to 60 is too small.
        const result = validateAction(player, 'raise', 60, 50, 70);
        expect(result.valid).toBe(false);
        expect(result.error).toContain('Raise to must be at least');
      });

      it('should not allow raise when insufficient chips', () => {
        const player = createPlayer({ stack: 10 });
        const result = validateAction(player, 'raise', 100, 50, 20);
        expect(result.valid).toBe(false);
        expect(result.error).toContain('Insufficient chips');
      });
    });

    describe('all-in', () => {
      it('should allow all-in when player has chips', () => {
        const player = createPlayer({ stack: 500 });
        const result = validateAction(player, 'all-in', undefined, 50, 20);
        expect(result.valid).toBe(true);
      });

      it('should not allow all-in when no chips', () => {
        const player = createPlayer({ stack: 0 });
        const result = validateAction(player, 'all-in', undefined, 50, 20);
        expect(result.valid).toBe(false);
      });
    });
  });

  describe('processAction', () => {
    const createPlayer = (overrides: Partial<Player> = {}): Player => ({
      id: '1',
      name: 'Test Player',
      stack: 1000,
      currentBet: 0,
      isActive: true,
      isAllIn: false,
      hasFolded: false,
      position: 0,
      ...overrides,
    });

    it('should process fold correctly', () => {
      const player = createPlayer();
      const result = processAction(player, 'fold', undefined, 50, 20);
      expect(result.newBet).toBe(0);
      expect(result.chipsCommitted).toBe(0);
      expect(result.isAllIn).toBe(false);
    });

    it('should process check correctly', () => {
      const player = createPlayer();
      const result = processAction(player, 'check', undefined, 0, 20);
      expect(result.newBet).toBe(0);
      expect(result.chipsCommitted).toBe(0);
      expect(result.isAllIn).toBe(false);
    });

    it('should process call correctly', () => {
      const player = createPlayer();
      const result = processAction(player, 'call', undefined, 50, 20);
      expect(result.newBet).toBe(50);
      expect(result.chipsCommitted).toBe(50);
      expect(result.isAllIn).toBe(false);
    });

    it('should process all-in call', () => {
      const player = createPlayer({ stack: 30 });
      const result = processAction(player, 'call', undefined, 50, 20);
      expect(result.newBet).toBe(30);
      expect(result.chipsCommitted).toBe(30);
      expect(result.isAllIn).toBe(true);
    });

    it('should process raise correctly', () => {
      const player = createPlayer();
      const result = processAction(player, 'raise', 100, 50, 20);
      expect(result.newBet).toBe(100);
      expect(result.chipsCommitted).toBe(100);
      expect(result.isAllIn).toBe(false);
    });

    it('should process all-in raise', () => {
      const player = createPlayer({ stack: 80 });
      const result = processAction(player, 'raise', 200, 50, 20);
      expect(result.newBet).toBe(80);
      expect(result.chipsCommitted).toBe(80);
      expect(result.isAllIn).toBe(true);
    });

    it('should process all-in action', () => {
      const player = createPlayer({ stack: 500 });
      const result = processAction(player, 'all-in', undefined, 50, 20);
      expect(result.newBet).toBe(500);
      expect(result.chipsCommitted).toBe(500);
      expect(result.isAllIn).toBe(true);
    });
  });

  describe('calculateMinRaise', () => {
    it('should calculate minimum raise when no previous raise', () => {
      const minRaise = calculateMinRaise(50, 0, 20);
      expect(minRaise).toBe(70); // 50 + 20
    });

    it('should calculate minimum raise based on last raise', () => {
      const minRaise = calculateMinRaise(50, 30, 20);
      expect(minRaise).toBe(80); // 50 + 30
    });
  });

  describe('getNextActivePlayer', () => {
    const createPlayer = (id: string, overrides: Partial<Player> = {}): Player => ({
      id,
      name: `Player ${id}`,
      stack: 1000,
      currentBet: 0,
      isActive: true,
      isAllIn: false,
      hasFolded: false,
      position: parseInt(id),
      ...overrides,
    });

    it('should return next active player', () => {
      const players = [
        createPlayer('0'),
        createPlayer('1'),
        createPlayer('2'),
      ];
      const next = getNextActivePlayer(players, 0, 0);
      expect(next).toBe(1);
    });

    it('should skip folded players', () => {
      const players = [
        createPlayer('0'),
        createPlayer('1', { hasFolded: true }),
        createPlayer('2'),
      ];
      const next = getNextActivePlayer(players, 0, 0);
      expect(next).toBe(2);
    });

    it('should skip all-in players', () => {
      const players = [
        createPlayer('0'),
        createPlayer('1', { isAllIn: true }),
        createPlayer('2'),
      ];
      const next = getNextActivePlayer(players, 0, 0);
      expect(next).toBe(2);
    });

    it('should wrap around to beginning', () => {
      const players = [
        createPlayer('0'),
        createPlayer('1'),
        createPlayer('2'),
      ];
      const next = getNextActivePlayer(players, 2, 0);
      expect(next).toBe(0);
    });

    it('should return -1 if no active players', () => {
      const players = [
        createPlayer('0', { hasFolded: true }),
        createPlayer('1', { hasFolded: true }),
        createPlayer('2', { hasFolded: true }),
      ];
      const next = getNextActivePlayer(players, 0, 0);
      expect(next).toBe(-1);
    });
  });
});

