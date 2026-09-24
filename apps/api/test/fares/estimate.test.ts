// Fare estimates through the API (TC-35; FR-PAX-02, FR-FARE-02, FR-FARE-04) with input checks (NFR-SEC-04).
import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { createTestApp, signInAs } from '../helpers/app.ts';
import { createPersonas } from '../helpers/personas.ts';

const app = createTestApp();

type Agent = Awaited<ReturnType<typeof signInAs>>;
let nusrat: Agent;

beforeEach(async () => {
  await createPersonas();
  nusrat = await signInAs(app, 'nusrat@dhakapool.test');
});

describe('estimating a fare', () => {
  it('shows Nusrat ৳75.00 alone and ৳66.00 shared, Banani → Mohakhali, with the breakdown', async () => {
    const response = await nusrat
      .post('/api/fares/estimate')
      .send({ pickupZoneCode: 'BAN', destinationZoneCode: 'MHK', seats: 1 });

    expect(response.status).toBe(200);
    expect(response.body.estimate).toEqual({
      pickupZoneCode: 'BAN',
      destinationZoneCode: 'MHK',
      distanceM: 3000,
      rates: { basePaisa: 3000, perKmPaisa: 1500, poolDiscountBps: 2000 },
      solo: {
        pooled: false,
        seats: 1,
        basePaisa: 3000,
        distanceChargePaisa: 4500,
        discountPaisa: 0,
        farePerSeatPaisa: 7500,
        totalPaisa: 7500,
      },
      pooled: {
        pooled: true,
        seats: 1,
        basePaisa: 3000,
        distanceChargePaisa: 4500,
        discountPaisa: 900,
        farePerSeatPaisa: 6600,
        totalPaisa: 6600,
      },
    });
  });

  it('shows Shirin ৳105.00 alone and ৳90.00 shared, Banani → Tejgaon (TC-12)', async () => {
    const shirin = await signInAs(app, 'shirin@dhakapool.test');

    const response = await shirin
      .post('/api/fares/estimate')
      .send({ pickupZoneCode: 'BAN', destinationZoneCode: 'TEJ', seats: 1 });

    expect(response.body.estimate.distanceM).toBe(5000);
    expect(response.body.estimate.solo.totalPaisa).toBe(10500);
    expect(response.body.estimate.pooled.totalPaisa).toBe(9000);
  });

  it('multiplies by the seats when Nusrat books two (TC-10)', async () => {
    const response = await nusrat
      .post('/api/fares/estimate')
      .send({ pickupZoneCode: 'BAN', destinationZoneCode: 'MHK', seats: 2 });

    expect(response.body.estimate.solo.totalPaisa).toBe(15000);
  });

  it('accepts zone codes written in lower case', async () => {
    const response = await nusrat
      .post('/api/fares/estimate')
      .send({ pickupZoneCode: 'ban', destinationZoneCode: ' gl1 ', seats: 1 });

    expect(response.status).toBe(200);
    expect(response.body.estimate.solo.totalPaisa).toBe(6750);
  });
});

describe('what the estimate refuses', () => {
  it.each([
    ['the same pickup and destination', { destinationZoneCode: 'BAN' }, 'destinationZoneCode'],
    ['an unknown zone', { destinationZoneCode: 'XYZ' }, 'destinationZoneCode'],
    ['zero seats', { seats: 0 }, 'seats'],
    ['more seats than any Tesla has', { seats: 7 }, 'seats'],
    ['half a seat', { seats: 1.5 }, 'seats'],
    ['an unexpected field', { promoCode: 'FREE' }, 'promoCode'],
  ])('rejects %s with 400 and names the field', async (_case, change, field) => {
    const trip = { pickupZoneCode: 'BAN', destinationZoneCode: 'MHK', seats: 1, ...change };

    const response = await nusrat.post('/api/fares/estimate').send(trip);

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
    expect(response.body.error.details.fields).toEqual([expect.objectContaining({ path: field })]);
  });

  it('is only for passengers, so Jashim gets 403', async () => {
    const jashim = await signInAs(app, 'jashim@dhakapool.test');

    const response = await jashim
      .post('/api/fares/estimate')
      .send({ pickupZoneCode: 'BAN', destinationZoneCode: 'MHK', seats: 1 });

    expect(response.status).toBe(403);
  });

  it('asks visitors who are not signed in to sign in first', async () => {
    const response = await request(app)
      .post('/api/fares/estimate')
      .send({ pickupZoneCode: 'BAN', destinationZoneCode: 'MHK', seats: 1 });

    expect(response.status).toBe(401);
  });
});
