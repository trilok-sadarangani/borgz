"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requestLogger = requestLogger;
const crypto_1 = require("crypto");
const logger_1 = require("../utils/logger");
function stripQuery(url) {
    const idx = url.indexOf('?');
    return idx >= 0 ? url.slice(0, idx) : url;
}
function requestLogger(opts) {
    const ignore = new Set(opts?.ignorePaths || ['/health']);
    return function requestLoggerMiddleware(req, res, next) {
        const path = stripQuery(req.originalUrl || req.url || '');
        if (ignore.has(path))
            return next();
        const requestId = req.header('x-request-id') || (0, crypto_1.randomUUID)();
        req.id = requestId;
        res.setHeader('x-request-id', requestId);
        req.log = logger_1.logger.child({ requestId });
        const start = process.hrtime.bigint();
        res.on('finish', () => {
            const durationMs = Number(process.hrtime.bigint() - start) / 1e6;
            const meta = {
                method: req.method,
                path,
                status: res.statusCode,
                durationMs: Math.round(durationMs),
                ip: req.ip,
                userAgent: req.header('user-agent'),
            };
            if (res.statusCode >= 500)
                req.log?.error('http.request', meta);
            else if (res.statusCode >= 400)
                req.log?.warn('http.request', meta);
            else
                req.log?.info('http.request', meta);
        });
        next();
    };
}
