'use client';
// One TanStack Query client for the whole app (ADR-0012).
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { type ReactNode, useState } from 'react';
import { ApiError } from './api-client';

const MAX_RETRIES = 2;
const HTTP_SERVER_ERROR = 500;

// Retry only what may fix itself (the network, or a 5xx such as 503). A 4xx answer will not change.
function shouldRetry(failureCount: number, error: unknown): boolean {
  if (error instanceof ApiError && error.status > 0 && error.status < HTTP_SERVER_ERROR) {
    return false;
  }
  return failureCount < MAX_RETRIES;
}

export function QueryProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () => new QueryClient({ defaultOptions: { queries: { retry: shouldRetry } } }),
  );
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
