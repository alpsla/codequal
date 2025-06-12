module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: [
    '**/__tests__/**/*.test.ts',
    '**/*.test.ts'
  ],
  // Projects for different test types
  projects: [
    {
      displayName: 'unit',
      preset: 'ts-jest',
      testEnvironment: 'node',
      transform: {
        '^.+\\.ts$': ['ts-jest', {
          tsconfig: {
            target: 'ES2020',
            module: 'commonjs',
            esModuleInterop: true,
            allowSyntheticDefaultImports: true,
            strict: true
          }
        }]
      },
      testMatch: [
        '<rootDir>/src/**/*.(mock|unit).test.ts',
        '<rootDir>/src/**/__tests__/**/*.(mock|unit).test.ts'
      ]
    },
    {
      displayName: 'integration',
      preset: 'ts-jest',
      testEnvironment: 'node',
      transform: {
        '^.+\\.ts$': ['ts-jest', {
          tsconfig: {
            target: 'ES2020',
            module: 'commonjs',
            esModuleInterop: true,
            allowSyntheticDefaultImports: true,
            strict: true
          }
        }]
      },
      testMatch: [
        '<rootDir>/src/**/*.(integration|real|debug).test.ts',
        '<rootDir>/src/**/__tests__/**/*.(integration|real|debug).test.ts'
      ]
    }
  ],
  // Global test timeout
  testTimeout: 30000,
  // Coverage settings
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.test.ts',
    '!src/**/__tests__/**'
  ]
};
