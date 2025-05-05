# Multi-Agent Architecture for CodeQual

**Last Updated: May 4, 2025**

## Overview

The CodeQual project uses a flexible, adaptive multi-agent architecture to analyze code repositories and pull requests. This document outlines the design principles, component interactions, and implementation guidelines for the multi-agent system.

## Core Principles

1. **Flexibility**: Any agent type can fulfill any functional role in the system
2. **Configuration-driven**: Behavior is determined by configuration, not inheritance
3. **Dynamic prompting**: Prompts are generated based on agent role, position, and context
4. **Unified orchestration**: Results are combined using a consistent approach
5. **Separation of concerns**: Each component has a single, well-defined responsibility
6. **Adaptive selection**: Agent-role combinations are chosen based on context
7. **Continuous learning**: Performance data drives ongoing optimization

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

### 8. DeepWiki Integration 🔲

Connects with DeepWiki for comprehensive repository analysis.

**Key Responsibilities:**
- Submitting repositories to DeepWiki for analysis
- Transforming DeepWiki output into usable repository context
- Caching analysis results for future use
- Handling repository updates and cache invalidation
- Optimizing for performance across repository sizes

**Implementation Status:** Not started (planned for next phase)

### 9. Supabase & Grafana Integration 🔲

Provides data storage and visualization capabilities.

**Key Responsibilities:**
- Storing repository and PR analysis results
- Managing analysis result caching
- Providing performance metrics and historical data
- Powering visualization dashboards
- Supporting business features like user management and billing

**Implementation Status:** Not started (planned for next phase)

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

## Context-Adaptive Role Determination

The orchestrator determines which roles are required for a specific PR based on its characteristics:

```typescript
private determineRequiredRoles(
  context: RepositoryContext,
  prContext: PRContext,
  analysisMode: AnalysisMode
): AgentRole[] {
  const roles: AgentRole[] = [];
  
  // Code quality is almost always needed
  roles.push(AgentRole.CODE_QUALITY);
  
  // For quick mode, limit additional roles based on PR characteristics
  if (analysisMode === AnalysisMode.QUICK) {
    // Only add security if obviously needed
    if (this.containsHighRiskSecurityChanges(prContext)) {
      roles.push(AgentRole.SECURITY);
    }
    
    // Only add performance if clearly performance-critical
    if (this.containsHighlyPerformanceCriticalCode(prContext)) {
      roles.push(AgentRole.PERFORMANCE);
    }
    
    return roles; // Return reduced set for quick mode
  }
  
  // For comprehensive mode, add more roles based on deep analysis
  // Security analysis for:
  if (
    this.containsSecuritySensitiveChanges(prContext) ||  // Authentication changes, etc.
    this.containsThirdPartyDependencies(prContext) ||    // New dependencies
    this.containsConfigChanges(prContext) ||             // Configuration changes
    this.affectsSecurityComponents(context, prContext)   // Based on repository context
  ) {
    roles.push(AgentRole.SECURITY);
  }
  
  // Performance analysis for:
  if (
    this.containsPerformanceSensitiveCode(prContext) ||  // Database queries, loops, etc.
    this.containsAlgorithmChanges(prContext) ||          // Algorithm modifications
    this.touchesHighTrafficComponents(context, prContext) || // High-usage components
    this.affectsPerformanceCriticalPaths(context, prContext) // Based on repository context
  ) {
    roles.push(AgentRole.PERFORMANCE);
  }
  
  // Educational content for:
  if (
    this.isComplexChange(prContext) ||                  // Complex changes
    this.isFromJuniorDeveloper(prContext) ||            // Junior developers
    this.touchesUnfamiliarArea(context, prContext) ||   // Unfamiliar code areas
    this.involvesAdvancedPatterns(context, prContext)   // Based on repository context
  ) {
    roles.push(AgentRole.EDUCATIONAL);
  }
  
  // Documentation analysis for:
  if (
    this.containsPublicAPIs(prContext) ||               // Public API changes
    this.containsSignificantNewFeatures(prContext) ||   // New features
    this.affectsDocumentedComponents(context, prContext) // Based on repository context
  ) {
    roles.push(AgentRole.DOCUMENTATION);
  }
  
  return roles;
}
```

## Agent Roles

In this architecture, any agent type can fulfill any of these functional roles:

### Analysis Agents

**Primary Agent:**
- Comprehensive analysis of assigned area
- Focus on core issues in the domain
- Broad coverage of the codebase

**Secondary Agent:**
- Complementary analysis focusing on gaps
- Specialized analysis in agent's strength areas
- Verification/contradiction of primary agent findings

**Fallback Agent:**
- Activated when primary or secondary agents fail
- May have different strengths/weaknesses
- Prioritized based on effectiveness for the role
- Configured with failure context awareness

### Support Agents

