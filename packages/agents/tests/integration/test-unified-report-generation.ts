/**
 * Test Unified Report Generation
 *
 * Validates the new unified report system works correctly with:
 * 1. Mock data (basic validation)
 * 2. Real V9 analysis results
 * 3. Both BASIC and PRO tier reports
 */

import { generateUnifiedReportSync } from '../../src/two-branch/report/unified-report-generator';
import type {
  V9AnalysisResultInput,
  FixOrchestrationResultInput,
  AnalyzedIssue,
  UnifiedReport,
} from '../../src/two-branch/report/unified-report-types';

// ============================================================================
// TEST DATA
// ============================================================================

function createMockAnalysis(overrides?: Partial<V9AnalysisResultInput>): V9AnalysisResultInput {
  const mockIssues: AnalyzedIssue[] = [
    {
      id: 'issue-001',
      ruleId: 'sql-injection',
      tool: 'semgrep',
      file: 'src/db/queries.ts',
      line: 45,
      message: 'SQL injection vulnerability detected',
      category: 'security',
      severity: 'critical',
      status: 'new',
      codeSnippet: 'const query = `SELECT * FROM users WHERE id = ${userId}`;',
      language: 'typescript',
    },
    {
      id: 'issue-002',
      ruleId: 'xss-vulnerability',
      tool: 'semgrep',
      file: 'src/components/UserProfile.tsx',
      line: 23,
      message: 'Cross-site scripting vulnerability',
      category: 'security',
      severity: 'high',
      status: 'new',
      codeSnippet: '<div dangerouslySetInnerHTML={{__html: userInput}} />',
      language: 'typescript',
    },
    {
      id: 'issue-003',
      ruleId: 'no-unused-vars',
      tool: 'eslint',
      file: 'src/utils/helpers.ts',
      line: 12,
      message: 'Variable is defined but never used',
      category: 'code_quality',
      severity: 'low',
      status: 'existing_modified',
    },
    {
      id: 'issue-004',
      ruleId: 'complexity',
      tool: 'eslint',
      file: 'src/services/auth.ts',
      line: 78,
      message: 'Function has too many branches',
      category: 'code_quality',
      severity: 'medium',
      status: 'existing_rest',
    },
    {
      id: 'issue-005',
      ruleId: 'n-plus-one',
      tool: 'custom',
      file: 'src/api/users.ts',
      line: 34,
      message: 'N+1 query detected in loop',
      category: 'performance',
      severity: 'high',
      status: 'new',
    },
  ];

  return {
    id: 'analysis-test-001',
    repositoryUrl: 'https://github.com/test/example-repo',
    prNumber: 123,
    prTitle: 'Add user authentication feature',
    prAuthor: 'developer',
    prBranch: 'feature/auth',
    baseBranch: 'main',
    mode: 'standard',
    timestamp: new Date().toISOString(),
    duration: 45000,
    score: 65,
    blockingCount: 3,
    issues: mockIssues,
    ...overrides,
  };
}

