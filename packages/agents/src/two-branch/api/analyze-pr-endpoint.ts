/**
 * PR Analysis API Endpoint
 *
 * REST API endpoint for triggering V9 PR analysis.
 * Works with Express.js or any HTTP framework that supports similar patterns.
 *
 * Endpoints:
 * - POST /api/analyze - Start a new PR analysis
 * - GET /api/analyze/:analysisId - Get analysis status/results
 * - GET /api/analyze/:analysisId/issues - Get issues with optional filtering
 *
 * Usage with Express:
 *   import express from 'express';
 *   import { setupAnalyzeRoutes } from './analyze-pr-endpoint';
 *
 *   const app = express();
 *   const router = express.Router();
 *   setupAnalyzeRoutes(router);
 *   app.use('/api', router);
 */

import {
  V9AnalysisService,
  getAnalysisService,
  type AnalysisRequest,
  type AnalysisResult,
  type IssueCategory,
  type SupportedLanguage
} from './v9-analysis-service';
import { isValidWebhookUrl } from '../utils/security-utils';
import { registerAnalysisResult } from './unified-report-endpoint';
import type { V9AnalysisResultInput, AnalyzedIssue, IssueCategory as UnifiedCategory } from '../report/unified-report-types';

// ============================================================================
// TYPES
// ============================================================================

export interface APIRequest<T = any> {
  body?: T;
  params?: Record<string, string>;
  query?: Record<string, string>;
}

export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: string;
}

/**
 * User tier for tier-differentiated responses
 */
export type UserTier = 'basic' | 'pro' | 'enterprise';

export interface AnalyzeRequestBody {
  repositoryUrl: string;
  prNumber: number;
  baseBranch?: string;
  prBranch?: string;
  language?: SupportedLanguage;
  analysisMode?: 'quick' | 'standard' | 'complete';
  maxAIAnalysis?: number;
  includeEducation?: boolean;
  webhook?: string;  // URL to call when analysis completes

  // Tier differentiation (Session 66)
  userTier?: UserTier;              // User's subscription tier
  userId?: string;                  // For historical data lookup
  includeHistoricalData?: boolean;  // Include trends (PRO only)
  includeCommunityImpact?: boolean; // Include contribution stats (PRO only)
  includeAchievements?: boolean;    // Include achievement status (PRO only)
  achievementStyle?: 'professional' | 'gamified';  // Achievement display style
}

export interface IssueFilter {
  category?: IssueCategory | IssueCategory[];
  severity?: string | string[];
  tool?: string | string[];
  detectedCategory?: string | string[];
  hasAIFix?: boolean;
}

/**
 * PRO tier additional data
 */
export interface ProTierExtras {
  // Auto-fix pipeline status
  autoFixes?: {
    available: number;
    patterns: number;
    ai: number;
    estimatedTime: string;
  };
  // Historical trends
  historicalTrends?: {
    prNumber: number;
    score: number;
    issuesFixed: number;
    date: string;
  }[];
  // Community impact
  communityImpact?: {
    patternsContributed: number;
    usersHelped: number;
    totalTimeSavedHours: number;
  };
  // Achievements
  achievements?: {
    recent: { id: string; name: string; tier: string; xpValue: number }[];
    totalXp: number;
    level: number;
    title: string;
  };
  // Financial dashboard
  financialDashboard?: {
    thisPr: { timeSavedHours: number; costSaved: number };
    thisMonth?: { timeSavedHours: number; costSaved: number; issuesFixed: number };
    ytd?: { timeSavedHours: number; costSaved: number; issuesFixed: number };
  };
}

/**
 * BASIC tier promotional data
 */
export interface BasicTierExtras {
  // Time/cost comparison
  comparison: {
    manualFixHours: number;
    withBasicHours: number;
    timeSavedPercent: number;
    manualCost: number;
    withBasicCost: number;
  };
  // Upgrade prompt
  upgradePrompt?: {
    type: string;
    title: string;
    description: string;
    ctaUrl: string;
  };
  // Available actions (pattern fixes only for BASIC)
  availableActions: {
    patternFixes: number;
    aiRecommendations: number;
  };
}

