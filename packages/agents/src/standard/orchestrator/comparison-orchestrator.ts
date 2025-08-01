/**
 * Comparison Orchestrator Service - Interface-Based Design
 * 
 * This service orchestrates the complete analysis flow:
 * 1. Queries configuration provider for comparison agent configuration
 * 2. Orders Researcher to find optimal model if no configuration exists
 * 3. Initializes Comparison Agent with model and role-specific prompt
 * 4. Executes comparison analysis (which generates the full report)
 * 5. Updates developer skills based on results
 * 6. Optionally enhances with real course recommendations
 * 7. Returns complete results in requested format
 */

import { IConfigProvider, AnalysisConfig, ModelSelection } from './interfaces/config-provider.interface';
import { ISkillProvider, DeveloperSkills, SkillUpdate } from './interfaces/skill-provider.interface';
import { IEducatorAgent } from '../educator/interfaces/educator.interface';
import { ResearcherAgent } from '../../researcher/researcher-agent';
import { AIComparisonAgent } from '../../comparison/ai-comparison-agent';
import { IDataStore, AnalysisReport } from '../services/interfaces/data-store.interface';
import { 
  DeepWikiAnalysisResult, 
  RepositoryContext, 
  ComparisonAnalysisRequest,
  ComparisonResult,
  ModelSelectionWeights 
} from '../types/analysis-types';

/**
 * Comparison Orchestrator Service with Interface-Based Dependencies
 */
export class ComparisonOrchestrator {
  private comparisonAgent: AIComparisonAgent;
  
  constructor(
    private configProvider: IConfigProvider,
    private skillProvider: ISkillProvider,
    private dataStore: IDataStore,
    private researcherAgent: ResearcherAgent,
    private educatorAgent?: IEducatorAgent,
    private logger?: any
  ) {
    this.comparisonAgent = new AIComparisonAgent();
  }

  /**
   * Execute comparison analysis with full orchestration
   */
  async executeComparison(request: ComparisonAnalysisRequest): Promise<ComparisonResult> {
    this.log('info', 'Starting orchestrated comparison analysis');

    try {
      // Step 1: Analyze repository context for smart model selection
      const repoContext = this.analyzeRepositoryContext(request);
      
      // Step 2: Get model configuration from provider
      let config = await this.getConfiguration(request.userId, repoContext);

      if (!config) {
        // No configuration found, use researcher to find optimal model
        config = await this.researchOptimalConfiguration(repoContext);
        await this.configProvider.saveConfig(config);
      }

      // Step 3: Get historical skill data
      const skillData = await this.getSkillData(request);

      // Step 4: Get role-specific prompt
      const rolePrompt = this.buildRolePrompt(config, repoContext);

      // Step 5: Initialize comparison agent with configuration
      await this.comparisonAgent.initialize({
        language: request.language,
        sizeCategory: request.sizeCategory,
        role: 'comparison',
        prompt: rolePrompt
      });

      // Step 6: Execute comparison analysis (generates full report!)
      const analysisResult = await this.comparisonAgent.analyze({
        mainBranchAnalysis: this.ensureCompatibleAnalysisResult(request.mainBranchAnalysis),
        featureBranchAnalysis: this.ensureCompatibleAnalysisResult(request.featureBranchAnalysis),
        prMetadata: request.prMetadata,
        userProfile: skillData.userProfile ? this.convertToSkillProfile(skillData.userProfile) : undefined,
        teamProfiles: skillData.teamProfiles?.map(tp => this.convertToSkillProfile(tp)) || [],
        historicalIssues: request.historicalIssues,
        generateReport: request.generateReport !== false,  // Default true
        config: {
          rolePrompt: rolePrompt,
          weights: this.convertWeights(config.weights)
        }
      });

      // Step 7: Process analysis result to expected format
      const processedResult = this.processAnalysisResult(analysisResult);

      // Step 8: Update skill scores based on analysis
      await this.updateSkills(processedResult, request);

      // Step 9: Optionally enhance with real course recommendations
      let educationalEnhancements = null;
      if (request.includeEducation && this.educatorAgent && processedResult.educationalInsights) {
        try {
          educationalEnhancements = await this.educatorAgent.findMatchingCourses({
            suggestions: processedResult.educationalInsights,
            developerLevel: skillData.userProfile?.level?.current || 'beginner',
            teamProfile: await this.skillProvider.getTeamSkills(request.teamId || 'default')
          });
        } catch (error) {
          this.log('warn', 'Failed to get educational enhancements', error);
          // Continue without education enhancements
        }
      }

      // Step 9: Store complete analysis report
      await this.storeAnalysisReport(analysisResult, request, config, educationalEnhancements);

      // Step 10: Return complete results
      return {
        success: true,
        report: processedResult.markdownReport,         // Full markdown report
        prComment: processedResult.prComment,           // Concise PR comment
        analysis: processedResult.analysis || processedResult, // Raw analysis data
        education: educationalEnhancements || undefined,            // Real course links
        skillTracking: processedResult.skillTracking,   // Skill updates
        metadata: {
          orchestratorVersion: '4.0',
          modelUsed: config.modelPreferences.primary,
          configId: config.id,
          repositoryContext: repoContext,
          timestamp: new Date(),
          estimatedCost: this.calculateCost(repoContext, config),
          format: request.generateReport !== false ? 'markdown' : 'json'
        }
      };

    } catch (error) {
      this.log('error', 'Orchestration failed', error);
      throw error;
    }
  }

