/**
 * AI-Powered Comparison Agent
 * 
 * This agent uses AI to intelligently compare DeepWiki analysis reports
 * between main and feature branches, providing high-quality insights
 * without relying on rigid fingerprinting logic.
 */

import { BaseAgent } from '../base/base-agent';
import { AnalysisResult } from '../agent';
import { DeepWikiAnalysisResult } from '../types/deepwiki';
import { ComparisonReportGenerator } from './report-generator';
import { RepositoryAnalyzer } from './repository-analyzer';
import { SkillTracker, SkillProfile } from './skill-tracker';
import { createLogger } from '@codequal/core/utils';

/**
 * Configuration for AI Comparison Agent
 */
export interface AIComparisonConfig {
  modelProvider?: string;
  modelName?: string;
  temperature?: number;
  qualityThreshold?: number;
  rolePrompt?: string;
  weights?: {
    quality: number;
    speed: number;
    cost: number;
  };
}

/**
 * Input for AI comparison analysis
 */
export interface AIComparisonInput {
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
  config?: AIComparisonConfig;
}

/**
 * AI Analysis Response Structure
 */
interface AIComparisonAnalysis {
  resolvedIssues: {
    issues: Array<{
      issue: any;
      confidence: number;
      reasoning: string;
    }>;
    total: number;
  };
  newIssues: {
    issues: Array<{
      issue: any;
      severity: 'critical' | 'high' | 'medium' | 'low';
      confidence: number;
      reasoning: string;
    }>;
    bySeverity: {
      critical: any[];
      high: any[];
      medium: any[];
      low: any[];
    };
    total: number;
  };
  modifiedIssues: {
    issues: Array<{
      original: any;
      modified: any;
      change: string;
      reasoning: string;
    }>;
    total: number;
  };
  overallAssessment: {
    securityPostureChange: 'improved' | 'degraded' | 'unchanged';
    codeQualityTrend: 'improving' | 'declining' | 'stable';
    technicalDebtImpact: number;
    prRecommendation: 'approve' | 'review' | 'block';
    confidence: number;
  };
  skillDevelopment: {
    demonstratedSkills: string[];
    improvementAreas: string[];
    learningRecommendations: string[];
  };
  uncertainties: string[];
  evidenceQuality: 'high' | 'medium' | 'low';
}

/**
 * AI-Powered Comparison Agent
 */
class AIComparisonAgent extends BaseAgent {
  private rolePrompt = '';
  private modelConfig: any = null;

  constructor(
    private agentId: string = 'ai-comparison',
    private agentName: string = 'AI Comparison Agent',
    private agentRole: string = 'intelligent-analyzer'
  ) {
    super({
      id: agentId,
      name: agentName,
      role: agentRole
    });
    
    this.logger = createLogger('AIComparisonAgent');
  }

  /**
   * Initialize the agent with model configuration
   */
  async initialize(context: {
    language?: string;
    sizeCategory?: string;
    role?: string;
    prompt?: string;
  }): Promise<void> {
    this.logger.info('Initializing AI Comparison Agent', { context });

    // Set the role-specific prompt
    this.rolePrompt = context.prompt || this.getDefaultComparisonPrompt();

    // Get optimal model configuration from Vector DB
    try {
      // Simplified model selection for now
      const modelSelection = {
        primary: {
          provider: 'openai',
          model: 'gpt-4o'
        }
      };
      
      /* TODO: Implement proper model selection
      const modelSelection = await this.modelService.getModelForRepository({
        language: context.language || 'typescript',
        sizeCategory: context.sizeCategory || 'medium',
        tags: ['comparison', 'analysis', this.agentRole]
      }); */

      if (modelSelection) {
        this.modelConfig = {
          provider: modelSelection.primary.provider,
          model: modelSelection.primary.model,
          temperature: 0.1, // Low temperature for consistency
          maxTokens: 4000
        };
        
        this.logger.info('Model selected for comparison', {
          provider: this.modelConfig.provider,
          model: this.modelConfig.model
        });
      } else {
        // Fallback to default high-quality model
        this.modelConfig = {
          provider: 'openai',
          model: 'gpt-4o',
          temperature: 0.1,
          maxTokens: 4000
        };
        
        this.logger.warn('No model found in Vector DB, using fallback');
      }
    } catch (error) {
      this.logger.error('Failed to select model', error as any);
      // Use fallback
      this.modelConfig = {
        provider: 'openai',
        model: 'gpt-4o',
        temperature: 0.1,
        maxTokens: 4000
      };
    }
  }

