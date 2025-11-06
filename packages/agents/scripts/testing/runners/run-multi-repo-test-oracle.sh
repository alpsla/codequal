#!/bin/bash
# Simple script to run existing E2E test on multiple repos on Oracle Cloud

set -e

SSH_KEY="/Users/alpinro/Code Prjects/codequal/keys/oracle/ssh-key-2025-10-07.key"
ORACLE_IP="129.213.49.128"

echo ""
echo "🔍 MULTI-REPO SEVERITY VALIDATION ON ORACLE CLOUD"
echo "=================================================="
echo ""

# Deploy updated files
echo "📦 Deploying updated severity-mapper.ts..."
rsync -az -e "ssh -i \"$SSH_KEY\" -o StrictHostKeyChecking=no" \
  src/two-branch/utils/severity-mapper.ts \
  opc@${ORACLE_IP}:~/codequal/packages/agents/src/two-branch/utils/

echo "✅ Files deployed"
echo ""

# Create and run test script on Oracle
ssh -i "$SSH_KEY" "opc@${ORACLE_IP}" 'bash -s' << 'ORACLE_SCRIPT'
cd ~/codequal/packages/agents

echo "🔍 Testing 3 Java repositories with different characteristics..."
echo ""

# Output file for results
RESULTS_FILE="severity-validation-results-$(date +%s).txt"

echo "MULTI-REPOSITORY SEVERITY VALIDATION RESULTS" > "$RESULTS_FILE"
echo "=============================================" >> "$RESULTS_FILE"
echo "Date: $(date)" >> "$RESULTS_FILE"
echo "" >> "$RESULTS_FILE"

# Test 1: Apache Kafka (already tested, use existing report)
echo "📦 Test 1/3: Apache Kafka (from existing LATEST_V9_REPORT.md)"
if [ -f "LATEST_V9_REPORT.md" ]; then
  echo "   Using cached report..."
  
  # Extract severity counts
  CRITICAL=$(grep -oP '🔴 Critical: \K\d+' LATEST_V9_REPORT.md | head -1 || echo "0")
  HIGH=$(grep -oP '🟠 High: \K\d+' LATEST_V9_REPORT.md | head -1 || echo "0")
  MEDIUM=$(grep -oP '🟡 Medium: \K\d+' LATEST_V9_REPORT.md | head -1 || echo "0")
  LOW=$(grep -oP '🟢 Low: \K\d+' LATEST_V9_REPORT.md | head -1 || echo "0")
  
  TOTAL=$((CRITICAL + HIGH + MEDIUM + LOW))
  
  if [ $TOTAL -gt 0 ]; then
    HIGH_PCT=$(awk "BEGIN {printf \"%.1f\", ($HIGH/$TOTAL)*100}")
    
    echo "   Results:"
    echo "   ├─ Critical: $CRITICAL"
    echo "   ├─ High:     $HIGH ($HIGH_PCT%)"
    echo "   ├─ Medium:   $MEDIUM"
    echo "   ├─ Low:      $LOW"
    echo "   └─ Total:    $TOTAL"
    echo ""
    
    echo "TEST 1: Apache Kafka" >> "$RESULTS_FILE"
    echo "  Critical: $CRITICAL" >> "$RESULTS_FILE"
    echo "  High:     $HIGH ($HIGH_PCT%)" >> "$RESULTS_FILE"
    echo "  Medium:   $MEDIUM" >> "$RESULTS_FILE"
    echo "  Low:      $LOW" >> "$RESULTS_FILE"
    echo "  Total:    $TOTAL" >> "$RESULTS_FILE"
    echo "" >> "$RESULTS_FILE"
  fi
else
  echo "   ⚠️  No cached report found"
fi

# Test 2: Spring PetClinic (small, clean codebase)
echo "📦 Test 2/3: Spring PetClinic (clean small codebase)"
echo "   Cloning..."

