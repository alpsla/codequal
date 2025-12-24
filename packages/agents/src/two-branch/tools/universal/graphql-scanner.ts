/**
 * Universal GraphQL Security Scanner
 *
 * Integrates graphql-cop for GraphQL security auditing.
 * Detects security misconfigurations and vulnerabilities in GraphQL APIs.
 *
 * Tools:
 * - graphql-cop: GraphQL security audit tool (40+ security checks)
 *
 * Categories:
 * - graphql_security: Security issues in GraphQL configurations
 *
 * Note: graphql-cop requires a running GraphQL endpoint OR schema files.
 * This scanner focuses on static schema analysis.
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';

const execAsync = promisify(exec);

// ============================================================================
// Types
// ============================================================================

export interface GraphQLIssue {
  tool: 'graphql-cop' | 'graphql-static';
  file?: string;
  line?: number;
  column?: number;
  ruleId: string;
  message: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  category: 'graphql_security' | 'graphql_design';
  check?: string;      // Original check name from graphql-cop
  impact?: string;     // Security impact description
  remediation?: string; // How to fix
}

export interface GraphQLScanResult {
  tool: string;
  issues: GraphQLIssue[];
  scanDuration: number;
  schemaFiles: string[];
  configFiles: string[];
  error?: string;
}

export interface GraphQLScannerConfig {
  endpoint?: string;            // GraphQL endpoint URL (for live testing)
  schemaPath?: string;          // Path to schema file
  excludePaths?: string[];      // Paths to exclude
  staticAnalysisOnly?: boolean; // Only do static analysis (no endpoint)
}

const DEFAULT_CONFIG: GraphQLScannerConfig = {
  excludePaths: ['node_modules', 'vendor', '.git', 'dist', 'build'],
  staticAnalysisOnly: true  // Default to static analysis for CI/CD
};

// ============================================================================
// Security Checks (from graphql-cop)
// These are common GraphQL security issues we check for
// ============================================================================

interface SecurityCheck {
  id: string;
  name: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  category: 'graphql_security' | 'graphql_design';
  description: string;
  pattern?: RegExp;           // Pattern to detect in schema
  configCheck?: string;       // Config key to check
  remediation: string;
}

const SECURITY_CHECKS: SecurityCheck[] = [
  // Critical: Introspection enabled in production
  {
    id: 'graphql-introspection-enabled',
    name: 'Introspection Enabled',
    severity: 'high',
    category: 'graphql_security',
    description: 'GraphQL introspection is enabled, exposing entire API schema',
    pattern: /introspection\s*[=:]\s*true/i,
    configCheck: 'introspection',
    remediation: 'Disable introspection in production: introspection: false'
  },

  // High: No query depth limit
  {
    id: 'graphql-no-depth-limit',
    name: 'No Query Depth Limit',
    severity: 'high',
    category: 'graphql_security',
    description: 'No query depth limit configured, allowing deeply nested queries (DoS risk)',
    configCheck: 'depthLimit',
    remediation: 'Add depth limiting: depthLimit: 10 or use graphql-depth-limit package'
  },

  // High: No query complexity limit
  {
    id: 'graphql-no-complexity-limit',
    name: 'No Query Complexity Limit',
    severity: 'high',
    category: 'graphql_security',
    description: 'No query complexity limit configured, allowing expensive queries (DoS risk)',
    configCheck: 'complexityLimit',
    remediation: 'Add complexity limiting using graphql-query-complexity or similar'
  },

  // High: Batching enabled without limits
  {
    id: 'graphql-batch-no-limit',
    name: 'Batch Queries Without Limit',
    severity: 'medium',
    category: 'graphql_security',
    description: 'Query batching enabled without batch size limit',
    pattern: /batch\s*[=:]\s*true/i,
    remediation: 'Add batch size limit: batchMax: 10'
  },

  // Medium: Debug mode enabled
  {
    id: 'graphql-debug-enabled',
    name: 'Debug Mode Enabled',
    severity: 'medium',
    category: 'graphql_security',
    description: 'Debug mode is enabled, potentially exposing stack traces and internal errors',
    pattern: /debug\s*[=:]\s*true/i,
    configCheck: 'debug',
    remediation: 'Disable debug mode in production: debug: false'
  },

  // Medium: Playground/GraphiQL enabled
  {
    id: 'graphql-playground-enabled',
    name: 'GraphQL Playground Enabled',
    severity: 'medium',
    category: 'graphql_security',
    description: 'GraphQL Playground/GraphiQL is enabled in production',
    pattern: /(playground|graphiql)\s*[=:]\s*true/i,
    remediation: 'Disable playground in production or restrict access'
  },

  // Medium: Field suggestions enabled
  {
    id: 'graphql-suggestions-enabled',
    name: 'Field Suggestions Enabled',
    severity: 'low',
    category: 'graphql_security',
    description: 'Field suggestions are enabled, which aids schema discovery',
    pattern: /fieldSuggestion/i,
    remediation: 'Consider disabling field suggestions in production'
  },

  // High: No rate limiting
  {
    id: 'graphql-no-rate-limit',
    name: 'No Rate Limiting',
    severity: 'high',
    category: 'graphql_security',
    description: 'No rate limiting configured for GraphQL endpoint',
    remediation: 'Implement rate limiting using graphql-rate-limit or similar'
  },

  // Medium: No persisted queries
  {
    id: 'graphql-no-persisted-queries',
    name: 'Arbitrary Queries Allowed',
    severity: 'medium',
    category: 'graphql_security',
    description: 'Arbitrary queries allowed without persisted query restriction',
    remediation: 'Consider using persisted queries in production'
  },

  // Design: Overly permissive types
  {
    id: 'graphql-json-scalar',
    name: 'JSON Scalar Type Used',
    severity: 'low',
    category: 'graphql_design',
    description: 'JSON scalar type allows arbitrary data, bypassing GraphQL type safety',
    pattern: /scalar\s+JSON/i,
    remediation: 'Define specific types instead of using JSON scalar'
  },

  // Security: Sensitive fields exposed
  {
    id: 'graphql-sensitive-fields',
    name: 'Sensitive Fields Exposed',
    severity: 'high',
    category: 'graphql_security',
    description: 'Potentially sensitive fields exposed in schema (password, secret, token, key, credential)',
    pattern: /(password|secret|token|apikey|api_key|credential|private_key)\s*:/i,
    remediation: 'Remove sensitive fields from schema or add proper authorization'
  },

  // Design: No pagination
  {
    id: 'graphql-unbounded-list',
    name: 'Unbounded List Query',
    severity: 'medium',
    category: 'graphql_design',
    description: 'Query returns unbounded list without pagination arguments',
    pattern: /\]\s*$/,  // Simplified, would need more context
    remediation: 'Add pagination with first/after or limit/offset arguments'
  }
];

// ============================================================================
// File Discovery
// ============================================================================

/**
 * Find GraphQL schema and config files
 */
