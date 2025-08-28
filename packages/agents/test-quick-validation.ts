#!/usr/bin/env ts-node

/**
 * Quick validation test for fix suggestion system
 * Tests just a few key issues to verify template and AI fallback work
 */

import { ReportGeneratorV8Final } from './src/standard/comparison/report-generator-v8-final';

// Test just 2 issues - one security (template) and one performance (AI fallback)
const testIssues = [
  {
    id: 'sec-001',
    severity: 'critical' as const,
    category: 'security' as const,
    type: 'vulnerability' as const,
    location: { file: 'src/auth/login.ts', line: 45 },
    title: 'SQL Injection Vulnerability',
    message: 'User input concatenated directly into SQL query',
    description: 'Direct string concatenation in database query',
    codeSnippet: `function getUserByEmail(email: string) {
  const query = "SELECT * FROM users WHERE email = '" + email + "'";
  return db.execute(query);
}`
  },
  {
    id: 'perf-001',
    severity: 'medium' as const,
    category: 'performance' as const,
    type: 'optimization' as const,
    location: { file: 'src/utils/processor.ts', line: 234 },
    title: 'Inefficient Array Operation',
    message: 'Multiple array iterations can be combined',
    description: 'Performance issue with array processing',
    codeSnippet: `function processData(items: any[]) {
  const filtered = items.filter(item => item.active);
  const mapped = filtered.map(item => item.value);
  const sorted = mapped.sort((a, b) => a - b);
  return sorted;
}`
  }
];

async function quickValidation() {
  console.log('🚀 Quick Fix Suggestion System Validation\n');
  
  const generator = new ReportGeneratorV8Final();
  
  const comparisonResult = {
    success: true,
    prIssues: testIssues,
    mainIssues: [],
    addedIssues: testIssues,
    fixedIssues: [],
    unchangedIssues: [],
    persistentIssues: [],
    newIssues: testIssues,
    resolvedIssues: [],
    changedIssues: []
  };

  try {
    console.log('🔄 Generating report with fix suggestions...\n');
    const report = await generator.generateReport(comparisonResult);
    
    // Quick analysis
    const hasTemplateFix = report.includes('OPTION A: Drop-in replacement') || 
                          report.includes('Template Applied');
    const hasAIFix = report.includes('ai-fallback') || 
                     report.includes('AI-generated fix');
    
    console.log('📊 Results:');
    console.log(`   ✅ Template fix for security issue: ${hasTemplateFix ? 'YES' : 'NO'}`);
    console.log(`   🤖 AI fallback for performance issue: ${hasAIFix ? 'YES' : 'NO'}`);
    
    // Show snippets if found
    if (hasTemplateFix) {
      console.log('\n📋 Template Fix Found:');
      const start = report.indexOf('OPTION A:');
      if (start > -1) {
        const snippet = report.substring(start, Math.min(start + 200, report.length));
        console.log('   ' + snippet.split('\n')[0]);
      }
    }
    
    if (hasAIFix) {
      console.log('\n🤖 AI Fallback Found:');
      const start = report.indexOf('processData');
      if (start > -1) {
        const snippet = report.substring(start, Math.min(start + 200, report.length));
        console.log('   ' + snippet.split('\n')[0]);
      }
    }
    
    // Save report for inspection
    const fs = require('fs');
    fs.writeFileSync('test-reports/quick-validation.md', report);
    console.log('\n📝 Full report saved to: test-reports/quick-validation.md');
    
    const success = hasTemplateFix && hasAIFix;
    console.log(`\n${success ? '✅' : '❌'} Validation ${success ? 'PASSED' : 'FAILED'}`);
    
    return success;
    
  } catch (error) {
    console.error('❌ Validation failed:', error);
    return false;
  }
}

quickValidation().then(success => {
  process.exit(success ? 0 : 1);
}).catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});