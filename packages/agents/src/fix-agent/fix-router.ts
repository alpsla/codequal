/**
 * Fix Router Module
 *
 * Routes classified issues to the appropriate fix tier and fixer tool.
 * Manages the mapping from issue types to specific fixers.
 *
 * Part of the Three-Tier Fix System (P0 Priority)
 */

import { ClassifiedIssue, IssueType, classifyIssue } from './issue-classifier';

export interface FixRoute {
  tier: 1 | 2 | 3;
  fixer: string;           // Tool name (e.g., 'eslint', 'ruff', 'sorald', 'ai')
  command?: string;        // Command to execute (e.g., 'eslint --fix')
  confidence: number;      // 0-100, how confident we are in the fix
  estimatedTime: number;   // Estimated execution time in ms
  batchable: boolean;      // Can be batched with other issues
  requiresContext: boolean; // Needs source code context for AI
}

export interface EnrichedIssue {
  id: string;
  ruleId: string;
  tool: string;
  message: string;
  file: string;
  line: number;
  column?: number;
  severity: 'critical' | 'high' | 'medium' | 'low';
  category?: string;
  originalFix?: string;    // Fix suggestion from the tool
}

export interface RoutedIssue extends EnrichedIssue {
  classification: ClassifiedIssue;
  route: FixRoute;
}

// Tier 1: Native tool fixers (--fix flag)
const TIER1_FIXERS: Record<string, { command: string; estimatedTime: number; batchable: boolean }> = {
  // JavaScript/TypeScript
  'eslint': {
    command: 'eslint --fix',
    estimatedTime: 500,
    batchable: true,
  },
  'prettier': {
    command: 'prettier --write',
    estimatedTime: 200,
    batchable: true,
  },
  'typescript-eslint': {
    command: 'eslint --fix',
    estimatedTime: 500,
    batchable: true,
  },

  // Python
  'ruff': {
    command: 'ruff check --fix',
    estimatedTime: 300,
    batchable: true,
  },
  'ruff-format': {
    command: 'ruff format',
    estimatedTime: 200,
    batchable: true,
  },

  // Go
  'golangci-lint': {
    command: 'golangci-lint run --fix',
    estimatedTime: 1000,
    batchable: true,
  },
  'gofmt': {
    command: 'gofmt -w',
    estimatedTime: 100,
    batchable: true,
  },
  'goimports': {
    command: 'goimports -w',
    estimatedTime: 150,
    batchable: true,
  },

  // Multi-language
  'semgrep': {
    command: 'semgrep --autofix',
    estimatedTime: 2000,
    batchable: true,
  },
};

// Tier 2: Dedicated fixer tools
const TIER2_FIXERS: Record<string, { command: string; estimatedTime: number; batchable: boolean; supportedRules?: string[] }> = {
  // Python
  'autoflake': {
    command: 'autoflake --in-place --remove-all-unused-imports --remove-unused-variables',
    estimatedTime: 200,
    batchable: true,
    supportedRules: ['F401', 'F841', 'F842'],  // Unused imports/variables
  },
  'pyupgrade': {
    command: 'pyupgrade --py38-plus',
    estimatedTime: 300,
    batchable: true,
    supportedRules: ['UP001', 'UP003', 'UP004', 'UP005', 'UP006', 'UP007', 'UP008'],  // Python upgrades
  },
  'isort': {
    command: 'isort',
    estimatedTime: 150,
    batchable: true,
    supportedRules: ['I001', 'I002'],  // Import sorting
  },
  'black': {
    command: 'black',
    estimatedTime: 300,
    batchable: true,
  },

  // Java
  'sorald': {
    command: 'sorald repair --source',
    estimatedTime: 5000,  // JVM startup overhead
    batchable: false,
    supportedRules: [
      'S1068', 'S1118', 'S1132', 'S1155', 'S1161', 'S1165', 'S1217', 'S1481',
      'S1596', 'S1656', 'S1854', 'S1860', 'S1948', 'S2057', 'S2095', 'S2097',
      'S2111', 'S2116', 'S2142', 'S2164', 'S2184', 'S2204', 'S2225', 'S2272',
      'S2755', // 25+ SonarQube rules
    ],
  },
  'openrewrite': {
    command: 'mvn org.openrewrite.maven:rewrite-maven-plugin:run',
    estimatedTime: 10000,  // Very slow, JVM + Maven
    batchable: false,
  },
  'error-prone': {
    command: 'javac -XDcompilePolicy=simple -processorpath error_prone_core.jar',
    estimatedTime: 3000,
    batchable: false,
  },

  // Dependency updates
  'renovate': {
    command: 'renovate --platform=local',
    estimatedTime: 30000,
    batchable: false,
  },
  'npm-check-updates': {
    command: 'ncu -u',
    estimatedTime: 5000,
    batchable: false,
  },
};

