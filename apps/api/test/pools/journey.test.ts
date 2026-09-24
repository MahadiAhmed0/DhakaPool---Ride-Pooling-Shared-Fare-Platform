// Scenario E1 end to end (TC-25 statuses): Nusrat and Rafiq share Bullet, are dropped off one by
// one, and the trip completes itself. Plus Jashim's trip list and history (TC-40, FR-DRV-13).
import { beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '../../src/db/client.ts';
import { createTestApp, signInAs } from '../helpers/app.ts';
import { createPersonas, type Personas } from '../helpers/personas.ts';
import { insertPool } from '../helpers/records.ts';
import { accept, goOnline, NUSRATS_TRIP, RAFIQS_TRIP, requestRide } from '../helpers/trips.ts';

const app = createTestApp();
type Agent = Awaited<ReturnType<typeof signInAs>>;

let people: Personas;
let jashim: Agent;
let nusrat: Agent;
let rafiq: Agent;
let nusratsRide: string;
let rafiqsRide: string;
let poolId: string;

// Nusrat and Rafiq share Bullet and the trip has started.
beforeEach(async () => {
  people = await createPersonas();
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
  await jashim.post(`/api/pools/${poolId}/arrive`);
  await jashim.post(`/api/pools/${poolId}/start`);
});

describe('dropping passengers off (TC-25, FR-DRV-09, FR-POOL-08)', () => {
  it('drops Nusrat at Mohakhali first, then Rafiq, and the trip completes itself', async () => {
    const afterNusrat = await jashim.post(`/api/pools/${poolId}/members/${nusratsRide}/complete`);
    const afterRafiq = await jashim.post(`/api/pools/${poolId}/members/${rafiqsRide}/complete`);

    expect(afterNusrat.status).toBe(200);
    expect(afterNusrat.body.pool).toMatchObject({ status: 'STARTED', occupiedSeats: 1 });
    expect(afterRafiq.body.pool).toMatchObject({
      status: 'COMPLETED',
      occupiedSeats: 0,
      totalFarePaisa: 12600, // 6600 + 6000
    });
    const members = await prisma.poolMember.findMany({ orderBy: { dropoffOrder: 'asc' } });
    expect(members.map((member) => member.rideRequestId)).toEqual([nusratsRide, rafiqsRide]);
    const nusratsView = await nusrat.get(`/api/rides/${nusratsRide}`);
    expect(nusratsView.body.ride).toMatchObject({ status: 'COMPLETED', trip: { isShared: true } });
    expect(nusratsView.body.ride.completedAt).not.toBeNull();
  });

  it("leaves Jashim in Gulshan 1, where Rafiq got off, and records the system's completion", async () => {
    await jashim.post(`/api/pools/${poolId}/members/${nusratsRide}/complete`);
    await jashim.post(`/api/pools/${poolId}/members/${rafiqsRide}/complete`);

    const status = await jashim.get('/api/driver/availability');

    expect(status.body.driver).toMatchObject({ zoneCode: 'GL1', activePool: null });
    const completion = await prisma.statusHistory.findFirstOrThrow({
      where: { entityType: 'POOL', toStatus: 'COMPLETED' },
    });
    expect(completion).toMatchObject({ actorRole: 'SYSTEM', reason: 'LAST_MEMBER_DROPPED_OFF' });
  });

  it('follows SRS §5 for Nusrat from request to drop-off', async () => {
    await jashim.post(`/api/pools/${poolId}/members/${nusratsRide}/complete`);

    const response = await nusrat.get(`/api/rides/${nusratsRide}`);

    const steps = response.body.ride.timeline.map(
      (entry: { fromStatus: string | null; toStatus: string }) =>
        `${entry.fromStatus ?? '—'} → ${entry.toStatus}`,
    );
    expect(steps).toEqual([
      '— → REQUESTED',
      'REQUESTED → MATCHED',
      'MATCHED → DRIVER_ARRIVED',
      'DRIVER_ARRIVED → STARTED',
      'STARTED → COMPLETED',
    ]);
  });

  it("never shows Nusrat Rafiq's name, destination or fare once they ride together (TC-13)", async () => {
    const detail = await nusrat.get(`/api/rides/${nusratsRide}`);
    const active = await nusrat.get('/api/rides?scope=active');

    for (const response of [detail, active]) {
      const everythingNusratReceived = JSON.stringify(response.body);
      expect(everythingNusratReceived).not.toContain('Rafiq');
      expect(everythingNusratReceived).not.toContain(rafiqsRide);
      expect(everythingNusratReceived).not.toContain('GL1');
      expect(everythingNusratReceived).not.toContain('"totalPaisa":6000');
    }
    expect(detail.body.ride.trip).toMatchObject({ isShared: true, coRiderCount: 1 });
    expect(detail.body.ride.fare.locked.totalPaisa).toBe(6600);
  });

  it('refuses to drop Nusrat off twice, and changes nothing (TC-02)', async () => {
    await jashim.post(`/api/pools/${poolId}/members/${nusratsRide}/complete`);

    const again = await jashim.post(`/api/pools/${poolId}/members/${nusratsRide}/complete`);

    expect(again.status).toBe(409);
    expect((await prisma.pool.findFirstOrThrow()).occupiedSeats).toBe(1);
  });
});

describe("Jashim's trips (TC-40, FR-DRV-06, FR-DRV-13)", () => {
  it('shows the trip under way as active, and it moves to history once completed', async () => {
    const active = await jashim.get('/api/driver/pools?scope=active');
    await jashim.post(`/api/pools/${poolId}/members/${nusratsRide}/complete`);
    await jashim.post(`/api/pools/${poolId}/members/${rafiqsRide}/complete`);
    const history = await jashim.get('/api/driver/pools?scope=history');

    expect(active.body.pools).toEqual([expect.objectContaining({ id: poolId, status: 'STARTED' })]);
    expect(history.body.pools).toEqual([
      expect.objectContaining({ id: poolId, status: 'COMPLETED', totalFarePaisa: 12600 }),
    ]);
  });

  it("shows only Jashim's own trips, never Kamal's", async () => {
    await insertPool(people.kamal.id, people.kamal.vehicleId, { status: 'COMPLETED' });
    await jashim.post(`/api/pools/${poolId}/members/${nusratsRide}/complete`);
    await jashim.post(`/api/pools/${poolId}/members/${rafiqsRide}/complete`);

    const history = await jashim.get('/api/driver/pools?scope=history');

    expect(history.body.pools.map((pool: { id: string }) => pool.id)).toEqual([poolId]);
  });
});
