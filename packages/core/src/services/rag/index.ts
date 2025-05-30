/**
 * Selective RAG Framework
 * 
 * This module implements an intelligent Retrieval-Augmented Generation framework
 * with metadata-based filtering, query analysis, and incremental updates.
 * 
 * Key Features:
 * - Intelligent query analysis and intent detection
 * - Metadata-based filtering for precise results
 * - Incremental repository updates with minimal overhead
 * - Educational content integration
 * - Performance optimization and caching
 */

// Core services
import { SelectiveRAGService } from './selective-rag-service';
import { IncrementalUpdateService } from './incremental-update-service';

export { SelectiveRAGService } from './selective-rag-service';
export type { 
  RAGSearchResult, 
  EducationalContentResult, 
  SearchOptions, 
  RAGSearchResponse,
  EmbeddingService as RAGEmbeddingService
} from './selective-rag-service';

export { QueryAnalyzer } from './query-analyzer';
export type { 
  AnalyzedQuery, 
  UserContext, 
  RepositoryContext
} from './query-analyzer';
export { 
  QueryType, 
  ContentType, 
  DifficultyLevel 
} from './query-analyzer';

export { IncrementalUpdateService } from './incremental-update-service';
export type { 
  FileChange, 
  RepositoryChanges, 
  IncrementalUpdateConfig, 
  ProcessedChunk, 
  ProcessedFile, 
  UpdateResult,
  ContentAnalysisService
} from './incremental-update-service';

// Integration example
export { RAGIntegrationExample } from './rag-integration-example';

/**
 * Factory function to create a configured RAG service
 */
export function createRAGService(
  embeddingService: import('./selective-rag-service').EmbeddingService
): SelectiveRAGService {
  return new SelectiveRAGService(embeddingService);
}

/**
 * Factory function to create a configured incremental update service
 */
export function createIncrementalUpdateService(
  embeddingService: import('./incremental-update-service').EmbeddingService,
  contentAnalysisService: import('./incremental-update-service').ContentAnalysisService
): IncrementalUpdateService {
  return new IncrementalUpdateService(embeddingService, contentAnalysisService);
}

/**
 * Utility function to determine if a query would benefit from RAG search
 */
export function shouldUseRAGSearch(query: string): boolean {
  const lowValuePatterns = [
    /^(yes|no|ok|thanks?)$/i,
    /^\w{1,3}$/,  // Very short queries
    /^[0-9]+$/,   // Just numbers
    /^[^a-zA-Z]*$/ // No letters
  ];
  
  return !lowValuePatterns.some(pattern => pattern.test(query.trim()));
}

/**
 * Utility function to extract repository information from common Git URLs
 */
export function parseRepositoryUrl(url: string): {
  provider: string;
  owner: string;
  repo: string;
  fullName: string;
} | null {
  // GitHub
  const githubMatch = url.match(/github\.com[/:]([^/]+)\/([^/]+?)(?:\.git)?(?:\/.*)?$/);
  if (githubMatch) {
    return {
      provider: 'github',
      owner: githubMatch[1],
      repo: githubMatch[2],
      fullName: `${githubMatch[1]}/${githubMatch[2]}`
    };
  }
  
  // GitLab
  const gitlabMatch = url.match(/gitlab\.com[/:]([^/]+)\/([^/]+?)(?:\.git)?(?:\/.*)?$/);
  if (gitlabMatch) {
    return {
      provider: 'gitlab',
      owner: gitlabMatch[1],
      repo: gitlabMatch[2],
      fullName: `${gitlabMatch[1]}/${gitlabMatch[2]}`
    };
  }
  
  // Bitbucket
  const bitbucketMatch = url.match(/bitbucket\.org[/:]([^/]+)\/([^/]+?)(?:\.git)?(?:\/.*)?$/);
  if (bitbucketMatch) {
    return {
      provider: 'bitbucket',
      owner: bitbucketMatch[1],
      repo: bitbucketMatch[2],
      fullName: `${bitbucketMatch[1]}/${bitbucketMatch[2]}`
    };
  }
  
  return null;
}

/**
 * Configuration defaults for the RAG framework
 */
export const RAG_DEFAULTS = {
  search: {
    maxResults: 10,
    similarityThreshold: 0.7,
    includeEducationalContent: true,
    boost: {
      importanceWeight: 0.3,
      recencyWeight: 0.1,
      frameworkWeight: 0.2
    }
  },
  
  incrementalUpdate: {
    batchSize: 10,
    maxChunksPerFile: 50,
    chunkSize: 1000,
    chunkOverlap: 200,
    includePatterns: [
      '**/*.ts', '**/*.js', '**/*.tsx', '**/*.jsx',
      '**/*.py', '**/*.java', '**/*.go', '**/*.rs',
      '**/*.cpp', '**/*.c', '**/*.cs', '**/*.php',
      '**/*.rb', '**/*.swift', '**/*.kt',
      '**/*.md', '**/*.rst', '**/*.txt',
      '**/*.json', '**/*.yaml', '**/*.yml'
    ],
    excludePatterns: [
      '**/node_modules/**', '**/dist/**', '**/build/**',
      '**/.git/**', '**/coverage/**', '**/target/**',
      '**/bin/**', '**/obj/**', '**/__pycache__/**',
      '**/*.min.js', '**/*.bundle.js'
    ],
    extractCodeMetadata: true,
    calculateImportance: true,
    generateEmbeddings: true,
    retentionDays: 30
  },
  
  queryAnalysis: {
    minConfidenceForSuggestions: 0.6,
    maxSuggestions: 3
  }
} as const;