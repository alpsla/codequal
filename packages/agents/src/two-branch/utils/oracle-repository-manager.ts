/**
 * Oracle Repository Manager
 * Executes ARM analyzers directly on Oracle A1.Flex instance via SSH
 * 
 * This manager provides a direct execution alternative to Kubernetes,
 * leveraging the ARM analyzer images available on the Oracle instance.
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import { logger } from './logger';

const execAsync = promisify(exec);

export interface OracleWorkspace {
  workspaceId: string;
  repository: string;
  prNumber?: number;
  mainBranch: string;
  prBranch?: string;
  status: 'creating' | 'ready' | 'analyzing' | 'complete' | 'error';
  remotePath: string;
  filesCount: number;
  modifiedFiles: string[];
}

export interface OracleToolResult {
  tool: string;
  output: string;
  exitCode: number;
  duration: number;
  filesScanned: number;
}

export class OracleRepositoryManager {
  private oracleHost: string;
  private oracleUser: string;
  private sshKeyPath: string;
  private registryUrl: string;
  private workspaceBase: string;
  private useArmAnalyzers: boolean;

  constructor() {
    this.oracleHost = process.env.ORACLE_HOST || '129.213.49.128';
    this.oracleUser = process.env.ORACLE_USER || 'opc';
    this.sshKeyPath = process.env.ORACLE_SSH_KEY || 'keys/oracle/ssh-key-2025-05-08.key';
    this.registryUrl = process.env.ANALYZER_REGISTRY || 'registry.digitalocean.com/codequal-registry';
    this.workspaceBase = process.env.REMOTE_WORKSPACE_BASE || '/mnt/workspace';
    this.useArmAnalyzers = process.env.USE_ARM_ANALYZERS === 'true';
  }

  /**
   * Execute SSH command on Oracle instance
   */
  private async executeSSH(command: string, timeout = 300000): Promise<{ stdout: string; stderr: string; exitCode: number }> {
    const sshCommand = `ssh -o StrictHostKeyChecking=no -i ${this.sshKeyPath} ${this.oracleUser}@${this.oracleHost} "${command.replace(/"/g, '\\"')}"`;
    
    try {
      logger.info(`[Oracle] Executing: ${command.substring(0, 100)}...`);
      const { stdout, stderr } = await execAsync(sshCommand, { timeout });
      return { stdout, stderr, exitCode: 0 };
    } catch (error: any) {
      logger.error(`[Oracle] SSH command failed: ${error.message}`);
      return { 
        stdout: error.stdout || '', 
        stderr: error.stderr || error.message, 
        exitCode: error.code || 1 
      };
    }
  }

  /**
   * Setup repository on Oracle instance
   */
  async setupRepository(repoUrl: string, mainBranch = 'main'): Promise<OracleWorkspace> {
    logger.info(`[Oracle] Setting up repository on ARM instance: ${repoUrl}`);
    
    const workspaceId = `repo-${Date.now()}`;
    const remotePath = `${this.workspaceBase}/${workspaceId}`;
    
    // Clean setup: create workspace and clone repository
    const setupCommand = `
      echo "Creating workspace at ${remotePath}" &&
      mkdir -p ${remotePath} && 
      cd ${remotePath} && 
      echo "Cloning repository..." &&
      git clone ${repoUrl} repo && 
      cd repo && 
      git checkout ${mainBranch} &&
      echo "Counting files..." &&
      echo "FILE_COUNT_START" &&
      find . -type f -name "*.java" -o -name "*.py" -o -name "*.js" -o -name "*.ts" -o -name "*.go" -o -name "*.rs" -o -name "*.rb" -o -name "*.php" -o -name "*.cs" -o -name "*.kt" -o -name "*.swift" | wc -l &&
      echo "FILE_COUNT_END" &&
      echo "Repository setup complete"
    `;
    
    const result = await this.executeSSH(setupCommand, 600000); // 10 minute timeout for large repos
    
    if (result.exitCode !== 0) {
      throw new Error(`Failed to setup repository: ${result.stderr}`);
    }

    // Extract file count from output
    const fileCountMatch = result.stdout.match(/FILE_COUNT_START\s*(\d+)\s*FILE_COUNT_END/);
    const filesCount = fileCountMatch ? parseInt(fileCountMatch[1]) : 0;

    const workspace: OracleWorkspace = {
      workspaceId,
      repository: repoUrl,
      mainBranch,
      status: 'ready',
      remotePath: `${remotePath}/repo`,
      filesCount,
      modifiedFiles: []
    };

    logger.info(`[Oracle] Repository setup complete: ${workspace.workspaceId}`);
    logger.info(`[Oracle] Code files found: ${workspace.filesCount}`);
    logger.info(`[Oracle] Remote path: ${workspace.remotePath}`);

    return workspace;
  }

  /**
   * Create PR workspace on Oracle instance
   */
  async createPRWorkspace(repoUrl: string, prNumber: number): Promise<OracleWorkspace> {
    logger.info(`[Oracle] Creating PR workspace for PR #${prNumber}`);
    
    const workspaceId = `pr-${prNumber}-${Date.now()}`;
    const remotePath = `${this.workspaceBase}/${workspaceId}`;
    
    // Setup PR workspace with branch comparison
    const setupPRCommand = `
      echo "Creating PR workspace at ${remotePath}" &&
      mkdir -p ${remotePath} && 
      cd ${remotePath} && 
      echo "Cloning repository..." &&
      git clone ${repoUrl} repo && 
      cd repo && 
      echo "Fetching PR branch..." &&
      git fetch origin pull/${prNumber}/head:pr-${prNumber} &&
      git checkout pr-${prNumber} &&
      echo "Detecting default branch..." &&
      DEFAULT_BRANCH=$(git symbolic-ref refs/remotes/origin/HEAD 2>/dev/null | sed 's@^refs/remotes/origin/@@' || echo 'main') &&
      echo "Default branch: $DEFAULT_BRANCH" &&
      echo "Getting modified files..." &&
      git diff --name-only origin/$DEFAULT_BRANCH...HEAD | head -50 &&
      echo "FILE_COUNT_START" &&
      find . -type f -name "*.java" -o -name "*.py" -o -name "*.js" -o -name "*.ts" -o -name "*.go" -o -name "*.rs" -o -name "*.rb" -o -name "*.php" -o -name "*.cs" -o -name "*.kt" -o -name "*.swift" | wc -l &&
      echo "FILE_COUNT_END" &&
      echo "PR workspace setup complete"
    `;
    
    const result = await this.executeSSH(setupPRCommand, 600000);
    
    if (result.exitCode !== 0) {
      throw new Error(`Failed to setup PR workspace: ${result.stderr}`);
    }

    // Extract file count and modified files
    const fileCountMatch = result.stdout.match(/FILE_COUNT_START\s*(\d+)\s*FILE_COUNT_END/);
    const filesCount = fileCountMatch ? parseInt(fileCountMatch[1]) : 0;
    
    const modifiedFiles = result.stdout
      .split('\n')
      .filter(line => line.includes('.') && !line.includes('FILE_COUNT') && !line.includes('echo'))
      .filter(line => line.match(/\.(java|py|js|ts|go|rs|rb|php|cs|kt|swift)$/))
      .slice(0, 50); // Limit to 50 files

    const workspace: OracleWorkspace = {
      workspaceId,
      repository: repoUrl,
      prNumber,
      mainBranch: 'main', // Will be detected automatically
      prBranch: `pr-${prNumber}`,
      status: 'ready',
      remotePath: `${remotePath}/repo`,
      filesCount,
      modifiedFiles
    };

    logger.info(`[Oracle] PR workspace created: ${workspace.workspaceId}`);
    logger.info(`[Oracle] Modified files in PR: ${workspace.modifiedFiles.length}`);
    logger.info(`[Oracle] Total code files: ${workspace.filesCount}`);

    return workspace;
  }

  /**
   * Run ARM analyzer tools directly on Oracle instance
   */
  async runToolsOnOracle(
    workspace: OracleWorkspace,
    tools: string[],
    language: string
  ): Promise<OracleToolResult[]> {
    logger.info(`[Oracle] Running ${tools.length} ARM tools for ${language}`);
    
    const results: OracleToolResult[] = [];

    // Get the ARM analyzer image for the language
    const imageTag = this.getAnalyzerImageTag(language);
    const fullImageName = `${this.registryUrl}/analyzer:${imageTag}`;

    logger.info(`[Oracle] Using ARM analyzer: ${fullImageName}`);

    // Run tools sequentially to avoid resource conflicts on ARM instance
    for (const tool of tools) {
      const startTime = Date.now();
      
      const dockerCommand = `
        cd ${workspace.remotePath} &&
        echo "Running ${tool} with ARM analyzer..." &&
        docker run --rm --platform=linux/arm64 \\
          -v "$(pwd):/workspace" \\
          -w /workspace \\
          --memory=2g \\
          --cpus=1 \\
          ${fullImageName} \\
          sh -c "${this.getToolCommand(tool, language)}" 2>&1 || true
      `;

      logger.info(`[Oracle] Executing ${tool} on ${language} code...`);
      const result = await this.executeSSH(dockerCommand, 1200000); // 20 minute timeout
      const duration = Date.now() - startTime;

      // Count files scanned (estimate based on tool output)
      const filesScanned = this.estimateFilesScanned(result.stdout, tool);

      results.push({
        tool,
        output: result.stdout,
        exitCode: result.exitCode,
        duration,
        filesScanned
      });

      logger.info(`[Oracle] ${tool} completed in ${(duration/1000).toFixed(1)}s, exit code: ${result.exitCode}`);
      
      if (result.stdout.length > 1000) {
        logger.info(`[Oracle] ${tool} output: ${result.stdout.substring(0, 500)}...`);
      } else {
        logger.info(`[Oracle] ${tool} output: ${result.stdout}`);
      }
    }

    logger.info(`[Oracle] All ${tools.length} tools completed on ARM instance`);
    return results;
  }

  /**
   * Get ARM analyzer image tag for language
   */
  private getAnalyzerImageTag(language: string): string {
    const armImageMap: Record<string, string> = {
      'java': 'lang-java-v5.1-arm',
      'python': 'lang-python-v4.3-arm',
      'javascript': 'lang-javascript-v4.2-arm',
      'typescript': 'lang-typescript-v4.2-arm',
      'go': 'lang-go-v3.8-arm',
      'rust': 'lang-rust-v2.9-arm',
      'ruby': 'lang-ruby-v3.5-arm',
      'php': 'lang-php-v3.4-arm',
      'csharp': 'lang-csharp-v3.2-arm',
      'kotlin': 'lang-kotlin-v2.5-arm',
      'swift': 'lang-swift-v2.7-arm'
    };

    const tag = armImageMap[language];
    if (!tag) {
      throw new Error(`No ARM analyzer image available for language: ${language}`);
    }
    
    return tag;
  }

  /**
   * Get tool-specific command for analysis
   */
  private getToolCommand(tool: string, language: string): string {
    const toolCommands: Record<string, Record<string, string>> = {
      java: {
        'pmd': 'pmd pmd -d . --exclude "*/test/*,*/tests/*" -R category/java/errorprone.xml,category/java/security.xml,category/java/bestpractices.xml -f text',
        'checkstyle': 'find . -name "*.java" -not -path "*/test/*" -not -path "*/tests/*" | head -500 | xargs checkstyle -c /google_checks.xml',
        'semgrep': 'semgrep --config=java.lang.security --exclude="*test*" --json --no-error --quiet .'
      },
      python: {
        'bandit': 'bandit -r . -f json --exclude "*/test*,*/tests/*"',
        'pylint': 'find . -name "*.py" -not -path "*/test*" | head -100 | xargs pylint --output-format=json --disable=all --enable=W,E,F',
        'mypy': 'find . -name "*.py" -not -path "*/test*" | head -50 | xargs mypy --ignore-missing-imports'
      },
      javascript: {
        'eslint': 'find . -name "*.js" -o -name "*.jsx" | head -200 | xargs eslint --format=json',
        'tsc': 'tsc --noEmit --skipLibCheck'
      },
      go: {
        'staticcheck': 'staticcheck ./... | head -500',
        'gosec': 'gosec -fmt=json ./... | head -1000'
      }
    };

    const langCommands = toolCommands[language];
    if (!langCommands) {
      return `echo "No commands configured for language: ${language}"`;
    }

    const command = langCommands[tool];
    if (!command) {
      return `echo "No command configured for tool: ${tool} in ${language}"`;
    }

    return command;
  }

  /**
   * Estimate files scanned based on tool output
   */
  private estimateFilesScanned(output: string, tool: string): number {
    // Simple estimation - could be improved with tool-specific parsing
    const lines = output.split('\n').filter(line => line.trim().length > 0).length;
    
    // Different tools have different output patterns
    if (tool === 'pmd' || tool === 'checkstyle') {
      // These typically output one line per issue
      return Math.max(1, Math.floor(lines / 2));
    } else if (tool === 'semgrep' || tool === 'bandit') {
      // JSON output, fewer lines
      return Math.max(1, Math.floor(lines / 10));
    } else {
      // Default estimation
      return Math.max(1, Math.floor(lines / 5));
    }
  }

  /**
   * Cleanup workspace on Oracle instance
   */
  async cleanupWorkspace(workspaceId: string): Promise<void> {
    logger.info(`[Oracle] Cleaning up workspace: ${workspaceId}`);
    
    const cleanupCommand = `rm -rf ${this.workspaceBase}/${workspaceId}`;
    const result = await this.executeSSH(cleanupCommand);
    
    if (result.exitCode !== 0) {
      logger.warn(`[Oracle] Failed to cleanup workspace: ${result.stderr}`);
    } else {
      logger.info(`[Oracle] Workspace cleaned up: ${workspaceId}`);
    }
  }

  /**
   * Get workspace files (for debugging/verification)
   */
  async getWorkspaceFiles(workspace: OracleWorkspace, pattern?: string): Promise<string[]> {
    logger.info(`[Oracle] Listing files in workspace: ${workspace.workspaceId}`);
    
    const findCommand = pattern 
      ? `find ${workspace.remotePath} -name "${pattern}" -type f | head -100`
      : `find ${workspace.remotePath} -type f -name "*.java" -o -name "*.py" -o -name "*.js" -o -name "*.ts" | head -50`;
    
    const result = await this.executeSSH(findCommand);
    
    if (result.exitCode !== 0) {
      logger.warn(`[Oracle] Failed to list files: ${result.stderr}`);
      return [];
    }

    return result.stdout
      .split('\n')
      .filter(line => line.trim().length > 0)
      .map(line => line.replace(workspace.remotePath, '').replace(/^\//, ''));
  }
}