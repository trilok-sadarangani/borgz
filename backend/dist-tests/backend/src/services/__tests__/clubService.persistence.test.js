"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const clubService_1 = require("../clubService");
const prismaMod = __importStar(require("../../utils/prisma"));
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
        const prismaStub = {
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
        const svc = new clubService_1.ClubService();
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
        const prismaStub = {
            club: {
                findMany: jest.fn().mockResolvedValue([]),
            },
        };
        jest.spyOn(prismaMod, 'getPrisma').mockReturnValue(prismaStub);
        const svc = new clubService_1.ClubService();
        await svc.ensureHydratedFromDb();
        await svc.ensureHydratedFromDb();
        expect(prismaStub.club.findMany).toHaveBeenCalledTimes(1);
    });
});
