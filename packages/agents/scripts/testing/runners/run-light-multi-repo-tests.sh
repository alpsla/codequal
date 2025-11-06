#!/bin/bash
# Light Multi-Repository Testing Script
# Purpose: Quick validation across 3-5 Java repositories to identify unique issue groups
# Execute on: Oracle Cloud (129.213.49.128)
# Expected Duration: 30-60 minutes

set -e

echo "🧪 Light Multi-Repository Testing Starting..."
echo "=========================================="
echo "Purpose: Quick validation to catalog unique issue groups"
echo "Mode: Light testing (discovery phase)"
echo ""

# Configuration
RESULTS_DIR="/tmp/light-multi-repo-results"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
LOG_FILE="$RESULTS_DIR/execution-log-$TIMESTAMP.txt"

# Create results directory
mkdir -p "$RESULTS_DIR"

# Redirect all output to log file
exec > >(tee -a "$LOG_FILE") 2>&1

echo "Results will be saved to: $RESULTS_DIR"
echo "Log file: $LOG_FILE"
echo ""

# Light test repositories (3-5 diverse samples)
declare -a REPOS=(
    "spring-petclinic|https://github.com/spring-projects/spring-petclinic|Spring Boot"
    "quarkus-quickstarts|https://github.com/quarkusio/quarkus-quickstarts|Quarkus"
    "micronaut-guides|https://github.com/micronaut-projects/micronaut-guides|Micronaut"
    "commons-lang|https://github.com/apache/commons-lang|Plain Java"
    "kafka|https://github.com/apache/kafka|Enterprise"
)

# Function to run light test on a repository
run_light_test() {
    local repo_info="$1"
    
    IFS='|' read -r repo_name repo_url framework <<< "$repo_info"
    
    echo ""
    echo "========================================="
    echo "🧪 Light Testing: $repo_name"
    echo "📦 Framework: $framework"
    echo "🔗 URL: $repo_url"
    echo "========================================="
    
    # Clone repository
    local repo_dir="/tmp/$repo_name-repo"
    echo "📥 Cloning repository..."
    rm -rf "$repo_dir"
    
    if ! git clone --depth=10 --no-single-branch "$repo_url" "$repo_dir" 2>&1; then
        echo "❌ Failed to clone $repo_name"
        return 1
    fi
    
    # Count files
    local file_count=$(find "$repo_dir" -name "*.java" -type f | wc -l)
    echo "📊 Java files found: $file_count"
    
    # Prepare repo for testing
    cd "$repo_dir"
    
    # Detect default branch
    local default_branch="main"
    if git symbolic-ref refs/remotes/origin/HEAD >/dev/null 2>&1; then
        default_branch=$(git symbolic-ref refs/remotes/origin/HEAD | sed 's@^refs/remotes/origin/@@')
    else
        for branch in trunk main master; do
            if git rev-parse --verify "$branch" >/dev/null 2>&1; then
                default_branch="$branch"
                break
            fi
        done
    fi
    
    echo "🔍 Detected default branch: $default_branch"
    git checkout -B main "origin/$default_branch" 2>&1
    
    # Create symlink for test script
    ln -sf "$repo_dir" /tmp/kafka-repo
    
    # Run light test (Mode 1 only - critical with fallback)
    echo "🔧 Running light analysis (Mode 1: Critical with fallback)..."
    local start_time=$(date +%s)
    
    cd ~/codequal/packages/agents
    
    # Run test and capture output
    if npx ts-node src/two-branch/tests/__tests__/test-java-all-modes.ts 2>&1 | tee "$RESULTS_DIR/${repo_name}-light-results.txt"; then
        local end_time=$(date +%s)
        local duration=$((end_time - start_time))
        
        echo "✅ Light analysis complete in ${duration}s"
        
        # Extract key metrics
        echo "" >> "$RESULTS_DIR/light-summary.txt"
        echo "=========================================" >> "$RESULTS_DIR/light-summary.txt"
        echo "Repository: $repo_name" >> "$RESULTS_DIR/light-summary.txt"
        echo "Framework: $framework" >> "$RESULTS_DIR/light-summary.txt"
        echo "Files: $file_count" >> "$RESULTS_DIR/light-summary.txt"
        echo "Duration: ${duration}s" >> "$RESULTS_DIR/light-summary.txt"
        
        # Extract issue counts
        grep -A 10 "Mode 1:" "$RESULTS_DIR/${repo_name}-light-results.txt" | grep "issues found" >> "$RESULTS_DIR/light-summary.txt" || echo "No issues found" >> "$RESULTS_DIR/light-summary.txt"
        grep "Tool breakdown:" "$RESULTS_DIR/${repo_name}-light-results.txt" >> "$RESULTS_DIR/light-summary.txt" || echo "No tool breakdown" >> "$RESULTS_DIR/light-summary.txt"
        
        echo "Status: SUCCESS" >> "$RESULTS_DIR/light-summary.txt"
        echo "=========================================" >> "$RESULTS_DIR/light-summary.txt"
        echo "" >> "$RESULTS_DIR/light-summary.txt"
        
        return 0
    else
        local end_time=$(date +%s)
        local duration=$((end_time - start_time))
        
        echo "❌ Light analysis failed after ${duration}s"
        
        echo "" >> "$RESULTS_DIR/light-summary.txt"
        echo "Repository: $repo_name - FAILED" >> "$RESULTS_DIR/light-summary.txt"
        echo "Framework: $framework" >> "$RESULTS_DIR/light-summary.txt"
        echo "Duration: ${duration}s" >> "$RESULTS_DIR/light-summary.txt"
        echo "Status: FAILED" >> "$RESULTS_DIR/light-summary.txt"
        echo "=========================================" >> "$RESULTS_DIR/light-summary.txt"
        echo "" >> "$RESULTS_DIR/light-summary.txt"
        
        return 1
    fi
}

# Initialize summary file
echo "🧪 LIGHT MULTI-REPOSITORY TEST RESULTS" > "$RESULTS_DIR/light-summary.txt"
echo "Date: $(date)" >> "$RESULTS_DIR/light-summary.txt"
echo "Purpose: Catalog unique issue groups across Java frameworks" >> "$RESULTS_DIR/light-summary.txt"
echo "" >> "$RESULTS_DIR/light-summary.txt"

# Run light tests
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

for repo in "${REPOS[@]}"; do
    ((TOTAL_TESTS++))
    if run_light_test "$repo"; then
        ((PASSED_TESTS++))
    else
        ((FAILED_TESTS++))
    fi
done

# Generate final report
echo ""
echo "========================================="
echo "📊 LIGHT TESTING RESULTS"
echo "========================================="
echo "Total Tests: $TOTAL_TESTS"
echo "Passed: $PASSED_TESTS"
echo "Failed: $FAILED_TESTS"
echo "Success Rate: $(echo "scale=2; $PASSED_TESTS * 100 / $TOTAL_TESTS" | bc)%"
echo ""
echo "Results saved to: $RESULTS_DIR"
echo "Summary: $RESULTS_DIR/light-summary.txt"
echo ""

# Display summary
echo "========================================="
echo "📋 LIGHT TEST SUMMARY"
echo "========================================="
cat "$RESULTS_DIR/light-summary.txt"

echo ""
echo "✅ Light Multi-Repository Testing Complete!"
echo ""
echo "🎯 NEXT STEPS:"
echo "1. Review light-summary.txt for unique issue patterns"
echo "2. Run full E2E test on 1 repository (Apache Kafka)"
echo "3. Polish final report format"
echo "4. Then proceed with full multi-repository validation"

