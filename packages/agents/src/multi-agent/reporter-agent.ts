import { createLogger } from '@codequal/core/utils';
import { EducationalResult } from './educational-agent';
import { ReportFormatterService, StandardReport } from '../services/report-formatter.service';

/**
 * Search prompt configuration for educational content
 */
export interface EducationalSearchPrompt {
  topic: string;
  searchQuery: string;
  context: string;
  targetAudience: 'beginner' | 'intermediate' | 'advanced';
  contentType: 'explanation' | 'tutorial' | 'best-practice' | 'reference';
  maxResults?: number;
}

/**
 * Reporter agent output formats
 */
export interface ReportFormat {
  type: 'pr-comment' | 'full-report' | 'dashboard' | 'email' | 'slack';
  includeEducational: boolean;
  educationalDepth: 'summary' | 'detailed' | 'comprehensive';
}

/**
 * Educational content section in reports
 */
export interface EducationalReportSection {
  title: string;
  summary: string;
  learningPath?: string[];
  keyResources: Array<{
    title: string;
    type: string;
    url?: string;
    relevance: number;
  }>;
  searchPrompts: EducationalSearchPrompt[];
}

/**
 * Complete report with educational content
 */
export interface EnhancedReport {
  executiveSummary: string;
  technicalFindings: any[];
  educationalSections: EducationalReportSection[];
  visualizations?: any[];
  recommendations: string[];
  metadata: {
    generatedAt: Date;
    reportFormat: ReportFormat;
    educationalContentIncluded: boolean;
  };
}

/**
 * Reporter Agent - Formats analysis results and educational content for various outputs
 * Now enhanced with StandardReport generation for UI consumption
 */
export class ReporterAgent {
  private readonly logger = createLogger('ReporterAgent');
  private readonly reportFormatter: ReportFormatterService;
  
  constructor(
    private vectorDB?: any, // Optional Vector DB for content search
    private reportingService?: any // Optional reporting service for visualizations
  ) {
    this.reportFormatter = new ReportFormatterService();
  }
  
  /**
   * Generate a complete standardized report for UI consumption
   * This is the main method that creates the structured report for Supabase storage
   */
  async generateStandardReport(
    analysisResult: any,
    compiledEducationalData: any,
    recommendationModule: any,
    reportFormat?: ReportFormat
  ): Promise<StandardReport> {
    this.logger.info('Generating standardized report for UI', {
      repositoryUrl: analysisResult.repository.url,
      prNumber: analysisResult.pr.number,
      format: reportFormat?.type || 'full-report'
    });
    
    // Use the report formatter service to create standardized report
    const standardReport = await this.reportFormatter.formatReport(
      analysisResult,
      compiledEducationalData,
      recommendationModule,
      reportFormat
    );
    
    // If we have a vector DB, enrich with additional search results
    if (this.vectorDB && reportFormat?.includeEducational) {
      await this.enrichReportWithSearchResults(standardReport, compiledEducationalData);
    }
    
    // Generate any additional visualizations if reporting service is available
    if (this.reportingService) {
      await this.enhanceVisualizationsWithService(standardReport);
    }
    
    this.logger.info('Standardized report generated successfully', {
      reportId: standardReport.id,
      modulesGenerated: Object.keys(standardReport.modules),
      visualizationsCount: Object.keys(standardReport.visualizations).length
    });
    
    return standardReport;
  }
  
  /**
   * Generate a complete report with educational content (legacy method)
   * Kept for backward compatibility
   */
  async generateReport(
    analysisResults: any,
    educationalContent: EducationalResult,
    format: ReportFormat
  ): Promise<EnhancedReport> {
    this.logger.info('Generating enhanced report with educational content', {
      format: format.type,
      educationalDepth: format.educationalDepth
    });
    
    // Generate search prompts for educational content
    const searchPrompts = this.generateEducationalSearchPrompts(educationalContent);
    
    // Create educational sections based on format
    const educationalSections = await this.createEducationalSections(
      educationalContent,
      searchPrompts,
      format.educationalDepth
    );
    
    // Format the report based on output type
    const report = await this.formatReport(
      analysisResults,
      educationalSections,
      format
    );
    
    return report;
  }
  
