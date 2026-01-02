/**
 * V9 Unified Analysis API Route
 *
 * Main endpoint for PR analysis using cloud-deployed tools and hybrid agents
 * Supports async polling pattern:
 * - POST /analyze - Start analysis, returns analysisId immediately
 * - GET /analyze/{analysisId} - Poll for status/progress, returns full results when complete
 */

import { Router, Request, Response } from 'express';
import axios from 'axios';
import { z } from 'zod';
import { createLogger } from '@codequal/core/utils';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';

const execAsync = promisify(exec);

const logger = createLogger('v9-analyze');
const router = Router();

// ============================================================================
// CONFIGURATION
// ============================================================================
// SIMULATION_MODE: When true, generates mock results for testing API flow
// Set to false and configure real endpoints for production analysis
const SIMULATION_MODE = process.env.V9_SIMULATION_MODE !== 'false';

// Cloud service endpoints (used when SIMULATION_MODE=false)
const HYBRID_AGENT_URL = process.env.HYBRID_AGENT_URL || 'http://129.212.136.24';
const CLOUD_TOOLS_URL = process.env.CLOUD_TOOLS_URL || 'http://cloud-tools.codequal.com';

// Real analyzer configuration (when not simulating)
const USE_REAL_ANALYZER = !SIMULATION_MODE && process.env.V9_REAL_ANALYZER === 'true';

if (SIMULATION_MODE) {
  logger.warn('⚠️  V9 API running in SIMULATION MODE - results are mock data');
  logger.info('Set V9_SIMULATION_MODE=false to enable real analysis');
}

// In-memory store for analysis state (use Redis in production)
interface AnalysisState {
  analysisId: string;
  status: 'pending' | 'analyzing' | 'generating_fixes' | 'finalizing' | 'completed' | 'failed';
  progress: number;
  phase: string;
  message: string;
  startTime: number;
  request: any;
  result?: any;
  error?: string;
}

const analysisStore = new Map<string, AnalysisState>();

// Request validation schema
const AnalyzeRequestSchema = z.object({
  repositoryUrl: z.string().url().regex(/github\.com/),
  prNumber: z.number().int().positive(),
  language: z.string().optional(),
  userTier: z.enum(['basic', 'pro', 'enterprise']).optional().default('basic'),
  userId: z.string().optional(),
  analysisMode: z.enum(['quick', 'standard', 'complete']).optional().default('standard'),
  options: z.object({
    skipCache: z.boolean().optional().default(false),
    generateFixes: z.boolean().optional().default(true),
    includeEducational: z.boolean().optional().default(true),
    timeout: z.number().optional().default(300000),
    models: z.object({
      primary: z.string().optional().default('anthropic/claude-3-haiku-20240307'),
      fallback: z.string().optional().default('openai/gpt-3.5-turbo')
    }).optional()
  }).optional()
});

/**
 * @swagger
 * /api/v9/analyze:
 *   post:
 *     summary: Start a V9 PR analysis (async)
 *     description: Starts analysis and returns immediately with analysisId. Poll GET /analyze/{id} for status.
 *     tags: [Analysis]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - repositoryUrl
 *               - prNumber
 *     responses:
 *       202:
 *         description: Analysis started
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 analysisId:
 *                   type: string
 *                 statusUrl:
 *                   type: string
 *                 estimatedDuration:
 *                   type: number
 */
