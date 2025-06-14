module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.ts', '**/*.test.ts'],
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  moduleNameMapper: {
    '^@codequal/(.*)$': '<rootDir>/../$1/src',
  },
  transformIgnorePatterns: [
    'node_modules/(?!(@codequal)/)',
  ],
};
