#!/usr/bin/env node
import { exec } from 'child_process';
import { promisify } from 'util';
import { writeFileSync, readFileSync } from 'fs';
import { join } from 'path';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { 
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool
} from '@modelcontextprotocol/sdk/types.js';

const execAsync = promisify(exec);

// K6 Performance Testing Tools
const K6_TOOLS: Tool[] = [
  {
    name: 'k6-run',
    description: 'Run a K6 performance test script',
    inputSchema: {
      type: 'object',
      properties: {
        script: { type: 'string', description: 'Path to K6 test script' },
        vus: { type: 'number', description: 'Number of virtual users' },
        duration: { type: 'string', description: 'Test duration (e.g., "30s", "5m")' }
      },
      required: ['script']
    }
  },
  {
    name: 'k6-smoke-test',
    description: 'Run a smoke test to verify basic functionality',
    inputSchema: {
      type: 'object',
      properties: {
        url: { type: 'string', description: 'URL to test' },
        threshold: { type: 'number', description: 'Response time threshold in ms' }
      },
      required: ['url']
    }
  },
  {
    name: 'k6-load-test',
    description: 'Run a load test with ramping VUs',
    inputSchema: {
      type: 'object',
      properties: {
        url: { type: 'string', description: 'URL to test' },
        stages: { 
          type: 'array',
          description: 'Load stages',
          items: {
            type: 'object',
            properties: {
              duration: { type: 'string' },
              target: { type: 'number' }
            }
          }
        }
      },
      required: ['url']
    }
  }
];

class K6MCPServer {
  private server: Server;
  private tempDir = '/tmp/k6-tests';

  constructor() {
    this.server = new Server(
      {
        name: 'k6-mcp',
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
      tools: K6_TOOLS,
    }));

    // Handle tool execution
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;
      
      try {
        switch (name) {
          case 'k6-run':
            return await this.runK6Script(
              args?.script as string,
              args?.vus as number,
              args?.duration as string
            );
          
          case 'k6-smoke-test':
            return await this.runSmokeTest(
              args?.url as string,
              args?.threshold as number
            );
          
          case 'k6-load-test':
            return await this.runLoadTest(
              args?.url as string,
              args?.stages as any[]
            );
          
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

  private async runK6Script(script: string, vus = 10, duration = '30s') {
    const command = `k6 run --vus ${vus} --duration ${duration} ${script}`;
    const { stdout } = await execAsync(command, { timeout: 300000 });
    
    return {
      content: [
        {
          type: 'text',
          text: this.parseK6Output(stdout),
        },
      ],
    };
  }

  private async runSmokeTest(url: string, threshold = 500) {
    // Create a simple smoke test script
    const script = `
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  vus: 1,
  duration: '10s',
  thresholds: {
    http_req_duration: ['p(95)<${threshold}'],
  },
};

export default function () {
  const res = http.get('${url}');
  check(res, {
    'status is 200': (r) => r.status === 200,
    'response time < ${threshold}ms': (r) => r.timings.duration < ${threshold},
  });
  sleep(1);
}`;
    
    const scriptPath = join(this.tempDir, 'smoke-test.js');
    writeFileSync(scriptPath, script);
    
    const { stdout } = await execAsync(`k6 run ${scriptPath}`, { timeout: 30000 });
    
    return {
      content: [
        {
          type: 'text',
          text: this.parseK6Output(stdout),
        },
      ],
    };
  }

  private async runLoadTest(url: string, stages?: any[]) {
    const defaultStages = [
      { duration: '30s', target: 10 },
      { duration: '1m', target: 20 },
      { duration: '30s', target: 10 },
      { duration: '30s', target: 0 },
    ];
    
    const testStages = stages || defaultStages;
    
    const script = `
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: ${JSON.stringify(testStages)},
  thresholds: {
    http_req_duration: ['p(95)<1000'],
    http_req_failed: ['rate<0.1'],
  },
};

export default function () {
  const res = http.get('${url}');
  check(res, {
    'status is 200': (r) => r.status === 200,
  });
  sleep(1);
}`;
    
    const scriptPath = join(this.tempDir, 'load-test.js');
    writeFileSync(scriptPath, script);
    
    const { stdout } = await execAsync(`k6 run ${scriptPath}`, { timeout: 300000 });
    
    return {
      content: [
        {
          type: 'text',
          text: this.parseK6Output(stdout),
        },
      ],
    };
  }

  private parseK6Output(output: string): string {
    // Extract key metrics from K6 output
    const lines = output.split('\n');
    const metrics: string[] = [];
    
    for (const line of lines) {
      if (line.includes('http_req_duration') || 
          line.includes('http_reqs') ||
          line.includes('data_received') ||
          line.includes('data_sent') ||
          line.includes('✓') ||
          line.includes('✗')) {
        metrics.push(line.trim());
      }
    }
    
    return metrics.join('\n') || output;
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('K6 MCP Server running');
  }
}

const server = new K6MCPServer();
server.run().catch(console.error);