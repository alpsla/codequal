// Global test setup
process.env.NODE_ENV = 'test';
process.env.SUPABASE_URL = 'https://test.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key';

// Mock Supabase and database models for all tests
jest.mock('@codequal/database', () => ({
  getSupabase: jest.fn(() => ({
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => Promise.resolve({ data: [], error: null })),
        insert: jest.fn(() => Promise.resolve({ data: [], error: null })),
        update: jest.fn(() => Promise.resolve({ data: [], error: null })),
        delete: jest.fn(() => Promise.resolve({ data: [], error: null }))
      }))
    }))
  }))
}));

jest.mock('@codequal/database/models/skill', () => ({
  SkillModel: {
    getUserSkills: jest.fn(() => Promise.resolve([])),
    updateSkill: jest.fn(() => Promise.resolve()),
    getSkillHistory: jest.fn(() => Promise.resolve([])),
    recordSkillHistory: jest.fn(() => Promise.resolve())
  },
  DeveloperSkill: jest.fn(),
  SkillHistoryEntry: jest.fn()
}));

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
