import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/requireAuth';
import { playerStatsService, StatsQuery, DepthBucket } from '../services/statsService';
import { gameHistoryService } from '../services/gameHistoryService';
import { PokerVariant } from '../types';

const router = Router();

function getAuthedPlayerId(req: Request): string {
  const player = (req as unknown as { player?: { id?: string } }).player;
  if (!player?.id) throw new Error('Missing authenticated player');
  return player.id;
}

function parseOptionalNumber(v: unknown): number | undefined {
  if (typeof v !== 'string') return undefined;
  const n = Number(v);
  if (!Number.isFinite(n)) return undefined;
  return n;
}

export type StatsMeResponse =
  | {
      success: true;
      summary: ReturnType<typeof playerStatsService.getMyStats>['summary'];
      gamesInRange: ReturnType<typeof playerStatsService.getMyStats>['gamesInRange'];
      vsOpponents: ReturnType<typeof playerStatsService.getMyStats>['vsOpponents'];
      preflop: ReturnType<typeof playerStatsService.getMyStats>['preflop'];
    }
  | { success: false; error: string };

/**
 * GET /api/stats/me
 * Query params (all optional):
 * - from, to (ms epoch) filter by hand endedAt
 * - clubId
 * - gameId or code
 * - variant (texas-holdem | omaha | omaha-hi-lo)
 * - depthBucket (0-50 | 50-100 | 100-150 | 150-500 | 500+)
 */
router.get('/me', requireAuth, async (req: Request, res: Response) => {
  try {
    const playerId = getAuthedPlayerId(req);

    const q = req.query as Record<string, unknown>;
    const from = parseOptionalNumber(q.from);
    const to = parseOptionalNumber(q.to);
    const clubId = typeof q.clubId === 'string' ? q.clubId : undefined;
    const gameId = typeof q.gameId === 'string' ? q.gameId : undefined;
    const code = typeof q.code === 'string' ? q.code : undefined;
    const variant = typeof q.variant === 'string' ? (q.variant as PokerVariant) : undefined;
    const depthBucket = typeof q.depthBucket === 'string' ? (q.depthBucket as DepthBucket) : undefined;

    // Ensure persisted history is available after backend restarts.
    // (Stats are derived from GameHistoryService.)
    // NOTE: we hydrate without a time bound because stats queries may omit from/to.
    // If this becomes too heavy, we can use (from || to) to bound hydration.
    await gameHistoryService.ensureHydratedFromDb();

    const query: StatsQuery = { from, to, clubId, gameId, code, variant, depthBucket };
    const out = playerStatsService.getMyStats(playerId, query);
    return res.json({
      success: true,
      summary: out.summary,
      gamesInRange: out.gamesInRange,
      vsOpponents: out.vsOpponents,
      preflop: out.preflop,
    } satisfies StatsMeResponse);
  } catch (error) {
    return res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to compute stats',
    } satisfies StatsMeResponse);
  }
});

export default router;