function createMockFixResult(
  analysis: V9AnalysisResultInput
): FixOrchestrationResultInput {
  return {
    score: 85,
    execution: {
      totalFixesApplied: 3,
      totalRolledBack: 0,
      totalRequiringReview: 1,
    },
    fixes: [
      {
        issueId: 'issue-001',
        ruleId: 'sql-injection',
        tier: 'tier2_5_pattern',
        confidence: 95,
        file: 'src/db/queries.ts',
        line: 45,
        originalCode: 'const query = `SELECT * FROM users WHERE id = ${userId}`;',
        fixedCode: 'const query = db.prepare("SELECT * FROM users WHERE id = ?").bind(userId);',
        explanation: 'Use parameterized queries to prevent SQL injection',
        verificationStatus: 'passed',
      },
      {
        issueId: 'issue-002',
        ruleId: 'xss-vulnerability',
        tier: 'tier2_5_pattern',
        confidence: 92,
        file: 'src/components/UserProfile.tsx',
        line: 23,
        originalCode: '<div dangerouslySetInnerHTML={{__html: userInput}} />',
        fixedCode: '<div>{DOMPurify.sanitize(userInput)}</div>',
        explanation: 'Sanitize user input before rendering',
        verificationStatus: 'passed',
      },
      {
        issueId: 'issue-003',
        ruleId: 'no-unused-vars',
        tier: 'tier1_native',
        confidence: 100,
        file: 'src/utils/helpers.ts',
        line: 12,
        originalCode: 'const unused = "value";',
        fixedCode: '// Removed unused variable',
        explanation: 'Removed unused variable declaration',
        verificationStatus: 'passed',
      },
    ],
    reviewRequired: [
      {
        issueId: 'issue-005',
        ruleId: 'n-plus-one',
        tier: 'tier3_ai',
        confidence: 75,
        file: 'src/api/users.ts',
        line: 34,
        originalCode: 'for (const user of users) { await getDetails(user.id); }',
        fixedCode: 'const details = await getDetailsBatch(users.map(u => u.id));',
        explanation: 'Batch the database queries to avoid N+1',
        verificationStatus: 'passed',
        reviewReason: 'performance',
        recommendation: 'Verify the batch query returns data in the expected format',
      },
    ],
    rolledBack: [],
    unfixed: [
      {
        issueId: 'issue-004',
        ruleId: 'complexity',
        file: 'src/services/auth.ts',
        line: 78,
        reason: 'complex_refactoring',
        explanation: 'Reducing complexity requires significant refactoring',
      },
    ],
  };
}

// ============================================================================
// TESTS
// ============================================================================

async function testBasicTierReport(): Promise<boolean> {
  console.log('\n📋 Test 1: BASIC Tier Report Generation');
  console.log('─'.repeat(50));

  try {
    const analysis = createMockAnalysis();
    const report = generateUnifiedReportSync(analysis, undefined, 'basic');

    // Validate structure
    const validations = [
      { name: 'Report ID exists', check: () => !!report.id },
      { name: 'Tier is basic', check: () => report.tier === 'basic' },
      { name: 'Header section exists', check: () => !!report.header },
      { name: 'Score is correct', check: () => report.header.score.value === 65 },
      { name: 'Grade is calculated', check: () => report.header.score.grade === 'D' },
      { name: 'Blocking count calculated (2 critical/high-security)', check: () => report.header.decision.blockingIssuesCount === 2 },
      { name: 'Decision is DECLINED (blocking issues)', check: () => report.header.decision.status === 'DECLINED' },
      { name: 'Progress section exists', check: () => !!report.progressHistory },
      { name: 'Remaining issues section exists', check: () => !!report.remainingIssues },
      { name: 'Business impact section exists', check: () => !!report.businessImpact },
      { name: 'Educational section exists', check: () => !!report.educational },
      { name: 'Skills section exists', check: () => !!report.skillsAndAchievements },
      { name: 'Metadata section exists', check: () => !!report.metadata },
      { name: 'No fixSummary (BASIC tier)', check: () => report.fixSummary === undefined },
      { name: 'No commitInfo (BASIC tier)', check: () => report.commitInfo === undefined },
    ];

    let passed = 0;
    for (const v of validations) {
      const result = v.check();
      console.log(`  ${result ? '✅' : '❌'} ${v.name}`);
      if (result) passed++;
    }

    console.log(`\n  Result: ${passed}/${validations.length} validations passed`);
    return passed === validations.length;
  } catch (error: any) {
    console.error(`  ❌ Error: ${error.message}`);
    return false;
  }
}

