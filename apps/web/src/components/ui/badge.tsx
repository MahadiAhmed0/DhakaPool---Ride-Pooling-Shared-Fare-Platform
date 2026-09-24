// Chunky coloured labels (ADR-0013). StatusBadge gives each ride or pool status its colour, and
// always shows the words too, so colour is never the only signal.
import type { PoolStatus, RideStatus } from '@dhakapool/shared';
import type { ReactNode } from 'react';
import { POOL_STATUS_LABELS, RIDE_STATUS_LABELS } from '@/lib/labels';

export type BadgeTone = 'info' | 'action' | 'warning' | 'success' | 'danger' | 'muted' | 'plain';

const TONE_CLASSES: Record<BadgeTone, string> = {
  info: 'bg-info',
  action: 'bg-action',
  warning: 'bg-warning',
  success: 'bg-success',
  danger: 'bg-danger',
  muted: 'bg-muted',
  plain: 'bg-white',
};

export function Badge({ tone = 'plain', children }: { tone?: BadgeTone; children: ReactNode }) {
  return (
    <span
      className={`inline-block border-3 border-ink px-2 py-0.5 text-sm font-bold uppercase tracking-wide ${TONE_CLASSES[tone]}`}
    >
      {children}
    </span>
  );
}

const STATUS_TONES: Record<RideStatus | PoolStatus, BadgeTone> = {
  REQUESTED: 'info',
  OPEN: 'info',
  MATCHED: 'action',
  DRIVER_ARRIVED: 'action',
  STARTED: 'warning',
  COMPLETED: 'success',
  CANCELLED: 'muted',
  EXPIRED: 'muted',
};

export function RideStatusBadge({ status }: { status: RideStatus }) {
  return <Badge tone={STATUS_TONES[status]}>{RIDE_STATUS_LABELS[status]}</Badge>;
}

export function PoolStatusBadge({ status }: { status: PoolStatus }) {
  return <Badge tone={STATUS_TONES[status]}>{POOL_STATUS_LABELS[status]}</Badge>;
}
