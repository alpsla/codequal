/**
 * Unified Analysis Wrapper
 * 
 * A single flow sequence that combines DeepWiki analysis, location validation,
 * and clarification into one reliable pipeline. This ensures consistent,
 * accurate location data across API services, web apps, and integration tests.
 * 
 * Flow sequence:
 * 1. DeepWiki Analysis with enhanced prompt
 * 2. Location Validation to check accuracy
 * 3. Location Clarification for invalid locations
 * 4. Final validation and confidence scoring
 * 5. Return clean, validated data
 */

import { DeepWikiApiWrapper, DeepWikiAnalysisResponse } from './deepwiki-api-wrapper';
import { LocationValidator, LocationValidationResult } from './location-validator';
import { LocationClarifier } from '../deepwiki/services/location-clarifier';
import { ILogger } from './interfaces/logger.interface';

export interface UnifiedAnalysisOptions {
  branch?: string;
  prId?: string;
  skipCache?: boolean;
  requireMinConfidence?: number; // Minimum confidence threshold (default: 70)
  maxClarificationAttempts?: number; // Max attempts to clarify locations (default: 2)
  validateLocations?: boolean; // Whether to validate locations (default: true)
  useDeepWikiMock?: boolean; // Force mock mode for testing
  // PR metadata for proper report generation
  prMetadata?: {
    repository?: string;
    prNumber?: number;
    prTitle?: string;
    author?: string;
    filesChanged?: number;
    additions?: number;
    deletions?: number;
    baseCommit?: string;
    headCommit?: string;
  };
}

export interface UnifiedAnalysisResult {
  success: boolean;
  analysis: DeepWikiAnalysisResponse;
  validationStats: {
    totalIssues: number;
    validLocations: number;
    clarifiedLocations: number;
    invalidLocations: number;
    averageConfidence: number;
  };
  metadata: {
    repositoryUrl: string;
    branch?: string;
    prId?: string;
    timestamp: string;
    duration: number;
    flowSteps: FlowStep[];
    // Enhanced metadata for reports
    repository?: string; // Extracted repo name
    owner?: string; // Extracted owner
    prNumber?: number; // Numeric PR number
    filesAnalyzed?: number; // Actual files analyzed
    linesChanged?: { additions: number; deletions: number }; // Line changes
    testCoverage?: number; // Test coverage percentage
  };
  // Optional PR metadata passed through
  prMetadata?: any;
}

export interface FlowStep {
  step: string;
  status: 'success' | 'partial' | 'failed';
  duration: number;
  details?: any;
}

export class UnifiedAnalysisWrapper {
  private deepWikiWrapper: DeepWikiApiWrapper;
  private locationClarifier: LocationClarifier;
  private logger?: ILogger;
  private flowSteps: FlowStep[] = [];
  
  constructor(logger?: ILogger) {
    this.logger = logger;
    this.deepWikiWrapper = new DeepWikiApiWrapper();
    this.locationClarifier = new LocationClarifier();
  }
  
