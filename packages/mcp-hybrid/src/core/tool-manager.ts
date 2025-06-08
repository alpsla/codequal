/**
 * MCPToolManager - Server-side tool execution manager
 * Handles isolated execution environments and resource management
 */

import { spawn, ChildProcess } from 'child_process';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { 
  Tool,
  ToolResult,
  IsolatedWorkspace,
  MCPServerProcess,
  PRContext,
  AnalysisContext
} from './interfaces';

export class MCPToolManager {
  private persistentTools = new Map<string, MCPServerProcess>();
  private workspacesDir: string;
  private readonly WORKSPACE_TIMEOUT = 5 * 60 * 1000; // 5 minutes
  
  // Tools that benefit from persistent state
  private readonly PERSISTENT_TOOL_IDS = new Set([
    'eslint-mcp',
    'sonarqube',
    'semgrep-mcp'
  ]);
  
  // Tools that run on-demand
  private readonly ON_DEMAND_TOOL_IDS = new Set([
    'mcp-scan',
    'git-mcp',
    'mcp-docs-service'
  ]);
  
  constructor() {
    this.workspacesDir = path.join(os.tmpdir(), 'codequal-workspaces');
  }
  
  /**
   * Initialize the tool manager
   */
  async initialize(): Promise<void> {
    // Create workspaces directory
    await fs.mkdir(this.workspacesDir, { recursive: true });
    
    // Start persistent tools
    await this.initializePersistentTools();
    
    // Validate on-demand tools are available
    await this.validateOnDemandTools();
  }
  
  /**
   * Initialize persistent tools that benefit from warm state
   */
  private async initializePersistentTools(): Promise<void> {
    for (const toolId of this.PERSISTENT_TOOL_IDS) {
      try {
        if (this.shouldStartPersistentTool(toolId)) {
          const process = await this.startPersistentTool(toolId);
          this.persistentTools.set(toolId, process);
          console.info(`Started persistent tool: ${toolId}`);
        }
      } catch (error) {
        console.error(`Failed to start persistent tool ${toolId}:`, error);
      }
    }
  }
  
  /**
   * Check if a persistent tool should be started
   */
  private shouldStartPersistentTool(toolId: string): boolean {
    // Check environment variables for tool enablement
    const envKey = `ENABLE_${toolId.toUpperCase().replace('-', '_')}`;
    return process.env[envKey] !== 'false';
  }
  
  /**
   * Start a persistent tool process
   */
  private async startPersistentTool(toolId: string): Promise<MCPServerProcess> {
    let command: string;
    let args: string[] = [];
    let port: number | undefined;
    
    switch (toolId) {
      case 'eslint-mcp':
        command = 'npx';
        args = ['@eslint/mcp', '--server'];
        port = 3001;
        break;
        
      case 'sonarqube':
        // SonarQube might be running externally
        if (process.env.SONARQUBE_URL) {
          return {
            toolId,
            pid: -1, // External process
            startTime: new Date(),
            status: 'running',
            restart: async () => { /* no-op for external */ },
            stop: async () => { /* no-op for external */ }
          };
        }
        command = 'sonar-scanner';
        args = ['--server'];
        port = 9000;
        break;
        
      case 'semgrep-mcp':
        command = 'semgrep';
        args = ['--config=auto', '--server'];
        port = 3002;
        break;
        
      default:
        throw new Error(`Unknown persistent tool: ${toolId}`);
    }
    
    const childProcess = spawn(command, args, {
      stdio: 'pipe',
      env: {
        ...process.env,
        PORT: port?.toString()
      }
    });
    
    const mcpProcess: MCPServerProcess = {
      toolId,
      pid: childProcess.pid!,
      port,
      startTime: new Date(),
      status: 'running',
      restart: async () => {
        await this.restartPersistentTool(toolId);
      },
      stop: async () => {
        childProcess.kill();
      }
    };
    
    // Monitor process health
    childProcess.on('exit', (code) => {
      console.error(`Persistent tool ${toolId} exited with code ${code}`);
      mcpProcess.status = 'stopped';
      // Auto-restart if needed
      if (code !== 0) {
        setTimeout(() => this.restartPersistentTool(toolId), 5000);
      }
    });
    
    childProcess.on('error', (error) => {
      console.error(`Persistent tool ${toolId} error:`, error);
      mcpProcess.status = 'error';
    });
    
    return mcpProcess;
  }
  
  /**
   * Restart a persistent tool
   */
  private async restartPersistentTool(toolId: string): Promise<void> {
    const existing = this.persistentTools.get(toolId);
    if (existing) {
      await existing.stop();
      this.persistentTools.delete(toolId);
    }
    
    const newProcess = await this.startPersistentTool(toolId);
    this.persistentTools.set(toolId, newProcess);
  }
  
  /**
   * Validate on-demand tools are available
   */
  private async validateOnDemandTools(): Promise<void> {
    for (const toolId of this.ON_DEMAND_TOOL_IDS) {
      try {
        const available = await this.checkToolAvailability(toolId);
        if (!available) {
          console.warn(`On-demand tool ${toolId} is not available`);
        }
      } catch (error) {
        console.error(`Failed to validate tool ${toolId}:`, error);
      }
    }
  }
  
