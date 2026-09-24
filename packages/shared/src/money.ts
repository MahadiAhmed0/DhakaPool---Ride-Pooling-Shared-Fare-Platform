// Formats money for display. Amounts are always whole paisa (1 Taka = 100 paisa, FR-FARE-06);
// only this function turns them into "৳66.00", using integer arithmetic so no rounding can creep in.

const PAISA_PER_TAKA = 100;

export function formatPaisa(paisa: number): string {
  const sign = paisa < 0 ? '−' : '';
  const absolutePaisa = Math.abs(paisa);
  const taka = Math.trunc(absolutePaisa / PAISA_PER_TAKA);
  const remainingPaisa = absolutePaisa % PAISA_PER_TAKA;
  return `${sign}৳${taka.toLocaleString('en-US')}.${String(remainingPaisa).padStart(2, '0')}`;
}