async function findGraphQLFiles(repoPath: string, config: GraphQLScannerConfig): Promise<{
  schemaFiles: string[];
  configFiles: string[];
}> {
  const schemaFiles: string[] = [];
  const configFiles: string[] = [];

  // Schema file patterns
  const schemaPatterns = [
    /\.graphql$/i,
    /\.gql$/i,
    /schema\.(graphql|gql|json)$/i,
    /typeDefs\.(js|ts)$/i
  ];

  // Config file patterns (for GraphQL server configuration)
  const configPatterns = [
    /apollo\.(config|server)\.(js|ts|json)$/i,
    /graphql\.(config|server)\.(js|ts|json)$/i,
    /\.graphqlrc/i,
    /yoga\.(config|server)\.(js|ts)$/i
  ];

  async function searchDir(dir: string, depth = 0): Promise<void> {
    if (depth > 5) return;

    try {
      const entries = await fs.promises.readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        const relativePath = path.relative(repoPath, fullPath);

        // Skip excluded paths
        if (config.excludePaths?.some(p => relativePath.includes(p))) {
          continue;
        }

        if (entry.isDirectory()) {
          await searchDir(fullPath, depth + 1);
        } else if (entry.isFile()) {
          if (schemaPatterns.some(p => p.test(entry.name))) {
            schemaFiles.push(fullPath);
          }
          if (configPatterns.some(p => p.test(entry.name))) {
            configFiles.push(fullPath);
          }
        }
      }
    } catch {
      // Ignore directory access errors
    }
  }

  await searchDir(repoPath);
  return { schemaFiles, configFiles };
}

