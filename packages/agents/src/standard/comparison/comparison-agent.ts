/**
 * AI-Powered Comparison Agent - Clean Architecture Implementation
 * 
 * This agent intelligently compares analysis results between main and feature branches,
 * providing insights, skill tracking, and report generation capabilities.
 */

import {
  IReportingComparisonAgent,
  AIComparisonAnalysis,
  ComparisonIssue
} from './interfaces/comparison-agent.interface';
import {
  ComparisonResult,
  ComparisonInput,
  ComparisonConfig,
  AnalysisResult,
  Issue,
  PRMetadata
} from '../types/analysis-types';
// Report generator - V8 only (V7 has been removed)
import { ReportGeneratorV8Final } from './report-generator-v8-final';
import { SkillCalculator } from './skill-calculator';
import { ILogger } from '../services/interfaces/logger.interface';
import { EnhancedIssueMatcher, IssueDuplicator } from '../services/issue-matcher-enhanced';
import { DynamicModelSelector, RoleRequirements } from '../services/dynamic-model-selector';
import { getDynamicModelConfig, trackDynamicAgentCall } from '../monitoring';
import type { AgentRole } from '../monitoring/services/dynamic-agent-cost-tracker.service';

/**
 * Clean implementation of AI-powered comparison agent
 */
export class ComparisonAgent implements IReportingComparisonAgent {
  private config: ComparisonConfig;
  private modelConfig: any;
  private modelConfigId = '';
  private primaryModel = '';
  private fallbackModel = '';
  // Report generator - V8 only
  private reportGeneratorV8: ReportGeneratorV8Final;
  private useV8Generator = true; // Always use V8
  private skillCalculator: SkillCalculator;
  private modelSelector: DynamicModelSelector;
  
  constructor(
    private logger?: ILogger,
    private modelService?: any, // Deprecated - using DynamicModelSelector
    private skillProvider?: any,  // BUG-012 FIX: Accept skill provider for persistence
    private options?: { useV8Generator?: boolean; reportFormat?: 'html' | 'markdown' }
  ) {
    // Initialize V8 generator only
    // V7 has been removed - always use V8
    this.reportGeneratorV8 = new ReportGeneratorV8Final();
    
    // Use V8 if explicitly requested or if env var is set
    this.useV8Generator = options?.useV8Generator || 
                          process.env.USE_V8_REPORT_GENERATOR === 'true';
    
    this.skillCalculator = new SkillCalculator();
    this.config = this.getDefaultConfig();
    // BUG-021 FIX: Initialize DynamicModelSelector for proper model selection
    this.modelSelector = new DynamicModelSelector();
  }

  /**
   * Initialize the agent with configuration
   */
  async initialize(config: ComparisonConfig): Promise<void> {
    this.log('info', 'Initializing comparison agent', { config });
    
    this.config = { ...this.getDefaultConfig(), ...config };
    
    // First try to get config from Supabase for dynamic model selection
    try {
      const supabaseConfig = await getDynamicModelConfig(
        'comparator' as AgentRole,
        config.language,
        this.mapComplexityToSize(config.complexity)
      );
      
      if (supabaseConfig) {
        this.modelConfigId = supabaseConfig.id;
        this.primaryModel = supabaseConfig.primary_model;
        this.fallbackModel = supabaseConfig.fallback_model || '';
        
        this.modelConfig = {
          provider: 'openrouter',
          model: supabaseConfig.primary_model,
          temperature: 0.1,
          maxTokens: 4000
        };
        
        this.log('info', 'Using Supabase model config', {
          primary: this.primaryModel,
          fallback: this.fallbackModel,
          configId: this.modelConfigId
        });
      }
    } catch (error) {
      this.log('warn', 'Failed to get Supabase config', error);
    }
    
    // Use provided model config if available and no Supabase config
    if (!this.modelConfig && (config as any).modelConfig) {
      this.modelConfig = {
        provider: (config as any).modelConfig.provider,
        model: (config as any).modelConfig.model,
        temperature: 0.1, // Low for consistency
        maxTokens: 4000
      };
      this.primaryModel = this.modelConfig.model;
      this.log('info', 'Using provided model config', this.modelConfig);
    }
    // Only use DynamicModelSelector if no model config provided
    else if (!this.modelConfig && process.env.OPENROUTER_API_KEY) {
      try {
        // Determine repository size based on complexity
        const repoSizeMap: Record<string, 'small' | 'medium' | 'large' | 'enterprise'> = {
          'low': 'small',
          'medium': 'medium',
          'high': 'large',
          'very-high': 'enterprise'
        };
        
        const requirements: RoleRequirements = {
          role: 'comparison',
          description: 'Compare code analysis results between branches, identify issues and improvements',
          languages: config.language ? [config.language] : ['typescript'],
          repositorySize: repoSizeMap[config.complexity || 'medium'] || 'medium',
          weights: {
            quality: 0.7,  // High quality for accurate comparison
            speed: 0.2,    // Moderate speed requirement
            cost: 0.1      // Lower priority on cost
          },
          minContextWindow: 16000,  // Need enough context for comparisons
          requiresReasoning: true,
          requiresCodeAnalysis: true
        };
        
        const modelSelection = await this.modelSelector.selectModelsForRole(requirements);
        
        this.modelConfig = {
          provider: modelSelection.primary.provider,
          model: modelSelection.primary.model,
          temperature: 0.1, // Low for consistency
          maxTokens: 4000
        };
        
        this.log('info', 'Dynamic model selection completed', {
          selected: `${modelSelection.primary.provider}/${modelSelection.primary.model}`,
          fallback: `${modelSelection.fallback.provider}/${modelSelection.fallback.model}`,
          reasoning: modelSelection.reasoning
        });
      } catch (error) {
        this.log('warn', 'Dynamic model selection failed, using fallback', error);
        // Use a better fallback model - should ideally come from stored configs
        this.modelConfig = {
          provider: 'openai',
          model: 'gpt-4o',  // Use GPT-4o as fallback - more reliable than gemini
          temperature: 0.1,
          maxTokens: 4000
        };
      }
    } else {
      // No OpenRouter key and no model config provided - use default
      this.log('info', 'No OpenRouter API key, using default model config');
      this.modelConfig = {
        provider: 'openai',
        model: 'gpt-4o',
        temperature: 0.1,
        maxTokens: 4000
      };
    }
  }

