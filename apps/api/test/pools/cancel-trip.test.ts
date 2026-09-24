// Ending things before the trip starts: the driver cancels the trip (TC-15, FR-DRV-11), marks a
// no-show (TC-43, FR-DRV-12), or a passenger cancels after the driver arrived and pays the fee
// (TC-05, scenario E3). Also another driver's trip (TC-04) and refused moves (TC-02).
import { beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '../../src/db/client.ts';
import { createTestApp, signInAs } from '../helpers/app.ts';
import { createPersonas } from '../helpers/personas.ts';
import { accept, goOnline, NUSRATS_TRIP, RAFIQS_TRIP, requestRide } from '../helpers/trips.ts';

const app = createTestApp();
const MINUTE_MS = 60 * 1000;
type Agent = Awaited<ReturnType<typeof signInAs>>;

let jashim: Agent;
let nusrat: Agent;
let rafiq: Agent;
let nusratsRide: string;
let rafiqsRide: string;
let poolId: string;

// Nusrat and Rafiq are matched into Bullet's pool; the trip has not started.
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

async function arrivedMinutesAgo(minutes: number): Promise<void> {
  await jashim.post(`/api/pools/${poolId}/arrive`);
  await prisma.pool.update({
    where: { id: poolId },
    data: { arrivedAt: new Date(Date.now() - minutes * MINUTE_MS) },
  });
}

async function statusOf(rideId: string): Promise<string> {
  return (await prisma.rideRequest.findUniqueOrThrow({ where: { id: rideId } })).status;
}

describe('Jashim cancels the trip (TC-15, FR-DRV-11)', () => {
  it('sends Nusrat and Rafiq back to the queue, free of charge', async () => {
    const response = await jashim.post(`/api/pools/${poolId}/cancel`);

    expect(response.status).toBe(200);
    expect(response.body.pool).toMatchObject({
      status: 'CANCELLED',
      occupiedSeats: 0,
      members: [],
    });
    expect(await statusOf(nusratsRide)).toBe('REQUESTED');
    expect(await statusOf(rafiqsRide)).toBe('REQUESTED');
    expect(await prisma.fare.count()).toBe(0);
    const nusratsView = await nusrat.get(`/api/rides/${nusratsRide}`);
    expect(nusratsView.body.ride.trip).toBeNull();
    expect(Date.parse(nusratsView.body.ride.expiresAt)).toBeGreaterThan(Date.now());
  });

  it('lets Kamal pick Nusrat up afterwards', async () => {
    const kamal = await signInAs(app, 'kamal@dhakapool.test');
    await goOnline(kamal);
    await jashim.post(`/api/pools/${poolId}/cancel`);

    const response = await kamal.post(`/api/driver/requests/${nusratsRide}/accept`);

    expect(response.status).toBe(200);
  });

  it('refuses once the trip has started (TC-15)', async () => {
    await jashim.post(`/api/pools/${poolId}/arrive`);
    await jashim.post(`/api/pools/${poolId}/start`);

    const response = await jashim.post(`/api/pools/${poolId}/cancel`);

    expect(response.status).toBe(409);
    expect(await statusOf(nusratsRide)).toBe('STARTED');
  });
});

describe('what cancelling would cost, shown before the passenger decides (FR-PAX-08)', () => {
  it('tells Rafiq cancelling is free while matched, costs ৳20.00 after arrival, and is closed once started', async () => {
    const whileMatched = await rafiq.get(`/api/rides/${rafiqsRide}`);
    await jashim.post(`/api/pools/${poolId}/arrive`);
    const afterArrival = await rafiq.get(`/api/rides/${rafiqsRide}`);
    await jashim.post(`/api/pools/${poolId}/start`);
    const afterStart = await rafiq.get(`/api/rides/${rafiqsRide}`);

    expect(whileMatched.body.ride.cancellation).toEqual({ isAllowed: true, feePaisa: 0 });
    expect(afterArrival.body.ride.cancellation).toEqual({ isAllowed: true, feePaisa: 2000 });
    expect(afterStart.body.ride.cancellation).toEqual({ isAllowed: false, feePaisa: 0 });
  });
});

describe('a passenger cancelling after Jashim arrived (TC-05, scenario E3)', () => {
  it('charges Rafiq the ৳20.00 fee, and Nusrat then rides alone at the solo fare', async () => {
    await jashim.post(`/api/pools/${poolId}/arrive`);

    const response = await rafiq.post(`/api/rides/${rafiqsRide}/cancel`);
    await jashim.post(`/api/pools/${poolId}/start`);

    expect(response.status).toBe(200);
    expect(response.body.ride).toMatchObject({
      status: 'CANCELLED',
      fare: { cancellationFeePaisa: 2000 },
    });
    const nusratsFare = await prisma.fare.findFirstOrThrow({
      where: { rideRequestId: nusratsRide, type: 'RIDE' },
    });
    expect(nusratsFare).toMatchObject({ totalPaisa: 7500n, pooled: false });
  });
});

describe('marking a no-show (TC-43, FR-DRV-12)', () => {
  it('cancels Rafiq with reason NO_SHOW and the fee after a 6-minute wait', async () => {
    await arrivedMinutesAgo(6);

    const response = await jashim.post(`/api/pools/${poolId}/members/${rafiqsRide}/no-show`);

    expect(response.status).toBe(200);
    expect(response.body.pool.members).toHaveLength(1);
    const ride = await prisma.rideRequest.findUniqueOrThrow({ where: { id: rafiqsRide } });
    expect(ride).toMatchObject({ status: 'CANCELLED', cancelReason: 'NO_SHOW' });
    const fee = await prisma.fare.findFirstOrThrow({ where: { rideRequestId: rafiqsRide } });
    expect(fee).toMatchObject({ type: 'CANCELLATION_FEE', totalPaisa: 2000n });
  });

  it('refuses after only 2 minutes and says how long to wait', async () => {
    await arrivedMinutesAgo(2);

    const response = await jashim.post(`/api/pools/${poolId}/members/${rafiqsRide}/no-show`);

    expect(response.status).toBe(409);
    expect(response.body.error.message).toBe(
      'Please wait 3 more minutes before marking a no-show.',
    );
    expect(await statusOf(rafiqsRide)).toBe('DRIVER_ARRIVED');
  });

  it('refuses before Jashim has arrived', async () => {
    const response = await jashim.post(`/api/pools/${poolId}/members/${rafiqsRide}/no-show`);

    expect(response.status).toBe(409);
  });
});

describe("another driver's trip (TC-04, NFR-SEC-03)", () => {
  it("does not let Kamal arrive, start, cancel or drop off on Jashim's trip", async () => {
    const kamal = await signInAs(app, 'kamal@dhakapool.test');

    const attempts = await Promise.all([
      kamal.post(`/api/pools/${poolId}/arrive`),
      kamal.post(`/api/pools/${poolId}/start`),
      kamal.post(`/api/pools/${poolId}/cancel`),
      kamal.post(`/api/pools/${poolId}/members/${nusratsRide}/complete`),
    ]);

    expect(attempts.map((attempt) => attempt.status)).toEqual([404, 404, 404, 404]);
    expect((await prisma.pool.findFirstOrThrow()).status).toBe('OPEN');
  });

  it('does not let Nusrat use driver commands at all', async () => {
    const response = await nusrat.post(`/api/pools/${poolId}/arrive`);

    expect(response.status).toBe(403);
  });
});

describe('moves that are refused and change nothing (TC-02)', () => {
  it('refuses to drop off Nusrat while she is only MATCHED', async () => {
    const response = await jashim.post(`/api/pools/${poolId}/members/${nusratsRide}/complete`);

    expect(response.status).toBe(409);
    expect(await statusOf(nusratsRide)).toBe('MATCHED');
  });

  it('refuses to arrive on a trip that is already completed', async () => {
    await jashim.post(`/api/pools/${poolId}/arrive`);
    await jashim.post(`/api/pools/${poolId}/start`);
    await jashim.post(`/api/pools/${poolId}/members/${nusratsRide}/complete`);
    await jashim.post(`/api/pools/${poolId}/members/${rafiqsRide}/complete`);
    const historyBefore = await prisma.statusHistory.count();

    const response = await jashim.post(`/api/pools/${poolId}/arrive`);

    expect(response.status).toBe(409);
    expect(await prisma.statusHistory.count()).toBe(historyBefore);
  });
});
