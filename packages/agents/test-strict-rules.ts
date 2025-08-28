#!/usr/bin/env npx ts-node
/**
 * Test strict PR decision rules with various scenarios
 */

import { EnhancedPRCategorizer } from './src/standard/services/enhanced-pr-categorizer';
import { GitDiffAnalyzer } from './src/standard/services/git-diff-analyzer';

// Mock git diff analysis result
const mockDiffAnalysis = {
  modifiedFiles: ['src/api.ts', 'src/auth.ts'],
  modifiedRanges: [
    { file: 'src/api.ts', startLine: 10, endLine: 50, type: 'modified' as const },
    { file: 'src/auth.ts', startLine: 100, endLine: 150, type: 'modified' as const }
  ],
  addedFiles: ['src/new-feature.ts'],
  deletedFiles: [],
  totalChanges: 3
};

async function testStrictRules() {
  console.log('=== Testing Strict PR Decision Rules ===\n');
  
  const categorizer = new EnhancedPRCategorizer();
  
  // Test scenarios
  const scenarios = [
    {
      name: 'Scenario 1: PR with new CRITICAL issues',
      mainIssues: [],
      prIssues: [
        {
          title: 'SQL injection vulnerability',
          severity: 'critical',
          category: 'security',
          location: { file: 'src/api.ts', line: 25 }
        },
        {
          title: 'Minor style issue',
          severity: 'low',
          category: 'code-quality',
          location: { file: 'src/utils.ts', line: 10 }
        }
      ],
      expectedDecision: 'decline'
    },
    {
      name: 'Scenario 2: PR with new BREAKING CHANGES',
      mainIssues: [],
      prIssues: [
        {
          title: 'Breaking API change - removed required parameter',
          severity: 'high',
          category: 'breaking-change',
          location: { file: 'src/api.ts', line: 30 }
        }
      ],
      expectedDecision: 'decline'
    },
    {
      name: 'Scenario 3: PR with new DEPENDENCY VULNERABILITIES',
      mainIssues: [],
      prIssues: [
        {
          title: 'Critical dependency vulnerability - lodash CVE-2021-23337',
          severity: 'critical',
          category: 'dependency-vulnerability',
          location: { file: 'package.json', line: 15 }
        }
      ],
      expectedDecision: 'decline'
    },
    {
      name: 'Scenario 4: PR with new HIGH severity issues',
      mainIssues: [],
      prIssues: [
        {
          title: 'Data loss risk in new logic',
          severity: 'high',
          category: 'data-loss',
          location: { file: 'src/api.ts', line: 35 }
        }
      ],
      expectedDecision: 'decline'
    },
    {
      name: 'Scenario 5: PR modifies code with existing CRITICAL issues',
      mainIssues: [
        {
          title: 'Existing SQL injection',
          severity: 'critical',
          category: 'security',
          location: { file: 'src/auth.ts', line: 120 }
        }
      ],
      prIssues: [
        {
          title: 'Existing SQL injection',
          severity: 'critical',
          category: 'security',
          location: { file: 'src/auth.ts', line: 120 }
        }
      ],
      expectedDecision: 'decline'
    },
    {
      name: 'Scenario 6: PR with only MEDIUM/LOW issues in NEW code',
      mainIssues: [],
      prIssues: [
        {
          title: 'Missing error handling',
          severity: 'medium',
          category: 'error-handling',
          location: { file: 'src/api.ts', line: 20 }  // Changed to modified file
        },
        {
          title: 'Code style issue',
          severity: 'low',
          category: 'code-quality',
          location: { file: 'src/api.ts', line: 25 }  // Changed to modified file
        }
      ],
      expectedDecision: 'request-changes'
    },
    {
      name: 'Scenario 7: PR that fixes issues without introducing new ones',
      mainIssues: [
        {
          title: 'Security vulnerability',
          severity: 'high',
          category: 'security',
          location: { file: 'src/old.ts', line: 10 }
        }
      ],
      prIssues: [],
      expectedDecision: 'approve'
    }
  ];
  
  // Mock GitDiffAnalyzer methods
  const mockIsIssueInModified = (issue: any, isNew: boolean) => {
    const file = issue.location?.file;
    if (file === 'src/api.ts' || file === 'src/auth.ts') {
      return { isModified: true, confidence: 1.0, reason: 'File was modified' };
    }
    if (file === 'src/new-feature.ts') {
      return { isModified: true, confidence: 1.0, reason: 'New file added' };
    }
    if (file === 'package.json') {
      // Package.json is often modified in PRs
      return { isModified: true, confidence: 1.0, reason: 'Dependencies updated' };
    }
    return { isModified: false, confidence: 1.0, reason: 'File not modified' };
  };
  
  console.log('Testing decision logic with various scenarios:\n');
  console.log('=' .repeat(60));
  
  let passCount = 0;
  let failCount = 0;
  
  for (const scenario of scenarios) {
    console.log(`\n${scenario.name}`);
    console.log('-' .repeat(40));
    
    // Manually categorize based on mock diff
    const definitelyNew: any[] = [];
    const definitelyFixed: any[] = [];
    const preExistingInModifiedCode: any[] = [];
    const preExistingUntouched: any[] = [];
    
    // Process new issues (in PR but not in main)
    for (const prIssue of scenario.prIssues) {
      const isInMain = scenario.mainIssues.some(m => 
        m.title === prIssue.title && m.location?.file === prIssue.location?.file
      );
      
      if (!isInMain) {
        const diffResult = mockIsIssueInModified(prIssue, true);
        if (diffResult.isModified) {
          definitelyNew.push({ ...prIssue, diffAnalysis: diffResult });
        } else {
          preExistingUntouched.push({ ...prIssue, diffAnalysis: diffResult });
        }
      }
    }
    
    // Process unchanged issues
    for (const mainIssue of scenario.mainIssues) {
      const stillExists = scenario.prIssues.some(p => 
        p.title === mainIssue.title && p.location?.file === mainIssue.location?.file
      );
      
      if (stillExists) {
        const diffResult = mockIsIssueInModified(mainIssue, false);
        if (diffResult.isModified) {
          preExistingInModifiedCode.push({ ...mainIssue, diffAnalysis: diffResult });
        } else {
          preExistingUntouched.push({ ...mainIssue, diffAnalysis: diffResult });
        }
      } else {
        definitelyFixed.push(mainIssue);
      }
    }
    
    // Get the categorization result
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
    
    console.log(`  New issues: ${enhanced.definitelyNew.length}`);
    console.log(`  Fixed issues: ${enhanced.definitelyFixed.length}`);
    console.log(`  Pre-existing in modified: ${enhanced.preExistingInModifiedCode.length}`);
    console.log(`  Pre-existing untouched: ${enhanced.preExistingUntouched.length}`);
    
    console.log(`\n  Decision: ${enhanced.summary.recommendation.toUpperCase()}`);
    console.log(`  Expected: ${scenario.expectedDecision.toUpperCase()}`);
    
    const passed = enhanced.summary.recommendation === scenario.expectedDecision;
    console.log(`  Result: ${passed ? '✅ PASS' : '❌ FAIL'}`);
    
    if (!passed) {
      console.log('\n  Issue details:');
      if (enhanced.definitelyNew.length > 0) {
        console.log('    New issues:', enhanced.definitelyNew.map(i => 
          `${i.severity}/${i.category}`).join(', '));
      }
      if (enhanced.preExistingInModifiedCode.length > 0) {
        console.log('    Modified code issues:', enhanced.preExistingInModifiedCode.map(i => 
          `${i.severity}/${i.category}`).join(', '));
      }
    }
    
    if (passed) passCount++;
    else failCount++;
  }
  
  console.log('\n' + '=' .repeat(60));
  console.log('TEST SUMMARY');
  console.log('=' .repeat(60));
  console.log(`✅ Passed: ${passCount}/${scenarios.length}`);
  console.log(`❌ Failed: ${failCount}/${scenarios.length}`);
  
  if (failCount === 0) {
    console.log('\n🎉 All tests passed! Strict decision rules are working correctly.');
  } else {
    console.log('\n⚠️ Some tests failed. Review the decision logic.');
  }
}

// Run tests
testStrictRules().catch(console.error);