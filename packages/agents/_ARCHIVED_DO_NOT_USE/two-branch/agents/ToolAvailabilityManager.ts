/**
 * Tool Availability Manager
 * 
 * Manages tool availability checking and enforces policies for missing tools
 * Prevents silent failures by making tool requirements explicit
 */

import { execSync } from 'child_process';
import { logger } from '../utils/logger';

export enum ToolMode {
  STRICT = 'strict',        // Fail immediately if tools missing (production)
  DEGRADED = 'degraded',   // Fail with warning, no mock data (staging)
  MOCK = 'mock'            // Use mock data ONLY (development with explicit flag)
}

export interface ToolStatus {
  name: string;
  installed: boolean;
  version?: string;
  lastChecked: Date;
  error?: string;
}

export interface ToolCheckResult {
  tool: string;
  available: boolean;
  mode: ToolMode;
  shouldUseMock: boolean;
  shouldFail: boolean;
  warning?: string;
}

export class ToolAvailabilityManager {
  private static instance: ToolAvailabilityManager;
  private toolStatuses: Map<string, ToolStatus> = new Map();
  private mode: ToolMode;
  
  constructor() {
    // Determine mode from environment
    this.mode = this.determineMode();
    logger.info(`Tool Availability Manager initialized in ${this.mode} mode`);
  }
  
  private determineMode(): ToolMode {
    const env = process.env.NODE_ENV;
    const mockAllowed = process.env.ALLOW_MOCK_TOOLS;
    const toolMode = process.env.TOOL_MODE as ToolMode;
    
    // Explicit mode takes precedence
    if (toolMode && Object.values(ToolMode).includes(toolMode)) {
      // Validate mock mode requirements
      if (toolMode === ToolMode.MOCK) {
        if (env !== 'development' && env !== 'test') {
          logger.error(`Cannot use MOCK mode in ${env} environment`);
          return ToolMode.STRICT;
        }
        if (mockAllowed !== 'true') {
          logger.error('MOCK mode requires ALLOW_MOCK_TOOLS=true');
          return ToolMode.STRICT;
        }
      }
      return toolMode;
    }
    
    // Production ALWAYS uses strict (no mocks ever)
    if (env === 'production') {
      return ToolMode.STRICT;
    }
    
    // Test environment can use mock if explicitly allowed
    if (env === 'test' && mockAllowed === 'true') {
      return ToolMode.MOCK;
    }
    
    // Development with explicit mock allowance
    if (env === 'development' && mockAllowed === 'true') {
      return ToolMode.MOCK;
    }
    
    // Default to STRICT mode (safest option - fail fast)
    return ToolMode.STRICT;
  }
  
  static getInstance(): ToolAvailabilityManager {
    if (!this.instance) {
      this.instance = new ToolAvailabilityManager();
    }
    return this.instance;
  }
  
  /**
   * Check if a tool is available and determine how to proceed
   */
  async checkTool(toolName: string): Promise<ToolCheckResult> {
    // Check cache first
    const cached = this.toolStatuses.get(toolName);
    const cacheAge = cached ? Date.now() - cached.lastChecked.getTime() : Infinity;
    
    // Use cache if less than 5 minutes old
    if (cached && cacheAge < 5 * 60 * 1000) {
      return this.determineAction(toolName, cached.installed);
    }
    
    // Check if tool is installed
    const installed = await this.isToolInstalled(toolName);
    
    // Update cache
    this.toolStatuses.set(toolName, {
      name: toolName,
      installed,
      lastChecked: new Date(),
      version: installed ? await this.getToolVersion(toolName) : undefined,
      error: installed ? undefined : 'Tool not found in PATH'
    });
    
    return this.determineAction(toolName, installed);
  }
  
  /**
   * Determine what action to take based on tool availability and mode
   */
  private determineAction(toolName: string, installed: boolean): ToolCheckResult {
    if (installed) {
      return {
        tool: toolName,
        available: true,
        mode: this.mode,
        shouldUseMock: false,
        shouldFail: false
      };
    }
    
    // Tool not installed - determine action based on mode
    switch (this.mode) {
      case ToolMode.STRICT:
        // STRICT: Fail immediately, no mocks
        return {
          tool: toolName,
          available: false,
          mode: this.mode,
          shouldUseMock: false,
          shouldFail: true,
          warning: `CRITICAL: Tool ${toolName} is required but not installed. Cannot proceed.`
        };
        
      case ToolMode.DEGRADED:
        // DEGRADED: Also fail, but with more detailed warning (no mocks!)
        return {
          tool: toolName,
          available: false,
          mode: this.mode,
          shouldUseMock: false,
          shouldFail: true,
          warning: `WARNING: Tool ${toolName} not available. Install it or switch to MOCK mode for development.`
        };
        
      case ToolMode.MOCK:
        // MOCK: Only mode that allows mock data (development only with explicit flag)
        if (process.env.NODE_ENV !== 'development' && process.env.NODE_ENV !== 'test') {
          throw new Error(`MOCK mode is only allowed in development/test environments. Current: ${process.env.NODE_ENV}`);
        }
        if (process.env.ALLOW_MOCK_TOOLS !== 'true') {
          throw new Error(`MOCK mode requires explicit ALLOW_MOCK_TOOLS=true flag`);
        }
        return {
          tool: toolName,
          available: false,
          mode: this.mode,
          shouldUseMock: true,
          shouldFail: false,
          warning: `DEVELOPMENT MODE: Using mock for ${toolName} (not installed)`
        };
        
      default:
        throw new Error(`Unknown tool mode: ${this.mode}`);
    }
  }
  
