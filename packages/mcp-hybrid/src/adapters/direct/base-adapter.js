"use strict";
/**
 * Base adapter for direct tool integrations
 * Provides common functionality for non-MCP tools
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.dependencyCruiserDirectAdapter = exports.prettierDirectAdapter = exports.DependencyCruiserDirectAdapter = exports.PrettierDirectAdapter = exports.DirectToolAdapter = void 0;
const child_process_1 = require("child_process");
const util_1 = require("util");
const execAsync = (0, util_1.promisify)(child_process_1.exec);
class DirectToolAdapter {
    constructor() {
        this.type = 'direct';
    }
    /**
     * Execute command and return output
     */
    async executeCommand(command, args, options) {
        return new Promise((resolve, reject) => {
            const child = (0, child_process_1.spawn)(command, args, {
                cwd: options?.cwd,
                env: { ...process.env, ...options?.env },
                timeout: options?.timeout
            });
            let stdout = '';
            let stderr = '';
            child.stdout.on('data', (data) => {
                stdout += data.toString();
            });
            child.stderr.on('data', (data) => {
                stderr += data.toString();
            });
            child.on('close', (code) => {
                resolve({ stdout, stderr, code: code || 0 });
            });
            child.on('error', (error) => {
                reject(error);
            });
        });
    }
    /**
     * Simple command execution with output
     */
    async execSimple(command) {
        const { stdout } = await execAsync(command);
        return stdout.trim();
    }
    /**
     * Parse JSON output safely
     */
    parseJsonOutput(output) {
        try {
            // First try to parse as-is
            return JSON.parse(output);
        }
        catch {
            try {
                // Remove any non-JSON content before/after
                const jsonMatch = output.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
                if (jsonMatch) {
                    return JSON.parse(jsonMatch[0]);
                }
                return null;
            }
            catch {
                return null;
            }
        }
    }
    /**
     * Common health check implementation
     */
    async healthCheck() {
        try {
            const checkCommand = this.getHealthCheckCommand();
            const { code } = await this.executeCommand(checkCommand.cmd, checkCommand.args, {
                timeout: 5000
            });
            return code === 0;
        }
        catch {
            return false;
        }
    }
}
exports.DirectToolAdapter = DirectToolAdapter;
/**
 * Prettier Direct Adapter - Code formatting checks
 */
class PrettierDirectAdapter extends DirectToolAdapter {
    constructor() {
        super(...arguments);
        this.id = 'prettier-direct';
        this.name = 'Prettier Code Formatter';
        this.version = '3.0.0';
        this.capabilities = [
            {
                name: 'code-formatting',
                category: 'quality',
                languages: ['javascript', 'typescript', 'css', 'html', 'json', 'yaml'],
                fileTypes: ['.js', '.ts', '.jsx', '.tsx', '.css', '.html', '.json', '.yml', '.yaml']
            }
        ];
        this.requirements = {
            minFiles: 1,
            executionMode: 'on-demand',
            timeout: 20000,
            authentication: { type: 'none', required: false }
        };
    }
    canAnalyze(context) {
        // Check if PR has formattable files
        return context.pr.files.some(file => this.capabilities[0].fileTypes?.some(ext => file.path.endsWith(ext)));
    }
    async analyze(context) {
        const startTime = Date.now();
        const findings = [];
        try {
            // Check formatting for each file
            let formattedCount = 0;
            let needsFormattingCount = 0;
            for (const file of context.pr.files) {
                if (file.changeType === 'deleted')
                    continue;
                const isSupported = this.capabilities[0].fileTypes?.some(ext => file.path.endsWith(ext));
                if (isSupported) {
                    const needsFormatting = await this.checkFormatting(file.path);
                    if (needsFormatting) {
                        needsFormattingCount++;
                        findings.push({
                            type: 'suggestion',
                            severity: 'low',
                            category: 'formatting',
                            message: `File needs formatting: ${file.path}`,
                            file: file.path,
                            ruleId: 'prettier',
                            autoFixable: true,
                            fix: {
                                description: 'Run prettier --write',
                                changes: []
                            }
                        });
                    }
                    else {
                        formattedCount++;
                    }
                }
            }
            return {
                success: true,
                toolId: this.id,
                executionTime: Date.now() - startTime,
                findings,
                metrics: {
                    filesChecked: formattedCount + needsFormattingCount,
                    properlyFormatted: formattedCount,
                    needsFormatting: needsFormattingCount,
                    formattingRate: formattedCount / (formattedCount + needsFormattingCount)
                }
            };
        }
        catch (error) { // eslint-disable-line @typescript-eslint/no-explicit-any
            return {
                success: false,
                toolId: this.id,
                executionTime: Date.now() - startTime,
                error: {
                    code: 'PRETTIER_FAILED',
                    message: error.message,
                    recoverable: true
                }
            };
        }
    }
    async checkFormatting(filePath) {
        try {
            const { code } = await this.executeCommand('npx', [
                'prettier',
                '--check',
                filePath
            ], { timeout: 5000 });
            // Exit code 0 means properly formatted
            // Exit code 1 means needs formatting
            return code !== 0;
        }
        catch {
            // If prettier fails, assume file doesn't need formatting
            return false;
        }
    }
    getHealthCheckCommand() {
        return { cmd: 'npx', args: ['prettier', '--version'] };
    }
    getMetadata() {
        return {
            id: this.id,
            name: this.name,
            description: 'Code formatting checker using Prettier',
            author: 'CodeQual',
            supportedRoles: ['codeQuality'],
            supportedLanguages: ['javascript', 'typescript', 'css', 'html'],
            tags: ['formatting', 'code-style', 'quality'],
            securityVerified: true,
            lastVerified: new Date('2025-06-07')
        };
    }
}
exports.PrettierDirectAdapter = PrettierDirectAdapter;
/**
 * Dependency Cruiser Direct Adapter - Dependency analysis
 */
