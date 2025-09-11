"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseAgent = void 0;
const utils_1 = require("@codequal/core/utils");
const token_usage_extractor_1 = require("../services/token-usage-extractor");
/**
 * Abstract base class for all agents
 */
class BaseAgent {
    /**
     * @param config Agent configuration
     */
    constructor(config = {}) {
        this.config = config;
        this.logger = (0, utils_1.createLogger)(this.constructor.name);
    }
    /**
     * Log agent activity (for debugging and monitoring)
     * @param message Log message
     * @param data Additional data
     */
    log(message, data) {
        if (this.config.debug) {
            this.logger.debug(message, data);
        }
    }
    /**
     * Handle errors during analysis
     * @param error Error object
     * @returns Empty analysis result
     */
    handleError(error) {
        // Convert error to proper format for logging
        const errorData = error instanceof Error
            ? error
            : { message: String(error) };
        this.logger.error(`Error during analysis:`, errorData);
        return {
            insights: [],
            suggestions: [],
            metadata: {
                error: true,
                message: error instanceof Error ? error.message : String(error)
            }
        };
    }
    /**
     * Extract token usage from API response
     * @param response API response object
     * @returns Token usage or null if not found
     */
    extractTokenUsage(response) {
        try {
            return (0, token_usage_extractor_1.extractTokenUsage)(response);
        }
        catch (error) {
            this.logger.warn('Failed to extract token usage', {
                error: error instanceof Error ? error.message : String(error)
            });
            return null;
        }
    }
    /**
     * Add token usage to analysis result
     * @param result Analysis result
     * @param response API response containing token usage
     * @returns Analysis result with token usage
     */
    addTokenUsage(result, response) {
        const tokenUsage = this.extractTokenUsage(response);
        if (tokenUsage) {
            result.tokenUsage = tokenUsage;
        }
        return result;
    }
}
exports.BaseAgent = BaseAgent;
