/**
 * Code Snippet Validator
 *
 * Dynamic validation utility for static analysis tool reports.
 * Works with ANY tool (PMD, ESLint, Semgrep, etc.) and ANY language.
 *
 * Key Features:
 * - Validates reported line numbers match actual code violations
 * - Automatically corrects mismatched line numbers
 * - Detects and filters false positives
 * - Extracts code snippets with proper context
 *
 * @module code-snippet-validator
 * @category V9 Core Utilities
 * @see V9_CRITICAL_KNOWLEDGE_BASE.md
 */

import * as fs from 'fs';
import * as path from 'path';

export interface ValidationResult {
  snippet: string;
  correctedLine: number;
}

export interface ValidationOptions {
  contextLinesBefore?: number;  // Default: 2
  contextLinesAfter?: number;   // Default: 2
  searchRangeBefore?: number;   // Default: 10 (for validation)
  searchRangeAfter?: number;    // Default: 5 (for validation)
}

/**
 * Validates and corrects line numbers based on code snippet content.
 * This is a dynamic approach that works for any static analysis tool.
 *
 * @param reportedLine - Line number reported by the static analysis tool
 * @param snippet - Code snippet extracted from the file
 * @param issueDescription - Description of the issue (used for pattern matching)
 * @returns Corrected line number, or null if false positive detected
 */
export function validateLineNumber(
  reportedLine: number,
  snippet: string,
  issueDescription: string
): number | null {
  // Parse snippet to get line numbers
  const snippetLines = snippet.split('\n');
  const lineNumbers = snippetLines
    .map(line => {
      const match = line.match(/^(\d+):/);
      return match ? parseInt(match[1]) : null;
    })
    .filter(n => n !== null) as number[];

  // If reported line is in snippet, check if it contains the violation
  if (lineNumbers.includes(reportedLine)) {
    const snippetLineIndex = lineNumbers.indexOf(reportedLine);
    const lineContent = snippetLines[snippetLineIndex].replace(/^\d+:\s*/, '').trim();

    // Check for specific patterns based on issue description
    const correctedLine = findViolationInLine(lineContent, issueDescription, reportedLine);
    if (correctedLine) return correctedLine;
  }

  // Search all snippet lines for the actual violation
  for (let i = 0; i < snippetLines.length; i++) {
    const line = snippetLines[i];
    const lineNum = lineNumbers[i];
    if (!lineNum) continue;

    const lineContent = line.replace(/^\d+:\s*/, '').trim();
    const foundLine = findViolationInLine(lineContent, issueDescription, lineNum);
    if (foundLine) return foundLine;
  }

  // If we have specific patterns to look for and didn't find them, it's a false positive
  if (hasKnownPattern(issueDescription)) {
    return null;  // False positive
  }

  // For other issues without specific patterns, return reported line if it's in snippet
  if (lineNumbers.includes(reportedLine)) {
    return reportedLine;
  }

  // Otherwise return middle line of snippet as best guess
  return lineNumbers[Math.floor(lineNumbers.length / 2)] || reportedLine;
}

/**
 * Find violation pattern in a line of code
 */
function findViolationInLine(
  lineContent: string,
  issueDescription: string,
  lineNumber: number
): number | null {
  const desc = issueDescription.toLowerCase();

  // Pattern 1: "return null" for collection/array return issues
  if (desc.includes('return') && desc.includes('null') && lineContent.includes('return null')) {
    return lineNumber;
  }

  // Pattern 2: Method calls for "overridable method" issues
  const methodMatch = issueDescription.match(/method '(\w+)'/);
  if (methodMatch) {
    const methodName = methodMatch[1];
    if (lineContent.match(new RegExp(`\\b${methodName}\\s*\\(`))) {
      return lineNumber;
    }
  }

  // Pattern 3: System.out.println detection
  if (desc.includes('system') && desc.includes('print') &&
      lineContent.match(/System\s*\.\s*out\s*\.\s*print/)) {
    return lineNumber;
  }

  // Pattern 4: Log statement without guard
  if (desc.includes('log') && desc.includes('guard') &&
      lineContent.match(/log\s*\.\s*(debug|trace|info)/)) {
    return lineNumber;
  }

  return null;
}

