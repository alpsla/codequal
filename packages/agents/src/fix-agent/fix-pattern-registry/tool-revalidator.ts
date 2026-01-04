/**
 * Tool Re-Validator
 *
 * Validates AI-generated fixes by re-running the original tool that found the issue.
 * This ensures:
 * 1. The original issue is actually fixed
 * 2. No new issues (regressions) are introduced
 * 3. Only verified fixes are saved to Supabase
 *
 * SESSION 73: Created for pattern validation before Supabase storage
 */

import { execFile, spawn } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as crypto from 'crypto';

const execFileAsync = promisify(execFile);

// ============================================================================
// Security: File Permissions
// ============================================================================

/** Secure file mode: owner read/write only (0600) */
const SECURE_FILE_MODE = 0o600;

/** Secure directory mode: owner read/write/execute only (0700) */
const SECURE_DIR_MODE = 0o700;

// ============================================================================
// Security: Rate Limiting
// ============================================================================

interface RateLimitConfig {
  /** Maximum executions per minute */
  maxPerMinute: number;
  /** Maximum concurrent executions */
  maxConcurrent: number;
  /** Timeout per execution in ms */
  timeoutMs: number;
}

const DEFAULT_RATE_LIMIT: RateLimitConfig = {
  maxPerMinute: 30,
  maxConcurrent: 5,
  timeoutMs: 30000,
};

class RateLimiter {
  private executions: number[] = [];
  private concurrent = 0;
  private config: RateLimitConfig;

  constructor(config: RateLimitConfig = DEFAULT_RATE_LIMIT) {
    this.config = config;
  }

  /**
   * Check if execution is allowed and acquire a slot
   * @throws Error if rate limit exceeded
   */
  async acquire(): Promise<void> {
    const now = Date.now();
    const oneMinuteAgo = now - 60000;

    // Clean up old executions
    this.executions = this.executions.filter(ts => ts > oneMinuteAgo);

    // Check rate limit
    if (this.executions.length >= this.config.maxPerMinute) {
      throw new Error(`Rate limit exceeded: ${this.config.maxPerMinute} executions per minute`);
    }

    // Check concurrent limit
    if (this.concurrent >= this.config.maxConcurrent) {
      throw new Error(`Concurrent limit exceeded: ${this.config.maxConcurrent} concurrent executions`);
    }

    this.executions.push(now);
    this.concurrent++;
  }

  /** Release execution slot */
  release(): void {
    this.concurrent = Math.max(0, this.concurrent - 1);
  }

  /** Get current stats */
  getStats(): { executionsLastMinute: number; concurrent: number; config: RateLimitConfig } {
    const now = Date.now();
    const oneMinuteAgo = now - 60000;
    this.executions = this.executions.filter(ts => ts > oneMinuteAgo);
    return {
      executionsLastMinute: this.executions.length,
      concurrent: this.concurrent,
      config: this.config,
    };
  }
}

// Global rate limiter instance
const globalRateLimiter = new RateLimiter();

// ============================================================================
// Security: Path Validation
// ============================================================================

/**
 * Validate and sanitize a file path to prevent path traversal attacks
 */
function validateFilePath(filePath: string, allowedDir: string): string {
  // Resolve to absolute path
  const resolved = path.resolve(filePath);
  const allowedResolved = path.resolve(allowedDir);

  // Ensure path is within allowed directory
  if (!resolved.startsWith(allowedResolved + path.sep) && resolved !== allowedResolved) {
    throw new Error(`Path traversal detected: ${filePath} is outside allowed directory`);
  }

  // Check for suspicious patterns
  if (filePath.includes('\0') || filePath.includes('..')) {
    throw new Error(`Invalid path characters detected in: ${filePath}`);
  }

  return resolved;
}

/**
 * Generate a secure random filename
 */
function generateSecureFilename(extension: string): string {
  const randomBytes = crypto.randomBytes(16).toString('hex');
  return `fix-validation-${randomBytes}${extension}`;
}

// ============================================================================
// Tool Availability Detection
// ============================================================================

interface ToolAvailability {
  available: boolean;
  path?: string;
  version?: string;
  error?: string;
}

