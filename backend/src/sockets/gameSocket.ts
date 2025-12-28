import { Server, Socket } from 'socket.io';
import { gameService } from '../services/gameService';
import { gameHistoryService } from '../services/gameHistoryService';
import { dbPersistenceService } from '../services/dbPersistenceService';
import { PlayerAction } from '../types';

interface GameSocket extends Socket {
  gameCode?: string;
  playerId?: string;
}

/**
 * Sets up game-related socket handlers
 */
export function setupGameSocket(io: Server): void {
  io.on('connection', (socket: GameSocket) => {
    console.log('Client connected:', socket.id);

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
        const game = gameService.getGameByCode(gameCode);

        if (!game) {
          socket.emit('error', { message: 'Game not found' });
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
          void dbPersistenceService.ensurePlayer(playerId).catch(() => {});
        }

        // Notify other players
        socket.to(`game:${gameCode}`).emit('player-joined', {
          playerId,
          state: game.getPublicState(),
        });

        console.log(`Player ${playerId} joined game ${gameCode}`);
      } catch (error) {
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
        if (socket.playerId) {
          gameHistoryService.recordPlayerLeft(socket.gameCode, socket.playerId, Date.now());
        }
        socket.leave(`game:${socket.gameCode}`);
        socket.to(`game:${socket.gameCode}`).emit('player-left', {
          playerId: socket.playerId,
        });
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
          return;
        }

        const game = gameService.getGameByCode(socket.gameCode);
        if (!game) {
          socket.emit('error', { message: 'Game not found' });
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
            void dbPersistenceService.persistHandFinished(state.id, persisted).catch(() => {});
          }
        }

        // Broadcast updated state to each socket with the correct per-player sanitization
        void emitStatesForGame(socket.gameCode);

        console.log(
          `Player ${socket.playerId} performed action: ${data.action} in game ${socket.gameCode}`
        );
      } catch (error) {
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
          return;
        }

        const game = gameService.getGameByCode(socket.gameCode);
        if (!game) {
          socket.emit('error', { message: 'Game not found' });
          return;
        }

        socket.emit('game-state', game.getStateForPlayer(socket.playerId));
      } catch (error) {
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
          return;
        }

        const game = gameService.getGameByCode(socket.gameCode);
        if (!game) {
          socket.emit('error', { message: 'Game not found' });
          return;
        }

        game.startGame(socket.playerId);
        await emitStatesForGame(socket.gameCode);
      } catch (error) {
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
          return;
        }

        const game = gameService.getGameByCode(socket.gameCode);
        if (!game) {
          socket.emit('error', { message: 'Game not found' });
          return;
        }

        game.nextHand(socket.playerId);
        await emitStatesForGame(socket.gameCode);
      } catch (error) {
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
          return;
        }
        const game = gameService.getGameByCode(socket.gameCode);
        if (!game) {
          socket.emit('error', { message: 'Game not found' });
          return;
        }
        const amount = Number(data?.amount);
        game.rebuy(socket.playerId, amount);
        await emitStatesForGame(socket.gameCode);
      } catch (error) {
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
          return;
        }

        const game = gameService.getGameByCode(socket.gameCode);
        if (!game) {
          socket.emit('error', { message: 'Game not found' });
          return;
        }

        const state = game.getState();
        if (state.hostPlayerId && state.hostPlayerId !== socket.playerId) {
          socket.emit('error', { message: 'Only the host can end the game' });
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
      } catch (error) {
        socket.emit('error', {
          message: error instanceof Error ? error.message : 'Failed to end game',
        });
      }
    });

    /**
     * Disconnect handler
     */
    socket.on('disconnect', () => {
      if (socket.gameCode && socket.playerId) {
        gameHistoryService.recordPlayerLeft(socket.gameCode, socket.playerId, Date.now());
        socket.to(`game:${socket.gameCode}`).emit('player-left', {
          playerId: socket.playerId,
        });
      }
      console.log('Client disconnected:', socket.id);
    });
  });
}

