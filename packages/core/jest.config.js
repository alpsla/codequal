module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.test.ts'],
  transform: {
    '^.+\\.ts$': ['ts-jest', {}],
  },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/__tests__/**',
  ],
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/src/services/',
    '/src/utils/',
    '/src/config/',
  ],
  forceExit: true,
  detectOpenHandles: true,
  passWithNoTests: true,
  testTimeout: 15000,
};