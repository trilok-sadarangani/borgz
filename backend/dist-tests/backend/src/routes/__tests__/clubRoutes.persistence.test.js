"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const clubRoutes_1 = __importDefault(require("../clubRoutes"));
const clubService_1 = require("../../services/clubService");
function makeRes() {
    const res = {};
    res.statusCode = 200;
    res.body = undefined;
    res.status = (code) => {
        res.statusCode = code;
        return res;
    };
    res.json = (body) => {
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
        const ensureSpy = jest.spyOn(clubService_1.clubService, 'ensureHydratedFromDb').mockResolvedValue(undefined);
        const listSpy = jest.spyOn(clubService_1.clubService, 'listClubs').mockReturnValue([
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
        const layer = clubRoutes_1.default.stack.find((l) => l?.route?.path === '/');
        expect(layer).toBeTruthy();
        const handler = layer.route.stack[layer.route.stack.length - 1].handle;
        const req = { player: { id: 'p1' } };
        const res = makeRes();
        await handler(req, res);
        expect(ensureSpy).toHaveBeenCalledTimes(1);
        expect(listSpy).toHaveBeenCalledTimes(1);
        expect(res.statusCode).toBe(200);
        expect(res.body?.success).toBe(true);
        expect(res.body?.clubs?.length).toBe(1);
    });
});
