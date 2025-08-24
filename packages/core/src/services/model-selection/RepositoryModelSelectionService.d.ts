/**
 * Repository Model Selection Service
 *
 * This service helps select the most appropriate model for analyzing
 * repositories and pull requests based on language, size, and analysis type.
 * It leverages the comprehensive testing data and configurations to make
 * optimal model selection decisions.
 */
import { RepositoryModelConfig, RepositorySizeCategory, TestingStatus } from '../../config/models/repository-model-config';
import { RepositoryContext } from '../../types/repository';
import { Logger } from '../../utils/logger';
/**
 * Analysis tiers for different depths of repository analysis
 */
export declare enum AnalysisTier {
    QUICK = "quick",// Fast PR-only analysis
    COMPREHENSIVE = "comprehensive",// Full repository + PR analysis
    TARGETED = "targeted"
}
/**
 * Model selection strategy options
 */
export declare enum ModelSelectionStrategy {
    PERFORMANCE = "performance",// Prioritize speed (for quick analysis)
    BALANCED = "balanced",// Balance between speed and detail
    DETAIL = "detail"
}
/**
 * Calibration decision for a repository context
 */
export interface CalibrationDecision {
    /**
     * Whether calibration is required
     */
    requiresCalibration: boolean;
    /**
     * Type of calibration needed
     */
    calibrationType?: 'full' | 'partial';
    /**
     * Estimated time for calibration in minutes
     */
    estimatedCalibrationTime?: number;
    /**
     * Reason for calibration
     */
    reason?: string;
    /**
     * Temporary configuration to use while waiting for calibration
     */
    temporaryConfig?: RepositoryModelConfig;
    /**
     * Selected configuration if no calibration is needed
     */
    selectedConfig?: RepositoryModelConfig;
}
/**
 * Service for selecting optimal models for repository analysis
 */
export declare class RepositoryModelSelectionService {
    private logger;
    /**
     * Constructor
     * @param logger Logger instance
     */
    constructor(logger: Logger);
    /**
     * Get the optimal model configuration for a repository
     *
     * @param repository Repository context object
     * @param tier Analysis tier (quick, comprehensive, targeted)
     * @param strategy Optional strategy override
     * @returns The recommended model configuration
     */
    getModelForRepository(repository: RepositoryContext, tier?: AnalysisTier, strategy?: ModelSelectionStrategy): RepositoryModelConfig;
    /**
     * Get the optimal model configuration for a PR analysis
     *
     * @param repository Repository context
     * @param prSize Size of PR changes in bytes
     * @param tier Analysis tier
     * @param strategy Optional strategy override
     * @returns The recommended model configuration
     */
    getModelForPR(repository: RepositoryContext, prSize: number, tier?: AnalysisTier, strategy?: ModelSelectionStrategy): RepositoryModelConfig;
    /**
     * Check if a repository needs calibration
     * This is used to identify contexts that haven't been fully tested
     * and might benefit from calibration
     *
     * @param repository Repository context
     * @returns Calibration decision
     */
    checkCalibrationNeeded(repository: RepositoryContext): CalibrationDecision;
    /**
     * Create a unique signature for a repository context
     *
     * @param language Primary language
     * @param frameworks Frameworks used
     * @param architecture Architecture type
     * @returns Context signature
     */
    private createContextSignature;
    /**
     * Identify complex frameworks that might require calibration
     *
     * @param frameworks List of frameworks
     * @returns List of complex frameworks
     */
    private identifyComplexFrameworks;
    /**
     * Estimate calibration time for a repository
     *
     * @param repository Repository context
     * @param calibrationType Type of calibration
     * @returns Estimated calibration time in minutes
     */
    private estimateCalibrationTime;
    /**
     * Get size multiplier for calibration time estimation
     *
     * @param sizeBytes Repository size in bytes
     * @returns Size multiplier
     */
    private getSizeMultiplier;
    /**
     * Get complexity multiplier for calibration time estimation
     *
     * @param repository Repository context
     * @returns Complexity multiplier
     */
    private getComplexityMultiplier;
    /**
     * Select the model configuration based on language, size category, and strategy
     *
     * @param language Primary repository language
     * @param sizeCategory Size category of repository
     * @param strategy Selection strategy
     * @returns Recommended model configuration
     */
    private selectModelConfig;
    /**
     * Get the size category for a repository based on its size in bytes
     *
     * @param sizeBytes Repository size in bytes
     * @returns Size category
     */
    private getSizeCategory;
    /**
     * Get the default model selection strategy for an analysis tier
     *
     * @param tier Analysis tier
     * @returns Selection strategy
     */
    private getStrategyForTier;
}
export type { RepositoryModelConfig, RepositorySizeCategory, TestingStatus };
