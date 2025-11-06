#!/bin/bash
# Deploy and run multi-repository severity validation on Oracle Cloud

set -e

echo ""
echo "🚀 DEPLOYING SEVERITY VALIDATION TEST TO ORACLE CLOUD"
echo "======================================================"
echo ""

# Oracle Cloud credentials
export SSH_KEY="/Users/alpinro/Code Prjects/codequal/keys/oracle/ssh-key-2025-10-07.key"
export ORACLE_IP="129.213.49.128"

echo "📡 Target: opc@${ORACLE_IP}"
echo ""

# Check SSH key exists
if [ ! -f "$SSH_KEY" ]; then
  echo "❌ SSH key not found: $SSH_KEY"
  exit 1
fi

echo "📦 Step 1: Deploying test scripts..."
echo ""

# Deploy the multi-repo test script
rsync -avz --progress \
  -e "ssh -i \"$SSH_KEY\" -o StrictHostKeyChecking=no" \
  "test-v9-e2e-complete.ts" \
  "src/two-branch/utils/severity-mapper.ts" \
  "src/two-branch/templates/v9-template-config.ts" \
  "src/two-branch/analyzers/v9-grouped-report-formatter.ts" \
  "src/two-branch/utils/issue-grouping.ts" \
  "opc@${ORACLE_IP}:~/codequal/packages/agents/"

echo ""
echo "✅ Files deployed"
echo ""

# Create the multi-repo test script on Oracle
echo "📝 Step 2: Creating multi-repo test script on Oracle..."
echo ""

ssh -i "$SSH_KEY" "opc@${ORACLE_IP}" << 'REMOTE_SCRIPT'
cd ~/codequal/packages/agents

cat > test-multi-repo-severity.ts << 'EOF'
#!/usr/bin/env ts-node
/**
 * Multi-Repository Severity Validation on Oracle Cloud
 * Tests severity mapping across 5 Java repositories
 */

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

interface TestRepo {
  name: string;
  url: string;
  branch: string;
  description: string;
}

const TEST_REPOS: TestRepo[] = [
  {
    name: 'apache-kafka',
    url: 'https://github.com/apache/kafka',
    branch: 'trunk',
    description: 'Large enterprise (5,592 Java files)'
  },
  {
    name: 'spring-petclinic',
    url: 'https://github.com/spring-projects/spring-petclinic',
    branch: 'main',
    description: 'Small Spring Boot demo (43 Java files)'
  },
  {
    name: 'webgoat',
    url: 'https://github.com/WebGoat/WebGoat',
    branch: 'main',
    description: 'Security vulnerabilities (389 Java files)'
  },
  {
    name: 'jenkins',
    url: 'https://github.com/jenkinsci/jenkins',
    branch: 'master',
    description: 'CI/CD platform (1,826 Java files)'
  },
  {
    name: 'java-design-patterns',
    url: 'https://github.com/iluwatar/java-design-patterns',
    branch: 'master',
    description: 'Design patterns (1,813 Java files)'
  }
];

