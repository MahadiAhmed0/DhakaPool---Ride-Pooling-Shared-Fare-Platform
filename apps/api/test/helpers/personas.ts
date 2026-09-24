// Creates the reference personas for a test (SRS §1.3.4): Nusrat, Rafiq, Shirin, Jashim with Bullet,
// Kamal with Toofan. Every test starts from the same known people, so tests read like the SRS scenarios.
import bcrypt from 'bcryptjs';
import { prisma } from '../../src/db/client.ts';
import { seedPersonas } from '../../prisma/seed-steps/seed-personas.ts';
import { JASHIM, KAMAL, NUSRAT, RAFIQ, SHIRIN } from '../../prisma/seed-data/personas.ts';
import { resetDatabase } from './database.ts';

// The password every test persona signs in with. A low hashing cost keeps tests fast.
export const TEST_PASSWORD = 'TeslaPool#2026';
const FAST_BCRYPT_COST = 4;

export type Passenger = { id: string; walletId: string };
export type Driver = { id: string; vehicleId: string };
export type Personas = {
  nusrat: Passenger;
  rafiq: Passenger;
  shirin: Passenger;
  jashim: Driver;
  kamal: Driver;
};

async function findPassenger(email: string): Promise<Passenger> {
  const user = await prisma.user.findUniqueOrThrow({ where: { email }, include: { wallet: true } });
  return { id: user.id, walletId: user.wallet!.id };
}

async function findDriver(email: string): Promise<Driver> {
  const user = await prisma.user.findUniqueOrThrow({
    where: { email },
    include: { driverProfile: { include: { vehicle: true } } },
  });
  return { id: user.id, vehicleId: user.driverProfile!.vehicle!.id };
}

export async function createPersonas(): Promise<Personas> {
  await resetDatabase();
  await seedPersonas(prisma, await bcrypt.hash(TEST_PASSWORD, FAST_BCRYPT_COST));
  return {
    nusrat: await findPassenger(NUSRAT.email),
    rafiq: await findPassenger(RAFIQ.email),
    shirin: await findPassenger(SHIRIN.email),
    jashim: await findDriver(JASHIM.email),
    kamal: await findDriver(KAMAL.email),
  };
}
