/**
 * Universal Analysis Modes Configuration
 * 
 * Language-agnostic analysis modes that can be applied to any programming language.
 * Each language will map its specific tools to these universal modes.
 * 
 * This allows consistent user experience across Java, Python, JavaScript, Go, etc.
 */

/**
 * Universal Analysis Mode Types
 * These apply to ALL programming languages
 */
export type AnalysisMode = 
  | 'fast'        // ~2 min: Essential tools only (code quality + security)
  | 'standard'    // ~4 min: + Dependency scanning (DEFAULT, recommended)
  | 'thorough'    // ~6 min: + Style/linting checks
  | 'complete';   // ~15 min: + Advanced analysis (compilation, deep scanning)

/**
 * Universal Tool Categories
 * Every language should map its tools to these categories
 */
export enum ToolCategory {
  /** Core code quality analysis (always enabled) */
  CODE_QUALITY = 'code_quality',

  /** Security vulnerability detection (always enabled) */
  SECURITY = 'security',

  /** Dependency/package vulnerability scanning */
  DEPENDENCY_SCAN = 'dependency_scan',

  /** Code style and linting checks */
  STYLE_LINT = 'style_lint',

  /** Advanced analysis requiring compilation/build */
  ADVANCED = 'advanced',

  /** Deep security analysis with CodeQL (PRO tier, opt-in only) */
  DEEP_SECURITY = 'deep_security',

  // ============================================
  // P0/P1/P2 Tool Categories (Session 59)
  // ============================================

  /** P0: Secret detection (gitleaks, trufflehog) */
  SECRETS = 'secrets',

  /** P0: Infrastructure as Code security (checkov) */
  IAC_SECURITY = 'iac_security',

  /** P0: Container/image security (trivy, grype) */
  CONTAINER_SECURITY = 'container_security',

  /** P1: API schema validation (spectral) */
  API_DESIGN = 'api_design',

  /** P1: GraphQL security (graphql-cop) */
  GRAPHQL_SECURITY = 'graphql_security',

  /** P2: Architecture analysis (madge, dependency-cruiser, jdepend, etc.) */
  ARCHITECTURE = 'architecture',

  // ============================================
  // Cloud API Tool Categories (Session 60)
  // ============================================

  /** Cloud API fixer tools (Corgea, etc.) - PRO tier only */
  CLOUD_FIXER = 'cloud_fixer'
}

/**
 * Tool Purpose Classification (Session 57 Part 3)
 * Distinguishes between scanning and fixing tools
 */
export enum ToolPurpose {
  /** Scanner: Detects issues only, no auto-fix capability */
  SCANNER = 'scanner',

  /** Fixer: Fixes/formats code, no detection */
  FIXER = 'fixer',

  /** Dual: Can both detect AND auto-fix issues */
  DUAL = 'dual'
}

/**
 * Tool metadata including purpose and fix tier
 */
export interface ToolMetadata {
  id: string;
  name: string;
  category: ToolCategory;
  purpose: ToolPurpose;
  fixTier: 1 | 2 | 3;
  hasNativeFix: boolean;
  fixCommand?: string;
  confidence: number;
  safeForAutoApply: boolean;
}

/**
 * Analysis Mode Configuration
 * Defines which tool categories are enabled for each mode
 */
