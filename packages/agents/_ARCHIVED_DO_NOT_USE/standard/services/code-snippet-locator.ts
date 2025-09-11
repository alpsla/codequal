/**
 * Code Snippet Locator Service
 * Searches for code snippets in cloned repositories to find exact file locations
 * This is a workaround for DeepWiki's missing location metadata
 */

import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

export interface CodeLocation {
  file: string;
  line: number;
  column?: number;
  confidence: number;
  context?: string;
}

export interface SnippetSearchResult {
  issueId: string;
  snippet: string;
  locations: CodeLocation[];
}

export class CodeSnippetLocator {
  private repoCache: Map<string, string> = new Map();
  
  /**
   * Search for code snippets in a cloned repository
   * @param repoPath Path to the cloned repository
   * @param snippets Map of issue IDs to code snippets
   * @returns Array of search results with file locations
   */
  async searchSnippets(
    repoPath: string, 
    snippets: Map<string, string>
  ): Promise<SnippetSearchResult[]> {
    const results: SnippetSearchResult[] = [];
    
    // Verify repo exists
    if (!fs.existsSync(repoPath)) {
      console.warn(`Repository path not found: ${repoPath}`);
      return results;
    }
    
    console.log(`🔍 Searching for ${snippets.size} code snippets in ${repoPath}`);
    
    for (const [issueId, snippet] of snippets) {
      const locations = await this.findSnippetInRepo(repoPath, snippet);
      results.push({
        issueId,
        snippet,
        locations
      });
    }
    
    // Log summary
    const foundCount = results.filter(r => r.locations.length > 0).length;
    console.log(`✅ Found locations for ${foundCount}/${snippets.size} snippets`);
    
    return results;
  }
  
  /**
   * Find a specific code snippet in the repository
   * @param repoPath Path to the repository
   * @param snippet Code snippet to search for
   * @returns Array of locations where the snippet was found
   */
  private async findSnippetInRepo(
    repoPath: string, 
    snippet: string
  ): Promise<CodeLocation[]> {
    const locations: CodeLocation[] = [];
    
    if (!snippet || snippet.length < 5) {
      return locations; // Skip very short snippets
    }
    
    try {
      // Escape special characters for grep
      const escapedSnippet = this.escapeForGrep(snippet);
      
      // Use grep to find exact matches with line numbers
      // -r: recursive, -n: line numbers, -F: fixed string (literal)
      const grepCommand = `grep -rn -F "${escapedSnippet}" "${repoPath}" --include="*.ts" --include="*.js" --include="*.tsx" --include="*.jsx" --include="*.mjs" --include="*.cjs" 2>/dev/null || true`;
      
      const result = execSync(grepCommand, { 
        encoding: 'utf8',
        maxBuffer: 10 * 1024 * 1024 // 10MB buffer
      });
      
      if (result) {
        // Parse grep output: filename:linenumber:content
        const lines = result.split('\n').filter(line => line.trim());
        
        for (const line of lines) {
          const match = line.match(/^(.+?):(\d+):(.*)$/);
          if (match) {
            const [, filePath, lineNumber, content] = match;
            const relativePath = path.relative(repoPath, filePath);
            
            locations.push({
              file: relativePath,
              line: parseInt(lineNumber, 10),
              confidence: 1.0, // Exact match
              context: content.trim()
            });
          }
        }
      }
      
      // If no exact match, try fuzzy search for partial matches
      if (locations.length === 0 && snippet.length > 20) {
        const fuzzyLocations = await this.fuzzySearchSnippet(repoPath, snippet);
        locations.push(...fuzzyLocations);
      }
      
    } catch (error) {
      // Grep returns non-zero exit code when no matches found, which is fine
      // Only log actual errors
      if (error instanceof Error && !error.message.includes('Command failed')) {
        console.error(`Error searching for snippet: ${error.message}`);
      }
    }
    
    return locations;
  }
  
  /**
   * Fuzzy search for snippets (handles minor variations)
   * @param repoPath Path to the repository
   * @param snippet Code snippet to search for
   * @returns Array of potential locations with confidence scores
   */
  private async fuzzySearchSnippet(
    repoPath: string,
    snippet: string
  ): Promise<CodeLocation[]> {
    const locations: CodeLocation[] = [];
    
    try {
      // Extract key parts of the snippet (function names, variable names, etc.)
      const keywords = this.extractKeywords(snippet);
      
      if (keywords.length === 0) {
        return locations;
      }
      
      // Search for files containing all keywords
      const keywordPattern = keywords.map(k => `-e "${k}"`).join(' ');
      const searchCommand = `grep -rl ${keywordPattern} "${repoPath}" --include="*.ts" --include="*.js" --include="*.tsx" --include="*.jsx" 2>/dev/null || true`;
      
      const files = execSync(searchCommand, { encoding: 'utf8' })
        .split('\n')
        .filter(f => f.trim());
      
      // Check each file for snippet similarity
      for (const file of files.slice(0, 10)) { // Limit to 10 files
        const content = fs.readFileSync(file, 'utf8');
        const lines = content.split('\n');
        
        // Find best matching line
        let bestMatch = { line: 0, score: 0 };
        
        for (let i = 0; i < lines.length; i++) {
          const lineContent = lines[i];
          const score = this.calculateSimilarity(snippet, lineContent);
          
          if (score > bestMatch.score && score > 0.5) {
            bestMatch = { line: i + 1, score };
          }
        }
        
        if (bestMatch.line > 0) {
          const relativePath = path.relative(repoPath, file);
          locations.push({
            file: relativePath,
            line: bestMatch.line,
            confidence: bestMatch.score,
            context: lines[bestMatch.line - 1].trim()
          });
        }
      }
      
    } catch (error) {
      // Ignore errors in fuzzy search
    }
    
    return locations.sort((a, b) => b.confidence - a.confidence).slice(0, 3);
  }
  
