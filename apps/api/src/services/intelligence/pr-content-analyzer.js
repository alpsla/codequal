"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PRContentAnalyzer = void 0;
const utils_1 = require("@codequal/core/utils");
// Agent skipping rules based on change types
const AGENT_SKIPPING_RULES = {
    'docs-only': {
        skip: ['security', 'performance', 'dependencies', 'architecture'],
        keep: ['codeQuality'] // Only documentation quality matters
    },
    'ui-only': {
        skip: ['security', 'dependencies', 'architecture'],
        keep: ['codeQuality', 'performance'] // UI performance and quality critical
    },
    'test-only': {
        skip: ['security', 'performance', 'dependencies'],
        keep: ['codeQuality', 'architecture'] // Test structure and quality
    },
    'config-only': {
        skip: ['performance', 'architecture', 'codeQuality'],
        keep: ['security', 'dependencies'] // Config security & deps critical
    },
    'style-only': {
        skip: ['security', 'performance', 'dependencies', 'architecture'],
        keep: ['codeQuality'] // Pure formatting/style changes
    },
    'dependency-update': {
        skip: ['architecture', 'performance'],
        keep: ['security', 'dependencies', 'codeQuality'] // Security scan critical
    },
    'feature': {
        skip: [], // Keep all agents for new features
        keep: ['security', 'architecture', 'performance', 'dependencies', 'codeQuality']
    },
    'bugfix': {
        skip: [], // Keep all agents for bug fixes
        keep: ['security', 'architecture', 'performance', 'dependencies', 'codeQuality']
    },
    'refactor': {
        skip: ['dependencies'], // Usually no dep changes in refactors
        keep: ['security', 'architecture', 'performance', 'codeQuality']
    },
    'mixed': {
        skip: [], // Mixed changes need full analysis
        keep: ['security', 'architecture', 'performance', 'dependencies', 'codeQuality']
    }
};
class PRContentAnalyzer {
    constructor() {
        this.logger = (0, utils_1.createLogger)('PRContentAnalyzer');
    }
    /**
     * Analyze PR content to determine which agents to skip
     */
    async analyzePR(files) {
        this.logger.info('Analyzing PR content', { fileCount: files.length });
        // Categorize files
        const fileAnalysis = this.categorizeFiles(files);
        // Determine change types
        const changeTypes = this.determineChangeTypes(fileAnalysis);
        // Calculate complexity
        const complexity = this.calculateComplexity(files);
        const riskLevel = this.assessRiskLevel(fileAnalysis, complexity);
        // Determine which agents to skip
        const agentRecommendations = this.determineAgentRecommendations(changeTypes, riskLevel);
        const analysis = {
            fileTypes: fileAnalysis.fileTypes,
            fileCategories: fileAnalysis.categories,
            changeTypes,
            impactedAreas: fileAnalysis.impactedAreas,
            complexity,
            riskLevel,
            totalChanges: files.reduce((sum, f) => sum + f.changes, 0),
            ...agentRecommendations
        };
        this.logger.info('PR analysis complete', {
            changeTypes,
            complexity,
            agentsToSkip: analysis.agentsToSkip
        });
        return analysis;
    }
    categorizeFiles(files) {
        const fileTypes = new Set();
        const categories = new Set();
        const impactedAreas = new Set();
        for (const file of files) {
            const ext = this.getFileExtension(file.filename);
            fileTypes.add(ext);
            // Categorize by file type
            const category = this.getFileCategory(file.filename);
            categories.add(category);
            // Determine impacted areas
            const areas = this.getImpactedAreas(file.filename);
            areas.forEach(area => impactedAreas.add(area));
        }
        return {
            fileTypes: Array.from(fileTypes),
            categories: Array.from(categories),
            impactedAreas: Array.from(impactedAreas)
        };
    }
    getFileExtension(filename) {
        const match = filename.match(/\.[^.]+$/);
        return match ? match[0] : '';
    }
    getFileCategory(filename) {
        const lower = filename.toLowerCase();
        // Test files
        if (lower.includes('.test.') || lower.includes('.spec.') ||
            lower.includes('__tests__') || lower.includes('/test/')) {
            return 'test';
        }
        // Documentation
        if (lower.endsWith('.md') || lower.includes('/docs/') ||
            lower.includes('readme') || lower.includes('changelog')) {
            return 'documentation';
        }
        // Configuration
        if (lower.includes('config') || lower.endsWith('.json') ||
            lower.endsWith('.yml') || lower.endsWith('.yaml') ||
            lower.includes('.env') || lower.includes('package.json')) {
            return 'configuration';
        }
        // Style/Assets
        if (lower.endsWith('.css') || lower.endsWith('.scss') ||
            lower.endsWith('.less') || lower.includes('/assets/') ||
            lower.match(/\.(png|jpg|jpeg|gif|svg|ico)$/)) {
            return 'style';
        }
        // Assets
        if (lower.match(/\.(png|jpg|jpeg|gif|svg|ico|woff|ttf|mp4|mov)$/)) {
            return 'asset';
        }
        // Default to code
        return 'code';
    }
    getImpactedAreas(filename) {
        const areas = [];
        const lower = filename.toLowerCase();
        if (lower.includes('/frontend/') || lower.includes('/client/') ||
            lower.includes('/ui/') || lower.includes('/components/')) {
            areas.push('frontend');
        }
        if (lower.includes('/backend/') || lower.includes('/server/') ||
            lower.includes('/api/') || lower.includes('/services/')) {
            areas.push('backend');
        }
        if (lower.includes('/database/') || lower.includes('/migrations/') ||
            lower.includes('/models/') || lower.includes('.sql')) {
            areas.push('database');
        }
        if (lower.includes('/test/') || lower.includes('.test.') ||
            lower.includes('.spec.') || lower.includes('__tests__')) {
            areas.push('tests');
        }
        if (lower.includes('/docs/') || lower.endsWith('.md')) {
            areas.push('docs');
        }
        if (lower.includes('/infra/') || lower.includes('/deploy/') ||
            lower.includes('dockerfile') || lower.includes('.yml')) {
            areas.push('infra');
        }
        if (lower.includes('package.json') || lower.includes('requirements.') ||
            lower.includes('gemfile') || lower.includes('go.mod')) {
            areas.push('deps');
        }
        return areas;
    }
    determineChangeTypes(fileAnalysis) {
        const types = new Set();
        const { categories, impactedAreas } = fileAnalysis;
        // Check for single-category changes
        if (categories.length === 1) {
            switch (categories[0]) {
                case 'documentation':
                    types.add('docs-only');
                    break;
                case 'test':
                    types.add('test-only');
                    break;
                case 'configuration':
                    types.add('config-only');
                    break;
                case 'style':
                    types.add('style-only');
                    break;
            }
        }
        // Check for UI-only changes
        if (impactedAreas.length === 1 && impactedAreas[0] === 'frontend' &&
            !categories.includes('test')) {
            types.add('ui-only');
        }
        // Check for dependency updates
        if (impactedAreas.includes('deps')) {
            types.add('dependency-update');
        }
        // If no specific type detected, it's mixed
        if (types.size === 0) {
            types.add('mixed');
        }
        return Array.from(types);
    }
    calculateComplexity(files) {
        const totalChanges = files.reduce((sum, f) => sum + f.changes, 0);
        const fileCount = files.length;
        if (totalChanges < 50 && fileCount <= 3) {
            return 'trivial';
        }
        else if (totalChanges < 500 && fileCount <= 20) {
            return 'moderate';
        }
        else {
            return 'complex';
        }
    }
    assessRiskLevel(fileAnalysis, complexity) {
        // High risk if touching database or security-sensitive areas
        if (fileAnalysis.impactedAreas.includes('database') ||
            fileAnalysis.categories.includes('configuration')) {
            return complexity === 'trivial' ? 'medium' : 'high';
        }
        // Low risk for docs/tests only
        if (fileAnalysis.categories.every(c => c === 'documentation' || c === 'test')) {
            return 'low';
        }
        // Map complexity to risk for other cases
        return complexity === 'trivial' ? 'low' :
            complexity === 'moderate' ? 'medium' : 'high';
    }
    determineAgentRecommendations(changeTypes, riskLevel) {
        const agentsToSkip = new Set();
        const agentsToKeep = new Set();
        const skipReasons = {};
        // Apply rules for each change type
        for (const changeType of changeTypes) {
            const rules = AGENT_SKIPPING_RULES[changeType];
            rules.skip.forEach(agent => {
                agentsToSkip.add(agent);
                skipReasons[agent] = `Not relevant for ${changeType} changes`;
            });
            rules.keep.forEach(agent => {
                agentsToKeep.add(agent);
                agentsToSkip.delete(agent); // Keep overrides skip
            });
        }
        // Override for high-risk changes - keep all agents
        if (riskLevel === 'high') {
            agentsToSkip.clear();
            Object.keys(skipReasons).forEach(key => delete skipReasons[key]);
            // Keep all agents for high-risk changes
            ['security', 'architecture', 'performance', 'dependencies', 'codeQuality']
                .forEach(agent => agentsToKeep.add(agent));
        }
        return {
            agentsToSkip: Array.from(agentsToSkip),
            agentsToKeep: Array.from(agentsToKeep),
            skipReasons
        };
    }
}
exports.PRContentAnalyzer = PRContentAnalyzer;
//# sourceMappingURL=pr-content-analyzer.js.map