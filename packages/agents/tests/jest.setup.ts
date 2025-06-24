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

// Mock Supabase client and database models
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

// Add environment variables
process.env.ANTHROPIC_API_KEY = 'test-api-key';
process.env.OPENAI_API_KEY = 'test-api-key';
process.env.SUPABASE_URL = 'https://test.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key';