async function testProTierReport(): Promise<boolean> {
  console.log('\n📋 Test 2: PRO Tier Report Generation');
  console.log('─'.repeat(50));

  try {
    const analysis = createMockAnalysis();
    const fixResult = createMockFixResult(analysis);
    const report = generateUnifiedReportSync(analysis, fixResult, 'pro');

    const validations = [
      { name: 'Report ID exists', check: () => !!report.id },
      { name: 'Tier is pro', check: () => report.tier === 'pro' },
      { name: 'Score improved (85)', check: () => report.header.score.value === 85 },
      { name: 'Grade improved (B)', check: () => report.header.score.grade === 'B' },
      { name: 'Previous score tracked', check: () => report.header.score.previous === 65 },
      { name: 'Improvement calculated', check: () => report.header.score.improvement === 20 },
      { name: 'Decision is APPROVED (fixes applied)', check: () => report.header.decision.status === 'APPROVED' },
      { name: 'FixSummary exists (PRO tier)', check: () => !!report.fixSummary },
      { name: 'Fix success rate calculated', check: () => report.fixSummary!.overview.successRate > 0 },
      { name: 'Fixes by tier tracked', check: () => report.fixSummary!.successfullyFixed.byTier.tier2_5Pattern > 0 },
      { name: 'Review items tracked', check: () => report.fixSummary!.requiresReview.total === 1 },
      { name: 'Cannot fix items tracked', check: () => report.fixSummary!.cannotAutoFix.total === 1 },
      { name: 'Business impact has time saved', check: () => !!report.businessImpact.time.saved },
      { name: 'ROI section exists', check: () => !!report.businessImpact.roi },
    ];

    let passed = 0;
    for (const v of validations) {
      const result = v.check();
      console.log(`  ${result ? '✅' : '❌'} ${v.name}`);
      if (result) passed++;
    }

    console.log(`\n  Result: ${passed}/${validations.length} validations passed`);
    return passed === validations.length;
  } catch (error: any) {
    console.error(`  ❌ Error: ${error.message}`);
    return false;
  }
}

async function testExportFormats(): Promise<boolean> {
  console.log('\n📋 Test 3: Export Formats');
  console.log('─'.repeat(50));

  try {
    // Import the export handler
    const { handleExportReport, handleGenerateReport, registerAnalysisResult } =
      await import('../../src/two-branch/api/unified-report-endpoint');

    // Register mock analysis
    const analysis = createMockAnalysis({ id: 'export-test-001' });
    registerAnalysisResult('export-test-001', analysis);

    // Generate report
    const genResult = await handleGenerateReport({
      body: { analysisId: 'export-test-001', userId: 'test-user', tier: 'basic' }
    });

    if (!genResult.success || !genResult.data) {
      console.log('  ❌ Failed to generate report for export test');
      return false;
    }

    const reportId = genResult.data.reportId;

    // Test each export format
    const formats = ['json', 'markdown', 'html', 'sarif'] as const;
    let passed = 0;

    for (const format of formats) {
      const result = await handleExportReport({
        params: { reportId, format }
      });

      if (result.success && result.data) {
        console.log(`  ✅ ${format.toUpperCase()} export: ${result.data.content.length} bytes`);
        passed++;
      } else {
        console.log(`  ❌ ${format.toUpperCase()} export failed: ${result.error}`);
      }
    }

    console.log(`\n  Result: ${passed}/${formats.length} exports successful`);
    return passed === formats.length;
  } catch (error: any) {
    console.error(`  ❌ Error: ${error.message}`);
    return false;
  }
}

