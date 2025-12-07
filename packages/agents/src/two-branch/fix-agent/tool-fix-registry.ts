/**
 * Tool Fix Registry
 *
 * Central registry of which analysis tools support auto-fixing.
 * Used by the Three-Tier Fix System to route issues to the appropriate fixer.
 *
 * Tiers:
 * - Tier 1 (SAFE): Tool has native --fix flag, deterministic, no semantic changes
 * - Tier 2 (TECHNICAL): Dedicated fixer tool, may require code understanding
 * - Tier 3 (AI): No tool support, requires AI generation with code context
 */

// ============================================================================
// TYPES
// ============================================================================

export type FixTier = 1 | 2 | 3;

export interface ToolFixCapability {
  toolId: string;
  name: string;
  language: string[];
  tier: FixTier;
  hasNativeFix: boolean;
  fixCommand?: string;
  fixerTool?: string;        // For Tier 2: which dedicated fixer to use
  confidence: number;        // 0-100, how reliable the fix is
  categories: string[];      // Issue categories this tool handles
  safeForAutoApply: boolean; // Can be auto-applied without review
}

export interface FixerToolInfo {
  id: string;
  name: string;
  language: string[];
  command: string;
  installCommand?: string;
  description: string;
  tier: FixTier;
}

// ============================================================================
// TIER 1: TOOLS WITH NATIVE --fix FLAG
// ============================================================================

export const TIER1_NATIVE_FIXERS: ToolFixCapability[] = [
  // JavaScript/TypeScript
  {
    toolId: 'eslint',
    name: 'ESLint',
    language: ['javascript', 'typescript'],
    tier: 1,
    hasNativeFix: true,
    fixCommand: 'eslint --fix',
    confidence: 95,
    categories: ['style', 'code_quality', 'best_practices'],
    safeForAutoApply: true,
  },
  {
    toolId: 'prettier',
    name: 'Prettier',
    language: ['javascript', 'typescript', 'css', 'html', 'json', 'markdown', 'yaml'],
    tier: 1,
    hasNativeFix: true,
    fixCommand: 'prettier --write',
    confidence: 99,
    categories: ['formatting'],
    safeForAutoApply: true,
  },
  {
    toolId: 'biome',
    name: 'Biome',
    language: ['javascript', 'typescript', 'json'],
    tier: 1,
    hasNativeFix: true,
    fixCommand: 'biome check --apply',
    confidence: 95,
    categories: ['style', 'code_quality', 'formatting'],
    safeForAutoApply: true,
  },

  // Python
  {
    toolId: 'ruff',
    name: 'Ruff',
    language: ['python'],
    tier: 1,
    hasNativeFix: true,
    fixCommand: 'ruff check --fix',
    confidence: 95,
    categories: ['style', 'code_quality', 'imports', 'best_practices'],
    safeForAutoApply: true,
  },
  {
    toolId: 'black',
    name: 'Black',
    language: ['python'],
    tier: 1,
    hasNativeFix: true,
    fixCommand: 'black',
    confidence: 99,
    categories: ['formatting'],
    safeForAutoApply: true,
  },
  {
    toolId: 'isort',
    name: 'isort',
    language: ['python'],
    tier: 1,
    hasNativeFix: true,
    fixCommand: 'isort',
    confidence: 98,
    categories: ['imports'],
    safeForAutoApply: true,
  },
  {
    toolId: 'autoflake',
    name: 'autoflake',
    language: ['python'],
    tier: 1,
    hasNativeFix: true,
    fixCommand: 'autoflake --in-place --remove-all-unused-imports',
    confidence: 95,
    categories: ['unused_code', 'imports'],
    safeForAutoApply: true,
  },

  // Go
  {
    toolId: 'golangci-lint',
    name: 'golangci-lint',
    language: ['go'],
    tier: 1,
    hasNativeFix: true,
    fixCommand: 'golangci-lint run --fix',
    confidence: 90,
    categories: ['style', 'code_quality', 'best_practices'],
    safeForAutoApply: true,
  },
  {
    toolId: 'gofmt',
    name: 'gofmt',
    language: ['go'],
    tier: 1,
    hasNativeFix: true,
    fixCommand: 'gofmt -w',
    confidence: 99,
    categories: ['formatting'],
    safeForAutoApply: true,
  },
  {
    toolId: 'goimports',
    name: 'goimports',
    language: ['go'],
    tier: 1,
    hasNativeFix: true,
    fixCommand: 'goimports -w',
    confidence: 98,
    categories: ['imports', 'formatting'],
    safeForAutoApply: true,
  },

  // Rust
  {
    toolId: 'rustfmt',
    name: 'rustfmt',
    language: ['rust'],
    tier: 1,
    hasNativeFix: true,
    fixCommand: 'rustfmt',
    confidence: 99,
    categories: ['formatting'],
    safeForAutoApply: true,
  },
  {
    toolId: 'clippy',
    name: 'Clippy',
    language: ['rust'],
    tier: 1,
    hasNativeFix: true,
    fixCommand: 'cargo clippy --fix --allow-dirty',
    confidence: 85,
    categories: ['style', 'code_quality', 'best_practices'],
    safeForAutoApply: false, // Some clippy fixes can change semantics
  },

  // Ruby
  {
    toolId: 'rubocop',
    name: 'RuboCop',
    language: ['ruby'],
    tier: 1,
    hasNativeFix: true,
    fixCommand: 'rubocop -a',
    confidence: 90,
    categories: ['style', 'code_quality'],
    safeForAutoApply: true,
  },

  // PHP
  {
    toolId: 'php-cs-fixer',
    name: 'PHP CS Fixer',
    language: ['php'],
    tier: 1,
    hasNativeFix: true,
    fixCommand: 'php-cs-fixer fix',
    confidence: 92,
    categories: ['style', 'formatting'],
    safeForAutoApply: true,
  },

  // Security (Semgrep)
  {
    toolId: 'semgrep',
    name: 'Semgrep',
    language: ['javascript', 'typescript', 'python', 'java', 'go', 'ruby', 'php'],
    tier: 1,
    hasNativeFix: true,
    fixCommand: 'semgrep --autofix',
    confidence: 80, // Depends on rule quality
    categories: ['security'],
    safeForAutoApply: false, // Security fixes should be reviewed
  },
];

