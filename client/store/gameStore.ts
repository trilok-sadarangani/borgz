import { create } from 'zustand';
import { GameSettings, GameState, PlayerAction } from '../../shared/types/game.types';
import { apiGet, apiPost } from '../services/api';
import {
  connectSocket,
  disconnectSocket,
  joinGame as socketJoinGame,
  leaveGame as socketLeaveGame,
  onGameState,
  onGameEnded,
  onSocketError,
  requestGameState,
  startGame as socketStartGame,
  nextHand as socketNextHand,
  endGame as socketEndGame,
  rebuy as socketRebuy,
  sendPlayerAction,
} from '../services/socket';

interface CreateGameResponse {
  success: boolean;
  gameId?: string;
  code?: string;
  state?: GameState;
  error?: string;
}

interface JoinGameResponse {
  success: boolean;
  state?: GameState;
  error?: string;
}

interface StartGameResponse {
  success: boolean;
  state?: GameState;
  error?: string;
}

interface GameStoreState {
  connected: boolean;
  gameCode: string | null;
  game: GameState | null;
  error: string | null;

  // lifecycle
  initSocketListeners: () => void;
  connect: () => void;
  disconnect: () => void;

  // flows
  createGame: (settings?: Partial<GameSettings>) => Promise<string>;
  joinGame: (gameCode: string, playerId: string, name: string) => Promise<void>;
  startGame: (gameCode: string, playerId: string) => Promise<void>;
  nextHand: (gameCode: string, playerId: string) => Promise<void>;
  endGame: () => void;
  rebuy: (amount: number) => void;
  leaveGame: () => void;
  refresh: () => void;

  // actions
  act: (action: PlayerAction, amount?: number) => void;
  clearError: () => void;
}

let unsubscribeGameState: null | (() => void) = null;
let unsubscribeError: null | (() => void) = null;
let unsubscribeGameEnded: null | (() => void) = null;

export const useGameStore = create<GameStoreState>((set, get) => ({
  connected: false,
  gameCode: null,
  game: null,
  error: null,

  initSocketListeners: () => {
    if (!unsubscribeGameState) {
      unsubscribeGameState = onGameState((state) => {
        set({ game: state, gameCode: state.code, error: null });
      });
    }
    if (!unsubscribeGameEnded) {
      unsubscribeGameEnded = onGameEnded(() => {
        // Host ended the game; clear local state for everyone.
        disconnectSocket();
        set({ connected: false, gameCode: null, game: null, error: 'Game ended by host' });
      });
    }
    if (!unsubscribeError) {
      unsubscribeError = onSocketError((err) => {
        set({ error: err.message });
      });
    }
  },

  connect: () => {
    get().initSocketListeners();
    connectSocket();
    set({ connected: true });
  },

  disconnect: () => {
    disconnectSocket();
    set({ connected: false });
  },

  createGame: async (settings) => {
    const res = await apiPost<CreateGameResponse>('/api/games', { settings });
    if (!res.success || !res.code) {
      throw new Error(res.error || 'Failed to create game');
    }
    set({ gameCode: res.code, game: res.state || null });
    return res.code;
  },

  joinGame: async (gameCode, playerId, name) => {
    // REST join ensures the player exists in game state
    const res = await apiPost<JoinGameResponse>(`/api/games/${gameCode}/join`, {
      playerId,
      name,
    });
    if (!res.success) {
      set({ error: res.error || 'Failed to join game' });
      return;
    }

    set({ gameCode, game: res.state || null, error: null });

    // WebSocket join subscribes to live updates
    get().connect();
    socketJoinGame({ gameCode, playerId });
  },

  startGame: async (gameCode, playerId) => {
    // Prefer socket start so all connected players receive state immediately.
    if (get().connected) {
      socketStartGame();
      return;
    }

    // Fallback to REST if socket isn't connected yet.
    const res = await apiPost<StartGameResponse>(`/api/games/${gameCode}/start`, { playerId });
    if (!res.success) {
      set({ error: res.error || 'Failed to start game' });
      return;
    }
    set({ game: res.state || null, error: null });
  },

  nextHand: async (gameCode, playerId) => {
    if (get().connected) {
      socketNextHand();
      return;
    }
    const res = await apiPost<StartGameResponse>(`/api/games/${gameCode}/next-hand`, { playerId });
    if (!res.success) {
      set({ error: res.error || 'Failed to start next hand' });
      return;
    }
    set({ game: res.state || null, error: null });
  },

  endGame: () => {
    // Socket-only: ensures all connected players get the 'game-ended' broadcast.
    if (!get().connected) return;
    socketEndGame();
  },

  rebuy: (amount: number) => {
    if (!get().connected) return;
    if (!Number.isFinite(amount) || amount <= 0) return;
    socketRebuy(amount);
  },

  leaveGame: () => {
    // Important: leaving a game should also disconnect the socket.
    // Otherwise `connected` remains true and screens (e.g. club game join) disable join buttons.
    socketLeaveGame();
    disconnectSocket();
    set({ connected: false, gameCode: null, game: null });
  },

  refresh: () => {
    requestGameState();
  },

  act: (action, amount) => {
    sendPlayerAction({ action, amount });
  },

  clearError: () => set({ error: null }),
}));
