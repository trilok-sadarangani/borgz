import { create } from 'zustand';

export interface PlayerIdentity {
  id: string;
  name: string;
}

function randomId(): string {
  // crypto.randomUUID is available on modern platforms; fall back to a simple id.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const c = (globalThis as any).crypto;
  if (c?.randomUUID) return c.randomUUID();
  return `p_${Math.random().toString(16).slice(2)}_${Date.now()}`;
}

interface PlayerStoreState {
  player: PlayerIdentity;
  setName: (name: string) => void;
  regenerateId: () => void;
}

export const usePlayerStore = create<PlayerStoreState>((set, get) => ({
  player: {
    id: randomId(),
    name: 'Player',
  },
  setName: (name) => set({ player: { ...get().player, name } }),
  regenerateId: () => set({ player: { ...get().player, id: randomId() } }),
}));




