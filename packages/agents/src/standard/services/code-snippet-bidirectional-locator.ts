/**
 * Bidirectional Code Snippet Locator
 * 
 * Supports both:
 * 1. Finding location from code snippet (recovery)
 * 2. Extracting code snippet from location (enhancement)
 * 
 * Works with repository index for maximum performance
 */

import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import { RepositoryIndex } from './repository-indexer';

export interface CodeLocation {
  file: string;
  line: number;
  column?: number;
  confidence: number;
  snippet?: string;
  context?: string;
}

export interface ExtractedSnippet {
  code: string;
  context: string;
  startLine: number;
  endLine: number;
  language?: string;
}

export class BidirectionalCodeLocator {
  private contextLines = 2; // Lines before/after for context
  
  /**
   * Find location from code snippet (for recovery)
   * Uses index for fast searching
   */
  async findLocationFromSnippet(
    snippet: string,
    index: RepositoryIndex,
    repoPath: string
  ): Promise<CodeLocation | null> {
    if (!snippet || snippet.length < 10) {
      return null;
    }
    
    try {
      // First, try exact match using grep (fast)
      const escaped = this.escapeForGrep(snippet.substring(0, 100));
      const grepCmd = `grep -rn -F "${escaped}" "${repoPath}" --include="*.ts" --include="*.js" --include="*.tsx" --include="*.jsx" 2>/dev/null | head -5`;
      
      const result = execSync(grepCmd, { 
        encoding: 'utf8',
        maxBuffer: 10 * 1024 * 1024
      }).trim();
      
      if (result) {
        const lines = result.split('\n');
        for (const line of lines) {
          const match = line.match(/^(.+?):(\d+):(.*)$/);
          if (match) {
            const [, filePath, lineNumber, content] = match;
            const relativePath = path.relative(repoPath, filePath);
            
            // Verify file exists in index
            if (index.fileSet.has(relativePath)) {
              return {
                file: relativePath,
                line: parseInt(lineNumber),
                confidence: 90,
                snippet: content.trim()
              };
            }
          }
        }
      }
      
      // Fallback: Fuzzy search for partial matches
      const firstLine = snippet.split('\n')[0].trim();
      if (firstLine.length > 20) {
        const fuzzyResult = await this.fuzzySearch(
          firstLine,
          index,
          repoPath
        );
        if (fuzzyResult) {
          return fuzzyResult;
        }
      }
      
    } catch (error) {
      // Search failed
    }
    
    return null;
  }
  
  /**
   * Extract code snippet from location (for enhancement)
   * Uses index for validation and file metadata
   */
  async extractSnippetFromLocation(
    file: string,
    line: number,
    index: RepositoryIndex,
    repoPath: string,
    options?: {
      contextLines?: number;
      maxLength?: number;
    }
  ): Promise<ExtractedSnippet | null> {
    // Validate file exists in index (O(1))
    if (!index.fileSet.has(file)) {
      return null;
    }
    
    // Validate line number (O(1))
    const maxLines = index.lineCountCache.get(file);
    if (!maxLines || line < 1 || line > maxLines) {
      return null;
    }
    
    try {
      const filePath = path.join(repoPath, file);
      const content = fs.readFileSync(filePath, 'utf-8');
      const lines = content.split('\n');
      
      const contextLines = options?.contextLines ?? this.contextLines;
      const startLine = Math.max(1, line - contextLines);
      const endLine = Math.min(lines.length, line + contextLines);
      
      // Extract the code with context
      const codeLines = lines.slice(startLine - 1, endLine);
      const code = lines[line - 1]; // Main line
      const context = codeLines.join('\n');
      
      // Get language from file extension
      const metadata = index.fileMetadata.get(file);
      const language = metadata?.language;
      
      return {
        code,
        context,
        startLine,
        endLine,
        language
      };
      
    } catch (error) {
      return null;
    }
  }
  
  /**
   * Batch find locations for multiple snippets
   * Optimized for performance with parallel processing
   */
  async findMultipleLocations(
    snippets: Map<string, string>,
    index: RepositoryIndex,
    repoPath: string
  ): Promise<Map<string, CodeLocation>> {
    const results = new Map<string, CodeLocation>();
    
    // Process in parallel for speed
    const promises = Array.from(snippets.entries()).map(async ([id, snippet]) => {
      const location = await this.findLocationFromSnippet(snippet, index, repoPath);
      if (location) {
        results.set(id, location);
      }
    });
    
    await Promise.all(promises);
    return results;
  }
  
  /**
   * Batch extract snippets for multiple locations
   * Uses index for validation and parallel processing
   */
  async extractMultipleSnippets(
    locations: Array<{ file: string; line: number }>,
    index: RepositoryIndex,
    repoPath: string
  ): Promise<ExtractedSnippet[]> {
    const promises = locations.map(loc => 
      this.extractSnippetFromLocation(loc.file, loc.line, index, repoPath)
    );
    
    const results = await Promise.all(promises);
    return results.filter(r => r !== null) as ExtractedSnippet[];
  }
  
