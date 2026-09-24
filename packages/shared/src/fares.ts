// Fares: the estimate request (FR-PAX-02) and fares as the API returns them (BR-10, BR-11, FR-FARE-04).
// Every amount is whole paisa (FR-FARE-06): 6600 means ৳66.00. Use formatPaisa() to show an amount.
import { z } from 'zod';
import { zoneCodeSchema } from './zones.ts';

// FR-PAX-03: seats 1 up to the vehicle capacity, and no Tesla has more than 6 seats (ERD CHECK).
// Whether the seats fit a particular Tesla is checked when a driver accepts (BR-01).
export const MAX_SEATS_PER_REQUEST = 6;

export const seatsSchema = z
  .number()
  .int('Seats must be a whole number.')
  .min(1, 'Book at least 1 seat.')
  .max(MAX_SEATS_PER_REQUEST, `No Tesla has more than ${MAX_SEATS_PER_REQUEST} seats.`);

export const fareEstimateSchema = z
  .strictObject({
    pickupZoneCode: zoneCodeSchema,
    destinationZoneCode: zoneCodeSchema,
    seats: seatsSchema,
  })
  .refine((trip) => trip.pickupZoneCode !== trip.destinationZoneCode, {
    path: ['destinationZoneCode'],
    message: 'The destination must be a different zone from the pickup.',
  });
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