export interface AnalysisModeConfig {
  mode: AnalysisMode;
  description: string;
  estimatedTime: string;
  toolCategories: {
    // Core categories (original)
    codeQuality: boolean;
    security: boolean;
    dependencyScan: boolean;
    styleLint: boolean;
    advanced: boolean;
    /** CodeQL deep security - NOT controlled by mode, opt-in only */
    deepSecurity?: boolean;

    // P0/P1/P2 categories (Session 59)
    /** P0: Secret detection - ALWAYS enabled for security */
    secrets: boolean;
    /** P0: IaC security scanning (Terraform, K8s, Docker) */
    iacSecurity: boolean;
    /** P0: Container vulnerability scanning */
    containerSecurity: boolean;
    /** P1: API schema validation */
    apiDesign: boolean;
    /** P1: GraphQL security scanning */
    graphqlSecurity: boolean;
    /** P2: Architecture analysis (circular deps, layering) */
    architecture: boolean;
  };
  includeStyleIssues: boolean;
  requiresCompilation: boolean;
  /**
   * Whether cloud fixers (Corgea) are recommended for this mode
   * Cloud fixers are most valuable in thorough/complete modes
   * Note: Cloud fixers are FIXERS not scanners, controlled by subscription tier
   * @since Session 60
   */
  cloudFixerEligible: boolean;
}

/**
 * Universal Analysis Mode Definitions
 * These apply to ALL languages - each language maps its tools to categories
 */
export const UNIVERSAL_ANALYSIS_MODES: Record<AnalysisMode, AnalysisModeConfig> = {
  fast: {
    mode: 'fast',
    description: 'Critical & High issues only (fastest)',
    estimatedTime: '~2 minutes',
    toolCategories: {
      // Core categories
      codeQuality: true,
      security: true,
      dependencyScan: false,
      styleLint: false,
      advanced: false,
      // P0/P1/P2 categories (Session 60 fix)
      secrets: true,         // P0: Always scan for secrets
      iacSecurity: false,    // Skip IaC in fast mode
      containerSecurity: false,
      apiDesign: false,
      graphqlSecurity: false,
      architecture: false
    },
    includeStyleIssues: false,
    requiresCompilation: false,
    cloudFixerEligible: false  // Fast mode prioritizes speed over fix coverage
  },
  standard: {
    mode: 'standard',
    description: 'Security + CVE scanning (recommended)',
    estimatedTime: '~4 minutes',
    toolCategories: {
      // Core categories
      codeQuality: true,
      security: true,
      dependencyScan: true,
      styleLint: false,
      advanced: false,
      // P0/P1/P2 categories (Session 60 fix)
      secrets: true,         // P0: Always scan for secrets
      iacSecurity: true,     // P0: Scan IaC files if present
      containerSecurity: true, // P0: Scan containers if present
      apiDesign: false,      // P1: Skip API design in standard mode
      graphqlSecurity: false, // P1: Skip GraphQL in standard mode
      architecture: false    // P2: Skip architecture in standard mode
    },
    includeStyleIssues: false,
    requiresCompilation: false,
    cloudFixerEligible: true  // Standard mode can benefit from cloud fixers for security issues
  },
  thorough: {
    mode: 'thorough',
    description: 'Security + Style + API checks (comprehensive)',
    estimatedTime: '~6 minutes',
    toolCategories: {
      // Core categories
      codeQuality: true,
      security: true,
      dependencyScan: true,
      styleLint: true,
      advanced: false,
      // P0/P1/P2 categories (Session 60 fix)
      secrets: true,         // P0: Always scan for secrets
      iacSecurity: true,     // P0: Scan IaC files
      containerSecurity: true, // P0: Scan containers
      apiDesign: true,       // P1: Check API schemas
      graphqlSecurity: true, // P1: Check GraphQL security
      architecture: false    // P2: Skip architecture (requires more time)
    },
    includeStyleIssues: true,
    requiresCompilation: false,
    cloudFixerEligible: true  // Thorough mode is recommended for cloud fixers
  },
  complete: {
    mode: 'complete',
    description: 'All tools including advanced + architecture analysis',
    estimatedTime: '~15 minutes',
    toolCategories: {
      // Core categories
      codeQuality: true,
      security: true,
      dependencyScan: true,
      styleLint: true,
      advanced: true,
      // P0/P1/P2 categories (Session 60 fix)
      secrets: true,         // P0: Always scan for secrets
      iacSecurity: true,     // P0: Scan IaC files
      containerSecurity: true, // P0: Scan containers
      apiDesign: true,       // P1: Check API schemas
      graphqlSecurity: true, // P1: Check GraphQL security
      architecture: true     // P2: Full architecture analysis
    },
    includeStyleIssues: true,
    requiresCompilation: true,
    cloudFixerEligible: true  // Complete mode maximizes value from cloud fixers
  }
};

