// Database queries for the zone reference data: zones, distances and neighbours (BR-08).
import type { Zone } from '@dhakapool/shared';
import { prisma } from '../../db/client.ts';

export type ZoneDistanceRow = { fromZoneCode: string; toZoneCode: string; distanceM: number };
export type ZoneNeighbourRow = { zoneCode: string; adjacentZoneCode: string };

// Coordinates are stored as exact decimals; the API returns them as plain numbers.
export async function findAllZones(): Promise<Zone[]> {
  const zones = await prisma.zone.findMany({ orderBy: { name: 'asc' } });
  return zones.map((zone) => ({
    code: zone.code,
    name: zone.name,
    lat: zone.lat.toNumber(),
    lng: zone.lng.toNumber(),
  }));
}

export async function findAllDistances(): Promise<ZoneDistanceRow[]> {
  return prisma.zoneDistance.findMany();
}

export async function findAllNeighbours(): Promise<ZoneNeighbourRow[]> {
  return prisma.zoneAdjacency.findMany();
}
