/**
 * Fix Applicator
 *
 * Applies code fixes to files safely with validation and rollback support.
 *
 * @since Session 60
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { CategorizedFix } from './fix-categorizer';

// ============================================================
// TYPES
// ============================================================

/**
 * Result of applying a single fix
 */
export interface FixApplication {
  /** Fix that was applied */
  fix: CategorizedFix;

  /** Whether application succeeded */
  success: boolean;

  /** Error message if failed */
  error?: string;

  /** Original file content (for rollback) */
  originalContent?: string;

  /** New file content after fix */
  newContent?: string;

  /** Line diff showing the change */
  diff?: string;
}

/**
 * Result of applying multiple fixes
 */
export interface ApplyResult {
  /** Successfully applied fixes */
  applied: FixApplication[];

  /** Failed applications */
  failed: FixApplication[];

  /** Files that were modified */
  modifiedFiles: string[];

  /** Summary statistics */
  summary: {
    totalAttempted: number;
    successCount: number;
    failCount: number;
    filesModified: number;
  };
}

/**
 * Options for fix application
 */
export interface ApplyOptions {
  /** Working directory (repository root) */
  workingDir: string;

  /** Whether to validate syntax after applying */
  validateSyntax?: boolean;

  /** Whether to create backups before modifying */
  createBackups?: boolean;

  /** Backup directory path */
  backupDir?: string;

  /** Whether to apply in dry-run mode (don't modify files) */
  dryRun?: boolean;
}

// ============================================================
// FIX APPLICATOR
// ============================================================

export class FixApplicator {
  private options: Required<ApplyOptions>;
  private fileCache: Map<string, string> = new Map();
  private pendingChanges: Map<string, Array<{ fix: CategorizedFix; applied: boolean }>> = new Map();

  constructor(options: ApplyOptions) {
    this.options = {
      workingDir: options.workingDir,
      validateSyntax: options.validateSyntax ?? true,
      createBackups: options.createBackups ?? true,
      backupDir: options.backupDir ?? path.join(options.workingDir, '.codequal-backup'),
      dryRun: options.dryRun ?? false
    };
  }

  /**
   * Apply a batch of fixes to files
   */
  async applyFixes(fixes: CategorizedFix[]): Promise<ApplyResult> {
    const applied: FixApplication[] = [];
    const failed: FixApplication[] = [];
    const modifiedFiles = new Set<string>();

    // Group fixes by file for efficient processing
    const fixesByFile = this.groupFixesByFile(fixes);

    // Create backup directory if needed
    if (this.options.createBackups && !this.options.dryRun) {
      await this.ensureBackupDir();
    }

    // Process each file
    for (const [filePath, fileFixes] of Array.from(fixesByFile)) {
      const fullPath = path.join(this.options.workingDir, filePath);

      try {
        // Read original content
        const originalContent = await this.readFile(fullPath);
        if (originalContent === null) {
          // File doesn't exist
          for (const fix of fileFixes) {
            failed.push({
              fix,
              success: false,
              error: `File not found: ${filePath}`
            });
          }
          continue;
        }

        // Create backup
        if (this.options.createBackups && !this.options.dryRun) {
          await this.createBackup(fullPath, originalContent);
        }

        // Apply fixes to this file (sorted by line number descending to avoid offset issues)
        const sortedFixes = [...fileFixes].sort((a, b) => b.line - a.line);
        let currentContent = originalContent;

        for (const fix of sortedFixes) {
          const result = await this.applySingleFix(fix, currentContent, filePath);

          if (result.success && result.newContent) {
            currentContent = result.newContent;
            applied.push(result);
          } else {
            failed.push(result);
          }
        }

        // Write modified content
        if (currentContent !== originalContent && !this.options.dryRun) {
          await fs.writeFile(fullPath, currentContent, 'utf-8');
          modifiedFiles.add(filePath);
        } else if (currentContent !== originalContent) {
          // Dry run - still track as "would be modified"
          modifiedFiles.add(filePath);
        }

      } catch (error) {
        // File-level error
        for (const fix of fileFixes) {
          failed.push({
            fix,
            success: false,
            error: `Failed to process file: ${error instanceof Error ? error.message : String(error)}`
          });
        }
      }
    }

    return {
      applied,
      failed,
      modifiedFiles: Array.from(modifiedFiles),
      summary: {
        totalAttempted: fixes.length,
        successCount: applied.length,
        failCount: failed.length,
        filesModified: modifiedFiles.size
      }
    };
  }

