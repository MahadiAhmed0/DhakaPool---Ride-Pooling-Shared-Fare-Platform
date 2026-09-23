'use client';
// Shows whether the web app can reach the API through its /api proxy (NFR-REL-02).
import type { HealthStatus } from '@dhakapool/shared';
import { useEffect, useState } from 'react';

type ApiState = 'checking' | 'ok' | 'unavailable';

const LABELS: Record<ApiState, string> = {
  checking: 'Checking the API…',
  ok: 'API ok',
  unavailable: 'API unavailable',
};

async function fetchApiState(): Promise<ApiState> {
  try {
    const response = await fetch('/api/health', { cache: 'no-store' });
    const health = (await response.json()) as HealthStatus;
    return health.status === 'ok' ? 'ok' : 'unavailable';
  } catch {
    return 'unavailable';
  }
}

export function ApiStatus() {
  const [state, setState] = useState<ApiState>('checking');

  useEffect(() => {
    fetchApiState().then(setState);
  }, []);

  return (
    <p role="status" className="mt-6 inline-block border-2 border-black px-3 py-1 font-bold">
      {LABELS[state]}
    </p>
  );
}