rm -rf /tmp/spring-petclinic
if git clone --depth 1 https://github.com/spring-projects/spring-petclinic /tmp/spring-petclinic &>/dev/null; then
  echo "   ✅ Cloned"
  echo "   🔍 Running PMD..."
  
  # Run PMD directly
  docker run --rm \
    -v /tmp/spring-petclinic:/workspace:ro \
    -v "$(pwd)/src/two-branch/tools/java/rulesets/pmd-codequal-default.xml:/pmd-ruleset.xml:ro" \
    ghcr.io/alpsla/analyzer:lang-java-v5.1 \
    sh -c "pmd check -d /workspace -f json -R /pmd-ruleset.xml --minimum-priority 1 --threads 4 --cache /tmp/pmd-cache 2>/dev/null || true" \
    > /tmp/petclinic-pmd.json 2>&1
  
  # Parse and count with our severity mapper
  echo "   📊 Analyzing with severity-mapper..."
  
  npx ts-node -e "
    const fs = require('fs');
    const { determineCodeQualSeverity } = require('./src/two-branch/utils/severity-mapper');
    
    try {
      const data = JSON.parse(fs.readFileSync('/tmp/petclinic-pmd.json', 'utf8'));
      const counts = { critical: 0, high: 0, medium: 0, low: 0 };
      
      data.files?.forEach(f => {
        f.violations?.forEach(v => {
          const sev = determineCodeQualSeverity('pmd', v.priority || 3, v.ruleSet || '', v.rule || '', v.message || '');
          counts[sev]++;
        });
      });
      
      const total = counts.critical + counts.high + counts.medium + counts.low;
      if (total > 0) {
        const highPct = ((counts.high / total) * 100).toFixed(1);
        console.log(\`   Results:\`);
        console.log(\`   ├─ Critical: \${counts.critical}\`);
        console.log(\`   ├─ High:     \${counts.high} (\${highPct}%)\`);
        console.log(\`   ├─ Medium:   \${counts.medium}\`);
        console.log(\`   ├─ Low:      \${counts.low}\`);
        console.log(\`   └─ Total:    \${total}\`);
        console.log('');
        
        fs.appendFileSync('$RESULTS_FILE', \`TEST 2: Spring PetClinic\n  Critical: \${counts.critical}\n  High:     \${counts.high} (\${highPct}%)\n  Medium:   \${counts.medium}\n  Low:      \${counts.low}\n  Total:    \${total}\n\n\`);
      }
    } catch (e) {
      console.log('   ⚠️  Analysis failed:', e.message);
    }
  "
  
  rm -rf /tmp/spring-petclinic
else
  echo "   ❌ Clone failed"
fi

# Test 3: WebGoat (security vulnerabilities)
echo "📦 Test 3/3: WebGoat (security vulnerabilities)"
echo "   Cloning..."

rm -rf /tmp/webgoat
if git clone --depth 1 https://github.com/WebGoat/WebGoat /tmp/webgoat &>/dev/null; then
  echo "   ✅ Cloned"
  echo "   🔍 Running PMD..."
  
  docker run --rm \
    -v /tmp/webgoat:/workspace:ro \
    -v "$(pwd)/src/two-branch/tools/java/rulesets/pmd-codequal-default.xml:/pmd-ruleset.xml:ro" \
    ghcr.io/alpsla/analyzer:lang-java-v5.1 \
    sh -c "pmd check -d /workspace -f json -R /pmd-ruleset.xml --minimum-priority 1 --threads 4 --cache /tmp/pmd-cache 2>/dev/null || true" \
    > /tmp/webgoat-pmd.json 2>&1
  
  echo "   📊 Analyzing with severity-mapper..."
  
  npx ts-node -e "
    const fs = require('fs');
    const { determineCodeQualSeverity } = require('./src/two-branch/utils/severity-mapper');
    
    try {
      const data = JSON.parse(fs.readFileSync('/tmp/webgoat-pmd.json', 'utf8'));
      const counts = { critical: 0, high: 0, medium: 0, low: 0 };
      
      data.files?.forEach(f => {
        f.violations?.forEach(v => {
          const sev = determineCodeQualSeverity('pmd', v.priority || 3, v.ruleSet || '', v.rule || '', v.message || '');
          counts[sev]++;
        });
      });
      
      const total = counts.critical + counts.high + counts.medium + counts.low;
      if (total > 0) {
        const highPct = ((counts.high / total) * 100).toFixed(1);
        console.log(\`   Results:\`);
        console.log(\`   ├─ Critical: \${counts.critical}\`);
        console.log(\`   ├─ High:     \${counts.high} (\${highPct}%)\`);
        console.log(\`   ├─ Medium:   \${counts.medium}\`);
        console.log(\`   ├─ Low:      \${counts.low}\`);
        console.log(\`   └─ Total:    \${total}\`);
        console.log('');
        
        fs.appendFileSync('$RESULTS_FILE', \`TEST 3: WebGoat\n  Critical: \${counts.critical}\n  High:     \${counts.high} (\${highPct}%)\n  Medium:   \${counts.medium}\n  Low:      \${counts.low}\n  Total:    \${total}\n\n\`);
      }
    } catch (e) {
      console.log('   ⚠️  Analysis failed:', e.message);
    }
  "
  
  rm -rf /tmp/webgoat
else
  echo "   ❌ Clone failed"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 FINAL REPORT"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

cat "$RESULTS_FILE"

echo "📁 Results saved: $RESULTS_FILE"
echo ""
ORACLE_SCRIPT

echo ""
echo "📥 Downloading results..."
scp -i "$SSH_KEY" -o StrictHostKeyChecking=no \
  "opc@${ORACLE_IP}:~/codequal/packages/agents/severity-validation-results-*.txt" \
  ./

echo ""
echo "✅ Multi-repo validation complete!"
echo ""