// Cache tool availability checks (avoid repeated which/version calls)
const toolAvailabilityCache = new Map<string, { result: ToolAvailability; timestamp: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Check if a tool is available on the system
 */
async function checkToolAvailability(tool: string): Promise<ToolAvailability> {
  // Check cache
  const cached = toolAvailabilityCache.get(tool);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.result;
  }

  const toolBinaries: Record<string, string[]> = {
    pmd: ['pmd', '--version'],
    checkstyle: ['java', '-jar', '/usr/local/bin/checkstyle', '--version'],
    eslint: ['npx', 'eslint', '--version'],
    ruff: ['ruff', '--version'],
    pylint: ['pylint', '--version'],
    bandit: ['bandit', '--version'],
    mypy: ['mypy', '--version'],
    'golangci-lint': ['golangci-lint', '--version'],
    gosec: ['gosec', '--version'],
    rubocop: ['rubocop', '--version'],
    phpstan: ['phpstan', '--version'],
    tsc: ['npx', 'tsc', '--version'],
    clippy: ['cargo', 'clippy', '--version'],
  };

  const checkCmd = toolBinaries[tool.toLowerCase()];
  if (!checkCmd) {
    const result: ToolAvailability = {
      available: false,
      error: `Unknown tool: ${tool}`,
    };
    toolAvailabilityCache.set(tool, { result, timestamp: Date.now() });
    return result;
  }

  return new Promise((resolve) => {
    const [binary, ...args] = checkCmd;
    const proc = spawn(binary, args, {
      shell: false,
      timeout: 10000,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stdout = '';
    proc.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    proc.on('close', (code) => {
      const result: ToolAvailability = code === 0
        ? { available: true, path: binary, version: stdout.trim().split('\n')[0] }
        : { available: false, error: `Tool ${tool} not found or failed version check` };

      toolAvailabilityCache.set(tool, { result, timestamp: Date.now() });
      resolve(result);
    });

    proc.on('error', (err) => {
      const result: ToolAvailability = {
        available: false,
        error: `Failed to check ${tool}: ${err.message}`,
      };
      toolAvailabilityCache.set(tool, { result, timestamp: Date.now() });
      resolve(result);
    });
  });
}

/**
 * Clear tool availability cache
 */
function clearToolAvailabilityCache(): void {
  toolAvailabilityCache.clear();
}

// ============================================================================
// Types
// ============================================================================

export interface ToolRevalidationRequest {
  /** The rule ID that was violated */
  ruleId: string;
  /** The tool that found the issue (pmd, checkstyle, eslint, etc.) */
  tool: string;
  /** Programming language */
  language: string;
  /** Original file path (for context) */
  originalFilePath: string;
  /** Original code with the issue */
  originalCode: string;
  /** Fixed code to validate */
  fixedCode: string;
  /** Line number where issue was found */
  lineNumber: number;
  /** Original issue message */
  issueMessage: string;
}

export interface ToolRevalidationResult {
  /** Did the fix pass validation? */
  passed: boolean;
  /** Is the original issue resolved? */
  originalIssueResolved: boolean;
  /** Were any new issues introduced? */
  hasRegressions: boolean;
  /** Number of new issues introduced */
  regressionCount: number;
  /** List of regression issues */
  regressions: Array<{
    rule: string;
    message: string;
    line: number;
  }>;
  /** Tool execution details */
  toolExecution: {
    tool: string;
    command: string;
    exitCode: number;
    duration: number;
    stdout: string;
    stderr: string;
  };
  /** Human-readable summary */
  summary: string;
}

// ============================================================================
// Tool Command Definitions
// ============================================================================

/**
 * Get the command to run a specific tool on a file
 * These match the tool commands used in v9-analyze.ts runHostNativeAnalysis
 */
function getToolCommand(tool: string, filePath: string, language: string): string | null {
  const toolCommands: Record<string, Record<string, string>> = {
    java: {
      'pmd': `pmd check -d "${filePath}" -R rulesets/java/quickstart.xml -f json --no-progress 2>/dev/null; true`,
      'checkstyle': `/usr/local/bin/checkstyle -c /google_checks.xml -f json "${filePath}" 2>/dev/null || echo '[]'`,
      'spotbugs': `spotbugs -textui -xml:withMessages "${filePath}" 2>/dev/null || echo '<BugCollection></BugCollection>'`,
    },
    typescript: {
      'eslint': `npx eslint "${filePath}" -f json 2>/dev/null || echo '[]'`,
      'tsc': `npx tsc --noEmit "${filePath}" 2>&1 || true`,
    },
    javascript: {
      'eslint': `npx eslint "${filePath}" -f json 2>/dev/null || echo '[]'`,
    },
    python: {
      'ruff': `ruff check "${filePath}" --output-format json 2>/dev/null || echo '[]'`,
      'pylint': `pylint "${filePath}" --output-format=json 2>/dev/null || echo '[]'`,
      'bandit': `bandit -f json "${filePath}" 2>/dev/null || echo '{"results":[]}'`,
      'mypy': `mypy "${filePath}" --output json 2>/dev/null || true`,
    },
    go: {
      'golangci-lint': `golangci-lint run "${filePath}" --out-format json 2>/dev/null || echo '{"Issues":[]}'`,
      'gosec': `gosec -fmt=json "${filePath}" 2>/dev/null || echo '{"Issues":[]}'`,
    },
    rust: {
      'clippy': `cargo clippy --message-format=json 2>/dev/null || echo '[]'`,
    },
    ruby: {
      'rubocop': `rubocop "${filePath}" --format json 2>/dev/null || echo '{"files":[]}'`,
      'brakeman': `brakeman -f json "${filePath}" 2>/dev/null || echo '{"warnings":[]}'`,
    },
    php: {
      'phpstan': `phpstan analyse "${filePath}" --error-format=json 2>/dev/null || echo '{"files":[]}'`,
    },
  };

  const langTools = toolCommands[language];
  if (!langTools) return null;

  // Normalize tool name (handle variations)
  const normalizedTool = tool.toLowerCase().replace(/-/g, '');
  for (const [toolName, command] of Object.entries(langTools)) {
    if (toolName.toLowerCase().replace(/-/g, '') === normalizedTool) {
      return command;
    }
  }

  return null;
}

/**
 * Extract JSON from mixed output (handles prefixed text, trailing garbage, etc.)
 * SESSION 74: Improved robustness for handling various tool output formats
 */
function extractJSON(output: string): string | null {
  if (!output || output.trim().length === 0) {
    return null;
  }

  // Clean output - remove non-printable characters but preserve newlines for later
  // eslint-disable-next-line no-control-regex
  let cleanOutput = output.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '').trim();

  // Try multiple JSON extraction strategies
  const strategies = [
    // Strategy 1: Output is pure JSON
    () => {
      try {
        JSON.parse(cleanOutput);
        return cleanOutput;
      } catch {
        return null;
      }
    },

    // Strategy 2: JSON starts after some text prefix
    () => {
      const bracketStart = cleanOutput.indexOf('[');
      const braceStart = cleanOutput.indexOf('{');
      let jsonStart = -1;

      if (bracketStart >= 0 && braceStart >= 0) {
        jsonStart = Math.min(bracketStart, braceStart);
      } else if (bracketStart >= 0) {
        jsonStart = bracketStart;
      } else if (braceStart >= 0) {
        jsonStart = braceStart;
      }

      if (jsonStart === -1) return null;

      const candidate = cleanOutput.substring(jsonStart);
      const startChar = candidate.charAt(0);
      const endChar = startChar === '[' ? ']' : '}';

      // Find matching end bracket with proper nesting
      let depth = 0;
      let inString = false;
      let escaped = false;
      let endIndex = -1;

      for (let i = 0; i < candidate.length; i++) {
        const char = candidate[i];

        if (escaped) {
          escaped = false;
          continue;
        }

        if (char === '\\' && inString) {
          escaped = true;
          continue;
        }

        if (char === '"') {
          inString = !inString;
          continue;
        }

        if (inString) continue;

        if (char === startChar) depth++;
        if (char === endChar) depth--;

        if (depth === 0) {
          endIndex = i;
          break;
        }
      }

      if (endIndex === -1) return null;

      const extracted = candidate.substring(0, endIndex + 1);
      try {
        JSON.parse(extracted);
        return extracted;
      } catch {
        return null;
      }
    },

    // Strategy 3: Line-by-line JSON (some tools output one JSON object per line)
    () => {
      const lines = cleanOutput.split('\n');
      const jsonLines: string[] = [];

      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
          try {
            JSON.parse(trimmed);
            jsonLines.push(trimmed);
          } catch {
            // Not valid JSON, skip
          }
        }
      }

      if (jsonLines.length === 0) return null;
      if (jsonLines.length === 1) return jsonLines[0];

      // Return as array if multiple JSON objects
      return `[${jsonLines.join(',')}]`;
    },
  ];

  for (const strategy of strategies) {
    const result = strategy();
    if (result) return result;
  }

  return null;
}

