/**
 * MCP Orchestration Service
 * 
 * Coordinates all MCP tool executions and aggregates results
 * Replaces DeepWiki with direct MCP tool integration
 */

// TODO: Fix these imports when mcp-wrappers are available
// import { SemgrepMCP } from '../../../mcp-wrappers/semgrep-mcp';
// import { ESLintMCP } from '../../../mcp-wrappers/eslint-mcp';
// import { LighthouseMCP } from '../../../mcp-wrappers/lighthouse-mcp';

// Temporary stub classes
class SemgrepMCP {
  async runAnalysis(...args: any[]): Promise<any> { return { findings: [] }; }
  async analyze(...args: any[]): Promise<any> { return { findings: [] }; }
}
class ESLintMCP {
  async runAnalysis(...args: any[]): Promise<any> { return { findings: [] }; }
  async analyze(...args: any[]): Promise<any> { return { findings: [] }; }
}
class LighthouseMCP {
  async runAnalysis(...args: any[]): Promise<any> { return { findings: [] }; }
  async analyze(...args: any[]): Promise<any> { return { findings: [] }; }
}
import { UniversalToolParser } from '../parsers/UniversalToolParser';
import { StandardizedFinding } from '../types/mcp-types';

export interface MCPToolResults {
  security: StandardizedFinding[];
  codeQuality: StandardizedFinding[];
  performance: StandardizedFinding[];
  all: StandardizedFinding[];
  metadata: {
    toolsRun: string[];
    executionTime: number;
    filesAnalyzed: number;
    language: string;
  };
}

export interface BranchAnalysisOptions {
  targetPath: string;
  language: string;
  branch: string;
  includeTools?: string[];
  excludeTools?: string[];
}

export class MCPOrchestrationService {
  private semgrepMCP: SemgrepMCP;
  private eslintMCP: ESLintMCP;
  private lighthouseMCP: LighthouseMCP;
  private universalParser: UniversalToolParser;

  constructor() {
    this.semgrepMCP = new SemgrepMCP();
    this.eslintMCP = new ESLintMCP();
    this.lighthouseMCP = new LighthouseMCP();
    this.universalParser = new UniversalToolParser();
  }

  /**
   * Run all MCP tools for a specific branch
   */
  async analyzeBranch(options: BranchAnalysisOptions): Promise<MCPToolResults> {
    const startTime = Date.now();
    const { targetPath, language, branch } = options;

    console.log(`🔍 Running MCP tools for ${branch} branch...`);

    // Run tools in parallel for performance
    const toolPromises = [];
    const toolsRun = [];

    // Security analysis with Semgrep
    if (!options.excludeTools?.includes('semgrep')) {
      toolsRun.push('semgrep');
      toolPromises.push(
        this.semgrepMCP.analyze(targetPath, language)
          .catch(err => {
            console.warn(`⚠️ Semgrep failed: ${err.message}`);
            return { findings: [] };
          })
      );
    }

    // Code quality with ESLint (for JS/TS projects)
    if (!options.excludeTools?.includes('eslint') && 
        ['javascript', 'typescript'].includes(language.toLowerCase())) {
      toolsRun.push('eslint');
      toolPromises.push(
        this.eslintMCP.analyze(targetPath)
          .catch(err => {
            console.warn(`⚠️ ESLint failed: ${err.message}`);
            return { findings: [] };
          })
      );
    }

    // Performance with Lighthouse (for web projects)
    if (!options.excludeTools?.includes('lighthouse') && 
        options.includeTools?.includes('lighthouse')) {
      toolsRun.push('lighthouse');
      toolPromises.push(
        this.lighthouseMCP.analyze(targetPath)
          .catch(err => {
            console.warn(`⚠️ Lighthouse failed: ${err.message}`);
            return { findings: [] };
          })
      );
    }

    // Execute all tools
    const results = await Promise.all(toolPromises);

    // Parse and categorize results
    const allFindings: StandardizedFinding[] = [];
    const securityFindings: StandardizedFinding[] = [];
    const codeQualityFindings: StandardizedFinding[] = [];
    const performanceFindings: StandardizedFinding[] = [];

    results.forEach((result, index) => {
      const toolName = toolsRun[index];
      const parsed = this.universalParser.parse(result, toolName);
      
      parsed.issues.forEach(finding => {
        // Convert StandardizedIssue to StandardizedFinding
        const standardizedFinding: StandardizedFinding = {
          id: finding.id,
          tool: toolName,
          type: finding.category,
          severity: finding.severity as 'low' | 'medium' | 'high' | 'critical',
          message: finding.description,
          title: finding.title,
          description: finding.description,
          file: finding.location.file,
          line: finding.location.line,
          column: finding.location.column,
          location: finding.location,
          metadata: {
            branch,
            analyzedAt: new Date().toISOString(),
            originalType: finding.type
          }
        };

        allFindings.push(standardizedFinding);

        // Categorize by type
        switch (finding.type) {
          case 'security':
            securityFindings.push(standardizedFinding);
            break;
          case 'quality':
            codeQualityFindings.push(standardizedFinding);
            break;
          case 'performance':
            performanceFindings.push(standardizedFinding);
            break;
          default:
            // Add to appropriate category based on category field
            if (finding.category === 'security') {
              securityFindings.push(standardizedFinding);
            } else if (finding.category === 'performance') {
              performanceFindings.push(standardizedFinding);
            } else {
              codeQualityFindings.push(standardizedFinding);
            }
        }
      });
    });

    const executionTime = Date.now() - startTime;

    return {
      security: securityFindings,
      codeQuality: codeQualityFindings,
      performance: performanceFindings,
      all: allFindings,
      metadata: {
        toolsRun,
        executionTime,
        filesAnalyzed: this.countUniqueFiles(allFindings),
        language
      }
    };
  }

