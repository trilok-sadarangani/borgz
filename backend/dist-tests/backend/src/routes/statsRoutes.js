"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const requireAuth_1 = require("../middleware/requireAuth");
const statsService_1 = require("../services/statsService");
const gameHistoryService_1 = require("../services/gameHistoryService");
const router = (0, express_1.Router)();
function getAuthedPlayerId(req) {
    const player = req.player;
    if (!player?.id)
        throw new Error('Missing authenticated player');
    return player.id;
}
function parseOptionalNumber(v) {
    if (typeof v !== 'string')
        return undefined;
    const n = Number(v);
    if (!Number.isFinite(n))
        return undefined;
    return n;
}
/**
 * GET /api/stats/me
 * Query params (all optional):
 * - from, to (ms epoch) filter by hand endedAt
 * - clubId
 * - gameId or code
 * - variant (texas-holdem | omaha | omaha-hi-lo)
 * - depthBucket (0-50 | 50-100 | 100-150 | 150-500 | 500+)
 */
router.get('/me', requireAuth_1.requireAuth, async (req, res) => {
    try {
        const playerId = getAuthedPlayerId(req);
        const q = req.query;
        const from = parseOptionalNumber(q.from);
        const to = parseOptionalNumber(q.to);
        const clubId = typeof q.clubId === 'string' ? q.clubId : undefined;
        const gameId = typeof q.gameId === 'string' ? q.gameId : undefined;
        const code = typeof q.code === 'string' ? q.code : undefined;
        const variant = typeof q.variant === 'string' ? q.variant : undefined;
        const depthBucket = typeof q.depthBucket === 'string' ? q.depthBucket : undefined;
        // Ensure persisted history is available after backend restarts.
        // (Stats are derived from GameHistoryService.)
        // NOTE: we hydrate without a time bound because stats queries may omit from/to.
        // If this becomes too heavy, we can use (from || to) to bound hydration.
        await gameHistoryService_1.gameHistoryService.ensureHydratedFromDb();
        const query = { from, to, clubId, gameId, code, variant, depthBucket };
        const out = statsService_1.playerStatsService.getMyStats(playerId, query);
        return res.json({
            success: true,
            summary: out.summary,
            gamesInRange: out.gamesInRange,
            vsOpponents: out.vsOpponents,
            preflop: out.preflop,
        });
    }
    catch (error) {
        return res.status(400).json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to compute stats',
        });
    }
});
exports.default = router;
