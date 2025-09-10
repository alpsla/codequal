import { EducationalResult } from './educational-agent';
import { StandardReport } from '../services/report-formatter.service';
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
export declare class ReporterAgent {
    private vectorDB?;
    private reportingService?;
    private readonly logger;
    private readonly reportFormatter;
    constructor(vectorDB?: any | undefined, // Optional Vector DB for content search
    reportingService?: any | undefined);
    /**
     * Generate a complete standardized report for UI consumption
     * This is the main method that creates the structured report for Supabase storage
     */
    generateStandardReport(analysisResult: any, compiledEducationalData: any, recommendationModule: any, reportFormat?: ReportFormat): Promise<StandardReport>;
    /**
     * Generate a complete report with educational content (legacy method)
     * Kept for backward compatibility
     */
    generateReport(analysisResults: any, educationalContent: EducationalResult, format: ReportFormat): Promise<EnhancedReport>;
    /**
     * Enrich standard report with Vector DB search results
     */
    private enrichReportWithSearchResults;
    /**
     * Enhance visualizations using reporting service
     */
    private enhanceVisualizationsWithService;
    /**
     * Enhance report with new MCP tools: PDF export, Mermaid diagrams, Grafana dashboards
     */
    private enhanceWithMCPTools;
    /**
     * Generate Mermaid diagrams based on report content
     */
    private generateMermaidDiagrams;
    /**
     * Generate PDF exports for different report formats
     */
    private generatePDFExports;
    /**
     * Update Grafana dashboards with report metrics
     */
    private updateGrafanaDashboards;
    /**
     * Generate dependency Mermaid code
     */
    private generateDependencyMermaid;
    /**
     * Generate findings flow Mermaid code
     */
    private generateFindingsFlowMermaid;
    /**
     * Generate learning path Mermaid code
     */
    private generateLearningPathMermaid;
    /**
     * Estimate PDF page count based on content
     */
    private estimatePDFPages;
    /**
     * Extract repository name from URL
     */
    private extractRepoName;
    /**
     * Sanitize dashboard ID for Grafana
     */
    private sanitizeDashboardId;
    /**
     * Generate specific search prompts for educational content
     */
    generateEducationalSearchPrompts(educationalContent: EducationalResult): EducationalSearchPrompt[];
    /**
     * Build optimized search query based on topic and level
     */
    private buildSearchQuery;
    /**
     * Extract key search terms from topic
     */
    private extractTopicKeywords;
    /**
     * Determine appropriate content type based on topic
     */
    private determineContentType;
    /**
     * Create educational sections for the report
     */
    private createEducationalSections;
    /**
     * Search for key resources using Vector DB or mock data
     */
    private searchKeyResources;
    /**
     * Format learning path summary based on depth
     */
    private formatLearningPathSummary;
    /**
     * Format best practices summary
     */
    private formatBestPracticesSummary;
    /**
     * Extract resources from best practices
     */
    private extractBestPracticeResources;
    /**
     * Format the complete report based on output type
     */
    private formatReport;
    /**
     * Generate executive summary
     */
    private generateExecutiveSummary;
    /**
     * Generate recommendations combining technical and educational insights
     */
    private generateRecommendations;
    /**
     * Format report for PR comment
     */
    private formatForPRComment;
    /**
     * Format report for dashboard display
     */
    private formatForDashboard;
    /**
     * Format report for email
     */
    private formatForEmail;
    /**
     * Format report for Slack
     */
    private formatForSlack;
}
