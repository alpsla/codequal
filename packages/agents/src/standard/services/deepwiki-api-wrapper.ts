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
        // Check if mock mode is explicitly enabled
        if (process.env.USE_DEEPWIKI_MOCK === 'true') {
          console.warn('⚠️ DeepWiki Mock Mode is ENABLED - using enhanced mock implementation');
          const mockApi = new MockDeepWikiApiWrapper();
          rawResponse = await mockApi.analyzeRepository(repositoryUrl, options);
        } else {
          // No API available - throw proper error
          const error = DeepWikiErrorHandler.handleError(
            new Error('DeepWiki API is not available'),
            {
              repository: repositoryUrl,
              branch: options?.branch,
              prId: options?.prId
            }
          );
          DeepWikiErrorHandler.logError(error);
          throw error;
        }
      } else {
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
    // Generate different issues for main vs PR branch to show comparison
    const isPR = options?.prId !== undefined;
    
    // Base issues that exist in main branch
    const baseIssues = [
      {
        id: 'existing-critical-1',
        severity: 'critical' as const,
        category: 'security',
        title: 'Hardcoded Database Credentials',
        description: 'Database credentials are hardcoded in source code',
        location: {
          file: 'source/core/Ky.ts',
          line: 15,
          column: 8
        },
        codeSnippet: `// CRITICAL: Hardcoded credentials in source!
const dbConfig = {
  host: 'prod-db.example.com',
  user: 'admin',
  password: 'hardcoded_password',  // NEVER DO THIS!
  database: 'production'
};`,
        recommendation: 'Move credentials to environment variables',
        suggestion: 'Replace hardcoded values with process.env.DB_PASSWORD and process.env.DB_USER',
        remediation: `// Instead of:
const dbConfig = {
  password: 'hardcoded_password',
  user: 'admin'
};

// Use:
const dbConfig = {
  password: process.env.DB_PASSWORD,
  user: process.env.DB_USER
};`,
        rule: 'hardcoded-secrets'
      },
      {
        id: 'existing-high-1',
        severity: 'high' as const,
        category: 'security',
        title: 'SQL Injection Vulnerability',
        description: 'User input is not properly sanitized in query',
        location: {
          file: 'source/utils/options.ts',
          line: 45,
          column: 12
        },
        codeSnippet: `// VULNERABLE: Direct string concatenation
const userId = req.params.id;
const query = "SELECT * FROM users WHERE id = " + userId;
const result = await db.query(query);  // SQL injection risk!`,
        recommendation: 'Use parameterized queries',
        suggestion: 'Replace string concatenation with parameterized queries using prepared statements',
        remediation: `// Instead of:
const query = "SELECT * FROM users WHERE id = " + userId;

// Use:
const query = "SELECT * FROM users WHERE id = ?";
db.query(query, [userId]);`,
        rule: 'sql-injection'
      },
      {
        id: 'existing-medium-1',
        severity: 'medium' as const,
        category: 'performance',
        title: 'Memory Leak in Cache Service',
        description: 'Cache grows unbounded leading to memory issues',
        location: {
          file: 'source/types/options.ts',
          line: 89,
          column: 4
        },
        codeSnippet: `// Memory leak: No cache eviction
class CacheService {
  private cache = new Map();
  
  set(key: string, value: any) {
    // Cache grows forever!
    this.cache.set(key, value);
  }
}`,
        recommendation: 'Implement cache eviction policy',
        suggestion: 'Add LRU cache with max size limit',
        remediation: `// Implement LRU cache:
import LRU from 'lru-cache';

class CacheService {
  private cache = new LRU({
    max: 500,  // Maximum items
    ttl: 1000 * 60 * 60  // 1 hour TTL
  });
  
  set(key: string, value: any) {
    this.cache.set(key, value);
  }
}`,
        rule: 'memory-leak'
      },
      {
        id: 'existing-low-1',
        severity: 'low' as const,
        category: 'code-quality',
        title: 'Unused Import',
        description: 'Imported module is never used',
        location: {
          file: 'source/index.ts',
          line: 3,
          column: 1
        },
        codeSnippet: `// Unused imports:
import { someFunction } from './unused';  // Never used
import lodash from 'lodash';  // Never used
import { formatDate, parseDate } from './date-utils';

// Only formatDate is used
export const format = (date) => formatDate(date);`,
        recommendation: 'Remove unused imports',
        suggestion: 'Remove someFunction and lodash imports',
        remediation: `// Clean imports:
import { formatDate } from './date-utils';

export const format = (date) => formatDate(date);`,
        rule: 'unused-import'
      }
    ];
    
    // New issues introduced in PR
    const prNewIssues = [
      {
        id: 'pr-high-1',
        severity: 'high' as const,
        category: 'security',
        title: 'Missing CSRF Protection',
        description: 'State-changing endpoints lack CSRF token validation',
        location: {
          file: 'test/hooks.ts',
          line: 78,
          column: 6
        },
        codeSnippet: `// Current problematic code:
app.post('/api/endpoint', (req, res) => {
  // No CSRF protection!
  const data = req.body;
  updateDatabase(data);
  res.json({ success: true });
});`,
        recommendation: 'Implement CSRF tokens for all POST/PUT/DELETE requests',
        suggestion: 'Add CSRF middleware to protect state-changing endpoints',
        remediation: `// Add CSRF protection:
import csrf from 'csurf';
const csrfProtection = csrf({ cookie: true });

app.post('/api/endpoint', csrfProtection, (req, res) => {
  // Verify token automatically handled by middleware
  // Process request...
});`,
        rule: 'csrf-protection'
      },
      {
        id: 'pr-medium-1',
        severity: 'medium' as const,
        category: 'performance',
        title: 'N+1 Query Problem',
        description: 'Database queries executed in a loop',
        location: {
          file: 'test/retry.ts',
          line: 156,
          column: 8
        },
        codeSnippet: `// Current N+1 query problem:
const products = await Product.findAll();
for (const product of products) {
  // This executes a query for each product!
  const details = await ProductDetails.findOne({ productId: product.id });
  product.details = details;
}`,
        recommendation: 'Use eager loading or batch queries',
        suggestion: 'Replace loop queries with batch loading',
        remediation: `// Use eager loading:
const products = await Product.findAll({
  include: [{
    model: ProductDetails,
    as: 'details'
  }]
});`,
        rule: 'n-plus-one'
      },
      {
        id: 'pr-medium-2',
        severity: 'medium' as const,
        category: 'dependencies',
        title: 'Outdated Dependency',
        description: 'Package "express" is 3 major versions behind',
        location: {
          file: 'package.json',
          line: 24,
          column: 5
        },
        codeSnippet: `// Current outdated version:
"dependencies": {
  "express": "^3.0.0",  // 3 major versions behind!
  "body-parser": "^1.19.0"
}`,
        recommendation: 'Update to latest version after testing',
        suggestion: 'npm update express@^4.19.2',
        remediation: `// Update package.json:
"dependencies": {
  "express": "^4.19.2",  // Latest stable version
  "body-parser": "^1.20.2"
}`,
        rule: 'outdated-dependency'
      },
      {
        id: 'pr-low-1',
        severity: 'low' as const,
        category: 'code-quality',
        title: 'Console Log in Production Code',
        description: 'Debug console.log statement left in code',
        location: {
          file: 'test/main.ts',
          line: 234,
          column: 4
        },
        codeSnippet: `// Debug statement left in production:
const user = await getUserById(userId);
console.log('DEBUG: User data:', user);  // Should not be in production!
return user;`,
        recommendation: 'Remove or use proper logging library',
        suggestion: 'Replace with proper logging',
        remediation: `// Replace with proper logging:
import { logger } from './utils/logger';

const user = await getUserById(userId);
logger.debug('User authentication attempt', { userId: user.id });
return user;`,
        rule: 'no-console'
      }
    ];
    
    // For main branch, return only base issues
    // For PR branch, return base issues (unchanged) + new issues - one resolved issue
    let issues;
    if (isPR) {
      // PR branch: removed critical issue (resolved), kept others, added new ones
      issues = [...baseIssues.slice(1), ...prNewIssues];
    } else {
      // Main branch: all base issues
      issues = baseIssues;
    }
    
    return {
      issues,
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