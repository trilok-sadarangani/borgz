import { Router, Request, Response } from 'express';
import { gameService } from '../services/gameService';
import { GameSettings } from '../types';

const router = Router();

/**
 * POST /api/games - Create a new game
 */
router.post('/', (req: Request, res: Response) => {
  try {
    const settings = req.body.settings as Partial<GameSettings>;
    const customCode = req.body.code as string | undefined;

    const { gameId, code } = gameService.createGame(settings, customCode);
    const game = gameService.getGame(gameId);
    const state = game?.getState();

    res.status(201).json({
      success: true,
      gameId,
      code,
      state,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create game',
    });
  }
});

/**
 * GET /api/games/:code - Get game state by code
 */
router.get('/:code', (req: Request, res: Response) => {
  try {
    const { code } = req.params;
    const game = gameService.getGameByCode(code);

    if (!game) {
      return res.status(404).json({
        success: false,
        error: 'Game not found',
      });
    }

    const state = game.getState();
    res.json({
      success: true,
      state,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get game',
    });
  }
});

/**
 * POST /api/games/:code/join - Join a game
 */
router.post('/:code/join', (req: Request, res: Response) => {
  try {
    const { code } = req.params;
    const { playerId, name, avatar } = req.body;

    if (!playerId || !name) {
      return res.status(400).json({
        success: false,
        error: 'playerId and name are required',
      });
    }

    const game = gameService.getGameByCode(code);
    if (!game) {
      return res.status(404).json({
        success: false,
        error: 'Game not found',
      });
    }

    game.addPlayer(playerId, name, avatar);
    const state = game.getState();

    res.json({
      success: true,
      state,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to join game',
    });
  }
});

/**
 * POST /api/games/:code/start - Start a game
 */
router.post('/:code/start', (req: Request, res: Response) => {
  try {
    const { code } = req.params;
    const game = gameService.getGameByCode(code);

    if (!game) {
      return res.status(404).json({
        success: false,
        error: 'Game not found',
      });
    }

    game.startGame();
    const state = game.getState();

    res.json({
      success: true,
      state,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to start game',
    });
  }
});

/**
 * GET /api/games - List all active games
 */
router.get('/', (req: Request, res: Response) => {
  try {
    const games = gameService.listGames();
    res.json({
      success: true,
      games,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to list games',
    });
  }
});

export default router;