// ============================================================================
// Static Analysis
// ============================================================================

/**
 * Analyze GraphQL schema file for security issues
 */
async function analyzeSchemaFile(
  filePath: string,
  repoPath: string
): Promise<GraphQLIssue[]> {
  const issues: GraphQLIssue[] = [];
  const relativePath = path.relative(repoPath, filePath);

  try {
    const content = await fs.promises.readFile(filePath, 'utf-8');
    const lines = content.split('\n');

    // Check for pattern-based issues
    for (const check of SECURITY_CHECKS) {
      if (check.pattern) {
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          if (check.pattern.test(line)) {
            issues.push({
              tool: 'graphql-static',
              file: relativePath,
              line: i + 1,
              ruleId: check.id,
              message: check.description,
              severity: check.severity,
              category: check.category,
              check: check.name,
              remediation: check.remediation
            });
          }
        }
      }
    }
  } catch {
    // Ignore read errors
  }

  return issues;
}

/**
 * Analyze GraphQL config file for security misconfigurations
 */
async function analyzeConfigFile(
  filePath: string,
  repoPath: string
): Promise<GraphQLIssue[]> {
  const issues: GraphQLIssue[] = [];
  const relativePath = path.relative(repoPath, filePath);

  try {
    const content = await fs.promises.readFile(filePath, 'utf-8');
    const lines = content.split('\n');

    // Track which security configs are present
    const configsFound = new Set<string>();

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].toLowerCase();

      // Check for pattern-based issues in config
      for (const check of SECURITY_CHECKS) {
        if (check.pattern && check.pattern.test(lines[i])) {
          issues.push({
            tool: 'graphql-static',
            file: relativePath,
            line: i + 1,
            ruleId: check.id,
            message: check.description,
            severity: check.severity,
            category: check.category,
            check: check.name,
            remediation: check.remediation
          });
        }
      }

      // Track security configs that are present
      if (line.includes('depthlimit')) configsFound.add('depthLimit');
      if (line.includes('complexitylimit') || line.includes('complexity')) configsFound.add('complexityLimit');
      if (line.includes('ratelimit')) configsFound.add('rateLimit');
    }

    // Check for missing security configs
    if (!configsFound.has('depthLimit')) {
      const depthCheck = SECURITY_CHECKS.find(c => c.id === 'graphql-no-depth-limit');
      if (depthCheck) {
        issues.push({
          tool: 'graphql-static',
          file: relativePath,
          ruleId: depthCheck.id,
          message: depthCheck.description,
          severity: depthCheck.severity,
          category: depthCheck.category,
          check: depthCheck.name,
          remediation: depthCheck.remediation
        });
      }
    }

    if (!configsFound.has('complexityLimit')) {
      const complexityCheck = SECURITY_CHECKS.find(c => c.id === 'graphql-no-complexity-limit');
      if (complexityCheck) {
        issues.push({
          tool: 'graphql-static',
          file: relativePath,
          ruleId: complexityCheck.id,
          message: complexityCheck.description,
          severity: complexityCheck.severity,
          category: complexityCheck.category,
          check: complexityCheck.name,
          remediation: complexityCheck.remediation
        });
      }
    }
  } catch {
    // Ignore read errors
  }

  return issues;
}

// ============================================================================
// graphql-cop Integration (for live endpoint testing)
// ============================================================================

