CodeQual Architecture Document
Last Updated: January 6, 2025 (Dynamic Embedding Configuration System)
System Overview Please review the file model-version-management.md
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
Post-Analysis Agents: Educational (with MCP tools), Reporting (with MCP tools)
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

5. Post-Analysis Agent Flow (Educational & Reporting)

**Educational Agent Architectural Flow (Updated June 23, 2025):**

The Educational Agent operates in a post-analysis phase with orchestrator-managed tool execution:

1. **Specialized Agents Complete**: Security, Architecture, Performance, Dependencies execute with their MCP tools
2. **Orchestrator Compiles**: All findings + DeepWiki summary + Recommendation module
3. **Educational Tool Orchestrator**: Executes educational MCP tools with compiled context
4. **Educational Agent**: Receives tool results + compiled findings for educational content generation

**Educational MCP Tools Integration:**
- `context7-mcp`: Real-time documentation search with version-specific information
- `working-examples-mcp`: Validated code examples based on compiled findings
- `context-mcp`: Vector DB educational content retrieval
- `mcp-docs-service`: Documentation analysis and gap identification

**Cost Control & Data Storage Strategy:**
- **Tiered Storage**: Cache-only (24h TTL), User limits (50MB), Curated content
- **Topic Extraction**: Max 10 topics from compiled findings (not generic)
- **Package Analysis**: Max 10 packages from actual codebase analysis
- **Cache-First**: Check cache before external tool execution
- **Context-Aware**: Educational tools receive specific analysis findings as context

**Reporting Agent Flow:**
- Reporting Agent: Generates standardized reports with MCP tool integration
- Chart generation, PDF export, Grafana skill trend integration
- Tool metrics included in dashboards

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

15. Report Generation and Storage (June 2025)

The system implements a comprehensive report generation and storage pipeline:

**Report Generation Flow**
1. **Educational Compilation**: Educational Agent processes findings into structured learning content
2. **Reporter Agent Processing**: 
   - Receives compiled educational data, findings, and recommendations
   - Generates StandardReport structure via ReportFormatterService
   - Creates modular content for UI tabs (Findings, Recommendations, Educational, Metrics, Insights)
   - Pre-computes visualization data for charts/graphs
   - Generates multiple export formats (PR comment, email, Slack, markdown, JSON)
3. **Supabase Storage**:
   - Stores complete StandardReport in `analysis_reports` table
   - Implements Row Level Security for access control
   - Provides quick access fields for filtering/sorting
   - Maintains audit trail and report history

**StandardReport Structure**
```typescript
StandardReport {
  id: string                    // Unique report identifier
  repositoryUrl: string         // Repository being analyzed
  prNumber: number              // Pull request number
  timestamp: Date               // Report generation time
  
  overview: {                   // High-level summary
    executiveSummary: string
    analysisScore: number (0-100)
    riskLevel: 'low' | 'medium' | 'high' | 'critical'
    totalFindings: number
    totalRecommendations: number
    learningPathAvailable: boolean
    estimatedRemediationTime: string
  }
  
  modules: {                    // Detailed content modules
    findings: FindingsModule    // Categorized issues
    recommendations: RecommendationsModule  // Actionable items
    educational: EducationalModule  // Learning content
    metrics: MetricsModule      // Scores and trends
    insights: InsightsModule    // AI-generated observations
  }
  
  visualizations: {             // Pre-computed chart data
    severityDistribution: ChartData
    categoryBreakdown: ChartData
    learningPathProgress: ChartData
    trendAnalysis?: ChartData
    dependencyGraph?: GraphData
  }
  
  exports: {                    // Pre-formatted outputs
    prComment: string
    emailFormat: string
    slackFormat: string
    markdownReport: string
    jsonReport: string
  }
  
  metadata: {                   // Analysis metadata
    analysisMode: string
    agentsUsed: string[]
    toolsExecuted: string[]
    processingTime: number
    modelVersions: Record<string, string>
  }
}
```

**Report Access API**
- `GET /api/reports/:reportId` - Retrieve specific report
- `GET /api/reports/repository/:repo/pr/:num` - Get latest report for PR
- `GET /api/reports` - List reports with pagination/filtering
- `GET /api/reports/:reportId/export/:format` - Export in specific format
- `GET /api/reports/statistics` - User analytics

16. Tool Implementation Details

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

Architecture Document (/docs/architecture/updated-architecture-document-v3.md):

17. Enhanced Monitoring Service & Observability (NEW - June 15, 2025)

The system implements a comprehensive monitoring and observability framework with Grafana integration, Loavable embedding support, and AI tool integration:

**Core Monitoring Architecture**

```typescript
/**
 * Enhanced Monitoring Service
 * Provides comprehensive observability for the entire CodeQual platform
 */
export class EnhancedMonitoringService extends EventEmitter {
  // Prometheus metrics collection
  // Grafana dashboard integration  
  // Loavable widget generation
  // AI tool integration
  // Real-time alerting
  // Event-driven architecture
}
```

**17.1 Prometheus Metrics Collection**

Core Business Metrics:
- **Analysis Metrics**: Started, completed, failed, duration tracking
- **Component Performance**: DeepWiki, Vector DB, Agent execution latency
- **Business Events**: Repository analysis, user tiers, critical findings detected
- **Cost Tracking**: Provider costs, operation expenses per analysis
- **Resource Usage**: Memory, CPU, active analysis monitoring

