/**
 * Supabase Authentication Integration Example
 * 
 * This example demonstrates how to integrate the Supabase authentication service
 * with the multi-agent system for complete user management, subscription tiers,
 * and repository access control.
 * 
 * Note: This file contains examples and may have type issues with optional configs.
 * For production use, ensure all required configuration properties are provided.
 */

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck - Example file with type issues

import { 
  createSupabaseAuthenticationService,
  SupabaseAuthenticationService,
  SubscriptionTier,
  defaultSupabaseAuthConfig,
  productionSupabaseAuthConfig
} from '../supabase-auth-service';
import { UserRole } from '../types/auth';
import { EnhancedMultiAgentExecutor } from '../enhanced-executor';
import { createMultiAgentAuthMiddleware } from '../auth-middleware';
import { 
  createSecurityLoggingService,
  defaultSecurityLoggingConfig
} from '../security-logging-service';

/**
 * Complete Supabase Integration Setup
 */
export class SupabaseIntegrationExample {
  private authService: SupabaseAuthenticationService;
  private securityLogging: any;

  constructor() {
    // Initialize Supabase authentication service
    const config = {
      ...defaultSupabaseAuthConfig,
      supabaseUrl: process.env.SUPABASE_URL!,
      supabaseAnonKey: process.env.SUPABASE_ANON_KEY!,
      serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
      jwt: {
        secret: process.env.SUPABASE_JWT_SECRET || 'default-secret',
        expiresIn: '24h'
      }
    };
    
    this.authService = createSupabaseAuthenticationService(config);

    // Initialize security logging
    this.securityLogging = createSecurityLoggingService(
      defaultSecurityLoggingConfig
    );
  }

  /**
   * Example 1: User Registration with Organization
   */
  async registerUserWithOrganization(
    email: string,
    password: string,
    organizationName: string,
    tier: SubscriptionTier = SubscriptionTier.FREE
  ) {
    try {
      console.log('🔐 Creating user account with organization...');
      
      const { user, organization } = await this.authService.createUser(
        email,
        password,
        tier,
        organizationName
      );

      console.log('✅ User created successfully:', {
        userId: user.id,
        email: user.email,
        tier: user.metadata?.subscriptionTier,
        organizationId: organization?.id,
        organizationName: organization?.name
      });

      return { user, organization };

    } catch (error) {
      console.error('❌ User registration failed:', error);
      throw error;
    }
  }

  /**
   * Example 2: Grant Repository Access to Organization
   */
  async grantRepositoryAccess(
    organizationId: string,
    repositoryId: string,
    accessLevel: 'read' | 'write' | 'admin',
    grantedBy: string
  ) {
    try {
      console.log('🔑 Granting repository access...');
      
      await this.authService.grantRepositoryAccess(
        organizationId,
        repositoryId,
        accessLevel,
        grantedBy
      );

      console.log('✅ Repository access granted:', {
        organizationId,
        repositoryId,
        accessLevel,
        grantedBy
      });

    } catch (error) {
      console.error('❌ Failed to grant repository access:', error);
      throw error;
    }
  }

  /**
   * Example 3: Authenticated Multi-Agent Execution
   */
  async executeWithAuthentication(
    token: string,
    repositoryData: any,
    config: any,
    requestContext: { ipAddress: string; userAgent: string }
  ) {
    try {
      console.log('🔍 Validating user session...');
      
      // Validate session and get authenticated user
      const authenticatedUser = await this.authService.validateSession(
        token,
        requestContext
      );

      console.log('✅ Session validated for user:', {
        userId: authenticatedUser.id,
        email: authenticatedUser.email,
        role: authenticatedUser.role,
        organizationId: authenticatedUser.organizationId
      });

      // Check repository access
      const repositoryAccess = await this.authService.validateRepositoryAccess(
        authenticatedUser,
        repositoryData.id,
        'read'
      );

      if (!repositoryAccess.granted) {
        throw new Error(`Repository access denied: ${repositoryAccess.reason}`);
      }

      console.log('✅ Repository access validated');

      // Create enhanced executor with authenticated user
      const executor = new EnhancedMultiAgentExecutor(
        config,
        repositoryData,
        {} as any, // vectorContextService would be injected here
        authenticatedUser,
        {
          timeout: 30000
        }
      );

      console.log('🚀 Executing multi-agent analysis...');
      
      // Execute with full authentication and auditing
      const result = await executor.execute();

      console.log('✅ Analysis completed successfully');
      
      return {
        result,
        user: authenticatedUser,
        repositoryAccess
      };

    } catch (error) {
      console.error('❌ Authenticated execution failed:', error);
      throw error;
    }
  }

  /**
   * Example 4: Express.js Middleware Integration
   */
  createExpressMiddleware() {
    return createMultiAgentAuthMiddleware(this.authService, {
      requiredRoles: [UserRole.USER, UserRole.ORG_MEMBER],
      enableAuditLogging: true,
      rateLimiting: {
        enabled: true,
        requestsPerHour: 1000,
        burstLimit: 100
      },
      sessionValidation: {
        validateFingerprint: true,
        requireFreshSession: false,
        maxSessionAge: 24
      }
    });
  }

