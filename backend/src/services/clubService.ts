import { v4 as uuidv4 } from 'uuid';
import { Club, ClubMember } from '../types';
import { generateGameCode } from '../utils/gameCode';
import { getPrisma } from '../utils/prisma';

interface ClubRecord extends Club {
  inviteCode: string;
}

function isDbPersistenceEnabled(): boolean {
  return String(process.env.ENABLE_DB_PERSISTENCE || '').toLowerCase() === 'true';
}

function toMs(d: Date | null | undefined): number | undefined {
  if (!d) return undefined;
  return d.getTime();
}

/**
 * In-memory club service (Phase 1).
 * Later we will persist this via Postgres/Prisma.
 */
export class ClubService {
  private clubs: Map<string, ClubRecord> = new Map(); // clubId -> club
  private inviteCodes: Map<string, string> = new Map(); // inviteCode -> clubId
  private members: Map<string, Map<string, ClubMember>> = new Map(); // clubId -> (playerId -> member)
  private hydratedFromDb = false;

  /**
   * Hydrate in-memory club cache from Postgres/Prisma.
   * Safe to call multiple times.
   */
  async loadFromDb(): Promise<void> {
    if (!isDbPersistenceEnabled()) return;

    const prisma = getPrisma();
    const clubs = await prisma.club.findMany({
      include: { members: true },
    });

    // Replace in-memory state with DB snapshot.
    this.clubs.clear();
    this.inviteCodes.clear();
    this.members.clear();

    for (const c of clubs) {
      const memberIds = (c.members || []).map((m) => m.playerId);
      const record: ClubRecord = {
        id: c.id,
        name: c.name,
        description: c.description || undefined,
        ownerId: c.ownerId,
        memberIds,
        createdAt: toMs(c.createdAt) ?? Date.now(),
        updatedAt: toMs(c.updatedAt) ?? Date.now(),
        inviteCode: c.inviteCode,
      };

      this.clubs.set(record.id, record);
      this.inviteCodes.set(record.inviteCode.toUpperCase(), record.id);

      const clubMembers = new Map<string, ClubMember>();
      for (const m of c.members || []) {
        const role = m.role === 'owner' ? 'owner' : 'member';
        clubMembers.set(m.playerId, {
          clubId: record.id,
          playerId: m.playerId,
          role,
          joinedAt: toMs(m.joinedAt) ?? record.createdAt,
        });
      }
      this.members.set(record.id, clubMembers);
    }

    this.hydratedFromDb = true;
  }

  /**
   * Lazy-load only the requesting player's clubs (optional optimization).
   * Note: this merges into the current in-memory cache.
   */
  async loadClubsForPlayer(playerId: string): Promise<void> {
    if (!isDbPersistenceEnabled()) return;
    const prisma = getPrisma();
    const clubs = await prisma.club.findMany({
      where: { members: { some: { playerId } } },
      include: { members: true },
    });

    for (const c of clubs) {
      const memberIds = (c.members || []).map((m) => m.playerId);
      const record: ClubRecord = {
        id: c.id,
        name: c.name,
        description: c.description || undefined,
        ownerId: c.ownerId,
        memberIds,
        createdAt: toMs(c.createdAt) ?? Date.now(),
        updatedAt: toMs(c.updatedAt) ?? Date.now(),
        inviteCode: c.inviteCode,
      };

      this.clubs.set(record.id, record);
      this.inviteCodes.set(record.inviteCode.toUpperCase(), record.id);

      const clubMembers = new Map<string, ClubMember>();
      for (const m of c.members || []) {
        const role = m.role === 'owner' ? 'owner' : 'member';
        clubMembers.set(m.playerId, {
          clubId: record.id,
          playerId: m.playerId,
          role,
          joinedAt: toMs(m.joinedAt) ?? record.createdAt,
        });
      }
      this.members.set(record.id, clubMembers);
    }
  }

  async ensureHydratedFromDb(): Promise<void> {
    if (this.hydratedFromDb) return;
    await this.loadFromDb();
  }

  createClub(ownerId: string, name: string, description?: string): ClubRecord {
    const id = uuidv4();
    let inviteCode = generateGameCode(8);
    while (this.inviteCodes.has(inviteCode)) inviteCode = generateGameCode(8);

    const now = Date.now();
    const club: ClubRecord = {
      id,
      name,
      description,
      ownerId,
      memberIds: [ownerId],
      createdAt: now,
      updatedAt: now,
      inviteCode,
    };

    this.clubs.set(id, club);
    this.inviteCodes.set(inviteCode, id);

    const clubMembers = new Map<string, ClubMember>();
    clubMembers.set(ownerId, { clubId: id, playerId: ownerId, joinedAt: now, role: 'owner' });
    this.members.set(id, clubMembers);

    return club;
  }

  getClub(clubId: string): ClubRecord | undefined {
    return this.clubs.get(clubId);
  }

  listClubs(): ClubRecord[] {
    return Array.from(this.clubs.values());
  }

  getClubByInviteCode(inviteCode: string): ClubRecord | undefined {
    const clubId = this.inviteCodes.get(inviteCode.toUpperCase());
    if (!clubId) return undefined;
    return this.clubs.get(clubId);
  }

  joinClubByInviteCode(inviteCode: string, playerId: string): ClubRecord {
    const club = this.getClubByInviteCode(inviteCode);
    if (!club) throw new Error('Club not found');

    const now = Date.now();
    const clubMembers = this.members.get(club.id) || new Map<string, ClubMember>();
    if (clubMembers.has(playerId)) return club;

    clubMembers.set(playerId, { clubId: club.id, playerId, joinedAt: now, role: 'member' });
    this.members.set(club.id, clubMembers);

    club.memberIds = Array.from(clubMembers.keys());
    club.updatedAt = now;
    this.clubs.set(club.id, club);

    return club;
  }

  listMembers(clubId: string): ClubMember[] {
    const clubMembers = this.members.get(clubId);
    if (!clubMembers) return [];
    return Array.from(clubMembers.values());
  }
}

export const clubService = new ClubService();

// --- Seed data (dev-only, in-memory) ---
// Create exactly one seed club that already contains Alice + Bob.
if (String(process.env.NODE_ENV || '').toLowerCase() !== 'production') {
  try {
    const seedClub = clubService.createClub('seed-alice', 'seed-club');
    clubService.joinClubByInviteCode(seedClub.inviteCode, 'seed-bob');
  } catch {
    // Ignore seeding errors (e.g. during tests or if seeds change); service remains usable.
  }
}

