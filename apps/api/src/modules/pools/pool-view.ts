// Turns a pool from the database into what its driver sees (FR-DRV-06). Member genders are loaded
// for matching but never copied here (A-20).
import type { DriverPoolView } from '@dhakapool/shared';
import { paisaFromDb } from '../../db/money.ts';
import type { Fare } from '../../generated/prisma/client.ts';
import type { PoolRow } from './pools.repository.ts';

function lockedFareOf(fares: Fare[]): number | null {
  const rideFare = fares.find((fare) => fare.type === 'RIDE');
  return rideFare ? paisaFromDb(rideFare.totalPaisa) : null;
}

export function toDriverPoolView(pool: PoolRow): DriverPoolView {
  const members = pool.members.map(({ rideRequest: ride }) => ({
    rideId: ride.id,
    passengerName: ride.passenger.fullName,
    pickupZoneCode: ride.pickupZoneCode,
    destinationZoneCode: ride.destinationZoneCode,
    seats: ride.seats,
    status: ride.status,
    paymentMethod: ride.paymentMethod,
    estimatedFarePaisa: paisaFromDb(ride.estimatedFarePaisa),
    lockedFarePaisa: lockedFareOf(ride.fares),
    paymentStatus: ride.payments.find((payment) => payment.fare.type === 'RIDE')?.status ?? null,
  }));
  return {
    id: pool.id,
    status: pool.status,
    pickupZoneCode: pool.pickupZoneCode,
    vehicle: pool.vehicle,
    capacity: pool.capacity,
    occupiedSeats: pool.occupiedSeats,
    isPrivate: pool.isPrivate,
    genderRestriction: pool.genderRestriction,
    createdAt: pool.createdAt.toISOString(),
    members,
    totalFarePaisa: members.reduce((sum, member) => sum + (member.lockedFarePaisa ?? 0), 0),
  };
}
