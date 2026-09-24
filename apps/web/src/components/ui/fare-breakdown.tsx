// A fare as a receipt (FR-FARE-04, BR-10): base + distance − pool discount, per seat, × seats.
// The lines always add up to the total shown.
import type { FareBreakdown as Fare } from '@dhakapool/shared';
import { MoneyText } from './money-text';

type FareBreakdownProps = { title: string; fare: Fare };

function Line({ label, paisa, sign = '' }: { label: string; paisa: number; sign?: string }) {
  return (
    <div className="flex justify-between gap-4 py-1">
      <dt>{label}</dt>
      <dd>
        {sign}
        <MoneyText paisa={paisa} />
      </dd>
    </div>
  );
}

export function FareBreakdown({ title, fare }: FareBreakdownProps) {
  return (
    <div className="border-3 border-ink bg-white p-4 font-mono text-sm shadow-brutal-small">
      <p className="mb-2 font-sans font-bold uppercase">{title}</p>
      <dl>
        <Line label="Base fare" paisa={fare.basePaisa} />
        <Line label="Distance" paisa={fare.distanceChargePaisa} />
        {fare.pooled ? (
          <Line label="Shared-ride discount" paisa={fare.discountPaisa} sign="−" />
        ) : null}
        <Line label="Per seat" paisa={fare.farePerSeatPaisa} />
        {fare.seats > 1 ? (
          <div className="flex justify-between py-1">
            <dt>Seats</dt>
            <dd className="font-bold">× {fare.seats}</dd>
          </div>
        ) : null}
        <div className="mt-2 flex justify-between border-t-3 border-dashed border-ink pt-2 text-base">
          <dt className="font-bold uppercase">Total</dt>
          <dd>
            <MoneyText paisa={fare.totalPaisa} />
          </dd>
        </div>
      </dl>
    </div>
  );
}
