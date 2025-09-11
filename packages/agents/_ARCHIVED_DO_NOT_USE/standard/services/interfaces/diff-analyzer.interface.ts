/**
 * DiffAnalyzer Interface
 * Provides actual git diff analysis between branches
 * Critical for accurate issue detection and fix verification
 */

export interface GitDiff {
  baseBranch: string;
  headBranch: string;
  files: DiffFile[];
  stats: DiffStats;
  commits: CommitInfo[];
  timestamp: Date;
}

export interface DiffFile {
  path: string;
  status: 'added' | 'modified' | 'deleted' | 'renamed';
  additions: number;
  deletions: number;
  hunks: DiffHunk[];
  oldPath?: string; // For renamed files
  language?: string;
  fileType?: string;
}

export interface DiffHunk {
  oldStart: number;
  oldLines: number;
  newStart: number;
  newLines: number;
  content: string;
  context?: string; // Surrounding code for context
}

export interface DiffStats {
  totalFiles: number;
  additions: number;
  deletions: number;
  modifications: number;
  renames: number;
  filesAdded: number;
  filesDeleted: number;
  filesModified: number;
}

export interface CommitInfo {
  sha: string;
  author: string;
  date: Date;
  message: string;
  files: string[];
}

export interface ChangeAnalysis {
  changedFunctions: ChangedFunction[];
  changedClasses: ChangedClass[];
  changedFiles: string[];
  breakingChanges: BreakingChange[];
  securityChanges: SecurityChange[];
  performanceChanges: PerformanceChange[];
}

export interface ChangedFunction {
  name: string;
  file: string;
  lineNumber: number;
  changeType: 'added' | 'modified' | 'deleted';
  signatureChanged: boolean;
  oldSignature?: string;
  newSignature?: string;
  callers?: string[]; // Functions that call this one
}

export interface ChangedClass {
  name: string;
  file: string;
  lineNumber: number;
  changeType: 'added' | 'modified' | 'deleted';
  methodsChanged: string[];
  propertiesChanged: string[];
  interfaceChanged: boolean;
}

export interface BreakingChange {
  type: 'api' | 'signature' | 'removal' | 'rename' | 'schema' | 'config_change' | 'function_signature_change' | 'removed_export';
  severity: 'critical' | 'high' | 'medium' | 'low';
  component: string;
  file?: string;
  description: string;
  before?: string;
  after?: string;
  migrationPath?: string;
  affectedFiles: string[];
}

export interface SecurityChange {
  type: 'authentication' | 'authorization' | 'encryption' | 'validation' | 'exposure';
  severity: 'critical' | 'high' | 'medium' | 'low';
  file: string;
  lineNumber: number;
  description: string;
  recommendation: string;
}

export interface PerformanceChange {
  type: 'algorithm' | 'database' | 'network' | 'memory' | 'cpu';
  impact: 'positive' | 'negative' | 'neutral';
  file: string;
  description: string;
  metrics?: {
    before?: string;
    after?: string;
  };
}

export interface IssueMapping {
  issue: {
    id: string;
    title: string;
    severity: string;
    location: string;
  };
  changeLocation: {
    file: string;
    lineNumbers: number[];
    hunk?: DiffHunk;
  };
  confidence: number; // 0-1 confidence score
  verificationStatus: 'introduced' | 'fixed' | 'modified' | 'unrelated';
}

export interface FixVerification {
  issueId: string;
  status: 'fixed' | 'partially_fixed' | 'not_fixed' | 'regression';
  evidence: {
    codeChange?: string;
    testAdded?: boolean;
    testPassing?: boolean;
    manualVerification?: boolean;
  };
  confidence: number;
  notes?: string;
}

export interface IDiffAnalyzer {
  /**
   * Fetch git diff between two branches
   */
  fetchDiff(repo: string, baseBranch: string, headBranch: string): Promise<GitDiff>;
  
  /**
   * Analyze changes in the diff
   */
  analyzeChanges(diff: GitDiff): Promise<ChangeAnalysis>;
  
  /**
   * Map issues to specific code changes
   */
  mapIssuesToChanges(
    issues: Array<{ id: string; title: string; severity: string; location: string }>,
    changes: ChangeAnalysis,
    diff: GitDiff
  ): Promise<IssueMapping[]>;
  
  /**
   * Verify which issues were actually fixed
   */
  verifyFixes(
    mainIssues: Array<{ id: string; title: string; severity: string }>,
    prChanges: ChangeAnalysis,
    diff: GitDiff
  ): Promise<FixVerification[]>;
  
  /**
   * Get blame information for specific changes
   */
  getBlameInfo(file: string, lineNumbers: number[]): Promise<CommitInfo[]>;
  
  /**
   * Analyze impact radius of changes
   */
  analyzeImpactRadius(changes: ChangeAnalysis): Promise<{
    directImpact: string[];
    indirectImpact: string[];
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
  }>;
  
  /**
   * Check if changes introduce breaking changes
   */
  detectBreakingChanges(diff: GitDiff): Promise<BreakingChange[]>;
  
  /**
   * Get cached diff if available
   */
  getCachedDiff(repo: string, baseBranch: string, headBranch: string): Promise<GitDiff | null>;
  
  /**
   * Clear cache for specific diff
   */
  clearCache(repo: string, baseBranch?: string, headBranch?: string): Promise<void>;
}