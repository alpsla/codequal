/**
 * DeepWiki Data Validator
 * 
 * Identifies and filters out fake/unreliable data from DeepWiki responses
 * Validates file existence, code snippets, and issue authenticity
 */

import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

export interface ValidationResult {
  isValid: boolean;
  confidence: number; // 0-100
  reasons: string[];
  validatedData?: any;
}

export interface IssueValidation {
  issue: any;
  validation: ValidationResult;
}

export class DeepWikiDataValidator {
  
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
  
  /**
   * Validate a single issue
   */
  async validateIssue(issue: any, repoPath: string): Promise<ValidationResult> {
    const reasons: string[] = [];
    let confidence = 100;
    
    // 1. Check if file exists
    const fileValidation = await this.validateFile(issue.location?.file, repoPath);
    if (!fileValidation.isValid) {
      confidence -= 40;
      reasons.push(`File does not exist: ${issue.location?.file}`);
    }
    
    // 2. Check if it's a generic file name
    if (this.isGenericFileName(issue.location?.file)) {
      confidence -= 20;
      reasons.push(`Generic file name: ${issue.location?.file}`);
    }
    
    // 3. Validate line number if file exists
    if (fileValidation.isValid && issue.location?.line) {
      const lineValidation = this.validateLineNumber(
        path.join(repoPath, issue.location.file),
        issue.location.line
      );
      if (!lineValidation.isValid) {
        confidence -= 20;
        reasons.push(`Line ${issue.location.line} out of range`);
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
    
    // 6. Verify code exists in file (if both are available)
    if (fileValidation.isValid && issue.codeSnippet && issue.location?.file) {
      const codeExists = await this.verifyCodeInFile(
        path.join(repoPath, issue.location.file),
        issue.codeSnippet
      );
      if (!codeExists) {
        confidence -= 35;
        reasons.push('Code snippet not found in file');
      }
    }
    
    // 7. Check issue relevance to file type
    if (issue.location?.file) {
      const relevance = this.checkIssueRelevance(issue);
      if (!relevance) {
        confidence -= 10;
        reasons.push('Issue type doesn\'t match file type');
      }
    }
    
    return {
      isValid: confidence >= 50, // Consider valid if confidence >= 50%
      confidence: Math.max(0, confidence),
      reasons
    };
  }
  
  /**
   * Validate file existence
   */
  private async validateFile(filePath: string | undefined, repoPath: string): Promise<ValidationResult> {
    if (!filePath) {
      return { isValid: false, confidence: 0, reasons: ['No file path provided'] };
    }
    
    const fullPath = path.join(repoPath, filePath);
    
    // Direct check
    if (fs.existsSync(fullPath)) {
      return { isValid: true, confidence: 100, reasons: [] };
    }
    
    // Try common source directories
    const commonDirs = ['src', 'source', 'lib', 'app', 'dist', 'build'];
    for (const dir of commonDirs) {
      const altPath = path.join(repoPath, dir, filePath);
      if (fs.existsSync(altPath)) {
        return { 
          isValid: true, 
          confidence: 80, 
          reasons: [`Found in ${dir}/ directory`],
          validatedData: { actualPath: path.join(dir, filePath) }
        };
      }
    }
    
    // Try to find similar file
    try {
      const baseName = path.basename(filePath);
      const findCmd = `find "${repoPath}" -name "${baseName}" -type f 2>/dev/null | head -1`;
      const foundFile = execSync(findCmd, { encoding: 'utf-8' }).trim();
      
      if (foundFile) {
        const relativePath = path.relative(repoPath, foundFile);
        return {
          isValid: true,
          confidence: 60,
          reasons: [`Similar file found at ${relativePath}`],
          validatedData: { actualPath: relativePath }
        };
      }
    } catch {}
    
    return { isValid: false, confidence: 0, reasons: ['File not found in repository'] };
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
   * Validate line number
   */
  private validateLineNumber(filePath: string, lineNumber: number): ValidationResult {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const lines = content.split('\n');
      
      if (lineNumber > 0 && lineNumber <= lines.length) {
        return { isValid: true, confidence: 100, reasons: [] };
      }
      
      return {
        isValid: false,
        confidence: 0,
        reasons: [`Line ${lineNumber} out of range (file has ${lines.length} lines)`]
      };
    } catch {
      return { isValid: false, confidence: 0, reasons: ['Cannot read file'] };
    }
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
   * Verify code exists in file
   */
  private async verifyCodeInFile(filePath: string, codeSnippet: string): Promise<boolean> {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      
      // Normalize whitespace for comparison
      const normalizedContent = content.replace(/\s+/g, ' ');
      const normalizedSnippet = codeSnippet.replace(/\s+/g, ' ');
      
      // Check exact match
      if (normalizedContent.includes(normalizedSnippet)) {
        return true;
      }
      
      // Check partial match (first 20 chars)
      if (normalizedSnippet.length > 20) {
        const partialSnippet = normalizedSnippet.substring(0, 20);
        return normalizedContent.includes(partialSnippet);
      }
      
      return false;
    } catch {
      return false;
    }
  }
  
  /**
   * Check if issue is relevant to file type
   */
  private checkIssueRelevance(issue: any): boolean {
    const filePath = issue.location?.file;
    if (!filePath) return false;
    
    const ext = path.extname(filePath).toLowerCase();
    const issueType = (issue.type || '').toLowerCase();
    const description = (issue.description || '').toLowerCase();
    
    // SQL injection in non-database files
    if (description.includes('sql') && !['.sql', '.js', '.ts', '.py', '.php'].includes(ext)) {
      return false;
    }
    
    // React/JSX issues in non-React files
    if (description.includes('react') && !['.jsx', '.tsx'].includes(ext)) {
      return false;
    }
    
    // Python-specific issues in non-Python files
    if (description.includes('python') && ext !== '.py') {
      return false;
    }
    
    return true;
  }
  
  /**
   * Validate all issues and filter out fake ones
   */
  async validateAndFilter(issues: any[], repoPath: string): Promise<{
    valid: any[];
    invalid: any[];
    stats: {
      total: number;
      valid: number;
      invalid: number;
      avgConfidence: number;
      filterReasons: Record<string, number>;
    };
  }> {
    console.log(`\n🔍 Validating ${issues.length} issues against repository...`);
    
    const validations: IssueValidation[] = [];
    const filterReasons: Record<string, number> = {};
    
    for (const issue of issues) {
      const validation = await this.validateIssue(issue, repoPath);
      validations.push({ issue, validation });
      
      // Track reasons for filtering
      for (const reason of validation.reasons) {
        const key = reason.split(':')[0]; // Get reason category
        filterReasons[key] = (filterReasons[key] || 0) + 1;
      }
    }
    
    const valid = validations
      .filter(v => v.validation.isValid)
      .map(v => ({
        ...v.issue,
        confidence: v.validation.confidence,
        validatedPath: v.validation.validatedData?.actualPath || v.issue.location?.file
      }));
    
    const invalid = validations
      .filter(v => !v.validation.isValid)
      .map(v => ({
        ...v.issue,
        confidence: v.validation.confidence,
        filterReasons: v.validation.reasons
      }));
    
    const avgConfidence = validations.reduce((sum, v) => sum + v.validation.confidence, 0) / validations.length;
    
    console.log(`✅ Valid issues: ${valid.length}/${issues.length}`);
    console.log(`❌ Filtered out: ${invalid.length}/${issues.length}`);
    console.log(`📊 Average confidence: ${avgConfidence.toFixed(1)}%`);
    
    if (Object.keys(filterReasons).length > 0) {
      console.log(`\n📋 Filter reasons:`);
      for (const [reason, count] of Object.entries(filterReasons)) {
        console.log(`  - ${reason}: ${count} issues`);
      }
    }
    
    return {
      valid,
      invalid,
      stats: {
        total: issues.length,
        valid: valid.length,
        invalid: invalid.length,
        avgConfidence,
        filterReasons
      }
    };
  }
  
  /**
   * Generate validation report
   */
  generateValidationReport(valid: any[], invalid: any[], stats: any): string {
    const report = [];
    
    report.push('# DeepWiki Data Validation Report\n');
    report.push(`Generated: ${new Date().toISOString()}\n`);
    
    report.push('## Summary\n');
    report.push(`- Total issues: ${stats.total}`);
    report.push(`- Valid issues: ${stats.valid} (${(stats.valid/stats.total*100).toFixed(1)}%)`);
    report.push(`- Filtered out: ${stats.invalid} (${(stats.invalid/stats.total*100).toFixed(1)}%)`);
    report.push(`- Average confidence: ${stats.avgConfidence.toFixed(1)}%\n`);
    
    if (Object.keys(stats.filterReasons).length > 0) {
      report.push('## Filter Reasons\n');
      for (const [reason, count] of Object.entries(stats.filterReasons)) {
        report.push(`- ${reason}: ${count} occurrences`);
      }
      report.push('');
    }
    
    report.push('## Valid Issues\n');
    valid.forEach((issue, idx) => {
      report.push(`### ${idx + 1}. ${issue.title || issue.description}`);
      report.push(`- File: ${issue.validatedPath || issue.location?.file}`);
      report.push(`- Confidence: ${issue.confidence}%`);
      report.push(`- Type: ${issue.type}`);
      report.push(`- Severity: ${issue.severity}\n`);
    });
    
    report.push('## Filtered Issues\n');
    invalid.slice(0, 5).forEach((issue, idx) => {
      report.push(`### ${idx + 1}. ${issue.title || issue.description}`);
      report.push(`- Confidence: ${issue.confidence}%`);
      report.push(`- Reasons: ${issue.filterReasons.join('; ')}\n`);
    });
    
    if (invalid.length > 5) {
      report.push(`... and ${invalid.length - 5} more filtered issues\n`);
    }
    
    return report.join('\n');
  }
}