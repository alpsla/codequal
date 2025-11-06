#!/bin/bash

# Local Docker PMD Test
# Tests with actual Docker but smaller file set

set -e

echo "🐳 Local Docker PMD Test"
echo "========================"
echo "Testing Docker setup before Oracle deployment"
echo ""

# Configuration
REPO_PATH="/tmp/kafka-repo"
TEST_SIZE=100  # Test with 100 files first

# Check Docker
echo "🔍 Checking Docker..."
if docker version > /dev/null 2>&1; then
    echo "   ✅ Docker is running"
else
    echo "   ❌ Docker is not running"
    exit 1
fi

# Check repository
echo ""
echo "📦 Checking repository..."
if [ ! -d "$REPO_PATH" ]; then
    echo "   ❌ Repository not found at $REPO_PATH"
    echo "   Please run: git clone --depth 1 https://github.com/apache/kafka.git $REPO_PATH"
    exit 1
fi
echo "   ✅ Repository found"

# Get test files
echo ""
echo "📊 Selecting test files..."
find "$REPO_PATH" -name "*.java" -type f | grep -v "/test/" | head -$TEST_SIZE > /tmp/test-files.txt
FILE_COUNT=$(wc -l < /tmp/test-files.txt)
echo "   Selected $FILE_COUNT files for testing"

# Test 1: Try with official PMD Docker image (if available)
echo ""
echo "🧪 Test 1: Testing with openjdk + downloaded PMD..."
echo "   Creating custom Docker container..."

# Create a Dockerfile for PMD
cat > /tmp/Dockerfile.pmd << 'EOF'
FROM openjdk:11-slim
RUN apt-get update && apt-get install -y wget unzip
RUN wget -q https://github.com/pmd/pmd/releases/download/pmd_releases%2F6.55.0/pmd-bin-6.55.0.zip -O /tmp/pmd.zip
RUN unzip -q /tmp/pmd.zip -d /opt/ && rm /tmp/pmd.zip
RUN ln -s /opt/pmd-bin-6.55.0/bin/run.sh /usr/local/bin/pmd
WORKDIR /workspace
EOF

echo "   Building PMD Docker image..."
docker build -t local-pmd:test -f /tmp/Dockerfile.pmd /tmp > /dev/null 2>&1

echo "   Running PMD test..."
START_TIME=$(date +%s)

docker run --rm \
    -v "$REPO_PATH:/workspace" \
    -v "/tmp/test-files.txt:/filelist.txt" \
    --cpus="2" --memory="2g" \
    local-pmd:test \
    pmd pmd \
    --file-list /filelist.txt \
    -R category/java/errorprone.xml \
    -f text \
    -t 2 \
    --no-cache > /tmp/pmd-test-output.txt 2>&1 || true

END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))

# Check results
if [ -f "/tmp/pmd-test-output.txt" ]; then
    VIOLATIONS=$(grep -c "\.java:" /tmp/pmd-test-output.txt 2>/dev/null || echo "0")
    echo "   ✅ PMD completed in ${DURATION}s"
    echo "   Found $VIOLATIONS violations"
    echo "   Throughput: $((FILE_COUNT / DURATION)) files/sec"
else
    echo "   ❌ PMD failed to run"
fi

# Test 2: Parallel batch simulation
echo ""
echo "🧪 Test 2: Testing parallel batch processing..."
echo "   Creating 4 mini-batches..."

# Split files into 4 batches
mkdir -p /tmp/mini-batches
split -l 25 /tmp/test-files.txt /tmp/mini-batches/batch-

echo "   Running 4 batches in parallel..."
PARALLEL_START=$(date +%s)

for batch in /tmp/mini-batches/batch-*; do
    {
        docker run --rm \
            -v "$REPO_PATH:/workspace" \
            -v "$batch:/filelist.txt" \
            --cpus="0.5" --memory="1g" \
            local-pmd:test \
            pmd pmd \
            --file-list /filelist.txt \
            -R category/java/errorprone.xml \
            -f text \
            -t 1 \
            --no-cache > "${batch}.out" 2>&1
    } &
done

# Wait for all to complete
wait

PARALLEL_END=$(date +%s)
PARALLEL_DURATION=$((PARALLEL_END - PARALLEL_START))

echo "   ✅ Parallel processing completed in ${PARALLEL_DURATION}s"
echo "   Speedup: $((DURATION / PARALLEL_DURATION))x"

# Summary
echo ""
echo "📊 Test Summary:"
echo "================================"
echo "Sequential (100 files): ${DURATION}s"
echo "Parallel (4×25 files): ${PARALLEL_DURATION}s"
echo "Speedup: $((DURATION / PARALLEL_DURATION))x"
echo ""

# Extrapolate to full repository
ESTIMATED_FULL=$((3488 * PARALLEL_DURATION / FILE_COUNT))
echo "📈 Estimated for full repository (3,488 files):"
echo "   Estimated time: ${ESTIMATED_FULL}s"

if [ $ESTIMATED_FULL -lt 30 ]; then
    echo "   🎉 Should achieve sub-30 second analysis!"
elif [ $ESTIMATED_FULL -lt 60 ]; then
    echo "   ✅ Should achieve sub-minute analysis"
else
    echo "   ⚠️  May need optimization"
fi

# Cleanup
echo ""
echo "🧹 Cleaning up..."
rm -rf /tmp/mini-batches
rm -f /tmp/test-files.txt
rm -f /tmp/pmd-test-output.txt
rm -f /tmp/Dockerfile.pmd
docker rmi local-pmd:test > /dev/null 2>&1 || true

echo ""
echo "✅ Local test completed!"
echo ""
echo "Next step: Deploy test-oracle-real-pmd.sh to Oracle instance"