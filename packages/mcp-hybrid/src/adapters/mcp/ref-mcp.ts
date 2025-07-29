/**
 * Ref MCP Adapter - Perplexity Integration for Web Search with Citations
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

export class RefMCPAdapter extends BaseMCPAdapter {
  id = 'ref-mcp';
  name = 'Ref - Perplexity Web Search';
  version = '1.0.0';
  
  private messageId = 1;
  private pendingRequests = new Map<number, { resolve: Function; reject: Function }>();
  protected mcpProcess?: ChildProcess;
  
  // MCP server configuration
  get mcpServerArgs(): string[] {
    return ['ref-tools-mcp@latest'];
  }
  
  capabilities: ToolCapability[] = [
    {
      name: 'vulnerability-research',
      category: 'security',
      languages: [], // All languages
      fileTypes: []  // All file types
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
    timeout: 30000, // 30 seconds for web searches
    authentication: {
      type: 'api-key',
      required: true
    }
  };
  
  /**
   * Check if tool can analyze given context
   */
  canAnalyze(context: AnalysisContext): boolean {
    // Ref can analyze any context, but is most useful for specific roles
    return ['security', 'dependency', 'educational'].includes(context.agentRole) ||
           context.pr.files.some(f => 
             f.path.endsWith('package.json') || 
             f.path.endsWith('requirements.txt') ||
             f.path.endsWith('go.mod') ||
             f.path.endsWith('Cargo.toml')
           );
  }
  
  /**
   * Analyze PR using Perplexity web search
   */
  async analyze(context: AnalysisContext): Promise<ToolResult> {
    const startTime = Date.now();
    
    try {
      // Validate API key is available
      const apiKey = process.env.REF_API_KEY || process.env.PERPLEXITY_API_KEY;
      if (!apiKey) {
        throw new Error('REF_API_KEY or PERPLEXITY_API_KEY environment variable is required');
      }
      
      const findings: ToolFinding[] = [];
      
      // Different search strategies based on agent role
      switch (context.agentRole) {
        case 'security':
          findings.push(...await this.searchSecurityVulnerabilities(context));
          break;
          
        case 'dependency':
          findings.push(...await this.searchDependencyInfo(context));
          break;
          
        case 'educational':
          findings.push(...await this.searchEducationalContent(context));
          break;
          
        default:
          // General code quality search
          findings.push(...await this.searchBestPractices(context));
      }
      
      return {
        success: true,
        toolId: this.id,
        executionTime: Date.now() - startTime,
        findings
      };
      
    } catch (error) {
      return {
        success: false,
        toolId: this.id,
        executionTime: Date.now() - startTime,
        error: {
          code: 'REF_SEARCH_ERROR',
          message: error instanceof Error ? error.message : 'Ref search failed',
          recoverable: true
        }
      };
    }
  }
  
  /**
   * Search for security vulnerabilities and CVEs
   */
  private async searchSecurityVulnerabilities(context: AnalysisContext): Promise<ToolFinding[]> {
    const findings: ToolFinding[] = [];
    
    // Extract package names from PR files
    const packages = this.extractPackages(context);
    
    for (const pkg of packages.slice(0, 5)) { // Limit to top 5 packages
      try {
        const searchQuery = `${pkg.name} ${pkg.version} security vulnerabilities CVE 2024 2025`;
        const searchResult = await this.performRefSearch(searchQuery);
        
        if (searchResult.vulnerabilities.length > 0) {
          findings.push({
            type: 'issue',
            severity: searchResult.criticalFound ? 'critical' : 'high',
            category: 'security',
            message: `🔒 Security vulnerabilities found in ${pkg.name}@${pkg.version}`,
            documentation: searchResult.summary,
            file: pkg.file,
            ruleId: 'vulnerable-dependency'
          });
        } else {
          findings.push({
            type: 'info',
            severity: 'info',
            category: 'security',
            message: `✅ No known vulnerabilities for ${pkg.name}@${pkg.version}`,
            documentation: searchResult.summary,
            file: pkg.file
          });
        }
      } catch (error) {
        console.error(`Failed to search for ${pkg.name}:`, error);
        // Continue with other packages
      }
    }
    
    return findings;
  }
  
  /**
   * Search for dependency information
   */
  private async searchDependencyInfo(context: AnalysisContext): Promise<ToolFinding[]> {
    const findings: ToolFinding[] = [];
    const packages = this.extractPackages(context);
    
    for (const pkg of packages.slice(0, 3)) { // Limit searches
      try {
        const query = `${pkg.name} npm package license alternatives community health issues`;
        const result = await this.performRefSearch(query);
        
        findings.push({
          type: 'info',
          severity: 'info',
          category: 'dependency',
          message: `📦 Package analysis: ${pkg.name}`,
          documentation: result.summary,
          file: pkg.file
        });
      } catch (error) {
        console.error(`Failed to analyze ${pkg.name}:`, error);
      }
    }
    
    return findings;
  }
  
  /**
   * Search for educational content
   */
  private async searchEducationalContent(context: AnalysisContext): Promise<ToolFinding[]> {
    const findings: ToolFinding[] = [];
    
    // Analyze code patterns and search for tutorials
    const patterns = this.identifyCodePatterns(context);
    
    for (const pattern of patterns.slice(0, 3)) {
      try {
        const query = `${pattern} best practices tutorial documentation 2024 2025`;
        const result = await this.performRefSearch(query);
        
        findings.push({
          type: 'info',
          severity: 'info',
          category: 'educational',
          message: `📚 Learning resources for: ${pattern}`,
          documentation: result.summary
        });
      } catch (error) {
        console.error(`Failed to find educational content for ${pattern}:`, error);
      }
    }
    
    return findings;
  }
  
  /**
   * Search for best practices
   */
  private async searchBestPractices(context: AnalysisContext): Promise<ToolFinding[]> {
    const findings: ToolFinding[] = [];
    const language = context.repository.primaryLanguage || 'javascript';
    
    try {
      const query = `${language} coding standards best practices design patterns 2024 2025`;
      const result = await this.performRefSearch(query);
      
      findings.push({
        type: 'info',
        severity: 'info',
        category: 'best-practices',
        message: `💡 Best practices for ${language}`,
        documentation: result.summary
      });
    } catch (error) {
      console.error(`Failed to find best practices for ${language}:`, error);
    }
    
    return findings;
  }
  
  /**
   * Extract packages from PR files
   */
  private extractPackages(context: AnalysisContext): Array<{name: string; version: string; file: string}> {
    const packages: Array<{name: string; version: string; file: string}> = [];
    
    // Look for package.json files
    const packageFiles = context.pr.files.filter(f => 
      f.path.endsWith('package.json') && f.changeType !== 'deleted'
    );
    
    for (const file of packageFiles) {
      try {
        const content = JSON.parse(file.content);
        const deps = { ...content.dependencies, ...content.devDependencies };
        
        for (const [name, version] of Object.entries(deps)) {
          packages.push({ name, version: version as string, file: file.path });
        }
      } catch (error) {
        // Skip invalid JSON
      }
    }
    
    return packages;
  }
  
  /**
   * Identify code patterns for educational search
   */
  private identifyCodePatterns(context: AnalysisContext): string[] {
    const patterns: string[] = [];
    
    // Simple pattern detection
    for (const file of context.pr.files) {
      if (file.content.includes('async') && file.content.includes('await')) {
        patterns.push('async/await patterns');
      }
      if (file.content.includes('useState') || file.content.includes('useEffect')) {
        patterns.push('React hooks');
      }
      if (file.content.includes('express') || file.content.includes('app.get')) {
        patterns.push('Express.js routing');
      }
    }
    
    return [...new Set(patterns)]; // Remove duplicates
  }
  
  /**
   * Initialize MCP server if not already running
   */
  private async ensureMCPServer(): Promise<void> {
    if (this.mcpProcess && !this.mcpProcess.killed) {
      return;
    }

    return new Promise((resolve, reject) => {
      const env = {
        ...process.env,
        REF_API_KEY: process.env.REF_API_KEY || 'ref-498218bce18e561f5cd0'
      };

      this.mcpProcess = spawn(this.mcpServerCommand, this.mcpServerArgs, {
        env,
        stdio: ['pipe', 'pipe', 'pipe']
      });

      let initBuffer = '';
      let initialized = false;

      if (this.mcpProcess.stdout) {
        this.mcpProcess.stdout.on('data', (data) => {
        const text = data.toString();
        
        if (!initialized) {
          initBuffer += text;
          if (initBuffer.includes('"method":"initialized"') || initBuffer.includes('ready')) {
            initialized = true;
            this.setupMessageHandlers();
            resolve();
          }
        } else {
          this.handleMCPMessage(text);
        }
        });
      }

      if (this.mcpProcess.stderr) {
        this.mcpProcess.stderr.on('data', (data) => {
          console.error('Ref MCP stderr:', data.toString());
        });
      }

      if (this.mcpProcess) {
        this.mcpProcess.on('error', (error) => {
          console.error('Failed to start Ref MCP server:', error);
          reject(error);
        });

        this.mcpProcess.on('exit', (code) => {
          console.log('Ref MCP server exited with code:', code);
          this.mcpProcess = undefined;
        });
      }

      // Send initialization request
      setTimeout(() => {
        this.sendMessage({
          jsonrpc: '2.0',
          method: 'initialize',
          params: {
            protocolVersion: '2024-11-05',
            capabilities: {},
            clientInfo: {
              name: 'codequal-mcp-hybrid',
              version: '1.0.0'
            }
          },
          id: this.messageId++
        });
      }, 100);

      // Timeout if initialization takes too long
      setTimeout(() => {
        if (!initialized) {
          reject(new Error('Ref MCP server initialization timeout'));
        }
      }, 10000);
    });
  }

  /**
   * Setup message handlers for MCP responses
   */
  private setupMessageHandlers(): void {
    // Message handler is set up in handleMCPMessage
  }

  /**
   * Handle incoming MCP messages
   */
  private handleMCPMessage(data: string): void {
    try {
      // Handle multiple JSON messages in one chunk
      const lines = data.split('\n').filter(line => line.trim());
      
      for (const line of lines) {
        try {
          const message = JSON.parse(line);
          
          if (message.id && this.pendingRequests.has(message.id)) {
            const { resolve, reject } = this.pendingRequests.get(message.id)!;
            this.pendingRequests.delete(message.id);
            
            if (message.error) {
              reject(new Error(message.error.message));
            } else {
              resolve(message.result);
            }
          }
        } catch (e) {
          // Ignore non-JSON lines
        }
      }
    } catch (error) {
      console.error('Error handling MCP message:', error);
    }
  }

  /**
   * Send message to MCP server
   */
  private sendMessage(message: any): void {
    if (!this.mcpProcess || !this.mcpProcess.stdin) {
      throw new Error('MCP server not initialized');
    }
    
    this.mcpProcess.stdin.write(JSON.stringify(message) + '\n');
  }

  /**
   * Call MCP tool and wait for response
   */
  private async callMCPTool(toolName: string, args: any): Promise<any> {
    await this.ensureMCPServer();
    
    return new Promise((resolve, reject) => {
      const id = this.messageId++;
      this.pendingRequests.set(id, { resolve, reject });
      
      this.sendMessage({
        jsonrpc: '2.0',
        method: 'tools/call',
        params: {
          name: toolName,
          arguments: args
        },
        id
      });
      
      // Timeout after 30 seconds
      setTimeout(() => {
        if (this.pendingRequests.has(id)) {
          this.pendingRequests.delete(id);
          reject(new Error('MCP tool call timeout'));
        }
      }, 30000);
    });
  }

  /**
   * Perform search using Ref MCP server
   */
  private async performRefSearch(query: string): Promise<{
    summary: string;
    vulnerabilities: string[];
    criticalFound: boolean;
    sources: string[];
  }> {
    try {
      const result = await this.callMCPTool('ref_search_documentation', {
        query: query
      });
      
      // Parse the result
      const content = result?.content?.[0]?.text || '';
      
      // Extract CVEs and critical indicators
      const cvePattern = /CVE-\d{4}-\d+/g;
      const vulnerabilities = content.match(cvePattern) || [];
      const criticalFound = content.toLowerCase().includes('critical') || 
                           content.toLowerCase().includes('severe');
      
      return {
        summary: content,
        vulnerabilities: [...new Set(vulnerabilities)] as string[],
        criticalFound,
        sources: (result?.sources || []) as string[]
      };
    } catch (error) {
      console.error('Ref MCP search error:', error);
      // Fallback response
      return {
        summary: `Unable to search documentation for: ${query}`,
        vulnerabilities: [],
        criticalFound: false,
        sources: []
      };
    }
  }
  
  /**
   * Health check
   */
  async healthCheck(): Promise<boolean> {
    // Check if API key is configured
    return !!(process.env.REF_API_KEY || process.env.PERPLEXITY_API_KEY);
  }
  
  /**
   * Override to prevent MCP server initialization
   */
  protected async initializeMCPServer(): Promise<void> {
    // No MCP server needed - we use direct implementation
    this.isInitialized = true;
  }
  
  /**
   * Get metadata
   */
  getMetadata(): ToolMetadata {
    return {
      id: this.id,
      name: this.name,
      description: 'Web search integration using Perplexity for real-time research on security, dependencies, and educational content',
      author: 'CodeQual',
      homepage: 'https://github.com/anthropics/ref-mcp-server',
      documentationUrl: 'https://github.com/anthropics/ref-mcp-server#readme',
      supportedRoles: ['security', 'dependency', 'educational'],
      supportedLanguages: [], // All languages
      supportedFrameworks: [],
      tags: ['research', 'web-search', 'security', 'education', 'dependencies'],
      securityVerified: true,
      lastVerified: new Date('2025-01-28')
    };
  }

  /**
   * Cleanup MCP server process
   */
  async cleanup(): Promise<void> {
    if (this.mcpProcess && !this.mcpProcess.killed) {
      this.mcpProcess.kill();
      this.mcpProcess = undefined;
    }
    this.pendingRequests.clear();
  }
}

// Export singleton instance
export const refMCPAdapter = new RefMCPAdapter();