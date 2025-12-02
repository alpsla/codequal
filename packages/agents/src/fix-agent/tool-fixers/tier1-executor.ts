/**
 * Tier 1 Executor - Native Tool Fix Commands
 *
 * Executes native --fix flags for tools like:
 * - ESLint (eslint --fix)
 * - Ruff (ruff check --fix)
 * - Prettier (prettier --write)
 * - golangci-lint (golangci-lint run --fix)
 * - gofmt (gofmt -w)
 */

import {
  ToolExecutorBase,
  ToolExecutionResult,
  ToolExecutionOptions,
  ToolConfig,
} from './tool-executor-base';

/**
 * ESLint Executor - JavaScript/TypeScript linting with auto-fix
 */
export class ESLintExecutor extends ToolExecutorBase {
  constructor() {
    super({
      name: 'eslint',
      command: 'npx eslint',
      fixCommand: 'npx eslint --fix',
    });
  }

  protected getVersionCommand(): string {
    return 'npx eslint --version';
  }

  async executeFix(options: ToolExecutionOptions): Promise<ToolExecutionResult> {
    const command = this.buildFixCommand(
      `${this.config.fixCommand} --format json`,
      options.files
    );

    if (options.dryRun) {
      return {
        success: true,
        tool: this.config.name,
        command,
        exitCode: 0,
        stdout: '[DRY RUN] Would execute: ' + command,
        stderr: '',
        filesFixed: options.files || [],
        issuesFixed: 0,
        durationMs: 0,
      };
    }

    return this.executeCommand(command, options);
  }

  protected parseFixedFiles(stdout: string, _stderr: string): string[] {
    try {
      const results = JSON.parse(stdout);
      return results
        .filter((r: { output?: string }) => r.output)
        .map((r: { filePath: string }) => r.filePath);
    } catch {
      return [];
    }
  }

  protected countFixedIssues(stdout: string, _stderr: string): number {
    try {
      const results = JSON.parse(stdout);
      return results.reduce(
        (total: number, r: { fixableErrorCount?: number; fixableWarningCount?: number }) =>
          total + (r.fixableErrorCount || 0) + (r.fixableWarningCount || 0),
        0
      );
    } catch {
      return 0;
    }
  }
}

/**
 * Prettier Executor - Code formatting
 */
export class PrettierExecutor extends ToolExecutorBase {
  constructor() {
    super({
      name: 'prettier',
      command: 'npx prettier',
      fixCommand: 'npx prettier --write',
    });
  }

  protected getVersionCommand(): string {
    return 'npx prettier --version';
  }

  async executeFix(options: ToolExecutionOptions): Promise<ToolExecutionResult> {
    const command = this.buildFixCommand(this.config.fixCommand!, options.files);

    if (options.dryRun) {
      return {
        success: true,
        tool: this.config.name,
        command,
        exitCode: 0,
        stdout: '[DRY RUN] Would execute: ' + command,
        stderr: '',
        filesFixed: options.files || [],
        issuesFixed: 0,
        durationMs: 0,
      };
    }

    return this.executeCommand(command, options);
  }

  protected parseFixedFiles(_stdout: string, stderr: string): string[] {
    // Prettier logs formatted files to stderr
    const lines = stderr.split('\n').filter(l => l.trim());
    return lines.filter(l => !l.includes('[warn]') && !l.includes('[error]'));
  }
}

/**
 * Ruff Executor - Python linting with auto-fix
 */
export class RuffExecutor extends ToolExecutorBase {
  constructor() {
    super({
      name: 'ruff',
      command: 'ruff check',
      fixCommand: 'ruff check --fix',
    });
  }

  protected getVersionCommand(): string {
    return 'ruff --version';
  }

  async executeFix(options: ToolExecutionOptions): Promise<ToolExecutionResult> {
    // Build command - ruff can fix entire directories
    // Don't quote file names as ruff handles paths correctly
    let command = `${this.config.fixCommand} --output-format json`;

    if (options.files && options.files.length > 0) {
      // Join files without extra quoting - shell: true handles it
      command += ' ' + options.files.join(' ');
    } else {
      // Fix entire working directory
      command += ' .';
    }

    if (options.dryRun) {
      return {
        success: true,
        tool: this.config.name,
        command,
        exitCode: 0,
        stdout: '[DRY RUN] Would execute: ' + command,
        stderr: '',
        filesFixed: options.files || [],
        issuesFixed: 0,
        durationMs: 0,
      };
    }

    return this.executeCommand(command, options);
  }

