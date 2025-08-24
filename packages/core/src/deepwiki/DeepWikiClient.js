"use strict";
// Updated DeepWikiClient based on API testing results
Object.defineProperty(exports, "__esModule", { value: true });
exports.DeepWikiClient = void 0;
const axios_1 = require("axios");
/**
 * DeepWiki client class for integrating with the DeepWiki API
 */
class DeepWikiClient {
    /**
     * Constructor
     * @param baseUrl DeepWiki API base URL
     * @param logger Logger instance
     */
    constructor(baseUrl, logger, modelSelector) {
        /**
         * Repository size threshold in bytes
         * Repositories larger than this will be analyzed in chunks
         */
        this.LARGE_REPO_THRESHOLD = 50 * 1024 * 1024; // 50MB
        /**
         * Default model configuration as fallback
         * Used only when no model selector is available
         */
        this.DEFAULT_MODEL = {
            provider: 'google',
            model: 'gemini-2.5-flash'
        };
        this.logger = logger;
        this.modelSelector = modelSelector;
        this.client = axios_1.default.create({
            baseURL: baseUrl,
            timeout: 600000, // 10-minute timeout for large repositories
        });
        this.logger.info('DeepWikiClient initialized', { baseUrl });
    }
    /**
     * Generate a wiki for a repository
     * @param repository Repository context
     * @param options Export options
     * @returns Wiki content
     */
    async generateWiki(repository, options) {
        try {
            this.logger.info('Generating wiki', { repository, options });
            // Check repository size first
            const repoSize = await this.getRepositorySize(repository);
            if (repoSize > this.LARGE_REPO_THRESHOLD) {
                this.logger.warn('Large repository detected, using chunked analysis strategy', {
                    repository,
                    sizeBytes: repoSize,
                    threshold: this.LARGE_REPO_THRESHOLD
                });
                // Implement chunked analysis for large repositories
                return this.generateWikiForLargeRepo(repository, options, repoSize);
            }
            // Build repository URL
            const repoUrl = this.buildRepoUrl(repository);
            // Prepare wiki pages
            const pages = [
                {
                    id: 'main',
                    title: 'Main Documentation',
                    path: '',
                    content: '',
                    filePaths: ['README.md', 'CONTRIBUTING.md', 'LICENSE'],
                    importance: 1,
                    relatedPages: []
                }
            ];
            const payload = {
                repo_url: repoUrl,
                pages: pages,
                format: options.format,
                language: options.language
            };
            // Add provider and model if specified
            if (options.modelConfig) {
                payload.provider = options.modelConfig.provider;
                payload.model = options.modelConfig.model;
            }
            // Make API request
            const response = await this.client.post('/export/wiki', payload);
            return response.data;
        }
        catch (error) {
            this.logger.error('Error generating wiki', { repository, error });
            throw this.handleApiError(error, 'Failed to generate wiki');
        }
    }
    /**
     * Get a chat completion for a repository
     * @param repoUrl Repository URL
     * @param options Chat completion options
     * @returns Chat completion response
     */
    async getChatCompletion(repoUrl, options) {
        try {
            this.logger.info('Getting chat completion', { repoUrl, options });
            // Use stream endpoint always based on our testing
            const endpoint = '/chat/completions/stream';
            const payload = {
                repo_url: repoUrl,
                messages: options.messages
            };
            // Add provider and model if specified
            if (options.modelConfig) {
                payload.provider = options.modelConfig.provider;
                payload.model = options.modelConfig.model;
            }
            // Make API request
            const response = await this.client.post(endpoint, payload);
            return response.data;
        }
        catch (error) {
            this.logger.error('Error getting chat completion', { repoUrl, error });
            throw this.handleApiError(error, 'Failed to get chat completion');
        }
    }
    /**
     * Get a chat completion for a repository context
     * @param repository Repository context
     * @param options Chat completion options
     * @returns Chat completion response
     */
    async getChatCompletionForRepo(repository, options) {
        const repoUrl = this.buildRepoUrl(repository);
        return this.getChatCompletion(repoUrl, options);
    }
    /**
     * Get the size of a repository
     * @param repository Repository context
     * @returns Repository size in bytes
     */
    async getRepositorySize(_repository) {
        // This should be implemented using GitHub API or other means
        // For now returning a placeholder
        this.logger.info('Repository size detection not yet implemented, using default size');
        return 0;
    }
    /**
     * Generate wiki for a large repository using chunked analysis
     * @param repository Repository context
     * @param options Export options
     * @param repoSize Repository size in bytes
     * @returns Wiki content
     */
    async generateWikiForLargeRepo(_repository, _options, _repoSize) {
        // This should be implemented based on testing with large repositories
        // For now, just throw an error
        throw new Error('Chunked analysis for large repositories not yet implemented');
    }
    /**
     * Build repository URL from context
     * @param repository Repository context
     * @returns Repository URL
     */
    buildRepoUrl(repository) {
        const baseUrl = repository.repoType === 'github'
            ? 'https://github.com'
            : repository.repoType === 'gitlab'
                ? 'https://gitlab.com'
                : 'https://bitbucket.org';
        return `${baseUrl}/${repository.owner}/${repository.repo}`;
    }
    /**
     * Recommend the best model configuration for a repository
     * @param language Primary language of the repository
     * @param sizeBytes Size of the repository in bytes
     * @returns Recommended model configuration
     */
    async recommendModelConfig(language, sizeBytes) {
        // Determine size category
        let sizeCategory;
        if (sizeBytes < 5 * 1024 * 1024) { // Less than 5MB
            sizeCategory = 'small';
        }
        else if (sizeBytes < 50 * 1024 * 1024) { // Between 5MB and 50MB
            sizeCategory = 'medium';
        }
        else {
            sizeCategory = 'large';
        }
        // Use dynamic model selection if available
        if (this.modelSelector) {
            try {
                const context = {
                    primaryLanguage: language,
                    size: sizeCategory
                };
                const selection = await this.modelSelector.selectModelForContext('deepwiki', context);
                this.logger.debug('Selected model from Vector DB', {
                    provider: selection.primary.provider,
                    model: selection.primary.model,
                    language,
                    size: sizeCategory
                });
                return {
                    provider: selection.primary.provider,
                    model: selection.primary.model
                };
            }
            catch (error) {
                this.logger.warn('Model selector failed, using default', { error });
            }
        }
        // Fall back to default configuration
        this.logger.debug('Using default model configuration');
        return this.DEFAULT_MODEL;
    }
    /**
     * Handle API errors
     * @param error Error object
     * @param defaultMessage Default error message
     * @returns Error object
     */
    handleApiError(error, defaultMessage) {
        if (axios_1.default.isAxiosError(error)) {
            const axiosError = error;
            const status = axiosError.response?.status;
            const data = axiosError.response?.data;
            if (status === 413) {
                return new Error('Repository is too large for analysis. Please try a smaller repository or use chunked analysis.');
            }
            if (data?.detail) {
                if (typeof data.detail === 'string') {
                    return new Error(`DeepWiki API error (${status}): ${data.detail}`);
                }
                else if (Array.isArray(data.detail)) {
                    // Format validation errors
                    const messages = data.detail.map((errorItem) => {
                        return `${errorItem.msg} at ${errorItem.loc.join('.')}`;
                    }).join('; ');
                    return new Error(`DeepWiki API validation error: ${messages}`);
                }
            }
            if (data?.error) {
                return new Error(`DeepWiki API error (${status}): ${data.error}`);
            }
            return new Error(`DeepWiki API error (${status}): ${defaultMessage}`);
        }
        // Convert unknown error to Error object
        if (error instanceof Error) {
            return error;
        }
        else if (typeof error === 'string') {
            return new Error(error);
        }
        else {
            return new Error(`${defaultMessage}: ${String(error)}`);
        }
    }
}
exports.DeepWikiClient = DeepWikiClient;
