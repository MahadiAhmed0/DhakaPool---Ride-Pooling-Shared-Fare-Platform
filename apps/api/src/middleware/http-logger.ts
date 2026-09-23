// Logs one line per HTTP request with its id, method, route, status and duration (NFR-OBS-01).
import type { IncomingMessage, ServerResponse } from 'node:http';
import { pinoHttp } from 'pino-http';
import { logger } from '../logger.ts';

function chooseLogLevel(
  _req: IncomingMessage,
  res: ServerResponse,
  error?: Error,
): 'error' | 'warn' | 'info' {
  if (error || res.statusCode >= 500) {
    return 'error';
  }
  if (res.statusCode >= 400) {
    return 'warn';
  }
  return 'info';
}

export const httpLogger = pinoHttp({
  logger,
  // The request id is set by the request-id middleware, which runs first.
  genReqId: (req) => req.id ?? 'unknown',
  customLogLevel: chooseLogLevel,
});
