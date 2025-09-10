"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MultiAgentRegistry = void 0;
exports.getMultiAgentRegistry = getMultiAgentRegistry;
const agent_registry_1 = require("@codequal/core/config/agent-registry");
const types_1 = require("./types");
const factory_1 = require("./factory");
const utils_1 = require("@codequal/core/utils");
/**
 * Registry of predefined multi-agent configurations
 */
class MultiAgentRegistry {
    constructor() {
        this.configs = {};
        this.logger = (0, utils_1.createLogger)('MultiAgentRegistry');
        this.factory = new factory_1.MultiAgentFactory();
        this.initializeDefaultConfigs();
    }
    /**
     * Initialize default configuration presets
     */
    initializeDefaultConfigs() {
        // Add standard code quality configuration
        this.configs.codeQualityStandard = this.factory.createConfigWithFallbacks('Code Quality Standard', types_1.AnalysisStrategy.PARALLEL, { provider: agent_registry_1.AgentProvider.CLAUDE, role: agent_registry_1.AgentRole.CODE_QUALITY }, [{ provider: agent_registry_1.AgentProvider.OPENAI, role: agent_registry_1.AgentRole.CODE_QUALITY }], { description: 'Standard code quality analysis with Claude as primary and OpenAI as secondary' });
        // Add premium code quality configuration
        this.configs.codeQualityPremium = this.factory.createConfigWithFallbacks('Code Quality Premium', types_1.AnalysisStrategy.SEQUENTIAL, { provider: agent_registry_1.AgentProvider.CLAUDE, role: agent_registry_1.AgentRole.CODE_QUALITY }, [{ provider: agent_registry_1.AgentProvider.OPENAI, role: agent_registry_1.AgentRole.CODE_QUALITY, position: types_1.AgentPosition.SECONDARY }], {
            description: 'Premium code quality analysis with Claude as primary and multiple secondary agents',
            maxConcurrentAgents: 3
        });
        // Add security analysis configuration
        this.configs.securityStandard = this.factory.createConfigWithFallbacks('Security Standard', types_1.AnalysisStrategy.PARALLEL, { provider: agent_registry_1.AgentProvider.DEEPSEEK_CODER, role: agent_registry_1.AgentRole.SECURITY }, [{ provider: agent_registry_1.AgentProvider.CLAUDE, role: agent_registry_1.AgentRole.SECURITY, position: types_1.AgentPosition.SECONDARY }], { description: 'Standard security analysis with DeepSeek as primary and Claude as secondary' });
        // Add specialized config
        this.configs.cloudSecuritySpecialized = this.factory.createConfig('Cloud Security Specialized', types_1.AnalysisStrategy.SPECIALIZED, { provider: agent_registry_1.AgentProvider.DEEPSEEK_CODER, role: agent_registry_1.AgentRole.SECURITY, position: types_1.AgentPosition.PRIMARY }, [{ provider: agent_registry_1.AgentProvider.CLAUDE, role: agent_registry_1.AgentRole.SECURITY, position: types_1.AgentPosition.SECONDARY }], [
            { provider: agent_registry_1.AgentProvider.OPENAI, role: agent_registry_1.AgentRole.SECURITY, position: types_1.AgentPosition.FALLBACK, priority: 2 },
            { provider: agent_registry_1.AgentProvider.GEMINI_2_5_PRO, role: agent_registry_1.AgentRole.SECURITY, position: types_1.AgentPosition.FALLBACK, priority: 1 }
        ], {
            description: 'Specialized cloud security analysis with pattern-based file selection',
            fallbackEnabled: true,
            fallbackTimeout: 45000,
        });
        // Add performance analysis config
        this.configs.performanceStandard = this.factory.createConfigWithFallbacks('Performance Standard', types_1.AnalysisStrategy.SEQUENTIAL, { provider: agent_registry_1.AgentProvider.DEEPSEEK_CODER, role: agent_registry_1.AgentRole.PERFORMANCE }, [{ provider: agent_registry_1.AgentProvider.CLAUDE, role: agent_registry_1.AgentRole.PERFORMANCE, position: types_1.AgentPosition.SECONDARY }], { description: 'Standard performance analysis with DeepSeek as primary for its code optimization capabilities' });
        // Add educational content config
        this.configs.educationalStandard = this.factory.createConfigWithFallbacks('Educational Standard', types_1.AnalysisStrategy.SEQUENTIAL, { provider: agent_registry_1.AgentProvider.CLAUDE, role: agent_registry_1.AgentRole.EDUCATIONAL }, [], { description: 'Educational content generation with Claude' });
        this.logger.info(`Initialized ${Object.keys(this.configs).length} multi-agent configurations`);
    }
    /**
     * Get all registered configurations
     */
    getAllConfigs() {
        return { ...this.configs };
    }
    /**
     * Get a specific configuration by name
     */
    getConfig(name) {
        return this.configs[name];
    }
    /**
     * Register a new configuration
     */
    registerConfig(name, config) {
        this.configs[name] = config;
        this.logger.info(`Registered multi-agent configuration: ${name}`);
    }
    /**
     * Find configurations that match certain criteria
     */
    findConfigs(criteria) {
        return Object.values(this.configs).filter(config => {
            // Find primary agent
            const primaryAgent = config.agents.find(agent => agent.position === types_1.AgentPosition.PRIMARY);
            if (!primaryAgent)
                return false;
            // Check if it matches all specified criteria
            if (criteria.strategy && config.strategy !== criteria.strategy)
                return false;
            if (criteria.primaryProvider && primaryAgent.provider !== criteria.primaryProvider)
                return false;
            if (criteria.primaryRole && primaryAgent.role !== criteria.primaryRole)
                return false;
            return true;
        });
    }
    /**
     * Get recommended configuration for a specific role
     */
    getRecommendedConfig(role) {
        // Define mapping of roles to recommended configurations
        const recommendedConfigs = {
            [agent_registry_1.AgentRole.CODE_QUALITY]: 'codeQualityStandard',
            [agent_registry_1.AgentRole.SECURITY]: 'securityStandard',
            [agent_registry_1.AgentRole.PERFORMANCE]: 'performanceStandard',
            [agent_registry_1.AgentRole.EDUCATIONAL]: 'educationalStandard',
            'documentation': 'educationalStandard',
        };
        const configName = recommendedConfigs[role];
        if (!configName || !this.configs[configName]) {
            // Fallback to code quality if no specific recommendation
            return this.configs.codeQualityStandard;
        }
        return this.configs[configName];
    }
}
exports.MultiAgentRegistry = MultiAgentRegistry;
// Singleton instance
let registryInstance = null;
/**
 * Get the multi-agent registry instance
 */
function getMultiAgentRegistry() {
    if (!registryInstance) {
        registryInstance = new MultiAgentRegistry();
    }
    return registryInstance;
}
