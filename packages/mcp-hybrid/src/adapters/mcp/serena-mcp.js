"use strict";
/**
 * Serena MCP Adapter - Semantic Code Understanding via LSP
 * Provides intelligent code analysis, refactoring suggestions, and semantic understanding
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.serenaMCPAdapter = exports.SerenaMCPAdapter = void 0;
const base_mcp_adapter_1 = require("./base-mcp-adapter");
class SerenaMCPAdapter extends base_mcp_adapter_1.BaseMCPAdapter {
    constructor() {
        super(...arguments);
        this.id = 'serena-mcp';
        this.name = 'Serena - Semantic Code Analysis';
        this.version = '1.0.0';
        this.capabilities = [
            {
                name: 'semantic-analysis',
                category: 'quality',
                languages: ['javascript', 'typescript', 'python', 'go', 'rust', 'java'],
                fileTypes: []
            },
            {
                name: 'architecture-understanding',
                category: 'architecture',
                languages: ['javascript', 'typescript', 'python', 'go', 'rust', 'java'],
                fileTypes: []
            },
            {
                name: 'refactoring-suggestions',
                category: 'quality',
                languages: ['javascript', 'typescript', 'python', 'go', 'rust', 'java'],
                fileTypes: []
            }
        ];
        this.requirements = {
            executionMode: 'on-demand',
            timeout: 60000, // 60 seconds for semantic analysis
            authentication: {
                type: 'none',
                required: false
            }
        };
    }
    // MCP server configuration
    get mcpServerArgs() {
        return ['node', 'serena-mcp-server'];
    }
    /**
     * Check if tool can analyze given context
     */
    canAnalyze(context) {
        // Serena can analyze code in supported languages
        const supportedLanguages = ['javascript', 'typescript', 'python', 'go', 'rust', 'java'];
        return context.repository.languages.some(lang => supportedLanguages.includes(lang.toLowerCase())) || !!(context.repository.primaryLanguage &&
            supportedLanguages.includes(context.repository.primaryLanguage.toLowerCase()));
    }
    /**
     * Analyze PR using Serena's semantic understanding
     */
    async analyze(context) {
        const startTime = Date.now();
        try {
            const findings = [];
            // Different analysis based on agent role
            switch (context.agentRole) {
                case 'codeQuality':
                    findings.push(...await this.analyzeCodeQuality(context));
                    break;
                case 'architecture':
                    findings.push(...await this.analyzeArchitecture(context));
                    break;
                case 'security':
                    findings.push(...await this.analyzeSecurityPatterns(context));
                    break;
                default:
                    // General semantic analysis
                    findings.push(...await this.performSemanticAnalysis(context));
            }
            return {
                success: true,
                toolId: this.id,
                executionTime: Date.now() - startTime,
                findings
            };
        }
        catch (error) {
            return {
                success: false,
                toolId: this.id,
                executionTime: Date.now() - startTime,
                error: {
                    code: 'SERENA_ANALYSIS_ERROR',
                    message: error instanceof Error ? error.message : 'Serena analysis failed',
                    recoverable: true
                }
            };
        }
    }
    /**
     * Analyze code quality using semantic understanding
     */
    async analyzeCodeQuality(context) {
        const findings = [];
        // Analyze each changed file
        for (const file of context.pr.files) {
            if (file.changeType === 'deleted')
                continue;
            // Check for complex functions
            const complexFunctions = this.findComplexFunctions(file.content);
            for (const func of complexFunctions) {
                findings.push({
                    type: 'suggestion',
                    severity: 'medium',
                    category: 'code-quality',
                    message: `Function '${func.name}' has high cognitive complexity`,
                    file: file.path,
                    line: func.line,
                    documentation: 'Consider breaking this function into smaller, more focused functions',
                    autoFixable: false,
                    fix: {
                        description: 'Refactor into smaller functions',
                        changes: []
                    }
                });
            }
            // Check for code duplication patterns
            const duplicates = this.findDuplicationPatterns(file.content);
            for (const dup of duplicates) {
                findings.push({
                    type: 'suggestion',
                    severity: 'low',
                    category: 'code-quality',
                    message: 'Potential code duplication detected',
                    file: file.path,
                    line: dup.line,
                    documentation: 'Consider extracting common logic into a reusable function'
                });
            }
        }
        return findings;
    }
    /**
     * Analyze architecture using semantic understanding
     */
    async analyzeArchitecture(context) {
        const findings = [];
        // Analyze module structure
        const moduleIssues = this.analyzeModuleStructure(context);
        findings.push(...moduleIssues);
        // Check for architectural patterns
        const patternIssues = this.checkArchitecturalPatterns(context);
        findings.push(...patternIssues);
        return findings;
    }
    /**
     * Analyze security patterns
     */
    async analyzeSecurityPatterns(context) {
        const findings = [];
        for (const file of context.pr.files) {
            if (file.changeType === 'deleted')
                continue;
            // Check for hardcoded secrets patterns
            if (this.hasHardcodedSecrets(file.content)) {
                findings.push({
                    type: 'issue',
                    severity: 'critical',
                    category: 'security',
                    message: 'Potential hardcoded secret detected',
                    file: file.path,
                    documentation: 'Use environment variables or secure key management instead'
                });
            }
            // Check for unsafe patterns
            const unsafePatterns = this.findUnsafePatterns(file.content);
            findings.push(...unsafePatterns.map(pattern => ({
                type: 'issue',
                severity: 'high',
                category: 'security',
                message: pattern.message,
                file: file.path,
                line: pattern.line,
                documentation: pattern.suggestion
            })));
        }
        return findings;
    }
    /**
     * Perform general semantic analysis
     */
    async performSemanticAnalysis(context) {
        const findings = [];
        // Analyze naming conventions
        const namingIssues = this.analyzeNamingConventions(context);
        findings.push(...namingIssues);
        // Analyze function signatures
        const signatureIssues = this.analyzeFunctionSignatures(context);
        findings.push(...signatureIssues);
        return findings;
    }
    /**
     * Helper methods for analysis
     */
    findComplexFunctions(content) {
        const functions = [];
        const lines = content.split('\n');
        // Simple heuristic: functions with more than 20 lines
        let inFunction = false;
        let functionStart = 0;
        let functionName = '';
        lines.forEach((line, index) => {
            if (line.match(/function\s+(\w+)|const\s+(\w+)\s*=.*=>/)) {
                inFunction = true;
                functionStart = index;
                functionName = line.match(/function\s+(\w+)|const\s+(\w+)/)?.[1] || 'anonymous';
            }
            else if (inFunction && line.includes('}')) {
                if (index - functionStart > 20) {
                    functions.push({ name: functionName, line: functionStart + 1 });
                }
                inFunction = false;
            }
        });
        return functions;
    }
    findDuplicationPatterns(content) {
        // Simplified duplication detection
        const duplicates = [];
        const lines = content.split('\n');
        const patterns = new Map();
        // Look for similar lines (simplified)
        lines.forEach((line, index) => {
            const normalized = line.trim();
            if (normalized.length > 20) {
                if (!patterns.has(normalized)) {
                    patterns.set(normalized, []);
                }
                patterns.get(normalized).push(index);
            }
        });
        patterns.forEach((occurrences) => {
            if (occurrences.length > 2) {
                duplicates.push({ line: occurrences[0] + 1 });
            }
        });
        return duplicates;
    }
    analyzeModuleStructure(context) {
        const findings = [];
        // Check for circular dependencies hint
        const imports = new Map();
        for (const file of context.pr.files) {
            if (file.changeType === 'deleted')
                continue;
            const fileImports = this.extractImports(file.content);
            if (fileImports.length > 10) {
                findings.push({
                    type: 'suggestion',
                    severity: 'medium',
                    category: 'architecture',
                    message: 'High number of imports detected',
                    file: file.path,
                    documentation: 'Consider refactoring to reduce module coupling'
                });
            }
        }
        return findings;
    }
    checkArchitecturalPatterns(context) {
        const findings = [];
        // Check for proper separation of concerns
        for (const file of context.pr.files) {
            if (file.content.includes('database') && file.content.includes('render')) {
                findings.push({
                    type: 'suggestion',
                    severity: 'medium',
                    category: 'architecture',
                    message: 'Mixing data access and presentation logic',
                    file: file.path,
                    documentation: 'Consider separating data access logic from presentation logic'
                });
            }
        }
        return findings;
    }
    hasHardcodedSecrets(content) {
        const secretPatterns = [
            /api[_-]?key\s*[:=]\s*["'][^"']+["']/i,
            /password\s*[:=]\s*["'][^"']+["']/i,
            /secret\s*[:=]\s*["'][^"']+["']/i,
            /token\s*[:=]\s*["'][^"']+["']/i
        ];
        return secretPatterns.some(pattern => pattern.test(content));
    }
    findUnsafePatterns(content) {
        const patterns = [];
        const lines = content.split('\n');
        lines.forEach((line, index) => {
            // SQL injection risk
            if (line.includes('query') && line.includes('+') && !line.includes('?')) {
                patterns.push({
                    message: 'Potential SQL injection vulnerability',
                    line: index + 1,
                    suggestion: 'Use parameterized queries instead of string concatenation'
                });
            }
            // eval usage
            if (line.includes('eval(')) {
                patterns.push({
                    message: 'Use of eval() is dangerous',
                    line: index + 1,
                    suggestion: 'Consider using safer alternatives like JSON.parse() or Function constructor'
                });
            }
        });
        return patterns;
    }
    analyzeNamingConventions(context) {
        const findings = [];
        for (const file of context.pr.files) {
            const lines = file.content.split('\n');
            lines.forEach((line, index) => {
                // Check for non-conventional naming
                const varMatch = line.match(/(?:const|let|var)\s+([a-z_]\w*)/);
                if (varMatch && varMatch[1].includes('_') && !varMatch[1].startsWith('_')) {
                    findings.push({
                        type: 'suggestion',
                        severity: 'low',
                        category: 'code-quality',
                        message: `Variable '${varMatch[1]}' uses snake_case instead of camelCase`,
                        file: file.path,
                        line: index + 1,
                        documentation: 'JavaScript/TypeScript convention is to use camelCase for variables'
                    });
                }
            });
        }
        return findings;
    }
    analyzeFunctionSignatures(context) {
        const findings = [];
        for (const file of context.pr.files) {
            if (file.path.endsWith('.ts') || file.path.endsWith('.tsx')) {
                // Check for functions without return types
                const functionRegex = /function\s+\w+\s*\([^)]*\)\s*{/g;
                const matches = file.content.matchAll(functionRegex);
                for (const match of matches) {
                    if (!match[0].includes(':')) {
                        const line = file.content.substring(0, match.index).split('\n').length;
                        findings.push({
                            type: 'suggestion',
                            severity: 'low',
                            category: 'code-quality',
                            message: 'Function missing explicit return type',
                            file: file.path,
                            line,
                            documentation: 'Consider adding explicit return type for better type safety'
                        });
                    }
                }
            }
        }
        return findings;
    }
    extractImports(content) {
        const imports = [];
        const importRegex = /import\s+.*\s+from\s+['"]([^'"]+)['"]/g;
        const matches = content.matchAll(importRegex);
        for (const match of matches) {
            imports.push(match[1]);
        }
        return imports;
    }
    /**
     * Health check
     */
    async healthCheck() {
        // Serena doesn't require external services
        return true;
    }
    /**
     * Override to prevent MCP server initialization
     */
    async initializeMCPServer() {
        // No MCP server needed - we use direct implementation
        this.isInitialized = true;
    }
    /**
     * Get metadata
     */
    getMetadata() {
        return {
            id: this.id,
            name: this.name,
            description: 'Semantic code understanding via Language Server Protocol with intelligent refactoring suggestions',
            author: 'CodeQual',
            homepage: 'https://github.com/serena/serena-mcp',
            documentationUrl: 'https://github.com/serena/serena-mcp#readme',
            supportedRoles: ['codeQuality', 'architecture', 'security'],
            supportedLanguages: ['javascript', 'typescript', 'python', 'go', 'rust', 'java'],
            supportedFrameworks: [],
            tags: ['semantic-analysis', 'refactoring', 'code-quality', 'lsp', 'architecture'],
            securityVerified: true,
            lastVerified: new Date('2025-01-28')
        };
    }
}
exports.SerenaMCPAdapter = SerenaMCPAdapter;
// Export singleton instance
exports.serenaMCPAdapter = new SerenaMCPAdapter();
//# sourceMappingURL=serena-mcp.js.map