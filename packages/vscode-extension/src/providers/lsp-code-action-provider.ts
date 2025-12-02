/**
 * Provides code actions (quick fixes) from LSP data
 * Shows lightbulb actions in the editor
 */

import * as vscode from 'vscode';
import { CodeQualStore } from '../store/codequal-store';
import { CodeQualIssue } from '../types';
import { resolveFilePath } from '../utils/path-resolver';

export class LSPCodeActionProvider implements vscode.CodeActionProvider {
  private store: CodeQualStore;

  public static readonly providedCodeActionKinds = [
    vscode.CodeActionKind.QuickFix,
    vscode.CodeActionKind.RefactorRewrite,
  ];

  constructor(store: CodeQualStore) {
    this.store = store;
  }

  /**
   * Provides code actions for the given document and range
   */
  public provideCodeActions(
    document: vscode.TextDocument,
    range: vscode.Range | vscode.Selection,
    context: vscode.CodeActionContext,
    token: vscode.CancellationToken
  ): vscode.ProviderResult<(vscode.CodeAction | vscode.Command)[]> {
    console.log(`[CodeQual CodeAction] === provideCodeActions called ===`);
    console.log(`[CodeQual CodeAction] Document: ${document.uri.fsPath}`);
    console.log(`[CodeQual CodeAction] Range: L${range.start.line}:${range.start.character} - L${range.end.line}:${range.end.character}`);
    console.log(`[CodeQual CodeAction] Context diagnostics: ${context.diagnostics.length}`);

    // First try: Check if any context diagnostics are from CodeQual
    const codequalDiagnostics = context.diagnostics.filter(d =>
      d.source?.startsWith('CodeQual')
    );

    console.log(`[CodeQual CodeAction] CodeQual diagnostics in context: ${codequalDiagnostics.length}`);

    // Get issues for this file
    const issues = this.store.getIssuesForFile(document.uri);
    console.log(`[CodeQual CodeAction] Found ${issues.length} issues in store for this file`);

    // If no issues found directly, try to find by matching diagnostics
    let relevantIssues: CodeQualIssue[] = [];

    if (issues.length > 0) {
      // Find issues that intersect with the current range
      relevantIssues = issues.filter((issue) => {
        const intersects = issue.range.intersection(range) !== undefined;
        return intersects;
      });
      console.log(`[CodeQual CodeAction] ${relevantIssues.length} issues intersect with cursor range`);
    }

    // Fallback: If we have CodeQual diagnostics but no issues, try to match by range
    if (relevantIssues.length === 0 && codequalDiagnostics.length > 0) {
      console.log(`[CodeQual CodeAction] Trying fallback: matching by diagnostic range`);

      // Get ALL issues from store and find ones matching the diagnostic
      const allIssues = this.store.getAllIssues();
      console.log(`[CodeQual CodeAction] Total issues in store: ${allIssues.length}`);

      for (const diagnostic of codequalDiagnostics) {
        // Find issues that match this diagnostic's range and message
        const matchingIssues = allIssues.filter(issue => {
          const rangeMatch = issue.range.start.line === diagnostic.range.start.line;
          const messageMatch = issue.message === diagnostic.message;
          const codeMatch = issue.ruleId === diagnostic.code;

          if (rangeMatch && (messageMatch || codeMatch)) {
            console.log(`[CodeQual CodeAction] Found matching issue: ${issue.ruleId} at line ${issue.range.start.line}`);
            return true;
          }
          return false;
        });

        relevantIssues.push(...matchingIssues);
      }
    }

    if (relevantIssues.length === 0) {
      console.log(`[CodeQual CodeAction] No relevant issues found, returning empty`);
      return [];
    }

    console.log(`[CodeQual CodeAction] Processing ${relevantIssues.length} relevant issues`);

    // Create code actions for each issue with a fix
    const actions: vscode.CodeAction[] = [];

    for (const issue of relevantIssues) {
      if (issue.fix) {
        const action = this.createCodeAction(document, issue);
        if (action) {
          actions.push(action);
        }
      }
    }

    // Add "Fix All" action if multiple fixes available
    if (actions.length > 1) {
      const fixAllAction = this.createFixAllAction(document, relevantIssues);
      if (fixAllAction) {
        actions.unshift(fixAllAction);
      }
    }

    return actions;
  }

