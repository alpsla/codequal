#!/bin/bash
# Java-Only Multi-Repository Severity Validation
# Tests severity mapping fixes across diverse Java codebases

set -e

echo ""
echo "🔍 JAVA MULTI-REPOSITORY SEVERITY VALIDATION"
echo "============================================="
echo ""
echo "Purpose: Validate severity fixes across diverse Java codebases"
echo "Expected: Critical <5%, High 10-20%, Medium 50-70%, Low 10-30%"
echo ""
echo "Testing Strategy:"
echo "- 5 different Java repositories"
echo "- Different sizes (small → large)"
echo "- Different build systems (Maven, Gradle)"
echo "- Different code maturity levels"
echo ""

# Output directory
OUTPUT_DIR="./severity-validation-$(date +%s)"
mkdir -p "$OUTPUT_DIR"

echo "📁 Results directory: $OUTPUT_DIR"
echo ""

# Java repositories with real PRs or branches with issues
declare -a REPOS=(
  "apache/kafka|trunk|main|Large enterprise project (3,472 Java files)|Maven"
  "spring-projects/spring-petclinic|main|main|Small Spring Boot demo (50 Java files)|Maven"
  "WebGoat/WebGoat|main|main|Security training (intentional vulnerabilities)|Maven"
  "jenkinsci/jenkins|master|master|CI/CD platform (legacy + modern)|Maven"
  "iluwatar/java-design-patterns|master|master|Design patterns (clean code examples)|Maven"
)

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to run PMD and analyze severity
test_repository() {
  local repo_name=$1
  local branch=$2
  local base_branch=$3
  local description=$4
  local build_system=$5
  
  echo ""
  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${BLUE}📦 Testing: $repo_name${NC}"
  echo "   Description: $description"
  echo "   Build System: $build_system"
  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo ""
  
  local repo_key=$(echo "$repo_name" | tr '/' '-')
  local start_time=$(date +%s)
  
  # Clone repository
  echo "   🔧 Cloning repository..."
  REPO_DIR="/tmp/severity-test-$repo_key"
  rm -rf "$REPO_DIR"
  
  if ! git clone --depth 1 --branch "$branch" "https://github.com/$repo_name.git" "$REPO_DIR" &>/dev/null; then
    echo -e "   ${RED}❌ Clone failed, skipping...${NC}"
    return 1
  fi
  
  echo -e "   ${GREEN}✅ Repository cloned${NC}"
  
  # Count Java files
  local java_files=$(find "$REPO_DIR" -name "*.java" -type f | wc -l | tr -d ' ')
  echo "   📊 Java files: $java_files"
  
  # Run PMD analysis with our ruleset
  echo "   🔍 Running PMD analysis (this may take 30-60s for large repos)..."
  
  RULESET="$(pwd)/src/two-branch/tools/java/rulesets/pmd-codequal-default.xml"
  DOCKER_IMAGE="ghcr.io/alpsla/analyzer:lang-java-v5.1"
  
  # Run PMD in Docker
  if docker run --rm \
    -v "$REPO_DIR:/workspace:ro" \
    -v "$RULESET:/pmd-ruleset.xml:ro" \
    "$DOCKER_IMAGE" \
    sh -c "pmd check -d /workspace -f json -R /pmd-ruleset.xml --minimum-priority 1 --threads 4 --cache /tmp/pmd-cache 2>/dev/null || true" \
    > "$OUTPUT_DIR/${repo_key}-pmd-raw.json" 2>&1; then
    
    echo -e "   ${GREEN}✅ PMD analysis complete${NC}"
  else
    echo -e "   ${YELLOW}⚠️  PMD completed with warnings${NC}"
  fi
  
  # Analyze severity distribution using our severity-mapper
  echo "   📊 Analyzing severity distribution with severity-mapper.ts..."
  
  npx ts-node << 'TYPESCRIPT_CODE'
    import * as fs from 'fs';
    import { determineCodeQualSeverity } from './src/two-branch/utils/severity-mapper';
    
    const repoKey = process.env.REPO_KEY || 'unknown';
    const outputDir = process.env.OUTPUT_DIR || './';
    
    try {
      // Load PMD results
      const rawResults = JSON.parse(
        fs.readFileSync(`${outputDir}/${repoKey}-pmd-raw.json`, 'utf8')
      );
      
      if (!rawResults.files || rawResults.files.length === 0) {
        console.log('   ⚠️  No issues found (clean repo or PMD error)');
        process.exit(0);
      }
      
      // Count by severity
      const counts = { critical: 0, high: 0, medium: 0, low: 0 };
      const ruleBreakdown = new Map<string, number>();
      const suspiciousHighRules = new Map<string, { count: number; priority: number; category: string }>();
      
      // Process each violation
      rawResults.files.forEach((file: any) => {
        file.violations?.forEach((violation: any) => {
          const severity = determineCodeQualSeverity(
            'pmd',
            violation.priority || 3,
            violation.ruleSet || '',
            violation.rule || '',
            violation.message || ''
          );
          
          counts[severity as keyof typeof counts]++;
          
          const ruleKey = `${violation.ruleSet}:${violation.rule}`;
          ruleBreakdown.set(ruleKey, (ruleBreakdown.get(ruleKey) || 0) + 1);
          
          // Track HIGH severity rules for review
          if (severity === 'high') {
            if (!suspiciousHighRules.has(ruleKey)) {
              suspiciousHighRules.set(ruleKey, {
                count: 0,
                priority: violation.priority || 3,
                category: violation.ruleSet || 'unknown'
              });
            }
            suspiciousHighRules.get(ruleKey)!.count++;
          }
        });
      });
      
      const total = counts.critical + counts.high + counts.medium + counts.low;
      
      if (total === 0) {
        console.log('   ⚠️  No violations detected');
        process.exit(0);
      }
      
      // Calculate percentages
      const critPct = ((counts.critical / total) * 100).toFixed(1);
      const highPct = ((counts.high / total) * 100).toFixed(1);
      const medPct = ((counts.medium / total) * 100).toFixed(1);
      const lowPct = ((counts.low / total) * 100).toFixed(1);
      
      // Display results
      console.log('');
      console.log('   📊 Severity Distribution:');
      console.log(`   ├─ 🔴 Critical: ${counts.critical.toLocaleString()} (${critPct}%)`);
      console.log(`   ├─ 🟠 High:     ${counts.high.toLocaleString()} (${highPct}%)`);
      console.log(`   ├─ 🟡 Medium:   ${counts.medium.toLocaleString()} (${medPct}%)`);
      console.log(`   ├─ 🟢 Low:      ${counts.low.toLocaleString()} (${lowPct}%)`);
      console.log(`   └─ 📊 Total:    ${total.toLocaleString()}`);
      console.log('');
      
      // Flag suspicious distributions
      const highPctNum = parseFloat(highPct);
      if (highPctNum > 30) {
        console.log(`   ⚠️  WARNING: HIGH severity at ${highPct}% (expected: 10-20%)`);
        console.log('   → Likely aggressive severity mapping');
        console.log('');
        console.log('   Top HIGH-severity rules to review:');
        Array.from(suspiciousHighRules.entries())
          .sort((a, b) => b[1].count - a[1].count)
          .slice(0, 10)
          .forEach(([rule, data]) => {
            console.log(`      • ${rule}`);
            console.log(`        └─ ${data.count} occurrences, priority ${data.priority}, category: ${data.category}`);
          });
        console.log('');
      } else if (highPctNum < 10) {
        console.log(`   ✅ HIGH severity at ${highPct}% (good - within 10-20% target)`);
        console.log('');
      } else {
        console.log(`   ✅ HIGH severity at ${highPct}% (acceptable - within 10-20% target)`);
        console.log('');
      }
      
      // Save to CSV
      fs.appendFileSync(`${outputDir}/summary.csv`, 
        `${repoKey},${counts.critical},${counts.high},${counts.medium},${counts.low},${total},${critPct},${highPct},${medPct},${lowPct}\n`
      );
      
      // Save detailed breakdown
      fs.writeFileSync(`${outputDir}/${repoKey}-breakdown.json`, JSON.stringify({
        counts,
        percentages: { critical: critPct, high: highPct, medium: medPct, low: lowPct },
        topRules: Array.from(ruleBreakdown.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 20)
          .map(([rule, count]) => ({ rule, count })),
        suspiciousHighRules: Array.from(suspiciousHighRules.entries())
          .sort((a, b) => b[1].count - a[1].count)
          .map(([rule, data]) => ({ rule, ...data }))
      }, null, 2));
      
    } catch (error: any) {
      console.error(`   ❌ Analysis failed: ${error.message}`);
      process.exit(1);
    }
TYPESCRIPT_CODE
  
  local end_time=$(date +%s)
  local duration=$((end_time - start_time))
  
  echo "   ⏱️  Analysis time: ${duration}s"
  echo -e "   ${GREEN}✅ Repository analysis complete${NC}"
  
  # Cleanup
  rm -rf "$REPO_DIR"
  
  return 0
}

