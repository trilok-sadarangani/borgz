"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.clubService = exports.ClubService = void 0;
const uuid_1 = require("uuid");
const gameCode_1 = require("../utils/gameCode");
const prisma_1 = require("../utils/prisma");
function isDbPersistenceEnabled() {
    return String(process.env.ENABLE_DB_PERSISTENCE || '').toLowerCase() === 'true';
}
function toMs(d) {
    if (!d)
        return undefined;
    return d.getTime();
}
/**
 * In-memory club service (Phase 1).
 * Later we will persist this via Postgres/Prisma.
 */
class ClubService {
    constructor() {
        this.clubs = new Map(); // clubId -> club
        this.inviteCodes = new Map(); // inviteCode -> clubId
        this.members = new Map(); // clubId -> (playerId -> member)
        this.hydratedFromDb = false;
    }
    /**
     * Hydrate in-memory club cache from Postgres/Prisma.
     * Safe to call multiple times.
     */
    async loadFromDb() {
        if (!isDbPersistenceEnabled())
            return;
        const prisma = (0, prisma_1.getPrisma)();
        const clubs = await prisma.club.findMany({
            include: { members: true },
        });
        // Replace in-memory state with DB snapshot.
        this.clubs.clear();
        this.inviteCodes.clear();
        this.members.clear();
        for (const c of clubs) {
            const memberIds = (c.members || []).map((m) => m.playerId);
            const record = {
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
            const clubMembers = new Map();
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
    async loadClubsForPlayer(playerId) {
        if (!isDbPersistenceEnabled())
            return;
        const prisma = (0, prisma_1.getPrisma)();
        const clubs = await prisma.club.findMany({
            where: { members: { some: { playerId } } },
            include: { members: true },
        });
        for (const c of clubs) {
            const memberIds = (c.members || []).map((m) => m.playerId);
            const record = {
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
            const clubMembers = new Map();
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
    async ensureHydratedFromDb() {
        if (this.hydratedFromDb)
            return;
        await this.loadFromDb();
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
if (String(process.env.NODE_ENV || '').toLowerCase() !== 'production') {
    try {
        const seedClub = exports.clubService.createClub('seed-alice', 'seed-club');
        exports.clubService.joinClubByInviteCode(seedClub.inviteCode, 'seed-bob');
    }
    catch {
        // Ignore seeding errors (e.g. during tests or if seeds change); service remains usable.
    }
}
