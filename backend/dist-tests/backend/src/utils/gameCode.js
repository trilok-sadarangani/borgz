"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateGameCode = generateGameCode;
exports.isValidGameCode = isValidGameCode;
/**
 * Generates a unique game code (6-8 characters, alphanumeric)
 */
function generateGameCode(length = 6) {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Excluding confusing characters
    let code = '';
    for (let i = 0; i < length; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}
/**
 * Validates a game code format
 */
function isValidGameCode(code) {
    return /^[A-Z0-9]{6,8}$/.test(code);
}
