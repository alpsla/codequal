#!/bin/bash
# Multi-Repository Validation Script
# Purpose: Test Java analysis across multiple frameworks
# Execute on: Oracle Cloud (129.213.49.128)
# Expected Duration: 4-6 hours

set -e

echo "🚀 Multi-Repository Validation Starting..."
echo "=========================================="
echo ""

# Configuration
RESULTS_DIR="/tmp/multi-repo-results"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
LOG_FILE="$RESULTS_DIR/execution-log-$TIMESTAMP.txt"

# Create results directory
mkdir -p "$RESULTS_DIR"

# Redirect all output to log file
exec > >(tee -a "$LOG_FILE") 2>&1

echo "Results will be saved to: $RESULTS_DIR"
echo "Log file: $LOG_FILE"
echo ""

# Test repositories (organized by framework)
declare -a SPRING_REPOS=(
    "spring-petclinic|https://github.com/spring-projects/spring-petclinic"
    "spring-restdocs|https://github.com/spring-projects/spring-restdocs"
)

declare -a QUARKUS_REPOS=(
    "quarkus-quickstarts|https://github.com/quarkusio/quarkus-quickstarts"
    "quarkus-super-heroes|https://github.com/quarkusio/quarkus-super-heroes"
)

declare -a MICRONAUT_REPOS=(
    "micronaut-guides|https://github.com/micronaut-projects/micronaut-guides"
    "micronaut-examples|https://github.com/micronaut-projects/micronaut-examples"
)

declare -a PLAIN_JAVA_REPOS=(
    "commons-lang|https://github.com/apache/commons-lang"
    "commons-io|https://github.com/apache/commons-io"
)

# Function to test a single repository
test_repository() {
    local repo_info="$1"
    local framework="$2"
    
    IFS='|' read -r repo_name repo_url <<< "$repo_info"
    
    echo ""
    echo "========================================="
    echo "🧪 Testing: $repo_name"
    echo "📦 Framework: $framework"
    echo "🔗 URL: $repo_url"
    echo "========================================="
    
    # Clone repository
    local repo_dir="/tmp/$repo_name-repo"
    echo "📥 Cloning repository..."
    rm -rf "$repo_dir"
    
    if ! git clone --depth=10 --no-single-branch "$repo_url" "$repo_dir" 2>&1; then
        echo "❌ Failed to clone $repo_name"
        echo "Repository: $repo_name - FAILED (clone error)" >> "$RESULTS_DIR/summary.txt"
        return 1
    fi
    
    # Count files
    local file_count=$(find "$repo_dir" -name "*.java" -type f | wc -l)
    echo "📊 Java files found: $file_count"
    
    # Create symlink for test script
    ln -sf "$repo_dir" /tmp/kafka-repo
    
    # Run analysis
    echo "🔧 Running Java analysis..."
    local start_time=$(date +%s)
    
    cd ~/codequal/packages/agents
    
    if npx ts-node src/two-branch/tests/__tests__/test-java-all-modes.ts > "$RESULTS_DIR/${repo_name}-results.txt" 2>&1; then
        local end_time=$(date +%s)
        local duration=$((end_time - start_time))
        
        echo "✅ Analysis complete in ${duration}s"
        
        # Extract summary
        echo "Repository: $repo_name" >> "$RESULTS_DIR/summary.txt"
        echo "Framework: $framework" >> "$RESULTS_DIR/summary.txt"
        echo "Files: $file_count" >> "$RESULTS_DIR/summary.txt"
        echo "Duration: ${duration}s" >> "$RESULTS_DIR/summary.txt"
        grep -E "(Mode|issues found|Tool breakdown)" "$RESULTS_DIR/${repo_name}-results.txt" >> "$RESULTS_DIR/summary.txt" || true
        echo "Status: SUCCESS" >> "$RESULTS_DIR/summary.txt"
        echo "---" >> "$RESULTS_DIR/summary.txt"
        echo ""
        
        return 0
    else
        local end_time=$(date +%s)
        local duration=$((end_time - start_time))
        
        echo "❌ Analysis failed after ${duration}s"
        echo "Repository: $repo_name - FAILED (analysis error)" >> "$RESULTS_DIR/summary.txt"
        echo "Framework: $framework" >> "$RESULTS_DIR/summary.txt"
        echo "Duration: ${duration}s" >> "$RESULTS_DIR/summary.txt"
        echo "Status: FAILED" >> "$RESULTS_DIR/summary.txt"
        echo "---" >> "$RESULTS_DIR/summary.txt"
        echo ""
        
        return 1
    fi
}

# Test all repositories
echo "Starting test execution..."
echo ""

# Initialize counters
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# Test Spring Boot repositories
echo "🍃 Testing Spring Boot Repositories"
echo "=========================================="
for repo in "${SPRING_REPOS[@]}"; do
    ((TOTAL_TESTS++))
    if test_repository "$repo" "Spring Boot"; then
        ((PASSED_TESTS++))
    else
        ((FAILED_TESTS++))
    fi
done

# Test Quarkus repositories
echo "🔥 Testing Quarkus Repositories"
echo "=========================================="
for repo in "${QUARKUS_REPOS[@]}"; do
    ((TOTAL_TESTS++))
    if test_repository "$repo" "Quarkus"; then
        ((PASSED_TESTS++))
    else
        ((FAILED_TESTS++))
    fi
done

# Test Micronaut repositories
echo "🚀 Testing Micronaut Repositories"
echo "=========================================="
for repo in "${MICRONAUT_REPOS[@]}"; do
    ((TOTAL_TESTS++))
    if test_repository "$repo" "Micronaut"; then
        ((PASSED_TESTS++))
    else
        ((FAILED_TESTS++))
    fi
done

# Test Plain Java repositories
echo "☕ Testing Plain Java Repositories"
echo "=========================================="
for repo in "${PLAIN_JAVA_REPOS[@]}"; do
    ((TOTAL_TESTS++))
    if test_repository "$repo" "Plain Java"; then
        ((PASSED_TESTS++))
    else
        ((FAILED_TESTS++))
    fi
done

# Generate final report
echo ""
echo "========================================="
echo "📊 FINAL RESULTS"
echo "========================================="
echo "Total Tests: $TOTAL_TESTS"
echo "Passed: $PASSED_TESTS"
echo "Failed: $FAILED_TESTS"
echo "Success Rate: $(echo "scale=2; $PASSED_TESTS * 100 / $TOTAL_TESTS" | bc)%"
echo ""
echo "Results saved to: $RESULTS_DIR"
echo "Summary: $RESULTS_DIR/summary.txt"
echo "Log file: $LOG_FILE"
echo ""

# Display summary
echo "========================================="
echo "📋 TEST SUMMARY"
echo "========================================="
cat "$RESULTS_DIR/summary.txt"

echo ""
echo "✅ Multi-Repository Validation Complete!"

