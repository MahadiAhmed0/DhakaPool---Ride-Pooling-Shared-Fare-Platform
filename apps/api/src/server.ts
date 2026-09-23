// Starts the API and shuts it down cleanly when Docker (or Ctrl+C) asks it to stop.
import { createApp } from './app.ts';
import { env } from './config/env.ts';
import { prisma } from './db/client.ts';
import { logger } from './logger.ts';

const server = createApp().listen(env.API_PORT, () => {
  logger.info({ port: env.API_PORT }, 'Dhaka Tesla Pool API is listening');
});

function shutDown(signal: string): void {
  logger.info({ signal }, 'Shutting down');
  server.close(() => {
    void prisma.$disconnect().finally(() => process.exit(0));
  });
}

process.on('SIGTERM', () => shutDown('SIGTERM'));
process.on('SIGINT', () => shutDown('SIGINT'));
