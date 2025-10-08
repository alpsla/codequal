#!/usr/bin/env ts-node
/**
 * Quick test to verify Dependency-Check PostgreSQL fix
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.join(__dirname, '.env') });

import { JavaToolOrchestrator } from './src/two-branch/tools/java/java-tool-orchestrator';

const KAFKA_REPO = '/tmp/kafka-repo';

async function testDependencyCheckFix() {
  console.log('╔═══════════════════════════════════════════════════════════╗');
  console.log('║  Dependency-Check PostgreSQL Fix Verification            ║');
  console.log('╚═══════════════════════════════════════════════════════════╝\n');

  console.log('✅ PostgreSQL Setup:');
  console.log('   - Database: depcheck');
  console.log('   - User: depcheck_scanner');
  console.log('   - JDBC Driver: /tmp/jdbc-drivers/postgresql-42.7.1.jar\n');

  const orchestrator = new JavaToolOrchestrator({
    pmd: {
      enabled: false,
      minimumPriority: 2,
      rulesets: [],
      parallel: 1,
      threads: 1,
      memory: '1g'
    },
    semgrep: {
      enabled: false,
      rulesets: [],
      parallel: 1,
      smartSelection: false,
      memory: '1g'
    },
    checkstyle: {
      enabled: false,
      configFile: '',
      parallel: 1,
      memory: '1g',
      changedFilesOnly: false
    },
    spotbugs: {
      enabled: false,
      priority: 'high',
      effort: 'default',
      memory: '1g'
    },
    dependencyCheck: {
      enabled: true,
      failOnCVSS: 11,
      timeout: 300,  // 5 minutes should be enough for test
      postgres: {
        enabled: true,
        connectionString: 'jdbc:postgresql://localhost:5432/depcheck',
        dbUser: 'depcheck_scanner',
        dbPassword: 'postgres123',
        dbDriver: '/tmp/jdbc-drivers/postgresql-42.7.1.jar'
      },
      ossIndex: {
        enabled: !!(process.env.OSS_INDEX_USERNAME && process.env.OSS_INDEX_API_TOKEN),
        username: process.env.OSS_INDEX_USERNAME || '',
        apiToken: process.env.OSS_INDEX_API_TOKEN || ''
      }
    }
  });

  console.log('🔍 Running Dependency-Check on Apache Kafka...\n');
  const startTime = Date.now();

  try {
    const result = await orchestrator.orchestrate(KAFKA_REPO, 'pr');
    const duration = Math.round((Date.now() - startTime) / 1000);

    console.log(`\n✅ Dependency-Check completed successfully! (${duration}s)\n`);

    const depCheckResult = result.toolResults.find(t => t.tool === 'Dependency-Check');
    if (depCheckResult) {
      console.log('📊 Results:');
      console.log(`   - Issues Found: ${depCheckResult.issues.length}`);
      console.log(`   - Files Scanned: ${depCheckResult.metadata?.filesScanned || 0}`);
      console.log(`   - Duration: ${duration}s`);

      if (depCheckResult.issues.length > 0) {
        console.log('\n📋 Sample Issues:');
        depCheckResult.issues.slice(0, 3).forEach((issue, idx) => {
          console.log(`   ${idx + 1}. ${issue.message}`);
          console.log(`      File: ${issue.file}`);
          console.log(`      Severity: ${issue.severity}`);
        });
      }

      console.log('\n═══════════════════════════════════════════════════════════');
      console.log('✅ Dependency-Check PostgreSQL fix VERIFIED!');
      console.log('═══════════════════════════════════════════════════════════\n');
      process.exit(0);
    } else {
      console.error('❌ Dependency-Check did not run');
      process.exit(1);
    }
  } catch (error: any) {
    console.error(`\n❌ Dependency-Check failed: ${error.message}`);
    console.error(`\nStack trace:\n${error.stack}`);
    process.exit(1);
  }
}

testDependencyCheckFix().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
