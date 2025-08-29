# Specialized Agents × MCP Tools Matrix
## Generated: 2025-08-28

## 📊 Overview
This matrix maps each specialized agent to their relevant MCP tools, showing primary and secondary tool assignments.

---

## 🛡️ Security Agent

| Tool | Type | Purpose | Priority | Status |
|------|------|---------|----------|--------|
| **semgrep-mcp** | MCP | Code security scanning, SAST analysis | PRIMARY | ✅ Registered |
| **npm-audit-direct** | Direct | Dependency vulnerability scanning | PRIMARY | ✅ Registered |
| **mcp-scan** | MCP | Security verification & compliance | PRIMARY | ✅ In Registry |
| **ref-mcp** | MCP | Real-time CVE/vulnerability research | PRIMARY | ✅ In Registry |
| **sonarjs-direct** | Direct | Security code patterns | SECONDARY | ✅ Registered |
| **eslint-direct** | Direct | Security linting rules | SECONDARY | ✅ Registered |
| gitleaks | External | Secret scanning | PLANNED | ❌ Not Integrated |
| trivy | External | Container scanning | PLANNED | ❌ Not Integrated |

### Security Agent Capabilities
- ✅ SQL Injection Detection
- ✅ XSS Vulnerability Scanning
- ✅ Authentication Bypass Analysis
- ✅ Dependency Vulnerability Checks
- ✅ Security Best Practices
- ⏳ Secret Detection (planned)
- ⏳ Container Security (planned)

---

## 📝 Code Quality Agent

| Tool | Type | Purpose | Priority | Status |
|------|------|---------|----------|--------|
| **eslint-direct** | Direct | JS/TS linting | PRIMARY | ✅ Registered |
| **sonarjs-direct** | Direct | Advanced quality rules | PRIMARY | ✅ Registered |
| **prettier-direct** | Direct | Code formatting | PRIMARY | ✅ Registered |
| **serena-mcp** | MCP | Semantic code understanding | PRIMARY | ✅ Registered |
| jscpd-direct | Direct | Copy-paste detection | SECONDARY | ❌ Not Found |
| complexity-report | Direct | Complexity metrics | PLANNED | ❌ Not Integrated |

### Code Quality Capabilities
- ✅ Linting & Style Checks
- ✅ Code Complexity Analysis
- ✅ Formatting Validation
- ✅ Semantic Analysis
- ⏳ Duplication Detection (planned)
- ⏳ Code Smell Detection (planned)

---

## ⚡ Performance Agent

| Tool | Type | Purpose | Priority | Status |
|------|------|---------|----------|--------|
| **bundlephobia-direct** | Direct | Bundle size analysis | PRIMARY | ✅ Registered |
| **madge-direct** | Direct | Circular dependencies | PRIMARY | ✅ Registered |
| **sonarjs-direct** | Direct | Complexity metrics | SECONDARY | ✅ Registered |
| lighthouse-direct | Direct | Web performance | PLANNED | ❌ Not Implemented |
| webpack-bundle-analyzer | External | Bundle visualization | PLANNED | ❌ Not Integrated |

### Performance Capabilities
- ✅ Bundle Size Analysis
- ✅ Dependency Graph Analysis
- ✅ Complexity Metrics
- ⏳ Runtime Performance (planned)
- ⏳ Memory Profiling (planned)
- ⏳ Load Time Analysis (planned)

---

## 🏗️ Architecture Agent

| Tool | Type | Purpose | Priority | Status |
|------|------|---------|----------|--------|
| **madge-direct** | Direct | Circular dependency detection | PRIMARY | ✅ Registered |
| **dependency-cruiser-direct** | Direct | Dependency validation | PRIMARY | ✅ Registered |
| **serena-mcp** | MCP | Code structure analysis | PRIMARY | ✅ Registered |
| git-mcp | MCP | File structure analysis | SECONDARY | ❌ Not Found |
| structure-mcp | MCP | Architecture patterns | PLANNED | ❌ Not Integrated |