  /**
   * Map complexity to repository size
   */
  private mapComplexityToSize(complexity?: string): 'small' | 'medium' | 'large' | 'enterprise' {
    const repoSizeMap: Record<string, 'small' | 'medium' | 'large' | 'enterprise'> = {
      'low': 'small',
      'medium': 'medium',
      'high': 'large',
      'very-high': 'enterprise'
    };
    return repoSizeMap[complexity || 'medium'] || 'medium';
  }

  /**
   * Perform comparison analysis
   */
  async analyze(input: ComparisonInput): Promise<ComparisonResult> {
    this.log('info', 'Starting comparison analysis');
    const startTime = Date.now();
    const success = true;
    let error: string | undefined;
    let inputTokens = 0;
    let outputTokens = 0;
    let isFallback = false;
    let retryCount = 0;
    
    try {
      // Ensure initialization
      if (!this.modelConfig) {
        await this.initialize(this.config);
      }

      // Perform AI-powered comparison
      const aiAnalysis = await this.performAIComparison(
        input.mainBranchAnalysis,
        input.featureBranchAnalysis,
        input.prMetadata
      );

      // Convert to standard comparison format
      const comparison = this.convertAIAnalysisToComparison(aiAnalysis, input.prMetadata);

      // Calculate skill impacts if profile provided
      let skillTracking;
      if (input.userProfile) {
        skillTracking = this.skillCalculator.calculateSkillImpact(
          comparison,
          input.userProfile,
          input.historicalIssues || []
        );
      }

      // Generate report if requested
      let markdownReport;
      if (input.generateReport !== false) {
        // BUG-045 FIX: Include test coverage from analysis results
        // Extract test coverage from the analysis results (DeepWiki JSON format)
        const featureTestCoverage = (input.featureBranchAnalysis as any).testCoverage?.overall || 
                                   (input.featureBranchAnalysis.metadata as any)?.testCoverage?.overall || 
                                   0;
        const mainTestCoverage = (input.mainBranchAnalysis as any).testCoverage?.overall || 
                                (input.mainBranchAnalysis.metadata as any)?.testCoverage?.overall || 
                                0;
        
        // Properly merge model information with existing data
        const reportData = {
          ...comparison,
          aiAnalysis: {
            ...(comparison as any).aiAnalysis,
            // Handle case where model already includes provider prefix
            modelUsed: this.modelConfig.model.includes('/') 
              ? this.modelConfig.model 
              : `${this.modelConfig.provider}/${this.modelConfig.model}`
          },
          skillTracking,
          prMetadata: {
            ...input.prMetadata,
            testCoverage: featureTestCoverage // Add test coverage from feature branch
          },
          mainMetadata: {
            testCoverage: mainTestCoverage // Add test coverage from main branch
          },
          scanDuration: (input as any).scanDuration
        };
        markdownReport = await this.generateReport(reportData as any);
      }

      // Generate PR comment
      const prComment = this.generatePRComment({
        ...comparison,
        aiAnalysis: {
          ...(comparison as any).aiAnalysis,
          // Handle case where model already includes provider prefix
          modelUsed: this.modelConfig.model.includes('/') 
            ? this.modelConfig.model 
            : `${this.modelConfig.provider}/${this.modelConfig.model}`
        },
        skillTracking,
        prMetadata: input.prMetadata,
        scanDuration: (input as any).scanDuration
      } as any);

      // Estimate token usage
      const inputSize = JSON.stringify(input).length;
      const outputSize = JSON.stringify({ comparison, report: markdownReport }).length;
      inputTokens = Math.round(inputSize / 4);
      outputTokens = Math.round(outputSize / 4);
      
      // Track successful analysis
      if (this.modelConfigId) {
        await trackDynamicAgentCall({
          agent: 'comparator' as AgentRole,
          operation: 'analyze',
          repository: input.prMetadata?.repository_url || 'unknown',
          prNumber: input.prMetadata?.number?.toString(),
          language: this.config.language,
          repositorySize: this.mapComplexityToSize(this.config.complexity),
          modelConfigId: this.modelConfigId,
          model: this.modelConfig.model,
          modelVersion: 'latest',
          isFallback,
          inputTokens,
          outputTokens,
          duration: Date.now() - startTime,
          success: true,
          retryCount
        });
      }
      
      return {
        success: true,
        comparison,
        report: markdownReport,
        prComment,
        skillTracking,
        metadata: {
          agentId: this.getMetadata().id,
          agentVersion: this.getMetadata().version,
          modelUsed: `${this.modelConfig.provider}/${this.modelConfig.model}`,
          confidence: aiAnalysis.overallAssessment.confidence,
          timestamp: new Date()
        }
      };
      
    } catch (primaryError: any) {
      error = primaryError.message;
      retryCount++;
      
      // Try fallback model if available
      if (this.fallbackModel && this.modelConfig) {
        try {
          this.log('warn', 'Primary model failed, trying fallback', { 
            primary: this.primaryModel, 
            fallback: this.fallbackModel 
          });
          
          // Switch to fallback model
          const originalModel = this.modelConfig.model;
          this.modelConfig.model = this.fallbackModel;
          isFallback = true;
          
          // Retry analysis with fallback
          const aiAnalysis = await this.performAIComparison(
            input.mainBranchAnalysis,
            input.featureBranchAnalysis,
            input.prMetadata
          );
          
          const comparison = this.convertAIAnalysisToComparison(aiAnalysis, input.prMetadata);
          
          // Track successful fallback
          const inputSize = JSON.stringify(input).length;
          const outputSize = JSON.stringify(comparison).length;
          inputTokens = Math.round(inputSize / 4);
          outputTokens = Math.round(outputSize / 4);
          
          if (this.modelConfigId) {
            await trackDynamicAgentCall({
              agent: 'comparator' as AgentRole,
              operation: 'analyze',
              repository: input.prMetadata?.repository_url || 'unknown',
              prNumber: input.prMetadata?.number?.toString(),
              language: this.config.language,
              repositorySize: this.mapComplexityToSize(this.config.complexity),
              modelConfigId: this.modelConfigId,
              model: this.fallbackModel,
              modelVersion: 'latest',
              isFallback: true,
              inputTokens,
              outputTokens,
              duration: Date.now() - startTime,
              success: true,
              retryCount
            });
          }
          
          // Restore original model
          this.modelConfig.model = originalModel;
          
          // Continue with report generation
          let markdownReport;
          if (input.generateReport !== false) {
            markdownReport = await this.generateReport(comparison as any);
          }
          
          return {
            success: true,
            comparison,
            report: markdownReport,
            metadata: {
              agentId: this.getMetadata().id,
              agentVersion: this.getMetadata().version,
              modelUsed: `${this.modelConfig.provider}/${this.fallbackModel}`,
              timestamp: new Date()
            }
          };
        } catch (fallbackError: any) {
          // Track failure
          if (this.modelConfigId) {
            await trackDynamicAgentCall({
              agent: 'comparator' as AgentRole,
              operation: 'analyze',
              repository: input.prMetadata?.repository_url || 'unknown',
              prNumber: input.prMetadata?.number?.toString(),
              language: this.config.language,
              repositorySize: this.mapComplexityToSize(this.config.complexity),
              modelConfigId: this.modelConfigId,
              model: this.fallbackModel,
              modelVersion: 'latest',
              isFallback: true,
              inputTokens,
              outputTokens: 0,
              duration: Date.now() - startTime,
              success: false,
              error: fallbackError.message,
              retryCount
            });
          }
          
          this.log('error', 'Both primary and fallback models failed', {
            primary: primaryError,
            fallback: fallbackError
          });
          throw fallbackError;
        }
      } else {
        // No fallback available, track failure
        if (this.modelConfigId) {
          await trackDynamicAgentCall({
            agent: 'comparator' as AgentRole,
            operation: 'analyze',
            repository: input.prMetadata?.repository_url || 'unknown',
            prNumber: input.prMetadata?.number?.toString(),
            language: this.config.language,
            repositorySize: this.mapComplexityToSize(this.config.complexity),
            modelConfigId: this.modelConfigId,
            model: this.primaryModel || this.modelConfig?.model || 'unknown',
            modelVersion: 'latest',
            isFallback: false,
            inputTokens,
            outputTokens: 0,
            duration: Date.now() - startTime,
            success: false,
            error,
            retryCount: 0
          });
        }
        
        this.log('error', 'Comparison analysis failed', primaryError);
        throw primaryError;
      }
    }
  }

