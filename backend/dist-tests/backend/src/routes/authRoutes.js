"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authService_1 = require("../services/authService");
const requireAuth_1 = require("../middleware/requireAuth");
const router = (0, express_1.Router)();
/**
 * GET /api/auth/seed/players - List all available seed auth players
 */
router.get('/seed/players', (_req, res) => {
    try {
        const players = authService_1.authService.listSeedAuthPlayers();
        return res.json({ success: true, players, count: players.length });
    }
    catch (error) {
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
router.post('/login', (req, res) => {
    try {
        const { playerId, password } = req.body;
        if (!playerId) {
            return res.status(400).json({ success: false, error: 'playerId is required' });
        }
        if (!password) {
            return res.status(400).json({ success: false, error: 'password is required' });
        }
        const session = authService_1.authService.loginWithSeedPlayer(playerId, password);
        return res.json({
            success: true,
            token: session.token,
            player: session.player,
            createdAt: session.createdAt,
        });
    }
    catch (error) {
        return res.status(400).json({
            success: false,
            error: error instanceof Error ? error.message : 'Login failed',
        });
    }
});
/**
 * GET /api/auth/me - Get current authenticated seed player
 */
router.get('/me', requireAuth_1.requireAuth, (req, res) => {
    const player = req.player;
    return res.json({ success: true, player });
});
/**
 * POST /api/auth/logout - Revoke current token
 */
router.post('/logout', requireAuth_1.requireAuth, (req, res) => {
    const token = req.token;
    authService_1.authService.logout(token);
    return res.json({ success: true });
});
exports.default = router;
