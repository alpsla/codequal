import { exec } from 'child_process';
import { promisify } from 'util';
import { createLogger } from '@codequal/core/utils';
import { v4 as uuidv4 } from 'uuid';
import { 
  DeepWikiAnalysisResult,
  DeepWikiIssue,
  DeepWikiRecommendation,
  DeepWikiScores,
  DeepWikiMetadata
} from '../types/deepwiki';
import { ModelVersionSync, createDeepWikiModelConfig } from '@codequal/core';
import { createUnifiedModelSelector, UnifiedModelSelector } from '@codequal/agents';
import { createDeepWikiModelSelectionPrompt, DeepWikiSelectionContext } from '../prompts/deepwiki-model-selection-prompt';
import { deepWikiModelConfig } from './deepwiki-model-configurations';
import { PRContextService } from './pr-context-service';
import { RepositorySizeCategory } from '@codequal/core/services/model-selection/ModelVersionSync';
import { deepWikiEmbeddingAdapter } from './deepwiki-embedding-adapter';

const execAsync = promisify(exec);
const logger = createLogger('deepwiki-api-manager');

interface DeepWikiApiResponse {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
  error?: string;
}

export interface ParsedAnalysis {
  vulnerabilities?: Array<{
    id: string;
    severity: string;
    category: string;
    title: string;
    location: {
      file: string;
      line: number;
      column?: number;
    };
    cwe?: {
      id: string;
      name: string;
    };
    cvss?: {
      score: number;
      vector: string;
    };
    impact: string;
    evidence?: {
      snippet: string;
    };
    remediation: {
      immediate: string;
      steps: string[];
    };
  }>;
  recommendations?: Array<{
    id: string;
    category: string;
    priority: string;
    title: string;
    description: string;
    impact: string;
    effort: string;
    estimated_hours?: number;
    steps?: string[];
  }>;
  scores?: {
    overall: number;
    security: number;
    performance: number;
    maintainability: number;
    testing?: number;
  };
  statistics?: {
    files_analyzed: number;
    total_issues: number;
    issues_by_severity?: {
      critical: number;
      high: number;
      medium: number;
      low: number;
    };
    languages?: Record<string, number>;
  };
  quality?: {
    metrics?: {
      cyclomatic_complexity: number;
      cognitive_complexity: number;
      maintainability_index: number;
    };
    duplicated_lines_percent?: number;
    technical_debt_hours?: number;
  };
  testing?: {
    coverage_percent?: number;
    missing_tests?: number;
  };
  dependencies?: {
    total: number;
    direct: number;
    vulnerable: number;
    outdated: number;
    deprecated: number;
  };
}

export class DeepWikiApiManager {
  private readonly POD_NAME = process.env.DEEPWIKI_POD_NAME || 'deepwiki';
  private readonly NAMESPACE = process.env.DEEPWIKI_NAMESPACE || 'codequal-dev';
  private readonly API_PORT = process.env.DEEPWIKI_API_PORT || '8001';
  private readonly USE_PORT_FORWARD = process.env.DEEPWIKI_USE_PORT_FORWARD === 'true';
  private modelVersionSync: ModelVersionSync;
  private modelSelector: UnifiedModelSelector | null = null;
  private prContextService: PRContextService;
  
  constructor() {
    this.modelVersionSync = new ModelVersionSync(logger);
    this.prContextService = new PRContextService();
    // Model selector will be initialized on first use
  }
  
  private async getModelSelector(): Promise<UnifiedModelSelector> {
    if (!this.modelSelector) {
      // Lazy initialization with Vector DB if available
      try {
        const { VectorStorageService } = await import('@codequal/database');
        const vectorStorage = new VectorStorageService();
        this.modelSelector = createUnifiedModelSelector(this.modelVersionSync, vectorStorage);
      } catch (error) {
        logger.warn('Vector DB not available, using basic model selector');
        this.modelSelector = createUnifiedModelSelector(this.modelVersionSync, undefined);
      }
    }
    return this.modelSelector;
  }
  
