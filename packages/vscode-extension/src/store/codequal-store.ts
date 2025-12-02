/**
 * Central data store for CodeQual extension
 * Manages SARIF data, LSP actions, and provides unified access to issues and fixes
 */

import * as vscode from 'vscode';
import * as path from 'path';
import {
  SarifLog,
  LSPActionsFile,
  CodeQualIssue,
  CodeQualFix,
  IssueStatistics,
  SarifResult,
  LSPCodeAction,
} from '../types';

export class CodeQualStore {
  private sarifData: SarifLog | null = null;
  private lspActions: LSPActionsFile | null = null;
  private issuesMap: Map<string, CodeQualIssue[]> = new Map();
  private statistics: IssueStatistics = {
    total: 0,
    errors: 0,
    warnings: 0,
    information: 0,
    hints: 0,
    fixable: 0,
  };

  private onDidChangeEmitter = new vscode.EventEmitter<void>();
  public readonly onDidChange = this.onDidChangeEmitter.event;

  // Singleton - use getInstance() instead

  // ============================================================================
  // SARIF Management
  // ============================================================================

  public setSarifData(sarif: SarifLog): void {
    this.sarifData = sarif;
    this.rebuildIssuesMap();
    this.onDidChangeEmitter.fire();
  }

  public getSarifData(): SarifLog | null {
    return this.sarifData;
  }

  public clearSarifData(): void {
    this.sarifData = null;
    this.rebuildIssuesMap();
    this.onDidChangeEmitter.fire();
  }

  // ============================================================================
  // LSP Actions Management
  // ============================================================================

  public setLSPActions(actions: LSPActionsFile | LSPCodeAction[]): void {
    // Handle both formats: { actions: [...] } or just [...]
    if (Array.isArray(actions)) {
      this.lspActions = { actions };
    } else {
      this.lspActions = actions;
    }
    this.rebuildIssuesMap();
    this.onDidChangeEmitter.fire();
  }

  public getLSPActions(): LSPActionsFile | null {
    return this.lspActions;
  }

  public clearLSPActions(): void {
    this.lspActions = null;
    this.rebuildIssuesMap();
    this.onDidChangeEmitter.fire();
  }

  // ============================================================================
  // Issues Access
  // ============================================================================

  public getAllIssues(): CodeQualIssue[] {
    const allIssues: CodeQualIssue[] = [];
    for (const issues of this.issuesMap.values()) {
      allIssues.push(...issues);
    }
    return allIssues;
  }

  public getIssuesForFile(uri: vscode.Uri): CodeQualIssue[] {
    // Direct match first
    const directMatch = this.issuesMap.get(uri.fsPath);
    if (directMatch) {
      return directMatch;
    }

    // Try to find a matching key by checking if uri.fsPath ends with any stored key
    // This handles relative vs absolute path mismatches
    for (const [storedPath, issues] of this.issuesMap.entries()) {
      // Check if the full path ends with the stored relative path
      if (uri.fsPath.endsWith(storedPath) || uri.fsPath.endsWith('/' + storedPath)) {
        return issues;
      }
      // Check if the stored path ends with the filename from uri
      const uriFilename = uri.fsPath.split('/').pop();
      const storedFilename = storedPath.split('/').pop();
      if (uriFilename === storedFilename) {
        // Further verify by checking more path segments
        const uriSegments = uri.fsPath.split('/');
        const storedSegments = storedPath.split('/');
        let match = true;
        for (let i = 1; i <= Math.min(storedSegments.length, uriSegments.length); i++) {
          if (storedSegments[storedSegments.length - i] !== uriSegments[uriSegments.length - i]) {
            match = false;
            break;
          }
        }
        if (match) {
          return issues;
        }
      }
    }

    return [];
  }

  public getIssuesGroupedByFile(): Map<string, CodeQualIssue[]> {
    return new Map(this.issuesMap);
  }

  public getIssueById(id: string): CodeQualIssue | undefined {
    for (const issues of this.issuesMap.values()) {
      const issue = issues.find((i) => i.id === id);
      if (issue) {
        return issue;
      }
    }
    return undefined;
  }

  /**
   * Removes fixed issues from the store and updates diagnostics
   */
  public removeIssues(issuesToRemove: CodeQualIssue[]): void {
    if (issuesToRemove.length === 0) return;

    console.log(`[CodeQual Store] Removing ${issuesToRemove.length} fixed issues from store`);

    // Create a set of issue IDs for fast lookup
    const idsToRemove = new Set(issuesToRemove.map((i) => i.id));

    // Remove from issues map
    for (const [filePath, issues] of this.issuesMap.entries()) {
      const remaining = issues.filter((i) => !idsToRemove.has(i.id));
      if (remaining.length === 0) {
        this.issuesMap.delete(filePath);
      } else if (remaining.length !== issues.length) {
        this.issuesMap.set(filePath, remaining);
      }
    }

    // Recalculate statistics
    this.recalculateStatistics();

    // Notify listeners (this will update diagnostics and status bar)
    this.onDidChangeEmitter.fire();

    console.log(`[CodeQual Store] After removal: ${this.statistics.total} issues remaining`);
  }

