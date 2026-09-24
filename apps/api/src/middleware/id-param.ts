// Reads an id from the URL, such as :id in /api/rides/:id.
// An id that is not even a valid UUID cannot belong to anything, so it is simply "not found" (404).
import type { Request } from 'express';
import { z } from 'zod';
import { NotFoundError } from '../domain/errors.ts';

export function idParam(req: Request, name: string, notFoundMessage: string): string {
  const id = z.uuid().safeParse(req.params[name]);
  if (!id.success) {
    throw new NotFoundError(notFoundMessage);
  }
  return id.data;
}
