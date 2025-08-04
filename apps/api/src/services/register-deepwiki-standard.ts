/**
 * Register DeepWiki API with Standard Framework
 * 
 * This module registers the real DeepWiki API implementation
 * with the Standard framework for use in agents.
 */

import { deepWikiApiManager } from './deepwiki-api-manager';
import type { IDeepWikiApi } from '@codequal/agents/standard';

// Import the registration function
import { registerDeepWikiApi } from '@codequal/agents/standard';

/**
 * Register the real DeepWiki API with the Standard framework
 */
export async function registerDeepWikiWithStandard() {
  try {
    // Create adapter that implements IDeepWikiApi
    const adapter: IDeepWikiApi = {
      async analyzeRepository(repositoryUrl: string, options?: any) {
        const result = await deepWikiApiManager.analyzeRepository(repositoryUrl, options);
        
        // Transform DeepWikiAnalysisResult to DeepWikiAnalysisResponse
        return {
          issues: result.issues.map((issue, index) => ({
            id: `deepwiki-${index}`,
            severity: issue.severity as 'critical' | 'high' | 'medium' | 'low' | 'info',
            category: issue.category,
            title: issue.message || issue.type,
            description: issue.message,
            location: {
              file: issue.file || 'unknown',
              line: issue.line || 0
            },
            recommendation: issue.suggestion,
            rule: issue.type
          })),
          scores: result.scores,
          metadata: {
            timestamp: result.metadata.analyzed_at?.toISOString() || new Date().toISOString(),
            tool_version: '1.0.0',
            duration_ms: result.metadata.duration_ms,
            files_analyzed: result.metadata.files_analyzed || 0,
            total_lines: result.metadata.languages ? 
              Object.values(result.metadata.languages).reduce((sum, count) => sum + count, 0) : 
              undefined,
            model_used: 'deepwiki',
            branch: result.metadata.branch
          }
        };
      }
    };
    
    // Register the real API
    registerDeepWikiApi(adapter);
    
    console.log('✅ DeepWiki API successfully registered with Standard framework');
    return true;
  } catch (error) {
    console.error('❌ Failed to register DeepWiki API with Standard framework:', error);
    return false;
  }
}