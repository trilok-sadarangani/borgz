import { createServer } from 'http';
import { AddressInfo } from 'net';
import { Server as SocketIOServer } from 'socket.io';
import { io as createClient, Socket as ClientSocket } from 'socket.io-client';
import { setupGameSocket } from '../gameSocket';

export type SocketTestServer = {
  url: string;
  io: SocketIOServer;
  close: () => Promise<void>;
};

export async function startSocketTestServer(): Promise<SocketTestServer> {
  const httpServer = createServer((_req, res) => {
    res.writeHead(200);
    res.end('ok');
  });

  await new Promise<void>((resolve) => {
    httpServer.listen(0, '127.0.0.1', () => resolve());
  });

  const addr = httpServer.address() as AddressInfo;
  const url = `http://127.0.0.1:${addr.port}`;

  const io = new SocketIOServer(httpServer, {
    cors: { origin: '*', methods: ['GET', 'POST'] },
  });

  setupGameSocket(io);

  return {
    url,
    io,
    close: async () => {
      // Close Socket.IO first.
      await new Promise<void>((resolve) => io.close(() => resolve()));

      // Then close the underlying HTTP server (idempotent across test failures / double-closes).
      if (!httpServer.listening) return;
      await new Promise<void>((resolve, reject) => {
        httpServer.close((err) => {
          // Node throws ERR_SERVER_NOT_RUNNING if the server was already closed.
          // Treat that as success to keep cleanup robust.
          if (err && (err as NodeJS.ErrnoException).code !== 'ERR_SERVER_NOT_RUNNING') {
            reject(err);
            return;
          }
          resolve();
        });
      });
    },
  };
}

export async function connectClient(url: string): Promise<ClientSocket> {
  const socket = createClient(url, {
    transports: ['websocket'],
    forceNew: true,
    reconnection: false,
    timeout: 1500,
  });

  await waitForEvent(socket, 'connect', 1500);
  return socket;
}

export async function disconnectClient(socket: ClientSocket): Promise<void> {
  if (!socket.connected) {
    socket.removeAllListeners();
    return;
  }

  socket.disconnect();
  socket.removeAllListeners();
}

export function waitForEvent<T>(
  socket: ClientSocket,
  event: string,
  timeoutMs = 1500
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const t = setTimeout(() => {
      cleanup();
      reject(new Error(`Timed out waiting for event "${event}"`));
    }, timeoutMs);

    const onEvent = (payload: T) => {
      cleanup();
      resolve(payload);
    };

    const onError = (err: unknown) => {
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


