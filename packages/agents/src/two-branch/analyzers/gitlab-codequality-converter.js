"use strict";
/**
 * GitLab Code Quality Format Converter
 *
 * Converts CodeQual's internal issue format to GitLab Code Quality format
 * (based on Code Climate specification).
 *
 * This enables GitLab CI/CD to:
 * 1. Display code quality findings in merge request widgets
 * 2. Show quality degradation/improvement metrics
 * 3. Block merges based on quality gates
 *
 * GitLab Docs: https://docs.gitlab.com/ee/ci/testing/code_quality.html
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.GitLabCodeQualityConverter = void 0;
const crypto_1 = require("crypto");
// ============================================================================
// Converter Class
// ============================================================================
class GitLabCodeQualityConverter {
    /**
     * Convert CodeQual issues to GitLab Code Quality format
     *
     * @param issues - Array of enriched issues from V9 analysis
     * @param repositoryPath - Repository root path (for relative path calculation)
     * @returns GitLab Code Quality report (JSON array)
     */
    generateGitLabCodeQualityReport(issues, repositoryPath) {
        return issues
            .filter(issue => issue.file && issue.line) // GitLab requires file and line
            .map(issue => this.convertToGitLabIssue(issue, repositoryPath));
    }
    // ==========================================================================
    // Private Conversion Methods
    // ==========================================================================
    convertToGitLabIssue(issue, repositoryPath) {
        const relativePath = this.getRelativePath(issue.file, repositoryPath);
        return {
            description: this.formatDescription(issue),
            check_name: this.formatCheckName(issue),
            fingerprint: this.generateFingerprint(issue),
            severity: this.mapSeverity(issue.severity),
            location: this.createLocation(relativePath, issue),
            categories: this.extractCategories(issue),
            content: this.createContent(issue)
        };
    }
    // ==========================================================================
    // Description Formatting
    // ==========================================================================
    /**
     * Format a human-readable description
     * Combines tool name, rule, and message for clarity
     */
    formatDescription(issue) {
        const parts = [];
        // Add severity indicator
        if (issue.severity === 'critical' || issue.severity === 'high') {
            parts.push(`[${issue.severity.toUpperCase()}]`);
        }
        // Add tool name
        if (issue.tool) {
            parts.push(`${issue.tool}:`);
        }
        // Add message (primary description)
        parts.push(issue.message);
        // Add category if available and meaningful
        if (issue.category && issue.category !== 'Unknown') {
            parts.push(`(${issue.category})`);
        }
        return parts.join(' ');
    }
    // ==========================================================================
    // Check Name Formatting
    // ==========================================================================
    /**
     * Format check name (rule identifier)
     * GitLab uses this to group similar issues
     */
    formatCheckName(issue) {
        // Use tool + rule for namespacing
        // Example: "pmd/UnusedPrivateField", "checkstyle/JavadocMethod"
        if (issue.tool && issue.rule) {
            return `${issue.tool.toLowerCase()}/${issue.rule}`;
        }
        // Fallback to just rule if tool missing
        return issue.rule || 'unknown-rule';
    }
    // ==========================================================================
    // Fingerprint Generation
    // ==========================================================================
    /**
     * Generate unique fingerprint for this issue
     * Used by GitLab to track the same issue across commits
     *
     * Fingerprint combines:
     * - File path
     * - Line number
     * - Rule
     * - Message (first 100 chars)
     */
    generateFingerprint(issue) {
        const components = [
            issue.file || '',
            String(issue.line || 0),
            issue.rule || '',
            (issue.message || '').substring(0, 100) // Limit to avoid fingerprint changes from minor message variations
        ];
        const fingerprintString = components.join('::');
        // Generate MD5 hash (GitLab standard)
        return (0, crypto_1.createHash)('md5')
            .update(fingerprintString)
            .digest('hex');
    }
    // ==========================================================================
    // Severity Mapping
    // ==========================================================================
    /**
     * Map CodeQual severity to GitLab severity levels
     *
     * CodeQual: critical, high, medium, low
     * GitLab: blocker, critical, major, minor, info
     */
    mapSeverity(severity) {
        const normalizedSeverity = severity.toLowerCase();
        switch (normalizedSeverity) {
            case 'critical':
                return 'blocker'; // Most severe - blocks merge
            case 'high':
                return 'critical'; // High priority - requires attention
            case 'medium':
                return 'major'; // Moderate priority
            case 'low':
                return 'minor'; // Low priority - nice to fix
            default:
                return 'info'; // Informational only
        }
    }
    // ==========================================================================
    // Location Creation
    // ==========================================================================
    /**
     * Create GitLab location object
     * Uses line-based format (simpler and widely supported)
     */
    createLocation(relativePath, issue) {
        var _a;
        const location = {
            path: relativePath,
            lines: {
                begin: issue.line || 1
            }
        };
        // Add end line if we can calculate it from the fix
        if ((_a = issue.fixSuggestion) === null || _a === void 0 ? void 0 : _a.correctedCode) {
            const lineCount = this.countLines(issue.fixSuggestion.correctedCode);
            if (lineCount > 1) {
                location.lines.end = (issue.line || 1) + lineCount - 1;
            }
        }
        // Add column-based position if available (more precise)
        if (issue.column) {
            location.positions = {
                begin: {
                    line: issue.line || 1,
                    column: issue.column
                },
                end: {
                    line: issue.line || 1,
                    column: issue.column + 1 // Minimal span
                }
            };
        }
        return location;
    }
    // ==========================================================================
    // Categories Extraction
    // ==========================================================================
    /**
     * Extract categories for grouping in GitLab
     * Maps to CodeQual's issue types
     */
    extractCategories(issue) {
        const categories = [];
        // Add tool-based category
        if (issue.tool) {
            categories.push(issue.tool.toLowerCase());
        }
        // Add type-based category
        const issueType = this.determineIssueType(issue);
        categories.push(issueType);
        // Add severity-based category for filtering
        categories.push(`severity-${issue.severity.toLowerCase()}`);
        // Add language if detectable
        const language = this.detectLanguage(issue.file);
        if (language) {
            categories.push(language);
        }
        return categories;
    }
    /**
     * Determine issue type from tool and category
     */
    determineIssueType(issue) {
        var _a, _b;
        const tool = ((_a = issue.tool) === null || _a === void 0 ? void 0 : _a.toLowerCase()) || '';
        const category = ((_b = issue.category) === null || _b === void 0 ? void 0 : _b.toLowerCase()) || '';
        // Security issues
        if (tool.includes('semgrep') || tool.includes('snyk') ||
            tool.includes('dependency-check') || tool.includes('ossindex') ||
            category.includes('security') || category.includes('vulnerability')) {
            return 'security';
        }
        // Dependency issues
        if (tool.includes('dependency') || category.includes('dependency')) {
            return 'dependency';
        }
        // Performance issues
        if (tool.includes('performance') || category.includes('performance')) {
            return 'performance';
        }
        // Architecture issues
        if (tool.includes('architecture') || category.includes('architecture')) {
            return 'architecture';
        }
        // Style/formatting issues
        if (tool.includes('checkstyle') || tool.includes('eslint') ||
            tool.includes('pylint') || category.includes('style')) {
            return 'style';
        }
        // Bug detection
        if (tool.includes('spotbugs') || tool.includes('pmd') ||
            category.includes('bug') || category.includes('error')) {
            return 'bug-risk';
        }
        // Default to code quality
        return 'code-quality';
    }
    // ==========================================================================
    // Content Creation (Optional Documentation)
    // ==========================================================================
    /**
     * Create optional content body with fix suggestion
     * GitLab displays this in the MR widget
     */
    createContent(issue) {
        if (!issue.fixSuggestion)
            return undefined;
        const parts = [];
        // Add fix explanation
        if (issue.fixSuggestion.explanation) {
            parts.push('**How to Fix:**');
            parts.push(issue.fixSuggestion.explanation);
            parts.push('');
        }
        // Add issue description if available
        if (issue.fixSuggestion.issueDescription) {
            const desc = issue.fixSuggestion.issueDescription;
            if (desc.what) {
                parts.push('**What:**');
                parts.push(desc.what);
                parts.push('');
            }
            if (desc.why) {
                parts.push('**Why:**');
                parts.push(desc.why);
                parts.push('');
            }
            if (desc.impact) {
                parts.push('**Impact:**');
                parts.push(desc.impact);
                parts.push('');
            }
        }
        // Add snippet if available
        if (issue.snippet) {
            parts.push('**Current Code:**');
            parts.push('```');
            parts.push(issue.snippet);
            parts.push('```');
            parts.push('');
        }
        // Add corrected code if available (cleaned of template text)
        if (issue.fixSuggestion.correctedCode) {
            const cleanedCode = this.cleanCorrectedCode(issue.fixSuggestion.correctedCode);
            if (cleanedCode) {
                parts.push('**Suggested Fix:**');
                parts.push('```');
                parts.push(cleanedCode);
                parts.push('```');
            }
        }
        return parts.length > 0 ? { body: parts.join('\n') } : undefined;
    }
    /**
     * BUG-LSP-001 FIX: Clean correctedCode to remove template patterns
     * Handles patterns like "X should be: Y" that slip through from pattern storage
     */
    cleanCorrectedCode(code) {
        if (!code)
            return code;
        let cleaned = code;
        // Check for template patterns embedded in code (not comments)
        const templatePatterns = [
            /\n\nshould be:\n\n/i,
            /\n\nchange to:\n\n/i,
            /\n\nreplace with:\n\n/i,
            /\n\ninstead of:\n\n/i,
        ];
        for (const pattern of templatePatterns) {
            if (pattern.test(cleaned)) {
                // Split on the pattern and take the "after" part
                const parts = cleaned.split(pattern);
                if (parts.length >= 2) {
                    cleaned = parts[parts.length - 1].trim();
                    // If the "after" part still looks like template text, return empty
                    if (cleaned.includes('should be:') || cleaned.includes('}}')) {
                        return ''; // Reject this fix entirely
                    }
                }
            }
        }
        // If code contains "should be:" anywhere (not in comments), reject it
        if (/(?<!\/\/.*)\bshould be:/i.test(cleaned)) {
            return ''; // Reject this fix entirely
        }
        return cleaned.trim();
    }
    // ==========================================================================
    // Utility Methods
    // ==========================================================================
    /**
     * Get relative path from absolute path
     * GitLab requires relative paths without ./ prefix
     */
    getRelativePath(filePath, repositoryPath) {
        if (!filePath)
            return 'unknown';
        // Normalize path separators
        let normalized = filePath.replace(/\\/g, '/');
        // Remove repository path if present
        if (repositoryPath) {
            const normalizedRepo = repositoryPath.replace(/\\/g, '/');
            if (normalized.startsWith(normalizedRepo)) {
                normalized = normalized.substring(normalizedRepo.length);
            }
        }
        // Remove leading ./ or /
        normalized = normalized.replace(/^\.?\//, '');
        return normalized;
    }
    /**
     * Count lines in a text string
     */
    countLines(text) {
        if (!text)
            return 1;
        return (text.match(/\n/g) || []).length + 1;
    }
    /**
     * Detect programming language from file extension
     */
    detectLanguage(filePath) {
        var _a;
        if (!filePath)
            return null;
        const extension = (_a = filePath.split('.').pop()) === null || _a === void 0 ? void 0 : _a.toLowerCase();
        if (!extension)
            return null;
        const languageMap = {
            // Java ecosystem
            'java': 'java',
            'kt': 'kotlin',
            'scala': 'scala',
            // JavaScript/TypeScript
            'js': 'javascript',
            'jsx': 'javascript',
            'ts': 'typescript',
            'tsx': 'typescript',
            // Python
            'py': 'python',
            // Ruby
            'rb': 'ruby',
            // Go
            'go': 'go',
            // Rust
            'rs': 'rust',
            // C/C++
            'c': 'c',
            'cpp': 'cpp',
            'cc': 'cpp',
            'cxx': 'cpp',
            'h': 'c',
            'hpp': 'cpp',
            // C#
            'cs': 'csharp',
            // PHP
            'php': 'php',
            // Swift
            'swift': 'swift',
            // Others
            'sh': 'shell',
            'bash': 'shell',
            'yml': 'yaml',
            'yaml': 'yaml',
            'json': 'json',
            'xml': 'xml'
        };
        return languageMap[extension] || null;
    }
    // ==========================================================================
    // Validation
    // ==========================================================================
    /**
     * Validate that the report meets GitLab requirements
     * Throws error if validation fails
     */
    validateReport(report) {
        var _a, _b, _c;
        if (!Array.isArray(report)) {
            throw new Error('GitLab Code Quality report must be a JSON array');
        }
        for (const issue of report) {
            // Required fields
            if (!issue.description) {
                throw new Error(`Issue missing required field: description`);
            }
            if (!issue.check_name) {
                throw new Error(`Issue missing required field: check_name`);
            }
            if (!issue.fingerprint) {
                throw new Error(`Issue missing required field: fingerprint`);
            }
            if (!issue.severity) {
                throw new Error(`Issue missing required field: severity`);
            }
            // Valid severity
            const validSeverities = ['info', 'minor', 'major', 'critical', 'blocker'];
            if (!validSeverities.includes(issue.severity)) {
                throw new Error(`Invalid severity: ${issue.severity}. Must be one of: ${validSeverities.join(', ')}`);
            }
            // Location required
            if (!issue.location || !issue.location.path) {
                throw new Error(`Issue missing required field: location.path`);
            }
            // Line number required (either lines.begin or positions.begin.line)
            const hasLines = (_a = issue.location.lines) === null || _a === void 0 ? void 0 : _a.begin;
            const hasPositions = (_c = (_b = issue.location.positions) === null || _b === void 0 ? void 0 : _b.begin) === null || _c === void 0 ? void 0 : _c.line;
            if (!hasLines && !hasPositions) {
                throw new Error(`Issue missing required field: location line number`);
            }
        }
    }
    /**
     * Get statistics about the generated report
     */
    getReportStatistics(report) {
        const stats = {
            totalIssues: report.length,
            bySeverity: {},
            byCategory: {},
            byTool: {}
        };
        for (const issue of report) {
            // Count by severity
            stats.bySeverity[issue.severity] = (stats.bySeverity[issue.severity] || 0) + 1;
            // Count by category
            if (issue.categories) {
                for (const category of issue.categories) {
                    stats.byCategory[category] = (stats.byCategory[category] || 0) + 1;
                }
            }
            // Count by tool (extracted from check_name)
            const tool = issue.check_name.split('/')[0];
            stats.byTool[tool] = (stats.byTool[tool] || 0) + 1;
        }
        return stats;
    }
}
exports.GitLabCodeQualityConverter = GitLabCodeQualityConverter;
