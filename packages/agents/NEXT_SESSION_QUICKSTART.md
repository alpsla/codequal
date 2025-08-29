# 🚀 NEXT SESSION QUICKSTART

## Quick Setup (Copy-Paste Ready)

### 1. Start Redis (if not running)
```bash
redis-server
```

### 2. Start MCP Stack
```bash
cd /Users/alpinro/Code\ Prjects/codequal/packages/agents
docker-compose -f docker-compose.secure-mcp.yml up -d
```

### 3. Verify Environment
```bash
# Check all services
npm run codequal:session
```

## 🎯 TODAY'S MAIN OBJECTIVE

**Test the complete integration flow:**
```
MCP Tools → Specialized Agents → Orchestrator → Final Report
```

## 📋 Priority Tasks

### Task 1: Test Individual Agent-Tool Integration
```bash
# Test Security Agent with Semgrep MCP
USE_MCP_TOOLS=true npx ts-node src/specialized/test-security-agent.ts

# Test Code Quality Agent with ESLint MCP  
USE_MCP_TOOLS=true npx ts-node src/specialized/test-code-quality-agent.ts

# Test Performance Agent with Lighthouse MCP
USE_MCP_TOOLS=true npx ts-node src/specialized/test-performance-agent.ts
```

### Task 2: Test Data Flow Pipeline
```bash
# Test with small repos first (actual existing repos)
npm run test:integration -- --repo https://github.com/sindresorhus/ky
# Alternative small repos for testing:
# npm run test:integration -- --repo https://github.com/sindresorhus/p-limit
# npm run test:integration -- --repo https://github.com/sindresorhus/delay

# Verify data transformation
npx ts-node src/standard/tests/integration/test-data-flow.ts
```

### Task 3: End-to-End Orchestrator Test
```bash
# Full integration test with real PR
USE_MCP_TOOLS=true \
  npx ts-node src/standard/tests/integration/orchestrator-mcp-integration.test.ts \
  --repo https://github.com/sindresorhus/ky --pr 700
```

## 🔍 What to Check

1. **Tool Output Format**: Each MCP tool returns data in expected format
2. **Agent Processing**: Agents correctly parse and enhance tool data
3. **Data Aggregation**: Orchestrator combines all agent results
4. **Final Report**: Complete report with all agent contributions

## ⚠️ Known Issues to Watch

- MCP tools may need Docker restart if hanging
- Redis connection required for caching

## 📊 Success Metrics

- [ ] All MCP tools respond within 30 seconds
- [ ] Agent-tool integration works for 3+ agents
- [ ] Data flows correctly through entire pipeline
- [ ] Final report contains data from all sources
- [ ] No "undefined" or "unknown" values in report

## 🛠️ Debugging Commands

```bash
# Check MCP server logs
docker-compose -f docker-compose.secure-mcp.yml logs -f

# Test MCP connectivity
curl http://localhost:3100/health  # Semgrep
curl http://localhost:3101/health  # ESLint
curl http://localhost:3102/health  # Lighthouse

# Clear Redis cache if needed
redis-cli FLUSHALL

# Check TypeScript compilation
npm run typecheck
```

## 📝 Test Scenarios

### Scenario 1: Security Analysis
```bash
# Input: Repository with known vulnerabilities
# Expected: Security agent uses Semgrep to find issues
# Verify: Report contains CVE numbers and remediation steps
```

### Scenario 2: Performance Analysis
```bash
# Input: Web application repository
# Expected: Performance agent uses Lighthouse for metrics
# Verify: Report contains Core Web Vitals scores
```

### Scenario 3: Code Quality
```bash
# Input: TypeScript project
# Expected: Code quality agent uses ESLint for analysis
# Verify: Report contains linting issues and complexity metrics
```

## 🎉 Session Complete Checklist

- [ ] MCP tools integrated with at least 3 agents
- [ ] Data flow pipeline fully tested
- [ ] Orchestrator successfully aggregates all data
- [ ] Final report generation working
- [ ] Integration tests passing
- [ ] Documentation updated

---

**Last Session**: Successfully implemented dynamic model discovery with fresh models (< 6 months old)
**This Session**: Test complete integration flow from tools to final report
**Next Session**: Production deployment preparation and performance optimization