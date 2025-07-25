/**
 * Type definitions for DeepWiki integration
 */

import { DeepWikiIssue, DeepWikiRecommendation, DeepWikiScores, DeepWikiMetadata } from './deepwiki';

export interface RepositoryAnalysisOptions {
  branch?: string;
  includeEducational?: boolean;
}

export interface PullRequestAnalysisOptions {
  baseRef?: string;
  includeEducational?: boolean;
}

export interface AnalysisResult {
  exists: boolean;
  completed: boolean;
  issues?: DeepWikiIssue[];
  recommendations?: DeepWikiRecommendation[];
  scores?: DeepWikiScores;
  metadata?: DeepWikiMetadata;
  educationalContent?: EducationalContent;
  error?: string;
}

export interface EducationalContent {
  concepts: EducationalConcept[];
  resources: EducationalResource[];
  bestPractices: string[];
}

export interface EducationalConcept {
  title: string;
  description: string;
  relevance: 'high' | 'medium' | 'low';
  category: string;
}

export interface EducationalResource {
  title: string;
  url: string;
  type: 'article' | 'video' | 'documentation' | 'tutorial';
  relevance: number;
}

import { TempSpaceMetrics } from './deepwiki';

export interface StorageHealthResult {
  healthy: boolean;
  metrics?: TempSpaceMetrics;
  warnings?: string[];
  errors?: string[];
}