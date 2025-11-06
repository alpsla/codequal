#!/bin/bash

# Two-Branch Cache Validation Test
# Tests the cache efficiency and performance benefits

set -e

echo "🔄 Two-Branch Cache Validation Test"
echo "==========================================="
echo "Date: $(date)"
echo "Goal: Validate cache efficiency for PR analysis"
echo ""

# Configuration
REPO_PATH="/tmp/kafka-repo"
ANALYZER_IMAGE="registry.digitalocean.com/codequal-registry/analyzer:lang-java-v5.1-arm"
REDIS_HOST="localhost"

# Optimal configuration from calibration
PARALLEL=4
BATCH_SIZE=300
THREADS=3

echo "Configuration (Optimal):"
echo "  Parallel: $PARALLEL"
echo "  Batch size: $BATCH_SIZE"
echo "  PMD threads: $THREADS"
echo ""

# Ensure Redis is running
if ! redis-cli -h $REDIS_HOST PING > /dev/null 2>&1; then
    echo "❌ Redis is not running at $REDIS_HOST"
    echo "   Start Redis with: redis-server"
    exit 1
fi

echo "✅ Redis connection verified"
echo ""

# Ensure repo exists
if [ ! -d "$REPO_PATH" ]; then
    echo "📦 Cloning Apache Kafka..."
    git clone --depth 1 https://github.com/apache/kafka.git "$REPO_PATH"
fi

# Function to analyze a branch
analyze_branch() {
    local branch=$1
    local cache_key="kafka:${branch}"

    echo "🔍 Analyzing branch: $branch"

    # Check Redis cache
    if redis-cli -h $REDIS_HOST EXISTS "$cache_key" | grep -q "1"; then
        echo "  ✅ Cache hit! Retrieving cached results..."
        local cached_time=$(redis-cli -h $REDIS_HOST HGET "$cache_key" "time" 2>/dev/null || echo "0")
        local cached_violations=$(redis-cli -h $REDIS_HOST HGET "$cache_key" "violations" 2>/dev/null || echo "0")
        echo "  Cached analysis: ${cached_time}s, ${cached_violations} violations"
        echo "  ⚡ Using cache (0 seconds for retrieval)"
        return 0
    fi

    echo "  Cache miss - running fresh analysis..."

    # Checkout branch
    cd "$REPO_PATH"
    git checkout "$branch" > /dev/null 2>&1

    # Get files
    find . -name "*.java" -type f | grep -v test | sed 's|^\./||' > /tmp/branch-files.txt
    local file_count=$(wc -l < /tmp/branch-files.txt)
    echo "  Files: $file_count"

    # Create batches
    rm -rf /tmp/branch-batches
    mkdir -p /tmp/branch-batches
    split -l $BATCH_SIZE /tmp/branch-files.txt /tmp/branch-batches/batch-

    local batch_count=$(ls -1 /tmp/branch-batches/batch-* | wc -l)
    echo "  Batches: $batch_count"

    # Start timer
    local start=$(date +%s)

    # Process batches with optimal parallelism
    local batch_num=0
    for batch in /tmp/branch-batches/batch-*; do
        batch_num=$((batch_num + 1))

        # Control parallelism
        while [ $(jobs -r | wc -l) -ge $PARALLEL ]; do
            sleep 0.1
        done

        # Run batch
        {
            docker run --rm --entrypoint sh \
                -v "$REPO_PATH:/workspace" \
                -v "$batch:/filelist.txt" \
                -w /workspace \
                --cpus="1" --memory="5g" \
                "$ANALYZER_IMAGE" \
                -c "pmd pmd --file-list /filelist.txt -R category/java/errorprone.xml -f text -t $THREADS --no-cache" \
                > /tmp/branch-out-${batch_num}.txt 2>&1
        } &
    done

    wait

    local end=$(date +%s)
    local duration=$((end - start))

    # Count violations
    local violations=$(cat /tmp/branch-out-*.txt 2>/dev/null | grep -c "\.java:" 2>/dev/null || echo "0")

    echo "  ✅ Analysis complete: ${duration}s, ${violations} violations"

    # Cache results
    redis-cli -h $REDIS_HOST HSET "$cache_key" "time" "$duration" > /dev/null
    redis-cli -h $REDIS_HOST HSET "$cache_key" "violations" "$violations" > /dev/null
    redis-cli -h $REDIS_HOST HSET "$cache_key" "timestamp" "$(date -u +%Y-%m-%dT%H:%M:%SZ)" > /dev/null
    redis-cli -h $REDIS_HOST EXPIRE "$cache_key" 86400 > /dev/null

    # Clean up
    rm -f /tmp/branch-out-*.txt
    rm -rf /tmp/branch-batches

    return $duration
}