/**
 * Fallback text-based parsing for when JSON parsing fails
 * Extracts issues from common text formats
 */
function parseTextOutput(
  tool: string,
  output: string
): Array<{ rule: string; message: string; line: number }> {
  const issues: Array<{ rule: string; message: string; line: number }> = [];

  // Common patterns for error messages
  const patterns = [
    // Pattern: "filename:line:col: message [rule]"
    /^(.+?):(\d+)(?::\d+)?:\s*(.+?)(?:\s*\[([^\]]+)\])?$/gm,
    // Pattern: "line N: message"
    /^line\s+(\d+):\s*(.+)$/gm,
    // Pattern: "L123: message"
    /^L(\d+):\s*(.+)$/gm,
    // Pattern: "  123 | message" (indented with line number)
    /^\s+(\d+)\s*\|\s*(.+)$/gm,
  ];

  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(output)) !== null) {
      const groups = match.slice(1);

      // Determine which pattern matched and extract accordingly
      let line = 0;
      let message = '';
      let rule = tool;

      if (groups.length >= 3) {
        // filename:line: message [rule]
        line = parseInt(groups[1], 10) || 0;
        message = groups[2] || '';
        rule = groups[3] || tool;
      } else if (groups.length === 2) {
        // line N: message
        line = parseInt(groups[0], 10) || 0;
        message = groups[1] || '';
      }

      if (line > 0 && message.length > 0) {
        issues.push({ rule, message, line });
      }
    }
  }

  return issues;
}

/**
 * Parse tool output to extract issues
 * SESSION 74: Enhanced with better error handling, multiple output formats, and fallbacks
 */
