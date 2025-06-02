// Test setup file
import 'jest';

// Extend Jest matchers
declare global {
  namespace jest {
    interface Expect {
      oneOf(expected: any[]): any;
    }
  }
}

// Custom matcher for oneOf
expect.extend({
  oneOf(received: any, expected: any[]) {
    const pass = expected.includes(received);
    if (pass) {
      return {
        message: () => `expected ${received} not to be one of ${expected.join(', ')}`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be one of ${expected.join(', ')}`,
        pass: false,
      };
    }
  }
});

// Global test configuration
beforeAll(() => {
  // Set test environment variables
  process.env.NODE_ENV = 'test';
  process.env.SUPABASE_URL = 'https://test.supabase.co';
  process.env.SUPABASE_ANON_KEY = 'test-anon-key';
  process.env.PORT = '3001';
});

// Mock console methods to reduce test noise
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// Common test utilities
export const createMockAuthenticatedUser = () => ({
  id: 'test-user-123',
  email: 'test@example.com',
  organizationId: 'test-org-456',
  permissions: ['read', 'write'],
  session: {
    token: 'test-jwt-token',
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours from now
  }
});

export const createMockPRDetails = () => ({
  number: 123,
  title: 'Test PR Title',
  description: 'Test PR description',
  author: 'testuser',
  baseBranch: 'main',
  headBranch: 'feature/test',
  state: 'open' as const,
  url: 'https://github.com/owner/repo/pull/123',
  createdAt: new Date('2025-06-01T10:00:00Z'),
  updatedAt: new Date('2025-06-01T11:00:00Z'),
  changedFiles: 5,
  additions: 100,
  deletions: 20
});

export const createMockDiffData = () => ({
  files: [
    {
      filename: 'src/components/Button.tsx',
      status: 'modified' as const,
      additions: 15,
      deletions: 5,
      changes: 20,
      patch: '@@ -1,5 +1,10 @@\n-old code\n+new code'
    },
    {
      filename: 'src/utils/helpers.ts',
      status: 'added' as const,
      additions: 50,
      deletions: 0,
      changes: 50
    },
    {
      filename: 'tests/Button.test.tsx',
      status: 'modified' as const,
      additions: 25,
      deletions: 10,
      changes: 35
    }
  ],
  totalAdditions: 90,
  totalDeletions: 15,
  totalChanges: 105
});

export const createMockFinding = () => ({
  id: 'finding-123',
  type: 'security-vulnerability',
  title: 'Potential SQL Injection',
  description: 'Database query may be vulnerable to SQL injection',
  severity: 'high' as const,
  confidence: 0.85,
  file: 'src/database/queries.ts',
  line: 42,
  category: 'security',
  agent: 'security-agent',
  recommendation: 'Use parameterized queries to prevent SQL injection'
});