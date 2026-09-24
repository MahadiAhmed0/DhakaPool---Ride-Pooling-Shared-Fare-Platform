// Puts the API's answer next to the right form fields. A 400 VALIDATION_ERROR names each field;
// anything else becomes one message for the whole form.
import type { FieldValues, Path, UseFormSetError } from 'react-hook-form';
import { ApiError } from './api-client';

export function messageOf(error: unknown): string {
  return error instanceof ApiError ? error.message : 'Something went wrong. Please try again.';
}

// Returns the message to show above the form, or null when every problem was shown by its field.
export function showApiErrors<T extends FieldValues>(
  error: unknown,
  setError: UseFormSetError<T>,
): string | null {
  const fields = error instanceof ApiError ? error.fields : [];
  if (fields.length === 0) {
    return messageOf(error);
  }
  for (const field of fields) {
    setError(field.path as Path<T>, { message: field.message });
  }
  return null;
}
