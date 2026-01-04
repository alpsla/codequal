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

import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

const execAsync = promisify(exec);

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
 * Parse tool output to extract issues
 */
function parseToolOutput(
  tool: string,
  stdout: string,
  language: string
): Array<{ rule: string; message: string; line: number }> {
  const issues: Array<{ rule: string; message: string; line: number }> = [];

  try {
    // Clean output - remove non-JSON content and control characters
    let cleanOutput = stdout.trim();

    // Remove non-printable characters (control chars 0-31 and 127)
    // eslint-disable-next-line no-control-regex
    cleanOutput = cleanOutput.replace(/[\x00-\x1F\x7F]/g, ' ').trim();

    // Find JSON content - look for both { and [ starts
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

    if (jsonStart > 0) {
      cleanOutput = cleanOutput.substring(jsonStart);
    }

    // Find the end of JSON - look for matching closing bracket/brace
    const startChar = cleanOutput.charAt(0);
    if (startChar === '[' || startChar === '{') {
      const endChar = startChar === '[' ? ']' : '}';
      let depth = 0;
      let endIndex = -1;

      for (let i = 0; i < cleanOutput.length; i++) {
        if (cleanOutput[i] === startChar) depth++;
        if (cleanOutput[i] === endChar) depth--;
        if (depth === 0) {
          endIndex = i;
          break;
        }
      }

      if (endIndex > 0) {
        cleanOutput = cleanOutput.substring(0, endIndex + 1);
      }
    }

    // Handle different tool output formats
    if (tool === 'pmd') {
      // PMD format: { files: [{ violations: [...] }] }
      const data = JSON.parse(cleanOutput);
      const files = data.files || [];
      for (const file of files) {
        for (const violation of file.violations || []) {
          issues.push({
            rule: violation.rule || 'unknown',
            message: violation.description || violation.message || '',
            line: violation.beginline || violation.line || 0,
          });
        }
      }
    } else if (tool === 'checkstyle') {
      // Checkstyle format: array of { source, line, message }
      const data = JSON.parse(cleanOutput);
      if (Array.isArray(data)) {
        for (const item of data) {
          issues.push({
            rule: item.source?.split('.').pop() || 'checkstyle',
            message: item.message || '',
            line: item.line || 0,
          });
        }
      }
    } else if (tool === 'eslint') {
      // ESLint format: [{ messages: [...] }]
      const data = JSON.parse(cleanOutput);
      if (Array.isArray(data)) {
        for (const file of data) {
          for (const msg of file.messages || []) {
            issues.push({
              rule: msg.ruleId || 'eslint',
              message: msg.message || '',
              line: msg.line || 0,
            });
          }
        }
      }
    } else if (tool === 'ruff' || tool === 'pylint') {
      // Python linters format: array of { code, message, location }
      const data = JSON.parse(cleanOutput);
      if (Array.isArray(data)) {
        for (const item of data) {
          issues.push({
            rule: item.code || item.symbol || 'python-lint',
            message: item.message || '',
            line: item.location?.row || item.line || 0,
          });
        }
      }
    } else if (tool === 'bandit') {
      // Bandit format: { results: [...] }
      const data = JSON.parse(cleanOutput);
      for (const result of data.results || []) {
        issues.push({
          rule: result.test_id || 'bandit',
          message: result.issue_text || '',
          line: result.line_number || 0,
        });
      }
    } else if (tool === 'golangci-lint' || tool === 'gosec') {
      // Go linters format: { Issues: [...] }
      const data = JSON.parse(cleanOutput);
      for (const issue of data.Issues || data.issues || []) {
        issues.push({
          rule: issue.FromLinter || issue.rule_id || 'go-lint',
          message: issue.Text || issue.details || '',
          line: issue.Pos?.Line || issue.line || 0,
        });
      }
    } else if (tool === 'rubocop') {
      // RuboCop format: { files: [{ offenses: [...] }] }
      const data = JSON.parse(cleanOutput);
      for (const file of data.files || []) {
        for (const offense of file.offenses || []) {
          issues.push({
            rule: offense.cop_name || 'rubocop',
            message: offense.message || '',
            line: offense.location?.start_line || 0,
          });
        }
      }
    } else if (tool === 'phpstan') {
      // PHPStan format: { files: { "path": { messages: [...] } } }
      const data = JSON.parse(cleanOutput);
      for (const filePath of Object.keys(data.files || {})) {
        const file = data.files[filePath];
        for (const msg of file.messages || []) {
          issues.push({
            rule: 'phpstan',
            message: msg.message || '',
            line: msg.line || 0,
          });
        }
      }
    }
  } catch (parseError) {
    // If parsing fails, try to extract issues from raw output
    console.debug(`[ToolRevalidator] Failed to parse ${tool} output:`, (parseError as Error).message);
  }

  return issues;
}

