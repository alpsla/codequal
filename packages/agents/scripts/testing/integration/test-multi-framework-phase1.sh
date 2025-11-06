#!/bin/bash
# Multi-Framework Severity Validation - Phase 1 (Quick Validation)
# Tests 3 diverse Java repositories on Oracle Cloud

set -e

SSH_KEY="/Users/alpinro/Code Prjects/codequal/keys/oracle/ssh-key-2025-10-07.key"
ORACLE_IP="129.213.49.128"

echo ""
echo "🔍 MULTI-FRAMEWORK SEVERITY VALIDATION - PHASE 1"
echo "================================================"
echo ""
echo "Testing 3 diverse Java repositories:"
echo "  1. Spring PetClinic (clean, small, Spring Boot)"
echo "  2. WebGoat (security issues, intentional vulns)"
echo "  3. Java Design Patterns (best practices, educational)"
echo ""
echo "Expected Duration: ~30 minutes"
echo ""

# Deploy test script to Oracle
echo "📦 Deploying test infrastructure to Oracle Cloud..."
rsync -az -e "ssh -i \"$SSH_KEY\" -o StrictHostKeyChecking=no" \
  test-v9-e2e-complete.ts \
  src/two-branch/utils/severity-mapper.ts \
  src/two-branch/analyzers/v9-grouped-report-formatter.ts \
  src/two-branch/templates/v9-template-config.ts \
  opc@${ORACLE_IP}:~/codequal/packages/agents/ 2>&1 | grep -E "(building|sent|speedup)" || true

echo "✅ Files deployed"
echo ""

# Create and run test script on Oracle
ssh -i "$SSH_KEY" -o StrictHostKeyChecking=no "opc@${ORACLE_IP}" 'bash -s' << 'ORACLE_SCRIPT'
cd ~/codequal/packages/agents

echo "🧪 Creating Phase 1 test runner..."

cat > run-phase1-tests.sh << 'TEST_SCRIPT'
#!/bin/bash
set -e

# Test repositories for Phase 1
declare -A REPOS
REPOS[1]="spring-projects/spring-petclinic|main|Spring PetClinic|Clean small Spring Boot app"
REPOS[2]="WebGoat/WebGoat|main|WebGoat|Security vulnerabilities (educational)"
REPOS[3]="iluwatar/java-design-patterns|master|Java Design Patterns|Best practices, clean code"

RESULTS_FILE="phase1-results-$(date +%s).txt"

echo "MULTI-FRAMEWORK SEVERITY VALIDATION - PHASE 1" > "$RESULTS_FILE"
echo "=============================================" >> "$RESULTS_FILE"
echo "Date: $(date)" >> "$RESULTS_FILE"
echo "" >> "$RESULTS_FILE"

