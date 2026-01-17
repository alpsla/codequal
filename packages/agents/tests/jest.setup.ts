/**
 * Jest Setup File
 *
 * Global setup for Jest test environment
 */

// Set test timeout to 30 seconds for async operations
jest.setTimeout(30000);

// Mock console methods to reduce noise during tests
// Uncomment if tests are too verbose:
// global.console = {
//   ...console,
//   log: jest.fn(),
//   debug: jest.fn(),
//   info: jest.fn(),
//   warn: jest.fn(),
// };

// Global test utilities
beforeAll(() => {
  // Setup that runs before all tests
});

afterAll(() => {
  // Cleanup that runs after all tests
});
