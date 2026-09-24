'use client';
// The server data the driver screens read, one small hook each (TanStack Query, ADR-0012).
// Keys come from query-keys.ts, so a driver action can refresh exactly what it affects.
import type { DriverStatus } from '@dhakapool/shared';
import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { api } from './api-client';
import { queryKeys } from './query-keys';

// Online or offline, the zone, the Tesla, and the trip under way if any (FR-DRV-01).
export function useDriverStatus(): UseQueryResult<DriverStatus> {
  return useQuery({
    queryKey: queryKeys.driverStatus,
    queryFn: async () => (await api.get<{ driver: DriverStatus }>('/driver/availability')).driver,
  });
}
