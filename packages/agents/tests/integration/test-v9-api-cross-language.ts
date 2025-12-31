#!/usr/bin/env npx ts-node
/**
 * V9 API Cross-Language Integration Test
 *
 * Tests the V9 API service across multiple languages with tier differentiation.
 * This test calls actual API endpoints to validate:
 * 1. Analysis works for all supported languages
 * 2. BASIC and PRO tier responses are correctly differentiated
 * 3. Unified report structure is consistent
 * 4. Gamification features available for all tiers
 *
 * Prerequisites:
 * - API service running (local or cloud)
 * - Valid API key or authentication
 *
 * Usage:
 *   # Default: use cloud API
 *   npx ts-node test-v9-api-cross-language.ts
 *
 *   # Use local API
 *   API_BASE_URL=http://localhost:8080 npx ts-node test-v9-api-cross-language.ts
 *
 *   # Skip actual analysis (test structure only)
 *   DRY_RUN=true npx ts-node test-v9-api-cross-language.ts
 */

import axios, { AxiosInstance } from 'axios';

// =============================================================================
// CONFIGURATION
// =============================================================================

const API_BASE_URL = process.env.API_BASE_URL || 'http://129.212.136.24';
const API_KEY = process.env.CODEQUAL_API_KEY || '';
const DRY_RUN = process.env.DRY_RUN === 'true';
const TIMEOUT_MS = 600000; // 10 minutes for full analysis

// Test repositories for each language
interface TestRepository {
  language: string;
  repo: string;
  prNumber: number;
  expectedTools: string[];
}

const TEST_REPOSITORIES: TestRepository[] = [
  {
    language: 'java',
    repo: 'https://github.com/spring-projects/spring-petclinic',
    prNumber: 950,
    expectedTools: ['pmd', 'semgrep', 'dependency-check'],
  },
  {
    language: 'typescript',
    repo: 'https://github.com/expressjs/express',
    prNumber: 5678, // Use a valid PR
    expectedTools: ['eslint', 'semgrep', 'npm-audit'],
  },
  {
    language: 'python',
    repo: 'https://github.com/pallets/flask',
    prNumber: 5432,
    expectedTools: ['ruff', 'bandit', 'pip-audit'],
  },
  {
    language: 'go',
    repo: 'https://github.com/gin-gonic/gin',
    prNumber: 3900,
    expectedTools: ['golangci-lint', 'gosec', 'govulncheck'],
  },
  {
    language: 'rust',
    repo: 'https://github.com/tokio-rs/tokio',
    prNumber: 6500,
    expectedTools: ['clippy', 'cargo-audit'],
  },
  {
    language: 'ruby',
    repo: 'https://github.com/sinatra/sinatra',
    prNumber: 1900,
    expectedTools: ['rubocop', 'brakeman', 'bundler-audit'],
  },
  {
    language: 'php',
    repo: 'https://github.com/laravel/framework',
    prNumber: 50000,
    expectedTools: ['phpstan', 'semgrep', 'composer-audit'],
  },
];

// Tier features to validate
const BASIC_TIER_FEATURES = [
  'header',
  'progressHistory',
  'remainingIssues',
  'businessImpact',
  'educational',
  'ideIntegration',
  'skillsAndAchievements',
  'metadata',
];

const PRO_TIER_FEATURES = [
  ...BASIC_TIER_FEATURES.filter(f => f !== 'ideIntegration'),
  'fixSummary',
  'commitInfo',
];

// =============================================================================
// API CLIENT
// =============================================================================

function createApiClient(): AxiosInstance {
  return axios.create({
    baseURL: API_BASE_URL,
    timeout: TIMEOUT_MS,
    headers: {
      'Content-Type': 'application/json',
      ...(API_KEY ? { 'X-API-Key': API_KEY } : {}),
    },
  });
}

// =============================================================================
// TEST HELPERS
// =============================================================================

