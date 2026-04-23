import js from '@eslint/js';
import globals from 'globals';

const commonRules = {
  'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
  'prefer-const': 'warn',
  eqeqeq: ['error', 'smart'],
};

export default [
  {
    ignores: ['node_modules/**', 'dist/**', 'docs/**', '.claude/**'],
  },
  js.configs.recommended,
  // Extension files (run in the browser via <script> tags — all share one global scope)
  {
    files: ['popup.js', 'settings.js', 'crypto.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'script',
      globals: {
        ...globals.browser,
        chrome: 'readonly',
      },
    },
    rules: commonRules,
  },
  // popup.js and settings.js consume functions defined in crypto.js
  {
    files: ['popup.js', 'settings.js'],
    languageOptions: {
      globals: {
        encryptValue: 'readonly',
        decryptValue: 'readonly',
      },
    },
  },
  // crypto.js exposes globals for sibling scripts — suppress file-scoped unused warnings
  {
    files: ['crypto.js'],
    rules: {
      'no-unused-vars': 'off',
    },
  },
  // Node scripts (build tooling) — CommonJS, node globals only
  {
    files: ['scripts/**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'commonjs',
      globals: globals.node,
    },
    rules: commonRules,
  },
];
