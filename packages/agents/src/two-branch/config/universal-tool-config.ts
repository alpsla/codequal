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
    name: 'gosec',
    displayName: 'Gosec',
    category: ToolCategory.SECURITY,
    languages: ['go'],
    priority: 10,
    estimatedDuration: 10000,
    requiresCompilation: false,
    runOnBothBranches: true
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
  }
];

// ============================================================
// FRAMEWORK → TOOL MAPPINGS
// ============================================================

/**
 * Maps frameworks to their recommended tools
 */
export const FRAMEWORK_TOOL_MAPPINGS: Record<Framework, string[]> = {
  // Java Frameworks
  'spring-boot': ['pmd', 'semgrep', 'dependency-check', 'checkstyle'],
  'spring': ['pmd', 'semgrep', 'dependency-check', 'checkstyle'],
  'quarkus': ['pmd', 'semgrep', 'dependency-check'],
  'micronaut': ['pmd', 'semgrep', 'dependency-check'],
  'dropwizard': ['pmd', 'semgrep', 'dependency-check'],
  'helidon': ['pmd', 'semgrep', 'dependency-check'],
  'vertx': ['pmd', 'semgrep', 'dependency-check'],
  'play': ['pmd', 'semgrep', 'dependency-check'],
  
  // Python Frameworks
  'django': ['pylint', 'bandit', 'safety', 'semgrep'],
  'flask': ['pylint', 'bandit', 'safety', 'semgrep'],
  'fastapi': ['pylint', 'bandit', 'safety', 'semgrep', 'mypy'],
  'tornado': ['pylint', 'bandit', 'safety'],
  'pyramid': ['pylint', 'bandit', 'safety'],
  'bottle': ['pylint', 'bandit', 'safety'],
  
  // JavaScript/TypeScript Frameworks
  'express': ['eslint', 'semgrep', 'npm-audit'],
  'nest': ['eslint', 'semgrep', 'npm-audit'],
  'next': ['eslint', 'semgrep', 'npm-audit'],
  'react': ['eslint', 'semgrep', 'npm-audit'],
  'vue': ['eslint', 'semgrep', 'npm-audit'],
  'angular': ['eslint', 'semgrep', 'npm-audit'],
  'svelte': ['eslint', 'semgrep', 'npm-audit'],
  
  // Go Frameworks
  'gin': ['golangci-lint', 'gosec', 'semgrep'],
  'echo': ['golangci-lint', 'gosec', 'semgrep'],
  'fiber': ['golangci-lint', 'gosec', 'semgrep'],
  'chi': ['golangci-lint', 'gosec', 'semgrep'],
  'beego': ['golangci-lint', 'gosec', 'semgrep'],
  
  // Ruby Frameworks
  'rails': ['rubocop', 'brakeman', 'bundler-audit', 'semgrep'],
  'sinatra': ['rubocop', 'brakeman', 'bundler-audit'],
  'hanami': ['rubocop', 'brakeman', 'bundler-audit'],
  
  // PHP Frameworks
  'laravel': ['phpcs', 'psalm', 'composer-audit'],
  'symfony': ['phpcs', 'psalm', 'composer-audit'],
  'codeigniter': ['phpcs', 'psalm'],
  'slim': ['phpcs', 'psalm'],
  
  // .NET Frameworks
  'aspnet': ['dotnet-format', 'security-code-scan'],
  'aspnet-core': ['dotnet-format', 'security-code-scan'],
  
  // Rust Frameworks
  'actix': ['clippy', 'cargo-audit'],
  'rocket': ['clippy', 'cargo-audit'],
  'warp': ['clippy', 'cargo-audit'],
  
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
      switch (tool.category) {
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
        default:
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

