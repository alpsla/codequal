/**
 * Multi-Framework Universal Architecture Test
 * 
 * Tests the complete universal V9 architecture:
 * 1. FrameworkDetector - Auto-detect framework
 * 2. UniversalToolConfigResolver - Get appropriate tools
 * 3. BaseToolOrchestrator + JavaToolOrchestrator - Execute tools
 * 
 * Tests 3 Java frameworks:
 * - Spring Boot (spring-petclinic)
 * - Quarkus (quarkus-quickstarts)
 * - Micronaut (micronaut-examples)
 */

import { FrameworkDetector, createFrameworkDetector } from './src/two-branch/utils/framework-detector';
import { UniversalToolConfigResolver, createToolConfigResolver } from './src/two-branch/config/universal-tool-config';
import { JavaToolOrchestrator } from './src/two-branch/tools/java/java-tool-orchestrator';
import { logger } from './src/two-branch/utils/logger';
import * as fs from 'fs/promises';
import * as path from 'path';

// ============================================================
// TEST CONFIGURATION
// ============================================================

interface TestRepo {
  name: string;
  url: string;
  localPath: string;
  expectedFramework: string;
  expectedBuildSystem: string;
}

const TEST_REPOS: TestRepo[] = [
  {
    name: 'Spring Boot (Petclinic)',
    url: 'https://github.com/spring-projects/spring-petclinic',
    localPath: '/tmp/test-spring-petclinic',
    expectedFramework: 'spring-boot',
    expectedBuildSystem: 'gradle'
  },
  {
    name: 'Quarkus (Quickstarts)',
    url: 'https://github.com/quarkusio/quarkus-quickstarts',
    localPath: '/tmp/test-quarkus',
    expectedFramework: 'quarkus',
    expectedBuildSystem: 'gradle'
  },
  {
    name: 'Micronaut (Examples)',
    url: 'https://github.com/micronaut-projects/micronaut-examples',
    localPath: '/tmp/test-micronaut',
    expectedFramework: 'micronaut',
    expectedBuildSystem: 'gradle'
  }
];

// ============================================================
// TEST FUNCTIONS
// ============================================================

/**
 * Test 1: Framework Detection
 */
async function testFrameworkDetection(repo: TestRepo): Promise<boolean> {
  console.log(`\n🔍 TEST 1: Framework Detection for ${repo.name}`);
  console.log(`   Repository: ${repo.localPath}`);
  
  try {
    const detector = createFrameworkDetector();
    const result = await detector.detectFrameworks(repo.localPath);
    
    console.log(`   ✅ Detected Framework: ${result.primaryFramework}`);
    console.log(`   ✅ Detected Language: ${result.language}`);
    console.log(`   ✅ Detected Build System: ${result.buildSystem}`);
    console.log(`   ✅ Confidence: ${result.confidence}%`);
    console.log(`   ✅ Detection Method: ${result.detectionMethod}`);
    console.log(`   ✅ Files Scanned: ${result.filesScanned.join(', ')}`);
    
    // Verify expectations
    const frameworkMatch = result.primaryFramework === repo.expectedFramework;
    const buildSystemMatch = result.buildSystem === repo.expectedBuildSystem;
    
    if (!frameworkMatch) {
      console.log(`   ❌ FAILED: Expected framework ${repo.expectedFramework}, got ${result.primaryFramework}`);
      return false;
    }
    
    if (!buildSystemMatch) {
      console.log(`   ⚠️  WARNING: Expected build system ${repo.expectedBuildSystem}, got ${result.buildSystem}`);
    }
    
    console.log(`   ✅ TEST 1 PASSED for ${repo.name}`);
    return true;
    
  } catch (error: any) {
    console.log(`   ❌ TEST 1 FAILED for ${repo.name}: ${error.message}`);
    return false;
  }
}

/**
 * Test 2: Tool Configuration Resolution
 */
