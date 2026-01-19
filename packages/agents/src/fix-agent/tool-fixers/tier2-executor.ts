/**
 * Tier 2 Executor - Dedicated Fixer Tools
 *
 * Executes dedicated fixer tools that handle specific issue types:
 * - Sorald (Java SonarQube rules)
 * - OpenRewrite (Java refactoring)
 * - Autoflake (Python unused imports/variables)
 * - PyUpgrade (Python version upgrades)
 * - isort (Python import sorting)
 * - Black (Python formatting)
 */

import {
  ToolExecutorBase,
  ToolExecutionResult,
  ToolExecutionOptions,
  ToolConfig,
} from './tool-executor-base';

/**
 * Sorald Executor - Repairs SonarQube violations in Java
 */
export class SoraldExecutor extends ToolExecutorBase {
  constructor() {
    super({
      name: 'sorald',
      command: 'sorald repair',
      fixCommand: 'sorald repair',
    });
  }

  protected getVersionCommand(): string {
    return 'sorald --version';
  }

  async executeFix(options: ToolExecutionOptions): Promise<ToolExecutionResult> {
    // Sorald requires specific rule IDs to fix
    const command = `${this.config.fixCommand} --source "${options.workingDir}" --stats-output-file /tmp/sorald-stats.json`;

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

  protected parseFixedFiles(_stdout: string, stderr: string): string[] {
    // Sorald logs fixed files to stderr
    const matches = stderr.match(/Fixed: (.+\.java)/g) || [];
    return matches.map(m => m.replace('Fixed: ', ''));
  }

  protected countFixedIssues(_stdout: string, stderr: string): number {
    const match = stderr.match(/Total fixes: (\d+)/);
    return match ? parseInt(match[1], 10) : 0;
  }
}

/**
 * OpenRewrite Executor - Recipe-based Java refactoring
 */
export class OpenRewriteExecutor extends ToolExecutorBase {
  constructor() {
    super({
      name: 'openrewrite',
      command: 'mvn org.openrewrite.maven:rewrite-maven-plugin:run',
      fixCommand: 'mvn org.openrewrite.maven:rewrite-maven-plugin:run',
    });
  }

  protected getVersionCommand(): string {
    return 'mvn org.openrewrite.maven:rewrite-maven-plugin:help';
  }

  async executeFix(options: ToolExecutionOptions): Promise<ToolExecutionResult> {
    // OpenRewrite uses recipes defined in pom.xml or as CLI args
    const command = `${this.config.fixCommand} -f "${options.workingDir}/pom.xml"`;

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

    return this.executeCommand(command, { ...options, timeout: 300000 }); // 5 min timeout
  }
}

/**
 * Autoflake Executor - Remove unused imports and variables in Python
 */
export class AutoflakeExecutor extends ToolExecutorBase {
  constructor() {
    super({
      name: 'autoflake',
      command: 'autoflake',
      fixCommand: 'autoflake --in-place --remove-all-unused-imports --remove-unused-variables',
    });
  }

