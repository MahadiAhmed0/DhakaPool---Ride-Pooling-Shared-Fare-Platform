// The application logger: structured JSON logs on stdout (NFR-OBS-01).
// Cookies, tokens and passwords are never written to the logs (NFR-OBS-03).
import { pino } from 'pino';
import { env } from './config/env.ts';

export const logger = pino({
  level: env.LOG_LEVEL,
  redact: {
    paths: [
      'req.headers.cookie',
      'req.headers.authorization',
      'res.headers["set-cookie"]',
      '*.password',
      '*.token',
    ],
    censor: '[redacted]',
  },
});
