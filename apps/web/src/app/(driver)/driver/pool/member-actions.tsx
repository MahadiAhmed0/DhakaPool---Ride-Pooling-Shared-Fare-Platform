'use client';
// The steps for one passenger: drop them off once the trip is under way (FR-DRV-09), or mark a
// no-show when they never came (FR-DRV-12). Each appears only when that passenger's status allows
// it (NFR-USA-03); the no-show asks first, because the passenger is charged a fee (BR-07).
import type { DriverPoolMember } from '@dhakapool/shared';
import { useState } from 'react';
import { useTripCommand } from '@/components/pools/use-trip-command';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { ErrorState } from '@/components/ui/states';
import { driverMayMoveRide } from '@/lib/driver-moves';

type MemberActionsProps = { poolId: string; member: DriverPoolMember };

function NoShowButton({ poolId, member }: MemberActionsProps) {
  const [isAsking, setIsAsking] = useState(false);
  const noShow = useTripCommand(`/${poolId}/members/${member.rideId}/no-show`);
  return (
    <>
      <Button variant="danger" onClick={() => setIsAsking(true)}>
        No-show
      </Button>
      <ConfirmDialog
        open={isAsking}
        title={`Mark ${member.passengerName} as a no-show?`}
        confirmLabel="Mark no-show"
        cancelLabel="Keep waiting"
        isWorking={noShow.isPending}
        onConfirm={() => noShow.mutate(undefined, { onSettled: () => setIsAsking(false) })}
        onClose={() => setIsAsking(false)}
      >
        <p>
          {member.passengerName} leaves the trip and is charged the cancellation fee. You can do
          this only after waiting at the pickup.
        </p>
      </ConfirmDialog>
      {noShow.isError ? <ErrorState message={noShow.error.message} /> : null}
    </>
  );
}

export function MemberActions({ poolId, member }: MemberActionsProps) {
  const dropOff = useTripCommand(`/${poolId}/members/${member.rideId}/complete`);
  const canDropOff = driverMayMoveRide(member.status, 'COMPLETED');
  const canMarkNoShow = driverMayMoveRide(member.status, 'CANCELLED');
  if (!canDropOff && !canMarkNoShow) {
    return null;
  }
  return (
    <div className="flex flex-wrap gap-3">
      {canDropOff ? (
        <Button onClick={() => dropOff.mutate()} disabled={dropOff.isPending}>
          {dropOff.isPending ? 'Saving…' : `Drop off ${member.passengerName}`}
        </Button>
      ) : null}
      {canMarkNoShow ? <NoShowButton poolId={poolId} member={member} /> : null}
      {dropOff.isError ? <ErrorState message={dropOff.error.message} /> : null}
    </div>
  );
}
