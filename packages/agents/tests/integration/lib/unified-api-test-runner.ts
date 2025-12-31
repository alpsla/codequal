/**
 * Unified API Test Runner
 *
 * Provides a common interface for running V9 analysis tests across all languages
 * using the API service instead of direct tool execution.
 *
 * Benefits:
 * - Consistent test structure across all languages
 * - Uses production API endpoints
 * - Supports both BASIC and PRO tiers
 * - Handles analysis lifecycle (start, poll, complete)
 * - Returns unified report structure
 *
 * Usage:
 *   import { UnifiedAPITestRunner, TestScenario } from './lib/unified-api-test-runner';
 *
 *   const runner = new UnifiedAPITestRunner({ apiBaseUrl: 'http://localhost:8080' });
 *   const result = await runner.runTest({
 *     name: 'Spring PetClinic',
 *     repoUrl: 'https://github.com/spring-projects/spring-petclinic',
 *     prNumber: 950,
 *     language: 'java',
 *     tier: 'pro'
 *   });
 */

import axios, { AxiosInstance, AxiosError } from 'axios';

// =============================================================================
// TYPES
// =============================================================================

export type SupportedLanguage = 'java' | 'typescript' | 'python' | 'go' | 'rust' | 'ruby' | 'php' | 'dotnet';
export type UserTier = 'basic' | 'pro' | 'enterprise';
export type AnalysisMode = 'quick' | 'standard' | 'complete';

export interface TestScenario {
  name: string;
  repoUrl: string;
  prNumber: number;
  language: SupportedLanguage;
  tier?: UserTier;
  analysisMode?: AnalysisMode;
  expectedToolCount?: number;
  expectedMinIssues?: number;
  timeout?: number; // ms
}

export interface RunnerConfig {
  apiBaseUrl?: string;
  apiKey?: string;
  defaultTimeout?: number;
  userId?: string;
  verbose?: boolean;
}

export interface AnalysisStartResult {
  analysisId: string;
  statusUrl: string;
  estimatedDuration?: number;
}

export interface AnalysisProgress {
  status: 'pending' | 'analyzing' | 'finalizing' | 'completed' | 'failed';
  progress: number;
  currentPhase?: string;
  message?: string;
}

export interface IssueSummary {
  total: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
  byCategory: Record<string, number>;
  byTool: Record<string, number>;
}

export interface ScoreBreakdown {
  overall: number;
  grade: string;
  security: number;
  quality: number;
  performance: number;
  architecture: number;
  dependencies: number;
}

export interface TestResult {
  success: boolean;
  scenario: TestScenario;
  analysisId?: string;
  duration: number;

  // Analysis results
  issues?: IssueSummary;
  score?: ScoreBreakdown;
  toolsExecuted?: string[];

  // Report sections (tier-dependent)
  hasGamification?: boolean;
  hasHistoricalData?: boolean;
  hasAutoFix?: boolean;
  hasIDEIntegration?: boolean;

  // Errors
  error?: string;
  errorPhase?: string;
}

export interface BatchTestResult {
  total: number;
  passed: number;
  failed: number;
  results: TestResult[];
  duration: number;
}

// =============================================================================
// UNIFIED API TEST RUNNER
// =============================================================================

export class UnifiedAPITestRunner {
  private client: AxiosInstance;
  private config: Required<RunnerConfig>;

  constructor(config: RunnerConfig = {}) {
    this.config = {
      apiBaseUrl: config.apiBaseUrl || process.env.API_BASE_URL || 'http://129.212.136.24',
      apiKey: config.apiKey || process.env.CODEQUAL_API_KEY || '',
      defaultTimeout: config.defaultTimeout || 600000, // 10 minutes
      userId: config.userId || 'test-user',
      verbose: config.verbose ?? true,
    };

    this.client = axios.create({
      baseURL: this.config.apiBaseUrl,
      timeout: this.config.defaultTimeout,
      headers: {
        'Content-Type': 'application/json',
        ...(this.config.apiKey ? { 'X-API-Key': this.config.apiKey } : {}),
      },
    });
  }

