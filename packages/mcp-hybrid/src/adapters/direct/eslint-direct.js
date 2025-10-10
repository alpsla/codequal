"use strict";
/**
 * ESLint Direct Adapter
 * Directly executes ESLint for JavaScript/TypeScript analysis
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
exports.eslintDirectAdapter = exports.ESLintDirectAdapter = void 0;
const base_adapter_1 = require("./base-adapter");
const child_process_1 = require("child_process");
const path = __importStar(require("path"));
const fs = __importStar(require("fs/promises"));
class ESLintDirectAdapter extends base_adapter_1.DirectToolAdapter {
    constructor() {
        super(...arguments);
        this.id = 'eslint-direct';
        this.name = 'ESLint Code Quality Analyzer';
        this.version = '9.0.0';
        this.capabilities = [
            {
                name: 'linting',
                category: 'quality',
                languages: ['javascript', 'typescript'],
                fileTypes: ['.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs']
            },
            {
                name: 'code-smell-detection',
                category: 'quality',
                languages: ['javascript', 'typescript'],
                fileTypes: ['.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs']
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
        // Check if PR has JavaScript/TypeScript files
        const supportedExtensions = ['.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs'];
        return context.pr.files.some(file => {
            const ext = path.extname(file.path).toLowerCase();
            return supportedExtensions.includes(ext) && file.changeType !== 'deleted';
        });
    }
    async analyze(context) {
        const startTime = Date.now();
        const findings = [];
        try {
            // Filter files for ESLint analysis
            const supportedExtensions = ['.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs'];
            const jstsFiles = context.pr.files.filter(file => {
                const ext = path.extname(file.path).toLowerCase();
                return supportedExtensions.includes(ext) && file.changeType !== 'deleted';
            });
            if (jstsFiles.length === 0) {
                return {
                    success: true,
                    toolId: this.id,
                    executionTime: Date.now() - startTime,
                    findings: [],
                    metrics: { filesAnalyzed: 0, totalIssues: 0, errors: 0, warnings: 0 }
                };
            }
            // Create temporary directory
            const tempDir = `/tmp/eslint-direct-${Date.now()}`;
            await fs.mkdir(tempDir, { recursive: true });
            try {
                // Write files to temp directory
                for (const file of jstsFiles) {
                    const filePath = path.join(tempDir, file.path);
                    await fs.mkdir(path.dirname(filePath), { recursive: true });
                    await fs.writeFile(filePath, file.content);
                }
                // Create basic ESLint config
                await this.writeESLintConfig(tempDir, context);
                // Run ESLint
                const eslintResults = await this.runESLint(tempDir, jstsFiles.map(f => f.path));
                // Parse results
                for (const result of eslintResults) {
                    const originalFile = jstsFiles.find(f => result.filePath.endsWith(f.path));
                    if (originalFile) {
                        const fileFindings = this.parseESLintMessages(result, originalFile.path);
                        findings.push(...fileFindings);
                    }
                }
                const metrics = this.calculateMetrics(eslintResults);
                return {
                    success: true,
                    toolId: this.id,
                    executionTime: Date.now() - startTime,
                    findings,
                    metrics
                };
            }
            finally {
                // Cleanup temp directory
                await fs.rm(tempDir, { recursive: true, force: true }).catch(err => {
                    // Ignore cleanup errors
                    console.warn('Failed to cleanup temp directory:', err);
                });
            }
        }
        catch (error) {
            return {
                success: false,
                toolId: this.id,
                executionTime: Date.now() - startTime,
                error: {
                    code: 'ESLINT_EXECUTION_FAILED',
                    message: error instanceof Error ? error.message : String(error),
                    recoverable: true
                }
            };
        }
    }
    async writeESLintConfig(tempDir, context) {
        const isTypeScript = context.repository.languages.includes('typescript');
        const frameworks = context.repository.frameworks || [];
        const config = {
            env: {
                browser: true,
                es2021: true,
                node: true
            },
            extends: ['eslint:recommended'],
            parserOptions: {
                ecmaVersion: 'latest',
                sourceType: 'module'
            },
            rules: {
                'no-unused-vars': 'warn',
                'no-console': 'warn',
                'no-debugger': 'error',
                'no-alert': 'warn',
                'no-var': 'error',
                'prefer-const': 'warn',
                'eqeqeq': ['error', 'always'],
                'curly': ['error', 'multi-line'],
                'no-eval': 'error'
            }
        };
        // Add TypeScript support
        if (isTypeScript) {
            config.parser = '@typescript-eslint/parser';
            config.plugins = ['@typescript-eslint'];
            config.extends.push('@typescript-eslint/recommended');
            config.rules['@typescript-eslint/no-unused-vars'] = 'warn';
            config.rules['no-unused-vars'] = 'off';
        }
        // Add React support
        if (frameworks.includes('react')) {
            config.plugins = config.plugins || [];
            config.plugins.push('react', 'react-hooks');
            config.extends.push('plugin:react/recommended', 'plugin:react-hooks/recommended');
            config.parserOptions.ecmaFeatures = { jsx: true };
            config.settings = { react: { version: 'detect' } };
        }
        // Use legacy .eslintrc.json format with ESLINT_USE_FLAT_CONFIG=false
        const configPath = path.join(tempDir, '.eslintrc.json');
        await fs.writeFile(configPath, JSON.stringify(config, null, 2));
    }
    async runESLint(tempDir, filePaths) {
        return new Promise((resolve, reject) => {
            const fullPaths = filePaths.map(f => path.join(tempDir, f));
            const eslintProcess = (0, child_process_1.spawn)('npx', ['eslint', '--format', 'json', ...fullPaths], {
                cwd: tempDir,
                stdio: ['pipe', 'pipe', 'pipe'],
                env: {
                    ...process.env,
                    ESLINT_USE_FLAT_CONFIG: 'false'
                }
            });
            let stdout = '';
            let stderr = '';
            eslintProcess.stdout?.on('data', (data) => {
                stdout += data.toString();
            });
            eslintProcess.stderr?.on('data', (data) => {
                stderr += data.toString();
            });
            eslintProcess.on('close', (code) => {
                try {
                    // ESLint exits with code 1 when there are linting errors, which is expected
                    if (code !== null && code > 2) {
                        reject(new Error(`ESLint failed with code ${code}: ${stderr}`));
                        return;
                    }
                    // Parse JSON output
                    if (stdout.trim()) {
                        const results = JSON.parse(stdout);
                        resolve(results);
                    }
                    else {
                        resolve([]);
                    }
                }
                catch (error) {
                    reject(new Error(`Failed to parse ESLint output: ${error}`));
                }
            });
            eslintProcess.on('error', (error) => {
                reject(new Error(`Failed to run ESLint: ${error.message}`));
            });
        });
    }
    parseESLintMessages(result, originalPath) {
        const findings = [];
        for (const message of result.messages) {
            const finding = {
                type: message.severity === 2 ? 'issue' : 'suggestion',
                severity: message.severity === 2 ? 'high' : 'medium',
                category: 'code-quality',
                message: message.message,
                file: originalPath,
                line: message.line,
                column: message.column,
                ruleId: message.ruleId || undefined,
                documentation: message.ruleId
                    ? `https://eslint.org/docs/latest/rules/${message.ruleId}`
                    : undefined,
                autoFixable: !!message.fix
            };
            // Enhance severity for specific rules
            if (message.ruleId === 'no-eval' || message.ruleId === 'no-implied-eval') {
                finding.severity = 'critical';
            }
            else if (message.ruleId === 'no-debugger' || message.ruleId === 'no-alert') {
                finding.severity = 'high';
            }
            findings.push(finding);
        }
        return findings;
    }
    calculateMetrics(results) {
        let totalErrors = 0;
        let totalWarnings = 0;
        let fixableErrors = 0;
        let fixableWarnings = 0;
        let filesWithErrors = 0;
        let filesWithWarnings = 0;
        for (const result of results) {
            totalErrors += result.errorCount;
            totalWarnings += result.warningCount;
            fixableErrors += result.fixableErrorCount;
            fixableWarnings += result.fixableWarningCount;
            if (result.errorCount > 0)
                filesWithErrors++;
            if (result.warningCount > 0)
                filesWithWarnings++;
        }
        return {
            filesAnalyzed: results.length,
            totalIssues: totalErrors + totalWarnings,
            errors: totalErrors,
            warnings: totalWarnings,
            fixableIssues: fixableErrors + fixableWarnings,
            fixableErrors,
            fixableWarnings,
            filesWithErrors,
            filesWithWarnings,
            averageIssuesPerFile: results.length > 0
                ? (totalErrors + totalWarnings) / results.length
                : 0
        };
    }
    getMetadata() {
        return {
            id: this.id,
            name: this.name,
            description: 'Direct ESLint adapter for JavaScript/TypeScript linting',
            author: 'CodeQual',
            homepage: 'https://eslint.org/',
            documentationUrl: 'https://docs.codequal.com/tools/eslint-direct',
            supportedRoles: ['codeQuality'],
            supportedLanguages: ['javascript', 'typescript'],
            supportedFrameworks: ['react', 'vue', 'angular', 'node', 'express', 'next', 'nuxt'],
            tags: ['linting', 'code-quality', 'javascript', 'typescript'],
            securityVerified: true,
            lastVerified: new Date('2025-06-11')
        };
    }
    /**
     * Get health check command for ESLint
     */
    getHealthCheckCommand() {
        return {
            cmd: 'npx',
            args: ['eslint', '--version']
        };
    }
}
exports.ESLintDirectAdapter = ESLintDirectAdapter;
// Export singleton instance
exports.eslintDirectAdapter = new ESLintDirectAdapter();
//# sourceMappingURL=eslint-direct.js.map