  protected getVersionCommand(): string {
    return 'autoflake --version';
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
 * PyUpgrade Executor - Upgrade Python syntax to newer versions
 */
export class PyUpgradeExecutor extends ToolExecutorBase {
  constructor() {
    super({
      name: 'pyupgrade',
      command: 'pyupgrade',
      fixCommand: 'pyupgrade --py310-plus', // Default to Python 3.10+
    });
  }

  protected getVersionCommand(): string {
    return 'pyupgrade --version';
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
 * isort Executor - Python import sorting
 */
export class IsortExecutor extends ToolExecutorBase {
  constructor() {
    super({
      name: 'isort',
      command: 'isort',
      fixCommand: 'isort',
    });
  }

  protected getVersionCommand(): string {
    return 'isort --version';
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

  protected parseFixedFiles(stdout: string, _stderr: string): string[] {
    const matches = stdout.match(/Fixing (.+\.py)/g) || [];
    return matches.map(m => m.replace('Fixing ', ''));
  }
}

/**
 * Black Executor - Python code formatter
 */
export class BlackExecutor extends ToolExecutorBase {
  constructor() {
    super({
      name: 'black',
      command: 'black',
      fixCommand: 'black',
    });
  }

  protected getVersionCommand(): string {
    return 'black --version';
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
    const matches = stderr.match(/reformatted (.+\.py)/g) || [];
    return matches.map(m => m.replace('reformatted ', ''));
  }

  protected countFixedIssues(_stdout: string, stderr: string): number {
    const match = stderr.match(/(\d+) files? reformatted/);
    return match ? parseInt(match[1], 10) : 0;
  }
}

/**
 * Clang-Tidy Executor - C/C++ linting and fixing
 */
export class ClangTidyExecutor extends ToolExecutorBase {
  constructor() {
    super({
      name: 'clang-tidy',
      command: 'clang-tidy',
      fixCommand: 'clang-tidy --fix',
    });
  }

  protected getVersionCommand(): string {
    return 'clang-tidy --version';
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
 * Clang-Format Executor - C/C++ formatting
 */
export class ClangFormatExecutor extends ToolExecutorBase {
  constructor() {
    super({
      name: 'clang-format',
      command: 'clang-format',
      fixCommand: 'clang-format -i',
    });
  }

  protected getVersionCommand(): string {
    return 'clang-format --version';
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
 * dotnet-format Executor - C# code formatting
 */
export class DotnetFormatExecutor extends ToolExecutorBase {
  constructor() {
    super({
      name: 'dotnet-format',
      command: 'dotnet format',
      fixCommand: 'dotnet format',
    });
  }

  protected getVersionCommand(): string {
    return 'dotnet format --version';
  }

  async executeFix(options: ToolExecutionOptions): Promise<ToolExecutionResult> {
    const command = `${this.config.fixCommand} "${options.workingDir}"`;

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

// ============================================================================
// SESSION 102: Native Linter --fix Executors
// These run native tool --fix commands before falling back to AI
// ============================================================================

/**
 * ESLint Executor - TypeScript/JavaScript linting and fixing
 * Auto-fixes: formatting rules (semi, quotes, indent), import order
 * NOT auto-fixable: @typescript-eslint/no-explicit-any (needs AI)
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

  protected parseFixedFiles(stdout: string, _stderr: string): string[] {
    // ESLint doesn't explicitly list fixed files, assume all input files
    return [];
  }
}

/**
 * Ruff Executor - Python linting and fixing (Rust-based, fast)
 * Auto-fixes: F632 (is vs ==), F401 (unused imports), formatting
 * With --unsafe-fixes: E711, E712 (None/True/False comparisons)
 */
export class RuffExecutor extends ToolExecutorBase {
  private useUnsafeFixes: boolean;

  constructor(useUnsafeFixes = false) {
    super({
      name: 'ruff',
      command: 'ruff check',
      fixCommand: useUnsafeFixes ? 'ruff check --fix --unsafe-fixes' : 'ruff check --fix',
    });
    this.useUnsafeFixes = useUnsafeFixes;
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

  protected countFixedIssues(_stdout: string, stderr: string): number {
    // Ruff outputs "Found X errors (Y fixed, Z remaining)"
    const match = stderr.match(/\((\d+) fixed/);
    return match ? parseInt(match[1], 10) : 0;
  }
}

/**
 * Gofmt Executor - Go code formatting
 * Auto-fixes: ALL formatting issues (indentation, spacing, braces)
 */
export class GofmtExecutor extends ToolExecutorBase {
  constructor() {
    super({
      name: 'gofmt',
      command: 'gofmt',
      fixCommand: 'gofmt -w',
    });
  }

  protected getVersionCommand(): string {
    return 'go version'; // gofmt doesn't have --version
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
 * Goimports Executor - Go import organization and formatting
 * Auto-fixes: unused imports, import ordering, AND all gofmt issues
 */
export class GoimportsExecutor extends ToolExecutorBase {
  constructor() {
    super({
      name: 'goimports',
      command: 'goimports',
      fixCommand: 'goimports -w',
    });
  }

  protected getVersionCommand(): string {
    return 'goimports --help'; // goimports doesn't have --version
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
 * Google Java Format Executor - Java code formatting
 * Auto-fixes: ALL formatting issues per Google Java Style Guide
 * NOT available for: semantic issues (UselessParentheses needs AI)
 */
export class GoogleJavaFormatExecutor extends ToolExecutorBase {
  constructor() {
    super({
      name: 'google-java-format',
      command: 'google-java-format',
      fixCommand: 'google-java-format --replace',
    });
  }

  protected getVersionCommand(): string {
    return 'google-java-format --version';
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
 * Golangci-lint Executor - Go multi-linter with limited --fix support
 * Auto-fixes: formatting, some simple linter issues
 * NOT auto-fixable: errcheck, unused (semantic issues need AI)
 */
export class GolangciLintExecutor extends ToolExecutorBase {
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
    const command = `${this.config.fixCommand} "${options.workingDir}"`;

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

// ============================================================================
// End SESSION 102 additions
// ============================================================================

/**
 * Factory to create Tier 2 executors by tool name
 */
export function createTier2Executor(toolName: string): ToolExecutorBase | null {
  const executors: Record<string, () => ToolExecutorBase> = {
    // Original dedicated fixers
    'sorald': () => new SoraldExecutor(),
    'openrewrite': () => new OpenRewriteExecutor(),
    'autoflake': () => new AutoflakeExecutor(),
    'pyupgrade': () => new PyUpgradeExecutor(),
    'isort': () => new IsortExecutor(),
    'black': () => new BlackExecutor(),
    'clang-tidy': () => new ClangTidyExecutor(),
    'clang-format': () => new ClangFormatExecutor(),
    'dotnet-format': () => new DotnetFormatExecutor(),
    // SESSION 102: Native linter --fix tools
    'eslint': () => new ESLintExecutor(),
    'ruff': () => new RuffExecutor(false),
    'ruff-unsafe': () => new RuffExecutor(true),
    'gofmt': () => new GofmtExecutor(),
    'goimports': () => new GoimportsExecutor(),
    'google-java-format': () => new GoogleJavaFormatExecutor(),
    'golangci-lint': () => new GolangciLintExecutor(),
  };

  const factory = executors[toolName];
  return factory ? factory() : null;
}

/**
 * Get all available Tier 2 tool names
 */
export function getTier2ToolNames(): string[] {
  return [
    // Original dedicated fixers
    'sorald',
    'openrewrite',
    'autoflake',
    'pyupgrade',
    'isort',
    'black',
    'clang-tidy',
    'clang-format',
    'dotnet-format',
    // SESSION 102: Native linter --fix tools
    'eslint',
    'ruff',
    'ruff-unsafe',
    'gofmt',
    'goimports',
    'google-java-format',
    'golangci-lint',
  ];
}

/**
 * SESSION 102: Get recommended Tier 2 fixer for a language/tool combination
 * Returns the native --fix tool that should be tried before AI
 */
export function getRecommendedTier2Fixer(language: string, sourceTool: string): string | null {
  const recommendations: Record<string, Record<string, string>> = {
    typescript: {
      eslint: 'eslint',
      '@typescript-eslint': 'eslint',
    },
    javascript: {
      eslint: 'eslint',
    },
    python: {
      ruff: 'ruff',
      flake8: 'autoflake', // flake8 issues often fixable by autoflake
      pylint: 'black', // formatting issues
      mypy: 'ruff', // type issues not fixable but ruff catches related
    },
    go: {
      golangci: 'golangci-lint',
      'golangci-lint': 'golangci-lint',
      staticcheck: 'gofmt', // format first
      govet: 'gofmt',
    },
    java: {
      pmd: null, // PMD rules NOT auto-fixable
      checkstyle: 'google-java-format', // formatting only
      spotbugs: null, // NOT auto-fixable
    },
  };

  const langRecs = recommendations[language.toLowerCase()];
  if (!langRecs) return null;

  return langRecs[sourceTool.toLowerCase()] || null;
}