  /**
   * Generate markdown report from comparison
   */
  async generateReport(comparison: ComparisonResult): Promise<string> {
    if (this.useV8Generator) {
      console.log('ComparisonAgent - Using V8 report generator (consolidated, no duplication):', {
        newIssuesCount: comparison.newIssues?.length || 0,
        resolvedIssuesCount: comparison.resolvedIssues?.length || 0,
        format: this.options?.reportFormat || 'markdown'
      });
      
      // V8 generator now accepts ComparisonResult directly
      return this.reportGeneratorV8.generateReport(comparison);
    } else {
      // V7 has been removed - always use V8
      console.warn('V7 generator requested but has been removed. Using V8 instead.');
      return this.reportGeneratorV8.generateReport(comparison);
    }
  }

  /**
   * Generate PR comment from comparison
   */
  generatePRComment(comparison: ComparisonResult): string {
    // Always use V8 (V7 has been removed)
    return this.extractPRCommentFromV8(comparison);
  }
  
  /**
   * Extract PR comment from V8 format
   */
  private extractPRCommentFromV8(comparison: ComparisonResult): string {
    const score = this.calculateScore(comparison);
    const decision = score >= 70 ? '✅ Approved' : '⚠️ Needs Work';
    const newIssuesCount = comparison.newIssues?.length || 0;
    const resolvedCount = comparison.resolvedIssues?.length || 0;
    
    let comment = `## CodeQual Analysis: ${decision}\n\n`;
    comment += `**Score:** ${score}/100\n`;
    comment += `**New Issues:** ${newIssuesCount} | **Resolved:** ${resolvedCount}\n\n`;
    
    if (newIssuesCount > 0) {
      comment += '### Top Issues to Address:\n';
      (comparison.newIssues || []).slice(0, 3).forEach((issue: any) => {
        const location = issue.location?.file && issue.location?.line ? 
          `${issue.location.file}:${issue.location.line}` : 'Unknown location';
        comment += `- ${issue.message} (${location})\n`;
      });
    }
    
    return comment;
  }

