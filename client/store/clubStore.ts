import { create } from 'zustand';
import { Club } from '../../shared/types/club.types';
import { apiGetWithHeaders, apiPostWithHeaders } from '../services/api';

type ListClubsResponse =
  | { success: true; clubs: Club[]; count: number }
  | { success: false; error: string };

type CreateClubResponse =
  | { success: true; club: Club }
  | { success: false; error: string };

type JoinClubResponse =
  | { success: true; club: Club }
  | { success: false; error: string };

interface ClubState {
  clubs: Club[];
  loading: boolean;
  error: string | null;

  fetchMyClubs: (token: string) => Promise<void>;
  fetchClub: (token: string, clubId: string) => Promise<Club | null>;
  createClub: (token: string, name: string, description?: string) => Promise<Club | null>;
  joinClub: (token: string, inviteCode: string) => Promise<Club | null>;
}

export const useClubStore = create<ClubState>((set, get) => ({
  clubs: [],
  loading: false,
  error: null,

  fetchMyClubs: async (token: string) => {
    try {
      set({ loading: true, error: null });
      const res = await apiGetWithHeaders<ListClubsResponse>('/api/clubs', {
        Authorization: `Bearer ${token}`,
      });
      if (!res.success) {
        const errorMsg = res.error || 'Failed to load clubs';
        // Check for token expiration or invalid token (server restart clears sessions)
        if (
          errorMsg.includes('exp') && errorMsg.includes('claim') ||
          errorMsg.includes('Invalid or expired token') ||
          errorMsg.includes('Missing Authorization')
        ) {
          set({ loading: false, error: 'SESSION_EXPIRED' });
          return;
        }
        set({ loading: false, error: errorMsg });
        return;
      }
      set({ loading: false, clubs: res.clubs, error: null });
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to load clubs';
      // Check for token expiration or invalid token
      if (
        msg.includes('exp') && msg.includes('claim') ||
        msg.includes('Invalid or expired token') ||
        msg.includes('Missing Authorization')
      ) {
        set({ loading: false, error: 'SESSION_EXPIRED' });
        return;
      }
      set({ loading: false, error: msg });
    }
  },

  fetchClub: async (token: string, clubId: string) => {
    try {
      set({ loading: true, error: null });
      const res = await apiGetWithHeaders<
        { success: true; club: Club } | { success: false; error: string }
      >(`/api/clubs/${clubId}`, { Authorization: `Bearer ${token}` });
      if (!res.success) {
        set({ loading: false, error: res.error || 'Failed to load club' });
        return null;
      }
      const existing = get().clubs;
      const next = [res.club, ...existing.filter((c) => c.id !== res.club.id)];
      set({ loading: false, clubs: next, error: null });
      return res.club;
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to load club';
      set({ loading: false, error: msg });
      return null;
    }
  },

  createClub: async (token: string, name: string, description?: string) => {
    try {
      set({ loading: true, error: null });
      const res = await apiPostWithHeaders<CreateClubResponse>(
        '/api/clubs',
        { name, description },
        { Authorization: `Bearer ${token}` }
      );
      if (!res.success) {
        set({ loading: false, error: res.error || 'Failed to create club' });
        return null;
      }
      const existing = get().clubs;
      const next = [res.club, ...existing.filter((c) => c.id !== res.club.id)];
      set({ loading: false, clubs: next, error: null });
      return res.club;
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to create club';
      set({ loading: false, error: msg });
      return null;
    }
  },

  joinClub: async (token: string, inviteCode: string) => {
    try {
      set({ loading: true, error: null });
      const res = await apiPostWithHeaders<JoinClubResponse>(
        '/api/clubs/join',
        { inviteCode },
        { Authorization: `Bearer ${token}` }
      );
      if (!res.success) {
        set({ loading: false, error: res.error || 'Failed to join club' });
        return null;
      }
      const existing = get().clubs;
      const next = [res.club, ...existing.filter((c) => c.id !== res.club.id)];
      set({ loading: false, clubs: next, error: null });
      return res.club;
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to join club';
      set({ loading: false, error: msg });
      return null;
    }
  },
}));
