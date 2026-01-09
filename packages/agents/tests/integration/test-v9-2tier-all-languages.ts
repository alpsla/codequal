/**
 * V9 2-Tier Test - All Languages via API
 * Tests BASIC and PRO tier flows for multiple languages
 * Saves reports for pattern collection
 *
 * Usage:
 *   API_BASE_URL=http://localhost:3001 npx ts-node tests/integration/test-v9-2tier-all-languages.ts
 *
 *   # Single language
 *   LANG=java API_BASE_URL=http://localhost:3001 npx ts-node tests/integration/test-v9-2tier-all-languages.ts
 *
 *   # Cost control: Limit PRO tier to 5 issues for testing
 *   MAX_ISSUES=5 LANG=java API_BASE_URL=http://localhost:3001 npx ts-node tests/integration/test-v9-2tier-all-languages.ts
 */

import * as https from 'https';
import * as http from 'http';
import * as fs from 'fs';
import * as path from 'path';

const API_BASE = process.env.API_BASE_URL || 'http://localhost:3000';
const LANG_FILTER = process.env.LANG?.toLowerCase();
const MAX_ISSUES = process.env.MAX_ISSUES ? parseInt(process.env.MAX_ISSUES, 10) : undefined;

// Test repositories for each language
const TEST_REPOS: Record<string, { url: string; pr: number; name: string }> = {
  java: {
    url: 'https://github.com/spring-projects/spring-petclinic',
    pr: 950,
    name: 'spring-petclinic'
  },
  typescript: {
    url: 'https://github.com/expressjs/express',
    pr: 5975,
    name: 'express'
  },
  python: {
    url: 'https://github.com/pallets/flask',
    pr: 5541,
    name: 'flask'
  },
  go: {
    url: 'https://github.com/gin-gonic/gin',
    pr: 3941,
    name: 'gin'
  }
};

interface TestResult {
  language: string;
  tier: string;
  analysisId: string;
  issues: number;
  fixed?: number;
  score: number;
  duration: number;
  passed: boolean;
  error?: string;
  report?: any;
}

const allResults: TestResult[] = [];

