import eslint from '@eslint/js'
import typescriptPlugin from '@typescript-eslint/eslint-plugin'
import typescriptParser from '@typescript-eslint/parser'
import prettier from 'eslint-config-prettier'
import react from 'eslint-plugin-react'
import reactHooks from 'eslint-plugin-react-hooks'
import globals from 'globals'

const importOrderRule = {
  'sort-imports': ['error', { ignoreDeclarationSort: true }],
}

const typescriptRules = {
  ...eslint.configs.recommended.rules,
  ...typescriptPlugin.configs['eslint-recommended'].overrides[0].rules,
  ...typescriptPlugin.configs.recommended.rules,
  ...importOrderRule,
}

export default [
  {
    ignores: ['.wrangler/**', 'build/**', 'node_modules/**', 'public/dicts/**'],
  },
  {
    files: ['**/*.{js,cjs}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'commonjs',
      globals: globals.node,
    },
    rules: {
      ...eslint.configs.recommended.rules,
      ...importOrderRule,
    },
  },
  {
    files: ['**/*.mjs'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: globals.node,
    },
    rules: {
      ...eslint.configs.recommended.rules,
      ...importOrderRule,
    },
  },
  {
    files: ['vite.config.ts'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      parser: typescriptParser,
      globals: globals.node,
    },
    plugins: {
      '@typescript-eslint': typescriptPlugin,
    },
    rules: typescriptRules,
  },
  {
    files: ['src/**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      parser: typescriptParser,
      globals: globals.browser,
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
    },
    plugins: {
      '@typescript-eslint': typescriptPlugin,
      react,
      'react-hooks': reactHooks,
    },
    settings: {
      react: { version: 'detect' },
    },
    rules: {
      ...typescriptRules,
      ...react.configs.flat.recommended.rules,
      ...react.configs.flat['jsx-runtime'].rules,
      'react-hooks/exhaustive-deps': 'warn',
      'react-hooks/rules-of-hooks': 'error',
      'react/prop-types': 'off',
    },
  },
  {
    files: ['worker/**/*.ts'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      parser: typescriptParser,
      globals: {
        ...globals.serviceworker,
        ...globals.webextensions,
      },
    },
    plugins: {
      '@typescript-eslint': typescriptPlugin,
    },
    rules: typescriptRules,
  },
  prettier,
]
