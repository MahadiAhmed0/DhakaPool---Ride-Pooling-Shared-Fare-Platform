// Shows an amount of paisa as taka with two decimals: 6600 → ৳66.00 (NFR-USA-04, FR-FARE-06).
import { formatPaisa } from '@dhakapool/shared';

export function MoneyText({ paisa, className = '' }: { paisa: number; className?: string }) {
  return <span className={`font-bold tabular-nums ${className}`}>{formatPaisa(paisa)}</span>;
}
