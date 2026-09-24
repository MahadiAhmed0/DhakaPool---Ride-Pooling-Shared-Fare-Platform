// Builds the real API for tests and signs personas in. Uses Supertest "agents", which keep cookies
// between requests just like a browser does.
import request from 'supertest';
import type { Express } from 'express';
import { createApp } from '../../src/app.ts';
import { TEST_PASSWORD } from './personas.ts';

type Agent = ReturnType<typeof request.agent>;

// Tests sign in far more often than a person would, so the sign-in rate limit is raised here.
// The rate-limit test itself uses createApp() with the real limit.
const TEST_AUTH_ATTEMPTS_PER_MINUTE = 1_000;

export function createTestApp(): Express {
  return createApp({ authAttemptsPerMinute: TEST_AUTH_ATTEMPTS_PER_MINUTE });
}

export async function signInAs(app: Express, emailOrPhone: string): Promise<Agent> {
  const agent = request.agent(app);
  const response = await agent
    .post('/api/auth/login')
    .send({ emailOrPhone, password: TEST_PASSWORD });
  if (response.status !== 200) {
    throw new Error(`Could not sign in as ${emailOrPhone}: ${response.status}`);
  }
  return agent;
}