  /**
   * Enrich standard report with Vector DB search results
   */
  private async enrichReportWithSearchResults(
    report: StandardReport,
    compiledEducationalData: any
  ): Promise<void> {
    try {
      // Search for educational content based on skill gaps
      const skillGaps = compiledEducationalData.educational.insights.skillGaps || [];
      
      for (const gap of skillGaps.slice(0, 5)) { // Limit to top 5 gaps
        const searchResults = await this.vectorDB.search({
          query: `${gap.skill} tutorial guide best practices`,
          filters: {
            contentType: 'educational',
            difficulty: gap.importance === 'high' ? 'advanced' : 'intermediate'
          },
          limit: 3
        });
        
        // Add search results to educational module resources
        if (searchResults && searchResults.length > 0) {
          searchResults.forEach((result: any) => {
            report.modules.educational.content.resources.push({
              id: `vector_${result.id}`,
              title: result.title,
              description: result.description || '',
              type: 'resource',
              content: result.content || '',
              relevance: result.score || 0.7,
              difficulty: 'intermediate',
              tags: result.tags || [],
              externalUrl: result.url,
              relatedTo: [gap.skill]
            });
          });
        }
      }
    } catch (error) {
      this.logger.warn('Failed to enrich report with Vector DB search results', { error });
    }
  }
  
  /**
   * Enhance visualizations using reporting service
   */
  private async enhanceVisualizationsWithService(report: StandardReport): Promise<void> {
    try {
      if (!this.reportingService) return;
      
      // Generate additional visualization data
      const dependencyGraph = await this.reportingService.generateDependencyGraph?.(
        report.modules.findings.categories.dependencies?.findings || []
      );
      
      if (dependencyGraph) {
        report.visualizations.dependencyGraph = {
          nodes: dependencyGraph.nodes,
          edges: dependencyGraph.edges,
          layout: 'hierarchical'
        };
      }
      
      // Generate trend analysis if historical data available
      const trendData = await this.reportingService.generateTrendAnalysis?.(
        report.repositoryUrl
      );
      
      if (trendData) {
        report.visualizations.trendAnalysis = {
          type: 'line',
          title: 'Code Quality Trend',
          data: trendData
        };
      }
    } catch (error) {
      this.logger.warn('Failed to enhance visualizations with reporting service', { error });
    }
  }
  
  /**
   * Generate specific search prompts for educational content
   */
  generateEducationalSearchPrompts(educationalContent: EducationalResult): EducationalSearchPrompt[] {
    const prompts: EducationalSearchPrompt[] = [];
    
    // Generate prompts for learning path topics
    educationalContent.learningPath.steps.forEach((step, index) => {
      const topicMatch = step.match(/\d+\.\s+(.+)\s+\((\w+)\)/);
      if (topicMatch) {
        const topic = topicMatch[1];
        const level = topicMatch[2] as 'beginner' | 'intermediate' | 'advanced';
        
        prompts.push({
          topic,
          searchQuery: this.buildSearchQuery(topic, level),
          context: `Learning path step ${index + 1}`,
          targetAudience: level,
          contentType: this.determineContentType(topic),
          maxResults: 5
        });
      }
    });
    
    // Generate prompts for skill gaps
    educationalContent.skillGaps.forEach(gap => {
      prompts.push({
        topic: gap,
        searchQuery: `${gap} tutorial guide best practices`,
        context: 'Identified skill gap',
        targetAudience: 'intermediate',
        contentType: 'tutorial',
        maxResults: 3
      });
    });
    
    // Generate prompts for related topics
    educationalContent.relatedTopics.slice(0, 5).forEach(topic => {
      prompts.push({
        topic,
        searchQuery: `${topic} introduction overview`,
        context: 'Related learning topic',
        targetAudience: 'beginner',
        contentType: 'reference',
        maxResults: 2
      });
    });
    
    this.logger.debug('Generated educational search prompts', {
      totalPrompts: prompts.length,
      topics: prompts.map(p => p.topic)
    });
    
    return prompts;
  }
  
