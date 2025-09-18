/**
 * Comparison Orchestrator Service - Interface-Based Design
 *
 * This service orchestrates the complete analysis flow:
 * 1. Queries configuration provider for comparison agent configuration
 * 2. Orders Researcher to find optimal model if no configuration exists
 * 3. Initializes Comparison Agent with model and role-specific prompt
 * 4. Executes comparison analysis (which generates the full report)
 * 5. Updates developer skills based on results
 * 6. Optionally enhances with real course recommendations
 * 7. Returns complete results in requested format
 */
import { IConfigProvider } from './interfaces/config-provider.interface';
import { ISkillProvider } from './interfaces/skill-provider.interface';
import { IEducatorAgent } from '../educator/interfaces/educator.interface';
import { ResearcherAgent } from '../../two-branch/researcher/researcher-agent';
import { IReportingComparisonAgent } from '../comparison/interfaces/comparison-agent.interface';
import { IDataStore } from '../services/interfaces/data-store.interface';
import { ComparisonAnalysisRequest, ComparisonResult } from '../types/analysis-types';
/**
 * Comparison Orchestrator Service with Interface-Based Dependencies
 */
export declare class ComparisonOrchestrator {
    private configProvider;
    private skillProvider;
    private dataStore;
    private researcherAgent;
    private educatorAgent?;
    private logger?;
    private comparisonAgentInstance?;
    private comparisonAgent;
    private batchLocationEnhancer;
    private locationEnhancer;
    private languageRouter;
    private modelConfigId;
    private primaryModel;
    private fallbackModel;
    private language;
    private repositorySize;
    constructor(configProvider: IConfigProvider, skillProvider: ISkillProvider, dataStore: IDataStore, researcherAgent: ResearcherAgent, educatorAgent?: IEducatorAgent | undefined, logger?: any | undefined, comparisonAgentInstance?: IReportingComparisonAgent | undefined);
    /**
     * Execute comparison analysis with full orchestration
     */
    /**
     * Initialize orchestrator with model configuration from Supabase
     */
    initialize(language?: string, repoSize?: 'small' | 'medium' | 'large' | 'enterprise'): Promise<void>;
    executeComparison(request: ComparisonAnalysisRequest): Promise<ComparisonResult>;
    /**
     * Get configuration from provider
     */
    private getConfiguration;
    /**
     * Get skill data from provider
     */
    private getSkillData;
    /**
     * Update skills based on analysis results
     */
    private updateSkills;
    /**
     * Store analysis report in data store
     */
    private storeAnalysisReport;
    /**
     * Analyze repository context to determine complexity
     */
    private analyzeRepositoryContext;
    /**
     * Calculate dynamic weights based on repository context
     */
    private calculateDynamicWeights;
    /**
     * Ensure DeepWikiAnalysisResult has required properties for AIComparisonAgent
     */
    private ensureCompatibleAnalysisResult;
    /**
     * Convert DeveloperSkills to SkillProfile for AIComparisonAgent
     */
    private convertToSkillProfile;
    /**
     * Convert CategoryWeights to expected format
     */
    private convertWeights;
    /**
     * Process analysis result to expected format
     */
    private processAnalysisResult;
    /**
     * Generate basic markdown report from comparison data
     */
    private generateBasicReport;
    /**
     * Generate PR comment from comparison data
     */
    private generatePRComment;
    /**
     * Build role-specific prompt
     */
    private buildRolePrompt;
    private analyzeFileTypes;
    private inferRepoType;
    /**
     * Get available tools for the detected language and category
     */
    getToolsForLanguage(language?: string, category?: 'security' | 'quality' | 'dependencies' | 'performance'): string[];
    /**
     * Get the specialized agent name for the detected language
     */
    getSpecializedAgent(): string;
    /**
     * Check if all required tools are available for a language
     */
    checkToolAvailability(language?: string): Promise<{
        available: string[];
        missing: string[];
    }>;
    /**
     * Initialize specialized agents with language-specific tool configurations
     * This is called after language detection to configure each role-based agent
     */
    initializeSpecializedAgents(language: string, agents: {
        security?: any;
        performance?: any;
        dependency?: any;
        codeQuality?: any;
    }): Promise<void>;
    /**
     * Get recommended model for a specific language
     * Different models may perform better with different languages
     */
    getRecommendedModelForLanguage(language: string): string;
    private extractUserIds;
    private calculateSkillAdjustments;
    private generateReportId;
    private extractIssues;
    private calculateLinesChanged;
    private calculateCost;
    private calculateOverallScore;
    /**
     * Deduplicate issues for educational content
     * We only need unique issue patterns for education, not every occurrence
     */
    private deduplicateIssuesForEducation;
    /**
     * Extract the core pattern from an issue for deduplication
     */
    private extractIssuePattern;
    /**
     * Check if configuration is stale (older than 90 days)
     */
    private isConfigStale;
    /**
     * Get configuration age as human-readable string
     */
    private getConfigAge;
    /**
     * Get configuration age in days
     */
    private getConfigAgeInDays;
    /**
     * Map size category to repository size
     */
    private mapSizeToCategory;
    /**
     * Alert monitoring system about missing configuration
     */
    private alertConfigMissing;
    /**
     * Alert monitoring system about stale configuration
     */
    private alertStaleConfig;
    private log;
}
