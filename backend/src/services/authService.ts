import crypto from 'crypto';
import { playerService, SeedPlayer } from './playerService';

export type AuthSession = {
  token: string;
  player: SeedPlayer;
  createdAt: number;
};

type SeedCredential = {
  playerId: string;
  password: string;
};

/**
 * Dev-only in-memory auth.
 * - "Users" are the existing seed players.
 * - "Login" creates a bearer token stored in memory.
 * - No persistence; restart wipes sessions.
 */
export class AuthService {
  private sessionsByToken: Map<string, AuthSession> = new Map();
  private seedCredentials: Map<string, SeedCredential> = new Map(); // playerId -> credential

  constructor() {
    // Dev-only seed passwords. Keep them server-side; never return passwords to clients.
    // For now, all seed players share the same password to keep onboarding simple.
    const defaultPassword = process.env.SEED_PLAYER_PASSWORD || 'borgz';
    for (const p of playerService.getSeedPlayers()) {
      this.seedCredentials.set(p.id, { playerId: p.id, password: defaultPassword });
    }
  }

  listSeedAuthPlayers(): SeedPlayer[] {
    return playerService.getSeedPlayers();
  }

  loginWithSeedPlayer(playerId: string, password: string): AuthSession {
    const player = playerService.getSeedPlayer(playerId);
    if (!player) {
      throw new Error('Unknown seed player');
    }

    const cred = this.seedCredentials.get(playerId);
    if (!cred || cred.password !== password) {
      throw new Error('Invalid password');
    }

    const token = crypto.randomBytes(24).toString('hex');
    const session: AuthSession = { token, player, createdAt: Date.now() };
    this.sessionsByToken.set(token, session);
    return session;
  }

  getSession(token: string): AuthSession | undefined {
    return this.sessionsByToken.get(token);
  }

  logout(token: string): boolean {
    return this.sessionsByToken.delete(token);
  }
}

export const authService = new AuthService();
