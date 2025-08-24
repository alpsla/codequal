"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RepositorySizeDetector = void 0;
const axios_1 = require("axios");
/**
 * Default size category thresholds
 */
const DEFAULT_SIZE_THRESHOLDS = {
    smallMaxBytes: 5 * 1024 * 1024, // 5MB
    mediumMaxBytes: 50 * 1024 * 1024, // 50MB
};
/**
 * Utility class for detecting repository size and characteristics
 */
class RepositorySizeDetector {
    /**
     * Constructor
     * @param logger Logger instance
     * @param thresholds Optional custom size thresholds
     */
    constructor(logger, thresholds) {
        this.logger = logger;
        this.thresholds = thresholds || DEFAULT_SIZE_THRESHOLDS;
        this.logger.info('RepositorySizeDetector initialized', { thresholds: this.thresholds });
    }
    /**
     * Detect size and characteristics of a GitHub repository
     * @param repository Repository context
     * @returns Repository size info
     */
    async detectGitHubRepositorySize(repository) {
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
            const result = {
                repository,
                sizeBytes: repoInfo.size * 1024,
                fileCount: undefined, // GitHub API doesn't provide file count directly
                primaryLanguage,
                languageBreakdown,
                sizeCategory
            };
            this.logger.info('Detected repository size info', { result });
            return result;
        }
        catch (error) {
            this.logger.error('Error detecting repository size', { repository, error });
            throw new Error(`Failed to detect repository size: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    /**
     * Detect size and characteristics of a GitLab repository
     * @param repository Repository context
     * @returns Repository size info
     */
    async detectGitLabRepositorySize(_repository) {
        // GitLab implementation would be similar to GitHub
        // This is a placeholder for future implementation
        throw new Error('GitLab repository size detection not yet implemented');
    }
    /**
     * Detect size and characteristics based on repository context
     * @param repository Repository context
     * @returns Repository size info
     */
    async detectRepositorySize(repository) {
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
    async fetchGitHubRepositoryInfo(repository) {
        const url = `https://api.github.com/repos/${repository.owner}/${repository.repo}`;
        try {
            this.logger.debug('Fetching GitHub repository info', { url });
            const response = await axios_1.default.get(url, {
                headers: {
                    'Accept': 'application/vnd.github.v3+json',
                    // If a GitHub token is available, use it to avoid rate limits
                    // 'Authorization': `token ${process.env.GITHUB_TOKEN}`
                }
            });
            return response.data;
        }
        catch (error) {
            this.logger.error('Error fetching GitHub repository info', { url, error });
            throw new Error(`Failed to fetch GitHub repository info: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    /**
     * Fetch language breakdown from GitHub API
     * @param repository Repository context
     * @returns Language breakdown
     */
    async fetchGitHubLanguageBreakdown(repository) {
        const url = `https://api.github.com/repos/${repository.owner}/${repository.repo}/languages`;
        try {
            this.logger.debug('Fetching GitHub language breakdown', { url });
            const response = await axios_1.default.get(url, {
                headers: {
                    'Accept': 'application/vnd.github.v3+json',
                    // If a GitHub token is available, use it to avoid rate limits
                    // 'Authorization': `token ${process.env.GITHUB_TOKEN}`
                }
            });
            // Convert byte counts to percentages
            const languages = response.data;
            const totalBytes = Object.values(languages).reduce((sum, bytes) => sum + bytes, 0);
            const languagePercentages = {};
            for (const [language, bytes] of Object.entries(languages)) {
                languagePercentages[language] = Number(((bytes / totalBytes) * 100).toFixed(2));
            }
            return languagePercentages;
        }
        catch (error) {
            this.logger.error('Error fetching GitHub language breakdown', { url, error });
            throw new Error(`Failed to fetch GitHub language breakdown: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    /**
     * Determine primary language from language breakdown
     * @param languageBreakdown Language breakdown
     * @returns Primary language
     */
    determinePrimaryLanguage(languageBreakdown) {
        if (!languageBreakdown || Object.keys(languageBreakdown).length === 0) {
            return undefined;
        }
        // Find language with highest percentage
        let primaryLanguage;
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
    determineSizeCategory(sizeBytes) {
        if (sizeBytes <= this.thresholds.smallMaxBytes) {
            return 'small';
        }
        else if (sizeBytes <= this.thresholds.mediumMaxBytes) {
            return 'medium';
        }
        else {
            return 'large';
        }
    }
    /**
     * Update size category thresholds
     * @param thresholds New thresholds
     */
    updateThresholds(thresholds) {
        this.thresholds = thresholds;
        this.logger.info('Size category thresholds updated', { thresholds });
    }
}
exports.RepositorySizeDetector = RepositorySizeDetector;
