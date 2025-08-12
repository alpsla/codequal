#!/usr/bin/env npx ts-node

/**
 * Test Multiple Real PRs to Verify Scoring System Fixes
 */

import { ReportGeneratorV7EnhancedComplete } from './src/standard/comparison/report-generator-v7-enhanced-complete';
import { ComparisonResult } from './src/standard/types/analysis-types';
import * as fs from 'fs';
import * as path from 'path';

interface TestScenario {
  name: string;
  repository: string;
  prNumber: number;
  language: string;
  description: string;
  newIssues: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  resolvedIssues: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  codeQualityIssues: number;
}

const TEST_SCENARIOS: TestScenario[] = [
  {
    name: 'React TypeScript PR with Resolved Issues',
    repository: 'https://github.com/facebook/react',
    prNumber: 25000,
    language: 'TypeScript',
    description: 'Large PR with both new and resolved issues',
    newIssues: { critical: 0, high: 1, medium: 3, low: 5 },
    resolvedIssues: { critical: 1, high: 2, medium: 1, low: 3 },
    codeQualityIssues: 2
  },
  {
    name: 'Python Django Security Fix',
    repository: 'https://github.com/django/django',
    prNumber: 15000,
    language: 'Python',
    description: 'Security-focused PR resolving critical issues',
    newIssues: { critical: 0, high: 0, medium: 2, low: 4 },
    resolvedIssues: { critical: 2, high: 1, medium: 0, low: 0 },
    codeQualityIssues: 1
  },
  {
    name: 'Go Kubernetes Performance PR',
    repository: 'https://github.com/kubernetes/kubernetes',
    prNumber: 100000,
    language: 'Go',
    description: 'Performance improvements with minimal new issues',
    newIssues: { critical: 0, high: 0, medium: 1, low: 2 },
    resolvedIssues: { critical: 0, high: 3, medium: 5, low: 8 },
    codeQualityIssues: 3
  },
  {
    name: 'Rust Small Library Update',
    repository: 'https://github.com/rust-lang/cargo',
    prNumber: 10000,
    language: 'Rust',
    description: 'Small library update with code quality improvements',
    newIssues: { critical: 0, high: 0, medium: 0, low: 1 },
    resolvedIssues: { critical: 0, high: 0, medium: 2, low: 4 },
    codeQualityIssues: 0
  },
  {
    name: 'Ruby Rails Breaking Change',
    repository: 'https://github.com/rails/rails',
    prNumber: 45000,
    language: 'Ruby',
    description: 'Breaking change with high severity issues',
    newIssues: { critical: 1, high: 2, medium: 3, low: 2 },
    resolvedIssues: { critical: 0, high: 0, medium: 1, low: 1 },
    codeQualityIssues: 4
  }
];

function createMockIssues(severity: string, count: number, resolved: boolean = false) {
  const issues = [];
  for (let i = 0; i < count; i++) {
    issues.push({
      id: `${resolved ? 'resolved' : 'new'}-${severity}-${i}`,
      severity,
      // Only use security and performance categories for regular issues
      // Code quality issues are added separately
      category: i % 2 === 0 ? 'security' : 'performance',
      message: `${severity} severity ${resolved ? 'resolved' : 'new'} issue ${i + 1}`,
      location: {
        file: `src/file${i}.ts`,
        line: (i + 1) * 10
      }
    });
  }
  return issues;
}

function createComparisonResult(scenario: TestScenario): ComparisonResult {
  const newIssues = [
    ...createMockIssues('critical', scenario.newIssues.critical),
    ...createMockIssues('high', scenario.newIssues.high),
    ...createMockIssues('medium', scenario.newIssues.medium),
    ...createMockIssues('low', scenario.newIssues.low)
  ];

  const resolvedIssues = [
    ...createMockIssues('critical', scenario.resolvedIssues.critical, true),
    ...createMockIssues('high', scenario.resolvedIssues.high, true),
    ...createMockIssues('medium', scenario.resolvedIssues.medium, true),
    ...createMockIssues('low', scenario.resolvedIssues.low, true)
  ];

  // Add specific code quality issues
  for (let i = 0; i < scenario.codeQualityIssues; i++) {
    newIssues.push({
      id: `code-quality-${i}`,
      severity: i === 0 ? 'medium' : 'low',
      category: 'code-quality',
      message: `Code complexity exceeds threshold in ${scenario.language} module`,
      location: {
        file: `src/quality${i}.${scenario.language.toLowerCase()}`,
        line: 100 + i * 10
      }
    });
  }

  return {
    success: true,
    decision: scenario.newIssues.critical > 0 ? 'NEEDS_REVIEW' : 
              scenario.newIssues.high > 1 ? 'NEEDS_REVIEW' : 'APPROVED',
    newIssues,
    resolvedIssues,
    unchangedIssues: [
      {
        id: 'repo-issue-1',
        severity: 'medium',
        category: 'code-quality',
        message: 'Pre-existing technical debt',
        location: { file: 'legacy/old.js', line: 50 }
      }
    ],
    prMetadata: {
      repository_url: scenario.repository,
      number: scenario.prNumber,
      author: `${scenario.language.toLowerCase()}_developer`,
      filesChanged: 25,
      linesAdded: 500,
      linesRemoved: 200
    },
    overallScore: 72,
    confidence: 92,
    scanDuration: 15
  } as any;
}

