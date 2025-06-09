# CodeQual Execution Flow - Visual Guide

## Correct Architecture Flow

```mermaid
graph TB
    subgraph "1. Initial Analysis"
        PR[PR URL] --> ORC[Orchestrator]
        ORC --> PA[PR Analysis]
        PA --> CTX[Context Detection]
        CTX --> |Language: TS<br/>Security: High<br/>Size: Large| REQ[Required Agents]
    end
    
    subgraph "2. Dynamic Configuration"
        REQ --> VDB[(Vector DB)]
        VDB --> |Query configs| CFG[Agent Configurations]
        CFG --> |Security: claude-3-opus<br/>Performance: gpt-4| AGT[Create Agents]
    end
    
    subgraph "3. MCP Tool Execution FIRST"
        AGT --> TS[Tool Selection]
        TS --> |Semgrep<br/>ESLint<br/>SonarQube| MCP[MCP Tool Executor]
        DW[DeepWiki Chunks] --> MCP
        MCP --> TR[Tool Results]
        TR --> |Concrete Findings:<br/>- 5 security issues<br/>- 12 code smells<br/>- 3 performance bottlenecks| FR[Findings Report]
    end
    
    subgraph "4. Agent Analysis with Context"
        FR --> SA[Security Agent]
        FR --> PA2[Performance Agent]
        CTX2[Vector Context] --> SA
        CTX2 --> PA2
        DW2[DeepWiki Context] --> SA
        DW2 --> PA2
        SA --> |Enriched Analysis| AR1[Agent Report 1]
        PA2 --> |Enriched Analysis| AR2[Agent Report 2]
    end
    
    subgraph "5. Final Compilation"
        AR1 --> COMP[Orchestrator Compiler]
        AR2 --> COMP
        COMP --> EDU[Educational Agent]
        COMP --> RPT[Reporting Agent]
        EDU --> FINAL[Final Output]
        RPT --> FINAL
    end
```

## Incorrect Understanding (What We Had)

```mermaid
graph TB
    subgraph "WRONG Flow"
        PR2[PR URL] --> CFG2[Hardcoded Config]
        CFG2 --> |Fixed: claude-3-opus| AGT2[Agents]
        AGT2 --> EXEC[Execute Analysis]
        EXEC --> MCP2[MCP Coordination]
        MCP2 --> RES[Results]
    end
    
    style CFG2 fill:#ff6b6b
    style MCP2 fill:#ff6b6b
```

## Key Differences

### ✅ CORRECT: Tools First, Then Analysis
```
1. MCP Tools Execute → Get concrete findings (ESLint: 12 issues)
2. Agents Analyze → Use findings + add context & intelligence
3. Result: Enriched analysis with actionable insights
```

### ❌ WRONG: Direct Agent Analysis
```
1. Agents Analyze → Without concrete tool data
2. MCP Coordinates → Just shares between agents
3. Result: Abstract analysis without specific findings
```

## Example: Security Analysis

### Correct Flow:
```typescript
// 1. Tool executes first
const semgrepResults = await mcpTools.execute('semgrep', prFiles);
// Returns: { findings: [SQLInjection at line 45, XSS at line 89] }

// 2. Security agent analyzes with tool results
const securityAnalysis = await securityAgent.analyze({
  toolFindings: semgrepResults,
  deepwikiContext: "Repository has history of SQL injection issues",
  vectorContext: "Similar patterns found in 3 other repos"
});
// Returns: Enriched analysis with context and recommendations
```

### Wrong Flow:
```typescript
// Agent tries to analyze without tool results
const analysis = await securityAgent.analyze(prFiles);
// Missing: Concrete vulnerability findings from tools
```

## Configuration Examples

### Dynamic Model Selection:
```yaml
Small PR + JavaScript + Low Complexity:
  → gpt-3.5-turbo (fast, cheap, sufficient)

Large PR + Security Critical + High Complexity:
  → claude-3-opus (best for complex security analysis)

Medium PR + Performance Focus + TypeScript:
  → gpt-4-turbo (good balance for performance analysis)
```

### Tool Selection Based on Agents:
```yaml
Security Agent Required:
  → Tools: [semgrep, sonarqube, mcp-scan]
  
Performance Agent Required:
  → Tools: [lighthouse, bundlephobia, webpack-analyzer]
  
Code Quality Agent Required:
  → Tools: [eslint, prettier, complexity-report]
```

## Implementation Checklist

- [ ] Orchestrator analyzes PR to determine required agents
- [ ] Pull agent configurations from Vector DB (not hardcoded)
- [ ] Select tools based on required agents
- [ ] Execute MCP tools BEFORE agent analysis
- [ ] Pass tool results to agents as primary input
- [ ] Agents enrich tool findings with context
- [ ] Compile enriched reports for final output

This is the correct flow where tools provide the foundation and agents add the intelligence!
