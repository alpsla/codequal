import { ClaudeAgent } from '../src/claude/claude-agent';
import { ANTHROPIC_MODELS } from '@codequal/core/config/models/model-versions';
import { loadPromptTemplate } from '../src/prompts/prompt-loader';

// Test subclass to access protected members
class TestClaudeAgent extends ClaudeAgent {
  public setMockClient(mockClient: any) {
    // @ts-ignore - Accessing private property for testing
    this.claudeClient = mockClient;
  }
}

// Mock dependencies
jest.mock('@anthropic-ai/sdk', () => {
  return jest.fn().mockImplementation(() => {
    return {
      messages: {
        create: jest.fn().mockResolvedValue({
          content: [{ text: mockClaudeResponse, type: 'text' }],
          id: 'msg_mock',
          model: ANTHROPIC_MODELS.CLAUDE_3_HAIKU,
          role: 'assistant',
          type: 'message'
        })
      }
    };
  });
});

jest.mock('../src/prompts/prompt-loader', () => ({
  loadPromptTemplate: jest.fn((templateName: string) => {
    if (templateName === 'claude_code_quality_template') {
      return 'Mock prompt template';
    } else if (templateName === 'claude_code_quality_template_system') {
      return 'Mock system prompt';
    }
    return '';
  })
}));

// Mock Claude API response
const mockClaudeResponse = `
## Insights
- [high] The function fillPromptTemplate doesn't validate inputs, which could lead to template injection vulnerabilities.
- [medium] No error handling for API calls, which might cause silent failures.
- [low] Variable names are not consistent across the codebase.

## Suggestions
- File: claude-agent.ts, Line: 120, Suggestion: Add input validation to prevent template injection.
- File: claude-agent.ts, Line: 156, Suggestion: Implement proper error handling with try/catch blocks.
- File: claude-agent.ts, Line: 78, Suggestion: Use consistent naming conventions for variables.

## Educational
### Template Injection Vulnerabilities
Template injection occurs when user input is directly inserted into templates without proper validation. This can lead to unexpected behavior or security vulnerabilities. Always validate and sanitize inputs before using them in templates.

### Error Handling Best Practices
Proper error handling improves application reliability and user experience. Use try/catch blocks for async operations, provide meaningful error messages, and ensure errors are logged for debugging.
`;

// Mock PR data
const mockPRData = {
  url: 'https://github.com/org/repo/pull/123',
  title: 'Fix bug in authentication flow',
  description: 'This PR fixes a critical bug in the authentication flow',
  files: [
    {
      filename: 'auth.ts',
      content: 'export function login() { /* implementation */ }'
    }
  ]
};

describe('ClaudeAgent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.ANTHROPIC_API_KEY = 'test-api-key';
  });

  test('initializes with default model if not specified', () => {
    const agent = new TestClaudeAgent('claude_code_quality_template');
    expect((agent as any).model).toBe(ANTHROPIC_MODELS.CLAUDE_3_HAIKU);
  });

  test('initializes with specified model', () => {
    const agent = new TestClaudeAgent('claude_code_quality_template', {
      model: ANTHROPIC_MODELS.CLAUDE_3_OPUS
    });
    expect((agent as any).model).toBe(ANTHROPIC_MODELS.CLAUDE_3_OPUS);
  });

  test('throws error if API key is not provided', () => {
    delete process.env.ANTHROPIC_API_KEY;
    expect(() => new ClaudeAgent('claude_code_quality_template')).toThrow('Anthropic API key is required');
  });

  test('analyze method calls Claude API and formats result', async () => {
    const agent = new TestClaudeAgent('claude_code_quality_template');
    const result = await agent.analyze(mockPRData);

    // Verify loadPromptTemplate was called correctly
    expect(loadPromptTemplate).toHaveBeenCalledWith('claude_code_quality_template');
    expect(loadPromptTemplate).toHaveBeenCalledWith('claude_code_quality_template_system');

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
      message: "The function fillPromptTemplate doesn't validate inputs, which could lead to template injection vulnerabilities."
    });

    // Verify suggestions parsing
    expect(result.suggestions).toBeDefined();
    if (!result.suggestions) {
      fail('Suggestions are undefined');
      return;
    }
    expect(result.suggestions.length).toBe(3);
    expect(result.suggestions[0]).toEqual({
      file: 'claude-agent.ts',
      line: 120,
      suggestion: 'Add input validation to prevent template injection.'
    });

    // Verify educational content parsing
    expect(result.educational).toBeDefined();
    if (!result.educational) {
      fail('Educational content is undefined');
      return;
    }
    expect(result.educational.length).toBe(2);
    expect(result.educational[0]).toEqual({
      topic: 'Template Injection Vulnerabilities',
      explanation: 'Template injection occurs when user input is directly inserted into templates without proper validation. This can lead to unexpected behavior or security vulnerabilities. Always validate and sanitize inputs before using them in templates.',
      skillLevel: 'intermediate'
    });
  });

  test('handles errors gracefully', async () => {
    // Create a mock client that rejects with an error
    const mockErrorClient = {
      generateResponse: jest.fn().mockRejectedValue(new Error('API error'))
    };

    // Create test agent with mock error client
    const agent = new TestClaudeAgent('claude_code_quality_template');
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
    expect(result.metadata.message).toBe('API error');
  });
});