  /**
   * Run a single test scenario
   */
  async runTest(scenario: TestScenario): Promise<TestResult> {
    const startTime = Date.now();
    const tier = scenario.tier || 'basic';
    const timeout = scenario.timeout || this.config.defaultTimeout;

    if (this.config.verbose) {
      this.log(`\n${'═'.repeat(70)}`);
      this.log(`🧪 Testing: ${scenario.name}`);
      this.log(`   Language: ${scenario.language} | Tier: ${tier.toUpperCase()}`);
      this.log(`   Repo: ${scenario.repoUrl}`);
      this.log(`   PR: #${scenario.prNumber}`);
      this.log(`${'═'.repeat(70)}`);
    }

    try {
      // Step 1: Start analysis
      if (this.config.verbose) {
        this.log('\n📤 Step 1: Starting analysis...');
      }

      const startResult = await this.startAnalysis(scenario, tier);

      if (this.config.verbose) {
        this.log(`   ✅ Analysis started: ${startResult.analysisId}`);
      }

      // Step 2: Wait for completion
      if (this.config.verbose) {
        this.log('\n⏳ Step 2: Waiting for analysis...');
      }

      const analysisResult = await this.waitForCompletion(startResult.analysisId, timeout);

      // Step 3: Get unified report
      if (this.config.verbose) {
        this.log('\n📊 Step 3: Fetching unified report...');
      }

      const report = await this.getUnifiedReport(startResult.analysisId, tier);

      // Step 4: Validate results
      const result = this.validateResults(scenario, analysisResult, report, Date.now() - startTime);
      result.analysisId = startResult.analysisId;

      if (this.config.verbose) {
        this.printTestResult(result);
      }

      return result;

    } catch (error: any) {
      const result: TestResult = {
        success: false,
        scenario,
        duration: Date.now() - startTime,
        error: error.message || String(error),
        errorPhase: this.getErrorPhase(error),
      };

      if (this.config.verbose) {
        this.log(`\n❌ Test failed: ${result.error}`);
      }

      return result;
    }
  }

  /**
   * Run multiple test scenarios
   */
  async runBatch(scenarios: TestScenario[]): Promise<BatchTestResult> {
    const startTime = Date.now();
    const results: TestResult[] = [];

    this.log('\n╔══════════════════════════════════════════════════════════════════╗');
    this.log('║           UNIFIED API TEST RUNNER - BATCH MODE                   ║');
    this.log('╠══════════════════════════════════════════════════════════════════╣');
    this.log(`║  API URL: ${this.config.apiBaseUrl.padEnd(54)}║`);
    this.log(`║  Scenarios: ${scenarios.length.toString().padEnd(52)}║`);
    this.log('╚══════════════════════════════════════════════════════════════════╝');

    for (const scenario of scenarios) {
      const result = await this.runTest(scenario);
      results.push(result);
    }

    const passed = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;

    this.printBatchSummary(results, passed, failed, Date.now() - startTime);

    return {
      total: scenarios.length,
      passed,
      failed,
      results,
      duration: Date.now() - startTime,
    };
  }

  /**
   * Run tests for a specific language across multiple repositories
   */
  async runLanguageTests(language: SupportedLanguage, scenarios: Omit<TestScenario, 'language'>[]): Promise<BatchTestResult> {
    const fullScenarios: TestScenario[] = scenarios.map(s => ({
      ...s,
      language,
    }));

    return this.runBatch(fullScenarios);
  }

  // ===========================================================================
  // API METHODS
  // ===========================================================================

  private async startAnalysis(scenario: TestScenario, tier: UserTier): Promise<AnalysisStartResult> {
    const response = await this.client.post('/api/v9/analyze', {
      repositoryUrl: scenario.repoUrl,
      prNumber: scenario.prNumber,
      language: scenario.language,
      userTier: tier,
      userId: this.config.userId,
      analysisMode: scenario.analysisMode || 'standard',
      options: {
        generateFixes: tier === 'pro',
        includeEducational: true,
      },
    });

    return {
      analysisId: response.data.analysisId,
      statusUrl: response.data.statusUrl,
      estimatedDuration: response.data.estimatedDuration,
    };
  }

  private async waitForCompletion(analysisId: string, timeoutMs: number): Promise<any> {
    const startTime = Date.now();
    let lastProgress = -1;

    while (Date.now() - startTime < timeoutMs) {
      try {
        const response = await this.client.get(`/api/v9/analyze/${analysisId}`);

        if (response.status === 200 && response.data.success) {
          if (this.config.verbose) {
            this.log('   ✅ Analysis complete');
          }
          return response.data;
        }

        if (response.status === 202) {
          const progress = response.data;
          if (progress.progress !== lastProgress && this.config.verbose) {
            this.log(`   [${progress.status}] ${progress.progress}% - ${progress.currentPhase || ''}`);
            lastProgress = progress.progress;
          }
        }
      } catch (error: any) {
        if (error.response?.status === 404) {
          throw new Error(`Analysis not found: ${analysisId}`);
        }
        // Continue polling on transient errors
      }

      await this.sleep(3000); // Poll every 3 seconds
    }

    throw new Error(`Analysis timeout after ${timeoutMs / 1000}s`);
  }

