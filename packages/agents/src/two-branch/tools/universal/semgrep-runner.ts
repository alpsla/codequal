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
  private jobs = 2;  // Default: 2 CPUs (optimal when running with other tools)
  private useCustomRules: boolean;  // Whether to include CodeQual custom rules

  // Path to CodeQual's custom security rules
  private static readonly CUSTOM_RULES_PATH = path.join(
    __dirname,
    'semgrep-rules',
    'codequal-security.yaml'
  );

  constructor(workspacePath: string, language: string, jobs = 2, useCustomRules = true) {
    super({
      name: 'semgrep',
      language,
      workspacePath,
      outputFile: path.join(workspacePath, '.semgrep-output.json'),
      timeout: 600000 // 10 minutes (increased for large repositories)
    });
    this.jobs = jobs;
    this.useCustomRules = useCustomRules;
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
   * 
   * Uses --jobs parameter (default: 2) to utilize multiple CPU cores.
   * - jobs=2: Optimal when running alongside other tools (shares 4 CPUs)
   * - jobs=4: Use all 4 CPUs when Semgrep runs alone (maximum performance)
   */
  protected buildCommand(): string {
    const { outputFile, workspacePath } = this.config;

    // Use multiple Semgrep rulesets for comprehensive coverage
    // (can't use --config=auto with --metrics=off)
    // p/security-audit: General security rules
    // p/owasp-top-ten: OWASP Top 10 vulnerabilities
    // codequal-security.yaml: CodeQual's custom rules for issues like incomplete escaping
    // --jobs=2: Use 2 CPU cores for parallel execution (optimal for 4-CPU systems)
    // --json for structured output
    // --quiet to suppress progress bars
    // --no-git-ignore to scan all files
    // --metrics=off to disable telemetry

    // Build config flags - always include community rulesets
    const configFlags = [
      '--config=p/security-audit',
      '--config=p/owasp-top-ten'
    ];

    // Add CodeQual custom rules if available and enabled
    if (this.useCustomRules && fs.existsSync(UniversalSemgrepRunner.CUSTOM_RULES_PATH)) {
      configFlags.push(`--config="${UniversalSemgrepRunner.CUSTOM_RULES_PATH}"`);
      console.log(`[Universal Semgrep] ✅ Using CodeQual custom security rules`);
    }

    // Exclude documentation and test-related files that typically contain false positives
    // These files often have intentional "vulnerable" code for testing or examples
    //
    // Excluded:
    // - *.md, *.mdx: Documentation with code examples
    // - test-outputs, fixtures: Test data directories
    // - docs/**/*.ts: Documentation TypeScript files
    // - __mocks__, __snapshots__: Jest mock/snapshot directories
    // - *.stories.tsx: Storybook story files
    //
    // NOT excluded (still scanned):
    // - *.test.ts, *.spec.ts: Actual test files (may have real issues)
    return `semgrep \
      ${configFlags.join(' \\\n      ')} \
      --jobs=${this.jobs} \
      --json \
      --quiet \
      --no-git-ignore \
      --metrics=off \
      --exclude='*.md' \
      --exclude='*.mdx' \
      --exclude='**/test-outputs/**' \
      --exclude='**/fixtures/**' \
      --exclude='**/docs/**/*.ts' \
      --exclude='**/__mocks__/**' \
      --exclude='**/__snapshots__/**' \
      --exclude='*.stories.tsx' \
      --exclude='*.stories.ts' \
      --exclude='**/testdata/**' \
      --exclude='**/test_fixtures/**' \
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
  language: string,
  jobs = 2
): Promise<Issue[]> {
  const runner = new UniversalSemgrepRunner(workspacePath, language, jobs);
  return runner.execute();
}

