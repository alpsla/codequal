/**
 * Host Native Tool Executor
 *
 * Executes analysis tools directly on the host (no Docker containers).
 * Designed for Oracle Cloud ARM64 instance with all tools pre-installed.
 *
 * Performance: 4-5 seconds per branch for typical analysis
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';

const execAsync = promisify(exec);

export interface ToolResult {
  tool: string;
  success: boolean;
  issues: Issue[];
  executionTime: number;
  raw?: string;
  error?: string;
}

export interface Issue {
  id: string;
  tool: string;
  type: string;
  category: 'security' | 'quality' | 'performance' | 'architecture' | 'dependency';
  severity: 'critical' | 'high' | 'medium' | 'low';
  message: string;
  file: string;
  line: number;
  column?: number;
  ruleId?: string;
}

export interface ToolConfig {
  name: string;
  command: string;
  parser: (output: string, repoPath: string) => Issue[];
  languages: string[];
  category: Issue['category'];
}

/**
 * Tool configurations for host-native execution
 * Paths based on Oracle Cloud ARM64 instance
 */
const TOOL_CONFIGS: Record<string, ToolConfig> = {
  // Security Tools
  semgrep: {
    name: 'semgrep',
    command: '/home/opc/.local/bin/semgrep scan --json --config auto',
    parser: parseSemgrepOutput,
    languages: ['java', 'python', 'javascript', 'typescript', 'go', 'ruby', 'php', 'rust'],
    category: 'security'
  },
  gitleaks: {
    name: 'gitleaks',
    command: 'gitleaks detect --report-format json --report-path /dev/stdout',
    parser: parseGitleaksOutput,
    languages: ['*'],
    category: 'security'
  },
  trivy: {
    name: 'trivy',
    command: 'trivy fs --format json --security-checks vuln,config',
    parser: parseTrivyOutput,
    languages: ['*'],
    category: 'security'
  },

  // Java Tools
  pmd: {
    name: 'pmd',
    command: 'pmd check -d . -R rulesets/java/quickstart.xml -f json',
    parser: parsePMDOutput,
    languages: ['java'],
    category: 'quality'
  },
  checkstyle: {
    name: 'checkstyle',
    command: '/usr/local/bin/checkstyle -c /google_checks.xml -f json .',
    parser: parseCheckstyleOutput,
    languages: ['java'],
    category: 'quality'
  },
  spotbugs: {
    name: 'spotbugs',
    command: 'spotbugs -textui -xml:withMessages -output /dev/stdout .',
    parser: parseSpotbugsOutput,
    languages: ['java'],
    category: 'quality'
  },
  'dependency-check': {
    name: 'dependency-check',
    command: '/home/opc/bin/dc-scan . --format JSON --out /dev/stdout',
    parser: parseDependencyCheckOutput,
    languages: ['java'],
    category: 'dependency'
  },

  // Python Tools
  ruff: {
    name: 'ruff',
    command: '/home/opc/.local/bin/ruff check --output-format json .',
    parser: parseRuffOutput,
    languages: ['python'],
    category: 'quality'
  },
  bandit: {
    name: 'bandit',
    command: 'bandit -r . -f json',
    parser: parseBanditOutput,
    languages: ['python'],
    category: 'security'
  },
  pylint: {
    name: 'pylint',
    command: 'pylint --output-format=json .',
    parser: parsePylintOutput,
    languages: ['python'],
    category: 'quality'
  },

  // JavaScript/TypeScript Tools
  eslint: {
    name: 'eslint',
    command: '/opt/codequal-tools/bin/eslint --format json .',
    parser: parseESLintOutput,
    languages: ['javascript', 'typescript'],
    category: 'quality'
  },
  biome: {
    name: 'biome',
    command: 'biome lint --reporter json .',
    parser: parseBiomeOutput,
    languages: ['javascript', 'typescript'],
    category: 'quality'
  },
  'npm-audit': {
    name: 'npm-audit',
    command: 'npm audit --json',
    parser: parseNpmAuditOutput,
    languages: ['javascript', 'typescript'],
    category: 'dependency'
  },

  // Go Tools
  'golangci-lint': {
    name: 'golangci-lint',
    command: 'golangci-lint run --out-format json',
    parser: parseGolangciLintOutput,
    languages: ['go'],
    category: 'quality'
  },
  gosec: {
    name: 'gosec',
    command: 'gosec -fmt json ./...',
    parser: parseGosecOutput,
    languages: ['go'],
    category: 'security'
  },

  // Ruby Tools
  rubocop: {
    name: 'rubocop',
    command: 'rubocop --format json',
    parser: parseRubocopOutput,
    languages: ['ruby'],
    category: 'quality'
  },
  brakeman: {
    name: 'brakeman',
    command: 'brakeman -f json -q',
    parser: parseBrakemanOutput,
    languages: ['ruby'],
    category: 'security'
  },

  // PHP Tools
  phpstan: {
    name: 'phpstan',
    command: 'phpstan analyse --error-format=json',
    parser: parsePhpstanOutput,
    languages: ['php'],
    category: 'quality'
  },

  // Rust Tools
  clippy: {
    name: 'clippy',
    command: 'cargo clippy --message-format=json 2>/dev/null',
    parser: parseClippyOutput,
    languages: ['rust'],
    category: 'quality'
  },
  'cargo-audit': {
    name: 'cargo-audit',
    command: 'cargo audit --json',
    parser: parseCargoAuditOutput,
    languages: ['rust'],
    category: 'dependency'
  }
};

