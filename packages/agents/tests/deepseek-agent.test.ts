import { DeepSeekAgent } from '../src/deepseek/deepseek-agent';
import { DEEPSEEK_MODELS } from '@codequal/core';
import { loadPromptTemplate } from '../src/prompts/prompt-loader';

// Set up fetch mock without implementation initially
// We'll set specific implementations in each test
global.fetch = jest.fn();

// Mock prompt loader
jest.mock('../src/prompts/prompt-loader', () => ({
  loadPromptTemplate: jest.fn((templateName: string) => {
    if (templateName === 'deepseek_code_quality_template') {
      return 'Mock DeepSeek prompt template';
    } else if (templateName === 'deepseek_code_quality_template_system') {
      return 'Mock DeepSeek system prompt';
    }
    return '';
  })
}));

// Mock DeepSeek API response
const mockDeepSeekResponse = `
## Insights
- [high] The shopping cart implementation uses global state which could lead to state management issues
- [medium] No input validation in the addToCart function
- [low] The checkout function has a potential division by zero error

## Suggestions
- File: shopping-cart.js, Line: 4, Suggestion: Refactor to use a class instead of global variables
- File: shopping-cart.js, Line: 8, Suggestion: Add type checking and validation for cart items
- File: shopping-cart.js, Line: 43, Suggestion: Add a check to prevent division by zero when cart is empty

## Educational
### Global State Management
Global state can lead to unpredictable behavior in applications, especially as they grow in complexity. Consider using a class-based approach or a state container that provides controlled access to state.

### Input Validation Best Practices
Always validate inputs to functions to ensure they meet expected types and constraints. This helps prevent bugs, improves security, and makes your code more robust.
`;

// Mock PR data
const mockPRData = {
  url: 'https://github.com/org/repo/pull/789',
  title: 'Add shopping cart functionality',
  description: 'Implementation of basic e-commerce cart features',
  files: [
    {
      filename: 'shopping-cart.js',
      content: `// Mock shopping cart implementation\nvar cartItems = [];\nfunction addToCart(item) { cartItems.push(item); }`
    }
  ]
};

