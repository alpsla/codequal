/**
 * Production Comparison Agent - Uses ReportGeneratorV8Final
 * 
 * This is the PRODUCTION VERSION that uses the fixed report generator
 * with all enhancements including:
 * - All 14 report sections
 * - Enhanced educational insights
 * - Code examples for critical/high issues
 * - Proper file:line:column locations
 * - Issue-based training recommendations
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
import { ReportGeneratorV8Final } from './report-generator-v8-final';
import { SkillCalculator } from './skill-calculator';
import { ILogger } from '../services/interfaces/logger.interface';
import { EnhancedIssueMatcher, IssueDuplicator } from '../services/issue-matcher-enhanced';
import { DynamicModelSelector, RoleRequirements } from '../services/dynamic-model-selector';
import { UnifiedLocationService, createUnifiedLocationService } from '../services/unified-location-service';

/**
 * Production implementation of comparison agent with V7 Fixed report generator
 */
export class ComparisonAgentProduction implements IReportingComparisonAgent {
  private config: ComparisonConfig;
  private modelConfig: any;
  private reportGenerator: ReportGeneratorV8Final;
  private skillCalculator: SkillCalculator;
  private modelSelector: DynamicModelSelector;
  private locationService: UnifiedLocationService;
  
  constructor(
    private logger?: ILogger,
    private modelService?: any,
    private skillProvider?: any
  ) {
    // Use the production V8 Final generator
    this.reportGenerator = new ReportGeneratorV8Final();
    this.skillCalculator = new SkillCalculator();
    this.config = this.getDefaultConfig();
    this.modelSelector = new DynamicModelSelector();
    
    // Initialize unified location service
    this.locationService = createUnifiedLocationService({
      enableAI: Boolean(modelService?.modelVersionSync),
      aiModel: 'gpt-4',
      cacheSize: 2000,
      contextLines: 5,
      enableMetrics: true,
      excludePatterns: [
        'node_modules',
        'dist',
        'build',
        '.git',
        'coverage',
        '__tests__',
        '*.test.ts',
        '*.spec.ts'
      ],
      preferredStrategies: ['exact', 'fuzzy', 'ai']
    });
    
    // Set AI service if available
    if (modelService?.modelVersionSync) {
      this.locationService.setAIService(modelService.modelVersionSync);
    }
  }

  /**
   * Initialize the agent with configuration
   */
  async initialize(config: ComparisonConfig): Promise<void> {
    this.config = { ...this.config, ...config };
    this.logInfo('Comparison Agent Production initialized with V7 Fixed');
  }

  /**
   * Get agent metadata
   */
  getMetadata(): {
    id: string;
    name: string;
    version: string;
    capabilities: string[];
  } {
    return {
      id: 'comparison-agent-production',
      name: 'Comparison Agent Production (V7 Fixed)',
      version: '7.0.0-fixed',
      capabilities: [
        'issue-comparison',
        'report-generation-v7-fixed',
        'pr-comment-generation',
        'skill-tracking',
        'educational-insights',
        'business-impact-analysis',
        'architecture-diagrams',
        'location-enhancement'
      ]
    };
  }