Technical Metrics:
- **Error Rates**: By component, error type, and severity
- **Success Rates**: Analysis completion rates with trend analysis
- **Performance**: P95/P99 latency tracking across all components
- **Capacity**: Active analysis tracking and resource utilization

**17.2 Grafana Dashboard Integration**

Automated Dashboard Creation:
```typescript
// Dashboard configuration for Grafana
interface DashboardConfig {
  id: string;
  title: string;
  panels: PanelConfig[];
  refresh: string; // e.g., "30s", "1m"
  timeRange: { from: string; to: string };
  embeddable: boolean;
  aiPrompts?: string[]; // Natural language for AI tools
}
```

Key Dashboards:
- **CodeQual Overview**: System health, analysis performance, error rates
- **Agent Performance**: Individual agent execution times and success rates  
- **Cost Analysis**: Provider costs, operation expenses, optimization insights
- **Business Metrics**: Repository analysis trends, user engagement
- **DeepWiki Integration**: Tool execution performance, repository analysis metrics

**17.3 Loavable Widget Support**

Embeddable Monitoring Widgets:
```typescript
// Widget configuration for Loavable embedding
interface WidgetConfig {
  id: string;
  name: string;
  type: 'metric' | 'chart' | 'status' | 'alert';
  embeddable: boolean;
  refreshInterval: number; // milliseconds
  props?: Record<string, any>;
}
```

Generated React Components:
- **Success Rate Widget**: Real-time analysis success rates
- **Performance Charts**: Time series analysis duration charts
- **Status Indicators**: System health and component status
- **Alert Panels**: Critical issues and warnings display

**17.4 AI Tool Integration Schema**

Monitoring Schema for AI Tools:
```typescript
// Schema endpoint: /api/monitoring/schema
interface MonitoringSchema {
  service: string;
  capabilities: {
    metrics: string[];           // Available metric names
    dashboards: DashboardInfo[]; // Dashboard metadata
    widgets: WidgetInfo[];       // Embeddable widgets
    alerts: AlertInfo[];         // Alert configurations
  };
  endpoints: {
    metrics: '/metrics';         // Prometheus endpoint
    health: '/health';           // Health check
    dashboards: '/api/monitoring/dashboards';
    widgets: '/api/monitoring/widgets';
  };
  queryLanguage: 'PromQL';
  aiInstructions: {
    howToQuery: string;
    commonQueries: Record<string, string>;
    alerting: string;
  };
}
```

Common PromQL Queries for AI:
- Analysis Success Rate: `rate(codequal_analysis_completed_total[5m]) / rate(codequal_analysis_started_total[5m])`
- Average Analysis Time: `rate(codequal_analysis_duration_seconds_sum[5m]) / rate(codequal_analysis_duration_seconds_count[5m])`
- Error Rate: `rate(codequal_errors_total[5m])`
- Active Analyses: `codequal_active_analyses`

**17.5 Real-time Monitoring & Alerts**

Alert Configuration:
```typescript
interface AlertConfig {
  id: string;
  name: string;
  condition: string; // PromQL expression
  severity: 'info' | 'warning' | 'critical';
  channels: string[]; // ['slack', 'email', 'pager']
  aiContext?: string; // Help AI understand alert context
}
```

Critical Alerts:
- High Analysis Failure Rate (>10%)
- DeepWiki Service Unavailable
- High Memory Usage (>90%)
- Slow Analysis Performance (>5 minutes P95)

**17.6 Event-Driven Architecture**

Real-time Events:
```typescript
// Event types emitted by monitoring service
interface MonitoringEvents {
  'alertTriggered': { alert: AlertConfig; status: AlertStatus };
  'dashboardRefresh': { dashboardId: string; data: DashboardData };
  'metricsSnapshot': MetricSnapshot;
  'analysisCompleted': { duration: number; success: boolean };
}
```

**17.7 API Endpoints**

Public Endpoints (No Authentication):
- `GET /metrics` - Prometheus metrics in standard format

Authenticated Endpoints:
- `GET /api/monitoring/widgets` - List embeddable widgets
- `GET /api/monitoring/widgets/:id/data` - Real-time widget data
- `GET /api/monitoring/widgets/:id/component` - React component code
- `GET /api/monitoring/dashboards` - Available dashboards
- `GET /api/monitoring/dashboards/:id` - Dashboard data
- `GET /api/monitoring/alerts` - Alert status
- `GET /api/monitoring/health` - Enhanced health check
- `GET /api/monitoring/schema` - AI tool integration schema
- `GET /api/monitoring/metrics/ai` - AI-formatted metrics
- `POST /api/monitoring/record` - Manual event recording

**17.8 Integration with Existing Architecture**

Monitoring Middleware:
```typescript
// Automatic monitoring for all API requests
export const monitoringMiddleware = (req, res, next) => {
  const service = getGlobalMonitoringService();
  const startTime = Date.now();
  
  // Record request start
  service.recordComponentLatency('api', req.path, startTime);
  
  // Monitor response
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    if (res.statusCode >= 400) {
      service.recordError('http_error', 'api', res.statusCode >= 500 ? 'critical' : 'warning');
    }
  });
  
  next();
};
```