/**
 * Language-Specific Tool Mapping Interface
 * Each language implements this to map its tools to universal categories
 */
export interface LanguageToolMapping {
  language: string;
  toolsByCategory: {
    [ToolCategory.CODE_QUALITY]: string[];      // e.g., Java: ['pmd'], Python: ['pylint']
    [ToolCategory.SECURITY]: string[];          // e.g., Java: ['semgrep'], Python: ['bandit']
    [ToolCategory.DEPENDENCY_SCAN]: string[];   // e.g., Java: ['dependency-check'], Python: ['safety']
    [ToolCategory.STYLE_LINT]: string[];        // e.g., Java: ['checkstyle'], Python: ['flake8']
    [ToolCategory.ADVANCED]: string[];          // e.g., Java: ['spotbugs'], Python: ['mypy']
    [ToolCategory.DEEP_SECURITY]?: string[];    // CodeQL (PRO tier, opt-in only)
    // P0/P1/P2 Tool Categories (Session 59)
    [ToolCategory.SECRETS]?: string[];          // P0: gitleaks, trufflehog
    [ToolCategory.IAC_SECURITY]?: string[];     // P0: checkov
    [ToolCategory.CONTAINER_SECURITY]?: string[]; // P0: trivy, grype
    [ToolCategory.API_DESIGN]?: string[];       // P1: spectral
    [ToolCategory.GRAPHQL_SECURITY]?: string[]; // P1: graphql-cop
    [ToolCategory.ARCHITECTURE]?: string[];     // P2: madge, jdepend, etc.
    // Cloud API Tools (Session 60)
    [ToolCategory.CLOUD_FIXER]?: string[];      // PRO tier: corgea
  };
}

/**
 * Example Language Tool Mappings
 * Each language team should define their mapping
 */
