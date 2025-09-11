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
import { ComparisonAgent } from '../comparison/comparison-agent';
import { IReportingComparisonAgent } from '../comparison/interfaces/comparison-agent.interface';
import { IDataStore, AnalysisReport } from '../services/interfaces/data-store.interface';
import { 
  DeepWikiAnalysisResult, 
  RepositoryContext, 
  ComparisonAnalysisRequest,
  ComparisonResult,
  ModelSelectionWeights 
} from '../types/analysis-types';
import { CategoryWeights } from './interfaces/config-provider.interface';
import { BatchLocationEnhancer, LocationEnhancer } from '../services/location-enhancer';
import { getDynamicModelConfig, trackDynamicAgentCall } from '../monitoring';
import { LanguageRouter, LanguageDetectionResult } from './language-router';
import type { AgentRole } from '../monitoring/services/dynamic-agent-cost-tracker.service';

/**
 * Comparison Orchestrator Service with Interface-Based Dependencies
 */
export class ComparisonOrchestrator {
  private comparisonAgent: IReportingComparisonAgent;
  private batchLocationEnhancer: BatchLocationEnhancer;
  private locationEnhancer: LocationEnhancer;
  private languageRouter: LanguageRouter;
  private modelConfigId = '';
  private primaryModel = '';
  private fallbackModel = '';
  private language = 'typescript';
  private repositorySize: 'small' | 'medium' | 'large' | 'enterprise' = 'medium';
  
  constructor(
    private configProvider: IConfigProvider,
    private skillProvider: ISkillProvider,
    private dataStore: IDataStore,
    private researcherAgent: ResearcherAgent,
    private educatorAgent?: IEducatorAgent,
    private logger?: any,
    private comparisonAgentInstance?: IReportingComparisonAgent
  ) {
    // Use injected comparison agent or create default with skill provider (BUG-012 fix)
    this.comparisonAgent = comparisonAgentInstance || new ComparisonAgent(
      logger,
      undefined,  // modelService
      this.skillProvider  // Pass skill provider for score persistence
    );
    this.batchLocationEnhancer = new BatchLocationEnhancer();
    this.locationEnhancer = new LocationEnhancer();
    this.languageRouter = new LanguageRouter();
  }

  /**
   * Execute comparison analysis with full orchestration
   */
  /**
   * Initialize orchestrator with model configuration from Supabase
   */
  async initialize(language?: string, repoSize?: 'small' | 'medium' | 'large' | 'enterprise'): Promise<void> {
    this.language = language || 'typescript';
    this.repositorySize = repoSize || 'medium';
    
    try {
      const supabaseConfig = await getDynamicModelConfig(
        'orchestrator' as AgentRole,
        this.language,
        this.repositorySize
      );
      
      if (supabaseConfig) {
        this.modelConfigId = supabaseConfig.id;
        this.primaryModel = supabaseConfig.primary_model;
        this.fallbackModel = supabaseConfig.fallback_model || '';
        
        this.log('info', 'Orchestrator initialized with Supabase config', {
          primary: this.primaryModel,
          fallback: this.fallbackModel,
          configId: this.modelConfigId
        });
      }
    } catch (error) {
      this.log('warn', 'Failed to get Supabase config for Orchestrator', error);
    }
  }