Agent Integration:
- Educational Agent: Monitors content generation performance
- Reporter Agent: Tracks report generation times and success rates
- Analysis Agents: Records analysis duration and findings count
- DeepWiki Integration: Monitors repository analysis and tool execution

**17.9 Data Quality & Performance**

Quality Metrics:
```typescript
interface DataQuality {
  recommendationConfidence: number;    // 0-100
  educationalContentCoverage: number;  // 0-1.0  
  totalDataPoints: number;
  processingInfo: {
    recommendationsProcessed: number;
    educationalItemsGenerated: number;
    compilationMethod: string;
  };
}
```

Performance Optimizations:
- Event-driven updates minimize latency
- Cached dashboard data for faster rendering
- Background metric collection with minimal overhead
- Efficient PromQL queries with proper indexing

**17.10 Deployment Integration**

Kubernetes Integration:
- Service monitors for Prometheus discovery
- Health check endpoints for readiness/liveness probes
- ConfigMap integration for dashboard configurations
- Secret management for Grafana API keys

Docker Configuration:
- Monitoring service runs alongside main API
- Shared volume for metric persistence
- Environment-based configuration injection
- Graceful shutdown with metric finalization

The Enhanced Monitoring Service provides complete observability for the CodeQual platform, enabling proactive monitoring, performance optimization, and integration with external monitoring tools while supporting embedded widgets for web applications and AI-powered monitoring insights.

---

## 18. User Skill Tracking & Personalized Learning System (NEW - June 15, 2025)

The system implements a comprehensive **User Skill Tracking System** that integrates with the Educational Agent to provide personalized, skill-aware code analysis and learning experiences that grow with users over time.

### **18.1 Core Skill Tracking Architecture**

```typescript
/**
 * Comprehensive skill tracking system that monitors user development
 * across multiple dimensions and provides personalized learning experiences
 */
interface SkillTrackingFramework {
  skillAssessment: PRBasedSkillAssessment;
  learningPersonalization: SkillAwareLearning;
  contentAdaptation: PersonalizedContent;
  progressionAnalytics: SkillProgressionTracking;
  ragIntegration: SkillAwareSearch;
}
```

### **18.2 Database Foundation (Existing Schema)**

The skill tracking system builds on existing database infrastructure:

**Core Tables:**
- `skill_categories` - Hierarchical skill category definitions with parent/child relationships
- `developer_skills` - User skill levels (1-10 scale) with timestamps and category mapping
- `skill_history` - Historical skill progression tracking with evidence-based updates

**Evidence-Based Tracking:**
```sql
-- Skill history with evidence tracking
CREATE TABLE skill_history (
  id UUID PRIMARY KEY,
  skill_id UUID REFERENCES developer_skills(id),
  level INTEGER CHECK (level >= 1 AND level <= 10),
  evidence_type TEXT, -- 'pr_analysis', 'issue_resolution', 'educational_engagement'
  evidence_id TEXT,   -- PR number, issue ID, content ID
  created_at TIMESTAMP DEFAULT NOW()
);
```

### **18.3 PR-Based Skill Assessment**

**Automatic Skill Updates from PR Analysis:**

Every PR analysis automatically updates user skills based on demonstrated competencies:

```typescript
interface PRSkillAssessment {
  // Security skill assessment
  security: {
    vulnerabilitiesHandled: number;
    severityLevels: ('low' | 'medium' | 'high' | 'critical')[];
    complexityScore: number; // 1-10 based on PR complexity
    confidenceLevel: number; // 0-1 based on success indicators
  };
  
  // Code quality assessment  
  codeQuality: {
    issuesResolved: number;
    codeSmellsAddressed: number;
    linesChanged: number;
    filesModified: number;
  };
  
  // Architecture assessment (for significant changes)
  architecture: {
    designPatternImplementation: boolean;
    technicalDebtReduction: number;
    modularityImprovements: boolean;
    filesScope: number; // Minimum 5 files for architectural assessment
  };
}
```

**Skill Level Calculation Logic:**
- **Weighted Assessment**: New skill demonstrations are weighted against existing levels
- **Confidence-Based Updates**: Higher confidence from complex, successful PRs has more impact
- **Evidence Tracking**: All updates include source evidence (PR number, complexity, outcomes)
- **Progressive Learning**: Skill improvements are gradual and realistic (max 30% influence per assessment)

### **18.4 Educational Agent Integration**

**Skill-Aware Learning Path Generation:**

The Educational Agent now provides fully personalized learning experiences:

```typescript
interface SkillAwareEducationalResult {
  personalizedLearningPath: {
    title: "Personalized Skill-Based Learning Path";
    prioritization: "weak areas first, appropriate complexity";
    adaptiveSteps: string[]; // Includes current skill level context
    estimatedTime: string;   // Adjusted for skill level (1.5x for beginners, 0.7x for experts)
  };
  
  adaptedContent: {
    explanations: SkillAdaptedExplanation[];    // Complexity matched to user level
    tutorials: SkillAdaptedTutorial[];          // Preparatory steps for beginners
    bestPractices: SkillAdaptedBestPractice[];  // Mentoring opportunities for experts
    resources: SkillAppropriateResource[];      // Difficulty-filtered content
  };
  
  skillGaps: string[]; // Specific gaps identified from skill level vs. requirement analysis
  progressionRecommendations: string[]; // Next steps based on current trajectory
}
```

