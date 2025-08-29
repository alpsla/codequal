#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { 
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool
} from '@modelcontextprotocol/sdk/types.js';
import puppeteer, { Browser } from 'puppeteer';
import lighthouse from 'lighthouse';
import { URL } from 'url';

// Browser Performance Testing Tools
const BROWSER_TOOLS: Tool[] = [
  {
    name: 'lighthouse-audit',
    description: 'Run a Lighthouse audit for web performance, accessibility, and SEO',
    inputSchema: {
      type: 'object',
      properties: {
        url: { type: 'string', description: 'URL to audit' },
        categories: { 
          type: 'array',
          description: 'Categories to audit',
          items: {
            type: 'string',
            enum: ['performance', 'accessibility', 'best-practices', 'seo', 'pwa']
          }
        }
      },
      required: ['url']
    }
  },
  {
    name: 'screenshot',
    description: 'Take a screenshot of a webpage',
    inputSchema: {
      type: 'object',
      properties: {
        url: { type: 'string', description: 'URL to screenshot' },
        fullPage: { type: 'boolean', description: 'Capture full page' },
        viewport: {
          type: 'object',
          properties: {
            width: { type: 'number' },
            height: { type: 'number' }
          }
        }
      },
      required: ['url']
    }
  },
  {
    name: 'page-metrics',
    description: 'Get page load metrics and resource timing',
    inputSchema: {
      type: 'object',
      properties: {
        url: { type: 'string', description: 'URL to analyze' },
        waitUntil: { 
          type: 'string',
          enum: ['load', 'domcontentloaded', 'networkidle0', 'networkidle2']
        }
      },
      required: ['url']
    }
  },
  {
    name: 'accessibility-check',
    description: 'Run accessibility checks using axe-core',
    inputSchema: {
      type: 'object',
      properties: {
        url: { type: 'string', description: 'URL to check' }
      },
      required: ['url']
    }
  }
];

class BrowserToolsMCPServer {
  private server: Server;
  private browser: Browser | null = null;

  constructor() {
    this.server = new Server(
      {
        name: 'browsertools-mcp',
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
      tools: BROWSER_TOOLS,
    }));

    // Handle tool execution
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;
      
      try {
        switch (name) {
          case 'lighthouse-audit':
            return await this.runLighthouse(
              args?.url as string,
              args?.categories as string[]
            );
          
          case 'screenshot':
            return await this.takeScreenshot(
              args?.url as string,
              args?.fullPage as boolean,
              args?.viewport as any
            );
          
          case 'page-metrics':
            return await this.getPageMetrics(
              args?.url as string,
              args?.waitUntil as any
            );
          
          case 'accessibility-check':
            return await this.checkAccessibility(args?.url as string);
          
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

  private async getBrowser(): Promise<Browser> {
    if (!this.browser) {
      this.browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
    }
    return this.browser;
  }

  private async runLighthouse(url: string, categories?: string[]) {
    const categoriesConfig = categories || ['performance', 'accessibility', 'best-practices', 'seo'];
    
    // Launch Chrome with debugging port
    const browser = await this.getBrowser();
    const page = await browser.newPage();
    
    // Get the debugging port
    const wsEndpoint = browser.wsEndpoint();
    const urlObj = new URL(wsEndpoint);
    const port = parseInt(urlObj.port);
    
    // Run Lighthouse
    const result = await lighthouse(url, {
      port,
      output: 'json',
      onlyCategories: categoriesConfig as any,
    });
    
    await page.close();
    
    if (!result || !result.lhr) {
      throw new Error('Lighthouse audit failed');
    }
    
    // Format results
    const scores: Record<string, number> = {};
    for (const [category, data] of Object.entries(result.lhr.categories)) {
      scores[category] = Math.round((data as any).score * 100);
    }
    
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            url,
            scores,
            metrics: {
              'first-contentful-paint': result.lhr.audits['first-contentful-paint']?.displayValue,
              'speed-index': result.lhr.audits['speed-index']?.displayValue,
              'largest-contentful-paint': result.lhr.audits['largest-contentful-paint']?.displayValue,
              'time-to-interactive': result.lhr.audits['interactive']?.displayValue,
              'total-blocking-time': result.lhr.audits['total-blocking-time']?.displayValue,
              'cumulative-layout-shift': result.lhr.audits['cumulative-layout-shift']?.displayValue,
            }
          }, null, 2),
        },
      ],
    };
  }

  private async takeScreenshot(url: string, fullPage = false, viewport?: any) {
    const browser = await this.getBrowser();
    const page = await browser.newPage();
    
    if (viewport) {
      await page.setViewport(viewport);
    }
    
    await page.goto(url, { waitUntil: 'networkidle2' });
    
    const screenshot = await page.screenshot({
      fullPage,
      encoding: 'base64'
    });
    
    await page.close();
    
    return {
      content: [
        {
          type: 'text',
          text: `Screenshot captured (${fullPage ? 'full page' : 'viewport'}): ${screenshot.length} bytes`,
        },
      ],
    };
  }

  private async getPageMetrics(url: string, waitUntil = 'load') {
    const browser = await this.getBrowser();
    const page = await browser.newPage();
    
    // Enable CDP
    const client = await page.target().createCDPSession();
    await client.send('Performance.enable');
    
    const startTime = Date.now();
    await page.goto(url, { waitUntil: waitUntil as any });
    const loadTime = Date.now() - startTime;
    
    // Get performance metrics
    const performanceMetrics = await client.send('Performance.getMetrics');
    const performanceTiming = await page.evaluate(() => 
      JSON.stringify(window.performance.timing)
    );
    
    // Get resource timing
    const resourceTiming = await page.evaluate(() => 
      window.performance.getEntriesByType('resource').map(r => ({
        name: r.name,
        duration: r.duration,
        size: (r as any).transferSize || 0
      }))
    );
    
    await page.close();
    
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            loadTime: `${loadTime}ms`,
            metrics: performanceMetrics.metrics,
            timing: JSON.parse(performanceTiming),
            resources: {
              count: resourceTiming.length,
              totalSize: resourceTiming.reduce((sum: number, r: any) => sum + r.size, 0),
              slowest: resourceTiming.sort((a: any, b: any) => b.duration - a.duration).slice(0, 5)
            }
          }, null, 2),
        },
      ],
    };
  }

  private async checkAccessibility(url: string) {
    const browser = await this.getBrowser();
    const page = await browser.newPage();
    
    await page.goto(url, { waitUntil: 'networkidle2' });
    
    // Inject axe-core
    await page.addScriptTag({
      url: 'https://cdnjs.cloudflare.com/ajax/libs/axe-core/4.6.3/axe.min.js'
    });
    
    // Run accessibility check
    const results = await page.evaluate(() => {
      return new Promise((resolve) => {
        (window as any).axe.run((err: any, results: any) => {
          if (err) throw err;
          resolve(results);
        });
      });
    }) as any;
    
    await page.close();
    
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            url,
            violations: results.violations.length,
            passes: results.passes.length,
            incomplete: results.incomplete.length,
            inapplicable: results.inapplicable.length,
            issues: results.violations.map((v: any) => ({
              id: v.id,
              impact: v.impact,
              description: v.description,
              nodes: v.nodes.length
            }))
          }, null, 2),
        },
      ],
    };
  }

  async cleanup() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('BrowserTools MCP Server running');
    
    // Cleanup on exit
    process.on('SIGINT', async () => {
      await this.cleanup();
      process.exit(0);
    });
  }
}

const server = new BrowserToolsMCPServer();
server.run().catch(console.error);