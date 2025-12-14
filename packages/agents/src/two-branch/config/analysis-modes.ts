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
  DEEP_SECURITY = 'deep_security'
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
    codeQuality: boolean;
    security: boolean;
    dependencyScan: boolean;
    styleLint: boolean;
    advanced: boolean;
    /** CodeQL deep security - NOT controlled by mode, opt-in only */
    deepSecurity?: boolean;
  };
  includeStyleIssues: boolean;
  requiresCompilation: boolean;
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
      codeQuality: true,
      security: true,
      dependencyScan: false,
      styleLint: false,
      advanced: false
    },
    includeStyleIssues: false,
    requiresCompilation: false
  },
  standard: {
    mode: 'standard',
    description: 'Security + CVE scanning (recommended)',
    estimatedTime: '~4 minutes',
    toolCategories: {
      codeQuality: true,
      security: true,
      dependencyScan: true,
      styleLint: false,
      advanced: false
    },
    includeStyleIssues: false,
    requiresCompilation: false
  },
  thorough: {
    mode: 'thorough',
    description: 'Security + Style issues (comprehensive)',
    estimatedTime: '~6 minutes',
    toolCategories: {
      codeQuality: true,
      security: true,
      dependencyScan: true,
      styleLint: true,
      advanced: false
    },
    includeStyleIssues: true,
    requiresCompilation: false
  },
  complete: {
    mode: 'complete',
    description: 'All tools including advanced analysis',
    estimatedTime: '~15 minutes',
    toolCategories: {
      codeQuality: true,
      security: true,
      dependencyScan: true,
      styleLint: true,
      advanced: true
    },
    includeStyleIssues: true,
    requiresCompilation: true
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
      [ToolCategory.DEEP_SECURITY]: ['codeql']
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
      [ToolCategory.DEEP_SECURITY]: ['codeql']
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
      [ToolCategory.DEEP_SECURITY]: ['codeql']
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
      [ToolCategory.DEEP_SECURITY]: ['codeql']
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
      [ToolCategory.DEEP_SECURITY]: ['codeql']
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

