// The transition tables are exactly SRS §5 and nothing more (TC-08; BR-06, NFR-MNT-02).
// Every (from, to, actor) combination is tried; only the listed ones may pass.
import { ACTOR_ROLES, type ActorRole, POOL_STATUSES, RIDE_STATUSES } from '@dhakapool/shared';
import { describe, expect, it } from 'vitest';
import {
  assertPoolMove,
  assertRideMove,
  canMovePool,
  canMoveRide,
} from '../../src/domain/state-machine.ts';

// SRS §5.1 RT-02 … RT-11, written as "from > to : actor".
const ALLOWED_RIDE_MOVES = [
  'REQUESTED > MATCHED : DRIVER',
  'REQUESTED > CANCELLED : PASSENGER',
  'REQUESTED > EXPIRED : SYSTEM',
  'MATCHED > DRIVER_ARRIVED : DRIVER',
  'MATCHED > CANCELLED : PASSENGER',
  'MATCHED > REQUESTED : DRIVER',
  'DRIVER_ARRIVED > STARTED : DRIVER',
  'DRIVER_ARRIVED > CANCELLED : PASSENGER',
  'DRIVER_ARRIVED > CANCELLED : DRIVER',
  'DRIVER_ARRIVED > REQUESTED : DRIVER',
  'STARTED > COMPLETED : DRIVER',
];

// SRS §5.2 PT-02 … PT-06.
const ALLOWED_POOL_MOVES = [
  'OPEN > DRIVER_ARRIVED : DRIVER',
  'OPEN > CANCELLED : DRIVER',
  'OPEN > CANCELLED : SYSTEM',
  'DRIVER_ARRIVED > STARTED : DRIVER',
  'DRIVER_ARRIVED > CANCELLED : DRIVER',
  'DRIVER_ARRIVED > CANCELLED : SYSTEM',
  'STARTED > COMPLETED : SYSTEM',
];

// Tries every (from, to, actor) combination and lists the ones the machine allows.
function allowedMoves<Status extends string>(
  statuses: readonly Status[],
  canMove: (from: Status, to: Status, actor: ActorRole) => boolean,
): string[] {
  const combinations = statuses.flatMap((from) =>
    statuses.flatMap((to) => ACTOR_ROLES.map((actor) => ({ from, to, actor }))),
  );
  return combinations
    .filter(({ from, to, actor }) => canMove(from, to, actor))
    .map(({ from, to, actor }) => `${from} > ${to} : ${actor}`)
    .sort();
}

describe('the ride state machine (SRS §5.1)', () => {
  it('allows exactly the moves RT-02 … RT-11 and rejects every other combination', () => {
    expect(allowedMoves(RIDE_STATUSES, canMoveRide)).toEqual([...ALLOWED_RIDE_MOVES].sort());
  });

  it('never lets a completed, cancelled or expired ride change again', () => {
    for (const terminal of ['COMPLETED', 'CANCELLED', 'EXPIRED'] as const) {
      for (const to of RIDE_STATUSES) {
        expect(canMoveRide(terminal, to, 'SYSTEM')).toBe(false);
      }
    }
  });

  it('refuses to let Nusrat cancel a ride that has started, with 409 INVALID_STATE_TRANSITION', () => {
    expect(() => assertRideMove('STARTED', 'CANCELLED', 'PASSENGER')).toThrow(
      expect.objectContaining({ code: 'INVALID_STATE_TRANSITION', httpStatus: 409 }),
    );
  });

  it('refuses to let a passenger accept their own request, which only a driver may do', () => {
    expect(() => assertRideMove('REQUESTED', 'MATCHED', 'PASSENGER')).toThrow(
      /cannot become MATCHED/,
    );
    expect(() => assertRideMove('REQUESTED', 'MATCHED', 'DRIVER')).not.toThrow();
  });
});

describe('the pool state machine (SRS §5.2)', () => {
  it('allows exactly the moves PT-02 … PT-06 and rejects every other combination', () => {
    expect(allowedMoves(POOL_STATUSES, canMovePool)).toEqual([...ALLOWED_POOL_MOVES].sort());
  });

  it('refuses to let Jashim start an OPEN pool before he has arrived (TC-02)', () => {
    expect(() => assertPoolMove('OPEN', 'STARTED', 'DRIVER')).toThrow(
      expect.objectContaining({ code: 'INVALID_STATE_TRANSITION' }),
    );
  });

  it('completes a pool only through the system, after the last drop-off (PT-06)', () => {
    expect(canMovePool('STARTED', 'COMPLETED', 'DRIVER')).toBe(false);
    expect(canMovePool('STARTED', 'COMPLETED', 'SYSTEM')).toBe(true);
  });
});
