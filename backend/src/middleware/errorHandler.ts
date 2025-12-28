import type { NextFunction, Request, Response } from 'express';
import { logger, toErrorMeta } from '../utils/logger';

export function errorHandler(err: unknown, req: Request, res: Response, next: NextFunction): void {
  const log = req.log || logger;
  log.error('http.error', {
    requestId: req.id,
    method: req.method,
    path: req.originalUrl || req.url,
    err: toErrorMeta(err),
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


