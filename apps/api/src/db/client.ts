// The single Prisma client used by the whole API (ADR-0004).
// Prisma 7 talks to PostgreSQL through the "pg" driver adapter.
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client.ts';
import { env } from '../config/env.ts';

const adapter = new PrismaPg({ connectionString: env.DATABASE_URL });

export const prisma = new PrismaClient({ adapter });