export const LANGUAGE_TOOL_MAPPINGS: Record<string, LanguageToolMapping> = {
  java: {
    language: 'java',
    toolsByCategory: {
      [ToolCategory.CODE_QUALITY]: ['pmd'],
      [ToolCategory.SECURITY]: ['semgrep'],
      [ToolCategory.DEPENDENCY_SCAN]: ['dependency-check'],
      [ToolCategory.STYLE_LINT]: ['checkstyle'],
      [ToolCategory.ADVANCED]: ['spotbugs'],
      [ToolCategory.DEEP_SECURITY]: ['codeql'],
      // P0/P1/P2 Tools (Session 59)
      [ToolCategory.SECRETS]: ['gitleaks', 'trufflehog'],
      [ToolCategory.IAC_SECURITY]: ['checkov'],
      [ToolCategory.CONTAINER_SECURITY]: ['trivy', 'grype'],
      [ToolCategory.API_DESIGN]: ['spectral'],
      [ToolCategory.GRAPHQL_SECURITY]: ['graphql-cop'],
      [ToolCategory.ARCHITECTURE]: ['jdepend'],
      // Cloud API Tools (Session 60) - PRO tier only
      [ToolCategory.CLOUD_FIXER]: ['corgea']
    }
  },
  python: {
    language: 'python',
    toolsByCategory: {
      [ToolCategory.CODE_QUALITY]: ['pylint'],
      [ToolCategory.SECURITY]: ['bandit', 'semgrep'],
      [ToolCategory.DEPENDENCY_SCAN]: ['safety', 'pip-audit'],
      [ToolCategory.STYLE_LINT]: ['flake8', 'black'],
      [ToolCategory.ADVANCED]: ['mypy'],
      [ToolCategory.DEEP_SECURITY]: ['codeql'],
      // P0/P1/P2 Tools (Session 59)
      [ToolCategory.SECRETS]: ['gitleaks', 'trufflehog'],
      [ToolCategory.IAC_SECURITY]: ['checkov'],
      [ToolCategory.CONTAINER_SECURITY]: ['trivy', 'grype'],
      [ToolCategory.API_DESIGN]: ['spectral'],
      [ToolCategory.GRAPHQL_SECURITY]: ['graphql-cop'],
      [ToolCategory.ARCHITECTURE]: ['pydeps', 'import-linter'],
      // Cloud API Tools (Session 60) - PRO tier only
      [ToolCategory.CLOUD_FIXER]: ['corgea']
    }
  },
  javascript: {
    language: 'javascript',
    toolsByCategory: {
      [ToolCategory.CODE_QUALITY]: ['eslint'],
      [ToolCategory.SECURITY]: ['eslint-plugin-security', 'semgrep'],
      [ToolCategory.DEPENDENCY_SCAN]: ['npm-audit', 'snyk'],
      [ToolCategory.STYLE_LINT]: ['prettier', 'eslint'],
      [ToolCategory.ADVANCED]: ['typescript-compiler'],
      [ToolCategory.DEEP_SECURITY]: ['codeql'],
      // P0/P1/P2 Tools (Session 59)
      [ToolCategory.SECRETS]: ['gitleaks', 'trufflehog'],
      [ToolCategory.IAC_SECURITY]: ['checkov'],
      [ToolCategory.CONTAINER_SECURITY]: ['trivy', 'grype'],
      [ToolCategory.API_DESIGN]: ['spectral'],
      [ToolCategory.GRAPHQL_SECURITY]: ['graphql-cop'],
      [ToolCategory.ARCHITECTURE]: ['madge', 'dependency-cruiser'],
      // Cloud API Tools (Session 60) - PRO tier only
      [ToolCategory.CLOUD_FIXER]: ['corgea']
    }
  },
  typescript: {
    language: 'typescript',
    toolsByCategory: {
      [ToolCategory.CODE_QUALITY]: ['eslint', 'tslint'],
      [ToolCategory.SECURITY]: ['eslint-plugin-security', 'semgrep'],
      [ToolCategory.DEPENDENCY_SCAN]: ['npm-audit', 'snyk'],
      [ToolCategory.STYLE_LINT]: ['prettier', 'eslint'],
      [ToolCategory.ADVANCED]: ['typescript-compiler'],
      [ToolCategory.DEEP_SECURITY]: ['codeql'],
      // P0/P1/P2 Tools (Session 59)
      [ToolCategory.SECRETS]: ['gitleaks', 'trufflehog'],
      [ToolCategory.IAC_SECURITY]: ['checkov'],
      [ToolCategory.CONTAINER_SECURITY]: ['trivy', 'grype'],
      [ToolCategory.API_DESIGN]: ['spectral'],
      [ToolCategory.GRAPHQL_SECURITY]: ['graphql-cop'],
      [ToolCategory.ARCHITECTURE]: ['madge', 'dependency-cruiser', 'ts-unused-exports'],
      // Cloud API Tools (Session 60) - PRO tier only
      [ToolCategory.CLOUD_FIXER]: ['corgea']
    }
  },
  go: {
    language: 'go',
    toolsByCategory: {
      [ToolCategory.CODE_QUALITY]: ['golint', 'go-critic'],
      [ToolCategory.SECURITY]: ['gosec', 'semgrep'],
      [ToolCategory.DEPENDENCY_SCAN]: ['govulncheck'],
      [ToolCategory.STYLE_LINT]: ['gofmt', 'golangci-lint'],
      [ToolCategory.ADVANCED]: ['staticcheck'],
      [ToolCategory.DEEP_SECURITY]: ['codeql'],
      // P0/P1/P2 Tools (Session 59)
      [ToolCategory.SECRETS]: ['gitleaks', 'trufflehog'],
      [ToolCategory.IAC_SECURITY]: ['checkov'],
      [ToolCategory.CONTAINER_SECURITY]: ['trivy', 'grype'],
      [ToolCategory.API_DESIGN]: ['spectral'],
      [ToolCategory.GRAPHQL_SECURITY]: ['graphql-cop'],
      [ToolCategory.ARCHITECTURE]: ['go-arch-lint'],
      // Cloud API Tools (Session 60) - PRO tier only
      [ToolCategory.CLOUD_FIXER]: ['corgea']
    }
  },
  // Additional languages (Session 59)
  rust: {
    language: 'rust',
    toolsByCategory: {
      [ToolCategory.CODE_QUALITY]: ['clippy'],
      [ToolCategory.SECURITY]: ['semgrep'],
      [ToolCategory.DEPENDENCY_SCAN]: ['cargo-audit', 'cargo-deny'],
      [ToolCategory.STYLE_LINT]: ['rustfmt'],
      [ToolCategory.ADVANCED]: [],
      [ToolCategory.SECRETS]: ['gitleaks', 'trufflehog'],
      [ToolCategory.IAC_SECURITY]: ['checkov'],
      [ToolCategory.CONTAINER_SECURITY]: ['trivy', 'grype'],
      [ToolCategory.ARCHITECTURE]: ['cargo-modules']
    }
  },
  ruby: {
    language: 'ruby',
    toolsByCategory: {
      [ToolCategory.CODE_QUALITY]: ['rubocop'],
      [ToolCategory.SECURITY]: ['brakeman', 'semgrep'],
      [ToolCategory.DEPENDENCY_SCAN]: ['bundler-audit'],
      [ToolCategory.STYLE_LINT]: ['rubocop'],
      [ToolCategory.ADVANCED]: [],
      [ToolCategory.SECRETS]: ['gitleaks', 'trufflehog'],
      [ToolCategory.IAC_SECURITY]: ['checkov'],
      [ToolCategory.CONTAINER_SECURITY]: ['trivy', 'grype'],
      [ToolCategory.ARCHITECTURE]: ['packwerk'],
      // Cloud API Tools (Session 60) - PRO tier only
      [ToolCategory.CLOUD_FIXER]: ['corgea']
    }
  },
  php: {
    language: 'php',
    toolsByCategory: {
      [ToolCategory.CODE_QUALITY]: ['phpstan', 'psalm', 'phpcs'],
      [ToolCategory.SECURITY]: ['semgrep'],
      [ToolCategory.DEPENDENCY_SCAN]: ['composer-audit'],
      [ToolCategory.STYLE_LINT]: ['phpcs'],
      [ToolCategory.ADVANCED]: [],
      [ToolCategory.SECRETS]: ['gitleaks', 'trufflehog'],
      [ToolCategory.IAC_SECURITY]: ['checkov'],
      [ToolCategory.CONTAINER_SECURITY]: ['trivy', 'grype'],
      [ToolCategory.ARCHITECTURE]: ['deptrac']
    }
  },
  csharp: {
    language: 'csharp',
    toolsByCategory: {
      [ToolCategory.CODE_QUALITY]: ['dotnet-format'],
      [ToolCategory.SECURITY]: ['security-code-scan', 'semgrep'],
      [ToolCategory.DEPENDENCY_SCAN]: ['dotnet-outdated'],
      [ToolCategory.STYLE_LINT]: ['dotnet-format'],
      [ToolCategory.ADVANCED]: [],
      [ToolCategory.SECRETS]: ['gitleaks', 'trufflehog'],
      [ToolCategory.IAC_SECURITY]: ['checkov'],
      [ToolCategory.CONTAINER_SECURITY]: ['trivy', 'grype'],
      // Cloud API Tools (Session 60) - PRO tier only
      [ToolCategory.CLOUD_FIXER]: ['corgea']
    }
  }
};

