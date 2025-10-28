/**
 * Universal Framework Detector
 * 
 * Automatically detects programming frameworks from repository structure.
 * Supports Java, Python, JavaScript/TypeScript, Go, Ruby, PHP, and more.
 * 
 * Features:
 * - Multi-language support
 * - Framework version detection
 * - Build system identification
 * - Confidence scoring
 * 
 * @example
 * const detector = new FrameworkDetector();
 * const result = await detector.detectFrameworks('/path/to/repo');
 * console.log(result.primaryFramework); // 'spring-boot'
 * console.log(result.buildSystem); // 'gradle'
 * console.log(result.language); // 'java'
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { existsSync } from 'fs';
import { logger } from './logger';

// ============================================================
// TYPES
// ============================================================

/**
 * Supported programming languages
 */
export type Language = 
  | 'java' 
  | 'python' 
  | 'javascript' 
  | 'typescript' 
  | 'go' 
  | 'ruby' 
  | 'php' 
  | 'csharp' 
  | 'rust'
  | 'kotlin'
  | 'scala'
  | 'unknown';

/**
 * Supported frameworks by language
 */
export type Framework = 
  // Java
  | 'spring-boot'
  | 'spring'
  | 'quarkus'
  | 'micronaut'
  | 'dropwizard'
  | 'helidon'
  | 'vertx'
  | 'play'
  // Python
  | 'django'
  | 'flask'
  | 'fastapi'
  | 'tornado'
  | 'pyramid'
  | 'bottle'
  // JavaScript/TypeScript
  | 'express'
  | 'nest'
  | 'next'
  | 'react'
  | 'vue'
  | 'angular'
  | 'svelte'
  // Go
  | 'gin'
  | 'echo'
  | 'fiber'
  | 'chi'
  | 'beego'
  // Ruby
  | 'rails'
  | 'sinatra'
  | 'hanami'
  // PHP
  | 'laravel'
  | 'symfony'
  | 'codeigniter'
  | 'slim'
  // .NET
  | 'aspnet'
  | 'aspnet-core'
  // Rust
  | 'actix'
  | 'rocket'
  | 'warp'
  // Kotlin
  | 'ktor'
  // Scala
  | 'akka'
  | 'unknown';

/**
 * Build systems
 */
export type BuildSystem = 
  | 'gradle'
  | 'maven'
  | 'npm'
  | 'yarn'
  | 'pnpm'
  | 'pip'
  | 'poetry'
  | 'cargo'
  | 'go-mod'
  | 'bundle'
  | 'composer'
  | 'nuget'
  | 'sbt'
  | 'unknown';

/**
 * Framework detection result
 */
export interface FrameworkDetectionResult {
  // Primary identifiers
  language: Language;
  primaryFramework: Framework;
  frameworks: Framework[];
  buildSystem: BuildSystem;
  
  // Confidence (0-100)
  confidence: number;
  
  // Version information
  versions?: {
    language?: string;
    framework?: string;
    buildSystem?: string;
  };
  
  // Detection metadata
  detectionMethod: string;
  filesScanned: string[];
  matchedPatterns: string[];
}

/**
 * Detection pattern
 */
interface DetectionPattern {
  files: string[];
  content?: {
    file: string;
    patterns: RegExp[];
  }[];
  priority: number;
  framework: Framework;
  language: Language;
  buildSystem?: BuildSystem;
}

// ============================================================
// FRAMEWORK DETECTION PATTERNS
// ============================================================

/**
 * Java framework detection patterns
 */
