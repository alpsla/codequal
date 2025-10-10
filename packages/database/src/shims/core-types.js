"use strict";
// Minimal type declarations to allow database to build without core
Object.defineProperty(exports, "__esModule", { value: true });
exports.AgentRole = exports.AgentProvider = void 0;
exports.createLogger = createLogger;
function createLogger(name) {
    return {
        debug: (message, data) => console.log(`[DEBUG] [${name}]`, message, data || ''),
        info: (message, data) => console.log(`[INFO] [${name}]`, message, data || ''),
        warn: (message, data) => console.warn(`[WARN] [${name}]`, message, data || ''),
        error: (message, data) => console.error(`[ERROR] [${name}]`, message, data || '')
    };
}
// Agent enums from core/config/agent-registry
var AgentProvider;
(function (AgentProvider) {
    AgentProvider["ANTHROPIC"] = "anthropic";
    AgentProvider["DEEPSEEK"] = "deepseek";
    AgentProvider["OPENAI"] = "openai";
    AgentProvider["GOOGLE"] = "google";
    AgentProvider["OPENROUTER"] = "openrouter";
})(AgentProvider || (exports.AgentProvider = AgentProvider = {}));
var AgentRole;
(function (AgentRole) {
    AgentRole["PR_REVIEWER"] = "pr_reviewer";
    AgentRole["REPO_ANALYZER"] = "repo_analyzer";
    AgentRole["CODE_EXPLAINER"] = "code_explainer";
})(AgentRole || (exports.AgentRole = AgentRole = {}));
//# sourceMappingURL=core-types.js.map