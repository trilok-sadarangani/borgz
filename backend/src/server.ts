import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
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
import { gameService } from './services/gameService';

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

// Diagnostic endpoint to check SPA status
app.get('/health/spa', (_req, res) => {
  const spaClientDistPath = path.join(__dirname, '..', 'client-dist');
  const spaIndexHtmlPath = path.join(spaClientDistPath, 'index.html');
  const clientDistExists = fs.existsSync(spaClientDistPath);
  const indexHtmlExists = fs.existsSync(spaIndexHtmlPath);

  res.json({
    status: clientDistExists && indexHtmlExists ? 'ok' : 'not_available',
    clientDistPath: spaClientDistPath,
    clientDistExists,
    indexHtmlExists,
    __dirname,
    mode: clientDistExists && indexHtmlExists ? 'spa' : 'api-only',
  });
});

// API routes
app.use('/api/games', gameRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/clubs', clubRoutes);
app.use('/api/history', historyRoutes);
app.use('/api/stats', statsRoutes);

// ============================================================================
// Static file serving for web client (SPA)
// ============================================================================
// In production, serve the built Expo web client from the 'client-dist' folder.
// This enables a single deployment that handles both API and frontend.
const clientDistPath = path.join(__dirname, '..', 'client-dist');
const indexHtmlPath = path.join(clientDistPath, 'index.html');
const clientDistExists = fs.existsSync(clientDistPath);
const indexHtmlExists = fs.existsSync(indexHtmlPath);

logger.info('spa.init', {
  clientDistPath,
  indexHtmlPath,
  clientDistExists,
  indexHtmlExists,
  __dirname,
});

if (clientDistExists && indexHtmlExists) {
  logger.info('spa.serving', { path: clientDistPath });

  // Serve static assets (JS, CSS, images, etc.)
  app.use(express.static(clientDistPath));

  // SPA fallback: serve index.html for all non-API routes
  // This allows client-side routing to work (e.g., /clubs, /login, etc.)
  app.get('*', (req, res) => {
    // Don't serve index.html for API routes or socket.io
    if (req.path.startsWith('/api') || req.path.startsWith('/socket.io')) {
      return res.status(404).json({ error: 'Not found' });
    }
    return res.sendFile(indexHtmlPath);
  });
} else {
  logger.warn('spa.notFound', {
    clientDistPath,
    indexHtmlPath,
    clientDistExists,
    indexHtmlExists,
    note: 'Client dist not found - running API-only mode. SPA routes will 404.',
  });

  // Add a fallback for non-API routes when client isn't available
  app.get('*', (req, res) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/socket.io')) {
      return res.status(404).json({ error: 'Not found' });
    }
    return res.status(404).json({
      error: 'Not found',
      message: 'Web client not available. This server is running in API-only mode.',
    });
  });
}

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

// Restore live games from DB snapshots so they can be resumed after restart.
void gameService.loadLiveGamesFromDb().catch((err) => {
  logger.warn('gameService.loadLiveGamesFromDb.failed', { err: toErrorMeta(err) });
});

