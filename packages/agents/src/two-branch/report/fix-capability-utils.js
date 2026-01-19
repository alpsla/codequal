"use strict";
/**
 * Fix Capability Utilities for Report Generation
 *
 * Bridges the ToolFixRegistry to report generators, providing:
 * - Accurate auto-fix detection using the central registry
 * - Enhanced descriptions for scanner-only tools (Performance/Architecture)
 * - Value proposition messaging for issues without auto-fix
 *
 * Session 57 Part 3: Created to handle new Performance/Architecture tools
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.getFixCapabilityInfo = getFixCapabilityInfo;
exports.isGroupAutoFixable = isGroupAutoFixable;
exports.isIssueAutoFixable = isIssueAutoFixable;
exports.getScannerToolGuidance = getScannerToolGuidance;
exports.getScannerToolsForCategory = getScannerToolsForCategory;
exports.generateScannerValueSection = generateScannerValueSection;
exports.getTierBadge = getTierBadge;
exports.getConfidenceDescription = getConfidenceDescription;
exports.enrichIssueWithFixCapability = enrichIssueWithFixCapability;
exports.getFixSummaryStats = getFixSummaryStats;
const tool_fix_registry_1 = require("../fix-agent/tool-fix-registry");
// ============================================================================
// SCANNER-ONLY TOOL GUIDANCE
// ============================================================================
const SCANNER_TOOL_GUIDANCE = {
    // Performance Tools
    'lighthouse': {
        tool: 'Lighthouse',
        category: 'Performance',
        whatYouGet: [
            'Core Web Vitals metrics (LCP, FID, CLS)',
            'Performance score breakdown (0-100)',
            'Specific optimization opportunities',
            'Metric thresholds vs your values',
        ],
        howToFix: [
            'Optimize Largest Contentful Paint (LCP): Reduce server response time, preload critical resources',
            'Reduce First Input Delay (FID): Split long JavaScript tasks, use web workers',
            'Fix Cumulative Layout Shift (CLS): Set explicit dimensions for images/embeds',
        ],
        resources: [
            'https://web.dev/vitals/',
            'https://developers.google.com/web/tools/lighthouse',
        ],
    },
    'bundle-analyzer': {
        tool: 'Bundle Analyzer',
        category: 'Performance',
        whatYouGet: [
            'Bundle size breakdown by module',
            'Duplicate dependencies detection',
            'Tree-shaking opportunities',
            'Size impact of each dependency',
        ],
        howToFix: [
            'Enable code splitting with dynamic imports',
            'Use tree-shaking friendly imports (import { x } from "lib" not import * from "lib")',
            'Replace heavy dependencies with lighter alternatives',
            'Analyze and dedupe duplicate dependencies',
        ],
        resources: [
            'https://webpack.js.org/guides/code-splitting/',
            'https://bundlephobia.com/',
        ],
    },
    'eslint-perf': {
        tool: 'ESLint Performance Plugin',
        category: 'Performance',
        whatYouGet: [
            'Inefficient code pattern detection',
            'Memory leak risk identification',
            'Render performance issues (React)',
            'Algorithm complexity warnings',
        ],
        howToFix: [
            'Replace forEach/map chains with single reduce',
            'Memoize expensive computations',
            'Avoid creating functions inside render',
            'Use appropriate data structures (Map vs Object)',
        ],
        resources: [
            'https://eslint.org/docs/rules/',
        ],
    },
    // Architecture Tools
    'madge': {
        tool: 'Madge',
        category: 'Architecture',
        whatYouGet: [
            'Complete circular dependency cycle paths',
            'Visual dependency graph',
            'Affected file list',
            'Cycle entry/exit points',
        ],
        howToFix: [
            'Extract shared code to a new module (break the cycle)',
            'Use dependency injection pattern',
            'Introduce interface layer between modules',
            'Consider lazy loading for optional dependencies',
        ],
        resources: [
            'https://github.com/pahen/madge',
            'https://en.wikipedia.org/wiki/Circular_dependency',
        ],
    },
    'dependency-cruiser': {
        tool: 'Dependency Cruiser',
        category: 'Architecture',
        whatYouGet: [
            'Architecture rule violations',
            'Layer dependency violations',
            'Forbidden import patterns',
            'Module boundary crossings',
        ],
        howToFix: [
            'Respect layer boundaries (UI → Service → Data)',
            'Use proper import aliases for enforced boundaries',
            'Introduce facade patterns for cross-boundary access',
            'Review and update dependency-cruiser rules if intentional',
        ],
        resources: [
            'https://github.com/sverweij/dependency-cruiser',
        ],
    },
    'ts-unused-exports': {
        tool: 'ts-unused-exports',
        category: 'Architecture',
        whatYouGet: [
            'List of unused exports',
            'Potential dead code locations',
            'Export/import analysis',
            'Safe removal candidates',
        ],
        howToFix: [
            'Remove unused exports after verifying no external consumers',
            'Convert public exports to private if only used internally',
            'Check if exports are used by external packages before removal',
            'Consider barrel file (index.ts) cleanup',
        ],
        resources: [
            'https://github.com/pzavolinsky/ts-unused-exports',
        ],
    },
    // Java Architecture Tools (Session 57 Part 5)
    'jdepend': {
        tool: 'JDepend',
        category: 'Architecture',
        whatYouGet: [
            'Package dependency cycle detection',
            'Design quality metrics (Ca, Ce, A, I, D)',
            'Distance from main sequence analysis',
            'Coupling analysis for each package',
        ],
        howToFix: [
            'Break package cycles by extracting shared code to a new package',
            'Apply Dependency Inversion Principle (depend on abstractions)',
            'Use package-level interfaces to reduce coupling',
            'Move towards the main sequence (balance abstractness and stability)',
            'Reduce efferent coupling by consolidating dependencies',
        ],
        resources: [
            'https://github.com/clarkware/jdepend',
            'https://en.wikipedia.org/wiki/Software_package_metrics',
        ],
    },
    // Python Architecture Tools (Session 57 Part 4 & 5)
    'pydeps': {
        tool: 'pydeps',
        category: 'Architecture',
        whatYouGet: [
            'Python module dependency graph',
            'Circular dependency detection',
            'Import relationship visualization',
            'Module coupling analysis',
        ],
        howToFix: [
            'Extract shared code to a new module to break cycles',
            'Use dependency injection to decouple modules',
            'Introduce an interface/protocol layer between modules',
            'Consider lazy imports for optional dependencies',
            'Restructure code to follow layered architecture',
        ],
        resources: [
            'https://github.com/thebjorn/pydeps',
            'https://en.wikipedia.org/wiki/Circular_dependency',
        ],
    },
    'import-linter': {
        tool: 'Import Linter',
        category: 'Architecture',
        whatYouGet: [
            'Layer architecture contract enforcement',
            'Independence constraint validation',
            'Import chain analysis (direct and indirect)',
            'Detailed violation reports with file:line references',
        ],
        howToFix: [
            'Refactor code to respect layer boundaries (UI → Service → Data)',
            'Use dependency injection to invert problematic dependencies',
            'Introduce interface/protocol layer between modules',
            'Extract shared functionality to a common lower layer',
            'Review and update .importlinter contracts if intentional',
        ],
        resources: [
            'https://import-linter.readthedocs.io/',
            'https://github.com/seddonym/import-linter',
        ],
    },
    // Go Architecture Tools (Session 57 Part 5)
    'go-arch-lint': {
        tool: 'go-arch-lint',
        category: 'Architecture',
        whatYouGet: [
            'Architecture rule enforcement via YAML config',
            'Component dependency validation',
            'Layer boundary violation detection',
            'Support for clean/hexagonal/DDD/MVC patterns',
            'Dependency graph analysis',
        ],
        howToFix: [
            'Review dependency rules in .go-arch-lint.yml',
            'Refactor code to respect component boundaries',
            'Move shared code to allowed dependency targets',
            'Use interfaces to invert problematic dependencies',
            'Consider restructuring packages to match architecture',
            'Update config rules if dependency is intentional',
        ],
        resources: [
            'https://github.com/fe3dback/go-arch-lint',
            'https://en.wikipedia.org/wiki/Clean_architecture',
            'https://en.wikipedia.org/wiki/Hexagonal_architecture_(software)',
        ],
    },
    // Rust Architecture Tools (Session 57 Part 5)
    'cargo-modules': {
        tool: 'cargo-modules',
        category: 'Architecture',
        whatYouGet: [
            'Module hierarchy visualization',
            'Internal dependency graph analysis',
            'Circular dependency detection (--acyclic)',
            'Orphaned module detection',
            'Module visibility analysis',
        ],
        howToFix: [
            'Break circular dependencies by extracting shared code to a new module',
            'Use traits/interfaces to decouple modules',
            'Move orphaned modules to be linked from parent mod.rs',
            'Consider using pub(crate) to limit visibility',
            'Restructure modules to follow Rust module conventions',
            'Remove orphaned modules if they are dead code',
        ],
        resources: [
            'https://github.com/regexident/cargo-modules',
            'https://doc.rust-lang.org/book/ch07-00-managing-growing-projects-with-packages-crates-and-modules.html',
            'https://en.wikipedia.org/wiki/Circular_dependency',
        ],
    },
    // Ruby Architecture Tools (Session 57 Part 5)
    'packwerk': {
        tool: 'Packwerk',
        category: 'Architecture',
        whatYouGet: [
            'Rails package boundary enforcement',
            'Dependency violation detection (cross-package references)',
            'Privacy violation detection (accessing private constants)',
            'Modular monolith support',
            'Package dependency graph validation',
        ],
        howToFix: [
            'Add missing dependencies to package.yml',
            'Move code to the correct package',
            'Create public API modules for cross-package access',
            'Use dependency injection to invert problematic dependencies',
            'Extract shared code to a common package',
            'Record intentional violations in package_todo.yml',
        ],
        resources: [
            'https://github.com/Shopify/packwerk',
            'https://shopify.engineering/enforcing-modularity-rails-apps-packwerk',
            'https://github.com/Shopify/packwerk/blob/main/RESOLVING_VIOLATIONS.md',
        ],
    },
    // PHP Architecture Tools (Session 57 Part 5)
    'deptrac': {
        tool: 'Deptrac',
        category: 'Architecture',
        whatYouGet: [
            'Layer-based architecture enforcement',
            'Dependency rule validation via YAML config',
            'Cross-layer violation detection',
            'Uncovered class detection (classes not assigned to layers)',
            'Dependency graph visualization (Graphviz/Mermaid)',
        ],
        howToFix: [
            'Define proper layers in deptrac.yaml',
            'Add missing layer dependencies to ruleset',
            'Refactor code to respect layer boundaries',
            'Use interfaces/contracts between layers',
            'Move classes to correct layer directory',
            'Assign uncovered classes to appropriate layers',
        ],
        resources: [
            'https://github.com/deptrac/deptrac',
            'https://deptrac.github.io/deptrac/',
            'https://symfony.com/blog/clean-software-architecture-with-deptrac',
        ],
    },
    // Security Tools (scanner-only)
    'bandit': {
        tool: 'Bandit',
        category: 'Security',
        whatYouGet: [
            'Python security vulnerability detection',
            'CWE classification',
            'Severity ratings',
            'Code location with context',
        ],
        howToFix: [
            'Replace hardcoded secrets with environment variables',
            'Use parameterized queries for SQL',
            'Sanitize user input before use',
            'Use secure random number generators',
        ],
        resources: [
            'https://bandit.readthedocs.io/',
            'https://owasp.org/www-project-web-security-testing-guide/',
        ],
    },
    'gosec': {
        tool: 'gosec',
        category: 'Security',
        whatYouGet: [
            'Go security vulnerability detection',
            'CWE classification',
            'Severity ratings',
            'Code location with context',
        ],
        howToFix: [
            'Use crypto/rand instead of math/rand',
            'Validate file paths to prevent path traversal',
            'Use prepared statements for database queries',
            'Handle errors explicitly',
        ],
        resources: [
            'https://github.com/securego/gosec',
            'https://owasp.org/www-project-go-secure-coding-practices-guide/',
        ],
    },
};
// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================
/**
 * Get fix capability information for a tool
 * Uses the central ToolFixRegistry for accurate data
 */