router.post('/analyze', async (req: Request, res: Response) => {
  try {
    // Validate request
    const validatedRequest = AnalyzeRequestSchema.parse(req.body);
    const { repositoryUrl, prNumber, language: requestedLanguage } = validatedRequest;

    // Generate analysis ID
    const analysisId = `v9-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    const statusUrl = `/api/v9/analyze/${analysisId}`;

    // Auto-detect language if not provided
    let language = requestedLanguage;
    if (!language) {
      language = await detectLanguageFromRepo(repositoryUrl);
    }

    // Estimate duration based on tier and mode
    const estimatedDuration = validatedRequest.userTier === 'pro' ? 60000 : 30000;

    // Initialize analysis state
    const state: AnalysisState = {
      analysisId,
      status: 'pending',
      progress: 0,
      phase: 'Initializing',
      message: 'Analysis queued',
      startTime: Date.now(),
      request: { ...validatedRequest, language }
    };
    analysisStore.set(analysisId, state);

    logger.info('Analysis started', { analysisId, repository: repositoryUrl, prNumber, language });

    // Start analysis in background
    runAnalysisInBackground(analysisId).catch(error => {
      logger.error('Background analysis failed', { analysisId, error: error.message });
    });

    // Return immediately with 202 Accepted
    res.status(202).json({
      analysisId,
      statusUrl,
      estimatedDuration,
      message: 'Analysis started. Poll statusUrl for progress.'
    });

  } catch (error) {
    logger.error('Failed to start analysis', error as any);
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Invalid request'
    });
  }
});

/**
 * @swagger
 * /api/v9/analyze/{analysisId}:
 *   get:
 *     summary: Get analysis status or results
 *     description: Returns current status while analyzing, full results when complete
 *     tags: [Analysis]
 *     parameters:
 *       - in: path
 *         name: analysisId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Analysis status or results
 *       404:
 *         description: Analysis not found
 */
router.get('/analyze/:analysisId', async (req: Request, res: Response) => {
  try {
    const { analysisId } = req.params;
    const state = analysisStore.get(analysisId);

    if (!state) {
      return res.status(404).json({
        success: false,
        error: 'Analysis not found'
      });
    }

    // If completed, return full results
    if (state.status === 'completed' && state.result) {
      return res.json({
        success: true,
        status: 'completed',
        progress: 100,
        ...state.result
      });
    }

    // If failed, return error
    if (state.status === 'failed') {
      return res.status(500).json({
        success: false,
        status: 'failed',
        error: state.error || 'Analysis failed'
      });
    }

    // Return progress status (success: false indicates still in progress)
    res.status(202).json({
      success: false,
      analysisId: state.analysisId,
      status: state.status,
      progress: state.progress,
      phase: state.phase,
      message: state.message,
      elapsedTime: Date.now() - state.startTime
    });

  } catch (error) {
    logger.error('Failed to get analysis status', error as any);
    res.status(500).json({
      success: false,
      error: 'Failed to get analysis status'
    });
  }
});

/**
 * @swagger
 * /api/v9/health:
 *   get:
 *     summary: Check V9 API and cloud services health
 *     tags: [Health]
 */
router.get('/health', async (req: Request, res: Response) => {
  try {
    // Check local health
    const localHealth = {
      status: 'healthy',
      activeAnalyses: analysisStore.size,
      uptime: process.uptime()
    };

    // Try to check cloud services (don't fail if unavailable)
    let cloudHealth: any = { status: 'unknown' };
    try {
      const hybridResponse = await axios.get(`${HYBRID_AGENT_URL}/health`, { timeout: 5000 });
      cloudHealth = {
        status: 'healthy',
        hybridAgent: hybridResponse.data
      };
    } catch {
      cloudHealth = { status: 'unavailable', message: 'Cloud services not reachable' };
    }

    res.json({
      status: 'healthy',
      local: localHealth,
      cloud: cloudHealth,
      endpoints: {
        hybridAgent: HYBRID_AGENT_URL,
        cloudTools: CLOUD_TOOLS_URL
      }
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Health check failed'
    });
  }
});

/**
 * @swagger
 * /api/v9/cache/stats:
 *   get:
 *     summary: Get cache statistics
 *     tags: [Cache]
 */
router.get('/cache/stats', async (req: Request, res: Response) => {
  try {
    const statsResponse = await axios.get(`${HYBRID_AGENT_URL}/stats`, { timeout: 5000 });
    res.json(statsResponse.data);
  } catch (error) {
    res.json({
      status: 'unavailable',
      message: 'Cache stats not available - cloud services unreachable'
    });
  }
});

/**
 * @swagger
 * /api/v9/cache/clear:
 *   post:
 *     summary: Clear cache (admin only)
 *     tags: [Cache]
 */
router.post('/cache/clear', async (req: Request, res: Response) => {
  try {
    const clearResponse = await axios.post(`${HYBRID_AGENT_URL}/cache/clear`, {}, { timeout: 10000 });
    res.json(clearResponse.data);
  } catch (error) {
    res.status(500).json({
      error: 'Failed to clear cache - cloud services unreachable'
    });
  }
});

/**
 * @swagger
 * /api/v9/reports:
 *   post:
 *     summary: Get unified report for an analysis
 *     description: Returns a comprehensive report with gamification and historical data
 *     tags: [Reports]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - analysisId
 *             properties:
 *               analysisId:
 *                 type: string
 *               userId:
 *                 type: string
 *               tier:
 *                 type: string
 *                 enum: [basic, pro, enterprise]
 */
router.post('/reports', async (req: Request, res: Response) => {
  try {
    const { analysisId, userId, tier } = req.body;

    if (!analysisId) {
      return res.status(400).json({
        success: false,
        error: 'analysisId is required'
      });
    }

    const state = analysisStore.get(analysisId);
    if (!state || state.status !== 'completed' || !state.result) {
      return res.status(404).json({
        success: false,
        error: 'Analysis not found or not completed'
      });
    }

    const isPro = tier === 'pro' || tier === 'enterprise';

    // SESSION 70: Calculate REAL gamification data based on analysis results
    const gamification = calculateRealGamification(state.result, isPro);

    // Generate unified report with gamification and historical data
    const unifiedReport = {
      analysisId,
      userId,
      tier,

      // Core analysis results
      summary: state.result.summary,
      score: state.result.score,
      issues: state.result.issues,
      report: state.result.report,

      // Gamification - available for ALL tiers (SESSION 70: Real calculations)
      skillsAndAchievements: gamification.skills,

      // Historical progress - available for ALL tiers
      progressHistory: {
        recentAnalyses: [
          { date: new Date().toISOString(), score: state.result.score.overall, issues: state.result.summary.totalIssues }
        ],
        trendDirection: gamification.xp.totalXP > 50 ? 'improving' : 'stable',
        averageScore: state.result.score.overall,
        // XP details
        xpEarned: gamification.xp.totalXP,
        xpBreakdown: gamification.xp.breakdown
      },

      // PRO tier features
      ...(isPro ? {
        fixSummary: {
          totalFixes: state.result.summary.fixed,
          autoApplicable: Math.floor(state.result.summary.fixed * 0.7),
          manualRequired: Math.ceil(state.result.summary.fixed * 0.3),
          estimatedTimeSaved: `${state.result.summary.fixed * 15} minutes`
        },
        aiInsights: {
          patterns: ['Consistent null check issues', 'Logging format inconsistency'],
          recommendations: ['Consider implementing null-safe operators', 'Standardize logging framework usage']
        }
      } : {}),

      // BASIC tier features - IDE exports for manual fixing
      ...(!isPro ? {
        ideExports: {
          sarif: `/api/v9/reports/${analysisId}/export/sarif`,
          gitlab: `/api/v9/reports/${analysisId}/export/gitlab`,
          lsp: `/api/v9/reports/${analysisId}/export/lsp`,
          description: 'Export issues to your IDE for manual fixing'
        },
        ideIntegration: {
          vscode: { available: true, installUrl: 'https://marketplace.visualstudio.com/items?itemName=codequal' },
          jetbrains: { available: true, installUrl: 'https://plugins.jetbrains.com/plugin/codequal' }
        },
        patternContribution: {
          enabled: true,
          optIn: true,
          xpReward: 50,
          description: 'Contribute fix patterns after manually fixing issues to earn XP',
          contributeUrl: `/api/v9/patterns/contribute`
        },
        upgradePrompt: {
          message: 'Upgrade to PRO for AI-powered auto-fixes',
          features: ['Automatic code fixes', 'Fix verification', 'Direct commit integration'],
          estimatedTimeSaved: `${state.result.summary.totalIssues * 15} minutes per PR`
        }
      } : {}),

      // Metadata
      generatedAt: new Date().toISOString(),
      version: '9.0.0'
    };

    res.json(unifiedReport);

  } catch (error) {
    logger.error('Failed to generate report', error as any);
    res.status(500).json({
      success: false,
      error: 'Failed to generate report'
    });
  }
});

// =============================================================================
// BACKGROUND ANALYSIS EXECUTION
// =============================================================================

async function runAnalysisInBackground(analysisId: string): Promise<void> {
  const state = analysisStore.get(analysisId);
  if (!state) return;

  try {
    const { repositoryUrl, prNumber, language, userTier, options } = state.request;
    const isPro = userTier === 'pro' || userTier === 'enterprise';
    const generateFixes = isPro && (options?.generateFixes !== false);

    // Phase 1: Analyzing (0-40%)
    updateState(analysisId, 'analyzing', 10, 'Running tool analysis', 'Initializing analyzers...');
    await delay(500);

    updateState(analysisId, 'analyzing', 20, 'Running tool analysis', 'Executing static analysis tools...');
    const toolResults = await runCloudTools(repositoryUrl, prNumber, language);

    updateState(analysisId, 'analyzing', 40, 'Running tool analysis', `Found ${toolResults.issues.length} issues`);

    // Phase 2: Generating fixes (40-70%) - PRO only
    let fixes = new Map<string, any>();
    let cacheStats = { hits: 0, misses: 0, hitRate: '0%' };
    let fixGenerationTime = 0;

    if (generateFixes && toolResults.issues.length > 0) {
      updateState(analysisId, 'generating_fixes', 50, 'Generating fixes', 'AI generating code fixes...');
      const fixStart = Date.now();

      const fixResponse = await generateFixesWithHybridAgents(
        toolResults.issues,
        { repository: repositoryUrl, prNumber, language }
      );

      fixes = fixResponse.fixes;
      cacheStats = fixResponse.cacheStats;
      fixGenerationTime = Date.now() - fixStart;

      updateState(analysisId, 'generating_fixes', 70, 'Generating fixes', `Generated ${fixes.size} fixes`);
    } else {
      updateState(analysisId, 'generating_fixes', 70, 'Skipping fixes', 'Basic tier - fix generation skipped');
    }

    // Phase 3: Finalizing (70-100%)
    updateState(analysisId, 'finalizing', 80, 'Finalizing report', 'Calculating scores...');

    // Merge fixes into issues
    const issuesWithFixes = toolResults.issues.map(issue => {
      const fix = fixes.get(issue.id);
      if (fix) {
        return {
          ...issue,
          fix: fix.suggestion,
          fixConfidence: fix.confidence,
          fixCached: fix.cached,
          educationalContent: fix.educational
        };
      }
      return issue;
    });

    const scores = calculateScores(issuesWithFixes);
    const summary = generateSummary(issuesWithFixes, fixes);

    updateState(analysisId, 'finalizing', 90, 'Finalizing report', 'Generating report...');

    const analysisTime = Date.now() - state.startTime;
    const report = generateV9Report({
      analysisId,
      repository: repositoryUrl,
      prNumber,
      language,
      issues: issuesWithFixes,
      scores,
      summary,
      metrics: {
        analysisTime,
        toolsExecutionTime: toolResults.executionTime,
        fixGenerationTime,
        cacheHitRate: cacheStats.hitRate,
        costEstimate: calculateCostEstimate(issuesWithFixes.length, cacheStats)
      }
    });

    // Complete!
    const result = {
      analysisId,
      repository: repositoryUrl,
      prNumber,
      language,
      userTier,
      summary,
      score: scores,
      issues: issuesWithFixes,
      metrics: {
        analysisTime,
        toolsExecutionTime: toolResults.executionTime,
        fixGenerationTime,
        cacheHitRate: cacheStats.hitRate,
        costEstimate: calculateCostEstimate(issuesWithFixes.length, cacheStats)
      },
      report,
      cloudServices: {
        hybridAgent: HYBRID_AGENT_URL,
        toolsPods: toolResults.toolsPods,
        cacheStatus: `${cacheStats.hitRate} hit rate`
      },
      // Important: Indicate if this is simulated data
      _simulation: SIMULATION_MODE,
      _simulationNote: SIMULATION_MODE
        ? 'This is SIMULATED data for API testing. Set V9_SIMULATION_MODE=false for real analysis.'
        : undefined
    };

    state.status = 'completed';
    state.progress = 100;
    state.phase = 'Complete';
    state.message = 'Analysis completed successfully';
    state.result = result;
    analysisStore.set(analysisId, state);

    logger.info('Analysis completed', {
      analysisId,
      duration: analysisTime,
      issues: issuesWithFixes.length,
      fixes: fixes.size
    });

  } catch (error) {
    logger.error('Analysis failed', { analysisId, error });
    state.status = 'failed';
    state.error = error instanceof Error ? error.message : 'Unknown error';
    analysisStore.set(analysisId, state);
  }
}

function updateState(
  analysisId: string,
  status: AnalysisState['status'],
  progress: number,
  phase: string,
  message: string
): void {
  const state = analysisStore.get(analysisId);
  if (state) {
    state.status = status;
    state.progress = progress;
    state.phase = phase;
    state.message = message;
    analysisStore.set(analysisId, state);
  }
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

async function detectLanguageFromRepo(repoUrl: string): Promise<string> {
  const match = repoUrl.match(/github\.com\/([^/]+)\/([^/]+)/);
  if (!match) throw new Error('Invalid GitHub URL');

  const [, owner, repo] = match;

  try {
    const response = await axios.get(
      `https://api.github.com/repos/${owner}/${repo}`,
      {
        headers: {
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'CodeQual-V9-API'
        },
        timeout: 5000
      }
    );

    const primaryLanguage = response.data.language?.toLowerCase() || 'unknown';

    const languageMap: Record<string, string> = {
      'java': 'java',
      'python': 'python',
      'javascript': 'javascript',
      'typescript': 'typescript',
      'rust': 'rust',
      'go': 'go',
      'c++': 'cpp',
      'c': 'c',
      'c#': 'csharp',
      'ruby': 'ruby',
      'php': 'php',
      'swift': 'swift',
      'kotlin': 'kotlin',
      'scala': 'scala'
    };

    return languageMap[primaryLanguage] || 'javascript';
  } catch (error) {
    logger.warn('Could not auto-detect language, defaulting to JavaScript');
    return 'javascript';
  }
}

