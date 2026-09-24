// Where the ride is on its way from request to drop-off (NFR-USA-02), as numbered steps.
// A cancelled or expired ride shows its badge instead, because it left the path.
import type { RideStatus } from '@dhakapool/shared';
import { RIDE_STATUS_LABELS } from '@/lib/labels';
import { RideStatusBadge } from './badge';

const STEPS: RideStatus[] = ['REQUESTED', 'MATCHED', 'DRIVER_ARRIVED', 'STARTED', 'COMPLETED'];

// Done steps are lime, the current step is yellow, and the steps still to come are white.
function stepColour(index: number, currentIndex: number): string {
  if (index < currentIndex) {
    return 'bg-success';
  }
  return index === currentIndex ? 'bg-action' : 'bg-white';
}

export function StatusStepper({ status }: { status: RideStatus }) {
  const currentIndex = STEPS.indexOf(status);
  if (currentIndex === -1) {
    return <RideStatusBadge status={status} />;
  }
  return (
    <ol className="grid grid-cols-1 gap-2 sm:grid-cols-5">
      {STEPS.map((step, index) => {
        const isDone = index < currentIndex;
        const isCurrent = index === currentIndex;
        return (
          <li
            key={step}
            aria-current={isCurrent ? 'step' : undefined}
            className={`flex items-center gap-2 border-3 border-ink px-2 py-2 text-sm font-bold uppercase ${stepColour(index, currentIndex)}`}
          >
            <span aria-hidden="true">{isDone ? '✓' : index + 1}</span>
            <span>{RIDE_STATUS_LABELS[step]}</span>
          </li>
        );
      })}
    </ol>
  );
}