  async executeComparison(request: ComparisonAnalysisRequest): Promise<ComparisonResult> {
    this.log('info', 'Starting orchestrated comparison analysis');
    const startTime = Date.now();
    const inputTokens = 0;
    const outputTokens = 0;
    const isFallback = false;
    const retryCount = 0;
    
    // Use provided DeepWiki scan duration if available
    const deepWikiScanDuration = (request as any).deepWikiScanDuration;

    try {
      // Ensure initialization
      if (!this.modelConfigId) {
        const repoContext = await this.analyzeRepositoryContext(request);
        await this.initialize(repoContext.language, this.mapSizeToCategory(repoContext.sizeCategory));
      }
      // Step 1: Analyze repository context for smart model selection
      const repoContext = await this.analyzeRepositoryContext(request);
      
      // Step 2: Get model configuration from Supabase (no validation, just pull)
      let config = await this.getConfiguration(request.userId, repoContext);

      if (!config) {
        // No configuration found, use researcher to find optimal model
        this.log('info', 'No configuration found, researching optimal model');
        
        // Use researcher agent to find best model for this context
        const research = await this.researcherAgent.research();
        
        // Create configuration with researched model
        config = {
          userId: request.userId,
          teamId: request.teamId || '00000000-0000-0000-0000-000000000000',
          repoType: repoContext.repoType,
          language: repoContext.language,
          modelPreferences: {
            primary: {
              provider: research.provider,
              modelId: research.model,
              temperature: 0.3,
              maxTokens: 4000
            },
            fallback: {
              provider: 'openai',
              modelId: 'dynamic', // Will be selected dynamically by the unified model selector,
              temperature: 0.3,
              maxTokens: 4000
            }
          },
          weights: this.calculateDynamicWeights(repoContext),
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
            enableArchitectureReview: repoContext.sizeCategory !== 'small',
            enablePerformanceProfiling: repoContext.hasPerformanceIssues
          },
          version: '2.0'
        };
        
        // Save configuration for future use
        const configId = await this.configProvider.saveConfig(config);
        config.id = configId;
        
        this.log('info', 'Saved new configuration from researcher', {
          configId,
          model: research.model,
          provider: research.provider
        });
      } else {
        // Check if configuration is stale
        const configAge = this.getConfigAge(config);
        if (this.isConfigStale(config)) {
          this.log('warn', 'Configuration is stale', {
            age: configAge,
            lastUpdated: config.updatedAt || config.createdAt,
            threshold: '90 days'
          });
          
          // Alert monitoring system
          this.alertStaleConfig(config, configAge);
        }
      }
      
      // At this point, config is guaranteed to exist (either retrieved or created)
      if (!config) {
        throw new Error('Configuration should exist at this point');
      }

      // Log the model being used
      this.log('info', 'Using model configuration', {
        model: config.modelPreferences.primary.modelId,
        provider: config.modelPreferences.primary.provider,
        version: config.version,
        cost: this.calculateCost(repoContext, config),
        configAge: this.getConfigAge(config)
      });

      // Step 3: Get historical skill data
      const skillData = await this.getSkillData(request);

      // Step 4: Get role-specific prompt
      const rolePrompt = this.buildRolePrompt(config, repoContext);

      // Step 5: Initialize comparison agent with configuration
      await this.comparisonAgent.initialize({
        language: request.language,
        sizeCategory: request.sizeCategory,
        role: 'comparison',
        prompt: rolePrompt,
        modelConfig: {
          provider: config.modelPreferences.primary.provider,
          model: config.modelPreferences.primary.modelId
        }
      } as any);

      // Step 5.5: Parallel enhancement - Location Finding + Initial Educational Research
      let enhancedMainAnalysis = request.mainBranchAnalysis;
      let enhancedFeatureAnalysis = request.featureBranchAnalysis;
      let educationalResearch = null;
      
      // Start parallel operations
      const enhancementPromises = [];
      
      // Location enhancement promise
      if (request.prMetadata?.repository_url && request.prMetadata?.number) {
        const locationPromise = (async () => {
          try {
            this.log('info', 'Starting location enhancement for both branches');
            
            const repoUrl = request.prMetadata!.repository_url;
            const prNumber = request.prMetadata!.number!.toString();
            
            // Enhance both branches in parallel
            const [mainEnhancement, prEnhancement] = await Promise.all([
              request.mainBranchAnalysis?.issues ? 
                this.locationEnhancer.enhanceIssuesWithLocations(
                  request.mainBranchAnalysis.issues,
                  repoUrl || '',
                  undefined // Use undefined for main branch
                ) : Promise.resolve(null),
              request.featureBranchAnalysis?.issues ?
                this.locationEnhancer.enhanceIssuesWithLocations(
                  request.featureBranchAnalysis.issues,
                  repoUrl || '',
                  prNumber // Pass PR number for feature branch
                ) : Promise.resolve(null)
            ]);
            
            if (mainEnhancement) {
              enhancedMainAnalysis = {
                ...request.mainBranchAnalysis,
                issues: mainEnhancement.issues.map((issue: any) => ({
                  ...issue,
                  message: issue.message || issue.title || issue.description
                }))
              };
              this.log('info', `Enhanced main: ${mainEnhancement.enhanced}/${mainEnhancement.issues.length}`);
            }
            
            if (prEnhancement) {
              enhancedFeatureAnalysis = {
                ...request.featureBranchAnalysis,
                issues: prEnhancement.issues.map((issue: any) => ({
                  ...issue,
                  message: issue.message || issue.title || issue.description
                }))
              };
              this.log('info', `Enhanced PR: ${prEnhancement.enhanced}/${prEnhancement.issues.length}`);
            }
          } catch (error) {
            this.log('warn', 'Location enhancement failed, continuing without', error);
          }
        })();
        enhancementPromises.push(locationPromise);
      }
      
      // Educational research promise (START EARLY - don't wait for comparison)
      if (request.includeEducation && this.educatorAgent) {
        const educationPromise = (async () => {
          try {
            this.log('info', 'Starting educational research on unique issues');
            
            // Combine ALL issues from both branches
            const allIssues = [
              ...(request.mainBranchAnalysis?.issues || []),
              ...(request.featureBranchAnalysis?.issues || [])
            ];
            
            // Deduplicate for education - we only need unique patterns
            const uniqueIssues = this.deduplicateIssuesForEducation(allIssues);
            
            if (uniqueIssues.length > 0 && this.educatorAgent?.research) {
              educationalResearch = await this.educatorAgent.research({
                issues: uniqueIssues,
                developerLevel: skillData.userProfile?.level?.current || 'beginner',
                teamProfile: await this.skillProvider.getTeamSkills(
                  request.teamId || '00000000-0000-0000-0000-000000000000'
                )
              });
              this.log('info', `Educational research completed for ${uniqueIssues.length} unique issue patterns (from ${allIssues.length} total)`);
            }
          } catch (error) {
            this.log('warn', 'Educational research failed', error);
          }
        })();
        enhancementPromises.push(educationPromise);
      }
      
      // Wait for all enhancements to complete
      if (enhancementPromises.length > 0) {
        await Promise.all(enhancementPromises);
        this.log('info', 'All enhancements completed');
      }

      // Step 6: Execute comparison with enhanced data
      const comparisonResult = await this.comparisonAgent.analyze({
        mainBranchAnalysis: this.ensureCompatibleAnalysisResult(enhancedMainAnalysis),
        featureBranchAnalysis: this.ensureCompatibleAnalysisResult(enhancedFeatureAnalysis),
        prMetadata: request.prMetadata,
        userProfile: skillData.userProfile ? this.convertToSkillProfile(skillData.userProfile) : undefined,
        teamProfiles: skillData.teamProfiles?.map(tp => this.convertToSkillProfile(tp)) || [],
        historicalIssues: request.historicalIssues,
        generateReport: false,  // Don't generate report yet
        scanDuration: deepWikiScanDuration || ((Date.now() - startTime) / 1000)  // Use DeepWiki scan time if available
      } as any);

      // Calculate scan duration - use DeepWiki scan time if provided, otherwise calculate from orchestrator start
      const finalScanDuration = deepWikiScanDuration || ((Date.now() - startTime) / 1000);
      
      // Step 7: Enhance comparison data with metadata
      const comparisonData = comparisonResult.comparison || comparisonResult;
      const enhancedComparisonData = {
        ...comparisonData,
        prMetadata: request.prMetadata,
        scanDuration: finalScanDuration,
        aiAnalysis: {
          ...(comparisonData as any).aiAnalysis,
          // Check if modelId already includes provider prefix
          modelUsed: config.modelPreferences.primary.modelId.includes('/') 
            ? config.modelPreferences.primary.modelId
            : `${config.modelPreferences.primary.provider}/${config.modelPreferences.primary.modelId}`
        }
      };
      
      // Step 8: Generate final report with all enhancements
      const finalReport = await (this.comparisonAgent.generateFinalReport ? 
        this.comparisonAgent.generateFinalReport({
          comparison: enhancedComparisonData as any,
          educationalContent: educationalResearch,
          prMetadata: request.prMetadata,
          includeEducation: request.includeEducation !== false
        }) : 
        Promise.resolve({
          report: await this.comparisonAgent.generateReport(enhancedComparisonData as any),
          prComment: this.comparisonAgent.generatePRComment(enhancedComparisonData as any)
        }));
      
      // Step 9: Process results
      const processedResult = {
        ...this.processAnalysisResult(comparisonResult),
        markdownReport: finalReport.report,
        prComment: finalReport.prComment,
        educationalInsights: educationalResearch,
        scanDuration: finalScanDuration
      };

      // Step 9: Update skill scores
      await this.updateSkills(processedResult, request);

      // Step 9: Store complete analysis report
      await this.storeAnalysisReport(processedResult, request, config, educationalResearch);

      // Step 10: Return complete results
      return {
        success: true,
        report: processedResult.markdownReport,         // Full markdown report
        prComment: processedResult.prComment,           // Concise PR comment
        analysis: processedResult.analysis || processedResult, // Raw analysis data
        education: educationalResearch || undefined,    // Real course links
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
    
    try {
      // Get current developer skills first
      const currentSkills = await this.skillProvider.getUserSkills(request.prMetadata.author);
      
      // Extract skill tracking data from analysis result
      const skillTracking = analysisResult.skillTracking || {};
      
      // If no skill tracking data, skip update
      if (!skillTracking.newScore && !skillTracking.adjustments) {
        this.log('info', 'No skill updates found in analysis result');
        return;
      }
      
      // Create skill update with proper previous score
      const updates: SkillUpdate[] = [{
        userId: request.prMetadata.author,
        prId: request.prMetadata.id || 'unknown',
        timestamp: new Date(),
        previousScore: currentSkills.overallScore, // Use actual current score
        newScore: skillTracking.newScore || currentSkills.overallScore,
        adjustments: skillTracking.adjustments || [],
        categoryChanges: skillTracking.categoryChanges || {}
      }];
      
      // Update skills in database
      await this.skillProvider.updateSkills(updates);
      
      this.log('info', 'Skills updated successfully', {
        userId: request.prMetadata.author,
        previousScore: currentSkills.overallScore,
        newScore: skillTracking.newScore,
        change: (skillTracking.newScore || currentSkills.overallScore) - currentSkills.overallScore
      });
      
    } catch (error) {
      this.log('error', 'Failed to update skills', error);
      // Don't throw - skill update failure shouldn't fail the analysis
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
  private async analyzeRepositoryContext(request: ComparisonAnalysisRequest): Promise<RepositoryContext> {
    const mainIssues = request.mainBranchAnalysis.issues || [];
    const featureIssues = request.featureBranchAnalysis.issues || [];
    const allIssues = [...mainIssues, ...featureIssues];
    
    const criticalCount = allIssues.filter(i => i.severity === 'critical').length;
    const highCount = allIssues.filter(i => i.severity === 'high').length;
    const securityIssues = allIssues.filter(i => i.category === 'security').length;
    const performanceIssues = allIssues.filter(i => i.category === 'performance').length;
    
    const filesAnalyzed = request.mainBranchAnalysis.metadata?.files_analyzed || 0;
    
    // Use LanguageRouter for sophisticated language detection
    let detectedLanguages: LanguageDetectionResult | undefined;
    if (request.repository) {
      try {
        // Try to detect from repository path if available
        detectedLanguages = await this.languageRouter.detectFromRepository(request.repository);
        this.language = detectedLanguages.primary;
        
        // Log detected languages for debugging
        if (this.logger) {
          this.logger.info('Detected languages:', {
            primary: detectedLanguages.primary,
            all: detectedLanguages.languages.map(l => `${l.name} (${l.percentage}%)`).join(', ')
          });
        }
      } catch (error) {
        // Fallback to request language or default
        this.language = request.language || 'typescript';
      }
    } else {
      // Fallback to request language or default
      this.language = request.language || 'typescript';
    }
    
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
      language: this.language,
      sizeCategory: request.sizeCategory || 'medium',
      complexity,
      issueCount: allIssues.length,
      criticalIssueCount: criticalCount,
      filesAnalyzed,
      hasSecurityIssues: securityIssues > 0,
      hasPerformanceIssues: performanceIssues > 0,
      fileTypes: this.analyzeFileTypes(allIssues),
      // Add detected languages info for enhanced context
      detectedLanguages: detectedLanguages?.languages
    };
  }

  /**
   * Calculate dynamic weights based on repository context
   */
  private calculateDynamicWeights(context: RepositoryContext): CategoryWeights {
    const weights: CategoryWeights = {
      security: 0.25,
      performance: 0.25,
      codeQuality: 0.25,
      architecture: 0.15,
      dependencies: 0.10
    };
    
    // Adjust based on size
    if (context.sizeCategory === 'large') {
      weights.architecture += 0.1;
      weights.dependencies += 0.05;
      weights.codeQuality -= 0.1;
      weights.performance -= 0.05;
    } else if (context.sizeCategory === 'small') {
      weights.codeQuality += 0.1;
      weights.performance += 0.05;  
      weights.architecture -= 0.1;
      weights.dependencies -= 0.05;
    }
    
    // Adjust based on critical issues
    if (context.criticalIssueCount > 0) {
      weights.security += 0.1;
      weights.codeQuality += 0.05;
      weights.performance -= 0.1;
      weights.dependencies -= 0.05;
    }
    
    // Normalize
    const sum = Object.values(weights).reduce((a, b) => a + b, 0);
    Object.keys(weights).forEach(key => {
      weights[key as keyof CategoryWeights] /= sum;
    });
    
    return weights;
  }

  /**
   * Ensure DeepWikiAnalysisResult has required properties for AIComparisonAgent
   */
  private ensureCompatibleAnalysisResult(analysis: any): any {
    if (!analysis) return { issues: [], recommendations: [], scores: null };
    
    // Log what we're receiving
    this.log('info', 'Ensuring compatible analysis result', {
      hasIssues: !!analysis.issues,
      issueCount: analysis.issues?.length || 0,
      hasRecommendations: !!analysis.recommendations,
      hasScores: !!analysis.scores,
      analysisKeys: Object.keys(analysis || {})
    });
    
    return {
      ...analysis,
      issues: analysis.issues || [],  // Ensure issues are preserved
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
        security: developerSkills.categoryScores?.security || 50,
        performance: developerSkills.categoryScores?.performance || 50,
        codeQuality: developerSkills.categoryScores?.codeQuality || 50,
        architecture: developerSkills.categoryScores?.architecture || 50,
        testing: developerSkills.categoryScores?.testing || 50,
        debugging: 50
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
    // The new ComparisonAgent returns a ComparisonResult
    if (analysisResult.success) {
      return {
        markdownReport: analysisResult.report,
        prComment: analysisResult.prComment,
        analysis: analysisResult.comparison,
        educationalInsights: [],
        skillTracking: analysisResult.skillTracking,
        overallScore: this.calculateOverallScore(analysisResult.comparison),
        duration: 0,
        issues: analysisResult.comparison?.newIssues || []
      };
    }
    
    // Fallback for other formats
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
    // Use the language detected by LanguageRouter or fallback to request language
    const lang = (this.language || request.language || '').toLowerCase();
    
    // Use LanguageRouter's language configuration for better mapping
    const languageConfig = this.languageRouter.getLanguageConfig(lang);
    
    if (languageConfig) {
      // Map based on language tier and type
      switch (lang) {
        case 'python':
          return 'python-backend';
        case 'javascript':
        case 'typescript':
          return 'node-fullstack';
        case 'java':
        case 'kotlin':
        case 'scala':
          return 'java-enterprise';
        case 'csharp':
        case 'fsharp':
          return 'dotnet-enterprise';
        case 'go':
          return 'go-backend';
        case 'rust':
          return 'rust-systems';
        case 'ruby':
          return 'ruby-backend';
        case 'php':
          return 'php-web';
        case 'swift':
        case 'objectivec':
          return 'ios-mobile';
        case 'cpp':
        case 'c':
          return 'cpp-systems';
        default:
          // Use tier to determine type
          if (languageConfig.tier === 1) {
            return 'production-ready';
          } else if (languageConfig.tier === 2) {
            return 'well-supported';
          } else {
            return 'general';
          }
      }
    }
    
    // Fallback to simple detection
    if (lang.includes('python')) return 'python-backend';
    if (lang.includes('javascript') || lang.includes('typescript')) return 'node-fullstack';
    if (lang.includes('java')) return 'java-enterprise';
    return 'general';
  }

  /**
   * Get available tools for the detected language and category
   */
  public getToolsForLanguage(language?: string, category?: 'security' | 'quality' | 'dependencies' | 'performance'): string[] {
    const lang = language || this.language || 'typescript';
    const config = this.languageRouter.getLanguageConfig(lang);
    
    if (!config) {
      // Fallback to basic tools
      return ['semgrep', 'jscpd', 'cloc'];
    }
    
    if (category) {
      // Return tools for specific category
      const categoryTools = config.tools[category];
      if (Array.isArray(categoryTools)) {
        return categoryTools;
      }
      return [];
    }
    
    // Return all tools for the language
    const allTools = new Set<string>();
    Object.values(config.tools).forEach(tools => {
      if (Array.isArray(tools)) {
        tools.forEach(tool => allTools.add(tool));
      }
    });
    
    return Array.from(allTools);
  }
  
  /**
   * Get the specialized agent name for the detected language
   */
  public getSpecializedAgent(): string {
    const lang = this.language || 'typescript';
    const config = this.languageRouter.getLanguageConfig(lang);
    return config?.agent || 'GeneralAgent';
  }
  
  /**
   * Check if all required tools are available for a language
   */
  public async checkToolAvailability(language?: string): Promise<{ available: string[], missing: string[] }> {
    const lang = language || this.language || 'typescript';
    const tools = this.getToolsForLanguage(lang);
    
    const available: string[] = [];
    const missing: string[] = [];
    
    for (const tool of tools) {
      const isAvailable = await this.languageRouter.isToolAvailable(tool);
      if (isAvailable) {
        available.push(tool);
      } else {
        missing.push(tool);
      }
    }
    
    return { available, missing };
  }

  
  /**
   * Initialize specialized agents with language-specific tool configurations
   * This is called after language detection to configure each role-based agent
   */
  public async initializeSpecializedAgents(
    language: string,
    agents: {
      security?: any,
      performance?: any,
      dependency?: any,
      codeQuality?: any
    }
  ): Promise<void> {
    const languageConfig = this.languageRouter.getLanguageConfig(language);
    
    if (!languageConfig) {
      this.log('warn', `No language configuration found for ${language}, using defaults`);
      return;
    }
    
    // Configure Security Agent
    if (agents.security && typeof agents.security.configureForLanguage === 'function') {
      const securityTools = languageConfig.tools.security || ['semgrep'];
      agents.security.configureForLanguage(language, securityTools);
      this.log('info', `Configured SecurityAgent for ${language} with tools: ${securityTools.join(', ')}`);
    }
    
    // Configure Performance Agent
    if (agents.performance && typeof agents.performance.configureForLanguage === 'function') {
      const performanceTools = languageConfig.tools.performance || [];
      agents.performance.configureForLanguage(language, performanceTools);
      this.log('info', `Configured PerformanceAgent for ${language} with tools: ${performanceTools.join(', ')}`);
    }
    
    // Configure Dependency Agent
    if (agents.dependency && typeof agents.dependency.configureForLanguage === 'function') {
      const dependencyTools = languageConfig.tools.dependencies || [];
      agents.dependency.configureForLanguage(language, dependencyTools);
      this.log('info', `Configured DependencyAgent for ${language} with tools: ${dependencyTools.join(', ')}`);
    }
    
    // Configure Code Quality Agent
    if (agents.codeQuality && typeof agents.codeQuality.configureForLanguage === 'function') {
      const qualityTools = languageConfig.tools.quality || [];
      agents.codeQuality.configureForLanguage(language, qualityTools);
      this.log('info', `Configured CodeQualityAgent for ${language} with tools: ${qualityTools.join(', ')}`);
    }
  }
  
  /**
   * Get recommended model for a specific language
   * Different models may perform better with different languages
   */
  public getRecommendedModelForLanguage(language: string): string {
    const modelMapping: Record<string, string> = {
      'objectivec': 'claude-3-opus',  // Better for Apple ecosystem
      'swift': 'claude-3-opus',
      'python': 'claude-3-sonnet',
      'javascript': 'claude-3-sonnet',
      'typescript': 'claude-3-sonnet',
      'java': 'claude-3-opus',  // Better for enterprise patterns
      'csharp': 'claude-3-opus',
      'go': 'claude-3-sonnet',
      'rust': 'claude-3-opus',  // Better for systems programming
      'cpp': 'claude-3-opus',
      'c': 'claude-3-opus',
      'ruby': 'claude-3-sonnet',
      'php': 'claude-3-sonnet'
    };
    
    return modelMapping[language] || 'claude-3-sonnet';
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
    // Generate a UUID v4 for the report ID
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
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

  private calculateOverallScore(comparison: any): number {
    if (!comparison) return 75;
    
    // Calculate based on issues
    const newCritical = comparison.newIssues?.filter((i: any) => i.severity === 'critical').length || 0;
    const newHigh = comparison.newIssues?.filter((i: any) => i.severity === 'high').length || 0;
    const resolved = comparison.resolvedIssues?.length || 0;
    
    let score = 85; // Base score
    score -= newCritical * 10;
    score -= newHigh * 5;
    score += Math.min(resolved * 2, 10); // Bonus for fixes
    
    return Math.max(0, Math.min(100, score));
  }

  /**
   * Deduplicate issues for educational content
   * We only need unique issue patterns for education, not every occurrence
   */
  private deduplicateIssuesForEducation(issues: any[]): any[] {
    const uniqueMap = new Map<string, any>();
    
    for (const issue of issues) {
      // Create a fingerprint based on category, severity, and general pattern
      // Don't include file/line as those are instance-specific
      const fingerprint = [
        issue.category || 'unknown',
        issue.severity || 'unknown',
        // Extract the core issue type from title/description
        this.extractIssuePattern(issue)
      ].join(':');
      
      // Keep the first occurrence of each unique pattern
      if (!uniqueMap.has(fingerprint)) {
        uniqueMap.set(fingerprint, issue);
      }
    }
    
    return Array.from(uniqueMap.values());
  }

  /**
   * Extract the core pattern from an issue for deduplication
   */
  private extractIssuePattern(issue: any): string {
    const title = (issue.title || issue.message || '').toLowerCase();
    
    // Common patterns to identify
    if (title.includes('sql injection')) return 'sql-injection';
    if (title.includes('xss') || title.includes('cross-site')) return 'xss';
    if (title.includes('hardcoded') || title.includes('secret')) return 'hardcoded-secret';
    if (title.includes('validation')) return 'missing-validation';
    if (title.includes('csrf')) return 'csrf';
    if (title.includes('authentication')) return 'auth-issue';
    if (title.includes('authorization')) return 'authz-issue';
    if (title.includes('encryption')) return 'encryption-issue';
    if (title.includes('injection')) return 'injection';
    if (title.includes('buffer') || title.includes('overflow')) return 'buffer-overflow';
    if (title.includes('path traversal')) return 'path-traversal';
    if (title.includes('race condition')) return 'race-condition';
    if (title.includes('memory leak')) return 'memory-leak';
    if (title.includes('null') || title.includes('undefined')) return 'null-reference';
    
    // Fallback to title if no pattern matches
    return title.substring(0, 50); // Use first 50 chars as pattern
  }

  /**
   * Check if configuration is stale (older than 90 days)
   */
  private isConfigStale(config: AnalysisConfig): boolean {
    const lastUpdated = config.updatedAt || config.createdAt;
    if (!lastUpdated) return true;
    
    const ageInDays = this.getConfigAgeInDays(config);
    return ageInDays > 90;
  }
  
  /**
   * Get configuration age as human-readable string
   */
  private getConfigAge(config: AnalysisConfig): string {
    const days = this.getConfigAgeInDays(config);
    
    if (days === 0) return 'today';
    if (days === 1) return '1 day';
    if (days < 30) return `${days} days`;
    if (days < 60) return '1 month';
    if (days < 90) return '2 months';
    return `${Math.floor(days / 30)} months`;
  }
  
  /**
   * Get configuration age in days
   */
  private getConfigAgeInDays(config: AnalysisConfig): number {
    const lastUpdated = config.updatedAt || config.createdAt;
    if (!lastUpdated) return 999; // Very old
    
    const date = lastUpdated instanceof Date ? lastUpdated : new Date(lastUpdated);
    const ageMs = Date.now() - date.getTime();
    return Math.floor(ageMs / (1000 * 60 * 60 * 24));
  }
  
  /**
   * Map size category to repository size
   */
  private mapSizeToCategory(size: string): 'small' | 'medium' | 'large' | 'enterprise' {
    const mapping: Record<string, 'small' | 'medium' | 'large' | 'enterprise'> = {
      'small': 'small',
      'medium': 'medium',
      'large': 'large',
      'very-large': 'enterprise',
      'enterprise': 'enterprise'
    };
    return mapping[size] || 'medium';
  }
  
  /**
   * Alert monitoring system about missing configuration
   */
  private alertConfigMissing(context: RepositoryContext): void {
    // In production, this would send to monitoring service
    this.log('error', 'ALERT: Configuration missing', {
      repoType: context.repoType,
      language: context.language,
      severity: 'high',
      action: 'using_default_config'
    });
    
    // TODO: Send to monitoring service
    // this.monitoringService.alert('config_missing', { context });
  }
  
  /**
   * Alert monitoring system about stale configuration
   */
  private alertStaleConfig(config: AnalysisConfig, age: string): void {
    // In production, this would send to monitoring service
    this.log('warn', 'ALERT: Configuration stale', {
      configId: config.id,
      age,
      lastUpdated: config.updatedAt || config.createdAt,
      severity: 'medium',
      action: 'using_stale_config'
    });
    
    // TODO: Send to monitoring service
    // this.monitoringService.alert('config_stale', { config, age });
  }

  private log(level: string, message: string, data?: any) {
    if (this.logger) {
      this.logger[level](message, data);
    } else {
      const msg = `[ComparisonOrchestrator] ${message}`;
      switch (level) {
        case 'debug': console.debug(msg, data || ''); break; // eslint-disable-line no-console
        case 'info': console.info(msg, data || ''); break; // eslint-disable-line no-console
        case 'warn': console.warn(msg, data || ''); break; // eslint-disable-line no-console
        case 'error': console.error(msg, data || ''); break; // eslint-disable-line no-console
        default: console.log(msg, data || ''); break; // eslint-disable-line no-console
      }
    }
  }
}