  /**
   * Generate final report with all enhancements including educational content
   */
  async generateFinalReport(params: {
    comparison: ComparisonResult;
    educationalContent?: any;
    prMetadata?: any;
    includeEducation?: boolean;
  }): Promise<{ report: string; prComment: string }> {
    this.log('info', 'Generating final report with enhancements', {
      hasEducation: !!params.educationalContent,
      includeEducation: params.includeEducation
    });

    // Merge educational content into the comparison result if provided
    const enhancedComparison = {
      ...params.comparison,
      educationalInsights: params.educationalContent,
      prMetadata: params.prMetadata
    };

    // Generate both report and PR comment
    const report = await this.generateReport(enhancedComparison);
    const prComment = this.generatePRComment(enhancedComparison);

    return {
      report,
      prComment
    };
  }

  /**
   * Get agent metadata
   */
  getMetadata() {
    return {
      id: 'comparison-agent',
      name: 'AI Comparison Agent',
      version: '2.0.0',
      capabilities: [
        'ai-powered-analysis',
        'skill-tracking',
        'report-generation',
        'pr-recommendations'
      ]
    };
  }

  /**
   * Perform AI-powered comparison using LLM
   */
  private async performAIComparison(
    mainAnalysis: AnalysisResult,
    featureAnalysis: AnalysisResult,
    prMetadata?: PRMetadata
  ): Promise<AIComparisonAnalysis> {
    const prompt = this.buildComparisonPrompt(
      mainAnalysis,
      featureAnalysis,
      prMetadata
    );

    // TODO: Implement actual LLM call
    // For now, return mock analysis
    return this.mockAIAnalysis(mainAnalysis, featureAnalysis);
  }

