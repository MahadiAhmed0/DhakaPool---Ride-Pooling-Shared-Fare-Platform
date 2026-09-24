// Zone reference data: the zone list (FR-PAX-01), distances (BR-09) and neighbours (BR-08).
// It only changes when the seed changes, so it is read from the database once and then kept in
// memory (ARCHITECTURE §5.3). Restart the API after changing the zone seed.
import type { Zone } from '@dhakapool/shared';
import { ValidationError } from '../../domain/errors.ts';
import { findAllDistances, findAllNeighbours, findAllZones } from './zones.repository.ts';

type ZoneReference = {
  zones: Zone[];
  distancesM: Map<string, number>; // key "BAN-MHK" → 3000
  neighbours: Set<string>; // "BAN-GL1" is in the set when Banani and Gulshan 1 are neighbours
};

let zoneReference: Promise<ZoneReference> | null = null;

function pairKey(fromZoneCode: string, toZoneCode: string): string {
  return `${fromZoneCode}-${toZoneCode}`;
}

async function readZoneReference(): Promise<ZoneReference> {
  const [zones, distances, neighbours] = await Promise.all([
    findAllZones(),
    findAllDistances(),
    findAllNeighbours(),
  ]);
  return {
    zones,
    distancesM: new Map(
      distances.map((row) => [pairKey(row.fromZoneCode, row.toZoneCode), row.distanceM]),
    ),
    neighbours: new Set(neighbours.map((row) => pairKey(row.zoneCode, row.adjacentZoneCode))),
  };
}

// Reads the data the first time it is needed. If that read fails (for example the database is
// down), nothing is kept, so the next request simply tries again.
function loadZoneReference(): Promise<ZoneReference> {
  if (!zoneReference) {
    zoneReference = readZoneReference().catch((error: unknown) => {
      zoneReference = null;
      throw error;
    });
  }
  return zoneReference;
}

export async function listZones(): Promise<Zone[]> {
  return (await loadZoneReference()).zones;
}

// An unknown zone is the caller's mistake, so it is a 400 that names the field (FR-PAX-03).
export async function assertZoneExists(zoneCode: string, field: string): Promise<void> {
  const { zones } = await loadZoneReference();
  if (!zones.some((zone) => zone.code === zoneCode)) {
    const message = `There is no zone with the code ${zoneCode}.`;
    throw new ValidationError(message, { fields: [{ path: field, message }] });
  }
}

// BR-09: the road distance in metres between two different zones, from the seeded table.
export async function distanceBetween(
  pickupZoneCode: string,
  destinationZoneCode: string,
): Promise<number> {
  await assertZoneExists(pickupZoneCode, 'pickupZoneCode');
  await assertZoneExists(destinationZoneCode, 'destinationZoneCode');
  const { distancesM } = await loadZoneReference();
  const distanceM = distancesM.get(pairKey(pickupZoneCode, destinationZoneCode));
  if (distanceM === undefined) {
    // The seed stores every pair of different zones, so this means the reference data is broken.
    throw new Error(`No distance is stored for ${pickupZoneCode} → ${destinationZoneCode}.`);
  }
  return distanceM;
}

// BR-08: neighbours are declared explicitly and in both directions; a zone is not its own neighbour.
export async function areNeighbours(zoneCode: string, otherZoneCode: string): Promise<boolean> {
  const { neighbours } = await loadZoneReference();
  return neighbours.has(pairKey(zoneCode, otherZoneCode));
}

// The same neighbour check as a plain function, for the pure matching rule (domain/matching.ts).
export async function loadNeighbourCheck(): Promise<
  (zoneCode: string, otherZoneCode: string) => boolean
> {
  const { neighbours } = await loadZoneReference();
  return (zoneCode, otherZoneCode) => neighbours.has(pairKey(zoneCode, otherZoneCode));
}
