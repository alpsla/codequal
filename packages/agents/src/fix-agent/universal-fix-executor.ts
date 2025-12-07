/**
 * Universal Fix Executor
 *
 * Executes batch fixes using Claude API directly - no IDE dependency.
 * Works from CLI, CI/CD, or any environment with API access.
 *
 * Features:
 * - Batch execution by severity groups
 * - Parallel processing with rate limiting
 * - Dry-run mode for preview
 * - Backup original files
 * - Git integration (optional auto-commit)
 *
 * @module fix-agent/universal-fix-executor
 */

import * as fs from 'fs';
import * as path from 'path';

// ============================================================================
// Types
// ============================================================================

export interface FixRequest {
  file: string;
  line: number;
  column?: number;
  severity: 'critical' | 'high' | 'medium' | 'low';
  rule: string;
  message: string;
  snippet?: string;
  category?: string;
  fixSuggestion?: {
    explanation?: string;
    fix?: string;
    correctedCode?: string;
    bestPractices?: string[];
  };
}

export interface ExecutorConfig {
  apiKey: string;
  apiUrl?: string;
  model?: string;
  workspaceRoot: string;
  dryRun?: boolean;
  backup?: boolean;
  parallel?: number;       // Max concurrent requests
  rateLimit?: number;      // Requests per minute
  timeout?: number;        // Request timeout in ms
  verbose?: boolean;
  onProgress?: (progress: ProgressUpdate) => void;
}

export interface ProgressUpdate {
  current: number;
  total: number;
  file: string;
  status: 'processing' | 'success' | 'failed' | 'skipped';
  message?: string;
}

export interface ExecutionResult {
  success: boolean;
  file: string;
  issuesFixed: number;
  originalContent?: string;
  newContent?: string;
  error?: string;
  timeTaken: number;
}

export interface BatchExecutionSummary {
  totalIssues: number;
  filesProcessed: number;
  issuesFixed: number;
  issuesFailed: number;
  issuesSkipped: number;
  timeTaken: number;
  results: ExecutionResult[];
}

// ============================================================================
// Universal Fix Executor
// ============================================================================

export class UniversalFixExecutor {
  private config: Required<ExecutorConfig>;
  private requestCount = 0;
  private lastRequestTime = 0;

  constructor(config: ExecutorConfig) {
    this.config = {
      apiUrl: 'https://openrouter.ai/api/v1/chat/completions',
      model: 'anthropic/claude-sonnet-4-20250514',
      dryRun: false,
      backup: true,
      parallel: 3,
      rateLimit: 30,
      timeout: 60000,
      verbose: false,
      onProgress: () => { /* no-op */ },
      ...config
    };
  }

  /**
   * Execute fixes for all issues
   */
  async executeAll(issues: FixRequest[]): Promise<BatchExecutionSummary> {
    return this.executeBySeverity(issues, ['critical', 'high', 'medium', 'low']);
  }

  /**
   * Execute fixes for specific severity levels
   */
  async executeBySeverity(
    issues: FixRequest[],
    severities: Array<'critical' | 'high' | 'medium' | 'low'>
  ): Promise<BatchExecutionSummary> {
    const startTime = Date.now();
    const filteredIssues = issues.filter(i => severities.includes(i.severity));

    // Group by file for efficient processing
    const issuesByFile = this.groupByFile(filteredIssues);
    const files = Object.keys(issuesByFile);

    const results: ExecutionResult[] = [];
    let issuesFixed = 0;
    let issuesFailed = 0;
    const issuesSkipped = 0;

    // Process files with controlled parallelism
    const chunks = this.chunkArray(files, this.config.parallel);

    for (const chunk of chunks) {
      const chunkPromises = chunk.map(async (file) => {
        const fileIssues = issuesByFile[file];

        this.config.onProgress({
          current: results.length + 1,
          total: files.length,
          file,
          status: 'processing',
          message: `Processing ${fileIssues.length} issues`
        });

        try {
          const result = await this.fixFile(file, fileIssues);
          results.push(result);

          if (result.success) {
            issuesFixed += result.issuesFixed;
            this.config.onProgress({
              current: results.length,
              total: files.length,
              file,
              status: 'success',
              message: `Fixed ${result.issuesFixed} issues`
            });
          } else {
            issuesFailed += fileIssues.length;
            this.config.onProgress({
              current: results.length,
              total: files.length,
              file,
              status: 'failed',
              message: result.error
            });
          }
        } catch (error) {
          issuesFailed += fileIssues.length;
          results.push({
            success: false,
            file,
            issuesFixed: 0,
            error: error instanceof Error ? error.message : String(error),
            timeTaken: 0
          });
        }
      });

      await Promise.all(chunkPromises);
    }

    return {
      totalIssues: filteredIssues.length,
      filesProcessed: files.length,
      issuesFixed,
      issuesFailed,
      issuesSkipped,
      timeTaken: Date.now() - startTime,
      results
    };
  }

