/**
 * DeepWiki Data Validator with Index Support
 * 
 * Enhanced version that uses repository index for O(1) lookups
 * and supports code snippet recovery for mislocated issues
 */

import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import { RepositoryIndex } from './repository-indexer';
import { CodeSnippetLocator } from './code-snippet-locator';

export interface ValidationResult {
  isValid: boolean;
  confidence: number; // 0-100
  reasons: string[];
  validatedData?: any;
  recovered?: boolean; // Indicates if issue was recovered via code search
}

export interface IssueValidation {
  issue: any;
  validation: ValidationResult;
}

export class DeepWikiDataValidatorIndexed {
  private snippetLocator: CodeSnippetLocator;
  
  // Common fake/generic file names that DeepWiki often returns
  private readonly GENERIC_FILE_PATTERNS = [
    'index.js',
    'main.js',
    'app.js',
    'server.js',
    'config.js',
    'utils.js',
    'fetch.js',
    'request.js',
    'api.js',
    'database.js',
    'auth.js',
    'test.js'
  ];
  
  // Generic code patterns that indicate placeholder/fake code
  private readonly FAKE_CODE_PATTERNS = [
    /userInput/i,
    /password123/i,
    /example\.com/i,
    /foo|bar|baz/i,
    /test123/i,
    /your[A-Z]\w+/,  // yourVariable, yourFunction, etc.
    /my[A-Z]\w+/,    // myVariable, myFunction, etc.
    /TODO|FIXME|XXX/,
    /INSERT.*HERE/i,
    /CHANGE.*ME/i,
    /12345|abcde/i,  // Fake API keys
    /eval\(userInput\)/,  // Too generic security example
    /console\.log\(password\)/,  // Too generic security example
  ];
  
  // Generic issue descriptions that appear across all repos
  private readonly GENERIC_ISSUE_PATTERNS = [
    /eval.*can.*lead.*to.*injection/i,
    /hardcoded.*api.*key/i,
    /sensitive.*data.*logged/i,
    /missing.*input.*validation/i,
    /outdated.*dependencies/i,
    /synchronous.*blocks.*event.*loop/i,
    /excessive.*promise.*chaining/i,
    /missing.*error.*handling/i,
    /potential.*memory.*leak/i,
    /inconsistent.*quotes/i
  ];
  
  constructor() {
    this.snippetLocator = new CodeSnippetLocator();
  }
  
  /**
   * Validate a single issue using repository index for O(1) lookups
   */
  async validateIssueWithIndex(
    issue: any,
    index: RepositoryIndex,
    repoPath: string
  ): Promise<ValidationResult> {
    const reasons: string[] = [];
    let confidence = 100;
    let recovered = false;
    let validatedPath = issue.location?.file;
    
    // 1. Fast O(1) file existence check using index
    const fileExists = validatedPath && index.fileSet.has(validatedPath);
    
    if (!fileExists && issue.codeSnippet && !this.isFakeCode(issue.codeSnippet)) {
      // Try to recover by searching for the code snippet
      console.log(`  🔍 Attempting to recover issue by code search...`);
      const recoveredLocation = await this.recoverIssueLocation(
        issue,
        index,
        repoPath
      );
      
      if (recoveredLocation) {
        validatedPath = recoveredLocation.file;
        issue.location = {
          ...issue.location,
          file: recoveredLocation.file,
          line: recoveredLocation.line
        };
        confidence += 20; // Boost confidence for successful recovery
        recovered = true;
        reasons.push(`Issue recovered: found code at ${recoveredLocation.file}:${recoveredLocation.line}`);
        console.log(`  ✅ Recovered! Found at ${recoveredLocation.file}:${recoveredLocation.line}`);
      } else {
        confidence -= 40;
        reasons.push(`File does not exist: ${issue.location?.file}`);
      }
    } else if (!fileExists) {
      confidence -= 40;
      reasons.push(`File does not exist: ${issue.location?.file}`);
    }
    
    // 2. Check if it's a generic file name
    if (this.isGenericFileName(validatedPath)) {
      confidence -= 20;
      reasons.push(`Generic file name: ${validatedPath}`);
    }
    
    // 3. Fast O(1) line validation using cached line counts
    if (validatedPath && index.lineCountCache.has(validatedPath) && issue.location?.line) {
      const maxLines = index.lineCountCache.get(validatedPath)!;
      if (issue.location.line > maxLines || issue.location.line < 1) {
        confidence -= 20;
        reasons.push(`Line ${issue.location.line} out of range (file has ${maxLines} lines)`);
      }
    }
    
    // 4. Check for fake code patterns
    if (issue.codeSnippet && this.isFakeCode(issue.codeSnippet)) {
      confidence -= 30;
      reasons.push('Code snippet contains generic/placeholder patterns');
    }
    
    // 5. Check for generic issue descriptions
    if (this.isGenericIssue(issue.description || issue.title)) {
      confidence -= 15;
      reasons.push('Generic issue description');
    }
    
    // 6. Verify code exists in file (only if not recovered)
    if (!recovered && validatedPath && issue.codeSnippet && index.fileSet.has(validatedPath)) {
      const codeExists = await this.verifyCodeInFileQuick(
        path.join(repoPath, validatedPath),
        issue.codeSnippet
      );
      if (!codeExists) {
        // Try recovery one more time
        const recoveredLocation = await this.recoverIssueLocation(
          issue,
          index,
          repoPath
        );
        
        if (recoveredLocation) {
          issue.location = {
            ...issue.location,
            file: recoveredLocation.file,
            line: recoveredLocation.line
          };
          confidence += 15; // Partial confidence boost
          recovered = true;
          reasons.push(`Code relocated to ${recoveredLocation.file}`);
        } else {
          confidence -= 35;
          reasons.push('Code snippet not found in file');
        }
      }
    }
    
    // 7. Check issue relevance to file type using index
    if (validatedPath) {
      const metadata = index.fileMetadata.get(validatedPath);
      if (metadata) {
        const relevance = this.checkIssueRelevanceWithMetadata(issue, metadata);
        if (!relevance) {
          confidence -= 10;
          reasons.push('Issue type doesn\'t match file type');
        }
      }
    }
    
    return {
      isValid: confidence >= 50,
      confidence: Math.max(0, confidence),
      reasons,
      recovered,
      validatedData: recovered ? { actualPath: validatedPath } : undefined
    };
  }
  