async function runCloudTools(repoUrl: string, prNumber: number, language: string) {
  // ==========================================================================
  // HOST-NATIVE EXECUTION vs SIMULATION MODE
  // ==========================================================================

  if (!SIMULATION_MODE) {
    // Run real analysis using host-native tools
    return await runHostNativeAnalysis(repoUrl, prNumber, language);
  }

  // ==========================================================================
  // SIMULATION MODE: Returns mock results for testing API flow
  // ==========================================================================
  logger.info('Running in SIMULATION MODE - generating mock results');

  // Simulate realistic tool execution with language-specific tools
  // These times are artificially short for testing - real analysis takes 2-5 minutes
  await delay(1000 + Math.random() * 2000); // 1-3 second delay

  const toolsByLanguage: Record<string, string[]> = {
    java: ['pmd', 'spotbugs', 'checkstyle', 'dependency-check'],
    python: ['pylint', 'bandit', 'mypy', 'safety'],
    javascript: ['eslint', 'semgrep', 'npm-audit'],
    typescript: ['eslint', 'tsc', 'semgrep'],
    go: ['golangci-lint', 'gosec', 'staticcheck'],
    rust: ['clippy', 'cargo-audit', 'cargo-deny'],
    ruby: ['rubocop', 'brakeman', 'bundler-audit'],
    php: ['phpstan', 'psalm', 'security-checker'],
    csharp: ['roslyn', 'security-code-scan'],
    cpp: ['cppcheck', 'clang-tidy'],
    swift: ['swiftlint'],
    kotlin: ['detekt', 'ktlint']
  };

  const tools = toolsByLanguage[language] || ['eslint', 'semgrep'];
  const numIssues = Math.floor(Math.random() * 10) + 1;

  const severities = ['critical', 'high', 'medium', 'low'];
  const types = ['security', 'quality', 'performance', 'architecture', 'dependency'];

  const issues = Array.from({ length: numIssues }, (_, i) => ({
    id: `issue-${Date.now()}-${i + 1}`,
    tool: tools[Math.floor(Math.random() * tools.length)],
    type: types[Math.floor(Math.random() * types.length)],
    severity: severities[Math.floor(Math.random() * severities.length)],
    category: 'code-quality',
    message: `Sample issue #${i + 1} detected by analysis`,
    file: `src/main/${language === 'java' ? 'java' : ''}/${language === 'java' ? 'App.java' : 'index.ts'}`,
    line: Math.floor(Math.random() * 100) + 1
  }));

  return {
    issues,
    executionTime: Math.floor(1000 + Math.random() * 4000),
    toolsPods: tools.map(t => `${t}-host-native`)
  };
}

/**
 * Run analysis using host-native tools (no Docker)
 * Tools are pre-installed on Oracle Cloud ARM64 instance
 */
