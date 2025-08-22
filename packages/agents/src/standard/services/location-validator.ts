/**
 * Location Validator Service
 * 
 * Validates that reported issue locations actually exist and contain
 * code that matches the issue type. This prevents showing fake locations
 * to users and ensures IDE integration works correctly.
 */

import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

export interface LocationValidationResult {
  isValid: boolean;
  fileExists: boolean;
  lineExists: boolean;
  contentMatches: boolean;
  actualContent?: string;
  confidence: number;
  reason?: string;
}

export interface IssueLocation {
  file: string;
  line: number;
  column?: number;
}

export interface IssueToValidate {
  id: string;
  title: string;
  category: string;
  severity: string;
  location: IssueLocation;
  description?: string;
  codeSnippet?: string;
}

export class LocationValidator {
  private repoPath: string;
  private cache = new Map<string, string[]>();
  
  constructor(repositoryUrl: string) {
    this.repoPath = this.getLocalRepoPath(repositoryUrl);
  }
  
  /**
   * Validate a single issue location
   */
  async validateLocation(issue: IssueToValidate): Promise<LocationValidationResult> {
    const result: LocationValidationResult = {
      isValid: false,
      fileExists: false,
      lineExists: false,
      contentMatches: false,
      confidence: 0
    };
    
    // Check if file path is unknown
    if (!issue.location.file || issue.location.file === 'unknown') {
      result.reason = 'File location is unknown';
      return result;
    }
    
    // Check if file exists
    const fullPath = path.join(this.repoPath, issue.location.file);
    if (!fs.existsSync(fullPath)) {
      result.reason = `File does not exist: ${issue.location.file}`;
      return result;
    }
    result.fileExists = true;
    result.confidence += 30;
    
    // Read file content
    const lines = this.getFileLines(fullPath);
    
    // Check if line number is valid
    if (issue.location.line < 1 || issue.location.line > lines.length) {
      result.lineExists = false;
      result.reason = `Line ${issue.location.line} does not exist (file has ${lines.length} lines)`;
      return result;
    }
    result.lineExists = true;
    result.confidence += 30;
    
    // Get content around the specified line
    const contextStart = Math.max(0, issue.location.line - 3);
    const contextEnd = Math.min(lines.length, issue.location.line + 2);
    const contextLines = lines.slice(contextStart, contextEnd);
    result.actualContent = contextLines.join('\n');
    
    // Validate content matches issue type
    const contentValidation = this.validateContentMatchesIssue(
      contextLines,
      issue
    );
    
    result.contentMatches = contentValidation.matches;
    result.confidence += contentValidation.confidence;
    
    if (!result.contentMatches) {
      result.reason = contentValidation.reason;
    }
    
    // Mark as valid if all checks pass
    result.isValid = result.fileExists && result.lineExists && result.contentMatches;
    
    return result;
  }
  
  /**
   * Validate multiple issue locations
   */
  async validateLocations(issues: IssueToValidate[]): Promise<Map<string, LocationValidationResult>> {
    const results = new Map<string, LocationValidationResult>();
    
    for (const issue of issues) {
      const validation = await this.validateLocation(issue);
      results.set(issue.id, validation);
    }
    
    return results;
  }
  
  /**
   * Get validation statistics
   */
  getValidationStats(results: Map<string, LocationValidationResult>): {
    total: number;
    valid: number;
    fileNotFound: number;
    lineNotFound: number;
    contentMismatch: number;
    averageConfidence: number;
  } {
    let valid = 0;
    let fileNotFound = 0;
    let lineNotFound = 0;
    let contentMismatch = 0;
    let totalConfidence = 0;
    
    for (const result of results.values()) {
      if (result.isValid) valid++;
      if (!result.fileExists) fileNotFound++;
      else if (!result.lineExists) lineNotFound++;
      else if (!result.contentMatches) contentMismatch++;
      totalConfidence += result.confidence;
    }
    
    return {
      total: results.size,
      valid,
      fileNotFound,
      lineNotFound,
      contentMismatch,
      averageConfidence: results.size > 0 ? totalConfidence / results.size : 0
    };
  }
  
