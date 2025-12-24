import { Server, Socket } from 'socket.io';
import { gameService } from '../services/gameService';
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

        // Notify other players
        socket.to(`game:${gameCode}`).emit('player-joined', {
          playerId,
          state: game.getState(),
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

        // Broadcast updated state to all players in the game
        const players = game.getState().players;
        players.forEach((player) => {
          const playerState = game.getStateForPlayer(player.id);
          io.to(`game:${socket.gameCode}`).emit('game-state', playerState);
        });

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

        const state = game.getStateForPlayer(socket.playerId);
        socket.emit('game-state', state);
      } catch (error) {
        socket.emit('error', {
          message: error instanceof Error ? error.message : 'Failed to get game state',
        });
      }
    });

    /**
     * Disconnect handler
     */
    socket.on('disconnect', () => {
      if (socket.gameCode && socket.playerId) {
        socket.to(`game:${socket.gameCode}`).emit('player-left', {
          playerId: socket.playerId,
        });
      }
      console.log('Client disconnected:', socket.id);
    });
  });
}

