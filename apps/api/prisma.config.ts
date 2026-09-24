// Prisma CLI configuration (ADR-0004). Reads the repository-root .env when present.
// Migrations use DIRECT_URL when it is set: a hosted database may give the app a pooled URL,
// while migrations need a plain session (ARCHITECTURE §12.2). Locally both URLs are the same.
import path from 'node:path';
import { config as loadEnvFile } from 'dotenv';
import { defineConfig } from 'prisma/config';

loadEnvFile({ path: path.join(import.meta.dirname, '../../.env'), quiet: true });

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'node --import tsx prisma/seed.ts',
  },
  datasource: {
    url: process.env['DIRECT_URL'] ?? process.env['DATABASE_URL'],
  },
});
