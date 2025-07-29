/**
 * Ref MCP Adapter - Full MCP Protocol Implementation
 * Provides real-time research capabilities for security, dependencies, and education
 */

import { BaseMCPAdapter } from './base-mcp-adapter';
import { 
  ToolCapability, 
  AnalysisContext, 
  ToolResult, 
  ToolFinding,
  ToolMetadata,
  ToolRequirements
} from '../../core/interfaces';
import { spawn, ChildProcess } from 'child_process';

interface MCPRequest {
  jsonrpc: '2.0';
  method: string;
  params?: any;
  id?: number;
}

interface MCPResponse {
  jsonrpc: '2.0';
  result?: any;
  error?: {
    code: number;
    message: string;
    data?: any;
  };
  id: number;
}

interface MCPNotification {
  jsonrpc: '2.0';
  method: string;
  params?: any;
}

interface MCPTool {
  name: string;
  description?: string;
  inputSchema?: any;
}

export class RefMCPFullAdapter extends BaseMCPAdapter {
  id = 'ref-mcp';
  name = 'Ref - Documentation Search (Full MCP)';
  version = '2.0.0';
  
  private messageId = 1;
  private pendingRequests = new Map<number, { resolve: Function; reject: Function; timeout: NodeJS.Timeout }>();
  protected mcpProcess?: ChildProcess;
  private serverCapabilities?: any;
  private availableTools: MCPTool[] = [];
  private initializationPromise?: Promise<void>;
  protected isInitialized = false;
  private messageBuffer = '';
  
  // MCP server configuration
  get mcpServerArgs(): string[] {
    return ['ref-tools-mcp@latest'];
  }
  
  capabilities: ToolCapability[] = [
    {
      name: 'vulnerability-research',
      category: 'security',
      languages: [],
      fileTypes: []
    },
    {
      name: 'package-research',
      category: 'security',
      languages: [],
      fileTypes: ['package.json', 'requirements.txt', 'go.mod', 'Cargo.toml']
    },
    {
      name: 'documentation-search',
      category: 'documentation',
      languages: [],
      fileTypes: []
    }
  ];
  
  requirements: ToolRequirements = {
    executionMode: 'on-demand',
    timeout: 30000,
    authentication: {
      required: true,
      type: 'api-key'
    }
  };
  
  canAnalyze(context: AnalysisContext): boolean {
    return context.agentRole === 'security' || 
           context.agentRole === 'dependency' ||
           context.agentRole === 'educational';
  }
  
  async analyze(context: AnalysisContext): Promise<ToolResult> {
    const startTime = Date.now();
    
    try {
      // Ensure MCP server is initialized
      await this.ensureMCPServer();
      
      const findings: ToolFinding[] = [];
      
      // Analyze based on role
      switch (context.agentRole) {
        case 'security':
          findings.push(...await this.analyzeSecurityConcerns(context));
          break;
        case 'dependency':
          findings.push(...await this.analyzeDependencies(context));
          break;
        case 'educational':
          findings.push(...await this.findEducationalResources(context));
          break;
      }
      
      return {
        success: true,
        toolId: this.id,
        executionTime: Date.now() - startTime,
        findings,
        metrics: {
          queriesPerformed: findings.length,
          sourcesConsulted: findings.filter(f => f.documentation).length
        }
      };
    } catch (error) {
      return {
        success: false,
        toolId: this.id,
        executionTime: Date.now() - startTime,
        error: {
          code: 'REF_MCP_ERROR',
          message: error instanceof Error ? error.message : String(error),
          recoverable: true
        }
      };
    }
  }
  
  /**
   * Initialize MCP server with full protocol support
   */
  private async ensureMCPServer(): Promise<void> {
    if (this.initializationPromise) {
      return this.initializationPromise;
    }
    
    if (this.isInitialized && this.mcpProcess && !this.mcpProcess.killed) {
      return;
    }
    
    this.initializationPromise = this.initializeMCPServer();
    return this.initializationPromise;
  }
  
