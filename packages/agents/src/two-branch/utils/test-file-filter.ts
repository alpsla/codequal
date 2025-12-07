/**
 * Test File Filter Utility
 * 
 * Provides consistent test file detection and filtering across all languages.
 * Test files are excluded from analysis to focus on production code quality.
 * 
 * Created: January 13, 2025
 * Status: Production
 */

import * as path from 'path';

/**
 * Common test file patterns and directories
 */
const TEST_DIRECTORY_PATTERNS = [
  '/test/',
  '/tests/',
  '/__tests__/',
  '/spec/',
  '/specs/',
  '\\test\\',
  '\\tests\\',
  '\\__tests__\\',
  '\\spec\\',
  '\\specs\\'
];

const TEST_FILE_NAME_PATTERNS = [
  /\.test\./i,
  /\.spec\./i,
  /\.test$/i,
  /\.spec$/i
];

/**
 * Check if a file path represents a test file
 * 
 * @param filePath - The file path to check (relative or absolute)
 * @returns true if the file is a test file, false otherwise
 * 
 * @example
 * isTestFile('src/utils/helper.test.ts') // true
 * isTestFile('src/utils/helper.ts') // false
 * isTestFile('test/MyTest.ts') // true
 * isTestFile('src/validation-issues.ts') // false - OK for validation testing
 */
export function isTestFile(filePath: string): boolean {
  if (!filePath) return false;
  
  const normalizedPath = filePath.replace(/\\/g, '/');
  
  // Check directory patterns
  for (const pattern of TEST_DIRECTORY_PATTERNS) {
    if (normalizedPath.includes(pattern)) {
      return true;
    }
  }
  
  // Check file name patterns
  const fileName = path.basename(normalizedPath);
  for (const pattern of TEST_FILE_NAME_PATTERNS) {
    if (pattern.test(fileName)) {
      return true;
    }
  }
  
  return false;
}

/**
 * Filter out test files from an array of file paths
 * 
 * @param files - Array of file paths to filter
 * @returns Array of file paths with test files removed
 * 
 * @example
 * filterTestFiles(['src/utils.ts', 'src/utils.test.ts', 'test/MyTest.ts'])
 * // Returns: ['src/utils.ts']
 */
export function filterTestFiles(files: string[]): string[] {
  return files.filter(file => !isTestFile(file));
}

/**
 * Filter out test files and return both filtered and excluded files
 * 
 * @param files - Array of file paths to filter
 * @returns Object with filtered files and excluded test files
 */
export function filterTestFilesWithStats(files: string[]): {
  filtered: string[];
  excluded: string[];
} {
  const filtered: string[] = [];
  const excluded: string[] = [];
  
  for (const file of files) {
    if (isTestFile(file)) {
      excluded.push(file);
    } else {
      filtered.push(file);
    }
  }
  
  return { filtered, excluded };
}


