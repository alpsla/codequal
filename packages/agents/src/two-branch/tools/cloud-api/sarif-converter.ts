/**
 * SARIF Converter
 *
 * Converts CodeQual Issue[] format to SARIF 2.1.0 format for upload to
 * cloud APIs like Corgea that accept SARIF input.
 *
 * SARIF (Static Analysis Results Interchange Format) is an OASIS standard
 * for expressing the output of static analysis tools.
 *
 * @see https://docs.oasis-open.org/sarif/sarif/v2.1.0/sarif-v2.1.0.html
 * @since Session 60
 */

import { Issue, IssueSeverity, IssueCategory } from '../../analyzers/v9-types';

// ============================================================
// SARIF 2.1.0 TYPES
// ============================================================

export interface SARIFReport {
  $schema: string;
  version: '2.1.0';
  runs: SARIFRun[];
}

export interface SARIFRun {
  tool: SARIFTool;
  results: SARIFResult[];
  artifacts?: SARIFArtifact[];
  invocations?: SARIFInvocation[];
}

export interface SARIFTool {
  driver: SARIFToolComponent;
}

export interface SARIFToolComponent {
  name: string;
  version?: string;
  informationUri?: string;
  rules?: SARIFRule[];
}

export interface SARIFRule {
  id: string;
  name?: string;
  shortDescription?: SARIFMessage;
  fullDescription?: SARIFMessage;
  helpUri?: string;
  defaultConfiguration?: {
    level?: SARIFLevel;
  };
  properties?: Record<string, unknown>;
}

export interface SARIFResult {
  ruleId: string;
  ruleIndex?: number;
  level?: SARIFLevel;
  message: SARIFMessage;
  locations?: SARIFLocation[];
  fingerprints?: Record<string, string>;
  codeFlows?: SARIFCodeFlow[];
  properties?: Record<string, unknown>;
}

export interface SARIFMessage {
  text: string;
  markdown?: string;
}

export interface SARIFLocation {
  physicalLocation?: SARIFPhysicalLocation;
  logicalLocations?: SARIFLogicalLocation[];
}

export interface SARIFPhysicalLocation {
  artifactLocation: SARIFArtifactLocation;
  region?: SARIFRegion;
}

export interface SARIFArtifactLocation {
  uri: string;
  uriBaseId?: string;
  index?: number;
}

export interface SARIFRegion {
  startLine?: number;
  startColumn?: number;
  endLine?: number;
  endColumn?: number;
  snippet?: SARIFArtifactContent;
}

export interface SARIFArtifactContent {
  text?: string;
  rendered?: SARIFMessage;
}

export interface SARIFLogicalLocation {
  name?: string;
  fullyQualifiedName?: string;
  kind?: string;
}

export interface SARIFArtifact {
  location: SARIFArtifactLocation;
  length?: number;
  mimeType?: string;
  encoding?: string;
  contents?: SARIFArtifactContent;
}

export interface SARIFInvocation {
  executionSuccessful: boolean;
  startTimeUtc?: string;
  endTimeUtc?: string;
  workingDirectory?: SARIFArtifactLocation;
}

export interface SARIFCodeFlow {
  threadFlows: SARIFThreadFlow[];
}

export interface SARIFThreadFlow {
  locations: SARIFThreadFlowLocation[];
}

export interface SARIFThreadFlowLocation {
  location: SARIFLocation;
  nestingLevel?: number;
}

type SARIFLevel = 'none' | 'note' | 'warning' | 'error';

// ============================================================
// CONVERSION OPTIONS
// ============================================================

export interface SARIFConversionOptions {
  /** Tool name to use in SARIF output */
  toolName?: string;

  /** Tool version */
  toolVersion?: string;

  /** Include source code snippets */
  includeSnippets?: boolean;

  /** Include CWE/OWASP metadata */
  includeMetadata?: boolean;

  /** Base path to strip from file paths */
  basePath?: string;
}

// ============================================================
// CONVERTER FUNCTIONS
// ============================================================

/**
 * Convert CodeQual Issues to SARIF 2.1.0 format
 */
