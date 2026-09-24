// BR-07: what it costs a passenger to cancel, depending on how far the ride has got.
// Before the driver arrives it is free; after arrival there is a fee; once started it is not allowed.
import type { RideStatus } from '@dhakapool/shared';
import { canMoveRide } from './state-machine.ts';

export type CancellationPolicy = 'FREE' | 'FEE' | 'FORBIDDEN';

export function cancellationPolicy(status: RideStatus): CancellationPolicy {
  // The state machine decides whether a passenger may cancel at all (RT-03, RT-06, RT-09).
  if (!canMoveRide(status, 'CANCELLED', 'PASSENGER')) {
    return 'FORBIDDEN';
  }
  // The driver has already come to the pickup, so the fee applies (BR-07).
  return status === 'DRIVER_ARRIVED' ? 'FEE' : 'FREE';
}
