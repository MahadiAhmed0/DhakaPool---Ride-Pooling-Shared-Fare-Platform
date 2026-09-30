'use client';
// The server data the passenger screens read, one small hook each (TanStack Query, ADR-0012).
// Keys come from query-keys.ts, so a change can refresh exactly what it affects.
import type {
  CurrentUser,
  FareEstimate,
  RideDetail,
  RideList,
  RideView,
  WalletStatement,
  WalletView,
  Zone,
} from '@dhakapool/shared';
import { isActiveRide } from '@dhakapool/shared';
import {
  type InfiniteData,
  keepPreviousData,
  useInfiniteQuery,
  type UseInfiniteQueryResult,
  useQuery,
  type UseQueryResult,
} from '@tanstack/react-query';
import { api } from './api-client';
import { pagePath } from './page-path';
import { queryKeys } from './query-keys';

// FR-PAX-07, NFR-PERF-03: a live ride refreshes every 4 s. TanStack Query pauses this while the
// tab is hidden, and it stops once the ride is finished.
export const LIVE_RIDE_REFRESH_MS = 4_000;

// Zones change only with the seed, so they are kept for the whole visit.
export function useZones(): UseQueryResult<Zone[]> {
  return useQuery({
    queryKey: queryKeys.zones,
    queryFn: async () => (await api.get<{ zones: Zone[] }>('/zones')).zones,
    staleTime: Infinity,
  });
}

export function useCurrentUser(): UseQueryResult<CurrentUser> {
  return useQuery({
    queryKey: queryKeys.me,
    queryFn: async () => (await api.get<{ user: CurrentUser }>('/auth/me')).user,
    staleTime: Infinity,
  });
}

// The passenger's one active ride, or null (BR-05).
export function useActiveRide(): UseQueryResult<RideView | null> {
  return useQuery({
    queryKey: queryKeys.activeRide,
    queryFn: async () => (await api.get<RideList>('/rides?scope=active')).rides[0] ?? null,
    refetchInterval: (query) => (query.state.data ? LIVE_RIDE_REFRESH_MS : false),
  });
}

export function useRide(rideId: string): UseQueryResult<RideDetail> {
  return useQuery({
    queryKey: queryKeys.ride(rideId),
    queryFn: async () => (await api.get<{ ride: RideDetail }>(`/rides/${rideId}`)).ride,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status && isActiveRide(status) ? LIVE_RIDE_REFRESH_MS : false;
    },
  });
}

export function useWallet(): UseQueryResult<WalletView> {
  return useQuery({
    queryKey: queryKeys.wallet,
    queryFn: async () => (await api.get<{ wallet: WalletView }>('/wallet')).wallet,
  });
}

export function useRideHistory(): UseInfiniteQueryResult<InfiniteData<RideList>> {
  return useInfiniteQuery({
    queryKey: queryKeys.rideHistory,
    queryFn: ({ pageParam }) => api.get<RideList>(pagePath('/rides?scope=history', pageParam)),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
  });
}

export function useWalletStatement(): UseInfiniteQueryResult<InfiniteData<WalletStatement>> {
  return useInfiniteQuery({
    queryKey: queryKeys.walletTransactions,
    queryFn: ({ pageParam }) =>
      api.get<WalletStatement>(pagePath('/wallet/transactions', pageParam)),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
  });
}

export type Trip = { pickupZoneCode: string; destinationZoneCode: string; seats: number };

function isCompleteTrip(trip: Trip): boolean {
  const hasZones = trip.pickupZoneCode !== '' && trip.destinationZoneCode !== '';
  return hasZones && trip.pickupZoneCode !== trip.destinationZoneCode && trip.seats >= 1;
}

// FR-PAX-02: the solo and shared price, asked for only once the trip is complete.
export function useFareEstimate(trip: Trip): UseQueryResult<FareEstimate> {
  return useQuery({
    queryKey: queryKeys.fareEstimate(trip.pickupZoneCode, trip.destinationZoneCode, trip.seats),
    queryFn: async () =>
      (await api.post<{ estimate: FareEstimate }>('/fares/estimate', trip)).estimate,
    enabled: isCompleteTrip(trip),
    // NFR-USA-01: a re-estimate keeps the previous price visible instead of collapsing
    // the panel to a loading box, which moved everything below it on every change.
    placeholderData: keepPreviousData,
  });
}
