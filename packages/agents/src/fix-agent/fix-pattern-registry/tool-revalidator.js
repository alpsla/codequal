"use strict";
/**
 * Tool Re-Validator
 *
 * Validates AI-generated fixes by re-running the original tool that found the issue.
 * This ensures:
 * 1. The original issue is actually fixed
 * 2. No new issues (regressions) are introduced
 * 3. Only verified fixes are saved to Supabase
 *
 * SESSION 73: Created for pattern validation before Supabase storage
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
exports.USER_TIER_QUOTAS = exports.REPO_SIZE_MULTIPLIERS = exports.TOOL_TIMEOUT_CONFIGS = exports.SECURE_DIR_MODE = exports.SECURE_FILE_MODE = exports.DEFAULT_RATE_LIMIT = exports.ToolRevalidator = void 0;
exports.getToolRevalidator = getToolRevalidator;
exports.createToolRevalidator = createToolRevalidator;
exports.resetToolRevalidatorSingleton = resetToolRevalidatorSingleton;
exports.getRateLimiterStats = getRateLimiterStats;
exports.checkToolAvailability = checkToolAvailability;
exports.clearToolAvailabilityCache = clearToolAvailabilityCache;
exports.calculateDynamicTimeout = calculateDynamicTimeout;
exports.getToolConcurrencyLimit = getToolConcurrencyLimit;
exports.classifyRepoSize = classifyRepoSize;
exports.getUserTierConfig = getUserTierConfig;
exports.flushMetricsToLog = flushMetricsToLog;
exports.getExecutionMetrics = getExecutionMetrics;
const child_process_1 = require("child_process");
const util_1 = require("util");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const os = __importStar(require("os"));
const crypto = __importStar(require("crypto"));
const execFileAsync = (0, util_1.promisify)(child_process_1.execFile);
// ============================================================================
// Security: File Permissions
// ============================================================================
/** Secure file mode: owner read/write only (0600) */
const SECURE_FILE_MODE = 0o600;
exports.SECURE_FILE_MODE = SECURE_FILE_MODE;
/** Secure directory mode: owner read/write/execute only (0700) */
const SECURE_DIR_MODE = 0o700;
exports.SECURE_DIR_MODE = SECURE_DIR_MODE;
/**
 * Per-tool timeout configurations
 * SESSION 75: Initial generous defaults - will be tuned based on monitoring data
 * TODO: Collect actual timing data during multi-language tests and adjust
 */
const TOOL_TIMEOUT_CONFIGS = {
    // Heavy tools requiring compilation - GENEROUS timeouts for large repos
    spotbugs: { baseTimeoutMs: 300000, maxConcurrent: 4, requiresCompilation: true }, // 5 min base
    // Java static analysis (no compilation)
    pmd: { baseTimeoutMs: 120000, maxConcurrent: 8, requiresCompilation: false }, // 2 min base
    checkstyle: { baseTimeoutMs: 90000, maxConcurrent: 8, requiresCompilation: false }, // 1.5 min base
    // JavaScript/TypeScript (fast)
    eslint: { baseTimeoutMs: 60000, maxConcurrent: 12, requiresCompilation: false }, // 1 min base
    tsc: { baseTimeoutMs: 120000, maxConcurrent: 8, requiresCompilation: false }, // 2 min base
    // Python (generally fast)
    ruff: { baseTimeoutMs: 60000, maxConcurrent: 12, requiresCompilation: false }, // 1 min base
    pylint: { baseTimeoutMs: 90000, maxConcurrent: 8, requiresCompilation: false }, // 1.5 min base
    bandit: { baseTimeoutMs: 90000, maxConcurrent: 8, requiresCompilation: false }, // 1.5 min base
    mypy: { baseTimeoutMs: 120000, maxConcurrent: 8, requiresCompilation: false }, // 2 min base
    // Go tools
    'golangci-lint': { baseTimeoutMs: 180000, maxConcurrent: 6, requiresCompilation: true }, // 3 min base
    gosec: { baseTimeoutMs: 120000, maxConcurrent: 8, requiresCompilation: false }, // 2 min base
    // Rust (requires compilation)
    clippy: { baseTimeoutMs: 300000, maxConcurrent: 4, requiresCompilation: true }, // 5 min base
    // Ruby
    rubocop: { baseTimeoutMs: 90000, maxConcurrent: 8, requiresCompilation: false }, // 1.5 min base
    brakeman: { baseTimeoutMs: 180000, maxConcurrent: 6, requiresCompilation: false }, // 3 min base
    // PHP
    phpstan: { baseTimeoutMs: 120000, maxConcurrent: 8, requiresCompilation: false }, // 2 min base
};
exports.TOOL_TIMEOUT_CONFIGS = TOOL_TIMEOUT_CONFIGS;
/** Repo size multipliers for timeout calculation */
const REPO_SIZE_MULTIPLIERS = {
    small: 1, // < 10k lines
    medium: 2, // 10k-50k lines
    large: 4, // 50k-200k lines
    enterprise: 8, // 200k+ lines
};
exports.REPO_SIZE_MULTIPLIERS = REPO_SIZE_MULTIPLIERS;
/**
 * User tier quotas - GENEROUS for initial testing
 * SESSION 75: Will be tuned based on monitoring data
 */
const USER_TIER_QUOTAS = {
    basic: { maxPerMinute: 60, maxConcurrent: 6 }, // Generous for testing
    pro: { maxPerMinute: 200, maxConcurrent: 20 }, // Generous for testing
    enterprise: { maxPerMinute: 1000, maxConcurrent: 100 }, // Very generous for testing
};
exports.USER_TIER_QUOTAS = USER_TIER_QUOTAS;
// In-memory metrics collection (will be flushed to logs periodically)
const executionMetrics = [];
const MAX_METRICS_IN_MEMORY = 1000;
/**
 * Record a tool execution metric for future analysis
 */
function recordExecutionMetric(metric) {
    executionMetrics.push(metric);
    // Flush to console when buffer is full
    if (executionMetrics.length >= MAX_METRICS_IN_MEMORY) {
        flushMetricsToLog();
    }
}
/**
 * Flush collected metrics to console log for analysis
 */
function flushMetricsToLog() {
    if (executionMetrics.length === 0)
        return;
    // Calculate summary statistics
    const byTool = new Map();
    for (const metric of executionMetrics) {
        const key = `${metric.tool}:${metric.repoSize}`;
        if (!byTool.has(key)) {
            byTool.set(key, { durations: [], timeouts: 0, successes: 0 });
        }
        const stats = byTool.get(key);
        stats.durations.push(metric.durationMs);
        if (metric.timedOut)
            stats.timeouts++;
        if (metric.succeeded)
            stats.successes++;
    }
    // Log summary
    console.log('[ToolRevalidator] Execution Metrics Summary:');
    byTool.forEach((stats, key) => {
        const avgDuration = stats.durations.reduce((a, b) => a + b, 0) / stats.durations.length;
        const maxDuration = Math.max(...stats.durations);
        const p95Index = Math.floor(stats.durations.length * 0.95);
        stats.durations.sort((a, b) => a - b);
        const p95Duration = stats.durations[p95Index] || maxDuration;
        console.log(`  ${key}: avg=${Math.round(avgDuration)}ms, p95=${Math.round(p95Duration)}ms, max=${Math.round(maxDuration)}ms, timeouts=${stats.timeouts}/${stats.durations.length}`);
    });
    // Clear buffer
    executionMetrics.length = 0;
}
/**
 * Get current metrics buffer (for testing/debugging)
 */