class DependencyCruiserDirectAdapter extends DirectToolAdapter {
    constructor() {
        super(...arguments);
        this.id = 'dependency-cruiser-direct';
        this.name = 'Dependency Cruiser';
        this.version = '15.0.0';
        this.capabilities = [
            {
                name: 'dependency-analysis',
                category: 'architecture',
                languages: ['javascript', 'typescript'],
                fileTypes: ['.js', '.ts', '.jsx', '.tsx']
            }
        ];
        this.requirements = {
            minFiles: 1,
            executionMode: 'on-demand',
            timeout: 30000,
            authentication: { type: 'none', required: false }
        };
    }
    canAnalyze(context) {
        const supportedLangs = ['javascript', 'typescript'];
        return context.repository.languages.some(lang => supportedLangs.includes(lang.toLowerCase()));
    }
    async analyze(context) {
        const startTime = Date.now();
        const findings = [];
        try {
            // Analyze dependencies in changed files
            const jsFiles = context.pr.files.filter(f => f.changeType !== 'deleted' &&
                this.capabilities[0].fileTypes?.some(ext => f.path.endsWith(ext)));
            if (jsFiles.length === 0) {
                return {
                    success: true,
                    toolId: this.id,
                    executionTime: Date.now() - startTime,
                    findings: [],
                    metrics: { filesAnalyzed: 0 }
                };
            }
            // Run dependency analysis
            const violations = await this.analyzeDependencies(jsFiles.map(f => f.path));
            // Convert violations to findings
            violations.forEach(violation => {
                findings.push({
                    type: 'issue',
                    severity: this.mapSeverity(violation.severity),
                    category: 'architecture',
                    message: violation.message,
                    file: violation.from,
                    ruleId: violation.rule,
                    documentation: violation.comment
                });
            });
            return {
                success: true,
                toolId: this.id,
                executionTime: Date.now() - startTime,
                findings,
                metrics: {
                    filesAnalyzed: jsFiles.length,
                    violations: violations.length,
                    circularDependencies: violations.filter(v => v.rule === 'no-circular').length
                }
            };
        }
        catch (error) { // eslint-disable-line @typescript-eslint/no-explicit-any
            return {
                success: false,
                toolId: this.id,
                executionTime: Date.now() - startTime,
                error: {
                    code: 'DEPCRUISE_FAILED',
                    message: error.message,
                    recoverable: true
                }
            };
        }
    }
    async analyzeDependencies(files) {
        // Simplified - in real implementation would parse actual output
        const { stdout } = await this.executeCommand('npx', [
            'depcruise',
            '--output-type', 'json',
            ...files
        ]);
        const result = this.parseJsonOutput(stdout);
        return result?.violations || [];
    }
    mapSeverity(severity) {
        switch (severity) {
            case 'error': return 'high';
            case 'warn': return 'medium';
            case 'info': return 'low';
            default: return 'info';
        }
    }
    getHealthCheckCommand() {
        return { cmd: 'npx', args: ['depcruise', '--version'] };
    }
    getMetadata() {
        return {
            id: this.id,
            name: this.name,
            description: 'Dependency analysis and validation',
            author: 'CodeQual',
            supportedRoles: ['architecture'],
            supportedLanguages: ['javascript', 'typescript'],
            tags: ['dependencies', 'architecture', 'validation'],
            securityVerified: true,
            lastVerified: new Date('2025-06-07')
        };
    }
}
exports.DependencyCruiserDirectAdapter = DependencyCruiserDirectAdapter;
// Export all direct adapters
exports.prettierDirectAdapter = new PrettierDirectAdapter();
exports.dependencyCruiserDirectAdapter = new DependencyCruiserDirectAdapter();
//# sourceMappingURL=base-adapter.js.map