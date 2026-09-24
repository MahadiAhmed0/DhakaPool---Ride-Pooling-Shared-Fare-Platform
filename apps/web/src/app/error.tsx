'use client';
// Shown when a page could not load, for example while the API is down (NFR-USA-01, NFR-REL-03).
import { ErrorState } from '@/components/ui/states';

export default function PageError({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="mx-auto max-w-3xl p-4">
      <ErrorState
        message="Dhaka Tesla Pool is not answering right now. Please try again in a moment."
        onRetry={reset}
      />
    </main>
  );
}
