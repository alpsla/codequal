"use strict";
/**
 * Tool Registry for managing MCP and direct tools
 * Handles tool registration, discovery, and role-based selection
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.toolRegistry = exports.ToolRegistry = void 0;
class ToolRegistry {
    constructor() {
        this.tools = new Map();
        this.roleMapping = new Map();
        this.languageMapping = new Map();
        this.initializeRoleMappings();
    }
    /**
     * Initialize role mappings with primary and fallback tools
     * Each role has at least 2 tools for redundancy
     * UPDATED: June 11, 2025 - Added new Phase 2 direct tools
     */
    initializeRoleMappings() {
        // Security role tools
        this.roleMapping.set('security', new Set([
            'mcp-scan', // Primary: security verification
            'semgrep-mcp', // Primary: code security scanning
            'npm-audit-direct', // Primary: vulnerability scanning (NEW)
            'ref-mcp', // Primary: real-time CVE/vulnerability research
            'sonarqube' // Fallback: general security checks
        ]));
        // Code quality role tools
        this.roleMapping.set('codeQuality', new Set([
            'eslint-direct', // Primary: JS/TS linting
            'jscpd-direct', // Primary: copy-paste detection (NEW)
            'sonarjs-direct', // Primary: advanced quality rules (NEW)
            'prettier-direct', // Primary: formatting checks
            'serena-mcp', // Primary: semantic code understanding & refactoring
            'sonarqube' // Fallback: multi-language quality
        ]));
        // Architecture role tools
        this.roleMapping.set('architecture', new Set([
            'madge-direct', // Primary: circular dependency detection
            'serena-mcp', // Primary: code structure & architecture analysis
            'git-mcp' // Fallback: file structure analysis
        ]));
        // Performance role tools
        this.roleMapping.set('performance', new Set([
            'lighthouse-direct', // Primary: web performance (when implemented)
            'bundlephobia-direct', // Primary: bundle size analysis (NEW)
            'sonarqube', // Primary: code complexity
            'sonarjs-direct' // Fallback: complexity metrics (NEW)
        ]));
        // Dependency role tools (focused on package management)
        this.roleMapping.set('dependency', new Set([
            'npm-audit-direct', // Primary: security vulnerabilities (NEW)
            'license-checker-direct', // Primary: license compliance (NEW)
            'npm-outdated-direct', // Primary: version currency (NEW)
            'dependency-cruiser-direct', // Primary: dependency validation & rules
            'ref-mcp' // Primary: package research, licenses, known issues
        ]));
        // Educational role tools
        this.roleMapping.set('educational', new Set([
            'context-mcp', // Primary: retrieves context from Vector DB & web
            'context7-mcp', // Primary: real-time documentation & version info (Context 7)
            'working-examples-mcp', // Primary: real working code examples
            'mcp-docs-service', // Primary: documentation analysis
            'ref-mcp', // Primary: tutorials, documentation, best practices research
            'knowledge-graph-mcp', // Secondary: identifies learning paths
            'mcp-memory', // Fallback: stores/retrieves learning progress
            'web-search-mcp' // Fallback: finds educational resources
        ]));
        // Reporting role tools
        this.roleMapping.set('reporting', new Set([
            'chartjs-mcp', // Primary: generates charts/visualizations
            'mermaid-mcp', // Primary: creates diagrams
            'markdown-pdf-mcp', // Fallback: formats reports
            'grafana-direct' // Fallback: dashboard integration
        ]));
    }
    /**
     * Register a tool in the registry
     */
    register(tool) {
        const metadata = tool.getMetadata();
        // Register in main registry
        this.tools.set(tool.id, tool);
        // Update role mappings
        metadata.supportedRoles.forEach((role) => {
            if (!this.roleMapping.has(role)) {
                this.roleMapping.set(role, new Set());
            }
            this.roleMapping.get(role).add(tool.id);
        });
        // Update language mappings
        if (metadata.supportedLanguages.length > 0) {
            metadata.supportedLanguages.forEach((lang) => {
                if (!this.languageMapping.has(lang)) {
                    this.languageMapping.set(lang, new Set());
                }
                this.languageMapping.get(lang).add(tool.id);
            });
        }
        else {
            // Tool supports all languages
            this.languageMapping.set('*', this.languageMapping.get('*') || new Set());
            this.languageMapping.get('*').add(tool.id);
        }
        console.info(`Registered tool: ${tool.id} (${tool.type})`);
    }
    /**
     * Unregister a tool
     */
    unregister(toolId) {
        const tool = this.tools.get(toolId);
        if (!tool)
            return false;
        const metadata = tool.getMetadata();
        // Remove from role mappings
        metadata.supportedRoles.forEach((role) => {
            this.roleMapping.get(role)?.delete(toolId);
        });
        // Remove from language mappings
        this.languageMapping.forEach((toolSet) => {
            toolSet.delete(toolId);
        });
        // Remove from main registry
        this.tools.delete(toolId);
        console.info(`Unregistered tool: ${toolId}`);
        return true;
    }
    /**
     * Get a tool by ID
     */
    getTool(toolId) {
        return this.tools.get(toolId);
    }
    /**
     * Get all registered tools
     */
    getAllTools() {
        return Array.from(this.tools.values());
    }
    /**
     * Get tools for a specific role
     */
    getToolsForRole(role) {
        const toolIds = this.roleMapping.get(role) || new Set();
        return Array.from(toolIds)
            .map(id => this.tools.get(id))
            .filter((tool) => tool !== undefined);
    }
    /**
     * Get tools that support a specific language
     */
    getToolsForLanguage(language) {
        const toolIds = new Set();
        // Add language-specific tools
        this.languageMapping.get(language)?.forEach(id => toolIds.add(id));
        // Add universal tools
        this.languageMapping.get('*')?.forEach(id => toolIds.add(id));
        return Array.from(toolIds)
            .map(id => this.tools.get(id))
            .filter((tool) => tool !== undefined);
    }
    /**
     * Get tools that can analyze the given context
     */
    getCompatibleTools(context) {
        return this.getAllTools().filter(tool => tool.canAnalyze(context));
    }
    /**
     * Get tools by type (MCP or direct)
     */
    getToolsByType(type) {
        return this.getAllTools().filter(tool => tool.type === type);
    }
    /**
     * Check if a tool is registered
     */
    hasTool(toolId) {
        return this.tools.has(toolId);
    }
    /**
     * Get statistics about registered tools
     */
    getStatistics() {
        const tools = this.getAllTools();
        const byType = {
            mcp: 0,
            direct: 0
        };
        const byRole = {};
        const byLanguage = {};
        // Count by type
        tools.forEach((tool) => {
            byType[tool.type]++;
        });
        // Count by role
        this.roleMapping.forEach((toolIds, role) => {
            byRole[role] = toolIds.size;
        });
        // Count by language
        this.languageMapping.forEach((toolIds, lang) => {
            byLanguage[lang] = toolIds.size;
        });
        return {
            total: tools.length,
            byType,
            byRole: byRole,
            byLanguage
        };
    }
    /**
     * Validate all registered tools
     */
    async validateAll() {
        const results = new Map();
        for (const [toolId, tool] of this.tools) {
            try {
                const isHealthy = await tool.healthCheck();
                results.set(toolId, isHealthy);
            }
            catch (error) {
                console.error(`Health check failed for ${toolId}:`, error);
                results.set(toolId, false);
            }
        }
        return results;
    }
}
exports.ToolRegistry = ToolRegistry;
// Export singleton instance
exports.toolRegistry = new ToolRegistry();
//# sourceMappingURL=registry.js.map