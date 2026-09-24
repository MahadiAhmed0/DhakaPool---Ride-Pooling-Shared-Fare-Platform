// Turns a "no" from the matching rule into the error the driver sees (SRS §8.2).
// Seats and a closed pool are about the current state (409); everything else breaks a rule (422).
import { POOL_JOIN_WINDOW_MINUTES } from '../../config/rules.ts';
import { type AppError, ConflictError, UnprocessableError } from '../../domain/errors.ts';
import type { MatchFailure } from '../../domain/matching.ts';

type RuleFailure = Exclude<MatchFailure, 'POOL_NOT_OPEN' | 'NO_SEATS'>;

const RULE_MESSAGES: Record<RuleFailure, string> = {
  NOT_OPTED_IN: 'This trip cannot be shared: a passenger chose to ride alone.',
  DIFFERENT_PICKUP: 'This passenger is waiting in a different zone.',
  JOIN_WINDOW_PASSED: `Your trip formed more than ${POOL_JOIN_WINDOW_MINUTES} minutes before this request, so it cannot join.`,
  DESTINATION_NOT_ADJACENT: "This destination is too far from your passengers' destinations.",
  GENDER_RESTRICTED: 'The same-gender rule of this trip does not allow this passenger to join.',
};

export type RefusalContext = { vehicleName: string; freeSeats: number };

export function matchRefusal(reason: MatchFailure, context: RefusalContext): AppError {
  if (reason === 'POOL_NOT_OPEN') {
    return new ConflictError(
      'POOL_NOT_OPEN',
      `${context.vehicleName}'s trip is already under way, so nobody else can join.`,
    );
  }
  if (reason === 'NO_SEATS') {
    const seats = context.freeSeats === 1 ? 'seat' : 'seats';
    return new ConflictError(
      'CAPACITY_EXCEEDED',
      `${context.vehicleName} has only ${context.freeSeats} free ${seats}.`,
      { freeSeats: context.freeSeats },
    );
  }
  return new UnprocessableError('NOT_COMPATIBLE', RULE_MESSAGES[reason], { reason });
}
