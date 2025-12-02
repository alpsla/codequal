/**
 * Converts SARIF data to VSCode diagnostics
 * Creates squiggly lines and error markers in the editor
 */

import * as vscode from 'vscode';
import { CodeQualStore } from '../store/codequal-store';
import { CodeQualIssue } from '../types';
import { resolveFileUri } from '../utils/path-resolver';

export class SarifDiagnosticProvider {
  private diagnosticCollection: vscode.DiagnosticCollection;
  private store: CodeQualStore;

  constructor(store: CodeQualStore) {
    this.store = store;
    this.diagnosticCollection = vscode.languages.createDiagnosticCollection('codequal');

    // Listen for store changes
    this.store.onDidChange(() => {
      this.updateDiagnostics();
    });

    // Listen for workspace changes
    vscode.workspace.onDidChangeTextDocument((e) => {
      // Optionally re-validate diagnostics when document changes
      this.updateDiagnosticsForDocument(e.document.uri);
    });

    vscode.workspace.onDidCloseTextDocument((doc) => {
      // Keep diagnostics even when document is closed
      // They will still show in Problems panel
    });
  }

  /**
   * Updates diagnostics for all files
   */
  public updateDiagnostics(): void {
    // Clear existing diagnostics
    this.diagnosticCollection.clear();

    // Check if diagnostics should be shown
    const config = vscode.workspace.getConfiguration('codequal');
    const showDiagnostics = config.get<boolean>('showDiagnostics', true);

    if (!showDiagnostics) {
      return;
    }

    // Get all issues grouped by file
    const issuesByFile = this.store.getIssuesGroupedByFile();

    // Convert to diagnostics
    for (const [filePath, issues] of issuesByFile.entries()) {
      const uri = resolveFileUri(filePath);
      const diagnostics = issues.map((issue) => this.issueToDiagnostic(issue));
      this.diagnosticCollection.set(uri, diagnostics);
    }
  }

  /**
   * Updates diagnostics for a single document
   */
  public updateDiagnosticsForDocument(uri: vscode.Uri): void {
    const config = vscode.workspace.getConfiguration('codequal');
    const showDiagnostics = config.get<boolean>('showDiagnostics', true);

    if (!showDiagnostics) {
      this.diagnosticCollection.delete(uri);
      return;
    }

    const issues = this.store.getIssuesForFile(uri);
    const diagnostics = issues.map((issue) => this.issueToDiagnostic(issue));
    this.diagnosticCollection.set(uri, diagnostics);
  }

  /**
   * Clears all diagnostics
   */
  public clear(): void {
    this.diagnosticCollection.clear();
  }

  /**
   * Converts a CodeQualIssue to a VSCode Diagnostic
   */
  private issueToDiagnostic(issue: CodeQualIssue): vscode.Diagnostic {
    const diagnostic = new vscode.Diagnostic(
      issue.range,
      issue.message,
      this.severityToDiagnosticSeverity(issue.severity)
    );

    diagnostic.source = `CodeQual (${issue.source})`;
    diagnostic.code = issue.ruleId;

    // Add tags
    const tags: vscode.DiagnosticTag[] = [];
    if (issue.properties?.deprecated) {
      tags.push(vscode.DiagnosticTag.Deprecated);
    }
    if (issue.properties?.unnecessary) {
      tags.push(vscode.DiagnosticTag.Unnecessary);
    }
    if (tags.length > 0) {
      diagnostic.tags = tags;
    }

    // Add related information if available
    if (issue.properties?.relatedLocations) {
      const related = issue.properties.relatedLocations as any[];
      diagnostic.relatedInformation = related.map((loc) => {
        return new vscode.DiagnosticRelatedInformation(
          new vscode.Location(
            vscode.Uri.file(loc.file || issue.file),
            new vscode.Range(
              loc.line || 0,
              loc.column || 0,
              loc.line || 0,
              (loc.column || 0) + 1
            )
          ),
          loc.message || 'Related location'
        );
      });
    }

    return diagnostic;
  }

  /**
   * Converts our severity to VSCode DiagnosticSeverity
   */
  private severityToDiagnosticSeverity(severity: string): vscode.DiagnosticSeverity {
    switch (severity) {
      case 'error':
        return vscode.DiagnosticSeverity.Error;
      case 'warning':
        return vscode.DiagnosticSeverity.Warning;
      case 'information':
        return vscode.DiagnosticSeverity.Information;
      case 'hint':
        return vscode.DiagnosticSeverity.Hint;
      default:
        return vscode.DiagnosticSeverity.Warning;
    }
  }

  /**
   * Gets diagnostics for a specific URI
   */
  public getDiagnostics(uri: vscode.Uri): readonly vscode.Diagnostic[] {
    return this.diagnosticCollection.get(uri) || [];
  }

  /**
   * Gets the diagnostic collection
   */
  public getCollection(): vscode.DiagnosticCollection {
    return this.diagnosticCollection;
  }

  public dispose(): void {
    this.diagnosticCollection.dispose();
  }
}
