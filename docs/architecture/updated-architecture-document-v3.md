CodeQual Architecture Document
Last Updated: June 15, 2025
System Overview
CodeQual is a flexible, multi-agent system for comprehensive code analysis, quality assessment, and improvement. The system leverages a combination of specialized AI agents, vector database storage, MCP (Model Context Protocol) tools, and a scoring system to deliver actionable insights for developers and teams.
Core Components
1. Multi-Agent Architecture
The system uses a flexible, configuration-driven multi-agent approach that allows any agent type to fulfill any functional role based on context and capabilities:
Agent Types

LLM Agents: Claude, ChatGPT, DeepSeek, Gemini
Specialized Agents: Architecture Analyzer, Code Quality Assessor, Security Auditor, Performance Optimizer, Dependency Inspector
RESEARCHER Agent: Dynamic model configuration optimizer (see section 10)
Orchestrator Agent: Analyzes PR complexity and coordinates the analysis flow

Agent Roles

Orchestrator: PR analysis, complexity detection, DeepWiki request generation
Analysis Agents: Security, Code Quality, Architecture, Performance, Dependencies
Final Stage Agents: Educational, Reporting
Support Agents: Repository Data Provider, Repository Interaction Provider
Research Agent: Model configuration researcher and optimizer

2. Vector Database Integration
A comprehensive vector storage system for repository analyses:
repositories
  ├── id: uuid
  ├── name: text
  ├── url: text
  ├── default_branch: text
  ├── analysis_date: timestamp
  ├── overall_score: float
  └── category_scores: jsonb

analysis_chunks
  ├── id: uuid
  ├── repository_id: uuid (foreign key)
  ├── content: text
  ├── embedding: vector(1536)
  ├── metadata: jsonb
  │   ├── analysis_type: text
  │   ├── content_type: text (deepwiki_analysis/tool_result)
  │   ├── tool_name: text (for tool results)
  │   ├── agent_role: text (security/architecture/dependency)
  │   ├── score: float
  │   ├── issues: jsonb[]
  │   ├── file_paths: text[]
  │   ├── severity: text
  │   └── is_latest: boolean
  ├── storage_type: text (permanent/cached)
  ├── ttl: timestamp (null for permanent)
  └── created_at: timestamp
The vector database enables:

Efficient similarity search for relevant code patterns
Contextual PR analysis using repository knowledge
Knowledge retention across analyses (latest results only)
Tool result storage and retrieval by agent role
Model configuration storage for RESEARCHER agent
Repository report storage with agent contexts

Storage Strategy (Updated June 2025)

Latest Results Only: Each analysis replaces previous results
No Versioning: Previous tool/analysis results are deleted
Lightweight Audit: Optional summary metrics logged separately
Performance Optimized: Faster queries with less data

Special Repository for RESEARCHER Configuration
Repository ID: 00000000-0000-0000-0000-000000000001
Name: "CodeQual Researcher Configurations"
Type: Internal system repository
Purpose: Stores optimal model configurations discovered by RESEARCHER agent
3. MCP Hybrid Tool Integration (Updated June 2025)
The system integrates Model Context Protocol (MCP) tools to provide concrete analysis data for all agents:
Core Architecture

Tool Registry: Maps tools to agent roles, not specific models
Tool Manager: Server-side execution with workspace isolation
Context Selector: Intelligent tool selection based on PR context
Parallel Executor: Runs multiple tools simultaneously
DeepWiki Tool Runner: Executes repository-level tools in DeepWiki pod

Tool Distribution Strategy (NEW)
Tools are distributed based on their execution requirements:
Local PR Context Tools (3 tools)
These tools run locally and work well with PR-only context:

ESLint Direct - JavaScript/TypeScript linting with auto-fixes
Bundlephobia Direct - Bundle size analysis (uses external API)
Grafana Direct - Dashboard integration for reporting

DeepWiki-Integrated Tools (5 tools)
These tools run within the DeepWiki pod using the cloned repository:

NPM Audit - Security vulnerability scanning (needs package-lock.json)
License Checker - License compliance checking (needs full dependency tree)
Madge - Circular dependency detection (needs complete import graph)
Dependency Cruiser - Dependency rule validation (needs full codebase)
NPM Outdated - Version currency checking (needs package.json)

Removed Tools (2 tools)
These tools were removed as redundant with DeepWiki analysis:

Prettier - DeepWiki already analyzes code formatting
SonarJS - DeepWiki covers code quality patterns

Tool Execution Flow

DeepWiki Analysis Phase:

DeepWiki clones repository once
Runs comprehensive analysis
Executes integrated tools in parallel
Stores all results in Vector DB