  /**
   * Compare two branches by running MCP tools on both
   */
  async compareBranches(
    mainBranchPath: string,
    prBranchPath: string,
    language: string
  ): Promise<{
    mainBranch: MCPToolResults;
    prBranch: MCPToolResults;
    comparison: {
      newIssues: StandardizedFinding[];
      resolvedIssues: StandardizedFinding[];
      existingIssues: StandardizedFinding[];
    };
  }> {
    console.log('🔄 Running MCP analysis on both branches...');

    // Analyze both branches in parallel
    const [mainResults, prResults] = await Promise.all([
      this.analyzeBranch({
        targetPath: mainBranchPath,
        language,
        branch: 'main'
      }),
      this.analyzeBranch({
        targetPath: prBranchPath,
        language,
        branch: 'pr'
      })
    ]);

    // Simple comparison (will be enhanced by IssueComparisonService)
    const comparison = this.compareResults(mainResults.all, prResults.all);

    return {
      mainBranch: mainResults,
      prBranch: prResults,
      comparison
    };
  }

  /**
   * Simple issue comparison (will be replaced by IssueComparisonService)
   */
  private compareResults(
    mainIssues: StandardizedFinding[],
    prIssues: StandardizedFinding[]
  ): {
    newIssues: StandardizedFinding[];
    resolvedIssues: StandardizedFinding[];
    existingIssues: StandardizedFinding[];
  } {
    const mainFingerprints = new Set(mainIssues.map(i => this.getFingerprint(i)));
    const prFingerprints = new Set(prIssues.map(i => this.getFingerprint(i)));

    const newIssues = prIssues.filter(i => !mainFingerprints.has(this.getFingerprint(i)));
    const resolvedIssues = mainIssues.filter(i => !prFingerprints.has(this.getFingerprint(i)));
    const existingIssues = prIssues.filter(i => mainFingerprints.has(this.getFingerprint(i)));

    return {
      newIssues,
      resolvedIssues,
      existingIssues
    };
  }

  /**
   * Generate fingerprint for issue matching
   */
  private getFingerprint(finding: StandardizedFinding): string {
    return `${finding.location.file}:${finding.location.startLine}:${finding.type}:${finding.title}`;
  }

  /**
   * Count unique files in findings
   */
  private countUniqueFiles(findings: StandardizedFinding[]): number {
    const files = new Set(findings.map(f => f.location.file));
    return files.size;
  }

  /**
   * Get language-specific tools
   */
  public getToolsForLanguage(language: string): string[] {
    const tools = ['semgrep']; // Semgrep works for all languages

    const languageTools: Record<string, string[]> = {
      javascript: ['eslint', 'jshint'],
      typescript: ['eslint', 'tslint'],
      python: ['pylint', 'bandit', 'mypy'],
      java: ['spotbugs', 'checkstyle'],
      go: ['gosec', 'golangci-lint'],
      ruby: ['rubocop', 'brakeman'],
      php: ['phpcs', 'psalm'],
      csharp: ['roslyn'],
      cpp: ['cppcheck', 'clang-tidy'],
      rust: ['clippy', 'cargo-audit']
    };

    const langLower = language.toLowerCase();
    if (languageTools[langLower]) {
      tools.push(...languageTools[langLower]);
    }

    return tools;
  }

  /**
   * Check which tools are available
   */
  public async checkToolAvailability(): Promise<{
    available: string[];
    missing: string[];
  }> {
    const tools = ['semgrep', 'eslint', 'lighthouse'];
    const available: string[] = [];
    const missing: string[] = [];

    for (const tool of tools) {
      try {
        // Try to check if tool is installed
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const { exec } = require('child_process');
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const { promisify } = require('util');
        const execAsync = promisify(exec);
        
        await execAsync(`which ${tool}`);
        available.push(tool);
      } catch {
        missing.push(tool);
      }
    }

    return { available, missing };
  }
}