'use client';
// One past trip (FR-DRV-13): when, where from, how it ended, what it earned, and each passenger's
// fare and payment. The last passenger dropped off may still owe cash, so Cash collected is
// offered here too (FR-DRV-10).
import type { DriverPoolMember, DriverPoolView } from '@dhakapool/shared';
import { CashCollectedButton } from '@/components/pools/cash-collected-button';
import { PoolBadges } from '@/components/pools/pool-badges';
import { MoneyText } from '@/components/ui/money-text';
import { formatDateTime } from '@/lib/format';
import { useZoneName } from '@/lib/hooks/use-zone-name';
import { PAYMENT_METHOD_LABELS, PAYMENT_STATUS_LABELS, RIDE_STATUS_LABELS } from '@/lib/labels';

type PastMemberProps = { poolId: string; member: DriverPoolMember };

function PastMember({ poolId, member }: PastMemberProps) {
  const zoneName = useZoneName();
  return (
    <li className="flex flex-col gap-2 border-l-3 border-ink pl-3">
      <p className="font-bold">
        {member.passengerName} · {zoneName(member.destinationZoneCode)} ·{' '}
        {RIDE_STATUS_LABELS[member.status]}
      </p>
      <p className="flex flex-wrap gap-x-3 text-sm">
        <span>{PAYMENT_METHOD_LABELS[member.paymentMethod]}</span>
        {member.lockedFarePaisa === null ? null : <MoneyText paisa={member.lockedFarePaisa} />}
        {member.paymentStatus ? <span>{PAYMENT_STATUS_LABELS[member.paymentStatus]}</span> : null}
      </p>
      <CashCollectedButton poolId={poolId} member={member} />
    </li>
  );
}

export function PoolHistoryItem({ pool }: { pool: DriverPoolView }) {
  const zoneName = useZoneName();
  return (
    <li className="flex flex-col gap-3 border-3 border-ink bg-white p-4 shadow-brutal-small">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-bold">{formatDateTime(pool.createdAt)}</p>
        <PoolBadges pool={pool} />
      </div>
      <p className="text-lg font-bold">
        From {zoneName(pool.pickupZoneCode)} · {pool.members.length}{' '}
        {pool.members.length === 1 ? 'passenger' : 'passengers'}
      </p>
      <p>
        Fares on this trip <MoneyText paisa={pool.totalFarePaisa} />
      </p>
      {pool.members.length > 0 ? (
        <ul className="flex flex-col gap-3">
          {pool.members.map((member) => (
            <PastMember key={member.rideId} poolId={pool.id} member={member} />
          ))}
        </ul>
      ) : null}
    </li>
  );
}
