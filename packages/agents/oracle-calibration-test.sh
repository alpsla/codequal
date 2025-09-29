#!/bin/bash

# Oracle A1.Flex Calibration Test Script
# Targeted testing of 5, 10, 12 parallel configurations
# Building on baseline: 4 parallel = 68s, 6 parallel = 78s

set -e

echo "🚀 Oracle A1.Flex Performance Calibration"
echo "==========================================="
echo "Date: $(date)"
echo "Goal: Find optimal configuration for Apache Kafka (3,472 files)"
echo "Baseline: 4 parallel = 68s, 6 parallel = 78s"
echo ""

# Configuration
REPO_PATH="/tmp/kafka-repo"
ANALYZER_IMAGE="registry.digitalocean.com/codequal-registry/analyzer:lang-java-v5.1-arm"

# Parse command line argument
PARALLEL=${1:-5}
BATCH_SIZE=${2:-200}
THREADS=${3:-2}

echo "Configuration:"
echo "  Parallel containers: $PARALLEL"
echo "  Files per batch: $BATCH_SIZE"
echo "  PMD threads per container: $THREADS"
echo ""

# Ensure repo exists
if [ ! -d "$REPO_PATH" ]; then
    echo "📦 Cloning Apache Kafka..."
    git clone --depth 1 https://github.com/apache/kafka.git "$REPO_PATH"
fi

# Get all Java files (excluding tests)
echo "📂 Finding Java files..."
cd "$REPO_PATH"
find . -name "*.java" -type f | grep -v test | sed 's|^\./||' > /tmp/all-java.txt
TOTAL_FILES=$(wc -l < /tmp/all-java.txt)
echo "Total files: $TOTAL_FILES"
echo ""

# Create batches
echo "📦 Creating batches..."
rm -rf /tmp/test-batches
mkdir -p /tmp/test-batches
split -l $BATCH_SIZE /tmp/all-java.txt /tmp/test-batches/batch-

BATCH_COUNT=$(ls -1 /tmp/test-batches/batch-* | wc -l)
ROUNDS=$(( ($BATCH_COUNT + $PARALLEL - 1) / $PARALLEL ))
echo "  Batches: $BATCH_COUNT"
echo "  Parallel: $PARALLEL"
echo "  Rounds: $ROUNDS"
echo ""

# Calculate resource limits per container
CPU_PER_CONTAINER=$(echo "scale=2; 4 / $PARALLEL" | bc)
MEM_PER_CONTAINER=$(echo "scale=1; 20 / $PARALLEL" | bc)

echo "Resource allocation:"
echo "  CPU per container: ${CPU_PER_CONTAINER} cores"
echo "  Memory per container: ${MEM_PER_CONTAINER}GB"
echo ""

# Start timer
START=$(date +%s)
echo "⏱️  Starting analysis at $(date '+%Y-%m-%d %H:%M:%S')"
echo ""

# Process batches
BATCH_NUM=0
CURRENT_ROUND=1
ROUND_START=$(date +%s)

for batch_file in /tmp/test-batches/batch-*; do
    BATCH_NUM=$((BATCH_NUM + 1))

    # Track rounds for progress display
    if [ $((($BATCH_NUM - 1) % $PARALLEL)) -eq 0 ] && [ $BATCH_NUM -gt 1 ]; then
        ROUND_END=$(date +%s)
        ROUND_DURATION=$((ROUND_END - ROUND_START))
        echo "  Round $CURRENT_ROUND completed: ${ROUND_DURATION}s"
        CURRENT_ROUND=$((CURRENT_ROUND + 1))
        ROUND_START=$(date +%s)
    fi

    # Control parallelism
    while [ $(jobs -r | wc -l) -ge $PARALLEL ]; do
        sleep 0.1
    done

    # Run batch in background
    {
        docker run --rm --entrypoint sh \
            -v "$REPO_PATH:/workspace" \
            -v "$batch_file:/filelist.txt" \
            -w /workspace \
            --cpus="$CPU_PER_CONTAINER" \
            --memory="${MEM_PER_CONTAINER}g" \
            "$ANALYZER_IMAGE" \
            -c "pmd pmd --file-list /filelist.txt -R category/java/errorprone.xml -f text -t $THREADS --no-cache" \
            > /tmp/batch-${BATCH_NUM}.out 2>&1
    } &
