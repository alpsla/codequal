/**
 * Report Generator V8 Final - All Issues Completely Fixed
 *
 * Complete fixes for:
 * 1. Architecture diagram properly formatted
 * 2. Breaking Changes section populated when present
 * 3. Educational links verified and working
 * 4. Dependencies section populated
 * 5. Action Items section with prioritized fixes
 * 6. PR Comment section populated
 * 7. Report Metadata complete
 */
import { ComparisonResult } from '../types/analysis-types';
export declare class ReportGeneratorV8Final {
    private modelConfigResolver;
    private logger;
    private fixes;
    private modelConfig?;
    constructor(modelConfig?: {
        model: string;
        provider?: string;
    });
    /**
     * Generate fix suggestions for issues
     */
    private generateFixSuggestions;
    private formatIssuesAsMarkdown;
    generateReport(comparisonResult: ComparisonResult): Promise<string>;
    generateReportWithContext(comparisonResult: ComparisonResult, context?: {
        projectType?: string;
        teamSize?: number;
        deadline?: Date;
    }): Promise<string>;
    private selectOptimalModel;
    private getAutofixStrategy;
    private getLanguageSpecificResources;
    private convertToComparisonResult;
    private getCurrentAIModel;
    private getContextBasedModel;
    private log;
    private generateHTMLFromMarkdown;
    private generateCompleteHTML;
    private generateHeader;
    private generateExecutiveSummary;
    private calculateSecurityScore;
    private calculatePerformanceScore;
    private calculateMaintainabilityScore;
    private generatePRDecision;
    private generateConsolidatedIssues;
    private formatDetailedIssues;
    private formatDetailedIssuesWithFixes;
    private formatSingleIssue;
    private formatSingleIssueWithFix;
    private generateSecurityAnalysis;
    private mapToOWASP;
    private generatePerformanceAnalysis;
    private generateCodeQualityAnalysis;
    private generateArchitectureAnalysis;
    private generateProperArchitectureDiagram;
    private generateDependenciesAnalysis;
    private generateBreakingChanges;
    private detectBreakingChangesFromIssues;
    private assessMigrationComplexity;
    private assessConsumerImpact;
    private recommendVersionBump;
    private assessBreakingChangeRisk;
    private generateEducationalInsights;
    private getSpecificEducationalResources;
    private getLearningPoint;
    private getCategoryInsight;
    private getTopIssueTypes;
    private extractIssueType;
    private getBestPracticeExample;
    private generateQuickTips;
    private generatePersonalizedLearningPath;
    private identifySkillGaps;
    private generate30DayPlan;
    private detectPrimaryLanguage;
    private generateSkillTracking;
    private generateTeamSkillsComparison;
    private generateFinancialImpact;
    private calculateSkillScore;
    private calculateImprovement;
    private getTrendIndicator;
    private generateAchievements;
    private generateSkillRecommendations;
    private calculateOverallScore;
    private generateTeamGrowthAreas;
    private generateKnowledgeSharingOpportunities;
    private getIssuePoints;
    private formatScoreBreakdown;
    private getScoreEmoji;
    private calculateCategoryImpact;
    private calculateUpdatedCategoryScore;
    private getCategoryCalculation;
    private getStrengths;
    private generateBusinessImpact;
    private getRiskLevel;
    private calculateIncidentCost;
    private calculateROI;
    private calculateCategoryRisk;
    private getRiskImpact;
    private getRiskLikelihood;
    private getRiskPriority;
    private calculateComplianceRisk;
    private getComplianceImpact;
    private getComplianceLikelihood;
    private getCompliancePriority;
    private getRecommendedTimeline;
    private calculateAffectedUsers;
    private calculateServiceDegradation;
    private calculateDataRisk;
    private calculateBrandImpact;
    private generateActionItems;
    private identifyAutomationOpportunities;
    private generateAIIDEIntegration;
    private generateIssueSpecificFixCommands;
    private calculateTimeSaved;
    private calculateAverageConfidence;
    private generateEnhancedSecurityFixSuggestions;
    private generateEnhancedPerformanceFixSuggestions;
    private generateSecurityFixCommands;
    private generatePerformanceFixCommands;
    private generateDependencyFixCommands;
    private generateCodeQualityFixCommands;
    private generateSecurityFixSuggestions;
    private generateGenericSecuritySuggestion;
    private isSecurityIssue;
    private categorizeSecurityIssue;
    private generatePerformanceFixSuggestions;
    private generateDependencyFixSuggestions;
    private generateCodeQualityFixSuggestions;
    private generatePRComment;
    private generateReportMetadata;
    private generateReportId;
    private getVerifiedEducationalResources;
    private groupIssuesByType;
    private generateMockCodeSnippet;
    private generateMockFixedCode;
    private calculateScore;
    private getGrade;
    private getTrend;
    private getTrendArrow;
    private countBySeverity;
    private groupBySeverity;
    private calculateCategoryScore;
    private getLanguageFromFile;
    private capitalize;
    private calculateComplexity;
    private formatTechnicalDebt;
    private calculateTotalFixTime;
    private calculateRiskScore;
    private calculateMaintainabilityIndex;
    private calculateUserImpact;
    private getAffectedOperations;
    private detectAntiPatterns;
    private getChangeIndicator;
    private getSeverityEmoji;
    private estimatePerformanceImpact;
    private renderHTMLContent;
    private convertMarkdownToHTML;
}
