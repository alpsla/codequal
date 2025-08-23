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

  constructor() {
    this.transformer = new DeepWikiResponseTransformer();
  }

  /**
   * Parse DeepWiki response handling markdown-wrapped JSON
   */
  private parseDeepWikiResponse(content: string): any {
    // First, try to extract JSON from markdown blocks
    const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      console.log('🔍 Found JSON block in markdown, extracting...');
      try {
        return JSON.parse(jsonMatch[1]);
      } catch (e) {
        console.warn('Failed to parse extracted JSON from markdown:', e);
      }
    }

    // Check if the response starts with text followed by JSON
    const lines = content.split('\n');
    let jsonStartIndex = -1;
    
    // Find where JSON starts (look for opening brace or bracket)
    for (let i = 0; i < lines.length; i++) {
      const trimmed = lines[i].trim();
      if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
        jsonStartIndex = i;
        break;
      }
    }
    
    if (jsonStartIndex >= 0) {
      // Extract JSON portion
      const jsonContent = lines.slice(jsonStartIndex).join('\n');
      try {
        const parsed = JSON.parse(jsonContent);
        console.log('✅ Successfully extracted and parsed JSON from text response');
        return parsed;
      } catch (e) {
        console.warn('Failed to parse extracted JSON:', e);
      }
    }

    // Try to parse the entire content as JSON
    try {
      const parsed = JSON.parse(content);
      console.log('✅ Successfully parsed content as direct JSON');
      return parsed;
    } catch (e) {
      console.warn('Content is not valid JSON:', e);
      throw new Error('Failed to parse DeepWiki response as JSON');
    }
  }

  /**
   * Analyze a repository using DeepWiki with intelligent response enhancement
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
        
        // Check if response might be a string that needs parsing
        if (typeof response === 'string') {
          console.log('🔄 DeepWiki returned string response, attempting to parse...');
          const parsed = this.parseDeepWikiResponse(response);
          rawResponse = parsed as DeepWikiAnalysisResponse;
        } else if (response && typeof response === 'object') {
          // Check if the response has a string content that needs parsing
          if ((response as any).content && typeof (response as any).content === 'string') {
            console.log('🔄 DeepWiki response has string content, parsing...');
            const parsed = this.parseDeepWikiResponse((response as any).content);
            rawResponse = parsed as DeepWikiAnalysisResponse;
          } else {
            rawResponse = response;
          }
        } else {
          rawResponse = response;
        }
      } catch (apiError) {
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
}

