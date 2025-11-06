#!/bin/bash

# Oracle A1.Flex Optimization Test
# Tests multiple configurations to find the optimal setup

set -e

echo "🚀 Oracle A1.Flex PMD Optimization Test Suite"
echo "=============================================="
echo "Date: $(date)"
echo "Host: Oracle Cloud (4 OCPUs, 24GB RAM)"
echo ""

# Test configurations
CONFIGS=(
    "4:300:3"   # Current: 4 parallel, 300 files/batch, 3 threads
    "6:200:2"   # More parallel, smaller batches
    "8:150:2"   # High parallel, small batches
    "3:400:4"   # Less parallel, bigger batches, more threads
    "5:250:3"   # Balanced middle ground
    "10:100:1"  # Maximum parallel, minimal batches
    "2:500:6"   # Minimum parallel, maximum threads
)

REPO_PATH="/tmp/kafka-repo"
REGISTRY="iad.ocir.io/idzaw9ddo1h5/codequal-analyzers"
ANALYZER_IMAGE="$REGISTRY/analyzer:lang-java-v5.1-arm"

# Ensure repository exists
if [ ! -d "$REPO_PATH" ]; then
    echo "📦 Cloning Apache Kafka..."
    git clone --depth 1 https://github.com/apache/kafka.git "$REPO_PATH"
fi

# Get all Java files
echo "📊 Preparing file list..."
find "$REPO_PATH" -name "*.java" -type f | grep -v test > /tmp/all-java-files.txt
TOTAL_FILES=$(wc -l < /tmp/all-java-files.txt)
echo "Total files: $TOTAL_FILES"
echo ""

# Results array
RESULTS_FILE="/tmp/optimization-results.txt"
echo "Configuration Test Results" > $RESULTS_FILE
echo "==========================" >> $RESULTS_FILE
echo "" >> $RESULTS_FILE

# Function to test a configuration
test_config() {
    local config=$1
    IFS=':' read -r parallel batch_size threads <<< "$config"

    echo "Testing Configuration: ${parallel} parallel, ${batch_size} files/batch, ${threads} threads"
    echo "--------------------------------------------------------------------------------"

    # Create batches
    rm -rf /tmp/test-batches
    mkdir -p /tmp/test-batches
    split -l $batch_size /tmp/all-java-files.txt /tmp/test-batches/batch-

    local batch_count=$(ls -1 /tmp/test-batches/batch-* | wc -l)
    echo "  Batches: $batch_count"
    echo "  Parallel rounds: $((($batch_count + $parallel - 1) / $parallel))"

    # Run test
    local start_time=$(date +%s)

    # Process batches
    local batch_num=0
    for batch_file in /tmp/test-batches/batch-*; do
        batch_num=$((batch_num + 1))

        # Control parallelism
        while [ $(jobs -r | wc -l) -ge $parallel ]; do
            sleep 0.2
        done

        # Run batch in background
        {
            docker run --rm --entrypoint sh \
                -v "$REPO_PATH:/workspace" \
                -v "$batch_file:/filelist.txt" \
                -w /workspace \
                --cpus="$(echo "scale=2; 4 / $parallel" | bc)" \
                --memory="$(echo "scale=0; 20 / $parallel" | bc)g" \
                "$ANALYZER_IMAGE" \
                -c "pmd pmd --file-list /filelist.txt -R category/java/errorprone.xml -f text -t $threads --no-cache" \
                > /tmp/batch-output-${batch_num}.txt 2>&1
        } &
    done

    # Wait for all to complete
    wait

    local end_time=$(date +%s)
    local duration=$((end_time - start_time))

    # Count total violations
    local total_violations=0
    for output in /tmp/batch-output-*.txt; do
        if [ -f "$output" ]; then
            violations=$(grep -c "\.java:" "$output" 2>/dev/null || echo "0")
            total_violations=$((total_violations + violations))
        fi
    done

    # Calculate metrics
    local throughput=$((TOTAL_FILES / duration))
    local cpu_efficiency=$(echo "scale=1; ($parallel * 100) / 4" | bc)

    # Display results
    echo "  ✅ Completed in ${duration} seconds"
    echo "  Throughput: ${throughput} files/sec"
    echo "  Violations: ${total_violations}"
    echo "  CPU usage: ${cpu_efficiency}%"

    # Save to results file
    echo "${parallel}:${batch_size}:${threads} - ${duration}s - ${throughput} files/sec" >> $RESULTS_FILE

    # Clean up
    rm -f /tmp/batch-output-*.txt
    rm -rf /tmp/test-batches

    echo ""

    return $duration
}

# Test all configurations
echo "🧪 Testing ${#CONFIGS[@]} Different Configurations"
echo "=================================================="
echo ""

BEST_TIME=9999
BEST_CONFIG=""

for config in "${CONFIGS[@]}"; do
    test_config "$config"
    duration=$?

    if [ $duration -lt $BEST_TIME ]; then
        BEST_TIME=$duration
        BEST_CONFIG=$config
    fi

    # Brief pause between tests
    sleep 2
done

# Display summary
echo "=================================================="
echo "📊 TEST SUMMARY"
echo "=================================================="
echo ""
cat $RESULTS_FILE
echo ""
echo "🏆 BEST CONFIGURATION: $BEST_CONFIG"
echo "   Time: ${BEST_TIME} seconds"
echo ""

IFS=':' read -r best_parallel best_batch best_threads <<< "$BEST_CONFIG"
echo "Recommended settings:"
echo "  Parallel batches: $best_parallel"
echo "  Files per batch: $best_batch"
echo "  PMD threads: $best_threads"
echo ""

if [ $BEST_TIME -lt 30 ]; then
    echo "🎉 Sub-30 second analysis achieved!"
elif [ $BEST_TIME -lt 45 ]; then
    echo "✅ Sub-45 second analysis achieved!"
elif [ $BEST_TIME -lt 60 ]; then
    echo "✅ Sub-minute analysis achieved!"
else
    echo "⚠️  Further optimization needed"
fi

echo ""
echo "Results saved to: $RESULTS_FILE"