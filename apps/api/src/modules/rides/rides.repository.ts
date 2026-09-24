// Database queries for ride requests.
import { ACTIVE_RIDE_STATUSES, type RideStatus } from '@dhakapool/shared';
import { prisma } from '../../db/client.ts';
import type { Tx } from '../../db/transaction.ts';
import type { Prisma } from '../../generated/prisma/client.ts';

// Everything the passenger's ride view needs. Of the other members of the pool, only their ride ids
// are loaded — enough to count co-riders, and nothing that could leak their details (A-09).
const RIDE_VIEW_INCLUDE = {
  fares: true,
  payments: { include: { fare: { select: { type: true } } } },
  poolMembers: {
    where: { leftAt: null },
    include: {
      pool: {
        include: {
          driver: { include: { user: { select: { fullName: true } } } },
          vehicle: { select: { name: true, plate: true } },
          members: { where: { leftAt: null }, select: { rideRequestId: true } },
        },
      },
    },
  },
} satisfies Prisma.RideRequestInclude;

export type RideRow = Prisma.RideRequestGetPayload<{ include: typeof RIDE_VIEW_INCLUDE }>;
export type NewRide = Omit<Prisma.RideRequestUncheckedCreateInput, 'id' | 'status'>;
export type RidePage = { statuses: readonly RideStatus[]; cursor?: string; limit: number };

export async function insertRide(tx: Tx, ride: NewRide): Promise<string> {
  const created = await tx.rideRequest.create({ data: ride, select: { id: true } });
  return created.id;
}

export async function findActiveRideId(tx: Tx, passengerId: string): Promise<string | null> {
  const ride = await tx.rideRequest.findFirst({
    where: { passengerId, status: { in: [...ACTIVE_RIDE_STATUSES] } },
    select: { id: true },
  });
  return ride?.id ?? null;
}

// Only returns the ride when it belongs to this passenger (NFR-SEC-03).
export async function findPassengerRide(
  passengerId: string,
  rideId: string,
): Promise<RideRow | null> {
  return prisma.rideRequest.findFirst({
    where: { id: rideId, passengerId },
    include: RIDE_VIEW_INCLUDE,
  });
}

// Newest first. Asks for one extra ride to find out whether there is another page.
export async function findPassengerRides(passengerId: string, page: RidePage): Promise<RideRow[]> {
  return prisma.rideRequest.findMany({
    where: { passengerId, status: { in: [...page.statuses] } },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    take: page.limit + 1,
    ...(page.cursor ? { cursor: { id: page.cursor }, skip: 1 } : {}),
    include: RIDE_VIEW_INCLUDE,
  });
}

// RT-04 (A-13): every REQUESTED ride whose time is up becomes EXPIRED. The status check in the
// WHERE clause makes this safe to run at the same time as an accept or a cancel (NFR-CON-02).
export async function markOverdueRidesExpired(
  tx: Tx,
  now: Date,
  passengerId?: string,
): Promise<string[]> {
  const expired = await tx.rideRequest.updateManyAndReturn({
    where: {
      status: 'REQUESTED',
      expiresAt: { lte: now },
      ...(passengerId ? { passengerId } : {}),
    },
    data: { status: 'EXPIRED' },
    select: { id: true },
  });
  return expired.map((ride) => ride.id);
}

// FR-PAX-03: seats may not exceed the largest Tesla in the fleet.
export async function findLargestVehicleCapacity(): Promise<number | null> {
  const largest = await prisma.vehicle.aggregate({ _max: { capacity: true } });
  return largest._max.capacity;
}

export async function findPassengerRideStatus(
  tx: Tx,
  passengerId: string,
  rideId: string,
): Promise<RideStatus | null> {
  const ride = await tx.rideRequest.findFirst({
    where: { id: rideId, passengerId },
    select: { status: true },
  });
  return ride?.status ?? null;
}

// Compare-and-set (NFR-CON-02): only cancels when the ride is still in the status the caller saw.
// Returns false when something else changed it first, for example a driver accepting it.
export async function markRideCancelled(
  tx: Tx,
  rideId: string,
  expectedStatus: RideStatus,
  reason: string,
): Promise<boolean> {
  const { count } = await tx.rideRequest.updateMany({
    where: { id: rideId, status: expectedStatus },
    data: { status: 'CANCELLED', cancelReason: reason, cancelledAt: new Date() },
  });
  return count === 1;
}

// The passenger's gender is loaded for the matching rule only; it is never shown to the driver.
const WAITING_RIDE_INCLUDE = {
  passenger: { select: { fullName: true, gender: true } },
} satisfies Prisma.RideRequestInclude;

export type WaitingRide = Prisma.RideRequestGetPayload<{ include: typeof WAITING_RIDE_INCLUDE }>;
export type WaitingRideFilter = {
  pickupZoneCode: string;
  maxSeats: number;
  now: Date;
  limit: number;
};

// REQUESTED and not yet expired, oldest first, so the longest-waiting passenger is seen first.
export async function findWaitingRides(filter: WaitingRideFilter): Promise<WaitingRide[]> {
  return prisma.rideRequest.findMany({
    where: {
      status: 'REQUESTED',
      pickupZoneCode: filter.pickupZoneCode,
      expiresAt: { gt: filter.now },
      seats: { lte: filter.maxSeats },
    },
    orderBy: { requestedAt: 'asc' },
    take: filter.limit,
    include: WAITING_RIDE_INCLUDE,
  });
}

export async function findWaitingRide(tx: Tx, rideId: string): Promise<WaitingRide | null> {
  return tx.rideRequest.findUnique({ where: { id: rideId }, include: WAITING_RIDE_INCLUDE });
}

// RT-02 as a compare-and-set: only a request that is still REQUESTED and not yet expired can be
// matched (NFR-CON-02, NFR-REL-04). Returns false when another driver or the passenger got there
// first, or the request ran out of time.
export async function markRideMatched(tx: Tx, rideId: string, now: Date): Promise<boolean> {
  const { count } = await tx.rideRequest.updateMany({
    where: { id: rideId, status: 'REQUESTED', expiresAt: { gt: now } },
    data: { status: 'MATCHED' },
  });
  return count === 1;
}

// Moves several rides of one trip together, each only if it is still in `fromStatus`
// (compare-and-set, NFR-CON-02). Returns the ids that actually moved.
export async function markRidesMoved(
  tx: Tx,
  rideIds: string[],
  fromStatus: RideStatus,
  data: Prisma.RideRequestUpdateManyMutationInput,
): Promise<string[]> {
  const moved = await tx.rideRequest.updateManyAndReturn({
    where: { id: { in: rideIds }, status: fromStatus },
    data,
    select: { id: true },
  });
  return moved.map((ride) => ride.id);
}
