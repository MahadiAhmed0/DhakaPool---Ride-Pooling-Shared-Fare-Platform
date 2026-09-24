'use client';
// The live price of the trip being filled in (FR-PAX-02): alone, and shared. It waits until the
// choices have stopped changing, then asks the API. The breakdown is one tap away (NFR-USA-04).
import { FareBreakdown } from '@/components/ui/fare-breakdown';
import { MoneyText } from '@/components/ui/money-text';
import { ErrorState, LoadingState } from '@/components/ui/states';
import { useDebouncedValue } from '@/lib/hooks/use-debounced-value';
import { type Trip, useFareEstimate } from '@/lib/passenger-queries';

const SETTLE_DELAY_MS = 300;

export function FareEstimatePanel({ trip, isSharing }: { trip: Trip; isSharing: boolean }) {
  const settledTrip = useDebouncedValue(trip, SETTLE_DELAY_MS);
  const estimate = useFareEstimate(settledTrip);

  if (estimate.isPending && estimate.fetchStatus === 'idle') {
    return (
      <p className="border-3 border-dashed border-ink p-3">
        Choose two different zones to see the price.
      </p>
    );
  }
  if (estimate.isPending) {
    return <LoadingState label="Working out the price…" />;
  }
  if (estimate.isError) {
    return <ErrorState message={estimate.error.message} onRetry={() => estimate.refetch()} />;
  }
  const { solo, pooled } = estimate.data;
  return (
    <div className="flex flex-col gap-3 border-3 border-ink bg-info p-4 shadow-brutal">
      <p className="text-lg">
        Alone: <MoneyText paisa={solo.totalPaisa} />
        {isSharing ? (
          <>
            {' '}
            · Shared: <MoneyText paisa={pooled.totalPaisa} />
          </>
        ) : null}
      </p>
      {isSharing ? (
        <p className="text-sm">
          You pay the shared price only if someone else is in the Tesla when the trip starts.
        </p>
      ) : null}
      <details>
        <summary className="cursor-pointer font-bold uppercase">Show the breakdown</summary>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <FareBreakdown title="Alone" fare={solo} />
          {isSharing ? <FareBreakdown title="Shared" fare={pooled} /> : null}
        </div>
      </details>
    </div>
  );
}
