// A driver's own status (FR-DRV-01) and going online or offline (FR-DRV-02, FR-DRV-03).
import type { AvailabilityChange, DriverStatus } from '@dhakapool/shared';
import { prisma } from '../../db/client.ts';
import { lockDriver } from '../../db/lock.ts';
import { type Tx, withTransaction } from '../../db/transaction.ts';
import { ConflictError, NotFoundError } from '../../domain/errors.ts';
import { recordTransition } from '../audit/audit.service.ts';
import { findActivePoolOf } from '../pools/pools.service.ts';
import { assertZoneExists } from '../zones/zones.service.ts';
import { type DriverRow, findDriver, updateAvailability } from './drivers.repository.ts';

export type Driver = DriverRow & { vehicle: NonNullable<DriverRow['vehicle']> };

// Every driver is seeded with exactly one Tesla (A-03).
export async function loadDriver(tx: Tx, driverId: string): Promise<Driver> {
  const driver = await findDriver(tx, driverId);
  if (!driver?.vehicle) {
    throw new NotFoundError('No Tesla is registered for this driver.');
  }
  return { ...driver, vehicle: driver.vehicle };
}

// FR-DRV-04: only an online driver may see and accept requests.
export function assertOnline(
  driver: Driver,
): asserts driver is Driver & { currentZoneCode: string } {
  if (driver.availability !== 'ONLINE' || !driver.currentZoneCode) {
    throw new ConflictError('DRIVER_OFFLINE', 'Go online first to see and accept requests.');
  }
}

export async function getDriverStatus(driverId: string): Promise<DriverStatus> {
  const driver = await loadDriver(prisma, driverId);
  const pool = await findActivePoolOf(prisma, driverId);
  const { name, plate, capacity } = driver.vehicle;
  return {
    availability: driver.availability,
    zoneCode: driver.currentZoneCode,
    vehicle: { name, plate, capacity },
    activePool: pool
      ? {
          id: pool.id,
          status: pool.status,
          occupiedSeats: pool.occupiedSeats,
          capacity: pool.capacity,
        }
      : null,
  };
}

// FR-DRV-03: a driver on a trip can neither go offline nor move to another zone.
async function assertNoActivePool(
  tx: Tx,
  driverId: string,
  change: AvailabilityChange,
): Promise<void> {
  if (await findActivePoolOf(tx, driverId)) {
    const action = change.availability === 'OFFLINE' ? 'go offline' : 'change zone';
    throw new ConflictError(
      'ACTIVE_POOL_EXISTS',
      `You cannot ${action} during a trip. Finish or cancel it first.`,
    );
  }
}

export async function setAvailability(
  driverId: string,
  change: AvailabilityChange,
): Promise<DriverStatus> {
  if (change.availability === 'ONLINE') {
    await assertZoneExists(change.zoneCode, 'zoneCode');
  }
  await withTransaction(async (tx) => {
    await lockDriver(tx, driverId); // lock order: driver first (ARCHITECTURE §7.1)
    const driver = await loadDriver(tx, driverId);
    // Going offline keeps the last zone, so the driver can come back online in the same place.
    const zoneCode = change.availability === 'ONLINE' ? change.zoneCode : driver.currentZoneCode;
    if (driver.availability === change.availability && driver.currentZoneCode === zoneCode) {
      return; // nothing changes, so there is nothing to record
    }
    await assertNoActivePool(tx, driverId, change);
    await updateAvailability(tx, driverId, change.availability, zoneCode);
    await recordTransition(tx, {
      entityType: 'DRIVER',
      entityId: driverId,
      fromStatus: driver.availability,
      toStatus: change.availability,
      actor: { role: 'DRIVER', userId: driverId },
      metadata: { zoneCode },
    });
  });
  return getDriverStatus(driverId);
}
