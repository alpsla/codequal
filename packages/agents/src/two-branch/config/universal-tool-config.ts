/**
 * Universal Tool Configuration Strategy
 * 
 * Maps frameworks → tools and analysis modes → tool subsets.
 * This configuration is language-agnostic and framework-aware.
 * 
 * Features:
 * - Framework-aware tool selection
 * - Analysis mode support (critical-only, standard, thorough, complete)
 * - Tool category mapping
 * - Priority-based tool ordering
 * - Performance estimation
 * 
 * @example
 * const resolver = new UniversalToolConfigResolver();
 * const tools = await resolver.getToolsFor({
 *   framework: 'spring-boot',
 *   mode: 'standard',
 *   branch: 'pr'
 * });
 * // Returns: ['pmd', 'semgrep', 'dependency-check']
 */

import { logger } from '../utils/logger';
import type { Framework, Language, BuildSystem } from '../utils/framework-detector';
import type { AnalysisMode } from './analysis-modes';
import { UNIVERSAL_ANALYSIS_MODES, ToolCategory } from './analysis-modes';

// ============================================================
// TYPES
// ============================================================

/**
 * Tool definition
 */
export interface ToolDefinition {
  name: string;
  displayName: string;
  category: ToolCategory;
  languages: Language[];
  priority: number;
  estimatedDuration: number; // milliseconds
  requiresCompilation: boolean;
  runOnBothBranches: boolean;
}

/**
 * Tool configuration request
 */
export interface ToolConfigRequest {
  framework: Framework;
  language?: Language;
  buildSystem?: BuildSystem;
  mode: AnalysisMode;
  branch: 'base' | 'pr';
  changedFiles?: string[];
}

/**
 * Tool configuration response
 */
export interface ToolConfigResponse {
  tools: string[];
  estimatedDuration: number;
  toolDetails: ToolDefinition[];
  recommendations: string[];
}

// ============================================================
// UNIVERSAL TOOL REGISTRY
// ============================================================

/**
 * All available tools across all languages
 */
