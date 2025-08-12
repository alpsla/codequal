/**
 * Context-Aware Model Retrieval for Orchestrator
 * 
 * Retrieves optimal model configurations based on:
 * - Repository language
 * - Repository size
 * - Agent role
 */

import { VectorStorageService } from '@codequal/database';
import { ModelVersionInfo } from '@codequal/core';
import { createLogger } from '@codequal/core/utils';

const logger = createLogger('ContextAwareModelRetrieval');

export interface RepositoryContext {
  language: string;
  size: 'small' | 'medium' | 'large';
  fileCount?: number;
  totalLines?: number;
  primaryLanguage?: string;
  languages?: Record<string, number>; // Language percentages
}

export interface ModelSelectionContext {
  role: string;
  repository: RepositoryContext;
}

export class ContextAwareModelRetrieval {
  constructor(
    private vectorStorage: VectorStorageService
  ) {}
  
  /**
   * Get optimal model for a specific role and repository context
   */
  async getOptimalModel(
    role: string,
    context: RepositoryContext
  ): Promise<{ primary: ModelVersionInfo; fallback: ModelVersionInfo } | null> {
    // Determine repository size if not provided
    const repoSize = context.size || this.inferRepositorySize(context);
    
    // Normalize language
    const language = this.normalizeLanguage(context.language || context.primaryLanguage || 'unknown');
    
    logger.info(`Retrieving model for ${role} (${language}, ${repoSize})`);
    
    // Search for exact match first
    let results = await this.vectorStorage.searchByMetadata({
      'metadata.type': 'model-configuration',
      'metadata.source_type': 'researcher',
      'metadata.role': role,
      'metadata.language': language,
      'metadata.repository_size': repoSize
    }, 10);
    
    // If no exact match, try with default language
    if (results.length === 0 && language !== 'default') {
      logger.info(`No config for ${language}, trying default`);
      results = await this.vectorStorage.searchByMetadata({
        'metadata.type': 'model-configuration',
        'metadata.source_type': 'researcher',
        'metadata.role': role,
        'metadata.language': 'default',
        'metadata.repository_size': repoSize
      }, 10);
    }
    
    // If still no match, try medium size as fallback
    if (results.length === 0 && repoSize !== 'medium') {
      logger.info(`No config for ${repoSize}, trying medium size`);
      results = await this.vectorStorage.searchByMetadata({
        'metadata.type': 'model-configuration',
        'metadata.source_type': 'researcher',
        'metadata.role': role,
        'metadata.language': language,
        'metadata.repository_size': 'medium'
      }, 10);
    }
    
    // Final fallback: default language and medium size
    if (results.length === 0) {
      logger.info('Using default fallback configuration');
      results = await this.vectorStorage.searchByMetadata({
        'metadata.type': 'model-configuration',
        'metadata.source_type': 'researcher',
        'metadata.role': role,
        'metadata.language': 'default',
        'metadata.repository_size': 'medium'
      }, 10);
    }
    
    if (results.length === 0) {
      logger.warn(`No model configuration found for ${role}`);
      return null;
    }
    
    // Get the most recent configuration
    const latestResult = results.sort((a, b) => {
      const dateA = new Date((a.metadata as any).last_updated).getTime();
      const dateB = new Date((b.metadata as any).last_updated).getTime();
      return dateB - dateA;
    })[0];
    
    try {
      const content = JSON.parse(latestResult.content);
      const [primaryProvider, ...primaryModel] = content.primary.split('/');
      const [fallbackProvider, ...fallbackModel] = content.fallback.split('/');
      
      return {
        primary: {
          provider: primaryProvider,
          model: primaryModel.join('/'),
          versionId: 'latest',
          pricing: content.pricing?.primary,
          capabilities: {
            contextWindow: 128000,
            codeQuality: 8.0,
            speed: 7.0,
            reasoning: 7.5
          }
        } as ModelVersionInfo,
        fallback: {
          provider: fallbackProvider,
          model: fallbackModel.join('/'),
          versionId: 'latest',
          pricing: content.pricing?.fallback,
          capabilities: {
            contextWindow: 32000,
            codeQuality: 7.0,
            speed: 8.0,
            reasoning: 7.0
          }
        } as ModelVersionInfo
      };
    } catch (error) {
      logger.error(`Failed to parse configuration for ${role}`, { error });
      return null;
    }
  }
  
  /**
   * Infer repository size from metrics
   */
  private inferRepositorySize(context: RepositoryContext): 'small' | 'medium' | 'large' {
    if (context.size) {
      return context.size;
    }
    
    // Use file count if available
    if (context.fileCount) {
      if (context.fileCount < 100) return 'small';
      if (context.fileCount < 1000) return 'medium';
      return 'large';
    }
    
    // Use total lines if available
    if (context.totalLines) {
      if (context.totalLines < 10000) return 'small';
      if (context.totalLines < 100000) return 'medium';
      return 'large';
    }
    
    // Default to medium
    return 'medium';
  }
  
  /**
   * Normalize language names to standard format
   */
  private normalizeLanguage(language: string): string {
    const normalized = language.toLowerCase().trim();
    
    // Map common variations
    const languageMap: Record<string, string> = {
      'ts': 'typescript',
      'js': 'javascript',
      'jsx': 'javascript',
      'tsx': 'typescript',
      'py': 'python',
      'cpp': 'cpp',
      'c++': 'cpp',
      'csharp': 'csharp',
      'c#': 'csharp',
      'golang': 'go',
      'yml': 'yaml'
    };
    
    return languageMap[normalized] || normalized;
  }
  
  /**
   * Get all available contexts (for debugging/admin)
   */
  async getAvailableContexts(): Promise<Array<{
    role: string;
    language: string;
    size: string;
    primary: string;
    fallback: string;
  }>> {
    const results = await this.vectorStorage.searchByMetadata({
      'metadata.type': 'model-configuration',
      'metadata.source_type': 'researcher'
    }, 1000);
    
    const contexts: Array<{
      role: string;
      language: string;
      size: string;
      primary: string;
      fallback: string;
    }> = [];
    
    for (const result of results) {
      try {
        const metadata = result.metadata as any;
        const content = JSON.parse(result.content);
        
        contexts.push({
          role: metadata.role,
          language: metadata.language,
          size: metadata.repository_size,
          primary: content.primary,
          fallback: content.fallback
        });
      } catch (error) {
        // Skip invalid entries
      }
    }
    
    // Sort by role, language, size for readability
    contexts.sort((a, b) => {
      if (a.role !== b.role) return a.role.localeCompare(b.role);
      if (a.language !== b.language) return a.language.localeCompare(b.language);
      return a.size.localeCompare(b.size);
    });
    
    return contexts;
  }
}

export { ContextAwareModelRetrieval as default };