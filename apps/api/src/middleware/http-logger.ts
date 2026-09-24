// Logs one line per HTTP request with its id, method, route, status and duration (NFR-OBS-01).
// Headers are left out on purpose: they are noisy and may carry cookies (NFR-OBS-03).
import type { IncomingMessage, ServerResponse } from 'node:http';
import { pinoHttp } from 'pino-http';
import { logger } from '../logger.ts';

// Docker and the hosting platform call /health every few seconds; logging those would bury real traffic.
const QUIET_PATHS = new Set(['/health', '/api/health']);

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
  // Which user made the request (set by the session middleware; absent when signed out).
  customProps: (req) => ({ userId: (req as { user?: { id: string } }).user?.id }),
  autoLogging: { ignore: (req) => QUIET_PATHS.has(req.url ?? '') },
  serializers: {
    req: (req: { id: string; method: string; url: string }) => ({
      id: req.id,
      method: req.method,
      url: req.url,
    }),
    res: (res: { statusCode: number }) => ({ statusCode: res.statusCode }),
  },
});