  /**
   * Main analysis flow - single entry point for all consumers
   */
  async analyzeRepository(
    repositoryUrl: string,
    options: UnifiedAnalysisOptions = {}
  ): Promise<UnifiedAnalysisResult> {
    const startTime = Date.now();
    this.flowSteps = [];
    
    this.log('info', `Starting unified analysis for ${repositoryUrl}`, {
      branch: options.branch,
      prId: options.prId
    });
    
    try {
      // Step 1: DeepWiki Analysis
      const deepWikiResult = await this.performDeepWikiAnalysis(repositoryUrl, options);
      
      // Step 1.5: Validate and normalize issue types/categories
      this.validateIssueTypes(deepWikiResult.issues);
      
      // Step 2: Location Validation (if enabled)
      let validationResults: Map<string, LocationValidationResult> | undefined;
      if (options.validateLocations !== false) {
        validationResults = await this.validateLocations(repositoryUrl, deepWikiResult);
      }
      
      // Step 3: Location Clarification for invalid locations
      if (validationResults) {
        await this.clarifyInvalidLocations(
          repositoryUrl,
          options.branch || 'main',
          deepWikiResult,
          validationResults,
          options.maxClarificationAttempts || 2
        );
        
        // Step 4: Re-validate after clarification
        validationResults = await this.validateLocations(repositoryUrl, deepWikiResult);
      }
      
      // Step 5: Calculate final statistics
      const stats = this.calculateStatistics(deepWikiResult, validationResults);
      
      // Step 6: Apply confidence filtering
      const minConfidence = options.requireMinConfidence !== undefined ? options.requireMinConfidence : 70;
      if (stats.averageConfidence < minConfidence) {
        this.log('warn', `Average confidence ${stats.averageConfidence}% is below threshold ${minConfidence}%`);
        
        // Filter out low-confidence issues
        deepWikiResult.issues = this.filterLowConfidenceIssues(
          deepWikiResult.issues,
          validationResults,
          minConfidence
        );
        
        // Recalculate stats after filtering
        const filteredStats = this.calculateStatistics(deepWikiResult, validationResults);
        Object.assign(stats, filteredStats);
      }
      
      // Return unified result
      const duration = Date.now() - startTime;
      
      // Extract repository info from URL
      const { owner, repo, prNumber } = this.extractRepoInfo(repositoryUrl, options.prId);
      
      return {
        success: true,
        analysis: deepWikiResult,
        validationStats: stats,
        metadata: {
          repositoryUrl,
          branch: options.branch,
          prId: options.prId,
          timestamp: new Date().toISOString(),
          duration,
          flowSteps: this.flowSteps,
          // Enhanced metadata
          repository: `${owner}/${repo}`,
          owner,
          prNumber,
          filesAnalyzed: this.countAnalyzedFiles(deepWikiResult),
          linesChanged: this.extractLineChanges(deepWikiResult, options),
          testCoverage: this.extractTestCoverage(deepWikiResult)
        },
        prMetadata: options.prMetadata // Pass through PR metadata if provided
      };
      
    } catch (error) {
      const duration = Date.now() - startTime;
      this.log('error', 'Unified analysis failed', { error });
      
      // Return degraded result with error info
      const { owner, repo, prNumber } = this.extractRepoInfo(repositoryUrl, options.prId);
      
      return {
        success: false,
        analysis: this.createEmptyAnalysis(repositoryUrl),
        validationStats: {
          totalIssues: 0,
          validLocations: 0,
          clarifiedLocations: 0,
          invalidLocations: 0,
          averageConfidence: 0
        },
        metadata: {
          repositoryUrl,
          branch: options.branch,
          prId: options.prId,
          timestamp: new Date().toISOString(),
          duration,
          flowSteps: this.flowSteps,
          repository: `${owner}/${repo}`,
          owner,
          prNumber
        },
        prMetadata: options.prMetadata
      };
    }
  }
  
  /**
   * Step 1: Perform DeepWiki analysis with enhanced prompt
   */
  private async performDeepWikiAnalysis(
    repositoryUrl: string,
    options: UnifiedAnalysisOptions
  ): Promise<DeepWikiAnalysisResponse> {
    const stepStart = Date.now();
    
    try {
      this.log('info', 'Step 1: Performing DeepWiki analysis');
      
      // Mock mode has been removed - always use real DeepWiki API
      
      const result = await this.deepWikiWrapper.analyzeRepository(repositoryUrl, {
        branch: options.branch,
        prId: options.prId,
        skipCache: options.skipCache,
        useTransformer: true, // Always use transformer to handle malformed responses
        forceEnhancement: false, // Don't force enhancement, let it decide
        useHybridMode: false // Use real data when available
      });
      
      this.flowSteps.push({
        step: 'DeepWiki Analysis',
        status: 'success',
        duration: Date.now() - stepStart,
        details: {
          issuesFound: result.issues.length,
          modelUsed: result.metadata.model_used
        }
      });
      
      return result;
      
    } catch (error) {
      this.flowSteps.push({
        step: 'DeepWiki Analysis',
        status: 'failed',
        duration: Date.now() - stepStart,
        details: { error: (error as Error).message }
      });
      throw error;
    }
  }
  
  /**
   * Step 2: Validate issue locations
   */
  private async validateLocations(
    repositoryUrl: string,
    analysis: DeepWikiAnalysisResponse
  ): Promise<Map<string, LocationValidationResult>> {
    const stepStart = Date.now();
    
    try {
      this.log('info', 'Step 2: Validating issue locations');
      
      const validator = new LocationValidator(repositoryUrl);
      
      const issuesToValidate = analysis.issues.map(issue => ({
        id: issue.id,
        title: issue.title,
        category: issue.category,
        severity: issue.severity,
        location: issue.location,
        description: issue.description,
        codeSnippet: (issue as any).codeSnippet || (issue as any).evidence?.snippet
      }));
      
      const results = await validator.validateLocations(issuesToValidate);
      const stats = validator.getValidationStats(results);
      
      this.flowSteps.push({
        step: 'Location Validation',
        status: stats.valid === stats.total ? 'success' : 'partial',
        duration: Date.now() - stepStart,
        details: {
          valid: stats.valid,
          invalid: stats.total - stats.valid,
          averageConfidence: Math.round(stats.averageConfidence)
        }
      });
      
      return results;
      
    } catch (error) {
      this.flowSteps.push({
        step: 'Location Validation',
        status: 'failed',
        duration: Date.now() - stepStart,
        details: { error: (error as Error).message }
      });
      // Return empty results on failure
      return new Map();
    }
  }
  
