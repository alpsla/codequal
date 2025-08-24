/**
 * DeepWiki API Wrapper for Standard Framework
 * 
 * This wrapper provides access to the DeepWiki API without direct imports
 * to avoid TypeScript compilation issues across package boundaries.
 * 
 * Now includes intelligent response transformation to handle malformed
 * or incomplete DeepWiki responses automatically.
 */

import { DeepWikiResponseTransformer, TransformationOptions } from './deepwiki-response-transformer';
import { DeepWikiErrorHandler, DeepWikiError, DeepWikiErrorType } from './deepwiki-error-handler';
import { DeepWikiCacheService, getDeepWikiCache } from './deepwiki-cache-service';

export interface DeepWikiAnalysisResponse {
  issues: Array<{
    id: string;
    severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
    category: string;
    title: string;
    description: string;
    location: {
      file: string;
      line: number;
      column?: number;
    };
    recommendation?: string;
    rule?: string;
    codeSnippet?: string;
    suggestion?: string;
    remediation?: string;
  }>;
  scores: {
    overall: number;
    security: number;
    performance: number;
    maintainability: number;
    testing?: number;
  };
  testCoverage?: {
    overall: number;
    line?: number;
    branch?: number;
    function?: number;
    testFiles?: number;
    sourceFiles?: number;
    testToSourceRatio?: number;
  };
  metadata: {
    timestamp: string;
    tool_version: string;
    duration_ms: number;
    files_analyzed: number;
    total_lines?: number;
    model_used?: string;
    branch?: string;
    framework?: string;
    languages?: string;
    testCoverage?: number; // Also support here for compatibility
    [key: string]: any; // Allow additional fields for enhancement
  };
}

/**
 * Interface for DeepWiki API implementations
 */
export interface IDeepWikiApi {
  analyzeRepository(
    repositoryUrl: string,
    options?: {
      branch?: string;
      prId?: string;
      skipCache?: boolean;
    }
  ): Promise<DeepWikiAnalysisResponse>;
}

/**
 * Global registry for DeepWiki API implementation
 */
let deepWikiApiInstance: IDeepWikiApi | null = null;

/**
 * Register a DeepWiki API implementation
 */
export function registerDeepWikiApi(api: IDeepWikiApi) {
  deepWikiApiInstance = api;
}

/**
 * Get the registered DeepWiki API implementation
 */
export function getDeepWikiApi(): IDeepWikiApi | null {
  return deepWikiApiInstance;
}

/**
 * Enhanced Wrapper for DeepWiki API Manager with Intelligent Response Transformation
 */
export class DeepWikiApiWrapper {
  private transformer: DeepWikiResponseTransformer;
  private cache: DeepWikiCacheService;
  private primaryModel?: string;
  private fallbackModel?: string;
  private modelConfigId?: string;
  private language = 'TypeScript';
  private repositorySize: 'small' | 'medium' | 'large' | 'enterprise' = 'medium';

  constructor() {
    this.transformer = new DeepWikiResponseTransformer();
    this.cache = getDeepWikiCache({
      ttl: 3600, // 1 hour cache
      keyPrefix: 'deepwiki:',
      enableMetrics: true
    });
  }

  /**
   * Initialize the wrapper with dynamic model configuration
   */
  async initialize(language?: string, repoSize?: 'small' | 'medium' | 'large' | 'enterprise'): Promise<void> {
    this.language = language || 'TypeScript';
    this.repositorySize = repoSize || 'medium';
    
    try {
      const { getDynamicModelConfig } = await import('../monitoring');
      
      const supabaseConfig = await getDynamicModelConfig(
        'deepwiki',
        this.language,
        this.repositorySize
      );
      
      if (supabaseConfig) {
        this.primaryModel = supabaseConfig.primary_model;
        this.fallbackModel = supabaseConfig.fallback_model;
        this.modelConfigId = supabaseConfig.id;
        console.log(`🎯 DeepWikiApiWrapper initialized with models - Primary: ${this.primaryModel}, Fallback: ${this.fallbackModel}`);
      } else {
        console.warn('No Supabase configuration found for DeepWikiApiWrapper, using defaults');
        this.primaryModel = 'openai/gpt-4-turbo';
        this.fallbackModel = 'openai/gpt-3.5-turbo';
      }
    } catch (error) {
      console.error('Failed to fetch dynamic model config for DeepWikiApiWrapper:', error);
      // Use default models if config fetch fails
      this.primaryModel = 'openai/gpt-4-turbo';
      this.fallbackModel = 'openai/gpt-3.5-turbo';
    }
  }

  /**
   * Parse a string response from DeepWiki API
   */
  private parseDeepWikiResponse(response: any): DeepWikiAnalysisResponse {
    if (typeof response === 'string') {
      try {
        // First try to parse as JSON
        return JSON.parse(response);
      } catch {
        // If not JSON, create a minimal response structure
        console.warn('DeepWiki response is not valid JSON, creating minimal structure');
        return {
          issues: [],
          scores: {
            overall: 0,
            security: 0,
            performance: 0,
            maintainability: 0
          },
          metadata: {
            timestamp: new Date().toISOString(),
            tool_version: '1.0.0',
            duration_ms: 0,
            files_analyzed: 0
          }
        };
      }
    }
    
    // If it's already an object, return as is
    return response as DeepWikiAnalysisResponse;
  }