  /**
   * Initialize MCP server with full handshake
   */
  protected async initializeMCPServer(): Promise<void> {
    return new Promise((resolve, reject) => {
      const env = {
        ...process.env,
        REF_API_KEY: process.env.REF_API_KEY || 'ref-498218bce18e561f5cd0'
      };
      
      this.mcpProcess = spawn(this.mcpServerCommand, this.mcpServerArgs, {
        env,
        stdio: ['pipe', 'pipe', 'pipe']
      });
      
      // Set up message handling
      if (this.mcpProcess.stdout) {
        this.mcpProcess.stdout.on('data', (data) => {
          this.messageBuffer += data.toString();
          this.processMessageBuffer();
        });
      }
      
      if (this.mcpProcess.stderr) {
        this.mcpProcess.stderr.on('data', (data) => {
          const message = data.toString();
          if (process.env.DEBUG_MCP) {
            console.error('[Ref MCP stderr]', message);
          }
        });
      }
      
      this.mcpProcess.on('error', (error) => {
        console.error('Failed to start Ref MCP server:', error);
        this.cleanup();
        reject(error);
      });
      
      this.mcpProcess.on('exit', (code) => {
        if (process.env.DEBUG_MCP) {
          console.log('Ref MCP server exited with code:', code);
        }
        this.cleanup();
      });
      
      // Perform initialization handshake
      setTimeout(async () => {
        try {
          await this.performHandshake();
          this.isInitialized = true;
          resolve();
        } catch (error) {
          this.cleanup();
          reject(error);
        }
      }, 100);
    });
  }
  
  /**
   * Process buffered messages
   */
  private processMessageBuffer(): void {
    const lines = this.messageBuffer.split('\n');
    this.messageBuffer = lines.pop() || '';
    
    for (const line of lines) {
      if (line.trim()) {
        this.handleMCPMessage(line);
      }
    }
  }
  
  /**
   * Perform MCP initialization handshake
   */
  private async performHandshake(): Promise<void> {
    // 1. Initialize connection
    const initResult = await this.sendRequest('initialize', {
      protocolVersion: '2024-11-05',
      capabilities: {
        tools: {},
        resources: {},
        prompts: {},
        logging: {}
      },
      clientInfo: {
        name: 'codequal-mcp-hybrid',
        version: '1.0.0'
      }
    });
    
    this.serverCapabilities = initResult.capabilities;
    
    // 2. Send initialized notification
    await this.sendNotification('initialized', {});
    
    // 3. Discover available tools
    try {
      const toolsResult = await this.sendRequest('tools/list', {});
      this.availableTools = toolsResult.tools || [];
      
      if (process.env.DEBUG_MCP) {
        console.log('[Ref MCP] Available tools:', this.availableTools.map(t => t.name));
      }
    } catch (error) {
      console.warn('Failed to list tools:', error);
    }
  }
  
  /**
   * Handle incoming MCP messages
   */
  private handleMCPMessage(line: string): void {
    try {
      const message = JSON.parse(line);
      
      if (process.env.DEBUG_MCP) {
        console.log('[Ref MCP] Received:', JSON.stringify(message).substring(0, 200));
      }
      
      // Handle responses to our requests
      if (message.id !== undefined && this.pendingRequests.has(message.id)) {
        const { resolve, reject, timeout } = this.pendingRequests.get(message.id)!;
        clearTimeout(timeout);
        this.pendingRequests.delete(message.id);
        
        if (message.error) {
          reject(new Error(`MCP Error ${message.error.code}: ${message.error.message}`));
        } else {
          resolve(message.result);
        }
      }
      // Handle server notifications
      else if (message.method) {
        this.handleServerNotification(message);
      }
    } catch (error) {
      if (process.env.DEBUG_MCP) {
        console.error('[Ref MCP] Failed to parse message:', line);
      }
    }
  }
  