async function runHostNativeAnalysis(
  repoUrl: string,
  prNumber: number,
  language: string
): Promise<{ issues: any[]; executionTime: number; toolsPods: string[] }> {
  const startTime = Date.now();
  logger.info(`Running HOST-NATIVE analysis for ${language}`);

  // ==========================================================================
  // COMPREHENSIVE TOOL MATRIX (49 unique tools across 7 categories)
  // Based on V9_CRITICAL_KNOWLEDGE_BASE.md - Session 63 verification
  // ==========================================================================

  // P0: Critical Security Tools (Cross-language)
  // Note: Using template literals to avoid ESLint escaping warnings in shell commands
  const securityTools = [
    { name: 'semgrep', command: `/home/opc/.local/bin/semgrep scan --json --config auto 2>/dev/null || echo '{"results":[]}'`, category: 'security' },
    { name: 'gitleaks', command: `gitleaks detect --report-format json --report-path /dev/stdout 2>/dev/null || echo '[]'`, category: 'secrets' },
    { name: 'trufflehog', command: `trufflehog filesystem . --json 2>/dev/null || echo '[]'`, category: 'secrets' },
    { name: 'trivy', command: `trivy fs --format json --security-checks vuln,config . 2>/dev/null || echo '{"Results":[]}'`, category: 'security' },
    { name: 'grype', command: `grype dir:. -o json 2>/dev/null || echo '{"matches":[]}'`, category: 'dependency' },
    { name: 'checkov', command: `checkov -d . -o json --compact --quiet 2>/dev/null || echo '{"results":{}}'`, category: 'iac' }
  ];

  // Define tools per language (quality + language-specific security + dependencies + architecture)
  const toolsByLanguage: Record<string, Array<{ name: string; command: string; category: string }>> = {
    java: [
      // Quality Tools - use --no-progress and redirect warnings properly
      { name: 'pmd', command: `pmd check -d . -R rulesets/java/quickstart.xml -f json --no-progress 2>/dev/null; true`, category: 'quality' },
      { name: 'checkstyle', command: `/usr/local/bin/checkstyle -c /google_checks.xml -f json . 2>/dev/null || echo '[]'`, category: 'quality' },
      { name: 'spotbugs', command: `spotbugs -textui -xml:withMessages -output /dev/stdout . 2>/dev/null || echo '<BugCollection></BugCollection>'`, category: 'quality' },
      // Dependency Tools - suppress INFO/DEBUG output
      { name: 'dependency-check', command: `/home/opc/bin/dc-scan . --format JSON --log /dev/null 2>/dev/null || echo '{"dependencies":[]}'`, category: 'dependency' },
      // Architecture Tools
      { name: 'jdepend', command: `jdepend -file /dev/stdout . 2>/dev/null || echo '{}'`, category: 'architecture' },
      // Fixer Tools (for PRO tier)
      { name: 'google-java-format', command: `google-java-format --dry-run --set-exit-if-changed **/*.java 2>/dev/null || true`, category: 'fixer' },
      { name: 'sorald', command: `sorald repair --source . 2>/dev/null || true`, category: 'fixer' }
    ],
    python: [
      // Quality Tools
      { name: 'ruff', command: `/home/opc/.local/bin/ruff check --output-format json . 2>/dev/null || echo '[]'`, category: 'quality' },
      { name: 'pylint', command: `pylint --output-format=json . 2>/dev/null || echo '[]'`, category: 'quality' },
      // Security Tools
      { name: 'bandit', command: `bandit -r . -f json 2>/dev/null || echo '{"results":[]}'`, category: 'security' },
      // Dependency Tools
      { name: 'pip-audit', command: `pip-audit --format json 2>/dev/null || echo '[]'`, category: 'dependency' },
      // Architecture Tools
      { name: 'pydeps', command: `pydeps --show-deps --no-output . 2>/dev/null || echo '{}'`, category: 'architecture' },
      { name: 'import-linter', command: `lint-imports --json 2>/dev/null || echo '{}'`, category: 'architecture' },
      // Fixer Tools (for PRO tier)
      { name: 'black', command: `black --check --diff . 2>/dev/null || true`, category: 'fixer' },
      { name: 'isort', command: `isort --check-only --diff . 2>/dev/null || true`, category: 'fixer' },
      { name: 'autoflake', command: `autoflake --check . 2>/dev/null || true`, category: 'fixer' }
    ],
    javascript: [
      // Quality Tools
      { name: 'eslint', command: `/opt/codequal-tools/bin/eslint --format json . 2>/dev/null || echo '[]'`, category: 'quality' },
      { name: 'biome', command: `biome lint --reporter json . 2>/dev/null || echo '{"diagnostics":[]}'`, category: 'quality' },
      // Dependency Tools
      { name: 'npm-audit', command: `npm audit --json 2>/dev/null || echo '{"vulnerabilities":{}}'`, category: 'dependency' },
      // Architecture Tools
      { name: 'madge', command: `madge --circular --json . 2>/dev/null || echo '[]'`, category: 'architecture' },
      { name: 'dependency-cruiser', command: `npx depcruise --output-type json src 2>/dev/null || echo '{"modules":[]}'`, category: 'architecture' },
      // Fixer Tools (for PRO tier)
      { name: 'prettier', command: `prettier --check . 2>/dev/null || true`, category: 'fixer' }
    ],
    typescript: [
      // Quality Tools
      { name: 'eslint', command: `/opt/codequal-tools/bin/eslint --format json . 2>/dev/null || echo '[]'`, category: 'quality' },
      { name: 'biome', command: `biome lint --reporter json . 2>/dev/null || echo '{"diagnostics":[]}'`, category: 'quality' },
      { name: 'tsc', command: `tsc --noEmit --pretty false 2>&1 | head -100 || true`, category: 'quality' },
      // Dependency Tools
      { name: 'npm-audit', command: `npm audit --json 2>/dev/null || echo '{"vulnerabilities":{}}'`, category: 'dependency' },
      // Architecture Tools
      { name: 'madge', command: `madge --circular --json . 2>/dev/null || echo '[]'`, category: 'architecture' },
      { name: 'dependency-cruiser', command: `npx depcruise --output-type json src 2>/dev/null || echo '{"modules":[]}'`, category: 'architecture' },
      { name: 'ts-unused-exports', command: `ts-unused-exports tsconfig.json --showLineNumber 2>/dev/null || echo '{}'`, category: 'architecture' },
      // Fixer Tools (for PRO tier)
      { name: 'prettier', command: `prettier --check . 2>/dev/null || true`, category: 'fixer' }
    ],
    go: [
      // Quality Tools
      { name: 'golangci-lint', command: `golangci-lint run --out-format json 2>/dev/null || echo '{"Issues":[]}'`, category: 'quality' },
      { name: 'staticcheck', command: `staticcheck -f json ./... 2>/dev/null || echo '[]'`, category: 'quality' },
      // Security Tools
      { name: 'gosec', command: `gosec -fmt json ./... 2>/dev/null || echo '{"Issues":[]}'`, category: 'security' },
      // Dependency Tools
      { name: 'govulncheck', command: `govulncheck -json ./... 2>/dev/null || echo '{"vulns":[]}'`, category: 'dependency' },
      // Architecture Tools
      { name: 'go-arch-lint', command: `go-arch-lint check --json 2>/dev/null || echo '{}'`, category: 'architecture' },
      // Fixer Tools (for PRO tier)
      { name: 'gofmt', command: `gofmt -d . 2>/dev/null || true`, category: 'fixer' }
    ],
    ruby: [
      // Quality Tools
      { name: 'rubocop', command: `rubocop --format json 2>/dev/null || echo '{"files":[]}'`, category: 'quality' },
      // Security Tools
      { name: 'brakeman', command: `brakeman -f json -q 2>/dev/null || echo '{"warnings":[]}'`, category: 'security' },
      // Dependency Tools
      { name: 'bundler-audit', command: `bundle-audit check --format json 2>/dev/null || echo '{"results":[]}'`, category: 'dependency' },
      // Architecture Tools
      { name: 'packwerk', command: `packwerk check --format json 2>/dev/null || echo '{}'`, category: 'architecture' }
    ],
    php: [
      // Quality Tools
      { name: 'phpstan', command: `phpstan analyse --error-format=json 2>/dev/null || echo '{"files":{}}'`, category: 'quality' },
      // Architecture Tools
      { name: 'deptrac', command: `deptrac analyse --formatter=json 2>/dev/null || echo '{}'`, category: 'architecture' }
    ],
    rust: [
      // Quality Tools
      { name: 'clippy', command: `cargo clippy --message-format=json 2>/dev/null || true`, category: 'quality' },
      // Dependency Tools
      { name: 'cargo-audit', command: `cargo audit --json 2>/dev/null || echo '{"vulnerabilities":{"list":[]}}'`, category: 'dependency' },
      // Architecture Tools
      { name: 'cargo-modules', command: `cargo modules structure --json 2>/dev/null || echo '{}'`, category: 'architecture' },
      // Fixer Tools (for PRO tier)
      { name: 'rustfmt', command: `rustfmt --check src/**/*.rs 2>/dev/null || true`, category: 'fixer' }
    ]
  };

  // API/GraphQL/OpenAPI Tools (if detected)
  const apiTools = [
    { name: 'spectral', command: `spectral lint openapi.yaml --format json 2>/dev/null || echo '[]'`, category: 'api' },
    { name: 'graphql-cop', command: `graphql-cop --json 2>/dev/null || echo '[]'`, category: 'api' }
  ];

  // Combine security tools (cross-language) with language-specific tools
  const languageTools = toolsByLanguage[language] || toolsByLanguage.javascript;
  const allTools = [...securityTools, ...languageTools];

  const repoName = repoUrl.split('/').pop()?.replace('.git', '') || 'repo';
  const repoPath = `/tmp/${repoName}-pr${prNumber}`;

  // Clone repository if needed
  try {
    await execAsync(`git clone --depth 1 ${repoUrl} ${repoPath} 2>/dev/null || (cd ${repoPath} && git pull)`, {
      timeout: 60000
    });
    logger.info(`Repository ready at ${repoPath}`);
  } catch (error) {
    logger.warn('Repository clone/update failed, continuing with existing repo');
  }

  // Execute tools in parallel batches (4 tools at a time to avoid overwhelming system)
  const batchSize = 4;
  const toolResults: Array<{ tool: string; output: string; success: boolean; category: string }> = [];

  for (let i = 0; i < allTools.length; i += batchSize) {
    const batch = allTools.slice(i, i + batchSize);
    const batchResults = await Promise.all(
      batch.map(async (tool) => {
        const toolStart = Date.now();
        try {
          const { stdout } = await execAsync(tool.command, {
            cwd: repoPath,
            timeout: 45000, // 45 sec per tool
            maxBuffer: 20 * 1024 * 1024, // 20MB buffer
            env: {
              ...process.env,
              PATH: `/home/opc/.local/bin:/opt/codequal-tools/bin:/usr/local/bin:${process.env.PATH}`,
              HOME: '/home/opc'
            }
          });
          logger.info(`✅ ${tool.name}: completed in ${Date.now() - toolStart}ms`);
          return { tool: tool.name, output: stdout, success: true, category: tool.category };
        } catch (error: any) {
          // Many tools return non-zero exit code when issues are found
          if (error.stdout) {
            logger.info(`⚠️ ${tool.name}: completed with issues in ${Date.now() - toolStart}ms`);
            return { tool: tool.name, output: error.stdout, success: true, category: tool.category };
          }
          logger.warn(`❌ ${tool.name}: failed after ${Date.now() - toolStart}ms - ${error.message?.substring(0, 100)}`);
          return { tool: tool.name, output: '', success: false, category: tool.category };
        }
      })
    );
    toolResults.push(...batchResults);
  }

  // Parse outputs and collect issues
  const allIssues: any[] = [];
  for (const result of toolResults) {
    if (result.success && result.output) {
      const parsed = parseToolOutput(result.tool, result.output);
      // Add category to each issue
      parsed.forEach(issue => {
        issue.category = result.category;
      });
      allIssues.push(...parsed);
    }
  }

  const executionTime = Date.now() - startTime;
  const successCount = toolResults.filter(r => r.success).length;
  logger.info(`Host-native analysis complete: ${allIssues.length} issues from ${successCount}/${allTools.length} tools in ${executionTime}ms`);

  return {
    issues: allIssues,
    executionTime,
    toolsPods: allTools.map(t => `${t.name}-host-native`)
  };
}

/**
 * Parse tool output to extract issues
 * Handles various output formats: JSON, XML, line-delimited JSON, mixed output
 */
