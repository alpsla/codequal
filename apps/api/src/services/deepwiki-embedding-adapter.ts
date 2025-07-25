/**
 * DeepWiki Embedding Adapter
 * 
 * Adapts existing embeddings from analysis_chunks table for DeepWiki use
 */

import { createLogger } from '@codequal/core/utils';
import axios from 'axios';

const logger = createLogger('deepwiki-embedding-adapter');

interface AnalysisChunk {
  id: string;
  repository_id: string;
  chunk_text: string;
  chunk_type: string;
  source_type?: string;
  metadata?: {
    type?: string;
    file?: string;
    embedding_model?: string;
    [key: string]: any;
  };
}

export class DeepWikiEmbeddingAdapter {
  private vectorStorageAdapter: any = null;
  
  /**
   * Get vector storage adapter (lazy loading)
   */
  private async getVectorStorage() {
    if (!this.vectorStorageAdapter) {
      try {
        const { VectorStorageService } = await import('@codequal/database');
        const dbVectorStorage = new VectorStorageService();
        const { VectorStorageAdapter } = await import('./vector-storage-adapter.js');
        this.vectorStorageAdapter = new VectorStorageAdapter(dbVectorStorage);
      } catch (error) {
        logger.warn('Vector storage not available:', error as Error);
        return null;
      }
    }
    return this.vectorStorageAdapter;
  }
  
  /**
   * Prepare a repository for DeepWiki by marking existing embeddings as available
   */
  async prepareRepositoryFromExistingEmbeddings(repositoryUrl: string): Promise<boolean> {
    try {
      logger.info(`Checking for existing embeddings for ${repositoryUrl}`);
      
      const vectorStorage = await this.getVectorStorage();
      if (!vectorStorage) {
        logger.warn('Vector storage not available, cannot check embeddings');
        return false;
      }
      
      // Query existing embeddings from analysis_chunks
      const existingChunks = await vectorStorage.searchByMetadata({
        repository_id: repositoryUrl,
        // Look for any storage type - permanent, cached, or temporary
      }, 1000) as AnalysisChunk[];
      
      if (existingChunks.length === 0) {
        logger.warn(`No existing embeddings found for ${repositoryUrl}`);
        return false;
      }
      
      logger.info(`Found ${existingChunks.length} existing embeddings`);
      
      // Group by content type
      const codeChunks = existingChunks.filter((chunk: AnalysisChunk) => 
        chunk.metadata?.type === 'code' || 
        chunk.source_type === 'code_analysis'
      );
      
      const docChunks = existingChunks.filter((chunk: AnalysisChunk) => 
        chunk.metadata?.type === 'documentation' || 
        chunk.source_type === 'documentation' ||
        chunk.metadata?.file?.endsWith('.md')
      );
      
      logger.info(`- Code chunks: ${codeChunks.length}`);
      logger.info(`- Documentation chunks: ${docChunks.length}`);
      
      // Notify DeepWiki API that embeddings are available
      try {
        const response = await axios.post(
          'http://localhost:8001/api/prepare_repository',
          {
            repo_url: repositoryUrl,
            embeddings_available: true,
            chunk_count: existingChunks.length,
            code_chunks: codeChunks.length,
            doc_chunks: docChunks.length,
            embedding_models: {
              documentation: 'text-embedding-3-large',
              code: 'voyage-code-3'
            },
            source: 'existing_analysis',
            indexed_at: new Date().toISOString()
          },
          {
            headers: {
              'Content-Type': 'application/json'
            },
            timeout: 30000
          }
        );
        
        if (response.status === 200 || response.status === 201) {
          logger.info('✅ Successfully notified DeepWiki API');
          return true;
        }
      } catch (apiError) {
        logger.warn('Could not notify DeepWiki API, but embeddings are available:', (apiError as Error).message);
        // Continue - embeddings are still available even if API notification failed
      }
      
      return true;
      
    } catch (error) {
      logger.error('Failed to prepare repository from existing embeddings:', error as Error);
      return false;
    }
  }
  
  /**
   * Check if a repository has embeddings available
   */
  async hasEmbeddings(repositoryUrl: string): Promise<boolean> {
    try {
      const vectorStorage = await this.getVectorStorage();
      if (!vectorStorage) {
        return false;
      }
      
      const chunks = await vectorStorage.searchByMetadata({
        repository_id: repositoryUrl
      }, 1) as AnalysisChunk[];
      
      return chunks.length > 0;
    } catch (error) {
      logger.error('Failed to check embeddings:', error as Error);
      return false;
    }
  }
  
  /**
   * Get embedding statistics for a repository
   */
  async getEmbeddingStats(repositoryUrl: string): Promise<{
    total: number;
    byType: Record<string, number>;
    bySource: Record<string, number>;
    models: string[];
  }> {
    try {
      const vectorStorage = await this.getVectorStorage();
      if (!vectorStorage) {
        return {
          total: 0,
          byType: {},
          bySource: {},
          models: []
        };
      }
      
      const chunks = await vectorStorage.searchByMetadata({
        repository_id: repositoryUrl
      }, 10000) as AnalysisChunk[];
      
      const stats = {
        total: chunks.length,
        byType: {} as Record<string, number>,
        bySource: {} as Record<string, number>,
        models: [] as string[]
      };
      
      const modelSet = new Set<string>();
      
      chunks.forEach((chunk: AnalysisChunk) => {
        // Count by type
        const type = chunk.metadata?.type || 'unknown';
        stats.byType[type] = (stats.byType[type] || 0) + 1;
        
        // Count by source
        const source = chunk.source_type || 'unknown';
        stats.bySource[source] = (stats.bySource[source] || 0) + 1;
        
        // Track models
        if (chunk.metadata?.embedding_model) {
          modelSet.add(chunk.metadata.embedding_model);
        }
      });
      
      stats.models = Array.from(modelSet);
      
      // If no explicit model info, infer from our configuration
      if (stats.models.length === 0) {
        if (stats.byType.documentation > 0) {
          stats.models.push('text-embedding-3-large');
        }
        if (stats.byType.code > 0) {
          stats.models.push('voyage-code-3');
        }
      }
      
      return stats;
      
    } catch (error) {
      logger.error('Failed to get embedding stats:', error as Error);
      return {
        total: 0,
        byType: {},
        bySource: {},
        models: []
      };
    }
  }
}

// Export singleton instance
export const deepWikiEmbeddingAdapter = new DeepWikiEmbeddingAdapter();