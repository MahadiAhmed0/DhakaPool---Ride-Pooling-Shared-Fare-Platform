// Every cached piece of server data has its key here, so a change can refresh exactly what it
// affects (ARCHITECTURE §10).
export const queryKeys = {
  me: ['me'] as const,
  zones: ['zones'] as const,
  activeRide: ['rides', 'active'] as const,
  rideHistory: ['rides', 'history'] as const,
  ride: (rideId: string) => ['rides', 'detail', rideId] as const,
  fareEstimate: (pickup: string, destination: string, seats: number) =>
    ['fare-estimate', pickup, destination, seats] as const,
  wallet: ['wallet'] as const,
  walletTransactions: ['wallet', 'transactions'] as const,
};