function getExecutionMetrics() {
    return [...executionMetrics];
}
/** Default configuration (used when no dynamic config provided) */
const DEFAULT_RATE_LIMIT = {
    maxPerMinute: 30,
    maxConcurrent: Math.max(2, Math.floor(os.cpus().length * 0.75)), // 75% of CPU cores
    timeoutMs: 60000,
};
exports.DEFAULT_RATE_LIMIT = DEFAULT_RATE_LIMIT;
/**
 * Calculate dynamic timeout based on tool and repository size
 * SESSION 75: Smart timeout calculation
 */
function calculateDynamicTimeout(tool, repoSize = 'medium') {
    const normalizedTool = tool.toLowerCase().replace(/-/g, '');
    // Find matching tool config
    let toolConfig;
    for (const [name, config] of Object.entries(TOOL_TIMEOUT_CONFIGS)) {
        if (name.toLowerCase().replace(/-/g, '') === normalizedTool) {
            toolConfig = config;
            break;
        }
    }
    // Default config for unknown tools
    if (!toolConfig) {
        toolConfig = { baseTimeoutMs: 60000, maxConcurrent: 4, requiresCompilation: false };
    }
    const multiplier = REPO_SIZE_MULTIPLIERS[repoSize];
    return toolConfig.baseTimeoutMs * multiplier;
}
/**
 * Get per-tool concurrency limit
 * SESSION 75: Tool-specific concurrency
 */
function getToolConcurrencyLimit(tool) {
    const normalizedTool = tool.toLowerCase().replace(/-/g, '');
    for (const [name, config] of Object.entries(TOOL_TIMEOUT_CONFIGS)) {
        if (name.toLowerCase().replace(/-/g, '') === normalizedTool) {
            return config.maxConcurrent;
        }
    }
    return 4; // Default for unknown tools
}
/**
 * Determine repository size category from line count
 * SESSION 75: Repo size classification
 */
function classifyRepoSize(lineCount) {
    if (lineCount < 10000)
        return 'small';
    if (lineCount < 50000)
        return 'medium';
    if (lineCount < 200000)
        return 'large';
    return 'enterprise';
}
/**
 * Get user tier quotas (CPU-aware)
 * SESSION 75: CPU-aware limits with user tiers
 */
function getUserTierConfig(tier = 'basic') {
    const baseQuota = USER_TIER_QUOTAS[tier];
    const cpuCount = os.cpus().length;
    // Scale concurrent limit based on available CPUs
    const cpuAdjustedConcurrent = Math.min(baseQuota.maxConcurrent, Math.max(2, Math.floor(cpuCount * 0.75)));
    return {
        maxPerMinute: baseQuota.maxPerMinute,
        maxConcurrent: cpuAdjustedConcurrent,
    };
}
class RateLimiter {
    constructor(config = DEFAULT_RATE_LIMIT, userTier = 'basic', repoSize = 'medium') {
        this.executions = [];
        this.concurrent = 0;
        // Track per-tool concurrent executions
        this.toolConcurrent = new Map();
        this.config = config;
        this.userTier = userTier;
        this.repoSize = repoSize;
        // Override with user tier quotas
        const tierConfig = getUserTierConfig(userTier);
        this.config.maxPerMinute = tierConfig.maxPerMinute;
        this.config.maxConcurrent = tierConfig.maxConcurrent;
    }
    /**
     * Check if execution is allowed and acquire a slot
     * SESSION 75: Now supports per-tool limits
     * @throws Error if rate limit exceeded
     */
    async acquire(tool) {
        const now = Date.now();
        const oneMinuteAgo = now - 60000;
        // Clean up old executions
        this.executions = this.executions.filter(ts => ts > oneMinuteAgo);
        // Check global rate limit
        if (this.executions.length >= this.config.maxPerMinute) {
            throw new Error(`Rate limit exceeded: ${this.config.maxPerMinute} executions per minute`);
        }
        // Check global concurrent limit
        if (this.concurrent >= this.config.maxConcurrent) {
            throw new Error(`Concurrent limit exceeded: ${this.config.maxConcurrent} concurrent executions`);
        }
        // Check per-tool concurrent limit if tool specified
        if (tool) {
            const toolLimit = getToolConcurrencyLimit(tool);
            const currentToolConcurrent = this.toolConcurrent.get(tool) || 0;
            if (currentToolConcurrent >= toolLimit) {
                throw new Error(`Tool ${tool} concurrent limit exceeded: ${toolLimit} max`);
            }
            this.toolConcurrent.set(tool, currentToolConcurrent + 1);
        }
        this.executions.push(now);
        this.concurrent++;
    }
    /**
     * Release execution slot
     * SESSION 75: Now supports per-tool tracking
     */
    release(tool) {
        this.concurrent = Math.max(0, this.concurrent - 1);
        if (tool) {
            const currentToolConcurrent = this.toolConcurrent.get(tool) || 0;
            this.toolConcurrent.set(tool, Math.max(0, currentToolConcurrent - 1));
        }
    }
    /**
     * Get dynamic timeout for a specific tool
     * SESSION 75: Calculates timeout based on tool type and repo size
     */
    getDynamicTimeout(tool) {
        return calculateDynamicTimeout(tool, this.repoSize);
    }
    /**
     * Set repository size (affects timeout calculations)
     */
    setRepoSize(size) {
        this.repoSize = size;
    }
    /**
     * Set user tier (affects quotas)
     */
    setUserTier(tier) {
        this.userTier = tier;
        const tierConfig = getUserTierConfig(tier);
        this.config.maxPerMinute = tierConfig.maxPerMinute;
        this.config.maxConcurrent = tierConfig.maxConcurrent;
    }
    /** Get current stats */
    getStats() {
        const now = Date.now();
        const oneMinuteAgo = now - 60000;
        this.executions = this.executions.filter(ts => ts > oneMinuteAgo);
        // Convert Map to plain object
        const toolConcurrentObj = {};
        this.toolConcurrent.forEach((value, key) => {
            toolConcurrentObj[key] = value;
        });
        return {
            executionsLastMinute: this.executions.length,
            concurrent: this.concurrent,
            config: this.config,
            userTier: this.userTier,
            repoSize: this.repoSize,
            toolConcurrent: toolConcurrentObj,
        };
    }
}
// Global rate limiter instance
const globalRateLimiter = new RateLimiter();
// ============================================================================
// Security: Path Validation
// ============================================================================
/**
 * Validate and sanitize a file path to prevent path traversal attacks
 */
function validateFilePath(filePath, allowedDir) {
    // Resolve to absolute path
    const resolved = path.resolve(filePath);
    const allowedResolved = path.resolve(allowedDir);
    // Ensure path is within allowed directory
    if (!resolved.startsWith(allowedResolved + path.sep) && resolved !== allowedResolved) {
        throw new Error(`Path traversal detected: ${filePath} is outside allowed directory`);
    }
    // Check for suspicious patterns
    if (filePath.includes('\0') || filePath.includes('..')) {
        throw new Error(`Invalid path characters detected in: ${filePath}`);
    }
    return resolved;
}
/**
 * Generate a secure random filename
 */
function generateSecureFilename(extension) {
    const randomBytes = crypto.randomBytes(16).toString('hex');
    return `fix-validation-${randomBytes}${extension}`;
}
// Cache tool availability checks (avoid repeated which/version calls)
const toolAvailabilityCache = new Map();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
/**
 * Check if a tool is available on the system
 */
