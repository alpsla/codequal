/**
 * Agent Registry - TypeScript Types for Dynamic Agent System
 * 
 * This file defines TypeScript enums and interfaces for type safety.
 * All actual agent configurations are managed dynamically by the RESEARCHER agent
 * through ModelVersionSync and CANONICAL_MODEL_VERSIONS.
 */

/**
 * Available agent providers
 */
export enum AgentProvider {
  // Primary AI providers
  ANTHROPIC = 'anthropic',
  OPENAI = 'openai', 
  GOOGLE = 'google',
  DEEPSEEK = 'deepseek',
  OPENROUTER = 'openrouter',
  
  // Legacy provider names (for backward compatibility)
  CLAUDE = 'claude',
  GEMINI_1_5_PRO = 'gemini-1.5-pro',
  GEMINI_2_5_PRO = 'gemini-2.5-pro',
  GEMINI_2_5_FLASH = 'gemini-2.5-flash',
  DEEPSEEK_CODER = 'deepseek-coder',
  DEEPSEEK_CODER_LITE = 'deepseek-coder-lite',
  DEEPSEEK_CODER_PLUS = 'deepseek-coder-plus',
  DEEPSEEK_CHAT = 'deepseek-chat',
  
  // MCP integration providers
  MCP_CODE_REVIEW = 'mcp-code-review',
  MCP_DEPENDENCY = 'mcp-dependency',
  MCP_CODE_CHECKER = 'mcp-code-checker',
  MCP_REPORTER = 'mcp-reporter',
  MCP_GEMINI = 'mcp-gemini',
  MCP_OPENAI = 'mcp-openai',
  MCP_GROK = 'mcp-grok',
  MCP_LLAMA = 'mcp-llama',
  MCP_DEEPSEEK = 'mcp-deepseek',
  
  // External services
  BITO = 'bito',
  CODE_RABBIT = 'coderabbit'
}

/**
 * Analysis roles for agents
 */
export enum AgentRole {
  ORCHESTRATOR = 'orchestrator',
  CODE_QUALITY = 'codeQuality',
  SECURITY = 'security',
  PERFORMANCE = 'performance',
  ARCHITECTURE = 'architecture',
  DEPENDENCY = 'dependency',
  EDUCATIONAL = 'educational',
  REPORT_GENERATION = 'reportGeneration',
  RESEARCHER = 'researcher'
}

/**
 * Agent selection configuration interface (for type safety)
 */
export interface AgentSelection {
  [AgentRole.ORCHESTRATOR]: AgentProvider;
  [AgentRole.CODE_QUALITY]: AgentProvider;
  [AgentRole.SECURITY]: AgentProvider;
  [AgentRole.PERFORMANCE]: AgentProvider;
  [AgentRole.ARCHITECTURE]: AgentProvider;
  [AgentRole.DEPENDENCY]: AgentProvider;
  [AgentRole.EDUCATIONAL]: AgentProvider;
  [AgentRole.REPORT_GENERATION]: AgentProvider;
  [AgentRole.RESEARCHER]?: AgentProvider;
}

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