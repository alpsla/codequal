#!/usr/bin/env npx ts-node
/**
 * V9 2-Tier Analysis Test with Metrics Tracking (API-Based)
 *
 * Session 69: Comprehensive testing across all supported languages via API
 * - Uses V9 API service for all analysis
 * - Tracks pattern growth (baseline: 640)
 * - Measures performance per language
 * - Generates BASIC and PRO tier reports for manual review
 * - Saves metrics to tracker file
 *
 * Usage:
 *   npx ts-node tests/integration/test-v9-2tier-with-metrics.ts
 *
 *   # Single language (use TEST_LANG to avoid conflict with system locale)
 *   TEST_LANG=java npx ts-node tests/integration/test-v9-2tier-with-metrics.ts
 *
 *   # Use local API
 *   API_BASE_URL=http://localhost:3001 npx ts-node tests/integration/test-v9-2tier-with-metrics.ts
 */

import dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import axios, { AxiosInstance, AxiosError } from 'axios';

// Load environment
dotenv.config({ path: path.join(__dirname, '../../.env') });

// ============================================================================
// CONFIGURATION
// ============================================================================

const API_BASE_URL = process.env.API_BASE_URL || 'http://129.213.49.128:3001';
const TIMEOUT_MS = 600000; // 10 minutes
const DRY_RUN = process.env.DRY_RUN === 'true';
const OUTPUT_DIR = path.join(__dirname, 'v9-2tier-reports');
const TRACKER_PATH = path.join(__dirname, 'v9-analysis-metrics-tracker.json');

interface LanguageConfig {
  language: string;
  repository: string;
  prNumber: number | null;
  expectedTools: string[];
  estimatedLOC: number;
}

// Test repositories for each language (using known PRs where available)
const LANGUAGE_CONFIGS: LanguageConfig[] = [
  {
    language: 'java',
    repository: 'https://github.com/spring-projects/spring-petclinic',
    prNumber: 950,
    expectedTools: ['pmd', 'checkstyle', 'spotbugs', 'semgrep', 'dependency-check'],
    estimatedLOC: 15000
  },
  {
    language: 'typescript',
    repository: 'https://github.com/expressjs/express',
    prNumber: 5678,
    expectedTools: ['eslint', 'semgrep', 'npm-audit'],
    estimatedLOC: 25000
  },
  {
    language: 'python',
    repository: 'https://github.com/pallets/flask',
    prNumber: 5432,
    expectedTools: ['ruff', 'bandit', 'pip-audit', 'semgrep'],
    estimatedLOC: 20000
  },
  {
    language: 'go',
    repository: 'https://github.com/gin-gonic/gin',
    prNumber: 3900,
    expectedTools: ['golangci-lint', 'gosec', 'govulncheck'],
    estimatedLOC: 30000
  },
  {
    language: 'rust',
    repository: 'https://github.com/tokio-rs/tokio',
    prNumber: 6500,
    expectedTools: ['clippy', 'cargo-audit'],
    estimatedLOC: 100000
  },
  {
    language: 'ruby',
    repository: 'https://github.com/sinatra/sinatra',
    prNumber: 1900,
    expectedTools: ['rubocop', 'brakeman', 'bundler-audit'],
    estimatedLOC: 10000
  },
  {
    language: 'php',
    repository: 'https://github.com/laravel/framework',
    prNumber: 50000,
    expectedTools: ['phpstan', 'semgrep', 'composer-audit'],
    estimatedLOC: 200000
  }
];

// ============================================================================
// TYPES
// ============================================================================

interface AnalysisMetrics {
  language: string;
  repository: string;
  prNumber: number | null;
  tier: 'basic' | 'pro';
  startTime: string;
  endTime: string;
  durationMs: number;
  issuesFound: number;
  issuesByCategory: Record<string, number>;
  issuesBySeverity: Record<string, number>;
  issuesFixed: number;
  patternsBefore: number;
  patternsAfter: number;
  patternsAdded: number;
  linesOfCode: number;
  issuesPerKLOC: number;
  toolsExecuted: string[];
  score: number;
  decision: string;
  success: boolean;
  error?: string;
  reportPath?: string;
}

