import js from '@eslint/js'

export default [
  { ignores: ['dist/**'] },
  {
    ...js.configs.recommended,
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        chrome: 'readonly',
        crypto: 'readonly',
        document: 'readonly',
        window: 'readonly',
        location: 'readonly',
        fetch: 'readonly',
        atob: 'readonly',
        btoa: 'readonly',
        URLSearchParams: 'readonly',
        HTMLElement: 'readonly',
        HTMLInputElement: 'readonly',
        TextDecoder: 'readonly',
        TextEncoder: 'readonly',
        Uint8Array: 'readonly',
        Element: 'readonly',
      },
    },
    rules: {
      ...js.configs.recommended.rules,
      'no-console': 'warn',
      'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },
  {
    files: ['scripts/**/*.mjs', 'vite.config.js'],
    languageOptions: {
      globals: {
        process: 'readonly',
        Buffer: 'readonly',
        console: 'readonly',
        __dirname: 'readonly',
      },
    },
    rules: {
      'no-console': 'off',
    },
  },
]
