module.exports = {
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: 'module',
    ecmaFeatures: {
      jsx: true
    }
  },
  plugins: ['@typescript-eslint'],
  extends: [
    'eslint:recommended'
  ],
  rules: {
    '@typescript-eslint/no-unused-vars': ['error', { 'argsIgnorePattern': '^_' }],
    '@typescript-eslint/no-explicit-any': 'warn',
    'no-unused-vars': 'off', // Turn off base rule as we use TypeScript version
  },
  env: {
    browser: true,
    node: true,
    es6: true,
    jest: true
  },
  ignorePatterns: ['node_modules/', 'dist/', '*.js']
};