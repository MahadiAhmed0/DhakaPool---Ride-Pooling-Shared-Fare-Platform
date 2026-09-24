// Starts the API and the request-expiry job, and shuts both down cleanly when Docker (or Ctrl+C)
// asks the process to stop.
import { createApp } from './app.ts';
import { env } from './config/env.ts';
import { prisma } from './db/client.ts';
import { startExpiryJob } from './jobs/expire-requests.ts';
import { logger } from './logger.ts';

const server = createApp().listen(env.API_PORT, () => {
  logger.info({ port: env.API_PORT }, 'Dhaka Tesla Pool API is listening');
});
const stopExpiryJob = startExpiryJob();

function shutDown(signal: string): void {
  logger.info({ signal }, 'Shutting down');
  stopExpiryJob();
  server.close(() => {
    void prisma.$disconnect().finally(() => process.exit(0));
  });
}

process.on('SIGTERM', () => shutDown('SIGTERM'));
process.on('SIGINT', () => shutDown('SIGINT'));
