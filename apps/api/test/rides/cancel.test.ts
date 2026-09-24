// A passenger cancels their own ride (FR-PAX-08, BR-07): the REQUESTED and STARTED parts of TC-05,
// the ride-level part of TC-02 (a refused move changes nothing) and ownership (part of TC-04).
import { beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '../../src/db/client.ts';
import { createTestApp, signInAs } from '../helpers/app.ts';
import { createPersonas, type Personas } from '../helpers/personas.ts';
import { insertRide } from '../helpers/records.ts';

const app = createTestApp();
const MINUTE_MS = 60 * 1000;

let people: Personas;

beforeEach(async () => {
  people = await createPersonas();
});

describe('cancelling a ride nobody has accepted yet', () => {
  it("cancels Nusrat's request free of charge and records who cancelled it", async () => {
    const nusrat = await signInAs(app, 'nusrat@dhakapool.test');
    const created = await nusrat.post('/api/rides').send({
      pickupZoneCode: 'BAN',
      destinationZoneCode: 'MHK',
      seats: 1,
      paymentMethod: 'TESLAPAY',
    });

    const response = await nusrat.post(`/api/rides/${created.body.ride.id}/cancel`);

    expect(response.status).toBe(200);
    expect(response.body.ride).toMatchObject({
      status: 'CANCELLED',
      cancelReason: 'PASSENGER_CANCELLED',
      fare: { cancellationFeePaisa: null },
    });
    expect(response.body.ride.cancelledAt).not.toBeNull();
    expect(response.body.ride.timeline.at(-1)).toMatchObject({
      fromStatus: 'REQUESTED',
      toStatus: 'CANCELLED',
      actorRole: 'PASSENGER',
    });
    expect(await prisma.fare.count()).toBe(0);
  });

  it('lets Nusrat request a new ride after cancelling', async () => {
    const rideId = await insertRide(people.nusrat.id);
    const nusrat = await signInAs(app, 'nusrat@dhakapool.test');
    await nusrat.post(`/api/rides/${rideId}/cancel`);

    const response = await nusrat.post('/api/rides').send({
      pickupZoneCode: 'BAN',
      destinationZoneCode: 'GL2',
      seats: 1,
      paymentMethod: 'TESLAPAY',
    });

    expect(response.status).toBe(201);
  });
});

describe('what cannot be cancelled', () => {
  it('refuses to cancel once the trip has started, and changes nothing (TC-05, TC-02)', async () => {
    const rideId = await insertRide(people.nusrat.id, { status: 'STARTED' });
    const nusrat = await signInAs(app, 'nusrat@dhakapool.test');

    const response = await nusrat.post(`/api/rides/${rideId}/cancel`);

    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe('INVALID_STATE_TRANSITION');
    expect(response.body.error.message).toMatch(/drop you off/);
    const ride = await prisma.rideRequest.findUniqueOrThrow({ where: { id: rideId } });
    expect(ride).toMatchObject({ status: 'STARTED', cancelledAt: null });
    expect(await prisma.statusHistory.count()).toBe(0);
  });

  it.each(['COMPLETED', 'CANCELLED', 'EXPIRED'] as const)(
    'refuses to cancel a ride that is already %s',
    async (status) => {
      const rideId = await insertRide(people.nusrat.id, { status });
      const nusrat = await signInAs(app, 'nusrat@dhakapool.test');

      const response = await nusrat.post(`/api/rides/${rideId}/cancel`);

      expect(response.status).toBe(409);
      expect(response.body.error.code).toBe('INVALID_STATE_TRANSITION');
    },
  );

  it('treats a request whose time ran out as expired, even before the sweep', async () => {
    const rideId = await insertRide(people.shirin.id, {
      expiresAt: new Date(Date.now() - MINUTE_MS),
    });
    const shirin = await signInAs(app, 'shirin@dhakapool.test');

    const response = await shirin.post(`/api/rides/${rideId}/cancel`);

    expect(response.status).toBe(409);
    const ride = await prisma.rideRequest.findUniqueOrThrow({ where: { id: rideId } });
    expect(ride.status).toBe('EXPIRED');
  });

  it("does not let Rafiq cancel Nusrat's ride, and does not reveal it exists (TC-04)", async () => {
    const rideId = await insertRide(people.nusrat.id);
    const rafiq = await signInAs(app, 'rafiq@dhakapool.test');

    const response = await rafiq.post(`/api/rides/${rideId}/cancel`);

    expect(response.status).toBe(404);
    const ride = await prisma.rideRequest.findUniqueOrThrow({ where: { id: rideId } });
    expect(ride.status).toBe('REQUESTED');
  });
});
