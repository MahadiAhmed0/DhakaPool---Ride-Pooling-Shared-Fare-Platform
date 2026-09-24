// Which buttons a driver sees (NFR-USA-03). The answer comes from the same transition tables the
// API enforces (SRS §5), so the screen never offers a move the server would refuse for its state.
import {
  POOL_TRANSITIONS,
  type PoolStatus,
  RIDE_TRANSITIONS,
  type RideStatus,
} from '@dhakapool/shared';

export function driverMayMovePool(from: PoolStatus, to: PoolStatus): boolean {
  return POOL_TRANSITIONS[from][to]?.includes('DRIVER') ?? false;
}

export function driverMayMoveRide(from: RideStatus, to: RideStatus): boolean {
  return RIDE_TRANSITIONS[from][to]?.includes('DRIVER') ?? false;
}
