/**
 * Comparison Orchestrator Service
 * 
 * This service orchestrates the comparison analysis flow:
 * 1. Queries database for comparison agent configuration
 * 2. Orders Researcher to find optimal model if no configuration exists
 * 3. Initializes Comparison Agent with model and role-specific prompt
 * 4. Manages the complete analysis pipeline
 */

import { createLogger, Logger } from '@codequal/core/utils';
import { ResearcherAgent } from '../researcher/researcher-agent';
import { AIComparisonAgent } from '../comparison/ai-comparison-agent';
import { DeepWikiAnalysisResult } from '../types/deepwiki';
import { SkillProfile } from '../comparison/skill-tracker';
import { AuthenticatedUser } from '@codequal/core/types';
import { RESEARCH_PROMPTS } from '../researcher/research-prompts';

/**
 * Comparison analysis request
 */
export interface ComparisonAnalysisRequest {
  mainBranchAnalysis: DeepWikiAnalysisResult;
  featureBranchAnalysis: DeepWikiAnalysisResult;
  prMetadata?: {
    id?: string;
    number?: number;
    title?: string;
    description?: string;
    author?: string;
    created_at?: string;
    repository_url?: string;
  };
  userProfile?: SkillProfile;
  teamProfiles?: SkillProfile[];
  historicalIssues?: any[];
  generateReport?: boolean;
  language?: string;
  sizeCategory?: string;
}

/**
 * Model configuration result from database or researcher
 */
interface ModelConfiguration {
  provider: string;
  model: string;
  version: string;
  reasoning: string;
  capabilities: {
    roleSpecific: number;
    quality: number;
    speed: number;
    costEfficiency: number;
  };
  prompt?: string;
  weights?: {
    quality: number;
    speed: number;
    cost: number;
  };
  estimatedCostPerAnalysis?: number;
}

/**
 * Repository context for model selection
 */
interface RepositoryContext {
  language: string;
  sizeCategory: string;
  complexity: 'low' | 'medium' | 'high';
  issueCount: number;
  criticalIssueCount: number;
  filesAnalyzed: number;
  hasSecurityIssues: boolean;
  hasPerformanceIssues: boolean;
  fileTypes: {
    security: number;
    performance: number;
    tests: number;
    documentation: number;
    core: number;
  };
}

/**
 * Dynamic weights for model selection
 */
interface ModelSelectionWeights {
  quality: number;     // 0-1
  speed: number;       // 0-1
  cost: number;        // 0-1
  recency: number;     // 0-1
}

/**
 * Comparison Orchestrator Service
 */
export class ComparisonOrchestrator {
  private logger: Logger;
  private comparisonAgent: AIComparisonAgent;
  private user: AuthenticatedUser;

  constructor(user: AuthenticatedUser) {
    this.logger = createLogger('ComparisonOrchestrator');
    this.user = user;
    this.comparisonAgent = new AIComparisonAgent();
  }

  /**
   * Execute comparison analysis with full orchestration
   */
  async executeComparison(request: ComparisonAnalysisRequest): Promise<any> {
    this.logger.info('Starting orchestrated comparison analysis');

    try {
      // Step 1: Analyze repository context for smart model selection
      const repoContext = this.analyzeRepositoryContext(request);
      
      // Step 2: Get model configuration based on context
      const modelConfig = await this.getModelConfiguration(repoContext);

      // Step 3: Get role-specific prompt
      const rolePrompt = await this.getRolePrompt(modelConfig, repoContext);

      // Step 4: Initialize comparison agent with configuration
      await this.comparisonAgent.initialize({
        language: request.language,
        sizeCategory: request.sizeCategory,
        role: 'comparison',
        prompt: rolePrompt
      });

      // Step 5: Execute comparison analysis
      const analysisResult = await this.comparisonAgent.analyze({
        mainBranchAnalysis: request.mainBranchAnalysis,
        featureBranchAnalysis: request.featureBranchAnalysis,
        prMetadata: request.prMetadata,
        userProfile: request.userProfile,
        teamProfiles: request.teamProfiles,
        historicalIssues: request.historicalIssues,
        generateReport: request.generateReport,
        config: {
          rolePrompt: rolePrompt,
          weights: modelConfig.weights
        }
      });

      // Step 6: Store analysis results 
      await this.storeAnalysisResults(analysisResult, request);

      // Step 7: Return orchestrated results with cost estimate
      return {
        success: true,
        analysis: analysisResult,
        metadata: {
          orchestratorVersion: '2.0',
          modelUsed: {
            provider: modelConfig.provider,
            model: modelConfig.model,
            version: modelConfig.version,
            estimatedCost: modelConfig.estimatedCostPerAnalysis,
            weights: modelConfig.weights
          },
          repositoryContext: repoContext,
          timestamp: new Date().toISOString()
        }
      };

    } catch (error) {
      this.logger.error('Orchestration failed', error as any);
      throw error;
    }
  }

