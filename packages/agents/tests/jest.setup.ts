// Mock Anthropic SDK
jest.mock('@anthropic-ai/sdk', () => {
  return jest.fn().mockImplementation(() => ({
    messages: {
      create: jest.fn().mockResolvedValue({
        content: [{ text: 'Mock Claude response', type: 'text' }],
        id: 'msg_mock',
        model: 'claude-3-haiku-20240307',
        role: 'assistant',
        type: 'message'
      })
    }
  }));
});

// Mock OpenAI SDK
jest.mock('openai', () => {
  return jest.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: jest.fn().mockResolvedValue({
          choices: [
            {
              message: {
                content: 'Mock OpenAI response',
                role: 'assistant'
              },
              index: 0,
              finish_reason: 'stop'
            }
          ],
          created: 1682900000,
          id: 'mock-id',
          model: 'gpt-3.5-turbo',
          object: 'chat.completion',
          usage: {
            prompt_tokens: 100,
            completion_tokens: 200,
            total_tokens: 300
          }
        })
      }
    }
  }));
});

// Mock the prompt loader
jest.mock('../src/prompts/prompt-loader', () => ({
  loadPromptTemplate: jest.fn(templateName => `Mock template for ${templateName}`)
}));

// Add environment variables
process.env.ANTHROPIC_API_KEY = 'test-api-key';
process.env.OPENAI_API_KEY = 'test-api-key';