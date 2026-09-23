// ESLint config for the API, the shared package and root scripts.
// The web app has its own config (apps/web/eslint.config.mjs) that adds the Next.js rules.
import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import { simplicityRules, testFileOverrides } from './eslint.simplicity.mjs';

export default tseslint.config(
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/coverage/**',
      '**/src/generated/**',
      'apps/web/**',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: { globals: { ...globals.node } },
    rules: {
      ...simplicityRules,
      '@typescript-eslint/explicit-module-boundary-types': 'error',
    },
  },
  testFileOverrides,
);
