/**
 * AI-Powered Comparison Agent - Clean Architecture Implementation
 *
 * This agent intelligently compares analysis results between main and feature branches,
 * providing insights, skill tracking, and report generation capabilities.
 */
import { IReportingComparisonAgent } from './interfaces/comparison-agent.interface';
import { ComparisonResult, ComparisonInput, ComparisonConfig } from '../types/analysis-types';
import { ILogger } from '../services/interfaces/logger.interface';
/**
 * Clean implementation of AI-powered comparison agent
 */
export declare class ComparisonAgent implements IReportingComparisonAgent {
    private logger?;
    private modelService?;
    private skillProvider?;
    private options?;
    private config;
    private modelConfig;
    private modelConfigId;
    private primaryModel;
    private fallbackModel;
    private reportGeneratorV8;
    private useV8Generator;
    private skillCalculator;
    private modelSelector;
    constructor(logger?: ILogger | undefined, modelService?: any | undefined, // Deprecated - using DynamicModelSelector
    skillProvider?: any | undefined, // BUG-012 FIX: Accept skill provider for persistence
    options?: {
        useV8Generator?: boolean;
        reportFormat?: "html" | "markdown";
    } | undefined);
    /**
     * Initialize the agent with configuration
     */
    initialize(config: ComparisonConfig): Promise<void>;
    /**
     * Map complexity to repository size
     */
    private mapComplexityToSize;
    /**
     * Perform comparison analysis
     */
    analyze(input: ComparisonInput): Promise<ComparisonResult>;
    /**
     * Generate markdown report from comparison
     */
    generateReport(comparison: ComparisonResult): Promise<string>;
    /**
     * Generate PR comment from comparison
     */
    generatePRComment(comparison: ComparisonResult): string;
    /**
     * Extract PR comment from V8 format
     */
    private extractPRCommentFromV8;
    /**
     * Generate final report with all enhancements including educational content
     */
    generateFinalReport(params: {
        comparison: ComparisonResult;
        educationalContent?: any;
        prMetadata?: any;
        includeEducation?: boolean;
    }): Promise<{
        report: string;
        prComment: string;
    }>;
    /**
     * Get agent metadata
     */
    getMetadata(): {
        id: string;
        name: string;
        version: string;
        capabilities: string[];
    };
    /**
     * Perform AI-powered comparison using LLM
     */
    private performAIComparison;
    /**
     * Build prompt for AI comparison
     */
    private buildComparisonPrompt;
    /**
     * Convert AI analysis to standard comparison format
     *
     * CRITICAL DATA FLOW DOCUMENTATION
     * =================================
     * This method converts AI analysis results into the standard comparison format.
     *
     * Issue Categories:
     * - resolvedIssues: Issues that were in main branch but NOT in PR branch (fixed)
     * - newIssues: Issues that are in PR branch but NOT in main branch (introduced)
     * - unchangedIssues: Issues that exist in BOTH branches (pre-existing)
     * - modifiedIssues: Issues that changed severity/details between branches
     *
     * IMPORTANT: unchangedIssues represent pre-existing repository issues
     * that should be displayed in reports but are NOT blocking for PR approval
     */
    private convertAIAnalysisToComparison;
    /**
     * Generate insights from AI analysis
     */
    private generateInsights;
    /**
     * Generate recommendations from AI analysis
     */
    private generateRecommendations;
    /**
     * Perform real comparison analysis based on actual DeepWiki data
     * No mocking - uses real issues from repository analysis
     */
    private performRealComparison;
    /**
     * Get default configuration
     */
    private getDefaultConfig;
    /**
     * Get default model configuration
     */
    private getDefaultModelConfig;
    /**
     * Adapt ComparisonResult to V8 AnalysisResult format
     */
    private adaptComparisonToV8Format;
    /**
     * Calculate score based on issues
     */
    private calculateScore;
    /**
     * Log messages
     */
    private log;
}
