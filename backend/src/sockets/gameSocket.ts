import { Server, Socket } from 'socket.io';
import { gameService } from '../services/gameService';
import { gameHistoryService } from '../services/gameHistoryService';
import { dbPersistenceService } from '../services/dbPersistenceService';
import { PlayerAction, ChatMessage } from '../types';
import { logger, toErrorMeta } from '../utils/logger';

interface GameSocket extends Socket {
  gameCode?: string;
  playerId?: string;
}

/**
 * Sets up game-related socket handlers
 */
export function setupGameSocket(io: Server): void {
  io.on('connection', (socket: GameSocket) => {
    const log = logger.child({ socketId: socket.id });
    log.info('socket.connected');

    async function emitStatesForGame(gameCode: string) {
      const game = gameService.getGameByCode(gameCode);
      if (!game) return;

      const room = `game:${gameCode}`;
      const socketsInRoom = await io.in(room).fetchSockets();
      for (const s of socketsInRoom) {
        const gs = s as unknown as GameSocket;
        const pid = gs.playerId;
        if (!pid) continue;
        gs.emit('game-state', game.getStateForPlayer(pid));
      }
    }

    /**
     * Join a game room
     */
    socket.on('join-game', (data: { gameCode: string; playerId: string }) => {
      try {
        const { gameCode, playerId } = data;
        const slog = log.child({ gameCode, playerId });
        const game = gameService.getGameByCode(gameCode);

        if (!game) {
          socket.emit('error', { message: 'Game not found' });
          slog.warn('socket.joinGame.notFound');
          return;
        }

        socket.gameCode = gameCode;
        socket.playerId = playerId;
        socket.join(`game:${gameCode}`);

        const state = game.getStateForPlayer(playerId);
        socket.emit('game-state', state);

        // Track seat session (history) only if the player exists in the game state.
        const gs = game.getState();
        const inGame = gs.players.some((p) => p.id === playerId);
        if (inGame) {
          gameHistoryService.recordPlayerJoined(gameCode, playerId, Date.now());
          void dbPersistenceService.ensurePlayer(playerId).catch((err) => {
            slog.warn('db.ensurePlayer.failed', { err: toErrorMeta(err) });
          });
        }

        // Notify other players
        socket.to(`game:${gameCode}`).emit('player-joined', {
          playerId,
          state: game.getPublicState(),
        });

        slog.info('socket.joinGame.success');
      } catch (error) {
        log.warn('socket.joinGame.error', { err: toErrorMeta(error) });
        socket.emit('error', {
          message: error instanceof Error ? error.message : 'Failed to join game',
        });
      }
    });

    /**
     * Leave a game
     */
    socket.on('leave-game', () => {
      if (socket.gameCode) {
        const slog = log.child({ gameCode: socket.gameCode, playerId: socket.playerId });
        if (socket.playerId) {
          gameHistoryService.recordPlayerLeft(socket.gameCode, socket.playerId, Date.now());
        }
        socket.leave(`game:${socket.gameCode}`);
        socket.to(`game:${socket.gameCode}`).emit('player-left', {
          playerId: socket.playerId,
        });
        slog.info('socket.leaveGame');
        socket.gameCode = undefined;
        socket.playerId = undefined;
      }
    });

    /**
     * Player action (fold, call, raise, etc.)
     */
    socket.on('player-action', (data: { action: PlayerAction; amount?: number }) => {
      try {
        if (!socket.gameCode || !socket.playerId) {
          socket.emit('error', { message: 'Not in a game' });
          log.warn('socket.playerAction.notInGame');
          return;
        }
        const slog = log.child({ gameCode: socket.gameCode, playerId: socket.playerId });

        const game = gameService.getGameByCode(socket.gameCode);
        if (!game) {
          socket.emit('error', { message: 'Game not found' });
          slog.warn('socket.playerAction.gameNotFound');
          return;
        }

        game.processPlayerAction(socket.playerId, data.action, data.amount);

        // If the hand just finished, persist a snapshot for history.
        const state = game.getState();
        if (state.phase === 'finished' && state.lastHandResult) {
          const stacksStartByPlayerId = game.getHandStartStacksByPlayerId?.() || undefined;
          const stacksEndByPlayerId: Record<string, number> = {};
          for (const p of state.players) {
            stacksEndByPlayerId[p.id] = p.stack;
          }

          const persisted = gameHistoryService.recordHandFinished(state.id, {
            startedAt: typeof game.getHandStartedAt === 'function' ? game.getHandStartedAt() : undefined,
            endedAt: state.lastHandResult.endedAt,
            reason: state.lastHandResult.reason,
            winners: state.lastHandResult.winners.map((w) => ({ ...w })),
            pot: state.lastHandResult.pot,
            communityCards: state.communityCards.map((c) => ({ ...c })),
            actions: state.history.map((a) => ({ ...a })),
            table: {
              seats: state.players.map((p) => p.id),
              dealerPosition: state.dealerPosition,
              smallBlindPosition: state.smallBlindPosition,
              bigBlindPosition: state.bigBlindPosition,
            },
            stacksStartByPlayerId,
            stacksEndByPlayerId,
          });
          if (persisted) {
            void dbPersistenceService.persistHandFinished(state.id, persisted).catch((err) => {
              slog.warn('db.persistHandFinished.failed', { err: toErrorMeta(err) });
            });
          }
        }

        // Broadcast updated state to each socket with the correct per-player sanitization
        void emitStatesForGame(socket.gameCode);

        slog.info('socket.playerAction', { action: data.action, amount: data.amount });
      } catch (error) {
        log.warn('socket.playerAction.error', { err: toErrorMeta(error) });
        socket.emit('error', {
          message: error instanceof Error ? error.message : 'Invalid action',
        });
      }
    });

    /**
     * Request current game state
     */
    socket.on('get-game-state', () => {
      try {
        if (!socket.gameCode || !socket.playerId) {
          socket.emit('error', { message: 'Not in a game' });
          log.warn('socket.getGameState.notInGame');
          return;
        }
        const slog = log.child({ gameCode: socket.gameCode, playerId: socket.playerId });

        const game = gameService.getGameByCode(socket.gameCode);
        if (!game) {
          socket.emit('error', { message: 'Game not found' });
          slog.warn('socket.getGameState.gameNotFound');
          return;
        }

        socket.emit('game-state', game.getStateForPlayer(socket.playerId));
      } catch (error) {
        log.warn('socket.getGameState.error', { err: toErrorMeta(error) });
        socket.emit('error', {
          message: error instanceof Error ? error.message : 'Failed to get game state',
        });
      }
    });

    /**
     * Start a game (host action)
     */
    socket.on('start-game', async () => {
      try {
        if (!socket.gameCode || !socket.playerId) {
          socket.emit('error', { message: 'Not in a game' });
          log.warn('socket.startGame.notInGame');
          return;
        }
        const slog = log.child({ gameCode: socket.gameCode, playerId: socket.playerId });

        const game = gameService.getGameByCode(socket.gameCode);
        if (!game) {
          socket.emit('error', { message: 'Game not found' });
          slog.warn('socket.startGame.gameNotFound');
          return;
        }

        game.startGame(socket.playerId);
        await emitStatesForGame(socket.gameCode);
        slog.info('socket.startGame.success');
      } catch (error) {
        log.warn('socket.startGame.error', { err: toErrorMeta(error) });
        socket.emit('error', {
          message: error instanceof Error ? error.message : 'Failed to start game',
        });
      }
    });

    /**
     * Start the next hand (host action)
     */
    socket.on('next-hand', async () => {
      try {
        if (!socket.gameCode || !socket.playerId) {
          socket.emit('error', { message: 'Not in a game' });
          log.warn('socket.nextHand.notInGame');
          return;
        }
        const slog = log.child({ gameCode: socket.gameCode, playerId: socket.playerId });

        const game = gameService.getGameByCode(socket.gameCode);
        if (!game) {
          socket.emit('error', { message: 'Game not found' });
          slog.warn('socket.nextHand.gameNotFound');
          return;
        }

        game.nextHand(socket.playerId);
        await emitStatesForGame(socket.gameCode);
        slog.info('socket.nextHand.success');
      } catch (error) {
        log.warn('socket.nextHand.error', { err: toErrorMeta(error) });
        socket.emit('error', {
          message: error instanceof Error ? error.message : 'Failed to start next hand',
        });
      }
    });

    /**
     * Rebuy / add chips between hands
     */
    socket.on('rebuy', async (data: { amount: number }) => {
      try {
        if (!socket.gameCode || !socket.playerId) {
          socket.emit('error', { message: 'Not in a game' });
          log.warn('socket.rebuy.notInGame');
          return;
        }
        const slog = log.child({ gameCode: socket.gameCode, playerId: socket.playerId });
        const game = gameService.getGameByCode(socket.gameCode);
        if (!game) {
          socket.emit('error', { message: 'Game not found' });
          slog.warn('socket.rebuy.gameNotFound');
          return;
        }
        const amount = Number(data?.amount);
        game.rebuy(socket.playerId, amount);
        await emitStatesForGame(socket.gameCode);
        slog.info('socket.rebuy.success', { amount });
      } catch (error) {
        log.warn('socket.rebuy.error', { err: toErrorMeta(error) });
        socket.emit('error', {
          message: error instanceof Error ? error.message : 'Failed to rebuy',
        });
      }
    });

    /**
     * End a game (host action)
     * Removes the game from the server and notifies all connected clients.
     */
    socket.on('end-game', async () => {
      try {
        if (!socket.gameCode || !socket.playerId) {
          socket.emit('error', { message: 'Not in a game' });
          log.warn('socket.endGame.notInGame');
          return;
        }
        const slog = log.child({ gameCode: socket.gameCode, playerId: socket.playerId });

        const game = gameService.getGameByCode(socket.gameCode);
        if (!game) {
          socket.emit('error', { message: 'Game not found' });
          slog.warn('socket.endGame.gameNotFound');
          return;
        }

        const state = game.getState();
        if (state.hostPlayerId && state.hostPlayerId !== socket.playerId) {
          socket.emit('error', { message: 'Only the host can end the game' });
          slog.warn('socket.endGame.notHost', { hostPlayerId: state.hostPlayerId });
          return;
        }

        const room = `game:${socket.gameCode}`;
        io.to(room).emit('game-ended', { gameCode: socket.gameCode });

        // Mark ended + close sessions before removing the game.
        const endedAt = Date.now();
        gameHistoryService.markGameEnded(state.id, endedAt);
        gameHistoryService.closeAllOpenSessionsForGame(state.id, endedAt);

        // Best-effort: remove all sockets from the room and clear their in-memory pointers.
        const socketsInRoom = await io.in(room).fetchSockets();
        for (const s of socketsInRoom) {
          const gs = s as unknown as GameSocket;
          gs.leave(room);
          gs.gameCode = undefined;
          gs.playerId = undefined;
        }

        gameService.removeGame(state.id);
        slog.info('socket.endGame.success', { gameId: state.id });
      } catch (error) {
        log.warn('socket.endGame.error', { err: toErrorMeta(error) });
        socket.emit('error', {
          message: error instanceof Error ? error.message : 'Failed to end game',
        });
      }
    });

    /**
     * Send a chat message to the game room
     */
    socket.on('send-chat', (data: { message: string }) => {
      try {
        if (!socket.gameCode || !socket.playerId) {
          socket.emit('error', { message: 'Not in a game' });
          log.warn('socket.sendChat.notInGame');
          return;
        }
        const slog = log.child({ gameCode: socket.gameCode, playerId: socket.playerId });

        const game = gameService.getGameByCode(socket.gameCode);
        if (!game) {
          socket.emit('error', { message: 'Game not found' });
          slog.warn('socket.sendChat.gameNotFound');
          return;
        }

        // Find player name from game state
        const state = game.getState();
        const player = state.players.find((p) => p.id === socket.playerId);
        const playerName = player?.name || 'Unknown';

        // Sanitize and validate message
        const message = data.message?.trim().slice(0, 500);
        if (!message) {
          socket.emit('error', { message: 'Message cannot be empty' });
          return;
        }

        const chatMessage: ChatMessage = {
          id: `${socket.gameCode}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
          gameCode: socket.gameCode,
          playerId: socket.playerId,
          playerName,
          message,
          timestamp: Date.now(),
        };

        // Broadcast to all players in the game room (including sender)
        io.to(`game:${socket.gameCode}`).emit('chat-message', chatMessage);
        slog.info('socket.sendChat.success', { messageLength: message.length });
      } catch (error) {
        log.warn('socket.sendChat.error', { err: toErrorMeta(error) });
        socket.emit('error', {
          message: error instanceof Error ? error.message : 'Failed to send message',
        });
      }
    });

    /**
     * Disconnect handler
     */
    socket.on('disconnect', () => {
      if (socket.gameCode && socket.playerId) {
        const slog = log.child({ gameCode: socket.gameCode, playerId: socket.playerId });
        gameHistoryService.recordPlayerLeft(socket.gameCode, socket.playerId, Date.now());
        socket.to(`game:${socket.gameCode}`).emit('player-left', {
          playerId: socket.playerId,
        });
        slog.info('socket.disconnected.inGame');
      }
      log.info('socket.disconnected');
    });
  });
}