Local Tool Phase:

PR context tools run on demand
Results combined with DeepWiki findings
Quick feedback for developers


Agent Processing:

Agents receive filtered tool results
Each agent gets only relevant tools
Analysis based on tool + DeepWiki findings



Implementation Status

Tools Implemented: 10/10 for current scope (100%)
DeepWiki Integration: Ready for deployment
Local Tools: Fully operational
Performance: ~42% improvement expected

4. Scoring and Assessment System
A comprehensive scoring system quantifies repository quality across multiple dimensions:
Specialized Analysis Scoring

Each specialized analysis (architecture, code quality, security, dependencies, performance) includes:

Overall category score (1-10 scale)
Subcategory scoring with specific metrics
Severity-based issue identification (high/medium/low)
Scoring justifications and impact assessments
Tool-based metrics integration (NEW)



Repository-Level Scoring

Combined overall repository score based on weighted category scores
Visualization-ready metrics for Grafana dashboards
Trend analysis for score changes over time (summary metrics only)
Benchmark comparisons with similar repositories
Tool findings incorporated into scores

Vector-Ready Metadata
json{
  "repository": "repository_name",
  "analysis_date": "2025-06-15T12:34:56Z",
  "analysis_type": "architecture",
  "content_type": "tool_result",
  "tool_name": "madge",
  "agent_role": "architecture",
  "is_latest": true,
  "scores": {
    "overall": 8,
    "subcategories": [
      {"name": "Modularity", "score": 9, "strengths": ["Clear separation of concerns"], "issues": []},
      {"name": "Dependencies", "score": 7, "strengths": [], "issues": ["3 circular dependencies detected"]}
    ],
    "tool_metrics": {
      "circular_dependencies": 3,
      "module_count": 145,
      "max_depth": 7
    }
  }
}
5. Orchestrator-Driven Analysis Flow (Updated June 2025)
The system follows a sophisticated orchestration flow with integrated tool execution:
1. PR Analysis and Complexity Detection
typescript/**
 * Orchestrator determines:
 * - Language and framework detection
 * - PR complexity (file count, lines changed)
 * - Appropriate DeepWiki request generation
 * - Tool selection based on repository type
 * - Agent requirements and priorities
 */
2. Vector DB and DeepWiki Integration

Check Vector DB: Look for existing repository report
If not found: Trigger DeepWiki + Tools analysis
DeepWiki Phase:

Clone repository once
Run DeepWiki analysis
Execute repository tools in parallel
Store all results in Vector DB (replace previous)



3. Agent Context Distribution
typescript{
  "agentContexts": {
    "security": {
      "focus": "authentication",
      "priority": "high",
      "dependencies": ["oauth2", "jwt"],
      "toolResults": ["npm-audit", "license-checker"],
      "scoring": { "threshold": 8, "weight": 0.3 }
    },
    "architecture": {
      "focus": "modularity",
      "toolResults": ["madge", "dependency-cruiser"],
      "scoring": { "threshold": 7, "weight": 0.25 }
    },
    "dependency": {
      "focus": "maintenance",
      "toolResults": ["npm-outdated", "license-checker"],
      "scoring": { "threshold": 6, "weight": 0.2 }
    }
    // ... other agents
  }
}
4. Enhanced Agent Execution

Retrieve DeepWiki analysis from Vector DB
Retrieve relevant tool results by agent role
Local tools run for PR-specific insights
Agents analyze based on all available data
Reports compiled by agents

5. Final Report Generation

Educational Agent: Creates learning materials from findings
Reporting Agent: Generates visualizations and final output
Tool metrics included in dashboards

6. DeepWiki Integration (Enhanced June 2025)
The system integrates with DeepWiki for comprehensive repository analysis:
Kubernetes-Native Integration

Direct access to DeepWiki pods in Kubernetes cluster
Command execution via kubectl exec
Repository analysis via DeepWiki API
Tool execution within DeepWiki pod (NEW)

DeepWiki Tool Runner (NEW)

Integrated tool execution using cloned repository
Parallel execution of 5 repository-level tools
Results stored alongside DeepWiki analysis
Single atomic operation for consistency

Tiered Analysis Approach

Quick PR-Only Analysis:

1-3 minutes execution time
Local tools only (ESLint, Bundlephobia)
Immediate developer feedback


Comprehensive Repository Analysis:

5-10 minutes execution time
Full DeepWiki + integrated tools
Results cached in Vector DB
Scheduled or on-demand


Targeted Deep Dives:

Focused on specific aspects
Leverages DeepWiki Chat API
Custom tool configuration



