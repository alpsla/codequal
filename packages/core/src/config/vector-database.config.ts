/**
 * Vector Database Configuration
 * Centralized configuration for all vector database operations
 */

export interface VectorDatabaseConfig {
  embedding: EmbeddingConfig;
  chunking: ChunkingConfig;
  storage: StorageConfig;
  processing: ProcessingConfig;
  enhancement: EnhancementConfig;
  search: SearchConfig;
}

export interface EmbeddingConfig {
  provider: 'openai' | 'cohere' | 'custom';
  openai: {
    model: string;
    dimensions: number;
    apiKey: string;
    maxRetries: number;
    timeout: number;
    batchSize: number;
  };
  cache: {
    enabled: boolean;
    ttl: number; // Time to live in seconds
    maxSize: number; // Max cache size in MB
  };
}

export interface ChunkingConfig {
  targetChunkSize: number; // Target size in tokens
  maxChunkSize: number;    // Maximum allowed chunk size
  minChunkSize: number;    // Minimum viable chunk size
  overlapSize: number;     // Overlap between chunks (sliding window)
  hierarchyLevels: number; // Number of hierarchy levels
  strategies: {
    analysis: ChunkingStrategy;
    documentation: ChunkingStrategy;
    code: ChunkingStrategy;
  };
}

export interface ChunkingStrategy {
  method: 'hierarchical' | 'semantic' | 'fixed' | 'sliding';
  preserveStructure: boolean;
  contextWindow: {
    enabled: boolean;
    size: number; // Size of context window in tokens
    position: 'both' | 'previous' | 'next';
  };
}

export interface StorageConfig {
  batchSize: number;        // Number of chunks to insert at once
  transactionTimeout: number; // Timeout for database transactions
  retryAttempts: number;
  retryDelay: number;
}

export interface ProcessingConfig {
  maxConcurrency: number;   // Max parallel processing
  memoryLimit: number;      // Memory limit in MB
  progressReporting: boolean;
  errorHandling: 'strict' | 'partial' | 'continue';
}

export interface EnhancementConfig {
  overlapSize: number;      // Size of overlap for sliding window (in tokens)
  enableMetadataInjection: boolean;
  enableSemanticTags: boolean;
  enableCodeExtraction: boolean;
  enableQuestionGeneration: boolean;
  contextWindow: {
    before: number;        // Tokens from previous chunk
    after: number;         // Tokens from next chunk
  };
}

export interface SearchConfig {
  similarity: {
    default: number;      // Default similarity threshold (0.0-1.0)
    high: number;         // Threshold for high relevance matches
    medium: number;       // Threshold for medium relevance matches
    low: number;          // Threshold for low relevance matches
    strict: number;       // Strict threshold for exact matches
  };
  maxResults: number;     // Maximum number of results to return
  enableFiltering: boolean; // Enable additional filtering
  caching: {
    enabled: boolean;     // Enable search result caching
    ttl: number;         // Cache time to live in seconds
  };
}

// Default configuration - pulls from environment variables
export const defaultVectorDatabaseConfig: VectorDatabaseConfig = {
  embedding: {
    provider: 'openai',
    openai: {
      model: (process.env.VECTOR_EMBEDDING_MODEL || 'text-embedding-3-large').replace(/^VECTOR_EMBEDDING_MODEL=/, ''),
      dimensions: parseInt(process.env.VECTOR_EMBEDDING_DIMENSIONS || '1536', 10),
      apiKey: process.env.OPENAI_API_KEY || '',
      maxRetries: parseInt(process.env.VECTOR_EMBEDDING_MAX_RETRIES || '3', 10),
      timeout: parseInt(process.env.VECTOR_EMBEDDING_TIMEOUT || '30000', 10),
      batchSize: parseInt(process.env.VECTOR_EMBEDDING_BATCH_SIZE || '100', 10)
    },
    cache: {
      enabled: process.env.VECTOR_EMBEDDING_CACHE_ENABLED !== 'false',
      ttl: parseInt(process.env.VECTOR_EMBEDDING_CACHE_TTL || '86400', 10), // 24 hours default
      maxSize: parseInt(process.env.VECTOR_EMBEDDING_CACHE_MAX_SIZE || '100', 10) // 100 MB default
    }
  },
  
  chunking: {
    targetChunkSize: parseInt(process.env.VECTOR_CHUNK_SIZE || '400', 10),
    maxChunkSize: parseInt(process.env.VECTOR_MAX_CHUNK_SIZE || '600', 10),
    minChunkSize: parseInt(process.env.VECTOR_MIN_CHUNK_SIZE || '100', 10),
    overlapSize: parseInt(process.env.VECTOR_CHUNK_OVERLAP || '50', 10),
    hierarchyLevels: parseInt(process.env.VECTOR_HIERARCHY_LEVELS || '3', 10),
    strategies: {
      analysis: {
        method: 'hierarchical',
        preserveStructure: true,
        contextWindow: {
          enabled: true,
          size: 100,
          position: 'both'
        }
      },
      documentation: {
        method: 'semantic',
        preserveStructure: true,
        contextWindow: {
          enabled: true,
          size: 150,
          position: 'both'
        }
      },
      code: {
        method: 'semantic',
        preserveStructure: true,
        contextWindow: {
          enabled: true,
          size: 200,
          position: 'both'
        }
      }
    }
  },
  
  storage: {
    batchSize: 500,
    transactionTimeout: 60000, // 1 minute
    retryAttempts: 3,
    retryDelay: 1000 // 1 second
  },
  
  processing: {
    maxConcurrency: 5,
    memoryLimit: 512, // MB
    progressReporting: true,
    errorHandling: 'partial'
  },
  
  enhancement: {
    overlapSize: parseInt(process.env.VECTOR_ENHANCEMENT_OVERLAP_SIZE || '50', 10),
    enableMetadataInjection: process.env.VECTOR_ENHANCEMENT_METADATA !== 'false',
    enableSemanticTags: process.env.VECTOR_ENHANCEMENT_TAGS !== 'false',
    enableCodeExtraction: process.env.VECTOR_ENHANCEMENT_CODE !== 'false',
    enableQuestionGeneration: process.env.VECTOR_ENHANCEMENT_QUESTIONS !== 'false',
    contextWindow: {
      before: parseInt(process.env.VECTOR_CONTEXT_WINDOW_BEFORE || '100', 10),
      after: parseInt(process.env.VECTOR_CONTEXT_WINDOW_AFTER || '100', 10)
    }
  },
  
  search: {
    similarity: {
      default: parseFloat(process.env.VECTOR_SEARCH_SIMILARITY_DEFAULT || '0.35'),
      high: parseFloat(process.env.VECTOR_SEARCH_SIMILARITY_HIGH || '0.5'),
      medium: parseFloat(process.env.VECTOR_SEARCH_SIMILARITY_MEDIUM || '0.4'),
      low: parseFloat(process.env.VECTOR_SEARCH_SIMILARITY_LOW || '0.2'),
      strict: parseFloat(process.env.VECTOR_SEARCH_SIMILARITY_STRICT || '0.6')
    },
    maxResults: parseInt(process.env.VECTOR_SEARCH_MAX_RESULTS || '10', 10),
    enableFiltering: process.env.VECTOR_SEARCH_FILTERING !== 'false',
    caching: {
      enabled: process.env.VECTOR_SEARCH_CACHE_ENABLED !== 'false',
      ttl: parseInt(process.env.VECTOR_SEARCH_CACHE_TTL || '300', 10) // 5 minutes default
    }
  }
};

