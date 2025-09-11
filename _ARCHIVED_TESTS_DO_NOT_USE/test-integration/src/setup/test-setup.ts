import { config } from 'dotenv';
import path from 'path';

// Load test environment variables
config({ path: path.resolve(__dirname, '../../../.env.test') });

// Global test configuration
jest.setTimeout(300000); // 5 minutes

// Mock console methods to reduce noise in tests
/* eslint-disable no-console */
const originalConsoleLog = console.log;
const originalConsoleWarn = console.warn;
const originalConsoleError = console.error;
/* eslint-enable no-console */

beforeAll(() => {
  // Keep error logs but reduce info/warn noise
  /* eslint-disable no-console */
  console.log = jest.fn();
  console.warn = jest.fn();
  // Keep errors visible
  console.error = originalConsoleError;
  /* eslint-enable no-console */
});

afterAll(() => {
  // Restore console methods
  /* eslint-disable no-console */
  console.log = originalConsoleLog;
  console.warn = originalConsoleWarn;
  console.error = originalConsoleError;
  /* eslint-enable no-console */
});

// Global test utilities
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace jest {
    interface Matchers<R> {
      toBeValidMCPToolResult(): R;
      toHaveEducationalContent(): R;
      toHaveReportingArtifacts(): R;
    }
  }
}

// Custom Jest matchers for MCP tool validation
expect.extend({
  toBeValidMCPToolResult(received: unknown) {
    const result = received as any;
    const pass = result && 
      typeof result === 'object' &&
      (result.status === 'success' || result.status === 'error') &&
      result.toolName &&
      result.executionTime !== undefined;

    if (pass) {
      return {
        message: () => `Expected ${received} not to be a valid MCP tool result`,
        pass: true,
      };
    } else {
      return {
        message: () => `Expected ${received} to be a valid MCP tool result with status, toolName, and executionTime`,
        pass: false,
      };
    }
  },

  toHaveEducationalContent(received: unknown) {
    const content = received as any;
    const pass = content &&
      content.learningPath &&
      content.resources &&
      Array.isArray(content.resources) &&
      content.skillGaps &&
      Array.isArray(content.skillGaps);

    if (pass) {
      return {
        message: () => `Expected ${received} not to have educational content`,
        pass: true,
      };
    } else {
      return {
        message: () => `Expected ${received} to have educational content with learningPath, resources, and skillGaps`,
        pass: false,
      };
    }
  },

  toHaveReportingArtifacts(received: unknown) {
    const artifacts = received as any;
    const pass = artifacts &&
      artifacts.visualizations &&
      artifacts.exports &&
      (artifacts.exports.pdfReports || artifacts.exports.markdownReport);

    if (pass) {
      return {
        message: () => `Expected ${received} not to have reporting artifacts`,
        pass: true,
      };
    } else {
      return {
        message: () => `Expected ${received} to have reporting artifacts with visualizations and exports`,
        pass: false,
      };
    }
  },
});