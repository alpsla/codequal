/**
 * Tool Matrix Bridge
 *
 * Bridges the comprehensive tool-database-schema with the existing V9 tool matrices.
 * This module:
 * 1. Uses tool-database-schema as the single source of truth
 * 2. Exports in formats compatible with existing tool matrices
 * 3. Allows gradual migration of V9 components
 *
 * Existing matrices to replace:
 * - src/two-branch/config/javascript-tools-matrix.ts
 * - src/two-branch/config/python-tools-matrix.ts
 * - src/two-branch/analyzers/v9-all-tools-config.ts
 */

import {
  SEED_TOOLS,
  Tool,
  Language,
  ToolCategory,
  getToolsForLanguage,
  getFixersForLanguage,
  getToolById,
  getFixerForIssue,
} from './tool-database-schema';

// =============================================================================
// LEGACY FORMAT - Compatible with existing tool matrices
// =============================================================================

/**
 * Legacy ToolDefinition format (used by javascript-tools-matrix.ts, python-tools-matrix.ts)
 */
export interface LegacyToolDefinition {
  name: string;
  category: 'security' | 'dependency' | 'quality' | 'architecture' | 'secrets';
  command: string;
  expectedAvailable: boolean;
  description: string;
  languages?: string[];
}

/**
 * V9 Tool Config format (used by v9-all-tools-config.ts)
 */
export interface V9ToolConfig {
  name: string;
  command: string;
}

/**
 * V9 Language Config format
 */
export interface V9LanguageConfig {
  tools: V9ToolConfig[];
}

// =============================================================================
// CATEGORY MAPPING
// =============================================================================

/**
 * Map our comprehensive categories to legacy 5-category system
 */
function mapToLegacyCategory(categories: ToolCategory[]): 'security' | 'dependency' | 'quality' | 'architecture' | 'secrets' {
  // Priority: security > secrets > dependency > architecture > quality
  if (categories.includes('secrets')) return 'secrets';
  if (categories.includes('security')) return 'security';
  if (categories.includes('dependency')) return 'dependency';
  if (categories.includes('architecture')) return 'architecture';
  return 'quality';  // Default: quality, style, type-safety, performance, compatibility
}

// =============================================================================
// CONVERSION FUNCTIONS
// =============================================================================

/**
 * Convert comprehensive Tool to legacy ToolDefinition format
 */
export function convertToLegacyFormat(tool: Tool): LegacyToolDefinition {
  return {
    name: tool.id,
    category: mapToLegacyCategory(tool.categories),
    command: tool.command,
    expectedAvailable: tool.isEnabled,
    description: tool.name,
    languages: tool.languages,
  };
}

/**
 * Convert comprehensive Tool to V9 format
 */
export function convertToV9Format(tool: Tool): V9ToolConfig {
  // V9 commands include '2>&1 || true' for error handling
  const v9Command = tool.command.includes('|| true')
    ? tool.command
    : `${tool.command} 2>&1 || true`;

  return {
    name: tool.id,
    command: v9Command,
  };
}

// =============================================================================
// LANGUAGE-SPECIFIC TOOL MATRICES
// =============================================================================

/**
 * Get tool matrix for JavaScript (legacy format)
 */
export function getJavaScriptToolsMatrix(): LegacyToolDefinition[] {
  return SEED_TOOLS
    .filter(tool => tool.languages.includes('javascript') && tool.type !== 'fixer')
    .map(convertToLegacyFormat);
}

/**
 * Get tool matrix for TypeScript (legacy format)
 */
export function getTypeScriptToolsMatrix(): LegacyToolDefinition[] {
  return SEED_TOOLS
    .filter(tool => tool.languages.includes('typescript') && tool.type !== 'fixer')
    .map(convertToLegacyFormat);
}

/**
 * Get tool matrix for Python (legacy format)
 */
export function getPythonToolsMatrix(): LegacyToolDefinition[] {
  return SEED_TOOLS
    .filter(tool => tool.languages.includes('python') && tool.type !== 'fixer')
    .map(convertToLegacyFormat);
}

/**
 * Get tool matrix for Java (legacy format)
 */
