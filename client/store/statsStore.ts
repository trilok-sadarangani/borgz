import { create } from 'zustand';
import { apiGetWithHeaders } from '../services/api';
import { PokerVariant } from '../../shared/types/game.types';

export type DepthBucket = '0-50' | '50-100' | '100-150' | '150-500' | '500+';

export type StatsQuery = {
  from?: number;
  to?: number;
  clubId?: string;
  gameId?: string;
  code?: string;
  variant?: PokerVariant;
  depthBucket?: DepthBucket;
};

export type GameInRange = {
  gameId: string;
  code: string;
  clubId?: string;
  variant: PokerVariant;
  createdAt: number;
  endedAt?: number;
  handsInRange: number;
};

export type PreflopPosition =
  | 'UTG'
  | 'UTG+1'
  | 'UTG+2'
  | 'LJ'
  | 'HJ'
  | 'CO'
  | 'BTN'
  | 'SB'
  | 'BB'
  | 'BTN/SB';

export type PreflopPositionStats = {
  position: PreflopPosition;
  hands: number;
  pfrCount: number;
  openOpps: number;
  openRaiseCount: number;
  threeBetOpps: number;
  threeBetCount: number;
  fourBetOpps: number;
  fourBetCount: number;
};

export type PreflopCharts = {
  byPosition: PreflopPositionStats[];
};

export type VsOpponentSummary = {
  opponentId: string;
  handsTogether: number;
  totalWinnings: number;
  bb100: number | null;
  showdownsTogether: number;
  showdownsWon: number;
  wsdVsOpponent: number;
};

export type PlayerStatsSummary = {
  playerId: string;
  totalHands: number;
  handsWon: number;
  winPercentage: number;
  totalWinnings: number;
  bb100: number | null;
  vpip: number;
  pfr: number;
  threeBetPercentage: number;
  wtsd: number;
  wsd: number;
  aggressionFactor: number;
  cbetPercentage: number;
};

type StatsResponse =
  | {
      success: true;
      summary: PlayerStatsSummary;
      gamesInRange: GameInRange[];
      vsOpponents: VsOpponentSummary[];
      preflop: PreflopCharts;
    }
  | { success: false; error: string };

function toQueryString(query: StatsQuery): string {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(query)) {
    if (v === undefined || v === null || v === '') continue;
    params.set(k, String(v));
  }
  const s = params.toString();
  return s ? `?${s}` : '';
}

interface StatsState {
  loading: boolean;
  error: string | null;
  summary: PlayerStatsSummary | null;
  gamesInRange: GameInRange[];
  vsOpponents: VsOpponentSummary[];
  preflop: PreflopCharts | null;
  lastQuery: StatsQuery | null;

  fetchMyStats: (token: string, query: StatsQuery) => Promise<void>;
  clearError: () => void;
}

export const useStatsStore = create<StatsState>((set) => ({
  loading: false,
  error: null,
  summary: null,
  gamesInRange: [],
  vsOpponents: [],
  preflop: null,
  lastQuery: null,

  fetchMyStats: async (token: string, query: StatsQuery) => {
    try {
      set({ loading: true, error: null, lastQuery: query });
      const qs = toQueryString(query);
      const res = await apiGetWithHeaders<StatsResponse>(`/api/stats/me${qs}`, {
        Authorization: `Bearer ${token}`,
      });
      if (!res.success) {
        set({ loading: false, error: res.error || 'Failed to load stats' });
        return;
      }
      set({
        loading: false,
        error: null,
        summary: res.summary,
        gamesInRange: res.gamesInRange,
        vsOpponents: res.vsOpponents || [],
        preflop: res.preflop || { byPosition: [] },
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to load stats';
      set({ loading: false, error: msg });
    }
  },

  clearError: () => set({ error: null }),
}));


