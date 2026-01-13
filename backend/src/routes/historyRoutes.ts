import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/requireAuth';
import { gameHistoryService } from '../services/gameHistoryService';

const router = Router();

function getAuthedPlayerId(req: Request): string {
  const player = (req as unknown as { player?: { id?: string } }).player;
  if (!player?.id) throw new Error('Missing authenticated player');
  return player.id;
}

/**
 * GET /api/history/me
 * Returns:
 * - all seat sessions for the current player (includes club + non-club)
 * - hands for each session from join -> leave (or join -> now if still open)
 */
router.get('/me', requireAuth, async (req: Request, res: Response) => {
  try {
    const playerId = getAuthedPlayerId(req);
    await gameHistoryService.ensureHydratedFromDb();
    const sessions = gameHistoryService.getPlayerSessions(playerId).map((s) => {
      const game = gameHistoryService.getGame(s.gameId);
      const hands = gameHistoryService.getHandsForSession(s);
      return {
        ...s,
        game: game
          ? {
              gameId: game.gameId,
              code: game.code,
              clubId: game.clubId,
              variant: game.variant,
              settings: game.settings,
              createdAt: game.createdAt,
              endedAt: game.endedAt,
            }
          : null,
        hands,
        handsCount: hands.length,
      };
    });

    return res.json({ success: true, sessions, count: sessions.length });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get player history',
    });
  }
});

export default router;


