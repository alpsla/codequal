#!/usr/bin/env npx ts-node

/**
 * Universal Tools Validation Test
 * 
 * Tests both Semgrep and Dependency-Check universal runners
 * on repositories known to have issues.
 */

import { JavaToolOrchestrator } from './src/two-branch/tools/java/java-tool-orchestrator';
import { TypeScriptToolOrchestrator } from './src/two-branch/tools/typescript/typescript-tool-orchestrator';
import { execSync } from 'child_process';

async function testUniversalTools() {
  console.log('\n🧪 UNIVERSAL TOOLS VALIDATION TEST');
  console.log('═══════════════════════════════════════════════════════\n');
  
  // Test 1: TypeScript with Semgrep on CodeQual
  console.log('TEST #1: TypeScript Semgrep (CodeQual Repository)');
  console.log('─'.repeat(60));
  
  try {
    const tsOrchestrator = new TypeScriptToolOrchestrator();
    const tsResult = await tsOrchestrator.orchestrate('/home/opc/codequal', 'base', {
      analysisMode: 'standard' // Just semgrep, eslint, typescript, npm-audit
    });
    
    const semgrepResult = tsResult.toolResults.find(t => t.tool === 'semgrep');
    
    console.log(`✅ TypeScript test complete`);
    console.log(`   Semgrep issues: ${semgrepResult?.issues.length || 0}`);
    console.log(`   Duration: ${(semgrepResult?.duration || 0) / 1000}s`);
    
    if ((semgrepResult?.issues.length || 0) > 0) {
      console.log(`   ✅ PASS: Semgrep detected security issues!\n`);
    } else {
      console.log(`   ❌ FAIL: Semgrep found 0 issues (expected >0)\n`);
    }
    
  } catch (error: any) {
    console.log(`   ❌ ERROR: ${error.message}\n`);
  }
  
  // Test 2: Java with Semgrep + Dependency-Check on Spring PetClinic
  console.log('TEST #2: Java Semgrep + Dependency-Check (Spring PetClinic)');
  console.log('─'.repeat(60));
  
  try {
    // Clone Spring PetClinic if not exists
    const repoPath = '/tmp/spring-petclinic-test';
    
    if (!require('fs').existsSync(repoPath)) {
      console.log('   📦 Cloning Spring PetClinic...');
      execSync(`git clone --depth=1 https://github.com/spring-projects/spring-petclinic.git ${repoPath}`, {
        stdio: 'ignore'
      });
    }
    
    const javaOrchestrator = new JavaToolOrchestrator();
    const javaResult = await javaOrchestrator.orchestrate(repoPath, 'base', {
      analysisMode: 'standard' // semgrep + dependency-check + pmd
    });
    
    const javaSemgrep = javaResult.toolResults.find(t => t.tool === 'semgrep');
    const javaDepCheck = javaResult.toolResults.find(t => t.tool === 'dependency-check');
    
    console.log(`✅ Java test complete`);
    console.log(`   Semgrep issues: ${javaSemgrep?.issues.length || 0}`);
    console.log(`   Semgrep duration: ${((javaSemgrep?.duration || 0) / 1000).toFixed(1)}s`);
    console.log(`   Dependency-Check issues: ${javaDepCheck?.issues.length || 0}`);
    console.log(`   Dependency-Check duration: ${((javaDepCheck?.duration || 0) / 1000).toFixed(1)}s`);
    
    let passed = 0;
    let failed = 0;
    
    if ((javaSemgrep?.issues.length || 0) > 0) {
      console.log(`   ✅ PASS: Semgrep detected Java security issues!`);
      passed++;
    } else {
      console.log(`   ⚠️  WARN: Semgrep found 0 issues (might be clean repo)`);
    }
    
    if ((javaDepCheck?.issues.length || 0) > 0) {
      console.log(`   ✅ PASS: Dependency-Check detected CVE vulnerabilities!`);
      passed++;
    } else {
      console.log(`   ⚠️  WARN: Dependency-Check found 0 CVEs (might be up-to-date)`);
    }
    
    console.log(`\n   Tests passed: ${passed}/2\n`);
    
  } catch (error: any) {
    console.log(`   ❌ ERROR: ${error.message}\n`);
  }
  
  console.log('═══════════════════════════════════════════════════════');
  console.log('📊 UNIVERSAL TOOLS VALIDATION COMPLETE');
  console.log('═══════════════════════════════════════════════════════\n');
}

testUniversalTools().catch(console.error);

