/**
 * Standard report structure for UI consistency
 */
export interface StandardReport {
    id: string;
    repositoryUrl: string;
    prNumber: number;
    timestamp: Date;
    overview: {
        executiveSummary: string;
        analysisScore: number;
        riskLevel: 'low' | 'medium' | 'high' | 'critical';
        totalFindings: number;
        totalRecommendations: number;
        learningPathAvailable: boolean;
        estimatedRemediationTime: string;
    };
    modules: {
        findings: FindingsModule;
        recommendations: RecommendationsModule;
        educational: EducationalModule;
        metrics: MetricsModule;
        insights: InsightsModule;
    };
    visualizations: {
        severityDistribution: ChartData;
        categoryBreakdown: ChartData;
        learningPathProgress: ChartData;
        skillProgression?: ChartData;
        trendAnalysis?: ChartData;
        dependencyGraph?: GraphData;
        mermaidDiagrams?: Array<{
            type: string;
            title: string;
            mermaidCode: string;
            description: string;
        }>;
    };
    exports: {
        prComment: string;
        emailFormat: string;
        slackFormat: string;
        markdownReport: string;
        jsonReport: string;
        pdfReports?: Array<{
            format: string;
            title: string;
            description: string;
            downloadUrl: string;
            estimatedPageCount: number;
            generatedAt: Date;
        }>;
        dashboardUrls?: Array<{
            type: string;
            title: string;
            url: string;
            description: string;
            panels: string[];
        }>;
    };
    metadata: {
        analysisMode: string;
        agentsUsed: string[];
        toolsExecuted: string[];
        processingTime: number;
        modelVersions: Record<string, string>;
        reportVersion: string;
    };
}
/**
 * Findings module with categorized issues
 */
export interface FindingsModule {
    summary: string;
    categories: {
        security: FindingCategory;
        architecture: FindingCategory;
        performance: FindingCategory;
        codeQuality: FindingCategory;
        dependencies: FindingCategory;
    };
    criticalFindings: Finding[];
    totalCount: number;
}
export interface FindingCategory {
    name: string;
    icon: string;
    count: number;
    findings: Finding[];
    summary: string;
}
export interface Finding {
    id: string;
    title: string;
    description: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    category: string;
    file?: string;
    line?: number;
    codeSnippet?: string;
    recommendation: string;
    toolSource?: string;
    confidence: number;
    tags: string[];
}
/**
 * Recommendations module with actionable items
 */
export interface RecommendationsModule {
    summary: string;
    totalRecommendations: number;
    categories: RecommendationCategory[];
    priorityMatrix: PriorityMatrix;
    implementationPlan: ImplementationPlan;
}
export interface RecommendationCategory {
    name: string;
    recommendations: Recommendation[];
    estimatedEffort: string;
    impactScore: number;
}
export interface Recommendation {
    id: string;
    title: string;
    description: string;
    rationale: string;
    priority: {
        level: 'low' | 'medium' | 'high' | 'critical';
        score: number;
        justification: string;
    };
    implementation: {
        steps: string[];
        estimatedTime: string;
        difficulty: 'easy' | 'medium' | 'hard';
        requiredSkills: string[];
    };
    relatedFindings: string[];
    educationalResources: string[];
    category: string;
}
export interface PriorityMatrix {
    critical: Recommendation[];
    high: Recommendation[];
    medium: Recommendation[];
    low: Recommendation[];
}
export interface ImplementationPlan {
    phases: Phase[];
    totalEstimatedTime: string;
    teamSizeRecommendation: number;
}
export interface Phase {
    name: string;
    description: string;
    recommendations: string[];
    estimatedDuration: string;
    dependencies: string[];
}
/**
 * Educational module with learning content
 */
export interface EducationalModule {
    summary: string;
    learningPath: LearningPath;
    content: {
        explanations: EducationalItem[];
        tutorials: EducationalItem[];
        bestPractices: EducationalItem[];
        resources: EducationalItem[];
    };
    skillGaps: SkillGap[];
    skillProgressions?: SkillProgressionSummary[];
    skillRecommendations?: string[];
    certifications: Certification[];
}
export interface LearningPath {
    id: string;
    title: string;
    description: string;
    difficulty: 'beginner' | 'intermediate' | 'advanced';
    estimatedTime: string;
    steps: LearningStep[];
    progress?: number;
}
export interface LearningStep {
    id: string;
    order: number;
    title: string;
    description: string;
    type: 'concept' | 'practice' | 'assessment';
    estimatedTime: string;
    resources: string[];
    completed?: boolean;
}
export interface EducationalItem {
    id: string;
    title: string;
    description: string;
    type: 'explanation' | 'tutorial' | 'best-practice' | 'resource';
    content: string;
    relevance: number;
    difficulty: 'beginner' | 'intermediate' | 'advanced';
    tags: string[];
    externalUrl?: string;
    relatedTo: string[];
}
export interface SkillGap {
    skill: string;
    currentLevel: number;
    requiredLevel: number;
    importance: 'low' | 'medium' | 'high';
    resources: string[];
}
export interface SkillProgressionSummary {
    skill: string;
    previousLevel: number;
    currentLevel: number;
    improvement: number;
    trend: 'improving' | 'maintaining' | 'declining';
    recentActivity: {
        prCount: number;
        avgComplexity: number;
        successRate: number;
        timespan: string;
    };
}
export interface Certification {
    name: string;
    provider: string;
    relevance: number;
    url: string;
}
/**
 * Metrics module with quantitative data
 */
