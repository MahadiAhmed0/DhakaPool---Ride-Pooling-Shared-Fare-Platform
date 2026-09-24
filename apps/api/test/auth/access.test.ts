// Role guards (FR-AUTH-05, NFR-SEC-02/03): passengers cannot use driver routes and vice versa.
// The real driver and passenger routes arrive in later modules, so this test mounts two small routes
// behind the same session middleware and guards the API uses.
import cookieParser from 'cookie-parser';
import express, { type Express } from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../../src/app.ts';
import { errorHandler } from '../../src/middleware/error-handler.ts';
import { requireRole } from '../../src/middleware/require-auth.ts';
import { loadSession } from '../../src/middleware/session.ts';
import { createPersonas, TEST_PASSWORD } from '../helpers/personas.ts';

const realApp = createApp({ authAttemptsPerMinute: 1_000 });

function createGuardedApp(): Express {
  const app = express();
  app.use(cookieParser());
  app.use(loadSession);
  app.get('/driver-only', requireRole('DRIVER'), (_req, res) => {
    res.json({ ok: true });
  });
  app.get('/passenger-only', requireRole('PASSENGER'), (_req, res) => {
    res.json({ ok: true });
  });
  app.use(errorHandler);
  return app;
}

const guardedApp = createGuardedApp();

// Signs in through the real API and returns the session cookie, to reuse on the guarded app.
async function sessionCookieOf(email: string): Promise<string> {
  const login = await request(realApp)
    .post('/api/auth/login')
    .send({ emailOrPhone: email, password: TEST_PASSWORD });
  expect(login.status).toBe(200);
  return String(login.headers['set-cookie']).split(';')[0]!;
}

beforeEach(async () => {
  await createPersonas();
});

describe('role guards', () => {
  it('lets Jashim use a driver route', async () => {
    const response = await request(guardedApp)
      .get('/driver-only')
      .set('Cookie', await sessionCookieOf('jashim@dhakapool.test'));

    expect(response.status).toBe(200);
  });

  it('stops Nusrat from using a driver route with 403 FORBIDDEN', async () => {
    const response = await request(guardedApp)
      .get('/driver-only')
      .set('Cookie', await sessionCookieOf('nusrat@dhakapool.test'));

    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe('FORBIDDEN');
  });

  it('stops Jashim from using a passenger route', async () => {
    const response = await request(guardedApp)
      .get('/passenger-only')
      .set('Cookie', await sessionCookieOf('jashim@dhakapool.test'));

    expect(response.status).toBe(403);
  });

  it('asks an anonymous caller to sign in first (401)', async () => {
    const response = await request(guardedApp).get('/driver-only');

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('UNAUTHENTICATED');
  });

  it('treats a made-up cookie as signed out', async () => {
    const response = await request(guardedApp)
      .get('/passenger-only')
      .set('Cookie', 'dtp_session=made-up-token');

    expect(response.status).toBe(401);
  });
});