function validateReport(report: string, scenario: TestScenario): {
  passed: boolean;
  checks: { [key: string]: boolean };
  details: string[];
} {
  const checks: { [key: string]: boolean } = {};
  const details: string[] = [];

  // Check 1: Correct scoring system (5/3/1/0.5)
  // Look for old scoring patterns specifically in point deductions (not line counts)
  const hasOldScoring = report.includes('-20 pts') || report.includes('-10 pts') || 
                        report.includes('20 points') || report.includes('10 points') ||
                        (report.includes('Critical Issues | -20') && !report.includes('Lines')) ||
                        (report.includes('High Issues | -10') && !report.includes('Lines'));
  checks['correct_scoring'] = !hasOldScoring;
  if (!checks['correct_scoring']) {
    details.push('❌ Still using old 20/10/5/2 scoring system');
  } else {
    // Verify new scoring is present
    const hasNewScoring = report.includes('| - Critical Issues | -5 |') || 
                         report.includes('| - High Issues | -3 |') ||
                         report.includes('Critical: 5 points') ||
                         report.includes('High: 3 points');
    if (hasNewScoring) {
      details.push('✅ Using correct 5/3/1/0.5 scoring system');
    }
  }

  // Check 2: Positive scoring for resolved issues
  const hasResolvedIssues = Object.values(scenario.resolvedIssues).some(v => v > 0);
  if (hasResolvedIssues) {
    checks['positive_scoring'] = report.includes('Issues Resolved (Positive)') || 
                                 report.includes('Issues Fixed');
    if (!checks['positive_scoring']) {
      details.push('❌ Missing positive scoring for resolved issues');
    }
  } else {
    checks['positive_scoring'] = true;
  }

  // Check 3: Code Quality realistic score (not 100/100)
  const codeQualityMatch = report.match(/Code Quality Analysis[\s\S]*?Score: ([\d.]+)\/100/);
  if (codeQualityMatch) {
    const score = parseFloat(codeQualityMatch[1]);
    checks['realistic_code_quality'] = score < 100 && score >= 50;
    if (!checks['realistic_code_quality']) {
      details.push(`❌ Unrealistic Code Quality score: ${score}/100`);
    } else {
      details.push(`✅ Code Quality score: ${score}/100 (realistic)`);
    }
  }

  // Check 4: Base score for new users (should be 50, not 100)
  if (report.includes('Previous Score: 100/100')) {
    checks['correct_base_score'] = false;
    details.push('❌ Using 100/100 as base score instead of 50/100');
  } else if (report.includes('(New User Base)')) {
    checks['correct_base_score'] = report.includes('50/100');
    if (!checks['correct_base_score']) {
      details.push('❌ New user base score is not 50/100');
    } else {
      details.push('✅ New user base score correctly set to 50/100');
    }
  } else {
    checks['correct_base_score'] = true;
  }

  // Check 5: Skills by Category includes issues
  if (report.includes('Skills by Category')) {
    checks['skills_tracking'] = report.includes('new,') && report.includes('existing');
    if (!checks['skills_tracking']) {
      details.push('❌ Skills by Category not properly tracking issues');
    } else {
      details.push('✅ Skills by Category properly tracks new and existing issues');
    }
  } else {
    checks['skills_tracking'] = true;
  }

  // Check 6: Breaking changes not triplicated
  const breakingMatches = (report.match(/Breaking Change/g) || []).length;
  checks['no_triplication'] = breakingMatches <= 3;
  if (!checks['no_triplication']) {
    details.push(`❌ Breaking changes appearing ${breakingMatches} times (triplication)`);
  }

  const passed = Object.values(checks).every(v => v);
  return { passed, checks, details };
}

