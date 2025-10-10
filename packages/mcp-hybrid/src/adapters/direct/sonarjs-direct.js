"use strict";
/**
 * SonarJS Direct Adapter
 * Provides additional code quality rules via ESLint plugin
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.sonarJSDirectAdapter = exports.SonarJSDirectAdapter = void 0;
const base_adapter_1 = require("./base-adapter");
const eslint_1 = require("eslint");
const path = __importStar(require("path"));
class SonarJSDirectAdapter extends base_adapter_1.DirectToolAdapter {
    constructor() {
        super(...arguments);
        this.id = 'sonarjs-direct';
        this.name = 'SonarJS Direct';
        this.version = '1.0.0';
        this.eslint = null;
        // SonarJS specific rules we want to focus on
        this.SONAR_RULES = {
            'sonarjs/cognitive-complexity': { threshold: 15, severity: 'high' },
            'sonarjs/no-duplicate-string': { threshold: 3, severity: 'medium' },
            'sonarjs/no-identical-functions': { severity: 'high' },
            'sonarjs/no-collapsible-if': { severity: 'low' },
            'sonarjs/no-redundant-jump': { severity: 'medium' },
            'sonarjs/no-unused-collection': { severity: 'high' },
            'sonarjs/no-useless-catch': { severity: 'medium' },
            'sonarjs/prefer-immediate-return': { severity: 'low' },
            'sonarjs/no-inverted-boolean-check': { severity: 'low' },
            'sonarjs/no-nested-switch': { severity: 'medium' },
            'sonarjs/no-nested-template-literals': { severity: 'low' },
            'sonarjs/no-extra-arguments': { severity: 'high' },
            'sonarjs/no-identical-conditions': { severity: 'high' },
            'sonarjs/no-identical-expressions': { severity: 'high' },
            'sonarjs/no-one-iteration-loop': { severity: 'medium' },
            'sonarjs/no-use-of-empty-return-value': { severity: 'high' },
            'sonarjs/non-existent-operator': { severity: 'critical' }
        };
        this.capabilities = [
            {
                name: 'cognitive-complexity',
                category: 'quality',
                languages: ['javascript', 'typescript'],
                fileTypes: ['.js', '.jsx', '.ts', '.tsx']
            },
            {
                name: 'code-duplication',
                category: 'quality',
                languages: ['javascript', 'typescript'],
                fileTypes: ['.js', '.jsx', '.ts', '.tsx']
            },
            {
                name: 'code-smell-detection',
                category: 'quality',
                languages: ['javascript', 'typescript'],
                fileTypes: ['.js', '.jsx', '.ts', '.tsx']
            }
        ];
        this.requirements = {
            minFiles: 1,
            executionMode: 'on-demand',
            timeout: 60000,
            authentication: {
                type: 'none',
                required: false
            }
        };
    }
    /**
     * Get health check command
     */
    getHealthCheckCommand() {
        return { cmd: 'npx', args: ['eslint', '--version'] };
    }
    /**
     * Check if tool can analyze given context
     */
    canAnalyze(context) {
        // Only for code quality agent
        if (context.agentRole !== 'codeQuality') {
            return false;
        }
        // Check for JS/TS files
        return context.pr.files.some(file => this.isJavaScriptOrTypeScript(file.path));
    }
    /**
     * Initialize ESLint with SonarJS plugin
     */
    async initializeESLint() {
        if (this.eslint)
            return;
        this.eslint = new eslint_1.ESLint({
            baseConfig: {
                plugins: ['sonarjs'],
                extends: ['plugin:sonarjs/recommended'],
                rules: this.buildSonarRules(),
                parserOptions: {
                    ecmaVersion: 2022,
                    sourceType: 'module',
                    ecmaFeatures: {
                        jsx: true
                    }
                }
            },
            // Don't include overrideConfigFile at all - let ESLint use default behavior
            fix: false
        });
    }
    /**
     * Build SonarJS rules configuration
     */
    buildSonarRules() {
        const rules = {};
        Object.entries(this.SONAR_RULES).forEach(([rule, config]) => {
            if (rule === 'sonarjs/cognitive-complexity') {
                rules[rule] = ['error', config.threshold];
            }
            else if (rule === 'sonarjs/no-duplicate-string') {
                // sonarjs/no-duplicate-string expects an object configuration
                rules[rule] = ['error', { threshold: config.threshold }];
            }
            else {
                rules[rule] = 'error';
            }
        });
        return rules;
    }
    /**
     * Execute SonarJS analysis
     */
    async analyze(context) {
        const startTime = Date.now();
        try {
            await this.initializeESLint();
            const findings = [];
            const issuesByType = new Map();
            let totalComplexity = 0;
            let complexFunctions = 0;
            // Analyze each JS/TS file
            for (const file of context.pr.files) {
                if (!this.isJavaScriptOrTypeScript(file.path)) {
                    continue;
                }
                try {
                    const results = await this.eslint.lintText(file.content, {
                        filePath: file.path
                    });
                    for (const result of results) {
                        for (const message of result.messages) {
                            // Only process SonarJS rules
                            if (!message.ruleId?.startsWith('sonarjs/')) {
                                continue;
                            }
                            // Track issue types
                            issuesByType.set(message.ruleId, (issuesByType.get(message.ruleId) || 0) + 1);
                            // Track complexity
                            if (message.ruleId === 'sonarjs/cognitive-complexity') {
                                totalComplexity++;
                                complexFunctions++;
                            }
                            // Create finding
                            const finding = this.createFinding(message, file.path);
                            findings.push(finding);
                        }
                    }
                }
                catch (error) {
                    console.warn(`Error analyzing ${file.path}:`, error);
                }
            }
            // Calculate metrics
            const metrics = this.calculateMetrics(findings, issuesByType, complexFunctions);
            return {
                success: true,
                toolId: this.id,
                executionTime: Date.now() - startTime,
                findings,
                metrics
            };
        }
        catch (error) {
            return {
                success: false,
                toolId: this.id,
                executionTime: Date.now() - startTime,
                error: {
                    code: 'SONARJS_FAILED',
                    message: error instanceof Error ? error.message : String(error),
                    recoverable: true
                }
            };
        }
    }
    /**
     * Create finding from ESLint message
     */
    createFinding(message, filePath) {
        const ruleConfig = this.SONAR_RULES[message.ruleId];
        const severity = this.mapSeverity(ruleConfig?.severity || 'medium');
        return {
            type: message.fatal ? 'issue' : 'suggestion',
            severity,
            category: 'quality',
            message: message.message,
            ruleId: message.ruleId || 'unknown',
            file: filePath,
            line: message.line,
            column: message.column,
            documentation: this.getRuleDocumentation(message.ruleId),
            autoFixable: !!message.fix,
            fix: message.fix ? {
                description: `Fix ${message.ruleId} issue`,
                changes: [{
                        file: filePath,
                        line: message.line,
                        oldText: '',
                        newText: ''
                    }]
            } : undefined
        };
    }
    /**
     * Map SonarJS severity to tool severity
     */
    mapSeverity(sonarSeverity) {
        switch (sonarSeverity) {
            case 'critical': return 'critical';
            case 'high': return 'high';
            case 'medium': return 'medium';
            case 'low': return 'low';
            default: return 'medium';
        }
    }
    /**
     * Get rule documentation
     */
    getRuleDocumentation(ruleId) {
        const docs = {
            'sonarjs/cognitive-complexity': `**Cognitive Complexity** measures how hard the code is to understand.

Functions with high cognitive complexity are difficult to maintain and test.

**How to fix:**
• Extract complex conditions into well-named functions
• Reduce nesting levels
• Simplify conditional logic
• Break down large functions`,
            'sonarjs/no-duplicate-string': `**Duplicated strings** make code harder to maintain.

When the same string literal appears multiple times, it should be extracted into a constant.

**How to fix:**
• Define constants for repeated strings
• Use configuration objects for related strings
• Consider using enums for string unions`,
            'sonarjs/no-identical-functions': `**Identical functions** violate the DRY principle.

Having multiple functions with the same implementation increases maintenance burden.

**How to fix:**
• Extract the common logic into a shared function
• Use function parameters to handle variations
• Consider using higher-order functions`,
            'sonarjs/no-unused-collection': `**Unused collections** indicate dead code or logic errors.

Collections that are created but never read from waste memory and confuse readers.

**How to fix:**
• Remove the unused collection
• If needed later, implement the missing logic
• Check if the collection should be returned or used`,
            'sonarjs/no-identical-conditions': `**Identical conditions** in if-else chains are logic errors.

This usually indicates a copy-paste error or incomplete refactoring.

**How to fix:**
• Review the logic and fix the conditions
• Remove duplicate branches
• Consolidate related conditions`,
            'sonarjs/no-use-of-empty-return-value': `**Using return value of void functions** is a logic error.

This indicates a misunderstanding of what the function returns.

**How to fix:**
• Check the function documentation
• Don't use the return value if function returns void
• If a value is needed, use a function that returns one`
        };
        return docs[ruleId] || `Rule: ${ruleId}\n\nThis SonarJS rule helps improve code quality and maintainability.`;
    }
    /**
     * Calculate metrics from analysis
     */
    calculateMetrics(findings, issuesByType, complexFunctions) {
        // Calculate code quality score
        const qualityScore = this.calculateQualityScore(findings);
        // Group findings by severity
        const severityCounts = {
            critical: findings.filter(f => f.severity === 'critical').length,
            high: findings.filter(f => f.severity === 'high').length,
            medium: findings.filter(f => f.severity === 'medium').length,
            low: findings.filter(f => f.severity === 'low').length
        };
        // Top issues
        const topIssues = Array.from(issuesByType.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([rule, count]) => ({ rule, count }));
        return {
            totalIssues: findings.length,
            codeQualityScore: qualityScore,
            severityDistribution: severityCounts,
            complexFunctions,
            topIssues,
            issueCategories: {
                complexity: issuesByType.get('sonarjs/cognitive-complexity') || 0,
                duplication: issuesByType.get('sonarjs/no-duplicate-string') || 0,
                bugs: findings.filter(f => f.ruleId && (f.ruleId.includes('no-use-of-empty-return-value') ||
                    f.ruleId.includes('non-existent-operator') ||
                    f.ruleId.includes('no-extra-arguments'))).length,
                codeSmells: findings.filter(f => f.ruleId && (f.ruleId.includes('no-collapsible-if') ||
                    f.ruleId.includes('prefer-immediate-return') ||
                    f.ruleId.includes('no-redundant-jump'))).length
            },
            fixableIssues: findings.filter(f => f.autoFixable).length
        };
    }
    /**
     * Calculate code quality score (0-10)
     */
    calculateQualityScore(findings) {
        if (findings.length === 0)
            return 10;
        let score = 10;
        // Deduct points based on severity
        findings.forEach(finding => {
            switch (finding.severity) {
                case 'critical':
                    score -= 1.0;
                    break;
                case 'high':
                    score -= 0.5;
                    break;
                case 'medium':
                    score -= 0.2;
                    break;
                case 'low':
                    score -= 0.1;
                    break;
            }
        });
        return Math.max(0, Math.round(score * 10) / 10);
    }
    /**
     * Check if file is JavaScript or TypeScript
     */
    isJavaScriptOrTypeScript(filePath) {
        const ext = path.extname(filePath).toLowerCase();
        return ['.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs'].includes(ext);
    }
    /**
     * Get tool metadata
     */
    getMetadata() {
        return {
            id: this.id,
            name: this.name,
            description: 'Advanced code quality rules for JavaScript/TypeScript via SonarJS ESLint plugin',
            author: 'CodeQual',
            homepage: 'https://github.com/SonarSource/eslint-plugin-sonarjs',
            documentationUrl: 'https://docs.codequal.com/tools/sonarjs',
            supportedRoles: ['codeQuality'],
            supportedLanguages: ['javascript', 'typescript'],
            supportedFrameworks: ['react', 'vue', 'angular', 'node', 'express', 'next'],
            tags: ['quality', 'complexity', 'duplication', 'bugs', 'code-smells', 'sonar'],
            securityVerified: true,
            lastVerified: new Date('2025-06-11')
        };
    }
}
exports.SonarJSDirectAdapter = SonarJSDirectAdapter;
// Export singleton instance
exports.sonarJSDirectAdapter = new SonarJSDirectAdapter();
//# sourceMappingURL=sonarjs-direct.js.map