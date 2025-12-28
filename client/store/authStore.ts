import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { apiGet, apiPost, apiPostWithHeaders } from '../services/api';
import { getAuth0Config } from '../services/runtimeConfig';
import { createUniversalZustandStorage } from '../utils/zustandStorage';

export type SeedAuthPlayer = {
  id: string;
  name: string;
  avatar?: string;
};

export type Auth0User = {
  id: string; // Auth0 `sub`
  name: string;
  email?: string;
  picture?: string;
};

type LoginResponse =
  | { success: true; token: string; player: SeedAuthPlayer; createdAt: number }
  | { success: false; error: string };

type SeedPlayersResponse =
  | { success: true; players: SeedAuthPlayer[]; count: number }
  | { success: false; error: string };

interface AuthState {
  token: string | null;
  player: (SeedAuthPlayer | Auth0User) | null;

  hasHydrated: boolean;

  seedPlayers: SeedAuthPlayer[];
  loading: boolean;
  error: string | null;

  setHasHydrated: (v: boolean) => void;
  fetchSeedPlayers: () => Promise<void>;
  login: (playerId: string, password: string) => Promise<void>;
  loginWithAuth0AccessToken: (accessToken: string) => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
}

function createAuthStore(
  storageOverride?: ReturnType<typeof createUniversalZustandStorage>,
  opts?: { skipHydration?: boolean }
) {
  return create<AuthState>()(
    persist(
      (set, get) => ({
        token: null,
        player: null,

        hasHydrated: false,

        seedPlayers: [],
        loading: false,
        error: null,

        setHasHydrated: (v) => set({ hasHydrated: v }),

        fetchSeedPlayers: async () => {
          set({ loading: true, error: null });
          // Seed auth is mainly for dev; fail fast so we never "hang" the app on startup if the backend isn't reachable.
          const res = await apiGet<SeedPlayersResponse>('/api/auth/seed/players', { timeoutMs: 2500 });
          if (!res.success) {
            set({ loading: false, error: res.error || 'Failed to load seed players' });
            return;
          }
          set({ loading: false, seedPlayers: res.players, error: null });
        },

        login: async (playerId, password) => {
          set({ loading: true, error: null });
          const res = await apiPost<LoginResponse>('/api/auth/login', { playerId, password });
          if (!res.success) {
            set({ loading: false, error: res.error || 'Login failed' });
            return;
          }
          set({ loading: false, token: res.token, player: res.player, error: null });
        },

        loginWithAuth0AccessToken: async (accessToken: string) => {
          try {
            set({ loading: true, error: null });
            // Auth0 /userinfo returns the standard OIDC user profile.
            const domain = getAuth0Config().domain;
            if (!domain) {
              set({
                loading: false,
                error: 'Missing Auth0 domain (set in client/app.json expo.extra or EXPO_PUBLIC_AUTH0_DOMAIN)',
              });
              return;
            }
            const res = await fetch(`https://${domain}/userinfo`, {
              headers: { Authorization: `Bearer ${accessToken}` },
            });
            if (!res.ok) {
              const text = await res.text().catch(() => '');
              set({ loading: false, error: `Auth0 /userinfo failed (${res.status}). ${text.slice(0, 160)}` });
              return;
            }
            const profile: any = await res.json();
            const sub = typeof profile?.sub === 'string' ? profile.sub : null;
            if (!sub) {
              set({ loading: false, error: 'Auth0 /userinfo missing sub' });
              return;
            }
            const player: Auth0User = {
              id: sub,
              name:
                (typeof profile?.name === 'string' && profile.name) ||
                (typeof profile?.nickname === 'string' && profile.nickname) ||
                (typeof profile?.email === 'string' && profile.email) ||
                sub,
              email: typeof profile?.email === 'string' ? profile.email : undefined,
              picture: typeof profile?.picture === 'string' ? profile.picture : undefined,
            };
            set({ loading: false, token: accessToken, player, error: null });
          } catch (e) {
            const msg = e instanceof Error ? e.message : 'Auth0 login failed';
            set({ loading: false, error: msg });
          }
        },

        logout: async () => {
          const token = get().token;
          set({ loading: true, error: null });
          if (token) {
            // Best-effort; clear local auth even if server call fails.
            await apiPostWithHeaders<{ success: boolean; error?: string }>(
              '/api/auth/logout',
              {},
              { Authorization: `Bearer ${token}` }
            ).catch(() => undefined);
          }
          set({ loading: false, token: null, player: null, error: null });
        },

        clearError: () => set({ error: null }),
      }),
      {
        name: 'borgz-auth',
        storage: createJSONStorage(() => storageOverride || createUniversalZustandStorage()),
        partialize: (s) => ({ token: s.token, player: s.player }),
        skipHydration: Boolean(opts?.skipHydration),
        onRehydrateStorage: () => (state, _error) => {
          // Mark hydration complete whether we succeeded or failed (avoids redirect loops / blank screens).
          state?.setHasHydrated(true);
        },
      }
    )
  );
}

export const useAuthStore = createAuthStore();
export const createAuthStoreForTests = createAuthStore;

