#!/bin/bash
# Multi-Repository Severity Validation Test
# Tests severity mapping fixes across 5 different Java repositories

set -e

echo ""
echo "🔍 MULTI-REPOSITORY SEVERITY VALIDATION TEST"
echo "=============================================="
echo ""
echo "Purpose: Validate severity fixes across diverse Java codebases"
echo "Expected: Critical <5%, High 10-20%, Medium 50-70%, Low 10-30%"
echo ""

# Output directory
OUTPUT_DIR="./severity-validation-$(date +%s)"
mkdir -p "$OUTPUT_DIR"

echo "📁 Results directory: $OUTPUT_DIR"
echo ""

# Test repositories (starting with 3 quick ones)
declare -A REPOS
REPOS["kafka"]="https://github.com/apache/kafka.git|17620|trunk|Large enterprise (3,472 files)"
REPOS["petclinic"]="https://github.com/spring-projects/spring-petclinic.git|0|main|Small Spring Boot app"
REPOS["webgoat"]="https://github.com/WebGoat/WebGoat.git|0|main|Security vulnerabilities (educational)"

# Function to extract severity counts from report
analyze_report() {
  local repo_name=$1
  local report_file=$2
  
  if [ ! -f "$report_file" ]; then
    echo "   ⚠️  Report not found: $report_file"
    return
  fi
  
  echo ""
  echo "   📊 Analyzing severity distribution..."
  
  # Extract severity counts from markdown report
  local critical=$(grep -c "🔴 Critical:" "$report_file" 2>/dev/null || echo "0")
  local high=$(grep -c "🟠 High:" "$report_file" 2>/dev/null || echo "0")
  local medium=$(grep -c "🟡 Medium:" "$report_file" 2>/dev/null || echo "0")
  local low=$(grep -c "🟢 Low:" "$report_file" 2>/dev/null || echo "0")
  local total=$((critical + high + medium + low))
  
  if [ $total -eq 0 ]; then
    echo "   ⚠️  No issues found (possible analysis failure)"
    return
  fi
  
  # Calculate percentages
  local crit_pct=$(awk "BEGIN {printf \"%.1f\", ($critical/$total)*100}")
  local high_pct=$(awk "BEGIN {printf \"%.1f\", ($high/$total)*100}")
  local med_pct=$(awk "BEGIN {printf \"%.1f\", ($medium/$total)*100}")
  local low_pct=$(awk "BEGIN {printf \"%.1f\", ($low/$total)*100}")
  
  echo "   Results for $repo_name:"
  echo "   ├─ Critical: $critical ($crit_pct%)"
  echo "   ├─ High:     $high ($high_pct%)"
  echo "   ├─ Medium:   $medium ($med_pct%)"
  echo "   ├─ Low:      $low ($low_pct%)"
  echo "   └─ Total:    $total"
  
  # Flag suspicious distributions
  if (( $(echo "$high_pct > 30" | bc -l) )); then
    echo "   ⚠️  WARNING: HIGH severity at $high_pct% (expected: 10-20%)"
    echo "   → Review severity-mapper.ts for aggressive mappings"
  fi
  
  # Save to summary
  echo "$repo_name,$critical,$high,$medium,$low,$total,$crit_pct,$high_pct,$med_pct,$low_pct" >> "$OUTPUT_DIR/summary.csv"
}

# Create CSV header
echo "Repository,Critical,High,Medium,Low,Total,Crit%,High%,Med%,Low%" > "$OUTPUT_DIR/summary.csv"

