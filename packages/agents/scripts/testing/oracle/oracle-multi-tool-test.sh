#!/bin/bash

# Oracle Multi-Tool Analysis Test
# Executes all Java analysis tools with staged, optimized execution
# Tools: PMD, Checkstyle, SpotBugs, Semgrep

set -e

echo "🔧 Oracle Multi-Tool Java Analysis"
echo "==========================================="
echo "Date: $(date)"
echo "Strategy: Staged execution for optimal performance"
echo ""

# Configuration
REPO_PATH="/tmp/kafka-repo"
ANALYZER_IMAGE="registry.digitalocean.com/codequal-registry/analyzer:lang-java-v5.1-arm"
RESULTS_DIR="/tmp/multi-tool-results"
REDIS_HOST="localhost"

# Parse command line arguments
TOOLS="${1:-all}"  # all, pmd, checkstyle, spotbugs, semgrep
REPO_NAME="${2:-kafka}"

echo "Configuration:"
echo "  Tools to run: $TOOLS"
echo "  Repository: $REPO_NAME"
echo "  Results directory: $RESULTS_DIR"
echo ""

# Ensure repo exists
if [ ! -d "$REPO_PATH" ]; then
    echo "📦 Cloning Apache Kafka..."
    git clone --depth 1 https://github.com/apache/kafka.git "$REPO_PATH"
fi

# Setup results directory
rm -rf "$RESULTS_DIR"
mkdir -p "$RESULTS_DIR"/{semgrep,checkstyle,pmd,spotbugs}

# Get all Java files (excluding tests)
echo "📂 Finding Java files..."
cd "$REPO_PATH"
find . -name "*.java" -type f | grep -v test | sed 's|^\./||' > /tmp/all-java.txt
TOTAL_FILES=$(wc -l < /tmp/all-java.txt)
echo "Total files: $TOTAL_FILES"
echo ""

# Calculate stage timings
STAGE1_TIME=20  # Semgrep
STAGE2_TIME=45  # Checkstyle
STAGE3_TIME=63  # PMD
STAGE4_TIME=90  # SpotBugs
TOTAL_ESTIMATED=$((STAGE1_TIME + STAGE2_TIME + STAGE3_TIME))
echo "Estimated total time: ~${TOTAL_ESTIMATED}s (2.8 minutes)"
echo ""

# Track overall start time
OVERALL_START=$(date +%s)

