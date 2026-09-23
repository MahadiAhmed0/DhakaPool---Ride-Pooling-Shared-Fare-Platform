// ESLint config for the web app: Next.js rules plus the shared simplicity rules.
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTypescript from 'eslint-config-next/typescript';
import { simplicityRules } from '../../eslint.simplicity.mjs';

const config = [
  { ignores: ['.next/**', 'next-env.d.ts', 'node_modules/**'] },
  ...nextVitals,
  ...nextTypescript,
  { rules: simplicityRules },
];

export default config;