  private async getUnifiedReport(analysisId: string, tier: UserTier): Promise<any> {
    const response = await this.client.post('/api/v9/reports', {
      analysisId,
      userId: this.config.userId,
      tier,
    });

    return response.data;
  }

  // ===========================================================================
  // VALIDATION
  // ===========================================================================

  private validateResults(
    scenario: TestScenario,
    analysisResult: any,
    report: any,
    duration: number
  ): TestResult {
    const tier = scenario.tier || 'basic';

    // Extract issues summary
    const issues: IssueSummary = {
      total: analysisResult.summary?.totalIssues || 0,
      critical: analysisResult.summary?.critical || 0,
      high: analysisResult.summary?.high || 0,
      medium: analysisResult.summary?.medium || 0,
      low: analysisResult.summary?.low || 0,
      byCategory: {},
      byTool: {},
    };

    // Group by category and tool
    if (analysisResult.issues) {
      for (const issue of analysisResult.issues) {
        issues.byCategory[issue.category] = (issues.byCategory[issue.category] || 0) + 1;
        issues.byTool[issue.tool] = (issues.byTool[issue.tool] || 0) + 1;
      }
    }

    // Extract score
    const score: ScoreBreakdown = {
      overall: analysisResult.score?.overall || 0,
      grade: analysisResult.score?.grade || 'N/A',
      security: analysisResult.score?.security || 0,
      quality: analysisResult.score?.quality || 0,
      performance: analysisResult.score?.performance || 0,
      architecture: analysisResult.score?.architecture || 0,
      dependencies: analysisResult.score?.dependencies || 0,
    };

    // Check report sections
    const hasGamification = report?.skillsAndAchievements !== undefined;
    const hasHistoricalData = report?.progressHistory !== undefined;
    const hasAutoFix = tier === 'pro' && report?.fixSummary !== undefined;
    const hasIDEIntegration = tier === 'basic' && report?.ideIntegration !== undefined;

    // Validate expectations
    let success = true;

    if (scenario.expectedToolCount && Object.keys(issues.byTool).length < scenario.expectedToolCount) {
      success = false;
    }

    if (scenario.expectedMinIssues && issues.total < scenario.expectedMinIssues) {
      success = false;
    }

    // Gamification and history should be present for ALL tiers
    if (!hasGamification || !hasHistoricalData) {
      success = false;
    }

    return {
      success,
      scenario,
      duration,
      issues,
      score,
      toolsExecuted: Object.keys(issues.byTool),
      hasGamification,
      hasHistoricalData,
      hasAutoFix,
      hasIDEIntegration,
    };
  }

  // ===========================================================================
  // HELPERS
  // ===========================================================================