  /**
   * Main analysis method
   */
  async analyze(input: ComparisonInput): Promise<ComparisonResult> {
    const startTime = Date.now();
    
    try {
      this.logInfo('Starting comparison analysis with Production V7 Fixed...');
      
      // Prepare analysis data
      const mainBranchAnalysis = input.mainBranchAnalysis;
      const featureBranchAnalysis = input.featureBranchAnalysis;
      const prMetadata = input.prMetadata;
      
      // Enhance issues with unified location service
      if (process.env.ENABLE_AI_LOCATION !== 'false') {
        this.logInfo('Enhancing issue locations with unified service...');
        
        // Enhance main branch issues
        if (mainBranchAnalysis?.issues && mainBranchAnalysis.issues.length > 0) {
          const enhancedIssues = await Promise.all(
            mainBranchAnalysis.issues.map(async (issue) => {
              // Skip if already has good location
              if (issue.location?.file && issue.location?.line) {
                return issue;
              }
              
              const locationResult = await this.locationService.findLocation({
                message: issue.message || issue.title || '',
                description: issue.description,
                type: issue.type,
                category: issue.category,
                file: issue.location?.file,
                line: issue.location?.line
              });
              
              if (locationResult.confidence > 0.5) {
                issue.location = {
                  file: locationResult.file,
                  line: locationResult.line,
                  column: locationResult.column
                };
                // Add code snippet if available
                if (locationResult.codeSnippet) {
                  (issue as any).codeSnippet = locationResult.codeSnippet;
                }
              }
              
              return issue;
            })
          );
          
          const enhancedCount = enhancedIssues.filter(i => i.location?.line).length;
          this.logInfo(`Enhanced ${enhancedCount} main branch issue locations`);
          mainBranchAnalysis.issues = enhancedIssues;
        }
        
        // Enhance feature branch issues
        if (featureBranchAnalysis?.issues && featureBranchAnalysis.issues.length > 0) {
          const enhancedIssues = await Promise.all(
            featureBranchAnalysis.issues.map(async (issue) => {
              // Skip if already has good location
              if (issue.location?.file && issue.location?.line) {
                return issue;
              }
              
              const locationResult = await this.locationService.findLocation({
                message: issue.message || issue.title || '',
                description: issue.description,
                type: issue.type,
                category: issue.category,
                file: issue.location?.file,
                line: issue.location?.line
              });
              
              if (locationResult.confidence > 0.5) {
                issue.location = {
                  file: locationResult.file,
                  line: locationResult.line,
                  column: locationResult.column
                };
                // Add code snippet if available
                if (locationResult.codeSnippet) {
                  (issue as any).codeSnippet = locationResult.codeSnippet;
                }
              }
              
              return issue;
            })
          );
          
          const enhancedCount = enhancedIssues.filter(i => i.location?.line).length;
          this.logInfo(`Enhanced ${enhancedCount} feature branch issue locations`);
          featureBranchAnalysis.issues = enhancedIssues;
        }
      }
      
      // Get dynamic model selection based on context
      let selectedModel = 'gpt-4o'; // Default fallback
      if (this.modelSelector) {
        try {
          const roleReq: any = {
            role: 'comprehensive-analyzer',
            context: {
              language: this.config?.language || 'typescript',
              complexity: this.config?.complexity || 'medium',
              issueCount: featureBranchAnalysis.issues?.length || 0
            }
          };
          const modelSelection = await this.modelSelector.selectModelsForRole(roleReq);
          selectedModel = modelSelection?.primary?.model || 'gpt-4o';
          this.logInfo(`Dynamic model selected: ${selectedModel}`);
        } catch (error) {
          this.logInfo('Model selection failed, using default: gpt-4o');
        }
      }
      
      // Compare issues
      const comparison = await this.compareIssues(
        mainBranchAnalysis,
        featureBranchAnalysis
      );
      
      // Enhance comparison result issues if they still don't have locations
      if (process.env.ENABLE_AI_LOCATION !== 'false') {
        const enhanceComparisonIssues = async (issues: Issue[] | undefined) => {
          if (!issues || issues.length === 0) return issues;
          
          return Promise.all(
            issues.map(async (issue) => {
              // Skip if already has location
              if (issue.location?.file && issue.location?.line) {
                return issue;
              }
              
              const locationResult = await this.locationService.findLocation({
                message: issue.message || issue.title || '',
                description: issue.description,
                type: issue.type,
                category: issue.category,
                file: issue.location?.file,
                line: issue.location?.line
              });
              
              if (locationResult.confidence > 0.3) { // Lower threshold for comparison results
                issue.location = {
                  file: locationResult.file,
                  line: locationResult.line,
                  column: locationResult.column
                };
                // Add code snippet if available
                if (locationResult.codeSnippet) {
                  (issue as any).codeSnippet = locationResult.codeSnippet;
                }
              }
              
              return issue;
            })
          );
        };
        
        // Enhance all issue lists in parallel
        const [newIssues, resolvedIssues, unchangedIssues] = await Promise.all([
          enhanceComparisonIssues(comparison.newIssues),
          enhanceComparisonIssues(comparison.resolvedIssues),
          enhanceComparisonIssues(comparison.unchangedIssues)
        ]);
        
        comparison.newIssues = newIssues;
        comparison.resolvedIssues = resolvedIssues;
        comparison.unchangedIssues = unchangedIssues;
        
        // Log location service metrics
        const metrics = this.locationService.getMetrics();
        this.logInfo(`Location service metrics: ${JSON.stringify(metrics)}`);
      }
      
      // Calculate duration before report generation
      const duration = Date.now() - startTime;
      
      // Generate report if requested
      let report: string | undefined;
      let prComment: string | undefined;
      
      if (input.generateReport) {
        // Use V7 Fixed generator with duration and model
        report = await this.generateReportInternal(
          comparison,
          mainBranchAnalysis,
          featureBranchAnalysis,
          prMetadata,
          input,
          duration,
          selectedModel
        );
        
        // Generate PR comment
        prComment = this.generatePRCommentInternal(comparison, prMetadata);
      }
      
      // Calculate skill impacts including repository issues
      const skillTracking = prMetadata ? this.calculateSkillImpacts(
        comparison,
        prMetadata
      ) : undefined;
      
      // Generate educational content
      const education = this.generateEducationalContent(comparison);
      
      // Return ComparisonResult format
      return {
        success: true,
        report,
        prComment,
        comparison: {
          resolvedIssues: comparison.resolvedIssues,
          newIssues: comparison.newIssues,
          modifiedIssues: comparison.modifiedIssues,
          unchangedIssues: comparison.unchangedIssues,
          summary: comparison.summary
        },
        // Store resolved/new/modified at top level for backward compatibility
        resolvedIssues: comparison.resolvedIssues,
        newIssues: comparison.newIssues,
        modifiedIssues: comparison.modifiedIssues,
        unchangedIssues: comparison.unchangedIssues,
        summary: comparison.summary,
        skillTracking,
        education,
        metadata: {
          orchestratorVersion: '2.0.0',
          timestamp: new Date(),
          confidence: this.calculateConfidence(comparison),
          modelUsed: selectedModel,
          agentId: 'comparison-agent-production',
          agentVersion: 'v7-fixed'
        },
        scanDuration: `${duration}ms`
      };
    } catch (error) {
      this.logError('Analysis failed', error);
      throw error;
    }
  }

