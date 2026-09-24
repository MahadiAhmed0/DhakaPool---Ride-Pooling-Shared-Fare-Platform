// Turns a ride from the database into what the passenger sees (FR-PAX-06, FR-PAX-10).
// Only the passenger's own details leave this file; co-riders appear only as a count (A-09, A-20).
import type {
  FareBreakdown,
  RideFare,
  RideStatus,
  RideTimelineEntry,
  RideTrip,
  RideView,
} from '@dhakapool/shared';
import { paisaFromDb } from '../../db/money.ts';
import type { Fare } from '../../generated/prisma/client.ts';
import type { TimelineEntry } from '../audit/audit.service.ts';
import { estimateFare } from '../fares/fares.service.ts';
import type { RideRow } from './rides.repository.ts';

function toFareBreakdown(fare: Fare): FareBreakdown {
  const distanceChargePaisa = paisaFromDb(fare.distanceChargePaisa);
  const discountPaisa = paisaFromDb(fare.discountPaisa);
  return {
    pooled: fare.pooled,
    seats: fare.seats,
    basePaisa: fare.basePaisa,
    distanceChargePaisa,
    discountPaisa,
    farePerSeatPaisa: fare.basePaisa + distanceChargePaisa - discountPaisa,
    totalPaisa: paisaFromDb(fare.totalPaisa),
  };
}

async function toRideFare(ride: RideRow): Promise<RideFare> {
  const estimate = await estimateFare(ride);
  const rideFare = ride.fares.find((fare) => fare.type === 'RIDE');
  const cancellationFee = ride.fares.find((fare) => fare.type === 'CANCELLATION_FEE');
  return {
    estimate: { solo: estimate.solo, pooled: ride.poolOptIn ? estimate.pooled : null },
    locked: rideFare ? toFareBreakdown(rideFare) : null,
    cancellationFeePaisa: cancellationFee ? paisaFromDb(cancellationFee.totalPaisa) : null,
  };
}

// The trip this ride is part of, if a driver has accepted it and it has not left the pool.
function toRideTrip(ride: RideRow): RideTrip | null {
  const membership = ride.poolMembers[0];
  if (!membership) {
    return null;
  }
  const { pool } = membership;
  const coRiderCount = pool.members.filter((member) => member.rideRequestId !== ride.id).length;
  return {
    driverName: pool.driver.user.fullName,
    vehicle: pool.vehicle,
    isShared: coRiderCount > 0,
    coRiderCount,
    genderRestriction: pool.genderRestriction,
  };
}

function isoOrNull(date: Date | null): string | null {
  return date ? date.toISOString() : null;
}

export async function toRideView(ride: RideRow): Promise<RideView> {
  return {
    id: ride.id,
    status: ride.status,
    pickupZoneCode: ride.pickupZoneCode,
    destinationZoneCode: ride.destinationZoneCode,
    seats: ride.seats,
    poolOptIn: ride.poolOptIn,
    sameGenderOnly: ride.sameGenderOnly,
    paymentMethod: ride.paymentMethod,
    requestedAt: ride.requestedAt.toISOString(),
    expiresAt: ride.expiresAt.toISOString(),
    cancelledAt: isoOrNull(ride.cancelledAt),
    completedAt: isoOrNull(ride.completedAt),
    cancelReason: ride.cancelReason,
    fare: await toRideFare(ride),
    trip: toRideTrip(ride),
  };
}

export function toRideTimeline(entries: TimelineEntry[]): RideTimelineEntry[] {
  return entries.map((entry) => ({
    fromStatus: entry.fromStatus as RideStatus | null,
    toStatus: entry.toStatus as RideStatus,
    actorRole: entry.actorRole,
    reason: entry.reason,
    at: entry.at.toISOString(),
  }));
}
