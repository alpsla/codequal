/**
 * Model Configuration Store
 *
 * This service manages loading, saving, and updating model configurations
 * for repository analyses. It works with Supabase to store and retrieve
 * configuration data, including calibration results.
 */
import { RepositoryModelConfig, RepositorySizeCategory } from '../../config/models/repository-model-config';
import { CalibrationTestResult } from './RepositoryCalibrationService';
import { Logger } from '../../utils/logger';
/**
 * Service for storing and retrieving model configurations
 */
export declare class ModelConfigStore {
    private logger;
    private supabaseUrl;
    private supabaseKey;
    /**
     * Supabase client
     */
    private supabase;
    /**
     * Constructor
     * @param logger Logger instance
     * @param supabaseUrl Supabase URL
     * @param supabaseKey Supabase API key
     */
    constructor(logger: Logger, supabaseUrl: string, supabaseKey: string);
    /**
     * Initialize the store
     * Verifies connection to the database and table existence
     *
     * @returns Promise that resolves when initialized
     */
    init(): Promise<void>;
    /**
     * Get model configuration for a language and size category
     *
     * @param language Repository language
     * @param sizeCategory Repository size category
     * @returns Model configuration or null if not found
     */
    getModelConfig(language: string, sizeCategory: RepositorySizeCategory): Promise<RepositoryModelConfig | null>;
    /**
     * Update model configuration for a language and size category
     *
     * @param language Repository language
     * @param sizeCategory Repository size category
     * @param config Model configuration
     * @returns Whether the update was successful
     */
    updateModelConfig(language: string, sizeCategory: RepositorySizeCategory, config: RepositoryModelConfig): Promise<boolean>;
    /**
     * Store calibration results for a language and size category
     *
     * @param language Repository language
     * @param sizeCategory Repository size category
     * @param results Calibration results
     * @returns Whether the storage was successful
     */
    storeCalibrationResults(language: string, sizeCategory: RepositorySizeCategory, results: Record<string, CalibrationTestResult[]>): Promise<boolean>;
    /**
     * Get the most recent calibration results for a language and size category
     *
     * @param language Repository language
     * @param sizeCategory Repository size category
     * @returns Calibration results or null if not found
     */
    getCalibrationResults(language: string, sizeCategory: RepositorySizeCategory): Promise<Record<string, CalibrationTestResult[]> | null>;
    /**
     * Get all stored model configurations
     *
     * @returns Record of language/size to model configurations
     */
    getAllModelConfigs(): Promise<Record<string, Record<RepositorySizeCategory, RepositoryModelConfig>>>;
    /**
     * Store a validated model directly in the database
     * This is used by the Researcher agent after validating model names with OpenRouter
     *
     * @param provider Model provider
     * @param model Model name (validated)
     * @param language Repository language
     * @param sizeCategory Repository size category
     * @param notes Optional notes about the model
     * @returns Whether the storage was successful
     */
    storeValidatedModel(provider: string, model: string, language: string, sizeCategory: RepositorySizeCategory, notes?: string): Promise<boolean>;
    /**
     * Sync database configurations with in-memory configurations
     *
     * @param configMap In-memory configuration map to update
     * @returns Updated configuration map
     */
    syncConfigurations(configMap: Record<string, Record<RepositorySizeCategory, RepositoryModelConfig>>): Promise<Record<string, Record<RepositorySizeCategory, RepositoryModelConfig>>>;
}
