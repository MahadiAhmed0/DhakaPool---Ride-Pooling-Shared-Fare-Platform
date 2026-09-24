// Leaving a pool before the trip starts (FR-POOL-06, -07, -12): seats are freed (TC-16), an empty
// pool ends by itself, and the same-gender restriction is worked out again (TC-49). Also the
// same-gender rule at accept time (TC-47, TC-48) and the MATCHED part of TC-05.
import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '../../src/db/client.ts';
import { createTestApp, signInAs } from '../helpers/app.ts';
import { createPersonas, TEST_PASSWORD } from '../helpers/personas.ts';
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

async function onlyPool(): Promise<{
  status: string;
  occupiedSeats: number;
  genderRestriction: string;
  cancelReason: string | null;
}> {
  return prisma.pool.findFirstOrThrow();
}

describe('cancelling after Jashim has accepted (TC-16, TC-05)', () => {
  it("frees Rafiq's seat when he cancels, free of charge, and ends the pool when Nusrat cancels too", async () => {
    const nusratsRide = await requestRide(nusrat, NUSRATS_TRIP);
    const rafiqsRide = await requestRide(rafiq, RAFIQS_TRIP);
    await accept(jashim, nusratsRide);
    await accept(jashim, rafiqsRide);

    const rafiqCancels = await rafiq.post(`/api/rides/${rafiqsRide}/cancel`);
    const afterRafiq = await onlyPool();
    const nusratCancels = await nusrat.post(`/api/rides/${nusratsRide}/cancel`);

    expect(rafiqCancels.status).toBe(200);
    expect(rafiqCancels.body.ride).toMatchObject({
      status: 'CANCELLED',
      trip: null,
      fare: { cancellationFeePaisa: null },
    });
    expect(afterRafiq).toMatchObject({ status: 'OPEN', occupiedSeats: 1 });
    expect(nusratCancels.status).toBe(200);
    expect(await onlyPool()).toMatchObject({
      status: 'CANCELLED',
      occupiedSeats: 0,
      cancelReason: 'ALL_MEMBERS_CANCELLED',
    });
    const poolEnd = await prisma.statusHistory.findFirstOrThrow({
      where: { entityType: 'POOL', toStatus: 'CANCELLED' },
    });
    expect(poolEnd).toMatchObject({ fromStatus: 'OPEN', actorRole: 'SYSTEM' });
  });

  it('frees Jashim to start a new trip once his only passenger has cancelled', async () => {
    const nusratsRide = await requestRide(nusrat, NUSRATS_TRIP);
    await accept(jashim, nusratsRide);
    await nusrat.post(`/api/rides/${nusratsRide}/cancel`);

    const shirinsRide = await requestRide(shirin, SHIRINS_TRIP);
    const response = await jashim.post(`/api/driver/requests/${shirinsRide}/accept`);

    expect(response.status).toBe(200);
    expect(await prisma.pool.count({ where: { status: 'OPEN' } })).toBe(1);
  });

  it('makes room for Shirin after Rafiq frees the last seat (FR-POOL-06)', async () => {
    await accept(jashim, await requestRide(nusrat, { ...NUSRATS_TRIP, seats: 2 }));
    const rafiqsRide = await requestRide(rafiq, RAFIQS_TRIP);
    await accept(jashim, rafiqsRide);
    const shirinsRide = await requestRide(shirin, SHIRINS_TRIP);

    const whileFull = await jashim.post(`/api/driver/requests/${shirinsRide}/accept`);
    await rafiq.post(`/api/rides/${rafiqsRide}/cancel`);
    const afterRafiqLeft = await jashim.post(`/api/driver/requests/${shirinsRide}/accept`);

    expect(whileFull.status).toBe(409);
    expect(afterRafiqLeft.status).toBe(200);
    expect(afterRafiqLeft.body.pool.occupiedSeats).toBe(3);
  });
});

describe('same-gender pools (BR-18)', () => {
  it('makes Bullet women-only for Shirin, refuses Rafiq and accepts Nusrat (TC-47)', async () => {
    await accept(jashim, await requestRide(shirin, { ...SHIRINS_TRIP, sameGenderOnly: true }));
    const rafiqsRide = await requestRide(rafiq, RAFIQS_TRIP);
    const nusratsRide = await requestRide(nusrat, NUSRATS_TRIP);

    const forRafiq = await jashim.post(`/api/driver/requests/${rafiqsRide}/accept`);
    const forNusrat = await jashim.post(`/api/driver/requests/${nusratsRide}/accept`);

    expect(forRafiq.status).toBe(422);
    expect(forRafiq.body.error.details.reason).toBe('GENDER_RESTRICTED');
    expect(forNusrat.status).toBe(200);
    expect(forNusrat.body.pool).toMatchObject({
      genderRestriction: 'FEMALE_ONLY',
      occupiedSeats: 2,
    });
    const nusratsView = await nusrat.get(`/api/rides/${nusratsRide}`);
    expect(nusratsView.body.ride.trip.genderRestriction).toBe('FEMALE_ONLY');
  });

  it("refuses Shirin's same-gender request once Rafiq is in the pool (TC-48)", async () => {
    await accept(jashim, await requestRide(rafiq, RAFIQS_TRIP));
    const shirinsRide = await requestRide(shirin, { ...SHIRINS_TRIP, sameGenderOnly: true });

    const response = await jashim.post(`/api/driver/requests/${shirinsRide}/accept`);

    expect(response.status).toBe(422);
    expect(response.body.error.details.reason).toBe('GENDER_RESTRICTED');
    expect((await onlyPool()).genderRestriction).toBe('NONE');
  });

  it('refuses a passenger who preferred not to say their gender in a women-only pool (TC-48)', async () => {
    await accept(jashim, await requestRide(shirin, { ...SHIRINS_TRIP, sameGenderOnly: true }));
    const tania = request.agent(app);
    await tania.post('/api/auth/signup').send({
      fullName: 'Tania',
      email: 'tania@dhakapool.test',
      phone: '+8801711000099',
      password: TEST_PASSWORD,
    });
    const taniasRide = await requestRide(tania, { ...NUSRATS_TRIP, paymentMethod: 'CASH' });

    const response = await jashim.post(`/api/driver/requests/${taniasRide}/accept`);

    expect(response.status).toBe(422);
    expect(response.body.error.details.reason).toBe('GENDER_RESTRICTED');
  });

  it('lifts the restriction when Shirin leaves, so Rafiq can join Nusrat (TC-49, FR-POOL-12)', async () => {
    const shirinsRide = await requestRide(shirin, { ...SHIRINS_TRIP, sameGenderOnly: true });
    await accept(jashim, shirinsRide);
    await accept(jashim, await requestRide(nusrat, NUSRATS_TRIP));

    await shirin.post(`/api/rides/${shirinsRide}/cancel`);
    const afterShirinLeft = await onlyPool();
    const forRafiq = await jashim.post(
      `/api/driver/requests/${await requestRide(rafiq, RAFIQS_TRIP)}/accept`,
    );

    expect(afterShirinLeft.genderRestriction).toBe('NONE');
    expect(forRafiq.status).toBe(200);
  });
});
