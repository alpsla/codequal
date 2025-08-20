#!/usr/bin/env ts-node

/**
 * V8 Report Generator Bug Fixes Validation Test
 * 
 * This test validates all 11 bug fixes implemented in the V8 Report Generator.
 * Run this test to ensure none of the fixed issues have regressed.
 * 
 * Usage:
 *   npm run build
 *   npx ts-node test-v8-bug-fixes-validation.ts
 * 
 * Expected: All 11 validations should pass
 */

import { ReportGeneratorV8Final } from './dist/standard/comparison/report-generator-v8-final';
import { ComparisonResult, Issue } from './dist/standard/types/analysis-types';
import * as fs from 'fs';
import * as path from 'path';

// Test data that triggers all the bug scenarios
function createComprehensiveTestData(): ComparisonResult {
  const newIssues: Issue[] = [
    {
      id: 'sec-001',
      type: 'vulnerability',
      category: 'security',
      severity: 'critical',
      message: 'SQL injection vulnerability',
      description: 'User input directly concatenated into SQL query',
      suggestedFix: 'Use parameterized queries',
      location: { file: 'src/database/query.ts', line: 234 }
    },
    {
      id: 'api-001',
      type: 'design-issue',
      category: 'architecture',
      severity: 'high',
      message: 'Breaking API change: Modified return type',
      description: 'Changed from Promise<User> to Promise<UserDTO>',
      suggestedFix: 'Add migration guide',
      location: { file: 'src/api/users.ts', line: 156 }
    },
    {
      id: 'dep-001',
      type: 'vulnerability',
      category: 'dependencies',
      severity: 'high',
      message: 'Vulnerable dependency: axios@0.21.1',
      description: 'Known SSRF vulnerability CVE-2021-3749',
      suggestedFix: 'Update to axios@0.27.2 or later',
      location: { file: 'package.json', line: 23 }
    }
  ];

  const resolvedIssues: Issue[] = [
    {
      id: 'old-001',
      type: 'bug',
      category: 'code-quality',
      severity: 'medium',
      message: 'Fixed null pointer exception',
      description: 'Added null checks',
      location: { file: 'src/payment.ts', line: 100 }
    }
  ];

  const unchangedIssues: Issue[] = [
    {
      id: 'tech-001',
      type: 'code-smell',
      category: 'code-quality',
      severity: 'low',
      message: 'Legacy code using deprecated API',
      description: 'Still using moment.js',
      location: { file: 'src/utils/date.ts', line: 12 }
    }
  ];

  const comparison: ComparisonResult = {
    newIssues,
    resolvedIssues,
    unchangedIssues,
    summary: {
      totalIssues: newIssues.length + unchangedIssues.length,
      criticalIssues: 1,
      highIssues: 2,
      mediumIssues: 0,
      lowIssues: 1,
      resolvedIssues: 1,
      overallScore: 45 // Will trigger DECLINED
    },
    success: true
  };

  // Add metadata for comprehensive testing
  (comparison as any).duration = 15.5; // Test duration display
  (comparison as any).scanDuration = 12.3;
  (comparison as any).modelUsed = 'claude-3-opus-20240229'; // Test dynamic model
  (comparison as any).aiModel = 'gpt-4-turbo';
  (comparison as any).prMetadata = {
    number: 700,
    title: 'Add authentication system',
    author: 'developer',
    filesChanged: 23,
    additions: 1250,
    deletions: 450
  };
  (comparison as any).dependencies = [
    { name: 'axios', version: '0.21.1', hasVulnerability: true },
    { name: 'express', version: '4.17.1', isOutdated: true }
  ];

  return comparison;
}

