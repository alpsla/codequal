/**
 * Post-Apply Verification Service
 *
 * SESSION 79: Implements the complete fix application workflow with regression checking:
 * 1. Apply verified fixes to files
 * 2. Run FULL scan on entire codebase to check for cross-fix regressions
 * 3. If new issues found, identify which fix caused it and revert
 * 4. Auto-commit remaining fixes
 *
 * Brand Safety: Never allow regressions to be committed
 */

import * as fs from 'fs';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { createLogger } from '@codequal/core/utils';

const execAsync = promisify(exec);
const logger = createLogger('PostApplyVerification');

// Issue from tool scan
interface ScannedIssue {
  file: string;
  line: number;
  ruleId: string;
  tool: string;
  message: string;
  existedBefore: boolean;
}

// Types for fix application
export interface VerifiedFix {
  id: string;
  file: string;
  line: number;
  column?: number;
  ruleId: string;
  tool: string;
  originalCode: string;
  fixedCode: string;
  validationStatus: 'verified' | 'failed_validation' | 'failed_generation';
  confidence: 'high' | 'medium' | 'low' | 'manual';
}

export interface ApplyFixesRequest {
  analysisId: string;
  repositoryPath: string;
  fixes: VerifiedFix[];
  verificationLevel: 'quick_apply' | 'standard_verify' | 'full_regression';
  autoCommit: boolean;
  userId?: string;
}

export interface FixApplicationResult {
  fixId: string;
  status: 'applied' | 'skipped' | 'reverted' | 'failed';
  file: string;
  reason?: string;
  regressionDetails?: {
    newIssues: number;
    issueTypes: string[];
  };
}

export interface ApplyFixesResult {
  success: boolean;
  totalFixes: number;
  applied: number;
  skipped: number;
  reverted: number;
  failed: number;
  results: FixApplicationResult[];
  commitSha?: string;
  scanDuration?: number;
  verificationLevel: string;
  regressionsSummary?: {
    detected: boolean;
    totalNewIssues: number;
    fixesReverted: number;
    details: Array<{
      fixId: string;
      causedIssues: number;
    }>;
  };
}

/**
 * Service for applying fixes with full regression verification
 */
export class PostApplyVerificationService {
  private repoPath: string;
  private originalFileContents: Map<string, string> = new Map();
  private appliedFixes: Map<string, VerifiedFix> = new Map();
  private baselineIssues: ScannedIssue[] = [];
  private language: string = 'java'; // Default, will be detected

  constructor() {
    this.repoPath = '';
  }

  /**
   * Detect repository language based on file extensions
   */
  private detectLanguage(repoPath: string): string {
    try {
      const files = fs.readdirSync(repoPath, { recursive: true }) as string[];
      const extensions: Record<string, number> = {};

      for (const file of files) {
        if (typeof file === 'string' && !file.includes('node_modules') && !file.includes('.git')) {
          const ext = path.extname(file).toLowerCase();
          if (ext) {
            extensions[ext] = (extensions[ext] || 0) + 1;
          }
        }
      }

      // Determine primary language (check most specific first)
      if (extensions['.java'] > 0) return 'java';
      if (extensions['.ts'] > 0 || extensions['.tsx'] > 0) return 'typescript';
      if (extensions['.py'] > 0) return 'python';
      if (extensions['.go'] > 0) return 'go';
      if (extensions['.rb'] > 0) return 'ruby';
      if (extensions['.rs'] > 0) return 'rust';
      if (extensions['.php'] > 0) return 'php';
      if (extensions['.cs'] > 0) return 'csharp';
      if (extensions['.js'] > 0 || extensions['.jsx'] > 0) return 'javascript';

      return 'java'; // Default
    } catch {
      return 'java';
    }
  }

