# Phase 3 Test Execution Guide

## Prerequisites Check

1. **Environment Variables**: ✅ Verified - `.env` file exists with all required configurations
2. **Test Files**: ✅ All 8 test files are in place
3. **Dependencies**: Ensure npm packages are installed

## Running Phase 3 Tests

### Option 1: Using the Test Script (Recommended)
```bash
cd "/Users/alpinro/Code Prjects/codequal"
chmod +x integration-tests/scripts/run-phase3-tests.sh
./integration-tests/scripts/run-phase3-tests.sh
```

### Option 2: Direct NPM Command
```bash
cd "/Users/alpinro/Code Prjects/codequal/integration-tests"
npm test tests/phase3-agents/
```

### Option 3: Run Individual Test Files
```bash
cd "/Users/alpinro/Code Prjects/codequal/integration-tests"

# Original Phase 3 tests
npm test tests/phase3-agents/agent-initialization.test.ts
npm test tests/phase3-agents/agent-tool-results-processing.test.ts
npm test tests/phase3-agents/agent-execution-without-tools.test.ts
npm test tests/phase3-agents/agent-context-enrichment.test.ts
npm test tests/phase3-agents/agent-integration-vectordb.test.ts

# New integration tests
npm test tests/phase3-agents/agent-mcp-integration.test.ts
npm test tests/phase3-agents/agent-multi-integration.test.ts
npm test tests/phase3-agents/agent-orchestrator-flow.test.ts
```

## Expected Test Coverage

### 1. Agent Initialization (agent-initialization.test.ts)
- Dynamic agent creation from RESEARCHER data
- Model configuration retrieval
- Fallback configuration
- OpenRouter integration setup

### 2. Tool Results Processing (agent-tool-results-processing.test.ts)
- Code Quality agent processing ESLint results
- Security agent processing Semgrep results
- Performance agent processing Lighthouse results
- Architecture agent processing Dependency Cruiser results
- Cross-tool intelligence

### 3. Execution Without Tools (agent-execution-without-tools.test.ts)
- Agent analysis based on context alone
- Educational content generation without tools
- Reporting without tool metrics
- Configuration fallback scenarios

### 4. Context Enrichment (agent-context-enrichment.test.ts)
- Repository context retrieval from Vector DB
- Cross-repository pattern learning
- Agent-specific context enhancement
- Context quality assessment

### 5. Vector DB Integration (agent-integration-vectordb.test.ts)
- RESEARCHER configuration retrieval
- Vector DB data structure verification
- Missing configuration handling
- Performance benchmarks

### 6. MCP Integration (agent-mcp-integration.test.ts) - NEW
- Agent enhancement with tool capabilities
- Analysis context creation
- Tool result formatting
- Integration with RESEARCHER configs

### 7. Multi-Agent Integration (agent-multi-integration.test.ts) - NEW
- Executor enhancement with tools
- Language/framework detection
- Tool result storage
- Error handling

### 8. Orchestrator Flow (agent-orchestrator-flow.test.ts) - NEW
- Tool mapping verification
- PR complexity analysis
- DeepWiki request generation
- Report compilation

## Expected Results

### Success Indicators:
- All tests pass (0 failures)
- Performance benchmarks met (<50ms for most operations)
- Proper fallback behavior when tools unavailable
- Correct integration with existing architecture

### Common Issues:
1. **Supabase Connection**: Ensure SUPABASE_URL and keys are correct
2. **Import Errors**: Check that all packages are built (`npm run build` in root)
3. **Type Errors**: Ensure TypeScript is compiled
4. **Timeout Errors**: Tests have 30s timeout, may need adjustment for slow connections

## Troubleshooting

If tests fail:
1. Check error messages for specific failures
2. Verify Supabase connection
3. Ensure all packages are built
4. Check that RESEARCHER configurations exist in Vector DB
5. Review test logs for detailed error information

## Post-Test Actions

After successful test run:
1. Review test output for any warnings
2. Check performance metrics
3. Verify no test data pollution in Vector DB
4. Document any issues found

## Running with Coverage
```bash
cd "/Users/alpinro/Code Prjects/codequal/integration-tests"
npm test -- --coverage tests/phase3-agents/
```

## Important Notes

- Tests use real Vector DB data (RESEARCHER configurations)
- MCP tools are not implemented yet, so tests verify fallback behavior
- Lower confidence scores are expected without tools (0.5-0.7 vs 0.8-0.9)
- All tests should complete within 30 seconds total
