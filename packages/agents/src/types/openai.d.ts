/**
 * Type declarations for OpenAI SDK
 */

declare module 'openai' {
  export interface OpenAICompletionUsage {
    completion_tokens: number;
    prompt_tokens: number;
    total_tokens: number;
  }

  export interface OpenAICompletionChoice {
    message: {
      content: string | null;
      role: string;
    };
    index: number;
    finish_reason: string;
  }

  export interface OpenAICompletionResponse {
    choices: OpenAICompletionChoice[];
    created: number;
    id: string;
    model: string;
    object: string;
    usage?: OpenAICompletionUsage;
  }

  export interface OpenAICompletionParams {
    model: string;
    messages: Array<{ role: string; content: string }>;
    temperature?: number;
    max_tokens?: number;
    top_p?: number;
    frequency_penalty?: number;
    presence_penalty?: number;
    stop?: string | string[];
  }

  export default class OpenAI {
    constructor(options: { apiKey: string });
    
    chat: {
      completions: {
        create: (params: OpenAICompletionParams) => Promise<OpenAICompletionResponse>;
      };
    };
  }
}