/**
 * MCP Integration Example
 * Demonstrates how to use the Model Context Protocol (MCP) with CodeQual's multi-agent system
 * 
 * Note: This example is currently disabled due to type mismatches with the AnalysisResult interface.
 * TODO: Update once the AnalysisResult interface includes MCP-specific properties.
 */

// @ts-nocheck
/* eslint-disable */

import { EnhancedMultiAgentExecutor } from '../enhanced-executor';
import { VectorContextService } from '../vector-context-service';
import { AnalysisStrategy } from '../types';
import { createLogger } from '@codequal/core/utils';

const logger = createLogger('MCPIntegrationExample');

/**
 * Example: MCP-Coordinated Security and Code Quality Analysis
 */
export async function mcpCoordinatedAnalysisExample() {
  logger.info('🚀 Starting MCP-coordinated analysis example');

  // Sample authenticated user (in production, this comes from auth middleware)
  const authenticatedUser = {
    id: 'user_mcp_example_123',
    email: 'developer@example.com',
    name: 'MCP Test User',
    role: 'developer' as const,
    permissions: ['read_repository', 'analyze_code'],
    organizationId: 'org_example_456',
    session: {
      token: 'mock_session_token',
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
    }
  };

  // Sample repository data
  const repositoryData = {
    repositoryUrl: 'https://github.com/example/secure-api',
    repositoryName: 'secure-api',
    description: 'A secure REST API with authentication',
    primaryLanguage: 'typescript',
    sizeCategory: 'medium' as const,
    changedFiles: [
      'src/auth/auth.service.ts',
      'src/users/user.controller.ts',
      'src/database/user.repository.ts'
    ],
    prData: {
      title: 'Add JWT refresh token support',
      description: 'Implement refresh token rotation for enhanced security',
      baseBranch: 'main',
      headBranch: 'feature/jwt-refresh-tokens'
    }
  };

  // Initialize Vector Context Service
  const vectorContextService = new VectorContextService(authenticatedUser);

  // Configure multi-agent analysis with MCP coordination
  const config = {
    name: 'mcp-coordinated-analysis',
    strategy: AnalysisStrategy.SPECIALIZED,
    fallbackEnabled: true,
    agents: [
      {
        role: 'security',
        provider: 'anthropic',
        model: 'claude-3-sonnet',
        config: {
          temperature: 0.1,
          focusAreas: ['authentication', 'authorization', 'input_validation', 'jwt_security']
        }
      },
      {
        role: 'codeQuality',
        provider: 'openai',
        model: 'gpt-4',
        config: {
          temperature: 0.2,
          focusAreas: ['maintainability', 'error_handling', 'type_safety']
        }
      },
      {
        role: 'architecture',
        provider: 'anthropic',
        model: 'claude-3-opus',
        config: {
          temperature: 0.3,
          focusAreas: ['design_patterns', 'separation_of_concerns', 'scalability']
        }
      },
      {
        role: 'performance',
        provider: 'openai',
        model: 'gpt-4-turbo',
        config: {
          temperature: 0.1,
          focusAreas: ['database_queries', 'caching', 'memory_usage']
        }
      }
    ]
  };

  // Initialize Enhanced Multi-Agent Executor with MCP enabled
  const executor = new EnhancedMultiAgentExecutor(
    config,
    repositoryData,
    vectorContextService,
    authenticatedUser,
    {
      enableMCP: true, // Enable Model Context Protocol coordination
      enableMetrics: true,
      resourceStrategy: 'balanced',
      maxConcurrentAgents: 3,
      agentTimeout: 120000, // 2 minutes per agent
      debug: true
    }
  );

  try {
    logger.info('📋 MCP Context initialized');
    
    // Get initial MCP status
    const initialStatus = executor.getMCPStatus();
    logger.info('Initial MCP Status:', {
      isEnabled: initialStatus.isEnabled,
      sessionId: initialStatus.currentContext.session_id,
      userRole: initialStatus.currentContext.user_context.role
    });

    // Execute analysis with MCP coordination
    logger.info('🔄 Starting MCP-coordinated multi-agent analysis...');
    const startTime = Date.now();
    
    const result = await executor.execute();
    
    const executionTime = Date.now() - startTime;
    logger.info(`✅ MCP-coordinated analysis completed in ${executionTime}ms`);

    // Display MCP coordination results
    logger.info('📊 MCP Coordination Results:', {
      strategy: result.combinedResult.strategy,
      analysisMode: result.combinedResult.analysisMode,
      coordinationStrategy: result.combinedResult.coordinationStrategy,
      completedAgents: Object.keys(result.combinedResult.agentResults).length,
      totalDuration: result.combinedResult.totalDuration
    });

    // Show cross-agent insights discovered through MCP
    const mcpContext = result.combinedResult.mcpContext;
    if (mcpContext.shared_findings.cross_agent_insights.length > 0) {
      logger.info('🔗 Cross-Agent Insights discovered through MCP:');
      mcpContext.shared_findings.cross_agent_insights.forEach((insight: any, index: number) => {
        logger.info(`   ${index + 1}. From ${insight.source_agent} to ${insight.target_agent}:`, {
          type: insight.insight.type,
          message: insight.insight.message
        });
      });
    }

    // Show MCP progress summary
    const progressSummary = result.combinedResult.progressSummary;
    logger.info('📈 MCP Progress Summary:', {
      completionPercentage: progressSummary.completion_percentage,
      totalAgents: progressSummary.total_agents,
      completedAgents: progressSummary.completed_agents,
      activeAgents: progressSummary.active_agents
    });

    // Display agent-specific results
    logger.info('🔍 Individual Agent Results:');
    Object.entries(result.combinedResult.agentResults).forEach(([agentName, agentResult]: [string, any]) => {
      logger.info(`   ${agentName}:`, {
        insights: agentResult.insights?.length || 0,
        suggestions: agentResult.suggestions?.length || 0,
        executionTime: agentResult.metadata?.duration || 'unknown'
      });
    });

    return {
      success: true,
      mcpEnabled: true,
      coordinationStrategy: result.combinedResult.coordinationStrategy,
      agentResults: result.combinedResult.agentResults,
      crossAgentInsights: mcpContext.shared_findings.cross_agent_insights,
      executionTime,
      progressSummary
    };

  } catch (error) {
    logger.error('❌ MCP-coordinated analysis failed:', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    
    // Get MCP status for debugging
    const errorStatus = executor.getMCPStatus();
    logger.error('MCP Status during error:', errorStatus);
    
    throw error;
  }
}

/**
 * Example: Traditional vs MCP Coordination Comparison
 */
export async function compareTraditionalVsMCPExecution() {
  logger.info('🔬 Comparing Traditional vs MCP execution strategies');

  const authenticatedUser = {
    id: 'user_comparison_123',
    email: 'researcher@example.com',
    name: 'Comparison Test User',
    role: 'developer' as const,
    permissions: ['read_repository', 'analyze_code'],
    organizationId: 'org_research_456',
    session: {
      token: 'mock_session_token',
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
    }
  };

  const repositoryData = {
    repositoryUrl: 'https://github.com/example/comparison-test',
    repositoryName: 'comparison-test',
    primaryLanguage: 'javascript',
    sizeCategory: 'small' as const,
    changedFiles: ['src/index.js', 'src/utils.js']
  };

  const vectorContextService = new VectorContextService(authenticatedUser);

  const config = {
    name: 'traditional-parallel-analysis',
    strategy: AnalysisStrategy.PARALLEL,
    fallbackEnabled: true,
    agents: [
      {
        role: 'security',
        provider: 'anthropic',
        model: 'claude-3-sonnet',
        config: { temperature: 0.1 }
      },
      {
        role: 'codeQuality',
        provider: 'openai',
        model: 'gpt-4',
        config: { temperature: 0.2 }
      }
    ]
  };

  // Test 1: Traditional execution (MCP disabled)
  logger.info('📊 Test 1: Traditional execution');
  const traditionalExecutor = new EnhancedMultiAgentExecutor(
    config,
    repositoryData,
    vectorContextService,
    authenticatedUser,
    { enableMCP: false, debug: true }
  );

  const traditionalStart = Date.now();
  const traditionalResult = await traditionalExecutor.execute();
  const traditionalDuration = Date.now() - traditionalStart;

  // Test 2: MCP-coordinated execution
  logger.info('📊 Test 2: MCP-coordinated execution');
  const mcpExecutor = new EnhancedMultiAgentExecutor(
    config,
    repositoryData,
    vectorContextService,
    authenticatedUser,
    { enableMCP: true, debug: true }
  );

  const mcpStart = Date.now();
  const mcpResult = await mcpExecutor.execute();
  const mcpDuration = Date.now() - mcpStart;

  // Compare results
  logger.info('📈 Comparison Results:', {
    traditional: {
      duration: traditionalDuration,
      strategy: traditionalResult.combinedResult.strategy || 'traditional',
      agentCount: Object.keys(traditionalResult.results).length
    },
    mcp: {
      duration: mcpDuration,
      strategy: mcpResult.combinedResult.strategy,
      coordinationStrategy: mcpResult.combinedResult.coordinationStrategy,
      agentCount: Object.keys(mcpResult.combinedResult.agentResults).length,
      crossAgentInsights: mcpResult.combinedResult.mcpContext.shared_findings.cross_agent_insights.length
    },
    improvement: {
      durationDifference: mcpDuration - traditionalDuration,
      percentageChange: ((mcpDuration - traditionalDuration) / traditionalDuration * 100).toFixed(2),
      mcpAdvantages: [
        'Cross-agent insight sharing',
        'Intelligent dependency coordination',
        'Resource optimization',
        'Progress tracking'
      ]
    }
  });

  return {
    traditional: {
      duration: traditionalDuration,
      results: traditionalResult
    },
    mcp: {
      duration: mcpDuration,
      results: mcpResult,
      crossAgentInsights: mcpResult.combinedResult.mcpContext.shared_findings.cross_agent_insights.length
    }
  };
}

/**
 * Example: MCP Agent Dependency Coordination
 */
export async function mcpDependencyCoordinationExample() {
  logger.info('🔗 Demonstrating MCP dependency coordination');

  const authenticatedUser = {
    id: 'user_dependency_123',
    email: 'architect@example.com',
    name: 'Dependency Test User',
    role: 'developer' as const,
    permissions: ['read_repository', 'analyze_code'],
    organizationId: 'org_dependency_456',
    session: {
      token: 'mock_session_token',
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
    }
  };

  const repositoryData = {
    repositoryUrl: 'https://github.com/example/complex-system',
    repositoryName: 'complex-system',
    primaryLanguage: 'typescript',
    sizeCategory: 'large' as const,
    changedFiles: [
      'src/security/auth.service.ts',
      'src/architecture/service-layer.ts',
      'src/performance/caching.service.ts',
      'src/quality/validation.service.ts'
    ]
  };

  const vectorContextService = new VectorContextService(authenticatedUser);

  // Configure with all agents to demonstrate dependency coordination
  const config = {
    name: 'mcp-dependency-coordination',
    strategy: AnalysisStrategy.SPECIALIZED, // This will use 'deep' analysis mode
    fallbackEnabled: true,
    agents: [
      { role: 'security', provider: 'anthropic', model: 'claude-3-sonnet', config: { temperature: 0.1 } },
      { role: 'architecture', provider: 'anthropic', model: 'claude-3-opus', config: { temperature: 0.3 } },
      { role: 'performance', provider: 'openai', model: 'gpt-4-turbo', config: { temperature: 0.1 } },
      { role: 'codeQuality', provider: 'openai', model: 'gpt-4', config: { temperature: 0.2 } },
      { role: 'dependencies', provider: 'anthropic', model: 'claude-3-sonnet', config: { temperature: 0.2 } }
    ]
  };

  const executor = new EnhancedMultiAgentExecutor(
    config,
    repositoryData,
    vectorContextService,
    authenticatedUser,
    {
      enableMCP: true,
      enableMetrics: true,
      debug: true,
      agentTimeout: 180000 // 3 minutes for complex analysis
    }
  );

  // Get MCP context manager to observe coordination
  const mcpManager = executor.getMCPContextManager();
  const coordinationStrategy = mcpManager.getCoordinationStrategy('deep');

  logger.info('🎯 Dependency Coordination Strategy:', {
    name: coordinationStrategy.name,
    executionOrder: coordinationStrategy.execution_order,
    dependencyGraph: coordinationStrategy.dependency_graph,
    parallelGroups: coordinationStrategy.parallel_groups
  });

  const result = await executor.execute();

  logger.info('✅ Dependency coordination completed:', {
    totalAgents: result.combinedResult.progressSummary.total_agents,
    completedAgents: result.combinedResult.progressSummary.completed_agents,
    coordinationStrategy: result.combinedResult.coordinationStrategy,
    crossAgentInsights: result.combinedResult.mcpContext.shared_findings.cross_agent_insights.length
  });

  return result;
}

// Export for use in other examples
export {
  mcpCoordinatedAnalysisExample as default,
  compareTraditionalVsMCPExecution,
  mcpDependencyCoordinationExample
};