/**
 * Tool Executor Base - Abstract base class for tool execution
 *
 * Provides common functionality for spawning subprocesses, handling
 * stdout/stderr, timeouts, and error handling.
 */

import { spawn, SpawnOptions } from 'child_process';
import * as path from 'path';

export interface ToolExecutionResult {
  success: boolean;
  tool: string;
  command: string;
  exitCode: number | null;
  stdout: string;
  stderr: string;
  filesFixed: string[];
  issuesFixed: number;
  durationMs: number;
  error?: string;
}

export interface ToolExecutionOptions {
  workingDir: string;
  timeout?: number; // ms, default 60000
  dryRun?: boolean;
  files?: string[];
  verbose?: boolean;
}

export interface ToolConfig {
  name: string;
  command: string;
  fixCommand?: string;
  checkCommand?: string;
  isInstalled?: boolean;
  version?: string;
}

/**
 * Abstract base class for tool executors
 */
export abstract class ToolExecutorBase {
  protected config: ToolConfig;
  protected defaultTimeout = 60000; // 60 seconds

  constructor(config: ToolConfig) {
    this.config = config;
  }

  /**
   * Check if the tool is installed and available
   */
  async checkInstalled(): Promise<boolean> {
    try {
      const result = await this.executeCommand(
        this.getVersionCommand(),
        { workingDir: process.cwd(), timeout: 5000 }
      );
      this.config.isInstalled = result.exitCode === 0;
      return this.config.isInstalled;
    } catch {
      this.config.isInstalled = false;
      return false;
    }
  }

  /**
   * Get the version check command for this tool
   */
  protected abstract getVersionCommand(): string;

  /**
   * Execute fixes on specified files
   */
  abstract executeFix(options: ToolExecutionOptions): Promise<ToolExecutionResult>;

  /**
   * Execute a shell command and return the result
   */
  protected async executeCommand(
    command: string,
    options: ToolExecutionOptions
  ): Promise<ToolExecutionResult> {
    const startTime = Date.now();
    const timeout = options.timeout ?? this.defaultTimeout;

    return new Promise((resolve) => {
      const [cmd, ...args] = this.parseCommand(command);

      const spawnOptions: SpawnOptions = {
        cwd: options.workingDir,
        shell: true,
        env: { ...process.env, FORCE_COLOR: '0' },
      };

      if (options.verbose) {
        console.log(`[${this.config.name}] Executing: ${command}`);
        console.log(`[${this.config.name}] Working dir: ${options.workingDir}`);
      }

      const child = spawn(cmd, args, spawnOptions);

      let stdout = '';
      let stderr = '';
      let killed = false;

      // Set timeout
      const timeoutId = setTimeout(() => {
        killed = true;
        child.kill('SIGKILL');
      }, timeout);

      child.stdout?.on('data', (data) => {
        stdout += data.toString();
      });

      child.stderr?.on('data', (data) => {
        stderr += data.toString();
      });

      child.on('close', (code) => {
        clearTimeout(timeoutId);
        const durationMs = Date.now() - startTime;

        if (killed) {
          resolve({
            success: false,
            tool: this.config.name,
            command,
            exitCode: null,
            stdout,
            stderr,
            filesFixed: [],
            issuesFixed: 0,
            durationMs,
            error: `Command timed out after ${timeout}ms`,
          });
          return;
        }

        resolve({
          success: code === 0,
          tool: this.config.name,
          command,
          exitCode: code,
          stdout,
          stderr,
          filesFixed: this.parseFixedFiles(stdout, stderr),
          issuesFixed: this.countFixedIssues(stdout, stderr),
          durationMs,
        });
      });

      child.on('error', (err) => {
        clearTimeout(timeoutId);
        resolve({
          success: false,
          tool: this.config.name,
          command,
          exitCode: null,
          stdout,
          stderr,
          filesFixed: [],
          issuesFixed: 0,
          durationMs: Date.now() - startTime,
          error: err.message,
        });
      });
    });
  }

  /**
   * Parse command string into command and arguments
   */
  protected parseCommand(command: string): string[] {
    // Simple parsing - split by spaces but respect quotes
    const parts: string[] = [];
    let current = '';
    let inQuote = false;
    let quoteChar = '';

    for (const char of command) {
      if ((char === '"' || char === "'") && !inQuote) {
        inQuote = true;
        quoteChar = char;
      } else if (char === quoteChar && inQuote) {
        inQuote = false;
        quoteChar = '';
      } else if (char === ' ' && !inQuote) {
        if (current) {
          parts.push(current);
          current = '';
        }
      } else {
        current += char;
      }
    }

    if (current) {
      parts.push(current);
    }

    return parts;
  }

  /**
   * Parse fixed files from command output (override in subclasses)
   */
  protected parseFixedFiles(_stdout: string, _stderr: string): string[] {
    return [];
  }

  /**
   * Count fixed issues from command output (override in subclasses)
   */
  protected countFixedIssues(_stdout: string, _stderr: string): number {
    return 0;
  }

  /**
   * Build the fix command with file arguments
   */
  protected buildFixCommand(baseCommand: string, files?: string[]): string {
    if (!files || files.length === 0) {
      return baseCommand;
    }

    // Escape file paths
    const escapedFiles = files.map(f => `"${f}"`).join(' ');
    return `${baseCommand} ${escapedFiles}`;
  }

  /**
   * Get relative paths for files
   */
  protected getRelativePaths(files: string[], workingDir: string): string[] {
    return files.map(f => path.relative(workingDir, f));
  }
}
