/**
 * Core interfaces for MCP Hybrid system
 * Designed for PR-focused analysis without full repository access
 */

export type AgentRole = 
  | 'security' 
  | 'codeQuality' 
  | 'architecture' 
  | 'performance' 
  | 'dependency'
  | 'educational'
  | 'reporting';

export type ToolType = 'mcp' | 'direct';

export type ExecutionMode = 'persistent' | 'on-demand';

/**
 * File data from a PR (changed files only)
 */
export interface FileData {
  path: string;
  content: string;
  language?: string;
  changeType: 'added' | 'modified' | 'deleted';
  diff?: string; // Git diff for the file
}

/**
 * PR-specific context for analysis
 */
export interface PRContext {
  prNumber: number;
  title: string;
  description: string;
  baseBranch: string;
  targetBranch: string;
  author: string;
  files: FileData[];
  commits: Array<{
    sha: string;
    message: string;
    author: string;
  }>;
}

/**
 * Analysis context passed to tools
 * Focused on PR analysis rather than full repository
 */
export interface AnalysisContext {
  agentRole: AgentRole;
  pr: PRContext;
  repository: {
    name: string;
    owner: string;
    // Inferred from PR files
    languages: string[];
    frameworks: string[];
    primaryLanguage?: string;
  };
  userContext: {
    userId: string;
    organizationId?: string;
    permissions: string[];
  };
  // Optional Vector DB config for tool preferences
  vectorDBConfig?: {
    enabledTools?: string[];
    disabledTools?: string[];
    toolConfigs?: Record<string, any>;
  };
}

/**
 * Tool capability definition
 */
export interface ToolCapability {
  name: string;
  category: 'security' | 'quality' | 'performance' | 'architecture' | 'documentation';
  languages?: string[]; // Empty array means all languages
  fileTypes?: string[]; // File extensions this capability applies to
}

/**
 * Tool requirements and constraints
 */
export interface ToolRequirements {
  minFiles?: number;
  maxFiles?: number;
  requiredFileTypes?: string[];
  executionMode: ExecutionMode;
  timeout: number; // milliseconds
  authentication?: {
    type: 'api-key' | 'token' | 'none';
    required: boolean;
  };
}

/**
 * Tool execution result
 */
export interface ToolResult {
  success: boolean;
  toolId: string;
  executionTime: number;
  findings?: ToolFinding[];
  metrics?: Record<string, number>;
  error?: {
    code: string;
    message: string;
    recoverable: boolean;
  };
}

/**
 * Individual finding from a tool
 */
export interface ToolFinding {
  type: 'issue' | 'suggestion' | 'info' | 'metric';
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  category: string;
  message: string;
  file?: string;
  line?: number;
  column?: number;
  ruleId?: string;
  documentation?: string;
  autoFixable?: boolean;
  fix?: {
    description: string;
    changes: Array<{
      file: string;
      line: number;
      oldText: string;
      newText: string;
    }>;
  };
}

/**
 * Core tool interface that works with PR analysis
 */
export interface Tool {
  id: string;
  name: string;
  type: ToolType;
  version: string;
  capabilities: ToolCapability[];
  requirements: ToolRequirements;
  
  /**
   * Check if tool can analyze given PR context
   */
  canAnalyze(context: AnalysisContext): boolean;
  
  /**
   * Execute analysis on PR files
   */
  analyze(context: AnalysisContext): Promise<ToolResult>;
  
  /**
   * Health check for the tool
   */
  healthCheck(): Promise<boolean>;
  
  /**
   * Get tool metadata
   */
  getMetadata(): ToolMetadata;
}

/**
 * Tool metadata for registration and discovery
 */
export interface ToolMetadata {
  id: string;
  name: string;
  description: string;
  author: string;
  homepage?: string;
  documentationUrl?: string;
  supportedRoles: AgentRole[];
  supportedLanguages: string[]; // Empty array means all
  supportedFrameworks?: string[];
  tags: string[];
  securityVerified: boolean;
  lastVerified?: Date;
}

/**
 * Tool configuration stored in Vector DB
 */
export interface ToolConfiguration {
  toolId: string;
  toolType: ToolType;
  enabled: boolean;
  metadata: ToolMetadata;
  performance: {
    avgExecutionTime: number;
    successRate: number;
    lastUsed?: Date;
    totalExecutions: number;
  };
  settings?: Record<string, any>;
}

/**
 * Selected tools for execution
 */
export interface SelectedTools {
  primary: Tool[];
  fallback: Tool[];
  excluded: Array<{
    toolId: string;
    reason: string;
  }>;
}

/**
 * Consolidated tool results
 */
export interface ConsolidatedToolResults {
  findings: ToolFinding[];
  metrics: Record<string, number>;
  toolsExecuted: string[];
  toolsFailed: Array<{
    toolId: string;
    error: string;
  }>;
  executionTime: number;
}

/**
 * Isolated workspace for tool execution
 */
export interface IsolatedWorkspace {
  id: string;
  path: string;
  userId: string;
  limits: {
    cpu: string;
    memory: string;
    timeout: number;
    diskSpace: string;
  };
  cleanup: () => Promise<void>;
}

/**
 * MCP server process for persistent tools
 */
export interface MCPServerProcess {
  toolId: string;
  pid: number;
  port?: number;
  startTime: Date;
  status: 'running' | 'stopped' | 'error';
  restart: () => Promise<void>;
  stop: () => Promise<void>;
}