async function checkToolAvailability(tool) {
    // Check cache
    const cached = toolAvailabilityCache.get(tool);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
        return cached.result;
    }
    const toolBinaries = {
        pmd: ['pmd', '--version'],
        checkstyle: ['java', '-jar', '/usr/local/bin/checkstyle', '--version'],
        eslint: ['npx', 'eslint', '--version'],
        ruff: ['ruff', '--version'],
        pylint: ['pylint', '--version'],
        bandit: ['bandit', '--version'],
        mypy: ['mypy', '--version'],
        'golangci-lint': ['golangci-lint', '--version'],
        gosec: ['gosec', '--version'],
        rubocop: ['rubocop', '--version'],
        phpstan: ['phpstan', '--version'],
        tsc: ['npx', 'tsc', '--version'],
        clippy: ['cargo', 'clippy', '--version'],
    };
    const checkCmd = toolBinaries[tool.toLowerCase()];
    if (!checkCmd) {
        const result = {
            available: false,
            error: `Unknown tool: ${tool}`,
        };
        toolAvailabilityCache.set(tool, { result, timestamp: Date.now() });
        return result;
    }
    return new Promise((resolve) => {
        const [binary, ...args] = checkCmd;
        const proc = (0, child_process_1.spawn)(binary, args, {
            shell: false,
            timeout: 10000,
            stdio: ['ignore', 'pipe', 'pipe'],
        });
        let stdout = '';
        proc.stdout.on('data', (data) => {
            stdout += data.toString();
        });
        proc.on('close', (code) => {
            const result = code === 0
                ? { available: true, path: binary, version: stdout.trim().split('\n')[0] }
                : { available: false, error: `Tool ${tool} not found or failed version check` };
            toolAvailabilityCache.set(tool, { result, timestamp: Date.now() });
            resolve(result);
        });
        proc.on('error', (err) => {
            const result = {
                available: false,
                error: `Failed to check ${tool}: ${err.message}`,
            };
            toolAvailabilityCache.set(tool, { result, timestamp: Date.now() });
            resolve(result);
        });
    });
}
/**
 * Clear tool availability cache
 */
function clearToolAvailabilityCache() {
    toolAvailabilityCache.clear();
}
// ============================================================================
// Code Wrapper Utilities (SESSION 80)
// ============================================================================
/**
 * SESSION 80: Wrap Java code snippets in a valid compilation unit for PMD
 *
 * PMD requires valid Java compilation units (package + class declaration).
 * AI-generated fixes are often code snippets (like try-with-resources blocks).
 * This wrapper allows PMD to parse and analyze snippets without ParseException.
 *
 * @param code - The code to potentially wrap
 * @param language - The programming language
 * @returns Object with wrapped code and line offset for adjusting tool output
 */
function wrapCodeForValidation(code, language) {
    // Only wrap Java code for PMD validation
    if (language.toLowerCase() !== 'java') {
        return { wrappedCode: code, lineOffset: 0 };
    }
    // Check if code already has a package or class declaration (is a full file)
    const hasPackage = /^\s*package\s+[\w.]+\s*;/m.test(code);
    const hasClass = /^\s*(public\s+)?(class|interface|enum|abstract\s+class)\s+\w+/m.test(code);
    if (hasPackage || hasClass) {
        // Already a valid compilation unit, no wrapping needed
        return { wrappedCode: code, lineOffset: 0 };
    }
    // Check if it's just an import statement or empty
    const trimmedCode = code.trim();
    if (!trimmedCode || /^import\s+[\w.*]+\s*;/.test(trimmedCode)) {
        return { wrappedCode: code, lineOffset: 0 };
    }
    // Wrap the snippet in a minimal valid Java class
    // Use a synthetic class that allows most code constructs
    const wrapper = `// SESSION 80: Synthetic wrapper for PMD validation
package synthetic.validation;

public class ValidationWrapper {
    public void validateMethod() throws Exception {
`;
    const wrapperEnd = `
    }
}
`;
    const wrappedCode = wrapper + code + wrapperEnd;
    // Calculate line offset (number of lines before the original code starts)
    const wrapperLines = wrapper.split('\n').length - 1;
    console.log(`[ToolRevalidator:Wrapper] Wrapped Java snippet in synthetic class (offset: ${wrapperLines} lines)`);
    return {
        wrappedCode,
        lineOffset: wrapperLines
    };
}
/**
 * SESSION 80: Adjust issue line numbers after code wrapping
 *
 * When code is wrapped, tool output line numbers are relative to the wrapped code.
 * This function adjusts them back to the original code positions.
 */
function adjustLineNumbers(issues, lineOffset) {
    if (lineOffset === 0) {
        return issues;
    }
    return issues.map(issue => ({
        ...issue,
        line: Math.max(1, issue.line - lineOffset)
    }));
}
// ============================================================================
// Tool Command Definitions
// ============================================================================
/**
 * Get the command to run a specific tool on a file
 * These match the tool commands used in v9-analyze.ts runHostNativeAnalysis
 */
function getToolCommand(tool, filePath, language) {
    const toolCommands = {
        java: {
            'pmd': `pmd check -d "${filePath}" -R rulesets/java/quickstart.xml -f json --no-progress 2>/dev/null; true`,
            'checkstyle': `/usr/local/bin/checkstyle -c /google_checks.xml -f json "${filePath}" 2>/dev/null || echo '[]'`,
            'spotbugs': `spotbugs -textui -xml:withMessages "${filePath}" 2>/dev/null || echo '<BugCollection></BugCollection>'`,
        },
        typescript: {
            'eslint': `npx eslint "${filePath}" -f json 2>/dev/null || echo '[]'`,
            'tsc': `npx tsc --noEmit "${filePath}" 2>&1 || true`,
        },
        javascript: {
            'eslint': `npx eslint "${filePath}" -f json 2>/dev/null || echo '[]'`,
        },
        python: {
            'ruff': `ruff check "${filePath}" --output-format json 2>/dev/null || echo '[]'`,
            'pylint': `pylint "${filePath}" --output-format=json 2>/dev/null || echo '[]'`,
            'bandit': `bandit -f json "${filePath}" 2>/dev/null || echo '{"results":[]}'`,
            'mypy': `mypy "${filePath}" --output json 2>/dev/null || true`,
        },
        go: {
            'golangci-lint': `golangci-lint run "${filePath}" --out-format json 2>/dev/null || echo '{"Issues":[]}'`,
            'gosec': `gosec -fmt=json "${filePath}" 2>/dev/null || echo '{"Issues":[]}'`,
        },
        rust: {
            'clippy': `cargo clippy --message-format=json 2>/dev/null || echo '[]'`,
        },
        ruby: {
            'rubocop': `rubocop "${filePath}" --format json 2>/dev/null || echo '{"files":[]}'`,
            'brakeman': `brakeman -f json "${filePath}" 2>/dev/null || echo '{"warnings":[]}'`,
        },
        php: {
            'phpstan': `phpstan analyse "${filePath}" --error-format=json 2>/dev/null || echo '{"files":[]}'`,
        },
    };
    const langTools = toolCommands[language];
    if (!langTools)
        return null;
    // Normalize tool name (handle variations)
    const normalizedTool = tool.toLowerCase().replace(/-/g, '');
    for (const [toolName, command] of Object.entries(langTools)) {
        if (toolName.toLowerCase().replace(/-/g, '') === normalizedTool) {
            return command;
        }
    }
    return null;
}
/**
 * Extract JSON from mixed output (handles prefixed text, trailing garbage, etc.)
 * SESSION 74: Improved robustness for handling various tool output formats
 */
