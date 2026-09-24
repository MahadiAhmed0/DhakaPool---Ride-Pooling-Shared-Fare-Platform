// Database queries for accounts and sessions.
import { prisma } from '../../db/client.ts';
import type { Tx } from '../../db/transaction.ts';
import type { Gender, Prisma } from '../../generated/prisma/client.ts';

export type NewPassenger = {
  fullName: string;
  email: string;
  phone: string;
  passwordHash: string;
  gender: Gender;
};

export type LogInCandidate = { id: string; passwordHash: string };
export type UserProfile = Prisma.UserGetPayload<{
  include: { driverProfile: { include: { vehicle: true } } };
}>;

// FR-AUTH-01: a new passenger always starts with an empty TeslaPay wallet.
export async function createPassengerWithWallet(tx: Tx, passenger: NewPassenger): Promise<string> {
  const user = await tx.user.create({
    data: { ...passenger, role: 'PASSENGER', wallet: { create: { balancePaisa: 0n } } },
  });
  return user.id;
}

export async function findUserForLogIn(emailOrPhone: string): Promise<LogInCandidate | null> {
  return prisma.user.findFirst({
    where: { OR: [{ email: emailOrPhone.toLowerCase() }, { phone: emailOrPhone }] },
    select: { id: true, passwordHash: true },
  });
}

export async function findUserProfile(userId: string): Promise<UserProfile | null> {
  return prisma.user.findUnique({
    where: { id: userId },
    include: { driverProfile: { include: { vehicle: true } } },
  });
}

export async function createSession(
  tokenHash: string,
  userId: string,
  expiresAt: Date,
): Promise<void> {
  await prisma.session.create({ data: { tokenHash, userId, expiresAt } });
}
