import { v4 as uuidv4 } from 'uuid';
import { DbPersistenceService } from '../dbPersistenceService';
import { StoredHand } from '../gameHistoryService';
import { createDefaultTexasHoldemSettings } from '../../game/variants/texasHoldem';
import { getPrisma } from '../../utils/prisma';
import type { PrismaClient } from '@prisma/client';

function shouldRunDbTests(): boolean {
  return String(process.env.RUN_DB_TESTS || '').toLowerCase() === 'true';
}

function getDbUrl(): string {
  // Prefer explicit DATABASE_URL. Fall back to the local docker mapping we use in development.
  return (
    process.env.DATABASE_URL ||
    'postgresql://borgz:borgz@localhost:5433/borgz?schema=public'
  );
}

const maybeDescribe = shouldRunDbTests() ? describe : describe.skip;

maybeDescribe('DbPersistenceService (Postgres integration)', () => {
  let prisma: PrismaClient;
  let svc: DbPersistenceService;

  beforeAll(async () => {
    process.env.ENABLE_DB_PERSISTENCE = 'true';
    svc = new DbPersistenceService();

    // Fail fast with a clearer error if DB isn't reachable.
    process.env.DATABASE_URL = getDbUrl();
    prisma = getPrisma();
    await prisma.$queryRaw`SELECT 1`;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  test('persists game created + hand finished (hand + actions) + game ended', async () => {
    const gameId = `test-${uuidv4()}`;
    const code = `T${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
    const settings = { ...createDefaultTexasHoldemSettings(), variant: 'texas-holdem' as const };

    // 1) game created
    await svc.persistGameCreated({
      gameId,
      code,
      clubId: 'seed-club',
      variant: 'texas-holdem',
      settings,
      createdAt: Date.now(),
    });

    const g = await prisma.game.findUnique({ where: { id: gameId } });
    expect(g).toBeTruthy();
    expect(g?.code).toBe(code);
    expect(g?.clubId).toBe('seed-club');
    expect(g?.variant).toBe('texas-holdem');

    // 2) hand finished
    const now = Date.now();
    const seats = ['seed-alice', 'seed-bob'];
    const hand: StoredHand = {
      handNumber: 1,
      startedAt: now - 2000,
      endedAt: now,
      reason: 'fold',
      winners: [{ playerId: 'seed-alice', amount: 30 }],
      pot: 30,
      communityCards: [],
      actions: [
        {
          playerId: 'seed-bob',
          action: 'post-blind',
          amount: 10,
          phase: 'pre-flop',
          betTo: 10,
          currentBetAfter: 20,
          timestamp: now - 1500,
        },
        {
          playerId: 'seed-alice',
          action: 'post-blind',
          amount: 20,
          phase: 'pre-flop',
          betTo: 20,
          currentBetAfter: 20,
          timestamp: now - 1400,
        },
        {
          playerId: 'seed-bob',
          action: 'raise',
          amount: 60,
          phase: 'pre-flop',
          betTo: 60,
          currentBetAfter: 60,
          timestamp: now - 1200,
        },
        {
          playerId: 'seed-alice',
          action: 'fold',
          phase: 'pre-flop',
          betTo: 20,
          currentBetAfter: 60,
          timestamp: now - 1100,
        },
      ],
      table: {
        seats,
        dealerPosition: 0,
        smallBlindPosition: 0,
        bigBlindPosition: 1,
      },
      stacksStartByPlayerId: { 'seed-alice': 1000, 'seed-bob': 1000 },
      stacksEndByPlayerId: { 'seed-alice': 1010, 'seed-bob': 990 },
    };

    await svc.persistHandFinished(gameId, hand);

    const hands = await prisma.gameHand.findMany({
      where: { gameId },
      include: { actions: true },
      orderBy: { handNumber: 'asc' },
    });
    expect(hands).toHaveLength(1);
    expect(hands[0].handNumber).toBe(1);
    expect(hands[0].endReason).toBe('fold');
    expect(hands[0].pot).toBe(30);
    expect(hands[0].winnerIds).toEqual(['seed-alice']);
    expect(hands[0].actions).toHaveLength(hand.actions.length);

    const raises = hands[0].actions.filter((a) => a.action === 'raise');
    expect(raises).toHaveLength(1);
    expect(raises[0].amount).toBe(60);
    expect(raises[0].betTo).toBe(60);
    expect(raises[0].currentBetAfter).toBe(60);

    // 3) game ended
    const endedAt = Date.now();
    await svc.persistGameEnded(gameId, endedAt);
    const endedGame = await prisma.game.findUnique({ where: { id: gameId } });
    expect(endedGame?.phase).toBe('finished');
    expect(endedGame?.finishedAt).toBeTruthy();

    // cleanup (only delete our game subtree; keep seed players/clubs)
    await prisma.game.delete({ where: { id: gameId } });
  });

  test('ensureClub persists club + club members', async () => {
    // The seed club is created in-memory by clubService at module load time.
    await svc.ensureClub('seed-club');

    const club = await prisma.club.findUnique({ where: { id: 'seed-club' }, include: { members: true } });
    expect(club).toBeTruthy();
    expect(club?.inviteCode).toBeTruthy();
    expect(club?.members?.length).toBeGreaterThanOrEqual(1);

    const aliceMember = club?.members.find((m) => m.playerId === 'seed-alice');
    expect(aliceMember).toBeTruthy();
    expect(aliceMember?.role).toBe('owner');
  });
});


