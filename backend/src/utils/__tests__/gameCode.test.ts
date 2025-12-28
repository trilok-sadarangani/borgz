import { generateGameCode, isValidGameCode } from '../gameCode';

describe('gameCode utils', () => {
  it('generates a 6-char code by default', () => {
    const code = generateGameCode();
    expect(code).toHaveLength(6);
    expect(isValidGameCode(code)).toBe(true);
  });

  it('generates a 7-char code', () => {
    const code = generateGameCode(7);
    expect(code).toHaveLength(7);
    expect(isValidGameCode(code)).toBe(true);
  });

  it('generates an 8-char code', () => {
    const code = generateGameCode(8);
    expect(code).toHaveLength(8);
    expect(isValidGameCode(code)).toBe(true);
  });

  it('rejects invalid formats', () => {
    expect(isValidGameCode('abc123')).toBe(false);
    expect(isValidGameCode('ABCDE')).toBe(false);
    expect(isValidGameCode('ABCDEFGHI')).toBe(false);
    expect(isValidGameCode('ABCD!2')).toBe(false);
  });
});