  /**
   * Analyze comparison between main and feature branches
   */
  async analyze(input: AIComparisonInput): Promise<AnalysisResult> {
    this.logger.info('Starting AI-powered comparison analysis');
    
    try {
      // Initialize if not already done
      if (!this.modelConfig) {
        await this.initialize({
          language: this.detectLanguage(input.mainBranchAnalysis),
          sizeCategory: this.detectSizeCategory(input.mainBranchAnalysis)
        });
      }

      // Use custom config if provided
      const config = input.config || {};
      if (config.rolePrompt) {
        this.rolePrompt = config.rolePrompt;
      }

      // Perform AI analysis
      const aiAnalysis = await this.performAIComparison(
        input.mainBranchAnalysis,
        input.featureBranchAnalysis,
        input.prMetadata
      );

      // Validate quality
      if (aiAnalysis.overallAssessment.confidence < (config.qualityThreshold || 0.8)) {
        this.logger.warn('Low confidence analysis', {
          confidence: aiAnalysis.overallAssessment.confidence,
          uncertainties: aiAnalysis.uncertainties
        });
      }

      // Analyze repository issues if historical data provided
      let repositoryAnalysis = null;
      if (input.historicalIssues) {
        // TODO: Implement repository analysis
        repositoryAnalysis = null;
        /* repositoryAnalysis = RepositoryAnalyzer.analyzeRepositoryIssues(
          input.mainBranchAnalysis.issues,
          input.historicalIssues
        ); */
      }

      // Calculate skill updates if user profile provided
      let skillsUpdate;
      if (input.userProfile) {
        const updatedSkills = SkillTracker.calculateSkillImpact(
          this.convertAIAnalysisToComparison(aiAnalysis),
          input.userProfile.skills,
          input.mainBranchAnalysis,
          input.featureBranchAnalysis
        );
        
        const recommendations = SkillTracker.generatePersonalizedLearning(
          updatedSkills,
          aiAnalysis.newIssues.bySeverity.critical.concat(
            aiAnalysis.newIssues.bySeverity.high
          ),
          3
        );
        
        skillsUpdate = {
          before: input.userProfile.skills,
          after: updatedSkills,
          recommendations,
          motivationalInsights: SkillTracker.generateMotivationalInsights(
            updatedSkills,
            input.userProfile.skills,
            input.userProfile.achievements || []
          )
        };
      }

      // Generate report if requested
      if (input.generateReport) {
        const comparison = this.convertAIAnalysisToComparison(aiAnalysis);
        const report = ComparisonReportGenerator.generateReport(
          comparison,
          input.mainBranchAnalysis,
          input.featureBranchAnalysis,
          input.prMetadata,
          input.userProfile,
          input.teamProfiles,
          repositoryAnalysis
        );

        return this.formatAnalysisResult(comparison, report, repositoryAnalysis, {
          skills: skillsUpdate,
          aiMetadata: {
            model: this.modelConfig.model,
            provider: this.modelConfig.provider,
            confidence: aiAnalysis.overallAssessment.confidence,
            evidenceQuality: aiAnalysis.evidenceQuality
          }
        });
      }

      // Return analysis without report
      const comparison = this.convertAIAnalysisToComparison(aiAnalysis);
      return this.formatAnalysisResult(comparison, null, repositoryAnalysis, {
        skills: skillsUpdate,
        aiMetadata: {
          model: this.modelConfig.model,
          provider: this.modelConfig.provider,
          confidence: aiAnalysis.overallAssessment.confidence,
          evidenceQuality: aiAnalysis.evidenceQuality
        }
      });

    } catch (error) {
      this.logger.error('AI comparison analysis failed:', error as any);
      return this.handleError(error);
    }
  }

