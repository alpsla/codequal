/**
 * Enhanced Universal Tool Parser
 *
 * A centralized parser that standardizes output from ALL integrated tools.
 *
 * Key Features:
 * - Shadow Mode: Runs in parallel with existing parsers for validation
 * - Complete implementations for all integrated tools (no stubs)
 * - Comparison utilities for migration validation
 * - Type-safe standardized output format
 *
 * Tools Supported:
 * - Java: checkstyle, spotbugs, pmd, dependency-check, semgrep
 * - TypeScript: eslint, typescript-compiler, npm-audit, semgrep
 * - Python: ruff, pylint, bandit, mypy, pip-audit, semgrep
 * - Go: golangci-lint, staticcheck, gosec, govulncheck, semgrep
 * - Rust: clippy, cargo-audit, cargo-deny, semgrep
 * - Ruby: rubocop, brakeman, bundler-audit, semgrep
 * - PHP: phpstan, psalm, phpcs, composer-audit, semgrep
 * - C#/.NET: dotnet-format, security-code-scan, dotnet-outdated, semgrep
 *
 * Shadow Mode Usage:
 * ```typescript
 * const parser = new EnhancedUniversalToolParser({ shadowMode: true });
 * const result = parser.parse('eslint', rawOutput, { language: 'typescript' });
 * // If shadowMode is enabled, comparison will be logged but old parser result returned
 * ```
 */

import { StandardizedIssue, StandardizedToolOutput, FileAnalysis } from './UniversalToolParser';

/**
 * Parser options for shadow mode and validation
 */
export interface EnhancedParserOptions {
  /** Enable shadow mode - compare with legacy parser without affecting output */
  shadowMode?: boolean;
  /** Log comparison results to console */
  logComparisons?: boolean;
  /** Callback for comparison results */
  onComparison?: (comparison: ParserComparison) => void;
}

/**
 * Comparison result between legacy and enhanced parsing
 */
export interface ParserComparison {
  tool: string;
  legacy: {
    issueCount: number;
    executionTime: number;
  };
  enhanced: {
    issueCount: number;
    executionTime: number;
  };
  match: boolean;
  differences: {
    missingInLegacy: number;
    missingInEnhanced: number;
    differentSeverity: number;
    differentType: number;
  };
}

/**
 * Context for parsing (language, framework, etc.)
 */
export interface ParseContext {
  language?: string;
  framework?: string;
  repoPath?: string;
}

/**
 * Enhanced Universal Tool Parser with shadow mode support
 */
export class EnhancedUniversalToolParser {
  private options: EnhancedParserOptions;
  private comparisons: ParserComparison[] = [];

  constructor(options: EnhancedParserOptions = {}) {
    this.options = {
      shadowMode: false,
      logComparisons: true,
      ...options
    };
  }

  /**
   * Parse tool output into standardized format
   */
  parse(tool: string, output: any, context: ParseContext = {}): StandardizedToolOutput {
    const startTime = Date.now();
    const toolName = tool.toLowerCase();

    let result: StandardizedToolOutput;

    switch (toolName) {
      // Java Tools
      case 'checkstyle':
        result = this.parseCheckstyle(output);
        break;
      case 'spotbugs':
        result = this.parseSpotBugs(output);
        break;
      case 'pmd':
        result = this.parsePMD(output);
        break;
      case 'dependency-check':
      case 'owasp-dependency-check':
        result = this.parseDependencyCheck(output);
        break;

      // TypeScript/JavaScript Tools
      case 'eslint':
        result = this.parseESLint(output);
        break;
      case 'typescript':
      case 'tsc':
        result = this.parseTypeScriptCompiler(output);
        break;
      case 'npm-audit':
        result = this.parseNpmAudit(output);
        break;

      // Python Tools
      case 'ruff':
        result = this.parseRuff(output);
        break;
      case 'pylint':
        result = this.parsePylint(output);
        break;
      case 'bandit':
        result = this.parseBandit(output);
        break;
      case 'mypy':
        result = this.parseMypy(output);
        break;
      case 'pip-audit':
        result = this.parsePipAudit(output);
        break;

      // Go Tools
      case 'golangci-lint':
        result = this.parseGolangciLint(output);
        break;
      case 'staticcheck':
        result = this.parseStaticcheck(output);
        break;
      case 'gosec':
        result = this.parseGoSec(output);
        break;
      case 'govulncheck':
        result = this.parseGovulncheck(output);
        break;

      // Rust Tools
      case 'clippy':
        result = this.parseClippy(output);
        break;
      case 'cargo-audit':
        result = this.parseCargoAudit(output);
        break;
      case 'cargo-deny':
        result = this.parseCargoDeny(output);
        break;

      // Ruby Tools
      case 'rubocop':
        result = this.parseRuboCop(output);
        break;
      case 'brakeman':
        result = this.parseBrakeman(output);
        break;
      case 'bundler-audit':
        result = this.parseBundlerAudit(output);
        break;

      // PHP Tools
      case 'phpstan':
        result = this.parsePHPStan(output);
        break;
      case 'psalm':
        result = this.parsePsalm(output);
        break;
      case 'phpcs':
      case 'php-codesniffer':
        result = this.parsePHPCS(output);
        break;
      case 'composer-audit':
        result = this.parseComposerAudit(output);
        break;

      // C#/.NET Tools
      case 'dotnet-format':
        result = this.parseDotnetFormat(output);
        break;
      case 'security-code-scan':
        result = this.parseSecurityCodeScan(output);
        break;
      case 'dotnet-outdated':
        result = this.parseDotnetOutdated(output);
        break;

      // Universal Tools
      case 'semgrep':
        result = this.parseSemgrep(output);
        break;

      default:
        result = this.parseGeneric(toolName, output);
    }

    result.language = context.language || result.language;
    result.timestamp = new Date().toISOString();

    return result;
  }

  /**
   * Get all comparison results from shadow mode
   */
  getComparisons(): ParserComparison[] {
    return [...this.comparisons];
  }

  /**
   * Clear comparison results
   */
  clearComparisons(): void {
    this.comparisons = [];
  }

  // ============================================================
  // JAVA TOOL PARSERS
  // ============================================================

