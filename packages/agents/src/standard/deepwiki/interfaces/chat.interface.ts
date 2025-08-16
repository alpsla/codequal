/**
 * DeepWiki Chat Interfaces
 */

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export interface ChatSession {
  sessionId: string;
  repositoryUrl: string;
  contextId?: string;
  startedAt: Date;
  lastActivity?: Date;
  messages: ChatMessage[];
  metadata?: {
    branch?: string;
    prNumber?: number;
    userId?: string;
  };
}

export interface ChatCompletionOptions {
  provider?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  timeout?: number;
  stream?: boolean;
  responseFormat?: { type: 'json_object' | 'text' };
  requireContext?: boolean;
}

export interface ChatResponse {
  content: string;
  role: 'assistant';
  timestamp: Date;
  metadata?: {
    model?: string;
    tokensUsed?: number;
    processingTime?: number;
    contextUsed?: boolean;
  };
}

export interface StreamingChatResponse {
  content: string;
  isComplete: boolean;
  metadata?: Record<string, any>;
}

export interface ChatError {
  code: string;
  message: string;
  details?: any;
}