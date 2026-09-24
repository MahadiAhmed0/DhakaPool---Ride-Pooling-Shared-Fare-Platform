// When a screen needs several queries, it shows one loading state while any is loading, and one
// error (with a retry of the failed ones) if any failed (NFR-USA-01).
import type { UseQueryResult } from '@tanstack/react-query';

export type CombinedState = { isPending: boolean; error: Error | null; retry: () => void };

export function combineQueries(queries: UseQueryResult<unknown>[]): CombinedState {
  const failed = queries.filter((query) => query.isError);
  return {
    isPending: queries.some((query) => query.isPending),
    error: failed[0]?.error ?? null,
    retry: () => failed.forEach((query) => void query.refetch()),
  };
}
