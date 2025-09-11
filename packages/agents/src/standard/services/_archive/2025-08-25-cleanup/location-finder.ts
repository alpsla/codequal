import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import * as path from 'path';

const execAsync = promisify(exec);

export interface LocationResult {
  line: number;
  column: number;
  codeSnippet: string;
  contextLines: string[];
  confidence: number;
}

export interface SearchResult {
  file: string;
  line: number;
  column: number;
  match: string;
  context: string;
}

export interface ILocationFinder {
  findExactLocation(
    issue: any,
    repoPath: string
  ): Promise<LocationResult | null>;
  
  searchCodePattern(
    file: string,
    pattern: string,
    repoPath: string
  ): Promise<SearchResult[]>;
}

export class LocationFinderService implements ILocationFinder {
  private cache: Map<string, LocationResult> = new Map();

  async findExactLocation(
    issue: any,
    repoPath: string
  ): Promise<LocationResult | null> {
    try {
      // Generate cache key
      const cacheKey = `${repoPath}:${issue.location?.file}:${issue.description}`;
      
      // Check cache
      if (this.cache.has(cacheKey)) {
        return this.cache.get(cacheKey)!;
      }

      // Extract search patterns from issue
      const patterns = this.extractSearchPatterns(issue);
      
      if (patterns.length === 0) {
        return null;
      }

      // Search for each pattern
      let bestMatch: LocationResult | null = null;
      let highestConfidence = 0;

      for (const pattern of patterns) {
        const results = await this.searchWithPattern(
          issue.location?.file || '',
          pattern,
          repoPath
        );

        for (const result of results) {
          const location = await this.buildLocationResult(
            result,
            issue,
            repoPath
          );

          if (location && location.confidence > highestConfidence) {
            bestMatch = location;
            highestConfidence = location.confidence;
          }
        }
      }

      // Cache the result
      if (bestMatch) {
        this.cache.set(cacheKey, bestMatch);
      }

      return bestMatch;
    } catch (error) {
      console.error('Error finding exact location:', error);
      return null;
    }
  }

  async searchCodePattern(
    file: string,
    pattern: string,
    repoPath: string
  ): Promise<SearchResult[]> {
    try {
      const filePath = path.join(repoPath, file);
      
      // Use ripgrep for fast pattern matching - use -e for regex patterns
      const { stdout } = await execAsync(
        `rg --json --max-count 10 -e "${pattern}" "${filePath}"`,
        { cwd: repoPath, maxBuffer: 1024 * 1024 * 10 }
      );

      const results: SearchResult[] = [];
      const lines = stdout.split('\n').filter(line => line.trim());

      for (const line of lines) {
        try {
          const data = JSON.parse(line);
          if (data.type === 'match') {
            results.push({
              file,
              line: data.data.line_number,
              column: data.data.submatches[0]?.start || 1,
              match: data.data.lines.text,
              context: data.data.lines.text
            });
          }
        } catch {
          // Skip invalid JSON lines
        }
      }

      return results;
    } catch (error) {
      // Fallback to grep if ripgrep fails
      return this.searchWithGrep(file, pattern, repoPath);
    }
  }

  private async searchWithPattern(
    file: string,
    pattern: string,
    repoPath: string
  ): Promise<SearchResult[]> {
    if (!file) {
      // Search across all files if no specific file
      return this.searchAcrossFiles(pattern, repoPath);
    }
    
    return this.searchCodePattern(file, pattern, repoPath);
  }

  private async searchAcrossFiles(
    pattern: string,
    repoPath: string
  ): Promise<SearchResult[]> {
    try {
      const { stdout } = await execAsync(
        `rg --json --max-count 10 "${this.escapePattern(pattern)}"`,
        { cwd: repoPath, maxBuffer: 1024 * 1024 * 10 }
      );

      const results: SearchResult[] = [];
      const lines = stdout.split('\n').filter(line => line.trim());

      for (const line of lines) {
        try {
          const data = JSON.parse(line);
          if (data.type === 'match') {
            const relativePath = path.relative(repoPath, data.data.path.text);
            results.push({
              file: relativePath,
              line: data.data.line_number,
              column: data.data.submatches[0]?.start || 1,
              match: data.data.lines.text,
              context: data.data.lines.text
            });
          }
        } catch {
          // Skip invalid JSON lines
        }
      }

      return results;
    } catch {
      return [];
    }
  }

  private async searchWithGrep(
    file: string,
    pattern: string,
    repoPath: string
  ): Promise<SearchResult[]> {
    try {
      const filePath = path.join(repoPath, file);
      const { stdout } = await execAsync(
        `grep -n "${this.escapePattern(pattern)}" "${filePath}" | head -10`,
        { cwd: repoPath }
      );

      const results: SearchResult[] = [];
      const lines = stdout.split('\n').filter(line => line.trim());

      for (const line of lines) {
        const match = line.match(/^(\d+):(.*)$/);
        if (match) {
          const lineNumber = parseInt(match[1]);
          const content = match[2];
          
          results.push({
            file,
            line: lineNumber,
            column: 1,
            match: content,
            context: content
          });
        }
      }

      return results;
    } catch {
      return [];
    }
  }

