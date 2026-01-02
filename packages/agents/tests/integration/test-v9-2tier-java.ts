/**
 * V9 2-Tier Test - Java
 * Tests BASIC and PRO tier flows on Oracle Cloud
 */

import * as https from 'https';
import * as http from 'http';

const API_BASE = process.env.API_BASE_URL || 'http://localhost:3001';
const TEST_REPO = 'https://github.com/spring-projects/spring-petclinic';
const TEST_PR = 950;

interface AnalysisResult {
  analysisId: string;
  status: string;
  progress?: number;
  result?: any;
}

async function fetchJson(url: string, options: any = {}): Promise<any> {
  return new Promise((resolve, reject) => {
    const isHttps = url.startsWith('https');
    const lib = isHttps ? https : http;

    const req = lib.request(url, {
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch {
          resolve(data);
        }
      });
    });

    req.on('error', reject);
    if (options.body) req.write(JSON.stringify(options.body));
    req.end();
  });
}

async function startAnalysis(tier: 'basic' | 'pro'): Promise<string> {
  console.log(`\n📊 Starting ${tier.toUpperCase()} tier analysis...`);

  const response = await fetchJson(`${API_BASE}/api/v9/analyze`, {
    method: 'POST',
    body: {
      repositoryUrl: TEST_REPO,
      prNumber: TEST_PR,
      language: 'java',
      userTier: tier,
      options: { generateFixes: tier === 'pro' }
    }
  });

  console.log(`   Analysis ID: ${response.analysisId}`);
  return response.analysisId;
}

async function pollStatus(analysisId: string): Promise<AnalysisResult> {
  let attempts = 0;
  const maxAttempts = 60;

  while (attempts < maxAttempts) {
    const response = await fetchJson(`${API_BASE}/api/v9/analyze/${analysisId}`);

    if (response.status === 'completed') {
      return response;
    }

    if (response.status === 'failed') {
      throw new Error(`Analysis failed: ${response.error}`);
    }

    process.stdout.write(`\r   Status: ${response.status} (${response.progress || 0}%)`);
    await new Promise(r => setTimeout(r, 2000));
    attempts++;
  }

  throw new Error('Analysis timed out');
}

async function getReport(analysisId: string, tier: 'basic' | 'pro'): Promise<any> {
  const response = await fetchJson(`${API_BASE}/api/v9/reports`, {
    method: 'POST',
    body: { analysisId, tier }
  });
  return response;
}

function validateBasicReport(report: any): string[] {
  const issues: string[] = [];

  // BASIC should have IDE exports
  if (!report.ideExports) {
    issues.push('Missing ideExports (BASIC should have IDE exports)');
  }

  // BASIC should have pattern contribution opt-in
  if (!report.patternContribution?.optIn) {
    issues.push('Missing patternContribution.optIn');
  }

  // BASIC should NOT have fixSummary
  if (report.fixSummary) {
    issues.push('Has fixSummary (BASIC should NOT have fixes)');
  }

  // Should have gamification
  if (!report.skillsAndAchievements) {
    issues.push('Missing skillsAndAchievements');
  }

  // Should have educational content
  if (!report.report) {
    issues.push('Missing report content');
  }

  return issues;
}

function validateProReport(report: any): string[] {
  const issues: string[] = [];

  // PRO should NOT have IDE exports
  if (report.ideExports) {
    issues.push('Has ideExports (PRO should NOT have IDE exports)');
  }

  // PRO should have fixSummary
  if (!report.fixSummary) {
    issues.push('Missing fixSummary (PRO should have fixes)');
  }

  // Should have gamification with PRO bonuses
  if (!report.skillsAndAchievements) {
    issues.push('Missing skillsAndAchievements');
  }

  // Should have XP breakdown
  if (!report.progressHistory?.xpBreakdown) {
    issues.push('Missing xpBreakdown');
  }

  return issues;
}

