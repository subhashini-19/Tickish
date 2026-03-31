import { Request, Response, NextFunction } from 'express';
import { logger } from './logger';

export class AppError extends Error {
  constructor(
    public message: string,
    public statusCode: number = 500,
    public code?: string
  ) {
    super(message);
    this.name = 'AppError';
  }
}

// Central error handler — Express calls this when next(error) is called anywhere
// Having one place to handle errors keeps controllers clean and logging consistent
export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction
): void {
  if (err instanceof AppError) {
    logger.warn('Client error', { message: err.message, code: err.code, path: req.path });
    res.status(err.statusCode).json({ error: err.message, code: err.code });
    return;
  }

  // Unexpected errors — log full stack, return generic message (don't leak internals)
  logger.error('Unhandled error', { error: err.message, stack: err.stack, path: req.path });
  res.status(500).json({ error: 'Internal server error' });
}
