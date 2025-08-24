/**
 * Repository Calibration Service
 *
 * This service handles the calibration process for repositories
 * that don't match our existing tested configurations. It runs
 * tests with different models, collects results, and updates
 * the repository configuration.
 */
import { Logger } from '../../utils/logger';
import { RepositoryContext } from '../../types/repository';
import { RepositoryModelConfig } from '../../config/models/repository-model-config';
import { ModelConfig, DeepWikiProvider, DeepWikiClient } from '../../deepwiki/DeepWikiClient';
import { CalibrationDecision } from './RepositoryModelSelectionService';
import { ModelConfigurationFactory } from './ModelConfigurationFactory';
import { ModelConfigStore } from './ModelConfigStore';
/**
 * Provider types to test during calibration
 * This is a subset of DeepWikiProvider that includes additional models
 */
export type CalibrationProvider = DeepWikiProvider | 'deepseek';
/**
 * Default model names by provider to test during calibration
 * These are used as a fallback if the ModelConfigurationFactory is not available
 */
export declare const DEFAULT_CALIBRATION_MODELS: Record<CalibrationProvider, string[]>;
/**
 * Get the calibration models from the central registry or fallback to defaults
 *
 * @param factory Optional ModelConfigurationFactory instance
 * @returns Record of provider to model names for calibration
 */
export declare function getCalibrationModels(factory?: ModelConfigurationFactory): Record<CalibrationProvider, string[]>;
/**
 * Current calibration models (updated dynamically)
 */
export declare let CALIBRATION_MODELS: Record<CalibrationProvider, string[]>;
/**
 * Calibration test result
 */
export interface CalibrationTestResult {
    /**
     * Model configuration used
     */
    modelConfig: ModelConfig<DeepWikiProvider>;
    /**
     * Response time in seconds
     */
    responseTime: number;
    /**
     * Response size in bytes
     */
    responseSize: number;
    /**
     * Quality score (if evaluated)
     */
    qualityScore?: number;
    /**
     * Any errors encountered
     */
    error?: string;
    /**
     * Test timestamp
     */
    timestamp: string;
}
/**
 * Options for calibration
 */
export interface CalibrationOptions {
    /**
     * Providers to test
     */
    providers: CalibrationProvider[];
    /**
     * Number of test runs per model
     */
    runsPerModel: number;
    /**
     * Whether to evaluate quality manually
     */
    evaluateQuality: boolean;
    /**
     * Test timeout in seconds
     */
    timeout: number;
    /**
     * Whether to update the configuration with results
     */
    updateConfig: boolean;
}
/**
 * Service for repository calibration
 */
export declare class RepositoryCalibrationService {
    private logger;
    private deepWikiClient;
    private configStore;
    /**
     * Default calibration options
     */
    private readonly DEFAULT_OPTIONS;
    /**
     * Configuration factory for model selection
     */
    private configFactory?;
    /**
     * Constructor
     * @param logger Logger instance
     * @param deepWikiClient DeepWiki client for repository analysis
     * @param configStore Configuration store for updating results
     * @param modelConfigFactory Optional model configuration factory
     */
    constructor(logger: Logger, deepWikiClient: DeepWikiClient, configStore: ModelConfigStore, modelConfigFactory?: ModelConfigurationFactory);
    /**
     * Calibrate a repository to find the optimal models
     *
     * @param repository Repository context
     * @param decision Calibration decision
     * @param options Calibration options
     * @returns Calibration results
     */
    calibrateRepository(repository: RepositoryContext, decision: CalibrationDecision, options?: Partial<CalibrationOptions>): Promise<{
        results: Record<string, CalibrationTestResult[]>;
        recommendedConfig: RepositoryModelConfig;
    }>;
    /**
     * Run a single calibration test
     *
     * @param repository Repository context
     * @param modelConfig Model configuration
     * @param timeout Timeout in seconds
     * @returns Test result
     */
    private runCalibrationTest;
    /**
     * Calculate average results for each model
     *
     * @param results Test results by model
     * @returns Average results by model
     */
    private calculateAverages;
    /**
     * Determine the optimal model based on test results
     *
     * @param averages Average test results by model
     * @param sizeCategory Repository size category
     * @param language Repository language
     * @returns Recommended model configuration
     */
    private determineOptimalModel;
    /**
     * Update configuration with calibration results
     *
     * @param language Repository language
     * @param sizeCategory Repository size category
     * @param recommendedConfig Recommended configuration
     * @param results Test results
     */
    private updateConfiguration;
    /**
     * Get size category for a repository
     *
     * @param sizeBytes Repository size in bytes
     * @returns Size category
     */
    private getSizeCategory;
}
