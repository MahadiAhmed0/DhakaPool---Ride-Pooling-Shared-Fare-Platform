'use client';
// The trip-wide steps: arrived at the pickup (FR-DRV-07), start the trip, which fixes every fare
// (FR-DRV-08, BR-12), and cancel the trip before it starts (FR-DRV-11). Each button appears only
// when the pool's status allows that move (NFR-USA-03).
import type { DriverPoolView } from '@dhakapool/shared';
import { useState } from 'react';
import { useTripCommand } from '@/components/pools/use-trip-command';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { ErrorState } from '@/components/ui/states';
import { driverMayMovePool } from '@/lib/driver-moves';

function CancelTripButton({ poolId }: { poolId: string }) {
  const [isAsking, setIsAsking] = useState(false);
  const cancel = useTripCommand(`/${poolId}/cancel`);
  return (
    <>
      <Button variant="danger" onClick={() => setIsAsking(true)}>
        Cancel trip
      </Button>
      <ConfirmDialog
        open={isAsking}
        title="Cancel this trip?"
        confirmLabel="Cancel trip"
        cancelLabel="Keep the trip"
        isWorking={cancel.isPending}
        onConfirm={() => cancel.mutate(undefined, { onSettled: () => setIsAsking(false) })}
        onClose={() => setIsAsking(false)}
      >
        <p>Every passenger goes back to waiting for a driver. Nobody is charged.</p>
      </ConfirmDialog>
      {cancel.isError ? <ErrorState message={cancel.error.message} /> : null}
    </>
  );
}

export function PoolActions({ pool }: { pool: DriverPoolView }) {
  const arrive = useTripCommand(`/${pool.id}/arrive`);
  const start = useTripCommand(`/${pool.id}/start`);
  const failed = arrive.error ?? start.error;
  return (
    <div className="flex flex-col gap-3">
      {failed ? <ErrorState message={failed.message} /> : null}
      <div className="flex flex-wrap gap-3">
        {driverMayMovePool(pool.status, 'DRIVER_ARRIVED') ? (
          <Button onClick={() => arrive.mutate()} disabled={arrive.isPending}>
            {arrive.isPending ? 'Saving…' : 'Arrived at pickup'}
          </Button>
        ) : null}
        {driverMayMovePool(pool.status, 'STARTED') ? (
          <Button onClick={() => start.mutate()} disabled={start.isPending}>
            {start.isPending ? 'Starting…' : 'Start trip'}
          </Button>
        ) : null}
        {driverMayMovePool(pool.status, 'CANCELLED') ? <CancelTripButton poolId={pool.id} /> : null}
      </div>
    </div>
  );
}
