"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireAuth = requireAuth;
const authService_1 = require("../services/authService");
const playerService_1 = require("../services/playerService");
const logger_1 = require("../utils/logger");
function getBearerToken(req) {
    const header = req.header('authorization') || req.header('Authorization');
    if (!header)
        return undefined;
    const [scheme, token] = header.split(' ');
    if (scheme !== 'Bearer' || !token)
        return undefined;
    return token;
}
function looksLikeJwt(token) {
    // JWT compact serialization is dot-separated.
    // - JWS (most access tokens): header.payload.signature (3 parts)
    // - JWE: 5 parts
    const parts = token.split('.');
    return parts.length === 3 || parts.length === 5;
}
// `jose` is ESM-only. This repo compiles the backend to CommonJS, and TypeScript will
// transform `import('jose')` into `require('jose')`, which breaks at runtime.
// Use a native dynamic import via Function() so Node performs an actual ESM import.
async function importJose() {
    // eslint-disable-next-line no-new-func
    return await Function('return import("jose")')();
}
/**
 * Auth middleware.
 *
 * Modes:
 * - Auth0 JWT: when AUTH0_AUDIENCE is set and either AUTH0_ISSUER or AUTH0_DOMAIN is set.
 *   Validates Bearer JWT via JWKS and attaches `{ player, token }`.
 * - Dev seed auth: fallback to in-memory seed sessions (existing behavior).
 */
async function requireAuth(req, res, next) {
    const token = getBearerToken(req);
    if (!token) {
        res.status(401).json({ success: false, error: 'Missing Authorization Bearer token' });
        return;
    }
    try {
        const audience = process.env.AUTH0_AUDIENCE;
        const issuer = process.env.AUTH0_ISSUER;
        const domain = process.env.AUTH0_DOMAIN;
        const resolvedIssuer = issuer || (domain ? `https://${domain}/` : undefined);
        const auth0Configured = Boolean(audience && resolvedIssuer);
        const tokenIsJwt = looksLikeJwt(token);
        const isProd = String(process.env.NODE_ENV || '').toLowerCase() === 'production';
        // If Auth0 is configured in production, we require JWT bearer tokens.
        if (auth0Configured && isProd && !tokenIsJwt) {
            res.status(401).json({
                success: false,
                error: 'Auth0 access token (JWT) required',
            });
            return;
        }
        const useAuth0 = Boolean(auth0Configured && tokenIsJwt);
        if (useAuth0) {
            const { createLocalJWKSet, createRemoteJWKSet, jwtVerify } = await importJose();
            // Allow tests/offline usage by providing a JWKS JSON via env var.
            // Example: {"keys":[{...jwk...}]}
            const jwksJson = process.env.AUTH0_JWKS_JSON;
            const jwks = jwksJson && jwksJson.trim().length
                ? createLocalJWKSet(JSON.parse(jwksJson))
                : createRemoteJWKSet(new URL(`${resolvedIssuer}.well-known/jwks.json`));
            const { payload } = await jwtVerify(token, jwks, {
                issuer: resolvedIssuer,
                audience,
            });
            const sub = typeof payload.sub === 'string' ? payload.sub : undefined;
            if (!sub) {
                res.status(401).json({ success: false, error: 'Invalid token (missing sub)' });
                return;
            }
            const name = (typeof payload.name === 'string' && payload.name) ||
                (typeof payload.nickname === 'string' && payload.nickname) ||
                (typeof payload.email === 'string' && payload.email) ||
                sub;
            const email = typeof payload.email === 'string' ? payload.email : undefined;
            req.player = { id: sub, name };
            req.token = token;
            // Best-effort: ensure player exists in DB for persistence + FK safety.
            void playerService_1.playerService.getOrCreatePlayer({ id: sub, name, email }).catch((err) => {
                logger_1.logger.warn('playerService.getOrCreatePlayer.failed', { playerId: sub, err: (0, logger_1.toErrorMeta)(err) });
            });
            next();
            return;
        }
        // Fallback: dev-only seed auth sessions.
        const session = authService_1.authService.getSession(token);
        if (!session) {
            res.status(401).json({ success: false, error: 'Invalid or expired token' });
            return;
        }
        req.player = session.player;
        req.token = token;
        next();
    }
    catch (error) {
        res.status(401).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unauthorized',
        });
        return;
    }
}
