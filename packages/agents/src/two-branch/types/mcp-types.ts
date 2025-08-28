/**
 * Mock MCP Types for Two-Branch Analysis
 * This temporarily replaces the mcp-hybrid types until the package is built
 */

export interface IndividualToolResponse {
  tool: string;
  success: boolean;
  results?: any;
  error?: string;
  executionTime?: number;
}

export interface ConsolidatedToolResults {
  toolsExecuted: string[];
  findings: any[];
  executionTime: number;
}

export interface ParallelToolExecutorOptions {
  timeout?: number;
  continueOnError?: boolean;
}

// Mock ParallelToolExecutor class
export class ParallelToolExecutor {
  async runTools(
    repoPath: string,
    tools: string[],
    options?: ParallelToolExecutorOptions
  ): Promise<IndividualToolResponse[]> {
    // Mock implementation
    console.log(`Would run tools: ${tools.join(', ')} on ${repoPath}`);
    return tools.map(tool => ({
      tool,
      success: true,
      results: [],
      executionTime: 100
    }));
  }
  
  async runTool(
    tool: string,
    repoPath: string,
    options?: { timeout?: number }
  ): Promise<IndividualToolResponse> {
    console.log(`Would run tool: ${tool} on ${repoPath}`);
    return {
      tool,
      success: true,
      results: [],
      executionTime: 100
    };
  }
}