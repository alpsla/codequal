/**
 * Two-Branch Comparator
 * 
 * Main comparison engine for two-branch analysis
 * Compares tool results between main and PR branches
 * Uses deterministic algorithms instead of AI hallucinations
 */

import { 
  BranchAnalysisResult, 
  ComparisonResult, 
  EnhancedIssue, 
  ToolIssue, 
  AnalysisMetrics,
  IssueStatus 
} from '../types';
import { DualBranchIndices } from '../indexing/DualBranchIndexer';
import { IssueMatcher, IssueDeduplicator, MatchResult } from './IssueMatcher';

export interface ComparisonOptions {
  includeUnchanged?: boolean;  // Include pre-existing issues in report
  deduplicateIssues?: boolean; // Remove duplicate findings
  trackFileMovements?: boolean; // Use index to track moved files
  confidenceThreshold?: number; // Minimum confidence for matching (0-100)
}

export interface IssueComparison {
  issue: EnhancedIssue;
  matchDetails?: MatchResult;
  originalIssue?: ToolIssue; // The issue it was matched with
}

export class TwoBranchComparator {
  private matcher: IssueMatcher;
  private deduplicator: IssueDeduplicator;
  private defaultOptions: Required<ComparisonOptions> = {
    includeUnchanged: true,
    deduplicateIssues: true,
    trackFileMovements: true,
    confidenceThreshold: 60
  };
  
  constructor() {
    this.matcher = new IssueMatcher();
    this.deduplicator = new IssueDeduplicator();
  }
  
  /**
   * Compare analysis results between two branches
   */
  async compareAnalyses(
    mainResults: BranchAnalysisResult,
    prResults: BranchAnalysisResult,
    indices?: DualBranchIndices,
    options?: ComparisonOptions
  ): Promise<ComparisonResult> {
    const opts = { ...this.defaultOptions, ...options };
    console.log(`🔍 Comparing ${mainResults.issues.length} main issues with ${prResults.issues.length} PR issues`);
    
    // Deduplicate issues within each branch first
    const mainIssues = opts.deduplicateIssues 
      ? this.deduplicator.deduplicateIssues(mainResults.issues)
      : mainResults.issues;
    
    const prIssues = opts.deduplicateIssues
      ? this.deduplicator.deduplicateIssues(prResults.issues)
      : prResults.issues;
    
    console.log(`   After deduplication: ${mainIssues.length} main, ${prIssues.length} PR`);
    
    // Track which issues have been matched
    const matchedMainIssues = new Set<ToolIssue>();
    const matchedPrIssues = new Set<ToolIssue>();
    
    // Categories for classification
    const newIssues: EnhancedIssue[] = [];
    const fixedIssues: EnhancedIssue[] = [];
    const unchangedIssues: EnhancedIssue[] = [];
    
    // Match PR issues against main issues
    for (const prIssue of prIssues) {
      let bestMatch: { issue: ToolIssue; result: MatchResult } | null = null;
      let bestConfidence = 0;
      
      // Try to find matching issue in main branch
      for (const mainIssue of mainIssues) {
        if (matchedMainIssues.has(mainIssue)) continue; // Already matched
        
        let matchResult: MatchResult;
        
        // Check for file movements if indices provided
        if (opts.trackFileMovements && indices && prIssue.file !== mainIssue.file) {
          const mapping = indices.crossReference.get(prIssue.file);
          if (mapping?.status === 'moved' && mapping.mainPath === mainIssue.file) {
            // File was moved, use special matching
            matchResult = this.matcher.matchWithFileMovement(
              mainIssue,
              prIssue,
              mapping.mainPath,
              mapping.prPath!
            );
          } else {
            matchResult = this.matcher.matchIssues(mainIssue, prIssue);
          }
        } else {
          matchResult = this.matcher.matchIssues(mainIssue, prIssue);
        }
        
        if (matchResult.isMatch && matchResult.confidence > bestConfidence) {
          bestMatch = { issue: mainIssue, result: matchResult };
          bestConfidence = matchResult.confidence;
        }
      }
      
      // Classify the issue
      if (bestMatch && bestConfidence >= opts.confidenceThreshold) {
        // Issue exists in both branches (unchanged)
        matchedMainIssues.add(bestMatch.issue);
        matchedPrIssues.add(prIssue);
        
        if (opts.includeUnchanged) {
          unchangedIssues.push(this.enhanceIssue(prIssue, 'unchanged', bestMatch.result));
        }
      } else {
        // New issue introduced in PR
        newIssues.push(this.enhanceIssue(prIssue, 'new'));
      }
    }
    
    // Find fixed issues (in main but not in PR)
    for (const mainIssue of mainIssues) {
      if (!matchedMainIssues.has(mainIssue)) {
        fixedIssues.push(this.enhanceIssue(mainIssue, 'fixed'));
      }
    }
    
    // Calculate metrics
    const metrics = this.calculateMetrics(newIssues, fixedIssues, unchangedIssues, prResults);
    
    // Log summary
    console.log(`\n📊 Comparison Results:`);
    console.log(`   New issues: ${newIssues.length}`);
    console.log(`   Fixed issues: ${fixedIssues.length}`);
    console.log(`   Unchanged issues: ${unchangedIssues.length}`);
    console.log(`   Overall score: ${metrics.scores.overall}/100`);
    console.log(`   Risk level: ${metrics.riskLevel}`);
    
    return {
      newIssues,
      fixedIssues,
      unchangedIssues,
      metrics,
      trends: this.calculateTrends(newIssues, fixedIssues)
    };
  }
  
