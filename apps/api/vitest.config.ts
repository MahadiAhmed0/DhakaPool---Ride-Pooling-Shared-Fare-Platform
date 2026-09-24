// Test runner configuration (ADR-0011). Tests use their own database, never the development one.
import { defineConfig } from 'vitest/config';
import { TEST_DATABASE_URL } from './test/setup/test-database-url.ts';

export default defineConfig({
  test: {
    include: ['test/**/*.test.ts'],
    globalSetup: ['test/setup/global-setup.ts'],
    env: {
      NODE_ENV: 'test',
      LOG_LEVEL: 'silent',
      // Hashing at the lowest bcrypt cost keeps sign-in tests fast; production uses 12.
      BCRYPT_COST: '4',
      DATABASE_URL: TEST_DATABASE_URL,
    },
    // Test files share one database, so they run one after another.
    fileParallelism: false,
  },
});
