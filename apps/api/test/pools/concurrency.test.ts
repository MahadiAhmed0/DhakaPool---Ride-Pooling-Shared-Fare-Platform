// Races that must never corrupt a pool (NFR-CON-01, NFR-CON-02, FR-POOL-09). Each scenario fires
// its requests at the same moment and is repeated 20 times with fresh data (TC-06, TC-17, TC-51).
import { describe, expect, it } from 'vitest';
import { prisma } from '../../src/db/client.ts';
import { createTestApp, signInAs } from '../helpers/app.ts';
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
const RUNS = 20; // NFR-CON-01: at least 20 repetitions
const RACE_TIMEOUT_MS = 120_000;

type Agent = Awaited<ReturnType<typeof signInAs>>;
type Cast = { jashim: Agent; jashimOnPhone: Agent; nusrat: Agent; rafiq: Agent; shirin: Agent };

// Fresh personas, all signed in. Jashim is signed in twice, like a double tap from two devices.
async function freshCast(): Promise<Cast> {
  await createPersonas();
  const [jashim, jashimOnPhone, nusrat, rafiq, shirin] = await Promise.all([
    signInAs(app, 'jashim@dhakapool.test'),
    signInAs(app, 'jashim@dhakapool.test'),
    signInAs(app, 'nusrat@dhakapool.test'),
    signInAs(app, 'rafiq@dhakapool.test'),
    signInAs(app, 'shirin@dhakapool.test'),
  ]);
  await goOnline(jashim);
  return { jashim, jashimOnPhone, nusrat, rafiq, shirin };
}

async function rideStatus(rideId: string): Promise<string> {
  return (await prisma.rideRequest.findUniqueOrThrow({ where: { id: rideId } })).status;
}

async function activeMemberships(rideId: string): Promise<number> {
  return prisma.poolMember.count({ where: { rideRequestId: rideId, leftAt: null } });
}

describe('racing for the same seat or the same request (TC-06)', () => {
  it(
    "gives Bullet's last seat to exactly one of Nusrat and Shirin, 20 times out of 20",
    async () => {
      for (let run = 0; run < RUNS; run += 1) {
        const cast = await freshCast();
        await accept(cast.jashim, await requestRide(cast.rafiq, { ...RAFIQS_TRIP, seats: 2 }));
        const nusratsRide = await requestRide(cast.nusrat, NUSRATS_TRIP);
        const shirinsRide = await requestRide(cast.shirin, SHIRINS_TRIP);

        const [forNusrat, forShirin] = await Promise.all([
          cast.jashim.post(`/api/driver/requests/${nusratsRide}/accept`),
          cast.jashimOnPhone.post(`/api/driver/requests/${shirinsRide}/accept`),
        ]);

        const statuses = [forNusrat.status, forShirin.status].sort();
        expect(statuses).toEqual([200, 409]);
        const loser = forNusrat.status === 409 ? forNusrat : forShirin;
        expect(loser.body.error.code).toBe('CAPACITY_EXCEEDED');
        const pool = await prisma.pool.findFirstOrThrow();
        expect(pool.occupiedSeats).toBe(3);
        expect(await prisma.poolMember.count({ where: { leftAt: null } })).toBe(2);
      }
    },
    RACE_TIMEOUT_MS,
  );

  it(
    "lets only one of Jashim and Kamal take Nusrat's request, 20 times out of 20",
    async () => {
      for (let run = 0; run < RUNS; run += 1) {
        const cast = await freshCast();
        const kamal = await signInAs(app, 'kamal@dhakapool.test');
        await goOnline(kamal);
        const nusratsRide = await requestRide(cast.nusrat, NUSRATS_TRIP);

        const [byJashim, byKamal] = await Promise.all([
          cast.jashim.post(`/api/driver/requests/${nusratsRide}/accept`),
          kamal.post(`/api/driver/requests/${nusratsRide}/accept`),
        ]);

        expect([byJashim.status, byKamal.status].sort()).toEqual([200, 409]);
        expect(await activeMemberships(nusratsRide)).toBe(1);
        // The loser's half-made pool was rolled back with everything else.
        expect(await prisma.pool.count()).toBe(1);
      }
    },
    RACE_TIMEOUT_MS,
  );
});

