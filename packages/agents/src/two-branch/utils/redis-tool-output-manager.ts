/**
 * Redis-based Tool Output Manager
 *
 * Manages tool execution results using Redis cache instead of file I/O
 */

import Redis from 'ioredis';
import { logger } from './logger';

export interface ToolOutput {
  tool: string;
  workspace: string;
  branch: string;
  rawOutput: string;
  parsedIssues?: any[];
  executionTime: number;
  timestamp: number;
  success: boolean;
  error?: string;
}

export class RedisToolOutputManager {
  private redis: Redis;
  private readonly keyPrefix = 'codequal:tool-output:';
  private readonly ttl = 3600; // 1 hour TTL for tool outputs

  constructor(redisUrl?: string) {
    this.redis = new Redis(redisUrl || process.env.REDIS_URL || 'redis://localhost:6379');

    this.redis.on('connect', () => {
      logger.info('[Redis] Connected to Redis for tool output management');
    });

    this.redis.on('error', (err) => {
      logger.error('[Redis] Connection error:', err);
    });
  }

  /**
   * Generate cache key for tool output
   */
  private getKey(workspace: string, branch: string, tool: string): string {
    return `${this.keyPrefix}${workspace}:${branch}:${tool}`;
  }

  /**
   * Store tool output in Redis
   */
  async storeToolOutput(
    workspace: string,
    branch: string,
    tool: string,
    output: string,
    executionTime: number,
    success = true,
    error?: string
  ): Promise<void> {
    const key = this.getKey(workspace, branch, tool);

    const toolOutput: ToolOutput = {
      tool,
      workspace,
      branch,
      rawOutput: output,
      executionTime,
      timestamp: Date.now(),
      success,
      error
    };

    // Parse the output based on tool type
    toolOutput.parsedIssues = this.parseToolOutput(tool, output);

    try {
      await this.redis.setex(key, this.ttl, JSON.stringify(toolOutput));
      logger.info(`[Redis] Stored ${tool} output for ${workspace}:${branch} (${toolOutput.parsedIssues?.length || 0} issues)`);
    } catch (error) {
      logger.error(`[Redis] Failed to store tool output: ${error.message}`);
      throw error;
    }
  }

  /**
   * Retrieve tool output from Redis
   */
  async getToolOutput(workspace: string, branch: string, tool: string): Promise<ToolOutput | null> {
    const key = this.getKey(workspace, branch, tool);

    try {
      const data = await this.redis.get(key);
      if (!data) {
        logger.debug(`[Redis] No cached output found for ${tool} in ${workspace}:${branch}`);
        return null;
      }

      const output = JSON.parse(data) as ToolOutput;
      logger.info(`[Redis] Retrieved ${tool} output (${output.parsedIssues?.length || 0} issues)`);
      return output;
    } catch (error) {
      logger.error(`[Redis] Failed to retrieve tool output: ${error.message}`);
      return null;
    }
  }

  /**
   * Get all tool outputs for a workspace/branch
   */
  async getAllToolOutputs(workspace: string, branch: string): Promise<ToolOutput[]> {
    const pattern = `${this.keyPrefix}${workspace}:${branch}:*`;

    try {
      const keys = await this.redis.keys(pattern);
      if (keys.length === 0) {
        logger.debug(`[Redis] No tool outputs found for ${workspace}:${branch}`);
        return [];
      }

      const outputs: ToolOutput[] = [];
      for (const key of keys) {
        const data = await this.redis.get(key);
        if (data) {
          outputs.push(JSON.parse(data));
        }
      }

      logger.info(`[Redis] Retrieved ${outputs.length} tool outputs for ${workspace}:${branch}`);
      return outputs;
    } catch (error) {
      logger.error(`[Redis] Failed to retrieve all tool outputs: ${error.message}`);
      return [];
    }
  }

  /**
   * Parse tool output based on tool type
   */
  private parseToolOutput(tool: string, rawOutput: string): any[] {
    const issues: any[] = [];

    try {
      switch (tool) {
        case 'spotbugs':
          return this.parseSpotBugsOutput(rawOutput);

        case 'pmd':
        case 'pmd-quality':
        case 'pmd-performance':
        case 'pmd-architecture':
          return this.parsePMDOutput(rawOutput);

        case 'checkstyle':
          return this.parseCheckstyleOutput(rawOutput);

        case 'semgrep':
          return this.parseSemgrepOutput(rawOutput);

        case 'bandit':
          return this.parseBanditOutput(rawOutput);

        case 'pylint':
          return this.parsePylintOutput(rawOutput);

        case 'eslint':
          return this.parseESLintOutput(rawOutput);

        default:
          logger.warn(`[Redis] No parser available for tool: ${tool}`);
          return [];
      }
    } catch (error) {
      logger.error(`[Redis] Failed to parse ${tool} output: ${error.message}`);
      return issues;
    }
  }