describe('DeepSeekAgent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.DEEPSEEK_API_KEY = 'test-deepseek-key';
  });

  test('initializes with default model if not specified', () => {
    const agent = new DeepSeekAgent('deepseek_code_quality_template');
    expect((agent as any).model).toBe(DEEPSEEK_MODELS.DEEPSEEK_CODER);
  });

  test('initializes with specified model', () => {
    const agent = new DeepSeekAgent('deepseek_code_quality_template', {
      model: 'deepseek-coder-plus-instruct' // Use string directly for test
    });
    expect((agent as any).model).toBe('deepseek-coder-plus-instruct');
  });

  test('initializes with premium model when premium flag is set', () => {
    // No need to mock initDeepSeekClient, just check model selection
    const agent = new DeepSeekAgent('deepseek_code_quality_template', {
      premium: true
    });
    
    expect((agent as any).model).toBe('deepseek-coder-plus-instruct');
  });

  test('throws error if API key is not provided', () => {
    delete process.env.DEEPSEEK_API_KEY;
    expect(() => new DeepSeekAgent('deepseek_code_quality_template')).toThrow('DeepSeek API key is required');
    // Restore API key for subsequent tests
    process.env.DEEPSEEK_API_KEY = 'test-deepseek-key';
  });

  test('analyze method calls DeepSeek API and formats result', async () => {
    // Set up the fetch mock for this test
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        choices: [
          {
            message: {
              content: mockDeepSeekResponse,
              role: 'assistant'
            },
            finish_reason: 'stop'
          }
        ],
        usage: {
          prompt_tokens: 150,
          completion_tokens: 250,
          total_tokens: 400
        }
      })
    });
    
    // Create an agent and analyze mock PR data  
    const agent = new DeepSeekAgent('deepseek_code_quality_template');
    const result = await agent.analyze(mockPRData);

    // Verify loadPromptTemplate was called correctly
    expect(loadPromptTemplate).toHaveBeenCalledWith('deepseek_code_quality_template');
    expect(loadPromptTemplate).toHaveBeenCalledWith('deepseek_code_quality_template_system');

    // Check result structure
    expect(result).toHaveProperty('insights');
    expect(result).toHaveProperty('suggestions');
    expect(result).toHaveProperty('educational');
    expect(result).toHaveProperty('metadata');

    // Verify insights parsing
    expect(result.insights).toBeDefined();
    if (!result.insights) {
      fail('Insights are undefined');
      return;
    }
    expect(result.insights.length).toBe(3);
    expect(result.insights[0]).toEqual({
      type: 'code_review',
      severity: 'high',
      message: 'The shopping cart implementation uses global state which could lead to state management issues'
    });

    // Verify suggestions parsing
    expect(result.suggestions).toBeDefined();
    if (!result.suggestions) {
      fail('Suggestions are undefined');
      return;
    }
    expect(result.suggestions.length).toBe(3);
    expect(result.suggestions[0]).toEqual({
      file: 'shopping-cart.js',
      line: 4,
      suggestion: 'Refactor to use a class instead of global variables'
    });

    // Verify educational content exists (even if empty)
    expect(result.educational).toBeDefined();
    
    // Skip detailed educational content checks for test simplicity
    // DeepSeek response parsing is tested elsewhere

    // Verify metadata
    expect(result.metadata).toBeDefined();
    expect(result.metadata).toEqual(expect.objectContaining({
      template: 'deepseek_code_quality_template',
      model: DEEPSEEK_MODELS.DEEPSEEK_CODER,
      provider: 'deepseek'
    }));
  });

  test('handles API errors gracefully', async () => {
    // Clear previous mocks
    jest.clearAllMocks();
    
    // Set up fetch to simulate API error with 400 status
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 400,
      text: () => Promise.resolve('Invalid request')
    });

    const agent = new DeepSeekAgent('deepseek_code_quality_template');
    const result = await agent.analyze(mockPRData);

    // Verify error handling
    expect(result).toHaveProperty('insights');
    expect(result.insights).toHaveLength(0);
    expect(result).toHaveProperty('suggestions');
    expect(result.suggestions).toHaveLength(0);
    expect(result).toHaveProperty('metadata');
    if (!result.metadata) {
      fail('Metadata is undefined');
      return;
    }
    expect(result.metadata.error).toBe(true);
    if (result.metadata.message) {
      expect(result.metadata.message).toContain('DeepSeek API error');
    } else {
      fail('Metadata message is undefined');
    }
  });

  test('handles network errors gracefully', async () => {
    // Clear previous mocks
    jest.clearAllMocks();
    
    // Set up fetch to simulate network error
    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

    const agent = new DeepSeekAgent('deepseek_code_quality_template');
    const result = await agent.analyze(mockPRData);

    // Verify error handling
    expect(result).toHaveProperty('insights');
    expect(result.insights).toHaveLength(0);
    expect(result).toHaveProperty('suggestions');
    expect(result.suggestions).toHaveLength(0);
    expect(result).toHaveProperty('metadata');
    if (!result.metadata) {
      fail('Metadata is undefined');
      return;
    }
    expect(result.metadata.error).toBe(true);
    if (result.metadata.message) {
      expect(result.metadata.message).toBe('Network error');
    } else {
      fail('Metadata message is undefined');
    }
  });

  test('tracks token usage correctly', async () => {
    // Clear previous mocks
    jest.clearAllMocks();
    
    // Set up fetch with specific token usage in the response
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        choices: [
          {
            message: {
              content: mockDeepSeekResponse,
              role: 'assistant'
            },
            finish_reason: 'stop'
          }
        ],
        usage: {
          prompt_tokens: 500,
          completion_tokens: 800,
          total_tokens: 1300
        }
      })
    });

    const agent = new DeepSeekAgent('deepseek_code_quality_template');
    const result = await agent.analyze(mockPRData);

    // Verify token usage was tracked correctly
    expect(result.metadata).toBeDefined();
    if (!result.metadata) {
      fail('Metadata is undefined');
      return;
    }
    expect(result.metadata).toHaveProperty('tokenUsage');
    if (!result.metadata.tokenUsage) {
      fail('Token usage is undefined');
      return;
    }
    expect(result.metadata.tokenUsage).toEqual({
      input: 500,
      output: 800
    });
  });
});
