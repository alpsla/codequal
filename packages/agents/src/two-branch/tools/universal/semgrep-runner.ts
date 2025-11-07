/**
 * Universal Semgrep Runner
 * 
 * Executes Semgrep security scanning across ALL programming languages.
 * 
 * Supported Languages:
 * - Java, TypeScript, JavaScript, Python, Go, Ruby, PHP
 * - C, C++, Rust, Kotlin, Swift, C#
 * 
 * Features:
 * - Auto-detects language from file extensions
 * - Uses Semgrep's "auto" ruleset (curated security rules)
 * - Parses JSON output into standardized Issue[]
 * - Consistent behavior across all languages
 * 
 * Installation:
 * - Host: pip3 install semgrep==1.45.0
 * - OR already installed in language containers
 */

import * as fs from 'fs';
import * as path from 'path';
import { UniversalToolBase, UniversalToolConfig } from './universal-tool-base';
import { Issue } from '../../analyzers/v9-types';

interface SemgrepFinding {
  check_id: string;
  path: string;
  start: {
    line: number;
    col: number;
  };
  end: {
    line: number;
    col: number;
  };
  extra: {
    message: string;
    severity: string;
    metadata?: {
      cwe?: string[];
      owasp?: string[];
      confidence?: string;
    };
  };
}

interface SemgrepOutput {
  results: SemgrepFinding[];
  errors: any[];
}

export class UniversalSemgrepRunner extends UniversalToolBase {
  
  constructor(workspacePath: string, language: string) {
    super({
      name: 'semgrep',
      language,
      workspacePath,
      outputFile: path.join(workspacePath, '.semgrep-output.json'),
      timeout: 120000 // 2 minutes
    });
  }
  
  /**
   * Execute Semgrep and return standardized issues
   */
  async execute(): Promise<Issue[]> {
    const startTime = Date.now();
    
    try {
      // Check if semgrep is available
      await this.checkSemgrepInstalled();
      
      // Build and run command
      const command = this.buildCommand();
      const { stdout, stderr } = await this.runCommand(command);
      
      // Parse output
      const issues = this.parseOutput(stdout || stderr);
      
      // Log summary
      const duration = (Date.now() - startTime) / 1000;
      this.logSummary(issues, duration);
      
      // Cleanup output file
      this.cleanupOutputFile();
      
      return issues;
      
    } catch (error: any) {
      console.error(`[Universal Semgrep] ❌ Error: ${error.message}`);
      
      // Return empty array on error (don't fail entire analysis)
      return [];
    }
  }
  
  /**
   * Build Semgrep command
   */
  protected buildCommand(): string {
    const { outputFile, workspacePath } = this.config;
    
    // Use Semgrep's "auto" config (curated security rules)
    // --json for structured output
    // --quiet to suppress progress bars
    // --no-git-ignore to scan all files
    // --metrics=off to disable telemetry
    
    return `semgrep \
      --config=auto \
      --json \
      --quiet \
      --no-git-ignore \
      --metrics=off \
      --output="${outputFile}" \
      "${workspacePath}" 2>&1 || true`;
  }
  
  /**
   * Parse Semgrep JSON output
   */
  protected parseOutput(output: string): Issue[] {
    const issues: Issue[] = [];
    
    try {
      // Try to read from output file first
      let semgrepData: SemgrepOutput;
      
      if (this.config.outputFile && fs.existsSync(this.config.outputFile)) {
        const fileContent = fs.readFileSync(this.config.outputFile, 'utf-8');
        semgrepData = JSON.parse(fileContent);
      } else {
        // Fallback to parsing stdout
        semgrepData = JSON.parse(output);
      }
      
      // Process each finding
      for (const finding of semgrepData.results || []) {
        const issue = this.convertSemgrepFinding(finding);
        if (issue) {
          issues.push(issue);
        }
      }
      
      // Log errors if any
      if (semgrepData.errors && semgrepData.errors.length > 0) {
        console.warn(`[Universal Semgrep] ⚠️ ${semgrepData.errors.length} parse errors`);
      }
      
    } catch (error: any) {
      console.error(`[Universal Semgrep] ❌ Failed to parse output: ${error.message}`);
      console.error(`[Universal Semgrep] Output preview: ${output.substring(0, 500)}`);
    }
    
    return issues;
  }
  
  /**
   * Convert Semgrep finding to V9 Issue
   */
  private convertSemgrepFinding(finding: SemgrepFinding): Issue | null {
    try {
      // Determine severity (Semgrep uses: ERROR, WARNING, INFO)
      const severity = this.mapSemgrepSeverity(finding.extra.severity);
      
      // Extract CWE if available
      const cweId = finding.extra.metadata?.cwe?.[0];
      
      // Clean file path
      const filePath = this.cleanFilePath(finding.path);
      
      return this.createIssue({
        tool: 'semgrep',
        category: 'Security',
        severity,
        file: filePath,
        line: finding.start.line,
        column: finding.start.col,
        message: finding.extra.message,
        description: `Semgrep rule: ${finding.check_id}`,
        ruleId: finding.check_id,
        cweId
      });
      
    } catch (error: any) {
      console.warn(`[Universal Semgrep] ⚠️ Failed to convert finding: ${error.message}`);
      return null;
    }
  }
  
  /**
   * Map Semgrep severity to V9 severity
   */
  private mapSemgrepSeverity(semgrepSeverity: string): 'critical' | 'high' | 'medium' | 'low' {
    const severity = semgrepSeverity.toUpperCase();
    
    switch (severity) {
      case 'ERROR':
        return 'high'; // Semgrep ERROR = high severity issues
      case 'WARNING':
        return 'medium';
      case 'INFO':
        return 'low';
      default:
        return 'medium';
    }
  }
  
  /**
   * Check if Semgrep is installed
   */
  private async checkSemgrepInstalled(): Promise<void> {
    try {
      await this.runCommand('semgrep --version');
      console.log(`[Universal Semgrep] ✅ Semgrep is installed`);
    } catch (error) {
      throw new Error(
        'Semgrep not found. Install with: pip3 install semgrep==1.45.0'
      );
    }
  }
  
  /**
   * Cleanup temporary output file
   */
  private cleanupOutputFile(): void {
    try {
      if (this.config.outputFile && fs.existsSync(this.config.outputFile)) {
        fs.unlinkSync(this.config.outputFile);
      }
    } catch (error) {
      // Ignore cleanup errors
    }
  }
}

/**
 * Convenience function for direct usage
 */
export async function runSemgrep(
  workspacePath: string,
  language: string
): Promise<Issue[]> {
  const runner = new UniversalSemgrepRunner(workspacePath, language);
  return runner.execute();
}

