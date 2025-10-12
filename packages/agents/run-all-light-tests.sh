#!/bin/bash
# Complete Light Multi-Repository Testing
# Tests all 5 frameworks sequentially

echo "🚀 Starting Complete Light Multi-Repository Testing..."
echo "=========================================="
date

RESULTS_DIR="/tmp/light-multi-repo-final-results"
mkdir -p "$RESULTS_DIR"

# Array of repositories to test
declare -A REPOS=(
    ["spring-petclinic"]="https://github.com/spring-projects/spring-petclinic|main|Spring Boot"
    ["quarkus-quickstarts"]="https://github.com/quarkusio/quarkus-quickstarts|main|Quarkus"
    ["micronaut-guides"]="https://github.com/micronaut-projects/micronaut-guides|master|Micronaut"
    ["commons-lang"]="https://github.com/apache/commons-lang|master|Plain Java"
    ["kafka"]="https://github.com/apache/kafka|trunk|Enterprise"
)

SUCCESS_COUNT=0
FAILED_COUNT=0

# Function to test a repository
test_repo() {
    local name=$1
    local info="${REPOS[$name]}"
    
    IFS='|' read -r url branch framework <<< "$info"
    
    echo ""
    echo "========================================="
    echo "🧪 Testing: $name"
    echo "📦 Framework: $framework"
    echo "🔗 URL: $url"
    echo "🌿 Branch: $branch"
    echo "========================================="
    
    local repo_dir="/tmp/${name}-test-repo"
    local start_time=$(date +%s)
    
    # Clone repository
    echo "📥 Cloning..."
    rm -rf "$repo_dir"
    if ! git clone --depth=10 --no-single-branch "$url" "$repo_dir" 2>&1 | tail -5; then
        echo "❌ Clone failed"
        echo "$name|$framework|FAILED|Clone error|0" >> "$RESULTS_DIR/summary.csv"
        return 1
    fi
    
    # Count files
    local file_count=$(find "$repo_dir" -name "*.java" -type f | wc -l)
    echo "📊 Java files: $file_count"
    
    # Setup branch
    cd "$repo_dir"
    
    # Detect and checkout correct branch
    if git rev-parse --verify "$branch" >/dev/null 2>&1; then
        git checkout -B main "origin/$branch" 2>&1 | tail -3
    else
        echo "⚠️  Branch $branch not found, using default"
        git checkout -B main 2>&1 | tail -3
    fi
    
    # Create symlink
    ln -sf "$repo_dir" /tmp/kafka-repo
    
    # Run analysis
    cd ~/codequal/packages/agents
    echo "🔧 Running analysis..."
    
    if npx ts-node src/two-branch/tests/__tests__/test-java-all-modes.ts > "$RESULTS_DIR/${name}-output.txt" 2>&1; then
        local end_time=$(date +%s)
        local duration=$((end_time - start_time))
        
        # Extract results
        local issues=$(grep -A 5 "Mode 1" "$RESULTS_DIR/${name}-output.txt" | grep "Issues:" | head -1 | awk '{print $2}')
        local tool_breakdown=$(grep "Tools:" "$RESULTS_DIR/${name}-output.txt" | head -1)
        
        echo "✅ Complete in ${duration}s"
        echo "📊 Issues found: $issues"
        echo "🔧 $tool_breakdown"
        
        # Save to CSV
        echo "$name|$framework|SUCCESS|${duration}s|$issues" >> "$RESULTS_DIR/summary.csv"
        
        return 0
    else
        local end_time=$(date +%s)
        local duration=$((end_time - start_time))
        
        echo "❌ Analysis failed after ${duration}s"
        echo "$name|$framework|FAILED|${duration}s|0" >> "$RESULTS_DIR/summary.csv"
        
        return 1
    fi
}

# Initialize CSV
echo "Repository|Framework|Status|Duration|Issues" > "$RESULTS_DIR/summary.csv"

# Test all repositories
for repo_name in "${!REPOS[@]}"; do
    if test_repo "$repo_name"; then
        ((SUCCESS_COUNT++))
    else
        ((FAILED_COUNT++))
    fi
done

# Final summary
echo ""
echo "========================================="
echo "📊 FINAL RESULTS"
echo "========================================="
echo "Total Tested: $((SUCCESS_COUNT + FAILED_COUNT))"
echo "✅ Success: $SUCCESS_COUNT"
echo "❌ Failed: $FAILED_COUNT"
echo "Success Rate: $(echo "scale=2; $SUCCESS_COUNT * 100 / (${SUCCESS_COUNT} + ${FAILED_COUNT})" | bc)%"
echo ""
echo "Results saved to: $RESULTS_DIR"
echo ""
echo "Summary:"
cat "$RESULTS_DIR/summary.csv" | column -t -s'|'
echo ""
date
echo "✅ Light Multi-Repository Testing Complete!"

