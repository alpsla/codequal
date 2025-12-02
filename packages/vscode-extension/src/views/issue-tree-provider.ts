/**
 * Tree view provider for the CodeQual sidebar
 * Shows issues grouped by file
 */

import * as vscode from 'vscode';
import * as path from 'path';
import { CodeQualStore } from '../store/codequal-store';
import { CodeQualIssue } from '../types';
import { resolveFileUri } from '../utils/path-resolver';

class IssueTreeItem extends vscode.TreeItem {
  constructor(
    public readonly label: string,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState,
    public readonly issue?: CodeQualIssue,
    public readonly filePath?: string
  ) {
    super(label, collapsibleState);

    if (issue) {
      // Issue item
      this.tooltip = issue.message;
      this.description = `Line ${issue.range.start.line + 1}`;
      this.iconPath = this.getIconForSeverity(issue.severity);
      this.contextValue = 'issue';

      // Command to navigate to the issue
      this.command = {
        command: 'codequal.navigateToIssue',
        title: 'Navigate to Issue',
        arguments: [issue],
      };
    } else if (filePath) {
      // File item
      this.tooltip = filePath;
      this.iconPath = vscode.ThemeIcon.File;
      this.contextValue = 'file';
    }
  }

  private getIconForSeverity(severity: string): vscode.ThemeIcon {
    switch (severity) {
      case 'error':
        return new vscode.ThemeIcon('error', new vscode.ThemeColor('errorForeground'));
      case 'warning':
        return new vscode.ThemeIcon('warning', new vscode.ThemeColor('editorWarning.foreground'));
      case 'information':
        return new vscode.ThemeIcon('info', new vscode.ThemeColor('editorInfo.foreground'));
      case 'hint':
        return new vscode.ThemeIcon('lightbulb', new vscode.ThemeColor('editorHint.foreground'));
      default:
        return new vscode.ThemeIcon('circle-outline');
    }
  }
}

export class IssueTreeProvider implements vscode.TreeDataProvider<IssueTreeItem> {
  private _onDidChangeTreeData = new vscode.EventEmitter<IssueTreeItem | undefined | null | void>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  private store: CodeQualStore;
  private workspaceRoot: string | undefined;

  constructor(store: CodeQualStore) {
    this.store = store;
    this.workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;

    // Listen for store changes
    this.store.onDidChange(() => {
      this.refresh();
    });
  }

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: IssueTreeItem): vscode.TreeItem {
    return element;
  }

  async getChildren(element?: IssueTreeItem): Promise<IssueTreeItem[]> {
    if (!this.store.hasData()) {
      return [];
    }

    if (!element) {
      // Root level - return file nodes
      return this.getFileNodes();
    } else if (element.filePath) {
      // File node - return issue nodes
      return this.getIssueNodes(element.filePath);
    } else {
      // Issue node - no children
      return [];
    }
  }

  private getFileNodes(): IssueTreeItem[] {
    const issuesByFile = this.store.getIssuesGroupedByFile();
    const fileNodes: IssueTreeItem[] = [];

    for (const [filePath, issues] of issuesByFile.entries()) {
      const fileName = this.getRelativeFileName(filePath);
      const issueCount = issues.length;
      const fixableCount = issues.filter((i) => i.fix).length;

      const label = `${fileName} (${issueCount})`;
      const description = fixableCount > 0 ? `${fixableCount} fixable` : undefined;

      const node = new IssueTreeItem(
        label,
        vscode.TreeItemCollapsibleState.Collapsed,
        undefined,
        filePath
      );

      if (description) {
        node.description = description;
      }

      fileNodes.push(node);
    }

    // Sort by file name
    fileNodes.sort((a, b) => a.label.localeCompare(b.label));

    return fileNodes;
  }

  private getIssueNodes(filePath: string): IssueTreeItem[] {
    const issues = this.store.getIssuesForFile(resolveFileUri(filePath));
    const issueNodes: IssueTreeItem[] = [];

    for (const issue of issues) {
      const label = `[${issue.severity}] ${issue.ruleId}`;
      const node = new IssueTreeItem(
        label,
        vscode.TreeItemCollapsibleState.None,
        issue
      );

      issueNodes.push(node);
    }

    // Sort by line number
    issueNodes.sort((a, b) => {
      if (!a.issue || !b.issue) {
        return 0;
      }
      return a.issue.range.start.line - b.issue.range.start.line;
    });

    return issueNodes;
  }

  private getRelativeFileName(filePath: string): string {
    if (this.workspaceRoot) {
      const relativePath = path.relative(this.workspaceRoot, filePath);
      if (!relativePath.startsWith('..')) {
        return relativePath;
      }
    }
    return path.basename(filePath);
  }

  /**
   * Gets the parent of an element (for tree navigation)
   */
  getParent(element: IssueTreeItem): vscode.ProviderResult<IssueTreeItem> {
    if (element.issue) {
      // Issue node - parent is the file node
      const filePath = element.issue.file;
      const fileName = this.getRelativeFileName(filePath);
      const issues = this.store.getIssuesForFile(resolveFileUri(filePath));
      const issueCount = issues.length;

      return new IssueTreeItem(
        `${fileName} (${issueCount})`,
        vscode.TreeItemCollapsibleState.Collapsed,
        undefined,
        filePath
      );
    }
    // File node - no parent
    return undefined;
  }
}

/**
 * Registers the issue tree view and related commands
 */
export function registerIssueTreeView(
  context: vscode.ExtensionContext,
  store: CodeQualStore
): vscode.TreeView<IssueTreeItem> {
  const treeProvider = new IssueTreeProvider(store);

  const treeView = vscode.window.createTreeView('codequalIssues', {
    treeDataProvider: treeProvider,
    showCollapseAll: true,
  });

  // Register navigate command
  context.subscriptions.push(
    vscode.commands.registerCommand('codequal.navigateToIssue', (issue: CodeQualIssue) => {
      navigateToIssue(issue);
    })
  );

  // Register refresh command
  context.subscriptions.push(
    vscode.commands.registerCommand('codequal.refreshIssueTree', () => {
      treeProvider.refresh();
    })
  );

  // Register expand all command
  context.subscriptions.push(
    vscode.commands.registerCommand('codequal.expandAllIssues', () => {
      // VSCode doesn't provide a direct API for this, but users can use the built-in expand all
      vscode.window.showInformationMessage('Use the "Expand All" button in the view toolbar');
    })
  );

  return treeView;
}

/**
 * Navigates to an issue in the editor
 */
async function navigateToIssue(issue: CodeQualIssue): Promise<void> {
  const uri = resolveFileUri(issue.file);
  const document = await vscode.workspace.openTextDocument(uri);
  const editor = await vscode.window.showTextDocument(document);

  // Move cursor to the issue location
  editor.selection = new vscode.Selection(issue.range.start, issue.range.start);
  editor.revealRange(issue.range, vscode.TextEditorRevealType.InCenter);
}
