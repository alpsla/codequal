"use strict";
/**
 * Educational Tool Orchestrator
 * Manages tool execution for Educational Agent through the orchestrator pattern
 * Implements cost controls and data storage strategies
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.EducationalToolOrchestrator = void 0;
const utils_1 = require("@codequal/core/utils");
class EducationalToolOrchestrator {
    constructor(authenticatedUser, toolResultRetrievalService) {
        this.authenticatedUser = authenticatedUser;
        this.toolResultRetrievalService = toolResultRetrievalService;
        this.logger = (0, utils_1.createLogger)('EducationalToolOrchestrator');
        this.cacheManager = new Map();
        // Default storage configuration with strict limits
        this.storageConfig = {
            cacheOnlyPatterns: {
                documentation: {
                    ttl: 24 * 60 * 60 * 1000, // 24 hours
                    maxSize: 10 // 10MB max per user
                },
                examples: {
                    ttl: 60 * 60 * 1000, // 1 hour (session-based)
                    maxSize: 5 // 5MB max
                },
                versionInfo: {
                    ttl: 12 * 60 * 60 * 1000, // 12 hours
                    maxSize: 2 // 2MB max
                }
            },
            userStorage: {
                maxSizePerUser: 50, // 50MB total per user
                learningHistoryDays: 30,
                skillTrackingEnabled: true
            },
            curatedContent: {
                maxExamples: 1000, // Global limit
                requiresApproval: true,
                categories: ['security', 'performance', 'architecture', 'code_quality', 'dependency']
            }
        };
    }
    /**
     * Execute educational tools with compiled analysis results
     * Called by orchestrator AFTER specialized agents complete
     * Tools receive the compiled findings as context for educational content generation
     */
    async executeEducationalTools(compiledFindings, recommendationModule, deepWikiSummary, analysisContext) {
        const startTime = Date.now();
        const result = {
            documentation: [],
            workingExamples: [],
            versionInfo: [],
            cachedResults: 0,
            freshResults: 0,
            totalCost: 0
        };
        try {
            // Extract topics and packages from compiled analysis
            const topics = this.extractTopicsFromCompiledFindings(compiledFindings, recommendationModule);
            const packages = this.extractPackagesFromAnalysis(analysisContext);
            // Step 1: Check cache first (zero cost)
            this.logger.info('Executing educational tools with compiled context', {
                topics: topics.length,
                packages: packages.length,
                compiledFindings: Object.keys(compiledFindings || {}).length,
                recommendations: recommendationModule?.summary?.totalRecommendations || 0
            });
            // Step 2: Execute educational tools with compiled context
            for (const topic of topics) {
                const cached = await this.checkCache('documentation', topic);
                if (cached) {
                    result.documentation.push(cached);
                    result.cachedResults++;
                }
                else {
                    // Execute educational tools with compiled findings context
                    const fresh = await this.fetchDocumentationWithCompiledContext(topic, compiledFindings, recommendationModule, analysisContext);
                    if (fresh) {
                        result.documentation.push(...fresh);
                        result.freshResults++;
                        result.totalCost += this.calculateDocumentationCost(fresh);
                    }
                }
            }
            // Step 3: Get working examples with compiled context
            const examples = await this.fetchWorkingExamplesWithCompiledContext(topics, compiledFindings, recommendationModule, analysisContext);
            result.workingExamples.push(...examples);
            // Step 3: Get version info (cached aggressively)
            for (const pkg of packages.slice(0, 10)) { // Limit to 10 packages
                const cached = await this.checkCache('version', pkg);
                if (cached) {
                    result.versionInfo.push(cached);
                    result.cachedResults++;
                }
                else {
                    const fresh = await this.fetchVersionInfo(pkg);
                    if (fresh) {
                        result.versionInfo.push(fresh);
                        result.freshResults++;
                        result.totalCost += 0.001; // Minimal cost per version check
                    }
                }
            }
            // Step 4: Enforce storage limits
            await this.enforceStorageLimits(result);
            this.logger.info('Educational tools execution complete', {
                documentation: result.documentation.length,
                examples: result.workingExamples.length,
                versions: result.versionInfo.length,
                cachedHitRate: (result.cachedResults + result.freshResults) > 0 ? result.cachedResults / (result.cachedResults + result.freshResults) : 0,
                totalCost: result.totalCost,
                executionTime: Date.now() - startTime
            });
            return result;
        }
        catch (error) {
            this.logger.error('Educational tools execution failed', {
                error: error instanceof Error ? error.message : String(error || 'Unknown error')
            });
            return result; // Return partial results
        }
    }
    /**
     * Check cache for existing content
     */
    async checkCache(type, key) {
        const cacheKey = `${this.authenticatedUser.id}:${type}:${key}`;
        const cached = this.cacheManager.get(cacheKey);
        if (cached && cached.expiresAt > new Date()) {
            return cached.data;
        }
        // Remove expired entry
        if (cached) {
            this.cacheManager.delete(cacheKey);
        }
        return null;
    }
    /**
     * Fetch documentation with Context 7 integration
     */
    async fetchDocumentation(topic, context) {
        try {
            // First try Vector DB (lowest cost)
            const vectorResults = await this.searchVectorDB(topic, context);
            if (vectorResults.length > 0) {
                return vectorResults.map(r => ({
                    id: `vector-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                    topic,
                    content: r.content,
                    source: 'vector_db',
                    url: r.metadata?.url,
                    version: r.metadata?.version,
                    lastUpdated: new Date(r.metadata?.lastUpdated || Date.now()),
                    expiresAt: new Date(Date.now() + this.storageConfig.cacheOnlyPatterns.documentation.ttl),
                    storageType: 'cache'
                }));
            }
            // Fallback to Context 7 (higher cost) - but this should be done through tool manager
            // For now, return empty to avoid direct MCP calls
            this.logger.warn('Context 7 integration pending tool manager update', { topic });
            return [];
        }
        catch (error) {
            this.logger.error('Failed to fetch documentation', { topic, error });
            return [];
        }
    }
    /**
     * Fetch working examples (prefer curated content)
     */
    async fetchWorkingExamples(topics, context) {
        const examples = [];
        // First check curated examples (no external cost)
        const curatedExamples = await this.getCuratedExamples(topics);
        examples.push(...curatedExamples);
        // Only fetch external if we don't have enough curated
        if (examples.length < 3) {
            // This would go through tool manager in production
            this.logger.info('Would fetch external examples through tool manager', {
                topics,
                haveCurated: examples.length
            });
        }
        return examples;
    }
    /**
     * Fetch version information with aggressive caching
     */
    async fetchVersionInfo(packageName) {
        try {
            // This would go through tool manager to call Context 7
            // For now, create a placeholder
            return {
                packageName,
                currentVersion: '1.0.0',
                latestVersion: '1.0.0',
                source: 'cache',
                expiresAt: new Date(Date.now() + this.storageConfig.cacheOnlyPatterns.versionInfo.ttl)
            };
        }
        catch (error) {
            this.logger.error('Failed to fetch version info', { packageName, error });
            return null;
        }
    }
    /**
     * Search Vector DB for existing educational content
     */
    async searchVectorDB(topic, context) {
        try {
            // This would use the actual Vector DB service
            // For now, return empty to show the pattern
            return [];
        }
        catch (error) {
            this.logger.error('Vector DB search failed', { topic, error });
            return [];
        }
    }
    /**
     * Get curated examples from our approved library
     */
    async getCuratedExamples(topics) {
        // This would fetch from our curated database
        // These are manually approved, high-quality examples
        const examples = [];
        // Example of curated content
        if (topics.includes('security')) {
            examples.push({
                id: 'curated-security-001',
                title: 'Input Validation Best Practice',
                code: `// Curated security example
function validateInput(input: string): boolean {
  if (!input || input.length === 0) return false;
  return /^[a-zA-Z0-9_]+$/.test(input);
}`,
                language: 'typescript',
                source: 'curated',
                validated: true,
                storageType: 'curated'
            });
        }
        return examples;
    }
    /**
     * Calculate cost for documentation fetching
     */
    calculateDocumentationCost(docs) {
        // Rough estimate: $0.01 per 1000 tokens
        const totalTokens = docs.reduce((sum, doc) => sum + (doc.content.length / 4), 0);
        return (totalTokens / 1000) * 0.01;
    }
    /**
     * Enforce storage limits to control costs
     */
    async enforceStorageLimits(result) {
        // Cache all results with appropriate TTL
        result.documentation.forEach(doc => {
            const cacheKey = `${this.authenticatedUser.id}:documentation:${doc.topic}`;
            this.cacheManager.set(cacheKey, {
                data: doc,
                expiresAt: doc.expiresAt
            });
        });
        result.versionInfo.forEach(version => {
            const cacheKey = `${this.authenticatedUser.id}:version:${version.packageName}`;
            this.cacheManager.set(cacheKey, {
                data: version,
                expiresAt: version.expiresAt
            });
        });
        // Clean up expired cache entries
        const now = new Date();
        for (const [key, value] of this.cacheManager.entries()) {
            if (value.expiresAt < now) {
                this.cacheManager.delete(key);
            }
        }
        // Log storage usage for monitoring
        this.logger.info('Storage usage', {
            cacheEntries: this.cacheManager.size,
            userId: this.authenticatedUser.id
        });
    }
    /**
     * Get storage usage for a user
     */
    async getUserStorageUsage() {
        // This would calculate actual storage usage
        return {
            cacheSize: this.cacheManager.size * 0.1, // Estimate 0.1MB per entry
            persistentSize: 0, // Would query database
            totalSize: this.cacheManager.size * 0.1,
            limit: this.storageConfig.userStorage.maxSizePerUser
        };
    }
    /**
     * Extract educational topics from compiled findings and recommendations
     */
    extractTopicsFromCompiledFindings(compiledFindings, recommendationModule) {
        const topics = new Set();
        // Extract from compiled findings
        Object.keys(compiledFindings?.findings || {}).forEach(category => {
            topics.add(category);
            const findings = compiledFindings?.findings?.[category] || [];
            findings.forEach((finding) => {
                if (finding.category)
                    topics.add(finding.category);
                if (finding.type)
                    topics.add(finding.type);
            });
        });
        // Extract from recommendations
        if (recommendationModule?.recommendations) {
            recommendationModule.recommendations.forEach((rec) => {
                topics.add(rec.category);
                topics.add(rec.title);
                rec.learningContext?.relatedConcepts?.forEach((concept) => {
                    topics.add(concept);
                });
            });
        }
        // Extract from focus areas
        if (recommendationModule?.summary?.focusAreas) {
            recommendationModule.summary.focusAreas.forEach((area) => {
                topics.add(area);
            });
        }
        return Array.from(topics).slice(0, 10); // Limit to control costs
    }
    /**
     * Extract package names from analysis context
     */
    extractPackagesFromAnalysis(analysisContext) {
        const packages = new Set();
        // Extract from PR context if available
        if (analysisContext.prContext?.files) {
            analysisContext.prContext.files.forEach((file) => {
                if (file.path === 'package.json' && file.content) {
                    try {
                        const packageJson = JSON.parse(file.content);
                        Object.keys(packageJson.dependencies || {}).forEach(pkg => packages.add(pkg));
                        Object.keys(packageJson.devDependencies || {}).forEach(pkg => packages.add(pkg));
                    }
                    catch {
                        // Ignore parse errors
                    }
                }
            });
        }
        return Array.from(packages).slice(0, 10); // Limit to control costs
    }
    /**
     * Fetch documentation with compiled findings context
     * This is where educational tools would receive the compiled analysis results
     */
    async fetchDocumentationWithCompiledContext(topic, compiledFindings, recommendationModule, analysisContext) {
        try {
            // First try Vector DB (lowest cost)
            const vectorResults = await this.searchVectorDB(topic, analysisContext);
            if (vectorResults.length > 0) {
                return vectorResults.map(r => ({
                    id: `vector-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                    topic,
                    content: r.content,
                    source: 'vector_db',
                    url: r.metadata?.url,
                    version: r.metadata?.version,
                    lastUpdated: new Date(r.metadata?.lastUpdated || Date.now()),
                    expiresAt: new Date(Date.now() + this.storageConfig.cacheOnlyPatterns.documentation.ttl),
                    storageType: 'cache'
                }));
            }
            // Execute Context 7 tool with compiled context
            // This should go through the MCP tool manager with compiled findings as context
            const context7Results = await this.executeContext7WithCompiledContext(topic, compiledFindings, recommendationModule);
            return context7Results;
        }
        catch (error) {
            this.logger.error('Failed to fetch documentation with compiled context', { topic, error });
            return [];
        }
    }
    /**
     * Fetch working examples with compiled context
     */
    async fetchWorkingExamplesWithCompiledContext(topics, compiledFindings, recommendationModule, analysisContext) {
        const examples = [];
        // First check curated examples (no external cost)
        const curatedExamples = await this.getCuratedExamplesForCompiledFindings(topics, compiledFindings, recommendationModule);
        examples.push(...curatedExamples);
        // Execute working examples tool with compiled context if needed
        if (examples.length < 3) {
            const toolExamples = await this.executeWorkingExamplesToolWithCompiledContext(topics, compiledFindings, recommendationModule);
            examples.push(...toolExamples);
        }
        return examples;
    }
    /**
     * Execute Context 7 MCP tool with compiled findings context
     */
    async executeContext7WithCompiledContext(topic, compiledFindings, recommendationModule) {
        try {
            // This would execute the Context 7 MCP tool through the tool manager
            // For now, return placeholder showing the pattern
            this.logger.info('Would execute Context 7 MCP tool with compiled context', {
                topic,
                findingsCount: Object.keys(compiledFindings?.findings || {}).length,
                recommendationsCount: recommendationModule?.recommendations?.length || 0
            });
            return [];
        }
        catch (error) {
            this.logger.error('Context 7 execution failed', { topic, error });
            return [];
        }
    }
    /**
     * Execute working examples MCP tool with compiled context
     */
    async executeWorkingExamplesToolWithCompiledContext(topics, compiledFindings, recommendationModule) {
        try {
            // This would execute the working examples MCP tool through the tool manager
            this.logger.info('Would execute working examples MCP tool with compiled context', {
                topics: topics.length,
                findingsCount: Object.keys(compiledFindings?.findings || {}).length
            });
            return [];
        }
        catch (error) {
            this.logger.error('Working examples tool execution failed', { topics, error });
            return [];
        }
    }
    /**
     * Get curated examples based on compiled findings
     */
    async getCuratedExamplesForCompiledFindings(topics, compiledFindings, recommendationModule) {
        const examples = [];
        // Generate examples based on actual findings
        Object.keys(compiledFindings?.findings || {}).forEach(category => {
            if (category === 'security') {
                examples.push({
                    id: 'curated-security-compiled',
                    title: 'Security Issue Resolution Example',
                    code: `// Example based on compiled security findings
function validateInput(input: string): boolean {
  // Addresses security findings from analysis
  if (!input || input.length === 0) return false;
  return /^[a-zA-Z0-9_]+$/.test(input);
}`,
                    language: 'typescript',
                    source: 'curated',
                    validated: true,
                    storageType: 'curated'
                });
            }
            if (category === 'architecture') {
                examples.push({
                    id: 'curated-architecture-compiled',
                    title: 'Architecture Improvement Example',
                    code: `// Example based on compiled architecture findings
interface Repository<T> {
  findById(id: string): Promise<T>;
  save(entity: T): Promise<T>;
}`,
                    language: 'typescript',
                    source: 'curated',
                    validated: true,
                    storageType: 'curated'
                });
            }
        });
        return examples;
    }
}
exports.EducationalToolOrchestrator = EducationalToolOrchestrator;
//# sourceMappingURL=educational-tool-orchestrator.js.map