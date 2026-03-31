import { Request, Response, NextFunction } from 'express';
import { AsyncLocalStorage } from 'async_hooks';

// AsyncLocalStorage is Node's built-in way to store data scoped to an async call chain.
// Think of it like a thread-local in Java — but for async/await chains.
// Once set in a middleware, every async function called downstream in the same request
// can read it without it being passed as a parameter.

const storage = new AsyncLocalStorage<{ correlationId: string }>();

// Read the current request's correlation ID from anywhere in the call stack
export function getCorrelationId(): string {
  return storage.getStore()?.correlationId ?? 'no-context';
}

// Express middleware — runs first, sets the correlation ID for the request lifetime
export function correlationIdMiddleware(req: Request, res: Response, next: NextFunction): void {
  // Honour an incoming correlation ID (useful when the Angular app or an API gateway sends one)
  // Otherwise generate a fresh one using the built-in crypto module — no extra dependency needed
  const correlationId =
    (req.headers['x-correlation-id'] as string) || crypto.randomUUID();

  // Echo it back so the client can correlate its own logs with server logs
  res.setHeader('x-correlation-id', correlationId);

  // Run the rest of the request inside the AsyncLocalStorage context
  storage.run({ correlationId }, () => next());
}