/**
 * Get tools for a specific language
 */
export function getToolsForLanguage(language: string): string[] {
  const tools: string[] = [];

  for (const [toolName, config] of Object.entries(TOOL_CONFIGS)) {
    if (config.languages.includes(language) || config.languages.includes('*')) {
      tools.push(toolName);
    }
  }

  return tools;
}

/**
 * Execute a single tool on a repository
 */
export async function executeTool(
  toolName: string,
  repoPath: string,
  options?: { timeout?: number }
): Promise<ToolResult> {
  const config = TOOL_CONFIGS[toolName];
  if (!config) {
    return {
      tool: toolName,
      success: false,
      issues: [],
      executionTime: 0,
      error: `Unknown tool: ${toolName}`
    };
  }

  const startTime = Date.now();
  const timeout = options?.timeout || 60000; // 60 second default

  try {
    const { stdout, stderr } = await execAsync(
      config.command,
      {
        cwd: repoPath,
        maxBuffer: 50 * 1024 * 1024, // 50MB buffer
        timeout,
        env: {
          ...process.env,
          PATH: `/home/opc/.local/bin:/opt/codequal-tools/bin:${process.env.PATH}`
        }
      }
    );

    const issues = config.parser(stdout, repoPath);

    return {
      tool: toolName,
      success: true,
      issues,
      executionTime: Date.now() - startTime,
      raw: stdout.substring(0, 2000) // Truncate for logging
    };

  } catch (error: any) {
    // Many tools return non-zero exit code when issues are found
    // Check if we got output anyway
    if (error.stdout) {
      try {
        const issues = config.parser(error.stdout, repoPath);
        return {
          tool: toolName,
          success: true,
          issues,
          executionTime: Date.now() - startTime,
          raw: error.stdout.substring(0, 2000)
        };
      } catch (parseError) {
        // Parse failed, return original error
      }
    }

    return {
      tool: toolName,
      success: false,
      issues: [],
      executionTime: Date.now() - startTime,
      error: error.message || 'Tool execution failed'
    };
  }
}

/**
 * Execute multiple tools in parallel
 */