function getFixCapabilityInfo(toolId) {
    const toolLower = toolId.toLowerCase();
    const capability = tool_fix_registry_1.toolFixRegistry.getToolCapability(toolLower);
    if (!capability) {
        // Unknown tool - assume Tier 3 (AI required)
        return {
            toolId,
            tier: 3,
            hasNativeFix: false,
            confidence: 50,
            safeForAutoApply: false,
            valueProposition: 'AI-generated fix suggestions available',
            remediationGuidance: 'Review the AI-generated fix and apply manually after verification',
        };
    }
    const valueProposition = getValueProposition(capability);
    const remediationGuidance = getRemediationGuidance(capability);
    return {
        toolId: capability.toolId,
        tier: capability.tier,
        hasNativeFix: capability.hasNativeFix,
        fixCommand: capability.fixCommand,
        fixerTool: capability.fixerTool,
        confidence: capability.confidence,
        safeForAutoApply: capability.safeForAutoApply,
        valueProposition,
        remediationGuidance,
    };
}
/**
 * Check if an issue group can be auto-fixed
 * Uses the ToolFixRegistry instead of hardcoded rules
 */
function isGroupAutoFixable(group) {
    var _a;
    const toolLower = ((_a = group.tool) === null || _a === void 0 ? void 0 : _a.toLowerCase()) || '';
    const capability = tool_fix_registry_1.toolFixRegistry.getToolCapability(toolLower);
    if (!capability) {
        // Unknown tool - check for common auto-fixable patterns
        return isCommonAutoFixablePattern(group.rule);
    }
    // Tier 1 tools with native fix are auto-fixable
    if (capability.tier === 1 && capability.hasNativeFix) {
        return true;
    }
    // Tier 2 tools with a dedicated fixer are auto-fixable
    if (capability.tier === 2 && capability.fixerTool) {
        return true;
    }
    // Tier 3 tools are NOT auto-fixable (AI required)
    return false;
}
/**
 * Check if an issue can be auto-fixed
 */
