module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  rootDir: '.',
  testMatch: ['<rootDir>/test/**/*.{test,spec}.{js,ts}', '<rootDir>/api/src/**/*.{test,spec}.{js,ts}'],
  collectCoverageFrom: [
    'api/src/**/*.{ts,js}',
    '!api/src/**/*.d.ts',
  ],
  testPathIgnorePatterns: ['/node_modules/'],
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
};