  /**
   * Get configuration from provider
   */
  private async getConfiguration(
    userId: string, 
    context: RepositoryContext
  ): Promise<AnalysisConfig | null> {
    try {
      // First try user-specific configuration
      let config = await this.configProvider.getConfig(userId, context.repoType);
      
      if (!config) {
        // Try to find similar configurations
        const similar = await this.configProvider.findSimilarConfigs({
          repoType: context.repoType,
          language: context.language,
          complexity: context.complexity
        });
        
        if (similar.length > 0) {
          // Use the most recent similar config
          config = similar[0];
          this.log('info', 'Using similar configuration', { 
            configId: config.id,
            originalUser: config.userId 
          });
        }
      }
      
      return config;
    } catch (error) {
      this.log('error', 'Failed to get configuration', error);
      return null;
    }
  }

  /**
   * Research optimal configuration using researcher agent
   */
  private async researchOptimalConfiguration(
    context: RepositoryContext
  ): Promise<AnalysisConfig> {
    this.log('info', 'Researching optimal configuration', context);
    
    const weights = this.calculateDynamicWeights(context);
    
    // Use researcher to find optimal model
    const research = await this.researcherAgent.research();
    
    // Build configuration from research
    return {
      userId: 'system',
      teamId: 'default',
      repoType: context.repoType,
      language: context.language,
      modelPreferences: {
        primary: {
          provider: research.provider,
          modelId: research.model,
          temperature: 0.3,
          maxTokens: 4000
        },
        fallback: { provider: research.provider, modelId: research.model }
      },
      weights: {
        security: context.hasSecurityIssues ? 0.25 : 0.15,
        performance: context.hasPerformanceIssues ? 0.25 : 0.15,
        codeQuality: 0.25,
        architecture: 0.20,
        dependencies: 0.15
      },
      thresholds: {
        critical: 90,
        high: 70,
        medium: 50,
        low: 30
      },
      features: {
        enableEducation: true,
        enableSkillTracking: true,
        enableDependencyAnalysis: true,
        enableArchitectureReview: context.sizeCategory !== 'small',
        enablePerformanceProfiling: context.hasPerformanceIssues
      },
      version: '1.0'
    };
  }

