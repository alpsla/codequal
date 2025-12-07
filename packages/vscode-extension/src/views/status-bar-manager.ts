/**
 * Manages the status bar item showing issue count and statistics
 */

import * as vscode from 'vscode';
import { CodeQualStore } from '../store/codequal-store';
import { IssueStatistics } from '../types';

export class StatusBarManager {
  private statusBarItem: vscode.StatusBarItem;
  private store: CodeQualStore;

  constructor(store: CodeQualStore) {
    this.store = store;

    // Create status bar item
    this.statusBarItem = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Left,
      100
    );

    this.statusBarItem.command = 'codequal.showIssueSummary';

    // Listen for store changes
    this.store.onDidChange(() => {
      this.updateStatusBar();
    });

    // Initial update
    this.updateStatusBar();
  }

  /**
   * Updates the status bar item
   */
  private updateStatusBar(): void {
    if (!this.store.hasData()) {
      this.statusBarItem.hide();
      return;
    }

    const stats = this.store.getStatistics();

    // Set text
    this.statusBarItem.text = this.formatStatusText(stats);

    // Set tooltip
    this.statusBarItem.tooltip = this.formatTooltip(stats);

    // Set color based on severity
    this.statusBarItem.color = this.getColorForStats(stats);

    // Show the item
    this.statusBarItem.show();
  }

  /**
   * Formats the status bar text
   */
  private formatStatusText(stats: IssueStatistics): string {
    if (stats.total === 0) {
      return '$(check) CodeQual: No issues';
    }

    const icon = stats.errors > 0 ? '$(error)' : stats.warnings > 0 ? '$(warning)' : '$(info)';
    return `${icon} CodeQual: ${stats.total}`;
  }

  /**
   * Formats the tooltip text
   */
  private formatTooltip(stats: IssueStatistics): string {
    if (stats.total === 0) {
      return 'CodeQual: No issues found';
    }

    const lines: string[] = ['CodeQual Issues:'];

    if (stats.errors > 0) {
      lines.push(`  $(error) ${stats.errors} error${stats.errors !== 1 ? 's' : ''}`);
    }
    if (stats.warnings > 0) {
      lines.push(`  $(warning) ${stats.warnings} warning${stats.warnings !== 1 ? 's' : ''}`);
    }
    if (stats.information > 0) {
      lines.push(`  $(info) ${stats.information} info`);
    }
    if (stats.hints > 0) {
      lines.push(`  $(lightbulb) ${stats.hints} hint${stats.hints !== 1 ? 's' : ''}`);
    }

    lines.push('');
    lines.push(`$(wrench) ${stats.fixable} fixable`);
    lines.push('');
    lines.push('Click for details');

    return lines.join('\n');
  }

  /**
   * Gets the color based on issue severity
   */
  private getColorForStats(stats: IssueStatistics): vscode.ThemeColor | undefined {
    if (stats.errors > 0) {
      return new vscode.ThemeColor('errorForeground');
    }
    if (stats.warnings > 0) {
      return new vscode.ThemeColor('editorWarning.foreground');
    }
    return undefined;
  }

  /**
   * Shows the issue summary
   */
  public async showIssueSummary(): Promise<void> {
    const stats = this.store.getStatistics();

    if (stats.total === 0) {
      vscode.window.showInformationMessage('No CodeQual issues found');
      return;
    }

    // Create summary message
    const parts: string[] = [];

    if (stats.errors > 0) {
      parts.push(`${stats.errors} error${stats.errors !== 1 ? 's' : ''}`);
    }
    if (stats.warnings > 0) {
      parts.push(`${stats.warnings} warning${stats.warnings !== 1 ? 's' : ''}`);
    }
    if (stats.information > 0) {
      parts.push(`${stats.information} info`);
    }
    if (stats.hints > 0) {
      parts.push(`${stats.hints} hint${stats.hints !== 1 ? 's' : ''}`);
    }

    const summary = `CodeQual found ${stats.total} issues: ${parts.join(', ')}. ${stats.fixable} are fixable.`;

    // Show with action buttons
    const actions: string[] = [];
    if (stats.fixable > 0) {
      actions.push('Fix All');
    }
    actions.push('View Issues', 'Dismiss');

    const selected = await vscode.window.showInformationMessage(summary, ...actions);

    if (selected === 'Fix All') {
      await vscode.commands.executeCommand('codequal.applyAllFixes');
    } else if (selected === 'View Issues') {
      await vscode.commands.executeCommand('workbench.panel.markers.view.focus');
    }
  }

  /**
   * Shows a quick pick with severity-based actions
   */
  public async showActionsQuickPick(): Promise<void> {
    const stats = this.store.getStatistics();

    if (stats.total === 0) {
      vscode.window.showInformationMessage('No CodeQual issues found');
      return;
    }

    interface ActionItem extends vscode.QuickPickItem {
      command: string;
    }

    const items: ActionItem[] = [];

    if (stats.fixable > 0) {
      items.push({
        label: '$(wrench) Fix All Issues',
        description: `${stats.fixable} fixable issues`,
        command: 'codequal.applyAllFixes',
      });
    }

    if (stats.errors > 0) {
      const fixableErrors = this.store
        .getAllIssues()
        .filter((i) => i.severity === 'error' && i.fix).length;
      if (fixableErrors > 0) {
        items.push({
          label: '$(error) Fix Errors',
          description: `${fixableErrors} fixable errors`,
          command: 'codequal.applyCriticalSeverityFixes',
        });
      }
    }

    if (stats.warnings > 0) {
      const fixableWarnings = this.store
        .getAllIssues()
        .filter((i) => i.severity === 'warning' && i.fix).length;
      if (fixableWarnings > 0) {
        items.push({
          label: '$(warning) Fix Warnings',
          description: `${fixableWarnings} fixable warnings`,
          command: 'codequal.applyHighSeverityFixes',
        });
      }
    }

    items.push({
      label: '$(list-tree) View in Sidebar',
      description: 'Show issues tree view',
      command: 'codequal.showIssuesView',
    });

    items.push({
      label: '$(clear-all) Clear Diagnostics',
      description: 'Remove all CodeQual diagnostics',
      command: 'codequal.clearDiagnostics',
    });

    const selected = await vscode.window.showQuickPick(items, {
      placeHolder: 'Select an action',
    });

    if (selected) {
      await vscode.commands.executeCommand(selected.command);
    }
  }

  public show(): void {
    this.statusBarItem.show();
  }

  public hide(): void {
    this.statusBarItem.hide();
  }

  public dispose(): void {
    this.statusBarItem.dispose();
  }
}

/**
 * Registers status bar related commands
 */
export function registerStatusBarCommands(
  context: vscode.ExtensionContext,
  statusBarManager: StatusBarManager
): void {
  context.subscriptions.push(
    vscode.commands.registerCommand('codequal.showIssueSummary', () => {
      statusBarManager.showIssueSummary();
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('codequal.showActionsQuickPick', () => {
      statusBarManager.showActionsQuickPick();
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('codequal.showIssuesView', () => {
      vscode.commands.executeCommand('codequalIssues.focus');
    })
  );
}
