// Charges that are fixed for good: the ride fare at trip start (BR-12, FR-FARE-03) and the
// cancellation fee (BR-07, FR-FARE-05). Each keeps a copy of the rates it was worked out with,
// so changing the rates later never changes a charge (TC-11).
import { CANCELLATION_FEE_PAISA, CURRENT_FARE_RATES } from '../../config/rules.ts';
import { paisaToDb } from '../../db/money.ts';
import type { Tx } from '../../db/transaction.ts';
import { computeFare } from '../../domain/fare.ts';
import { distanceBetween } from '../zones/zones.service.ts';
import { insertFares } from './fares.repository.ts';

export type OnBoardRide = {
  id: string;
  pickupZoneCode: string;
  destinationZoneCode: string;
  seats: number;
};

// BR-12: `pooled` is true only when two or more different passengers start the trip together.
export async function lockRideFares(tx: Tx, rides: OnBoardRide[], pooled: boolean): Promise<void> {
  const rates = CURRENT_FARE_RATES;
  const fares = await Promise.all(
    rides.map(async (ride) => {
      const distanceM = await distanceBetween(ride.pickupZoneCode, ride.destinationZoneCode);
      const fare = computeFare({ distanceM, seats: ride.seats, pooled, rates });
      return {
        rideRequestId: ride.id,
        type: 'RIDE' as const,
        basePaisa: fare.basePaisa,
        distanceM,
        perKmPaisa: rates.perKmPaisa,
        distanceChargePaisa: paisaToDb(fare.distanceChargePaisa),
        discountBps: pooled ? rates.poolDiscountBps : 0,
        discountPaisa: paisaToDb(fare.discountPaisa),
        seats: fare.seats,
        pooled,
        totalPaisa: paisaToDb(fare.totalPaisa),
      };
    }),
  );
  await insertFares(tx, fares);
}

// BR-07: one flat fee per ride, not per seat. For a fee the breakdown columns are 0 (ERD §3).
export async function recordCancellationFee(tx: Tx, ride: OnBoardRide): Promise<number> {
  await insertFares(tx, [
    {
      rideRequestId: ride.id,
      type: 'CANCELLATION_FEE',
      basePaisa: 0,
      distanceM: 0,
      perKmPaisa: 0,
      distanceChargePaisa: 0n,
      discountBps: 0,
      discountPaisa: 0n,
      seats: ride.seats,
      pooled: false,
      totalPaisa: paisaToDb(CANCELLATION_FEE_PAISA),
    },
  ]);
  return CANCELLATION_FEE_PAISA;
}