interface TrackerData {
  session: {
    id: string;
    date: string;
    purpose: string;
  };
  baseline: {
    patternCount: number;
    timestamp: string;
  };
  current: {
    patternCount: number;
    newPatternsAdded: number;
    timestamp: string | null;
  };
  languages: Record<string, {
    status: string;
    repository: string;
    prNumber: number | null;
    basicMetrics: AnalysisMetrics | null;
    proMetrics: AnalysisMetrics | null;
  }>;
  summary: {
    totalLanguages: number;
    completedLanguages: number;
    totalIssuesFound: number;
    totalIssuesFixed: number;
    totalPatternsAdded: number;
    avgAnalysisTime: number;
    avgIssuesPerKLOC: number;
  };
}

// ============================================================================
// SUPABASE HELPERS
// ============================================================================

function getSupabaseClient(): SupabaseClient | null {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

async function getPatternCount(supabase: SupabaseClient | null): Promise<number> {
  if (!supabase) return 640;
  try {
    const { count, error } = await supabase
      .from('fix_patterns')
      .select('*', { count: 'exact', head: true });
    if (error) throw error;
    return count || 640;
  } catch {
    return 640;
  }
}

// ============================================================================
// TRACKER HELPERS
// ============================================================================

function loadTracker(): TrackerData {
  if (fs.existsSync(TRACKER_PATH)) {
    return JSON.parse(fs.readFileSync(TRACKER_PATH, 'utf-8'));
  }

  const tracker: TrackerData = {
    session: {
      id: `session-69`,
      date: new Date().toISOString().split('T')[0],
      purpose: 'V9 2-tier API analysis testing across all languages'
    },
    baseline: { patternCount: 640, timestamp: new Date().toISOString() },
    current: { patternCount: 640, newPatternsAdded: 0, timestamp: null },
    languages: {},
    summary: {
      totalLanguages: LANGUAGE_CONFIGS.length,
      completedLanguages: 0,
      totalIssuesFound: 0,
      totalIssuesFixed: 0,
      totalPatternsAdded: 0,
      avgAnalysisTime: 0,
      avgIssuesPerKLOC: 0
    }
  };

  for (const config of LANGUAGE_CONFIGS) {
    tracker.languages[config.language] = {
      status: 'pending',
      repository: config.repository.split('/').slice(-2).join('/'),
      prNumber: config.prNumber,
      basicMetrics: null,
      proMetrics: null
    };
  }

  return tracker;
}

function saveTracker(tracker: TrackerData): void {
  fs.writeFileSync(TRACKER_PATH, JSON.stringify(tracker, null, 2));
}

function updateTrackerSummary(tracker: TrackerData): void {
  const completed = Object.values(tracker.languages).filter(l => l.status === 'completed');
  tracker.summary.completedLanguages = completed.length;

  let totalIssues = 0;
  let totalFixed = 0;
  let totalTime = 0;
  let totalIssuesPerKLOC = 0;

  for (const lang of completed) {
    if (lang.basicMetrics) {
      totalIssues += lang.basicMetrics.issuesFound;
      totalTime += lang.basicMetrics.durationMs;
      totalIssuesPerKLOC += lang.basicMetrics.issuesPerKLOC;
    }
    if (lang.proMetrics) {
      totalFixed += lang.proMetrics.issuesFixed;
    }
  }

  tracker.summary.totalIssuesFound = totalIssues;
  tracker.summary.totalIssuesFixed = totalFixed;
  tracker.summary.totalPatternsAdded = tracker.current.patternCount - tracker.baseline.patternCount;

  if (completed.length > 0) {
    tracker.summary.avgAnalysisTime = totalTime / completed.length;
    tracker.summary.avgIssuesPerKLOC = totalIssuesPerKLOC / completed.length;
  }
}

// ============================================================================
// API CLIENT
// ============================================================================

function createApiClient(): AxiosInstance {
  // Ensure base URL includes /api/v9 prefix for V9 endpoints
  const baseUrl = API_BASE_URL.endsWith('/api/v9') ? API_BASE_URL : `${API_BASE_URL}/api/v9`;
  return axios.create({
    baseURL: baseUrl,
    timeout: TIMEOUT_MS,
    headers: { 'Content-Type': 'application/json' }
  });
}

async function startAnalysis(
  client: AxiosInstance,
  config: LanguageConfig,
  tier: 'basic' | 'pro'
): Promise<{ analysisId: string }> {
  console.log(`   📤 Starting ${tier.toUpperCase()} analysis...`);

  const response = await client.post('/analyze', {
    repositoryUrl: config.repository,
    prNumber: config.prNumber || 1,
    language: config.language,
    userTier: tier,
    userId: `test-user-${tier}-${Date.now()}`,
    options: {
      generateFixes: tier === 'pro',
      includeEducational: true
    }
  });

  return { analysisId: response.data.analysisId };
}

async function waitForAnalysis(
  client: AxiosInstance,
  analysisId: string
): Promise<any> {
  const startTime = Date.now();
  let lastStatus = '';

  while (Date.now() - startTime < TIMEOUT_MS) {
    try {
      const response = await client.get(`/analyze/${analysisId}`);

      if (response.status === 200 && response.data.success) {
        return response.data;
      }

      if (response.status === 202) {
        const progress = response.data;
        if (progress.status !== lastStatus) {
          console.log(`   [${analysisId.slice(0, 8)}] ${progress.status}: ${progress.progress || 0}%`);
          lastStatus = progress.status;
        }
      }
    } catch (error) {
      // Continue polling
    }

    await new Promise(resolve => setTimeout(resolve, 5000));
  }

  throw new Error('Analysis timeout');
}

async function getReport(
  client: AxiosInstance,
  analysisId: string,
  tier: 'basic' | 'pro'
): Promise<any> {
  const response = await client.post('/reports', {
    analysisId,
    tier,
    format: 'json'
  });
  return response.data;
}

async function getMarkdownReport(
  client: AxiosInstance,
  analysisId: string,
  tier: 'basic' | 'pro'
): Promise<string> {
  const response = await client.post('/reports', {
    analysisId,
    tier,
    format: 'markdown'
  });
  return response.data.report?.markdown || '';
}

// ============================================================================
// MOCK DATA FOR DRY RUN
// ============================================================================

function getMockMetrics(config: LanguageConfig, tier: 'basic' | 'pro'): AnalysisMetrics {
  return {
    language: config.language,
    repository: config.repository,
    prNumber: config.prNumber,
    tier,
    startTime: new Date().toISOString(),
    endTime: new Date().toISOString(),
    durationMs: 120000 + Math.random() * 60000,
    issuesFound: Math.floor(Math.random() * 50) + 10,
    issuesByCategory: { NEW: 5, EXISTING_MODIFIED: 3, EXISTING_REST: 15 },
    issuesBySeverity: { critical: 1, high: 3, medium: 10, low: 9 },
    issuesFixed: tier === 'pro' ? Math.floor(Math.random() * 20) : 0,
    patternsBefore: 640,
    patternsAfter: 640 + Math.floor(Math.random() * 5),
    patternsAdded: Math.floor(Math.random() * 5),
    linesOfCode: config.estimatedLOC,
    issuesPerKLOC: 1.5 + Math.random(),
    toolsExecuted: config.expectedTools,
    score: 75 + Math.floor(Math.random() * 20),
    decision: 'APPROVED',
    success: true
  };
}

function getMockReport(tier: 'basic' | 'pro', config: LanguageConfig): string {
  const tierBadge = tier === 'pro' ? '🌟 PRO' : '📋 BASIC';
  const now = new Date().toISOString();

  return `# V9 Code Quality Report - ${tier.toUpperCase()} Tier

## Repository Information

**Repository:** [${config.repository.split('/').slice(-2).join('/')}](${config.repository})
**Language:** ${config.language.toUpperCase()}
**PR Number:** ${config.prNumber || 'N/A'}
**Analysis Date:** ${now}
**Tier:** ${tierBadge}

---

## 📊 Executive Summary

### Quality Score

✅ **85/100** - APPROVED

### Metrics Summary (Mock Data - DRY RUN)

| Metric | Value |
|--------|-------|
| **Issues Found** | 23 |
| **Issues Fixed** | ${tier === 'pro' ? 18 : 0} |
| **Lines of Code** | ${config.estimatedLOC.toLocaleString()} |
| **Issues per KLOC** | 1.53 |
| **Analysis Duration** | 2.5s |
| **Tools Executed** | ${config.expectedTools.join(', ')} |

---

${tier === 'basic' ? `
## 🔧 IDE Integration (BASIC Tier)

BASIC tier users can apply fixes through their IDE using LSP, SARIF, or GitLab formats.

[Upgrade to PRO for One-Click Auto-Fix]
` : `
## 🚀 One-Click Auto-Fix (PRO Tier)

All 23 issues can be auto-fixed with 100% coverage.
**Time Saved:** ~69 minutes of manual fixes
`}

---

*Mock Report - DRY RUN Mode | Session 69 Testing*
`;
}

// ============================================================================
// ANALYSIS RUNNER
// ============================================================================

async function runLanguageAnalysis(
  client: AxiosInstance,
  config: LanguageConfig,
  tier: 'basic' | 'pro',
  tracker: TrackerData,
  supabase: SupabaseClient | null
): Promise<AnalysisMetrics> {
  console.log(`\n   ${'─'.repeat(60)}`);
  console.log(`   🎯 ${tier.toUpperCase()} Tier Analysis`);

  const startTime = new Date();
  const patternsBefore = await getPatternCount(supabase);

  const metrics: AnalysisMetrics = {
    language: config.language,
    repository: config.repository,
    prNumber: config.prNumber,
    tier,
    startTime: startTime.toISOString(),
    endTime: '',
    durationMs: 0,
    issuesFound: 0,
    issuesByCategory: {},
    issuesBySeverity: {},
    issuesFixed: 0,
    patternsBefore,
    patternsAfter: patternsBefore,
    patternsAdded: 0,
    linesOfCode: config.estimatedLOC,
    issuesPerKLOC: 0,
    toolsExecuted: [],
    score: 0,
    decision: 'UNKNOWN',
    success: false
  };

  try {
    let report: any;
    let markdownReport: string;

    if (DRY_RUN) {
      console.log(`   [DRY RUN] Simulating ${config.language} ${tier.toUpperCase()} tier...`);
      const mockMetrics = getMockMetrics(config, tier);
      Object.assign(metrics, mockMetrics);
      markdownReport = getMockReport(tier, config);
    } else {
      // Start analysis via API
      const { analysisId } = await startAnalysis(client, config, tier);
      console.log(`   📋 Analysis ID: ${analysisId}`);

      // Wait for completion
      const result = await waitForAnalysis(client, analysisId);
      console.log(`   ✅ Analysis completed`);

      // Get reports
      report = await getReport(client, analysisId, tier);
      markdownReport = await getMarkdownReport(client, analysisId, tier);

      // Extract metrics from report (matching V9 API response structure)
      metrics.issuesFound = report.summary?.totalIssues || report.issues?.length || 0;
      metrics.issuesBySeverity = {
        critical: report.summary?.critical || 0,
        high: report.summary?.high || 0,
        medium: report.summary?.medium || 0,
        low: report.summary?.low || 0
      };
      metrics.issuesByCategory = report.remainingIssues?.summary?.byCategory || {};
      metrics.issuesFixed = report.summary?.fixed || 0;
      metrics.toolsExecuted = report.cloudServices?.toolsPods?.map((p: string) => p.replace('-host-native', '')) || config.expectedTools;
      metrics.score = report.score?.overall || 85;
      metrics.decision = report.score?.overall >= 70 ? 'APPROVED' : 'DECLINED';
    }

    // Save report to file
    const reportFilename = `${config.language}-${tier.toUpperCase()}-report.md`;
    const reportPath = path.join(OUTPUT_DIR, reportFilename);
    fs.writeFileSync(reportPath, markdownReport);
    metrics.reportPath = reportPath;
    console.log(`   📄 Report saved: ${reportFilename}`);

    // Calculate derived metrics
    metrics.issuesPerKLOC = (metrics.issuesFound / (metrics.linesOfCode / 1000)) || 0;
    metrics.patternsAfter = await getPatternCount(supabase);
    metrics.patternsAdded = metrics.patternsAfter - metrics.patternsBefore;
    metrics.success = true;

  } catch (error) {
    const axiosError = error as AxiosError;
    if (axiosError.response) {
      metrics.error = `API Error ${axiosError.response.status}: ${JSON.stringify(axiosError.response.data)}`;
    } else if (axiosError.message) {
      metrics.error = axiosError.message;
    } else {
      metrics.error = String(error);
    }
    console.error(`   ❌ Error: ${metrics.error}`);
  }

  const endTime = new Date();
  metrics.endTime = endTime.toISOString();
  metrics.durationMs = endTime.getTime() - startTime.getTime();

  // Print summary
  console.log(`   📊 Results:`);
  console.log(`      Issues Found: ${metrics.issuesFound}`);
  console.log(`      Issues Fixed: ${metrics.issuesFixed}`);
  console.log(`      Score: ${metrics.score}/100`);
  console.log(`      Duration: ${(metrics.durationMs / 1000).toFixed(1)}s`);
  console.log(`      Patterns Added: ${metrics.patternsAdded}`);

  return metrics;
}

// ============================================================================
// MAIN
// ============================================================================

async function main(): Promise<void> {
  console.log(`
╔═══════════════════════════════════════════════════════════════════════════════╗
║                                                                               ║
║              V9 2-TIER API ANALYSIS TEST - ALL LANGUAGES                      ║
║                          Session 69                                            ║
║                                                                               ║
║  API URL: ${API_BASE_URL.padEnd(62)}║
║  Mode: ${DRY_RUN ? 'DRY RUN (mock data)'.padEnd(66) : 'LIVE (real API calls)'.padEnd(66)}║
║  Output: ${OUTPUT_DIR.slice(-60).padEnd(64)}║
║                                                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝
`);

  // Create output directory
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  // Initialize
  const supabase = getSupabaseClient();
  const tracker = loadTracker();
  const client = createApiClient();

  // Get baseline pattern count
  const baselinePatterns = await getPatternCount(supabase);
  tracker.baseline.patternCount = baselinePatterns;
  tracker.current.patternCount = baselinePatterns;
  console.log(`📊 Baseline Pattern Count: ${baselinePatterns}`);

  // Filter languages if specified (use TEST_LANG to avoid conflict with system LANG locale)
  const langFilter = process.env.TEST_LANG?.toLowerCase();
  let configs = LANGUAGE_CONFIGS;
  if (langFilter) {
    configs = configs.filter(c => c.language === langFilter);
    console.log(`🎯 Filtering to: ${langFilter}`);
  }

  console.log(`\n📋 Languages to test: ${configs.map(c => c.language).join(', ')}\n`);

  // Run analysis for each language
  for (const config of configs) {
    console.log(`\n${'═'.repeat(80)}`);
    console.log(`🔬 Testing: ${config.language.toUpperCase()}`);
    console.log(`   Repository: ${config.repository}`);
    console.log(`   PR: ${config.prNumber || 'Local Branch'}`);
    console.log(`${'═'.repeat(80)}`);

    // Update tracker status
    tracker.languages[config.language].status = 'in_progress';
    saveTracker(tracker);

    // Run BASIC tier analysis
    const basicMetrics = await runLanguageAnalysis(client, config, 'basic', tracker, supabase);
    tracker.languages[config.language].basicMetrics = basicMetrics;

    // Run PRO tier analysis
    const proMetrics = await runLanguageAnalysis(client, config, 'pro', tracker, supabase);
    tracker.languages[config.language].proMetrics = proMetrics;

    // Update tracker
    tracker.languages[config.language].status = (basicMetrics.success && proMetrics.success) ? 'completed' : 'failed';
    tracker.current.patternCount = proMetrics.patternsAfter;
    tracker.current.newPatternsAdded = proMetrics.patternsAfter - tracker.baseline.patternCount;
    tracker.current.timestamp = new Date().toISOString();
    updateTrackerSummary(tracker);
    saveTracker(tracker);

    // Print language summary
    console.log(`\n   ${'─'.repeat(60)}`);
    console.log(`   📈 ${config.language.toUpperCase()} Summary:`);
    console.log(`      BASIC: ${basicMetrics.issuesFound} issues, ${basicMetrics.score}/100`);
    console.log(`      PRO: ${proMetrics.issuesFixed}/${proMetrics.issuesFound} fixed, ${proMetrics.score}/100`);
    console.log(`      Patterns: ${tracker.baseline.patternCount} → ${tracker.current.patternCount} (+${tracker.current.newPatternsAdded})`);
  }

  // Print final summary
  console.log(`
╔═══════════════════════════════════════════════════════════════════════════════╗
║                              FINAL SUMMARY                                     ║
╠═══════════════════════════════════════════════════════════════════════════════╣
║                                                                               ║
║  Languages Tested: ${tracker.summary.completedLanguages}/${tracker.summary.totalLanguages}                                                   ║
║  Total Issues Found: ${tracker.summary.totalIssuesFound.toString().padEnd(10)} Total Issues Fixed: ${tracker.summary.totalIssuesFixed.toString().padEnd(10)}        ║
║  Patterns: ${tracker.baseline.patternCount} → ${tracker.current.patternCount} (+${tracker.summary.totalPatternsAdded})                                              ║
║  Avg Analysis Time: ${(tracker.summary.avgAnalysisTime / 1000).toFixed(1)}s                                                 ║
║  Avg Issues/KLOC: ${tracker.summary.avgIssuesPerKLOC.toFixed(2)}                                                    ║
║                                                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝

📁 Reports saved to: ${OUTPUT_DIR}
📊 Metrics saved to: ${TRACKER_PATH}
`);

  // Print detailed breakdown
  console.log('\n📋 Language Breakdown:');
  console.log('─'.repeat(120));
  console.log(`| ${'Language'.padEnd(12)} | ${'Status'.padEnd(10)} | ${'BASIC Issues'.padEnd(14)} | ${'PRO Fixed'.padEnd(12)} | ${'Score'.padEnd(8)} | ${'Time'.padEnd(10)} | ${'Patterns+'.padEnd(10)} |`);
  console.log('─'.repeat(120));

  for (const [lang, data] of Object.entries(tracker.languages)) {
    const b = data.basicMetrics;
    const p = data.proMetrics;
    if (b && p) {
      console.log(`| ${lang.padEnd(12)} | ${data.status.padEnd(10)} | ${b.issuesFound.toString().padEnd(14)} | ${`${p.issuesFixed}/${p.issuesFound}`.padEnd(12)} | ${p.score.toString().padEnd(8)} | ${(p.durationMs / 1000).toFixed(1).padEnd(10)}s | ${p.patternsAdded.toString().padEnd(10)} |`);
    } else {
      console.log(`| ${lang.padEnd(12)} | ${data.status.padEnd(10)} | ${'—'.padEnd(14)} | ${'—'.padEnd(12)} | ${'—'.padEnd(8)} | ${'—'.padEnd(10)} | ${'—'.padEnd(10)} |`);
    }
  }
  console.log('─'.repeat(120));

  console.log('\n✅ Test complete! Review reports in:', OUTPUT_DIR);
}

// Run
main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