  /**
   * Parse SpotBugs text output
   * Format: H C NP: Description at File.java:[line 123]
   */
  private parseSpotBugsOutput(output: string): any[] {
    const issues: any[] = [];
    const lines = output.split('\n');

    // Pattern: Priority Category Code: Description at/At File:[line N]
    const pattern = /^([HML])\s+([A-Z]+)\s+(\w+):\s+(.+?)\s+(?:at|At)\s+([^:]+):\[line\s+(\d+)\]/;

    for (const line of lines) {
      const match = line.match(pattern);
      if (match) {
        issues.push({
          tool: 'spotbugs',
          severity: match[1] === 'H' ? 'high' : match[1] === 'M' ? 'medium' : 'low',
          category: match[2],
          code: match[3],
          message: match[4].trim(),
          file: match[5],
          line: parseInt(match[6]),
          raw: line
        });
      }
    }

    return issues;
  }

  /**
   * Parse PMD text output
   */
  private parsePMDOutput(output: string): any[] {
    const issues: any[] = [];
    const lines = output.split('\n');

    // PMD EMACS format: File:Line: Message
    const pattern = /^([^:]+):(\d+):\s+(.+)$/;

    for (const line of lines) {
      const match = line.match(pattern);
      if (match) {
        issues.push({
          tool: 'pmd',
          file: match[1],
          line: parseInt(match[2]),
          column: 1, // EMACS format doesn't provide column, default to 1
          message: match[3].trim(),
          severity: 'medium', // PMD doesn't provide severity in text format
          raw: line
        });
      }
    }

    return issues;
  }

  /**
   * Parse Checkstyle output
   */
  private parseCheckstyleOutput(output: string): any[] {
    const issues: any[] = [];

    // Try to parse as JSON first (if using JSON reporter)
    try {
      const json = JSON.parse(output);
      if (Array.isArray(json)) {
        return json;
      }
    } catch {
      // Not JSON, parse as text
      const lines = output.split('\n');
      // Checkstyle format: [ERROR] /path/to/file.java:line:column: message
      // or just: /path/to/file.java:line:column: message
      const pattern = /^(?:\[(\w+)\]\s+)?([^:]+\.java):(\d+)(?::(\d+))?:\s+(.+)$/;

      for (const line of lines) {
        const match = line.match(pattern);
        if (match) {
          issues.push({
            tool: 'checkstyle',
            severity: match[1].toLowerCase(),
            file: match[2],
            line: parseInt(match[3]),
            column: parseInt(match[4]),
            message: match[5].trim(),
            raw: line
          });
        }
      }
    }

    return issues;
  }

