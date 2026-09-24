// Lists are shown a page at a time, newest first (FR-PAX-09, FR-DRV-13, FR-PAY-01).
// The cursor is the id of the last item on the previous page.
import { z } from 'zod';

export const PAGE_SIZE = 10;
export const MAX_PAGE_SIZE = 50;

export const pageFields = {
  cursor: z.uuid('The cursor is not valid.').optional(),
  limit: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(PAGE_SIZE),
};

export const pageQuerySchema = z.object(pageFields);
export type PageQuery = z.infer<typeof pageQuerySchema>;