export async function executeToolsParallel(
  toolNames: string[],
  repoPath: string,
  options?: { timeout?: number; concurrency?: number }
): Promise<Map<string, ToolResult>> {
  const results = new Map<string, ToolResult>();
  const concurrency = options?.concurrency || 4;

  // Process in batches for controlled concurrency
  for (let i = 0; i < toolNames.length; i += concurrency) {
    const batch = toolNames.slice(i, i + concurrency);
    const batchResults = await Promise.all(
      batch.map(tool => executeTool(tool, repoPath, options))
    );

    batchResults.forEach((result, index) => {
      results.set(batch[index], result);
    });
  }

  return results;
}

/**
 * Execute all tools for a language on both branches
 */
export async function analyzeRepository(
  repoPath: string,
  language: string,
  options?: {
    baseBranch?: string;
    prBranch?: string;
    timeout?: number;
  }
): Promise<{
  main: Map<string, ToolResult>;
  pr: Map<string, ToolResult>;
  totalTime: number;
}> {
  const startTime = Date.now();
  const tools = getToolsForLanguage(language);
  const baseBranch = options?.baseBranch || 'main';
  const prBranch = options?.prBranch || 'HEAD';

  // Run analysis on main branch
  await execAsync(`git checkout ${baseBranch}`, { cwd: repoPath });
  const mainResults = await executeToolsParallel(tools, repoPath, options);

  // Run analysis on PR branch
  await execAsync(`git checkout ${prBranch}`, { cwd: repoPath });
  const prResults = await executeToolsParallel(tools, repoPath, options);

  return {
    main: mainResults,
    pr: prResults,
    totalTime: Date.now() - startTime
  };
}

// =============================================================================
// OUTPUT PARSERS
// =============================================================================

function parseSemgrepOutput(output: string, repoPath: string): Issue[] {
  try {
    const data = JSON.parse(output);
    return (data.results || []).map((r: any, i: number) => ({
      id: `semgrep-${i}-${Date.now()}`,
      tool: 'semgrep',
      type: r.check_id,
      category: 'security',
      severity: mapSeverity(r.extra?.severity || 'WARNING'),
      message: r.extra?.message || r.check_id,
      file: r.path,
      line: r.start?.line || 1,
      column: r.start?.col,
      ruleId: r.check_id
    }));
  } catch { return []; }
}

function parseGitleaksOutput(output: string, repoPath: string): Issue[] {
  try {
    const data = JSON.parse(output);
    return (data || []).map((r: any, i: number) => ({
      id: `gitleaks-${i}-${Date.now()}`,
      tool: 'gitleaks',
      type: r.RuleID,
      category: 'security',
      severity: 'critical' as const,
      message: `Secret detected: ${r.Description}`,
      file: r.File,
      line: r.StartLine || 1,
      ruleId: r.RuleID
    }));
  } catch { return []; }
}

function parseTrivyOutput(output: string, repoPath: string): Issue[] {
  try {
    const data = JSON.parse(output);
    const issues: Issue[] = [];
    for (const result of data.Results || []) {
      for (const vuln of result.Vulnerabilities || []) {
        issues.push({
          id: `trivy-${vuln.VulnerabilityID}-${Date.now()}`,
          tool: 'trivy',
          type: vuln.VulnerabilityID,
          category: 'dependency',
          severity: mapSeverity(vuln.Severity),
          message: vuln.Title || vuln.Description,
          file: result.Target,
          line: 1,
          ruleId: vuln.VulnerabilityID
        });
      }
    }
    return issues;
  } catch { return []; }
}

function parsePMDOutput(output: string, repoPath: string): Issue[] {
  try {
    const data = JSON.parse(output);
    const issues: Issue[] = [];
    for (const file of data.files || []) {
      for (const violation of file.violations || []) {
        issues.push({
          id: `pmd-${issues.length}-${Date.now()}`,
          tool: 'pmd',
          type: violation.rule,
          category: 'quality',
          severity: mapPMDPriority(violation.priority),
          message: violation.description,
          file: file.filename,
          line: violation.beginline,
          column: violation.begincolumn,
          ruleId: violation.rule
        });
      }
    }
    return issues;
  } catch { return []; }
}

