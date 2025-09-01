/**
 * Language Detection Utility
 * 
 * Detects the primary programming language of a repository
 * based on file extensions and common patterns
 */

import * as fs from 'fs';
import * as path from 'path';

export interface LanguageStats {
  language: string;
  fileCount: number;
  lineCount: number;
  percentage: number;
}

export class LanguageDetector {
  // Language mappings by file extension
  private static readonly LANGUAGE_MAP: Record<string, string> = {
    // JavaScript/TypeScript
    '.js': 'javascript',
    '.jsx': 'javascript',
    '.mjs': 'javascript',
    '.cjs': 'javascript',
    '.ts': 'typescript',
    '.tsx': 'typescript',
    
    // Python
    '.py': 'python',
    '.pyw': 'python',
    '.pyx': 'python',
    '.pyi': 'python',
    
    // Java
    '.java': 'java',
    '.class': 'java',
    '.jar': 'java',
    
    // Go
    '.go': 'go',
    '.mod': 'go',
    
    // Ruby
    '.rb': 'ruby',
    '.rake': 'ruby',
    '.gemspec': 'ruby',
    
    // PHP
    '.php': 'php',
    '.phtml': 'php',
    '.php3': 'php',
    '.php4': 'php',
    '.php5': 'php',
    '.php7': 'php',
    '.phps': 'php',
    
    // C/C++
    '.c': 'c',
    '.h': 'c',
    '.cc': 'cpp',
    '.cpp': 'cpp',
    '.cxx': 'cpp',
    '.hpp': 'cpp',
    '.hxx': 'cpp',
    '.hh': 'cpp',
    
    // C#
    '.cs': 'csharp',
    '.csx': 'csharp',
    
    // Rust
    '.rs': 'rust',
    
    // Swift
    '.swift': 'swift',
    
    // Kotlin
    '.kt': 'kotlin',
    '.kts': 'kotlin',
    
    // Scala
    '.scala': 'scala',
    '.sc': 'scala',
    
    // Shell
    '.sh': 'shell',
    '.bash': 'shell',
    '.zsh': 'shell',
    '.fish': 'shell',
    
    // SQL
    '.sql': 'sql',
    '.psql': 'sql',
    '.mysql': 'sql',
    
    // R
    '.r': 'r',
    '.R': 'r',
    '.rmd': 'r',
    '.Rmd': 'r',
    
    // Julia
    '.jl': 'julia',
    
    // Dart
    '.dart': 'dart',
    
    // Lua
    '.lua': 'lua',
    
    // Perl
    '.pl': 'perl',
    '.pm': 'perl',
    '.pod': 'perl',
    
    // Elixir
    '.ex': 'elixir',
    '.exs': 'elixir',
    
    // Clojure
    '.clj': 'clojure',
    '.cljs': 'clojure',
    '.cljc': 'clojure',
    
    // Haskell
    '.hs': 'haskell',
    '.lhs': 'haskell',
    
    // Erlang
    '.erl': 'erlang',
    '.hrl': 'erlang',
    
    // OCaml
    '.ml': 'ocaml',
    '.mli': 'ocaml',
    
    // F#
    '.fs': 'fsharp',
    '.fsi': 'fsharp',
    '.fsx': 'fsharp',
    
    // Visual Basic
    '.vb': 'vb',
    '.vbs': 'vbscript',
    
    // Objective-C
    '.m': 'objc',
    '.mm': 'objc',
    
    // Assembly
    '.asm': 'assembly',
    '.s': 'assembly',
    
    // WebAssembly
    '.wasm': 'wasm',
    '.wat': 'wasm',
    
    // Zig
    '.zig': 'zig',
    
    // Nim
    '.nim': 'nim',
    '.nims': 'nim',
    
    // Crystal
    '.cr': 'crystal',
    
    // V
    '.v': 'v',
    '.vsh': 'v',
    
    // Solidity
    '.sol': 'solidity',
    
    // Vyper
    '.vy': 'vyper',
    
    // Move
    '.move': 'move'
  };

  // Files to ignore
  private static readonly IGNORE_PATTERNS = [
    'node_modules',
    '.git',
    'vendor',
    'dist',
    'build',
    'target',
    '.idea',
    '.vscode',
    '__pycache__',
    '.pytest_cache',
    'coverage',
    '.nyc_output',
    'bower_components',
    'packages',
    '.gradle',
    '.mvn'
  ];