const JAVA_PATTERNS: DetectionPattern[] = [
  {
    files: ['pom.xml', 'build.gradle', 'build.gradle.kts'],
    content: [
      {
        file: 'pom.xml',
        patterns: [
          /<groupId>org\.springframework\.boot<\/groupId>/,
          /<artifactId>spring-boot-starter/
        ]
      },
      {
        file: 'build.gradle',
        patterns: [
          /org\.springframework\.boot/,
          /spring-boot-starter/
        ]
      }
    ],
    priority: 10,
    framework: 'spring-boot',
    language: 'java',
    buildSystem: 'gradle'
  },
  {
    files: ['pom.xml', 'build.gradle', 'build.gradle.kts'],
    content: [
      {
        file: 'pom.xml',
        patterns: [
          /<groupId>io\.quarkus<\/groupId>/,
          /<artifactId>quarkus-/
        ]
      },
      {
        file: 'build.gradle',
        patterns: [
          /io\.quarkus/,
          /quarkus-/
        ]
      }
    ],
    priority: 10,
    framework: 'quarkus',
    language: 'java',
    buildSystem: 'gradle'
  },
  {
    files: ['pom.xml', 'build.gradle', 'build.gradle.kts'],
    content: [
      {
        file: 'pom.xml',
        patterns: [
          /<groupId>io\.micronaut<\/groupId>/,
          /<artifactId>micronaut-/
        ]
      },
      {
        file: 'build.gradle',
        patterns: [
          /io\.micronaut/,
          /micronaut-/
        ]
      }
    ],
    priority: 10,
    framework: 'micronaut',
    language: 'java',
    buildSystem: 'gradle'
  },
  {
    files: ['pom.xml', 'build.gradle'],
    content: [
      {
        file: 'pom.xml',
        patterns: [/<groupId>io\.dropwizard<\/groupId>/]
      }
    ],
    priority: 9,
    framework: 'dropwizard',
    language: 'java',
    buildSystem: 'maven'
  },
  {
    files: ['pom.xml', 'build.gradle'],
    content: [
      {
        file: 'pom.xml',
        patterns: [/<groupId>io\.helidon<\/groupId>/]
      }
    ],
    priority: 9,
    framework: 'helidon',
    language: 'java',
    buildSystem: 'maven'
  }
];

/**
 * Python framework detection patterns
 */
const PYTHON_PATTERNS: DetectionPattern[] = [
  {
    files: ['requirements.txt', 'setup.py', 'pyproject.toml', 'Pipfile'],
    content: [
      {
        file: 'requirements.txt',
        patterns: [/^Django[>=]/m, /django==/]
      },
      {
        file: 'pyproject.toml',
        patterns: [/django/]
      }
    ],
    priority: 10,
    framework: 'django',
    language: 'python',
    buildSystem: 'pip'
  },
  {
    files: ['requirements.txt', 'setup.py', 'pyproject.toml'],
    content: [
      {
        file: 'requirements.txt',
        patterns: [/^Flask[>=]/m, /flask==/]
      }
    ],
    priority: 10,
    framework: 'flask',
    language: 'python',
    buildSystem: 'pip'
  },
  {
    files: ['requirements.txt', 'setup.py', 'pyproject.toml'],
    content: [
      {
        file: 'requirements.txt',
        patterns: [/^fastapi[>=]/m, /fastapi==/]
      }
    ],
    priority: 10,
    framework: 'fastapi',
    language: 'python',
    buildSystem: 'pip'
  }
];

/**
 * JavaScript/TypeScript framework detection patterns
 */
