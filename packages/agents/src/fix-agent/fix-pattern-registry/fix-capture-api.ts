/**
 * Fix Capture API
 *
 * REST API endpoints for the IDE extension to:
 * 1. Capture manual fixes from users
 * 2. Look up patterns for rules
 * 3. Apply patterns to generate fixes
 * 4. Report fix success/failure for learning
 *
 * This file can be imported into Express/Fastify routers
 */

import {
  getFixPatternRegistry,
  FixCaptureRequest,
  FixCaptureResponse,
  PatternLookupRequest,
  PatternLookupResponse,
  FixApplyRequest,
  FixApplyResponse,
  FixPattern,
  PatternStatus,
} from './index';

// =============================================================================
// API Request/Response Types (for IDE Extension)
// =============================================================================

/**
 * IDE Extension request to capture a fix
 */
export interface IDEFixCaptureRequest {
  /** The rule ID (from SARIF/LSP) */
  ruleId: string;
  /** Tool that detected the issue */
  tool: string;
  /** File path */
  filePath: string;
  /** Code before user's fix */
  beforeCode: string;
  /** Code after user's fix */
  afterCode: string;
  /** Line number of the issue */
  lineNumber: number;
  /** Original issue message */
  issueMessage: string;
  /** User identifier (email or ID) */
  userId: string;
  /** IDE metadata */
  ide?: {
    name: string; // "vscode", "cursor", "neovim"
    version: string;
    extensionVersion: string;
  };
}

/**
 * IDE Extension response after capturing
 */
export interface IDEFixCaptureResponse {
  success: boolean;
  patternId?: string;
  status: PatternStatus;
  message: string;
  /** Whether the pattern was auto-approved */
  autoApproved: boolean;
  /** Points earned (for gamification) */
  pointsEarned?: number;
  /** User's contribution stats */
  contributorStats?: {
    totalContributions: number;
    acceptedContributions: number;
    rank: string; // "bronze", "silver", "gold", "platinum"
  };
}

/**
 * IDE Extension request to report fix application result
 */
export interface IDEFixResultRequest {
  /** Pattern ID that was applied */
  patternId: string;
  /** Was the fix successful? */
  success: boolean;
  /** Did the user revert the fix? */
  reverted: boolean;
  /** Optional: Why was it reverted? */
  revertReason?: string;
  /** User identifier */
  userId: string;
}

// =============================================================================
// API Handlers
// =============================================================================

/**
 * Check if user can contribute (call before showing "Contribute" option)
 * Returns false for banned users - IDE should NOT show contribute option
 */
export async function handleCanContribute(userId: string): Promise<{
  canContribute: boolean;
  reason?: string;
  trustStatus: 'new' | 'trusted' | 'banned';
  stats?: {
    totalContributions: number;
    acceptedContributions: number;
    rank: string;
  };
}> {
  const registry = getFixPatternRegistry();

  // Check if user is banned
  if (registry.isUserBanned(userId)) {
    return {
      canContribute: false,
      reason: 'Your account has been permanently banned from contributing.',
      trustStatus: 'banned',
    };
  }

  // Get user stats
  const stats = registry.getContributorStats(userId);

  if (stats) {
    return {
      canContribute: true,
      trustStatus: stats.trustStatus as 'new' | 'trusted' | 'banned',
      stats: {
        totalContributions: stats.totalContributions,
        acceptedContributions: stats.acceptedContributions,
        rank: stats.rank,
      },
    };
  }

  // New user - can contribute
  return {
    canContribute: true,
    trustStatus: 'new',
  };
}

/**
 * Handle fix capture request from IDE
 */
export async function handleFixCapture(
  request: IDEFixCaptureRequest
): Promise<IDEFixCaptureResponse> {
  const registry = getFixPatternRegistry();

  // Convert to internal format
  const captureRequest: FixCaptureRequest = {
    ruleId: request.ruleId,
    tool: request.tool,
    filePath: request.filePath,
    beforeCode: request.beforeCode,
    afterCode: request.afterCode,
    lineNumber: request.lineNumber,
    issueMessage: request.issueMessage,
    userId: request.userId,
    context: {
      framework: detectFramework(request.filePath),
      language: detectLanguage(request.filePath),
    },
  };

  // Capture the fix
  const result = await registry.capture(captureRequest);

  // Calculate points (gamification)
  const points = result.autoApproved ? 50 : 10;

  // Get contributor stats (mock for now)
  const contributorStats = await getContributorStats(request.userId);

  return {
    success: result.success,
    patternId: result.patternId,
    status: result.status,
    message: result.message,
    autoApproved: result.autoApproved,
    pointsEarned: result.success ? points : 0,
    contributorStats,
  };
}

