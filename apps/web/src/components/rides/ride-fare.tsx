// The passenger's own fare, and nobody else's (FR-PAX-06, FR-FARE-04). Before the start it is an
// estimate; from the start it is the fixed fare (BR-12). Payments and fees follow (FR-PAY-03…05).
import type { RidePayment, RideView } from '@dhakapool/shared';
import { Badge } from '@/components/ui/badge';
import { FareBreakdown } from '@/components/ui/fare-breakdown';
import { MoneyText } from '@/components/ui/money-text';
import { PAYMENT_STATUS_LABELS } from '@/lib/labels';

const PAYMENT_TONES = { PAID: 'success', PENDING_CASH: 'action', UNPAID: 'warning' } as const;
const CHARGE_LABELS = { RIDE: 'Ride fare', CANCELLATION_FEE: 'Cancellation fee' } as const;
const METHOD_LABELS = { TESLAPAY: 'TeslaPay', CASH: 'cash' } as const;

function PaymentLine({ payment }: { payment: RidePayment }) {
  return (
    <li className="flex flex-wrap items-center gap-2">
      <span>{CHARGE_LABELS[payment.charge]}</span>
      <MoneyText paisa={payment.amountPaisa} />
      <Badge tone={PAYMENT_TONES[payment.status]}>
        {PAYMENT_STATUS_LABELS[payment.status]} · {METHOD_LABELS[payment.method]}
      </Badge>
    </li>
  );
}

function Estimate({ ride }: { ride: RideView }) {
  const { solo, pooled } = ride.fare.estimate;
  return (
    <div className="flex flex-col gap-2">
      <p>
        Estimate: <MoneyText paisa={solo.totalPaisa} /> alone
        {pooled ? (
          <>
            , <MoneyText paisa={pooled.totalPaisa} /> if shared
          </>
        ) : null}
        . The fare is fixed when the trip starts.
      </p>
      <details>
        <summary className="cursor-pointer font-bold uppercase">Show the breakdown</summary>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <FareBreakdown title="Alone" fare={solo} />
          {pooled ? <FareBreakdown title="Shared" fare={pooled} /> : null}
        </div>
      </details>
    </div>
  );
}

export function RideFare({ ride }: { ride: RideView }) {
  const { locked } = ride.fare;
  return (
    <div className="flex flex-col gap-3">
      {locked ? (
        <FareBreakdown title={locked.pooled ? 'Your fare (shared)' : 'Your fare'} fare={locked} />
      ) : null}
      {!locked && ride.status !== 'CANCELLED' && ride.status !== 'EXPIRED' ? (
        <Estimate ride={ride} />
      ) : null}
      {ride.payments.length > 0 ? (
        <ul className="flex flex-col gap-2">
          {ride.payments.map((payment) => (
            <PaymentLine key={payment.charge} payment={payment} />
          ))}
        </ul>
      ) : null}
    </div>
  );
}
