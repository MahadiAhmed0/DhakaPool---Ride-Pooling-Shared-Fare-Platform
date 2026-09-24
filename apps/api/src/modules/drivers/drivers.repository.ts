// Database queries for driver profiles (availability and current zone) and their Tesla.
import type { Tx } from '../../db/transaction.ts';
import type { DriverAvailability, Prisma } from '../../generated/prisma/client.ts';

const DRIVER_INCLUDE = { vehicle: true } satisfies Prisma.DriverProfileInclude;

export type DriverRow = Prisma.DriverProfileGetPayload<{ include: typeof DRIVER_INCLUDE }>;

export async function findDriver(tx: Tx, driverId: string): Promise<DriverRow | null> {
  return tx.driverProfile.findUnique({ where: { userId: driverId }, include: DRIVER_INCLUDE });
}

// The database CHECK makes sure an ONLINE driver always has a zone (ERD §4.2).
export async function updateAvailability(
  tx: Tx,
  driverId: string,
  availability: DriverAvailability,
  currentZoneCode: string | null,
): Promise<void> {
  await tx.driverProfile.update({
    where: { userId: driverId },
    data: { availability, currentZoneCode },
  });
}

// PT-06: after the last drop-off the driver is where that passenger got off.
export async function updateCurrentZone(tx: Tx, driverId: string, zoneCode: string): Promise<void> {
  await tx.driverProfile.update({
    where: { userId: driverId },
    data: { currentZoneCode: zoneCode },
  });
}
