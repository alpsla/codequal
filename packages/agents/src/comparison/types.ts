/**
 * Comparison Agent Types
 * 
 * Common types used across comparison agent implementations
 */

import { DeepWikiAnalysisResult } from '../types/deepwiki';

/**
 * Comparison analysis result
 */
export interface ComparisonAnalysis {
  newIssues: {
    critical: any[];
    high: any[];
    medium: any[];
    low: any[];
  };
  resolvedIssues: {
    critical: any[];
    high: any[];
    medium: any[];
    low: any[];
    total: number;
  };
  modifiedPatterns: {
    added: string[];
    removed: string[];
    modified: string[];
    impact: string;
  };
  securityImpact: {
    score: number;
    vulnerabilitiesAdded: number;
    vulnerabilitiesResolved: number;
    criticalIssues: any[];
    improvements: string[];
  };
  performanceImpact: {
    score: number;
    improvements: string[];
    regressions: string[];
  };
  dependencyChanges: {
    added: string[];
    updated: string[];
    removed: string[];
    securityAlerts: any[];
  };
  codeQualityDelta: {
    maintainability: number;
    testCoverage: number;
    codeComplexity: number;
    duplicatedCode: number;
  };
  insights: any[];
  recommendations: any[];
  riskAssessment: string;
  summary: string;
  overallScore: number;
  scoreChanges: {
    overall: { before: number; after: number; change: number };
    security: { before: number; after: number; change: number };
    performance: { before: number; after: number; change: number };
    maintainability: { before: number; after: number; change: number };
    testing: { before: number; after: number; change: number };
  };
}

/**
 * Repository analysis result
 */
export interface RepositoryAnalysis {
  newIssues: any[];
  recurringIssues: any[];
  resolvedIssues: any[];
  technicalDebt: {
    hours: number;
    cost: number;
    trend: 'increasing' | 'decreasing' | 'stable';
  };
}

/**
 * Educational recommendation
 */
export interface EducationalRecommendation {
  skillArea: string;
  currentLevel: number;
  targetLevel: number;
  resources: Array<{
    title: string;
    type: 'article' | 'video' | 'course' | 'documentation';
    url?: string;
    estimatedTime?: string;
  }>;
  priority: 'high' | 'medium' | 'low';
  rationale: string;
}

/**
 * Base comparison input
 */
export interface BaseComparisonInput {
  mainBranchAnalysis: DeepWikiAnalysisResult;
  featureBranchAnalysis: DeepWikiAnalysisResult;
  prMetadata?: {
    id?: string;
    number?: number;
    title?: string;
    description?: string;
    author?: string;
    created_at?: string;
    repository_url?: string;
  };
  generateReport?: boolean;
}