**Content Adaptation by Skill Level:**

- **Beginners (Level 1-3)**: 
  - Detailed explanations with foundational concepts
  - Preparatory steps before main tasks
  - "Ask for help" encouragements and guided tutorials
  - Extended time estimates (1.5x base time)

- **Intermediate (Level 4-6)**:
  - Balanced practical guidance with optimization tips
  - Focus on applying concepts to real projects
  - Standard complexity and time estimates

- **Advanced (Level 7-10)**:
  - Optimization and scalability focus
  - Mentoring and documentation opportunities
  - Advanced patterns and architectural considerations
  - Reduced time estimates (0.7x base time)

### **18.5 Skill-Aware Recommendation System**

**Enhanced Recommendation Generation:**

```typescript
interface SkillAwareRecommendation extends ActionableRecommendation {
  skillContext: {
    userCurrentLevel: number;        // 1-10 in relevant category
    recommendationDifficulty: number; // 1-10 required skill level
    skillGap: number;                // Difference (negative = too advanced)
    learningOpportunity: boolean;    // True if within learnable range (gap ≤ 3)
  };
  
  adaptedActionSteps: {
    preparatorySteps?: string[];     // Added for beginners
    coreSteps: string[];             // Adjusted complexity
    advancedSteps?: string[];        // Added for experts
    skillSpecificGuidance: string[]; // Based on current level
  };
  
  priorityAdjustment: {
    originalPriority: number;
    skillAdjustedPriority: number;   // Higher for declining skills, lower for strong areas
    urgencyModification: string;     // Adjusted timeline based on skill level
  };
}
```

**Recommendation Adaptation Logic:**
- **Declining Skills**: +20 priority score, upgraded to "next_sprint" urgency
- **Strong Areas**: -10 priority score if already improving and skilled (≥6)
- **Skill Gaps > 3**: Add prerequisite learning steps and foundational content
- **Expert Level**: Add mentoring opportunities and pattern documentation suggestions

### **18.6 Skill-Aware RAG Search Integration**

**Intelligent Query Enhancement:**

The RAG framework now provides personalized search experiences:

```typescript
interface SkillAwareRAGQuery {
  originalQuery: string;
  enhancedQuery: string;           // Augmented with skill-appropriate terms
  difficultyFilter: 'beginner' | 'intermediate' | 'advanced' | null;
  personalizedRanking: {
    focusAreaBoost: boolean;       // Boost content in weak skill areas
    appropriateLevelFilter: boolean; // Filter out inappropriate complexity
    learningIntentDetection: boolean; // Detect learning vs. reference queries
  };
  
  searchResults: SkillAwareSearchResult[]; // Re-ranked for personalization
  learningRecommendations: {
    prerequisites: string[];        // Required background knowledge
    nextSteps: string[];           // Suggested follow-up learning
    relatedConcepts: string[];     // Connected topics to explore
  };
}
```

**Content Relevance Scoring:**
- **Appropriate Level**: 1.2x score boost for content within ±2 skill levels
- **Learning Opportunities**: 1.3x boost for content that's challenging but learnable
- **Focus Areas**: 1.15x boost for content in user's weak skill areas
- **Too Advanced**: 0.7x penalty for content >4 levels above user skills

### **18.7 Learning Engagement Tracking**

**Comprehensive Learning Analytics:**

```typescript
interface LearningEngagement {
  educationalContentId: string;
  engagementType: 'viewed' | 'applied' | 'completed' | 'recommended';
  skillsTargeted: string[];        // Categories addressed by the content
  improvementObserved: boolean;    // Measured through subsequent PR analysis
  timestamp: Date;
  
  // Skill impact measurement
  skillImpact: {
    category: string;
    beforeLevel: number;
    afterLevel: number;
    improvement: number;           // Calculated after PR application
    confidenceLevel: number;      // Based on evidence quality
  }[];
}
```

**Learning Impact Calculation:**
- **Viewed Content**: +0.2 to +0.5 skill improvement (low confidence)
- **Applied Recommendations**: +0.8 to +1.5 skill improvement (medium confidence)  
- **Completed Tutorials**: +1.0 to +2.0 skill improvement (high confidence)
- **Successful Implementation**: Measured through subsequent PR analysis quality

### **18.8 Skill Progression Analytics**

**Comprehensive Progress Tracking:**

```typescript
interface SkillProgressionAnalytics {
  overallTrend: 'improving' | 'maintaining' | 'declining';
  categoryProgressions: {
    [skillCategory: string]: {
      currentLevel: number;
      previousLevel: number;
      improvement: number;
      trend: 'improving' | 'maintaining' | 'declining';
      recentActivity: {
        prCount: number;
        avgComplexity: number;
        successRate: number;
        timespan: string;
      };
    };
  };
  
  focusAreas: string[];            // Skills below level 5 needing attention
  strengths: string[];             // Skills at level 7+ that are strong
  nextMilestones: string[];        // Specific improvement targets
  achievementUnlocks: string[];    // Recognition for progress made
}
```

