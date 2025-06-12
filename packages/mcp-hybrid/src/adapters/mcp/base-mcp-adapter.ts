/**
 * Base MCP Adapter
 * Provides common functionality for all MCP tool integrations
 */

import { spawn, ChildProcess } from 'child_process';
import * as path from 'path';
import * as fs from 'fs/promises';
import { EventEmitter } from 'events';
import {
  Tool,
  ToolResult,
  ToolFinding,
  AnalysisContext,
  ToolMetadata,
  ToolCapability,
  ToolRequirements,
  AgentRole
} from '../../core/interfaces';

export abstract class BaseMCPAdapter extends EventEmitter implements Tool {
  abstract readonly id: string;
  abstract readonly name: string;
  readonly type = 'mcp' as const;
  abstract readonly version: string;
  abstract readonly capabilities: ToolCapability[];
  abstract readonly requirements: ToolRequirements;
  
  protected mcpProcess?: ChildProcess;
  protected isInitialized = false;
  protected mcpServerCommand = 'npx';
  protected abstract mcpServerArgs: string[];
  
  constructor() {
    super();
  }
  
  /**
   * Check if tool can analyze given context
   */
  abstract canAnalyze(context: AnalysisContext): boolean;
  
  /**
   * Execute analysis - must be implemented by subclasses
   */
  abstract analyze(context: AnalysisContext): Promise<ToolResult>;
  
  /**
   * Get tool metadata
   */
  abstract getMetadata(): ToolMetadata;
  
  /**
   * Initialize MCP server if not already running
   */
  protected async initializeMCPServer(): Promise<void> {
    if (this.isInitialized && this.mcpProcess) {
      return;
    }
    
    return new Promise((resolve, reject) => {
      console.info(`Initializing MCP server for ${this.id}...`);
      
      // Start MCP server
      this.mcpProcess = spawn(this.mcpServerCommand, this.mcpServerArgs, {
        stdio: ['pipe', 'pipe', 'pipe'],
        env: {
          ...process.env,
          NODE_ENV: 'production'
        }
      });
      
      this.mcpProcess.on('error', (error) => {
        reject(new Error(`Failed to start ${this.name} MCP server: ${error.message}`));
      });
      
      // Handle server stderr for debugging
      if (this.mcpProcess.stderr) {
        this.mcpProcess.stderr.on('data', (data) => {
          console.error(`${this.id} MCP server error:`, data.toString());
        });
      }
      
      // Wait for server to be ready
      setTimeout(() => {
        this.isInitialized = true;
        console.info(`${this.id} MCP server initialized`);
        this.emit('initialized');
        resolve();
      }, 2000);
    });
  }
  
  /**
   * Execute MCP command via JSON-RPC
   */
  protected async executeMCPCommand<T = any>(command: {
    method: string;
    params?: any;
  }): Promise<T> {
    if (!this.mcpProcess || !this.isInitialized) {
      throw new Error(`${this.name} MCP server not initialized`);
    }
    
    // Store reference to avoid TypeScript flow analysis issues
    const process = this.mcpProcess;
    
    if (!process.stdin || !process.stdout) {
      throw new Error(`${this.name} MCP server streams not available`);
    }
    
    return new Promise((resolve, reject) => {
      const request = {
        jsonrpc: '2.0',
        method: command.method,
        params: command.params || {},
        id: Date.now()
      };
      
      // Handle response
      const handleResponse = (data: Buffer) => {
        try {
          const response = JSON.parse(data.toString());
          if (response.id === request.id) {
            if (response.error) {
              reject(new Error(response.error.message));
            } else {
              resolve(response.result);
            }
            if (process.stdout) {
              process.stdout.off('data', handleResponse);
            }
          }
        } catch (error) {
          // Partial data, wait for more
        }
      };
      
      // Add listener first
      if (process.stdout) {
        process.stdout.on('data', handleResponse);
      }
      
      // Then send command
      if (process.stdin) {
        process.stdin.write(JSON.stringify(request) + '\n');
      }
      
      // Timeout
      setTimeout(() => {
        if (process.stdout) {
          process.stdout.off('data', handleResponse);
        }
        reject(new Error(`${this.name} MCP command timeout`));
      }, this.requirements.timeout);
    });
  }
  
  /**
   * Create temporary directory for file analysis
   */
  protected async createTempDirectory(context: AnalysisContext): Promise<string> {
    const tempDir = `/tmp/${this.id}-${context.userContext.userId}-${Date.now()}`;
    await fs.mkdir(tempDir, { recursive: true });
    return tempDir;
  }
  
  /**
   * Write files to temporary directory
   */
  protected async writeFilesToTemp(
    files: Array<{ path: string; content: string }>,
    tempDir: string
  ): Promise<void> {
    for (const file of files) {
      const filePath = path.join(tempDir, file.path);
      await fs.mkdir(path.dirname(filePath), { recursive: true });
      await fs.writeFile(filePath, file.content);
    }
  }
  
  /**
   * Cleanup temporary directory
   */
  protected async cleanupTempDirectory(tempDir: string): Promise<void> {
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch (error) {
      console.warn(`Failed to cleanup temp directory ${tempDir}:`, error);
    }
  }
  
  /**
   * Map severity from tool-specific to standard
   */
  protected mapSeverity(toolSeverity: string | number): ToolFinding['severity'] {
    // Override in subclasses for tool-specific mapping
    const severityMap: Record<string, ToolFinding['severity']> = {
      'error': 'high',
      'warning': 'medium',
      'info': 'low',
      'hint': 'info',
      '2': 'high',
      '1': 'medium',
      '0': 'low'
    };
    
    return severityMap[toolSeverity.toString().toLowerCase()] || 'info';
  }
  
  /**
   * Common health check implementation
   */
  async healthCheck(): Promise<boolean> {
    try {
      // Try to initialize if not already done
      if (!this.isInitialized) {
        await this.initializeMCPServer();
      }
      
      // Send a simple health check command
      const result = await this.executeMCPCommand({
        method: 'health',
        params: {}
      }).catch(() => null);
      
      return result !== null;
    } catch {
      return false;
    }
  }
  
  /**
   * Cleanup MCP server process
   */
  async cleanup(): Promise<void> {
    if (this.mcpProcess) {
      console.info(`Shutting down ${this.id} MCP server...`);
      this.mcpProcess.kill();
      this.mcpProcess = undefined;
      this.isInitialized = false;
    }
  }
  
  /**
   * Filter files based on supported extensions
   */
  protected filterSupportedFiles(
    files: Array<{ path: string; content: string; changeType: string }>,
    supportedExtensions: string[]
  ): Array<{ path: string; content: string }> {
    return files
      .filter(file => {
        const ext = path.extname(file.path).toLowerCase();
        return supportedExtensions.includes(ext) && file.changeType !== 'deleted';
      })
      .map(({ path, content }) => ({ path, content }));
  }
  
  /**
   * Create standardized error result
   */
  protected createErrorResult(
    error: Error,
    startTime: number
  ): ToolResult {
    return {
      success: false,
      toolId: this.id,
      executionTime: Date.now() - startTime,
      error: {
        code: `${this.id.toUpperCase().replace(/-/g, '_')}_FAILED`,
        message: error.message,
        recoverable: true
      }
    };
  }
  
  /**
   * Create empty success result when no files to analyze
   */
  protected createEmptyResult(startTime: number): ToolResult {
    return {
      success: true,
      toolId: this.id,
      executionTime: Date.now() - startTime,
      findings: [],
      metrics: {
        filesAnalyzed: 0
      }
    };
  }
}
