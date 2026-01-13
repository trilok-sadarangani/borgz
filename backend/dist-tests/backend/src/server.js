"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const http_1 = require("http");
const socket_io_1 = require("socket.io");
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const gameRoutes_1 = __importDefault(require("./routes/gameRoutes"));
const authRoutes_1 = __importDefault(require("./routes/authRoutes"));
const clubRoutes_1 = __importDefault(require("./routes/clubRoutes"));
const historyRoutes_1 = __importDefault(require("./routes/historyRoutes"));
const statsRoutes_1 = __importDefault(require("./routes/statsRoutes"));
const gameSocket_1 = require("./sockets/gameSocket");
const requestLogger_1 = require("./middleware/requestLogger");
const errorHandler_1 = require("./middleware/errorHandler");
const logger_1 = require("./utils/logger");
const clubService_1 = require("./services/clubService");
dotenv_1.default.config();
const app = (0, express_1.default)();
const httpServer = (0, http_1.createServer)(app);
const io = new socket_io_1.Server(httpServer, {
    cors: {
        origin: process.env.CORS_ORIGIN || 'http://localhost:8081',
        methods: ['GET', 'POST'],
    },
});
const PORT = process.env.PORT || 3001;
// Middleware
app.use((0, cors_1.default)());
app.use(express_1.default.json());
app.use((0, requestLogger_1.requestLogger)());
// Health check endpoint
app.get('/health', (_req, res) => {
    res.json({ status: 'ok', message: 'Poker server is running' });
});
// API routes
app.use('/api/games', gameRoutes_1.default);
app.use('/api/auth', authRoutes_1.default);
app.use('/api/clubs', clubRoutes_1.default);
app.use('/api/history', historyRoutes_1.default);
app.use('/api/stats', statsRoutes_1.default);
// Centralized error handler (for any uncaught sync/async errors in routes/middleware)
app.use(errorHandler_1.errorHandler);
// Socket.io connection handling
(0, gameSocket_1.setupGameSocket)(io);
process.on('unhandledRejection', (reason) => {
    logger_1.logger.error('process.unhandledRejection', { reason: (0, logger_1.toErrorMeta)(reason) });
});
process.on('uncaughtException', (err) => {
    logger_1.logger.error('process.uncaughtException', { err: (0, logger_1.toErrorMeta)(err) });
});
httpServer.listen(PORT, () => {
    logger_1.logger.info('server.listening', {
        port: PORT,
        corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:8081',
    });
    logger_1.logger.info('socket.ready');
});
// Best-effort: hydrate in-memory caches from DB so reads survive restarts.
// Do NOT block startup if DB is down; routes will still work in in-memory mode.
void clubService_1.clubService.loadFromDb().catch((err) => {
    logger_1.logger.warn('clubService.loadFromDb.failed', { err: (0, logger_1.toErrorMeta)(err) });
});