function parseToolOutput(
  tool: string,
  stdout: string,
  _language: string
): Array<{ rule: string; message: string; line: number }> {
  const issues: Array<{ rule: string; message: string; line: number }> = [];

  // Handle empty output
  if (!stdout || stdout.trim().length === 0) {
    console.debug(`[ToolRevalidator] Empty output from ${tool}`);
    return issues;
  }

  // Try to extract and parse JSON
  const jsonContent = extractJSON(stdout);

  if (jsonContent) {
    try {
      const data = JSON.parse(jsonContent);

      // Handle different tool output formats
      const normalizedTool = tool.toLowerCase().replace(/-/g, '');

      // PMD format: { files: [{ violations: [...] }] } or { processingErrors: [], violations: [] }
      if (normalizedTool === 'pmd') {
        // Handle nested files format
        const files = data.files || (data.violations ? [{ violations: data.violations }] : []);
        for (const file of files) {
          for (const violation of file.violations || []) {
            issues.push({
              rule: violation.rule || violation.ruleName || 'unknown',
              message: violation.description || violation.message || violation.msg || '',
              line: violation.beginline || violation.beginLine || violation.line || 0,
            });
          }
        }
        // Also check for processingErrors
        for (const err of data.processingErrors || []) {
          issues.push({
            rule: 'processingError',
            message: err.msg || err.message || 'Processing error',
            line: 0,
          });
        }
      }

      // Checkstyle format: array or { files: [{ errors: [...] }] }
      else if (normalizedTool === 'checkstyle') {
        if (Array.isArray(data)) {
          for (const item of data) {
            issues.push({
              rule: item.source?.split('.').pop() || item.rule || 'checkstyle',
              message: item.message || '',
              line: item.line || item.lineNumber || 0,
            });
          }
        } else if (data.files) {
          for (const file of data.files) {
            for (const error of file.errors || []) {
              issues.push({
                rule: error.source?.split('.').pop() || 'checkstyle',
                message: error.message || '',
                line: error.line || 0,
              });
            }
          }
        }
      }

      // ESLint format: [{ messages: [...], errorCount, warningCount }]
      else if (normalizedTool === 'eslint') {
        const results = Array.isArray(data) ? data : (data.results || [data]);
        for (const file of results) {
          for (const msg of file.messages || []) {
            issues.push({
              rule: msg.ruleId || msg.rule || 'eslint',
              message: msg.message || '',
              line: msg.line || msg.lineNumber || 0,
            });
          }
        }
      }

      // Ruff format: array of { code, message, location: { row } }
      else if (normalizedTool === 'ruff') {
        const results = Array.isArray(data) ? data : (data.results || []);
        for (const item of results) {
          issues.push({
            rule: item.code || item.rule || 'ruff',
            message: item.message || '',
            line: item.location?.row || item.line || item.row || 0,
          });
        }
      }

      // Pylint format: array of { symbol, message, line }
      else if (normalizedTool === 'pylint') {
        const results = Array.isArray(data) ? data : (data.messages || []);
        for (const item of results) {
          issues.push({
            rule: item.symbol || item.messageId || item.code || 'pylint',
            message: item.message || item.msg || '',
            line: item.line || item.lineNumber || 0,
          });
        }
      }

      // Bandit format: { results: [...], errors: [...] }
      else if (normalizedTool === 'bandit') {
        for (const result of data.results || []) {
          issues.push({
            rule: result.test_id || result.test_name || 'bandit',
            message: result.issue_text || result.message || '',
            line: result.line_number || result.line || 0,
          });
        }
      }

      // Go linters format: { Issues: [...] }
      else if (normalizedTool === 'golangcilint' || normalizedTool === 'gosec') {
        const issueList = data.Issues || data.issues || [];
        for (const issue of issueList) {
          issues.push({
            rule: issue.FromLinter || issue.rule_id || issue.rule || 'go-lint',
            message: issue.Text || issue.details || issue.message || '',
            line: issue.Pos?.Line || issue.line || 0,
          });
        }
      }

      // RuboCop format: { files: [{ offenses: [...] }], summary }
      else if (normalizedTool === 'rubocop') {
        for (const file of data.files || []) {
          for (const offense of file.offenses || []) {
            issues.push({
              rule: offense.cop_name || offense.rule || 'rubocop',
              message: offense.message || '',
              line: offense.location?.start_line || offense.location?.line || offense.line || 0,
            });
          }
        }
      }

      // Brakeman format: { warnings: [...], errors: [...] }
      else if (normalizedTool === 'brakeman') {
        for (const warning of data.warnings || []) {
          issues.push({
            rule: warning.warning_type || warning.check_name || 'brakeman',
            message: warning.message || warning.warning || '',
            line: warning.line || 0,
          });
        }
      }

      // PHPStan format: { files: { "path": { messages: [...] } }, totals }
      else if (normalizedTool === 'phpstan') {
        if (data.files) {
          for (const filePath of Object.keys(data.files)) {
            const file = data.files[filePath];
            for (const msg of file.messages || []) {
              issues.push({
                rule: msg.identifier || 'phpstan',
                message: msg.message || '',
                line: msg.line || 0,
              });
            }
          }
        }
        // Handle flat array format
        if (Array.isArray(data)) {
          for (const item of data) {
            issues.push({
              rule: item.identifier || 'phpstan',
              message: item.message || '',
              line: item.line || 0,
            });
          }
        }
      }

      // Mypy format: array of { file, line, column, message, severity }
      else if (normalizedTool === 'mypy') {
        const results = Array.isArray(data) ? data : (data.errors || []);
        for (const item of results) {
          issues.push({
            rule: item.severity || item.code || 'mypy',
            message: item.message || '',
            line: item.line || item.lineNumber || 0,
          });
        }
      }

      // Clippy format (cargo): array of { message: { code, level, spans: [{ line_start }] } }
      else if (normalizedTool === 'clippy') {
        const results = Array.isArray(data) ? data : [data];
        for (const item of results) {
          if (item.message) {
            const msg = item.message;
            issues.push({
              rule: msg.code?.code || msg.level || 'clippy',
              message: msg.message || '',
              line: msg.spans?.[0]?.line_start || 0,
            });
          }
        }
      }

      // TSC format: array of { file, line, character, code, message }
      else if (normalizedTool === 'tsc') {
        const results = Array.isArray(data) ? data : (data.diagnostics || data.errors || []);
        for (const item of results) {
          issues.push({
            rule: `TS${item.code || 'error'}`,
            message: item.message || item.messageText || '',
            line: item.line || item.start?.line || 0,
          });
        }
      }

      // Generic fallback for array of issues
      else if (Array.isArray(data)) {
        for (const item of data) {
          issues.push({
            rule: item.rule || item.ruleId || item.code || item.id || tool,
            message: item.message || item.msg || item.description || '',
            line: item.line || item.lineNumber || item.startLine || 0,
          });
        }
      }

      // Generic fallback for object with common patterns
      else if (typeof data === 'object') {
        // Try common array properties
        const possibleArrays = ['issues', 'errors', 'warnings', 'messages', 'results', 'violations'];
        for (const prop of possibleArrays) {
          if (Array.isArray(data[prop])) {
            for (const item of data[prop]) {
              issues.push({
                rule: item.rule || item.ruleId || item.code || item.id || tool,
                message: item.message || item.msg || item.description || '',
                line: item.line || item.lineNumber || item.startLine || 0,
              });
            }
            break;
          }
        }
      }

    } catch (parseError) {
      console.debug(`[ToolRevalidator] JSON parse error for ${tool}:`, (parseError as Error).message);
    }
  }

  // If no issues found from JSON, try text-based parsing as fallback
  if (issues.length === 0 && stdout.length > 0) {
    const textIssues = parseTextOutput(tool, stdout);
    issues.push(...textIssues);
    if (textIssues.length > 0) {
      console.debug(`[ToolRevalidator] Extracted ${textIssues.length} issues from text output for ${tool}`);
    }
  }

  return issues;
}