  /**
   * Analyze repository context to determine complexity
   */
  private analyzeRepositoryContext(request: ComparisonAnalysisRequest): RepositoryContext {
    const mainIssues = request.mainBranchAnalysis.issues || [];
    const featureIssues = request.featureBranchAnalysis.issues || [];
    const allIssues = [...mainIssues, ...featureIssues];
    
    const criticalCount = allIssues.filter(i => i.severity === 'critical').length;
    const highCount = allIssues.filter(i => i.severity === 'high').length;
    const securityIssues = allIssues.filter(i => i.category === 'security').length;
    const performanceIssues = allIssues.filter(i => i.category === 'performance').length;
    
    const filesAnalyzed = request.mainBranchAnalysis.metadata?.files_analyzed || 0;
    
    // Analyze file types from issues (in real implementation, would analyze actual files)
    const fileTypes = this.analyzeFileTypes(allIssues);
    
    // Determine complexity based on multiple factors
    let complexity: 'low' | 'medium' | 'high' = 'low';
    
    if (criticalCount > 5 || highCount > 20 || allIssues.length > 50) {
      complexity = 'high';
    } else if (criticalCount > 2 || highCount > 10 || allIssues.length > 20) {
      complexity = 'medium';
    }
    
    // Increase complexity for security-heavy repositories
    if (securityIssues > allIssues.length * 0.5 && complexity === 'low') {
      complexity = 'medium';
    }
    
    const context: RepositoryContext = {
      language: request.language || 'typescript',
      sizeCategory: request.sizeCategory || 'medium',
      complexity,
      issueCount: allIssues.length,
      criticalIssueCount: criticalCount,
      filesAnalyzed,
      hasSecurityIssues: securityIssues > 0,
      hasPerformanceIssues: performanceIssues > 0,
      fileTypes
    };
    
    this.logger.info('Repository context analyzed', { ...context });
    return context;
  }

  /**
   * Analyze file types from issues
   */
  private analyzeFileTypes(issues: any[]): RepositoryContext['fileTypes'] {
    const fileTypes = {
      security: 0,
      performance: 0,
      tests: 0,
      documentation: 0,
      core: 0
    };
    
    issues.forEach(issue => {
      const file = issue.location?.file || '';
      
      if (file.includes('auth') || file.includes('security') || file.includes('crypto')) {
        fileTypes.security++;
      } else if (file.includes('perf') || file.includes('cache') || file.includes('optimize')) {
        fileTypes.performance++;
      } else if (file.includes('test') || file.includes('spec')) {
        fileTypes.tests++;
      } else if (file.includes('.md') || file.includes('doc')) {
        fileTypes.documentation++;
      } else {
        fileTypes.core++;
      }
    });
    
    return fileTypes;
  }