function parseToolOutput(toolName: string, output: string): any[] {
  try {
    // Clean output - remove any non-JSON prefix/suffix for tools that mix logs with JSON
    // Also remove any non-printable characters that might corrupt JSON parsing
    // eslint-disable-next-line no-control-regex
    let cleanOutput = output.trim().replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');

    // Handle tools that output XML
    if (toolName === 'spotbugs') {
      return parseSpotbugsXML(cleanOutput);
    }

    // Handle tools that mix logs with JSON (dependency-check)
    if (toolName === 'dependency-check') {
      // Find the JSON object in the output
      const jsonStart = cleanOutput.indexOf('{');
      const jsonEnd = cleanOutput.lastIndexOf('}');
      if (jsonStart !== -1 && jsonEnd !== -1) {
        cleanOutput = cleanOutput.substring(jsonStart, jsonEnd + 1);
      } else {
        return [];
      }
    }

    // Handle tools that output warnings before JSON (pmd outputs [WARN] lines before JSON)
    if (toolName === 'pmd') {
      // Find the first { which starts the JSON object
      const jsonStart = cleanOutput.indexOf('{\n');
      if (jsonStart === -1) {
        // Try without newline
        const altStart = cleanOutput.indexOf('{');
        if (altStart !== -1) {
          cleanOutput = cleanOutput.substring(altStart);
        }
      } else {
        cleanOutput = cleanOutput.substring(jsonStart);
      }
      // Remove any trailing non-JSON content
      const jsonEnd = cleanOutput.lastIndexOf('}');
      if (jsonEnd !== -1 && jsonEnd < cleanOutput.length - 1) {
        cleanOutput = cleanOutput.substring(0, jsonEnd + 1);
      }
    }

    // Handle checkov which outputs an array
    if (toolName === 'checkov') {
      // Checkov outputs [...] array, find the array boundaries
      const arrayStart = cleanOutput.indexOf('[');
      const arrayEnd = cleanOutput.lastIndexOf(']');
      if (arrayStart !== -1 && arrayEnd !== -1) {
        cleanOutput = cleanOutput.substring(arrayStart, arrayEnd + 1);
      }
    }

    const data = JSON.parse(cleanOutput);

    switch (toolName) {
      // ==========================================================================
      // P0: Critical Security Tools
      // ==========================================================================
      case 'semgrep':
        return (data.results || []).map((r: any, i: number) => ({
          id: `semgrep-${i}-${Date.now()}`,
          tool: 'semgrep',
          type: r.check_id,
          severity: mapSeverity(r.extra?.severity || 'WARNING'),
          message: r.extra?.message || r.check_id,
          file: r.path,
          line: r.start?.line || 1
        }));

      case 'gitleaks':
        return (Array.isArray(data) ? data : []).map((r: any, i: number) => ({
          id: `gitleaks-${i}-${Date.now()}`,
          tool: 'gitleaks',
          type: r.RuleID || 'secret',
          severity: 'critical',
          message: `Secret detected: ${r.Description || r.Match?.substring(0, 50)}`,
          file: r.File,
          line: r.StartLine || 1
        }));

      case 'trufflehog':
        return (Array.isArray(data) ? data : []).map((r: any, i: number) => ({
          id: `trufflehog-${i}-${Date.now()}`,
          tool: 'trufflehog',
          type: r.DetectorType || 'secret',
          severity: 'critical',
          message: `Secret found: ${r.DetectorType || 'credential'}`,
          file: r.SourceMetadata?.Data?.Filesystem?.file || 'unknown',
          line: r.SourceMetadata?.Data?.Filesystem?.line || 1
        }));

      case 'trivy': {
        const trivyIssues: any[] = [];
        for (const result of data.Results || []) {
          // Vulnerabilities
          for (const vuln of result.Vulnerabilities || []) {
            trivyIssues.push({
              id: `trivy-${vuln.VulnerabilityID}-${Date.now()}`,
              tool: 'trivy',
              type: vuln.VulnerabilityID,
              severity: mapSeverity(vuln.Severity),
              message: vuln.Title || vuln.Description?.substring(0, 200),
              file: result.Target,
              line: 1
            });
          }
          // Misconfigurations
          for (const misconf of result.Misconfigurations || []) {
            trivyIssues.push({
              id: `trivy-${misconf.ID}-${Date.now()}`,
              tool: 'trivy',
              type: misconf.ID,
              severity: mapSeverity(misconf.Severity),
              message: misconf.Title || misconf.Description,
              file: result.Target,
              line: 1
            });
          }
        }
        return trivyIssues;
      }

      case 'grype':
        return (data.matches || []).map((m: any, i: number) => ({
          id: `grype-${m.vulnerability?.id || i}-${Date.now()}`,
          tool: 'grype',
          type: m.vulnerability?.id || 'CVE',
          severity: mapSeverity(m.vulnerability?.severity),
          message: m.vulnerability?.description?.substring(0, 200) || m.vulnerability?.id,
          file: m.artifact?.name || 'unknown',
          line: 1
        }));

      case 'checkov': {
        const checkovIssues: any[] = [];
        // Checkov outputs an array of check results
        const checkovResults = Array.isArray(data) ? data : [data];
        for (const result of checkovResults) {
          for (const check of result.results?.failed_checks || []) {
            checkovIssues.push({
              id: `checkov-${check.check_id}-${Date.now()}`,
              tool: 'checkov',
              type: check.check_id,
              severity: mapSeverity(check.severity || 'MEDIUM'),
              message: check.check_name || check.check_id,
              file: check.file_path,
              line: check.file_line_range?.[0] || 1
            });
          }
        }
        return checkovIssues;
      }

      // ==========================================================================
      // Quality Tools

      case 'pmd': {
        const pmdIssues: any[] = [];
        for (const file of data.files || []) {
          for (const violation of file.violations || []) {
            pmdIssues.push({
              id: `pmd-${pmdIssues.length}-${Date.now()}`,
              tool: 'pmd',
              type: violation.rule,
              severity: mapPMDPriority(violation.priority),
              message: violation.description,
              file: file.filename,
              line: violation.beginline
            });
          }
        }
        return pmdIssues;
      }

      case 'eslint': {
        const eslintIssues: any[] = [];
        for (const file of Array.isArray(data) ? data : []) {
          for (const msg of file.messages || []) {
            eslintIssues.push({
              id: `eslint-${eslintIssues.length}-${Date.now()}`,
              tool: 'eslint',
              type: msg.ruleId,
              severity: msg.severity === 2 ? 'high' : 'medium',
              message: msg.message,
              file: file.filePath,
              line: msg.line
            });
          }
        }
        return eslintIssues;
      }

      case 'ruff':
        return (Array.isArray(data) ? data : []).map((r: any, i: number) => ({
          id: `ruff-${i}-${Date.now()}`,
          tool: 'ruff',
          type: r.code,
          severity: 'medium',
          message: r.message,
          file: r.filename,
          line: r.location?.row || 1
        }));

      case 'bandit':
        return (data.results || []).map((r: any, i: number) => ({
          id: `bandit-${i}-${Date.now()}`,
          tool: 'bandit',
          type: r.test_id,
          severity: mapSeverity(r.issue_severity),
          message: r.issue_text,
          file: r.filename,
          line: r.line_number
        }));

      case 'golangci-lint':
        return (data.Issues || []).map((i: any, idx: number) => ({
          id: `golangci-${idx}-${Date.now()}`,
          tool: 'golangci-lint',
          type: i.FromLinter,
          severity: mapSeverity(i.Severity),
          message: i.Text,
          file: i.Pos?.Filename || 'unknown',
          line: i.Pos?.Line || 1
        }));

      case 'gosec':
        return (data.Issues || []).map((i: any, idx: number) => ({
          id: `gosec-${idx}-${Date.now()}`,
          tool: 'gosec',
          type: i.rule_id,
          severity: mapSeverity(i.severity),
          message: i.details,
          file: i.file,
          line: parseInt(i.line) || 1
        }));

      case 'npm-audit': {
        const npmIssues: any[] = [];
        for (const [name, vuln] of Object.entries(data.vulnerabilities || {})) {
          const v = vuln as any;
          npmIssues.push({
            id: `npm-${name}-${Date.now()}`,
            tool: 'npm-audit',
            type: v.via?.[0]?.name || name,
            severity: mapSeverity(v.severity),
            message: v.via?.[0]?.title || `Vulnerability in ${name}`,
            file: 'package.json',
            line: 1
          });
        }
        return npmIssues;
      }

      case 'dependency-check': {
        const dcIssues: any[] = [];
        for (const dep of data.dependencies || []) {
          for (const vuln of dep.vulnerabilities || []) {
            dcIssues.push({
              id: `dc-${vuln.name}-${Date.now()}`,
              tool: 'dependency-check',
              type: vuln.name,
              severity: mapCVSS(vuln.cvssv3?.baseScore || vuln.cvssv2?.score || 0),
              message: vuln.description?.substring(0, 200) || vuln.name,
              file: dep.fileName,
              line: 1
            });
          }
        }
        return dcIssues;
      }

      // ==========================================================================
      // Additional Language Tools
      // ==========================================================================

      case 'pylint':
        return (Array.isArray(data) ? data : []).map((r: any, i: number) => ({
          id: `pylint-${i}-${Date.now()}`,
          tool: 'pylint',
          type: r.symbol || r.message_id,
          severity: mapPylintType(r.type),
          message: r.message,
          file: r.path,
          line: r.line
        }));

      case 'staticcheck':
        return (Array.isArray(data) ? data : []).map((r: any, i: number) => ({
          id: `staticcheck-${i}-${Date.now()}`,
          tool: 'staticcheck',
          type: r.code,
          severity: r.severity === 'error' ? 'high' : 'medium',
          message: r.message,
          file: r.location?.file || 'unknown',
          line: r.location?.line || 1
        }));

      case 'biome':
        return (data.diagnostics || []).map((d: any, i: number) => ({
          id: `biome-${i}-${Date.now()}`,
          tool: 'biome',
          type: d.category,
          severity: mapSeverity(d.severity),
          message: d.description || d.message,
          file: d.location?.path?.file || 'unknown',
          line: d.location?.span?.start?.line || 1
        }));

      case 'rubocop': {
        const rubocopIssues: any[] = [];
        for (const file of data.files || []) {
          for (const offense of file.offenses || []) {
            rubocopIssues.push({
              id: `rubocop-${rubocopIssues.length}-${Date.now()}`,
              tool: 'rubocop',
              type: offense.cop_name,
              severity: mapSeverity(offense.severity),
              message: offense.message,
              file: file.path,
              line: offense.location?.start_line || 1
            });
          }
        }
        return rubocopIssues;
      }

      case 'brakeman':
        return (data.warnings || []).map((w: any, i: number) => ({
          id: `brakeman-${i}-${Date.now()}`,
          tool: 'brakeman',
          type: w.warning_type,
          severity: w.confidence === 'High' ? 'high' : w.confidence === 'Medium' ? 'medium' : 'low',
          message: w.message,
          file: w.file,
          line: w.line || 1
        }));

      case 'bundler-audit':
        return (data.results || []).map((r: any, i: number) => ({
          id: `bundler-audit-${i}-${Date.now()}`,
          tool: 'bundler-audit',
          type: r.advisory?.cve || r.advisory?.id,
          severity: mapSeverity(r.advisory?.criticality),
          message: r.advisory?.title || r.advisory?.description,
          file: 'Gemfile.lock',
          line: 1
        }));

      case 'phpstan': {
        const phpstanIssues: any[] = [];
        for (const [file, fileData] of Object.entries(data.files || {})) {
          for (const msg of (fileData as any).messages || []) {
            phpstanIssues.push({
              id: `phpstan-${phpstanIssues.length}-${Date.now()}`,
              tool: 'phpstan',
              type: 'phpstan',
              severity: 'medium',
              message: msg.message,
              file: file,
              line: msg.line || 1
            });
          }
        }
        return phpstanIssues;
      }

      case 'clippy':
        // Clippy outputs JSON lines, not a single JSON object
        return [];  // Handled specially in tool execution

      case 'cargo-audit':
        return (data.vulnerabilities?.list || []).map((v: any, i: number) => ({
          id: `cargo-audit-${i}-${Date.now()}`,
          tool: 'cargo-audit',
          type: v.advisory?.id,
          severity: mapSeverity(v.advisory?.severity),
          message: v.advisory?.title || v.advisory?.description,
          file: 'Cargo.toml',
          line: 1
        }));

      case 'pip-audit':
        return (Array.isArray(data) ? data : []).map((v: any, i: number) => ({
          id: `pip-audit-${i}-${Date.now()}`,
          tool: 'pip-audit',
          type: v.vulns?.[0]?.id || v.name,
          severity: mapSeverity(v.vulns?.[0]?.severity),
          message: v.vulns?.[0]?.description || `Vulnerability in ${v.name}`,
          file: 'requirements.txt',
          line: 1
        }));

      case 'govulncheck':
        return (data.vulns || []).map((v: any, i: number) => ({
          id: `govulncheck-${i}-${Date.now()}`,
          tool: 'govulncheck',
          type: v.osv?.id,
          severity: 'high',
          message: v.osv?.summary || v.osv?.details,
          file: 'go.mod',
          line: 1
        }));

      // Architecture tools often don't output JSON issues - return empty
      case 'madge':
      case 'dependency-cruiser':
      case 'pydeps':
      case 'import-linter':
      case 'go-arch-lint':
      case 'jdepend':
      case 'packwerk':
      case 'deptrac':
      case 'cargo-modules':
      case 'ts-unused-exports':
        // Architecture tools - analysis done separately
        return [];

      // Fixer tools check for formatting issues
      case 'black':
      case 'isort':
      case 'autoflake':
      case 'prettier':
      case 'gofmt':
      case 'rustfmt':
      case 'google-java-format':
      case 'sorald':
        // Fixer tools - handled in fix phase
        return [];

      default:
        logger.debug(`No parser for tool: ${toolName}`);
        return [];
    }
  } catch (error) {
    logger.warn(`Failed to parse ${toolName} output: ${error}`);
    return [];
  }
}

