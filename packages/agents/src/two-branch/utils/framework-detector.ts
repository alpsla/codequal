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
  },
  {
    files: ['go.mod'],
    content: [
      {
        file: 'go.mod',
        patterns: [/github\.com\/gofiber\/fiber/]
      }
    ],
    priority: 10,
    framework: 'fiber',
    language: 'go',
    buildSystem: 'go-mod'
  }
];

/**
 * Rust framework detection patterns
 */
const RUST_PATTERNS: DetectionPattern[] = [
  {
    files: ['Cargo.toml'],
    content: [
      {
        file: 'Cargo.toml',
        patterns: [/actix-web/]
      }
    ],
    priority: 10,
    framework: 'actix',
    language: 'rust',
    buildSystem: 'cargo'
  },
  {
    files: ['Cargo.toml'],
    content: [
      {
        file: 'Cargo.toml',
        patterns: [/rocket\s*=/]
      }
    ],
    priority: 10,
    framework: 'rocket',
    language: 'rust',
    buildSystem: 'cargo'
  },
  {
    files: ['Cargo.toml'],
    content: [
      {
        file: 'Cargo.toml',
        patterns: [/warp\s*=/]
      }
    ],
    priority: 10,
    framework: 'warp',
    language: 'rust',
    buildSystem: 'cargo'
  }
];

/**
 * Ruby framework detection patterns
 */