/**
 * Options for deep security analysis (CodeQL)
 * Controlled separately from analysis mode - requires explicit opt-in
 */
export interface DeepSecurityOptions {
  /** Enable CodeQL analysis (PRO tier only) */
  enabled: boolean;
  /** Query pack: 'security' (faster) or 'security-extended' (more thorough) */
  queryPack?: 'security' | 'security-extended';
}

/**
 * Extended options for getToolsForMode
 */
export interface GetToolsOptions {
  /** Deep security options (CodeQL) - opt-in only, not controlled by mode */
  deepSecurity?: DeepSecurityOptions;
}

/**
 * Get tools to run for a specific language and analysis mode
 *
 * @param language - Programming language (java, python, javascript, etc.)
 * @param mode - Analysis mode selected by user
 * @param options - Additional options including CodeQL opt-in
 * @returns Array of tool names to execute
 *
 * @example
 * ```typescript
 * // User selects 'thorough' mode for Java
 * const tools = getToolsForMode('java', 'thorough');
 * // Returns: ['pmd', 'semgrep', 'dependency-check', 'checkstyle']
 *
 * // Same mode for Python
 * const tools = getToolsForMode('python', 'thorough');
 * // Returns: ['pylint', 'bandit', 'semgrep', 'safety', 'pip-audit', 'flake8', 'black']
 *
 * // PRO tier with CodeQL enabled
 * const tools = getToolsForMode('typescript', 'standard', {
 *   deepSecurity: { enabled: true, queryPack: 'security' }
 * });
 * // Returns: ['eslint', 'tslint', 'semgrep', 'npm-audit', 'snyk', 'codeql']
 * ```
 */