  /**
   * Recalculates statistics from current issues
   */
  private recalculateStatistics(): void {
    this.statistics = {
      total: 0,
      errors: 0,
      warnings: 0,
      information: 0,
      hints: 0,
      fixable: 0,
    };

    for (const issues of this.issuesMap.values()) {
      for (const issue of issues) {
        this.statistics.total++;
        if (issue.fix) this.statistics.fixable++;

        switch (issue.severity) {
          case 'error':
            this.statistics.errors++;
            break;
          case 'warning':
            this.statistics.warnings++;
            break;
          case 'information':
            this.statistics.information++;
            break;
          case 'hint':
            this.statistics.hints++;
            break;
        }
      }
    }
  }

  // ============================================================================
  // Statistics
  // ============================================================================

  public getStatistics(): IssueStatistics {
    return { ...this.statistics };
  }

  public hasData(): boolean {
    return this.sarifData !== null || this.lspActions !== null;
  }

  // ============================================================================
  // Clear All
  // ============================================================================

  public clear(): void {
    this.sarifData = null;
    this.lspActions = null;
    this.issuesMap.clear();
    this.statistics = {
      total: 0,
      errors: 0,
      warnings: 0,
      information: 0,
      hints: 0,
      fixable: 0,
    };
    this.onDidChangeEmitter.fire();
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private rebuildIssuesMap(): void {
    this.issuesMap.clear();
    this.statistics = {
      total: 0,
      errors: 0,
      warnings: 0,
      information: 0,
      hints: 0,
      fixable: 0,
    };

    // Build a map of LSP fixes by location for matching with SARIF issues
    const lspFixesByLocation = this.buildLSPFixesMap();

    // Process SARIF data as the primary source of issues
    if (this.sarifData) {
      for (const run of this.sarifData.runs) {
        if (run.results) {
          for (const result of run.results) {
            this.addSarifResult(result, lspFixesByLocation);
          }
        }
      }
    }

    // If we only have LSP data (no SARIF), create issues from LSP actions
    // This allows the extension to work with LSP-only workflows
    if (!this.sarifData && this.lspActions) {
      for (const action of this.lspActions.actions) {
        this.addLSPAction(action);
      }
    }
  }

  /**
   * Build a map of LSP fixes indexed by file:line for fast lookup
   */
  private buildLSPFixesMap(): Map<string, LSPCodeAction[]> {
    const fixesMap = new Map<string, LSPCodeAction[]>();

    if (!this.lspActions) {
      return fixesMap;
    }

    for (const action of this.lspActions.actions) {
      // Index by diagnostic location if available
      if (action.diagnostics && action.diagnostics.length > 0) {
        for (const diagnostic of action.diagnostics) {
          const uri = diagnostic.data && typeof diagnostic.data === 'object' && 'uri' in diagnostic.data
            ? this.normalizeUri((diagnostic.data as { uri: string }).uri)
            : '';

          if (uri) {
            const line = diagnostic.range.start.line;
            const key = `${uri}:${line}`;
            if (!fixesMap.has(key)) {
              fixesMap.set(key, []);
            }
            fixesMap.get(key)!.push(action);
          }
        }
      }

      // Index by EACH edit location in the changes (handles bulk "Apply All" actions)
      if (action.edit?.changes) {
        for (const [originalUri, edits] of Object.entries(action.edit.changes)) {
          const normalizedUri = this.normalizeUri(originalUri);
          for (const edit of edits as any[]) {
            const line = edit.range.start.line;
            const key = `${normalizedUri}:${line}`;
            if (!fixesMap.has(key)) {
              fixesMap.set(key, []);
            }
            // Create a per-edit action with just this edit
            const singleEditAction: LSPCodeAction = {
              title: action.title,
              kind: action.kind,
              edit: {
                changes: {
                  [originalUri]: [edit]
                }
              }
            };
            fixesMap.get(key)!.push(singleEditAction);
          }
        }
      }

      if (action.edit?.documentChanges) {
        for (const docChange of action.edit.documentChanges) {
          const normalizedUri = this.normalizeUri(docChange.textDocument.uri);
          for (const edit of docChange.edits || []) {
            const line = edit.range.start.line;
            const key = `${normalizedUri}:${line}`;
            if (!fixesMap.has(key)) {
              fixesMap.set(key, []);
            }
            // Create a per-edit action
            const singleEditAction: LSPCodeAction = {
              title: action.title,
              kind: action.kind,
              edit: {
                documentChanges: [{
                  textDocument: docChange.textDocument,
                  edits: [edit]
                }]
              }
            };
            fixesMap.get(key)!.push(singleEditAction);
          }
        }
      }
    }

    return fixesMap;
  }

  private addSarifResult(result: SarifResult, lspFixesByLocation: Map<string, LSPCodeAction[]>): void {
    if (!result.locations || result.locations.length === 0) {
      return;
    }

    const location = result.locations[0];
    const physicalLocation = location.physicalLocation;

    if (!physicalLocation?.artifactLocation?.uri || !physicalLocation.region) {
      return;
    }

    const filePath = this.normalizeUri(physicalLocation.artifactLocation.uri);
    const range = this.sarifRegionToVSCodeRange(physicalLocation.region);

    // Try to find matching LSP fix for this issue
    let fix: CodeQualFix | undefined;

    // First check if SARIF result has its own fix
    if (result.fixes && result.fixes.length > 0) {
      console.log(`[CodeQual Store] SARIF has ${result.fixes.length} fixes for ${result.ruleId}`);
      fix = this.sarifFixToCodeQualFix(result.fixes[0], result.ruleId);
      if (fix) {
        console.log(`[CodeQual Store] Created fix from SARIF: ${fix.title} with ${fix.edits.length} edits`);
      } else {
        console.log(`[CodeQual Store] SARIF fix conversion returned undefined`);
      }
    }

    // If no SARIF fix, try to find matching LSP fix by file:line
    if (!fix) {
      const key = `${filePath}:${range.start.line}`;
      const lspActions = lspFixesByLocation.get(key);
      console.log(`[CodeQual Store] Looking for LSP fix at ${key}, found: ${lspActions?.length || 0}`);
      if (lspActions && lspActions.length > 0) {
        // Use the first matching LSP action
        const action = lspActions[0];
        if (action.edit) {
          // Generate a descriptive title based on the SARIF issue
          const ruleId = result.ruleId || 'unknown';

          // Always use CodeQual-branded title for clarity
          const fixTitle = `CodeQual Fix: ${ruleId}`;

          fix = this.lspEditToCodeQualFix(fixTitle, action.edit);
          console.log(`[CodeQual Store] Created fix from LSP: ${fix?.title}`);
        }
      }
    }

    const severity = this.sarifLevelToSeverity(result.level || 'warning');
    const issue: CodeQualIssue = {
      id: `sarif-${result.ruleId || 'unknown'}-${filePath}-${range.start.line}-${range.start.character}`,
      ruleId: result.ruleId || 'unknown',
      message: result.message.text,
      severity,
      file: filePath,
      range,
      source: 'sarif',
      fix,
      properties: result.properties,
    };

    this.addIssue(filePath, issue);
  }

  private addLSPAction(action: LSPCodeAction): void {
    // LSP actions may not have diagnostics, but should have edits
    if (!action.edit?.changes && !action.edit?.documentChanges) {
      return;
    }

    // Extract file URIs from edits
    const fileUris = new Set<string>();
    if (action.edit.changes) {
      for (const uri of Object.keys(action.edit.changes)) {
        fileUris.add(this.normalizeUri(uri));
      }
    }
    if (action.edit.documentChanges) {
      for (const docChange of action.edit.documentChanges) {
        fileUris.add(this.normalizeUri(docChange.textDocument.uri));
      }
    }

    // If there are diagnostics, create issues from them
    if (action.diagnostics && action.diagnostics.length > 0) {
      for (const diagnostic of action.diagnostics) {
        const uri = diagnostic.data && typeof diagnostic.data === 'object' && 'uri' in diagnostic.data
          ? this.normalizeUri((diagnostic.data as { uri: string }).uri)
          : Array.from(fileUris)[0] || '';

        if (!uri) {
          continue;
        }

        const range = this.lspRangeToVSCodeRange(diagnostic.range);
        const severity = this.lspSeverityToVSCodeSeverity(diagnostic.severity || 2);

        const issue: CodeQualIssue = {
          id: `lsp-${diagnostic.code || 'unknown'}-${uri}-${range.start.line}-${range.start.character}`,
          ruleId: String(diagnostic.code || 'unknown'),
          message: diagnostic.message,
          severity,
          file: uri,
          range,
          source: 'lsp',
          fix: action.edit ? this.lspEditToCodeQualFix(action.title, action.edit) : undefined,
        };

        this.addIssue(uri, issue);
      }
    } else {
      // Create a single issue for the action if no diagnostics
      const uri = Array.from(fileUris)[0];
      if (uri) {
        const issue: CodeQualIssue = {
          id: `lsp-action-${action.title}-${uri}`,
          ruleId: action.kind || 'quickfix',
          message: action.title,
          severity: 'information',
          file: uri,
          range: new vscode.Range(0, 0, 0, 0),
          source: 'lsp',
          fix: action.edit ? this.lspEditToCodeQualFix(action.title, action.edit) : undefined,
        };

        this.addIssue(uri, issue);
      }
    }
  }

  private addIssue(filePath: string, issue: CodeQualIssue): void {
    if (!this.issuesMap.has(filePath)) {
      this.issuesMap.set(filePath, []);
    }
    this.issuesMap.get(filePath)!.push(issue);

    // Update statistics
    this.statistics.total++;
    switch (issue.severity) {
      case 'error':
        this.statistics.errors++;
        break;
      case 'warning':
        this.statistics.warnings++;
        break;
      case 'information':
        this.statistics.information++;
        break;
      case 'hint':
        this.statistics.hints++;
        break;
    }
    if (issue.fix) {
      this.statistics.fixable++;
    }
  }

  // ============================================================================
  // Conversion Helpers
  // ============================================================================

  private normalizeUri(uri: string): string {
    // Remove file:// prefix if present
    let normalized = uri.replace(/^file:\/\//, '');

    // Handle Windows paths - remove leading slash for drive letters
    if (process.platform === 'win32') {
      normalized = normalized.replace(/^\/([A-Za-z]:)/, '$1');
    }

    // BUG-086 FIX: Strip /tmp/test-repo-xxx/ prefix from cloud analysis paths
    // Cloud analyzer clones repos to temp directories, but we need relative paths
    // to match against local workspace files
    const cloudPathMatch = normalized.match(/^\/tmp\/test-repo-\d+\/(.+)$/);
    if (cloudPathMatch) {
      normalized = cloudPathMatch[1]; // Extract the relative path portion
    }

    // Just clean up the URI - don't try to resolve paths at load time
    // Path resolution will happen at apply time in LSPCodeActionProvider.resolveFilePath()
    return normalized;
  }

  private sarifRegionToVSCodeRange(region: any): vscode.Range {
    const startLine = (region.startLine || 1) - 1; // SARIF is 1-based
    const startColumn = (region.startColumn || 1) - 1;
    const endLine = (region.endLine || region.startLine || 1) - 1;
    const endColumn = region.endColumn ? region.endColumn - 1 : startColumn + 1;

    return new vscode.Range(startLine, startColumn, endLine, endColumn);
  }

  private lspRangeToVSCodeRange(range: any): vscode.Range {
    return new vscode.Range(
      range.start.line,
      range.start.character,
      range.end.line,
      range.end.character
    );
  }

  private sarifLevelToSeverity(level: string): 'error' | 'warning' | 'information' | 'hint' {
    switch (level) {
      case 'error':
        return 'error';
      case 'warning':
        return 'warning';
      case 'note':
        return 'information';
      case 'none':
        return 'hint';
      default:
        return 'warning';
    }
  }

  private lspSeverityToVSCodeSeverity(severity: number): 'error' | 'warning' | 'information' | 'hint' {
    switch (severity) {
      case 1:
        return 'error';
      case 2:
        return 'warning';
      case 3:
        return 'information';
      case 4:
        return 'hint';
      default:
        return 'warning';
    }
  }

  private sarifFixToCodeQualFix(fix: any, ruleId?: string): CodeQualFix | undefined {
    if (!fix.artifactChanges || fix.artifactChanges.length === 0) {
      return undefined;
    }

    const edits: vscode.TextEdit[] = [];
    for (const change of fix.artifactChanges) {
      for (const replacement of change.replacements) {
        const range = this.sarifRegionToVSCodeRange(replacement.deletedRegion);
        const newText = replacement.insertedContent?.text || '';
        edits.push(vscode.TextEdit.replace(range, newText));
      }
    }

    // Use CodeQual-branded title
    const title = ruleId ? `CodeQual Fix: ${ruleId}` : 'CodeQual Fix';

    return {
      title,
      edits,
      isPreferred: true,
    };
  }

  private lspEditToCodeQualFix(title: string, edit: any): CodeQualFix | undefined {
    const edits: vscode.TextEdit[] = [];

    if (edit.changes) {
      for (const textEdits of Object.values(edit.changes) as any[]) {
        for (const textEdit of textEdits) {
          const range = this.lspRangeToVSCodeRange(textEdit.range);
          edits.push(vscode.TextEdit.replace(range, textEdit.newText));
        }
      }
    }

    if (edit.documentChanges) {
      for (const docChange of edit.documentChanges) {
        for (const textEdit of docChange.edits) {
          const range = this.lspRangeToVSCodeRange(textEdit.range);
          edits.push(vscode.TextEdit.replace(range, textEdit.newText));
        }
      }
    }

    return edits.length > 0
      ? {
          title,
          edits,
          isPreferred: false,
        }
      : undefined;
  }

  public dispose(): void {
    this.onDidChangeEmitter.dispose();
  }
}
