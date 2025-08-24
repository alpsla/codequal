/**
 * Legacy Multi-Agent Executor Wrapper
 * 
 * Provides backward compatibility during authentication integration migration.
 * This wrapper allows existing code to continue working while new code uses
 * the enhanced AuthenticatedUser-based API.
 */

import { createLogger } from '@codequal/core/utils';
import { 
  EnhancedMultiAgentExecutor,
  EnhancedExecutionOptions
} from './enhanced-executor';
import { 
  MultiAgentConfig,
  MultiAgentResult,
  RepositoryData,
  AuthenticatedUser,
  UserRole,
  UserStatus
} from './types';
import { VectorContextService } from './vector-context-service';
// Mock auth service removed - using inline implementation for legacy support

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
export class LegacyMultiAgentExecutor {
  private readonly logger = createLogger('LegacyMultiAgentExecutor');
  private readonly enhancedExecutor: EnhancedMultiAgentExecutor;
  private readonly mockAuthService = this.createInlineMockAuth();

  private createInlineMockAuth() {
    // Simple inline mock for legacy support only
    return {
      async authenticate(token: string): Promise<AuthenticatedUser> {
        return {
          id: 'legacy-user',
          email: 'legacy@example.com',
          name: 'Legacy User',
          organizationId: 'default',
          permissions: {
            repositories: {},
            organizations: ['default'],
            globalPermissions: ['read', 'write'],
            quotas: {
              requestsPerHour: 1000,
              maxConcurrentExecutions: 5,
              storageQuotaMB: 1000
            }
          },
          session: {
            token,
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
            fingerprint: 'legacy',
            ipAddress: '127.0.0.1',
            userAgent: 'legacy'
          },
          role: 'user' as UserRole,
          status: 'active' as UserStatus,
          metadata: {
            createdAt: new Date(),
            lastLogin: new Date(),
            isActive: true,
            preferences: {}
          }
        };
      },
      async validateSession(user: AuthenticatedUser): Promise<boolean> {
        return true;
      },
      async refreshSession(user: AuthenticatedUser): Promise<AuthenticatedUser> {
        return user;
      },
      async invalidateSession(user: AuthenticatedUser): Promise<void> {
        // No-op for legacy
      },
      async checkPermission(user: AuthenticatedUser, resource: string, action: string): Promise<boolean> {
        return true;
      },
      async hasRepositoryAccess(user: AuthenticatedUser, repo: string): Promise<boolean> {
        return true;
      },
      async getSessionMetadata(user: AuthenticatedUser): Promise<any> {
        return {};
      },
      async handleSecurityIncident(user: AuthenticatedUser, incident: string): Promise<void> {
        // No-op for legacy
      }
    };
  }

  constructor(
    config: MultiAgentConfig,
    repositoryData: RepositoryData,
    vectorContextService: VectorContextService,
    options: LegacyExecutionOptions = {}
  ) {
    // Log deprecation warning
    if (!options.suppressAuthWarnings) {
      this.logger.warn(
        '🚨 DEPRECATION WARNING: LegacyMultiAgentExecutor is deprecated. ' +
        'Please migrate to EnhancedMultiAgentExecutor with AuthenticatedUser. ' +
        'This wrapper will be removed in a future version.'
      );
    }

    // Create mock authenticated user from legacy userId
    const mockUser = this.createMockUserFromLegacyData(
      options.userId || 'legacy-user',
      repositoryData
    );

    // Create enhanced executor with mock user
    this.enhancedExecutor = new EnhancedMultiAgentExecutor(
      config,
      repositoryData,
      vectorContextService,
      mockUser,
      options
    );

    this.logger.info('Legacy executor initialized with mock authentication', {
      userId: mockUser.id,
      repositoryId: `${repositoryData.owner}/${repositoryData.repo}`
    });
  }

