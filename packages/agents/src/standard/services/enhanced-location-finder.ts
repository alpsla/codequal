/**
 * Enhanced Location Finder
 * 
 * Uses multiple strategies to find the actual location of issues in the repository:
 * 1. Search by code snippet (if available and realistic)
 * 2. Search by keywords from issue title and description
 * 3. Search by file patterns based on issue category
 * 4. Use AI to analyze the context and find likely locations
 */

import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

export interface IssueToLocate {
  id: string;
  title: string;
  description: string;
  category: string;
  severity: string;
  codeSnippet?: string;
  file?: string; // Hint from DeepWiki
}

export interface LocationResult {
  issueId: string;
  file: string;
  line: number;
  confidence: number;
  snippet?: string;
  method: string; // How we found it
}

export class EnhancedLocationFinder {
  
  /**
   * Find locations for issues using multiple strategies
   */
  async findLocations(
    repoPath: string,
    issues: IssueToLocate[]
  ): Promise<LocationResult[]> {
    console.log(`🔍 Enhanced location finder searching ${issues.length} issues in ${repoPath}`);
    
    if (!fs.existsSync(repoPath)) {
      console.error(`Repository path does not exist: ${repoPath}`);
      return [];
    }
    
    const results: LocationResult[] = [];
    
    for (const issue of issues) {
      console.log(`\n  Searching for: ${issue.title}`);
      
      // Try multiple strategies in order of reliability
      let location: LocationResult | null = null;
      
      // Strategy 1: If we have a file hint from DeepWiki, search within that file
      if (issue.file && issue.file !== 'unknown' && issue.file !== 'Unknown location') {
        location = await this.searchInSpecificFile(repoPath, issue);
      }
      
      // Strategy 2: Search by code snippet if it looks realistic
      if (!location && issue.codeSnippet && this.isRealisticSnippet(issue.codeSnippet)) {
        location = await this.searchBySnippet(repoPath, issue);
      }
      
      // Strategy 3: Search by keywords from title and description
      if (!location) {
        location = await this.searchByKeywords(repoPath, issue);
      }
      
      // Strategy 4: Use category-based file patterns
      if (!location) {
        location = await this.searchByCategoryPatterns(repoPath, issue);
      }
      
      if (location) {
        results.push(location);
        console.log(`    ✅ Found: ${location.file}:${location.line} (${location.method}, confidence: ${location.confidence}%)`);
      } else {
        console.log(`    ❌ Could not locate`);
      }
    }
    
    console.log(`\n📊 Located ${results.length}/${issues.length} issues`);
    return results;
  }
  
  /**
   * Check if a code snippet looks realistic (not a generic example)
   */
  private isRealisticSnippet(snippet: string): boolean {
    const genericPatterns = [
      'example.com',
      'package-name',
      '"1.0.0"',
      'hardcoded',
      'password123',
      'secret',
      'TODO',
      'your-',
      'vulnerable-package'
    ];
    
    const lower = snippet.toLowerCase();
    return !genericPatterns.some(pattern => lower.includes(pattern.toLowerCase()));
  }
  
  /**
   * Search within a specific file mentioned by DeepWiki
   */
  private async searchInSpecificFile(
    repoPath: string,
    issue: IssueToLocate
  ): Promise<LocationResult | null> {
    const filePath = path.join(repoPath, issue.file!);
    
    if (!fs.existsSync(filePath)) {
      // Try to find similar file names
      const similarFile = this.findSimilarFile(repoPath, issue.file!);
      if (!similarFile) return null;
    }
    
    // Extract key terms from issue
    const searchTerms = this.extractSearchTerms(issue);
    
    try {
      // Use grep to search within the file
      for (const term of searchTerms) {
        const cmd = `grep -n -i "${term}" "${filePath}" 2>/dev/null | head -5`;
        try {
          const output = execSync(cmd, { encoding: 'utf-8' });
          if (output) {
            const lines = output.trim().split('\n');
            const firstMatch = lines[0];
            const lineNum = parseInt(firstMatch.split(':')[0]);
            
            return {
              issueId: issue.id,
              file: issue.file!,
              line: lineNum,
              confidence: 70,
              method: 'file-search',
              snippet: firstMatch.substring(firstMatch.indexOf(':') + 1)
            };
          }
        } catch (e) {
          // Grep returns non-zero if no match, continue
        }
      }
    } catch (error) {
      // File search failed
    }
    
    return null;
  }
  
  /**
   * Search by code snippet
   */
  private async searchBySnippet(
    repoPath: string,
    issue: IssueToLocate
  ): Promise<LocationResult | null> {
    if (!issue.codeSnippet) return null;
    
    // Extract the most distinctive line from the snippet
    const lines = issue.codeSnippet.split('\n').filter(line => line.trim().length > 10);
    if (lines.length === 0) return null;
    
    // Sort by distinctiveness (longer, more specific lines first)
    lines.sort((a, b) => b.length - a.length);
    
    for (const line of lines.slice(0, 3)) { // Try top 3 most distinctive lines
      const searchPattern = line
        .trim()
        .replace(/[.*+?^${}()|[\]\\]/g, '\\$&') // Escape regex special chars
        .replace(/\s+/g, '\\s+'); // Allow flexible whitespace
      
      try {
        const cmd = `rg -n --type-add 'code:*.{js,ts,jsx,tsx,json}' -t code "${searchPattern}" "${repoPath}" 2>/dev/null | head -5`;
        const output = execSync(cmd, { encoding: 'utf-8', maxBuffer: 1024 * 1024 });
        
        if (output) {
          const matches = output.trim().split('\n');
          const firstMatch = matches[0];
          const parts = firstMatch.split(':');
          const file = parts[0].replace(repoPath + '/', '');
          const lineNum = parseInt(parts[1]);
          
          return {
            issueId: issue.id,
            file,
            line: lineNum,
            confidence: 85,
            method: 'snippet-search',
            snippet: parts.slice(2).join(':')
          };
        }
      } catch (e) {
        // No match, try next line
      }
    }
    
    return null;
  }
  