  /**
   * Smart recovery: Try multiple strategies to find code
   */
  async smartRecovery(
    issue: any,
    index: RepositoryIndex,
    repoPath: string
  ): Promise<{ recovered: boolean; location?: CodeLocation }> {
    // Strategy 1: Use provided code snippet
    if (issue.codeSnippet) {
      const location = await this.findLocationFromSnippet(
        issue.codeSnippet,
        index,
        repoPath
      );
      if (location) {
        return { recovered: true, location };
      }
    }
    
    // Strategy 2: Search by error message or description
    if (issue.description) {
      const keywords = this.extractKeywords(issue.description);
      for (const keyword of keywords) {
        const location = await this.searchByKeyword(keyword, index, repoPath);
        if (location) {
          return { recovered: true, location };
        }
      }
    }
    
    // Strategy 3: Use file extension hints
    if (issue.type === 'typescript' && issue.codeSnippet) {
      // Search only in TypeScript files
      const tsLocation = await this.searchInFileType(
        issue.codeSnippet,
        '.ts',
        index,
        repoPath
      );
      if (tsLocation) {
        return { recovered: true, location: tsLocation };
      }
    }
    
    return { recovered: false };
  }
  
  /**
   * Fuzzy search for partial matches
   */
  private async fuzzySearch(
    pattern: string,
    index: RepositoryIndex,
    repoPath: string
  ): Promise<CodeLocation | null> {
    try {
      // Use ripgrep for fuzzy matching
      const searchCmd = `rg -n "${pattern}" "${repoPath}" --type-add 'code:*.{js,ts,jsx,tsx}' -t code -m 5 2>/dev/null || true`;
      const result = execSync(searchCmd, { encoding: 'utf8' }).trim();
      
      if (result) {
        const match = result.match(/^(.+?):(\d+):(.*)$/);
        if (match) {
          const [, filePath, lineNumber] = match;
          const relativePath = path.relative(repoPath, filePath);
          
          if (index.fileSet.has(relativePath)) {
            return {
              file: relativePath,
              line: parseInt(lineNumber),
              confidence: 60, // Lower confidence for fuzzy match
              snippet: pattern
            };
          }
        }
      }
    } catch {}
    
    return null;
  }
  
  /**
   * Search by keyword in indexed files
   */
  private async searchByKeyword(
    keyword: string,
    index: RepositoryIndex,
    repoPath: string
  ): Promise<CodeLocation | null> {
    if (keyword.length < 4) return null;
    
    try {
      const searchCmd = `grep -rn -w "${keyword}" "${repoPath}" --include="*.ts" --include="*.js" 2>/dev/null | head -1`;
      const result = execSync(searchCmd, { encoding: 'utf8' }).trim();
      
      if (result) {
        const match = result.match(/^(.+?):(\d+):(.*)$/);
        if (match) {
          const [, filePath, lineNumber] = match;
          const relativePath = path.relative(repoPath, filePath);
          
          if (index.fileSet.has(relativePath)) {
            return {
              file: relativePath,
              line: parseInt(lineNumber),
              confidence: 40, // Low confidence for keyword match
              snippet: keyword
            };
          }
        }
      }
    } catch {}
    
    return null;
  }
  
  /**
   * Search only in specific file types
   */
  private async searchInFileType(
    pattern: string,
    extension: string,
    index: RepositoryIndex,
    repoPath: string
  ): Promise<CodeLocation | null> {
    // Get files of this type from index
    const files = index.extensionMap.get(extension) || [];
    
    for (const file of files.slice(0, 20)) { // Check first 20 files
      try {
        const filePath = path.join(repoPath, file);
        const content = fs.readFileSync(filePath, 'utf-8');
        
        if (content.includes(pattern)) {
          const lines = content.split('\n');
          for (let i = 0; i < lines.length; i++) {
            if (lines[i].includes(pattern)) {
              return {
                file,
                line: i + 1,
                confidence: 70,
                snippet: lines[i].trim()
              };
            }
          }
        }
      } catch {}
    }
    
    return null;
  }
  
  /**
   * Extract keywords from description
   */
  private extractKeywords(description: string): string[] {
    // Extract function/class names (CamelCase or snake_case)
    const patterns = [
      /\b[A-Z][a-zA-Z0-9]+\b/g,      // CamelCase
      /\b[a-z]+_[a-z_]+\b/g,          // snake_case
      /\b[a-z][a-zA-Z0-9]{4,}\b/g    // Long identifiers
    ];
    
    const keywords = new Set<string>();
    for (const pattern of patterns) {
      const matches = description.match(pattern) || [];
      matches.forEach(m => keywords.add(m));
    }
    
    return Array.from(keywords).slice(0, 5); // Top 5 keywords
  }
  
  /**
   * Escape string for grep
   */
  private escapeForGrep(str: string): string {
    return str.replace(/[|\\{}()[\]^$+*?.]/g, '\\$&').replace(/"/g, '\\"');
  }
}

export default BidirectionalCodeLocator;