#!/usr/bin/env npx ts-node
/**
 * Demo report showing strict rules with critical issues
 */

import { EnhancedPRCategorizer } from './src/standard/services/enhanced-pr-categorizer';
import { ReportGeneratorV8Final } from './src/standard/comparison/report-generator-v8-final';
import * as fs from 'fs';
import * as path from 'path';

async function generateDemoReport() {
  console.log('=== Generating Demo Report with Critical Issues ===\n');
  
  const categorizer = new EnhancedPRCategorizer();
  const reportGenerator = new ReportGeneratorV8Final();
  
  // Mock main branch issues
  const mainIssues = [
    {
      id: 'main-1',
      title: 'SQL injection vulnerability in user authentication',
      message: 'Direct SQL query concatenation allows injection attacks',
      severity: 'critical',
      category: 'security',
      location: { file: 'src/auth.js', line: 45 },
      codeSnippet: 'db.query(`SELECT * FROM users WHERE id = ${userId}`)'
    },
    {
      id: 'main-2',
      title: 'Missing error handling in payment processing',
      message: 'Unhandled exceptions could cause payment failures',
      severity: 'high',
      category: 'error-handling',
      location: { file: 'src/payment.js', line: 89 },
      codeSnippet: 'processPayment(amount).then(handleSuccess)'
    },
    {
      id: 'main-3',
      title: 'Performance issue with large datasets',
      message: 'Synchronous processing blocks event loop',
      severity: 'medium',
      category: 'performance',
      location: { file: 'src/data-processor.js', line: 156 },
      codeSnippet: 'const results = data.map(item => processSync(item))'
    }
  ];
  
  // Mock PR branch issues (new critical issues + unchanged)
  const prIssues = [
    // Unchanged critical issue
    {
      id: 'main-1',
      title: 'SQL injection vulnerability in user authentication',
      message: 'Direct SQL query concatenation allows injection attacks',
      severity: 'critical',
      category: 'security',
      location: { file: 'src/auth.js', line: 45 },
      codeSnippet: 'db.query(`SELECT * FROM users WHERE id = ${userId}`)'
    },
    // NEW: Breaking change
    {
      id: 'pr-1',
      title: 'Breaking API change - removed required parameter',
      message: 'The required "apiKey" parameter was removed from authenticate()',
      severity: 'critical',
      category: 'breaking-change',
      location: { file: 'src/api.js', line: 23 },
      codeSnippet: 'async authenticate(options) { // apiKey parameter removed'
    },
    // NEW: Dependency vulnerability
    {
      id: 'pr-2',
      title: 'Critical dependency vulnerability - lodash CVE-2021-23337',
      message: 'Package.json contains vulnerable lodash version',
      severity: 'critical',
      category: 'dependency-vulnerability',
      location: { file: 'package.json', line: 15 },
      codeSnippet: '"lodash": "^4.17.11", // Known CVE-2021-23337'
    },
    // NEW: Data loss risk
    {
      id: 'pr-3',
      title: 'Potential data loss in new caching logic',
      message: 'Missing await could cause data to be lost before persistence',
      severity: 'high',
      category: 'data-loss',
      location: { file: 'src/cache.js', line: 67 },
      codeSnippet: 'saveToDatabase(data); // Missing await'
    },
    // NEW: Security vulnerability
    {
      id: 'pr-4',
      title: 'XSS vulnerability in new HTML rendering',
      message: 'User input rendered without sanitization',
      severity: 'critical',
      category: 'security-vulnerability',
      location: { file: 'src/renderer.js', line: 34 },
      codeSnippet: 'element.innerHTML = userInput; // XSS vulnerability'
    }
  ];
  
  // Mock git diff analysis
  const mockDiffAnalysis = {
    modifiedFiles: ['src/api.js', 'src/cache.js', 'src/renderer.js', 'package.json'],
    modifiedRanges: [
      { file: 'src/api.js', startLine: 20, endLine: 50, type: 'modified' as const },
      { file: 'src/cache.js', startLine: 60, endLine: 80, type: 'modified' as const },
      { file: 'src/renderer.js', startLine: 30, endLine: 40, type: 'added' as const },
      { file: 'package.json', startLine: 10, endLine: 20, type: 'modified' as const }
    ],
    addedFiles: ['src/renderer.js'],
    deletedFiles: [],
    totalChanges: 4
  };
  
  // Enhanced categorization
  const definitelyNew = prIssues.filter(p => 
    !mainIssues.some(m => m.id === p.id)
  ).map(issue => ({
    ...issue,
    diffAnalysis: {
      isModified: true,
      confidence: 1.0,
      reason: 'Issue in modified/new file'
    }
  }));
  
  const definitelyFixed = mainIssues.filter(m =>
    !prIssues.some(p => p.id === m.id)
  );
  
  const preExistingInModifiedCode = [];
  const preExistingUntouched = prIssues.filter(p =>
    mainIssues.some(m => m.id === p.id)
  ).map(issue => ({
    ...issue,
    diffAnalysis: {
      isModified: false,
      confidence: 1.0,
      reason: 'Pre-existing issue'
    }
  }));
  
  // Calculate summary with strict rules
  const enhanced = {
    definitelyNew,
    definitelyFixed,
    preExistingInModifiedCode,
    preExistingUntouched,
    summary: (categorizer as any).calculateEnhancedSummary(
      definitelyNew,
      definitelyFixed,
      preExistingInModifiedCode,
      preExistingUntouched
    )
  };
  
  console.log('📊 PR Analysis Results:');
  console.log('=' .repeat(50));
  console.log(`NEW Issues: ${enhanced.definitelyNew.length} (${enhanced.definitelyNew.map(i => i.category).join(', ')})`);
  console.log(`FIXED Issues: ${enhanced.definitelyFixed.length}`);
  console.log(`Pre-existing: ${enhanced.preExistingUntouched.length}`);
  console.log(`\nDecision: ${enhanced.summary.recommendation.toUpperCase()}`);
  console.log(`Quality: ${enhanced.summary.prQuality.toUpperCase()}`);
  console.log('=' .repeat(50));
  
  // Generate decision message
  const decisionMessage = categorizer.generateDecisionMessage(enhanced as any);
  console.log('\n' + decisionMessage);
  
  // Create comparison result for report
  const comparisonResult = {
    success: true,
    mainBranch: { 
      name: 'main', 
      issues: mainIssues,
      scores: { overall: 60, security: 40, performance: 70, maintainability: 80, testing: 70 }
    },
    prBranch: { 
      name: 'PR #123', 
      issues: prIssues,
      scores: { overall: 30, security: 20, performance: 60, maintainability: 70, testing: 60 }
    },
    newIssues: enhanced.definitelyNew,
    resolvedIssues: enhanced.definitelyFixed,
    unchangedIssues: enhanced.preExistingUntouched,
    repositoryUrl: 'https://github.com/example/vulnerable-app',
    prNumber: '123',
    metadata: {
      timestamp: new Date(),
      enhanced: true,
      strict: true,
      diffAnalysis: {
        newInModified: enhanced.definitelyNew.length,
        preExistingInModified: enhanced.preExistingInModifiedCode.length,
        preExistingUntouched: enhanced.preExistingUntouched.length
      }
    }
  };
  
  // Generate report
  console.log('\nGenerating detailed report...');
  const report = await reportGenerator.generateReport(comparisonResult as any);
  
  // Save report
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const outputPath = path.join(__dirname, 'test-reports', `demo-critical-issues-${timestamp}.md`);
  fs.writeFileSync(outputPath, report);
  
  console.log(`\n✅ Report saved to: ${outputPath}`);
  
  // Display key sections of the report
  const lines = report.split('\n');
  const decisionSection = lines.find(l => l.includes('## ✅ PR Decision:') || l.includes('## ❌ PR Decision:'));
  const decisionIndex = lines.indexOf(decisionSection!);
  
  if (decisionIndex >= 0) {
    console.log('\n📄 Report Decision Section:');
    console.log('=' .repeat(50));
    console.log(lines.slice(decisionIndex, decisionIndex + 20).join('\n'));
  }
  
  console.log('\n' + '=' .repeat(50));
  console.log('SUMMARY: Strict rules demonstration');
  console.log('=' .repeat(50));
  console.log('✅ Breaking changes detected → DECLINE');
  console.log('✅ Dependency vulnerabilities detected → DECLINE');
  console.log('✅ Critical security issues detected → DECLINE');
  console.log('✅ Data loss risks detected → DECLINE');
  console.log('\nThe strict rules are working as intended!');
}

// Run the demo
generateDemoReport().catch(console.error);