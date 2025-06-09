// Global test setup
process.env.NODE_ENV = 'test';

// Mock console.error to reduce noise in tests
const originalError = console.error;
console.error = (...args) => {
  if (
    args[0]?.includes('[ERROR]') ||
    args[0]?.includes('AUTH_FAILURE') ||
    args[0]?.includes('API error')
  ) {
    return;
  }
  originalError.call(console, ...args);
};

// Global mocks
global.fetch = jest.fn();

// Mock timers for tests that might timeout
jest.setTimeout(30000);
