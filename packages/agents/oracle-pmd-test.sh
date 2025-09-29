#!/bin/bash

# Complete Oracle PMD Test Package
# This script contains everything needed to run on Oracle

set -e

echo "🚀 Oracle A1.Flex PMD Performance Test"
echo "======================================="
echo "Date: $(date)"
echo "Host: $(hostname)"
echo "CPUs: $(nproc)"
echo "Memory: $(free -h | grep Mem | awk '{print $2}')"
echo ""

# Configuration
REPO_URL="https://github.com/apache/kafka.git"
REPO_PATH="/tmp/kafka-repo"
BATCH_SIZE=300
PARALLEL_BATCHES=4
PMD_THREADS=3

# Docker registry (Oracle OCIR)
REGISTRY="iad.ocir.io/idzaw9ddo1h5/codequal-analyzers"
ANALYZER_IMAGE="$REGISTRY/analyzer:lang-java-v5.1-arm"

# Step 1: Clone repository if needed
echo "📦 Preparing Apache Kafka repository..."
if [ ! -d "$REPO_PATH" ]; then
    echo "   Cloning repository (this may take a minute)..."
    git clone --depth 1 "$REPO_URL" "$REPO_PATH"
else
    echo "   Repository already exists"
fi

# Step 2: Count Java files
echo ""
echo "📊 Analyzing repository..."
ALL_FILES=$(find "$REPO_PATH" -name "*.java" -type f | grep -v "/test/" | grep -v "Test.java")
FILE_COUNT=$(echo "$ALL_FILES" | wc -l)
echo "   Total Java files (non-test): $FILE_COUNT"

# Step 3: Create file batches
echo ""
echo "📦 Creating batches..."
mkdir -p /tmp/pmd-batches
echo "$ALL_FILES" | split -l $BATCH_SIZE - /tmp/pmd-batches/batch-
BATCH_COUNT=$(ls -1 /tmp/pmd-batches/batch-* | wc -l)
echo "   Created $BATCH_COUNT batches of $BATCH_SIZE files each"
echo "   Parallel processing: $PARALLEL_BATCHES batches simultaneously"
echo "   Expected rounds: $((($BATCH_COUNT + $PARALLEL_BATCHES - 1) / $PARALLEL_BATCHES))"

# Step 4: Test Docker
echo ""
echo "🐳 Testing Docker connectivity..."
if docker version > /dev/null 2>&1; then
    echo "   ✅ Docker is running"
else
    echo "   ❌ Docker is not available"
    exit 1
fi

# Step 5: Pull analyzer image
echo ""
echo "📥 Pulling analyzer image..."
if docker pull "$ANALYZER_IMAGE" > /dev/null 2>&1; then
    echo "   ✅ Image available: $ANALYZER_IMAGE"
else
    echo "   ⚠️  Could not pull image, may use cached version"
fi

# Step 6: Run the actual test
echo ""
echo "⚡ Starting Balanced Configuration Test"
echo "======================================="
echo "Configuration:"
echo "  Parallel batches: $PARALLEL_BATCHES"
echo "  Files per batch: $BATCH_SIZE"
echo "  PMD threads: $PMD_THREADS"
echo "  CPUs per batch: 1"
echo ""

OVERALL_START=$(date +%s)

# Process function for a single batch
process_batch() {
    local batch_file=$1
    local batch_num=$2
    local output_file="/tmp/pmd-output-${batch_num}.txt"

    echo "[Batch $batch_num] Starting..."
    local start=$(date +%s)

    docker run --rm \
        --platform=linux/arm64 \
        -v "$REPO_PATH:/workspace:ro" \
        -v "$batch_file:/filelist.txt:ro" \
        -w /workspace \
        --cpus="1" \
        --memory="2g" \
        "$ANALYZER_IMAGE" \
        pmd pmd \
        --file-list /filelist.txt \
        -R category/java/errorprone.xml \
        -f text \
        -t $PMD_THREADS \
        --no-cache > "$output_file" 2>&1 || true

    local end=$(date +%s)
    local duration=$((end - start))

    local violations=$(grep -c "\.java:" "$output_file" 2>/dev/null || echo "0")
    echo "[Batch $batch_num] Completed in ${duration}s - Found $violations violations"

    return 0
}

# Run batches with controlled parallelism
echo "Processing $BATCH_COUNT batches..."
batch_num=0
for batch_file in /tmp/pmd-batches/batch-*; do
    batch_num=$((batch_num + 1))

    # Control parallelism
    while [ $(jobs -r | wc -l) -ge $PARALLEL_BATCHES ]; do
        sleep 0.5
    done

    # Launch batch in background
    process_batch "$batch_file" "$batch_num" &

    # Show progress every 4 batches
    if [ $((batch_num % 4)) -eq 0 ]; then
        echo "Progress: $batch_num/$BATCH_COUNT batches started..."
    fi
done

# Wait for all batches to complete
echo ""
echo "Waiting for all batches to complete..."
wait

OVERALL_END=$(date +%s)
TOTAL_TIME=$((OVERALL_END - OVERALL_START))

# Step 7: Collect results
echo ""
echo "📊 Collecting results..."
TOTAL_VIOLATIONS=0
for output_file in /tmp/pmd-output-*.txt; do
    if [ -f "$output_file" ]; then
        violations=$(grep -c "\.java:" "$output_file" 2>/dev/null || echo "0")
        TOTAL_VIOLATIONS=$((TOTAL_VIOLATIONS + violations))
    fi
done

# Step 8: Display final results
echo ""
echo "======================================="
echo "🎉 TEST COMPLETE"
echo "======================================="
echo ""
echo "📈 Performance Results:"
echo "  Files analyzed: $FILE_COUNT"
echo "  Total time: ${TOTAL_TIME} seconds"
echo "  Throughput: $((FILE_COUNT / TOTAL_TIME)) files/sec"
echo "  Total violations: $TOTAL_VIOLATIONS"
echo ""

# Performance assessment
if [ $TOTAL_TIME -lt 20 ]; then
    echo "🏆 EXCEPTIONAL: Sub-20 second analysis!"
    echo "   This is better than simulated!"
elif [ $TOTAL_TIME -lt 30 ]; then
    echo "🎉 EXCELLENT: Sub-30 second analysis achieved!"
    echo "   Perfect for CI/CD pipelines"
elif [ $TOTAL_TIME -lt 60 ]; then
    echo "✅ GOOD: Sub-minute analysis achieved"
    echo "   Acceptable for most use cases"
else
    echo "⚠️  NEEDS OPTIMIZATION: Over 1 minute"
    echo "   Consider scaling to 8 CPUs"
fi

echo ""
echo "📊 Comparison with Simulation:"
echo "  Simulated: 17.4 seconds"
echo "  Actual: ${TOTAL_TIME} seconds"
echo "  Difference: $((TOTAL_TIME - 17)) seconds"

# Cleanup
echo ""
echo "🧹 Cleaning up..."
rm -rf /tmp/pmd-batches
rm -f /tmp/pmd-output-*.txt

echo ""
echo "✅ Test completed successfully!"
echo ""
echo "Results saved to: /tmp/oracle-pmd-test-results.txt"

# Save results
cat > /tmp/oracle-pmd-test-results.txt << EOF
Oracle A1.Flex PMD Test Results
================================
Date: $(date)
Repository: Apache Kafka
Files: $FILE_COUNT
Configuration: Balanced (4 parallel, 300 files/batch)
Total Time: $TOTAL_TIME seconds
Throughput: $((FILE_COUNT / TOTAL_TIME)) files/sec
Violations: $TOTAL_VIOLATIONS
EOF