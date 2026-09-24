// How full the Tesla is (FR-DRV-06): one chunky block per seat, plus the numbers in words.
export function SeatMeter({ occupied, capacity }: { occupied: number; capacity: number }) {
  const seats = Array.from({ length: capacity }, (_, index) => index < occupied);
  return (
    <div className="flex items-center gap-3">
      <div className="flex gap-1" aria-hidden="true">
        {seats.map((isTaken, index) => (
          <span
            key={index}
            className={`h-8 w-8 border-3 border-ink ${isTaken ? 'bg-warning' : 'bg-white'}`}
          />
        ))}
      </div>
      <span className="font-bold">
        {occupied} / {capacity} seats taken
      </span>
    </div>
  );
}
