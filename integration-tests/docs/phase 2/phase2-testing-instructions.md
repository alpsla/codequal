# Phase 2 Testing Instructions

## Test Files Created (10 total)

### Core Orchestrator Tests (Original 6)
1. **orchestrator-initialization.test.ts** - Basic initialization and configuration
2. **orchestrator-pr-analysis.test.ts** - PR metadata extraction
3. **orchestrator-agent-selection.test.ts** - Agent selection logic
4. **orchestrator-deepwiki-config.test.ts** - DeepWiki configuration
5. **orchestrator-compilation.test.ts** - Context compilation
6. **orchestrator-error-recovery.test.ts** - Error handling

### Additional Tests (New 4)
7. **orchestrator-model-loading.test.ts** - Dynamic model loading from DB
8. **orchestrator-repository-model-search.test.ts** - Repository-based model search
9. **orchestrator-researcher-model-retrieval.test.ts** - RESEARCHER agent data retrieval
10. **orchestrator-deepwiki-researcher-retrieval.test.ts** - DeepWiki config from RESEARCHER

## Key Concepts Tested

### ✅ Correct Architecture Flow
1. **RESEARCHER Agent** (runs quarterly) has already:
   - Analyzed all available models
   - Created optimal configurations for every combination
   - Stored in Vector DB with special ID: `00000000-0000-0000-0000-000000000001`

2. **Orchestrator** (runs per PR) simply:
   - Extracts metadata (language, framework, size)
   - Retrieves pre-configured models from RESEARCHER data
   - No complex decision making needed

### ✅ MCP Tools Execute First
- Tools run BEFORE agents to get concrete findings
- Agents analyze tool results with context
- Not just coordination between agents

## Running the Tests

### Option 1: Run all Phase 2 tests
```bash
cd /Users/alpinro/Code\ Prjects/codequal
npm test -- integration-tests/tests/phase2-orchestrator
```

### Option 2: Run specific test file
```bash
cd /Users/alpinro/Code\ Prjects/codequal
npm test -- integration-tests/tests/phase2-orchestrator/orchestrator-researcher-model-retrieval.test.ts
```

### Option 3: Run with coverage
```bash
cd /Users/alpinro/Code\ Prjects/codequal
npm test -- --coverage integration-tests/tests/phase2-orchestrator
```

## Environment Setup Required

1. **Environment Variables**:
   ```bash
   export SUPABASE_URL=<your-supabase-url>
   export SUPABASE_SERVICE_ROLE_KEY=<your-service-key>
   ```

2. **Mock Data**:
   - Tests will insert mock RESEARCHER configurations
   - Uses test repository IDs from `test-config-updated.ts`

## Expected Results

- All 10 test files should pass
- Total test count: ~70+ tests
- Performance benchmarks met:
  - Initialization: <100ms
  - PR analysis: <50ms
  - Model retrieval: <50ms
  - Total orchestration: <200ms

## Next Steps After Testing

1. **If tests pass**: Move to Phase 3 (Agent Integration)
2. **If tests fail**: 
   - Check environment variables
   - Verify Supabase connection
   - Review mock VectorContextService implementation

## Notes

- The mock `VectorContextService` simplifies the real implementation
- RESEARCHER data is mocked but follows the real structure
- Tests validate the concept, not the full implementation
