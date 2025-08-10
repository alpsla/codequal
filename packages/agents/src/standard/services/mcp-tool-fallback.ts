/**
 * MCP Tool Fallback Service
 * Provides resilient tool execution with fallback strategies
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';

const execAsync = promisify(exec);

export interface ToolResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  toolUsed: string;
  fallbackChain: string[];
}

export interface MCPToolConfig {
  name: string;
  priority: number;
  isAvailable: () => Promise<boolean>;
  execute: (params: any) => Promise<any>;
}

/**
 * Manages MCP tool execution with automatic fallback
 */
export class MCPToolFallbackService {
  private toolChains: Map<string, MCPToolConfig[]> = new Map();
  private healthStatus: Map<string, boolean> = new Map();
  private lastHealthCheck: Map<string, Date> = new Map();
  private readonly HEALTH_CHECK_INTERVAL = 5 * 60 * 1000; // 5 minutes

  constructor() {
    this.initializeToolChains();
  }

  /**
   * Initialize tool chains with priorities and fallbacks
   */
  private initializeToolChains() {
    // Code search tool chain
    this.toolChains.set('code-search', [
      {
        name: 'serena-mcp',
        priority: 1,
        isAvailable: this.checkSerenaMCP.bind(this),
        execute: this.executeSerenaMCP.bind(this)
      },
      {
        name: 'mcp-ripgrep',
        priority: 2,
        isAvailable: this.checkMCPRipgrep.bind(this),
        execute: this.executeMCPRipgrep.bind(this)
      },
      {
        name: 'native-ripgrep',
        priority: 3,
        isAvailable: this.checkNativeRipgrep.bind(this),
        execute: this.executeNativeRipgrep.bind(this)
      },
      {
        name: 'grep-fallback',
        priority: 4,
        isAvailable: async () => true, // Always available
        execute: this.executeGrep.bind(this)
      }
    ]);

    // Semantic analysis tool chain
    this.toolChains.set('semantic-analysis', [
      {
        name: 'mcp-language-server',
        priority: 1,
        isAvailable: this.checkLanguageServer.bind(this),
        execute: this.executeLanguageServer.bind(this)
      },
      {
        name: 'ast-grep',
        priority: 2,
        isAvailable: this.checkASTGrep.bind(this),
        execute: this.executeASTGrep.bind(this)
      },
      {
        name: 'serena-mcp',
        priority: 3,
        isAvailable: this.checkSerenaMCP.bind(this),
        execute: this.executeSerenaMCP.bind(this)
      }
    ]);

    // Pattern matching tool chain
    this.toolChains.set('pattern-match', [
      {
        name: 'ast-grep',
        priority: 1,
        isAvailable: this.checkASTGrep.bind(this),
        execute: this.executeASTGrep.bind(this)
      },
      {
        name: 'serena-mcp',
        priority: 2,
        isAvailable: this.checkSerenaMCP.bind(this),
        execute: this.executeSerenaMCP.bind(this)
      },
      {
        name: 'mcp-ripgrep',
        priority: 3,
        isAvailable: this.checkMCPRipgrep.bind(this),
        execute: this.executeMCPRipgrep.bind(this)
      }
    ]);
  }

