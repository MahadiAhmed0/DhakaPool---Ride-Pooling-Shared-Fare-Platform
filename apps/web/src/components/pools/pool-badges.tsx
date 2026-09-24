// The badges of a trip: its status, whether it can be shared, and its same-gender rule (BR-18).
// Only the rule is shown, never a passenger's gender (A-20).
import type { DriverPoolView } from '@dhakapool/shared';
import { Badge, PoolStatusBadge } from '@/components/ui/badge';
import { RESTRICTION_LABELS } from '@/lib/labels';

export function PoolBadges({ pool }: { pool: DriverPoolView }) {
  return (
    <div className="flex flex-wrap gap-2">
      <PoolStatusBadge status={pool.status} />
      {pool.isPrivate ? <Badge tone="plain">Not shared</Badge> : null}
      {pool.genderRestriction === 'NONE' ? null : (
        <Badge tone="warning">{RESTRICTION_LABELS[pool.genderRestriction]}</Badge>
      )}
    </div>
  );
}
