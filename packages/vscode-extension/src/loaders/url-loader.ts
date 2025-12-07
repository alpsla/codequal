/**
 * Loads data from URLs including Supabase storage
 */

import * as vscode from 'vscode';
import { SarifLog, LSPActionsFile } from '../types';

export class URLLoader {
  // No initialization needed - stateless utility class

  /**
   * Loads SARIF data from a URL
   */
  public async loadSarifFromURL(url: string): Promise<SarifLog> {
    try {
      const data = await this.fetchJSON(url);
      this.validateSarif(data);
      return data as SarifLog;
    } catch (error) {
      throw new Error(`Failed to load SARIF from URL: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Loads LSP actions from a URL
   */
  public async loadLSPFromURL(url: string): Promise<LSPActionsFile> {
    try {
      const data = await this.fetchJSON(url);
      this.validateLSPActions(data);
      return data as LSPActionsFile;
    } catch (error) {
      throw new Error(`Failed to load LSP actions from URL: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Checks if a URL is a Supabase storage URL
   */
  public isSupabaseURL(url: string): boolean {
    return url.includes('supabase.co/storage/') || url.includes('supabase.in/storage/');
  }

  /**
   * Enhances Supabase URL with authentication if needed
   */
  public async enhanceSupabaseURL(url: string): Promise<string> {
    // Check if URL already has a token parameter
    if (url.includes('token=') || url.includes('?')) {
      return url;
    }

    // Get Supabase configuration from settings
    const config = vscode.workspace.getConfiguration('codequal');
    const supabaseAnonKey = config.get<string>('supabaseAnonKey');

    if (supabaseAnonKey && this.isSupabaseURL(url)) {
      // Add authentication header hint
      // Note: For public buckets, this may not be needed
      return url;
    }

    return url;
  }

  /**
   * Generic JSON fetcher with error handling
   */
  private async fetchJSON(url: string): Promise<unknown> {
    // Enhance URL if it's a Supabase URL
    const enhancedURL = await this.enhanceSupabaseURL(url);

    // Use fetch API (available in Node 18+)
    const response = await fetch(enhancedURL, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      throw new Error(`Expected JSON response, got ${contentType}`);
    }

    return await response.json();
  }

  /**
   * Validates SARIF structure
   */
  private validateSarif(data: unknown): void {
    if (!data || typeof data !== 'object') {
      throw new Error('Invalid SARIF: not an object');
    }

    const sarif = data as any;

    if (!sarif.version) {
      throw new Error('Invalid SARIF: missing version');
    }

    if (!Array.isArray(sarif.runs)) {
      throw new Error('Invalid SARIF: runs must be an array');
    }

    if (sarif.runs.length === 0) {
      throw new Error('Invalid SARIF: no runs found');
    }

    // Basic validation of first run
    const firstRun = sarif.runs[0];
    if (!firstRun.tool || !firstRun.tool.driver) {
      throw new Error('Invalid SARIF: missing tool driver');
    }
  }

  /**
   * Validates LSP actions structure
   */
  private validateLSPActions(data: unknown): void {
    if (!data || typeof data !== 'object') {
      throw new Error('Invalid LSP actions: not an object');
    }

    const lsp = data as any;

    if (!lsp.version) {
      throw new Error('Invalid LSP actions: missing version');
    }

    if (!Array.isArray(lsp.actions)) {
      throw new Error('Invalid LSP actions: actions must be an array');
    }

    if (lsp.actions.length === 0) {
      vscode.window.showWarningMessage('LSP actions file contains no actions');
    }
  }

  /**
   * Loads data from a local file path
   */
  public async loadFromFile(filePath: string): Promise<unknown> {
    try {
      const uri = vscode.Uri.file(filePath);
      const fileData = await vscode.workspace.fs.readFile(uri);
      const content = Buffer.from(fileData).toString('utf8');
      return JSON.parse(content);
    } catch (error) {
      throw new Error(`Failed to load file: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Determines if a path is a URL or local file
   */
  public isURL(path: string): boolean {
    return path.startsWith('http://') || path.startsWith('https://');
  }

  /**
   * Generic loader that handles both URLs and file paths
   */
  public async load(path: string): Promise<unknown> {
    if (this.isURL(path)) {
      return await this.fetchJSON(path);
    } else {
      return await this.loadFromFile(path);
    }
  }
}
