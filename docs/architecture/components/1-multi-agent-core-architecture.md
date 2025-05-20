# Multi-Agent Core Architecture

**Last Updated: May 11, 2025**

## Overview

The CodeQual project uses a flexible, adaptive multi-agent architecture to analyze code repositories and pull requests. This document outlines the core architectural components and system design principles.

## Core Principles

1. **Flexibility**: Any agent type can fulfill any functional role in the system
2. **Configuration-driven**: Behavior is determined by configuration, not inheritance
3. **Dynamic prompting**: Prompts are generated based on agent role, position, and context
4. **Unified orchestration**: Results are combined using a consistent approach
5. **Separation of concerns**: Each component has a single, well-defined responsibility
6. **Adaptive selection**: Agent-role combinations are chosen based on context
7. **Continuous learning**: Performance data drives ongoing optimization
8. **Real-world calibration**: All models are calibrated using real repositories and PRs

## Two-Tier Analysis Architecture

CodeQual implements a dual-mode analysis architecture to balance speed and depth:

### Quick PR-Only Analysis
- Focuses only on PR and changed files
- Completes in 1-3 minutes
- Provides immediate feedback for day-to-day development
- Uses lightweight context extraction
- Optimized for rapid iteration during development

### Comprehensive Repository + PR Analysis
- Performs deep repository analysis with DeepWiki followed by PR analysis
- Takes 5-10 minutes for complete results
- Caches repository analysis for future use
- Provides architectural insights and dependency analysis
- Best for major features, architectural changes, or periodic reviews

## System Components

### 1. Agent Evaluation System ✅

Collects and utilizes performance data to select optimal agents for different contexts.

**Key Responsibilities:**
- Store and retrieve agent performance metrics
- Track performance across different contexts
- Evaluate agents on test repositories
- Recommend optimal agent-role combinations
- Learn from historical performance

**Data Collection:**
- Performance on different languages and frameworks
- Effectiveness for different repository sizes
- Success rates for change types (features, bugfixes, etc.)
- Execution metrics (time, tokens, cost)
- User satisfaction ratings

**Implementation Status:** Complete with comprehensive test suite

### 2. Multi-Agent Orchestrator 🔄

Analyzes repository/PR context and determines the required roles and optimal agents.

**Key Responsibilities:**
- Analyze repository and PR characteristics
- Determine which roles are needed for analysis
- Select optimal agents for each role
- Coordinate the execution of agents based on analysis mode
- Combine and organize results

**Orchestration Logic:**
- Repository context extraction via DeepWiki (comprehensive mode only)
- PR context extraction from Git provider APIs (both modes)
- Role determination based on content and analysis mode
- Agent selection through evaluation system
- Result orchestration and prioritization

**Implementation Status:** In progress (60% complete)

### 3. Multi-Agent Factory ✅

Creates agent configurations based on the analysis needs determined by the orchestrator.

**Key Responsibilities:**
- Create agent configurations based on role/analysis type
- Determine primary and secondary agents
- Configure fallback mechanisms
- Apply appropriate configuration parameters
- Provide a unified interface for creating both single and multi-agent setups

**Configuration Parameters:**
- Agent types to use (Claude, GPT, DeepSeek, etc.)
- Primary agent designation
- Secondary agent selection
- Fallback agent prioritization
- Agent-specific parameters (model versions, API keys, etc.)

**Implementation Status:** Complete with fallback functionality

### 4. Prompt Generator 🔄

Generates dynamic, context-aware prompts for each agent based on its role, position, and context.

**Key Responsibilities:**
- Load base templates for each agent type
- Apply role-specific instructions (security, code quality, etc.)
- Add position-specific instructions (primary vs. secondary)
- Include context-specific instructions based on repository/PR
- Generate specialized prompts for orchestrator and reporting functions

**Prompt Construction:**
- Base agent template (specific to Claude, GPT, etc.)
- Role modifier (security, code quality, etc.)
- Position modifier (primary, secondary, fallback, orchestrator, reporter)
- Context modifier (language, frameworks, architecture)
- Special instructions based on agent strengths/weaknesses