  /**
   * Example 5: Subscription Tier Management
   */
  async demonstrateSubscriptionTiers() {
    console.log('📊 Subscription Tier Examples:');
    
    // Free tier user
    const freeUser = await this.authService.createUser(
      'free@example.com',
      'password123',
      SubscriptionTier.FREE,
      'Free Company'
    );
    
    console.log('Free Tier Limits:', {
      repositories: freeUser.user.permissions.quotas.storageQuotaMB / 1024,
      requestsPerHour: freeUser.user.permissions.quotas.requestsPerHour,
      maxConcurrent: freeUser.user.permissions.quotas.maxConcurrentExecutions
    });

    // Pro tier user
    const proUser = await this.authService.createUser(
      'pro@example.com',
      'password123',
      SubscriptionTier.PRO,
      'Pro Company'
    );
    
    console.log('Pro Tier Limits:', {
      repositories: proUser.user.permissions.quotas.storageQuotaMB / 1024,
      requestsPerHour: proUser.user.permissions.quotas.requestsPerHour,
      maxConcurrent: proUser.user.permissions.quotas.maxConcurrentExecutions
    });

    // Enterprise tier user
    const enterpriseUser = await this.authService.createUser(
      'enterprise@example.com',
      'password123',
      SubscriptionTier.ENTERPRISE,
      'Enterprise Corp'
    );
    
    console.log('Enterprise Tier Limits:', {
      repositories: enterpriseUser.user.permissions.quotas.storageQuotaMB / 1024,
      requestsPerHour: enterpriseUser.user.permissions.quotas.requestsPerHour,
      maxConcurrent: enterpriseUser.user.permissions.quotas.maxConcurrentExecutions
    });
  }

  /**
   * Example 6: Security Monitoring and Alerts
   */
  async demonstrateSecurityMonitoring() {
    console.log('🛡️ Security Monitoring Example:');
    
    // Simulate authentication events
    await this.authService.logSecurityEvent({
      type: 'AUTH_SUCCESS',
      userId: 'user-123',
      sessionId: 'session-456',
      repositoryId: 'org/repo',
      ipAddress: '192.168.1.100',
      userAgent: 'Mozilla/5.0 (compatible)',
      timestamp: new Date(),
      details: { loginMethod: 'password' },
      severity: 'low'
    });

    await this.authService.logSecurityEvent({
      type: 'ACCESS_DENIED',
      userId: 'user-123',
      sessionId: 'session-456',
      repositoryId: 'restricted/repo',
      ipAddress: '192.168.1.100',
      userAgent: 'Mozilla/5.0 (compatible)',
      timestamp: new Date(),
      details: { reason: 'insufficient_permissions' },
      severity: 'medium'
    });

    console.log('✅ Security events logged successfully');
  }

  /**
   * Example 7: Rate Limiting Demonstration
   */
  async demonstrateRateLimiting(userId: string) {
    console.log('⏱️ Rate Limiting Example:');
    
    for (let i = 0; i < 5; i++) {
      const rateLimitResult = await this.authService.checkRateLimit(
        userId,
        'multi-agent-execution'
      );

      console.log(`Request ${i + 1}:`, {
        allowed: rateLimitResult.allowed,
        resetTime: rateLimitResult.resetTime
      });

      if (!rateLimitResult.allowed) {
        console.log('❌ Rate limit exceeded');
        break;
      }
    }
  }

  /**
   * Example 8: Production Configuration
   */
  createProductionService() {
    const prodConfig = {
      ...productionSupabaseAuthConfig,
      supabaseUrl: process.env.SUPABASE_URL!,
      supabaseAnonKey: process.env.SUPABASE_ANON_KEY!,
      serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
      jwt: {
        secret: process.env.SUPABASE_JWT_SECRET!,
        expiresIn: '8h'
      }
    };
    
    return createSupabaseAuthenticationService(prodConfig);
  }
}

/**
 * Usage Examples
 */
export async function runSupabaseIntegrationExamples() {
  console.log('🚀 Starting Supabase Integration Examples...\n');
  
  const integration = new SupabaseIntegrationExample();

  try {
    // Example 1: User Registration
    const { user, organization } = await integration.registerUserWithOrganization(
      'test@example.com',
      'securepassword123',
      'Test Organization',
      SubscriptionTier.PRO
    );

    // Example 2: Grant Repository Access
    await integration.grantRepositoryAccess(
      organization!.id,
      'test-org/test-repo',
      'write',
      user.id
    );

    // Example 3: Demonstrate Subscription Tiers
    await integration.demonstrateSubscriptionTiers();

    // Example 4: Security Monitoring
    await integration.demonstrateSecurityMonitoring();

    // Example 5: Rate Limiting
    await integration.demonstrateRateLimiting(user.id);

    console.log('\n✅ All examples completed successfully!');

  } catch (error) {
    console.error('\n❌ Example execution failed:', error);
  }
}

/**
 * Express.js Application Example
 */
export function createExpressApp() {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const express = require('express');
  const app = express();
  
  const integration = new SupabaseIntegrationExample();
  const authMiddleware = integration.createExpressMiddleware();

  app.use(express.json());

  // Protected route with authentication
  app.post('/api/analyze', authMiddleware, async (req: any, res: any) => {
    try {
      const { repositoryData, config } = req.body;
      
      // User is automatically available via middleware
      const authenticatedUser = req.user;
      const repositoryAccess = req.repositoryAccess;

      console.log('Authenticated user:', authenticatedUser.email);
      console.log('Repository access:', repositoryAccess);

      // Perform analysis with authenticated context
      // ... implementation here

      res.json({
        success: true,
        user: {
          id: authenticatedUser.id,
          email: authenticatedUser.email,
          tier: authenticatedUser.metadata?.subscriptionTier
        },
        analysis: 'Analysis would be performed here'
      });

    } catch (error) {
      res.status(500).json({
        error: 'Analysis failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  return app;
}

// Export for usage
export default SupabaseIntegrationExample;