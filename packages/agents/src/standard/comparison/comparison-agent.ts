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
import { ReportGenerator } from './report-generator';
import { SkillCalculator } from './skill-calculator';
import { ILogger } from '../services/interfaces/logger.interface';

/**
 * Clean implementation of AI-powered comparison agent
 */
export class ComparisonAgent implements IReportingComparisonAgent {
  private config: ComparisonConfig;
  private modelConfig: any;
  private reportGenerator: ReportGenerator;
  private skillCalculator: SkillCalculator;
  
  constructor(
    private logger?: ILogger,
    private modelService?: any // TODO: Define IModelService interface
  ) {
    this.reportGenerator = new ReportGenerator();
    this.skillCalculator = new SkillCalculator();
    this.config = this.getDefaultConfig();
  }

  /**
   * Initialize the agent with configuration
   */
  async initialize(config: ComparisonConfig): Promise<void> {
    this.log('info', 'Initializing comparison agent', { config });
    
    this.config = { ...this.getDefaultConfig(), ...config };
    
    // Select optimal model for comparison
    if (this.modelService) {
      try {
        const modelSelection = await this.modelService.selectModel({
          task: 'comparison',
          language: config.language,
          complexity: config.complexity,
          performance: config.performance || 'balanced'
        });
        
        this.modelConfig = {
          provider: modelSelection.provider,
          model: modelSelection.model,
          temperature: 0.1, // Low for consistency
          maxTokens: 4000
        };
      } catch (error) {
        this.log('warn', 'Model selection failed, using default', error);
        this.modelConfig = this.getDefaultModelConfig();
      }
    } else {
      this.modelConfig = this.getDefaultModelConfig();
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
        markdownReport = await this.generateReport({
          ...comparison,
          skillTracking
        });
      }

      // Generate PR comment
      const prComment = this.generatePRComment({
        ...comparison,
        skillTracking
      });

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
    return this.reportGenerator.generateMarkdownReport(comparison);
  }

  /**
   * Generate PR comment from comparison
   */
  generatePRComment(comparison: ComparisonResult): string {
    return this.reportGenerator.generatePRComment(comparison);
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
    return {
      resolvedIssues: aiAnalysis.resolvedIssues.issues,
      newIssues: aiAnalysis.newIssues.issues,
      modifiedIssues: aiAnalysis.modifiedIssues.issues,
      unchangedIssues: [], // TODO: Calculate unchanged
      summary: {
        totalResolved: aiAnalysis.resolvedIssues.total,
        totalNew: aiAnalysis.newIssues.total,
        totalModified: aiAnalysis.modifiedIssues.total,
        totalUnchanged: 0,
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
    // Simple mock implementation
    const mainIssueIds = new Set(mainAnalysis.issues.map(i => i.id));
    const featureIssueIds = new Set(featureAnalysis.issues.map(i => i.id));
    
    const resolved = mainAnalysis.issues.filter(i => !featureIssueIds.has(i.id));
    const newIssues = featureAnalysis.issues.filter(i => !mainIssueIds.has(i.id));
    
    return {
      resolvedIssues: {
        issues: resolved.map(issue => ({
          issue,
          severity: issue.severity || 'medium',
          confidence: 0.9,
          reasoning: 'Issue not found in feature branch'
        })),
        total: resolved.length
      },
      newIssues: {
        issues: newIssues.map(issue => ({
          issue,
          severity: issue.severity || 'medium',
          confidence: 0.9,
          reasoning: 'Issue introduced in feature branch'
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
      overallAssessment: {
        securityPostureChange: resolved.length > newIssues.length ? 'improved' : 'degraded',
        codeQualityTrend: 'stable',
        technicalDebtImpact: 0.1,
        prRecommendation: newIssues.some((i: any) => i.severity === 'critical') ? 'block' : 'approve',
        confidence: 0.85
      },
      skillDevelopment: {
        demonstratedSkills: ['security-awareness', 'code-quality'],
        improvementAreas: ['performance-optimization'],
        learningRecommendations: ['Review OWASP guidelines']
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
    return {
      provider: 'openai',
      model: 'gpt-4o',
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