  /**
   * Get model configuration from database or research
   */
  private async getModelConfiguration(
    context: RepositoryContext
  ): Promise<ModelConfiguration> {
    this.logger.info('Getting model configuration', { ...context });

    try {
      // Calculate dynamic weights based on context
      const weights = this.calculateDynamicWeights(context);
      
      this.logger.info('Calculated dynamic weights', { ...weights });
      
      // Query database for existing configuration matching weights
      const existingConfig = await this.queryModelConfiguration(context);
      
      if (existingConfig) {
        this.logger.info('Found existing configuration', {
          provider: existingConfig.provider,
          model: existingConfig.model
        });
        return existingConfig;
      }

      // No configuration found, order researcher to find one with dynamic weights
      this.logger.info('No configuration found, initiating weight-based research');
      const researchResult = await this.conductWeightBasedResearch(context, weights);
      
      // Store the new configuration
      await this.storeModelConfiguration(researchResult, context);
      
      return researchResult;

    } catch (error) {
      this.logger.error('Failed to get model configuration', error as any);
      
      // Fallback with dynamic weights
      return this.getDynamicFallback(context);
    }
  }

  /**
   * Calculate dynamic weights based on repository context
   */
  private calculateDynamicWeights(context: RepositoryContext): ModelSelectionWeights {
    // Start with base weights
    const weights: ModelSelectionWeights = {
      quality: 0.4,
      speed: 0.2,
      cost: 0.3,
      recency: 0.1
    };
    
    // Adjust quality weight based on repository size
    if (context.sizeCategory === 'large') {
      weights.quality += 0.2;
      weights.cost -= 0.1;
    } else if (context.sizeCategory === 'small') {
      weights.quality -= 0.1;
      weights.cost += 0.1;
    }
    
    // Adjust based on file types
    const totalFiles = Object.values(context.fileTypes).reduce((a, b) => a + b, 0);
    if (totalFiles > 0) {
      const securityRatio = context.fileTypes.security / totalFiles;
      const performanceRatio = context.fileTypes.performance / totalFiles;
      const testDocRatio = (context.fileTypes.tests + context.fileTypes.documentation) / totalFiles;
      
      // Security/performance files need higher quality
      if (securityRatio > 0.3 || performanceRatio > 0.3) {
        weights.quality += 0.15;
        weights.cost -= 0.15;
      }
      
      // Test/documentation files can use lower quality
      if (testDocRatio > 0.5) {
        weights.quality -= 0.15;
        weights.cost += 0.15;
      }
    }
    
    // Adjust based on issue severity
    if (context.criticalIssueCount > 0) {
      weights.quality += 0.1;
      weights.speed += 0.05;
      weights.cost -= 0.15;
    }
    
    // Normalize weights to sum to 1
    const sum = weights.quality + weights.speed + weights.cost + weights.recency;
    weights.quality /= sum;
    weights.speed /= sum;
    weights.cost /= sum;
    weights.recency /= sum;
    
    return weights;
  }

  /**
   * Query database for model configuration
   */
  private async queryModelConfiguration(
    context: RepositoryContext
  ): Promise<ModelConfiguration | null> {
    try {
      // Build query based on context
      const query = {
        language: context.language,
        sizeCategory: context.sizeCategory,
        complexity: context.complexity,
        hasSecurityIssues: context.hasSecurityIssues
      };
      
      // TODO: Implement proper database query when Supabase is available
      this.logger.info('Database query not implemented', { query });
      return null;

    } catch (error) {
      this.logger.error('Error querying model configuration', error as any);
      return null;
    }
  }

