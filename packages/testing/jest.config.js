module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.ts', '**/*.test.ts'],
  transform: {
    '^.+\\.ts$': ['ts-jest', {}],
  },
  moduleNameMapper: {
    '^@codequal/agents/(.*)$': '<rootDir>/../agents/src/$1',
    '^@codequal/core/(.*)$': '<rootDir>/../core/src/$1',
    '^@codequal/database/(.*)$': '<rootDir>/../database/src/$1',
    '^@codequal/(.*)$': '<rootDir>/../$1/src',
  },
  transformIgnorePatterns: [
    'node_modules/(?!(@codequal)/)',
  ],
};