export function convertToSARIF(
  issues: Issue[],
  options: SARIFConversionOptions = {}
): SARIFReport {
  const {
    toolName = 'CodeQual',
    toolVersion = '1.0.0',
    includeSnippets = true,
    includeMetadata = true,
    basePath = ''
  } = options;

  // Group issues by tool for multi-run support
  const issuesByTool = groupByTool(issues);

  // Create runs for each tool
  const runs: SARIFRun[] = Object.entries(issuesByTool).map(([tool, toolIssues]) => {
    // Extract unique rules
    const rules = extractRules(toolIssues, includeMetadata);

    // Create rule index map for efficient lookup
    const ruleIndexMap = new Map(rules.map((rule, index) => [rule.id, index]));

    // Convert issues to results
    const results = toolIssues.map(issue =>
      issueToResult(issue, ruleIndexMap, includeSnippets, basePath)
    );

    return {
      tool: {
        driver: {
          name: tool,
          version: toolVersion,
          informationUri: getToolInfoUri(tool),
          rules
        }
      },
      results,
      invocations: [{
        executionSuccessful: true,
        startTimeUtc: new Date().toISOString()
      }]
    };
  });

  // If no issues, create a single empty run
  if (runs.length === 0) {
    runs.push({
      tool: {
        driver: {
          name: toolName,
          version: toolVersion,
          rules: []
        }
      },
      results: [],
      invocations: [{
        executionSuccessful: true,
        startTimeUtc: new Date().toISOString()
      }]
    });
  }

  return {
    $schema: 'https://raw.githubusercontent.com/oasis-tcs/sarif-spec/master/Schemata/sarif-schema-2.1.0.json',
    version: '2.1.0',
    runs
  };
}

/**
 * Group issues by their source tool
 */
function groupByTool(issues: Issue[]): Record<string, Issue[]> {
  return issues.reduce((acc, issue) => {
    const tool = issue.tool || 'unknown';
    if (!acc[tool]) {
      acc[tool] = [];
    }
    acc[tool].push(issue);
    return acc;
  }, {} as Record<string, Issue[]>);
}

/**
 * Extract unique rules from issues
 */
function extractRules(issues: Issue[], includeMetadata: boolean): SARIFRule[] {
  const rulesMap = new Map<string, SARIFRule>();

  for (const issue of issues) {
    const ruleId = issue.rule || 'unknown';

    if (!rulesMap.has(ruleId)) {
      const rule: SARIFRule = {
        id: ruleId,
        shortDescription: {
          text: issue.title || ruleId
        },
        defaultConfiguration: {
          level: severityToLevel(issue.severity)
        }
      };

      // Add metadata if requested
      if (includeMetadata) {
        const properties: Record<string, unknown> = {};

        if (issue.cwe) {
          properties.cwe = Array.isArray(issue.cwe) ? issue.cwe : [issue.cwe];
        }
        if (issue.category) {
          properties.category = issue.category;
        }

        if (Object.keys(properties).length > 0) {
          rule.properties = properties;
        }
      }

      rulesMap.set(ruleId, rule);
    }
  }

  return Array.from(rulesMap.values());
}

/**
 * Convert a single Issue to SARIF Result
 */
function issueToResult(
  issue: Issue,
  ruleIndexMap: Map<string, number>,
  includeSnippets: boolean,
  basePath: string
): SARIFResult {
  const ruleId = issue.rule || 'unknown';
  const ruleIndex = ruleIndexMap.get(ruleId);

  // Normalize file path
  let filePath = issue.file || '';
  if (basePath && filePath.startsWith(basePath)) {
    filePath = filePath.substring(basePath.length);
  }
  // Remove leading slash for relative paths
  if (filePath.startsWith('/')) {
    filePath = filePath.substring(1);
  }

  const result: SARIFResult = {
    ruleId,
    level: severityToLevel(issue.severity),
    message: {
      text: issue.description || 'No description provided'
    },
    locations: [{
      physicalLocation: {
        artifactLocation: {
          uri: filePath
        },
        region: {
          startLine: issue.line || 1,
          startColumn: 1
        }
      }
    }]
  };

  // Add rule index if available
  if (ruleIndex !== undefined) {
    result.ruleIndex = ruleIndex;
  }

  // Add code snippet if available and requested
  if (includeSnippets && issue.codeSnippet) {
    result.locations![0].physicalLocation!.region!.snippet = {
      text: issue.codeSnippet
    };
  }

  // Add fingerprint for deduplication
  result.fingerprints = {
    'codequal/v1': generateFingerprint(issue)
  };

  // Add properties for additional metadata
  const properties: Record<string, unknown> = {};

  if (issue.suggestedFix) {
    properties.suggestedFix = issue.suggestedFix;
    properties.fixable = true;
  }

  if (Object.keys(properties).length > 0) {
    result.properties = properties;
  }

  return result;
}