async function main() {
  console.log('\n🔍 MULTI-REPOSITORY SEVERITY VALIDATION');
  console.log('========================================\n');
  
  const outputDir = `severity-validation-${Date.now()}`;
  fs.mkdirSync(outputDir, { recursive: true });
  
  const results: any[] = [];
  
  for (const repo of TEST_REPOS) {
    console.log(`\n📦 Testing: ${repo.name}`);
    console.log(`   ${repo.description}\n`);
    
    const repoDir = `/tmp/${repo.name}`;
    const startTime = Date.now();
    
    try {
      // Clone repository
      console.log('   🔧 Cloning...');
      execSync(`rm -rf ${repoDir}`, { stdio: 'ignore' });
      execSync(`git clone --depth 1 --branch ${repo.branch} ${repo.url} ${repoDir}`, { stdio: 'pipe' });
      console.log('   ✅ Cloned');
      
      // Run PMD using V9ToolOrchestrator
      console.log('   🔍 Running PMD analysis...');
      
      const { JavaToolOrchestrator } = await import('./src/two-branch/tools/java/java-tool-orchestrator');
      
      const orchestrator = new JavaToolOrchestrator({
        pmd: {
          enabled: true,
          minimumPriority: 1,
          rulesets: [],
          parallel: 2,
          threads: 4,
          memory: '5g'
        },
        checkstyle: { enabled: false },
        semgrep: { enabled: false },
        spotbugs: { enabled: false },
        dependencyCheck: { enabled: false }
      });
      
      const result = await orchestrator.orchestrate(repoDir, 'main');
      
      const pmdResult = result.find(r => r.tool.toLowerCase() === 'pmd');
      
      if (!pmdResult || !pmdResult.issues) {
        console.log('   ⚠️  No PMD results');
        continue;
      }
      
      // Analyze severity distribution
      const counts = { critical: 0, high: 0, medium: 0, low: 0 };
      const highRules = new Map<string, number>();
      
      pmdResult.issues.forEach((issue: any) => {
        const sev = issue.severity || 'medium';
        counts[sev as keyof typeof counts]++;
        
        if (sev === 'high') {
          const key = `${issue.tool}:${issue.rule}`;
          highRules.set(key, (highRules.get(key) || 0) + 1);
        }
      });
      
      const total = counts.critical + counts.high + counts.medium + counts.low;
      const executionTime = Math.round((Date.now() - startTime) / 1000);
      
      console.log('\n   📊 Severity Distribution:');
      console.log(`   ├─ Critical: ${counts.critical} (${((counts.critical/total)*100).toFixed(1)}%)`);
      console.log(`   ├─ High:     ${counts.high} (${((counts.high/total)*100).toFixed(1)}%)`);
      console.log(`   ├─ Medium:   ${counts.medium} (${((counts.medium/total)*100).toFixed(1)}%)`);
      console.log(`   ├─ Low:      ${counts.low} (${((counts.low/total)*100).toFixed(1)}%)`);
      console.log(`   └─ Total:    ${total}`);
      console.log(`   ⏱️  Time: ${executionTime}s\n`);
      
      const highPct = (counts.high / total) * 100;
      if (highPct > 30) {
        console.log(`   ⚠️  WARNING: HIGH at ${highPct.toFixed(1)}% (expected: 10-20%)\n`);
      }
      
      results.push({
        repo: repo.name,
        counts,
        highRules: Array.from(highRules.entries()).sort((a, b) => b[1] - a[1]).slice(0, 10),
        executionTime
      });
      
      // Cleanup
      execSync(`rm -rf ${repoDir}`, { stdio: 'ignore' });
      
    } catch (error: any) {
      console.error(`   ❌ Failed: ${error.message}\n`);
    }
  }
  
  // Generate report
  console.log('\n📊 FINAL REPORT');
  console.log('===============\n');
  
  let totalCritical = 0, totalHigh = 0, totalMedium = 0, totalLow = 0;
  
  results.forEach(r => {
    totalCritical += r.counts.critical;
    totalHigh += r.counts.high;
    totalMedium += r.counts.medium;
    totalLow += r.counts.low;
  });
  
  const grandTotal = totalCritical + totalHigh + totalMedium + totalLow;
  
  if (grandTotal > 0) {
    console.log('Overall Distribution:');
    console.log(`  Critical: ${totalCritical} (${((totalCritical/grandTotal)*100).toFixed(1)}%)`);
    console.log(`  High:     ${totalHigh} (${((totalHigh/grandTotal)*100).toFixed(1)}%)`);
    console.log(`  Medium:   ${totalMedium} (${((totalMedium/grandTotal)*100).toFixed(1)}%)`);
    console.log(`  Low:      ${totalLow} (${((totalLow/grandTotal)*100).toFixed(1)}%)`);
    console.log(`  Total:    ${grandTotal}\n`);
    
    const overallHighPct = (totalHigh / grandTotal) * 100;
    if (overallHighPct > 30) {
      console.log(`⚠️  WARNING: Overall HIGH at ${overallHighPct.toFixed(1)}% (expected: 10-20%)\n`);
    } else {
      console.log(`✅ Overall HIGH at ${overallHighPct.toFixed(1)}% (good!)\n`);
    }
  }
  
  // Save results
  fs.writeFileSync(`${outputDir}/results.json`, JSON.stringify(results, null, 2));
  console.log(`📁 Results saved: ${outputDir}/results.json\n`);
}

main().catch(console.error);
EOF

chmod +x test-multi-repo-severity.ts

echo "✅ Test script created"
REMOTE_SCRIPT

echo ""
echo "✅ Deployment complete!"
echo ""

# Run the test
echo "🚀 Step 3: Running multi-repository test on Oracle..."
echo ""
echo "This will test 5 Java repositories (estimated 10-15 minutes)"
echo ""

ssh -i "$SSH_KEY" "opc@${ORACLE_IP}" << 'REMOTE_EXEC'
cd ~/codequal/packages/agents
echo "Starting test..."
npx ts-node test-multi-repo-severity.ts
REMOTE_EXEC

echo ""
echo "✅ Test complete!"
echo ""
echo "📥 Step 4: Downloading results..."
echo ""

# Download results
rsync -avz --progress \
  -e "ssh -i \"$SSH_KEY\" -o StrictHostKeyChecking=no" \
  "opc@${ORACLE_IP}:~/codequal/packages/agents/severity-validation-*/" \
  "./severity-results-from-oracle/"

echo ""
echo "✅ Results downloaded to: ./severity-results-from-oracle/"
echo ""
echo "🎯 Next Steps:"
echo "   1. Review severity-results-from-oracle/results.json"
echo "   2. Check if HIGH% > 30% across repos"
echo "   3. Add overrides to severity-mapper.ts if needed"
echo ""

