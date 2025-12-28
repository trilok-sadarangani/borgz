import { create } from 'zustand';
import { apiGetWithHeaders, apiPostWithHeaders } from '../services/api';
import { GameSettings, GameState } from '../../shared/types/game.types';

export type ClubGameListItem = {
  gameId: string;
  code: string;
  phase: string;
  playerCount: number;
};

type ListClubGamesResponse =
  | { success: true; games: ClubGameListItem[]; count: number }
  | { success: false; error: string };

type CreateClubGameResponse =
  | { success: true; gameId: string; code: string; state?: GameState }
  | { success: false; error: string };

interface ClubGameState {
  gamesByClubId: Record<string, ClubGameListItem[]>;
  loading: boolean;
  error: string | null;

  fetchClubGames: (token: string, clubId: string) => Promise<void>;
  createClubGame: (
    token: string,
    clubId: string,
    settings?: Partial<GameSettings>
  ) => Promise<{ gameId: string; code: string } | null>;
  clearError: () => void;
}

export const useClubGameStore = create<ClubGameState>((set, get) => ({
  gamesByClubId: {},
  loading: false,
  error: null,

  fetchClubGames: async (token: string, clubId: string) => {
    try {
      set({ loading: true, error: null });
      const res = await apiGetWithHeaders<ListClubGamesResponse>(`/api/clubs/${clubId}/games`, {
        Authorization: `Bearer ${token}`,
      });
      if (!res.success) {
        set({ loading: false, error: res.error || 'Failed to load club games' });
        return;
      }
      set({
        loading: false,
        gamesByClubId: { ...get().gamesByClubId, [clubId]: res.games },
        error: null,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to load club games';
      set({ loading: false, error: msg });
    }
  },

  createClubGame: async (token: string, clubId: string, settings?: Partial<GameSettings>) => {
    try {
      set({ loading: true, error: null });
      const res = await apiPostWithHeaders<CreateClubGameResponse>(
        `/api/clubs/${clubId}/games`,
        { settings },
        { Authorization: `Bearer ${token}` }
      );
      if (!res.success) {
        set({ loading: false, error: res.error || 'Failed to create club game' });
        return null;
      }
      // Refresh list so the created game shows up for everyone who pulls.
      await get().fetchClubGames(token, clubId);
      set({ loading: false });
      return { gameId: res.gameId, code: res.code };
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to create club game';
      set({ loading: false, error: msg });
      return null;
    }
  },

  clearError: () => set({ error: null }),
}));


