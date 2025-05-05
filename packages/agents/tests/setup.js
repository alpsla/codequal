// Mock environment variables
process.env.ANTHROPIC_API_KEY = 'mock-anthropic-api-key';
process.env.OPENAI_API_KEY = 'mock-openai-api-key';
process.env.DEEPSEEK_API_KEY = 'mock-deepseek-api-key';
process.env.SNYK_TOKEN = 'mock-snyk-token';
process.env.MCP_API_KEY = 'mock-mcp-api-key';

// Mock functions that might be used in tests
global.fetch = jest.fn(() => 
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({}),
  })
);

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: jest.fn(),
  info: jest.fn(),
  debug: jest.fn(),
  // Keep error for debugging
  // error: jest.fn(),
};