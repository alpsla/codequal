/**
 * V9 API Module
 *
 * Unified API for PR analysis, report retrieval, and webhook integration.
 *
 * Services:
 * - V9AnalysisService: Core analysis orchestration
 * - Report API: Retrieve analysis reports and outputs
 * - Analyze API: Trigger and monitor PR analysis
 *
 * Usage with Express:
 *   import express from 'express';
 *   import { setupAllRoutes } from '@codequal/agents/two-branch/api';
 *
 *   const app = express();
 *   app.use(express.json());
 *   setupAllRoutes(app);
 *   app.listen(3000);
 */

// Analysis Service
export {
  V9AnalysisService,
  getAnalysisService,
  analyzePR,
  type AnalysisRequest,
  type AnalysisResult,
  type EnrichedIssue,
  type IssueCategory,
  type SupportedLanguage,
  type AnalysisMode
} from './v9-analysis-service';

// Analysis Endpoints
export {
  handleAnalyzeStart,
  handleAnalyzeStatus,
  handleAnalyzeIssues,
  handleAnalyzeSummary,
  setupAnalyzeRoutes,
  expressHandlers as analyzeExpressHandlers,
  type AnalyzeRequestBody,
  type IssueFilter,
  type APIRequest,
  type APIResponse
} from './analyze-pr-endpoint';

// ============================================================================
// COMBINED ROUTER SETUP
// ============================================================================

/**
 * Setup all API routes on an Express app or router
 *
 * Routes:
 * - POST /api/analyze - Start PR analysis
 * - GET /api/analyze/:id - Get analysis status/results
 * - GET /api/analyze/:id/issues - Get filtered issues
 * - GET /api/analyze/:id/summary - Get summary with scanner guidance
 *
 * Usage:
 *   import express from 'express';
 *   import { setupAllRoutes } from './api';
 *
 *   const app = express();
 *   app.use(express.json());
 *   setupAllRoutes(app);
 */
export function setupAllRoutes(app: any): void {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { setupAnalyzeRoutes: setupRoutes } = require('./analyze-pr-endpoint');

  // Create API router
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const apiRouter = app.Router ? app.Router() : require('express').Router();

  // Setup routes
  setupRoutes(apiRouter);

  // Mount at /api
  app.use('/api', apiRouter);

  console.log('V9 API routes mounted at /api');
  console.log('  POST /api/analyze - Start PR analysis');
  console.log('  GET  /api/analyze/:id - Get analysis status');
  console.log('  GET  /api/analyze/:id/issues - Get filtered issues');
  console.log('  GET  /api/analyze/:id/summary - Get summary');
}

// ============================================================================
// QUICK START EXAMPLE
// ============================================================================

/**
 * Quick start example - run a standalone analysis
 *
 * Usage:
 *   import { quickAnalyze } from './api';
 *   const result = await quickAnalyze('https://github.com/owner/repo', 123);
 */
export async function quickAnalyze(
  repositoryUrl: string,
  prNumber: number,
  options?: {
    language?: 'java' | 'typescript' | 'python' | 'go' | 'rust' | 'ruby' | 'php' | 'csharp';
    analysisMode?: 'quick' | 'standard' | 'complete';
    maxAIAnalysis?: number;
  }
): Promise<{
  decision: string;
  issues: { total: number; new: number; blocking: number };
  reportPath?: string;
  duration: number;
}> {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { analyzePR } = require('./v9-analysis-service');

  const result = await analyzePR(repositoryUrl, prNumber, options);

  return {
    decision: result.decision,
    issues: {
      total: result.issues.total,
      new: result.issues.new,
      blocking: result.issues.blocking
    },
    reportPath: result.report?.markdown,
    duration: result.metadata.duration.total
  };
}