  /**
   * Build prompt for AI comparison
   */
  private buildComparisonPrompt(
    mainAnalysis: AnalysisResult,
    featureAnalysis: AnalysisResult,
    prMetadata?: PRMetadata
  ): string {
    return `You are an expert code reviewer analyzing a pull request.

${this.config.rolePrompt || 'Focus on security, performance, and code quality.'}

MAIN BRANCH ANALYSIS:
- Issues: ${mainAnalysis.issues.length}
- Critical: ${mainAnalysis.issues.filter(i => i.severity === 'critical').length}
- High: ${mainAnalysis.issues.filter(i => i.severity === 'high').length}

FEATURE BRANCH ANALYSIS:
- Issues: ${featureAnalysis.issues.length}
- Critical: ${featureAnalysis.issues.filter(i => i.severity === 'critical').length}
- High: ${featureAnalysis.issues.filter(i => i.severity === 'high').length}

${prMetadata ? `PR: ${prMetadata.title} by ${prMetadata.author}` : ''}

Compare these analyses and identify:
1. Resolved issues (fixed in feature branch)
2. New issues (introduced in feature branch)
3. Modified issues (changed between branches)
4. Overall security and quality assessment
5. Skill development indicators

Provide confidence scores and reasoning for each finding.`;
  }

  /**
   * Convert AI analysis to standard comparison format
   * 
   * CRITICAL DATA FLOW DOCUMENTATION
   * =================================
   * This method converts AI analysis results into the standard comparison format.
   * 
   * Issue Categories:
   * - resolvedIssues: Issues that were in main branch but NOT in PR branch (fixed)
   * - newIssues: Issues that are in PR branch but NOT in main branch (introduced)
   * - unchangedIssues: Issues that exist in BOTH branches (pre-existing)
   * - modifiedIssues: Issues that changed severity/details between branches
   * 
   * IMPORTANT: unchangedIssues represent pre-existing repository issues
   * that should be displayed in reports but are NOT blocking for PR approval
   */
  private convertAIAnalysisToComparison(
    aiAnalysis: AIComparisonAnalysis,
    prMetadata?: PRMetadata
  ): ComparisonResult {
    // Extract the actual issues from ComparisonIssue wrappers
    const extractIssues = (comparisonIssues: ComparisonIssue[]) => {
      return comparisonIssues.map(ci => ({
        ...ci.issue,
        severity: ci.severity,
        confidence: ci.confidence,
        analysisReasoning: ci.reasoning,
        // Preserve DeepWiki suggestion/remediation/codeSnippet fields
        codeSnippet: (ci.issue as any).codeSnippet,
        suggestion: (ci.issue as any).suggestion,
        remediation: (ci.issue as any).remediation,
        recommendation: (ci.issue as any).recommendation || (ci.issue as any).suggestion || (ci.issue as any).remediation,
        // Preserve location data from JSON format
        file: (ci.issue as any).file,
        line: (ci.issue as any).line,
        column: (ci.issue as any).column,
        location: ci.issue.location || ((ci.issue as any).file ? {
          file: (ci.issue as any).file,
          line: (ci.issue as any).line,
          column: (ci.issue as any).column
        } : undefined)
      }));
    };
    
    // Deduplicate issues based on similar descriptions and locations
    const deduplicateIssues = (issues: any[]) => {
      const seen = new Map<string, any>();
      
      for (const issue of issues) {
        // Create a key based on the issue's essential properties
        const locationKey = issue.location ? 
          `${issue.location.file || 'unknown'}:${issue.location.line || 0}` : 
          'no-location';
        
        // Normalize the description for comparison
        const normalizedDesc = (issue.description || issue.message || issue.title || '')
          .toLowerCase()
          .replace(/\s+/g, ' ')
          .trim();
        
        // Check for similar issues
        let isDuplicate = false;
        for (const [key, existing] of seen.entries()) {
          const existingDesc = (existing.description || existing.message || existing.title || '')
            .toLowerCase()
            .replace(/\s+/g, ' ')
            .trim();
          
          // Consider it a duplicate if same location and line
          if (key === locationKey && locationKey !== 'no-location') {
            // Prefer the issue with more details
            if ((issue.description?.length || 0) > (existing.description?.length || 0)) {
              seen.set(key, issue);
            }
            isDuplicate = true;
            break;
          }
          
          // Check for semantic duplicates
          const commonPatterns = [
            'prototype pollution',
            'type safety',
            'error handling',
            'input validation',
            'missing validation',
            'code smell',
            'magic number',
            'object mutation',
            'type assertion'
          ];
          
          for (const pattern of commonPatterns) {
            if (normalizedDesc.includes(pattern) && existingDesc.includes(pattern)) {
              // Keep the more detailed issue
              if ((issue.description?.length || 0) > (existing.description?.length || 0)) {
                seen.set(`${pattern}-${seen.size}`, issue);
              }
              isDuplicate = true;
              break;
            }
          }
        }
        
        if (!isDuplicate) {
          seen.set(`${locationKey}-${seen.size}`, issue);
        }
      }
      
      return Array.from(seen.values());
    };
    
    return {
      resolvedIssues: deduplicateIssues(extractIssues(aiAnalysis.resolvedIssues.issues)),
      newIssues: deduplicateIssues(extractIssues(aiAnalysis.newIssues.issues)),
      modifiedIssues: aiAnalysis.modifiedIssues.issues.map(mi => (mi as any).issue || mi),
      unchangedIssues: deduplicateIssues(extractIssues(aiAnalysis.unchangedIssues.issues)), // Pre-existing issues
      summary: {
        totalResolved: aiAnalysis.resolvedIssues.total,
        totalNew: aiAnalysis.newIssues.total,
        totalModified: aiAnalysis.modifiedIssues.total,
        totalUnchanged: aiAnalysis.unchangedIssues.total, // Count of pre-existing issues
        overallAssessment: aiAnalysis.overallAssessment
      },
      insights: this.generateInsights(aiAnalysis),
      recommendations: this.generateRecommendations(aiAnalysis),
      prMetadata: prMetadata // Include PR metadata in the result
    } as any; // TODO: Update ComparisonResult type
  }