  /**
   * Analyze a repository using DeepWiki API with tracking
   */
  async analyzeRepository(
    repositoryUrl: string,
    options?: {
      branch?: string;
      prId?: string;
      skipCache?: boolean;
      useTransformer?: boolean;
      forceEnhancement?: boolean;
      useHybridMode?: boolean;
    }
  ): Promise<DeepWikiAnalysisResponse> {
    const startTime = Date.now();
    let isFallback = false;
    let retryCount = 0;
    let inputTokens = 0;
    let outputTokens = 0;
    
    // Check cache first unless explicitly skipped
    if (!options?.skipCache) {
      const cached = await this.cache.getCachedAnalysis({
        repoUrl: repositoryUrl,
        branch: options?.branch,
        prNumber: options?.prId ? parseInt(options.prId) : undefined
      });
      
      if (cached) {
        console.log('✅ DeepWiki cache hit for', repositoryUrl);
        // Log cache metrics
        const metrics = this.cache.getMetrics();
        console.log(`📊 Cache metrics - Hits: ${metrics.hits}, Misses: ${metrics.misses}, Hit rate: ${(metrics.hits / (metrics.hits + metrics.misses) * 100).toFixed(1)}%`);
        return cached;
      }
    }
    
    const api = getDeepWikiApi();
    let rawResponse: DeepWikiAnalysisResponse | null = null;
    
    try {
      if (!api) {
        // No API available - throw proper error
        const error = DeepWikiErrorHandler.handleError(
          new Error('DeepWiki API is not available. Please ensure the DeepWiki service is properly initialized.'),
          {
            repository: repositoryUrl,
            branch: options?.branch,
            prId: options?.prId
          }
        );
        DeepWikiErrorHandler.logError(error);
        throw error;
      }
      
      // Try to get response from real API
      try {
        const response = await api.analyzeRepository(repositoryUrl, options);
        
        // Estimate tokens based on repository URL and response size
        inputTokens = Math.ceil((repositoryUrl.length + JSON.stringify(options || {}).length) / 4);
        
        // Check if response might be a string that needs parsing
        if (typeof response === 'string') {
          console.log('🔄 DeepWiki returned string response, attempting to parse...');
          outputTokens = Math.ceil((response as string).length / 4);
          const parsed = this.parseDeepWikiResponse(response);
          rawResponse = parsed as DeepWikiAnalysisResponse;
        } else if (response && typeof response === 'object') {
          // Check if the response has a string content that needs parsing
          if ((response as any).content && typeof (response as any).content === 'string') {
            console.log('🔄 DeepWiki response has string content, parsing...');
            outputTokens = Math.ceil((response as any).content.length / 4);
            const parsed = this.parseDeepWikiResponse((response as any).content);
            rawResponse = parsed as DeepWikiAnalysisResponse;
          } else {
            outputTokens = Math.ceil(JSON.stringify(response).length / 4);
            rawResponse = response;
          }
        } else {
          rawResponse = response;
        }
        
        // Cache the successful response
        if (rawResponse) {
          await this.cache.cacheAnalysis(
            {
              repoUrl: repositoryUrl,
              branch: options?.branch,
              prNumber: options?.prId ? parseInt(options.prId) : undefined
            },
            rawResponse,
            3600 // 1 hour TTL
          );
          console.log('💾 Cached DeepWiki response for', repositoryUrl);
        }
        
        // Track successful analysis with primary model
        if (this.modelConfigId) {
          const { trackDynamicAgentCall } = await import('../monitoring');
          
          await trackDynamicAgentCall({
            agent: 'deepwiki',
            operation: 'analyze',
            repository: repositoryUrl,
            prNumber: options?.prId,
            language: this.language,
            repositorySize: this.repositorySize,
            modelConfigId: this.modelConfigId,
            model: this.primaryModel || 'unknown',
            modelVersion: 'latest',
            isFallback: false,
            inputTokens,
            outputTokens,
            duration: Date.now() - startTime,
            success: true,
            retryCount: 0
          });
        }
      } catch (apiError: any) {
        retryCount++;
        
        // Try fallback model if available
        if (this.fallbackModel && this.modelConfigId) {
          try {
            console.warn('Primary model failed for DeepWiki analysis, trying fallback');
            isFallback = true;
            
            // Retry with fallback model (in a real implementation, this would use the fallback model)
            const response = await api.analyzeRepository(repositoryUrl, options);
            
            // Process response same as above
            inputTokens = Math.ceil((repositoryUrl.length + JSON.stringify(options || {}).length) / 4);
            
            if (typeof response === 'string') {
              outputTokens = Math.ceil((response as string).length / 4);
              rawResponse = this.parseDeepWikiResponse(response) as DeepWikiAnalysisResponse;
            } else if (response && typeof response === 'object') {
              outputTokens = Math.ceil(JSON.stringify(response).length / 4);
              rawResponse = response;
            }
            
            // Cache the fallback response with shorter TTL
            if (rawResponse) {
              await this.cache.cacheAnalysis(
                {
                  repoUrl: repositoryUrl,
                  branch: options?.branch,
                  prNumber: options?.prId ? parseInt(options.prId) : undefined
                },
                rawResponse,
                1800 // 30 minutes TTL for fallback
              );
              console.log('💾 Cached fallback DeepWiki response for', repositoryUrl);
            }
            
            // Track fallback success
            const { trackDynamicAgentCall } = await import('../monitoring');
            
            await trackDynamicAgentCall({
              agent: 'deepwiki',
              operation: 'analyze',
              repository: repositoryUrl,
              prNumber: options?.prId,
              language: this.language,
              repositorySize: this.repositorySize,
              modelConfigId: this.modelConfigId,
              model: this.fallbackModel,
              modelVersion: 'latest',
              isFallback: true,
              inputTokens,
              outputTokens,
              duration: Date.now() - startTime,
              success: true,
              retryCount
            });
          } catch (fallbackError: any) {
            // Track failure
            if (this.modelConfigId) {
              const { trackDynamicAgentCall } = await import('../monitoring');
              
              await trackDynamicAgentCall({
                agent: 'deepwiki',
                operation: 'analyze',
                repository: repositoryUrl,
                prNumber: options?.prId,
                language: this.language,
                repositorySize: this.repositorySize,
                modelConfigId: this.modelConfigId,
                model: this.fallbackModel,
                modelVersion: 'latest',
                isFallback: true,
                inputTokens,
                outputTokens: 0,
                duration: Date.now() - startTime,
                success: false,
                error: fallbackError.message,
                retryCount
              });
            }
            
            // Handle API error with detailed context
            const error = DeepWikiErrorHandler.handleError(fallbackError, {
              repository: repositoryUrl,
              branch: options?.branch,
              prId: options?.prId,
              apiUrl: process.env.DEEPWIKI_API_URL
            });
            DeepWikiErrorHandler.logError(error);
            throw error;
          }
        } else {
          // No fallback, track primary failure
          if (this.modelConfigId) {
            const { trackDynamicAgentCall } = await import('../monitoring');
            
            await trackDynamicAgentCall({
              agent: 'deepwiki',
              operation: 'analyze',
              repository: repositoryUrl,
              prNumber: options?.prId,
              language: this.language,
              repositorySize: this.repositorySize,
              modelConfigId: this.modelConfigId,
              model: this.primaryModel || 'unknown',
              modelVersion: 'latest',
              isFallback: false,
              inputTokens,
              outputTokens: 0,
              duration: Date.now() - startTime,
              success: false,
              error: apiError.message,
              retryCount: 0
            });
          }
          
          // Handle API error with detailed context
          const error = DeepWikiErrorHandler.handleError(apiError, {
            repository: repositoryUrl,
            branch: options?.branch,
            prId: options?.prId,
            apiUrl: process.env.DEEPWIKI_API_URL
          });
          DeepWikiErrorHandler.logError(error);
          throw error;
        }
      }
    } catch (error) {
      // If it's already a DeepWikiError, re-throw it
      if ((error as any).name === 'DeepWikiError') {
        throw error;
      }
      // Otherwise handle as unknown error
      const deepWikiError = DeepWikiErrorHandler.handleError(error, {
        repository: repositoryUrl,
        branch: options?.branch,
        prId: options?.prId
      });
      DeepWikiErrorHandler.logError(deepWikiError);
      throw deepWikiError;
    }

    // Check if we have a valid response
    if (!rawResponse) {
      const error = DeepWikiErrorHandler.handleError(
        new Error('No response received from DeepWiki'),
        {
          repository: repositoryUrl,
          branch: options?.branch,
          prId: options?.prId
        }
      );
      DeepWikiErrorHandler.logError(error);
      throw error;
    }

    // Apply transformer if enabled
    const useTransformer = options?.useTransformer !== false;
    
    if (useTransformer) {
      const transformOptions: TransformationOptions = {
        repositoryUrl,
        branch: options?.branch,
        prId: options?.prId,
        forceEnhancement: options?.forceEnhancement || process.env.FORCE_DEEPWIKI_ENHANCEMENT === 'true',
        useHybridMode: options?.useHybridMode || process.env.USE_DEEPWIKI_HYBRID === 'true',
        preserveOriginalData: true
      };

      console.log('🔄 Applying intelligent response transformation...');
      return await this.transformer.transform(rawResponse, transformOptions);
    }

    return rawResponse;
  }
  
  /**
   * Invalidate cache for a repository
   */
  async invalidateCache(repositoryUrl: string): Promise<void> {
    await this.cache.invalidateRepo(repositoryUrl);
    console.log(`🗑️ Invalidated cache for ${repositoryUrl}`);
  }
  
  /**
   * Get cache metrics
   */
  getCacheMetrics(): any {
    return this.cache.getMetrics();
  }
  
  /**
   * Clear all cache
   */
  async clearCache(): Promise<void> {
    await this.cache.clear();
    console.log('🗑️ Cleared all DeepWiki cache');
  }
}

