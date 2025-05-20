/**
 * Interfaces for the DeepWiki Chat POC
 */

/**
 * Configuration for the chat model
 */
export interface ChatModelConfig {
  /** Primary model identifier (with provider prefix if needed) */
  primaryModel: string;
  /** Fallback models in order of preference */
  fallbackModels: string[];
  /** Temperature setting for the model */
  temperature: number;
  /** Maximum number of tokens to generate */
  maxTokens: number;
}

/**
 * Repository context for chat
 */
export interface RepositoryContext {
  /** Repository identifier */
  repositoryId: string;
  /** Repository name */
  name: string;
  /** Repository URL */
  url: string;
  /** Owner of the repository */
  owner: string;
  /** Primary language of the repository */
  primaryLanguage: string;
  /** Permission level for the current user */
  permissionLevel: 'read' | 'write' | 'admin';
}

/**
 * User context for chat
 */
export interface UserContext {
  /** User identifier */
  userId: string;
  /** User's email address */
  email: string;
  /** User's repositories */
  repositories: RepositoryContext[];
  /** Currently selected repository */
  currentRepository?: RepositoryContext;
}

/**
 * Chat message from user or system
 */
export interface ChatMessage {
  /** Message role (user, assistant, or system) */
  role: 'user' | 'assistant' | 'system';
  /** Message content */
  content: string;
  /** Timestamp when the message was created */
  timestamp: Date;
  /** Any additional metadata */
  metadata?: Record<string, any>;
}

/**
 * Vector search result
 */
export interface VectorSearchResult {
  /** Content of the retrieved chunk */
  content: string;
  /** Similarity score */
  score: number;
  /** File path */
  filePath: string;
  /** Repository identifier */
  repositoryId: string;
  /** Any additional metadata */
  metadata?: Record<string, any>;
}

/**
 * Chat completion request
 */
export interface ChatCompletionRequest {
  /** User context */
  userContext: UserContext;
  /** Chat history */
  messages: ChatMessage[];
  /** Model configuration to use */
  modelConfig?: Partial<ChatModelConfig>;
}

/**
 * Chat completion response
 */
export interface ChatCompletionResponse {
  /** The generated message */
  message: ChatMessage;
  /** The model used to generate the response */
  modelUsed: string;
  /** Context chunks used (if any) */
  contextChunks?: VectorSearchResult[];
  /** Usage information */
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}