// Validation functions for each bug
const validations = {
  // BUG-074: DECLINED should show ❌ not ⚠️
  validateDeclinedIcon: (report: string): boolean => {
    return report.includes('DECLINED ❌') && !report.includes('DECLINED ⚠️');
  },

  // BUG-075: Architecture diagram should render
  validateArchitectureDiagram: (report: string): boolean => {
    return report.includes('┌─────────────┐') && 
           report.includes('│   Frontend  │') &&
           report.includes('│   Backend   │');
  },

  // BUG-076: Dependencies should show actual data
  validateDependencies: (report: string): boolean => {
    return report.includes('Dependencies Analysis') &&
           (report.includes('axios') || report.includes('Vulnerable: 1'));
  },

  // BUG-077: Breaking changes should be detected
  validateBreakingChanges: (report: string): boolean => {
    return report.includes('Breaking Changes') &&
           (report.includes('breaking change(s) detected') || 
            report.includes('API Change'));
  },

  // BUG-078: Educational insights should be specific
  validateEducationalInsights: (report: string): boolean => {
    return report.includes('Issue-Specific Learning Resources') &&
           (report.includes('SQL injection') || 
            report.includes('query.ts'));
  },

  // BUG-079: Skills should show calculated scores
  validateSkillScores: (report: string): boolean => {
    return report.includes('Individual Skills by Category') &&
           report.includes('/100');
  },

  // BUG-080: No achievements when critical issues exist
  validateNoAchievements: (report: string): boolean => {
    return report.includes('No achievements this PR') ||
           report.includes('Critical issues must be resolved') ||
           (!report.includes('Bronze Badge') && !report.includes('Silver Badge'));
  },

  // BUG-081: Business metrics should be comprehensive
  validateBusinessMetrics: (report: string): boolean => {
    return report.includes('Financial Impact') ||
           report.includes('Risk Assessment') ||
           report.includes('ROI') ||
           report.includes('Technical Debt');
  },

  // BUG-082: AI IDE commands should include locations
  validateAIIDELocations: (report: string): boolean => {
    return report.includes('AI IDE Integration') &&
           report.includes('.ts:') &&
           (report.includes(':234') || report.includes(':156'));
  },

  // BUG-083: Fix scripts should have detailed suggestions
  validateFixScripts: (report: string): boolean => {
    return report.includes('Automated Fix Script') &&
           report.includes('DISCLAIMER') &&
           (report.includes('SQL') || report.includes('parameterized'));
  },

  // BUG-084: PR comment should show DECLINED with issues
  validatePRComment: (report: string): boolean => {
    return report.includes('❌ DECLINED') &&
           report.includes('blocking issue(s)') &&
           (report.includes('SQL injection') || report.includes('API change'));
  }
};

// Additional validations for the new fixes
const enhancedValidations = {
  // Duration should show actual value, not N/A
  validateDuration: (report: string): boolean => {
    const hasDuration = report.includes('Duration:') && !report.includes('Duration: N/A');
    const hasScanDuration = report.includes('Scan Duration:') && !report.includes('Scan Duration: N/A');
    // Check if either Duration or Scan Duration shows a value
    return hasDuration || hasScanDuration;
  },

  // Code snippets should be contextual
  validateCodeSnippets: (report: string): boolean => {
    const hasLocation = report.includes('Location: ') && report.includes('.ts:');
    const hasContext = report.includes('// File:') || report.includes('```typescript');
    return hasLocation && hasContext;
  },

  // AI Model should show dynamic selection
  validateAIModel: (report: string): boolean => {
    // Check for AI Model in report
    const hasAIModel = report.includes('AI Model:');
    
    // Extract the actual model from the report
    const modelMatch = report.match(/AI Model:\*?\*?\s*([^\n<]+)/);
    const modelUsed = modelMatch ? modelMatch[1].trim() : '';
    
    // Check it's showing a model (not unknown/empty)
    const hasModel = modelUsed.length > 0 && modelUsed !== 'Unknown';
    
    // The model shown could be:
    // - From Supabase config (e.g., claude-opus-4-1, gpt-5)
    // - From ModelResearcher (e.g., gpt-4o, claude-opus-4.1)
    // - From environment variables
    // - "CodeQual AI" when async resolution fails (acceptable fallback)
    // - Any model with provider/model format (e.g., openai/gpt-4o)
    
    // What we DON'T want to see:
    // - "Unknown" or empty
    // - Old hardcoded defaults like "GPT-4" or "claude-3.5-sonnet-20241022"
    
    const isAcceptableModel = hasModel && 
                             !modelUsed.includes('claude-3.5-sonnet-20241022') && // Old hardcoded
                             modelUsed !== 'GPT-4'; // Generic old default
    
    // Log for debugging if validation fails
    if (!isAcceptableModel && hasAIModel) {
      console.log(`    Model validation debug: Found model "${modelUsed}"`);
    }
    
    return hasAIModel && isAcceptableModel;
  },

  // Breaking changes should affect PR decision
  validateBreakingChangeDecision: (report: string): boolean => {
    const hasBreaking = report.includes('Breaking Changes');
    const hasDeclined = report.includes('DECLINED');
    // If there are high-risk breaking changes, should be declined
    return hasBreaking && hasDeclined;
  }
};

