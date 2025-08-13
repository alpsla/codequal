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
// Removed import for archived ReportGeneratorV7Complete
import { ReportGeneratorV7EnhancedComplete } from './report-generator-v7-enhanced-complete';
import { SkillCalculator } from './skill-calculator';
import { ILogger } from '../services/interfaces/logger.interface';
import { EnhancedIssueMatcher, IssueDuplicator } from '../services/issue-matcher-enhanced';
import { DynamicModelSelector, RoleRequirements } from '../services/dynamic-model-selector';

/**
 * Clean implementation of AI-powered comparison agent
 */
export class ComparisonAgent implements IReportingComparisonAgent {
  private config: ComparisonConfig;
  private modelConfig: any;
  // Removed unused reportGenerator field
  private reportGeneratorEnhanced: ReportGeneratorV7EnhancedComplete;
  private skillCalculator: SkillCalculator;
  private modelSelector: DynamicModelSelector;
  
  constructor(
    private logger?: ILogger,
    private modelService?: any, // Deprecated - using DynamicModelSelector
    private skillProvider?: any  // BUG-012 FIX: Accept skill provider for persistence
  ) {
    // Pass skill provider and authorization flag to report generator
    // BUG-019 FIX: Pass true to indicate authorized caller
    this.reportGeneratorEnhanced = new ReportGeneratorV7EnhancedComplete(
      skillProvider,
      true  // Authorized caller flag
    );
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
    
    // Use provided model config if available
    if ((config as any).modelConfig) {
      this.modelConfig = {
        provider: (config as any).modelConfig.provider,
        model: (config as any).modelConfig.model,
        temperature: 0.1, // Low for consistency
        maxTokens: 4000
      };
      this.log('info', 'Using provided model config', this.modelConfig);
    }
    // BUG-021 FIX: Use DynamicModelSelector for proper model selection
    else {
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
        // Use a real fallback model instead of 'dynamic/dynamic'
        this.modelConfig = {
          provider: 'google',
          model: 'gemini-2.0-flash',  // Use latest stable Gemini model as fallback
          temperature: 0.1,
          maxTokens: 4000
        };
      }
    }
  }

  /**
   * Perform comparison analysis
   */
  async analyze(input: ComparisonInput): Promise<ComparisonResult> {
    this.log('info', 'Starting comparison analysis');
    
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
      const comparison = this.convertAIAnalysisToComparison(aiAnalysis);

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
          prMetadata: input.prMetadata,
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
      
    } catch (error) {
      this.log('error', 'Comparison analysis failed', error);
      throw error;
    }
  }

  /**
   * Generate markdown report from comparison
   */
  async generateReport(comparison: ComparisonResult): Promise<string> {
    // Use the fixed report generator instead of the template-based one
    // It expects the comparison result directly
    
    console.log('ComparisonAgent - Using V7 Fixed report generator with:', {
      hasPrMetadata: !!(comparison as any).prMetadata,
      prMetadata: (comparison as any).prMetadata,
      scanDuration: (comparison as any).scanDuration,
      newIssuesCount: comparison.newIssues?.length || 0,
      resolvedIssuesCount: comparison.resolvedIssues?.length || 0
    });
    
    return this.reportGeneratorEnhanced.generateReport(comparison);
  }

  /**
   * Generate PR comment from comparison
   */
  generatePRComment(comparison: ComparisonResult): string {
    // Use the fixed report generator for PR comments too
    return this.reportGeneratorEnhanced.generatePRComment(comparison);
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
   */
  private convertAIAnalysisToComparison(
    aiAnalysis: AIComparisonAnalysis
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
        recommendation: (ci.issue as any).recommendation || (ci.issue as any).suggestion || (ci.issue as any).remediation
      }));
    };
    
    return {
      resolvedIssues: extractIssues(aiAnalysis.resolvedIssues.issues),
      newIssues: extractIssues(aiAnalysis.newIssues.issues),
      modifiedIssues: aiAnalysis.modifiedIssues.issues.map(mi => (mi as any).issue || mi),
      unchangedIssues: extractIssues(aiAnalysis.unchangedIssues.issues),
      summary: {
        totalResolved: aiAnalysis.resolvedIssues.total,
        totalNew: aiAnalysis.newIssues.total,
        totalModified: aiAnalysis.modifiedIssues.total,
        totalUnchanged: aiAnalysis.unchangedIssues.total,
        overallAssessment: aiAnalysis.overallAssessment
      },
      insights: this.generateInsights(aiAnalysis),
      recommendations: this.generateRecommendations(aiAnalysis)
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
    
    this.log('info', 'Mock analysis results', {
      resolved: resolved.length,
      new: newIssues.length,
      unchanged: unchanged.length
    });
    
    return {
      resolvedIssues: {
        issues: resolved.map(issue => ({
          issue,
          severity: issue.severity || 'medium',
          confidence: 0.85,
          reasoning: 'Issue appears to be fixed in the feature branch'
        })),
        total: resolved.length
      },
      newIssues: {
        issues: newIssues.map(issue => ({
          issue,
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
          issue,
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
      provider: 'google',
      model: 'gemini-2.0-flash',  // Use latest stable Gemini model as fallback
      temperature: 0.1,
      maxTokens: 4000
    };
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