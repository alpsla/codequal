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

export interface StandardizedFinding {
  id: string;
  tool: string;
  toolSource?: string;
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical' | 'info';
  message: string;
  title?: string;
  description?: string;
  file: string;
  line?: number;
  column?: number;
  rule?: string;
  category?: string;
  confidence?: number;
  evidence?: string;
  location?: {
    file: string;
    line?: number;
    column?: number;
    startLine?: number;
    endLine?: number;
  };
  metadata?: Record<string, any>;
}

export interface StandardizedToolOutput {
  tool: string;
  success: boolean;
  findings: StandardizedFinding[];
  metrics?: Record<string, any>;
  executionTime?: number;
  error?: string;
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