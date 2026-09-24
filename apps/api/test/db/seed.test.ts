// The seed loads the SRS reference data and the personas, and is safe to run again (TC-37, NFR-POR-03).
import bcrypt from 'bcryptjs';
import { beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '../../src/db/client.ts';
import { seedPersonas } from '../../prisma/seed-steps/seed-personas.ts';
import { seedZones } from '../../prisma/seed-steps/seed-zones.ts';
import { resetDatabase } from '../helpers/database.ts';

async function runFullSeed(): Promise<void> {
  await seedZones(prisma);
  await seedPersonas(prisma, await bcrypt.hash('TeslaPool#2026', 4));
}

async function countRows(): Promise<Record<string, number>> {
  return {
    zones: await prisma.zone.count(),
    distances: await prisma.zoneDistance.count(),
    neighbours: await prisma.zoneAdjacency.count(),
    users: await prisma.user.count(),
    wallets: await prisma.wallet.count(),
    ledgerEntries: await prisma.walletTransaction.count(),
    teslas: await prisma.vehicle.count(),
  };
}

beforeEach(async () => {
  await resetDatabase();
});

describe('zone reference data (SRS §13.3)', () => {
  it('has 10 zones, 90 directed distances and 24 directed neighbour pairs', async () => {
    await seedZones(prisma);

    const counts = await countRows();

    expect(counts).toMatchObject({ zones: 10, distances: 90, neighbours: 24 });
  });

  it('stores the distances used by the worked fare examples (SRS §6.4)', async () => {
    const distance = (from: string, to: string) =>
      prisma.zoneDistance.findUniqueOrThrow({
        where: { fromZoneCode_toZoneCode: { fromZoneCode: from, toZoneCode: to } },
      });

    expect((await distance('BAN', 'MHK')).distanceM).toBe(3000); // Nusrat
    expect((await distance('BAN', 'GL1')).distanceM).toBe(2500); // Rafiq
    expect((await distance('BAN', 'TEJ')).distanceM).toBe(5000); // Shirin
  });

  it('is symmetric: every distance and neighbour pair exists in both directions', async () => {
    const [asymmetry] = await prisma.$queryRaw<{ distances: bigint; neighbours: bigint }[]>`
      SELECT
        (SELECT count(*) FROM zone_distances d WHERE NOT EXISTS (
           SELECT 1 FROM zone_distances r WHERE r.from_zone_code = d.to_zone_code
             AND r.to_zone_code = d.from_zone_code AND r.distance_m = d.distance_m)) AS distances,
        (SELECT count(*) FROM zone_adjacency a WHERE NOT EXISTS (
           SELECT 1 FROM zone_adjacency r WHERE r.zone_code = a.adjacent_zone_code
             AND r.adjacent_zone_code = a.zone_code)) AS neighbours`;

    expect(asymmetry).toEqual({ distances: 0n, neighbours: 0n });
  });
});

describe('reference personas (DR-15)', () => {
  it('creates Nusrat, Rafiq, Shirin, Jashim with Bullet and Kamal with Toofan', async () => {
    await runFullSeed();

    const names = await prisma.user.findMany({
      select: { fullName: true },
      orderBy: { fullName: 'asc' },
    });
    const bullet = await prisma.vehicle.findUniqueOrThrow({ where: { plate: 'DHAKA-TESLA-11' } });

    expect(names.map((user) => user.fullName)).toEqual([
      'Jashim',
      'Kamal',
      'Nusrat',
      'Rafiq',
      'Shirin',
    ]);
    expect(bullet).toMatchObject({ name: 'Bullet', capacity: 3 });
  });

  it('records each opening TeslaPay balance in the ledger, so balance = sum of ledger', async () => {
    await runFullSeed();

    const mismatches = await prisma.$queryRaw<{ count: bigint }[]>`
      SELECT count(*) FROM wallets w
      WHERE w.balance_paisa <> (SELECT coalesce(sum(t.amount_paisa), 0) FROM wallet_transactions t
                                WHERE t.wallet_id = w.id)`;

    expect(mismatches[0]!.count).toBe(0n);
  });
});

describe('running the seed again (NFR-POR-03)', () => {
  it('changes nothing the second time', async () => {
    await runFullSeed();
    const afterFirstRun = await countRows();

    await runFullSeed();

    expect(await countRows()).toEqual(afterFirstRun);
    expect(afterFirstRun).toEqual({
      zones: 10,
      distances: 90,
      neighbours: 24,
      users: 5,
      wallets: 3,
      ledgerEntries: 2, // Nusrat and Shirin; Rafiq starts at ৳0 and pays cash
      teslas: 2,
    });
  });
});
