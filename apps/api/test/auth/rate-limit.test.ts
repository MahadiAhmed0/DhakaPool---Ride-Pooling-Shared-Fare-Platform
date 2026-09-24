// Sign-in rate limiting (TC-38, NFR-SEC-07): the 11th attempt within a minute is refused.
import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../../src/app.ts';
import { AUTH_ATTEMPTS_PER_MINUTE } from '../../src/config/rules.ts';
import { createPersonas, TEST_PASSWORD } from '../helpers/personas.ts';

beforeEach(async () => {
  await createPersonas();
});

describe('sign-in rate limit', () => {
  it('refuses the 11th attempt in a minute with 429, even with the right password', async () => {
    const app = createApp(); // the real limit
    const tryWrongPassword = () =>
      request(app)
        .post('/api/auth/login')
        .send({ emailOrPhone: 'rafiq@dhakapool.test', password: 'guessing' });

    for (let attempt = 1; attempt <= AUTH_ATTEMPTS_PER_MINUTE; attempt++) {
      expect((await tryWrongPassword()).status).toBe(401);
    }
    const eleventh = await request(app)
      .post('/api/auth/login')
      .send({ emailOrPhone: 'rafiq@dhakapool.test', password: TEST_PASSWORD });

    expect(eleventh.status).toBe(429);
    expect(eleventh.body.error.code).toBe('RATE_LIMITED');
  });
});
