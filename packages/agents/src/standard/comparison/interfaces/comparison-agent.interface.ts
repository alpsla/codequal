/**
 * Comparison Agent Interface
 * 
 * Defines the contract for comparison agents that analyze differences
 * between main and feature branch analyses.
 */

import { 
  AnalysisResult, 
  ComparisonResult,
  ComparisonInput,
  ComparisonConfig 
} from '../../types/analysis-types';

/**
 * Interface for comparison agents
 */
export interface IComparisonAgent {
  /**
   * Initialize the agent with configuration
   */
  initialize(config: ComparisonConfig): Promise<void>;

  /**
   * Perform comparison analysis
   */
  analyze(input: ComparisonInput): Promise<ComparisonResult>;

  /**
   * Get agent metadata
   */
  getMetadata(): {
    id: string;
    name: string;
    version: string;
    capabilities: string[];
  };
}

/**
 * Extended comparison agent with report generation
 */
export interface IReportingComparisonAgent extends IComparisonAgent {
  /**
   * Generate markdown report from comparison
   */
  generateReport(comparison: ComparisonResult): Promise<string>;

  /**
   * Generate PR comment from comparison
   */
  generatePRComment(comparison: ComparisonResult): string;
  
  /**
   * Generate final report with all enhancements including educational content
   */
  generateFinalReport?(params: {
    comparison: ComparisonResult;
    educationalContent?: any;
    prMetadata?: any;
    includeEducation?: boolean;
  }): Promise<{ report: string; prComment: string }>;
}

/**
 * Comparison analysis with AI insights
 */
export interface AIComparisonAnalysis {
  resolvedIssues: {
    issues: ComparisonIssue[];
    total: number;
  };
  newIssues: {
    issues: ComparisonIssue[];
    bySeverity: SeverityBreakdown;
    total: number;
  };
  modifiedIssues: {
    issues: ModifiedIssue[];
    total: number;
  };
  unchangedIssues: {
    issues: ComparisonIssue[];
    total: number;
  };
  overallAssessment: {
    securityPostureChange: 'improved' | 'degraded' | 'unchanged';
    codeQualityTrend: 'improving' | 'declining' | 'stable';
    technicalDebtImpact: number;
    prRecommendation: 'approve' | 'review' | 'block';
    confidence: number;
  };
  skillDevelopment: {
    demonstratedSkills: string[];
    improvementAreas: string[];
    learningRecommendations: string[];
  };
  uncertainties: string[];
  evidenceQuality: 'high' | 'medium' | 'low';
}

/**
 * Issue found in comparison
 */
export interface ComparisonIssue {
  issue: any; // TODO: Define proper issue type
  severity: 'critical' | 'high' | 'medium' | 'low';
  confidence: number;
  reasoning: string;
}

/**
 * Modified issue tracking
 */
export interface ModifiedIssue {
  original: any;
  modified: any;
  change: string;
  reasoning: string;
}

/**
 * Severity breakdown
 */
export interface SeverityBreakdown {
  critical: any[];
  high: any[];
  medium: any[];
  low: any[];
}