interface TestResult {
  language: string;
  tier: 'basic' | 'pro';
  success: boolean;
  analysisId?: string;
  duration?: number;
  error?: string;
  validation: {
    hasRequiredSections: boolean;
    hasCorrectTierContent: boolean;
    hasGamification: boolean;
    hasHistoricalData: boolean;
    issueCount?: number;
    score?: number;
  };
}

async function startAnalysis(
  client: AxiosInstance,
  repo: TestRepository,
  tier: 'basic' | 'pro'
): Promise<{ analysisId: string; statusUrl: string }> {
  const response = await client.post('/api/v9/analyze', {
    repositoryUrl: repo.repo,
    prNumber: repo.prNumber,
    language: repo.language,
    userTier: tier,
    userId: `test-user-${tier}`,
    options: {
      generateFixes: tier === 'pro',
      includeEducational: true,
    },
  });

  return {
    analysisId: response.data.analysisId,
    statusUrl: response.data.statusUrl,
  };
}

async function waitForAnalysis(
  client: AxiosInstance,
  analysisId: string,
  maxWaitMs: number = TIMEOUT_MS
): Promise<any> {
  const startTime = Date.now();
  let lastStatus = '';

  while (Date.now() - startTime < maxWaitMs) {
    const response = await client.get(`/api/v9/analyze/${analysisId}`);

    if (response.status === 200 && response.data.success) {
      return response.data;
    }

    if (response.status === 202) {
      const progress = response.data;
      if (progress.status !== lastStatus) {
        console.log(`   [${analysisId.slice(0, 8)}] ${progress.status}: ${progress.progress}%`);
        lastStatus = progress.status;
      }
    }

    await new Promise(resolve => setTimeout(resolve, 5000)); // Poll every 5s
  }

  throw new Error(`Analysis timeout after ${maxWaitMs / 1000}s`);
}

async function getReport(
  client: AxiosInstance,
  analysisId: string,
  userId: string,
  tier: 'basic' | 'pro'
): Promise<any> {
  const response = await client.post('/api/v9/reports', {
    analysisId,
    userId,
    tier,
  });

  return response.data;
}

function validateReport(
  report: any,
  tier: 'basic' | 'pro'
): TestResult['validation'] {
  const requiredSections = tier === 'pro' ? PRO_TIER_FEATURES : BASIC_TIER_FEATURES;

  const hasRequiredSections = requiredSections.every(section => {
    if (section === 'ideIntegration' && tier === 'pro') return true; // PRO doesn't have IDE
    if (section === 'fixSummary' && tier === 'basic') return true; // BASIC doesn't have fix
    if (section === 'commitInfo' && tier === 'basic') return true; // BASIC doesn't have commit
    return report[section] !== undefined;
  });

  // Check tier-specific content
  let hasCorrectTierContent = true;
  if (tier === 'pro') {
    // PRO should have fixSummary
    hasCorrectTierContent = report.fixSummary !== undefined || report.tier === 'pro';
  } else {
    // BASIC should have ideIntegration
    hasCorrectTierContent = report.ideIntegration !== undefined || report.tier === 'basic';
  }

  // Gamification should be present for ALL tiers
  const hasGamification =
    report.skillsAndAchievements !== undefined &&
    report.skillsAndAchievements.level !== undefined &&
    report.skillsAndAchievements.xpEarned !== undefined &&
    report.skillsAndAchievements.achievements !== undefined &&
    report.skillsAndAchievements.communityImpact !== undefined; // Community impact for ALL

  // Historical data should be available for ALL tiers
  const hasHistoricalData = report.progressHistory !== undefined;

  return {
    hasRequiredSections,
    hasCorrectTierContent,
    hasGamification,
    hasHistoricalData,
    issueCount: report.remainingIssues?.summary?.total,
    score: report.header?.score?.overall,
  };
}

// =============================================================================
// MOCK DATA FOR DRY RUN
// =============================================================================

