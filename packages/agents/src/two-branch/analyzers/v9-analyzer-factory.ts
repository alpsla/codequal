/**
 * V9 Analyzer Factory
 * 
 * Central factory for creating language-specific analyzers.
 * This ensures consistent analyzer instantiation and supports
 * all languages in the V9 analyzer ecosystem.
 */

import { V9BaseAnalyzer } from './v9-base-analyzer';
import { V9JavaAnalyzer } from './v9-java-analyzer';
import { V9PythonAnalyzer } from './v9-python-analyzer';
import { V9JavaScriptAnalyzer } from './v9-javascript-analyzer';
import { V9RustAnalyzer } from './v9-rust-analyzer';
import { V9GoAnalyzer } from './v9-go-analyzer';
import { V9CPPAnalyzer } from './v9-cpp-analyzer';
import { V9CAnalyzer } from './v9-c-analyzer';
import { V9CSharpAnalyzer } from './v9-csharp-analyzer';
import { V9RubyAnalyzer } from './v9-ruby-analyzer';
import { V9PHPAnalyzer } from './v9-php-analyzer';
import { V9SwiftAnalyzer } from './v9-swift-analyzer';
import { V9KotlinAnalyzer } from './v9-kotlin-analyzer';
// Web analyzers removed - not part of core framework

/**
 * Supported languages for V9 analyzers
 */
export type SupportedLanguage = 
  | 'java'
  | 'python'
  | 'javascript'
  | 'typescript'
  | 'rust'
  | 'go'
  | 'cpp'
  | 'c'
  | 'csharp'
  | 'ruby'
  | 'php'
  | 'swift'
  | 'kotlin'
  | 'web'
  | 'html';

/**
 * Language mapping for common variations
 */
const LANGUAGE_ALIASES: Record<string, SupportedLanguage> = {
  'js': 'javascript',
  'ts': 'typescript',
  'node': 'javascript',
  'py': 'python',
  'rs': 'rust',
  'golang': 'go',
  'c++': 'cpp',
  'cxx': 'cpp',
  'cc': 'cpp',
  'cs': 'csharp',
  'c#': 'csharp',
  'rb': 'ruby',
  'kt': 'kotlin',
};

/**
 * File extension to language mapping
 */
const EXTENSION_TO_LANGUAGE: Record<string, SupportedLanguage> = {
  '.java': 'java',
  '.py': 'python',
  '.pyw': 'python',
  '.js': 'javascript',
  '.jsx': 'javascript',
  '.ts': 'typescript',
  '.tsx': 'typescript',
  '.rs': 'rust',
  '.go': 'go',
  '.cpp': 'cpp',
  '.cc': 'cpp',
  '.cxx': 'cpp',
  '.hpp': 'cpp',
  '.h': 'c',
  '.c': 'c',
  '.cs': 'csharp',
  '.rb': 'ruby',
  '.php': 'php',
  '.swift': 'swift',
  '.kt': 'kotlin',
  '.kts': 'kotlin',
};

/**
 * V9 Analyzer Factory
 * 
 * Central factory for creating language-specific analyzers
 */
export class V9AnalyzerFactory {
  
  /**
   * Create an analyzer for the specified language
   *
   * @param language - Language name or alias
   * @returns Appropriate analyzer instance
   * @throws Error if language is not supported
   */
  static create(language: string): V9BaseAnalyzer {
    const normalizedLanguage = this.normalizeLanguage(language);
    
    switch (normalizedLanguage) {
      case 'java':
        return new V9JavaAnalyzer();
      case 'python':
        return new V9PythonAnalyzer();
      case 'javascript':
      case 'typescript':
        return new V9JavaScriptAnalyzer();
      case 'rust':
        return new V9RustAnalyzer();
      case 'go':
        return new V9GoAnalyzer();
      case 'cpp':
        return new V9CPPAnalyzer();
      case 'c':
        return new V9CAnalyzer();
      case 'csharp':
        return new V9CSharpAnalyzer();
      case 'ruby':
        return new V9RubyAnalyzer();
      case 'php':
        return new V9PHPAnalyzer();
      case 'swift':
        return new V9SwiftAnalyzer();
      case 'kotlin':
        return new V9KotlinAnalyzer();
      default:
        throw new Error(`Unsupported language: ${language}. Supported languages: ${this.getSupportedLanguages().join(', ')}`);
    }
  }

