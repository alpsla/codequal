import { SelectiveRAGService } from './selective-rag-service';
import { OpenAIEmbeddingService } from '../embeddings/openai-embedding.service';
import { getSupabaseClient } from '../supabase/supabase-client.factory';
import { createLogger } from '../../utils/logger';

const logger = createLogger('RAGServiceFactory');

let ragServiceInstance: SelectiveRAGService | null = null;

/**
 * Get or create a RAG service instance with all dependencies configured
 */
export function getRAGService(): SelectiveRAGService {
  if (!ragServiceInstance) {
    try {
      // Create embedding service
      const embeddingService = new OpenAIEmbeddingService();
      
      // Get Supabase client
      const supabaseClient = getSupabaseClient();
      
      // Create RAG service
      ragServiceInstance = new SelectiveRAGService(
        embeddingService,
        supabaseClient
      );
      
      logger.info('RAG service initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize RAG service', { error });
      throw new Error(`RAG service initialization failed: ${error.message}`);
    }
  }
  
  return ragServiceInstance;
}

/**
 * Create a new RAG service instance with custom configuration
 */
export function createRAGService(options?: {
  openaiApiKey?: string;
  supabaseUrl?: string;
  supabaseKey?: string;
}): SelectiveRAGService {
  const embeddingService = new OpenAIEmbeddingService(options?.openaiApiKey);
  
  const supabaseClient = options?.supabaseUrl && options?.supabaseKey
    ? createSupabaseClient({
        supabaseUrl: options.supabaseUrl,
        supabaseKey: options.supabaseKey,
      })
    : getSupabaseClient();
  
  return new SelectiveRAGService(embeddingService, supabaseClient);
}

/**
 * Reset the singleton instance (useful for testing)
 */
export function resetRAGService(): void {
  ragServiceInstance = null;
  logger.debug('RAG service instance reset');
}