describe('a passenger cancelling while a driver accepts (TC-17)', () => {
  it(
    'always ends with Shirin cancelled and out of the pool, never cancelled but still seated',
    async () => {
      for (let run = 0; run < RUNS; run += 1) {
        const cast = await freshCast();
        await accept(cast.jashim, await requestRide(cast.nusrat, NUSRATS_TRIP));
        const shirinsRide = await requestRide(cast.shirin, SHIRINS_TRIP);

        const [, cancel] = await Promise.all([
          cast.jashim.post(`/api/driver/requests/${shirinsRide}/accept`),
          cast.shirin.post(`/api/rides/${shirinsRide}/cancel`),
        ]);

        // Either the cancel came first (the accept then fails), or the accept came first and the
        // cancel then took Shirin out of the pool again. Both end the same way.
        expect(cancel.status).toBe(200);
        expect(await rideStatus(shirinsRide)).toBe('CANCELLED');
        expect(await activeMemberships(shirinsRide)).toBe(0);
        expect((await prisma.pool.findFirstOrThrow()).occupiedSeats).toBe(1);
      }
    },
    RACE_TIMEOUT_MS,
  );

  it("still cancels Shirin when Jashim's accept lands while her cancel is waiting", async () => {
    // In the race above the cancel usually wins. This forces the other order: an accept holds
    // Shirin's ride locked, the cancel reads REQUESTED and waits, then the accept commits.
    // The cancel must notice the change, read MATCHED and take her out of the pool.
    const cast = await freshCast();
    await accept(cast.jashim, await requestRide(cast.nusrat, NUSRATS_TRIP));
    const shirinsRide = await requestRide(cast.shirin, SHIRINS_TRIP);
    const pool = await prisma.pool.findFirstOrThrow();
    const HOLD_MS = 400;
    const HEAD_START_MS = 100;

    const slowAccept = prisma.$transaction(async (tx) => {
      await tx.rideRequest.update({ where: { id: shirinsRide }, data: { status: 'MATCHED' } });
      await tx.poolMember.create({
        data: { poolId: pool.id, rideRequestId: shirinsRide, seats: 1 },
      });
      await tx.pool.update({ where: { id: pool.id }, data: { occupiedSeats: { increment: 1 } } });
      await new Promise((resolve) => setTimeout(resolve, HOLD_MS));
    });
    await new Promise((resolve) => setTimeout(resolve, HEAD_START_MS));
    // Supertest sends a request only when it is awaited, so .then() starts it now.
    const cancel = cast.shirin.post(`/api/rides/${shirinsRide}/cancel`).then((result) => result);
    await slowAccept;
    const response = await cancel;

    expect(response.status).toBe(200);
    expect(await rideStatus(shirinsRide)).toBe('CANCELLED');
    expect(await activeMemberships(shirinsRide)).toBe(0);
    expect((await prisma.pool.findFirstOrThrow()).occupiedSeats).toBe(1);
  });
});

describe('two accepts that would make a mixed same-gender pool (TC-51)', () => {
  it(
    'accepts either Shirin (women-only) or Rafiq, never both, 20 times out of 20',
    async () => {
      for (let run = 0; run < RUNS; run += 1) {
        const cast = await freshCast();
        await accept(cast.jashim, await requestRide(cast.nusrat, NUSRATS_TRIP));
        const shirinsRide = await requestRide(cast.shirin, {
          ...SHIRINS_TRIP,
          sameGenderOnly: true,
        });
        const rafiqsRide = await requestRide(cast.rafiq, RAFIQS_TRIP);

        const [forShirin, forRafiq] = await Promise.all([
          cast.jashim.post(`/api/driver/requests/${shirinsRide}/accept`),
          cast.jashimOnPhone.post(`/api/driver/requests/${rafiqsRide}/accept`),
        ]);

        expect([forShirin.status, forRafiq.status].sort()).toEqual([200, 422]);
        const pool = await prisma.pool.findFirstOrThrow();
        const expectedRestriction = forShirin.status === 200 ? 'FEMALE_ONLY' : 'NONE';
        expect(pool.genderRestriction).toBe(expectedRestriction);
        expect(pool.occupiedSeats).toBe(2);
      }
    },
    RACE_TIMEOUT_MS,
  );
});