for key in "${!REPOS[@]}"; do
  IFS='|' read -r repo_full branch name description <<< "${REPOS[$key]}"
  
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "🧪 Test $key/3: $name"
  echo "   Repo: $repo_full"
  echo "   $description"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""
  
  # Clone repository
  REPO_DIR="/tmp/test-$(echo $name | tr ' ' '-' | tr '[:upper:]' '[:lower:]')"
  echo "   🔧 Cloning..."
  rm -rf "$REPO_DIR"
  
  if git clone --depth 1 --branch "$branch" "https://github.com/$repo_full" "$REPO_DIR" &>/dev/null; then
    echo "   ✅ Cloned"
    
    # Count Java files
    JAVA_FILES=$(find "$REPO_DIR" -name "*.java" -type f | wc -l | tr -d ' ')
    echo "   📊 Java files: $JAVA_FILES"
    
    # Run PMD analysis
    echo "   🔍 Running PMD analysis..."
    
    RULESET="$(pwd)/src/two-branch/tools/java/rulesets/pmd-codequal-default.xml"
    
    docker run --rm \
      -v "$REPO_DIR:/workspace:ro" \
      -v "$RULESET:/pmd-ruleset.xml:ro" \
      iad.ocir.io/idzaw9ddo1h5/codequal/analyzer:lang-java-v6.0-arm \
      sh -c "pmd check -d /workspace -f json -R /pmd-ruleset.xml --minimum-priority 1 --threads 4 --cache /tmp/pmd-cache 2>/dev/null || true" \
      > "/tmp/pmd-$key.json" 2>&1
    
    echo "   ✅ PMD complete"
    
    # Analyze with severity-mapper
    echo "   📊 Analyzing severity distribution..."
    
    npx ts-node -e "
      const fs = require('fs');
      const { determineCodeQualSeverity } = require('./src/two-branch/utils/severity-mapper');
      
      try {
        const data = JSON.parse(fs.readFileSync('/tmp/pmd-$key.json', 'utf8'));
        
        if (!data.files || data.files.length === 0) {
          console.log('   ⚠️  No issues found');
          process.exit(0);
        }
        
        const counts = { critical: 0, high: 0, medium: 0, low: 0 };
        const highRules = new Map();
        
        data.files.forEach(f => {
          f.violations?.forEach(v => {
            const sev = determineCodeQualSeverity('pmd', v.priority || 3, v.ruleSet || '', v.rule || '', v.message || '');
            counts[sev]++;
            
            if (sev === 'high') {
              const key = \`\${v.ruleSet}:\${v.rule}\`;
              highRules.set(key, (highRules.get(key) || 0) + 1);
            }
          });
        });
        
        const total = counts.critical + counts.high + counts.medium + counts.low;
        if (total === 0) {
          console.log('   ⚠️  No violations detected');
          process.exit(0);
        }
        
        const critPct = ((counts.critical / total) * 100).toFixed(1);
        const highPct = ((counts.high / total) * 100).toFixed(1);
        const medPct = ((counts.medium / total) * 100).toFixed(1);
        const lowPct = ((counts.low / total) * 100).toFixed(1);
        
        console.log('');
        console.log('   📊 Severity Distribution:');
        console.log(\`   ├─ 🔴 Critical: \${counts.critical} (\${critPct}%)\`);
        console.log(\`   ├─ 🟠 High:     \${counts.high} (\${highPct}%)\`);
        console.log(\`   ├─ 🟡 Medium:   \${counts.medium} (\${medPct}%)\`);
        console.log(\`   ├─ 🟢 Low:      \${counts.low} (\${lowPct}%)\`);
        console.log(\`   └─ 📊 Total:    \${total}\`);
        console.log('');
        
        const highPctNum = parseFloat(highPct);
        let status = '✅ PASS';
        if (highPctNum > 30) {
          console.log(\`   ⚠️  WARNING: HIGH at \${highPct}% (expected: <30%)\`);
          status = '⚠️  REVIEW';
        } else if (highPctNum > 20) {
          console.log(\`   ✅ HIGH at \${highPct}% (acceptable for security repos)\`);
        } else if (highPctNum > 10) {
          console.log(\`   ✅ HIGH at \${highPct}% (within target 10-20%)\`);
        } else {
          console.log(\`   ✅ HIGH at \${highPct}% (excellent!)\`);
        }
        
        if (highRules.size > 0) {
          console.log('');
          console.log(\`   Top HIGH-severity rules:\`);
          Array.from(highRules.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .forEach(([rule, count]) => {
              console.log(\`      • \${rule}: \${count} occurrences\`);
            });
        }
        console.log('');
        console.log(\`   Status: \${status}\`);
        console.log('');
        
        // Save to results file
        fs.appendFileSync('$RESULTS_FILE', 
          \`TEST $key: $name ($description)\n\` +
          \`  Repo: $repo_full\n\` +
          \`  Java Files: $JAVA_FILES\n\` +
          \`  Critical: \${counts.critical} (\${critPct}%)\n\` +
          \`  High:     \${counts.high} (\${highPct}%)\n\` +
          \`  Medium:   \${counts.medium} (\${medPct}%)\n\` +
          \`  Low:      \${counts.low} (\${lowPct}%)\n\` +
          \`  Total:    \${total}\n\` +
          \`  Status:   \${status}\n\n\`
        );
      } catch (e) {
        console.log(\`   ❌ Analysis failed: \${e.message}\`);
      }
    "
    
    # Cleanup
    rm -rf "$REPO_DIR"
    
  else
    echo "   ❌ Clone failed"
  fi
done

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 PHASE 1 SUMMARY"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

cat "$RESULTS_FILE"

echo "📁 Results saved: $RESULTS_FILE"
echo ""

TEST_SCRIPT

chmod +x run-phase1-tests.sh

echo "✅ Test runner created"
echo ""
echo "🚀 Running Phase 1 tests..."
echo ""

bash run-phase1-tests.sh

ORACLE_SCRIPT

echo ""
echo "📥 Downloading results..."
scp -i "$SSH_KEY" -o StrictHostKeyChecking=no \
  "opc@${ORACLE_IP}:~/codequal/packages/agents/phase1-results-*.txt" \
  ./ 2>&1 | grep -v "Permanently added" || true

echo ""
echo "✅ Phase 1 complete!"
echo ""

# Display results
if ls phase1-results-*.txt &>/dev/null; then
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "📊 LOCAL RESULTS"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""
  cat phase1-results-*.txt
  echo ""
  echo "🎯 Next Steps:"
  echo "   If all 3 tests PASS → Proceed to Phase 2 (6 repos)"
  echo "   If any REVIEW → Add rule overrides and re-test"
  echo ""
fi