**Achievement System:**
- **Milestone Achievements**: "Reached intermediate level in Security" (level 5→6)
- **Expertise Recognition**: "Achieved advanced proficiency in Architecture" (level 7+)
- **Progression Awards**: "Steadily improving in Performance (+1.2 levels)"
- **Overall Excellence**: "Strong overall development skills" (average ≥6)

### **18.9 Integration Architecture**

**Central Skill Integration Service:**

```typescript
interface SkillIntegrationResult {
  skillAssessment: {
    assessments: SkillAssessment[];
    skillsUpdated: string[];
    improvements: Record<string, number>;
  };
  personalizedRecommendations: RecommendationModule;
  learningPathUpdated: boolean;
  engagementTracked: boolean;
  progressionAnalytics: SkillProgressionAnalytics;
}

// Integration with Result Orchestrator
class SkillIntegrationService {
  static async integrateWithResultOrchestrator(
    authenticatedUser: AuthenticatedUser,
    prAnalysis: any,
    prMetadata: PRMetadata,
    processedResults: any
  ): Promise<SkillIntegrationResult | null>
}
```

**Pipeline Integration Points:**
1. **PR Analysis** → Skill Assessment → Skill Updates
2. **Recommendation Generation** → Skill-Aware Adaptation → Personalized Recommendations  
3. **Educational Content** → Skill-Based Filtering → Adaptive Learning Paths
4. **RAG Search** → User Context Enhancement → Personalized Results
5. **Progress Tracking** → Analytics Generation → Dashboard Updates

### **18.10 API Endpoints for Skill Management**

**Skill Analytics API:**
```typescript
// User skill dashboard data
GET /api/skills/analytics
Response: {
  currentSkills: DeveloperSkill[];
  progressionTrends: Record<string, SkillProgression>;
  learningPlan: SkillDevelopmentPlan;
  achievements: string[];
  recommendations: string[];
}

// Skill-based content filtering preferences
GET /api/skills/content-preferences
Response: {
  difficultyPreferences: Record<string, 'beginner' | 'intermediate' | 'advanced'>;
  focusAreas: string[];
  avoidAreas: string[];
}

// Track recommendation application
POST /api/skills/recommendation-applied
Body: {
  recommendationId: string;
  applied: boolean;
  improvementObserved: boolean;
}
```

### **18.11 Performance and Scalability**

**Efficient Skill Tracking:**
- **Incremental Updates**: Only calculate skill changes, not full recalculation
- **Batch Processing**: Group skill updates for multiple PRs
- **Caching Strategy**: Cache user skill contexts for session duration
- **Background Processing**: Skill progression analytics calculated asynchronously

**Storage Optimization:**
- **Skill History Retention**: Keep last 100 entries per skill category
- **Aggregated Analytics**: Store monthly skill progression summaries
- **Evidence Compression**: Store essential PR metadata, not full analysis data

### **18.12 Privacy and Data Protection**

**Skill Data Privacy:**
- **User Consent**: Explicit opt-in for skill tracking features
- **Data Anonymization**: Skill analytics aggregated across teams without personal identifiers
- **Retention Policies**: Skill history retained only as long as user account is active
- **Export Capability**: Users can export their complete skill progression data

### **18.13 Validation and Quality Assurance**

**Skill Assessment Accuracy:**
- **Confidence Scoring**: All skill updates include confidence levels (0-1)
- **Cross-Validation**: Compare skill assessments with peer review outcomes
- **Feedback Loops**: Track whether skill-based recommendations lead to successful implementations
- **Manual Override**: Users can adjust skill levels with admin approval

**Learning Effectiveness Measurement:**
- **Implementation Success**: Track whether educational content leads to improved PR quality
- **Skill Application**: Measure time between learning and successful skill demonstration
- **Recommendation Accuracy**: Monitor whether skill-based recommendations are actionable and effective

### **18.14 Future Enhancements**

**Advanced Skill Modeling:**
- **Skill Dependencies**: Model prerequisite relationships between skills
- **Learning Velocity**: Predict skill improvement rates based on user patterns
- **Team Dynamics**: Analyze skill complementarity within development teams
- **Domain Specialization**: Track specialized skills beyond core categories

**AI-Powered Insights:**
- **Learning Path Optimization**: Use ML to optimize learning sequences for individual users
- **Skill Gap Prediction**: Predict future skill needs based on project trajectories
- **Mentorship Matching**: Connect users with complementary skill levels for mentoring
- **Content Generation**: Generate personalized educational content based on specific skill gaps

---

**Impact Summary:**
The User Skill Tracking System transforms CodeQual from a static analysis tool into an intelligent, adaptive learning companion that:
- **Automatically tracks** user skill development through PR analysis
- **Personalizes** all educational content and recommendations to user skill levels  
- **Adapts** search results and learning paths based on individual capabilities
- **Provides** comprehensive analytics and achievement recognition for continuous motivation
- **Integrates seamlessly** with existing analysis workflows while adding personalization layer

This system realizes the original vision of tracing user skill growth over time through PR frequency, issue severity correlation, and learning progress tracking, while providing a foundation for advanced personalized development experiences.