  /**
   * Creates a code action for a single issue
   */
  private createCodeAction(
    document: vscode.TextDocument,
    issue: CodeQualIssue
  ): vscode.CodeAction | undefined {
    if (!issue.fix) {
      return undefined;
    }

    const action = new vscode.CodeAction(
      issue.fix.title,
      vscode.CodeActionKind.QuickFix
    );

    action.edit = new vscode.WorkspaceEdit();

    // Apply all edits from the fix
    for (const edit of issue.fix.edits) {
      action.edit.replace(document.uri, edit.range, edit.newText);
    }

    // Set as preferred if marked
    action.isPreferred = issue.fix.isPreferred || false;

    // Add diagnostics that this action fixes
    const diagnostics = this.getDiagnosticsForIssue(document.uri, issue);
    if (diagnostics.length > 0) {
      action.diagnostics = diagnostics;
    }

    return action;
  }

  /**
   * Creates a "Fix All" action for multiple issues
   */
  private createFixAllAction(
    document: vscode.TextDocument,
    issues: CodeQualIssue[]
  ): vscode.CodeAction | undefined {
    const fixableIssues = issues.filter((i) => i.fix);

    if (fixableIssues.length === 0) {
      return undefined;
    }

    const action = new vscode.CodeAction(
      `Fix all (${fixableIssues.length} issues)`,
      vscode.CodeActionKind.QuickFix
    );

    action.edit = new vscode.WorkspaceEdit();

    // Collect all edits
    const allEdits: vscode.TextEdit[] = [];
    for (const issue of fixableIssues) {
      if (issue.fix) {
        allEdits.push(...issue.fix.edits);
      }
    }

    // Sort edits by position (bottom to top) to avoid offset issues
    allEdits.sort((a, b) => {
      const lineDiff = b.range.start.line - a.range.start.line;
      if (lineDiff !== 0) {
        return lineDiff;
      }
      return b.range.start.character - a.range.start.character;
    });

    // Apply edits
    for (const edit of allEdits) {
      action.edit.replace(document.uri, edit.range, edit.newText);
    }

    return action;
  }

  /**
   * Gets diagnostics associated with an issue
   */
  private getDiagnosticsForIssue(
    uri: vscode.Uri,
    issue: CodeQualIssue
  ): vscode.Diagnostic[] {
    const allDiagnostics = vscode.languages.getDiagnostics(uri);

    return allDiagnostics.filter((diagnostic) => {
      return (
        diagnostic.code === issue.ruleId &&
        diagnostic.range.isEqual(issue.range) &&
        diagnostic.message === issue.message
      );
    });
  }

  /**
   * Applies a fix for a specific issue
   */
  public async applyFix(issue: CodeQualIssue): Promise<boolean> {
    if (!issue.fix) {
      vscode.window.showWarningMessage('No fix available for this issue');
      return false;
    }

    const resolvedPath = resolveFilePath(issue.file);
    const uri = vscode.Uri.file(resolvedPath);
    const document = await vscode.workspace.openTextDocument(uri);

    const edit = new vscode.WorkspaceEdit();
    for (const textEdit of issue.fix.edits) {
      edit.replace(uri, textEdit.range, textEdit.newText);
    }

    const success = await vscode.workspace.applyEdit(edit);

    if (success) {
      await document.save();
      vscode.window.showInformationMessage(`Fixed: ${issue.ruleId}`);
    } else {
      vscode.window.showErrorMessage(`Failed to apply fix for: ${issue.ruleId}`);
    }

    return success;
  }

