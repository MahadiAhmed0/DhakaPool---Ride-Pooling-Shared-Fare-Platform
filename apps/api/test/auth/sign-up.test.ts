// Passenger sign-up (TC-31, FR-AUTH-01) including the optional gender (TC-50 part 1, FR-PAX-11).
import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '../../src/db/client.ts';
import { createTestApp } from '../helpers/app.ts';
import { createPersonas } from '../helpers/personas.ts';

const app = createTestApp();

// A new passenger who is not part of the seeded cast.
const newPassenger = {
  fullName: 'Tania',
  email: 'tania@dhakapool.test',
  phone: '+8801711000099',
  password: 'TeslaPool#2026',
};

beforeEach(async () => {
  await createPersonas();
});

describe('signing up as a passenger', () => {
  it('creates the account, an empty TeslaPay wallet and signs the passenger in', async () => {
    const response = await request(app).post('/api/auth/signup').send(newPassenger);

    expect(response.status).toBe(201);
    expect(response.body.user).toMatchObject({
      fullName: 'Tania',
      email: 'tania@dhakapool.test',
      role: 'PASSENGER',
      gender: 'PREFER_NOT_TO_SAY',
    });
    expect(response.headers['set-cookie']?.[0]).toMatch(/^dtp_session=.+; HttpOnly; SameSite=Lax/);
    const wallet = await prisma.wallet.findFirstOrThrow({
      where: { passenger: { email: newPassenger.email } },
    });
    expect(wallet.balancePaisa).toBe(0n);
  });

  it('stores a declared gender for same-gender rides', async () => {
    const response = await request(app)
      .post('/api/auth/signup')
      .send({ ...newPassenger, gender: 'FEMALE' });

    expect(response.status).toBe(201);
    expect(response.body.user.gender).toBe('FEMALE');
  });

  it("rejects Nusrat's e-mail address again, whatever its letter case", async () => {
    const response = await request(app)
      .post('/api/auth/signup')
      .send({ ...newPassenger, email: 'NUSRAT@DhakaPool.test' });

    expect(response.status).toBe(409);
    expect(response.body.error).toMatchObject({ code: 'CONFLICT' });
    expect(await prisma.user.count()).toBe(5);
  });

  it("rejects Rafiq's phone number again", async () => {
    const response = await request(app)
      .post('/api/auth/signup')
      .send({ ...newPassenger, phone: '+8801711000002' });

    expect(response.status).toBe(409);
    expect(response.body.error.message).toMatch(/phone number/);
  });

  it('rejects a password shorter than 8 characters and says which field is wrong', async () => {
    const response = await request(app)
      .post('/api/auth/signup')
      .send({ ...newPassenger, password: 'short' });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
    expect(response.body.error.details.fields).toEqual([
      expect.objectContaining({ path: 'password' }),
    ]);
  });

  it('refuses to let anyone sign themselves up as a driver', async () => {
    const response = await request(app)
      .post('/api/auth/signup')
      .send({ ...newPassenger, role: 'DRIVER' });

    expect(response.status).toBe(400);
    expect(response.body.error.details.fields).toEqual([
      { path: 'role', message: 'The field "role" is not expected here.' },
    ]);
    expect(await prisma.user.count({ where: { email: newPassenger.email } })).toBe(0);
  });
});
