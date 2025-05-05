/**
 * Mock OpenAI SDK for testing
 */

const openaiMock = jest.fn().mockImplementation(() => {
  return {
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
  };
});

export default openaiMock;