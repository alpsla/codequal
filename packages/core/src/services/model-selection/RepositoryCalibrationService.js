"use strict";
/**
 * Repository Calibration Service
 *
 * This service handles the calibration process for repositories
 * that don't match our existing tested configurations. It runs
 * tests with different models, collects results, and updates
 * the repository configuration.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.RepositoryCalibrationService = exports.CALIBRATION_MODELS = exports.DEFAULT_CALIBRATION_MODELS = void 0;
exports.getCalibrationModels = getCalibrationModels;
const repository_model_config_1 = require("../../config/models/repository-model-config");
/**
 * Default model names by provider to test during calibration
 * These are used as a fallback if the ModelConfigurationFactory is not available
 */
exports.DEFAULT_CALIBRATION_MODELS = {
    'openai': ['gpt-4o'],
    'anthropic': ['claude-3-7-sonnet'],
    'google': ['gemini-2.5-pro-preview-05-06'],
    'deepseek': ['deepseek-coder', 'deepseek-coder-plus'],
    'openrouter': ['anthropic/claude-3.7-sonnet', 'openai/gpt-4o'],
    'ollama': ['qwen3:8b', 'llama3:8b']
};
/**
 * Get the calibration models from the central registry or fallback to defaults
 *
 * @param factory Optional ModelConfigurationFactory instance
 * @returns Record of provider to model names for calibration
 */
function getCalibrationModels(factory) {
    if (factory) {
        // Get calibration models from the factory
        return factory.getCalibrationModels();
    }
    // Fallback to defaults
    return exports.DEFAULT_CALIBRATION_MODELS;
}
/**
 * Current calibration models (updated dynamically)
 */
exports.CALIBRATION_MODELS = exports.DEFAULT_CALIBRATION_MODELS;
/**
 * Service for repository calibration
 */
