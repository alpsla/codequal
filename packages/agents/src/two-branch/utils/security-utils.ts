/**
 * Security utilities for input validation and sanitization
 * Prevents command injection, SSRF, and path traversal attacks
 */

import * as path from 'path';
import * as url from 'url';

// Allowed webhook domains for SSRF prevention
const ALLOWED_WEBHOOK_DOMAINS = [
  'localhost',
  '127.0.0.1',
  'api.github.com',
  'hooks.slack.com',
  'discord.com',
  'discordapp.com',
  // Add more trusted domains as needed
];

// Pattern for valid git branch names (hyphen at end of char class doesn't need escaping)
const SAFE_BRANCH_PATTERN = /^[a-zA-Z0-9._/-]+$/;

// Pattern for valid repository URLs
const SAFE_REPO_URL_PATTERN = /^https?:\/\/[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\/[a-zA-Z0-9._/-]+\.git$/;
const SAFE_GIT_SSH_PATTERN = /^git@[a-zA-Z0-9.-]+:[a-zA-Z0-9._/-]+\.git$/;

// Pattern for valid PR numbers
const SAFE_PR_NUMBER_PATTERN = /^\d+$/;

/**
 * Validates a webhook URL against allowed domains to prevent SSRF
 * @param webhookUrl - The webhook URL to validate
 * @returns true if the URL is safe, false otherwise
 */
export function isValidWebhookUrl(webhookUrl: string): boolean {
  try {
    const parsed = new url.URL(webhookUrl);

    // Only allow HTTPS for external webhooks
    if (parsed.protocol !== 'https:' && !isLocalhost(parsed.hostname)) {
      return false;
    }

    // Check against allowed domains
    const hostname = parsed.hostname.toLowerCase();
    return ALLOWED_WEBHOOK_DOMAINS.some(domain =>
      hostname === domain || hostname.endsWith(`.${domain}`)
    );
  } catch {
    return false;
  }
}

function isLocalhost(hostname: string): boolean {
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1';
}

/**
 * Sanitizes a branch name to prevent command injection
 * @param branch - The branch name to sanitize
 * @returns The sanitized branch name
 * @throws Error if the branch name contains invalid characters
 */
export function sanitizeBranchName(branch: string): string {
  if (!branch || typeof branch !== 'string') {
    throw new Error('Branch name must be a non-empty string');
  }

  const trimmed = branch.trim();

  if (!SAFE_BRANCH_PATTERN.test(trimmed)) {
    throw new Error(`Invalid branch name: ${trimmed}. Only alphanumeric, dots, underscores, hyphens, and slashes allowed.`);
  }

  // Additional checks for git-specific restrictions
  if (trimmed.startsWith('-') || trimmed.endsWith('.') || trimmed.includes('..')) {
    throw new Error(`Invalid branch name: ${trimmed}. Cannot start with dash, end with dot, or contain '..'`);
  }

  return trimmed;
}

/**
 * Validates and sanitizes a repository URL
 * @param repoUrl - The repository URL to validate
 * @returns The validated repository URL
 * @throws Error if the URL is invalid or potentially malicious
 */
export function sanitizeRepoUrl(repoUrl: string): string {
  if (!repoUrl || typeof repoUrl !== 'string') {
    throw new Error('Repository URL must be a non-empty string');
  }

  const trimmed = repoUrl.trim();

  // Check for command injection patterns
  if (trimmed.includes('`') || trimmed.includes('$(') || trimmed.includes(';') ||
      trimmed.includes('|') || trimmed.includes('&') || trimmed.includes('\n')) {
    throw new Error('Repository URL contains invalid characters');
  }

  // Validate against safe patterns
  if (!SAFE_REPO_URL_PATTERN.test(trimmed) && !SAFE_GIT_SSH_PATTERN.test(trimmed)) {
    // Allow GitHub and GitLab SSH URLs
    if (!trimmed.startsWith('git@github.com:') && !trimmed.startsWith('git@gitlab.com:')) {
      throw new Error(`Invalid repository URL format: ${trimmed}`);
    }
  }

  return trimmed;
}

/**
 * Validates and sanitizes a PR number
 * @param prNumber - The PR number (can be string or number)
 * @returns The validated PR number as a number
 * @throws Error if the PR number is invalid
 */
export function sanitizePrNumber(prNumber: string | number): number {
  const prStr = String(prNumber).trim();

  if (!SAFE_PR_NUMBER_PATTERN.test(prStr)) {
    throw new Error(`Invalid PR number: ${prNumber}. Must be a positive integer.`);
  }

  const prNum = parseInt(prStr, 10);

  if (prNum <= 0 || prNum > 999999999) {
    throw new Error(`Invalid PR number: ${prNumber}. Must be between 1 and 999999999.`);
  }

  return prNum;
}

/**
 * Sanitizes a file path to prevent path traversal attacks
 * @param basePath - The base directory that paths must stay within
 * @param userPath - The user-provided path component
 * @returns The sanitized absolute path
 * @throws Error if the path attempts directory traversal
 */
export function sanitizePath(basePath: string, userPath: string): string {
  if (!basePath || !userPath) {
    throw new Error('Both basePath and userPath are required');
  }

  // Normalize paths
  const normalizedBase = path.resolve(basePath);
  const fullPath = path.resolve(normalizedBase, userPath);

  // Ensure the resolved path is within the base directory
  if (!fullPath.startsWith(normalizedBase + path.sep) && fullPath !== normalizedBase) {
    throw new Error(`Path traversal detected: ${userPath} escapes base directory`);
  }

  return fullPath;
}

/**
 * Extracts and validates repository name from URL
 * @param repoUrl - The repository URL
 * @returns The repository name (e.g., 'owner/repo')
 */
export function extractRepoName(repoUrl: string): string {
  const sanitized = sanitizeRepoUrl(repoUrl);

  // Extract from HTTPS URL
  const httpsMatch = sanitized.match(/https?:\/\/[^/]+\/([^/]+\/[^/.]+)/);
  if (httpsMatch) {
    return httpsMatch[1].replace(/\.git$/, '');
  }

  // Extract from SSH URL
  const sshMatch = sanitized.match(/git@[^:]+:([^/]+\/[^/.]+)/);
  if (sshMatch) {
    return sshMatch[1].replace(/\.git$/, '');
  }

  throw new Error(`Could not extract repository name from URL: ${repoUrl}`);
}

/**
 * Escapes shell arguments to prevent command injection
 * Should only be used as a last resort - prefer using arrays with execFile
 * @param arg - The argument to escape
 * @returns The escaped argument
 */
export function escapeShellArg(arg: string): string {
  // Replace single quotes with escaped version and wrap in single quotes
  return `'${arg.replace(/'/g, "'\\''")}'`;
}
