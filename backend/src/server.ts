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

// Socket.io connection handling
setupGameSocket(io);

httpServer.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📡 Socket.io server ready`);
});

