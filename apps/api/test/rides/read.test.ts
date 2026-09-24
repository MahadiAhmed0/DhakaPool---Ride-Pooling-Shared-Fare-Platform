// Reading rides: the current ride and history (TC-39; FR-PAX-06, FR-PAX-09, FR-PAX-10), privacy
// between co-riders (A-09, A-20, TC-50 part 4) and expiry on read (TC-24, NFR-REL-04).
import { beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '../../src/db/client.ts';
import { sweepOverdueRequests } from '../../src/jobs/expire-requests.ts';
import { createTestApp, signInAs } from '../helpers/app.ts';
import { createPersonas, type Personas } from '../helpers/personas.ts';
import { insertPool, insertPoolMember, insertRide } from '../helpers/records.ts';

const app = createTestApp();
const MINUTE_MS = 60 * 1000;

let people: Personas;

beforeEach(async () => {
  people = await createPersonas();
});

function minutesAgo(minutes: number): Date {
  return new Date(Date.now() - minutes * MINUTE_MS);
}

describe('ride history (TC-39)', () => {
  it("lists only Nusrat's own past rides, newest first", async () => {
    const older = await insertRide(people.nusrat.id, {
      status: 'COMPLETED',
      createdAt: minutesAgo(90),
    });
    const newer = await insertRide(people.nusrat.id, {
      status: 'CANCELLED',
      createdAt: minutesAgo(30),
    });
    await insertRide(people.rafiq.id, { status: 'COMPLETED', destinationZoneCode: 'GL1' });
    const nusrat = await signInAs(app, 'nusrat@dhakapool.test');

    const response = await nusrat.get('/api/rides?scope=history');

    expect(response.status).toBe(200);
    expect(response.body.rides.map((ride: { id: string }) => ride.id)).toEqual([newer, older]);
    expect(response.body.nextCursor).toBeNull();
  });

  it('pages through the history with a cursor', async () => {
    const older = await insertRide(people.nusrat.id, {
      status: 'COMPLETED',
      createdAt: minutesAgo(90),
    });
    const newer = await insertRide(people.nusrat.id, {
      status: 'COMPLETED',
      createdAt: minutesAgo(30),
    });
    const nusrat = await signInAs(app, 'nusrat@dhakapool.test');

    const firstPage = await nusrat.get('/api/rides?scope=history&limit=1');
    const secondPage = await nusrat.get(
      `/api/rides?scope=history&limit=1&cursor=${firstPage.body.nextCursor}`,
    );

    expect(firstPage.body.rides[0].id).toBe(newer);
    expect(firstPage.body.nextCursor).toBe(newer);
    expect(secondPage.body.rides[0].id).toBe(older);
    expect(secondPage.body.nextCursor).toBeNull();
  });

  it('shows an empty history for Shirin, who has never ridden', async () => {
    const shirin = await signInAs(app, 'shirin@dhakapool.test');

    const response = await shirin.get('/api/rides?scope=history');

    expect(response.body).toEqual({ rides: [], nextCursor: null });
  });

  it('rejects an unknown scope with 400', async () => {
    const nusrat = await signInAs(app, 'nusrat@dhakapool.test');

    const response = await nusrat.get('/api/rides?scope=everything');

    expect(response.status).toBe(400);
  });
});

describe('one ride in detail', () => {
  it('shows Nusrat her current ride from the active list and in detail with its timeline', async () => {
    const nusrat = await signInAs(app, 'nusrat@dhakapool.test');
    const created = await nusrat.post('/api/rides').send({
      pickupZoneCode: 'BAN',
      destinationZoneCode: 'MHK',
      seats: 1,
      paymentMethod: 'TESLAPAY',
    });

    const active = await nusrat.get('/api/rides?scope=active');
    const detail = await nusrat.get(`/api/rides/${created.body.ride.id}`);

    expect(active.body.rides).toEqual([expect.objectContaining({ id: created.body.ride.id })]);
    expect(detail.status).toBe(200);
    expect(detail.body.ride.timeline).toHaveLength(1);
  });

  it("answers 404 when Rafiq looks at Nusrat's ride, exactly as for a ride that does not exist", async () => {
    const nusratsRide = await insertRide(people.nusrat.id);
    const rafiq = await signInAs(app, 'rafiq@dhakapool.test');

    const someoneElses = await rafiq.get(`/api/rides/${nusratsRide}`);
    const notAnId = await rafiq.get('/api/rides/not-a-ride');

    expect(someoneElses.status).toBe(404);
    expect(notAnId.status).toBe(404);
    expect(someoneElses.body.error.message).toBe(notAnId.body.error.message);
  });
});

describe('sharing Bullet with a co-rider (A-09, A-20)', () => {
  it('tells Nusrat she shares Bullet with 1 co-rider, and nothing about Rafiq', async () => {
    const nusratsRide = await insertRide(people.nusrat.id, { status: 'MATCHED' });
    const rafiqsRide = await insertRide(people.rafiq.id, {
      status: 'MATCHED',
      destinationZoneCode: 'GL1',
      paymentMethod: 'CASH',
    });
    const pool = await insertPool(people.jashim.id, people.jashim.vehicleId);
    await insertPoolMember(pool, nusratsRide);
    await insertPoolMember(pool, rafiqsRide);
    const nusrat = await signInAs(app, 'nusrat@dhakapool.test');

    const response = await nusrat.get(`/api/rides/${nusratsRide}`);

    expect(response.body.ride.trip).toEqual({
      driverName: 'Jashim',
      vehicle: { name: 'Bullet', plate: 'DHAKA-TESLA-11' },
      isShared: true,
      coRiderCount: 1,
      genderRestriction: 'NONE',
    });
    const everythingNusratReceived = JSON.stringify(response.body);
    expect(everythingNusratReceived).not.toContain('Rafiq');
    expect(everythingNusratReceived).not.toContain(rafiqsRide);
    expect(everythingNusratReceived).not.toContain('GL1');
    expect(everythingNusratReceived).not.toContain('"gender"');
  });
});

describe('expiry (TC-24, NFR-REL-04)', () => {
  it("shows Shirin's 16-minute-old request as EXPIRED even before the sweep has run", async () => {
    const shirinsRide = await insertRide(people.shirin.id, {
      requestedAt: minutesAgo(16),
      expiresAt: minutesAgo(1),
    });
    const shirin = await signInAs(app, 'shirin@dhakapool.test');

    const response = await shirin.get(`/api/rides/${shirinsRide}`);

    expect(response.body.ride.status).toBe('EXPIRED');
    expect(response.body.ride.timeline.at(-1)).toMatchObject({
      fromStatus: 'REQUESTED',
      toStatus: 'EXPIRED',
      actorRole: 'SYSTEM',
      reason: 'EXPIRED',
    });
  });

  it('lets Shirin request again straight away when her old request has run out', async () => {
    await insertRide(people.shirin.id, { requestedAt: minutesAgo(16), expiresAt: minutesAgo(1) });
    const shirin = await signInAs(app, 'shirin@dhakapool.test');

    const response = await shirin.post('/api/rides').send({
      pickupZoneCode: 'BAN',
      destinationZoneCode: 'TEJ',
      seats: 1,
      paymentMethod: 'TESLAPAY',
    });

    expect(response.status).toBe(201);
  });

  it("keeps Rafiq's old request expired even when his new request is refused", async () => {
    const oldRide = await insertRide(people.rafiq.id, { expiresAt: minutesAgo(1) });
    const rafiq = await signInAs(app, 'rafiq@dhakapool.test');

    const refused = await rafiq.post('/api/rides').send({
      pickupZoneCode: 'BAN',
      destinationZoneCode: 'GL1',
      seats: 1,
      paymentMethod: 'TESLAPAY', // Rafiq has ৳0.00, so this is refused with 422
    });

    expect(refused.status).toBe(422);
    const ride = await prisma.rideRequest.findUniqueOrThrow({ where: { id: oldRide } });
    expect(ride.status).toBe('EXPIRED');
  });

  it('has the sweep expire only requests whose time is up, with a SYSTEM audit entry', async () => {
    const overdue = await insertRide(people.shirin.id, { expiresAt: minutesAgo(1) });
    const fresh = await insertRide(people.nusrat.id);

    const expiredCount = await sweepOverdueRequests();

    expect(expiredCount).toBe(1);
    const rides = await prisma.rideRequest.findMany({ select: { id: true, status: true } });
    expect(rides).toEqual(
      expect.arrayContaining([
        { id: overdue, status: 'EXPIRED' },
        { id: fresh, status: 'REQUESTED' },
      ]),
    );
    expect(await prisma.statusHistory.count({ where: { actorRole: 'SYSTEM' } })).toBe(1);
  });
});