  protected parseFixedFiles(stdout: string, _stderr: string): string[] {
    try {
      // ruff check --fix --output-format json returns list of remaining issues
      // Fixed files are those that HAD issues but may not appear in output anymore
      // We need to check if output is empty (all fixed) or parse remaining
      const results = JSON.parse(stdout);

      // If no results, it means all issues were fixed
      if (!Array.isArray(results) || results.length === 0) {
        return ['(all files fixed)'];
      }

      // Files with fixable issues that were addressed
      const files = new Set<string>();
      results
        .filter((r: { fix?: { applicability: string } }) =>
          r.fix?.applicability === 'safe' || r.fix?.applicability === 'unsafe'
        )
        .forEach((r: { filename: string }) => files.add(r.filename));
      return Array.from(files);
    } catch {
      // If JSON parsing fails, check stderr for fix confirmation
      return [];
    }
  }

  protected countFixedIssues(stdout: string, stderr: string): number {
    try {
      const results = JSON.parse(stdout);

      // If array is empty, issues were fixed
      if (!Array.isArray(results)) return 0;
      if (results.length === 0) return 1; // At least 1 file was cleaned

      return results.filter(
        (r: { fix?: { applicability: string } }) =>
          r.fix?.applicability === 'safe' || r.fix?.applicability === 'unsafe'
      ).length;
    } catch {
      // Check stderr for "[*] N fix(es) made" pattern
      const match = stderr.match(/\[\*\]\s+(\d+)\s+fix/i);
      if (match) {
        return parseInt(match[1], 10);
      }
      return 0;
    }
  }
}

/**
 * Ruff Format Executor - Python formatting
 */
export class RuffFormatExecutor extends ToolExecutorBase {
  constructor() {
    super({
      name: 'ruff-format',
      command: 'ruff format',
      fixCommand: 'ruff format',
    });
  }

  protected getVersionCommand(): string {
    return 'ruff --version';
  }

  async executeFix(options: ToolExecutionOptions): Promise<ToolExecutionResult> {
    const command = this.buildFixCommand(this.config.fixCommand!, options.files);

    if (options.dryRun) {
      return {
        success: true,
        tool: this.config.name,
        command,
        exitCode: 0,
        stdout: '[DRY RUN] Would execute: ' + command,
        stderr: '',
        filesFixed: options.files || [],
        issuesFixed: 0,
        durationMs: 0,
      };
    }

    return this.executeCommand(command, options);
  }
}

/**
 * Go Format Executor - Go code formatting
 */
export class GoFmtExecutor extends ToolExecutorBase {
  constructor() {
    super({
      name: 'gofmt',
      command: 'gofmt',
      fixCommand: 'gofmt -w',
    });
  }

  protected getVersionCommand(): string {
    return 'go version';
  }

  async executeFix(options: ToolExecutionOptions): Promise<ToolExecutionResult> {
    const command = this.buildFixCommand(this.config.fixCommand!, options.files);

    if (options.dryRun) {
      return {
        success: true,
        tool: this.config.name,
        command,
        exitCode: 0,
        stdout: '[DRY RUN] Would execute: ' + command,
        stderr: '',
        filesFixed: options.files || [],
        issuesFixed: 0,
        durationMs: 0,
      };
    }

    return this.executeCommand(command, options);
  }
}

/**
 * Go Imports Executor - Go import management
 */
export class GoImportsExecutor extends ToolExecutorBase {
  constructor() {
    super({
      name: 'goimports',
      command: 'goimports',
      fixCommand: 'goimports -w',
    });
  }

  protected getVersionCommand(): string {
    return 'goimports --version 2>&1 || echo "goimports available"';
  }

  async executeFix(options: ToolExecutionOptions): Promise<ToolExecutionResult> {
    const command = this.buildFixCommand(this.config.fixCommand!, options.files);

    if (options.dryRun) {
      return {
        success: true,
        tool: this.config.name,
        command,
        exitCode: 0,
        stdout: '[DRY RUN] Would execute: ' + command,
        stderr: '',
        filesFixed: options.files || [],
        issuesFixed: 0,
        durationMs: 0,
      };
    }

    return this.executeCommand(command, options);
  }
}