function getMockReport(tier: 'basic' | 'pro'): any {
  const baseReport = {
    id: `mock-report-${Date.now()}`,
    version: '2.0',
    generatedAt: new Date().toISOString(),
    tier,
    header: {
      repository: { name: 'test-repo', url: 'https://github.com/test/repo' },
      pr: { number: 1, title: 'Test PR' },
      score: { overall: 85, grade: 'B+' },
      decision: 'APPROVED',
    },
    progressHistory: {
      isFirstTimeUser: false,
      userId: 'test-user',
      repositoryId: 'test-repo',
      history: { analyses: [], displayCount: 5, totalAvailable: 3 },
      trend: { direction: 'improving', changePoints: 5, changePercent: 10 },
    },
    remainingIssues: {
      summary: { total: 10, bySeverity: {}, byCategory: {} },
      issues: [],
    },
    businessImpact: {
      riskAssessment: { level: 'low', score: 20 },
      time: { manual: { hours: 8, formatted: '8 hours' } },
      cost: { manual: 1200 },
    },
    educational: { topIssueTypes: [], recommendations: [] },
    skillsAndAchievements: {
      level: { current: 5, title: 'Code Expert', xp: 1500, progressPercent: 50 },
      skills: {},
      xpEarned: { total: 50, breakdown: [] },
      achievements: { unlocked: [], inProgress: [], totalUnlocked: 3, totalAvailable: 10 },
      communityImpact: { patternsContributed: 2, developersHelped: 15 },
    },
    metadata: {
      analysis: { duration: { total: '2m 30s' } },
      tools: { executed: ['semgrep', 'pmd'], successful: 2, failed: 0 },
    },
  };

  if (tier === 'basic') {
    return {
      ...baseReport,
      ideIntegration: {
        reportId: 'mock-report',
        analysisId: 'mock-analysis',
        exports: { sarif: '/export/sarif', gitlabCodeQuality: '/export/gitlab' },
      },
    };
  } else {
    return {
      ...baseReport,
      fixSummary: {
        successfullyFixed: { total: 8, byTier: { tier1Native: 3, tier3Ai: 5 } },
        unfixedIssues: [],
      },
      commitInfo: {
        suggestedMessage: 'fix: Auto-fixed 8 issues',
        filesModified: 5,
      },
    };
  }
}

// =============================================================================
// MAIN TEST RUNNER
// =============================================================================

async function runLanguageTest(
  client: AxiosInstance,
  repo: TestRepository,
  tier: 'basic' | 'pro'
): Promise<TestResult> {
  const startTime = Date.now();
  const result: TestResult = {
    language: repo.language,
    tier,
    success: false,
    validation: {
      hasRequiredSections: false,
      hasCorrectTierContent: false,
      hasGamification: false,
      hasHistoricalData: false,
    },
  };

  try {
    let report: any;

    if (DRY_RUN) {
      console.log(`   [DRY RUN] Simulating ${repo.language} ${tier.toUpperCase()} tier...`);
      report = getMockReport(tier);
      result.analysisId = 'mock-analysis-id';
    } else {
      // Start analysis
      console.log(`   Starting ${tier.toUpperCase()} analysis for ${repo.language}...`);
      const { analysisId } = await startAnalysis(client, repo, tier);
      result.analysisId = analysisId;

      // Wait for completion
      const analysisResult = await waitForAnalysis(client, analysisId);

      // Get unified report
      report = await getReport(client, analysisId, `test-user-${tier}`, tier);
    }

    // Validate report structure
    result.validation = validateReport(report, tier);
    result.success =
      result.validation.hasRequiredSections &&
      result.validation.hasCorrectTierContent &&
      result.validation.hasGamification &&
      result.validation.hasHistoricalData;

    result.duration = Date.now() - startTime;

  } catch (error: any) {
    result.error = error.message || String(error);
    result.duration = Date.now() - startTime;
  }

  return result;
}