Scheduling Strategy (NEW)

Single Scheduler: DeepWiki + Tools run together
User Configurable: Daily, weekly, or monthly
Smart Notifications: Only on significant changes
Atomic Operations: Ensures consistency

7. RAG Framework
The system implements a comprehensive Retrieval-Augmented Generation (RAG) framework that serves both the chat functionality and other services:
Core RAG Components
typescript/**
 * Core RAG Framework
 * Central system for targeted knowledge retrieval and generation
 * Now includes tool result retrieval
 */
export class RAGFramework {
  constructor(
    private vectorStore: VectorStoreService,
    private embeddingService: EmbeddingService,
    private chunkingService: ChunkingService,
    private modelService: ModelService,
    private metadataService: MetadataService,
    private queryAnalyzer: QueryAnalyzerService
  ) {}
  
  /**
   * Retrieve context including tool results
   */
  async retrieveContext(
    repositoryId: string,
    query: string,
    options: RetrievalOptions = {}
  ): Promise<RetrievalResult> {
    // Retrieve DeepWiki analysis
    const analysisChunks = await this.vectorStore.search({
      repositoryId,
      query,
      filters: {
        content_type: 'deepwiki_analysis',
        is_latest: true
      }
    });
    
    // Retrieve relevant tool results
    const toolChunks = await this.vectorStore.search({
      repositoryId,
      query,
      filters: {
        content_type: 'tool_result',
        is_latest: true,
        agent_role: options.agentRole
      }
    });
    
    return {
      analysisChunks,
      toolChunks,
      combinedRelevance: this.calculateRelevance(analysisChunks, toolChunks)
    };
  }
}
8. DeepWiki Chat Integration
The system includes a specialized chat interface for repository exploration using the Message Control Program (MCP) pattern:
Message Control Program Architecture
typescript/**
 * Message Control Program (MCP) for DeepWiki Chat
 * 
 * Coordinates the chat workflow including:
 * - Authentication and authorization
 * - Context retrieval from vector database
 * - Tool result integration (NEW)
 * - Model selection and fallback
 * - Response formatting
 */
export class MessageControlProgram {
  async processRequest(request: ChatCompletionRequest): Promise<ChatCompletionResponse> {
    // ... existing implementation ...
    
    // Step 4: Retrieve relevant context from RAG (including tools)
    const relevantContext = await this.ragFramework.retrieveContext(
      repoContext.repositoryId,
      latestUserMessage.content,
      { 
        limit: 5, 
        minScore: 0.7,
        includeToolResults: true,
        agentRole: 'chat'
      }
    );
    
    // ... rest of implementation ...
  }
}
9. Authentication System
The system implements a comprehensive authentication and authorization framework:
Supabase Authentication Integration
typescript/**
 * Authentication service using Supabase
 * Controls access to repositories, analyses, and tool results
 */
export class SupabaseAuthService implements AuthenticationService {
  constructor(
    private supabaseClient: SupabaseClient,
    private userService: UserService,
    private organizationService: OrganizationService
  ) {}
  
  /**
   * Verify user access to tool results
   */
  async canAccessToolResults(
    userId: string, 
    repositoryId: string
  ): Promise<boolean> {
    const repoAccess = await this.getUserRepositoryAccess(userId);
    return repoAccess.some(r => r.id === repositoryId && r.permissions.includes('read'));
  }
}
10. RESEARCHER Agent Architecture (June 2025)
The RESEARCHER agent is a specialized component that continuously researches and optimizes AI model configurations for all agents in the system:
Core RESEARCHER Capabilities
typescript/**
 * RESEARCHER Agent - Continuously researches and updates optimal AI model configurations
 * 
 * This agent:
 * 1. Researches current AI models from all major providers
 * 2. Analyzes pricing, performance, and capabilities
 * 3. Generates optimal configurations for all agent roles, languages, and repository sizes
 * 4. Updates the CANONICAL_MODEL_VERSIONS collection dynamically
 * 5. Runs on scheduled intervals to keep configurations current
 * 6. Can evaluate and upgrade itself based on meta-research
 */
Configuration Management Architecture
1. Current Configuration (June 5, 2025)

Primary Model: OpenAI GPT-4.1-nano (optimal performance/cost for research tasks)

Composite Score: 9.81/10
Cost: $0.10/$0.40 per 1M tokens (input/output)
Monthly Cost: ~$3.73 for 3,000 daily queries
Context Window: 128,000 tokens


Fallback Model: OpenAI GPT-4.1-mini
Storage: Special Vector DB repository
Caching: Persistent template cache (saves 1301 tokens per request)

