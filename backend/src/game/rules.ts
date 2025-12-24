import { Player, PlayerAction } from '../types';

/**
 * Validates if a player action is legal given the current game state
 */
export function validateAction(
  player: Player,
  action: PlayerAction,
  amount: number | undefined,
  currentBet: number,
  minRaise: number
): { valid: boolean; error?: string } {
  // Check if player is active
  if (!player.isActive || player.hasFolded) {
    return { valid: false, error: 'Player is not active' };
  }

  // Check if player is all-in
  if (player.isAllIn) {
    return { valid: false, error: 'Player is already all-in' };
  }

  const callAmount = currentBet - player.currentBet;
  const availableChips = player.stack;

  switch (action) {
    case 'fold':
      return { valid: true };

    case 'check':
      if (currentBet > player.currentBet) {
        return { valid: false, error: 'Cannot check when there is a bet' };
      }
      return { valid: true };

    case 'call':
      if (currentBet === player.currentBet) {
        return { valid: false, error: 'No bet to call' };
      }
      if (callAmount > availableChips) {
        return { valid: false, error: 'Insufficient chips to call' };
      }
      return { valid: true };

    case 'raise':
      if (amount === undefined) {
        return { valid: false, error: 'Raise amount required' };
      }
      const totalNeeded = amount - player.currentBet;
      if (totalNeeded > availableChips) {
        return { valid: false, error: 'Insufficient chips to raise' };
      }
      if (amount <= currentBet) {
        return { valid: false, error: 'Raise must be higher than current bet' };
      }
      const raiseAmount = amount - currentBet;
      if (raiseAmount < minRaise) {
        return { valid: false, error: `Raise must be at least ${minRaise}` };
      }
      return { valid: true };

    case 'all-in':
      if (availableChips === 0) {
        return { valid: false, error: 'No chips to go all-in' };
      }
      return { valid: true };

    default:
      return { valid: false, error: 'Invalid action' };
  }
}

/**
 * Calculates the minimum raise amount
 */
export function calculateMinRaise(currentBet: number, lastRaise: number, bigBlind: number): number {
  if (lastRaise === 0) {
    return currentBet + bigBlind;
  }
  return currentBet + lastRaise;
}

/**
 * Processes a player action and returns the new bet amount
 */
export function processAction(
  player: Player,
  action: PlayerAction,
  amount: number | undefined,
  currentBet: number,
  _minRaise: number // Not used in processing, validation happens in validateAction
): { newBet: number; chipsCommitted: number; isAllIn: boolean } {
  const callAmount = currentBet - player.currentBet;
  const availableChips = player.stack;

  switch (action) {
    case 'fold':
      return { newBet: player.currentBet, chipsCommitted: 0, isAllIn: false };

    case 'check':
      return { newBet: player.currentBet, chipsCommitted: 0, isAllIn: false };

    case 'call': {
      if (callAmount >= availableChips) {
        // All-in call
        return {
          newBet: player.currentBet + availableChips,
          chipsCommitted: availableChips,
          isAllIn: true,
        };
      }
      return {
        newBet: currentBet,
        chipsCommitted: callAmount,
        isAllIn: false,
      };
    }

    case 'raise': {
      const totalNeeded = (amount || 0) - player.currentBet;
      if (totalNeeded >= availableChips) {
        // All-in raise
        return {
          newBet: player.currentBet + availableChips,
          chipsCommitted: availableChips,
          isAllIn: true,
        };
      }
      return {
        newBet: amount || 0,
        chipsCommitted: totalNeeded,
        isAllIn: false,
      };
    }

    case 'all-in': {
      return {
        newBet: player.currentBet + availableChips,
        chipsCommitted: availableChips,
        isAllIn: true,
      };
    }

    default:
      return { newBet: player.currentBet, chipsCommitted: 0, isAllIn: false };
  }
}

/**
 * Determines the next active player index
 */
export function getNextActivePlayer(
  players: Player[],
  currentIndex: number,
  _dealerPosition: number // Reserved for future position-based logic
): number {
  let nextIndex = (currentIndex + 1) % players.length;
  let attempts = 0;

  while (attempts < players.length) {
    const player = players[nextIndex];
    // Skip if player is not active, folded, or all-in
    if (player.isActive && !player.hasFolded && !player.isAllIn && player.stack > 0) {
      return nextIndex;
    }
    nextIndex = (nextIndex + 1) % players.length;
    attempts++;
  }

  // If no active player found, return -1 (round should end)
  return -1;
}

/**
 * Checks if betting round is complete
 */
export function isBettingRoundComplete(
  players: Player[],
  currentBet: number,
  activePlayerIndex: number
): boolean {
  // Count active players who haven't folded
  const activePlayers = players.filter(
    (p) => p.isActive && !p.hasFolded && p.stack > 0
  );

  if (activePlayers.length <= 1) {
    return true;
  }

  // Check if all active players have matched the current bet or are all-in
  const allMatched = activePlayers.every(
    (p) => p.currentBet === currentBet || p.isAllIn || p.stack === 0
  );

  // Also check if we've gone around the table once
  const lastToAct = activePlayers.findIndex((p) => p.id === players[activePlayerIndex].id);
  return allMatched && lastToAct !== -1;
}

