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
      
      // Enhanced MCP Tool Integration
      await this.enhanceWithMCPTools(report);
      
    } catch (error) {
      this.logger.warn('Failed to enhance visualizations with reporting service', { error });
    }
  }

  /**
   * Enhance report with new MCP tools: PDF export, Mermaid diagrams, Grafana dashboards
   */
  private async enhanceWithMCPTools(report: StandardReport): Promise<void> {
    try {
      // Generate Mermaid diagrams for better visualization
      const mermaidDiagrams = await this.generateMermaidDiagrams(report);
      if (mermaidDiagrams.length > 0) {
        report.visualizations.mermaidDiagrams = mermaidDiagrams;
      }
      
      // Generate PDF exports for different audiences
      const pdfExports = await this.generatePDFExports(report);
      if (pdfExports.length > 0) {
        report.exports.pdfReports = pdfExports;
      }
      
      // Update Grafana dashboards with latest metrics
      const grafanaUrls = await this.updateGrafanaDashboards(report);
      if (grafanaUrls.length > 0) {
        report.exports.dashboardUrls = grafanaUrls;
      }
      
    } catch (error) {
      this.logger.warn('Failed to enhance report with MCP tools', { error });
    }
  }

  /**
   * Generate Mermaid diagrams based on report content
   */
  private async generateMermaidDiagrams(report: StandardReport): Promise<any[]> {
    const diagrams = [];
    
    try {
      // Dependency graph diagram
      if (report.modules.findings.categories.dependencies?.findings?.length > 0) {
        const dependencyDiagram = {
          type: 'dependency-graph',
          title: 'Dependency Architecture',
          mermaidCode: this.generateDependencyMermaid(report.modules.findings.categories.dependencies.findings),
          description: 'Visual representation of code dependencies and their relationships'
        };
        diagrams.push(dependencyDiagram);
      }
      
      // Findings flowchart
      if (report.overview.totalFindings > 0) {
        const findingsDiagram = {
          type: 'findings-flow',
          title: 'Analysis Findings Flow',
          mermaidCode: this.generateFindingsFlowMermaid(report.modules.findings),
          description: 'Flowchart showing the categorization and severity of identified issues'
        };
        diagrams.push(findingsDiagram);
      }
      
      // Learning path diagram (if educational content is included)
      if (report.modules.educational?.learningPath) {
        const learningDiagram = {
          type: 'learning-path',
          title: 'Recommended Learning Journey',
          mermaidCode: this.generateLearningPathMermaid(report.modules.educational.learningPath),
          description: 'Step-by-step learning path to address identified skill gaps'
        };
        diagrams.push(learningDiagram);
      }
      
    } catch (error) {
      this.logger.warn('Failed to generate Mermaid diagrams', { error });
    }
    
    return diagrams;
  }

  /**
   * Generate PDF exports for different report formats
   */
  private async generatePDFExports(report: StandardReport): Promise<any[]> {
    const pdfExports = [];
    
    try {
      const exportFormats = [
        {
          type: 'executive',
          title: 'Executive Summary',
          description: 'High-level overview for leadership',
          includeCharts: false,
          includeAppendices: false
        },
        {
          type: 'technical',
          title: 'Technical Report',
          description: 'Detailed findings for development teams',
          includeCharts: true,
          includeAppendices: true
        }
      ];
      
      // Add educational format if educational content is available
      if (report.modules.educational?.learningPath) {
        exportFormats.push({
          type: 'educational',
          title: 'Learning Guide',
          description: 'Educational content and learning paths',
          includeCharts: true,
          includeAppendices: false
        });
      }
      
      for (const format of exportFormats) {
        const pdfMetadata = {
          format: format.type,
          title: format.title,
          description: format.description,
          generatedAt: new Date(),
          reportId: report.id,
          // In real implementation, this would be the actual PDF buffer/URL
          downloadUrl: `/api/reports/${report.id}/pdf/${format.type}`,
          estimatedPageCount: this.estimatePDFPages(report, format.type)
        };
        
        pdfExports.push(pdfMetadata);
      }
      
    } catch (error) {
      this.logger.warn('Failed to generate PDF exports', { error });
    }
    
    return pdfExports;
  }

  /**
   * Update Grafana dashboards with report metrics
   */
  private async updateGrafanaDashboards(report: StandardReport): Promise<any[]> {
    const dashboardUrls = [];
    
    try {
      // Repository-specific dashboard
      const repoDashboard = {
        type: 'repository',
        title: `${this.extractRepoName(report.repositoryUrl)} - Code Quality`,
        url: `/grafana/d/repo-${this.sanitizeDashboardId(report.repositoryUrl)}/repository-metrics`,
        description: 'Repository-wide code quality metrics and trends',
        panels: ['code-quality-score', 'issue-trends', 'complexity-metrics']
      };
      dashboardUrls.push(repoDashboard);
      
      // PR-specific dashboard
      if (report.prNumber) {
        const prDashboard = {
          type: 'pull-request',
          title: `PR #${report.prNumber} - Analysis Results`,
          url: `/grafana/d/pr-${report.prNumber}/pr-analysis`,
          description: 'Pull request specific analysis results and metrics',
          panels: ['pr-findings', 'change-impact', 'review-metrics']
        };
        dashboardUrls.push(prDashboard);
      }
      
      // Educational progress dashboard (if educational content present)
      if (report.modules.educational?.skillGaps?.length > 0) {
        const eduDashboard = {
          type: 'educational',
          title: 'Learning Progress & Skill Development',
          url: `/grafana/d/edu-${this.sanitizeDashboardId(report.repositoryUrl)}/learning-progress`,
          description: 'Skill progression and learning engagement metrics',
          panels: ['skill-levels', 'learning-engagement', 'content-effectiveness']
        };
        dashboardUrls.push(eduDashboard);
      }
      
    } catch (error) {
      this.logger.warn('Failed to update Grafana dashboards', { error });
    }
    
    return dashboardUrls;
  }

  /**
   * Generate dependency Mermaid code
   */
  private generateDependencyMermaid(dependencies: any[]): string {
    let mermaidCode = 'graph LR\n';
    mermaidCode += '    classDef critical fill:#ffebee,stroke:#d32f2f\n';
    mermaidCode += '    classDef high fill:#fff3e0,stroke:#f57c00\n\n';
    
    dependencies.slice(0, 10).forEach((dep, index) => {
      const nodeId = `DEP${index}`;
      const severity = dep.severity || 'medium';
      const className = severity === 'critical' ? 'critical' : severity === 'high' ? 'high' : '';
      
      mermaidCode += `    ${nodeId}["${dep.title || `Dependency ${index + 1}`}"]${className ? `:::${className}` : ''}\n`;
      
      if (index > 0) {
        mermaidCode += `    DEP${index - 1} --> ${nodeId}\n`;
      }
    });
    
    return mermaidCode;
  }

  /**
   * Generate findings flow Mermaid code
   */
  private generateFindingsFlowMermaid(findings: any): string {
    let mermaidCode = 'flowchart TD\n';
    mermaidCode += '    START([Code Analysis])\n';
    
    const categories = Object.keys(findings.categories || {});
    categories.forEach(category => {
      const categoryData = findings.categories[category];
      if (categoryData.count > 0) {
        const catId = category.toUpperCase();
        mermaidCode += `    ${catId}["${category}: ${categoryData.count} issues"]\n`;
        mermaidCode += `    START --> ${catId}\n`;
      }
    });
    
    return mermaidCode;
  }

  /**
   * Generate learning path Mermaid code
   */
  private generateLearningPathMermaid(learningPath: any): string {
    let mermaidCode = 'flowchart TD\n';
    mermaidCode += '    START([Start Learning])\n';
    
    const steps = learningPath.steps || [];
    steps.slice(0, 8).forEach((step: any, index: number) => {
      const stepId = `STEP${index}`;
      const title = step.title || step.topic || `Step ${index + 1}`;
      
      mermaidCode += `    ${stepId}["${title}"]\n`;
      
      if (index === 0) {
        mermaidCode += `    START --> ${stepId}\n`;
      } else {
        mermaidCode += `    STEP${index - 1} --> ${stepId}\n`;
      }
    });
    
    mermaidCode += `    STEP${steps.length - 1} --> END([Complete])\n`;
    return mermaidCode;
  }

  /**
   * Estimate PDF page count based on content
   */
  private estimatePDFPages(report: StandardReport, format: string): number {
    const basePages = 2; // Cover + summary
    
    switch (format) {
      case 'executive':
        return basePages + 2; // 4 pages max
      case 'technical': {
        const findingsPages = Math.ceil(report.overview.totalFindings / 10);
        const chartsPages = Object.keys(report.visualizations).length;
        return basePages + findingsPages + chartsPages;
      }
      case 'educational': {
        const learningSteps = report.modules.educational?.learningPath?.steps?.length || 0;
        return basePages + Math.ceil(learningSteps / 3);
      }
      default:
        return 6;
    }
  }

  /**
   * Extract repository name from URL
   */
  private extractRepoName(url: string): string {
    const match = url.match(/\/([^/]+)\/([^/]+)(?:\.git)?$/);
    return match ? `${match[1]}/${match[2]}` : 'Repository';
  }

  /**
   * Sanitize dashboard ID for Grafana
   */
  private sanitizeDashboardId(input: string): string {
    return input.replace(/[^a-zA-Z0-9-]/g, '-').toLowerCase();
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
