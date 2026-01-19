"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.toolFixRegistry = exports.ToolFixRegistry = exports.TIER3_AI_REQUIRED = exports.TIER2_DEDICATED_FIXERS = exports.TIER1_NATIVE_FIXERS = void 0;
// ============================================================================
// TIER 1: TOOLS WITH NATIVE --fix FLAG
// ============================================================================
exports.TIER1_NATIVE_FIXERS = [
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
    // Performance - Ruff (Python) supports fix for PERF rules
    {
        toolId: 'ruff-perf',
        name: 'Ruff (PERF rules)',
        language: ['python'],
        tier: 1,
        hasNativeFix: true,
        fixCommand: 'ruff check --fix --select PERF',
        confidence: 90,
        categories: ['performance'],
        safeForAutoApply: true,
    },
];
// ============================================================================
// TIER 2: DEDICATED FIXER TOOLS
// ============================================================================
exports.TIER2_DEDICATED_FIXERS = [
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
    // ============================================================================
    // INFRASTRUCTURE AS CODE (IaC) TOOLS - Tier 2
    // ============================================================================
    {
        toolId: 'checkov',
        name: 'Checkov',
        language: ['terraform', 'kubernetes', 'cloudformation', 'dockerfile', 'helm', 'ansible'],
        tier: 2,
        hasNativeFix: true, // Partial - supports --fix for ~30% of checks
        fixCommand: 'checkov --fix',
        confidence: 70,
        categories: ['iac_security', 'infrastructure', 'cloud_security'],
        safeForAutoApply: false, // IaC changes should always be reviewed
    },
    // ============================================================================
    // PERFORMANCE TOOLS (Tier 2 - Dedicated Fixers)
    // ============================================================================
    // Python Performance
    {
        toolId: 'radon',
        name: 'Radon',
        language: ['python'],
        tier: 2,
        hasNativeFix: false,
        fixerTool: 'refactoring-ai', // Uses AI-based refactoring for complexity
        confidence: 60,
        categories: ['performance', 'complexity'],
        safeForAutoApply: false,
    },
    {
        toolId: 'memory-pattern-python',
        name: 'Python Memory Pattern Detector',
        language: ['python'],
        tier: 2,
        hasNativeFix: false,
        fixerTool: 'ruff', // Many memory patterns can be fixed by ruff rules
        confidence: 75,
        categories: ['performance', 'memory'],
        safeForAutoApply: false,
    },
    // Java Performance
    {
        toolId: 'pmd-perf',
        name: 'PMD Performance Rules',
        language: ['java'],
        tier: 2,
        hasNativeFix: false,
        fixerTool: 'sorald', // Sorald can fix some PMD performance issues
        confidence: 65,
        categories: ['performance', 'code_quality'],
        safeForAutoApply: false,
    },
    {
        toolId: 'memory-pattern-java',
        name: 'Java Memory Pattern Detector',
        language: ['java'],
        tier: 2,
        hasNativeFix: false,
        fixerTool: 'sorald',
        confidence: 60,
        categories: ['performance', 'memory'],
        safeForAutoApply: false,
    },
    // Go Performance
    {
        toolId: 'staticcheck-perf',
        name: 'staticcheck Performance Rules',
        language: ['go'],
        tier: 2,
        hasNativeFix: false,
        fixerTool: 'golangci-lint', // golangci-lint can fix some staticcheck issues
        confidence: 70,
        categories: ['performance'],
        safeForAutoApply: false,
    },
    {
        toolId: 'memory-pattern-go',
        name: 'Go Memory Pattern Detector',
        language: ['go'],
        tier: 2,
        hasNativeFix: false,
        fixerTool: 'golangci-lint',
        confidence: 65,
        categories: ['performance', 'memory'],
        safeForAutoApply: false,
    },
];
// ============================================================================
// TIER 3: AI-REQUIRED (No tool support)
// ============================================================================
exports.TIER3_AI_REQUIRED = [
    // ============================================================================
    // SECRET DETECTION TOOLS (Phase 1 Integration - Session 58)
    // These tools detect secrets but CANNOT auto-fix - secrets must be rotated
    // ============================================================================
    {
        toolId: 'gitleaks',
        name: 'Gitleaks',
        language: ['*'], // Language-agnostic - scans all files
        tier: 3,
        hasNativeFix: false,
        confidence: 0, // Cannot auto-fix secrets - they must be rotated manually
        categories: ['secrets', 'security', 'credentials'],
        safeForAutoApply: false,
    },
    {
        toolId: 'trufflehog',
        name: 'TruffleHog',
        language: ['*'], // Language-agnostic - scans all files
        tier: 3,
        hasNativeFix: false,
        confidence: 0, // Cannot auto-fix secrets - they must be rotated manually
        categories: ['secrets', 'security', 'credentials'],
        safeForAutoApply: false,
    },
    // ============================================================================
    // CONTAINER SECURITY TOOLS (Phase 1 Integration - Session 58)
    // These detect vulnerabilities but fixes require dependency updates
    // ============================================================================
    {
        toolId: 'trivy',
        name: 'Trivy',
        language: ['dockerfile', 'kubernetes', 'terraform', '*'],
        tier: 3,
        hasNativeFix: false,
        fixerTool: 'renovate', // Dependency updates can be handled by Renovate
        confidence: 40, // Medium-low - updating dependencies can break things
        categories: ['container_security', 'iac_security', 'dependencies', 'vulnerabilities'],
        safeForAutoApply: false,
    },
    {
        toolId: 'grype',
        name: 'Grype',
        language: ['*'], // Scans SBOMs and container images
        tier: 3,
        hasNativeFix: false,
        fixerTool: 'renovate', // Dependency updates can be handled by Renovate
        confidence: 40, // Medium-low - updating dependencies can break things
        categories: ['container_security', 'sbom', 'dependencies', 'vulnerabilities'],
        safeForAutoApply: false,
    },
    // ============================================================================
    // SECURITY TOOLS (Session 57)
    // ============================================================================
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
    // ============================================================================
    // PERFORMANCE TOOLS (Session 57 Part 3)
    // These are scanners/metrics tools - no auto-fix capability
    // ============================================================================
    {
        toolId: 'lighthouse',
        name: 'Lighthouse',
        language: ['javascript', 'typescript'],
        tier: 3,
        hasNativeFix: false,
        confidence: 30, // Low confidence - performance fixes are context-dependent
        categories: ['performance', 'web_vitals'],
        safeForAutoApply: false,
    },
    {
        toolId: 'bundle-analyzer',
        name: 'Webpack Bundle Analyzer',
        language: ['javascript', 'typescript'],
        tier: 3,
        hasNativeFix: false,
        confidence: 25, // Very low - bundle optimization is complex
        categories: ['performance', 'bundle_size'],
        safeForAutoApply: false,
    },
    {
        toolId: 'eslint-perf',
        name: 'ESLint Performance Plugin',
        language: ['javascript', 'typescript'],
        tier: 3,
        hasNativeFix: false,
        confidence: 50, // Medium - some patterns have clear fixes
        categories: ['performance', 'code_patterns'],
        safeForAutoApply: false,
    },
    // ============================================================================
    // ARCHITECTURE TOOLS (Session 57 Part 3)
    // These are analysis/detection tools - fixes require code restructuring
    // ============================================================================
    {
        toolId: 'madge',
        name: 'Madge',
        language: ['javascript', 'typescript'],
        tier: 3,
        hasNativeFix: false,
        confidence: 20, // Very low - circular deps require architectural changes
        categories: ['architecture', 'circular_dependency'],
        safeForAutoApply: false,
    },
    {
        toolId: 'dependency-cruiser',
        name: 'Dependency Cruiser',
        language: ['javascript', 'typescript'],
        tier: 3,
        hasNativeFix: false,
        confidence: 25, // Low - architecture rule violations need design changes
        categories: ['architecture', 'dependency_rules'],
        safeForAutoApply: false,
    },
    {
        toolId: 'ts-unused-exports',
        name: 'ts-unused-exports',
        language: ['typescript'],
        tier: 3,
        hasNativeFix: false,
        fixerTool: 'eslint', // ESLint can sometimes help with unused exports
        confidence: 60, // Medium-high - dead code removal is relatively safe
        categories: ['architecture', 'dead_code'],
        safeForAutoApply: false, // Still needs review - might break external consumers
    },
    // ============================================================================
    // JAVA ARCHITECTURE TOOLS (Session 57 Part 5)
    // ============================================================================
    {
        toolId: 'jdepend',
        name: 'JDepend',
        language: ['java'],
        tier: 3,
        hasNativeFix: false,
        confidence: 20, // Very low - package cycles require architectural refactoring
        categories: ['architecture', 'package_cycle', 'coupling', 'design_metrics'],
        safeForAutoApply: false,
    },
    // ============================================================================
    // PYTHON ARCHITECTURE TOOLS (Session 57 Part 4 & 5)
    // ============================================================================
    {
        toolId: 'pydeps',
        name: 'pydeps',
        language: ['python'],
        tier: 3,
        hasNativeFix: false,
        confidence: 25, // Low - circular dependencies require architectural changes
        categories: ['architecture', 'circular_dependency', 'dependency_analysis'],
        safeForAutoApply: false,
    },
    {
        toolId: 'import-linter',
        name: 'Import Linter',
        language: ['python'],
        tier: 3,
        hasNativeFix: false,
        confidence: 20, // Very low - layer violations require architectural refactoring
        categories: ['architecture', 'layer_violation', 'independence_violation'],
        safeForAutoApply: false,
    },
    // ============================================================================
    // GO ARCHITECTURE TOOLS (Session 57 Part 5)
    // ============================================================================
    {
        toolId: 'go-arch-lint',
        name: 'go-arch-lint',
        language: ['go'],
        tier: 3,
        hasNativeFix: false,
        confidence: 20, // Very low - architecture violations require design changes
        categories: ['architecture', 'dependency_rules', 'layer_violation'],
        safeForAutoApply: false,
    },
    // ============================================================================
    // RUST ARCHITECTURE TOOLS (Session 57 Part 5)
    // ============================================================================
    {
        toolId: 'cargo-modules',
        name: 'cargo-modules',
        language: ['rust'],
        tier: 3,
        hasNativeFix: false,
        confidence: 25, // Low - circular dependencies require module restructuring
        categories: ['architecture', 'circular_dependency', 'orphan_module'],
        safeForAutoApply: false,
    },
    // ============================================================================
    // RUBY ARCHITECTURE TOOLS (Session 57 Part 5)
    // ============================================================================
    {
        toolId: 'packwerk',
        name: 'Packwerk',
        language: ['ruby'],
        tier: 3,
        hasNativeFix: false,
        confidence: 30, // Low - boundary violations require package restructuring
        categories: ['architecture', 'dependency_violation', 'privacy_violation'],
        safeForAutoApply: false,
    },
    // ============================================================================
    // PHP ARCHITECTURE TOOLS (Session 57 Part 5)
    // ============================================================================
    {
        toolId: 'deptrac',
        name: 'Deptrac',
        language: ['php'],
        tier: 3,
        hasNativeFix: false,
        confidence: 25, // Low - layer violations require architecture refactoring
        categories: ['architecture', 'layer_violation', 'uncovered_dependency'],
        safeForAutoApply: false,
    },
];
// ============================================================================
// REGISTRY CLASS
// ============================================================================
class ToolFixRegistry {
    constructor() {
        this.tools = new Map();
        // Load all tools
        [...exports.TIER1_NATIVE_FIXERS, ...exports.TIER2_DEDICATED_FIXERS, ...exports.TIER3_AI_REQUIRED].forEach(tool => {
            this.tools.set(tool.toolId, tool);
        });
    }
    /**
     * Get fix capability for a tool
     */
    getToolCapability(toolId) {
        return this.tools.get(toolId);
    }
    /**
     * Get all tools for a language
     */
    getToolsForLanguage(language) {
        return Array.from(this.tools.values()).filter(tool => tool.language.includes(language));
    }
    /**
     * Get all Tier 1 tools (native --fix)
     */
    getTier1Tools() {
        return Array.from(this.tools.values()).filter(tool => tool.tier === 1);
    }
    /**
     * Get all Tier 2 tools (dedicated fixers)
     */
    getTier2Tools() {
        return Array.from(this.tools.values()).filter(tool => tool.tier === 2);
    }
    /**
     * Get all Tier 3 tools (AI required)
     */
    getTier3Tools() {
        return Array.from(this.tools.values()).filter(tool => tool.tier === 3);
    }
    /**
     * Check if tool supports auto-fix
     */
    supportsAutoFix(toolId) {
        var _a;
        const tool = this.tools.get(toolId);
        return (_a = tool === null || tool === void 0 ? void 0 : tool.hasNativeFix) !== null && _a !== void 0 ? _a : false;
    }
    /**
     * Get fix command for a tool
     */
    getFixCommand(toolId) {
        const tool = this.tools.get(toolId);
        return tool === null || tool === void 0 ? void 0 : tool.fixCommand;
    }
    /**
     * Get tier for a tool
     */
    getTier(toolId) {
        var _a;
        const tool = this.tools.get(toolId);
        return (_a = tool === null || tool === void 0 ? void 0 : tool.tier) !== null && _a !== void 0 ? _a : 3; // Default to AI if unknown
    }
    /**
     * Check if fix is safe for auto-apply
     */
    isSafeForAutoApply(toolId) {
        var _a;
        const tool = this.tools.get(toolId);
        return (_a = tool === null || tool === void 0 ? void 0 : tool.safeForAutoApply) !== null && _a !== void 0 ? _a : false;
    }
    /**
     * Get confidence score for a tool
     */
    getConfidence(toolId) {
        var _a;
        const tool = this.tools.get(toolId);
        return (_a = tool === null || tool === void 0 ? void 0 : tool.confidence) !== null && _a !== void 0 ? _a : 50;
    }
    /**
     * Get all tools by category
     */
    getToolsByCategory(category) {
        return Array.from(this.tools.values()).filter(tool => tool.categories.includes(category));
    }
    /**
     * Get summary statistics
     */
    getSummary() {
        const all = Array.from(this.tools.values());
        const byLanguage = {};
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
exports.ToolFixRegistry = ToolFixRegistry;
// Export singleton instance
exports.toolFixRegistry = new ToolFixRegistry();