/**
 * Handle pattern lookup request from IDE
 */
export async function handlePatternLookup(
  ruleId: string,
  tool?: string,
  fileType?: string
): Promise<PatternLookupResponse> {
  const registry = getFixPatternRegistry();

  return registry.lookup({
    ruleId,
    tool,
    fileType,
    activeOnly: true,
  });
}

/**
 * Handle fix application request from IDE
 */
export async function handleFixApply(request: FixApplyRequest): Promise<FixApplyResponse> {
  const registry = getFixPatternRegistry();
  return registry.apply(request);
}

/**
 * Handle fix result reporting from IDE
 */
export async function handleFixResult(request: IDEFixResultRequest): Promise<{ success: boolean }> {
  const registry = getFixPatternRegistry();

  await registry.recordApplication(request.patternId, request.success, request.reverted);

  // If reverted with reason, store for analysis
  if (request.reverted && request.revertReason) {
    await storeRevertFeedback(request.patternId, request.userId, request.revertReason);
  }

  return { success: true };
}

/**
 * Get all patterns (for admin UI)
 */
export async function handleListPatterns(filters?: {
  tool?: string;
  status?: PatternStatus;
  minConfidence?: number;
}): Promise<FixPattern[]> {
  const registry = getFixPatternRegistry();
  return registry.listPatterns(filters);
}

/**
 * Update pattern status (admin only)
 */
export async function handleUpdatePatternStatus(
  patternId: string,
  status: PatternStatus,
  reviewerId: string
): Promise<{ success: boolean }> {
  const registry = getFixPatternRegistry();
  const result = await registry.updateStatus(patternId, status, reviewerId);
  return { success: result };
}

// =============================================================================
// Express Router Factory
// =============================================================================

/**
 * Create Express router for fix pattern API
 *
 * Usage:
 * ```typescript
 * import express from 'express';
 * import { createFixPatternRouter } from './fix-capture-api';
 *
 * const app = express();
 * app.use('/api/fix-patterns', createFixPatternRouter());
 * ```
 */
export function createFixPatternRouter() {
  // Note: This is a factory function that returns route handlers
  // The actual Express router would be created in the API package

  return {
    /**
     * GET /can-contribute/:userId
     * Check if user can contribute (call BEFORE showing contribute option)
     */
    canContribute: async (req: { params: { userId: string } }) => {
      return handleCanContribute(req.params.userId);
    },

    /**
     * POST /capture
     * Capture a manual fix from IDE
     */
    capture: async (req: { body: IDEFixCaptureRequest }) => {
      return handleFixCapture(req.body);
    },

    /**
     * GET /lookup/:ruleId
     * Look up patterns for a rule
     */
    lookup: async (req: { params: { ruleId: string }; query: { tool?: string; fileType?: string } }) => {
      return handlePatternLookup(req.params.ruleId, req.query.tool, req.query.fileType);
    },

    /**
     * POST /apply
     * Apply a pattern to fix code
     */
    apply: async (req: { body: FixApplyRequest }) => {
      return handleFixApply(req.body);
    },

    /**
     * POST /result
     * Report fix application result
     */
    result: async (req: { body: IDEFixResultRequest }) => {
      return handleFixResult(req.body);
    },

    /**
     * GET /patterns
     * List all patterns (admin)
     */
    list: async (req: { query: { tool?: string; status?: PatternStatus; minConfidence?: string } }) => {
      return handleListPatterns({
        tool: req.query.tool,
        status: req.query.status,
        minConfidence: req.query.minConfidence ? parseInt(req.query.minConfidence) : undefined,
      });
    },

    /**
     * PATCH /patterns/:patternId/status
     * Update pattern status (admin)
     */
    updateStatus: async (req: { params: { patternId: string }; body: { status: PatternStatus; reviewerId: string } }) => {
      return handleUpdatePatternStatus(req.params.patternId, req.body.status, req.body.reviewerId);
    },
  };
}

