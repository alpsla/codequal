/**
 * Legacy Multi-Agent Executor Wrapper
 *
 * Provides backward compatibility during authentication integration migration.
 * This wrapper allows existing code to continue working while new code uses
 * the enhanced AuthenticatedUser-based API.
 */
import { EnhancedMultiAgentExecutor, EnhancedExecutionOptions } from './enhanced-executor';
import { MultiAgentConfig, MultiAgentResult, RepositoryData, AuthenticatedUser } from './types';
import { VectorContextService } from './vector-context-service';
/**
 * Legacy execution options (without authentication)
 */
export interface LegacyExecutionOptions extends Omit<EnhancedExecutionOptions, 'userId'> {
    /** Legacy user ID (will be converted to mock AuthenticatedUser) */
    userId?: string;
    /** Skip authentication warnings */
    suppressAuthWarnings?: boolean;
}
/**
 * Legacy Multi-Agent Executor
 *
 * Provides backward compatibility for code that hasn't been updated
 * to use AuthenticatedUser yet. This should only be used during migration.
 *
 * @deprecated Use EnhancedMultiAgentExecutor with AuthenticatedUser instead
 */
export declare class LegacyMultiAgentExecutor {
    private readonly logger;
    private readonly enhancedExecutor;
    private readonly mockAuthService;
    private createInlineMockAuth;
    constructor(config: MultiAgentConfig, repositoryData: RepositoryData, vectorContextService: VectorContextService, options?: LegacyExecutionOptions);
    /**
     * Execute the multi-agent analysis (legacy interface)
     */
    execute(): Promise<MultiAgentResult>;
    /**
     * Create mock authenticated user from legacy data
     */
    private createMockUserFromLegacyData;
    /**
     * Get migration guidance for updating to new API
     */
    static getMigrationGuidance(): string;
}
/**
 * Factory function for legacy executor (with deprecation warning)
 *
 * @deprecated Use createEnhancedMultiAgentExecutor with AuthenticatedUser instead
 */
export declare function createLegacyMultiAgentExecutor(config: MultiAgentConfig, repositoryData: RepositoryData, vectorContextService: VectorContextService, options?: LegacyExecutionOptions): LegacyMultiAgentExecutor;
/**
 * Migration helper to check if code is using legacy patterns
 */
export declare class MigrationChecker {
    private static readonly logger;
    /**
     * Check if a codebase is using legacy patterns and needs migration
     */
    static checkForLegacyUsage(codeContent: string): {
        usesLegacyExecutor: boolean;
        legacyImports: string[];
        migrationRecommendations: string[];
    };
    /**
     * Generate migration plan for a specific codebase
     */
    static generateMigrationPlan(_projectPath: string): {
        priority: 'high' | 'medium' | 'low';
        estimatedEffort: string;
        steps: string[];
        timeline: string;
    };
}
/**
 * Utility to help with gradual migration
 */
export declare class GradualMigrationHelper {
    private static readonly logger;
    /**
     * Create a hybrid executor that can work with both legacy and new patterns
     */
    static createHybridExecutor(config: MultiAgentConfig, repositoryData: RepositoryData, vectorContextService: VectorContextService, userContext: string | AuthenticatedUser, options?: LegacyExecutionOptions): EnhancedMultiAgentExecutor | LegacyMultiAgentExecutor;
}
