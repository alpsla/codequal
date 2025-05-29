import { AgentProvider, AgentRole, AnalysisResult } from '@codequal/core';

/**
 * Defines the position of an agent within a multi-agent system
 */
export enum AgentPosition {
  PRIMARY = 'primary',    // Main agent responsible for initial analysis
  SECONDARY = 'secondary', // Enhances or validates primary agent's analysis
  FALLBACK = 'fallback',   // Used when primary or secondary agents fail
  SPECIALIST = 'specialist' // Used for specific types of analysis based on file types
}

/**
 * Defines the type of analysis to be performed
 */
export enum AnalysisStrategy {
  PARALLEL = 'parallel',     // Run all agents concurrently and combine results
  SEQUENTIAL = 'sequential', // Run primary first, then secondary to enhance results
  SPECIALIZED = 'specialized' // Use specialized agents for specific file types
}

/**
 * Configuration for an individual agent within a multi-agent system
 */
export interface AgentConfig {
  provider: AgentProvider;
  modelVersion?: string;
  role: AgentRole;
  position: AgentPosition;
  priority?: number; // Used for fallback ordering (higher = higher priority)
  filePatterns?: string[]; // For specialized agents, patterns of files to analyze
  maxTokens?: number;
  temperature?: number;
  customPrompt?: string;
  // Additional properties
  agentType?: string;
  parameters?: Record<string, any>;
  focusAreas?: string[];
}

/**
 * Repository data structure passed to agents
 */
export interface RepositoryData {
  owner: string;
  repo: string;
  prNumber?: number;
  branch?: string;
  files: RepositoryFile[];
}

/**
 * Repository file structure
 */
export interface RepositoryFile {
  path: string;
  content: string;
  diff?: string;
  previousContent?: string;
}

/**
 * Configuration for a multi-agent system
 */
export interface MultiAgentConfig {
  name: string;
  description?: string;
  strategy: AnalysisStrategy;
  agents: AgentConfig[];
  fallbackEnabled: boolean; // Whether to use fallback agents if primary/secondary fail
  fallbackTimeout?: number; // Timeout in ms before triggering fallback
  fallbackRetries?: number; // Number of retries for fallback agents
  fallbackAgents?: AgentConfig[]; // Explicit fallback agents to use
  fallbackStrategy?: 'ordered' | 'parallel'; // How to execute fallbacks
  combineResults?: boolean; // Whether to combine results from all agents or use primary only
  maxConcurrentAgents?: number; // Maximum number of agents to run concurrently
  
  // New property for MCP
  useMCP?: boolean; // Whether to use the Model Control Plane
  
  // Legacy properties
  executionMode?: string; // Alias for strategy
  primary?: AgentConfig; // First agent in the agents array
  secondaries?: AgentConfig[]; // Other agents in the agents array
  fallbacks?: AgentConfig[]; // Alias for fallbackAgents
  globalParameters?: Record<string, any>; // Global parameters for all agents
  analysisType?: string; // Type of analysis being performed
  
  // Specialized agent providers
  repositoryProvider?: AgentConfig; // Special repository provider agent
  repositoryInteraction?: AgentConfig; // Special repository interaction agent
  documentationProvider?: AgentConfig; // Special documentation provider agent
  testProvider?: AgentConfig; // Special test provider agent for test-focused analysis
  cicdProvider?: AgentConfig; // Special CI/CD provider agent for pipeline analysis
  orchestrator?: AgentConfig; // Special orchestrator agent for coordinating other agents
  reporter?: AgentConfig; // Special reporter agent for generating reports
}

/**
 * Details about an agent failure for analytics
 */
export interface AgentFailureDetails {
  agentId: string;
  provider: AgentProvider;
  modelVersion?: string;
  errorType: string;
  errorMessage: string;
  timestamp: Date;
  executionDuration: number;
  promptTokens?: number;
  recoveryAttempted: boolean;
  recoverySuccessful?: boolean;
  recoveryStrategy?: string;
  partialOutput?: string;
  context?: Record<string, any>;
}

/**
 * Result details for a single agent in the multi-agent system
 */
export interface AgentResultDetails {
  result?: AnalysisResult;
  error?: Error;
  duration: number;
  agentConfig: AgentConfig;
  tokenUsage?: {
    input: number;
    output: number;
    total: number;
  };
  cost?: number;
  usedFallback?: boolean;
  fallbackAgent?: string;
  fallbackAttempts?: number;
  
  // For failure analysis
  failureDetails?: AgentFailureDetails;
}

/**
 * Result of a multi-agent analysis
 */
export interface MultiAgentResult {
  analysisId: string;
  strategy: AnalysisStrategy;
  config: MultiAgentConfig;
  results: {
    [key: string]: AgentResultDetails
  };
  combinedResult?: AnalysisResult;
  successful: boolean;
  duration: number;
  totalCost: number;
  usedFallback: boolean;
  fallbackStats?: {
    totalFallbackAttempts: number;
    successfulFallbacks: number;
    failedFallbacks: number;
  };
  
  // Failed agents tracking
  failedAgents?: {
    [agentId: string]: AgentFailureDetails
  };
  
  // Legacy properties
  id?: string; // Alias for analysisId
  metadata?: {
    timestamp?: string;
    duration?: number;
    config?: MultiAgentConfig;
    repositoryData?: RepositoryData;
    tokenUsage?: {
      input: number;
      output: number;
      totalCost: number;
    };
    errors?: any[];
  };
  errors?: any[];
}