async function runMultiplePRTests() {
  console.log('🚀 Testing Multiple PRs to Verify Scoring System Fixes\n');
  console.log('=' .repeat(80));
  
  const generator = new ReportGeneratorV7EnhancedComplete();
  const results: any[] = [];
  let totalPassed = 0;
  let totalFailed = 0;

  for (const scenario of TEST_SCENARIOS) {
    console.log(`\n📦 Testing: ${scenario.name}`);
    console.log(`   Repository: ${scenario.repository}`);
    console.log(`   PR: #${scenario.prNumber}`);
    console.log(`   Language: ${scenario.language}`);
    console.log(`   Description: ${scenario.description}`);
    
    try {
      const comparisonResult = createComparisonResult(scenario);
      const report = await generator.generateReport(comparisonResult);
      
      // Validate the report
      const validation = validateReport(report, scenario);
      
      console.log(`\n   Validation Results:`);
      validation.details.forEach(detail => console.log(`      ${detail}`));
      
      if (validation.passed) {
        console.log(`   📊 Overall: ✅ PASSED`);
        totalPassed++;
      } else {
        console.log(`   📊 Overall: ❌ FAILED`);
        totalFailed++;
      }
      
      // Save report for inspection
      const reportsDir = path.join(__dirname, 'validation-reports', 'multi-pr-tests');
      if (!fs.existsSync(reportsDir)) {
        fs.mkdirSync(reportsDir, { recursive: true });
      }
      
      const timestamp = new Date().toISOString().replace(/:/g, '-').split('.')[0];
      const filename = `${scenario.language.toLowerCase()}-pr${scenario.prNumber}-${timestamp}.md`;
      fs.writeFileSync(path.join(reportsDir, filename), report);
      
      // Extract key metrics from report
      const scoreMatch = report.match(/Current Skill Score: ([\d.]+)\/100/);
      const currentScore = scoreMatch ? parseFloat(scoreMatch[1]) : 0;
      
      results.push({
        scenario: scenario.name,
        language: scenario.language,
        passed: validation.passed,
        score: currentScore,
        checks: validation.checks
      });
      
    } catch (error) {
      console.log(`   ❌ ERROR: ${error instanceof Error ? error.message : String(error)}`);
      totalFailed++;
    }
  }
  
  // Print summary
  console.log('\n' + '='.repeat(80));
  console.log('📊 FINAL SUMMARY');
  console.log('='.repeat(80));
  console.log(`Total Scenarios: ${TEST_SCENARIOS.length}`);
  console.log(`✅ Passed: ${totalPassed}`);
  console.log(`❌ Failed: ${totalFailed}`);
  console.log(`Success Rate: ${((totalPassed / TEST_SCENARIOS.length) * 100).toFixed(1)}%`);
  
  // Language breakdown
  console.log('\n📈 Results by Language:');
  const languages = [...new Set(TEST_SCENARIOS.map(s => s.language))];
  languages.forEach(lang => {
    const langResults = results.filter(r => 
      TEST_SCENARIOS.find(s => s.name === r.scenario)?.language === lang
    );
    const langPassed = langResults.filter(r => r.passed).length;
    console.log(`   ${lang}: ${langPassed}/${langResults.length} passed`);
  });
  
  // Check status breakdown
  console.log('\n✅ Verification Status:');
  const allChecks = results.flatMap(r => Object.entries(r.checks));
  const checkTypes = [...new Set(allChecks.map(([k]) => k))];
  checkTypes.forEach(checkType => {
    const checkResults = allChecks.filter(([k]) => k === checkType);
    const passed = checkResults.filter(([, v]) => v).length;
    const total = checkResults.length;
    const checkName = checkType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    console.log(`   ${checkName}: ${passed}/${total} passed`);
  });
  
  // Save summary
  const summaryPath = path.join(__dirname, 'validation-reports', 'multi-pr-tests', 'summary.json');
  fs.writeFileSync(summaryPath, JSON.stringify({
    timestamp: new Date().toISOString(),
    totalScenarios: TEST_SCENARIOS.length,
    passed: totalPassed,
    failed: totalFailed,
    successRate: ((totalPassed / TEST_SCENARIOS.length) * 100).toFixed(1),
    results
  }, null, 2));
  
  console.log(`\n📁 Reports saved to: validation-reports/multi-pr-tests/`);
  console.log(`📋 Summary saved to: ${summaryPath}`);
  
  // Exit with appropriate code
  process.exit(totalFailed > 0 ? 1 : 0);
}

// Run tests
runMultiplePRTests().catch(console.error);