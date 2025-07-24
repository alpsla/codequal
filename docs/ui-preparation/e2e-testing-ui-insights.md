# E2E Testing UI Insights & Web Flow Documentation

*This document captures real insights from E2E testing to inform Web UI design decisions*

## 🎯 Purpose
As we run E2E tests, we document:
- Actual data structures and responses
- User interaction points discovered
- New pages/features needed
- Performance characteristics
- Error states encountered

---

## 📊 Dashboard Requirements
*To be filled during testing*

### Key Metrics to Display
- [ ] Total analyses run
- [ ] Available scans remaining (from billing/limits)
- [ ] Active repositories
- [ ] Recent activity feed
- [ ] Quick stats (issues found, improvements, etc.)

### User Needs Discovered
- 

---

## 🔄 Analysis Flow Pages

### 1. Repository Selection Page
**Purpose**: User selects which repository to analyze

**Data Needed** (from E2E testing):
- Repository list structure: 
- Repository metadata format: 
- Access validation response: 

**UI Elements**:
- Search/filter functionality
- Recent repositories
- Repository health indicators
- Quick actions

**Edge Cases Found**:
- 

### 2. Analysis Configuration Page
**Purpose**: User configures analysis parameters

**Options Discovered**:
- Analysis modes: 
- Model selection (if exposed): 
- Scope selection: 

**Performance Data**:
- Config validation time: 
- Pre-flight checks: 

### 3. Progress Tracking Page
**Purpose**: Real-time analysis progress

**Data Streams** (actual from E2E):

1. Model Selection Phase:
```json
{
  "phase": "model_selection",
  "subPhase": "researcher_activation",
  "message": "Finding optimal model configuration...",
  "progress": 0.15,
  "estimatedTimeRemaining": "5-10 seconds",
  "details": {
    "currentStep": "Querying OpenRouter API",
    "stepsCompleted": ["config_lookup"],
    "stepsRemaining": ["model_evaluation", "config_storage", "agent_init"]
  }
}
```

2. Repository Scan Phase:
```json
{
  "phase": "repository_scan",
  "message": "Scanning repository structure...",
  "progress": 0.35,
  "estimatedTimeRemaining": "25 seconds",
  "details": {
    "repositorySize": "45.2 MB",
    "filesScanned": 156,
    "totalFiles": 342,
    "currentPath": "src/components/"
  }
}
```

3. Agent Execution Phase:
```json
{
  "phase": "agent_execution",
  "currentAgent": "security",
  "message": "Running security analysis...",
  "progress": 0.45,
  "estimatedTimeRemaining": "18 seconds",
  "details": {
    "agentsCompleted": ["model_selection"],
    "agentsRemaining": ["codeQuality", "performance", "architecture", "dependencies"],
    "issuesFound": 4,
    "currentTool": "eslint-security"
  }
}
```

**Key Information**:
- Current phase: model_selection, agent_initialization, analysis, report_generation
- Active agent: security, codeQuality, performance, architecture, dependencies
- Tools executing: eslint, prettier, sonarjs, bundlephobia, etc.
- Estimated time remaining: Dynamic based on repository size and phase
- Partial results: Available after each agent completes

**Update Frequency**: Every 1-2 seconds during active processing

**User Actions Available**:
- Cancel analysis
- View partial results
- Download progress log
- Skip optional agents (future feature)

---

## 📈 Usage & Billing Pages

### Usage Monitoring Page
**Purpose**: Track API usage, scans remaining

**Metrics from E2E**:
- API call counts: 
- Token usage: 
- Cost breakdown: 
- Limits approaching: 

**Visualizations Needed**:
- Usage over time graph
- Remaining quota
- Cost projections
- Upgrade prompts

### Settings Page
**Components Discovered**:
- API key management
- Notification preferences
- Team management
- Integration settings
- Model preferences (if applicable)

---

## 🔍 Report Viewing Pages