✅ Updated header to reflect "Enhanced Monitoring Service & Observability Implementation"
✅ Added comprehensive Section 17: "Enhanced Monitoring Service & Observability (NEW - June 15, 2025)"
✅ Documented complete monitoring architecture with Prometheus, Grafana, and Loavable integration
✅ Added AI tool integration schema and common PromQL queries
✅ Documented API endpoints and event-driven architecture
✅ Included deployment and performance considerations
✅ **NEW**: Added comprehensive Section 18: "User Skill Tracking & Personalized Learning System (NEW - June 15, 2025)"
✅ **NEW**: Documented complete skill tracking architecture with PR-based assessment and personalized learning
✅ **NEW**: Detailed Educational Agent integration with skill-aware content adaptation
✅ **NEW**: Skill-aware recommendation system and RAG search integration
✅ **NEW**: Learning engagement tracking and progression analytics
✅ **NEW**: API endpoints and integration architecture for skill management



 Backend Support Analysis for Educational Overlays UX

  ✅ FULLY SUPPORTED - Ready for UI Implementation:

  1. Hover Explanations: Technical terms with context

  // ✅ We provide this via EducationalContent.explanations
  {
    concept: "SQL Injection",
    simpleExplanation: "When user input isn't properly sanitized...",
    technicalDetails: "Occurs when dynamic SQL queries concatenate...",
    whyItMatters: "Can lead to complete database compromise",
    examples: [CodeExample]
  }
  UI Implementation: Frontend can map concept to hover targets and show layered explanations.

  2. "Why This Matters": Brief explanations for each finding

  // ✅ Multiple data sources support this:
  findings: {
    title: "SQL Injection vulnerability",
    description: "User input not sanitized",
    whyItMatters: "Critical security risk", // From educational content
    recommendation: "Use parameterized queries"
  }
  UI Implementation: Backend provides contextual importance for every finding.

  3. Code Examples: Before/after comparisons

  // ✅ CodeExample interface specifically supports this:
  {
    title: "SQL Injection Fix",
    language: "javascript",
    code: "const query = 'SELECT * FROM users WHERE id = ?'",
    explanation: "Uses parameterized query to prevent injection",
    type: "after" // Also supports: "before", "good", "bad"
  }
  UI Implementation: Frontend can render side-by-side before/after code blocks.

  4. Learning Badges: Achievements for skill progression

  // ✅ Skill tracking provides all necessary data:
  SkillProgression: {
    previousLevel: 3,
    newLevel: 5,
    improvement: 2,
    trend: 'improving'
  }

  LearningEngagement: {
    engagementType: 'completed',
    skillsTargeted: ['security'],
    improvementObserved: true
  }
  UI Implementation: Frontend can award badges based on skill improvements and engagement.

  📊 Backend Data Support Summary:

  | UX Feature         | Backend Support | Data Source                           | UI Implementation Ready |
  |--------------------|-----------------|---------------------------------------|-------------------------|
  | Hover Explanations | ✅ Full          | EducationalContent.explanations       | Ready                   |
  | Why This Matters   | ✅ Full          | whyItMatters + finding context        | Ready                   |
  | Learning Badges    | ✅ Full          | SkillProgression + LearningEngagement | Ready                   |
  | Code Examples      | ✅ Full          | CodeExample with before/after types   | Ready                   |

  🚀 Additional Backend Capabilities for Rich UX:

  Skill-Aware Content Personalization:

  // Backend automatically adapts content based on user skill level
  skillContext: {
    userLevel: 3,
    focusAreas: ['security'],
    strongAreas: ['performance']
  }
  // Results in beginner-friendly explanations for security, advanced for performance

  Contextual Learning Paths:

  // Backend provides structured learning progression
  learningPath: {
    difficulty: 'guided', // Adjusted for user skill level
    steps: [
      { topic: 'Environment Variable Security', estimatedTime: '30 min' },
      { topic: 'Input Validation', estimatedTime: '1 hour' }
    ]
  }

  Achievement Data for Badges:

  // Backend tracks multiple achievement triggers
  - Skill level improvements (1→5 levels = badges)
  - Learning engagement completion
  - Issue resolution in PRs
  - Educational content consumption

  🎯 Conclusion: YES - Fully Supported!

  Our backend completely supports the Educational Overlays UX module requirements:

  ✅ Hover Explanations: Rich contextual data with layered explanations✅ Why This Matters: Contextual importance and impact explanations✅ Learning Badges:
  Full skill progression and achievement tracking✅ Code Examples: Before/after comparisons with explanations

  Plus Additional Capabilities:
  - Skill-aware content personalization
  - Contextual learning path generation
  - Achievement progression tracking
  - Real-time engagement monitoring

  The UI team can implement sophisticated educational overlays using our existing backend APIs without any additional backend development needed! 🎉

---

## 19. Dynamic Embedding Configuration System (NEW - January 6, 2025)

The system implements a **database-driven embedding configuration system** that allows dynamic model selection and configuration updates without code changes, supporting easy migration to more advanced embedding models as they become available.

### **19.1 Architecture Overview**

The embedding configuration system provides a flexible, maintainable approach to managing embedding models across different content types and use cases:

```typescript
/**
 * Dynamic embedding configuration system
 * Manages embedding models through database configuration
 * rather than hardcoded values
 */
interface EmbeddingConfigurationSystem {
  configurationStorage: DatabaseDrivenConfig;
  modelSelection: ContentAwareSelection;
  metricsTracking: EmbeddingPerformanceMetrics;
  migrationSupport: SeamlessModelUpgrades;
}
```

