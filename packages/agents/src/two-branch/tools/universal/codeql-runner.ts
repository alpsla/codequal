/**
 * CodeQL Runner for PRO Tier
 *
 * Executes GitHub CodeQL analysis for deep semantic security scanning.
 * CodeQL provides more thorough analysis than Semgrep through:
 * - Data flow analysis (tracks taint through code)
 * - Control flow analysis
 * - Type inference
 * - Cross-function analysis
 *
 * PRO Tier Feature:
 * This runner is only available for PRO tier users as CodeQL analysis
 * is more resource-intensive and provides deeper insights.
 *
 * Supported Languages:
 * - JavaScript/TypeScript
 * - Python
 * - Java
 * - C/C++
 * - C#
 * - Go
 * - Ruby
 *
 * Installation:
 * - GitHub CLI with CodeQL extension: gh extension install github/gh-codeql
 * - OR CodeQL CLI directly: https://github.com/github/codeql-cli-binaries
 */

import * as fs from 'fs';
import * as path from 'path';
import { UniversalToolBase } from './universal-tool-base';
import { Issue } from '../../analyzers/v9-types';

interface CodeQLResult {
  ruleId: string;
  ruleIndex: number;
  message: {
    text: string;
  };
  locations: Array<{
    physicalLocation: {
      artifactLocation: {
        uri: string;
      };
      region: {
        startLine: number;
        startColumn?: number;
        endLine?: number;
        endColumn?: number;
      };
    };
  }>;
  level?: string;
  properties?: {
    'problem.severity'?: string;
    'security-severity'?: string;
    tags?: string[];
  };
}

interface CodeQLRule {
  id: string;
  name: string;
  shortDescription?: { text: string };
  fullDescription?: { text: string };
  defaultConfiguration?: { level: string };
  properties?: {
    'problem.severity'?: string;
    'security-severity'?: string;
    tags?: string[];
    precision?: string;
    kind?: string;
  };
}

interface SARIFOutput {
  runs: Array<{
    tool: {
      driver: {
        rules: CodeQLRule[];
      };
    };
    results: CodeQLResult[];
  }>;
}

// Language to CodeQL pack mapping
const LANGUAGE_PACKS: Record<string, string> = {
  'javascript': 'javascript',
  'typescript': 'javascript',  // TypeScript uses JavaScript pack
  'python': 'python',
  'java': 'java',
  'go': 'go',
  'ruby': 'ruby',
  'csharp': 'csharp',
  'cpp': 'cpp',
  'c': 'cpp'  // C uses C++ pack
};

export class CodeQLRunner extends UniversalToolBase {
  private dbPath: string;
  private sarifPath: string;

  constructor(workspacePath: string, language: string) {
    super({
      name: 'codeql',
      language,
      workspacePath,
      outputFile: path.join(workspacePath, '.codeql-results.sarif'),
      timeout: 900000 // 15 minutes (CodeQL is slower but more thorough)
    });

    this.dbPath = path.join(workspacePath, '.codeql-db');
    this.sarifPath = this.config.outputFile!;
  }

  /**
   * Build command - not used directly by CodeQL (multi-step process)
   * This satisfies the abstract method requirement
   */
  protected buildCommand(): string {
    // CodeQL uses a multi-step process (createDatabase + runAnalysis)
    // This method returns a placeholder - actual commands are in createDatabase/runAnalysis
    return `codeql database analyze "${this.dbPath}" --format=sarif-latest`;
  }

  /**
   * Parse output - wraps parseResults to satisfy abstract method
   * This satisfies the abstract method requirement
   */
  protected parseOutput(_output: string): Issue[] {
    // CodeQL uses SARIF file parsing, not stdout parsing
    return this.parseResults();
  }

  /**
   * Execute CodeQL analysis and return standardized issues
   */
  async execute(): Promise<Issue[]> {
    const startTime = Date.now();

    try {
      // Check if CodeQL is available
      await this.checkCodeQLInstalled();

      // Get CodeQL language pack
      const pack = this.getLanguagePack();
      if (!pack) {
        console.log(`[CodeQL] ⚠️ Language '${this.config.language}' not supported by CodeQL`);
        return [];
      }

      // Step 1: Create database
      console.log(`[CodeQL] 📦 Creating database for ${this.config.language}...`);
      await this.createDatabase(pack);

      // Step 2: Run analysis
      console.log(`[CodeQL] 🔍 Running security analysis...`);
      await this.runAnalysis(pack);

      // Step 3: Parse results
      const issues = this.parseResults();

      // Cleanup
      this.cleanup();

      // Log summary
      const duration = (Date.now() - startTime) / 1000;
      this.logSummary(issues, duration);

      return issues;

    } catch (error: any) {
      console.error(`[CodeQL] ❌ Error: ${error.message}`);
      this.cleanup();
      return [];
    }
  }

  /**
   * Check if CodeQL CLI is installed
   */
  private async checkCodeQLInstalled(): Promise<void> {
    try {
      // Try codeql CLI directly
      await this.runCommand('codeql --version');
      console.log(`[CodeQL] ✅ CodeQL CLI is installed`);
    } catch {
      try {
        // Try via GitHub CLI extension
        await this.runCommand('gh codeql version');
        console.log(`[CodeQL] ✅ CodeQL via GitHub CLI is installed`);
      } catch {
        throw new Error(
          'CodeQL not found. Install with:\n' +
          '  Option 1: gh extension install github/gh-codeql\n' +
          '  Option 2: Download from https://github.com/github/codeql-cli-binaries'
        );
      }
    }
  }