  /**
   * Handle server-initiated notifications
   */
  private handleServerNotification(message: MCPNotification): void {
    switch (message.method) {
      case 'notifications/progress':
        this.emit('progress', message.params);
        break;
        
      case 'log':
        if (process.env.DEBUG_MCP) {
          const { level, message: logMessage } = message.params;
          console.log(`[Ref MCP ${level}]`, logMessage);
        }
        break;
        
      case 'notifications/resources/updated':
        // Handle resource updates if needed
        break;
        
      default:
        if (process.env.DEBUG_MCP) {
          console.log('[Ref MCP] Unknown notification:', message.method);
        }
    }
  }
  
  /**
   * Send a request and wait for response
   */
  private async sendRequest(method: string, params?: any): Promise<any> {
    if (!this.mcpProcess || !this.mcpProcess.stdin) {
      throw new Error('MCP server not initialized');
    }
    
    return new Promise((resolve, reject) => {
      const id = this.messageId++;
      
      const timeout = setTimeout(() => {
        this.pendingRequests.delete(id);
        reject(new Error(`MCP request timeout: ${method}`));
      }, 30000);
      
      this.pendingRequests.set(id, { resolve, reject, timeout });
      
      const request: MCPRequest = {
        jsonrpc: '2.0',
        method,
        params,
        id
      };
      
      if (process.env.DEBUG_MCP) {
        console.log('[Ref MCP] Sending:', JSON.stringify(request));
      }
      
      this.mcpProcess!.stdin!.write(JSON.stringify(request) + '\n');
    });
  }
  
  /**
   * Send a notification (no response expected)
   */
  private async sendNotification(method: string, params?: any): Promise<void> {
    if (!this.mcpProcess || !this.mcpProcess.stdin) {
      throw new Error('MCP server not initialized');
    }
    
    const notification: MCPNotification = {
      jsonrpc: '2.0',
      method,
      params
    };
    
    if (process.env.DEBUG_MCP) {
      console.log('[Ref MCP] Notifying:', JSON.stringify(notification));
    }
    
    this.mcpProcess!.stdin!.write(JSON.stringify(notification) + '\n');
  }
  
  /**
   * Send message helper (for backwards compatibility)
   */
  private sendMessage(message: any): void {
    if (!this.mcpProcess || !this.mcpProcess.stdin) {
      throw new Error('MCP server not initialized');
    }
    
    this.mcpProcess.stdin.write(JSON.stringify(message) + '\n');
  }
  
  /**
   * Call MCP tool
   */
  private async callMCPTool(toolName: string, args: any): Promise<any> {
    // Check if tool is available
    const tool = this.availableTools.find(t => t.name === toolName);
    if (!tool && this.availableTools.length > 0) {
      console.warn(`Tool '${toolName}' not found. Available tools:`, this.availableTools.map(t => t.name));
    }
    
    const result = await this.sendRequest('tools/call', {
      name: toolName,
      arguments: args
    });
    
    return this.processToolResult(result);
  }
  
  /**
   * Process tool call result
   */
  private processToolResult(result: any): any {
    if (!result.content) {
      return result;
    }
    
    // Handle different content types
    const processedContent: any = {
      text: '',
      images: [],
      resources: []
    };
    
    for (const item of result.content) {
      switch (item.type) {
        case 'text':
          processedContent.text += item.text;
          break;
        case 'image':
          processedContent.images.push(item);
          break;
        case 'resource':
          processedContent.resources.push(item);
          break;
      }
    }
    
    return processedContent;
  }
  
  /**
   * Analyze security concerns
   */
  private async analyzeSecurityConcerns(context: AnalysisContext): Promise<ToolFinding[]> {
    const findings: ToolFinding[] = [];
    
    // Extract packages from files
    for (const file of context.pr.files) {
      if (file.path.endsWith('package.json') && file.changeType !== 'deleted') {
        try {
          const packageData = JSON.parse(file.content);
          const deps = { ...packageData.dependencies, ...packageData.devDependencies };
          
          for (const [pkg, version] of Object.entries(deps)) {
            const result = await this.searchPackageVulnerabilities(pkg, version as string);
            findings.push(...result);
          }
        } catch (error) {
          console.error('Error parsing package.json:', error);
        }
      }
    }
    
    return findings;
  }
  
