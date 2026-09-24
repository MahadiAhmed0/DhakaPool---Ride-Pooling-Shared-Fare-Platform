// Checks a status change against the SRS §5 tables before a service makes it (BR-06).
// The tables themselves are in the shared package (transitions.ts). The database compare-and-set
// in each repository then makes sure the status has not changed in the meantime (NFR-CON-02).
import {
  type ActorRole,
  POOL_TRANSITIONS,
  type PoolStatus,
  RIDE_TRANSITIONS,
  type RideStatus,
} from '@dhakapool/shared';
import { ConflictError } from './errors.ts';

export function canMoveRide(from: RideStatus, to: RideStatus, actor: ActorRole): boolean {
  const allowedActors = RIDE_TRANSITIONS[from][to] ?? [];
  return allowedActors.includes(actor);
}

export function canMovePool(from: PoolStatus, to: PoolStatus, actor: ActorRole): boolean {
  const allowedActors = POOL_TRANSITIONS[from][to] ?? [];
  return allowedActors.includes(actor);
}

// Throws 409 INVALID_STATE_TRANSITION for a move that is not in the table, or not for this actor.
export function assertRideMove(from: RideStatus, to: RideStatus, actor: ActorRole): void {
  if (!canMoveRide(from, to, actor)) {
    throw new ConflictError(
      'INVALID_STATE_TRANSITION',
      `A ride that is ${from} cannot become ${to}.`,
      { entity: 'RIDE_REQUEST', from, to },
    );
  }
}

export function assertPoolMove(from: PoolStatus, to: PoolStatus, actor: ActorRole): void {
  if (!canMovePool(from, to, actor)) {
    throw new ConflictError(
      'INVALID_STATE_TRANSITION',
      `A pool that is ${from} cannot become ${to}.`,
      { entity: 'POOL', from, to },
    );
  }
}