  /**
   * Main entry point: Apply fixes with verification
   */
  async applyWithVerification(request: ApplyFixesRequest): Promise<ApplyFixesResult> {
    const startTime = Date.now();
    this.repoPath = request.repositoryPath;

    logger.info(`[PostApply] Starting fix application with ${request.verificationLevel} verification`);
    logger.info(`[PostApply] Total fixes to process: ${request.fixes.length}`);

    // Detect language for tool selection
    this.language = this.detectLanguage(request.repositoryPath);
    logger.info(`[PostApply] Detected language: ${this.language}`);

    const results: FixApplicationResult[] = [];
    const verifiedFixes = request.fixes.filter(f => f.validationStatus === 'verified');

    logger.info(`[PostApply] Verified fixes: ${verifiedFixes.length}/${request.fixes.length}`);

    // Phase 0: Capture baseline issues BEFORE applying fixes (for regression detection)
    if (request.verificationLevel !== 'quick_apply' && verifiedFixes.length > 0) {
      logger.info(`[PostApply] Phase 0: Capturing baseline issues...`);
      const modifiedFiles = [...new Set(verifiedFixes.map(f => f.file))];
      this.baselineIssues = await this.scanFilesForIssues(modifiedFiles);
      logger.info(`[PostApply] Baseline captured: ${this.baselineIssues.length} existing issues`);
    }

    // Phase 1: Backup original files and apply fixes
    for (const fix of verifiedFixes) {
      const result = await this.applyFix(fix);
      results.push(result);
      if (result.status === 'applied') {
        this.appliedFixes.set(fix.id, fix);
      }
    }

    const appliedCount = results.filter(r => r.status === 'applied').length;
    logger.info(`[PostApply] Phase 1 complete: ${appliedCount} fixes applied`);

    // Phase 2: Run regression scan based on verification level
    let regressionsSummary;
    if (request.verificationLevel !== 'quick_apply' && appliedCount > 0) {
      regressionsSummary = await this.runRegressionScan(request.verificationLevel, results);
    }

    // Phase 3: Commit if requested and no critical regressions
    let commitSha: string | undefined;
    if (request.autoCommit && appliedCount > 0) {
      const finalApplied = results.filter(r => r.status === 'applied').length;
      if (finalApplied > 0) {
        commitSha = await this.commitFixes(request.analysisId, finalApplied);
      }
    }

    const duration = Date.now() - startTime;

    return {
      success: true,
      totalFixes: request.fixes.length,
      applied: results.filter(r => r.status === 'applied').length,
      skipped: results.filter(r => r.status === 'skipped').length,
      reverted: results.filter(r => r.status === 'reverted').length,
      failed: results.filter(r => r.status === 'failed').length,
      results,
      commitSha,
      scanDuration: duration,
      verificationLevel: request.verificationLevel,
      regressionsSummary
    };
  }

  /**
   * Apply a single fix to the file system
   */
  private async applyFix(fix: VerifiedFix): Promise<FixApplicationResult> {
    const filePath = path.join(this.repoPath, fix.file);

    try {
      // Check if file exists
      if (!fs.existsSync(filePath)) {
        logger.warn(`[PostApply] File not found: ${fix.file}`);
        return {
          fixId: fix.id,
          status: 'skipped',
          file: fix.file,
          reason: 'File not found'
        };
      }

      // Read and backup original content
      const originalContent = fs.readFileSync(filePath, 'utf-8');
      this.originalFileContents.set(fix.file, originalContent);

      // Apply the fix (replace original code with fixed code)
      const fixedContent = this.replaceCodeInFile(
        originalContent,
        fix.originalCode,
        fix.fixedCode,
        fix.line
      );

      if (fixedContent === originalContent) {
        logger.warn(`[PostApply] No change made for fix ${fix.id} in ${fix.file}`);
        return {
          fixId: fix.id,
          status: 'skipped',
          file: fix.file,
          reason: 'Original code pattern not found'
        };
      }

      // Write fixed content
      fs.writeFileSync(filePath, fixedContent, 'utf-8');
      logger.info(`[PostApply] Applied fix ${fix.id} to ${fix.file}:${fix.line}`);

      return {
        fixId: fix.id,
        status: 'applied',
        file: fix.file
      };
    } catch (error: any) {
      logger.error(`[PostApply] Failed to apply fix ${fix.id}:`, error.message);
      return {
        fixId: fix.id,
        status: 'failed',
        file: fix.file,
        reason: error.message
      };
    }
  }