  /**
   * Get CodeQL language pack for the specified language
   */
  private getLanguagePack(): string | null {
    const lang = this.config.language.toLowerCase();
    return LANGUAGE_PACKS[lang] || null;
  }

  /**
   * Create CodeQL database
   */
  private async createDatabase(pack: string): Promise<void> {
    // Remove existing database if present
    if (fs.existsSync(this.dbPath)) {
      fs.rmSync(this.dbPath, { recursive: true, force: true });
    }

    const command = `codeql database create "${this.dbPath}" \
      --language=${pack} \
      --source-root="${this.config.workspacePath}" \
      --overwrite \
      2>&1`;

    await this.runCommand(command);
  }

  /**
   * Run CodeQL analysis
   */
  private async runAnalysis(pack: string): Promise<void> {
    // Use security-extended queries for comprehensive coverage
    const queryPack = `codeql/${pack}-queries:codeql-suites/${pack}-security-extended.qls`;

    const command = `codeql database analyze "${this.dbPath}" \
      ${queryPack} \
      --format=sarif-latest \
      --output="${this.sarifPath}" \
      --threads=0 \
      2>&1`;

    await this.runCommand(command);
  }

  /**
   * Parse SARIF output to standardized issues
   */
  private parseResults(): Issue[] {
    const issues: Issue[] = [];

    if (!fs.existsSync(this.sarifPath)) {
      console.warn(`[CodeQL] ⚠️ No SARIF output found`);
      return issues;
    }

    try {
      const sarifContent = fs.readFileSync(this.sarifPath, 'utf-8');
      const sarif: SARIFOutput = JSON.parse(sarifContent);

      for (const run of sarif.runs || []) {
        const rulesMap = new Map<string, CodeQLRule>();

        // Build rules lookup
        for (const rule of run.tool?.driver?.rules || []) {
          rulesMap.set(rule.id, rule);
        }

        // Process results
        for (const result of run.results || []) {
          const issue = this.convertResult(result, rulesMap);
          if (issue) {
            issues.push(issue);
          }
        }
      }

    } catch (error: any) {
      console.error(`[CodeQL] ❌ Failed to parse SARIF: ${error.message}`);
    }

    return issues;
  }

  /**
   * Convert CodeQL result to V9 Issue
   */
  private convertResult(
    result: CodeQLResult,
    rulesMap: Map<string, CodeQLRule>
  ): Issue | null {
    try {
      const rule = rulesMap.get(result.ruleId);
      const location = result.locations?.[0]?.physicalLocation;

      if (!location) {
        return null;
      }

      // Determine severity
      const severity = this.mapSeverity(result, rule);

      // Extract CWE if available
      const cweTag = rule?.properties?.tags?.find(t => t.startsWith('external/cwe/cwe-'));
      const cweId = cweTag ? cweTag.replace('external/cwe/', '').toUpperCase() : undefined;

      // Clean file path
      const filePath = this.cleanFilePath(location.artifactLocation.uri);

      // Build description
      const description = rule?.fullDescription?.text ||
                         rule?.shortDescription?.text ||
                         `CodeQL rule: ${result.ruleId}`;

      return this.createIssue({
        tool: 'codeql',
        category: 'Security',
        severity,
        file: filePath,
        line: location.region.startLine,
        column: location.region.startColumn,
        message: result.message.text,
        description,
        ruleId: result.ruleId,
        cweId
      });

    } catch (error: any) {
      console.warn(`[CodeQL] ⚠️ Failed to convert result: ${error.message}`);
      return null;
    }
  }

  /**
   * Map CodeQL severity to V9 severity
   */
  private mapSeverity(
    result: CodeQLResult,
    rule?: CodeQLRule
  ): 'critical' | 'high' | 'medium' | 'low' {
    // Check security-severity score first (0-10 scale)
    const secSeverity = result.properties?.['security-severity'] ||
                       rule?.properties?.['security-severity'];

    if (secSeverity) {
      const score = parseFloat(secSeverity);
      if (score >= 9.0) return 'critical';
      if (score >= 7.0) return 'high';
      if (score >= 4.0) return 'medium';
      return 'low';
    }

    // Fall back to level/problem.severity
    const level = result.level ||
                 result.properties?.['problem.severity'] ||
                 rule?.defaultConfiguration?.level ||
                 rule?.properties?.['problem.severity'];

    switch (level?.toLowerCase()) {
      case 'error':
        return 'high';
      case 'warning':
        return 'medium';
      case 'note':
      case 'recommendation':
        return 'low';
      default:
        return 'medium';
    }
  }

  /**
   * Cleanup temporary files
   */
  private cleanup(): void {
    try {
      // Remove database
      if (fs.existsSync(this.dbPath)) {
        fs.rmSync(this.dbPath, { recursive: true, force: true });
      }
      // Remove SARIF file
      if (fs.existsSync(this.sarifPath)) {
        fs.unlinkSync(this.sarifPath);
      }
    } catch (error) {
      // Ignore cleanup errors
    }
  }
}

/**
 * Convenience function for direct usage
 */
export async function runCodeQL(
  workspacePath: string,
  language: string
): Promise<Issue[]> {
  const runner = new CodeQLRunner(workspacePath, language);
  return runner.execute();
}

/**
 * Check if CodeQL is available on the system
 */
export async function isCodeQLAvailable(): Promise<boolean> {
  const { execSync } = require('child_process');
  try {
    execSync('codeql --version', { stdio: 'pipe' });
    return true;
  } catch {
    try {
      execSync('gh codeql version', { stdio: 'pipe' });
      return true;
    } catch {
      return false;
    }
  }
}
