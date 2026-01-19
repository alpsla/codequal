"use strict";
/**
 * AI-Fixer Agent
 *
 * Handles Tier 2 issues (<60% confidence) by:
 * 1. Using tool context (suggestions, patterns) as prep work
 * 2. Generating fix recommendations using AI
 * 3. Enriching issues with AI-generated fixes
 *
 * This agent serves as the bridge between tool validators and role agents.
 * For issues where tool fixers can't auto-fix with high confidence,
 * this agent uses AI to generate fix recommendations.
 *
 * Architecture:
 * - Receives issues from SupabaseFixRouter with <60% confidence
 * - Queries Supabase for AI model configuration (no hardcoded models)
 * - Uses tool context to guide AI fix generation
 * - Outputs enriched issues ready for Role Agents
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AIFixerAgent = void 0;
exports.getAIFixerAgent = getAIFixerAgent;
exports.resetAIFixerAgent = resetAIFixerAgent;
exports.processIssuesWithAIFixer = processIssuesWithAIFixer;
const supabase_js_1 = require("@supabase/supabase-js");
const openai_1 = __importDefault(require("openai"));
const fix_pattern_registry_1 = require("../fix-pattern-registry");
const kb_fix_applicator_1 = require("../state/kb-fix-applicator"); // SESSION 90: KB bypass for cost savings
const openrouter_key_manager_1 = require("../../two-branch/services/openrouter-key-manager");
// ============================================================================
// SESSION 49: Corrupted response detection
// ============================================================================
const CORRUPTED_PHRASES = [
    // AI asking for context
    'could you please provide',
    'i need to see',
    'please provide the',
    'can you share',
    'i would need',
    'the complete code',
    'the actual code',
    'provide the complete',
    'share the code',
    'need more context',
    'without seeing',
    'cannot provide a fix',
    'unable to provide',
    'need to see the',
    'please share',
    'can you provide',
    // BUG-LSP-001: Template-style descriptions instead of actual code
    'should be:', // Template pattern: "X should be: Y"
    'change to:', // Template pattern: "Change X to: Y"
    'replace with:', // Template pattern: "Replace X with: Y"
    'instead of:', // Template pattern: "Use X instead of: Y"
    'the fix is:', // Template pattern: "The fix is: X"
    'wasn\'t provided', // AI complaining about missing context
    'code snippet', // AI asking for context
];
function isCorruptedResponse(content) {
    const lowerContent = content.toLowerCase();
    return CORRUPTED_PHRASES.some(phrase => lowerContent.includes(phrase));
}
// ============================================================================
// AI-FIXER AGENT
// ============================================================================
class AIFixerAgent {
    constructor(options) {
        var _a;
        this.keyManager = null;
        this.modelCache = new Map();
        this.fixerVerifier = null;
        // SESSION 94: Always auto-learn from successful fixes
        // When AI successfully fixes an issue and validation passes,
        // the pattern is automatically added to KB for future reuse
        this.submitToRegistry = true;
        // SESSION 49: Retry configuration
        this.maxRetries = 2;
        this.retryStats = { total: 0, retried: 0, succeeded: 0 };
        // ==========================================================================
        // SESSION 90: KB BYPASS
        // ==========================================================================
        /**
         * Result of KB bypass attempt
         */
        this.kbBypassResult = {
            enrichedIssue: null,
            reason: 'not_checked',
        };
        // SESSION 94: Default to true - always learn from successful fixes
        this.submitToRegistry = (_a = options === null || options === void 0 ? void 0 : options.submitToRegistry) !== null && _a !== void 0 ? _a : true;
        if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
            throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set');
        }
        this.supabase = (0, supabase_js_1.createClient)(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
        // Use OpenRouterKeyManager for multi-key rotation
        try {
            this.keyManager = new openrouter_key_manager_1.OpenRouterKeyManager();
            console.log('[AIFixer] Using multi-key rotation with OpenRouterKeyManager');
        }
        catch (e) {
            console.log('[AIFixer] OpenRouterKeyManager not available, will use single key');
        }
    }
    /**
     * Execute OpenRouter API call with automatic key rotation
     */
    async executeOpenRouterCall(fn) {
        // If key manager is available, use it for automatic fallback
        if (this.keyManager) {
            return this.keyManager.executeWithFallback(fn, 'AI-Fixer');
        }
        // Fallback to single key
        const apiKey = process.env.OPENROUTER_API_KEY || '';
        const client = new openai_1.default({
            apiKey,
            baseURL: 'https://openrouter.ai/api/v1',
            defaultHeaders: {
                'HTTP-Referer': 'https://codequal.com',
                'X-Title': 'CodeQual AI-Fixer Agent',
            },
        });
        return fn(client);
    }
    // ==========================================================================
    // MAIN PROCESSING
    // ==========================================================================
    /**
     * Process a single issue and generate AI fix recommendation
     *
     * SESSION 90: Check KB bypass first to save costs
     * If KB has high-confidence pattern (>=95% success rate or tool-validated),
     * skip AI entirely and apply pattern directly.
     */
    async processIssue(issue) {
        const startTime = Date.now();
        // SESSION 90: Check if we can bypass AI using KB
        const bypassResult = await this.tryKBBypass(issue);
        if (bypassResult.enrichedIssue) {
            console.log(`[AI-Fixer] 💰 KB bypass for ${issue.ruleId} - saved AI call (${bypassResult.reason})`);
            (0, kb_fix_applicator_1.recordKBBypass)(issue.ruleId, false); // false = AI was NOT used
            return bypassResult.enrichedIssue;
        }
        // Get AI model for this language
        const model = await this.getModelForLanguage(issue.language);
        console.log(`[AI-Fixer] Using model ${model} for ${issue.language}/${issue.ruleId}`);
        // Generate fix using AI with tool context
        const recommendation = await this.generateFixRecommendation(issue, model);
        // Record that AI was used
        (0, kb_fix_applicator_1.recordKBBypass)(issue.ruleId, true); // true = AI was used
        // SESSION 96: Persist successful fixes to KB for future reuse
        if (this.submitToRegistry && recommendation.confidence >= 70) {
            try {
                const submitResult = await this.submitFixToRegistry(issue, recommendation);
                if (submitResult.submitted) {
                    console.log(`[AI-Fixer] Pattern persisted for ${issue.ruleId}: ${submitResult.patternStatus}`);
                }
            }
            catch (e) {
                // Non-blocking - don't fail the fix if persistence fails
                console.log(`[AI-Fixer] Pattern submission skipped (non-blocking): ${e.message}`);
            }
        }
        return {
            ...issue,
            tier: 2,
            fixRecommendation: recommendation,
            aiProcessedAt: new Date(),
        };
    }
    /**
     * Process a batch of issues in parallel
     *
     * IMPORTANT: Each issue needs its own AI call because:
     * - Same rule in different code contexts needs different fixes
     * - CloseResource for InputStream vs Channel vs Socket need different code
     * - Pattern matching handles generic fixes; AI handles context-specific ones
     *
     * SESSION 77 REVERTED: Grouping optimization was flawed - it assumed
     * same rule = same fix, but different code contexts need different fixes.
     */
    async processBatch(issues, options = {}) {
        var _a, _b;
        const startTime = Date.now();
        const parallel = options.parallel || 5;
        const enrichedIssues = [];
        const failed = [];
        let totalCost = 0;
        console.log(`[AI-Fixer] Processing ${issues.length} issues (parallel: ${parallel})`);
        // Process issues in parallel batches
        for (let i = 0; i < issues.length; i += parallel) {
            const batch = issues.slice(i, i + parallel);
            const results = await Promise.allSettled(batch.map(async (issue) => {
                if (options.verbose) {
                    console.log(`[AI-Fixer] Processing: ${issue.ruleId} in ${issue.file}:${issue.line}`);
                }
                const enriched = await this.processIssue(issue);
                return { enriched, cost: enriched.fixRecommendation.cost || 0 };
            }));
            for (let j = 0; j < results.length; j++) {
                const result = results[j];
                const issue = batch[j];
                if (result.status === 'fulfilled') {
                    enrichedIssues.push(result.value.enriched);
                    totalCost += result.value.cost;
                    if (options.verbose) {
                        console.log(`[AI-Fixer] ✅ Fixed: ${issue.ruleId} (confidence: ${result.value.enriched.fixRecommendation.confidence}%)`);
                    }
                }
                else {
                    failed.push({
                        issue,
                        error: ((_a = result.reason) === null || _a === void 0 ? void 0 : _a.message) || 'Unknown error',
                    });
                    if (options.verbose) {
                        console.log(`[AI-Fixer] ❌ Failed: ${issue.ruleId} - ${(_b = result.reason) === null || _b === void 0 ? void 0 : _b.message}`);
                    }
                }
            }
        }
        // Calculate average confidence
        const avgConfidence = enrichedIssues.length > 0
            ? enrichedIssues.reduce((sum, i) => sum + i.fixRecommendation.confidence, 0) / enrichedIssues.length
            : 0;
        console.log(`[AI-Fixer] Batch complete: ${enrichedIssues.length}/${issues.length} fixed, ` +
            `${issues.length} AI calls, avg confidence: ${Math.round(avgConfidence)}%`);
        // SESSION 91: Log KB bypass metrics at end of batch
        const metrics = (0, kb_fix_applicator_1.getKBBypassMetrics)();
        if (metrics.kbAppliedCount > 0 || metrics.aiAppliedCount > 0) {
            console.log(`[AI-Fixer] KB Bypass Summary: ${metrics.kbAppliedCount} KB, ` +
                `${metrics.aiAppliedCount} AI, saved $${metrics.kbBypassSavings.toFixed(4)}`);
        }
        return {
            enrichedIssues,
            failed,
            summary: {
                total: issues.length,
                processed: enrichedIssues.length,
                failed: failed.length,
                totalCost,
                avgConfidence: Math.round(avgConfidence),
                processingTimeMs: Date.now() - startTime,
            },
        };
    }
    /**
     * Try to bypass AI using KB patterns
     *
     * Returns object with enrichedIssue if bypass is allowed (success rate >= 95% or tool-validated)
     * Returns object with null enrichedIssue if AI is needed
     */
    async tryKBBypass(issue) {
        var _a, _b, _c, _d, _e;
        try {
            const bypassCheck = await (0, kb_fix_applicator_1.checkKBBypass)(issue.ruleId, issue.language, issue.validatorToolId, issue.codeContext);
            if (!bypassCheck.canBypass) {
                return { enrichedIssue: null, reason: bypassCheck.reason };
            }
            // KB bypass is allowed - create EnrichedIssue without AI call
            const fixCode = bypassCheck.fixCode || ((_c = (_b = (_a = bypassCheck.guidance) === null || _a === void 0 ? void 0 : _a.correctPatterns) === null || _b === void 0 ? void 0 : _b[0]) === null || _c === void 0 ? void 0 : _c.example) || '';
            if (!fixCode) {
                console.log(`[AI-Fixer] KB bypass allowed but no fix code available for ${issue.ruleId}`);
                return { enrichedIssue: null, reason: 'no_fix_code' };
            }
            const recommendation = {
                fix: `KB pattern applied for ${issue.ruleId}`,
                correctedCode: fixCode,
                explanation: `Fix applied from knowledge base (${bypassCheck.reason}). ` +
                    `Success rate: ${bypassCheck.confidence}%, no AI call needed.`,
                bestPractices: ((_e = (_d = bypassCheck.guidance) === null || _d === void 0 ? void 0 : _d.correctPatterns) === null || _e === void 0 ? void 0 : _e.map(p => p.pattern)) || [],
                confidence: bypassCheck.confidence,
                model: 'kb-bypass', // Indicate this came from KB, not AI
                cost: 0, // No AI cost
                usage: {
                    promptTokens: 0,
                    completionTokens: 0,
                    totalTokens: 0,
                },
            };
            return {
                enrichedIssue: {
                    ...issue,
                    tier: 2,
                    fixRecommendation: recommendation,
                    aiProcessedAt: new Date(),
                },
                reason: bypassCheck.reason,
            };
        }
        catch (error) {
            console.warn(`[AI-Fixer] KB bypass check failed: ${error.message}`);
            return { enrichedIssue: null, reason: 'error' };
        }
    }
    // ==========================================================================
    // AI FIX GENERATION
    // ==========================================================================
    /**
     * Generate fix recommendation using AI with tool context
     * SESSION 49: Added retry logic for corrupted responses
     * SESSION 50: Use OpenRouterKeyManager for multi-key rotation
     */
    async generateFixRecommendation(issue, model) {
        var _a, _b, _c, _d, _e;
        this.retryStats.total++;
        // SESSION 80: Fetch knowledge base guidance for this rule
        let knowledgeBaseGuidance = '';
        try {
            knowledgeBaseGuidance = await (0, fix_pattern_registry_1.formatGuidanceForPrompt)(issue.ruleId, issue.language, issue.validatorToolId);
            if (knowledgeBaseGuidance) {
                console.log(`[AI-Fixer] Found knowledge base guidance for ${issue.ruleId}`);
            }
        }
        catch (e) {
            console.log(`[AI-Fixer] Knowledge base lookup failed: ${e.message}`);
        }
        for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
            const systemPrompt = this.buildSystemPrompt(issue, attempt > 1, knowledgeBaseGuidance);
            const userPrompt = this.buildUserPrompt(issue, attempt > 1);
            try {
                // Use key manager with automatic fallback if available
                const response = await this.executeOpenRouterCall(async (client) => {
                    return client.chat.completions.create({
                        model,
                        messages: [
                            { role: 'system', content: systemPrompt },
                            { role: 'user', content: userPrompt },
                        ],
                        temperature: attempt === 1 ? 0.3 : 0.1,
                        max_tokens: 2500,
                    });
                });
                const content = ((_b = (_a = response.choices[0]) === null || _a === void 0 ? void 0 : _a.message) === null || _b === void 0 ? void 0 : _b.content) || '';
                // SESSION 49: Check for corrupted response
                if (isCorruptedResponse(content)) {
                    console.warn(`[AI-Fixer] Corrupted response on attempt ${attempt}/${this.maxRetries} for ${issue.ruleId} - AI asked for context`);
                    if (attempt < this.maxRetries) {
                        this.retryStats.retried++;
                        console.log(`[AI-Fixer] Retrying with stronger prompt...`);
                        continue; // Retry with stronger prompt
                    }
                    // Session 59: All retries failed - return manual review recommendation
                    console.error(`[AI-Fixer] All ${this.maxRetries} attempts returned corrupted responses`);
                    return this.buildManualReviewRecommendation(issue, model, 'CORRUPTED_RESPONSE');
                }
                const parsed = this.parseAIResponse(content, issue);
                // Calculate usage
                const usage = {
                    promptTokens: ((_c = response.usage) === null || _c === void 0 ? void 0 : _c.prompt_tokens) || 0,
                    completionTokens: ((_d = response.usage) === null || _d === void 0 ? void 0 : _d.completion_tokens) || 0,
                    totalTokens: ((_e = response.usage) === null || _e === void 0 ? void 0 : _e.total_tokens) || 0,
                };
                // Estimate cost (varies by model)
                const cost = this.estimateCost(model, usage);
                if (attempt > 1) {
                    this.retryStats.succeeded++;
                    console.log(`[AI-Fixer] Retry succeeded on attempt ${attempt}`);
                }
                return {
                    ...parsed,
                    confidence: this.calculateConfidence(parsed, issue),
                    model,
                    cost,
                    usage,
                };
            }
            catch (error) {
                console.error(`[AI-Fixer] Error on attempt ${attempt}:`, error.message);
                // Key rotation is now handled by OpenRouterKeyManager.executeWithFallback
                if (attempt < this.maxRetries) {
                    this.retryStats.retried++;
                    continue;
                }
                // Session 59: Return manual review recommendation with structured guidance
                return this.buildManualReviewRecommendation(issue, model, 'AI_FIX_FAILED', error.message);
            }
        }
        // Should not reach here, but TypeScript needs this
        return this.buildManualReviewRecommendation(issue, model, 'COMPLEX_ISSUE');
    }
    /**
     * SESSION 59: Build manual review recommendation when AI fix generation fails
     * Provides structured guidance similar to recommendation-only categories
     */
    buildManualReviewRecommendation(issue, model, reason, errorMessage) {
        const tool = issue.validatorToolId.toLowerCase();
        // Generate tool-specific documentation links
        const documentationLinks = this.getDocumentationLinks(tool, issue.ruleId);
        // Generate remediation steps based on issue type and tool
        const remediationSteps = this.generateRemediationSteps(issue);
        // Map severity to risk level
        const riskLevel = this.mapSeverityToRisk(issue.severity);
        // Estimate effort based on issue complexity
        const estimatedEffort = this.estimateFixEffort(issue);
        // Build comprehensive issue description
        const issueDescription = {
            what: `${issue.ruleId} violation detected by ${issue.validatorToolId}`,
            why: issue.message || `This issue may impact code ${this.getImpactArea(tool)}`,
            causes: this.getCommonCauses(tool, issue.ruleId),
            impact: this.getImpactDescription(issue.severity, tool),
        };
        return {
            fix: `Manual review required for ${issue.ruleId}`,
            correctedCode: `// Manual fix required for ${issue.ruleId}
// Location: ${issue.file}:${issue.line}
//
// Follow the remediation steps below to fix this issue.
// See documentation links for detailed guidance.`,
            explanation: errorMessage
                ? `AI could not generate an automatic fix: ${errorMessage}. Please follow the manual remediation steps.`
                : 'AI could not generate an automatic fix after multiple attempts. Please follow the manual remediation steps.',
            issueDescription,
            bestPractices: [
                `Review ${issue.validatorToolId} documentation for ${issue.ruleId}`,
                'Understand the security/quality implications before fixing',
                'Test the fix in a safe environment first',
                'Consider adding tests to prevent regression',
                'Document any architectural decisions made'
            ],
            confidence: 0, // Zero confidence - requires manual review
            model,
            manualReview: {
                required: true,
                reason,
                remediationSteps,
                documentationLinks,
                riskLevel,
                estimatedEffort,
            },
        };
    }
    /**
     * Get documentation links for a tool and rule
     */
    getDocumentationLinks(tool, ruleId) {
        const links = [];
        // Tool-specific documentation
        const toolDocs = {
            eslint: `https://eslint.org/docs/rules/${ruleId}`,
            'typescript-eslint': `https://typescript-eslint.io/rules/${ruleId.replace('@typescript-eslint/', '')}`,
            semgrep: `https://semgrep.dev/r?q=${encodeURIComponent(ruleId)}`,
            bandit: `https://bandit.readthedocs.io/en/latest/plugins/`,
            ruff: `https://docs.astral.sh/ruff/rules/${ruleId}`,
            pylint: `https://pylint.readthedocs.io/en/latest/user_guide/messages/messages_list.html`,
            checkstyle: `https://checkstyle.sourceforge.io/checks.html`,
            spotbugs: `https://spotbugs.readthedocs.io/en/stable/bugDescriptions.html`,
            pmd: `https://pmd.github.io/latest/pmd_rules_java.html`,
        };
        if (toolDocs[tool]) {
            links.push(toolDocs[tool]);
        }
        // Add OWASP reference for security issues
        if (this.isSecurityRule(ruleId, tool)) {
            links.push('https://owasp.org/www-project-top-ten/');
        }
        // Add CWE reference if applicable
        const cweMatch = ruleId.match(/CWE-(\d+)/i);
        if (cweMatch) {
            links.push(`https://cwe.mitre.org/data/definitions/${cweMatch[1]}.html`);
        }
        return links.length > 0 ? links : [`Search: "${tool} ${ruleId} fix"`];
    }
    /**
     * Generate step-by-step remediation guidance
     */
    generateRemediationSteps(issue) {
        const tool = issue.validatorToolId.toLowerCase();
        const steps = [];
        // Step 1: Understand the issue
        steps.push(`1. Review the issue at ${issue.file}:${issue.line}`);
        steps.push(`2. Understand why ${issue.ruleId} was triggered: ${issue.message || 'See rule documentation'}`);
        // Tool-specific steps
        if (tool === 'eslint' || tool === 'typescript-eslint') {
            steps.push('3. Check if the issue can be auto-fixed: npx eslint --fix <file>');
            steps.push('4. If auto-fix doesn\'t work, manually apply the recommended pattern');
        }
        else if (tool === 'semgrep') {
            steps.push('3. Review the Semgrep rule pattern and recommended fix');
            steps.push('4. Apply the secure coding pattern from the rule documentation');
        }
        else if (tool === 'bandit' || tool === 'ruff') {
            steps.push('3. For Python security issues, review secure coding practices');
            steps.push('4. Replace insecure patterns with recommended alternatives');
        }
        else if (tool === 'checkstyle' || tool === 'spotbugs' || tool === 'pmd') {
            steps.push('3. For Java issues, check IDE quick-fix suggestions');
            steps.push('4. Apply the fix following Java best practices');
        }
        else {
            steps.push('3. Review the tool documentation for fix guidance');
            steps.push('4. Apply the recommended fix pattern');
        }
        // Common final steps
        steps.push('5. Verify the fix doesn\'t break existing functionality');
        steps.push('6. Run tests to ensure no regressions');
        return steps;
    }
    /**
     * Map severity to risk level
     * Handles both standard (critical/high/medium/low) and legacy (error/warning/info) formats
     */
    mapSeverityToRisk(severity) {
        const sev = severity.toLowerCase();
        // Standard severity levels
        if (sev === 'critical')
            return 'critical';
        if (sev === 'high')
            return 'high';
        if (sev === 'medium')
            return 'medium';
        if (sev === 'low')
            return 'low';
        // Legacy severity levels (error/warning/info)
        if (sev === 'error')
            return 'critical';
        if (sev === 'warning')
            return 'high';
        if (sev === 'info')
            return 'low';
        return 'medium'; // Default
    }
    /**
     * Estimate fix effort based on issue complexity
     */
    estimateFixEffort(issue) {
        const tool = issue.validatorToolId.toLowerCase();
        // Style issues are usually trivial
        if (['checkstyle', 'prettier', 'black'].includes(tool)) {
            return 'trivial';
        }
        // Security issues require more effort
        if (this.isSecurityRule(issue.ruleId, tool)) {
            return issue.severity === 'critical' || issue.severity === 'high'
                ? 'significant'
                : 'moderate';
        }
        // Quality issues are usually minor to moderate
        return 'minor';
    }
    /**
     * Check if a rule is security-related
     */
    isSecurityRule(ruleId, tool) {
        const securityTools = ['bandit', 'semgrep', 'gosec', 'brakeman'];
        if (securityTools.includes(tool))
            return true;
        const securityKeywords = ['security', 'injection', 'xss', 'csrf', 'auth', 'crypto', 'secret', 'sql'];
        return securityKeywords.some(kw => ruleId.toLowerCase().includes(kw));
    }
    /**
     * Get impact area based on tool type
     */
    getImpactArea(tool) {
        const impactAreas = {
            bandit: 'security and vulnerability exposure',
            semgrep: 'security, quality, or best practices',
            eslint: 'code quality and maintainability',
            checkstyle: 'code style and readability',
            spotbugs: 'potential bugs and code quality',
            pmd: 'code quality and potential issues',
            ruff: 'Python code quality and style',
            pylint: 'Python code quality and standards',
        };
        return impactAreas[tool] || 'code quality';
    }
    /**
     * Get common causes for issue type
     */
    getCommonCauses(tool, ruleId) {
        // Generic causes that apply to most issues
        return [
            'Code pattern doesn\'t follow best practices',
            'Legacy code that predates current standards',
            'Copy-paste code that wasn\'t properly reviewed',
        ];
    }
    /**
     * Get impact description based on severity
     * Handles both standard (critical/high/medium/low) and legacy (error/warning/info) formats
     */
    getImpactDescription(severity, _tool) {
        const sev = severity.toLowerCase();
        if (sev === 'critical' || sev === 'error') {
            return 'Critical issue that may cause security vulnerabilities, crashes, or data loss if not addressed';
        }
        if (sev === 'high' || sev === 'warning') {
            return 'Important issue that should be fixed to maintain code quality and prevent potential problems';
        }
        return 'Minor issue that improves code quality when fixed but may not cause immediate problems';
    }
    /**
     * Build system prompt for AI
     * SESSION 49: Added isRetry parameter for stronger prompt on retry
     * SESSION 80: Added knowledgeBaseGuidance for pattern-specific guidance
     */
    buildSystemPrompt(issue, isRetry = false, knowledgeBaseGuidance = '') {
        var _a, _b, _c;
        // SESSION 49: Critical constraint to prevent corrupted responses
        const neverAskConstraint = isRetry
            ? `CRITICAL - YOU MUST NEVER:
- Ask for more code or context
- Say "I need to see", "please provide", "could you share"
- Request any additional information
- State that you cannot provide a fix

YOU MUST ALWAYS:
- Work with the code provided
- Generate a valid fix based on the rule documentation
- Make reasonable assumptions if context is limited
- Output valid JSON with correctedCode field`
            : `IMPORTANT:
- Work with the code provided
- Never ask for more context
- Generate a fix based on rule documentation`;
        // SESSION 80: Include knowledge base guidance if available
        const guidanceSection = knowledgeBaseGuidance
            ? `CRITICAL FIX GUIDANCE (from knowledge base - MUST follow):
${knowledgeBaseGuidance}`
            : '';
        return `You are an expert code fixer. Generate precise, compilable fixes for code issues.

${neverAskConstraint}

CONTEXT:
- Language: ${issue.language}
- Validator Tool: ${issue.validatorToolId}
- Rule: ${issue.ruleId}
- Severity: ${issue.severity}

${guidanceSection}

${((_a = issue.toolContext) === null || _a === void 0 ? void 0 : _a.toolSuggestion)
            ? `TOOL SUGGESTION (use as guidance):
${issue.toolContext.toolSuggestion}`
            : ''}

${((_b = issue.toolContext) === null || _b === void 0 ? void 0 : _b.recommendedPattern)
            ? `RECOMMENDED PATTERN:
${issue.toolContext.recommendedPattern}`
            : ''}

${((_c = issue.toolContext) === null || _c === void 0 ? void 0 : _c.bestPractices)
            ? `BEST PRACTICES:
${issue.toolContext.bestPractices}`
            : ''}

OUTPUT FORMAT (JSON only, no explanation outside JSON):
{
  "fix": "Step-by-step description of the fix",
  "correctedCode": "The corrected code that replaces the problematic code",
  "explanation": "Brief explanation of why this fix works",
  "issueDescription": {
    "what": "What is this issue (2-3 sentences, rule-specific)",
    "why": "Why it matters (2-3 sentences with consequences)",
    "causes": ["Cause 1", "Cause 2", "Cause 3"],
    "impact": "Impact if not fixed (2-3 sentences)"
  },
  "bestPractices": ["Best practice 1", "Best practice 2", "Best practice 3"]
}

CRITICAL: Output ONLY valid JSON. No markdown, no explanation text.`;
    }
    /**
     * Build user prompt with issue details
     * SESSION 49: Added isRetry parameter for more explicit instruction on retry
     */
    buildUserPrompt(issue, isRetry = false) {
        const instruction = isRetry
            ? `Generate a fix NOW. Do NOT ask for more information. Output JSON with correctedCode.`
            : `Provide the fix as JSON.`;
        return `Fix this ${issue.severity} issue:

FILE: ${issue.file}
LINE: ${issue.line}
RULE: ${issue.ruleId}
MESSAGE: ${issue.message}

${issue.codeContext
            ? `CODE CONTEXT:
\`\`\`${issue.language}
${issue.codeContext}
\`\`\``
            : 'No code context available - generate a generic fix pattern based on rule documentation.'}