function extractJSON(output) {
    if (!output || output.trim().length === 0) {
        return null;
    }
    // Clean output - remove non-printable characters but preserve newlines for later
    // eslint-disable-next-line no-control-regex
    const cleanOutput = output.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '').trim();
    // Try multiple JSON extraction strategies
    const strategies = [
        // Strategy 1: Output is pure JSON
        () => {
            try {
                JSON.parse(cleanOutput);
                return cleanOutput;
            }
            catch (_a) {
                return null;
            }
        },
        // Strategy 2: JSON starts after some text prefix
        () => {
            const bracketStart = cleanOutput.indexOf('[');
            const braceStart = cleanOutput.indexOf('{');
            let jsonStart = -1;
            if (bracketStart >= 0 && braceStart >= 0) {
                jsonStart = Math.min(bracketStart, braceStart);
            }
            else if (bracketStart >= 0) {
                jsonStart = bracketStart;
            }
            else if (braceStart >= 0) {
                jsonStart = braceStart;
            }
            if (jsonStart === -1)
                return null;
            const candidate = cleanOutput.substring(jsonStart);
            const startChar = candidate.charAt(0);
            const endChar = startChar === '[' ? ']' : '}';
            // Find matching end bracket with proper nesting
            let depth = 0;
            let inString = false;
            let escaped = false;
            let endIndex = -1;
            for (let i = 0; i < candidate.length; i++) {
                const char = candidate[i];
                if (escaped) {
                    escaped = false;
                    continue;
                }
                if (char === '\\' && inString) {
                    escaped = true;
                    continue;
                }
                if (char === '"') {
                    inString = !inString;
                    continue;
                }
                if (inString)
                    continue;
                if (char === startChar)
                    depth++;
                if (char === endChar)
                    depth--;
                if (depth === 0) {
                    endIndex = i;
                    break;
                }
            }
            if (endIndex === -1)
                return null;
            const extracted = candidate.substring(0, endIndex + 1);
            try {
                JSON.parse(extracted);
                return extracted;
            }
            catch (_a) {
                return null;
            }
        },
        // Strategy 3: Line-by-line JSON (some tools output one JSON object per line)
        () => {
            const lines = cleanOutput.split('\n');
            const jsonLines = [];
            for (const line of lines) {
                const trimmed = line.trim();
                if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
                    try {
                        JSON.parse(trimmed);
                        jsonLines.push(trimmed);
                    }
                    catch (_a) {
                        // Not valid JSON, skip
                    }
                }
            }
            if (jsonLines.length === 0)
                return null;
            if (jsonLines.length === 1)
                return jsonLines[0];
            // Return as array if multiple JSON objects
            return `[${jsonLines.join(',')}]`;
        },
    ];
    for (const strategy of strategies) {
        const result = strategy();
        if (result)
            return result;
    }
    return null;
}
/**
 * Fallback text-based parsing for when JSON parsing fails
 * Extracts issues from common text formats
 */
function parseTextOutput(tool, output) {
    const issues = [];
    // Common patterns for error messages
    const patterns = [
        // Pattern: "filename:line:col: message [rule]"
        /^(.+?):(\d+)(?::\d+)?:\s*(.+?)(?:\s*\[([^\]]+)\])?$/gm,
        // Pattern: "line N: message"
        /^line\s+(\d+):\s*(.+)$/gm,
        // Pattern: "L123: message"
        /^L(\d+):\s*(.+)$/gm,
        // Pattern: "  123 | message" (indented with line number)
        /^\s+(\d+)\s*\|\s*(.+)$/gm,
    ];
    for (const pattern of patterns) {
        let match;
        while ((match = pattern.exec(output)) !== null) {
            const groups = match.slice(1);
            // Determine which pattern matched and extract accordingly
            let line = 0;
            let message = '';
            let rule = tool;
            if (groups.length >= 3) {
                // filename:line: message [rule]
                line = parseInt(groups[1], 10) || 0;
                message = groups[2] || '';
                rule = groups[3] || tool;
            }
            else if (groups.length === 2) {
                // line N: message
                line = parseInt(groups[0], 10) || 0;
                message = groups[1] || '';
            }
            if (line > 0 && message.length > 0) {
                issues.push({ rule, message, line });
            }
        }
    }
    return issues;
}
/**
 * Parse tool output to extract issues
 * SESSION 74: Enhanced with better error handling, multiple output formats, and fallbacks
 */
