/**
 * Test LSP and SARIF Format Generation
 * 
 * Validates that CodeQual can generate IDE-compatible fix formats
 */

import { LSPSARIFConverter } from '../../../src/two-branch/analyzers/lsp-sarif-converter';
import type { EnrichedIssue } from '../../../src/two-branch/analyzers/v9-grouped-report-formatter';
import type { IssueGroup } from '../../../src/two-branch/utils/issue-grouping';

// Sample test data
const sampleIssues: EnrichedIssue[] = [
  {
    file: 'src/test.ts',
    line: 10,
    column: 5,
    rule: 'javascript.lang.security.detect-child-process.detect-child-process',
    tool: 'semgrep',
    severity: 'high',
    message: 'Detected use of child_process.exec() which may lead to command injection',
    category: 'NEW',
    detectedCategory: 'Security',
    snippet: `const { exec } = require('child_process');\nexec(userInput);`,
    fixSuggestion: {
      fix: 'Use child_process.execFile() instead',
      correctedCode: `const { execFile } = require('child_process');\nexecFile('command', [userInput]);`,
      explanation: 'execFile() is safer as it does not spawn a shell and prevents command injection',
      issueDescription: {
        what: 'Command injection vulnerability',
        why: 'exec() spawns a shell which interprets special characters',
        causes: ['User input passed directly to exec()', 'No input sanitization'],
        impact: 'Attacker can execute arbitrary commands on the server'
      },
      bestPractices: ['Use execFile() instead of exec()', 'Validate and sanitize all user input']
    }
  },
  {
    file: 'src/another.ts',
    line: 25,
    column: 10,
    rule: 'typescript.lang.correctness.no-implicit-any.no-implicit-any',
    tool: 'typescript',
    severity: 'medium',
    message: 'Variable has implicit any type',
    category: 'NEW',
    detectedCategory: 'Code Quality',
    snippet: `let data;`,
    fixSuggestion: {
      fix: 'Add explicit type annotation',
      correctedCode: `let data: any;`,
      explanation: 'Explicit types improve code clarity and catch errors at compile time'
    }
  }
];

const sampleGroups: IssueGroup[] = [
  {
    rule: 'javascript.lang.security.detect-child-process.detect-child-process',
    tool: 'semgrep',
    severity: 'high',
    count: 1,
    description: 'Detected use of child_process.exec()',
    category: 'Security'
  },
  {
    rule: 'typescript.lang.correctness.no-implicit-any.no-implicit-any',
    tool: 'typescript',
    severity: 'medium',
    count: 1,
    description: 'Variable has implicit any type',
    category: 'Code Quality'
  }
];

async function testLSPGeneration() {
  console.log('🧪 Testing LSP Code Actions Generation...\n');
  
  const converter = new LSPSARIFConverter();
  const workspaceRoot = '/Users/alpinro/Code Prjects/codequal';
  
  const lspActions = converter.generateLSPCodeActions(sampleIssues, workspaceRoot);
  
  console.log(`✅ Generated ${lspActions.length} LSP Code Actions\n`);
  
  // Validate structure
  for (const action of lspActions) {
    console.log(`📋 Action: ${action.title}`);
    console.log(`   Kind: ${action.kind}`);
    console.log(`   Diagnostics: ${action.diagnostics?.length || 0}`);
    console.log(`   File changes: ${Object.keys(action.edit.changes).length}`);
    
    // Validate required fields
    if (!action.title) throw new Error('Missing title');
    if (!action.kind) throw new Error('Missing kind');
    if (!action.edit) throw new Error('Missing edit');
    if (!action.edit.changes) throw new Error('Missing changes');
    
    console.log(`   ✅ Structure valid\n`);
  }
  
  // Show sample action
  console.log('📄 Sample LSP Code Action:');
  console.log(JSON.stringify(lspActions[0], null, 2));
  console.log('\n');
  
  return lspActions;
}

