'use client';
// A password input with a control that reveals or hides what has been typed (FR-AUTH-08).
// Each field starts hidden, and revealing one never reveals the other.
import { useState, type InputHTMLAttributes } from 'react';
import { Button } from './button';
import { Field, Input } from './field';

type PasswordFieldProps = InputHTMLAttributes<HTMLInputElement> & {
  id: string;
  label: string;
  hint?: string;
  error?: string;
};

export function PasswordField({ id, label, hint, error, ...inputProps }: PasswordFieldProps) {
  const [revealed, setRevealed] = useState(false);
  return (
    <Field id={id} label={label} hint={hint} error={error}>
      <div className="flex items-start gap-2">
        <Input
          id={id}
          type={revealed ? 'text' : 'password'}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${id}-error` : undefined}
          {...inputProps}
        />
        <Button
          variant="secondary"
          onClick={() => setRevealed((shown) => !shown)}
          aria-controls={id}
          aria-pressed={revealed}
          className="shrink-0"
        >
          {revealed ? 'Hide' : 'Show'}
        </Button>
      </div>
    </Field>
  );
}
