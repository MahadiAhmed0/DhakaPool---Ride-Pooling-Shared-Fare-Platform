// Builds the Express app: the request pipeline (ARCHITECTURE §5.1) and the module routes.
// The server and the tests both use this function, so tests exercise the real app.
import cookieParser from 'cookie-parser';
import cors from 'cors';
import express, { type Express } from 'express';
import helmet from 'helmet';
import { env } from './config/env.ts';
import { AUTH_ATTEMPTS_PER_MINUTE } from './config/rules.ts';
import { errorHandler } from './middleware/error-handler.ts';
import { httpLogger } from './middleware/http-logger.ts';
import { notFound } from './middleware/not-found.ts';
import { createAuthRateLimiter } from './middleware/rate-limit.ts';
import { requestId } from './middleware/request-id.ts';
import { loadSession } from './middleware/session.ts';
import { createAuthRouter } from './modules/auth/auth.routes.ts';
import { driversRouter } from './modules/drivers/drivers.routes.ts';
import { faresRouter } from './modules/fares/fares.routes.ts';
import { healthRouter } from './modules/health/health.routes.ts';
import { ridesRouter } from './modules/rides/rides.routes.ts';
import { zonesRouter } from './modules/zones/zones.routes.ts';

// Largest JSON body the API accepts (ARCHITECTURE §8). Every request body is small.
const JSON_BODY_LIMIT = '100kb';

export type AppOptions = {
  // Tests that sign in many times raise this; the default is the NFR-SEC-07 limit.
  authAttemptsPerMinute?: number;
};

export function createApp(options: AppOptions = {}): Express {
  const app = express();
  // The web app's /api proxy is the one hop in front of the API, so the client IP used for rate
  // limiting is taken from the X-Forwarded-For header that proxy adds.
  app.set('trust proxy', 1);

  app.use(requestId);
  app.use(httpLogger);
  app.use(helmet());
  // Browsers reach the API through the web app's same-origin proxy; CORS only matters for direct calls.
  app.use(cors({ origin: env.WEB_ORIGIN, credentials: true }));
  app.use(express.json({ limit: JSON_BODY_LIMIT }));
  app.use(cookieParser());
  app.use(loadSession);

  app.use('/health', healthRouter);
  app.use('/api/health', healthRouter);
  const authAttempts = options.authAttemptsPerMinute ?? AUTH_ATTEMPTS_PER_MINUTE;
  app.use('/api/auth', createAuthRouter(createAuthRateLimiter(authAttempts)));
  app.use('/api/zones', zonesRouter);
  app.use('/api/fares', faresRouter);
  app.use('/api/rides', ridesRouter);
  app.use('/api/driver', driversRouter);

  app.use(notFound);
  app.use(errorHandler);
  return app;
}