**Repository Data Provider:**
- Connects to source control APIs (GitHub, GitLab, Azure DevOps)
- Fetches code, diffs, PR metadata, commit history
- Processes and structures repository data for analysis
- Manages caching to reduce API calls
- Provides unified data interface for other agents

**Repository Interaction Provider:**
- Adds review comments to code
- Submits approvals/rejections based on analysis results
- Creates follow-up PRs with suggested fixes
- Manages issue creation and tracking
- Handles PR descriptions and summaries

**Documentation Provider:**
- Generates/updates documentation based on code changes
- Creates/updates READMEs for new features
- Maintains API documentation
- Updates changelogs automatically
- Generates architecture documentation

**Test Provider:**
- Generates unit tests for new code
- Updates existing tests to match code changes
- Provides test coverage analysis
- Suggests test improvements
- Creates test plans for new features

**CI/CD Provider:**
- Integrates with build systems
- Monitors deployment processes
- Provides release notes generation
- Updates deployment configurations
- Handles infrastructure as code updates

### Orchestrator Agent

- Categorization of findings across agents
- Deduplication of similar insights
- Prioritization of issues by severity
- Organization of results into meaningful structure
- Resolution of conflicting findings

### Reporting Agent

- Creation of executive summaries
- Detailed explanation of technical issues
- Educational content related to findings
- Actionable recommendations for improvement
- Customized reporting for different audiences

## Implementation Guidelines

### 1. Agent Evaluation Data

```typescript
interface AgentRoleEvaluationParameters {
  // Basic agent capabilities
  agent: {
    provider: AgentProvider;
    modelVersion: ModelVersion;
    maxTokens: number;
    costPerToken: number;
    averageLatency: number;
  };
  
  // Role-specific performance metrics
  rolePerformance: {
    [role in AgentRole]: {
      overallScore: number;         // 0-100 performance score
      specialties: string[];        // e.g., "JavaScript", "Security", "API Design"
      weaknesses: string[];         // e.g., "Large Codebase", "C++", "Concurrency"
      bestPerformingLanguages: Record<string, number>; // 0-100 scores by language
      bestFileTypes: Record<string, number>;           // 0-100 scores by file type
      bestScenarios: Record<string, number>;           // 0-100 scores by scenario
    };
  };
  
  // Repository and PR-specific performance
  repoCharacteristics: {
    sizePerformance: Record<string, number>;          // By repo size
    complexityPerformance: Record<string, number>;    // By complexity
    architecturePerformance: Record<string, number>;  // By architecture
  };
  prCharacteristics: {
    sizePerformance: Record<string, number>;          // By PR size
    changeTypePerformance: Record<string, number>;    // By change type
  };
  
  // Additional metrics
  frameworkPerformance: Record<string, number>;       // By framework
  historicalPerformance: {
    totalRuns: number;
    successRate: number;                              // 0-1.0
    averageUserSatisfaction: number;                  // 0-100
    tokenUtilization: number;                         // Efficiency
    averageFindingQuality: number;                    // 0-100
  };
  
  // MCP-specific metrics
  mcpPerformance?: {
    withMCP: {
      qualityScore: number;                           // 0-100
      speedScore: number;                             // 0-100
      costEfficiency: number;                         // 0-100
    };
    withoutMCP: {
      qualityScore: number;                           // 0-100
      speedScore: number;                             // 0-100
      costEfficiency: number;                         // 0-100
    };
    recommendMCP: boolean;                            // Whether MCP is recommended
  };
}
```

### 2. Agent Configuration

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

