"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const requireAuth_1 = require("../requireAuth");
const authService_1 = require("../../services/authService");
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
function makeReqWithBearer(token) {
    return {
        header: (k) => (k.toLowerCase() === 'authorization' ? `Bearer ${token}` : undefined),
    };
}
async function importJose() {
    // `jose` is ESM-only; load it via native dynamic import so Jest (CJS) can run it.
    // eslint-disable-next-line no-new-func
    return await Function('return import("jose")')();
}
describe('requireAuth (Auth0 JWT mode)', () => {
    const prevEnv = process.env;
    beforeEach(() => {
        process.env = { ...prevEnv };
    });
    afterAll(() => {
        process.env = prevEnv;
    });
    it('falls back to seed auth when AUTH0_AUDIENCE is not set', async () => {
        delete process.env.AUTH0_AUDIENCE;
        delete process.env.AUTH0_DOMAIN;
        delete process.env.AUTH0_ISSUER;
        delete process.env.AUTH0_JWKS_JSON;
        const session = authService_1.authService.loginWithSeedPlayer('seed-alice', 'borgz');
        const req = makeReqWithBearer(session.token);
        const res = makeRes();
        let nextCalled = false;
        const next = () => {
            nextCalled = true;
        };
        await (0, requireAuth_1.requireAuth)(req, res, next);
        expect(nextCalled).toBe(true);
        expect(req.player?.id).toBe('seed-alice');
        expect(req.token).toBe(session.token);
    });
    it('falls back to seed auth when AUTH0_AUDIENCE is set but issuer/domain are missing', async () => {
        process.env.AUTH0_AUDIENCE = 'borgz.com';
        delete process.env.AUTH0_DOMAIN;
        delete process.env.AUTH0_ISSUER;
        delete process.env.AUTH0_JWKS_JSON;
        const session = authService_1.authService.loginWithSeedPlayer('seed-bob', 'borgz');
        const req = makeReqWithBearer(session.token);
        const res = makeRes();
        let nextCalled = false;
        const next = () => {
            nextCalled = true;
        };
        await (0, requireAuth_1.requireAuth)(req, res, next);
        expect(nextCalled).toBe(true);
        expect(req.player?.id).toBe('seed-bob');
        expect(req.token).toBe(session.token);
    });
    it('falls back to seed auth when AUTH0_* is set but token is not a JWT (prevents Invalid Compact JWS)', async () => {
        process.env.AUTH0_DOMAIN = 'dev-hl2hhkyfntxf14em.us.auth0.com';
        process.env.AUTH0_AUDIENCE = 'borgz.com';
        delete process.env.AUTH0_JWKS_JSON;
        const session = authService_1.authService.loginWithSeedPlayer('seed-alice', 'borgz');
        const req = makeReqWithBearer(session.token); // seed token (not JWT)
        const res = makeRes();
        let nextCalled = false;
        const next = () => {
            nextCalled = true;
        };
        await (0, requireAuth_1.requireAuth)(req, res, next);
        expect(nextCalled).toBe(true);
        expect(req.player?.id).toBe('seed-alice');
        expect(req.token).toBe(session.token);
    });
    it('rejects non-JWT bearer tokens in production when Auth0 is configured', async () => {
        process.env.NODE_ENV = 'production';
        process.env.AUTH0_DOMAIN = 'dev-hl2hhkyfntxf14em.us.auth0.com';
        process.env.AUTH0_AUDIENCE = 'borgz.com';
        const session = authService_1.authService.loginWithSeedPlayer('seed-alice', 'borgz');
        const req = makeReqWithBearer(session.token); // not a JWT
        const res = makeRes();
        const next = () => undefined;
        await (0, requireAuth_1.requireAuth)(req, res, next);
        expect(res.statusCode).toBe(401);
        expect(res.body?.success).toBe(false);
    });
    it('accepts a valid JWT (issuer derived from AUTH0_DOMAIN) and attaches req.player', async () => {
        const { generateKeyPair, exportJWK, SignJWT } = await importJose();
        const { publicKey, privateKey } = await generateKeyPair('RS256');
        const jwk = await exportJWK(publicKey);
        jwk.kid = 'test-kid';
        process.env.AUTH0_DOMAIN = 'dev-hl2hhkyfntxf14em.us.auth0.com';
        process.env.AUTH0_AUDIENCE = 'borgz.com';
        process.env.AUTH0_JWKS_JSON = JSON.stringify({ keys: [jwk] });
        const token = await new SignJWT({ name: 'Test User' })
            .setProtectedHeader({ alg: 'RS256', kid: 'test-kid' })
            .setIssuer(`https://${process.env.AUTH0_DOMAIN}/`)
            .setAudience(process.env.AUTH0_AUDIENCE)
            .setSubject('auth0|user_123')
            .setIssuedAt()
            .setExpirationTime('1h')
            .sign(privateKey);
        const req = makeReqWithBearer(token);
        const res = makeRes();
        let nextCalled = false;
        const next = () => {
            nextCalled = true;
        };
        await (0, requireAuth_1.requireAuth)(req, res, next);
        expect(nextCalled).toBe(true);
        expect(req.player?.id).toBe('auth0|user_123');
        expect(req.player?.name).toBe('Test User');
        expect(req.token).toBe(token);
    });
    it('accepts when aud is an array that includes the configured audience', async () => {
        const { generateKeyPair, exportJWK, SignJWT } = await importJose();
        const { publicKey, privateKey } = await generateKeyPair('RS256');
        const jwk = await exportJWK(publicKey);
        jwk.kid = 'test-kid';
        process.env.AUTH0_DOMAIN = 'dev-hl2hhkyfntxf14em.us.auth0.com';
        process.env.AUTH0_AUDIENCE = 'borgz.com';
        process.env.AUTH0_JWKS_JSON = JSON.stringify({ keys: [jwk] });
        const token = await new SignJWT({ name: 'Test User' })
            .setProtectedHeader({ alg: 'RS256', kid: 'test-kid' })
            .setIssuer(`https://${process.env.AUTH0_DOMAIN}/`)
            .setAudience(['x', process.env.AUTH0_AUDIENCE, 'y'])
            .setSubject('auth0|user_123')
            .setIssuedAt()
            .setExpirationTime('1h')
            .sign(privateKey);
        const req = makeReqWithBearer(token);
        const res = makeRes();
        let nextCalled = false;
        const next = () => {
            nextCalled = true;
        };
        await (0, requireAuth_1.requireAuth)(req, res, next);
        expect(nextCalled).toBe(true);
    });
    it('uses nickname as player.name when name is missing', async () => {
        const { generateKeyPair, exportJWK, SignJWT } = await importJose();
        const { publicKey, privateKey } = await generateKeyPair('RS256');
        const jwk = await exportJWK(publicKey);
        jwk.kid = 'test-kid';
        process.env.AUTH0_DOMAIN = 'dev-hl2hhkyfntxf14em.us.auth0.com';
        process.env.AUTH0_AUDIENCE = 'borgz.com';
        process.env.AUTH0_JWKS_JSON = JSON.stringify({ keys: [jwk] });
        const token = await new SignJWT({ nickname: 'Nick Name' })
            .setProtectedHeader({ alg: 'RS256', kid: 'test-kid' })
            .setIssuer(`https://${process.env.AUTH0_DOMAIN}/`)
            .setAudience(process.env.AUTH0_AUDIENCE)
            .setSubject('auth0|user_456')
            .setIssuedAt()
            .setExpirationTime('1h')
            .sign(privateKey);
        const req = makeReqWithBearer(token);
        const res = makeRes();
        let nextCalled = false;
        const next = () => {
            nextCalled = true;
        };
        await (0, requireAuth_1.requireAuth)(req, res, next);
        expect(nextCalled).toBe(true);
        expect(req.player?.name).toBe('Nick Name');
    });
    it('rejects when issuer does not match', async () => {
        const { generateKeyPair, exportJWK, SignJWT } = await importJose();
        const { publicKey, privateKey } = await generateKeyPair('RS256');
        const jwk = await exportJWK(publicKey);
        jwk.kid = 'test-kid';
        process.env.AUTH0_DOMAIN = 'dev-hl2hhkyfntxf14em.us.auth0.com';
        process.env.AUTH0_AUDIENCE = 'borgz.com';
        process.env.AUTH0_JWKS_JSON = JSON.stringify({ keys: [jwk] });
        const token = await new SignJWT({ name: 'Test User' })
            .setProtectedHeader({ alg: 'RS256', kid: 'test-kid' })
            .setIssuer('https://some.other.issuer/')
            .setAudience(process.env.AUTH0_AUDIENCE)
            .setSubject('auth0|user_123')
            .setIssuedAt()
            .setExpirationTime('1h')
            .sign(privateKey);
        const req = makeReqWithBearer(token);
        const res = makeRes();
        const next = () => undefined;
        await (0, requireAuth_1.requireAuth)(req, res, next);
        expect(res.statusCode).toBe(401);
        expect(res.body?.success).toBe(false);
    });
    it('rejects when audience does not match', async () => {
        const { generateKeyPair, exportJWK, SignJWT } = await importJose();
        const { publicKey, privateKey } = await generateKeyPair('RS256');
        const jwk = await exportJWK(publicKey);
        jwk.kid = 'test-kid';
        process.env.AUTH0_DOMAIN = 'dev-hl2hhkyfntxf14em.us.auth0.com';
        process.env.AUTH0_AUDIENCE = 'borgz.com';
        process.env.AUTH0_JWKS_JSON = JSON.stringify({ keys: [jwk] });
        const token = await new SignJWT({ name: 'Test User' })
            .setProtectedHeader({ alg: 'RS256', kid: 'test-kid' })
            .setIssuer(`https://${process.env.AUTH0_DOMAIN}/`)
            .setAudience('some-other-audience')
            .setSubject('auth0|user_123')
            .setIssuedAt()
            .setExpirationTime('1h')
            .sign(privateKey);
        const req = makeReqWithBearer(token);
        const res = makeRes();
        let nextCalled = false;
        const next = () => {
            nextCalled = true;
        };
        await (0, requireAuth_1.requireAuth)(req, res, next);
        expect(nextCalled).toBe(false);
        expect(res.statusCode).toBe(401);
        expect(res.body?.success).toBe(false);
    });
    it('rejects when token is expired', async () => {
        const { generateKeyPair, exportJWK, SignJWT } = await importJose();
        const { publicKey, privateKey } = await generateKeyPair('RS256');
        const jwk = await exportJWK(publicKey);
        jwk.kid = 'test-kid';
        process.env.AUTH0_DOMAIN = 'dev-hl2hhkyfntxf14em.us.auth0.com';
        process.env.AUTH0_AUDIENCE = 'borgz.com';
        process.env.AUTH0_JWKS_JSON = JSON.stringify({ keys: [jwk] });
        const now = Math.floor(Date.now() / 1000);
        const token = await new SignJWT({ name: 'Test User' })
            .setProtectedHeader({ alg: 'RS256', kid: 'test-kid' })
            .setIssuer(`https://${process.env.AUTH0_DOMAIN}/`)
            .setAudience(process.env.AUTH0_AUDIENCE)
            .setSubject('auth0|user_123')
            .setIssuedAt(now - 120)
            .setExpirationTime(now - 60)
            .sign(privateKey);
        const req = makeReqWithBearer(token);
        const res = makeRes();
        const next = () => undefined;
        await (0, requireAuth_1.requireAuth)(req, res, next);
        expect(res.statusCode).toBe(401);
        expect(res.body?.success).toBe(false);
    });
    it('rejects when token is not active yet (nbf in the future)', async () => {
        const { generateKeyPair, exportJWK, SignJWT } = await importJose();
        const { publicKey, privateKey } = await generateKeyPair('RS256');
        const jwk = await exportJWK(publicKey);
        jwk.kid = 'test-kid';
        process.env.AUTH0_DOMAIN = 'dev-hl2hhkyfntxf14em.us.auth0.com';
        process.env.AUTH0_AUDIENCE = 'borgz.com';
        process.env.AUTH0_JWKS_JSON = JSON.stringify({ keys: [jwk] });
        const now = Math.floor(Date.now() / 1000);
        const token = await new SignJWT({ name: 'Test User' })
            .setProtectedHeader({ alg: 'RS256', kid: 'test-kid' })
            .setIssuer(`https://${process.env.AUTH0_DOMAIN}/`)
            .setAudience(process.env.AUTH0_AUDIENCE)
            .setSubject('auth0|user_123')
            .setNotBefore(now + 60)
            .setIssuedAt(now)
            .setExpirationTime(now + 3600)
            .sign(privateKey);
        const req = makeReqWithBearer(token);
        const res = makeRes();
        const next = () => undefined;
        await (0, requireAuth_1.requireAuth)(req, res, next);
        expect(res.statusCode).toBe(401);
        expect(res.body?.success).toBe(false);
    });
    it('rejects when token header kid is not present in JWKS', async () => {
        const { generateKeyPair, exportJWK, SignJWT } = await importJose();
        const { publicKey, privateKey } = await generateKeyPair('RS256');
        const jwk = await exportJWK(publicKey);
        jwk.kid = 'jwks-kid';
        process.env.AUTH0_DOMAIN = 'dev-hl2hhkyfntxf14em.us.auth0.com';
        process.env.AUTH0_AUDIENCE = 'borgz.com';
        process.env.AUTH0_JWKS_JSON = JSON.stringify({ keys: [jwk] });
        const token = await new SignJWT({ name: 'Test User' })
            .setProtectedHeader({ alg: 'RS256', kid: 'token-kid' })
            .setIssuer(`https://${process.env.AUTH0_DOMAIN}/`)
            .setAudience(process.env.AUTH0_AUDIENCE)
            .setSubject('auth0|user_123')
            .setIssuedAt()
            .setExpirationTime('1h')
            .sign(privateKey);
        const req = makeReqWithBearer(token);
        const res = makeRes();
        const next = () => undefined;
        await (0, requireAuth_1.requireAuth)(req, res, next);
        expect(res.statusCode).toBe(401);
        expect(res.body?.success).toBe(false);
    });
    it('rejects when token is missing sub', async () => {
        const { generateKeyPair, exportJWK, SignJWT } = await importJose();
        const { publicKey, privateKey } = await generateKeyPair('RS256');
        const jwk = await exportJWK(publicKey);
        jwk.kid = 'test-kid';
        process.env.AUTH0_DOMAIN = 'dev-hl2hhkyfntxf14em.us.auth0.com';
        process.env.AUTH0_AUDIENCE = 'borgz.com';
        process.env.AUTH0_JWKS_JSON = JSON.stringify({ keys: [jwk] });
        const token = await new SignJWT({ name: 'Test User' })
            .setProtectedHeader({ alg: 'RS256', kid: 'test-kid' })
            .setIssuer(`https://${process.env.AUTH0_DOMAIN}/`)
            .setAudience(process.env.AUTH0_AUDIENCE)
            // no subject
            .setIssuedAt()
            .setExpirationTime('1h')
            .sign(privateKey);
        const req = makeReqWithBearer(token);
        const res = makeRes();
        const next = () => undefined;
        await (0, requireAuth_1.requireAuth)(req, res, next);
        expect(res.statusCode).toBe(401);
        expect(res.body?.success).toBe(false);
    });
    it('rejects when Authorization header is not Bearer', async () => {
        process.env.AUTH0_AUDIENCE = 'borgz.com';
        process.env.AUTH0_DOMAIN = 'dev-hl2hhkyfntxf14em.us.auth0.com';
        process.env.AUTH0_JWKS_JSON = JSON.stringify({ keys: [] });
        const req = {
            header: (k) => (k.toLowerCase() === 'authorization' ? 'bearer abc' : undefined),
        };
        const res = makeRes();
        const next = () => undefined;
        await (0, requireAuth_1.requireAuth)(req, res, next);
        expect(res.statusCode).toBe(401);
        expect(res.body?.success).toBe(false);
    });
    it('rejects when token is missing', async () => {
        process.env.AUTH0_AUDIENCE = 'borgz.com';
        process.env.AUTH0_DOMAIN = 'dev-hl2hhkyfntxf14em.us.auth0.com';
        process.env.AUTH0_JWKS_JSON = JSON.stringify({ keys: [] });
        const req = { header: () => undefined };
        const res = makeRes();
        const next = () => undefined;
        await (0, requireAuth_1.requireAuth)(req, res, next);
        expect(res.statusCode).toBe(401);
        expect(res.body?.success).toBe(false);
    });
});
