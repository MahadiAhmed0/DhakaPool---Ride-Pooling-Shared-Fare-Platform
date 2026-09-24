// The parts every trip form has: pickup zone, destination zone and seats (FR-PAX-02, FR-PAX-03).
// The fare-estimate form and the ride-request form both start from these.
import { z } from 'zod';
import { zoneCodeSchema } from './zones.ts';

// FR-PAX-03: seats 1 up to the vehicle capacity, and no Tesla has more than 6 seats (ERD CHECK).
// The API also checks that some Tesla in the fleet is big enough.
export const MAX_SEATS_PER_REQUEST = 6;

export const seatsSchema = z
  .number()
  .int('Seats must be a whole number.')
  .min(1, 'Book at least 1 seat.')
  .max(MAX_SEATS_PER_REQUEST, `No Tesla has more than ${MAX_SEATS_PER_REQUEST} seats.`);

export const tripFields = {
  pickupZoneCode: zoneCodeSchema,
  destinationZoneCode: zoneCodeSchema,
  seats: seatsSchema,
};

// FR-PAX-03: pickup and destination must be different zones.
export function hasDifferentZones(trip: {
  pickupZoneCode: string;
  destinationZoneCode: string;
}): boolean {
  return trip.pickupZoneCode !== trip.destinationZoneCode;
}

export const SAME_ZONE_PROBLEM = {
  path: ['destinationZoneCode'],
  message: 'The destination must be a different zone from the pickup.',
};
