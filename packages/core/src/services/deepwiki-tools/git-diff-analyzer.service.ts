import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import * as path from 'path';
import { Logger } from '../../utils/logger';

const execAsync = promisify(exec);

export interface GitDiffResult {
  changedFiles: string[];
  fileContents: Map<string, string>;
  diffs: Map<string, string>;
  baseBranch: string;
  headBranch: string;
  commitRange: string;
}

export interface GitDiffOptions {
  baseBranch?: string;
  headBranch?: string;
  prNumber?: number;
  includeFileContents?: boolean;
}

/**
 * Service to analyze git diffs in cloned repositories
 * Works with repositories cloned by DeepWiki in the Kubernetes pod
 */
export class GitDiffAnalyzerService {
  constructor(private logger: Logger) {}

  /**
   * Get the repository path in the DeepWiki pod
   */
  getRepositoryPath(repositoryUrl: string): string {
    const match = repositoryUrl.match(/\/([^/]+?)(?:\.git)?$/);
    const repoName = match ? match[1] : 'repository';
    return `/workspace/${repoName}`;
  }

  /**
   * Analyze git diff for changed files in a PR
   * This runs inside the DeepWiki pod where the repository is cloned
   */
  async analyzeGitDiff(
    repositoryUrl: string,
    options: GitDiffOptions = {}
  ): Promise<GitDiffResult> {
    const repoPath = this.getRepositoryPath(repositoryUrl);
    const { baseBranch = 'main', headBranch = 'HEAD', includeFileContents = true } = options;

    try {
      // Ensure we're in the repository directory
      const cdCommand = `cd ${repoPath}`;
      
      // Fetch latest changes to ensure we have all branches
      await this.executeGitCommand(`${cdCommand} && git fetch --all`, repoPath);

      // Get the merge base between branches
      const mergeBase = await this.executeGitCommand(
        `${cdCommand} && git merge-base origin/${baseBranch} ${headBranch}`,
        repoPath
      );
      const mergeBaseSha = mergeBase.trim();

      // Get list of changed files
      const changedFilesOutput = await this.executeGitCommand(
        `${cdCommand} && git diff --name-only ${mergeBaseSha}...${headBranch}`,
        repoPath
      );
      const changedFiles = changedFilesOutput
        .split('\n')
        .filter(file => file.trim().length > 0);

      this.logger.info('Git diff analysis', {
        repositoryUrl,
        baseBranch,
        headBranch,
        mergeBase: mergeBaseSha,
        changedFilesCount: changedFiles.length
      });

      // Get file contents and diffs if requested
      const fileContents = new Map<string, string>();
      const diffs = new Map<string, string>();

      if (includeFileContents) {
        for (const file of changedFiles) {
          try {
            // Get current file content
            const content = await this.getFileContent(repoPath, file);
            if (content !== null) {
              fileContents.set(file, content);
            }

            // Get diff for the file
            const diff = await this.getFileDiff(repoPath, file, mergeBaseSha, headBranch);
            if (diff) {
              diffs.set(file, diff);
            }
          } catch (error) {
            this.logger.warn(`Failed to get content/diff for file: ${file}`, { error });
          }
        }
      }

      return {
        changedFiles,
        fileContents,
        diffs,
        baseBranch,
        headBranch,
        commitRange: `${mergeBaseSha}...${headBranch}`
      };
    } catch (error) {
      this.logger.error('Git diff analysis failed', {
        repositoryUrl,
        error: error instanceof Error ? error.message : String(error)
      });
      throw new Error(`Git diff analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get changed files for a specific directory pattern
   */
  async getChangedFilesByPattern(
    repositoryUrl: string,
    pattern: string,
    options: GitDiffOptions = {}
  ): Promise<string[]> {
    const result = await this.analyzeGitDiff(repositoryUrl, { ...options, includeFileContents: false });
    
    // Filter files by pattern (simple glob matching)
    const regex = new RegExp(pattern.replace(/\*/g, '.*'));
    return result.changedFiles.filter(file => regex.test(file));
  }

  /**
   * Get file content from the repository
   */
  private async getFileContent(repoPath: string, filePath: string): Promise<string | null> {
    try {
      const fullPath = path.join(repoPath, filePath);
      const content = await fs.readFile(fullPath, 'utf-8');
      return content;
    } catch (error) {
      // File might be deleted or not exist in current branch
      return null;
    }
  }

  /**
   * Get diff for a specific file
   */
  private async getFileDiff(
    repoPath: string,
    filePath: string,
    baseSha: string,
    headRef: string
  ): Promise<string> {
    try {
      const diff = await this.executeGitCommand(
        `cd ${repoPath} && git diff ${baseSha}...${headRef} -- ${filePath}`,
        repoPath
      );
      return diff;
    } catch (error) {
      return '';
    }
  }

  /**
   * Execute git command in the repository
   */
  private async executeGitCommand(command: string, cwd: string): Promise<string> {
    try {
      const { stdout, stderr } = await execAsync(command, { cwd });
      if (stderr) {
        this.logger.warn('Git command stderr', { command, stderr });
      }
      return stdout;
    } catch (error) {
      this.logger.error('Git command failed', {
        command,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Check if repository exists at the expected path
   */
  async isRepositoryAvailable(repositoryUrl: string): Promise<boolean> {
    const repoPath = this.getRepositoryPath(repositoryUrl);
    try {
      await fs.access(repoPath);
      // Also check if it's a git repository
      await this.executeGitCommand(`cd ${repoPath} && git status`, repoPath);
      return true;
    } catch {
      return false;
    }
  }
}