  /**
   * Get skill data from provider
   */
  private async getSkillData(request: ComparisonAnalysisRequest) {
    const userIds = this.extractUserIds(request);
    
    // Get user skills
    const userProfile = request.prMetadata?.author 
      ? await this.skillProvider.getUserSkills(request.prMetadata.author)
      : null;
    
    // Get team skills
    const teamProfiles = userIds.length > 0
      ? await this.skillProvider.getBatchUserSkills(userIds)
      : [];
    
    return { userProfile, teamProfiles };
  }

  /**
   * Update skills based on analysis results
   */
  private async updateSkills(
    analysisResult: any, 
    request: ComparisonAnalysisRequest
  ): Promise<void> {
    if (!request.prMetadata?.author) return;
    
    const updates: SkillUpdate[] = [];
    
    // Calculate skill adjustments from analysis
    const adjustments = this.calculateSkillAdjustments(analysisResult);
    
    if (adjustments.length > 0) {
      updates.push({
        userId: request.prMetadata.author,
        prId: request.prMetadata.id || 'unknown',
        timestamp: new Date(),
        previousScore: analysisResult.skillTracking?.previousScore || 50,
        newScore: analysisResult.skillTracking?.newScore || 50,
        adjustments,
        categoryChanges: analysisResult.skillTracking?.categoryChanges || {}
      });
      
      await this.skillProvider.updateSkills(updates);
    }
  }

  /**
   * Store analysis report in data store
   */
  private async storeAnalysisReport(
    analysisResult: any,
    request: ComparisonAnalysisRequest,
    config: AnalysisConfig,
    educationalEnhancements?: any
  ): Promise<void> {
    const report: AnalysisReport = {
      id: this.generateReportId(),
      prId: request.prMetadata?.id || 'unknown',
      repoUrl: request.prMetadata?.repository_url || 'unknown',
      userId: request.prMetadata?.author || 'unknown',
      teamId: config.teamId,
      timestamp: new Date(),
      score: analysisResult.overallScore || 0,
      issues: this.extractIssues(analysisResult),
      metadata: {
        modelUsed: `${config.modelPreferences.primary.provider}/${config.modelPreferences.primary.modelId}`,
        duration: analysisResult.duration || 0,
        filesAnalyzed: request.mainBranchAnalysis.metadata?.files_analyzed || 0,
        linesChanged: this.calculateLinesChanged(request),
        language: config.language,
        prSize: request.sizeCategory as any || 'medium'
      },
      markdownReport: analysisResult.markdownReport
    };
    
    await this.dataStore.saveReport(report);
    
    // Cache the report for quick access
    await this.dataStore.cache.set(
      `report:${report.prId}`,
      report,
      3600 // 1 hour TTL
    );
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
    
    // Determine complexity
    let complexity: 'low' | 'medium' | 'high' = 'low';
    
    if (criticalCount > 5 || highCount > 20 || allIssues.length > 50) {
      complexity = 'high';
    } else if (criticalCount > 2 || highCount > 10 || allIssues.length > 20) {
      complexity = 'medium';
    }
    
    // Increase for security-heavy repos
    if (securityIssues > allIssues.length * 0.5 && complexity === 'low') {
      complexity = 'medium';
    }
    
    return {
      repoType: this.inferRepoType(request),
      language: request.language || 'typescript',
      sizeCategory: request.sizeCategory || 'medium',
      complexity,
      issueCount: allIssues.length,
      criticalIssueCount: criticalCount,
      filesAnalyzed,
      hasSecurityIssues: securityIssues > 0,
      hasPerformanceIssues: performanceIssues > 0,
      fileTypes: this.analyzeFileTypes(allIssues)
    };
  }

