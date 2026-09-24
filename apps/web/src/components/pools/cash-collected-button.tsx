'use client';
// "Cash collected" for a dropped-off passenger who pays in cash, or whose TeslaPay balance was too
// low (FR-DRV-10, BR-16). It appears only while the cash is still due.
import type { DriverPoolMember } from '@dhakapool/shared';
import { Button } from '@/components/ui/button';
import { MoneyText } from '@/components/ui/money-text';
import { ErrorState } from '@/components/ui/states';
import { useTripCommand } from './use-trip-command';

type CashCollectedButtonProps = { poolId: string; member: DriverPoolMember };

export function CashCollectedButton({ poolId, member }: CashCollectedButtonProps) {
  const collect = useTripCommand(`/${poolId}/members/${member.rideId}/cash-collected`);
  if (member.paymentStatus !== 'PENDING_CASH') {
    return null;
  }
  return (
    <div className="flex flex-col gap-2">
      {collect.isError ? <ErrorState message={collect.error.message} /> : null}
      <Button variant="secondary" onClick={() => collect.mutate()} disabled={collect.isPending}>
        {collect.isPending ? 'Saving…' : 'Cash collected'}
        {member.lockedFarePaisa === null ? null : <MoneyText paisa={member.lockedFarePaisa} />}
      </Button>
    </div>
  );
}