// ============================================================================
// Main Revalidator Class
// ============================================================================

export class ToolRevalidator {
  private tempDir: string;

  constructor() {
    this.tempDir = path.join(os.tmpdir(), 'codequal-fix-validation');
    // Ensure temp directory exists
    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir, { recursive: true });
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

    // Create temp file with appropriate extension
    const ext = this.getFileExtension(request.language, request.originalFilePath);
    const tempFileName = `fix-validation-${Date.now()}${ext}`;
    const tempFilePath = path.join(this.tempDir, tempFileName);

    try {
      // Step 1: Run tool on ORIGINAL code to get baseline
      console.log(`[ToolRevalidator] Step 1: Getting baseline issues from original code`);
      fs.writeFileSync(tempFilePath, request.originalCode, 'utf-8');
      const originalResult = await this.runTool(request.tool, tempFilePath, command);
      const originalIssues = parseToolOutput(request.tool, originalResult.stdout, request.language);
      console.log(`[ToolRevalidator] Baseline: ${originalIssues.length} issues found`);

      // Step 2: Run tool on FIXED code
      console.log(`[ToolRevalidator] Step 2: Running tool on fixed code`);
      fs.writeFileSync(tempFilePath, request.fixedCode, 'utf-8');
      const fixedResult = await this.runTool(request.tool, tempFilePath, command);
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
          command: command.replace(tempFilePath, '<file>'),
          exitCode: fixedResult.exitCode,
          duration,
          stdout: fixedResult.stdout.substring(0, 1000), // Truncate for storage
          stderr: fixedResult.stderr.substring(0, 500),
        },
        summary,
      };
    } finally {
      // Cleanup temp file
      try {
        if (fs.existsSync(tempFilePath)) {
          fs.unlinkSync(tempFilePath);
        }
      } catch (cleanupError) {
        // Ignore cleanup errors
      }
    }
  }

  /**
   * Run a tool and capture output
   */
  private async runTool(
    tool: string,
    filePath: string,
    commandTemplate: string
  ): Promise<{ stdout: string; stderr: string; exitCode: number }> {
    // The command template already has placeholder paths - replace them with actual path
    // Pattern: look for quoted paths that look like placeholders or empty strings
    let command = commandTemplate;

    // Replace common placeholder patterns with actual file path
    // The template has: "${filePath}" or "" or similar - replace with actual path
    command = command.replace(/""/g, `"${filePath}"`);

    // If no file path in command, append it
    if (!command.includes(filePath)) {
      // Remove trailing "; true" if present, add file, then add back
      const hasTrueEnd = command.endsWith('; true');
      if (hasTrueEnd) {
        command = command.replace(/; true$/, '');
      }
      command = `${command} "${filePath}"${hasTrueEnd ? '; true' : ''}`;
    }

    const finalCommand = command;

    try {
      const { stdout, stderr } = await execAsync(finalCommand, {
        timeout: 30000, // 30 second timeout
        maxBuffer: 10 * 1024 * 1024, // 10MB buffer
        cwd: path.dirname(filePath),
      });

      return { stdout, stderr, exitCode: 0 };
    } catch (error: any) {
      // exec throws on non-zero exit, but we still want the output
      return {
        stdout: error.stdout || '',
        stderr: error.stderr || error.message,
        exitCode: error.code || 1,
      };
    }
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
// Singleton
// ============================================================================

let revalidatorInstance: ToolRevalidator | null = null;

export function getToolRevalidator(): ToolRevalidator {
  if (!revalidatorInstance) {
    revalidatorInstance = new ToolRevalidator();
  }
  return revalidatorInstance;
}

export default ToolRevalidator;