  /**
   * Search for package vulnerabilities
   */
  private async searchPackageVulnerabilities(pkg: string, version: string): Promise<ToolFinding[]> {
    const findings: ToolFinding[] = [];
    
    try {
      const result = await this.callMCPTool('ref_search_documentation', {
        query: `${pkg} ${version} security vulnerabilities CVE 2024 2025`
      });
      
      const content = result.text || '';
      
      // Extract CVEs
      const cvePattern = /CVE-\d{4}-\d+/g;
      const vulnerabilities = content.match(cvePattern) || [];
      const criticalFound = content.toLowerCase().includes('critical') || 
                           content.toLowerCase().includes('severe');
      
      if (vulnerabilities.length > 0 || criticalFound) {
        findings.push({
          type: 'issue',
          severity: criticalFound ? 'critical' : 'high',
          category: 'security',
          message: `🔍 ${vulnerabilities.length} vulnerabilities found for ${pkg}@${version}`,
          documentation: content,
          file: 'package.json'
        });
      }
    } catch (error) {
      // Log but don't crash
      console.error(`Failed to search vulnerabilities for ${pkg}:`, error);
    }
    
    return findings;
  }
  
  /**
   * Analyze dependencies
   */
  private async analyzeDependencies(context: AnalysisContext): Promise<ToolFinding[]> {
    const findings: ToolFinding[] = [];
    
    for (const file of context.pr.files) {
      if (file.path.endsWith('package.json') && file.changeType !== 'deleted') {
        try {
          const result = await this.callMCPTool('ref_search_documentation', {
            query: `npm package best practices dependencies security 2024`
          });
          
          findings.push({
            type: 'info',
            severity: 'info',
            category: 'dependency',
            message: 'Dependency best practices reference',
            documentation: result.text || 'No additional information available',
            file: file.path
          });
        } catch (error) {
          console.error('Error searching dependency info:', error);
        }
      }
    }
    
    return findings;
  }
  
  /**
   * Find educational resources
   */
  private async findEducationalResources(context: AnalysisContext): Promise<ToolFinding[]> {
    const findings: ToolFinding[] = [];
    
    try {
      const languages = context.repository.languages.join(' ');
      const result = await this.callMCPTool('ref_search_documentation', {
        query: `${languages} best practices tutorials documentation 2024`
      });
      
      findings.push({
        type: 'info',
        severity: 'info',
        category: 'educational',
        message: `Educational resources for ${languages}`,
        documentation: result.text || 'No resources found'
      });
    } catch (error) {
      console.error('Error finding educational resources:', error);
    }
    
    return findings;
  }
  
  getMetadata(): ToolMetadata {
    return {
      id: this.id,
      name: this.name,
      description: 'Full MCP implementation for Ref documentation search',
      author: 'CodeQual',
      supportedRoles: ['security', 'dependency', 'educational'],
      supportedLanguages: [],
      supportedFrameworks: [],
      tags: ['research', 'web-search', 'security', 'education', 'mcp-full'],
      securityVerified: true,
      lastVerified: new Date('2025-01-28')
    };
  }
  
  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    // Clear pending requests
    for (const [id, { reject, timeout }] of this.pendingRequests) {
      clearTimeout(timeout);
      reject(new Error('Cleanup: Request cancelled'));
    }
    this.pendingRequests.clear();
    
    // Kill process
    if (this.mcpProcess && !this.mcpProcess.killed) {
      this.mcpProcess.kill();
    }
    
    this.mcpProcess = undefined;
    this.isInitialized = false;
    this.initializationPromise = undefined;
    this.messageBuffer = '';
  }
}

// Export singleton instance
export const refMCPFullAdapter = new RefMCPFullAdapter();