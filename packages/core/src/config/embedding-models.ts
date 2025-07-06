/**
 * Embedding Model Configuration
 * Centralized configuration for embedding models to support easy updates and experimentation
 */

export interface EmbeddingModel {
  provider: 'openai' | 'voyage' | 'cohere' | 'nvidia' | 'nomic' | 'custom';
  modelName: string;
  dimensions: number;
  maxTokens: number;
  apiKeyEnvVar: string;
  baseUrl?: string;
  description: string;
  costPer1kTokens?: number;
  lastUpdated: string;
}

export const EMBEDDING_MODELS: Record<string, EmbeddingModel> = {
  // OpenAI Models
  'openai-3-large': {
    provider: 'openai',
    modelName: 'text-embedding-3-large',
    dimensions: 1536,
    maxTokens: 8191,
    apiKeyEnvVar: 'OPENAI_API_KEY',
    description: 'OpenAI\'s large embedding model with configurable dimensions',
    costPer1kTokens: 0.00013,
    lastUpdated: '2024-01-25'
  },
  'openai-3-small': {
    provider: 'openai',
    modelName: 'text-embedding-3-small',
    dimensions: 512,
    maxTokens: 8191,
    apiKeyEnvVar: 'OPENAI_API_KEY',
    description: 'OpenAI\'s small, efficient embedding model',
    costPer1kTokens: 0.00002,
    lastUpdated: '2024-01-25'
  },
  
  // Voyage Models (Top performers for code)
  'voyage-code-2': {
    provider: 'voyage',
    modelName: 'voyage-code-2',
    dimensions: 1536,
    maxTokens: 16000,
    apiKeyEnvVar: 'VOYAGE_API_KEY',
    baseUrl: 'https://api.voyageai.com/v1',
    description: 'Optimized for code embeddings',
    costPer1kTokens: 0.00012,
    lastUpdated: '2024-10-01'
  },
  'voyage-3-lite': {
    provider: 'voyage',
    modelName: 'voyage-3-lite',
    dimensions: 512,
    maxTokens: 32000,
    apiKeyEnvVar: 'VOYAGE_API_KEY',
    baseUrl: 'https://api.voyageai.com/v1',
    description: 'Cost-effective with near OpenAI-large performance',
    costPer1kTokens: 0.00002,
    lastUpdated: '2024-12-01'
  },
  
  // Nomic (Open Source)
  'nomic-embed-text': {
    provider: 'nomic',
    modelName: 'nomic-embed-text-v1.5',
    dimensions: 768,
    maxTokens: 8192,
    apiKeyEnvVar: 'NOMIC_API_KEY',
    baseUrl: 'https://api.nomic.ai/v1',
    description: 'Open source with good cost/performance ratio',
    costPer1kTokens: 0.00001,
    lastUpdated: '2024-11-01'
  }
};

// Configuration for which model to use
export interface EmbeddingConfig {
  defaultModel: string;
  codeModel?: string;  // Optional specific model for code
  documentModel?: string;  // Optional specific model for documentation
  fallbackModel: string;
}

// Load configuration from environment or use defaults
export function getEmbeddingConfig(): EmbeddingConfig {
  return {
    defaultModel: process.env.EMBEDDING_MODEL || 'openai-3-small',
    codeModel: process.env.CODE_EMBEDDING_MODEL,
    documentModel: process.env.DOC_EMBEDDING_MODEL,
    fallbackModel: 'openai-3-small'
  };
}

// Get the appropriate model for content type
export function getModelForContent(contentType: string): string {
  const config = getEmbeddingConfig();
  
  switch (contentType) {
    case 'code':
      return config.codeModel || config.defaultModel;
    case 'documentation':
      return config.documentModel || config.defaultModel;
    default:
      return config.defaultModel;
  }
}

// Check if a model is available (API key exists)
export function isModelAvailable(modelKey: string): boolean {
  const model = EMBEDDING_MODELS[modelKey];
  if (!model) return false;
  
  return !!process.env[model.apiKeyEnvVar];
}

// Get available models
export function getAvailableModels(): string[] {
  return Object.keys(EMBEDDING_MODELS).filter(isModelAvailable);
}