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
// Socket.io connection handling
(0, gameSocket_1.setupGameSocket)(io);
httpServer.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📡 Socket.io server ready`);
});
