/**
 * Git Utilities for Two-Branch Analysis
 *
 * Common git operations used across V9 analysis tools
 */

import { execSync, execFileSync } from 'child_process';
import { sanitizeBranchName, sanitizePath } from './security-utils';

/**
 * Detect the default branch for a repository
 *
 * Tries multiple methods:
 * 1. Check git symbolic-ref (most reliable)
 * 2. Fallback to common branch names (trunk, main, master)
 *
 * @param repoPath - Absolute path to the git repository
 * @returns The name of the default branch
 */
export function detectDefaultBranch(repoPath: string): string {
  try {
    const output = execSync(
      `git symbolic-ref refs/remotes/origin/HEAD | sed 's@^refs/remotes/origin/@@'`,
      { cwd: repoPath, encoding: 'utf-8' }
    );
    const branch = output.trim();
    if (branch) {
      return branch;
    }
  } catch (error) {
    // symbolic-ref failed, try fallback methods
  }

  // Fallback: check which common branch exists
  const commonBranches = ['trunk', 'main', 'master'];

  for (const branch of commonBranches) {
    try {
      execSync(`git rev-parse --verify ${branch}`, {
        cwd: repoPath,
        stdio: 'ignore'
      });
      return branch;
    } catch {
      // Branch doesn't exist, try next
    }
  }

  // Last resort: return 'main' as default
  return 'main';
}

/**
 * Get list of files modified between two branches
 *
 * Tries two methods:
 * 1. Three-dot diff (merge base): Shows changes unique to compareBranch
 * 2. Two-dot diff (direct): Shows all differences between branch tips
 *
 * @param repoPath - Absolute path to the git repository
 * @param baseBranch - Base branch name (e.g., 'trunk', 'main')
 * @param compareBranch - Branch to compare against base
 * @returns Array of modified file paths (relative to repo root)
 */
export function getModifiedFilesBetweenBranches(
  repoPath: string,
  baseBranch: string,
  compareBranch: string
): string[] {
  // Sanitize branch names to prevent command injection
  const safeBaseBranch = sanitizeBranchName(baseBranch);
  const safeCompareBranch = sanitizeBranchName(compareBranch);

  // Try three-dot diff first (merge base approach)
  // Using execFileSync with args array to prevent shell injection
  try {
    const diffOutput = execFileSync(
      'git',
      ['diff', '--name-only', '--find-renames', `${safeBaseBranch}...${safeCompareBranch}`],
      { cwd: repoPath, encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] }
    );

    const files = diffOutput
      .split('\n')
      .filter(line => line.trim() !== '')
      .map(file => file.trim());

    // If we got files, return them
    if (files.length > 0) {
      return files;
    }
  } catch (error) {
    // Three-dot diff failed (no merge base), will try two-dot
  }

  // Fallback to two-dot diff if no merge base exists or three-dot returned nothing
  try {
    const diffOutput = execFileSync(
      'git',
      ['diff', '--name-only', '--find-renames', `${safeBaseBranch}..${safeCompareBranch}`],
      { cwd: repoPath, encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] }
    );

    return diffOutput
      .split('\n')
      .filter(line => line.trim() !== '')
      .map(file => file.trim());
  } catch (fallbackError: any) {
    // If both approaches fail, log warning and return empty array
    // This allows analysis to continue without modified file filtering
    console.warn(`[Git] Could not determine modified files between ${safeBaseBranch} and ${safeCompareBranch}:`, fallbackError.message);
    console.warn('[Git] Analysis will include ALL files (no filtering by modified files)');
    return [];
  }
}

/**
 * Check if a branch exists in the repository
 *
 * @param repoPath - Absolute path to the git repository
 * @param branchName - Name of the branch to check
 * @returns true if branch exists, false otherwise
 */
export function branchExists(repoPath: string, branchName: string): boolean {
  try {
    execSync(`git rev-parse --verify ${branchName}`, {
      cwd: repoPath,
      stdio: 'ignore'
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * Get current branch name
 *
 * @param repoPath - Absolute path to the git repository
 * @returns Current branch name
 */
export function getCurrentBranch(repoPath: string): string {
  try {
    const output = execSync('git rev-parse --abbrev-ref HEAD', {
      cwd: repoPath,
      encoding: 'utf-8'
    });
    return output.trim();
  } catch (error) {
    throw new Error(`Failed to get current branch: ${error}`);
  }
}
