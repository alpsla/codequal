/**
 * Code Snippet Extractor
 * Extracts code snippets from files for issue context
 * SESSION 74: Added GitHub API fallback for when local files unavailable
 */

import * as fs from 'fs';
import * as path from 'path';
import * as https from 'https';

// Cache for GitHub file contents to avoid repeated API calls
const githubContentCache = new Map<string, { content: string; timestamp: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

export class CodeSnippetExtractor {
  private static readonly CONTEXT_LINES = 3; // Lines before and after the issue
  private static readonly MAX_LINE_LENGTH = 200; // Max characters per line

  /**
   * Extract code snippet from a file at a specific line
   * SESSION 74: Now supports GitHub API fallback via repositoryUrl parameter
   */
  static async extractSnippet(
    filePath: string,
    line: number,
    contextLines = CodeSnippetExtractor.CONTEXT_LINES,
    repositoryUrl?: string,
    branch?: string
  ): Promise<string | null> {
    try {
      // Try local file first
      if (fs.existsSync(filePath)) {
        return this.extractFromContent(
          fs.readFileSync(filePath, 'utf-8'),
          line,
          contextLines,
          path.basename(filePath)
        );
      }

      // If local file doesn't exist and we have repository info, try GitHub API
      if (repositoryUrl) {
        const content = await this.fetchFromGitHub(repositoryUrl, filePath, branch);
        if (content) {
          return this.extractFromContent(content, line, contextLines, path.basename(filePath));
        }
      }

      return null;
    } catch (error) {
      console.error(`Failed to extract snippet from ${filePath}:${line}`, error);
      return null;
    }
  }

  /**
   * Extract snippet from file content string
   */
  private static extractFromContent(
    content: string,
    line: number,
    contextLines: number,
    filename: string
  ): string | null {
    const lines = content.split('\n');

    // Calculate range
    const startLine = Math.max(0, line - contextLines - 1);
    const endLine = Math.min(lines.length, line + contextLines);

    // Extract snippet
    const snippet: string[] = [];

    for (let i = startLine; i < endLine; i++) {
      const lineNum = i + 1;
      const lineContent = lines[i];
      const truncated = lineContent.length > this.MAX_LINE_LENGTH
        ? lineContent.substring(0, this.MAX_LINE_LENGTH) + '...'
        : lineContent;

      // Mark the problematic line
      const marker = lineNum === line ? '>' : ' ';
      snippet.push(`${marker} ${lineNum.toString().padStart(4)} | ${truncated}`);
    }

    const result = snippet.join('\n');

    // If snippet is empty or contains only whitespace, provide a fallback message
    if (!result || result.trim().length === 0) {
      return `// Line ${line} in ${filename}\n// (empty line or configuration file - no code to display)`;
    }

    return result;
  }

  /**
   * Parse GitHub URL and extract owner/repo with proper hostname validation
   * Handles: https://github.com/owner/repo, git@github.com:owner/repo, github.com/owner/repo
   */
  private static parseGitHubUrl(repositoryUrl: string): { owner: string; repo: string } | null {
    try {
      // Handle SSH format: git@github.com:owner/repo.git
      if (repositoryUrl.startsWith('git@github.com:')) {
        const sshPath = repositoryUrl.slice('git@github.com:'.length);
        const segments = sshPath.split('/');
        if (segments.length >= 2) {
          const owner = segments[0];
          const repo = segments[1].replace(/\.git$/, '');
          if (this.isValidGitHubName(owner) && this.isValidGitHubName(repo)) {
            return { owner, repo };
          }
        }
        return null;
      }

      // Handle HTTPS/HTTP URLs using URL parser for proper hostname validation
      let urlToParse = repositoryUrl;
      if (!urlToParse.startsWith('http://') && !urlToParse.startsWith('https://')) {
        urlToParse = 'https://' + urlToParse;
      }

      const url = new URL(urlToParse);

      // CRITICAL: Validate hostname is EXACTLY github.com (not a substring)
      if (url.hostname !== 'github.com' && url.hostname !== 'www.github.com') {
        return null;
      }

      // Extract owner/repo from pathname: /owner/repo or /owner/repo.git
      const pathSegments = url.pathname.split('/').filter(s => s.length > 0);
      if (pathSegments.length < 2) {
        return null;
      }

      const owner = pathSegments[0];
      const repo = pathSegments[1].replace(/\.git$/, '');

      if (!this.isValidGitHubName(owner) || !this.isValidGitHubName(repo)) {
        return null;
      }

      return { owner, repo };
    } catch {
      return null;
    }
  }

  /**
   * Validate GitHub username/repo name format
   */
  private static isValidGitHubName(name: string): boolean {
    if (!name || name.length === 0 || name.length > 100) {
      return false;
    }
    // GitHub names: alphanumeric, hyphens, underscores, dots (no consecutive dots)
    return /^[\w.-]+$/.test(name) && !name.includes('..');
  }

  /**
   * Fetch file content from GitHub API
   * SESSION 74: New method for remote code fetching
   */
  private static async fetchFromGitHub(
    repositoryUrl: string,
    filePath: string,
    branch = 'main'
  ): Promise<string | null> {
    try {
      // Validate input
      if (!repositoryUrl || typeof repositoryUrl !== 'string' || repositoryUrl.length > 500) {
        return null;
      }

      // Parse owner/repo from GitHub URL using proper URL parsing
      const parsed = this.parseGitHubUrl(repositoryUrl);
      if (!parsed) {
        return null;
      }

      const { owner, repo } = parsed;

      // Normalize file path - remove leading slashes and any repo prefix
      const normalizedPath = filePath
        .replace(/^\/+/, '')
        .replace(/^\.\//, '');

      // Check cache
      const cacheKey = `${owner}/${repo}/${branch}/${normalizedPath}`;
      const cached = githubContentCache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
        return cached.content;
      }

      // Construct GitHub raw content URL
      const rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${normalizedPath}`;

      const content = await this.fetchUrl(rawUrl);
      if (content) {
        githubContentCache.set(cacheKey, { content, timestamp: Date.now() });
        return content;
      }

      // Try with 'master' branch if 'main' failed
      if (branch === 'main') {
        const masterUrl = `https://raw.githubusercontent.com/${owner}/${repo}/master/${normalizedPath}`;
        const masterContent = await this.fetchUrl(masterUrl);
        if (masterContent) {
          githubContentCache.set(cacheKey, { content: masterContent, timestamp: Date.now() });
          return masterContent;
        }
      }

      return null;
    } catch (error) {
      console.debug(`Failed to fetch from GitHub: ${error instanceof Error ? error.message : error}`);
      return null;
    }
  }

  /**
   * Simple HTTPS fetch helper
   */
  private static fetchUrl(url: string): Promise<string | null> {
    return new Promise((resolve) => {
      const request = https.get(url, { timeout: 10000 }, (response) => {
        if (response.statusCode !== 200) {
          resolve(null);
          return;
        }

        let data = '';
        response.on('data', (chunk) => {
          data += chunk;
          // Limit response size to 1MB
          if (data.length > 1024 * 1024) {
            request.destroy();
            resolve(null);
          }
        });
        response.on('end', () => resolve(data));
        response.on('error', () => resolve(null));
      });

      request.on('error', () => resolve(null));
      request.on('timeout', () => {
        request.destroy();
        resolve(null);
      });
    });
  }

  /**
   * Clear the GitHub content cache
   */
  static clearCache(): void {
    githubContentCache.clear();
  }
  
  /**
   * Extract multiple snippets for a range of lines
   */
  static async extractRangeSnippet(
    filePath: string,
    startLine: number,
    endLine: number
  ): Promise<string | null> {
    try {
      if (!fs.existsSync(filePath)) {
        return null;
      }
      
      const content = fs.readFileSync(filePath, 'utf-8');
      const lines = content.split('\n');
      
      // Adjust bounds
      const start = Math.max(0, startLine - 1);
      const end = Math.min(lines.length, endLine);
      
      const snippet: string[] = [];
      
      for (let i = start; i < end; i++) {
        const lineNum = i + 1;
        const lineContent = lines[i];
        const truncated = lineContent.length > this.MAX_LINE_LENGTH 
          ? lineContent.substring(0, this.MAX_LINE_LENGTH) + '...'
          : lineContent;
        
        snippet.push(`  ${lineNum.toString().padStart(4)} | ${truncated}`);
      }
      
      return snippet.join('\n');
    } catch (error) {
      console.error(`Failed to extract range snippet from ${filePath}`, error);
      return null;
    }
  }
  
  /**
   * Get file extension to determine language
   */
  static getFileLanguage(filePath: string): string {
    const ext = path.extname(filePath).toLowerCase();
    const languageMap: Record<string, string> = {
      '.rs': 'rust',
      '.js': 'javascript',
      '.jsx': 'javascript',
      '.ts': 'typescript',
      '.tsx': 'typescript',
      '.py': 'python',
      '.rb': 'ruby',
      '.go': 'go',
      '.java': 'java',
      '.cs': 'csharp',
      '.cpp': 'cpp',
      '.c': 'c',
      '.php': 'php',
      '.swift': 'swift',
      '.kt': 'kotlin',
      '.scala': 'scala',
      '.r': 'r',
      '.m': 'matlab',
      '.sh': 'bash',
      '.ps1': 'powershell',
      '.yaml': 'yaml',
      '.yml': 'yaml',
      '.json': 'json',
      '.xml': 'xml',
      '.html': 'html',
      '.css': 'css',
      '.scss': 'scss',
      '.sass': 'sass',
      '.less': 'less',
      '.sql': 'sql'
    };
    
    return languageMap[ext] || 'text';
  }
  
  /**
   * Format code snippet with syntax highlighting hints
   */
  static formatSnippet(snippet: string, language: string): string {
    if (!snippet) return '';
    
    // Add markdown code block formatting
    return `\`\`\`${language}\n${snippet}\n\`\`\``;
  }
  
  /**
   * Extract and format a code snippet for an issue
   */
  static async getIssueSnippet(
    filePath: string,
    line?: number,
    startLine?: number,
    endLine?: number
  ): Promise<string> {
    let snippet: string | null = null;
    
    if (line) {
      snippet = await this.extractSnippet(filePath, line);
    } else if (startLine && endLine) {
      snippet = await this.extractRangeSnippet(filePath, startLine, endLine);
    }
    
    if (!snippet) {
      return '';
    }
    
    const language = this.getFileLanguage(filePath);
    return this.formatSnippet(snippet, language);
  }
}