  /**
   * Validate that content matches the issue type
   */
  private validateContentMatchesIssue(
    lines: string[],
    issue: IssueToValidate
  ): { matches: boolean; confidence: number; reason?: string } {
    const content = lines.join('\n').toLowerCase();
    const category = issue.category.toLowerCase();
    const title = issue.title.toLowerCase();
    
    // Check if provided code snippet matches
    if (issue.codeSnippet) {
      const snippetNormalized = issue.codeSnippet.toLowerCase().replace(/\s+/g, ' ').trim();
      const contentNormalized = content.replace(/\s+/g, ' ').trim();
      
      if (contentNormalized.includes(snippetNormalized)) {
        return { matches: true, confidence: 40 };
      }
    }
    
    // Category-specific validation patterns
    const patterns: Record<string, RegExp[]> = {
      security: [
        /password|secret|token|key|auth|credential/i,
        /sql|query|database|injection/i,
        /xss|script|sanitize|escape/i,
        /eval|exec|system|shell/i
      ],
      performance: [
        /loop|for|while|foreach/i,
        /cache|memory|buffer|stream/i,
        /async|await|promise|callback/i,
        /query|fetch|request|load/i
      ],
      'code-quality': [
        /import|require|include/i,
        /function|class|const|let|var/i,
        /export|module|default/i,
        /return|throw|catch|try/i
      ],
      dependencies: [
        /dependencies|devDependencies|peerDependencies/i,
        /version|package|module/i,
        /require|import.*from/i
      ]
    };
    
    // Check category patterns
    const categoryPatterns = patterns[category] || patterns['code-quality'];
    let matchCount = 0;
    
    for (const pattern of categoryPatterns) {
      if (pattern.test(content)) {
        matchCount++;
      }
    }
    
    // Check title keywords in content
    const titleWords = title.split(/\s+/).filter(w => w.length > 3);
    let titleMatchCount = 0;
    
    for (const word of titleWords) {
      if (content.includes(word)) {
        titleMatchCount++;
      }
    }
    
    // Calculate confidence based on matches
    const categoryConfidence = (matchCount / categoryPatterns.length) * 20;
    const titleConfidence = (titleMatchCount / Math.max(titleWords.length, 1)) * 20;
    const totalConfidence = categoryConfidence + titleConfidence;
    
    if (totalConfidence >= 20) {
      return { matches: true, confidence: totalConfidence };
    }
    
    // Special case: package.json for dependency issues
    if (category === 'dependencies' && issue.location.file.endsWith('package.json')) {
      return { matches: true, confidence: 35 };
    }
    
    // Special case: test files for testing issues
    if (title.includes('test') && (
      issue.location.file.includes('test') || 
      issue.location.file.includes('spec')
    )) {
      return { matches: true, confidence: 30 };
    }
    
    return {
      matches: false,
      confidence: totalConfidence,
      reason: `Content at line ${issue.location.line} doesn't match ${category} issue: "${issue.title}"`
    };
  }
  
