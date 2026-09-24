'use client';
// Sends one of the driver's trip commands, such as POST /api/pools/:id/arrive (SRS §8.2).
// Each button has its own command, so it shows its own "Working…" and its own error. Whatever
// the answer, every driver screen is refreshed, because the trip may have changed either way.
import { useMutation, type UseMutationResult, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-keys';

// path is everything after /pools, for example `/${poolId}/start`.
export function useTripCommand(path: string): UseMutationResult<unknown, Error, void> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api.post(`/pools${path}`),
    onSettled: () => queryClient.invalidateQueries({ queryKey: queryKeys.driver }),
  });
}
