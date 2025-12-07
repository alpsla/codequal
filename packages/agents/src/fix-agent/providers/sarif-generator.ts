/**
 * SARIF Generator
 *
 * Generates SARIF (Static Analysis Results Interchange Format) reports
 * for GitHub Code Scanning and other SARIF-compatible tools.
 *
 * SARIF Spec: https://sarifweb.azurewebsites.net/
 * GitHub Code Scanning: https://docs.github.com/en/code-security/code-scanning
 *
 * Features:
 * - Full SARIF 2.1.0 compliance
 * - Includes fix suggestions in SARIF format
 * - Proper severity mapping
 * - Rule documentation links
 * - Fingerprinting for deduplication
 */

import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { FixReportIssue, IssueSeverity, IssueCategory } from '../types/fix-report-types';

// ============================================================================
// SARIF Types (SARIF 2.1.0 Specification)
// ============================================================================

export interface SARIFReport {
  $schema: string;
  version: string;
  runs: SARIFRun[];
}

export interface SARIFRun {
  tool: {
    driver: SARIFToolDriver;
  };
  results: SARIFResult[];
  invocations?: SARIFInvocation[];
  artifacts?: SARIFArtifact[];
}

export interface SARIFToolDriver {
  name: string;
  version: string;
  semanticVersion?: string;
  informationUri: string;
  rules: SARIFRule[];
  notifications?: SARIFNotification[];
}

export interface SARIFRule {
  id: string;
  name: string;
  shortDescription: { text: string };
  fullDescription?: { text: string; markdown?: string };
  helpUri?: string;
  help?: { text: string; markdown?: string };
  defaultConfiguration: {
    level: SARIFLevel;
    enabled?: boolean;
  };
  properties?: {
    tags?: string[];
    category?: string;
    precision?: 'very-high' | 'high' | 'medium' | 'low';
    'security-severity'?: string;
  };
}

export interface SARIFResult {
  ruleId: string;
  ruleIndex?: number;
  level: SARIFLevel;
  kind?: 'fail' | 'pass' | 'open' | 'informational' | 'notApplicable' | 'review';
  message: { text: string; markdown?: string };
  locations: SARIFLocation[];
  fingerprints?: Record<string, string>;
  partialFingerprints?: Record<string, string>;
  codeFlows?: SARIFCodeFlow[];
  relatedLocations?: SARIFLocation[];
  fixes?: SARIFFix[];
  properties?: Record<string, unknown>;
}

export interface SARIFLocation {
  physicalLocation?: {
    artifactLocation: { uri: string; uriBaseId?: string; index?: number };
    region?: {
      startLine: number;
      startColumn?: number;
      endLine?: number;
      endColumn?: number;
      snippet?: { text: string };
    };
    contextRegion?: {
      startLine: number;
      endLine: number;
      snippet?: { text: string };
    };
  };
  logicalLocations?: Array<{
    name?: string;
    fullyQualifiedName?: string;
    kind?: string;
  }>;
}

export interface SARIFFix {
  description: { text: string };
  artifactChanges: SARIFArtifactChange[];
}

export interface SARIFArtifactChange {
  artifactLocation: { uri: string };
  replacements: SARIFReplacement[];
}

export interface SARIFReplacement {
  deletedRegion: {
    startLine: number;
    startColumn?: number;
    endLine?: number;
    endColumn?: number;
    charOffset?: number;
    charLength?: number;
  };
  insertedContent: { text: string };
}

export interface SARIFInvocation {
  executionSuccessful: boolean;
  startTimeUtc?: string;
  endTimeUtc?: string;
  workingDirectory?: { uri: string };
}

export interface SARIFArtifact {
  location: { uri: string };
  length?: number;
  mimeType?: string;
  roles?: string[];
}

export interface SARIFCodeFlow {
  threadFlows: Array<{
    locations: Array<{
      location: SARIFLocation;
      nestingLevel?: number;
    }>;
  }>;
}

export interface SARIFNotification {
  id: string;
  level: SARIFLevel;
  message: { text: string };
}

export type SARIFLevel = 'none' | 'note' | 'warning' | 'error';

// ============================================================================
// SARIF Generator Configuration
// ============================================================================

export interface SARIFGeneratorConfig {
  toolName?: string;
  toolVersion?: string;
  toolInformationUri?: string;
  includeFixSuggestions?: boolean;
  includeCodeSnippets?: boolean;
  includeRelatedLocations?: boolean;
  generateFingerprints?: boolean;
}

const DEFAULT_CONFIG: Required<SARIFGeneratorConfig> = {
  toolName: 'CodeQual',
  toolVersion: '9.0.0',
  toolInformationUri: 'https://codequal.dev',
  includeFixSuggestions: true,
  includeCodeSnippets: true,
  includeRelatedLocations: false,
  generateFingerprints: true,
};

// ============================================================================
// SARIF Generator Class
// ============================================================================

export class SARIFGenerator {
  private config: Required<SARIFGeneratorConfig>;

