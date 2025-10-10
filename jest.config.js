module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testTimeout: 30000,
  setupFilesAfterEnv: ['<rootDir>/setup-tests.js'],
  moduleNameMapper: {
    '^@codequal/([^/]+)/(.*)$': '<rootDir>/packages/$1/src/$2',
    '^@codequal/(.*)$': '<rootDir>/packages/$1/src'
  },
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/build/',
    '/.turbo/',
    '/archive/',
    '/apps/.*/src/__tests__/integration/',
    '/apps/.*/src/__tests__/routes/',
    '/packages/testing/src/integration/',
    '/packages/core/src/services/.*/__tests__/',
    '/packages/core/src/services/deepwiki-tools/__tests__/'
  ]
};
