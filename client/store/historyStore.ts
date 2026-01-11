import { create } from 'zustand';
import { apiGetWithHeaders } from '../services/api';

type Winner = { playerId: string; amount: number };
type Card = { suit: string; rank: string };
type GameAction = { playerId: string; action: string; amount?: number; timestamp: number };

export type HistoryHand = {
  handNumber: number;
  endedAt: number;
  reason: 'fold' | 'showdown';
  winners: Winner[];
  pot: number;
  communityCards: Card[];
  actions: GameAction[];
};

export type HistoryGameSummary = {
  gameId: string;
  code: string;
  clubId?: string;
  variant: string;
  settings: unknown;
  createdAt: number;
  endedAt?: number;
};

export type PlayerHistorySession = {
  sessionId: string;
  gameId: string;
  code: string;
  clubId?: string;
  playerId: string;
  joinedAt: number;
  leftAt?: number;
  game: HistoryGameSummary | null;
  hands: HistoryHand[];
  handsCount: number;
};

type PlayerHistoryResponse =
  | { success: true; sessions: PlayerHistorySession[]; count: number }
  | { success: false; error: string };

export type ClubHistoryGame = HistoryGameSummary & {
  hands: HistoryHand[];
  handsCount: number;
};

type ClubHistoryResponse =
  | { success: true; games: ClubHistoryGame[]; count: number }
  | { success: false; error: string };

interface HistoryState {
  profileSessions: PlayerHistorySession[];
  profileLoading: boolean;
  profileError: string | null;

  clubGamesByClubId: Record<string, ClubHistoryGame[]>;
  clubLoadingByClubId: Record<string, boolean>;
  clubErrorByClubId: Record<string, string | null>;

  fetchMyHistory: (token: string) => Promise<void>;
  fetchClubHistory: (token: string, clubId: string) => Promise<void>;
  clearProfileError: () => void;
  clearClubError: (clubId: string) => void;
}

export const useHistoryStore = create<HistoryState>((set, get) => ({
  profileSessions: [],
  profileLoading: false,
  profileError: null,

  clubGamesByClubId: {},
  clubLoadingByClubId: {},
  clubErrorByClubId: {},

  fetchMyHistory: async (token: string) => {
    try {
      set({ profileLoading: true, profileError: null });
      const res = await apiGetWithHeaders<PlayerHistoryResponse>('/api/history/me', {
        Authorization: `Bearer ${token}`,
      });
      if (!res.success) {
        const errorMsg = res.error || 'Failed to load history';
        // Check for token expiration
        if (errorMsg.includes('exp') && errorMsg.includes('claim')) {
          set({ profileLoading: false, profileError: 'SESSION_EXPIRED' });
          return;
        }
        set({ profileLoading: false, profileError: errorMsg });
        return;
      }
      set({ profileLoading: false, profileSessions: res.sessions, profileError: null });
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to load history';
      // Check for token expiration
      if (msg.includes('exp') && msg.includes('claim')) {
        set({ profileLoading: false, profileError: 'SESSION_EXPIRED' });
        return;
      }
      set({ profileLoading: false, profileError: msg });
    }
  },

  fetchClubHistory: async (token: string, clubId: string) => {
    try {
      set({
        clubLoadingByClubId: { ...get().clubLoadingByClubId, [clubId]: true },
        clubErrorByClubId: { ...get().clubErrorByClubId, [clubId]: null },
      });
      const res = await apiGetWithHeaders<ClubHistoryResponse>(`/api/clubs/${clubId}/history`, {
        Authorization: `Bearer ${token}`,
      });
      if (!res.success) {
        set({
          clubLoadingByClubId: { ...get().clubLoadingByClubId, [clubId]: false },
          clubErrorByClubId: { ...get().clubErrorByClubId, [clubId]: res.error || 'Failed to load club history' },
        });
        return;
      }
      set({
        clubLoadingByClubId: { ...get().clubLoadingByClubId, [clubId]: false },
        clubGamesByClubId: { ...get().clubGamesByClubId, [clubId]: res.games },
        clubErrorByClubId: { ...get().clubErrorByClubId, [clubId]: null },
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to load club history';
      set({
        clubLoadingByClubId: { ...get().clubLoadingByClubId, [clubId]: false },
        clubErrorByClubId: { ...get().clubErrorByClubId, [clubId]: msg },
      });
    }
  },

  clearProfileError: () => set({ profileError: null }),
  clearClubError: (clubId: string) =>
    set({ clubErrorByClubId: { ...get().clubErrorByClubId, [clubId]: null } }),
}));