2. Dynamic Model Discovery

No hardcoded model lists
Searches web for latest AI model announcements
Queries provider APIs for current offerings
Monitors tech news and research papers

3. Token-Efficient Caching System

Base template: ~1301 tokens (cached once)
Context prompts: ~200-300 tokens per request
Token savings: 71% reduction after initial cache
Persistent cache with no expiration

4. Self-Evaluation Process

Quarterly meta-research (every 90 days)
Evaluates own performance
Searches for better research models
Automatic upgrade for high-confidence recommendations

Modular Prompt Generator System
The RESEARCHER uses a sophisticated two-path prompt generation system:
Path 1: System Template Generation (One-Time)

Creates comprehensive base research framework
Includes discovery methodology and output formats
~1301 tokens, cached for session reuse

Path 2: Contextual Prompt Generation (Per-Request)

References cached template ID
Includes specific role, language, framework parameters
Only ~250 tokens per request

Context Matrix Coverage

Agent Roles: 5 (security, performance, architecture, codeQuality, dependency)
Languages: 6 (typescript, python, java, javascript, go, rust)
Repository Sizes: 3 (small, medium, large)
Price Tiers: 4 (budget, standard, premium, enterprise)
Total Contexts: ~3,000 unique combinations

11. Core Processes (Updated June 2025)
Orchestrator-Driven Analysis Process

PR URL Reception

Orchestrator receives PR URL
Analyzes PR complexity (files, languages, frameworks)
Determines analysis requirements
Selects appropriate tools


Vector DB Check

Checks for existing repository report
Verifies report is latest version
If missing/outdated, triggers analysis


DeepWiki + Tools Execution

DeepWiki clones repository once
Runs comprehensive analysis
Executes integrated tools in parallel
Stores all results (replaces previous)


Local Tool Execution

PR context tools run separately
Quick feedback for developers
Results enhance agent analysis


Agent Processing

Each agent receives filtered context
Tool results matched to agent role
Analysis combines all data sources


Final Report Generation

Educational agent creates learning materials
Reporting agent generates visualizations
Comprehensive insights delivered



Tool Integration Process (NEW)

Repository Analysis Phase

Tools run within DeepWiki pod
Access to full repository structure
Parallel execution for performance


Result Storage

Tool results stored in Vector DB
Tagged with agent roles
Previous results replaced


Agent Retrieval

Orchestrator queries by agent role
Filters for latest results only
Combines with DeepWiki analysis


Error Handling

Tool failures don't block analysis
Partial results still valuable
Graceful degradation



12. Deployment Architecture
Unified Deployment Approach
To support both cloud and on-premises deployment models:
Core Principles

Container-First Architecture

All components packaged as containers
DeepWiki image includes tool runner
Configuration injected via environment variables
Stateless design for scalability


Environment Abstraction Layer

Environment-specific adapters for dependencies
Unified API for service access
Feature flags for environment capabilities


Configuration Hierarchy

Base configuration shared across environments
Environment-specific overrides
Tool configuration via ConfigMap
Customer-specific customizations
Instance-specific settings

we have implemented a robust scheduling system with multiple trigger mechanisms:

  1. Event-Driven Scheduling (Primary)

  Webhook-based automatic triggers:
  - Push events: Full analysis when pushing to main/master/develop branches
  - Pull Request events: Security-focused analysis (npm-audit + license-checker)
  - Configured in webhook-handler.service.ts:337-394

  2. Manual Scheduling

  API-triggered execution:
  - POST /api/deepwiki-tools/trigger - Manual tool execution
  - POST /api/deepwiki-tools/test - Development/testing triggers
  - Supports custom tool selection and branch specification

  3. Scheduled Scanning

  Cron-style periodic analysis:
  - POST /api/deepwiki-tools/scheduled-scan - Comprehensive repository analysis
  - Configurable tool sets and timeout settings
  - Auto-approval (no manual review required)

  4. Configuration-Based Scheduling

  Per-repository customization:
  {
    toolExecution: {
      defaultTimeout: 60000,
      parallelLimit: 3,
      retryAttempts: 2,
      enabledTools: ['npm-audit', 'license-checker', 'madge', 'dependency-cruiser', 'npm-outdated']
    }
  }

  5. Event-Specific Tool Selection

  - Push: All 5 tools (full analysis)
  - PR: Security tools only (npm-audit, license-checker)
  - Scheduled: All 5 tools (comprehensive scan)
  - Manual: User-configurable

  The system is fully operational in Kubernetes with all scheduling mechanisms ready for production use. All tool executions are automatically stored in Vector
  DB for agent retrieval.

