// Global test setup for V9 analyzer tests

// Mock environment variables
process.env.NODE_ENV = 'test';
process.env.SUPABASE_URL = 'https://test.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key';
process.env.REDIS_URL = 'redis://localhost:6379';

// Mock external dependencies
jest.mock('child_process', () => ({
  execSync: jest.fn().mockReturnValue('mock output'),
  exec: jest.fn()
}));

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn(() => ({ data: null, error: null }))
        })),
        order: jest.fn(() => ({ data: [], error: null }))
      }))
    }))
  }))
}));

jest.mock('ioredis', () => {
  return jest.fn().mockImplementation(() => ({
    get: jest.fn(),
    set: jest.fn(),
    setex: jest.fn(),
    del: jest.fn(),
    exists: jest.fn(),
    disconnect: jest.fn()
  }));
});

jest.mock('fs', () => ({
  ...jest.requireActual('fs'),
  existsSync: jest.fn().mockReturnValue(true),
  readFileSync: jest.fn().mockReturnValue('mock file content'),
  writeFileSync: jest.fn(),
  mkdirSync: jest.fn()
}));

// Suppress console output during tests unless debugging
const originalConsole = console;
global.console = {
  ...originalConsole,
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  info: jest.fn(),
  debug: jest.fn()
};

// Restore console for specific tests if needed
global.restoreConsole = () => {
  global.console = originalConsole;
};

// Helper to enable console logging for debugging
global.enableConsoleLogging = () => {
  global.console = originalConsole;
};

// Global test helpers
global.createMockIssue = (id, severity = 'medium', status = 'new', file = 'test.java') => ({
  id: String(id),
  category: 'Security',
  severity,
  status,
  title: `Mock issue ${id}`,
  description: `Mock description ${id}`,
  file,
  line: 10,
  tool: 'MockTool',
  agent: 'test',
  impact: 'Test impact',
  businessImpact: 'Test business impact',
  inModifiedFile: true
});

global.createMockAnalysisResult = (overrides = {}) => ({
  decision: 'approved',
  confidence: 0.8,
  reason: 'Test analysis',
  qualityScore: 75,
  grade: 'C',
  newIssues: [],
  existingIssues: [],
  resolvedIssues: [],
  blockingIssues: [],
  backlogIssues: [],
  modifiedFiles: ['test.java'],
  businessImpact: {
    summary: 'Test impact',
    immediateRisk: 'Low',
    futureRisk: 'Low',
    financialImpact: {
      fixCost: '$150',
      exploitCost: '$1,500',
      roi: '10:1'
    },
    riskMatrix: []
  },
  skillScore: {
    developer: 'TestDev',
    score: 75,
    trend: [70, 72, 75],
    categories: {
      security: 80,
      performance: 70,
      architecture: 75,
      dependency: 80,
      quality: 70
    },
    recommendations: []
  },
  metadata: {
    repository: 'https://github.com/test/repo',
    prNumber: 123,
    branch: 'test-branch',
    language: 'Java',
    totalFiles: 10,
    modifiedFiles: 1,
    analysisTime: Date.now(),
    tools: ['MockTool'],
    timestamp: new Date().toISOString()
  },
  ...overrides
});

// Cleanup after all tests
afterAll(() => {
  // Restore original console
  global.console = originalConsole;
});