/**
 * Run graphql-cop against a live endpoint
 * Note: This requires the endpoint to be accessible
 */
async function runGraphQLCop(
  endpoint: string
): Promise<GraphQLIssue[]> {
  const issues: GraphQLIssue[] = [];

  try {
    // Check if graphql-cop is available
    try {
      await execAsync('graphql-cop --version');
    } catch {
      // graphql-cop not installed, skip live testing
      return issues;
    }

    const { stdout } = await execAsync(`graphql-cop -t "${endpoint}" -o json`, {
      timeout: 60000  // 1 minute timeout
    });

    // Parse graphql-cop JSON output
    const results = JSON.parse(stdout);

    for (const result of results) {
      issues.push({
        tool: 'graphql-cop',
        ruleId: `graphql-cop-${result.id || 'unknown'}`,
        message: result.title || result.description || 'GraphQL security issue detected',
        severity: mapCopSeverity(result.severity || result.impact),
        category: 'graphql_security',
        check: result.check,
        impact: result.impact,
        remediation: result.remediation
      });
    }
  } catch (error: any) {
    // graphql-cop may fail if endpoint is not accessible
    if (error.stdout) {
      try {
        const results = JSON.parse(error.stdout);
        for (const result of results) {
          issues.push({
            tool: 'graphql-cop',
            ruleId: `graphql-cop-${result.id || 'unknown'}`,
            message: result.title || result.description || 'GraphQL security issue detected',
            severity: mapCopSeverity(result.severity || result.impact),
            category: 'graphql_security',
            check: result.check,
            impact: result.impact,
            remediation: result.remediation
          });
        }
      } catch {
        // JSON parse failed
      }
    }
  }

  return issues;
}

function mapCopSeverity(severity: string | undefined): 'critical' | 'high' | 'medium' | 'low' {
  if (!severity) return 'medium';
  const s = severity.toLowerCase();
  if (s.includes('critical')) return 'critical';
  if (s.includes('high')) return 'high';
  if (s.includes('low') || s.includes('info')) return 'low';
  return 'medium';
}

// ============================================================================
// Main Scanner
// ============================================================================

/**
 * Run GraphQL security scanner
 */
export async function runGraphQLScanner(
  repoPath: string,
  config: Partial<GraphQLScannerConfig> = {}
): Promise<GraphQLScanResult> {
  const startTime = Date.now();
  const cfg = { ...DEFAULT_CONFIG, ...config };
  const allIssues: GraphQLIssue[] = [];

  try {
    // Find GraphQL files
    const { schemaFiles, configFiles } = await findGraphQLFiles(repoPath, cfg);

    // Static analysis of schema files
    for (const file of schemaFiles) {
      const schemaIssues = await analyzeSchemaFile(file, repoPath);
      allIssues.push(...schemaIssues);
    }

    // Static analysis of config files
    for (const file of configFiles) {
      const configIssues = await analyzeConfigFile(file, repoPath);
      allIssues.push(...configIssues);
    }

    // Live endpoint testing (if endpoint provided and not static-only)
    if (cfg.endpoint && !cfg.staticAnalysisOnly) {
      const liveIssues = await runGraphQLCop(cfg.endpoint);
      allIssues.push(...liveIssues);
    }

    return {
      tool: 'graphql-scanner',
      issues: allIssues,
      scanDuration: Date.now() - startTime,
      schemaFiles: schemaFiles.map(f => path.relative(repoPath, f)),
      configFiles: configFiles.map(f => path.relative(repoPath, f))
    };
  } catch (error: any) {
    return {
      tool: 'graphql-scanner',
      issues: allIssues,
      scanDuration: Date.now() - startTime,
      schemaFiles: [],
      configFiles: [],
      error: error.message || 'Unknown error during GraphQL scan'
    };
  }
}

// ============================================================================
// Exports
// ============================================================================

export {
  findGraphQLFiles,
  analyzeSchemaFile,
  analyzeConfigFile,
  runGraphQLCop,
  SECURITY_CHECKS
};