  /**
   * Extract keywords from a code snippet for fuzzy searching
   */
  private extractKeywords(snippet: string): string[] {
    const keywords: string[] = [];
    
    // Extract function names
    const funcMatches = snippet.match(/function\s+(\w+)|(\w+)\s*\(/g);
    if (funcMatches) {
      keywords.push(...funcMatches.map(m => m.replace(/[(\s]/g, '')));
    }
    
    // Extract variable names
    const varMatches = snippet.match(/(?:const|let|var)\s+(\w+)/g);
    if (varMatches) {
      keywords.push(...varMatches.map(m => m.replace(/^(const|let|var)\s+/, '')));
    }
    
    // Extract class names
    const classMatches = snippet.match(/class\s+(\w+)/g);
    if (classMatches) {
      keywords.push(...classMatches.map(m => m.replace(/^class\s+/, '')));
    }
    
    // Extract method calls
    const methodMatches = snippet.match(/\.(\w+)\(/g);
    if (methodMatches) {
      keywords.push(...methodMatches.map(m => m.replace(/[.()]/g, '')));
    }
    
    // Remove duplicates and filter out common words
    const uniqueKeywords = [...new Set(keywords)].filter(k => 
      k.length > 2 && !['function', 'const', 'let', 'var', 'class'].includes(k)
    );
    
    return uniqueKeywords.slice(0, 5); // Limit to 5 most relevant keywords
  }
  
  /**
   * Calculate similarity between two strings (0 to 1)
   */
  private calculateSimilarity(str1: string, str2: string): number {
    // Remove whitespace and normalize
    const normalize = (s: string) => s.replace(/\s+/g, ' ').trim().toLowerCase();
    const s1 = normalize(str1);
    const s2 = normalize(str2);
    
    if (s1 === s2) return 1.0;
    if (s1.includes(s2) || s2.includes(s1)) return 0.8;
    
    // Calculate Jaccard similarity on tokens
    const tokens1 = new Set(s1.split(/\W+/).filter(t => t.length > 2));
    const tokens2 = new Set(s2.split(/\W+/).filter(t => t.length > 2));
    
    if (tokens1.size === 0 || tokens2.size === 0) return 0;
    
    const intersection = new Set([...tokens1].filter(t => tokens2.has(t)));
    const union = new Set([...tokens1, ...tokens2]);
    
    return intersection.size / union.size;
  }
  
  /**
   * Escape special characters for grep
   */
  private escapeForGrep(str: string): string {
    // Escape double quotes and backslashes
    return str.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  }
  
  /**
   * Get repository paths for both main and PR branches
   */
  static getRepoPaths(repoUrl: string, prNumber?: number): { main: string; pr?: string } {
    const cacheDir = process.env.REPO_CACHE_DIR || '/tmp/codequal-repos';
    const urlParts = repoUrl.replace(/\.git$/, '').split('/');
    const owner = urlParts[urlParts.length - 2];
    const repo = urlParts[urlParts.length - 1];
    
    const paths: { main: string; pr?: string } = {
      main: path.join(cacheDir, `${owner}-${repo}`)
    };
    
    if (prNumber) {
      paths.pr = path.join(cacheDir, `${owner}-${repo}-pr-${prNumber}`);
    }
    
    return paths;
  }
  
  /**
   * Apply found locations back to issues
   */
  applyLocationsToIssues(issues: any[], searchResults: SnippetSearchResult[]): void {
    const locationMap = new Map<string, CodeLocation[]>();
    
    for (const result of searchResults) {
      if (result.locations.length > 0) {
        locationMap.set(result.issueId, result.locations);
      }
    }
    
    for (const issue of issues) {
      const locations = locationMap.get(issue.id);
      if (locations && locations.length > 0) {
        const bestLocation = locations[0]; // Use highest confidence match
        
        issue.location = {
          file: bestLocation.file,
          line: bestLocation.line,
          column: bestLocation.column || 0
        };
        
        // Update file field as well for compatibility
        issue.file = bestLocation.file;
        issue.line = bestLocation.line;
        
        // Add confidence metadata
        if (!issue.metadata) {
          issue.metadata = {};
        }
        issue.metadata.locationConfidence = bestLocation.confidence;
        issue.metadata.locationSource = 'code-snippet-search';
      }
    }
  }
}

export default CodeSnippetLocator;