export function getToolsForMode(
  language: string,
  mode: AnalysisMode,
  options?: GetToolsOptions
): string[] {
  const modeConfig = UNIVERSAL_ANALYSIS_MODES[mode];
  const languageMapping = LANGUAGE_TOOL_MAPPINGS[language.toLowerCase()];

  if (!languageMapping) {
    throw new Error(`No tool mapping defined for language: ${language}`);
  }

  const tools: string[] = [];

  // Add tools based on enabled categories
  if (modeConfig.toolCategories.codeQuality) {
    tools.push(...languageMapping.toolsByCategory[ToolCategory.CODE_QUALITY]);
  }
  if (modeConfig.toolCategories.security) {
    tools.push(...languageMapping.toolsByCategory[ToolCategory.SECURITY]);
  }
  if (modeConfig.toolCategories.dependencyScan) {
    tools.push(...languageMapping.toolsByCategory[ToolCategory.DEPENDENCY_SCAN]);
  }
  if (modeConfig.toolCategories.styleLint) {
    tools.push(...languageMapping.toolsByCategory[ToolCategory.STYLE_LINT]);
  }
  if (modeConfig.toolCategories.advanced) {
    tools.push(...languageMapping.toolsByCategory[ToolCategory.ADVANCED]);
  }

  // Add CodeQL if explicitly enabled (separate from mode)
  if (options?.deepSecurity?.enabled) {
    const deepSecurityTools = languageMapping.toolsByCategory[ToolCategory.DEEP_SECURITY];
    if (deepSecurityTools) {
      tools.push(...deepSecurityTools);
    }
  }

  return tools;
}

/**
 * Get available analysis modes for API/Website UI
 * Language-agnostic - works for all languages
 */
export function getAvailableAnalysisModes(): AnalysisModeConfig[] {
  return Object.values(UNIVERSAL_ANALYSIS_MODES);
}

/**
 * Get specific mode configuration
 * Useful for validating user input from API/Website
 */
export function getAnalysisModeConfig(mode: string): AnalysisModeConfig | undefined {
  return UNIVERSAL_ANALYSIS_MODES[mode as AnalysisMode];
}