function isIssueAutoFixable(issue) {
    // Import helper functions from issue-grouping
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { isRecommendationOnlyTool, hasNativeFixSupport } = require('../utils/issue-grouping');
    // Create a minimal IssueGroup-like object for the check
    // We only need rule, tool, and severity for the registry lookup
    const toolLower = issue.tool.toLowerCase();
    const isRecommendation = isRecommendationOnlyTool(toolLower);
    const nativeFix = hasNativeFixSupport(toolLower);
    // Determine fix tier
    let fixTier = 3;
    if (isRecommendation)
        fixTier = 'recommendation';
    else if (nativeFix)
        fixTier = 1;
    else if (['pmd', 'spotbugs'].includes(toolLower))
        fixTier = 2;
    return isGroupAutoFixable({
        rule: issue.rule,
        tool: issue.tool,
        severity: issue.severity,
        category: issue.category,
        description: issue.message,
        count: 1,
        examples: [{ file: issue.file, line: issue.line || 0 }],
        // New required fields (Session 59)
        isRecommendationOnly: isRecommendation,
        hasNativeFix: nativeFix,
        fixTier: fixTier,
        aiAnalyzed: false,
        costSaved: 0,
    });
}
/**
 * Get enhanced guidance for scanner-only tools
 * Provides detailed information even when auto-fix isn't available
 */