  // Configuration files that indicate language
  private static readonly CONFIG_INDICATORS: Record<string, string> = {
    'package.json': 'javascript',
    'tsconfig.json': 'typescript',
    'requirements.txt': 'python',
    'setup.py': 'python',
    'Pipfile': 'python',
    'pyproject.toml': 'python',
    'pom.xml': 'java',
    'build.gradle': 'java',
    'go.mod': 'go',
    'Gemfile': 'ruby',
    'composer.json': 'php',
    'Cargo.toml': 'rust',
    'Package.swift': 'swift',
    'build.sbt': 'scala',
    'mix.exs': 'elixir',
    'project.clj': 'clojure',
    'stack.yaml': 'haskell',
    'rebar.config': 'erlang',
    'dune-project': 'ocaml',
    'paket.dependencies': 'fsharp',
    'pubspec.yaml': 'dart',
    'shard.yml': 'crystal'
  };

  /**
   * Detect the primary language of a repository
   */
  public static async detectLanguage(repoPath: string): Promise<string> {
    // First check for configuration files
    const configLanguage = await this.checkConfigFiles(repoPath);
    if (configLanguage) {
      return configLanguage;
    }

    // Count files by language
    const languageStats = await this.analyzeFiles(repoPath);
    
    // Return the most common language
    if (languageStats.length > 0) {
      return languageStats[0].language;
    }

    // Default fallback
    return 'unknown';
  }

  /**
   * Get detailed language statistics
   */
  public static async getLanguageStats(repoPath: string): Promise<LanguageStats[]> {
    return this.analyzeFiles(repoPath);
  }

  /**
   * Check for configuration files that indicate language
   */
  private static async checkConfigFiles(repoPath: string): Promise<string | null> {
    for (const [file, language] of Object.entries(this.CONFIG_INDICATORS)) {
      const filePath = path.join(repoPath, file);
      if (fs.existsSync(filePath)) {
        return language;
      }
    }
    return null;
  }

  /**
   * Analyze all files in the repository
   */
  private static async analyzeFiles(repoPath: string): Promise<LanguageStats[]> {
    const languageCounts: Record<string, { files: number; lines: number }> = {};
    
    await this.walkDirectory(repoPath, (filePath: string) => {
      const ext = path.extname(filePath).toLowerCase();
      const language = this.LANGUAGE_MAP[ext];
      
      if (language) {
        if (!languageCounts[language]) {
          languageCounts[language] = { files: 0, lines: 0 };
        }
        
        languageCounts[language].files++;
        
        // Count lines (simple approach)
        try {
          const content = fs.readFileSync(filePath, 'utf-8');
          languageCounts[language].lines += content.split('\n').length;
        } catch {
          // Ignore files that can't be read
        }
      }
    });

    // Convert to sorted array
    const totalLines = Object.values(languageCounts)
      .reduce((sum, lang) => sum + lang.lines, 0);

    const stats: LanguageStats[] = Object.entries(languageCounts)
      .map(([language, counts]) => ({
        language,
        fileCount: counts.files,
        lineCount: counts.lines,
        percentage: totalLines > 0 ? (counts.lines / totalLines) * 100 : 0
      }))
      .sort((a, b) => b.lineCount - a.lineCount);

    return stats;
  }

  /**
   * Walk directory recursively
   */
  private static async walkDirectory(
    dir: string,
    callback: (filePath: string) => void,
    currentDepth = 0,
    maxDepth = 10
  ): Promise<void> {
    if (currentDepth > maxDepth) return;

    try {
      const files = fs.readdirSync(dir);
      
      for (const file of files) {
        const filePath = path.join(dir, file);
        
        // Skip ignored patterns
        if (this.IGNORE_PATTERNS.some(pattern => filePath.includes(pattern))) {
          continue;
        }

        const stat = fs.statSync(filePath);
        
        if (stat.isDirectory()) {
          await this.walkDirectory(filePath, callback, currentDepth + 1, maxDepth);
        } else if (stat.isFile()) {
          callback(filePath);
        }
      }
    } catch (error) {
      // Ignore directories we can't read
    }
  }

  /**
   * Get recommended tools for a language
   */
  public static getRecommendedTools(language: string): string[] {
    const toolMap: Record<string, string[]> = {
      javascript: ['eslint', 'jshint', 'semgrep'],
      typescript: ['eslint', 'tslint', 'semgrep'],
      python: ['pylint', 'bandit', 'mypy', 'semgrep'],
      java: ['spotbugs', 'checkstyle', 'pmd', 'semgrep'],
      go: ['gosec', 'golangci-lint', 'semgrep'],
      ruby: ['rubocop', 'brakeman', 'semgrep'],
      php: ['phpcs', 'psalm', 'phpstan', 'semgrep'],
      csharp: ['roslyn', 'semgrep'],
      cpp: ['cppcheck', 'clang-tidy', 'semgrep'],
      rust: ['clippy', 'cargo-audit', 'semgrep'],
      swift: ['swiftlint', 'semgrep'],
      kotlin: ['ktlint', 'detekt', 'semgrep'],
      scala: ['scalastyle', 'wartremover', 'semgrep']
    };

    return toolMap[language] || ['semgrep'];
  }
}