  private async buildLocationResult(
    searchResult: SearchResult,
    issue: any,
    repoPath: string
  ): Promise<LocationResult | null> {
    try {
      const filePath = path.join(repoPath, searchResult.file);
      const fileContent = await fs.readFile(filePath, 'utf-8');
      const lines = fileContent.split('\n');

      // Get context lines
      const startLine = Math.max(0, searchResult.line - 3);
      const endLine = Math.min(lines.length, searchResult.line + 3);
      const contextLines = lines.slice(startLine, endLine);

      // Get the actual code snippet
      const snippetStart = Math.max(0, searchResult.line - 2);
      const snippetEnd = Math.min(lines.length, searchResult.line + 2);
      const codeSnippet = lines.slice(snippetStart, snippetEnd).join('\n');

      // Calculate confidence based on various factors
      const confidence = this.calculateConfidence(searchResult, issue);

      return {
        line: searchResult.line,
        column: searchResult.column,
        codeSnippet,
        contextLines,
        confidence
      };
    } catch (error) {
      console.error('Error building location result:', error);
      return null;
    }
  }

  private extractSearchPatterns(issue: any): string[] {
    const patterns: string[] = [];

    // Extract patterns from issue description
    if (issue.description) {
      // Look for code snippets in backticks
      const codeMatches = issue.description.match(/`([^`]+)`/g);
      if (codeMatches) {
        patterns.push(...codeMatches.map((m: string) => m.replace(/`/g, '')));
      }

      // Look for function/variable names
      const nameMatches = issue.description.match(/\b([a-zA-Z_]\w+)\(/g);
      if (nameMatches) {
        patterns.push(...nameMatches.map((m: string) => m.replace(/\(/, '')));
      }
    }

    // Extract from remediation if available
    if (issue.remediation) {
      const remediationCode = issue.remediation.match(/`([^`]+)`/g);
      if (remediationCode) {
        patterns.push(...remediationCode.map((m: string) => m.replace(/`/g, '')));
      }
    }

    // Extract from evidence
    if (issue.evidence?.snippet) {
      patterns.push(issue.evidence.snippet.substring(0, 50));
    }

    // Category-specific patterns
    if (issue.category) {
      const categoryPatterns = this.getCategoryPatterns(issue.category);
      patterns.push(...categoryPatterns);
    }

    // Remove duplicates and empty patterns
    return [...new Set(patterns.filter(p => p && p.trim()))];
  }

  private getCategoryPatterns(category: string): string[] {
    const patterns: string[] = [];
    
    switch (category.toLowerCase()) {
      case 'sql injection':
      case 'sql-injection':
        patterns.push('query', 'SELECT', 'INSERT', 'UPDATE', 'DELETE', 'exec', 'execute');
        break;
      case 'xss':
      case 'cross-site scripting':
        patterns.push('innerHTML', 'document.write', 'eval', 'dangerouslySetInnerHTML');
        break;
      case 'authentication':
        patterns.push('login', 'auth', 'password', 'token', 'session');
        break;
      case 'authorization':
        patterns.push('permission', 'role', 'access', 'authorize', 'isAllowed');
        break;
      case 'hardcoded':
      case 'secrets':
        patterns.push('api_key', 'API_KEY', 'secret', 'SECRET', 'password', 'PASSWORD');
        break;
      case 'validation':
        patterns.push('validate', 'sanitize', 'check', 'verify', 'isValid');
        break;
    }

    return patterns;
  }

  private calculateConfidence(searchResult: SearchResult, issue: any): number {
    let confidence = 50; // Base confidence

    // File match bonus
    if (issue.location?.file && searchResult.file === issue.location.file) {
      confidence += 20;
    }

    // Line proximity bonus (if we have an approximate line)
    if (issue.location?.line) {
      const distance = Math.abs(searchResult.line - issue.location.line);
      if (distance === 0) {
        confidence += 30;
      } else if (distance <= 5) {
        confidence += 20;
      } else if (distance <= 10) {
        confidence += 10;
      }
    }

    // Pattern match quality
    if (searchResult.match.length > 50) {
      confidence += 10;
    }

    // Category match
    if (issue.category && this.matchesCategory(searchResult.match, issue.category)) {
      confidence += 10;
    }

    return Math.min(100, confidence);
  }

  private matchesCategory(code: string, category: string): boolean {
    const categoryKeywords: Record<string, string[]> = {
      'sql injection': ['query', 'SELECT', 'INSERT', 'UPDATE', 'DELETE'],
      'xss': ['innerHTML', 'document.write', 'eval'],
      'authentication': ['login', 'auth', 'password', 'token'],
      'validation': ['validate', 'check', 'verify']
    };

    const keywords = categoryKeywords[category.toLowerCase()] || [];
    return keywords.some(keyword => 
      code.toLowerCase().includes(keyword.toLowerCase())
    );
  }

  private escapePattern(pattern: string): string {
    // Escape special regex characters for shell
    return pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  clearCache(): void {
    this.cache.clear();
  }
}