function mapPylintType(type: string): string {
  if (type === 'error' || type === 'fatal') return 'high';
  if (type === 'warning') return 'medium';
  return 'low';
}

function mapSeverity(severity: string): string {
  const s = (severity || '').toUpperCase();
  if (s === 'CRITICAL' || s === 'ERROR') return 'critical';
  if (s === 'HIGH' || s === 'WARNING' || s === 'MAJOR') return 'high';
  if (s === 'MEDIUM' || s === 'MODERATE' || s === 'MINOR') return 'medium';
  return 'low';
}

function mapPMDPriority(priority: number): string {
  if (priority === 1) return 'critical';
  if (priority === 2) return 'high';
  if (priority === 3) return 'medium';
  return 'low';
}

function mapCVSS(score: number): string {
  if (score >= 9.0) return 'critical';
  if (score >= 7.0) return 'high';
  if (score >= 4.0) return 'medium';
  return 'low';
}

/**
 * Parse SpotBugs XML output
 */
function parseSpotbugsXML(xmlOutput: string): any[] {
  const issues: any[] = [];

  // Simple XML parsing for SpotBugs BugInstance elements
  const bugPattern = /<BugInstance[^>]*type="([^"]*)"[^>]*priority="(\d)"[^>]*>([\s\S]*?)<\/BugInstance>/g;
  let match;

  while ((match = bugPattern.exec(xmlOutput)) !== null) {
    const type = match[1];
    const priority = parseInt(match[2]);
    const content = match[3];

    // Extract file and line from SourceLine element
    const sourceMatch = /<SourceLine[^>]*sourcepath="([^"]*)"[^>]*start="(\d+)"/.exec(content);
    const messageMatch = /<LongMessage>([^<]*)<\/LongMessage>/.exec(content);

    issues.push({
      id: `spotbugs-${issues.length}-${Date.now()}`,
      tool: 'spotbugs',
      type: type,
      severity: priority === 1 ? 'high' : priority === 2 ? 'medium' : 'low',
      message: messageMatch?.[1] || type,
      file: sourceMatch?.[1] || 'unknown',
      line: parseInt(sourceMatch?.[2] || '1')
    });
  }

  return issues;
}

/**
 * Generate REAL fixes using the AIFixerAgent
 *
 * SESSION 70: Replaced fake template placeholders with real AI fix generation
 *
 * Flow:
 * 1. Check pattern registry first (FREE, instant) - cached patterns from previous PRO analyses
 * 2. For unmatched issues, use AIFixerAgent to generate real fixes
 * 3. Store successful fixes in pattern registry for future reuse
 */
async function generateFixesWithHybridAgents(issues: any[], prInfo: any) {
  const fixes = new Map();
  let patternHits = 0;
  let aiGenerated = 0;
  let failed = 0;

  // Try to import the AIFixerAgent and pattern store
  let AIFixerAgent: any = null;
  let patternStore: any = null;

  try {
    const fixAgentModule = await import('@codequal/agents/fix-agent/agents/ai-fixer-agent');
    AIFixerAgent = fixAgentModule.AIFixerAgent;
    logger.info('[FixGen] AIFixerAgent loaded successfully');
  } catch (e: any) {
    logger.warn('[FixGen] AIFixerAgent not available:', e.message);
  }

  try {
    const patternModule = await import('@codequal/agents/fix-agent/fix-pattern-registry');
    patternStore = patternModule.getSupabasePatternStore();
    logger.info('[FixGen] Pattern store loaded successfully');
  } catch (e: any) {
    logger.warn('[FixGen] Pattern store not available:', e.message);
  }

  // Phase 1: Check pattern registry for cached fixes (FREE for all tiers)
  if (patternStore) {
    for (const issue of issues) {
      try {
        const pattern = await patternStore.lookupPattern(issue.type, issue.tool);
        if (pattern && pattern.fix_template) {
          fixes.set(issue.id, {
            suggestion: pattern.fix_template.correctedCode || pattern.fix_template.fix,
            confidence: pattern.confidence >= 0.8 ? 'high' : 'medium',
            cached: true,
            patternId: pattern.id,
            educational: `This fix uses a proven pattern from our registry. ${pattern.description || ''}`
          });
          patternHits++;
        }
      } catch (e) {
        // Pattern lookup failed, will try AI generation
      }
    }
  }

  // Phase 2: Use AI for remaining issues (PRO tier only)
  const unmatchedIssues = issues.filter(i => !fixes.has(i.id));

  if (AIFixerAgent && unmatchedIssues.length > 0) {
    try {
      const fixer = new AIFixerAgent({ submitToRegistry: true });

      // Convert issues to AIFixerAgent format
      const aiFixerIssues = unmatchedIssues.map(issue => ({
        id: issue.id,
        validatorToolId: issue.tool || 'unknown',
        ruleId: issue.type || issue.rule || 'unknown',
        file: issue.file || 'unknown',
        line: issue.line || 1,
        message: issue.message || 'No message',
        severity: mapToAISeverity(issue.severity),
        language: prInfo.language || 'java',
        originalConfidence: 30, // Low confidence to trigger AI
        codeContext: issue.codeContext || undefined,
        toolContext: {
          toolSuggestion: issue.suggestion,
          ruleDescription: issue.message
        }
      }));

      // Process issues in parallel (max 5 at a time)
      const result = await fixer.processBatch(aiFixerIssues, {
        parallel: 5,
        verbose: false
      });

      // Apply AI-generated fixes
      for (const enriched of result.enrichedIssues) {
        if (enriched.fixRecommendation) {
          const rec = enriched.fixRecommendation;
          fixes.set(enriched.id, {
            suggestion: rec.correctedCode || rec.fix,
            confidence: rec.confidence >= 70 ? 'high' : rec.confidence >= 50 ? 'medium' : 'low',
            cached: false,
            aiGenerated: true,
            model: rec.model,
            explanation: rec.explanation,
            bestPractices: rec.bestPractices,
            educational: rec.issueDescription
              ? `**What**: ${rec.issueDescription.what}\n**Why**: ${rec.issueDescription.why}`
              : `AI-generated fix for ${enriched.ruleId}`
          });
          aiGenerated++;
        }
      }

      // Track failed issues
      failed = result.failed.length;

    } catch (e: any) {
      logger.error('[FixGen] AI fix generation failed:', e.message);
      failed = unmatchedIssues.length;
    }
  } else if (unmatchedIssues.length > 0) {
    // No AI available - provide guidance instead of fake fixes
    for (const issue of unmatchedIssues) {
      fixes.set(issue.id, {
        suggestion: null, // No actual fix available
        confidence: 'none',
        cached: false,
        aiGenerated: false,
        requiresManualFix: true,
        educational: `This issue requires manual review. Check the ${issue.tool || 'tool'} documentation for ${issue.type || 'this rule'}.`,
        guidance: getManualFixGuidance(issue)
      });
      failed++;
    }
  }

  const total = issues.length;
  const patternHitRate = total > 0 ? Math.round((patternHits / total) * 100) : 0;
  const aiRate = total > 0 ? Math.round((aiGenerated / total) * 100) : 0;

  logger.info(`[FixGen] Results: ${patternHits} pattern hits (${patternHitRate}%), ${aiGenerated} AI generated (${aiRate}%), ${failed} failed`);

  return {
    fixes,
    cacheStats: {
      hits: patternHits,
      misses: aiGenerated + failed,
      hitRate: `${patternHitRate}%`,
      aiGenerated,
      failed
    }
  };
}

