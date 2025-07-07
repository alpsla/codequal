module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.test.ts'],
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  moduleFileExtensions: ['ts', 'js', 'json', 'node'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.test.ts',
    '!src/**/*.d.ts',
    '!src/index.ts',
  ],
  moduleNameMapper: {
    '@codequal/core/(.*)': '<rootDir>/../../packages/core/src/$1',
    '@codequal/agents/(.*)': '<rootDir>/../../packages/agents/src/$1',
    '@codequal/database/(.*)': '<rootDir>/../../packages/database/src/$1',
    '@codequal/testing/(.*)': '<rootDir>/../../packages/testing/src/$1',
  },
  testPathIgnorePatterns: ['/node_modules/', '/dist/'],
  setupFilesAfterEnv: ['<rootDir>/src/__tests__/setup.ts'],
  globals: {
    'ts-jest': {
      tsconfig: {
        esModuleInterop: true,
        allowJs: true,
      },
    },
  },
};