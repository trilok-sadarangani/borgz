import clubRoutes from '../clubRoutes';
import { clubService } from '../../services/clubService';

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

describe('clubRoutes persistence', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('GET / (list clubs) awaits hydration before reading from cache', async () => {
    const ensureSpy = jest.spyOn(clubService as any, 'ensureHydratedFromDb').mockResolvedValue(undefined);
    const listSpy = jest.spyOn(clubService as any, 'listClubs').mockReturnValue([
      {
        id: 'club-1',
        name: 'C1',
        ownerId: 'p1',
        memberIds: ['p1'],
        createdAt: Date.now(),
        updatedAt: Date.now(),
        inviteCode: 'INVITE',
      },
    ]);

    const layer = (clubRoutes as any).stack.find((l: any) => l?.route?.path === '/');
    expect(layer).toBeTruthy();

    const handler = layer.route.stack[layer.route.stack.length - 1].handle as Function;
    const req: any = { player: { id: 'p1' } };
    const res = makeRes();

    await handler(req, res);

    expect(ensureSpy).toHaveBeenCalledTimes(1);
    expect(listSpy).toHaveBeenCalledTimes(1);
    expect(res.statusCode).toBe(200);
    expect(res.body?.success).toBe(true);
    expect(res.body?.clubs?.length).toBe(1);
  });
});

