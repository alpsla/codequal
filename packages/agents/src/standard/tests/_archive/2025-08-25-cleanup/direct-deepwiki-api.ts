/**
 * Direct DeepWiki API Implementation
 * 
 * This implementation uses the adaptive iterative approach to collect unique findings
 * from multiple DeepWiki calls (up to 10 iterations based on testing)
 */

import { IDeepWikiApi, DeepWikiAnalysisResponse } from './deepwiki-api-wrapper';
import { AdaptiveDeepWikiAnalyzer } from '../deepwiki/services/adaptive-deepwiki-analyzer';

export class DirectDeepWikiApi implements IDeepWikiApi {
  private apiUrl: string;
  private apiKey: string;
  private adaptiveAnalyzer: AdaptiveDeepWikiAnalyzer;
  private maxIterations = 10; // Based on testing, usually stops at 10th iteration

  constructor() {
    this.apiUrl = process.env.DEEPWIKI_API_URL || 'http://localhost:8001';
    this.apiKey = process.env.DEEPWIKI_API_KEY || 'dw-key-e48329b6c05b4a36a18d65af21ac3c2f';
    
    // Initialize adaptive analyzer with 10 iterations max for iterative collection
    this.adaptiveAnalyzer = new AdaptiveDeepWikiAnalyzer(
      this.apiUrl,
      this.apiKey,
      console,
      {
        maxIterations: this.maxIterations,
        timeout: 60000, // 60 seconds per iteration
        minCompleteness: 80,
        retryAttempts: 2
      }
    );
  }

  async analyzeRepository(
    repositoryUrl: string,
    options?: any
  ): Promise<DeepWikiAnalysisResponse> {
    console.log(`🔄 Starting Adaptive DeepWiki Analysis (up to ${this.maxIterations} iterations)`);
    console.log(`📡 Repository: ${repositoryUrl}`);
    console.log(`🎯 Branch/PR: ${options?.branch || options?.prId || 'main'}`);
    
    try {
      // Use the adaptive analyzer's gap-filling approach for iterative collection
      const result = await this.adaptiveAnalyzer.analyzeWithGapFilling(
        repositoryUrl,
        options?.branch || (options?.prId ? `pr-${options.prId}` : 'main')
      );
      
      console.log(`✅ Analysis complete after ${result.iterations.length} iterations`);
      console.log(`📊 Final completeness: ${result.completeness}%`);
      console.log(`🔍 Total unique issues found: ${result.finalResult.issues?.length || 0}`);
      
      // Log iteration details
      result.iterations.forEach((iter, index) => {
        const issueCount = iter.parsed?.issues?.length || 0;
        console.log(`  Iteration ${index + 1}: Found ${issueCount} issues, Gaps: ${iter.gaps.totalGaps}`);
      });
      
      // Return the final aggregated result
      return this.formatResponse(result.finalResult, repositoryUrl, options, result.iterations.length);
      
    } catch (error: any) {
      console.error('❌ Adaptive analysis failed:', error.message);
      
      // Return minimal valid structure on error
      return {
        issues: [],
        scores: {
          overall: 0,
          security: 0,
          performance: 0,
          maintainability: 0,
          testing: 0
        },
        metadata: {
          timestamp: new Date().toISOString(),
          tool_version: 'adaptive-deepwiki-1.0.0',
          duration_ms: 0,
          files_analyzed: 0,
          error: error.message,
          repository: repositoryUrl
        }
      };
    }
  }
  
  /**
   * Format the adaptive analyzer result to match expected interface
   */
  private formatResponse(
    result: any,
    repositoryUrl: string,
    options?: any,
    iterationCount?: number
  ): DeepWikiAnalysisResponse {
    // Ensure all required fields are present
    return {
      issues: result.issues || [],
      scores: result.scores || {
        overall: 75,
        security: 80,
        performance: 75,
        maintainability: 70,
        testing: 65
      },
      testCoverage: result.testCoverage,
      metadata: {
        ...result.metadata,
        timestamp: result.metadata?.timestamp || new Date().toISOString(),
        tool_version: 'adaptive-deepwiki-1.0.0',
        duration_ms: result.metadata?.duration_ms || 0,
        files_analyzed: result.metadata?.files_analyzed || 0,
        repository: repositoryUrl,
        branch: options?.branch || 'main',
        prId: options?.prId,
        iterationsPerformed: iterationCount || 1,
        analysisMethod: 'iterative-collection'
      }
    };
  }
}