  /**
   * Check if a tool is installed
   */
  private async isToolInstalled(toolName: string): Promise<boolean> {
    try {
      execSync(`which ${toolName}`, { stdio: 'ignore' });
      return true;
    } catch {
      return false;
    }
  }
  
  /**
   * Get tool version if possible
   */
  private async getToolVersion(toolName: string): Promise<string | undefined> {
    try {
      const versionFlags = ['--version', '-version', 'version', '-v'];
      
      for (const flag of versionFlags) {
        try {
          const output = execSync(`${toolName} ${flag}`, { 
            encoding: 'utf-8',
            stdio: 'pipe'
          });
          
          // Extract version from output (basic pattern)
          const match = output.match(/\d+\.\d+(\.\d+)?/);
          if (match) {
            return match[0];
          }
        } catch {
          // Try next flag
        }
      }
    } catch {
      // Unable to get version
    }
    
    return undefined;
  }
  
  /**
   * Get health status of all registered tools
   */
  async getHealthStatus(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    mode: ToolMode;
    tools: ToolStatus[];
    missingTools: string[];
    recommendations: string[];
  }> {
    const tools = Array.from(this.toolStatuses.values());
    const missingTools = tools.filter(t => !t.installed).map(t => t.name);
    
    let status: 'healthy' | 'degraded' | 'unhealthy';
    const recommendations: string[] = [];
    
    if (missingTools.length === 0) {
      status = 'healthy';
    } else if (this.mode === ToolMode.STRICT) {
      status = 'unhealthy';
      recommendations.push('Install missing tools or switch to DEGRADED mode');
    } else {
      status = 'degraded';
      recommendations.push(`Install missing tools: ${missingTools.join(', ')}`);
      
      // Add installation commands
      if (missingTools.includes('spotbugs') || missingTools.includes('pmd')) {
        recommendations.push('Java tools: brew install spotbugs pmd checkstyle');
      }
      if (missingTools.includes('phpcs') || missingTools.includes('psalm')) {
        recommendations.push('PHP tools: composer global require squizlabs/php_codesniffer vimeo/psalm');
      }
      if (missingTools.includes('cppcheck')) {
        recommendations.push('C++ tools: brew install cppcheck llvm');
      }
    }
    
    return {
      status,
      mode: this.mode,
      tools,
      missingTools,
      recommendations
    };
  }
  
  /**
   * Force a specific mode (useful for testing)
   */
  setMode(mode: ToolMode): void {
    this.mode = mode;
    logger.info(`Tool mode changed to: ${mode}`);
  }
  
  /**
   * Clear cache (useful for testing)
   */
  clearCache(): void {
    this.toolStatuses.clear();
  }
  
  /**
   * Register multiple tools at once
   */
  async checkMultipleTools(toolNames: string[]): Promise<Map<string, ToolCheckResult>> {
    const results = new Map<string, ToolCheckResult>();
    
    for (const tool of toolNames) {
      results.set(tool, await this.checkTool(tool));
    }
    
    return results;
  }
  
  /**
   * Log tool availability summary
   */
  logSummary(): void {
    const tools = Array.from(this.toolStatuses.values());
    const installed = tools.filter(t => t.installed);
    const missing = tools.filter(t => !t.installed);
    
    logger.info('=== Tool Availability Summary ===');
    logger.info(`Mode: ${this.mode}`);
    logger.info(`Installed: ${installed.length}/${tools.length}`);
    
    if (installed.length > 0) {
      logger.info('Available tools:');
      installed.forEach(t => {
        logger.info(`  ✅ ${t.name}${t.version ? ` (v${t.version})` : ''}`);
      });
    }
    
    if (missing.length > 0) {
      logger.warn('Missing tools:');
      missing.forEach(t => {
        logger.warn(`  ❌ ${t.name}: ${t.error}`);
      });
    }
    
    logger.info('=================================');
  }
}

export const toolAvailabilityManager = ToolAvailabilityManager.getInstance();