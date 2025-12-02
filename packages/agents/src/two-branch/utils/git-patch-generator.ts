/**
 * Git Patch Generator
 *
 * Generates standard Git unified diff patches from CodeQual fix data.
 * The patches can be applied with `git apply` command.
 *
 * **Universal Solution**: Works with any IDE, any Git platform, any OS.
 */

import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import type { EnrichedIssue } from '../analyzers/v9-grouped-report-formatter';

interface PatchChange {
  file: string;
  oldStart: number;
  oldLines: number;
  newStart: number;
  newLines: number;
  oldContent: string;
  newContent: string;
  context: {
    before: string[];
    after: string[];
  };
}

export class GitPatchGenerator {
  /**
   * Generate a unified diff patch from enriched issues
   */
  public generatePatch(
    issues: EnrichedIssue[],
    repositoryPath: string,
    metadata?: {
      repository?: string;
      prNumber?: number;
      branch?: string;
    }
  ): string {
    // Group issues by file
    const fileChanges = this.groupByFile(issues);

    // Generate patch header
    let patch = this.generatePatchHeader(metadata);

    // Generate diff for each file
    for (const [file, fileIssues] of fileChanges) {
      try {
        const filePatch = this.generateFileDiff(file, fileIssues, repositoryPath);
        if (filePatch) {
          patch += filePatch;
        }
      } catch (error) {
        console.warn(`⚠️  Could not generate patch for ${file}:`, error);
        // Continue with other files
      }
    }

    return patch;
  }

  /**
   * Generate patch header with metadata
   */
  private generatePatchHeader(metadata?: {
    repository?: string;
    prNumber?: number;
    branch?: string;
  }): string {
    const timestamp = new Date().toISOString();
    let header = `# CodeQual Auto-Fix Patch\n`;
    header += `# Generated: ${timestamp}\n`;

    if (metadata?.repository) {
      header += `# Repository: ${metadata.repository}\n`;
    }
    if (metadata?.prNumber) {
      header += `# PR: #${metadata.prNumber}\n`;
    }
    if (metadata?.branch) {
      header += `# Branch: ${metadata.branch}\n`;
    }

    header += `#\n`;
    header += `# To apply this patch:\n`;
    header += `#   git apply codequal-fixes.patch\n`;
    header += `#\n`;
    header += `# To check before applying:\n`;
    header += `#   git apply --check codequal-fixes.patch\n`;
    header += `#\n\n`;

    return header;
  }

  /**
   * Group issues by file path
   */
  private groupByFile(issues: EnrichedIssue[]): Map<string, EnrichedIssue[]> {
    const grouped = new Map<string, EnrichedIssue[]>();

    for (const issue of issues) {
      if (!issue.fixSuggestion?.correctedCode) {
        continue; // Skip issues without fixes
      }

      if (!grouped.has(issue.file)) {
        grouped.set(issue.file, []);
      }
      grouped.get(issue.file)!.push(issue);
    }

    return grouped;
  }

  /**
   * Generate unified diff for a single file
   */
  private generateFileDiff(
    file: string,
    issues: EnrichedIssue[],
    repositoryPath: string
  ): string {
    // Sort issues by line number (top to bottom)
    const sortedIssues = [...issues].sort((a, b) => a.line - b.line);

    let diff = '';

    // File header
    diff += `diff --git a/${file} b/${file}\n`;
    diff += `--- a/${file}\n`;
    diff += `+++ b/${file}\n`;

    // Read original file content
    const filePath = path.join(repositoryPath, file);
    let originalLines: string[] = [];

    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf-8');
      originalLines = content.split('\n');
    } else {
      console.warn(`⚠️  File not found: ${filePath}`);
      return ''; // Skip this file
    }

    // Generate hunks for each issue
    const currentLine = 0;

    for (const issue of sortedIssues) {
      const hunk = this.generateHunk(issue, originalLines);
      if (hunk) {
        diff += hunk;
      }
    }

