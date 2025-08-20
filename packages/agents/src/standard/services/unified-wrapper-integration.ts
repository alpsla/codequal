/**
 * Unified Wrapper Integration Examples
 * 
 * Shows how different services (API, Web App, Tests) can use
 * the unified analysis wrapper for consistent results.
 */

import { UnifiedAnalysisWrapper, UnifiedAnalysisResult } from './unified-analysis-wrapper';
import { ComparisonAgent } from '../comparison/comparison-agent';
import { ILogger } from './interfaces/logger.interface';

/**
 * API Service Integration
 * Used by the REST API to handle analysis requests
 */
export class ApiAnalysisService {
  private wrapper: UnifiedAnalysisWrapper;
  
  constructor(logger?: ILogger) {
    this.wrapper = new UnifiedAnalysisWrapper(logger);
  }
  
  /**
   * Analyze a pull request
   */
  async analyzePullRequest(
    owner: string,
    repo: string,
    prNumber: number,
    prMetadata?: any
  ): Promise<{
    status: 'success' | 'error';
    data?: any;
    error?: string;
  }> {
    const repoUrl = `https://github.com/${owner}/${repo}`;
    
    try {
      // Analyze main branch
      const mainResult = await this.wrapper.analyzeRepository(repoUrl, {
        branch: 'main',
        validateLocations: true,
        requireMinConfidence: 70,
        prMetadata: {
          repository: `${owner}/${repo}`,
          prNumber,
          ...prMetadata
        }
      });
      
      // Analyze PR branch
      const prResult = await this.wrapper.analyzeRepository(repoUrl, {
        branch: `pr/${prNumber}`,
        prId: prNumber.toString(),
        validateLocations: true,
        requireMinConfidence: 70,
        prMetadata: {
          repository: `${owner}/${repo}`,
          prNumber,
          ...prMetadata
        }
      });
      
      // Generate comparison
      const comparison = this.compareResults(mainResult, prResult);
      
      return {
        status: 'success',
        data: {
          repository: `${owner}/${repo}`,
          prNumber,
          mainBranch: {
            issues: mainResult.analysis.issues.length,
            validLocations: mainResult.validationStats.validLocations,
            score: mainResult.analysis.scores.overall
          },
          prBranch: {
            issues: prResult.analysis.issues.length,
            validLocations: prResult.validationStats.validLocations,
            score: prResult.analysis.scores.overall
          },
          comparison,
          report: await this.generateReport(mainResult, prResult, comparison)
        }
      };
      
    } catch (error) {
      return {
        status: 'error',
        error: (error as Error).message
      };
    }
  }
  
  private compareResults(main: UnifiedAnalysisResult, pr: UnifiedAnalysisResult) {
    const mainIds = new Set(main.analysis.issues.map(i => `${i.location.file}:${i.location.line}:${i.title}`));
    const prIds = new Set(pr.analysis.issues.map(i => `${i.location.file}:${i.location.line}:${i.title}`));
    
    return {
      unchanged: [...mainIds].filter(id => prIds.has(id)).length,
      resolved: [...mainIds].filter(id => !prIds.has(id)).length,
      new: [...prIds].filter(id => !mainIds.has(id)).length
    };
  }
  
  private async generateReport(
    main: UnifiedAnalysisResult,
    pr: UnifiedAnalysisResult,
    comparison: any
  ): Promise<string> {
    // Use ComparisonAgent for report generation
    const agent = new ComparisonAgent();
    
    const comparisonResult = {
      mainAnalysis: main.analysis,
      featureAnalysis: pr.analysis,
      prMetadata: pr.prMetadata || {
        repository: pr.metadata.repository,
        prNumber: pr.metadata.prNumber,
        filesChanged: pr.metadata.filesAnalyzed,
        additions: pr.metadata.linesChanged?.additions,
        deletions: pr.metadata.linesChanged?.deletions
      },
      newIssues: pr.analysis.issues.filter(issue => 
        !main.analysis.issues.some(mainIssue => 
          mainIssue.location.file === issue.location.file &&
          mainIssue.location.line === issue.location.line &&
          mainIssue.title === issue.title
        )
      ),
      resolvedIssues: main.analysis.issues.filter(issue =>
        !pr.analysis.issues.some(prIssue =>
          prIssue.location.file === issue.location.file &&
          prIssue.location.line === issue.location.line &&
          prIssue.title === issue.title
        )
      ),
      unchangedIssues: main.analysis.issues.filter(issue =>
        pr.analysis.issues.some(prIssue =>
          prIssue.location.file === issue.location.file &&
          prIssue.location.line === issue.location.line &&
          prIssue.title === issue.title
        )
      ),
      score: pr.analysis.scores.overall,
      decision: pr.analysis.scores.overall >= 70 ? 'approved' : 'needs_work',
      confidence: pr.validationStats.averageConfidence
    };
    
    return agent.generateReport(comparisonResult as any);
  }
}

/**
 * Web App Integration
 * Used by the frontend to display analysis results
 */
export class WebAnalysisService {
  private wrapper: UnifiedAnalysisWrapper;
  
  constructor() {
    this.wrapper = new UnifiedAnalysisWrapper();
  }
  