async function testUserPreferences(): Promise<boolean> {
  console.log('\n📋 Test 4: User Preferences API');
  console.log('─'.repeat(50));

  try {
    const { handleGetPreferences, handleUpdatePreferences } =
      await import('../../src/two-branch/api/unified-report-endpoint');

    // Get default preferences
    const getResult = await handleGetPreferences({
      params: { userId: 'test-user-prefs' }
    });

    if (!getResult.success || !getResult.data) {
      console.log('  ❌ Failed to get preferences');
      return false;
    }

    console.log(`  ✅ Default hourly rate: $${getResult.data.hourlyRate}`);
    console.log(`  ✅ Default achievement style: ${getResult.data.achievementStyle}`);

    // Update preferences
    const updateResult = await handleUpdatePreferences({
      params: { userId: 'test-user-prefs' },
      body: { hourlyRate: 200, achievementStyle: 'gamified' }
    });

    if (!updateResult.success || !updateResult.data) {
      console.log('  ❌ Failed to update preferences');
      return false;
    }

    console.log(`  ✅ Updated hourly rate: $${updateResult.data.hourlyRate}`);
    console.log(`  ✅ Updated achievement style: ${updateResult.data.achievementStyle}`);

    // Verify update persisted
    const verifyResult = await handleGetPreferences({
      params: { userId: 'test-user-prefs' }
    });

    const validations = [
      { name: 'Hourly rate updated', check: () => verifyResult.data?.hourlyRate === 200 },
      { name: 'Achievement style updated', check: () => verifyResult.data?.achievementStyle === 'gamified' },
    ];

    let passed = 0;
    for (const v of validations) {
      const result = v.check();
      console.log(`  ${result ? '✅' : '❌'} ${v.name}`);
      if (result) passed++;
    }

    return passed === validations.length;
  } catch (error: any) {
    console.error(`  ❌ Error: ${error.message}`);
    return false;
  }
}

async function testReportSections(): Promise<boolean> {
  console.log('\n📋 Test 5: Report Section Retrieval');
  console.log('─'.repeat(50));

  try {
    const { handleGetReportSection, handleGenerateReport, registerAnalysisResult } =
      await import('../../src/two-branch/api/unified-report-endpoint');

    // Register and generate report
    const analysis = createMockAnalysis({ id: 'section-test-001' });
    registerAnalysisResult('section-test-001', analysis);

    const genResult = await handleGenerateReport({
      body: { analysisId: 'section-test-001', userId: 'test-user', tier: 'basic' }
    });

    if (!genResult.success || !genResult.data) {
      console.log('  ❌ Failed to generate report');
      return false;
    }

    const reportId = genResult.data.reportId;

    // Test each section
    const sections = [
      'header', 'progressHistory', 'remainingIssues',
      'businessImpact', 'educational', 'skillsAndAchievements', 'metadata'
    ] as const;

    let passed = 0;
    for (const section of sections) {
      const result = await handleGetReportSection({
        params: { reportId, sectionName: section }
      });

      if (result.success && result.data) {
        console.log(`  ✅ ${section} section retrieved`);
        passed++;
      } else {
        console.log(`  ❌ ${section} section failed: ${result.error}`);
      }
    }

    console.log(`\n  Result: ${passed}/${sections.length} sections retrieved`);
    return passed === sections.length;
  } catch (error: any) {
    console.error(`  ❌ Error: ${error.message}`);
    return false;
  }
}

// ============================================================================
// MAIN
// ============================================================================

async function main(): Promise<void> {
  console.log('═'.repeat(60));
  console.log('🧪 UNIFIED REPORT SYSTEM TEST');
  console.log('═'.repeat(60));
  console.log(`Started: ${new Date().toISOString()}`);

  const results: { name: string; passed: boolean }[] = [];

  // Run tests
  results.push({ name: 'BASIC Tier Report', passed: await testBasicTierReport() });
  results.push({ name: 'PRO Tier Report', passed: await testProTierReport() });
  results.push({ name: 'Export Formats', passed: await testExportFormats() });
  results.push({ name: 'User Preferences', passed: await testUserPreferences() });
  results.push({ name: 'Report Sections', passed: await testReportSections() });

  // Summary
  console.log('\n' + '═'.repeat(60));
  console.log('📊 TEST SUMMARY');
  console.log('═'.repeat(60));

  const passed = results.filter(r => r.passed).length;
  const total = results.length;

  for (const r of results) {
    console.log(`  ${r.passed ? '✅' : '❌'} ${r.name}`);
  }

  console.log(`\n  Overall: ${passed}/${total} tests passed`);
  console.log(`  Status: ${passed === total ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED'}`);
  console.log('═'.repeat(60));

  process.exit(passed === total ? 0 : 1);
}

main().catch(console.error);