function getScannerToolGuidance(toolId) {
    const toolLower = toolId.toLowerCase();
    return SCANNER_TOOL_GUIDANCE[toolLower];
}
/**
 * Get all scanner-only tools for a category
 */
function getScannerToolsForCategory(category) {
    return Object.values(SCANNER_TOOL_GUIDANCE).filter(guidance => guidance.category === category);
}
/**
 * Generate value section for scanner-only tools in reports
 * This ensures users understand what they get even without auto-fix
 */
function generateScannerValueSection(toolId, issueCount) {
    const guidance = getScannerToolGuidance(toolId);
    if (!guidance) {
        return `**${issueCount} issues detected** - AI-generated fix suggestions available for review`;
    }
    let section = `### ${guidance.tool} Findings (${issueCount} issues)\n\n`;
    section += `**Category:** ${guidance.category}\n\n`;
    section += `**What You Get:**\n`;
    for (const item of guidance.whatYouGet) {
        section += `- ✓ ${item}\n`;
    }
    section += '\n';
    section += `**How to Fix:**\n`;
    for (const item of guidance.howToFix) {
        section += `- ${item}\n`;
    }
    section += '\n';
    if (guidance.resources.length > 0) {
        section += `**Resources:**\n`;
        for (const resource of guidance.resources) {
            section += `- ${resource}\n`;
        }
        section += '\n';
    }
    return section;
}
/**
 * Get tier badge for display
 */
