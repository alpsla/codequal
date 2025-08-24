/**
 * Repository and analysis-related types
 */
/**
 * Repository hosting platform
 */
export type RepositoryType = 'github' | 'gitlab' | 'bitbucket';
/**
 * Repository context information
 */
export interface RepositoryContext {
    /**
     * Repository owner (user or organization)
     */
    owner: string;
    /**
     * Repository name
     */
    repo: string;
    /**
     * Repository type (GitHub, GitLab, BitBucket)
     */
    repoType: RepositoryType;
    /**
     * Primary language of the repository
     */
    language: string;
    /**
     * Secondary languages (optional)
     */
    secondaryLanguages?: string[];
    /**
     * Size of the repository in bytes (optional)
     */
    sizeBytes?: number;
    /**
     * Repository visibility (optional)
     */
    visibility?: 'public' | 'private' | 'internal';
    /**
     * Framework(s) used in the repository (optional)
     */
    frameworks?: string[];
    /**
     * Repository description (optional)
     */
    description?: string;
    /**
     * Whether the repository is a fork (optional)
     */
    isFork?: boolean;
    /**
     * Last commit date (optional)
     */
    lastCommitDate?: string;
    /**
     * Default branch (optional, defaults to 'main')
     */
    defaultBranch?: string;
    /**
     * Total number of commits (optional)
     */
    commitCount?: number;
    /**
     * Number of contributors (optional)
     */
    contributorCount?: number;
    /**
     * Creation date of the repository (optional)
     */
    createdAt?: string;
    /**
     * External URLs related to the repository (optional)
     */
    urls?: {
        homepage?: string;
        documentation?: string;
        issues?: string;
    };
    /**
     * Custom metadata (optional)
     */
    metadata?: Record<string, unknown>;
}
/**
 * Pull request context
 */
export interface PullRequestContext {
    /**
     * PR number
     */
    number: number;
    /**
     * PR title
     */
    title: string;
    /**
     * PR author
     */
    author: string;
    /**
     * PR description
     */
    description?: string;
    /**
     * Source branch
     */
    sourceBranch: string;
    /**
     * Target branch
     */
    targetBranch: string;
    /**
     * PR state
     */
    state: 'open' | 'closed' | 'merged';
    /**
     * Number of changed files
     */
    changedFilesCount: number;
    /**
     * Created at date
     */
    createdAt: string;
    /**
     * Updated at date
     */
    updatedAt: string;
    /**
     * Files changed in the PR
     */
    files?: PRFile[];
    /**
     * PR labels
     */
    labels?: string[];
    /**
     * PR size in bytes
     */
    sizeBytes?: number;
    /**
     * PR complexity estimate
     */
    complexity?: 'simple' | 'medium' | 'complex';
    /**
     * Custom metadata
     */
    metadata?: Record<string, unknown>;
}
/**
 * File changed in a PR
 */
export interface PRFile {
    /**
     * Filename with path
     */
    filename: string;
    /**
     * Status of the file
     */
    status: 'added' | 'modified' | 'removed' | 'renamed';
    /**
     * Number of additions
     */
    additions: number;
    /**
     * Number of deletions
     */
    deletions: number;
    /**
     * File language
     */
    language?: string;
    /**
     * Change ratio (0-1)
     */
    changeRatio?: number;
    /**
     * File content (optional)
     */
    content?: string;
    /**
     * Previous version path (for renamed files)
     */
    previousFilename?: string;
}
/**
 * Repository analysis result types
 */
export declare enum AnalysisResultType {
    CODE_QUALITY = "code_quality",
    SECURITY = "security",
    PERFORMANCE = "performance",
    ARCHITECTURE = "architecture",
    DOCUMENTATION = "documentation",
    TESTING = "testing",
    DEPENDENCY = "dependency"
}
/**
 * Repository analysis result severity
 */
export declare enum AnalysisSeverity {
    INFO = "info",
    WARNING = "warning",
    ERROR = "error",
    CRITICAL = "critical"
}
/**
 * Repository analysis result
 */
export interface AnalysisResult {
    /**
     * Result type
     */
    type: AnalysisResultType;
    /**
     * Severity
     */
    severity: AnalysisSeverity;
    /**
     * Issue title
     */
    title: string;
    /**
     * Issue description
     */
    description: string;
    /**
     * Affected file(s)
     */
    files?: string[];
    /**
     * Line numbers in the file(s)
     */
    lineNumbers?: number[];
    /**
     * Suggested fix
     */
    suggestedFix?: string;
    /**
     * Educational content
     */
    educationalContent?: string;
    /**
     * Agent that produced this result
     */
    agent?: string;
    /**
     * Result confidence (0-1)
     */
    confidence?: number;
}