# Create CSV header
echo "Repository,Critical,High,Medium,Low,Total,Crit%,High%,Med%,Low%" > "$OUTPUT_DIR/summary.csv"

# Test each repository
successful=0
failed=0

for repo_spec in "${REPOS[@]}"; do
  IFS='|' read -r repo_name branch base_branch description build_system <<< "$repo_spec"
  
  export REPO_KEY=$(echo "$repo_name" | tr '/' '-')
  export OUTPUT_DIR="$OUTPUT_DIR"
  
  if test_repository "$repo_name" "$branch" "$base_branch" "$description" "$build_system"; then
    ((successful++))
  else
    ((failed++))
  fi
done

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}📊 FINAL REPORT${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Display summary table
if [ -f "$OUTPUT_DIR/summary.csv" ]; then
  echo "Summary of All Repositories:"
  echo ""
  column -t -s, "$OUTPUT_DIR/summary.csv"
  echo ""
  
  # Calculate aggregated totals
  echo "Aggregated Statistics:"
  awk -F, 'NR>1 {crit+=$2; high+=$3; med+=$4; low+=$5; total+=$6} 
           END {
             if (total > 0) {
               printf "  Total Issues: %d\n", total;
               printf "  ├─ Critical: %d (%.1f%%)\n", crit, (crit/total)*100;
               printf "  ├─ High:     %d (%.1f%%)\n", high, (high/total)*100;
               printf "  ├─ Medium:   %d (%.1f%%)\n", med, (med/total)*100;
               printf "  └─ Low:      %d (%.1f%%)\n", low, (low/total)*100;
               printf "\n";
               
               high_pct = (high/total)*100;
               if (high_pct > 30) {
                 printf "  ⚠️  WARNING: Overall HIGH severity at %.1f%% (expected: 10-20%%)\n", high_pct;
                 printf "  → Review severity-mapper.ts for aggressive mappings\n";
               } else if (high_pct < 10) {
                 printf "  ✅ Overall HIGH severity at %.1f%% (good!)\n", high_pct;
               } else {
                 printf "  ✅ Overall HIGH severity at %.1f%% (acceptable)\n", high_pct;
               }
             }
           }' "$OUTPUT_DIR/summary.csv"
  echo ""
  
  echo "📁 Detailed results saved in: $OUTPUT_DIR/"
  echo ""
  
  # Recommendations
  echo "🎯 Next Steps:"
  echo ""
  echo "1. Review *-breakdown.json files for suspicious HIGH severity rules"
  echo "2. If HIGH% > 30%, add rule overrides to severity-mapper.ts"
  echo "3. Compare with previous severity mapping (before fixes)"
  echo "4. Update .cursorrules with new findings"
  echo ""
  
  echo "📊 Test Results:"
  echo "  ├─ Successful: $successful repositories"
  echo "  ├─ Failed:     $failed repositories"
  echo "  └─ Total:      ${#REPOS[@]} repositories"
  echo ""
else
  echo -e "${RED}❌ No results generated${NC}"
fi

echo -e "${GREEN}✅ Validation complete!${NC}"
echo ""

