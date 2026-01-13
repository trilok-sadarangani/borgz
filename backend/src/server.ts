import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import gameRoutes from './routes/gameRoutes';
import authRoutes from './routes/authRoutes';
import clubRoutes from './routes/clubRoutes';
import historyRoutes from './routes/historyRoutes';
import statsRoutes from './routes/statsRoutes';
import { setupGameSocket } from './sockets/gameSocket';
import { requestLogger } from './middleware/requestLogger';
import { errorHandler } from './middleware/errorHandler';
import { logger, toErrorMeta } from './utils/logger';
import { clubService } from './services/clubService';

dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:8081',
    methods: ['GET', 'POST'],
  },
});

const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(requestLogger());

// Health check endpoint
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', message: 'Poker server is running' });
});

// API routes
app.use('/api/games', gameRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/clubs', clubRoutes);
app.use('/api/history', historyRoutes);
app.use('/api/stats', statsRoutes);

// Centralized error handler (for any uncaught sync/async errors in routes/middleware)
app.use(errorHandler);

// Socket.io connection handling
setupGameSocket(io);

process.on('unhandledRejection', (reason) => {
  logger.error('process.unhandledRejection', { reason: toErrorMeta(reason) });
});

process.on('uncaughtException', (err) => {
  logger.error('process.uncaughtException', { err: toErrorMeta(err) });
});

httpServer.listen(PORT, () => {
  logger.info('server.listening', {
    port: PORT,
    corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:8081',
  });
  logger.info('socket.ready');
});

// Best-effort: hydrate in-memory caches from DB so reads survive restarts.
// Do NOT block startup if DB is down; routes will still work in in-memory mode.
void clubService.loadFromDb().catch((err) => {
  logger.warn('clubService.loadFromDb.failed', { err: toErrorMeta(err) });
});

