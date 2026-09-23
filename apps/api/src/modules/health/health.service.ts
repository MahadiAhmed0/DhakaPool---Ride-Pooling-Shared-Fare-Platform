// Decides whether the API is healthy: it is only "ok" when the database answers (NFR-REL-02).
import type { HealthStatus } from '@dhakapool/shared';
import { pingDatabase } from './health.repository.ts';

export async function checkHealth(): Promise<HealthStatus> {
  try {
    await pingDatabase();
    return { status: 'ok', db: 'up' };
  } catch {
    return { status: 'degraded', db: 'down' };
  }
}
