import { Router, Request, Response } from 'express';
import { authService } from '../services/authService';
import { requireAuth } from '../middleware/requireAuth';

const router = Router();

function seedAuthDisabled(): boolean {
  const explicit = String(process.env.DISABLE_SEED_AUTH || '').toLowerCase() === 'true';
  const isProd = String(process.env.NODE_ENV || '').toLowerCase() === 'production';
  return explicit || isProd;
}

/**
 * GET /api/auth/seed/players - List all available seed auth players
 */
router.get('/seed/players', (_req: Request, res: Response) => {
  if (seedAuthDisabled()) {
    return res.status(404).json({ success: false, error: 'Not found' });
  }
  try {
    const players = authService.listSeedAuthPlayers();
    return res.json({ success: true, players, count: players.length });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to list seed auth players',
    });
  }
});

/**
 * POST /api/auth/login - Dev-only login with a seed playerId
 * body: { playerId: string; password: string }
 */
router.post('/login', (req: Request, res: Response) => {
  if (seedAuthDisabled()) {
    return res.status(404).json({ success: false, error: 'Not found' });
  }
  try {
    const { playerId, password } = req.body as { playerId?: string; password?: string };
    if (!playerId) {
      return res.status(400).json({ success: false, error: 'playerId is required' });
    }
    if (!password) {
      return res.status(400).json({ success: false, error: 'password is required' });
    }

    const session = authService.loginWithSeedPlayer(playerId, password);
    return res.json({
      success: true,
      token: session.token,
      player: session.player,
      createdAt: session.createdAt,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Login failed',
    });
  }
});

/**
 * GET /api/auth/me - Get current authenticated seed player
 */
router.get('/me', requireAuth, (req: Request, res: Response) => {
  const player = (req as unknown as { player: unknown }).player;
  return res.json({ success: true, player });
});

/**
 * POST /api/auth/logout - Revoke current token
 */
router.post('/logout', requireAuth, (req: Request, res: Response) => {
  const token = (req as unknown as { token: string }).token;
  authService.logout(token);
  return res.json({ success: true });
});

export default router;

