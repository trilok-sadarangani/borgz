"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.clubService = exports.ClubService = void 0;
const uuid_1 = require("uuid");
const gameCode_1 = require("../utils/gameCode");
/**
 * In-memory club service (Phase 1).
 * Later we will persist this via Postgres/Prisma.
 */
class ClubService {
    constructor() {
        this.clubs = new Map(); // clubId -> club
        this.inviteCodes = new Map(); // inviteCode -> clubId
        this.members = new Map(); // clubId -> (playerId -> member)
    }
    createClub(ownerId, name, description) {
        const id = (0, uuid_1.v4)();
        let inviteCode = (0, gameCode_1.generateGameCode)(8);
        while (this.inviteCodes.has(inviteCode))
            inviteCode = (0, gameCode_1.generateGameCode)(8);
        const now = Date.now();
        const club = {
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
        const clubMembers = new Map();
        clubMembers.set(ownerId, { clubId: id, playerId: ownerId, joinedAt: now, role: 'owner' });
        this.members.set(id, clubMembers);
        return club;
    }
    getClub(clubId) {
        return this.clubs.get(clubId);
    }
    listClubs() {
        return Array.from(this.clubs.values());
    }
    getClubByInviteCode(inviteCode) {
        const clubId = this.inviteCodes.get(inviteCode.toUpperCase());
        if (!clubId)
            return undefined;
        return this.clubs.get(clubId);
    }
    joinClubByInviteCode(inviteCode, playerId) {
        const club = this.getClubByInviteCode(inviteCode);
        if (!club)
            throw new Error('Club not found');
        const now = Date.now();
        const clubMembers = this.members.get(club.id) || new Map();
        if (clubMembers.has(playerId))
            return club;
        clubMembers.set(playerId, { clubId: club.id, playerId, joinedAt: now, role: 'member' });
        this.members.set(club.id, clubMembers);
        club.memberIds = Array.from(clubMembers.keys());
        club.updatedAt = now;
        this.clubs.set(club.id, club);
        return club;
    }
    listMembers(clubId) {
        const clubMembers = this.members.get(clubId);
        if (!clubMembers)
            return [];
        return Array.from(clubMembers.values());
    }
}
exports.ClubService = ClubService;
exports.clubService = new ClubService();
// --- Seed data (dev-only, in-memory) ---
// Create exactly one seed club that already contains Alice + Bob.
try {
    const seedClub = exports.clubService.createClub('seed-alice', 'seed-club');
    exports.clubService.joinClubByInviteCode(seedClub.inviteCode, 'seed-bob');
}
catch {
    // Ignore seeding errors (e.g. during tests or if seeds change); service remains usable.
}
