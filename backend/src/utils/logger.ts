export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export type LogMeta = Record<string, unknown>;

export interface Logger {
  debug: (msg: string, meta?: LogMeta) => void;
  info: (msg: string, meta?: LogMeta) => void;
  warn: (msg: string, meta?: LogMeta) => void;
  error: (msg: string, meta?: LogMeta) => void;
  child: (meta: LogMeta) => Logger;
}

const levelRank: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

function normalizeLevel(input: unknown): LogLevel {
  const v = String(input || '').toLowerCase().trim();
  if (v === 'debug' || v === 'info' || v === 'warn' || v === 'error') return v;
  // Default: more verbose in local dev, quieter elsewhere
  const isProd = String(process.env.NODE_ENV || '').toLowerCase() === 'production';
  return isProd ? 'info' : 'debug';
}

function shouldLog(level: LogLevel): boolean {
  const min = normalizeLevel(process.env.LOG_LEVEL);
  return levelRank[level] >= levelRank[min];
}

export function toErrorMeta(err: unknown): LogMeta {
  if (err instanceof Error) {
    const anyErr = err as unknown as { code?: unknown };
    return {
      name: err.name,
      message: err.message,
      stack: err.stack,
      ...(anyErr.code !== undefined ? { code: anyErr.code } : {}),
    };
  }
  if (typeof err === 'string') return { message: err };
  return { message: 'Non-Error thrown', value: err };
}

function safeJsonStringify(value: unknown): string {
  const seen = new WeakSet<object>();
  return JSON.stringify(
    value,
    (_key, v) => {
      if (typeof v === 'bigint') return Number(v);
      if (typeof v === 'object' && v !== null) {
        if (seen.has(v)) return '[Circular]';
        seen.add(v);
      }
      return v;
    },
    0
  );
}

function writeLine(level: LogLevel, payload: LogMeta): void {
  const line = safeJsonStringify({
    ts: new Date().toISOString(),
    level,
    pid: process.pid,
    ...payload,
  });
  if (level === 'warn' || level === 'error') {
    // eslint-disable-next-line no-console
    console.error(line);
  } else {
    // eslint-disable-next-line no-console
    console.log(line);
  }
}

export function createLogger(baseMeta: LogMeta = {}): Logger {
  const log = (level: LogLevel, msg: string, meta?: LogMeta) => {
    if (!shouldLog(level)) return;
    writeLine(level, { ...baseMeta, msg, ...(meta || {}) });
  };

  return {
    debug: (msg, meta) => log('debug', msg, meta),
    info: (msg, meta) => log('info', msg, meta),
    warn: (msg, meta) => log('warn', msg, meta),
    error: (msg, meta) => log('error', msg, meta),
    child: (meta) => createLogger({ ...baseMeta, ...meta }),
  };
}

export const logger = createLogger({ service: 'backend' });


