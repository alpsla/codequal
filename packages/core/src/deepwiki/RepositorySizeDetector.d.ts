import { Logger } from '../utils/logger';
import { RepositoryContext } from './DeepWikiClient';
/**
 * Repository size information
 */
export interface RepositorySizeInfo {
    /**
     * Repository owner and name
     */
    repository: RepositoryContext;
    /**
     * Size in bytes
     */
    sizeBytes: number;
    /**
     * File count (if available)
     */
    fileCount?: number;
    /**
     * Primary language (if detected)
     */
    primaryLanguage?: string;
    /**
     * Lines of code (if available)
     */
    linesOfCode?: number;
    /**
     * Top languages with percentages (if available)
     */
    languageBreakdown?: Record<string, number>;
    /**
     * Size category
     */
    sizeCategory: 'small' | 'medium' | 'large';
}
/**
 * Repository size category thresholds in bytes
 */
export interface SizeCategoryThresholds {
    /**
     * Maximum size for 'small' category in bytes
     */
    smallMaxBytes: number;
    /**
     * Maximum size for 'medium' category in bytes
     */
    mediumMaxBytes: number;
}
/**
 * Utility class for detecting repository size and characteristics
 */
export declare class RepositorySizeDetector {
    private logger;
    private thresholds;
    /**
     * Constructor
     * @param logger Logger instance
     * @param thresholds Optional custom size thresholds
     */
    constructor(logger: Logger, thresholds?: SizeCategoryThresholds);
    /**
     * Detect size and characteristics of a GitHub repository
     * @param repository Repository context
     * @returns Repository size info
     */
    detectGitHubRepositorySize(repository: RepositoryContext): Promise<RepositorySizeInfo>;
    /**
     * Detect size and characteristics of a GitLab repository
     * @param repository Repository context
     * @returns Repository size info
     */
    detectGitLabRepositorySize(_repository: RepositoryContext): Promise<RepositorySizeInfo>;
    /**
     * Detect size and characteristics based on repository context
     * @param repository Repository context
     * @returns Repository size info
     */
    detectRepositorySize(repository: RepositoryContext): Promise<RepositorySizeInfo>;
    /**
     * Fetch repository information from GitHub API
     * @param repository Repository context
     * @returns GitHub repository info
     */
    private fetchGitHubRepositoryInfo;
    /**
     * Fetch language breakdown from GitHub API
     * @param repository Repository context
     * @returns Language breakdown
     */
    private fetchGitHubLanguageBreakdown;
    /**
     * Determine primary language from language breakdown
     * @param languageBreakdown Language breakdown
     * @returns Primary language
     */
    private determinePrimaryLanguage;
    /**
     * Determine size category based on size in bytes
     * @param sizeBytes Size in bytes
     * @returns Size category
     */
    private determineSizeCategory;
    /**
     * Update size category thresholds
     * @param thresholds New thresholds
     */
    updateThresholds(thresholds: SizeCategoryThresholds): void;
}
