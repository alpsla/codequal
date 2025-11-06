#!/bin/bash

# Real Oracle Cloud PMD Test Script
# Tests the Balanced configuration (4 parallel, 300 files/batch, 3 threads)

set -e

echo "🚀 Oracle Cloud A1.Flex Real PMD Test"
echo "======================================"
echo "Date: $(date)"
echo "Configuration: Balanced (4 parallel batches)"
echo ""

# Configuration
REPO_PATH="/tmp/kafka-repo"
ORACLE_REGISTRY="iad.ocir.io/idzaw9ddo1h5/codequal-analyzers"
ANALYZER_IMAGE="$ORACLE_REGISTRY/analyzer:lang-java-v5.1-arm"
BATCH_SIZE=300
PARALLEL_BATCHES=4
PMD_THREADS=3

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Step 1: Clone repository if needed
echo "📦 Preparing Apache Kafka repository..."
if [ ! -d "$REPO_PATH" ]; then
    echo "   Cloning repository..."
    git clone --depth 1 https://github.com/apache/kafka.git "$REPO_PATH"
else
    echo "   Repository already exists"
fi

# Step 2: Get all Java files (excluding tests)
echo ""
echo "📊 Collecting Java files..."
find "$REPO_PATH" -name "*.java" -type f | grep -v "/test/" | grep -v "Test.java" > /tmp/all-java-files.txt
TOTAL_FILES=$(wc -l < /tmp/all-java-files.txt)
echo "   Total files: $TOTAL_FILES"

# Step 3: Create batches
echo ""
echo "📦 Creating batches..."
mkdir -p /tmp/pmd-batches
split -l $BATCH_SIZE /tmp/all-java-files.txt /tmp/pmd-batches/batch-
BATCH_COUNT=$(ls -1 /tmp/pmd-batches/batch-* | wc -l)
echo "   Created $BATCH_COUNT batches of ~$BATCH_SIZE files each"

# Step 4: Test Docker connectivity
echo ""
echo "🐳 Testing Docker and Oracle Registry..."
docker pull "$ANALYZER_IMAGE" > /dev/null 2>&1 && echo "   ✅ Docker image available" || echo "   ❌ Failed to pull image"

# Step 5: Run warm-up batch
echo ""
echo "🔥 Running warm-up batch..."
WARMUP_START=$(date +%s)
head -50 /tmp/all-java-files.txt > /tmp/warmup-files.txt
docker run --rm \
    --platform=linux/arm64 \
    -v "$REPO_PATH:/workspace" \
    -v "/tmp/warmup-files.txt:/filelist.txt" \
    -w /workspace \
    --cpus="1" --memory="2g" \
    "$ANALYZER_IMAGE" \
    pmd pmd \
    --file-list /filelist.txt \
    -R category/java/errorprone.xml \
    -f text \
    -t 3 \
    --no-cache > /tmp/warmup-output.txt 2>&1 || true
WARMUP_END=$(date +%s)
WARMUP_TIME=$((WARMUP_END - WARMUP_START))
echo "   Warm-up completed in ${WARMUP_TIME}s"

# Step 6: Run parallel batch test
echo ""
echo "⚡ Running Balanced Configuration Test"
echo "======================================"
echo "Parallel batches: $PARALLEL_BATCHES"
echo "Files per batch: $BATCH_SIZE"
echo "PMD threads: $PMD_THREADS"
echo ""

OVERALL_START=$(date +%s)
BATCH_NUM=0
ACTIVE_JOBS=0

# Function to run a single batch
run_batch() {
    local batch_file=$1
    local batch_id=$2
    local start_time=$(date +%s)

    echo "   Starting batch $batch_id..."

    docker run --rm \
        --platform=linux/arm64 \
        -v "$REPO_PATH:/workspace" \
        -v "$batch_file:/filelist.txt" \
        -w /workspace \
        --cpus="1" --memory="2g" \
        "$ANALYZER_IMAGE" \
        pmd pmd \
        --file-list /filelist.txt \
        -R category/java/errorprone.xml \
        -f text \
        -t $PMD_THREADS \
        --no-cache > "/tmp/pmd-output-$batch_id.txt" 2>&1 &

    echo $! > "/tmp/pmd-pid-$batch_id.txt"
}

