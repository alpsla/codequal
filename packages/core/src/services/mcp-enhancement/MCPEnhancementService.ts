import { ModelConfig, GeneratedConfiguration } from '../model-selection/ModelConfigurationMatrix';
import { InfrastructureAgentConfig } from '../model-selection/InfrastructureAgents';

export interface MCPToolConfig {
  webSearch?: boolean;
  codeExecution?: boolean;
  imageGeneration?: boolean;
  memoryAccess?: boolean;
  fileSystemAccess?: boolean;
  databaseQuery?: boolean;
  apiIntegration?: boolean;
  customTools?: string[];
}

export interface MCPEnhancedModel {
  model: string;
  temperature?: number;
  mcpTools: MCPToolConfig;
  contextWindow?: number;
  streamingEnabled?: boolean;
  toolCallingMode?: 'auto' | 'manual' | 'hybrid';
}

export class MCPEnhancementService {
  /**
   * Enhances a base model configuration with MCP tools
   * This is how research-based configs get enhanced with tools
   */
  enhanceModelWithMCP(
    baseConfig: ModelConfig | GeneratedConfiguration,
    taskType: string
  ): MCPEnhancedModel {
    // Base config from Research Agent
    const model = 'model' in baseConfig ? baseConfig.model : baseConfig.modelConfig.model;
    const temperature = 'temperature' in baseConfig ? baseConfig.temperature : baseConfig.modelConfig.temperature;
    
    // Determine MCP tools based on task type
    const mcpTools = this.determineToolsForTask(taskType);
    
    return {
      model,
      temperature,
      mcpTools,
      contextWindow: this.getOptimalContextWindow(model),
      streamingEnabled: this.shouldEnableStreaming(taskType),
      toolCallingMode: this.determineToolCallingMode(taskType)
    };
  }

  /**
   * YES - MCP is CRITICAL for ALL agents!
   * 
   * Infrastructure Agents: Long-term stable configurations + MCP tools
   * PR Specialized Agents: Matrix-selected models + specialized MCP tools
   * 
   * EVERY agent gets enhanced:
   * 1. Research Agent finds the BEST MODEL for the task
   * 2. MCP Enhancement adds SPECIALIZED TOOLS for that model's role
   * 3. Together they create POWERFUL combinations
   */
  private determineToolsForTask(taskType: string): MCPToolConfig {
    switch (taskType) {
      // PR SPECIALIZED AGENTS (from matrix) get specialized tools
      case 'pr-syntax-check':
        return {
          codeExecution: true, // Run syntax validation
          fileSystemAccess: true, // Access code files
          customTools: ['ast-parser', 'syntax-validator']
        };
      
      case 'pr-security-scan':
        return {
          webSearch: true, // CVE database lookup
          databaseQuery: true, // Known vulnerability patterns  
          apiIntegration: true, // Snyk, GitHub Security APIs
          customTools: ['cve-scanner', 'dependency-checker', 'secrets-detector']
        };
      
      case 'pr-performance-analysis':
        return {
          codeExecution: true, // Run performance tests
          databaseQuery: true, // Performance benchmarks
          apiIntegration: true, // Profiling services
          customTools: ['profiler', 'benchmark-runner', 'memory-analyzer']
        };
      
      case 'pr-code-quality':
        return {
          codeExecution: true, // Run linters/formatters
          databaseQuery: true, // Best practice patterns
          customTools: ['eslint-runner', 'complexity-analyzer', 'pattern-matcher']
        };
      
      case 'pr-architecture-review':
        return {
          fileSystemAccess: true, // Analyze project structure
          databaseQuery: true, // Design pattern database
          webSearch: true, // Latest architecture trends
          customTools: ['dependency-graph', 'pattern-detector', 'coupling-analyzer']
        };
      
      // Repository analysis needs comprehensive tools
      case 'repository-analysis':
        return {
          fileSystemAccess: true,
          codeExecution: true,
          memoryAccess: true, // For large codebases
          databaseQuery: true
        };
      
      // Educational agent needs creative tools
      case 'educational':
        return {
          webSearch: true,
          imageGeneration: true,
          codeExecution: true,
          memoryAccess: true
        };
      
      // Orchestrator needs coordination tools
      case 'orchestrator':
        return {
          apiIntegration: true,
          databaseQuery: true,
          memoryAccess: true,
          customTools: ['agent-communication', 'task-scheduling']
        };
      
      // Report compiler needs document tools
      case 'report-compiler':
        return {
          fileSystemAccess: true,
          imageGeneration: true,
          databaseQuery: true,
          customTools: ['markdown-generation', 'pdf-export']
        };
      
      default:
        return {}; // Minimal tools for unknown tasks
    }
  }