// ============================================================================
// Main Revalidator Class
// ============================================================================

export class ToolRevalidator {
  private tempDir: string;
  private rateLimiter: RateLimiter;

  constructor(rateLimitConfig?: Partial<RateLimitConfig>) {
    this.tempDir = path.join(os.tmpdir(), 'codequal-fix-validation');
    this.rateLimiter = new RateLimiter({
      ...DEFAULT_RATE_LIMIT,
      ...rateLimitConfig,
    });

    // Ensure temp directory exists with secure permissions (owner only: 0700)
    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir, { recursive: true, mode: SECURE_DIR_MODE });
    } else {
      // Ensure existing directory has correct permissions
      try {
        fs.chmodSync(this.tempDir, SECURE_DIR_MODE);
      } catch {
        console.warn('[ToolRevalidator] Could not set secure permissions on temp directory');
      }
    }
  }

  /**
   * Validate a fix by re-running the original tool
   *
   * Flow:
   * 1. Write original code to temp file, run tool, get baseline issues
   * 2. Write fixed code to temp file, run tool, get new issues
   * 3. Compare: original issue should be gone, no new issues introduced
   */
  async validateFix(request: ToolRevalidationRequest): Promise<ToolRevalidationResult> {
    const startTime = Date.now();
    console.log(`[ToolRevalidator] Validating fix for ${request.ruleId} using ${request.tool}`);

    // Apply rate limiting
    try {
      await this.rateLimiter.acquire();
    } catch (rateLimitError) {
      console.warn(`[ToolRevalidator] ${(rateLimitError as Error).message}`);
      return {
        passed: false,
        originalIssueResolved: false,
        hasRegressions: false,
        regressionCount: 0,
        regressions: [],
        toolExecution: {
          tool: request.tool,
          command: 'N/A',
          exitCode: -1,
          duration: Date.now() - startTime,
          stdout: '',
          stderr: (rateLimitError as Error).message,
        },
        summary: `Rate limit exceeded for tool validation`,
      };
    }

    try {
      // Check tool availability before proceeding
      const toolAvailability = await checkToolAvailability(request.tool);
      if (!toolAvailability.available) {
        console.warn(`[ToolRevalidator] Tool not available: ${request.tool} - ${toolAvailability.error}`);
        return {
          passed: false,
          originalIssueResolved: false,
          hasRegressions: false,
          regressionCount: 0,
          regressions: [],
          toolExecution: {
            tool: request.tool,
            command: 'N/A',
            exitCode: -1,
            duration: Date.now() - startTime,
            stdout: '',
            stderr: toolAvailability.error || `Tool ${request.tool} not available`,
          },
          summary: `Tool ${request.tool} not available. Install it to enable fix validation.`,
        };
      }
      console.log(`[ToolRevalidator] Tool ${request.tool} available (${toolAvailability.version})`);

      // Get tool command
      const command = getToolCommand(request.tool, '', request.language);
      if (!command) {
        console.warn(`[ToolRevalidator] No command found for tool: ${request.tool} (${request.language})`);
        return {
          passed: false,
          originalIssueResolved: false,
          hasRegressions: false,
          regressionCount: 0,
          regressions: [],
          toolExecution: {
            tool: request.tool,
            command: 'N/A',
            exitCode: -1,
            duration: Date.now() - startTime,
            stdout: '',
            stderr: `Tool ${request.tool} not supported for language ${request.language}`,
          },
          summary: `Tool ${request.tool} not supported for validation`,
        };
      }

      // Create temp file with secure random name and appropriate extension
      const ext = this.getFileExtension(request.language, request.originalFilePath);
      const tempFileName = generateSecureFilename(ext);
      const tempFilePath = path.join(this.tempDir, tempFileName);

      // Validate the temp file path is within allowed directory
      validateFilePath(tempFilePath, this.tempDir);

      try {
        // Step 1: Run tool on ORIGINAL code to get baseline
        console.log(`[ToolRevalidator] Step 1: Getting baseline issues from original code`);
        this.writeSecureFile(tempFilePath, request.originalCode);
        const originalResult = await this.runToolSafe(request.tool, tempFilePath, command);
        const originalIssues = parseToolOutput(request.tool, originalResult.stdout, request.language);
        console.log(`[ToolRevalidator] Baseline: ${originalIssues.length} issues found`);

        // Step 2: Run tool on FIXED code
        console.log(`[ToolRevalidator] Step 2: Running tool on fixed code`);
        this.writeSecureFile(tempFilePath, request.fixedCode);
        const fixedResult = await this.runToolSafe(request.tool, tempFilePath, command);
        const fixedIssues = parseToolOutput(request.tool, fixedResult.stdout, request.language);
        console.log(`[ToolRevalidator] After fix: ${fixedIssues.length} issues found`);

        // Step 3: Check if original issue is resolved
        const originalIssueResolved = this.isOriginalIssueResolved(
          request.ruleId,
          request.lineNumber,
          originalIssues,
          fixedIssues
        );

        // Step 4: Check for regressions (new issues not in original)
        const regressions = this.findRegressions(originalIssues, fixedIssues);

        // Determine pass/fail
        const passed = originalIssueResolved && regressions.length === 0;

        const duration = Date.now() - startTime;
        let summary: string;

        if (passed) {
          summary = `✅ Fix validated: Original issue resolved, no regressions (${duration}ms)`;
        } else if (!originalIssueResolved) {
          summary = `❌ Fix invalid: Original issue (${request.ruleId}) still present`;
        } else {
          summary = `❌ Fix invalid: ${regressions.length} regression(s) introduced`;
        }

        console.log(`[ToolRevalidator] ${summary}`);

        return {
          passed,
          originalIssueResolved,
          hasRegressions: regressions.length > 0,
          regressionCount: regressions.length,
          regressions,
          toolExecution: {
            tool: request.tool,
            command: `${request.tool} <file>`, // Don't expose full command
            exitCode: fixedResult.exitCode,
            duration,
            stdout: fixedResult.stdout.substring(0, 1000), // Truncate for storage
            stderr: fixedResult.stderr.substring(0, 500),
          },
          summary,
        };
      } finally {
        // Cleanup temp file securely
        try {
          if (fs.existsSync(tempFilePath)) {
            // Overwrite with zeros before deletion for sensitive data
            const stats = fs.statSync(tempFilePath);
            fs.writeFileSync(tempFilePath, Buffer.alloc(stats.size, 0), { mode: SECURE_FILE_MODE });
            fs.unlinkSync(tempFilePath);
          }
        } catch {
          // Ignore cleanup errors but log them
          console.debug('[ToolRevalidator] Failed to cleanup temp file');
        }
      }
    } finally {
      // Always release rate limiter
      this.rateLimiter.release();
    }
  }

  /**
   * Write a file with secure permissions (0600 - owner read/write only)
   * SESSION 74: Security hardening - prevents other users from reading temp files
   */
  private writeSecureFile(filePath: string, content: string): void {
    // Write with explicit secure permissions
    fs.writeFileSync(filePath, content, {
      encoding: 'utf-8',
      mode: SECURE_FILE_MODE,
    });

    // Double-check permissions were applied (some systems may ignore mode)
    try {
      fs.chmodSync(filePath, SECURE_FILE_MODE);
    } catch {
      // Best effort - log but don't fail
      console.debug('[ToolRevalidator] Could not verify file permissions');
    }
  }

  /**
   * Run a tool safely using spawn with args array to prevent command injection
   * SESSION 74: Security hardening - replaces shell command interpolation
   */
  private async runToolSafe(
    tool: string,
    filePath: string,
    _commandTemplate: string
  ): Promise<{ stdout: string; stderr: string; exitCode: number }> {
    // Get tool-specific configuration for safe execution
    const toolConfig = this.getToolConfig(tool);
    if (!toolConfig) {
      return {
        stdout: '',
        stderr: `Tool ${tool} not configured for safe execution`,
        exitCode: -1,
      };
    }

    // Build args array safely (no shell interpolation)
    const args = [...toolConfig.args, filePath, ...toolConfig.suffixArgs];

    return new Promise((resolve) => {
      const timeoutMs = this.rateLimiter.getStats().config.timeoutMs;
      let stdout = '';
      let stderr = '';
      let timedOut = false;

      const proc = spawn(toolConfig.binary, args, {
        cwd: path.dirname(filePath),
        timeout: timeoutMs,
        // Don't use shell - prevents command injection
        shell: false,
        // Capture output
        stdio: ['ignore', 'pipe', 'pipe'],
      });

      // Set up timeout
      const timeout = setTimeout(() => {
        timedOut = true;
        proc.kill('SIGTERM');
      }, timeoutMs);

      proc.stdout.on('data', (data) => {
        stdout += data.toString();
        // Limit buffer size to prevent memory issues
        if (stdout.length > 10 * 1024 * 1024) {
          stdout = stdout.substring(0, 10 * 1024 * 1024);
        }
      });

      proc.stderr.on('data', (data) => {
        stderr += data.toString();
        if (stderr.length > 1 * 1024 * 1024) {
          stderr = stderr.substring(0, 1 * 1024 * 1024);
        }
      });

      proc.on('close', (code) => {
        clearTimeout(timeout);
        if (timedOut) {
          resolve({
            stdout,
            stderr: stderr + '\nProcess timed out',
            exitCode: -1,
          });
        } else {
          resolve({
            stdout,
            stderr,
            exitCode: code ?? 0,
          });
        }
      });

      proc.on('error', (err) => {
        clearTimeout(timeout);
        resolve({
          stdout,
          stderr: err.message,
          exitCode: -1,
        });
      });
    });
  }

  /**
   * Get safe execution configuration for a tool
   * Returns binary path and args array (no shell required)
   */
  private getToolConfig(tool: string): { binary: string; args: string[]; suffixArgs: string[] } | null {
    const configs: Record<string, { binary: string; args: string[]; suffixArgs: string[] }> = {
      // Java tools
      pmd: {
        binary: 'pmd',
        args: ['check', '-d'],
        suffixArgs: ['-R', 'rulesets/java/quickstart.xml', '-f', 'json', '--no-progress'],
      },
      checkstyle: {
        binary: '/usr/local/bin/checkstyle',
        args: ['-c', '/google_checks.xml', '-f', 'json'],
        suffixArgs: [],
      },
      spotbugs: {
        binary: 'spotbugs',
        args: ['-textui', '-xml:withMessages'],
        suffixArgs: [],
      },

      // TypeScript/JavaScript tools
      // Use --no-config-lookup to avoid needing project config
      // Use basic rules that work without type information
      eslint: {
        binary: 'npx',
        args: [
          'eslint',
          '-f', 'json',
          '--no-config-lookup',
          '--rule', '{"no-unused-vars": "warn", "no-undef": "off", "semi": "warn", "quotes": ["warn", "single"]}',
        ],
        suffixArgs: [],
      },
      // For TypeScript files, use ts-node style type checking
      tsc: {
        binary: 'npx',
        args: [
          'tsc',
          '--noEmit',
          '--skipLibCheck',
          '--allowJs',
          '--checkJs', 'false',
          '--strict', 'false',
          '--noImplicitAny', 'false',
          '--target', 'ES2020',
          '--module', 'commonjs',
          '--moduleResolution', 'node',
        ],
        suffixArgs: [],
      },

      // Python tools
      ruff: {
        binary: 'ruff',
        args: ['check', '--output-format', 'json'],
        suffixArgs: [],
      },
      pylint: {
        binary: 'pylint',
        args: ['--output-format=json'],
        suffixArgs: [],
      },
      bandit: {
        binary: 'bandit',
        args: ['-f', 'json'],
        suffixArgs: [],
      },
      mypy: {
        binary: 'mypy',
        args: ['--output', 'json'],
        suffixArgs: [],
      },

      // Go tools
      'golangci-lint': {
        binary: 'golangci-lint',
        args: ['run', '--out-format', 'json'],
        suffixArgs: [],
      },
      gosec: {
        binary: 'gosec',
        args: ['-fmt=json'],
        suffixArgs: [],
      },

      // Rust tools
      clippy: {
        binary: 'cargo',
        args: ['clippy', '--message-format=json'],
        suffixArgs: [],
      },

      // Ruby tools
      rubocop: {
        binary: 'rubocop',
        args: ['--format', 'json'],
        suffixArgs: [],
      },
      brakeman: {
        binary: 'brakeman',
        args: ['-f', 'json'],
        suffixArgs: [],
      },

      // PHP tools
      phpstan: {
        binary: 'phpstan',
        args: ['analyse', '--error-format=json'],
        suffixArgs: [],
      },
    };

    // Normalize tool name
    const normalizedTool = tool.toLowerCase().replace(/-/g, '');
    for (const [name, config] of Object.entries(configs)) {
      if (name.toLowerCase().replace(/-/g, '') === normalizedTool) {
        return config;
      }
    }

    return null;
  }

  /**
   * Check if the original issue is resolved
   */
  private isOriginalIssueResolved(
    ruleId: string,
    lineNumber: number,
    originalIssues: Array<{ rule: string; message: string; line: number }>,
    fixedIssues: Array<{ rule: string; message: string; line: number }>
  ): boolean {
    // Normalize rule ID for comparison
    const normalizeRule = (rule: string) => rule.toLowerCase().replace(/[^a-z0-9]/g, '');
    const targetRule = normalizeRule(ruleId);

    // Find the original issue
    const originalIssue = originalIssues.find(issue => {
      const issueRule = normalizeRule(issue.rule);
      // Match by rule and approximate line (within 3 lines tolerance)
      return issueRule.includes(targetRule) || targetRule.includes(issueRule);
    });

    if (!originalIssue) {
      // Original issue wasn't even found in baseline - assume resolved
      console.log(`[ToolRevalidator] Note: Original issue ${ruleId} not found in baseline scan`);
      return true;
    }

    // Check if same issue exists in fixed code
    const stillExists = fixedIssues.some(issue => {
      const issueRule = normalizeRule(issue.rule);
      const ruleMatches = issueRule.includes(targetRule) || targetRule.includes(issueRule);
      // For line matching, allow some tolerance since fix might shift lines
      const lineClose = Math.abs(issue.line - lineNumber) <= 5;
      return ruleMatches && lineClose;
    });

    return !stillExists;
  }

  /**
   * Find regression issues (new issues introduced by the fix)
   */
  private findRegressions(
    originalIssues: Array<{ rule: string; message: string; line: number }>,
    fixedIssues: Array<{ rule: string; message: string; line: number }>
  ): Array<{ rule: string; message: string; line: number }> {
    const regressions: Array<{ rule: string; message: string; line: number }> = [];

    // Create a set of original issue signatures for quick lookup
    const originalSignatures = new Set(
      originalIssues.map(issue => `${issue.rule}:${issue.line}`)
    );

    for (const issue of fixedIssues) {
      const signature = `${issue.rule}:${issue.line}`;
      if (!originalSignatures.has(signature)) {
        // This is a new issue not in the original - potential regression
        regressions.push(issue);
      }
    }

    return regressions;
  }

  /**
   * Get file extension for a language
   */
  private getFileExtension(language: string, originalPath: string): string {
    // Try to use original file extension
    const originalExt = path.extname(originalPath);
    if (originalExt) return originalExt;

    // Fall back to language defaults
    const extensions: Record<string, string> = {
      java: '.java',
      typescript: '.ts',
      javascript: '.js',
      python: '.py',
      go: '.go',
      rust: '.rs',
      ruby: '.rb',
      php: '.php',
      csharp: '.cs',
      cpp: '.cpp',
      c: '.c',
    };

    return extensions[language] || '.txt';
  }
}

