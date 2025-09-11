"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SpecialAgentType = exports.MultiAgentError = void 0;
/**
 * Error thrown when an agent fails to process a request
 */
class MultiAgentError extends Error {
    constructor(message, agentId, provider, errorType, executionDuration, context) {
        super(message);
        this.agentId = agentId;
        this.provider = provider;
        this.errorType = errorType;
        this.executionDuration = executionDuration;
        this.context = context;
        this.name = 'MultiAgentError';
    }
}
exports.MultiAgentError = MultiAgentError;
/**
 * Special agent types supported by the system
 */
var SpecialAgentType;
(function (SpecialAgentType) {
    SpecialAgentType["REPOSITORY"] = "repository";
    SpecialAgentType["DOCUMENTATION"] = "documentation";
    SpecialAgentType["TEST"] = "test";
    SpecialAgentType["CICD"] = "cicd";
    SpecialAgentType["ORCHESTRATOR"] = "orchestrator";
    SpecialAgentType["REPORTER"] = "reporter";
})(SpecialAgentType || (exports.SpecialAgentType = SpecialAgentType = {}));