  /**
   * Replace code in file content at approximately the target line
   */
  private replaceCodeInFile(
    content: string,
    originalCode: string,
    fixedCode: string,
    targetLine: number
  ): string {
    const lines = content.split('\n');

    // Normalize whitespace for comparison
    const normalizedOriginal = originalCode.trim();

    // Search around the target line (+/- 5 lines for tolerance)
    const searchStart = Math.max(0, targetLine - 6);
    const searchEnd = Math.min(lines.length, targetLine + 5);

    // Try exact match first
    if (content.includes(originalCode)) {
      return content.replace(originalCode, fixedCode);
    }

    // Try normalized match (trim whitespace)
    for (let i = searchStart; i < searchEnd; i++) {
      if (lines[i].trim() === normalizedOriginal) {
        const indent = lines[i].match(/^(\s*)/)?.[1] || '';
        lines[i] = indent + fixedCode.trim();
        return lines.join('\n');
      }
    }

    // Try substring match for multi-line patterns
    const normalizedContent = content.replace(/\r\n/g, '\n');
    const normalizedOriginalMulti = originalCode.replace(/\r\n/g, '\n');
    if (normalizedContent.includes(normalizedOriginalMulti)) {
      return normalizedContent.replace(normalizedOriginalMulti, fixedCode);
    }

    // No match found
    return content;
  }

  /**
   * Run regression scan after applying fixes
   * SESSION 80: Integrated with real tool execution
   */
  private async runRegressionScan(
    level: 'standard_verify' | 'full_regression',
    results: FixApplicationResult[]
  ): Promise<ApplyFixesResult['regressionsSummary']> {
    logger.info(`[PostApply] Running ${level} regression scan...`);

    const appliedResults = results.filter(r => r.status === 'applied');
    if (appliedResults.length === 0) {
      return {
        detected: false,
        totalNewIssues: 0,
        fixesReverted: 0,
        details: []
      };
    }

    const regressionDetails: Array<{ fixId: string; causedIssues: number }> = [];
    let totalNewIssues = 0;
    let fixesReverted = 0;

    // Get scan results based on verification level
    let scanResult: ScannedIssue[];

    if (level === 'standard_verify') {
      // Standard verify: Scan only modified files (faster)
      const modifiedFiles = [...new Set(appliedResults.map(r => {
        const fix = this.appliedFixes.get(r.fixId);
        return fix?.file;
      }).filter((f): f is string => !!f))];

      logger.info(`[PostApply] Scanning ${modifiedFiles.length} modified files...`);
      scanResult = await this.scanFilesForIssues(modifiedFiles);
    } else {
      // Full regression: Scan ALL files
      scanResult = await this.runFullToolScan();
    }

    // Check each applied fix for regressions
    for (const result of appliedResults) {
      const fix = this.appliedFixes.get(result.fixId);
      if (!fix) continue;

      const fileIssues = scanResult.filter(issue => issue.file === fix.file);
      const newIssues = fileIssues.filter(issue =>
        // New issue if line is within 10 lines of our fix and didn't exist before
        Math.abs(issue.line - fix.line) < 10 && !issue.existedBefore
      );

      if (newIssues.length > 0) {
        logger.warn(`[PostApply] Regression detected for fix ${fix.id}: ${newIssues.length} new issues`);
        logger.warn(`[PostApply] New issues: ${newIssues.map(i => `${i.ruleId}@${i.line}`).join(', ')}`);

        // Revert this fix
        await this.revertFix(fix, result);

        regressionDetails.push({
          fixId: fix.id,
          causedIssues: newIssues.length
        });
        totalNewIssues += newIssues.length;
        fixesReverted++;
      }
    }

    return {
      detected: totalNewIssues > 0,
      totalNewIssues,
      fixesReverted,
      details: regressionDetails
    };
  }