  /**
   * Calculate dynamic weights based on repository context
   */
  private calculateDynamicWeights(context: RepositoryContext): ModelSelectionWeights {
    const weights: ModelSelectionWeights = {
      quality: 0.4,
      speed: 0.2,
      cost: 0.3,
      recency: 0.1
    };
    
    // Adjust based on size
    if (context.sizeCategory === 'large') {
      weights.quality += 0.2;
      weights.cost -= 0.1;
    } else if (context.sizeCategory === 'small') {
      weights.quality -= 0.1;
      weights.cost += 0.1;
    }
    
    // Adjust based on critical issues
    if (context.criticalIssueCount > 0) {
      weights.quality += 0.1;
      weights.speed += 0.05;
      weights.cost -= 0.15;
    }
    
    // Normalize
    const sum = Object.values(weights).reduce((a, b) => a + b, 0);
    Object.keys(weights).forEach(key => {
      weights[key as keyof ModelSelectionWeights] /= sum;
    });
    
    return weights;
  }

  /**
   * Ensure DeepWikiAnalysisResult has required properties for AIComparisonAgent
   */
  private ensureCompatibleAnalysisResult(analysis: any): any {
    if (!analysis) return { issues: [], recommendations: [], scores: null };
    
    return {
      ...analysis,
      recommendations: analysis.recommendations || [],
      scores: analysis.scores || {
        overall: 75,
        security: 70,
        performance: 80,
        maintainability: 75,
        testing: 90
      }
    };
  }

  /**
   * Convert DeveloperSkills to SkillProfile for AIComparisonAgent
   */
  private convertToSkillProfile(developerSkills: any): any {
    if (!developerSkills) return null;
    
    // Create a simplified SkillProfile from DeveloperSkills
    return {
      userId: developerSkills.userId || 'unknown',
      skills: {
        security: { level: developerSkills.categoryScores?.security || 50 },
        performance: { level: developerSkills.categoryScores?.performance || 50 },
        codeQuality: { level: developerSkills.categoryScores?.codeQuality || 50 },
        architecture: { level: developerSkills.categoryScores?.architecture || 50 },
        testing: { level: developerSkills.categoryScores?.testing || 50 },
        debugging: { level: 50 }
      },
      history: [],
      achievements: [],
      learningProgress: { completedCourses: 0, totalHours: 0 }
    };
  }

  /**
   * Convert CategoryWeights to expected format
   */
  private convertWeights(weights: any): any {
    if (!weights) {
      return { quality: 0.8, speed: 0.1, cost: 0.1 };
    }
    
    // Convert CategoryWeights to the expected format
    return {
      quality: weights.security || 0.8,
      speed: weights.performance || 0.1,
      cost: weights.dependencies || 0.1
    };
  }

  /**
   * Process analysis result to expected format
   */
  private processAnalysisResult(analysisResult: any): any {
    // The AIComparisonAgent returns a different format than expected
    // Let's extract the needed properties from the metadata and create a compatible result
    const metadata = analysisResult.metadata || {};
    const comparison = metadata.comparison || {};
    
    return {
      markdownReport: metadata.report || this.generateBasicReport(comparison),
      prComment: this.generatePRComment(comparison),
      analysis: comparison,
      educationalInsights: metadata.educational || [],
      skillTracking: metadata.skills || null,
      overallScore: comparison.overallScore || 75,
      duration: metadata.processingTime || 0,
      issues: comparison.insights || []
    };
  }

  /**
   * Generate basic markdown report from comparison data
   */
  private generateBasicReport(comparison: any): string {
    return `# Code Analysis Report

## Summary
${comparison.summary || 'Analysis completed successfully.'}

## Security Assessment
Risk Level: ${comparison.riskAssessment || 'medium'}

## Key Findings
${comparison.insights?.map((insight: any) => `- ${insight.title}: ${insight.description}`).join('\n') || 'No significant issues found.'}

## Recommendations
${comparison.recommendations?.map((rec: any, i: number) => `${i + 1}. ${rec.title || rec}`).join('\n') || 'Continue with best practices.'}
`;
  }