  /**
   * Enhance a tool issue with additional metadata
   */
  private enhanceIssue(
    issue: ToolIssue,
    status: IssueStatus,
    matchDetails?: MatchResult
  ): EnhancedIssue {
    const enhanced: EnhancedIssue = {
      ...issue,
      status,
      confidence: matchDetails?.confidence,
      
      // Map tool issue fields to enhanced fields
      id: issue.id,
      fingerprint: this.deduplicator.generateFingerprint(issue),
      tool: issue.tool,
      ruleId: issue.ruleId,
      category: issue.category,
      file: issue.file,
      startLine: issue.startLine,
      endLine: issue.endLine,
      startColumn: issue.startColumn,
      endColumn: issue.endColumn,
      severity: issue.severity,
      message: issue.message,
      details: issue.details,
      codeSnippet: issue.codeSnippet,
      suggestion: issue.suggestion,
      documentation: issue.documentation,
      tags: issue.tags
    };
    
    // Add status-specific metadata
    if (status === 'new') {
      enhanced.impact = this.assessImpact(issue);
      enhanced.requiresAction = issue.severity === 'critical' || issue.severity === 'high';
      enhanced.blocksPR = issue.severity === 'critical';
    } else if (status === 'fixed') {
      enhanced.fixQuality = 'complete';
      enhanced.credit = this.calculateCredit(issue);
    } else if (status === 'unchanged') {
      enhanced.age = 'unknown'; // Would need git history to determine
      enhanced.occurrences = 1;
    }
    
    // Add recommendations based on issue type
    if (!enhanced.recommendation && enhanced.suggestion) {
      enhanced.recommendation = enhanced.suggestion;
    }
    
    // Priority based on severity
    enhanced.priority = this.calculatePriority(issue);
    
    // Estimate effort
    enhanced.estimatedEffort = this.estimateEffort(issue);
    
    return enhanced;
  }
  
  /**
   * Calculate metrics for the comparison
   */
  private calculateMetrics(
    newIssues: EnhancedIssue[],
    fixedIssues: EnhancedIssue[],
    unchangedIssues: EnhancedIssue[],
    prResults: BranchAnalysisResult
  ): AnalysisMetrics {
    // Count by severity
    const countBySeverity = (issues: EnhancedIssue[]) => ({
      critical: issues.filter(i => i.severity === 'critical').length,
      high: issues.filter(i => i.severity === 'high').length,
      medium: issues.filter(i => i.severity === 'medium').length,
      low: issues.filter(i => i.severity === 'low').length,
      info: issues.filter(i => i.severity === 'info').length
    });
    
    // Count by category
    const countByCategory = (issues: EnhancedIssue[]) => {
      const counts: Record<string, number> = {};
      for (const issue of issues) {
        counts[issue.category] = (counts[issue.category] || 0) + 1;
      }
      return counts;
    };
    
    // Count by tool
    const countByTool = (issues: EnhancedIssue[]) => {
      const counts: Record<string, number> = {};
      for (const issue of issues) {
        counts[issue.tool] = (counts[issue.tool] || 0) + 1;
      }
      return counts;
    };
    
    const newSeverity = countBySeverity(newIssues);
    const allIssues = [...newIssues, ...unchangedIssues];
    
    // Calculate scores
    const securityScore = this.calculateSecurityScore(allIssues);
    const qualityScore = this.calculateQualityScore(allIssues);
    const performanceScore = this.calculatePerformanceScore(allIssues);
    
    // Overall score weighted by importance
    const overallScore = Math.round(
      securityScore * 0.4 +
      qualityScore * 0.4 +
      performanceScore * 0.2
    );
    
    // Calculate improvement
    const improvement = fixedIssues.length - newIssues.length;
    const improvementRate = fixedIssues.length > 0 
      ? (improvement / fixedIssues.length) * 100 
      : 0;
    
    // Determine risk level
    let riskLevel: 'low' | 'medium' | 'high' | 'critical';
    if (newSeverity.critical > 0) {
      riskLevel = 'critical';
    } else if (newSeverity.high > 2) {
      riskLevel = 'high';
    } else if (newSeverity.high > 0 || newSeverity.medium > 5) {
      riskLevel = 'medium';
    } else {
      riskLevel = 'low';
    }
    
    return {
      total: allIssues.length,
      new: newIssues.length,
      fixed: fixedIssues.length,
      unchanged: unchangedIssues.length,
      critical: newSeverity.critical,
      high: newSeverity.high,
      medium: newSeverity.medium,
      low: newSeverity.low,
      info: newSeverity.info,
      byCategory: countByCategory(allIssues) as any,
      byTool: countByTool(allIssues),
      scores: {
        overall: overallScore,
        security: securityScore,
        quality: qualityScore,
        performance: performanceScore
      },
      improvement: improvementRate,
      riskLevel
    };
  }
  
