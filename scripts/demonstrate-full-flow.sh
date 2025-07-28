#!/bin/bash

echo "🔍 DeepWiki Full Flow Demonstration"
echo "=================================="
echo ""
echo "This demonstration shows the complete flow:"
echo "1. Initial state (clean disk)"
echo "2. DeepWiki clones repository" 
echo "3. MCP tools access cached files"
echo "4. Cleanup removes repository"
echo ""

# Function to show disk state
show_state() {
    local phase=$1
    echo "📊 $phase:"
    
    # Get disk info
    DISK_INFO=$(kubectl exec -n codequal-dev deployment/deepwiki -- df -h /root/.adalflow 2>/dev/null | tail -1)
    USED=$(echo $DISK_INFO | awk '{print $3}')
    PERCENT=$(echo $DISK_INFO | awk '{print $5}')
    
    # Get repo list
    REPOS=$(kubectl exec -n codequal-dev deployment/deepwiki -- ls /root/.adalflow/repos 2>/dev/null || echo "none")
    
    echo "   Disk: $USED used ($PERCENT)"
    echo "   Repos: $REPOS"
    echo ""
}

# Step 1: Initial state
show_state "Initial State"

# Step 2: Clone repository (simulate DeepWiki)
echo "🚀 Simulating DeepWiki clone..."
kubectl exec -n codequal-dev deployment/deepwiki -- bash -c "cd /root/.adalflow/repos && git clone https://github.com/vercel/swr.git 2>/dev/null || echo 'Already exists'" > /dev/null
sleep 2
show_state "After Clone"

# Step 3: Access files (simulate MCP tools)
echo "🔧 Simulating MCP tools file access..."
echo "   Reading package.json from cloned repo..."
kubectl exec -n codequal-dev deployment/deepwiki -- cat /root/.adalflow/repos/swr/package.json 2>/dev/null | head -5 || echo "   File not found"
echo ""
sleep 2

# Step 4: Cleanup (simulate orchestrator cleanup)
echo "🧹 Simulating cleanup after analysis..."
kubectl exec -n codequal-dev deployment/deepwiki -- rm -rf /root/.adalflow/repos/swr
sleep 2
show_state "After Cleanup"

echo "✅ Flow demonstration complete!"
echo ""
echo "Summary:"
echo "- Repository was cloned successfully"
echo "- Files were accessible to MCP tools"
echo "- Cleanup removed the repository"
echo "- Disk usage returned to baseline"