async function runAllTests(): Promise<void> {
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║     V9 API CROSS-LANGUAGE INTEGRATION TEST                   ║');
  console.log('╠══════════════════════════════════════════════════════════════╣');
  console.log(`║  API URL: ${API_BASE_URL.padEnd(48)}║`);
  console.log(`║  Mode: ${DRY_RUN ? 'DRY RUN (mock data)' : 'LIVE (real API calls)'.padEnd(51)}║`);
  console.log(`║  Languages: ${TEST_REPOSITORIES.length}                                             ║`);
  console.log(`║  Tiers: BASIC + PRO                                          ║`);
  console.log('╚══════════════════════════════════════════════════════════════╝\n');

  const client = createApiClient();
  const results: TestResult[] = [];

  // Test each language with both tiers
  for (const repo of TEST_REPOSITORIES) {
    console.log(`\n🔬 Testing ${repo.language.toUpperCase()}...`);
    console.log(`   Repository: ${repo.repo}`);
    console.log(`   PR: #${repo.prNumber}`);

    // Test BASIC tier
    console.log('\n   📋 BASIC Tier:');
    const basicResult = await runLanguageTest(client, repo, 'basic');
    results.push(basicResult);
    printTestResult(basicResult);

    // Test PRO tier
    console.log('\n   🌟 PRO Tier:');
    const proResult = await runLanguageTest(client, repo, 'pro');
    results.push(proResult);
    printTestResult(proResult);
  }

  // Print summary
  printSummary(results);
}

function printTestResult(result: TestResult): void {
  const status = result.success ? '✅ PASS' : '❌ FAIL';
  console.log(`      ${status}`);

  if (result.validation.score !== undefined) {
    console.log(`      Score: ${result.validation.score}/100`);
  }
  if (result.validation.issueCount !== undefined) {
    console.log(`      Issues: ${result.validation.issueCount}`);
  }
  if (result.duration) {
    console.log(`      Duration: ${(result.duration / 1000).toFixed(1)}s`);
  }

  if (!result.success) {
    if (result.error) {
      console.log(`      Error: ${result.error}`);
    }
    if (!result.validation.hasRequiredSections) {
      console.log('      ⚠️ Missing required sections');
    }
    if (!result.validation.hasCorrectTierContent) {
      console.log('      ⚠️ Incorrect tier content');
    }
    if (!result.validation.hasGamification) {
      console.log('      ⚠️ Missing gamification features');
    }
    if (!result.validation.hasHistoricalData) {
      console.log('      ⚠️ Missing historical data');
    }
  }
}

function printSummary(results: TestResult[]): void {
  const passed = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;

  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('TEST SUMMARY');
  console.log('═══════════════════════════════════════════════════════════════\n');

  console.log(`Total Tests: ${results.length}`);
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);

  // Group by language
  console.log('\nBy Language:');
  const languages = [...new Set(results.map(r => r.language))];
  for (const lang of languages) {
    const langResults = results.filter(r => r.language === lang);
    const langPassed = langResults.filter(r => r.success).length;
    const status = langPassed === langResults.length ? '✅' : '❌';
    console.log(`  ${status} ${lang}: ${langPassed}/${langResults.length}`);
  }

  // Tier validation
  console.log('\nTier Differentiation:');
  const basicResults = results.filter(r => r.tier === 'basic');
  const proResults = results.filter(r => r.tier === 'pro');

  const basicGamification = basicResults.filter(r => r.validation.hasGamification).length;
  const proGamification = proResults.filter(r => r.validation.hasGamification).length;

  console.log(`  BASIC - Gamification: ${basicGamification}/${basicResults.length} (should be ALL)`);
  console.log(`  PRO - Gamification: ${proGamification}/${proResults.length} (should be ALL)`);

  const basicHistory = basicResults.filter(r => r.validation.hasHistoricalData).length;
  const proHistory = proResults.filter(r => r.validation.hasHistoricalData).length;

  console.log(`  BASIC - Historical Data: ${basicHistory}/${basicResults.length} (should be ALL)`);
  console.log(`  PRO - Historical Data: ${proHistory}/${proResults.length} (should be ALL)`);

  console.log('\n═══════════════════════════════════════════════════════════════\n');

  // Exit code
  process.exit(failed > 0 ? 1 : 0);
}

// =============================================================================
// RUN
// =============================================================================

runAllTests().catch(error => {
  console.error('Test runner failed:', error);
  process.exit(1);
});
