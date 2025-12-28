import { v4 as uuidv4 } from 'uuid';
import { Club, ClubMember } from '../types';
import { generateGameCode } from '../utils/gameCode';

interface ClubRecord extends Club {
  inviteCode: string;
}

/**
 * In-memory club service (Phase 1).
 * Later we will persist this via Postgres/Prisma.
 */
export class ClubService {
  private clubs: Map<string, ClubRecord> = new Map(); // clubId -> club
  private inviteCodes: Map<string, string> = new Map(); // inviteCode -> clubId
  private members: Map<string, Map<string, ClubMember>> = new Map(); // clubId -> (playerId -> member)

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
try {
  const seedClub = clubService.createClub('seed-alice', 'seed-club');
  clubService.joinClubByInviteCode(seedClub.inviteCode, 'seed-bob');
} catch {
  // Ignore seeding errors (e.g. during tests or if seeds change); service remains usable.
}


