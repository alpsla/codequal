/**
 * Utility functions for resolving file paths in the CodeQual extension
 * Handles relative paths from SARIF/LSP that need to be resolved against workspace folders
 */

import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

// Cache for resolved paths to avoid repeated filesystem checks
const resolvedPathCache = new Map<string, string>();

/**
 * Resolves a file path (potentially relative) to an absolute path
 * Searches workspace folders and parent directories to find the actual file
 *
 * @param filePath - The path from SARIF/LSP (e.g., "packages/agents/src/file.ts")
 * @returns The resolved absolute path, or best-effort fallback if file not found
 */
export function resolveFilePath(filePath: string): string {
  // Check cache first
  const cached = resolvedPathCache.get(filePath);
  if (cached) {
    return cached;
  }

  const resolved = doResolveFilePath(filePath);
  resolvedPathCache.set(filePath, resolved);

  console.log(`[CodeQual Path Resolver] "${filePath}" -> "${resolved}"`);

  return resolved;
}

function doResolveFilePath(filePath: string): string {
  // Strip query string suffix if present (e.g., "package-lock.json?tar-fs" -> "package-lock.json")
  // This is used by analyzers to reference specific dependencies within a file
  let cleanPath = filePath.split('?')[0];

  // BUG-086 FIX: Strip /tmp/test-repo-xxx/ prefix from cloud analysis paths
  // Cloud analyzer clones repos to temp directories, but these don't exist locally
  const cloudPathMatch = cleanPath.match(/^\/tmp\/test-repo-\d+\/(.+)$/);
  if (cloudPathMatch) {
    console.log(`[CodeQual Path Resolver] Stripping cloud temp path prefix: ${cleanPath}`);
    cleanPath = cloudPathMatch[1]; // Extract the relative path portion
  }

  // Check if it looks like an absolute path
  const looksAbsolute = cleanPath.startsWith('/') || /^[A-Za-z]:/.test(cleanPath);

  // If it looks absolute AND exists, use it as-is
  if (looksAbsolute && fs.existsSync(cleanPath)) {
    return cleanPath;
  }

  // Get workspace folders
  const workspaceFolders = vscode.workspace.workspaceFolders;

  // Strip leading slash if present (paths like "/packages/..." are actually relative)
  const pathToResolve = cleanPath.replace(/^\//, '');

  if (!workspaceFolders || workspaceFolders.length === 0) {
    console.log(`[CodeQual Path Resolver] No workspace folders! Trying home directory...`);

    // Try common development directories as fallback
    const homeDir = process.env.HOME || process.env.USERPROFILE || '';
    const commonPaths = [
      path.join(homeDir, 'CodePrjects', 'codequal', pathToResolve),
      path.join(homeDir, 'Projects', 'codequal', pathToResolve),
      path.join(homeDir, 'code', 'codequal', pathToResolve),
      path.join(homeDir, 'codequal', pathToResolve),
    ];

    for (const candidate of commonPaths) {
      if (fs.existsSync(candidate)) {
        return candidate;
      }
    }

    // Last resort - return original
    return filePath;
  }

  console.log(`[CodeQual Path Resolver] Workspace folders: ${workspaceFolders.map(f => f.uri.fsPath).join(', ')}`);

  // Try each workspace folder
  for (const folder of workspaceFolders) {
    // Direct match against workspace
    const candidate = path.join(folder.uri.fsPath, pathToResolve);
    if (fs.existsSync(candidate)) {
      return candidate;
    }

    // Try parent directories (up to 5 levels)
    // This handles cases where workspace is opened at a subfolder
    let parentPath = folder.uri.fsPath;
    for (let i = 0; i < 5; i++) {
      parentPath = path.dirname(parentPath);
      if (parentPath === '/' || parentPath === path.dirname(parentPath)) {
        break; // Reached root
      }
      const parentCandidate = path.join(parentPath, pathToResolve);
      if (fs.existsSync(parentCandidate)) {
        return parentCandidate;
      }
    }
  }

  // Fallback: return joined with first workspace folder
  return path.join(workspaceFolders[0].uri.fsPath, pathToResolve);
}

/**
 * Clears the path resolution cache
 * Call this when workspace folders change
 */
export function clearPathCache(): void {
  resolvedPathCache.clear();
}

/**
 * Creates a VSCode URI for a file path, properly resolving relative paths
 *
 * @param filePath - The path from SARIF/LSP
 * @returns A properly resolved vscode.Uri
 */
export function resolveFileUri(filePath: string): vscode.Uri {
  const resolved = resolveFilePath(filePath);
  return vscode.Uri.file(resolved);
}