# Test each repository
for repo_key in "${!REPOS[@]}"; do
  IFS='|' read -r url pr_number branch description <<< "${REPOS[$repo_key]}"
  
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "📦 Testing: $repo_key"
  echo "   URL: $url"
  echo "   Description: $description"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""
  
  # Clone repository
  echo "   🔧 Cloning repository..."
  REPO_DIR="/tmp/severity-test-$repo_key"
  rm -rf "$REPO_DIR"
  
  if ! git clone --depth 1 --branch "$branch" "$url" "$REPO_DIR" 2>&1 | grep -E "(Cloning|done)"; then
    echo "   ❌ Clone failed, skipping..."
    continue
  fi
  
  echo "   ✅ Repository cloned"
  
  # Run PMD analysis (quick test with our ruleset)
  echo "   🔍 Running PMD analysis..."
  
  RULESET="$(pwd)/src/two-branch/tools/java/rulesets/pmd-codequal-default.xml"
  DOCKER_IMAGE="ghcr.io/alpsla/analyzer:lang-java-v5.1"
  
  # Run PMD in Docker
  docker run --rm \
    -v "$REPO_DIR:/workspace:ro" \
    -v "$RULESET:/pmd-ruleset.xml:ro" \
    "$DOCKER_IMAGE" \
    sh -c "pmd check -d /workspace -f json -R /pmd-ruleset.xml --minimum-priority 1 --cache /tmp/pmd-cache > /tmp/pmd-results.json 2>/tmp/pmd-errors.log || true; cat /tmp/pmd-results.json" \
    > "$OUTPUT_DIR/${repo_key}-pmd-raw.json"
  
  # Count issues by severity using our severity-mapper logic
  echo "   📊 Analyzing issues with severity-mapper..."
  
  # Parse JSON and apply severity mapping
  npx ts-node -e "
    const fs = require('fs');
    const path = require('path');
    
    // Load results
    const rawResults = JSON.parse(fs.readFileSync('$OUTPUT_DIR/${repo_key}-pmd-raw.json', 'utf8'));
    
    if (!rawResults.files || rawResults.files.length === 0) {
      console.log('   ⚠️  No issues found');
      process.exit(0);
    }
    
    // Import severity mapper
    const { determineCodeQualSeverity } = require('./src/two-branch/utils/severity-mapper');
    
    // Count by severity
    const counts = { critical: 0, high: 0, medium: 0, low: 0 };
    const ruleBreakdown = new Map();
    
    rawResults.files.forEach(file => {
      file.violations?.forEach(violation => {
        const severity = determineCodeQualSeverity(
          'pmd',
          violation.priority || 3,
          violation.ruleSet || '',
          violation.rule || '',
          violation.message || ''
        );
        
        counts[severity]++;
        
        // Track rules marked as HIGH
        if (severity === 'high') {
          const key = \`\${violation.ruleSet}:\${violation.rule}\`;
          ruleBreakdown.set(key, (ruleBreakdown.get(key) || 0) + 1);
        }
      });
    });
    
    // Output results
    console.log(\`   Results for ${repo_key}:\`);
    console.log(\`   ├─ Critical: \${counts.critical}\`);
    console.log(\`   ├─ High:     \${counts.high}\`);
    console.log(\`   ├─ Medium:   \${counts.medium}\`);
    console.log(\`   ├─ Low:      \${counts.low}\`);
    console.log(\`   └─ Total:    \${counts.critical + counts.high + counts.medium + counts.low}\`);
    
    // Save breakdown
    const total = counts.critical + counts.high + counts.medium + counts.low;
    if (total > 0) {
      const highPct = ((counts.high / total) * 100).toFixed(1);
      console.log(\`   High percentage: \${highPct}%\`);
      
      if (parseFloat(highPct) > 30) {
        console.log(\`   ⚠️  WARNING: HIGH severity at \${highPct}% (expected: 10-20%)\`);
        console.log(\`   Top HIGH-severity rules:\`);
        Array.from(ruleBreakdown.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .forEach(([rule, count]) => {
            console.log(\`      - \${rule}: \${count} occurrences\`);
          });
      }
      
      // Save to CSV
      fs.appendFileSync('$OUTPUT_DIR/summary.csv', 
        \`${repo_key},\${counts.critical},\${counts.high},\${counts.medium},\${counts.low},\${total},\${((counts.critical/total)*100).toFixed(1)},\${highPct},\${((counts.medium/total)*100).toFixed(1)},\${((counts.low/total)*100).toFixed(1)}\n\`
      );
      
      // Save detailed breakdown
      fs.writeFileSync('$OUTPUT_DIR/${repo_key}-breakdown.json', JSON.stringify({
        counts,
        highSeverityRules: Array.from(ruleBreakdown.entries()).sort((a, b) => b[1] - a[1])
      }, null, 2));
    }
  " || echo "   ❌ Analysis failed"
  
  echo "   ✅ Analysis complete"
  
  # Cleanup
  rm -rf "$REPO_DIR"
done

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 FINAL REPORT"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Display summary
if [ -f "$OUTPUT_DIR/summary.csv" ]; then
  column -t -s, "$OUTPUT_DIR/summary.csv"
  echo ""
  echo "📁 Detailed results saved in: $OUTPUT_DIR/"
  echo ""
  
  # Aggregate totals
  echo "🎯 Recommended Actions:"
  echo ""
  echo "1. Review $OUTPUT_DIR/*-breakdown.json for suspicious HIGH rules"
  echo "2. Add rule overrides to severity-mapper.ts if needed"
  echo "3. Update PMD ruleset if categories need adjustment"
  echo ""
else
  echo "❌ No results generated"
fi

echo "✅ Validation complete!"
echo ""