async function fetchJson(url: string, options: any = {}): Promise<any> {
  return new Promise((resolve, reject) => {
    const isHttps = url.startsWith('https');
    const lib = isHttps ? https : http;

    const urlObj = new URL(url);

    const req = lib.request({
      hostname: urlObj.hostname,
      port: urlObj.port || (isHttps ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
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

async function startAnalysis(language: string, tier: 'basic' | 'pro'): Promise<string> {
  const repo = TEST_REPOS[language];

  const options: any = { generateFixes: tier === 'pro' };
  if (MAX_ISSUES && tier === 'pro') {
    options.maxIssuesForFix = MAX_ISSUES;
    console.log(`      [Cost Control] Limiting PRO tier to ${MAX_ISSUES} issues`);
  }

  const response = await fetchJson(`${API_BASE}/api/v9/analyze`, {
    method: 'POST',
    body: {
      repositoryUrl: repo.url,
      prNumber: repo.pr,
      language,
      userTier: tier,
      options
    }
  });

  if (!response.analysisId) {
    throw new Error(`Failed to start analysis: ${JSON.stringify(response)}`);
  }

  return response.analysisId;
}

async function pollStatus(analysisId: string, maxMinutes: number = 10): Promise<any> {
  const maxAttempts = maxMinutes * 30; // 2 second intervals
  let attempts = 0;

  while (attempts < maxAttempts) {
    const response = await fetchJson(`${API_BASE}/api/v9/analyze/${analysisId}`);

    if (response.status === 'completed') {
      return response;
    }

    if (response.status === 'failed') {
      throw new Error(`Analysis failed: ${response.error}`);
    }

    process.stdout.write(`\r      Status: ${response.status} (${response.progress || 0}%)     `);
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

function validateReport(report: any, tier: 'basic' | 'pro'): string[] {
  const issues: string[] = [];

  if (tier === 'basic') {
    if (!report.ideExports) issues.push('Missing ideExports');
    if (!report.patternContribution?.optIn) issues.push('Missing patternContribution.optIn');
    if (report.fixSummary) issues.push('Has fixSummary (should not)');
  } else {
    if (report.ideExports) issues.push('Has ideExports (should not)');
    if (!report.fixSummary) issues.push('Missing fixSummary');
    if (!report.aiInsights) issues.push('Missing aiInsights');
  }

  if (!report.skillsAndAchievements) issues.push('Missing skillsAndAchievements');

  return issues;
}

async function testLanguageTier(language: string, tier: 'basic' | 'pro'): Promise<TestResult> {
  const repo = TEST_REPOS[language];
  const startTime = Date.now();

  console.log(`\n   [${language.toUpperCase()}/${tier.toUpperCase()}] Starting...`);
  console.log(`      Repo: ${repo.name} PR #${repo.pr}`);

  try {
    const analysisId = await startAnalysis(language, tier);
    console.log(`      Analysis ID: ${analysisId}`);

    const analysisResult = await pollStatus(analysisId);
    console.log(`\n      ✅ Analysis complete`);

    const report = await getReport(analysisId, tier);
    const duration = Math.round((Date.now() - startTime) / 1000);

    const validationIssues = validateReport(report, tier);
    const passed = validationIssues.length === 0;

    if (!passed) {
      console.log(`      ⚠️  Validation issues:`);
      validationIssues.forEach(i => console.log(`         - ${i}`));
    } else {
      console.log(`      ✅ Validation passed`);
    }

    const result: TestResult = {
      language,
      tier,
      analysisId,
      // SESSION 77: Fixed - summary is at top level, not under .result
      issues: analysisResult.summary?.totalIssues || 0,
      fixed: tier === 'pro' ? (analysisResult.summary?.fixed || 0) : undefined,
      score: analysisResult.score?.overall || 0,
      duration,
      passed,
      report
    };

    console.log(`      Issues: ${result.issues}, Score: ${result.score}/100, Duration: ${duration}s`);

    return result;

  } catch (e: any) {
    const duration = Math.round((Date.now() - startTime) / 1000);
    console.log(`\n      ❌ Failed: ${e.message}`);

    return {
      language,
      tier,
      analysisId: '',
      issues: 0,
      score: 0,
      duration,
      passed: false,
      error: e.message
    };
  }
}

function saveReports(results: TestResult[]) {
  const outputDir = path.join(__dirname, 'v9-2tier-reports');

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);

  // Save individual reports
  for (const result of results) {
    if (result.report) {
      const filename = `${result.language}_${result.tier}_${timestamp}.json`;
      fs.writeFileSync(
        path.join(outputDir, filename),
        JSON.stringify(result.report, null, 2)
      );
    }
  }

  // Save summary
  const summary = {
    timestamp: new Date().toISOString(),
    apiBase: API_BASE,
    results: results.map(r => ({
      language: r.language,
      tier: r.tier,
      analysisId: r.analysisId,
      issues: r.issues,
      fixed: r.fixed,
      score: r.score,
      duration: r.duration,
      passed: r.passed,
      error: r.error
    }))
  };

  fs.writeFileSync(
    path.join(outputDir, `summary_${timestamp}.json`),
    JSON.stringify(summary, null, 2)
  );

  console.log(`\n📁 Reports saved to: ${outputDir}`);
}

async function runAllTests() {
  console.log('═══════════════════════════════════════════════════════════════════');
  console.log('       V9 2-TIER TEST - ALL LANGUAGES (BASIC vs PRO)                ');
  console.log('═══════════════════════════════════════════════════════════════════');
  console.log(`API: ${API_BASE}`);

  // Filter languages if specified
  let languages = Object.keys(TEST_REPOS);
  if (LANG_FILTER && TEST_REPOS[LANG_FILTER]) {
    languages = [LANG_FILTER];
    console.log(`Filter: ${LANG_FILTER} only`);
  }

  console.log(`Languages: ${languages.join(', ')}`);
  console.log(`Tiers: basic, pro`);

  const tiers: ('basic' | 'pro')[] = ['basic', 'pro'];

  for (const language of languages) {
    console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`   📦 Testing: ${language.toUpperCase()}`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

    for (const tier of tiers) {
      const result = await testLanguageTier(language, tier);
      allResults.push(result);
    }
  }

  // Save all reports
  saveReports(allResults);

  // Print summary table
  console.log('\n═══════════════════════════════════════════════════════════════════');
  console.log('                           SUMMARY                                  ');
  console.log('═══════════════════════════════════════════════════════════════════');

  console.log('\n| Language   | Tier  | Issues | Fixed | Score | Time | Status |');
  console.log('|------------|-------|--------|-------|-------|------|--------|');

  for (const r of allResults) {
    const status = r.passed ? '✅' : '❌';
    const fixed = r.fixed !== undefined ? String(r.fixed) : '-';
    console.log(`| ${r.language.padEnd(10)} | ${r.tier.padEnd(5)} | ${String(r.issues).padEnd(6)} | ${fixed.padEnd(5)} | ${String(r.score).padEnd(5)} | ${r.duration}s | ${status} |`);
  }

  // Tier comparison
  console.log('\n─────────────────────────────────────────────────────────────────');
  console.log('                     TIER COMPARISON                              ');
  console.log('─────────────────────────────────────────────────────────────────');

  for (const language of languages) {
    const basic = allResults.find(r => r.language === language && r.tier === 'basic');
    const pro = allResults.find(r => r.language === language && r.tier === 'pro');

    console.log(`\n${language.toUpperCase()}:`);
    console.log(`  BASIC: IDE Exports=${basic?.report?.ideExports ? '✅' : '❌'}, Pattern Opt-in=${basic?.report?.patternContribution ? '✅' : '❌'}`);
    console.log(`  PRO:   Fix Summary=${pro?.report?.fixSummary ? '✅' : '❌'}, AI Insights=${pro?.report?.aiInsights ? '✅' : '❌'}`);
  }

  const passedCount = allResults.filter(r => r.passed).length;
  const totalCount = allResults.length;
  const allPassed = passedCount === totalCount;

  console.log(`\n═══════════════════════════════════════════════════════════════════`);
  console.log(`   ${allPassed ? '✅ ALL TESTS PASSED' : `⚠️  ${passedCount}/${totalCount} TESTS PASSED`}`);
  console.log(`═══════════════════════════════════════════════════════════════════`);

  process.exit(allPassed ? 0 : 1);
}

// Run tests
runAllTests().catch(e => {
  console.error('Test suite failed:', e);
  process.exit(1);
});