  /**
   * Parse Semgrep output (text or JSON)
   */
  private parseSemgrepOutput(output: string): any[] {
    // First try JSON parsing
    try {
      const json = JSON.parse(output);
      if (json.results && Array.isArray(json.results)) {
        return json.results.map((r: any) => ({
          tool: 'semgrep',
          file: r.path,
          line: r.start.line,
          column: r.start.col,
          message: r.extra.message || r.check_id,
          severity: r.extra.severity || 'medium',
          rule: r.check_id
        }));
      }
    } catch {
      // Not JSON, try to parse text output
      const issues: any[] = [];
      const lines = output.split('\n');

      // Semgrep text format includes file paths and findings
      // Look for lines that contain file paths with line numbers
      const filePattern = /^\s*(\S+\.java)\s*$/;
      const findingPattern = /^\s*(\d+)┆\s*(.+)$/;
      const rulePattern = /^\s*([a-z.-]+)\s*$/;

      let currentFile = '';
      let currentRule = '';

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        // Check for file name
        const fileMatch = line.match(filePattern);
        if (fileMatch) {
          currentFile = fileMatch[1].trim();
          continue;
        }

        // Check for rule name
        const ruleMatch = line.match(rulePattern);
        if (ruleMatch && ruleMatch[1].includes('.')) {
          currentRule = ruleMatch[1];
          continue;
        }

        // Check for finding with line number
        const findingMatch = line.match(findingPattern);
        if (findingMatch && currentFile) {
          issues.push({
            tool: 'semgrep',
            file: currentFile,
            line: parseInt(findingMatch[1]),
            column: 1,
            message: currentRule || findingMatch[2].trim(),
            severity: 'medium',
            raw: line
          });
        }
      }

      if (issues.length > 0) {
        return issues;
      }

      // If no issues parsed but contains "findings", count them
      if (output.includes('Code Findings') || output.includes('findings')) {
        logger.info('[Redis] Semgrep found issues but parsing failed, returning raw count');
        const countMatch = output.match(/(\d+)\s+(?:Code\s+)?[Ff]indings?/);
        if (countMatch) {
          const count = parseInt(countMatch[1]);
          // Return placeholder issues for counting
          for (let i = 0; i < count; i++) {
            issues.push({
              tool: 'semgrep',
              file: 'unknown',
              line: 1,
              message: 'Semgrep finding (parsing failed)',
              severity: 'medium'
            });
          }
        }
      }

      return issues;
    }
    return [];
  }

  /**
   * Parse Bandit JSON output
   */
  private parseBanditOutput(output: string): any[] {
    try {
      const json = JSON.parse(output);
      if (json.results && Array.isArray(json.results)) {
        return json.results.map((r: any) => ({
          tool: 'bandit',
          file: r.filename,
          line: r.line_number,
          message: r.issue_text,
          severity: r.issue_severity.toLowerCase(),
          confidence: r.issue_confidence.toLowerCase(),
          test: r.test_name
        }));
      }
    } catch {
      logger.warn('[Redis] Failed to parse Bandit JSON output');
    }
    return [];
  }

  /**
   * Parse Pylint JSON output
   */
  private parsePylintOutput(output: string): any[] {
    try {
      const json = JSON.parse(output);
      if (Array.isArray(json)) {
        return json.map((r: any) => ({
          tool: 'pylint',
          file: r.path,
          line: r.line,
          column: r.column,
          message: r.message,
          severity: r.type === 'error' ? 'high' : r.type === 'warning' ? 'medium' : 'low',
          code: r.symbol
        }));
      }
    } catch {
      logger.warn('[Redis] Failed to parse Pylint JSON output');
    }
    return [];
  }

  /**
   * Parse ESLint JSON output
   */
  private parseESLintOutput(output: string): any[] {
    try {
      const json = JSON.parse(output);
      const issues: any[] = [];

      if (Array.isArray(json)) {
        for (const file of json) {
          for (const message of file.messages || []) {
            issues.push({
              tool: 'eslint',
              file: file.filePath,
              line: message.line,
              column: message.column,
              message: message.message,
              severity: message.severity === 2 ? 'high' : message.severity === 1 ? 'medium' : 'low',
              rule: message.ruleId
            });
          }
        }
      }
    } catch {
      logger.warn('[Redis] Failed to parse ESLint JSON output');
    }
    return [];
  }

  /**
   * Clear all tool outputs for a workspace
   */
  async clearWorkspaceOutputs(workspace: string): Promise<void> {
    const pattern = `${this.keyPrefix}${workspace}:*`;

    try {
      const keys = await this.redis.keys(pattern);
      if (keys.length > 0) {
        await this.redis.del(...keys);
        logger.info(`[Redis] Cleared ${keys.length} tool outputs for workspace ${workspace}`);
      }
    } catch (error) {
      logger.error(`[Redis] Failed to clear workspace outputs: ${error.message}`);
    }
  }

  /**
   * Get statistics for a workspace
   */
  async getWorkspaceStats(workspace: string): Promise<any> {
    const mainOutputs = await this.getAllToolOutputs(workspace, 'main');
    const prOutputs = await this.getAllToolOutputs(workspace, 'pr');

    const mainIssues = mainOutputs.flatMap(o => o.parsedIssues || []);
    const prIssues = prOutputs.flatMap(o => o.parsedIssues || []);

    return {
      workspace,
      mainBranch: {
        toolsRun: mainOutputs.length,
        totalIssues: mainIssues.length,
        byTool: mainOutputs.map(o => ({
          tool: o.tool,
          issues: o.parsedIssues?.length || 0,
          executionTime: o.executionTime
        }))
      },
      prBranch: {
        toolsRun: prOutputs.length,
        totalIssues: prIssues.length,
        byTool: prOutputs.map(o => ({
          tool: o.tool,
          issues: o.parsedIssues?.length || 0,
          executionTime: o.executionTime
        }))
      },
      comparison: {
        newIssues: prIssues.length - mainIssues.length,
        totalExecutionTime: [...mainOutputs, ...prOutputs].reduce((sum, o) => sum + o.executionTime, 0)
      }
    };
  }

  /**
   * Disconnect from Redis
   */
  async disconnect(): Promise<void> {
    await this.redis.quit();
    logger.info('[Redis] Disconnected from Redis');
  }
}