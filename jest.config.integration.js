module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testTimeout: 30000,
  setupFilesAfterEnv: ['<rootDir>/setup-tests.js'],
  moduleNameMapper: {
    // Map to the built dist files instead of src
    '^@codequal/core$': '<rootDir>/packages/core/dist/index.js',
    '^@codequal/core/(.*)$': '<rootDir>/packages/core/dist/$1',
    '^@codequal/agents$': '<rootDir>/packages/agents/dist/index.js',
    '^@codequal/agents/(.*)$': '<rootDir>/packages/agents/dist/$1',
    '^@codequal/database$': '<rootDir>/packages/database/dist/index.js',
    '^@codequal/database/(.*)$': '<rootDir>/packages/database/dist/$1',
    '^@codequal/mcp-hybrid$': '<rootDir>/packages/mcp-hybrid/dist/index.js',
    '^@codequal/mcp-hybrid/(.*)$': '<rootDir>/packages/mcp-hybrid/dist/$1'
  },
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/build/',
    '/.turbo/',
    '/archive/'
  ],
  // Transform TypeScript test files
  transform: {
    '^.+\\.ts$': 'ts-jest'
  },
  // Allow JavaScript imports
  transformIgnorePatterns: [
    'node_modules/(?!(@codequal)/)'
  ]
};
