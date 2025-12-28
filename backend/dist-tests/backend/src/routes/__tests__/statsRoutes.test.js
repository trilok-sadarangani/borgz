"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const statsRoutes_1 = __importDefault(require("../statsRoutes"));
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
describe('statsRoutes', () => {
    it('GET /me returns success with stable shape for an authed player (no data)', async () => {
        const layer = statsRoutes_1.default.stack.find((l) => l?.route?.path === '/me');
        expect(layer).toBeTruthy();
        // Route stack is [requireAuth, handler]; call handler directly.
        const handler = layer.route.stack[layer.route.stack.length - 1].handle;
        const req = {
            query: {},
            player: { id: 'seed-alice' },
        };
        const res = makeRes();
        await handler(req, res);
        expect(res.statusCode).toBe(200);
        expect(res.body).toBeTruthy();
        expect(res.body.success).toBe(true);
        expect(res.body.summary).toBeTruthy();
        expect(res.body.gamesInRange).toBeTruthy();
        expect(res.body.vsOpponents).toBeTruthy();
    });
    it('GET /me accepts query params without throwing (parsing smoke test)', async () => {
        const layer = statsRoutes_1.default.stack.find((l) => l?.route?.path === '/me');
        const handler = layer.route.stack[layer.route.stack.length - 1].handle;
        const req = {
            query: {
                from: String(Date.now() - 7 * 86400 * 1000),
                to: String(Date.now()),
                depthBucket: '50-100',
                variant: 'texas-holdem',
                clubId: 'club1',
                gameId: 'g1',
            },
            player: { id: 'seed-alice' },
        };
        const res = makeRes();
        await handler(req, res);
        expect(res.body?.success).toBe(true);
    });
});