export interface MetricsModule {
    summary: string;
    scores: {
        overall: MetricScore;
        security: MetricScore;
        maintainability: MetricScore;
        performance: MetricScore;
        reliability: MetricScore;
    };
    trends: TrendData[];
    benchmarks: Benchmark[];
    improvements: Improvement[];
}
export interface MetricScore {
    name: string;
    score: number;
    rating: 'A' | 'B' | 'C' | 'D' | 'F';
    change?: number;
    description: string;
    factors: string[];
}
export interface TrendData {
    metric: string;
    dataPoints: {
        date: Date;
        value: number;
    }[];
    trend: 'improving' | 'stable' | 'declining';
    forecast?: {
        date: Date;
        value: number;
    }[];
}
export interface Benchmark {
    metric: string;
    yourValue: number;
    industryAverage: number;
    topPerformers: number;
    percentile: number;
}
export interface Improvement {
    metric: string;
    currentValue: number;
    targetValue: number;
    recommendation: string;
    estimatedImpact: string;
}
/**
 * Insights module with AI-generated observations
 */
export interface InsightsModule {
    summary: string;
    keyInsights: Insight[];
    patterns: Pattern[];
    predictions: Prediction[];
    contextualAdvice: ContextualAdvice[];
    pendingIssues?: PendingIssue[];
}
export interface PendingIssue {
    id: string;
    title: string;
    description: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    category: string;
    createdAt: Date;
    source: 'historical' | 'deepwiki' | 'previous-analysis';
    status: 'open' | 'in-progress' | 'deferred';
}
export interface Insight {
    id: string;
    title: string;
    description: string;
    significance: 'low' | 'medium' | 'high';
    category: string;
    evidence: string[];
    visualization?: any;
    importance?: 'low' | 'medium' | 'high';
    source?: string;
}
export interface Pattern {
    id?: string;
    name: string;
    description: string;
    occurrences: number;
    trend: 'increasing' | 'stable' | 'decreasing';
    recommendation: string;
    confidence?: number;
}
export interface Prediction {
    metric: string;
    prediction: string;
    confidence: number;
    timeframe: string;
    basis: string[];
}
export interface ContextualAdvice {
    context: string;
    advice: string;
    relevantTo: string[];
    priority: 'low' | 'medium' | 'high';
}
/**
 * Chart/Graph data structures
 */
export interface ChartData {
    type: 'pie' | 'bar' | 'line' | 'radar' | 'heatmap';
    title: string;
    data: any;
    options?: any;
}
export interface GraphData {
    nodes: GraphNode[];
    edges: GraphEdge[];
    layout?: 'force' | 'hierarchical' | 'circular';
}
export interface GraphNode {
    id: string;
    label: string;
    type: string;
    metadata: any;
}
export interface GraphEdge {
    source: string;
    target: string;
    label?: string;
    weight?: number;
}
/**
 * Report Formatter Service - Converts analysis results to standardized report format
 */
export declare class ReportFormatterService {
    private readonly logger;
    /**
     * Format complete analysis into standardized report structure
     */
    formatReport(analysisResult: any, compiledEducationalData: any, recommendationModule: any, reportFormat?: any): Promise<StandardReport>;
    /**
     * Build overview section
     */
    private buildOverview;
    /**
     * Build findings module
     */
    private buildFindingsModule;
    /**
     * Build a finding category
     */
    private buildFindingCategory;
    /**
     * Build recommendations module
     */
    private buildRecommendationsModule;
    /**
     * Build educational module
     */
    private buildEducationalModule;
    /**
     * Build metrics module
     */
    private buildMetricsModule;
    /**
     * Build insights module
     */
    private buildInsightsModule;
    /**
     * Build visualization data
     */
    private buildVisualizations;
    /**
     * Build export formats
     */
    private buildExportFormats;
    private calculateAnalysisScore;
    private calculateRemediationTime;
    private extractSeverityFromContent;
    private parseTimeToHours;
    private generateFindingTags;
    private formatCategoryName;
    private generateCategorySummary;
    private groupRecommendationsByCategory;
    private formatRecommendation;
    private buildPriorityMatrix;
    private buildImplementationPlan;
    private calculateCategoryEffort;
    private calculateCategoryImpact;
    private generateFindingsSummary;
    private formatEducationalItems;
    private determineStepType;
    private suggestCertifications;
    private calculateSkillAdjustment;
    private createMetricScore;
    private calculateCategoryScore;
    private calculateReliabilityScore;
    private calculatePercentile;
    private generateMockTrendData;
    private generateKeyInsights;
    private identifyPatterns;
    private generatePredictions;
    private generateContextualAdvice;
    private getScoreDescription;
    private getScoreFactors;
    private extractToolsExecuted;
    private generateEmailFormat;
    private generateSlackFormat;
    private generateMarkdownReport;
}
