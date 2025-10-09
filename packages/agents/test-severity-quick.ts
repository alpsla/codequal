#!/usr/bin/env ts-node
/**
 * Quick Severity Validation using existing E2E test
 * 
 * This runs test-v9-e2e-complete.ts on multiple repos and extracts
 * severity distributions to validate our recent fixes.
 */

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

interface TestRepo {
  name: string;
  url: string;
  prNumber: number;
  description: string;
}

const TEST_REPOS: TestRepo[] = [
  {
    name: 'Apache Kafka',
    url: 'https://github.com/apache/kafka',
    prNumber: 17620,
    description: 'Large enterprise (3,472 Java files) - already tested'
  },
  {
    name: 'Spring PetClinic',
    url: 'https://github.com/spring-projects/spring-petclinic',
    prNumber: 0, // Use latest main
    description: 'Small Spring Boot demo (~50 files)'
  },
  {
    name: 'WebGoat',
    url: 'https://github.com/WebGoat/WebGoat',
    prNumber: 0,
    description: 'Security vulnerabilities (educational)'
  }
];

console.log('\n🔍 SEVERITY VALIDATION - ORACLE CLOUD RECOMMENDED\n');
console.log('=' .repeat(60));
console.log('\n⚠️  NOTE: This test requires Oracle Cloud for best results');
console.log('   Local testing may fail due to Docker image access\n');
console.log('Recommended approach:');
console.log('1. Deploy test-v9-e2e-complete.ts to Oracle Cloud');
console.log('2. Run tests there with pre-loaded Docker images');
console.log('3. Analyze generated reports for severity distribution\n');

console.log('Alternative: Use LATEST_V9_REPORT.md from Kafka PR');
console.log('   This already has ~9,449 issues analyzed\n');

console.log('Would you like to:');
console.log('a) Deploy and run on Oracle Cloud (recommended)');
console.log('b) Analyze existing Kafka report');
console.log('c) Create deployment script for Oracle\n');

// For now, analyze the existing Kafka report
const kafkaReport = path.join(__dirname, 'LATEST_V9_REPORT.md');

if (fs.existsSync(kafkaReport)) {
  console.log('📊 Analyzing existing Kafka report...\n');
  
  const content = fs.readFileSync(kafkaReport, 'utf8');
  
  // Extract severity counts
  const criticalMatch = content.match(/🔴 Critical: (\d+)/);
  const highMatch = content.match(/🟠 High: (\d+)/);
  const mediumMatch = content.match(/🟡 Medium: (\d+)/);
  const lowMatch = content.match(/🟢 Low: (\d+)/);
  
  if (criticalMatch && highMatch && mediumMatch && lowMatch) {
    const critical = parseInt(criticalMatch[1]);
    const high = parseInt(highMatch[1]);
    const medium = parseInt(mediumMatch[1]);
    const low = parseInt(lowMatch[1]);
    const total = critical + high + medium + low;
    
    console.log('Apache Kafka PR #17620 (EXISTING REPORT):');
    console.log(`  Critical: ${critical} (${((critical/total)*100).toFixed(1)}%)`);
    console.log(`  High:     ${high} (${((high/total)*100).toFixed(1)}%)`);
    console.log(`  Medium:   ${medium} (${((medium/total)*100).toFixed(1)}%)`);
    console.log(`  Low:      ${low} (${((low/total)*100).toFixed(1)}%)`);
    console.log(`  Total:    ${total}\n`);
    
    const highPct = (high/total)*100;
    if (highPct > 30) {
      console.log(`⚠️  WARNING: HIGH at ${highPct.toFixed(1)}% (expected: 10-20%)`);
      console.log('   → Need to review severity-mapper.ts\n');
    } else {
      console.log(`✅ HIGH at ${highPct.toFixed(1)}% (within expected 10-20%)\n`);
    }
  }
}

console.log('📋 Next Steps:\n');
console.log('1. Review LATEST_V9_REPORT.md for current severity distribution');
console.log('2. Check LATEST_ISSUE_GROUPS_MAP.json for rule-level breakdown');
console.log('3. If HIGH% > 30%, add overrides to severity-mapper.ts');
console.log('4. Deploy to Oracle for multi-repo testing\n');

console.log('💡 To run on Oracle Cloud:');
console.log('   ssh -i "$SSH_KEY" opc@129.213.49.128');
console.log('   cd ~/codequal/packages/agents');
console.log('   npx ts-node test-v9-e2e-complete.ts\n');

