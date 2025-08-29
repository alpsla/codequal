/**
 * Cloud Analysis Client
 * Communicates with cloud-based analysis service
 */

import axios, { AxiosInstance } from 'axios';
import { Redis } from 'ioredis';

interface AnalysisRequest {
  tool: 'eslint' | 'semgrep' | 'bandit' | 'npm-audit' | 'tsc' | 
        'pylint' | 'mypy' | 'safety' | 'jshint' | 'jscpd' | 
        'madge' | 'dep-cruiser' | 'cppcheck' | 'cloc';
  repository: string;
  branch?: string;
  prNumber?: number;
  config?: Record<string, any>;
  files?: string[]; // For targeted analysis
}

interface AnalysisResponse {
  analysisId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  results?: any;
  cached?: boolean;
  executionTime?: number;
  error?: string;
}

export class CloudAnalysisClient {
  private client: AxiosInstance;
  private redis: Redis | null;
  private baseUrl: string;

  constructor(
    baseUrl: string = process.env.CLOUD_ANALYSIS_URL || 'http://157.230.9.119:3010',
    redisUrl?: string
  ) {
    this.baseUrl = baseUrl;
    this.client = axios.create({
      baseURL: baseUrl,
      timeout: 300000, // 5 minutes
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': process.env.CLOUD_ANALYSIS_API_KEY || ''
      }
    });

    // Optional local Redis cache
    this.redis = redisUrl ? new Redis(redisUrl) : null;
  }

  /**
   * Submit analysis request to cloud service
   */
  async analyze(request: AnalysisRequest): Promise<AnalysisResponse> {
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
    const response = await this.client.post<AnalysisResponse>('/analyze', request);
    
    // Poll for results if async
    if (response.data.status === 'pending' || response.data.status === 'processing') {
      return await this.pollForResults(response.data.analysisId);
    }

    // Cache successful results
    if (response.data.status === 'completed' && this.redis) {
      await this.redis.setex(
        cacheKey,
        3600, // 1 hour TTL
        JSON.stringify(response.data)
      );
    }

    return response.data;
  }

  /**
   * Poll for async analysis results
   */
  private async pollForResults(
    analysisId: string,
    maxAttempts = 60,
    intervalMs = 5000
  ): Promise<AnalysisResponse> {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const response = await this.client.get<AnalysisResponse>(`/analysis/${analysisId}`);
      
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
  async batchAnalyze(
    repository: string,
    tools: string[],
    options?: Partial<AnalysisRequest>
  ): Promise<Map<string, AnalysisResponse>> {
    const results = new Map<string, AnalysisResponse>();
    
    // Run analyses in parallel
    const promises = tools.map(async (tool) => {
      try {
        const result = await this.analyze({
          tool: tool as any,
          repository,
          ...options
        });
        results.set(tool, result);
      } catch (error) {
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
  async getRepositoryInfo(repository: string): Promise<any> {
    const response = await this.client.get(`/repository/info`, {
      params: { url: repository }
    });
    return response.data;
  }

  /**
   * Generate cache key for request
   */
  private getCacheKey(request: AnalysisRequest): string {
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
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.client.get('/health');
      return response.status === 200;
    } catch {
      return false;
    }
  }

  /**
   * Get list of available tools
   */
  async getAvailableTools(): Promise<any> {
    try {
      const response = await this.client.get('/tools');
      return response.data;
    } catch (error) {
      console.error('Failed to get tools:', error);
      return { tools: [] };
    }
  }
}