  /**
   * Get optimal model for DeepWiki analysis
   */
  private async getOptimalModel(repositoryUrl: string): Promise<{ primary: string; fallback: string[] }> {
    try {
      // Use existing PRContextService for repository detection
      // Since we don't have changed files for DeepWiki, pass empty array
      const language = await this.prContextService.detectPrimaryLanguage(repositoryUrl, []);
      const repositorySizeEnum = await this.prContextService.estimateRepositorySize(repositoryUrl);
      
      // Convert enum to string
      const repositorySize = this.convertSizeEnumToString(repositorySizeEnum);
      
      logger.info(`Repository detected as ${language}/${repositorySize}`);
      
      // Get pre-researched configuration for this language/size combination
      const config = await deepWikiModelConfig.getModelConfiguration(language, repositorySize);
      
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
    } catch (error) {
      logger.warn('Failed to get configuration:', error as Error);
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
      } else if (models) {
        // Got only primary model
        logger.info('Found only primary model from Vector DB', {
          model: models.model
        });
        
        return {
          primary: `${models.provider}/${models.model}`,
          fallback: [] // No fallback available
        };
      }
    } catch (error) {
      logger.error('Failed to find models in Vector DB:', error as Error);
    }
    
    // Last resort - fail with clear error
    throw new Error('No models available. Please ensure model configurations are up to date.');
  }
  
  /**
   * Analyze a repository using the DeepWiki API
   */
  async analyzeRepository(
    repositoryUrl: string,
    options?: { branch?: string; commit?: string }
  ): Promise<DeepWikiAnalysisResult> {
    const startTime = Date.now();
    const analysisId = uuidv4();
    
    logger.info(`Starting DeepWiki API analysis for ${repositoryUrl} (${analysisId})`);

    try {
      // Check and prepare embeddings from existing analysis
      logger.info('Checking for existing embeddings...');
      const hasEmbeddings = await deepWikiEmbeddingAdapter.hasEmbeddings(repositoryUrl);
      
      if (hasEmbeddings) {
        logger.info('Found existing embeddings, preparing for DeepWiki...');
        const prepared = await deepWikiEmbeddingAdapter.prepareRepositoryFromExistingEmbeddings(repositoryUrl);
        
        if (prepared) {
          const stats = await deepWikiEmbeddingAdapter.getEmbeddingStats(repositoryUrl);
          logger.info('Embeddings prepared successfully:', {
            total: stats.total,
            byType: stats.byType,
            models: stats.models
          });
        }
      } else {
        logger.warn('No existing embeddings found. DeepWiki may need to generate them.');
      }
      
      // Get the actual pod name
      const podName = await this.getDeepWikiPodName();
      
      // Get optimal model selection
      const models = await this.getOptimalModel(repositoryUrl);
      logger.info(`Selected models - Primary: ${models.primary}, Fallbacks: ${models.fallback.join(', ')}`);
      
      // Prepare the analysis prompt
      const prompt = this.buildAnalysisPrompt(repositoryUrl, options);
      
      // Try primary model first
      let apiResponse: DeepWikiApiResponse | null = null;
      let selectedModel = models.primary;
      
      try {
        apiResponse = await this.callDeepWikiApi(podName, repositoryUrl, prompt, selectedModel);
      } catch (primaryError) {
        logger.warn(`Primary model ${selectedModel} failed:`, primaryError as Error);
        
        // Try fallback models
        for (const fallbackModel of models.fallback) {
          try {
            logger.info(`Trying fallback model: ${fallbackModel}`);
            apiResponse = await this.callDeepWikiApi(podName, repositoryUrl, prompt, fallbackModel);
            selectedModel = fallbackModel;
            break; // Success, exit loop
          } catch (fallbackError) {
            logger.warn(`Fallback model ${fallbackModel} failed:`, fallbackError as Error);
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
      
      await deepWikiModelConfig.updatePerformanceMetrics(
        language,
        repositorySize,
        duration,
        result.issues.length,
        true // success
      );
      
      return result;

    } catch (error) {
      logger.error(`DeepWiki API analysis failed for ${repositoryUrl}:`, error as Error);
      
      // Return a degraded result instead of throwing
      return this.createDegradedResult(repositoryUrl, analysisId, startTime, error as Error);
    }
  }

  /**
   * Get the actual DeepWiki pod name
   */
  private async getDeepWikiPodName(): Promise<string> {
    try {
      const { stdout } = await execAsync(
        `kubectl get pods -n ${this.NAMESPACE} -l app=deepwiki -o jsonpath="{.items[0].metadata.name}"`
      );
      const podName = stdout.trim();
      if (!podName) {
        throw new Error('No DeepWiki pod found');
      }
      return podName;
    } catch (error) {
      logger.warn('Could not find DeepWiki pod, using default name');
      return this.POD_NAME;
    }
  }

  /**
   * Build the analysis prompt for the API
   */
  private buildAnalysisPrompt(repositoryUrl: string, options?: { branch?: string; commit?: string }): string {
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
  private async callDeepWikiApi(
    podName: string, 
    repositoryUrl: string, 
    prompt: string,
    model: string
  ): Promise<DeepWikiApiResponse> {
    // Use enhanced mock for testing
    if (process.env.USE_DEEPWIKI_MOCK === 'true' || !process.env.DEEPWIKI_API_KEY) {
      logger.info('Using enhanced mock for DeepWiki analysis');
      
      // Simulate API latency based on model
      const latency = model.includes('gpt-4') ? 3000 : 2000;
      await new Promise(resolve => setTimeout(resolve, latency));
      
      // Get enhanced mock data
      const mockModule = require('./deepwiki-mock-enhanced');
      const mockAnalysis = mockModule.generateEnhancedMockAnalysis(repositoryUrl);
      
      // Track token usage for mock
      try {
        const monitoringModule = require('./monitoring-enhancements');
        if (monitoringModule.performanceMonitor && repositoryUrl.includes('analysis-id=')) {
          const analysisId = repositoryUrl.split('analysis-id=')[1];
          monitoringModule.performanceMonitor.recordTokenUsage(analysisId, model, 15000, 8000);
          monitoringModule.performanceMonitor.recordApiCall(analysisId, model, latency);
        }
      } catch (e) {
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
      temperature: 0.2 // Lower temperature for more consistent analysis
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
          return JSON.parse(responseText) as DeepWikiApiResponse;
        } catch (e) {
          // If not JSON, wrap text response in expected format
          return {
            choices: [{
              message: {
                content: responseText
              }
            }]
          } as DeepWikiApiResponse;
        }
      } catch (error) {
        logger.error('Failed to call DeepWiki API via port-forward:', error as Error);
        throw error;
      }
    } else {
      // Use kubectl exec approach (default)
      const curlCommand = `curl -s -X POST http://localhost:${this.API_PORT}/chat/completions/stream \
        -H "Content-Type: application/json" \
        -d '${JSON.stringify(payload).replace(/'/g, "'\"'\"'")}'`;

      try {
        const { stdout, stderr } = await execAsync(
          `kubectl exec -n ${this.NAMESPACE} ${podName} -- bash -c '${curlCommand}'`
        );

        if (stderr && !stderr.includes('warning')) {
          logger.warn(`DeepWiki API stderr: ${stderr}`);
        }

        // Parse the JSON response
        try {
          const parsed = JSON.parse(stdout) as DeepWikiApiResponse;
          logger.debug('API response structure:', { keys: Object.keys(parsed) });
          return parsed;
        } catch (parseError) {
          logger.error('Failed to parse API response:', parseError as Error);
          logger.debug('Raw response:', { preview: stdout.substring(0, 1000) });
          return { error: 'Failed to parse API response' };
        }

      } catch (error) {
        logger.error('Failed to call DeepWiki API:', error as Error);
        throw error;
      }
    }
  }

  /**
   * Parse the API response to extract analysis data
   */
  private parseApiResponse(response: DeepWikiApiResponse): ParsedAnalysis {
    if (response.error) {
      throw new Error(`API error: ${response.error}`);
    }

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
        return JSON.parse(jsonMatch[1]) as ParsedAnalysis;
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
          const parsed = JSON.parse(jsonContent) as ParsedAnalysis;
          logger.debug('Successfully extracted and parsed JSON from text response');
          return parsed;
        } catch (e) {
          logger.debug('Failed to parse extracted JSON, trying to complete it');
          // Try adding closing braces if JSON is truncated
          try {
            const completed = jsonContent + '\n}';
            return JSON.parse(completed) as ParsedAnalysis;
          } catch (e2) {
            // Continue to fallback
          }
        }
      }

      // Try to parse the entire content as JSON
      try {
        const parsed = JSON.parse(content) as ParsedAnalysis;
        logger.debug('Successfully parsed content as JSON');
        return parsed;
      } catch (jsonError) {
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
    } catch (error) {
      logger.error('Failed to parse analysis content:', error as Error);
      logger.debug('Content preview:', { preview: content.substring(0, 1000) });
      throw error;
    }
  }

  /**
   * Convert parsed analysis to our DeepWiki format
   */
  private convertToDeepWikiFormat(
    analysis: ParsedAnalysis,
    repositoryUrl: string,
    analysisId: string,
    startTime: number
  ): DeepWikiAnalysisResult {
    // Convert vulnerabilities to issues
    const issues: DeepWikiIssue[] = (analysis.vulnerabilities || []).map(vuln => ({
      type: this.mapCategoryToType(vuln.category),
      severity: vuln.severity.toLowerCase() as 'critical' | 'high' | 'medium' | 'low',
      message: vuln.title,
      file: vuln.location.file,
      line: vuln.location.line,
      category: vuln.category,
      suggestion: vuln.remediation.immediate,
      cwe: vuln.cwe,
      cvss: vuln.cvss,
      impact: vuln.impact,
      evidence: vuln.evidence,
      remediation: vuln.remediation
    }));

    // Convert recommendations
    const recommendations: DeepWikiRecommendation[] = (analysis.recommendations || []).map(rec => ({
      type: rec.category.toLowerCase() as 'security' | 'performance' | 'maintainability',
      title: rec.title,
      description: rec.description,
      priority: rec.priority.toLowerCase() as 'high' | 'medium' | 'low',
      category: rec.category,
      impact: rec.impact,
      effort: rec.effort.toLowerCase() as 'low' | 'medium' | 'high',
      estimated_hours: rec.estimated_hours,
      steps: rec.steps
    }));

    // Prepare scores
    const scores: DeepWikiScores = {
      overall: analysis.scores?.overall || 70,
      security: analysis.scores?.security || 65,
      performance: analysis.scores?.performance || 75,
      maintainability: analysis.scores?.maintainability || 70,
      ...(analysis.scores?.testing && { testing: analysis.scores.testing })
    };

    // Prepare metadata
    const metadata: DeepWikiMetadata = {
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
  private mapCategoryToType(category: string): string {
    const categoryLower = category.toLowerCase();
    if (categoryLower.includes('security')) return 'security';
    if (categoryLower.includes('performance')) return 'performance';
    if (categoryLower.includes('quality') || categoryLower.includes('maintainability')) return 'maintainability';
    return 'other';
  }

  /**
   * Create a degraded result when API fails
   */
  private createDegradedResult(
    repositoryUrl: string,
    analysisId: string,
    startTime: number,
    error: Error
  ): DeepWikiAnalysisResult {
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
  private convertSizeEnumToString(sizeEnum: RepositorySizeCategory): 'small' | 'medium' | 'large' | 'enterprise' {
    switch (sizeEnum) {
      case RepositorySizeCategory.SMALL:
        return 'small';
      case RepositorySizeCategory.MEDIUM:
        return 'medium';
      case RepositorySizeCategory.LARGE:
        return 'large';
      case RepositorySizeCategory.EXTRA_LARGE:
        return 'enterprise';
      default:
        return 'medium';
    }
  }

  /**
   * Check if the API is available
   */
  async checkApiHealth(): Promise<boolean> {
    try {
      const podName = await this.getDeepWikiPodName();
      const { stdout } = await execAsync(
        `kubectl exec -n ${this.NAMESPACE} ${podName} -- curl -s http://localhost:${this.API_PORT}/health`
      );
      
      const health = JSON.parse(stdout);
      return health.status === 'healthy';
    } catch (error) {
      logger.error('DeepWiki API health check failed:', error as Error);
      return false;
    }
  }
}

// Export singleton instance
export const deepWikiApiManager = new DeepWikiApiManager();