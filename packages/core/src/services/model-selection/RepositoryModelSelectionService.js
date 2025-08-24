"use strict";
/**
 * Repository Model Selection Service
 *
 * This service helps select the most appropriate model for analyzing
 * repositories and pull requests based on language, size, and analysis type.
 * It leverages the comprehensive testing data and configurations to make
 * optimal model selection decisions.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.RepositoryModelSelectionService = exports.ModelSelectionStrategy = exports.AnalysisTier = void 0;
const repository_model_config_1 = require("../../config/models/repository-model-config");
/**
 * Analysis tiers for different depths of repository analysis
 */
var AnalysisTier;
(function (AnalysisTier) {
    AnalysisTier["QUICK"] = "quick";
    AnalysisTier["COMPREHENSIVE"] = "comprehensive";
    AnalysisTier["TARGETED"] = "targeted"; // Deep dives into specific architectural aspects
})(AnalysisTier || (exports.AnalysisTier = AnalysisTier = {}));
/**
 * Model selection strategy options
 */
var ModelSelectionStrategy;
(function (ModelSelectionStrategy) {
    ModelSelectionStrategy["PERFORMANCE"] = "performance";
    ModelSelectionStrategy["BALANCED"] = "balanced";
    ModelSelectionStrategy["DETAIL"] = "detail"; // Prioritize detail (for comprehensive analysis)
})(ModelSelectionStrategy || (exports.ModelSelectionStrategy = ModelSelectionStrategy = {}));
/**
 * Service for selecting optimal models for repository analysis
 */
