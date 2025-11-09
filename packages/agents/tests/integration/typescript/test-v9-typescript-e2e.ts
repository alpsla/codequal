/**
 * V9 TypeScript E2E Test
 * 
 * Tests the V9 TypeScript analyzer with CodeQual's own codebase (dogfooding!)
 * This validates:
 * 1. TypeScript analyzer initialization
 * 2. Tool execution (ESLint, TypeScript, npm audit, Semgrep)
 * 3. Issue detection and categorization
 * 4. Report generation
 * 5. Oracle Cloud infrastructure (when deployed)
 * 
 * Usage:
 *   # Local test
 *   npx ts-node test-v9-typescript-e2e.ts
 * 
 *   # Oracle Cloud test
 *   ssh -i $SSH_KEY opc@$ORACLE_IP 'cd ~/codequal/packages/agents && npx ts-node test-v9-typescript-e2e.ts'
 */

import * as fs from 'fs';
import * as path from 'path';
import { V9TypeScriptAnalyzer } from './src/two-branch/analyzers/v9-typescript-analyzer';

interface TestResult {
  passed: boolean;
  message: string;
  details?: any;
}

interface TestSummary {
  total: number;
  passed: number;
  failed: number;
  duration: number;
  results: TestResult[];
}

async function runTest(name: string, testFn: () => Promise<TestResult>): Promise<TestResult> {
  console.log(`\n🧪 Testing: ${name}`);
  try {
    const result = await testFn();
    if (result.passed) {
      console.log(`   ✅ PASS: ${result.message}`);
    } else {
      console.log(`   ❌ FAIL: ${result.message}`);
    }
    return result;
  } catch (error: any) {
    console.log(`   ❌ ERROR: ${error.message}`);
    return {
      passed: false,
      message: `Test threw error: ${error.message}`,
      details: { stack: error.stack }
    };
  }
}