function parseCheckstyleOutput(output: string, repoPath: string): Issue[] {
  try {
    const data = JSON.parse(output);
    const issues: Issue[] = [];
    for (const file of data.files || []) {
      for (const error of file.errors || []) {
        issues.push({
          id: `checkstyle-${issues.length}-${Date.now()}`,
          tool: 'checkstyle',
          type: error.source,
          category: 'quality',
          severity: mapSeverity(error.severity),
          message: error.message,
          file: file.name,
          line: error.line,
          column: error.column,
          ruleId: error.source
        });
      }
    }
    return issues;
  } catch { return []; }
}

function parseSpotbugsOutput(output: string, repoPath: string): Issue[] {
  // SpotBugs outputs XML - basic parsing
  const issues: Issue[] = [];
  const bugPattern = /<BugInstance[^>]*type="([^"]+)"[^>]*priority="(\d)"[^>]*>/g;
  let match;
  let i = 0;
  while ((match = bugPattern.exec(output)) !== null) {
    issues.push({
      id: `spotbugs-${i++}-${Date.now()}`,
      tool: 'spotbugs',
      type: match[1],
      category: 'quality',
      severity: mapSpotbugsPriority(match[2]),
      message: `SpotBugs: ${match[1]}`,
      file: 'unknown',
      line: 1,
      ruleId: match[1]
    });
  }
  return issues;
}

function parseDependencyCheckOutput(output: string, repoPath: string): Issue[] {
  try {
    const data = JSON.parse(output);
    const issues: Issue[] = [];
    for (const dep of data.dependencies || []) {
      for (const vuln of dep.vulnerabilities || []) {
        issues.push({
          id: `dc-${vuln.name}-${Date.now()}`,
          tool: 'dependency-check',
          type: vuln.name,
          category: 'dependency',
          severity: mapCVSS(vuln.cvssv3?.baseScore || vuln.cvssv2?.score || 0),
          message: vuln.description?.substring(0, 200) || vuln.name,
          file: dep.fileName,
          line: 1,
          ruleId: vuln.name
        });
      }
    }
    return issues;
  } catch { return []; }
}

function parseRuffOutput(output: string, repoPath: string): Issue[] {
  try {
    const data = JSON.parse(output);
    return data.map((r: any, i: number) => ({
      id: `ruff-${i}-${Date.now()}`,
      tool: 'ruff',
      type: r.code,
      category: 'quality',
      severity: 'medium' as const,
      message: r.message,
      file: r.filename,
      line: r.location?.row || 1,
      column: r.location?.column,
      ruleId: r.code
    }));
  } catch { return []; }
}

function parseBanditOutput(output: string, repoPath: string): Issue[] {
  try {
    const data = JSON.parse(output);
    return (data.results || []).map((r: any, i: number) => ({
      id: `bandit-${i}-${Date.now()}`,
      tool: 'bandit',
      type: r.test_id,
      category: 'security',
      severity: mapSeverity(r.issue_severity),
      message: r.issue_text,
      file: r.filename,
      line: r.line_number,
      ruleId: r.test_id
    }));
  } catch { return []; }
}

function parsePylintOutput(output: string, repoPath: string): Issue[] {
  try {
    const data = JSON.parse(output);
    return data.map((r: any, i: number) => ({
      id: `pylint-${i}-${Date.now()}`,
      tool: 'pylint',
      type: r.symbol,
      category: 'quality',
      severity: mapPylintType(r.type),
      message: r.message,
      file: r.path,
      line: r.line,
      column: r.column,
      ruleId: r.symbol
    }));
  } catch { return []; }
}

