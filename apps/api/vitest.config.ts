// Test runner configuration (ADR-0011). Tests use their own database, never the development one.
import { defineConfig } from 'vitest/config';

const TEST_DATABASE_URL =
  process.env['TEST_DATABASE_URL'] ??
  'postgresql://dhakapool:change-me@localhost:5432/dhakapool_test';

export default defineConfig({
  test: {
    include: ['test/**/*.test.ts'],
    env: {
      NODE_ENV: 'test',
      LOG_LEVEL: 'silent',
      DATABASE_URL: TEST_DATABASE_URL,
    },
    // Test files share one database, so they run one after another.
    fileParallelism: false,
  },
});
