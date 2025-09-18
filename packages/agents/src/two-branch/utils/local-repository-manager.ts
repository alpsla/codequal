/**
 * Local Repository Manager
 *
 * Handles all repository operations locally:
 * - Cloning repositories from GitHub
 * - Creating PR workspaces
 * - Running tools directly on cloned code
 * - Managing local file system
 *
 * ALL operations happen locally, NO simulation
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';
import { logger } from './logger';

const execAsync = promisify(exec);

export interface LocalWorkspace {
  workspaceId: string;
  repository: string;
  prNumber: number;
  mainBranch: string;
  prBranch: string;
  status: 'creating' | 'ready' | 'analyzing' | 'complete' | 'error';
  localPath: string;
  filesCount: number;
  modifiedFiles: string[];
}

export interface LocalToolResult {
  tool: string;
  output: string;
  exitCode: number;
  duration: number;
  filesScanned: number;
}

export class LocalRepositoryManager {
  private workspaceRoot: string;

  constructor() {
    // Use local temp directory for workspaces
    this.workspaceRoot = process.env.WORKSPACE_ROOT || '/tmp/codequal/workspaces';

    // Ensure workspace directory exists
    if (!fs.existsSync(this.workspaceRoot)) {
      fs.mkdirSync(this.workspaceRoot, { recursive: true });
    }
  }

  /**
   * Clone repository locally
   */
  async setupRepository(repoUrl: string, mainBranch: string = 'main'): Promise<LocalWorkspace> {
    logger.info(`[Local] Cloning repository: ${repoUrl}`);

    const repoName = this.extractRepoName(repoUrl);
    const workspaceId = `local-${repoName}-${Date.now()}`;
    const localPath = path.join(this.workspaceRoot, workspaceId);

    try {
      // Clone the repository
      const gitUrl = this.convertToGitUrl(repoUrl);
      logger.info(`[Local] Cloning from: ${gitUrl} to ${localPath}`);

      await execAsync(`git clone --depth 1 --branch ${mainBranch} ${gitUrl} ${localPath}`);

      // Count files
      const { stdout: fileCount } = await execAsync(`find ${localPath} -type f -name "*.java" | wc -l`);
      const filesCount = parseInt(fileCount.trim(), 10);

      logger.info(`[Local] Repository cloned successfully: ${filesCount} Java files found`);

      return {
        workspaceId,
        repository: repoUrl,
        prNumber: 0,
        mainBranch,
        prBranch: '',
        status: 'ready',
        localPath,
        filesCount,
        modifiedFiles: []
      };
    } catch (error) {
      logger.error(`[Local] Failed to clone repository: ${error.message}`);
      throw error;
    }
  }

  /**
   * Create PR workspace by checking out PR branch
   */
  async createPRWorkspace(repoUrl: string, prNumber: number): Promise<LocalWorkspace> {
    logger.info(`[Local] Creating PR workspace for PR #${prNumber}`);

    const repoName = this.extractRepoName(repoUrl);
    const workspaceId = `local-pr-${prNumber}-${Date.now()}`;
    const localPath = path.join(this.workspaceRoot, workspaceId);

    try {
      // Clone the repository
      const gitUrl = this.convertToGitUrl(repoUrl);
      logger.info(`[Local] Cloning repository for PR #${prNumber}`);

      await execAsync(`git clone ${gitUrl} ${localPath}`);

      // Determine default branch
      const { stdout: defaultBranch } = await execAsync(
        `cd ${localPath} && git symbolic-ref refs/remotes/origin/HEAD | sed 's@^refs/remotes/origin/@@'`
      );
      const mainBranch = defaultBranch.trim() || 'main';

      // Fetch PR branch
      await execAsync(`cd ${localPath} && git fetch origin pull/${prNumber}/head:pr-${prNumber}`);
      await execAsync(`cd ${localPath} && git checkout pr-${prNumber}`);

      // Get modified files
      const { stdout: diffOutput } = await execAsync(
        `cd ${localPath} && git diff --name-only origin/${mainBranch}...HEAD`
      );
      const modifiedFiles = diffOutput.trim().split('\n').filter(f => f);

      // Count files
      const { stdout: fileCount } = await execAsync(`find ${localPath} -type f -name "*.java" | wc -l`);
      const filesCount = parseInt(fileCount.trim(), 10);

      logger.info(`[Local] PR workspace ready: ${modifiedFiles.length} files modified`);

      return {
        workspaceId,
        repository: repoUrl,
        prNumber,
        mainBranch,
        prBranch: `pr-${prNumber}`,
        status: 'ready',
        localPath,
        filesCount,
        modifiedFiles
      };
    } catch (error) {
      logger.error(`[Local] Failed to create PR workspace: ${error.message}`);
      throw error;
    }
  }

  /**
   * Run tools locally on cloned repository
   */
  async runToolsLocally(
    workspaceId: string,
    tools: string[],
    language: string
  ): Promise<LocalToolResult[]> {
    logger.info(`[Local] Running ${tools.length} tools for ${language} locally`);

    const workspace = await this.getWorkspace(workspaceId);
    if (!workspace) {
      throw new Error(`Workspace ${workspaceId} not found`);
    }

    const results: LocalToolResult[] = [];

    for (const tool of tools) {
      const startTime = Date.now();
      logger.info(`[Local] Running ${tool} on ${workspace.localPath}`);

      try {
        const output = await this.runTool(tool, workspace.localPath, language);
        results.push({
          tool,
          output: output.stdout || output.stderr || 'No output',
          exitCode: 0,
          duration: Date.now() - startTime,
          filesScanned: workspace.filesCount
        });
      } catch (error) {
        logger.error(`[Local] Tool ${tool} failed: ${error.message}`);
        results.push({
          tool,
          output: error.message,
          exitCode: 1,
          duration: Date.now() - startTime,
          filesScanned: 0
        });
      }
    }

    logger.info(`[Local] Tools execution complete: ${results.length} results`);
    return results;
  }

  /**
   * Run a specific tool on the repository
   */
  private async runTool(tool: string, repoPath: string, language: string): Promise<any> {
    let command: string;

    switch (tool) {
      case 'spotbugs':
        // SpotBugs for Java
        command = `cd ${repoPath} && spotbugs -textui -effort:max -low . 2>&1 || true`;
        break;

      case 'pmd-quality':
        // PMD for code quality
        command = `cd ${repoPath} && pmd check -d . -R rulesets/java/quickstart.xml -f text 2>&1 || true`;
        break;

      case 'pmd-performance':
        // PMD for performance
        command = `cd ${repoPath} && pmd check -d . -R rulesets/java/performance.xml -f text 2>&1 || true`;
        break;

      case 'pmd-architecture':
        // PMD for architecture
        command = `cd ${repoPath} && pmd check -d . -R rulesets/java/design.xml -f text 2>&1 || true`;
        break;

      case 'checkstyle':
        // Checkstyle for Java
        command = `cd ${repoPath} && checkstyle -c /google_checks.xml **/*.java 2>&1 || true`;
        break;

      case 'semgrep':
        // Semgrep for security
        command = `cd ${repoPath} && semgrep --config=auto --json 2>&1 || true`;
        break;

      case 'dependency-check':
        // OWASP Dependency Check
        command = `cd ${repoPath} && dependency-check --scan . --format JSON 2>&1 || true`;
        break;

      default:
        // Default to echo for unknown tools
        command = `echo "Tool ${tool} not implemented yet"`;
    }

    try {
      const result = await execAsync(command);
      return { stdout: result.stdout, stderr: result.stderr };
    } catch (error) {
      // Tools often exit with non-zero even when finding issues
      return { stdout: error.stdout || '', stderr: error.stderr || error.message };
    }
  }

  /**
   * Get files from local workspace
   */
  async getWorkspaceFiles(workspaceId: string, pattern?: string): Promise<string[]> {
    logger.info(`[Local] Getting files from workspace: ${workspaceId}`);

    const workspace = await this.getWorkspace(workspaceId);
    if (!workspace) {
      return [];
    }

    try {
      const findPattern = pattern || '*.java';
      const { stdout } = await execAsync(
        `find ${workspace.localPath} -type f -name "${findPattern}"`
      );

      const files = stdout.trim().split('\n').filter(f => f);
      logger.info(`[Local] Retrieved ${files.length} files from local workspace`);

      return files;
    } catch (error) {
      logger.error(`[Local] Failed to get files: ${error.message}`);
      return [];
    }
  }

  /**
   * Clean up local workspace after analysis
   */
  async cleanupWorkspace(workspaceId: string): Promise<void> {
    logger.info(`[Local] Cleaning up workspace: ${workspaceId}`);

    const workspace = await this.getWorkspace(workspaceId);
    if (!workspace) {
      return;
    }

    try {
      await execAsync(`rm -rf ${workspace.localPath}`);
      logger.info(`[Local] Workspace cleaned up successfully`);
    } catch (error) {
      logger.error(`[Local] Failed to cleanup workspace: ${error.message}`);
    }
  }

  /**
   * Get workspace by ID
   */
  private async getWorkspace(workspaceId: string): Promise<LocalWorkspace | null> {
    const workspacePath = path.join(this.workspaceRoot, workspaceId);

    if (!fs.existsSync(workspacePath)) {
      return null;
    }

    // Return a basic workspace object
    return {
      workspaceId,
      repository: '',
      prNumber: 0,
      mainBranch: 'main',
      prBranch: '',
      status: 'ready',
      localPath: workspacePath,
      filesCount: 0,
      modifiedFiles: []
    };
  }

  /**
   * Extract repository name from URL
   */
  private extractRepoName(repoUrl: string): string {
    const parts = repoUrl.replace(/\.git$/, '').split('/');
    return parts.slice(-2).join('-');
  }

  /**
   * Convert repository URL to git URL
   */
  private convertToGitUrl(repoUrl: string): string {
    if (repoUrl.startsWith('https://github.com/')) {
      return repoUrl.endsWith('.git') ? repoUrl : `${repoUrl}.git`;
    }

    // Handle shorthand format
    if (repoUrl.includes('/') && !repoUrl.includes('://')) {
      return `https://github.com/${repoUrl}.git`;
    }

    return repoUrl;
  }
}

export default LocalRepositoryManager;