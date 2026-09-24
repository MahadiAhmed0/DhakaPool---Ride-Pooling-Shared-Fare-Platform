// Passenger ride requests: create (RT-01), list (FR-PAX-09) and view (FR-PAX-06, FR-PAX-10).
import {
  ACTIVE_RIDE_STATUSES,
  formatPaisa,
  MAX_SEATS_PER_REQUEST,
  type RideDetail,
  type RideList,
  type RideListQuery,
  type RideRequestInput,
  TERMINAL_RIDE_STATUSES,
} from '@dhakapool/shared';
import { REQUEST_EXPIRY_MINUTES } from '../../config/rules.ts';
import { paisaToDb } from '../../db/money.ts';
import { type Tx, withTransaction } from '../../db/transaction.ts';
import {
  ConflictError,
  NotFoundError,
  UnprocessableError,
  ValidationError,
} from '../../domain/errors.ts';
import { type Actor, listTimeline, recordTransition } from '../audit/audit.service.ts';
import { getCurrentUser } from '../auth/auth.service.ts';
import { estimateFare } from '../fares/fares.service.ts';
import { getBalancePaisa } from '../wallet/wallet.service.ts';
import { expireOverdueRidesOf } from './ride-expiry.service.ts';
import { toRideTimeline, toRideView } from './ride-view.ts';
import {
  findActiveRideId,
  findLargestVehicleCapacity,
  findPassengerRide,
  findPassengerRides,
  insertRide,
} from './rides.repository.ts';

const MS_PER_MINUTE = 60_000;

function invalidField(path: string, message: string): ValidationError {
  return new ValidationError(message, { fields: [{ path, message }] });
}

// FR-PAX-11: only passengers who declared FEMALE or MALE may ask for a same-gender ride.
async function assertSameGenderAllowed(passengerId: string, ride: RideRequestInput): Promise<void> {
  if (!ride.sameGenderOnly) {
    return;
  }
  const { gender } = await getCurrentUser(passengerId);
  if (gender === 'PREFER_NOT_TO_SAY') {
    throw invalidField('sameGenderOnly', 'Same-gender rides need a declared gender.');
  }
}

// FR-PAX-03: a request that no Tesla could ever carry is refused straight away.
async function assertSomeTeslaFits(seats: number): Promise<void> {
  const largestCapacity = (await findLargestVehicleCapacity()) ?? MAX_SEATS_PER_REQUEST;
  if (seats > largestCapacity) {
    throw invalidField('seats', `The largest Tesla has ${largestCapacity} seats.`);
  }
}

// BR-05, FR-PAX-04. The database index catches two requests sent at the same moment.
async function assertNoActiveRide(tx: Tx, passengerId: string): Promise<void> {
  const activeRideId = await findActiveRideId(tx, passengerId);
  if (activeRideId) {
    throw new ConflictError('ACTIVE_REQUEST_EXISTS', 'You already have an active ride.', {
      rideId: activeRideId,
    });
  }
}

// FR-PAX-05: TeslaPay needs enough balance for the solo fare, the most the ride can cost.
async function assertCanAfford(tx: Tx, passengerId: string, farePaisa: number): Promise<void> {
  const balancePaisa = await getBalancePaisa(tx, passengerId);
  if (balancePaisa < farePaisa) {
    throw new UnprocessableError(
      'INSUFFICIENT_BALANCE',
      `Your TeslaPay balance is ${formatPaisa(balancePaisa)}, but this ride costs up to ${formatPaisa(farePaisa)}. Top up or pay in cash.`,
      { balancePaisa, requiredPaisa: farePaisa },
    );
  }
}

async function loadRideDetail(passengerId: string, rideId: string): Promise<RideDetail> {
  const ride = await findPassengerRide(passengerId, rideId);
  if (!ride) {
    // Someone else's ride looks exactly like a missing one (SRS §8.2).
    throw new NotFoundError('Ride not found.');
  }
  const timeline = await listTimeline('RIDE_REQUEST', ride.id);
  return { ...(await toRideView(ride)), timeline: toRideTimeline(timeline) };
}

export async function createRide(passengerId: string, ride: RideRequestInput): Promise<RideDetail> {
  await assertSameGenderAllowed(passengerId, ride);
  await assertSomeTeslaFits(ride.seats);
  const estimate = await estimateFare(ride);
  const passenger: Actor = { role: 'PASSENGER', userId: passengerId };

  await expireOverdueRidesOf(passengerId); // NFR-REL-04: an overdue ride no longer counts as active
  const rideId = await withTransaction(async (tx) => {
    await assertNoActiveRide(tx, passengerId);
    if (ride.paymentMethod === 'TESLAPAY') {
      await assertCanAfford(tx, passengerId, estimate.solo.totalPaisa);
    }
    const requestedAt = new Date();
    const newRideId = await insertRide(tx, {
      ...ride,
      passengerId,
      estimatedFarePaisa: paisaToDb(estimate.solo.totalPaisa), // FR-FARE-02
      requestedAt,
      expiresAt: new Date(requestedAt.getTime() + REQUEST_EXPIRY_MINUTES * MS_PER_MINUTE),
    });
    await recordTransition(tx, {
      entityType: 'RIDE_REQUEST',
      entityId: newRideId,
      fromStatus: null,
      toStatus: 'REQUESTED',
      actor: passenger,
    });
    return newRideId;
  });
  return loadRideDetail(passengerId, rideId);
}

export async function getRideForPassenger(
  passengerId: string,
  rideId: string,
): Promise<RideDetail> {
  await expireOverdueRidesOf(passengerId); // NFR-REL-04
  return loadRideDetail(passengerId, rideId);
}

export async function listRidesForPassenger(
  passengerId: string,
  query: RideListQuery,
): Promise<RideList> {
  await expireOverdueRidesOf(passengerId); // NFR-REL-04
  const statuses = query.scope === 'active' ? ACTIVE_RIDE_STATUSES : TERMINAL_RIDE_STATUSES;
  const rows = await findPassengerRides(passengerId, {
    statuses,
    cursor: query.cursor,
    limit: query.limit,
  });
  const page = rows.slice(0, query.limit);
  const hasMore = rows.length > query.limit;
  return {
    rides: await Promise.all(page.map(toRideView)),
    nextCursor: hasMore ? (page.at(-1)?.id ?? null) : null,
  };
}