    return diff;
  }

  /**
   * Generate a single hunk (change section) in unified diff format
   */
  private generateHunk(issue: EnrichedIssue, originalLines: string[]): string {
    if (!issue.fixSuggestion?.correctedCode) {
      return '';
    }

    const startLine = issue.line - 1; // Convert to 0-indexed
    const contextLines = 3; // Standard git diff context

    // Determine the range of the change
    const oldContent = issue.snippet || '';
    const newContent = issue.fixSuggestion.correctedCode;

    // Calculate lines affected
    const oldLines = oldContent.split('\n').filter(l => l.trim()).length;
    const newLines = newContent.split('\n').filter(l => l.trim()).length;

    // Get context before and after
    const beforeStart = Math.max(0, startLine - contextLines);
    const beforeLines = originalLines.slice(beforeStart, startLine);

    const afterStart = Math.min(startLine + oldLines, originalLines.length);
    const afterEnd = Math.min(afterStart + contextLines, originalLines.length);
    const afterLines = originalLines.slice(afterStart, afterEnd);

    // Calculate hunk header positions (1-indexed for display)
    const oldStart = beforeStart + 1;
    const oldCount = beforeLines.length + oldLines + afterLines.length;
    const newStart = beforeStart + 1;
    const newCount = beforeLines.length + newLines + afterLines.length;

    // Generate hunk
    let hunk = `@@ -${oldStart},${oldCount} +${newStart},${newCount} @@\n`;

    // Context before
    for (const line of beforeLines) {
      hunk += ` ${line}\n`;
    }

    // Removed lines
    const oldContentLines = oldContent.split('\n').filter(l => l.trim());
    for (const line of oldContentLines) {
      hunk += `-${line}\n`;
    }

    // Added lines
    const newContentLines = newContent.split('\n').filter(l => l.trim());
    for (const line of newContentLines) {
      hunk += `+${line}\n`;
    }

    // Context after
    for (const line of afterLines) {
      hunk += ` ${line}\n`;
    }

    return hunk;
  }

  /**
   * Validate that a patch can be applied
   */
  public async validatePatch(patchContent: string, repositoryPath: string): Promise<{
    valid: boolean;
    errors: string[];
  }> {
    // Write patch to temp file
    const tempPatchPath = path.join(repositoryPath, '.codequal-temp.patch');
    fs.writeFileSync(tempPatchPath, patchContent);

    // Run git apply --check
    try {
      execSync(`git apply --check "${tempPatchPath}"`, {
        cwd: repositoryPath,
        encoding: 'utf-8'
      });

      // Clean up
      if (fs.existsSync(tempPatchPath)) {
        fs.unlinkSync(tempPatchPath);
      }

      return {
        valid: true,
        errors: []
      };
    } catch (error: any) {
      // Clean up
      if (fs.existsSync(tempPatchPath)) {
        fs.unlinkSync(tempPatchPath);
      }

      return {
        valid: false,
        errors: [error.stderr?.toString() || error.message]
      };
    }
  }
}

/**
 * Generate a simple patch from enriched issues (without repository access)
 * This generates a patch based on the fix data without reading original files.
 */
export function generateSimplePatch(
  issues: EnrichedIssue[],
  metadata?: {
    repository?: string;
    prNumber?: number;
    branch?: string;
  }
): string {
  const timestamp = new Date().toISOString();
  let patch = `# CodeQual Auto-Fix Patch\n`;
  patch += `# Generated: ${timestamp}\n`;

  if (metadata?.repository) {
    patch += `# Repository: ${metadata.repository}\n`;
  }
  if (metadata?.prNumber) {
    patch += `# PR: #${metadata.prNumber}\n`;
  }

  patch += `#\n`;
  patch += `# To apply this patch:\n`;
  patch += `#   git apply codequal-fixes.patch\n`;
  patch += `#\n\n`;

  // Group by file
  const fileGroups = new Map<string, EnrichedIssue[]>();

  for (const issue of issues) {
    if (!issue.fixSuggestion?.correctedCode) {
      continue;
    }

    if (!fileGroups.has(issue.file)) {
      fileGroups.set(issue.file, []);
    }
    fileGroups.get(issue.file)!.push(issue);
  }

  // Generate simplified diff for each file
  for (const [file, fileIssues] of fileGroups) {
    // Sort by line number
    const sorted = [...fileIssues].sort((a, b) => a.line - b.line);

    patch += `diff --git a/${file} b/${file}\n`;
    patch += `--- a/${file}\n`;
    patch += `+++ b/${file}\n`;

    for (const issue of sorted) {
      const oldLines = (issue.snippet || '').split('\n').filter(l => l.trim()).length || 1;
      const newLines = (issue.fixSuggestion?.correctedCode || '').split('\n').filter(l => l.trim()).length || 1;

      const startLine = issue.line;

      patch += `@@ -${startLine},${oldLines} +${startLine},${newLines} @@\n`;

      // Remove old lines
      if (issue.snippet) {
        const snippetLines = issue.snippet.split('\n');
        for (const line of snippetLines) {
          if (line.trim()) {
            patch += `-${line}\n`;
          }
        }
      }

      // Add new lines
      if (issue.fixSuggestion?.correctedCode) {
        const fixLines = issue.fixSuggestion.correctedCode.split('\n');
        for (const line of fixLines) {
          if (line.trim()) {
            patch += `+${line}\n`;
          }
        }
      }
    }

    patch += '\n';
  }

  return patch;
}
