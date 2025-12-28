export type Auth0Config = {
  domain?: string;
  clientId?: string;
  audience?: string;
};

export type Auth0DiagnosticsContext = {
  redirectUri: string;
};

export type Auth0AuthResponseLike =
  | { type: 'success'; params?: Record<string, unknown> }
  | { type: 'error'; params?: Record<string, unknown> }
  | { type: string; params?: Record<string, unknown> }
  | undefined
  | null;

export function validateAuth0Config(config: Auth0Config, ctx: Auth0DiagnosticsContext): string[] {
  const issues: string[] = [];

  if (!config.domain) issues.push('Missing Auth0 domain.');
  if (!config.clientId) issues.push('Missing Auth0 client id.');

  // Heuristic: if running on web, redirectUri should be http(s). On native it should be a scheme like borgz://
  if (!ctx.redirectUri) {
    issues.push('Missing redirect URI.');
  } else if (!/^https?:\/\//i.test(ctx.redirectUri) && !/^[a-z][a-z0-9+.-]*:\/\//i.test(ctx.redirectUri)) {
    issues.push(`Redirect URI looks invalid: ${ctx.redirectUri}`);
  }

  return issues;
}

function getStr(params: Record<string, unknown> | undefined, key: string): string | undefined {
  const v = params?.[key];
  return typeof v === 'string' ? v : undefined;
}

/**
 * Turns an Auth0/AuthSession response into a human-readable error message with next steps.
 * This is intentionally heuristic-based so it works across platforms (web/native) and Auth0 settings.
 */
export function explainAuth0Failure(
  response: Auth0AuthResponseLike,
  config: Auth0Config,
  ctx: Auth0DiagnosticsContext
): string | null {
  if (!response) return null;

  if (response.type === 'dismiss' || response.type === 'cancel') {
    return 'Auth0 login was cancelled.';
  }

  if (response.type !== 'error') return null;

  const error = getStr(response.params, 'error') || 'auth0_error';
  const desc = getStr(response.params, 'error_description') || getStr(response.params, 'errorDescription') || '';
  const redirectUri = ctx.redirectUri;

  const callbackMismatch =
    /callback url mismatch/i.test(desc) ||
    (/redirect_uri/i.test(desc) && /(not|isn't)\s+in\s+the\s+list|allowed callback/i.test(desc));

  if (callbackMismatch) {
    const domainPart = config.domain ? ` (tenant: ${config.domain})` : '';
    return [
      `Auth0 callback URL mismatch${domainPart}.`,
      `Your app is sending redirect_uri: ${redirectUri}`,
      'Fix: In Auth0 Dashboard → Application Settings, add this exact URL to:',
      '- Allowed Callback URLs',
      '- Allowed Web Origins',
      '- Allowed Logout URLs',
    ].join('\n');
  }

  if (error === 'access_denied' && /user cancelled|denied/i.test(desc)) {
    return 'Auth0 login was denied/cancelled.';
  }

  const serviceNotFound =
    /service not found/i.test(desc) ||
    (/audience/i.test(desc) && /not found|invalid/i.test(desc));
  if (error === 'access_denied' && serviceNotFound) {
    const audPart = config.audience ? ` (audience: ${config.audience})` : '';
    return [
      `Auth0 login failed: service not found${audPart}.`,
      `Details: ${desc}`,
      'This usually means your AUTH0_AUDIENCE does not match any Auth0 API Identifier in your tenant.',
      'Fix: In Auth0 Dashboard → Applications → APIs, create/select an API and set its Identifier to match your audience.',
      'Then set EXPO_PUBLIC_AUTH0_AUDIENCE and backend AUTH0_AUDIENCE to that same Identifier.',
      `redirect_uri: ${redirectUri}`,
    ].join('\n');
  }

  // Generic fallback with the raw info (high-signal for debugging).
  return [
    `Auth0 login failed: ${error}`,
    desc ? `Details: ${desc}` : '',
    `redirect_uri: ${redirectUri}`,
  ]
    .filter(Boolean)
    .join('\n');
}


