/**
 * Tool initialization module
 * Registers all available tools with the tool registry
 */

import { toolRegistry } from './registry';
import { createLogger } from '@codequal/core';

// Import all direct adapters
import { 
  eslintDirectAdapter,
  prettierDirectAdapter,
  dependencyCruiserDirectAdapter,
  npmOutdatedDirectAdapter,
  bundlephobiaDirectAdapter,
  sonarJSDirectAdapter
} from '../adapters/direct';
import { GrafanaDirectAdapter } from '../adapters/direct/grafana-adapter';
import { MadgeDirectAdapter } from '../adapters/direct/madge-direct';
import { NpmAuditDirectAdapter } from '../adapters/direct/npm-audit-direct';
import { LicenseCheckerDirectAdapter } from '../adapters/direct/license-checker-direct';

// Import all MCP adapters
import { ChartJSMCPAdapter } from '../adapters/mcp/chartjs-mcp';
import { ContextMCPAdapter } from '../adapters/mcp/context-mcp';
import { Context7MCPAdapter } from '../adapters/mcp/context7-mcp';
import { WorkingExamplesMCPAdapter } from '../adapters/mcp/working-examples-mcp';
import { MCPDocsServiceAdapter } from '../adapters/mcp/docs-service';
import { ESLintMCPAdapterFixed } from '../adapters/mcp/eslint-mcp-fixed';
import { MCPScanAdapter } from '../adapters/mcp/mcp-scan';
import { MarkdownPDFMCPAdapter } from '../adapters/mcp/markdown-pdf-mcp';
import { MermaidMCPAdapter } from '../adapters/mcp/mermaid-mcp';
import { MockESLintMCPAdapter } from '../adapters/mcp/mock-eslint';
import { SemgrepMCPAdapter } from '../adapters/mcp/semgrep-mcp';
import { ContextRetrievalMCPAdapter } from '../adapters/mcp/context-retrieval-mcp';
import { RefMCPAdapter } from '../adapters/mcp/ref-mcp';
import { TavilyMCPAdapter } from '../adapters/mcp/tavily-mcp';
import { SerenaMCPAdapter } from '../adapters/mcp/serena-mcp';

const logger = createLogger('ToolInitializer');

/**
 * Initialize and register all tools
 */
export async function initializeTools(): Promise<void> {
  logger.info('Initializing MCP-Hybrid tools...');
  
  try {
    // Register Direct Adapters
    const directAdapters = [
      eslintDirectAdapter,
      prettierDirectAdapter,
      dependencyCruiserDirectAdapter,
      npmOutdatedDirectAdapter,
      bundlephobiaDirectAdapter,
      sonarJSDirectAdapter,
      new GrafanaDirectAdapter(),
      new MadgeDirectAdapter(),
      new NpmAuditDirectAdapter(),
      new LicenseCheckerDirectAdapter()
    ];
    
    for (const adapter of directAdapters) {
      try {
        toolRegistry.register(adapter);
        logger.debug(`Registered direct adapter: ${adapter.id}`);
      } catch (error) {
        logger.warn(`Failed to register direct adapter ${adapter.id}:`, { error });
      }
    }
    
    // Register MCP Adapters
    const mcpAdapters = [
      new ESLintMCPAdapterFixed(),  // Use real ESLint MCP adapter
      new SemgrepMCPAdapter(),      // Security analysis
      new ContextRetrievalMCPAdapter(), // Context retrieval
      new RefMCPAdapter(),          // Perplexity web search integration
      new TavilyMCPAdapter(),       // Tavily AI-powered web search
      new SerenaMCPAdapter(),       // Semantic code understanding
      // new MockESLintMCPAdapter(),  // Keep mock as fallback
      // new ChartJSMCPAdapter(),
      // new ContextMCPAdapter(),
      // new Context7MCPAdapter(),
      // new WorkingExamplesMCPAdapter(),
      // new MCPDocsServiceAdapter(),
      // new MCPScanAdapter(),
      // new MarkdownPDFMCPAdapter(),
      // new MermaidMCPAdapter()
    ];
    
    for (const adapter of mcpAdapters) {
      try {
        toolRegistry.register(adapter);
        logger.debug(`Registered MCP adapter: ${adapter.id}`);
      } catch (error) {
        logger.warn(`Failed to register MCP adapter ${adapter.id}:`, { error });
      }
    }
    
    // Log statistics
    const stats = toolRegistry.getStatistics();
    logger.info('Tool registration complete', {
      total: stats.total,
      direct: stats.byType.direct,
      mcp: stats.byType.mcp,
      byRole: stats.byRole
    });
    
  } catch (error) {
    logger.error('Failed to initialize tools:', { error });
    throw error;
  }
}

/**
 * Verify all tools are healthy
 */
export async function verifyToolHealth(): Promise<Map<string, boolean>> {
  logger.info('Verifying tool health...');
  
  const results = await toolRegistry.validateAll();
  
  let healthyCount = 0;
  let unhealthyCount = 0;
  
  results.forEach((isHealthy, toolId) => {
    if (isHealthy) {
      healthyCount++;
    } else {
      unhealthyCount++;
      logger.warn(`Tool ${toolId} failed health check`);
    }
  });
  
  logger.info('Tool health check complete', {
    healthy: healthyCount,
    unhealthy: unhealthyCount,
    total: results.size
  });
  
  return results;
}

/**
 * Get tool registration status
 */
export function getToolStatus(): {
  initialized: boolean;
  toolCount: number;
  byType: Record<string, number>;
  byRole: Record<string, number>;
} {
  const stats = toolRegistry.getStatistics();
  
  return {
    initialized: stats.total > 0,
    toolCount: stats.total,
    byType: stats.byType,
    byRole: stats.byRole
  };
}