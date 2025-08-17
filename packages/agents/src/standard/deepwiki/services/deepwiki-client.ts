/**
 * DeepWiki Service for Standard Framework
 * 
 * This service integrates the DeepWiki API for repository analysis
 * within the Standard framework architecture.
 */

import { 
  AnalysisResult, 
  Issue, 
  DeepWikiAnalysisResult 
} from '../../types/analysis-types';
import { ILogger } from '../../services/interfaces/logger.interface';
import { DeepWikiApiWrapper, MockDeepWikiApiWrapper, DeepWikiAnalysisResponse } from './deepwiki-api-wrapper';

export interface IDeepWikiService {
  analyzeRepository(
    repositoryUrl: string,
    branch?: string,
    prId?: string
  ): Promise<AnalysisResult>;
  
  analyzeRepositoryForComparison(
    repositoryUrl: string,
    branch?: string,
    prId?: string
  ): Promise<DeepWikiAnalysisResult>;
}

export class DeepWikiService implements IDeepWikiService {
  private apiWrapper: DeepWikiApiWrapper;
  
  constructor(
    private logger?: ILogger
  ) {
    this.apiWrapper = new DeepWikiApiWrapper();
  }

  /**
   * Analyze a repository using DeepWiki API
   */
  async analyzeRepository(
    repositoryUrl: string,
    branch?: string,
    prId?: string
  ): Promise<AnalysisResult> {
    this.log('info', `Starting DeepWiki analysis for ${repositoryUrl}`, { branch, prId });
    
    try {
      // Use the wrapper to call DeepWiki
      const deepWikiResult = await this.apiWrapper.analyzeRepository(
        repositoryUrl,
        {
          branch,
          prId,
          skipCache: false // Use cache by default
        }
      );

      this.log('info', `DeepWiki raw result received`, {
        hasIssues: !!deepWikiResult?.issues,
        issueCount: deepWikiResult?.issues?.length || 0,
        hasScores: !!deepWikiResult?.scores,
        keys: Object.keys(deepWikiResult || {})
      });

      // Convert DeepWiki result to Standard framework format
      const convertedResult = this.convertDeepWikiToStandardFormat(deepWikiResult);
      
      this.log('info', `Converted result`, {
        issueCount: convertedResult?.issues?.length || 0,
        scores: convertedResult?.scores
      });
      
      return convertedResult;
      
    } catch (error) {
      this.log('error', 'DeepWiki analysis failed', error as Error);
      
      // Return empty result on error
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
          analysisDate: new Date(),
          toolVersion: 'deepwiki-1.0.0',
          error: (error as Error).message
        }
      };
    }
  }

  /**
   * Analyze repository and return in DeepWikiAnalysisResult format for comparison
   */
  async analyzeRepositoryForComparison(
    repositoryUrl: string,
    branch?: string,
    prId?: string
  ): Promise<DeepWikiAnalysisResult> {
    const result = await this.analyzeRepository(repositoryUrl, branch, prId);
    
    // Convert to DeepWikiAnalysisResult format - preserve all fields
    return {
      issues: result.issues.map(issue => ({
        id: issue.id,
        severity: issue.severity,
        category: issue.category,
        type: issue.type || this.determineIssueType(issue),
        location: issue.location,
        message: issue.message,
        description: issue.description,
        suggestedFix: issue.suggestedFix,
        references: issue.references || [],
        // Preserve suggestion/remediation/codeSnippet fields
        codeSnippet: (issue as any).codeSnippet,
        suggestion: (issue as any).suggestion,
        remediation: (issue as any).remediation,
        recommendation: (issue as any).recommendation
      })),
      metadata: {
        files_analyzed: result.metadata?.filesAnalyzed || 0,
        total_lines: result.metadata?.totalLines || 0,
        scan_duration: result.metadata?.duration || 0
      },
      score: result.scores?.overall || 0,
      summary: `Analysis found ${result.issues.length} issues in ${result.metadata?.filesAnalyzed || 0} files`
    };
  }

  /**
   * Convert DeepWiki format to Standard framework format
   */
  private convertDeepWikiToStandardFormat(
    deepWikiResult: DeepWikiAnalysisResponse
  ): AnalysisResult {
    // Handle empty or invalid result
    if (!deepWikiResult || !deepWikiResult.issues) {
      this.log('warn', 'DeepWiki result is empty or invalid');
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
          analysisDate: new Date(),
          toolVersion: '1.0.0',
          duration: 0,
          filesAnalyzed: 0
        }
      };
    }

    // Convert issues with proper error handling
    const issues: Issue[] = deepWikiResult.issues.map((issue, index) => {
      try {
        // Handle location - it might be an object, string, or missing
        let location: { file: string; line: number; column?: number } = { 
          file: 'unknown', 
          line: 0 
        };
        
        // Try to extract file path from various possible locations
        let extractedFile = 'unknown';
        let extractedLine = 0;
        let extractedColumn: number | undefined;
        
        if (issue.location) {
          if (typeof issue.location === 'object') {
            extractedFile = issue.location.file || 'unknown';
            extractedLine = issue.location.line || 0;
            extractedColumn = issue.location.column;
          } else if (typeof issue.location === 'string') {
            // Parse string location like "file.ts:10:5" or "file.ts"
            const parts = (issue.location as any).split(':');
            if (parts.length > 0) {
              extractedFile = parts[0] || 'unknown';
              if (parts.length > 1) extractedLine = parseInt(parts[1]) || 0;
              if (parts.length > 2) extractedColumn = parseInt(parts[2]) || undefined;
            }
          }
        }
        
        // Also check for file in title or description (common pattern)
        if (extractedFile === 'unknown' && issue.title) {
          const fileMatch = issue.title.match(/([^/\s]+\.(ts|js|tsx|jsx|py|go|java|cpp|c|h|cs|rb|php|swift|kt|rs))(?::(\d+))?(?::(\d+))?/i);
          if (fileMatch) {
            extractedFile = fileMatch[1];
            if (fileMatch[3]) extractedLine = parseInt(fileMatch[3]) || extractedLine;
            if (fileMatch[4]) extractedColumn = parseInt(fileMatch[4]) || extractedColumn;
          }
        }
        
        location = {
          file: extractedFile,
          line: extractedLine,
          ...(extractedColumn !== undefined && { column: extractedColumn })
        };

        // Extract code snippet from evidence field if available
        let codeSnippet = (issue as any).codeSnippet;
        if (!codeSnippet && (issue as any).evidence?.snippet) {
          codeSnippet = (issue as any).evidence.snippet;
        }
        
        // Extract remediation - can be a string or an object with immediate/steps
        let remediation = (issue as any).remediation;
        if (remediation && typeof remediation === 'object') {
          // If remediation is an object, format it nicely
          if (remediation.immediate) {
            remediation = remediation.immediate;
            if (remediation.steps && Array.isArray(remediation.steps)) {
              remediation += '\n\nSteps:\n' + remediation.steps.map((s: string, i: number) => `${i + 1}. ${s}`).join('\n');
            }
          }
        }

        // Extract a proper title from the issue
        let title = issue.title || (issue as any).message || issue.description || 'No title provided';
        const description = issue.description || '';
        
        // If title is too long (likely contains full description), extract a shorter title
        if (title.length > 100 && title === issue.description) {
          // Try to extract first sentence or first 80 chars as title
          const firstSentence = title.match(/^[^.!?]+[.!?]/);
          if (firstSentence) {
            title = firstSentence[0].trim();
          } else {
            // Take first 80 chars and add ellipsis
            title = title.substring(0, 80).trim() + '...';
          }
        }
        
        // Ensure we have a clear title
        if (!title || title === 'No title provided') {
          // Generate title from category and severity
          title = `${this.convertCategory(issue.category)} Issue - ${this.convertSeverity(issue.severity).toUpperCase()}`;
        }
        
        return {
          id: issue.id || `issue-${index}`,
          severity: this.convertSeverity(issue.severity),
          category: this.convertCategory(issue.category),
          type: this.determineIssueTypeFromCategory(issue.category, issue.severity),
          location,
          message: title,
          description: description || title,
          suggestedFix: issue.recommendation || (issue as any).suggestion || (issue as any).suggestedFix || '',
          references: [],
          // Preserve suggestion/remediation/codeSnippet fields from various sources
          codeSnippet,
          suggestion: (issue as any).suggestion,
          remediation,
          recommendation: issue.recommendation,
          // Also preserve the evidence field for additional context
          evidence: (issue as any).evidence
        } as any;
      } catch (err) {
        this.log('warn', `Failed to convert issue ${index}:`, err as Error);
        return null;
      }
    }).filter(issue => issue !== null) as Issue[];

    return {
      issues,
      scores: {
        overall: deepWikiResult.scores.overall,
        security: deepWikiResult.scores.security,
        performance: deepWikiResult.scores.performance,
        maintainability: deepWikiResult.scores.maintainability,
        testing: deepWikiResult.scores.testing || 0
      },
      metadata: {
        analysisDate: new Date(deepWikiResult.metadata.timestamp),
        toolVersion: deepWikiResult.metadata.tool_version,
        duration: deepWikiResult.metadata.duration_ms,
        filesAnalyzed: deepWikiResult.metadata.files_analyzed,
        totalLines: deepWikiResult.metadata.total_lines,
        totalIssues: issues.length,
        issuesBySeverity: this.countIssuesBySeverity(issues),
        model: deepWikiResult.metadata.model_used
      }
    };
  }

  /**
   * Convert DeepWiki severity to Standard framework severity
   */
  private convertSeverity(deepWikiSeverity: string): 'critical' | 'high' | 'medium' | 'low' {
    const severityMap: Record<string, 'critical' | 'high' | 'medium' | 'low'> = {
      critical: 'critical',
      high: 'high',
      medium: 'medium',
      low: 'low',
      info: 'low' // Map info to low
    };

    return severityMap[deepWikiSeverity] || 'low';
  }

  /**
   * Convert DeepWiki category to Standard framework category
   */
  private convertCategory(deepWikiCategory: string): 'security' | 'performance' | 'code-quality' | 'architecture' | 'dependencies' {
    const categoryMap: Record<string, 'security' | 'performance' | 'code-quality' | 'architecture' | 'dependencies'> = {
      security: 'security',
      performance: 'performance',
      maintainability: 'code-quality',
      'code-quality': 'code-quality',
      architecture: 'architecture',
      dependencies: 'dependencies',
      testing: 'code-quality' // Map testing to code-quality
    };

    const normalizedCategory = deepWikiCategory.toLowerCase();
    return categoryMap[normalizedCategory] || 'code-quality';
  }

  /**
   * Determine issue type based on category and severity
   */
  private determineIssueType(issue: Issue): 'vulnerability' | 'bug' | 'code-smell' | 'optimization' | 'design-issue' {
    if (issue.category === 'security') {
      return 'vulnerability';
    } else if (issue.severity === 'critical' || issue.severity === 'high') {
      return 'bug';
    } else if (issue.category === 'performance') {
      return 'optimization';
    } else if (issue.category === 'architecture') {
      return 'design-issue';
    } else {
      return 'code-smell';
    }
  }

  /**
   * Determine issue type from category and severity strings
   */
  private determineIssueTypeFromCategory(category: string, severity: string): 'vulnerability' | 'bug' | 'code-smell' | 'optimization' | 'design-issue' {
    const normalizedCategory = category.toLowerCase();
    
    if (normalizedCategory === 'security') {
      return 'vulnerability';
    } else if (severity === 'critical' || severity === 'high') {
      return 'bug';
    } else if (normalizedCategory === 'performance') {
      return 'optimization';
    } else if (normalizedCategory === 'architecture') {
      return 'design-issue';
    } else {
      return 'code-smell';
    }
  }

  /**
   * Count issues by severity
   */
  private countIssuesBySeverity(issues: Issue[]): Record<string, number> {
    return issues.reduce((acc, issue) => {
      acc[issue.severity] = (acc[issue.severity] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }

  /**
   * Log helper
   */
  private log(level: 'info' | 'warn' | 'error', message: string, data?: any) {
    if (this.logger) {
      this.logger[level](message, data);
    } else {
      console[level](`[DeepWikiService] ${message}`, data || '');
    }
  }
}

/**
 * Mock implementation for testing
 */
export class MockDeepWikiService implements IDeepWikiService {
  private mockApiWrapper: MockDeepWikiApiWrapper;
  
  constructor(
    private mockData?: Partial<AnalysisResult>
  ) {
    this.mockApiWrapper = new MockDeepWikiApiWrapper();
  }

  async analyzeRepository(
    repositoryUrl: string,
    branch?: string,
    prId?: string
  ): Promise<AnalysisResult> {
    if (this.mockData) {
      return {
        issues: this.mockData.issues || [],
        scores: this.mockData.scores || {
          overall: 75,
          security: 70,
          performance: 80,
          maintainability: 75,
          testing: 72
        },
        metadata: {
          analysisDate: new Date(),
          toolVersion: 'deepwiki-mock-1.0.0',
          ...this.mockData.metadata
        }
      };
    }
    
    // Use mock wrapper
    const mockResult = await this.mockApiWrapper.analyzeRepository(repositoryUrl, { branch, prId });
    const service = new DeepWikiService();
    return service['convertDeepWikiToStandardFormat'](mockResult);
  }

  async analyzeRepositoryForComparison(
    repositoryUrl: string,
    branch?: string,
    prId?: string
  ): Promise<DeepWikiAnalysisResult> {
    const result = await this.analyzeRepository(repositoryUrl, branch, prId);
    
    // Convert to DeepWikiAnalysisResult format - preserve all fields
    return {
      issues: result.issues.map(issue => ({
        id: issue.id,
        severity: issue.severity,
        category: issue.category,
        type: issue.type || 'code-smell',
        location: issue.location,
        message: issue.message,
        description: issue.description,
        suggestedFix: issue.suggestedFix,
        references: issue.references || [],
        // Preserve suggestion/remediation/codeSnippet fields from mock
        codeSnippet: (issue as any).codeSnippet,
        suggestion: (issue as any).suggestion,
        remediation: (issue as any).remediation,
        recommendation: (issue as any).recommendation
      })),
      metadata: {
        files_analyzed: result.metadata?.filesAnalyzed || 100,
        total_lines: result.metadata?.totalLines || 1000,
        scan_duration: result.metadata?.duration || 5000
      },
      score: result.scores?.overall || 75,
      summary: `Mock analysis found ${result.issues.length} issues`
    };
  }
}

/**
 * Factory function to create DeepWiki service
 */
export function createDeepWikiService(logger?: ILogger, useMock?: boolean): IDeepWikiService {
  if (useMock || process.env.USE_DEEPWIKI_MOCK === 'true') {
    return new MockDeepWikiService();
  }
  return new DeepWikiService(logger);
}

// Export DeepWikiService as DeepWikiClient for backward compatibility
export { DeepWikiService as DeepWikiClient };