  /**
   * Compare issues between branches
   */
  private async compareIssues(
    mainBranch: AnalysisResult,
    featureBranch: AnalysisResult
  ): Promise<ComparisonResult> {
    const newIssues: Issue[] = [];
    const resolvedIssues: Issue[] = [];
    const modifiedIssues: any[] = [];
    const unchangedIssues: Issue[] = [];
    
    // Simple comparison without the faulty matcher
    // Find new issues in feature branch
    for (const featureIssue of featureBranch.issues) {
      const matchedIssue = mainBranch.issues.find(mainIssue => 
        this.isSameIssue(mainIssue, featureIssue)
      );
      
      if (!matchedIssue) {
        newIssues.push(featureIssue);
      } else if (this.hasIssueChanged(featureIssue, matchedIssue)) {
        modifiedIssues.push({
          original: matchedIssue,
          modified: featureIssue,
          changeType: this.determineChangeType(matchedIssue, featureIssue)
        });
      } else {
        unchangedIssues.push(featureIssue);
      }
    }
    
    // Find resolved issues
    for (const mainIssue of mainBranch.issues) {
      const matchedIssue = featureBranch.issues.find(featureIssue =>
        this.isSameIssue(mainIssue, featureIssue)
      );
      
      if (!matchedIssue) {
        resolvedIssues.push(mainIssue);
      }
    }
    
    return {
      success: true,
      newIssues,
      resolvedIssues,
      modifiedIssues,
      unchangedIssues,
      summary: {
        totalResolved: resolvedIssues.length,
        totalNew: newIssues.length,
        totalModified: modifiedIssues.length,
        totalUnchanged: unchangedIssues.length,
        overallAssessment: this.generateComparisonSummary(newIssues, resolvedIssues, modifiedIssues)
      }
    };
  }

