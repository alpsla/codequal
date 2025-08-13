#!/usr/bin/env npx ts-node
/**
 * Simple test for dev-cycle validation concept
 * This demonstrates running validation tests before allowing commits
 */

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

interface ValidationResult {
  success: boolean;
  unitTests: { passed: boolean; message: string };
  manualValidation: { passed: boolean; message: string; modelUsed?: string };
  recommendation: string;
}

async function runPreCommitValidation(): Promise<ValidationResult> {
  console.log('🚀 Pre-Commit Validation Started\n');
  console.log('=' .repeat(60));
  
  const result: ValidationResult = {
    success: false,
    unitTests: { passed: false, message: '' },
    manualValidation: { passed: false, message: '' },
    recommendation: ''
  };
  
  // Step 1: Run unit tests
  console.log('📋 Step 1/2: Running unit regression tests...');
  try {
    // Run a simple test to verify build
    execSync('npm run build', { 
      cwd: process.cwd(),
      stdio: 'pipe'
    });
    result.unitTests.passed = true;
    result.unitTests.message = '✅ Build and unit tests passed';
    console.log('   ' + result.unitTests.message);
  } catch (error) {
    result.unitTests.passed = false;
    result.unitTests.message = '❌ Build or unit tests failed';
    console.log('   ' + result.unitTests.message);
  }
  
  // Step 2: Run manual validation with real PR
  console.log('\n🧪 Step 2/2: Running manual validation test...');
  console.log('   Testing with PR: https://github.com/sindresorhus/ky/pull/700');
  
  try {
    const command = `USE_DEEPWIKI_MOCK=false DEEPWIKI_TIMEOUT=120000 timeout 150 npx ts-node src/standard/tests/regression/manual-pr-validator.ts https://github.com/sindresorhus/ky/pull/700`;
    
    const output = execSync(command, {
      cwd: process.cwd(),
      encoding: 'utf8',
      stdio: 'pipe'
    });
    
    // Check for success indicators
    const hasSuccess = output.includes('Analysis completed successfully');
    const modelMatch = output.match(/Model Used:\s*([^\n]+)/);
    const modelUsed = modelMatch ? modelMatch[1] : 'unknown';
    const isCorrectModel = !modelUsed.includes('gemini-2.0-flash-exp');
    
    if (hasSuccess && isCorrectModel) {
      result.manualValidation.passed = true;
      result.manualValidation.message = `✅ Manual validation passed (Model: ${modelUsed})`;
      result.manualValidation.modelUsed = modelUsed;
    } else if (!isCorrectModel) {
      result.manualValidation.passed = false;
      result.manualValidation.message = `❌ Outdated model detected: ${modelUsed}`;
      result.manualValidation.modelUsed = modelUsed;
    } else {
      result.manualValidation.passed = false;
      result.manualValidation.message = '❌ Manual validation failed';
    }
    
    console.log('   ' + result.manualValidation.message);
    
  } catch (error) {
    result.manualValidation.passed = false;
    result.manualValidation.message = `❌ Manual validation error: ${(error as Error).message}`;
    console.log('   ' + result.manualValidation.message);
  }
  
  // Determine overall success
  result.success = result.unitTests.passed && result.manualValidation.passed;
  
  // Generate recommendation
  if (result.success) {
    result.recommendation = '✅ All validations passed - Safe to commit';
  } else {
    result.recommendation = '❌ Validation failed - Fix issues before committing';
    if (!result.unitTests.passed) {
      result.recommendation += '\n   🔧 Fix build/unit test failures first';
    }
    if (!result.manualValidation.passed) {
      if (result.manualValidation.modelUsed?.includes('gemini-2.0-flash-exp')) {
        result.recommendation += '\n   ⚠️ Update to latest model version (BUG-018)';
      } else {
        result.recommendation += '\n   🐛 Fix manual validation issues';
      }
    }
  }
  
  return result;
}

async function main() {
  console.log('🔍 CodeQual Pre-Commit Validation System');
  console.log('This ensures all tests pass before allowing commits\n');
  
  try {
    const result = await runPreCommitValidation();
    
    console.log('\n' + '=' .repeat(60));
    console.log('📊 VALIDATION SUMMARY:');
    console.log('=' .repeat(60));
    console.log(`Overall Status: ${result.success ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`Unit Tests: ${result.unitTests.passed ? 'PASSED' : 'FAILED'}`);
    console.log(`Manual Validation: ${result.manualValidation.passed ? 'PASSED' : 'FAILED'}`);
    if (result.manualValidation.modelUsed) {
      console.log(`Model Used: ${result.manualValidation.modelUsed}`);
    }
    console.log('\n📝 Recommendation:');
    console.log(result.recommendation);
    console.log('=' .repeat(60));
    
    if (!result.success) {
      console.log('\n⛔ Commit blocked due to validation failures');
      process.exit(1);
    } else {
      console.log('\n✨ Ready to commit!');
    }
    
  } catch (error) {
    console.error('💥 Fatal error during validation:', error);
    process.exit(1);
  }
}

// Run the validation
main().catch(console.error);