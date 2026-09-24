// Accepting requests into Bullet (FR-DRV-05, FR-POOL-01…05): capacity (TC-01), the matching rule at
// accept time (TC-20), private pools (TC-19), closed pools (TC-21) and expired requests (TC-24).
import { beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '../../src/db/client.ts';
import { createTestApp, signInAs } from '../helpers/app.ts';
import { createPersonas, type Personas } from '../helpers/personas.ts';
import { insertRide } from '../helpers/records.ts';
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

let people: Personas;
let jashim: Agent;
let nusrat: Agent;
let rafiq: Agent;
let shirin: Agent;

beforeEach(async () => {
  people = await createPersonas();
  [jashim, nusrat, rafiq, shirin] = await Promise.all([
    signInAs(app, 'jashim@dhakapool.test'),
    signInAs(app, 'nusrat@dhakapool.test'),
    signInAs(app, 'rafiq@dhakapool.test'),
    signInAs(app, 'shirin@dhakapool.test'),
  ]);
  await goOnline(jashim);
});

async function bulletsPool(): Promise<{ occupiedSeats: number; status: string }> {
  return prisma.pool.findFirstOrThrow({ where: { driverId: people.jashim.id } });
}

describe('accepting requests into Bullet', () => {
  it("starts a pool with Nusrat, then adds Rafiq, and each sees they're sharing", async () => {
    const nusratsRide = await requestRide(nusrat, NUSRATS_TRIP);
    const rafiqsRide = await requestRide(rafiq, RAFIQS_TRIP);

    const first = await jashim.post(`/api/driver/requests/${nusratsRide}/accept`);
    const second = await jashim.post(`/api/driver/requests/${rafiqsRide}/accept`);

    expect(first.status).toBe(200);
    expect(first.body.pool).toMatchObject({ status: 'OPEN', occupiedSeats: 1, capacity: 3 });
    expect(second.body.pool.id).toBe(first.body.pool.id);
    expect(second.body.pool.occupiedSeats).toBe(2);
    expect(second.body.pool.members).toEqual([
      expect.objectContaining({
        passengerName: 'Nusrat',
        status: 'MATCHED',
        estimatedFarePaisa: 7500,
      }),
      expect.objectContaining({ passengerName: 'Rafiq', status: 'MATCHED', paymentMethod: 'CASH' }),
    ]);
    expect(JSON.stringify(second.body)).not.toContain('"gender"');
    const nusratsView = await nusrat.get(`/api/rides/${nusratsRide}`);
    expect(nusratsView.body.ride).toMatchObject({
      status: 'MATCHED',
      trip: { driverName: 'Jashim', isShared: true, coRiderCount: 1 },
    });
  });

  it('records the new pool and each match in the audit trail (FR-POOL-01, FR-HIST-01)', async () => {
    const nusratsRide = await requestRide(nusrat, NUSRATS_TRIP);

    await accept(jashim, nusratsRide);

    const history = await prisma.statusHistory.findMany({
      where: { actorRole: 'DRIVER', entityType: { in: ['POOL', 'RIDE_REQUEST'] } },
      orderBy: { id: 'asc' },
    });
    expect(history.map((row) => `${row.entityType} ${row.fromStatus} → ${row.toStatus}`)).toEqual([
      'POOL null → OPEN',
      'RIDE_REQUEST REQUESTED → MATCHED',
    ]);
  });
});

describe("Bullet's seats can never be exceeded (TC-01, BR-01)", () => {
  it('refuses Shirin when all 3 seats are taken, and changes nothing', async () => {
    await accept(jashim, await requestRide(nusrat, { ...NUSRATS_TRIP, seats: 2 }));
    await accept(jashim, await requestRide(rafiq, RAFIQS_TRIP));
    const shirinsRide = await requestRide(shirin, SHIRINS_TRIP);

    const response = await jashim.post(`/api/driver/requests/${shirinsRide}/accept`);

    expect(response.status).toBe(409);
    expect(response.body.error).toMatchObject({
      code: 'CAPACITY_EXCEEDED',
      message: 'Bullet has only 0 free seats.',
    });
    expect((await bulletsPool()).occupiedSeats).toBe(3);
    expect(await prisma.poolMember.count()).toBe(2);
    const ride = await prisma.rideRequest.findUniqueOrThrow({ where: { id: shirinsRide } });
    expect(ride.status).toBe('REQUESTED');
  });

  it('refuses a 2-seat request when only 1 seat is free', async () => {
    await accept(jashim, await requestRide(nusrat, { ...NUSRATS_TRIP, seats: 2 }));
    // Two seats to Tejgaon cost ৳210.00, more than Shirin's ৳200.00 in TeslaPay, so she pays cash.
    const shirinsRide = await requestRide(shirin, {
      ...SHIRINS_TRIP,
      seats: 2,
      paymentMethod: 'CASH',
    });

    const response = await jashim.post(`/api/driver/requests/${shirinsRide}/accept`);

    expect(response.status).toBe(409);
    expect(response.body.error.message).toBe('Bullet has only 1 free seat.');
    expect((await bulletsPool()).occupiedSeats).toBe(2);
  });
});

describe('the matching rule is checked again at accept time (FR-POOL-03)', () => {
  it('refuses a rider to Uttara in a pool going to Mohakhali (TC-20)', async () => {
    await accept(jashim, await requestRide(nusrat, NUSRATS_TRIP));
    const shirinsRide = await requestRide(shirin, { ...SHIRINS_TRIP, destinationZoneCode: 'UTR' });

    const response = await jashim.post(`/api/driver/requests/${shirinsRide}/accept`);

    expect(response.status).toBe(422);
    expect(response.body.error).toMatchObject({
      code: 'NOT_COMPATIBLE',
      details: { reason: 'DESTINATION_NOT_ADJACENT' },
    });
  });

  it('keeps a private pool private: Rafiq cannot join Nusrat when she rides alone (TC-19)', async () => {
    await accept(jashim, await requestRide(nusrat, { ...NUSRATS_TRIP, poolOptIn: false }));
    const rafiqsRide = await requestRide(rafiq, RAFIQS_TRIP);

    const response = await jashim.post(`/api/driver/requests/${rafiqsRide}/accept`);

    expect(response.status).toBe(422);
    expect(response.body.error.details.reason).toBe('NOT_OPTED_IN');
    expect(await prisma.pool.count({ where: { driverId: people.jashim.id } })).toBe(1);
  });

  it('lets nobody join once Jashim has arrived at the pickup (TC-21, FR-POOL-05)', async () => {
    await accept(jashim, await requestRide(nusrat, NUSRATS_TRIP));
    await prisma.pool.updateMany({ data: { status: 'DRIVER_ARRIVED' } });
    const rafiqsRide = await requestRide(rafiq, RAFIQS_TRIP);

    const response = await jashim.post(`/api/driver/requests/${rafiqsRide}/accept`);

    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe('POOL_NOT_OPEN');
  });

  it('refuses a request waiting in another zone for a new pool', async () => {
    await goOnline(jashim, 'GL1');
    const nusratsRide = await requestRide(nusrat, NUSRATS_TRIP);

    const response = await jashim.post(`/api/driver/requests/${nusratsRide}/accept`);

    expect(response.status).toBe(422);
    expect(response.body.error.details.reason).toBe('DIFFERENT_PICKUP');
  });
});

describe('requests that cannot be accepted', () => {
  it("refuses Shirin's request once its 15 minutes are up, even before the sweep (TC-24)", async () => {
    const shirinsRide = await insertRide(people.shirin.id, {
      destinationZoneCode: 'TEJ',
      expiresAt: new Date(Date.now() - 60_000),
    });

    const response = await jashim.post(`/api/driver/requests/${shirinsRide}/accept`);
    const shirinsView = await shirin.get(`/api/rides/${shirinsRide}`);

    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe('INVALID_STATE_TRANSITION');
    expect(shirinsView.body.ride.status).toBe('EXPIRED');
    expect(await prisma.pool.count()).toBe(0);
  });

  it('refuses Jashim while he is offline (FR-DRV-04)', async () => {
    const nusratsRide = await requestRide(nusrat, NUSRATS_TRIP);
    await jashim.put('/api/driver/availability').send({ availability: 'OFFLINE' });

    const response = await jashim.post(`/api/driver/requests/${nusratsRide}/accept`);

    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe('DRIVER_OFFLINE');
  });

  it('refuses Kamal a request Jashim has already accepted', async () => {
    const kamal = await signInAs(app, 'kamal@dhakapool.test');
    await goOnline(kamal);
    const nusratsRide = await requestRide(nusrat, NUSRATS_TRIP);
    await accept(jashim, nusratsRide);

    const response = await kamal.post(`/api/driver/requests/${nusratsRide}/accept`);

    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe('INVALID_STATE_TRANSITION');
    expect(await prisma.pool.count({ where: { driverId: people.kamal.id } })).toBe(0);
  });

  it('answers 404 for a request that does not exist, and 403 for a passenger', async () => {
    const missing = await jashim.post('/api/driver/requests/not-a-ride/accept');
    const byPassenger = await nusrat.post(`/api/driver/requests/${people.nusrat.id}/accept`);

    expect(missing.status).toBe(404);
    expect(byPassenger.status).toBe(403);
  });
});