// Configuration loader with environment variable support
export class VectorDatabaseConfigLoader {
  private static instance: VectorDatabaseConfig;
  
  static load(): VectorDatabaseConfig {
    if (!this.instance) {
      this.instance = this.mergeWithEnvironment(defaultVectorDatabaseConfig);
    }
    return this.instance;
  }
  
  private static mergeWithEnvironment(config: VectorDatabaseConfig): VectorDatabaseConfig {
    // Override with environment variables if present
    const merged = { ...config };
    
    // Embedding model configuration
    if (process.env.VECTOR_EMBEDDING_MODEL) {
      merged.embedding.openai.model = process.env.VECTOR_EMBEDDING_MODEL.replace(/^VECTOR_EMBEDDING_MODEL=/, '');
    }
    
    if (process.env.VECTOR_EMBEDDING_DIMENSIONS) {
      merged.embedding.openai.dimensions = parseInt(process.env.VECTOR_EMBEDDING_DIMENSIONS, 10);
    }
    
    if (process.env.OPENAI_API_KEY) {
      merged.embedding.openai.apiKey = process.env.OPENAI_API_KEY;
    }
    
    // Chunking configuration
    if (process.env.VECTOR_CHUNK_SIZE) {
      merged.chunking.targetChunkSize = parseInt(process.env.VECTOR_CHUNK_SIZE, 10);
    }
    
    if (process.env.VECTOR_CHUNK_OVERLAP) {
      merged.chunking.overlapSize = parseInt(process.env.VECTOR_CHUNK_OVERLAP, 10);
    }
    
    // Processing configuration
    if (process.env.VECTOR_MAX_CONCURRENCY) {
      merged.processing.maxConcurrency = parseInt(process.env.VECTOR_MAX_CONCURRENCY, 10);
    }
    
    return merged;
  }
  
  // Allow runtime updates
  static update(updates: Partial<VectorDatabaseConfig>): void {
    this.instance = {
      ...this.instance,
      ...updates
    };
  }
  
  // Get specific configuration sections
  static getEmbeddingConfig(): EmbeddingConfig {
    return this.load().embedding;
  }
  
  static getChunkingConfig(): ChunkingConfig {
    return this.load().chunking;
  }
  
  static getEnhancementConfig(): EnhancementConfig {
    return this.load().enhancement;
  }
  
  static getSearchConfig(): SearchConfig {
    return this.load().search;
  }
}

// Export convenience functions
export const getVectorConfig = () => VectorDatabaseConfigLoader.load();
export const getEmbeddingConfig = () => VectorDatabaseConfigLoader.getEmbeddingConfig();
export const getChunkingConfig = () => VectorDatabaseConfigLoader.getChunkingConfig();
export const getEnhancementConfig = () => VectorDatabaseConfigLoader.getEnhancementConfig();
export const getSearchConfig = () => VectorDatabaseConfigLoader.getSearchConfig();

// Model update helper
export const updateEmbeddingModel = (model: string, dimensions: number) => {
  VectorDatabaseConfigLoader.update({
    embedding: {
      ...getEmbeddingConfig(),
      openai: {
        ...getEmbeddingConfig().openai,
        model,
        dimensions
      }
    }
  });
};