function getTierBadge(tier) {
    switch (tier) {
        case 1: return '🟢 Tier 1 (Auto-Fix)';
        case 2: return '🟡 Tier 2 (Fixer Tool)';
        case 3: return '🔴 Tier 3 (Manual/AI)';
        default: return '⚪ Unknown';
    }
}
/**
 * Get confidence level description
 */
function getConfidenceDescription(confidence) {
    if (confidence >= 90)
        return 'Very High - Safe for auto-apply';
    if (confidence >= 70)
        return 'High - Review recommended';
    if (confidence >= 50)
        return 'Medium - Manual verification needed';
    if (confidence >= 30)
        return 'Low - AI guidance only';
    return 'Very Low - Requires expert review';
}
// ============================================================================
// HELPER FUNCTIONS
// ============================================================================
function getValueProposition(capability) {
    if (capability.tier === 1 && capability.hasNativeFix) {
        return `Native auto-fix available with ${capability.confidence}% confidence`;
    }
    if (capability.tier === 2 && capability.fixerTool) {
        return `Can be fixed using ${capability.fixerTool}`;
    }
    // Tier 3 - emphasize what users DO get
    const guidance = SCANNER_TOOL_GUIDANCE[capability.toolId];
    if (guidance) {
        return `Detailed ${guidance.category.toLowerCase()} analysis with remediation guidance`;
    }
    return 'AI-generated fix suggestions with explanation';
}
function getRemediationGuidance(capability) {
    if (capability.tier === 1 && capability.fixCommand) {
        return `Run: \`${capability.fixCommand}\``;
    }
    if (capability.tier === 2 && capability.fixerTool) {
        return `Use ${capability.fixerTool} to apply fixes`;
    }
    const guidance = SCANNER_TOOL_GUIDANCE[capability.toolId];
    if (guidance && guidance.howToFix.length > 0) {
        return guidance.howToFix[0];
    }
    return 'Review the issue details and AI-generated fix suggestion';
}
function isCommonAutoFixablePattern(rule) {
    const ruleLower = (rule === null || rule === void 0 ? void 0 : rule.toLowerCase()) || '';
    // Common auto-fixable patterns
    const autoFixablePatterns = [
        'indent', 'whitespace', 'spacing', 'format',
        'tab', 'semicolon', 'quote', 'comma',
        'import-order', 'import/order', 'sort-imports',
    ];
    return autoFixablePatterns.some(pattern => ruleLower.includes(pattern));
}
// ============================================================================
// REPORT INTEGRATION
// ============================================================================
/**
 * Enhance issue with fix capability metadata
 * Call this before generating reports to enrich issues
 */
function enrichIssueWithFixCapability(issue) {
    const fixCapability = getFixCapabilityInfo(issue.tool);
    const scannerGuidance = getScannerToolGuidance(issue.tool);
    return {
        ...issue,
        fixCapability,
        scannerGuidance,
    };
}
/**
 * Get fix summary statistics for a set of issues
 */
function getFixSummaryStats(issues) {
    let tier1 = 0;
    let tier2 = 0;
    let tier3 = 0;
    for (const issue of issues) {
        const capability = getFixCapabilityInfo(issue.tool);
        switch (capability.tier) {
            case 1:
                tier1++;
                break;
            case 2:
                tier2++;
                break;
            case 3:
                tier3++;
                break;
        }
    }
    const total = issues.length;
    const autoFixable = tier1 + tier2;
    const autoFixPercentage = total > 0 ? Math.round((autoFixable / total) * 100) : 0;
    return {
        total,
        tier1AutoFix: tier1,
        tier2FixerTool: tier2,
        tier3AiRequired: tier3,
        autoFixPercentage,
    };
}