// ============================================================================
// TIER 2: DEDICATED FIXER TOOLS
// ============================================================================

export const TIER2_DEDICATED_FIXERS: ToolFixCapability[] = [
  // Python
  {
    toolId: 'pylint',
    name: 'Pylint',
    language: ['python'],
    tier: 2,
    hasNativeFix: false,
    fixerTool: 'ruff',
    confidence: 85,
    categories: ['code_quality', 'best_practices'],
    safeForAutoApply: false,
  },
  {
    toolId: 'pyupgrade',
    name: 'pyupgrade',
    language: ['python'],
    tier: 2,
    hasNativeFix: true,
    fixCommand: 'pyupgrade --py39-plus',
    confidence: 90,
    categories: ['modernization', 'python_version'],
    safeForAutoApply: true,
  },

  // Java
  {
    toolId: 'pmd',
    name: 'PMD',
    language: ['java'],
    tier: 2,
    hasNativeFix: false,
    fixerTool: 'sorald',
    confidence: 70,
    categories: ['code_quality', 'best_practices'],
    safeForAutoApply: false,
  },
  {
    toolId: 'checkstyle',
    name: 'Checkstyle',
    language: ['java'],
    tier: 2,
    hasNativeFix: false,
    fixerTool: 'google-java-format',
    confidence: 75,
    categories: ['style', 'formatting'],
    safeForAutoApply: false,
  },
  {
    toolId: 'spotbugs',
    name: 'SpotBugs',
    language: ['java'],
    tier: 2,
    hasNativeFix: false,
    fixerTool: 'sorald',
    confidence: 60,
    categories: ['bugs', 'security'],
    safeForAutoApply: false,
  },
  {
    toolId: 'sorald',
    name: 'Sorald',
    language: ['java'],
    tier: 2,
    hasNativeFix: true,
    fixCommand: 'java -jar sorald.jar repair',
    confidence: 75,
    categories: ['code_quality', 'bugs'],
    safeForAutoApply: false, // JVM fixes need review
  },

  // Kotlin
  {
    toolId: 'ktlint',
    name: 'ktlint',
    language: ['kotlin'],
    tier: 2,
    hasNativeFix: true,
    fixCommand: 'ktlint -F',
    confidence: 92,
    categories: ['style', 'formatting'],
    safeForAutoApply: true,
  },
  {
    toolId: 'detekt',
    name: 'Detekt',
    language: ['kotlin'],
    tier: 2,
    hasNativeFix: false,
    fixerTool: 'ktlint',
    confidence: 70,
    categories: ['code_quality', 'best_practices'],
    safeForAutoApply: false,
  },

  // Swift
  {
    toolId: 'swiftlint',
    name: 'SwiftLint',
    language: ['swift'],
    tier: 2,
    hasNativeFix: true,
    fixCommand: 'swiftlint --fix',
    confidence: 88,
    categories: ['style', 'code_quality'],
    safeForAutoApply: true,
  },

  // Dependencies
  {
    toolId: 'dependency-check',
    name: 'OWASP Dependency-Check',
    language: ['java', 'javascript', 'python', 'go', 'rust'],
    tier: 2,
    hasNativeFix: false,
    fixerTool: 'renovate',
    confidence: 70,
    categories: ['security', 'dependencies'],
    safeForAutoApply: false,
  },
  {
    toolId: 'npm-audit',
    name: 'npm audit',
    language: ['javascript', 'typescript'],
    tier: 2,
    hasNativeFix: true,
    fixCommand: 'npm audit fix',
    confidence: 75,
    categories: ['security', 'dependencies'],
    safeForAutoApply: false,
  },
];

