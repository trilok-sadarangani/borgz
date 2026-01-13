import { ClubService } from '../clubService';
import * as prismaMod from '../../utils/prisma';

describe('ClubService persistence hydration', () => {
  const oldEnv = process.env.ENABLE_DB_PERSISTENCE;

  beforeEach(() => {
    process.env.ENABLE_DB_PERSISTENCE = 'true';
  });

  afterEach(() => {
    process.env.ENABLE_DB_PERSISTENCE = oldEnv;
    jest.restoreAllMocks();
  });

  it('loadFromDb hydrates clubs, invite codes, and members from Prisma', async () => {
    const createdAt = new Date('2026-01-01T00:00:00.000Z');
    const updatedAt = new Date('2026-01-02T00:00:00.000Z');
    const joinedAt = new Date('2026-01-01T12:00:00.000Z');

    const prismaStub: any = {
      club: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'club-1',
            name: 'My Club',
            description: 'desc',
            inviteCode: 'ABCD1234',
            ownerId: 'p1',
            createdAt,
            updatedAt,
            members: [
              { playerId: 'p1', role: 'owner', joinedAt },
              { playerId: 'p2', role: 'member', joinedAt },
            ],
          },
        ]),
      },
    };

    jest.spyOn(prismaMod, 'getPrisma').mockReturnValue(prismaStub);

    const svc = new ClubService();
    // prove cache is replaced (not appended)
    svc.createClub('seed', 'seed');

    await svc.loadFromDb();

    const clubs = svc.listClubs();
    expect(clubs).toHaveLength(1);
    expect(clubs[0].id).toBe('club-1');
    expect(clubs[0].name).toBe('My Club');
    expect(clubs[0].ownerId).toBe('p1');
    expect(clubs[0].memberIds.sort()).toEqual(['p1', 'p2']);
    expect(clubs[0].createdAt).toBe(createdAt.getTime());
    expect(clubs[0].updatedAt).toBe(updatedAt.getTime());

    // invite code lookup should be case-insensitive
    const byInvite = svc.getClubByInviteCode('abcd1234');
    expect(byInvite?.id).toBe('club-1');

    const members = svc.listMembers('club-1');
    expect(members.map((m) => m.playerId).sort()).toEqual(['p1', 'p2']);
    expect(members.find((m) => m.playerId === 'p1')?.role).toBe('owner');
  });

  it('ensureHydratedFromDb only hydrates once', async () => {
    const prismaStub: any = {
      club: {
        findMany: jest.fn().mockResolvedValue([]),
      },
    };
    jest.spyOn(prismaMod, 'getPrisma').mockReturnValue(prismaStub);

    const svc = new ClubService();
    await svc.ensureHydratedFromDb();
    await svc.ensureHydratedFromDb();

    expect(prismaStub.club.findMany).toHaveBeenCalledTimes(1);
  });
});