  /**
   * Get real-time analysis for display
   */
  async getAnalysis(
    repoUrl: string,
    branch?: string
  ): Promise<{
    issues: Array<{
      id: string;
      title: string;
      severity: string;
      location: string;
      isValid: boolean;
      confidence: number;
    }>;
    stats: {
      total: number;
      valid: number;
      confidence: number;
    };
  }> {
    const result = await this.wrapper.analyzeRepository(repoUrl, {
      branch,
      validateLocations: true,
      requireMinConfidence: 50 // Lower threshold for display
    });
    
    // Transform for frontend display
    const issues = result.analysis.issues.map(issue => {
      const isValid = result.validationStats.validLocations > 0;
      
      return {
        id: issue.id,
        title: issue.title,
        severity: issue.severity,
        location: `${issue.location.file}:${issue.location.line}`,
        isValid: issue.location.file !== 'unknown',
        confidence: isValid ? result.validationStats.averageConfidence : 0
      };
    });
    
    return {
      issues,
      stats: {
        total: result.validationStats.totalIssues,
        valid: result.validationStats.validLocations,
        confidence: result.validationStats.averageConfidence
      }
    };
  }
}

/**
 * Integration Test Service
 * Used by test suites to verify functionality
 */
export class TestAnalysisService {
  private wrapper: UnifiedAnalysisWrapper;
  
  constructor() {
    this.wrapper = new UnifiedAnalysisWrapper();
  }
  
  /**
   * Test with mock data
   */
  async testWithMock(repoUrl: string): Promise<boolean> {
    const result = await this.wrapper.analyzeRepository(repoUrl, {
      useDeepWikiMock: true,
      validateLocations: true,
      requireMinConfidence: 70
    });
    
    // Verify all steps completed
    const requiredSteps = ['DeepWiki Analysis', 'Location Validation'];
    const completedSteps = result.metadata.flowSteps
      .filter(s => s.status !== 'failed')
      .map(s => s.step);
    
    return requiredSteps.every(step => completedSteps.includes(step));
  }
  
  /**
   * Test location accuracy
   */
  async testLocationAccuracy(repoUrl: string): Promise<{
    passed: boolean;
    accuracy: number;
    details: string;
  }> {
    const result = await this.wrapper.analyzeRepository(repoUrl, {
      validateLocations: true,
      maxClarificationAttempts: 3
    });
    
    const accuracy = result.validationStats.totalIssues > 0
      ? result.validationStats.validLocations / result.validationStats.totalIssues
      : 0;
    
    return {
      passed: accuracy >= 0.8, // 80% threshold
      accuracy: accuracy * 100,
      details: `${result.validationStats.validLocations}/${result.validationStats.totalIssues} locations valid`
    };
  }
}

/**
 * GitHub Action Integration
 * Used by CI/CD pipelines
 */
export class CiAnalysisService {
  private wrapper: UnifiedAnalysisWrapper;
  
  constructor() {
    this.wrapper = new UnifiedAnalysisWrapper();
  }
  
  /**
   * Run analysis for CI check
   */
  async runCiCheck(
    repoUrl: string,
    prNumber?: number,
    prMetadata?: any
  ): Promise<{
    pass: boolean;
    score: number;
    issues: number;
    comment: string;
  }> {
    const branch = prNumber ? `pr/${prNumber}` : 'main';
    
    // Extract owner and repo from URL for metadata
    const match = repoUrl.match(/github\.com[/:]([^/]+)\/([^/\.]+)/);  
    const owner = match?.[1] || 'unknown';
    const repo = match?.[2]?.replace(/\.git$/, '') || 'unknown';
    
    const result = await this.wrapper.analyzeRepository(repoUrl, {
      branch,
      prId: prNumber?.toString(),
      validateLocations: true,
      requireMinConfidence: 80, // Higher threshold for CI
      prMetadata: {
        repository: `${owner}/${repo}`,
        prNumber,
        ...prMetadata
      }
    });
    
    const score = result.analysis.scores.overall;
    const pass = score >= 70 && result.validationStats.invalidLocations === 0;
    
    const comment = this.generateCiComment(result, pass);
    
    return {
      pass,
      score,
      issues: result.analysis.issues.length,
      comment
    };
  }
  
  private generateCiComment(result: UnifiedAnalysisResult, pass: boolean): string {
    const icon = pass ? '✅' : '❌';
    
    let comment = `## ${icon} CodeQual Analysis\n\n`;
    comment += `**Score:** ${result.analysis.scores.overall}/100\n`;
    comment += `**Issues:** ${result.validationStats.totalIssues}\n`;
    comment += `**Valid Locations:** ${result.validationStats.validLocations}/${result.validationStats.totalIssues}\n`;
    
    if (result.validationStats.clarifiedLocations > 0) {
      comment += `**Clarified:** ${result.validationStats.clarifiedLocations} locations\n`;
    }
    
    comment += `\n**Status:** ${pass ? 'Ready to merge' : 'Needs attention'}\n`;
    
    if (!pass) {
      comment += '\n### Issues to Address:\n';
      result.analysis.issues
        .filter(i => i.severity === 'critical' || i.severity === 'high')
        .slice(0, 5)
        .forEach(issue => {
          comment += `- **${issue.severity.toUpperCase()}:** ${issue.title} (\`${issue.location.file}:${issue.location.line}\`)\n`;
        });
    }
    
    return comment;
  }
}

/**
 * Export all integration services
 */
export {
  UnifiedAnalysisWrapper,
  UnifiedAnalysisResult,
  UnifiedAnalysisOptions
} from './unified-analysis-wrapper';