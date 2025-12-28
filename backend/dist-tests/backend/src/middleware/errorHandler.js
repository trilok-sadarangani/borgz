"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = errorHandler;
const logger_1 = require("../utils/logger");
function errorHandler(err, req, res, next) {
    const log = req.log || logger_1.logger;
    log.error('http.error', {
        requestId: req.id,
        method: req.method,
        path: req.originalUrl || req.url,
        err: (0, logger_1.toErrorMeta)(err),
    });
    if (res.headersSent) {
        next(err);
        return;
    }
    res.status(500).json({
        success: false,
        error: 'Internal Server Error',
        requestId: req.id,
    });
}
