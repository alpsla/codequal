/**
 * Model Configuration Factory
 *
 * This module provides factory functions for creating various model configurations
 * based on the centralized ModelVersionSync registry.
 */
import { ModelVersionSync, ModelVersionInfo, RepositoryContext } from './ModelVersionSync';
import { RepositoryModelConfig, RepositorySizeCategory } from '../../config/models/repository-model-config';
import { Logger } from '../../utils/logger';
/**
 * Repository model configuration factory
 */
export declare class ModelConfigurationFactory {
    private logger;
    private modelVersionSync;
    /**
     * Constructor
     *
     * @param logger Logger instance
     * @param modelVersionSync Model version synchronizer
     */
    constructor(logger: Logger, modelVersionSync: ModelVersionSync);
    /**
     * Create repository model configuration for a specific context
     *
     * @param context Repository context
     * @param preferredProvider Optional preferred provider
     * @returns Repository model configuration
     */
    createRepositoryModelConfig(context: RepositoryContext, preferredProvider?: string): Promise<RepositoryModelConfig | null>;
    /**
     * Generate complete model configuration map for all supported languages and sizes
     *
     * @returns Complete configuration map
     */
    generateCompleteModelConfigs(): Record<string, Record<RepositorySizeCategory, RepositoryModelConfig>>;
    /**
     * Create DeepWiki-compatible model config
     *
     * @param modelInfo Model version information
     * @returns DeepWiki model configuration
     */
    createDeepWikiModelConfig(modelInfo: ModelVersionInfo): Record<string, unknown>;
    /**
     * Create an agent-compatible model configuration
     *
     * @param modelInfo Model version information
     * @returns Agent model configuration
     */
    createAgentModelConfig(modelInfo: ModelVersionInfo): Record<string, unknown>;
    /**
     * Get calibration models based on canonical versions
     *
     * @returns Record of provider to model names for calibration
     */
    getCalibrationModels(): Record<string, string[]>;
    /**
     * Update the static REPOSITORY_MODEL_CONFIGS with the latest model configurations
     */
    updateStaticModelConfigs(): void;
}
