// Fare estimates (FR-PAX-02, FR-FARE-02): what a trip costs alone and what it costs when shared.
// The formula itself lives in domain/fare.ts; this file only finds the distance and the rates.
import type { FareEstimate, FareEstimateInput } from '@dhakapool/shared';
import { CURRENT_FARE_RATES } from '../../config/rules.ts';
import { computeFare } from '../../domain/fare.ts';
import { distanceBetween } from '../zones/zones.service.ts';

export async function estimateFare(trip: FareEstimateInput): Promise<FareEstimate> {
  const distanceM = await distanceBetween(trip.pickupZoneCode, trip.destinationZoneCode);
  const fareInput = { distanceM, seats: trip.seats, rates: CURRENT_FARE_RATES };
  return {
    pickupZoneCode: trip.pickupZoneCode,
    destinationZoneCode: trip.destinationZoneCode,
    distanceM,
    rates: CURRENT_FARE_RATES,
    solo: computeFare({ ...fareInput, pooled: false }),
    pooled: computeFare({ ...fareInput, pooled: true }),
  };
}
