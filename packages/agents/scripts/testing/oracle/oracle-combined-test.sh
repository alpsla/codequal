#!/bin/bash

# Oracle A1.Flex Combined Test Script
# Tests different configurations AND two-branch caching strategy

set -e

echo "🚀 Oracle A1.Flex Combined Performance Test"
echo "==========================================="
echo "Date: $(date)"
echo "Part 1: Configuration Optimization"
echo "Part 2: Two-Branch Caching Test"
echo ""

# Configuration
REPO_PATH="/tmp/kafka-repo"
REGISTRY="iad.ocir.io/idzaw9ddo1h5/codequal-analyzers"
ANALYZER_IMAGE="$REGISTRY/analyzer:lang-java-v5.1-arm"
REDIS_HOST="localhost"

# Test configurations (based on previous results)
CONFIGS=(
    "6:200:2"   # Expected best based on theory
    "8:150:2"   # High parallel
    "5:250:3"   # Balanced
    "4:300:3"   # Current (baseline: 68s)
)

# Ensure repo exists
if [ ! -d "$REPO_PATH" ]; then
    echo "📦 Cloning Apache Kafka..."
    git clone --depth 1 https://github.com/apache/kafka.git "$REPO_PATH"
fi

echo "==========================================="
echo "PART 1: CONFIGURATION OPTIMIZATION"
echo "==========================================="
echo ""

# Get all files
find "$REPO_PATH" -name "*.java" -type f | grep -v test > /tmp/all-java.txt
TOTAL_FILES=$(wc -l < /tmp/all-java.txt)
echo "Total files: $TOTAL_FILES"
echo ""

BEST_TIME=9999
BEST_CONFIG=""

# Function to test configuration
test_config() {
    local config=$1
    IFS=':' read -r parallel batch_size threads <<< "$config"

    echo "Testing: ${parallel} parallel, ${batch_size} files/batch, ${threads} threads"

    # Create batches
    rm -rf /tmp/test-batches
    mkdir -p /tmp/test-batches
    split -l $batch_size /tmp/all-java.txt /tmp/test-batches/batch-

    local batch_count=$(ls -1 /tmp/test-batches/batch-* | wc -l)
    echo "  Batches: $batch_count, Rounds: $((($batch_count + $parallel - 1) / $parallel))"

    local start=$(date +%s)

    # Process batches
    local batch_num=0
    for batch_file in /tmp/test-batches/batch-*; do
        batch_num=$((batch_num + 1))

        # Control parallelism
        while [ $(jobs -r | wc -l) -ge $parallel ]; do
            sleep 0.1
        done

        # Run batch
        {
            docker run --rm --entrypoint sh \
                -v "$REPO_PATH:/workspace" \
                -v "$batch_file:/filelist.txt" \
                -w /workspace \
                --cpus="$(echo "scale=2; 4 / $parallel" | bc)" \
                --memory="$(echo "scale=0; 20 / $parallel" | bc)g" \
                "$ANALYZER_IMAGE" \
                -c "pmd pmd --file-list /filelist.txt -R category/java/errorprone.xml -f text -t $threads --no-cache" \
                > /tmp/batch-${batch_num}.out 2>&1
        } &
    done

    wait

    local end=$(date +%s)
    local duration=$((end - start))

    echo "  ✅ Time: ${duration}s, Throughput: $((TOTAL_FILES / duration)) files/sec"
    echo ""

    # Clean up
    rm -rf /tmp/test-batches /tmp/batch-*.out

    return $duration
}

# Test all configurations
for config in "${CONFIGS[@]}"; do
    test_config "$config"
    duration=$?

    if [ $duration -lt $BEST_TIME ]; then
        BEST_TIME=$duration
        BEST_CONFIG=$config
    fi
done

echo "🏆 BEST CONFIGURATION: $BEST_CONFIG"
echo "   Time: ${BEST_TIME} seconds"

if [ $BEST_TIME -lt 45 ]; then
    echo "   ✅ Achieved sub-45 second goal!"
fi

echo ""
echo "==========================================="
echo "PART 2: TWO-BRANCH CACHING TEST"
echo "==========================================="
echo ""

# Use best configuration for two-branch test
IFS=':' read -r BEST_PARALLEL BEST_BATCH BEST_THREADS <<< "$BEST_CONFIG"