### Architecture Capabilities
- ✅ Circular Dependency Detection
- ✅ Module Boundary Validation
- ✅ Code Structure Analysis
- ✅ Dependency Graph Visualization
- ⏳ Layered Architecture Validation (planned)
- ⏳ Design Pattern Detection (planned)

---

## 📦 Dependency Agent

| Tool | Type | Purpose | Priority | Status |
|------|------|---------|----------|--------|
| **npm-audit-direct** | Direct | Security vulnerabilities | PRIMARY | ✅ Registered |
| **license-checker-direct** | Direct | License compliance | PRIMARY | ✅ Registered |
| **npm-outdated-direct** | Direct | Version currency | PRIMARY | ✅ Registered |
| **dependency-cruiser-direct** | Direct | Dependency rules | PRIMARY | ✅ Registered |
| **ref-mcp** | MCP | Package research | PRIMARY | ✅ In Registry |
| bundlephobia-direct | Direct | Package size impact | SECONDARY | ✅ Registered |

### Dependency Capabilities
- ✅ Vulnerability Detection
- ✅ License Compliance Checking
- ✅ Version Currency Analysis
- ✅ Dependency Rule Validation
- ✅ Package Research & Info
- ✅ Size Impact Analysis

---

## 📚 Educational Agent

| Tool | Type | Purpose | Priority | Status |
|------|------|---------|----------|--------|
| **context-mcp** | MCP | Vector DB & web context | PRIMARY | ✅ In Registry |
| **context7-mcp** | MCP | Real-time documentation | PRIMARY | ✅ In Registry |
| **working-examples-mcp** | MCP | Code examples | PRIMARY | ✅ In Registry |
| **ref-mcp** | MCP | Best practices research | PRIMARY | ✅ In Registry |
| mcp-docs-service | MCP | Documentation analysis | SECONDARY | ❌ Not Found |
| knowledge-graph-mcp | MCP | Learning paths | PLANNED | ❌ Not Found |
| mcp-memory | MCP | Progress tracking | PLANNED | ❌ Not Found |

### Educational Capabilities
- ✅ Context Retrieval
- ✅ Documentation Access
- ✅ Working Examples
- ✅ Best Practices
- ⏳ Learning Path Generation (planned)
- ⏳ Progress Tracking (planned)

---

## 📈 Reporting Agent

| Tool | Type | Purpose | Priority | Status |
|------|------|---------|----------|--------|
| **chartjs-mcp** | MCP | Charts/visualizations | PRIMARY | ✅ In Registry |
| **mermaid-mcp** | MCP | Diagram generation | PRIMARY | ✅ In Registry |
| **markdown-pdf-mcp** | MCP | Report formatting | PRIMARY | ✅ In Registry |
| **grafana-direct** | Direct | Dashboard integration | SECONDARY | ✅ Registered |
| html-report-mcp | MCP | HTML reports | PLANNED | ❌ Not Integrated |

### Reporting Capabilities
- ✅ Chart Generation
- ✅ Diagram Creation
- ✅ PDF Export
- ✅ Dashboard Integration
- ⏳ Interactive Reports (planned)
- ⏳ Email Reports (planned)

---

## 🔄 Tool Coverage Summary

### By Agent Coverage
| Agent | Total Tools | Active | Registered | Planned |
|-------|------------|--------|------------|---------|
| Security | 8 | 6 | 6 | 2 |
| Code Quality | 6 | 4 | 4 | 2 |
| Performance | 5 | 3 | 3 | 2 |
| Architecture | 5 | 3 | 3 | 2 |
| Dependency | 6 | 6 | 6 | 0 |
| Educational | 7 | 4 | 4 | 3 |
| Reporting | 5 | 4 | 4 | 1 |

