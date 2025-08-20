// Types
export * from './types/agent-types';
export * from './types/research';
export * from './types/recommendation-types';

// Agents
export * from './base/base-agent';
export * from './claude/claude-agent';
export * from './deepseek/deepseek-agent';
export * from './chatgpt/chatgpt-agent';
export * from './gemini/gemini-agent';
// MCP agent archived - use @codequal/mcp-hybrid instead
// CodeWhisperer agent removed

// Specialized Agents
export * from './specialized/dependency-agent';
export * from './specialized/architecture-agent';

// Standard Agent Implementations
export * from './standard/comparison/comparison-agent';
export * from './standard/orchestrator/comparison-orchestrator';
// Export specific items to avoid conflicts
export { 
  ComparisonAgent,
  ComparisonOrchestrator,
  StandardAgentFactory,
  createTestOrchestrator
} from './standard';

// Factory
export * from './factory/agent-factory';

// Multi-Agent System
export * from './multi-agent';
export * from './multi-agent/types';

// Orchestrator
// Report enhancer functionality moved to Standard directory

// Prompts
export * from './prompts/prompt-loader';

// Researcher
export { ResearcherAgent } from './researcher/researcher-agent';
export * from './researcher/researcher-service';
// export * from './researcher/enhanced-model-selection-rules'; // Archived

// Services
export * from './services/skill-tracking-service';
export { ReportFormatterService, StandardReport } from './services/report-formatter.service';
export { RecommendationService } from './services/recommendation-service';
export * from './services/educational-compilation-service';
export { IssueResolutionDetector, type IssueComparison } from './services/issue-resolution-detector';
export * from './services/token-usage-extractor';
export * from './services/model-token-tracker';

// Model Selection
export * from './model-selection/unified-model-selector';
export * from './model-selection/dynamic-model-evaluator';
export * from './model-selection/ai-model-selector';

// Translator
export * from './translator';

// Support
export * from './support/support-chatbot';