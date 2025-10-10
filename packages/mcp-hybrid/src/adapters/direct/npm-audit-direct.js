"use strict";
/**
 * NPM Audit Direct Adapter
 * Runs npm audit to find security vulnerabilities in dependencies
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
exports.npmAuditDirectAdapter = exports.NpmAuditDirectAdapter = void 0;
const base_adapter_1 = require("./base-adapter");
const child_process_1 = require("child_process");
const util_1 = require("util");
const path = __importStar(require("path"));
const fs = __importStar(require("fs/promises"));
const execAsync = (0, util_1.promisify)(child_process_1.exec);
class NpmAuditDirectAdapter extends base_adapter_1.DirectToolAdapter {
    constructor() {
        super(...arguments);
        this.id = 'npm-audit-direct';
        this.name = 'NPM Audit Direct';
        this.version = '1.0.0';
        this.capabilities = [
            {
                name: 'vulnerability-scanning',
                category: 'security',
                languages: ['javascript', 'typescript'],
                fileTypes: ['package.json', 'package-lock.json']
            },
            {
                name: 'dependency-security',
                category: 'security',
                languages: ['javascript', 'typescript'],
                fileTypes: ['package.json', 'package-lock.json']
            }
        ];
        this.requirements = {
            minFiles: 1,
            executionMode: 'on-demand',
            timeout: 60000, // npm audit can take time for large projects
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
        return { cmd: 'npm', args: ['--version'] };
    }
    /**
     * Check if tool can analyze given context
     */
    canAnalyze(context) {
        // Only for security agent
        if (context.agentRole !== 'security') {
            return false;
        }
        // Check for package.json or package-lock.json
        return context.pr.files.some(file => file.path === 'package.json' ||
            file.path.endsWith('/package.json') ||
            file.path === 'package-lock.json' ||
            file.path.endsWith('/package-lock.json'));
    }
    /**
     * Execute npm audit analysis
     */
    async analyze(context) {
        const startTime = Date.now();
        try {
            // Find all package.json files
            const packageJsonFiles = context.pr.files.filter(file => file.path.endsWith('package.json'));
            if (packageJsonFiles.length === 0) {
                return this.createEmptyResult(startTime);
            }
            const findings = [];
            const totalVulnerabilities = {
                info: 0,
                low: 0,
                moderate: 0,
                high: 0,
                critical: 0,
                total: 0
            };
            // Analyze each package.json directory
            for (const packageFile of packageJsonFiles) {
                const dir = path.dirname(packageFile.path);
                const workingDir = path.join(process.cwd(), dir);
                try {
                    // Check if directory exists and has package-lock.json
                    await fs.access(workingDir);
                    const lockFile = path.join(workingDir, 'package-lock.json');
                    try {
                        await fs.access(lockFile);
                    }
                    catch {
                        // No lock file, can't run audit
                        findings.push({
                            type: 'issue',
                            severity: 'medium',
                            category: 'security',
                            message: 'No package-lock.json found - npm audit requires a lock file',
                            file: packageFile.path,
                            ruleId: 'missing-lock-file'
                        });
                        continue;
                    }
                    // Run npm audit
                    const auditReport = await this.runNpmAudit(workingDir);
                    // Update total counts
                    if (auditReport.metadata?.vulnerabilities) {
                        totalVulnerabilities.info += auditReport.metadata.vulnerabilities.info || 0;
                        totalVulnerabilities.low += auditReport.metadata.vulnerabilities.low || 0;
                        totalVulnerabilities.moderate += auditReport.metadata.vulnerabilities.moderate || 0;
                        totalVulnerabilities.high += auditReport.metadata.vulnerabilities.high || 0;
                        totalVulnerabilities.critical += auditReport.metadata.vulnerabilities.critical || 0;
                        totalVulnerabilities.total += auditReport.metadata.vulnerabilities.total || 0;
                    }
                    // Generate findings from audit report
                    const dirFindings = this.generateFindings(auditReport, dir);
                    findings.push(...dirFindings);
                }
                catch (error) {
                    // Directory might not exist or npm command failed
                    console.warn(`Skipping ${dir}: ${error}`);
                }
            }
            // Calculate security score
            const securityScore = this.calculateSecurityScore(totalVulnerabilities);
            return {
                success: true,
                toolId: this.id,
                executionTime: Date.now() - startTime,
                findings,
                metrics: {
                    vulnerabilitiesTotal: totalVulnerabilities.total,
                    vulnerabilitiesCritical: totalVulnerabilities.critical,
                    vulnerabilitiesHigh: totalVulnerabilities.high,
                    vulnerabilitiesModerate: totalVulnerabilities.moderate,
                    vulnerabilitiesLow: totalVulnerabilities.low,
                    vulnerabilitiesInfo: totalVulnerabilities.info,
                    securityScore,
                    fixableVulnerabilities: findings.filter(f => f.autoFixable).length,
                    criticalFindings: totalVulnerabilities.critical,
                    highFindings: totalVulnerabilities.high
                }
            };
        }
        catch (error) {
            return {
                success: false,
                toolId: this.id,
                executionTime: Date.now() - startTime,
                error: {
                    code: 'NPM_AUDIT_FAILED',
                    message: error instanceof Error ? error.message : String(error),
                    recoverable: true
                }
            };
        }
    }
    /**
     * Run npm audit and get JSON report
     */
    async runNpmAudit(workingDir) {
        try {
            // Run npm audit --json
            // Note: npm audit exits with non-zero if vulnerabilities found
            const { stdout } = await execAsync('npm audit --json', {
                cwd: workingDir,
                encoding: 'utf8',
                maxBuffer: 10 * 1024 * 1024 // 10MB buffer for large reports
            }).catch(error => {
                // If we have stdout with JSON, use it despite non-zero exit
                if (error.stdout) {
                    return { stdout: error.stdout };
                }
                throw error;
            });
            if (!stdout || stdout.trim() === '') {
                return {
                    vulnerabilities: {},
                    metadata: {
                        vulnerabilities: {
                            info: 0,
                            low: 0,
                            moderate: 0,
                            high: 0,
                            critical: 0,
                            total: 0
                        },
                        dependencies: {
                            prod: 0,
                            dev: 0,
                            optional: 0,
                            peer: 0,
                            peerOptional: 0,
                            total: 0
                        }
                    }
                };
            }
            const auditData = JSON.parse(stdout);
            // Handle different npm audit output formats
            if (auditData.auditReportVersion === 2) {
                // npm 7+ format
                return auditData;
            }
            else {
                // Convert older format to v2 structure
                return this.convertToV2Format(auditData);
            }
        }
        catch (error) {
            console.error('Error running npm audit:', error);
            return {
                vulnerabilities: {},
                metadata: {
                    vulnerabilities: {
                        info: 0,
                        low: 0,
                        moderate: 0,
                        high: 0,
                        critical: 0,
                        total: 0
                    },
                    dependencies: {
                        prod: 0,
                        dev: 0,
                        optional: 0,
                        peer: 0,
                        peerOptional: 0,
                        total: 0
                    }
                }
            };
        }
    }
    /**
     * Convert older npm audit format to v2
     */
    convertToV2Format(auditData) {
        // Handle older npm audit formats
        const vulnerabilities = {};
        const metadata = auditData.metadata || {};
        if (auditData.advisories) {
            // npm 6 format
            Object.entries(auditData.advisories).forEach(([id, advisory]) => {
                vulnerabilities[advisory.module_name] = {
                    name: advisory.module_name,
                    severity: advisory.severity,
                    via: [{
                            title: advisory.title,
                            url: advisory.url,
                            severity: advisory.severity
                        }],
                    effects: advisory.findings?.map((f) => f.paths[0]) || [],
                    range: advisory.vulnerable_versions || '',
                    nodes: advisory.findings?.map((f) => f.version) || [],
                    fixAvailable: advisory.patched_versions !== '<0.0.0'
                };
            });
        }
        return {
            vulnerabilities,
            metadata: {
                vulnerabilities: metadata.vulnerabilities || {
                    info: 0,
                    low: 0,
                    moderate: 0,
                    high: 0,
                    critical: 0,
                    total: 0
                },
                dependencies: metadata.dependencies || {
                    prod: 0,
                    dev: 0,
                    optional: 0,
                    peer: 0,
                    peerOptional: 0,
                    total: 0
                }
            }
        };
    }
    /**
     * Generate findings from audit report
     */
    generateFindings(report, directory) {
        const findings = [];
        // Create findings for each vulnerability
        Object.entries(report.vulnerabilities || {}).forEach(([packageName, vuln]) => {
            const severity = this.mapSeverity(vuln.severity);
            const via = Array.isArray(vuln.via) ? vuln.via : [vuln.via];
            // Get vulnerability details
            const details = via.map(v => {
                if (typeof v === 'string')
                    return v;
                return `${v.title} (${v.url})`;
            }).join(', ');
            const finding = {
                type: 'issue',
                severity,
                category: 'security',
                message: `Security vulnerability in ${packageName}: ${vuln.severity} severity`,
                file: path.join(directory, 'package.json'),
                ruleId: `npm-audit-${vuln.severity}`,
                documentation: this.formatVulnerabilityDoc(packageName, vuln, details),
                autoFixable: this.isAutoFixable(vuln.fixAvailable)
            };
            if (finding.autoFixable) {
                finding.fix = {
                    description: this.getFixDescription(vuln.fixAvailable),
                    changes: [] // npm audit fix handles this
                };
            }
            findings.push(finding);
        });
        // Add summary finding if there are many vulnerabilities
        const vulnCount = Object.keys(report.vulnerabilities || {}).length;
        if (vulnCount > 10) {
            findings.unshift({
                type: 'issue',
                severity: 'high',
                category: 'security',
                message: `🚨 ${vulnCount} security vulnerabilities found in dependencies`,
                file: path.join(directory, 'package.json'),
                ruleId: 'multiple-vulnerabilities',
                documentation: this.formatSummaryDoc(report.metadata.vulnerabilities)
            });
        }
        return findings;
    }
    /**
     * Map npm severity to tool severity
     */
    mapSeverity(npmSeverity) {
        switch (npmSeverity) {
            case 'critical': return 'critical';
            case 'high': return 'high';
            case 'moderate': return 'medium';
            case 'low': return 'low';
            case 'info': return 'info';
            default: return 'medium';
        }
    }
    /**
     * Check if vulnerability is auto-fixable
     */
    isAutoFixable(fixAvailable) {
        if (typeof fixAvailable === 'boolean') {
            return fixAvailable;
        }
        return fixAvailable && !fixAvailable.isSemVerMajor;
    }
    /**
     * Get fix description
     */
    getFixDescription(fixAvailable) {
        if (typeof fixAvailable === 'boolean') {
            return fixAvailable ? 'Run npm audit fix' : 'Manual update required';
        }
        if (fixAvailable.isSemVerMajor) {
            return `Update to ${fixAvailable.name}@${fixAvailable.version} (breaking change)`;
        }
        return `Run npm audit fix to update to ${fixAvailable.name}@${fixAvailable.version}`;
    }
    /**
     * Format vulnerability documentation
     */
    formatVulnerabilityDoc(packageName, vuln, details) {
        let doc = `## Security Vulnerability: ${packageName}\n\n`;
        doc += `**Severity**: ${vuln.severity.toUpperCase()}\n`;
        doc += `**Vulnerable Versions**: ${vuln.range}\n`;
        doc += `**Details**: ${details}\n\n`;
        if (vuln.effects && vuln.effects.length > 0) {
            doc += `**Affected Dependencies**:\n`;
            vuln.effects.forEach(effect => {
                doc += `- ${effect}\n`;
            });
            doc += '\n';
        }
        if (vuln.fixAvailable) {
            if (typeof vuln.fixAvailable === 'boolean') {
                doc += '✅ **Fix Available**: Run `npm audit fix`\n';
            }
            else {
                doc += `✅ **Fix Available**: Update to ${vuln.fixAvailable.name}@${vuln.fixAvailable.version}`;
                if (vuln.fixAvailable.isSemVerMajor) {
                    doc += ' (⚠️ Breaking change)';
                }
                doc += '\n';
            }
        }
        else {
            doc += '❌ **No automated fix available** - Manual intervention required\n';
        }
        return doc;
    }
    /**
     * Format summary documentation
     */
    formatSummaryDoc(vulnerabilities) {
        let doc = '## Security Vulnerability Summary\n\n';
        doc += '| Severity | Count |\n';
        doc += '|----------|-------|\n';
        doc += `| Critical | ${vulnerabilities.critical || 0} |\n`;
        doc += `| High | ${vulnerabilities.high || 0} |\n`;
        doc += `| Moderate | ${vulnerabilities.moderate || 0} |\n`;
        doc += `| Low | ${vulnerabilities.low || 0} |\n`;
        doc += `| Info | ${vulnerabilities.info || 0} |\n`;
        doc += `| **Total** | **${vulnerabilities.total || 0}** |\n\n`;
        doc += '### Recommended Actions:\n';
        doc += '1. Run `npm audit fix` to automatically fix compatible issues\n';
        doc += '2. Run `npm audit fix --force` for breaking changes (test thoroughly)\n';
        doc += '3. Review and manually update packages with no automated fixes\n';
        doc += '4. Consider using `npm audit fix --dry-run` to preview changes\n';
        return doc;
    }
    /**
     * Calculate security score (0-10)
     */
    calculateSecurityScore(vulnerabilities) {
        if (vulnerabilities.total === 0)
            return 10;
        // Weighted scoring based on severity
        const criticalWeight = 10;
        const highWeight = 5;
        const moderateWeight = 2;
        const lowWeight = 1;
        const infoWeight = 0.5;
        const totalWeight = (vulnerabilities.critical * criticalWeight) +
            (vulnerabilities.high * highWeight) +
            (vulnerabilities.moderate * moderateWeight) +
            (vulnerabilities.low * lowWeight) +
            (vulnerabilities.info * infoWeight);
        // Scale to 0-10 (10 = no vulnerabilities, 0 = many critical)
        let score = 10 - (totalWeight / 10);
        score = Math.max(0, Math.min(10, score));
        return Math.round(score * 10) / 10;
    }
    /**
     * Create empty result when no package.json found
     */
    createEmptyResult(startTime) {
        return {
            success: true,
            toolId: this.id,
            executionTime: Date.now() - startTime,
            findings: [],
            metrics: {
                vulnerabilitiesTotal: 0,
                vulnerabilitiesCritical: 0,
                vulnerabilitiesHigh: 0,
                vulnerabilitiesModerate: 0,
                vulnerabilitiesLow: 0,
                vulnerabilitiesInfo: 0,
                securityScore: 10,
                fixableVulnerabilities: 0,
                criticalFindings: 0,
                highFindings: 0
            }
        };
    }
    /**
     * Get tool metadata
     */
    getMetadata() {
        return {
            id: this.id,
            name: this.name,
            description: 'Security vulnerability scanner for npm dependencies',
            author: 'CodeQual',
            homepage: 'https://docs.npmjs.com/cli/v10/commands/npm-audit',
            documentationUrl: 'https://docs.codequal.com/tools/npm-audit',
            supportedRoles: ['security'],
            supportedLanguages: ['javascript', 'typescript'],
            supportedFrameworks: ['node', 'react', 'vue', 'angular', 'express', 'next', 'nuxt'],
            tags: ['npm', 'security', 'vulnerabilities', 'audit', 'dependencies', 'CVE'],
            securityVerified: true,
            lastVerified: new Date('2025-06-11')
        };
    }
}
exports.NpmAuditDirectAdapter = NpmAuditDirectAdapter;
// Export singleton instance
exports.npmAuditDirectAdapter = new NpmAuditDirectAdapter();
//# sourceMappingURL=npm-audit-direct.js.map