'use client';
// One passenger of the trip (FR-DRV-06): name, route, seats, status, how they pay and what they
// pay, plus the steps for this passenger. Their gender is never shown (A-20).
import type { DriverPoolMember } from '@dhakapool/shared';
import { CashCollectedButton } from '@/components/pools/cash-collected-button';
import { RideStatusBadge } from '@/components/ui/badge';
import { MoneyText } from '@/components/ui/money-text';
import { useZoneName } from '@/lib/hooks/use-zone-name';
import { PAYMENT_METHOD_LABELS, PAYMENT_STATUS_LABELS } from '@/lib/labels';
import { MemberActions } from './member-actions';

// BR-12: until the trip starts the fare is only an estimate; from the start it is fixed.
function MemberFare({ member }: { member: DriverPoolMember }) {
  if (member.lockedFarePaisa === null) {
    return (
      <span>
        Estimate <MoneyText paisa={member.estimatedFarePaisa} />
      </span>
    );
  }
  return (
    <span>
      Fare <MoneyText paisa={member.lockedFarePaisa} />
    </span>
  );
}

type PoolMemberRowProps = { poolId: string; member: DriverPoolMember };

export function PoolMemberRow({ poolId, member }: PoolMemberRowProps) {
  const zoneName = useZoneName();
  return (
    <li className="flex flex-col gap-3 border-3 border-ink bg-white p-4 shadow-brutal-small">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-display text-lg uppercase">{member.passengerName}</p>
        <RideStatusBadge status={member.status} />
      </div>
      <p className="font-bold">
        {zoneName(member.pickupZoneCode)} → {zoneName(member.destinationZoneCode)} · {member.seats}{' '}
        {member.seats === 1 ? 'seat' : 'seats'}
      </p>
      <p className="flex flex-wrap gap-x-3">
        <span>{PAYMENT_METHOD_LABELS[member.paymentMethod]}</span>
        <MemberFare member={member} />
        {member.paymentStatus ? <span>{PAYMENT_STATUS_LABELS[member.paymentStatus]}</span> : null}
      </p>
      <MemberActions poolId={poolId} member={member} />
      <CashCollectedButton poolId={poolId} member={member} />
    </li>
  );
}
