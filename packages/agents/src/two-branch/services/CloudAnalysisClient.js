"use strict";
/**
 * Cloud Analysis Client
 * Communicates with cloud-based analysis service
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CloudAnalysisClient = void 0;
const axios_1 = __importDefault(require("axios"));
const ioredis_1 = require("ioredis");
class CloudAnalysisClient {
    constructor(baseUrl = process.env.CLOUD_ANALYSIS_URL || 'http://157.230.9.119:3010', redisUrl) {
        this.baseUrl = baseUrl;
        this.client = axios_1.default.create({
            baseURL: baseUrl,
            timeout: 300000, // 5 minutes
            headers: {
                'Content-Type': 'application/json',
                'X-API-Key': process.env.CLOUD_ANALYSIS_API_KEY || ''
            }
        });
        // Optional local Redis cache
        this.redis = redisUrl ? new ioredis_1.Redis(redisUrl) : null;
    }
    /**
     * Submit analysis request to cloud service
     */
    async analyze(request) {
        // Check local cache first
        const cacheKey = this.getCacheKey(request);
        if (this.redis) {
            const cached = await this.redis.get(cacheKey);
            if (cached) {
                console.log(`Cache hit for ${request.tool} on ${request.repository}`);
                return JSON.parse(cached);
            }
        }
        // Submit to cloud service
        console.log(`Submitting ${request.tool} analysis for ${request.repository}`);
        const response = await this.client.post('/analyze', request);
        // Poll for results if async
        if (response.data.status === 'pending' || response.data.status === 'processing') {
            return await this.pollForResults(response.data.analysisId);
        }
        // Cache successful results
        if (response.data.status === 'completed' && this.redis) {
            await this.redis.setex(cacheKey, 3600, // 1 hour TTL
            JSON.stringify(response.data));
        }
        return response.data;
    }
    /**
     * Poll for async analysis results
     */
    async pollForResults(analysisId, maxAttempts = 60, intervalMs = 5000) {
        for (let attempt = 0; attempt < maxAttempts; attempt++) {
            const response = await this.client.get(`/analysis/${analysisId}`);
            if (response.data.status === 'completed' || response.data.status === 'failed') {
                return response.data;
            }
            console.log(`Analysis ${analysisId} still ${response.data.status}... (attempt ${attempt + 1}/${maxAttempts})`);
            await this.delay(intervalMs);
        }
        throw new Error(`Analysis ${analysisId} timed out after ${maxAttempts} attempts`);
    }
    /**
     * Batch analyze multiple tools
     */
    async batchAnalyze(repository, tools, options) {
        const results = new Map();
        // Run analyses in parallel
        const promises = tools.map(async (tool) => {
            try {
                const result = await this.analyze({
                    tool: tool,
                    repository,
                    ...options
                });
                results.set(tool, result);
            }
            catch (error) {
                console.error(`Failed to analyze with ${tool}:`, error);
                results.set(tool, {
                    analysisId: 'error',
                    status: 'failed',
                    error: error instanceof Error ? error.message : String(error)
                });
            }
        });
        await Promise.all(promises);
        return results;
    }
    /**
     * Get repository info (size, language, etc.)
     */
    async getRepositoryInfo(repository) {
        const response = await this.client.get(`/repository/info`, {
            params: { url: repository }
        });
        return response.data;
    }
    /**
     * Generate cache key for request
     */
    getCacheKey(request) {
        const parts = [
            'analysis',
            request.tool,
            request.repository.replace(/[^a-zA-Z0-9]/g, '_'),
            request.branch || 'default',
            request.prNumber || 'none'
        ];
        return parts.join(':');
    }
    /**
     * Helper delay function
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    /**
     * Health check
     */
    async healthCheck() {
        try {
            const response = await this.client.get('/health');
            return response.status === 200;
        }
        catch {
            return false;
        }
    }
    /**
     * Get list of available tools
     */
    async getAvailableTools() {
        try {
            const response = await this.client.get('/tools');
            return response.data;
        }
        catch (error) {
            console.error('Failed to get tools:', error);
            return { tools: [] };
        }
    }
}
exports.CloudAnalysisClient = CloudAnalysisClient;