  /**
   * Try to recover issue location by searching for code snippet
   */
  private async recoverIssueLocation(
    issue: any,
    index: RepositoryIndex,
    repoPath: string
  ): Promise<{ file: string; line: number } | null> {
    if (!issue.codeSnippet || issue.codeSnippet.length < 10) {
      return null;
    }
    
    try {
      // Use CodeSnippetLocator to find the snippet
      const snippets = new Map([[issue.id || 'unknown', issue.codeSnippet]]);
      const results = await this.snippetLocator.searchSnippets(repoPath, snippets);
      
      if (results.length > 0 && results[0].locations.length > 0) {
        const bestMatch = results[0].locations[0];
        
        // Verify the found file exists in our index
        if (index.fileSet.has(bestMatch.file)) {
          return {
            file: bestMatch.file,
            line: bestMatch.line
          };
        }
      }
      
      // Fallback: Quick grep search for first line of snippet
      const firstLine = issue.codeSnippet.split('\n')[0].trim();
      if (firstLine.length > 15) {
        const searchPattern = this.escapeForGrep(firstLine);
        const grepCmd = `grep -rn -F "${searchPattern}" "${repoPath}" --include="*.ts" --include="*.js" --include="*.tsx" --include="*.jsx" 2>/dev/null | head -1`;
        
        const result = execSync(grepCmd, { encoding: 'utf-8' }).trim();
        if (result) {
          const match = result.match(/^(.+?):(\d+):(.*)$/);
          if (match) {
            const filePath = path.relative(repoPath, match[1]);
            const lineNumber = parseInt(match[2]);
            
            if (index.fileSet.has(filePath)) {
              return { file: filePath, line: lineNumber };
            }
          }
        }
      }
    } catch (error) {
      // Recovery failed, return null
    }
    
    return null;
  }
  
  /**
   * Quick code verification without full file read
   */
  private async verifyCodeInFileQuick(filePath: string, codeSnippet: string): Promise<boolean> {
    try {
      // Use grep for fast searching
      const escaped = this.escapeForGrep(codeSnippet.substring(0, 50));
      const grepCmd = `grep -F "${escaped}" "${filePath}" 2>/dev/null | head -1`;
      const result = execSync(grepCmd, { encoding: 'utf-8' }).trim();
      return result.length > 0;
    } catch {
      return false;
    }
  }
  
