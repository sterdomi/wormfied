import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';
import globals from 'globals';

export default tseslint.config(
  { ignores: ['dist/**', 'coverage/**', 'node_modules/**'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['src/**/*.ts'],
    languageOptions: {
      globals: { ...globals.browser },
    },
  },
  {
    files: [
      'vite.config.ts',
      'eslint.config.js',
      'src/**/*.{test,spec}.ts',
      'tools/**/*.{js,mjs}',
    ],
    languageOptions: {
      globals: { ...globals.node },
    },
  },
  {
    // Service Worker (Instruktion 20, Punkt 2): eigener globaler Scope
    // (`self`, `caches`, `fetch`, ...) statt Browser-`window`-Globals.
    files: ['public/sw.js'],
    languageOptions: {
      globals: { ...globals.serviceworker },
    },
  },
  prettier,
);