${instruction}`;
    }
    /**
     * Parse AI response into structured recommendation
     */
    parseAIResponse(content, issue) {
        // Clean response
        let cleaned = content.trim();
        // Remove markdown code blocks
        cleaned = cleaned.replace(/```json\s*/gi, '');
        cleaned = cleaned.replace(/```\s*/gi, '');
        // Try to parse JSON
        try {
            // Find JSON object
            const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                const parsed = JSON.parse(jsonMatch[0]);
                return {
                    fix: parsed.fix || 'Fix not generated',
                    correctedCode: parsed.correctedCode || issue.codeContext || '',
                    explanation: parsed.explanation || parsed.fix || '',
                    issueDescription: parsed.issueDescription,
                    bestPractices: parsed.bestPractices || [],
                };
            }
        }
        catch (e) {
            // JSON parsing failed
        }
        // Fallback: extract what we can from text
        return {
            fix: cleaned.length > 500 ? cleaned.substring(0, 500) : cleaned,
            correctedCode: issue.codeContext || '// Fix required',
            explanation: 'AI response could not be parsed as JSON',
            bestPractices: [],
        };
    }
    /**
     * Calculate confidence based on AI response quality
     */
    calculateConfidence(recommendation, issue) {
        var _a, _b;
        let confidence = 60; // Base confidence for AI fix
        // Boost if we have corrected code
        if (recommendation.correctedCode &&
            recommendation.correctedCode !== issue.codeContext) {
            confidence += 10;
        }
        // Boost if we have structured issue description
        if ((_a = recommendation.issueDescription) === null || _a === void 0 ? void 0 : _a.what) {
            confidence += 5;
        }
        // Boost if we have best practices
        if (recommendation.bestPractices.length > 0) {
            confidence += 5;
        }
        // Boost if tool provided suggestions (used as context)
        if ((_b = issue.toolContext) === null || _b === void 0 ? void 0 : _b.toolSuggestion) {
            confidence += 10;
        }
        // Cap at 90% (only tool fixers should hit 95%+)
        return Math.min(90, confidence);
    }
    // ==========================================================================
    // MODEL CONFIGURATION
    // ==========================================================================
    /**
     * Get AI model for language from Supabase
     * Models are configured via quarterly research, not hardcoded
     */
    async getModelForLanguage(language) {
        // Check cache
        if (this.modelCache.has(language)) {
            return this.modelCache.get(language);
        }
        try {
            const { data, error } = await this.supabase
                .from('model_configurations')
                .select('primary_model')
                .eq('role', 'ai_fixer')
                .eq('language', language)
                .single();
            if (!error && (data === null || data === void 0 ? void 0 : data.primary_model)) {
                this.modelCache.set(language, data.primary_model);
                return data.primary_model;
            }
        }
        catch (e) {
            // Query failed
        }
        // Fallback to generic model if no language-specific config
        const fallback = 'google/gemini-2.0-flash-001';
        console.warn(`[AI-Fixer] No model config for ${language}, using fallback: ${fallback}`);
        return fallback;
    }
    /**
     * Estimate cost based on model and usage
     */
    estimateCost(model, usage) {
        // Approximate costs per 1K tokens (2025 pricing)
        const pricing = {
            'google/gemini-2.0-flash-001': { input: 0.00015, output: 0.0006 },
            'anthropic/claude-sonnet-4-20250514': { input: 0.003, output: 0.015 },
            'openai/gpt-4o': { input: 0.005, output: 0.015 },
            'deepseek/deepseek-coder': { input: 0.00014, output: 0.00028 },
        };
        const modelPricing = pricing[model] || { input: 0.001, output: 0.002 };
        return ((usage.promptTokens / 1000) * modelPricing.input +
            (usage.completionTokens / 1000) * modelPricing.output);
    }
    // ==========================================================================
    // UTILITY METHODS
    // ==========================================================================
    /**
     * Clear model cache (call after configuration updates)
     */
    clearModelCache() {
        this.modelCache.clear();
    }
    /**
     * Get processing summary
     * SESSION 49: Added retry stats
     */
    getStats() {
        return {
            modelCache: this.modelCache.size,
            retryStats: { ...this.retryStats },
        };
    }
    /**
     * Reset retry stats (for testing)
     */
    resetRetryStats() {
        this.retryStats = { total: 0, retried: 0, succeeded: 0 };
    }
    // ==========================================================================
    // PATTERN REGISTRY INTEGRATION
    // ==========================================================================
    /**
     * Enable submission to pattern registry
     * When enabled, successful AI fixes are verified and submitted to the registry
     */
    enableRegistrySubmission() {
        this.submitToRegistry = true;
        if (!this.fixerVerifier) {
            this.fixerVerifier = (0, fix_pattern_registry_1.createAIFixerVerifier)({
                maxAttempts: 2,
                minScore: 80,
                dryRun: false,
                // SESSION 78: Re-enabled tool revalidation for brand safety
                // Never show unverified fix code - broken fixes damage brand reputation
                // Validation runs in parallel (batch of 10) so total time is ~3-4 min for 100 issues
                skipToolRevalidation: false,
            });
        }
    }
    /**
     * Disable submission to pattern registry
     * @deprecated SESSION 94: Auto-learning should always be enabled.
     * Only use this for isolated unit tests that don't need DB.
     */
    disableRegistrySubmission() {
        console.warn('[AIFixer] WARNING: Disabling registry submission prevents auto-learning');
        this.submitToRegistry = false;
    }
    // ==========================================================================
    // SESSION 81: Retry-with-feedback validation loop
    // ==========================================================================
    /**
     * Submit a generated fix to the pattern registry with retry-on-failure
     *
     * SESSION 81: Implements retry-with-feedback loop:
     * 1. Validate the fix
     * 2. If failed with regressions, regenerate fix with feedback
     * 3. Retry up to 3 times
     * 4. On final failure, send ALL attempts to KB for learning
     */
    async submitFixToRegistry(issue, recommendation) {
        var _a;
        if (!this.submitToRegistry) {
            return { submitted: false, message: 'Registry submission disabled' };
        }
        // SESSION 80: Skip re-validation for fixes that came from pattern reuse
        if (recommendation.model === 'pattern-reuse' || recommendation.model === 'pattern-cache') {
            console.log(`[AI-Fixer] Skipping re-validation for pattern-reused fix: ${issue.ruleId}`);
            return {
                submitted: true,
                patternStatus: 'pattern-reused',
                message: 'Fix already validated via pattern reuse',
            };
        }
        if (!this.fixerVerifier) {
            this.fixerVerifier = (0, fix_pattern_registry_1.createAIFixerVerifier)({
                maxAttempts: 2,
                minScore: 80,
                dryRun: false,
                skipToolRevalidation: false,
            });
        }
        // SESSION 81: Collect all attempts for KB learning
        const allAttempts = [];
        const MAX_VALIDATION_RETRIES = 3;
        let currentFix = recommendation.correctedCode;
        let lastRegressionDetails = undefined;
        for (let attempt = 1; attempt <= MAX_VALIDATION_RETRIES; attempt++) {
            console.log(`[AI-Fixer] Validation attempt ${attempt}/${MAX_VALIDATION_RETRIES} for ${issue.ruleId}`);
            try {
                const result = await this.fixerVerifier.verifyAndSubmit({
                    ruleId: issue.ruleId,
                    tool: issue.validatorToolId,
                    filePath: issue.file,
                    originalCode: issue.codeContext || '',
                    fixedCode: currentFix,
                    lineNumber: issue.line,
                    issueMessage: issue.message,
                    aiModel: recommendation.model,
                    attemptNumber: attempt,
                    language: issue.language,
                });
                // Success!
                if (result.success) {
                    allAttempts.push({
                        attemptNumber: attempt,
                        fixCode: currentFix,
                        validationPassed: true,
                    });
                    if (attempt > 1) {
                        console.log(`[AI-Fixer] ✅ Fix succeeded on attempt ${attempt} after feedback`);
                    }
                    if (result.patternResponse) {
                        return {
                            submitted: true,
                            patternStatus: result.patternResponse.status,
                            message: result.patternResponse.message,
                            attempts: attempt,
                        };
                    }
                    else {
                        return {
                            submitted: true,
                            patternStatus: 'verified',
                            message: result.userMessage || 'Fix verified successfully',
                            attempts: attempt,
                        };
                    }
                }
                // Failed - extract regression details
                lastRegressionDetails = this.extractRegressionDetails(result);
                allAttempts.push({
                    attemptNumber: attempt,
                    fixCode: currentFix,
                    validationPassed: false,
                    regressions: (_a = lastRegressionDetails === null || lastRegressionDetails === void 0 ? void 0 : lastRegressionDetails.regressions) === null || _a === void 0 ? void 0 : _a.map(r => ({
                        rule: r.rule,
                        message: r.message,
                    })),
                    failureReason: result.failureReason,
                });
                // If we have more attempts and there are regressions, regenerate with feedback
                if (attempt < MAX_VALIDATION_RETRIES && (lastRegressionDetails === null || lastRegressionDetails === void 0 ? void 0 : lastRegressionDetails.hasRegressions)) {
                    console.log(`[AI-Fixer] ⚠️ Attempt ${attempt} failed with regressions: ${lastRegressionDetails.regressions.map(r => r.rule).join(', ')}. Regenerating with feedback...`);
                    // Generate new fix with feedback about what went wrong
                    const newRecommendation = await this.regenerateFixWithFeedback(issue, recommendation.model, allAttempts);
                    if (newRecommendation.correctedCode && newRecommendation.correctedCode !== currentFix) {
                        currentFix = newRecommendation.correctedCode;
                        continue; // Retry with new fix
                    }
                    else {
                        console.log(`[AI-Fixer] AI could not generate a different fix. Stopping retries.`);
                        break;
                    }
                }
                else if (attempt < MAX_VALIDATION_RETRIES) {
                    // Non-regression failure, don't retry
                    console.log(`[AI-Fixer] Validation failed (non-regression). Not retrying.`);
                    break;
                }
            }
            catch (error) {
                console.error(`[AI-Fixer] Validation error on attempt ${attempt}:`, error.message);
                allAttempts.push({
                    attemptNumber: attempt,
                    fixCode: currentFix,
                    validationPassed: false,
                    failureReason: error.message,
                });
                break; // Don't retry on errors
            }
        }
        // All attempts failed - send ALL attempts to KB for learning
        console.log(`[AI-Fixer] ❌ All ${allAttempts.length} attempts failed for ${issue.ruleId}`);
        try {
            const { trackFixFailure } = await Promise.resolve().then(() => __importStar(require('../fix-pattern-registry')));
            // Collect all regression rules from all attempts
            const allRegressionRules = new Set();
            for (const attempt of allAttempts) {
                for (const reg of attempt.regressions || []) {
                    allRegressionRules.add(reg.rule);
                }
            }
            await trackFixFailure({
                ruleId: issue.ruleId,
                language: issue.language,
                tool: issue.validatorToolId,
                failureType: 'regression',
                regressionRules: Array.from(allRegressionRules),
                failureMessage: `Failed after ${allAttempts.length} attempts. Regressions: ${Array.from(allRegressionRules).join(', ')}`,
                originalCode: issue.codeContext,
                // SESSION 81: Include ALL attempted fixes for KB learning
                attemptedFix: JSON.stringify(allAttempts.map(a => ({
                    attempt: a.attemptNumber,
                    fix: a.fixCode,
                    regressions: a.regressions,
                    reason: a.failureReason,
                })), null, 2),
                codeContext: `Total attempts: ${allAttempts.length}`,
            });
        }
        catch (e) {
            console.log(`[AI-Fixer] Failed to track failure: ${e.message}`);
        }
        return {
            submitted: false,
            message: `Validation failed after ${allAttempts.length} attempts`,
            regressionDetails: lastRegressionDetails,
            attempts: allAttempts.length,
        };
    }
    /**
     * SESSION 81: Regenerate fix with feedback from previous failed attempts
     */
    async regenerateFixWithFeedback(issue, model, previousAttempts) {
        var _a, _b, _c, _d, _e;
        // Build feedback from previous attempts
        let feedbackSection = '\n\n=== PREVIOUS ATTEMPTS THAT FAILED ===\n';
        feedbackSection += 'Your previous fixes introduced new issues. AVOID these patterns:\n\n';
        for (const attempt of previousAttempts) {
            feedbackSection += `ATTEMPT ${attempt.attemptNumber} (FAILED):\n`;
            feedbackSection += '```\n' + attempt.fixCode + '\n```\n';
            if (attempt.regressions && attempt.regressions.length > 0) {
                feedbackSection += 'PROBLEMS:\n';
                for (const reg of attempt.regressions) {
                    feedbackSection += `  ❌ ${reg.rule}: ${reg.message}\n`;
                }
            }
            feedbackSection += '\n';
        }
        feedbackSection += '=== YOUR TASK ===\n';
        feedbackSection += 'Generate a DIFFERENT fix that avoids ALL the problems listed above.\n';
        feedbackSection += 'You MUST NOT repeat any of the failed patterns.\n';
        // Get knowledge base guidance
        let knowledgeBaseGuidance = '';
        try {
            knowledgeBaseGuidance = await (0, fix_pattern_registry_1.formatGuidanceForPrompt)(issue.ruleId, issue.language, issue.validatorToolId);
        }
        catch (e) {
            // Ignore
        }
        // Build enhanced prompt with feedback
        const systemPrompt = this.buildSystemPrompt(issue, true, knowledgeBaseGuidance + feedbackSection);
        const userPrompt = this.buildUserPrompt(issue, true);
        try {
            const response = await this.executeOpenRouterCall(async (client) => {
                return client.chat.completions.create({
                    model,
                    messages: [
                        { role: 'system', content: systemPrompt },
                        { role: 'user', content: userPrompt },
                    ],
                    temperature: 0.5, // Slightly higher to encourage different solutions
                    max_tokens: 2500,
                });
            });
            const content = ((_b = (_a = response.choices[0]) === null || _a === void 0 ? void 0 : _a.message) === null || _b === void 0 ? void 0 : _b.content) || '';
            if (isCorruptedResponse(content)) {
                return this.buildManualReviewRecommendation(issue, model, 'CORRUPTED_RESPONSE');
            }
            const parsed = this.parseAIResponse(content, issue);
            const usage = {
                promptTokens: ((_c = response.usage) === null || _c === void 0 ? void 0 : _c.prompt_tokens) || 0,
                completionTokens: ((_d = response.usage) === null || _d === void 0 ? void 0 : _d.completion_tokens) || 0,
                totalTokens: ((_e = response.usage) === null || _e === void 0 ? void 0 : _e.total_tokens) || 0,
            };
            return {
                ...parsed,
                confidence: this.calculateConfidence(parsed, issue),
                model,
                cost: this.estimateCost(model, usage),
                usage,
            };
        }
        catch (error) {
            console.error(`[AI-Fixer] Failed to regenerate fix with feedback:`, error.message);
            return this.buildManualReviewRecommendation(issue, model, 'AI_FIX_FAILED', error.message);
        }
    }
    /**
     * SESSION 80: Extract regression details from verification result
     * Provides actionable information when a fix introduces new issues
     */
    extractRegressionDetails(result) {
        var _a;
        if (!result.verificationHistory || result.verificationHistory.length === 0) {
            return undefined;
        }
        const lastAttempt = result.verificationHistory[result.verificationHistory.length - 1];
        const toolResult = lastAttempt === null || lastAttempt === void 0 ? void 0 : lastAttempt.toolRevalidation;
        if (!(toolResult === null || toolResult === void 0 ? void 0 : toolResult.hasRegressions) || !((_a = toolResult.regressions) === null || _a === void 0 ? void 0 : _a.length)) {
            return undefined;
        }
        // Build guidance based on regression types
        const regressionRules = toolResult.regressions.map((r) => r.rule);
        let guidance = 'The AI-generated fix introduced new issues:\n';
        for (const regression of toolResult.regressions) {
            guidance += `  • ${regression.rule}: ${regression.message}\n`;
        }
        // Add specific guidance for known problematic patterns
        if (regressionRules.includes('EmptyCatchBlock')) {
            guidance += '\n💡 Tip: Add proper exception handling - log the error and either rethrow or handle gracefully.';
        }
        if (regressionRules.includes('AvoidCatchingThrowable')) {
            guidance += '\n💡 Tip: Catch specific exception types (IOException, SQLException) instead of Throwable.';
        }
        return {
            hasRegressions: true,
            regressions: toolResult.regressions.map((r) => ({
                rule: r.rule,
                message: r.message,
                line: r.line,
            })),
            guidance,
        };
    }
    /**
     * Get AI Fixer's current trust status in the registry
     */
    getAIFixerTrustStatus() {
        const registry = (0, fix_pattern_registry_1.getFixPatternRegistry)();
        return registry.getAIFixerStats();
    }
    // ==========================================================================
    // SESSION 89: Batch Fix Generation
    // ==========================================================================
    /**
     * Generate fixes for multiple issues in a single AI call (batch fixing)
     *
     * SESSION 89: Implements the generateBatchFix callback for PatternAwareFixService
     *
     * Benefits:
     * - Reduced API calls (1 instead of N)
     * - Reduced total latency (180s → 75s for 3 issues)
     * - AI can see all issues at once for better context
     * - Single prompt/response round-trip
     *
     * @param issues Array of issues to fix in batch
     * @param model Optional model override (for complexity routing)
     * @returns Array of fixes corresponding to each input issue
     */
    async generateBatchFix(issues, model) {
        var _a, _b, _c, _d, _e;
        if (issues.length === 0) {
            return { fixes: [], totalConfidence: 0 };
        }
        // Use provided model or get from language config
        const selectedModel = model || await this.getModelForLanguage(issues[0].language);
        console.log(`[AI-Fixer] 📦 Batch fix: ${issues.length} issues, model: ${selectedModel}`);
        // Fetch KB guidance for the primary rule
        let knowledgeBaseGuidance = '';
        const primaryRule = issues[0].ruleId;
        try {
            knowledgeBaseGuidance = await (0, fix_pattern_registry_1.formatGuidanceForPrompt)(primaryRule, issues[0].language, issues[0].validatorToolId);
            if (knowledgeBaseGuidance) {
                console.log(`[AI-Fixer] Found KB guidance for batch primary rule: ${primaryRule}`);
            }
        }
        catch (e) {
            // Continue without KB guidance
        }
        // Build batch prompt
        const { systemPrompt, userPrompt } = this.buildBatchPrompt(issues, knowledgeBaseGuidance);
        try {
            const response = await this.executeOpenRouterCall(async (client) => {
                return client.chat.completions.create({
                    model: selectedModel,
                    messages: [
                        { role: 'system', content: systemPrompt },
                        { role: 'user', content: userPrompt },
                    ],
                    temperature: 0.2,
                    max_tokens: 4000 + (issues.length * 500), // Scale tokens with issue count
                });
            });
            const content = ((_b = (_a = response.choices[0]) === null || _a === void 0 ? void 0 : _a.message) === null || _b === void 0 ? void 0 : _b.content) || '';
            // Check for corrupted response
            if (isCorruptedResponse(content)) {
                console.warn(`[AI-Fixer] Batch fix returned corrupted response`);
                // Return empty fixes to trigger fallback
                return {
                    fixes: issues.map(() => ({ fixCode: '', confidence: 0 })),
                    totalConfidence: 0,
                };
            }
            // Parse batch response
            const fixes = this.parseBatchResponse(content, issues);
            // Calculate usage and cost
            const usage = {
                promptTokens: ((_c = response.usage) === null || _c === void 0 ? void 0 : _c.prompt_tokens) || 0,
                completionTokens: ((_d = response.usage) === null || _d === void 0 ? void 0 : _d.completion_tokens) || 0,
                totalTokens: ((_e = response.usage) === null || _e === void 0 ? void 0 : _e.total_tokens) || 0,
            };
            const cost = this.estimateCost(selectedModel, usage);
            // Calculate total confidence
            const totalConfidence = fixes.length > 0
                ? Math.round(fixes.reduce((sum, f) => sum + f.confidence, 0) / fixes.length)
                : 0;
            console.log(`[AI-Fixer] 📦 Batch fix complete: ${fixes.filter(f => f.confidence > 0).length}/${issues.length} fixes generated, avg confidence: ${totalConfidence}%`);
            return { fixes, totalConfidence, cost, usage };
        }
        catch (error) {
            console.error(`[AI-Fixer] Batch fix error: ${error.message}`);
            // Return empty fixes to trigger fallback to sequential
            return {
                fixes: issues.map(() => ({ fixCode: '', confidence: 0 })),
                totalConfidence: 0,
            };
        }
    }
    /**
     * Build system and user prompts for batch fix generation
     *
     * SESSION 89: Creates a structured prompt that asks AI to fix multiple issues
     * and return fixes in a parseable JSON array format
     */
    buildBatchPrompt(issues, knowledgeBaseGuidance) {
        var _a, _b;
        const language = ((_a = issues[0]) === null || _a === void 0 ? void 0 : _a.language) || 'unknown';
        const tool = ((_b = issues[0]) === null || _b === void 0 ? void 0 : _b.validatorToolId) || 'unknown';
        // Group issues by file for better context
        const issuesByFile = new Map();
        for (const issue of issues) {
            const existing = issuesByFile.get(issue.file) || [];
            existing.push(issue);
            issuesByFile.set(issue.file, existing);
        }
        const systemPrompt = `You are an expert code fixer. Generate precise, compilable fixes for MULTIPLE code issues in a single response.

CRITICAL REQUIREMENTS:
- You MUST fix ALL ${issues.length} issues listed below
- Return fixes in the EXACT JSON format specified
- Each fix must be complete and compilable
- Never ask for more context - work with what's provided
- Do NOT add comments explaining fixes unless they add value

LANGUAGE: ${language}
TOOL: ${tool}

${knowledgeBaseGuidance ? `KNOWLEDGE BASE GUIDANCE (MUST follow):\n${knowledgeBaseGuidance}\n` : ''}

OUTPUT FORMAT - Return a JSON array with exactly ${issues.length} objects:
{
  "fixes": [
    {
      "issueIndex": 0,
      "fixCode": "The complete fixed code snippet",
      "explanation": "Brief explanation of the fix"
    },
    {
      "issueIndex": 1,
      "fixCode": "The complete fixed code snippet",
      "explanation": "Brief explanation of the fix"
    }
    // ... one entry for each issue
  ]
}

CRITICAL: Output ONLY valid JSON. No markdown code blocks, no extra text.`;
        // Build user prompt with all issues
        let userPrompt = `Fix the following ${issues.length} code issues:\n\n`;
        let issueIndex = 0;
        Array.from(issuesByFile.entries()).forEach(([file, fileIssues]) => {
            var _a;
            userPrompt += `=== FILE: ${file} ===\n`;
            for (const issue of fileIssues) {
                userPrompt += `
--- ISSUE ${issueIndex} ---
RULE: ${issue.ruleId}
LINE: ${issue.line}
SEVERITY: ${issue.severity}
MESSAGE: ${issue.message}
${issue.codeContext ? `CODE CONTEXT:\n\`\`\`${language}\n${issue.codeContext}\n\`\`\`` : '(No code context available)'}
${((_a = issue.toolContext) === null || _a === void 0 ? void 0 : _a.toolSuggestion) ? `TOOL SUGGESTION: ${issue.toolContext.toolSuggestion}` : ''}

`;
                issueIndex++;
            }
        });
        userPrompt += `\nProvide fixes for all ${issues.length} issues in the JSON format specified.`;
        return { systemPrompt, userPrompt };
    }
    /**
     * Parse AI response from batch fix generation
     *
     * SESSION 89: Extracts individual fixes from the batch response JSON
     * Handles various response formats and provides fallback for partial responses
     */
    parseBatchResponse(content, issues) {
        var _a;
        // Initialize result array with empty fixes
        const results = issues.map(() => ({ fixCode: '', confidence: 0 }));
        // Clean response
        let cleaned = content.trim();
        cleaned = cleaned.replace(/```json\s*/gi, '');
        cleaned = cleaned.replace(/```\s*/gi, '');
        try {
            // Find JSON object in response
            const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
                console.warn(`[AI-Fixer] Batch response: No JSON found`);
                return results;
            }
            const parsed = JSON.parse(jsonMatch[0]);
            // Handle response format
            const fixesArray = parsed.fixes || parsed.results || parsed;
            if (!Array.isArray(fixesArray)) {
                console.warn(`[AI-Fixer] Batch response: Expected array, got ${typeof fixesArray}`);
                return results;
            }
            // Map fixes to issues
            for (const fix of fixesArray) {
                // Determine which issue this fix corresponds to
                let index = -1;
                if (typeof fix.issueIndex === 'number') {
                    index = fix.issueIndex;
                }
                else if (typeof fix.index === 'number') {
                    index = fix.index;
                }
                else if (typeof fix.id === 'string') {
                    // Try to match by issue ID
                    index = issues.findIndex(i => i.id === fix.id);
                }
                else if (typeof fix.ruleId === 'string') {
                    // Try to match by ruleId and line
                    index = issues.findIndex(i => i.ruleId === fix.ruleId &&
                        (fix.line === undefined || i.line === fix.line));
                }
                // If still no match, try positional (assume fixes are in order)
                if (index === -1) {
                    const nextEmpty = results.findIndex(r => r.fixCode === '');
                    if (nextEmpty !== -1) {
                        index = nextEmpty;
                    }
                }
                if (index >= 0 && index < results.length) {
                    const fixCode = fix.fixCode || fix.correctedCode || fix.code || fix.fix || '';
                    if (fixCode && fixCode.length > 0) {
                        // Calculate confidence based on response quality
                        let confidence = 75; // Base confidence for batch fix
                        // Boost if we have explanation
                        if (fix.explanation && fix.explanation.length > 10) {
                            confidence += 5;
                        }
                        // Boost if fix differs from original
                        const originalCode = ((_a = issues[index]) === null || _a === void 0 ? void 0 : _a.codeContext) || '';
                        if (fixCode !== originalCode && fixCode.length > 5) {
                            confidence += 10;
                        }
                        results[index] = { fixCode, confidence: Math.min(90, confidence) };
                    }
                }
            }
            const successCount = results.filter(r => r.confidence > 0).length;
            console.log(`[AI-Fixer] Batch parse: ${successCount}/${issues.length} fixes extracted`);
        }
        catch (e) {
            console.warn(`[AI-Fixer] Batch response parse error: ${e.message}`);
        }
        return results;
    }
}
exports.AIFixerAgent = AIFixerAgent;
// ============================================================================
// SINGLETON EXPORT
// ============================================================================
let instance = null;
function getAIFixerAgent(options) {
    if (!instance) {
        instance = new AIFixerAgent(options);
    }
    return instance;
}
/**
 * Reset the AI Fixer Agent singleton (for testing)
 */
function resetAIFixerAgent() {
    instance = null;
}
/**
 * Process issues through AI-Fixer and return enriched results
 * Convenience function for pipeline integration
 *
 * @param issues Issues to process
 * @param options Processing options
 * @param options.parallel Number of parallel requests (default 3)
 * @param options.verbose Enable verbose logging
 * @param options.submitToRegistry Submit successful fixes to pattern registry
 */
async function processIssuesWithAIFixer(issues, options) {
    const agent = getAIFixerAgent({ submitToRegistry: options === null || options === void 0 ? void 0 : options.submitToRegistry });
    if (options === null || options === void 0 ? void 0 : options.submitToRegistry) {
        agent.enableRegistrySubmission();
    }
    const result = await agent.processBatch(issues, {
        parallel: options === null || options === void 0 ? void 0 : options.parallel,
        verbose: options === null || options === void 0 ? void 0 : options.verbose,
    });
    // Submit successful fixes to registry if enabled
    if (options === null || options === void 0 ? void 0 : options.submitToRegistry) {
        console.log('[AI-Fixer] Submitting successful fixes to pattern registry...');
        for (const enriched of result.enrichedIssues) {
            // Only submit high-confidence fixes
            if (enriched.fixRecommendation.confidence >= 70) {
                const submitResult = await agent.submitFixToRegistry(enriched, enriched.fixRecommendation);
                // SESSION 78: If validation failed, set manualReview.required
                // This ensures broken code is not shown to users - they get guidance instead
                // Note: submitToRegistry is enabled at this point, so !submitted means verification failed
                if (!submitResult.submitted && submitResult.message !== 'Registry submission disabled') {
                    console.log(`[AI-Fixer] Validation failed for ${enriched.ruleId}, marking for manual review`);
                    enriched.fixRecommendation.manualReview = {
                        required: true,
                        reason: 'VALIDATION_FAILED',
                        remediationSteps: [
                            `1. Review the issue at ${enriched.file}:${enriched.line}`,
                            `2. Understand why ${enriched.ruleId} was triggered: ${enriched.message || 'See rule documentation'}`,
                            '3. The AI-generated fix did not pass validation - apply fix manually',
                            '4. Verify the fix doesn\'t break existing functionality',
                            '5. Run tests to ensure no regressions',
                        ],
                        documentationLinks: agent['getDocumentationLinks'](enriched.validatorToolId.toLowerCase(), enriched.ruleId),
                        riskLevel: enriched.severity === 'critical' ? 'critical' :
                            enriched.severity === 'high' ? 'high' :
                                enriched.severity === 'medium' ? 'medium' : 'low',
                        estimatedEffort: 'moderate',
                    };
                    enriched.fixRecommendation.confidence = 0; // Force manual review
                }
            }
        }
    }
    return result;
}