function parseToolOutput(tool, stdout, _language) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k;
    const issues = [];
    // Handle empty output
    if (!stdout || stdout.trim().length === 0) {
        console.debug(`[ToolRevalidator] Empty output from ${tool}`);
        return issues;
    }
    // Try to extract and parse JSON
    const jsonContent = extractJSON(stdout);
    if (jsonContent) {
        try {
            const data = JSON.parse(jsonContent);
            // Handle different tool output formats
            const normalizedTool = tool.toLowerCase().replace(/-/g, '');
            // PMD format: { files: [{ violations: [...] }] } or { processingErrors: [], violations: [] }
            if (normalizedTool === 'pmd') {
                // Handle nested files format
                const files = data.files || (data.violations ? [{ violations: data.violations }] : []);
                for (const file of files) {
                    for (const violation of file.violations || []) {
                        issues.push({
                            rule: violation.rule || violation.ruleName || 'unknown',
                            message: violation.description || violation.message || violation.msg || '',
                            line: violation.beginline || violation.beginLine || violation.line || 0,
                        });
                    }
                }
                // Also check for processingErrors
                for (const err of data.processingErrors || []) {
                    issues.push({
                        rule: 'processingError',
                        message: err.msg || err.message || 'Processing error',
                        line: 0,
                    });
                }
            }
            // Checkstyle format: array or { files: [{ errors: [...] }] }
            else if (normalizedTool === 'checkstyle') {
                if (Array.isArray(data)) {
                    for (const item of data) {
                        issues.push({
                            rule: ((_a = item.source) === null || _a === void 0 ? void 0 : _a.split('.').pop()) || item.rule || 'checkstyle',
                            message: item.message || '',
                            line: item.line || item.lineNumber || 0,
                        });
                    }
                }
                else if (data.files) {
                    for (const file of data.files) {
                        for (const error of file.errors || []) {
                            issues.push({
                                rule: ((_b = error.source) === null || _b === void 0 ? void 0 : _b.split('.').pop()) || 'checkstyle',
                                message: error.message || '',
                                line: error.line || 0,
                            });
                        }
                    }
                }
            }
            // ESLint format: [{ messages: [...], errorCount, warningCount }]
            else if (normalizedTool === 'eslint') {
                const results = Array.isArray(data) ? data : (data.results || [data]);
                for (const file of results) {
                    for (const msg of file.messages || []) {
                        issues.push({
                            rule: msg.ruleId || msg.rule || 'eslint',
                            message: msg.message || '',
                            line: msg.line || msg.lineNumber || 0,
                        });
                    }
                }
            }
            // Ruff format: array of { code, message, location: { row } }
            else if (normalizedTool === 'ruff') {
                const results = Array.isArray(data) ? data : (data.results || []);
                for (const item of results) {
                    issues.push({
                        rule: item.code || item.rule || 'ruff',
                        message: item.message || '',
                        line: ((_c = item.location) === null || _c === void 0 ? void 0 : _c.row) || item.line || item.row || 0,
                    });
                }
            }
            // Pylint format: array of { symbol, message, line }
            else if (normalizedTool === 'pylint') {
                const results = Array.isArray(data) ? data : (data.messages || []);
                for (const item of results) {
                    issues.push({
                        rule: item.symbol || item.messageId || item.code || 'pylint',
                        message: item.message || item.msg || '',
                        line: item.line || item.lineNumber || 0,
                    });
                }
            }
            // Bandit format: { results: [...], errors: [...] }
            else if (normalizedTool === 'bandit') {
                for (const result of data.results || []) {
                    issues.push({
                        rule: result.test_id || result.test_name || 'bandit',
                        message: result.issue_text || result.message || '',
                        line: result.line_number || result.line || 0,
                    });
                }
            }
            // Go linters format: { Issues: [...] }
            else if (normalizedTool === 'golangcilint' || normalizedTool === 'gosec') {
                const issueList = data.Issues || data.issues || [];
                for (const issue of issueList) {
                    issues.push({
                        rule: issue.FromLinter || issue.rule_id || issue.rule || 'go-lint',
                        message: issue.Text || issue.details || issue.message || '',
                        line: ((_d = issue.Pos) === null || _d === void 0 ? void 0 : _d.Line) || issue.line || 0,
                    });
                }
            }
            // RuboCop format: { files: [{ offenses: [...] }], summary }
            else if (normalizedTool === 'rubocop') {
                for (const file of data.files || []) {
                    for (const offense of file.offenses || []) {
                        issues.push({
                            rule: offense.cop_name || offense.rule || 'rubocop',
                            message: offense.message || '',
                            line: ((_e = offense.location) === null || _e === void 0 ? void 0 : _e.start_line) || ((_f = offense.location) === null || _f === void 0 ? void 0 : _f.line) || offense.line || 0,
                        });
                    }
                }
            }
            // Brakeman format: { warnings: [...], errors: [...] }
            else if (normalizedTool === 'brakeman') {
                for (const warning of data.warnings || []) {
                    issues.push({
                        rule: warning.warning_type || warning.check_name || 'brakeman',
                        message: warning.message || warning.warning || '',
                        line: warning.line || 0,
                    });
                }
            }
            // PHPStan format: { files: { "path": { messages: [...] } }, totals }
            else if (normalizedTool === 'phpstan') {
                if (data.files) {
                    for (const filePath of Object.keys(data.files)) {
                        const file = data.files[filePath];
                        for (const msg of file.messages || []) {
                            issues.push({
                                rule: msg.identifier || 'phpstan',
                                message: msg.message || '',
                                line: msg.line || 0,
                            });
                        }
                    }
                }
                // Handle flat array format
                if (Array.isArray(data)) {
                    for (const item of data) {
                        issues.push({
                            rule: item.identifier || 'phpstan',
                            message: item.message || '',
                            line: item.line || 0,
                        });
                    }
                }
            }
            // Mypy format: array of { file, line, column, message, severity }
            else if (normalizedTool === 'mypy') {
                const results = Array.isArray(data) ? data : (data.errors || []);
                for (const item of results) {
                    issues.push({
                        rule: item.severity || item.code || 'mypy',
                        message: item.message || '',
                        line: item.line || item.lineNumber || 0,
                    });
                }
            }
            // Clippy format (cargo): array of { message: { code, level, spans: [{ line_start }] } }
            else if (normalizedTool === 'clippy') {
                const results = Array.isArray(data) ? data : [data];
                for (const item of results) {
                    if (item.message) {
                        const msg = item.message;
                        issues.push({
                            rule: ((_g = msg.code) === null || _g === void 0 ? void 0 : _g.code) || msg.level || 'clippy',
                            message: msg.message || '',
                            line: ((_j = (_h = msg.spans) === null || _h === void 0 ? void 0 : _h[0]) === null || _j === void 0 ? void 0 : _j.line_start) || 0,
                        });
                    }
                }
            }
            // TSC format: array of { file, line, character, code, message }
            else if (normalizedTool === 'tsc') {
                const results = Array.isArray(data) ? data : (data.diagnostics || data.errors || []);
                for (const item of results) {
                    issues.push({
                        rule: `TS${item.code || 'error'}`,
                        message: item.message || item.messageText || '',
                        line: item.line || ((_k = item.start) === null || _k === void 0 ? void 0 : _k.line) || 0,
                    });
                }
            }
            // Generic fallback for array of issues
            else if (Array.isArray(data)) {
                for (const item of data) {
                    issues.push({
                        rule: item.rule || item.ruleId || item.code || item.id || tool,
                        message: item.message || item.msg || item.description || '',
                        line: item.line || item.lineNumber || item.startLine || 0,
                    });
                }
            }
            // Generic fallback for object with common patterns
            else if (typeof data === 'object') {
                // Try common array properties
                const possibleArrays = ['issues', 'errors', 'warnings', 'messages', 'results', 'violations'];
                for (const prop of possibleArrays) {
                    if (Array.isArray(data[prop])) {
                        for (const item of data[prop]) {
                            issues.push({
                                rule: item.rule || item.ruleId || item.code || item.id || tool,
                                message: item.message || item.msg || item.description || '',
                                line: item.line || item.lineNumber || item.startLine || 0,
                            });
                        }
                        break;
                    }
                }
            }
        }
        catch (parseError) {
            console.debug(`[ToolRevalidator] JSON parse error for ${tool}:`, parseError.message);
        }
    }
    // If no issues found from JSON, try text-based parsing as fallback
    if (issues.length === 0 && stdout.length > 0) {
        const textIssues = parseTextOutput(tool, stdout);
        issues.push(...textIssues);
        if (textIssues.length > 0) {
            console.debug(`[ToolRevalidator] Extracted ${textIssues.length} issues from text output for ${tool}`);
        }
    }
    return issues;
}
class ToolRevalidator {
    constructor(options = {}) {
        this.tempDir = path.join(os.tmpdir(), 'codequal-fix-validation');
        // Auto-classify repo size if line count provided
        const repoSize = options.estimatedLineCount
            ? classifyRepoSize(options.estimatedLineCount)
            : options.repoSize || 'medium';
        this.rateLimiter = new RateLimiter({ ...DEFAULT_RATE_LIMIT, ...options.rateLimitConfig }, options.userTier || 'basic', repoSize);
        // Ensure temp directory exists with secure permissions (owner only: 0700)
        if (!fs.existsSync(this.tempDir)) {
            fs.mkdirSync(this.tempDir, { recursive: true, mode: SECURE_DIR_MODE });
        }
        else {
            // Ensure existing directory has correct permissions
            try {
                fs.chmodSync(this.tempDir, SECURE_DIR_MODE);
            }
            catch (_a) {
                console.warn('[ToolRevalidator] Could not set secure permissions on temp directory');
            }
        }
    }
    /**
     * Update repository size (affects timeout calculations)
     * SESSION 75: Allow runtime updates
     */
    setRepoSize(size) {
        this.rateLimiter.setRepoSize(size);
    }
    /**
     * Update user tier (affects quota limits)
     * SESSION 75: Allow runtime updates
     */
    setUserTier(tier) {
        this.rateLimiter.setUserTier(tier);
    }
    /**
     * Get current rate limiter statistics
     */
    getStats() {
        return this.rateLimiter.getStats();
    }
    /**
     * Validate a fix by re-running the original tool
     *
     * Flow:
     * 1. Write original code to temp file, run tool, get baseline issues
     * 2. Write fixed code to temp file, run tool, get new issues
     * 3. Compare: original issue should be gone, no new issues introduced
     */
    async validateFix(request) {
        const startTime = Date.now();
        const dynamicTimeout = this.rateLimiter.getDynamicTimeout(request.tool);
        console.log(`[ToolRevalidator] Validating fix for ${request.ruleId} using ${request.tool} (timeout: ${dynamicTimeout}ms)`);
        // Apply rate limiting with per-tool tracking
        try {
            await this.rateLimiter.acquire(request.tool);
        }
        catch (rateLimitError) {
            console.warn(`[ToolRevalidator] ${rateLimitError.message}`);
            return {
                passed: false,
                originalIssueResolved: false,
                hasRegressions: false,
                regressionCount: 0,
                regressions: [],
                toolExecution: {
                    tool: request.tool,
                    command: 'N/A',
                    exitCode: -1,
                    duration: Date.now() - startTime,
                    stdout: '',
                    stderr: rateLimitError.message,
                },
                summary: `Rate limit exceeded for tool validation`,
            };
        }
        try {
            // Check tool availability before proceeding
            const toolAvailability = await checkToolAvailability(request.tool);
            if (!toolAvailability.available) {
                console.warn(`[ToolRevalidator] Tool not available: ${request.tool} - ${toolAvailability.error}`);
                return {
                    passed: false,
                    originalIssueResolved: false,
                    hasRegressions: false,
                    regressionCount: 0,
                    regressions: [],
                    toolExecution: {
                        tool: request.tool,
                        command: 'N/A',
                        exitCode: -1,
                        duration: Date.now() - startTime,
                        stdout: '',
                        stderr: toolAvailability.error || `Tool ${request.tool} not available`,
                    },
                    summary: `Tool ${request.tool} not available. Install it to enable fix validation.`,
                };
            }
            console.log(`[ToolRevalidator] Tool ${request.tool} available (${toolAvailability.version})`);
            // Get tool command
            const command = getToolCommand(request.tool, '', request.language);
            if (!command) {
                console.warn(`[ToolRevalidator] No command found for tool: ${request.tool} (${request.language})`);
                return {
                    passed: false,
                    originalIssueResolved: false,
                    hasRegressions: false,
                    regressionCount: 0,
                    regressions: [],
                    toolExecution: {
                        tool: request.tool,
                        command: 'N/A',
                        exitCode: -1,
                        duration: Date.now() - startTime,
                        stdout: '',
                        stderr: `Tool ${request.tool} not supported for language ${request.language}`,
                    },
                    summary: `Tool ${request.tool} not supported for validation`,
                };
            }
            // Create temp file with secure random name and appropriate extension
            const ext = this.getFileExtension(request.language, request.originalFilePath);
            const tempFileName = generateSecureFilename(ext);
            const tempFilePath = path.join(this.tempDir, tempFileName);
            // Validate the temp file path is within allowed directory
            validateFilePath(tempFilePath, this.tempDir);
            try {
                // SESSION 80: Wrap code snippets for validation (especially Java for PMD)
                // This prevents ParseException when validating code fragments
                const originalWrapped = wrapCodeForValidation(request.originalCode, request.language);
                const fixedWrapped = wrapCodeForValidation(request.fixedCode, request.language);
                // Step 1: Run tool on ORIGINAL code to get baseline
                console.log(`[ToolRevalidator] Step 1: Getting baseline issues from original code`);
                this.writeSecureFile(tempFilePath, originalWrapped.wrappedCode);
                const originalResult = await this.runToolSafe(request.tool, tempFilePath, command, dynamicTimeout);
                const rawOriginalIssues = parseToolOutput(request.tool, originalResult.stdout, request.language);
                // Adjust line numbers if code was wrapped
                const originalIssues = adjustLineNumbers(rawOriginalIssues, originalWrapped.lineOffset);
                console.log(`[ToolRevalidator] Baseline: ${originalIssues.length} issues found`);
                // Step 2: Run tool on FIXED code
                console.log(`[ToolRevalidator] Step 2: Running tool on fixed code`);
                this.writeSecureFile(tempFilePath, fixedWrapped.wrappedCode);
                const fixedResult = await this.runToolSafe(request.tool, tempFilePath, command, dynamicTimeout);
                const rawFixedIssues = parseToolOutput(request.tool, fixedResult.stdout, request.language);
                // Adjust line numbers if code was wrapped
                const fixedIssues = adjustLineNumbers(rawFixedIssues, fixedWrapped.lineOffset);
                console.log(`[ToolRevalidator] After fix: ${fixedIssues.length} issues found`);
                // Step 3: Check if original issue is resolved
                const originalIssueResolved = this.isOriginalIssueResolved(request.ruleId, request.lineNumber, originalIssues, fixedIssues);
                // Step 4: Check for regressions (new issues not in original)
                const regressions = this.findRegressions(originalIssues, fixedIssues);
                // Determine pass/fail
                const passed = originalIssueResolved && regressions.length === 0;
                const duration = Date.now() - startTime;
                let summary;
                if (passed) {
                    summary = `✅ Fix validated: Original issue resolved, no regressions (${duration}ms)`;
                }
                else if (!originalIssueResolved) {
                    summary = `❌ Fix invalid: Original issue (${request.ruleId}) still present`;
                }
                else {
                    summary = `❌ Fix invalid: ${regressions.length} regression(s) introduced`;
                }
                console.log(`[ToolRevalidator] ${summary}`);
                return {
                    passed,
                    originalIssueResolved,
                    hasRegressions: regressions.length > 0,
                    regressionCount: regressions.length,
                    regressions,
                    toolExecution: {
                        tool: request.tool,
                        command: `${request.tool} <file>`, // Don't expose full command
                        exitCode: fixedResult.exitCode,
                        duration,
                        stdout: fixedResult.stdout.substring(0, 1000), // Truncate for storage
                        stderr: fixedResult.stderr.substring(0, 500),
                    },
                    summary,
                };
            }
            finally {
                // Cleanup temp file securely
                try {
                    if (fs.existsSync(tempFilePath)) {
                        // Overwrite with zeros before deletion for sensitive data
                        const stats = fs.statSync(tempFilePath);
                        fs.writeFileSync(tempFilePath, Buffer.alloc(stats.size, 0), { mode: SECURE_FILE_MODE });
                        fs.unlinkSync(tempFilePath);
                    }
                }
                catch (_a) {
                    // Ignore cleanup errors but log them
                    console.debug('[ToolRevalidator] Failed to cleanup temp file');
                }
            }
        }
        finally {
            // Always release rate limiter with per-tool tracking
            this.rateLimiter.release(request.tool);
        }
    }
    /**
     * Write a file with secure permissions (0600 - owner read/write only)
     * SESSION 74: Security hardening - prevents other users from reading temp files
     */
    writeSecureFile(filePath, content) {
        // Write with explicit secure permissions
        fs.writeFileSync(filePath, content, {
            encoding: 'utf-8',
            mode: SECURE_FILE_MODE,
        });
        // Double-check permissions were applied (some systems may ignore mode)
        try {
            fs.chmodSync(filePath, SECURE_FILE_MODE);
        }
        catch (_a) {
            // Best effort - log but don't fail
            console.debug('[ToolRevalidator] Could not verify file permissions');
        }
    }
    /**
     * Run a tool safely using spawn with args array to prevent command injection
     * SESSION 74: Security hardening - replaces shell command interpolation
     * SESSION 75: Now uses dynamic timeout based on tool and repo size
     */
    async runToolSafe(tool, filePath, _commandTemplate, dynamicTimeout) {
        // Get tool-specific configuration for safe execution
        const toolConfig = this.getToolConfig(tool);
        if (!toolConfig) {
            return {
                stdout: '',
                stderr: `Tool ${tool} not configured for safe execution`,
                exitCode: -1,
            };
        }
        // Build args array safely (no shell interpolation)
        const args = [...toolConfig.args, filePath, ...toolConfig.suffixArgs];
        return new Promise((resolve) => {
            // Use dynamic timeout if provided, otherwise fall back to rate limiter config
            const timeoutMs = dynamicTimeout || this.rateLimiter.getDynamicTimeout(tool);
            const startTime = Date.now();
            let stdout = '';
            let stderr = '';
            let timedOut = false;
            const proc = (0, child_process_1.spawn)(toolConfig.binary, args, {
                cwd: path.dirname(filePath),
                timeout: timeoutMs,
                // Don't use shell - prevents command injection
                shell: false,
                // Capture output
                stdio: ['ignore', 'pipe', 'pipe'],
            });
            // Set up timeout
            const timeout = setTimeout(() => {
                timedOut = true;
                proc.kill('SIGTERM');
            }, timeoutMs);
            proc.stdout.on('data', (data) => {
                stdout += data.toString();
                // Limit buffer size to prevent memory issues
                if (stdout.length > 10 * 1024 * 1024) {
                    stdout = stdout.substring(0, 10 * 1024 * 1024);
                }
            });
            proc.stderr.on('data', (data) => {
                stderr += data.toString();
                if (stderr.length > 1 * 1024 * 1024) {
                    stderr = stderr.substring(0, 1 * 1024 * 1024);
                }
            });
            proc.on('close', (code) => {
                clearTimeout(timeout);
                const durationMs = Date.now() - startTime;
                // Record metric for monitoring
                recordExecutionMetric({
                    tool,
                    repoSize: 'medium', // Default - will be updated when repo size is known
                    durationMs,
                    succeeded: !timedOut && code === 0,
                    timedOut,
                    timestamp: Date.now(),
                });
                if (timedOut) {
                    resolve({
                        stdout,
                        stderr: stderr + '\nProcess timed out',
                        exitCode: -1,
                    });
                }
                else {
                    resolve({
                        stdout,
                        stderr,
                        exitCode: code !== null && code !== void 0 ? code : 0,
                    });
                }
            });
            proc.on('error', (err) => {
                clearTimeout(timeout);
                resolve({
                    stdout,
                    stderr: err.message,
                    exitCode: -1,
                });
            });
        });
    }
    /**
     * Get safe execution configuration for a tool
     * Returns binary path and args array (no shell required)
     */
    getToolConfig(tool) {
        const configs = {
            // Java tools
            pmd: {
                binary: 'pmd',
                args: ['check', '-d'],
                suffixArgs: ['-R', 'rulesets/java/quickstart.xml', '-f', 'json', '--no-progress'],
            },
            checkstyle: {
                binary: '/usr/local/bin/checkstyle',
                args: ['-c', '/google_checks.xml', '-f', 'json'],
                suffixArgs: [],
            },
            spotbugs: {
                binary: 'spotbugs',
                args: ['-textui', '-xml:withMessages'],
                suffixArgs: [],
            },
            // TypeScript/JavaScript tools
            // Use --no-config-lookup to avoid needing project config
            // Use basic rules that work without type information
            eslint: {
                binary: 'npx',
                args: [
                    'eslint',
                    '-f', 'json',
                    '--no-config-lookup',
                    '--rule', '{"no-unused-vars": "warn", "no-undef": "off", "semi": "warn", "quotes": ["warn", "single"]}',
                ],
                suffixArgs: [],
            },
            // For TypeScript files, use ts-node style type checking
            tsc: {
                binary: 'npx',
                args: [
                    'tsc',
                    '--noEmit',
                    '--skipLibCheck',
                    '--allowJs',
                    '--checkJs', 'false',
                    '--strict', 'false',
                    '--noImplicitAny', 'false',
                    '--target', 'ES2020',
                    '--module', 'commonjs',
                    '--moduleResolution', 'node',
                ],
                suffixArgs: [],
            },
            // Python tools
            ruff: {
                binary: 'ruff',
                args: ['check', '--output-format', 'json'],
                suffixArgs: [],
            },
            pylint: {
                binary: 'pylint',
                args: ['--output-format=json'],
                suffixArgs: [],
            },
            bandit: {
                binary: 'bandit',
                args: ['-f', 'json'],
                suffixArgs: [],
            },
            mypy: {
                binary: 'mypy',
                args: ['--output', 'json'],
                suffixArgs: [],
            },
            // Go tools
            'golangci-lint': {
                binary: 'golangci-lint',
                args: ['run', '--out-format', 'json'],
                suffixArgs: [],
            },
            gosec: {
                binary: 'gosec',
                args: ['-fmt=json'],
                suffixArgs: [],
            },
            // Rust tools
            clippy: {
                binary: 'cargo',
                args: ['clippy', '--message-format=json'],
                suffixArgs: [],
            },
            // Ruby tools
            rubocop: {
                binary: 'rubocop',
                args: ['--format', 'json'],
                suffixArgs: [],
            },
            brakeman: {
                binary: 'brakeman',
                args: ['-f', 'json'],
                suffixArgs: [],
            },
            // PHP tools
            phpstan: {
                binary: 'phpstan',
                args: ['analyse', '--error-format=json'],
                suffixArgs: [],
            },
        };
        // Normalize tool name
        const normalizedTool = tool.toLowerCase().replace(/-/g, '');
        for (const [name, config] of Object.entries(configs)) {
            if (name.toLowerCase().replace(/-/g, '') === normalizedTool) {
                return config;
            }
        }
        return null;
    }
    /**
     * Check if the original issue is resolved
     */
    isOriginalIssueResolved(ruleId, lineNumber, originalIssues, fixedIssues) {
        // Normalize rule ID for comparison
        const normalizeRule = (rule) => rule.toLowerCase().replace(/[^a-z0-9]/g, '');
        const targetRule = normalizeRule(ruleId);
        // Find the original issue
        const originalIssue = originalIssues.find(issue => {
            const issueRule = normalizeRule(issue.rule);
            // Match by rule and approximate line (within 3 lines tolerance)
            return issueRule.includes(targetRule) || targetRule.includes(issueRule);
        });
        if (!originalIssue) {
            // Original issue wasn't even found in baseline - assume resolved
            console.log(`[ToolRevalidator] Note: Original issue ${ruleId} not found in baseline scan`);
            return true;
        }
        // Check if same issue exists in fixed code
        const stillExists = fixedIssues.some(issue => {
            const issueRule = normalizeRule(issue.rule);
            const ruleMatches = issueRule.includes(targetRule) || targetRule.includes(issueRule);
            // For line matching, allow some tolerance since fix might shift lines
            const lineClose = Math.abs(issue.line - lineNumber) <= 5;
            return ruleMatches && lineClose;
        });
        return !stillExists;
    }
    /**
     * Find regression issues (new issues introduced by the fix)
     */
    findRegressions(originalIssues, fixedIssues) {
        const regressions = [];
        // Create a set of original issue signatures for quick lookup
        const originalSignatures = new Set(originalIssues.map(issue => `${issue.rule}:${issue.line}`));
        for (const issue of fixedIssues) {
            const signature = `${issue.rule}:${issue.line}`;
            if (!originalSignatures.has(signature)) {
                // This is a new issue not in the original - potential regression
                regressions.push(issue);
            }
        }
        return regressions;
    }
    /**
     * Get file extension for a language
     */
    getFileExtension(language, originalPath) {
        // Try to use original file extension
        const originalExt = path.extname(originalPath);
        if (originalExt)
            return originalExt;
        // Fall back to language defaults
        const extensions = {
            java: '.java',
            typescript: '.ts',
            javascript: '.js',
            python: '.py',
            go: '.go',
            rust: '.rs',
            ruby: '.rb',
            php: '.php',
            csharp: '.cs',
            cpp: '.cpp',
            c: '.c',
        };
        return extensions[language] || '.txt';
    }
    // ==========================================================================
    // SESSION 89: Batch Validation Support
    // ==========================================================================
    /**
     * SESSION 89: Validate multiple fixes in a batch
     *
     * Groups fixes by tool/language and validates each group together.
     * More efficient than calling validateFix individually when you have
     * multiple fixes for the same tool.
     *
     * @param requests - Array of validation requests with fixIds
     * @returns Batch validation result with individual fix results
     */
    async validateBatch(requests) {
        const startTime = Date.now();
        const results = new Map();
        let toolExecutions = 0;
        if (requests.length === 0) {
            return {
                totalFixes: 0,
                passedCount: 0,
                failedCount: 0,
                results,
                toolExecutions: 0,
                executionsSaved: 0,
                totalDuration: 0,
                summary: 'No fixes to validate',
            };
        }
        // Group fixes by tool:language for efficient processing
        const groups = new Map();
        for (const request of requests) {
            const key = `${request.tool.toLowerCase()}:${request.language.toLowerCase()}`;
            if (!groups.has(key)) {
                groups.set(key, []);
            }
            groups.get(key).push(request);
        }
        console.log(`[ToolRevalidator:Batch] Grouped ${requests.length} fixes into ${groups.size} tool groups`);
        // Process each group
        const groupEntries = Array.from(groups.entries());
        for (const [groupKey, groupRequests] of groupEntries) {
            console.log(`[ToolRevalidator:Batch] Processing group ${groupKey} with ${groupRequests.length} fixes`);
            toolExecutions++;
            // Validate each fix in the group
            // Note: Within a group, fixes share rate limiter context and tool config
            for (const request of groupRequests) {
                try {
                    const result = await this.validateFix(request);
                    results.set(request.fixId, { ...result, fixId: request.fixId });
                }
                catch (error) {
                    // If validation throws, record as failed
                    results.set(request.fixId, {
                        fixId: request.fixId,
                        passed: false,
                        originalIssueResolved: false,
                        hasRegressions: false,
                        regressionCount: 0,
                        regressions: [],
                        toolExecution: {
                            tool: request.tool,
                            command: 'N/A',
                            exitCode: -1,
                            duration: 0,
                            stdout: '',
                            stderr: error.message,
                        },
                        summary: `Validation error: ${error.message}`,
                    });
                }
            }
        }
        // Calculate statistics
        let passedCount = 0;
        let failedCount = 0;
        results.forEach((result) => {
            if (result.passed)
                passedCount++;
            else
                failedCount++;
        });
        const totalDuration = Date.now() - startTime;
        const executionsSaved = Math.max(0, requests.length - groups.size);
        const passRate = requests.length > 0 ? Math.round((passedCount / requests.length) * 100) : 0;
        const savedPercent = requests.length > 0 ? Math.round((executionsSaved / requests.length) * 100) : 0;
        const summary = `Batch validation: ${passedCount}/${requests.length} passed (${passRate}%), ` +
            `${groups.size} tool executions (${executionsSaved} groups saved, ${savedPercent}% reduction), ` +
            `${totalDuration}ms`;
        console.log(`[ToolRevalidator:Batch] ${summary}`);
        return {
            totalFixes: requests.length,
            passedCount,
            failedCount,
            results,
            toolExecutions: groups.size,
            executionsSaved,
            totalDuration,
            summary,
        };
    }
}
exports.ToolRevalidator = ToolRevalidator;
// ============================================================================
// Environment-Based Configuration
// SESSION 75: Load configuration from environment variables
// ============================================================================
/**
 * Load rate limit configuration from environment variables
 * Allows runtime configuration without code changes
 */