// =============================================================================
// Helper Functions
// =============================================================================

function detectFramework(filePath: string): string | undefined {
  const path = filePath.toLowerCase();

  if (path.includes('.github/workflows')) return 'github-actions';
  if (path.includes('next.config')) return 'nextjs';
  if (path.includes('package.json')) return 'nodejs';
  if (path.includes('pom.xml')) return 'maven';
  if (path.includes('build.gradle')) return 'gradle';
  if (path.includes('requirements.txt') || path.includes('pyproject.toml')) return 'python';

  return undefined;
}

function detectLanguage(filePath: string): string {
  const ext = filePath.split('.').pop()?.toLowerCase() || '';
  const langMap: Record<string, string> = {
    ts: 'typescript',
    tsx: 'typescript',
    js: 'javascript',
    jsx: 'javascript',
    py: 'python',
    java: 'java',
    go: 'go',
    rs: 'rust',
    yml: 'yaml',
    yaml: 'yaml',
    json: 'json',
    md: 'markdown',
  };
  return langMap[ext] || 'unknown';
}

async function getContributorStats(userId: string): Promise<{
  totalContributions: number;
  acceptedContributions: number;
  rank: string;
}> {
  // TODO: Fetch from database
  // For now, return mock data
  return {
    totalContributions: 1,
    acceptedContributions: 0,
    rank: 'bronze',
  };
}

async function storeRevertFeedback(
  patternId: string,
  userId: string,
  reason: string
): Promise<void> {
  // TODO: Store in database for pattern improvement
  console.log(`[FixPatternRegistry] Revert feedback for ${patternId}: ${reason}`);
}

// =============================================================================
// IDE Extension Client SDK
// =============================================================================

/**
 * Client SDK for IDE extensions to interact with the Fix Pattern API
 *
 * Usage in VS Code extension:
 * ```typescript
 * import { FixPatternClient } from 'codequal-sdk';
 *
 * const client = new FixPatternClient('https://api.codequal.dev');
 *
 * // Capture a manual fix
 * await client.capturefix({
 *   ruleId: 'yaml.github-actions...',
 *   beforeCode: '...',
 *   afterCode: '...',
 *   // ...
 * });
 * ```
 */
export class FixPatternClient {
  private baseUrl: string;
  private apiKey?: string;

  constructor(baseUrl: string, apiKey?: string) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.apiKey = apiKey;
  }

  private async fetch<T>(path: string, options: RequestInit = {}): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
    }

    const response = await fetch(`${this.baseUrl}${path}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }

    return response.json() as Promise<T>;
  }

  /**
   * Check if user can contribute (call BEFORE showing "Contribute" option)
   * If canContribute is false, do NOT show the contribute UI to this user
   */
  async canContribute(userId: string): Promise<{
    canContribute: boolean;
    reason?: string;
    trustStatus: 'new' | 'trusted' | 'banned';
    stats?: {
      totalContributions: number;
      acceptedContributions: number;
      rank: string;
    };
  }> {
    return this.fetch(`/api/fix-patterns/can-contribute/${encodeURIComponent(userId)}`);
  }

  /**
   * Capture a manual fix
   */
  async captureFix(request: IDEFixCaptureRequest): Promise<IDEFixCaptureResponse> {
    return this.fetch('/api/fix-patterns/capture', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  /**
   * Look up patterns for a rule
   */
  async lookupPattern(
    ruleId: string,
    tool?: string,
    fileType?: string
  ): Promise<PatternLookupResponse> {
    const params = new URLSearchParams();
    if (tool) params.set('tool', tool);
    if (fileType) params.set('fileType', fileType);

    const query = params.toString();
    return this.fetch(`/api/fix-patterns/lookup/${encodeURIComponent(ruleId)}${query ? `?${query}` : ''}`);
  }

  /**
   * Apply a pattern to fix code
   */
  async applyPattern(request: FixApplyRequest): Promise<FixApplyResponse> {
    return this.fetch('/api/fix-patterns/apply', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  /**
   * Report fix result
   */
  async reportResult(request: IDEFixResultRequest): Promise<{ success: boolean }> {
    return this.fetch('/api/fix-patterns/result', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }
}