/**
 * GolangCI-Lint Executor - Go comprehensive linting with fix
 */
export class GolangCILintExecutor extends ToolExecutorBase {
  constructor() {
    super({
      name: 'golangci-lint',
      command: 'golangci-lint run',
      fixCommand: 'golangci-lint run --fix',
    });
  }

  protected getVersionCommand(): string {
    return 'golangci-lint --version';
  }

  async executeFix(options: ToolExecutionOptions): Promise<ToolExecutionResult> {
    const command = this.buildFixCommand(
      `${this.config.fixCommand} --out-format json`,
      options.files
    );

    if (options.dryRun) {
      return {
        success: true,
        tool: this.config.name,
        command,
        exitCode: 0,
        stdout: '[DRY RUN] Would execute: ' + command,
        stderr: '',
        filesFixed: options.files || [],
        issuesFixed: 0,
        durationMs: 0,
      };
    }

    return this.executeCommand(command, options);
  }
}

/**
 * Rust Format Executor - Rust code formatting
 */
export class RustFmtExecutor extends ToolExecutorBase {
  constructor() {
    super({
      name: 'rustfmt',
      command: 'rustfmt',
      fixCommand: 'rustfmt',
    });
  }

  protected getVersionCommand(): string {
    return 'rustfmt --version';
  }

  async executeFix(options: ToolExecutionOptions): Promise<ToolExecutionResult> {
    const command = this.buildFixCommand(this.config.fixCommand!, options.files);

    if (options.dryRun) {
      return {
        success: true,
        tool: this.config.name,
        command,
        exitCode: 0,
        stdout: '[DRY RUN] Would execute: ' + command,
        stderr: '',
        filesFixed: options.files || [],
        issuesFixed: 0,
        durationMs: 0,
      };
    }

    return this.executeCommand(command, options);
  }
}

/**
 * Clippy Executor - Rust linting with auto-fix
 */
export class ClippyExecutor extends ToolExecutorBase {
  constructor() {
    super({
      name: 'clippy',
      command: 'cargo clippy',
      fixCommand: 'cargo clippy --fix --allow-dirty',
    });
  }

  protected getVersionCommand(): string {
    return 'cargo clippy --version';
  }

  async executeFix(options: ToolExecutionOptions): Promise<ToolExecutionResult> {
    // Clippy operates on the whole project, not individual files
    const command = `${this.config.fixCommand} --message-format json`;

    if (options.dryRun) {
      return {
        success: true,
        tool: this.config.name,
        command,
        exitCode: 0,
        stdout: '[DRY RUN] Would execute: ' + command,
        stderr: '',
        filesFixed: [],
        issuesFixed: 0,
        durationMs: 0,
      };
    }

    return this.executeCommand(command, options);
  }
}

/**
 * RuboCop Executor - Ruby linting with auto-fix
 */
export class RuboCopExecutor extends ToolExecutorBase {
  constructor() {
    super({
      name: 'rubocop',
      command: 'rubocop',
      fixCommand: 'rubocop --autocorrect',
    });
  }

  protected getVersionCommand(): string {
    return 'rubocop --version';
  }

  async executeFix(options: ToolExecutionOptions): Promise<ToolExecutionResult> {
    const command = this.buildFixCommand(
      `${this.config.fixCommand} --format json`,
      options.files
    );

    if (options.dryRun) {
      return {
        success: true,
        tool: this.config.name,
        command,
        exitCode: 0,
        stdout: '[DRY RUN] Would execute: ' + command,
        stderr: '',
        filesFixed: options.files || [],
        issuesFixed: 0,
        durationMs: 0,
      };
    }

    return this.executeCommand(command, options);
  }

  protected parseFixedFiles(stdout: string, _stderr: string): string[] {
    try {
      const result = JSON.parse(stdout);
      return result.files
        .filter((f: { offenses: { corrected: boolean }[] }) =>
          f.offenses.some(o => o.corrected)
        )
        .map((f: { path: string }) => f.path);
    } catch {
      return [];
    }
  }

  protected countFixedIssues(stdout: string, _stderr: string): number {
    try {
      const result = JSON.parse(stdout);
      return result.files.reduce(
        (total: number, f: { offenses: { corrected: boolean }[] }) =>
          total + f.offenses.filter(o => o.corrected).length,
        0
      );
    } catch {
      return 0;
    }
  }
}