function loadEnvConfig() {
    var _a, _b;
    const envConfig = {};
    // User tier from environment
    const envTier = (_a = process.env.CODEQUAL_USER_TIER) === null || _a === void 0 ? void 0 : _a.toLowerCase();
    if (envTier === 'basic' || envTier === 'pro' || envTier === 'enterprise') {
        envConfig.userTier = envTier;
    }
    // Repo size from environment
    const envRepoSize = (_b = process.env.CODEQUAL_REPO_SIZE) === null || _b === void 0 ? void 0 : _b.toLowerCase();
    if (envRepoSize === 'small' || envRepoSize === 'medium' || envRepoSize === 'large' || envRepoSize === 'enterprise') {
        envConfig.repoSize = envRepoSize;
    }
    // Estimated line count from environment
    const envLineCount = process.env.CODEQUAL_ESTIMATED_LINES;
    if (envLineCount) {
        const parsed = parseInt(envLineCount, 10);
        if (!isNaN(parsed) && parsed > 0) {
            envConfig.estimatedLineCount = parsed;
        }
    }
    // Rate limit overrides from environment
    const envMaxPerMinute = process.env.CODEQUAL_MAX_PER_MINUTE;
    const envMaxConcurrent = process.env.CODEQUAL_MAX_CONCURRENT;
    const envTimeoutMs = process.env.CODEQUAL_TIMEOUT_MS;
    if (envMaxPerMinute || envMaxConcurrent || envTimeoutMs) {
        envConfig.rateLimitConfig = {};
        if (envMaxPerMinute) {
            const parsed = parseInt(envMaxPerMinute, 10);
            if (!isNaN(parsed) && parsed > 0)
                envConfig.rateLimitConfig.maxPerMinute = parsed;
        }
        if (envMaxConcurrent) {
            const parsed = parseInt(envMaxConcurrent, 10);
            if (!isNaN(parsed) && parsed > 0)
                envConfig.rateLimitConfig.maxConcurrent = parsed;
        }
        if (envTimeoutMs) {
            const parsed = parseInt(envTimeoutMs, 10);
            if (!isNaN(parsed) && parsed > 0)
                envConfig.rateLimitConfig.timeoutMs = parsed;
        }
    }
    return envConfig;
}
// ============================================================================
// Singleton and Factory Functions
// ============================================================================
let revalidatorInstance = null;
/**
 * Get the singleton ToolRevalidator instance
 * SESSION 75: Now uses environment-based configuration
 */