  /**
   * Generate insights from AI analysis
   */
  private generateInsights(analysis: AIComparisonAnalysis): string[] {
    const insights = [];
    
    if (analysis.resolvedIssues.total > 0) {
      insights.push(`✅ Resolved ${analysis.resolvedIssues.total} issues from main branch`);
    }
    
    if (analysis.newIssues.bySeverity.critical.length > 0) {
      insights.push(`⚠️ Introduced ${analysis.newIssues.bySeverity.critical.length} critical issues`);
    }
    
    if (analysis.overallAssessment.securityPostureChange === 'improved') {
      insights.push('🔒 Security posture has improved');
    }
    
    if (analysis.skillDevelopment.demonstratedSkills.length > 0) {
      insights.push(`💡 Demonstrated skills: ${analysis.skillDevelopment.demonstratedSkills.join(', ')}`);
    }
    
    return insights;
  }

  /**
   * Generate recommendations from AI analysis
   */
  private generateRecommendations(analysis: AIComparisonAnalysis): string[] {
    const recommendations = [];
    
    if (analysis.newIssues.bySeverity.critical.length > 0) {
      recommendations.push('Fix critical issues before merging');
    }
    
    if (analysis.skillDevelopment.improvementAreas.length > 0) {
      recommendations.push(`Focus on improving: ${analysis.skillDevelopment.improvementAreas[0]}`);
    }
    
    if (analysis.overallAssessment.technicalDebtImpact > 0.2) {
      recommendations.push('Consider refactoring to reduce technical debt');
    }
    
    return recommendations;
  }