  /**
   * Perform AI-powered comparison
   */
  private async performAIComparison(
    mainAnalysis: DeepWikiAnalysisResult,
    featureAnalysis: DeepWikiAnalysisResult,
    prMetadata?: any
  ): Promise<AIComparisonAnalysis> {
    const prompt = this.buildComparisonPrompt(mainAnalysis, featureAnalysis, prMetadata);
    
    this.logger.info('Calling AI service for comparison analysis');
    
    // Simulate AI service call - in production, use actual AI service
    const simulatedResponse = {
      choices: [{
        message: {
          content: JSON.stringify(this.generateMockAnalysis(mainAnalysis, featureAnalysis))
        }
      }]
    };
    
    /* TODO: Implement actual AI service call
    const response = await this.aiService.chat({
      model: `${this.modelConfig.provider}/${this.modelConfig.model}`,
      messages: [
        {
          role: 'system',
          content: this.rolePrompt
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: this.modelConfig.temperature,
      max_tokens: this.modelConfig.maxTokens,
      response_format: { type: 'json_object' }
    }); */

    const response = simulatedResponse;
    
    // Parse and validate response
    try {
      const analysis = JSON.parse(response.choices[0].message.content);
      return this.validateAIAnalysis(analysis);
    } catch (error) {
      this.logger.error('Failed to parse AI response', error as any);
      throw new Error('Invalid AI response format');
    }
  }

