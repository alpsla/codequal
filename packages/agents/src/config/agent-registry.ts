/**
 * Agent Registry - replaces @codequal/core/config/agent-registry
 */

export enum AgentRole {
  SECURITY = 'security',
  ARCHITECTURE = 'architecture',
  PERFORMANCE = 'performance',
  CODE_QUALITY = 'code_quality',
  DEPENDENCIES = 'dependencies',
  DOCUMENTATION = 'documentation',
  TESTING = 'testing',
  EDUCATOR = 'educator',
  RESEARCHER = 'researcher',
  ORCHESTRATOR = 'orchestrator'
}

export enum AgentProvider {
  OPENAI = 'openai',
  ANTHROPIC = 'anthropic',
  GOOGLE = 'google',
  MISTRAL = 'mistral',
  DEEPSEEK = 'deepseek',
  META = 'meta',
  CUSTOM = 'custom'
}

export interface AgentSelection {
  role: AgentRole;
  provider: AgentProvider;
  model: string;
  fallbackProvider?: AgentProvider;
  fallbackModel?: string;
}