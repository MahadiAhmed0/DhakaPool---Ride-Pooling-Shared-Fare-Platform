// Accounts: passenger sign-up and sign-in for passengers and drivers (FR-AUTH-01, FR-AUTH-02).
import type { CurrentUser, LogInInput, SignUpInput } from '@dhakapool/shared';
import bcrypt from 'bcryptjs';
import { env } from '../../config/env.ts';
import { withTransaction } from '../../db/transaction.ts';
import { NotFoundError, UnauthenticatedError } from '../../domain/errors.ts';
import {
  createPassengerWithWallet,
  createSession,
  findUserForLogIn,
  findUserProfile,
} from './auth.repository.ts';
import { createSessionToken, hashSessionToken } from './session-token.ts';

const MS_PER_HOUR = 60 * 60 * 1000;

// FR-AUTH-02: one message for "no such account" and "wrong password", so nobody can find out
// which e-mail addresses have accounts.
const WRONG_CREDENTIALS = 'The e-mail, phone number or password is not correct.';

// Compared against when the account does not exist, so both cases take the same time.
const PLACEHOLDER_HASH = bcrypt.hashSync('placeholder-password-never-used', env.BCRYPT_COST);

export type SignedIn = { user: CurrentUser; sessionToken: string; expiresAt: Date };

export async function getCurrentUser(userId: string): Promise<CurrentUser> {
  const user = await findUserProfile(userId);
  if (!user) {
    throw new NotFoundError('This account no longer exists.');
  }
  const vehicle = user.driverProfile?.vehicle;
  const { id, fullName, email, phone, role, gender } = user;
  return {
    id,
    fullName,
    email,
    phone,
    role,
    gender,
    ...(vehicle && {
      vehicle: { name: vehicle.name, plate: vehicle.plate, capacity: vehicle.capacity },
    }),
  };
}

async function startSession(userId: string): Promise<SignedIn> {
  const sessionToken = createSessionToken();
  const expiresAt = new Date(Date.now() + env.SESSION_TTL_HOURS * MS_PER_HOUR);
  await createSession(hashSessionToken(sessionToken), userId, expiresAt);
  return { user: await getCurrentUser(userId), sessionToken, expiresAt };
}

// FR-AUTH-01: sign-up is for passengers only; drivers are provisioned by the seed (A-05).
// A duplicate e-mail or phone is rejected by the database's unique indexes (409 CONFLICT).
export async function signUp(input: SignUpInput): Promise<SignedIn> {
  const { password, ...details } = input;
  const passwordHash = await bcrypt.hash(password, env.BCRYPT_COST);
  const userId = await withTransaction((tx) =>
    createPassengerWithWallet(tx, { ...details, passwordHash }),
  );
  return startSession(userId);
}

export async function logIn(input: LogInInput): Promise<SignedIn> {
  const user = await findUserForLogIn(input.emailOrPhone);
  const passwordMatches = await bcrypt.compare(
    input.password,
    user?.passwordHash ?? PLACEHOLDER_HASH,
  );
  if (!user || !passwordMatches) {
    throw new UnauthenticatedError(WRONG_CREDENTIALS);
  }
  return startSession(user.id);
}
