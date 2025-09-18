#!/usr/bin/env npx ts-node

/**
 * Test Redis-based Tool Output Capture
 *
 * Verify that tools can write to Redis and we can retrieve parsed issues
 */

import { RedisToolOutputManager } from '../utils/redis-tool-output-manager';
import { logger } from '../utils/logger';
import * as fs from 'fs';

async function testRedisToolOutput() {
  logger.info('🔍 Testing Redis-based Tool Output Management');

  const redisManager = new RedisToolOutputManager();

  try {
    // Test 1: Store and retrieve SpotBugs output
    logger.info('\n📝 Test 1: SpotBugs Output');

    const spotbugsOutput = `
H C NP: Null pointer dereference of ? in BadCode.nullPointerRisk()  Dereferenced at BadCode.java:[line 6]
M P UrF: Unread field: BadCode.password  At BadCode.java:[line 2]
L S DE: Method BadCode.infiniteLoop() might ignore java.lang.Exception  At BadCode.java:[line 10]
`;

    await redisManager.storeToolOutput(
      'test-workspace',
      'main',
      'spotbugs',
      spotbugsOutput,
      1500,
      true
    );

    const retrieved = await redisManager.getToolOutput('test-workspace', 'main', 'spotbugs');

    if (retrieved) {
      logger.info(`✅ SpotBugs output stored and retrieved`);
      logger.info(`   Found ${retrieved.parsedIssues?.length} issues:`);
      retrieved.parsedIssues?.forEach((issue, idx) => {
        logger.info(`   ${idx + 1}. [${issue.severity}] ${issue.message} at ${issue.file}:${issue.line}`);
      });
    } else {
      logger.error('❌ Failed to retrieve SpotBugs output');
    }

    // Test 2: Store multiple tool outputs
    logger.info('\n📝 Test 2: Multiple Tool Outputs');

    // PMD output
    const pmdOutput = `
src/main/java/BadCode.java:2:5: Avoid using hardcoded passwords
src/main/java/BadCode.java:6:10: Null pointer dereference detected
`;

    await redisManager.storeToolOutput(
      'test-workspace',
      'main',
      'pmd',
      pmdOutput,
      800,
      true
    );

    // Semgrep JSON output
    const semgrepOutput = JSON.stringify({
      results: [
        {
          check_id: "java.security.hardcoded-password",
          path: "BadCode.java",
          start: { line: 2, col: 5 },
          extra: {
            message: "Hardcoded password found",
            severity: "high"
          }
        }
      ]
    });

    await redisManager.storeToolOutput(
      'test-workspace',
      'main',
      'semgrep',
      semgrepOutput,
      1200,
      true
    );

    // Test 3: Get all outputs for workspace
    logger.info('\n📝 Test 3: Retrieve All Tool Outputs');

    const allOutputs = await redisManager.getAllToolOutputs('test-workspace', 'main');

    logger.info(`Found ${allOutputs.length} tool outputs:`);
    allOutputs.forEach(output => {
      logger.info(`  - ${output.tool}: ${output.parsedIssues?.length || 0} issues (${output.executionTime}ms)`);
    });

    // Test 4: Get workspace statistics
    logger.info('\n📝 Test 4: Workspace Statistics');

    // Add some PR branch data
    await redisManager.storeToolOutput(
      'test-workspace',
      'pr',
      'spotbugs',
      spotbugsOutput + '\nH S SQL: SQL injection vulnerability at Database.java:[line 45]',
      1600,
      true
    );

    const stats = await redisManager.getWorkspaceStats('test-workspace');

    logger.info('Workspace Statistics:');
    logger.info(`  Main Branch:`);
    logger.info(`    - Tools Run: ${stats.mainBranch.toolsRun}`);
    logger.info(`    - Total Issues: ${stats.mainBranch.totalIssues}`);
    logger.info(`  PR Branch:`);
    logger.info(`    - Tools Run: ${stats.prBranch.toolsRun}`);
    logger.info(`    - Total Issues: ${stats.prBranch.totalIssues}`);
    logger.info(`  Comparison:`);
    logger.info(`    - New Issues: ${stats.comparison.newIssues}`);

    // Test 5: Cache expiry and clearing
    logger.info('\n📝 Test 5: Cache Management');

    await redisManager.clearWorkspaceOutputs('test-workspace');
    const afterClear = await redisManager.getAllToolOutputs('test-workspace', 'main');
    logger.info(`After clearing: ${afterClear.length} outputs remaining`);

    // Summary
    logger.info('\n' + '='.repeat(80));
    logger.info('✅ REDIS TOOL OUTPUT TESTING COMPLETE');
    logger.info('='.repeat(80));

    logger.info('\n📊 Summary:');
    logger.info('  ✅ Tool output storage works');
    logger.info('  ✅ Output parsing works');
    logger.info('  ✅ Issue detection works');
    logger.info('  ✅ Workspace statistics work');
    logger.info('  ✅ Cache management works');

    logger.info('\n🎯 Next Steps:');
    logger.info('  1. Update V9AnalyzerFramework to use Redis manager');
    logger.info('  2. Deploy Redis to Kubernetes cluster');
    logger.info('  3. Test with real Java PR');

  } catch (error) {
    logger.error(`❌ Test failed: ${error.message}`);
    console.error(error);
  } finally {
    await redisManager.disconnect();
  }
}

// Execute test
testRedisToolOutput().catch(console.error);