  /**
   * Generate PR comment from comparison data
   */
  private generatePRComment(comparison: any): string {
    const riskLevel = comparison.riskAssessment || 'medium';
    const emoji = riskLevel === 'high' ? '⚠️' : riskLevel === 'low' ? '✅' : '📊';
    
    return `${emoji} **Code Analysis Complete**

**Risk Level:** ${riskLevel.toUpperCase()}
**Overall Score:** ${comparison.overallScore || 75}/100

${comparison.insights?.length ? `**Key Issues:** ${comparison.insights.length} findings` : '**Status:** No significant issues detected'}

_Analysis powered by CodeAI Comparison Agent_`;
  }

  /**
   * Build role-specific prompt
   */
  private buildRolePrompt(config: AnalysisConfig, context: RepositoryContext): string {
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
      ? 'This is a complex repository requiring thorough analysis.'
      : context.complexity === 'low'
      ? 'This is a straightforward repository. Focus on clarity.'
      : 'This repository has moderate complexity.';

    return `You are an expert AI comparison analyst specializing in code quality assessment.

REPOSITORY CONTEXT:
- Language: ${context.language}
- Size: ${context.sizeCategory} (${context.filesAnalyzed} files)
- Complexity: ${context.complexity}
- Total Issues: ${context.issueCount}

${complexityGuidance}

Focus areas:
${focusAreas.length > 0 ? focusAreas.map(f => `- ${f}`).join('\n') : '- General code quality'}

Ensure 100% accuracy, professional language, and actionable recommendations.`;
  }

  // Helper methods
  private analyzeFileTypes(issues: any[]): Record<string, number> {
    const types = { security: 0, performance: 0, tests: 0, documentation: 0, core: 0 };
    
    issues.forEach(issue => {
      const file = issue.location?.file || '';
      if (file.includes('auth') || file.includes('security')) types.security++;
      else if (file.includes('perf') || file.includes('cache')) types.performance++;
      else if (file.includes('test') || file.includes('spec')) types.tests++;
      else if (file.includes('.md') || file.includes('doc')) types.documentation++;
      else types.core++;
    });
    
    return types;
  }

  private inferRepoType(request: ComparisonAnalysisRequest): string {
    // Infer from language and file patterns
    const lang = request.language?.toLowerCase() || '';
    if (lang.includes('python')) return 'python-backend';
    if (lang.includes('javascript') || lang.includes('typescript')) return 'node-fullstack';
    if (lang.includes('java')) return 'java-enterprise';
    return 'general';
  }

  private extractUserIds(request: ComparisonAnalysisRequest): string[] {
    const ids = new Set<string>();
    if (request.prMetadata?.author) ids.add(request.prMetadata.author);
    // Extract from team profiles if available
    return Array.from(ids);
  }

  private calculateSkillAdjustments(analysisResult: any) {
    // Extract adjustments from analysis result
    return analysisResult.skillAdjustments || [];
  }

  private generateReportId(): string {
    return `report_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private extractIssues(analysisResult: any) {
    return analysisResult.issues || [];
  }

  private calculateLinesChanged(request: ComparisonAnalysisRequest): number {
    return (request.prMetadata?.linesAdded || 0) + (request.prMetadata?.linesRemoved || 0);
  }

  private calculateCost(context: RepositoryContext, config: AnalysisConfig): number {
    const baseTokens = context.filesAnalyzed * 50;
    const issueTokens = context.issueCount * 100;
    const totalTokens = baseTokens + issueTokens;
    const millionTokens = totalTokens / 1_000_000;
    
    // Rough estimate based on model
    const rate = 0.5; // $/M tokens
    return millionTokens * rate;
  }

  private log(level: string, message: string, data?: any) {
    if (this.logger) {
      this.logger[level](message, data);
    } else {
      const msg = `[ComparisonOrchestrator] ${message}`;
      switch (level) {
        case 'debug': console.debug(msg, data || ''); break;
        case 'info': console.info(msg, data || ''); break;
        case 'warn': console.warn(msg, data || ''); break;
        case 'error': console.error(msg, data || ''); break;
        default: console.log(msg, data || ''); break;
      }
    }
  }
}