  /**
   * Mock AI analysis for development
   */
  private mockAIAnalysis(
    mainAnalysis: AnalysisResult,
    featureAnalysis: AnalysisResult
  ): AIComparisonAnalysis {
    // Log what we're analyzing
    this.log('info', 'Performing mock AI analysis', {
      mainIssues: mainAnalysis.issues?.length || 0,
      featureIssues: featureAnalysis.issues?.length || 0,
      mainScores: mainAnalysis.scores,
      featureScores: featureAnalysis.scores
    });
    
    // For now, treat all issues from feature branch as the current state
    // Since DeepWiki analyzes each branch independently, we can't do true diff comparison
    // Instead, we'll use the feature branch issues as the source of truth
    const featureIssues = featureAnalysis.issues || [];
    const mainIssues = mainAnalysis.issues || [];
    
    // Create a fingerprint for each issue to match similar issues
    // Use file, line (if available), and category for precise matching
    const createFingerprint = (issue: Issue) => {
      // Normalize the file path to handle slight variations
      const file = (issue.location?.file || 'unknown').toLowerCase().replace(/\\/g, '/');
      const category = (issue.category || 'unknown').toLowerCase();
      // Include severity to distinguish between severity changes
      const severity = (issue.severity || 'unknown').toLowerCase();
      
      // If we have exact line numbers, use them for more precise matching
      // Allow small variations (±2 lines) for code that might have shifted
      if (issue.location?.line) {
        const lineRange = Math.floor(issue.location.line / 3) * 3; // Group by 3-line ranges
        return `${file}:${lineRange}-${category}-${severity}`;
      }
      
      // Fallback to file-level matching if no line number
      return `${file}-${category}-${severity}`;
    };
    
    // Use enhanced matcher for sophisticated issue matching
    const matcher = new EnhancedIssueMatcher();
    
    // IMPORTANT: Do NOT deduplicate - pass actual issue lists as requested by user
    // We want to report ALL occurrences of issues
    const actualMainIssues = mainIssues;
    const actualFeatureIssues = featureIssues;
    
    this.log('info', 'Using actual issue lists without deduplication', {
      main: { count: actualMainIssues.length },
      feature: { count: actualFeatureIssues.length },
      note: 'Preserving all issue occurrences for complete visibility'
    });
    
    // Use enhanced matching with multiple strategies
    const resolved: Issue[] = [];
    const newIssues: Issue[] = [];
    const unchanged: Issue[] = [];
    
    // Track which feature issues have been matched
    const matchedFeatureIndices = new Set<number>();
    
    // Find resolved and unchanged issues from main branch
    for (const mainIssue of actualMainIssues) {
      let bestMatch: { issue: Issue; index: number; result: any } | null = null;
      let bestConfidence = 0;
      
      actualFeatureIssues.forEach((featureIssue, index) => {
        if (matchedFeatureIndices.has(index)) return;
        
        const matchResult = matcher.matchIssues(mainIssue, featureIssue);
        if (matchResult.isMatch && matchResult.confidence > bestConfidence) {
          bestMatch = { issue: featureIssue, index, result: matchResult };
          bestConfidence = matchResult.confidence;
        }
      });
      
      if (bestMatch) {
        // Issue exists in both branches (unchanged)
        const matchData = bestMatch as { issue: Issue; index: number; result: any };
        unchanged.push({
          ...matchData.issue,
          _matchDetails: matchData.result.details,
          _matchConfidence: matchData.result.confidence
        } as any);
        matchedFeatureIndices.add(matchData.index);
        
        this.log('debug', `Matched issue: ${mainIssue.title}`, matchData.result);
      } else {
        // Issue only in main (resolved)
        resolved.push(mainIssue);
      }
    }
    
    // Find new issues (in feature but not matched)
    actualFeatureIssues.forEach((featureIssue, index) => {
      if (!matchedFeatureIndices.has(index)) {
        newIssues.push(featureIssue);
      }
    });
    
    this.log('info', 'Comparison analysis results', {
      resolved: resolved.length,
      new: newIssues.length,
      unchanged: unchanged.length
    });
    
    // Helper to preserve all issue properties including location data
    const preserveIssueData = (issue: Issue) => {
      // Ensure location data is preserved from JSON format
      const preservedIssue = {
        ...issue,
        // FIX: Ensure message field is always present (fixes undefined issue)
        message: issue.message || (issue as any).title || (issue as any).description || 'Unknown Issue',
        title: (issue as any).title || issue.message,
        // FIX: Don't just copy title as description - check if description is different
        description: ((issue as any).description && (issue as any).description !== (issue as any).title) 
          ? (issue as any).description 
          : issue.message || (issue as any).title,
        // Preserve code snippet from DeepWiki
        codeSnippet: (issue as any).codeSnippet || (issue as any).code,
        // If issue has direct file/line properties (JSON format), ensure they're preserved
        file: (issue as any).file || issue.location?.file,
        line: (issue as any).line || issue.location?.line,
        // Also preserve location object for compatibility
        location: issue.location || ((issue as any).file ? {
          file: (issue as any).file,
          line: (issue as any).line,
          column: (issue as any).column
        } : undefined)
      };
      return preservedIssue;
    };

    return {
      resolvedIssues: {
        issues: resolved.map(issue => ({
          issue: preserveIssueData(issue),
          severity: issue.severity || 'medium',
          confidence: 0.85,
          reasoning: 'Issue appears to be fixed in the feature branch'
        })),
        total: resolved.length
      },
      newIssues: {
        issues: newIssues.map(issue => ({
          issue: preserveIssueData(issue),
          severity: issue.severity || 'medium',
          confidence: 0.85,
          reasoning: 'New issue detected in feature branch'
        })),
        bySeverity: {
          critical: newIssues.filter((i: any) => i.severity === 'critical'),
          high: newIssues.filter((i: any) => i.severity === 'high'),
          medium: newIssues.filter((i: any) => i.severity === 'medium'),
          low: newIssues.filter((i: any) => i.severity === 'low')
        },
        total: newIssues.length
      },
      modifiedIssues: {
        issues: [],
        total: 0
      },
      unchangedIssues: {
        issues: unchanged.map(issue => ({
          issue: preserveIssueData(issue),
          severity: issue.severity || 'medium',
          confidence: 0.85,
          reasoning: 'Issue exists in both branches'
        })),
        total: unchanged.length
      },
      overallAssessment: {
        securityPostureChange: resolved.length > newIssues.length ? 'improved' : 
                               newIssues.length > resolved.length ? 'degraded' : 'unchanged',
        codeQualityTrend: (featureAnalysis.scores?.overall || 0) > (mainAnalysis.scores?.overall || 0) ? 'improving' :
                         (featureAnalysis.scores?.overall || 0) < (mainAnalysis.scores?.overall || 0) ? 'declining' : 'stable',
        technicalDebtImpact: (newIssues.length - resolved.length) * 0.1,
        prRecommendation: newIssues.some((i: any) => i.severity === 'critical') ? 'block' : 
                          newIssues.filter((i: any) => i.severity === 'high').length > 2 ? 'review' : 'approve',
        confidence: 0.85
      },
      skillDevelopment: {
        demonstratedSkills: resolved.length > 0 ? ['issue-resolution', 'code-quality'] : [],
        improvementAreas: newIssues.filter(i => i.severity === 'high' || i.severity === 'critical').length > 0 ?
                          ['security-awareness', 'quality-assurance'] : [],
        learningRecommendations: newIssues.length > 0 ? ['Review security best practices', 'Implement code review feedback'] : []
      },
      uncertainties: [],
      evidenceQuality: 'high'
    };
  }

