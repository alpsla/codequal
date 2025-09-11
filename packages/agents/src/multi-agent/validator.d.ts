import { MultiAgentConfig, AgentConfig } from './types';
/**
 * Result of a validation operation
 */
export interface ValidationResult {
    valid: boolean;
    errors: string[];
    warnings: string[];
}
/**
 * Validator for multi-agent configurations
 */
export declare class MultiAgentValidator {
    private static logger;
    /**
     * Validate a multi-agent configuration
     * @param config Multi-agent configuration to validate
     * @returns Validation result
     */
    static validateConfig(config: MultiAgentConfig): ValidationResult;
    /**
     * Validate an individual agent configuration
     * @param config Agent configuration
     * @returns Array of validation errors
     */
    static validateAgentConfig(config: AgentConfig): string[];
}
export declare function validateMultiAgentConfig(config: MultiAgentConfig): ValidationResult;
export declare function validateAgentConfig(config: AgentConfig): string[];
export declare function validateAgentAvailability(config: MultiAgentConfig, agentFactory: any): Promise<ValidationResult>;