class RepositoryModelSelectionService {
    /**
     * Constructor
     * @param logger Logger instance
     */
    constructor(logger) {
        this.logger = logger;
        this.logger.info('RepositoryModelSelectionService initialized');
    }
    /**
     * Get the optimal model configuration for a repository
     *
     * @param repository Repository context object
     * @param tier Analysis tier (quick, comprehensive, targeted)
     * @param strategy Optional strategy override
     * @returns The recommended model configuration
     */
    getModelForRepository(repository, tier = AnalysisTier.COMPREHENSIVE, strategy) {
        // Determine size category
        const sizeCategory = this.getSizeCategory(repository.sizeBytes || 0);
        // Determine strategy based on tier if not explicitly provided
        const selectionStrategy = strategy || this.getStrategyForTier(tier);
        // Log selection parameters
        this.logger.info('Selecting model for repository', {
            repository: `${repository.owner}/${repository.repo}`,
            language: repository.language,
            sizeCategory,
            tier,
            strategy: selectionStrategy
        });
        // Get model configuration
        const modelConfig = this.selectModelConfig(repository.language, sizeCategory, selectionStrategy);
        // Log selected model
        this.logger.info('Selected model', {
            provider: modelConfig.provider,
            model: modelConfig.model,
            notes: modelConfig.notes
        });
        return modelConfig;
    }
    /**
     * Get the optimal model configuration for a PR analysis
     *
     * @param repository Repository context
     * @param prSize Size of PR changes in bytes
     * @param tier Analysis tier
     * @param strategy Optional strategy override
     * @returns The recommended model configuration
     */
    getModelForPR(repository, prSize, tier = AnalysisTier.QUICK, strategy) {
        // For PR analysis, we may prioritize speed more than repository analysis
        // so we adjust the strategy accordingly
        let selectionStrategy = strategy || this.getStrategyForTier(tier);
        // For quick tier, always prioritize performance unless explicitly overridden
        if (tier === AnalysisTier.QUICK && !strategy) {
            selectionStrategy = ModelSelectionStrategy.PERFORMANCE;
        }
        // For small PRs, optimize for speed regardless of repository size
        // unless we're doing a comprehensive or targeted analysis
        const sizeCategory = tier === AnalysisTier.QUICK && prSize < 500 * 1024
            ? repository_model_config_1.RepositorySizeCategory.SMALL
            : this.getSizeCategory(repository.sizeBytes || 0);
        // Log selection parameters
        this.logger.info('Selecting model for PR analysis', {
            repository: `${repository.owner}/${repository.repo}`,
            language: repository.language,
            sizeCategory,
            prSizeBytes: prSize,
            tier,
            strategy: selectionStrategy
        });
        // Get model configuration
        const modelConfig = this.selectModelConfig(repository.language, sizeCategory, selectionStrategy);
        // Log selected model
        this.logger.info('Selected model for PR', {
            provider: modelConfig.provider,
            model: modelConfig.model,
            notes: modelConfig.notes
        });
        return modelConfig;
    }
    /**
     * Check if a repository needs calibration
     * This is used to identify contexts that haven't been fully tested
     * and might benefit from calibration
     *
     * @param repository Repository context
     * @returns Calibration decision
     */
    checkCalibrationNeeded(repository) {
        const language = repository.language?.toLowerCase();
        const sizeBytes = repository.sizeBytes || 0;
        const sizeCategory = this.getSizeCategory(sizeBytes);
        const frameworks = repository.frameworks || [];
        // Create a unique context signature for comparison
        const contextSignature = this.createContextSignature(language, frameworks, repository.metadata?.architecture);
        this.logger.info('Checking calibration needed', {
            repository: `${repository.owner}/${repository.repo}`,
            language,
            sizeCategory,
            frameworks,
            contextSignature
        });
        // Check if we have configurations for this language
        const repositoryConfigs = repository_model_config_1.REPOSITORY_MODEL_CONFIGS;
        if (!repositoryConfigs[language]) {
            return {
                requiresCalibration: true,
                calibrationType: 'full',
                estimatedCalibrationTime: this.estimateCalibrationTime(repository),
                reason: `No configurations found for language: ${language}`,
                temporaryConfig: repository_model_config_1.REPOSITORY_MODEL_CONFIGS.default?.[sizeCategory]
            };
        }
        // Get the configuration for this language and size
        const config = repositoryConfigs[language]?.[sizeCategory];
        // Check if the configuration has been fully tested
        if (config.testResults?.status !== repository_model_config_1.TestingStatus.TESTED) {
            return {
                requiresCalibration: true,
                calibrationType: config.testResults?.status === repository_model_config_1.TestingStatus.PARTIAL ? 'partial' : 'full',
                estimatedCalibrationTime: this.estimateCalibrationTime(repository, config.testResults?.status === repository_model_config_1.TestingStatus.PARTIAL ? 'partial' : 'full'),
                reason: `Configuration for ${language}/${sizeCategory} has not been fully tested (${config.testResults?.status})`,
                temporaryConfig: config
            };
        }
        // For complex frameworks, we might need additional calibration
        if (frameworks.length > 0) {
            const complexFrameworks = this.identifyComplexFrameworks(frameworks);
            if (complexFrameworks.length > 0) {
                return {
                    requiresCalibration: true,
                    calibrationType: 'partial',
                    estimatedCalibrationTime: this.estimateCalibrationTime(repository, 'partial'),
                    reason: `Repository uses complex frameworks: ${complexFrameworks.join(', ')}`,
                    temporaryConfig: config
                };
            }
        }
        // No calibration needed
        return {
            requiresCalibration: false,
            selectedConfig: config
        };
    }
    /**
     * Create a unique signature for a repository context
     *
     * @param language Primary language
     * @param frameworks Frameworks used
     * @param architecture Architecture type
     * @returns Context signature
     */
    createContextSignature(language, frameworks, architecture) {
        // Normalize and sort frameworks
        const normalizedFrameworks = frameworks
            .map(f => f.toLowerCase())
            .sort()
            .join(',');
        return `${language.toLowerCase()}|${normalizedFrameworks}|${architecture || 'unknown'}`;
    }
    /**
     * Identify complex frameworks that might require calibration
     *
     * @param frameworks List of frameworks
     * @returns List of complex frameworks
     */
    identifyComplexFrameworks(frameworks) {
        // List of frameworks that are considered complex and might require calibration
        const complexFrameworkPatterns = [
            /^react-native$/i,
            /^angular$/i,
            /^svelte$/i,
            /^next\.?js$/i,
            /^nuxt\.?js$/i,
            /^electron$/i,
            /^flutter$/i,
            /^django$/i,
            /^spring-boot$/i,
            /^quarkus$/i,
            /^symphony$/i,
            /^laravel$/i
        ];
        return frameworks.filter(framework => complexFrameworkPatterns.some(pattern => pattern.test(framework)));
    }
    /**
     * Estimate calibration time for a repository
     *
     * @param repository Repository context
     * @param calibrationType Type of calibration
     * @returns Estimated calibration time in minutes
     */
    estimateCalibrationTime(repository, calibrationType = 'full') {
        const baseTime = calibrationType === 'full' ? 20 : 10;
        const sizeMultiplier = this.getSizeMultiplier(repository.sizeBytes || 0);
        const complexityMultiplier = this.getComplexityMultiplier(repository);
        return Math.ceil(baseTime * sizeMultiplier * complexityMultiplier);
    }
    /**
     * Get size multiplier for calibration time estimation
     *
     * @param sizeBytes Repository size in bytes
     * @returns Size multiplier
     */
    getSizeMultiplier(sizeBytes) {
        if (sizeBytes < 1 * 1024 * 1024) { // < 1MB
            return 0.5;
        }
        else if (sizeBytes < 10 * 1024 * 1024) { // < 10MB
            return 1.0;
        }
        else if (sizeBytes < 50 * 1024 * 1024) { // < 50MB
            return 1.5;
        }
        else if (sizeBytes < 100 * 1024 * 1024) { // < 100MB
            return 2.0;
        }
        else {
            return 3.0;
        }
    }
    /**
     * Get complexity multiplier for calibration time estimation
     *
     * @param repository Repository context
     * @returns Complexity multiplier
     */
    getComplexityMultiplier(repository) {
        let multiplier = 1.0;
        // Add complexity for frameworks
        if (repository.frameworks && repository.frameworks.length > 0) {
            multiplier += 0.2 * Math.min(repository.frameworks.length, 3);
        }
        // Add complexity for multiple languages
        if (repository.secondaryLanguages && repository.secondaryLanguages.length > 0) {
            multiplier += 0.1 * Math.min(repository.secondaryLanguages.length, 5);
        }
        // Add complexity for large contributor count
        if (repository.contributorCount && repository.contributorCount > 10) {
            multiplier += 0.1 * Math.min(Math.floor(repository.contributorCount / 10), 5);
        }
        return multiplier;
    }
    /**
     * Select the model configuration based on language, size category, and strategy
     *
     * @param language Primary repository language
     * @param sizeCategory Size category of repository
     * @param strategy Selection strategy
     * @returns Recommended model configuration
     */
    selectModelConfig(language, sizeCategory, strategy) {
        // Normalize language
        const normalizedLang = language?.toLowerCase() || 'default';
        // Get the baseline configuration
        const repositoryConfigs = repository_model_config_1.REPOSITORY_MODEL_CONFIGS;
        const config = repositoryConfigs[normalizedLang]?.[sizeCategory]
            || repositoryConfigs.default?.[sizeCategory];
        // For performance strategy, prioritize OpenAI for speed
        if (strategy === ModelSelectionStrategy.PERFORMANCE) {
            // Small repositories always use OpenAI for speed
            if (sizeCategory === repository_model_config_1.RepositorySizeCategory.SMALL) {
                return repository_model_config_1.REPOSITORY_MODEL_CONFIGS.default?.[repository_model_config_1.RepositorySizeCategory.SMALL] || config;
            }
            // For medium repositories, use OpenAI if testing status is not completed
            if (sizeCategory === repository_model_config_1.RepositorySizeCategory.MEDIUM &&
                config.testResults?.status !== repository_model_config_1.TestingStatus.TESTED) {
                return repository_model_config_1.REPOSITORY_MODEL_CONFIGS.default?.[repository_model_config_1.RepositorySizeCategory.SMALL] || config;
            }
            // Return the standard config for this language/size
            return config;
        }
        // For detail strategy, use the most detailed model for the language
        if (strategy === ModelSelectionStrategy.DETAIL) {
            // For medium/large repositories, use Claude for maximum detail
            // unless the language has a tested configuration
            if ((sizeCategory === repository_model_config_1.RepositorySizeCategory.MEDIUM || sizeCategory === repository_model_config_1.RepositorySizeCategory.LARGE) &&
                config.testResults?.status !== repository_model_config_1.TestingStatus.TESTED) {
                return repository_model_config_1.REPOSITORY_MODEL_CONFIGS.default?.[repository_model_config_1.RepositorySizeCategory.MEDIUM] || config; // Claude has best detail for unknown langs
            }
            // Return the standard config for this language/size
            return config;
        }
        // For balanced strategy (default), use the standard config
        return config;
    }
    /**
     * Get the size category for a repository based on its size in bytes
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
    /**
     * Get the default model selection strategy for an analysis tier
     *
     * @param tier Analysis tier
     * @returns Selection strategy
     */
    getStrategyForTier(tier) {
        switch (tier) {
            case AnalysisTier.QUICK:
                return ModelSelectionStrategy.PERFORMANCE;
            case AnalysisTier.COMPREHENSIVE:
                return ModelSelectionStrategy.BALANCED;
            case AnalysisTier.TARGETED:
                return ModelSelectionStrategy.DETAIL;
            default:
                return ModelSelectionStrategy.BALANCED;
        }
    }
}
exports.RepositoryModelSelectionService = RepositoryModelSelectionService;