  /**
   * Generate report using V7 Fixed generator
   */
  /**
   * Generate report using V7 Fixed generator - Internal implementation
   */
  private async generateReportInternal(
    comparison: ComparisonResult,
    mainBranch: AnalysisResult,
    featureBranch: AnalysisResult,
    prMetadata: PRMetadata | undefined,
    input: ComparisonInput,
    duration?: number,
    modelUsed?: string
  ): Promise<string> {
    // Generate report with V8 Final - directly pass ComparisonResult
    return this.reportGenerator.generateReport(comparison);
  }
  
  /**
   * Generate report - Interface implementation
   */
  async generateReport(comparison: ComparisonResult): Promise<string> {
    // Generate report with V8 Final - directly pass ComparisonResult
    return this.reportGenerator.generateReport(comparison);
  }

  /**
   * Generate PR comment
   */
  /**
   * Generate PR comment - Internal implementation
   */
  private generatePRCommentInternal(
    comparison: ComparisonResult,
    prMetadata: PRMetadata | undefined
  ): string {
    const decision = this.determinePRDecision(comparison);
    const critical = comparison.newIssues?.filter(i => i.severity === 'critical').length || 0;
    const high = comparison.newIssues?.filter(i => i.severity === 'high').length || 0;
    
    let comment = `## CodeQual Analysis Results\n\n`;
    comment += `**Decision:** ${decision === 'approve' ? '✅ APPROVED' : '❌ DECLINED'}\n\n`;
    
    if (critical > 0 || high > 0) {
      comment += `### 🚨 Blocking Issues\n`;
      comment += `- Critical: ${critical}\n`;
      comment += `- High: ${high}\n\n`;
      comment += `These must be fixed before merge.\n\n`;
    }
    
    comment += `### Summary\n`;
    comment += `- New Issues: ${comparison.newIssues?.length || 0}\n`;
    comment += `- Resolved: ${comparison.resolvedIssues?.length || 0}\n`;
    comment += `- Modified: ${comparison.modifiedIssues?.length || 0}\n`;
    
    return comment;
  }
  
  /**
   * Generate PR comment - Interface implementation
   */
  generatePRComment(comparison: ComparisonResult): string {
    return this.generatePRCommentInternal(comparison, undefined);
  }

  /**
   * Calculate skill impacts
   */
  private calculateSkillImpacts(
    comparison: ComparisonResult,
    prMetadata: PRMetadata
  ): any {
    // Create a mock user profile for the skill calculator
    const userProfile = {
      username: prMetadata.author || 'unknown',
      skills: {
        security: 75,
        performance: 80,
        codeQuality: 70,
        architecture: 85,
        testing: 75
      }
    };
    
    // Pass unchanged issues as historical/repository issues for penalty calculation
    const repositoryIssues = comparison.unchangedIssues || [];
    
    // Calculate individual developer skill impact
    const individualSkillUpdate = this.skillCalculator.calculateSkillImpact(
      comparison,
      userProfile,
      repositoryIssues // These are the pre-existing repository issues
    );
    
    // Calculate team score (average of all skill categories)
    const teamSkills = {
      security: 70,
      performance: 72,
      codeQuality: 68,
      architecture: 75,
      testing: 65
    };
    
    // Apply same adjustments to team scores
    const teamProfile = {
      username: 'team',
      skills: teamSkills
    };
    
    const teamSkillUpdate = this.skillCalculator.calculateSkillImpact(
      comparison,
      teamProfile,
      repositoryIssues
    );
    
    // Return combined individual and team analysis
    return {
      individual: individualSkillUpdate,
      team: {
        ...teamSkillUpdate,
        averageScore: teamSkillUpdate.newScore,
        trend: teamSkillUpdate.newScore > teamSkillUpdate.previousScore ? 'improving' : 
               teamSkillUpdate.newScore < teamSkillUpdate.previousScore ? 'declining' : 'stable'
      }
    };
  }