### 3. Prompt Templates

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
```

### 4. Result Structure

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

## Model Calibration for Dynamic Configuration

A critical aspect of our system is proper model calibration to enable accurate dynamic configuration. This calibration should be performed at specific intervals and in response to certain triggers:

### Calibration Schedule

1. **Initial Calibration** (Before Launch):
   - Comprehensive testing across 100+ repositories of various sizes and languages
   - Evaluation of each model provider across all supported roles
   - Creation of baseline performance metrics
   - Establishment of initial scoring weights

2. **Periodic Recalibration** (Every 3 Months):
   - Scheduled re-evaluation of all models with updated test cases
   - Incorporation of new language versions and frameworks
   - Adjustment of scoring weights based on historical performance
   - Update of language support tiers and specializations

3. **Event-Based Recalibration**:
   - When a provider releases a major model version update
   - When performance metrics show significant deviation from expected values
   - When adding support for new languages or frameworks
   - After collecting sufficient user feedback indicating potential improvements

### Calibration Test Suite

The calibration process should use a comprehensive test suite including:

1. **Repository Collection**:
   - Diverse set of repositories across all supported languages
   - Various sizes (small, medium, large, enterprise)
   - Different architectures (monolith, microservices, serverless)
   - Open-source repositories with known issues and clean code

2. **Synthetic Test Cases**:
   - Repositories with artificially inserted issues of different types
   - Custom PRs with specific characteristics to test detection capabilities
   - Repositories with complex dependency structures
   - Multi-language repositories to test cross-language analysis

3. **Ground Truth Data**:
   - Manual annotation of issues and their severities
   - Expert-validated security vulnerabilities
   - Performance bottlenecks verified through profiling
   - Code quality issues validated against established standards

### Calibration Process

The calibration process should follow these steps:

1. **Data Collection**:
   - Run each model against the test suite
   - Measure precision, recall, and F1 score for issue detection
   - Track execution time, token usage, and cost metrics
   - Collect qualitative assessments of report quality

2. **Metric Calculation**:
   - Calculate performance scores (0-100) for each context dimension
   - Weight scores based on importance for each role
   - Normalize scores across models for fair comparison
   - Generate confidence intervals for reliability assessment

3. **Parameter Optimization**:
   - Determine optimal temperature settings for each model and role
   - Calibrate token limits based on repository characteristics
   - Fine-tune fallback thresholds and timeouts
   - Optimize prompting strategies and templates

4. **Validation**:
   - Cross-validate using a held-out test set
   - Perform A/B testing with representative user scenarios
   - Verify calibration improves key performance indicators
   - Test edge cases to ensure robustness

### Calibration Data Storage

Calibration results should be stored in a structured format:

```typescript
interface CalibrationRun {
  runId: string;                // Unique identifier for this calibration run
  timestamp: Date;              // When the calibration was performed
  modelVersions: {              // Versions of each model tested
    [provider: string]: string;
  };
  metrics: AgentRoleEvaluationParameters[]; // Performance metrics for each model
  testCases: {                  // Results for individual test cases
    repositoryId: string;
    size: string;               // small, medium, large, enterprise
    languages: string[];
    architecture: string;
    results: {
      [provider: string]: {
        precision: number;
        recall: number;
        f1Score: number;
        executionTime: number;
        tokenUsage: number;
        costMetric: number;
      }
    }
  }[];
  optimizedParameters: {        // Recommended parameters from this calibration
    [provider: string]: {
      [role: string]: {
        temperature: number;
        maxTokens: number;
        expectedLatency: number;
        recommendedPosition: AgentPosition;
      }
    }
  };
}
```

### Dynamic Configuration Implementation

The calibration data is then used to drive dynamic configuration through:

1. **Context-Based Scoring**:
   ```typescript
   function scoreModelForContext(
     model: AgentProvider,
     role: AgentRole,
     context: RepositoryContext,
     prContext: PRContext
   ): number {
     const calibrationData = getLatestCalibrationData();
     let score = 0;
     
     // Base score from role performance
     score += calibrationData[model].rolePerformance[role].overallScore * WEIGHTS.ROLE_SCORE;
     
     // Language-specific score
     for (const language of context.primaryLanguages) {
       score += (calibrationData[model].rolePerformance[role].bestPerformingLanguages[language] || 50) 
                * WEIGHTS.LANGUAGE_SCORE * context.languagePercentages[language];
     }
     
     // Repository size score
     const sizeCategory = categorizeSizeRepository(context.size);
     score += calibrationData[model].repoCharacteristics.sizePerformance[sizeCategory] 
              * WEIGHTS.SIZE_SCORE;
     
     // Additional context factors
     // [Implementation for other factors]
     
     return score;
   }
   ```

2. **Parameter Application**:
   ```typescript
   function getOptimizedParameters(
     model: AgentProvider,
     role: AgentRole,
     context: RepositoryContext
   ): Partial<AgentConfig> {
     const calibrationData = getLatestCalibrationData();
     const baseParams = calibrationData.optimizedParameters[model][role];
     
     // Adjust based on context
     const sizeCategory = categorizeSizeRepository(context.size);
     const complexityCategory = categorizeComplexity(context.complexity);
     
     // Token adjustment based on size
     const tokenMultiplier = SIZE_TOKEN_MULTIPLIERS[sizeCategory];
     const maxTokens = Math.min(
       baseParams.maxTokens * tokenMultiplier,
       MODEL_MAX_TOKENS[model]
     );
     
     // Temperature adjustment based on complexity
     const temperatureAdjustment = COMPLEXITY_TEMP_ADJUSTMENTS[complexityCategory];
     const temperature = Math.max(
       0.1,
       Math.min(1.0, baseParams.temperature + temperatureAdjustment)
     );
     
     return {
       temperature,
       maxTokens,
       mcpParams: {
         // MCP-specific optimizations
       }
     };
   }
   ```

## Workflow Examples

### Quick Analysis Workflow

1. **Request**: User requests quick analysis of a PR
2. **PR Context**: System extracts basic PR metadata and changed files
3. **Role Determination**: Orchestrator determines minimal required roles
4. **Agent Selection**: Evaluation system selects optimal agents for each role
5. **Configuration**: Multi-Agent Factory creates configurations optimized for speed
6. **Prompt Generation**: Dynamic prompts are created with quick mode instructions
7. **Execution**: Agents are executed with priority on speed
8. **Orchestration**: Results are combined and prioritized by importance
9. **Reporting**: Focused report is generated highlighting critical issues
10. **Feedback Collection**: User feedback is collected for future optimization

### Comprehensive Analysis Workflow

1. **Request**: User requests comprehensive analysis of a PR
2. **Cache Check**: System checks for recent repository analysis
3. **Repository Analysis**: If needed, DeepWiki analyzes full repository
4. **PR Context**: System extracts detailed PR metadata and changed files
5. **Combined Context**: Repository and PR contexts are combined
6. **Role Determination**: Orchestrator determines all relevant roles
7. **Agent Selection**: Evaluation system selects optimal agents for each role
8. **Configuration**: Multi-Agent Factory creates configurations for depth
9. **Prompt Generation**: Dynamic prompts with comprehensive mode instructions
10. **Execution**: Agents are executed with focus on thoroughness
11. **Orchestration**: Results are combined, categorized, and contextualized
12. **Reporting**: Detailed report is generated with architectural insights
13. **Feedback Collection**: User feedback is collected for future optimization

## Business Model Integration

The architecture supports a tiered subscription model:

1. **Free Tier**:
   - Limited to quick analysis mode
   - Restricted number of repositories and PRs
   - Basic visualization options
   - Community support only

2. **Pro Tier**:
   - Both quick and comprehensive analysis modes
   - Increased repository and PR limits
   - Full visualization capabilities
   - Email support
   - Team collaboration features

3. **Enterprise Tier**:
   - Unlimited repositories and PRs
   - Custom DeepWiki integration options
   - Advanced security and compliance features
   - Priority support and dedicated account manager
   - Custom agent configurations and prompting

## Repository-First Analysis Approach

The system implements a repository-first analysis approach that enhances PR review by providing comprehensive context from the full codebase.

**Key Components:**

1. **Repository Analysis System**:
   - Analyzes the full repository codebase using DeepWiki
   - Generates documentation, dependency graphs, and architectural insights
   - Caches analysis results for efficient reuse across multiple PR reviews
   - Updates incrementally when repository changes significantly

2. **Repository-Context Provider**:
   - Makes repository analysis results available to PR analysis agents
   - Provides contextual information about code patterns, architectural principles, dependencies
   - Helps agents understand how PR changes fit into the broader codebase

3. **Repository Cache Manager**:
   - Manages the lifecycle of repository analysis results
   - Implements efficient caching strategies with TTL (time-to-live)
   - Handles incremental updates when repository changes
   - Balances freshness with performance considerations

### Workflow Integration

The repository analysis is integrated with PR review in the following ways:

1. **Optional Analysis Mode**:
   - Repository analysis is optional via the comprehensive analysis mode
   - UI clearly communicates the performance implications of enabling repository analysis
   - Cached results are used whenever possible to minimize processing time

2. **Analysis Sequence**:
   ```
   1. Check if repository analysis exists and is current
      ↓
   2. If needed, perform repository analysis and cache results
      ↓
   3. Perform PR analysis with repository context
      ↓
   4. Generate combined report highlighting relationships
   ```

3. **Configurable Depth**:
   - Users can select which aspects of repository analysis to include:
     - Documentation generation
     - Dependency analysis
     - Code architecture overview
   - This allows customization based on specific needs and time constraints

### Benefits of Repository-First Analysis

1. **Context-Aware PR Review**:
   - PR analysis can reference existing architectural patterns
   - Violations of established patterns are more easily identified
   - Changes that align with the codebase's style are recognized and encouraged

2. **Improved Dependency Analysis**:
   - Understanding existing dependencies helps evaluate PR-introduced changes
   - Better detection of conflicts, redundancies, or security vulnerabilities
   - Easier identification of dependency upgrades or downgrades

3. **Enhanced Educational Content**:
   - Repository context enables more relevant educational content
   - PR authors can learn about existing patterns in the codebase
   - Connections between PR changes and wider codebase are highlighted

### Implementation Considerations

1. **Performance Optimization**:
   - Repository analysis is computationally intensive and may take 3-5 minutes for larger repositories
   - Results are cached to avoid recomputation for each PR
   - Incremental updates minimize processing time for subsequent analyses

2. **User Experience**:
   - Clear messaging about processing time and benefits
   - Progress indicators during repository analysis
   - Option to proceed with PR-only analysis while repository analysis completes

3. **Resource Management**:
   - Token usage monitoring and optimization
   - Intelligent scheduling of repository analysis during off-peak times
   - Configurable resource limits to prevent excessive costs