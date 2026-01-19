"use strict";
/**
 * Fix Capture API
 *
 * REST API endpoints for the IDE extension to:
 * 1. Capture manual fixes from users
 * 2. Look up patterns for rules
 * 3. Apply patterns to generate fixes
 * 4. Report fix success/failure for learning
 *
 * This file can be imported into Express/Fastify routers
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.FixPatternClient = void 0;
exports.handleCanContribute = handleCanContribute;
exports.handleFixCapture = handleFixCapture;
exports.handlePatternLookup = handlePatternLookup;
exports.handleFixApply = handleFixApply;
exports.handleFixResult = handleFixResult;
exports.handleListPatterns = handleListPatterns;
exports.handleUpdatePatternStatus = handleUpdatePatternStatus;
exports.createFixPatternRouter = createFixPatternRouter;
const index_1 = require("./index");
// =============================================================================
// API Handlers
// =============================================================================
/**
 * Check if user can contribute (call before showing "Contribute" option)
 * Returns false for banned users - IDE should NOT show contribute option
 */
async function handleCanContribute(userId) {
    const registry = (0, index_1.getFixPatternRegistry)();
    // Check if user is banned
    if (registry.isUserBanned(userId)) {
        return {
            canContribute: false,
            reason: 'Your account has been permanently banned from contributing.',
            trustStatus: 'banned',
        };
    }
    // Get user stats
    const stats = registry.getContributorStats(userId);
    if (stats) {
        return {
            canContribute: true,
            trustStatus: stats.trustStatus,
            stats: {
                totalContributions: stats.totalContributions,
                acceptedContributions: stats.acceptedContributions,
                rank: stats.rank,
            },
        };
    }
    // New user - can contribute
    return {
        canContribute: true,
        trustStatus: 'new',
    };
}
/**
 * Handle fix capture request from IDE
 */
async function handleFixCapture(request) {
    const registry = (0, index_1.getFixPatternRegistry)();
    // Convert to internal format
    const captureRequest = {
        ruleId: request.ruleId,
        tool: request.tool,
        filePath: request.filePath,
        beforeCode: request.beforeCode,
        afterCode: request.afterCode,
        lineNumber: request.lineNumber,
        issueMessage: request.issueMessage,
        userId: request.userId,
        context: {
            framework: detectFramework(request.filePath),
            language: detectLanguage(request.filePath),
        },
    };
    // Capture the fix
    const result = await registry.capture(captureRequest);
    // Calculate points (gamification)
    const points = result.autoApproved ? 50 : 10;
    // Get contributor stats (mock for now)
    const contributorStats = await getContributorStats(request.userId);
    return {
        success: result.success,
        patternId: result.patternId,
        status: result.status,
        message: result.message,
        autoApproved: result.autoApproved,
        pointsEarned: result.success ? points : 0,
        contributorStats,
    };
}
/**
 * Handle pattern lookup request from IDE
 */
async function handlePatternLookup(ruleId, tool, fileType) {
    const registry = (0, index_1.getFixPatternRegistry)();
    return registry.lookup({
        ruleId,
        tool,
        fileType,
        activeOnly: true,
    });
}
/**
 * Handle fix application request from IDE
 */
async function handleFixApply(request) {
    const registry = (0, index_1.getFixPatternRegistry)();
    return registry.apply(request);
}
/**
 * Handle fix result reporting from IDE
 */
async function handleFixResult(request) {
    const registry = (0, index_1.getFixPatternRegistry)();
    await registry.recordApplication(request.patternId, request.success, request.reverted);
    // If reverted with reason, store for analysis
    if (request.reverted && request.revertReason) {
        await storeRevertFeedback(request.patternId, request.userId, request.revertReason);
    }
    return { success: true };
}
/**
 * Get all patterns (for admin UI)
 */
async function handleListPatterns(filters) {
    const registry = (0, index_1.getFixPatternRegistry)();
    return registry.listPatterns(filters);
}
/**
 * Update pattern status (admin only)
 */
async function handleUpdatePatternStatus(patternId, status, reviewerId) {
    const registry = (0, index_1.getFixPatternRegistry)();
    const result = await registry.updateStatus(patternId, status, reviewerId);
    return { success: result };
}
// =============================================================================
// Express Router Factory
// =============================================================================
/**
 * Create Express router for fix pattern API
 *
 * Usage:
 * ```typescript
 * import express from 'express';
 * import { createFixPatternRouter } from './fix-capture-api';
 *
 * const app = express();
 * app.use('/api/fix-patterns', createFixPatternRouter());
 * ```
 */
