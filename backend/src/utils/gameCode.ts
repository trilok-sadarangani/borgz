/**
 * Generates a unique game code (6-8 characters, alphanumeric)
 */
export function generateGameCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Excluding confusing characters
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

/**
 * Validates a game code format
 */
export function isValidGameCode(code: string): boolean {
  return /^[A-Z0-9]{6,8}$/.test(code);
}