  /**
   * Escape string for grep
   */
  private escapeForGrep(str: string): string {
    return str.replace(/[|\\{}()[\]^$+*?.]/g, '\\$&').replace(/"/g, '\\"');
  }
  
  /**
   * Check if file name is generic/fake
   */
  private isGenericFileName(filePath: string | undefined): boolean {
    if (!filePath) return true;
    
    const fileName = path.basename(filePath);
    return this.GENERIC_FILE_PATTERNS.some(pattern => 
      fileName === pattern || fileName === pattern.replace('.js', '.ts')
    );
  }
  
  /**
   * Check if code snippet is fake/placeholder
   */
  private isFakeCode(code: string): boolean {
    if (!code || code.length < 5) return true;
    
    // Check for placeholder patterns
    for (const pattern of this.FAKE_CODE_PATTERNS) {
      if (pattern.test(code)) {
        return true;
      }
    }
    
    // Check if code is too generic (no specific identifiers)
    const hasSpecificIdentifiers = /[a-z][a-zA-Z0-9]{3,}/.test(code);
    if (!hasSpecificIdentifiers) {
      return true;
    }
    
    return false;
  }
  
  /**
   * Check if issue description is generic
   */
  private isGenericIssue(description: string): boolean {
    if (!description) return true;
    
    for (const pattern of this.GENERIC_ISSUE_PATTERNS) {
      if (pattern.test(description)) {
        return true;
      }
    }
    
    return false;
  }
  
  /**
   * Check issue relevance using file metadata
   */
  private checkIssueRelevanceWithMetadata(issue: any, metadata: any): boolean {
    const issueType = (issue.type || '').toLowerCase();
    const description = (issue.description || '').toLowerCase();
    const language = metadata.language?.toLowerCase();
    const ext = metadata.extension.toLowerCase();
    
    // SQL injection in non-database files
    if (description.includes('sql') && !['.sql', '.js', '.ts', '.py', '.php'].includes(ext)) {
      return false;
    }
    
    // React/JSX issues in non-React files
    if (description.includes('react') && !['.jsx', '.tsx'].includes(ext)) {
      return false;
    }
    
    // Language-specific checks
    if (description.includes('python') && language !== 'python') {
      return false;
    }
    
    if (description.includes('typescript') && language !== 'typescript') {
      return false;
    }
    
    return true;
  }
  
  /**
   * Validate all issues using index for maximum performance
   */
  async validateAndFilterWithIndex(
    issues: any[],
    index: RepositoryIndex,
    repoPath: string
  ): Promise<{
    valid: any[];
    invalid: any[];
    recovered: any[];
    stats: {
      total: number;
      valid: number;
      invalid: number;
      recovered: number;
      avgConfidence: number;
      filterReasons: Record<string, number>;
      indexingTime: number;
      validationTime: number;
    };
  }> {
    const startTime = Date.now();
    console.log(`\n🔍 Validating ${issues.length} issues using indexed data...`);
    console.log(`  📊 Index stats: ${index.stats.totalFiles} files, ${index.stats.totalLines.toLocaleString()} lines`);
    
    const validations: IssueValidation[] = [];
    const filterReasons: Record<string, number> = {};
    
    // Process all validations in parallel for speed
    const validationPromises = issues.map(async (issue) => {
      const validation = await this.validateIssueWithIndex(issue, index, repoPath);
      
      // Track reasons for filtering
      for (const reason of validation.reasons) {
        const key = reason.split(':')[0];
        filterReasons[key] = (filterReasons[key] || 0) + 1;
      }
      
      return { issue, validation };
    });
    
    const results = await Promise.all(validationPromises);
    validations.push(...results);
    
    // Categorize results
    const valid = validations
      .filter(v => v.validation.isValid)
      .map(v => ({
        ...v.issue,
        confidence: v.validation.confidence,
        recovered: v.validation.recovered,
        validatedPath: v.validation.validatedData?.actualPath || v.issue.location?.file
      }));
    
    const invalid = validations
      .filter(v => !v.validation.isValid)
      .map(v => ({
        ...v.issue,
        confidence: v.validation.confidence,
        filterReasons: v.validation.reasons
      }));
    
    const recovered = validations
      .filter(v => v.validation.recovered)
      .map(v => ({
        ...v.issue,
        originalPath: v.issue.location?.file,
        recoveredPath: v.validation.validatedData?.actualPath
      }));
    
    const avgConfidence = validations.reduce((sum, v) => sum + v.validation.confidence, 0) / validations.length;
    const validationTime = Date.now() - startTime;
    
    console.log(`✅ Valid issues: ${valid.length}/${issues.length}`);
    console.log(`🔄 Recovered issues: ${recovered.length}`);
    console.log(`❌ Filtered out: ${invalid.length}/${issues.length}`);
    console.log(`📊 Average confidence: ${avgConfidence.toFixed(1)}%`);
    console.log(`⚡ Validation time: ${validationTime}ms (vs ~${issues.length * 50}ms without index)`);
    
    if (Object.keys(filterReasons).length > 0) {
      console.log(`\n📋 Filter reasons:`);
      for (const [reason, count] of Object.entries(filterReasons)) {
        console.log(`  - ${reason}: ${count} issues`);
      }
    }
    
    return {
      valid,
      invalid,
      recovered,
      stats: {
        total: issues.length,
        valid: valid.length,
        invalid: invalid.length,
        recovered: recovered.length,
        avgConfidence,
        filterReasons,
        indexingTime: index.stats.indexingTime,
        validationTime
      }
    };
  }
  
  /**
   * Fallback to original validation (without index)
   * Used when index is not available
   */
  async validateAndFilterFallback(
    issues: any[],
    repoPath: string
  ): Promise<any> {
    console.log(`⚠️ Using fallback validation without index (slower)`);
    
    // Import and use original validator as fallback
    const { DeepWikiDataValidator } = await import('./deepwiki-data-validator');
    const fallbackValidator = new DeepWikiDataValidator();
    return fallbackValidator.validateAndFilter(issues, repoPath);
  }
}