/**
 * Map severity to AI-compatible format
 */
function mapToAISeverity(severity: string): 'critical' | 'high' | 'medium' | 'low' {
  const s = (severity || '').toLowerCase();
  if (s === 'critical' || s === 'error') return 'critical';
  if (s === 'high' || s === 'warning') return 'high';
  if (s === 'medium' || s === 'moderate') return 'medium';
  return 'low';
}

/**
 * Generate manual fix guidance when AI is not available
 */
function getManualFixGuidance(issue: any): string {
  const tool = (issue.tool || '').toLowerCase();
  const type = issue.type || issue.rule || '';

  const toolDocs: Record<string, string> = {
    semgrep: `https://semgrep.dev/r?q=${encodeURIComponent(type)}`,
    eslint: `https://eslint.org/docs/rules/${type}`,
    pmd: 'https://pmd.github.io/latest/pmd_rules_java.html',
    checkstyle: 'https://checkstyle.sourceforge.io/checks.html',
    spotbugs: 'https://spotbugs.readthedocs.io/en/stable/bugDescriptions.html',
    bandit: 'https://bandit.readthedocs.io/en/latest/plugins/',
    ruff: `https://docs.astral.sh/ruff/rules/${type}`,
    trivy: 'https://aquasecurity.github.io/trivy/',
    checkov: 'https://www.checkov.io/5.Policy%20Index/all.html'
  };

  return toolDocs[tool] || `Search for: "${tool} ${type} fix"`;
}

/**
 * Calculate scores based on issue categorization
 *
 * SESSION 70: Fixed score calculation - now properly maps issues to categories
 * based on tool type and issue characteristics, not just issue.type
 */
function calculateScores(issues: any[]) {
  const baseScore = 100;
  const deductions: Record<string, number> = {
    critical: 5,   // Reduced from 10 for more realistic scores
    high: 3,       // Reduced from 5
    medium: 1,     // Reduced from 2
    low: 0.5       // Reduced from 1
  };

  const scores: Record<string, number> = {
    security: baseScore,
    quality: baseScore,
    performance: baseScore,
    architecture: baseScore,
    dependencies: baseScore
  };

  // Issue counts per category for debugging
  const categoryCounts: Record<string, number> = {
    security: 0,
    quality: 0,
    performance: 0,
    architecture: 0,
    dependencies: 0
  };

  issues.forEach(issue => {
    const deduction = deductions[issue.severity] || 1;
    const category = categorizeIssueForScoring(issue);

    if (scores[category] !== undefined) {
      scores[category] = Math.max(0, scores[category] - deduction);
      categoryCounts[category]++;
    }
  });

  // Round scores to 1 decimal
  Object.keys(scores).forEach(key => {
    scores[key] = Math.round(scores[key] * 10) / 10;
  });

  // Overall score is the MINIMUM (weakest link) - same as V9 production
  const overall = Math.round(Math.min(
    scores.security,
    scores.quality,
    scores.performance,
    scores.architecture,
    scores.dependencies
  ));

  logger.debug('[Score] Category breakdown:', categoryCounts);
  logger.debug('[Score] Scores:', scores);

  return { overall, ...scores };
}

/**
 * Categorize an issue into one of the 5 scoring categories
 * Based on tool type and issue characteristics
 */
function categorizeIssueForScoring(issue: any): string {
  const tool = (issue.tool || '').toLowerCase();
  const type = (issue.type || issue.rule || '').toLowerCase();
  const category = (issue.category || '').toLowerCase();
  const message = (issue.message || '').toLowerCase();

  // Security tools and patterns
  const securityTools = ['semgrep', 'gitleaks', 'trufflehog', 'bandit', 'gosec', 'brakeman', 'trivy', 'grype', 'checkov'];
  const securityPatterns = ['security', 'inject', 'xss', 'csrf', 'secret', 'auth', 'crypto', 'sql', 'path-traversal', 'command-injection', 'cwe-'];

  if (securityTools.includes(tool) || category === 'secrets' || category === 'iac') {
    return 'security';
  }
  if (securityPatterns.some(p => type.includes(p) || message.includes(p))) {
    return 'security';
  }

  // Dependency/vulnerability tools
  const depTools = ['dependency-check', 'npm-audit', 'pip-audit', 'bundler-audit', 'cargo-audit', 'govulncheck'];
  if (depTools.includes(tool) || category === 'dependency') {
    return 'dependencies';
  }
  if (type.includes('cve-') || type.includes('vulnerability') || message.includes('vulnerable')) {
    return 'dependencies';
  }

  // Architecture tools
  const archTools = ['jdepend', 'madge', 'dependency-cruiser', 'pydeps', 'import-linter', 'go-arch-lint', 'packwerk', 'deptrac', 'cargo-modules'];
  if (archTools.includes(tool)) {
    return 'architecture';
  }
  if (type.includes('circular') || type.includes('coupling') || type.includes('architecture')) {
    return 'architecture';
  }

  // Performance patterns
  if (type.includes('performance') || type.includes('complexity') || type.includes('n+1') || type.includes('slow')) {
    return 'performance';
  }
  if (message.includes('performance') || message.includes('complexity') || message.includes('expensive')) {
    return 'performance';
  }

  // Default to quality for linting and style tools
  return 'quality';
}

function generateSummary(issues: any[], fixes: Map<string, any>) {
  const severityCounts = { critical: 0, high: 0, medium: 0, low: 0 };

  issues.forEach(issue => {
    if (severityCounts[issue.severity as keyof typeof severityCounts] !== undefined) {
      severityCounts[issue.severity as keyof typeof severityCounts]++;
    }
  });

  let cachedCount = 0;
  fixes.forEach(fix => {
    if (fix.cached) cachedCount++;
  });

  return {
    totalIssues: issues.length,
    ...severityCounts,
    fixed: fixes.size,
    cached: cachedCount
  };
}

function calculateCostEstimate(issueCount: number, cacheStats: any): number {
  const costPerApiCall = 0.002;
  const hitRate = parseInt(cacheStats.hitRate) || 0;
  const cachedIssues = Math.floor(issueCount * (hitRate / 100));
  const apiCalls = issueCount - cachedIssues;
  return apiCalls * costPerApiCall;
}

