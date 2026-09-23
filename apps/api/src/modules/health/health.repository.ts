// Database query used by the health check.
import { prisma } from '../../db/client.ts';

export async function pingDatabase(): Promise<void> {
  await prisma.$queryRaw`SELECT 1`;
}
