// An on/off choice built on a real checkbox, so it works with the keyboard and screen readers and
// shows a tick when on (colour is never the only signal, ADR-0013). The label is the name that is
// read out; the hint is read after it as a description.
import type { InputHTMLAttributes } from 'react';

type ToggleProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> & {
  id: string;
  label: string;
  hint?: string;
};

export function Toggle({ id, label, hint, ...rest }: ToggleProps) {
  const hintId = `${id}-hint`;
  return (
    <div className="flex items-start gap-3 border-3 border-ink bg-white p-3 shadow-brutal-small">
      <input
        id={id}
        type="checkbox"
        aria-describedby={hint ? hintId : undefined}
        className="peer mt-0.5 h-6 w-6 shrink-0 cursor-pointer accent-black disabled:cursor-not-allowed"
        {...rest}
      />
      <div className="peer-disabled:opacity-60">
        <label htmlFor={id} className="block cursor-pointer font-bold uppercase tracking-wide">
          {label}
        </label>
        {hint ? (
          <p id={hintId} className="text-sm">
            {hint}
          </p>
        ) : null}
      </div>
    </div>
  );
}