done

# Wait for all batches to complete
echo "  Waiting for final round..."
wait

END=$(date +%s)
DURATION=$((END - START))

echo ""
echo "==========================================="
echo "📊 RESULTS"
echo "==========================================="
echo ""
echo "Configuration:"
echo "  Parallel: $PARALLEL containers"
echo "  Batch size: $BATCH_SIZE files"
echo "  PMD threads: $THREADS per container"
echo ""
echo "Performance:"
echo "  Total time: ${DURATION} seconds"
echo "  Throughput: $((TOTAL_FILES / DURATION)) files/sec"
echo "  Files analyzed: $TOTAL_FILES"
echo ""

# Count violations
TOTAL_VIOLATIONS=$(cat /tmp/batch-*.out 2>/dev/null | grep -c "\.java:" 2>/dev/null || echo "0")
echo "  Violations found: $TOTAL_VIOLATIONS"
echo ""

# Compare to baseline
echo "Comparison to baseline:"
BASELINE_4=68
BASELINE_6=78
IMPROVEMENT_4=$(echo "scale=1; (($BASELINE_4 - $DURATION) / $BASELINE_4) * 100" | bc)
IMPROVEMENT_6=$(echo "scale=1; (($BASELINE_6 - $DURATION) / $BASELINE_6) * 100" | bc)

echo "  vs 4 parallel (68s): ${IMPROVEMENT_4}% $([ ${IMPROVEMENT_4%.*} -gt 0 ] && echo '✅ faster' || echo '❌ slower')"
echo "  vs 6 parallel (78s): ${IMPROVEMENT_6}% $([ ${IMPROVEMENT_6%.*} -gt 0 ] && echo '✅ faster' || echo '❌ slower')"
echo ""

# Performance rating
if [ $DURATION -lt 45 ]; then
    echo "🏆 EXCELLENT! Sub-45 second target achieved!"
elif [ $DURATION -lt 60 ]; then
    echo "✅ GOOD! Sub-60 second performance"
elif [ $DURATION -lt 75 ]; then
    echo "👍 ACCEPTABLE! Within 75 seconds"
else
    echo "⚠️  SLOWER than expected. Consider adjusting parameters."
fi

echo ""
echo "Next steps:"
if [ $DURATION -lt 45 ]; then
    echo "  ✓ Configuration is production-ready!"
    echo "  → Test two-branch caching for PR analysis"
elif [ $PARALLEL -lt 12 ]; then
    echo "  → Try higher parallelism: ./oracle-calibration-test.sh $((PARALLEL + 2))"
else
    echo "  → Consider hardware upgrade or different strategy"
fi

# Save results
RESULTS_FILE="/tmp/calibration-results-${PARALLEL}p-${BATCH_SIZE}b-${THREADS}t.txt"
cat > "$RESULTS_FILE" << EOF
Oracle A1.Flex Calibration Test Results
========================================
Date: $(date)
Repository: Apache Kafka
Files: $TOTAL_FILES

Configuration:
  Parallel containers: $PARALLEL
  Batch size: $BATCH_SIZE files
  PMD threads: $THREADS

Performance:
  Total time: ${DURATION}s
  Throughput: $((TOTAL_FILES / DURATION)) files/sec
  Violations: $TOTAL_VIOLATIONS

Comparison:
  vs 4 parallel (68s): ${IMPROVEMENT_4}%
  vs 6 parallel (78s): ${IMPROVEMENT_6}%
EOF

echo ""
echo "Results saved to: $RESULTS_FILE"

# Clean up
rm -rf /tmp/test-batches /tmp/batch-*.out

echo ""
echo "✅ Calibration test complete!"