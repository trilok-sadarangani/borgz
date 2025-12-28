import type { StateStorage } from 'zustand/middleware';
import { createAuthStoreForTests } from '../authStore';

function createMemoryStorage(): { storage: StateStorage; data: Map<string, string> } {
  const data = new Map<string, string>();
  const storage: StateStorage = {
    getItem: async (name) => data.get(name) ?? null,
    setItem: async (name, value) => {
      data.set(name, value);
    },
    removeItem: async (name) => {
      data.delete(name);
    },
  };
  return { storage, data };
}

describe('authStore persistence', () => {
  test('persists only token + player (partialize)', async () => {
    const { storage, data } = createMemoryStorage();
    const store = createAuthStoreForTests(storage, { skipHydration: true });

    store.setState({
      token: 't-123',
      player: { id: 'p1', name: 'Alice', avatar: '🂡' },
      loading: true,
      error: 'boom',
      seedPlayers: [{ id: 'p2', name: 'Bob' }],
      hasHydrated: true,
    });

    const raw = data.get('borgz-auth');
    expect(raw).toBeTruthy();

    const parsed = JSON.parse(raw as string) as { state: Record<string, unknown>; version: number };
    expect(parsed.version).toBe(0);
    expect(parsed.state).toEqual({
      token: 't-123',
      player: { id: 'p1', name: 'Alice', avatar: '🂡' },
    });
  });

  test('rehydrates token + player and sets hasHydrated', async () => {
    const { storage, data } = createMemoryStorage();
    data.set(
      'borgz-auth',
      JSON.stringify({
        version: 0,
        state: { token: 't-xyz', player: { id: 'p9', name: 'Zed' } },
      })
    );

    const store = createAuthStoreForTests(storage, { skipHydration: true });
    expect(store.getState().hasHydrated).toBe(false);
    expect(store.getState().token).toBe(null);

    await store.persist.rehydrate();

    expect(store.getState().token).toBe('t-xyz');
    expect(store.getState().player).toEqual({ id: 'p9', name: 'Zed' });
    expect(store.getState().hasHydrated).toBe(true);
  });
});


