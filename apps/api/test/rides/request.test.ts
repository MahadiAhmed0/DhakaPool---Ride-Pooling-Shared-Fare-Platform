// Requesting a ride (RT-01; FR-PAX-03…05, FR-PAX-11, FR-FARE-02) with its checks: one active ride
// per passenger (TC-18), input validation (TC-33) and the same-gender option (TC-50).
import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '../../src/db/client.ts';
import { createTestApp, signInAs } from '../helpers/app.ts';
import { createPersonas, TEST_PASSWORD } from '../helpers/personas.ts';

const app = createTestApp();
const FIFTEEN_MINUTES_MS = 15 * 60 * 1000;

// Nusrat's usual trip: Banani → Mohakhali, 1 seat, shared, paid with TeslaPay.
const nusratsTrip = {
  pickupZoneCode: 'BAN',
  destinationZoneCode: 'MHK',
  seats: 1,
  paymentMethod: 'TESLAPAY',
};

beforeEach(async () => {
  await createPersonas();
});

describe('requesting a ride', () => {
  it("creates Nusrat's request with the solo and pooled estimate and an audit entry", async () => {
    const nusrat = await signInAs(app, 'nusrat@dhakapool.test');

    const response = await nusrat.post('/api/rides').send(nusratsTrip);

    expect(response.status).toBe(201);
    const { ride } = response.body;
    expect(ride).toMatchObject({
      status: 'REQUESTED',
      pickupZoneCode: 'BAN',
      destinationZoneCode: 'MHK',
      seats: 1,
      poolOptIn: true,
      sameGenderOnly: false,
      paymentMethod: 'TESLAPAY',
      trip: null,
    });
    expect(ride.fare.estimate.solo.totalPaisa).toBe(7500);
    expect(ride.fare.estimate.pooled.totalPaisa).toBe(6600);
    expect(ride.fare.locked).toBeNull();
    expect(Date.parse(ride.expiresAt) - Date.parse(ride.requestedAt)).toBe(FIFTEEN_MINUTES_MS);
    expect(ride.timeline).toEqual([
      expect.objectContaining({ fromStatus: null, toStatus: 'REQUESTED', actorRole: 'PASSENGER' }),
    ]);
    const stored = await prisma.rideRequest.findUniqueOrThrow({ where: { id: ride.id } });
    expect(stored.estimatedFarePaisa).toBe(7500n);
  });

  it('shows no pooled estimate when Nusrat switches sharing off', async () => {
    const nusrat = await signInAs(app, 'nusrat@dhakapool.test');

    const response = await nusrat.post('/api/rides').send({ ...nusratsTrip, poolOptIn: false });

    expect(response.status).toBe(201);
    expect(response.body.ride.fare.estimate.pooled).toBeNull();
  });

  it('is only for passengers, so Jashim gets 403', async () => {
    const jashim = await signInAs(app, 'jashim@dhakapool.test');

    const response = await jashim.post('/api/rides').send(nusratsTrip);

    expect(response.status).toBe(403);
  });
});

describe('one active ride per passenger (TC-18, BR-05)', () => {
  it('refuses a second request and points to the ride Nusrat already has', async () => {
    const nusrat = await signInAs(app, 'nusrat@dhakapool.test');
    const first = await nusrat.post('/api/rides').send(nusratsTrip);

    const second = await nusrat
      .post('/api/rides')
      .send({ ...nusratsTrip, destinationZoneCode: 'GL1' });

    expect(second.status).toBe(409);
    expect(second.body.error).toMatchObject({
      code: 'ACTIVE_REQUEST_EXISTS',
      details: { rideId: first.body.ride.id },
    });
  });

  it('creates exactly one ride when Nusrat double-submits the form', async () => {
    const nusrat = await signInAs(app, 'nusrat@dhakapool.test');

    const responses = await Promise.all([
      nusrat.post('/api/rides').send(nusratsTrip),
      nusrat.post('/api/rides').send(nusratsTrip),
      nusrat.post('/api/rides').send(nusratsTrip),
    ]);

    const statuses = responses.map((response) => response.status).sort();
    expect(statuses).toEqual([201, 409, 409]);
    expect(await prisma.rideRequest.count()).toBe(1);
  });
});

describe('paying with TeslaPay (FR-PAX-05)', () => {
  it('refuses Rafiq with ৳0.00 in TeslaPay, but lets him pay in cash', async () => {
    const rafiq = await signInAs(app, 'rafiq@dhakapool.test');
    const rafiqsTrip = { ...nusratsTrip, destinationZoneCode: 'GL1' };

    const withTeslaPay = await rafiq.post('/api/rides').send(rafiqsTrip);
    const withCash = await rafiq.post('/api/rides').send({ ...rafiqsTrip, paymentMethod: 'CASH' });

    expect(withTeslaPay.status).toBe(422);
    expect(withTeslaPay.body.error).toMatchObject({
      code: 'INSUFFICIENT_BALANCE',
      details: { balancePaisa: 0, requiredPaisa: 6750 },
    });
    expect(withCash.status).toBe(201);
  });
});

describe('what a ride request refuses (TC-33)', () => {
  it.each([
    ['the same pickup and destination', { destinationZoneCode: 'BAN' }, 'destinationZoneCode'],
    ['zero seats', { seats: 0 }, 'seats'],
    ['more seats than the largest Tesla (3)', { seats: 4 }, 'seats'],
    ['an unknown zone', { pickupZoneCode: 'XYZ' }, 'pickupZoneCode'],
    ['an unknown payment method', { paymentMethod: 'BKASH' }, 'paymentMethod'],
    ['an unexpected field', { driverId: 'any' }, 'driverId'],
  ])('rejects %s with 400 and names the field', async (_case, change, field) => {
    const nusrat = await signInAs(app, 'nusrat@dhakapool.test');

    const response = await nusrat.post('/api/rides').send({ ...nusratsTrip, ...change });

    expect(response.status).toBe(400);
    expect(response.body.error.details.fields).toEqual([expect.objectContaining({ path: field })]);
    expect(await prisma.rideRequest.count()).toBe(0);
  });
});

describe('same-gender rides (TC-50, FR-PAX-11)', () => {
  it('lets Shirin, who declared FEMALE, ask for a same-gender ride', async () => {
    const shirin = await signInAs(app, 'shirin@dhakapool.test');

    const response = await shirin
      .post('/api/rides')
      .send({ ...nusratsTrip, destinationZoneCode: 'TEJ', sameGenderOnly: true });

    expect(response.status).toBe(201);
    expect(response.body.ride.sameGenderOnly).toBe(true);
  });

  it('refuses the option to a passenger who preferred not to say their gender', async () => {
    const tania = request.agent(app);
    await tania.post('/api/auth/signup').send({
      fullName: 'Tania',
      email: 'tania@dhakapool.test',
      phone: '+8801711000099',
      password: TEST_PASSWORD,
    });

    const response = await tania
      .post('/api/rides')
      .send({ ...nusratsTrip, paymentMethod: 'CASH', sameGenderOnly: true });

    expect(response.status).toBe(400);
    expect(response.body.error.details.fields).toEqual([
      expect.objectContaining({ path: 'sameGenderOnly' }),
    ]);
  });

  it('refuses the option when Shirin switches sharing off', async () => {
    const shirin = await signInAs(app, 'shirin@dhakapool.test');

    const response = await shirin
      .post('/api/rides')
      .send({ ...nusratsTrip, poolOptIn: false, sameGenderOnly: true });

    expect(response.status).toBe(400);
    expect(response.body.error.details.fields).toEqual([
      expect.objectContaining({ path: 'sameGenderOnly' }),
    ]);
  });
});