  /**
   * Generate educational content
   */
  private generateEducationalContent(comparison: ComparisonResult): any {
    const categories = new Map<string, Issue[]>();
    
    for (const issue of (comparison.newIssues || [])) {
      const category = issue.category || 'other';
      if (!categories.has(category)) {
        categories.set(category, []);
      }
      categories.get(category)!.push(issue);
    }
    
    return {
      focusAreas: Array.from(categories.keys()),
      recommendations: this.generateRecommendations(categories),
      resources: this.getEducationalResources(categories)
    };
  }

  // Helper methods
  private hasIssueChanged(issue1: Issue, issue2: Issue): boolean {
    return issue1.severity !== issue2.severity ||
           issue1.message !== issue2.message;
  }

  private isSameIssue(issue1: Issue, issue2: Issue): boolean {
    // Compare issues by their key properties
    return issue1.type === issue2.type &&
           issue1.message === issue2.message &&
           issue1.location?.file === issue2.location?.file &&
           issue1.location?.line === issue2.location?.line;
  }

  private determineChangeType(before: Issue, after: Issue): 'upgraded' | 'downgraded' | 'modified' {
    const severityOrder = ['info', 'low', 'medium', 'high', 'critical'];
    const beforeIndex = severityOrder.indexOf(before.severity);
    const afterIndex = severityOrder.indexOf(after.severity);
    
    if (afterIndex > beforeIndex) return 'upgraded';
    if (afterIndex < beforeIndex) return 'downgraded';
    return 'modified';
  }

  private determinePRDecision(comparison: ComparisonResult): 'approve' | 'decline' {
    const critical = comparison.newIssues?.filter(i => i.severity === 'critical').length || 0;
    const high = comparison.newIssues?.filter(i => i.severity === 'high').length || 0;
    
    if (critical > 0 || high > 0) {
      return 'decline';
    }
    return 'approve';
  }

  private calculateConfidence(comparison: ComparisonResult): number {
    const totalIssues = (comparison.newIssues?.length || 0) + 
                       (comparison.resolvedIssues?.length || 0) + 
                       (comparison.modifiedIssues?.length || 0);
    
    if (totalIssues === 0) return 0.95;
    if (totalIssues < 5) return 0.90;
    if (totalIssues < 10) return 0.85;
    return 0.80;
  }

  private generateComparisonSummary(
    newIssues: Issue[],
    resolvedIssues: Issue[],
    modifiedIssues: ComparisonIssue[]
  ): string {
    return `Found ${newIssues.length} new issues, resolved ${resolvedIssues.length} issues, ` +
           `and modified ${modifiedIssues.length} issues.`;
  }

  private generateRecommendations(categories: Map<string, Issue[]>): string[] {
    const recommendations: string[] = [];
    
    if (categories.has('security')) {
      recommendations.push('Review OWASP security guidelines');
    }
    if (categories.has('performance')) {
      recommendations.push('Profile application for performance bottlenecks');
    }
    if (categories.has('code-quality')) {
      recommendations.push('Apply Clean Code principles');
    }
    
    return recommendations;
  }

  private getEducationalResources(categories: Map<string, Issue[]>): any[] {
    // Return relevant educational resources based on issue categories
    return [];
  }

  private getDefaultConfig(): ComparisonConfig {
    return {
      language: 'typescript',
      complexity: 'medium',
      performance: 'balanced'
    };
  }

  private logInfo(message: string): void {
    if (this.logger) {
      this.logger.info(`[ComparisonAgentProduction] ${message}`);
    } else {
      console.log(`[ComparisonAgentProduction] ${message}`);
    }
  }

  private logError(message: string, error: any): void {
    if (this.logger) {
      this.logger.error(`[ComparisonAgentProduction] ${message}`, error);
    } else {
      console.error(`[ComparisonAgentProduction] ${message}`, error);
    }
  }
}

export default ComparisonAgentProduction;