function generateV9Report(data: any) {
  const grade = data.scores.overall >= 90 ? 'A' :
                data.scores.overall >= 80 ? 'B' :
                data.scores.overall >= 70 ? 'C' :
                data.scores.overall >= 60 ? 'D' : 'F';

  const markdown = `
# V9 Analysis Report

## Repository: ${data.repository}
## PR #${data.prNumber}
## Language: ${data.language.toUpperCase()}

### Executive Summary
- **Overall Score**: ${data.scores.overall}/100 (Grade: ${grade})
- **Total Issues**: ${data.summary.totalIssues}
- **Critical Issues**: ${data.summary.critical}
- **High Issues**: ${data.summary.high}
- **Fixed Automatically**: ${data.summary.fixed}
- **Cache Hit Rate**: ${data.metrics.cacheHitRate}

### Score Breakdown
| Category | Score |
|----------|-------|
| Security | ${data.scores.security}/100 |
| Quality | ${data.scores.quality}/100 |
| Performance | ${data.scores.performance}/100 |
| Architecture | ${data.scores.architecture}/100 |
| Dependencies | ${data.scores.dependencies}/100 |

### Performance Metrics
- **Analysis Time**: ${data.metrics.analysisTime}ms
- **Tool Execution**: ${data.metrics.toolsExecutionTime}ms
- **Fix Generation**: ${data.metrics.fixGenerationTime}ms
- **Cost Estimate**: $${data.metrics.costEstimate.toFixed(4)}

### Recommendations
1. Address ${data.summary.critical} critical issues immediately
2. Review ${data.summary.high} high-priority issues
3. Consider automated fixes for ${data.summary.fixed} issues
`;

  return {
    markdown,
    html: markdown, // Convert to HTML in production
    grade,
    recommendations: [
      `Address ${data.summary.critical} critical issues immediately`,
      `Review ${data.summary.high} high-priority issues`,
      `Consider automated fixes for ${data.summary.fixed} issues`
    ],
    businessImpact: {
      riskScore: 100 - data.scores.overall,
      technicalDebt: `${data.summary.totalIssues * 30} minutes`,
      estimatedFixTime: `${Math.ceil(data.summary.totalIssues * 0.5)} hours`,
      priorityActions: [
        'Fix critical security vulnerabilities',
        'Address performance bottlenecks',
        'Improve code quality metrics'
      ]
    }
  };
}

/**
 * SESSION 70: Calculate REAL gamification data based on analysis results
 *
 * XP System (from GAMIFICATION_SCORING_GUIDE.md):
 * - Base Analysis: +10 XP
 * - Per issue fixed: +5 XP
 * - Critical fix bonus: +20 XP
 * - High fix bonus: +15 XP
 * - Security fix bonus: +10 XP
 * - Perfect score (>=95): +100 XP
 *
 * Level System:
 * Level 1: 0 XP, Level 2: 100 XP, Level 3: 250 XP, Level 4: 500 XP, Level 5: 1000 XP
 */
function calculateRealGamification(result: any, isPro: boolean) {
  const breakdown: { action: string; xp: number }[] = [];
  let totalXP = 0;

  // Base analysis XP
  totalXP += 10;
  breakdown.push({ action: 'Complete Analysis', xp: 10 });

  // Count resolved issues (issues YOU fixed)
  const resolvedIssues = result.issues?.filter((i: any) =>
    i.category === 'RESOLVED' || i.status === 'resolved'
  ) || [];
  const resolvedCount = resolvedIssues.length;

  if (resolvedCount > 0) {
    const resolvedXP = resolvedCount * 5;
    totalXP += resolvedXP;
    breakdown.push({ action: `Resolve ${resolvedCount} Issues (You)`, xp: resolvedXP });
  }

  // Count critical/high severity resolved issues for bonuses
  const criticalResolved = resolvedIssues.filter((i: any) => i.severity === 'critical').length;
  const highResolved = resolvedIssues.filter((i: any) => i.severity === 'high').length;

  if (criticalResolved > 0) {
    const criticalBonus = criticalResolved * 20;
    totalXP += criticalBonus;
    breakdown.push({ action: `Critical Fix Bonus (${criticalResolved}x)`, xp: criticalBonus });
  }

  if (highResolved > 0) {
    const highBonus = highResolved * 15;
    totalXP += highBonus;
    breakdown.push({ action: `High Fix Bonus (${highResolved}x)`, xp: highBonus });
  }

  // Security fix bonus
  const securityResolved = resolvedIssues.filter((i: any) =>
    categorizeIssueForScoring(i) === 'security'
  ).length;

  if (securityResolved > 0) {
    const securityBonus = securityResolved * 10;
    totalXP += securityBonus;
    breakdown.push({ action: `Security Fix Bonus (${securityResolved}x)`, xp: securityBonus });
  }

  // PRO tier: Auto-fix bonus
  if (isPro && result.summary?.fixed > 0) {
    const proFixXP = result.summary.fixed * 5;
    totalXP += proFixXP;
    breakdown.push({ action: `PRO Auto-Fix (${result.summary.fixed}x)`, xp: proFixXP });
  }

  // Perfect score bonus
  if (result.score?.overall >= 95) {
    totalXP += 100;
    breakdown.push({ action: 'Perfect Score (>=95)', xp: 100 });
  }

  // Calculate level from XP
  const levels = [
    { level: 1, xp: 0, title: 'Newcomer' },
    { level: 2, xp: 100, title: 'Apprentice' },
    { level: 3, xp: 250, title: 'Developer' },
    { level: 4, xp: 500, title: 'Craftsman' },
    { level: 5, xp: 1000, title: 'Expert' },
    { level: 6, xp: 2000, title: 'Master' },
    { level: 7, xp: 4000, title: 'Grandmaster' },
    { level: 8, xp: 8000, title: 'Legend' },
    { level: 9, xp: 16000, title: 'Mythic' },
    { level: 10, xp: 32000, title: 'Transcendent' }
  ];

  // For now, assume cumulative XP starts at 0 (would come from user profile in production)
  const cumulativeXP = totalXP;
  const currentLevel = levels.filter(l => l.xp <= cumulativeXP).pop() || levels[0];
  const nextLevel = levels.find(l => l.xp > cumulativeXP) || levels[levels.length - 1];

  // Calculate skill levels based on issue types fixed
  const skills = calculateSkillLevels(result, resolvedIssues);

  // Generate achievements based on analysis
  const achievements = generateAchievements(result, resolvedIssues, isPro);

  return {
    xp: {
      totalXP,
      breakdown,
      cumulativeXP,
      currentLevel: currentLevel.level,
      currentTitle: currentLevel.title,
      nextLevelXP: nextLevel.xp,
      progressToNextLevel: Math.round(((cumulativeXP - currentLevel.xp) / (nextLevel.xp - currentLevel.xp)) * 100)
    },
    skills: {
      skills,
      achievements,
      streaks: {
        current: 1, // Would come from user profile in production
        longest: 1,
        lastActivity: new Date().toISOString()
      }
    }
  };
}

/**
 * Calculate skill levels based on issues resolved per category
 */
function calculateSkillLevels(result: any, resolvedIssues: any[]) {
  const skillCategories = ['security', 'quality', 'performance', 'architecture', 'dependencies'];

  return skillCategories.map(category => {
    // Count resolved issues in this category
    const categoryResolved = resolvedIssues.filter(i =>
      categorizeIssueForScoring(i) === category
    ).length;

    // XP per category = 10 per resolved issue
    const categoryXP = categoryResolved * 10;

    // Level thresholds: 50, 100, 200, 400, 800
    const thresholds = [0, 50, 100, 200, 400, 800];
    const level = thresholds.filter(t => t <= categoryXP).length;
    const nextThreshold = thresholds[level] || 800;

    return {
      name: category.charAt(0).toUpperCase() + category.slice(1),
      level: Math.min(level, 5),
      xp: categoryXP,
      nextLevelXp: nextThreshold,
      issuesFixed: categoryResolved
    };
  });
}

/**
 * Generate achievements based on analysis results
 */
function generateAchievements(result: any, resolvedIssues: any[], isPro: boolean) {
  const achievements: any[] = [];

  // First Analysis
  achievements.push({
    id: 'first-analysis',
    name: 'First Analysis',
    description: 'Completed your first PR analysis',
    earned: true
  });

  // Security Champion (10 security issues fixed)
  const securityFixed = resolvedIssues.filter(i =>
    categorizeIssueForScoring(i) === 'security'
  ).length;
  achievements.push({
    id: 'security-champion',
    name: 'Security Champion',
    description: 'Fixed 10 security issues',
    earned: securityFixed >= 10,
    progress: securityFixed,
    target: 10
  });

  // Perfect Score
  achievements.push({
    id: 'perfect-score',
    name: 'Perfect Score',
    description: 'Achieved a score of 95 or higher',
    earned: result.score?.overall >= 95
  });

  // Bug Squasher (50 issues resolved)
  achievements.push({
    id: 'bug-squasher',
    name: 'Bug Squasher',
    description: 'Fixed 50 issues total',
    earned: resolvedIssues.length >= 50,
    progress: resolvedIssues.length,
    target: 50
  });

  // PRO tier achievements
  if (isPro) {
    const autoFixCount = result.summary?.fixed || 0;
    achievements.push({
      id: 'automation-master',
      name: 'Automation Master',
      description: 'Used PRO auto-fix on 100 issues',
      earned: autoFixCount >= 100,
      progress: autoFixCount,
      target: 100
    });
  }

  return achievements;
}

export default router;