const RUBY_PATTERNS: DetectionPattern[] = [
  {
    files: ['Gemfile', 'config/application.rb'],
    content: [
      {
        file: 'Gemfile',
        patterns: [/gem\s+['"]rails['"]/]
      }
    ],
    priority: 10,
    framework: 'rails',
    language: 'ruby',
    buildSystem: 'bundle'
  },
  {
    files: ['Gemfile'],
    content: [
      {
        file: 'Gemfile',
        patterns: [/gem\s+['"]sinatra['"]/]
      }
    ],
    priority: 10,
    framework: 'sinatra',
    language: 'ruby',
    buildSystem: 'bundle'
  },
  {
    files: ['Gemfile'],
    content: [
      {
        file: 'Gemfile',
        patterns: [/gem\s+['"]hanami['"]/]
      }
    ],
    priority: 10,
    framework: 'hanami',
    language: 'ruby',
    buildSystem: 'bundle'
  }
];

/**
 * PHP framework detection patterns
 */
const PHP_PATTERNS: DetectionPattern[] = [
  {
    files: ['composer.json', 'artisan'],
    content: [
      {
        file: 'composer.json',
        patterns: [/laravel\/framework/]
      }
    ],
    priority: 10,
    framework: 'laravel',
    language: 'php',
    buildSystem: 'composer'
  },
  {
    files: ['composer.json'],
    content: [
      {
        file: 'composer.json',
        patterns: [/symfony\/framework-bundle/]
      }
    ],
    priority: 10,
    framework: 'symfony',
    language: 'php',
    buildSystem: 'composer'
  },
  {
    files: ['composer.json'],
    content: [
      {
        file: 'composer.json',
        patterns: [/codeigniter4\/framework/]
      }
    ],
    priority: 10,
    framework: 'codeigniter',
    language: 'php',
    buildSystem: 'composer'
  },
  {
    files: ['composer.json'],
    content: [
      {
        file: 'composer.json',
        patterns: [/slim\/slim/]
      }
    ],
    priority: 10,
    framework: 'slim',
    language: 'php',
    buildSystem: 'composer'
  }
];

/**
 * C#/.NET framework detection patterns
 */
const DOTNET_PATTERNS: DetectionPattern[] = [
  {
    files: ['*.csproj', '*.sln'],
    content: [
      {
        file: '*.csproj',
        patterns: [/Microsoft\.AspNetCore\.App/]
      }
    ],
    priority: 10,
    framework: 'aspnet-core',
    language: 'csharp',
    buildSystem: 'nuget'
  },
  {
    files: ['*.csproj'],
    content: [
      {
        file: '*.csproj',
        patterns: [/Microsoft\.NET\.Sdk\.Web/]
      }
    ],
    priority: 9,
    framework: 'aspnet-core',
    language: 'csharp',
    buildSystem: 'nuget'
  }
];

/**
 * All detection patterns
 */
const ALL_PATTERNS = [
  ...JAVA_PATTERNS,
  ...PYTHON_PATTERNS,
  ...JS_TS_PATTERNS,
  ...GO_PATTERNS,
  ...RUST_PATTERNS,
  ...RUBY_PATTERNS,
  ...PHP_PATTERNS,
  ...DOTNET_PATTERNS
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
      'gin': ['golangci-lint', 'staticcheck', 'govulncheck', 'semgrep'],
      'echo': ['golangci-lint', 'staticcheck', 'govulncheck', 'semgrep'],
      'fiber': ['golangci-lint', 'staticcheck', 'govulncheck', 'semgrep'],
      'chi': ['golangci-lint', 'staticcheck', 'govulncheck', 'semgrep'],
      'beego': ['golangci-lint', 'staticcheck', 'govulncheck', 'semgrep'],

      // Ruby
      'rails': ['rubocop', 'brakeman', 'bundler-audit', 'semgrep'],
      'sinatra': ['rubocop', 'brakeman', 'bundler-audit', 'semgrep'],
      'hanami': ['rubocop', 'brakeman', 'bundler-audit', 'semgrep'],

      // PHP
      'laravel': ['phpstan', 'psalm', 'phpcs', 'composer-audit', 'semgrep'],
      'symfony': ['phpstan', 'psalm', 'phpcs', 'composer-audit', 'semgrep'],
      'codeigniter': ['phpstan', 'psalm', 'phpcs', 'composer-audit'],
      'slim': ['phpstan', 'psalm', 'phpcs', 'composer-audit'],

      // .NET
      'aspnet': ['dotnet-format', 'security-code-scan', 'dotnet-outdated', 'semgrep'],
      'aspnet-core': ['dotnet-format', 'security-code-scan', 'dotnet-outdated', 'semgrep'],

      // Rust
      'actix': ['clippy', 'cargo-audit', 'cargo-deny', 'semgrep'],
      'rocket': ['clippy', 'cargo-audit', 'cargo-deny', 'semgrep'],
      'warp': ['clippy', 'cargo-audit', 'cargo-deny', 'semgrep'],
      
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

// ============================================================
// INFRASTRUCTURE DETECTION
// ============================================================

/**
 * Infrastructure types that can be detected
 */
export type InfrastructureType =
  | 'docker'
  | 'kubernetes'
  | 'terraform'
  | 'cloudformation'
  | 'helm'
  | 'ansible'
  | 'pulumi'
  | 'openapi'
  | 'graphql';

/**
 * Infrastructure detection result
 */
export interface InfrastructureDetectionResult {
  hasInfrastructure: boolean;
  types: InfrastructureType[];
  files: Record<InfrastructureType, string[]>;
  scanRecommendations: {
    enableSecrets: boolean;
    enableIaC: boolean;
    enableContainer: boolean;
  };
}

/**
 * Infrastructure file patterns
 */
const INFRASTRUCTURE_PATTERNS: Record<InfrastructureType, {
  files: string[];
  extensions: string[];
  contentPatterns?: RegExp[];
}> = {
  docker: {
    files: ['Dockerfile', 'docker-compose.yml', 'docker-compose.yaml', '.dockerignore'],
    extensions: [],
    contentPatterns: [/^FROM\s+/m]
  },
  kubernetes: {
    files: [],
    extensions: ['.yaml', '.yml'],
    contentPatterns: [
      /apiVersion:\s*(apps\/v1|v1|batch\/v1|networking\.k8s\.io)/,
      /kind:\s*(Deployment|Service|Pod|ConfigMap|Secret|Ingress|StatefulSet|DaemonSet)/
    ]
  },
  terraform: {
    files: ['main.tf', 'variables.tf', 'outputs.tf', 'providers.tf', 'terraform.tfvars'],
    extensions: ['.tf', '.tfvars'],
    contentPatterns: [/^resource\s+"/, /^provider\s+"/, /^module\s+"/]
  },
  cloudformation: {
    files: [],
    extensions: ['.yaml', '.yml', '.json'],
    contentPatterns: [
      /AWSTemplateFormatVersion/,
      /Resources:\s*\n\s+\w+:\s*\n\s+Type:\s*AWS::/
    ]
  },
  helm: {
    files: ['Chart.yaml', 'Chart.yml', 'values.yaml', 'values.yml'],
    extensions: [],
    contentPatterns: [/apiVersion:\s*v[12]/, /name:\s*\w+/, /version:\s*[\d.]+/]
  },
  ansible: {
    files: ['ansible.cfg', 'playbook.yml', 'site.yml', 'inventory.yml'],
    extensions: [],
    contentPatterns: [/hosts:\s*/, /tasks:\s*\n/, /- name:\s*/]
  },
  pulumi: {
    files: ['Pulumi.yaml', 'Pulumi.yml'],
    extensions: [],
    contentPatterns: [/name:\s*\w+/, /runtime:\s*(nodejs|python|go|dotnet)/]
  },
  openapi: {
    files: ['openapi.yaml', 'openapi.yml', 'openapi.json', 'swagger.yaml', 'swagger.yml', 'swagger.json'],
    extensions: [],
    contentPatterns: [/openapi:\s*["']?3\./, /swagger:\s*["']?2\./]
  },
  graphql: {
    files: ['schema.graphql', 'schema.gql'],
    extensions: ['.graphql', '.gql'],
    contentPatterns: [/type\s+Query\s*\{/, /type\s+Mutation\s*\{/, /schema\s*\{/]
  }
};

/**
 * Detect infrastructure in a repository
 */
export async function detectInfrastructure(repoPath: string): Promise<InfrastructureDetectionResult> {
  const result: InfrastructureDetectionResult = {
    hasInfrastructure: false,
    types: [],
    files: {} as Record<InfrastructureType, string[]>,
    scanRecommendations: {
      enableSecrets: false,
      enableIaC: false,
      enableContainer: false
    }
  };

  // Initialize empty arrays for each type
  for (const type of Object.keys(INFRASTRUCTURE_PATTERNS) as InfrastructureType[]) {
    result.files[type] = [];
  }

  try {
    // Get all files recursively (max depth 5)
    const allFiles = await scanDirectoryRecursive(repoPath, 5);

    for (const type of Object.keys(INFRASTRUCTURE_PATTERNS) as InfrastructureType[]) {
      const pattern = INFRASTRUCTURE_PATTERNS[type];
      const matchedFiles: string[] = [];

      for (const file of allFiles) {
        const relativePath = path.relative(repoPath, file);
        const fileName = path.basename(file);
        const ext = path.extname(file).toLowerCase();

        // Check explicit file names
        if (pattern.files.includes(fileName)) {
          matchedFiles.push(relativePath);
          continue;
        }

        // Check extensions
        if (pattern.extensions.includes(ext)) {
          // Verify with content patterns if available
          if (pattern.contentPatterns && pattern.contentPatterns.length > 0) {
            try {
              const content = await fs.readFile(file, 'utf-8');
              const matches = pattern.contentPatterns.some(regex => regex.test(content));
              if (matches) {
                matchedFiles.push(relativePath);
              }
            } catch {
              // Skip unreadable files
            }
          } else {
            matchedFiles.push(relativePath);
          }
        }
      }

      if (matchedFiles.length > 0) {
        result.files[type] = matchedFiles;
        result.types.push(type);
      }
    }

    result.hasInfrastructure = result.types.length > 0;

    // Set scan recommendations based on detected infrastructure
    if (result.types.includes('docker') || result.types.includes('kubernetes') || result.types.includes('helm')) {
      result.scanRecommendations.enableContainer = true;
    }
    if (result.types.includes('terraform') || result.types.includes('cloudformation') ||
        result.types.includes('kubernetes') || result.types.includes('helm') ||
        result.types.includes('ansible') || result.types.includes('pulumi')) {
      result.scanRecommendations.enableIaC = true;
    }
    // Always enable secrets scanning if any infrastructure is detected
    if (result.hasInfrastructure) {
      result.scanRecommendations.enableSecrets = true;
    }

    logger.info(`🏗️ Infrastructure detection: Found ${result.types.length} types: ${result.types.join(', ') || 'none'}`);

  } catch (error) {
    logger.error(`Infrastructure detection failed: ${error}`);
  }

  return result;
}

/**
 * Recursively scan directory for files
 */
async function scanDirectoryRecursive(dir: string, maxDepth: number, currentDepth = 0): Promise<string[]> {
  if (currentDepth >= maxDepth) return [];

  const files: string[] = [];
  const skipDirs = ['node_modules', '.git', 'vendor', '__pycache__', '.venv', 'venv', 'dist', 'build', 'target'];

  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        if (!entry.name.startsWith('.') && !skipDirs.includes(entry.name)) {
          const subFiles = await scanDirectoryRecursive(fullPath, maxDepth, currentDepth + 1);
          files.push(...subFiles);
        }
      } else if (entry.isFile()) {
        files.push(fullPath);
      }
    }
  } catch {
    // Ignore permission errors
  }

  return files;
}

/**
 * Quick check if repository has any infrastructure files
 * (Faster than full detection - just checks for existence)
 */
export async function hasInfrastructureFiles(repoPath: string): Promise<boolean> {
  const quickCheckFiles = [
    'Dockerfile',
    'docker-compose.yml',
    'docker-compose.yaml',
    'main.tf',
    'Chart.yaml',
    'kubernetes',
    'k8s',
    'deploy',
    'infra',
    'infrastructure'
  ];

  for (const file of quickCheckFiles) {
    const fullPath = path.join(repoPath, file);
    if (existsSync(fullPath)) {
      return true;
    }
  }

  // Check for common infrastructure directories
  const infraDirs = ['kubernetes', 'k8s', 'deploy', 'infra', 'infrastructure', 'helm', 'terraform', 'cloudformation'];
  for (const dir of infraDirs) {
    const dirPath = path.join(repoPath, dir);
    if (existsSync(dirPath)) {
      return true;
    }
  }

  return false;
}

/**
 * Get security scan configuration based on infrastructure detection
 */
export async function getSecurityScanConfig(repoPath: string): Promise<{
  enableSecrets: boolean;
  enableIaC: boolean;
  enableContainer: boolean;
  detectedInfrastructure: InfrastructureType[];
}> {
  // Quick check first
  const hasInfra = await hasInfrastructureFiles(repoPath);

  if (!hasInfra) {
    // Still enable secrets scanning (can find hardcoded secrets in any code)
    return {
      enableSecrets: true,  // Always scan for secrets
      enableIaC: false,
      enableContainer: false,
      detectedInfrastructure: []
    };
  }

  // Full detection for detailed config
  const detection = await detectInfrastructure(repoPath);

  return {
    ...detection.scanRecommendations,
    detectedInfrastructure: detection.types
  };
}