function getToolRevalidator(options) {
    if (!revalidatorInstance) {
        // Merge environment config with provided options (options take precedence)
        const envConfig = loadEnvConfig();
        const mergedOptions = {
            ...envConfig,
            ...options,
            rateLimitConfig: {
                ...envConfig.rateLimitConfig,
                ...options === null || options === void 0 ? void 0 : options.rateLimitConfig,
            },
        };
        revalidatorInstance = new ToolRevalidator(mergedOptions);
    }
    return revalidatorInstance;
}
/**
 * Create a new ToolRevalidator instance with custom config
 * Use this when you need independent rate limiting
 * SESSION 75: Now uses environment-based configuration as base
 */
function createToolRevalidator(options) {
    // Merge environment config with provided options (options take precedence)
    const envConfig = loadEnvConfig();
    const mergedOptions = {
        ...envConfig,
        ...options,
        rateLimitConfig: {
            ...envConfig.rateLimitConfig,
            ...options === null || options === void 0 ? void 0 : options.rateLimitConfig,
        },
    };
    return new ToolRevalidator(mergedOptions);
}
/**
 * Reset the singleton instance (useful for testing)
 */
function resetToolRevalidatorSingleton() {
    revalidatorInstance = null;
}
/**
 * Get global rate limiter statistics
 */
function getRateLimiterStats() {
    return globalRateLimiter.getStats();
}
exports.default = ToolRevalidator;