export function getJavaToolsMatrix(): LegacyToolDefinition[] {
  return SEED_TOOLS
    .filter(tool => tool.languages.includes('java') && tool.type !== 'fixer')
    .map(convertToLegacyFormat);
}

/**
 * Get tool matrix for any language (legacy format)
 */
export function getLegacyToolsMatrix(language: Language): LegacyToolDefinition[] {
  return SEED_TOOLS
    .filter(tool => tool.languages.includes(language) && tool.type !== 'fixer')
    .map(convertToLegacyFormat);
}

// =============================================================================
// V9 FORMAT EXPORTS
// =============================================================================

/**
 * Get V9 config for a language
 */
export function getV9LanguageConfig(language: Language): V9LanguageConfig {
  const tools = SEED_TOOLS
    .filter(tool => tool.languages.includes(language) && tool.type !== 'fixer')
    .map(convertToV9Format);

  return { tools };
}

/**
 * Get complete V9 tools config for all languages
 * Replaces v9-all-tools-config.ts
 */
export function getV9AllToolsConfig(): Record<string, V9LanguageConfig> {
  const languages: Language[] = [
    'java', 'python', 'javascript', 'typescript', 'rust', 'go',
    'csharp', 'cpp', 'c', 'ruby', 'php', 'swift', 'kotlin'
  ];

  const config: Record<string, V9LanguageConfig> = {};

  for (const lang of languages) {
    config[lang] = getV9LanguageConfig(lang);
  }

  return config;
}

// =============================================================================
// FIXER LOOKUP FOR THREE-TIER SYSTEM
// =============================================================================

/**
 * Get available fixers for a language
 */
export function getFixersForLanguageMatrix(language: Language): {
  tier1: Tool[];  // Native fix tools
  tier2: Tool[];  // Dedicated fixers
  tier3: string;  // AI fallback indicator
} {
  const fixers = getFixersForLanguage(language);

  return {
    tier1: fixers.filter(t => t.type === 'hybrid' && t.hasNativeFix),
    tier2: fixers.filter(t => t.type === 'fixer'),
    tier3: 'ai',
  };
}

/**
 * Get fixer recommendation for an issue
 */
export function getFixerRecommendation(
  analyzerToolId: string,
  ruleId: string,
  language: Language
): {
  fixerToolId: string;
  fixTier: 1 | 2 | 3;
  confidence: number;
  command?: string;
} | null {
  const mapping = getFixerForIssue(analyzerToolId, ruleId);

  if (mapping) {
    const fixerTool = getToolById(mapping.fixerToolId);
    return {
      fixerToolId: mapping.fixerToolId,
      fixTier: mapping.fixTier,
      confidence: mapping.confidence,
      command: fixerTool?.hasNativeFix ? fixerTool.nativeFixCommand : undefined,
    };
  }

  // Default to AI fallback
  return {
    fixerToolId: 'ai',
    fixTier: 3,
    confidence: 50,
  };
}

// =============================================================================
// TOOL ALIASES (Backward compatibility)
// =============================================================================

/**
 * Tool name aliases for parsing output
 * Consolidates aliases from both JS and Python matrices
 */
export const TOOL_ALIASES: Record<string, string> = {
  // JavaScript aliases
  'npm_audit': 'npm-audit',
  'yarn_audit': 'yarn-audit',
  'retire_js': 'retire-js',
  'license_checker': 'license-checker',
  'dependency_cruiser': 'dependency-cruiser',
  'eslint-security': 'eslint',

  // Python aliases
  'pip_audit': 'pip-audit',
  'detect_secrets': 'detect-secrets',
  'security': 'bandit',

  // Java aliases
  'dependency_check': 'dependency-check',
  'error_prone': 'error-prone',
  'spot_bugs': 'spotbugs',

  // Go aliases
  'golangci_lint': 'golangci-lint',

  // Rust aliases
  'cargo_audit': 'cargo-audit',
  'cargo_clippy': 'clippy',

  // Ruby aliases
  'bundler_audit': 'bundler-audit',

  // PHP aliases
  'php_cs': 'phpcs',
  'php_stan': 'phpstan',
};

