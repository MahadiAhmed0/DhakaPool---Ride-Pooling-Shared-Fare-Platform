// Going online and offline (TC-22; FR-DRV-01…03) and the driver's own status.
import { beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '../../src/db/client.ts';
import { createTestApp, signInAs } from '../helpers/app.ts';
import { createPersonas, type Personas } from '../helpers/personas.ts';
import { insertPool } from '../helpers/records.ts';

const app = createTestApp();

let people: Personas;

beforeEach(async () => {
  people = await createPersonas();
});

describe("Jashim's availability (TC-22)", () => {
  it('shows Jashim his Tesla, Bullet, while he is offline', async () => {
    const jashim = await signInAs(app, 'jashim@dhakapool.test');

    const response = await jashim.get('/api/driver/availability');

    expect(response.status).toBe(200);
    expect(response.body.driver).toEqual({
      availability: 'OFFLINE',
      zoneCode: null,
      vehicle: { name: 'Bullet', plate: 'DHAKA-TESLA-11', capacity: 3 },
      activePool: null,
    });
  });

  it('puts Jashim online in Banani and records it in the audit trail', async () => {
    const jashim = await signInAs(app, 'jashim@dhakapool.test');

    const response = await jashim
      .put('/api/driver/availability')
      .send({ availability: 'ONLINE', zoneCode: 'BAN' });

    expect(response.status).toBe(200);
    expect(response.body.driver).toMatchObject({ availability: 'ONLINE', zoneCode: 'BAN' });
    const history = await prisma.statusHistory.findFirstOrThrow({
      where: { entityType: 'DRIVER' },
    });
    expect(history).toMatchObject({
      entityId: people.jashim.id,
      fromStatus: 'OFFLINE',
      toStatus: 'ONLINE',
      actorRole: 'DRIVER',
      metadata: { zoneCode: 'BAN' },
    });
  });

  it('refuses to let Jashim go offline during a trip, and allows it once the trip is over', async () => {
    const jashim = await signInAs(app, 'jashim@dhakapool.test');
    await jashim.put('/api/driver/availability').send({ availability: 'ONLINE', zoneCode: 'BAN' });
    const poolId = await insertPool(people.jashim.id, people.jashim.vehicleId);

    const duringTrip = await jashim
      .put('/api/driver/availability')
      .send({ availability: 'OFFLINE' });
    await prisma.pool.update({ where: { id: poolId }, data: { status: 'COMPLETED' } });
    const afterTrip = await jashim
      .put('/api/driver/availability')
      .send({ availability: 'OFFLINE' });

    expect(duringTrip.status).toBe(409);
    expect(duringTrip.body.error.code).toBe('ACTIVE_POOL_EXISTS');
    expect(afterTrip.status).toBe(200);
    expect(afterTrip.body.driver.availability).toBe('OFFLINE');
  });

  it('records nothing when Jashim asks for the status he already has', async () => {
    const jashim = await signInAs(app, 'jashim@dhakapool.test');

    const response = await jashim.put('/api/driver/availability').send({ availability: 'OFFLINE' });

    expect(response.status).toBe(200);
    expect(await prisma.statusHistory.count()).toBe(0);
  });

  it.each([
    ['going online without a zone', { availability: 'ONLINE' }, 'zoneCode'],
    ['an unknown zone', { availability: 'ONLINE', zoneCode: 'XYZ' }, 'zoneCode'],
    ['an unknown availability', { availability: 'BUSY' }, 'availability'],
  ])('rejects %s with 400', async (_case, body, field) => {
    const jashim = await signInAs(app, 'jashim@dhakapool.test');

    const response = await jashim.put('/api/driver/availability').send(body);

    expect(response.status).toBe(400);
    expect(response.body.error.details.fields).toEqual([expect.objectContaining({ path: field })]);
  });

  it('is only for drivers, so Nusrat gets 403', async () => {
    const nusrat = await signInAs(app, 'nusrat@dhakapool.test');

    const response = await nusrat.put('/api/driver/availability').send({ availability: 'OFFLINE' });

    expect(response.status).toBe(403);
  });
});
