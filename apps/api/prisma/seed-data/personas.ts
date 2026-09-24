// The reference personas from the PRD scenario (SRS §1.3.4, DR-15), used in seed data, tests and demos.
import type { Gender, UserRole } from '../../src/generated/prisma/client.ts';

export type PersonaSeed = {
  fullName: string;
  email: string;
  phone: string;
  role: UserRole;
  gender: Gender;
  openingBalancePaisa?: number; // passengers only: TeslaPay opening balance
  tesla?: { name: string; plate: string; capacity: number }; // drivers only
};

export const NUSRAT: PersonaSeed = {
  fullName: 'Nusrat',
  email: 'nusrat@dhakapool.test',
  phone: '+8801711000001',
  role: 'PASSENGER',
  gender: 'FEMALE',
  openingBalancePaisa: 50_000, // ৳500.00
};

export const RAFIQ: PersonaSeed = {
  fullName: 'Rafiq',
  email: 'rafiq@dhakapool.test',
  phone: '+8801711000002',
  role: 'PASSENGER',
  gender: 'MALE',
  openingBalancePaisa: 0, // pays cash
};

export const SHIRIN: PersonaSeed = {
  fullName: 'Shirin',
  email: 'shirin@dhakapool.test',
  phone: '+8801711000003',
  role: 'PASSENGER',
  gender: 'FEMALE',
  openingBalancePaisa: 20_000, // ৳200.00
};

export const JASHIM: PersonaSeed = {
  fullName: 'Jashim',
  email: 'jashim@dhakapool.test',
  phone: '+8801711000004',
  role: 'DRIVER',
  gender: 'MALE',
  tesla: { name: 'Bullet', plate: 'DHAKA-TESLA-11', capacity: 3 },
};

// Additional persona (A-15): a second driver, used to test two drivers accepting the same request.
export const KAMAL: PersonaSeed = {
  fullName: 'Kamal',
  email: 'kamal@dhakapool.test',
  phone: '+8801711000005',
  role: 'DRIVER',
  gender: 'MALE',
  tesla: { name: 'Toofan', plate: 'DHAKA-TESLA-22', capacity: 3 },
};

export const PERSONAS: PersonaSeed[] = [NUSRAT, RAFIQ, SHIRIN, JASHIM, KAMAL];
