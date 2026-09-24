// Signing in, the current user and signing out (TC-32, FR-AUTH-02…04), and how secrets are stored (TC-44).
import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '../../src/db/client.ts';
import { hashSessionToken } from '../../src/modules/auth/session-token.ts';
import { createTestApp, signInAs } from '../helpers/app.ts';
import { createPersonas, TEST_PASSWORD } from '../helpers/personas.ts';

const app = createTestApp();

beforeEach(async () => {
  await createPersonas();
});

function sessionTokenFrom(setCookie: string[] | undefined): string {
  const match = setCookie?.[0]?.match(/^dtp_session=([^;]+)/);
  if (!match?.[1]) {
    throw new Error('No session cookie was set');
  }
  return match[1];
}

describe('signing in', () => {
  it('signs Jashim in with his e-mail and shows his Tesla, Bullet', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({ emailOrPhone: 'jashim@dhakapool.test', password: TEST_PASSWORD });

    expect(response.status).toBe(200);
    expect(response.body.user).toMatchObject({
      fullName: 'Jashim',
      role: 'DRIVER',
      vehicle: { name: 'Bullet', plate: 'DHAKA-TESLA-11', capacity: 3 },
    });
  });

  it('signs Nusrat in with her phone number', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({ emailOrPhone: '+8801711000001', password: TEST_PASSWORD });

    expect(response.status).toBe(200);
    expect(response.body.user.fullName).toBe('Nusrat');
  });

  it('gives the same answer for a wrong password and an unknown account', async () => {
    const wrongPassword = await request(app)
      .post('/api/auth/login')
      .send({ emailOrPhone: 'rafiq@dhakapool.test', password: 'not-his-password' });
    const unknownAccount = await request(app)
      .post('/api/auth/login')
      .send({ emailOrPhone: 'nobody@dhakapool.test', password: 'not-his-password' });

    expect(wrongPassword.status).toBe(401);
    expect(unknownAccount.status).toBe(401);
    expect(wrongPassword.body.error.message).toBe(unknownAccount.body.error.message);
  });
});

describe('the current user and signing out', () => {
  it('answers /me with 401 when nobody is signed in', async () => {
    const response = await request(app).get('/api/auth/me');

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('UNAUTHENTICATED');
  });

  it('shows Shirin her own profile, including the gender she declared', async () => {
    const shirin = await signInAs(app, 'shirin@dhakapool.test');

    const response = await shirin.get('/api/auth/me');

    expect(response.status).toBe(200);
    expect(response.body.user).toMatchObject({ fullName: 'Shirin', gender: 'FEMALE' });
    expect(response.body.user.vehicle).toBeUndefined();
  });

  it('makes the old cookie useless after signing out', async () => {
    const rafiq = await signInAs(app, 'rafiq@dhakapool.test');

    const signOut = await rafiq.post('/api/auth/logout');
    const afterwards = await rafiq.get('/api/auth/me');

    expect(signOut.status).toBe(204);
    expect(afterwards.status).toBe(401);
  });

  it('rejects a session that has expired', async () => {
    const nusrat = await signInAs(app, 'nusrat@dhakapool.test');
    await prisma.session.updateMany({ data: { expiresAt: new Date(Date.now() - 1000) } });

    const response = await nusrat.get('/api/auth/me');

    expect(response.status).toBe(401);
  });
});

describe('how secrets are stored (TC-44, NFR-SEC-01)', () => {
  it('keeps passwords only as bcrypt hashes', async () => {
    const users = await prisma.user.findMany({ select: { passwordHash: true } });

    expect(users.every((user) => /^\$2[aby]\$/.test(user.passwordHash))).toBe(true);
    expect(users.some((user) => user.passwordHash.includes(TEST_PASSWORD))).toBe(false);
  });

  it('keeps only the SHA-256 hash of the session token, never the token itself', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({ emailOrPhone: 'kamal@dhakapool.test', password: TEST_PASSWORD });
    const token = sessionTokenFrom(response.headers['set-cookie'] as unknown as string[]);

    const session = await prisma.session.findFirstOrThrow();

    expect(session.tokenHash).toBe(hashSessionToken(token));
    expect(session.tokenHash).not.toContain(token);
  });
});
