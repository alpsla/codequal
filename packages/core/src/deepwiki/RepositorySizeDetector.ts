import axios from 'axios';
import { Logger } from '../utils/logger';
import { RepositoryContext } from './DeepWikiClient';

/**
 * GitHub repository information interface
 */
interface GitHubRepositoryInfo {
  size: number; // Size in KB
  default_branch: string;
  language: string;
  stargazers_count: number;
  forks_count: number;
  open_issues_count: number;
  visibility: string;
  pushed_at: string;
  created_at: string;
  updated_at: string;
  [key: string]: unknown;
}

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
 * Default size category thresholds
 */
const DEFAULT_SIZE_THRESHOLDS: SizeCategoryThresholds = {
  smallMaxBytes: 5 * 1024 * 1024,    // 5MB
  mediumMaxBytes: 50 * 1024 * 1024,  // 50MB
};

/**
 * Utility class for detecting repository size and characteristics
 */
export class RepositorySizeDetector {
  private logger: Logger;
  private thresholds: SizeCategoryThresholds;
  
  /**
   * Constructor
   * @param logger Logger instance
   * @param thresholds Optional custom size thresholds
   */
  constructor(logger: Logger, thresholds?: SizeCategoryThresholds) {
    this.logger = logger;
    this.thresholds = thresholds || DEFAULT_SIZE_THRESHOLDS;
    
    this.logger.info('RepositorySizeDetector initialized', { thresholds: this.thresholds });
  }
  
  /**
   * Detect size and characteristics of a GitHub repository
   * @param repository Repository context
   * @returns Repository size info
   */
  async detectGitHubRepositorySize(repository: RepositoryContext): Promise<RepositorySizeInfo> {
    try {
      this.logger.info('Detecting GitHub repository size', { repository });
      
      // Get repository info from GitHub API
      const repoInfo = await this.fetchGitHubRepositoryInfo(repository);
      
      // Get language breakdown
      const languageBreakdown = await this.fetchGitHubLanguageBreakdown(repository);
      
      // Determine primary language
      const primaryLanguage = this.determinePrimaryLanguage(languageBreakdown);
      
      // Determine size category
      const sizeCategory = this.determineSizeCategory(repoInfo.size * 1024); // GitHub reports size in KB
      
      // Build result
      const result: RepositorySizeInfo = {
        repository,
        sizeBytes: repoInfo.size * 1024,
        fileCount: undefined, // GitHub API doesn't provide file count directly
        primaryLanguage,
        languageBreakdown,
        sizeCategory
      };
      
      this.logger.info('Detected repository size info', { result });
      
      return result;
    } catch (error) {
      this.logger.error('Error detecting repository size', { repository, error });
      throw new Error(`Failed to detect repository size: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  /**
   * Detect size and characteristics of a GitLab repository
   * @param repository Repository context
   * @returns Repository size info
   */
  async detectGitLabRepositorySize(_repository: RepositoryContext): Promise<RepositorySizeInfo> {
    // GitLab implementation would be similar to GitHub
    // This is a placeholder for future implementation
    throw new Error('GitLab repository size detection not yet implemented');
  }
  
  /**
   * Detect size and characteristics based on repository context
   * @param repository Repository context
   * @returns Repository size info
   */
  async detectRepositorySize(repository: RepositoryContext): Promise<RepositorySizeInfo> {
    switch (repository.repoType) {
      case 'github':
        return this.detectGitHubRepositorySize(repository);
      case 'gitlab':
        return this.detectGitLabRepositorySize(repository);
      case 'bitbucket':
        throw new Error('BitBucket repository size detection not yet implemented');
      default:
        throw new Error(`Unsupported repository type: ${repository.repoType}`);
    }
  }
  

  /**
   * Fetch repository information from GitHub API
   * @param repository Repository context
   * @returns GitHub repository info
   */
  private async fetchGitHubRepositoryInfo(repository: RepositoryContext): Promise<GitHubRepositoryInfo> {
    const url = `https://api.github.com/repos/${repository.owner}/${repository.repo}`;
    
    try {
      this.logger.debug('Fetching GitHub repository info', { url });
      
      const response = await axios.get<GitHubRepositoryInfo>(url, {
        headers: {
          'Accept': 'application/vnd.github.v3+json',
          // If a GitHub token is available, use it to avoid rate limits
          // 'Authorization': `token ${process.env.GITHUB_TOKEN}`
        }
      });
      
      return response.data;
    } catch (error) {
      this.logger.error('Error fetching GitHub repository info', { url, error });
      throw new Error(`Failed to fetch GitHub repository info: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  /**
   * Fetch language breakdown from GitHub API
   * @param repository Repository context
   * @returns Language breakdown
   */
  private async fetchGitHubLanguageBreakdown(repository: RepositoryContext): Promise<Record<string, number>> {
    const url = `https://api.github.com/repos/${repository.owner}/${repository.repo}/languages`;
    
    try {
      this.logger.debug('Fetching GitHub language breakdown', { url });
      
      const response = await axios.get<Record<string, number>>(url, {
        headers: {
          'Accept': 'application/vnd.github.v3+json',
          // If a GitHub token is available, use it to avoid rate limits
          // 'Authorization': `token ${process.env.GITHUB_TOKEN}`
        }
      });
      
      // Convert byte counts to percentages
      const languages = response.data;
      const totalBytes = Object.values(languages).reduce((sum: number, bytes: number) => sum + bytes, 0);
      
      const languagePercentages: Record<string, number> = {};
      
      for (const [language, bytes] of Object.entries(languages)) {
        languagePercentages[language] = Number(((bytes as number / totalBytes) * 100).toFixed(2));
      }
      
      return languagePercentages;
    } catch (error) {
      this.logger.error('Error fetching GitHub language breakdown', { url, error });
      throw new Error(`Failed to fetch GitHub language breakdown: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  /**
   * Determine primary language from language breakdown
   * @param languageBreakdown Language breakdown
   * @returns Primary language
   */
  private determinePrimaryLanguage(languageBreakdown: Record<string, number> | undefined): string | undefined {
    if (!languageBreakdown || Object.keys(languageBreakdown).length === 0) {
      return undefined;
    }
    
    // Find language with highest percentage
    let primaryLanguage: string | undefined;
    let highestPercentage = 0;
    
    for (const [language, percentage] of Object.entries(languageBreakdown)) {
      if (percentage > highestPercentage) {
        primaryLanguage = language;
        highestPercentage = percentage;
      }
    }
    
    return primaryLanguage;
  }
  
  /**
   * Determine size category based on size in bytes
   * @param sizeBytes Size in bytes
   * @returns Size category
   */
  private determineSizeCategory(sizeBytes: number): 'small' | 'medium' | 'large' {
    if (sizeBytes <= this.thresholds.smallMaxBytes) {
      return 'small';
    } else if (sizeBytes <= this.thresholds.mediumMaxBytes) {
      return 'medium';
    } else {
      return 'large';
    }
  }
  
  /**
   * Update size category thresholds
   * @param thresholds New thresholds
   */
  updateThresholds(thresholds: SizeCategoryThresholds): void {
    this.thresholds = thresholds;
    this.logger.info('Size category thresholds updated', { thresholds });
  }
}
