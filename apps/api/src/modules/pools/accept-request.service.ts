// A driver accepts a waiting request (FR-DRV-05; RT-02, PT-01) — the critical path of ARCHITECTURE
// §6.2. Everything happens in one transaction, locking in the fixed order driver → pool → ride:
// 1. lock the driver, who must be online;   2. lock their active pool, if any;
// 3. re-check every rule (BR-01…BR-05, BR-18);   4. move the ride with a compare-and-set;
// 5. add the member and claim the seats (the database CHECK is the last line of defence).
import type { DriverPoolView } from '@dhakapool/shared';
import { lockDriver } from '../../db/lock.ts';
import { type Tx, withTransaction } from '../../db/transaction.ts';
import { isCompatible, type MatchRules } from '../../domain/matching.ts';
import { genderRestriction, type RestrictionMember } from '../../domain/pool-restriction.ts';
import { recordTransition } from '../audit/audit.service.ts';
import { assertOnline, type Driver, loadDriver } from '../drivers/drivers.service.ts';
import {
  loadWaitingRide,
  matchRide,
  type WaitingRide,
} from '../rides/rides-for-drivers.service.ts';
import { matchRefusal } from './match-refusal.ts';
import { insertMember, insertPool, updateGenderRestriction } from './pools.repository.ts';
import {
  currentMatchRules,
  getPoolView,
  lockActivePool,
  type PoolRow,
  restrictionMembersOf,
  toMatchPool,
  toMatchRequest,
} from './pools.service.ts';

type OnlineDriver = Driver & { currentZoneCode: string };

function asRestrictionMember(ride: WaitingRide): RestrictionMember {
  return { sameGenderOnly: ride.sameGenderOnly, gender: ride.passenger.gender };
}

// BR-03: the first accepted request always starts a new pool, if it fits the Tesla. A passenger who
// did not want to share gets a private pool (FR-POOL-04).
async function startPool(tx: Tx, driver: OnlineDriver, ride: WaitingRide): Promise<string> {
  const refusalContext = { vehicleName: driver.vehicle.name, freeSeats: driver.vehicle.capacity };
  if (ride.pickupZoneCode !== driver.currentZoneCode) {
    throw matchRefusal('DIFFERENT_PICKUP', refusalContext);
  }
  if (ride.seats > driver.vehicle.capacity) {
    throw matchRefusal('NO_SEATS', refusalContext);
  }
  const poolId = await insertPool(tx, {
    driverId: driver.userId,
    vehicleId: driver.vehicle.id,
    pickupZoneCode: ride.pickupZoneCode,
    capacity: driver.vehicle.capacity, // copied, so the trip keeps its size (ERD §8)
    isPrivate: !ride.poolOptIn,
    genderRestriction: genderRestriction([asRestrictionMember(ride)]),
  });
  await recordTransition(tx, {
    entityType: 'POOL',
    entityId: poolId,
    fromStatus: null,
    toStatus: 'OPEN',
    actor: { role: 'DRIVER', userId: driver.userId },
  });
  return poolId;
}

// BR-02: a later request joins the open pool only if the matching rule allows it.
function checkCanJoin(pool: PoolRow, ride: WaitingRide, rules: MatchRules): void {
  const result = isCompatible(toMatchRequest(ride), toMatchPool(pool), rules);
  if (!result.ok) {
    const freeSeats = pool.capacity - pool.occupiedSeats;
    throw matchRefusal(result.reason, { vehicleName: pool.vehicle.name, freeSeats });
  }
}

// FR-POOL-11: the restriction is updated under the same pool lock as the seats.
async function updateRestriction(tx: Tx, pool: PoolRow, ride: WaitingRide): Promise<void> {
  const restriction = genderRestriction([...restrictionMembersOf(pool), asRestrictionMember(ride)]);
  if (restriction !== pool.genderRestriction) {
    await updateGenderRestriction(tx, pool.id, restriction);
  }
}

export async function acceptRequest(driverId: string, rideId: string): Promise<DriverPoolView> {
  const rules = await currentMatchRules();
  const poolId = await withTransaction(async (tx) => {
    await lockDriver(tx, driverId);
    const driver = await loadDriver(tx, driverId);
    assertOnline(driver);
    const pool = await lockActivePool(tx, driverId);
    const ride = await loadWaitingRide(tx, rideId);
    if (pool) {
      checkCanJoin(pool, ride, rules);
    }
    const targetPoolId = pool ? pool.id : await startPool(tx, driver, ride);
    await matchRide(tx, ride.id, driverId, targetPoolId);
    await insertMember(tx, targetPoolId, ride.id, ride.seats);
    if (pool) {
      await updateRestriction(tx, pool, ride);
    }
    return targetPoolId;
  });
  return getPoolView(poolId);
}
