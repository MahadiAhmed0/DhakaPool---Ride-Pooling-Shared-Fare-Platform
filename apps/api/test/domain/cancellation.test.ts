// BR-07: the passenger cancellation policy for each ride status (part of TC-05).
import { RIDE_STATUSES } from '@dhakapool/shared';
import { describe, expect, it } from 'vitest';
import { cancellationPolicy } from '../../src/domain/cancellation.ts';

describe('what cancelling costs a passenger (BR-07)', () => {
  it('is free before the driver arrives, costs the fee after arrival, and is refused later', () => {
    const policies = Object.fromEntries(
      RIDE_STATUSES.map((status) => [status, cancellationPolicy(status)]),
    );

    expect(policies).toEqual({
      REQUESTED: 'FREE',
      MATCHED: 'FREE',
      DRIVER_ARRIVED: 'FEE',
      STARTED: 'FORBIDDEN',
      COMPLETED: 'FORBIDDEN',
      CANCELLED: 'FORBIDDEN',
      EXPIRED: 'FORBIDDEN',
    });
  });
});