// Language-specific fixer preferences
const LANGUAGE_FIXERS: Record<string, { tier1: string[]; tier2: string[] }> = {
  'javascript': {
    tier1: ['eslint', 'prettier'],
    tier2: [],
  },
  'typescript': {
    tier1: ['eslint', 'prettier', 'typescript-eslint'],
    tier2: [],
  },
  'python': {
    tier1: ['ruff', 'ruff-format'],
    tier2: ['autoflake', 'pyupgrade', 'isort', 'black'],
  },
  'java': {
    tier1: ['semgrep'],
    tier2: ['sorald', 'openrewrite', 'error-prone'],
  },
  'go': {
    tier1: ['golangci-lint', 'gofmt', 'goimports'],
    tier2: [],
  },
  'rust': {
    tier1: ['clippy'],
    tier2: [],
  },
  'php': {
    tier1: ['php-cs-fixer'],
    tier2: [],
  },
};

// Tool to language mapping
const TOOL_LANGUAGES: Record<string, string> = {
  'eslint': 'typescript',
  'prettier': 'typescript',
  'ruff': 'python',
  'pylint': 'python',
  'bandit': 'python',
  'pmd': 'java',
  'checkstyle': 'java',
  'spotbugs': 'java',
  'golangci-lint': 'go',
  'gosec': 'go',
  'clippy': 'rust',
  'cargo-audit': 'rust',
  'phpstan': 'php',
  'psalm': 'php',
  'semgrep': 'multi',  // Multi-language
};

/**
 * Get the appropriate fixer for a tool and issue type
 */
function getFixerForTool(tool: string, issueType: IssueType, fixable: boolean): string {
  const language = TOOL_LANGUAGES[tool.toLowerCase()] || 'unknown';
  const fixers = LANGUAGE_FIXERS[language];

  if (!fixers) {
    return 'ai';  // Default to AI fallback
  }

  // Tier 1: Use native tool fix if available
  if (fixable && fixers.tier1.includes(tool.toLowerCase())) {
    return tool.toLowerCase();
  }

  // Tier 1: Use ESLint for TypeScript eslint rules
  if (tool.toLowerCase().includes('eslint') && fixable) {
    return 'eslint';
  }

  // Tier 2: Use dedicated fixer based on issue type and language
  if (language === 'python') {
    if (issueType === 'quality') return 'autoflake';
    if (issueType === 'compatibility') return 'pyupgrade';
    if (issueType === 'style') return 'ruff';
  }

  if (language === 'java') {
    if (issueType === 'quality' || issueType === 'performance') return 'sorald';
    if (issueType === 'compatibility') return 'openrewrite';
  }

  // Tier 3: AI fallback
  return 'ai';
}

/**
 * Route an issue to the appropriate fix tier and fixer
 */