# Function to analyze branch
analyze_branch() {
    local branch=$1
    local cache_key="kafka:${branch}"

    echo "🔍 Analyzing branch: $branch"

    # Check Redis cache
    if redis-cli -h $REDIS_HOST EXISTS "$cache_key" | grep -q "1"; then
        echo "  ✅ Cache hit! Using cached results"
        local cached_time=$(redis-cli -h $REDIS_HOST GET "${cache_key}:time")
        echo "  Cached analysis time: ${cached_time}s"
        return 0
    fi

    echo "  Cache miss, running analysis..."

    # Checkout branch
    cd "$REPO_PATH"
    git checkout "$branch" > /dev/null 2>&1

    # Get files
    find . -name "*.java" -type f | grep -v test > /tmp/branch-files.txt
    local branch_files=$(wc -l < /tmp/branch-files.txt)
    echo "  Files: $branch_files"

    # Run analysis with best config
    local start=$(date +%s)

    # Create and process batches (simplified for demo)
    rm -rf /tmp/branch-batches
    mkdir -p /tmp/branch-batches
    split -l $BEST_BATCH /tmp/branch-files.txt /tmp/branch-batches/batch-

    for batch in /tmp/branch-batches/batch-*; do
        while [ $(jobs -r | wc -l) -ge $BEST_PARALLEL ]; do
            sleep 0.1
        done

        {
            docker run --rm --entrypoint sh \
                -v "$REPO_PATH:/workspace" \
                -v "$batch:/filelist.txt" \
                -w /workspace \
                --cpus="1" --memory="2g" \
                "$ANALYZER_IMAGE" \
                -c "pmd pmd --file-list /filelist.txt -R category/java/errorprone.xml -f text -t $BEST_THREADS --no-cache" \
                > /tmp/branch-out-$$.txt 2>&1
        } &
    done

    wait

    local end=$(date +%s)
    local duration=$((end - start))

    # Count violations
    local violations=$(cat /tmp/branch-out-*.txt | grep -c "\.java:" 2>/dev/null || echo "0")

    echo "  ✅ Analysis complete: ${duration}s, ${violations} violations"

    # Cache results
    redis-cli -h $REDIS_HOST SET "$cache_key" "$violations" EX 86400 > /dev/null
    redis-cli -h $REDIS_HOST SET "${cache_key}:time" "$duration" EX 86400 > /dev/null

    # Clean up
    rm -f /tmp/branch-out-*.txt
    rm -rf /tmp/branch-batches

    return $duration
}

# Test main branch
echo "1️⃣ Main Branch Analysis"
MAIN_START=$(date +%s)
analyze_branch "trunk"  # Kafka uses 'trunk' instead of 'main'
MAIN_TIME=$?
MAIN_END=$(date +%s)
MAIN_DURATION=$((MAIN_END - MAIN_START))

echo ""

# Simulate PR branch (using same branch for demo)
echo "2️⃣ PR Branch Analysis (simulated)"
PR_START=$(date +%s)
analyze_branch "trunk"  # Would be PR branch in real scenario
PR_TIME=$?
PR_END=$(date +%s)
PR_DURATION=$((PR_END - PR_START))

echo ""
echo "==========================================="
echo "📊 FINAL RESULTS"
echo "==========================================="
echo ""
echo "Configuration Optimization:"
echo "  Best config: $BEST_CONFIG"
echo "  Best time: ${BEST_TIME}s"
echo ""
echo "Two-Branch Analysis:"
echo "  Main branch: ${MAIN_DURATION}s (first run)"
echo "  PR branch: ${PR_DURATION}s (${PR_DURATION -eq 0 && echo 'cached' || echo 'computed'})"
echo ""

if [ $PR_DURATION -eq 0 ]; then
    echo "🎉 Cache strategy working! PR analysis instant with cache!"
else
    echo "Total time: $((MAIN_DURATION + PR_DURATION))s"
fi

echo ""
echo "Expected Production Performance:"
echo "  First PR (no cache): ${BEST_TIME}s"
echo "  Subsequent PRs: ~0s (from cache)"
echo "  PR with changes: ~10-15s (diff analysis)"
echo ""

# Save results
cat > /tmp/oracle-optimization-results.txt << EOF
Oracle A1.Flex Optimization Results
====================================
Date: $(date)
Repository: Apache Kafka
Files: $TOTAL_FILES

Best Configuration: $BEST_CONFIG
Best Time: ${BEST_TIME}s

Two-Branch Strategy:
Main Branch: ${MAIN_DURATION}s
PR Branch: ${PR_DURATION}s
Cache Benefit: $([ $PR_DURATION -eq 0 ] && echo "100%" || echo "N/A")
EOF

echo "Results saved to: /tmp/oracle-optimization-results.txt"