  /**
   * Execute the multi-agent analysis (legacy interface)
   */
  async execute(): Promise<MultiAgentResult> {
    this.logger.debug('Executing legacy multi-agent analysis');
    
    try {
      const result = await this.enhancedExecutor.execute();
      
      this.logger.debug('Legacy execution completed successfully', {
        successful: result.successful,
        duration: result.duration
      });
      
      return result;
    } catch (error) {
      this.logger.error('Legacy execution failed', {
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Create mock authenticated user from legacy data
   */
  private createMockUserFromLegacyData(
    legacyUserId: string,
    repositoryData: RepositoryData
  ): AuthenticatedUser {
    const repositoryId = `${repositoryData.owner}/${repositoryData.repo}`;
    
    // Create permissive mock user for legacy compatibility
    const mockUser: AuthenticatedUser = {
      id: `legacy-${legacyUserId}`,
      email: `${legacyUserId}@legacy.example`,
      name: `Legacy User ${legacyUserId}`,
      role: UserRole.USER,
      status: UserStatus.ACTIVE,
      permissions: {
        repositories: {
          [repositoryId]: {
            read: true,
            write: true,
            admin: false
          }
        },
        organizations: [repositoryData.owner],
        globalPermissions: [],
        quotas: {
          requestsPerHour: 10000, // Generous quota for legacy users
          maxConcurrentExecutions: 10,
          storageQuotaMB: 5000
        }
      },
      session: {
        token: `legacy-token-${legacyUserId}-${Date.now()}`,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
        fingerprint: `legacy-fingerprint-${legacyUserId}`,
        ipAddress: '127.0.0.1',
        userAgent: 'LegacyMultiAgentExecutor/1.0'
      }
    };

    this.logger.debug('Created mock user for legacy compatibility', {
      legacyUserId,
      mockUserId: mockUser.id,
      repositoryId,
      permissions: mockUser.permissions.repositories[repositoryId]
    });

    return mockUser;
  }

  /**
   * Get migration guidance for updating to new API
   */
  static getMigrationGuidance(): string {
    return `
🔄 MIGRATION GUIDE: LegacyMultiAgentExecutor → EnhancedMultiAgentExecutor

BEFORE (Legacy):
const executor = new LegacyMultiAgentExecutor(
  config,
  repositoryData,
  vectorContextService,
  { userId: 'user-123' }
);

AFTER (Enhanced):
const authenticatedUser = await authService.validateSession(token, requestContext);
const executor = new EnhancedMultiAgentExecutor(
  config,
  repositoryData,
  vectorContextService,
  authenticatedUser,
  options
);

🔒 SECURITY BENEFITS:
- Full user context with permissions
- Repository access validation
- Session management and expiry
- Comprehensive audit logging
- Rate limiting and quotas

📚 MIGRATION STEPS:
1. Implement authentication service in your application
2. Replace LegacyMultiAgentExecutor with EnhancedMultiAgentExecutor
3. Pass AuthenticatedUser instead of simple userId
4. Update error handling for authentication errors
5. Remove LegacyMultiAgentExecutor import

⚠️  TIMELINE:
- LegacyMultiAgentExecutor is deprecated as of this version
- Will be removed in version 2.0.0
- Migrate before then to avoid breaking changes
`;
  }
}

/**
 * Factory function for legacy executor (with deprecation warning)
 * 
 * @deprecated Use createEnhancedMultiAgentExecutor with AuthenticatedUser instead
 */
export function createLegacyMultiAgentExecutor(
  config: MultiAgentConfig,
  repositoryData: RepositoryData,
  vectorContextService: VectorContextService,
  options: LegacyExecutionOptions = {}
): LegacyMultiAgentExecutor {
  return new LegacyMultiAgentExecutor(config, repositoryData, vectorContextService, options);
}

/**
 * Migration helper to check if code is using legacy patterns
 */
export class MigrationChecker {
  private static readonly logger = createLogger('MigrationChecker');

  /**
   * Check if a codebase is using legacy patterns and needs migration
   */
  static checkForLegacyUsage(codeContent: string): {
    usesLegacyExecutor: boolean;
    legacyImports: string[];
    migrationRecommendations: string[];
  } {
    const legacyImports: string[] = [];
    const migrationRecommendations: string[] = [];

    // Check for legacy imports
    if (codeContent.includes('LegacyMultiAgentExecutor')) {
      legacyImports.push('LegacyMultiAgentExecutor');
      migrationRecommendations.push('Replace LegacyMultiAgentExecutor with EnhancedMultiAgentExecutor');
    }

    if (codeContent.includes('createLegacyMultiAgentExecutor')) {
      legacyImports.push('createLegacyMultiAgentExecutor');
      migrationRecommendations.push('Use direct EnhancedMultiAgentExecutor constructor');
    }

    // Check for legacy userId pattern
    if (codeContent.includes('userId:') && !codeContent.includes('AuthenticatedUser')) {
      migrationRecommendations.push('Replace userId strings with AuthenticatedUser objects');
    }

    // Check for missing authentication
    if (codeContent.includes('MultiAgentExecutor') && !codeContent.includes('authenticatedUser')) {
      migrationRecommendations.push('Add authentication integration with AuthenticatedUser');
    }

    const usesLegacyExecutor = legacyImports.length > 0;

    if (usesLegacyExecutor) {
      this.logger.warn('Legacy usage detected', {
        legacyImports,
        recommendationsCount: migrationRecommendations.length
      });
    }

    return {
      usesLegacyExecutor,
      legacyImports,
      migrationRecommendations
    };
  }

  /**
   * Generate migration plan for a specific codebase
   */
  static generateMigrationPlan(_projectPath: string): {
    priority: 'high' | 'medium' | 'low';
    estimatedEffort: string;
    steps: string[];
    timeline: string;
  } {
    // This would be implemented to scan actual project files
    // For now, return a template plan
    
    return {
      priority: 'high',
      estimatedEffort: '2-4 hours',
      steps: [
        '1. Implement authentication service integration',
        '2. Update all LegacyMultiAgentExecutor usages',
        '3. Replace userId strings with AuthenticatedUser objects',
        '4. Add error handling for authentication failures',
        '5. Test with real authentication flow',
        '6. Remove legacy imports and deprecation warnings'
      ],
      timeline: 'Complete migration within 1 sprint to avoid technical debt'
    };
  }
}

/**
 * Utility to help with gradual migration
 */
export class GradualMigrationHelper {
  private static readonly logger = createLogger('GradualMigrationHelper');

  /**
   * Create a hybrid executor that can work with both legacy and new patterns
   */
  static createHybridExecutor(
    config: MultiAgentConfig,
    repositoryData: RepositoryData,
    vectorContextService: VectorContextService,
    userContext: string | AuthenticatedUser,
    options: LegacyExecutionOptions = {}
  ): EnhancedMultiAgentExecutor | LegacyMultiAgentExecutor {
    
    if (typeof userContext === 'string') {
      // Legacy usage - create legacy executor
      this.logger.info('Creating legacy executor for gradual migration', {
        userId: userContext,
        repositoryId: `${repositoryData.owner}/${repositoryData.repo}`
      });
      
      return new LegacyMultiAgentExecutor(
        config,
        repositoryData,
        vectorContextService,
        { ...options, userId: userContext }
      );
    } else {
      // New usage - create enhanced executor
      this.logger.info('Creating enhanced executor with authentication', {
        userId: userContext.id,
        repositoryId: `${repositoryData.owner}/${repositoryData.repo}`
      });
      
      return new EnhancedMultiAgentExecutor(
        config,
        repositoryData,
        vectorContextService,
        userContext,
        options
      );
    }
  }
}