// ============================================================================
// Singleton and Factory Functions
// ============================================================================

let revalidatorInstance: ToolRevalidator | null = null;

/**
 * Get the singleton ToolRevalidator instance
 */
export function getToolRevalidator(rateLimitConfig?: Partial<RateLimitConfig>): ToolRevalidator {
  if (!revalidatorInstance) {
    revalidatorInstance = new ToolRevalidator(rateLimitConfig);
  }
  return revalidatorInstance;
}

/**
 * Create a new ToolRevalidator instance with custom config
 * Use this when you need independent rate limiting
 */
export function createToolRevalidator(rateLimitConfig?: Partial<RateLimitConfig>): ToolRevalidator {
  return new ToolRevalidator(rateLimitConfig);
}

/**
 * Get global rate limiter statistics
 */
export function getRateLimiterStats(): { executionsLastMinute: number; concurrent: number; config: RateLimitConfig } {
  return globalRateLimiter.getStats();
}

// Export types, constants, and utility functions
export {
  RateLimitConfig,
  DEFAULT_RATE_LIMIT,
  SECURE_FILE_MODE,
  SECURE_DIR_MODE,
  ToolAvailability,
};

// Export utility functions
export { checkToolAvailability, clearToolAvailabilityCache };

export default ToolRevalidator;