  /**
   * Applies fixes for multiple issues with progress tracking and detailed feedback
   */
  public async applyFixes(issues: CodeQualIssue[]): Promise<number> {
    const fixableIssues = issues.filter((i) => i.fix);
    const noFixIssues = issues.filter((i) => !i.fix);

    if (fixableIssues.length === 0) {
      vscode.window.showInformationMessage('No fixable issues found');
      return 0;
    }

    // Group issues by file
    const issuesByFile = new Map<string, CodeQualIssue[]>();
    for (const issue of fixableIssues) {
      if (!issuesByFile.has(issue.file)) {
        issuesByFile.set(issue.file, []);
      }
      issuesByFile.get(issue.file)!.push(issue);
    }

    // Track results
    let successCount = 0;
    let failedCount = 0;
    const failedFiles: string[] = [];
    const fixedIssues: CodeQualIssue[] = [];

    // Show progress
    await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: 'Applying CodeQual fixes',
        cancellable: true,
      },
      async (progress, token) => {
        const totalFiles = issuesByFile.size;
        let processedFiles = 0;

        for (const [filePath, fileIssues] of issuesByFile.entries()) {
          if (token.isCancellationRequested) {
            break;
          }

          processedFiles++;
          const percentage = Math.round((processedFiles / totalFiles) * 100);
          progress.report({
            increment: 100 / totalFiles,
            message: `File ${processedFiles}/${totalFiles} (${percentage}%)`,
          });

          const resolvedPath = resolveFilePath(filePath);
          console.log(`[CodeQual Fixes] Processing file: ${filePath} -> ${resolvedPath}`);

          const uri = vscode.Uri.file(resolvedPath);

          let document: vscode.TextDocument;
          try {
            document = await vscode.workspace.openTextDocument(uri);
          } catch (error) {
            console.error(`[CodeQual Fixes] Failed to open file: ${resolvedPath}`, error);
            failedCount += fileIssues.length;
            failedFiles.push(filePath);
            continue;
          }

          const edit = new vscode.WorkspaceEdit();

          // Collect all edits for this file
          const allEdits: vscode.TextEdit[] = [];
          for (const issue of fileIssues) {
            if (issue.fix) {
              allEdits.push(...issue.fix.edits);
            }
          }

          // Sort edits by position (bottom to top) to avoid offset issues
          allEdits.sort((a, b) => {
            const lineDiff = b.range.start.line - a.range.start.line;
            if (lineDiff !== 0) {
              return lineDiff;
            }
            return b.range.start.character - a.range.start.character;
          });

          // Apply edits
          for (const textEdit of allEdits) {
            edit.replace(uri, textEdit.range, textEdit.newText);
          }

          const success = await vscode.workspace.applyEdit(edit);
          console.log(`[CodeQual Fixes] Apply edit result for ${resolvedPath}: ${success}`);

          if (success) {
            await document.save();
            successCount += fileIssues.length;
            fixedIssues.push(...fileIssues);
          } else {
            failedCount += fileIssues.length;
            failedFiles.push(filePath);
            console.warn(`[CodeQual Fixes] Edit failed for ${resolvedPath} - file may have changed since analysis`);
          }
        }
      }
    );

    // Remove fixed issues from the store
    if (fixedIssues.length > 0) {
      this.store.removeIssues(fixedIssues);
    }

    // Show detailed result message
    this.showFixResultMessage(successCount, failedCount, noFixIssues.length, failedFiles);

    return successCount;
  }

  /**
   * Shows a detailed result message to the user
   */
  private showFixResultMessage(
    successCount: number,
    failedCount: number,
    skippedCount: number,
    failedFiles: string[]
  ): void {
    const parts: string[] = [];

    if (successCount > 0) {
      parts.push(`${successCount} fixed`);
    }
    if (failedCount > 0) {
      parts.push(`${failedCount} failed`);
    }
    if (skippedCount > 0) {
      parts.push(`${skippedCount} no fix available`);
    }

    const message = `CodeQual: ${parts.join(', ')}`;

    if (failedCount > 0) {
      // Show warning with option to see details
      vscode.window
        .showWarningMessage(message, 'Show Details')
        .then((selection) => {
          if (selection === 'Show Details') {
            const detail = [
              `Fix Results:`,
              `  - Successfully fixed: ${successCount}`,
              `  - Failed (stale data): ${failedCount}`,
              `  - No fix available: ${skippedCount}`,
              ``,
              `Failed files (re-run analysis to get fresh fixes):`,
              ...failedFiles.map((f) => `  - ${f}`),
            ].join('\n');

            vscode.window.showInformationMessage(detail, { modal: true });
          }
        });
    } else if (successCount > 0) {
      vscode.window.showInformationMessage(message);
    } else {
      vscode.window.showInformationMessage('No fixes were applied');
    }
  }

  /**
   * Applies all fixes for a specific file
   */
  public async applyFixesForFile(uri: vscode.Uri): Promise<number> {
    const issues = this.store.getIssuesForFile(uri);
    return await this.applyFixes(issues);
  }

  /**
   * Applies all fixes in the workspace
   */
  public async applyAllFixes(): Promise<number> {
    const allIssues = this.store.getAllIssues();
    return await this.applyFixes(allIssues);
  }

  /**
   * Applies fixes filtered by severity
   */
  public async applyFixesBySeverity(severity: 'error' | 'warning' | 'information' | 'hint'): Promise<number> {
    const allIssues = this.store.getAllIssues();
    const filteredIssues = allIssues.filter((i) => i.severity === severity);
    return await this.applyFixes(filteredIssues);
  }
}
