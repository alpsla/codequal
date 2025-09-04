/**
 * Git Diff Service
 * 
 * Retrieves git diff information for pull requests
 * Uses GitHub API to get changed files and line ranges
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import axios from 'axios';
import { GitDiffResult } from './issue-comparison-service';

const execAsync = promisify(exec);

export interface GitHubPRInfo {
  owner: string;
  repo: string;
  prNumber: number;
}

export class GitDiffService {
  private githubToken: string | undefined;

  constructor(githubToken?: string) {
    this.githubToken = githubToken || process.env.GITHUB_TOKEN;
  }

  /**
   * Get changed files for a PR using GitHub API
   */
  async getChangedFiles(repoUrl: string, prNumber: number): Promise<string[]> {
    const prInfo = this.parseGitHubUrl(repoUrl, prNumber);
    
    if (this.githubToken) {
      // Use GitHub API
      return this.getChangedFilesViaAPI(prInfo);
    } else {
      // Fallback to git commands
      return this.getChangedFilesViaGit(prInfo);
    }
  }

  /**
   * Get detailed diff information for a PR
   */
  async getDiffDetails(repoUrl: string, prNumber: number): Promise<GitDiffResult> {
    const prInfo = this.parseGitHubUrl(repoUrl, prNumber);
    
    if (this.githubToken) {
      return this.getDiffViaAPI(prInfo);
    } else {
      return this.getDiffViaGit(prInfo);
    }
  }

  /**
   * Get changed files using GitHub API
   */
  private async getChangedFilesViaAPI(prInfo: GitHubPRInfo): Promise<string[]> {
    try {
      const url = `https://api.github.com/repos/${prInfo.owner}/${prInfo.repo}/pulls/${prInfo.prNumber}/files`;
      
      const response = await axios.get(url, {
        headers: {
          'Authorization': `token ${this.githubToken}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      });

      return response.data.map((file: any) => file.filename);
    } catch (error: any) {
      console.error(`Failed to get changed files via API: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get detailed diff using GitHub API
   */
  private async getDiffViaAPI(prInfo: GitHubPRInfo): Promise<GitDiffResult> {
    try {
      const url = `https://api.github.com/repos/${prInfo.owner}/${prInfo.repo}/pulls/${prInfo.prNumber}/files`;
      
      const response = await axios.get(url, {
        headers: {
          'Authorization': `token ${this.githubToken}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      });

      const changedFiles: string[] = [];
      const addedFiles: string[] = [];
      const deletedFiles: string[] = [];
      const modifiedFiles: string[] = [];
      const renamedFiles: Array<{ from: string; to: string }> = [];
      const fileChanges = new Map<string, any>();

      response.data.forEach((file: any) => {
        changedFiles.push(file.filename);

        // Categorize by status
        switch (file.status) {
          case 'added':
            addedFiles.push(file.filename);
            break;
          case 'removed':
            deletedFiles.push(file.filename);
            break;
          case 'modified':
            modifiedFiles.push(file.filename);
            break;
          case 'renamed':
            renamedFiles.push({
              from: file.previous_filename,
              to: file.filename
            });
            break;
        }

        // Parse patch to get line changes
        if (file.patch) {
          const changes = this.parsePatch(file.patch);
          fileChanges.set(file.filename, {
            additions: file.additions,
            deletions: file.deletions,
            changes
          });
        }
      });

      return {
        changedFiles,
        addedFiles,
        deletedFiles,
        modifiedFiles,
        renamedFiles,
        fileChanges
      };
    } catch (error: any) {
      console.error(`Failed to get diff via API: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get changed files using git commands (fallback)
   */
  private async getChangedFilesViaGit(prInfo: GitHubPRInfo): Promise<string[]> {
    try {
      // Clone or fetch the repository
      const repoPath = await this.ensureRepository(prInfo);
      
      // Fetch PR branch
      await execAsync(`git fetch origin pull/${prInfo.prNumber}/head:pr-${prInfo.prNumber}`, {
        cwd: repoPath
      });

      // Get diff between main and PR branch
      const { stdout } = await execAsync(
        `git diff --name-only main pr-${prInfo.prNumber}`,
        { cwd: repoPath }
      );

      return stdout.trim().split('\n').filter(f => f.length > 0);
    } catch (error: any) {
      console.error(`Failed to get changed files via git: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get detailed diff using git commands (fallback)
   */
  private async getDiffViaGit(prInfo: GitHubPRInfo): Promise<GitDiffResult> {
    try {
      const repoPath = await this.ensureRepository(prInfo);
      
      // Fetch PR branch
      await execAsync(`git fetch origin pull/${prInfo.prNumber}/head:pr-${prInfo.prNumber}`, {
        cwd: repoPath
      });

      // Get detailed diff
      const { stdout: diffStat } = await execAsync(
        `git diff --stat main pr-${prInfo.prNumber}`,
        { cwd: repoPath }
      );

      const { stdout: diffNameStatus } = await execAsync(
        `git diff --name-status main pr-${prInfo.prNumber}`,
        { cwd: repoPath }
      );

      // Parse the output
      const result: GitDiffResult = {
        changedFiles: [],
        addedFiles: [],
        deletedFiles: [],
        modifiedFiles: [],
        renamedFiles: [],
        fileChanges: new Map()
      };

      // Parse name-status output
      diffNameStatus.trim().split('\n').forEach(line => {
        if (!line) return;
        
        const [status, ...fileParts] = line.split('\t');
        const file = fileParts.join('\t');
        
        result.changedFiles.push(file);
        
        switch (status) {
          case 'A':
            result.addedFiles.push(file);
            break;
          case 'D':
            result.deletedFiles.push(file);
            break;
          case 'M':
            result.modifiedFiles.push(file);
            break;
          case 'R': {
            // Renamed files have format: R\told\tnew
            const [oldFile, newFile] = file.split('\t');
            if (newFile) {
              result.renamedFiles.push({ from: oldFile, to: newFile });
              result.changedFiles.push(newFile);
            }
            break;
          }
        }
      });

      // Get line-level changes for each file
      for (const file of result.modifiedFiles) {
        try {
          const { stdout: patch } = await execAsync(
            `git diff main pr-${prInfo.prNumber} -- "${file}"`,
            { cwd: repoPath }
          );
          
          const changes = this.parsePatch(patch);
          result.fileChanges.set(file, {
            additions: changes.filter(c => c.type === 'add').length,
            deletions: changes.filter(c => c.type === 'delete').length,
            changes
          });
        } catch {
          // Skip if we can't get patch for this file
        }
      }

      return result;
    } catch (error: any) {
      console.error(`Failed to get diff via git: ${error.message}`);
      throw error;
    }
  }

  /**
   * Parse a git patch to extract line changes
   */
  private parsePatch(patch: string): Array<{ type: 'add' | 'delete' | 'modify'; startLine: number; endLine: number }> {
    const changes: Array<{ type: 'add' | 'delete' | 'modify'; startLine: number; endLine: number }> = [];
    const lines = patch.split('\n');
    
    let currentLine = 0;
    let inHunk = false;
    let addStart = -1;
    let deleteStart = -1;

    for (const line of lines) {
      // Parse hunk header: @@ -start,count +start,count @@
      if (line.startsWith('@@')) {
        const match = line.match(/@@ -(\d+),?\d* \+(\d+),?\d* @@/);
        if (match) {
          currentLine = parseInt(match[2], 10);
          inHunk = true;
        }
      } else if (inHunk) {
        if (line.startsWith('+')) {
          // Addition
          if (addStart === -1) addStart = currentLine;
          currentLine++;
        } else if (line.startsWith('-')) {
          // Deletion
          if (deleteStart === -1) deleteStart = currentLine;
        } else if (line.startsWith(' ')) {
          // Context line
          // Save any pending changes
          if (addStart !== -1) {
            changes.push({
              type: 'add',
              startLine: addStart,
              endLine: currentLine - 1
            });
            addStart = -1;
          }
          if (deleteStart !== -1) {
            changes.push({
              type: 'delete',
              startLine: deleteStart,
              endLine: currentLine - 1
            });
            deleteStart = -1;
          }
          currentLine++;
        }
      }
    }

    // Save any remaining changes
    if (addStart !== -1) {
      changes.push({
        type: 'add',
        startLine: addStart,
        endLine: currentLine
      });
    }
    if (deleteStart !== -1) {
      changes.push({
        type: 'delete',
        startLine: deleteStart,
        endLine: currentLine
      });
    }

    return changes;
  }

  /**
   * Parse GitHub URL to extract owner, repo, and PR number
   */
  private parseGitHubUrl(repoUrl: string, prNumber: number): GitHubPRInfo {
    // Handle various GitHub URL formats
    const patterns = [
      /github\.com[/:]([^/]+)\/([^/.]+)/,
      /https?:\/\/github\.com\/([^/]+)\/([^/.]+)/
    ];

    for (const pattern of patterns) {
      const match = repoUrl.match(pattern);
      if (match) {
        return {
          owner: match[1],
          repo: match[2].replace('.git', ''),
          prNumber
        };
      }
    }

    throw new Error(`Invalid GitHub URL: ${repoUrl}`);
  }

  /**
   * Ensure repository is cloned locally for git operations
   */
  private async ensureRepository(prInfo: GitHubPRInfo): Promise<string> {
    const tempDir = `/tmp/codequal-repos/${prInfo.owner}-${prInfo.repo}`;
    
    try {
      // Check if repo already exists
      await execAsync(`test -d ${tempDir}/.git`);
      
      // Update if it exists
      await execAsync(`git fetch origin`, { cwd: tempDir });
    } catch {
      // Clone if it doesn't exist
      const cloneUrl = `https://github.com/${prInfo.owner}/${prInfo.repo}.git`;
      await execAsync(`mkdir -p ${tempDir}`);
      await execAsync(`git clone ${cloneUrl} ${tempDir}`);
    }

    return tempDir;
  }

  /**
   * Get PR metadata from GitHub API
   */
  async getPRMetadata(repoUrl: string, prNumber: number): Promise<{
    title: string;
    description: string;
    author: string;
    owner: string;
    baseBranch: string;
    headBranch: string;
    state: string;
    createdAt: string;
    updatedAt: string;
    linesAdded: number;
    linesDeleted: number;
    duration: number;
  }> {
    const prInfo = this.parseGitHubUrl(repoUrl, prNumber);
    
    try {
      const url = `https://api.github.com/repos/${prInfo.owner}/${prInfo.repo}/pulls/${prInfo.prNumber}`;
      
      const response = await axios.get(url, {
        headers: this.githubToken ? {
          'Authorization': `token ${this.githubToken}`,
          'Accept': 'application/vnd.github.v3+json'
        } : {
          'Accept': 'application/vnd.github.v3+json'
        }
      });

      const pr = response.data;
      
      // Calculate duration from creation to now (or merge time if merged)
      const createdAt = new Date(pr.created_at);
      const endTime = pr.merged_at ? new Date(pr.merged_at) : new Date();
      const duration = endTime.getTime() - createdAt.getTime();
      
      return {
        title: pr.title,
        description: pr.body || '',
        author: pr.user.login,
        owner: prInfo.owner,
        baseBranch: pr.base.ref,
        headBranch: pr.head.ref,
        state: pr.state,
        createdAt: pr.created_at,
        updatedAt: pr.updated_at,
        linesAdded: pr.additions || 0,
        linesDeleted: pr.deletions || 0,
        duration: duration
      };
    } catch (error: any) {
      console.error(`Failed to get PR metadata: ${error.message}`);
      throw error;
    }
  }
}