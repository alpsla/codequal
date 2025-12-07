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

/**
 * Factory to create Tier 2 executors by tool name
 */
export function createTier2Executor(toolName: string): ToolExecutorBase | null {
  const executors: Record<string, () => ToolExecutorBase> = {
    'sorald': () => new SoraldExecutor(),
    'openrewrite': () => new OpenRewriteExecutor(),
    'autoflake': () => new AutoflakeExecutor(),
    'pyupgrade': () => new PyUpgradeExecutor(),
    'isort': () => new IsortExecutor(),
    'black': () => new BlackExecutor(),
    'clang-tidy': () => new ClangTidyExecutor(),
    'clang-format': () => new ClangFormatExecutor(),
    'dotnet-format': () => new DotnetFormatExecutor(),
  };

  const factory = executors[toolName];
  return factory ? factory() : null;
}

/**
 * Get all available Tier 2 tool names
 */
export function getTier2ToolNames(): string[] {
  return [
    'sorald',
    'openrewrite',
    'autoflake',
    'pyupgrade',
    'isort',
    'black',
    'clang-tidy',
    'clang-format',
    'dotnet-format',
  ];
}
