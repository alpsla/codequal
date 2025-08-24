/**
 * Authenticated RAG Service
 *
 * Integrates the RAG framework with Supabase authentication and user context.
 * Provides secure, user-aware retrieval-augmented generation capabilities.
 */
import { SupabaseClient as SupabaseJSClient } from '@supabase/supabase-js';
import { RAGSearchResult, EducationalContentResult, SearchOptions } from './selective-rag-service';
import { UserContext, RepositoryContext } from './query-analyzer';
export interface AuthenticatedUser {
    id: string;
    email?: string;
    user_metadata?: Record<string, any>;
    app_metadata?: Record<string, any>;
}
export interface UserSkillProfile {
    languages: Record<string, 'beginner' | 'intermediate' | 'advanced' | 'expert'>;
    frameworks: Record<string, 'beginner' | 'intermediate' | 'advanced' | 'expert'>;
    domains: Record<string, 'beginner' | 'intermediate' | 'advanced' | 'expert'>;
    preferences: {
        difficulty_preference: 'beginner' | 'intermediate' | 'advanced' | 'expert';
        verbose_explanations: boolean;
        include_examples: boolean;
        preferred_languages: string[];
    };
}
export interface UserRepository {
    id: string;
    name: string;
    url: string;
    provider: string;
    private: boolean;
    primary_language?: string;
    languages?: Record<string, number>;
    user_access_level: 'read' | 'write' | 'admin';
}
export interface AuthenticatedSearchOptions extends SearchOptions {
    respect_repository_access?: boolean;
    adapt_to_user_skill?: boolean;
    include_private_repositories?: boolean;
    log_search_analytics?: boolean;
}
export interface AuthenticatedSearchResult extends RAGSearchResult {
    user_can_access: boolean;
    adapted_for_skill_level?: 'beginner' | 'intermediate' | 'advanced' | 'expert';
}
export interface EmbeddingService {
    generateEmbedding(text: string): Promise<number[]>;
}
/**
 * Authenticated RAG Service Class
 */
export declare class AuthenticatedRAGService {
    private ragService;
    private queryAnalyzer;
    private supabase;
    private logger;
    constructor(embeddingService: EmbeddingService, supabaseClient?: SupabaseJSClient);
    /**
     * Perform authenticated RAG search with user context and permissions
     */
    searchWithAuth(query: string, user: AuthenticatedUser, repositoryId?: string, options?: AuthenticatedSearchOptions): Promise<{
        results: AuthenticatedSearchResult[];
        educational: EducationalContentResult[];
        userContext: UserContext;
        analytics: {
            query_id: string;
            total_results: number;
            filtered_results: number;
            search_duration_ms: number;
        };
    }>;
    /**
     * Get user skill profile and context
     */
    getUserContext(user: AuthenticatedUser): Promise<UserContext>;
    /**
     * Get repository context with authentication check
     */
    getRepositoryContextWithAuth(repositoryId: string, user: AuthenticatedUser): Promise<RepositoryContext | null>;
    /**
     * Filter search results based on user access permissions
     */
    private filterResultsByAccess;
    /**
     * Adapt search results to user skill level
     */
    private adaptResultsToUserSkill;
    /**
     * Log search analytics for continuous improvement
     */
    private logSearchAnalytics;
    /**
     * Utility: Determine overall skill level from individual skills
     */
    private determineOverallSkillLevel;
    /**
     * Utility: Extract frameworks from repository data
     */
    private extractFrameworksFromRepository;
    /**
     * Utility: Adapt content complexity based on user skill level
     */
    private adaptContentForSkillLevel;
    /**
     * Update user skills based on interaction patterns
     */
    updateUserSkills(user: AuthenticatedUser, language: string, domain: string, wasHelpful: boolean, interactionContext?: Record<string, any>): Promise<void>;
    /**
     * Get user's accessible repositories
     */
    getUserRepositories(user: AuthenticatedUser): Promise<UserRepository[]>;
}
export declare function createAuthenticatedRAGService(embeddingService: EmbeddingService, supabaseClient?: SupabaseJSClient): AuthenticatedRAGService;