async function testSARIFGeneration() {
  console.log('🧪 Testing SARIF Report Generation...\n');
  
  const converter = new LSPSARIFConverter();
  
  const sarifReport = converter.generateSARIFReport(sampleIssues, sampleGroups, {
    repository: 'alpsla/codequal',
    version: '9.0.0',
    analyzedAt: new Date().toISOString()
  });
  
  console.log(`✅ Generated SARIF ${sarifReport.version} report\n`);
  
  // Validate structure
  if (sarifReport.version !== '2.1.0') throw new Error('Wrong SARIF version');
  if (!sarifReport.$schema) throw new Error('Missing schema');
  if (!sarifReport.runs || sarifReport.runs.length === 0) throw new Error('No runs');
  
  const run = sarifReport.runs[0];
  
  console.log(`📋 Tool: ${run.tool.driver.name} v${run.tool.driver.version}`);
  console.log(`   Rules: ${run.tool.driver.rules.length}`);
  console.log(`   Results: ${run.results.length}`);
  
  // Validate results have fixes
  const resultsWithFixes = run.results.filter(r => r.fixes && r.fixes.length > 0);
  console.log(`   Results with fixes: ${resultsWithFixes.length}`);
  console.log(`   ✅ Structure valid\n`);
  
  // Show sample result
  console.log('📄 Sample SARIF Result:');
  console.log(JSON.stringify(run.results[0], null, 2));
  console.log('\n');
  
  return sarifReport;
}

async function testCursorCompatibility(lspActions: any[]) {
  console.log('🧪 Testing Cursor IDE Compatibility...\n');
  
  // Check if LSP actions have the required fields for Cursor
  const requiredFields = ['title', 'kind', 'edit'];
  const requiredEditFields = ['changes'];
  
  for (const action of lspActions) {
    for (const field of requiredFields) {
      if (!(field in action)) {
        throw new Error(`Missing required field: ${field}`);
      }
    }
    
    for (const field of requiredEditFields) {
      if (!(field in action.edit)) {
        throw new Error(`Missing required edit field: ${field}`);
      }
    }
    
    // Validate file URIs
    for (const uri of Object.keys(action.edit.changes)) {
      if (!uri.startsWith('file://')) {
        throw new Error(`Invalid file URI: ${uri}`);
      }
    }
    
    // Validate text edits
    for (const edits of Object.values(action.edit.changes) as any[]) {
      for (const edit of edits) {
        if (!edit.range || !edit.newText === undefined) {
          throw new Error('Invalid text edit structure');
        }
        if (typeof edit.range.start.line !== 'number') {
          throw new Error('Invalid line number');
        }
        if (typeof edit.range.start.character !== 'number') {
          throw new Error('Invalid character position');
        }
      }
    }
  }
  
  console.log('✅ All LSP actions are Cursor-compatible\n');
}

async function main() {
  try {
    console.log('═══════════════════════════════════════════════════════════════\n');
    console.log('       LSP & SARIF Format Generation Test\n');
    console.log('═══════════════════════════════════════════════════════════════\n');
    
    const lspActions = await testLSPGeneration();
    const sarifReport = await testSARIFGeneration();
    await testCursorCompatibility(lspActions);
    
    console.log('═══════════════════════════════════════════════════════════════\n');
    console.log('✅ ALL TESTS PASSED\n');
    console.log('═══════════════════════════════════════════════════════════════\n');
    
    console.log('📋 Summary:');
    console.log(`   LSP Code Actions: ${lspActions.length}`);
    console.log(`   SARIF Results: ${sarifReport.runs[0].results.length}`);
    console.log(`   SARIF Rules: ${sarifReport.runs[0].tool.driver.rules.length}`);
    console.log('\n');
    
    console.log('🎯 Next Steps:');
    console.log('   1. Run E2E test to generate actual LSP/SARIF files');
    console.log('   2. Load LSP file in Cursor and verify Quick Fix menu appears');
    console.log('   3. Import SARIF file in VSCode/IntelliJ to verify compatibility');
    console.log('\n');
    
  } catch (error) {
    console.error('❌ TEST FAILED:', error);
    process.exit(1);
  }
}

main();

