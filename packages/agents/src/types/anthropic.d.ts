/**
 * Type declarations for Anthropic SDK
 */

declare module '@anthropic-ai/sdk' {
  export interface AnthropicMessageResponse {
    id: string;
    type: string;
    role: string;
    content: Array<{
      type: string;
      text: string;
    }>;
    model: string;
  }

  export interface AnthropicMessageParams {
    model: string;
    system?: string;
    max_tokens: number;
    messages: Array<{
      role: 'user' | 'assistant';
      content: string;
    }>;
  }

  export default class Anthropic {
    constructor(options: { apiKey: string });
    
    messages: {
      create: (params: AnthropicMessageParams) => Promise<AnthropicMessageResponse>;
    };
  }
}