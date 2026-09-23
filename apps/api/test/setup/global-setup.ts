// Runs once before all tests: brings the test database up to date and loads the zone reference data.
// Migrations run through Node directly (no shell), so paths with spaces or "&" work on every OS.
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import path from 'node:path';
import { TEST_DATABASE_URL } from './test-database-url.ts';

const require = createRequire(import.meta.url);
const prismaCli = path.join(path.dirname(require.resolve('prisma/package.json')), 'build/index.js');

export async function setup(): Promise<void> {
  execFileSync(process.execPath, [prismaCli, 'migrate', 'deploy'], {
    cwd: path.join(import.meta.dirname, '../..'),
    env: { ...process.env, DATABASE_URL: TEST_DATABASE_URL },
    stdio: 'pipe',
  });
  process.env['DATABASE_URL'] = TEST_DATABASE_URL;
  const { prisma } = await import('../../src/db/client.ts');
  const { seedZones } = await import('../../prisma/seed-steps/seed-zones.ts');
  await seedZones(prisma);
  await prisma.$disconnect();
}
