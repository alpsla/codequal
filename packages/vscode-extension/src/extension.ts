/**
 * CodeQual VSCode Extension
 * Main entry point
 */

import * as vscode from 'vscode';
import { CodeQualStore } from './store/codequal-store';
import { SarifDiagnosticProvider } from './providers/sarif-diagnostic-provider';
import { LSPCodeActionProvider } from './providers/lsp-code-action-provider';
import { registerIssueTreeView } from './views/issue-tree-provider';
import { StatusBarManager, registerStatusBarCommands } from './views/status-bar-manager';
import { URLLoader } from './loaders/url-loader';
import { SarifLog, LSPActionsFile } from './types';

let store: CodeQualStore;
let diagnosticProvider: SarifDiagnosticProvider;
let codeActionProvider: LSPCodeActionProvider;
let statusBarManager: StatusBarManager;
let urlLoader: URLLoader;

/**
 * Extension activation
 */
export function activate(context: vscode.ExtensionContext): void {
  console.log('CodeQual extension is now active');

  // Initialize core components
  store = new CodeQualStore();
  diagnosticProvider = new SarifDiagnosticProvider(store);
  codeActionProvider = new LSPCodeActionProvider(store);
  statusBarManager = new StatusBarManager(store);
  urlLoader = new URLLoader();

  // Register providers
  context.subscriptions.push(diagnosticProvider);
  context.subscriptions.push(statusBarManager);

  // Register code action provider
  const selector: vscode.DocumentSelector = [
    { scheme: 'file', pattern: '**/*' },
  ];

  context.subscriptions.push(
    vscode.languages.registerCodeActionsProvider(
      selector,
      codeActionProvider,
      {
        providedCodeActionKinds: LSPCodeActionProvider.providedCodeActionKinds,
      }
    )
  );

  // Register tree view
  const treeView = registerIssueTreeView(context, store);
  context.subscriptions.push(treeView);

  // Register status bar commands
  registerStatusBarCommands(context, statusBarManager);

  // Register main commands
  registerCommands(context);

  // Auto-load if configured
  autoLoadData();

  vscode.window.showInformationMessage('CodeQual extension activated');
}

/**
 * Extension deactivation
 */
export function deactivate(): void {
  if (store) {
    store.dispose();
  }
}

/**
 * Registers all extension commands
 */
