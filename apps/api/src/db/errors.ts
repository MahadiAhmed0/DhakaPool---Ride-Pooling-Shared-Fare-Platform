// Translates database errors into the API's own errors (ARCHITECTURE §7.2, §9.1).
// When a constraint in the integrity migration fires, the client gets a clear business error,
// never a raw database message.
import { Prisma } from '../generated/prisma/client.ts';
import {
  type AppError,
  ConflictError,
  ServiceUnavailableError,
  UnprocessableError,
} from '../domain/errors.ts';

// Postgres error codes (SQLSTATE) we react to.
const UNIQUE_VIOLATION = '23505';
const CHECK_VIOLATION = '23514';
const LOCK_NOT_AVAILABLE = '55P03';
const DEADLOCK_DETECTED = '40P01';
// Prisma codes: P2028 = transaction timed out or was closed.
const TRANSACTION_ERROR = 'P2028';

// Which business error each named constraint or index stands for.
const CONSTRAINT_ERRORS: Record<string, () => AppError> = {
  pools_occupied_seats_check: () =>
    new ConflictError('CAPACITY_EXCEEDED', 'The Tesla does not have enough free seats.'),
  ride_requests_one_active_per_passenger: () =>
    new ConflictError('ACTIVE_REQUEST_EXISTS', 'You already have an active ride.'),
  pools_one_active_per_driver: () =>
    new ConflictError('ACTIVE_POOL_EXISTS', 'This driver already has an active trip.'),
  pool_members_one_active_membership: () =>
    new ConflictError('INVALID_STATE_TRANSITION', 'This ride is already in a pool.'),
  wallets_balance_check: () =>
    new UnprocessableError('INSUFFICIENT_BALANCE', 'Your TeslaPay balance is too low.'),
};

type DatabaseFailure = { sqlState?: string; constraint?: string };

type AdapterCause = {
  originalCode?: string;
  originalMessage?: string;
  constraint?: { index?: string };
};

// Prisma puts the Postgres details under meta.driverAdapterError.cause (seen with Prisma 7 + pg).
function readAdapterCause(error: Prisma.PrismaClientKnownRequestError): AdapterCause {
  const adapterError = error.meta?.['driverAdapterError'] as { cause?: AdapterCause } | undefined;
  return adapterError?.cause ?? {};
}

// Unique violations name the index; CHECK violations only name the constraint in the message.
function constraintNameOf(cause: AdapterCause): string | undefined {
  if (cause.constraint?.index) {
    return cause.constraint.index;
  }
  return cause.originalMessage?.match(/constraint "([^"]+)"/)?.[1];
}

function readDatabaseFailure(error: Prisma.PrismaClientKnownRequestError): DatabaseFailure {
  const cause = readAdapterCause(error);
  return { sqlState: cause.originalCode, constraint: constraintNameOf(cause) };
}

function mapKnownRequestError(error: Prisma.PrismaClientKnownRequestError): AppError | undefined {
  if (error.code === TRANSACTION_ERROR) {
    return new ServiceUnavailableError();
  }
  const { sqlState, constraint } = readDatabaseFailure(error);
  const constraintError = constraint ? CONSTRAINT_ERRORS[constraint] : undefined;
  if (constraintError && (sqlState === UNIQUE_VIOLATION || sqlState === CHECK_VIOLATION)) {
    return constraintError();
  }
  if (sqlState === LOCK_NOT_AVAILABLE) {
    return new ServiceUnavailableError('The system is busy. Please try again.');
  }
  if (sqlState === DEADLOCK_DETECTED) {
    return new ConflictError('CONFLICT', 'Another change happened at the same time. Please retry.');
  }
  return undefined;
}

// Returns the matching AppError, or undefined when the error is not a known database error.
export function mapDatabaseError(error: unknown): AppError | undefined {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    return mapKnownRequestError(error);
  }
  if (error instanceof Prisma.PrismaClientInitializationError) {
    return new ServiceUnavailableError();
  }
  return undefined;
}
