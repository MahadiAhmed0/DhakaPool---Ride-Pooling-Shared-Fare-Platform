// The worked fare examples of SRS §6.4, reproduced exactly (TC-03, TC-10, TC-12; FR-FARE-01, BR-10…13).
import type { FareRates } from '@dhakapool/shared';
import { describe, expect, it } from 'vitest';
import { computeFare } from '../../src/domain/fare.ts';

// The MVP default rates (BR-11): ৳30 base, ৳15 per km, 20 % off the distance charge when pooled.
const DEFAULT_RATES: FareRates = { basePaisa: 3000, perKmPaisa: 1500, poolDiscountBps: 2000 };

// Zone distances from SRS §13.3.
const BANANI_TO_MOHAKHALI_M = 3000;
const BANANI_TO_GULSHAN_1_M = 2500;
const BANANI_TO_TEJGAON_M = 5000;

function fareFor(
  distanceM: number,
  seats: number,
  pooled: boolean,
): ReturnType<typeof computeFare> {
  return computeFare({ distanceM, seats, pooled, rates: DEFAULT_RATES });
}

describe("Nusrat's and Rafiq's fares (TC-03)", () => {
  it('charges Nusrat 6600 when she shares Bullet, Banani → Mohakhali', () => {
    const fare = fareFor(BANANI_TO_MOHAKHALI_M, 1, true);

    expect(fare).toEqual({
      pooled: true,
      seats: 1,
      basePaisa: 3000,
      distanceChargePaisa: 4500,
      discountPaisa: 900,
      farePerSeatPaisa: 6600,
      totalPaisa: 6600,
    });
  });

  it('charges Nusrat 7500 when she rides alone', () => {
    const fare = fareFor(BANANI_TO_MOHAKHALI_M, 1, false);

    expect(fare.discountPaisa).toBe(0);
    expect(fare.totalPaisa).toBe(7500);
  });

  it('charges Rafiq 6000 pooled and 6750 solo, Banani → Gulshan 1', () => {
    expect(fareFor(BANANI_TO_GULSHAN_1_M, 1, true).totalPaisa).toBe(6000);
    expect(fareFor(BANANI_TO_GULSHAN_1_M, 1, false).totalPaisa).toBe(6750);
  });

  it('saves Nusrat and Rafiq ৳16.50 together when they share (scenario E1)', () => {
    const solo = fareFor(BANANI_TO_MOHAKHALI_M, 1, false).totalPaisa + 6750;
    const pooled = fareFor(BANANI_TO_MOHAKHALI_M, 1, true).totalPaisa + 6000;

    expect(solo - pooled).toBe(1650);
  });
});

describe("Shirin's fares (TC-12)", () => {
  it('charges Shirin 9000 pooled and 10500 solo, Banani → Tejgaon', () => {
    expect(fareFor(BANANI_TO_TEJGAON_M, 1, true).totalPaisa).toBe(9000);
    expect(fareFor(BANANI_TO_TEJGAON_M, 1, false).totalPaisa).toBe(10500);
  });
});

describe('booking more than one seat (TC-10)', () => {
  it('charges Nusrat 15000 for two seats on her own, which is not pooling', () => {
    const fare = fareFor(BANANI_TO_MOHAKHALI_M, 2, false);

    expect(fare.farePerSeatPaisa).toBe(7500);
    expect(fare.totalPaisa).toBe(15000);
    expect(fare.pooled).toBe(false);
  });

  it('applies the pool discount to every seat when the trip is shared', () => {
    expect(fareFor(BANANI_TO_MOHAKHALI_M, 2, true).totalPaisa).toBe(13200);
  });
});

describe('the rules behind the formula (BR-10, BR-11, BR-13)', () => {
  it('never discounts the base fare', () => {
    const solo = fareFor(BANANI_TO_MOHAKHALI_M, 1, false);
    const pooled = fareFor(BANANI_TO_MOHAKHALI_M, 1, true);

    expect(pooled.basePaisa).toBe(solo.basePaisa);
    expect(solo.totalPaisa - pooled.totalPaisa).toBe(pooled.discountPaisa);
  });

  it('shows parts that always add up to the total', () => {
    const fare = fareFor(BANANI_TO_TEJGAON_M, 3, true);

    expect(fare.basePaisa + fare.distanceChargePaisa - fare.discountPaisa).toBe(
      fare.farePerSeatPaisa,
    );
    expect(fare.farePerSeatPaisa * fare.seats).toBe(fare.totalPaisa);
  });

  it('rounds a half paisa up, for the distance charge and for the discount', () => {
    // 2333 m × 1500 / 1000 = 3499.5 → 3500; then 3500 × 25 % = 875 exactly.
    const halfPaisaDistance = computeFare({
      distanceM: 2333,
      seats: 1,
      pooled: true,
      rates: { ...DEFAULT_RATES, poolDiscountBps: 2500 },
    });
    // 2000 m × 1751 / 1000 = 3502 exactly; then 3502 × 25 % = 875.5 → 876.
    const halfPaisaDiscount = computeFare({
      distanceM: 2000,
      seats: 1,
      pooled: true,
      rates: { basePaisa: 3000, perKmPaisa: 1751, poolDiscountBps: 2500 },
    });

    expect(halfPaisaDistance.distanceChargePaisa).toBe(3500);
    expect(halfPaisaDistance.discountPaisa).toBe(875);
    expect(halfPaisaDiscount.distanceChargePaisa).toBe(3502);
    expect(halfPaisaDiscount.discountPaisa).toBe(876);
  });

  it('uses whatever rates are configured (BR-11)', () => {
    const fare = computeFare({
      distanceM: BANANI_TO_MOHAKHALI_M,
      seats: 1,
      pooled: true,
      rates: { basePaisa: 4000, perKmPaisa: 2000, poolDiscountBps: 2500 },
    });

    expect(fare.totalPaisa).toBe(4000 + 6000 - 1500);
  });

  it('refuses a fractional distance or zero seats', () => {
    expect(() => fareFor(2500.5, 1, false)).toThrow(RangeError);
    expect(() => fareFor(BANANI_TO_MOHAKHALI_M, 0, false)).toThrow(RangeError);
  });
});
