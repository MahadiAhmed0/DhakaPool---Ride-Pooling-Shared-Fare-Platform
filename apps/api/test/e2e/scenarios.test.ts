// The SRS scenarios E1–E5 end to end through HTTP, from request to payment (SRS §6.4, BR-18).
// E1 is also TC-25 (the full happy path) and TC-30 (the audit trail explains the whole ride).
import { beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '../../src/db/client.ts';
import { createTestApp, signInAs } from '../helpers/app.ts';
import { expectEveryLedgerToMatchItsBalance } from '../helpers/ledger.ts';
import { createPersonas } from '../helpers/personas.ts';
import {
  accept,
  goOnline,
  NUSRATS_TRIP,
  RAFIQS_TRIP,
  requestRide,
  SHIRINS_TRIP,
} from '../helpers/trips.ts';

const app = createTestApp();
type Agent = Awaited<ReturnType<typeof signInAs>>;

let jashim: Agent;
let nusrat: Agent;
let rafiq: Agent;
let shirin: Agent;

beforeEach(async () => {
  await createPersonas();
  [jashim, nusrat, rafiq, shirin] = await Promise.all([
    signInAs(app, 'jashim@dhakapool.test'),
    signInAs(app, 'nusrat@dhakapool.test'),
    signInAs(app, 'rafiq@dhakapool.test'),
    signInAs(app, 'shirin@dhakapool.test'),
  ]);
  await goOnline(jashim);
});

async function jashimsPoolId(): Promise<string> {
  return (await prisma.pool.findFirstOrThrow({ orderBy: { createdAt: 'desc' } })).id;
}

// Jashim arrives, starts, and drops everyone off in the order given.
async function driveTrip(dropOffOrder: string[]): Promise<void> {
  const poolId = await jashimsPoolId();
  expect((await jashim.post(`/api/pools/${poolId}/arrive`)).status).toBe(200);
  expect((await jashim.post(`/api/pools/${poolId}/start`)).status).toBe(200);
  for (const rideId of dropOffOrder) {
    expect((await jashim.post(`/api/pools/${poolId}/members/${rideId}/complete`)).status).toBe(200);
  }
}

async function paymentsOf(passenger: Agent, rideId: string): Promise<unknown[]> {
  return (await passenger.get(`/api/rides/${rideId}`)).body.ride.payments;
}

async function balanceOf(passenger: Agent): Promise<number> {
  return (await passenger.get('/api/wallet')).body.wallet.balancePaisa;
}

describe('E1: Nusrat and Rafiq share Bullet (TC-25, TC-30)', () => {
  it('charges ৳66.00 by TeslaPay and ৳60.00 in cash, and the records tell the whole story', async () => {
    const nusratsRide = await requestRide(nusrat, NUSRATS_TRIP);
    const rafiqsRide = await requestRide(rafiq, RAFIQS_TRIP);
    await accept(jashim, nusratsRide);
    await accept(jashim, rafiqsRide);
    await driveTrip([nusratsRide, rafiqsRide]);
    const poolId = await jashimsPoolId();
    await jashim.post(`/api/pools/${poolId}/members/${rafiqsRide}/cash-collected`);

    expect(await balanceOf(nusrat)).toBe(43400);
    expect(await paymentsOf(nusrat, nusratsRide)).toEqual([
      { charge: 'RIDE', method: 'TESLAPAY', status: 'PAID', amountPaisa: 6600 },
    ]);
    expect(await paymentsOf(rafiq, rafiqsRide)).toEqual([
      { charge: 'RIDE', method: 'CASH', status: 'PAID', amountPaisa: 6000 },
    ]);
    expect((await jashim.get('/api/driver/availability')).body.driver.zoneCode).toBe('GL1');
    await expectEveryLedgerToMatchItsBalance();

    // TC-30: one audit row per change, each with its actor, for the ride, the pool and the payments.
    const poolHistory = await prisma.statusHistory.findMany({
      where: { entityId: poolId },
      orderBy: { id: 'asc' },
    });
    expect(poolHistory.map((row) => `${row.toStatus} by ${row.actorRole}`)).toEqual([
      'OPEN by DRIVER',
      'DRIVER_ARRIVED by DRIVER',
      'STARTED by DRIVER',
      'COMPLETED by SYSTEM',
    ]);
    expect(await prisma.statusHistory.count({ where: { entityId: nusratsRide } })).toBe(5);
    const paymentHistory = await prisma.statusHistory.findMany({
      where: { entityType: 'PAYMENT' },
      orderBy: { id: 'asc' },
    });
    expect(paymentHistory.map((row) => `${row.fromStatus} → ${row.toStatus}`)).toEqual([
      'null → PAID',
      'null → PENDING_CASH',
      'PENDING_CASH → PAID',
    ]);
  });
});

describe('E2: Rafiq cancels while matched', () => {
  it('charges Rafiq nothing, and Nusrat rides alone at ৳75.00', async () => {
    const nusratsRide = await requestRide(nusrat, NUSRATS_TRIP);
    const rafiqsRide = await requestRide(rafiq, RAFIQS_TRIP);
    await accept(jashim, nusratsRide);
    await accept(jashim, rafiqsRide);

    await rafiq.post(`/api/rides/${rafiqsRide}/cancel`);
    await driveTrip([nusratsRide]);

    expect(await paymentsOf(rafiq, rafiqsRide)).toEqual([]);
    expect(await balanceOf(nusrat)).toBe(50000 - 7500);
    await expectEveryLedgerToMatchItsBalance();
  });
});

describe('E3: Rafiq cancels after Jashim arrived', () => {
  it('records Rafiq’s ৳20.00 fee as unpaid cash, and Nusrat pays ৳75.00', async () => {
    const nusratsRide = await requestRide(nusrat, NUSRATS_TRIP);
    const rafiqsRide = await requestRide(rafiq, RAFIQS_TRIP);
    await accept(jashim, nusratsRide);
    await accept(jashim, rafiqsRide);
    const poolId = await jashimsPoolId();
    await jashim.post(`/api/pools/${poolId}/arrive`);

    await rafiq.post(`/api/rides/${rafiqsRide}/cancel`);
    await jashim.post(`/api/pools/${poolId}/start`);
    await jashim.post(`/api/pools/${poolId}/members/${nusratsRide}/complete`);

    expect(await paymentsOf(rafiq, rafiqsRide)).toEqual([
      { charge: 'CANCELLATION_FEE', method: 'CASH', status: 'UNPAID', amountPaisa: 2000 },
    ]);
    expect(await balanceOf(nusrat)).toBe(42500);
    await expectEveryLedgerToMatchItsBalance();
  });
});

describe('E4: Nusrat books two seats on her own', () => {
  it('charges her ৳150.00, which is not a shared ride', async () => {
    const nusratsRide = await requestRide(nusrat, { ...NUSRATS_TRIP, seats: 2 });
    await accept(jashim, nusratsRide);

    await driveTrip([nusratsRide]);

    const ride = (await nusrat.get(`/api/rides/${nusratsRide}`)).body.ride;
    expect(ride.fare.locked).toMatchObject({ seats: 2, pooled: false, totalPaisa: 15000 });
    expect(await balanceOf(nusrat)).toBe(35000);
  });
});

describe('E5: Shirin asks for a women-only ride (BR-18)', () => {
  it('lets Nusrat join, turns Rafiq away, and charges both women the shared fare', async () => {
    const shirinsRide = await requestRide(shirin, { ...SHIRINS_TRIP, sameGenderOnly: true });
    const nusratsRide = await requestRide(nusrat, NUSRATS_TRIP);
    const rafiqsRide = await requestRide(rafiq, RAFIQS_TRIP);
    await accept(jashim, shirinsRide);
    await accept(jashim, nusratsRide);

    const forRafiq = await jashim.post(`/api/driver/requests/${rafiqsRide}/accept`);
    await driveTrip([nusratsRide, shirinsRide]);

    expect(forRafiq.status).toBe(422);
    expect(forRafiq.body.error.details.reason).toBe('GENDER_RESTRICTED');
    expect(await balanceOf(shirin)).toBe(20000 - 9000);
    expect(await balanceOf(nusrat)).toBe(50000 - 6600);
    await expectEveryLedgerToMatchItsBalance();
  });
});
