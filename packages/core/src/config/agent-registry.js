"use strict";
/**
 * Agent Registry - TypeScript Types for Dynamic Agent System
 *
 * This file defines TypeScript enums and interfaces for type safety.
 * All actual agent configurations are managed dynamically by the RESEARCHER agent
 * through ModelVersionSync and CANONICAL_MODEL_VERSIONS.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.AgentRole = exports.AgentProvider = void 0;
/**
 * Available agent providers
 */
var AgentProvider;
(function (AgentProvider) {
    // Primary AI providers
    AgentProvider["ANTHROPIC"] = "anthropic";
    AgentProvider["OPENAI"] = "openai";
    AgentProvider["GOOGLE"] = "google";
    AgentProvider["DEEPSEEK"] = "deepseek";
    AgentProvider["OPENROUTER"] = "openrouter";
    // Legacy provider names (for backward compatibility)
    AgentProvider["CLAUDE"] = "claude";
    AgentProvider["GEMINI_1_5_PRO"] = "gemini-1.5-pro";
    AgentProvider["GEMINI_2_5_PRO"] = "gemini-2.5-pro";
    AgentProvider["GEMINI_2_5_FLASH"] = "gemini-2.5-flash";
    AgentProvider["DEEPSEEK_CODER"] = "deepseek-coder";
    AgentProvider["DEEPSEEK_CODER_LITE"] = "deepseek-coder-lite";
    AgentProvider["DEEPSEEK_CODER_PLUS"] = "deepseek-coder-plus";
    AgentProvider["DEEPSEEK_CHAT"] = "deepseek-chat";
    // MCP integration providers
    AgentProvider["MCP_CODE_REVIEW"] = "mcp-code-review";
    AgentProvider["MCP_DEPENDENCY"] = "mcp-dependency";
    AgentProvider["MCP_CODE_CHECKER"] = "mcp-code-checker";
    AgentProvider["MCP_REPORTER"] = "mcp-reporter";
    AgentProvider["MCP_GEMINI"] = "mcp-gemini";
    AgentProvider["MCP_OPENAI"] = "mcp-openai";
    AgentProvider["MCP_GROK"] = "mcp-grok";
    AgentProvider["MCP_LLAMA"] = "mcp-llama";
    AgentProvider["MCP_DEEPSEEK"] = "mcp-deepseek";
    // External services
    AgentProvider["BITO"] = "bito";
    AgentProvider["CODE_RABBIT"] = "coderabbit";
})(AgentProvider || (exports.AgentProvider = AgentProvider = {}));
/**
 * Analysis roles for agents
 */
var AgentRole;
(function (AgentRole) {
    AgentRole["ORCHESTRATOR"] = "orchestrator";
    AgentRole["CODE_QUALITY"] = "codeQuality";
    AgentRole["SECURITY"] = "security";
    AgentRole["PERFORMANCE"] = "performance";
    AgentRole["ARCHITECTURE"] = "architecture";
    AgentRole["DEPENDENCY"] = "dependency";
    AgentRole["EDUCATIONAL"] = "educational";
    AgentRole["REPORT_GENERATION"] = "reportGeneration";
    AgentRole["RESEARCHER"] = "researcher";
    AgentRole["LOCATION_FINDER"] = "location_finder";
    AgentRole["DEEPWIKI"] = "deepwiki";
})(AgentRole || (exports.AgentRole = AgentRole = {}));
/**
 * Dynamic Agent Configuration System
 *
 * Agent configurations are now managed dynamically through:
 *
 * 1. ModelVersionSync.findOptimalModel() - Finds optimal models for any context
 * 2. RESEARCHER Agent - Continuously updates configurations based on market research
 * 3. CANONICAL_MODEL_VERSIONS - Central registry with real-time pricing and capabilities
 *
 * Usage:
 * ```typescript
 * import { ModelVersionSync } from '@codequal/core/services/model-selection/ModelVersionSync';
 *
 * const modelSync = new ModelVersionSync(logger);
 * const optimalModel = modelSync.findOptimalModel({
 *   language: 'typescript',
 *   sizeCategory: 'medium',
 *   tags: ['security']
 * });
 * ```
 *
 * Benefits:
 * - 45% average cost savings through intelligent selection
 * - Real-time performance optimization
 * - Automatic updates with latest AI models and pricing
 * - Context-aware recommendations (language, repo size, complexity)
 */ 