function createFixPatternRouter() {
    // Note: This is a factory function that returns route handlers
    // The actual Express router would be created in the API package
    return {
        /**
         * GET /can-contribute/:userId
         * Check if user can contribute (call BEFORE showing contribute option)
         */
        canContribute: async (req) => {
            return handleCanContribute(req.params.userId);
        },
        /**
         * POST /capture
         * Capture a manual fix from IDE
         */
        capture: async (req) => {
            return handleFixCapture(req.body);
        },
        /**
         * GET /lookup/:ruleId
         * Look up patterns for a rule
         */
        lookup: async (req) => {
            return handlePatternLookup(req.params.ruleId, req.query.tool, req.query.fileType);
        },
        /**
         * POST /apply
         * Apply a pattern to fix code
         */
        apply: async (req) => {
            return handleFixApply(req.body);
        },
        /**
         * POST /result
         * Report fix application result
         */
        result: async (req) => {
            return handleFixResult(req.body);
        },
        /**
         * GET /patterns
         * List all patterns (admin)
         */
        list: async (req) => {
            return handleListPatterns({
                tool: req.query.tool,
                status: req.query.status,
                minConfidence: req.query.minConfidence ? parseInt(req.query.minConfidence) : undefined,
            });
        },
        /**
         * PATCH /patterns/:patternId/status
         * Update pattern status (admin)
         */
        updateStatus: async (req) => {
            return handleUpdatePatternStatus(req.params.patternId, req.body.status, req.body.reviewerId);
        },
    };
}
// =============================================================================
// Helper Functions
// =============================================================================
function detectFramework(filePath) {
    const path = filePath.toLowerCase();
    if (path.includes('.github/workflows'))
        return 'github-actions';
    if (path.includes('next.config'))
        return 'nextjs';
    if (path.includes('package.json'))
        return 'nodejs';
    if (path.includes('pom.xml'))
        return 'maven';
    if (path.includes('build.gradle'))
        return 'gradle';
    if (path.includes('requirements.txt') || path.includes('pyproject.toml'))
        return 'python';
    return undefined;
}
function detectLanguage(filePath) {
    var _a;
    const ext = ((_a = filePath.split('.').pop()) === null || _a === void 0 ? void 0 : _a.toLowerCase()) || '';
    const langMap = {
        ts: 'typescript',
        tsx: 'typescript',
        js: 'javascript',
        jsx: 'javascript',
        py: 'python',
        java: 'java',
        go: 'go',
        rs: 'rust',
        yml: 'yaml',
        yaml: 'yaml',
        json: 'json',
        md: 'markdown',
    };
    return langMap[ext] || 'unknown';
}
async function getContributorStats(userId) {
    // TODO: Fetch from database
    // For now, return mock data
    return {
        totalContributions: 1,
        acceptedContributions: 0,
        rank: 'bronze',
    };
}
async function storeRevertFeedback(patternId, userId, reason) {
    // TODO: Store in database for pattern improvement
    console.log(`[FixPatternRegistry] Revert feedback for ${patternId}: ${reason}`);
}
// =============================================================================
// IDE Extension Client SDK
// =============================================================================
/**
 * Client SDK for IDE extensions to interact with the Fix Pattern API
 *
 * Usage in VS Code extension:
 * ```typescript
 * import { FixPatternClient } from 'codequal-sdk';
 *
 * const client = new FixPatternClient('https://api.codequal.dev');
 *
 * // Capture a manual fix
 * await client.capturefix({
 *   ruleId: 'yaml.github-actions...',
 *   beforeCode: '...',
 *   afterCode: '...',
 *   // ...
 * });
 * ```
 */
class FixPatternClient {
    constructor(baseUrl, apiKey) {
        this.baseUrl = baseUrl.replace(/\/$/, '');
        this.apiKey = apiKey;
    }
    async fetch(path, options = {}) {
        const headers = {
            'Content-Type': 'application/json',
            ...options.headers,
        };
        if (this.apiKey) {
            headers['Authorization'] = `Bearer ${this.apiKey}`;
        }
        const response = await fetch(`${this.baseUrl}${path}`, {
            ...options,
            headers,
        });
        if (!response.ok) {
            throw new Error(`API error: ${response.status} ${response.statusText}`);
        }
        return response.json();
    }
    /**
     * Check if user can contribute (call BEFORE showing "Contribute" option)
     * If canContribute is false, do NOT show the contribute UI to this user
     */
    async canContribute(userId) {
        return this.fetch(`/api/fix-patterns/can-contribute/${encodeURIComponent(userId)}`);
    }
    /**
     * Capture a manual fix
     */
    async captureFix(request) {
        return this.fetch('/api/fix-patterns/capture', {
            method: 'POST',
            body: JSON.stringify(request),
        });
    }
    /**
     * Look up patterns for a rule
     */
    async lookupPattern(ruleId, tool, fileType) {
        const params = new URLSearchParams();
        if (tool)
            params.set('tool', tool);
        if (fileType)
            params.set('fileType', fileType);
        const query = params.toString();
        return this.fetch(`/api/fix-patterns/lookup/${encodeURIComponent(ruleId)}${query ? `?${query}` : ''}`);
    }
    /**
     * Apply a pattern to fix code
     */
    async applyPattern(request) {
        return this.fetch('/api/fix-patterns/apply', {
            method: 'POST',
            body: JSON.stringify(request),
        });
    }
    /**
     * Report fix result
     */
    async reportResult(request) {
        return this.fetch('/api/fix-patterns/result', {
            method: 'POST',
            body: JSON.stringify(request),
        });
    }
}
exports.FixPatternClient = FixPatternClient;
