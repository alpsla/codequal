/**
 * MCP Tools Configuration Module
 * Central export for all MCP tool-related configurations
 */

export * from './tool-registry.config';
export * from './execution.config';

// Re-export commonly used functions
export { 
  getToolsForRole, 
  getToolsForLanguage, 
  getCriticalTools 
} from './tool-registry.config';

export { 
  getExecutionConfig, 
  getToolExecutionConfig 
} from './execution.config';

// Convenience types
export type { MCPToolDefinition } from './tool-registry.config';
export type { ExecutionConfig, ToolExecutionConfig } from './execution.config';
