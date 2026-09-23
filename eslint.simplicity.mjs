// Shared "keep it simple" lint rules (docs/CODING_CONVENTIONS.md).
// Every workspace uses these so that no file or function grows too big to read in one go.

export const simplicityRules = {
  'max-lines': ['error', { max: 200, skipBlankLines: true, skipComments: true }],
  'max-lines-per-function': ['error', { max: 50, skipBlankLines: true, skipComments: true }],
  complexity: ['error', 8],
  'max-depth': ['error', 3],
  'no-nested-ternary': 'error',
  'no-magic-numbers': 'off',
  eqeqeq: ['error', 'always'],
  'prefer-const': 'error',
  '@typescript-eslint/no-explicit-any': 'error',
  '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
};

// Tests are long lists of examples, so the function-length limit does not apply to them.
export const testFileOverrides = {
  files: ['**/*.test.ts', '**/test/**/*.ts'],
  rules: {
    'max-lines-per-function': 'off',
    'max-lines': ['error', { max: 400, skipBlankLines: true, skipComments: true }],
  },
};