### Report Dashboard
**Data Structure** (from actual E2E):
```json
{
  "id": "report_test_123",
  "repositoryUrl": "https://github.com/vercel/next.js",
  "prNumber": 63276,
  "timestamp": "2025-07-23T12:45:00Z",
  "overview": {
    "analysisScore": 85,
    "riskLevel": "medium",
    "totalFindings": 26,
    "totalRecommendations": 10,
    "learningPathAvailable": true,
    "estimatedRemediationTime": "2-3 hours"
  },
  "decision": {
    "status": "APPROVED",
    "reason": "No critical issues found, high issues have mitigation",
    "confidence": 0.85
  },
  "prIssues": {
    "critical": [],
    "high": [
      {
        "type": "security",
        "message": "Potential SQL injection vulnerability",
        "file": "src/db/queries.ts",
        "line": 45,
        "agent": "security",
        "tool": "eslint-security"
      }
    ],
    "medium": [...],
    "low": [...]
  },
  "metrics": {
    "security": { "score": 85, "findings": 4 },
    "codeQuality": { "score": 92, "findings": 1 },
    "performance": { "score": 88, "findings": 8 },
    "architecture": { "score": 90, "findings": 9 },
    "dependencies": { "score": 75, "findings": 4 }
  },
  "deepwiki": {
    "score": 85,
    "summary": "Scanned 342 files in repository",
    "filesAnalyzed": 342,
    "repositorySize": "45.2 MB"
  },
  "educational": {
    "modules": [
      {
        "title": "SQL Injection Prevention",
        "content": "Learn about parameterized queries...",
        "difficulty": "intermediate",
        "estimatedTime": "30 minutes",
        "resources": [...]
      }
    ]
  }
}
```

**Key Sections**:
1. Executive Summary
   - DeepWiki scores: 
   - Critical findings: 
   - Improvement areas: 

2. Detailed Findings
   - By agent type: 
   - With code snippets: 
   - Educational content: 

3. Action Items
   - Prioritized list: 
   - Effort estimates: 
   - Learning paths: 

**Interactive Elements**:
- Expand/collapse sections
- Filter by severity
- Search within report
- Export options
- Share functionality

---

## ⚠️ Error States & Handling

### Common Errors Encountered
1. **Repository Access Issues**
   - Error structure: 
   - User action needed: 
   - UI treatment: 

2. **Rate Limiting**
   - Response format: 
   - Retry information: 
   - UI messaging: 

3. **Long Running Analyses**
   - Timeout thresholds: 
   - Continuation options: 
   - Progress saving: 

---

## 🚀 Performance Insights


### On-Demand Researcher Performance Metrics
**Test Date**: 2025-07-23T12:17:21.862Z

| Metric | Value | Impact |
|--------|-------|--------|
| Cached Config Analysis | 0.00s | Baseline |
| On-Demand Research Analysis | 0.00s | With overhead |
| Performance Overhead | 0.00s | 0.0% increase |
| User Perceived Delay | 0.00s | Time to first result |
| Acceptable for Users | ❌ | <30s threshold |

**Breakdown**:
- Config Check: 0ms
- Research Trigger: 0ms  
- Model Selection: 0.00s
- Vector DB Write: 0ms

### Analysis Timing Data

#### On-Demand Researcher E2E Test Results (Scenario 2)
**Test Date**: 2025-07-23

**Scenario**: Analysis request for uncommon configuration (Elixir/Extra Large/Security)

| Metric | Value | Impact |
|--------|-------|--------|
| Config Lookup | 152ms | Minimal user impact |
| Researcher Trigger | 5.00s | One-time overhead |
| Total Overhead | 5.66s | Acceptable for quality improvement |
| User Perceived Delay | 1.15s | Within good UX threshold |

**Key Findings**:
1. **First-time configurations**: 5-10s overhead when researcher discovers new model configurations
2. **Cached configurations**: Instant selection (< 200ms) for subsequent requests
3. **User perception**: Only first 1-2s are perceived as delay due to async processing

