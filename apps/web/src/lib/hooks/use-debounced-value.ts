'use client';
// Waits until a value has stopped changing for a moment, so typing or clicking through options
// does not send a request for every step (used for the live fare estimate).
import { useEffect, useState } from 'react';

export function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [settledValue, setSettledValue] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setSettledValue(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);
  return settledValue;
}
