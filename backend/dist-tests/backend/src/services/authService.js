"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authService = exports.AuthService = void 0;
const crypto_1 = __importDefault(require("crypto"));
const playerService_1 = require("./playerService");
/**
 * Dev-only in-memory auth.
 * - "Users" are the existing seed players.
 * - "Login" creates a bearer token stored in memory.
 * - No persistence; restart wipes sessions.
 */
class AuthService {
    constructor() {
        this.sessionsByToken = new Map();
        this.seedCredentials = new Map(); // playerId -> credential
        // Dev-only seed passwords. Keep them server-side; never return passwords to clients.
        // For now, all seed players share the same password to keep onboarding simple.
        const defaultPassword = process.env.SEED_PLAYER_PASSWORD || 'borgz';
        for (const p of playerService_1.playerService.getSeedPlayers()) {
            this.seedCredentials.set(p.id, { playerId: p.id, password: defaultPassword });
        }
    }
    listSeedAuthPlayers() {
        return playerService_1.playerService.getSeedPlayers();
    }
    loginWithSeedPlayer(playerId, password) {
        const player = playerService_1.playerService.getSeedPlayer(playerId);
        if (!player) {
            throw new Error('Unknown seed player');
        }
        const cred = this.seedCredentials.get(playerId);
        if (!cred || cred.password !== password) {
            throw new Error('Invalid password');
        }
        const token = crypto_1.default.randomBytes(24).toString('hex');
        const session = { token, player, createdAt: Date.now() };
        this.sessionsByToken.set(token, session);
        return session;
    }
    getSession(token) {
        return this.sessionsByToken.get(token);
    }
    logout(token) {
        return this.sessionsByToken.delete(token);
    }
}
exports.AuthService = AuthService;
exports.authService = new AuthService();