/**
 * Enhanced analysis result with tier-specific data
 */
export interface TieredAnalysisResult extends AnalysisResult {
  tier: UserTier;
  proExtras?: ProTierExtras;
  basicExtras?: BasicTierExtras;
  // Actions available based on tier
  actions?: {
    applyFixes?: string;      // POST URL (PRO only)
    preview?: string;         // GET URL
    createPR?: string;        // POST URL (PRO only)
    downloadReport?: string;  // GET URL (all tiers)
    downloadSARIF?: string;   // GET URL (all tiers)
    downloadLSP?: string;     // GET URL (all tiers)
  };
}

// ============================================================================
// IN-MEMORY STORAGE (Replace with Redis/DB in production)
// ============================================================================

const analysisStore = new Map<string, {
  status: 'pending' | 'running' | 'completed' | 'failed';
  request: AnalyzeRequestBody;
  result?: TieredAnalysisResult;
  startedAt: string;
  completedAt?: string;
}>();

// ============================================================================
// TIER-SPECIFIC DATA HELPERS
// ============================================================================

/**
 * Calculate tier-specific extras for a completed analysis
 */
function calculateTierExtras(
  result: AnalysisResult,
  request: AnalyzeRequestBody,
  analysisId: string
): { proExtras?: ProTierExtras; basicExtras?: BasicTierExtras } {
  const tier = request.userTier || 'basic';
  const developerRate = 150; // $150/hour

  // Calculate base metrics
  const allIssues = [
    ...result.byCategory.NEW,
    ...result.byCategory.EXISTING_MODIFIED,
    ...result.byCategory.RESOLVED,
    ...result.byCategory.EXISTING_REST
  ];
  const activeIssues = allIssues.filter((i: any) => i.category !== 'RESOLVED');

  // Estimate auto-fixable issues (use fixSuggestion presence as proxy)
  const autoFixable = activeIssues.filter((i: any) => i.fixSuggestion?.fix).length;
  const patternFixes = Math.floor(autoFixable * 0.6); // ~60% from patterns
  const aiFixes = autoFixable - patternFixes;

  // Calculate time estimates
  const baseFixHours = (result.issues.new * 1.5) + (result.issues.existingModified * 1.0);
  const basicTimeSaved = baseFixHours * 0.69;

  if (tier === 'pro' || tier === 'enterprise') {
    const proExtras: ProTierExtras = {
      autoFixes: {
        available: autoFixable,
        patterns: patternFixes,
        ai: aiFixes,
        estimatedTime: `~${Math.ceil((patternFixes * 0.35 + aiFixes * 8.4) / 60)} min`
      },
      financialDashboard: {
        thisPr: {
          timeSavedHours: baseFixHours - ((patternFixes * 0.35 + aiFixes * 8.4) / 3600),
          costSaved: Math.round((baseFixHours - ((patternFixes * 0.35 + aiFixes * 8.4) / 3600)) * developerRate)
        }
      }
    };

    // TODO: Fetch from Supabase when user data is available
    if (request.includeHistoricalData) {
      proExtras.historicalTrends = []; // Would fetch from analysis_history table
    }

    if (request.includeCommunityImpact) {
      proExtras.communityImpact = {
        patternsContributed: 0, // Would fetch from pattern_contributions
        usersHelped: 0,
        totalTimeSavedHours: 0
      };
    }

    if (request.includeAchievements) {
      proExtras.achievements = {
        recent: [], // Would fetch from user_achievements
        totalXp: 0,
        level: 1,
        title: 'Novice'
      };
    }

    return { proExtras };
  } else {
    const basicExtras: BasicTierExtras = {
      comparison: {
        manualFixHours: baseFixHours,
        withBasicHours: baseFixHours - basicTimeSaved,
        timeSavedPercent: Math.round((basicTimeSaved / baseFixHours) * 100) || 0,
        manualCost: Math.round(baseFixHours * developerRate),
        withBasicCost: Math.round((baseFixHours - basicTimeSaved) * developerRate)
      },
      availableActions: {
        patternFixes: patternFixes,
        aiRecommendations: activeIssues.length
      }
    };

    // Add upgrade prompt for high-value opportunities
    if (activeIssues.length >= 10 || result.issues.blocking >= 3) {
      basicExtras.upgradePrompt = {
        type: 'high_issue_count',
        title: `⚡ ${activeIssues.length}+ Issues Found`,
        description: 'PRO can auto-fix most of these in under a minute.',
        ctaUrl: `/upgrade?promo=bulk&analysis=${analysisId}`
      };
    }

    return { basicExtras };
  }
}