/**
 * Check if issue description contains known patterns we can validate
 */
function hasKnownPattern(issueDescription: string): boolean {
  const desc = issueDescription.toLowerCase();

  // Known patterns we can validate
  const patterns = [
    desc.includes('return') && desc.includes('null'),
    desc.match(/method '(\w+)'/),
    desc.includes('system') && desc.includes('print'),
    desc.includes('log') && desc.includes('guard')
  ];

  return patterns.some(p => p);
}

/**
 * Extract and validate code snippet from a file.
 *
 * @param repoPath - Root path of the repository
 * @param filePath - Relative path to the file (can include /workspace/ prefix)
 * @param lineNumber - Reported line number from static analysis tool
 * @param issueDescription - Description of the issue
 * @param options - Validation options
 * @returns Validation result with snippet and corrected line, or undefined for false positives
 */
export async function extractAndValidateSnippet(
  repoPath: string,
  filePath: string,
  lineNumber: number,
  issueDescription: string,
  options: ValidationOptions = {}
): Promise<ValidationResult | undefined> {
  const {
    contextLinesBefore = 2,
    contextLinesAfter = 2,
    searchRangeBefore = 10,
    searchRangeAfter = 5
  } = options;

  try {
    const fullPath = path.join(repoPath, filePath.replace('/workspace/', ''));
    if (!fs.existsSync(fullPath)) return undefined;

    const content = fs.readFileSync(fullPath, 'utf-8');
    const lines = content.split('\n');

    // Step 1: Extract wide range for validation
    const validationStart = Math.max(0, lineNumber - searchRangeBefore - 1);
    const validationEnd = Math.min(lines.length, lineNumber + searchRangeAfter);

    const validationSnippet = lines.slice(validationStart, validationEnd)
      .map((line, idx) => `${validationStart + idx + 1}: ${line}`)
      .join('\n');

    // Step 2: Validate and find correct line number
    const correctedLine = validateLineNumber(lineNumber, validationSnippet, issueDescription);

    // If validation returns null, this is a false positive
    if (correctedLine === null) {
      console.warn(`⚠️  False positive detected: ${filePath}:${lineNumber} - ${issueDescription.substring(0, 60)}`);
      return undefined;
    }

    if (correctedLine !== lineNumber) {
      console.log(`✓ Corrected line number: ${filePath}:${lineNumber} → ${correctedLine}`);
    }

    // Step 3: Extract final snippet centered on corrected line
    const snippetStart = Math.max(0, correctedLine - contextLinesBefore - 1);
    const snippetEnd = Math.min(lines.length, correctedLine + contextLinesAfter);

    const finalSnippet = lines.slice(snippetStart, snippetEnd)
      .map((line, idx) => `${snippetStart + idx + 1}: ${line}`)
      .join('\n');

    return { snippet: finalSnippet, correctedLine };
  } catch (error) {
    console.error(`Error extracting snippet from ${filePath}:${lineNumber}`, error);
    return undefined;
  }
}

/**
 * Batch validate multiple issues from a static analysis tool report.
 *
 * @param repoPath - Root path of the repository
 * @param issues - Array of issues with file, line, and description
 * @param options - Validation options
 * @returns Validated issues with corrected line numbers and snippets
 */
export async function batchValidateIssues<T extends { file: string; line: number; description?: string; message?: string }>(
  repoPath: string,
  issues: T[],
  options: ValidationOptions = {}
): Promise<Array<T & { correctedLine: number; snippet: string }>> {
  const validatedIssues: Array<T & { correctedLine: number; snippet: string }> = [];

  for (const issue of issues) {
    const description = issue.description || issue.message || '';
    const result = await extractAndValidateSnippet(
      repoPath,
      issue.file,
      issue.line,
      description,
      options
    );

    if (result) {
      validatedIssues.push({
        ...issue,
        correctedLine: result.correctedLine,
        snippet: result.snippet
      });
    }
  }

  return validatedIssues;
}