/**
 * Get default analysis mode
 * Returns 'standard' as the recommended default for all languages
 */
export function getDefaultAnalysisMode(): AnalysisModeConfig {
  return UNIVERSAL_ANALYSIS_MODES.standard;
}

/**
 * Register a new language tool mapping
 * Allows adding support for new languages dynamically
 * 
 * @example
 * ```typescript
 * registerLanguageMapping({
 *   language: 'rust',
 *   toolsByCategory: {
 *     code_quality: ['clippy'],
 *     security: ['cargo-audit'],
 *     dependency_scan: ['cargo-audit'],
 *     style_lint: ['rustfmt'],
 *     advanced: ['rust-analyzer']
 *   }
 * });
 * ```
 */
export function registerLanguageMapping(mapping: LanguageToolMapping): void {
  LANGUAGE_TOOL_MAPPINGS[mapping.language.toLowerCase()] = mapping;
}

/**
 * Check if a tool should run based on analysis mode
 *
 * @param toolName - Name of the tool (e.g., 'checkstyle')
 * @param language - Programming language
 * @param mode - Analysis mode
 * @returns true if tool should run in this mode
 */
export function shouldToolRun(toolName: string, language: string, mode: AnalysisMode): boolean {
  const enabledTools = getToolsForMode(language, mode);
  return enabledTools.includes(toolName);
}

// =============================================================================
// CodeQL / Deep Security Helper Functions
// =============================================================================

/**
 * Check if a language supports CodeQL analysis
 */
export function languageSupportsCodeQL(language: string): boolean {
  const mapping = LANGUAGE_TOOL_MAPPINGS[language.toLowerCase()];
  if (!mapping) return false;
  const deepSecurityTools = mapping.toolsByCategory[ToolCategory.DEEP_SECURITY];
  return deepSecurityTools !== undefined && deepSecurityTools.includes('codeql');
}

/**
 * Get estimated additional time for CodeQL analysis
 * Based on repository size (lines of code)
 */
export function getCodeQLTimeEstimate(linesOfCode: number): string {
  if (linesOfCode < 10000) {
    return '5-8 minutes';
  } else if (linesOfCode < 100000) {
    return '10-15 minutes';
  } else {
    return '15-30 minutes';
  }
}

/**
 * Get warning message for CodeQL opt-in
 * Used by UI/API to warn users about additional time
 */
export function getCodeQLWarningMessage(linesOfCode?: number): string {
  const timeEstimate = linesOfCode ? getCodeQLTimeEstimate(linesOfCode) : '5-30 minutes';

  return `CodeQL Deep Security Analysis

CodeQL provides thorough semantic analysis but adds significant time:
- Estimated additional time: ${timeEstimate}

What CodeQL finds that other tools miss:
- Complex data flow vulnerabilities (taint tracking)
- Issues spanning multiple functions/files
- SQL injection through indirect paths
- Command injection with sanitization bypasses

This analysis is optional and only available for PRO tier users.`;
}

/**
 * Validate CodeQL options
 * Returns error message if invalid, undefined if valid
 */
export function validateCodeQLOptions(
  options: DeepSecurityOptions | undefined,
  userTier: 'basic' | 'pro'
): string | undefined {
  if (!options?.enabled) {
    return undefined; // Not enabled, no validation needed
  }

  if (userTier !== 'pro') {
    return 'CodeQL deep security analysis is only available for PRO tier users';
  }

  if (options.queryPack && !['security', 'security-extended'].includes(options.queryPack)) {
    return 'Invalid CodeQL query pack. Use "security" or "security-extended"';
  }

  return undefined; // Valid
}

/**
 * Get default CodeQL options for PRO tier users
 */
export function getDefaultCodeQLOptions(): DeepSecurityOptions {
  return {
    enabled: false, // Must be explicitly enabled
    queryPack: 'security' // Default to faster pack
  };
}

