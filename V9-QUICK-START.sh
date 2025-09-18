#!/bin/bash

# V9 QUICK START SCRIPT
# Run this at the beginning of any V9 session to verify everything is ready

echo "🚀 V9 SYSTEM QUICK START"
echo "========================"
echo ""

# Step 1: Show critical documentation
echo "📚 CRITICAL DOCUMENTATION TO READ:"
echo "  1. /V9-SYSTEM-OVERVIEW.md - Complete system overview"
echo "  2. /packages/agents/V9_CANONICAL_ARCHITECTURE.md - The canonical flow"
echo "  3. /packages/agents/test-v8-final.ts - Working implementation"
echo ""

# Step 2: Check environment variables
echo "🔍 Checking environment variables..."
ENV_VARS=(
    "SUPABASE_URL"
    "SUPABASE_SERVICE_ROLE_KEY"
    "OPENROUTER_API_KEY"
    "REDIS_URL"
    "HYBRID_AGENT_URL"
)

ALL_SET=true
for var in "${ENV_VARS[@]}"; do
    if [ -z "${!var}" ]; then
        echo "  ❌ $var is NOT set"
        ALL_SET=false
    else
        echo "  ✅ $var is set"
    fi
done
echo ""

# Step 3: Check Kubernetes connectivity
echo "☸️  Checking Kubernetes..."
if kubectl get pods -n codequal-dev &>/dev/null; then
    POD_COUNT=$(kubectl get pods -n codequal-dev --no-headers | wc -l | tr -d ' ')
    echo "  ✅ Kubernetes connected ($POD_COUNT pods running)"

    # Check PVC
    if kubectl get pvc codequal-workspace -n codequal-dev &>/dev/null; then
        echo "  ✅ PVC 'codequal-workspace' exists"
    else
        echo "  ❌ PVC 'codequal-workspace' NOT found"
        echo "     Run: kubectl apply -f - <<EOF"
        echo "apiVersion: v1"
        echo "kind: PersistentVolumeClaim"
        echo "metadata:"
        echo "  name: codequal-workspace"
        echo "  namespace: codequal-dev"
        echo "spec:"
        echo "  accessModes: [ReadWriteOnce]"
        echo "  resources:"
        echo "    requests:"
        echo "      storage: 10Gi"
        echo "  storageClassName: do-block-storage"
        echo "EOF"
    fi
else
    echo "  ❌ Cannot connect to Kubernetes"
fi
echo ""

# Step 4: Check Redis
echo "🔴 Checking Redis..."
if redis-cli -u "$REDIS_URL" ping &>/dev/null; then
    echo "  ✅ Redis connected"
else
    echo "  ⚠️  Redis not accessible (will use fallback)"
fi
echo ""

# Step 5: Check build status
echo "🏗️  Checking build..."
if [ -d "packages/agents/dist" ]; then
    echo "  ✅ Build directory exists"

    # Check key V9 files
    V9_FILES=(
        "packages/agents/dist/two-branch/analyzers/v9-tool-orchestrator.js"
        "packages/agents/dist/two-branch/analyzers/v9-repository-manager.js"
        "packages/agents/dist/two-branch/utils/smart-file-selector.js"
    )

    for file in "${V9_FILES[@]}"; do
        if [ -f "$file" ]; then
            echo "  ✅ $(basename $file) exists"
        else
            echo "  ❌ $(basename $file) NOT found - rebuild needed"
        fi
    done
else
    echo "  ❌ Build directory not found"
    echo "     Run: cd packages/agents && npm run build"
fi
echo ""

# Step 6: Show V9 component locations
echo "📁 V9 COMPONENT LOCATIONS:"
echo "  Tool Orchestrator: /packages/agents/src/two-branch/analyzers/v9-tool-orchestrator.ts"
echo "  Repository Manager: /packages/agents/src/two-branch/analyzers/v9-repository-manager.ts"
echo "  Smart File Selector: /packages/agents/src/two-branch/utils/smart-file-selector.ts"
echo "  Enhanced Fix Generator: /packages/agents/src/two-branch/services/enhanced-fix-generator.ts"
echo "  5 Agents: /packages/agents/src/two-branch/agents/specialized-agents.ts"
echo ""

# Step 7: Show container images
echo "🐳 ANALYZER CONTAINER IMAGES:"
echo "  Java: analyzer:lang-java-v5.1"
echo "  Python: analyzer:lang-python-v4.3"
echo "  JavaScript: analyzer:lang-javascript-v4.3"
echo "  Go: analyzer:lang-go-v2.1"
echo "  Rust: analyzer:lang-rust-v1.3"
echo ""

# Step 8: Show test commands
echo "🧪 TEST COMMANDS:"
echo "  Working reference test:"
echo "    cd packages/agents && npx ts-node test-v8-final.ts"
echo ""
echo "  Test with real Kafka PR:"
echo "    node test-v9-kafka-real.js"
echo ""

# Step 9: Summary
echo "📊 SUMMARY:"
if [ "$ALL_SET" = true ] && kubectl get pods -n codequal-dev &>/dev/null; then
    echo "  ✅ System is ready for V9 testing"
    echo ""
    echo "  REMEMBER:"
    echo "  - DO NOT create new tool execution logic"
    echo "  - DO NOT create new file selection algorithms"
    echo "  - DO NOT use generic Docker images"
    echo "  - USE the existing V9 components"
    echo "  - FOLLOW the canonical V9 flow"
else
    echo "  ⚠️  Some components need attention (see above)"
fi
echo ""
echo "========================"
echo "V9 Quick Start Complete"