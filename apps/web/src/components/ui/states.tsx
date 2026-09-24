// The three states every data-driven view has (NFR-USA-01): loading, empty, and an error with a
// way to try again.
import type { ReactNode } from 'react';
import { Button } from './button';

export function LoadingState({ label = 'Loading…' }: { label?: string }) {
  return (
    <div
      role="status"
      className="border-3 border-ink bg-info p-5 font-bold uppercase shadow-brutal"
    >
      <span className="inline-block animate-pulse">{label}</span>
    </div>
  );
}

export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="border-3 border-dashed border-ink bg-white p-5">
      <p className="font-display text-lg uppercase">{title}</p>
      {children ? <div className="mt-3">{children}</div> : null}
    </div>
  );
}

type ErrorStateProps = { message: string; onRetry?: () => void };

export function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <div role="alert" className="border-3 border-ink bg-danger p-5 shadow-brutal">
      <p className="font-bold">{message}</p>
      {onRetry ? (
        <Button variant="secondary" className="mt-4" onClick={onRetry}>
          Try again
        </Button>
      ) : null}
    </div>
  );
}