  /**
   * Build optimized search query based on topic and level
   */
  private buildSearchQuery(topic: string, level: string): string {
    const levelModifiers = {
      beginner: 'introduction basics tutorial getting started',
      intermediate: 'guide patterns best practices implementation',
      advanced: 'advanced optimization architecture deep dive'
    };
    
    const topicKeywords = this.extractTopicKeywords(topic);
    const modifier = levelModifiers[level as keyof typeof levelModifiers] || '';
    
    return `${topicKeywords} ${modifier}`.trim();
  }
  
  /**
   * Extract key search terms from topic
   */
  private extractTopicKeywords(topic: string): string {
    // Remove common words and extract key terms
    const commonWords = ['the', 'and', 'or', 'for', 'with', 'using', 'management'];
    const words = topic.toLowerCase().split(' ');
    const keywords = words.filter(word => !commonWords.includes(word));
    
    // Special handling for common development topics
    const topicMappings: Record<string, string> = {
      'security best practices': 'security vulnerabilities prevention OWASP',
      'dependency security': 'npm audit vulnerabilities CVE',
      'circular dependencies': 'circular dependency detection resolution madge',
      'license compliance': 'open source license compatibility legal',
      'code complexity': 'cyclomatic complexity refactoring clean code',
      'technical debt': 'technical debt management refactoring strategies',
      'performance optimization': 'performance profiling optimization techniques'
    };
    
    const normalizedTopic = topic.toLowerCase();
    return topicMappings[normalizedTopic] || keywords.join(' ');
  }
  
  /**
   * Determine appropriate content type based on topic
   */
  private determineContentType(topic: string): 'explanation' | 'tutorial' | 'best-practice' | 'reference' {
    const topicLower = topic.toLowerCase();
    
    if (topicLower.includes('how to') || topicLower.includes('resolving') || topicLower.includes('using')) {
      return 'tutorial';
    } else if (topicLower.includes('best practices') || topicLower.includes('patterns')) {
      return 'best-practice';
    } else if (topicLower.includes('introduction') || topicLower.includes('overview')) {
      return 'explanation';
    } else {
      return 'reference';
    }
  }
  
  /**
   * Create educational sections for the report
   */
  private async createEducationalSections(
    educationalContent: EducationalResult,
    searchPrompts: EducationalSearchPrompt[],
    depth: 'summary' | 'detailed' | 'comprehensive'
  ): Promise<EducationalReportSection[]> {
    const sections: EducationalReportSection[] = [];
    
    // Learning Path Section
    if (educationalContent.learningPath.steps.length > 0) {
      sections.push({
        title: 'Recommended Learning Path',
        summary: this.formatLearningPathSummary(educationalContent.learningPath, depth),
        learningPath: depth !== 'summary' ? educationalContent.learningPath.steps : undefined,
        keyResources: await this.searchKeyResources(
          searchPrompts.filter(p => p.context.includes('Learning path')),
          depth
        ),
        searchPrompts: depth === 'comprehensive' ? 
          searchPrompts.filter(p => p.context.includes('Learning path')) : []
      });
    }
    
    // Skill Gaps Section
    if (educationalContent.skillGaps.length > 0 && depth !== 'summary') {
      sections.push({
        title: 'Identified Skill Gaps',
        summary: `Based on the analysis, ${educationalContent.skillGaps.length} areas for skill improvement were identified.`,
        keyResources: await this.searchKeyResources(
          searchPrompts.filter(p => p.context === 'Identified skill gap'),
          depth
        ),
        searchPrompts: depth === 'comprehensive' ?
          searchPrompts.filter(p => p.context === 'Identified skill gap') : []
      });
    }
    
    // Best Practices Section
    if (educationalContent.bestPractices.length > 0) {
      const bestPracticesSummary = this.formatBestPracticesSummary(educationalContent.bestPractices, depth);
      sections.push({
        title: 'Relevant Best Practices',
        summary: bestPracticesSummary,
        keyResources: this.extractBestPracticeResources(educationalContent.bestPractices),
        searchPrompts: []
      });
    }
    
    // Additional Resources Section
    if (depth === 'comprehensive' && educationalContent.additionalResources.length > 0) {
      sections.push({
        title: 'Additional Learning Resources',
        summary: `${educationalContent.additionalResources.length} additional resources available for deeper learning.`,
        keyResources: educationalContent.additionalResources.map(r => ({
          title: r.title,
          type: r.type,
          url: r.url,
          relevance: 0.8
        })),
        searchPrompts: searchPrompts.filter(p => p.context === 'Related learning topic')
      });
    }
    
    return sections;
  }
  
