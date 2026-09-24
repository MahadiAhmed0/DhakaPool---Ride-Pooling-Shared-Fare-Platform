// Builds the Express app: the request pipeline (ARCHITECTURE §5.1) and the module routes.
// The server and the tests both use this function, so tests exercise the real app.
import cookieParser from 'cookie-parser';
import cors from 'cors';
import express, { type Express } from 'express';
import helmet from 'helmet';
import { env } from './config/env.ts';
import { errorHandler } from './middleware/error-handler.ts';
import { httpLogger } from './middleware/http-logger.ts';
import { notFound } from './middleware/not-found.ts';
import { requestId } from './middleware/request-id.ts';
import { authRouter } from './modules/auth/auth.routes.ts';
import { healthRouter } from './modules/health/health.routes.ts';

// Largest JSON body the API accepts (ARCHITECTURE §8). Every request body is small.
const JSON_BODY_LIMIT = '100kb';

export function createApp(): Express {
  const app = express();

  app.use(requestId);
  app.use(httpLogger);
  app.use(helmet());
  // Browsers reach the API through the web app's same-origin proxy; CORS only matters for direct calls.
  app.use(cors({ origin: env.WEB_ORIGIN, credentials: true }));
  app.use(express.json({ limit: JSON_BODY_LIMIT }));
  app.use(cookieParser());

  app.use('/health', healthRouter);
  app.use('/api/health', healthRouter);
  app.use('/api/auth', authRouter);

  app.use(notFound);
  app.use(errorHandler);
  return app;
}
