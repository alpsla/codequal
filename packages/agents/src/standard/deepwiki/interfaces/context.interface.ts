/**
 * DeepWiki Context Interfaces
 */

export type ContextStatus = 'active' | 'expired' | 'not_found' | 'error' | 'creating';

export interface RepositoryContext {
  owner: string;
  repo: string;
  repoType: 'github' | 'gitlab' | 'bitbucket';
  branch?: string;
  prNumber?: number;
}

export interface ContextMetadata {
  repositoryUrl: string;
  contextId: string;
  createdAt: Date;
  expiresAt?: Date;
  status: ContextStatus;
  branch: string;
  analysisDepth: 'quick' | 'comprehensive' | 'targeted';
  fileCount?: number;
  issueCount?: number;
  lastAccessed?: Date;
}

export interface ContextCheckResult {
  available: boolean;
  status: ContextStatus;
  metadata?: ContextMetadata;
  error?: string;
}

export interface ContextCreationOptions {
  branch?: string;
  prNumber?: number;
  forceRefresh?: boolean;
  analysisDepth?: 'quick' | 'comprehensive' | 'targeted';
  includeTests?: boolean;
  includeDocs?: boolean;
}

export interface ContextRefreshStrategy {
  autoRefresh: boolean;
  refreshInterval?: number; // in seconds
  refreshBeforeExpiry?: number; // in seconds
  maxRefreshAttempts?: number;
}