DeepWiki Deployment (NEW)

Enhanced Docker Image

Base DeepWiki + Node.js/npm
5 integrated analysis tools
Tool runner service
Parallel execution support


Kubernetes Configuration

ConfigMap for tool settings
Resource limits for safety
Volume mounts for workspace
Health checks for reliability



13. System Architecture Improvements (May-June 2025)
DeepWiki Tool Integration (June 15, 2025)

Implemented tool runner for DeepWiki pod
5 tools integrated with repository analysis
Parallel execution architecture
Storage strategy: latest results only
Combined scheduling with DeepWiki

MCP Hybrid Tool Integration (June 2025)

Implemented 10 tool adapters (100% of current scope)
Created parallel execution engine
Built tool-aware agent wrapper
Integrated with existing multi-agent executor
Tools run FIRST, then agents analyze

RESEARCHER Agent Implementation (June 2025)

Created self-improving model configuration system
Implemented persistent cache for 1301 token savings per request
Developed quarterly meta-research for self-evaluation
Built Vector DB integration for configuration persistence
Added dynamic model discovery without hardcoded limits

Previous Improvements (May 2025)

Scoring System Integration
DeepWiki Kubernetes Integration
Vector Database Architecture
RAG Framework Development
DeepWiki Chat System
Authentication Integration

14. Future Enhancements

IDE Integration (VS Code, Cursor, Windsurf) - Real-time analysis in editor
CI/CD Pipeline Integration - Automated PR quality gates
Advanced Analytics Dashboard - Trend analysis and insights
Cross-repository pattern learning
AI-assisted codebase refactoring suggestions
Multi-language support expansion
Real-time collaborative code review
Advanced caching for incremental analysis

15. Tool Implementation Details

15.1 Dependency Cruiser Implementation (June 2025)

Current Implementation Status
The Dependency Cruiser adapter has been successfully implemented with comprehensive test coverage:

✅ **Full Implementation Complete**
- **JavaScript Support**: Full circular dependency detection for ES6, CommonJS, and AMD modules
- **File Types**: `.js`, `.jsx`, `.mjs`, `.cjs`, `.ts`, `.tsx`  
- **Configuration**: Robust configuration with circular dependency and orphan module detection
- **Test Coverage**: 35 passing tests across 6 test suites
- **Integration**: Fully integrated with MCP Hybrid tool system

**Language Support Analysis**

Primary Support (Production Ready):
- **JavaScript** ✅ **Fully Working**
  - ES6 modules (`import`/`export`)
  - CommonJS (`require`/`module.exports`) 
  - AMD modules
  - File types: `.js`, `.jsx`, `.mjs`, `.cjs`
  - **Status**: Detects circular dependencies perfectly

- **TypeScript** ⚠️ **Limited Support**
  - **Current Status**: Basic analysis works but limited by global installation
  - **Issue**: Globally installed dependency-cruiser lacks full TypeScript compilation support
  - **Behavior**: Often shows no modules found due to resolution limitations
  - **Test Strategy**: Graceful fallback implemented for environments without full TS support

15.2 Tool Storage Architecture (NEW - June 15, 2025)

Storage Strategy

Latest Only: Each tool run replaces previous results
No Versioning: Reduces storage by 90%+
Lightweight Audit: Optional metrics logging
Performance: Optimized queries with less data

Vector DB Schema for Tools
sql-- Tool results stored in analysis_chunks table
-- Identified by metadata.content_type = 'tool_result'
CREATE INDEX idx_tool_results_latest 
ON analysis_chunks(repository_id, (metadata->>'tool_name'))
WHERE metadata->>'content_type' = 'tool_result' 
  AND metadata->>'is_latest' = 'true';

-- Cleanup old results before storing new
DELETE FROM analysis_chunks 
WHERE repository_id = $1 
  AND metadata->>'content_type' = 'tool_result';

15.3 Scheduling Architecture (NEW - June 15, 2025)

Combined Scheduling

Single Job: DeepWiki + Tools run together
Atomic Operation: Ensures consistency
User Configurable: Daily/weekly/monthly
Smart Notifications: Only on changes

typescript// Scheduling configuration
interface ScheduledAnalysis {
  repositoryUrl: string;
  schedule: {
    frequency: 'daily' | 'weekly' | 'monthly';
    time: string; // UTC
  };
  analysis: {
    deepwikiMode: 'comprehensive' | 'concise';
    runTools: boolean;
    enabledTools?: string[];
  };
  notifications: {
    onlyOnChanges?: boolean;
  };
}