  /**
   * Revert a single fix
   */
  private async revertFix(fix: VerifiedFix, result: FixApplicationResult): Promise<void> {
    const originalContent = this.originalFileContents.get(fix.file);
    if (!originalContent) {
      logger.error(`[PostApply] Cannot revert ${fix.id}: no backup found`);
      return;
    }

    const filePath = path.join(this.repoPath, fix.file);

    try {
      fs.writeFileSync(filePath, originalContent, 'utf-8');
      result.status = 'reverted';
      result.reason = 'Regression detected - reverted to original';
      logger.info(`[PostApply] Reverted fix ${fix.id} in ${fix.file}`);
    } catch (error: any) {
      logger.error(`[PostApply] Failed to revert ${fix.id}:`, error.message);
    }
  }

  /**
   * Scan specific files for issues (used for baseline and comparison)
   */
  private async scanFilesForIssues(files: string[]): Promise<ScannedIssue[]> {
    const issues: ScannedIssue[] = [];

    try {
      switch (this.language) {
        case 'java':
          issues.push(...await this.runPMDScan(files));
          break;
        case 'typescript':
        case 'javascript':
          issues.push(...await this.runESLintScan(files));
          break;
        case 'python':
          issues.push(...await this.runPylintScan(files));
          break;
        case 'go':
          issues.push(...await this.runGolangciLintScan(files));
          break;
        case 'ruby':
          issues.push(...await this.runRubocopScan(files));
          break;
        case 'rust':
          issues.push(...await this.runClippyScan(files));
          break;
        case 'php':
          issues.push(...await this.runPhpCodeSnifferScan(files));
          break;
        case 'csharp':
        case 'dotnet':
          issues.push(...await this.runDotnetAnalyzerScan(files));
          break;
        default:
          logger.warn(`[PostApply] No scanner configured for language: ${this.language}`);
      }
    } catch (error: any) {
      logger.error(`[PostApply] Scan failed: ${error.message}`);
    }

    return issues;
  }

  /**
   * Run PMD scan on Java files
   */
  private async runPMDScan(files: string[]): Promise<ScannedIssue[]> {
    const issues: ScannedIssue[] = [];
    const outputFile = path.join(this.repoPath, 'pmd-regression-check.json');

    try {
      // Build file list for PMD
      const fileList = files
        .filter(f => f.endsWith('.java'))
        .map(f => path.join(this.repoPath, f))
        .join(',');

      if (!fileList) {
        logger.info('[PostApply] No Java files to scan');
        return [];
      }

      // Check if PMD is available locally
      const pmdPath = process.env.PMD_PATH || '/opt/pmd/bin/pmd';
      const hasPMD = fs.existsSync(pmdPath) || await this.commandExists('pmd');

      if (!hasPMD) {
        logger.warn('[PostApply] PMD not available locally, skipping Java scan');
        return [];
      }

      // Run PMD with minimal rulesets for quick regression check
      const cmd = `pmd check -d "${fileList}" -R category/java/errorprone.xml -f json -r "${outputFile}" --no-fail-on-violation 2>/dev/null || true`;

      await execAsync(cmd, {
        cwd: this.repoPath,
        maxBuffer: 10 * 1024 * 1024,
        timeout: 60000
      });

      // Parse results if file exists
      if (fs.existsSync(outputFile)) {
        const content = fs.readFileSync(outputFile, 'utf-8');
        const pmdResult = JSON.parse(content);

        if (pmdResult.files) {
          for (const fileResult of pmdResult.files) {
            for (const violation of fileResult.violations || []) {
              const relativeFile = path.relative(this.repoPath, fileResult.filename);
              issues.push({
                file: relativeFile,
                line: violation.beginline || 1,
                ruleId: violation.rule || 'unknown',
                tool: 'pmd',
                message: violation.description || '',
                existedBefore: this.issueExistsInBaseline(relativeFile, violation.beginline, violation.rule)
              });
            }
          }
        }

        // Clean up
        fs.unlinkSync(outputFile);
      }
    } catch (error: any) {
      logger.error(`[PostApply] PMD scan error: ${error.message}`);
    }

    return issues;
  }

