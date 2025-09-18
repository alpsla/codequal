# Test Files Review and Cleanup Plan

## Test File Categories

### 1. 🗑️ OUTDATED - To Be Removed
These files are in the `outdated/` directory or use deprecated patterns:

#### Already in outdated/ directory:
- `outdated/test-quick-v9.ts`
- `outdated/generate-complete-v9-report.ts`
- `outdated/test-v9-real-pr-no-mock.ts`
- `outdated/test-v9-real-kafka-pr.ts`
- `outdated/run-java-pr-dynamic.ts`
- `outdated/fix-json-parsing.ts`
- `outdated/test-complete-fallback-flow.ts`
- `outdated/create-research-requests-table.ts`
- `outdated/debug-quality-output.ts`
- `outdated/test-v9-kafka-real-report.ts`
- `outdated/test-deepseek-quality.ts`
- `outdated/execute-real-v9-analysis.ts`
- `outdated/run-real-v9-analysis.ts`
- `outdated/test-v9-complete-report.ts`
- `outdated/test-v9-two-branch-verification.ts`
- `outdated/test-v9-enhanced-two-branch.ts`
- `outdated/test-v9-real-pr-all-languages.ts`

**Action**: Delete entire `outdated/` directory

### 2. ⚠️ NEEDS UPDATE - Currently Using OptimizedRepoManager
These tests need to be updated to use CloudRepositoryManager:

- `test-v9-tool-orchestrator.ts` - Main tool orchestrator test
- `run-real-v9-java-analysis.ts` - Java analysis runner
- `test-real-pr-no-mocks.ts` - Real PR testing
- `test-v9-complete-with-supabase.ts` - Supabase integration
- `test-v9-complete-report-generation.ts` - Report generation
- `run-real-java-pr-analysis.ts` - Java PR analysis
- `test-v9-comprehensive.ts` - Comprehensive V9 test
- `test-v9-universal-real-pr.ts` - Universal PR test
- `v9-real-integration-runner.ts` - Integration runner
- `run-v9-tests.ts` - Test runner

### 3. ✅ KEEP AS-IS - Already Cloud-Based or Still Relevant
These are already using cloud architecture or are utility tests:

- `test-cloud-java-pr-analysis.ts` - ✅ NEW cloud-based test
- `test-cloud-java-analysis.ts` - ✅ NEW cloud-based test
- `check-openrouter-balance.ts` - Utility for API balance
- `test-openrouter-models.ts` - Model testing utility
- `test-supabase-direct.ts` - Database connection test
- `test-researcher-functionality.ts` - Researcher component test
- `test-researcher-simple.ts` - Simple researcher test
- `test-all-components.ts` - Component integration test

### 4. 🔄 MIGRATE - V8 Tests (Legacy but may have value)
- `full-workflow-v8-integration.ts` - Old V8 workflow
- `full-workflow-v8-rust-fix.ts` - Old V8 Rust workflow
- `enhanced-report-generator.ts` - Old report generator

**Action**: Archive these for reference but don't update

## Recommended Test Structure

### Core Tests to Create/Update:

1. **test-cloud-all-languages.ts** (NEW)
   - Test Java, Python, JavaScript, Go, Rust
   - Use CloudRepositoryManager
   - Verify all language analyzers work

2. **test-cloud-integration.ts** (UPDATE from test-v9-comprehensive.ts)
   - Full integration test with cloud
   - Test complete workflow

3. **test-cloud-report-generation.ts** (UPDATE from test-v9-complete-report-generation.ts)
   - Test report generation with cloud data

4. **test-cloud-supabase.ts** (UPDATE from test-v9-complete-with-supabase.ts)
   - Test Supabase integration with cloud

## Cleanup Script

```bash
#!/bin/bash
# cleanup-tests.sh

# 1. Remove outdated directory
rm -rf src/two-branch/tests/outdated/

# 2. Archive V8 tests
mkdir -p src/two-branch/tests/archived-v8/
mv src/two-branch/tests/full-workflow-v8-*.ts src/two-branch/tests/archived-v8/
mv src/two-branch/tests/enhanced-report-generator.ts src/two-branch/tests/archived-v8/

# 3. List files that need updating
echo "Files needing CloudRepositoryManager update:"
grep -l "OptimizedRepoManager\|V9AnalyzerFramework" src/two-branch/tests/*.ts
```

## Priority Order for Updates

### Phase 1: Immediate (Today)
1. ✅ Create `test-cloud-all-languages.ts` - Test all 5 languages
2. ✅ Update `test-v9-tool-orchestrator.ts` - Main orchestrator
3. ✅ Clean up `outdated/` directory

### Phase 2: Short-term (This Week)
1. Update `run-real-v9-java-analysis.ts`
2. Update `test-v9-complete-report-generation.ts`
3. Update `test-v9-complete-with-supabase.ts`

### Phase 3: Long-term (Next Week)
1. Update remaining tests
2. Archive V8 tests
3. Create comprehensive test suite

## Test Coverage Goals

### Language Coverage:
- ✅ Java (Apache Kafka)
- ⏳ Python (Django/Flask)
- ⏳ JavaScript (React/Node.js)
- ⏳ Go (Kubernetes)
- ⏳ Rust (Servo)

### Feature Coverage:
- ✅ Cloud repository setup
- ✅ PR workspace creation
- ✅ Tool execution in cloud
- ⏳ Multi-language support
- ⏳ Report generation
- ⏳ Supabase integration
- ⏳ Cost tracking

## Next Steps

1. **Create Multi-Language Test**
   ```typescript
   // test-cloud-all-languages.ts
   const languages = [
     { lang: 'java', repo: 'apache/kafka', pr: 17620 },
     { lang: 'python', repo: 'django/django', pr: 15000 },
     { lang: 'javascript', repo: 'facebook/react', pr: 25000 },
     { lang: 'go', repo: 'kubernetes/kubernetes', pr: 100000 },
     { lang: 'rust', repo: 'rust-lang/rust', pr: 90000 }
   ];
   ```

2. **Update Core Tests**
   - Replace OptimizedRepoManager imports
   - Update to use CloudRepositoryManager
   - Remove local path references

3. **Create Cloud API Service**
   - After all languages tested
   - Deploy to Kubernetes
   - Connect CloudRepositoryManager to real API