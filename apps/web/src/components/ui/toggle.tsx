// An on/off choice built on a real checkbox, so it works with the keyboard and screen readers and
// shows a tick when on (colour is never the only signal, ADR-0013).
import type { InputHTMLAttributes } from 'react';

type ToggleProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> & {
  id: string;
  label: string;
  hint?: string;
};

export function Toggle({ id, label, hint, ...rest }: ToggleProps) {
  return (
    <div className="flex items-start gap-3 border-3 border-ink bg-white p-3 shadow-brutal-small">
      <input
        id={id}
        type="checkbox"
        className="peer mt-0.5 h-6 w-6 shrink-0 cursor-pointer accent-black disabled:cursor-not-allowed"
        {...rest}
      />
      <label
        htmlFor={id}
        className="cursor-pointer peer-disabled:cursor-not-allowed peer-disabled:opacity-60"
      >
        <span className="block font-bold uppercase tracking-wide">{label}</span>
        {hint ? <span className="block text-sm">{hint}</span> : null}
      </label>
    </div>
  );
}