  /**
   * Alias for create() method for backward compatibility
   *
   * @param language - Language name or alias
   * @returns Appropriate analyzer instance
   * @throws Error if language is not supported
   */
  static createAnalyzer(language: string): V9BaseAnalyzer {
    return this.create(language);
  }

  /**
   * Auto-detect language from file extensions
   * 
   * @param fileExtensions - Array of file extensions found in the repository
   * @returns Most likely language based on file extensions
   */
  static detectLanguage(fileExtensions: string[]): SupportedLanguage {
    const languageCounts: Record<SupportedLanguage, number> = {} as any;
    
    // Count occurrences of each language
    for (const ext of fileExtensions) {
      const language = EXTENSION_TO_LANGUAGE[ext.toLowerCase()];
      if (language) {
        languageCounts[language] = (languageCounts[language] || 0) + 1;
      }
    }
    
    // Return the most common language, defaulting to java
    const entries = Object.entries(languageCounts);
    if (entries.length === 0) {
      return 'java'; // Default fallback
    }
    
    return entries.reduce((a, b) => a[1] > b[1] ? a : b)[0] as SupportedLanguage;
  }
  
  /**
   * Create analyzer based on file extensions in a repository
   * 
   * @param fileExtensions - Array of file extensions
   * @returns Appropriate analyzer instance
   */
  static createFromExtensions(fileExtensions: string[]): V9BaseAnalyzer {
    const language = this.detectLanguage(fileExtensions);
    return this.create(language);
  }
  
  /**
   * Get list of supported languages
   */
  static getSupportedLanguages(): SupportedLanguage[] {
    return [
      'java',
      'python', 
      'javascript',
      'typescript',
      'rust',
      'go',
      'cpp',
      'c',
      'csharp',
      'ruby',
      'php',
      'swift',
      'kotlin',
      'web',
      'html'
    ];
  }
  
  /**
   * Check if a language is supported
   */
  static isSupported(language: string): boolean {
    try {
      this.normalizeLanguage(language);
      return true;
    } catch {
      return false;
    }
  }
  
  /**
   * Get file extensions for a language
   */
  static getFileExtensions(language: string): string[] {
    const normalizedLanguage = this.normalizeLanguage(language);
    
    const extensionMap: Record<SupportedLanguage, string[]> = {
      java: ['.java', '.xml', '.gradle', '.mvn'],
      python: ['.py', '.pyw', '.pyx', '.pyd'],
      javascript: ['.js', '.jsx', '.json', '.ts', '.tsx'],
      typescript: ['.ts', '.tsx', '.js', '.jsx'],
      rust: ['.rs'],
      go: ['.go'],
      cpp: ['.cpp', '.cc', '.cxx', '.hpp', '.h'],
      c: ['.c', '.h'],
      csharp: ['.cs', '.csproj', '.sln'],
      ruby: ['.rb', '.gemspec'],
      php: ['.php', '.phtml'],
      swift: ['.swift'],
      kotlin: ['.kt', '.kts'],
      web: ['.html', '.htm', '.css', '.scss', '.sass', '.less', '.vue', '.svelte', '.js', '.jsx', '.ts', '.tsx'],
      html: ['.html', '.htm', '.css', '.scss', '.sass', '.less']
    };
    
    return extensionMap[normalizedLanguage] || [];
  }
  
  /**
   * Normalize language name to canonical form
   */
  private static normalizeLanguage(language: string): SupportedLanguage {
    const normalized = language.toLowerCase().trim();
    
    // Check direct match first
    if (this.getSupportedLanguages().includes(normalized as SupportedLanguage)) {
      return normalized as SupportedLanguage;
    }
    
    // Check aliases
    const aliasMatch = LANGUAGE_ALIASES[normalized];
    if (aliasMatch) {
      return aliasMatch;
    }
    
    throw new Error(`Unsupported language: ${language}`);
  }
}

/**
 * Default export for convenience
 */
export default V9AnalyzerFactory;