  /**
   * Search for key resources using Vector DB or mock data
   */
  private async searchKeyResources(
    prompts: EducationalSearchPrompt[],
    depth: string
  ): Promise<Array<{ title: string; type: string; url?: string; relevance: number }>> {
    const resources: Array<{ title: string; type: string; url?: string; relevance: number }> = [];
    
    // Limit resources based on depth
    const maxResources = depth === 'summary' ? 2 : depth === 'detailed' ? 5 : 10;
    
    for (const prompt of prompts.slice(0, maxResources)) {
      if (this.vectorDB) {
        try {
          // Search Vector DB for educational content
          const results = await this.vectorDB.search({
            query: prompt.searchQuery,
            filters: {
              contentType: 'educational',
              targetAudience: prompt.targetAudience
            },
            limit: prompt.maxResults || 3
          });
          
          results.forEach((result: any) => {
            resources.push({
              title: result.title || `${prompt.topic} Resource`,
              type: prompt.contentType,
              url: result.url,
              relevance: result.score || 0.7
            });
          });
        } catch (error) {
          this.logger.warn('Failed to search Vector DB', { error, prompt: prompt.topic });
        }
      } else {
        // Mock resources when Vector DB is not available
        resources.push({
          title: `${prompt.topic} - ${prompt.contentType}`,
          type: prompt.contentType,
          url: `https://docs.example.com/${prompt.topic.toLowerCase().replace(/\s+/g, '-')}`,
          relevance: 0.75
        });
      }
    }
    
    return resources;
  }
  
