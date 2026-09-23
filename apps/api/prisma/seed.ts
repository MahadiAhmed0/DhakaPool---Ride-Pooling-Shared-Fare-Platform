// Seeds the database with the Dhaka zones and the reference personas (NFR-POR-03, DR-15).
// Run with `npm run db:seed` (or automatically when the API container starts). Safe to run repeatedly.
import bcrypt from 'bcryptjs';
import { prisma } from '../src/db/client.ts';
import { seedPersonas } from './seed-steps/seed-personas.ts';
import { seedZones } from './seed-steps/seed-zones.ts';

// Demo-only password shared by every persona; documented in the README (never a real secret).
const DEFAULT_DEMO_PASSWORD = 'TeslaPool#2026';
const DEFAULT_BCRYPT_COST = 12;

async function main(): Promise<void> {
  const password = process.env['SEED_DEMO_PASSWORD'] ?? DEFAULT_DEMO_PASSWORD;
  const cost = Number(process.env['BCRYPT_COST'] ?? DEFAULT_BCRYPT_COST);
  const passwordHash = await bcrypt.hash(password, cost);

  await seedZones(prisma);
  await seedPersonas(prisma, passwordHash);
  console.log(
    'Seed complete: 10 zones, 5 personas (Nusrat, Rafiq, Shirin, Jashim with Bullet, Kamal with Toofan).',
  );
}

main()
  .catch((error: unknown) => {
    console.error('Seed failed:', error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