/**
 * Generate action URLs based on tier
 */
function getActionUrls(
  analysisId: string,
  tier: UserTier
): TieredAnalysisResult['actions'] {
  const baseUrl = `/api/analyze/${analysisId}`;

  const actions: TieredAnalysisResult['actions'] = {
    preview: `${baseUrl}/preview`,
    downloadReport: `${baseUrl}/report.md`,
    downloadSARIF: `${baseUrl}/report.sarif`,
    downloadLSP: `${baseUrl}/report.lsp.json`
  };

  // PRO/Enterprise get fix actions
  if (tier === 'pro' || tier === 'enterprise') {
    actions.applyFixes = `${baseUrl}/fixes/apply`;
    actions.createPR = `${baseUrl}/fixes/pr`;
  }

  return actions;
}

// ============================================================================
// ENDPOINT HANDLERS
// ============================================================================

/**
 * POST /api/analyze
 * Start a new PR analysis
 *
 * Request body:
 * {
 *   "repositoryUrl": "https://github.com/owner/repo",
 *   "prNumber": 123,
 *   "language": "java",  // optional
 *   "analysisMode": "standard"  // optional: quick | standard | complete
 * }
 *
 * Response:
 * {
 *   "success": true,
 *   "data": {
 *     "analysisId": "repo-pr123-1234567890",
 *     "status": "running",
 *     "estimatedDuration": "2-5 minutes"
 *   }
 * }
 */
export async function handleAnalyzeStart(
  req: APIRequest<AnalyzeRequestBody>
): Promise<APIResponse<{ analysisId: string; status: string; estimatedDuration: string }>> {
  const body = req.body;

  // Validate request
  if (!body?.repositoryUrl || !body?.prNumber) {
    return {
      success: false,
      error: 'Missing required fields: repositoryUrl and prNumber',
      timestamp: new Date().toISOString()
    };
  }

  // Generate analysis ID
  const repoName = body.repositoryUrl.match(/\/([^/]+)\.git$|\/([^/]+)$/)?.[1]?.toLowerCase() || 'repo';
  const analysisId = `${repoName}-pr${body.prNumber}-${Date.now()}`;

  // Store pending analysis
  analysisStore.set(analysisId, {
    status: 'running',
    request: body,
    startedAt: new Date().toISOString()
  });

  // Start analysis in background
  runAnalysisAsync(analysisId, body);

  return {
    success: true,
    data: {
      analysisId,
      status: 'running',
      estimatedDuration: body.analysisMode === 'quick' ? '1-2 minutes' :
                         body.analysisMode === 'complete' ? '5-10 minutes' : '2-5 minutes'
    },
    timestamp: new Date().toISOString()
  };
}

/**
 * GET /api/analyze/:analysisId
 * Get analysis status and results
 */
