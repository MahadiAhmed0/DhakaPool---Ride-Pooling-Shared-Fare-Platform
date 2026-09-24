// Every step the ride went through, with the time and who made it happen (FR-PAX-10), taken from
// the audit trail.
import type { ActorRole, RideTimelineEntry } from '@dhakapool/shared';
import { formatTime } from '@/lib/format';
import { RIDE_STATUS_LABELS } from '@/lib/labels';

const ACTOR_LABELS: Record<ActorRole, string> = {
  PASSENGER: 'by you',
  DRIVER: 'by your driver',
  SYSTEM: 'automatically',
};

// Reason codes (ERD §3) in plain words.
const REASON_LABELS: Record<string, string> = {
  PASSENGER_CANCELLED: 'you cancelled',
  DRIVER_CANCELLED_POOL: 'the driver cancelled the trip; you went back in the queue',
  NO_SHOW: 'marked as a no-show',
  EXPIRED: 'no driver accepted in time',
};

function describe(entry: RideTimelineEntry): string {
  const reason = entry.reason ? REASON_LABELS[entry.reason] : undefined;
  return reason ?? ACTOR_LABELS[entry.actorRole];
}

export function RideTimeline({ timeline }: { timeline: RideTimelineEntry[] }) {
  return (
    <ol className="flex flex-col gap-2">
      {timeline.map((entry, index) => (
        <li
          key={`${entry.at}-${index}`}
          className="flex flex-wrap items-baseline gap-x-3 border-l-3 border-ink pl-3"
        >
          <span className="font-bold tabular-nums">{formatTime(entry.at)}</span>
          <span className="font-bold uppercase">{RIDE_STATUS_LABELS[entry.toStatus]}</span>
          <span className="text-sm">{describe(entry)}</span>
        </li>
      ))}
    </ol>
  );
}