# ============================================
# STAGE 1: Semgrep (Fast Security Analysis)
# ============================================
run_semgrep() {
    echo "==========================================="
    echo "STAGE 1: Semgrep Security Analysis"
    echo "==========================================="
    echo "Configuration: 4 parallel, 2 jobs each"
    echo "Expected time: ~20 seconds"
    echo ""

    local start=$(date +%s)

    # Create 4 batches
    local batch_size=$(($TOTAL_FILES / 4))
    split -l $batch_size /tmp/all-java.txt /tmp/semgrep-batch-

    local batch_num=0
    for batch in /tmp/semgrep-batch-*; do
        batch_num=$((batch_num + 1))

        # Control parallelism (max 4)
        while [ $(jobs -r | wc -l) -ge 4 ]; do
            sleep 0.1
        done

        {
            docker run --rm --entrypoint sh \
                -v "$REPO_PATH:/workspace" \
                -v "$batch:/filelist.txt" \
                -w /workspace \
                --cpus="1" --memory="2g" \
                "$ANALYZER_IMAGE" \
                -c "cat /filelist.txt | xargs semgrep --config=p/security-audit --config=p/java --jobs=2 --json --timeout=30 --max-memory=2000" \
                > "$RESULTS_DIR/semgrep/batch-${batch_num}.json" 2>&1
        } &
    done

    wait

    local end=$(date +%s)
    local duration=$((end - start))

    # Count findings
    local findings=$(cat "$RESULTS_DIR/semgrep"/*.json 2>/dev/null | grep -c "\"check_id\"" 2>/dev/null || echo "0")

    echo "✅ Semgrep complete: ${duration}s, ${findings} findings"
    echo ""

    # Clean up batches
    rm -f /tmp/semgrep-batch-*

    return $duration
}

# ============================================
# STAGE 2: Checkstyle (Style Analysis)
# ============================================
run_checkstyle() {
    echo "==========================================="
    echo "STAGE 2: Checkstyle Code Style Analysis"
    echo "==========================================="
    echo "Configuration: 4 parallel"
    echo "Expected time: ~45 seconds"
    echo ""

    local start=$(date +%s)

    # Create 4 batches
    local batch_size=$(($TOTAL_FILES / 4))
    split -l $batch_size /tmp/all-java.txt /tmp/checkstyle-batch-

    local batch_num=0
    for batch in /tmp/checkstyle-batch-*; do
        batch_num=$((batch_num + 1))

        # Control parallelism (max 4)
        while [ $(jobs -r | wc -l) -ge 4 ]; do
            sleep 0.1
        done

        {
            # Convert file list to space-separated for checkstyle
            local files=$(cat "$batch" | tr '\n' ' ')

            docker run --rm --entrypoint sh \
                -v "$REPO_PATH:/workspace" \
                -w /workspace \
                --cpus="1" --memory="3g" \
                "$ANALYZER_IMAGE" \
                -c "java -jar /opt/checkstyle.jar -c /google_checks.xml -f xml $files" \
                > "$RESULTS_DIR/checkstyle/batch-${batch_num}.xml" 2>&1
        } &
    done

    wait

    local end=$(date +%s)
    local duration=$((end - start))

    # Count violations
    local violations=$(cat "$RESULTS_DIR/checkstyle"/*.xml 2>/dev/null | grep -c "<error " 2>/dev/null || echo "0")

    echo "✅ Checkstyle complete: ${duration}s, ${violations} violations"
    echo ""

    # Clean up batches
    rm -f /tmp/checkstyle-batch-*

    return $duration
}

# ============================================
# STAGE 3: PMD (Quality Analysis)
# ============================================
run_pmd() {
    echo "==========================================="
    echo "STAGE 3: PMD Code Quality Analysis"
    echo "==========================================="
    echo "Configuration: 4 parallel, 300 files/batch, 3 threads"
    echo "Expected time: ~63 seconds"
    echo ""

    local start=$(date +%s)

    # Use optimal configuration from calibration
    local batch_size=300

    # Create batches
    rm -rf /tmp/pmd-batches
    mkdir -p /tmp/pmd-batches
    split -l $batch_size /tmp/all-java.txt /tmp/pmd-batches/batch-

    local batch_count=$(ls -1 /tmp/pmd-batches/batch-* | wc -l)
    echo "  Processing $batch_count batches..."

    local batch_num=0
    for batch in /tmp/pmd-batches/batch-*; do
        batch_num=$((batch_num + 1))

        # Control parallelism (max 4)
        while [ $(jobs -r | wc -l) -ge 4 ]; do
            sleep 0.1
        done

        {
            docker run --rm --entrypoint sh \
                -v "$REPO_PATH:/workspace" \
                -v "$batch:/filelist.txt" \
                -w /workspace \
                --cpus="1" --memory="5g" \
                "$ANALYZER_IMAGE" \
                -c "pmd pmd --file-list /filelist.txt -R category/java/errorprone.xml -R category/java/bestpractices.xml -f xml -t 3 --no-cache" \
                > "$RESULTS_DIR/pmd/batch-${batch_num}.xml" 2>&1
        } &
    done

    wait

    local end=$(date +%s)
    local duration=$((end - start))

    # Count violations
    local violations=$(cat "$RESULTS_DIR/pmd"/*.xml 2>/dev/null | grep -c "<violation " 2>/dev/null || echo "0")

    echo "✅ PMD complete: ${duration}s, ${violations} violations"
    echo ""

    # Clean up batches
    rm -rf /tmp/pmd-batches

    return $duration
}

# ============================================
# STAGE 4: SpotBugs (Bug Detection)
# ============================================
run_spotbugs() {
    echo "==========================================="
    echo "STAGE 4: SpotBugs Bug Pattern Analysis"
    echo "==========================================="
    echo "Configuration: Requires compiled bytecode"
    echo ""

    # Check if we have compiled classes
    if [ ! -d "$REPO_PATH/build" ] && [ ! -d "$REPO_PATH/target" ]; then
        echo "⚠️  SpotBugs skipped: No compiled bytecode found"
        echo "   SpotBugs requires .class files from compilation"
        echo "   To run: ./gradlew build or mvn compile first"
        echo ""
        return 0
    fi

    echo "Note: SpotBugs requires significant memory and time"
    echo "Expected time: ~90 seconds"
    echo ""

    local start=$(date +%s)

    # Find compiled classes
    local classes_dir=""
    if [ -d "$REPO_PATH/build/classes" ]; then
        classes_dir="$REPO_PATH/build/classes"
    elif [ -d "$REPO_PATH/target/classes" ]; then
        classes_dir="$REPO_PATH/target/classes"
    fi

    if [ -n "$classes_dir" ]; then
        docker run --rm --entrypoint sh \
            -v "$REPO_PATH:/workspace" \
            -w /workspace \
            --cpus="2" --memory="8g" \
            "$ANALYZER_IMAGE" \
            -c "/opt/spotbugs-4.7.3/bin/spotbugs -textui -effort:max -xml:withMessages -output /workspace/spotbugs-results.xml $classes_dir" \
            > "$RESULTS_DIR/spotbugs/output.xml" 2>&1 &

        local spotbugs_pid=$!

        # Wait for completion
        wait $spotbugs_pid

        local end=$(date +%s)
        local duration=$((end - start))

        # Count bugs
        local bugs=$(grep -c "<BugInstance " "$RESULTS_DIR/spotbugs/output.xml" 2>/dev/null || echo "0")

        echo "✅ SpotBugs complete: ${duration}s, ${bugs} bugs found"
    else
        echo "⚠️  Could not locate compiled classes"
    fi

    echo ""
    return 0
}

# ============================================
# Execute requested tools
# ============================================

SEMGREP_TIME=0
CHECKSTYLE_TIME=0
PMD_TIME=0
SPOTBUGS_TIME=0

if [ "$TOOLS" = "all" ] || [[ "$TOOLS" == *"semgrep"* ]]; then
    run_semgrep
    SEMGREP_TIME=$?
fi

if [ "$TOOLS" = "all" ] || [[ "$TOOLS" == *"checkstyle"* ]]; then
    run_checkstyle
    CHECKSTYLE_TIME=$?
fi

if [ "$TOOLS" = "all" ] || [[ "$TOOLS" == *"pmd"* ]]; then
    run_pmd
    PMD_TIME=$?
fi

if [ "$TOOLS" = "all" ] || [[ "$TOOLS" == *"spotbugs"* ]]; then
    run_spotbugs
    SPOTBUGS_TIME=$?
fi

# ============================================
# Aggregate Results
# ============================================

OVERALL_END=$(date +%s)
OVERALL_DURATION=$((OVERALL_END - OVERALL_START))

echo "==========================================="
echo "📊 MULTI-TOOL ANALYSIS COMPLETE"
echo "==========================================="
echo ""

echo "Performance Summary:"
if [ $SEMGREP_TIME -gt 0 ]; then
    echo "  Semgrep:    ${SEMGREP_TIME}s"
fi
if [ $CHECKSTYLE_TIME -gt 0 ]; then
    echo "  Checkstyle: ${CHECKSTYLE_TIME}s"
fi
if [ $PMD_TIME -gt 0 ]; then
    echo "  PMD:        ${PMD_TIME}s"
fi
if [ $SPOTBUGS_TIME -gt 0 ]; then
    echo "  SpotBugs:   ${SPOTBUGS_TIME}s"
fi
echo "  ──────────────────"
echo "  Total:      ${OVERALL_DURATION}s"
echo ""

# Count total findings
TOTAL_FINDINGS=0

SEMGREP_FINDINGS=$(find "$RESULTS_DIR/semgrep" -name "*.json" -exec cat {} \; 2>/dev/null | grep -c "\"check_id\"" 2>/dev/null || echo "0")
CHECKSTYLE_VIOLATIONS=$(find "$RESULTS_DIR/checkstyle" -name "*.xml" -exec cat {} \; 2>/dev/null | grep -c "<error " 2>/dev/null || echo "0")
PMD_VIOLATIONS=$(find "$RESULTS_DIR/pmd" -name "*.xml" -exec cat {} \; 2>/dev/null | grep -c "<violation " 2>/dev/null || echo "0")
SPOTBUGS_BUGS=$(find "$RESULTS_DIR/spotbugs" -name "*.xml" -exec cat {} \; 2>/dev/null | grep -c "<BugInstance " 2>/dev/null || echo "0")

TOTAL_FINDINGS=$((SEMGREP_FINDINGS + CHECKSTYLE_VIOLATIONS + PMD_VIOLATIONS + SPOTBUGS_BUGS))

echo "Findings Summary:"
if [ $SEMGREP_TIME -gt 0 ]; then
    echo "  Semgrep:    $SEMGREP_FINDINGS security issues"
fi
if [ $CHECKSTYLE_TIME -gt 0 ]; then
    echo "  Checkstyle: $CHECKSTYLE_VIOLATIONS style violations"
fi
if [ $PMD_TIME -gt 0 ]; then
    echo "  PMD:        $PMD_VIOLATIONS quality issues"
fi
if [ $SPOTBUGS_TIME -gt 0 ]; then
    echo "  SpotBugs:   $SPOTBUGS_BUGS potential bugs"
fi
echo "  ──────────────────"
echo "  Total:      $TOTAL_FINDINGS findings"
echo ""

# Performance rating
THROUGHPUT=$((TOTAL_FILES / OVERALL_DURATION))
echo "Performance Metrics:"
echo "  Files analyzed: $TOTAL_FILES"
echo "  Total time: ${OVERALL_DURATION}s"
echo "  Throughput: ${THROUGHPUT} files/second"
echo ""

# Compare to estimates
if [ "$TOOLS" = "all" ]; then
    PERFORMANCE_RATIO=$(echo "scale=2; $TOTAL_ESTIMATED / $OVERALL_DURATION" | bc)
    if (( $(echo "$PERFORMANCE_RATIO > 0.9" | bc -l) )) && (( $(echo "$PERFORMANCE_RATIO < 1.1" | bc -l) )); then
        echo "✅ Performance matches estimates (${TOTAL_ESTIMATED}s expected)"
    elif (( $(echo "$PERFORMANCE_RATIO > 1.1" | bc -l) )); then
        echo "🎉 Performance better than expected! (${TOTAL_ESTIMATED}s expected)"
    else
        echo "⚠️  Performance slower than expected (${TOTAL_ESTIMATED}s expected)"
    fi
fi

echo ""
echo "Results saved to: $RESULTS_DIR"
echo ""

# Save summary to file
cat > "$RESULTS_DIR/summary.txt" << EOF
Multi-Tool Java Analysis Summary
=================================
Date: $(date)
Repository: $REPO_NAME
Files analyzed: $TOTAL_FILES

Performance:
  Semgrep:    ${SEMGREP_TIME}s
  Checkstyle: ${CHECKSTYLE_TIME}s
  PMD:        ${PMD_TIME}s
  SpotBugs:   ${SPOTBUGS_TIME}s
  Total:      ${OVERALL_DURATION}s
  Throughput: ${THROUGHPUT} files/second

Findings:
  Semgrep:    $SEMGREP_FINDINGS security issues
  Checkstyle: $CHECKSTYLE_VIOLATIONS style violations
  PMD:        $PMD_VIOLATIONS quality issues
  SpotBugs:   $SPOTBUGS_BUGS potential bugs
  Total:      $TOTAL_FINDINGS findings
EOF

echo "Summary saved to: $RESULTS_DIR/summary.txt"
echo ""
echo "✅ Multi-tool analysis complete!"