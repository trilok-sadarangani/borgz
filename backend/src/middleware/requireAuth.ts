import { NextFunction, Request, Response } from 'express';
import { authService } from '../services/authService';

function getBearerToken(req: Request): string | undefined {
  const header = req.header('authorization') || req.header('Authorization');
  if (!header) return undefined;
  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) return undefined;
  return token;
}

function looksLikeJwt(token: string): boolean {
  // JWT compact serialization is dot-separated.
  // - JWS (most access tokens): header.payload.signature (3 parts)
  // - JWE: 5 parts
  const parts = token.split('.');
  return parts.length === 3 || parts.length === 5;
}

// `jose` is ESM-only. This repo compiles the backend to CommonJS, and TypeScript will
// transform `import('jose')` into `require('jose')`, which breaks at runtime.
// Use a native dynamic import via Function() so Node performs an actual ESM import.
async function importJose(): Promise<typeof import('jose')> {
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
export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
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
      const jwks =
        jwksJson && jwksJson.trim().length
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

      const name =
        (typeof payload.name === 'string' && payload.name) ||
        (typeof payload.nickname === 'string' && payload.nickname) ||
        (typeof payload.email === 'string' && payload.email) ||
        sub;

      (req as unknown as { player: unknown; token: string }).player = { id: sub, name };
      (req as unknown as { player: unknown; token: string }).token = token;
      next();
      return;
    }

    // Fallback: dev-only seed auth sessions.
    const session = authService.getSession(token);
    if (!session) {
      res.status(401).json({ success: false, error: 'Invalid or expired token' });
      return;
    }

    (req as unknown as { player: unknown; token: string }).player = session.player;
    (req as unknown as { player: unknown; token: string }).token = token;
    next();
  } catch (error) {
    res.status(401).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unauthorized',
    });
    return;
  }
}