function registerCommands(context: vscode.ExtensionContext): void {
  // Load SARIF file
  context.subscriptions.push(
    vscode.commands.registerCommand('codequal.loadSarifFile', async () => {
      await loadSarifFile();
    })
  );

  // Load SARIF from URL
  context.subscriptions.push(
    vscode.commands.registerCommand('codequal.loadSarifFromURL', async () => {
      await loadSarifFromURL();
    })
  );

  // Load LSP file
  context.subscriptions.push(
    vscode.commands.registerCommand('codequal.loadLSPFile', async () => {
      await loadLSPFile();
    })
  );

  // Load LSP from URL
  context.subscriptions.push(
    vscode.commands.registerCommand('codequal.loadLSPFromURL', async () => {
      await loadLSPFromURL();
    })
  );

  // Apply all fixes
  context.subscriptions.push(
    vscode.commands.registerCommand('codequal.applyAllFixes', async () => {
      await applyAllFixes();
    })
  );

  // Apply fixes for current file
  context.subscriptions.push(
    vscode.commands.registerCommand('codequal.applyFileFixes', async () => {
      await applyFileFixes();
    })
  );

  // Apply fixes by severity
  context.subscriptions.push(
    vscode.commands.registerCommand('codequal.applyCriticalSeverityFixes', async () => {
      await codeActionProvider.applyFixesBySeverity('error');
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('codequal.applyHighSeverityFixes', async () => {
      await codeActionProvider.applyFixesBySeverity('warning');
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('codequal.applyMediumSeverityFixes', async () => {
      await codeActionProvider.applyFixesBySeverity('information');
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('codequal.applyLowSeverityFixes', async () => {
      await codeActionProvider.applyFixesBySeverity('hint');
    })
  );

  // Clear diagnostics
  context.subscriptions.push(
    vscode.commands.registerCommand('codequal.clearDiagnostics', async () => {
      await clearDiagnostics();
    })
  );

  // Refresh data
  context.subscriptions.push(
    vscode.commands.registerCommand('codequal.refresh', async () => {
      await refreshData();
    })
  );

  // Show statistics
  context.subscriptions.push(
    vscode.commands.registerCommand('codequal.showStatistics', async () => {
      await showStatistics();
    })
  );
}

/**
 * Auto-loads data if configured
 */
async function autoLoadData(): Promise<void> {
  const config = vscode.workspace.getConfiguration('codequal');
  const autoLoadLSP = config.get<boolean>('autoLoadLSP', false);
  const lspFilePath = config.get<string>('lspFilePath', '');

  if (autoLoadLSP && lspFilePath) {
    await loadLSPFromPath(lspFilePath);
  }
}

/**
 * Loads a SARIF file
 */
async function loadSarifFile(): Promise<void> {
  const options: vscode.OpenDialogOptions = {
    canSelectMany: false,
    openLabel: 'Load SARIF File',
    filters: {
      'SARIF files': ['sarif', 'json'],
      'All files': ['*'],
    },
  };

  const fileUri = await vscode.window.showOpenDialog(options);

  if (fileUri && fileUri[0]) {
    await loadSarifFromPath(fileUri[0].fsPath);
  }
}

/**
 * Loads SARIF from a URL
 */
async function loadSarifFromURL(): Promise<void> {
  const url = await vscode.window.showInputBox({
    prompt: 'Enter SARIF file URL',
    placeHolder: 'https://example.com/report.sarif',
    validateInput: (value) => {
      if (!value) {
        return 'URL is required';
      }
      if (!value.startsWith('http://') && !value.startsWith('https://')) {
        return 'URL must start with http:// or https://';
      }
      return null;
    },
  });

  if (url) {
    await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: 'Loading SARIF from URL',
        cancellable: false,
      },
      async () => {
        try {
          const sarif = await urlLoader.loadSarifFromURL(url);
          store.setSarifData(sarif);
          vscode.window.showInformationMessage(`Loaded SARIF with ${store.getStatistics().total} issues`);
        } catch (error) {
          vscode.window.showErrorMessage(`Failed to load SARIF: ${error instanceof Error ? error.message : String(error)}`);
        }
      }
    );
  }
}

/**
 * Loads SARIF from a file path
 */
async function loadSarifFromPath(filePath: string): Promise<void> {
  await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: 'Loading SARIF file',
      cancellable: false,
    },
    async () => {
      try {
        const data = await urlLoader.load(filePath);
        store.setSarifData(data as SarifLog);
        vscode.window.showInformationMessage(`Loaded SARIF with ${store.getStatistics().total} issues`);
      } catch (error) {
        vscode.window.showErrorMessage(`Failed to load SARIF: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  );
}

/**
 * Loads an LSP actions file
 */
async function loadLSPFile(): Promise<void> {
  const options: vscode.OpenDialogOptions = {
    canSelectMany: false,
    openLabel: 'Load LSP Actions File',
    filters: {
      'JSON files': ['json'],
      'All files': ['*'],
    },
  };

  const fileUri = await vscode.window.showOpenDialog(options);

  if (fileUri && fileUri[0]) {
    await loadLSPFromPath(fileUri[0].fsPath);
  }
}

/**
 * Loads LSP actions from a URL
 */
async function loadLSPFromURL(): Promise<void> {
  const url = await vscode.window.showInputBox({
    prompt: 'Enter LSP actions file URL',
    placeHolder: 'https://example.com/actions.json',
    validateInput: (value) => {
      if (!value) {
        return 'URL is required';
      }
      if (!value.startsWith('http://') && !value.startsWith('https://')) {
        return 'URL must start with http:// or https://';
      }
      return null;
    },
  });

  if (url) {
    await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: 'Loading LSP actions from URL',
        cancellable: false,
      },
      async () => {
        try {
          const lspActions = await urlLoader.loadLSPFromURL(url);
          store.setLSPActions(lspActions);
          vscode.window.showInformationMessage(`Loaded ${lspActions.actions.length} LSP actions`);
        } catch (error) {
          vscode.window.showErrorMessage(`Failed to load LSP actions: ${error instanceof Error ? error.message : String(error)}`);
        }
      }
    );
  }
}

/**
 * Loads LSP actions from a file path
 */
async function loadLSPFromPath(filePath: string): Promise<void> {
  await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: 'Loading LSP actions',
      cancellable: false,
    },
    async () => {
      try {
        const data = await urlLoader.load(filePath);
        // Handle both formats: { actions: [...] } or just [...]
        const actions = Array.isArray(data) ? data : (data as LSPActionsFile).actions;
        store.setLSPActions(data as LSPActionsFile);
        vscode.window.showInformationMessage(`Loaded ${actions.length} LSP actions`);
      } catch (error) {
        vscode.window.showErrorMessage(`Failed to load LSP actions: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  );
}

/**
 * Applies all available fixes
 */
async function applyAllFixes(): Promise<void> {
  const stats = store.getStatistics();

  if (stats.fixable === 0) {
    vscode.window.showInformationMessage('No fixable issues found');
    return;
  }

  const confirm = await vscode.window.showWarningMessage(
    `Apply fixes for ${stats.fixable} issues?`,
    { modal: true },
    'Apply All',
    'Cancel'
  );

  if (confirm === 'Apply All') {
    await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: 'Applying fixes',
        cancellable: false,
      },
      async () => {
        const fixedCount = await codeActionProvider.applyAllFixes();
        vscode.window.showInformationMessage(`Applied ${fixedCount} fixes`);
      }
    );
  }
}

/**
 * Applies fixes for the current file
 */
async function applyFileFixes(): Promise<void> {
  const editor = vscode.window.activeTextEditor;

  if (!editor) {
    vscode.window.showWarningMessage('No active editor');
    return;
  }

  const issues = store.getIssuesForFile(editor.document.uri);
  const fixableCount = issues.filter((i) => i.fix).length;

  if (fixableCount === 0) {
    vscode.window.showInformationMessage('No fixable issues in current file');
    return;
  }

  const confirm = await vscode.window.showWarningMessage(
    `Apply fixes for ${fixableCount} issues in this file?`,
    { modal: true },
    'Apply',
    'Cancel'
  );

  if (confirm === 'Apply') {
    await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: 'Applying fixes',
        cancellable: false,
      },
      async () => {
        const fixedCount = await codeActionProvider.applyFixesForFile(editor.document.uri);
        vscode.window.showInformationMessage(`Applied ${fixedCount} fixes`);
      }
    );
  }
}

/**
 * Clears all diagnostics
 */
async function clearDiagnostics(): Promise<void> {
  const confirm = await vscode.window.showWarningMessage(
    'Clear all CodeQual diagnostics?',
    'Clear',
    'Cancel'
  );

  if (confirm === 'Clear') {
    store.clear();
    diagnosticProvider.clear();
    vscode.window.showInformationMessage('Cleared all CodeQual data');
  }
}

/**
 * Refreshes data from configured sources
 */
async function refreshData(): Promise<void> {
  const config = vscode.workspace.getConfiguration('codequal');
  const lspFilePath = config.get<string>('lspFilePath', '');

  if (lspFilePath) {
    await loadLSPFromPath(lspFilePath);
  } else {
    vscode.window.showWarningMessage('No LSP file path configured');
  }
}

/**
 * Shows statistics summary
 */
async function showStatistics(): Promise<void> {
  const stats = store.getStatistics();

  if (stats.total === 0) {
    vscode.window.showInformationMessage('No issues found');
    return;
  }

  const message = `
CodeQual Statistics:
- Total Issues: ${stats.total}
- Errors: ${stats.errors}
- Warnings: ${stats.warnings}
- Information: ${stats.information}
- Hints: ${stats.hints}
- Fixable: ${stats.fixable}
  `.trim();

  const doc = await vscode.workspace.openTextDocument({
    content: message,
    language: 'plaintext',
  });

  await vscode.window.showTextDocument(doc);
}
