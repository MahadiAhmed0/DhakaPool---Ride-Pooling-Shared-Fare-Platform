// Seeds the zone reference data. Safe to run again: existing rows are updated, never duplicated.
import type { PrismaClient } from '../../src/generated/prisma/client.ts';
import { ADJACENT_PAIRS, DISTANCES_M, ZONES } from '../seed-data/zones.ts';

async function seedZoneList(db: PrismaClient): Promise<void> {
  for (const zone of ZONES) {
    await db.zone.upsert({ where: { code: zone.code }, update: zone, create: zone });
  }
}

async function seedDistances(db: PrismaClient): Promise<void> {
  for (const [zoneA, zoneB, distanceM] of DISTANCES_M) {
    // Store both directions so a lookup never has to swap the zones.
    for (const [fromZoneCode, toZoneCode] of [
      [zoneA, zoneB],
      [zoneB, zoneA],
    ] as const) {
      await db.zoneDistance.upsert({
        where: { fromZoneCode_toZoneCode: { fromZoneCode, toZoneCode } },
        update: { distanceM },
        create: { fromZoneCode, toZoneCode, distanceM },
      });
    }
  }
}

async function seedAdjacency(db: PrismaClient): Promise<void> {
  const bothDirections = ADJACENT_PAIRS.flatMap(([zoneA, zoneB]) => [
    { zoneCode: zoneA, adjacentZoneCode: zoneB },
    { zoneCode: zoneB, adjacentZoneCode: zoneA },
  ]);
  await db.zoneAdjacency.createMany({ data: bothDirections, skipDuplicates: true });
}

export async function seedZones(db: PrismaClient): Promise<void> {
  await seedZoneList(db);
  await seedDistances(db);
  await seedAdjacency(db);
}