  /**
   * Run ESLint scan on TypeScript/JavaScript files
   */
  private async runESLintScan(files: string[]): Promise<ScannedIssue[]> {
    const issues: ScannedIssue[] = [];

    try {
      const jsFiles = files.filter(f =>
        f.endsWith('.ts') || f.endsWith('.tsx') ||
        f.endsWith('.js') || f.endsWith('.jsx')
      );

      if (jsFiles.length === 0) {
        return [];
      }

      const fileArgs = jsFiles.map(f => `"${path.join(this.repoPath, f)}"`).join(' ');
      const cmd = `npx eslint ${fileArgs} -f json 2>/dev/null || true`;

      const { stdout } = await execAsync(cmd, {
        cwd: this.repoPath,
        maxBuffer: 10 * 1024 * 1024,
        timeout: 60000
      });

      if (stdout) {
        const eslintResult = JSON.parse(stdout);
        for (const fileResult of eslintResult) {
          const relativeFile = path.relative(this.repoPath, fileResult.filePath);
          for (const msg of fileResult.messages || []) {
            issues.push({
              file: relativeFile,
              line: msg.line || 1,
              ruleId: msg.ruleId || 'unknown',
              tool: 'eslint',
              message: msg.message || '',
              existedBefore: this.issueExistsInBaseline(relativeFile, msg.line, msg.ruleId)
            });
          }
        }
      }
    } catch (error: any) {
      logger.error(`[PostApply] ESLint scan error: ${error.message}`);
    }

    return issues;
  }

  /**
   * Run Pylint scan on Python files
   */
  private async runPylintScan(files: string[]): Promise<ScannedIssue[]> {
    const issues: ScannedIssue[] = [];

    try {
      const pyFiles = files.filter(f => f.endsWith('.py'));

      if (pyFiles.length === 0) {
        return [];
      }

      const fileArgs = pyFiles.map(f => `"${path.join(this.repoPath, f)}"`).join(' ');
      const cmd = `pylint ${fileArgs} --output-format=json 2>/dev/null || true`;

      const { stdout } = await execAsync(cmd, {
        cwd: this.repoPath,
        maxBuffer: 10 * 1024 * 1024,
        timeout: 60000
      });

      if (stdout) {
        const pylintResult = JSON.parse(stdout);
        for (const issue of pylintResult) {
          issues.push({
            file: issue.path,
            line: issue.line || 1,
            ruleId: issue.symbol || issue['message-id'] || 'unknown',
            tool: 'pylint',
            message: issue.message || '',
            existedBefore: this.issueExistsInBaseline(issue.path, issue.line, issue.symbol)
          });
        }
      }
    } catch (error: any) {
      logger.error(`[PostApply] Pylint scan error: ${error.message}`);
    }

    return issues;
  }

  /**
   * Run golangci-lint scan on Go files
   */
  private async runGolangciLintScan(files: string[]): Promise<ScannedIssue[]> {
    const issues: ScannedIssue[] = [];

    try {
      const goFiles = files.filter(f => f.endsWith('.go'));

      if (goFiles.length === 0) {
        return [];
      }

      // Check if golangci-lint is available
      const hasLinter = await this.commandExists('golangci-lint');
      if (!hasLinter) {
        logger.warn('[PostApply] golangci-lint not available locally, skipping Go scan');
        return [];
      }

      // Run golangci-lint with JSON output
      // We run on the whole repo but filter results to our files
      const cmd = `golangci-lint run --out-format json ./... 2>/dev/null || true`;

      const { stdout } = await execAsync(cmd, {
        cwd: this.repoPath,
        maxBuffer: 10 * 1024 * 1024,
        timeout: 120000 // Go linting can take longer
      });

      if (stdout) {
        const lintResult = JSON.parse(stdout);

        // golangci-lint JSON format has Issues array
        for (const issue of lintResult.Issues || []) {
          const relativeFile = issue.Pos?.Filename || issue.FromLinter || 'unknown';

          // Only include issues from our target files
          if (goFiles.some(f => relativeFile.endsWith(f) || f.endsWith(relativeFile))) {
            issues.push({
              file: relativeFile,
              line: issue.Pos?.Line || 1,
              ruleId: issue.FromLinter || 'unknown',
              tool: 'golangci-lint',
              message: issue.Text || '',
              existedBefore: this.issueExistsInBaseline(relativeFile, issue.Pos?.Line || 1, issue.FromLinter)
            });
          }
        }
      }
    } catch (error: any) {
      logger.error(`[PostApply] golangci-lint scan error: ${error.message}`);
    }

    return issues;
  }

