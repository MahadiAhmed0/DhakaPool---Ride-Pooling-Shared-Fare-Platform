// Form controls with their labels (NFR-USA-05: every control has a label). Field shows the label,
// the control and its error message. Input and Select pass every prop through, so they work with
// react-hook-form's register(), including its ref.
import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from 'react';

const CONTROL_CLASSES =
  'w-full border-3 border-ink bg-white px-3 py-3 text-base shadow-brutal-small ' +
  'aria-invalid:bg-danger/20';

type FieldProps = { id: string; label: string; error?: string; hint?: string; children: ReactNode };

export function Field({ id, label, error, hint, children }: FieldProps) {
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="font-bold uppercase tracking-wide">
        {label}
      </label>
      {children}
      {hint ? <p className="text-sm">{hint}</p> : null}
      {error ? (
        <p
          id={`${id}-error`}
          role="alert"
          className="border-3 border-ink bg-danger px-2 py-1 font-bold"
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={CONTROL_CLASSES} {...props} />;
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={CONTROL_CLASSES} {...props} />;
}

type TextFieldProps = InputHTMLAttributes<HTMLInputElement> & {
  id: string;
  label: string;
  hint?: string;
  error?: string;
};

// A labelled text input with its hint and error, the most common form field. Screen readers
// announce the error with the input (aria-describedby).
export function TextField({ id, label, hint, error, ...inputProps }: TextFieldProps) {
  return (
    <Field id={id} label={label} hint={hint} error={error}>
      <Input
        id={id}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : undefined}
        {...inputProps}
      />
    </Field>
  );
}
