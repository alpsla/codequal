"use strict";
/**
 * Authenticated RAG Service
 *
 * Integrates the RAG framework with Supabase authentication and user context.
 * Provides secure, user-aware retrieval-augmented generation capabilities.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthenticatedRAGService = void 0;
exports.createAuthenticatedRAGService = createAuthenticatedRAGService;
const selective_rag_service_1 = require("./selective-rag-service");
const query_analyzer_1 = require("./query-analyzer");
const supabase_client_factory_1 = require("../supabase/supabase-client.factory");
const logger_1 = require("../../utils/logger");
/**
 * Authenticated RAG Service Class
 */
class AuthenticatedRAGService {
    constructor(embeddingService, supabaseClient) {
        this.logger = (0, logger_1.createLogger)('AuthenticatedRAGService');
        this.supabase = supabaseClient || (0, supabase_client_factory_1.getSupabaseClient)();
        this.ragService = new selective_rag_service_1.SelectiveRAGService(embeddingService, this.supabase);
        this.queryAnalyzer = new query_analyzer_1.QueryAnalyzer();
    }
    /**
     * Perform authenticated RAG search with user context and permissions
     */
    async searchWithAuth(query, user, repositoryId, options = {}) {
        const startTime = Date.now();
        try {
            // Step 1: Get user context and skills
            const userContext = await this.getUserContext(user);
            // Step 2: Get repository context with access verification
            let repositoryContext;
            if (repositoryId) {
                const repoContext = await this.getRepositoryContextWithAuth(repositoryId, user);
                repositoryContext = repoContext || undefined;
                if (!repositoryContext && options.respect_repository_access !== false) {
                    throw new Error('User does not have access to the specified repository');
                }
            }
            // Step 3: Analyze query with user context
            const analyzedQuery = await this.queryAnalyzer.analyzeQuery(query, userContext, repositoryContext);
            // Step 4: Build search options with user preferences
            const enhancedOptions = {
                maxResults: options.maxResults || 10,
                similarityThreshold: options.similarityThreshold || 0.7,
                includeEducationalContent: options.includeEducationalContent !== false,
                boost: {
                    importanceWeight: options.boost?.importanceWeight || 0.3,
                    recencyWeight: options.boost?.recencyWeight || 0.1,
                    frameworkWeight: options.boost?.frameworkWeight || 0.2
                }
            };
            // Step 5: Perform RAG search
            const searchResponse = await this.ragService.search(query, userContext, repositoryContext, enhancedOptions);
            // Step 6: Filter results based on user access permissions
            const authenticatedResults = await this.filterResultsByAccess(searchResponse.documentResults, user, options.respect_repository_access !== false);
            // Step 7: Adapt results to user skill level
            const adaptedResults = options.adapt_to_user_skill !== false
                ? await this.adaptResultsToUserSkill(authenticatedResults, userContext)
                : authenticatedResults;
            // Step 8: Log search analytics
            const searchDuration = Date.now() - startTime;
            const queryId = await this.logSearchAnalytics(query, analyzedQuery, user, userContext, repositoryId, adaptedResults.length, searchResponse.documentResults.length, searchDuration, options.log_search_analytics !== false);
            return {
                results: adaptedResults,
                educational: searchResponse.educationalResults,
                userContext,
                analytics: {
                    query_id: queryId,
                    total_results: searchResponse.documentResults.length,
                    filtered_results: adaptedResults.length,
                    search_duration_ms: searchDuration
                }
            };
        }
        catch (error) {
            this.logger.error('Authenticated RAG search failed', {
                error: error instanceof Error ? error.message : error,
                userId: user.id,
                repositoryId,
                query: query.substring(0, 100)
            });
            throw error;
        }
    }
    /**
     * Get user skill profile and context
     */
    async getUserContext(user) {
        try {
            // Fetch user skills from database
            const { data: userSkills, error } = await this.supabase
                .from('user_skills')
                .select('language, domain, skill_level, confidence, last_interaction_at')
                .eq('user_id', user.id);
            if (error) {
                this.logger.warn('Failed to fetch user skills', { error, userId: user.id });
            }
            // Build user context from skills data
            const languages = {};
            const domains = {};
            userSkills?.forEach((skill) => {
                if (skill.language) {
                    languages[skill.language] = skill.skill_level;
                }
                if (skill.domain) {
                    domains[skill.domain] = skill.skill_level;
                }
            });
            // Extract preferences from user metadata
            const preferences = user.user_metadata || {};
            return {
                skillLevel: this.determineOverallSkillLevel(userSkills || []),
                preferredLanguages: preferences.preferred_languages || [],
                recentRepositories: [], // TODO: Fetch from user data
                searchHistory: [] // TODO: Fetch from user data
            };
        }
        catch (error) {
            this.logger.error('Failed to build user context', { error, userId: user.id });
            // Return default context on error
            return {
                skillLevel: query_analyzer_1.DifficultyLevel.INTERMEDIATE,
                preferredLanguages: [],
                recentRepositories: [],
                searchHistory: []
            };
        }
    }
    /**
     * Get repository context with authentication check
     */
    async getRepositoryContextWithAuth(repositoryId, user) {
        try {
            // Check if user has access to repository
            const { data: repository, error } = await this.supabase
                .from('repositories')
                .select('*')
                .eq('id', repositoryId)
                .single();
            if (error || !repository) {
                this.logger.warn('Repository not found', { repositoryId, userId: user.id });
                return null;
            }
            // TODO: Implement proper repository access control
            // For now, we'll allow access to all repositories
            // In production, you'd check repository permissions here
            return {
                repositoryId: repository.id,
                primaryLanguage: repository.primary_language,
                frameworkStack: this.extractFrameworksFromRepository(repository),
                repositorySize: repository.size || 0
            };
        }
        catch (error) {
            this.logger.error('Failed to get repository context', {
                error,
                repositoryId,
                userId: user.id
            });
            return null;
        }
    }
    /**
     * Filter search results based on user access permissions
     */
    async filterResultsByAccess(results, user, respectAccess) {
        if (!respectAccess) {
            return results.map(result => ({
                ...result,
                user_can_access: true
            }));
        }
        // Get user's accessible repositories
        const { data: userRepos, error } = await this.supabase
            .from('repositories')
            .select('id')
            .eq('user_id', user.id); // Assuming repositories table has user_id
        if (error) {
            this.logger.warn('Failed to fetch user repositories', { error, userId: user.id });
            // On error, allow access to all results
            return results.map(result => ({
                ...result,
                user_can_access: true
            }));
        }
        const accessibleRepoIds = new Set(userRepos?.map((repo) => repo.id) || []);
        return results.map(result => ({
            ...result,
            user_can_access: accessibleRepoIds.has(result.repositoryId)
        })).filter(result => result.user_can_access);
    }
    /**
     * Adapt search results to user skill level
     */
    async adaptResultsToUserSkill(results, userContext) {
        return results.map(result => {
            // Determine appropriate skill level for this result
            const language = result.metadata?.language || result.metadata?.programming_language;
            const isPreferredLanguage = language && typeof language === 'string' && userContext.preferredLanguages?.includes(language);
            const overallSkill = userContext.skillLevel;
            return {
                ...result,
                adapted_for_skill_level: overallSkill
            };
        });
    }
    /**
     * Log search analytics for continuous improvement
     */
    async logSearchAnalytics(originalQuery, analyzedQuery, user, userContext, repositoryId, resultCount, totalResults, searchDurationMs, shouldLog) {
        if (!shouldLog) {
            return 'logging-disabled';
        }
        try {
            const { data, error } = await this.supabase
                .from('rag_query_patterns')
                .insert({
                query_text: originalQuery,
                query_type: analyzedQuery.queryType,
                repository_id: repositoryId,
                user_context: {
                    user_id: user.id,
                    skill_level: userContext?.skillLevel,
                    languages: analyzedQuery.programmingLanguage ? [analyzedQuery.programmingLanguage] : [],
                    frameworks: analyzedQuery.frameworks
                },
                result_count: resultCount,
                was_successful: resultCount > 0,
                search_duration_ms: searchDurationMs
            })
                .select('id')
                .single();
            if (error) {
                this.logger.warn('Failed to log search analytics', { error });
                return 'logging-failed';
            }
            return data?.id?.toString() || 'logged';
        }
        catch (error) {
            this.logger.error('Error logging search analytics', { error });
            return 'logging-error';
        }
    }
    /**
     * Utility: Determine overall skill level from individual skills
     */
    determineOverallSkillLevel(skills) {
        if (skills.length === 0)
            return 'intermediate';
        const skillValues = {
            beginner: 1,
            intermediate: 2,
            advanced: 3,
            expert: 4
        };
        const weightedSum = skills.reduce((sum, skill) => sum + skillValues[skill.skill_level] * skill.confidence, 0);
        const totalWeight = skills.reduce((sum, skill) => sum + skill.confidence, 0);
        if (totalWeight === 0)
            return 'intermediate';
        const averageLevel = weightedSum / totalWeight;
        if (averageLevel < 1.5)
            return 'beginner';
        if (averageLevel < 2.5)
            return 'intermediate';
        if (averageLevel < 3.5)
            return 'advanced';
        return 'expert';
    }
    /**
     * Utility: Extract frameworks from repository data
     */
    extractFrameworksFromRepository(repository) {
        const frameworks = [];
        // Extract from languages data
        if (repository.languages) {
            Object.keys(repository.languages).forEach(lang => {
                // Map common language to framework patterns
                switch (lang.toLowerCase()) {
                    case 'typescript':
                    case 'javascript':
                        frameworks.push('node', 'react', 'express');
                        break;
                    case 'python':
                        frameworks.push('django', 'flask', 'fastapi');
                        break;
                    case 'java':
                        frameworks.push('spring', 'hibernate');
                        break;
                    case 'go':
                        frameworks.push('gin', 'fiber');
                        break;
                }
            });
        }
        return frameworks;
    }
    /**
     * Utility: Adapt content complexity based on user skill level
     */
    adaptContentForSkillLevel(content, skillLevel, userContext) {
        // For now, return content as-is
        // In a full implementation, you might:
        // - Add beginner-friendly explanations for complex terms
        // - Simplify language for beginners
        // - Add advanced context for experts
        return content;
    }
    /**
     * Update user skills based on interaction patterns
     */
    async updateUserSkills(user, language, domain, wasHelpful, interactionContext) {
        try {
            await this.supabase.rpc('update_user_skill_interaction', {
                p_user_id: user.id,
                p_language: language,
                p_domain: domain,
                p_was_helpful: wasHelpful,
                p_context: interactionContext || {}
            });
        }
        catch (error) {
            this.logger.error('Failed to update user skills', { error, userId: user.id });
        }
    }
    /**
     * Get user's accessible repositories
     */
    async getUserRepositories(user) {
        try {
            const { data, error } = await this.supabase
                .from('repositories')
                .select('*')
                .eq('user_id', user.id); // Assuming repositories table has user_id
            if (error) {
                this.logger.error('Failed to fetch user repositories', { error, userId: user.id });
                return [];
            }
            return (data || []).map((repo) => ({
                id: repo.id,
                name: repo.name,
                url: repo.url,
                provider: repo.provider,
                private: repo.private,
                primary_language: repo.primary_language,
                languages: repo.languages,
                user_access_level: 'admin' // TODO: Implement proper access levels
            }));
        }
        catch (error) {
            this.logger.error('Error fetching user repositories', { error, userId: user.id });
            return [];
        }
    }
}
exports.AuthenticatedRAGService = AuthenticatedRAGService;
// Helper function to create authenticated RAG service
function createAuthenticatedRAGService(embeddingService, supabaseClient) {
    return new AuthenticatedRAGService(embeddingService, supabaseClient);
}
