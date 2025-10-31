# V9 SYSTEM OVERVIEW - CANONICAL REFERENCE

## ⚠️ CRITICAL: READ THIS FIRST IN EVERY SESSION

**DO NOT CREATE NEW TOOL EXECUTION LOGIC** - The system already has everything built!

## 🏗️ What Already Exists (DO NOT RECREATE)

### 1. Repository Management & Caching
- **Location**: `/packages/agents/src/two-branch/analyzers/v9-repository-manager.ts`
- **Purpose**: Handles repository cloning, caching, and indexing
- **Features**:
  - Automatic workspace creation in Kubernetes PVC
  - Smart caching for large repositories
  - Two-branch comparison (main vs PR)

### 2. Smart File Selection
- **Location**: `/packages/agents/src/two-branch/utils/smart-file-selector.ts`
- **Rules**:
  - < 10,000 files → 100% coverage
  - > 10,000 files → Smart selection (~500 most important files)
  - Prioritizes: PR changes > Critical files > Entry points > Config > Tests
- **DO NOT** create new file selection logic - use `SmartFileSelector` class

### 3. Tool Execution Infrastructure
- **Location**: `/packages/agents/src/two-branch/analyzers/v9-tool-orchestrator.ts`
- **Container Images** (in registry.digitalocean.com/codequal):
  - `analyzer:lang-java-v5.1` - Java tools (SpotBugs, PMD, Checkstyle, etc.)
  - `analyzer:lang-python-v4.3` - Python tools
  - `analyzer:lang-javascript-v4.3` - JavaScript/TypeScript tools
  - `analyzer:lang-go-v2.1` - Go tools
  - `analyzer:lang-rust-v1.3` - Rust tools
- **DO NOT** try to use generic Docker images - use our specialized analyzers

### 4. Kubernetes Infrastructure
- **Namespace**: `codequal-dev`
- **PVC**: `codequal-workspace` (10Gi storage for repositories)
- **Registry Secret**: `registry-codequal` (for pulling our analyzer images)
- **Hybrid Agent**: `http://129.212.136.24` (orchestrates cloud execution)

### 5. The 5 Mandatory Agents
All located in `/packages/agents/src/two-branch/agents/specialized-agents.ts`:
1. **Security Agent** - Security vulnerability analysis
2. **Quality Agent** - Code quality and maintainability
3. **Performance Agent** - Performance bottlenecks
4. **Architecture Agent** - Architectural patterns and design
5. **Dependency Agent** - Dependency vulnerabilities

### 6. AI-Powered Fix Generation
- **Location**: `/packages/agents/src/two-branch/services/enhanced-fix-generator.ts`
- **Features**:
  - Uses OpenRouter API with dynamic model selection
  - Generates fixes based on issue context, NOT templates
  - Batch processing (Security: 10, Quality: 5, etc.)

## 🔄 The Canonical V9 Flow (NEVER DEVIATE)

```mermaid
graph TD
    A[1. Clone/Cache Repository] --> B[2. Smart File Selection]
    B --> C[3. Run Tools on BOTH Branches]
    C --> D[4. 5 Agents Process Results]
    D --> E[5. Orchestrator Deduplicates]
    E --> F[6. Split Flow]
    F --> G[7a. Educator Service]
    F --> H[7b. Comparator Service]
    G --> I[8. Generate Report]
    H --> I
```

## 📁 Key Files to Reference

### For Testing V9 System
```bash
# The WORKING test that uses all infrastructure correctly
/packages/agents/test-v8-final.ts

# V9 test runner with all components
/packages/agents/src/standard/tests/regression/v9-test-runner.ts
```

### For Understanding Architecture
```bash
# Complete V9 architecture documentation
/packages/agents/V9_CANONICAL_ARCHITECTURE.md

# Repository manager with caching
/packages/agents/src/two-branch/analyzers/v9-repository-manager.ts

# Tool orchestrator
/packages/agents/src/two-branch/analyzers/v9-tool-orchestrator.ts

# Smart file selector
/packages/agents/src/two-branch/utils/smart-file-selector.ts
```

## 🚫 Common Mistakes to Avoid

### ❌ DON'T DO THIS:
1. Create new tool execution logic
2. Try to run tools directly with kubectl
3. Use generic Docker images (busybox, openjdk, etc.)
4. Create new file selection algorithms
5. Implement new caching mechanisms
6. Write simulation/fallback code
7. Create alternative flows to the canonical V9 flow

### ✅ DO THIS INSTEAD:
1. Use `V9ToolOrchestrator` for tool execution
2. Use `V9RepositoryManager` for repo management
3. Use our `analyzer:lang-*` images from the registry
4. Use `SmartFileSelector` for file selection
5. Use existing Redis caching
6. Fail fast with real errors
7. Follow the canonical V9 flow exactly

## 🔍 Quick Diagnostic Commands

```bash
# Check if Kubernetes is accessible
kubectl get pods -n codequal-dev

# Check if PVC exists
kubectl get pvc -n codequal-dev

# Check if analyzer images are available
doctl registry repository list-tags codequal

# Check environment variables
env | grep -E "(SUPABASE|OPENROUTER|REDIS|HYBRID_AGENT)"

# Run the WORKING test
cd /Users/alpinro/Code\ Prjects/codequal/packages/agents
npx ts-node test-v8-final.ts
```

## 📊 Real Infrastructure Status

### What's Actually Running:
- ✅ Kubernetes cluster with 11+ pods
- ✅ PVC `codequal-workspace` for repository storage
- ✅ Analyzer containers in DigitalOcean registry
- ✅ Redis cache for results
- ✅ Supabase for persistence
- ✅ Hybrid Agent for orchestration

### What Needs Manual Setup:
- Repository must be cloned to PVC first
- Registry credentials must be configured
- Environment variables must be set (.env file)

## 🎯 Testing Apache Kafka PR #17620

### The Correct Way:
```javascript
// Use the existing V9 components
const { V9ToolOrchestrator } = require('./packages/agents/dist/two-branch/analyzers/v9-tool-orchestrator');
const { V9RepositoryManager } = require('./packages/agents/dist/two-branch/analyzers/v9-repository-manager');
const { SmartFileSelector } = require('./packages/agents/dist/two-branch/utils/smart-file-selector');

// Configure for Kafka
const config = {
  repository: 'apache/kafka',
  prNumber: 17620,
  useSmartSelection: true,  // Will use smart selection for > 10k files
  maxFiles: 500,
  forceFullAnalysis: false
};

// Let the existing infrastructure handle everything
const repoManager = new V9RepositoryManager(config);
const { mainPath, prPath } = await repoManager.prepareRepositories(
  'https://github.com/apache/kafka',
  17620
);
```

## 🔴 CRITICAL REMINDERS

1. **THE SYSTEM IS 70% PRODUCTION READY** - Don't recreate what works
2. **USE THE ANALYZE FRAMEWORK** - It handles caching, indexing, and file selection
3. **NO SIMULATION** - Always use real cloud execution
4. **NO FALLBACKS** - Fail fast with real errors
5. **FOLLOW V9 CANONICAL FLOW** - No alternatives allowed

## 📝 Session Startup Checklist

When starting a new session on V9:
1. ✅ Read this document first
2. ✅ Check V9_CANONICAL_ARCHITECTURE.md
3. ✅ Verify environment variables are set
4. ✅ Check Kubernetes connectivity
5. ✅ Use existing V9 components (DON'T CREATE NEW ONES)
6. ✅ Reference test-v8-final.ts for working implementation

---

**REMEMBER**: The infrastructure is already built. Your job is to use it, not rebuild it!