### **19.2 Database Schema**

**Configuration Tables:**

```sql
-- Main configuration table
CREATE TABLE embedding_configurations (
    id SERIAL PRIMARY KEY,
    config_name VARCHAR(100) UNIQUE NOT NULL,
    provider VARCHAR(50) NOT NULL,
    model_name VARCHAR(100) NOT NULL,
    dimensions INTEGER NOT NULL,
    max_tokens INTEGER NOT NULL,
    api_key_env_var VARCHAR(50),
    base_url VARCHAR(500),
    description TEXT,
    cost_per_1k_tokens DECIMAL(10, 6),
    last_updated DATE NOT NULL,
    avg_latency_ms INTEGER,
    quality_score DECIMAL(3, 2),
    is_active BOOLEAN DEFAULT true,
    is_default BOOLEAN DEFAULT false,
    content_type_preference VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Metrics tracking table
CREATE TABLE embedding_model_metrics (
    id BIGSERIAL PRIMARY KEY,
    config_id INTEGER REFERENCES embedding_configurations(id),
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    requests_count INTEGER NOT NULL DEFAULT 0,
    avg_latency_ms INTEGER,
    p95_latency_ms INTEGER,
    p99_latency_ms INTEGER,
    error_count INTEGER DEFAULT 0,
    total_tokens_used BIGINT DEFAULT 0,
    total_cost_usd DECIMAL(10, 4) DEFAULT 0,
    metric_window VARCHAR(20) NOT NULL,
    window_start TIMESTAMP NOT NULL,
    window_end TIMESTAMP NOT NULL
);
```

### **19.3 Current Configuration**

As of January 2025, the system is configured with three embedding models:

```typescript
// Default configurations loaded into the database
const defaultConfigurations = [
  {
    config_name: 'openai-3-large',
    provider: 'openai',
    model_name: 'text-embedding-3-large',
    dimensions: 3072,
    max_tokens: 8191,
    cost_per_1k_tokens: 0.00013,
    content_type_preference: 'documentation',
    is_default: true
  },
  {
    config_name: 'voyage-code-3',
    provider: 'voyage',
    model_name: 'voyage-code-3',
    dimensions: 1024,
    max_tokens: 16000,
    cost_per_1k_tokens: 0.00012,
    content_type_preference: 'code'
  },
  {
    config_name: 'openai-3-small',
    provider: 'openai',
    model_name: 'text-embedding-3-small',
    dimensions: 1536,
    max_tokens: 8191,
    cost_per_1k_tokens: 0.00002,
    content_type_preference: 'general'
  }
];
```

### **19.4 Content-Aware Model Selection**

The system automatically selects the appropriate embedding model based on content type:

```typescript
/**
 * Intelligent model selection based on content characteristics
 */
async function selectEmbeddingModel(content: string, contentType?: string) {
  // Priority order:
  // 1. Explicit content type match
  // 2. Content analysis (code patterns, documentation markers)
  // 3. Default configuration
  
  if (contentType === 'code') {
    // Use Voyage Code-3 for code embeddings (optimized for code)
    return await embeddingConfigService.getConfigForContentType('code');
  } else if (contentType === 'documentation') {
    // Use OpenAI Large for documentation (better semantic understanding)
    return await embeddingConfigService.getConfigForContentType('documentation');
  } else {
    // Fall back to default
    return await embeddingConfigService.getDefaultConfig();
  }
}
```

### **19.5 Embedding Service Integration**

The `OpenRouterEmbeddingService` (despite its name, it now connects directly to providers) loads configurations dynamically:

```typescript
export class OpenRouterEmbeddingService {
  private async loadConfigFromDatabase(): Promise<void> {
    try {
      const defaultConfig = await embeddingConfigService.getDefaultConfig();
      if (defaultConfig) {
        // Update service configuration from database
        this.currentConfig = {
          provider: defaultConfig.provider,
          model: defaultConfig.model_name,
          dimensions: defaultConfig.dimensions,
          maxTokens: defaultConfig.max_tokens,
          costPerMillion: (defaultConfig.cost_per_1k_tokens || 0) * 1000
        };
        
        // Load content-specific configurations
        const codeConfig = await embeddingConfigService.getConfigForContentType('code');
        if (codeConfig && codeConfig.provider === 'voyage') {
          // Special handling for Voyage AI (code-optimized)
          this.voyageClient = new VoyageAIClient({ 
            apiKey: process.env[codeConfig.api_key_env_var] 
          });
        }
      }
    } catch (error) {
      this.logger.error('Failed to load embedding configuration', { error });
      // Fall back to hardcoded defaults
    }
  }
}
```

### **19.6 Configuration Management API**

RESTful API endpoints for managing embedding configurations:

```typescript
// API Endpoints
GET    /api/embedding-config              // List all configurations
GET    /api/embedding-config/:name        // Get specific configuration
POST   /api/embedding-config              // Create new configuration
PUT    /api/embedding-config/:name        // Update configuration
DELETE /api/embedding-config/:name        // Deactivate configuration
GET    /api/embedding-config/metrics/:id  // Get performance metrics
```

### **19.7 Maintenance Guide: Adding New Models**