function parseESLintOutput(output: string, repoPath: string): Issue[] {
  try {
    const data = JSON.parse(output);
    const issues: Issue[] = [];
    for (const file of data) {
      for (const msg of file.messages || []) {
        issues.push({
          id: `eslint-${issues.length}-${Date.now()}`,
          tool: 'eslint',
          type: msg.ruleId,
          category: 'quality',
          severity: msg.severity === 2 ? 'high' : 'medium',
          message: msg.message,
          file: file.filePath,
          line: msg.line,
          column: msg.column,
          ruleId: msg.ruleId
        });
      }
    }
    return issues;
  } catch { return []; }
}

function parseBiomeOutput(output: string, repoPath: string): Issue[] {
  try {
    const data = JSON.parse(output);
    return (data.diagnostics || []).map((d: any, i: number) => ({
      id: `biome-${i}-${Date.now()}`,
      tool: 'biome',
      type: d.category,
      category: 'quality',
      severity: mapSeverity(d.severity),
      message: d.description,
      file: d.location?.path?.file || 'unknown',
      line: d.location?.span?.start?.line || 1,
      ruleId: d.category
    }));
  } catch { return []; }
}

function parseNpmAuditOutput(output: string, repoPath: string): Issue[] {
  try {
    const data = JSON.parse(output);
    const issues: Issue[] = [];
    for (const [name, vuln] of Object.entries(data.vulnerabilities || {})) {
      const v = vuln as any;
      issues.push({
        id: `npm-${name}-${Date.now()}`,
        tool: 'npm-audit',
        type: v.via?.[0]?.name || name,
        category: 'dependency',
        severity: mapSeverity(v.severity),
        message: v.via?.[0]?.title || `Vulnerability in ${name}`,
        file: 'package.json',
        line: 1,
        ruleId: v.via?.[0]?.name || name
      });
    }
    return issues;
  } catch { return []; }
}

function parseGolangciLintOutput(output: string, repoPath: string): Issue[] {
  try {
    const data = JSON.parse(output);
    return (data.Issues || []).map((i: any, idx: number) => ({
      id: `golangci-${idx}-${Date.now()}`,
      tool: 'golangci-lint',
      type: i.FromLinter,
      category: 'quality',
      severity: mapSeverity(i.Severity),
      message: i.Text,
      file: i.Pos?.Filename || 'unknown',
      line: i.Pos?.Line || 1,
      column: i.Pos?.Column,
      ruleId: i.FromLinter
    }));
  } catch { return []; }
}

function parseGosecOutput(output: string, repoPath: string): Issue[] {
  try {
    const data = JSON.parse(output);
    return (data.Issues || []).map((i: any, idx: number) => ({
      id: `gosec-${idx}-${Date.now()}`,
      tool: 'gosec',
      type: i.rule_id,
      category: 'security',
      severity: mapSeverity(i.severity),
      message: i.details,
      file: i.file,
      line: parseInt(i.line) || 1,
      column: parseInt(i.column),
      ruleId: i.rule_id
    }));
  } catch { return []; }
}

function parseRubocopOutput(output: string, repoPath: string): Issue[] {
  try {
    const data = JSON.parse(output);
    const issues: Issue[] = [];
    for (const file of data.files || []) {
      for (const offense of file.offenses || []) {
        issues.push({
          id: `rubocop-${issues.length}-${Date.now()}`,
          tool: 'rubocop',
          type: offense.cop_name,
          category: 'quality',
          severity: mapSeverity(offense.severity),
          message: offense.message,
          file: file.path,
          line: offense.location?.start_line || 1,
          column: offense.location?.start_column,
          ruleId: offense.cop_name
        });
      }
    }
    return issues;
  } catch { return []; }
}

function parseBrakemanOutput(output: string, repoPath: string): Issue[] {
  try {
    const data = JSON.parse(output);
    return (data.warnings || []).map((w: any, i: number) => ({
      id: `brakeman-${i}-${Date.now()}`,
      tool: 'brakeman',
      type: w.warning_type,
      category: 'security',
      severity: mapBrakemanConfidence(w.confidence),
      message: w.message,
      file: w.file,
      line: w.line || 1,
      ruleId: w.warning_type
    }));
  } catch { return []; }
}