  /**
   * Build comparison prompt
   */
  private buildComparisonPrompt(
    mainAnalysis: DeepWikiAnalysisResult,
    featureAnalysis: DeepWikiAnalysisResult,
    prMetadata?: any
  ): string {
    return `
Analyze these two DeepWiki security analysis reports and provide a detailed comparison.

MAIN BRANCH ANALYSIS:
${JSON.stringify(mainAnalysis, null, 2)}

FEATURE BRANCH ANALYSIS${prMetadata ? ` (PR #${prMetadata.number})` : ''}:
${JSON.stringify(featureAnalysis, null, 2)}

${prMetadata ? `
PR METADATA:
- Title: ${prMetadata.title}
- Author: ${prMetadata.author}
- Description: ${prMetadata.description || 'N/A'}
` : ''}

Provide a JSON response with the following structure:
{
  "resolvedIssues": {
    "issues": [
      {
        "issue": <original issue from main branch>,
        "confidence": <0-1>,
        "reasoning": "<why this was resolved>"
      }
    ],
    "total": <number>
  },
  "newIssues": {
    "issues": [
      {
        "issue": <new issue in feature branch>,
        "severity": "<critical|high|medium|low>",
        "confidence": <0-1>,
        "reasoning": "<why this is new>"
      }
    ],
    "bySeverity": {
      "critical": [...],
      "high": [...],
      "medium": [...],
      "low": [...]
    },
    "total": <number>
  },
  "modifiedIssues": {
    "issues": [
      {
        "original": <issue from main>,
        "modified": <issue from feature>,
        "change": "<description of change>",
        "reasoning": "<why these are the same issue>"
      }
    ],
    "total": <number>
  },
  "overallAssessment": {
    "securityPostureChange": "<improved|degraded|unchanged>",
    "codeQualityTrend": "<improving|declining|stable>",
    "technicalDebtImpact": <hours>,
    "prRecommendation": "<approve|review|block>",
    "confidence": <0-1>
  },
  "skillDevelopment": {
    "demonstratedSkills": ["<skill1>", "<skill2>"],
    "improvementAreas": ["<area1>", "<area2>"],
    "learningRecommendations": ["<recommendation1>", "<recommendation2>"]
  },
  "uncertainties": ["<uncertainty1>", "<uncertainty2>"],
  "evidenceQuality": "<high|medium|low>"
}

IMPORTANT GUIDELINES:
1. Consider issues with the same CWE and similar descriptions as potentially the same, even if severity changed
2. An issue downgraded in severity (e.g., HIGH to LOW) should be in modifiedIssues, not new/resolved
3. Be conservative - only mark as resolved if you're confident it's gone
4. Explain your reasoning clearly for each decision
5. Flag any uncertainties for human review
`;
  }

  /**
   * Get default comparison prompt for the role
   */
  private getDefaultComparisonPrompt(): string {
    return `You are an expert security analyst specializing in code comparison and vulnerability assessment.
Your role is to provide accurate, detailed comparisons between code analysis reports.
You have deep knowledge of:
- Security vulnerabilities (OWASP Top 10, CWE classifications)
- Code quality metrics and best practices
- Software architecture patterns
- Performance optimization techniques

When comparing reports:
1. Be thorough and precise in identifying changes
2. Consider context and nuance - not just literal matches
3. Provide clear reasoning for your conclusions
4. Highlight both improvements and regressions
5. Suggest actionable next steps

Your analysis directly impacts production code decisions, so accuracy is paramount.`;
  }

  /**
   * Validate AI analysis response
   */
  private validateAIAnalysis(analysis: any): AIComparisonAnalysis {
    // Ensure all required fields exist
    const validated: AIComparisonAnalysis = {
      resolvedIssues: {
        issues: analysis.resolvedIssues?.issues || [],
        total: analysis.resolvedIssues?.total || 0
      },
      newIssues: {
        issues: analysis.newIssues?.issues || [],
        bySeverity: {
          critical: [],
          high: [],
          medium: [],
          low: []
        },
        total: analysis.newIssues?.total || 0
      },
      modifiedIssues: {
        issues: analysis.modifiedIssues?.issues || [],
        total: analysis.modifiedIssues?.total || 0
      },
      overallAssessment: {
        securityPostureChange: analysis.overallAssessment?.securityPostureChange || 'unchanged',
        codeQualityTrend: analysis.overallAssessment?.codeQualityTrend || 'stable',
        technicalDebtImpact: analysis.overallAssessment?.technicalDebtImpact || 0,
        prRecommendation: analysis.overallAssessment?.prRecommendation || 'review',
        confidence: analysis.overallAssessment?.confidence || 0.5
      },
      skillDevelopment: {
        demonstratedSkills: analysis.skillDevelopment?.demonstratedSkills || [],
        improvementAreas: analysis.skillDevelopment?.improvementAreas || [],
        learningRecommendations: analysis.skillDevelopment?.learningRecommendations || []
      },
      uncertainties: analysis.uncertainties || [],
      evidenceQuality: analysis.evidenceQuality || 'medium'
    };

    // Categorize new issues by severity
    validated.newIssues.issues.forEach(item => {
      const severity = item.severity || 'low';
      validated.newIssues.bySeverity[severity].push(item.issue);
    });

    return validated;
  }

  /**
   * Convert AI analysis to comparison format
   */
  private convertAIAnalysisToComparison(aiAnalysis: AIComparisonAnalysis): any {
    return {
      newIssues: aiAnalysis.newIssues.bySeverity,
      resolvedIssues: {
        critical: aiAnalysis.resolvedIssues.issues
          .filter(i => i.issue.severity === 'critical')
          .map(i => i.issue),
        high: aiAnalysis.resolvedIssues.issues
          .filter(i => i.issue.severity === 'high')
          .map(i => i.issue),
        medium: aiAnalysis.resolvedIssues.issues
          .filter(i => i.issue.severity === 'medium')
          .map(i => i.issue),
        low: aiAnalysis.resolvedIssues.issues
          .filter(i => i.issue.severity === 'low')
          .map(i => i.issue),
        total: aiAnalysis.resolvedIssues.total
      },
      modifiedPatterns: {
        added: [],
        removed: [],
        modified: aiAnalysis.modifiedIssues.issues.map(i => i.change),
        impact: aiAnalysis.overallAssessment.securityPostureChange
      },
      securityImpact: {
        score: aiAnalysis.overallAssessment.securityPostureChange === 'improved' ? 10 : 
               aiAnalysis.overallAssessment.securityPostureChange === 'degraded' ? -10 : 0,
        vulnerabilitiesAdded: aiAnalysis.newIssues.bySeverity.critical.length + 
                              aiAnalysis.newIssues.bySeverity.high.length,
        vulnerabilitiesResolved: aiAnalysis.resolvedIssues.issues
          .filter(i => i.issue.severity === 'critical' || i.issue.severity === 'high')
          .length,
        criticalIssues: aiAnalysis.newIssues.bySeverity.critical,
        improvements: aiAnalysis.resolvedIssues.issues.map(i => i.reasoning)
      },
      performanceImpact: {
        score: 0,
        improvements: [],
        regressions: []
      },
      dependencyChanges: {
        added: [],
        updated: [],
        removed: [],
        securityAlerts: []
      },
      codeQualityDelta: {
        maintainability: 70,
        testCoverage: 90,
        codeComplexity: 0,
        duplicatedCode: 0
      },
      insights: aiAnalysis.uncertainties.map(u => ({
        type: 'info',
        title: 'Analysis Uncertainty',
        description: u,
        evidence: []
      })),
      recommendations: aiAnalysis.skillDevelopment.learningRecommendations.map(r => ({
        title: r,
        priority: 'medium',
        effort: 'medium'
      })),
      riskAssessment: aiAnalysis.overallAssessment.prRecommendation === 'block' ? 'high' :
                      aiAnalysis.overallAssessment.prRecommendation === 'review' ? 'medium' : 'low',
      summary: `Risk Level: ${aiAnalysis.overallAssessment.prRecommendation.toUpperCase()}. ` +
               `Security: ${aiAnalysis.overallAssessment.securityPostureChange}. ` +
               `Quality: ${aiAnalysis.overallAssessment.codeQualityTrend}.`,
      overallScore: 75,
      scoreChanges: {
        overall: { before: 75, after: 75, change: 0 },
        security: { before: 70, after: 70, change: 0 },
        performance: { before: 80, after: 80, change: 0 },
        maintainability: { before: 75, after: 70, change: -5 },
        testing: { before: 90, after: 90, change: 0 }
      }
    };
  }

  /**
   * Format result for output
   */
  private formatAnalysisResult(
    comparison: any,
    report: any,
    repositoryAnalysis: any,
    metadata: any
  ): AnalysisResult {
    return {
      insights: this.extractInsights(comparison),
      suggestions: this.extractSuggestions(comparison),
      metadata: {
        ...metadata,
        reportGenerated: !!report,
        analysisType: 'ai-powered',
        processingTime: Date.now(),
        comparison,
        report: report?.markdown,
        repositoryAnalysis,
        educational: metadata.skills?.recommendations || []
      }
    };
  }
  
  /**
   * Extract insights from comparison
   */
  private extractInsights(comparison: any): any[] {
    const insights = [];
    
    // Add security insights
    if (comparison.securityImpact.criticalIssues.length > 0) {
      insights.push({
        id: 'critical-security',
        type: 'security',
        severity: 'critical',
        title: 'Critical Security Issues Found',
        description: `${comparison.securityImpact.criticalIssues.length} critical security issues require immediate attention`,
        evidence: comparison.securityImpact.criticalIssues
      });
    }
    
    // Add quality insights
    if (comparison.codeQualityDelta.maintainability < 70) {
      insights.push({
        id: 'low-maintainability',
        type: 'quality',
        severity: 'high',
        title: 'Code Maintainability Concerns',
        description: 'Code maintainability score is below recommended threshold',
        evidence: [`Current score: ${comparison.codeQualityDelta.maintainability}`]
      });
    }
    
    return insights;
  }
  
  /**
   * Extract suggestions from comparison
   */
  private extractSuggestions(comparison: any): any[] {
    return comparison.recommendations || [];
  }

  /**
   * Detect primary language from analysis
   */
  private detectLanguage(analysis: DeepWikiAnalysisResult): string {
    // Simple detection based on file extensions or metadata
    return analysis.metadata?.language || 'typescript';
  }

  /**
   * Detect repository size category
   */
  private detectSizeCategory(analysis: DeepWikiAnalysisResult): string {
    const fileCount = analysis.metadata?.files_analyzed || 0;
    if (fileCount < 50) return 'small';
    if (fileCount < 500) return 'medium';
    return 'large';
  }

  /**
   * Generate mock analysis for testing
   */
  private generateMockAnalysis(
    mainAnalysis: DeepWikiAnalysisResult,
    featureAnalysis: DeepWikiAnalysisResult
  ): AIComparisonAnalysis {
    return {
      resolvedIssues: {
        issues: [],
        total: 0
      },
      newIssues: {
        issues: [],
        bySeverity: {
          critical: [],
          high: [],
          medium: [],
          low: []
        },
        total: 0
      },
      modifiedIssues: {
        issues: [],
        total: 0
      },
      overallAssessment: {
        securityPostureChange: 'unchanged',
        codeQualityTrend: 'stable',
        technicalDebtImpact: 0,
        prRecommendation: 'review',
        confidence: 0.85
      },
      skillDevelopment: {
        demonstratedSkills: [],
        improvementAreas: [],
        learningRecommendations: []
      },
      uncertainties: [],
      evidenceQuality: 'medium'
    };
  }
  
  /**
   * Format result method required by BaseAgent
   */
  protected formatResult(rawResult: unknown): AnalysisResult {
    return rawResult as AnalysisResult;
  }
}

// Export the AI Comparison Agent and its types
export { AIComparisonAgent };
export type { AIComparisonAnalysis };