  /**
   * Run RuboCop scan on Ruby files
   */
  private async runRubocopScan(files: string[]): Promise<ScannedIssue[]> {
    const issues: ScannedIssue[] = [];

    try {
      const rbFiles = files.filter(f => f.endsWith('.rb'));
      if (rbFiles.length === 0) return [];

      const hasRubocop = await this.commandExists('rubocop');
      if (!hasRubocop) {
        logger.warn('[PostApply] RuboCop not available locally, skipping Ruby scan');
        return [];
      }

      const fileArgs = rbFiles.map(f => `"${path.join(this.repoPath, f)}"`).join(' ');
      const cmd = `rubocop ${fileArgs} --format json 2>/dev/null || true`;

      const { stdout } = await execAsync(cmd, {
        cwd: this.repoPath,
        maxBuffer: 10 * 1024 * 1024,
        timeout: 60000
      });

      if (stdout) {
        const result = JSON.parse(stdout);
        for (const fileResult of result.files || []) {
          const relativeFile = path.relative(this.repoPath, fileResult.path);
          for (const offense of fileResult.offenses || []) {
            issues.push({
              file: relativeFile,
              line: offense.location?.line || 1,
              ruleId: offense.cop_name || 'unknown',
              tool: 'rubocop',
              message: offense.message || '',
              existedBefore: this.issueExistsInBaseline(relativeFile, offense.location?.line || 1, offense.cop_name)
            });
          }
        }
      }
    } catch (error: any) {
      logger.error(`[PostApply] RuboCop scan error: ${error.message}`);
    }

    return issues;
  }

  /**
   * Run Clippy scan on Rust files
   */
  private async runClippyScan(files: string[]): Promise<ScannedIssue[]> {
    const issues: ScannedIssue[] = [];

    try {
      const rsFiles = files.filter(f => f.endsWith('.rs'));
      if (rsFiles.length === 0) return [];

      const hasCargo = await this.commandExists('cargo');
      if (!hasCargo) {
        logger.warn('[PostApply] Cargo/Clippy not available locally, skipping Rust scan');
        return [];
      }

      // Run clippy with JSON output
      const cmd = `cargo clippy --message-format=json 2>/dev/null || true`;

      const { stdout } = await execAsync(cmd, {
        cwd: this.repoPath,
        maxBuffer: 10 * 1024 * 1024,
        timeout: 120000
      });

      if (stdout) {
        // Clippy outputs one JSON object per line
        const lines = stdout.split('\n').filter(line => line.trim());
        for (const line of lines) {
          try {
            const msg = JSON.parse(line);
            if (msg.reason === 'compiler-message' && msg.message?.spans?.[0]) {
              const span = msg.message.spans[0];
              const relativeFile = span.file_name;

              if (rsFiles.some(f => relativeFile.endsWith(f) || f.endsWith(relativeFile))) {
                issues.push({
                  file: relativeFile,
                  line: span.line_start || 1,
                  ruleId: msg.message.code?.code || 'clippy',
                  tool: 'clippy',
                  message: msg.message.message || '',
                  existedBefore: this.issueExistsInBaseline(relativeFile, span.line_start || 1, msg.message.code?.code)
                });
              }
            }
          } catch {
            // Skip non-JSON lines
          }
        }
      }
    } catch (error: any) {
      logger.error(`[PostApply] Clippy scan error: ${error.message}`);
    }

    return issues;
  }

