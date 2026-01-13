"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const requireAuth_1 = require("../middleware/requireAuth");
const gameHistoryService_1 = require("../services/gameHistoryService");
const router = (0, express_1.Router)();
function getAuthedPlayerId(req) {
    const player = req.player;
    if (!player?.id)
        throw new Error('Missing authenticated player');
    return player.id;
}
/**
 * GET /api/history/me
 * Returns:
 * - all seat sessions for the current player (includes club + non-club)
 * - hands for each session from join -> leave (or join -> now if still open)
 */
router.get('/me', requireAuth_1.requireAuth, async (req, res) => {
    try {
        const playerId = getAuthedPlayerId(req);
        await gameHistoryService_1.gameHistoryService.ensureHydratedFromDb();
        const sessions = gameHistoryService_1.gameHistoryService.getPlayerSessions(playerId).map((s) => {
            const game = gameHistoryService_1.gameHistoryService.getGame(s.gameId);
            const hands = gameHistoryService_1.gameHistoryService.getHandsForSession(s);
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
    }
    catch (error) {
        return res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to get player history',
        });
    }
});
exports.default = router;