  /**
   * Fix all issues in a single file
   */
  async fixFile(filePath: string, issues: FixRequest[]): Promise<ExecutionResult> {
    const startTime = Date.now();

    // Resolve absolute path
    const absolutePath = path.isAbsolute(filePath)
      ? filePath
      : path.join(this.config.workspaceRoot, filePath);

    // Read current file content
    let originalContent: string;
    try {
      originalContent = fs.readFileSync(absolutePath, 'utf-8');
    } catch (error) {
      return {
        success: false,
        file: filePath,
        issuesFixed: 0,
        error: `Cannot read file: ${error instanceof Error ? error.message : String(error)}`,
        timeTaken: Date.now() - startTime
      };
    }

    // Generate fix prompt
    const prompt = this.generateFixPrompt(filePath, originalContent, issues);

    // Call AI API
    let fixedContent: string;
    try {
      await this.waitForRateLimit();
      fixedContent = await this.callAI(prompt);
    } catch (error) {
      return {
        success: false,
        file: filePath,
        issuesFixed: 0,
        originalContent,
        error: `AI API error: ${error instanceof Error ? error.message : String(error)}`,
        timeTaken: Date.now() - startTime
      };
    }

    // Extract code from response
    fixedContent = this.extractCodeFromResponse(fixedContent);

    if (!fixedContent || fixedContent.trim() === '') {
      return {
        success: false,
        file: filePath,
        issuesFixed: 0,
        originalContent,
        error: 'AI returned empty response',
        timeTaken: Date.now() - startTime
      };
    }

    // Apply fix (unless dry run)
    if (!this.config.dryRun) {
      // Backup original
      if (this.config.backup) {
        fs.writeFileSync(`${absolutePath}.bak`, originalContent);
      }

      // Write fixed content
      fs.writeFileSync(absolutePath, fixedContent);
    }

    return {
      success: true,
      file: filePath,
      issuesFixed: issues.length,
      originalContent,
      newContent: fixedContent,
      timeTaken: Date.now() - startTime
    };
  }

  /**
   * Generate prompt for fixing issues in a file
   */
  private generateFixPrompt(
    filePath: string,
    content: string,
    issues: FixRequest[]
  ): string {
    const language = this.detectLanguage(filePath);
    const sortedIssues = [...issues].sort((a, b) => a.line - b.line);

    let prompt = `You are a senior software engineer. Fix the following ${issues.length} code quality issues in this ${language} file.

FILE: ${filePath}

ISSUES TO FIX (in order of line number):
`;

    for (let i = 0; i < sortedIssues.length; i++) {
      const issue = sortedIssues[i];
      prompt += `
${i + 1}. [${issue.severity.toUpperCase()}] Line ${issue.line}: ${issue.rule}
   Problem: ${issue.message}`;

      if (issue.fixSuggestion?.fix) {
        prompt += `
   Recommended Fix: ${issue.fixSuggestion.fix}`;
      }

      if (issue.fixSuggestion?.bestPractices?.length) {
        prompt += `
   Best Practices: ${issue.fixSuggestion.bestPractices.join('; ')}`;
      }
    }

    prompt += `

CURRENT FILE CONTENT:
\`\`\`${language}
${content}
\`\`\`

CRITICAL INSTRUCTIONS:
1. Fix ALL ${issues.length} issues listed above
2. Maintain existing code style, formatting, and indentation
3. Do NOT add comments explaining the fixes
4. Do NOT remove or modify any code unrelated to the fixes
5. Preserve all existing functionality
6. Return ONLY the complete fixed file content in a code block
7. The response must be valid, compilable ${language} code

Return the fixed code:`;

    return prompt;
  }

