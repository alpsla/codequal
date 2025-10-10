"use strict";
/**
 * Semgrep MCP Adapter
 * Security analysis tool using Semgrep via MCP
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
exports.SemgrepMCPAdapter = void 0;
const path = __importStar(require("path"));
const base_mcp_adapter_1 = require("./base-mcp-adapter");
class SemgrepMCPAdapter extends base_mcp_adapter_1.BaseMCPAdapter {
    constructor() {
        super(...arguments);
        this.id = 'semgrep-mcp';
        this.name = 'Semgrep MCP';
        this.version = '1.0.0';
        this.capabilities = [
            {
                name: 'security-analysis',
                category: 'security',
                languages: ['javascript', 'typescript', 'python', 'java', 'go', 'ruby', 'php'],
                fileTypes: ['.js', '.jsx', '.ts', '.tsx', '.py', '.java', '.go', '.rb', '.php']
            }
        ];
        this.requirements = {
            minFiles: 1,
            executionMode: 'on-demand',
            timeout: 60000, // 1 minute for security scans
            authentication: {
                type: 'none',
                required: false
            }
        };
        this.mcpServerArgs = ['semgrep-mcp-server'];
    }
    canAnalyze(context) {
        const supportedExtensions = this.capabilities[0].fileTypes || [];
        return context.pr.files.some(file => {
            const ext = path.extname(file.path).toLowerCase();
            return supportedExtensions.includes(ext) && file.changeType !== 'deleted';
        });
    }
    async analyze(context) {
        const startTime = Date.now();
        try {
            // For now, simulate Semgrep results since MCP server may not be available
            // This will be replaced with actual MCP calls when server is available
            const supportedExtensions = this.capabilities[0].fileTypes || [];
            const supportedFiles = this.filterSupportedFiles(context.pr.files, supportedExtensions);
            if (supportedFiles.length === 0) {
                return this.createEmptyResult(startTime);
            }
            // Simulate security findings
            const findings = [];
            // Check for common security issues in JavaScript/TypeScript
            for (const file of supportedFiles) {
                const ext = path.extname(file.path).toLowerCase();
                if (['.js', '.jsx', '.ts', '.tsx'].includes(ext)) {
                    // Check for hardcoded secrets
                    if (file.content.match(/api[_-]?key\s*[:=]\s*["'][^"']+["']/i)) {
                        findings.push({
                            type: 'issue',
                            severity: 'critical',
                            category: 'security',
                            message: 'Hardcoded API key detected',
                            file: file.path,
                            line: 1, // Would be calculated from actual match
                            ruleId: 'security/hardcoded-secrets',
                            documentation: 'https://semgrep.dev/docs/writing-rules/rule-ideas/#hardcoded-secrets'
                        });
                    }
                    // Check for SQL injection vulnerabilities
                    if (file.content.match(/query\s*\(\s*["'`].*\$\{.*\}.*["'`]\s*\)/)) {
                        findings.push({
                            type: 'issue',
                            severity: 'high',
                            category: 'security',
                            message: 'Potential SQL injection vulnerability',
                            file: file.path,
                            line: 1, // Would be calculated from actual match
                            ruleId: 'security/sql-injection',
                            documentation: 'https://semgrep.dev/docs/writing-rules/rule-ideas/#sql-injection'
                        });
                    }
                    // Check for unsafe eval usage
                    if (file.content.match(/\beval\s*\(/)) {
                        findings.push({
                            type: 'issue',
                            severity: 'high',
                            category: 'security',
                            message: 'Use of eval() is a security risk',
                            file: file.path,
                            line: 1, // Would be calculated from actual match
                            ruleId: 'security/no-eval',
                            documentation: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/eval#never_use_eval!'
                        });
                    }
                }
            }
            return {
                success: true,
                toolId: this.id,
                executionTime: Date.now() - startTime,
                findings,
                metrics: {
                    filesAnalyzed: supportedFiles.length,
                    totalIssues: findings.length,
                    criticalIssues: findings.filter(f => f.severity === 'critical').length,
                    highIssues: findings.filter(f => f.severity === 'high').length
                }
            };
        }
        catch (error) {
            return this.createErrorResult(error instanceof Error ? error : new Error(String(error)), startTime);
        }
    }
    getMetadata() {
        return {
            id: this.id,
            name: this.name,
            description: 'Semgrep security analysis via Model Context Protocol',
            author: 'CodeQual',
            homepage: 'https://semgrep.dev',
            supportedRoles: ['security'],
            supportedLanguages: ['javascript', 'typescript', 'python', 'java', 'go', 'ruby', 'php'],
            tags: ['security', 'sast', 'vulnerability-detection'],
            securityVerified: true,
            lastVerified: new Date('2025-07-15')
        };
    }
    mapSeverity(semgrepSeverity) {
        const severityMap = {
            'error': 'critical',
            'warning': 'high',
            'info': 'medium',
            'note': 'low'
        };
        return severityMap[semgrepSeverity.toLowerCase()] || 'info';
    }
}
exports.SemgrepMCPAdapter = SemgrepMCPAdapter;
//# sourceMappingURL=semgrep-mcp.js.map