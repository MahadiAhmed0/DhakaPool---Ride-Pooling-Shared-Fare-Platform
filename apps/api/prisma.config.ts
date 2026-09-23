// Prisma CLI configuration (ADR-0004). Reads DATABASE_URL from the repository-root .env when present.
import path from 'node:path';
import { config as loadEnvFile } from 'dotenv';
import { defineConfig } from 'prisma/config';

loadEnvFile({ path: path.join(import.meta.dirname, '../../.env'), quiet: true });

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    url: process.env['DATABASE_URL'],
  },
});
