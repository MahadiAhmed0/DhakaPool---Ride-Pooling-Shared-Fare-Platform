// Jashim's feed of waiting requests (TC-23, FR-DRV-04).
import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '../../src/db/client.ts';
import { createTestApp, signInAs } from '../helpers/app.ts';
import { createPersonas, TEST_PASSWORD } from '../helpers/personas.ts';
import { accept, goOnline, NUSRATS_TRIP, RAFIQS_TRIP, requestRide } from '../helpers/trips.ts';

const app = createTestApp();
type Agent = Awaited<ReturnType<typeof signInAs>>;

let jashim: Agent;

// A passenger outside the reference cast, signed up through the API.
async function newPassenger(fullName: string, phone: string): Promise<Agent> {
  const agent = request.agent(app);
  const response = await agent.post('/api/auth/signup').send({
    fullName,
    email: `${fullName.toLowerCase()}@dhakapool.test`,
    phone,
    password: TEST_PASSWORD,
  });
  expect(response.status).toBe(201);
  return agent;
}

function destinationsIn(response: {
  body: { requests: { destinationZoneCode: string }[] };
}): string[] {
  return response.body.requests.map((waiting) => waiting.destinationZoneCode);
}

beforeEach(async () => {
  await createPersonas();
  jashim = await signInAs(app, 'jashim@dhakapool.test');
});

describe("Jashim's request feed (TC-23)", () => {
  it('asks Jashim to go online first', async () => {
    const response = await jashim.get('/api/driver/requests');

    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe('DRIVER_OFFLINE');
  });

  it('shows the Banani requests, then only those that can join once Nusrat is on board', async () => {
    const nusrat = await signInAs(app, 'nusrat@dhakapool.test');
    const rafiq = await signInAs(app, 'rafiq@dhakapool.test');
    const toUttara = await newPassenger('Tania', '+8801711000098');
    const fromGulshan = await newPassenger('Karim', '+8801711000097');
    const nusratsRide = await requestRide(nusrat, NUSRATS_TRIP);
    await requestRide(rafiq, RAFIQS_TRIP);
    await requestRide(toUttara, { ...RAFIQS_TRIP, destinationZoneCode: 'UTR' });
    await requestRide(fromGulshan, {
      ...RAFIQS_TRIP,
      pickupZoneCode: 'GL1',
      destinationZoneCode: 'MHK',
    });
    await goOnline(jashim);

    const before = await jashim.get('/api/driver/requests');
    await accept(jashim, nusratsRide);
    const after = await jashim.get('/api/driver/requests');

    expect(destinationsIn(before)).toEqual(['MHK', 'GL1', 'UTR']);
    expect(destinationsIn(after)).toEqual(['GL1']);
  });

  it('shows the trip and the estimated fare, but not who the passenger is (A-20)', async () => {
    const nusrat = await signInAs(app, 'nusrat@dhakapool.test');
    const nusratsRide = await requestRide(nusrat, NUSRATS_TRIP);
    await goOnline(jashim);

    const response = await jashim.get('/api/driver/requests');

    expect(response.body.requests).toEqual([
      {
        id: nusratsRide,
        pickupZoneCode: 'BAN',
        destinationZoneCode: 'MHK',
        seats: 1,
        poolOptIn: true,
        estimatedFarePaisa: 7500,
        requestedAt: expect.any(String),
      },
    ]);
  });

  it('is empty once Jashim has arrived at the pickup, because nobody can join', async () => {
    const nusrat = await signInAs(app, 'nusrat@dhakapool.test');
    const rafiq = await signInAs(app, 'rafiq@dhakapool.test');
    await goOnline(jashim);
    await accept(jashim, await requestRide(nusrat, NUSRATS_TRIP));
    await requestRide(rafiq, RAFIQS_TRIP);
    await prisma.pool.updateMany({ data: { status: 'DRIVER_ARRIVED' } });

    const response = await jashim.get('/api/driver/requests');

    expect(response.body.requests).toEqual([]);
  });
});
