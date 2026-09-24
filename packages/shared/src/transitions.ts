// The two state machines of SRS §5, written as data: which status may move to which, and who may
// move it. The API enforces these tables (BR-06); the web app reads them to decide which buttons to show.
import type { ActorRole, PoolStatus, RideStatus } from './enums.ts';

// For each status: the statuses it may move to, and the actors allowed to make that move.
export type TransitionTable<Status extends string> = Record<
  Status,
  Partial<Record<Status, readonly ActorRole[]>>
>;

// SRS §5.1. Creating a request (RT-01) is not a move between two statuses, so it is not listed.
export const RIDE_TRANSITIONS: TransitionTable<RideStatus> = {
  REQUESTED: {
    MATCHED: ['DRIVER'], // RT-02: a driver accepts
    CANCELLED: ['PASSENGER'], // RT-03: free
    EXPIRED: ['SYSTEM'], // RT-04: unmatched for 15 minutes
  },
  MATCHED: {
    DRIVER_ARRIVED: ['DRIVER'], // RT-05
    CANCELLED: ['PASSENGER'], // RT-06: free
    REQUESTED: ['DRIVER'], // RT-07: the driver cancels the pool
  },
  DRIVER_ARRIVED: {
    STARTED: ['DRIVER'], // RT-08: the fare is locked
    CANCELLED: ['PASSENGER', 'DRIVER'], // RT-09: with the fee; the driver only for a no-show
    REQUESTED: ['DRIVER'], // RT-10: the driver cancels the pool
  },
  STARTED: {
    COMPLETED: ['DRIVER'], // RT-11: dropped off
  },
  COMPLETED: {},
  CANCELLED: {},
  EXPIRED: {},
};

// SRS §5.2. Creating a pool and adding members (PT-01) do not change the pool's status.
export const POOL_TRANSITIONS: TransitionTable<PoolStatus> = {
  OPEN: {
    DRIVER_ARRIVED: ['DRIVER'], // PT-02
    CANCELLED: ['DRIVER', 'SYSTEM'], // PT-04 by the driver, PT-05 when every member has left
  },
  DRIVER_ARRIVED: {
    STARTED: ['DRIVER'], // PT-03
    CANCELLED: ['DRIVER', 'SYSTEM'], // PT-04, PT-05
  },
  STARTED: {
    COMPLETED: ['SYSTEM'], // PT-06: the last member is dropped off
  },
  COMPLETED: {},
  CANCELLED: {},
};

// A ride in one of these statuses is "active": a passenger may have only one (BR-05).
// The same list is in the database index ride_requests_one_active_per_passenger.
export const ACTIVE_RIDE_STATUSES: readonly RideStatus[] = [
  'REQUESTED',
  'MATCHED',
  'DRIVER_ARRIVED',
  'STARTED',
];

// A pool in one of these statuses is "active": a driver may have only one (BR-04).
export const ACTIVE_POOL_STATUSES: readonly PoolStatus[] = ['OPEN', 'DRIVER_ARRIVED', 'STARTED'];

export function isActiveRide(status: RideStatus): boolean {
  return ACTIVE_RIDE_STATUSES.includes(status);
}
