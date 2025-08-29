#!/usr/bin/env node
import { exec } from 'child_process';
import { promisify } from 'util';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { 
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool
} from '@modelcontextprotocol/sdk/types.js';

const execAsync = promisify(exec);

// Available security tools
const SECURITY_TOOLS: Tool[] = [
  {
    name: 'npm-audit',
    description: 'Run npm audit to check for dependency vulnerabilities',
    inputSchema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Path to package.json' }
      }
    }
  },
  {
    name: 'semgrep',
    description: 'Run Semgrep for SAST analysis',
    inputSchema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Path to analyze' },
        rules: { type: 'string', description: 'Semgrep rules to use' }
      }
    }
  },
  {
    name: 'bandit',
    description: 'Run Bandit for Python security analysis',
    inputSchema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Path to Python code' }
      }
    }
  }
];

class DevSecOpsMCPServer {
  private server: Server;

  constructor() {
    this.server = new Server(
      {
        name: 'devsecops-mcp',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupHandlers();
  }

  private setupHandlers() {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: SECURITY_TOOLS,
    }));

    // Handle tool execution
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;
      
      try {
        switch (name) {
          case 'npm-audit':
            return await this.runNpmAudit(args?.path as string);
          
          case 'semgrep':
            return await this.runSemgrep(
              args?.path as string,
              args?.rules as string
            );
          
          case 'bandit':
            return await this.runBandit(args?.path as string);
          
          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error executing ${name}: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    });
  }

  private async runNpmAudit(path: string = '.') {
    try {
      const { stdout, stderr } = await execAsync(
        `cd ${path} && npm audit --json`,
        { timeout: 30000 }
      );
      
      const result = JSON.parse(stdout);
      const summary = `Found ${result.metadata?.vulnerabilities?.total || 0} vulnerabilities`;
      
      return {
        content: [
          {
            type: 'text',
            text: summary,
          },
        ],
      };
    } catch (error) {
      // npm audit returns non-zero exit code when vulnerabilities found
      // Parse the output anyway
      if (error instanceof Error && 'stdout' in error) {
        const stdout = (error as any).stdout;
        try {
          const result = JSON.parse(stdout);
          const vulns = result.metadata?.vulnerabilities || {};
          const summary = `Vulnerabilities: Critical: ${vulns.critical || 0}, High: ${vulns.high || 0}, Medium: ${vulns.moderate || 0}, Low: ${vulns.low || 0}`;
          
          return {
            content: [
              {
                type: 'text',
                text: summary,
              },
            ],
          };
        } catch {
          // Fallback
        }
      }
      throw error;
    }
  }

  private async runSemgrep(path: string = '.', rules: string = 'auto') {
    const { stdout } = await execAsync(
      `semgrep --config=${rules} ${path} --json`,
      { timeout: 60000 }
    );
    
    const result = JSON.parse(stdout);
    const findings = result.results?.length || 0;
    
    return {
      content: [
        {
          type: 'text',
          text: `Semgrep found ${findings} issues`,
        },
      ],
    };
  }

  private async runBandit(path: string = '.') {
    const { stdout } = await execAsync(
      `bandit -r ${path} -f json`,
      { timeout: 60000 }
    );
    
    const result = JSON.parse(stdout);
    const issues = result.results?.length || 0;
    
    return {
      content: [
        {
          type: 'text',
          text: `Bandit found ${issues} security issues`,
        },
      ],
    };
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('DevSecOps MCP Server running');
  }
}

const server = new DevSecOpsMCPServer();
server.run().catch(console.error);