  /**
   * Calculate trends from the comparison
   */
  private calculateTrends(
    newIssues: EnhancedIssue[],
    fixedIssues: EnhancedIssue[]
  ) {
    const fixVelocity = fixedIssues.length;
    const newIssueRate = newIssues.length;
    const improvementRate = fixedIssues.length > 0 
      ? ((fixedIssues.length - newIssues.length) / fixedIssues.length) * 100
      : 0;
    
    // Estimate completion based on current rate
    let predictedCompletion: string | undefined;
    if (fixVelocity > newIssueRate) {
      const remainingIssues = newIssues.filter(i => i.severity === 'high' || i.severity === 'critical').length;
      const sprintsToComplete = Math.ceil(remainingIssues / (fixVelocity - newIssueRate));
      predictedCompletion = `${sprintsToComplete} sprints`;
    }
    
    return {
      improvementRate,
      fixVelocity,
      newIssueRate,
      predictedCompletion
    };
  }
  
  /**
   * Helper methods for scoring and assessment
   */
  
  private calculateSecurityScore(issues: EnhancedIssue[]): number {
    const securityIssues = issues.filter(i => i.category === 'security');
    if (securityIssues.length === 0) return 100;
    
    const criticalCount = securityIssues.filter(i => i.severity === 'critical').length;
    const highCount = securityIssues.filter(i => i.severity === 'high').length;
    
    let score = 100;
    score -= criticalCount * 30;
    score -= highCount * 15;
    score -= (securityIssues.length - criticalCount - highCount) * 5;
    
    return Math.max(0, Math.min(100, score));
  }
  
  private calculateQualityScore(issues: EnhancedIssue[]): number {
    const qualityIssues = issues.filter(i => i.category === 'quality' || i.category === 'architecture');
    if (qualityIssues.length === 0) return 100;
    
    const highCount = qualityIssues.filter(i => i.severity === 'high').length;
    const mediumCount = qualityIssues.filter(i => i.severity === 'medium').length;
    
    let score = 100;
    score -= highCount * 10;
    score -= mediumCount * 5;
    score -= (qualityIssues.length - highCount - mediumCount) * 2;
    
    return Math.max(0, Math.min(100, score));
  }
  
  private calculatePerformanceScore(issues: EnhancedIssue[]): number {
    const perfIssues = issues.filter(i => i.category === 'performance');
    if (perfIssues.length === 0) return 100;
    
    let score = 100;
    score -= perfIssues.filter(i => i.severity === 'high').length * 20;
    score -= perfIssues.filter(i => i.severity === 'medium').length * 10;
    score -= perfIssues.filter(i => i.severity === 'low').length * 5;
    
    return Math.max(0, Math.min(100, score));
  }
  
  private assessImpact(issue: ToolIssue): 'breaking' | 'degrading' | 'minor' {
    if (issue.severity === 'critical') return 'breaking';
    if (issue.severity === 'high' || issue.category === 'security') return 'degrading';
    return 'minor';
  }
  
  private calculateCredit(issue: ToolIssue): number {
    // Credit based on severity of fixed issue
    const credits = {
      critical: 10,
      high: 5,
      medium: 3,
      low: 1,
      info: 0.5
    };
    return credits[issue.severity] || 1;
  }
  
  private calculatePriority(issue: ToolIssue): number {
    const severityPriority = {
      critical: 100,
      high: 80,
      medium: 50,
      low: 20,
      info: 10
    };
    
    const categoryBonus = {
      security: 20,
      performance: 10,
      quality: 5,
      dependency: 15,
      architecture: 5
    };
    
    return (severityPriority[issue.severity] || 0) + 
           (categoryBonus[issue.category] || 0);
  }
  
  private estimateEffort(issue: ToolIssue): 'minutes' | 'hours' | 'days' {
    // Simple estimation based on severity and category
    if (issue.severity === 'critical' || issue.category === 'architecture') {
      return 'days';
    }
    if (issue.severity === 'high' || issue.category === 'security') {
      return 'hours';
    }
    return 'minutes';
  }
}

export default TwoBranchComparator;