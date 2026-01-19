"use strict";
/**
 * Fix Pattern Applicator
 *
 * Integrates the Fix Pattern Registry with the LSP/SARIF converter.
 * When generating fixes, this module:
 * 1. First checks the registry for a matching pattern
 * 2. If found, applies the pattern to generate deterministic fix
 * 3. If not found, falls back to AI generation
 * 4. Tracks success/failure for learning
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.applyFixPattern = applyFixPattern;
exports.batchApplyFixPatterns = batchApplyFixPatterns;
exports.generatePatternBasedFix = generatePatternBasedFix;
exports.hasPatternForRule = hasPatternForRule;
exports.getPatternStats = getPatternStats;
const index_1 = require("./index");
/**
 * Attempt to apply a fix pattern for an issue
 */
async function applyFixPattern(issue, fileContent) {
    const registry = (0, index_1.getFixPatternRegistry)();
    // Look up patterns for this rule
    const lookup = await registry.lookup({
        ruleId: issue.rule,
        tool: issue.tool,
        fileType: getFileType(issue.file),
        activeOnly: true,
    });
    if (!lookup.found || !lookup.recommended) {
        // No pattern found - fall back to AI or manual
        return {
            patternApplied: false,
            fixCode: '',
            confidence: 0,
            source: 'manual_required',
            message: `No fix pattern found for ${issue.rule}. Manual review required.`,
        };
    }
    const pattern = lookup.recommended;
    // Apply the pattern
    const result = await registry.apply({
        patternId: pattern.id,
        fileContent,
        filePath: issue.file,
        lineNumber: issue.line || 1,
    });
    if (!result.success || !result.fixedCode) {
        // Pattern failed to apply - fall back
        return {
            patternApplied: false,
            pattern,
            fixCode: '',
            confidence: 0,
            source: 'manual_required',
            message: `Pattern ${pattern.id} failed to apply: ${result.error}`,
        };
    }
    return {
        patternApplied: true,
        pattern,
        fixCode: result.fixedCode,
        confidence: result.confidence,
        source: 'pattern_registry',
        variables: result.variables,
        message: `Fix applied using pattern: ${pattern.name}`,
    };
}
/**
 * Batch apply fix patterns for multiple issues
 */
async function batchApplyFixPatterns(issues, fileContents) {
    const results = new Map();
    for (const issue of issues) {
        const issueId = `${issue.file}:${issue.line}:${issue.rule}`;
        const fileContent = fileContents.get(issue.file);
        if (!fileContent) {
            results.set(issueId, {
                patternApplied: false,
                fixCode: '',
                confidence: 0,
                source: 'manual_required',
                message: `File content not available: ${issue.file}`,
            });
            continue;
        }
        const result = await applyFixPattern(issue, fileContent);
        results.set(issueId, result);
    }
    return results;
}
/**
 * Generate fix suggestion using pattern registry (for LSP converter)
 */
async function generatePatternBasedFix(issue, fileContent) {
    const registry = (0, index_1.getFixPatternRegistry)();
    // Look up patterns
    const lookup = await registry.lookup({
        ruleId: issue.rule,
        tool: issue.tool,
        activeOnly: true,
    });
    if (!lookup.found || !lookup.recommended) {
        return {
            correctedCode: '',
            explanation: `No automated fix available for ${issue.rule}. Manual review required.`,
            confidence: 0,
            source: 'none',
        };
    }
    const pattern = lookup.recommended;
    // If we have file content, try to apply the pattern
    if (fileContent) {
        const result = await registry.apply({
            patternId: pattern.id,
            fileContent,
            filePath: issue.file,
            lineNumber: issue.line || 1,
        });
        if (result.success && result.fixedCode) {
            return {
                correctedCode: result.fixedCode,
                explanation: pattern.description,
                confidence: result.confidence,
                source: 'pattern',
                patternId: pattern.id,
            };
        }
    }
    // Return the first example's "after" code as a reference
    if (pattern.examples.length > 0) {
        return {
            correctedCode: pattern.examples[0].after,
            explanation: `${pattern.description}\n\nExample fix (adapt to your code):\n${pattern.examples[0].description}`,
            confidence: pattern.confidence * 0.7, // Lower confidence for example-based
            source: 'pattern',
            patternId: pattern.id,
        };
    }
    return {
        correctedCode: '',
        explanation: `Pattern found but no example available. See: ${pattern.description}`,
        confidence: 0,
        source: 'none',
    };
}
/**
 * Check if a pattern exists for a rule
 */
async function hasPatternForRule(ruleId, tool) {
    const registry = (0, index_1.getFixPatternRegistry)();
    const lookup = await registry.lookup({ ruleId, tool, activeOnly: true });
    return lookup.found;
}
/**
 * Get fix pattern statistics
 */
async function getPatternStats() {
    const registry = (0, index_1.getFixPatternRegistry)();
    const allPatterns = await registry.listPatterns();
    const activePatterns = await registry.listPatterns({ status: 'active' });
    const byTool = {};
    for (const pattern of allPatterns) {
        byTool[pattern.tool] = (byTool[pattern.tool] || 0) + 1;
    }
    const topPatterns = [...allPatterns]
        .sort((a, b) => b.metadata.applyCount - a.metadata.applyCount)
        .slice(0, 10)
        .map((p) => ({
        id: p.id,
        name: p.name,
        applyCount: p.metadata.applyCount,
    }));
    return {
        totalPatterns: allPatterns.length,
        activePatterns: activePatterns.length,
        byTool,
        topPatterns,
    };
}
// =============================================================================
// Helper Functions
// =============================================================================
function getFileType(filePath) {
    var _a;
    const ext = ((_a = filePath.split('.').pop()) === null || _a === void 0 ? void 0 : _a.toLowerCase()) || '';
    const typeMap = {
        yml: 'yaml',
        yaml: 'yaml',
        ts: 'typescript',
        tsx: 'typescript',
        js: 'javascript',
        jsx: 'javascript',
        py: 'python',
        java: 'java',
        go: 'go',
        rs: 'rust',
    };
    return typeMap[ext] || ext;
}