  /**
   * Conduct weight-based model research using Researcher agent
   */
  private async conductWeightBasedResearch(
    context: RepositoryContext,
    weights: ModelSelectionWeights
  ): Promise<ModelConfiguration> {
    this.logger.info('Conducting weight-based model research', { 
      context: { ...context },
      weights 
    });

    try {
      // Build context description for research
      const contextDescription = `${context.language} repository, ${context.sizeCategory} size, ${context.complexity} complexity, ${context.issueCount} issues`;
      const fileTypeInfo = `File distribution: ${JSON.stringify(context.fileTypes)}`;
      
      const researcher = new ResearcherAgent(this.user, {
        researchDepth: weights.quality > 0.6 ? 'comprehensive' : 'deep',
        customPrompt: `
You are researching the BEST AI model for code comparison based on weighted priorities.

CRITICAL REQUIREMENTS:
1. Model MUST be released within the last 3-6 months from TODAY'S DATE
2. Search for the NEWEST models available TODAY - discover them yourself
3. Calculate dates relative to TODAY, not any fixed date

REPOSITORY CONTEXT:
${contextDescription}
${fileTypeInfo}

WEIGHTED PRIORITIES (sum to 1.0):
- Quality: ${weights.quality.toFixed(2)} - ${weights.quality > 0.5 ? 'HIGH PRIORITY' : weights.quality < 0.3 ? 'LOW PRIORITY' : 'MEDIUM PRIORITY'}
- Speed: ${weights.speed.toFixed(2)} - ${weights.speed > 0.3 ? 'FAST RESPONSE NEEDED' : 'STANDARD SPEED OK'}
- Cost: ${weights.cost.toFixed(2)} - ${weights.cost > 0.4 ? 'COST IS CRITICAL' : weights.cost < 0.2 ? 'COST LESS IMPORTANT' : 'BALANCED COST'}
- Recency: ${weights.recency.toFixed(2)} - Must be recent but not primary factor

SELECTION CRITERIA:
1. First filter for models 3-6 months old
2. Then optimize based on the weighted priorities above
3. If cost weight is high (>${weights.cost}), prioritize cheaper models
4. If quality weight is high (>${weights.quality}), prioritize best performing models
5. Consider ALL providers without bias

Return the SINGLE BEST model that optimizes these weighted priorities.`
      });

      // Conduct research
      const research = await researcher.research();

      // Calculate estimated cost based on context
      const estimatedCost = this.calculateEstimatedCost(context, research);

      // Extract model configuration from research
      return {
        provider: research.provider,
        model: research.model,
        version: 'latest',
        reasoning: `Weight-optimized selection: ${research.reasoning}`,
        capabilities: {
          roleSpecific: 8.5,
          quality: 8.5,
          speed: 8.0,
          costEfficiency: 8.0
        },
        weights: {
          quality: weights.quality,
          speed: weights.speed,
          cost: weights.cost
        },
        estimatedCostPerAnalysis: estimatedCost
      };

    } catch (error) {
      this.logger.error('Weight-based research failed', error as any);
      throw error;
    }
  }


  /**
   * Calculate estimated cost based on context and model
   */
  private calculateEstimatedCost(context: RepositoryContext, research: any): number {
    // Base token estimation
    const baseTokens = context.filesAnalyzed * 50; // Rough estimate
    const issueTokens = context.issueCount * 100;
    const totalTokens = baseTokens + issueTokens;
    
    // Convert to millions for pricing
    const millionTokens = totalTokens / 1_000_000;
    
    // Use research pricing if available, otherwise use latest model defaults
    // Latest models are MUCH cheaper - DeepSeek V3 is ~$0.14/M input, $0.28/M output
    const inputPrice = research.pricing?.input || 0.50;  // Average for latest models
    const outputPrice = research.pricing?.output || 2.0; // Average for latest models
    
    // Estimate output is roughly 30% of input for comparison tasks
    const estimatedCost = (millionTokens * inputPrice) + (millionTokens * 0.3 * outputPrice);
    
    // Cap at reasonable limits based on complexity - MUCH lower with new models
    const maxCost = context.complexity === 'low' ? 0.08 : 
                   context.complexity === 'medium' ? 0.15 : 0.25;
    
    return Math.min(estimatedCost, maxCost);
  }

  /**
   * Store model configuration in database
   */
  private async storeModelConfiguration(
    config: ModelConfiguration,
    context: RepositoryContext
  ): Promise<void> {
    try {
      // TODO: Implement proper database storage when Supabase is available
      this.logger.info('Model configuration storage not implemented', {
        provider: config.provider,
        model: config.model,
        context
      });

    } catch (error) {
      this.logger.error('Failed to store model configuration', error as any);
      // Continue without storing - not critical
    }
  }