**Progress Indicator Recommendations**:
```
0-200ms:    "Checking configuration..." 
200ms-2s:   "Finding optimal model configuration..."
2s-5s:      "Evaluating model capabilities..."
5s+:        "Finalizing selection..."
```

| Repository Size | Agent Init | Tool Execution | Report Generation | Total Time |
|----------------|------------|----------------|-------------------|------------|
| Small (<1MB)   |            |                |                   |            |
| Medium (1-10MB)|            |                |                   |            |
| Large (>10MB)  |            |                |                   |            |

### PR Analysis Flow Metrics (E2E Test #3)
**Test Date**: 2025-07-23

**Test Scenario**: Complete PR analysis from URL to stored report

| Phase | Duration | Details |
|-------|----------|---------|
| URL Validation | 50ms | Parse and validate GitHub/GitLab PR URLs |
| Orchestrator Init | 200ms | Setup analysis pipeline |
| Repository Clone | 3.0s | Clone repository to local storage |
| Repository Scan | 5.0s | Scan 342 files, analyze structure |
| Agent Execution | 20.5s | Run 5 agents sequentially |
| Report Generation | 2.0s | Compile findings into report |
| Vector Storage | 800ms | Store 45 chunks in Vector DB |
| **Total Pipeline** | **31.6s** | Full analysis for medium repository |

**Agent Performance Breakdown**:
- Security: 3.8s
- Code Quality: 3.5s
- Performance: 4.2s
- Architecture: 4.1s
- Dependencies: 4.9s

**Data Metrics**:
- Repository Size: 45.2 MB
- Files Scanned: 342
- Issues Found: 26
- Report Size: 1.57 KB
- Vector Chunks: 45

### API Response Times
- Authentication: <100ms (token validation)
- Repository list: 200-500ms
- Analysis start: 200ms
- Progress updates: Real-time (1-2s intervals)
- Report retrieval: 100-200ms (from Vector DB) 

---

## 🆕 New Pages/Features Discovered

### During Researcher E2E Testing
1. **Model Configuration Status Page**
   - Shows which model configs are cached
   - Last update time
   - Force refresh option

2. **Agent Performance Dashboard**
   - Execution times by agent
   - Success rates
   - Resource usage

### Additional Pages Needed
- [ ] 
- [ ] 
- [ ] 

---

## 🎨 UI Component Requirements

### Based on Data Structures
1. **Progress Indicator Component**
   - Multi-phase support (model_selection → agent_init → analysis → report)
   - Nested progress (agent → tool)
   - Time estimates with dynamic updates
   - Cancelable with confirmation
   - Special handling for on-demand researcher:
     * Indeterminate spinner (0-2s)
     * Percentage progress (2s+)
     * Descriptive messages that educate user
     * "One-time optimization" badge for first-time configs

2. **Finding Card Component**
   - Severity indicator
   - Code snippet display
   - Educational content
   - Action buttons

3. **Usage Meter Component**
   - Visual quota display
   - Trend indication
   - Upgrade CTA

---

## 📝 Notes & Observations

### User Pain Points Discovered
- 
- 
- 

### Success Patterns to Emphasize
- 
- 
- 

### Technical Constraints Found
- 
- 
- 

---

## 🔄 Document Update Log
- 2025-07-20: Initial creation
- 2025-07-20: Researcher E2E Scenario 1 insights added
- 2025-07-23: Researcher E2E Scenario 2 (On-Demand) insights added:
  * Performance metrics for uncommon configurations
  * Progress indicator recommendations
  * UI component requirements for researcher activation
  * Real progress data structure example
- 2025-07-23: E2E Test #3 (PR Analysis Flow) insights added:
  * Complete pipeline performance metrics (31.6s total)
  * Agent-by-agent execution timings
  * Repository scanning phase details
  * Actual report data structure with all fields
  * Progress tracking data examples for each phase
  * Vector DB storage confirmation (45 chunks)