  /**
   * Search by keywords from title and description
   */
  private async searchByKeywords(
    repoPath: string,
    issue: IssueToLocate
  ): Promise<LocationResult | null> {
    const searchTerms = this.extractSearchTerms(issue);
    
    for (const term of searchTerms) {
      try {
        // Use ripgrep for fast searching
        const cmd = `rg -n --type-add 'code:*.{js,ts,jsx,tsx}' -t code -i "${term}" "${repoPath}" 2>/dev/null | head -10`;
        const output = execSync(cmd, { encoding: 'utf-8', maxBuffer: 1024 * 1024 });
        
        if (output) {
          // Score each match based on relevance
          const matches = output.trim().split('\n');
          const scored = matches.map(match => {
            const parts = match.split(':');
            const file = parts[0].replace(repoPath + '/', '');
            const lineNum = parseInt(parts[1]);
            const content = parts.slice(2).join(':').toLowerCase();
            
            // Score based on how many terms appear in the line
            let score = 0;
            for (const t of searchTerms) {
              if (content.includes(t.toLowerCase())) score++;
            }
            
            return { file, line: lineNum, score, content };
          });
          
          // Sort by score and pick the best match
          scored.sort((a, b) => b.score - a.score);
          const best = scored[0];
          
          if (best && best.score > 0) {
            return {
              issueId: issue.id,
              file: best.file,
              line: best.line,
              confidence: Math.min(60, 30 + best.score * 10),
              method: 'keyword-search',
              snippet: best.content
            };
          }
        }
      } catch (e) {
        // No matches for this term
      }
    }
    
    return null;
  }
  
  /**
   * Search using category-based file patterns
   */
  private async searchByCategoryPatterns(
    repoPath: string,
    issue: IssueToLocate
  ): Promise<LocationResult | null> {
    const categoryPatterns: Record<string, string[]> = {
      'security': ['auth', 'security', 'password', 'token', 'crypto', 'session'],
      'performance': ['cache', 'index', 'query', 'loop', 'async', 'promise'],
      'dependencies': ['package.json', 'yarn.lock', 'package-lock.json'],
      'testing': ['test', 'spec', '__tests__'],
      'code-quality': ['index', 'main', 'app', 'server', 'client']
    };
    
    const patterns = categoryPatterns[issue.category] || categoryPatterns['code-quality'];
    
    for (const pattern of patterns) {
      try {
        const cmd = `find "${repoPath}" -type f -name "*${pattern}*" 2>/dev/null | grep -E "\\.(js|ts|jsx|tsx)$" | head -5`;
        const output = execSync(cmd, { encoding: 'utf-8' });
        
        if (output) {
          const files = output.trim().split('\n');
          const file = files[0].replace(repoPath + '/', '');
          
          // Return with low confidence since we're just guessing
          return {
            issueId: issue.id,
            file,
            line: 1,
            confidence: 30,
            method: 'category-pattern'
          };
        }
      } catch (e) {
        // No files match this pattern
      }
    }
    
    return null;
  }
  
  /**
   * Extract search terms from issue title and description
   */
  private extractSearchTerms(issue: IssueToLocate): string[] {
    const terms: Set<string> = new Set();
    
    // Extract technical terms from title - remove backticks and special chars
    const cleanTitle = issue.title.replace(/`/g, '').replace(/[^a-zA-Z0-9\s_]/g, ' ');
    const titleWords = cleanTitle.split(/\s+/)
      .filter(word => word.length > 3)
      .filter(word => !['with', 'from', 'that', 'this', 'have', 'been'].includes(word.toLowerCase()));
    
    titleWords.forEach(word => terms.add(word));
    
    // Extract code-like terms from description - already removes backticks
    const codeTerms = issue.description.match(/`([^`]+)`/g) || [];
    codeTerms.forEach(term => terms.add(term.replace(/`/g, '')));
    
    // Extract function/variable names
    const funcNames = issue.description.match(/\b[a-zA-Z_][a-zA-Z0-9_]*\(/g) || [];
    funcNames.forEach(name => terms.add(name.replace('(', '')));
    
    // Add category-specific terms
    if (issue.category === 'security') {
      terms.add('password');
      terms.add('token');
      terms.add('auth');
    } else if (issue.category === 'performance') {
      terms.add('async');
      terms.add('await');
      terms.add('promise');
    }
    
    // Filter out shell-dangerous terms and escape remaining ones
    return Array.from(terms)
      .filter(term => term && /^[a-zA-Z0-9_]+$/.test(term)) // Only alphanumeric and underscore
      .slice(0, 5); // Top 5 terms
  }
  
  /**
   * Find a similar file if exact match doesn't exist
   */
  private findSimilarFile(repoPath: string, fileName: string): string | null {
    const baseName = path.basename(fileName);
    
    try {
      const cmd = `find "${repoPath}" -type f -name "*${baseName}*" 2>/dev/null | head -1`;
      const output = execSync(cmd, { encoding: 'utf-8' });
      
      if (output) {
        return output.trim().replace(repoPath + '/', '');
      }
    } catch (e) {
      // No similar file found
    }
    
    return null;
  }
}