### By Tool Type
| Type | Count | Status |
|------|-------|--------|
| Direct Adapters | 14 | ✅ Mostly Integrated |
| MCP Adapters | 21 | 🔄 Partially Integrated |
| External Tools | 10+ | ⏳ Planned |

---

## 🎯 Priority Integration Order

### Phase 1: Core Security & Quality (DONE ✅)
1. ✅ semgrep-mcp
2. ✅ eslint-direct
3. ✅ npm-audit-direct
4. ✅ sonarjs-direct

### Phase 2: Architecture & Dependencies (DONE ✅)
1. ✅ madge-direct
2. ✅ dependency-cruiser-direct
3. ✅ license-checker-direct
4. ✅ npm-outdated-direct

### Phase 3: Performance & Reporting (IN PROGRESS 🔄)
1. ✅ bundlephobia-direct
2. ⏳ lighthouse-direct (needs implementation)
3. ✅ chartjs-mcp
4. ✅ mermaid-mcp

### Phase 4: Educational & Advanced (PLANNED ⏳)
1. ⏳ knowledge-graph-mcp
2. ⏳ mcp-memory
3. ⏳ git-mcp
4. ⏳ web-search-mcp

---

## 🔧 Tool Naming Conventions

### In Registry (from registry.ts)
- Security: `semgrep-mcp`, `npm-audit-direct`, `mcp-scan`, `ref-mcp`
- Code Quality: `eslint-direct`, `sonarjs-direct`, `prettier-direct`, `serena-mcp`
- Architecture: `madge-direct`, `dependency-cruiser-direct`, `serena-mcp`
- Performance: `bundlephobia-direct`, `sonarqube`, `sonarjs-direct`
- Dependency: `npm-audit-direct`, `license-checker-direct`, `npm-outdated-direct`, `ref-mcp`
- Educational: `context-mcp`, `context7-mcp`, `working-examples-mcp`, `ref-mcp`
- Reporting: `chartjs-mcp`, `mermaid-mcp`, `markdown-pdf-mcp`, `grafana-direct`

### Adapter Class Names
- Direct: `{ToolName}DirectAdapter` (e.g., `ESLintDirectAdapter`)
- MCP: `{ToolName}MCPAdapter` (e.g., `SemgrepMCPAdapter`)

---

## 📝 Notes

1. **Tool Overlap**: Some tools serve multiple agents (e.g., `sonarjs-direct` for both Security and Performance)
2. **Registry vs Implementation**: Tools may be in registry but not have working implementations
3. **Mock Mode**: Currently using mock mode for testing due to tool execution timeouts
4. **External Tools**: Many valuable tools exist but need MCP/Direct adapter wrappers

---

## 🚀 Quick Commands

### Test Individual Agent
```bash
# Test Security Agent with its tools
npx ts-node src/specialized/security-agent.ts

# Test Performance Agent
npx ts-node src/specialized/performance-agent.ts
```

### Register All Tools for an Agent
```typescript
// Example: Security Agent tools
const securityTools = [
  'semgrep-mcp',
  'npm-audit-direct',
  'mcp-scan',
  'ref-mcp',
  'sonarjs-direct',
  'eslint-direct'
];
```

### Check Tool Availability
```typescript
const adapter = new MCPToolAdapter();
console.log('Security tools:', adapter.getToolsForRole('security'));
console.log('Is semgrep available?', adapter.isToolAvailable('semgrep-mcp'));
```

---

## 🔮 Future Enhancements

1. **AI-Powered Tool Selection**: Use model researcher to optimize tool selection per context
2. **Dynamic Tool Loading**: Load tools on-demand based on file types and languages
3. **Tool Chaining**: Create pipelines where one tool's output feeds into another
4. **Custom Tool Creation**: Framework for adding project-specific tools
5. **Tool Performance Metrics**: Track and optimize tool execution times
6. **Intelligent Caching**: Cache tool results based on file fingerprints