  /**
   * Check if a tool is available for execution
   */
  private async checkToolAvailability(toolId: string): Promise<boolean> {
    try {
      let command: string;
      
      switch (toolId) {
        case 'mcp-scan':
          command = 'npx mcp-scan --version';
          break;
        case 'git-mcp':
          command = 'uvx mcp-server-git --version';
          break;
        case 'mcp-docs-service':
          command = 'npm run mcp-docs-service -- --version';
          break;
        default:
          return false;
      }
      
      return new Promise((resolve) => {
        const child = spawn(command, [], { shell: true });
        child.on('exit', (code) => resolve(code === 0));
        child.on('error', () => resolve(false));
      });
    } catch {
      return false;
    }
  }
  
  /**
   * Execute a tool with PR context
   */
  async executeTool(
    tool: Tool,
    context: AnalysisContext
  ): Promise<ToolResult> {
    // Create isolated workspace for this execution
    const workspace = await this.createIsolatedWorkspace(
      context.userContext.userId,
      context.pr
    );
    
    try {
      let result: ToolResult;
      
      if (this.persistentTools.has(tool.id)) {
        result = await this.executePersistentTool(tool, context, workspace);
      } else {
        result = await this.executeOnDemandTool(tool, context, workspace);
      }
      
      return result;
    } finally {
      // Always cleanup workspace
      await workspace.cleanup();
    }
  }
  
  /**
   * Create an isolated workspace for tool execution
   */
  private async createIsolatedWorkspace(
    userId: string,
    pr: PRContext
  ): Promise<IsolatedWorkspace> {
    const workspaceId = `${userId}-${pr.prNumber}-${Date.now()}`;
    const workspacePath = path.join(this.workspacesDir, workspaceId);
    
    // Create workspace directory
    await fs.mkdir(workspacePath, { recursive: true });
    
    // Write PR files to workspace
    for (const file of pr.files) {
      if (file.changeType !== 'deleted') {
        const filePath = path.join(workspacePath, file.path);
        const fileDir = path.dirname(filePath);
        
        await fs.mkdir(fileDir, { recursive: true });
        await fs.writeFile(filePath, file.content);
      }
    }
    
    // Create workspace object
    const workspace: IsolatedWorkspace = {
      id: workspaceId,
      path: workspacePath,
      userId,
      limits: {
        cpu: '50%',
        memory: '1GB',
        timeout: this.WORKSPACE_TIMEOUT,
        diskSpace: '100MB'
      },
      cleanup: async () => {
        try {
          await fs.rm(workspacePath, { recursive: true, force: true });
        } catch (error) {
          console.error(`Failed to cleanup workspace ${workspaceId}:`, error);
        }
      }
    };
    
    // Set cleanup timeout
    setTimeout(() => workspace.cleanup(), this.WORKSPACE_TIMEOUT);
    
    return workspace;
  }
  
  /**
   * Execute a persistent tool
   */
  private async executePersistentTool(
    tool: Tool,
    context: AnalysisContext,
    workspace: IsolatedWorkspace
  ): Promise<ToolResult> {
    const process = this.persistentTools.get(tool.id);
    if (!process || process.status !== 'running') {
      throw new Error(`Persistent tool ${tool.id} is not running`);
    }
    
    // Execute tool using its server API
    // This is tool-specific implementation
    const startTime = Date.now();
    
    try {
      const result = await tool.analyze({
        ...context,
        // Override file paths to workspace paths
        pr: {
          ...context.pr,
          files: context.pr.files.map(file => ({
            ...file,
            path: path.join(workspace.path, file.path)
          }))
        }
      });
      
      return {
        ...result,
        executionTime: Date.now() - startTime
      };
    } catch (error: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
      return {
        success: false,
        toolId: tool.id,
        executionTime: Date.now() - startTime,
        error: {
          code: 'EXECUTION_ERROR',
          message: error.message,
          recoverable: true
        }
      };
    }
  }
  
  /**
   * Execute an on-demand tool
   */
  private async executeOnDemandTool(
    tool: Tool,
    context: AnalysisContext,
    workspace: IsolatedWorkspace
  ): Promise<ToolResult> {
    const startTime = Date.now();
    
    try {
      // Execute tool in workspace context
      const result = await tool.analyze({
        ...context,
        // Override file paths to workspace paths
        pr: {
          ...context.pr,
          files: context.pr.files.map(file => ({
            ...file,
            path: path.join(workspace.path, file.path)
          }))
        }
      });
      
      return {
        ...result,
        executionTime: Date.now() - startTime
      };
    } catch (error: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
      return {
        success: false,
        toolId: tool.id,
        executionTime: Date.now() - startTime,
        error: {
          code: 'EXECUTION_ERROR',
          message: error.message,
          recoverable: true
        }
      };
    }
  }
  
  /**
   * Get status of all tools
   */
  getToolStatuses(): Map<string, {
    available: boolean;
    type: 'persistent' | 'on-demand';
    status?: string;
  }> {
    const statuses = new Map();
    
    // Check persistent tools
    for (const [toolId, process] of this.persistentTools) {
      statuses.set(toolId, {
        available: process.status === 'running',
        type: 'persistent',
        status: process.status
      });
    }
    
    // Check on-demand tools
    for (const toolId of this.ON_DEMAND_TOOL_IDS) {
      statuses.set(toolId, {
        available: true, // Assume available if validated during init
        type: 'on-demand'
      });
    }
    
    return statuses;
  }
  
  /**
   * Shutdown all persistent tools
   */
  async shutdown(): Promise<void> {
    for (const [toolId, process] of this.persistentTools) {
      try {
        await process.stop();
        console.info(`Stopped persistent tool: ${toolId}`);
      } catch (error) {
        console.error(`Failed to stop tool ${toolId}:`, error);
      }
    }
    
    this.persistentTools.clear();
  }
}

// Export singleton instance
export const toolManager = new MCPToolManager();