export const UNIVERSAL_TOOL_REGISTRY: ToolDefinition[] = [
  // Java Tools
  {
    name: 'pmd',
    displayName: 'PMD',
    category: ToolCategory.CODE_QUALITY,
    languages: ['java'],
    priority: 10,
    estimatedDuration: 15000,
    requiresCompilation: false,
    runOnBothBranches: true
  },
  {
    name: 'semgrep',
    displayName: 'Semgrep',
    category: ToolCategory.SECURITY,
    languages: ['java', 'python', 'javascript', 'typescript', 'go', 'ruby', 'php', 'csharp'],
    priority: 10,
    estimatedDuration: 20000,
    requiresCompilation: false,
    runOnBothBranches: true
  },
  {
    name: 'checkstyle',
    displayName: 'Checkstyle',
    category: ToolCategory.STYLE_LINT,
    languages: ['java'],
    priority: 7,
    estimatedDuration: 10000,
    requiresCompilation: false,
    runOnBothBranches: true
  },
  {
    name: 'spotbugs',
    displayName: 'SpotBugs',
    category: ToolCategory.ADVANCED,
    languages: ['java'],
    priority: 6,
    estimatedDuration: 30000,
    requiresCompilation: true,
    runOnBothBranches: true
  },
  {
    name: 'dependency-check',
    displayName: 'OWASP Dependency-Check',
    category: ToolCategory.DEPENDENCY_SCAN,
    languages: ['java'],
    priority: 8,
    estimatedDuration: 60000,
    requiresCompilation: false,
    runOnBothBranches: false // Only run on PR branch to save time
  },
  // Session 59 P2: Java Architecture Tools
  {
    name: 'jdepend',
    displayName: 'JDepend',
    category: ToolCategory.ADVANCED,
    languages: ['java'],
    priority: 5,  // Lower priority - run after quality/security tools
    estimatedDuration: 20000,
    requiresCompilation: false,  // Can use source-based analysis fallback
    runOnBothBranches: true
  },

  // Python Tools
  {
    name: 'pylint',
    displayName: 'Pylint',
    category: ToolCategory.CODE_QUALITY,
    languages: ['python'],
    priority: 10,
    estimatedDuration: 15000,
    requiresCompilation: false,
    runOnBothBranches: true
  },
  {
    name: 'bandit',
    displayName: 'Bandit',
    category: ToolCategory.SECURITY,
    languages: ['python'],
    priority: 10,
    estimatedDuration: 10000,
    requiresCompilation: false,
    runOnBothBranches: true
  },
  {
    name: 'safety',
    displayName: 'Safety',
    category: ToolCategory.DEPENDENCY_SCAN,
    languages: ['python'],
    priority: 8,
    estimatedDuration: 5000,
    requiresCompilation: false,
    runOnBothBranches: false
  },
  {
    name: 'mypy',
    displayName: 'Mypy',
    category: ToolCategory.ADVANCED,
    languages: ['python'],
    priority: 7,
    estimatedDuration: 20000,
    requiresCompilation: false,
    runOnBothBranches: true
  },
  // Session 51: Updated Python tools
  {
    name: 'ruff',
    displayName: 'Ruff',
    category: ToolCategory.CODE_QUALITY,
    languages: ['python'],
    priority: 10,
    estimatedDuration: 5000,  // Ruff is 10-100x faster than Pylint
    requiresCompilation: false,
    runOnBothBranches: true
  },
  {
    name: 'pip-audit',
    displayName: 'pip-audit',
    category: ToolCategory.DEPENDENCY_SCAN,
    languages: ['python'],
    priority: 8,
    estimatedDuration: 8000,
    requiresCompilation: false,
    runOnBothBranches: false
  },
  // Session 59 P2: Python Architecture Tools
  {
    name: 'pydeps',
    displayName: 'pydeps',
    category: ToolCategory.ADVANCED,
    languages: ['python'],
    priority: 5,  // Lower priority - run after quality/security tools
    estimatedDuration: 15000,
    requiresCompilation: false,
    runOnBothBranches: true
  },
  {
    name: 'import-linter',
    displayName: 'import-linter',
    category: ToolCategory.ADVANCED,
    languages: ['python'],
    priority: 5,
    estimatedDuration: 10000,
    requiresCompilation: false,
    runOnBothBranches: true
  },

  // JavaScript/TypeScript Tools
  {
    name: 'eslint',
    displayName: 'ESLint',
    category: ToolCategory.CODE_QUALITY,
    languages: ['javascript', 'typescript'],
    priority: 10,
    estimatedDuration: 10000,
    requiresCompilation: false,
    runOnBothBranches: true
  },
  {
    name: 'npm-audit',
    displayName: 'npm audit',
    category: ToolCategory.DEPENDENCY_SCAN,
    languages: ['javascript', 'typescript'],
    priority: 8,
    estimatedDuration: 5000,
    requiresCompilation: false,
    runOnBothBranches: false
  },
  
  // Go Tools
  {
    name: 'golangci-lint',
    displayName: 'golangci-lint',
    category: ToolCategory.CODE_QUALITY,
    languages: ['go'],
    priority: 10,
    estimatedDuration: 15000,
    requiresCompilation: false,
    runOnBothBranches: true
  },
  {
    name: 'staticcheck',
    displayName: 'Staticcheck',
    category: ToolCategory.CODE_QUALITY,
    languages: ['go'],
    priority: 9,
    estimatedDuration: 12000,
    requiresCompilation: false,
    runOnBothBranches: true
  },
  {
    name: 'govulncheck',
    displayName: 'govulncheck',
    category: ToolCategory.DEPENDENCY_SCAN,
    languages: ['go'],
    priority: 8,
    estimatedDuration: 10000,
    requiresCompilation: false,
    runOnBothBranches: false
  },

  // Rust Tools
  {
    name: 'clippy',
    displayName: 'Clippy',
    category: ToolCategory.CODE_QUALITY,
    languages: ['rust'],
    priority: 10,
    estimatedDuration: 30000,
    requiresCompilation: true,
    runOnBothBranches: true
  },
  {
    name: 'cargo-audit',
    displayName: 'cargo-audit',
    category: ToolCategory.DEPENDENCY_SCAN,
    languages: ['rust'],
    priority: 9,
    estimatedDuration: 5000,
    requiresCompilation: false,
    runOnBothBranches: false
  },
  {
    name: 'cargo-deny',
    displayName: 'cargo-deny',
    category: ToolCategory.DEPENDENCY_SCAN,
    languages: ['rust'],
    priority: 8,
    estimatedDuration: 10000,
    requiresCompilation: false,
    runOnBothBranches: false
  },

  // Ruby Tools
  {
    name: 'rubocop',
    displayName: 'RuboCop',
    category: ToolCategory.CODE_QUALITY,
    languages: ['ruby'],
    priority: 10,
    estimatedDuration: 15000,
    requiresCompilation: false,
    runOnBothBranches: true
  },
  {
    name: 'brakeman',
    displayName: 'Brakeman',
    category: ToolCategory.SECURITY,
    languages: ['ruby'],
    priority: 10,
    estimatedDuration: 20000,
    requiresCompilation: false,
    runOnBothBranches: true
  },
  {
    name: 'bundler-audit',
    displayName: 'bundler-audit',
    category: ToolCategory.DEPENDENCY_SCAN,
    languages: ['ruby'],
    priority: 8,
    estimatedDuration: 5000,
    requiresCompilation: false,
    runOnBothBranches: false
  },

  // C#/.NET Tools
  {
    name: 'dotnet-format',
    displayName: 'dotnet format',
    category: ToolCategory.CODE_QUALITY,
    languages: ['csharp'],
    priority: 10,
    estimatedDuration: 15000,
    requiresCompilation: false,
    runOnBothBranches: true
  },
  {
    name: 'security-code-scan',
    displayName: 'Security Code Scan',
    category: ToolCategory.SECURITY,
    languages: ['csharp'],
    priority: 10,
    estimatedDuration: 30000,
    requiresCompilation: true,
    runOnBothBranches: true
  },
  {
    name: 'dotnet-outdated',
    displayName: 'dotnet-outdated',
    category: ToolCategory.DEPENDENCY_SCAN,
    languages: ['csharp'],
    priority: 8,
    estimatedDuration: 10000,
    requiresCompilation: false,
    runOnBothBranches: false
  },

  // PHP Tools
  {
    name: 'phpstan',
    displayName: 'PHPStan',
    category: ToolCategory.CODE_QUALITY,
    languages: ['php'],
    priority: 10,
    estimatedDuration: 20000,
    requiresCompilation: false,
    runOnBothBranches: true
  },
  {
    name: 'psalm',
    displayName: 'Psalm',
    category: ToolCategory.CODE_QUALITY,
    languages: ['php'],
    priority: 9,
    estimatedDuration: 25000,
    requiresCompilation: false,
    runOnBothBranches: true
  },
  {
    name: 'phpcs',
    displayName: 'PHP_CodeSniffer',
    category: ToolCategory.STYLE_LINT,
    languages: ['php'],
    priority: 7,
    estimatedDuration: 10000,
    requiresCompilation: false,
    runOnBothBranches: true
  },
  {
    name: 'composer-audit',
    displayName: 'composer audit',
    category: ToolCategory.DEPENDENCY_SCAN,
    languages: ['php'],
    priority: 8,
    estimatedDuration: 5000,
    requiresCompilation: false,
    runOnBothBranches: false
  },

  // ============================================================
  // P0 SECURITY TOOLS (Session 59) - Universal
  // ============================================================

  // Secret Detection Tools
  {
    name: 'gitleaks',
    displayName: 'Gitleaks',
    category: ToolCategory.SECURITY,
    languages: ['java', 'python', 'javascript', 'typescript', 'go', 'ruby', 'php', 'csharp', 'rust'],
    priority: 10,  // High priority - secrets are critical
    estimatedDuration: 10000,
    requiresCompilation: false,
    runOnBothBranches: true
  },
  {
    name: 'trufflehog',
    displayName: 'TruffleHog',
    category: ToolCategory.SECURITY,
    languages: ['java', 'python', 'javascript', 'typescript', 'go', 'ruby', 'php', 'csharp', 'rust'],
    priority: 10,
    estimatedDuration: 15000,
    requiresCompilation: false,
    runOnBothBranches: true
  },

  // IaC Security Tools
  {
    name: 'checkov',
    displayName: 'Checkov',
    category: ToolCategory.SECURITY,
    languages: ['java', 'python', 'javascript', 'typescript', 'go', 'ruby', 'php', 'csharp', 'rust'],
    priority: 9,
    estimatedDuration: 30000,
    requiresCompilation: false,
    runOnBothBranches: true
  },

  // Container Security Tools
  {
    name: 'trivy',
    displayName: 'Trivy',
    category: ToolCategory.SECURITY,
    languages: ['java', 'python', 'javascript', 'typescript', 'go', 'ruby', 'php', 'csharp', 'rust'],
    priority: 9,
    estimatedDuration: 20000,
    requiresCompilation: false,
    runOnBothBranches: false  // Usually scan final images
  },
  {
    name: 'grype',
    displayName: 'Grype',
    category: ToolCategory.SECURITY,
    languages: ['java', 'python', 'javascript', 'typescript', 'go', 'ruby', 'php', 'csharp', 'rust'],
    priority: 8,
    estimatedDuration: 15000,
    requiresCompilation: false,
    runOnBothBranches: false
  },

  // ============================================================
  // P1 TOOLS (Session 59)
  // ============================================================

  // API Design Tools
  {
    name: 'spectral',
    displayName: 'Spectral',
    category: ToolCategory.STYLE_LINT,  // API schema linting
    languages: ['java', 'python', 'javascript', 'typescript', 'go', 'ruby', 'php', 'csharp', 'rust'],
    priority: 6,
    estimatedDuration: 5000,
    requiresCompilation: false,
    runOnBothBranches: true
  },

  // GraphQL Security Tools
  {
    name: 'graphql-cop',
    displayName: 'GraphQL Cop',
    category: ToolCategory.SECURITY,
    languages: ['javascript', 'typescript', 'python', 'ruby', 'java', 'go'],
    priority: 7,
    estimatedDuration: 8000,
    requiresCompilation: false,
    runOnBothBranches: true
  }
];