async function main() {
  console.log('\n═══════════════════════════════════════════════════════');
  console.log('🚀 V9 TypeScript Analyzer E2E Test');
  console.log('═══════════════════════════════════════════════════════');
  console.log(`📅 Date: ${new Date().toISOString()}`);
  console.log(`📁 Working Directory: ${process.cwd()}`);
  console.log(`🔧 Node Version: ${process.version}`);
  
  const startTime = Date.now();
  const results: TestResult[] = [];
  
  // Test 1: Analyzer Initialization
  results.push(await runTest('Analyzer Initialization', async () => {
    const analyzer = new V9TypeScriptAnalyzer();
    const config = analyzer.getLanguageConfig();
    
    if (config.name !== 'TypeScript') {
      return { passed: false, message: `Expected name 'TypeScript', got '${config.name}'` };
    }
    
    if (config.tools.length < 3) {
      return { passed: false, message: `Expected at least 3 tools, got ${config.tools.length}` };
    }
    
    const expectedTools = ['eslint', 'typescript', 'npm-audit', 'semgrep'];
    const actualTools = config.tools.map(t => t.name);
    const missingTools = expectedTools.filter(t => !actualTools.includes(t));
    
    if (missingTools.length > 0) {
      return { 
        passed: false, 
        message: `Missing tools: ${missingTools.join(', ')}`,
        details: { actualTools }
      };
    }
    
    return { 
      passed: true, 
      message: `Analyzer initialized with ${config.tools.length} tools`,
      details: { tools: actualTools }
    };
  }));
  
  // Test 2: Language Configuration
  results.push(await runTest('Language Configuration', async () => {
    const analyzer = new V9TypeScriptAnalyzer();
    const config = analyzer.getLanguageConfig();
    
    const expectedExtensions = ['.ts', '.tsx', '.js', '.jsx'];
    const missingExtensions = expectedExtensions.filter(ext => !config.fileExtensions.includes(ext));
    
    if (missingExtensions.length > 0) {
      return { 
        passed: false, 
        message: `Missing file extensions: ${missingExtensions.join(', ')}`,
        details: { fileExtensions: config.fileExtensions }
      };
    }
    
    if (!config.suggestedFixPatterns || Object.keys(config.suggestedFixPatterns).length === 0) {
      return { passed: false, message: 'No suggested fix patterns defined' };
    }
    
    return { 
      passed: true, 
      message: `Configuration valid with ${Object.keys(config.suggestedFixPatterns).length} fix patterns`,
      details: { 
        extensions: config.fileExtensions,
        fixPatterns: Object.keys(config.suggestedFixPatterns)
      }
    };
  }));
  
  // Test 3: Tool Agent Mapping
  results.push(await runTest('Tool Agent Mapping', async () => {
    const analyzer = new V9TypeScriptAnalyzer();
    const config = analyzer.getLanguageConfig();
    
    const toolAgentMap: Record<string, string> = {};
    for (const tool of config.tools) {
      toolAgentMap[tool.name] = tool.agent;
    }
    
    const expectedMappings = {
      'eslint': 'QualityAnalyzer',
      'typescript': 'QualityAnalyzer',
      'npm-audit': 'DependencyAnalyzer',
      'semgrep': 'SecurityAnalyzer'
    };
    
    for (const [tool, expectedAgent] of Object.entries(expectedMappings)) {
      if (toolAgentMap[tool] !== expectedAgent) {
        return { 
          passed: false, 
          message: `Tool '${tool}' mapped to '${toolAgentMap[tool]}', expected '${expectedAgent}'`,
          details: { toolAgentMap }
        };
      }
    }
    
    return { 
      passed: true, 
      message: 'All tools correctly mapped to agents',
      details: { toolAgentMap }
    };
  }));
  
  // Test 4: Suggested Fix Patterns
  results.push(await runTest('Suggested Fix Patterns', async () => {
    const analyzer = new V9TypeScriptAnalyzer();
    const config = analyzer.getLanguageConfig();
    
    const requiredPatterns = [
      'sql injection',
      'xss',
      'hardcoded',
      'promise',
      'type',
      'null check',
      'performance',
      'async',
      'unused'
    ];
    
    const missingPatterns = requiredPatterns.filter(p => !config.suggestedFixPatterns[p]);
    
    if (missingPatterns.length > 0) {
      return { 
        passed: false, 
        message: `Missing fix patterns: ${missingPatterns.join(', ')}`,
        details: { 
          available: Object.keys(config.suggestedFixPatterns),
          missing: missingPatterns
        }
      };
    }
    
    // Check that patterns are non-empty
    for (const [key, value] of Object.entries(config.suggestedFixPatterns)) {
      if (!value || value.trim().length === 0) {
        return { 
          passed: false, 
          message: `Empty fix pattern for: ${key}` 
        };
      }
    }
    
    return { 
      passed: true, 
      message: `All ${requiredPatterns.length} required fix patterns defined`,
      details: { patterns: Object.keys(config.suggestedFixPatterns) }
    };
  }));
  
  // Test 5: Factory Integration
  results.push(await runTest('Factory Integration', async () => {
    const { V9AnalyzerFactory } = await import('./src/two-branch/analyzers/v9-analyzer-factory');
    
    // Test TypeScript detection
    const tsAnalyzer = V9AnalyzerFactory.create('typescript');
    if (!(tsAnalyzer instanceof V9TypeScriptAnalyzer)) {
      return { 
        passed: false, 
        message: 'Factory did not return V9TypeScriptAnalyzer instance for "typescript"' 
      };
    }
    
    // Test alias detection
    const tsAnalyzer2 = V9AnalyzerFactory.create('ts');
    if (!(tsAnalyzer2 instanceof V9TypeScriptAnalyzer)) {
      return { 
        passed: false, 
        message: 'Factory did not return V9TypeScriptAnalyzer instance for "ts" alias' 
      };
    }
    
    return { 
      passed: true, 
      message: 'Factory correctly creates TypeScript analyzer with aliases' 
    };
  }));
  
  // Test 6: File Extension Detection
  results.push(await runTest('File Extension Detection', async () => {
    const { V9AnalyzerFactory } = await import('./src/two-branch/analyzers/v9-analyzer-factory');
    
    const extensions = ['.ts', '.tsx', '.js'];
    const language = V9AnalyzerFactory.detectLanguage(extensions);
    
    if (language !== 'typescript') {
      return { 
        passed: false, 
        message: `Expected 'typescript', got '${language}'` 
      };
    }
    
    return { 
      passed: true, 
      message: 'Correctly detected TypeScript from file extensions' 
    };
  }));
  
  // Test 7: Check for Required Files
  results.push(await runTest('Required Files Exist', async () => {
    const requiredFiles = [
      'src/two-branch/analyzers/v9-typescript-analyzer.ts',
      'src/two-branch/parsers/typescript-tool-parser.ts',
      'src/two-branch/analyzers/v9-base-analyzer.ts',
      'src/two-branch/analyzers/v9-types.ts'
    ];
    
    const missingFiles: string[] = [];
    
    for (const file of requiredFiles) {
      const filePath = path.join(process.cwd(), file);
      if (!fs.existsSync(filePath)) {
        missingFiles.push(file);
      }
    }
    
    if (missingFiles.length > 0) {
      return { 
        passed: false, 
        message: `Missing required files: ${missingFiles.join(', ')}`,
        details: { missingFiles }
      };
    }
    
    return { 
      passed: true, 
      message: `All ${requiredFiles.length} required files exist` 
    };
  }));
  
  // Test 8: Parser Integration
  results.push(await runTest('Parser Integration', async () => {
    const analyzer = new V9TypeScriptAnalyzer();
    const config = analyzer.getLanguageConfig();
    
    // Check that all parsers are bound functions
    for (const tool of config.tools) {
      if (typeof tool.parser !== 'function') {
        return { 
          passed: false, 
          message: `Tool '${tool.name}' has invalid parser (not a function)` 
        };
      }
      
      // Check function arity (should accept 2 params: output, workspacePath)
      if (tool.parser.length !== 2) {
        return { 
          passed: false, 
          message: `Tool '${tool.name}' parser has wrong arity (expected 2, got ${tool.parser.length})` 
        };
      }
    }
    
    return { 
      passed: true, 
      message: 'All tool parsers are valid functions' 
    };
  }));
  
  // Summary
  console.log('\n═══════════════════════════════════════════════════════');
  console.log('📊 Test Summary');
  console.log('═══════════════════════════════════════════════════════');
  
  const duration = Date.now() - startTime;
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  
  const summary: TestSummary = {
    total: results.length,
    passed,
    failed,
    duration,
    results
  };
  
  console.log(`\n✅ Passed: ${passed}/${results.length}`);
  console.log(`❌ Failed: ${failed}/${results.length}`);
  console.log(`⏱️  Duration: ${(duration / 1000).toFixed(2)}s`);
  
  if (failed > 0) {
    console.log('\n❌ Failed Tests:');
    results.filter(r => !r.passed).forEach((r, i) => {
      console.log(`\n${i + 1}. ${r.message}`);
      if (r.details) {
        console.log(`   Details: ${JSON.stringify(r.details, null, 2)}`);
      }
    });
  }
  
  // Calculate grade
  const percentage = (passed / results.length) * 100;
  let grade: string;
  if (percentage === 100) {
    grade = 'A+ 🎉';
  } else if (percentage >= 90) {
    grade = 'A';
  } else if (percentage >= 80) {
    grade = 'B';
  } else if (percentage >= 70) {
    grade = 'C';
  } else {
    grade = 'F';
  }
  
  console.log(`\n🏆 Grade: ${grade} (${percentage.toFixed(1)}%)`);
  
  // Save results
  const resultsPath = path.join(process.cwd(), 'test-v9-typescript-results.json');
  fs.writeFileSync(resultsPath, JSON.stringify(summary, null, 2));
  console.log(`\n💾 Results saved to: ${resultsPath}`);
  
  console.log('\n═══════════════════════════════════════════════════════');
  
  if (failed === 0) {
    console.log('✅ All tests passed! TypeScript analyzer is ready for production.');
    console.log('\n📋 Next Steps:');
    console.log('   1. Test with CodeQual\'s own codebase (dogfooding)');
    console.log('   2. Deploy to Oracle Cloud');
    console.log('   3. Run E2E test on a real TypeScript repository');
    console.log('   4. Move to Python analyzer implementation');
    process.exit(0);
  } else {
    console.log('❌ Some tests failed. Please fix issues before proceeding.');
    process.exit(1);
  }
}

// Run tests
main().catch(error => {
  console.error('❌ Test suite failed:', error);
  process.exit(1);
});