const JS_TS_PATTERNS: DetectionPattern[] = [
  {
    files: ['package.json'],
    content: [
      {
        file: 'package.json',
        patterns: [/"next"/, /"@next\//]
      }
    ],
    priority: 10,
    framework: 'next',
    language: 'typescript',
    buildSystem: 'npm'
  },
  {
    files: ['package.json'],
    content: [
      {
        file: 'package.json',
        patterns: [/"@nestjs\/core"/]
      }
    ],
    priority: 10,
    framework: 'nest',
    language: 'typescript',
    buildSystem: 'npm'
  },
  {
    files: ['package.json'],
    content: [
      {
        file: 'package.json',
        patterns: [/"express"/]
      }
    ],
    priority: 9,
    framework: 'express',
    language: 'javascript',
    buildSystem: 'npm'
  },
  {
    files: ['package.json'],
    content: [
      {
        file: 'package.json',
        patterns: [/"react"/, /"react-dom"/]
      }
    ],
    priority: 8,
    framework: 'react',
    language: 'javascript',
    buildSystem: 'npm'
  }
];

/**
 * Go framework detection patterns
 */
const GO_PATTERNS: DetectionPattern[] = [
  {
    files: ['go.mod'],
    content: [
      {
        file: 'go.mod',
        patterns: [/github\.com\/gin-gonic\/gin/]
      }
    ],
    priority: 10,
    framework: 'gin',
    language: 'go',
    buildSystem: 'go-mod'
  },
  {
    files: ['go.mod'],
    content: [
      {
        file: 'go.mod',
        patterns: [/github\.com\/labstack\/echo/]
      }
    ],
    priority: 10,
    framework: 'echo',
    language: 'go',
    buildSystem: 'go-mod'
  }
];

/**
 * All detection patterns
 */
const ALL_PATTERNS = [
  ...JAVA_PATTERNS,
  ...PYTHON_PATTERNS,
  ...JS_TS_PATTERNS,
  ...GO_PATTERNS
];

// ============================================================
// FRAMEWORK DETECTOR
// ============================================================

/**
 * Universal framework detector
 */
export class FrameworkDetector {
  private patterns: DetectionPattern[];

  constructor(additionalPatterns: DetectionPattern[] = []) {
    this.patterns = [...ALL_PATTERNS, ...additionalPatterns];
    // Sort by priority (highest first)
    this.patterns.sort((a, b) => b.priority - a.priority);
  }

  /**
   * Detect frameworks in a repository
   */
  async detectFrameworks(repoPath: string): Promise<FrameworkDetectionResult> {
    logger.info(`🔍 Detecting frameworks in: ${repoPath}`);

    const matches: Array<{
      pattern: DetectionPattern;
      matchedFiles: string[];
      matchedPatterns: string[];
      confidence: number;
    }> = [];

    // Check each pattern
    for (const pattern of this.patterns) {
      const matchedFiles: string[] = [];
      const matchedPatterns: string[] = [];
      let confidence = 0;

      // Check if required files exist
      for (const file of pattern.files) {
        const filePath = path.join(repoPath, file);
        if (existsSync(filePath)) {
          matchedFiles.push(file);
          confidence += 20;

          // Check content patterns if defined
          if (pattern.content) {
            for (const contentRule of pattern.content) {
              if (contentRule.file === file) {
                try {
                  const content = await fs.readFile(filePath, 'utf-8');
                  for (const regex of contentRule.patterns) {
                    if (regex.test(content)) {
                      matchedPatterns.push(regex.source);
                      confidence += 30;
                    }
                  }
                } catch (error) {
                  logger.warn(`Failed to read ${filePath}: ${error}`);
                }
              }
            }
          }
        }
      }

      if (matchedFiles.length > 0) {
        matches.push({
          pattern,
          matchedFiles,
          matchedPatterns,
          confidence: Math.min(confidence, 100)
        });
      }
    }

    // Sort matches by confidence
    matches.sort((a, b) => b.confidence - a.confidence);

    // If no matches, try to detect language only
    if (matches.length === 0) {
      return this.detectLanguageOnly(repoPath);
    }

    // Return best match
    const bestMatch = matches[0];
    const allFrameworks = matches
      .filter(m => m.confidence >= 50)
      .map(m => m.pattern.framework);

    return {
      language: bestMatch.pattern.language,
      primaryFramework: bestMatch.pattern.framework,
      frameworks: allFrameworks,
      buildSystem: bestMatch.pattern.buildSystem || 'unknown',
      confidence: bestMatch.confidence,
      detectionMethod: 'pattern-matching',
      filesScanned: bestMatch.matchedFiles,
      matchedPatterns: bestMatch.matchedPatterns
    };
  }

  /**
   * Detect language only (fallback when no framework detected)
   */
  private async detectLanguageOnly(repoPath: string): Promise<FrameworkDetectionResult> {
    const files = await this.scanDirectory(repoPath, 3); // Max depth 3
    
    const extensions = new Map<string, number>();
    for (const file of files) {
      const ext = path.extname(file).toLowerCase();
      extensions.set(ext, (extensions.get(ext) || 0) + 1);
    }

    const languageMap: Record<string, Language> = {
      '.java': 'java',
      '.py': 'python',
      '.js': 'javascript',
      '.ts': 'typescript',
      '.go': 'go',
      '.rb': 'ruby',
      '.php': 'php',
      '.cs': 'csharp',
      '.rs': 'rust',
      '.kt': 'kotlin',
      '.scala': 'scala'
    };

    // Find most common extension
    let maxCount = 0;
    let detectedLanguage: Language = 'unknown';
    for (const [ext, count] of extensions.entries()) {
      if (count > maxCount && languageMap[ext]) {
        maxCount = count;
        detectedLanguage = languageMap[ext];
      }
    }

    return {
      language: detectedLanguage,
      primaryFramework: 'unknown',
      frameworks: [],
      buildSystem: 'unknown',
      confidence: 30, // Low confidence without framework detection
      detectionMethod: 'file-extension',
      filesScanned: files.slice(0, 10), // Sample
      matchedPatterns: []
    };
  }

  /**
   * Recursively scan directory for files
   */
  private async scanDirectory(dir: string, maxDepth: number, currentDepth = 0): Promise<string[]> {
    if (currentDepth >= maxDepth) return [];

    const files: string[] = [];
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory() && !entry.name.startsWith('.')) {
          const subFiles = await this.scanDirectory(fullPath, maxDepth, currentDepth + 1);
          files.push(...subFiles);
        } else if (entry.isFile()) {
          files.push(fullPath);
        }
      }
    } catch (error) {
      // Ignore permission errors
    }
    return files;
  }

  /**
   * Get tool configuration for detected framework
   */
  getToolsForFramework(framework: Framework): string[] {
    const frameworkTools: Record<Framework, string[]> = {
      // Java
      'spring-boot': ['pmd', 'semgrep', 'dependency-check', 'checkstyle'],
      'spring': ['pmd', 'semgrep', 'dependency-check', 'checkstyle'],
      'quarkus': ['pmd', 'semgrep', 'dependency-check'],
      'micronaut': ['pmd', 'semgrep', 'dependency-check'],
      'dropwizard': ['pmd', 'semgrep', 'dependency-check'],
      'helidon': ['pmd', 'semgrep', 'dependency-check'],
      'vertx': ['pmd', 'semgrep', 'dependency-check'],
      'play': ['pmd', 'semgrep', 'dependency-check'],
      
      // Python
      'django': ['pylint', 'bandit', 'safety'],
      'flask': ['pylint', 'bandit', 'safety'],
      'fastapi': ['pylint', 'bandit', 'safety'],
      'tornado': ['pylint', 'bandit', 'safety'],
      'pyramid': ['pylint', 'bandit', 'safety'],
      'bottle': ['pylint', 'bandit', 'safety'],
      
      // JavaScript/TypeScript
      'express': ['eslint', 'semgrep', 'npm-audit'],
      'nest': ['eslint', 'semgrep', 'npm-audit'],
      'next': ['eslint', 'semgrep', 'npm-audit'],
      'react': ['eslint', 'semgrep', 'npm-audit'],
      'vue': ['eslint', 'semgrep', 'npm-audit'],
      'angular': ['eslint', 'semgrep', 'npm-audit'],
      'svelte': ['eslint', 'semgrep', 'npm-audit'],
      
      // Go
      'gin': ['golangci-lint', 'gosec'],
      'echo': ['golangci-lint', 'gosec'],
      'fiber': ['golangci-lint', 'gosec'],
      'chi': ['golangci-lint', 'gosec'],
      'beego': ['golangci-lint', 'gosec'],
      
      // Ruby
      'rails': ['rubocop', 'brakeman', 'bundler-audit'],
      'sinatra': ['rubocop', 'brakeman', 'bundler-audit'],
      'hanami': ['rubocop', 'brakeman', 'bundler-audit'],
      
      // PHP
      'laravel': ['phpcs', 'psalm', 'composer-audit'],
      'symfony': ['phpcs', 'psalm', 'composer-audit'],
      'codeigniter': ['phpcs', 'psalm'],
      'slim': ['phpcs', 'psalm'],
      
      // .NET
      'aspnet': ['dotnet-format', 'security-code-scan'],
      'aspnet-core': ['dotnet-format', 'security-code-scan'],
      
      // Rust
      'actix': ['clippy', 'cargo-audit'],
      'rocket': ['clippy', 'cargo-audit'],
      'warp': ['clippy', 'cargo-audit'],
      
      // Kotlin
      'ktor': ['detekt', 'ktlint'],
      
      // Scala
      'akka': ['scalastyle', 'scalafix'],
      
      // Unknown
      'unknown': []
    };

    return frameworkTools[framework] || [];
  }
}

/**
 * Create a default framework detector instance
 */
export function createFrameworkDetector(): FrameworkDetector {
  return new FrameworkDetector();
}