// ============================================================
// FRAMEWORK → TOOL MAPPINGS
// ============================================================

/**
 * Maps frameworks to their recommended tools
 */
export const FRAMEWORK_TOOL_MAPPINGS: Record<Framework, string[]> = {
  // Java Frameworks (Session 59: Added jdepend for architecture analysis)
  'spring-boot': ['pmd', 'semgrep', 'dependency-check', 'checkstyle', 'jdepend'],
  'spring': ['pmd', 'semgrep', 'dependency-check', 'checkstyle', 'jdepend'],
  'quarkus': ['pmd', 'semgrep', 'dependency-check', 'jdepend'],
  'micronaut': ['pmd', 'semgrep', 'dependency-check', 'jdepend'],
  'dropwizard': ['pmd', 'semgrep', 'dependency-check', 'jdepend'],
  'helidon': ['pmd', 'semgrep', 'dependency-check', 'jdepend'],
  'vertx': ['pmd', 'semgrep', 'dependency-check', 'jdepend'],
  'play': ['pmd', 'semgrep', 'dependency-check', 'jdepend'],

  // Python Frameworks (Session 51: ruff/pip-audit replace pylint/safety)
  // (Session 59: Added pydeps/import-linter for architecture analysis)
  'django': ['ruff', 'bandit', 'pip-audit', 'semgrep', 'pydeps', 'import-linter'],
  'flask': ['ruff', 'bandit', 'pip-audit', 'semgrep', 'pydeps', 'import-linter'],
  'fastapi': ['ruff', 'bandit', 'pip-audit', 'semgrep', 'mypy', 'pydeps', 'import-linter'],
  'tornado': ['ruff', 'bandit', 'pip-audit', 'pydeps'],
  'pyramid': ['ruff', 'bandit', 'pip-audit', 'pydeps'],
  'bottle': ['ruff', 'bandit', 'pip-audit', 'pydeps'],
  
  // JavaScript/TypeScript Frameworks
  'express': ['eslint', 'semgrep', 'npm-audit'],
  'nest': ['eslint', 'semgrep', 'npm-audit'],
  'next': ['eslint', 'semgrep', 'npm-audit'],
  'react': ['eslint', 'semgrep', 'npm-audit'],
  'vue': ['eslint', 'semgrep', 'npm-audit'],
  'angular': ['eslint', 'semgrep', 'npm-audit'],
  'svelte': ['eslint', 'semgrep', 'npm-audit'],
  
  // Go Frameworks
  'gin': ['golangci-lint', 'staticcheck', 'govulncheck', 'semgrep'],
  'echo': ['golangci-lint', 'staticcheck', 'govulncheck', 'semgrep'],
  'fiber': ['golangci-lint', 'staticcheck', 'govulncheck', 'semgrep'],
  'chi': ['golangci-lint', 'staticcheck', 'govulncheck', 'semgrep'],
  'beego': ['golangci-lint', 'staticcheck', 'govulncheck', 'semgrep'],
  
  // Ruby Frameworks
  'rails': ['rubocop', 'brakeman', 'bundler-audit', 'semgrep'],
  'sinatra': ['rubocop', 'brakeman', 'bundler-audit'],
  'hanami': ['rubocop', 'brakeman', 'bundler-audit'],
  
  // PHP Frameworks
  'laravel': ['phpstan', 'psalm', 'phpcs', 'composer-audit', 'semgrep'],
  'symfony': ['phpstan', 'psalm', 'phpcs', 'composer-audit', 'semgrep'],
  'codeigniter': ['phpstan', 'psalm', 'phpcs', 'composer-audit'],
  'slim': ['phpstan', 'psalm', 'phpcs', 'composer-audit'],

  // .NET Frameworks
  'aspnet': ['dotnet-format', 'security-code-scan', 'dotnet-outdated', 'semgrep'],
  'aspnet-core': ['dotnet-format', 'security-code-scan', 'dotnet-outdated', 'semgrep'],

  // Rust Frameworks
  'actix': ['clippy', 'cargo-audit', 'cargo-deny', 'semgrep'],
  'rocket': ['clippy', 'cargo-audit', 'cargo-deny', 'semgrep'],
  'warp': ['clippy', 'cargo-audit', 'cargo-deny', 'semgrep'],
  
  // Kotlin Frameworks
  'ktor': ['detekt', 'ktlint'],
  
  // Scala Frameworks
  'akka': ['scalastyle', 'scalafix'],
  
  // Unknown
  'unknown': []
};

