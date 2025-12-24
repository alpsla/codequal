/**
 * Universal API Schema Scanner
 *
 * Integrates Spectral for OpenAPI and AsyncAPI linting.
 * Detects API design issues, security vulnerabilities, and best practice violations.
 *
 * Tools:
 * - Spectral: OpenAPI 2.0/3.x, AsyncAPI 2.x linting with 100+ rules
 *
 * Categories:
 * - api_design: API design best practices
 * - api_security: Security issues in API definitions (auth, CORS, etc.)
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';

const execAsync = promisify(exec);

// ============================================================================
// Types
// ============================================================================

export interface APISchemaIssue {
  tool: 'spectral';
  file: string;
  line: number;
  column?: number;
  endLine?: number;
  endColumn?: number;
  ruleId: string;
  message: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  category: 'api_design' | 'api_security';
  path?: string[];  // JSON path to the issue (e.g., ['paths', '/users', 'get', 'responses'])
  schemaType?: 'openapi' | 'asyncapi';
}

export interface APISchemaScanResult {
  tool: string;
  issues: APISchemaIssue[];
  scanDuration: number;
  filesScanned: number;
  schemaFiles: string[];
  error?: string;
}

export interface APISchemaScannerConfig {
  rulesets?: string[];           // Custom rulesets to use
  includePaths?: string[];       // Paths to include (defaults to common locations)
  excludePaths?: string[];       // Paths to exclude
  failOnError?: boolean;         // Fail scan if Spectral errors
  format?: 'json' | 'stylish';   // Output format
}

const DEFAULT_CONFIG: APISchemaScannerConfig = {
  rulesets: [],  // Use Spectral defaults (OpenAPI + AsyncAPI)
  includePaths: [
    '**/*.yaml',
    '**/*.yml',
    '**/*.json',
    '**/openapi.*',
    '**/swagger.*',
    '**/asyncapi.*',
    '**/api-spec.*',
    'docs/api/**/*',
    'specs/**/*',
    'api/**/*'
  ],
  excludePaths: ['node_modules', 'vendor', '.git', 'dist', 'build', 'coverage'],
  failOnError: false,
  format: 'json'
};

// ============================================================================
// Security-related rules (map to high severity)
// ============================================================================

const SECURITY_RULES = new Set([
  // Authentication/Authorization
  'operation-security-defined',
  'oas3-api-servers',
  'oas2-api-schemes',

  // OWASP API Security
  'owasp:api1:2019-no-numeric-ids',
  'owasp:api2:2019-auth-insecure-schemes',
  'owasp:api2:2019-no-api-keys-in-url',
  'owasp:api2:2019-no-credentials-in-url',
  'owasp:api2:2019-no-http-basic',
  'owasp:api3:2019-define-error-responses-401',
  'owasp:api3:2019-define-error-responses-500',
  'owasp:api4:2019-rate-limit',
  'owasp:api4:2019-string-limit',
  'owasp:api4:2019-string-restricted',
  'owasp:api4:2019-array-limit',
  'owasp:api4:2019-integer-limit',
  'owasp:api4:2019-integer-limit-legacy',

  // General security
  'no-eval-in-markdown',
  'no-script-tags-in-markdown',
  'typed-enum',
  'no-$ref-siblings'
]);

// ============================================================================
// Spectral Integration
// ============================================================================

interface SpectralResult {
  code: string;
  path: string[];
  message: string;
  severity: number;  // 0=error, 1=warn, 2=info, 3=hint
  range: {
    start: { line: number; character: number };
    end: { line: number; character: number };
  };
  source: string;
}

/**
 * Find API schema files in the repository
 */
