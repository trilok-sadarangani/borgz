import { io, Socket } from 'socket.io-client';
import { GameState, PlayerAction } from '../../shared/types/game.types';
import { getApiBaseUrl } from './api';

export type SocketErrorPayload = { message: string };

export interface JoinGamePayload {
  gameCode: string;
  playerId: string;
}

export interface PlayerActionPayload {
  action: PlayerAction;
  amount?: number;
}

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (socket) return socket;
  const baseUrl = getApiBaseUrl();
  socket = io(baseUrl, {
    transports: ['websocket'],
    autoConnect: false,
  });
  return socket;
}

export function connectSocket(): void {
  const s = getSocket();
  if (!s.connected) s.connect();
}

export function disconnectSocket(): void {
  if (!socket) return;
  socket.disconnect();
}

export function joinGame(payload: JoinGamePayload): void {
  const s = getSocket();
  s.emit('join-game', payload);
}

export function leaveGame(): void {
  const s = getSocket();
  s.emit('leave-game');
}

export function sendPlayerAction(payload: PlayerActionPayload): void {
  const s = getSocket();
  s.emit('player-action', payload);
}

export function requestGameState(): void {
  const s = getSocket();
  s.emit('get-game-state');
}

export function startGame(): void {
  const s = getSocket();
  s.emit('start-game');
}

export function nextHand(): void {
  const s = getSocket();
  s.emit('next-hand');
}

export function endGame(): void {
  const s = getSocket();
  s.emit('end-game');
}

export function rebuy(amount: number): void {
  const s = getSocket();
  s.emit('rebuy', { amount });
}

export function onGameState(handler: (state: GameState) => void): () => void {
  const s = getSocket();
  s.on('game-state', handler);
  return () => s.off('game-state', handler);
}

export function onGameEnded(handler: (payload: { gameCode: string }) => void): () => void {
  const s = getSocket();
  s.on('game-ended', handler);
  return () => s.off('game-ended', handler);
}

export function onSocketError(handler: (err: SocketErrorPayload) => void): () => void {
  const s = getSocket();
  s.on('error', handler);
  return () => s.off('error', handler);
}

export interface PlayerJoinedPayload {
  playerId: string;
  state: GameState;
}

export interface PlayerLeftPayload {
  playerId: string;
}

export function onPlayerJoined(handler: (payload: PlayerJoinedPayload) => void): () => void {
  const s = getSocket();
  s.on('player-joined', handler);
  return () => s.off('player-joined', handler);
}

export function onPlayerLeft(handler: (payload: PlayerLeftPayload) => void): () => void {
  const s = getSocket();
  s.on('player-left', handler);
  return () => s.off('player-left', handler);
}

export function onConnect(handler: () => void): () => void {
  const s = getSocket();
  s.on('connect', handler);
  return () => s.off('connect', handler);
}

export function onDisconnect(handler: () => void): () => void {
  const s = getSocket();
  s.on('disconnect', handler);
  return () => s.off('disconnect', handler);
}