class RepositoryCalibrationService {
    /**
     * Constructor
     * @param logger Logger instance
     * @param deepWikiClient DeepWiki client for repository analysis
     * @param configStore Configuration store for updating results
     * @param modelConfigFactory Optional model configuration factory
     */
    constructor(logger, deepWikiClient, configStore, modelConfigFactory) {
        this.logger = logger;
        this.deepWikiClient = deepWikiClient;
        this.configStore = configStore;
        /**
         * Default calibration options
         */
        this.DEFAULT_OPTIONS = {
            providers: ['openai', 'anthropic', 'google', 'deepseek'],
            runsPerModel: 3,
            evaluateQuality: true,
            timeout: 120,
            updateConfig: true
        };
        this.logger.info('RepositoryCalibrationService initialized');
        this.configFactory = modelConfigFactory;
        // Update calibration models if factory is provided
        if (this.configFactory) {
            exports.CALIBRATION_MODELS = getCalibrationModels(this.configFactory);
            this.logger.info('Calibration models updated from model configuration factory');
        }
    }
    /**
     * Calibrate a repository to find the optimal models
     *
     * @param repository Repository context
     * @param decision Calibration decision
     * @param options Calibration options
     * @returns Calibration results
     */
    async calibrateRepository(repository, decision, options) {
        // Merge options with defaults
        const fullOptions = {
            ...this.DEFAULT_OPTIONS,
            ...options
        };
        // Log calibration start
        this.logger.info('Starting repository calibration', {
            repository: `${repository.owner}/${repository.repo}`,
            language: repository.language,
            calibrationType: decision.calibrationType,
            providers: fullOptions.providers
        });
        const sizeCategory = this.getSizeCategory(repository.sizeBytes || 0);
        const results = {};
        // Run tests for each provider and model
        for (const provider of fullOptions.providers) {
            for (const modelName of exports.CALIBRATION_MODELS[provider]) {
                const modelKey = `${provider}/${modelName}`;
                results[modelKey] = [];
                try {
                    // Run multiple tests for each model
                    for (let i = 0; i < fullOptions.runsPerModel; i++) {
                        const testResult = await this.runCalibrationTest(repository, {
                            provider: provider,
                            model: modelName
                        }, fullOptions.timeout);
                        results[modelKey].push(testResult);
                    }
                }
                catch (error) {
                    this.logger.error(`Error running calibration for ${modelKey}`, { error });
                    // Add error result
                    results[modelKey].push({
                        modelConfig: {
                            provider: provider,
                            model: modelName
                        },
                        responseTime: 0,
                        responseSize: 0,
                        error: error instanceof Error ? error.message : String(error),
                        timestamp: new Date().toISOString()
                    });
                }
            }
        }
        // Calculate averages and determine the best model
        const averages = this.calculateAverages(results);
        const recommendedConfig = await this.determineOptimalModel(averages, sizeCategory, repository.language);
        // Update configuration if requested
        if (fullOptions.updateConfig) {
            await this.updateConfiguration(repository.language, sizeCategory, recommendedConfig, results);
        }
        // Log calibration completion
        this.logger.info('Completed repository calibration', {
            repository: `${repository.owner}/${repository.repo}`,
            language: repository.language,
            recommendedConfig
        });
        return {
            results,
            recommendedConfig
        };
    }
    /**
     * Run a single calibration test
     *
     * @param repository Repository context
     * @param modelConfig Model configuration
     * @param timeout Timeout in seconds
     * @returns Test result
     */
    async runCalibrationTest(repository, modelConfig, timeout) {
        this.logger.info('Running calibration test', {
            repository: `${repository.owner}/${repository.repo}`,
            modelConfig
        });
        const startTime = Date.now();
        try {
            // Run test with DeepWiki client
            const result = await this.deepWikiClient.getChatCompletionForRepo(repository, {
                messages: [
                    {
                        role: 'system',
                        content: 'You are a repository analyzer. Provide a comprehensive analysis of the repository structure, architecture, and patterns.'
                    },
                    {
                        role: 'user',
                        content: 'Analyze this repository in detail. Describe the main components, architecture patterns, and organization.'
                    }
                ],
                modelConfig,
                timeout: timeout * 1000
            });
            const endTime = Date.now();
            const responseTime = (endTime - startTime) / 1000;
            // Extract response content and calculate size
            const choices = result.choices || [];
            const responseContent = choices.length > 0 && choices[0]?.message?.content || '';
            const responseSize = new TextEncoder().encode(responseContent).length;
            this.logger.info('Calibration test completed', {
                repository: `${repository.owner}/${repository.repo}`,
                modelConfig,
                responseTime,
                responseSize
            });
            return {
                modelConfig,
                responseTime,
                responseSize,
                timestamp: new Date().toISOString()
            };
        }
        catch (error) {
            this.logger.error('Calibration test failed', {
                repository: `${repository.owner}/${repository.repo}`,
                modelConfig,
                error
            });
            return {
                modelConfig,
                responseTime: 0,
                responseSize: 0,
                error: error instanceof Error ? error.message : String(error),
                timestamp: new Date().toISOString()
            };
        }
    }
    /**
     * Calculate average results for each model
     *
     * @param results Test results by model
     * @returns Average results by model
     */
    calculateAverages(results) {
        const averages = {};
        for (const [modelKey, modelResults] of Object.entries(results)) {
            // Filter out errors
            const successfulResults = modelResults.filter(r => !r.error);
            if (successfulResults.length === 0) {
                averages[modelKey] = {
                    modelConfig: modelResults[0].modelConfig,
                    avgResponseTime: 0,
                    avgResponseSize: 0,
                    successRate: 0
                };
                continue;
            }
            // Calculate averages
            const avgResponseTime = successfulResults.reduce((sum, r) => sum + r.responseTime, 0) / successfulResults.length;
            const avgResponseSize = successfulResults.reduce((sum, r) => sum + r.responseSize, 0) / successfulResults.length;
            // Calculate quality score if available
            let avgQualityScore;
            const qualityScores = successfulResults.filter(r => r.qualityScore !== undefined).map(r => r.qualityScore);
            if (qualityScores.length > 0) {
                avgQualityScore = qualityScores.reduce((sum, score) => sum + score, 0) / qualityScores.length;
            }
            // Calculate success rate
            const successRate = successfulResults.length / modelResults.length;
            averages[modelKey] = {
                modelConfig: modelResults[0].modelConfig,
                avgResponseTime,
                avgResponseSize,
                avgQualityScore,
                successRate
            };
        }
        return averages;
    }
    /**
     * Determine the optimal model based on test results
     *
     * @param averages Average test results by model
     * @param sizeCategory Repository size category
     * @param language Repository language
     * @returns Recommended model configuration
     */
    async determineOptimalModel(averages, sizeCategory, language = 'default') {
        const models = Object.values(averages);
        // Filter out models with low success rate
        const reliableModels = models.filter(m => m.successRate > 0.8);
        if (reliableModels.length === 0) {
            // No reliable models, check if we can use the config factory for a recommendation
            if (this.configFactory) {
                const recommendedModel = await this.configFactory.createRepositoryModelConfig({
                    language,
                    sizeCategory,
                    tags: []
                });
                if (recommendedModel) {
                    this.logger.info('Using model recommendation from ModelConfigurationFactory', {
                        language,
                        sizeCategory,
                        provider: recommendedModel.provider,
                        model: recommendedModel.model
                    });
                    // Update to indicate it's a recommendation, not a tested model
                    if (recommendedModel.testResults) {
                        recommendedModel.testResults.status = repository_model_config_1.TestingStatus.PARTIAL;
                    }
                    recommendedModel.notes += ' (Recommended from capabilities, not from calibration)';
                    return recommendedModel;
                }
            }
            // Fallback to default
            this.logger.warn('No reliable models found during calibration', { sizeCategory });
            return {
                id: `calibration-default-${Date.now()}`,
                repository_url: '',
                repository_name: '',
                provider: repository_model_config_1.RepositoryProvider.OTHER,
                primary_language: language,
                languages: [language],
                size_category: sizeCategory,
                framework_stack: [],
                complexity_score: 0.5,
                model: 'gpt-4o',
                testResults: {
                    status: repository_model_config_1.TestingStatus.PARTIAL,
                    avgResponseTime: 0,
                    avgResponseSize: 0,
                    testCount: 0,
                    lastTested: new Date().toISOString()
                },
                notes: 'Default model due to no reliable alternatives during calibration',
                optimal_models: {},
                testing_status: repository_model_config_1.TestingStatus.PARTIAL,
                last_calibration: new Date().toISOString(),
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            };
        }
        // Different selection strategies based on size category
        let selectedModel;
        if (sizeCategory === 'small') {
            // For small repos, prioritize speed
            selectedModel = reliableModels.reduce((best, current) => current.avgResponseTime < best.avgResponseTime ? current : best, reliableModels[0]);
        }
        else if (sizeCategory === 'medium') {
            // For medium repos, balance between detail and speed
            selectedModel = reliableModels.reduce((best, current) => {
                const bestScore = (best.avgQualityScore || 0) * 0.7 - (best.avgResponseTime / 10);
                const currentScore = (current.avgQualityScore || 0) * 0.7 - (current.avgResponseTime / 10);
                return currentScore > bestScore ? current : best;
            }, reliableModels[0]);
        }
        else {
            // For large repos, prioritize detail
            selectedModel = reliableModels.reduce((best, current) => {
                // If quality scores are available, use them
                if (best.avgQualityScore !== undefined && current.avgQualityScore !== undefined) {
                    return current.avgQualityScore > best.avgQualityScore ? current : best;
                }
                // Otherwise use response size as a proxy for detail
                return current.avgResponseSize > best.avgResponseSize ? current : best;
            }, reliableModels[0]);
        }
        // Map DeepWikiProvider to RepositoryProvider
        const mapProvider = (deepWikiProvider) => {
            switch (deepWikiProvider) {
                case 'openai':
                case 'anthropic':
                case 'google':
                case 'deepseek':
                case 'openrouter':
                case 'ollama':
                default:
                    return repository_model_config_1.RepositoryProvider.OTHER;
            }
        };
        // Create recommended config
        return {
            id: `calibration-${Date.now()}`,
            repository_url: '',
            repository_name: '',
            provider: mapProvider(selectedModel.modelConfig.provider),
            primary_language: language,
            languages: [language],
            size_category: sizeCategory,
            framework_stack: [],
            complexity_score: 0.5,
            model: selectedModel.modelConfig.model,
            testResults: {
                status: repository_model_config_1.TestingStatus.TESTED,
                avgResponseTime: selectedModel.avgResponseTime,
                avgResponseSize: selectedModel.avgResponseSize,
                qualityScore: selectedModel.avgQualityScore,
                testCount: reliableModels.length,
                lastTested: new Date().toISOString()
            },
            notes: `Selected based on calibration for ${language}/${sizeCategory} repository size`,
            optimal_models: {},
            testing_status: repository_model_config_1.TestingStatus.TESTED,
            last_calibration: new Date().toISOString(),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };
    }
    /**
     * Update configuration with calibration results
     *
     * @param language Repository language
     * @param sizeCategory Repository size category
     * @param recommendedConfig Recommended configuration
     * @param results Test results
     */
    async updateConfiguration(language, sizeCategory, recommendedConfig, results) {
        try {
            // Normalize language
            const normalizedLang = language.toLowerCase();
            // Update configuration in store
            await this.configStore.updateModelConfig(normalizedLang, sizeCategory, recommendedConfig);
            // Store full test results for future reference
            await this.configStore.storeCalibrationResults(normalizedLang, sizeCategory, results);
            this.logger.info('Updated configuration with calibration results', {
                language: normalizedLang,
                sizeCategory,
                recommendedProvider: recommendedConfig.provider,
                recommendedModel: recommendedConfig.model
            });
        }
        catch (error) {
            this.logger.error('Failed to update configuration with calibration results', {
                language,
                sizeCategory,
                error
            });
        }
    }
    /**
     * Get size category for a repository
     *
     * @param sizeBytes Repository size in bytes
     * @returns Size category
     */
    getSizeCategory(sizeBytes) {
        if (sizeBytes < 5 * 1024 * 1024) { // Less than 5MB
            return repository_model_config_1.RepositorySizeCategory.SMALL;
        }
        else if (sizeBytes < 50 * 1024 * 1024) { // Between 5MB and 50MB
            return repository_model_config_1.RepositorySizeCategory.MEDIUM;
        }
        else {
            return repository_model_config_1.RepositorySizeCategory.LARGE;
        }
    }
}
exports.RepositoryCalibrationService = RepositoryCalibrationService;
