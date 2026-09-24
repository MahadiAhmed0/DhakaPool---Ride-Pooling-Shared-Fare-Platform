// A pool (one Tesla trip) as its driver sees it (FR-DRV-06, FR-POOL-10). The driver sees each
// member's name, trip, seats, status and fare, and the pool's same-gender badge, but never a
// member's gender (A-10, A-20).
import type { GenderRestriction, PaymentMethod, PoolStatus, RideStatus } from './enums.ts';

export type DriverPoolMember = {
  rideId: string;
  passengerName: string;
  pickupZoneCode: string;
  destinationZoneCode: string;
  seats: number;
  status: RideStatus;
  paymentMethod: PaymentMethod;
  estimatedFarePaisa: number; // the solo estimate, until the trip starts
  lockedFarePaisa: number | null; // the fare fixed at trip start (BR-12)
};

export type DriverPoolView = {
  id: string;
  status: PoolStatus;
  pickupZoneCode: string;
  vehicle: { name: string; plate: string };
  capacity: number;
  occupiedSeats: number;
  isPrivate: boolean; // the first passenger did not want to share (FR-POOL-04)
  genderRestriction: GenderRestriction; // shown as a "Women-only ride" badge (BR-18)
  createdAt: string;
  members: DriverPoolMember[];
  totalFarePaisa: number; // the fixed fares of this trip added up (FR-DRV-13); 0 before the start
};

// GET /api/driver/pools takes the same scope, cursor and limit as a passenger's ride list.
export type DriverPoolList = { pools: DriverPoolView[]; nextCursor: string | null };