async function runTest() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('          V9 2-TIER TEST - JAVA (BASIC vs PRO)              ');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`API: ${API_BASE}`);
  console.log(`Repo: ${TEST_REPO}`);
  console.log(`PR: #${TEST_PR}`);

  const results: any = { basic: {}, pro: {} };

  // Test BASIC tier
  try {
    const basicId = await startAnalysis('basic');
    console.log('\n   Polling for completion...');
    const basicResult = await pollStatus(basicId);
    console.log('\n   ✅ Analysis complete');

    const basicReport = await getReport(basicId, 'basic');
    results.basic = {
      analysisId: basicId,
      issues: basicResult.result?.summary?.totalIssues || 0,
      score: basicResult.result?.score?.overall || 0,
      report: basicReport
    };

    console.log(`\n   BASIC Results:`);
    console.log(`   - Issues: ${results.basic.issues}`);
    console.log(`   - Score: ${results.basic.score}/100`);
    console.log(`   - Has IDE Exports: ${!!basicReport.ideExports}`);
    console.log(`   - Has Pattern Contribution: ${!!basicReport.patternContribution}`);

    const basicIssues = validateBasicReport(basicReport);
    if (basicIssues.length > 0) {
      console.log(`   ⚠️  Validation issues:`);
      basicIssues.forEach(i => console.log(`      - ${i}`));
    } else {
      console.log(`   ✅ BASIC tier validation passed`);
    }

  } catch (e: any) {
    console.error(`\n   ❌ BASIC tier failed: ${e.message}`);
    results.basic.error = e.message;
  }

  // Test PRO tier
  try {
    const proId = await startAnalysis('pro');
    console.log('\n   Polling for completion...');
    const proResult = await pollStatus(proId);
    console.log('\n   ✅ Analysis complete');

    const proReport = await getReport(proId, 'pro');
    results.pro = {
      analysisId: proId,
      issues: proResult.result?.summary?.totalIssues || 0,
      fixed: proResult.result?.summary?.fixed || 0,
      score: proResult.result?.score?.overall || 0,
      report: proReport
    };

    console.log(`\n   PRO Results:`);
    console.log(`   - Issues: ${results.pro.issues}`);
    console.log(`   - Fixed: ${results.pro.fixed}`);
    console.log(`   - Score: ${results.pro.score}/100`);
    console.log(`   - Has Fix Summary: ${!!proReport.fixSummary}`);
    console.log(`   - Has AI Insights: ${!!proReport.aiInsights}`);

    const proIssues = validateProReport(proReport);
    if (proIssues.length > 0) {
      console.log(`   ⚠️  Validation issues:`);
      proIssues.forEach(i => console.log(`      - ${i}`));
    } else {
      console.log(`   ✅ PRO tier validation passed`);
    }

  } catch (e: any) {
    console.error(`\n   ❌ PRO tier failed: ${e.message}`);
    results.pro.error = e.message;
  }

  // Summary
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('                        SUMMARY                             ');
  console.log('═══════════════════════════════════════════════════════════');

  console.log('\n| Feature | BASIC | PRO |');
  console.log('|---------|-------|-----|');
  console.log(`| Issues Found | ${results.basic.issues || 'N/A'} | ${results.pro.issues || 'N/A'} |`);
  console.log(`| Issues Fixed | N/A | ${results.pro.fixed || 'N/A'} |`);
  console.log(`| Score | ${results.basic.score || 'N/A'} | ${results.pro.score || 'N/A'} |`);
  console.log(`| IDE Exports | ${results.basic.report?.ideExports ? '✅' : '❌'} | ${results.pro.report?.ideExports ? '❌ (wrong)' : '✅'} |`);
  console.log(`| Fix Summary | ${results.basic.report?.fixSummary ? '❌ (wrong)' : '✅'} | ${results.pro.report?.fixSummary ? '✅' : '❌'} |`);

  const allPassed = !results.basic.error && !results.pro.error;
  console.log(`\n${allPassed ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED'}`);

  process.exit(allPassed ? 0 : 1);
}

runTest().catch(e => {
  console.error('Test failed:', e);
  process.exit(1);
});
