# Kubernetes Implementation Plan for V9 Analyzer

## Session Summary (2025-09-16)

### What We Accomplished
1. ✅ Identified that the system is still falling back to simulation mode
2. ✅ Created `LocalRepositoryManager` for local cloning (but this is NOT the desired approach)
3. ✅ Created `KubernetesRepositoryManager` blueprint for proper K8s operations
4. ✅ Modified `V9AnalyzerFrameworkEnhanced` to support mode switching

### Key Issues Identified
1. **Simulation Fallback**: CloudRepositoryManager falls back to simulation when cloud API fails
2. **Missing Code Snippets**: Tools provide file locations but code snippets aren't being fetched
3. **Repository Metrics**: Shows 0 files analyzed even when processing real repositories
4. **Model Configuration**: Should only use Supabase models, no hardcoded fallbacks

## Architecture Decision

**IMPORTANT**: We should NOT clone repositories locally. All operations must happen in Kubernetes:

```
User Request → API → Kubernetes Job → Clone in Pod → Run Tools in Pods → Return Results
```

## Next Session Tasks

### 1. Complete Kubernetes Implementation
- [ ] Integrate `KubernetesRepositoryManager` into V9 framework
- [ ] Remove local mode completely
- [ ] Ensure all operations happen in K8s pods

### 2. Kubernetes Jobs Structure
```yaml
# Clone Job
- Creates PVC for workspace
- Clones repository in pod
- TTL: 300 seconds after completion

# Tool Execution Jobs
- Mount PVC with cloned repo
- Run tools (SpotBugs, PMD, etc.)
- Stream output to logs
- TTL: 300 seconds after completion
```

### 3. Fix Code Snippet Fetching
- [ ] Tools provide file locations
- [ ] Agents use UnifiedLocationService to fetch code
- [ ] Code fetched from K8s PVC volumes

### 4. Fix Repository Metrics
- [ ] Count actual files in K8s workspace
- [ ] Track files analyzed by each tool
- [ ] Report real metrics in final report

## Technical Details

### PVC Strategy
- One PVC per analysis session
- Shared between clone and tool jobs
- Auto-cleanup after analysis completes

### Job Parallelization
- Clone main and PR branches in parallel
- Run multiple tools concurrently
- Aggregate results asynchronously

### Error Handling
- No fallback to simulation
- Proper error reporting if K8s operations fail
- Retry logic for transient failures

## Files to Modify

1. `/src/two-branch/analyzers/v9-analyzer-framework-enhanced.ts`
   - Remove local mode support
   - Use KubernetesRepositoryManager only

2. `/src/two-branch/utils/cloud-repository-manager.ts`
   - Remove simulation fallback
   - Throw errors instead of simulating

3. `/src/two-branch/analyzers/v9-tool-orchestrator.ts`
   - Ensure UnifiedLocationService integration
   - Fix code snippet fetching from K8s

## Testing Strategy

```bash
# Test with real Kubernetes cluster
kubectl get pods -n codequal-dev

# Run analysis
npx ts-node src/two-branch/tests/run-real-v9-java-analysis.ts

# Monitor jobs
kubectl get jobs -n codequal-dev -w

# Check PVCs
kubectl get pvc -n codequal-dev
```

## Expected Outcome

After implementation:
1. No more simulation mode
2. Real repository cloning in K8s
3. Actual tool execution with real output
4. Code snippets fetched from cloned repositories
5. Accurate metrics in reports

---

**Note**: This plan ensures all operations happen in Kubernetes infrastructure, maintaining the cloud-native architecture as intended.