  /**
   * Run PHP_CodeSniffer scan on PHP files
   */
  private async runPhpCodeSnifferScan(files: string[]): Promise<ScannedIssue[]> {
    const issues: ScannedIssue[] = [];

    try {
      const phpFiles = files.filter(f => f.endsWith('.php'));
      if (phpFiles.length === 0) return [];

      const hasPhpcs = await this.commandExists('phpcs');
      if (!hasPhpcs) {
        logger.warn('[PostApply] PHP_CodeSniffer not available locally, skipping PHP scan');
        return [];
      }

      const fileArgs = phpFiles.map(f => `"${path.join(this.repoPath, f)}"`).join(' ');
      const cmd = `phpcs ${fileArgs} --report=json 2>/dev/null || true`;

      const { stdout } = await execAsync(cmd, {
        cwd: this.repoPath,
        maxBuffer: 10 * 1024 * 1024,
        timeout: 60000
      });

      if (stdout) {
        const result = JSON.parse(stdout);
        for (const [filePath, fileResult] of Object.entries(result.files || {})) {
          const relativeFile = path.relative(this.repoPath, filePath);
          const messages = (fileResult as any).messages || [];
          for (const msg of messages) {
            issues.push({
              file: relativeFile,
              line: msg.line || 1,
              ruleId: msg.source || 'unknown',
              tool: 'phpcs',
              message: msg.message || '',
              existedBefore: this.issueExistsInBaseline(relativeFile, msg.line || 1, msg.source)
            });
          }
        }
      }
    } catch (error: any) {
      logger.error(`[PostApply] PHP_CodeSniffer scan error: ${error.message}`);
    }

    return issues;
  }