// ============================================================================
// TIER 3: AI-REQUIRED (No tool support)
// ============================================================================

export const TIER3_AI_REQUIRED: ToolFixCapability[] = [
  {
    toolId: 'bandit',
    name: 'Bandit',
    language: ['python'],
    tier: 3,
    hasNativeFix: false,
    confidence: 50,
    categories: ['security'],
    safeForAutoApply: false,
  },
  {
    toolId: 'gosec',
    name: 'gosec',
    language: ['go'],
    tier: 3,
    hasNativeFix: false,
    confidence: 50,
    categories: ['security'],
    safeForAutoApply: false,
  },
  {
    toolId: 'typescript-tsc',
    name: 'TypeScript Compiler',
    language: ['typescript'],
    tier: 3,
    hasNativeFix: false,
    fixerTool: 'eslint',
    confidence: 60,
    categories: ['type_errors'],
    safeForAutoApply: false,
  },
  {
    toolId: 'cargo-audit',
    name: 'cargo-audit',
    language: ['rust'],
    tier: 3,
    hasNativeFix: false,
    confidence: 40,
    categories: ['security', 'dependencies'],
    safeForAutoApply: false,
  },
];

// ============================================================================
// REGISTRY CLASS
// ============================================================================

export class ToolFixRegistry {
  private tools: Map<string, ToolFixCapability>;

  constructor() {
    this.tools = new Map();

    // Load all tools
    [...TIER1_NATIVE_FIXERS, ...TIER2_DEDICATED_FIXERS, ...TIER3_AI_REQUIRED].forEach(tool => {
      this.tools.set(tool.toolId, tool);
    });
  }

  /**
   * Get fix capability for a tool
   */
  getToolCapability(toolId: string): ToolFixCapability | undefined {
    return this.tools.get(toolId);
  }

  /**
   * Get all tools for a language
   */
  getToolsForLanguage(language: string): ToolFixCapability[] {
    return Array.from(this.tools.values()).filter(
      tool => tool.language.includes(language)
    );
  }

  /**
   * Get all Tier 1 tools (native --fix)
   */
  getTier1Tools(): ToolFixCapability[] {
    return Array.from(this.tools.values()).filter(tool => tool.tier === 1);
  }

  /**
   * Get all Tier 2 tools (dedicated fixers)
   */
  getTier2Tools(): ToolFixCapability[] {
    return Array.from(this.tools.values()).filter(tool => tool.tier === 2);
  }

  /**
   * Get all Tier 3 tools (AI required)
   */
  getTier3Tools(): ToolFixCapability[] {
    return Array.from(this.tools.values()).filter(tool => tool.tier === 3);
  }

  /**
   * Check if tool supports auto-fix
   */
  supportsAutoFix(toolId: string): boolean {
    const tool = this.tools.get(toolId);
    return tool?.hasNativeFix ?? false;
  }

  /**
   * Get fix command for a tool
   */
  getFixCommand(toolId: string): string | undefined {
    const tool = this.tools.get(toolId);
    return tool?.fixCommand;
  }

  /**
   * Get tier for a tool
   */
  getTier(toolId: string): FixTier {
    const tool = this.tools.get(toolId);
    return tool?.tier ?? 3; // Default to AI if unknown
  }

  /**
   * Check if fix is safe for auto-apply
   */
  isSafeForAutoApply(toolId: string): boolean {
    const tool = this.tools.get(toolId);
    return tool?.safeForAutoApply ?? false;
  }

  /**
   * Get confidence score for a tool
   */
  getConfidence(toolId: string): number {
    const tool = this.tools.get(toolId);
    return tool?.confidence ?? 50;
  }

  /**
   * Get all tools by category
   */
  getToolsByCategory(category: string): ToolFixCapability[] {
    return Array.from(this.tools.values()).filter(
      tool => tool.categories.includes(category)
    );
  }

  /**
   * Get summary statistics
   */
  getSummary(): {
    total: number;
    tier1: number;
    tier2: number;
    tier3: number;
    byLanguage: Record<string, number>;
  } {
    const all = Array.from(this.tools.values());
    const byLanguage: Record<string, number> = {};

    all.forEach(tool => {
      tool.language.forEach(lang => {
        byLanguage[lang] = (byLanguage[lang] || 0) + 1;
      });
    });

    return {
      total: all.length,
      tier1: all.filter(t => t.tier === 1).length,
      tier2: all.filter(t => t.tier === 2).length,
      tier3: all.filter(t => t.tier === 3).length,
      byLanguage,
    };
  }
}

// Export singleton instance
export const toolFixRegistry = new ToolFixRegistry();
