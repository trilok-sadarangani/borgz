"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const requireAuth_1 = require("../middleware/requireAuth");
const clubService_1 = require("../services/clubService");
const dbPersistenceService_1 = require("../services/dbPersistenceService");
const gameService_1 = require("../services/gameService");
const gameHistoryService_1 = require("../services/gameHistoryService");
const gameCode_1 = require("../utils/gameCode");
const router = (0, express_1.Router)();
function getAuthedPlayerId(req) {
    const player = req.player;
    if (!player?.id)
        throw new Error('Missing authenticated player');
    return player.id;
}
function sanitizeClubForMember(club) {
    // Phase 1: return inviteCode to any member (and owner). We can tighten later.
    return club;
}
function requireClubMembership(clubId, playerId) {
    const club = clubService_1.clubService.getClub(clubId);
    if (!club) {
        throw new Error('Club not found');
    }
    if (!(club.memberIds || []).includes(playerId)) {
        throw new Error('Not a member of this club');
    }
    return club;
}
/**
 * GET /api/clubs - List clubs for the current authenticated player
 */
router.get('/', requireAuth_1.requireAuth, (req, res) => {
    try {
        const playerId = getAuthedPlayerId(req);
        const clubs = clubService_1.clubService
            .listClubs()
            .filter((c) => (c.memberIds || []).includes(playerId))
            .map((c) => sanitizeClubForMember(c));
        return res.json({ success: true, clubs, count: clubs.length });
    }
    catch (error) {
        return res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to list clubs',
        });
    }
});
/**
 * POST /api/clubs - Create a new club
 * body: { name: string; description?: string }
 */
router.post('/', requireAuth_1.requireAuth, (req, res) => {
    try {
        const playerId = getAuthedPlayerId(req);
        const { name, description } = req.body;
        const trimmedName = (name || '').trim();
        if (!trimmedName) {
            return res.status(400).json({ success: false, error: 'name is required' });
        }
        if (trimmedName.length > 60) {
            return res.status(400).json({ success: false, error: 'name must be 60 chars or less' });
        }
        const trimmedDesc = typeof description === 'string' ? description.trim() : undefined;
        if (trimmedDesc && trimmedDesc.length > 240) {
            return res.status(400).json({ success: false, error: 'description must be 240 chars or less' });
        }
        const club = clubService_1.clubService.createClub(playerId, trimmedName, trimmedDesc);
        // Best-effort DB persistence for Prisma visibility (behind ENABLE_DB_PERSISTENCE=true).
        void dbPersistenceService_1.dbPersistenceService.ensureClub(club.id).catch(() => { });
        return res.status(201).json({ success: true, club: sanitizeClubForMember(club) });
    }
    catch (error) {
        return res.status(400).json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to create club',
        });
    }
});
/**
 * POST /api/clubs/join - Join a club by invite code
 * body: { inviteCode: string }
 */
router.post('/join', requireAuth_1.requireAuth, (req, res) => {
    try {
        const playerId = getAuthedPlayerId(req);
        const { inviteCode } = req.body;
        const normalized = (inviteCode || '').trim().toUpperCase();
        if (!normalized) {
            return res.status(400).json({ success: false, error: 'inviteCode is required' });
        }
        if (!(0, gameCode_1.isValidGameCode)(normalized)) {
            return res.status(400).json({ success: false, error: 'Invalid invite code format' });
        }
        const club = clubService_1.clubService.joinClubByInviteCode(normalized, playerId);
        // Best-effort DB persistence for Prisma visibility (behind ENABLE_DB_PERSISTENCE=true).
        void dbPersistenceService_1.dbPersistenceService.ensureClub(club.id).catch(() => { });
        return res.json({ success: true, club: sanitizeClubForMember(club) });
    }
    catch (error) {
        return res.status(400).json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to join club',
        });
    }
});
/**
 * GET /api/clubs/:clubId - Get club details (member only)
 */
router.get('/:clubId', requireAuth_1.requireAuth, (req, res) => {
    try {
        const playerId = getAuthedPlayerId(req);
        const clubId = req.params.clubId;
        const club = requireClubMembership(clubId, playerId);
        return res.json({ success: true, club: sanitizeClubForMember(club) });
    }
    catch (error) {
        const msg = error instanceof Error ? error.message : 'Failed to get club';
        const status = msg === 'Club not found' ? 404 : msg === 'Not a member of this club' ? 403 : 400;
        return res.status(status).json({ success: false, error: msg });
    }
});
/**
 * GET /api/clubs/:clubId/games - List active games for this club (member only)
 */
router.get('/:clubId/games', requireAuth_1.requireAuth, (req, res) => {
    try {
        const playerId = getAuthedPlayerId(req);
        const clubId = req.params.clubId;
        requireClubMembership(clubId, playerId);
        const games = gameService_1.gameService.listGamesByClub(clubId);
        return res.json({ success: true, games, count: games.length });
    }
    catch (error) {
        const msg = error instanceof Error ? error.message : 'Failed to list club games';
        const status = msg === 'Club not found' ? 404 : msg === 'Not a member of this club' ? 403 : 400;
        return res.status(status).json({ success: false, error: msg });
    }
});
/**
 * GET /api/clubs/:clubId/history - List club games with full hand history (member only)
 */
router.get('/:clubId/history', requireAuth_1.requireAuth, (req, res) => {
    try {
        const playerId = getAuthedPlayerId(req);
        const clubId = req.params.clubId;
        requireClubMembership(clubId, playerId);
        const games = gameHistoryService_1.gameHistoryService.listGamesForClub(clubId).map((g) => ({
            gameId: g.gameId,
            code: g.code,
            clubId: g.clubId,
            variant: g.variant,
            settings: g.settings,
            createdAt: g.createdAt,
            endedAt: g.endedAt,
            hands: g.hands,
            handsCount: g.hands.length,
        }));
        return res.json({ success: true, games, count: games.length });
    }
    catch (error) {
        const msg = error instanceof Error ? error.message : 'Failed to list club history';
        const status = msg === 'Club not found' ? 404 : msg === 'Not a member of this club' ? 403 : 400;
        return res.status(status).json({ success: false, error: msg });
    }
});
/**
 * POST /api/clubs/:clubId/games - Create a new game in this club (member only)
 * body: { settings?: Partial<GameSettings> }
 */
router.post('/:clubId/games', requireAuth_1.requireAuth, (req, res) => {
    try {
        const playerId = getAuthedPlayerId(req);
        const clubId = req.params.clubId;
        requireClubMembership(clubId, playerId);
        const settings = (req.body?.settings || undefined);
        const { gameId, code } = gameService_1.gameService.createGame(settings, undefined, clubId);
        const game = gameService_1.gameService.getGame(gameId);
        const state = game?.getState();
        return res.status(201).json({ success: true, gameId, code, state });
    }
    catch (error) {
        const msg = error instanceof Error ? error.message : 'Failed to create club game';
        const status = msg === 'Club not found' ? 404 : msg === 'Not a member of this club' ? 403 : 400;
        return res.status(status).json({ success: false, error: msg });
    }
});
exports.default = router;
