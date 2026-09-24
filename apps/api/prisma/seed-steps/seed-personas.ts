// Seeds the reference personas: passengers with TeslaPay wallets, drivers with their Teslas.
// Safe to run again: people are matched by e-mail and Teslas by plate, so nothing is duplicated.
import type { PrismaClient } from '../../src/generated/prisma/client.ts';
import { PERSONAS, type PersonaSeed } from '../seed-data/personas.ts';

async function upsertUser(
  db: PrismaClient,
  persona: PersonaSeed,
  passwordHash: string,
): Promise<string> {
  const { fullName, email, phone, role, gender } = persona;
  const user = await db.user.upsert({
    where: { email },
    update: {},
    create: { fullName, email, phone, role, gender, passwordHash },
  });
  return user.id;
}

// A wallet is created once. Its opening balance is recorded in the ledger as a TOPUP
// with reason SEED, so the balance always equals the sum of the ledger (FR-PAY-06).
async function ensureWallet(
  db: PrismaClient,
  passengerId: string,
  openingBalancePaisa: number,
): Promise<void> {
  const existing = await db.wallet.findUnique({ where: { passengerId } });
  if (existing) {
    return;
  }
  const balancePaisa = BigInt(openingBalancePaisa);
  const openingEntry = {
    type: 'TOPUP' as const,
    amountPaisa: balancePaisa,
    balanceAfterPaisa: balancePaisa,
    reason: 'SEED',
  };
  await db.wallet.create({
    data: {
      passengerId,
      balancePaisa,
      transactions: openingBalancePaisa > 0 ? { create: openingEntry } : undefined,
    },
  });
}

async function ensureDriverWithTesla(
  db: PrismaClient,
  driverId: string,
  persona: PersonaSeed,
): Promise<void> {
  await db.driverProfile.upsert({
    where: { userId: driverId },
    update: {},
    create: { userId: driverId },
  });
  if (!persona.tesla) {
    return;
  }
  await db.vehicle.upsert({
    where: { plate: persona.tesla.plate },
    update: {},
    create: { driverId, ...persona.tesla },
  });
}

export async function seedPersonas(db: PrismaClient, passwordHash: string): Promise<void> {
  for (const persona of PERSONAS) {
    const userId = await upsertUser(db, persona, passwordHash);
    if (persona.role === 'PASSENGER') {
      await ensureWallet(db, userId, persona.openingBalancePaisa ?? 0);
    } else {
      await ensureDriverWithTesla(db, userId, persona);
    }
  }
}
