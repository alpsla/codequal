import { ChatGPTAgent } from '../src/chatgpt/chatgpt-agent';
import { OPENAI_MODELS } from '@codequal/core/config/models/model-versions';
import { loadPromptTemplate } from '../src/prompts/prompt-loader';

// Create a test subclass to access protected/private members
class TestChatGPTAgent extends ChatGPTAgent {
  // Method to set a mock client directly
  public setMockClient(mockClient: any) {
    // @ts-ignore - Accessing private property for testing
    this.openaiClient = mockClient;
  }
}

// Mock prompt loader
jest.mock('../src/prompts/prompt-loader', () => ({
  loadPromptTemplate: jest.fn((templateName: string) => {
    if (templateName === 'openai_code_quality_template') {
      return 'Mock OpenAI prompt template';
    } else if (templateName === 'openai_code_quality_template_system') {
      return 'Mock OpenAI system prompt';
    }
    return '';
  })
}));

// Mock OpenAI API response
const mockOpenAIResponse = `
## Insights
-  Missing error handling in fetchData function
-  Redundant code in user validation
-  Inconsistent naming conventions

## Suggestions
- File: api.js, Line: 42, Suggestion: Add try/catch block to handle fetch errors
- File: auth.js, Line: 67, Suggestion: Extract duplicate validation logic to a separate function
- File: utils.js, Line: 18, Suggestion: Follow camelCase convention for all variables

## Educational
### Error Handling in Asynchronous Operations
When working with asynchronous operations like API calls, proper error handling is essential. Use try/catch blocks or .catch() methods to gracefully handle failures and provide appropriate feedback to users.

### Code Duplication and DRY Principle
The DRY (Don't Repeat Yourself) principle suggests that each piece of knowledge should have a single, unambiguous representation in your codebase. Extract duplicated logic into reusable functions to improve maintainability.
`;

// Mock PR data
const mockPRData = {
  url: 'https://github.com/org/repo/pull/456',
  title: 'Add user authentication feature',
  description: 'Implement JWT-based authentication',
  files: [
    {
      filename: 'api.js',
      content: 'function fetchData() { /* implementation */ }'
    },
    {
      filename: 'auth.js',
      content: 'function validateUser() { /* implementation */ }'
    }
  ]
};

describe('ChatGPTAgent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.OPENAI_API_KEY = 'test-openai-key';
  });

  test('initializes with default model if not specified', () => {
    const agent = new TestChatGPTAgent('openai_code_quality_template');
    expect((agent as any).model).toBe(OPENAI_MODELS.GPT_3_5_TURBO);
  });

  test('initializes with specified model', () => {
    const agent = new TestChatGPTAgent('openai_code_quality_template', {
      model: OPENAI_MODELS.GPT_4_TURBO
    });
    expect((agent as any).model).toBe(OPENAI_MODELS.GPT_4_TURBO);
  });

  test('throws error if API key is not provided', () => {
    delete process.env.OPENAI_API_KEY;
    expect(() => new ChatGPTAgent('openai_code_quality_template')).toThrow('OpenAI API key is required');
  });

  test('analyze method calls OpenAI API and formats result', async () => {
    // Create mock OpenAI client
    const mockClient = {
      chat: {
        completions: {
          create: jest.fn().mockResolvedValue({
            choices: [
              {
                message: {
                  content: mockOpenAIResponse,
                  role: 'assistant'
                },
                index: 0,
                finish_reason: 'stop'
              }
            ],
            created: 1682900000,
            id: 'mock-id',
            model: OPENAI_MODELS.GPT_3_5_TURBO,
            object: 'chat.completion',
            usage: {
              prompt_tokens: 100,
              completion_tokens: 200,
              total_tokens: 300
            }
          })
        }
      }
    };

    // Create agent with mock client
    const agent = new TestChatGPTAgent('openai_code_quality_template');
    agent.setMockClient(mockClient);
    const result = await agent.analyze(mockPRData);

    // Verify loadPromptTemplate was called correctly
    expect(loadPromptTemplate).toHaveBeenCalledWith('openai_code_quality_template');
    expect(loadPromptTemplate).toHaveBeenCalledWith('openai_code_quality_template_system');

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
      severity: 'medium', // Default severity is medium if no severity tag
      message: 'Missing error handling in fetchData function'
    });
    expect(result.insights[1]).toEqual({
      type: 'code_review',
      severity: 'medium',
      message: 'Redundant code in user validation'
    });
    expect(result.insights[2]).toEqual({
      type: 'code_review',
      severity: 'medium', // Default severity is medium if no severity tag
      message: 'Inconsistent naming conventions'
    });

    // Verify suggestions parsing
    expect(result.suggestions).toBeDefined();
    if (!result.suggestions) {
      fail('Suggestions are undefined');
      return;
    }
    expect(result.suggestions.length).toBe(3);
    expect(result.suggestions[0]).toEqual({
      file: 'api.js',
      line: 42,
      suggestion: 'Add try/catch block to handle fetch errors'
    });

    // Verify educational content exists (even if empty)
    expect(result.educational).toBeDefined();
    // Skip detailed educational content checks as it's tested elsewhere
    // and results can vary based on parsing implementation
  });

  test('handles errors gracefully', async () => {
    // Create mock OpenAI client that throws an error
    const mockErrorClient = {
      chat: {
        completions: {
          create: jest.fn().mockRejectedValue(new Error('OpenAI API error'))
        }
      }
    };

    // Create agent with mock error client
    const agent = new TestChatGPTAgent('openai_code_quality_template');
    agent.setMockClient(mockErrorClient);
    
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
    if (!result.metadata.message) {
      fail('Error message is undefined');
      return;
    }
    expect(result.metadata.message).toBe('OpenAI API error');
  });
});