function parsePhpstanOutput(output: string, repoPath: string): Issue[] {
  try {
    const data = JSON.parse(output);
    const issues: Issue[] = [];
    for (const [file, errors] of Object.entries(data.files || {})) {
      for (const err of (errors as any).messages || []) {
        issues.push({
          id: `phpstan-${issues.length}-${Date.now()}`,
          tool: 'phpstan',
          type: 'phpstan',
          category: 'quality',
          severity: 'medium',
          message: err.message,
          file: file,
          line: err.line || 1,
          ruleId: 'phpstan'
        });
      }
    }
    return issues;
  } catch { return []; }
}

function parseClippyOutput(output: string, repoPath: string): Issue[] {
  const issues: Issue[] = [];
  const lines = output.split('\n');
  for (const line of lines) {
    try {
      const data = JSON.parse(line);
      if (data.reason === 'compiler-message' && data.message?.code?.code) {
        issues.push({
          id: `clippy-${issues.length}-${Date.now()}`,
          tool: 'clippy',
          type: data.message.code.code,
          category: 'quality',
          severity: mapClippyLevel(data.message.level),
          message: data.message.message,
          file: data.message.spans?.[0]?.file_name || 'unknown',
          line: data.message.spans?.[0]?.line_start || 1,
          ruleId: data.message.code.code
        });
      }
    } catch { /* Ignore non-JSON lines */ }
  }
  return issues;
}

function parseCargoAuditOutput(output: string, repoPath: string): Issue[] {
  try {
    const data = JSON.parse(output);
    return (data.vulnerabilities?.list || []).map((v: any, i: number) => ({
      id: `cargo-audit-${i}-${Date.now()}`,
      tool: 'cargo-audit',
      type: v.advisory?.id,
      category: 'dependency',
      severity: mapSeverity(v.advisory?.severity),
      message: v.advisory?.title || v.advisory?.description,
      file: 'Cargo.toml',
      line: 1,
      ruleId: v.advisory?.id
    }));
  } catch { return []; }
}

// =============================================================================
// SEVERITY MAPPERS
// =============================================================================

function mapSeverity(severity: string): Issue['severity'] {
  const s = (severity || '').toUpperCase();
  if (s === 'CRITICAL' || s === 'ERROR') return 'critical';
  if (s === 'HIGH' || s === 'WARNING' || s === 'MAJOR') return 'high';
  if (s === 'MEDIUM' || s === 'MODERATE' || s === 'MINOR') return 'medium';
  return 'low';
}

function mapPMDPriority(priority: number): Issue['severity'] {
  if (priority === 1) return 'critical';
  if (priority === 2) return 'high';
  if (priority === 3) return 'medium';
  return 'low';
}

function mapSpotbugsPriority(priority: string): Issue['severity'] {
  const p = parseInt(priority);
  if (p === 1) return 'high';
  if (p === 2) return 'medium';
  return 'low';
}

function mapCVSS(score: number): Issue['severity'] {
  if (score >= 9.0) return 'critical';
  if (score >= 7.0) return 'high';
  if (score >= 4.0) return 'medium';
  return 'low';
}

function mapPylintType(type: string): Issue['severity'] {
  if (type === 'error' || type === 'fatal') return 'high';
  if (type === 'warning') return 'medium';
  return 'low';
}

function mapBrakemanConfidence(confidence: string): Issue['severity'] {
  if (confidence === 'High') return 'high';
  if (confidence === 'Medium') return 'medium';
  return 'low';
}

function mapClippyLevel(level: string): Issue['severity'] {
  if (level === 'error') return 'high';
  if (level === 'warning') return 'medium';
  return 'low';
}

export default {
  executeTool,
  executeToolsParallel,
  analyzeRepository,
  getToolsForLanguage,
  TOOL_CONFIGS
};
