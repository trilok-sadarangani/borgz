"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.startSocketTestServer = startSocketTestServer;
exports.connectClient = connectClient;
exports.disconnectClient = disconnectClient;
exports.waitForEvent = waitForEvent;
const http_1 = require("http");
const socket_io_1 = require("socket.io");
const socket_io_client_1 = require("socket.io-client");
const gameSocket_1 = require("../gameSocket");
async function startSocketTestServer() {
    const httpServer = (0, http_1.createServer)((_req, res) => {
        res.writeHead(200);
        res.end('ok');
    });
    await new Promise((resolve) => {
        httpServer.listen(0, '127.0.0.1', () => resolve());
    });
    const addr = httpServer.address();
    const url = `http://127.0.0.1:${addr.port}`;
    const io = new socket_io_1.Server(httpServer, {
        cors: { origin: '*', methods: ['GET', 'POST'] },
    });
    (0, gameSocket_1.setupGameSocket)(io);
    return {
        url,
        io,
        close: async () => {
            // Close Socket.IO first.
            await new Promise((resolve) => io.close(() => resolve()));
            // Then close the underlying HTTP server (idempotent across test failures / double-closes).
            if (!httpServer.listening)
                return;
            await new Promise((resolve, reject) => {
                httpServer.close((err) => {
                    // Node throws ERR_SERVER_NOT_RUNNING if the server was already closed.
                    // Treat that as success to keep cleanup robust.
                    if (err && err.code !== 'ERR_SERVER_NOT_RUNNING') {
                        reject(err);
                        return;
                    }
                    resolve();
                });
            });
        },
    };
}
async function connectClient(url) {
    const socket = (0, socket_io_client_1.io)(url, {
        transports: ['websocket'],
        forceNew: true,
        reconnection: false,
        timeout: 1500,
    });
    await waitForEvent(socket, 'connect', 1500);
    return socket;
}
async function disconnectClient(socket) {
    if (!socket.connected) {
        socket.removeAllListeners();
        return;
    }
    socket.disconnect();
    socket.removeAllListeners();
}
function waitForEvent(socket, event, timeoutMs = 1500) {
    return new Promise((resolve, reject) => {
        const t = setTimeout(() => {
            cleanup();
            reject(new Error(`Timed out waiting for event "${event}"`));
        }, timeoutMs);
        const onEvent = (payload) => {
            cleanup();
            resolve(payload);
        };
        const onError = (err) => {
            cleanup();
            reject(err instanceof Error ? err : new Error(String(err)));
        };
        function cleanup() {
            clearTimeout(t);
            socket.off(event, onEvent);
            socket.off('connect_error', onError);
            socket.off('error', onError);
        }
        socket.once(event, onEvent);
        socket.once('connect_error', onError);
    });
}
