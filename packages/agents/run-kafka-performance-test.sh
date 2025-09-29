#!/bin/bash

# Apache Kafka Performance Testing Suite
# Tests both extended timeout and batching strategies

set -e

echo "🎯 Apache Kafka Performance Testing Suite"
echo "=========================================="
echo "Date: $(date)"
echo ""

# Configuration
REPO_PATH="/tmp/kafka-repo"
WORK_DIR="/Users/alpinro/Code\ Prjects/codequal/packages/agents"

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# Check if repository exists
check_repository() {
    if [ -d "$REPO_PATH" ]; then
        print_status "Kafka repository found at $REPO_PATH"

        # Count Java files
        JAVA_FILES=$(find "$REPO_PATH" -name "*.java" -type f | wc -l)
        MAIN_FILES=$(find "$REPO_PATH" -name "*.java" -type f | grep -v "/test/" | grep -v "Test.java" | wc -l)

        print_info "Total Java files: $JAVA_FILES"
        print_info "Main Java files (excluding tests): $MAIN_FILES"
    else
        print_warning "Kafka repository not found, will be cloned during tests"
    fi
}

# Menu for test selection
show_menu() {
    echo ""
    echo "Select Performance Test Strategy:"
    echo "=================================="
    echo "1) Extended Timeout Test (10 min timeout, baseline metrics)"
    echo "2) File Batching Test (500 files/batch, parallel processing)"
    echo "3) Quick PMD Test (core modules only, ~1300 files)"
    echo "4) Progressive Batching Test (priority-based analysis)"
    echo "5) Run All Tests (comprehensive performance analysis)"
    echo "6) Exit"
    echo ""
    read -p "Enter your choice [1-6]: " choice
}

# Run extended timeout test
run_extended_timeout() {
    print_info "Starting Extended Timeout Test..."
    print_warning "This may take 5-10 minutes to complete"

    cd "$WORK_DIR"
    npx ts-node src/two-branch/tests/test-kafka-extended-timeout.ts
}

# Run batching test
run_batching_test() {
    print_info "Starting File Batching Test..."
    print_info "Using 500 files per batch with 2 concurrent batches"

    cd "$WORK_DIR"
    npx ts-node src/two-branch/tests/test-kafka-batched-pmd.ts
}

# Run quick PMD test
run_quick_pmd() {
    print_info "Starting Quick PMD Test on Core Modules..."

    cd "$WORK_DIR"

    # Run PMD on core modules only
    docker run --rm --platform=linux/arm64 \
        -v "$REPO_PATH:/workspace" \
        -w /workspace \
        --cpus="4" --memory="6g" \
        iad.ocir.io/idzaw9ddo1h5/codequal-analyzers/analyzer:lang-java-v5.1-arm \
        sh -c "find core/ -name '*.java' | head -500 > /tmp/files.txt && \
               pmd pmd --file-list /tmp/files.txt -R category/java/errorprone.xml -f text -t 4 | head -100"
}

# Run progressive batching
run_progressive() {
    print_info "Starting Progressive Batching Test..."

    cat << 'EOF' > /tmp/progressive-test.ts
import { ProgressiveBatcher } from './src/two-branch/tests/test-kafka-batched-pmd';

async function main() {
    const batcher = new ProgressiveBatcher();
    const files = require('child_process')
        .execSync('find /tmp/kafka-repo -name "*.java" | grep -v test')
        .toString()
        .trim()
        .split('\n');

    await batcher.analyzeWithProgressiveBatching(files);
}

main().catch(console.error);
EOF

    cd "$WORK_DIR"
    npx ts-node /tmp/progressive-test.ts
}

# Run all tests
run_all_tests() {
    print_info "Running Comprehensive Performance Analysis"
    echo ""

    # Quick test first
    print_status "Step 1/3: Quick PMD Test"
    run_quick_pmd
    echo ""

    # Batching test
    print_status "Step 2/3: File Batching Test"
    run_batching_test
    echo ""

    # Extended timeout last (longest)
    print_status "Step 3/3: Extended Timeout Test"
    run_extended_timeout

    print_status "All tests completed!"

    # Generate summary
    generate_summary
}

# Generate performance summary
generate_summary() {
    echo ""
    echo "Performance Test Summary"
    echo "========================"

    # Find latest test results
    RESULTS_DIR="$WORK_DIR/src/two-branch/test-results"

    if [ -d "$RESULTS_DIR/performance-metrics" ]; then
        LATEST=$(ls -t "$RESULTS_DIR/performance-metrics" | head -1)
        if [ -n "$LATEST" ]; then
            print_info "Latest metrics: $RESULTS_DIR/performance-metrics/$LATEST"

            # Extract key metrics with jq if available
            if command -v jq &> /dev/null; then
                echo ""
                jq '.summary' "$RESULTS_DIR/performance-metrics/$LATEST" 2>/dev/null || true
            fi
        fi
    fi

    if [ -d "$RESULTS_DIR/batch-reports" ]; then
        LATEST=$(ls -t "$RESULTS_DIR/batch-reports" | head -1)
        if [ -n "$LATEST" ]; then
            print_info "Latest batch report: $RESULTS_DIR/batch-reports/$LATEST"
        fi
    fi
}

# Main execution
main() {
    clear
    echo "🚀 Apache Kafka Performance Testing Suite"
    echo "========================================="

    # Check environment
    check_repository

    while true; do
        show_menu

        case $choice in
            1)
                run_extended_timeout
                ;;
            2)
                run_batching_test
                ;;
            3)
                run_quick_pmd
                ;;
            4)
                run_progressive
                ;;
            5)
                run_all_tests
                ;;
            6)
                print_info "Exiting..."
                exit 0
                ;;
            *)
                print_error "Invalid option. Please select 1-6."
                ;;
        esac

        echo ""
        read -p "Press Enter to continue..."
    done
}

# Run main function
main