async function findSchemaFiles(repoPath: string, config: APISchemaScannerConfig): Promise<string[]> {
  const schemaFiles: string[] = [];

  // Common OpenAPI/AsyncAPI file patterns
  const patterns = [
    /openapi\.(ya?ml|json)$/i,
    /swagger\.(ya?ml|json)$/i,
    /asyncapi\.(ya?ml|json)$/i,
    /api-spec\.(ya?ml|json)$/i,
    /api\.(ya?ml|json)$/i
  ];

  // Directories likely to contain API specs
  const specDirs = ['docs', 'api', 'specs', 'openapi', 'swagger', 'schema', 'schemas'];

  async function searchDir(dir: string, depth = 0): Promise<void> {
    if (depth > 5) return;  // Limit recursion depth

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
          // Prioritize known spec directories
          if (specDirs.includes(entry.name.toLowerCase()) || depth < 2) {
            await searchDir(fullPath, depth + 1);
          }
        } else if (entry.isFile()) {
          // Check if file matches API spec patterns
          if (patterns.some(p => p.test(entry.name))) {
            schemaFiles.push(fullPath);
          } else if ((entry.name.endsWith('.yaml') || entry.name.endsWith('.yml') || entry.name.endsWith('.json'))) {
            // Quick check file content for OpenAPI/AsyncAPI markers
            try {
              const content = await fs.promises.readFile(fullPath, 'utf-8');
              const first500 = content.slice(0, 500).toLowerCase();
              if (
                first500.includes('openapi:') ||
                first500.includes('"openapi"') ||
                first500.includes('swagger:') ||
                first500.includes('"swagger"') ||
                first500.includes('asyncapi:') ||
                first500.includes('"asyncapi"')
              ) {
                schemaFiles.push(fullPath);
              }
            } catch {
              // Ignore read errors
            }
          }
        }
      }
    } catch {
      // Ignore directory access errors
    }
  }

  await searchDir(repoPath);
  return schemaFiles;
}

/**
 * Determine schema type from file content
 */
async function getSchemaType(filePath: string): Promise<'openapi' | 'asyncapi' | undefined> {
  try {
    const content = await fs.promises.readFile(filePath, 'utf-8');
    const first500 = content.slice(0, 500).toLowerCase();

    if (first500.includes('asyncapi:') || first500.includes('"asyncapi"')) {
      return 'asyncapi';
    }
    if (first500.includes('openapi:') || first500.includes('"openapi"') ||
        first500.includes('swagger:') || first500.includes('"swagger"')) {
      return 'openapi';
    }
  } catch {
    // Ignore errors
  }
  return undefined;
}

/**
 * Map Spectral severity to our severity levels
 */
function mapSeverity(spectralSeverity: number, ruleId: string): 'critical' | 'high' | 'medium' | 'low' {
  // Security rules get elevated severity
  if (SECURITY_RULES.has(ruleId)) {
    return spectralSeverity === 0 ? 'critical' : 'high';
  }

  // Standard mapping: 0=error, 1=warn, 2=info, 3=hint
  switch (spectralSeverity) {
    case 0: return 'high';
    case 1: return 'medium';
    case 2: return 'low';
    case 3: return 'low';
    default: return 'medium';
  }
}

/**
 * Determine issue category
 */
function getCategory(ruleId: string): 'api_design' | 'api_security' {
  if (SECURITY_RULES.has(ruleId) ||
      ruleId.includes('security') ||
      ruleId.includes('auth') ||
      ruleId.includes('owasp')) {
    return 'api_security';
  }
  return 'api_design';
}

/**
 * Run Spectral on a single file
 */
