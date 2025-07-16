/**
 * MCP Hybrid System - Main exports
 * PR-focused tool integration for CodeQual agents
 */

// Core interfaces and types
export * from './core/interfaces';

// Tool registry
export { toolRegistry, ToolRegistry } from './core/registry';

// Tool initialization
export { initializeTools, verifyToolHealth, getToolStatus } from './core/initialize-tools';

// Tool manager and executor
export { toolManager, MCPToolManager } from './core/tool-manager';
export { toolExecutor, ToolExecutor, ExecutionStrategy, executionExamples } from './core/executor';

// Context selector
export { toolSelector, ContextAwareToolSelector } from './context/selector';

// Base adapters
export { BaseMCPAdapter } from './adapters/mcp/base-mcp-adapter';

// MCP adapters
export { mcpScanAdapter } from './adapters/mcp/mcp-scan';
export { mcpDocsServiceAdapter } from './adapters/mcp/docs-service';
export { contextMCPAdapter } from './adapters/mcp/context-mcp';
export { chartJSMCPAdapter } from './adapters/mcp/chartjs-mcp';
export { eslintMCPAdapter } from './adapters/mcp/eslint-mcp';

// Direct adapters
export { 
  DirectToolAdapter,
  prettierDirectAdapter,
  dependencyCruiserDirectAdapter 
} from './adapters/direct/base-adapter';

// Grafana adapter
export { grafanaDirectAdapter } from './adapters/direct/grafana-adapter';

// Integration components
export {
  AgentToolService,
  ParallelAgentExecutor,
  agentToolService,
  parallelAgentExecutor,
  AgentResult,
  ParallelExecutionOptions
} from './integration/tool-aware-agent';

export {
  AgentToolEnhancer,
  ToolEnhancedAgent,
  AgentEnhancementConfig,
  ToolIntegratedMultiAgentExecutor,
  integrateToolsWithAgent
} from './integration/agent-enhancer';

export {
  ToolEnhancedOrchestrator,
  toolEnhancedOrchestrator,
  OrchestratorFlow,
  ORCHESTRATOR_TOOL_MAPPING
} from './integration/orchestrator-flow';

export {
  MultiAgentToolIntegration,
  MultiAgentToolConfig,
  createToolEnhancedExecutor,
  MCPHybridIntegration
} from './integration/multi-agent-integration';

// Re-export commonly used types for convenience
export type {
  Tool,
  ToolResult,
  ToolFinding,
  AnalysisContext,
  PRContext,
  AgentRole,
  SelectedTools,
  ConsolidatedToolResults
} from './core/interfaces';