  /**
   * Step 3: Clarify invalid locations using LocationClarifier
   */
  private async clarifyInvalidLocations(
    repositoryUrl: string,
    branch: string,
    analysis: DeepWikiAnalysisResponse,
    validationResults: Map<string, LocationValidationResult>,
    maxAttempts: number
  ): Promise<void> {
    const stepStart = Date.now();
    let clarifiedCount = 0;
    
    try {
      this.log('info', 'Step 3: Clarifying invalid locations');
      
      // Find issues with invalid locations
      const invalidIssues = analysis.issues.filter(issue => {
        const validation = validationResults.get(issue.id);
        return !validation?.isValid;
      });
      
      if (invalidIssues.length === 0) {
        this.flowSteps.push({
          step: 'Location Clarification',
          status: 'success',
          duration: Date.now() - stepStart,
          details: { message: 'No invalid locations to clarify' }
        });
        return;
      }
      
      this.log('info', `Found ${invalidIssues.length} issues with invalid locations`);
      
      // Attempt clarification up to maxAttempts times
      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        if (invalidIssues.length === 0) break;
        
        this.log('info', `Clarification attempt ${attempt}/${maxAttempts}`);
        
        const unknownLocationIssues = invalidIssues.map(issue => ({
          id: issue.id,
          title: issue.title,
          description: issue.description,
          severity: issue.severity,
          category: issue.category,
          codeSnippet: issue.codeSnippet // Pass the code snippet!
        }));
        
        const clarifications = await this.locationClarifier.clarifyLocations(
          repositoryUrl,
          branch,
          unknownLocationIssues
        );
        
        // Apply clarified locations
        this.locationClarifier.applyLocations(analysis.issues, clarifications);
        clarifiedCount += clarifications.length;
        
        // Remove successfully clarified issues from invalid list
        for (const clarification of clarifications) {
          const index = invalidIssues.findIndex(i => i.id === clarification.issueId);
          if (index >= 0) {
            invalidIssues.splice(index, 1);
          }
        }
        
        if (clarifications.length === 0) {
          // No more clarifications possible
          break;
        }
      }
      
      this.flowSteps.push({
        step: 'Location Clarification',
        status: clarifiedCount > 0 ? 'success' : 'partial',
        duration: Date.now() - stepStart,
        details: {
          clarified: clarifiedCount,
          remaining: invalidIssues.length
        }
      });
      
    } catch (error) {
      this.flowSteps.push({
        step: 'Location Clarification',
        status: 'failed',
        duration: Date.now() - stepStart,
        details: { error: (error as Error).message }
      });
      // Continue even if clarification fails
    }
  }
  
  /**
   * Calculate validation statistics
   */
  private calculateStatistics(
    analysis: DeepWikiAnalysisResponse,
    validationResults?: Map<string, LocationValidationResult>
  ): UnifiedAnalysisResult['validationStats'] {
    const totalIssues = analysis.issues.length;
    
    if (!validationResults || validationResults.size === 0) {
      return {
        totalIssues,
        validLocations: 0,
        clarifiedLocations: 0,
        invalidLocations: totalIssues,
        averageConfidence: 0
      };
    }
    
    let validCount = 0;
    let clarifiedCount = 0;
    let totalConfidence = 0;
    
    for (const issue of analysis.issues) {
      const validation = validationResults.get(issue.id);
      if (validation?.isValid) {
        validCount++;
        totalConfidence += validation.confidence;
        
        // Check if this was clarified (has metadata)
        if ((issue as any).metadata?.locationConfidence) {
          clarifiedCount++;
        }
      }
    }
    
    return {
      totalIssues,
      validLocations: validCount,
      clarifiedLocations: clarifiedCount,
      invalidLocations: totalIssues - validCount,
      averageConfidence: validCount > 0 ? totalConfidence / validCount : 0
    };
  }
  
  /**
   * Validate and normalize issue types and categories
   */
  private validateIssueTypes(issues: DeepWikiAnalysisResponse['issues']): void {
    issues.forEach((issue: any) => {
      // Ensure category is set
      if (!issue.category || issue.category === 'undefined' || issue.category === 'null') {
        // Try to infer category from severity or description
        if (issue.severity === 'critical' || (issue.description && issue.description.toLowerCase().includes('security'))) {
          issue.category = 'security';
        } else if (issue.description && issue.description.toLowerCase().includes('performance')) {
          issue.category = 'performance';
        } else if (issue.description && (issue.description.toLowerCase().includes('maintain') || issue.description.toLowerCase().includes('code quality'))) {
          issue.category = 'maintainability';
        } else if (issue.description && issue.description.toLowerCase().includes('bug')) {
          issue.category = 'bug';
        } else {
          issue.category = 'general';
        }
      }
      
      // Ensure type is set
      if (!issue.type || issue.type === 'undefined' || issue.type === 'null') {
        // Map category to type if not set
        const categoryToType: Record<string, string> = {
          'security': 'vulnerability',
          'performance': 'optimization',
          'maintainability': 'code-smell',
          'bug': 'defect',
          'style': 'style',
          'best-practice': 'improvement',
          'general': 'issue'
        };
        issue.type = categoryToType[issue.category] || 'issue';
      }
      
      // Validate severity
      const validSeverities = ['critical', 'high', 'medium', 'low'];
      if (!issue.severity || !validSeverities.includes(issue.severity)) {
        // Default based on category
        if (issue.category === 'security') {
          issue.severity = 'high';
        } else if (issue.category === 'bug') {
          issue.severity = 'medium';
        } else {
          issue.severity = 'low';
        }
      }
    });
  }
  
  /**
   * Filter out issues with low confidence scores
   */
  private filterLowConfidenceIssues(
    issues: DeepWikiAnalysisResponse['issues'],
    validationResults?: Map<string, LocationValidationResult>,
    minConfidence = 70
  ): DeepWikiAnalysisResponse['issues'] {
    if (!validationResults) return issues;
    
    return issues.filter(issue => {
      const validation = validationResults.get(issue.id);
      
      // Keep if valid and confidence is above threshold
      if (validation?.isValid && validation.confidence >= minConfidence) {
        return true;
      }
      
      // Keep critical/high severity even with lower confidence
      if (issue.severity === 'critical' || issue.severity === 'high') {
        return validation?.confidence ? validation.confidence >= minConfidence * 0.7 : false;
      }
      
      // Filter out low confidence issues
      return false;
    });
  }
  
  /**
   * Create empty analysis result for error cases
   */
  private createEmptyAnalysis(repositoryUrl: string): DeepWikiAnalysisResponse {
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
        tool_version: 'unified-wrapper-1.0.0',
        duration_ms: 0,
        files_analyzed: 0,
        error: 'Analysis failed'
      }
    };
  }
  
  /**
   * Log messages with optional logger
   */
  private log(level: 'info' | 'warn' | 'error', message: string, data?: any) {
    const prefix = '[UnifiedAnalysisWrapper]';
    
    if (this.logger) {
      this.logger[level](`${prefix} ${message}`, data);
    } else {
      const logMessage = data 
        ? `${prefix} ${message} ${JSON.stringify(data)}`
        : `${prefix} ${message}`;
      
      if (level === 'error') {
        console.error(logMessage);
      } else if (level === 'warn') {
        console.warn(logMessage);
      } else {
        console.log(logMessage);
      }
    }
  }
  
  /**
   * Get validation report for debugging
   */
  async generateValidationReport(result: UnifiedAnalysisResult): Promise<string> {
    let report = '# Unified Analysis Report\n\n';
    
    // Summary
    report += '## Summary\n\n';
    report += `- **Repository:** ${result.metadata.repositoryUrl}\n`;
    report += `- **Branch:** ${result.metadata.branch || 'main'}\n`;
    report += `- **PR:** ${result.metadata.prId || 'N/A'}\n`;
    report += `- **Success:** ${result.success ? '✅' : '❌'}\n`;
    report += `- **Duration:** ${result.metadata.duration}ms\n\n`;
    
    // Flow Steps
    report += '## Flow Steps\n\n';
    for (const step of result.metadata.flowSteps) {
      const icon = step.status === 'success' ? '✅' : step.status === 'partial' ? '⚠️' : '❌';
      report += `${icon} **${step.step}** (${step.duration}ms)\n`;
      if (step.details) {
        for (const [key, value] of Object.entries(step.details)) {
          report += `   - ${key}: ${value}\n`;
        }
      }
    }
    report += '\n';
    
    // Validation Statistics
    report += '## Validation Statistics\n\n';
    report += `- **Total Issues:** ${result.validationStats.totalIssues}\n`;
    report += `- **Valid Locations:** ${result.validationStats.validLocations} (${Math.round(result.validationStats.validLocations / result.validationStats.totalIssues * 100)}%)\n`;
    report += `- **Clarified Locations:** ${result.validationStats.clarifiedLocations}\n`;
    report += `- **Invalid Locations:** ${result.validationStats.invalidLocations}\n`;
    report += `- **Average Confidence:** ${Math.round(result.validationStats.averageConfidence)}%\n\n`;
    
    // Issues
    report += '## Issues Found\n\n';
    if (result.analysis.issues.length === 0) {
      report += 'No issues found.\n';
    } else {
      for (const issue of result.analysis.issues) {
        report += `### ${issue.severity.toUpperCase()}: ${issue.title}\n`;
        report += `- **Location:** \`${issue.location.file}:${issue.location.line}\`\n`;
        report += `- **Category:** ${issue.category}\n`;
        if (issue.description) {
          report += `- **Description:** ${issue.description}\n`;
        }
        report += '\n';
      }
    }
    
    return report;
  }
  
  /**
   * Extract repository information from URL
   */
  private extractRepoInfo(repositoryUrl: string, prId?: string): {
    owner: string;
    repo: string;
    prNumber: number;
  } {
    try {
      // Handle GitHub URLs: https://github.com/owner/repo
      const githubMatch = repositoryUrl.match(/github\.com[/:]([^/]+)\/([^/.]+)/);
      if (githubMatch) {
        const owner = githubMatch[1];
        const repo = githubMatch[2].replace(/\.git$/, '');
        const prNumber = prId ? parseInt(prId, 10) : 0;
        
        return { owner, repo, prNumber };
      }
      
      // Handle GitLab URLs
      const gitlabMatch = repositoryUrl.match(/gitlab\.com[/:]([^/]+)\/([^/.]+)/);
      if (gitlabMatch) {
        const owner = gitlabMatch[1];
        const repo = gitlabMatch[2].replace(/\.git$/, '');
        const prNumber = prId ? parseInt(prId, 10) : 0;
        
        return { owner, repo, prNumber };
      }
      
      // Fallback
      return { owner: 'unknown', repo: 'unknown', prNumber: 0 };
      
    } catch (error) {
      this.log('warn', 'Failed to extract repo info from URL', { repositoryUrl, error });
      return { owner: 'unknown', repo: 'unknown', prNumber: 0 };
    }
  }
  
  /**
   * Count analyzed files from issues
   */
  private countAnalyzedFiles(analysis: DeepWikiAnalysisResponse): number {
    const uniqueFiles = new Set<string>();
    
    for (const issue of analysis.issues) {
      if (issue.location?.file && issue.location.file !== 'unknown') {
        uniqueFiles.add(issue.location.file);
      }
    }
    
    return uniqueFiles.size;
  }
  
  /**
   * Extract line changes from analysis or options
   */
  private extractLineChanges(
    analysis: DeepWikiAnalysisResponse, 
    options: UnifiedAnalysisOptions
  ): { additions: number; deletions: number } {
    // First check if provided in options
    if (options.prMetadata?.additions !== undefined && options.prMetadata?.deletions !== undefined) {
      return {
        additions: options.prMetadata.additions,
        deletions: options.prMetadata.deletions
      };
    }
    
    // Check if available in analysis metadata
    if ((analysis as any).metadata?.linesChanged) {
      return (analysis as any).metadata.linesChanged;
    }
    
    // Fallback to counting from issues (approximate)
    const additions = analysis.issues.filter(i => (i as any).type === 'new' || i.category === 'new').length * 10;
    const deletions = analysis.issues.filter(i => (i as any).type === 'removed' || i.category === 'removed').length * 5;
    
    return { additions, deletions };
  }
  
  /**
   * Extract test coverage from analysis
   */
  private extractTestCoverage(analysis: DeepWikiAnalysisResponse): number | undefined {
    // Check if available in metadata
    if ((analysis as any).metadata?.testCoverage) {
      return (analysis as any).metadata.testCoverage;
    }
    
    // Check if mentioned in any issue
    for (const issue of analysis.issues) {
      const coverageMatch = issue.description?.match(/test coverage[:\s]+(\d+)%/i);
      if (coverageMatch) {
        return parseInt(coverageMatch[1], 10);
      }
    }
    
    // Return undefined if not available
    return undefined;
  }
}