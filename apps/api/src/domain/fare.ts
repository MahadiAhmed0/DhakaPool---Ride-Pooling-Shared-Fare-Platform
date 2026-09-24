// The fare formula (BR-10) with the pool discount (BR-11) and half-up rounding (BR-13).
// Pure: whole paisa in, whole paisa out. Worked examples are in SRS §6.4, for instance
// Nusrat, Banani → Mohakhali (3000 m): 7500 solo, 6600 pooled.
import type { FareBreakdown, FareRates } from '@dhakapool/shared';
import { assertWholeNumber, roundHalfUpDiv } from './money.ts';

// Unit conversions used by the formula.
const METRES_PER_KM = 1_000;
const BASIS_POINTS_PER_WHOLE = 10_000; // 10,000 bps = 100 %

export type FareInput = {
  distanceM: number; // the zone-to-zone table distance (BR-09)
  seats: number;
  // BR-12: true only when two or more different passengers start the trip together.
  // One passenger booking two seats is not pooled; the caller decides this.
  pooled: boolean;
  rates: FareRates;
};

export function computeFare({ distanceM, seats, pooled, rates }: FareInput): FareBreakdown {
  assertWholeNumber(distanceM, 'distanceM');
  if (!Number.isSafeInteger(seats) || seats < 1) {
    throw new RangeError(`seats must be a whole number of 1 or more, but was ${seats}.`);
  }

  // BR-10: the distance charge is per seat, rounded half up to a whole paisa.
  const distanceChargePaisa = roundHalfUpDiv(distanceM * rates.perKmPaisa, METRES_PER_KM);
  // BR-11: the pool discount is a share of the distance charge only; the base fare is never discounted.
  const discountPaisa = pooled
    ? roundHalfUpDiv(distanceChargePaisa * rates.poolDiscountBps, BASIS_POINTS_PER_WHOLE)
    : 0;
  const farePerSeatPaisa = rates.basePaisa + distanceChargePaisa - discountPaisa;

  return {
    pooled,
    seats,
    basePaisa: rates.basePaisa,
    distanceChargePaisa,
    discountPaisa,
    farePerSeatPaisa,
    totalPaisa: farePerSeatPaisa * seats,
  };
}