  /**
   * Get file lines with caching
   */
  private getFileLines(filePath: string): string[] {
    if (this.cache.has(filePath)) {
      return this.cache.get(filePath)!;
    }
    
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const lines = content.split('\n');
      this.cache.set(filePath, lines);
      return lines;
    } catch (error) {
      return [];
    }
  }
  
  /**
   * Get local repository path
   */
  private getLocalRepoPath(repositoryUrl: string): string {
    // Extract repo info from URL
    const match = repositoryUrl.match(/github\.com\/([^/]+)\/([^/?]+)/);
    if (!match) {
      throw new Error(`Invalid GitHub URL: ${repositoryUrl}`);
    }
    
    const [, owner, repo] = match;
    const repoName = repo.replace(/\.git$/, '');
    
    // Check common locations
    const possiblePaths = [
      `/tmp/codequal-repos/${owner}-${repoName}`,
      `/tmp/codequal/${owner}/${repoName}`,
      `/tmp/${owner}-${repoName}`,
      path.join(process.cwd(), 'temp', `${owner}-${repoName}`)
    ];
    
    for (const repoPath of possiblePaths) {
      if (fs.existsSync(repoPath)) {
        return repoPath;
      }
    }
    
    // Try to clone if not found
    const clonePath = `/tmp/codequal-repos/${owner}-${repoName}`;
    if (!fs.existsSync(clonePath)) {
      console.log(`Cloning repository to ${clonePath} for validation...`);
      try {
        execSync(`git clone --depth 1 ${repositoryUrl} ${clonePath}`, {
          stdio: 'pipe'
        });
      } catch (error) {
        console.error('Failed to clone repository:', error);
      }
    }
    
    return clonePath;
  }
  
  /**
   * Generate validation report
   */
  generateValidationReport(
    issues: IssueToValidate[],
    results: Map<string, LocationValidationResult>
  ): string {
    const stats = this.getValidationStats(results);
    
    let report = '# Location Validation Report\n\n';
    report += `## Summary\n\n`;
    report += `- **Total Issues:** ${stats.total}\n`;
    report += `- **Valid Locations:** ${stats.valid} (${Math.round(stats.valid / stats.total * 100)}%)\n`;
    report += `- **File Not Found:** ${stats.fileNotFound}\n`;
    report += `- **Line Not Found:** ${stats.lineNotFound}\n`;
    report += `- **Content Mismatch:** ${stats.contentMismatch}\n`;
    report += `- **Average Confidence:** ${Math.round(stats.averageConfidence)}%\n\n`;
    
    report += `## Detailed Results\n\n`;
    
    // Group by validation status
    const valid: IssueToValidate[] = [];
    const invalid: IssueToValidate[] = [];
    
    for (const issue of issues) {
      const result = results.get(issue.id);
      if (result?.isValid) {
        valid.push(issue);
      } else {
        invalid.push(issue);
      }
    }
    
    // Valid locations
    if (valid.length > 0) {
      report += `### ✅ Valid Locations (${valid.length})\n\n`;
      for (const issue of valid) {
        const result = results.get(issue.id)!;
        report += `- **${issue.title}** (${issue.severity})\n`;
        report += `  - File: \`${issue.location.file}:${issue.location.line}\`\n`;
        report += `  - Confidence: ${Math.round(result.confidence)}%\n`;
      }
      report += '\n';
    }
    
    // Invalid locations
    if (invalid.length > 0) {
      report += `### ❌ Invalid Locations (${invalid.length})\n\n`;
      for (const issue of invalid) {
        const result = results.get(issue.id)!;
        report += `- **${issue.title}** (${issue.severity})\n`;
        report += `  - File: \`${issue.location.file}:${issue.location.line}\`\n`;
        report += `  - Reason: ${result.reason}\n`;
        report += `  - Confidence: ${Math.round(result.confidence)}%\n`;
      }
      report += '\n';
    }
    
    // Recommendations
    report += `## Recommendations\n\n`;
    
    if (stats.valid / stats.total < 0.5) {
      report += `⚠️ **Less than 50% of locations are valid.** Consider:\n`;
      report += `- Using the LocationClarifier service to find real locations\n`;
      report += `- Updating DeepWiki prompts to emphasize exact location requirements\n`;
      report += `- Implementing fallback location detection using code search\n\n`;
    }
    
    if (stats.fileNotFound > 0) {
      report += `⚠️ **${stats.fileNotFound} files not found.** Possible causes:\n`;
      report += `- Repository structure has changed\n`;
      report += `- Files are in different branch\n`;
      report += `- Incorrect file paths returned by DeepWiki\n\n`;
    }
    
    if (stats.contentMismatch > 0) {
      report += `⚠️ **${stats.contentMismatch} content mismatches.** Consider:\n`;
      report += `- Issue descriptions may not match actual code\n`;
      report += `- Line numbers may be off by a few lines\n`;
      report += `- Code may have been refactored since analysis\n\n`;
    }
    
    return report;
  }
}