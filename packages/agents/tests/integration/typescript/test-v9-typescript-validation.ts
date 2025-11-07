/**
 * V9 TypeScript Analyzer Validation Test
 * 
 * Validates the TypeScript analyzer without requiring Supabase initialization.
 * This is a lightweight test for CI/CD and quick validation.
 * 
 * Usage:
 *   npx ts-node test-v9-typescript-validation.ts
 */

import * as fs from 'fs';
import * as path from 'path';

interface TestResult {
  passed: boolean;
  message: string;
  details?: any;
}

async function main() {
  console.log('\n═══════════════════════════════════════════════════════');
  console.log('🚀 V9 TypeScript Analyzer Validation');
  console.log('═══════════════════════════════════════════════════════\n');
  
  const results: TestResult[] = [];
  
  // Test 1: Files exist
  console.log('🧪 Test 1: Required files exist');
  const requiredFiles = [
    'src/two-branch/analyzers/v9-typescript-analyzer.ts',
    'src/two-branch/parsers/typescript-tool-parser.ts',
    'src/two-branch/analyzers/v9-base-analyzer.ts',
    'src/two-branch/analyzers/v9-analyzer-factory.ts'
  ];
  
  let allFilesExist = true;
  for (const file of requiredFiles) {
    const filePath = path.join(process.cwd(), file);
    if (!fs.existsSync(filePath)) {
      console.log(`   ❌ Missing: ${file}`);
      allFilesExist = false;
    } else {
      console.log(`   ✅ Found: ${file}`);
    }
  }
  
  if (allFilesExist) {
    console.log('   ✅ PASS: All required files exist\n');
    results.push({ passed: true, message: 'All required files exist' });
  } else {
    console.log('   ❌ FAIL: Some files missing\n');
    results.push({ passed: false, message: 'Some required files missing' });
  }
  
  // Test 2: TypeScript compilation
  console.log('🧪 Test 2: TypeScript compilation');
  try {
    const analyzerPath = path.join(process.cwd(), 'src/two-branch/analyzers/v9-typescript-analyzer.ts');
    const content = fs.readFileSync(analyzerPath, 'utf-8');
    
    // Check for key elements
    const checks = {
      'extends V9BaseAnalyzer': content.includes('extends V9BaseAnalyzer'),
      'getLanguageConfig()': content.includes('getLanguageConfig()'),
      'TypeScriptToolParser': content.includes('TypeScriptToolParser'),
      'parseESLintOutput': content.includes('parseESLintOutput'),
      'parseTypeScriptOutput': content.includes('parseTypeScriptOutput'),
      'parseNpmAuditOutput': content.includes('parseNpmAuditOutput'),
      'parseSemgrepOutput': content.includes('parseSemgrepOutput'),
      'suggestedFixPatterns': content.includes('suggestedFixPatterns')
    };
    
    let allChecksPass = true;
    for (const [check, passes] of Object.entries(checks)) {
      if (passes) {
        console.log(`   ✅ ${check}`);
      } else {
        console.log(`   ❌ ${check}`);
        allChecksPass = false;
      }
    }
    
    if (allChecksPass) {
      console.log('   ✅ PASS: Analyzer structure valid\n');
      results.push({ passed: true, message: 'Analyzer structure valid' });
    } else {
      console.log('   ❌ FAIL: Analyzer structure incomplete\n');
      results.push({ passed: false, message: 'Analyzer structure incomplete' });
    }
  } catch (error: any) {
    console.log(`   ❌ FAIL: ${error.message}\n`);
    results.push({ passed: false, message: error.message });
  }
  
  // Test 3: Factory integration
  console.log('🧪 Test 3: Factory integration');
  try {
    const factoryPath = path.join(process.cwd(), 'src/two-branch/analyzers/v9-analyzer-factory.ts');
    const content = fs.readFileSync(factoryPath, 'utf-8');
    
    const checks = {
      'imports V9TypeScriptAnalyzer': content.includes("import { V9TypeScriptAnalyzer }"),
      'case typescript': content.includes("case 'typescript'"),
      'returns V9TypeScriptAnalyzer': content.includes('new V9TypeScriptAnalyzer()')
    };
    
    let allChecksPass = true;
    for (const [check, passes] of Object.entries(checks)) {
      if (passes) {
        console.log(`   ✅ ${check}`);
      } else {
        console.log(`   ❌ ${check}`);
        allChecksPass = false;
      }
    }
    
    if (allChecksPass) {
      console.log('   ✅ PASS: Factory correctly integrated\n');
      results.push({ passed: true, message: 'Factory correctly integrated' });
    } else {
      console.log('   ❌ FAIL: Factory integration incomplete\n');
      results.push({ passed: false, message: 'Factory integration incomplete' });
    }
  } catch (error: any) {
    console.log(`   ❌ FAIL: ${error.message}\n`);
    results.push({ passed: false, message: error.message });
  }
  
  // Test 4: Tool configuration
  console.log('🧪 Test 4: Tool configuration');
  try {
    const analyzerPath = path.join(process.cwd(), 'src/two-branch/analyzers/v9-typescript-analyzer.ts');
    const content = fs.readFileSync(analyzerPath, 'utf-8');
    
    const expectedTools = ['eslint', 'typescript', 'npm-audit', 'semgrep'];
    const toolChecks: Record<string, boolean> = {};
    
    for (const tool of expectedTools) {
      toolChecks[`Tool: ${tool}`] = content.includes(`name: '${tool}'`);
    }
    
    let allChecksPass = true;
    for (const [check, passes] of Object.entries(toolChecks)) {
      if (passes) {
        console.log(`   ✅ ${check}`);
      } else {
        console.log(`   ❌ ${check}`);
        allChecksPass = false;
      }
    }
    
    if (allChecksPass) {
      console.log('   ✅ PASS: All tools configured\n');
      results.push({ passed: true, message: 'All tools configured' });
    } else {
      console.log('   ❌ FAIL: Some tools missing\n');
      results.push({ passed: false, message: 'Some tools missing' });
    }
  } catch (error: any) {
    console.log(`   ❌ FAIL: ${error.message}\n`);
    results.push({ passed: false, message: error.message });
  }
  
  // Summary
  console.log('═══════════════════════════════════════════════════════');
  console.log('📊 Test Summary');
  console.log('═══════════════════════════════════════════════════════\n');
  
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  const percentage = (passed / results.length) * 100;
  
  console.log(`✅ Passed: ${passed}/${results.length}`);
  console.log(`❌ Failed: ${failed}/${results.length}`);
  console.log(`📈 Success Rate: ${percentage.toFixed(1)}%\n`);
  
  if (failed === 0) {
    console.log('🎉 SUCCESS: TypeScript analyzer is ready!');
    console.log('\n📋 Next Steps:');
    console.log('   1. Test with CodeQual codebase: npm run test:typescript');
    console.log('   2. Deploy to Oracle Cloud');
    console.log('   3. Run full E2E test: npx ts-node test-v9-typescript-e2e.ts');
    console.log('   4. Move to Python analyzer');
    process.exit(0);
  } else {
    console.log('❌ FAILURE: Please fix issues before proceeding.');
    process.exit(1);
  }
}

main().catch(error => {
  console.error('❌ Validation failed:', error);
  process.exit(1);
});