async function testToolConfigResolution(repo: TestRepo): Promise<boolean> {
  console.log(`\n🔧 TEST 2: Tool Configuration for ${repo.name}`);
  
  try {
    const detector = createFrameworkDetector();
    const detectionResult = await detector.detectFrameworks(repo.localPath);
    
    const resolver = createToolConfigResolver();
    
    // Test all analysis modes
    const modes = ['critical-only', 'standard', 'thorough', 'complete'] as const;
    
    for (const mode of modes) {
      console.log(`\n   Testing mode: ${mode}`);
      
      const toolConfig = await resolver.getToolsFor({
        framework: detectionResult.primaryFramework as any,
        language: detectionResult.language,
        buildSystem: detectionResult.buildSystem,
        mode,
        branch: 'pr'
      });
      
      console.log(`   ✅ Tools: ${toolConfig.tools.join(', ')}`);
      console.log(`   ✅ Estimated Duration: ${Math.ceil(toolConfig.estimatedDuration / 1000)}s`);
      console.log(`   ✅ Tool Count: ${toolConfig.tools.length}`);
      
      if (toolConfig.recommendations.length > 0) {
        console.log(`   💡 Recommendations:`);
        toolConfig.recommendations.forEach(rec => {
          console.log(`      - ${rec}`);
        });
      }
      
      // Verify tools are appropriate
      if (mode === 'critical-only') {
        // Should have minimal tools
        if (toolConfig.tools.length > 2) {
          console.log(`   ⚠️  WARNING: critical-only mode has ${toolConfig.tools.length} tools (expected ≤2)`);
        }
      } else if (mode === 'complete') {
        // Should have all tools
        if (toolConfig.tools.length < 3) {
          console.log(`   ⚠️  WARNING: complete mode has only ${toolConfig.tools.length} tools (expected ≥3)`);
        }
      }
    }
    
    console.log(`\n   ✅ TEST 2 PASSED for ${repo.name}`);
    return true;
    
  } catch (error: any) {
    console.log(`   ❌ TEST 2 FAILED for ${repo.name}: ${error.message}`);
    return false;
  }
}

/**
 * Test 3: Tool Orchestration (Dry Run)
 */
async function testToolOrchestration(repo: TestRepo): Promise<boolean> {
  console.log(`\n⚙️  TEST 3: Tool Orchestration (Dry Run) for ${repo.name}`);
  
  try {
    const detector = createFrameworkDetector();
    const detectionResult = await detector.detectFrameworks(repo.localPath);
    
    const resolver = createToolConfigResolver();
    const toolConfig = await resolver.getToolsFor({
      framework: detectionResult.primaryFramework as any,
      mode: 'standard',
      branch: 'pr'
    });
    
    console.log(`   📦 Tools to orchestrate: ${toolConfig.tools.join(', ')}`);
    console.log(`   ⏱️  Estimated duration: ${Math.ceil(toolConfig.estimatedDuration / 1000)}s`);
    
    // Create orchestrator
    const orchestrator = new JavaToolOrchestrator();
    
    console.log(`   ✅ Orchestrator created successfully`);
    console.log(`   ✅ Language: ${(orchestrator as any).getLanguageName()}`);
    console.log(`   ✅ Docker image: ${(orchestrator as any).dockerImage}`);
    
    // Note: We don't actually run tools here (would take too long)
    // Just verify orchestrator can be created and configured
    
    console.log(`   ✅ TEST 3 PASSED for ${repo.name}`);
    return true;
    
  } catch (error: any) {
    console.log(`   ❌ TEST 3 FAILED for ${repo.name}: ${error.message}`);
    return false;
  }
}

/**
 * Test 4: Integration Test (All Components)
 */
