'use client';
// The server data the driver screens read, one small hook each (TanStack Query, ADR-0012).
// Keys come from query-keys.ts, so a driver action can refresh exactly what it affects.
import type {
  DriverPoolList,
  DriverPoolView,
  DriverStatus,
  WaitingRequest,
} from '@dhakapool/shared';
import {
  type InfiniteData,
  useInfiniteQuery,
  type UseInfiniteQueryResult,
  useQuery,
  type UseQueryResult,
} from '@tanstack/react-query';
import { api } from './api-client';
import { pagePath } from './page-path';
import { queryKeys } from './query-keys';

// NFR-PERF-03: the live driver screens refresh every 4 s; TanStack Query pauses this while the tab
// is hidden.
export const LIVE_DRIVER_REFRESH_MS = 4_000;

// Online or offline, the zone, the Tesla, and the trip under way if any (FR-DRV-01).
export function useDriverStatus(): UseQueryResult<DriverStatus> {
  return useQuery({
    queryKey: queryKeys.driverStatus,
    queryFn: async () => (await api.get<{ driver: DriverStatus }>('/driver/availability')).driver,
  });
}

// The waiting requests this driver may accept (FR-DRV-04). The API answers only while the driver
// is online, so the feed asks only then.
export function useDriverRequests(isOnline: boolean): UseQueryResult<WaitingRequest[]> {
  return useQuery({
    queryKey: queryKeys.driverRequests,
    queryFn: async () =>
      (await api.get<{ requests: WaitingRequest[] }>('/driver/requests')).requests,
    enabled: isOnline,
    refetchInterval: LIVE_DRIVER_REFRESH_MS,
  });
}

// The driver's one trip under way, or null (BR-04). It refreshes while there is one, so a
// passenger who cancels disappears from the list by themselves.
export function useActivePool(): UseQueryResult<DriverPoolView | null> {
  return useQuery({
    queryKey: queryKeys.activePool,
    queryFn: async () =>
      (await api.get<DriverPoolList>('/driver/pools?scope=active')).pools[0] ?? null,
    refetchInterval: (query) => (query.state.data ? LIVE_DRIVER_REFRESH_MS : false),
  });
}

// The driver's finished and cancelled trips, newest first, a page at a time (FR-DRV-13).
export function usePoolHistory(): UseInfiniteQueryResult<InfiniteData<DriverPoolList>> {
  return useInfiniteQuery({
    queryKey: queryKeys.poolHistory,
    queryFn: ({ pageParam }) =>
      api.get<DriverPoolList>(pagePath('/driver/pools?scope=history', pageParam)),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
  });
}