/**
 * Convert Issue severity to SARIF level
 */
function severityToLevel(severity: IssueSeverity | string | undefined): SARIFLevel {
  switch (severity?.toLowerCase()) {
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

/**
 * Generate a fingerprint for issue deduplication
 */
function generateFingerprint(issue: Issue): string {
  const parts = [
    issue.rule || '',
    issue.file || '',
    String(issue.line || 0),
    issue.description?.substring(0, 50) || ''
  ];

  // Simple hash function
  let hash = 0;
  const str = parts.join('|');
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }

  return Math.abs(hash).toString(16).padStart(8, '0');
}

/**
 * Get tool information URI
 */
function getToolInfoUri(tool: string): string {
  const toolUrls: Record<string, string> = {
    semgrep: 'https://semgrep.dev/',
    eslint: 'https://eslint.org/',
    pmd: 'https://pmd.github.io/',
    spotbugs: 'https://spotbugs.github.io/',
    trivy: 'https://aquasecurity.github.io/trivy/',
    gitleaks: 'https://gitleaks.io/',
    checkov: 'https://www.checkov.io/',
    codequal: 'https://codequal.dev/'
  };

  return toolUrls[tool.toLowerCase()] || 'https://codequal.dev/';
}

// ============================================================
// SARIF PARSING (for reading SARIF responses)
// ============================================================

/**
 * Parse SARIF report back to CodeQual Issues
 * Useful for processing responses from tools that output SARIF
 */
export function parseSARIF(sarif: SARIFReport): Issue[] {
  const issues: Issue[] = [];

  for (const run of sarif.runs) {
    const toolName = run.tool.driver.name;
    const rules = run.tool.driver.rules || [];
    const ruleMap = new Map(rules.map(rule => [rule.id, rule]));

    for (const result of run.results) {
      const rule = ruleMap.get(result.ruleId);
      const location = result.locations?.[0]?.physicalLocation;

      // Map SARIF category to IssueCategory
      const rawCategory = (rule?.properties?.category as string) || 'security';
      const category = mapToIssueCategory(rawCategory);

      const issue: Issue = {
        id: result.fingerprints?.['codequal/v1'] || generateIssueId(),
        tool: toolName,
        agent: toolName, // Default agent to tool name
        rule: result.ruleId,
        severity: levelToSeverity(result.level),
        status: 'new', // Default status for parsed issues
        title: rule?.shortDescription?.text || result.ruleId,
        description: result.message.text,
        file: location?.artifactLocation?.uri || '',
        line: location?.region?.startLine || 1,
        category,
        cwe: Array.isArray(rule?.properties?.cwe)
          ? (rule?.properties?.cwe as string[])[0]
          : (rule?.properties?.cwe as string),
        codeSnippet: location?.region?.snippet?.text,
        suggestedFix: result.properties?.suggestedFix as string,
        impact: 'Issue detected by SARIF analysis',
        businessImpact: 'Requires review and remediation'
      };

      issues.push(issue);
    }
  }

  return issues;
}

/**
 * Map raw category string to IssueCategory type
 */
function mapToIssueCategory(raw: string): IssueCategory {
  const normalized = raw.toLowerCase();
  if (normalized.includes('security') || normalized.includes('vuln')) {
    return 'Security';
  }
  if (normalized.includes('perf')) {
    return 'Performance';
  }
  if (normalized.includes('arch') || normalized.includes('design')) {
    return 'Architecture';
  }
  if (normalized.includes('dep')) {
    return 'Dependency';
  }
  return 'Quality';
}

/**
 * Convert SARIF level to Issue severity
 */
function levelToSeverity(level: SARIFLevel | undefined): IssueSeverity {
  switch (level) {
    case 'error':
      return 'high';
    case 'warning':
      return 'medium';
    case 'note':
    case 'none':
      return 'low';
    default:
      return 'medium';
  }
}

/**
 * Generate a unique issue ID
 */
function generateIssueId(): string {
  return `issue-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}