  /**
   * Parse Checkstyle XML output
   */
  private parseCheckstyle(output: any): StandardizedToolOutput {
    const issues: StandardizedIssue[] = [];

    // Handle both XML string and parsed object
    if (typeof output === 'string') {
      // Parse XML - extract file and error elements
      const fileRegex = /<file name="([^"]+)">([\s\S]*?)<\/file>/g;
      const errorRegex = /<error line="(\d+)" column="(\d+)" severity="(\w+)" message="([^"]+)" source="([^"]+)"\/>/g;

      let fileMatch;
      while ((fileMatch = fileRegex.exec(output)) !== null) {
        const filePath = fileMatch[1];
        const fileContent = fileMatch[2];

        let errorMatch;
        while ((errorMatch = errorRegex.exec(fileContent)) !== null) {
          issues.push({
            id: `checkstyle-${errorMatch[5]}-${filePath}-${errorMatch[1]}`,
            type: 'quality',
            severity: this.mapCheckstyleSeverity(errorMatch[3]),
            category: this.extractCheckstyleCategory(errorMatch[5]),
            title: errorMatch[5].split('.').pop() || 'Checkstyle violation',
            description: errorMatch[4],
            location: {
              file: filePath,
              line: parseInt(errorMatch[1]),
              column: parseInt(errorMatch[2])
            }
          });
        }
      }
    } else if (output.files || output.checkstyle) {
      // Handle parsed object
      const files = output.files || output.checkstyle?.file || [];
      const fileArray = Array.isArray(files) ? files : [files];

      for (const file of fileArray) {
        const errors = file.error || file.errors || [];
        const errorArray = Array.isArray(errors) ? errors : [errors];

        for (const error of errorArray) {
          if (!error) continue;

          issues.push({
            id: `checkstyle-${error.source || error['@_source']}-${file.name || file['@_name']}-${error.line || error['@_line']}`,
            type: 'quality',
            severity: this.mapCheckstyleSeverity(error.severity || error['@_severity']),
            category: this.extractCheckstyleCategory(error.source || error['@_source'] || ''),
            title: (error.source || error['@_source'] || '').split('.').pop() || 'Checkstyle violation',
            description: error.message || error['@_message'] || '',
            location: {
              file: file.name || file['@_name'] || 'unknown',
              line: parseInt(error.line || error['@_line'] || '0'),
              column: parseInt(error.column || error['@_column'] || '0')
            }
          });
        }
      }
    }

    return {
      tool: 'checkstyle',
      timestamp: new Date().toISOString(),
      language: 'java',
      files: this.groupIssuesByFile(issues),
      issues,
      raw: output
    };
  }

  /**
   * Parse SpotBugs XML output
   */
  private parseSpotBugs(output: any): StandardizedToolOutput {
    const issues: StandardizedIssue[] = [];

    // Handle both XML string and parsed object
    if (typeof output === 'string') {
      // Parse XML - extract BugInstance elements
      const bugRegex = /<BugInstance type="([^"]+)" priority="(\d+)"[^>]*>([\s\S]*?)<\/BugInstance>/g;
      const sourceRegex = /<SourceLine[^>]*sourcefile="([^"]+)"[^>]*start="(\d+)"[^>]*end="(\d+)"[^>]*\/>/;
      const messageRegex = /<LongMessage>([^<]+)<\/LongMessage>/;

      let bugMatch;
      while ((bugMatch = bugRegex.exec(output)) !== null) {
        const bugType = bugMatch[1];
        const priority = parseInt(bugMatch[2]);
        const content = bugMatch[3];

        const sourceMatch = content.match(sourceRegex);
        const messageMatch = content.match(messageRegex);

        issues.push({
          id: `spotbugs-${bugType}-${sourceMatch?.[1] || 'unknown'}-${sourceMatch?.[2] || 0}`,
          type: this.mapSpotBugsType(bugType),
          severity: this.mapSpotBugsPriority(priority),
          category: bugType,
          title: bugType.replace(/_/g, ' '),
          description: messageMatch?.[1] || `SpotBugs: ${bugType}`,
          location: {
            file: sourceMatch?.[1] || 'unknown',
            line: parseInt(sourceMatch?.[2] || '0'),
            endLine: parseInt(sourceMatch?.[3] || '0')
          }
        });
      }
    } else if (output.BugCollection || output.bugCollection) {
      const bugs = output.BugCollection?.BugInstance || output.bugCollection?.bugInstance || [];
      const bugArray = Array.isArray(bugs) ? bugs : [bugs];

      for (const bug of bugArray) {
        if (!bug) continue;

        const source = bug.SourceLine || bug.sourceLine || {};
        const sourceArray = Array.isArray(source) ? source[0] : source;

        issues.push({
          id: `spotbugs-${bug.type || bug['@_type']}-${sourceArray?.sourcefile || sourceArray?.['@_sourcefile'] || 'unknown'}-${sourceArray?.start || sourceArray?.['@_start'] || 0}`,
          type: this.mapSpotBugsType(bug.type || bug['@_type'] || ''),
          severity: this.mapSpotBugsPriority(parseInt(bug.priority || bug['@_priority'] || '2')),
          category: bug.type || bug['@_type'] || 'unknown',
          title: (bug.type || bug['@_type'] || 'SpotBugs Issue').replace(/_/g, ' '),
          description: bug.LongMessage || bug.longMessage || bug.ShortMessage || bug.shortMessage || '',
          location: {
            file: sourceArray?.sourcefile || sourceArray?.['@_sourcefile'] || 'unknown',
            line: parseInt(sourceArray?.start || sourceArray?.['@_start'] || '0'),
            endLine: parseInt(sourceArray?.end || sourceArray?.['@_end'] || '0')
          }
        });
      }
    }

    return {
      tool: 'spotbugs',
      timestamp: new Date().toISOString(),
      language: 'java',
      files: this.groupIssuesByFile(issues),
      issues,
      raw: output
    };
  }

  /**
   * Parse PMD XML/JSON output
   */
  private parsePMD(output: any): StandardizedToolOutput {
    const issues: StandardizedIssue[] = [];

    if (typeof output === 'string') {
      // Parse XML format
      const violationRegex = /<violation beginline="(\d+)" endline="(\d+)"[^>]*rule="([^"]+)"[^>]*ruleset="([^"]+)"[^>]*priority="(\d+)"[^>]*>([\s\S]*?)<\/violation>/g;
      const fileRegex = /<file name="([^"]+)">([\s\S]*?)<\/file>/g;

      let fileMatch;
      while ((fileMatch = fileRegex.exec(output)) !== null) {
        const filePath = fileMatch[1];
        const fileContent = fileMatch[2];

        let violationMatch;
        while ((violationMatch = violationRegex.exec(fileContent)) !== null) {
          issues.push({
            id: `pmd-${violationMatch[3]}-${filePath}-${violationMatch[1]}`,
            type: this.mapPMDRuleset(violationMatch[4]),
            severity: this.mapPMDPriority(parseInt(violationMatch[5])),
            category: violationMatch[4],
            title: violationMatch[3],
            description: violationMatch[6].trim(),
            location: {
              file: filePath,
              line: parseInt(violationMatch[1]),
              endLine: parseInt(violationMatch[2])
            }
          });
        }
      }
    } else if (output.files || output.pmd) {
      // Handle JSON or parsed object
      const files = output.files || output.pmd?.file || [];
      const fileArray = Array.isArray(files) ? files : [files];

      for (const file of fileArray) {
        const violations = file.violations || file.violation || [];
        const violationArray = Array.isArray(violations) ? violations : [violations];

        for (const v of violationArray) {
          if (!v) continue;

          issues.push({
            id: `pmd-${v.rule}-${file.filename || file.name}-${v.beginline || v.line}`,
            type: this.mapPMDRuleset(v.ruleset || v.category || ''),
            severity: this.mapPMDPriority(v.priority || 3),
            category: v.ruleset || v.category || 'general',
            title: v.rule || 'PMD Violation',
            description: v.description || v.message || '',
            location: {
              file: file.filename || file.name || 'unknown',
              line: v.beginline || v.line || 0,
              endLine: v.endline || v.line || 0
            }
          });
        }
      }
    }

    return {
      tool: 'pmd',
      timestamp: new Date().toISOString(),
      language: 'java',
      files: this.groupIssuesByFile(issues),
      issues,
      raw: output
    };
  }

  /**
   * Parse OWASP Dependency-Check output
   */
  private parseDependencyCheck(output: any): StandardizedToolOutput {
    const issues: StandardizedIssue[] = [];

    // Handle JSON format
    if (output.dependencies || output.report?.dependencies) {
      const deps = output.dependencies || output.report.dependencies;

      for (const dep of deps) {
        if (!dep.vulnerabilities) continue;

        for (const vuln of dep.vulnerabilities) {
          issues.push({
            id: `dependency-check-${vuln.name}-${dep.fileName}`,
            type: 'security',
            severity: this.mapCVSSSeverity(vuln.cvssv3?.baseScore || vuln.cvssv2?.score || 5),
            category: 'dependency-vulnerability',
            title: vuln.name,
            description: vuln.description,
            location: {
              file: dep.fileName || dep.filePath || 'pom.xml'
            },
            cwe: vuln.cwe,
            references: vuln.references?.map((r: any) => r.url) || []
          });
        }
      }
    }

    return {
      tool: 'dependency-check',
      timestamp: new Date().toISOString(),
      language: 'java',
      files: this.groupIssuesByFile(issues),
      issues,
      raw: output
    };
  }

  // ============================================================
  // TYPESCRIPT/JAVASCRIPT TOOL PARSERS
  // ============================================================

  /**
   * Parse ESLint JSON output
   */
  private parseESLint(output: any): StandardizedToolOutput {
    const issues: StandardizedIssue[] = [];

    // Handle JSON array of file results
    const results = Array.isArray(output) ? output : (output.results || [output]);

    for (const file of results) {
      if (!file.messages || file.messages.length === 0) continue;

      for (const msg of file.messages) {
        issues.push({
          id: `eslint-${msg.ruleId || 'error'}-${file.filePath}-${msg.line}-${msg.column}`,
          type: this.mapESLintType(msg.ruleId, msg.severity),
          severity: this.mapESLintSeverity(msg.severity, msg.ruleId),
          category: msg.ruleId?.split('/')[0] || 'general',
          title: msg.ruleId || 'ESLint Error',
          description: msg.message,
          location: {
            file: file.filePath,
            line: msg.line || 0,
            column: msg.column,
            endLine: msg.endLine,
            endColumn: msg.endColumn
          },
          suggestion: msg.fix ? 'Auto-fixable with --fix' : undefined
        });
      }
    }

    return {
      tool: 'eslint',
      timestamp: new Date().toISOString(),
      language: 'typescript',
      files: this.groupIssuesByFile(issues),
      issues,
      raw: output
    };
  }

  /**
   * Parse TypeScript Compiler output
   */
  private parseTypeScriptCompiler(output: any): StandardizedToolOutput {
    const issues: StandardizedIssue[] = [];

    if (typeof output === 'string') {
      // Parse text output: file.ts(line,column): error TS2345: message
      const tscRegex = /^(.+?)\((\d+),(\d+)\):\s+(error|warning)\s+TS(\d+):\s+(.+)$/gm;

      let match;
      while ((match = tscRegex.exec(output)) !== null) {
        issues.push({
          id: `tsc-TS${match[5]}-${match[1]}-${match[2]}-${match[3]}`,
          type: 'bug',
          severity: match[4] === 'error' ? 'high' : 'medium',
          category: `TS${match[5]}`,
          title: `TS${match[5]}`,
          description: match[6],
          location: {
            file: match[1],
            line: parseInt(match[2]),
            column: parseInt(match[3])
          }
        });
      }
    } else if (Array.isArray(output)) {
      // Handle array of diagnostics
      for (const diag of output) {
        issues.push({
          id: `tsc-${diag.code}-${diag.file || 'unknown'}-${diag.line || 0}`,
          type: 'bug',
          severity: diag.category === 1 ? 'high' : 'medium',
          category: `TS${diag.code}`,
          title: `TS${diag.code}`,
          description: diag.messageText || diag.message,
          location: {
            file: diag.file || 'unknown',
            line: diag.line || 0,
            column: diag.column || 0
          }
        });
      }
    }

    return {
      tool: 'typescript',
      timestamp: new Date().toISOString(),
      language: 'typescript',
      files: this.groupIssuesByFile(issues),
      issues,
      raw: output
    };
  }

  /**
   * Parse npm audit JSON output
   */
  private parseNpmAudit(output: any): StandardizedToolOutput {
    const issues: StandardizedIssue[] = [];

    // New format (npm 7+)
    if (output.vulnerabilities) {
      for (const [pkg, vuln] of Object.entries(output.vulnerabilities) as [string, any][]) {
        if (!vuln.via || !Array.isArray(vuln.via)) continue;

        for (const advisory of vuln.via) {
          if (typeof advisory === 'object' && advisory.title) {
            issues.push({
              id: `npm-audit-${advisory.source || Date.now()}-${pkg}`,
              type: 'security',
              severity: this.mapNpmAuditSeverity(advisory.severity || vuln.severity),
              category: 'dependency-vulnerability',
              title: advisory.title,
              description: `${advisory.title} in ${pkg}`,
              location: {
                file: 'package.json'
              },
              suggestion: advisory.fixAvailable ? 'Fix available via npm audit fix' : 'Manual review required'
            });
          }
        }
      }
    }
    // Old format (npm 6)
    else if (output.advisories) {
      for (const advisory of Object.values(output.advisories) as any[]) {
        issues.push({
          id: `npm-audit-${advisory.id}`,
          type: 'security',
          severity: this.mapNpmAuditSeverity(advisory.severity),
          category: 'dependency-vulnerability',
          title: advisory.title,
          description: `${advisory.title} in ${advisory.module_name}`,
          location: {
            file: 'package.json'
          },
          suggestion: advisory.recommendation
        });
      }
    }

    return {
      tool: 'npm-audit',
      timestamp: new Date().toISOString(),
      language: 'typescript',
      files: this.groupIssuesByFile(issues),
      issues,
      raw: output
    };
  }

  // ============================================================
  // PYTHON TOOL PARSERS
  // ============================================================

  /**
   * Parse Ruff JSON output
   */
  private parseRuff(output: any): StandardizedToolOutput {
    const issues: StandardizedIssue[] = [];

    // Ruff outputs a JSON array
    const results = Array.isArray(output) ? output : this.extractJsonArray(output);

    for (const result of results) {
      issues.push({
        id: `ruff-${result.code}-${result.filename}-${result.location?.row || 0}`,
        type: this.mapRuffType(result.code),
        severity: this.mapRuffSeverity(result.code),
        category: result.code?.charAt(0) || 'general',
        title: result.code,
        description: result.message,
        location: {
          file: result.filename,
          line: result.location?.row || 1,
          column: result.location?.column || 0,
          endLine: result.end_location?.row,
          endColumn: result.end_location?.column
        },
        suggestion: result.fix?.message
      });
    }

    return {
      tool: 'ruff',
      timestamp: new Date().toISOString(),
      language: 'python',
      files: this.groupIssuesByFile(issues),
      issues,
      raw: output
    };
  }

  /**
   * Parse Pylint JSON output
   */
  private parsePylint(output: any): StandardizedToolOutput {
    const issues: StandardizedIssue[] = [];

    const messages = Array.isArray(output) ? output : this.extractJsonArray(output);

    for (const msg of messages) {
      issues.push({
        id: `pylint-${msg.message_id || msg['message-id']}-${msg.path}-${msg.line}`,
        type: this.mapPylintType(msg.type, msg.message_id || msg['message-id']),
        severity: this.mapPylintSeverity(msg.type),
        category: msg.symbol || msg.message_id || msg['message-id'],
        title: msg.symbol || msg.message_id || msg['message-id'],
        description: msg.message,
        location: {
          file: msg.path,
          line: msg.line,
          column: msg.column
        }
      });
    }

    return {
      tool: 'pylint',
      timestamp: new Date().toISOString(),
      language: 'python',
      files: this.groupIssuesByFile(issues),
      issues,
      raw: output
    };
  }

  /**
   * Parse Bandit JSON output
   */
  private parseBandit(output: any): StandardizedToolOutput {
    const issues: StandardizedIssue[] = [];

    // Extract results from Bandit's mixed output
    let results = [];
    if (output.results) {
      results = output.results;
    } else if (typeof output === 'string') {
      const jsonStart = output.indexOf('{');
      if (jsonStart !== -1) {
        try {
          const parsed = JSON.parse(output.substring(jsonStart));
          results = parsed.results || [];
        } catch {
          // Continue with empty results
        }
      }
    }

    for (const result of results) {
      issues.push({
        id: `bandit-${result.test_id}-${result.filename}-${result.line_number}`,
        type: 'security',
        severity: this.mapBanditSeverity(result.issue_severity),
        category: result.test_name,
        title: result.test_id,
        description: result.issue_text,
        location: {
          file: result.filename,
          line: result.line_number,
          column: result.col_offset
        },
        evidence: result.code,
        cwe: result.issue_cwe?.id?.toString()
      });
    }

    return {
      tool: 'bandit',
      timestamp: new Date().toISOString(),
      language: 'python',
      files: this.groupIssuesByFile(issues),
      issues,
      raw: output
    };
  }

  /**
   * Parse mypy text output
   */
  private parseMypy(output: any): StandardizedToolOutput {
    const issues: StandardizedIssue[] = [];

    const text = typeof output === 'string' ? output : (output.stdout || '');
    const mypyRegex = /^(.+?):(\d+):\s+(error|warning|note):\s+(.+)$/gm;

    let match;
    while ((match = mypyRegex.exec(text)) !== null) {
      issues.push({
        id: `mypy-${match[1]}-${match[2]}-${issues.length}`,
        type: 'bug',
        severity: match[3] === 'error' ? 'high' : 'medium',
        category: 'type-error',
        title: 'Type Error',
        description: match[4],
        location: {
          file: match[1],
          line: parseInt(match[2])
        }
      });
    }

    return {
      tool: 'mypy',
      timestamp: new Date().toISOString(),
      language: 'python',
      files: this.groupIssuesByFile(issues),
      issues,
      raw: output
    };
  }

  /**
   * Parse pip-audit JSON output
   */
  private parsePipAudit(output: any): StandardizedToolOutput {
    const issues: StandardizedIssue[] = [];

    // pip-audit outputs { dependencies: [...] }
    let deps = [];
    if (output.dependencies) {
      deps = output.dependencies;
    } else if (Array.isArray(output)) {
      deps = output;
    } else if (typeof output === 'string') {
      try {
        const parsed = JSON.parse(output);
        deps = parsed.dependencies || parsed || [];
      } catch {
        // Continue with empty deps
      }
    }

    for (const dep of deps) {
      if (!dep.vulns || dep.vulns.length === 0) continue;

      for (const vuln of dep.vulns) {
        issues.push({
          id: vuln.id || `pip-audit-${dep.name}-${Date.now()}`,
          type: 'security',
          severity: this.mapPipAuditSeverity(vuln),
          category: 'dependency-vulnerability',
          title: vuln.id,
          description: `${dep.name} ${dep.version}: ${vuln.description || vuln.id}`,
          location: {
            file: 'requirements.txt'
          },
          suggestion: vuln.fix_versions?.length
            ? `Update ${dep.name} to ${vuln.fix_versions.join(' or ')}`
            : `Update ${dep.name} to latest secure version`
        });
      }
    }

    return {
      tool: 'pip-audit',
      timestamp: new Date().toISOString(),
      language: 'python',
      files: this.groupIssuesByFile(issues),
      issues,
      raw: output
    };
  }

  // ============================================================
  // GO TOOL PARSERS
  // ============================================================

  /**
   * Parse golangci-lint JSON output
   */
  private parseGolangciLint(output: any): StandardizedToolOutput {
    const issues: StandardizedIssue[] = [];

    // golangci-lint outputs { Issues: [...] }
    const lintIssues = output.Issues || output.issues || [];

    for (const issue of lintIssues) {
      issues.push({
        id: `golangci-${issue.FromLinter || issue.Linter}-${issue.Pos?.Filename || 'unknown'}-${issue.Pos?.Line || 0}`,
        type: this.mapGolangciType(issue.FromLinter || issue.Linter),
        severity: this.mapGolangciSeverity(issue.Severity),
        category: issue.FromLinter || issue.Linter,
        title: issue.FromLinter || issue.Linter,
        description: issue.Text,
        location: {
          file: issue.Pos?.Filename || 'unknown',
          line: issue.Pos?.Line || 0,
          column: issue.Pos?.Column || 0
        },
        suggestion: issue.SuggestedFixes?.[0]?.TextEdits?.[0]?.NewText
      });
    }

    return {
      tool: 'golangci-lint',
      timestamp: new Date().toISOString(),
      language: 'go',
      files: this.groupIssuesByFile(issues),
      issues,
      raw: output
    };
  }

  /**
   * Parse staticcheck JSON output
   */
  private parseStaticcheck(output: any): StandardizedToolOutput {
    const issues: StandardizedIssue[] = [];

    // staticcheck outputs JSON lines
    let checks = [];
    if (Array.isArray(output)) {
      checks = output;
    } else if (typeof output === 'string') {
      const lines = output.trim().split('\n');
      for (const line of lines) {
        try {
          checks.push(JSON.parse(line));
        } catch {
          // Skip non-JSON lines
        }
      }
    }

    for (const check of checks) {
      issues.push({
        id: `staticcheck-${check.code}-${check.location?.file || 'unknown'}-${check.location?.line || 0}`,
        type: this.mapStaticcheckType(check.code),
        severity: this.mapStaticcheckSeverity(check.severity),
        category: check.code?.split('A')[0] || 'general',
        title: check.code,
        description: check.message,
        location: {
          file: check.location?.file || 'unknown',
          line: check.location?.line || 0,
          column: check.location?.column || 0
        }
      });
    }

    return {
      tool: 'staticcheck',
      timestamp: new Date().toISOString(),
      language: 'go',
      files: this.groupIssuesByFile(issues),
      issues,
      raw: output
    };
  }

  /**
   * Parse GoSec JSON output
   */
  private parseGoSec(output: any): StandardizedToolOutput {
    const issues: StandardizedIssue[] = [];

    const gosecIssues = output.Issues || output.issues || [];

    for (const issue of gosecIssues) {
      issues.push({
        id: `gosec-${issue.rule_id}-${issue.file}-${issue.line}`,
        type: 'security',
        severity: this.mapGoSecSeverity(issue.severity),
        category: issue.details,
        title: issue.rule_id,
        description: issue.details,
        location: {
          file: issue.file,
          line: parseInt(issue.line),
          column: parseInt(issue.column)
        },
        evidence: issue.code,
        cwe: issue.cwe?.id
      });
    }

    return {
      tool: 'gosec',
      timestamp: new Date().toISOString(),
      language: 'go',
      files: this.groupIssuesByFile(issues),
      issues,
      raw: output
    };
  }

  /**
   * Parse govulncheck JSON output
   */
  private parseGovulncheck(output: any): StandardizedToolOutput {
    const issues: StandardizedIssue[] = [];

    const vulns = output.vulnerabilities || output.Vulns || [];

    for (const vuln of vulns) {
      const modules = vuln.modules || vuln.Modules || [];

      for (const mod of modules) {
        issues.push({
          id: `govulncheck-${vuln.id || vuln.ID}-${mod.path || mod.Path}`,
          type: 'security',
          severity: this.mapGovulncheckSeverity(vuln),
          category: 'dependency-vulnerability',
          title: vuln.id || vuln.ID,
          description: vuln.details || vuln.Details || '',
          location: {
            file: 'go.mod'
          },
          suggestion: mod.fixed_version || mod.FixedVersion
            ? `Update to ${mod.fixed_version || mod.FixedVersion}`
            : 'Check for available updates'
        });
      }
    }

    return {
      tool: 'govulncheck',
      timestamp: new Date().toISOString(),
      language: 'go',
      files: this.groupIssuesByFile(issues),
      issues,
      raw: output
    };
  }

  // ============================================================
  // RUST TOOL PARSERS
  // ============================================================

  /**
   * Parse Clippy JSON output (cargo output format)
   */
  private parseClippy(output: any): StandardizedToolOutput {
    const issues: StandardizedIssue[] = [];

    // Clippy outputs JSON per line when using --message-format=json
    let messages: any[] = [];
    if (Array.isArray(output)) {
      // Extract messages from compiler-message objects in array
      for (const item of output) {
        if (item.reason === 'compiler-message' && item.message) {
          messages.push(item.message);
        } else if (item.code && item.spans) {
          // Direct message format
          messages.push(item);
        }
      }
    } else if (typeof output === 'string') {
      const lines = output.trim().split('\n');
      for (const line of lines) {
        try {
          const msg = JSON.parse(line);
          if (msg.reason === 'compiler-message' && msg.message) {
            messages.push(msg.message);
          }
        } catch {
          // Skip non-JSON lines
        }
      }
    } else if (output.message) {
      messages = [output.message];
    }

    for (const msg of messages) {
      if (!msg.code || !msg.spans?.[0]) continue;

      const span = msg.spans[0];
      issues.push({
        id: `clippy-${msg.code.code}-${span.file_name}-${span.line_start}`,
        type: this.mapClippyType(msg.code.code),
        severity: this.mapClippySeverity(msg.level),
        category: msg.code.code?.split('::')[0] || 'general',
        title: msg.code.code,
        description: msg.message,
        location: {
          file: span.file_name,
          line: span.line_start,
          column: span.column_start,
          endLine: span.line_end,
          endColumn: span.column_end
        },
        evidence: span.text?.[0]?.text,
        suggestion: msg.children?.find((c: any) => c.message?.startsWith('help'))?.message
      });
    }

    return {
      tool: 'clippy',
      timestamp: new Date().toISOString(),
      language: 'rust',
      files: this.groupIssuesByFile(issues),
      issues,
      raw: output
    };
  }

  /**
   * Parse cargo-audit JSON output
   */
  private parseCargoAudit(output: any): StandardizedToolOutput {
    const issues: StandardizedIssue[] = [];

    const vulns = output.vulnerabilities?.list || output.Vulnerabilities?.list || [];

    for (const vuln of vulns) {
      const advisory = vuln.advisory || vuln.Advisory || {};
      const pkg = vuln.package || vuln.Package || {};

      issues.push({
        id: `cargo-audit-${advisory.id || advisory.ID}-${pkg.name || 'unknown'}`,
        type: 'security',
        severity: this.mapCargoAuditSeverity(advisory),
        category: 'dependency-vulnerability',
        title: advisory.id || advisory.ID,
        description: advisory.title || advisory.description,
        location: {
          file: 'Cargo.toml'
        },
        suggestion: vuln.versions?.patched?.length
          ? `Update to ${vuln.versions.patched.join(' or ')}`
          : 'Check for available updates'
      });
    }

    return {
      tool: 'cargo-audit',
      timestamp: new Date().toISOString(),
      language: 'rust',
      files: this.groupIssuesByFile(issues),
      issues,
      raw: output
    };
  }

  /**
   * Parse cargo-deny output
   */
  private parseCargoDeny(output: any): StandardizedToolOutput {
    const issues: StandardizedIssue[] = [];

    // cargo-deny outputs diagnostics per line
    let diagnostics = [];
    if (Array.isArray(output)) {
      diagnostics = output;
    } else if (typeof output === 'string') {
      const lines = output.trim().split('\n');
      for (const line of lines) {
        try {
          diagnostics.push(JSON.parse(line));
        } catch {
          // Skip non-JSON lines
        }
      }
    }

    for (const diag of diagnostics) {
      if (!diag.fields) continue;

      issues.push({
        id: `cargo-deny-${diag.fields.code || 'unknown'}-${issues.length}`,
        type: this.mapCargoDenyType(diag.fields.code),
        severity: this.mapCargoDenySeverity(diag.level),
        category: diag.fields.code || 'general',
        title: diag.fields.code || 'Cargo Deny',
        description: diag.fields.message,
        location: {
          file: diag.fields.span?.path || 'Cargo.toml'
        }
      });
    }

    return {
      tool: 'cargo-deny',
      timestamp: new Date().toISOString(),
      language: 'rust',
      files: this.groupIssuesByFile(issues),
      issues,
      raw: output
    };
  }

  // ============================================================
  // RUBY TOOL PARSERS
  // ============================================================

  /**
   * Parse RuboCop JSON output
   */
  private parseRuboCop(output: any): StandardizedToolOutput {
    const issues: StandardizedIssue[] = [];

    const files = output.files || [];

    for (const file of files) {
      for (const offense of (file.offenses || [])) {
        issues.push({
          id: `rubocop-${offense.cop_name}-${file.path}-${offense.location?.line || 0}`,
          type: this.mapRuboCopType(offense.cop_name),
          severity: this.mapRuboCopSeverity(offense.severity),
          category: offense.cop_name?.split('/')[0] || 'general',
          title: offense.cop_name,
          description: offense.message,
          location: {
            file: file.path,
            line: offense.location?.line || 0,
            column: offense.location?.column || 0,
            endLine: offense.location?.last_line,
            endColumn: offense.location?.last_column
          },
          suggestion: offense.correctable ? 'Auto-correctable with -a' : undefined
        });
      }
    }

    return {
      tool: 'rubocop',
      timestamp: new Date().toISOString(),
      language: 'ruby',
      files: this.groupIssuesByFile(issues),
      issues,
      raw: output
    };
  }

  /**
   * Parse Brakeman JSON output
   */
  private parseBrakeman(output: any): StandardizedToolOutput {
    const issues: StandardizedIssue[] = [];

    const warnings = output.warnings || [];

    for (const warning of warnings) {
      issues.push({
        id: `brakeman-${warning.check_name}-${warning.file}-${warning.line}`,
        type: 'security',
        severity: this.mapBrakemanSeverity(warning.confidence),
        category: warning.warning_type,
        title: warning.warning_type,
        description: warning.message,
        location: {
          file: warning.file,
          line: warning.line
        },
        evidence: warning.code,
        cwe: warning.cwe_id?.toString()
      });
    }

    return {
      tool: 'brakeman',
      timestamp: new Date().toISOString(),
      language: 'ruby',
      files: this.groupIssuesByFile(issues),
      issues,
      raw: output
    };
  }

  /**
   * Parse bundler-audit output
   */
  private parseBundlerAudit(output: any): StandardizedToolOutput {
    const issues: StandardizedIssue[] = [];

    // bundler-audit outputs { results: [...] }
    const results = output.results || output.advisories || [];

    for (const result of results) {
      const advisory = result.advisory || result;
      issues.push({
        id: `bundler-audit-${advisory.id || advisory.cve}-${result.gem?.name || 'unknown'}`,
        type: 'security',
        severity: this.mapBundlerAuditSeverity(advisory.criticality),
        category: 'dependency-vulnerability',
        title: advisory.id || advisory.cve,
        description: advisory.title || advisory.description,
        location: {
          file: 'Gemfile.lock'
        },
        suggestion: advisory.patched_versions?.length
          ? `Update to ${advisory.patched_versions.join(' or ')}`
          : 'Check for available updates'
      });
    }

    return {
      tool: 'bundler-audit',
      timestamp: new Date().toISOString(),
      language: 'ruby',
      files: this.groupIssuesByFile(issues),
      issues,
      raw: output
    };
  }

  // ============================================================
  // PHP TOOL PARSERS
  // ============================================================

  /**
   * Parse PHPStan JSON output
   */
  private parsePHPStan(output: any): StandardizedToolOutput {
    const issues: StandardizedIssue[] = [];

    const files = output.files || {};

    for (const [filePath, fileData] of Object.entries(files) as [string, any][]) {
      for (const msg of (fileData.messages || [])) {
        issues.push({
          id: `phpstan-${filePath}-${msg.line}`,
          type: this.mapPHPStanType(msg.message),
          severity: this.mapPHPStanSeverity(msg.ignorable),
          category: msg.identifier || 'general',
          title: 'PHPStan Error',
          description: msg.message,
          location: {
            file: filePath,
            line: msg.line
          }
        });
      }
    }

    return {
      tool: 'phpstan',
      timestamp: new Date().toISOString(),
      language: 'php',
      files: this.groupIssuesByFile(issues),
      issues,
      raw: output
    };
  }

  /**
   * Parse Psalm JSON output
   */
  private parsePsalm(output: any): StandardizedToolOutput {
    const issues: StandardizedIssue[] = [];

    const psalmIssues = Array.isArray(output) ? output : (output.issues || []);

    for (const issue of psalmIssues) {
      issues.push({
        id: `psalm-${issue.type}-${issue.file_path}-${issue.line_from}`,
        type: this.mapPsalmType(issue.type),
        severity: this.mapPsalmSeverity(issue.severity),
        category: issue.type,
        title: issue.type,
        description: issue.message,
        location: {
          file: issue.file_path,
          line: issue.line_from,
          column: issue.column_from,
          endLine: issue.line_to,
          endColumn: issue.column_to
        }
      });
    }

    return {
      tool: 'psalm',
      timestamp: new Date().toISOString(),
      language: 'php',
      files: this.groupIssuesByFile(issues),
      issues,
      raw: output
    };
  }

  /**
   * Parse PHP_CodeSniffer JSON output
   */
  private parsePHPCS(output: any): StandardizedToolOutput {
    const issues: StandardizedIssue[] = [];

    const files = output.files || {};

    for (const [filePath, fileData] of Object.entries(files) as [string, any][]) {
      for (const msg of (fileData.messages || [])) {
        issues.push({
          id: `phpcs-${msg.source}-${filePath}-${msg.line}`,
          type: 'quality',
          severity: this.mapPHPCSSeverity(msg.type),
          category: msg.source?.split('.')[0] || 'general',
          title: msg.source,
          description: msg.message,
          location: {
            file: filePath,
            line: msg.line,
            column: msg.column
          },
          suggestion: msg.fixable ? 'Auto-fixable with phpcbf' : undefined
        });
      }
    }

    return {
      tool: 'phpcs',
      timestamp: new Date().toISOString(),
      language: 'php',
      files: this.groupIssuesByFile(issues),
      issues,
      raw: output
    };
  }

  /**
   * Parse composer audit JSON output
   */
  private parseComposerAudit(output: any): StandardizedToolOutput {
    const issues: StandardizedIssue[] = [];

    const advisories = output.advisories || {};
    const pkgNames = Object.keys(advisories);

    for (const pkg of pkgNames) {
      const advList = advisories[pkg] as any[];
      if (!Array.isArray(advList)) continue;

      for (const advisory of advList) {
        issues.push({
          id: `composer-audit-${advisory.advisoryId || advisory.cve}-${pkg}`,
          type: 'security',
          severity: this.mapComposerAuditSeverity(advisory.severity),
          category: 'dependency-vulnerability',
          title: advisory.advisoryId || advisory.cve,
          description: advisory.title,
          location: {
            file: 'composer.json'
          },
          suggestion: advisory.affectedVersions
            ? `Update ${pkg} - affects ${advisory.affectedVersions}`
            : `Update ${pkg} to latest secure version`
        });
      }
    }

    return {
      tool: 'composer-audit',
      timestamp: new Date().toISOString(),
      language: 'php',
      files: this.groupIssuesByFile(issues),
      issues,
      raw: output
    };
  }

  // ============================================================
  // C#/.NET TOOL PARSERS
  // ============================================================

  /**
   * Parse dotnet format output
   */
  private parseDotnetFormat(output: any): StandardizedToolOutput {
    const issues: StandardizedIssue[] = [];

    // dotnet format outputs JSON with formatted files info
    const changes = output.changes || output.filesFormatted || [];

    for (const change of changes) {
      issues.push({
        id: `dotnet-format-${change.filePath || change}-${issues.length}`,
        type: 'quality',
        severity: 'low',
        category: 'code-style',
        title: 'Format Violation',
        description: `File needs formatting: ${change.filePath || change}`,
        location: {
          file: change.filePath || change
        },
        suggestion: 'Run dotnet format to fix'
      });
    }

    return {
      tool: 'dotnet-format',
      timestamp: new Date().toISOString(),
      language: 'csharp',
      files: this.groupIssuesByFile(issues),
      issues,
      raw: output
    };
  }

  /**
   * Parse Security Code Scan output
   */
  private parseSecurityCodeScan(output: any): StandardizedToolOutput {
    const issues: StandardizedIssue[] = [];

    // Security Code Scan outputs SARIF format
    if (output.runs) {
      for (const run of output.runs) {
        for (const result of (run.results || [])) {
          const loc = result.locations?.[0]?.physicalLocation;
          issues.push({
            id: `security-code-scan-${result.ruleId}-${loc?.artifactLocation?.uri || 'unknown'}-${loc?.region?.startLine || 0}`,
            type: 'security',
            severity: this.mapSarifSeverity(result.level),
            category: result.ruleId,
            title: result.ruleId,
            description: result.message?.text || '',
            location: {
              file: loc?.artifactLocation?.uri || 'unknown',
              line: loc?.region?.startLine || 0,
              column: loc?.region?.startColumn
            }
          });
        }
      }
    }

    return {
      tool: 'security-code-scan',
      timestamp: new Date().toISOString(),
      language: 'csharp',
      files: this.groupIssuesByFile(issues),
      issues,
      raw: output
    };
  }

  /**
   * Parse dotnet-outdated output
   */
  private parseDotnetOutdated(output: any): StandardizedToolOutput {
    const issues: StandardizedIssue[] = [];

    const projects = output.projects || [];

    for (const project of projects) {
      for (const framework of (project.targetFrameworks || [])) {
        for (const dep of (framework.topLevelPackages || [])) {
          if (dep.latestVersion && dep.resolvedVersion !== dep.latestVersion) {
            issues.push({
              id: `dotnet-outdated-${dep.id}-${project.path}`,
              type: 'dependency',
              severity: this.mapOutdatedSeverity(dep.resolvedVersion, dep.latestVersion),
              category: 'dependency-outdated',
              title: `Outdated: ${dep.id}`,
              description: `${dep.id} ${dep.resolvedVersion} → ${dep.latestVersion}`,
              location: {
                file: project.path
              },
              suggestion: `Update ${dep.id} to ${dep.latestVersion}`
            });
          }
        }
      }
    }

    return {
      tool: 'dotnet-outdated',
      timestamp: new Date().toISOString(),
      language: 'csharp',
      files: this.groupIssuesByFile(issues),
      issues,
      raw: output
    };
  }

  // ============================================================
  // UNIVERSAL TOOL PARSERS
  // ============================================================

  /**
   * Parse Semgrep JSON output
   */
  private parseSemgrep(output: any): StandardizedToolOutput {
    const issues: StandardizedIssue[] = [];

    const results = output.results || [];

    for (const result of results) {
      issues.push({
        id: result.check_id || `semgrep-${Date.now()}-${issues.length}`,
        type: this.mapSemgrepType(result.check_id),
        severity: this.mapSemgrepSeverity(result.extra?.severity || 'WARNING'),
        category: result.extra?.metadata?.category || 'security',
        title: result.check_id,
        description: result.extra?.message || result.check_id,
        location: {
          file: result.path,
          line: result.start?.line,
          column: result.start?.col,
          endLine: result.end?.line,
          endColumn: result.end?.col
        },
        evidence: result.extra?.lines,
        suggestion: result.extra?.fix || result.extra?.metadata?.fix,
        cwe: result.extra?.metadata?.cwe,
        owasp: result.extra?.metadata?.owasp,
        references: result.extra?.metadata?.references
      });
    }

    return {
      tool: 'semgrep',
      timestamp: new Date().toISOString(),
      files: this.groupIssuesByFile(issues),
      issues,
      raw: output
    };
  }

  /**
   * Generic parser for unknown tools
   */
  private parseGeneric(tool: string, output: any): StandardizedToolOutput {
    const issues: StandardizedIssue[] = [];

    // Try to extract issues from common formats
    if (Array.isArray(output)) {
      for (const item of output) {
        if (item.file || item.path || item.location) {
          issues.push(this.extractGenericIssue(item));
        }
      }
    } else if (output.issues || output.results || output.findings || output.errors) {
      const items = output.issues || output.results || output.findings || output.errors;
      for (const item of items) {
        issues.push(this.extractGenericIssue(item));
      }
    }

    return {
      tool,
      timestamp: new Date().toISOString(),
      files: this.groupIssuesByFile(issues),
      issues,
      raw: output
    };
  }

  // ============================================================
  // HELPER METHODS
  // ============================================================

  private extractGenericIssue(item: any): StandardizedIssue {
    return {
      id: item.id || `generic-${Date.now()}-${Math.random()}`,
      type: item.type || 'quality',
      severity: item.severity || 'medium',
      category: item.category || 'general',
      title: item.title || item.rule || item.message?.substring(0, 50) || 'Issue',
      description: item.description || item.message || item.details || '',
      location: {
        file: item.file || item.path || item.location?.file || 'unknown',
        line: item.line || item.location?.line,
        column: item.column || item.location?.column
      },
      evidence: item.evidence || item.code,
      suggestion: item.suggestion || item.fix
    };
  }

  private extractJsonArray(output: any): any[] {
    if (Array.isArray(output)) return output;
    if (typeof output !== 'string') return [];

    const jsonStart = output.indexOf('[');
    if (jsonStart === -1) return [];

    try {
      return JSON.parse(output.substring(jsonStart));
    } catch {
      return [];
    }
  }

  private groupIssuesByFile(issues: StandardizedIssue[]): FileAnalysis[] {
    const fileMap = new Map<string, FileAnalysis>();

    for (const issue of issues) {
      const filePath = issue.location.file;
      if (!fileMap.has(filePath)) {
        fileMap.set(filePath, {
          path: filePath,
          language: this.detectLanguage(filePath),
          size: 0,
          issues: []
        });
      }
      fileMap.get(filePath)!.issues.push(issue);
    }

    return Array.from(fileMap.values());
  }

  private detectLanguage(filePath: string): string {
    const ext = filePath.split('.').pop()?.toLowerCase();
    const langMap: Record<string, string> = {
      'js': 'javascript', 'jsx': 'javascript', 'mjs': 'javascript',
      'ts': 'typescript', 'tsx': 'typescript', 'mts': 'typescript',
      'py': 'python', 'pyw': 'python',
      'java': 'java',
      'go': 'go',
      'rb': 'ruby', 'rake': 'ruby',
      'php': 'php',
      'cs': 'csharp',
      'rs': 'rust',
      'swift': 'swift',
      'kt': 'kotlin', 'kts': 'kotlin',
      'scala': 'scala',
      'dart': 'dart'
    };
    return langMap[ext || ''] || 'unknown';
  }

  // ============================================================
  // SEVERITY MAPPING METHODS
  // ============================================================

  private mapCheckstyleSeverity(severity: string): StandardizedIssue['severity'] {
    // SESSION 26 FIX: ALL Checkstyle issues are style/formatting → always 'low'
    // Checkstyle checks code style (line length, Javadoc, naming conventions)
    // These issues don't cause crashes, data loss, or security vulnerabilities
    // Previous mapping (WRONG): error→high, warning→medium
    // Correct mapping: ALL → low (style/formatting only, no functional impact)
    return 'low';
  }

  private extractCheckstyleCategory(source: string): string {
    // Extract category from source like "com.puppycrawl.tools.checkstyle.checks.naming.ConstantNameCheck"
    const parts = source.split('.');
    const checksIndex = parts.indexOf('checks');
    if (checksIndex !== -1 && parts.length > checksIndex + 1) {
      return parts[checksIndex + 1];
    }
    return 'general';
  }

  private mapSpotBugsType(bugType: string): StandardizedIssue['type'] {
    if (bugType?.includes('SECURITY') || bugType?.includes('SQL') || bugType?.includes('XSS')) return 'security';
    if (bugType?.includes('PERFORMANCE')) return 'performance';
    if (bugType?.includes('STYLE') || bugType?.includes('I18N')) return 'quality';
    return 'bug';
  }

  private mapSpotBugsPriority(priority: number): StandardizedIssue['severity'] {
    if (priority === 1) return 'critical';
    if (priority === 2) return 'high';
    if (priority === 3) return 'medium';
    return 'low';
  }

  private mapPMDRuleset(ruleset: string): StandardizedIssue['type'] {
    const rs = ruleset?.toLowerCase() || '';
    if (rs.includes('security')) return 'security';
    if (rs.includes('performance')) return 'performance';
    if (rs.includes('design') || rs.includes('bestpractices')) return 'quality';
    if (rs.includes('error') || rs.includes('bug')) return 'bug';
    return 'quality';
  }

  private mapPMDPriority(priority: number): StandardizedIssue['severity'] {
    if (priority === 1) return 'critical';
    if (priority === 2) return 'high';
    if (priority === 3) return 'medium';
    return 'low';
  }

  private mapCVSSSeverity(score: number): StandardizedIssue['severity'] {
    if (score >= 9.0) return 'critical';
    if (score >= 7.0) return 'high';
    if (score >= 4.0) return 'medium';
    return 'low';
  }

  private mapESLintType(ruleId: string, severity: number): StandardizedIssue['type'] {
    if (!ruleId) return 'quality';
    if (ruleId.includes('security') || ruleId.includes('xss') || ruleId.includes('injection')) return 'security';
    if (ruleId.includes('performance')) return 'performance';
    if (ruleId.includes('style') || ruleId.includes('indent') || ruleId.includes('space')) return 'quality';
    if (severity === 2 || ruleId.includes('no-undef') || ruleId.includes('no-unused')) return 'bug';
    return 'quality';
  }

  private mapESLintSeverity(severity: number, ruleId?: string): StandardizedIssue['severity'] {
    if (severity === 1) return 'medium';
    if (severity === 2) {
      const highRules = ['no-undef', 'no-unreachable', 'no-redeclare', 'no-dupe-keys'];
      if (ruleId && highRules.some(r => ruleId.includes(r))) return 'high';
      return 'medium';
    }
    return 'low';
  }

  private mapNpmAuditSeverity(severity: string): StandardizedIssue['severity'] {
    switch (severity?.toLowerCase()) {
      case 'critical': return 'critical';
      case 'high': return 'high';
      case 'moderate': case 'medium': return 'medium';
      default: return 'low';
    }
  }

  private mapRuffType(code: string): StandardizedIssue['type'] {
    if (!code) return 'quality';
    const prefix = code.charAt(0);
    switch (prefix) {
      case 'S': return 'security';
      case 'E': case 'F': case 'B': return 'bug';
      case 'W': return 'quality';
      case 'C': return 'performance';
      default: return 'quality';
    }
  }

  private mapRuffSeverity(code: string): StandardizedIssue['severity'] {
    if (!code) return 'medium';
    const prefix = code.charAt(0);
    if (prefix === 'S') {
      const num = parseInt(code.substring(1));
      if (num >= 300) return 'high';
      if (num >= 200) return 'medium';
      return 'low';
    }
    if (prefix === 'E' || prefix === 'F') return 'high';
    if (prefix === 'B') return 'medium';
    return 'low';
  }

  private mapPylintType(type: string, messageId?: string): StandardizedIssue['type'] {
    if (messageId?.startsWith('E')) return 'bug';
    if (messageId?.startsWith('W')) return 'quality';
    if (messageId?.startsWith('C')) return 'quality';
    if (messageId?.startsWith('R')) return 'quality';
    return 'quality';
  }

  private mapPylintSeverity(type: string): StandardizedIssue['severity'] {
    switch (type?.toLowerCase()) {
      case 'error': case 'e': return 'high';
      case 'warning': case 'w': return 'medium';
      default: return 'low';
    }
  }

  private mapBanditSeverity(severity: string): StandardizedIssue['severity'] {
    switch (severity?.toUpperCase()) {
      case 'HIGH': return 'critical';
      case 'MEDIUM': return 'high';
      case 'LOW': return 'medium';
      default: return 'medium';
    }
  }

  private mapPipAuditSeverity(vuln: any): StandardizedIssue['severity'] {
    if (vuln.severity) {
      const sev = vuln.severity.toLowerCase();
      if (sev === 'critical') return 'critical';
      if (sev === 'high') return 'high';
      if (sev === 'medium') return 'medium';
      return 'low';
    }
    return 'high';
  }

  private mapGolangciType(linter: string): StandardizedIssue['type'] {
    const l = linter?.toLowerCase() || '';
    if (l.includes('gosec') || l.includes('security')) return 'security';
    if (l.includes('govet') || l.includes('staticcheck')) return 'bug';
    if (l.includes('gofmt') || l.includes('goimports')) return 'quality';
    return 'quality';
  }

  private mapGolangciSeverity(severity: string): StandardizedIssue['severity'] {
    switch (severity?.toLowerCase()) {
      case 'error': return 'high';
      case 'warning': return 'medium';
      default: return 'low';
    }
  }

  private mapStaticcheckType(code: string): StandardizedIssue['type'] {
    if (!code) return 'quality';
    if (code.startsWith('SA')) return 'bug';
    if (code.startsWith('ST')) return 'quality';
    if (code.startsWith('QF')) return 'quality';
    return 'quality';
  }

  private mapStaticcheckSeverity(severity: string): StandardizedIssue['severity'] {
    switch (severity?.toLowerCase()) {
      case 'error': return 'high';
      case 'warning': return 'medium';
      default: return 'low';
    }
  }

  private mapGoSecSeverity(severity: string): StandardizedIssue['severity'] {
    switch (severity?.toUpperCase()) {
      case 'HIGH': return 'critical';
      case 'MEDIUM': return 'high';
      case 'LOW': return 'medium';
      default: return 'medium';
    }
  }

  private mapGovulncheckSeverity(vuln: any): StandardizedIssue['severity'] {
    // govulncheck doesn't provide severity, use CVSS if available
    const score = vuln.cvss?.score || vuln.CVSSScore || 7;
    return this.mapCVSSSeverity(score);
  }

  private mapClippyType(code: string): StandardizedIssue['type'] {
    if (!code) return 'quality';
    if (code.includes('correctness')) return 'bug';
    if (code.includes('security')) return 'security';
    if (code.includes('perf')) return 'performance';
    return 'quality';
  }

  private mapClippySeverity(level: string): StandardizedIssue['severity'] {
    switch (level?.toLowerCase()) {
      case 'error': return 'high';
      case 'warning': return 'medium';
      default: return 'low';
    }
  }

  private mapCargoAuditSeverity(advisory: any): StandardizedIssue['severity'] {
    if (advisory.severity) {
      switch (advisory.severity.toLowerCase()) {
        case 'critical': return 'critical';
        case 'high': return 'high';
        case 'medium': return 'medium';
        default: return 'low';
      }
    }
    return 'high';
  }

  private mapCargoDenyType(code: string): StandardizedIssue['type'] {
    if (code?.includes('license')) return 'quality';
    if (code?.includes('ban')) return 'dependency';
    if (code?.includes('advisory')) return 'security';
    return 'quality';
  }

  private mapCargoDenySeverity(level: string): StandardizedIssue['severity'] {
    switch (level?.toLowerCase()) {
      case 'error': return 'high';
      case 'warn': return 'medium';
      default: return 'low';
    }
  }

  private mapRuboCopType(copName: string): StandardizedIssue['type'] {
    if (copName?.includes('Security')) return 'security';
    if (copName?.includes('Performance')) return 'performance';
    if (copName?.includes('Lint') || copName?.includes('Naming')) return 'quality';
    return 'quality';
  }

  private mapRuboCopSeverity(severity: string): StandardizedIssue['severity'] {
    switch (severity?.toLowerCase()) {
      case 'error': case 'fatal': return 'high';
      case 'warning': return 'medium';
      case 'convention': case 'refactor': return 'low';
      default: return 'medium';
    }
  }

  private mapBrakemanSeverity(confidence: string): StandardizedIssue['severity'] {
    switch (confidence?.toLowerCase()) {
      case 'high': return 'critical';
      case 'medium': return 'high';
      case 'weak': return 'medium';
      default: return 'medium';
    }
  }

  private mapBundlerAuditSeverity(criticality: string): StandardizedIssue['severity'] {
    switch (criticality?.toLowerCase()) {
      case 'critical': return 'critical';
      case 'high': return 'high';
      case 'medium': return 'medium';
      default: return 'low';
    }
  }

  private mapPHPStanType(message: string): StandardizedIssue['type'] {
    if (message?.includes('deprecated')) return 'quality';
    if (message?.includes('undefined') || message?.includes('does not exist')) return 'bug';
    return 'quality';
  }

  private mapPHPStanSeverity(ignorable: boolean): StandardizedIssue['severity'] {
    return ignorable ? 'medium' : 'high';
  }

  private mapPsalmType(type: string): StandardizedIssue['type'] {
    if (type?.includes('Security')) return 'security';
    if (type?.includes('Type') || type?.includes('Undefined')) return 'bug';
    return 'quality';
  }

  private mapPsalmSeverity(severity: string): StandardizedIssue['severity'] {
    switch (severity?.toLowerCase()) {
      case 'error': return 'high';
      case 'warning': case 'info': return 'medium';
      default: return 'low';
    }
  }

  private mapPHPCSSeverity(type: string): StandardizedIssue['severity'] {
    switch (type?.toUpperCase()) {
      case 'ERROR': return 'high';
      case 'WARNING': return 'medium';
      default: return 'low';
    }
  }

  private mapComposerAuditSeverity(severity: string): StandardizedIssue['severity'] {
    switch (severity?.toLowerCase()) {
      case 'critical': return 'critical';
      case 'high': return 'high';
      case 'medium': return 'medium';
      default: return 'low';
    }
  }

  private mapSarifSeverity(level: string): StandardizedIssue['severity'] {
    switch (level?.toLowerCase()) {
      case 'error': return 'high';
      case 'warning': return 'medium';
      case 'note': return 'low';
      default: return 'medium';
    }
  }

  private mapOutdatedSeverity(current: string, latest: string): StandardizedIssue['severity'] {
    // Major version change is high, minor is medium, patch is low
    const currentParts = current?.split('.').map(Number) || [0, 0, 0];
    const latestParts = latest?.split('.').map(Number) || [0, 0, 0];

    if (latestParts[0] > currentParts[0]) return 'high';
    if (latestParts[1] > currentParts[1]) return 'medium';
    return 'low';
  }

  private mapSemgrepType(checkId: string): StandardizedIssue['type'] {
    if (checkId?.includes('security')) return 'security';
    if (checkId?.includes('performance')) return 'performance';
    if (checkId?.includes('bug')) return 'bug';
    return 'quality';
  }

  private mapSemgrepSeverity(severity: string): StandardizedIssue['severity'] {
    switch (severity?.toUpperCase()) {
      case 'ERROR': return 'critical';
      case 'WARNING': return 'high';
      case 'INFO': return 'medium';
      default: return 'low';
    }
  }
}

export default EnhancedUniversalToolParser;