**Implementation Status:** In progress (40% complete)

### 5. Multi-Agent Executor 🔲

Runs the configured agents with their generated prompts, handles fallbacks, and collects results.

**Key Responsibilities:**
- Initialize agents with appropriate configurations
- Execute primary and secondary analyses in the most efficient manner
- Implement fallback mechanisms when agents fail
- Collect and validate results from all agents
- Track performance metrics for future optimization

**Execution Modes:**
- Parallel: Run all agents simultaneously for faster results
- Sequential: Run secondary agents after primary for refinement
- Hybrid: Combination of parallel and sequential based on needs

**Fallback Functionality:**
- Priority-based fallback agent selection
- Timeout-triggered fallbacks
- Error-triggered fallbacks
- Result-based fallback decisions
- Partial result completion

**Implementation Status:** Not started (planned for next phase)

### 6. Result Orchestrator 🔲

Combines, deduplicates, and organizes results from multiple agents into a cohesive analysis.

**Key Responsibilities:**
- Deduplicate similar findings across agents
- Categorize insights by type/severity
- Prioritize findings based on importance
- Resolve conflicts between contradictory findings
- Create a consolidated set of results

**Orchestration Functions:**
- Similarity detection between findings
- Category assignment based on content
- Priority ranking based on severity and impact
- Conflict resolution for contradictory findings
- Metadata enrichment for traceability

**Implementation Status:** Not started (planned for future phase)

### 7. Reporting Agent 🔲

Formats the orchestrated results into a polished final report for presentation.

**Key Responsibilities:**
- Convert technical findings into understandable explanations
- Format results according to output requirements
- Emphasize key insights and recommendations
- Provide educational content when appropriate
- Generate different report formats for different audiences

**Implementation Status:** Not started (planned for future phase)

### 8. DeepWiki Integration 🔄

Connects with DeepWiki for comprehensive repository analysis.

**Key Responsibilities:**
- Submitting repositories to DeepWiki for analysis
- Transforming DeepWiki output into usable repository context
- Caching analysis results for future use
- Handling repository updates and cache invalidation
- Optimizing for performance across repository sizes

**Implementation Status:** In progress (scheduled for next phase)

### 9. Supabase & Grafana Integration ✅

Provides data storage and visualization capabilities.

**Key Responsibilities:**
- Storing repository and PR analysis results
- Managing analysis result caching
- Providing performance metrics and historical data
- Powering visualization dashboards
- Supporting business features like user management and billing

**Implementation Status:** Complete with comprehensive implementation

## MCP Server Integration

The architecture includes explicit support for Model Control Plane (MCP) server integration, allowing each agent to be optionally connected to role-specific MCP servers.

**Key Capabilities:**
- Configure agents to use either direct model integration or MCP servers
- Test and compare performance with and without MCP integration
- Mix direct and MCP-based agents in the same analysis
- Evaluate the impact of MCP servers on result quality, cost, and speed
- Implement fallbacks between direct and MCP-based agents

**MCP Implementation Options:**
- Per-agent MCP configuration
- Role-specific MCP servers (specialized for security, code quality, etc.)
- Hybrid approaches with MCP for some roles and direct integration for others
- A/B testing capabilities to evaluate MCP effectiveness

**Advantages of MCP Integration:**
- Enhanced specialization for specific analysis types
- Potential for improved prompting through server-side optimization
- Standardized result formatting through server processing
- Improved security through reduced credential exposure
- Centralized management of model versions and configurations

**Implementation Status:** Basic support implemented, comprehensive integration planned for future phases

## Implementation Guidelines

### Agent Configuration

