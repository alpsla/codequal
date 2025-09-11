"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MultiAgentValidator = void 0;
exports.validateMultiAgentConfig = validateMultiAgentConfig;
exports.validateAgentConfig = validateAgentConfig;
exports.validateAgentAvailability = validateAgentAvailability;
const types_1 = require("./types");
const utils_1 = require("@codequal/core/utils");
/**
 * Validator for multi-agent configurations
 */
class MultiAgentValidator {
    /**
     * Validate a multi-agent configuration
     * @param config Multi-agent configuration to validate
     * @returns Validation result
     */
    static validateConfig(config) {
        const errors = [];
        const warnings = [];
        // Check for basic required fields
        if (!config.name) {
            errors.push('Configuration name is required');
        }
        if (!config.strategy) {
            errors.push('Analysis strategy is required');
        }
        else if (!Object.values(types_1.AnalysisStrategy).includes(config.strategy)) {
            errors.push(`Invalid analysis strategy: ${config.strategy}`);
        }
        // Validate agents
        if (!config.agents || config.agents.length === 0) {
            errors.push('At least one agent is required');
        }
        else {
            // Check for primary agent (first agent should be the primary)
            if (config.agents[0].position !== types_1.AgentPosition.PRIMARY) {
                errors.push('First agent must be the primary agent');
            }
            // Validate each agent
            config.agents.forEach((agent, index) => {
                const agentErrors = this.validateAgentConfig(agent);
                agentErrors.forEach(error => {
                    errors.push(`Agent ${index}: ${error}`);
                });
            });
            // Warn if secondary agents are present but not primary
            const hasSecondary = config.agents.some(agent => agent.position === types_1.AgentPosition.SECONDARY);
            const hasPrimary = config.agents.some(agent => agent.position === types_1.AgentPosition.PRIMARY);
            if (hasSecondary && !hasPrimary) {
                warnings.push('Secondary agents present without a primary agent');
            }
        }
        // If fallback is enabled, check for fallback agents
        if (config.fallbackEnabled) {
            if (!config.fallbackAgents || config.fallbackAgents.length === 0) {
                warnings.push('Fallback is enabled but no fallback agents are defined');
            }
            else {
                // Validate fallback agents
                config.fallbackAgents.forEach((agent, index) => {
                    if (agent.position !== types_1.AgentPosition.FALLBACK) {
                        errors.push(`Fallback agent ${index} must have position set to FALLBACK`);
                    }
                    const agentErrors = this.validateAgentConfig(agent);
                    agentErrors.forEach(error => {
                        errors.push(`Fallback agent ${index}: ${error}`);
                    });
                });
            }
        }
        // Strategy-specific validation
        if (config.strategy === types_1.AnalysisStrategy.SPECIALIZED) {
            const hasSpecialist = config.agents.some(agent => agent.position === types_1.AgentPosition.SPECIALIST);
            if (!hasSpecialist) {
                warnings.push('Specialized strategy would benefit from having specialist agents');
            }
            // Check that agents have focus areas defined
            config.agents.forEach((agent, index) => {
                if (!agent.focusAreas || agent.focusAreas.length === 0) {
                    warnings.push(`Agent ${index} does not have focus areas defined, which is recommended for specialized strategy`);
                }
            });
        }
        return {
            valid: errors.length === 0,
            errors,
            warnings
        };
    }
    /**
     * Validate an individual agent configuration
     * @param config Agent configuration
     * @returns Array of validation errors
     */
    static validateAgentConfig(config) {
        const errors = [];
        // Check for required fields
        if (!config.provider) {
            errors.push('Provider is required');
        }
        if (!config.role) {
            errors.push('Role is required');
        }
        if (!config.position) {
            errors.push('Position is required');
        }
        else if (!Object.values(types_1.AgentPosition).includes(config.position)) {
            errors.push(`Invalid position: ${config.position}`);
        }
        // Validate parameters
        if (config.temperature !== undefined) {
            const temp = config.temperature;
            if (typeof temp === 'number' && (temp < 0 || temp > 1)) {
                errors.push('Temperature must be between 0 and 1');
            }
        }
        // Validate max tokens if present
        if (config.maxTokens !== undefined) {
            const tokens = config.maxTokens;
            if (typeof tokens === 'number' && (tokens < 100 || tokens > 100000)) {
                errors.push('Max tokens must be between 100 and 100000');
            }
        }
        // Additional validation if needed
        return errors;
    }
}
exports.MultiAgentValidator = MultiAgentValidator;
MultiAgentValidator.logger = (0, utils_1.createLogger)('MultiAgentValidator');
// Export functions for compatibility with tests
function validateMultiAgentConfig(config) {
    return MultiAgentValidator.validateConfig(config);
}
function validateAgentConfig(config) {
    return MultiAgentValidator.validateAgentConfig(config);
}
async function validateAgentAvailability(config, agentFactory) {
    const errors = [];
    const warnings = [];
    try {
        // Validate primary agent
        const primaryAgent = config.agents.find(agent => agent.position === types_1.AgentPosition.PRIMARY);
        if (primaryAgent) {
            try {
                await agentFactory.createAgent(primaryAgent.provider, primaryAgent.role, {
                    position: primaryAgent.position
                });
            }
            catch (error) {
                errors.push(`Cannot create primary agent: ${error.message}`);
            }
        }
        // Validate secondary agents if fallbacks are disabled
        if (!config.fallbackEnabled) {
            const secondaryAgents = config.agents.filter(agent => agent.position === types_1.AgentPosition.SECONDARY);
            for (const agent of secondaryAgents) {
                try {
                    await agentFactory.createAgent(agent.provider, agent.role, {
                        position: agent.position
                    });
                }
                catch (error) {
                    errors.push(`Cannot create secondary agent: ${error.message}`);
                }
            }
        }
    }
    catch (error) {
        errors.push(`Validation error: ${error.message}`);
    }
    return {
        valid: errors.length === 0,
        errors,
        warnings
    };
}