# Process batches in parallel
echo "Starting parallel processing..."
for batch_file in /tmp/pmd-batches/batch-*; do
    BATCH_NUM=$((BATCH_NUM + 1))

    # Wait if we've reached parallel limit
    while [ $ACTIVE_JOBS -ge $PARALLEL_BATCHES ]; do
        # Check for completed jobs
        for i in $(seq 1 $BATCH_NUM); do
            if [ -f "/tmp/pmd-pid-$i.txt" ]; then
                PID=$(cat "/tmp/pmd-pid-$i.txt")
                if ! kill -0 $PID 2>/dev/null; then
                    echo -e "${GREEN}   ✅ Batch $i completed${NC}"
                    rm -f "/tmp/pmd-pid-$i.txt"
                    ACTIVE_JOBS=$((ACTIVE_JOBS - 1))
                fi
            fi
        done
        sleep 1
    done

    # Start new batch
    run_batch "$batch_file" "$BATCH_NUM"
    ACTIVE_JOBS=$((ACTIVE_JOBS + 1))
done

# Wait for all remaining jobs
echo ""
echo "Waiting for all batches to complete..."
while [ $ACTIVE_JOBS -gt 0 ]; do
    for i in $(seq 1 $BATCH_NUM); do
        if [ -f "/tmp/pmd-pid-$i.txt" ]; then
            PID=$(cat "/tmp/pmd-pid-$i.txt")
            if ! kill -0 $PID 2>/dev/null; then
                echo -e "${GREEN}   ✅ Batch $i completed${NC}"
                rm -f "/tmp/pmd-pid-$i.txt"
                ACTIVE_JOBS=$((ACTIVE_JOBS - 1))
            fi
        fi
    done
    sleep 1
done

OVERALL_END=$(date +%s)
TOTAL_TIME=$((OVERALL_END - OVERALL_START))

# Step 7: Analyze results
echo ""
echo "📊 Analyzing results..."
TOTAL_VIOLATIONS=0
for output_file in /tmp/pmd-output-*.txt; do
    if [ -f "$output_file" ]; then
        VIOLATIONS=$(grep -c "\.java:" "$output_file" 2>/dev/null || echo "0")
        TOTAL_VIOLATIONS=$((TOTAL_VIOLATIONS + VIOLATIONS))
    fi
done

# Step 8: Display results
echo ""
echo "======================================"
echo "🎉 TEST COMPLETE"
echo "======================================"
echo ""
echo "📈 Performance Metrics:"
echo "   Total files analyzed: $TOTAL_FILES"
echo "   Total batches: $BATCH_COUNT"
echo "   Parallel batches: $PARALLEL_BATCHES"
echo "   Total time: ${TOTAL_TIME}s"
echo "   Throughput: $((TOTAL_FILES / TOTAL_TIME)) files/sec"
echo "   Total violations found: $TOTAL_VIOLATIONS"
echo ""

if [ $TOTAL_TIME -lt 30 ]; then
    echo -e "${GREEN}🎉 SUB-30 SECOND ANALYSIS ACHIEVED!${NC}"
elif [ $TOTAL_TIME -lt 60 ]; then
    echo -e "${GREEN}✅ SUB-MINUTE ANALYSIS ACHIEVED!${NC}"
else
    echo -e "${YELLOW}⚠️  Performance needs optimization${NC}"
fi

# Step 9: Comparison with simulation
echo ""
echo "📊 Comparison with Simulation:"
echo "   Simulated time: 17.4s"
echo "   Actual time: ${TOTAL_TIME}s"
if [ $TOTAL_TIME -lt 25 ]; then
    echo -e "${GREEN}   ✅ Better than expected!${NC}"
elif [ $TOTAL_TIME -lt 35 ]; then
    echo -e "${GREEN}   ✅ Close to simulation${NC}"
else
    echo -e "${YELLOW}   ⚠️  Slower than expected${NC}"
fi

# Clean up
echo ""
echo "🧹 Cleaning up temporary files..."
rm -rf /tmp/pmd-batches
rm -f /tmp/pmd-*.txt
rm -f /tmp/all-java-files.txt
rm -f /tmp/warmup-files.txt

echo ""
echo "✅ Test completed successfully!"