/**
 * PHP CodeSniffer Fix Executor - PHP code style fixing
 */
export class PHPCBFExecutor extends ToolExecutorBase {
  constructor() {
    super({
      name: 'phpcbf',
      command: 'phpcbf',
      fixCommand: 'phpcbf',
    });
  }

  protected getVersionCommand(): string {
    return 'phpcbf --version';
  }

  async executeFix(options: ToolExecutionOptions): Promise<ToolExecutionResult> {
    const command = this.buildFixCommand(
      `${this.config.fixCommand} --report=json`,
      options.files
    );

    if (options.dryRun) {
      return {
        success: true,
        tool: this.config.name,
        command,
        exitCode: 0,
        stdout: '[DRY RUN] Would execute: ' + command,
        stderr: '',
        filesFixed: options.files || [],
        issuesFixed: 0,
        durationMs: 0,
      };
    }

    return this.executeCommand(command, options);
  }
}

/**
 * SwiftLint Executor - Swift linting with auto-fix
 */
export class SwiftLintExecutor extends ToolExecutorBase {
  constructor() {
    super({
      name: 'swiftlint',
      command: 'swiftlint lint',
      fixCommand: 'swiftlint lint --fix',
    });
  }

  protected getVersionCommand(): string {
    return 'swiftlint version';
  }

  async executeFix(options: ToolExecutionOptions): Promise<ToolExecutionResult> {
    const command = this.buildFixCommand(
      `${this.config.fixCommand} --reporter json`,
      options.files
    );

    if (options.dryRun) {
      return {
        success: true,
        tool: this.config.name,
        command,
        exitCode: 0,
        stdout: '[DRY RUN] Would execute: ' + command,
        stderr: '',
        filesFixed: options.files || [],
        issuesFixed: 0,
        durationMs: 0,
      };
    }

    return this.executeCommand(command, options);
  }
}

/**
 * ktlint Executor - Kotlin linting with auto-fix
 */
export class KtlintExecutor extends ToolExecutorBase {
  constructor() {
    super({
      name: 'ktlint',
      command: 'ktlint',
      fixCommand: 'ktlint --format',
    });
  }

  protected getVersionCommand(): string {
    return 'ktlint --version';
  }

  async executeFix(options: ToolExecutionOptions): Promise<ToolExecutionResult> {
    const command = this.buildFixCommand(
      `${this.config.fixCommand} --reporter=json`,
      options.files
    );

    if (options.dryRun) {
      return {
        success: true,
        tool: this.config.name,
        command,
        exitCode: 0,
        stdout: '[DRY RUN] Would execute: ' + command,
        stderr: '',
        filesFixed: options.files || [],
        issuesFixed: 0,
        durationMs: 0,
      };
    }

    return this.executeCommand(command, options);
  }
}

/**
 * Factory to create Tier 1 executors by tool name
 */
export function createTier1Executor(toolName: string): ToolExecutorBase | null {
  const executors: Record<string, () => ToolExecutorBase> = {
    'eslint': () => new ESLintExecutor(),
    'prettier': () => new PrettierExecutor(),
    'ruff': () => new RuffExecutor(),
    'ruff-format': () => new RuffFormatExecutor(),
    'gofmt': () => new GoFmtExecutor(),
    'goimports': () => new GoImportsExecutor(),
    'golangci-lint': () => new GolangCILintExecutor(),
    'rustfmt': () => new RustFmtExecutor(),
    'clippy': () => new ClippyExecutor(),
    'rubocop': () => new RuboCopExecutor(),
    'phpcbf': () => new PHPCBFExecutor(),
    'swiftlint': () => new SwiftLintExecutor(),
    'ktlint': () => new KtlintExecutor(),
  };

  const factory = executors[toolName];
  return factory ? factory() : null;
}

/**
 * Get all available Tier 1 tool names
 */
export function getTier1ToolNames(): string[] {
  return [
    'eslint',
    'prettier',
    'ruff',
    'ruff-format',
    'gofmt',
    'goimports',
    'golangci-lint',
    'rustfmt',
    'clippy',
    'rubocop',
    'phpcbf',
    'swiftlint',
    'ktlint',
  ];
}
