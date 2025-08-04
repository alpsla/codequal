/**
 * DeepWiki API Wrapper for Standard Framework
 * 
 * This wrapper provides access to the DeepWiki API without direct imports
 * to avoid TypeScript compilation issues across package boundaries.
 */

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
  }>;
  scores: {
    overall: number;
    security: number;
    performance: number;
    maintainability: number;
    testing?: number;
  };
  metadata: {
    timestamp: string;
    tool_version: string;
    duration_ms: number;
    files_analyzed: number;
    total_lines?: number;
    model_used?: string;
    branch?: string;
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
 * Wrapper for DeepWiki API Manager
 */
export class DeepWikiApiWrapper {
  /**
   * Analyze a repository using DeepWiki
   */
  async analyzeRepository(
    repositoryUrl: string,
    options?: {
      branch?: string;
      prId?: string;
      skipCache?: boolean;
    }
  ): Promise<DeepWikiAnalysisResponse> {
    const api = getDeepWikiApi();
    
    if (!api) {
      // If no real API is registered, use mock
      console.warn('No DeepWiki API registered, using mock implementation');
      const mockApi = new MockDeepWikiApiWrapper();
      return mockApi.analyzeRepository(repositoryUrl, options);
    }
    
    return api.analyzeRepository(repositoryUrl, options);
  }
}

/**
 * Mock implementation for testing
 */
export class MockDeepWikiApiWrapper implements IDeepWikiApi {
  async analyzeRepository(
    repositoryUrl: string,
    options?: {
      branch?: string;
      prId?: string;
      skipCache?: boolean;
    }
  ): Promise<DeepWikiAnalysisResponse> {
    return {
      issues: [
        {
          id: 'mock-issue-1',
          severity: 'high',
          category: 'security',
          title: 'SQL Injection Vulnerability',
          description: 'User input is not properly sanitized',
          location: {
            file: 'src/api/users.ts',
            line: 45,
            column: 12
          },
          recommendation: 'Use parameterized queries',
          rule: 'sql-injection'
        },
        {
          id: 'mock-issue-2',
          severity: 'medium',
          category: 'performance',
          title: 'N+1 Query Problem',
          description: 'Database queries in a loop',
          location: {
            file: 'src/api/products.ts',
            line: 78,
            column: 8
          },
          recommendation: 'Use eager loading',
          rule: 'n-plus-one'
        }
      ],
      scores: {
        overall: 75,
        security: 70,
        performance: 80,
        maintainability: 75,
        testing: 72
      },
      metadata: {
        timestamp: new Date().toISOString(),
        tool_version: 'deepwiki-1.0.0',
        duration_ms: 5000,
        files_analyzed: 100,
        total_lines: 10000,
        model_used: 'mock-model',
        branch: options?.branch || 'main'
      }
    };
  }
}