/**
 * Check if a tool name matches (considering aliases)
 */
export function isToolMatch(executedTool: string, expectedTool: string): boolean {
  const normalizedExecuted = executedTool.toLowerCase().replace(/[-_]/g, '');
  const normalizedExpected = expectedTool.toLowerCase().replace(/[-_]/g, '');

  // Direct match
  if (normalizedExecuted === normalizedExpected) return true;

  // Check aliases
  const aliasedTool = TOOL_ALIASES[executedTool] || TOOL_ALIASES[executedTool.toLowerCase()];
  if (aliasedTool) {
    const normalizedAlias = aliasedTool.toLowerCase().replace(/[-_]/g, '');
    if (normalizedAlias === normalizedExpected) return true;
  }

  // Partial match
  return normalizedExecuted.includes(normalizedExpected) ||
         normalizedExpected.includes(normalizedExecuted);
}

// =============================================================================
// STATISTICS AND VALIDATION
// =============================================================================

/**
 * Get tool coverage statistics by language
 */
export function getToolCoverageByLanguage(): Record<Language, {
  analyzers: number;
  fixers: number;
  hybrid: number;
  categories: ToolCategory[];
}> {
  const languages: Language[] = [
    'java', 'python', 'javascript', 'typescript', 'rust', 'go',
    'csharp', 'cpp', 'c', 'ruby', 'php', 'swift', 'kotlin'
  ];

  const coverage: Record<string, {
    analyzers: number;
    fixers: number;
    hybrid: number;
    categories: ToolCategory[];
  }> = {};

  for (const lang of languages) {
    const tools = getToolsForLanguage(lang);
    const categories = new Set<ToolCategory>();

    tools.forEach(t => t.categories.forEach(c => categories.add(c)));

    coverage[lang] = {
      analyzers: tools.filter(t => t.type === 'analyzer').length,
      fixers: tools.filter(t => t.type === 'fixer').length,
      hybrid: tools.filter(t => t.type === 'hybrid').length,
      categories: Array.from(categories),
    };
  }

  return coverage as Record<Language, typeof coverage[string]>;
}

/**
 * Validate that all V9 required tools are present
 */
export function validateV9Coverage(): {
  valid: boolean;
  missing: { language: string; tools: string[] }[];
} {
  // Minimum required tools per language for V9
  const v9Requirements: Record<string, string[]> = {
    java: ['pmd', 'checkstyle', 'spotbugs', 'dependency-check', 'semgrep'],
    python: ['bandit', 'pylint', 'mypy', 'safety', 'semgrep'],
    javascript: ['eslint', 'npm-audit', 'semgrep'],
    typescript: ['eslint', 'tsc', 'npm-audit', 'semgrep'],
    rust: ['clippy', 'cargo-audit'],
    go: ['gosec', 'golangci-lint', 'semgrep'],
  };

  const missing: { language: string; tools: string[] }[] = [];

  for (const [lang, requiredTools] of Object.entries(v9Requirements)) {
    const availableTools = SEED_TOOLS
      .filter(t => t.languages.includes(lang as Language))
      .map(t => t.id);

    const missingTools = requiredTools.filter(t => !availableTools.includes(t));

    if (missingTools.length > 0) {
      missing.push({ language: lang, tools: missingTools });
    }
  }

  return {
    valid: missing.length === 0,
    missing,
  };
}

// =============================================================================
// DEPRECATED EXPORTS (for backward compatibility during migration)
// =============================================================================

/**
 * @deprecated Use getJavaScriptToolsMatrix() instead
 * Compatibility export matching javascript-tools-matrix.ts format
 */
export const JAVASCRIPT_TOOLS_MATRIX = getJavaScriptToolsMatrix();

/**
 * @deprecated Use getPythonToolsMatrix() instead
 * Compatibility export matching python-tools-matrix.ts format
 */
export const PYTHON_TOOLS_MATRIX = getPythonToolsMatrix();

/**
 * @deprecated Use getV9AllToolsConfig() instead
 * Compatibility export matching v9-all-tools-config.ts format
 */
export const V9_TOOLS_CONFIG = getV9AllToolsConfig();
