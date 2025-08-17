# Pre-Commit Performance Check

Final performance validation before committing changes - ensures no performance regressions.

## Trigger Phrases:
- "Check performance before commit"
- "Validate performance"
- "Pre-commit checks"
- "Ready to commit?"

## Performance Validation Gate:

### Step 1: Baseline Check (Current State)
```bash
echo "📊 Pre-Commit Performance Validation"
echo "====================================="
START_TIME=$(date +%s)

# Memory baseline
echo "🧠 Memory Usage:"
ps aux | grep node | awk '{sum+=$6} END {printf "Node processes: %.1f MB\n", sum/1024}'
redis-cli INFO memory | grep used_memory_human | awk '{print "Redis cache: " $2}'
kubectl top pod -n codequal-dev -l app=deepwiki --no-headers 2>/dev/null | awk '{print "DeepWiki pod: " $3}'
```

### Step 2: Run Performance Tests
```bash
echo -e "\n⚡ Performance Tests:"

# Test 1: Build speed
BUILD_START=$(date +%s)
npm run build --workspace=packages/agents > /dev/null 2>&1
BUILD_END=$(date +%s)
echo "✓ Build time: $((BUILD_END - BUILD_START))s (threshold: <30s)"

# Test 2: TypeScript compilation
TSC_START=$(date +%s)
npm run typecheck > /dev/null 2>&1
TSC_END=$(date +%s)
echo "✓ TypeScript check: $((TSC_END - TSC_START))s (threshold: <15s)"

# Test 3: Quick test suite
TEST_START=$(date +%s)
USE_DEEPWIKI_MOCK=true npm test -- --testPathPattern="unit" --silent > /dev/null 2>&1
TEST_END=$(date +%s)
echo "✓ Unit tests: $((TEST_END - TEST_START))s (threshold: <20s)"

# Test 4: Mock analysis speed
ANALYSIS_START=$(date +%s)
USE_DEEPWIKI_MOCK=true timeout 10 npx ts-node -e "
const { ComparisonAgent } = require('./packages/agents/dist/standard/comparison/comparison-agent');
" 2>/dev/null
ANALYSIS_END=$(date +%s)
echo "✓ Mock analysis: $((ANALYSIS_END - ANALYSIS_START))s (threshold: <10s)"
```

### Step 3: Resource Impact Check
```bash
echo -e "\n📈 Resource Impact:"

# Check for memory leaks
CURRENT_MEM=$(ps aux | grep node | awk '{sum+=$6} END {print sum}')
echo "Memory delta: Check for leaks if >100MB increase"

# Check Redis cache size
CACHE_SIZE=$(redis-cli DBSIZE | awk '{print $1}')
echo "Cache entries: $CACHE_SIZE (warn if >10000)"

# Bundle size check (if applicable)
if [ -f "packages/agents/dist/index.js" ]; then
  BUNDLE_SIZE=$(du -h packages/agents/dist/index.js | cut -f1)
  echo "Bundle size: $BUNDLE_SIZE (warn if >5MB)"
fi
```

### Step 4: Performance Score & Decision
```bash
echo -e "\n🎯 Performance Score:"
TOTAL_TIME=$(($(date +%s) - START_TIME))

# Calculate score
SCORE=100
[ $((BUILD_END - BUILD_START)) -gt 30 ] && SCORE=$((SCORE - 20)) && echo "⚠️  Build time exceeded threshold"
[ $((TSC_END - TSC_START)) -gt 15 ] && SCORE=$((SCORE - 15)) && echo "⚠️  TypeScript check slow"
[ $((TEST_END - TEST_START)) -gt 20 ] && SCORE=$((SCORE - 15)) && echo "⚠️  Tests running slow"
[ $CACHE_SIZE -gt 10000 ] && SCORE=$((SCORE - 10)) && echo "⚠️  Cache size large"

echo -e "\nPerformance Score: $SCORE/100"

if [ $SCORE -ge 80 ]; then
  echo "✅ Performance check PASSED - Safe to commit!"
  echo -e "\n🚀 Proceeding with commit cycle:"
  
  # Trigger smart-commit-manager
  claude --agent smart-commit-manager \
    --instructions "Create organized commits with performance validation passed (score: $SCORE/100)"
    
elif [ $SCORE -ge 60 ]; then
  echo "⚠️  Performance check WARNING - Review before committing"
  echo "Consider running: /performance-monitor for detailed analysis"
  read -p "Continue with commit? (y/n): " -n 1 -r
  echo
  if [[ $REPLY =~ ^[Yy]$ ]]; then
    claude --agent smart-commit-manager
  fi
else
  echo "❌ Performance check FAILED - Fix issues before committing"
  echo "Run: /fix-and-complete to address performance issues"
  exit 1
fi
```

## Integration with Dev Cycle:
```bash
# Modified session-wrapper flow:
# 1. Fix issues (build-ci-fixer)
# 2. Run tests
# 3. 👉 Performance validation (this command)
# 4. Commit if passed (smart-commit-manager)
# 5. Update docs (progress-doc-manager)
```

## Quick Usage:
```bash
# Manual check
/pre-commit-perf-check

# Auto-chain with dev cycle
npm test && /pre-commit-perf-check && git commit
```