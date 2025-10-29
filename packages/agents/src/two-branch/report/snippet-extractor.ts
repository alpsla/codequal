/**
 * Snippet Extractor Service
 * 
 * Handles extraction of code snippets from source files.
 * Extracted from v9-grouped-report-formatter.ts for better modularity.
 */

import { EnrichedIssue, IssueLocation } from './types';
import * as path from 'path';
import { execSync } from 'child_process';

/**
 * Find full path for a file basename in the repository
 * 
 * @param basename - File basename to search for
 * @param repoPath - Repository root path
 * @returns Full relative path or null if not found
 */
export async function findFullPath(basename: string, repoPath: string | null): Promise<string | null> {
  if (!repoPath || basename.includes('/')) {
    // Already has path or no repo available
    return null;
  }
  
  try {
    const result = execSync(
      `find "${repoPath}" -type f -name "${basename}" | grep -v "/\\.git/" | head -1`,
      { encoding: 'utf-8' }
    ).trim();
    
    if (result) {
      // Convert to relative path
      return result.replace(repoPath + '/', '');
    }
  } catch (error) {
    // File not found or command failed
  }
  
  return null;
}

/**
 * Normalize Docker container paths
 * 
 * Removes /workspace/ prefix from paths that come from Docker containers
 * 
 * @param filePath - File path to normalize
 * @returns Normalized path without Docker prefix
 */
function normalizePath(filePath: string): string {
  let normalized = filePath;
  if (normalized.startsWith('/workspace/')) {
    normalized = normalized.replace('/workspace/', '');
  } else if (normalized.startsWith('workspace/')) {
    normalized = normalized.replace('workspace/', '');
  }
  return normalized;
}

/**
 * Extract code snippets for issue locations
 * 
 * BUG FIX #24: Extracts snippets on-demand with intelligent batching for performance
 * BUG FIX #33: Increased snippet limit per group (1000 per group)
 * BUG FIX #41: Normalizes Docker container paths for consistency
 * 
 * @param issues - Issues to extract snippets for
 * @param repoPath - Local repository path for extraction
 * @returns Array of issue locations with snippets
 */
export async function extractSnippetsForLocations(
  issues: EnrichedIssue[],
  repoPath: string | null
): Promise<IssueLocation[]> {
  if (!repoPath) {
    // BUG FIX #41: Even without repoPath, normalize paths for consistency
    return issues.map(issue => {
      const normalizedPath = normalizePath(issue.file);
      
      return {
        file: normalizedPath,
        line: issue.line || 0,
        column: issue.column,
        snippet: issue.snippet || '',
        category: issue.category
      };
    });
  }

  const { CodeSnippetExtractor } = await import('../utils/code-snippet-extractor');
  
  // BUG FIX #33: Increased snippet limit per group (was 100 globally, now 1000 per group)
  // This allows IDEs to show more context without killing performance
  // For groups with >1000 issues, only first 1000 get snippets (rest have location only)
  const SNIPPET_LIMIT = 1000;
  const locations: IssueLocation[] = [];
  
  for (let i = 0; i < issues.length; i++) {
    const issue = issues[i];
    let snippet = issue.snippet || '';
    
    // BUG FIX #41: Normalize path once at the beginning for consistency
    const normalizedPath = normalizePath(issue.file);
    
    // Extract snippet if missing and within limit
    if (i < SNIPPET_LIMIT && (!snippet || snippet === 'N/A' || snippet.trim().length === 0) && issue.file && issue.line) {
      try {
        const fullPath = path.join(repoPath, normalizedPath);
        snippet = await CodeSnippetExtractor.extractSnippet(fullPath, issue.line, 3) || '';
      } catch (error) {
        // Extraction failed - use empty snippet
        snippet = '';
      }
    }
    
    // BUG FIX #41: Always use normalized path in output (consistent with report display)
    locations.push({
      file: normalizedPath,
      line: issue.line || 0,
      column: issue.column,
      snippet,
      category: issue.category
    });
  }
  
  return locations;
}

