// The request pipeline: request ids, the standard error shape and the health check (NFR-REL-01/02, TC-34).
import type { Request, Response } from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createApp } from '../src/app.ts';
import { errorHandler } from '../src/middleware/error-handler.ts';
import { pingDatabase } from '../src/modules/health/health.repository.ts';

// The health check is tested without a real database: we decide whether the "ping" works.
vi.mock('../src/modules/health/health.repository.ts', () => ({ pingDatabase: vi.fn() }));
const pingDatabaseMock = vi.mocked(pingDatabase);

const app = createApp();

describe('request ids', () => {
  it('gives every response an X-Request-Id header', async () => {
    const response = await request(app).get('/nowhere');

    expect(response.headers['x-request-id']).toMatch(/^[0-9a-f-]{36}$/);
  });

  it("keeps the caller's own request id when it is safe", async () => {
    const response = await request(app).get('/nowhere').set('X-Request-Id', 'nusrat-ride-1');

    expect(response.headers['x-request-id']).toBe('nusrat-ride-1');
  });
});

describe('standard error shape', () => {
  it('answers an unknown URL with NOT_FOUND and the request id', async () => {
    const response = await request(app).get('/api/teslas').set('X-Request-Id', 'jashim-1');

    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      error: { code: 'NOT_FOUND', message: 'There is no GET /api/teslas endpoint.' },
      requestId: 'jashim-1',
    });
  });

  it('rejects a body that is not valid JSON with VALIDATION_ERROR', async () => {
    const response = await request(app)
      .post('/api/rides')
      .set('Content-Type', 'application/json')
      .send('{ "pickup": ');

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
    expect(response.body.requestId).toEqual(expect.any(String));
  });
});

describe('health check', () => {
  beforeEach(() => {
    pingDatabaseMock.mockReset();
  });

  it('reports ok when the database answers', async () => {
    pingDatabaseMock.mockResolvedValue();

    const response = await request(app).get('/health');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: 'ok', db: 'up' });
  });

  it('reports degraded with 503 when the database is down', async () => {
    pingDatabaseMock.mockRejectedValue(new Error('connection refused'));

    const response = await request(app).get('/api/health');

    expect(response.status).toBe(503);
    expect(response.body).toEqual({ status: 'degraded', db: 'down' });
  });
});

describe('unexpected errors', () => {
  it('answers 500 with a generic message and never the stack or the original text (NFR-SEC-09)', () => {
    const json = vi.fn();
    const status = vi.fn(() => ({ json }));
    const logError = vi.fn();
    const req = { id: 'kamal-1', log: { error: logError, warn: vi.fn() } } as unknown as Request;
    const bug = new Error('column "password_hash" leaked into the query');

    errorHandler(bug, req, { status } as unknown as Response, vi.fn());

    expect(status).toHaveBeenCalledWith(500);
    const body = json.mock.calls[0]?.[0];
    expect(body).toEqual({
      error: { code: 'INTERNAL_ERROR', message: 'Something went wrong. Please try again.' },
      requestId: 'kamal-1',
    });
    expect(JSON.stringify(body)).not.toContain('password_hash');
    // The full error is kept in the server log for whoever investigates it.
    expect(logError).toHaveBeenCalledWith({ err: bug }, 'Unexpected error');
  });
});