```typescript
interface AgentConfig {
  provider: AgentProvider;          // Claude, GPT, CodeWhisperer, etc.
  modelVersion?: ModelVersion;      // Specific model version
  role: AgentRole;                  // Security, CodeQuality, etc.
  position: AgentPosition;          // Primary, Secondary, Fallback, etc.
  priority?: number;                // For ordering fallbacks
  filePatterns?: string[];          // For specialized agents
  maxTokens?: number;
  temperature?: number;
  customPrompt?: string;
  useMCP?: boolean;                 // Whether to use MCP server integration
  mcpEndpoint?: string;             // MCP server endpoint if applicable
  mcpParams?: Record<string, any>;  // Additional MCP-specific parameters
}

interface MultiAgentConfig {
  name: string;
  description?: string;
  strategy: AnalysisStrategy;
  agents: AgentConfig[];
  fallbackEnabled: boolean;
  fallbackTimeout?: number;
  fallbackRetries?: number;
  fallbackAgents?: AgentConfig[];
  fallbackStrategy?: 'ordered' | 'parallel';
  combineResults?: boolean;
  maxConcurrentAgents?: number;
  analysisMode: AnalysisMode;      // QUICK or COMPREHENSIVE
}
```

### Prompt Templates

Base templates should be modular with sections that can be combined:

```
// Base agent template (agent-specific)
<agent_base>
You are [AGENT_TYPE], an AI assistant specialized in code analysis.
</agent_base>

// Role modifier
<role_security>
Focus on identifying security vulnerabilities, authentication issues, and potential exploits.
</role_security>

<role_educational>
Focus on creating educational content to help developers learn and improve their skills.
Provide code examples, conceptual explanations, and best practices.
</role_educational>

// Position modifier
<position_primary>
Perform a comprehensive analysis covering all aspects of [ROLE].
</position_primary>

<position_secondary>
Focus particularly on [SPECIALIZED_AREAS] which complement the primary agent's analysis.
</position_secondary>

// Context modifier
<context_language_javascript>
This is a JavaScript codebase using [FRAMEWORK]. Pay particular attention to:
- Asynchronous code patterns
- Event handling
- DOM manipulation security
- Third-party library usage
</context_language_javascript>

// Analysis mode modifier
<mode_quick>
This is a QUICK analysis mode. Focus on the most critical issues only.
Prioritize speed over comprehensiveness.
</mode_quick>

<mode_comprehensive>
This is a COMPREHENSIVE analysis mode. Provide thorough analysis including
architectural implications and deeper security considerations.
</mode_comprehensive>

// MCP-specific instructions
<mcp_instructions>
You are running through an MCP server specialized for [ROLE]. 
Focus on delivering structured insights formatted according to the MCP schema.
</mcp_instructions>

// RAG enhancement instructions
<rag_educational>
Use the provided retrieved code examples to create targeted educational content.
Reference these examples when explaining concepts, and create custom tutorials
based on the developer's apparent skill level.
</rag_educational>
```

### Result Structure

```typescript
interface AnalysisResult {
  insights: Insight[];          // Issues identified in the code
  suggestions: Suggestion[];    // Recommended fixes
  educational: Educational[];   // Learning content related to findings
  metadata: ResultMetadata;     // Information about the analysis process
}

interface Insight {
  type: string;                 // Specific issue type (e.g., "sql_injection")
  category: AnalysisRole;       // Maps to role (e.g., SECURITY, CODE_QUALITY)
  severity: 'high' | 'medium' | 'low'; // Issue severity
  message: string;              // Description of the issue
  source?: AgentType;           // Agent that found the issue
  usedMCP?: boolean;            // Whether MCP was used for this insight
}

interface Educational {
  concept: string;              // Concept being explained
  explanation: string;          // Conceptual explanation 
  examples: CodeExample[];      // Relevant code examples
  resources: Resource[];        // Additional learning resources
  skillLevel: 'beginner' | 'intermediate' | 'advanced'; // Target skill level
}

interface ResultMetadata {
  executionTime: number;
  tokenUsage: {
    input: number;
    output: number;
    total: number;
  };
  agentConfig: AgentConfig;
  analysisMode: AnalysisMode;   // QUICK or COMPREHENSIVE
  repositoryAnalysisAge?: number; // Age of repository analysis in seconds (if COMPREHENSIVE)
  mcpUsed?: boolean;
  mcpLatency?: number;
}
```