  constructor(config: SARIFGeneratorConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Generate a complete SARIF report from issues
   */
  generate(issues: FixReportIssue[], metadata?: {
    repository?: string;
    prNumber?: number;
    analyzedAt?: string;
  }): SARIFReport {
    // Build rules from unique rule IDs
    const rulesMap = new Map<string, SARIFRule>();
    const ruleIndexMap = new Map<string, number>();

    for (const issue of issues) {
      if (!rulesMap.has(issue.ruleId)) {
        const rule = this.buildRule(issue);
        ruleIndexMap.set(issue.ruleId, rulesMap.size);
        rulesMap.set(issue.ruleId, rule);
      }
    }

    // Build results
    const results: SARIFResult[] = issues.map(issue =>
      this.buildResult(issue, ruleIndexMap.get(issue.ruleId))
    );

    // Build artifacts (unique files)
    const artifacts: SARIFArtifact[] = this.buildArtifacts(issues);

    // Build invocation
    const invocation: SARIFInvocation = {
      executionSuccessful: true,
      startTimeUtc: metadata?.analyzedAt || new Date().toISOString(),
      endTimeUtc: new Date().toISOString(),
    };

    return {
      $schema: 'https://raw.githubusercontent.com/oasis-tcs/sarif-spec/master/Schemata/sarif-schema-2.1.0.json',
      version: '2.1.0',
      runs: [
        {
          tool: {
            driver: {
              name: this.config.toolName,
              version: this.config.toolVersion,
              semanticVersion: this.config.toolVersion,
              informationUri: this.config.toolInformationUri,
              rules: Array.from(rulesMap.values()),
            },
          },
          results,
          invocations: [invocation],
          artifacts,
        },
      ],
    };
  }

  /**
   * Generate and write SARIF report to file
   */
  async generateToFile(
    issues: FixReportIssue[],
    outputPath: string,
    metadata?: { repository?: string; prNumber?: number; analyzedAt?: string }
  ): Promise<string> {
    const report = this.generate(issues, metadata);

    // Ensure directory exists
    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(outputPath, JSON.stringify(report, null, 2), 'utf-8');
    return outputPath;
  }

  // ==========================================================================
  // Building SARIF Components
  // ==========================================================================

  private buildRule(issue: FixReportIssue): SARIFRule {
    const rule: SARIFRule = {
      id: issue.ruleId,
      name: issue.ruleId,
      shortDescription: { text: this.truncate(issue.message, 200) },
      defaultConfiguration: {
        level: this.mapSeverityToLevel(issue.severity),
        enabled: true,
      },
      properties: {
        tags: this.getTagsForCategory(issue.category),
        category: issue.category,
        precision: this.getPrecision(issue.severity),
      },
    };

    // Add full description if available
    if (issue.description) {
      rule.fullDescription = {
        text: issue.description,
        markdown: issue.description,
      };
    }

    // Add help URI
    const helpUri = this.getRuleDocUrl(issue.tool, issue.ruleId);
    if (helpUri) {
      rule.helpUri = helpUri;
    }

    // Add security severity for security issues
    if (issue.category === 'security' || issue.category === 'dependency_vulnerability') {
      rule.properties!['security-severity'] = this.getSecuritySeverity(issue.severity);
    }

    return rule;
  }

  private buildResult(issue: FixReportIssue, ruleIndex?: number): SARIFResult {
    const result: SARIFResult = {
      ruleId: issue.ruleId,
      ruleIndex,
      level: this.mapSeverityToLevel(issue.severity),
      kind: 'fail',
      message: {
        text: issue.message,
        markdown: issue.description || issue.message,
      },
      locations: [
        {
          physicalLocation: {
            artifactLocation: { uri: issue.filePath },
            region: {
              startLine: issue.lineNumber,
              startColumn: issue.columnNumber,
              endLine: issue.endLine || issue.lineNumber,
              endColumn: issue.endColumn,
            },
          },
        },
      ],
    };

    // Add code snippet if available and enabled
    if (this.config.includeCodeSnippets && issue.codeSnippet) {
      result.locations[0].physicalLocation!.region!.snippet = {
        text: issue.codeSnippet,
      };
    }

    // Add fingerprints for deduplication
    if (this.config.generateFingerprints) {
      result.fingerprints = {
        'primaryLocationLineHash': this.generateFingerprint(issue),
      };
      result.partialFingerprints = {
        'primaryLocationLineHash/v1': this.generatePartialFingerprint(issue),
      };
    }

    // Add fix suggestion if available and enabled
    if (this.config.includeFixSuggestions && issue.fixAvailable && issue.fixedCode) {
      result.fixes = [
        {
          description: { text: `Apply CodeQual fix for ${issue.ruleId}` },
          artifactChanges: [
            {
              artifactLocation: { uri: issue.filePath },
              replacements: [
                {
                  deletedRegion: {
                    startLine: issue.lineNumber,
                    startColumn: issue.columnNumber || 1,
                    endLine: issue.endLine || issue.lineNumber,
                    endColumn: issue.endColumn || 1000,
                  },
                  insertedContent: { text: issue.fixedCode },
                },
              ],
            },
          ],
        },
      ];
    }

    // Add properties for additional context
    result.properties = {
      tool: issue.tool,
      category: issue.category,
      fixAvailable: issue.fixAvailable,
      fixSource: issue.fixSource,
      fixConfidence: issue.fixConfidence,
      isIntentionalUse: issue.isIntentionalUse,
    };

    return result;
  }

  private buildArtifacts(issues: FixReportIssue[]): SARIFArtifact[] {
    const fileSet = new Set<string>();
    for (const issue of issues) {
      fileSet.add(issue.filePath);
    }

    return Array.from(fileSet).map(uri => ({
      location: { uri },
      roles: ['analysisTarget'],
    }));
  }

  // ==========================================================================
  // Mapping Helpers
  // ==========================================================================

  private mapSeverityToLevel(severity: IssueSeverity): SARIFLevel {
    switch (severity) {
      case 'critical':
      case 'high':
        return 'error';
      case 'medium':
        return 'warning';
      case 'low':
      case 'info':
        return 'note';
      default:
        return 'warning';
    }
  }

  private getSecuritySeverity(severity: IssueSeverity): string {
    // GitHub uses 0-10 scale for security severity
    switch (severity) {
      case 'critical':
        return '9.0';
      case 'high':
        return '7.0';
      case 'medium':
        return '5.0';
      case 'low':
        return '3.0';
      case 'info':
        return '1.0';
      default:
        return '5.0';
    }
  }

  private getPrecision(severity: IssueSeverity): 'very-high' | 'high' | 'medium' | 'low' {
    switch (severity) {
      case 'critical':
      case 'high':
        return 'high';
      case 'medium':
        return 'medium';
      default:
        return 'medium';
    }
  }

  private getTagsForCategory(category: IssueCategory): string[] {
    const baseTags = ['codequal'];

    switch (category) {
      case 'security':
        return [...baseTags, 'security', 'vulnerability'];
      case 'dependency_vulnerability':
        return [...baseTags, 'security', 'dependency', 'vulnerability'];
      case 'code_quality':
        return [...baseTags, 'maintainability', 'code-quality'];
      case 'performance':
        return [...baseTags, 'performance', 'efficiency'];
      case 'architecture':
        return [...baseTags, 'architecture', 'design'];
      case 'code_style':
        return [...baseTags, 'style', 'formatting'];
      case 'best_practice':
        return [...baseTags, 'best-practice', 'recommendation'];
      case 'documentation':
        return [...baseTags, 'documentation'];
      default:
        return baseTags;
    }
  }

  private getRuleDocUrl(tool: string, ruleId: string): string | undefined {
    switch (tool.toLowerCase()) {
      case 'semgrep':
        return `https://semgrep.dev/r/${ruleId}`;
      case 'eslint':
        return `https://eslint.org/docs/rules/${ruleId}`;
      case 'typescript-eslint':
        return `https://typescript-eslint.io/rules/${ruleId}`;
      case 'pmd':
        return `https://pmd.github.io/latest/pmd_rules_java.html`;
      case 'checkstyle':
        return `https://checkstyle.org/checks.html`;
      case 'bandit':
        return `https://bandit.readthedocs.io/en/latest/plugins/`;
      case 'gosec':
        return `https://github.com/securego/gosec#available-rules`;
      case 'dependency-check':
      case 'npm-audit':
        return `https://nvd.nist.gov/vuln/search`;
      default:
        return undefined;
    }
  }

  private generateFingerprint(issue: FixReportIssue): string {
    const data = `${issue.filePath}:${issue.lineNumber}:${issue.ruleId}:${issue.tool}`;
    return crypto.createHash('sha256').update(data).digest('hex').substring(0, 16);
  }

  private generatePartialFingerprint(issue: FixReportIssue): string {
    // Partial fingerprint is less specific - allows for line number changes
    const data = `${issue.filePath}:${issue.ruleId}:${issue.tool}`;
    return crypto.createHash('sha256').update(data).digest('hex').substring(0, 16);
  }

  private truncate(str: string, maxLength: number): string {
    if (str.length <= maxLength) {
      return str;
    }
    return str.substring(0, maxLength - 3) + '...';
  }
}

// ============================================================================
// Factory and Convenience Functions
// ============================================================================

/**
 * Create a SARIF generator instance
 */
export function createSARIFGenerator(config?: SARIFGeneratorConfig): SARIFGenerator {
  return new SARIFGenerator(config);
}

/**
 * Generate SARIF report from issues
 */
export function generateSARIF(
  issues: FixReportIssue[],
  config?: SARIFGeneratorConfig,
  metadata?: { repository?: string; prNumber?: number; analyzedAt?: string }
): SARIFReport {
  const generator = new SARIFGenerator(config);
  return generator.generate(issues, metadata);
}

/**
 * Generate and write SARIF report to file
 */
export async function generateSARIFToFile(
  issues: FixReportIssue[],
  outputPath: string,
  config?: SARIFGeneratorConfig,
  metadata?: { repository?: string; prNumber?: number; analyzedAt?: string }
): Promise<string> {
  const generator = new SARIFGenerator(config);
  return generator.generateToFile(issues, outputPath, metadata);
}