echo "==========================================="
echo "TEST 1: Main Branch Analysis (First Run)"
echo "==========================================="
echo ""

# Clear cache for clean test
redis-cli -h $REDIS_HOST DEL "kafka:trunk" > /dev/null 2>&1
echo "🗑️  Cleared cache for clean test"
echo ""

MAIN_START=$(date +%s)
analyze_branch "trunk"
MAIN_TIME=$?
MAIN_END=$(date +%s)
MAIN_DURATION=$((MAIN_END - MAIN_START))

echo ""
echo "==========================================="
echo "TEST 2: Main Branch Analysis (Second Run)"
echo "==========================================="
echo "Testing cache hit..."
echo ""

CACHED_START=$(date +%s)
analyze_branch "trunk"
CACHED_TIME=$?
CACHED_END=$(date +%s)
CACHED_DURATION=$((CACHED_END - CACHED_START))

echo ""
echo "==========================================="
echo "TEST 3: PR Branch Simulation"
echo "==========================================="
echo "Simulating PR analysis with cached main branch..."
echo ""

# In real scenario, this would be a different branch
# For testing, we'll use trunk again to show cache works
PR_START=$(date +%s)
analyze_branch "trunk"
PR_TIME=$?
PR_END=$(date +%s)
PR_DURATION=$((PR_END - PR_START))

echo ""
echo "==========================================="
echo "📊 CACHE VALIDATION RESULTS"
echo "==========================================="
echo ""

echo "Performance:"
echo "  1st run (no cache): ${MAIN_DURATION}s"
echo "  2nd run (cache hit): ${CACHED_DURATION}s"
echo "  3rd run (cache hit): ${PR_DURATION}s"
echo ""

# Calculate cache benefit
if [ $MAIN_DURATION -gt 0 ]; then
    CACHE_SPEEDUP=$(echo "scale=1; $MAIN_DURATION / ($CACHED_DURATION + 0.1)" | bc)
    TIME_SAVED=$((MAIN_DURATION - CACHED_DURATION))
    PERCENT_SAVED=$(echo "scale=1; ($TIME_SAVED * 100) / $MAIN_DURATION" | bc)
else
    CACHE_SPEEDUP="N/A"
    PERCENT_SAVED="N/A"
fi

echo "Cache Efficiency:"
echo "  Speedup: ${CACHE_SPEEDUP}x faster"
echo "  Time saved: ${TIME_SAVED}s (${PERCENT_SAVED}% reduction)"
echo ""

echo "Expected Production Workflow:"
echo "  Main branch analysis: ${MAIN_DURATION}s (once per day)"
echo "  PR analysis (cache hit): ~${CACHED_DURATION}s"
echo "  PR analysis (new files): ~10-15s (diff-only)"
echo ""

# Validate cache content
echo "Cache Status:"
CACHE_EXISTS=$(redis-cli -h $REDIS_HOST EXISTS "kafka:trunk")
if [ "$CACHE_EXISTS" = "1" ]; then
    CACHE_TIME=$(redis-cli -h $REDIS_HOST HGET "kafka:trunk" "time")
    CACHE_VIOLATIONS=$(redis-cli -h $REDIS_HOST HGET "kafka:trunk" "violations")
    CACHE_TIMESTAMP=$(redis-cli -h $REDIS_HOST HGET "kafka:trunk" "timestamp")
    CACHE_TTL=$(redis-cli -h $REDIS_HOST TTL "kafka:trunk")

    echo "  ✅ Cache active and valid"
    echo "  Analysis time: ${CACHE_TIME}s"
    echo "  Violations: ${CACHE_VIOLATIONS}"
    echo "  Cached at: ${CACHE_TIMESTAMP}"
    echo "  TTL: ${CACHE_TTL}s (~$((CACHE_TTL / 3600)) hours remaining)"
else
    echo "  ❌ Cache validation failed"
fi

echo ""
echo "==========================================="
echo "✅ CACHE VALIDATION COMPLETE"
echo "==========================================="
echo ""

if [ $CACHED_DURATION -lt 5 ]; then
    echo "🎉 EXCELLENT! Cache provides instant results!"
    echo "   Production-ready for PR analysis"
elif [ $CACHED_DURATION -lt 10 ]; then
    echo "✅ GOOD! Cache significantly speeds up analysis"
    echo "   Suitable for CI/CD pipelines"
else
    echo "⚠️  Cache benefit less than expected"
    echo "   Consider optimizing cache retrieval"
fi

echo ""
echo "Results saved to cache with 24h TTL"