  /**
   * Call AI API with rate limiting
   */
  private async callAI(prompt: string): Promise<string> {
    const isOpenRouter = this.config.apiUrl.includes('openrouter');
    const isAnthropic = this.config.apiUrl.includes('anthropic');

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.config.apiKey}`
    };

    if (isAnthropic) {
      headers['anthropic-version'] = '2023-06-01';
    }

    const body = isAnthropic
      ? {
          model: this.config.model.replace('anthropic/', ''),
          max_tokens: 8000,
          messages: [{ role: 'user', content: prompt }]
        }
      : {
          model: this.config.model,
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 8000,
          temperature: 0.1
        };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

    try {
      const response = await fetch(this.config.apiUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API error ${response.status}: ${errorText}`);
      }

      const data = await response.json() as {
        content?: Array<{ text?: string }>;
        choices?: Array<{ message?: { content?: string } }>;
      };

      // Extract content based on API format
      if (isAnthropic) {
        return data.content?.[0]?.text || '';
      } else {
        return data.choices?.[0]?.message?.content || '';
      }
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Extract code block from AI response
   */
  private extractCodeFromResponse(response: string): string {
    // Try to extract from code block
    const codeBlockMatch = response.match(/```[\w]*\n([\s\S]*?)\n```/);
    if (codeBlockMatch) {
      return codeBlockMatch[1];
    }

    // If no code block, check if entire response looks like code
    if (response.includes('function ') ||
        response.includes('class ') ||
        response.includes('import ') ||
        response.includes('const ') ||
        response.includes('package ')) {
      return response;
    }

    return response;
  }

  /**
   * Wait for rate limit
   */
  private async waitForRateLimit(): Promise<void> {
    const now = Date.now();
    const minInterval = 60000 / this.config.rateLimit; // ms between requests
    const timeSinceLastRequest = now - this.lastRequestTime;

    if (timeSinceLastRequest < minInterval) {
      await new Promise(resolve =>
        setTimeout(resolve, minInterval - timeSinceLastRequest)
      );
    }

    this.lastRequestTime = Date.now();
    this.requestCount++;
  }

  /**
   * Group issues by file
   */
  private groupByFile(issues: FixRequest[]): Record<string, FixRequest[]> {
    const groups: Record<string, FixRequest[]> = {};

    for (const issue of issues) {
      if (!issue.file) continue;
      if (!groups[issue.file]) groups[issue.file] = [];
      groups[issue.file].push(issue);
    }

    // Sort issues within each file by line number
    for (const file of Object.keys(groups)) {
      groups[file].sort((a, b) => a.line - b.line);
    }

    return groups;
  }

  /**
   * Chunk array for parallel processing
   */
  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  /**
   * Detect language from file extension
   */
  private detectLanguage(filePath: string): string {
    const ext = path.extname(filePath).toLowerCase().slice(1);
    const langMap: Record<string, string> = {
      ts: 'typescript', tsx: 'typescript',
      js: 'javascript', jsx: 'javascript', mjs: 'javascript',
      java: 'java', kt: 'kotlin',
      py: 'python', rb: 'ruby',
      go: 'go', rs: 'rust',
      cs: 'csharp', php: 'php',
      swift: 'swift', c: 'c', cpp: 'cpp', h: 'c', hpp: 'cpp',
      yaml: 'yaml', yml: 'yaml',
      json: 'json', xml: 'xml', html: 'html', css: 'css',
      sh: 'shell', bash: 'shell',
      dockerfile: 'dockerfile', md: 'markdown'
    };
    return langMap[ext] || ext || 'text';
  }
}

// ============================================================================
// Convenience Functions
// ============================================================================

/**
 * Execute all fixes using environment variables for config
 */
export async function executeFixesFromEnv(
  issues: FixRequest[],
  options: {
    severities?: Array<'critical' | 'high' | 'medium' | 'low'>;
    dryRun?: boolean;
    workspaceRoot?: string;
  } = {}
): Promise<BatchExecutionSummary> {
  const apiKey = process.env.OPENROUTER_API_KEY || process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    throw new Error('No API key found. Set OPENROUTER_API_KEY or ANTHROPIC_API_KEY');
  }

  const apiUrl = process.env.OPENROUTER_API_KEY
    ? 'https://openrouter.ai/api/v1/chat/completions'
    : 'https://api.anthropic.com/v1/messages';

  const executor = new UniversalFixExecutor({
    apiKey,
    apiUrl,
    workspaceRoot: options.workspaceRoot || process.cwd(),
    dryRun: options.dryRun,
    onProgress: (progress) => {
      console.log(`[${progress.current}/${progress.total}] ${progress.status}: ${progress.file}`);
      if (progress.message) {
        console.log(`  ${progress.message}`);
      }
    }
  });

  if (options.severities) {
    return executor.executeBySeverity(issues, options.severities);
  }

  return executor.executeAll(issues);
}
