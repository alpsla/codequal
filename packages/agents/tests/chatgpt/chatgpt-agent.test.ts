import { ChatGPTAgent } from '../../src/chatgpt/chatgpt-agent';
import { loadPromptTemplate } from '../../src/prompts/prompt-loader';
import { jest } from '@jest/globals';

// Mock models since the module cannot be found
const OPENAI_MODELS = {
  GPT_4_TURBO: 'gpt-4-turbo-preview',
  GPT_4: 'gpt-4',
  GPT_3_5_TURBO: 'gpt-3.5-turbo'
};

// Mock fetch
type FetchMock = jest.MockedFunction<typeof fetch>;
global.fetch = jest.fn().mockImplementation(() => Promise.resolve({
  ok: true,
  json: () => Promise.resolve({})
})) as unknown as typeof fetch;

jest.mock('../../src/prompts/prompt-loader', () => ({
  loadPromptTemplate: jest.fn()
}));

describe('ChatGPTAgent', () => {
  let agent: ChatGPTAgent;
  let mockFetch: FetchMock;
  
  // Sample mock PR data
  const mockPrData = {
    url: 'https://github.com/test/repo/pull/123',
    title: 'Add new feature',
    description: 'This PR adds a new feature',
    files: [
      {
        filename: 'src/app.js',
        content: 'function calculateTotal(items) {\n  let total = 0;\n  for (let i = 0; i < items.length; i++) {\n    total += items[i].price;\n  }\n  return total;\n}'
      }
    ]
  };
  
  // Sample mock OpenAI response
  const mockOpenAIResponse = {
    choices: [
      {
        message: {
          content: `## Insights
- [medium] The function doesn't validate the input parameter
- [low] The function could use array methods for better readability

## Suggestions
- File: src/app.js, Line: 1, Suggestion: Add input validation at the beginning of the function
- File: src/app.js, Line: 3, Suggestion: Consider using reduce() instead of a for loop

## Educational
### Input Validation
Always validate function inputs to prevent unexpected behavior when receiving null or undefined values.

### Array Methods
Modern JavaScript provides array methods like reduce() that can make your code more concise and readable.`
        }
      }
    ]
  };
  
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup mock for fetch
    mockFetch = global.fetch as unknown as FetchMock;
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockOpenAIResponse)
    } as unknown as Response);
    
    // Mock loadPromptTemplate
    (loadPromptTemplate as jest.Mock).mockReturnValue('Test prompt template');
    
    // Create agent instance with environment variable
    process.env.OPENAI_API_KEY = 'test-key';
    agent = new ChatGPTAgent('chatgpt_code_quality_template', {
      model: OPENAI_MODELS.GPT_4_TURBO
    });
  });
  
  afterEach(() => {
    delete process.env.OPENAI_API_KEY;
  });
  
  it('should initialize correctly', () => {
    expect(agent).toBeDefined();
  });
  
  it('should throw error if API key is missing', () => {
    delete process.env.OPENAI_API_KEY;
    expect(() => new ChatGPTAgent('chatgpt_code_quality_template')).toThrow('OpenAI API key is required');
  });
  
  it('should analyze PR data and format results', async () => {
    // Analyze PR data
    const result = await agent.analyze(mockPrData);
    
    // Verify API call
    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.openai.com/v1/chat/completions',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-key'
        }),
        body: expect.any(String)
      })
    );
    
    // Verify body content
    const bodyJson = JSON.parse((mockFetch.mock.calls[0][1] as RequestInit).body as string);
    expect(bodyJson.model).toBe(OPENAI_MODELS.GPT_4_TURBO);
    expect(bodyJson.messages.length).toBe(2);
    expect(bodyJson.messages[0].role).toBe('system');
    expect(bodyJson.messages[1].role).toBe('user');
    
    // Verify result structure
    expect(result).toHaveProperty('insights');
    expect(result).toHaveProperty('suggestions');
    expect(result).toHaveProperty('educational');
    expect(result).toHaveProperty('metadata');
    
    // Verify result content
    expect(result.insights.length).toBe(2);
    expect(result.insights[0].severity).toBe('medium');
    expect(result.insights[1].severity).toBe('low');
    
    expect(result.suggestions.length).toBe(2);
    expect(result.suggestions[0].file).toBe('src/app.js');
    expect(result.suggestions[0].line).toBe(1);
    
    expect(result.educational.length).toBe(2);
    expect(result.educational[0].topic).toBe('Input Validation');
    expect(result.educational[1].topic).toBe('Array Methods');
    
    expect(result.metadata.model).toBe(OPENAI_MODELS.GPT_4_TURBO);
  });
  
  it('should handle API errors gracefully', async () => {
    // Mock API error
    mockFetch.mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ error: { message: 'Invalid API key' }})
    } as unknown as Response);
    
    // Analyze PR data
    const result = await agent.analyze(mockPrData);
    
    // Verify error handling
    expect(result.insights).toEqual([]);
    expect(result.suggestions).toEqual([]);
    expect(result.metadata.error).toBe(true);
    expect(result.metadata.message).toBe('OpenAI API error: Invalid API key');
  });
});