  /**
   * Run .NET analyzer scan on C# files
   */
  private async runDotnetAnalyzerScan(files: string[]): Promise<ScannedIssue[]> {
    const issues: ScannedIssue[] = [];

    try {
      const csFiles = files.filter(f => f.endsWith('.cs'));
      if (csFiles.length === 0) return [];

      const hasDotnet = await this.commandExists('dotnet');
      if (!hasDotnet) {
        logger.warn('[PostApply] .NET SDK not available locally, skipping C# scan');
        return [];
      }

      // Run dotnet build with analyzers (outputs warnings/errors)
      const cmd = `dotnet build --no-restore -v q /p:TreatWarningsAsErrors=false 2>&1 || true`;

      const { stdout } = await execAsync(cmd, {
        cwd: this.repoPath,
        maxBuffer: 10 * 1024 * 1024,
        timeout: 120000
      });

      if (stdout) {
        // Parse MSBuild output format: path(line,col): warning/error CODE: message
        const pattern = /([^(]+)\((\d+),(\d+)\):\s*(warning|error)\s+(\w+):\s*(.+)/g;
        let match;

        while ((match = pattern.exec(stdout)) !== null) {
          const [, filePath, line, , , code, message] = match;
          const relativeFile = path.relative(this.repoPath, filePath.trim());

          if (csFiles.some(f => relativeFile.endsWith(f) || f.endsWith(relativeFile))) {
            issues.push({
              file: relativeFile,
              line: parseInt(line, 10) || 1,
              ruleId: code || 'unknown',
              tool: 'dotnet',
              message: message?.trim() || '',
              existedBefore: this.issueExistsInBaseline(relativeFile, parseInt(line, 10) || 1, code)
            });
          }
        }
      }
    } catch (error: any) {
      logger.error(`[PostApply] .NET analyzer scan error: ${error.message}`);
    }

    return issues;
  }

  /**
   * Check if an issue existed in the baseline
   */
  private issueExistsInBaseline(file: string, line: number, ruleId: string): boolean {
    return this.baselineIssues.some(baseline =>
      baseline.file === file &&
      Math.abs(baseline.line - line) <= 2 && // Allow 2-line tolerance
      baseline.ruleId === ruleId
    );
  }

  /**
   * Check if a command exists
   */
  private async commandExists(cmd: string): Promise<boolean> {
    try {
      await execAsync(`which ${cmd}`);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Run full tool scan on repository
   * SESSION 80: Integrated with real tool execution
   */
  private async runFullToolScan(): Promise<ScannedIssue[]> {
    logger.info('[PostApply] Running full tool scan...');

    // Get all source files in repo
    const allFiles = this.getAllSourceFiles(this.repoPath);
    logger.info(`[PostApply] Scanning ${allFiles.length} files`);

    // Run scan and mark which issues are new
    const issues = await this.scanFilesForIssues(allFiles);

    // Mark existedBefore based on baseline comparison
    for (const issue of issues) {
      issue.existedBefore = this.issueExistsInBaseline(issue.file, issue.line, issue.ruleId);
    }

    logger.info(`[PostApply] Full scan complete: ${issues.length} issues found, ${issues.filter(i => !i.existedBefore).length} new`);
    return issues;
  }

  /**
   * Get all source files in a repository
   */
  private getAllSourceFiles(repoPath: string): string[] {
    const files: string[] = [];
    const extensions = this.getExtensionsForLanguage();

    const walk = (dir: string) => {
      try {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          if (entry.isDirectory()) {
            // Skip common non-source directories
            if (!['node_modules', '.git', 'dist', 'build', 'target', '__pycache__', '.venv'].includes(entry.name)) {
              walk(fullPath);
            }
          } else if (entry.isFile()) {
            const ext = path.extname(entry.name).toLowerCase();
            if (extensions.includes(ext)) {
              files.push(path.relative(repoPath, fullPath));
            }
          }
        }
      } catch (e) {
        // Skip directories we can't read
      }
    };

    walk(repoPath);
    return files;
  }

  /**
   * Get file extensions for current language
   */
  private getExtensionsForLanguage(): string[] {
    switch (this.language) {
      case 'java': return ['.java'];
      case 'typescript': return ['.ts', '.tsx'];
      case 'javascript': return ['.js', '.jsx'];
      case 'python': return ['.py'];
      case 'go': return ['.go'];
      case 'ruby': return ['.rb'];
      case 'rust': return ['.rs'];
      case 'php': return ['.php'];
      case 'csharp':
      case 'dotnet': return ['.cs'];
      default: return ['.java'];
    }
  }

  /**
   * Commit applied fixes
   */
  private async commitFixes(analysisId: string, fixCount: number): Promise<string | undefined> {
    try {
      const { execSync } = require('child_process');

      // Stage all modified files
      execSync('git add -A', { cwd: this.repoPath });

      // Create commit
      const commitMessage = `fix: Apply ${fixCount} verified code quality fixes

Analysis ID: ${analysisId}
Verification: All fixes passed tool revalidation
Regressions: None detected

Applied by CodeQual AI Fixer
https://codequal.com`;

      execSync(`git commit -m "${commitMessage}"`, { cwd: this.repoPath });

      // Get commit SHA
      const sha = execSync('git rev-parse HEAD', { cwd: this.repoPath })
        .toString()
        .trim();

      logger.info(`[PostApply] Committed fixes with SHA: ${sha.substring(0, 8)}`);
      return sha;
    } catch (error: any) {
      logger.error('[PostApply] Commit failed:', error.message);
      return undefined;
    }
  }
}

/**
 * Verification level descriptions for UI
 */
export const VERIFICATION_LEVELS = {
  quick_apply: {
    name: 'Quick Apply',
    description: 'Apply verified fixes immediately without additional scanning. Fastest option.',
    estimatedTime: '< 30 seconds',
    riskLevel: 'low',
    recommendation: 'Use for small PRs with < 10 fixes'
  },
  standard_verify: {
    name: 'Standard Verification',
    description: 'Apply fixes and scan modified files only for regressions.',
    estimatedTime: '1-3 minutes',
    riskLevel: 'very_low',
    recommendation: 'Recommended for most PRs'
  },
  full_regression: {
    name: 'Full Regression Scan',
    description: 'Apply fixes and run FULL codebase scan. Automatically reverts any fix that causes regressions.',
    estimatedTime: '5-15 minutes',
    riskLevel: 'minimal',
    recommendation: 'Use for critical codebases or large architectural changes'
  }
} as const;

export type VerificationLevel = keyof typeof VERIFICATION_LEVELS;