  /**
   * Get default configuration
   */
  private getDefaultConfig(): ComparisonConfig {
    return {
      language: 'typescript',
      complexity: 'medium',
      performance: 'balanced',
      rolePrompt: 'You are an expert code reviewer focused on security, performance, and best practices.'
    };
  }

  /**
   * Get default model configuration
   */
  private getDefaultModelConfig() {
    // BUG-021 FIX: Return actual fallback model instead of 'dynamic/dynamic'
    return {
      provider: 'openai',
      model: 'gpt-4o',  // Use GPT-4o as fallback - more reliable
      temperature: 0.1,
      maxTokens: 4000
    };
  }

  /**
   * Adapt ComparisonResult to V8 AnalysisResult format
   */
  private adaptComparisonToV8Format(comparison: ComparisonResult): any {
    // Combine all issues and mark their status
    const allIssues = [
      ...(comparison.newIssues || []).map(i => ({ ...i, status: 'new' })),
      ...(comparison.resolvedIssues || []).map(i => ({ ...i, status: 'resolved' })),
      ...(comparison.unchangedIssues || []).map(i => ({ ...i, status: 'pre-existing' }))
    ];
    
    // Extract PR metadata if available
    const prMetadata = (comparison as any).prMetadata || {};
    
    return {
      prNumber: prMetadata.prNumber || 0,
      prTitle: prMetadata.prTitle || 'Code Analysis',
      repository: prMetadata.repository || '',
      branch: prMetadata.branch || '',
      score: (comparison as any).score || this.calculateScore(comparison),
      scoreChange: (comparison as any).scoreChange,
      prIssues: allIssues.filter(i => i.status === 'new'),
      repositoryIssues: allIssues.filter(i => i.status === 'pre-existing' || i.status === 'resolved'),
      breakingChanges: [],
      dependencies: [],
      timestamp: new Date().toISOString(),
      analysisId: (comparison as any).analysisId || 'v8-report'
    };
  }
  
  /**
   * Calculate score based on issues
   */
  private calculateScore(comparison: ComparisonResult): number {
    const newIssues = comparison.newIssues || [];
    const resolvedIssuesCount = comparison.resolvedIssues?.length || 0;
    const unchangedIssuesCount = comparison.unchangedIssues?.length || 0;
    
    // Start with base score
    let score = 100;
    
    // Balanced scoring per user specification:
    // - Critical: 5 points each
    // - High: 3 points each
    // - Medium: 1 point each
    // - Low: 0.5 points each
    
    const criticalCount = newIssues.filter(i => i.severity === 'critical').length;
    const highCount = newIssues.filter(i => i.severity === 'high').length;
    const mediumCount = newIssues.filter(i => i.severity === 'medium').length;
    const lowCount = newIssues.filter(i => i.severity === 'low').length;
    
    // Apply deductions
    score -= criticalCount * 5;
    score -= highCount * 3;
    score -= mediumCount * 1;
    score -= lowCount * 0.5;
    
    // Deduct small penalty for unchanged issues (technical debt)
    score -= Math.min(unchangedIssuesCount * 0.2, 5); // Small penalty, cap at 5 points
    
    // Add bonus for resolved issues (0.5 points each, max 10 points)
    score += Math.min(resolvedIssuesCount * 0.5, 10);
    
    // Ensure score is between 0 and 100
    return Math.max(0, Math.min(100, score));
  }

  /**
   * Log messages
   */
  private log(level: string, message: string, data?: any) {
    if (this.logger) {
      switch (level) {
        case 'debug': this.logger.debug(message, data); break;
        case 'info': this.logger.info(message, data); break;
        case 'warn': this.logger.warn(message, data); break;
        case 'error': this.logger.error(message, data); break;
        default: this.logger.info(message, data);
      }
    } else {
      const logFn = console[level as keyof Console] as (...args: any[]) => void; // eslint-disable-line no-console
      if (typeof logFn === 'function') {
        logFn(`[ComparisonAgent] ${message}`, data || '');
      } else {
        console.log(`[ComparisonAgent] ${message}`, data || ''); // eslint-disable-line no-console
      }
    }
  }
}