// ============================================================
// UNIVERSAL TOOL CONFIG RESOLVER
// ============================================================

/**
 * Resolves tool configuration based on framework, mode, and branch
 */
export class UniversalToolConfigResolver {
  private toolRegistry: Map<string, ToolDefinition>;

  constructor(additionalTools: ToolDefinition[] = []) {
    // Build tool registry
    this.toolRegistry = new Map();
    for (const tool of [...UNIVERSAL_TOOL_REGISTRY, ...additionalTools]) {
      this.toolRegistry.set(tool.name, tool);
    }
  }

  /**
   * Get tools for a given configuration
   */
  async getToolsFor(request: ToolConfigRequest): Promise<ToolConfigResponse> {
    logger.info(`🔧 Resolving tools for ${request.framework} (${request.mode} mode, ${request.branch} branch)`);

    // Step 1: Get framework-specific tools
    const frameworkTools = FRAMEWORK_TOOL_MAPPINGS[request.framework] || [];
    
    // Step 2: Filter by analysis mode
    const modeConfig = UNIVERSAL_ANALYSIS_MODES[request.mode];
    const filteredTools = frameworkTools.filter(toolName => {
      const tool = this.toolRegistry.get(toolName);
      if (!tool) return false;

      // Check if tool category is enabled in this mode
      // Session 60 fix: Handle ALL categories including P0/P1/P2
      switch (tool.category) {
        // Core categories
        case ToolCategory.CODE_QUALITY:
          return modeConfig.toolCategories.codeQuality;
        case ToolCategory.SECURITY:
          return modeConfig.toolCategories.security;
        case ToolCategory.DEPENDENCY_SCAN:
          return modeConfig.toolCategories.dependencyScan;
        case ToolCategory.STYLE_LINT:
          return modeConfig.toolCategories.styleLint;
        case ToolCategory.ADVANCED:
          return modeConfig.toolCategories.advanced;

        // P0 categories - Critical security (Session 59/60)
        case ToolCategory.SECRETS:
          return modeConfig.toolCategories.secrets;
        case ToolCategory.IAC_SECURITY:
          return modeConfig.toolCategories.iacSecurity;
        case ToolCategory.CONTAINER_SECURITY:
          return modeConfig.toolCategories.containerSecurity;

        // P1 categories - API security (Session 59/60)
        case ToolCategory.API_DESIGN:
          return modeConfig.toolCategories.apiDesign;
        case ToolCategory.GRAPHQL_SECURITY:
          return modeConfig.toolCategories.graphqlSecurity;

        // P2 categories - Architecture (Session 59/60)
        case ToolCategory.ARCHITECTURE:
          return modeConfig.toolCategories.architecture;

        // Cloud fixers are NOT controlled by mode - controlled by subscription tier
        // They run in the FIX phase, not SCAN phase
        case ToolCategory.CLOUD_FIXER:
          return false; // Cloud fixers should not be in scanner tool list

        // Deep security is opt-in only, not controlled by mode
        case ToolCategory.DEEP_SECURITY:
          return modeConfig.toolCategories.deepSecurity === true;

        default:
          logger.warn(`Unknown tool category: ${tool.category} for tool ${toolName}`);
          return false;
      }
    });

    // Step 3: Filter by branch (some tools only run on PR)
    const branchFilteredTools = filteredTools.filter(toolName => {
      const tool = this.toolRegistry.get(toolName);
      if (!tool) return false;
      
      // If tool only runs on PR, skip it on base branch
      if (!tool.runOnBothBranches && request.branch === 'base') {
        return false;
      }
      
      return true;
    });

    // Step 4: Sort by priority
    const sortedTools = branchFilteredTools.sort((a, b) => {
      const toolA = this.toolRegistry.get(a);
      const toolB = this.toolRegistry.get(b);
      if (!toolA || !toolB) return 0;
      return toolB.priority - toolA.priority;
    });

    // Step 5: Get tool details
    const toolDetails = sortedTools
      .map(name => this.toolRegistry.get(name))
      .filter(Boolean) as ToolDefinition[];

    // Step 6: Calculate estimated duration
    const estimatedDuration = toolDetails.reduce(
      (sum, tool) => sum + tool.estimatedDuration,
      0
    );

    // Step 7: Generate recommendations
    const recommendations = this.generateRecommendations(
      request,
      sortedTools,
      toolDetails
    );

    return {
      tools: sortedTools,
      estimatedDuration,
      toolDetails,
      recommendations
    };
  }

