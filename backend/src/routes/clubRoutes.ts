import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/requireAuth';
import { clubService } from '../services/clubService';
import { dbPersistenceService } from '../services/dbPersistenceService';
import { gameService } from '../services/gameService';
import { gameHistoryService } from '../services/gameHistoryService';
import { isValidGameCode } from '../utils/gameCode';
import { Club, GameSettings } from '../types';

const router = Router();

function getAuthedPlayerId(req: Request): string {
  const player = (req as unknown as { player?: { id?: string } }).player;
  if (!player?.id) throw new Error('Missing authenticated player');
  return player.id;
}

function sanitizeClubForMember(club: Club & { inviteCode?: string }): Club {
  // Phase 1: return inviteCode to any member (and owner). We can tighten later.
  return club;
}

function requireClubMembership(clubId: string, playerId: string): Club & { inviteCode?: string } {
  const club = clubService.getClub(clubId);
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
router.get('/', requireAuth, (req: Request, res: Response) => {
  try {
    const playerId = getAuthedPlayerId(req);
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/7ef88ac2-16a0-4d92-9c65-f291348accf1',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'clubRoutes.ts:GET /api/clubs',message:'Fetching clubs for player',data:{playerId,allClubsCount:clubService.listClubs().length,allClubIds:clubService.listClubs().map(c=>c.id),enableDbPersistence:process.env.ENABLE_DB_PERSISTENCE},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H1,H2,H3'})}).catch(()=>{});
    // #endregion
    const clubs = clubService
      .listClubs()
      .filter((c) => (c.memberIds || []).includes(playerId))
      .map((c) => sanitizeClubForMember(c));

    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/7ef88ac2-16a0-4d92-9c65-f291348accf1',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'clubRoutes.ts:GET /api/clubs result',message:'Filtered clubs for player',data:{playerId,filteredClubsCount:clubs.length,filteredClubIds:clubs.map(c=>c.id)},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H2,H3'})}).catch(()=>{});
    // #endregion
    return res.json({ success: true, clubs, count: clubs.length });
  } catch (error) {
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
router.post('/', requireAuth, (req: Request, res: Response) => {
  try {
    const playerId = getAuthedPlayerId(req);
    const { name, description } = req.body as { name?: string; description?: string };

    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/7ef88ac2-16a0-4d92-9c65-f291348accf1',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'clubRoutes.ts:POST /api/clubs',message:'Creating club',data:{playerId,name,enableDbPersistence:process.env.ENABLE_DB_PERSISTENCE},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H1,H3'})}).catch(()=>{});
    // #endregion

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

    const club = clubService.createClub(playerId, trimmedName, trimmedDesc);
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/7ef88ac2-16a0-4d92-9c65-f291348accf1',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'clubRoutes.ts:POST /api/clubs created',message:'Club created in memory',data:{clubId:club.id,playerId,inviteCode:club.inviteCode},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H2'})}).catch(()=>{});
    // #endregion
    // Best-effort DB persistence for Prisma visibility (behind ENABLE_DB_PERSISTENCE=true).
    void dbPersistenceService.ensureClub(club.id).catch((err) => {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/7ef88ac2-16a0-4d92-9c65-f291348accf1',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'clubRoutes.ts:POST /api/clubs db error',message:'DB persistence failed',data:{clubId:club.id,error:String(err)},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H4'})}).catch(()=>{});
      // #endregion
    });
    return res.status(201).json({ success: true, club: sanitizeClubForMember(club) });
  } catch (error) {
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
router.post('/join', requireAuth, (req: Request, res: Response) => {
  try {
    const playerId = getAuthedPlayerId(req);
    const { inviteCode } = req.body as { inviteCode?: string };
    const normalized = (inviteCode || '').trim().toUpperCase();

    if (!normalized) {
      return res.status(400).json({ success: false, error: 'inviteCode is required' });
    }
    if (!isValidGameCode(normalized)) {
      return res.status(400).json({ success: false, error: 'Invalid invite code format' });
    }

    const club = clubService.joinClubByInviteCode(normalized, playerId);
    // Best-effort DB persistence for Prisma visibility (behind ENABLE_DB_PERSISTENCE=true).
    void dbPersistenceService.ensureClub(club.id).catch(() => {});
    return res.json({ success: true, club: sanitizeClubForMember(club) });
  } catch (error) {
    return res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to join club',
    });
  }
});

/**
 * GET /api/clubs/:clubId - Get club details (member only)
 */
router.get('/:clubId', requireAuth, (req: Request, res: Response) => {
  try {
    const playerId = getAuthedPlayerId(req);
    const clubId = req.params.clubId;
    const club = requireClubMembership(clubId, playerId);
    return res.json({ success: true, club: sanitizeClubForMember(club) });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to get club';
    const status = msg === 'Club not found' ? 404 : msg === 'Not a member of this club' ? 403 : 400;
    return res.status(status).json({ success: false, error: msg });
  }
});

/**
 * GET /api/clubs/:clubId/games - List active games for this club (member only)
 */
router.get('/:clubId/games', requireAuth, (req: Request, res: Response) => {
  try {
    const playerId = getAuthedPlayerId(req);
    const clubId = req.params.clubId;
    requireClubMembership(clubId, playerId);
    const games = gameService.listGamesByClub(clubId);
    return res.json({ success: true, games, count: games.length });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to list club games';
    const status = msg === 'Club not found' ? 404 : msg === 'Not a member of this club' ? 403 : 400;
    return res.status(status).json({ success: false, error: msg });
  }
});

/**
 * GET /api/clubs/:clubId/history - List club games with full hand history (member only)
 */
router.get('/:clubId/history', requireAuth, (req: Request, res: Response) => {
  try {
    const playerId = getAuthedPlayerId(req);
    const clubId = req.params.clubId;
    requireClubMembership(clubId, playerId);

    const games = gameHistoryService.listGamesForClub(clubId).map((g) => ({
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
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to list club history';
    const status = msg === 'Club not found' ? 404 : msg === 'Not a member of this club' ? 403 : 400;
    return res.status(status).json({ success: false, error: msg });
  }
});

/**
 * POST /api/clubs/:clubId/games - Create a new game in this club (member only)
 * body: { settings?: Partial<GameSettings> }
 */
router.post('/:clubId/games', requireAuth, (req: Request, res: Response) => {
  try {
    const playerId = getAuthedPlayerId(req);
    const clubId = req.params.clubId;
    requireClubMembership(clubId, playerId);

    const settings = (req.body?.settings || undefined) as Partial<GameSettings> | undefined;
    const { gameId, code } = gameService.createGame(settings, undefined, clubId);
    const game = gameService.getGame(gameId);
    const state = game?.getState();

    return res.status(201).json({ success: true, gameId, code, state });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to create club game';
    const status = msg === 'Club not found' ? 404 : msg === 'Not a member of this club' ? 403 : 400;
    return res.status(status).json({ success: false, error: msg });
  }
});

export default router;


