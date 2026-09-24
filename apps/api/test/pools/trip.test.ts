// Arriving and starting a trip (FR-DRV-07, FR-DRV-08): the fare is fixed at the start and the pool
// discount applies only when the Tesla really is shared (TC-09, BR-12), and a fixed fare never
// changes afterwards (TC-11, FR-FARE-03).
import { beforeEach, describe, expect, it } from 'vitest';
import { CURRENT_FARE_RATES } from '../../src/config/rules.ts';
import { prisma } from '../../src/db/client.ts';
import { createTestApp, signInAs } from '../helpers/app.ts';
import { createPersonas } from '../helpers/personas.ts';
import { accept, goOnline, NUSRATS_TRIP, RAFIQS_TRIP, requestRide } from '../helpers/trips.ts';

const app = createTestApp();
type Agent = Awaited<ReturnType<typeof signInAs>>;

let jashim: Agent;
let nusrat: Agent;
let rafiq: Agent;
let nusratsRide: string;
let rafiqsRide: string;
let poolId: string;

// Nusrat and Rafiq are both matched into Bullet's pool.
beforeEach(async () => {
  await createPersonas();
  [jashim, nusrat, rafiq] = await Promise.all([
    signInAs(app, 'jashim@dhakapool.test'),
    signInAs(app, 'nusrat@dhakapool.test'),
    signInAs(app, 'rafiq@dhakapool.test'),
  ]);
  await goOnline(jashim);
  nusratsRide = await requestRide(nusrat, NUSRATS_TRIP);
  rafiqsRide = await requestRide(rafiq, RAFIQS_TRIP);
  await accept(jashim, nusratsRide);
  await accept(jashim, rafiqsRide);
  poolId = (await prisma.pool.findFirstOrThrow()).id;
});

async function rideFare(rideId: string): Promise<{ totalPaisa: bigint; pooled: boolean }> {
  return prisma.fare.findFirstOrThrow({ where: { rideRequestId: rideId, type: 'RIDE' } });
}

describe('arriving at the pickup (FR-DRV-07)', () => {
  it('moves the trip and both passengers to DRIVER_ARRIVED', async () => {
    const response = await jashim.post(`/api/pools/${poolId}/arrive`);

    expect(response.status).toBe(200);
    expect(response.body.pool.status).toBe('DRIVER_ARRIVED');
    expect(response.body.pool.members.map((member: { status: string }) => member.status)).toEqual([
      'DRIVER_ARRIVED',
      'DRIVER_ARRIVED',
    ]);
    const nusratsView = await nusrat.get(`/api/rides/${nusratsRide}`);
    expect(nusratsView.body.ride.status).toBe('DRIVER_ARRIVED');
  });

  it('refuses to arrive twice (TC-02)', async () => {
    await jashim.post(`/api/pools/${poolId}/arrive`);

    const response = await jashim.post(`/api/pools/${poolId}/arrive`);

    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe('INVALID_STATE_TRANSITION');
  });
});

describe('starting the trip fixes the fares (TC-09, BR-12)', () => {
  it('charges Nusrat 6600 and Rafiq 6000 because they share Bullet', async () => {
    await jashim.post(`/api/pools/${poolId}/arrive`);

    const response = await jashim.post(`/api/pools/${poolId}/start`);

    expect(response.status).toBe(200);
    expect(response.body.pool.status).toBe('STARTED');
    expect(response.body.pool.members).toEqual([
      expect.objectContaining({
        passengerName: 'Nusrat',
        status: 'STARTED',
        lockedFarePaisa: 6600,
      }),
      expect.objectContaining({ passengerName: 'Rafiq', status: 'STARTED', lockedFarePaisa: 6000 }),
    ]);
    expect(await rideFare(nusratsRide)).toMatchObject({
      totalPaisa: 6600n,
      pooled: true,
      basePaisa: 3000,
      distanceM: 3000,
      perKmPaisa: 1500,
      discountBps: 2000,
      discountPaisa: 900n,
    });
    const nusratsView = await nusrat.get(`/api/rides/${nusratsRide}`);
    expect(nusratsView.body.ride.fare.locked).toMatchObject({ totalPaisa: 6600, pooled: true });
  });

  it('charges Nusrat the solo 7500 when Rafiq cancelled before the start', async () => {
    await rafiq.post(`/api/rides/${rafiqsRide}/cancel`);
    await jashim.post(`/api/pools/${poolId}/arrive`);

    await jashim.post(`/api/pools/${poolId}/start`);

    expect(await rideFare(nusratsRide)).toMatchObject({ totalPaisa: 7500n, pooled: false });
    expect(await prisma.fare.count({ where: { rideRequestId: rafiqsRide } })).toBe(0);
  });

  it('refuses to start before arriving (TC-02), and changes nothing', async () => {
    const response = await jashim.post(`/api/pools/${poolId}/start`);

    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe('INVALID_STATE_TRANSITION');
    expect(await prisma.fare.count()).toBe(0);
    expect((await prisma.pool.findFirstOrThrow()).status).toBe('OPEN');
  });
});

describe('a fixed fare never changes (TC-11, FR-FARE-03)', () => {
  it('keeps Nusrat at 6600 after the price per km goes up to ৳20', async () => {
    await jashim.post(`/api/pools/${poolId}/arrive`);
    await jashim.post(`/api/pools/${poolId}/start`);
    const originalPerKm = CURRENT_FARE_RATES.perKmPaisa;

    CURRENT_FARE_RATES.perKmPaisa = 2000;
    try {
      const response = await nusrat.get(`/api/rides/${nusratsRide}`);

      expect(response.body.ride.fare.locked.totalPaisa).toBe(6600);
      expect(response.body.ride.fare.estimate.solo.totalPaisa).toBe(9000); // today's price
      expect(await rideFare(nusratsRide)).toMatchObject({ totalPaisa: 6600n, perKmPaisa: 1500 });
    } finally {
      CURRENT_FARE_RATES.perKmPaisa = originalPerKm;
    }
  });
});
