"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const gameCode_1 = require("../gameCode");
describe('gameCode utils', () => {
    it('generates a 6-char code by default', () => {
        const code = (0, gameCode_1.generateGameCode)();
        expect(code).toHaveLength(6);
        expect((0, gameCode_1.isValidGameCode)(code)).toBe(true);
    });
    it('generates a 7-char code', () => {
        const code = (0, gameCode_1.generateGameCode)(7);
        expect(code).toHaveLength(7);
        expect((0, gameCode_1.isValidGameCode)(code)).toBe(true);
    });
    it('generates an 8-char code', () => {
        const code = (0, gameCode_1.generateGameCode)(8);
        expect(code).toHaveLength(8);
        expect((0, gameCode_1.isValidGameCode)(code)).toBe(true);
    });
    it('rejects invalid formats', () => {
        expect((0, gameCode_1.isValidGameCode)('abc123')).toBe(false);
        expect((0, gameCode_1.isValidGameCode)('ABCDE')).toBe(false);
        expect((0, gameCode_1.isValidGameCode)('ABCDEFGHI')).toBe(false);
        expect((0, gameCode_1.isValidGameCode)('ABCD!2')).toBe(false);
    });
});