To add a new embedding model (e.g., upgrading to a hypothetical GPT-5 embedding):

**Step 1: Add Configuration to Database**

```sql
-- Via Supabase SQL Editor or migration
INSERT INTO embedding_configurations (
    config_name,
    provider,
    model_name,
    dimensions,
    max_tokens,
    api_key_env_var,
    description,
    cost_per_1k_tokens,
    last_updated,
    is_active,
    content_type_preference
) VALUES (
    'gpt5-embedding-large',
    'openai',
    'text-embedding-gpt5-large',
    4096,  -- New model with higher dimensions
    16384, -- Larger context window
    'OPENAI_API_KEY',
    'GPT-5 large embedding model with improved semantic understanding',
    0.00020,
    '2025-07-01',
    true,
    'documentation' -- Can replace existing preference
);
```

**Step 2: Test New Configuration**

```javascript
// Test script to verify new model
const testNewEmbedding = async () => {
  const config = await embeddingConfigService.getConfigByName('gpt5-embedding-large');
  const result = await openRouterEmbeddingService.createEmbedding(
    'Test content for new model',
    'documentation'
  );
  console.log('Embedding dimensions:', result.length);
  console.log('Expected dimensions:', config.dimensions);
};
```

**Step 3: Gradual Migration**

```sql
-- Phase 1: Run both models in parallel (A/B testing)
UPDATE embedding_configurations 
SET is_active = true 
WHERE config_name IN ('openai-3-large', 'gpt5-embedding-large');

-- Phase 2: Make new model default after validation
UPDATE embedding_configurations SET is_default = false WHERE is_default = true;
UPDATE embedding_configurations SET is_default = true WHERE config_name = 'gpt5-embedding-large';

-- Phase 3: Deactivate old model
UPDATE embedding_configurations 
SET is_active = false 
WHERE config_name = 'openai-3-large';
```

### **19.8 Performance Monitoring**

The system tracks embedding performance metrics automatically:

```typescript
// Metrics recorded for each embedding operation
await embeddingConfigService.recordMetrics(configId, {
  latencyMs: 245,
  tokensUsed: 1500,
  success: true,
  errorMessage: undefined
});

// Query performance metrics
const metrics = await embeddingConfigService.getConfigMetrics(
  configId, 
  'last_24h'
);
// Returns: { avgLatencyMs: 230, errorRate: 0.01, totalRequests: 5420 }
```

### **19.9 Advanced Configuration Features**

**Multi-Provider Support:**
```typescript
// System supports multiple providers simultaneously
const providers = {
  'openai': OpenAIProvider,
  'voyage': VoyageAIProvider,
  'cohere': CohereProvider,    // Future addition
  'anthropic': AnthropicProvider // Future addition
};
```

**Automatic Fallback:**
```typescript
// If primary model fails, automatically fallback
async function createEmbeddingWithFallback(content: string) {
  const primary = await embeddingConfigService.getDefaultConfig();
  try {
    return await createEmbedding(content, primary);
  } catch (error) {
    const fallback = await embeddingConfigService.getConfigByName('openai-3-small');
    return await createEmbedding(content, fallback);
  }
}
```

**Cost Optimization:**
```typescript
// Select model based on cost constraints
async function selectCostOptimalModel(contentLength: number) {
  const configs = await embeddingConfigService.getActiveConfigs();
  return configs.reduce((optimal, config) => {
    const cost = (contentLength / 1000) * config.cost_per_1k_tokens;
    return cost < optimal.cost ? config : optimal;
  });
}
```

### **19.10 Migration Best Practices**

When upgrading to new embedding models:

1. **Dimension Compatibility**: Ensure new model dimensions are compatible with vector database indices
2. **Quality Testing**: Run quality assessments on sample data before full migration
3. **Gradual Rollout**: Use content type preferences to test on specific data types first
4. **Performance Baseline**: Establish performance metrics before migration
5. **Rollback Plan**: Keep previous configuration active until new model is validated

### **19.11 Future Enhancements**

Planned improvements to the embedding configuration system:

- **Automatic Model Discovery**: Query provider APIs for new models
- **Quality Scoring**: Automated quality assessment based on retrieval accuracy
- **Dynamic Dimension Mapping**: Support for models with different embedding dimensions
- **Multi-Modal Embeddings**: Support for image and code-specific embeddings
- **Regional Configuration**: Different models for different geographic regions

### **19.12 Troubleshooting Guide**

Common issues and solutions:

**Issue: "relation 'embedding_configurations' does not exist"**
- Solution: Run migration script `create-embedding-tables.sql` in Supabase

**Issue: Old API key still being used**
- Solution: Check shell environment variables don't override .env settings
- Run: `unset OPENAI_API_KEY` before starting the application

**Issue: Wrong model being selected**
- Solution: Check content_type_preference in database configuration
- Verify is_active and is_default flags are set correctly

**Issue: High latency with new model**
- Solution: Monitor embedding_model_metrics table
- Consider adjusting max_tokens or switching providers

---

**Summary**: The dynamic embedding configuration system provides a robust, maintainable approach to managing embedding models. By storing configurations in the database rather than hardcoding them, the system supports easy upgrades to more advanced models as they become available, with built-in performance tracking and gradual migration capabilities.