async function testFullIntegration(repo: TestRepo): Promise<boolean> {
  console.log(`\n🚀 TEST 4: Full Integration for ${repo.name}`);
  
  try {
    // Step 1: Detect framework
    console.log(`   Step 1: Detecting framework...`);
    const detector = createFrameworkDetector();
    const framework = await detector.detectFrameworks(repo.localPath);
    console.log(`   ✅ Framework detected: ${framework.primaryFramework}`);
    
    // Step 2: Resolve tools
    console.log(`   Step 2: Resolving tools...`);
    const resolver = createToolConfigResolver();
    const tools = await resolver.getToolsFor({
      framework: framework.primaryFramework as any,
      mode: 'standard',
      branch: 'pr'
    });
    console.log(`   ✅ Tools resolved: ${tools.tools.join(', ')}`);
    
    // Step 3: Verify orchestrator
    console.log(`   Step 3: Verifying orchestrator...`);
    const orchestrator = new JavaToolOrchestrator();
    console.log(`   ✅ Orchestrator ready`);
    
    // Step 4: Summary
    console.log(`\n   📊 Integration Summary:`);
    console.log(`      Framework: ${framework.primaryFramework}`);
    console.log(`      Language: ${framework.language}`);
    console.log(`      Build System: ${framework.buildSystem}`);
    console.log(`      Tools: ${tools.tools.join(', ')}`);
    console.log(`      Estimated Time: ${Math.ceil(tools.estimatedDuration / 1000)}s`);
    
    console.log(`\n   ✅ TEST 4 PASSED for ${repo.name}`);
    return true;
    
  } catch (error: any) {
    console.log(`   ❌ TEST 4 FAILED for ${repo.name}: ${error.message}`);
    return false;
  }
}

// ============================================================
// MAIN TEST RUNNER
// ============================================================

async function main() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('  MULTI-FRAMEWORK UNIVERSAL ARCHITECTURE TEST');
  console.log('═══════════════════════════════════════════════════════════\n');
  console.log('Testing Universal V9 Architecture:');
  console.log('  1. FrameworkDetector - Auto-detect framework');
  console.log('  2. UniversalToolConfigResolver - Get appropriate tools');
  console.log('  3. BaseToolOrchestrator - Universal orchestration');
  console.log('  4. JavaToolOrchestrator - Java-specific implementation');
  console.log('\n═══════════════════════════════════════════════════════════\n');
  
  const results: Record<string, { passed: number; failed: number }> = {};
  
  for (const repo of TEST_REPOS) {
    console.log(`\n\n${'═'.repeat(60)}`);
    console.log(`  ${repo.name}`);
    console.log(`${'═'.repeat(60)}`);
    
    results[repo.name] = { passed: 0, failed: 0 };
    
    // Check if repository exists
    try {
      await fs.access(repo.localPath);
      console.log(`✅ Repository found: ${repo.localPath}`);
    } catch {
      console.log(`❌ Repository not found: ${repo.localPath}`);
      console.log(`   Please clone it first:`);
      console.log(`   git clone ${repo.url} ${repo.localPath}`);
      results[repo.name].failed = 4; // All tests failed
      continue;
    }
    
    // Run tests
    const tests = [
      testFrameworkDetection,
      testToolConfigResolution,
      testToolOrchestration,
      testFullIntegration
    ];
    
    for (const test of tests) {
      const passed = await test(repo);
      if (passed) {
        results[repo.name].passed++;
      } else {
        results[repo.name].failed++;
      }
    }
  }
  
  // Print summary
  console.log('\n\n' + '═'.repeat(60));
  console.log('  TEST SUMMARY');
  console.log('═'.repeat(60) + '\n');
  
  let totalPassed = 0;
  let totalFailed = 0;
  
  for (const [repoName, result] of Object.entries(results)) {
    const total = result.passed + result.failed;
    const icon = result.failed === 0 ? '✅' : '❌';
    console.log(`${icon} ${repoName}: ${result.passed}/${total} tests passed`);
    totalPassed += result.passed;
    totalFailed += result.failed;
  }
  
  const totalTests = totalPassed + totalFailed;
  const successRate = Math.round((totalPassed / totalTests) * 100);
  
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`  OVERALL: ${totalPassed}/${totalTests} tests passed (${successRate}%)`);
  console.log('═'.repeat(60) + '\n');
  
  if (totalFailed === 0) {
    console.log('🎉 ALL TESTS PASSED! Universal V9 architecture is working!');
    process.exit(0);
  } else {
    console.log(`⚠️  ${totalFailed} test(s) failed. Review errors above.`);
    process.exit(1);
  }
}

// Run tests
main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

