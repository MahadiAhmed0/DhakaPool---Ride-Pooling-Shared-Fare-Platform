'use client';
// Cancelling a ride (FR-PAX-08). The button appears only when the API says cancelling is allowed,
// and the dialog states the fee, if any, before the passenger confirms (NFR-USA-06).
import { formatPaisa, type RideView } from '@dhakapool/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { ErrorState } from '@/components/ui/states';
import { api } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-keys';

function feeMessage(ride: RideView): string {
  const { feePaisa } = ride.cancellation;
  if (feePaisa === 0) {
    return 'Cancelling is free because your driver has not arrived yet.';
  }
  const driver = ride.trip?.driverName ?? 'Your driver';
  return `${driver} has already arrived, so a ${formatPaisa(feePaisa)} cancellation fee applies.`;
}

export function CancelRideButton({ ride }: { ride: RideView }) {
  const queryClient = useQueryClient();
  const [isAsking, setIsAsking] = useState(false);
  const cancel = useMutation({
    mutationFn: () => api.post(`/rides/${ride.id}/cancel`),
    onSettled: async () => {
      setIsAsking(false);
      // The ride, the lists, and the wallet (a fee may have been taken) all changed.
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['rides'] }),
        queryClient.invalidateQueries({ queryKey: queryKeys.wallet }),
      ]);
    },
  });

  if (!ride.cancellation.isAllowed) {
    return null;
  }
  const { feePaisa } = ride.cancellation;
  return (
    <div className="flex flex-col gap-3">
      {cancel.isError ? <ErrorState message={cancel.error.message} /> : null}
      <Button variant="danger" onClick={() => setIsAsking(true)}>
        Cancel ride
      </Button>
      <ConfirmDialog
        open={isAsking}
        title="Cancel this ride?"
        confirmLabel={feePaisa > 0 ? `Cancel and pay ${formatPaisa(feePaisa)}` : 'Cancel ride'}
        cancelLabel="Keep my ride"
        isWorking={cancel.isPending}
        onConfirm={() => cancel.mutate()}
        onClose={() => setIsAsking(false)}
      >
        <p>{feeMessage(ride)}</p>
      </ConfirmDialog>
    </div>
  );
}
