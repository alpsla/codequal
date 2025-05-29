/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src/', '<rootDir>/tests/'],
  testMatch: ['**/*.test.ts', '**/*.test.js'],
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      tsconfig: './tsconfig.test.json'
    }],
    '^.+\\.jsx?$': ['babel-jest']
  },
  moduleNameMapper: {
    '^@codequal/core/(.*)$': '<rootDir>/../core/src/$1',
    '^@codequal/core$': '<rootDir>/../core/src',
    '^@codequal/agents/(.*)$': '<rootDir>/src/$1',
    '^@codequal/agents$': '<rootDir>/src'
  },
  setupFilesAfterEnv: ['<rootDir>/tests/jest.setup.ts'],
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts'
  ],
  transformIgnorePatterns: [
    'node_modules/(?!(@codequal)/)'
  ]
};