  /**
   * Execute a tool operation with automatic fallback
   */
  async execute<T = any>(
    operation: string,
    params: any,
    options: { 
      maxRetries?: number; 
      throwOnFailure?: boolean;
      preferredTool?: string;
    } = {}
  ): Promise<ToolResult<T>> {
    const toolChain = this.toolChains.get(operation);
    if (!toolChain) {
      throw new Error(`Unknown operation: ${operation}`);
    }

    const { maxRetries = 1, throwOnFailure = false, preferredTool } = options;
    const fallbackChain: string[] = [];

    // Sort tools by priority, but prefer specified tool if available
    let sortedTools = [...toolChain].sort((a, b) => a.priority - b.priority);
    if (preferredTool) {
      const preferred = sortedTools.find(t => t.name === preferredTool);
      if (preferred) {
        sortedTools = [preferred, ...sortedTools.filter(t => t.name !== preferredTool)];
      }
    }

    // Try each tool in order
    for (const tool of sortedTools) {
      fallbackChain.push(tool.name);

      // Check if tool is healthy (with caching)
      const isHealthy = await this.isToolHealthy(tool);
      if (!isHealthy) {
        console.log(`Tool ${tool.name} is not healthy, trying next...`);
        continue;
      }

      // Try to execute with retries
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          console.log(`Attempting ${operation} with ${tool.name} (attempt ${attempt}/${maxRetries})`);
          const data = await tool.execute(params);
          
          // Mark tool as healthy
          this.healthStatus.set(tool.name, true);
          
          return {
            success: true,
            data,
            toolUsed: tool.name,
            fallbackChain
          };
        } catch (error) {
          console.error(`Tool ${tool.name} failed on attempt ${attempt}:`, error);
          
          if (attempt === maxRetries) {
            // Mark tool as unhealthy after max retries
            this.healthStatus.set(tool.name, false);
          }
        }
      }
    }

    // All tools failed
    const error = `All tools failed for operation ${operation}. Tried: ${fallbackChain.join(' -> ')}`;
    
    if (throwOnFailure) {
      throw new Error(error);
    }

    return {
      success: false,
      error,
      toolUsed: 'none',
      fallbackChain
    };
  }

  /**
   * Check if a tool is healthy (with caching)
   */
  private async isToolHealthy(tool: MCPToolConfig): Promise<boolean> {
    const lastCheck = this.lastHealthCheck.get(tool.name);
    const now = new Date();

    // Use cached health status if recent
    if (lastCheck && (now.getTime() - lastCheck.getTime()) < this.HEALTH_CHECK_INTERVAL) {
      const cachedHealth = this.healthStatus.get(tool.name);
      if (cachedHealth !== undefined) {
        return cachedHealth;
      }
    }

    // Perform health check
    try {
      const isAvailable = await tool.isAvailable();
      this.healthStatus.set(tool.name, isAvailable);
      this.lastHealthCheck.set(tool.name, now);
      return isAvailable;
    } catch {
      this.healthStatus.set(tool.name, false);
      this.lastHealthCheck.set(tool.name, now);
      return false;
    }
  }

  // Tool availability checkers
  private async checkSerenaMCP(): Promise<boolean> {
    try {
      // Check if Serena MCP is running and responsive
      // This would be replaced with actual MCP health check
      return process.env.USE_SERENA_MCP === 'true';
    } catch {
      return false;
    }
  }

  private async checkMCPRipgrep(): Promise<boolean> {
    try {
      // Check if mcp-ripgrep server is running
      const { stdout } = await execAsync('pgrep -f mcp-ripgrep', { 
        timeout: 1000 
      }).catch(() => ({ stdout: '' }));
      return stdout.trim().length > 0;
    } catch {
      return false;
    }
  }

  private async checkNativeRipgrep(): Promise<boolean> {
    try {
      const { stdout } = await execAsync('which rg', { timeout: 1000 });
      return stdout.trim().length > 0;
    } catch {
      return false;
    }
  }

  private async checkLanguageServer(): Promise<boolean> {
    try {
      // Check if language server MCP is available
      return process.env.USE_LSP_MCP === 'true';
    } catch {
      return false;
    }
  }

  private async checkASTGrep(): Promise<boolean> {
    try {
      const { stdout } = await execAsync('which ast-grep', { timeout: 1000 });
      return stdout.trim().length > 0;
    } catch {
      return false;
    }
  }

  // Tool executors
  private async executeSerenaMCP(params: any): Promise<any> {
    // Placeholder for actual Serena MCP execution
    throw new Error('Serena MCP execution not implemented');
  }

  private async executeMCPRipgrep(params: any): Promise<any> {
    // Execute via mcp-ripgrep
    const { pattern, file, path: searchPath } = params;
    const { stdout } = await execAsync(
      `mcp-ripgrep search "${pattern}" "${file || searchPath}"`,
      { timeout: 10000 }
    );
    return JSON.parse(stdout);
  }

  private async executeNativeRipgrep(params: any): Promise<any> {
    const { pattern, file, path: searchPath } = params;
    const { stdout } = await execAsync(
      `rg --json "${pattern}" "${file || searchPath}"`,
      { timeout: 10000 }
    );
    
    // Parse ripgrep JSON output
    const results = stdout.split('\n')
      .filter(line => line.trim())
      .map(line => {
        try {
          return JSON.parse(line);
        } catch {
          return null;
        }
      })
      .filter(Boolean);
    
    return results;
  }

  private async executeGrep(params: any): Promise<any> {
    const { pattern, file, path: searchPath } = params;
    const { stdout } = await execAsync(
      `grep -n "${pattern}" "${file || searchPath}" | head -20`,
      { timeout: 10000 }
    );
    
    // Parse grep output
    const results = stdout.split('\n')
      .filter(line => line.trim())
      .map(line => {
        const match = line.match(/^(.+?):(\d+):(.*)$/);
        if (match) {
          return {
            file: match[1],
            line: parseInt(match[2]),
            text: match[3]
          };
        }
        return null;
      })
      .filter(Boolean);
    
    return results;
  }

  private async executeLanguageServer(params: any): Promise<any> {
    // Placeholder for LSP execution
    throw new Error('Language Server MCP execution not implemented');
  }

  private async executeASTGrep(params: any): Promise<any> {
    const { pattern, file } = params;
    const { stdout } = await execAsync(
      `ast-grep --pattern "${pattern}" "${file}"`,
      { timeout: 10000 }
    );
    return stdout;
  }

  /**
   * Get current health status of all tools
   */
  getHealthStatus(): Map<string, boolean> {
    return new Map(this.healthStatus);
  }

  /**
   * Force health check for a specific tool
   */
  async forceHealthCheck(toolName: string): Promise<boolean> {
    for (const [, chain] of this.toolChains) {
      const tool = chain.find(t => t.name === toolName);
      if (tool) {
        this.lastHealthCheck.delete(toolName); // Clear cache
        return this.isToolHealthy(tool);
      }
    }
    return false;
  }

  /**
   * Get recommended tool for an operation
   */
  async getRecommendedTool(operation: string): Promise<string | null> {
    const chain = this.toolChains.get(operation);
    if (!chain) return null;

    for (const tool of chain.sort((a, b) => a.priority - b.priority)) {
      if (await this.isToolHealthy(tool)) {
        return tool.name;
      }
    }

    return null;
  }
}