  private getErrorPhase(error: any): string {
    if (error instanceof AxiosError) {
      const url = error.config?.url || '';
      if (url.includes('/analyze') && error.config?.method === 'post') {
        return 'start_analysis';
      }
      if (url.includes('/analyze/')) {
        return 'poll_status';
      }
      if (url.includes('/reports')) {
        return 'get_report';
      }
    }
    return 'unknown';
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private log(message: string): void {
    console.log(message);
  }

  private printTestResult(result: TestResult): void {
    const status = result.success ? '✅ PASSED' : '❌ FAILED';

    this.log(`\n${status}`);
    this.log(`   Duration: ${(result.duration / 1000).toFixed(1)}s`);

    if (result.score) {
      this.log(`   Score: ${result.score.overall}/100 (${result.score.grade})`);
    }

    if (result.issues) {
      this.log(`   Issues: ${result.issues.total} (C:${result.issues.critical} H:${result.issues.high} M:${result.issues.medium} L:${result.issues.low})`);
    }

    if (result.toolsExecuted) {
      this.log(`   Tools: ${result.toolsExecuted.join(', ')}`);
    }

    this.log(`   Gamification: ${result.hasGamification ? '✅' : '❌'}`);
    this.log(`   Historical Data: ${result.hasHistoricalData ? '✅' : '❌'}`);

    if (result.scenario.tier === 'pro') {
      this.log(`   Auto-Fix: ${result.hasAutoFix ? '✅' : '❌'}`);
    } else {
      this.log(`   IDE Integration: ${result.hasIDEIntegration ? '✅' : '❌'}`);
    }

    if (result.error) {
      this.log(`   Error: ${result.error}`);
    }
  }

  private printBatchSummary(results: TestResult[], passed: number, failed: number, duration: number): void {
    this.log('\n═══════════════════════════════════════════════════════════════════');
    this.log('BATCH TEST SUMMARY');
    this.log('═══════════════════════════════════════════════════════════════════\n');

    this.log(`Total: ${results.length} | ✅ Passed: ${passed} | ❌ Failed: ${failed}`);
    this.log(`Duration: ${(duration / 1000).toFixed(1)}s`);

    // Group by language
    this.log('\nBy Language:');
    const byLanguage = new Map<string, { passed: number; failed: number }>();
    for (const result of results) {
      const lang = result.scenario.language;
      const current = byLanguage.get(lang) || { passed: 0, failed: 0 };
      if (result.success) {
        current.passed++;
      } else {
        current.failed++;
      }
      byLanguage.set(lang, current);
    }

    for (const [lang, stats] of byLanguage) {
      const status = stats.failed === 0 ? '✅' : '❌';
      this.log(`  ${status} ${lang}: ${stats.passed}/${stats.passed + stats.failed}`);
    }

    // Show failed tests
    const failedTests = results.filter(r => !r.success);
    if (failedTests.length > 0) {
      this.log('\nFailed Tests:');
      for (const result of failedTests) {
        this.log(`  ❌ ${result.scenario.name}: ${result.error || 'Unknown error'}`);
      }
    }

    this.log('\n═══════════════════════════════════════════════════════════════════\n');
  }
}

// =============================================================================
// PREDEFINED TEST SCENARIOS
// =============================================================================

/**
 * Get predefined test scenarios for a language
 */
export function getLanguageScenarios(language: SupportedLanguage): TestScenario[] {
  const scenarios: Record<SupportedLanguage, TestScenario[]> = {
    java: [
      {
        name: 'Spring PetClinic',
        repoUrl: 'https://github.com/spring-projects/spring-petclinic',
        prNumber: 950,
        language: 'java',
        expectedToolCount: 3,
      },
    ],
    typescript: [
      {
        name: 'Express.js',
        repoUrl: 'https://github.com/expressjs/express',
        prNumber: 5678,
        language: 'typescript',
        expectedToolCount: 3,
      },
    ],
    python: [
      {
        name: 'Flask',
        repoUrl: 'https://github.com/pallets/flask',
        prNumber: 5000,
        language: 'python',
        expectedToolCount: 4,
      },
    ],
    go: [
      {
        name: 'Gin Web Framework',
        repoUrl: 'https://github.com/gin-gonic/gin',
        prNumber: 3800,
        language: 'go',
        expectedToolCount: 4,
      },
    ],
    rust: [
      {
        name: 'Tokio',
        repoUrl: 'https://github.com/tokio-rs/tokio',
        prNumber: 6500,
        language: 'rust',
        expectedToolCount: 2,
      },
    ],
    ruby: [
      {
        name: 'Sinatra',
        repoUrl: 'https://github.com/sinatra/sinatra',
        prNumber: 1900,
        language: 'ruby',
        expectedToolCount: 3,
      },
    ],
    php: [
      {
        name: 'Laravel Framework',
        repoUrl: 'https://github.com/laravel/framework',
        prNumber: 50000,
        language: 'php',
        expectedToolCount: 3,
      },
    ],
    dotnet: [
      {
        name: 'ASP.NET Core',
        repoUrl: 'https://github.com/dotnet/aspnetcore',
        prNumber: 50000,
        language: 'dotnet',
        expectedToolCount: 2,
      },
    ],
  };

  return scenarios[language] || [];
}

/**
 * Get all predefined test scenarios
 */
export function getAllScenarios(): TestScenario[] {
  const languages: SupportedLanguage[] = ['java', 'typescript', 'python', 'go', 'rust', 'ruby', 'php'];
  return languages.flatMap(lang => getLanguageScenarios(lang));
}

// =============================================================================
// CONVENIENCE FUNCTIONS
// =============================================================================

/**
 * Quick test a single language
 */
export async function testLanguage(
  language: SupportedLanguage,
  config?: RunnerConfig
): Promise<BatchTestResult> {
  const runner = new UnifiedAPITestRunner(config);
  const scenarios = getLanguageScenarios(language);
  return runner.runBatch(scenarios);
}

/**
 * Quick test all languages
 */
export async function testAllLanguages(config?: RunnerConfig): Promise<BatchTestResult> {
  const runner = new UnifiedAPITestRunner(config);
  const scenarios = getAllScenarios();
  return runner.runBatch(scenarios);
}

/**
 * Quick test with both tiers
 */
export async function testWithBothTiers(
  scenario: Omit<TestScenario, 'tier'>,
  config?: RunnerConfig
): Promise<{ basic: TestResult; pro: TestResult }> {
  const runner = new UnifiedAPITestRunner(config);

  const basic = await runner.runTest({ ...scenario, tier: 'basic' } as TestScenario);
  const pro = await runner.runTest({ ...scenario, tier: 'pro' } as TestScenario);

  return { basic, pro };
}