  /**
   * Format learning path summary based on depth
   */
  private formatLearningPathSummary(learningPath: any, depth: string): string {
    if (depth === 'summary') {
      return `A ${learningPath.difficulty} learning path with ${learningPath.steps.length} topics, estimated ${learningPath.estimatedTime}.`;
    } else if (depth === 'detailed') {
      const topTopics = learningPath.steps.slice(0, 3).map((s: string) => {
        const match = s.match(/\d+\.\s+(.+)\s+\(/);
        return match ? match[1] : s;
      }).join(', ');
      return `${learningPath.description} Focus areas include: ${topTopics}. Total time: ${learningPath.estimatedTime}.`;
    } else {
      return learningPath.description;
    }
  }
  
  /**
   * Format best practices summary
   */
  private formatBestPracticesSummary(bestPractices: any[], depth: string): string {
    if (depth === 'summary') {
      return `${bestPractices.length} best practices identified.`;
    } else {
      const practices = bestPractices.slice(0, 3).map(bp => bp.practice).join('; ');
      return `Key practices: ${practices}`;
    }
  }
  
  /**
   * Extract resources from best practices
   */
  private extractBestPracticeResources(bestPractices: any[]): Array<{ title: string; type: string; url?: string; relevance: number }> {
    return bestPractices.slice(0, 5).map(bp => ({
      title: bp.practice,
      type: 'best-practice',
      relevance: 0.9
    }));
  }
  
  /**
   * Format the complete report based on output type
   */
  private async formatReport(
    analysisResults: any,
    educationalSections: EducationalReportSection[],
    format: ReportFormat
  ): Promise<EnhancedReport> {
    const report: EnhancedReport = {
      executiveSummary: this.generateExecutiveSummary(analysisResults, educationalSections),
      technicalFindings: analysisResults.findings || [],
      educationalSections,
      visualizations: [],
      recommendations: this.generateRecommendations(analysisResults, educationalSections),
      metadata: {
        generatedAt: new Date(),
        reportFormat: format,
        educationalContentIncluded: format.includeEducational
      }
    };
    
    // Format based on output type
    switch (format.type) {
      case 'pr-comment':
        return this.formatForPRComment(report);
      case 'dashboard':
        return await this.formatForDashboard(report);
      case 'email':
        return this.formatForEmail(report);
      case 'slack':
        return this.formatForSlack(report);
      default:
        return report;
    }
  }
  
  /**
   * Generate executive summary
   */
  private generateExecutiveSummary(analysisResults: any, educationalSections: EducationalReportSection[]): string {
    const totalFindings = analysisResults.findings ? Object.values(analysisResults.findings).flat().length : 0;
    const hasEducationalContent = educationalSections.length > 0;
    
    let summary = `Analysis completed with ${totalFindings} findings across multiple categories. `;
    
    if (hasEducationalContent) {
      const totalLearningTopics = educationalSections
        .filter(s => s.learningPath)
        .reduce((sum, s) => sum + (s.learningPath?.length || 0), 0);
      
      summary += `${totalLearningTopics} learning topics identified to address the findings. `;
    }
    
    return summary;
  }
  
  /**
   * Generate recommendations combining technical and educational insights
   */
  private generateRecommendations(analysisResults: any, educationalSections: EducationalReportSection[]): string[] {
    const recommendations: string[] = [];
    
    // Technical recommendations
    if (analysisResults.recommendations) {
      recommendations.push(...analysisResults.recommendations);
    }
    
    // Educational recommendations
    educationalSections.forEach(section => {
      if (section.title === 'Recommended Learning Path' && section.learningPath) {
        recommendations.push(`Complete the ${section.learningPath.length}-step learning path to address identified issues`);
      }
      
      if (section.title === 'Identified Skill Gaps') {
        recommendations.push('Invest in team training to close identified skill gaps');
      }
    });
    
    return recommendations;
  }
  
  /**
   * Format report for PR comment
   */
  private formatForPRComment(report: EnhancedReport): EnhancedReport {
    // Simplify for PR comments
    const simplifiedEducational = report.educationalSections.map(section => ({
      ...section,
      keyResources: section.keyResources.slice(0, 2), // Only top 2 resources
      searchPrompts: [] // Don't include search prompts in PR comments
    }));
    
    return {
      ...report,
      educationalSections: simplifiedEducational,
      executiveSummary: report.executiveSummary.substring(0, 200) + '...'
    };
  }
  
  /**
   * Format report for dashboard display
   */
  private async formatForDashboard(report: EnhancedReport): Promise<EnhancedReport> {
    // Add visualizations for dashboard
    const visualizations = [];
    
    // Learning path visualization
    if (report.educationalSections.some(s => s.learningPath)) {
      visualizations.push({
        type: 'learning-path-timeline',
        data: report.educationalSections.find(s => s.learningPath)?.learningPath,
        config: { type: 'horizontal-timeline' }
      });
    }
    
    // Skill gap visualization
    const skillGapSection = report.educationalSections.find(s => s.title === 'Identified Skill Gaps');
    if (skillGapSection) {
      visualizations.push({
        type: 'skill-gap-radar',
        data: skillGapSection.keyResources.map(r => ({
          skill: r.title,
          current: 3,
          target: 8
        })),
        config: { type: 'radar-chart' }
      });
    }
    
    return {
      ...report,
      visualizations
    };
  }
  
  /**
   * Format report for email
   */
  private formatForEmail(report: EnhancedReport): EnhancedReport {
    // Format for email readability
    return {
      ...report,
      educationalSections: report.educationalSections.map(section => ({
        ...section,
        summary: `${section.summary}\n\nTop Resources:\n${section.keyResources
          .slice(0, 3)
          .map(r => `- ${r.title}${r.url ? ` (${r.url})` : ''}`)
          .join('\n')}`
      }))
    };
  }
  
  /**
   * Format report for Slack
   */
  private formatForSlack(report: EnhancedReport): EnhancedReport {
    // Format for Slack's block kit
    const slackSections = report.educationalSections.map(section => ({
      ...section,
      summary: section.summary.substring(0, 150),
      keyResources: section.keyResources.slice(0, 1) // Just one resource for Slack
    }));
    
    return {
      ...report,
      educationalSections: slackSections,
      executiveSummary: `🎯 ${report.executiveSummary.substring(0, 100)}...`
    };
  }
}
