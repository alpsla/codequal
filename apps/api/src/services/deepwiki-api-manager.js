"use strict";
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
exports.deepWikiApiManager = exports.DeepWikiApiManager = void 0;
const child_process_1 = require("child_process");
const util_1 = require("util");
const utils_1 = require("@codequal/core/utils");
const uuid_1 = require("uuid");
const core_1 = require("@codequal/core");
const agents_1 = require("@codequal/agents");
const deepwiki_model_configurations_1 = require("./deepwiki-model-configurations");
const pr_context_service_1 = require("./pr-context-service");
const ModelVersionSync_1 = require("@codequal/core/services/model-selection/ModelVersionSync");
const deepwiki_cache_integration_1 = require("./deepwiki-cache-integration");
const RedisCacheService_1 = require("@codequal/core/services/cache/RedisCacheService");
const deepwiki_mock_enhanced_1 = require("./deepwiki-mock-enhanced");
const monitoringModule = __importStar(require("./monitoring-enhancements"));
const execAsync = (0, util_1.promisify)(child_process_1.exec);
const logger = (0, utils_1.createLogger)('deepwiki-api-manager');
class DeepWikiApiManager {
    constructor() {
        this.POD_NAME = process.env.DEEPWIKI_POD_NAME || 'deepwiki';
        this.NAMESPACE = process.env.DEEPWIKI_NAMESPACE || 'codequal-dev';
        this.API_PORT = process.env.DEEPWIKI_API_PORT || '8001';
        this.USE_PORT_FORWARD = process.env.DEEPWIKI_USE_PORT_FORWARD === 'true';
        this.modelSelector = null;
        this.cacheIntegration = null;
        this.modelVersionSync = new core_1.ModelVersionSync(logger);
        this.prContextService = new pr_context_service_1.PRContextService();
        // Model selector will be initialized on first use
        // Cache integration will be initialized on first use
    }
    /**
     * Initialize cache integration (lazy initialization)
     */
    async getCacheIntegration() {
        if (!this.cacheIntegration) {
            try {
                // Try to connect to Redis - use public URL if available
                const redisUrl = process.env.REDIS_URL_PUBLIC || process.env.REDIS_URL ||
                    `redis${process.env.REDIS_TLS === 'true' ? 's' : ''}://${process.env.REDIS_PASSWORD ? `:${process.env.REDIS_PASSWORD}@` : ''}${process.env.REDIS_HOST || 'localhost'}:${process.env.REDIS_PORT || '6379'}`;
                const cacheService = (0, RedisCacheService_1.createCacheService)(redisUrl, { logger });
                this.cacheIntegration = new deepwiki_cache_integration_1.DeepWikiCacheIntegration(cacheService);
                logger.info('DeepWiki cache integration initialized successfully');
            }
            catch (error) {
                logger.warn('Failed to initialize cache integration, continuing without cache:', error);
                return null;
            }
        }
        return this.cacheIntegration;
    }
    async getModelSelector() {
        if (!this.modelSelector) {
            // Lazy initialization with Vector DB if available
            try {
                const { VectorStorageService } = await import('@codequal/database');
                const vectorStorage = new VectorStorageService();
                this.modelSelector = (0, agents_1.createUnifiedModelSelector)(this.modelVersionSync, vectorStorage);
            }
            catch (error) {
                logger.warn('Vector DB not available, using basic model selector');
                this.modelSelector = (0, agents_1.createUnifiedModelSelector)(this.modelVersionSync, undefined);
            }
        }
        return this.modelSelector;
    }
    /**
     * Get optimal model for DeepWiki analysis
     */
    async getOptimalModel(repositoryUrl) {
        try {
            // Use existing PRContextService for repository detection
            // Since we don't have changed files for DeepWiki, pass empty array
            const language = await this.prContextService.detectPrimaryLanguage(repositoryUrl, []);
            const repositorySizeEnum = await this.prContextService.estimateRepositorySize(repositoryUrl);
            // Convert enum to string
            const repositorySize = this.convertSizeEnumToString(repositorySizeEnum);
            logger.info(`Repository detected as ${language}/${repositorySize}`);
            // Get pre-researched configuration for this language/size combination
            const config = await deepwiki_model_configurations_1.deepWikiModelConfig.getModelConfiguration(language, repositorySize);
            if (config) {
                logger.info(`Using optimized config for ${language}/${repositorySize}:`);
                logger.info(`- Primary: ${config.primary.provider}/${config.primary.model}`);
                logger.info(`- Fallback: ${config.fallback.provider}/${config.fallback.model}`);
                logger.info(`- Weights: Quality=${config.weights.quality}, Cost=${config.weights.cost}, Speed=${config.weights.speed}`);
                return {
                    primary: `${config.primary.provider}/${config.primary.model}`,
                    fallback: [`${config.fallback.provider}/${config.fallback.model}`]
                };
            }
        }
        catch (error) {
            logger.warn('Failed to get configuration:', error);
        }
        // Use the same pattern as orchestrator: try to find models from Vector DB
        logger.warn('No pre-configured models found, searching Vector DB');
        try {
            const language = await this.prContextService.detectPrimaryLanguage(repositoryUrl, []);
            const repositorySizeEnum = await this.prContextService.estimateRepositorySize(repositoryUrl);
            // Use modelVersionSync.findOptimalModel like the orchestrator does
            const models = await this.modelVersionSync.findOptimalModel({
                language: language,
                sizeCategory: repositorySizeEnum,
                tags: ['deepwiki', 'comprehensive-analyzer']
            }, undefined, true); // includeFallback = true
            if (Array.isArray(models)) {
                // Got both primary and fallback
                const [primary, fallback] = models;
                logger.info('Found models from Vector DB', {
                    primary: primary?.model,
                    fallback: fallback?.model
                });
                return {
                    primary: `${primary.provider}/${primary.model}`,
                    fallback: [`${fallback.provider}/${fallback.model}`]
                };
            }
            else if (models) {
                // Got only primary model
                logger.info('Found only primary model from Vector DB', {
                    model: models.model
                });
                return {
                    primary: `${models.provider}/${models.model}`,
                    fallback: [] // No fallback available
                };
            }
        }
        catch (error) {
            logger.error('Failed to find models in Vector DB:', error);
        }
        // Last resort - fail with clear error
        throw new Error('No models available. Please ensure model configurations are up to date.');
    }
    /**
     * Analyze a repository using the DeepWiki API
     */
    async analyzeRepository(repositoryUrl, options) {
        const startTime = Date.now();
        const analysisId = (0, uuid_1.v4)();
        logger.info(`Starting DeepWiki API analysis for ${repositoryUrl} (${analysisId})`);
        // Check cache first unless explicitly skipped
        if (!options?.skipCache) {
            const cache = await this.getCacheIntegration();
            if (cache) {
                const cachedResult = await cache.getAnalysis(repositoryUrl, {
                    branch: options?.branch,
                    prId: options?.prId
                });
                if (cachedResult) {
                    logger.info(`Using cached DeepWiki analysis for ${repositoryUrl}`, {
                        branch: options?.branch,
                        prId: options?.prId,
                        cacheHit: true
                    });
                    return cachedResult;
                }
            }
        }
        try {
            // DeepWiki analyzes repositories directly without needing pre-computed embeddings
            logger.info('Starting DeepWiki analysis...');
            // Use deployment for stability
            const podName = `deployment/${this.POD_NAME}`;
            // Get optimal model selection
            const models = await this.getOptimalModel(repositoryUrl);
            logger.info(`Selected models - Primary: ${models.primary}, Fallbacks: ${models.fallback.join(', ')}`);
            // Prepare the analysis prompt
            const prompt = this.buildAnalysisPrompt(repositoryUrl, options);
            // Try primary model first
            let apiResponse = null;
            let selectedModel = models.primary;
            try {
                apiResponse = await this.callDeepWikiApi(podName, repositoryUrl, prompt, selectedModel);
            }
            catch (primaryError) {
                logger.warn(`Primary model ${selectedModel} failed:`, primaryError);
                // Try fallback models
                for (const fallbackModel of models.fallback) {
                    try {
                        logger.info(`Trying fallback model: ${fallbackModel}`);
                        apiResponse = await this.callDeepWikiApi(podName, repositoryUrl, prompt, fallbackModel);
                        selectedModel = fallbackModel;
                        break; // Success, exit loop
                    }
                    catch (fallbackError) {
                        logger.warn(`Fallback model ${fallbackModel} failed:`, fallbackError);
                    }
                }
            }
            if (!apiResponse) {
                throw new Error('All models failed to analyze repository');
            }
            // Parse the analysis from the API response
            const analysis = this.parseApiResponse(apiResponse);
            // Convert to our format
            const result = this.convertToDeepWikiFormat(analysis, repositoryUrl, analysisId, startTime);
            // Add model metadata
            result.metadata.model_used = selectedModel;
            logger.info(`DeepWiki API analysis completed for ${repositoryUrl} using model: ${selectedModel}`);
            // Update performance metrics for this language/size combination
            const language = await this.prContextService.detectPrimaryLanguage(repositoryUrl, []);
            const repositorySizeEnum = await this.prContextService.estimateRepositorySize(repositoryUrl);
            const repositorySize = this.convertSizeEnumToString(repositorySizeEnum);
            const duration = Date.now() - startTime;
            await deepwiki_model_configurations_1.deepWikiModelConfig.updatePerformanceMetrics(language, repositorySize, duration, result.issues.length, true // success
            );
            // NOTE: We do NOT clean up the repository here anymore
            // The repository needs to stay available for MCP tools and agents
            // Cleanup should be called by the orchestrator after ALL analysis is complete
            // Store in cache for future use
            const cache = await this.getCacheIntegration();
            if (cache && !options?.skipCache) {
                try {
                    await cache.storeAnalysis(repositoryUrl, result, {
                        branch: options?.branch,
                        prId: options?.prId
                    });
                    logger.info(`Stored DeepWiki analysis in cache for ${repositoryUrl}`);
                }
                catch (cacheError) {
                    logger.warn('Failed to store analysis in cache:', cacheError);
                    // Continue even if cache storage fails
                }
            }
            return result;
        }
        catch (error) {
            logger.error(`DeepWiki API analysis failed for ${repositoryUrl}:`, error);
            // Return a degraded result instead of throwing
            return this.createDegradedResult(repositoryUrl, analysisId, startTime, error);
        }
    }
    /**
     * Get the actual DeepWiki pod name
     */
    async getDeepWikiPodName() {
        try {
            const { stdout } = await execAsync(`kubectl get pods -n ${this.NAMESPACE} -l app=deepwiki --field-selector=status.phase=Running -o jsonpath="{.items[0].metadata.name}"`);
            const podName = stdout.trim();
            if (!podName) {
                throw new Error('No running DeepWiki pod found');
            }
            logger.debug(`Using DeepWiki pod: ${podName}`);
            return podName;
        }
        catch (error) {
            logger.warn('Could not find running DeepWiki pod, using deployment');
            // Use deployment instead of specific pod
            return `deployment/${this.POD_NAME}`;
        }
    }
    /**
     * Build the analysis prompt for the API
     */
    buildAnalysisPrompt(repositoryUrl, options) {
        // The DeepWiki API expects a simple prompt, not repository details in the prompt
        // The repository URL is passed separately in the payload
        return `Provide a comprehensive security and code quality analysis of this repository.

Please analyze:
1. Security vulnerabilities with CVE/CWE classifications and CVSS scores
2. Performance issues and bottlenecks
3. Code quality and maintainability issues
4. Architecture and design patterns
5. Dependency vulnerabilities
6. Test coverage
7. Recommendations for improvement

Format the response as structured JSON with:
- vulnerabilities: Array of issues with severity, category, title, location, CWE, CVSS, impact, and remediation
- recommendations: Array with priority, category, title, description, impact, and effort
- scores: Overall and category scores (0-100)
- statistics: Repository statistics including files analyzed and issue counts
- quality: Code quality metrics
- testing: Test coverage information
- dependencies: Dependency analysis

Provide at least 100-200 detailed findings for a comprehensive analysis.`;
    }
    /**
     * Call the DeepWiki API via kubectl exec or port-forward
     */
    async callDeepWikiApi(podName, repositoryUrl, prompt, model) {
        logger.info(`Calling DeepWiki API for ${repositoryUrl} with model ${model}`);
        // Use enhanced mock for testing
        if (process.env.USE_DEEPWIKI_MOCK === 'true' || !process.env.DEEPWIKI_API_KEY) {
            logger.info('Using enhanced mock for DeepWiki analysis');
            // Simulate API latency
            const latency = 2500; // Default latency for mock
            await new Promise(resolve => setTimeout(resolve, latency));
            // Get enhanced mock data
            const mockAnalysis = (0, deepwiki_mock_enhanced_1.generateEnhancedMockAnalysis)(repositoryUrl);
            // Track token usage for mock
            try {
                if (monitoringModule.performanceMonitor && repositoryUrl.includes('analysis-id=')) {
                    const analysisId = repositoryUrl.split('analysis-id=')[1];
                    monitoringModule.performanceMonitor.recordTokenUsage(analysisId, model, 15000, 8000);
                    monitoringModule.performanceMonitor.recordApiCall(analysisId, model, latency);
                }
            }
            catch (e) {
                // Monitoring not available in test mode
            }
            return {
                choices: [{
                        message: {
                            content: JSON.stringify(mockAnalysis)
                        }
                    }]
            };
        }
        const payload = {
            repo_url: repositoryUrl,
            messages: [
                {
                    role: "user",
                    content: prompt
                }
            ],
            stream: false,
            provider: "openrouter",
            model: model, // Use dynamically selected model
            temperature: 0.2, // Lower temperature for more consistent analysis
            max_tokens: 8000, // Increase token limit
            timeout: 120000 // 2 minute timeout
        };
        if (this.USE_PORT_FORWARD) {
            // Use port forwarding approach (requires manual setup)
            try {
                const response = await fetch(`http://localhost:${this.API_PORT}/chat/completions/stream`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(payload)
                });
                if (!response.ok) {
                    throw new Error(`API request failed: ${response.status} ${response.statusText}`);
                }
                // Get response as text first
                const responseText = await response.text();
                // Try to parse as JSON
                try {
                    return JSON.parse(responseText);
                }
                catch (e) {
                    // If not JSON, wrap text response in expected format
                    return {
                        choices: [{
                                message: {
                                    content: responseText
                                }
                            }]
                    };
                }
            }
            catch (error) {
                logger.error('Failed to call DeepWiki API via port-forward:', error);
                throw error;
            }
        }
        else {
            // Use kubectl exec approach (default)
            // Properly escape the JSON for bash
            const escapedPayload = JSON.stringify(payload).replace(/"/g, '\\"').replace(/\$/g, '\\$');
            const curlCommand = `curl -s -X POST http://localhost:${this.API_PORT}/chat/completions/stream \
        -H "Content-Type: application/json" \
        -d "${escapedPayload}"`;
            try {
                const { stdout, stderr } = await execAsync(`kubectl exec -n ${this.NAMESPACE} ${podName} -- bash -c '${curlCommand}'`);
                if (stderr && !stderr.includes('warning')) {
                    logger.warn(`DeepWiki API stderr: ${stderr}`);
                }
                // Parse the JSON response
                try {
                    logger.info('Raw API response length:', stdout.length);
                    logger.info('Raw response:', stdout);
                    const parsed = JSON.parse(stdout);
                    logger.info('API response structure:', {
                        keys: Object.keys(parsed),
                        hasChoices: !!parsed.choices,
                        choicesLength: parsed.choices?.length,
                        hasError: !!parsed.error
                    });
                    return parsed;
                }
                catch (parseError) {
                    logger.error('Failed to parse API response:', parseError);
                    logger.error('Raw response:', stdout.substring(0, 2000));
                    return { error: 'Failed to parse API response' };
                }
            }
            catch (error) {
                logger.error('Failed to call DeepWiki API:', error);
                throw error;
            }
        }
    }
    /**
     * Parse the API response to extract analysis data
     */
    parseApiResponse(response) {
        if (response.error) {
            throw new Error(`API error: ${response.error}`);
        }
        // Check if response is already in the expected format (direct JSON)
        if (response.vulnerabilities || response.recommendations || response.scores) {
            logger.debug('Response is already in parsed format');
            return response;
        }
        // Otherwise, try to extract from OpenAI-style response
        const content = response.choices?.[0]?.message?.content;
        if (!content) {
            throw new Error('No content in API response');
        }
        try {
            // First, try to extract JSON from the content
            // The API might return markdown with JSON blocks
            const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/);
            if (jsonMatch) {
                logger.debug('Found JSON block in markdown');
                return JSON.parse(jsonMatch[1]);
            }
            // Check if the response starts with text followed by JSON
            // DeepWiki sometimes returns a text preamble before the JSON
            const lines = content.split('\n');
            let jsonStartIndex = 0;
            // Find where JSON starts (look for opening brace)
            for (let i = 0; i < lines.length; i++) {
                if (lines[i].trim().startsWith('{')) {
                    jsonStartIndex = i;
                    break;
                }
            }
            if (jsonStartIndex > 0) {
                // Extract JSON portion
                const jsonContent = lines.slice(jsonStartIndex).join('\n');
                try {
                    const parsed = JSON.parse(jsonContent);
                    logger.debug('Successfully extracted and parsed JSON from text response');
                    return parsed;
                }
                catch (e) {
                    logger.debug('Failed to parse extracted JSON, trying to complete it');
                    // Try adding closing braces if JSON is truncated
                    try {
                        const completed = jsonContent + '\n}';
                        return JSON.parse(completed);
                    }
                    catch (e2) {
                        // Continue to fallback
                    }
                }
            }
            // Try to parse the entire content as JSON
            try {
                const parsed = JSON.parse(content);
                logger.debug('Successfully parsed content as JSON');
                return parsed;
            }
            catch (jsonError) {
                // If not JSON, try to extract structured data from text
                logger.debug('Content is not JSON, attempting to extract structure from text');
                // For now, return a basic structure
                // In a real implementation, we would parse the text response
                return {
                    vulnerabilities: [],
                    recommendations: [],
                    scores: {
                        overall: 70,
                        security: 65,
                        performance: 75,
                        maintainability: 70
                    },
                    statistics: {
                        files_analyzed: 100,
                        total_issues: 10
                    }
                };
            }
        }
        catch (error) {
            logger.error('Failed to parse analysis content:', error);
            logger.debug('Content preview:', { preview: content.substring(0, 1000) });
            throw error;
        }
    }
    /**
     * Convert parsed analysis to our DeepWiki format
     */
    convertToDeepWikiFormat(analysis, repositoryUrl, analysisId, startTime) {
        // Convert vulnerabilities to issues
        const issues = (analysis.vulnerabilities || []).map(vuln => {
            // Get location information
            const file = vuln.location?.file || 'unknown';
            const line = vuln.location?.line || 0;
            return {
                type: this.mapCategoryToType(vuln.category),
                severity: vuln.severity.toLowerCase(),
                category: vuln.category,
                message: vuln.title,
                file,
                line,
                suggestion: typeof vuln.remediation === 'object' && vuln.remediation?.immediate
                    ? vuln.remediation.immediate
                    : typeof vuln.remediation === 'string'
                        ? vuln.remediation
                        : undefined,
                cwe: vuln.cwe || vuln.CWE,
                cvss: vuln.cvss || vuln.CVSS,
                impact: vuln.impact,
                evidence: vuln.evidence,
                remediation: vuln.remediation
            };
        });
        // Convert recommendations
        const recommendations = (analysis.recommendations || []).map(rec => ({
            type: rec.category.toLowerCase(),
            title: rec.title,
            description: rec.description,
            priority: rec.priority.toLowerCase(),
            category: rec.category,
            impact: rec.impact,
            effort: rec.effort.toLowerCase(),
            estimated_hours: rec.estimated_hours,
            steps: rec.steps
        }));
        // Prepare scores
        const scores = {
            overall: analysis.scores?.overall || 70,
            security: analysis.scores?.security || 65,
            performance: analysis.scores?.performance || 75,
            maintainability: analysis.scores?.maintainability || 70,
            ...(analysis.scores?.testing && { testing: analysis.scores.testing })
        };
        // Prepare metadata
        const metadata = {
            analyzed_at: new Date(),
            duration_ms: Date.now() - startTime,
            files_analyzed: analysis.statistics?.files_analyzed || 0,
            languages: analysis.statistics?.languages,
            quality_metrics: analysis.quality?.metrics,
            test_coverage: analysis.testing?.coverage_percent,
            dependencies: analysis.dependencies
        };
        return {
            repository_url: repositoryUrl,
            analysis_id: analysisId,
            issues,
            recommendations,
            scores,
            metadata,
            statistics: analysis.statistics,
            quality: analysis.quality,
            testing: analysis.testing
        };
    }
    /**
     * Map category to issue type
     */
    mapCategoryToType(category) {
        const categoryLower = category.toLowerCase();
        if (categoryLower.includes('security'))
            return 'security';
        if (categoryLower.includes('performance'))
            return 'performance';
        if (categoryLower.includes('quality') || categoryLower.includes('maintainability'))
            return 'maintainability';
        return 'other';
    }
    /**
     * Create a degraded result when API fails
     */
    createDegradedResult(repositoryUrl, analysisId, startTime, error) {
        logger.warn(`Creating degraded result due to error: ${error.message}`);
        return {
            repository_url: repositoryUrl,
            analysis_id: analysisId,
            issues: [
                {
                    type: 'other',
                    severity: 'medium',
                    message: 'DeepWiki analysis unavailable',
                    file: 'unknown',
                    line: 0,
                    category: 'System',
                    suggestion: `DeepWiki API analysis failed: ${error.message}. Using fallback analysis.`
                }
            ],
            recommendations: [
                {
                    type: 'maintainability',
                    title: 'Enable DeepWiki Analysis',
                    description: 'DeepWiki API is currently unavailable. Ensure the service is running and accessible.',
                    priority: 'high',
                    category: 'System',
                    impact: 'Full security and quality analysis unavailable',
                    effort: 'low'
                }
            ],
            scores: {
                overall: 50,
                security: 50,
                performance: 50,
                maintainability: 50
            },
            metadata: {
                analyzed_at: new Date(),
                duration_ms: Date.now() - startTime,
                error: error.message
            }
        };
    }
    /**
     * Convert RepositorySizeCategory enum to string
     */
    convertSizeEnumToString(sizeEnum) {
        switch (sizeEnum) {
            case ModelVersionSync_1.RepositorySizeCategory.SMALL:
                return 'small';
            case ModelVersionSync_1.RepositorySizeCategory.MEDIUM:
                return 'medium';
            case ModelVersionSync_1.RepositorySizeCategory.LARGE:
                return 'large';
            case ModelVersionSync_1.RepositorySizeCategory.EXTRA_LARGE:
                return 'enterprise';
            default:
                return 'medium';
        }
    }
    /**
     * Check if the API is available
     */
    async checkApiHealth() {
        try {
            const { stdout } = await execAsync(`kubectl exec -n ${this.NAMESPACE} deployment/${this.POD_NAME} -- curl -s http://localhost:${this.API_PORT}/health`);
            const health = JSON.parse(stdout);
            return health.status === 'healthy';
        }
        catch (error) {
            logger.error('DeepWiki API health check failed:', error);
            return false;
        }
    }
    /**
     * Check if repository exists in the system
     */
    async checkRepositoryExists(repositoryUrl) {
        // TODO: Implement actual check
        return false;
    }
    /**
     * Get cached repository files from the cloned repository
     */
    async getCachedRepositoryFiles(repositoryUrl, branch) {
        try {
            // Extract repo name from URL
            const repoName = repositoryUrl.split('/').pop()?.replace('.git', '') || '';
            if (!repoName) {
                logger.warn('[DeepWiki] Could not extract repository name from URL');
                return [];
            }
            const repoPath = `/root/.adalflow/repos/${repoName}`;
            // Check if repository exists
            const { stdout: exists } = await execAsync(`kubectl exec -n ${this.NAMESPACE} deployment/${this.POD_NAME} -- test -d ${repoPath} && echo "exists" || echo "not found"`);
            if (exists.trim() !== 'exists') {
                logger.warn(`[DeepWiki] Repository not found at ${repoPath}`);
                return [];
            }
            // If branch is specified, checkout that branch
            if (branch) {
                logger.info(`[DeepWiki] Checking out branch: ${branch}`);
                try {
                    await execAsync(`kubectl exec -n ${this.NAMESPACE} deployment/${this.POD_NAME} -- bash -c "cd ${repoPath} && git fetch origin ${branch} && git checkout ${branch}"`);
                }
                catch (error) {
                    logger.warn(`[DeepWiki] Failed to checkout branch ${branch}:`, error);
                }
            }
            // Get list of all files in the repository
            const { stdout: fileList } = await execAsync(`kubectl exec -n ${this.NAMESPACE} deployment/${this.POD_NAME} -- bash -c "cd ${repoPath} && find . -type f -name '*.js' -o -name '*.ts' -o -name '*.tsx' -o -name '*.jsx' -o -name '*.py' -o -name '*.java' -o -name '*.go' -o -name '*.rs' -o -name '*.cpp' -o -name '*.c' -o -name '*.h' -o -name '*.cs' | grep -v node_modules | grep -v .git | head -100"`);
            const files = fileList.trim().split('\n').filter(f => f);
            const cachedFiles = [];
            // Read content of each file
            for (const filePath of files) {
                try {
                    const cleanPath = filePath.replace('./', '');
                    const { stdout: content } = await execAsync(`kubectl exec -n ${this.NAMESPACE} deployment/${this.POD_NAME} -- cat "${repoPath}/${cleanPath}"`);
                    cachedFiles.push({
                        path: cleanPath,
                        content: content,
                        size: content.length
                    });
                }
                catch (error) {
                    logger.debug(`[DeepWiki] Failed to read file ${filePath}:`, error);
                }
            }
            logger.info(`[DeepWiki] Retrieved ${cachedFiles.length} cached files from cloned repository`);
            return cachedFiles;
        }
        catch (error) {
            logger.error('[DeepWiki] Failed to get cached repository files:', error);
            return [];
        }
    }
    /**
     * Trigger repository analysis
     */
    async triggerRepositoryAnalysis(repositoryUrl, options) {
        // Use the existing analyzeRepository method
        const result = await this.analyzeRepository(repositoryUrl, options);
        return result.metadata?.job_id || 'analysis-' + Date.now();
    }
    /**
     * Wait for analysis completion
     */
    async waitForAnalysisCompletion(repositoryUrl) {
        // For now, just run the analysis directly
        return await this.analyzeRepository(repositoryUrl);
    }
    /**
     * Get active jobs - stub implementation
     */
    async getActiveJobs() {
        logger.warn('DeepWikiApiManager.getActiveJobs() - stub implementation');
        return [];
    }
    /**
     * Clean up the cloned repository after all analysis is complete
     * This should be called by the orchestrator after MCP tools and agents have finished
     */
    async cleanupRepository(repositoryUrl) {
        return this.cleanupDeepWikiRepositories(repositoryUrl);
    }
    /**
     * Internal cleanup method
     */
    async cleanupDeepWikiRepositories(currentRepoUrl) {
        if (!currentRepoUrl) {
            logger.warn('[DeepWiki] No repository URL provided for cleanup');
            return;
        }
        try {
            logger.info('[DeepWiki] Starting post-analysis repository cleanup');
            // Extract repo name from URL
            const repoName = currentRepoUrl.split('/').pop()?.replace('.git', '') || '';
            if (!repoName) {
                logger.warn('[DeepWiki] Could not extract repository name from URL');
                return;
            }
            // Get disk usage before cleanup
            const { stdout: beforeUsage } = await execAsync(`kubectl exec -n ${this.NAMESPACE} deployment/${this.POD_NAME} -- df -h /root/.adalflow | awk 'NR==2 {print $5}' | sed 's/%//'`);
            logger.info(`[DeepWiki] Disk usage before cleanup: ${beforeUsage.trim()}%`);
            // Delete the specific repository that was just analyzed
            const deleteCommand = `rm -rf /root/.adalflow/repos/${repoName}`;
            await execAsync(`kubectl exec -n ${this.NAMESPACE} deployment/${this.POD_NAME} -- bash -c "${deleteCommand}"`);
            logger.info(`[DeepWiki] Deleted analyzed repository: ${repoName}`);
            // Get disk usage after cleanup
            const { stdout: afterUsage } = await execAsync(`kubectl exec -n ${this.NAMESPACE} deployment/${this.POD_NAME} -- df -h /root/.adalflow | awk 'NR==2 {print $5}' | sed 's/%//'`);
            logger.info(`[DeepWiki] Cleanup complete. Disk usage: ${beforeUsage.trim()}% -> ${afterUsage.trim()}%`);
            // Also clean up any orphaned old repositories (safety net)
            // This handles cases where previous cleanups might have failed
            const cleanupOldCommand = `find /root/.adalflow/repos -mindepth 1 -maxdepth 1 -type d -mtime +1 -exec rm -rf {} \\; || true`;
            const { stdout: oldRepos } = await execAsync(`kubectl exec -n ${this.NAMESPACE} deployment/${this.POD_NAME} -- bash -c "${cleanupOldCommand}"`);
            if (oldRepos.trim()) {
                logger.info(`[DeepWiki] Also cleaned up old orphaned repositories`);
            }
        }
        catch (error) {
            // Don't fail the analysis if cleanup fails
            logger.warn('[DeepWiki] Repository cleanup failed:', error);
        }
    }
    /**
     * Get job status - stub implementation
     */
    async getJobStatus(jobId) {
        logger.warn('DeepWikiApiManager.getJobStatus() - stub implementation');
        return {
            id: jobId,
            status: 'completed',
            progress: 100,
            result: null
        };
    }
    /**
     * Cancel job - stub implementation
     */
    async cancelJob(jobId) {
        logger.warn('DeepWikiApiManager.cancelJob() - stub implementation');
        return true;
    }
}
exports.DeepWikiApiManager = DeepWikiApiManager;
// Export singleton instance
exports.deepWikiApiManager = new DeepWikiApiManager();
