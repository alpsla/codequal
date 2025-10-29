#!/usr/bin/env bash
set -euo pipefail

# V9 Multi-Framework Test Runner
# Runs test-v9-e2e-complete.ts multiple times with different framework configurations

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TEST_SCRIPT="$SCRIPT_DIR/test-v9-e2e-complete.ts"
BACKUP_SCRIPT="$SCRIPT_DIR/test-v9-e2e-complete.ts.backup"
REPORTS_DIR="$SCRIPT_DIR/reports"
TIMESTAMP=$(date +%s)
SUMMARY_FILE="$REPORTS_DIR/v9-multi-framework-summary-$TIMESTAMP.json"

# Framework configurations
declare -A FRAMEWORKS
FRAMEWORKS=(
  ["spring-boot-petclinic"]="https://github.com/spring-projects/spring-petclinic.git|950"
  ["quarkus-quickstarts"]="https://github.com/quarkusio/quarkus-quickstarts.git|1551"
  ["micronaut-core"]="https://github.com/micronaut-projects/micronaut-core.git|10950"
  ["apache-kafka"]="https://github.com/apache/kafka.git|20515"
  ["webgoat"]="https://github.com/WebGoat/WebGoat.git|1950"
)

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║  V9 Multi-Framework Test Suite (Sequential Execution)         ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""
echo "📋 Testing 5 Java Frameworks:"
for name in "${!FRAMEWORKS[@]}"; do
  IFS='|' read -r repo pr <<< "${FRAMEWORKS[$name]}"
  echo "   - $name (PR #$pr)"
done
echo ""

# Backup original test
if [ ! -f "$BACKUP_SCRIPT" ]; then
  cp "$TEST_SCRIPT" "$BACKUP_SCRIPT"
  echo "✅ Backed up original test script"
fi

# Create results array
RESULTS_JSON="["
FIRST=true

# Run test for each framework
for name in "${!FRAMEWORKS[@]}"; do
  IFS='|' read -r repo pr <<< "${FRAMEWORKS[$name]}"
  
  echo ""
  echo "╔════════════════════════════════════════════════════════════════╗"
  echo "║  Testing: $name (PR #$pr)"
  echo "╚════════════════════════════════════════════════════════════════╝"
  echo ""
  
  # Modify test script with framework configuration
  sed -i.tmp "s|repositoryUrl: '.*'|repositoryUrl: '$repo'|" "$TEST_SCRIPT"
  sed -i.tmp "s|prNumber: [0-9]*|prNumber: $pr|" "$TEST_SCRIPT"
  rm -f "$TEST_SCRIPT.tmp"
  
  # Run test
  START_TIME=$(date +%s)
  if npx ts-node "$TEST_SCRIPT" 2>&1 | tee "/tmp/v9-test-$name.log"; then
    END_TIME=$(date +%s)
    DURATION=$((END_TIME - START_TIME))
    STATUS="SUCCESS"
    echo "✅ $name completed in ${DURATION}s"
    
    # Find generated report
    REPORT=$(ls -t /tmp/v9-reports/v9-grouped-report-*.md 2>/dev/null | head -1 || echo "")
    if [ -n "$REPORT" ]; then
      # Move report to reports directory with framework name
      NEW_REPORT="$REPORTS_DIR/v9-$name-pr$pr-$(date +%s).md"
      cp "$REPORT" "$NEW_REPORT"
      echo "📄 Report saved: $NEW_REPORT"
    fi
    
  else
    END_TIME=$(date +%s)
    DURATION=$((END_TIME - START_TIME))
    STATUS="FAILED"
    echo "❌ $name failed after ${DURATION}s"
  fi
  
  # Add to results JSON
  if [ "$FIRST" = true ]; then
    FIRST=false
  else
    RESULTS_JSON="$RESULTS_JSON,"
  fi
  
  RESULTS_JSON="$RESULTS_JSON{\"framework\":\"$name\",\"status\":\"$STATUS\",\"duration\":$DURATION,\"pr\":$pr,\"repo\":\"$repo\"}"
  
  # Clean up for next iteration
  rm -rf /tmp/v9-test-* /tmp/v9-reports/*
done

RESULTS_JSON="$RESULTS_JSON]"

# Restore original test
cp "$BACKUP_SCRIPT" "$TEST_SCRIPT"
echo ""
echo "✅ Restored original test script"

# Save summary JSON
mkdir -p "$REPORTS_DIR"
echo "{\"timestamp\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",\"results\":$RESULTS_JSON}" > "$SUMMARY_FILE"

echo ""
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║  ✅ Multi-Framework Test Complete!                             ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""
echo "📊 Summary saved to: $SUMMARY_FILE"
echo "📁 Reports directory: $REPORTS_DIR"
echo ""

