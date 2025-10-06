/**
 * Safe Value Helpers
 * Utilities to handle undefined/null values in reports gracefully
 */

export interface Issue {
  id?: string;
  title?: string;
  message?: string;
  description?: string;
  category?: string;
  severity?: string;
  file?: string;
  line?: number;
  column?: number;
  tool?: string;
  agent?: string;
  codeSnippet?: string;
  suggestedFix?: string;
  businessImpact?: string;
  [key: string]: any;
}

/**
 * Safe string getter with fallback
 */
export function safeString(value: string | undefined | null, fallback = 'N/A'): string {
  if (value === undefined || value === null || value === '') {
    return fallback;
  }
  return String(value);
}

/**
 * Safe number getter with fallback
 */
export function safeNumber(value: number | undefined | null, fallback = 0): number {
  if (value === undefined || value === null || isNaN(value)) {
    return fallback;
  }
  return Number(value);
}

/**
 * Safe issue title with multiple fallbacks
 */
export function safeIssueTitle(issue: Issue): string {
  return safeString(
    issue.title || issue.message || issue.description,
    'Unspecified Issue'
  );
}

/**
 * Safe issue category with fallback
 */
export function safeCategory(issue: Issue): string {
  return safeString(issue.category, 'General');
}

/**
 * Safe severity with fallback and validation
 */
export function safeSeverity(issue: Issue): string {
  const severity = (issue.severity || 'medium').toLowerCase();
  const validSeverities = ['critical', 'high', 'medium', 'low'];

  if (validSeverities.includes(severity)) {
    return severity;
  }

  return 'medium'; // Default to medium for unknown severities
}

/**
 * Safe file path with fallback
 */
export function safeFilePath(issue: Issue): string {
  return safeString(issue.file, 'Unknown file');
}

/**
 * Safe line number with fallback
 */
export function safeLineNumber(issue: Issue): number {
  return safeNumber(issue.line, 0);
}

/**
 * Safe file:line format
 */
export function safeFileLocation(issue: Issue): string {
  const file = safeFilePath(issue);
  const line = safeLineNumber(issue);

  if (line > 0) {
    return `${file}:${line}`;
  }

  return file;
}

/**
 * Safe tool name with fallback
 */
export function safeToolName(issue: Issue): string {
  return safeString(issue.tool, 'Unknown tool');
}

/**
 * Safe agent name with fallback
 */
export function safeAgentName(issue: Issue): string {
  return safeString(issue.agent, 'Unknown agent');
}

/**
 * Safe code snippet with fallback
 */
export function safeCodeSnippet(issue: Issue): string {
  return safeString(issue.codeSnippet, '');
}

/**
 * Safe business impact with fallback
 */
export function safeBusinessImpact(issue: Issue): string {
  return safeString(issue.businessImpact, 'Impact not assessed');
}

/**
 * Get safe display value for severity (formatted)
 */
export function safeDisplaySeverity(issue: Issue): string {
  const severity = safeSeverity(issue);
  return severity.toUpperCase();
}

/**
 * Safe array access
 */
export function safeArray<T>(value: T[] | undefined | null): T[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value;
}

/**
 * Safe object access with fallback
 */
export function safeObject<T extends Record<string, any>>(
  value: T | undefined | null,
  fallback: T
): T {
  if (value === undefined || value === null || typeof value !== 'object') {
    return fallback;
  }
  return value;
}

/**
 * Get language from file extension safely
 */
export function safeLanguageFromFile(file: string | undefined): string {
  if (!file) return 'text';

  const ext = file.split('.').pop()?.toLowerCase();

  const languageMap: Record<string, string> = {
    'java': 'java',
    'js': 'javascript',
    'jsx': 'javascript',
    'ts': 'typescript',
    'tsx': 'typescript',
    'py': 'python',
    'rb': 'ruby',
    'go': 'go',
    'rs': 'rust',
    'c': 'c',
    'cpp': 'cpp',
    'cs': 'csharp',
    'php': 'php',
    'swift': 'swift',
    'kt': 'kotlin',
    'scala': 'scala'
  };

  return languageMap[ext || ''] || 'text';
}

/**
 * Format issue for display with all safe values
 */
export function formatIssueSafely(issue: Issue, index: number): string {
  const title = safeIssueTitle(issue);
  const severity = safeDisplaySeverity(issue);
  const location = safeFileLocation(issue);

  return `${index + 1}. **${title}** (${severity})\n   - File: \`${location}\``;
}

/**
 * Check if value is defined and not empty
 */
export function isDefined<T>(value: T | undefined | null): value is T {
  return value !== undefined && value !== null;
}

/**
 * Check if string is defined and not empty
 */
export function isNonEmptyString(value: string | undefined | null): value is string {
  return isDefined(value) && value.trim().length > 0;
}

/**
 * Safe percentage calculation
 */
export function safePercentage(numerator: number | undefined, denominator: number | undefined): number {
  const num = safeNumber(numerator, 0);
  const denom = safeNumber(denominator, 1);

  if (denom === 0) return 0;

  return Math.round((num / denom) * 100);
}

/**
 * Safe score clamping (0-100)
 */
export function safeScore(score: number | undefined): number {
  const value = safeNumber(score, 50); // Default to 50 (neutral)
  return Math.max(0, Math.min(100, value));
}

/**
 * Safe metadata value extraction
 */
export function safeMetadataValue<T>(
  metadata: Record<string, any> | undefined,
  key: string,
  fallback: T
): T {
  if (!metadata || !(key in metadata)) {
    return fallback;
  }

  const value = metadata[key];

  if (value === undefined || value === null) {
    return fallback;
  }

  return value as T;
}

/**
 * Format duration safely
 */
export function safeDuration(milliseconds: number | undefined): string {
  const ms = safeNumber(milliseconds, 0);

  if (ms === 0) return '0s';

  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  }

  if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  }

  return `${seconds}s`;
}

/**
 * Format date safely
 */
export function safeDate(dateString: string | Date | undefined): string {
  if (!dateString) {
    return new Date().toLocaleString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  try {
    const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch (error) {
    return new Date().toLocaleString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
}

/**
 * Safe count aggregation
 */
export function safeCountBy<T>(
  items: T[] | undefined,
  keyFn: (item: T) => string
): Record<string, number> {
  const arr = safeArray(items);
  const counts: Record<string, number> = {};

  arr.forEach(item => {
    const key = keyFn(item);
    counts[key] = (counts[key] || 0) + 1;
  });

  return counts;
}