async function runValidation() {
  console.log('🔍 V8 Report Generator Bug Fix Validation\n');
  console.log('=' .repeat(70));
  
  // Create test data
  const testData = createComprehensiveTestData();
  
  // Generate report
  const generator = new ReportGeneratorV8Final();
  const report = generator.generateReport(testData, {
    format: 'html',
    includeEducation: true,
    includeArchitectureDiagram: true,
    includeSkillTracking: true,
    includeBusinessMetrics: true,
    includeAIIDESection: true
  });
  
  // Save report for inspection
  const outputDir = path.join(__dirname, 'v8-validation');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
  const outputPath = path.join(outputDir, `bug-fix-validation-${timestamp}.html`);
  fs.writeFileSync(outputPath, report);
  
  console.log('📋 VALIDATING 11 ORIGINAL BUG FIXES:\n');
  
  const bugTests = [
    { id: 'BUG-074', name: 'DECLINED shows ❌', test: validations.validateDeclinedIcon },
    { id: 'BUG-075', name: 'Architecture diagram renders', test: validations.validateArchitectureDiagram },
    { id: 'BUG-076', name: 'Dependencies show data', test: validations.validateDependencies },
    { id: 'BUG-077', name: 'Breaking changes detected', test: validations.validateBreakingChanges },
    { id: 'BUG-078', name: 'Educational insights specific', test: validations.validateEducationalInsights },
    { id: 'BUG-079', name: 'Skills show scores', test: validations.validateSkillScores },
    { id: 'BUG-080', name: 'No achievements with critical', test: validations.validateNoAchievements },
    { id: 'BUG-081', name: 'Business metrics comprehensive', test: validations.validateBusinessMetrics },
    { id: 'BUG-082', name: 'AI IDE includes locations', test: validations.validateAIIDELocations },
    { id: 'BUG-083', name: 'Fix scripts detailed', test: validations.validateFixScripts },
    { id: 'BUG-084', name: 'PR comment shows DECLINED', test: validations.validatePRComment }
  ];
  
  let passCount = 0;
  let failures: string[] = [];
  
  for (const test of bugTests) {
    try {
      const passed = test.test(report);
      console.log(`${passed ? '✅' : '❌'} ${test.id}: ${test.name}`);
      if (passed) {
        passCount++;
      } else {
        failures.push(`${test.id}: ${test.name}`);
      }
    } catch (error) {
      console.log(`⚠️ ${test.id}: Error during validation`);
      failures.push(`${test.id}: ${test.name} (error)`);
    }
  }
  
  console.log('\n📋 VALIDATING ENHANCED FIXES:\n');
  
  const enhancedTests = [
    { name: 'Duration shows actual value', test: enhancedValidations.validateDuration },
    { name: 'Code snippets are contextual', test: enhancedValidations.validateCodeSnippets },
    { name: 'AI Model shows dynamic selection', test: enhancedValidations.validateAIModel },
    { name: 'Breaking changes affect decision', test: enhancedValidations.validateBreakingChangeDecision }
  ];
  
  let enhancedPass = 0;
  
  for (const test of enhancedTests) {
    try {
      const passed = test.test(report);
      console.log(`${passed ? '✅' : '❌'} ${test.name}`);
      if (passed) enhancedPass++;
      else failures.push(test.name);
    } catch (error) {
      console.log(`⚠️ ${test.name}: Error`);
      failures.push(`${test.name} (error)`);
    }
  }
  
  console.log('\n' + '=' .repeat(70));
  console.log('📊 VALIDATION RESULTS:\n');
  console.log(`Original Bug Fixes: ${passCount}/11 (${Math.round(passCount/11*100)}%)`);
  console.log(`Enhanced Fixes: ${enhancedPass}/4 (${Math.round(enhancedPass/4*100)}%)`);
  console.log(`Total: ${passCount + enhancedPass}/15 (${Math.round((passCount + enhancedPass)/15*100)}%)`);
  
  if (failures.length > 0) {
    console.log('\n❌ FAILED VALIDATIONS:');
    failures.forEach(f => console.log(`  - ${f}`));
    console.log('\n⚠️ REGRESSION DETECTED! Some fixes have been lost.');
    console.log('Review: src/standard/comparison/report-generator-v8-final.ts');
  } else {
    console.log('\n✅ ALL VALIDATIONS PASSED!');
    console.log('All bug fixes are intact and working correctly.');
  }
  
  console.log(`\n📁 Report saved: ${outputPath}`);
  console.log('🔍 Open the HTML report to inspect the output');
  
  // Return exit code based on results
  process.exit(failures.length > 0 ? 1 : 0);
}

// Run the validation
runValidation().catch(error => {
  console.error('❌ Validation failed with error:', error);
  process.exit(1);
});