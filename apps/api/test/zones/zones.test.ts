// The zone list (TC-35, FR-PAX-01) and the zone reference data used for fares and matching (BR-08, BR-09).
import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { areNeighbours, distanceBetween } from '../../src/modules/zones/zones.service.ts';
import { createTestApp, signInAs } from '../helpers/app.ts';
import { createPersonas } from '../helpers/personas.ts';

const app = createTestApp();

beforeEach(async () => {
  await createPersonas();
});

describe('the zone list', () => {
  it('shows Nusrat all 10 Dhaka zones with their code, name and coordinates', async () => {
    const nusrat = await signInAs(app, 'nusrat@dhakapool.test');

    const response = await nusrat.get('/api/zones');

    expect(response.status).toBe(200);
    expect(response.body.zones).toHaveLength(10);
    expect(response.body.zones).toContainEqual({
      code: 'BAN',
      name: 'Banani',
      lat: 23.7937,
      lng: 90.4066,
    });
  });

  it('is also available to Jashim, because drivers choose a zone when going online', async () => {
    const jashim = await signInAs(app, 'jashim@dhakapool.test');

    const response = await jashim.get('/api/zones');

    expect(response.status).toBe(200);
  });

  it('asks visitors who are not signed in to sign in first', async () => {
    const response = await request(app).get('/api/zones');

    expect(response.status).toBe(401);
  });
});

describe('distances and neighbours', () => {
  it('finds 5000 m from Banani to Tejgaon, the same in both directions (TC-12, BR-09)', async () => {
    expect(await distanceBetween('BAN', 'TEJ')).toBe(5000);
    expect(await distanceBetween('TEJ', 'BAN')).toBe(5000);
  });

  it('treats Banani and Gulshan 1 as neighbours, but not Banani and Uttara (BR-08)', async () => {
    expect(await areNeighbours('BAN', 'GL1')).toBe(true);
    expect(await areNeighbours('GL1', 'BAN')).toBe(true);
    expect(await areNeighbours('BAN', 'UTR')).toBe(false);
  });
});
