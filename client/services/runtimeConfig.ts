type Auth0RuntimeConfig = {
  domain?: string;
  clientId?: string;
  audience?: string;
};

function tryReadFromAppJson(): Auth0RuntimeConfig {
  try {
    // Metro/Web bundlers can inline JSON requires; this is the most reliable way to read `expo.extra`.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const appJson = require('../app.json') as { expo?: { extra?: Record<string, unknown> } } | undefined;
    const extra = appJson?.expo?.extra;
    if (!extra) return {};

    const domain = typeof extra.auth0Domain === 'string' ? extra.auth0Domain : undefined;
    const clientId = typeof extra.auth0ClientId === 'string' ? extra.auth0ClientId : undefined;
    const audience = typeof extra.auth0Audience === 'string' ? extra.auth0Audience : undefined;
    return { domain, clientId, audience };
  } catch {
    return {};
  }
}

function tryReadFromExpoExtra(): Auth0RuntimeConfig {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require('expo-constants');
    // Different bundlers/interop may expose the constants object differently.
    // Most commonly the module exports `{ default: Constants }`.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const Constants = (mod?.default || mod) as any;

    // Expo may expose config in different places depending on runtime (web/dev/EAS).
    // Try them all, in priority order.
    const extra =
      (Constants?.expoConfig?.extra as Record<string, unknown> | undefined) ||
      (Constants?.manifest?.extra as Record<string, unknown> | undefined) ||
      (Constants?.manifest2?.extra as Record<string, unknown> | undefined) ||
      (Constants?.config?.extra as Record<string, unknown> | undefined);
    if (!extra) return {};

    const domain = typeof extra.auth0Domain === 'string' ? extra.auth0Domain : undefined;
    const clientId = typeof extra.auth0ClientId === 'string' ? extra.auth0ClientId : undefined;
    const audience = typeof extra.auth0Audience === 'string' ? extra.auth0Audience : undefined;
    return { domain, clientId, audience };
  } catch {
    return {};
  }
}

/**
 * Reads Auth0 configuration.
 *
 * Priority:
 * - `EXPO_PUBLIC_AUTH0_*` env vars (easy to override per-environment)
 * - `expo.extra.auth0*` from `client/app.json` (project "settings")
 */
export function getAuth0Config(): Auth0RuntimeConfig {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const env = (process as any)?.env as Record<string, unknown> | undefined;

  const envDomain = typeof env?.EXPO_PUBLIC_AUTH0_DOMAIN === 'string' ? (env.EXPO_PUBLIC_AUTH0_DOMAIN as string) : undefined;
  const envClientId =
    typeof env?.EXPO_PUBLIC_AUTH0_CLIENT_ID === 'string' ? (env.EXPO_PUBLIC_AUTH0_CLIENT_ID as string) : undefined;
  const envAudience =
    typeof env?.EXPO_PUBLIC_AUTH0_AUDIENCE === 'string' ? (env.EXPO_PUBLIC_AUTH0_AUDIENCE as string) : undefined;

  const extra = tryReadFromExpoExtra();
  const appJson = tryReadFromAppJson();

  return {
    domain: envDomain || extra.domain || appJson.domain,
    clientId: envClientId || extra.clientId || appJson.clientId,
    audience: envAudience || extra.audience || appJson.audience,
  };
}