  /**
   * Get role-specific prompt for comparison agent
   */
  private async getRolePrompt(
    config: ModelConfiguration, 
    context: RepositoryContext
  ): Promise<string> {
    // Check if prompt is stored with configuration
    if (config.prompt) {
      return config.prompt;
    }

    // Build context-aware prompt
    const focusAreas = [];
    if (context.hasSecurityIssues) {
      focusAreas.push('Security vulnerabilities and their remediation');
    }
    if (context.hasPerformanceIssues) {
      focusAreas.push('Performance optimizations and bottlenecks');
    }
    if (context.criticalIssueCount > 0) {
      focusAreas.push('Critical issues requiring immediate attention');
    }

    const complexityGuidance = context.complexity === 'high' 
      ? 'This is a complex repository requiring thorough analysis. Be especially detailed in your reasoning.'
      : context.complexity === 'low'
      ? 'This is a straightforward repository. Focus on clarity and conciseness while maintaining accuracy.'
      : 'This repository has moderate complexity. Balance detail with readability.';

    // Use optimized prompt based on context
    return `You are an expert AI comparison analyst specializing in code quality assessment.

REPOSITORY CONTEXT:
- Language: ${context.language}
- Size: ${context.sizeCategory} (${context.filesAnalyzed} files)
- Complexity: ${context.complexity}
- Total Issues: ${context.issueCount}
- Critical Issues: ${context.criticalIssueCount}

${complexityGuidance}

Your role is to provide accurate, detailed comparisons between code analysis reports with a focus on:
${focusAreas.length > 0 ? focusAreas.map(f => `- ${f}`).join('\n') : '- General code quality and best practices'}
- Code quality improvements and regressions
- Technical debt analysis
- Developer skill assessment
- Actionable recommendations

Key responsibilities:
1. Identify what issues were resolved, added, or modified between branches
2. Assess the overall impact on code quality and security
3. Provide clear reasoning for your conclusions
4. Generate comprehensive reports for business stakeholders
5. Track developer progress and skill improvements

${context.complexity === 'low' ? 'For this simple repository, prioritize clear, concise analysis.' : ''}
${context.hasSecurityIssues ? 'Pay special attention to security vulnerabilities and their resolution status.' : ''}

Quality is paramount as these reports are sold to customers. Ensure:
- 100% accuracy in issue identification
- Clear, professional language
- Detailed evidence for all claims
- Actionable recommendations
- Fair and constructive skill assessments

Consider context and nuance - not just literal matches. A HIGH severity issue 
downgraded to LOW is a modification, not a resolution. Be conservative in 
marking issues as resolved.`;
  }

  /**
   * Get dynamic fallback configuration
   */
  private getDynamicFallback(context: RepositoryContext): ModelConfiguration {
    const weights = this.calculateDynamicWeights(context);
    
    // Provide reasonable fallback based on weights
    return {
      provider: 'openai',
      model: 'gpt-4o-mini', // This would be researched in production
      version: 'latest',
      reasoning: `Dynamic fallback based on weights: Quality=${weights.quality.toFixed(2)}, Cost=${weights.cost.toFixed(2)}`,
      capabilities: {
        roleSpecific: 8.0,
        quality: 8.0,
        speed: 8.5,
        costEfficiency: 9.0
      },
      weights: {
        quality: weights.quality,
        speed: weights.speed,
        cost: weights.cost
      },
      estimatedCostPerAnalysis: 0.10 // Estimated, would be calculated
    };
  }

  /**
   * Store analysis results in database
   */
  private async storeAnalysisResults(
    analysisResult: any,
    request: ComparisonAnalysisRequest
  ): Promise<void> {
    try {
      // TODO: Implement proper database storage when Supabase is available
      this.logger.info('Analysis results storage not implemented');

    } catch (error) {
      this.logger.error('Failed to store analysis results', error as any);
      // Continue without storing - not critical
    }
  }
}