  /**
   * Generate recommendations based on configuration
   */
  private generateRecommendations(
    request: ToolConfigRequest,
    tools: string[],
    toolDetails: ToolDefinition[]
  ): string[] {
    const recommendations: string[] = [];

    // Recommendation 1: Mode upgrade
    const mode = request.mode as string;
    if (mode === 'critical-only') {
      recommendations.push(
        'Consider using "standard" mode for more comprehensive analysis (adds dependency scanning)'
      );
    } else if (mode === 'standard') {
      recommendations.push(
        'Consider using "thorough" mode for style checking and additional insights'
      );
    }

    // Recommendation 2: Missing compilation
    const requiresCompilation = toolDetails.some(t => t.requiresCompilation);
    if (requiresCompilation) {
      recommendations.push(
        'Some tools require compilation. Ensure build is successful before analysis.'
      );
    }

    // Recommendation 3: Framework-specific
    if (request.framework === 'spring-boot') {
      recommendations.push(
        'Spring Boot detected: Consider enabling SpotBugs for additional bytecode analysis'
      );
    } else if (request.framework === 'quarkus') {
      recommendations.push(
        'Quarkus detected: Fast startup times mean analysis completes quickly'
      );
    }

    // Recommendation 4: Time estimate
    const totalMinutes = Math.ceil(toolDetails.reduce((sum, t) => sum + t.estimatedDuration, 0) / 60000);
    if (totalMinutes > 2) {
      recommendations.push(
        `Estimated analysis time: ~${totalMinutes} minutes. Consider using "critical-only" mode for faster results.`
      );
    }

    return recommendations;
  }

