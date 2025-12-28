"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = void 0;
exports.toErrorMeta = toErrorMeta;
exports.createLogger = createLogger;
const levelRank = {
    debug: 10,
    info: 20,
    warn: 30,
    error: 40,
};
function normalizeLevel(input) {
    const v = String(input || '').toLowerCase().trim();
    if (v === 'debug' || v === 'info' || v === 'warn' || v === 'error')
        return v;
    // Default: more verbose in local dev, quieter elsewhere
    const isProd = String(process.env.NODE_ENV || '').toLowerCase() === 'production';
    return isProd ? 'info' : 'debug';
}
function shouldLog(level) {
    const min = normalizeLevel(process.env.LOG_LEVEL);
    return levelRank[level] >= levelRank[min];
}
function toErrorMeta(err) {
    if (err instanceof Error) {
        const anyErr = err;
        return {
            name: err.name,
            message: err.message,
            stack: err.stack,
            ...(anyErr.code !== undefined ? { code: anyErr.code } : {}),
        };
    }
    if (typeof err === 'string')
        return { message: err };
    return { message: 'Non-Error thrown', value: err };
}
function safeJsonStringify(value) {
    const seen = new WeakSet();
    return JSON.stringify(value, (_key, v) => {
        if (typeof v === 'bigint')
            return Number(v);
        if (typeof v === 'object' && v !== null) {
            if (seen.has(v))
                return '[Circular]';
            seen.add(v);
        }
        return v;
    }, 0);
}
function writeLine(level, payload) {
    const line = safeJsonStringify({
        ts: new Date().toISOString(),
        level,
        pid: process.pid,
        ...payload,
    });
    if (level === 'warn' || level === 'error') {
        // eslint-disable-next-line no-console
        console.error(line);
    }
    else {
        // eslint-disable-next-line no-console
        console.log(line);
    }
}
function createLogger(baseMeta = {}) {
    const log = (level, msg, meta) => {
        if (!shouldLog(level))
            return;
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
exports.logger = createLogger({ service: 'backend' });