export async function handleAnalyzeStatus(
  req: APIRequest
): Promise<APIResponse<{
  analysisId: string;
  status: string;
  result?: AnalysisResult;
  startedAt: string;
  completedAt?: string;
}>> {
  const analysisId = req.params?.analysisId;

  if (!analysisId) {
    return {
      success: false,
      error: 'Missing analysisId parameter',
      timestamp: new Date().toISOString()
    };
  }

  const analysis = analysisStore.get(analysisId);

  if (!analysis) {
    return {
      success: false,
      error: `Analysis not found: ${analysisId}`,
      timestamp: new Date().toISOString()
    };
  }

  return {
    success: true,
    data: {
      analysisId,
      status: analysis.status,
      result: analysis.result,
      startedAt: analysis.startedAt,
      completedAt: analysis.completedAt
    },
    timestamp: new Date().toISOString()
  };
}

/**
 * GET /api/analyze/:analysisId/issues
 * Get issues with optional filtering
 *
 * Query params:
 * - category: NEW | EXISTING_MODIFIED | RESOLVED | EXISTING_REST (comma-separated)
 * - severity: critical | high | medium | low (comma-separated)
 * - tool: pmd | semgrep | checkstyle | etc. (comma-separated)
 * - detectedCategory: Security | Performance | Architecture | Dependencies | Code Quality (comma-separated)
 * - hasAIFix: true | false
 * - limit: number (default 100)
 * - offset: number (default 0)
 */
export async function handleAnalyzeIssues(
  req: APIRequest
): Promise<APIResponse<{
  total: number;
  filtered: number;
  issues: any[];
  pagination: { limit: number; offset: number; hasMore: boolean };
}>> {
  const analysisId = req.params?.analysisId;
  const query = req.query || {};

  if (!analysisId) {
    return {
      success: false,
      error: 'Missing analysisId parameter',
      timestamp: new Date().toISOString()
    };
  }

  const analysis = analysisStore.get(analysisId);

  if (!analysis) {
    return {
      success: false,
      error: `Analysis not found: ${analysisId}`,
      timestamp: new Date().toISOString()
    };
  }

  if (analysis.status !== 'completed' || !analysis.result) {
    return {
      success: false,
      error: `Analysis not completed. Status: ${analysis.status}`,
      timestamp: new Date().toISOString()
    };
  }

  // Collect all issues (use any[] to allow filtering on inherited properties)
  let allIssues: any[] = [
    ...analysis.result.byCategory.NEW,
    ...analysis.result.byCategory.EXISTING_MODIFIED,
    ...analysis.result.byCategory.RESOLVED,
    ...analysis.result.byCategory.EXISTING_REST
  ];

  const total = allIssues.length;

  // Apply filters
  if (query.category) {
    const categories = query.category.split(',') as IssueCategory[];
    allIssues = allIssues.filter(i => categories.includes(i.category));
  }

  if (query.severity) {
    const severities = query.severity.split(',');
    allIssues = allIssues.filter(i => i.severity && severities.includes(i.severity));
  }

  if (query.tool) {
    const tools = query.tool.split(',').map(t => t.toLowerCase());
    allIssues = allIssues.filter(i => i.tool && tools.includes(i.tool.toLowerCase()));
  }

  if (query.detectedCategory) {
    const cats = query.detectedCategory.split(',');
    allIssues = allIssues.filter(i => i.detectedCategory && cats.includes(i.detectedCategory));
  }

  if (query.hasAIFix === 'true') {
    allIssues = allIssues.filter(i => i.fixSuggestion?.fix);
  } else if (query.hasAIFix === 'false') {
    allIssues = allIssues.filter(i => !i.fixSuggestion?.fix);
  }

  const filtered = allIssues.length;

  // Apply pagination
  const limit = parseInt(query.limit || '100', 10);
  const offset = parseInt(query.offset || '0', 10);
  const paginatedIssues = allIssues.slice(offset, offset + limit);

  return {
    success: true,
    data: {
      total,
      filtered,
      issues: paginatedIssues,
      pagination: {
        limit,
        offset,
        hasMore: offset + limit < filtered
      }
    },
    timestamp: new Date().toISOString()
  };
}