  /**
   * Get all available tools for a language
   */
  getToolsForLanguage(language: Language): ToolDefinition[] {
    return Array.from(this.toolRegistry.values())
      .filter(tool => tool.languages.includes(language))
      .sort((a, b) => b.priority - a.priority);
  }

  /**
   * Get tool definition by name
   */
  getTool(name: string): ToolDefinition | undefined {
    return this.toolRegistry.get(name);
  }

  /**
   * Check if a tool is available for a framework
   */
  isToolAvailable(toolName: string, framework: Framework): boolean {
    const tools = FRAMEWORK_TOOL_MAPPINGS[framework] || [];
    return tools.includes(toolName);
  }

  /**
   * Get estimated duration for a set of tools
   */
  getEstimatedDuration(toolNames: string[]): number {
    return toolNames.reduce((sum, name) => {
      const tool = this.toolRegistry.get(name);
      return sum + (tool?.estimatedDuration || 0);
    }, 0);
  }

  /**
   * Validate tool configuration
   */
  validateConfig(request: ToolConfigRequest): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Validate framework
    if (!FRAMEWORK_TOOL_MAPPINGS[request.framework]) {
      errors.push(`Unknown framework: ${request.framework}`);
    }

    // Validate mode
    if (!UNIVERSAL_ANALYSIS_MODES[request.mode]) {
      errors.push(`Unknown analysis mode: ${request.mode}`);
    }