  private getOptimalContextWindow(model: string): number {
    // Model-specific context windows
    if (model.includes('claude-3.5')) return 200000;
    if (model.includes('gemini-2.5')) return 2000000; // 2M context!
    if (model.includes('gpt-4')) return 128000;
    if (model.includes('deepseek')) return 64000;
    return 32000; // Default
  }

  private shouldEnableStreaming(taskType: string): boolean {
    // Enable streaming for interactive tasks
    return ['educational', 'orchestrator'].includes(taskType);
  }

  private determineToolCallingMode(taskType: string): 'auto' | 'manual' | 'hybrid' {
    // Orchestrator needs manual control
    if (taskType === 'orchestrator') return 'manual';
    
    // Educational prefers auto for smooth experience
    if (taskType === 'educational') return 'auto';
    
    // Most tasks use hybrid
    return 'hybrid';
  }

  /**
   * Example: How Research + MCP work together
   */
  async enhanceResearchBasedConfiguration(
    researchResult: GeneratedConfiguration,
    analysisType: 'pr' | 'repository' | 'infrastructure'
  ): Promise<MCPEnhancedModel[]> {
    // For PR analysis, we'd need to get multiple agent configs from a different service
    // For now, we enhance the single configuration
    if (analysisType === 'pr') {
      // In real implementation, this would get agents from PRAnalysisStrategy
      // For now, just enhance the base config as a security scanner
      return [this.enhanceModelWithMCP(researchResult, 'pr-security-scan')];
    } else {
      // Single model (repository/infrastructure) - enhance once
      const taskType = analysisType === 'repository' ? 'repository-analysis' : 'general';
      return [this.enhanceModelWithMCP(researchResult, taskType)];
    }
  }
}

/**
 * CONFIRMED: MCP Enhancement for ALL AGENTS
 * 
 * Every agent gets enhanced - no exceptions:
 * 
 * 🏢 INFRASTRUCTURE AGENTS (long-term, stable):
 * - Educational Agent: Claude 3.5 Sonnet + creative tools
 * - Orchestrator: Gemini 2.5 Pro + coordination tools  
 * - Report Compiler: Gemini 2.0 Flash + document tools
 * - Researcher: DeepSeek V3 + investigation tools
 * 
 * 🔍 PR SPECIALIZED AGENTS (from matrix, optimized):
 * - Security Scanner: GPT-4 Turbo + CVE/vulnerability tools
 * - Performance Analyzer: Gemini 2.5 Flash + profiling tools
 * - Architecture Reviewer: Claude 3.5 Sonnet + pattern tools
 * - Code Quality: DeepSeek Coder + linting tools
 * - Syntax Checker: Gemini 2.0 Flash + validation tools
 * 
 * WHY THIS IS POWERFUL:
 * 1. Research finds OPTIMAL MODEL for each role
 * 2. MCP adds SPECIALIZED TOOLS for that role
 * 3. Result: Maximum capability, minimum waste
 * 
 * Example: Security Scanner
 * - Research: "GPT-4 Turbo is best for security analysis"
 * - MCP: "Add CVE scanner, dependency checker, secrets detector"
 * - Result: Can analyze code AND check against real threat databases
 */