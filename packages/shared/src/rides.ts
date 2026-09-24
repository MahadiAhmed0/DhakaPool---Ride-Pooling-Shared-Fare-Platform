// Ride requests: the request form (FR-PAX-03, FR-PAX-11), the list query (FR-PAX-09) and the ride as
// a passenger sees it (FR-PAX-06, FR-PAX-10). A passenger never sees a co-rider's name, destination,
// fare or gender, only how many co-riders there are (A-09, A-20).
import { z } from 'zod';
import {
  type ActorRole,
  type GenderRestriction,
  PAYMENT_METHODS,
  type PaymentMethod,
  type RideStatus,
} from './enums.ts';
import type { FareBreakdown } from './fares.ts';
import { hasDifferentZones, SAME_ZONE_PROBLEM, tripFields } from './trips.ts';

export const rideRequestSchema = z
  .strictObject({
    ...tripFields,
    poolOptIn: z.boolean().default(true), // "Share my ride", on unless switched off
    sameGenderOnly: z.boolean().default(false), // FR-PAX-11
    paymentMethod: z.enum(PAYMENT_METHODS),
  })
  .refine(hasDifferentZones, SAME_ZONE_PROBLEM)
  // FR-PAX-11: a same-gender ride is a kind of shared ride, so it needs sharing switched on.
  .refine((ride) => ride.poolOptIn || !ride.sameGenderOnly, {
    path: ['sameGenderOnly'],
    message: 'A same-gender ride needs "Share my ride" to be switched on.',
  });
export type RideRequestInput = z.infer<typeof rideRequestSchema>;

// FR-PAX-09: history is shown a page at a time, newest first.
export const RIDE_PAGE_SIZE = 10;
export const MAX_RIDE_PAGE_SIZE = 50;
export const RIDE_LIST_SCOPES = ['active', 'history'] as const;

export const rideListQuerySchema = z.object({
  scope: z.enum(RIDE_LIST_SCOPES).default('active'),
  cursor: z.uuid('The cursor is not valid.').optional(), // the last ride id of the previous page
  limit: z.coerce.number().int().min(1).max(MAX_RIDE_PAGE_SIZE).default(RIDE_PAGE_SIZE),
});
export type RideListQuery = z.infer<typeof rideListQuerySchema>;

export type RideFare = {
  // What the trip would cost now: alone, and shared (only when the passenger opted in).
  estimate: { solo: FareBreakdown; pooled: FareBreakdown | null };
  locked: FareBreakdown | null; // the fare fixed at trip start (BR-12)
  cancellationFeePaisa: number | null; // BR-07, when a fee was charged
};

// The Tesla trip the ride belongs to, once a driver has accepted it.
export type RideTrip = {
  driverName: string;
  vehicle: { name: string; plate: string };
  isShared: boolean;
  coRiderCount: number; // other passengers in the same trip (A-09)
  genderRestriction: GenderRestriction; // shown as a "Women-only ride" badge (FR-PAX-11)
};

export type RideView = {
  id: string;
  status: RideStatus;
  pickupZoneCode: string;
  destinationZoneCode: string;
  seats: number;
  poolOptIn: boolean;
  sameGenderOnly: boolean;
  paymentMethod: PaymentMethod;
  requestedAt: string; // ISO 8601 timestamps
  expiresAt: string;
  cancelledAt: string | null;
  completedAt: string | null;
  cancelReason: string | null;
  fare: RideFare;
  trip: RideTrip | null;
};

// One line of the status timeline, taken from the audit trail (FR-PAX-10).
export type RideTimelineEntry = {
  fromStatus: RideStatus | null;
  toStatus: RideStatus;
  actorRole: ActorRole;
  reason: string | null;
  at: string;
};

export type RideDetail = RideView & { timeline: RideTimelineEntry[] };

export type RideList = { rides: RideView[]; nextCursor: string | null };