    // Validate branch
    if (request.branch !== 'base' && request.branch !== 'pr') {
      errors.push(`Invalid branch: ${request.branch}. Must be 'base' or 'pr'.`);
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  // ============================================================
  // CLOUD FIXER SUPPORT (Session 60)
  // ============================================================

  /**
   * Check cloud fixer availability based on subscription tier
   *
   * Cloud fixers (Corgea) are only available for PRO and ENTERPRISE tiers.
   *
   * @param tier - User's subscription tier
   * @returns Availability status with available tools and reason
   *
   * @example
   * ```typescript
   * const resolver = new UniversalToolConfigResolver();
   * const availability = resolver.getCloudFixerAvailability('pro');
   * // Returns: { available: true, tools: ['corgea'], reason: 'Cloud fixers enabled' }
   * ```
   */
  getCloudFixerAvailability(tier: 'basic' | 'pro' | 'enterprise'): {
    available: boolean;
    tools: string[];
    reason: string;
    limits?: {
      maxIssuesPerRequest: number;
      maxRequestsPerMonth: number;
    };
  } {
    switch (tier) {
      case 'basic':
        return {
          available: false,
          tools: [],
          reason: 'Cloud fixers require PRO subscription. Upgrade to access AI-powered fixes from Corgea.'
        };
      case 'pro':
        return {
          available: true,
          tools: ['corgea'],
          reason: 'Cloud fixers enabled for PRO tier',
          limits: {
            maxIssuesPerRequest: 50,
            maxRequestsPerMonth: 100
          }
        };
      case 'enterprise':
        return {
          available: true,
          tools: ['corgea'],
          reason: 'Cloud fixers enabled for ENTERPRISE tier (unlimited)',
          limits: {
            maxIssuesPerRequest: Infinity,
            maxRequestsPerMonth: Infinity
          }
        };
    }
  }

  /**
   * Check if cloud fixers are beneficial for a given mode
   *
   * Cloud fixers are most beneficial in thorough and complete modes
   * where more issues are detected that need AI-powered fixes.
   *
   * @param mode - Analysis mode
   * @returns Whether cloud fixers are recommended for this mode
   */
  isCloudFixerRecommended(mode: AnalysisMode): boolean {
    // Cloud fixers are most valuable in modes with more detected issues
    const recommendedModes: AnalysisMode[] = ['thorough', 'complete'];
    return recommendedModes.includes(mode);
  }

  /**
   * Get cloud fixer recommendations for UI display
   */
  getCloudFixerRecommendations(
    mode: AnalysisMode,
    tier: 'basic' | 'pro' | 'enterprise',
    issueCount: number
  ): string[] {
    const recommendations: string[] = [];
    const availability = this.getCloudFixerAvailability(tier);

    if (!availability.available) {
      if (issueCount > 10) {
        recommendations.push(
          `${issueCount} issues detected. Upgrade to PRO for AI-powered fixes from Corgea.`
        );
      }
      return recommendations;
    }

    if (this.isCloudFixerRecommended(mode)) {
      recommendations.push(
        'Cloud fixers (Corgea) recommended for this analysis mode to maximize fix coverage.'
      );
    }

    if (issueCount > 20 && tier === 'pro') {
      recommendations.push(
        `Large issue count (${issueCount}). Consider ENTERPRISE tier for unlimited cloud fixes.`
      );
    }

    return recommendations;
  }
}

/**
 * Create a default tool config resolver
 */
export function createToolConfigResolver(): UniversalToolConfigResolver {
  return new UniversalToolConfigResolver();
}

/**
 * Convenience function to get tools for a framework and mode
 */
export async function getToolsForFramework(
  framework: Framework,
  mode: AnalysisMode = 'standard',
  branch: 'base' | 'pr' = 'pr'
): Promise<string[]> {
  const resolver = createToolConfigResolver();
  const response = await resolver.getToolsFor({ framework, mode, branch });
  return response.tools;
}

