export type ApiResult<T> = { success: true } & T | { success: false; error: string };

const DEFAULT_API_BASE_URL = 'http://localhost:3001';

function isWeb(): boolean {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return typeof (globalThis as any)?.document !== 'undefined';
}

function tryGetExpoHostIp(): string | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require('expo-constants');
    // Different bundlers/interop may expose the constants object differently.
    // Prefer a directly-exported object, fall back to `default`.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const Constants = (mod?.expoConfig || mod?.default?.expoConfig || mod?.default) ? (mod.default || mod) : mod;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const hostUri: string | undefined = (Constants as any)?.expoConfig?.hostUri || (Constants as any)?.hostUri;
    if (!hostUri) return null;
    const host = hostUri.split(':')[0];
    if (!host || host === 'localhost' || host === '127.0.0.1') return null;
    return host;
  } catch {
    return null;
  }
}

export function getApiBaseUrl(): string {
  // Expo supports EXPO_PUBLIC_* env vars; keep a safe default for dev.
  // IMPORTANT: Keep this as a direct `process.env.EXPO_PUBLIC_*` reference so Expo can inline it at build time.
  const envUrl =
    typeof process !== 'undefined' ? (process.env.EXPO_PUBLIC_API_URL as string | undefined) : (undefined as string | undefined);
  if (envUrl) return envUrl;

  // Web: use the current hostname (same machine) unless overridden by env.
  if (isWeb()) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const host = (globalThis as any)?.location?.hostname as string | undefined;
    // Match the current page scheme to avoid mixed-content errors (https page -> http API fetch).
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const protocol = ((globalThis as any)?.location?.protocol as string | undefined) === 'https:' ? 'https' : 'http';
    if (host) return `${protocol}://${host}:3001`;
    return DEFAULT_API_BASE_URL;
  }

  // If running on a device, "localhost" points at the phone, not your dev machine.
  // Derive the dev machine IP from Expo hostUri (e.g. "192.168.1.126:8082") and use backend :3001.
  const hostIp = tryGetExpoHostIp();
  if (hostIp) return `http://${hostIp}:3001`;

  return DEFAULT_API_BASE_URL;
}

async function parseJsonOrThrow<T>(res: Response): Promise<T> {
  const contentType = res.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    const text = await res.text().catch(() => '');
    throw new Error(
      `Expected JSON but got "${contentType || 'unknown'}" (${res.status}). ${text.slice(0, 160)}`
    );
  }
  return (await res.json()) as T;
}

function makeNetworkErrorMessage(baseUrl: string, path: string, error: unknown): string {
  const raw = error instanceof Error ? error.message : String(error);
  const url = `${baseUrl}${path}`;
  return [
    `Request failed: GET ${url}`,
    raw,
    `Is the backend running? (expected at ${baseUrl})`,
  ]
    .filter(Boolean)
    .join(' ');
}

export async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const baseUrl = getApiBaseUrl();
  try {
    const res = await fetch(`${baseUrl}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    return await parseJsonOrThrow<T>(res);
  } catch (error) {
    const msg = makeNetworkErrorMessage(baseUrl, path, error);
    return { success: false, error: msg } as unknown as T;
  }
}

export async function apiPostWithHeaders<T>(
  path: string,
  body: unknown,
  headers: Record<string, string>
): Promise<T> {
  const baseUrl = getApiBaseUrl();
  try {
    const res = await fetch(`${baseUrl}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify(body),
    });
    return await parseJsonOrThrow<T>(res);
  } catch (error) {
    const msg = makeNetworkErrorMessage(baseUrl, path, error);
    return { success: false, error: msg } as unknown as T;
  }
}

export async function apiGet<T>(path: string): Promise<T> {
  const baseUrl = getApiBaseUrl();
  try {
    const res = await fetch(`${baseUrl}${path}`);
    return await parseJsonOrThrow<T>(res);
  } catch (error) {
    const msg = makeNetworkErrorMessage(baseUrl, path, error);
    return { success: false, error: msg } as unknown as T;
  }
}

export async function apiGetWithHeaders<T>(path: string, headers: Record<string, string>): Promise<T> {
  const baseUrl = getApiBaseUrl();
  try {
    const res = await fetch(`${baseUrl}${path}`, { headers });
    return await parseJsonOrThrow<T>(res);
  } catch (error) {
    const msg = makeNetworkErrorMessage(baseUrl, path, error);
    return { success: false, error: msg } as unknown as T;
  }
}