export function routeToFixer(issue: EnrichedIssue): RoutedIssue {
  // First classify the issue
  const classification = classifyIssue(issue.ruleId, issue.tool);

  // Get the appropriate fixer
  const fixer = getFixerForTool(issue.tool, classification.issueType, classification.fixable);

  // Build the route
  let route: FixRoute;

  if (classification.fixTier === 1 && TIER1_FIXERS[fixer]) {
    const fixerConfig = TIER1_FIXERS[fixer];
    route = {
      tier: 1,
      fixer,
      command: fixerConfig.command,
      confidence: 95,  // High confidence for native tool fixes
      estimatedTime: fixerConfig.estimatedTime,
      batchable: fixerConfig.batchable,
      requiresContext: false,
    };
  } else if (classification.fixTier === 2 && TIER2_FIXERS[fixer]) {
    const fixerConfig = TIER2_FIXERS[fixer];
    route = {
      tier: 2,
      fixer,
      command: fixerConfig.command,
      confidence: 85,  // Good confidence for dedicated fixers
      estimatedTime: fixerConfig.estimatedTime,
      batchable: fixerConfig.batchable,
      requiresContext: false,
    };
  } else {
    // Tier 3: AI fallback
    route = {
      tier: 3,
      fixer: 'ai',
      confidence: 60,  // Lower confidence for AI-generated fixes
      estimatedTime: 3000,  // AI calls take time
      batchable: true,
      requiresContext: true,  // AI needs source code context
    };
  }

  return {
    ...issue,
    classification,
    route,
  };
}

/**
 * Route multiple issues and group by fixer for batch processing
 */
export function routeAndGroupIssues(issues: EnrichedIssue[]): Map<string, RoutedIssue[]> {
  const grouped = new Map<string, RoutedIssue[]>();

  for (const issue of issues) {
    const routed = routeToFixer(issue);
    const key = `${routed.route.tier}-${routed.route.fixer}`;

    if (!grouped.has(key)) {
      grouped.set(key, []);
    }
    grouped.get(key)!.push(routed);
  }

  return grouped;
}

/**
 * Get fix route summary for a set of issues
 */
export function getRouteSummary(issues: EnrichedIssue[]): {
  total: number;
  byTier: Record<1 | 2 | 3, number>;
  byFixer: Record<string, number>;
  estimatedTotalTime: number;
  batchableCount: number;
} {
  const summary = {
    total: issues.length,
    byTier: { 1: 0, 2: 0, 3: 0 } as Record<1 | 2 | 3, number>,
    byFixer: {} as Record<string, number>,
    estimatedTotalTime: 0,
    batchableCount: 0,
  };

  const grouped = routeAndGroupIssues(issues);

  for (const [, routedIssues] of Array.from(grouped.entries())) {
    if (routedIssues.length === 0) continue;

    const firstRoute = routedIssues[0].route;
    summary.byTier[firstRoute.tier] += routedIssues.length;
    summary.byFixer[firstRoute.fixer] = (summary.byFixer[firstRoute.fixer] || 0) + routedIssues.length;

    if (firstRoute.batchable) {
      summary.batchableCount += routedIssues.length;
      // Batched operations are faster
      summary.estimatedTotalTime += firstRoute.estimatedTime * Math.ceil(Math.sqrt(routedIssues.length));
    } else {
      summary.estimatedTotalTime += firstRoute.estimatedTime * routedIssues.length;
    }
  }

  return summary;
}

/**
 * Check if a specific fixer can handle a rule
 */
export function canFixerHandleRule(fixer: string, ruleId: string): boolean {
  const tier2Fixer = TIER2_FIXERS[fixer];
  if (tier2Fixer?.supportedRules) {
    return tier2Fixer.supportedRules.includes(ruleId);
  }
  // Tier 1 fixers typically handle their own tool's rules
  return TIER1_FIXERS[fixer] !== undefined;
}

/**
 * Get available fixers for a language
 */
export function getFixersForLanguage(language: string): { tier1: string[]; tier2: string[] } {
  return LANGUAGE_FIXERS[language.toLowerCase()] || { tier1: [], tier2: [] };
}

/**
 * Get fixer configuration
 */
export function getFixerConfig(fixer: string): { command?: string; estimatedTime: number; batchable: boolean } | null {
  return TIER1_FIXERS[fixer] || TIER2_FIXERS[fixer] || null;
}

// Export configurations for extension
export { TIER1_FIXERS, TIER2_FIXERS, LANGUAGE_FIXERS, TOOL_LANGUAGES };