async function runSpectralOnFile(
  filePath: string,
  repoPath: string,
  config: APISchemaScannerConfig
): Promise<APISchemaIssue[]> {
  const issues: APISchemaIssue[] = [];

  try {
    // Build spectral command
    const rulesetArgs = config.rulesets?.map(r => `--ruleset ${r}`).join(' ') || '';
    const cmd = `spectral lint "${filePath}" --format json ${rulesetArgs}`;

    const { stdout, stderr } = await execAsync(cmd, {
      cwd: repoPath,
      maxBuffer: 10 * 1024 * 1024,  // 10MB buffer
      timeout: 60000  // 1 minute timeout
    });

    // Parse JSON output
    const results: SpectralResult[] = JSON.parse(stdout || '[]');
    const schemaType = await getSchemaType(filePath);
    const relativePath = path.relative(repoPath, filePath);

    for (const result of results) {
      issues.push({
        tool: 'spectral',
        file: relativePath,
        line: result.range.start.line + 1,  // Spectral uses 0-based lines
        column: result.range.start.character + 1,
        endLine: result.range.end.line + 1,
        endColumn: result.range.end.character + 1,
        ruleId: result.code,
        message: result.message,
        severity: mapSeverity(result.severity, result.code),
        category: getCategory(result.code),
        path: result.path,
        schemaType
      });
    }
  } catch (error: any) {
    // Spectral exits with non-zero for linting issues, which is fine
    if (error.stdout) {
      try {
        const results: SpectralResult[] = JSON.parse(error.stdout);
        const schemaType = await getSchemaType(filePath);
        const relativePath = path.relative(repoPath, filePath);

        for (const result of results) {
          issues.push({
            tool: 'spectral',
            file: relativePath,
            line: result.range.start.line + 1,
            column: result.range.start.character + 1,
            endLine: result.range.end.line + 1,
            endColumn: result.range.end.character + 1,
            ruleId: result.code,
            message: result.message,
            severity: mapSeverity(result.severity, result.code),
            category: getCategory(result.code),
            path: result.path,
            schemaType
          });
        }
      } catch {
        // JSON parse failed, ignore
      }
    }
  }

  return issues;
}

/**
 * Run Spectral API schema scanner
 */
export async function runSpectral(
  repoPath: string,
  config: Partial<APISchemaScannerConfig> = {}
): Promise<APISchemaScanResult> {
  const startTime = Date.now();
  const cfg = { ...DEFAULT_CONFIG, ...config };
  const allIssues: APISchemaIssue[] = [];

  try {
    // Check if spectral is available
    try {
      await execAsync('spectral --version');
    } catch {
      return {
        tool: 'spectral',
        issues: [],
        scanDuration: Date.now() - startTime,
        filesScanned: 0,
        schemaFiles: [],
        error: 'Spectral not installed. Install with: npm install -g @stoplight/spectral-cli'
      };
    }

    // Find schema files
    const schemaFiles = await findSchemaFiles(repoPath, cfg);

    if (schemaFiles.length === 0) {
      return {
        tool: 'spectral',
        issues: [],
        scanDuration: Date.now() - startTime,
        filesScanned: 0,
        schemaFiles: [],
        error: undefined  // Not an error - just no schema files found
      };
    }

    // Run Spectral on each file
    for (const file of schemaFiles) {
      const fileIssues = await runSpectralOnFile(file, repoPath, cfg);
      allIssues.push(...fileIssues);
    }

    return {
      tool: 'spectral',
      issues: allIssues,
      scanDuration: Date.now() - startTime,
      filesScanned: schemaFiles.length,
      schemaFiles: schemaFiles.map(f => path.relative(repoPath, f))
    };
  } catch (error: any) {
    return {
      tool: 'spectral',
      issues: allIssues,
      scanDuration: Date.now() - startTime,
      filesScanned: 0,
      schemaFiles: [],
      error: error.message || 'Unknown error during Spectral scan'
    };
  }
}

// ============================================================================
// Combined API Scanner (runs all API schema tools)
// ============================================================================

export interface CombinedAPIScanResult {
  spectral: APISchemaScanResult;
  totalIssues: number;
  totalDuration: number;
  schemaFilesFound: number;
}

/**
 * Run all API schema scanners
 * Currently just Spectral, but extensible for future tools
 */
export async function runAPISchemaScanner(
  repoPath: string,
  config: Partial<APISchemaScannerConfig> = {}
): Promise<CombinedAPIScanResult> {
  const startTime = Date.now();

  // Run Spectral
  const spectralResult = await runSpectral(repoPath, config);

  return {
    spectral: spectralResult,
    totalIssues: spectralResult.issues.length,
    totalDuration: Date.now() - startTime,
    schemaFilesFound: spectralResult.filesScanned
  };
}

// ============================================================================
// Exports
// ============================================================================

export {
  findSchemaFiles,
  getSchemaType,
  SECURITY_RULES
};
