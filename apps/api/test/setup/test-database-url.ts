// The database used by automated tests — never the development database (ADR-0011).
// Docker Compose sets TEST_DATABASE_URL; the default matches the local compose database.

export const TEST_DATABASE_URL =
  process.env['TEST_DATABASE_URL'] ??
  'postgresql://dhakapool:change-me@localhost:5432/dhakapool_test';
