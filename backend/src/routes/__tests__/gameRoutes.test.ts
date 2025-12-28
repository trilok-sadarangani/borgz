import gameRoutes from '../gameRoutes';
import { gameService } from '../../services/gameService';

function makeRes() {
  const res: any = {};
  res.statusCode = 200;
  res.body = undefined;
  res.status = (code: number) => {
    res.statusCode = code;
    return res;
  };
  res.json = (body: unknown) => {
    res.body = body;
    return res;
  };
  return res;
}

describe('gameRoutes', () => {
  it('POST /:code/join is idempotent for existing players (rejoin after leave/disconnect)', async () => {
    const { gameId, code } = gameService.createGame(undefined, 'REJOIN1');

    try {
      const layer = (gameRoutes as any).stack.find((l: any) => l?.route?.path === '/:code/join');
      expect(layer).toBeTruthy();

      const handler = layer.route.stack[layer.route.stack.length - 1].handle as Function;

      const req1: any = { params: { code }, body: { playerId: 'p1', name: 'Alice' } };
      const res1 = makeRes();
      await handler(req1, res1);
      expect(res1.statusCode).toBe(200);
      expect(res1.body?.success).toBe(true);

      // Rejoin with same playerId should NOT throw / should not fail.
      const req2: any = { params: { code }, body: { playerId: 'p1', name: 'Alice' } };
      const res2 = makeRes();
      await handler(req2, res2);
      expect(res2.statusCode).toBe(200);
      expect(res2.body?.success).toBe(true);

      // Still exactly 1 instance of p1 in the game.
      const g = gameService.getGame(gameId);
      expect(g).toBeTruthy();
      const state = g!.getState();
      expect(state.players.filter((p) => p.id === 'p1').length).toBe(1);
    } finally {
      gameService.removeGame(gameId);
    }
  });
});