  /**
   * Apply a single fix to content
   */
  private async applySingleFix(
    fix: CategorizedFix,
    content: string,
    filePath: string
  ): Promise<FixApplication> {
    try {
      const lines = content.split('\n');
      const lineIndex = fix.line - 1; // Convert to 0-indexed

      // Validate line exists
      if (lineIndex < 0 || lineIndex >= lines.length) {
        return {
          fix,
          success: false,
          error: `Line ${fix.line} out of range (file has ${lines.length} lines)`
        };
      }

      // Find the code to replace
      const originalLine = lines[lineIndex];

      // Strategy 1: Exact match on the line
      if (originalLine.includes(fix.originalCode)) {
        const newLine = originalLine.replace(fix.originalCode, fix.fixedCode);
        lines[lineIndex] = newLine;

        const newContent = lines.join('\n');
        const diff = this.generateLineDiff(fix.line, originalLine, newLine);

        // Validate syntax if enabled
        if (this.options.validateSyntax) {
          const syntaxValid = await this.validateSyntax(newContent, filePath);
          if (!syntaxValid) {
            return {
              fix,
              success: false,
              error: 'Syntax validation failed after applying fix',
              originalContent: content,
              newContent,
              diff
            };
          }
        }

        return {
          fix,
          success: true,
          originalContent: content,
          newContent,
          diff
        };
      }

      // Strategy 2: Multi-line replacement
      if (fix.originalCode.includes('\n')) {
        const multiLineResult = this.applyMultiLineFix(fix, lines, lineIndex);
        if (multiLineResult.success) {
          const newContent = multiLineResult.lines!.join('\n');

          if (this.options.validateSyntax) {
            const syntaxValid = await this.validateSyntax(newContent, filePath);
            if (!syntaxValid) {
              return {
                fix,
                success: false,
                error: 'Syntax validation failed after applying multi-line fix',
                originalContent: content
              };
            }
          }

          return {
            fix,
            success: true,
            originalContent: content,
            newContent,
            diff: multiLineResult.diff
          };
        }
      }

      // Strategy 3: Fuzzy match (handle whitespace differences)
      const fuzzyResult = this.fuzzyMatch(fix.originalCode, originalLine);
      if (fuzzyResult.matched) {
        const newLine = originalLine.substring(0, fuzzyResult.start!) +
          fix.fixedCode +
          originalLine.substring(fuzzyResult.end!);
        lines[lineIndex] = newLine;

        const newContent = lines.join('\n');
        const diff = this.generateLineDiff(fix.line, originalLine, newLine);

        if (this.options.validateSyntax) {
          const syntaxValid = await this.validateSyntax(newContent, filePath);
          if (!syntaxValid) {
            return {
              fix,
              success: false,
              error: 'Syntax validation failed after fuzzy match fix'
            };
          }
        }

        return {
          fix,
          success: true,
          originalContent: content,
          newContent,
          diff
        };
      }

      // No match found
      return {
        fix,
        success: false,
        error: `Could not find code to replace at line ${fix.line}. Expected: "${fix.originalCode.substring(0, 50)}..."`
      };

    } catch (error) {
      return {
        fix,
        success: false,
        error: `Error applying fix: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  /**
   * Apply a multi-line fix
   */
  private applyMultiLineFix(
    fix: CategorizedFix,
    lines: string[],
    startLine: number
  ): { success: boolean; lines?: string[]; diff?: string } {
    const originalLines = fix.originalCode.split('\n');
    const fixedLines = fix.fixedCode.split('\n');

    // Check if we have enough lines
    if (startLine + originalLines.length > lines.length) {
      return { success: false };
    }

    // Verify each line matches
    for (let i = 0; i < originalLines.length; i++) {
      const actualLine = lines[startLine + i].trim();
      const expectedLine = originalLines[i].trim();

      if (actualLine !== expectedLine) {
        return { success: false };
      }
    }

    // Apply the fix
    const newLines = [
      ...lines.slice(0, startLine),
      ...fixedLines,
      ...lines.slice(startLine + originalLines.length)
    ];

    const diff = this.generateMultiLineDiff(
      startLine + 1,
      originalLines,
      fixedLines
    );

    return { success: true, lines: newLines, diff };
  }

  /**
   * Fuzzy match for code with whitespace differences
   */
  private fuzzyMatch(
    target: string,
    source: string
  ): { matched: boolean; start?: number; end?: number } {
    // Normalize whitespace for comparison
    const normalizedTarget = target.trim().replace(/\s+/g, ' ');
    const normalizedSource = source.replace(/\s+/g, ' ');

    const index = normalizedSource.indexOf(normalizedTarget);
    if (index === -1) {
      return { matched: false };
    }

    // Map back to original positions (approximate)
    let start = 0;
    let normalizedPos = 0;
    while (normalizedPos < index && start < source.length) {
      if (!/\s/.test(source[start]) || normalizedSource[normalizedPos] !== ' ') {
        normalizedPos++;
      }
      start++;
    }

    let end = start;
    normalizedPos = 0;
    while (normalizedPos < normalizedTarget.length && end < source.length) {
      if (!/\s/.test(source[end]) || normalizedTarget[normalizedPos] !== ' ') {
        normalizedPos++;
      }
      end++;
    }

    return { matched: true, start, end };
  }

  /**
   * Validate syntax of modified content
   */
  private async validateSyntax(content: string, filePath: string): Promise<boolean> {
    const ext = path.extname(filePath).toLowerCase();

    // TypeScript/JavaScript - use basic parsing check
    if (['.ts', '.tsx', '.js', '.jsx'].includes(ext)) {
      return this.validateJSLikeSyntax(content);
    }

    // Python - check for obvious syntax errors
    if (ext === '.py') {
      return this.validatePythonSyntax(content);
    }

    // Java - basic brace matching
    if (ext === '.java') {
      return this.validateJavaSyntax(content);
    }

    // For unknown types, skip validation
    return true;
  }

  /**
   * Basic JS/TS syntax validation
   */
  private validateJSLikeSyntax(content: string): boolean {
    try {
      // Check balanced braces, brackets, parens
      const stack: string[] = [];
      const pairs: Record<string, string> = { '{': '}', '[': ']', '(': ')' };
      const closers = new Set(Object.values(pairs));

      let inString = false;
      let stringChar = '';
      let escaped = false;

      for (const char of content) {
        if (escaped) {
          escaped = false;
          continue;
        }

        if (char === '\\') {
          escaped = true;
          continue;
        }

        if (!inString && (char === '"' || char === "'" || char === '`')) {
          inString = true;
          stringChar = char;
          continue;
        }

        if (inString && char === stringChar) {
          inString = false;
          continue;
        }

        if (inString) continue;

        if (pairs[char]) {
          stack.push(pairs[char]);
        } else if (closers.has(char)) {
          if (stack.pop() !== char) {
            return false;
          }
        }
      }

      return stack.length === 0;
    } catch {
      return false;
    }
  }

  /**
   * Basic Python syntax validation
   */
  private validatePythonSyntax(content: string): boolean {
    try {
      // Check balanced brackets and parens
      const stack: string[] = [];
      const pairs: Record<string, string> = { '{': '}', '[': ']', '(': ')' };
      const closers = new Set(Object.values(pairs));

      let inString = false;
      let stringDelim = '';

      for (let i = 0; i < content.length; i++) {
        const char = content[i];

        // Handle triple quotes
        if (!inString && content.slice(i, i + 3) === '"""') {
          inString = true;
          stringDelim = '"""';
          i += 2;
          continue;
        }
        if (inString && stringDelim === '"""' && content.slice(i, i + 3) === '"""') {
          inString = false;
          i += 2;
          continue;
        }

        if (!inString && (char === '"' || char === "'")) {
          inString = true;
          stringDelim = char;
          continue;
        }

        if (inString && char === stringDelim && stringDelim.length === 1) {
          inString = false;
          continue;
        }

        if (inString) continue;

        if (pairs[char]) {
          stack.push(pairs[char]);
        } else if (closers.has(char)) {
          if (stack.pop() !== char) {
            return false;
          }
        }
      }

      return stack.length === 0;
    } catch {
      return false;
    }
  }

  /**
   * Basic Java syntax validation
   */
  private validateJavaSyntax(content: string): boolean {
    // Use same logic as JS for brace matching
    return this.validateJSLikeSyntax(content);
  }

  /**
   * Group fixes by file for batch processing
   */
  private groupFixesByFile(fixes: CategorizedFix[]): Map<string, CategorizedFix[]> {
    const grouped = new Map<string, CategorizedFix[]>();

    for (const fix of fixes) {
      const existing = grouped.get(fix.file) || [];
      existing.push(fix);
      grouped.set(fix.file, existing);
    }

    return grouped;
  }

  /**
   * Read file content with caching
   */
  private async readFile(fullPath: string): Promise<string | null> {
    // Check cache first
    if (this.fileCache.has(fullPath)) {
      return this.fileCache.get(fullPath)!;
    }

    try {
      const content = await fs.readFile(fullPath, 'utf-8');
      this.fileCache.set(fullPath, content);
      return content;
    } catch {
      return null;
    }
  }

  /**
   * Create backup of file before modification
   */
  private async createBackup(fullPath: string, content: string): Promise<void> {
    const relativePath = path.relative(this.options.workingDir, fullPath);
    const backupPath = path.join(this.options.backupDir, relativePath);

    // Ensure backup directory exists
    await fs.mkdir(path.dirname(backupPath), { recursive: true });

    // Write backup
    await fs.writeFile(backupPath, content, 'utf-8');
  }

  /**
   * Ensure backup directory exists
   */
  private async ensureBackupDir(): Promise<void> {
    await fs.mkdir(this.options.backupDir, { recursive: true });
  }

  /**
   * Generate a single-line diff
   */
  private generateLineDiff(lineNum: number, original: string, modified: string): string {
    return [
      `@@ -${lineNum},1 +${lineNum},1 @@`,
      `-${original}`,
      `+${modified}`
    ].join('\n');
  }

  /**
   * Generate a multi-line diff
   */
  private generateMultiLineDiff(
    startLine: number,
    originalLines: string[],
    modifiedLines: string[]
  ): string {
    const header = `@@ -${startLine},${originalLines.length} +${startLine},${modifiedLines.length} @@`;
    const removals = originalLines.map(l => `-${l}`);
    const additions = modifiedLines.map(l => `+${l}`);

    return [header, ...removals, ...additions].join('\n');
  }

  /**
   * Rollback all changes to a file
   */
  async rollbackFile(filePath: string): Promise<boolean> {
    const fullPath = path.join(this.options.workingDir, filePath);
    const backupPath = path.join(this.options.backupDir, filePath);

    try {
      const backup = await fs.readFile(backupPath, 'utf-8');
      await fs.writeFile(fullPath, backup, 'utf-8');
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Rollback all changes
   */
  async rollbackAll(modifiedFiles: string[]): Promise<{ success: string[]; failed: string[] }> {
    const success: string[] = [];
    const failed: string[] = [];

    for (const file of modifiedFiles) {
      if (await this.rollbackFile(file)) {
        success.push(file);
      } else {
        failed.push(file);
      }
    }

    return { success, failed };
  }

  /**
   * Clear internal caches
   */
  clearCache(): void {
    this.fileCache.clear();
    this.pendingChanges.clear();
  }
}

/**
 * Create a new fix applicator
 */
export function createFixApplicator(options: ApplyOptions): FixApplicator {
  return new FixApplicator(options);
}
