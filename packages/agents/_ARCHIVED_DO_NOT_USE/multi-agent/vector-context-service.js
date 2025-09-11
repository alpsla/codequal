"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.VectorContextService = void 0;
exports.createVectorContextService = createVectorContextService;
const utils_1 = require("@codequal/core/utils");
const agent_registry_1 = require("@codequal/core/config/agent-registry");
const auth_1 = require("./types/auth");
/**
 * Vector Context Service - Replaces DeepWiki data extraction with Vector DB queries
 * Uses existing AuthenticatedRAGService for secure, tenant-isolated searches
 */
class VectorContextService {
    constructor(authenticatedRAGService, // Will be properly typed when integrated
    supabaseClient // Will be properly typed when integrated
    ) {
        this.authenticatedRAGService = authenticatedRAGService;
        this.logger = (0, utils_1.createLogger)('VectorContextService');
        this.agentSearchConfigs = new Map([
            [agent_registry_1.AgentRole.ORCHESTRATOR, {
                    role: agent_registry_1.AgentRole.ORCHESTRATOR,
                    searchTerms: ['repository', 'summary', 'overview', 'analysis', 'report'],
                    contentTypes: ['repository_summary', 'analysis_overview', 'full_report'],
                    maxResults: 5,
                    minSimilarity: 0.7,
                    timeWindowDays: 180
                }],
            [agent_registry_1.AgentRole.CODE_QUALITY, {
                    role: agent_registry_1.AgentRole.CODE_QUALITY,
                    searchTerms: ['code quality', 'complexity', 'maintainability', 'technical debt', 'code smell'],
                    contentTypes: ['analysis', 'review', 'recommendation'],
                    maxResults: 10,
                    minSimilarity: 0.7,
                    timeWindowDays: 90
                }],
            [agent_registry_1.AgentRole.SECURITY, {
                    role: agent_registry_1.AgentRole.SECURITY,
                    searchTerms: ['security', 'vulnerability', 'authentication', 'authorization', 'compliance'],
                    contentTypes: ['security_analysis', 'vulnerability_report', 'compliance_check'],
                    maxResults: 15,
                    minSimilarity: 0.8,
                    timeWindowDays: 180
                }],
            [agent_registry_1.AgentRole.PERFORMANCE, {
                    role: agent_registry_1.AgentRole.PERFORMANCE,
                    searchTerms: ['performance', 'optimization', 'bottleneck', 'latency', 'throughput'],
                    contentTypes: ['performance_analysis', 'benchmark', 'optimization'],
                    maxResults: 8,
                    minSimilarity: 0.7,
                    timeWindowDays: 60
                }],
            [agent_registry_1.AgentRole.DEPENDENCY, {
                    role: agent_registry_1.AgentRole.DEPENDENCY,
                    searchTerms: ['dependency', 'package', 'version', 'vulnerability', 'license'],
                    contentTypes: ['dependency_analysis', 'package_audit', 'license_check'],
                    maxResults: 12,
                    minSimilarity: 0.75,
                    timeWindowDays: 30
                }],
            // Add 'dependencies' alias for backward compatibility
            ['dependencies', {
                    role: agent_registry_1.AgentRole.DEPENDENCY,
                    searchTerms: ['dependency', 'package', 'version', 'vulnerability', 'license'],
                    contentTypes: ['dependency_analysis', 'package_audit', 'license_check'],
                    maxResults: 12,
                    minSimilarity: 0.75,
                    timeWindowDays: 30
                }]
        ]);
        // 🔒 SECURITY: Use same Supabase client as AuthenticatedRAGService for consistency
        this.supabase = supabaseClient || this.authenticatedRAGService?.supabase;
        // Validate that the RAG service has required methods
        if (!this.authenticatedRAGService || typeof this.authenticatedRAGService.search !== 'function') {
            this.logger.error('Invalid authenticatedRAGService: missing search method', {
                hasService: !!this.authenticatedRAGService,
                hasSearch: this.authenticatedRAGService ? typeof this.authenticatedRAGService.search : 'no service'
            });
        }
        this.logger.debug('VectorContextService initialized', {
            supportedRoles: Array.from(this.agentSearchConfigs.keys()),
            hasRAGService: !!this.authenticatedRAGService,
            hasSearchMethod: this.authenticatedRAGService ? typeof this.authenticatedRAGService.search === 'function' : false
        });
    }
    /**
     * Get agent-specific repository context from Vector DB
     */
    async getRepositoryContext(repositoryId, agentRole, authenticatedUser, options = {}) {
        const config = this.agentSearchConfigs.get(agentRole);
        if (!config) {
            throw new Error(`No search configuration for agent role: ${agentRole}`);
        }
        // 🔒 SECURITY: Validate repository access before proceeding
        await this.validateRepositoryAccess(authenticatedUser, repositoryId, 'read');
        this.logger.debug('Getting repository context', {
            repositoryId,
            role: agentRole,
            userId: authenticatedUser.id
        });
        try {
            // Search for agent-specific content in this repository
            const recentAnalysis = await this.searchRepositoryContent(repositoryId, config, authenticatedUser.id, options);
            // Get historical patterns if requested
            const historicalPatterns = options.includeHistorical
                ? await this.searchHistoricalPatterns(repositoryId, config, authenticatedUser.id)
                : [];
            // Calculate confidence based on data quality and recency
            const confidenceScore = this.calculateConfidenceScore(recentAnalysis);
            const context = {
                repositoryId,
                recentAnalysis,
                historicalPatterns,
                similarIssues: [], // Will be populated by cross-repo search
                confidenceScore,
                lastUpdated: new Date()
            };
            this.logger.info('Successfully retrieved repository context', {
                repositoryId,
                role: agentRole,
                resultsCount: recentAnalysis.length,
                confidence: confidenceScore
            });
            return context;
        }
        catch (error) {
            this.logger.error('Failed to get repository context', {
                repositoryId,
                role: agentRole,
                error: error instanceof Error ? error.message : String(error)
            });
            return this.createEmptyContext(repositoryId);
        }
    }
    /**
     * Get cross-repository patterns for learning
     * 🔒 SECURITY: Implements strict access control and content sanitization
     */
    async getCrossRepositoryPatterns(agentRole, searchQuery, authenticatedUser, options = {}) {
        const config = this.agentSearchConfigs.get(agentRole);
        if (!config) {
            return [];
        }
        try {
            // 🔒 SECURITY: First get user's accessible repositories
            const userAccessibleRepos = this.getUserAccessibleRepositories(authenticatedUser);
            if (userAccessibleRepos.length === 0) {
                this.logger.warn('User has no accessible repositories for cross-repo patterns', {
                    userId: authenticatedUser.id
                });
                return [];
            }
            // 🔒 SECURITY: Filter out current repository and limit to user's repos
            const targetRepositories = userAccessibleRepos.filter(repoId => repoId !== options.excludeRepositoryId);
            if (targetRepositories.length === 0) {
                this.logger.debug('No other accessible repositories for cross-repo patterns', {
                    userId: authenticatedUser.id,
                    excludeRepo: options.excludeRepositoryId
                });
                return [];
            }
            // 🔒 SECURITY: Use AuthenticatedRAGService with strict access controls
            const searchOptions = {
                query: `${agentRole} ${searchQuery}`,
                max_results: options.maxResults || config.maxResults,
                similarity_threshold: config.minSimilarity,
                content_type_filter: config.contentTypes,
                // 🔒 CRITICAL: Only search repositories user has access to
                repository_filter: targetRepositories,
                respect_repository_access: options.respectUserPermissions ?? true,
                exclude_repository_id: options.excludeRepositoryId
            };
            if (!this.authenticatedRAGService || typeof this.authenticatedRAGService.search !== 'function') {
                this.logger.warn('RAG service search method not available for cross-repo patterns');
                return [];
            }
            const results = await this.authenticatedRAGService.search(searchOptions, authenticatedUser.id);
            const mappedResults = results.map((result) => this.mapToVectorSearchResult(result));
            // 🔒 SECURITY: Sanitize results for cross-repository sharing
            return this.sanitizeCrossRepoResults(mappedResults, options.sanitizeContent ?? true, options.anonymizeMetadata ?? true);
        }
        catch (error) {
            this.logger.error('Failed to get cross-repository patterns', {
                role: agentRole,
                query: searchQuery,
                error: error instanceof Error ? error.message : String(error)
            });
            return [];
        }
    }
    /**
     * Store analysis results in Vector DB with replace strategy
     */
    async storeAnalysisResults(repositoryId, analysisResults, userId) {
        try {
            this.logger.debug('Storing analysis results with replace strategy', {
                repositoryId,
                resultsCount: analysisResults.length
            });
            // 1. Delete existing analysis for this repository
            await this.deleteRepositoryAnalysis(repositoryId, userId);
            // 2. Insert new analysis chunks
            const chunks = this.createAnalysisChunks(repositoryId, analysisResults);
            await this.insertAnalysisChunks(chunks, userId);
            this.logger.info('Successfully stored analysis results', {
                repositoryId,
                chunksStored: chunks.length
            });
        }
        catch (error) {
            this.logger.error('Failed to store analysis results', {
                repositoryId,
                error: error instanceof Error ? error.message : String(error)
            });
            throw error;
        }
    }
    /**
     * Search repository-specific content
     */
    async searchRepositoryContent(repositoryId, config, userId, options) {
        const searchOptions = {
            query: config.searchTerms.join(' '),
            repository_filter: [repositoryId],
            content_type_filter: config.contentTypes,
            max_results: options.maxResults || config.maxResults,
            similarity_threshold: options.minSimilarity || config.minSimilarity,
            respect_repository_access: true
        };
        if (!this.authenticatedRAGService || typeof this.authenticatedRAGService.search !== 'function') {
            this.logger.warn('RAG service search method not available');
            return [];
        }
        const results = await this.authenticatedRAGService.search(searchOptions, userId);
        return results.map((result) => this.mapToVectorSearchResult(result));
    }
    /**
     * Search historical patterns in repository
     */
    async searchHistoricalPatterns(repositoryId, config, userId) {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - (config.timeWindowDays || 90));
        const searchOptions = {
            query: `historical ${config.searchTerms.join(' ')} patterns`,
            repository_filter: [repositoryId],
            max_results: 5,
            similarity_threshold: 0.6,
            date_filter: {
                before: cutoffDate.toISOString()
            },
            respect_repository_access: true
        };
        if (!this.authenticatedRAGService || typeof this.authenticatedRAGService.search !== 'function') {
            this.logger.warn('RAG service search method not available');
            return [];
        }
        const results = await this.authenticatedRAGService.search(searchOptions, userId);
        return results.map((result) => this.mapToVectorSearchResult(result));
    }
    /**
     * Delete existing repository analysis (replace strategy)
     */
    async deleteRepositoryAnalysis(repositoryId, _userId) {
        // This would call the Vector DB delete function
        // Implementation depends on the specific Vector DB service
        this.logger.debug('Deleting existing analysis', { repositoryId });
        // await this.vectorDB.deleteWhere({ repository_id: repositoryId });
    }
    /**
     * Create analysis chunks for Vector DB storage
     */
    createAnalysisChunks(repositoryId, analysisResults) {
        return analysisResults.flatMap(result => {
            const baseMetadata = {
                repository_id: repositoryId,
                analysis_type: result.type || 'general',
                created_at: new Date().toISOString(),
                importance_score: this.calculateImportanceScore(result)
            };
            return result.findings?.map((finding, index) => ({
                id: `${repositoryId}-${result.type}-${index}`,
                content: this.formatFindingContent(finding),
                metadata: {
                    ...baseMetadata,
                    content_type: 'finding',
                    severity: finding.severity,
                    file_path: finding.location,
                    finding_type: finding.type
                }
            })) || [];
        });
    }
    /**
     * Insert analysis chunks into Vector DB
     */
    async insertAnalysisChunks(chunks, _userId) {
        // This would call the Vector DB insert function
        // Implementation depends on the specific Vector DB service
        this.logger.debug('Inserting analysis chunks', { count: chunks.length });
        // await this.vectorDB.insert(chunks);
    }
    /**
     * Map RAG service result to VectorSearchResult
     */
    mapToVectorSearchResult(result) {
        return {
            content: result.content || '',
            metadata: {
                repository_id: result.metadata?.repository_id || '',
                content_type: result.metadata?.content_type || '',
                file_path: result.metadata?.file_path,
                language: result.metadata?.language,
                framework: result.metadata?.framework,
                analysis_type: result.metadata?.analysis_type,
                severity: result.metadata?.severity,
                importance_score: result.metadata?.importance_score,
                created_at: result.metadata?.created_at || new Date().toISOString()
            },
            similarity_score: result.similarity_score || 0
        };
    }
    /**
     * Calculate confidence score based on result quality
     */
    calculateConfidenceScore(results) {
        if (results.length === 0)
            return 0;
        const avgSimilarity = results.reduce((sum, r) => sum + r.similarity_score, 0) / results.length;
        const recencyScore = this.calculateRecencyScore(results);
        const volumeScore = Math.min(results.length / 10, 1);
        return (avgSimilarity * 0.4 + recencyScore * 0.3 + volumeScore * 0.3);
    }
    /**
     * Calculate recency score from results
     */
    calculateRecencyScore(results) {
        const now = Date.now();
        const avgAge = results.reduce((sum, result) => {
            const createdAt = new Date(result.metadata.created_at).getTime();
            return sum + (now - createdAt);
        }, 0) / results.length;
        const daysSinceAnalysis = avgAge / (1000 * 60 * 60 * 24);
        return Math.max(0, 1 - (daysSinceAnalysis / 30));
    }
    /**
     * Calculate importance score for analysis result
     */
    calculateImportanceScore(result) {
        let score = 0.5; // Base score
        // Increase score based on severity
        if (result.severity === 'critical')
            score += 0.4;
        else if (result.severity === 'high')
            score += 0.3;
        else if (result.severity === 'medium')
            score += 0.2;
        // Increase score based on findings count
        const findingsCount = result.findings?.length || 0;
        score += Math.min(findingsCount * 0.05, 0.3);
        return Math.min(score, 1.0);
    }
    /**
     * Format finding content for Vector DB storage
     */
    formatFindingContent(finding) {
        return `${finding.type}: ${finding.description}${finding.suggestion ? ` Suggestion: ${finding.suggestion}` : ''}`;
    }
    /**
     * Sanitize cross-repository results to prevent data leakage
     * 🔒 SECURITY: Removes sensitive information from cross-repo patterns
     */
    sanitizeCrossRepoResults(results, sanitizeContent, anonymizeMetadata) {
        return results.map(result => ({
            ...result,
            // 🔒 SECURITY: Sanitize content to remove specific details
            content: sanitizeContent ? this.sanitizeContent(result.content) : result.content,
            metadata: {
                ...result.metadata,
                // 🔒 SECURITY: Remove sensitive metadata for cross-repo sharing
                file_path: anonymizeMetadata ? undefined : result.metadata.file_path,
                // Keep only essential metadata for pattern learning
                repository_id: anonymizeMetadata ? '[EXTERNAL_REPO]' : result.metadata.repository_id,
                content_type: result.metadata.content_type,
                analysis_type: result.metadata.analysis_type,
                severity: result.metadata.severity,
                importance_score: result.metadata.importance_score,
                created_at: result.metadata.created_at
            }
        }));
    }
    /**
     * Sanitize content to remove specific identifiers
     * 🔒 SECURITY: Anonymizes patterns while preserving learning value
     */
    sanitizeContent(content) {
        return content
            // Remove specific file paths
            .replace(/\/[^\s/]+\.(ts|js|py|java|cpp|c|h|rb|php|go|rs)/gi, '/[FILE]')
            // Remove class names but keep structure
            .replace(/class\s+[A-Za-z_][A-Za-z0-9_]*/g, 'class [CLASS_NAME]')
            // Remove function names but keep structure
            .replace(/function\s+[A-Za-z_][A-Za-z0-9_]*/g, 'function [FUNCTION_NAME]')
            // Remove variable names in declarations
            .replace(/(let|const|var)\s+[A-Za-z_][A-Za-z0-9_]*/g, '$1 [VARIABLE]')
            // Remove specific URLs or endpoints
            .replace(/https?:\/\/[^\s]+/g, '[URL]')
            // Remove API keys or tokens (common patterns)
            .replace(/['"][A-Za-z0-9]{20,}['"]/g, '[API_KEY]')
            // Remove email addresses
            .replace(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, '[EMAIL]');
    }
    /**
     * Create empty context when no data available
     */
    createEmptyContext(repositoryId) {
        return {
            repositoryId,
            recentAnalysis: [],
            historicalPatterns: [],
            similarIssues: [],
            confidenceScore: 0,
            lastUpdated: new Date()
        };
    }
    /**
     * Validate repository access for authenticated user
     * 🔒 SECURITY: Ensures user has required permission for repository
     */
    async validateRepositoryAccess(authenticatedUser, repositoryId, permission) {
        // Check if this is a public GitHub repository
        // Public repos should allow read access without explicit permissions
        if (permission === 'read' && this.isPublicGitHubRepository(repositoryId)) {
            this.logger.debug('Allowing read access to public GitHub repository', {
                userId: authenticatedUser.id,
                repositoryId
            });
            return;
        }
        // Check for wildcard permissions first
        const wildcardPermissions = authenticatedUser.permissions.repositories['*'];
        const repositoryPermissions = authenticatedUser.permissions.repositories[repositoryId];
        // Allow access if either wildcard or specific repository permissions grant it
        const hasPermission = (wildcardPermissions && wildcardPermissions[permission]) ||
            (repositoryPermissions && repositoryPermissions[permission]);
        if (!hasPermission) {
            const _securityEvent = {
                type: 'ACCESS_DENIED',
                userId: authenticatedUser.id,
                sessionId: authenticatedUser.session.fingerprint,
                repositoryId,
                ipAddress: authenticatedUser.session.ipAddress,
                userAgent: authenticatedUser.session.userAgent,
                timestamp: new Date(),
                details: {
                    service: 'VectorContextService',
                    reason: `Repository ${permission} access denied`,
                    requiredPermission: permission,
                    userPermissions: repositoryPermissions || {}
                },
                severity: 'high'
            };
            this.logger.error('Repository access denied in VectorContextService', {
                userId: authenticatedUser.id,
                repositoryId,
                permission,
                userPermissions: repositoryPermissions
            });
            // TODO: Log security event to audit system
            // await this.logSecurityEvent(securityEvent);
            throw new Error(`${auth_1.AuthenticationError.REPOSITORY_ACCESS_DENIED}: User ${authenticatedUser.id} does not have ${permission} access to repository ${repositoryId}`);
        }
        this.logger.debug('Repository access validated', {
            userId: authenticatedUser.id,
            repositoryId,
            permission,
            granted: true
        });
    }
    /**
     * Get user's accessible repositories for cross-repository searches
     * 🔒 SECURITY: Only returns repositories user has read access to
     */
    getUserAccessibleRepositories(authenticatedUser) {
        const accessibleRepos = [];
        // Check for wildcard permissions
        const wildcardPermissions = authenticatedUser.permissions.repositories['*'];
        if (wildcardPermissions && wildcardPermissions.read) {
            // User has read access to all repositories
            // For now, return an empty array as we don't have a list of all repos
            // In production, this would query the database for all repositories
            this.logger.debug('User has wildcard read access to all repositories', {
                userId: authenticatedUser.id
            });
            return [];
        }
        // Otherwise, check specific repository permissions
        for (const [repositoryId, permissions] of Object.entries(authenticatedUser.permissions.repositories)) {
            if (repositoryId !== '*' && permissions.read) {
                accessibleRepos.push(repositoryId);
            }
        }
        this.logger.debug('Found accessible repositories', {
            userId: authenticatedUser.id,
            repositoryCount: accessibleRepos.length
        });
        return accessibleRepos;
    }
    /**
     * Check if a repository ID represents a public GitHub repository
     * Public GitHub repositories should be accessible for read operations
     */
    isPublicGitHubRepository(repositoryId) {
        // Check if this looks like a GitHub URL or repository identifier
        const githubPatterns = [
            /^https?:\/\/github\.com\//i,
            /^github\.com\//i,
            /^[a-zA-Z0-9-_]+\/[a-zA-Z0-9-_]+$/ // owner/repo format
        ];
        const isGitHubRepo = githubPatterns.some(pattern => pattern.test(repositoryId));
        if (isGitHubRepo) {
            // For now, assume all GitHub repos passed to the analysis are public
            // In production, we could make an API call to verify
            this.logger.debug('Identified as GitHub repository', { repositoryId });
            return true;
        }
        return false;
    }
}
exports.VectorContextService = VectorContextService;
/**
 * Factory function to create Vector Context Service
 */
function createVectorContextService(authenticatedRAGService) {
    return new VectorContextService(authenticatedRAGService);
}
