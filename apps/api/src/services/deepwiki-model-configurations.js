"use strict";
/**
 * DeepWiki Model Configurations
 * Manages model performance metrics and configurations
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.deepWikiModelConfig = exports.DeepWikiModelConfig = void 0;
const utils_1 = require("@codequal/core/utils");
const logger = (0, utils_1.createLogger)('deepwiki-model-configurations');
class DeepWikiModelConfig {
    constructor() {
        this.performanceMetrics = new Map();
    }
    async updatePerformanceMetrics(language, repositorySize, duration, issuesFound, success) {
        const key = `${language}-${repositorySize}`;
        const existing = this.performanceMetrics.get(key) || {
            averageDuration: 0,
            successRate: 0,
            averageIssuesFound: 0,
            lastUpdated: new Date()
        };
        // Update metrics with rolling average
        const count = existing.successRate > 0 ? 10 : 1; // Assume 10 previous runs
        existing.averageDuration = (existing.averageDuration * count + duration) / (count + 1);
        existing.averageIssuesFound = (existing.averageIssuesFound * count + issuesFound) / (count + 1);
        existing.successRate = success ? (existing.successRate * count + 1) / (count + 1) : existing.successRate * count / (count + 1);
        existing.lastUpdated = new Date();
        this.performanceMetrics.set(key, existing);
        logger.debug('Updated performance metrics', {
            key,
            metrics: existing
        });
    }
    getPerformanceMetrics(language, repositorySize) {
        return this.performanceMetrics.get(`${language}-${repositorySize}`) || null;
    }
    async getModelConfiguration(language, repositorySize) {
        // For now, return null to use Vector DB lookup
        // In a real implementation, this would return pre-researched configurations
        return null;
    }
}
exports.DeepWikiModelConfig = DeepWikiModelConfig;
exports.deepWikiModelConfig = new DeepWikiModelConfig();
