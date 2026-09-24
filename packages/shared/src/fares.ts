// Fares: the estimate request (FR-PAX-02) and fares as the API returns them (BR-10, BR-11, FR-FARE-04).
// Every amount is whole paisa (FR-FARE-06): 6600 means ৳66.00. Use formatPaisa() to show an amount.
import { z } from 'zod';
import { hasDifferentZones, SAME_ZONE_PROBLEM, tripFields } from './trips.ts';

export const fareEstimateSchema = z
  .strictObject(tripFields)
  .refine(hasDifferentZones, SAME_ZONE_PROBLEM);
export type FareEstimateInput = z.infer<typeof fareEstimateSchema>;

// The rates a fare was worked out with (BR-11). Stored with every locked fare (FR-FARE-03).
export type FareRates = {
  basePaisa: number; // per seat, never discounted
  perKmPaisa: number;
  poolDiscountBps: number; // basis points of the distance charge: 2000 = 20 %
};

// One passenger's fare, split into the parts shown on screen. The parts always add up:
// farePerSeatPaisa = basePaisa + distanceChargePaisa − discountPaisa, and
// totalPaisa = farePerSeatPaisa × seats.
export type FareBreakdown = {
  pooled: boolean;
  seats: number;
  basePaisa: number;
  distanceChargePaisa: number;
  discountPaisa: number; // 0 when the ride is not pooled
  farePerSeatPaisa: number;
  totalPaisa: number;
};

// The answer to POST /api/fares/estimate: what the trip costs alone and what it costs when shared.
// Which one applies is only decided at trip start (BR-12).
export type FareEstimate = {
  pickupZoneCode: string;
  destinationZoneCode: string;
  distanceM: number; // from the zone distance table (BR-09)
  rates: FareRates;
  solo: FareBreakdown;
  pooled: FareBreakdown;
};