/**
 * GET /api/analyze/:analysisId/summary
 * Get analysis summary with scanner guidance
 */
export async function handleAnalyzeSummary(
  req: APIRequest
): Promise<APIResponse<{
  decision: string;
  issues: AnalysisResult['issues'];
  scannerGuidance: { tool: string; issueCount: number; guidance: any }[];
  duration: AnalysisResult['metadata']['duration'];
  cost: AnalysisResult['metadata']['cost'];
}>> {
  const analysisId = req.params?.analysisId;

  if (!analysisId) {
    return {
      success: false,
      error: 'Missing analysisId parameter',
      timestamp: new Date().toISOString()
    };
  }

  const analysis = analysisStore.get(analysisId);

  if (!analysis || analysis.status !== 'completed' || !analysis.result) {
    return {
      success: false,
      error: `Analysis not completed or not found`,
      timestamp: new Date().toISOString()
    };
  }

  const result = analysis.result;

  // Collect scanner guidance from issues
  const scannerGuidanceMap = new Map<string, { count: number; guidance: any }>();
  const allIssues: any[] = [
    ...result.byCategory.NEW,
    ...result.byCategory.EXISTING_MODIFIED,
    ...result.byCategory.RESOLVED,
    ...result.byCategory.EXISTING_REST
  ];

  for (const issue of allIssues) {
    if (issue.scannerGuidance && issue.tool) {
      const existing = scannerGuidanceMap.get(issue.tool);
      if (existing) {
        existing.count++;
      } else {
        scannerGuidanceMap.set(issue.tool, { count: 1, guidance: issue.scannerGuidance });
      }
    }
  }

  const scannerGuidance = Array.from(scannerGuidanceMap.entries()).map(([tool, data]) => ({
    tool,
    issueCount: data.count,
    guidance: data.guidance
  }));

  return {
    success: true,
    data: {
      decision: result.decision,
      issues: result.issues,
      scannerGuidance,
      duration: result.metadata.duration,
      cost: result.metadata.cost
    },
    timestamp: new Date().toISOString()
  };
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Convert V9 analysis result to unified report input format
 */
function convertToUnifiedAnalysisInput(
  result: AnalysisResult,
  request: AnalyzeRequestBody,
  analysisId: string
): V9AnalysisResultInput {
  // Map issue category from V9 to unified format
  const mapCategory = (category: IssueCategory): 'new' | 'existing_modified' | 'existing_rest' | 'resolved' => {
    switch (category) {
      case 'NEW': return 'new';
      case 'EXISTING_MODIFIED': return 'existing_modified';
      case 'EXISTING_REST': return 'existing_rest';
      case 'RESOLVED': return 'resolved';
      default: return 'new';
    }
  };

  // Map detected category to unified category
  const mapDetectedCategory = (detectedCategory?: string): UnifiedCategory => {
    const categoryLower = (detectedCategory || '').toLowerCase();
    if (categoryLower.includes('security')) return 'security';
    if (categoryLower.includes('performance')) return 'performance';
    if (categoryLower.includes('architecture')) return 'architecture';
    if (categoryLower.includes('depend')) return 'dependencies';
    return 'code_quality';
  };

  // Convert all issues to unified format
  const allIssues = [
    ...result.byCategory.NEW,
    ...result.byCategory.EXISTING_MODIFIED,
    ...result.byCategory.RESOLVED,
    ...result.byCategory.EXISTING_REST
  ];

  const analyzedIssues: AnalyzedIssue[] = allIssues.map((issue, index) => ({
    id: `${analysisId}-issue-${index}`,
    ruleId: issue.rule || 'unknown-rule',
    tool: issue.tool || 'unknown',
    file: issue.file,
    line: issue.line || 0,
    column: issue.column,
    message: issue.message,
    category: mapDetectedCategory(issue.detectedCategory),
    severity: issue.severity,
    status: mapCategory(issue.category),
    codeSnippet: issue.snippet,
    language: request.language
  }));

  // Calculate score from blocking issues
  const score = result.decision === 'APPROVED' ? 85 :
                result.decision === 'NEEDS_REVIEW' ? 65 : 45;

  return {
    id: analysisId,
    repositoryUrl: request.repositoryUrl,
    prNumber: request.prNumber,
    prTitle: `PR #${request.prNumber}`,
    prAuthor: 'unknown',
    prBranch: request.prBranch || `pr-${request.prNumber}`,
    baseBranch: request.baseBranch || 'main',
    mode: request.analysisMode === 'quick' ? 'fast' :
          request.analysisMode === 'complete' ? 'complete' : 'standard',
    timestamp: result.metadata.analysisTimestamp,
    duration: result.metadata.duration.total,
    score,
    blockingCount: result.issues.blocking,
    issues: analyzedIssues
  };
}

async function runAnalysisAsync(analysisId: string, request: AnalyzeRequestBody): Promise<void> {
  const service = getAnalysisService();
  const tier = request.userTier || 'basic';

  try {
    const result = await service.analyzePR({
      repositoryUrl: request.repositoryUrl,
      prNumber: request.prNumber,
      baseBranch: request.baseBranch,
      prBranch: request.prBranch,
      language: request.language,
      analysisMode: request.analysisMode,
      maxAIAnalysis: request.maxAIAnalysis,
      includeEducation: request.includeEducation
    });

    // Calculate tier-specific extras
    const tierExtras = calculateTierExtras(result, request, analysisId);
    const actions = getActionUrls(analysisId, tier);

    // Create tiered result
    const tieredResult: TieredAnalysisResult = {
      ...result,
      tier,
      ...tierExtras,
      actions
    };

    const analysis = analysisStore.get(analysisId);
    if (analysis) {
      analysis.status = result.success ? 'completed' : 'failed';
      analysis.result = tieredResult;
      analysis.completedAt = new Date().toISOString();
    }

    // Register analysis result for unified report generation
    if (result.success) {
      const unifiedAnalysisInput = convertToUnifiedAnalysisInput(result, request, analysisId);
      registerAnalysisResult(analysisId, unifiedAnalysisInput);
      console.log(`[Unified Report] Analysis registered: ${analysisId}`);
    }

    // Webhook functionality disabled for security (SSRF prevention)
    // TODO: Implement secure webhook system with:
    // 1. Webhook registration via authenticated API
    // 2. Stored webhook URLs in database (not user-provided per request)
    // 3. Signature verification for webhook payloads
    if (request.webhook) {
      console.warn('[Security] Webhook functionality is disabled. Configure webhooks via API settings.');
    }

  } catch (error: any) {
    const analysis = analysisStore.get(analysisId);
    if (analysis) {
      analysis.status = 'failed';
      analysis.result = {
        success: false,
        analysisId,
        decision: 'DECLINED',
        tier,
        issues: { total: 0, new: 0, existingModified: 0, resolved: 0, existingRest: 0, blocking: 0 },
        byCategory: { NEW: [], EXISTING_MODIFIED: [], RESOLVED: [], EXISTING_REST: [] },
        blockingIssues: [],
        metadata: {
          repositoryUrl: request.repositoryUrl,
          prNumber: request.prNumber,
          baseBranch: request.baseBranch || 'main',
          prBranch: request.prBranch || `pr-${request.prNumber}`,
          language: request.language || 'java',
          modifiedFiles: 0,
          analysisTimestamp: new Date().toISOString(),
          duration: { total: 0, toolExecution: 0, aiEnrichment: 0, reportGeneration: 0 },
          cost: { aiCalls: 0, estimatedCost: 0, savingsPercent: 0 }
        },
        actions: getActionUrls(analysisId, tier),
        error: error.message
      };
      analysis.completedAt = new Date().toISOString();
    }
  }
}

// ============================================================================
// EXPRESS.JS INTEGRATION
// ============================================================================

/**
 * Express.js route handlers
 */
export const expressHandlers = {
  async startAnalysis(req: any, res: any): Promise<void> {
    const result = await handleAnalyzeStart({ body: req.body });
    res.status(result.success ? 202 : 400).json(result);
  },

  async getStatus(req: any, res: any): Promise<void> {
    const result = await handleAnalyzeStatus({ params: req.params });
    res.status(result.success ? 200 : 404).json(result);
  },

  async getIssues(req: any, res: any): Promise<void> {
    const result = await handleAnalyzeIssues({ params: req.params, query: req.query });
    res.status(result.success ? 200 : 404).json(result);
  },

  async getSummary(req: any, res: any): Promise<void> {
    const result = await handleAnalyzeSummary({ params: req.params });
    res.status(result.success ? 200 : 404).json(result);
  }
};

/**
 * POST /api/analyze/:analysisId/report
 * Generate a unified report for a completed analysis
 */
export async function handleGenerateAnalysisReport(
  req: APIRequest<{ tier?: 'basic' | 'pro'; userId?: string }>
): Promise<APIResponse<{ reportId: string }>> {
  const analysisId = req.params?.analysisId;
  const body = req.body || {};

  if (!analysisId) {
    return {
      success: false,
      error: 'Missing analysisId parameter',
      timestamp: new Date().toISOString()
    };
  }

  const analysis = analysisStore.get(analysisId);
  if (!analysis) {
    return {
      success: false,
      error: `Analysis not found: ${analysisId}`,
      timestamp: new Date().toISOString()
    };
  }

  if (analysis.status !== 'completed' || !analysis.result) {
    return {
      success: false,
      error: `Analysis not completed. Status: ${analysis.status}`,
      timestamp: new Date().toISOString()
    };
  }

  // Import the handleGenerateReport from unified-report-endpoint
  const { handleGenerateReport } = require('./unified-report-endpoint');

  const reportResult = await handleGenerateReport({
    body: {
      analysisId,
      userId: body.userId || 'anonymous',
      tier: body.tier || 'basic'
    }
  });

  if (reportResult.success && reportResult.data) {
    return {
      success: true,
      data: { reportId: reportResult.data.reportId },
      timestamp: new Date().toISOString()
    };
  }

  return {
    success: false,
    error: reportResult.error || 'Failed to generate report',
    timestamp: new Date().toISOString()
  };
}

/**
 * Express router setup helper
 */
export function setupAnalyzeRoutes(router: any): void {
  router.post('/analyze', expressHandlers.startAnalysis);
  router.get('/analyze/:analysisId', expressHandlers.getStatus);
  router.get('/analyze/:analysisId/issues', expressHandlers.getIssues);
  router.get('/analyze/:analysisId/summary', expressHandlers.getSummary);
  router.post('/analyze/:analysisId/report', async (req: any, res: any) => {
    const result = await handleGenerateAnalysisReport({ params: req.params, body: req.body });
    res.status(result.success ? 201 : 400).json(result);
  });
}

// ============================================================================
// STANDALONE TEST
// ============================================================================

if (require.main === module) {
  console.log('PR Analysis API Endpoint - Standalone Test\n');

  // Test the handlers directly
  (async () => {
    console.log('Testing handleAnalyzeStart...');
    const startResult = await handleAnalyzeStart({
      body: {
        repositoryUrl: 'https://github.com/apache/kafka',
        prNumber: 17620,
        language: 'java',
        analysisMode: 'quick'
      }
    });
    console.log('Start result:', JSON.stringify(startResult, null, 2));

    if (startResult.success && startResult.data) {
      console.log('\nWaiting 5 seconds before checking status...');
      await new Promise(resolve => setTimeout(resolve, 5000));

      const statusResult = await handleAnalyzeStatus({
        params: { analysisId: startResult.data.analysisId }
      });
      console.log('Status result:', JSON.stringify(statusResult, null, 2));
    }
  })();
}
