2/**
 * V9 Grouped Report Formatter
 * 
 * Generates compact reports by grouping similar issues and providing
 * detailed locations as separate attachment files.
 * 
 * Key Features:
 * - 100x smaller reports (50 KB vs 5 MB)
 * - 900x faster generation (1s vs 15min)
 * - IDE integration ready (one-click fix all)
 * - Lazy-loadable location data
 */

import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import * as dotenv from 'dotenv';
import { IssueGroup } from '../utils/issue-grouping';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { AppScoreManager } from './v9-app-score-manager';
import { SkillScoreManager } from './v9-skill-score-manager';
import { LSPSARIFConverter } from './lsp-sarif-converter';
import { GitLabCodeQualityConverter } from './gitlab-codequality-converter';
import { classifyIssue, getClassificationStats } from '../../fix-agent/issue-classifier';
import { getRouteSummary, EnrichedIssue as FixEnrichedIssue } from '../../fix-agent/fix-router';
import {
  getOptimizedPrompt,
  generateDynamicPrompt,
  buildAIFixRequest,
  AIFixPrompt,
  IssueContext
} from '../../fix-agent/ai-fix-prompts';
import {
  getManualReviewInfo,
  generateManualReviewMessage,
  canAIHelp,
  getAIPromptHint,
  ManualReviewInfo
} from '../../fix-agent/manual-review-reasons';

// Load environment variables
dotenv.config();

// Service Imports for Delegation Pattern
import {
  formatDate,
  formatDuration,
  cleanAIContent,
  getUserFriendlyTitle
} from '../report/formatter-utils';
import { getCuratedResourcesForRule, enrichIssuesWithAI } from '../report/ai-enrichment';
import {
  detectCategory,
  calculateRiskLevel,
  getCategoryContext,
  getPriorityGuidance
} from '../report/category-detector';
import {
  generateEducationalResources,
  generateEducationalResourcesBrave
} from '../report/educational-resources';
import {
  generateBusinessImpact,
  getRiskImpactLevel,
  calculateIssueWeightedSkillScore,
  getExploitCostExplanation
} from '../report/business-impact';
import {
  generateAnalysisMetadata,
  generatePRComment,
  generateFooter,
  groupBySeverity,
  groupByCategory,
  groupByTool
} from '../report/metadata-footer';
import {
  generateHeader,
  generateKeyFindings,
  generateCriticalBlockers,
  generateQuickWins
} from '../report/header-sections';
import {
  calculateQualityScore,
  checkCachedScoresForCommit,
  calculateFullV9Score,
  calculateCategoryScore,
  calculateSimplifiedScore,
  getScoreInterpretation
} from '../report/score-calculator';
import {
  generateAchievementsSection,
  calculateLevel,
  generateXpProgressBar,
  UnlockedAchievement
} from '../report/achievements';
import {
  generateCommunityImpactSection,
  CommunityImpactSummary
} from '../report/community-impact';

// ================================================================
// Types for Grouped Report
// ================================================================

export interface EnrichedIssue {
  file: string;
  line?: number;
  column?: number;
  rule: string;
  tool: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  message: string;
  category: string;  // Issue type: NEW, EXISTING_MODIFIED, RESOLVED, EXISTING_REST
  detectedCategory?: string;  // Issue category: Security, Performance, Architecture, Dependencies, Code Quality
  snippet?: string;
  fixSuggestion?: {
    fix: string;
    correctedCode: string;
    explanation: string;
    // BUG #89 FIX: Add structured description matching specialized-agents.ts
    issueDescription?: {
      what: string;
      why: string;
      causes: string[];
      impact: string;
    };
    bestPractices?: string[];
  };
  educationalLinks?: string[];
  isGroupRepresentative?: boolean;
  groupSize?: number;
  // BUG #87 FIX: AI severity classification metadata
  severityReasoning?: string;
  severityConfidence?: 'high' | 'medium' | 'low';  // Matches ai-severity-classifier.ts output
}

export interface GroupedReportOutput {
  markdown: string;              // Main report (compact)
  attachments: LocationAttachment[];  // Location files
  mapping: IssueGroupMapping;    // Group index
  ideFixFiles: IDEFixFile[];     // IDE integration files
}

export interface LocationAttachment {
  groupId: string;
  filename: string;
  content: GroupLocationData;
}

export interface GroupLocationData {
  group_id: string;
  rule: string;
  tool: string;
  severity: string;  // 'critical' | 'high' | 'medium' | 'low'
  category: string;
  total_occurrences: number;
  representative: IssueLocation;
  ai_fix: AIFixData;
  locations: IssueLocation[];
  statistics: GroupStatistics;
}

export interface IssueLocation {
  file: string;
  line: number;
  column?: number;
  snippet: string;
  category?: string;
}

export interface AIFixData {
  fix: string;
  corrected_code: string;
  explanation: string;
  best_practices?: string[];
}

export interface GroupStatistics {
  files_affected: number;
  lines_affected: number;
  categories: Record<string, number>;
}

export interface IssueGroupMapping {
  version: string;
  generated_at: string;
  repository: string;
  pr_number: number;
  total_issues: number;
  total_groups: number;
  groups: GroupSummary[];
  statistics: OverallStatistics;
}

export interface GroupSummary {
  id: string;
  rule: string;
  tool: string;
  severity: string;
  count: number;
  category: string;
  attachment?: string;
  ide_fix_file?: string;  // NEW: For IDE integration
}

export interface OverallStatistics {
  by_severity: Record<string, number>;
  by_category: Record<string, number>;
  by_tool: Record<string, number>;
}

// ================================================================
// IDE Integration Types
// ================================================================

export interface IDEFixFile {
  groupId: string;
  filename: string;  // e.g., "group-1-cursor-fix.json"
  content: CursorFixData;
}

export interface CursorFixData {
  version: "1.0";
  group_id: string;
  rule: string;
  tool: string;  // ENHANCEMENT: Added for manifest enrichment
  severity: string;
  description: string;

  // Fix pattern for automated application
  fix_pattern: FixPattern;

  // All locations to apply fix
  locations: FixLocation[];

  // Metadata for IDE
  metadata: {
    total_occurrences: number;
    confidence: 'high' | 'medium' | 'low';
    safe_auto_apply: boolean;
    estimated_time_seconds: number;
    required_imports?: string[];
  };
}

export interface FixPattern {
  type: 'regex' | 'ast' | 'template' | 'ai-generated' | 'manual-review';

  // For regex-based fixes
  find_regex?: string;
  replace_template?: string;

  // For AST-based fixes (more complex)
  ast_transformation?: {
    node_type: string;
    transform: string;
  };

  // Example of before/after
  example: {
    before: string;
    after: string;
  };

  // Human-readable instructions
  instructions: string;

  // Three-Tier Fix System integration (Session 35)
  fixTier?: 1 | 2 | 3;
  fixerTool?: string;           // Tool name (eslint, ruff, sorald, ai)
  fixerCommand?: string;        // Command to execute (eslint --fix, ruff check --fix)
  confidence?: number;          // 0-100, confidence in the fix

  // For Tier 3 (AI-generated fixes) or recommendations
  aiPrompt?: {
    systemPrompt: string;
    userPromptTemplate: string;
    outputFormat: 'diff' | 'full-file' | 'code-block' | 'markdown';  // markdown for recommendations
    maxTokens: number;
    temperature: number;
    requiredContext: ('file' | 'function' | 'class' | 'imports' | 'related-files')[];
    isRecommendation?: boolean;  // true for secrets/IaC/container issues
  };

  // For manual review (when auto-fix is not possible)
  manualReview?: {
    reason: string;              // CONTEXT_REQUIRED, SECURITY_DECISION, etc.
    explanation: string;         // User-friendly explanation
    userAction: string;          // What the user should do
    aiCanHelp: boolean;          // Can AI generate a suggestion?
    aiPromptHint?: string;       // Hint for AI if it can help
    exampleFix?: string;         // Example of what a fix might look like
    riskLevel: 'low' | 'medium' | 'high';
  };
}

export interface FixLocation {
  file: string;
  line: number;
  column?: number;
  snippet: string;
  context_before?: string;
  context_after?: string;
}

// ================================================================
// V9 Grouped Report Formatter
// ================================================================

export class V9GroupedReportFormatter {
  private supabase: SupabaseClient | null = null;
  private appScoreManager: AppScoreManager | null = null;
  private SHOW_PERF_SUBMETRICS = false;
  private skillScoreManager: SkillScoreManager | null = null;
  private repoPath: string | undefined = undefined;  // Local repo path for snippet extraction
  private repositoryUrl: string | undefined = undefined;  // SESSION 74: GitHub URL for remote snippet fetching
  private userTier: 'basic' | 'pro' | 'enterprise' = 'basic';  // User tier for report differentiation
  // BUG-76: AI enrichment dependencies
  private modelConfigResolver: any = null;
  private detectedLanguage = 'java';
  private detectedRepoSize: 'small' | 'medium' | 'large' | 'enterprise' = 'medium';
  private serviceHealthTracker: any = null;  // ServiceHealthTracker for monitoring
  // Feature toggles for optional sections
  private readonly SHOW_FIX_COVERAGE: boolean = false;
  private readonly SHOW_QUICK_WINS: boolean = false;
  private readonly SHOW_SYSTEM_INFO: boolean = false;
  private readonly SHOW_AGENT_PERFORMANCE: boolean = false;  // BUG-110: Disabled - not useful for users
  private readonly SHOW_TOOL_PERFORMANCE: boolean = true;   // BUG #8 FIX: Enable tool performance tracking
  private readonly SHOW_EFFICIENCY_ANALYSIS: boolean = true; // BUG #10 FIX: Enable cost analysis
  private readonly SHOW_FOCUS_AREAS: boolean = false;        // BUG-110: Disabled - not useful for users
  // BUG-105 FIX: Cached pattern count (fetched from Supabase once per session)
  private cachedPatternCount: number | null = null;

  /**
   * BUG-105 FIX: Get pattern count from cache or Supabase
   * Returns cached value if available, otherwise fetches from DB and caches
   */
  private getPatternCountFromCache(): number {
    // Return cached value if available
    if (this.cachedPatternCount !== null) {
      return this.cachedPatternCount;
    }
    // Default to 640 if no Supabase connection
    // The actual count will be set during formatGroupedReport() initialization
    return 640;
  }

  /**
   * BUG-105 FIX: Fetch and cache pattern count from Supabase
   */
  private async fetchPatternCount(): Promise<number> {
    if (this.cachedPatternCount !== null) {
      return this.cachedPatternCount;
    }

    if (!this.supabase) {
      this.cachedPatternCount = 640;
      return 640;
    }

    try {
      const { count, error } = await this.supabase
        .from('fix_patterns')
        .select('*', { count: 'exact', head: true });

      if (error) {
        console.warn('[V9Formatter] Error fetching pattern count:', error.message);
        this.cachedPatternCount = 640;
        return 640;
      }

      this.cachedPatternCount = count || 640;
      console.log(`[V9Formatter] Pattern count: ${this.cachedPatternCount}`);
      return this.cachedPatternCount;
    } catch (e) {
      console.warn('[V9Formatter] Failed to fetch pattern count:', e);
      this.cachedPatternCount = 640;
      return 640;
    }
  }

  /**
   * Template patterns that indicate AI error responses (not actual code)
   * These should be stripped from fix examples to avoid confusing users
   */
  private static readonly TEMPLATE_PATTERNS = [
    /should be:/i,
    /change to:/i,
    /replace with:/i,
    /instead of:/i,
    /the fix is:/i,
    /could you (?:please )?provide/i,
    /can you (?:please )?(?:provide|share|show)/i,
    /I (?:need|would need|require)/i,
    /please (?:provide|share|show)/i,
    /you haven't provided/i,
    /I don't have/i,
    /without (?:seeing|the actual)/i,
    /I cannot/i,
    /the actual code/i,
    /the complete code/i,
    /code snippet/i,
  ];

  /**
   * Clean template text from corrected code
   * Returns empty string if the code contains AI error patterns
   */
  private cleanCorrectedCode(code: string | undefined): string {
    if (!code) return '';

    // Check if code contains any template patterns
    for (const pattern of V9GroupedReportFormatter.TEMPLATE_PATTERNS) {
      if (pattern.test(code)) {
        console.log(`[V9Formatter] Rejecting template-style code: "${code.substring(0, 50)}..."`);
        return '';  // Return empty to indicate no valid fix
      }
    }

    // SESSION 26: Strip license headers - users have their own
    // This handles Apache, MIT, GPL, and other common licenses
    let cleaned = code.trim();

    // Remove license block comments at the start (/* ... */) - allow leading whitespace
    const licenseBlockPattern = /^\s*\/\*[\s\S]*?(Copyright|License|Apache|MIT|GPL|BSD|Mozilla|Creative Commons)[\s\S]*?\*\/\s*/i;
    if (licenseBlockPattern.test(cleaned)) {
      cleaned = cleaned.replace(licenseBlockPattern, '').trim();
    }

    // Also try matching license headers line by line (for multi-line /* */ patterns)
    const lines = cleaned.split('\n');
    let licenseStartLine = -1;
    let licenseEndLine = -1;

    // Find license block: starts with /* and contains Copyright/License within first 30 lines
    for (let i = 0; i < Math.min(lines.length, 30); i++) {
      const line = lines[i].trim();

      // Track where the comment block starts
      if (line.startsWith('/*') && licenseStartLine === -1) {
        licenseStartLine = i;
      }

      // If we're in a comment block and find license-related content
      if (licenseStartLine !== -1 && (line.includes('Copyright') || line.includes('Licensed') || line.includes('Apache License'))) {
        // Find the end of this license block
        for (let j = i; j < lines.length; j++) {
          if (lines[j].includes('*/')) {
            licenseEndLine = j;
            break;
          }
        }
        break;
      }

      // If comment block ended without finding license content, reset
      if (line.includes('*/') && licenseStartLine !== -1 && licenseEndLine === -1) {
        // Check if this comment had no license content
        const commentContent = lines.slice(licenseStartLine, i + 1).join(' ');
        if (!commentContent.includes('Copyright') && !commentContent.includes('Licensed')) {
          licenseStartLine = -1; // Reset, this wasn't a license block
        }
      }
    }

    if (licenseEndLine > 0 && licenseStartLine >= 0) {
      console.log(`[V9Formatter] Stripping license header from lines ${licenseStartLine}-${licenseEndLine}`);
      cleaned = lines.slice(licenseEndLine + 1).join('\n').trim();
    }

    // If remaining code is too long (likely full file), truncate to relevant portion
    const codeLines = cleaned.split('\n');
    if (codeLines.length > 50) {
      // Find the first non-import, non-package line (likely the actual code)
      const firstCodeLine = codeLines.findIndex((line, idx) =>
        idx > 0 &&
        !line.trim().startsWith('import ') &&
        !line.trim().startsWith('package ') &&
        !line.trim().startsWith('//') &&
        line.trim().length > 0
      );

      if (firstCodeLine > 5) {
        // Keep package/imports summary + first 30 lines of actual code
        const packageLine = codeLines.find(l => l.trim().startsWith('package ')) || '';
        const importSummary = `// ... imports ...`;
        const relevantCode = codeLines.slice(firstCodeLine, firstCodeLine + 30);
        cleaned = [packageLine, importSummary, '', ...relevantCode, '\n// ... rest of file ...'].join('\n');
      }
    }

    return cleaned.trim();
  }

  /**
   * SESSION 92 FIX: Determine if correctedCode is actual code vs placeholder/guidance
   *
   * Returns:
   * - 'code': Actual executable code fix
   * - 'guidance': Text guidance only (no executable code)
   * - 'none': No fix suggestion at all
   *
   * Placeholder patterns to reject:
   * - "// Fix required at line X" (failed AI generation)
   * - Comments only without actual code
   * - Meta-instructions like "Replace X with Y" or "Insert X"
   */
  private getFixType(issue: EnrichedIssue): 'code' | 'guidance' | 'none' {
    const fixSuggestion = issue.fixSuggestion;
    if (!fixSuggestion) return 'none';

    const correctedCode = fixSuggestion.correctedCode;
    const fixText = fixSuggestion.fix;

    // Check if correctedCode exists and is not a placeholder
    if (correctedCode && typeof correctedCode === 'string') {
      const trimmed = correctedCode.trim();

      // Detect placeholder patterns from failed AI generation
      const placeholderPatterns = [
        /^\/\/\s*Fix required at line \d+$/i,
        /^\/\/\s*TODO:/i,
        /^\/\/\s*FIXME:/i,
        /^\/\*\s*Replace\s+/i,
        /^\/\*\s*Insert\s+/i,
        /^\s*$/  // Empty or whitespace only
      ];

      for (const pattern of placeholderPatterns) {
        if (pattern.test(trimmed)) {
          // Has correctedCode but it's a placeholder - treat as guidance
          return fixText ? 'guidance' : 'none';
        }
      }

      // Check if code is only comments (no actual executable code)
      const lines = trimmed.split('\n').filter(l => l.trim().length > 0);
      const nonCommentLines = lines.filter(l => {
        const t = l.trim();
        return !t.startsWith('//') && !t.startsWith('/*') && !t.startsWith('*') && t !== '*/';
      });

      if (nonCommentLines.length === 0) {
        // Only comments, no actual code
        return fixText ? 'guidance' : 'none';
      }

      // Has actual code - this is a real fix
      return 'code';
    }

    // No correctedCode but has text guidance
    if (fixText) {
      return 'guidance';
    }

    return 'none';
  }

  /**
   * SESSION 92 FIX: Check if issue has actual executable code fix
   * (not just text guidance or placeholders)
   */
  private hasActualCodeFix(issue: EnrichedIssue): boolean {
    return this.getFixType(issue) === 'code';
  }

  /**
   * SESSION 92 FIX: Check if issue has text guidance (but no actual code)
   */
  private hasTextGuidanceOnly(issue: EnrichedIssue): boolean {
    return this.getFixType(issue) === 'guidance';
  }

  constructor(
    modelConfigResolver?: any,
    language?: string,
    repoSize?: 'small' | 'medium' | 'large' | 'enterprise'
  ) {
    // BUG-76: Store AI enrichment dependencies
    this.modelConfigResolver = modelConfigResolver || null;
    this.detectedLanguage = language || 'java';
    this.detectedRepoSize = repoSize || 'medium';
    // Initialize Supabase if credentials are available
    try {
      const supabaseUrl = process.env.SUPABASE_URL;
      const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

      if (supabaseUrl && supabaseKey) {
        this.supabase = createClient(supabaseUrl, supabaseKey);
        this.appScoreManager = new AppScoreManager(this.supabase);
        this.skillScoreManager = new SkillScoreManager(this.supabase);
        // Initialize service health tracker for monitoring (lazy-loaded)
        this.initializeServiceHealthTracker();
        // Supabase scoring managers initialized successfully
      } else {
        // Supabase credentials not found - will use simplified scoring
      }
    } catch (error) {
      // Failed to initialize Supabase - will fall back to simplified scoring
    }
  }

  /**
   * Initialize service health tracker (lazy-loaded to avoid constructor async issues)
   */
  private async initializeServiceHealthTracker(): Promise<void> {
    if (!this.serviceHealthTracker && this.supabase) {
      try {
        const { ServiceHealthTracker } = await import('../monitoring/service-health-tracker');
        this.serviceHealthTracker = new ServiceHealthTracker(this.supabase);
      } catch (error) {
        console.warn('[V9GroupedReportFormatter] Failed to initialize ServiceHealthTracker:', error);
      }
    }
  }

  /**
   * SESSION 24: Upload attachments to Supabase Storage and get public URLs
   * @param ideFixFiles Array of IDE fix files to upload
   * @param metadata Report metadata for generating unique analysis ID
   * @returns Updated ideFixFiles with public URLs
   */
  /**
   * Upload with retry logic and rate limiting protection
   */
  private async uploadWithRetry(
    filePath: string,
    content: string | Blob,
    options: { contentType: string; cacheControl: string; upsert: boolean },
    maxRetries = 3,
    retryDelay = 1000
  ): Promise<{ data: any; error: any }> {
    let lastError: any = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const uploadResult = await this.supabase!.storage
          .from('v9-attachments')
          .upload(filePath, content, options);

        // Check if error is HTML response (authentication/permission issue)
        if (uploadResult.error) {
          const errorMessage = uploadResult.error.message || String(uploadResult.error);
          if (errorMessage.includes('<!DOCTYPE') || errorMessage.includes('<html')) {
            console.error(`[Supabase Upload] ❌ HTML response detected (likely auth/permission issue):`, errorMessage.substring(0, 200));
            // Don't retry HTML errors - they indicate a configuration issue
            return uploadResult;
          }

          // Retry on transient errors
          if (attempt < maxRetries) {
            const delay = retryDelay * Math.pow(2, attempt - 1); // Exponential backoff
            console.warn(`[Supabase Upload] ⚠️  Upload failed (attempt ${attempt}/${maxRetries}), retrying in ${delay}ms...`);
            await new Promise(resolve => setTimeout(resolve, delay));
            lastError = uploadResult.error;
            continue;
          }
        }

        return uploadResult;
      } catch (networkError: any) {
        // Handle network-level errors (EPIPE, ECONNRESET, etc.)
        const errorCode = networkError?.cause?.code || networkError?.code;
        const isNetworkError = ['EPIPE', 'ECONNRESET', 'ETIMEDOUT', 'ENOTFOUND'].includes(errorCode);

        if (isNetworkError && attempt < maxRetries) {
          const delay = retryDelay * Math.pow(2, attempt - 1);
          console.warn(`[Supabase Upload] ⚠️  Network error (${errorCode}) on attempt ${attempt}/${maxRetries}, retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          lastError = networkError;
          continue;
        }

        // If not retryable or max retries reached, throw
        throw networkError;
      }
    }

    // All retries exhausted
    return { data: null, error: lastError || new Error('Upload failed after all retries') };
  }

  private async uploadAttachmentsToSupabase(
    ideFixFiles: IDEFixFile[],
    metadata: any,
    analysisTimestamp: number  // BUG-DOG-04 FIX: Use consistent timestamp across all uploads
  ): Promise<IDEFixFile[]> {
    if (!this.supabase || ideFixFiles.length === 0) {
      console.log('[Supabase Upload] Skipped - no Supabase client or no files');
      return ideFixFiles;
    }

    // BUG-DOG-04 FIX: Use passed analysisTimestamp (not new Date.now())
    const repoName = metadata.repository?.split('/').pop() || 'unknown';
    const analysisId = `${repoName}-pr${metadata.prNumber || 0}-${analysisTimestamp}`;

    console.log(`[Supabase Upload] Starting upload for ${ideFixFiles.length} files to analysis: ${analysisId}`);

    // OPTIMIZED: Upload files in parallel batches (10 concurrent) instead of sequential
    const BATCH_SIZE = 10;
    const updatedFiles: IDEFixFile[] = [];

    // Helper function to upload a single file
    const uploadSingleFile = async (file: IDEFixFile): Promise<IDEFixFile> => {
      try {
        const filePath = `${analysisId}/${file.filename}`;
        const fileContent = JSON.stringify(file.content, null, 2);
        const fileSizeKB = Math.round(fileContent.length / 1024);

        // SESSION 25: Check file size (Supabase free tier has 50MB limit per file)
        if (fileSizeKB > 10000) {  // 10MB warning threshold
          console.warn(`[Supabase Upload] Large file: ${file.filename} (${fileSizeKB}KB)`);
        }

        // Upload to Supabase Storage with retry logic
        const { data, error } = await this.uploadWithRetry(
          filePath,
          fileContent,
          {
            contentType: 'application/json',
            cacheControl: '3600',
            upsert: true  // Allow overwriting existing files
          }
        );

        if (error) {
          console.error(`[Supabase Upload] Failed to upload ${file.filename}:`, error.message || error);

          // Track upload failure
          if (this.serviceHealthTracker) {
            await this.serviceHealthTracker.trackUploadFailure({
              service: 'manifest',
              filename: file.filename,
              error: error,
              repositoryUrl: metadata.repository,
              prNumber: metadata.prNumber,
              analysisId,
              errorDetails: {
                statusCode: (error as any).statusCode,
                error: (error as any).error
              }
            });
          }

          return file; // Return original file on error
        }

        // Get public URL
        const { data: urlData } = this.supabase!.storage
          .from('v9-attachments')
          .getPublicUrl(filePath);

        // Update file with public URL
        const updatedFile = { ...file };
        (updatedFile as any).publicUrl = urlData.publicUrl;
        console.log(`[Supabase Upload] ✅ Uploaded ${file.filename} → ${urlData.publicUrl}`);

        // Track upload success
        if (this.serviceHealthTracker) {
          await this.serviceHealthTracker.trackUploadSuccess({
            service: 'manifest',
            filename: file.filename,
            url: urlData.publicUrl,
            fileSize: fileContent.length,
            repositoryUrl: metadata.repository,
            prNumber: metadata.prNumber,
            analysisId
          });
        }

        return updatedFile;
      } catch (error) {
        console.error(`[Supabase Upload] Error uploading ${file.filename}:`, error);

        // Track upload failure
        if (this.serviceHealthTracker) {
          await this.serviceHealthTracker.trackUploadFailure({
            service: 'manifest',
            filename: file.filename,
            error: error as Error,
            repositoryUrl: metadata.repository,
            prNumber: metadata.prNumber,
            analysisId,
            errorDetails: {
              error: (error as any)?.message || String(error)
            }
          });
        }

        return file; // Return original file on error
      }
    };

    // Process files in parallel batches
    for (let i = 0; i < ideFixFiles.length; i += BATCH_SIZE) {
      const batch = ideFixFiles.slice(i, i + BATCH_SIZE);
      const batchResults = await Promise.all(batch.map(uploadSingleFile));
      updatedFiles.push(...batchResults);

      // Small delay between batches to avoid rate limiting
      if (i + BATCH_SIZE < ideFixFiles.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    const successCount = updatedFiles.filter(f => (f as any).publicUrl).length;
    console.log(`[Supabase Upload] Completed: ${successCount}/${ideFixFiles.length} files uploaded successfully`);

    return updatedFiles;
  }

  /**
   * Curated resource fallback for known rules (deterministic, zero-API)
   */
  private getCuratedResourcesForRule(ruleId: string): Array<{ title: string; url: string }> {
    return getCuratedResourcesForRule(ruleId);
  }

  /**
   * Enrich issues with fix suggestions
   *
   * SESSION 53 ARCHITECTURE CHANGE:
   * - Report generation uses rule-descriptions (0 AI calls, $0 cost)
   * - AI is reserved for fixer tools (PRO tier) and pattern creation (admin)
   *
   * When modelConfigResolver is null (default):
   * - Uses static rule-descriptions.ts + Supabase patterns
   * - Cost: $0
   *
   * When modelConfigResolver is provided (legacy/testing):
   * - Falls back to AI enrichment
   * - Cost: ~$1.50 per report (61 groups × $0.02)
   */
  private async enrichIssuesWithAI(
    issues: EnrichedIssue[],
    groups: IssueGroup[]
  ): Promise<{ enrichedIssues: EnrichedIssue[]; modelsByAgent: Record<string, string> }> {
    return enrichIssuesWithAI(
      issues,
      groups,
      this.modelConfigResolver,  // null = rule descriptions, non-null = AI
      this.detectedLanguage,
      this.detectedRepoSize
    );
  }

  /**
   * Generate grouped report with attachments
   */
  async generateGroupedReport(
    issues: EnrichedIssue[],
    groups: IssueGroup[],
    metadata: {
      // Repository Information
      repository: string;
      repoUrl?: string;
      repoPath?: string;  // Local path to cloned repository for snippet extraction
      prNumber: number;
      commitSHA?: string;  // BUG FIX #9: Git commit SHA for score caching
      prTitle?: string;
      branch?: string;
      baseBranch?: string;

      // Author Information
      prAuthor?: string;
      prAuthorEmail?: string;
      organizationName?: string;

      // Code Statistics
      totalFiles: number;
      totalLinesOfCode?: number;
      filesModified?: number;
      linesAdded?: number;
      linesDeleted?: number;
      languageBreakdown?: Record<string, number>;

      // Decision & Analysis
      decision: string;
      blockingCount: number;

      // Performance Metrics
      totalDuration?: number;
      cloneTime?: number;
      analysisTime?: number;
      reportGenerationTime?: number;

      // Timestamp
      analyzedAt?: string;
      analyzerVersion?: string;

      // Optional: Performance & Models (for metadata sections)
      agentPerformance?: Array<any>;
      toolPerformance?: Array<any>;
      modelsUsed?: Array<any> | Record<string, any>;

      // SESSION 73: User tier for tier-specific report content
      userTier?: 'basic' | 'pro' | 'enterprise';
    }
  ): Promise<GroupedReportOutput> {

    // BUG-DOG-04 FIX: Generate single timestamp for ALL uploads (manifest, LSP, SARIF)
    // This ensures consistent analysisId across all files
    const analysisTimestamp = Date.now();

    // SESSION 77: Fetch pattern count from Supabase before report generation
    // This ensures we show the real count instead of hardcoded 640
    await this.fetchPatternCount();

    const markdown: string[] = [];
    let ideFixFiles: IDEFixFile[] = [];  // BUG FIX #33: Removed separate location attachments

    console.log(`\n[DEBUG-PR#] ====== generateGroupedReport ENTRY ======`);
    console.log(`[DEBUG-PR#] metadata.prNumber: ${metadata.prNumber} (type: ${typeof metadata.prNumber})`);
    console.log(`[DEBUG-PR#] metadata.repository: ${metadata.repository}`);
    console.log(`[DEBUG-PR#] ==========================================\n`);

    // FALSE POSITIVE BUG FIX: Validate tools actually executed
    const toolsExecuted = metadata.toolPerformance?.length || 0;

    if (toolsExecuted === 0) {
      console.log(`\n[FALSE POSITIVE FIX] ⚠️  WARNING: No tools were executed!`);
      console.log(`[FALSE POSITIVE FIX] Returning ERROR report instead of false positive APPROVED`);
      console.log(`[FALSE POSITIVE FIX] This prevents misleading 100/100 scores when analysis fails\n`);

      // Return ERROR report instead of APPROVED
      // Note: Decision/score/grade are conveyed in the markdown report text
      return {
        markdown: this.generateAnalysisFailureReport(metadata),
        ideFixFiles: [],
        attachments: [],
        mapping: {
          version: '1.0',
          generated_at: new Date().toISOString(),
          repository: metadata.repository || 'unknown',
          pr_number: metadata.prNumber || 0,
          total_issues: 0,
          total_groups: 0,
          groups: [],
          statistics: {
            by_severity: { critical: 0, high: 0, medium: 0, low: 0 },
            by_category: { security: 0, performance: 0, best_practice: 0, style: 0, other: 0 },
            by_tool: {}
          }
        }
      };
    }

    console.log(`[FALSE POSITIVE FIX] ✅ Tools executed: ${toolsExecuted} - continuing with normal report generation\n`);

    // BUG #89 DEBUG: Check what issues we receive
    console.log(`\n[BUG #89] ====== ISSUE COUNT AT ENTRY ======`);
    console.log(`[BUG #89] Total issues received: ${issues.length}`);
    const categoryCounts = {
      NEW: issues.filter(i => i.category === 'NEW').length,
      EXISTING_MODIFIED: issues.filter(i => i.category === 'EXISTING_MODIFIED').length,
      RESOLVED: issues.filter(i => i.category === 'RESOLVED').length,
      EXISTING_REST: issues.filter(i => i.category === 'EXISTING_REST').length,
      UNKNOWN: issues.filter(i => !i.category || !['NEW', 'EXISTING_MODIFIED', 'RESOLVED', 'EXISTING_REST'].includes(i.category)).length
    };
    console.log(`[BUG #89] Category breakdown:`);
    console.log(`[BUG #89]   - NEW: ${categoryCounts.NEW}`);
    console.log(`[BUG #89]   - EXISTING_MODIFIED: ${categoryCounts.EXISTING_MODIFIED}`);
    console.log(`[BUG #89]   - RESOLVED: ${categoryCounts.RESOLVED}`);
    console.log(`[BUG #89]   - EXISTING_REST: ${categoryCounts.EXISTING_REST}`);
    console.log(`[BUG #89]   - UNKNOWN/MISSING: ${categoryCounts.UNKNOWN}`);
    console.log(`[BUG #89] ====================================\n`);

    // Store repoPath and repositoryUrl for snippet extraction
    // SESSION 74: Also store repositoryUrl for GitHub API fallback
    this.repoPath = metadata.repoPath || undefined;
    this.repositoryUrl = metadata.repoUrl || metadata.repository || undefined;

    // Store userTier for tier-specific report sections
    this.userTier = (metadata.userTier as 'basic' | 'pro' | 'enterprise') || 'basic';

    // BUG-095 FIX: Calculate real repo stats if not provided or if values look hardcoded
    // This ensures we show real file counts and LOC instead of placeholder values
    if (this.repoPath) {
      const needsStats = !metadata.totalFiles ||
        metadata.totalFiles === 0 ||
        metadata.totalFiles === 100 ||  // Common hardcoded default
        metadata.totalFiles === 1000 ||
        !metadata.totalLinesOfCode ||
        metadata.totalLinesOfCode === 0 ||
        metadata.totalLinesOfCode === 10000;  // Common hardcoded default

      if (needsStats) {
        console.log('[BUG-095] Calculating real repo stats (metadata values missing or look hardcoded)...');
        const repoStats = this.calculateRepoStats(this.repoPath, this.detectedLanguage, metadata.baseBranch);

        // Only override if we got real values
        if (repoStats.totalFiles > 0) {
          metadata.totalFiles = repoStats.totalFiles;
        }
        if (repoStats.totalLinesOfCode > 0) {
          metadata.totalLinesOfCode = repoStats.totalLinesOfCode;
        }
        // Only override diff stats if we calculated them AND caller didn't provide values
        if (repoStats.filesModified > 0 && (!metadata.filesModified || metadata.filesModified === 0)) {
          metadata.filesModified = repoStats.filesModified;
          metadata.linesAdded = repoStats.linesAdded;
          metadata.linesDeleted = repoStats.linesDeleted;
        }
      }
    }

    // OPTIMIZATION: Severity classification now integrated into specialized agents (saves ~150 tokens per group)
    // Each agent classifies severity AS PART of generating fix suggestions (1 AI call instead of 2)
    // Cost: ~600 tokens per group = ~$0.0003 per group = ~$0.009 per PR (was ~$0.011 before)

    // BUG-76: AI-enrich issues (includes severity classification + fix generation in 1 call)
    // BUG #6 FIX: Destructure to get enriched issues, model tracking, AND cost tracking
    const enrichmentResult = await this.enrichIssuesWithAI(issues, groups) as {
      enrichedIssues: EnrichedIssue[];
      modelsByAgent: Record<string, string>;
      costByAgent?: Record<string, number>;
      tokensByAgent?: Record<string, number>;
    };
    const { enrichedIssues, modelsByAgent } = enrichmentResult;
    const costByAgent = enrichmentResult.costByAgent || {};
    const tokensByAgent = enrichmentResult.tokensByAgent || {};

    // BUG #89 FIX: Ensure enrichedIssues is never empty when issues exist
    // This handles the case where AI enrichment returns empty array (e.g., when all issues are EXISTING_REST)
    // Fix MUST be here (BEFORE line 750 where summary is generated), not after
    if (enrichedIssues.length === 0 && issues.length > 0) {
      console.log(`\n[BUG #89] ⚠️  WARNING: 0 enriched issues but ${issues.length} raw issues exist!`);
      console.log(`[BUG #89] AI enrichment returned empty array - using raw issues as fallback`);
      console.log(`[BUG #89] This typically happens when all issues are EXISTING_REST (no NEW issues)`);

      // Re-populate enrichedIssues from original issues array
      enrichedIssues.push(...issues.map(issue => ({
        file: issue.file || '',
        line: issue.line || 0,
        column: issue.column || 0,
        rule: issue.rule || 'unknown',
        tool: issue.tool || 'unknown',
        severity: (issue.severity || 'medium') as 'critical' | 'high' | 'medium' | 'low',
        message: issue.message || 'No description provided',
        category: (issue.category || 'EXISTING_REST') as 'NEW' | 'EXISTING_MODIFIED' | 'RESOLVED' | 'EXISTING_REST',
        detectedCategory: issue.detectedCategory || 'Code Quality',
        snippet: issue.snippet || ''
      })));

      console.log(`[BUG #89] ✅ Populated enrichedIssues with ${enrichedIssues.length} issues`);
      console.log(`[BUG #89] All issues will now appear in the summary table\n`);
    }

    // BUG #6 + SESSION 21 FIX: Enhance agentPerformance with model AND cost information
    if (metadata.agentPerformance && Array.isArray(metadata.agentPerformance)) {
      console.log('[BUG #6] Enhancing agentPerformance with model and cost information...');
      console.log('[BUG #6] Models by agent:', JSON.stringify(modelsByAgent || {}));

      // SESSION 22 FIX: Safely handle optional costByAgent
      const costs = costByAgent || {};
      const tokens = tokensByAgent || {};
      if (Object.keys(costs).length > 0) {
        console.log('[SESSION 21] Costs by agent:', JSON.stringify(Object.fromEntries(Object.entries(costs).map(([k, v]) => [k, `$${v.toFixed(4)}`]))));
      }

      metadata.agentPerformance.forEach((agent: any) => {
        // Extract agent category from name (e.g., "Security Agent" → "Security")
        const agentName = agent.name || '';
        const agentCategory = agentName.replace(' Agent', '').trim();

        // Look up model for this agent category
        if (modelsByAgent && modelsByAgent[agentCategory]) {
          agent.model = modelsByAgent[agentCategory];
          console.log(`[BUG #6] ✅ Set model for ${agentName}: ${agent.model}`);
        } else {
          console.log(`[BUG #6] ⚠️  No model found for ${agentName} (category: ${agentCategory})`);
        }

        // SESSION 21 FIX: Add actual cost from OpenRouter
        if (costs[agentCategory]) {
          agent.cost = costs[agentCategory];
          console.log(`[SESSION 21] ✅ Set cost for ${agentName}: $${agent.cost.toFixed(4)}`);
        }

        // Add token usage
        if (tokens[agentCategory]) {
          agent.tokensUsed = tokens[agentCategory];
        }
      });
    }

    // Update group severities based on AI-classified issues
    // After AI classification updates individual issue severities, we need to update
    // each group's severity to reflect the AI-classified issues (not original severities)
    // BUG FIX: Match by rule + tool + ORIGINAL severity to preserve separate groups
    // (e.g., npm-audit issues with same rule but different severities should stay separate)
    const updatedGroups = groups.map(group => {
      // Find all issues in this group (match by rule + tool + ORIGINAL severity)
      // This preserves separate groups for different severities (critical vs medium vs low)
      const groupIssues = enrichedIssues.filter(issue =>
        issue.rule === group.rule &&
        issue.tool === group.tool &&
        // Use original group severity to match, not AI-classified severity
        // This ensures groups with different original severities stay separate
        issue.severity === group.severity
      );

      if (groupIssues.length === 0) {
        // Fallback: if no exact match, try without severity (for backwards compatibility)
        const fallbackIssues = enrichedIssues.filter(issue =>
          issue.rule === group.rule && issue.tool === group.tool
        );
        if (fallbackIssues.length === 0) {
          return group; // No issues, keep original
        }

        // Use fallback issues but preserve original group severity
        const severities = fallbackIssues.map(issue => issue.severity);
        const hasCritical = severities.includes('critical');
        const hasHigh = severities.includes('high');
        const hasMedium = severities.includes('medium');

        const aiSeverity = hasCritical ? 'critical' :
          hasHigh ? 'high' :
            hasMedium ? 'medium' : 'low';

        return {
          ...group,
          severity: aiSeverity as 'critical' | 'high' | 'medium' | 'low'
        };
      }

      // Determine the highest severity among AI-classified issues in this group
      const severities = groupIssues.map(issue => issue.severity);
      const hasCritical = severities.includes('critical');
      const hasHigh = severities.includes('high');
      const hasMedium = severities.includes('medium');

      // Update group severity to highest severity found (but preserve group separation)
      const aiSeverity = hasCritical ? 'critical' :
        hasHigh ? 'high' :
          hasMedium ? 'medium' : 'low';

      return {
        ...group,
        severity: aiSeverity as 'critical' | 'high' | 'medium' | 'low'
      };
    });

    // Recalculate blockingCount after AI severity classification
    // The original blockingCount was calculated before AI changed severities (high → low)
    // Now we need to count blocking issues using AI-classified severities
    const updatedBlockingCount = enrichedIssues.filter(i =>
      (i.category === 'NEW' || i.category === 'EXISTING_MODIFIED') &&
      (i.severity === 'critical' || i.severity === 'high')
    ).length;

    // Update metadata with correct blocking count
    metadata.blockingCount = updatedBlockingCount;

    // Also update decision based on updated blocking count
    metadata.decision = updatedBlockingCount > 0 ? 'DECLINED' : 'APPROVED';

    console.log(`\n[DEBUG-PR#] ====== Before generateHeader ======`);
    console.log(`[DEBUG-PR#] Passing metadata.prNumber: ${metadata.prNumber}`);
    console.log(`[DEBUG-PR#] ====================================\n`);

    // Header
    markdown.push(this.generateHeader(metadata));
    markdown.push('');

    // Executive Summary
    // SESSION 13 FIX #4 (BUG-87): Use updatedGroups with AI-classified severities
    markdown.push(await this.generateExecutiveSummary(enrichedIssues, updatedGroups, metadata));
    markdown.push('');

    // SESSION 85: PRO Tier Fix Summary Section
    // Shows fix results with before/after, verification status, confidence scores
    if (this.userTier === 'pro' || this.userTier === 'enterprise') {
      markdown.push(this.generatePROFixSummary(enrichedIssues, updatedGroups, metadata));
      markdown.push('');
    }

    // BUG #89: Removed old incorrect fix (was here at line 779-809)
    // The correct fix is now at line 630-654 (BEFORE summary generation at line 776)
    // This ensures enrichedIssues is populated BEFORE generateExecutiveSummary() uses it
    const updatedGroupsToUse = updatedGroups;

    // Issue Groups by Severity (CRITICAL FIRST, then HIGH)
    // SESSION 13 FIX #4 (BUG-87): Filter by AI-classified severities (updatedGroups)
    const critical = updatedGroupsToUse.filter(g => g.severity === 'critical');
    const high = updatedGroupsToUse.filter(g => g.severity === 'high');
    const medium = updatedGroupsToUse.filter(g => g.severity === 'medium');
    const low = updatedGroupsToUse.filter(g => g.severity === 'low');

    // Critical Issues (highest priority)
    if (critical.length > 0) {
      markdown.push('## 🔴 Critical Issues (Immediate Action Required)\n');
      for (const group of critical) {
        markdown.push(await this.generateGroupSection(group, enrichedIssues, true));

        // Generate IDE fix file (BUG FIX #33: Simplified - only one file per group with all locations)
        const ideFixFile = await this.generateIDEFixFile(group, enrichedIssues);
        if (ideFixFile) ideFixFiles.push(ideFixFile);
      }
      markdown.push('');
    }

    // SESSION 24: First generate all IDE fix files
    if (high.length > 0) {
      for (const group of high) {
        const ideFixFile = await this.generateIDEFixFile(group, enrichedIssues);
        if (ideFixFile) ideFixFiles.push(ideFixFile);
      }
    }

    if (medium.length > 0) {
      for (const group of medium) {
        const ideFixFile = await this.generateIDEFixFile(group, enrichedIssues);
        if (ideFixFile) ideFixFiles.push(ideFixFile);
      }
    }

    if (low.length > 0) {
      for (const group of low) {
        const ideFixFile = await this.generateIDEFixFile(group, enrichedIssues);
        if (ideFixFile) ideFixFiles.push(ideFixFile);
      }
    }

    // SESSION 25 FIX: Upload fix files FIRST (without manifest) to get public URLs
    // Then create manifest with public URLs, then upload manifest
    if (ideFixFiles.length > 0) {
      // Step 1: Upload all fix files (excluding manifest) to get public URLs
      const fixFilesOnly = ideFixFiles.filter(f => f.filename !== 'all-issues-manifest.json');
      const uploadedFixFiles = await this.uploadAttachmentsToSupabase(fixFilesOnly, metadata, analysisTimestamp);

      // Step 2: Create manifest with public URLs from uploaded files
      const enrichManifestEntry = (f: IDEFixFile) => {
        const uploadedFile = uploadedFixFiles.find(uf => uf.filename === f.filename);
        const publicUrl = uploadedFile && (uploadedFile as any).publicUrl
          ? (uploadedFile as any).publicUrl
          : `attachments/${f.filename}`; // Fallback to relative path

        // BUG-099 FIX: Pass description for specific vulnerability details
        const issueDesc = this.getIssueDescription(f.content.rule, f.content.tool, f.content.severity, f.content.description);
        return {
          filename: f.filename,
          url: publicUrl, // Use public URL if available
          fallback_path: `attachments/${f.filename}`,
          severity: f.content.severity,
          category: this.getCategoryFromTool(f.content.tool),
          rule: f.content.rule,
          title: this.formatRuleTitle(f.content.rule),
          description: issueDesc.what.substring(0, 150) + (issueDesc.what.length > 150 ? '...' : ''),
          impact: this.getImpactSummary(f.content.rule, f.content.tool, f.content.severity, f.content.description),
          priority: this.getPriority(f.content.severity),
          occurrences: f.content.metadata?.total_occurrences || f.content.locations?.length || 0,
          autoFixable: this.canAutoFix({ rule: f.content.rule, tool: f.content.tool, severity: f.content.severity } as IssueGroup)
        };
      };

      const manifestFile: IDEFixFile = {
        groupId: 'all-issues',
        filename: 'all-issues-manifest.json',
        content: {
          version: "2.0",
          metadata: {
            repository: metadata.repository || 'unknown',
            total_issues: enrichedIssues.length,
            total_fix_files: ideFixFiles.length,
            generated_at: new Date().toISOString()
          },
          files: {
            critical: ideFixFiles.filter(f => f.content.severity === 'critical').map(enrichManifestEntry),
            high: ideFixFiles.filter(f => f.content.severity === 'high').map(enrichManifestEntry),
            medium: ideFixFiles.filter(f => f.content.severity === 'medium').map(enrichManifestEntry),
            low: ideFixFiles.filter(f => f.content.severity === 'low').map(enrichManifestEntry)
          }
        } as any
      };

      // Step 3: Upload manifest file to Supabase
      const uploadedManifest = await this.uploadAttachmentsToSupabase([manifestFile], metadata, analysisTimestamp);

      // Step 4: Combine uploaded fix files with uploaded manifest
      ideFixFiles = [...uploadedFixFiles, ...uploadedManifest];

      // Log summary
      const totalWithUrls = ideFixFiles.filter(f => (f as any).publicUrl).length;
      console.log(`[Manifest] ✅ Created manifest with ${totalWithUrls}/${ideFixFiles.length} files having Supabase URLs`);

      // SESSION 25-27: Generate LSP, SARIF, and GitLab formats
      // BUG-DOG-04 FIX: Pass analysisTimestamp to ensure consistent IDs across all files
      // SESSION 69 FIX: Exclude RESOLVED issues from fix files - they're already fixed in the PR!
      const activeIssuesForFix = enrichedIssues.filter(i => i.category !== 'RESOLVED');
      const activeGroupsForFix = updatedGroups.filter(g => {
        // Group is active if it has at least one non-RESOLVED issue
        const groupIssues = activeIssuesForFix.filter(i => i.rule === g.rule);
        return groupIssues.length > 0;
      });
      console.log(`[LSP/SARIF] Filtering: ${enrichedIssues.length} total → ${activeIssuesForFix.length} active (excluding RESOLVED)`);
      const { lspUrl, sarifUrl, gitlabUrl } = await this.generateLSPAndSARIFFormats(activeIssuesForFix, activeGroupsForFix, metadata, analysisTimestamp);

      // SESSION 26-27: Store URLs for metadata footer (type assertion needed for dynamic properties)
      if (lspUrl) (metadata as any).lspUrl = lspUrl;
      if (sarifUrl) (metadata as any).sarifUrl = sarifUrl;
      if (gitlabUrl) (metadata as any).gitlabUrl = gitlabUrl;
    }

    // SESSION 24: Now generate markdown with public URLs
    if (high.length > 0) {
      markdown.push('## 🟠 High Priority Issues\n');
      for (const group of high) {
        markdown.push(await this.generateGroupSection(group, enrichedIssues, true, ideFixFiles));
      }
      markdown.push('');
    }

    if (medium.length > 0) {
      markdown.push('## 🟡 Medium Priority Issues\n');
      for (const group of medium) {
        markdown.push(await this.generateGroupSection(group, enrichedIssues, true, ideFixFiles));
      }
      markdown.push('');
    }

    if (low.length > 0) {
      markdown.push('## 🟢 Low Priority Issues\n');
      for (const group of low) {
        markdown.push(await this.generateGroupSection(group, enrichedIssues, true, ideFixFiles));
      }
      markdown.push('');
    }

    // Manifest already created and uploaded above with public URLs

    // BUG FIX #19: Add CheckStyle auto-fix guidance if CheckStyle issues found
    // Session 91: Only show manual guide for BASIC tier; PRO has AI fixes inline
    const checkstyleGroups = groups.filter(g => g.tool === 'checkstyle');
    if (checkstyleGroups.length > 0 && this.userTier !== 'pro' && this.userTier !== 'enterprise') {
      const checkstyleCount = enrichedIssues.filter(i => i.tool === 'checkstyle').length;
      markdown.push(this.generateCheckStyleAutoFixGuide(checkstyleCount));
      markdown.push('');
    }

    // Business Impact Analysis (aggregate from enrichedIssues)
    markdown.push(this.generateBusinessImpact(enrichedIssues, groups));
    markdown.push('');

    // Educational Resources (aggregate from enrichedIssues)
    // Use issue-specific training with YouTube links by default (better UX)
    // Falls back to generic if EDU_USE_GENERIC=true
    if ((process.env.EDU_USE_GENERIC || '').toLowerCase() === 'true') {
      markdown.push(this.generateEducationalResources(enrichedIssues));
    } else {
      markdown.push(await this.generateEducationalResourcesBrave(enrichedIssues));
    }
    markdown.push('');

    // Skills Tracking (developer progress and ranking)
    markdown.push(await this.generateSkillsTracking(enrichedIssues, metadata));
    markdown.push('');

    // XP Progress and Achievements (from Supabase)
    const xpAndAchievements = await this.generateXPAndAchievements(metadata.prAuthorEmail);
    if (xpAndAchievements) {
      markdown.push(xpAndAchievements);
      markdown.push('');
    }

    // Community Impact (pattern contributions from Supabase)
    const communityImpact = await this.generateCommunityImpact(metadata.prAuthorEmail);
    if (communityImpact) {
      markdown.push(communityImpact);
      markdown.push('');
    }

    // Analysis Metadata (performance metrics)
    markdown.push(this.generateAnalysisMetadata(metadata));
    markdown.push('');

    // PR Comment (personalized, ready-to-paste)
    markdown.push(this.generatePRComment(enrichedIssues, groups, metadata));
    markdown.push('');

    // Footer (BUG FIX #33: Only IDE fix files now, no separate location attachments)
    markdown.push(this.generateFooter(groups, ideFixFiles, metadata, enrichedIssues));

    // Generate mapping index (BUG FIX #33: Only IDE fix files)
    const mapping = this.generateMapping(enrichedIssues, groups, metadata, ideFixFiles);

    return {
      markdown: markdown.join('\n'),
      attachments: [],  // BUG FIX #33: Empty for backward compatibility, will be removed in future version
      mapping,
      ideFixFiles
    };
  }

  /**
   * BUG FIX #41: Find full path for a file by its basename
   * Uses find command to locate file in repository
   */
  private async findFullPath(basename: string): Promise<string | null> {
    if (!this.repoPath || basename.includes('/')) {
      // Already has path or no repo available
      return null;
    }

    try {
      const result = execSync(
        `find "${this.repoPath}" -name "${basename}" -type f 2>/dev/null | head -1`,
        { encoding: 'utf-8', timeout: 5000 }
      );
      const fullPath = result.trim();
      if (fullPath) {
        // Return path relative to repo root
        return fullPath.replace(this.repoPath + '/', '');
      }
    } catch {
      // Ignore errors from find command
    }

    return null;
  }

  /**
   * BUG FIX #24: Extract code snippets for issue locations (for IDE integration)
   * Extracts snippets on-demand with intelligent batching for performance
   */
  private async extractSnippetsForLocations(issues: EnrichedIssue[]): Promise<IssueLocation[]> {
    if (!this.repoPath) {
      // BUG FIX #41: Even without repoPath, normalize paths for consistency
      const locations = issues.map(issue => {
        let normalizedPath = issue.file;
        if (normalizedPath.startsWith('/workspace/')) {
          normalizedPath = normalizedPath.replace('/workspace/', '');
        } else if (normalizedPath.startsWith('workspace/')) {
          normalizedPath = normalizedPath.replace('workspace/', '');
        }

        return {
          file: normalizedPath,
          line: issue.line || 0,
          column: issue.column,
          snippet: issue.snippet || '',
          category: issue.category
        };
      });

      // Deduplicate identical locations (e.g., npm-audit issues all point to package.json:1)
      return this.deduplicateLocations(locations);
    }

    const { CodeSnippetExtractor } = await import('../utils/code-snippet-extractor');
    const path = await import('path');

    // BUG FIX #33: Increased snippet limit per group (was 100 globally, now 1000 per group)
    // This allows IDEs to show more context without killing performance
    // For groups with >1000 issues, only first 1000 get snippets (rest have location only)
    const SNIPPET_LIMIT = 1000;
    const locations: IssueLocation[] = [];

    for (let i = 0; i < issues.length; i++) {
      const issue = issues[i];
      let snippet = issue.snippet || '';

      // BUG FIX #41: Normalize path once at the beginning for consistency
      let normalizedPath = issue.file;
      if (normalizedPath.startsWith('/workspace/')) {
        normalizedPath = normalizedPath.replace('/workspace/', '');
      } else if (normalizedPath.startsWith('workspace/')) {
        normalizedPath = normalizedPath.replace('workspace/', '');
      }

      // Extract snippet if missing and within limit
      if (i < SNIPPET_LIMIT && (!snippet || snippet === 'N/A' || snippet.trim().length === 0) && issue.file && issue.line) {
        try {
          // BUG FIX: For npm-audit issues, always use root package.json
          // npm-audit issues are assigned to 'package.json' but might resolve to subdirectory
          let fileToExtract = normalizedPath;
          if (issue.tool === 'npm-audit' && (normalizedPath === 'package.json' || normalizedPath.endsWith('/package.json'))) {
            // Try root package.json first
            const rootPackageJson = path.join(this.repoPath!, 'package.json');
            if (fs.existsSync(rootPackageJson)) {
              fileToExtract = 'package.json';
            }
          }

          const fullPath = path.join(this.repoPath!, fileToExtract);
          // SESSION 74: Try local file first, then GitHub API fallback
          snippet = await CodeSnippetExtractor.extractSnippet(
            fullPath,
            issue.line,
            3,
            this.repositoryUrl  // GitHub fallback URL
          ) || '';
        } catch (error) {
          // Extraction failed - use empty snippet
          snippet = '';
        }
      }

      // BUG FIX #41: Always use normalized path in output (consistent with report display)
      locations.push({
        file: normalizedPath,
        line: issue.line || 0,
        column: issue.column,
        snippet,
        category: issue.category
      });
    }

    // Deduplicate identical locations (e.g., npm-audit issues all point to package.json:1)
    return this.deduplicateLocations(locations);
  }

  /**
   * Deduplicate locations that are identical (same file, line, column)
   * For npm-audit issues, all locations point to package.json:1, so we only keep one
   * BUG FIX: For npm-audit, prefer root package.json over subdirectory package.json files
   */
  private deduplicateLocations(locations: IssueLocation[]): IssueLocation[] {
    const seen = new Map<string, IssueLocation>();

    // BUG FIX: For npm-audit issues, prefer root package.json
    // If we have multiple package.json files, prioritize the root one
    const packageJsonLocations = locations.filter(loc => loc.file === 'package.json' || loc.file.endsWith('/package.json'));
    if (packageJsonLocations.length > 1) {
      // Find root package.json (shortest path)
      const rootPackageJson = packageJsonLocations.reduce((root, loc) => {
        const rootDepth = root.file.split('/').length;
        const locDepth = loc.file.split('/').length;
        return locDepth < rootDepth ? loc : root;
      });

      // Replace all package.json locations with root one
      locations = locations.map(loc => {
        if (loc.file === 'package.json' || loc.file.endsWith('/package.json')) {
          return { ...rootPackageJson, file: 'package.json' };
        }
        return loc;
      });
    }

    for (const location of locations) {
      // Create a unique key: file:line:column
      const key = `${location.file}:${location.line}:${location.column || 0}`;

      // Keep the first occurrence (or one with a longer snippet if available)
      if (!seen.has(key) || (location.snippet && location.snippet.length > (seen.get(key)?.snippet?.length || 0))) {
        seen.set(key, location);
      }
    }

    return Array.from(seen.values());
  }

  /**
   * Generate report header with complete metadata
   */
  private generateHeader(metadata: any): string {
    return generateHeader(metadata, this.SHOW_PERF_SUBMETRICS);
  }

  /**
   * Generate error report when tool orchestration fails
   * (FALSE POSITIVE BUG FIX)
   */
  private generateAnalysisFailureReport(metadata: any, errorMessage?: string): string {
    const analysisDate = formatDate(metadata.analyzedAt);

    return `# ❌ Code Quality Analysis Failed

## Repository Information

**Repository:** ${metadata.repoUrl ? `[${metadata.repository}](${metadata.repoUrl})` : metadata.repository}
**Pull Request:** #${metadata.prNumber}${metadata.prTitle ? ` - ${metadata.prTitle}` : ''}
**Analysis Date:** ${analysisDate}

## ❌ Analysis Error

**Status:** ANALYSIS FAILED
**Reason:** No analysis tools were executed successfully

### Error Details

\`\`\`
${errorMessage || 'Unknown error - check tool orchestrator logs for details'}
\`\`\`

### Recommended Action

**Review the error above and check the tool orchestrator logs** for additional context. Common issues include:
- Repository paths with spaces or special characters
- Git configuration problems
- Missing tool dependencies
- Permission issues

---

*This is an error report - code quality analysis could not be completed.*
*Please resolve the error above and retry the analysis.*
`;
  }

  private _REMOVED_generateHeader_LEGACY(metadata: any): string {
    // BUG FIX #71: Support both 'APPROVE' and 'APPROVED' (metadata uses 'APPROVE', but some places use 'APPROVED')
    const icon = (metadata.decision === 'APPROVE' || metadata.decision === 'APPROVED') ? '✅' : '⛔';
    const analysisDate = this.formatDate(metadata.analyzedAt);

    // Calculate net change in lines
    const linesAdded = metadata.linesAdded || 0;
    const linesDeleted = metadata.linesDeleted || 0;
    const netChange = linesAdded - linesDeleted;

    // Format duration
    const durationDisplay = this.formatDuration(metadata.totalDuration);

    let header = `# 🔍 Code Quality Analysis Report

## Repository Information

**Repository:** ${metadata.repoUrl ? `[${metadata.repository}](${metadata.repoUrl})` : metadata.repository}  
**Pull Request:** #${metadata.prNumber}${metadata.prTitle ? ` - ${metadata.prTitle}` : ''}  `;

    if (metadata.prAuthor) {
      header += `\n**Author:** ${metadata.prAuthor}${metadata.prAuthorEmail ? ` (${metadata.prAuthorEmail})` : ''}  `;
    }

    if (metadata.organizationName) {
      header += `\n**Organization:** ${metadata.organizationName}  `;
    }

    if (metadata.branch && metadata.baseBranch) {
      header += `\n**Source Branch:** ${metadata.branch}  
**Target Branch:** ${metadata.baseBranch}  `;
    }

    header += `\n**Analysis Date:** ${analysisDate}  
**Repository Size:** ${(metadata.totalFiles || 0).toLocaleString()} files`;

    if (metadata.totalLinesOfCode) {
      header += ` | ${metadata.totalLinesOfCode.toLocaleString()} lines`;
    }

    if (metadata.analyzerVersion) {
      header += `  
**Analyzer Version:** ${metadata.analyzerVersion}`;
    }

    // Add PR Impact section if data available
    if (metadata.filesModified || metadata.linesAdded || metadata.linesDeleted) {
      header += `

## PR Impact

**Files Modified:** ${Math.min(metadata.filesModified || 0, metadata.totalFiles || (metadata.filesModified || 0))}  `;

      if (metadata.linesAdded !== undefined || metadata.linesDeleted !== undefined) {
        header += `
**Lines Added:** +${linesAdded}  
**Lines Deleted:** -${linesDeleted}  
**Net Change:** ${netChange > 0 ? '+' : ''}${netChange} lines  `;
      }
    }

    // Add Analysis Performance section if data available
    if (metadata.totalDuration) {
      header += `

## Analysis Performance

**Total Duration:** ${durationDisplay}  `;

      if (this.SHOW_PERF_SUBMETRICS && metadata.cloneTime) {
        header += `
**Clone Time:** ${this.formatDuration(metadata.cloneTime)}  `;
      }

      if (this.SHOW_PERF_SUBMETRICS && metadata.analysisTime) {
        header += `
**Analysis Time:** ${this.formatDuration(metadata.analysisTime)}  `;
      }

      if (this.SHOW_PERF_SUBMETRICS && metadata.reportGenerationTime) {
        header += `
**Report Generation:** ${this.formatDuration(metadata.reportGenerationTime)}  `;
      }
    }

    // Add Decision section
    header += `

## Quality Decision

**Result:** ${icon} **${metadata.decision}**${metadata.blockingCount > 0 ? ` (${metadata.blockingCount} blocking issues)` : ''}

---`;

    return header;
  }

  /**
   * Format date for display
   */
  private formatDate(dateString?: string): string {
    return formatDate(dateString);
  }

  /**
   * Format duration in milliseconds to human-readable string
   */
  private formatDuration(durationMs?: number): string {
    return formatDuration(durationMs);
  }

  /**
   * Calculate impact score from issues
   * Critical: 5 points, High: 3 points, Medium: 1 point, Low: 0.5 points
   */
  private calculateImpact(issues: EnrichedIssue[]): number {
    let impact = 0;
    issues.forEach(issue => {
      switch (issue.severity) {
        case 'critical': impact += 5; break;
        case 'high': impact += 3; break;
        case 'medium': impact += 1; break;
        case 'low': impact += 0.5; break;
      }
    });
    return impact;
  }

  /**
   * Calculate quality score (0-100) with full category breakdown
   * 
   * Uses V9 scoring system with per-category scores:
   * - APP score: Overall = MIN(category scores) - "weakest link" principle
   * - Skill score: Overall = AVERAGE(category scores)
   * - Category scores: Security, Performance, Architecture, Dependency, Code Quality
   * - Baseline tracking via Supabase
   * 
   * Falls back to simplified scoring if Supabase is not available.
   */
  private async calculateQualityScore(
    issues: EnrichedIssue[],
    metadata: { repository?: string; prNumber?: number; commitSHA?: string; prAuthor?: string; prAuthorEmail?: string }
  ): Promise<{
    score: number;
    grade: string;
    breakdown: any;
    categoryScores?: {
      security: number;
      performance: number;
      architecture: number;
      dependency: number;
      codeQuality: number;
    };
    skillCategoryScores?: {
      security: number;
      performance: number;
      architecture: number;
      dependency: number;
      codeQuality: number;
    };
    appScore?: number;
    skillScore?: number;
  }> {
    return calculateQualityScore(issues, metadata, this.appScoreManager, this.skillScoreManager);
  }

  /**
   * Check if we already have scores for this exact commit
   * Prevents score decay when re-running analysis on unchanged code
   * 
   * BUG FIX #9: Commit SHA caching
   */
  private async checkCachedScoresForCommit(
    metadata: { repository?: string; prNumber?: number; commitSHA?: string; prAuthorEmail?: string }
  ): Promise<any | null> {
    return checkCachedScoresForCommit(metadata, this.appScoreManager, this.skillScoreManager);
  }

  private async _REMOVED_checkCachedScoresForCommit_LEGACY(
    metadata: { repository?: string; prNumber?: number; commitSHA?: string; prAuthorEmail?: string }
  ): Promise<any | null> {
    if (!this.appScoreManager || !this.skillScoreManager || !metadata.commitSHA) {
      return null;
    }

    try {
      const supabase = (this.appScoreManager as any).supabase;

      // Query both scores in parallel
      const [appResult, skillResult] = await Promise.all([
        supabase
          .from('app_scores')
          .select('*')
          .eq('repo_name', metadata.repository)
          .eq('pr_number', metadata.prNumber)
          .eq('commit_sha', metadata.commitSHA)
          .order('analyzed_at', { ascending: false })
          .limit(1)
          .single(),
        supabase
          .from('skill_scores')
          .select('*')
          .eq('developer_email', metadata.prAuthorEmail)
          .eq('repo_name', metadata.repository)
          .eq('pr_number', metadata.prNumber)
          .eq('commit_sha', metadata.commitSHA)
          .order('analyzed_at', { ascending: false })
          .limit(1)
          .single()
      ]);

      const appScore = appResult.data;
      const skillScore = skillResult.data;

      // Only use cache if BOTH scores exist
      if (appScore && skillScore) {
        console.log(`[V9ReportFormatter] ✅ Found cached scores - APP: ${appScore.overall_score}, Skill: ${skillScore.overall_score}`);

        // BUG FIX #10, #50: Reconstruct categoryScores from individual columns
        // Use nullish coalescing to allow 0 scores (not falsy fallback)
        const categoryScores = {
          security: appScore.security_score ?? 50,
          performance: appScore.performance_score ?? 50,
          architecture: appScore.architecture_score ?? 50,
          dependency: appScore.dependency_score ?? 50,
          codeQuality: appScore.code_quality_score ?? 50
        };

        // Determine grade
        const score = appScore.overall_score;
        let grade: string;
        if (score >= 90) grade = 'A';
        else if (score >= 80) grade = 'B';
        else if (score >= 70) grade = 'C';
        else if (score >= 60) grade = 'D';
        else grade = 'F';

        return {
          score: appScore.overall_score,
          grade,
          categoryScores,
          appScore: appScore.overall_score,
          skillScore: skillScore.overall_score,
          fromCache: true,
          breakdown: {
            baseScore: 50,
            categoryScores,
            overallMethod: 'APP = MIN(categories) - weakest link',
            skillScoreMethod: 'Skill = AVG(categories)',
            cachedFromCommit: metadata.commitSHA.slice(0, 7)
          }
        };
      }

      return null;
    } catch (error: any) {
      // No cached scores found or error - will calculate fresh
      if (error.code !== 'PGRST116') { // Not a "no rows" error
        console.log(`[V9ReportFormatter] Cache lookup error:`, error.message);
      }
      return null;
    }
  }

  /**
   * Full V9 category-based scoring with Supabase persistence
   * 
   * BUG FIXES INCLUDED:
   * - #7: Baseline 50 (prevents score decay)
   * - #8: Save actual PR number (not 0)
   * - #9: Save commit SHA for caching
   */
  private async calculateFullV9Score(
    issues: EnrichedIssue[],
    metadata: { repository?: string; prNumber?: number; commitSHA?: string; prAuthor?: string; prAuthorEmail?: string }
  ): Promise<any> {
    return calculateFullV9Score(issues, metadata, this.appScoreManager, this.skillScoreManager);
  }

  private async _REMOVED_calculateFullV9Score_LEGACY(
    issues: EnrichedIssue[],
    metadata: { repository?: string; prNumber?: number; commitSHA?: string; prAuthor?: string; prAuthorEmail?: string }
  ): Promise<any> {
    try {
      // Separate issues by type
      const newIssues = issues.filter(i => i.category === 'NEW');
      const existingModified = issues.filter(i => i.category === 'EXISTING_MODIFIED');
      const existingRest = issues.filter(i => i.category === 'EXISTING_REST');
      const resolvedIssues = issues.filter(i => i.category === 'RESOLVED');

      // Group issues by detected category (Security, Performance, etc.)
      const issuesByCategory = {
        security: issues.filter(i => i.detectedCategory === 'Security'),
        performance: issues.filter(i => i.detectedCategory === 'Performance'),
        architecture: issues.filter(i => i.detectedCategory === 'Architecture'),
        dependency: issues.filter(i => i.detectedCategory === 'Dependencies'),
        codeQuality: issues.filter(i => i.detectedCategory === 'Code Quality')
      };

      // Calculate per-category scores
      const categoryScores = {
        security: this.calculateCategoryScore(issuesByCategory.security),
        performance: this.calculateCategoryScore(issuesByCategory.performance),
        architecture: this.calculateCategoryScore(issuesByCategory.architecture),
        dependency: this.calculateCategoryScore(issuesByCategory.dependency),
        codeQuality: this.calculateCategoryScore(issuesByCategory.codeQuality)
      };

      // BUG FIX #44: Calculate APP score (minimum of categories - weakest link)
      const appScore = Math.min(
        categoryScores.security,
        categoryScores.performance,
        categoryScores.architecture,
        categoryScores.dependency,
        categoryScores.codeQuality
      );

      // BUG FIX #44: Calculate Skill score (AVERAGE of category scores)
      const skillScore = Math.round(
        (categoryScores.security + categoryScores.performance + categoryScores.architecture +
          categoryScores.dependency + categoryScores.codeQuality) / 5
      );

      // FIX BUG #2: Calculate blocking issues (NEW + EXISTING_MODIFIED with CRITICAL/HIGH)
      const blockingIssuesCount = issues.filter(i =>
        (i.category === 'NEW' || i.category === 'EXISTING_MODIFIED') &&
        (i.severity === 'critical' || i.severity === 'high')
      ).length;

      // Save to Supabase with commit SHA for caching (BUG FIXES #7, #8, #9, #10)
      if (this.appScoreManager && metadata.repository) {
        console.log(`[V9ReportFormatter] 💾 Saving APP score: ${appScore}/100 for ${metadata.repository} PR #${metadata.prNumber || 0} (commit: ${metadata.commitSHA?.slice(0, 7) || 'unknown'})`);

        const supabase = (this.appScoreManager as any).supabase;
        const { error } = await supabase.from('app_scores').insert({
          repo_name: metadata.repository,
          pr_number: metadata.prNumber || 0,
          commit_sha: metadata.commitSHA || undefined,
          overall_score: appScore,
          // BUG FIX #10: Map categoryScores to individual columns (not JSONB)
          security_score: categoryScores.security,
          performance_score: categoryScores.performance,
          architecture_score: categoryScores.architecture,
          dependency_score: categoryScores.dependency,
          code_quality_score: categoryScores.codeQuality,
          // FIX BUG #2: Decision based on blocking issues, not score
          decision: blockingIssuesCount > 0 ? 'DECLINED' : 'APPROVED',
          quality_score: appScore,
          analyzed_at: new Date().toISOString(),
          new_issues_count: newIssues.length,
          existing_issues_count: existingModified.length + existingRest.length,
          resolved_issues_count: resolvedIssues.length,
          // FIX BUG #2: Count blocking issues from NEW + EXISTING_MODIFIED with CRITICAL/HIGH severity
          blocking_issues_count: blockingIssuesCount
        });

        if (error) {
          console.error('[V9ReportFormatter] ❌ Failed to save APP score:', error.message);
        } else {
          console.log('[V9ReportFormatter] ✅ APP score saved successfully');
        }
      }

      if (this.skillScoreManager && metadata.prAuthorEmail && metadata.repository) {
        console.log(`[V9ReportFormatter] 💾 Saving Skill score: ${skillScore}/100 for ${metadata.prAuthorEmail} PR #${metadata.prNumber || 0} (commit: ${metadata.commitSHA?.slice(0, 7) || 'unknown'})`);

        const supabase = (this.skillScoreManager as any).supabase;
        const { error } = await supabase.from('skill_scores').insert({
          developer_email: metadata.prAuthorEmail,
          developer_name: metadata.prAuthor || metadata.prAuthorEmail,
          repo_name: metadata.repository,
          pr_number: metadata.prNumber || 0,
          commit_sha: metadata.commitSHA || undefined,
          overall_score: skillScore,
          // BUG FIX #10: Map categoryScores to individual columns (not JSONB)
          security_score: categoryScores.security,
          performance_score: categoryScores.performance,
          architecture_score: categoryScores.architecture,
          dependency_score: categoryScores.dependency,
          code_quality_score: categoryScores.codeQuality,
          analyzed_at: new Date().toISOString(),
          new_issues_count: newIssues.length,
          resolved_issues_count: resolvedIssues.length,
          critical_issues_count: issues.filter(i => i.severity === 'critical').length,
          high_issues_count: issues.filter(i => i.severity === 'high').length,
          medium_issues_count: issues.filter(i => i.severity === 'medium').length,
          low_issues_count: issues.filter(i => i.severity === 'low').length
        });

        if (error) {
          console.error('[V9ReportFormatter] ❌ Failed to save Skill score:', error.message);
        } else {
          console.log('[V9ReportFormatter] ✅ Skill score saved successfully');
        }
      }

      // Determine grade based on appScore
      let grade: string;
      if (appScore >= 90) grade = 'A';
      else if (appScore >= 80) grade = 'B';
      else if (appScore >= 70) grade = 'C';
      else if (appScore >= 60) grade = 'D';
      else grade = 'F';

      return {
        score: appScore,
        grade,
        categoryScores,
        appScore,
        skillScore,
        breakdown: {
          baseScore: 100,
          categoryScores,
          overallMethod: 'APP = MIN(categories) - weakest link',
          skillScoreMethod: 'Skill = AVG(categories)'
        }
      };
    } catch (error) {
      console.error('[V9GroupedReportFormatter] Error calculating full V9 score:', error);
      // Fall back to simplified scoring
      return this.calculateSimplifiedScore(issues);
    }
  }

  /**
   * Calculate APP SCORE for a single category (Security, Performance, etc.)
   * BUG FIXES #20-23: Simplified scoring logic
   * 
   * Base: 100/100 (app health per category)
   * Counts ALL issues: NEW, EXISTING_MODIFIED, EXISTING_REST, RESOLVED
   * All have same weight (only sign differs)
   */
  private calculateCategoryScore(categoryIssues: EnrichedIssue[], baseScore = 100): number {
    // BUG #5 FIX: Accept baseScore as parameter
    // - App Health Score by Category: uses 100 (default)
    // - Skills Tracking: must explicitly pass 50
    return calculateCategoryScore(categoryIssues, baseScore);
  }

  private _REMOVED_calculateCategoryScore_LEGACY(categoryIssues: EnrichedIssue[]): number {
    const BASE = 50;  // BUG FIX #35: Universal baseline 50/100 for all categories (neutral)
    let adjustment = 0;

    categoryIssues.forEach(issue => {
      const weight = {
        critical: 5.0,
        high: 3.0,
        medium: 1.0,
        low: 0.5
      }[issue.severity] || 1.0;

      // Simple logic: All issues affect app health equally
      if (issue.category === 'RESOLVED') {
        adjustment += weight;  // Bonus for fixes
      } else {
        // NEW, EXISTING_MODIFIED, EXISTING_REST all get -weight
        adjustment -= weight;
      }
    });

    return Math.max(0, Math.min(100, Math.round(BASE + adjustment)));
  }

  /**
   * Simplified scoring (fallback when Supabase unavailable)
   */
  private calculateSimplifiedScore(issues: EnrichedIssue[]): any {
    return calculateSimplifiedScore(issues);
  }

  private _REMOVED_calculateSimplifiedScore_LEGACY(issues: EnrichedIssue[]): any {
    const baseScore = 100.0;
    let deduction = 0;

    // Separate issues by category for breakdown
    const newIssues = issues.filter(i => i.category === 'NEW');
    const existingModified = issues.filter(i => i.category === 'EXISTING_MODIFIED');
    const existingRest = issues.filter(i => i.category === 'EXISTING_REST');
    const resolvedIssues = issues.filter(i => i.category === 'RESOLVED');

    // Count blocking issues (critical or high severity NEW/EXISTING_MODIFIED)
    const blockingIssues = issues.filter(i =>
      (i.severity === 'critical' || i.severity === 'high') &&
      (i.category === 'NEW' || i.category === 'EXISTING_MODIFIED')
    );

    // Apply severity and category weights to calculate deduction
    issues.forEach(issue => {
      // Severity weight
      const severityWeight = {
        critical: 5.0,
        high: 3.0,
        medium: 1.0,
        low: 0.5
      }[issue.severity] || 1.0;

      // Category weight - NEW issues get full deduction, existing get reduced impact
      const categoryWeight = {
        'NEW': 1.0,                    // Full deduction (introduced in this PR)
        'EXISTING_MODIFIED': 0.5,      // 50% deduction (existing but touched)
        'EXISTING_REST': 0.1           // 10% deduction (existing, untouched)
      }[issue.category] || 0.1;

      deduction += severityWeight * categoryWeight;
    });

    // Extra penalty for blocking issues
    const blockingPenalty = blockingIssues.length * 2.5;
    deduction += blockingPenalty;

    // Bonus for resolved issues (encourage fixing existing problems)
    const bonus = resolvedIssues.reduce((sum, issue) => {
      const weight = { critical: 5, high: 3, medium: 1, low: 0.5 }[issue.severity] || 1;
      return sum + weight;
    }, 0);

    // Calculate final score
    let finalScore = baseScore - deduction + bonus;

    // Clamp score between 0 and 100
    finalScore = Math.max(0, Math.min(100, finalScore));

    // Determine grade
    let grade: string;
    if (finalScore >= 90) grade = 'A';
    else if (finalScore >= 80) grade = 'B';
    else if (finalScore >= 70) grade = 'C';
    else if (finalScore >= 60) grade = 'D';
    else grade = 'F';

    // Calculate individual category deductions for breakdown
    const newIssuesDeduction = newIssues.reduce((sum, i) => {
      const weight = { critical: 5, high: 3, medium: 1, low: 0.5 }[i.severity] || 1;
      return sum + (weight * 1.0);
    }, 0);

    const existingModifiedDeduction = existingModified.reduce((sum, i) => {
      const weight = { critical: 5, high: 3, medium: 1, low: 0.5 }[i.severity] || 1;
      return sum + (weight * 0.5);
    }, 0);

    const existingRestDeduction = existingRest.reduce((sum, i) => {
      const weight = { critical: 5, high: 3, medium: 1, low: 0.5 }[i.severity] || 1;
      return sum + (weight * 0.1);
    }, 0);

    return {
      score: Math.round(finalScore * 10) / 10,  // Round to 1 decimal
      grade,
      breakdown: {
        baseScore,
        newIssuesDeduction: -newIssuesDeduction,
        existingModifiedDeduction: -existingModifiedDeduction,
        existingRestDeduction: -existingRestDeduction,
        blockingPenalty: -blockingPenalty,
        resolutionBonus: bonus,
        totalDeduction: -deduction,
        finalScore: Math.round(finalScore * 10) / 10
      }
    };
  }

  /**
   * Get quality score interpretation
   */
  private getScoreInterpretation(score: number): { emoji: string; label: string; description: string } {
    return getScoreInterpretation(score);
  }

  private _REMOVED_getScoreInterpretation_LEGACY(score: number): { emoji: string; label: string; description: string } {
    if (score >= 90) {
      return {
        emoji: '🏆',
        label: 'Excellent',
        description: 'Outstanding code quality with minimal issues'
      };
    } else if (score >= 80) {
      return {
        emoji: '✨',
        label: 'Good',
        description: 'High code quality with minor improvements needed'
      };
    } else if (score >= 70) {
      return {
        emoji: '👍',
        label: 'Fair',
        description: 'Acceptable quality but consider addressing issues'
      };
    } else if (score >= 60) {
      return {
        emoji: '⚠️',
        label: 'Poor',
        description: 'Multiple issues need attention'
      };
    } else {
      return {
        emoji: '❌',
        label: 'Critical',
        description: 'Significant quality issues require immediate action'
      };
    }
  }

  /**
   * Generate executive summary
   */
  private async generateExecutiveSummary(
    issues: EnrichedIssue[],
    groups: IssueGroup[],
    metadata: any
  ): Promise<string> {
    const bySeverity = this.groupBySeverity(issues);
    const byCategory = this.groupByCategory(issues);

    // BUG-084 FIX: Group by detectedCategory for Category Scores filtering
    const byDetectedCategory: Record<string, number> = {
      'Security': issues.filter(i => i.detectedCategory === 'Security').length,
      'Performance': issues.filter(i => i.detectedCategory === 'Performance').length,
      'Architecture': issues.filter(i => i.detectedCategory === 'Architecture').length,
      'Dependencies': issues.filter(i => i.detectedCategory === 'Dependencies').length,
      'Code Quality': issues.filter(i => i.detectedCategory === 'Code Quality').length
    };

    // Calculate blocking issues (NEW + EXISTING_MODIFIED with critical/high severity)
    const blockingIssues = issues.filter(i =>
      (i.category === 'NEW' || i.category === 'EXISTING_MODIFIED') &&
      (i.severity === 'critical' || i.severity === 'high')
    );

    // Calculate quality score with full V9 scoring
    const qualityResult = await this.calculateQualityScore(issues, {
      repository: metadata.repository,
      prNumber: metadata.prNumber,
      commitSHA: metadata.commitSHA,  // BUG FIX #9: Pass commit SHA for caching
      prAuthor: metadata.prAuthor,
      prAuthorEmail: metadata.prAuthorEmail
    });
    const scoreInterpretation = this.getScoreInterpretation(qualityResult.score);

    // Calculate auto-fixable coverage (two-tier system)
    // Tier 1: Linter auto-fix (technical capability) = 84%
    const autoFixableGroups = groups.filter(g => this.canAutoFix(g));
    // Tier 2: Safe auto-apply (safe subset) = 51%
    const safeAutoApplyGroups = groups.filter(g => this.isSafeToAutoApply(g));

    // BUG FIX: Exclude RESOLVED issues from auto-fix calculations
    // RESOLVED issues don't need fixing - they were already fixed by the PR
    const issuesNeedingFixes = issues.filter(i => i.category !== 'RESOLVED');

    const autoFixableIssues = issuesNeedingFixes.filter(i =>
      safeAutoApplyGroups.some(g => g.rule === i.rule && g.tool === i.tool && g.severity === i.severity)
    );

    // BUG-083 FIX: Calculate ALL technically auto-fixable issues (Tier 1 + Tier 2)
    // This includes both safe auto-apply and those requiring review
    const technicallyAutoFixableIssues = issuesNeedingFixes.filter(i =>
      autoFixableGroups.some(g => g.rule === i.rule && g.tool === i.tool && g.severity === i.severity)
    );
    // Fix coverage based on issues that actually need fixes (excluding RESOLVED)
    const fixCoverage = issuesNeedingFixes.length > 0 ? (autoFixableIssues.length / issuesNeedingFixes.length * 100) : 0;

    return `## 📊 Executive Summary

### Quality Score

${scoreInterpretation.emoji} **${qualityResult.score.toFixed(1)}/100** (Grade: **${qualityResult.grade}**) - ${scoreInterpretation.label}

> ${scoreInterpretation.description}

**Score Breakdown**:
${qualityResult.categoryScores ? `${(() => {
          // SESSION 92 FIX: Only show Category Scores when 2+ categories have issues
          // Avoids redundant display when only Code Quality has issues
          const categoriesWithIssues = [
            byDetectedCategory['Security'] > 0,
            byDetectedCategory['Performance'] > 0,
            byDetectedCategory['Architecture'] > 0,
            byDetectedCategory['Dependencies'] > 0,
            byDetectedCategory['Code Quality'] > 0
          ].filter(Boolean).length;

          if (categoriesWithIssues >= 2) {
            return `**Category Scores** (Repository Health):
${byDetectedCategory['Security'] > 0 ? `- 🔒 Security: ${qualityResult.categoryScores.security}/100\n` : ''}${byDetectedCategory['Performance'] > 0 ? `- ⚡ Performance: ${qualityResult.categoryScores.performance}/100\n` : ''}${byDetectedCategory['Architecture'] > 0 ? `- 🏗️  Architecture: ${qualityResult.categoryScores.architecture}/100\n` : ''}${byDetectedCategory['Dependencies'] > 0 ? `- 📦 Dependencies: ${qualityResult.categoryScores.dependency}/100\n` : ''}${byDetectedCategory['Code Quality'] > 0 ? `- ✨ Code Quality: ${qualityResult.categoryScores.codeQuality}/100\n` : ''}`;
          }
          return ''; // Skip category scores when only one category has issues
        })()}
**Overall Scores**:
- 📱 **APP Score**: ${qualityResult.appScore}/100 (MIN of categories - "weakest link")
- 👨‍💻 **Skill Score**: ${qualityResult.skillScore}/100 (AVG of categories)

> Scores saved to Supabase for tracking trends over time

` : `
- Base Score: 100.0

**Issue Deductions by Category:**
- NEW issues: ${qualityResult.breakdown.newIssuesDeduction?.toFixed(1) || '0.0'} (${issues.filter(i => i.category === 'NEW').length} issues)
  _→ Issues introduced in this PR_

- EXISTING_MODIFIED issues: ${qualityResult.breakdown.existingModifiedDeduction?.toFixed(1) || '0.0'} (${issues.filter(i => i.category === 'EXISTING_MODIFIED').length} issues)
  _→ Pre-existing issues in modified files_

- EXISTING_REST issues: ${qualityResult.breakdown.existingRestDeduction?.toFixed(1) || '0.0'} (${issues.filter(i => i.category === 'EXISTING_REST').length} issues)
  _→ Pre-existing issues in unchanged files_
${qualityResult.breakdown.resolutionBonus > 0 ? `
**Bonus:**
- RESOLVED issues bonus: +${qualityResult.breakdown.resolutionBonus.toFixed(1)} (${issues.filter(i => i.category === 'RESOLVED').length} fixed)
  _→ Fixing pre-existing issues earns bonus points_
` : ''}${qualityResult.breakdown.blockingPenalty !== undefined && qualityResult.breakdown.blockingPenalty !== 0 ? `
**Additional Penalties:**
- Blocking issues: ${qualityResult.breakdown.blockingPenalty.toFixed(1)} (${blockingIssues.length} critical/high severity in NEW/EXISTING_MODIFIED)
  _→ Extra penalty for unresolved blocking issues_
` : ''}
**Final Score: ${qualityResult.breakdown.finalScore}/100**

> **Severity Weights:** Critical=-5.0, High=-3.0, Medium=-1.0, Low=-0.5
>
> **All categories have equal weight (100%)** - every issue impacts the score equally regardless of category.
> Only the PR decision logic differs: NEW and EXISTING_MODIFIED issues with critical/high severity can block the PR.
`}

---

### Issue Summary

${(() => {
        const activeCount = issues.filter(i => i.category !== 'RESOLVED').length;
        const resolvedCount = issues.filter(i => i.category === 'RESOLVED').length;
        return `**Active Issues**: ${activeCount.toLocaleString()} (${groups.length} unique types)${resolvedCount > 0 ? `\n**Resolved in PR**: ${resolvedCount.toLocaleString()} ✅` : ''}`;
      })()}

${(() => {
        // BUG-083 FIX: Clear distinction between Manual Review and Auto-Fixable
        const autoFixCount = technicallyAutoFixableIssues.length;
        const manualCount = issues.length - autoFixCount;
        const autoFixPercent = issues.length > 0 ? ((autoFixCount / issues.length) * 100).toFixed(1) : '0.0';
        const manualPercent = issues.length > 0 ? ((manualCount / issues.length) * 100).toFixed(1) : '0.0';

        // SESSION 51: Removed overwhelming "Issues Requiring Attention" section
        // The grouped issue details below provide better actionable information
        return '';
      })()}

${(() => {
        // BUG-103 FIX: Show active issues only (exclude RESOLVED) since that's what affects the score
        const activeIssues = issues.filter(i => i.category !== 'RESOLVED');
        const activeBySeverity = {
          critical: activeIssues.filter(i => i.severity === 'critical').length,
          high: activeIssues.filter(i => i.severity === 'high').length,
          medium: activeIssues.filter(i => i.severity === 'medium').length,
          low: activeIssues.filter(i => i.severity === 'low').length
        };
        const total = activeIssues.length || 1; // Prevent division by zero
        return `**By Severity** (active issues):
- 🔴 Critical: ${activeBySeverity.critical} (${((activeBySeverity.critical / total) * 100).toFixed(1)}%)
- 🟠 High: ${activeBySeverity.high} (${((activeBySeverity.high / total) * 100).toFixed(1)}%)
- 🟡 Medium: ${activeBySeverity.medium} (${((activeBySeverity.medium / total) * 100).toFixed(1)}%)
- 🟢 Low: ${activeBySeverity.low} (${((activeBySeverity.low / total) * 100).toFixed(1)}%)`;
      })()}

**By Category & Severity**:

${(() => {
        // Calculate severity breakdown per category
        const categorySeverity = {
          NEW: { critical: 0, high: 0, medium: 0, low: 0 },
          EXISTING_MODIFIED: { critical: 0, high: 0, medium: 0, low: 0 },
          RESOLVED: { critical: 0, high: 0, medium: 0, low: 0 },
          EXISTING_REST: { critical: 0, high: 0, medium: 0, low: 0 }
        };

        issues.forEach(issue => {
          const cat = issue.category as keyof typeof categorySeverity;
          const sev = issue.severity;
          if (categorySeverity[cat]) {
            categorySeverity[cat][sev] = (categorySeverity[cat][sev] || 0) + 1;
          }
        });

        return `| Category | Critical | High | Medium | Low | Total |
|----------|----------|------|--------|-----|-------|
| 🆕 NEW | ${categorySeverity.NEW.critical} | ${categorySeverity.NEW.high} | ${categorySeverity.NEW.medium} | ${categorySeverity.NEW.low} | **${byCategory.NEW}** |
| ⚠️ EXISTING_MODIFIED | ${categorySeverity.EXISTING_MODIFIED.critical} | ${categorySeverity.EXISTING_MODIFIED.high} | ${categorySeverity.EXISTING_MODIFIED.medium} | ${categorySeverity.EXISTING_MODIFIED.low} | **${byCategory.EXISTING_MODIFIED}** |
| ✅ RESOLVED | ${categorySeverity.RESOLVED.critical} | ${categorySeverity.RESOLVED.high} | ${categorySeverity.RESOLVED.medium} | ${categorySeverity.RESOLVED.low} | **${byCategory.RESOLVED}** |
| 📝 EXISTING_REST | ${categorySeverity.EXISTING_REST.critical} | ${categorySeverity.EXISTING_REST.high} | ${categorySeverity.EXISTING_REST.medium} | ${categorySeverity.EXISTING_REST.low} | **${byCategory.EXISTING_REST}** |
| **TOTAL** | **${bySeverity.critical}** | **${bySeverity.high}** | **${bySeverity.medium}** | **${bySeverity.low}** | **${issues.length}** |`;
      })()}

**App Health Score by Category**:

${(() => {
        // BUG #4 FIX: Show APP scores (baseScore=100) for clarity
        // Developer Skill scores (baseScore=50) are shown in "Skills Growth Tracker" section
        const byDetectedCategory: Record<string, { critical: number, high: number, medium: number, low: number, total: number }> = {
          'Security': { critical: 0, high: 0, medium: 0, low: 0, total: 0 },
          'Performance': { critical: 0, high: 0, medium: 0, low: 0, total: 0 },
          'Architecture': { critical: 0, high: 0, medium: 0, low: 0, total: 0 },
          'Dependencies': { critical: 0, high: 0, medium: 0, low: 0, total: 0 },
          'Code Quality': { critical: 0, high: 0, medium: 0, low: 0, total: 0 }
        };

        // BUG-102 FIX: Only count ACTIVE issues (not RESOLVED) since RESOLVED gives bonus, not penalty
        // This makes the table counts match the score deductions
        const activeIssues = issues.filter(i => i.category !== 'RESOLVED');
        activeIssues.forEach(issue => {
          const cat = issue.detectedCategory || 'Code Quality';
          if (byDetectedCategory[cat]) {
            const sev = issue.severity;
            byDetectedCategory[cat][sev] = (byDetectedCategory[cat][sev] || 0) + 1;
            byDetectedCategory[cat].total += 1;
          }
        });

        return `| Category | Critical | High | Medium | Low | Total | Score |
|----------|----------|------|--------|-----|-------|-------|
| 🔒 Security | ${byDetectedCategory['Security'].critical} | ${byDetectedCategory['Security'].high} | ${byDetectedCategory['Security'].medium} | ${byDetectedCategory['Security'].low} | **${byDetectedCategory['Security'].total}** | **${qualityResult.breakdown?.categoryScores?.security ?? qualityResult.categoryScores?.security ?? 'N/A'}/100** |
| ⚡ Performance | ${byDetectedCategory['Performance'].critical} | ${byDetectedCategory['Performance'].high} | ${byDetectedCategory['Performance'].medium} | ${byDetectedCategory['Performance'].low} | **${byDetectedCategory['Performance'].total}** | **${qualityResult.breakdown?.categoryScores?.performance ?? qualityResult.categoryScores?.performance ?? 'N/A'}/100** |
| 🏗️ Architecture | ${byDetectedCategory['Architecture'].critical} | ${byDetectedCategory['Architecture'].high} | ${byDetectedCategory['Architecture'].medium} | ${byDetectedCategory['Architecture'].low} | **${byDetectedCategory['Architecture'].total}** | **${qualityResult.breakdown?.categoryScores?.architecture ?? qualityResult.categoryScores?.architecture ?? 'N/A'}/100** |
| 📦 Dependencies | ${byDetectedCategory['Dependencies'].critical} | ${byDetectedCategory['Dependencies'].high} | ${byDetectedCategory['Dependencies'].medium} | ${byDetectedCategory['Dependencies'].low} | **${byDetectedCategory['Dependencies'].total}** | **${qualityResult.breakdown?.categoryScores?.dependency ?? qualityResult.categoryScores?.dependency ?? 'N/A'}/100** |
| ✨ Code Quality | ${byDetectedCategory['Code Quality'].critical} | ${byDetectedCategory['Code Quality'].high} | ${byDetectedCategory['Code Quality'].medium} | ${byDetectedCategory['Code Quality'].low} | **${byDetectedCategory['Code Quality'].total}** | **${qualityResult.breakdown?.categoryScores?.codeQuality ?? qualityResult.categoryScores?.codeQuality ?? 'N/A'}/100** |
| **TOTAL** | **${byDetectedCategory['Security'].critical + byDetectedCategory['Performance'].critical + byDetectedCategory['Architecture'].critical + byDetectedCategory['Dependencies'].critical + byDetectedCategory['Code Quality'].critical}** | **${byDetectedCategory['Security'].high + byDetectedCategory['Performance'].high + byDetectedCategory['Architecture'].high + byDetectedCategory['Dependencies'].high + byDetectedCategory['Code Quality'].high}** | **${byDetectedCategory['Security'].medium + byDetectedCategory['Performance'].medium + byDetectedCategory['Architecture'].medium + byDetectedCategory['Dependencies'].medium + byDetectedCategory['Code Quality'].medium}** | **${byDetectedCategory['Security'].low + byDetectedCategory['Performance'].low + byDetectedCategory['Architecture'].low + byDetectedCategory['Dependencies'].low + byDetectedCategory['Code Quality'].low}** | **${activeIssues.length}** | - |`;
      })()}

> **Score Calculation:** Each category starts at 100 (perfect health), then deducts: Critical (-5), High (-3), Medium (-1), Low (-0.5). Table shows active issues only (excludes RESOLVED). APP Score = MIN(all categories).
>
> 💡 **Tip:** RESOLVED issues (ones you fixed) earn XP instead of penalties! [📖 Full Scoring Guide](https://codequal.dev/docs/scoring-guide)

---

### Decision & Actions

**Blocking Decision**:
- ${blockingIssues.length} blocking issues (NEW or EXISTING_MODIFIED with critical/high severity)
- ${metadata.decision === 'APPROVED' ? '✅ **PR CAN BE MERGED**' : '⛔ **PR REQUIRES FIXES BEFORE MERGE**'}

${this.SHOW_FIX_COVERAGE ? `**Fix Coverage** (excluding ${issues.length - issuesNeedingFixes.length} already-resolved issues):
- **${autoFixableGroups.length}/${groups.length} issue groups** support auto-fix (${((autoFixableGroups.length / groups.length) * 100).toFixed(1)}%)
- **${autoFixableIssues.length.toLocaleString()}/${issuesNeedingFixes.length.toLocaleString()} issues** can be fixed automatically (${fixCoverage.toFixed(1)}%)` : ''}

**Analysis Results**:
- AI-analyzed groups: ${groups.length}
- Cost-optimized analysis: ${(((issues.length - groups.length) / issues.length) * 100).toFixed(1)}% reduction
- Coverage: 100% of detected issues
- Duration: ${this.formatDuration(Math.max(metadata.totalDuration || metadata.analysisTime || 0, 0))}

---

### 🤖 AI Fix Recommendations

${(() => {
        const breakdown = this.calculateTierBreakdown(groups);
        const patternFixable = breakdown.tier1.issues + breakdown.tier2.issues;
        const patternPercent = issues.length > 0 ? (patternFixable / issues.length * 100).toFixed(1) : '0.0';
        const guidanceNeeded = issues.length - patternFixable;

        // BUG-105 FIX: Get pattern count dynamically (no longer hardcoded 500)
        const patternCount = this.getPatternCountFromCache() || 640;
        // BUG-103 FIX: Exclude resolved issues from counts
        const resolvedCount = issues.filter(i => i.category === 'RESOLVED').length;
        const activeIssueCount = issues.length - resolvedCount;
        const activeIssuesNeedingGuidance = Math.max(0, guidanceNeeded - resolvedCount);

        // Session 91: Tier-aware content - PRO users see results, BASIC users see upgrade path
        if (this.userTier === 'pro' || this.userTier === 'enterprise') {
          // PRO tier: Show what was done - SESSION 92 FIX: Separate code fixes vs guidance
          const codeFixCount = issues.filter(i => this.hasActualCodeFix(i)).length;
          const guidanceCount = issues.filter(i => this.hasTextGuidanceOnly(i)).length;
          const codeFixRate = activeIssueCount > 0 ? (codeFixCount / activeIssueCount * 100).toFixed(1) : '0.0';
          const guidanceRate = activeIssueCount > 0 ? (guidanceCount / activeIssueCount * 100).toFixed(1) : '0.0';
          return `**⭐ PRO Analysis Complete**

| Metric | Result |
|--------|--------|
| 🔍 **Issues Analyzed** | ${activeIssueCount.toLocaleString()} active issues |
| 🤖 **AI Code Fixes** | ${codeFixCount.toLocaleString()} (${codeFixRate}%) ready-to-apply |
| 📖 **Text Guidance** | ${guidanceCount.toLocaleString()} (${guidanceRate}%) manual review |
| ✅ **Verified Fixes** | All code fixes validated against tool rules |
| 🔄 **Pattern Learning** | New patterns saved for future cost savings |

> Code fixes are shown inline with each issue below. Apply them with the IDE integration files or CLI.`;
        } else {
          // BASIC tier: Show upgrade path
          return `**Your Tier: BASIC** (Pattern Library + IDE Guidance)

| Available | Count | Description |
|-----------|-------|-------------|
| 📚 **Pattern Fixes** | ${patternFixable.toLocaleString()} (${patternPercent}%) | Pre-learned fixes from ${patternCount}+ patterns |
| 💡 **IDE Integration** | ✅ | Export to VS Code, JetBrains |
| 📖 **Guidance** | ${activeIssuesNeedingGuidance.toLocaleString()} | Step-by-step instructions |

> 💡 **Upgrade to PRO** for AI-generated fixes on all ${activeIssueCount.toLocaleString()} issues with automatic verification.`;
        }
      })()}

---

### 🔑 Key Findings

${this.generateKeyFindings(issues, groups, blockingIssues)}

---

### ⚡ Critical Blockers

${await this.generateCriticalBlockers(groups, blockingIssues, metadata.repoPath)}

---

${this.SHOW_QUICK_WINS ? `### 🎯 Quick Wins

${this.generateQuickWins(groups, autoFixableGroups)}

---` : ''}

### 📈 Trends & Recommendations

${await this.generateTrendsAndRecommendations(issues, metadata)}`;
  }

  /**
   * Generate key findings for executive summary
   */
  private generateKeyFindings(issues: EnrichedIssue[], groups: IssueGroup[], blockingIssues: EnrichedIssue[]): string {
    return generateKeyFindings(issues, groups, blockingIssues);
  }

  private _REMOVED_generateKeyFindings_LEGACY(issues: EnrichedIssue[], groups: IssueGroup[], blockingIssues: EnrichedIssue[]): string {
    const findings: string[] = [];

    // Finding 1: Overall quality assessment
    const newIssues = issues.filter(i => i.category === 'NEW');
    const resolvedIssues = issues.filter(i => i.category === 'RESOLVED');

    if (newIssues.length === 0 && resolvedIssues.length > 0) {
      findings.push(`✅ **Excellent PR**: No new issues introduced and ${resolvedIssues.length} existing issues fixed`);
    } else if (blockingIssues.length > 0) {
      findings.push(`🔴 **Action Required**: ${blockingIssues.length} critical/high severity issues must be fixed before merge`);
    } else if (newIssues.length < 10) {
      findings.push(`👍 **Good Quality**: Only ${newIssues.length} new issues introduced, manageable to fix`);
    } else {
      findings.push(`⚠️ **Attention Needed**: ${newIssues.length} new issues introduced, consider code review`);
    }

    // Finding 2: Most common issue type
    const topGroup = groups.sort((a, b) => b.count - a.count)[0];
    if (topGroup && topGroup.count > 10) {
      findings.push(`📊 **Most Common**: ${this.getUserFriendlyTitle(topGroup.rule, topGroup.tool)} appears ${topGroup.count} times`);
    }

    // Finding 3: Security concerns
    const securityIssues = issues.filter(i => i.detectedCategory === 'Security');
    const criticalSecurity = securityIssues.filter(i => i.severity === 'critical');
    if (criticalSecurity.length > 0) {
      findings.push(`🔒 **Security Alert**: ${criticalSecurity.length} critical security vulnerabilities found`);
    } else if (securityIssues.length > 0) {
      findings.push(`🔒 **Security**: ${securityIssues.length} security issues identified (review recommended)`);
    } else {
      findings.push(`✅ **Security**: No security vulnerabilities detected`);
    }

    // Finding 4: Auto-fix availability
    const autoFixable = groups.filter(g => this.canAutoFix(g));
    if (autoFixable.length > 0) {
      const autoFixableCount = issues.filter(i =>
        autoFixable.some(g => g.rule === i.rule && g.tool === i.tool)
      ).length;
      findings.push(`🔧 **Auto-Fix Available**: ${autoFixableCount} issues can be fixed automatically (see IDE integration files)`);
    }

    return findings.map(f => `- ${f}`).join('\n');
  }

  /**
   * Generate critical blockers section
   */
  private async generateCriticalBlockers(
    groups: IssueGroup[],
    blockingIssues: EnrichedIssue[],
    repoPath?: string
  ): Promise<string> {
    return await generateCriticalBlockers(groups, blockingIssues, repoPath);
  }

  private _REMOVED_generateCriticalBlockers_LEGACY(groups: IssueGroup[], blockingIssues: EnrichedIssue[]): string {
    if (blockingIssues.length === 0) {
      return `✅ **No critical blockers** - PR can be merged once reviewed\n\nAll identified issues are either low/medium severity or in unchanged code.`;
    }

    // Group blockers by rule and compute priority score (severity > category > spread)
    const severityWeight = (sev: string) => sev === 'critical' ? 100 : sev === 'high' ? 60 : 0;
    const categoryWeight = (cat?: string) => {
      const c = (cat || '').toLowerCase();
      if (c === 'security') return 30;
      if (c === 'performance') return 15;
      if (c === 'architecture') return 10;
      return 5; // quality/dependency
    };

    const blockerGroups = groups
      .filter(g => (g.severity === 'critical' || g.severity === 'high'))
      .filter(g => blockingIssues.some(i => i.rule === g.rule && i.tool === g.tool && i.severity === g.severity))
      .map(g => {
        const matches = blockingIssues.filter(i => i.rule === g.rule && i.tool === g.tool && i.severity === g.severity);
        const filesSpread = new Set(matches.map(i => i.file)).size;
        const score = severityWeight(g.severity) + categoryWeight(g.detectedCategory) + Math.min(20, Math.round(Math.log2(Math.max(1, filesSpread)) * 10));
        return { group: g, matches, filesSpread, score };
      })
      .sort((a, b) => b.score - a.score);

    let content = `⛔ **${blockingIssues.length} issues must be fixed before merge**\n\n`;
    content += `**Fix Order (highest priority first):**\n\n`;

    blockerGroups.forEach((entry, idx) => {
      const { group, matches, filesSpread, score } = entry;
      const icon = group.severity === 'critical' ? '🔴' : '🟠';
      content += `${idx + 1}. ${icon} **${this.getUserFriendlyTitle(group.rule, group.tool)}**\n`;
      content += `   - Severity: ${group.severity.toUpperCase()}\n`;
      content += `   - Category: ${group.detectedCategory || 'Code Quality'}\n`;
      content += `   - Occurrences: ${group.count} (in ${filesSpread} files)\n`;
      content += `   - Priority Score: ${score}\n`;
      content += `     *(Priority = Severity[${severityWeight(group.severity)}] + Category[${categoryWeight(group.detectedCategory)}] + File Spread[log₂(${filesSpread})×10])*\n`;
      // Include all example locations for clarity (may be long for large spreads)
      const examples = matches.map(i => `${i.file}:${i.line || 0}`);
      if (examples.length > 0) {
        content += `   - Examples:\n`;
        examples.forEach(ex => { content += `     • ${ex}\n`; });
      }
      content += `\n`;
    });

    // BUG FIX #29: Add detailed Priority Score explanation footnote
    content += `\n---\n\n`;
    content += `**📘 Priority Score Calculation**\n\n`;
    content += `The Priority Score helps you focus on the most impactful issues first. It combines three factors:\n\n`;
    content += `1. **Severity Weight** (0-100 points):\n`;
    content += `   - Critical: 100 points (security vulnerabilities, system crashes)\n`;
    content += `   - High: 60 points (data loss, performance degradation)\n`;
    content += `   - Medium: 0 points (not blocking)\n`;
    content += `   - Low: 0 points (not blocking)\n\n`;
    content += `2. **Category Weight** (0-30 points):\n`;
    content += `   - Security: +30 points (highest risk)\n`;
    content += `   - Performance: +15 points (affects UX)\n`;
    content += `   - Architecture: +10 points (technical debt)\n`;
    content += `   - Code Quality/Dependencies: +5 points (maintainability)\n\n`;
    content += `3. **File Spread** (0-20 points):\n`;
    content += `   - log₂(files) × 10 (capped at 20)\n`;
    content += `   - 1 file = 0 points\n`;
    content += `   - 2 files = 10 points\n`;
    content += `   - 4 files = 20 points (max)\n`;
    content += `   - Rationale: Issues spread across many files require more effort to fix\n\n`;
    content += `**Formula**: \`Priority = Severity + Category + File Spread\`\n\n`;
    content += `**Example**: A critical security issue in 4 files = 100 + 30 + 20 = **150 points**\n`;

    return content;
  }

  /**
   * Generate quick wins section
   */
  private generateQuickWins(groups: IssueGroup[], autoFixableGroups: IssueGroup[]): string {
    return generateQuickWins(groups, autoFixableGroups);
  }

  private _REMOVED_generateQuickWins_LEGACY(groups: IssueGroup[], autoFixableGroups: IssueGroup[]): string {
    if (autoFixableGroups.length === 0) {
      return `No auto-fixable issues identified. Manual fixes required for all issues.`;
    }

    // Sort by impact (high count + low severity = quick win)
    const quickWins = autoFixableGroups
      .filter(g => g.severity === 'medium' || g.severity === 'low')
      .sort((a, b) => b.count - a.count)
      .slice(0, 5); // Top 5 quick wins

    if (quickWins.length === 0) {
      return `Auto-fix available for ${autoFixableGroups.length} critical/high issues (not quick wins, but important).`;
    }

    let content = `**${quickWins.reduce((sum, g) => sum + g.count, 0)} issues** can be fixed automatically with **minimal effort**:\n\n`;

    quickWins.forEach((group, idx) => {
      content += `${idx + 1}. **${this.getUserFriendlyTitle(group.rule, group.tool)}** (${group.count} occurrences)\n`;
      content += `   - Effort: Low (automated fix available)\n`;
      content += `   - Impact: Improves code quality and consistency\n`;
      content += `   - Action: Download IDE fix file from attachments\n\n`;
    });

    content += `> 💡 **Tip**: Use Cursor IDE integration to apply all fixes with one click!`;

    return content;
  }

  /**
   * Generate trends and recommendations for leadership
   */
  private async generateTrendsAndRecommendations(issues: EnrichedIssue[], metadata: any): Promise<string> {
    let content = '';

    // Trend analysis (if we have skill score manager and author info)
    if (this.skillScoreManager && metadata.prAuthorEmail) {
      try {
        const history = await this.skillScoreManager.getScoreTrend(
          metadata.prAuthorEmail,
          metadata.repository
        );

        if (history && history.length > 1 && !history.every((v: number) => v === history[0])) {
          const trend = history[history.length - 1] > history[0] ? 'improving' :
            history[history.length - 1] < history[0] ? 'declining' : 'stable';
          const trendIcon = trend === 'improving' ? '📈' : trend === 'declining' ? '📉' : '➡️';

          content += `**Your Performance Trend**: ${trendIcon} Code quality is **${trend}**\n`;
          content += `- Last ${history.length} PRs: ${history.join(' → ')}\n`;
          content += trend === 'improving'
            ? `- ✅ Positive trajectory - keep up the good work!\n\n`
            : trend === 'declining'
              ? `- ⚠️ Declining quality - consider pair programming or additional reviews\n\n`
              : `- Consistent quality - maintain current practices\n\n`;
        }
      } catch (error) {
        // Silent fail - trend is optional
      }
    }

    // Leadership recommendations
    // NOTE: This section will be enhanced later when API service and CI/CD integration is complete
    // For now, we'll keep it minimal or remove it based on user preference

    const newIssues = issues.filter(i => i.category === 'NEW');
    // BUG-080 FIX: Count both CRITICAL and HIGH severity NEW/EXISTING_MODIFIED issues as blocking
    // HIGH severity issues are also blockers, not just critical
    const blockingIssues = issues.filter(i =>
      (i.severity === 'critical' || i.severity === 'high') &&
      (i.category === 'NEW' || i.category === 'EXISTING_MODIFIED')
    );
    const blockingCount = blockingIssues.length;
    const criticalCount = blockingIssues.filter(i => i.severity === 'critical').length;
    const highCount = blockingIssues.filter(i => i.severity === 'high').length;
    const securityIssues = issues.filter(i => i.detectedCategory === 'Security');

    // Enhancement #1: Auto-fix mention in recommendations
    // SESSION 26 FIX: Exclude RESOLVED issues - they're already fixed!
    const activeIssues = issues.filter(i => i.category !== 'RESOLVED');

    // Session 91 FIX: Distinguish between "can be auto-fixed" and "has AI fix generated"
    // - autoFixableIssues = Issues that CAN be auto-fixed (by rule type)
    // - aiFixedIssues = Issues that actually HAVE AI-generated fixes (SESSION 92: exclude placeholders)
    const autoFixableIssues = activeIssues.filter(i =>
      this.isSafeToAutoApply({ rule: i.rule, tool: i.tool, severity: i.severity } as IssueGroup)
    );
    // SESSION 92 FIX: Use hasActualCodeFix to exclude placeholder fixes
    const aiFixedIssues = activeIssues.filter(i => this.hasActualCodeFix(i));
    const textGuidanceIssues = activeIssues.filter(i => this.hasTextGuidanceOnly(i));

    // Session 91: Use correct metric based on tier
    if (this.userTier === 'pro' || this.userTier === 'enterprise') {
      // PRO: Show actual AI fixes generated - SESSION 92: Add text guidance count
      const aiFixPercent = activeIssues.length > 0 ? Math.round((aiFixedIssues.length / activeIssues.length) * 100) : 0;
      if (aiFixedIssues.length > 0 || textGuidanceIssues.length > 0) {
        if (aiFixedIssues.length > 0) {
          content += `✅ **AI Code Fixes**: ${aiFixedIssues.length.toLocaleString()} issues (${aiFixPercent}%) have ready-to-apply code fixes.\n`;
        }
        if (textGuidanceIssues.length > 0) {
          const guidancePercent = activeIssues.length > 0 ? Math.round((textGuidanceIssues.length / activeIssues.length) * 100) : 0;
          content += `📖 **Text Guidance**: ${textGuidanceIssues.length.toLocaleString()} issues (${guidancePercent}%) have guidance (no auto-fix).\n`;
        }
        content += '\n';
      }
    } else {
      // BASIC: Show auto-fixable by rule type
      const autoFixPercent = activeIssues.length > 0 ? Math.round((autoFixableIssues.length / activeIssues.length) * 100) : 0;
      if (autoFixableIssues.length > 0) {
        content += `🚀 **Easy Fixes Available**: ${autoFixableIssues.length.toLocaleString()} issues (${autoFixPercent}%) can be auto-fixed using your IDE or linter.\n\n`;
      }
    }

    if (blockingCount > 0) {
      // BUG-080 FIX: Show breakdown of critical vs high severity blocking issues
      const criticalMsg = criticalCount > 0 ? `${criticalCount} critical` : '';
      const highMsg = highCount > 0 ? `${highCount} high` : '';
      const severityBreakdown = [criticalMsg, highMsg].filter(m => m).join(' and ');
      content += `1. **Immediate Action**: ${blockingCount} blocking issues (${severityBreakdown}) require review before deployment\n`;
    } else {
      content += `1. **Quality Status**: No blocking issues - PR meets baseline quality standards\n`;
    }

    if (securityIssues.length > 5) {
      content += `2. **Security Training**: Consider security training for the team (${securityIssues.length} security issues found)\n`;
    } else {
      content += `2. **Security Posture**: Security practices are adequate\n`;
    }

    if (newIssues.length > 50) {
      content += `3. **Code Review Process**: High issue count (${newIssues.length} new) suggests need for more thorough pre-commit review\n`;
    } else {
      // Avoid nonsense when low count is zero or minimal
      if (newIssues.length > 0) {
        content += `3. **Development Velocity**: Issue count is manageable - good balance of speed and quality\n`;
      }
    }

    // Session 91 FIX: Use actual AI fix count for PRO tier
    // SESSION 92 FIX: Use hasActualCodeFix to exclude placeholders
    const actualFixedCount = issues.filter(i => this.hasActualCodeFix(i)).length;
    const textGuidanceCount = issues.filter(i => this.hasTextGuidanceOnly(i)).length;
    const autoFixableCount = issues.filter(i =>
      this.canAutoFix({ rule: i.rule, tool: i.tool, severity: i.severity } as IssueGroup)
    ).length;

    if (this.userTier === 'pro' || this.userTier === 'enterprise') {
      // PRO: Show actual AI fix rate - SESSION 92: Separate code fixes vs guidance
      if (actualFixedCount > 0 || textGuidanceCount > 0) {
        const fixRate = issues.length > 0 ? ((actualFixedCount / issues.length) * 100).toFixed(0) : '0';
        const guidanceRate = issues.length > 0 ? ((textGuidanceCount / issues.length) * 100).toFixed(0) : '0';
        content += `4. **AI Fix Coverage**: ${fixRate}% code fixes, ${guidanceRate}% text guidance.\n`;
      }
    } else {
      // BASIC: Show automation opportunity
      if (autoFixableCount > issues.length * 0.3) {
        content += `4. **Automation Opportunity**: ${((autoFixableCount / issues.length) * 100).toFixed(0)}% of issues auto-fixable - consider pre-commit hooks\n`;
      } else if (issues.length > 0) {
        content += `4. **Code Quality**: Most issues require manual attention - allocate development time accordingly\n`;
      }
    }

    return content;
  }

  /**
   * Convert technical rule name to user-friendly title
   * Phase D: User-friendly titles
   */
  private getUserFriendlyTitle(rule: string, tool: string): string {
    return getUserFriendlyTitle(rule, tool);
  }

  /**
   * Detect issue category from rule name, tool, and message
   * Phase E: Category-specific enhancements
   */
  private detectCategory(rule: string, tool: string, message: string): string {
    return detectCategory(rule, tool, message);
  }

  /**
   * Calculate risk level based on category and severity
   * Phase E: Risk assessment
   * ENHANCEMENT: Added rule parameter for rule-specific risk adjustments
   */
  private calculateRiskLevel(category: string, severity: string, rule?: string): {
    level: string;
    color: string;
    emoji: string;
    description: string;
  } {
    return calculateRiskLevel(category, severity, rule);
  }

  /**
   * Get category-specific context and guidance
   * Phase E: Category-aware recommendations
   */
  private getCategoryContext(category: string, severity: string): {
    focus: string;
    businessImpact: string;
    urgency: string;
    stakeholders: string[];
    resources: string[];
  } {
    return getCategoryContext(category, severity);
  }

  /**
   * Get priority guidance for fixing issues
   * Phase E: Priority-based action plan
   */
  private getPriorityGuidance(
    category: string,
    severity: string,
    count: number,
    riskLevel: string
  ): {
    priority: string;
    timeframe: string;
    effort: string;
    recommendation: string;
  } {
    return getPriorityGuidance(category, severity, count, riskLevel);
  }

  /**
   * Generate comprehensive issue description
   * Phase D: What/Why/Causes/Impact
   * BUG-099 FIX: Added optional message parameter to include actual CVE/vulnerability details
   */
  private getIssueDescription(rule: string, tool: string, severity: string, message?: string): {
    what: string;
    why: string;
    causes: string[];
    impact: string;
  } {
    // Comprehensive rule-specific descriptions database
    const descriptions: Record<string, any> = {
      // ===== Security Issues (Critical) =====
      'java.lang.security.audit.command-injection-process-builder': {
        what: 'User-controlled input is passed directly to ProcessBuilder or Runtime.exec() without validation, allowing command injection attacks.',
        why: 'Attackers can inject malicious commands that execute with application privileges, compromising the entire system.',
        causes: [
          'Concatenating user input directly into shell commands',
          'Not using process argument arrays properly',
          'Missing input validation and sanitization',
          'Trusting external data sources without verification'
        ],
        impact: 'Complete system compromise, data exfiltration, malware installation, and potential lateral movement to other systems. OWASP Top 10 A03:2021 (Injection).'
      },
      'java.lang.security.audit.command-injection': {
        what: 'User-controlled input is passed directly to ProcessBuilder or Runtime.exec() without validation, allowing command injection attacks.',
        why: 'Attackers can inject malicious commands that execute with application privileges, compromising the entire system.',
        causes: [
          'Concatenating user input directly into shell commands',
          'Not using process argument arrays properly',
          'Missing input validation and sanitization',
          'Trusting external data sources without verification'
        ],
        impact: 'Complete system compromise, data exfiltration, malware installation, and potential lateral movement to other systems. OWASP Top 10 A03:2021 (Injection).'
      },
      'java.lang.security.audit.unsafe-reflection': {
        what: 'Application uses reflection with user-controlled class names or method names, allowing arbitrary code execution.',
        why: 'Attackers can instantiate arbitrary classes or invoke dangerous methods, bypassing security restrictions and executing malicious code.',
        causes: [
          'Using Class.forName() with user input',
          'Dynamic method invocation with untrusted data',
          'Deserialization with arbitrary class loading',
          'Plugin systems without class whitelisting'
        ],
        impact: 'Remote code execution, privilege escalation, security manager bypass, and complete application compromise. OWASP Top 10 A03:2021 (Injection).'
      },
      'java.lang.security.audit.sql-injection': {
        what: 'SQL queries are constructed using string concatenation with user input, allowing SQL injection attacks.',
        why: 'Attackers can inject arbitrary SQL code to bypass authentication, extract sensitive data, or modify database contents.',
        causes: [
          'Direct string concatenation in SQL queries',
          'Not using PreparedStatement with placeholders',
          'Lack of input validation',
          'Copy-pasted SQL construction code'
        ],
        impact: 'Data breach, compliance violations (GDPR, SOC2, PCI-DSS), financial loss, and complete database compromise. OWASP Top 10 #1.'
      },
      'java.lang.security.audit.xxe': {
        what: 'XML parsers configured to process external entities, allowing XXE (XML External Entity) attacks.',
        why: 'Attackers can read arbitrary files from the server, perform SSRF attacks, or cause denial of service.',
        causes: [
          'Default XML parser configuration',
          'Not disabling external entity processing',
          'Processing untrusted XML input',
          'Legacy XML processing code'
        ],
        impact: 'Sensitive file disclosure (/etc/passwd, configuration files), SSRF attacks, and potential remote code execution. OWASP Top 10 A05:2021.'
      },
      'java.lang.security.audit.path-traversal': {
        what: 'File paths are constructed using unsanitized user input, allowing directory traversal attacks.',
        why: 'Attackers can access files outside the intended directory using "../" sequences.',
        causes: [
          'Direct concatenation of user input into file paths',
          'Missing path canonicalization',
          'No whitelist validation of file access',
          'Trusting client-provided file paths'
        ],
        impact: 'Sensitive file disclosure, configuration file theft, credential leaks, and potential code execution if combined with file upload.'
      },
      'java.lang.security.audit.crypto.weak-cipher': {
        what: 'Using weak or broken encryption algorithms like DES, RC4, or ECB mode.',
        why: 'These ciphers can be broken in seconds to minutes with modern hardware, providing no real security.',
        causes: [
          'Using deprecated encryption APIs',
          'Copy-pasted old crypto code',
          'Lack of cryptography expertise',
          'Not following current security standards'
        ],
        impact: 'Data confidentiality breach, compliance violations (PCI-DSS requires AES-256), and complete encryption bypass.'
      },
      'java.lang.security.audit.crypto.weak-hash': {
        what: 'Using weak hashing algorithms like MD5 or SHA1 for security-sensitive operations.',
        why: 'These algorithms are cryptographically broken and can be reversed or collided within hours.',
        causes: [
          'Using deprecated hashing APIs',
          'Legacy password storage code',
          'Not following OWASP password storage guidelines',
          'Lack of security review'
        ],
        impact: 'Password compromise, authentication bypass, data integrity loss, and compliance violations. Use bcrypt, scrypt, or Argon2 instead.'
      },
      'java.lang.security.audit.hardcoded-credentials': {
        what: 'Credentials (passwords, API keys, tokens) are hard-coded directly in source code.',
        why: 'Source code is often committed to version control, shared with contractors, or leaked in public repositories.',
        causes: [
          'Quick testing with real credentials',
          'Lack of proper configuration management',
          'Not using environment variables or secret managers',
          'Poor security awareness'
        ],
        impact: 'Credential theft, unauthorized access, data breaches, and complete system compromise. Violates all security compliance standards.'
      },

      // ===== Exception Handling =====
      'AvoidThrowingRawExceptionTypes': {
        what: 'Code throws generic exception types (Exception, RuntimeException, Throwable) instead of specific exception classes.',
        why: 'Generic exceptions make it impossible to handle different error conditions appropriately and provide poor debugging information.',
        causes: [
          'Quick error handling without proper exception design',
          'Lack of custom exception classes',
          'Copy-pasted error handling code',
          'Not following exception hierarchy best practices'
        ],
        impact: 'Debugging becomes difficult, error handling is less precise, and code maintainability decreases. Can mask serious errors behind generic catches.'
      },
      'AvoidCatchingThrowable': {
        what: 'Catching Throwable or Error in exception handlers, which includes system-level errors.',
        why: 'Catching Throwable can hide critical JVM errors like OutOfMemoryError or ThreadDeath that should propagate.',
        causes: [
          'Overly broad exception handling',
          'Misunderstanding Java exception hierarchy',
          'Trying to prevent all crashes (wrong approach)',
          'Legacy error handling patterns'
        ],
        impact: 'System instability, inability to recover from fatal errors, and difficult-to-diagnose runtime issues.'
      },

      // ===== Logging & Debugging =====
      'SystemPrintln': {
        what: 'Using System.out.println() or System.err.println() for output instead of a proper logging framework.',
        why: 'System.out doesn\'t provide log levels, timestamps, structured output, or the ability to control logging in production.',
        causes: [
          'Debug statements left in production code',
          'Quick testing without proper logging setup',
          'Lack of logging framework knowledge',
          'Not removing temporary debugging code'
        ],
        impact: 'Poor production monitoring, no log level control, difficult to debug production issues, performance overhead, and cluttered console output.'
      },
      'GuardLogStatement': {
        what: 'Log statements perform expensive operations (string concatenation, toString(), serialization) unconditionally, even when log level is disabled.',
        why: 'String operations and object serialization consume CPU cycles even when logs are not written, impacting performance.',
        causes: [
          'Direct string concatenation in log statements',
          'Not checking isDebugEnabled() before expensive operations',
          'Complex object toString() in log parameters',
          'Lack of awareness about logging performance impact'
        ],
        impact: 'Unnecessary CPU overhead (5-15% in high-throughput systems), increased garbage collection pressure, reduced application performance, and higher cloud costs.'
      },
      'AvoidPrintStackTrace': {
        what: 'Using printStackTrace() which prints stack traces to System.err without proper error handling.',
        why: 'Stack traces go to console without logging framework control, exposing sensitive information and bypassing log management.',
        causes: [
          'Quick error debugging during development',
          'Not using proper exception logging',
          'Copy-pasted exception handling',
          'Lack of proper error handling patterns'
        ],
        impact: 'Security information disclosure, no centralized error logging, difficult production debugging, and poor error analytics.'
      },

      // ===== Concurrency =====
      'AvoidUsingVolatile': {
        what: 'Using the volatile keyword for thread synchronization instead of proper concurrency utilities.',
        why: 'Volatile is a low-level primitive that\'s easy to misuse and doesn\'t provide atomicity. Modern Java has better concurrency tools (java.util.concurrent).',
        causes: [
          'Premature optimization',
          'Misunderstanding of Java memory model',
          'Using outdated concurrency patterns (pre-Java 5)',
          'Not using AtomicInteger, Locks, or concurrent collections'
        ],
        impact: 'Potential race conditions, hard-to-debug concurrency bugs, non-atomic compound operations, or unnecessary performance overhead.'
      },
      'AvoidSynchronizedAtMethodLevel': {
        what: 'Using synchronized keyword at method level instead of fine-grained synchronization blocks.',
        why: 'Method-level synchronization is coarse-grained, causing unnecessary lock contention and reducing concurrency.',
        causes: [
          'Quick thread-safety fix without analysis',
          'Not identifying actual critical sections',
          'Copy-pasted synchronization code',
          'Lack of concurrency design'
        ],
        impact: 'Performance bottlenecks in multi-threaded applications, reduced throughput, and increased lock contention (10-50% performance loss).'
      },
      'DoubleCheckedLocking': {
        what: 'Using broken double-checked locking pattern for lazy initialization.',
        why: 'Without proper volatile keyword, this pattern is broken due to Java Memory Model allowing instruction reordering.',
        causes: [
          'Using outdated Java patterns (pre-Java 5)',
          'Copy-pasted singleton code',
          'Not understanding Java Memory Model',
          'Trying to optimize initialization'
        ],
        impact: 'Subtle race conditions leading to partially-constructed objects, random crashes, and data corruption that\'s extremely hard to debug.'
      },

      // ===== Performance =====
      'UseStringBufferForStringAppends': {
        what: 'Using string concatenation (+) in loops instead of StringBuilder/StringBuffer.',
        why: 'Each concatenation creates a new String object, causing O(n²) time complexity and excessive garbage collection.',
        causes: [
          'Not understanding String immutability',
          'Quick coding without performance consideration',
          'Processing large amounts of text',
          'Iterative string building in loops'
        ],
        impact: 'Severe performance degradation (100-1000x slower for large strings), high memory usage, garbage collection pressure, and potential OutOfMemoryError.'
      },
      'AvoidInstantiatingObjectsInLoops': {
        what: 'Creating new object instances inside loop iterations instead of reusing objects.',
        why: 'Excessive object creation increases garbage collection pressure and memory allocation overhead.',
        causes: [
          'Not considering object reuse patterns',
          'Lack of performance profiling',
          'Quick implementation without optimization',
          'Processing large datasets'
        ],
        impact: 'High garbage collection overhead (10-30% CPU), increased memory usage, and reduced throughput in performance-critical code.'
      },
      'InefficientStringBuffering': {
        what: 'Using StringBuilder/StringBuffer inefficiently (small buffer, unnecessary conversion, wrong usage).',
        why: 'Poor StringBuilder usage can be slower than direct concatenation and causes frequent buffer resizing.',
        causes: [
          'Not specifying initial capacity',
          'Multiple unnecessary toString() calls',
          'Converting back and forth between String and StringBuilder',
          'Not understanding StringBuilder API'
        ],
        impact: 'Wasted memory allocations, buffer resizing overhead, and negated performance benefits of StringBuilder.'
      },

      // ===== Code Quality =====
      'ClassWithOnlyPrivateConstructorsShouldBeFinal': {
        what: 'Utility class with only private constructors is not marked as final.',
        why: 'Non-final utility classes can be extended (despite private constructors), causing confusion and potential issues.',
        causes: [
          'Not marking utility classes as final',
          'Incomplete class design',
          'Copy-pasted utility class template',
          'Not following static utility class pattern'
        ],
        impact: 'Potential class extension through inner classes, confusion about class purpose, and violation of utility class pattern.'
      },
      'AvoidReassigningParameters': {
        what: 'Method parameters are reassigned within the method body.',
        why: 'Parameter reassignment makes code harder to understand and debug, as original values are lost.',
        causes: [
          'Using parameters as local variables',
          'Not declaring proper local variables',
          'Quick coding without variable planning',
          'Modifying input to avoid creating new variables'
        ],
        impact: 'Code confusion, difficult debugging, potential bugs when original value is needed, and violation of immutability principles.'
      },
      'ReturnEmptyCollectionRatherThanNull': {
        what: 'Method returns null instead of an empty collection (List, Set, Map).',
        why: 'Returning null forces callers to check for null, leading to NullPointerExceptions if forgotten.',
        causes: [
          'Not following null-safe coding practices',
          'Quick coding without considering callers',
          'Legacy code patterns',
          'Not using Collections.emptyList() or similar'
        ],
        impact: 'Frequent NullPointerExceptions in caller code, defensive null checks everywhere, and poor API design.'
      },
      'ConstructorCallsOverridableMethod': {
        what: 'Constructor calls an overridable (non-final, non-private) method.',
        why: 'Subclass overridden method executes before subclass constructor completes, accessing uninitialized state.',
        causes: [
          'Poor object initialization design',
          'Not understanding constructor execution order',
          'Refactoring code without considering inheritance',
          'Violation of "Effective Java" guidelines'
        ],
        impact: 'Subtle bugs in subclasses, uninitialized state access, NullPointerExceptions, and hard-to-debug inheritance issues.'
      },

      // ===== Resource Management =====
      'CloseResource': {
        what: 'File, stream, socket, or database connection is opened but not properly closed in finally block or try-with-resources.',
        why: 'Unclosed resources cause resource leaks, file handle exhaustion, and connection pool depletion.',
        causes: [
          'Not using try-with-resources (Java 7+)',
          'Missing finally blocks',
          'Exception thrown before close() call',
          'Assuming garbage collector will close resources'
        ],
        impact: 'Resource leaks leading to "Too many open files" errors, connection pool exhaustion, memory leaks, and eventual application crashes.'
      },
      'UseTryWithResources': {
        what: 'Resources implementing AutoCloseable are manually closed instead of using try-with-resources.',
        why: 'Try-with-resources automatically closes resources even if exceptions occur, preventing resource leaks.',
        causes: [
          'Not using Java 7+ language features',
          'Legacy code patterns',
          'Lack of knowledge about try-with-resources',
          'Copy-pasted old-style resource management'
        ],
        impact: 'Higher risk of resource leaks, more verbose code, potential for forgotten close() calls, and missing exception suppression.'
      },

      // ===== PYTHON TOOLS (BUG-098 FIX) =====
      // Bandit Security Rules (B1xx-B7xx)
      'B101': {
        what: 'Use of assert statement detected. Assert statements are removed when Python is run with optimization (-O flag).',
        why: 'Assert statements should not be used for security checks because they can be disabled, leaving security logic bypassed.',
        causes: [
          'Using assert for input validation',
          'Security checks implemented with assert',
          'Misunderstanding assert purpose (debugging vs. runtime checks)',
          'Copy-pasted code with assert-based validation'
        ],
        impact: 'Security bypasses in production when running with -O flag. Use proper if/raise patterns for security validations.'
      },
      'B102': {
        what: 'Use of exec() detected. This allows execution of arbitrary Python code.',
        why: 'exec() can execute any Python code, making it extremely dangerous if user input reaches it.',
        causes: [
          'Dynamic code execution requirements',
          'Processing untrusted code strings',
          'Template systems with code execution',
          'Configuration files with executable Python'
        ],
        impact: 'Remote code execution (RCE), complete system compromise. OWASP Top 10 A03:2021 (Injection).'
      },
      'B103': {
        what: 'Setting file permissions with unsafe mask allowing world-writable or world-readable access.',
        why: 'Overly permissive file permissions can expose sensitive data or allow unauthorized modifications.',
        causes: [
          'Using chmod with 0o777 or similar',
          'Not restricting permissions properly',
          'Copy-pasted file handling code',
          'Misunderstanding Unix permissions'
        ],
        impact: 'Information disclosure, unauthorized file modification, privilege escalation.'
      },
      'B104': {
        what: 'Binding to all network interfaces (0.0.0.0) detected.',
        why: 'Binding to all interfaces exposes the service to all network traffic, including potentially untrusted networks.',
        causes: [
          'Default server configuration',
          'Development settings in production',
          'Lack of network security awareness',
          'Convenience over security'
        ],
        impact: 'Unintended network exposure, increased attack surface, potential unauthorized access.'
      },
      'B105': {
        what: 'Hardcoded password or secret detected in source code.',
        why: 'Hardcoded credentials are exposed in version control and can be extracted from compiled code.',
        causes: [
          'Development shortcuts',
          'Lack of secrets management',
          'Not using environment variables',
          'Legacy code with embedded credentials'
        ],
        impact: 'Credential theft, unauthorized access, data breaches. Violates all security compliance standards.'
      },
      'B106': {
        what: 'Hardcoded password in function argument default value.',
        why: 'Default passwords in function signatures are exposed and often used in production.',
        causes: [
          'Convenience during development',
          'Template code with placeholder passwords',
          'Forgetting to remove defaults',
          'Lack of configuration management'
        ],
        impact: 'Credential exposure, unauthorized access, security audit failures.'
      },
      'B107': {
        what: 'Hardcoded password in function call detected.',
        why: 'Passwords passed as string literals in function calls are exposed in source code.',
        causes: [
          'Quick testing with hardcoded values',
          'Not using secure credential retrieval',
          'Development code in production',
          'Copy-pasted authentication code'
        ],
        impact: 'Credential theft, unauthorized access, compliance violations.'
      },
      'B108': {
        what: 'Probable insecure use of temp file/directory detected.',
        why: 'Insecure temporary file creation can lead to symlink attacks or information disclosure.',
        causes: [
          'Using mktemp() instead of mkstemp()',
          'Predictable temporary file names',
          'Not using tempfile module properly',
          'Race conditions in temp file creation'
        ],
        impact: 'Information disclosure, symlink attacks, privilege escalation.'
      },
      'B110': {
        what: 'Try-except-pass detected, silently ignoring exceptions.',
        why: 'Catching exceptions and doing nothing hides errors and makes debugging impossible.',
        causes: [
          'Quick error suppression',
          'Not understanding exception handling',
          'Lazy error handling',
          '"Make it work" mentality'
        ],
        impact: 'Hidden bugs, security issues masked, impossible to debug failures.'
      },
      'B112': {
        what: 'Try-except-continue in loop, silently skipping failed iterations.',
        why: 'Ignoring exceptions in loops can cause data loss or incomplete processing.',
        causes: [
          'Batch processing without error logging',
          'Ignoring problematic items',
          'Not implementing proper error handling',
          'Quick fixes for failing loops'
        ],
        impact: 'Data loss, incomplete operations, hidden failures.'
      },
      'B201': {
        what: 'Flask app running with debug=True in production.',
        why: 'Debug mode exposes sensitive information and allows code execution via the debugger.',
        causes: [
          'Development settings in production',
          'Forgetting to disable debug mode',
          'Environment variable not set',
          'Hardcoded debug=True'
        ],
        impact: 'Information disclosure, remote code execution via debug console, complete compromise.'
      },
      'B301': {
        what: 'Use of pickle module for deserialization detected.',
        why: 'Pickle can execute arbitrary code during deserialization, making it extremely dangerous with untrusted data.',
        causes: [
          'Serializing Python objects',
          'Caching with pickle',
          'Inter-process communication',
          'Not understanding pickle security risks'
        ],
        impact: 'Remote code execution when loading untrusted pickle data. Use JSON or other safe formats.'
      },
      'B302': {
        what: 'Use of marshal module detected.',
        why: 'Marshal is not designed for untrusted data and can be exploited.',
        causes: [
          'Low-level serialization needs',
          'Performance optimization attempts',
          'Copy-pasted code',
          'Misunderstanding marshal purpose'
        ],
        impact: 'Potential code execution, data corruption.'
      },
      'B303': {
        what: 'Use of insecure MD2, MD4, MD5, or SHA1 hash function detected.',
        why: 'These hash functions are cryptographically broken and can be attacked in minutes.',
        causes: [
          'Legacy code requirements',
          'Not following OWASP guidelines',
          'Copy-pasted crypto code',
          'Misunderstanding hash security'
        ],
        impact: 'Password compromise, signature forgery, data integrity loss. Use SHA-256+ or bcrypt/argon2.'
      },
      'B304': {
        what: 'Use of insecure cipher or cipher mode (DES, RC4, ECB) detected.',
        why: 'These ciphers/modes are cryptographically broken and provide no real security.',
        causes: [
          'Legacy system compatibility',
          'Outdated crypto libraries',
          'Copy-pasted encryption code',
          'Not following security standards'
        ],
        impact: 'Data confidentiality breach, encryption bypass. Use AES-256-GCM.'
      },
      'B305': {
        what: 'Use of insecure cipher mode detected.',
        why: 'ECB mode and other weak modes leak information about plaintext patterns.',
        causes: [
          'Default cipher mode usage',
          'Misunderstanding cipher modes',
          'Legacy code patterns',
          'Not specifying mode explicitly'
        ],
        impact: 'Pattern leakage, potential decryption. Use GCM or CBC with proper IV.'
      },
      'B306': {
        what: 'Use of mktemp() detected, which is insecure.',
        why: 'mktemp() creates predictable file names vulnerable to symlink attacks.',
        causes: [
          'Not using mkstemp()',
          'Legacy code patterns',
          'Copy-pasted temp file code',
          'Not understanding temp file security'
        ],
        impact: 'Race conditions, symlink attacks, information disclosure.'
      },
      'B307': {
        what: 'Use of eval() detected.',
        why: 'eval() executes arbitrary Python code, leading to code injection if user input reaches it.',
        causes: [
          'Dynamic code execution needs',
          'Processing mathematical expressions',
          'Configuration parsing',
          'Not using ast.literal_eval()'
        ],
        impact: 'Remote code execution, complete system compromise. Use ast.literal_eval() for safe alternatives.'
      },
      'B308': {
        what: 'Use of mark_safe() detected in Django template.',
        why: 'mark_safe() disables HTML escaping, potentially enabling XSS attacks.',
        causes: [
          'Rendering HTML content',
          'Not sanitizing before marking safe',
          'Template customization',
          'Misunderstanding template security'
        ],
        impact: 'Cross-site scripting (XSS), session hijacking, phishing.'
      },
      'B311': {
        what: 'Use of random module for security/cryptographic purposes detected.',
        why: 'The random module is not cryptographically secure and can be predicted.',
        causes: [
          'Generating tokens/passwords with random',
          'Not using secrets module',
          'Legacy code patterns',
          'Misunderstanding randomness'
        ],
        impact: 'Predictable tokens, session hijacking, authentication bypass. Use secrets module.'
      },
      'B312': {
        what: 'Use of telnetlib detected.',
        why: 'Telnet transmits data in cleartext, exposing credentials and data.',
        causes: [
          'Legacy system integration',
          'Not using SSH',
          'Quick automation scripts',
          'Infrastructure without encryption'
        ],
        impact: 'Credential theft, man-in-the-middle attacks, data interception.'
      },
      'B313': {
        what: 'Use of xml.etree.ElementTree detected, which is vulnerable to XML attacks.',
        why: 'ElementTree is vulnerable to billion laughs and external entity attacks.',
        causes: [
          'XML parsing requirements',
          'Not using defusedxml',
          'Legacy XML code',
          'Not understanding XML security'
        ],
        impact: 'Denial of service, information disclosure, SSRF via XXE.'
      },
      'B314': {
        what: 'Use of xml.dom.minidom detected, which is vulnerable to XML attacks.',
        why: 'minidom is vulnerable to various XML-based attacks.',
        causes: [
          'XML parsing requirements',
          'DOM-style XML needs',
          'Not using defusedxml',
          'Legacy code'
        ],
        impact: 'Denial of service, XXE attacks, information disclosure.'
      },
      'B320': {
        what: 'Use of lxml without defusing detected.',
        why: 'lxml is vulnerable to XXE attacks without proper configuration.',
        causes: [
          'XML parsing with lxml',
          'Not disabling external entities',
          'Default lxml configuration',
          'Not understanding XXE risks'
        ],
        impact: 'XXE attacks, SSRF, information disclosure.'
      },
      'B324': {
        what: 'Use of insecure hash function hashlib.md5() or hashlib.sha1() detected.',
        why: 'MD5 and SHA1 are cryptographically broken for security purposes.',
        causes: [
          'Password hashing with MD5/SHA1',
          'Checksum generation',
          'Legacy compatibility',
          'Copy-pasted code'
        ],
        impact: 'Password compromise, collision attacks. Use SHA-256+ or bcrypt/argon2.'
      },
      'B501': {
        what: 'SSL/TLS certificate verification disabled (verify=False).',
        why: 'Disabling certificate verification allows man-in-the-middle attacks.',
        causes: [
          'Self-signed certificates',
          'Development shortcuts',
          'Certificate issues ignored',
          'Testing without proper certs'
        ],
        impact: 'Man-in-the-middle attacks, credential theft, data interception.'
      },
      'B502': {
        what: 'SSL/TLS with insecure version (SSLv2, SSLv3, TLSv1.0).',
        why: 'These SSL/TLS versions have known vulnerabilities (POODLE, BEAST, etc.).',
        causes: [
          'Legacy server compatibility',
          'Not specifying minimum TLS version',
          'Outdated SSL configuration',
          'Default settings'
        ],
        impact: 'Encryption downgrade attacks, data interception. Use TLS 1.2+.'
      },
      'B503': {
        what: 'SSL/TLS context with insecure defaults.',
        why: 'Default SSL context may allow insecure protocols or ciphers.',
        causes: [
          'Using default SSLContext',
          'Not configuring minimum version',
          'Legacy compatibility mode',
          'Copy-pasted SSL code'
        ],
        impact: 'Potential encryption weaknesses, man-in-the-middle vulnerabilities.'
      },
      'B506': {
        what: 'Use of yaml.load() without safe_load detected.',
        why: 'yaml.load() can execute arbitrary Python code during parsing.',
        causes: [
          'YAML configuration parsing',
          'Not using safe_load()',
          'Legacy code patterns',
          'Misunderstanding YAML security'
        ],
        impact: 'Remote code execution when loading untrusted YAML. Use yaml.safe_load().'
      },
      'B507': {
        what: 'SSH host key verification disabled.',
        why: 'Disabling host key verification allows man-in-the-middle attacks.',
        causes: [
          'SSH automation without key management',
          'Development shortcuts',
          'AutoAddPolicy misuse',
          'Ignoring security for convenience'
        ],
        impact: 'Man-in-the-middle attacks, credential theft, unauthorized access.'
      },
      'B601': {
        what: 'Use of paramiko with shell command execution detected.',
        why: 'Shell commands via SSH can be exploited if user input is included.',
        causes: [
          'SSH automation',
          'Remote command execution',
          'Not sanitizing input',
          'Building commands dynamically'
        ],
        impact: 'Remote code execution on SSH targets, system compromise.'
      },
      'B602': {
        what: 'Use of subprocess with shell=True detected.',
        why: 'shell=True allows shell injection if user input reaches the command.',
        causes: [
          'Convenience of shell features',
          'Piping/redirection needs',
          'Not using argument lists',
          'Legacy shell script integration'
        ],
        impact: 'Command injection, system compromise. Use shell=False with argument list.'
      },
      'B603': {
        what: 'subprocess call without shell but with potential command injection.',
        why: 'Even without shell=True, improper argument handling can be dangerous.',
        causes: [
          'Dynamic command building',
          'User input in arguments',
          'Not validating input',
          'Complex subprocess usage'
        ],
        impact: 'Command argument injection, unintended command execution.'
      },
      'B604': {
        what: 'Function call with shell=True parameter detected.',
        why: 'Any function accepting shell=True is vulnerable to shell injection.',
        causes: [
          'Helper functions with shell execution',
          'Convenience wrappers',
          'Not understanding risk propagation',
          'Copy-pasted utility code'
        ],
        impact: 'Shell injection via the function, system compromise.'
      },
      'B605': {
        what: 'Starting a process with shell=True detected.',
        why: 'Process creation with shell access is vulnerable to injection.',
        causes: [
          'os.system() usage',
          'Popen with shell=True',
          'Legacy shell integration',
          'Quick command execution'
        ],
        impact: 'Command injection, system compromise. Use subprocess with shell=False.'
      },
      'B607': {
        what: 'Starting a process with partial executable path.',
        why: 'Partial paths can be exploited via PATH manipulation attacks.',
        causes: [
          'Not using absolute paths',
          'Relying on PATH environment',
          'Convenience over security',
          'Copy-pasted command execution'
        ],
        impact: 'Path hijacking, execution of malicious programs.'
      },
      'B608': {
        what: 'SQL injection via string formatting detected.',
        why: 'String formatting in SQL queries allows injection attacks.',
        causes: [
          'f-strings or .format() in SQL',
          'Not using parameterized queries',
          'Quick database code',
          'Legacy SQL patterns'
        ],
        impact: 'SQL injection, data breach, unauthorized access. Use parameterized queries.'
      },
      'B609': {
        what: 'Wildcard injection in subprocess call detected.',
        why: 'Shell wildcards can be exploited to execute unintended files.',
        causes: [
          'Using * in shell commands',
          'Glob patterns in subprocess',
          'Not expanding wildcards safely',
          'Shell command building'
        ],
        impact: 'Unintended file processing, potential code execution.'
      },
      'B610': {
        what: 'Django extra() with raw SQL detected.',
        why: 'extra() allows raw SQL that can be vulnerable to injection.',
        causes: [
          'Complex queries not expressible in ORM',
          'Performance optimization',
          'Legacy Django code',
          'Quick database access'
        ],
        impact: 'SQL injection if user input reaches extra(). Use ORM methods.'
      },
      'B611': {
        what: 'Django RawSQL with potential injection.',
        why: 'RawSQL in Django bypasses ORM protection.',
        causes: [
          'Complex query requirements',
          'Performance needs',
          'Not using parameterization',
          'Direct SQL preference'
        ],
        impact: 'SQL injection, data breach. Use parameterized RawSQL.'
      },
      'B701': {
        what: 'Use of jinja2 with autoescape disabled.',
        why: 'Disabling autoescape enables XSS attacks in templates.',
        causes: [
          'Rendering HTML content',
          'Legacy template settings',
          'Not understanding template security',
          'Convenience over security'
        ],
        impact: 'Cross-site scripting (XSS), session hijacking. Enable autoescape.'
      },
      'B702': {
        what: 'Use of mako templates without proper escaping.',
        why: 'Mako without escaping is vulnerable to XSS.',
        causes: [
          'Default mako settings',
          'Not enabling escaping',
          'Template migration',
          'Copy-pasted template code'
        ],
        impact: 'Cross-site scripting (XSS). Enable default_filters in Mako.'
      },

      // ===== Ruff S-rules (mirror Bandit) =====
      // Note: Ruff S-codes map to Bandit B-codes (S101 = B101, etc.)

      // ===== Pylint Common Rules =====
      'C0103': {
        what: 'Invalid name not conforming to naming convention.',
        why: 'Consistent naming improves code readability and maintainability.',
        causes: [
          'Not following PEP 8 naming',
          'Mixed naming conventions',
          'Quick variable naming',
          'Legacy code patterns'
        ],
        impact: 'Reduced code readability, maintenance difficulty. Follow PEP 8.'
      },
      'C0114': {
        what: 'Missing module docstring.',
        why: 'Module docstrings explain the purpose and usage of the module.',
        causes: [
          'Quick module creation',
          'Not prioritizing documentation',
          'Template without docstrings',
          'Incremental development'
        ],
        impact: 'Poor code documentation, harder onboarding. Add module docstring.'
      },
      'C0115': {
        what: 'Missing class docstring.',
        why: 'Class docstrings explain the class purpose and public interface.',
        causes: [
          'Quick class creation',
          'Not documenting classes',
          'Assuming obvious purpose',
          'Time pressure'
        ],
        impact: 'Poor API documentation, harder maintenance. Add class docstring.'
      },
      'C0116': {
        what: 'Missing function or method docstring.',
        why: 'Function docstrings explain parameters, return values, and exceptions.',
        causes: [
          'Quick function writing',
          'Obvious functions skipped',
          'Not using documentation tools',
          'Time constraints'
        ],
        impact: 'Poor API documentation, maintenance difficulty. Add docstring.'
      },
      'W0611': {
        what: 'Unused import detected.',
        why: 'Unused imports slow startup and clutter the namespace.',
        causes: [
          'Refactoring without cleanup',
          'Copy-pasted code',
          'IDE auto-import leftovers',
          'Commented code removal'
        ],
        impact: 'Slower module loading, namespace pollution. Remove unused imports.'
      },
      'W0612': {
        what: 'Unused variable detected.',
        why: 'Unused variables indicate incomplete code or dead code.',
        causes: [
          'Incomplete implementation',
          'Refactoring leftovers',
          'Copy-pasted code',
          'Debug code not removed'
        ],
        impact: 'Code confusion, potential bugs. Remove or use the variable.'
      },
      'W0613': {
        what: 'Unused argument in function.',
        why: 'Unused arguments may indicate incomplete implementation or API issues.',
        causes: [
          'Interface requirements',
          'Callback signatures',
          'Incomplete implementation',
          'Copy-pasted function signatures'
        ],
        impact: 'API confusion, potential bugs. Use _ prefix for intentionally unused args.'
      },
      'W0621': {
        what: 'Redefining name from outer scope.',
        why: 'Shadowing variables from outer scope causes confusion and bugs.',
        causes: [
          'Common variable names',
          'Not considering scope',
          'Quick variable naming',
          'Nested function issues'
        ],
        impact: 'Unexpected behavior, hard-to-find bugs. Use unique names.'
      },
      'W0622': {
        what: 'Redefining built-in name.',
        why: 'Shadowing built-ins like list, dict, id breaks Python functionality.',
        causes: [
          'Using built-in names as variables',
          'Not knowing all built-ins',
          'Quick naming choices',
          'Copy-pasted code'
        ],
        impact: 'Built-in functionality broken, confusing errors. Rename variable.'
      },
      'E0401': {
        what: 'Unable to import module.',
        why: 'Import errors indicate missing dependencies or incorrect paths.',
        causes: [
          'Missing package installation',
          'Wrong import path',
          'Circular imports',
          'Environment issues'
        ],
        impact: 'Runtime ImportError. Install package or fix import path.'
      },
      'E1101': {
        what: 'Module or class has no member.',
        why: 'Accessing non-existent attributes causes AttributeError at runtime.',
        causes: [
          'Typo in attribute name',
          'Wrong API version',
          'Dynamic attributes not recognized',
          'Incomplete type stubs'
        ],
        impact: 'Runtime AttributeError. Fix typo or check API.'
      },
      'E1120': {
        what: 'No value for required argument in function call.',
        why: 'Missing required arguments cause TypeError at runtime.',
        causes: [
          'API signature change',
          'Missing argument',
          'Copy-pasted incomplete call',
          'Wrong function signature understanding'
        ],
        impact: 'Runtime TypeError. Add missing argument.'
      },
      'R0902': {
        what: 'Too many instance attributes in class.',
        why: 'Classes with many attributes are hard to understand and maintain.',
        causes: [
          'God class anti-pattern',
          'Not splitting responsibilities',
          'Configuration objects growing',
          'Legacy code accumulation'
        ],
        impact: 'Maintenance difficulty, testing complexity. Split into smaller classes.'
      },
      'R0903': {
        what: 'Too few public methods in class.',
        why: 'Classes with few methods might be better as data classes or functions.',
        causes: [
          'Premature class creation',
          'Data container without behavior',
          'Incomplete implementation',
          'Over-engineering'
        ],
        impact: 'Unnecessary complexity. Consider dataclass or named tuple.'
      },
      'R0913': {
        what: 'Too many arguments in function.',
        why: 'Functions with many arguments are hard to use correctly.',
        causes: [
          'Not using configuration objects',
          'Accumulating parameters',
          'Not refactoring',
          'Legacy API design'
        ],
        impact: 'Hard to call correctly, error-prone. Group into config object.'
      },

      // ===== Mypy Error Codes =====
      'error': {
        what: 'Type checking error detected by mypy.',
        why: 'Type errors can cause runtime exceptions or unexpected behavior.',
        causes: [
          'Incorrect type annotations',
          'Type inference issues',
          'API type mismatches',
          'Missing type stubs'
        ],
        impact: 'Potential runtime TypeError. Fix type annotations or add type: ignore.'
      },
      'arg-type': {
        what: 'Argument has incompatible type.',
        why: 'Passing wrong types can cause runtime errors or unexpected behavior.',
        causes: [
          'Wrong value passed',
          'Type conversion needed',
          'API misunderstanding',
          'Refactoring oversight'
        ],
        impact: 'Runtime TypeError or incorrect behavior. Fix argument type.'
      },
      'return-value': {
        what: 'Return type incompatible with declared return type.',
        why: 'Wrong return types break caller expectations.',
        causes: [
          'Incomplete return paths',
          'Wrong value returned',
          'Type annotation mismatch',
          'Conditional return issues'
        ],
        impact: 'Caller may fail with TypeError. Fix return statement or annotation.'
      },
      'assignment': {
        what: 'Incompatible type in assignment.',
        why: 'Assigning wrong type to typed variable causes type inconsistency.',
        causes: [
          'Wrong value assigned',
          'Type narrowing needed',
          'API return type mismatch',
          'Copy-pasted code'
        ],
        impact: 'Type inconsistency, potential runtime errors. Fix assignment.'
      },

      // ===== Ruff/Pycodestyle E-codes (BUG-099 FIX) =====
      'E722': {
        what: 'Using bare `except:` without specifying exception type.',
        why: 'Bare except catches all exceptions including KeyboardInterrupt and SystemExit, making it impossible to cleanly exit the program and hiding real errors.',
        causes: [
          'Quick error handling without thinking about exception types',
          'Copy-pasted error handling code',
          'Not understanding Python exception hierarchy',
          'Defensive programming gone wrong'
        ],
        impact: 'Catches unintended exceptions, hides bugs, prevents clean program exit. Use `except Exception:` at minimum, or catch specific exceptions.'
      },
      'E402': {
        what: 'Module level import not at top of file.',
        why: 'PEP 8 requires all imports at the top of the file for readability and to catch missing dependencies early.',
        causes: [
          'Conditional imports',
          'Circular import workarounds',
          'Late additions to file',
          'Dynamic import patterns'
        ],
        impact: 'Reduced code readability, potential circular import issues. Move imports to top or use lazy imports properly.'
      },
      'E703': {
        what: 'Statement ends with semicolon.',
        why: 'Semicolons are not needed in Python and indicate code copied from other languages.',
        causes: [
          'Code copied from JavaScript/Java/C',
          'Habit from other languages',
          'Multiple statements on one line',
          'Code generation artifacts'
        ],
        impact: 'Unpythonic code, reduced readability. Remove unnecessary semicolons.'
      },
      'E711': {
        what: 'Comparison to None using == instead of is.',
        why: 'None is a singleton in Python, so identity comparison (is) is faster and more correct than equality (==).',
        causes: [
          'Habit from other languages',
          'Not understanding Python identity vs equality',
          'Auto-formatter not configured',
          'Copy-pasted code'
        ],
        impact: 'Potential bugs with objects that override __eq__, slower comparison. Use `is None` or `is not None`.'
      },
      'E712': {
        what: 'Comparison to True/False using == instead of if/if not.',
        why: 'Boolean comparisons should use truthiness testing, not explicit comparison to True/False.',
        causes: [
          'Explicit boolean comparison habit',
          'Not understanding Python truthiness',
          'Defensive coding gone wrong',
          'Code from other languages'
        ],
        impact: 'Unpythonic code, potential bugs with truthy values. Use `if value:` or `if not value:`.'
      },
      'E713': {
        what: 'Test for membership should be `not in`.',
        why: 'Using `not x in y` is less readable than `x not in y`.',
        causes: [
          'Quick coding without review',
          'Not knowing Python operators',
          'Logic order preference',
          'Auto-generated code'
        ],
        impact: 'Reduced readability. Use `x not in y` instead of `not x in y`.'
      },
      'E741': {
        what: 'Ambiguous variable name (l, O, I).',
        why: 'Single letters l, O, I look like numbers 1 and 0 in many fonts, causing confusion.',
        causes: [
          'Quick variable naming',
          'Mathematical notation habits',
          'Loop counter conventions',
          'Legacy code'
        ],
        impact: 'Code confusion, potential bugs. Use descriptive names like `length`, `output`, `index`.'
      },

      // ===== Ruff/Pyflakes F-codes (BUG-099 FIX) =====
      'F401': {
        what: 'Module imported but unused.',
        why: 'Unused imports slow down module loading, clutter the namespace, and indicate dead code.',
        causes: [
          'Removed code that used the import',
          'Copy-pasted imports from elsewhere',
          'IDE auto-import not cleaned up',
          'Planning to use but forgot'
        ],
        impact: 'Slower startup, namespace pollution, code confusion. Remove unused import or add `# noqa: F401` if intentional re-export.'
      },
      'F403': {
        what: 'Using `from module import *` which imports undefined names.',
        why: 'Star imports pollute the namespace and make it impossible to know where names come from.',
        causes: [
          'Quick import shortcut',
          'Copy-pasted code',
          'Not knowing explicit import practice',
          'Legacy code patterns'
        ],
        impact: 'Namespace pollution, name conflicts, unclear code origin. Use explicit imports: `from module import name1, name2`.'
      },
      'F405': {
        what: 'Name may be undefined or defined from star imports.',
        why: 'Star imports make it impossible to statically determine where a name comes from.',
        causes: [
          'Using names from star import',
          'Dynamic module loading',
          'Typo in name',
          'Missing explicit import'
        ],
        impact: 'Potential NameError at runtime, unclear code. Use explicit imports.'
      },
      'F811': {
        what: 'Redefinition of unused name from line N.',
        why: 'Redefining a name that was never used indicates dead code or a bug.',
        causes: [
          'Duplicate import statements',
          'Variable assigned twice',
          'Copy-pasted code blocks',
          'Refactoring leftovers'
        ],
        impact: 'Dead code, potential bugs. Remove the unused first definition.'
      },
      'F841': {
        what: 'Local variable assigned but never used.',
        why: 'Unused variables indicate incomplete code, dead code, or a bug.',
        causes: [
          'Variable intended for later use',
          'Debug code not removed',
          'Refactoring leftovers',
          'Copy-pasted code not adapted'
        ],
        impact: 'Dead code, potential bugs. Remove variable or use `_` prefix for intentionally unused.'
      },
      'F601': {
        what: 'Dictionary key repeated in literal.',
        why: 'Duplicate keys in dict literals silently overwrite earlier values, causing data loss.',
        causes: [
          'Copy-paste error',
          'Merge conflict not resolved',
          'Large dict literal maintenance',
          'Auto-generated code'
        ],
        impact: 'Silent data loss, bugs. Remove duplicate key or fix key name.'
      }
    };

    // Normalize rule name - remove duplicate suffix (e.g., "command-injection.command-injection" → "command-injection")
    let normalizedRule = rule;
    const parts = rule.split('.');
    if (parts.length >= 2 && parts[parts.length - 1] === parts[parts.length - 2]) {
      // Remove duplicate suffix
      normalizedRule = parts.slice(0, -1).join('.');
    }

    // Try exact match with normalized rule
    if (descriptions[normalizedRule]) {
      return descriptions[normalizedRule];
    }

    // Try exact match with original rule
    if (descriptions[rule]) {
      return descriptions[rule];
    }

    // Try case-insensitive match
    const ruleLower = normalizedRule.toLowerCase();
    const matchingKey = Object.keys(descriptions).find(key => key.toLowerCase() === ruleLower);
    if (matchingKey) {
      return descriptions[matchingKey];
    }

    // BUG-098 FIX: Map Ruff S-codes to Bandit B-codes (S101 → B101, etc.)
    // Ruff's S-rules are direct equivalents of Bandit's B-rules
    const ruffToBanditMatch = rule.match(/^S(\d{3})$/);
    if (ruffToBanditMatch) {
      const banditCode = `B${ruffToBanditMatch[1]}`;
      if (descriptions[banditCode]) {
        console.log(`[BUG-098] Mapped Ruff ${rule} to Bandit ${banditCode}`);
        return descriptions[banditCode];
      }
    }

    // BUG-098 FIX: Extract rule code from tool-prefixed rules
    // E.g., "ruff:S101" → "S101" → "B101", "bandit:B602" → "B602"
    const toolPrefixMatch = rule.match(/^(?:ruff|bandit|pylint|mypy):(.+)$/i);
    if (toolPrefixMatch) {
      const bareRule = toolPrefixMatch[1];
      if (descriptions[bareRule]) {
        return descriptions[bareRule];
      }
      // Try S-code to B-code mapping for ruff
      const sCodeMatch = bareRule.match(/^S(\d{3})$/);
      if (sCodeMatch) {
        const banditCode = `B${sCodeMatch[1]}`;
        if (descriptions[banditCode]) {
          return descriptions[banditCode];
        }
      }
    }

    // BUG FIX #55 & #56: Smart fallback logic for common patterns
    const ruleText = rule.toLowerCase();

    // SQL Injection patterns
    if (ruleText.includes('sql') || ruleText.includes('injection')) {
      return {
        what: `SQL query is constructed using string concatenation with user input (Rule: ${rule}), allowing SQL injection attacks.`,
        why: 'Attackers can inject malicious SQL code to bypass authentication, extract sensitive data, modify or delete database records, and potentially gain complete database access.',
        causes: [
          'Direct string concatenation instead of parameterized queries',
          'Not using PreparedStatement or ORM with parameter binding',
          'Trusting user input without validation',
          'Legacy code using string-based SQL construction'
        ],
        impact: 'Complete database compromise, data breaches affecting customer data, compliance violations (GDPR, SOC2, PCI-DSS), financial losses, and reputational damage. This is OWASP Top 10 #1 vulnerability.'
      };
    }

    // CVE (Dependency vulnerabilities) - BUG-092 FIX: Added pip-audit, safety, npm-audit, yarn-audit
    // BUG-099 FIX: Use actual vulnerability message for specific details
    // BUG-100 FIX: Detect vulnerability TYPE and generate accurate impact descriptions
    const toolLowerForDeps = tool.toLowerCase();
    const isDependencyTool = ['dependency-check', 'pip-audit', 'safety', 'npm-audit', 'yarn-audit', 'bundler-audit'].includes(toolLowerForDeps);
    if (ruleText.startsWith('cve-') || ruleText.includes('vulnerability') || isDependencyTool) {
      const cveMatch = rule.match(/CVE-(\d{4})-(\d+)/i);
      const year = cveMatch ? cveMatch[1] : 'unknown';
      const toolDescription = toolLowerForDeps === 'pip-audit' ? 'Python package'
        : toolLowerForDeps === 'safety' ? 'Python dependency'
          : toolLowerForDeps === 'npm-audit' ? 'Node.js package'
            : toolLowerForDeps === 'yarn-audit' ? 'Yarn package'
              : toolLowerForDeps === 'bundler-audit' ? 'Ruby gem'
                : 'dependency';

      // BUG-099 FIX: Extract specific vulnerability details from message
      let whatText: string;
      if (message && message.length > 20) {
        const cleanMessage = message.replace(/\n/g, ' ').trim();
        whatText = `**Vulnerability Details**: ${cleanMessage}`;
      } else if (cveMatch) {
        whatText = `Known security vulnerability ${rule} in ${toolDescription}. This vulnerability was publicly disclosed in ${year} and has known exploits.`;
      } else {
        whatText = `Security vulnerability detected in ${toolDescription} by ${tool}. Rule: ${rule}`;
      }

      // BUG-100 FIX: Detect vulnerability type from message and generate accurate descriptions
      const msgLower = (message || '').toLowerCase();
      const vulnType = this.detectVulnerabilityType(msgLower);
      const typeSpecificInfo = this.getVulnerabilityTypeInfo(vulnType, severity);

      return {
        what: whatText,
        why: typeSpecificInfo.why,
        causes: [
          'Using outdated dependency versions with known vulnerabilities',
          'Not regularly updating dependencies (should be weekly/monthly)',
          'Lack of automated dependency scanning in CI/CD pipeline',
          'Delayed security patch application',
          'Using abandoned or unmaintained packages'
        ],
        impact: typeSpecificInfo.impact
      };
    }

    // Command Injection patterns
    if (ruleText.includes('command') || ruleText.includes('exec') || ruleText.includes('process')) {
      return {
        what: `User-controlled input is passed to system command execution (Rule: ${rule}), enabling command injection attacks.`,
        why: 'Attackers can inject malicious shell commands that execute with application privileges, compromising the entire server.',
        causes: [
          'Concatenating user input into shell commands',
          'Not using safe command execution APIs',
          'Missing input validation and sanitization',
          'Trusting data from external sources'
        ],
        impact: 'Complete system compromise, unauthorized data access, malware installation, lateral movement to other systems, and potential supply chain attacks. OWASP Top 10 A03:2021 (Injection).'
      };
    }

    // XSS patterns
    if (ruleText.includes('xss') || ruleText.includes('cross-site')) {
      return {
        what: `User input is rendered in HTML without proper encoding (Rule: ${rule}), allowing cross-site scripting (XSS) attacks.`,
        why: 'Attackers can inject malicious JavaScript that executes in victims\' browsers, stealing session cookies, credentials, or performing actions on behalf of users.',
        causes: [
          'Not escaping user input before rendering',
          'Using dangerous HTML manipulation methods (innerHTML, etc.)',
          'Client-side template injection',
          'Trusting user-generated content'
        ],
        impact: 'Session hijacking, credential theft, malware distribution, defacement, and phishing attacks. OWASP Top 10 A03:2021 (Injection).'
      };
    }

    // Path Traversal
    if (ruleText.includes('path') || ruleText.includes('traversal') || ruleText.includes('directory')) {
      return {
        what: `File paths are constructed using unsanitized user input (Rule: ${rule}), enabling directory traversal attacks.`,
        why: 'Attackers can access files outside the intended directory using "../" sequences to read sensitive configuration files, credentials, or source code.',
        causes: [
          'Direct concatenation of user input into file paths',
          'Missing path canonicalization',
          'No whitelist validation of allowed paths',
          'Trusting client-provided filenames'
        ],
        impact: 'Exposure of sensitive files (/etc/passwd, database credentials, API keys), source code leaks, and potential remote code execution when combined with file upload.'
      };
    }

    // Weak Crypto
    if (ruleText.includes('crypto') || ruleText.includes('cipher') || ruleText.includes('hash') || ruleText.includes('md5') || ruleText.includes('sha1')) {
      return {
        what: `Using weak or deprecated cryptographic algorithms (Rule: ${rule}) that can be broken with modern computing power.`,
        why: 'Modern hardware and cloud computing make it trivial to break weak encryption (DES, MD5, SHA1) in minutes to hours.',
        causes: [
          'Using outdated cryptographic libraries',
          'Copy-pasted code from old examples',
          'Lack of cryptography expertise',
          'Not following current security standards (NIST, OWASP)'
        ],
        impact: 'Data confidentiality breach, password cracking, authentication bypass, compliance violations (PCI-DSS requires AES-256), and regulatory fines.'
      };
    }

    // Logging/Performance
    if (ruleText.includes('log') || ruleText.includes('guard') || ruleText.includes('performance')) {
      return {
        what: `Log statements perform expensive operations unconditionally (Rule: ${rule}), even when logging is disabled.`,
        why: 'String concatenation, object serialization, and toString() calls consume CPU cycles regardless of log level, impacting application performance.',
        causes: [
          'Direct string concatenation in log statements',
          'Not checking isDebugEnabled() before expensive operations',
          'Complex object toString() in log parameters',
          'Lack of awareness about logging performance impact'
        ],
        impact: 'Unnecessary CPU overhead (5-15% in high-throughput systems), increased garbage collection, reduced throughput, higher cloud costs, and poor scalability under load.'
      };
    }

    // BUG-098 FIX: Python-specific pattern matching (before generic fallback)
    const toolLower = tool.toLowerCase();
    const isPythonTool = ['bandit', 'ruff', 'pylint', 'mypy', 'flake8', 'pip-audit', 'safety'].includes(toolLower);

    // Pickle/deserialization patterns
    if (ruleText.includes('pickle') || ruleText.includes('marshal') || ruleText.includes('deserialize')) {
      return {
        what: `Unsafe deserialization detected (Rule: ${rule}). Pickle and similar serializers can execute arbitrary code.`,
        why: 'Deserializing untrusted data can lead to remote code execution. Pickle is particularly dangerous as it can execute arbitrary Python code during unpickling.',
        causes: [
          'Using pickle/marshal for data exchange',
          'Loading serialized data from untrusted sources',
          'Caching with pickle without validation',
          'Inter-process communication using pickle'
        ],
        impact: 'Remote code execution, complete system compromise. Use JSON, MessagePack, or other safe serialization formats.'
      };
    }

    // YAML unsafe load patterns
    if (ruleText.includes('yaml') && (ruleText.includes('load') || ruleText.includes('unsafe'))) {
      return {
        what: `Unsafe YAML loading detected (Rule: ${rule}). yaml.load() can execute arbitrary Python code.`,
        why: 'YAML\'s default loader can instantiate arbitrary Python objects, leading to code execution when loading untrusted YAML.',
        causes: [
          'Using yaml.load() instead of yaml.safe_load()',
          'Processing YAML from user input or external sources',
          'Configuration files from untrusted sources',
          'Legacy code patterns'
        ],
        impact: 'Remote code execution when loading malicious YAML. Always use yaml.safe_load() or yaml.SafeLoader.'
      };
    }

    // Eval/exec patterns (Python specific)
    if (isPythonTool && (ruleText.includes('eval') || ruleText.includes('exec'))) {
      return {
        what: `Use of eval() or exec() detected (Rule: ${rule}). These functions execute arbitrary Python code.`,
        why: 'eval() and exec() can execute any Python code, making them extremely dangerous if user input reaches them.',
        causes: [
          'Dynamic code execution requirements',
          'Processing mathematical expressions unsafely',
          'Configuration evaluation',
          'Template rendering with code execution'
        ],
        impact: 'Remote code execution, complete system compromise. Use ast.literal_eval() for safe evaluation of literals.'
      };
    }

    // Subprocess/shell patterns (Python specific)
    if (isPythonTool && (ruleText.includes('subprocess') || ruleText.includes('shell') || ruleText.includes('popen'))) {
      return {
        what: `Potentially unsafe subprocess execution detected (Rule: ${rule}). Shell commands can be vulnerable to injection.`,
        why: 'Using shell=True or building commands from user input allows command injection attacks.',
        causes: [
          'Using shell=True for convenience',
          'Building commands with string concatenation',
          'Not using argument lists',
          'Processing user input in commands'
        ],
        impact: 'Command injection, system compromise. Use shell=False and pass arguments as a list.'
      };
    }

    // SSL/TLS patterns
    if (ruleText.includes('ssl') || ruleText.includes('tls') || ruleText.includes('certificate') || ruleText.includes('verify')) {
      return {
        what: `SSL/TLS security issue detected (Rule: ${rule}). Certificate verification may be disabled or insecure protocols used.`,
        why: 'Disabling certificate verification or using outdated TLS versions allows man-in-the-middle attacks.',
        causes: [
          'Disabling verify for self-signed certs',
          'Using outdated SSL/TLS versions',
          'Development shortcuts in production',
          'Legacy system compatibility'
        ],
        impact: 'Man-in-the-middle attacks, credential theft, data interception. Use TLS 1.2+ and proper certificate validation.'
      };
    }

    // Assert pattern (Python specific)
    if (isPythonTool && ruleText.includes('assert')) {
      return {
        what: `Use of assert statement detected (Rule: ${rule}). Assert statements are removed with Python optimization.`,
        why: 'Assert statements are compiled out when running Python with -O flag, potentially bypassing security checks.',
        causes: [
          'Using assert for input validation',
          'Security checks with assert',
          'Misunderstanding assert purpose',
          'Quick validation shortcuts'
        ],
        impact: 'Security checks bypassed in optimized Python. Use if/raise for production validation.'
      };
    }

    // Hardcoded credentials (general)
    if (ruleText.includes('hardcoded') || ruleText.includes('password') || ruleText.includes('secret') || ruleText.includes('credential')) {
      return {
        what: `Hardcoded credentials or secrets detected (Rule: ${rule}). Secrets should not be in source code.`,
        why: 'Hardcoded credentials are exposed in version control, code reviews, and can be extracted from binaries.',
        causes: [
          'Development shortcuts',
          'Quick testing with real credentials',
          'Not using environment variables',
          'Lack of secrets management'
        ],
        impact: 'Credential theft, unauthorized access, data breaches. Use environment variables or secret managers.'
      };
    }

    // Random/crypto patterns
    if (ruleText.includes('random') && !ruleText.includes('secure')) {
      return {
        what: `Use of non-cryptographic random detected (Rule: ${rule}). The random module is predictable.`,
        why: 'The random module uses a predictable PRNG and should never be used for security purposes.',
        causes: [
          'Generating tokens with random',
          'Creating passwords or secrets',
          'Session ID generation',
          'Not knowing about secrets module'
        ],
        impact: 'Predictable tokens, session hijacking, authentication bypass. Use secrets module for cryptographic randomness.'
      };
    }

    // Unused imports/variables (code quality)
    if (ruleText.includes('unused') || ruleText.includes('import') && ruleText.includes('not used')) {
      return {
        what: `Unused code detected (Rule: ${rule}). Unused imports or variables clutter the codebase.`,
        why: 'Unused code increases maintenance burden, slows module loading, and can indicate incomplete refactoring.',
        causes: [
          'Refactoring without cleanup',
          'Copy-pasted code',
          'IDE auto-import leftovers',
          'Abandoned code paths'
        ],
        impact: 'Code clutter, slower imports, maintenance confusion. Remove unused code.'
      };
    }

    // Type error patterns
    if (ruleText.includes('type') && (ruleText.includes('error') || ruleText.includes('incompatible') || ruleText.includes('mismatch'))) {
      return {
        what: `Type error detected (Rule: ${rule}). The code has type inconsistencies that may cause runtime errors.`,
        why: 'Type errors indicate potential runtime failures when wrong types are passed or returned.',
        causes: [
          'Incorrect type annotations',
          'API misuse',
          'Refactoring without updating types',
          'Missing type conversions'
        ],
        impact: 'Potential runtime TypeError or unexpected behavior. Fix type annotations or add proper type handling.'
      };
    }

    // SESSION 26: Check rule-descriptions.ts before falling back to fully generic text
    // This provides better specific guidance for known rules
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { getRuleDescription, RULE_DESCRIPTIONS } = require('../config/rule-descriptions');
      const ruleDesc = RULE_DESCRIPTIONS[rule];
      if (ruleDesc) {
        return {
          what: ruleDesc.description || `This issue was detected by ${tool}. Rule: ${rule}`,
          why: ruleDesc.why || 'This pattern can impact code quality or maintainability.',
          causes: ruleDesc.causes || ['Common code pattern that may need attention'],
          impact: severity === 'critical' || severity === 'high'
            ? 'Should be reviewed and addressed to maintain code quality.'
            : 'May contribute to technical debt. Consider addressing during regular maintenance.'
        };
      }
    } catch (e) {
      // Fall through to generic if rule-descriptions not available
    }

    // Generic description based on tool and severity (last resort)
    const genericWhat = `This issue was detected by ${tool} as a ${severity} severity problem. Rule: ${rule}`;
    const genericWhy = severity === 'critical' || severity === 'high'
      ? 'This pattern can lead to bugs or system issues.'
      : 'This pattern can lead to technical debt or maintenance issues.';
    const genericCauses = [
      `Code pattern flagged by ${tool}`,
      'May need refactoring or review'
    ];
    const genericImpact = severity === 'critical' || severity === 'high'
      ? 'Should be reviewed and addressed before deployment.'
      : 'Consider addressing to improve code quality.';

    return {
      what: genericWhat,
      why: genericWhy,
      causes: genericCauses,
      impact: genericImpact
    };
  }

  /**
   * BUG FIX #65: Generate generic fix guidance when AI enrichment is not available
   */
  private getGenericFixGuidance(rule: string, tool: string, severity: string): string {
    const ruleLower = rule.toLowerCase();
    const toolLower = tool.toLowerCase();

    // SQL Injection
    if (ruleLower.includes('sql') || ruleLower.includes('injection')) {
      return `**Fix Strategy**:
1. Replace string concatenation with PreparedStatement:
   \`\`\`java
   // Before: "SELECT * FROM users WHERE id = '" + userId + "'"
   PreparedStatement stmt = conn.prepareStatement("SELECT * FROM users WHERE id = ?");
   stmt.setString(1, userId);
   \`\`\`
2. Use ORM frameworks (JPA, Hibernate) with parameter binding
3. Validate and sanitize all user input
4. Never trust external data sources`;
    }

    // CVE/Dependency issues - BUG-092 FIX: Added pip-audit, safety, npm-audit, yarn-audit
    const depTools = ['dependency-check', 'pip-audit', 'safety', 'npm-audit', 'yarn-audit', 'bundler-audit'];
    if (ruleLower.startsWith('cve-') || ruleLower.includes('vulnerability') || depTools.includes(toolLower)) {
      const cveMatch = rule.match(/CVE-(\d{4})-(\d+)/i);
      const cveId = cveMatch ? `${cveMatch[0]}` : rule;

      // Language-specific update commands
      let updateCommands = '';
      if (toolLower === 'pip-audit' || toolLower === 'safety') {
        updateCommands = `
3. **Python**: Update in requirements.txt and run:
   \`\`\`bash
   pip install --upgrade <package-name>
   pip-audit --fix  # Auto-fix with pip-audit
   \`\`\``;
      } else if (toolLower === 'npm-audit' || toolLower === 'yarn-audit') {
        updateCommands = `
3. **Node.js**: Update in package.json and run:
   \`\`\`bash
   npm audit fix
   npm update <package-name>
   \`\`\``;
      } else if (toolLower === 'bundler-audit') {
        updateCommands = `
3. **Ruby**: Update in Gemfile and run:
   \`\`\`bash
   bundle update <gem-name>
   \`\`\``;
      } else {
        updateCommands = `
3. **Java**: Run:
   \`\`\`bash
   mvn versions:display-dependency-updates
   gradle dependencyUpdates
   \`\`\``;
      }

      return `**Fix Strategy**:
1. Update the vulnerable dependency to the latest patched version
2. Check [NVD database](https://nvd.nist.gov/vuln/detail/${cveId}) for official patch information${updateCommands}
4. Test thoroughly after updating to ensure compatibility
5. Add automated dependency scanning to CI/CD pipeline`;
    }

    // Logging/Performance
    if (ruleLower.includes('log') || ruleLower.includes('guard')) {
      return `**Fix Strategy**:
1. Guard log statements with level checks:
   \`\`\`java
   // Before: logger.debug("User: " + user.toString());
   if (logger.isDebugEnabled()) {
       logger.debug("User: {}", user);  // Use parameterized logging
   }
   \`\`\`
2. Use SLF4J parameterized logging to avoid unnecessary string concatenation
3. Avoid calling expensive methods (toString(), JSON serialization) in log statements
4. Consider using structured logging for production`;
    }

    // Command Injection
    if (ruleLower.includes('command') || ruleLower.includes('exec') || ruleLower.includes('process')) {
      return `**Fix Strategy**:
1. Use ProcessBuilder with argument arrays (prevents injection):
   \`\`\`java
   // Before: Runtime.exec("ls " + userInput);
   ProcessBuilder pb = new ProcessBuilder("ls", userInput);
   \`\`\`
2. Validate input against a whitelist of allowed values
3. Avoid shell invocation entirely - use Java APIs instead
4. Never concatenate user input into command strings`;
    }

    // BUG FIX #74: Add specific guidance for common PMD rules
    // System.out.println
    if (ruleLower.includes('systemprintln') || ruleLower.includes('system.out')) {
      return `**Fix Strategy**:
1. Replace System.out with proper logging:
   \`\`\`java
   // Before: System.out.println("User logged in: " + userId);
   private static final Logger logger = LoggerFactory.getLogger(MyClass.class);
   logger.info("User logged in: {}", userId);
   \`\`\`
2. Use SLF4J with Logback or Log4j2 backend
3. Configure log levels (DEBUG, INFO, WARN, ERROR) in application.properties
4. Use parameterized logging (\`{}\`) to avoid string concatenation`;
    }

    // AvoidThrowingRawExceptionTypes
    if (ruleLower.includes('avoidthrowingrawexceptiontypes') || ruleLower.includes('raw') && ruleLower.includes('exception')) {
      return `**Fix Strategy**:
1. Create specific exception classes:
   \`\`\`java
   // Before: throw new Exception("Invalid user input");
   public class InvalidUserInputException extends Exception {
       public InvalidUserInputException(String message) { super(message); }
   }
   throw new InvalidUserInputException("Invalid user input");
   \`\`\`
2. Extend appropriate base classes (IllegalArgumentException, IOException, etc.)
3. Use unchecked exceptions (RuntimeException) for programming errors
4. Use checked exceptions for recoverable errors`;
    }

    // AvoidReassigningParameters
    if (ruleLower.includes('avoidreassigningparameters') || ruleLower.includes('reassign')) {
      return `**Fix Strategy**:
1. Create a local variable instead of modifying parameter:
   \`\`\`java
   // Before: 
   public void process(String input) {
       input = input.trim();  // ❌ Reassigning parameter
   }
   // After:
   public void process(String input) {
       String trimmedInput = input.trim();  // ✅ Local variable
   }
   \`\`\`
2. Treat method parameters as final (even if not declared as such)
3. Use descriptive names for local variables
4. Consider making parameters explicitly \`final\``;
    }

    // PMD generic (for other rules)
    if (toolLower === 'pmd') {
      return `**Fix Strategy**:
1. Review [PMD documentation](https://pmd.github.io/latest/pmd_rules_java.html) for rule: \`${rule}\`
2. Refactor code to follow Java best practices
3. Consider using IDE auto-fix features (IntelliJ, Eclipse, VS Code with PMD plugin)
4. Run \`mvn pmd:check\` locally before committing`;
    }

    // CheckStyle
    if (toolLower === 'checkstyle') {
      return `**Fix Strategy**:
1. Use IDE auto-formatting (IntelliJ: Ctrl+Alt+L, VS Code: Shift+Alt+F)
2. Apply Checkstyle auto-fixes:
   \`\`\`bash
   mvn checkstyle:check
   mvn spotless:apply  # Auto-fix formatting
   \`\`\`
3. Configure IDE to use Google Java Style Guide or project-specific style
4. Enable "Format on Save" in IDE settings`;
    }

    // SpotBugs
    if (toolLower === 'spotbugs') {
      return `**Fix Strategy**:
1. Review [SpotBugs bug descriptions](https://spotbugs.readthedocs.io/en/stable/bugDescriptions.html)
2. Refactor code to address the specific bug pattern
3. Use IDE plugins (IntelliJ SpotBugs plugin) for inline suggestions
4. Run \`mvn spotbugs:check\` to verify fix`;
    }

    // BUG FIX #74: Add specific guidance for common Semgrep security rules
    // XSS patterns
    if (ruleLower.includes('xss') || ruleLower.includes('cross-site')) {
      return `**Fix Strategy**:
1. Escape all user input before rendering in HTML:
   \`\`\`java
   // Before: response.getWriter().write(userInput);
   response.getWriter().write(StringEscapeUtils.escapeHtml4(userInput));
   // Or use OWASP ESAPI: ESAPI.encoder().encodeForHTML(userInput)
   \`\`\`
2. Use templating engines that auto-escape by default (Thymeleaf, Freemarker with auto-escaping)
3. Implement Content Security Policy (CSP) headers
4. Never use dangerous methods like \`innerHTML\` with untrusted data`;
    }

    // Weak Random
    if (ruleLower.includes('weak-random') || ruleLower.includes('random')) {
      return `**Fix Strategy**:
1. Replace \`java.util.Random\` with \`SecureRandom\` for security-sensitive operations:
   \`\`\`java
   // Before: new Random().nextInt()
   SecureRandom secureRandom = new SecureRandom();
   int randomValue = secureRandom.nextInt();
   \`\`\`
2. Use \`SecureRandom\` for: session IDs, CSRF tokens, password reset tokens, encryption keys
3. Use \`Random\` only for non-security purposes (games, testing, simulations)
4. Consider using \`UUID.randomUUID()\` for unique identifiers`;
    }

    // Path Traversal
    if (ruleLower.includes('path') || ruleLower.includes('traversal')) {
      return `**Fix Strategy**:
1. Canonicalize and validate file paths:
   \`\`\`java
   // Before: new File(baseDir + "/" + userInput);
   Path basePath = Paths.get(baseDir).toRealPath();
   Path requestedPath = basePath.resolve(userInput).normalize().toRealPath();
   if (!requestedPath.startsWith(basePath)) {
       throw new SecurityException("Path traversal attempt detected");
   }
   \`\`\`
2. Use whitelist validation for allowed file names
3. Never concatenate user input directly into file paths
4. Restrict file operations to specific directories`;
    }

    // Semgrep generic (for other security rules)
    if (toolLower === 'semgrep') {
      return `**Fix Strategy**:
1. Review [Semgrep rule documentation](https://semgrep.dev/r) for rule: \`${rule}\`
2. Follow OWASP guidelines for the specific vulnerability type
3. Use secure coding practices and security-focused code reviews
4. Consider using Semgrep in CI/CD to prevent regressions`;
    }

    // Generic fallback
    return `**Fix Strategy**:
1. Review the issue description and understand the root cause
2. Consult official documentation for ${tool} rule: \`${rule}\`
3. Refactor code following best practices for ${severity} severity issues
4. Test thoroughly to ensure the fix doesn't introduce regressions
5. Consider using IDE plugins for ${tool} to get inline suggestions`;
  }

  /**
   * Generate group section
   * Phase D: Enhanced with user-friendly titles and descriptions
   */
  private async generateGroupSection(
    group: IssueGroup,
    allIssues: EnrichedIssue[],
    expanded: boolean,
    ideFixFiles?: IDEFixFile[]
  ): Promise<string> {
    const severityIcon = {
      critical: '🔴',
      high: '🟠',
      medium: '🟡',
      low: '🟢'
    }[group.severity];

    const groupIssues = allIssues.filter(i =>
      i.rule === group.rule && i.tool === group.tool && i.severity === group.severity
    );

    const representative = groupIssues[0];
    const canAutoFix = this.canAutoFix(group);
    let alreadyShowedAICode = false; // BUG FIX: Track if we showed AI code to avoid duplication

    // Phase D: User-friendly title
    const friendlyTitle = this.getUserFriendlyTitle(group.rule, group.tool);

    // BUG #89 FIX: Use AI-enriched structured description when available
    // Try to find an issue with AI-enriched issueDescription (prefer issues with code snippets)
    const representativeWithAI = groupIssues.find(i => i.fixSuggestion?.issueDescription) || representative;
    let issueDesc: { what: string; why: string; causes: string[]; impact: string };

    if (representativeWithAI?.fixSuggestion?.issueDescription) {
      // Use AI-generated structured description
      // BUG-102 FIX: Ensure all fields exist with defaults to prevent forEach crash
      const aiDesc = representativeWithAI.fixSuggestion.issueDescription;
      issueDesc = {
        what: aiDesc.what || 'Issue detected by automated analysis.',
        why: aiDesc.why || 'This issue may impact code quality, security, or maintainability.',
        causes: Array.isArray(aiDesc.causes) ? aiDesc.causes : ['Automated analysis detected a potential issue'],
        impact: aiDesc.impact || 'May affect code quality or application behavior.'
      };
      console.log(`[BUG #89] Using AI-enriched description for ${group.rule}`);
    } else {
      // Fallback to hardcoded database
      // BUG-099 FIX: Pass actual message for specific vulnerability details
      const representativeMessage = representative?.message || group.description;
      issueDesc = this.getIssueDescription(group.rule, group.tool, group.severity, representativeMessage);
      console.log(`[BUG #89] Using fallback description for ${group.rule}`);
    }

    let section = `### ${severityIcon} ${friendlyTitle}\n\n`;

    // Phase D: Quick metadata bar
    section += `**Severity**: ${group.severity.toUpperCase()} | `;
    section += `**Tool**: ${group.tool} | `;
    section += `**Found in**: ${group.count} files | `;
    section += `**Category**: ${representative?.category || group.category}`;

    // SESSION 24: Remove individual auto-fix links to emphasize 1-click solution
    // Auto-fix availability is shown in the IDE Integration section at the end

    section += '\n\n';
    section += '---\n\n';

    // Phase D: Comprehensive description
    section += `#### 📋 What is this issue?\n\n`;
    section += `${issueDesc.what}\n\n`;

    section += `#### 🎯 Why does it matter?\n\n`;
    section += `${issueDesc.why}\n\n`;

    section += `#### 🔍 Common causes:\n\n`;
    issueDesc.causes.forEach(cause => {
      section += `- ${cause}\n`;
    });
    section += '\n';

    section += `#### ⚠️ Impact if not fixed:\n\n`;
    section += `${issueDesc.impact}\n\n`;

    // Phase E: Category-specific enhancements
    const detectedCategory = this.detectCategory(group.rule, group.tool, representative?.message || group.description);
    // ENHANCEMENT #1: Pass rule name for rule-specific risk adjustments (e.g., GuardLogStatement → MEDIUM)
    const riskLevel = this.calculateRiskLevel(detectedCategory, group.severity, group.rule);
    const categoryContext = this.getCategoryContext(detectedCategory, group.severity);
    const priorityGuidance = this.getPriorityGuidance(detectedCategory, group.severity, group.count, riskLevel.level);

    // Phase E: Risk Assessment
    section += `#### ${riskLevel.emoji} Risk Assessment\n\n`;
    // Avoid confusion with severity: explicitly label as risk
    section += `**Overall Risk**: ${riskLevel.color} **${riskLevel.level}**\n\n`;
    section += `${riskLevel.description}\n\n`;

    section += `**Category**: ${detectedCategory}  \n`;
    section += `**Focus**: ${categoryContext.focus}\n\n`;

    // NOTE: Business Impact, Action Plan, and Resources are now in the standalone 
    // "Business Impact Analysis" section at the report level (not per-issue)

    // BUG FIX #30: Improved code example section with smart file selection
    // Prefer issues with actual extractable code over generated files (JMH benchmarks, etc.)
    let exampleIssue: EnrichedIssue | undefined = representative;

    // First, try to find an issue with an existing snippet
    if (!exampleIssue?.snippet || exampleIssue.snippet === 'N/A' || exampleIssue.snippet.trim().length === 0) {
      exampleIssue = groupIssues.find(i => i.snippet && i.snippet !== 'N/A' && i.snippet.trim().length > 0) || exampleIssue;
    }

    // If still no snippet, try to find a real source file (not generated)
    if (!exampleIssue?.snippet || exampleIssue.snippet === 'N/A' || exampleIssue.snippet.trim().length === 0) {
      // Prefer files that are likely to exist (not JMH benchmarks, not generated)
      exampleIssue = groupIssues.find(i =>
        i.file && i.line &&
        !i.file.includes('_jmhTest') &&
        !i.file.includes('generated')
      ) || groupIssues.find(i => !!i.file && !!i.line) || representative;
    }

    if (exampleIssue?.file) {
      section += `#### 📍 Representative Example\n\n`;

      // BUG FIX #41: Find full path if we only have filename
      let displayPath = exampleIssue.file;

      // Strip /workspace/ prefix if present
      if (displayPath.startsWith('/workspace/')) {
        displayPath = displayPath.replace('/workspace/', '');
      } else if (displayPath.startsWith('workspace/')) {
        displayPath = displayPath.replace('workspace/', '');
      }

      // If we only have filename (no path separator), try to find full path
      if (!displayPath.includes('/')) {
        const fullPath = await this.findFullPath(displayPath);
        if (fullPath) {
          displayPath = fullPath;
        }
      }

      section += `**Location**: \`${displayPath}\``;
      if (exampleIssue.line) {
        section += ` (Line ${exampleIssue.line})`;
      }
      section += '\n\n';

      // BUG FIX #24: Try to get snippet - use existing or extract on-the-fly
      let snippet = exampleIssue.snippet;
      if ((!snippet || snippet === 'N/A' || snippet.trim().length === 0) && exampleIssue.file && exampleIssue.line) {
        // Extract snippet dynamically with full path
        try {
          const { CodeSnippetExtractor } = await import('../utils/code-snippet-extractor');
          const path = await import('path');

          // BUG FIX #41: Use the same normalized path for extraction
          const relativePath = displayPath;

          // Build full file path if repoPath is available
          const fullPath = this.repoPath ? path.join(this.repoPath, relativePath) : relativePath;
          // SESSION 74: Try local file first, then GitHub API fallback
          snippet = await CodeSnippetExtractor.extractSnippet(
            fullPath,
            exampleIssue.line,
            3,
            this.repositoryUrl  // GitHub fallback URL
          ) || undefined;

          if (!snippet || snippet.trim().length === 0) {
            console.warn(`[V9GroupedReportFormatter] Empty snippet extracted for ${displayPath}:${exampleIssue.line}`);
          }
        } catch (error: any) {
          console.warn(`[V9GroupedReportFormatter] Failed to extract snippet for ${displayPath}:${exampleIssue.line}: ${error.message}`);
          // Continue without snippet
        }
      }

      if (snippet && snippet !== 'N/A' && snippet.trim().length > 0) {
        section += `**Code**:\n\n`;
        const language = this.getLanguageFromFile(exampleIssue.file);
        section += `\`\`\`${language}\n`;
        section += snippet;
        section += '\n```\n\n';
      } else if (representative?.fixSuggestion?.correctedCode && typeof representative.fixSuggestion.correctedCode === 'string') {
        // BUG FIX #47 CORRECTED: Show AI code when snippet unavailable, but with minimal cleaning
        // SESSION 85: Only show AI code for PRO/Enterprise tier
        const aiCode = representative.fixSuggestion.correctedCode.trim();
        // Only remove <think> tags, keep everything else
        const cleanCode = aiCode.replace(/<think>[\s\S]*?<\/think>/gi, '').replace(/<think>[\s\S]*$/gi, '').trim();

        if (cleanCode && cleanCode.length >= 20) {
          // SESSION 85: Tier-aware code display
          if (this.userTier === 'pro' || this.userTier === 'enterprise') {
            section += `**Code** (AI-generated example):\n\n`;
            const language = this.getLanguageFromFile(exampleIssue.file);
            section += `\`\`\`${language}\n`;
            section += cleanCode;
            section += '\n```\n\n';
            alreadyShowedAICode = true; // Track that we showed AI code here
          } else {
            // BASIC tier: Show that code is available but not displayed
            section += `> 📋 **Code Example Available**: Upgrade to PRO to see AI-generated code examples.\n\n`;
          }
        } else {
          section += `> Code snippet unavailable. See fix recommendation below.\n\n`;
        }
      } else {
        section += `> Code snippet unavailable. See fix recommendation below.\n\n`;
      }
    }

    // Phase D: Improved fix recommendations
    // BUG FIX #65: Always show "How to Fix", even without AI enrichment
    if (expanded) {
      section += `#### 🔧 How to Fix\n\n`;

      // BUG FIX #69: Only show AI-generated code examples if they exist
      // The fix guidance (generic or AI) is already shown above
      const hasValidSnippet = representative?.snippet && representative.snippet !== 'N/A' && representative.snippet.trim().length > 0;
      const hasValidFix = representative?.fixSuggestion?.correctedCode && typeof representative.fixSuggestion.correctedCode === 'string' && representative.fixSuggestion.correctedCode.trim().length > 0;

      if (representative?.fixSuggestion) {
        // AI-enriched fix available
        // BUG FIX #11: Clean ALL AI content using helper function
        const cleanFix = this.cleanAIContent(representative.fixSuggestion.fix);
        section += `${cleanFix}\n\n`;

        // SESSION 85: TIER-AWARE FIX DISPLAY
        // Show AI-generated code example ONLY for PRO/Enterprise tier
        // BASIC tier gets text guidance only (matches BASIC_TIER_SAMPLE_REPORT.md design)
        if (hasValidFix) {
          const cleanCorrectedCode = this.cleanAIContent(representative.fixSuggestion.correctedCode);

          // If after cleaning, the code is valid, show it (but only for PRO tier)
          if (cleanCorrectedCode && cleanCorrectedCode.length >= 20) {
            // SESSION 85: Check tier before showing AI-generated code
            if (this.userTier === 'pro' || this.userTier === 'enterprise') {
              // PRO/Enterprise tier: Show full AI-generated fix with before/after
              if (hasValidSnippet) {
                // SESSION 74 FIX: Check if before and after are identical to avoid confusing diffs
                const snippetNormalized = (representative.snippet || '').trim().replace(/\s+/g, ' ');
                const correctedNormalized = cleanCorrectedCode.trim().replace(/\s+/g, ' ');
                const areIdentical = snippetNormalized === correctedNormalized ||
                  this.calculateSimilarity(snippetNormalized, correctedNormalized) > 0.95;

                if (areIdentical) {
                  // Before and after are essentially the same - show a helpful message instead
                  section += `> 💡 **Note**: The AI-suggested fix involves changes that may require context beyond the displayed snippet. `;
                  section += `Please review the specific fix guidance above and apply it manually to the affected locations.\n\n`;
                } else {
                  section += `**Suggested Change**:\n\n`;
                  section += '```diff\n';
                  section += '- // Before:\n';
                  section += (representative.snippet || '').split('\n').map(line => `- ${line}`).join('\n');
                  section += '\n\n';
                  section += '+ // After:\n';
                  section += cleanCorrectedCode.split('\n').map(line => `+ ${line}`).join('\n');
                  section += '\n```\n\n';
                }
              } else if (!alreadyShowedAICode) {
                // BUG FIX: Only show "Recommended Code" if we didn't already show it as "Code (AI-generated example)"
                // SESSION 73 FIX: Validate that corrected code matches the representative file
                // Extract class name from exampleIssue file to check if code is for the right file
                const exampleFileName = exampleIssue?.file?.split('/').pop()?.replace('.java', '').replace('.ts', '').replace('.py', '') || '';
                const codeMatchesFile = !exampleFileName ||
                  cleanCorrectedCode.includes(exampleFileName) ||
                  cleanCorrectedCode.includes(`class ${exampleFileName}`) ||
                  cleanCorrectedCode.length < 200; // Short generic patterns are OK

                if (codeMatchesFile) {
                  section += `**Recommended Code**:\n\n`;
                  const language = representative?.file ? this.getLanguageFromFile(representative.file) : 'text';
                  section += `\`\`\`${language}\n`;
                  section += cleanCorrectedCode;
                  section += '\n```\n\n';
                } else {
                  // Code doesn't match the representative example - show generic guidance instead
                  section += `> 💡 **Pattern-Based Fix**: This fix pattern applies to all occurrences. Adapt the principle to each specific file.\n\n`;
                }
              }
            } else {
              // BASIC tier: Show upgrade prompt instead of AI-generated code
              section += `> 💡 **AI Fix Available**: Upgrade to PRO tier to see the AI-generated fix code for this issue.\n`;
              section += `> See the IDE Integration section below to export issues for manual fixing.\n\n`;
            }
          } else {
            // BUG-LSP-001: Fix was rejected (template pattern detected) - show manual review message
            section += `> ⚠️ **Manual Review Required**: An automated fix could not be generated for this issue. `;
            section += `Please review the code at the locations listed below and apply the fix manually based on the guidance above.\n\n`;
          }
        }
      } else {
        // Generic fix guidance based on rule/tool (NO AI enrichment)
        section += this.getGenericFixGuidance(group.rule, group.tool, group.severity);
        section += `\n\n`;
        // BUG FIX #69: Don't show "requires context" message - generic guidance is already provided
      }

      // BUG FIX #68: Check if fixSuggestion exists before accessing bestPractices
      if (representative?.fixSuggestion?.bestPractices && representative.fixSuggestion.bestPractices.length > 0) {
        section += `**Best Practices to Follow**:\n\n`;
        // BUG FIX #11: Clean best practices too
        representative.fixSuggestion.bestPractices.forEach(bp => {
          section += `- ${this.cleanAIContent(bp)}\n`;
        });
        section += '\n';
      }
    }

    // Phase D: Improved footer with file count and link
    section += `#### 📎 All Occurrences\n\n`;
    section += `This issue appears in **${group.count} ${group.count === 1 ? 'file' : 'files'}** across your codebase.\n\n`;

    if (canAutoFix) {
      // SESSION 73: Tier-aware messaging
      if (this.userTier === 'pro' || this.userTier === 'enterprise') {
        section += `> ✅ **Auto-fixed**: This issue has been automatically fixed. See the **Applied Fixes** section below for details.\n\n`;
      } else {
        section += `> 💡 **Auto-fixable**: This issue can be resolved using the 1-click solution in the IDE Integration section below.\n\n`;
      }
    }

    section += '---\n\n';

    return section;
  }

  /**
   * Helper to strip AI reasoning tags from content
   * BUG FIX #11, #12, #46 CORRECTED: Remove only <think> tags and obvious AI artifacts
   * CRITICAL: Be conservative - don't remove legitimate code/comments
   */
  private cleanAIContent(content: string): string {
    return cleanAIContent(content);
  }

  /**
   * Calculate text similarity (0-1) using Levenshtein distance ratio
   * SESSION 74: Added to detect identical before/after code samples
   */
  private calculateSimilarity(text1: string, text2: string): number {
    if (text1 === text2) return 1;
    if (!text1 || !text2) return 0;

    const len1 = text1.length;
    const len2 = text2.length;
    const maxLen = Math.max(len1, len2);

    if (maxLen === 0) return 1;

    // For very long strings, use a simpler character overlap check
    if (maxLen > 1000) {
      const set1 = new Set(text1.split(' '));
      const set2 = new Set(text2.split(' '));
      const intersection = [...set1].filter(x => set2.has(x)).length;
      const union = new Set([...set1, ...set2]).size;
      return union > 0 ? intersection / union : 0;
    }

    // Levenshtein distance for smaller strings
    const matrix: number[][] = [];

    for (let i = 0; i <= len1; i++) {
      matrix[i] = [i];
    }
    for (let j = 0; j <= len2; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= len1; i++) {
      for (let j = 1; j <= len2; j++) {
        const cost = text1[i - 1] === text2[j - 1] ? 0 : 1;
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j - 1] + cost
        );
      }
    }

    const distance = matrix[len1][len2];
    return 1 - distance / maxLen;
  }

  /**
   * Generate CheckStyle auto-fix guidance section
   * BUG FIX #19: Provide users with instructions to auto-fix all CheckStyle issues
   */
  private generateCheckStyleAutoFixGuide(issueCount: number): string {
    return `## 🛠️ Auto-Fixing CheckStyle Issues

**Good news! All ${issueCount.toLocaleString()} CheckStyle issues can be fixed automatically!**

### Option 1: Using Google Java Format

\`\`\`bash
# Download google-java-format
wget https://github.com/google/google-java-format/releases/download/v1.17.0/google-java-format-1.17.0-all-deps.jar

# Format all Java files
find . -name "*.java" | xargs java -jar google-java-format-1.17.0-all-deps.jar --replace

# Verify fixes
git diff --stat
\`\`\`

### Option 2: Using IntelliJ IDEA

1. Open project in IntelliJ IDEA
2. Go to **Code** → **Reformat Code** (or press ⌘⌥L / Ctrl+Alt+L)
3. Check **✓ Optimize imports** and **✓ Rearrange entries**
4. Select **Whole project** scope
5. Click **Run**

### Option 3: Using Maven CheckStyle Plugin

Add to \`pom.xml\`:

\`\`\`xml
<plugin>
  <groupId>org.apache.maven.plugins</groupId>
  <artifactId>maven-checkstyle-plugin</artifactId>
  <version>3.3.0</version>
  <configuration>
    <configLocation>checkstyle.xml</configLocation>
  </configuration>
</plugin>
\`\`\`

Then run:
\`\`\`bash
mvn checkstyle:check  # Verify current issues
\`\`\`

### Option 4: Using Spotless (Recommended for CI/CD)

Add to \`pom.xml\`:

\`\`\`xml
<plugin>
  <groupId>com.diffplug.spotless</groupId>
  <artifactId>spotless-maven-plugin</artifactId>
  <version>2.40.0</version>
  <configuration>
    <java>
      <googleJavaFormat>
        <version>1.17.0</version>
      </googleJavaFormat>
    </java>
  </configuration>
</plugin>
\`\`\`

Then run:
\`\`\`bash
mvn spotless:apply  # Auto-fix all formatting
mvn spotless:check  # Verify (use in CI)
\`\`\`

> 💡 **Pro Tip**: Add \`mvn spotless:check\` to your CI pipeline to prevent CheckStyle issues from being introduced!

---
`;
  }

  /**
   * Generate IDE fix file for a group (BUG FIX #33: Simplified - only IDE fix files, no separate locations)
   * 
   * This method now generates only ONE file per group with ALL locations included.
   * Previous approach generated 2 files (locations + IDE fix), causing duplication.
   */
  private async generateIDEFixFile(
    group: IssueGroup,
    allIssues: EnrichedIssue[]
  ): Promise<IDEFixFile | null> {
    const groupIssues = allIssues.filter(i =>
      i.rule === group.rule && i.tool === group.tool && i.severity === group.severity
    );

    const representative = groupIssues[0];
    if (!representative) return null;

    const groupId = this.sanitizeGroupId(group);

    // Generate IDE fix file (for all groups, not just auto-fixable)
    // This allows IDEs to display all issues, even if they can't auto-fix them
    return {
      groupId,
      filename: `group-${groupId}-fix.json`,  // Shorter filename (removed "cursor")
      content: await this.generateCursorFixData(group, groupIssues, representative)
    };
  }

  /**
   * Generate Cursor IDE fix data (BUG FIX #24: Now async for snippet extraction)
   * ENHANCEMENT: Added tool field for manifest enrichment
   */
  private async generateCursorFixData(
    group: IssueGroup,
    groupIssues: EnrichedIssue[],
    representative: EnrichedIssue
  ): Promise<CursorFixData> {
    const fixPattern = this.extractFixPattern(group, representative);

    return {
      version: "1.0",
      group_id: this.sanitizeGroupId(group),
      rule: group.rule,
      tool: group.tool,  // ENHANCEMENT: Added for manifest enrichment
      severity: group.severity,
      description: representative.fixSuggestion?.explanation || '',

      fix_pattern: fixPattern,

      locations: await this.extractSnippetsForLocations(groupIssues),

      metadata: {
        total_occurrences: group.count,
        confidence: this.determineConfidence(group),
        safe_auto_apply: this.isSafeToAutoApply(group),
        estimated_time_seconds: Math.ceil(group.count * 0.5), // 0.5s per file
        required_imports: this.extractRequiredImports(representative)
      }
    };
  }

  /**
   * SESSION 25-27: Generate LSP, SARIF, and GitLab Code Quality formats
   * These formats enable:
   * - LSP: Cursor/VSCode IDE integration (one-click fixes)
   * - SARIF: Industry standard (GitHub, Azure DevOps, etc.)
   * - GitLab: Code Quality widget in merge requests
   */
  private async generateLSPAndSARIFFormats(
    enrichedIssues: EnrichedIssue[],
    groups: IssueGroup[],
    metadata: any,
    analysisTimestamp: number  // BUG-DOG-04 FIX: Use consistent timestamp across all uploads
  ): Promise<{ lspUrl?: string; sarifUrl?: string; gitlabUrl?: string }> {
    try {
      const converter = new LSPSARIFConverter();
      const gitlabConverter = new GitLabCodeQualityConverter();
      const workspaceRoot = this.repoPath || process.cwd();

      // PERF-OPT: Generate all three formats in parallel (CPU work)
      console.log('[LSP/SARIF/GitLab] Generating all formats in parallel...');
      const generationStart = Date.now();

      const [lspCodeActions, sarifReport, gitlabReport] = await Promise.all([
        // Generate LSP Code Actions
        Promise.resolve(converter.generateLSPCodeActions(enrichedIssues, workspaceRoot)),
        // Generate SARIF Report
        Promise.resolve(converter.generateSARIFReport(enrichedIssues, groups, {
          repository: metadata.repository || 'unknown',
          version: metadata.analyzerVersion || '9.0.0',
          analyzedAt: metadata.analyzedAt || new Date().toISOString(),
          workspaceRoot  // Use relative paths in SARIF output
        })),
        // Generate GitLab Code Quality Report
        Promise.resolve(gitlabConverter.generateGitLabCodeQualityReport(enrichedIssues, this.repoPath))
      ]);

      const generationTime = Date.now() - generationStart;
      console.log(`[LSP/SARIF/GitLab] ✅ All formats generated in ${generationTime}ms (parallel)`);
      console.log(`[LSP/SARIF/GitLab]   - LSP: ${lspCodeActions.length} Code Actions`);
      console.log(`[LSP/SARIF/GitLab]   - SARIF: ${sarifReport.runs[0].results.length} results`);
      console.log(`[LSP/SARIF/GitLab]   - GitLab: ${gitlabReport.length} issues`);

      // Initialize URLs
      let lspUrl: string | undefined;
      let sarifUrl: string | undefined;
      let gitlabUrl: string | undefined;

      // Upload to Supabase if available
      if (this.supabase) {
        // BUG-DOG-04 FIX: Use passed analysisTimestamp (not new Date.now())
        const repoName = metadata.repository?.split('/').pop() || 'unknown';
        const analysisId = `${repoName}-pr${metadata.prNumber || 0}-${analysisTimestamp}`;

        // Ensure service health tracker is initialized before parallel uploads
        await this.initializeServiceHealthTracker();

        // Define filenames
        const lspFilename = 'codequal-lsp-actions.json';
        const sarifFilename = 'codequal-sarif-report.json';
        const gitlabFilename = 'codequal-gitlab-codequality.json';

        // Prepare content for uploads
        const lspContent = JSON.stringify(lspCodeActions, null, 2);
        const sarifContent = JSON.stringify(sarifReport, null, 2);
        const gitlabContent = JSON.stringify(gitlabReport, null, 2);

        console.log(`[LSP/SARIF/GitLab] Starting parallel uploads to Supabase...`);
        const uploadStart = Date.now();

        // PERF-OPT: Upload all three files in parallel (I/O work)
        const uploadResults = await Promise.allSettled([
          // Upload LSP
          this.uploadSingleFile(analysisId, lspFilename, lspContent, 'lsp', metadata),
          // Upload SARIF (may need special handling for large files)
          this.uploadSingleFile(analysisId, sarifFilename, sarifContent, 'sarif', metadata),
          // Upload GitLab
          this.uploadSingleFile(analysisId, gitlabFilename, gitlabContent, 'gitlab', metadata)
        ]);

        const uploadTime = Date.now() - uploadStart;
        console.log(`[LSP/SARIF/GitLab] ✅ All uploads completed in ${uploadTime}ms (parallel)`);

        // Extract results
        if (uploadResults[0].status === 'fulfilled' && uploadResults[0].value) {
          lspUrl = uploadResults[0].value;
        }
        if (uploadResults[1].status === 'fulfilled' && uploadResults[1].value) {
          sarifUrl = uploadResults[1].value;
        }
        if (uploadResults[2].status === 'fulfilled' && uploadResults[2].value) {
          gitlabUrl = uploadResults[2].value;
        }

        // Log any failures
        uploadResults.forEach((result, index) => {
          const names = ['LSP', 'SARIF', 'GitLab'];
          if (result.status === 'rejected') {
            console.error(`[${names[index]}] ❌ Upload failed:`, result.reason);
          }
        });
      }

      return { lspUrl, sarifUrl, gitlabUrl };

    } catch (error) {
      console.error('[LSP/SARIF] Error generating formats:', error);
      return {};
    }
  }

  /**
   * PERF-OPT: Helper method to upload a single file to Supabase
   * Extracted to enable parallel uploads
   */
  private async uploadSingleFile(
    analysisId: string,
    filename: string,
    content: string,
    service: 'lsp' | 'sarif' | 'gitlab',
    metadata: any
  ): Promise<string | undefined> {
    if (!this.supabase) return undefined;

    try {
      // Check for large SARIF files (> 50MB free tier limit)
      if (service === 'sarif' && content.length > 50 * 1024 * 1024) {
        console.warn(`[${service.toUpperCase()}] ⚠️  File exceeds 50MB free tier limit, skipping`);
        return undefined;
      }

      // Use resumable upload for files > 6MB
      const useResumable = content.length > 6 * 1024 * 1024;
      const uploadContent = useResumable ? new Blob([content], { type: 'application/json' }) : content;

      const { data, error } = await this.uploadWithRetry(
        `${analysisId}/${filename}`,
        uploadContent,
        {
          contentType: 'application/json',
          cacheControl: '3600',
          upsert: true
        }
      );

      if (error) {
        console.error(`[${service.toUpperCase()}] ❌ Upload failed:`, error);
        if (this.serviceHealthTracker) {
          await this.serviceHealthTracker.trackUploadFailure({
            service,
            filename,
            error,
            repositoryUrl: metadata.repository,
            prNumber: metadata.prNumber,
            analysisId,
            errorDetails: {
              statusCode: (error as any).statusCode,
              error: (error as any).error
            }
          });
        }
        return undefined;
      }

      if (data) {
        const { data: urlData } = this.supabase.storage
          .from('v9-attachments')
          .getPublicUrl(`${analysisId}/${filename}`);
        const url = urlData.publicUrl;
        console.log(`[${service.toUpperCase()}] ✅ Uploaded: ${url}`);

        if (this.serviceHealthTracker) {
          await this.serviceHealthTracker.trackUploadSuccess({
            service,
            filename,
            url,
            fileSize: content.length,
            repositoryUrl: metadata.repository,
            prNumber: metadata.prNumber,
            analysisId
          });
        }
        return url;
      }

      return undefined;
    } catch (uploadError) {
      console.error(`[${service.toUpperCase()}] ❌ Upload error:`, uploadError);
      return undefined;
    }
  }

  /**
   * Extract fix pattern for IDE automation using Three-Tier Fix System
   *
   * Session 35: Enhanced with hybrid fix strategy
   * - Tier 1: Native tool fixes (eslint --fix, ruff --fix) - 95% confidence
   * - Tier 2: Dedicated fixer tools (Sorald, autoflake) - 85% confidence
   * - Tier 3: AI-generated fixes with specific prompts - 90% confidence (specific) / 60% (generic)
   * - Manual Review: When AI can't help, provide user-friendly guidance
   */
  private extractFixPattern(group: IssueGroup, representative: EnrichedIssue): FixPattern {
    const fix = representative.fixSuggestion;
    const classification = classifyIssue(group.rule, group.tool);

    // Determine issue category for AI prompts
    // Session 59: Pass tool to detect recommendation-only categories (secrets, IaC, container, GraphQL)
    const issueCategory = this.determineIssueCategory(classification.issueType, group.tool);

    // Tier 1 & 2: Native tools and dedicated fixers
    if (classification.fixTier <= 2 && classification.fixable) {
      // Special case: AvoidUsingVolatile with regex pattern
      if (group.rule === 'AvoidUsingVolatile') {
        return {
          type: 'regex',
          fixTier: classification.fixTier,
          fixerTool: 'sorald',
          fixerCommand: 'sorald repair --source',
          confidence: 85,
          find_regex: 'private volatile (\\w+) (\\w+)( = .+)?;',
          replace_template: 'private final Atomic$1 $2 = new Atomic$1($3);',
          example: {
            before: 'private volatile boolean running = true;',
            after: 'private final AtomicBoolean running = new AtomicBoolean(true);'
          },
          instructions: 'Replace volatile primitive types with AtomicXXX equivalents'
        };
      }

      // Standard Tier 1/2 fix
      const cleanedCode = this.cleanCorrectedCode(fix?.correctedCode);

      // BUG-LSP-001: If fix was rejected (empty after cleaning), mark as manual review
      const requiresManualReview = !cleanedCode && fix?.correctedCode;

      return {
        type: requiresManualReview ? 'manual-review' : 'template',
        fixTier: classification.fixTier,
        fixerTool: requiresManualReview ? 'manual' : this.getFixerToolForRule(group.tool, classification.issueType),
        fixerCommand: requiresManualReview ? undefined : this.getFixerCommand(group.tool, classification.issueType),
        confidence: requiresManualReview ? 0 : (classification.fixTier === 1 ? 95 : 85),
        example: {
          before: representative.snippet || '',
          after: cleanedCode
        },
        instructions: fix?.fix || 'Apply the suggested fix',
        // BUG-LSP-001: Add manual review info when fix was rejected
        manualReview: requiresManualReview ? {
          reason: 'FIX_GENERATION_FAILED',
          explanation: 'An automated fix could not be generated for this issue.',
          userAction: 'Please review the code and apply the fix manually.',
          aiCanHelp: true,
          riskLevel: group.severity === 'critical' ? 'high' : (group.severity === 'high' ? 'medium' : 'low')
        } : undefined
      };
    }

    // Tier 3: Generate DYNAMIC AI prompt for ANY issue
    // This works for ALL rules, not just hardcoded ones
    const issueContext: IssueContext = {
      ruleId: group.rule,
      tool: group.tool,
      message: representative.message || group.rule,
      category: issueCategory as IssueContext['category'],
      severity: (group.severity || 'medium') as 'critical' | 'high' | 'medium' | 'low',
      filePath: representative.file || '',
      lineNumber: representative.line || 0,
      language: this.detectedLanguage || 'typescript',
      codeContext: representative.snippet || '',
      snippet: representative.snippet,
    };

    // Get optimized prompt (uses known patterns when available, dynamic otherwise)
    const aiPrompt = getOptimizedPrompt(issueContext);

    // All Tier 3 issues get AI-generated fixes with dynamic prompts
    const cleanedTier3Code = this.cleanCorrectedCode(fix?.correctedCode);

    // BUG-LSP-001: If fix was rejected (empty after cleaning), mark as manual review
    const requiresManualReview = !cleanedTier3Code && fix?.correctedCode;

    return {
      type: requiresManualReview ? 'manual-review' : 'ai-generated',
      fixTier: 3,
      fixerTool: requiresManualReview ? 'manual' : 'ai',
      confidence: requiresManualReview ? 0 : (aiPrompt.temperature <= 0.1 ? 90 : 75),
      example: {
        before: representative.snippet || '',
        after: cleanedTier3Code
      },
      instructions: fix?.fix || `AI-generated fix for ${group.rule}`,
      // BUG-LSP-001: Add manual review info when fix was rejected
      manualReview: requiresManualReview ? {
        reason: 'FIX_GENERATION_FAILED',
        explanation: 'An automated fix could not be generated for this issue due to insufficient context.',
        userAction: 'Please review the code at the specified locations and apply the fix manually based on the instructions above.',
        aiCanHelp: true,
        aiPromptHint: `Fix ${group.rule} issue: ${representative.message || group.rule}`,
        riskLevel: group.severity === 'critical' ? 'high' : (group.severity === 'high' ? 'medium' : 'low')
      } : undefined,
      aiPrompt: requiresManualReview ? undefined : {
        systemPrompt: aiPrompt.systemPrompt,
        userPromptTemplate: aiPrompt.userPromptTemplate,
        outputFormat: aiPrompt.outputFormat,
        maxTokens: aiPrompt.maxTokens,
        temperature: aiPrompt.temperature,
        requiredContext: aiPrompt.requiredContext
      }
    };

  }

  /**
   * Determine issue category for AI prompt lookup
   * Session 59: Updated to handle recommendation-only tools (secrets, IaC, container, GraphQL)
   * These tools require specialized prompts that generate remediation steps, not code fixes
   */
  private determineIssueCategory(
    issueType: string,
    tool?: string
  ): 'security' | 'quality' | 'performance' | 'secrets' | 'iac_security' | 'container_security' | 'graphql_security' | 'api_design' {
    const normalizedTool = (tool || '').toLowerCase();

    // Session 59: Recommendation-only tools get specific categories
    // These tools cannot auto-fix issues, they provide remediation guidance

    // Secrets detection tools (P0)
    if (['gitleaks', 'trufflehog'].includes(normalizedTool)) {
      return 'secrets';
    }

    // IaC security tools (P0)
    if (normalizedTool === 'checkov') {
      return 'iac_security';
    }

    // Container security tools (P0)
    if (['trivy', 'grype'].includes(normalizedTool)) {
      return 'container_security';
    }

    // GraphQL security tools (P1)
    if (['graphql-cop', 'graphql-scanner', 'graphql-static'].includes(normalizedTool)) {
      return 'graphql_security';
    }

    // API schema tools (P1)
    if (normalizedTool === 'spectral') {
      return 'api_design';
    }

    // Standard categories for code-fixable issues
    switch (issueType) {
      case 'security':
        return 'security';
      case 'performance':
        return 'performance';
      default:
        return 'quality';  // style, maintainability, compatibility, etc. → quality
    }
  }

  /**
   * Get fixer tool for a rule based on tool and issue type
   */
  private getFixerToolForRule(tool: string, issueType: string): string {
    const normalizedTool = tool.toLowerCase();

    // TypeScript/JavaScript
    if (['eslint', 'typescript-eslint'].includes(normalizedTool)) return 'eslint';
    if (normalizedTool === 'prettier') return 'prettier';

    // Python
    if (normalizedTool === 'ruff') return 'ruff';
    if (issueType === 'quality') return 'autoflake';
    if (issueType === 'compatibility') return 'pyupgrade';

    // Java
    if (['pmd', 'checkstyle', 'spotbugs'].includes(normalizedTool)) return 'sorald';

    // Go
    if (normalizedTool === 'golangci-lint') return 'golangci-lint';

    return 'ai';
  }

  /**
   * Get fixer command for a tool and issue type
   */
  private getFixerCommand(tool: string, issueType: string): string {
    const normalizedTool = tool.toLowerCase();

    // TypeScript/JavaScript
    if (['eslint', 'typescript-eslint'].includes(normalizedTool)) return 'eslint --fix';
    if (normalizedTool === 'prettier') return 'prettier --write';

    // Python
    if (normalizedTool === 'ruff') return 'ruff check --fix';
    if (issueType === 'quality') return 'autoflake --in-place --remove-all-unused-imports';
    if (issueType === 'compatibility') return 'pyupgrade --py38-plus';

    // Java
    if (['pmd', 'checkstyle', 'spotbugs'].includes(normalizedTool)) return 'sorald repair --source';

    // Go
    if (normalizedTool === 'golangci-lint') return 'golangci-lint run --fix';

    return 'ai';
  }

  /**
   * Determine if group can be auto-fixed using Three-Tier Fix System
   * Tier 1: Native tool fixes (eslint --fix, ruff --fix) - 95% confidence
   * Tier 2: Dedicated fixer tools (Sorald, autoflake) - 85% confidence
   * Tier 3: AI-generated fixes (fallback) - 60% confidence, needs review
   *
   * BUG FIX #13: Include all CheckStyle rules (100% auto-fixable with IDE formatters)
   * SESSION 19 FIX: Include Semgrep, Dependency-Check, SpotBugs
   * SESSION 34 FIX: Use Three-Tier Fix System classifier for accurate routing
   */
  private canAutoFix(group: IssueGroup): boolean {
    // Use Three-Tier Fix System classifier
    const classification = classifyIssue(group.rule, group.tool);

    // Tier 1 and Tier 2 are auto-fixable (native tools and dedicated fixers)
    if (classification.fixTier <= 2 && classification.fixable) {
      return true;
    }

    // BUG-094 FIX: Comprehensive fallback for tools not fully covered by classifier
    const toolLower = group.tool?.toLowerCase() || '';

    // Java tools
    const javaTools = ['checkstyle', 'semgrep', 'dependency-check', 'spotbugs', 'pmd'];
    if (javaTools.includes(toolLower)) {
      return true;
    }

    // Python tools
    const pythonTools = ['ruff', 'pylint', 'mypy', 'flake8', 'bandit', 'pip-audit', 'safety'];
    if (pythonTools.includes(toolLower)) {
      return true;
    }

    // JavaScript/TypeScript tools
    const jsTools = ['npm-audit', 'yarn-audit', 'eslint', 'typescript-eslint'];
    if (jsTools.includes(toolLower)) {
      return true;
    }

    // Go tools
    const goTools = ['golangci-lint', 'go-vet', 'gosec'];
    if (goTools.includes(toolLower)) {
      return true;
    }

    // Ruby tools
    const rubyTools = ['rubocop', 'brakeman', 'bundler-audit'];
    if (rubyTools.includes(toolLower)) {
      return true;
    }

    return false;
  }

  /**
   * Get fix tier for a specific issue using Three-Tier Fix System
   * Returns: 1 (native tool), 2 (dedicated fixer), or 3 (AI fallback)
   */
  private getFixTier(group: IssueGroup): 1 | 2 | 3 {
    const classification = classifyIssue(group.rule, group.tool);
    return classification.fixTier;
  }

  /**
   * Calculate Three-Tier Fix System breakdown for issues
   */
  private calculateTierBreakdown(groups: IssueGroup[]): {
    tier1: { count: number; issues: number; percent: number };
    tier2: { count: number; issues: number; percent: number };
    tier3: { count: number; issues: number; percent: number };
    autoFixable: number;
    autoFixPercent: number;
  } {
    let tier1Count = 0, tier1Issues = 0;
    let tier2Count = 0, tier2Issues = 0;
    let tier3Count = 0, tier3Issues = 0;
    let totalIssues = 0;

    for (const group of groups) {
      const tier = this.getFixTier(group);
      totalIssues += group.count;

      if (tier === 1) {
        tier1Count++;
        tier1Issues += group.count;
      } else if (tier === 2) {
        tier2Count++;
        tier2Issues += group.count;
      } else {
        tier3Count++;
        tier3Issues += group.count;
      }
    }

    const autoFixable = tier1Issues + tier2Issues;

    return {
      tier1: {
        count: tier1Count,
        issues: tier1Issues,
        percent: totalIssues > 0 ? (tier1Issues / totalIssues) * 100 : 0
      },
      tier2: {
        count: tier2Count,
        issues: tier2Issues,
        percent: totalIssues > 0 ? (tier2Issues / totalIssues) * 100 : 0
      },
      tier3: {
        count: tier3Count,
        issues: tier3Issues,
        percent: totalIssues > 0 ? (tier3Issues / totalIssues) * 100 : 0
      },
      autoFixable,
      autoFixPercent: totalIssues > 0 ? (autoFixable / totalIssues) * 100 : 0
    };
  }

  /**
   * ENHANCEMENT: Get category from tool name for manifest enrichment
   */
  private getCategoryFromTool(tool: string): string {
    if (tool === 'semgrep') return 'Security';
    if (tool === 'dependency-check') return 'Dependencies';
    if (tool === 'spotbugs') return 'Code Quality';
    if (tool === 'checkstyle') return 'Code Quality';
    // PMD can be multiple categories - use generic
    return 'Code Quality';
  }

  /**
   * ENHANCEMENT: Format rule name to human-readable title
   */
  private formatRuleTitle(rule: string): string {
    // Handle dotted names like "java.lang.security.audit.crypto.weak-random.weak-random"
    if (rule.includes('.')) {
      const parts = rule.split('.');
      const lastPart = parts[parts.length - 1];
      return lastPart.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    }
    // Handle camelCase like "SystemPrintln" → "System Println"
    return rule.replace(/([A-Z])/g, ' $1').trim();
  }

  /**
   * BUG-100 FIX: Detect vulnerability type from message content
   * Returns: 'dos' | 'rce' | 'data_breach' | 'auth_bypass' | 'injection' | 'xss' | 'ssrf' | 'unknown'
   */
  private detectVulnerabilityType(message: string): string {
    const msg = message.toLowerCase();

    // ========= CVE-SPECIFIC DETECTION =========
    // Known DoS CVEs (OpenSSL, cryptography package)
    const knownDosCVEs = [
      'cve-2023-2650',  // OpenSSL - quadratic time complexity
      'cve-2023-0286',  // OpenSSL - X.400 address type confusion
      'cve-2022-4450',  // OpenSSL - double free
      'cve-2023-0215',  // OpenSSL - use-after-free
      'cve-2022-4304',  // OpenSSL - timing oracle
      'cve-2023-3817',  // OpenSSL - excessive time checking DH keys
      'cve-2023-5678',  // OpenSSL - excessive time generating DSA keys
      'cve-2024-0727',  // OpenSSL - NULL dereference crash
    ];

    // Check for known DoS CVEs
    for (const cve of knownDosCVEs) {
      if (msg.includes(cve)) {
        return 'dos';
      }
    }

    // OpenSSL advisory links often indicate DoS vulnerabilities
    if (msg.includes('openssl') && (
      msg.includes('secadv') ||  // OpenSSL security advisory
      msg.includes('advisory') ||
      msg.includes('security issue'))) {
      // Most OpenSSL vulnerabilities are DoS (crashes, hangs, memory issues)
      // Very few are RCE (would be explicitly stated)
      return 'dos';
    }

    // Denial of Service patterns
    if (msg.includes('denial of service') || msg.includes('dos') ||
      msg.includes('resource exhaustion') || msg.includes('infinite loop') ||
      msg.includes('memory exhaustion') || msg.includes('cpu exhaustion') ||
      msg.includes('quadratic') || msg.includes('exponential') ||
      msg.includes('performance degradation') || msg.includes('slow') ||
      msg.includes('hang') || msg.includes('freeze') || msg.includes('unresponsive') ||
      msg.includes('crash') || msg.includes('out of memory') ||
      msg.includes('stack overflow') || msg.includes('recursion') ||
      msg.includes('null pointer') || msg.includes('null dereference') ||
      msg.includes('use after free') || msg.includes('use-after-free') ||
      msg.includes('double free') || msg.includes('buffer overread') ||
      msg.includes('assertion failure') || msg.includes('uncontrolled resource')) {
      return 'dos';
    }

    // Remote Code Execution patterns
    if (msg.includes('remote code execution') || msg.includes('rce') ||
      msg.includes('arbitrary code') || msg.includes('code execution') ||
      msg.includes('command execution') || msg.includes('shell injection') ||
      msg.includes('code injection') || msg.includes('execute arbitrary')) {
      return 'rce';
    }

    // Data Breach / Information Disclosure patterns
    if (msg.includes('information disclosure') || msg.includes('data leak') ||
      msg.includes('sensitive data') || msg.includes('data exposure') ||
      msg.includes('credential') || msg.includes('password') ||
      msg.includes('private key') || msg.includes('secret') ||
      msg.includes('token leak') || msg.includes('session') ||
      msg.includes('memory disclosure') || msg.includes('heap disclosure')) {
      return 'data_breach';
    }

    // Authentication/Authorization Bypass patterns
    if (msg.includes('authentication bypass') || msg.includes('auth bypass') ||
      msg.includes('authorization bypass') || msg.includes('privilege escalation') ||
      msg.includes('access control') || msg.includes('permission') ||
      msg.includes('impersonation') || msg.includes('spoofing')) {
      return 'auth_bypass';
    }

    // SQL/NoSQL Injection patterns
    if (msg.includes('sql injection') || msg.includes('nosql injection') ||
      msg.includes('ldap injection') || msg.includes('xpath injection') ||
      msg.includes('query injection')) {
      return 'injection';
    }

    // XSS patterns
    if (msg.includes('cross-site scripting') || msg.includes('xss') ||
      msg.includes('script injection') || msg.includes('html injection')) {
      return 'xss';
    }

    // SSRF patterns
    if (msg.includes('server-side request forgery') || msg.includes('ssrf') ||
      msg.includes('url validation') || msg.includes('redirect')) {
      return 'ssrf';
    }

    // Path Traversal patterns
    if (msg.includes('path traversal') || msg.includes('directory traversal') ||
      msg.includes('local file inclusion') || msg.includes('lfi') ||
      msg.includes('arbitrary file')) {
      return 'path_traversal';
    }

    // Deserialization patterns
    if (msg.includes('deserialization') || msg.includes('pickle') ||
      msg.includes('yaml.load') || msg.includes('unsafe load')) {
      return 'deserialization';
    }

    return 'unknown';
  }

  /**
   * BUG-100 FIX: Get vulnerability type-specific impact and "why it matters" descriptions
   */
  private getVulnerabilityTypeInfo(vulnType: string, severity: string): { why: string; impact: string } {
    const severityLabel = severity === 'critical' ? 'Critical' : severity === 'high' ? 'High' : 'Medium';

    switch (vulnType) {
      case 'dos':
        return {
          why: 'Denial of Service vulnerabilities can make your application unavailable to legitimate users. Attackers may exploit performance issues to exhaust system resources.',
          impact: `${severityLabel} availability risk. Application may become slow or unresponsive when processing malicious input. This affects user experience and SLA compliance but does NOT lead to data theft or code execution.`
        };

      case 'rce':
        return {
          why: 'Remote Code Execution is the most severe vulnerability type. Attackers can run arbitrary code on your server with the application\'s privileges.',
          impact: `${severityLabel} security risk. Complete system compromise, data theft, malware installation, and lateral movement to other systems. Requires immediate patching. CVSS typically 9.0+.`
        };

      case 'data_breach':
        return {
          why: 'Information disclosure vulnerabilities can leak sensitive data including credentials, personal information, or system internals.',
          impact: `${severityLabel} confidentiality risk. Sensitive data may be exposed to attackers. Could lead to credential theft, regulatory violations (GDPR, CCPA), and reputational damage.`
        };

      case 'auth_bypass':
        return {
          why: 'Authentication bypass allows attackers to access protected resources without valid credentials or elevate their privileges.',
          impact: `${severityLabel} security risk. Unauthorized access to protected resources, potential data breach, and privilege escalation. Compliance violations (SOC2, ISO 27001).`
        };

      case 'injection':
        return {
          why: 'Injection vulnerabilities allow attackers to execute malicious queries or commands in your database or backend systems.',
          impact: `${severityLabel} security risk. Database compromise, data theft, data manipulation, and potential system access. OWASP Top 10 A03:2021.`
        };

      case 'xss':
        return {
          why: 'Cross-site scripting allows attackers to inject malicious scripts that execute in victims\' browsers.',
          impact: `${severityLabel} security risk. Session hijacking, credential theft, malware distribution, and phishing attacks. OWASP Top 10 A03:2021.`
        };

      case 'ssrf':
        return {
          why: 'Server-Side Request Forgery allows attackers to make requests from your server to internal or external resources.',
          impact: `${severityLabel} security risk. Access to internal services, cloud metadata theft (AWS credentials), and potential remote code execution. OWASP Top 10 A10:2021.`
        };

      case 'path_traversal':
        return {
          why: 'Path traversal allows attackers to access files outside the intended directory, potentially exposing sensitive system files.',
          impact: `${severityLabel} security risk. Exposure of sensitive files (config, credentials, source code), and potential for code execution when combined with file upload.`
        };

      case 'deserialization':
        return {
          why: 'Unsafe deserialization can allow attackers to execute arbitrary code by providing malicious serialized data.',
          impact: `${severityLabel} security risk. Remote code execution, denial of service, and authentication bypass. Extremely dangerous in Python (pickle) and Java environments.`
        };

      default:
        // Fallback for unknown types - use generic but honest description
        return {
          why: 'This dependency has a known security vulnerability that could affect your application\'s security posture.',
          impact: `${severityLabel} security risk. Review the vulnerability details above to understand the specific impact. Update to a patched version as recommended.`
        };
    }
  }

  /**
   * ENHANCEMENT: Get short impact summary for manifest
   */
  private getPriority(severity: string): number {
    switch (severity) {
      case 'critical': return 1;
      case 'high': return 2;
      case 'medium': return 3;
      case 'low': return 4;
      default: return 5;
    }
  }

  // BUG-099 FIX: Added optional message parameter
  private getImpactSummary(rule: string, tool: string, severity: string, message?: string): string {
    const fullDescription = this.getIssueDescription(rule, tool, severity, message);
    const whatText = fullDescription.what;
    // Extract first sentence or first 120 chars
    const firstSentence = whatText.match(/^[^.!?]+[.!?]/)?.[0] || whatText.substring(0, 120);
    return firstSentence.trim() + (whatText.length > 120 ? '...' : '');
  }

  /**
   * ENHANCEMENT: Calculate priority score for sorting in manifest
   */
  private calculatePriority(severity: string, category: string, fileCount: number): number {
    let score = 0;

    // Severity weight (0-100)
    if (severity === 'critical') score += 100;
    else if (severity === 'high') score += 60;
    else if (severity === 'medium') score += 30;
    else if (severity === 'low') score += 10;

    // Category weight (0-30)
    if (category === 'Security') score += 30;
    else if (category === 'Performance') score += 15;
    else if (category === 'Architecture') score += 10;
    else score += 5;

    // File spread weight (0-20) - log scale
    score += Math.min(20, Math.log2(fileCount + 1) * 10);

    return Math.round(score);
  }

  /**
   * Determine confidence level for auto-fix
   */
  private determineConfidence(group: IssueGroup): 'high' | 'medium' | 'low' {
    // High Confidence: Safe to auto-apply without review
    if (this.isSafeToAutoApply(group)) {
      return 'high';
    }

    // Medium Confidence: Can be auto-fixed but requires review
    if (this.canAutoFix(group)) {
      return 'medium';
    }

    // Low Confidence: Manual fix required
    return 'low';
  }

  /**
   * Get programming language from file extension for syntax highlighting
   */
  private getLanguageFromFile(file: string): string {
    if (file.endsWith('.java')) return 'java';
    if (file.endsWith('.scala')) return 'scala';
    if (file.endsWith('.gradle')) return 'gradle';
    if (file.endsWith('.kt') || file.endsWith('.kts')) return 'kotlin';
    if (file.endsWith('.py')) return 'python';
    if (file.endsWith('.js')) return 'javascript';
    if (file.endsWith('.jsx')) return 'jsx';
    if (file.endsWith('.ts')) return 'typescript';
    if (file.endsWith('.tsx')) return 'tsx';
    if (file.endsWith('.go')) return 'go';
    if (file.endsWith('.rs')) return 'rust';
    if (file.endsWith('.rb')) return 'ruby';
    if (file.endsWith('.php')) return 'php';
    if (file.endsWith('.c')) return 'c';
    if (file.endsWith('.cpp') || file.endsWith('.cc') || file.endsWith('.cxx')) return 'cpp';
    if (file.endsWith('.cs')) return 'csharp';
    if (file.endsWith('.swift')) return 'swift';
    if (file.endsWith('.sh')) return 'bash';
    if (file.endsWith('.yml') || file.endsWith('.yaml')) return 'yaml';
    if (file.endsWith('.json')) return 'json';
    if (file.endsWith('.xml')) return 'xml';
    if (file.endsWith('.sql')) return 'sql';
    return 'text';
  }

  /**
   * Determine if safe to auto-apply without review (TIER 1: Safe Auto-Fix)
   * Based on Two-Tier Fix System: high confidence + low risk
   * This is a strict subset of canAutoFix() - only non-breaking, safe changes
   *
   * TIER 1 (Safe): Apply immediately, no testing needed (~15-20%)
   * - Unused code removal
   * - Style/formatting fixes
   * - Simple non-breaking refactors
   */
  private isSafeToAutoApply(group: IssueGroup): boolean {
    // Java: CheckStyle - All style/formatting fixes are safe
    if (group.tool === 'checkstyle') {
      return true;
    }

    // Java: PMD - Only simple, non-breaking fixes
    const safePMDRules = [
      'UnusedImports',
      'AvoidStarImport',
      'SystemPrintln',
      'GuardLogStatement',
      'SimplifyBooleanReturns',
      'SimplifyBooleanExpressions',
      'ClassWithOnlyPrivateConstructorsShouldBeFinal'
    ];
    if (safePMDRules.includes(group.rule)) {
      return true;
    }

    // TypeScript: Architecture - Only unused exports are safe
    if (group.tool === 'architecture' && group.rule === 'unused-export') {
      return true;
    }

    // TypeScript: Simple ESLint fixes (if available)
    if (group.tool === 'eslint') {
      const safeESLintRules = [
        'no-unused-vars',
        'no-console',
        'prefer-const',
        'no-var'
      ];
      if (safeESLintRules.includes(group.rule)) {
        return true;
      }
    }

    // Security, Dependencies, Type Errors: Require manual review (TIER 2)
    // - Semgrep: Security issues need testing
    // - Dependency-Check: CVE upgrades need testing
    // - npm-audit: Dependency upgrades need testing
    // - TypeScript: Type errors could break code
    return false;
  }

  /**
   * Extract required imports from fix
   */
  private extractRequiredImports(representative: EnrichedIssue): string[] | undefined {
    const correctedCode = representative.fixSuggestion?.correctedCode;
    const fix = (typeof correctedCode === 'string') ? correctedCode : '';
    const imports: string[] = [];

    if (fix.includes('AtomicBoolean')) imports.push('java.util.concurrent.atomic.AtomicBoolean');
    if (fix.includes('AtomicInteger')) imports.push('java.util.concurrent.atomic.AtomicInteger');
    if (fix.includes('AtomicLong')) imports.push('java.util.concurrent.atomic.AtomicLong');
    if (fix.includes('Collections.emptyList')) imports.push('java.util.Collections');

    return imports.length > 0 ? imports : undefined;
  }

  /**
   * Generate mapping index
   */
  private generateMapping(
    issues: EnrichedIssue[],
    groups: IssueGroup[],
    metadata: any,
    ideFixFiles: IDEFixFile[]
  ): IssueGroupMapping {
    // BUG FIX #33: Simplified mapping - only IDE fix files (no separate location files)
    return {
      version: "2.0",  // Version bump to reflect architecture change
      generated_at: new Date().toISOString(),
      repository: metadata.repository,
      pr_number: metadata.prNumber,
      total_issues: issues.length,
      total_groups: groups.length,
      groups: groups.map(group => {
        const groupId = this.sanitizeGroupId(group);
        const ideFixFile = ideFixFiles.find(f => f.groupId === groupId);
        return {
          id: groupId,
          rule: group.rule,
          tool: group.tool,
          severity: group.severity,
          count: group.count,
          category: group.category,
          attachment: undefined,  // BUG FIX #33: No more separate location files
          ide_fix_file: ideFixFile ? ideFixFile.filename : undefined
        };
      }),
      statistics: {
        by_severity: this.groupBySeverity(issues),
        by_category: this.groupByCategory(issues),
        by_tool: this.groupByTool(issues)
      }
    };
  }

  /**
   * Generate Business Impact Analysis with real financial calculations
   * SESSION 50 FIX: Pass detected language for language-specific recommendations
   * SESSION 73 FIX: Pass userTier for tier-specific sections (Upgrade to PRO, etc.)
   */
  private generateBusinessImpact(issues: EnrichedIssue[], groups: IssueGroup[]): string {
    return generateBusinessImpact(issues, groups, this.detectedLanguage, this.userTier);
  }

  private _REMOVED_legacyGenerateBusinessImpact(issues: EnrichedIssue[], groups: IssueGroup[]): string {
    // BLOCKERS ONLY: NEW/EXISTING_MODIFIED + critical/high
    const blocking = issues.filter(i =>
      (i.category === 'NEW' || i.category === 'EXISTING_MODIFIED') &&
      (i.severity === 'critical' || i.severity === 'high')
    );

    const blockingCritical = blocking.filter(i => i.severity === 'critical');
    const blockingHigh = blocking.filter(i => i.severity === 'high');
    const backlogMedium = issues.filter(i => i.severity === 'medium');
    const backlogLow = issues.filter(i => i.severity === 'low');

    // Calculate fix costs (hours) for BLOCKERS ONLY, with auto-fix adjustment
    let baseFixHours =
      (blockingCritical.length * 2) +      // 2 hours per critical blocker
      (blockingHigh.length * 1.5);         // 1.5 hours per high blocker

    // Adjust hours for auto-fixable groups: replace original severity time with a small per-occurrence cost
    const autoFixableGroups = groups.filter(g => this.canAutoFix(g));
    if (autoFixableGroups.length > 0) {
      // Original hours attributed to auto-fixable occurrences by severity
      const severityHours: Record<string, number> = { critical: 2, high: 1.5, medium: 1, low: 0.5 };
      let autoFixOriginalHours = 0;
      let autoFixAdjustedHours = 0;
      for (const g of autoFixableGroups) {
        const perIssue = severityHours[g.severity] ?? 1;
        // Only count auto-fix occurrences that are part of BLOCKERS
        const isBlockingGroup = blocking.some(i => i.rule === g.rule && i.tool === g.tool && i.severity === g.severity);
        if (!isBlockingGroup) continue;
        autoFixOriginalHours += perIssue * g.count;
        // Assume IDE auto-fix averages ~0.1h per occurrence including review
        autoFixAdjustedHours += 0.1 * g.count;
      }
      baseFixHours = Math.max(0, baseFixHours - autoFixOriginalHours + autoFixAdjustedHours);
    }

    const developerRate = 150; // $150/hour average
    const totalFixCost = Math.round(baseFixHours * developerRate);
    const fixDays = Math.ceil(baseFixHours / 8);

    // Calculate issues by detected category
    const securityIssues = issues.filter(i => i.detectedCategory === 'Security');
    const performanceIssues = issues.filter(i => i.detectedCategory === 'Performance');
    const architectureIssues = issues.filter(i => i.detectedCategory === 'Architecture');
    const dependencyIssues = issues.filter(i => i.detectedCategory === 'Dependencies');
    const codeQualityIssues = issues.filter(i => i.detectedCategory === 'Code Quality');

    // Calculate potential exploit costs
    const hasSecurityIssues = securityIssues.length > 0;
    const hasCriticalSecurity = securityIssues.filter(i => i.severity === 'critical').length > 0;

    let minExploitCost: number;
    let maxExploitCost: number;
    let exploitDesc: string;

    if (hasCriticalSecurity) {
      minExploitCost = 50000;
      maxExploitCost = 500000;
      exploitDesc = 'Data breach costs, compliance fines (GDPR: €20M or 4% revenue), remediation, legal fees';
    } else if (hasSecurityIssues) {
      minExploitCost = 25000;
      maxExploitCost = 200000;
      exploitDesc = 'Security incident response, downtime costs, reputation damage';
    } else if (blockingCritical.length > 0) {
      minExploitCost = 10000;
      maxExploitCost = 100000;
      exploitDesc = 'Production outages, emergency fixes, customer compensation';
    } else {
      minExploitCost = 5000;
      maxExploitCost = 50000;
      exploitDesc = 'Technical debt accumulation, slower development velocity';
    }

    const roi = Math.round(minExploitCost / Math.max(totalFixCost, 1));

    const immediateRisk = blocking.length > 0 ? '🔴 High' : '🟢 Low';

    return `## 💼 Business Impact Analysis

### Executive Summary
${blocking.length > 0
        ? `⚠️ **Critical attention required:** ${blocking.length} blocking issue${blocking.length > 1 ? 's' : ''} must be resolved before deployment to avoid security vulnerabilities or system failures.`
        : blockingCritical.length > 0
          ? `🟡 **Action recommended:** ${blockingCritical.length} critical issue${blockingCritical.length > 1 ? 's' : ''} should be addressed to maintain code quality and prevent future problems.`
          : `✅ **Acceptable quality:** Issues identified are manageable and can be addressed systematically through normal development cycles.`
      }

### Financial Impact
| Metric | Value |
|--------|-------|
 | **Fix Cost** | **$${totalFixCost.toLocaleString()}** (${baseFixHours.toFixed(1)} hours, ~${fixDays} developer-days at $${developerRate}/hour) |
| **Potential Exploit Cost** | **$${minExploitCost.toLocaleString()} - $${maxExploitCost.toLocaleString()}** |
| **Cost Breakdown** | ${exploitDesc} |
| **Return on Investment** | **${roi}x minimum return** by preventing issues now vs. fixing in production |
| **Risk-Adjusted Savings** | $${(minExploitCost - totalFixCost).toLocaleString()} minimum (prevention vs. remediation) |

### Risk Assessment
- **Immediate Risk:** ${immediateRisk}
  - ${blocking.length} blocking issues require attention before deployment
  - ${blockingCritical.length} critical issues need urgent resolution
  - ${blockingHigh.length} high-severity issues should be prioritized
  
-- **Future Risk:** ${backlogMedium.length + backlogLow.length > 0 ? '🟡 Medium' : '🟢 Low'}
  - Technical debt will compound if ${backlogMedium.length + backlogLow.length} backlog issues are not addressed
  - Code maintainability may decrease over time
  - ${securityIssues.length > 0 ? `Security vulnerabilities (${securityIssues.length}) pose ongoing risk` : 'Security posture is acceptable'}

### Risk Matrix by Category
| Category | This PR | Pre-existing | Code Fixes | Action Required |
|----------|---------|--------------|------------|-----------------|
| **Security** | ${securityIssues.filter(i => i.category === 'NEW' || i.category === 'EXISTING_MODIFIED').length} | ${securityIssues.filter(i => i.category === 'EXISTING_REST').length} | ${securityIssues.filter(i => this.hasActualCodeFix(i)).length} | ${this.getRiskImpactLevel(securityIssues.filter(i => i.category === 'NEW' || i.category === 'EXISTING_MODIFIED'))} |
| **Performance** | ${performanceIssues.filter(i => i.category === 'NEW' || i.category === 'EXISTING_MODIFIED').length} | ${performanceIssues.filter(i => i.category === 'EXISTING_REST').length} | ${performanceIssues.filter(i => this.hasActualCodeFix(i)).length} | ${this.getRiskImpactLevel(performanceIssues.filter(i => i.category === 'NEW' || i.category === 'EXISTING_MODIFIED'))} |
| **Architecture** | ${architectureIssues.filter(i => i.category === 'NEW' || i.category === 'EXISTING_MODIFIED').length} | ${architectureIssues.filter(i => i.category === 'EXISTING_REST').length} | ${architectureIssues.filter(i => this.hasActualCodeFix(i)).length} | ${this.getRiskImpactLevel(architectureIssues.filter(i => i.category === 'NEW' || i.category === 'EXISTING_MODIFIED'))} |
| **Dependencies** | ${dependencyIssues.filter(i => i.category === 'NEW' || i.category === 'EXISTING_MODIFIED').length} | ${dependencyIssues.filter(i => i.category === 'EXISTING_REST').length} | ${dependencyIssues.filter(i => this.hasActualCodeFix(i)).length} | ${this.getRiskImpactLevel(dependencyIssues.filter(i => i.category === 'NEW' || i.category === 'EXISTING_MODIFIED'))} |
| **Code Quality** | ${codeQualityIssues.filter(i => i.category === 'NEW' || i.category === 'EXISTING_MODIFIED').length} | ${codeQualityIssues.filter(i => i.category === 'EXISTING_REST').length} | ${codeQualityIssues.filter(i => this.hasActualCodeFix(i)).length} | ${this.getRiskImpactLevel(codeQualityIssues.filter(i => i.category === 'NEW' || i.category === 'EXISTING_MODIFIED'))} |

**Legend:**
- **This PR:** Issues in files modified by this PR (NEW + EXISTING_MODIFIED)
- **Pre-existing:** Issues in files NOT touched by this PR (EXISTING_REST)
- **Code Fixes:** Issues with ready-to-apply code (SESSION 92: excludes text-only guidance)
- **Action Required:** Priority based on severity of issues introduced/modified by this PR

### Recommendations
${(() => {
        // Check if blocking issues are auto-fixable
        const blockingAutoFixable = blocking.filter(i =>
          this.canAutoFix({ rule: i.rule, tool: i.tool, severity: i.severity } as IssueGroup)
        ).length;
        const allBlockingAutoFixable = blockingAutoFixable === blocking.length && blocking.length > 0;

        if (blocking.length > 0) {
          if (allBlockingAutoFixable) {
            return `
1. **Immediate Action:** Apply fixes for ${blocking.length} blocking issues using 1-click autofix (see IDE Integration section above)
2. **Quick Fix:** All blocking issues are auto-fixable - use LSP batch actions to fix in < 1 second
3. **Planning:** Schedule time for ${backlogMedium.length} medium-severity issues in upcoming sprints
4. **Continuous Improvement:** Track and reduce ${backlogLow.length} low-severity issues over time
`;
          } else {
            return `
1. **Immediate Action:** Resolve ${blocking.length} blocking issues before deployment (${blockingAutoFixable} auto-fixable, ${blocking.length - blockingAutoFixable} require manual review)
2. **Quick Fix:** Apply ${blockingAutoFixable} auto-fixable issues using 1-click autofix (see IDE Integration section)
3. **Priority:** Address remaining ${blocking.length - blockingAutoFixable} blockers manually
4. **Planning:** Schedule time for ${backlogMedium.length} medium-severity issues in upcoming sprints
5. **Continuous Improvement:** Track and reduce ${backlogLow.length} low-severity issues over time
`;
          }
        } else if (blockingCritical.length + blockingHigh.length > 0) {
          return `
1. **Priority:** Address ${blockingCritical.length} critical issues in current sprint
2. **Planning:** Schedule ${blockingHigh.length} high-severity issues for upcoming work
3. **Continuous Improvement:** Integrate static analysis into CI/CD to prevent new issues
`;
        } else {
          return `
1. **Maintain Quality:** Continue current development practices
2. **Address Backlog:** Systematically reduce ${backlogMedium.length + backlogLow.length} identified issues
3. **Prevention:** Integrate static analysis into CI/CD pipeline
`;
        }
      })()}

**Note:** Each issue group section above includes detailed business impact analysis specific to that issue type.`;
  }

  /**
   * Get exploit cost explanation helper
   */
  private getExploitCostExplanation(criticalCount: number, highCount: number, securityCount: number): string {
    return getExploitCostExplanation(criticalCount, highCount, securityCount);
  }

  /**
   * Get risk impact level helper
   * BUG FIX #75: Consider blocking status and severity for accurate risk assessment
   */
  private getRiskImpactLevel(categoryIssues: EnrichedIssue[]): string {
    return getRiskImpactLevel(categoryIssues);
  }

  /**
   * SESSION 85: Generate PRO Tier Fix Summary
   * Shows fix results with status, confidence scores, and pending issues
   * Only called for PRO/Enterprise tier users
   */
  private generatePROFixSummary(
    issues: EnrichedIssue[],
    groups: IssueGroup[],
    metadata: any
  ): string {
    const lines: string[] = [];

    // Count issues by fix status - SESSION 92 FIX: Separate code fixes vs guidance
    const codeFixIssues = issues.filter(i => this.hasActualCodeFix(i) && i.category !== 'RESOLVED');
    const guidanceIssues = issues.filter(i => this.hasTextGuidanceOnly(i) && i.category !== 'RESOLVED');
    const noFixIssues = issues.filter(i => !this.hasActualCodeFix(i) && !this.hasTextGuidanceOnly(i) && i.category !== 'RESOLVED');
    const resolvedByPR = issues.filter(i => i.category === 'RESOLVED');

    // Calculate fix rates
    const totalActive = codeFixIssues.length + guidanceIssues.length + noFixIssues.length;
    const codeFixRate = totalActive > 0 ? (codeFixIssues.length / totalActive * 100).toFixed(1) : '0.0';
    const guidanceRate = totalActive > 0 ? (guidanceIssues.length / totalActive * 100).toFixed(1) : '0.0';

    lines.push('## 🔧 Fix Summary (PRO)');
    lines.push('');
    lines.push('Code fixes are AI-generated and verified against tool rules. Text guidance requires manual review.');
    lines.push('');

    // Overall stats table - SESSION 92: Updated to show code fixes vs guidance
    lines.push('| Status | Count | Percentage |');
    lines.push('|--------|-------|------------|');
    lines.push(`| ✅ **Code Fixes** | ${codeFixIssues.length} | ${codeFixRate}% |`);
    lines.push(`| 📖 **Text Guidance** | ${guidanceIssues.length} | ${guidanceRate}% |`);
    lines.push(`| ⏳ **No Fix Available** | ${noFixIssues.length} | ${totalActive > 0 ? (noFixIssues.length / totalActive * 100).toFixed(1) : '0.0'}% |`);
    lines.push(`| 🎉 **Already Resolved** | ${resolvedByPR.length} | - |`);
    lines.push('');

    // Group issues with code fixes by category
    if (codeFixIssues.length > 0) {
      lines.push('### Successfully Fixed Issues (Code Fixes)');
      lines.push('');

      // Group by detected category
      const categories = ['Security', 'Performance', 'Architecture', 'Dependencies', 'Code Quality'];

      for (const category of categories) {
        const categoryIssues = codeFixIssues.filter(i => i.detectedCategory === category);
        if (categoryIssues.length === 0) continue;

        const categoryGroups = groups.filter(g =>
          categoryIssues.some(i => i.rule === g.rule && i.tool === g.tool)
        );

        lines.push(`#### ${category} Fixes (${categoryIssues.length})`);
        lines.push('');
        lines.push('| # | File | Rule | Status | Confidence |');
        lines.push('|---|------|------|--------|------------|');

        // Show up to 5 issues per category
        const displayIssues = categoryIssues.slice(0, 5);
        displayIssues.forEach((issue, idx) => {
          const fileName = issue.file.split('/').pop() || issue.file;
          const confidence = this.getFixConfidence(issue);
          lines.push(`| ${idx + 1} | ${fileName}:${issue.line || 0} | ${issue.rule} | ✅ FIXED | ${confidence}% |`);
        });

        if (categoryIssues.length > 5) {
          lines.push(`| ... | *${categoryIssues.length - 5} more issues* | | FIXED | |`);
        }
        lines.push('');
      }
    }

    // Text guidance issues that need manual review - SESSION 92
    const manualReviewIssues = [...guidanceIssues, ...noFixIssues];
    if (manualReviewIssues.length > 0) {
      lines.push('### Issues Requiring Manual Review');
      lines.push('');
      lines.push('These issues have text guidance or require human decision:');
      lines.push('');

      // Group by reason
      const manualReviewGroups = this.groupPendingByReason(manualReviewIssues);

      for (const [reason, reasonIssues] of Object.entries(manualReviewGroups)) {
        lines.push(`#### ${reason} (${reasonIssues.length} issues)`);
        lines.push('');

        // Show first issue as example
        const example = reasonIssues[0];
        lines.push(`- **Example**: \`${example.file.split('/').pop()}:${example.line || 0}\``);
        lines.push(`- **Rule**: ${example.rule}`);
        lines.push(`- **Reason**: ${this.getManualReviewReason(example)}`);
        lines.push('');
        lines.push(`**Recommendation**: ${this.getManualReviewRecommendation(example)}`);
        lines.push('');
        lines.push('---');
        lines.push('');
      }
    }

    // Apply Fixes CLI section - SESSION 92: Only show for code fixes
    if (codeFixIssues.length > 0) {
      lines.push('### Apply Code Fixes');
      lines.push('');
      lines.push('```bash');
      lines.push('# Apply all verified code fixes');
      lines.push(`codequal apply --analysis-id ${metadata.commitSHA || 'latest'}`);
      lines.push('');
      lines.push('# Review and commit');
      lines.push('git diff');
      lines.push(`git add -A && git commit -m "Apply CodeQual fixes for ${codeFixIssues.length} issues"`);
      lines.push('```');
      lines.push('');
      lines.push('**Other options:**');
      lines.push('');
      lines.push('```bash');
      lines.push('# Apply only security fixes');
      lines.push('codequal apply --category security');
      lines.push('');
      lines.push('# Interactive mode - review each fix');
      lines.push('codequal apply --interactive');
      lines.push('```');
      lines.push('');
    }

    // Business Impact Summary - SESSION 92: Updated calculations
    const estimatedManualTime = manualReviewIssues.length * 15; // 15 min per issue
    const autoFixTime = codeFixIssues.length * 5; // 5 min saved per auto-fix
    const timeSaved = Math.max(0, (codeFixIssues.length * 15) - autoFixTime);

    lines.push('### Business Impact');
    lines.push('');
    lines.push('| Metric | Value |');
    lines.push('|--------|-------|');
    lines.push(`| Estimated Manual Fix Time | ${Math.round(estimatedManualTime / 60)}h ${estimatedManualTime % 60}m |`);
    lines.push(`| Auto-Fix Time | ${Math.round(autoFixTime / 60)}h ${autoFixTime % 60}m |`);
    lines.push(`| **Time Saved** | **${Math.round(timeSaved / 60)}h ${timeSaved % 60}m (${codeFixIssues.length > 0 ? Math.round(timeSaved / (codeFixIssues.length * 15) * 100) : 0}%)** |`);
    lines.push('');

    lines.push('---');

    return lines.join('\n');
  }

  /**
   * Get fix confidence percentage based on fix tier and issue characteristics
   */
  private getFixConfidence(issue: EnrichedIssue): number {
    // SESSION 92 FIX: Use hasActualCodeFix to check for real fixes
    if (!this.hasActualCodeFix(issue)) return 0;

    // Use severity confidence if available
    if (issue.severityConfidence === 'high') return 95;
    if (issue.severityConfidence === 'medium') return 85;
    if (issue.severityConfidence === 'low') return 70;

    // Default based on category
    if (issue.detectedCategory === 'Security') return 92;
    if (issue.detectedCategory === 'Code Quality') return 88;
    return 85;
  }

  /**
   * Group pending issues by their manual review reason
   */
  private groupPendingByReason(issues: EnrichedIssue[]): Record<string, EnrichedIssue[]> {
    const groups: Record<string, EnrichedIssue[]> = {};

    for (const issue of issues) {
      const reason = this.classifyManualReviewReason(issue);
      if (!groups[reason]) groups[reason] = [];
      groups[reason].push(issue);
    }

    return groups;
  }

  /**
   * Classify why an issue needs manual review
   */
  private classifyManualReviewReason(issue: EnrichedIssue): string {
    // Check common patterns
    if (issue.rule.toLowerCase().includes('upgrade') ||
        issue.rule.toLowerCase().includes('dependency')) {
      return 'Major Dependency Upgrade';
    }
    if (issue.rule.toLowerCase().includes('complexity') ||
        issue.rule.toLowerCase().includes('cognitive')) {
      return 'Complex Refactoring Required';
    }
    if (issue.detectedCategory === 'Architecture') {
      return 'Architectural Decision';
    }
    // SESSION 92 FIX: Use hasActualCodeFix for consistency
    if (issue.detectedCategory === 'Security' && !this.hasActualCodeFix(issue)) {
      return 'Security Review Required';
    }
    return 'Context-Dependent Fix';
  }

  /**
   * Get explanation for why manual review is needed
   */
  private getManualReviewReason(issue: EnrichedIssue): string {
    const classification = this.classifyManualReviewReason(issue);

    switch (classification) {
      case 'Major Dependency Upgrade':
        return 'This upgrade involves breaking changes that require careful review';
      case 'Complex Refactoring Required':
        return 'The fix requires architectural decisions about code structure';
      case 'Architectural Decision':
        return 'This involves design patterns and team conventions';
      case 'Security Review Required':
        return 'Security-sensitive changes require human verification';
      default:
        return 'The fix depends on context not available to automated analysis';
    }
  }

  /**
   * Get recommendation for manual review issues
   */
  private getManualReviewRecommendation(issue: EnrichedIssue): string {
    const classification = this.classifyManualReviewReason(issue);

    switch (classification) {
      case 'Major Dependency Upgrade':
        return 'Plan this as a separate PR with thorough testing. Check migration guides.';
      case 'Complex Refactoring Required':
        return 'Consider extracting to smaller methods or services. Discuss with team.';
      case 'Architectural Decision':
        return 'Review with tech lead. Consider impact on related components.';
      case 'Security Review Required':
        return 'Verify with security team. Ensure compliance with security policies.';
      default:
        return 'Review the code context and apply the suggested pattern manually.';
    }
  }

  /**
   * Compute Skill Score from issues: start at 50, deduct NEW/EXISTING_MODIFIED
   * by severity weights, add resolved by same weights. Clamp to 0..100.
   */
  private calculateIssueWeightedSkillScore(issues: EnrichedIssue[]): number {
    return calculateIssueWeightedSkillScore(issues);
  }

  /**
   * Generate Educational Resources based on actual issues found
   */
  private generateEducationalResources(issues: EnrichedIssue[]): string {
    const critical = issues.filter(i => i.severity === 'critical');
    const high = issues.filter(i => i.severity === 'high');
    const priorityIssues = [...critical, ...high];

    // If no priority issues, show general message
    if (priorityIssues.length === 0) {
      return `## 📚 Educational Resources

✅ **No critical or high-priority issues found.**

Continue following best practices and consider integrating static analysis into your CI/CD pipeline to maintain this standard.

### General Resources
- [🧹 Clean Code Principles](https://www.oreilly.com/library/view/clean-code-a/9780136083238/) - Robert C. Martin
- [📏 Effective Java](https://www.oreilly.com/library/view/effective-java-3rd/9780134686097/) - Joshua Bloch
- [🏗️  Software Architecture Fundamentals](https://www.oreilly.com/library/view/software-architecture-fundamentals/9781491998991/)`;
    }

    let content = `## 📚 Educational Resources

**Priority training for ${priorityIssues.length} critical/high-severity issues:**

`;

    // Group by detected category
    const categories = Array.from(new Set(priorityIssues.map(i => i.detectedCategory).filter(Boolean)));

    if (categories.length === 0) {
      // Fallback if categories not detected - use tool-based categorization
      content += `### Immediate Focus Areas\n\n`;
      content += `**General Code Quality & Security:**\n`;
      content += `- [📚 OWASP Top 10](https://owasp.org/www-project-top-ten/) - Security vulnerabilities\n`;
      content += `- [🧹 Clean Code](https://www.oreilly.com/library/view/clean-code-a/9780136083238/) - Code quality principles\n`;
      content += `- [🔒 Secure Coding Practices](https://owasp.org/www-project-secure-coding-practices-quick-reference-guide/)\n\n`;
    } else {
      // Generate category-specific resources
      categories.forEach(category => {
        const categoryIssues = priorityIssues.filter(i => i.detectedCategory === category);
        const criticalCount = categoryIssues.filter(i => i.severity === 'critical').length;
        const highCount = categoryIssues.filter(i => i.severity === 'high').length;

        content += `### ${category} (${criticalCount} critical, ${highCount} high)\n\n`;
        content += `**Priority:** ${criticalCount > 0 ? '🔴 Immediate' : '🟠 High'}\n\n`;

        switch (category) {
          case 'Security':
            content += `**Phase 1: Security Fundamentals (Week 1-2)**\n`;
            content += `- [📚 OWASP Top 10](https://owasp.org/www-project-top-ten/) - Top security risks and mitigations\n`;
            content += `- [🔒 OWASP Cheat Sheet Series](https://cheatsheetseries.owasp.org/) - Quick security reference\n`;
            content += `- [🎯 CWE Top 25](https://cwe.mitre.org/top25/) - Most dangerous software weaknesses\n`;
            content += `- [📖 Secure Coding in Java](https://www.oracle.com/java/technologies/javase/seccodeguide.html) - Oracle guidelines\n\n`;

            content += `**Phase 2: Specific Vulnerabilities (Week 3-4)**\n`;
            content += `- [🛡️ SQL Injection Prevention](https://cheatsheetseries.owasp.org/cheatsheets/SQL_Injection_Prevention_Cheat_Sheet.html)\n`;
            content += `- [🔐 Command Injection Defense](https://cheatsheetseries.owasp.org/cheatsheets/OS_Command_Injection_Defense_Cheat_Sheet.html)\n`;
            content += `- [🔑 Cryptographic Storage](https://cheatsheetseries.owasp.org/cheatsheets/Cryptographic_Storage_Cheat_Sheet.html)\n`;
            content += `- [🎓 PortSwigger Web Security Academy](https://portswigger.net/web-security) - Interactive labs\n\n`;
            break;

          case 'Performance':
            content += `**Phase 1: Performance Fundamentals (Week 1-2)**\n`;
            content += `- [⚡ Java Performance Tuning Guide](https://www.oracle.com/technical-resources/articles/javase/perftuning.html) - Official Oracle guide\n`;
            content += `- [📖 Java Concurrency in Practice](https://jcip.net/) - Brian Goetz (essential reading)\n`;
            content += `- [🔧 JVM Performance Optimization](https://docs.oracle.com/javase/8/docs/technotes/guides/vm/gctuning/) - GC tuning\n`;
            content += `- [📊 Profiling with JMH](https://openjdk.java.net/projects/code-tools/jmh/) - Microbenchmarking\n\n`;

            content += `**Phase 2: Advanced Topics (Week 3-4)**\n`;
            content += `- [🎯 Lock-Free Programming](https://mechanical-sympathy.blogspot.com/) - Martin Thompson's blog\n`;
            content += `- [📚 High Performance Java Persistence](https://vladmihalcea.com/books/high-performance-java-persistence/) - Vlad Mihalcea\n`;
            content += `- [🔬 Memory Management Deep Dive](https://www.baeldung.com/java-memory-management-interview-questions)\n\n`;
            break;

          case 'Architecture':
            content += `**Phase 1: Design Principles (Week 1-2)**\n`;
            content += `- [🏗️  Clean Architecture](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html) - Robert C. Martin\n`;
            content += `- [🎯 SOLID Principles](https://www.digitalocean.com/community/conceptual_articles/s-o-l-i-d-the-first-five-principles-of-object-oriented-design) - OOD fundamentals\n`;
            content += `- [📚 Design Patterns](https://refactoring.guru/design-patterns) - Gang of Four patterns\n`;
            content += `- [🔧 Effective Java](https://www.oreilly.com/library/view/effective-java-3rd/9780134686097/) - Joshua Bloch\n\n`;

            content += `**Phase 2: Architecture Patterns (Week 3-4)**\n`;
            content += `- [🎨 Microservices Patterns](https://microservices.io/patterns/) - Chris Richardson\n`;
            content += `- [📖 Domain-Driven Design](https://www.domainlanguage.com/ddd/) - Eric Evans\n`;
            content += `- [🏛️ Software Architecture Fundamentals](https://www.oreilly.com/library/view/software-architecture-fundamentals/9781491998991/)\n\n`;
            break;

          case 'Dependencies':
            content += `**Phase 1: Dependency Management (Week 1-2)**\n`;
            content += `- [📦 Maven Dependency Management](https://maven.apache.org/guides/introduction/introduction-to-dependency-mechanism.html) - Official guide\n`;
            content += `- [🛡️ OWASP Dependency-Check](https://owasp.org/www-project-dependency-check/) - Vulnerability scanning\n`;
            content += `- [🔄 Semantic Versioning](https://semver.org/) - Version numbering best practices\n`;
            content += `- [🔍 Snyk Learn](https://learn.snyk.io/) - Security vulnerability education\n\n`;

            content += `**Phase 2: Security & Updates (Week 3-4)**\n`;
            content += `- [🚨 CVE Database](https://cve.mitre.org/) - Known vulnerabilities\n`;
            content += `- [📊 National Vulnerability Database](https://nvd.nist.gov/) - NIST CVE details\n`;
            content += `- [🔒 Supply Chain Security](https://slsa.dev/) - Software supply chain levels\n\n`;
            break;

          case 'Code Quality':
          default:
            content += `**Phase 1: Clean Code Basics (Week 1-2)**\n`;
            content += `- [🧹 Clean Code](https://www.oreilly.com/library/view/clean-code-a/9780136083238/) - Robert C. Martin\n`;
            content += `- [📏 Refactoring Guide](https://refactoring.guru/refactoring) - Martin Fowler techniques\n`;
            content += `- [🔧 Code Smells](https://refactoring.guru/refactoring/smells) - Common anti-patterns\n`;
            content += `- [📖 The Pragmatic Programmer](https://pragprog.com/titles/tpp20/) - Best practices\n\n`;

            content += `**Phase 2: Advanced Topics (Week 3-4)**\n`;
            content += `- [✅ Test-Driven Development](https://www.oreilly.com/library/view/test-driven-development/0321146530/) - Kent Beck\n`;
            content += `- [🎯 Working Effectively with Legacy Code](https://www.oreilly.com/library/view/working-effectively-with/0131177052/) - Michael Feathers\n`;
            content += `- [📊 Code Quality Metrics](https://www.baeldung.com/java-static-code-analysis-tutorial) - Static analysis\n\n`;
            break;
        }
      });
    }

    // BUG-090 FIX: Pass language parameter for language-specific resources
    return generateEducationalResources(issues, this.detectedLanguage);
  }

  private async generateEducationalResourcesBrave(issues: EnrichedIssue[]): Promise<string> {
    // BUG-090 FIX: Pass language parameter for language-specific resources
    return generateEducationalResourcesBrave(issues, this.detectedLanguage);
  }

  /**
   * BUG FIX #32: Extract Git teammates from repository history
   * Adapted from v9-integrated-analyzer.ts discoverTeamFromGit()
   *
   * BUG #4 FIX (Session 30): Filter to only ACTIVE/CURRENT team members
   * - Only includes developers who committed in the last 6 months
   * - Removes historical developers who left the team
   * - Solves "Ranking: #3 of 3 developers" when only 1 active developer
   */
  private discoverTeamFromGit(repoPath: string): Array<{ email: string; name?: string; totalPRs?: number }> {
    try {

      if (!fs.existsSync(`${repoPath}/.git`)) {
        return [];
      }

      // BUG #4 FIX: Get commits from last 6 months only (active developers)
      // This filters out historical developers who left the team
      // SECURITY FIX: Quote repoPath to prevent command injection
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
      const sinceDate = sixMonthsAgo.toISOString().split('T')[0];

      const result = execSync(
        `git log --since="${sinceDate}" --format="%ae:::%an" --no-merges`,
        { cwd: repoPath, encoding: 'utf-8', maxBuffer: 10 * 1024 * 1024 }
      );

      const lines = result.trim().split('\n').filter(line => line.trim());
      const map = new Map<string, { email: string; name?: string; totalPRs?: number }>();

      // Test data patterns to exclude
      const testEmails = ['test@example.com', 'example@test.com', 'test@test.com'];
      const testNames = ['test user', 'example user', 'john doe', 'jane doe'];

      // BUG #4 COMPLETE FIX (Session 30): Filter out bot/AI commits
      // Excludes Claude Code, Anthropic bots, and other automated commits
      const botEmailPatterns = [
        '@anthropic.com',           // Anthropic bots
        'claude',                   // Claude Code commits
        'bot@',                     // Generic bot emails
        '[bot]',                    // GitHub bot notation
        'no-reply',                 // No-reply addresses
        'noreply'                   // Alternative no-reply format
      ];

      for (const line of lines) {
        const [email, name] = line.split(':::');
        if (!email) continue;

        const emailLower = email.trim().toLowerCase();
        const nameLower = (name || '').trim().toLowerCase();

        // Skip test users
        if (testEmails.some(testEmail => emailLower === testEmail || emailLower.includes('test'))) {
          continue;
        }
        if (testNames.some(testName => nameLower.includes(testName))) {
          continue;
        }

        // BUG #4 FIX: Skip bot/AI commits (Claude Code, Anthropic, etc.)
        if (botEmailPatterns.some(pattern => emailLower.includes(pattern))) {
          continue;
        }

        const key = emailLower;
        if (!map.has(key)) {
          map.set(key, { email: key, name: (name || '').trim(), totalPRs: 1 });
        } else {
          const v = map.get(key)!;
          v.totalPRs += 1;
        }
      }

      return Array.from(map.values()).slice(0, 25); // Top 25 contributors
    } catch (error) {
      console.warn('[V9GroupedReportFormatter] Failed to discover Git teammates:', error);
      return [];
    }
  }

  /**
   * BUG-095 FIX: Calculate real repository statistics from the repo path
   * Replaces hardcoded values with actual file counts and lines of code
   *
   * @param repoPath - Path to the cloned repository
   * @param language - Detected language for language-specific LOC counting
   * @param baseBranch - Optional base branch for diff stats
   * @returns Repository statistics object
   */
  private calculateRepoStats(repoPath: string, language: string, baseBranch?: string): {
    totalFiles: number;
    totalLinesOfCode: number;
    filesModified: number;
    linesAdded: number;
    linesDeleted: number;
  } {
    const defaultStats = {
      totalFiles: 0,
      totalLinesOfCode: 0,
      filesModified: 0,
      linesAdded: 0,
      linesDeleted: 0
    };

    if (!repoPath || !fs.existsSync(repoPath)) {
      console.warn('[BUG-095] No repoPath provided, using default stats');
      return defaultStats;
    }

    try {
      // Count total files (excluding .git directory)
      const totalFilesResult = execSync(
        `find . -type f -not -path './.git/*' | wc -l`,
        { cwd: repoPath, encoding: 'utf-8', timeout: 30000 }
      );
      const totalFiles = parseInt(totalFilesResult.trim(), 10) || 0;

      // Get file extension for language-specific LOC counting
      const langExtensions: Record<string, string[]> = {
        'java': ['*.java'],
        'python': ['*.py'],
        'typescript': ['*.ts', '*.tsx'],
        'javascript': ['*.js', '*.jsx'],
        'go': ['*.go'],
        'ruby': ['*.rb'],
        'rust': ['*.rs'],
        'csharp': ['*.cs'],
        'php': ['*.php']
      };

      const extensions = langExtensions[language.toLowerCase()] || ['*'];

      // Count lines of code for the detected language (limit to first 500 files for performance)
      let totalLinesOfCode = 0;
      for (const ext of extensions) {
        try {
          const filesResult = execSync(
            `find . -type f -name "${ext}" -not -path './.git/*' | head -500`,
            { cwd: repoPath, encoding: 'utf-8', timeout: 30000 }
          );
          const files = filesResult.trim().split('\n').filter(f => f);

          for (const file of files) {
            try {
              const lines = parseInt(
                execSync(`wc -l < "${file}"`, { cwd: repoPath, encoding: 'utf-8', timeout: 5000 }).trim(),
                10
              );
              totalLinesOfCode += lines || 0;
            } catch {
              // Skip files that can't be read
            }
          }
        } catch {
          // Skip if extension search fails
        }
      }

      // Get diff stats if base branch is available
      let filesModified = 0;
      let linesAdded = 0;
      let linesDeleted = 0;

      if (baseBranch) {
        try {
          const diffStats = execSync(
            `git diff --shortstat ${baseBranch}...HEAD 2>/dev/null || git diff --shortstat HEAD~10...HEAD 2>/dev/null || echo ""`,
            { cwd: repoPath, encoding: 'utf-8', timeout: 30000 }
          );

          const filesMatch = diffStats.match(/(\d+) files? changed/);
          const addMatch = diffStats.match(/(\d+) insertions?\(/);
          const delMatch = diffStats.match(/(\d+) deletions?\(/);

          filesModified = filesMatch ? parseInt(filesMatch[1], 10) : 0;
          linesAdded = addMatch ? parseInt(addMatch[1], 10) : 0;
          linesDeleted = delMatch ? parseInt(delMatch[1], 10) : 0;
        } catch {
          // Fallback: use issue files as estimate
        }
      }

      console.log(`[BUG-095] Calculated repo stats: ${totalFiles} files, ${totalLinesOfCode} LOC, ${filesModified} modified`);

      return {
        totalFiles,
        totalLinesOfCode,
        filesModified,
        linesAdded,
        linesDeleted
      };
    } catch (error) {
      console.warn('[BUG-095] Failed to calculate repo stats:', error);
      return defaultStats;
    }
  }

  /**
   * Generate skills tracking section with ranking and trends
   * BUG-096 FIX: Now shows Git-based data even without Supabase connection
   */
  private async generateSkillsTracking(issues: EnrichedIssue[], metadata: any): Promise<string> {
    // Skip if no author info available
    if (!metadata.prAuthor || !metadata.prAuthorEmail) {
      return '';
    }

    // BUG-096 FIX: If no Supabase, use Git-only fallback
    if (!this.skillScoreManager) {
      return this.generateGitBasedSkillsTracking(issues, metadata);
    }

    try {
      // BUG FIX #14-16: Calculate current PR scores first, then build accurate leaderboard
      // This fixes: ranking logic, score mismatch, and fake teammates

      // Get score trend (last 5 PRs)
      const history = await this.skillScoreManager.getScoreTrend(metadata.prAuthorEmail, metadata.repository);

      // Calculate current category scores from this PR
      // BUG FIX: Only count NEW + EXISTING_MODIFIED issues (exclude EXISTING_REST)
      const security = issues.filter(i =>
        i.detectedCategory === 'Security' &&
        (i.category === 'NEW' || i.category === 'EXISTING_MODIFIED')
      );
      const performance = issues.filter(i =>
        i.detectedCategory === 'Performance' &&
        (i.category === 'NEW' || i.category === 'EXISTING_MODIFIED')
      );
      const architecture = issues.filter(i =>
        i.detectedCategory === 'Architecture' &&
        (i.category === 'NEW' || i.category === 'EXISTING_MODIFIED')
      );
      const dependencies = issues.filter(i =>
        i.detectedCategory === 'Dependencies' &&
        (i.category === 'NEW' || i.category === 'EXISTING_MODIFIED')
      );
      const codeQuality = issues.filter(i =>
        i.detectedCategory === 'Code Quality' &&
        (i.category === 'NEW' || i.category === 'EXISTING_MODIFIED')
      );

      // BUG #1 FIX (Session 30): Fetch developer's baseline score from Supabase
      // New users: 50 (default), Existing users: their last overall score (e.g., 40)
      // This fixes Security score showing 21/100 instead of 11/100
      const developerBaseline = await this.skillScoreManager.getBaselineScore(
        metadata.prAuthorEmail,
        metadata.repository
      );
      console.log(`[Skills] Using baseline ${developerBaseline} for ${metadata.prAuthorEmail} (Supabase saved score)`);

      // BUG-101 FIX: Categories with NO issues should return BASELINE (from Supabase or 50 for new users)
      // NOT 100. This ensures consistent scoring:
      // - First-time users: baseline = 50
      // - Returning users: baseline = their last saved score
      // - Empty category = no NEW issues introduced = keep baseline score
      // Previous BUG-093 was WRONG - returning 100 inflated scores artificially
      const calculateSkillCategoryScore = (categoryIssues: EnrichedIssue[]): number => {
        if (categoryIssues.length === 0) {
          // No NEW issues in this category = keep baseline (not 100!)
          return developerBaseline;
        }
        // Has issues - calculate from baseline with deductions
        return this.calculateCategoryScore(categoryIssues, developerBaseline);
      };

      // Calculate category scores using developer's baseline (only for categories WITH issues)
      const categoryScores = {
        security: calculateSkillCategoryScore(security),
        performance: calculateSkillCategoryScore(performance),
        architecture: calculateSkillCategoryScore(architecture),
        dependencies: calculateSkillCategoryScore(dependencies),
        codeQuality: calculateSkillCategoryScore(codeQuality)
      };

      // BUG #2 DEBUG (Session 30): Log individual category scores to verify calculation
      console.log(`[Skills] Category Scores Breakdown:`);
      console.log(`  Security: ${categoryScores.security}`);
      console.log(`  Performance: ${categoryScores.performance}`);
      console.log(`  Architecture: ${categoryScores.architecture}`);
      console.log(`  Dependencies: ${categoryScores.dependencies}`);
      console.log(`  Code Quality: ${categoryScores.codeQuality}`);

      // BUG FIX #44: Skill score = AVERAGE of category scores
      const currentPRScore = Math.round(
        (categoryScores.security + categoryScores.performance + categoryScores.architecture +
          categoryScores.dependencies + categoryScores.codeQuality) / 5
      );
      console.log(`[Skills] Overall Score: (${categoryScores.security} + ${categoryScores.performance} + ${categoryScores.architecture} + ${categoryScores.dependencies} + ${categoryScores.codeQuality}) / 5 = ${currentPRScore}`);

      // BUG FIX: Use normalized email comparison to prevent duplicates
      const normalizeEmailForDedup = (email: string) => {
        if (!email) return '';
        const noreplyMatch = email.match(/(?:\d+\+)?([^@]+)@users\.noreply\.github\.com/i);
        if (noreplyMatch) {
          return noreplyMatch[1].toLowerCase();
        }
        return email.toLowerCase();
      };

      // BUG FIX #32: Fetch Git teammates first, then merge with Supabase data
      let gitTeammates: Array<{ email: string; name?: string; totalPRs?: number }> = [];
      if (this.repoPath) {
        gitTeammates = this.discoverTeamFromGit(this.repoPath);
        console.log(`[V9GroupedReportFormatter] Discovered ${gitTeammates.length} Git teammates from repository`);
      }

      // BUG FIX #57: Pass repository to get repo-specific leaderboard (prevents cross-repo contamination)
      // Build team leaderboard from Supabase (only actual teammates from this repository)
      let supabaseLeaderboard = await this.skillScoreManager.getLeaderboard(100, metadata.repository); // Repository-specific

      // BUG FIX: Filter out users not from this repository
      // Only include users who have commits in this repository's Git history
      const gitEmails = new Set(gitTeammates.map(t => normalizeEmailForDedup(t.email)));

      // Filter out obviously fake test data (names like "unknown", "Test Developer", etc.)
      const fakeNames = ['unknown', 'test developer', 'alice developer', 'bob developer', 'test', 'codequal test'];
      const testEmails = ['test@codequal.local', 'test@example.com', 'test-user@example.com'];
      supabaseLeaderboard = supabaseLeaderboard.filter((dev: any) => {
        const nameLower = (dev.name || '').toLowerCase();
        const emailLower = (dev.email || '').toLowerCase();

        // Filter out fake names
        if (fakeNames.some(fake => nameLower.includes(fake))) {
          return false;
        }

        // Filter out test emails
        if (testEmails.some(testEmail => emailLower === testEmail || emailLower.includes('test@'))) {
          return false;
        }

        // BUG FIX: Only include users who have commits in this repository
        // If we have Git teammates, only show users from Git history
        if (gitEmails.size > 0) {
          return gitEmails.has(normalizeEmailForDedup(dev.email));
        }

        // If no Git history available, include all Supabase users for this repo
        return true;
      });

      // BUG FIX #32: Merge Git teammates with Supabase teammates
      // For Git teammates not in Supabase, add them with baseline 50/100 score
      const teamLeaderboard = [...supabaseLeaderboard];

      for (const gitDev of gitTeammates) {
        const normalizedGitEmail = normalizeEmailForDedup(gitDev.email);
        const existsInSupabase = teamLeaderboard.some((dev: any) =>
          normalizeEmailForDedup(dev.email) === normalizedGitEmail ||
          (dev.name && gitDev.name && dev.name.toLowerCase().trim() === gitDev.name.toLowerCase().trim())
        );

        if (!existsInSupabase) {
          // Add Git teammate with baseline score (hasn't been analyzed yet)
          teamLeaderboard.push({
            name: gitDev.name || gitDev.email,
            email: gitDev.email,
            score: 50,  // Baseline: neutral score
            avgScore: 50,
            totalPRs: gitDev.totalPRs || 0  // Use Git commit count if available
          });
        }
      }

      // Update or add current developer with current PR score
      console.log(`[Skills] DEBUG: currentPRScore calculated as ${currentPRScore}`);
      console.log(`[Skills] DEBUG: Looking for ${metadata.prAuthorEmail} in leaderboard of ${teamLeaderboard.length} devs`);

      // BUG FIX: Normalize email comparison to handle GitHub's different email formats
      // GitHub uses: username@users.noreply.github.com OR userid+username@users.noreply.github.com
      const normalizeEmail = (email: string) => {
        if (!email) return '';
        // Extract username from GitHub noreply emails
        const noreplyMatch = email.match(/(?:\d+\+)?([^@]+)@users\.noreply\.github\.com/i);
        if (noreplyMatch) {
          return noreplyMatch[1].toLowerCase(); // Return just the username part
        }
        return email.toLowerCase();
      };

      const normalizedAuthorEmail = normalizeEmail(metadata.prAuthorEmail);
      console.log(`[Skills] DEBUG: Normalized email: ${normalizedAuthorEmail}`);

      const currentDevIndex = teamLeaderboard.findIndex((d: any) =>
        normalizeEmail(d.email) === normalizedAuthorEmail ||
        (d.name && metadata.prAuthor && d.name.toLowerCase().trim() === metadata.prAuthor.toLowerCase().trim())
      );
      console.log(`[Skills] DEBUG: Found at index ${currentDevIndex}`);

      if (currentDevIndex >= 0) {
        // Update existing entry with current PR score
        const oldScore = teamLeaderboard[currentDevIndex].score;
        console.log(`[Skills] Updating ${metadata.prAuthor} score from ${oldScore} to ${currentPRScore}`);
        teamLeaderboard[currentDevIndex].score = currentPRScore;
        // Also update avgScore to reflect the current calculated score
        teamLeaderboard[currentDevIndex].avgScore = currentPRScore;
        console.log(`[Skills] DEBUG: After update, score is now ${teamLeaderboard[currentDevIndex].score}`);
      } else {
        // Add current developer
        console.log(`[Skills] Adding ${metadata.prAuthor} with score ${currentPRScore}`);
        teamLeaderboard.push({
          name: metadata.prAuthor,
          email: metadata.prAuthorEmail,
          score: currentPRScore,
          avgScore: currentPRScore,
          totalPRs: 1
        });
      }

      // Sort by score (descending) to get correct ranking
      console.log(`[Skills] DEBUG: Before sort, ${metadata.prAuthor} score is ${teamLeaderboard.find((d: any) => normalizeEmail(d.email) === normalizedAuthorEmail)?.score}`);
      console.log(`[Skills] DEBUG: Before sort, all entries with matching normalized email:`);
      teamLeaderboard.forEach((d: any, idx: number) => {
        if (normalizeEmail(d.email) === normalizedAuthorEmail) {
          console.log(`[Skills] DEBUG:   [${idx}] ${d.email}: score=${d.score}, avgScore=${d.avgScore}`);
        }
      });

      teamLeaderboard.sort((a: any, b: any) => b.score - a.score);

      console.log(`[Skills] DEBUG: After sort, ${metadata.prAuthor} score is ${teamLeaderboard.find((d: any) => normalizeEmail(d.email) === normalizedAuthorEmail)?.score}`);
      console.log(`[Skills] DEBUG: After sort, all entries with matching normalized email:`);
      teamLeaderboard.forEach((d: any, idx: number) => {
        if (normalizeEmail(d.email) === normalizedAuthorEmail) {
          console.log(`[Skills] DEBUG:   [${idx}] ${d.email}: score=${d.score}, avgScore=${d.avgScore}`);
        }
      });

      // Calculate rank (position in sorted leaderboard) - use normalized email
      const rank = teamLeaderboard.findIndex((d: any) => normalizeEmail(d.email) === normalizedAuthorEmail) + 1;
      const totalDevelopers = teamLeaderboard.length;

      // Team average from cleaned leaderboard
      const teamAvg = teamLeaderboard.length > 0
        ? Math.round(teamLeaderboard.reduce((sum: number, dev: any) => sum + dev.score, 0) / teamLeaderboard.length)
        : 50;

      // SESSION 25 DEBUG: Show full leaderboard to understand ranking
      console.log(`[Skills] DEBUG: Full leaderboard (sorted by score):`);
      teamLeaderboard.forEach((dev: any, idx: number) => {
        console.log(`[Skills] DEBUG:   [${idx}] ${dev.name || dev.email}: ${dev.score}/100`);
      });

      let content = `## 👥 Skills Tracking\n\n`;

      // BUG #4 FIX (Session 30): Only show ranking when there are multiple developers
      // Solo developer (totalDevelopers === 1) doesn't need ranking display
      content += `### ${metadata.prAuthor}'s Performance\n\n`;
      content += `**Overall Score:** ${currentPRScore}/100\n`;
      if (rank > 0 && totalDevelopers > 1) {
        content += `**Ranking:** #${rank} of ${totalDevelopers} developers\n`;
      }
      content += `**Team Average:** ${teamAvg}/100\n\n`;

      // Category Breakdown
      content += `### Category Breakdown\n\n`;
      content += `| Category | Your Score | Team Avg | Status |\n`;
      content += `|----------|------------|----------|--------|\n`;
      content += `| 🔒 Security | ${categoryScores.security}/100 | ${teamAvg}/100 | ${this.getStatusEmoji(categoryScores.security, teamAvg, totalDevelopers)} |\n`;
      content += `| ⚡ Performance | ${categoryScores.performance}/100 | ${teamAvg}/100 | ${this.getStatusEmoji(categoryScores.performance, teamAvg, totalDevelopers)} |\n`;
      content += `| 🏗️  Architecture | ${categoryScores.architecture}/100 | ${teamAvg}/100 | ${this.getStatusEmoji(categoryScores.architecture, teamAvg, totalDevelopers)} |\n`;
      content += `| 📦 Dependencies | ${categoryScores.dependencies}/100 | ${teamAvg}/100 | ${this.getStatusEmoji(categoryScores.dependencies, teamAvg, totalDevelopers)} |\n`;
      content += `| ✨ Code Quality | ${categoryScores.codeQuality}/100 | ${teamAvg}/100 | ${this.getStatusEmoji(categoryScores.codeQuality, teamAvg, totalDevelopers)} |\n\n`;

      // BUG #3 FIX (Session 30): Clarify this is developer's OWN performance trend (not team comparison)
      // Shows "Your Performance Trend" even for solo developers (tracks personal improvement)
      if (history && history.length > 1 && !history.every((v: number) => v === history[0])) {
        const trend = history[history.length - 1] > history[0] ? '📈 Improving' :
          history[history.length - 1] < history[0] ? '📉 Declining' : '➡️  Stable';

        content += `### Your Performance Trend (Last ${history.length} PRs)\n\n`;
        content += `**Status:** ${trend}\n`;
        content += `**Scores:** ${history.join(' → ')}\n\n`;
      }

      // Learning Recommendations based on weak categories
      const weakCategories = [];
      if (categoryScores.security < teamAvg) weakCategories.push('Security');
      if (categoryScores.performance < teamAvg) weakCategories.push('Performance');
      if (categoryScores.architecture < teamAvg) weakCategories.push('Architecture');
      if (categoryScores.dependencies < teamAvg) weakCategories.push('Dependencies');
      if (categoryScores.codeQuality < teamAvg) weakCategories.push('Code Quality');

      // BUG-110 FIX: Only show Focus Areas if enabled
      if (this.SHOW_FOCUS_AREAS && weakCategories.length > 0) {
        content += `### 🎯 Focus Areas\n\n`;
        content += `Consider improving these categories where you're below team average:\n\n`;
        weakCategories.forEach(cat => {
          content += `- **${cat}**: Review the educational resources in the section above\n`;
        });
        content += `\n`;
      }

      // Top Performers (motivation) - use updated teamLeaderboard
      if (teamLeaderboard.length > 0) {
        content += `### 🏆 Top Performers\n\n`;
        content += `| Rank | Developer | Score | PRs Analyzed |\n`;
        content += `|------|-----------|-------|-------------|\n`;

        // BUG-074 FIX: Filter out AI agents from Top Performers
        // AI agents should not appear in human performance metrics
        const isAIAgent = (dev: any): boolean => {
          const name = (dev.name || '').toLowerCase();
          const email = (dev.email || '').toLowerCase();

          // Known AI agent patterns
          const aiNamePatterns = ['claude', 'gpt', 'copilot', 'bot', 'dependabot', 'renovate'];
          const aiEmailPatterns = ['noreply@anthropic.com', 'noreply@openai.com', 'bot@', '[bot]', 'dependabot', 'renovate'];

          const hasAIName = aiNamePatterns.some(pattern => name.includes(pattern));
          const hasAIEmail = aiEmailPatterns.some(pattern => email.includes(pattern));

          return hasAIName || hasAIEmail;
        };

        const humanPerformers = teamLeaderboard.filter((dev: any) => !isAIAgent(dev));

        // BUG-083 FIX: Deduplicate users by BOTH email AND name
        // Same user may appear with different emails but same name (e.g., alpsla with 3 different emails)
        const deduplicatedPerformers = humanPerformers.reduce((acc: any[], dev: any) => {
          const normalizedEmail = (dev.email || '').toLowerCase().trim();
          const normalizedName = (dev.name || '').toLowerCase().trim();

          // Find existing by email OR by name (if name is meaningful)
          const existing = acc.find((d: any) => {
            const existingEmail = (d.email || '').toLowerCase().trim();
            const existingName = (d.name || '').toLowerCase().trim();

            // Match by email
            if (existingEmail && normalizedEmail && existingEmail === normalizedEmail) {
              return true;
            }

            // Match by name (if both have meaningful names, not just emails)
            if (existingName && normalizedName &&
              existingName.length > 2 && normalizedName.length > 2 &&
              !existingName.includes('@') && !normalizedName.includes('@') &&
              existingName === normalizedName) {
              return true;
            }

            return false;
          });

          if (existing) {
            // Merge: weighted average score, sum PRs
            const totalPRs = (existing.totalPRs || 1) + (dev.totalPRs || 1);
            const weightedScore = (
              (existing.score * (existing.totalPRs || 1)) +
              (dev.score * (dev.totalPRs || 1))
            ) / totalPRs;
            existing.score = Math.round(weightedScore);
            existing.totalPRs = totalPRs;
            // Keep the most descriptive name and primary email
            if (!existing.name && dev.name) existing.name = dev.name;
            // Prefer non-noreply email
            if (existing.email && existing.email.includes('noreply') && dev.email && !dev.email.includes('noreply')) {
              existing.email = dev.email;
            }
          } else {
            acc.push({ ...dev });
          }
          return acc;
        }, []);

        // Re-sort after deduplication
        deduplicatedPerformers.sort((a: any, b: any) => (b.score || 0) - (a.score || 0));

        // Debug: Log the top 5 performers (humans only, deduplicated)
        console.log(`[Skills] Top 5 human performers (filtered ${teamLeaderboard.length - humanPerformers.length} AI agents, deduplicated ${humanPerformers.length - deduplicatedPerformers.length} duplicates):`);
        deduplicatedPerformers.slice(0, 5).forEach((dev: any, idx: number) => {
          console.log(`[Skills] ${idx + 1}. ${dev.name} (${dev.email}): ${dev.score}/100`);
        });

        deduplicatedPerformers.slice(0, 5).forEach((dev: any, idx: number) => {
          const isCurrent = normalizeEmail(dev.email) === normalizeEmail(metadata.prAuthorEmail);
          const highlight = isCurrent ? '**' : '';
          content += `| ${idx + 1} | ${highlight}${dev.name || dev.email}${highlight} | ${highlight}${dev.score}/100${highlight} | ${highlight}${dev.totalPRs || 1}${highlight} |\n`;
        });
        content += `\n`;
      }

      content += `> 💡 **Note:** Scores are based on code quality in your PRs. Higher scores mean fewer issues introduced!`;

      return content;
    } catch (error) {
      console.error('[V9GroupedReportFormatter] Error generating skills tracking:', error);
      return ''; // Silent fail - skills tracking is optional
    }
  }

  /**
   * BUG-096 FIX: Generate skills tracking section using only Git data (no Supabase)
   * This allows the Top Performers section to show meaningful data even without database access.
   */
  private generateGitBasedSkillsTracking(issues: EnrichedIssue[], metadata: any): string {
    try {
      // Calculate score for current PR
      const developerIssues = issues.filter(i =>
        i.category === 'NEW' || i.category === 'EXISTING_MODIFIED'
      );

      // Calculate category scores (using baseline of 50 for new developers)
      const baseline = 50;
      const security = developerIssues.filter(i => i.detectedCategory === 'Security');
      const performance = developerIssues.filter(i => i.detectedCategory === 'Performance');
      const architecture = developerIssues.filter(i => i.detectedCategory === 'Architecture');
      const dependencies = developerIssues.filter(i => i.detectedCategory === 'Dependencies');
      const codeQuality = developerIssues.filter(i => i.detectedCategory === 'Code Quality');

      // BUG-093 FIX: Empty categories = 100 (perfect), not baseline
      const categoryScores = {
        security: security.length === 0 ? 100 : this.calculateCategoryScore(security, baseline),
        performance: performance.length === 0 ? 100 : this.calculateCategoryScore(performance, baseline),
        architecture: architecture.length === 0 ? 100 : this.calculateCategoryScore(architecture, baseline),
        dependencies: dependencies.length === 0 ? 100 : this.calculateCategoryScore(dependencies, baseline),
        codeQuality: codeQuality.length === 0 ? 100 : this.calculateCategoryScore(codeQuality, baseline)
      };

      const currentPRScore = Math.round(
        (categoryScores.security + categoryScores.performance + categoryScores.architecture +
          categoryScores.dependencies + categoryScores.codeQuality) / 5
      );

      // Get Git teammates for basic leaderboard
      let gitTeammates: Array<{ name?: string; email: string; totalPRs?: number }> = [];
      if (this.repoPath) {
        gitTeammates = this.discoverTeamFromGit(this.repoPath);
      }

      // Build leaderboard: current author + Git teammates with baseline scores
      const leaderboard: Array<{ name: string; email: string; score: number; totalPRs: number }> = [];

      // Add current author with actual score
      leaderboard.push({
        name: metadata.prAuthor,
        email: metadata.prAuthorEmail,
        score: currentPRScore,
        totalPRs: 1
      });

      // Add Git teammates with baseline (50) - they haven't been analyzed
      const normalizeEmail = (email: string) => (email || '').toLowerCase().trim();
      gitTeammates.forEach(teammate => {
        if (normalizeEmail(teammate.email) !== normalizeEmail(metadata.prAuthorEmail)) {
          leaderboard.push({
            name: teammate.name || teammate.email.split('@')[0],
            email: teammate.email,
            score: 50, // Baseline - not yet analyzed
            totalPRs: teammate.totalPRs || 0
          });
        }
      });

      // Sort by score
      leaderboard.sort((a, b) => b.score - a.score);

      // Generate content
      let content = `## 🎯 Developer Skills & Ranking\n\n`;

      // Your Score section
      content += `### Your Score: ${currentPRScore}/100\n\n`;
      content += `| Category | Score | Issues |\n`;
      content += `|----------|-------|--------|\n`;
      content += `| 🔒 Security | ${categoryScores.security}/100 | ${security.length} |\n`;
      content += `| ⚡ Performance | ${categoryScores.performance}/100 | ${performance.length} |\n`;
      content += `| 🏗️ Architecture | ${categoryScores.architecture}/100 | ${architecture.length} |\n`;
      content += `| 📦 Dependencies | ${categoryScores.dependencies}/100 | ${dependencies.length} |\n`;
      content += `| ✨ Code Quality | ${categoryScores.codeQuality}/100 | ${codeQuality.length} |\n\n`;

      // Top Performers section
      if (leaderboard.length > 0) {
        content += `### 🏆 Top Performers\n\n`;
        content += `| Rank | Developer | Score | PRs |\n`;
        content += `|------|-----------|-------|-----|\n`;

        leaderboard.slice(0, 5).forEach((dev, idx) => {
          const isCurrent = normalizeEmail(dev.email) === normalizeEmail(metadata.prAuthorEmail);
          const highlight = isCurrent ? '**' : '';
          const prsText = dev.totalPRs === 0 ? '—' : String(dev.totalPRs);
          content += `| ${idx + 1} | ${highlight}${dev.name}${highlight} | ${highlight}${dev.score}/100${highlight} | ${prsText} |\n`;
        });
        content += `\n`;
      }

      content += `> 💡 **Note:** Scores are based on code quality in your PRs. Git-based tracking (Supabase not connected).\n`;

      return content;
    } catch (error) {
      console.error('[V9GroupedReportFormatter] Error generating Git-based skills tracking:', error);
      return '';
    }
  }

  private getStatusEmoji(yourScore: number, teamAvg: number, teamSize = 1): string {
    // Solo developer - no comparison needed
    if (teamSize === 1) return '👤 Solo Developer';

    // Team comparison
    if (yourScore >= teamAvg + 10) return '🌟 Excellent';
    if (yourScore > teamAvg) return '✅ Above Average';
    if (yourScore === teamAvg) return '➡️ Average';
    if (yourScore >= teamAvg - 10) return '⚠️ Average';
    return '⚠️ Below Average';
  }

  /**
   * Generate XP Progress and Achievements Section
   * Fetches user's XP and achievements from Supabase and generates markdown
   * Session 66: Integrated for tier differentiation
   */
  private async generateXPAndAchievements(userEmail?: string): Promise<string> {
    if (!userEmail || !this.supabase) {
      return '';
    }

    try {
      // Try to get user achievements from Supabase
      // First, check if the user has any skill score history (proxy for "has used the system")
      const { data: skillHistory, error: skillError } = await this.supabase
        .from('skill_scores')
        .select('overall_score, created_at')
        .eq('developer_email', userEmail)
        .order('created_at', { ascending: true })
        .limit(10);

      if (skillError) {
        console.log(`[XP/Achievements] Error fetching skill history: ${skillError.message}`);
      }

      // Calculate XP based on skill history and analysis activity
      // Each analysis = 25 XP, each high score (80+) = bonus 15 XP
      const analysisCount = skillHistory?.length || 0;
      let totalXp = analysisCount * 25;

      // Bonus XP for high scores
      const highScores = (skillHistory || []).filter((s: any) => s.overall_score >= 80).length;
      totalXp += highScores * 15;

      // Calculate level from XP
      const levelInfo = calculateLevel(totalXp);
      const progressBar = generateXpProgressBar(totalXp, levelInfo.nextLevelXp);

      // Build achievements based on activity
      const achievements: UnlockedAchievement[] = [];

      // Early Adopter - completed first analysis
      if (analysisCount >= 1) {
        achievements.push({
          id: 'early-adopter',
          name: 'Early Adopter',
          description: 'Completed your first code analysis',
          category: 'milestone',
          tier: 'common',
          unlockedAt: new Date(skillHistory![0]?.created_at || Date.now()),
          xpValue: 10
        });
      }

      // Quality Champion - 5+ high scores
      if (highScores >= 5) {
        achievements.push({
          id: 'quality-champion',
          name: 'Quality Champion',
          description: 'Achieved 80+ score on 5 PRs',
          category: 'quality',
          tier: 'rare',
          unlockedAt: new Date(),
          xpValue: 100
        });
      }

      // Centurion - 10+ analyses (simplified from 100 for early users)
      if (analysisCount >= 10) {
        achievements.push({
          id: 'dedicated-developer',
          name: 'Dedicated Developer',
          description: `Completed ${Math.max(10, analysisCount)} code analyses`,
          category: 'milestone',
          tier: 'rare',
          unlockedAt: new Date(),
          xpValue: 75
        });
      }

      // Get user's achievement style preference (default to professional)
      let achievementStyle: 'professional' | 'gamified' = 'professional';
      try {
        const { data: prefs } = await this.supabase
          .from('user_preferences')
          .select('achievement_style')
          .eq('user_email', userEmail)
          .single();

        if (prefs?.achievement_style === 'gamified') {
          achievementStyle = 'gamified';
        }
      } catch {
        // Use default professional style
      }

      // Generate the section
      let content = `## 🎮 XP Progress & Achievements\n\n`;

      // XP Progress Bar
      content += `### Level ${levelInfo.level}: ${levelInfo.title}\n\n`;

      // Breakdown of XP
      content += `**Total XP:** ${totalXp.toLocaleString()}\n`;
      content += `> 📊 **Breakdown:** ${analysisCount} analyses (${analysisCount * 25} XP) + ${highScores} high scores (${highScores * 15} XP)\n\n`;

      content += `${progressBar}\n\n`;

      // Achievement counts
      const tierCounts = {
        legendary: achievements.filter(a => a.tier === 'legendary').length,
        epic: achievements.filter(a => a.tier === 'epic').length,
        rare: achievements.filter(a => a.tier === 'rare').length,
        common: achievements.filter(a => a.tier === 'common').length
      };

      content += `### Achievement Collection\n\n`;
      content += `| Tier | Unlocked |\n`;
      content += `|------|----------|\n`;
      content += `| 🏆 Legendary | ${tierCounts.legendary} |\n`;
      content += `| 💜 Epic | ${tierCounts.epic} |\n`;
      content += `| 💙 Rare | ${tierCounts.rare} |\n`;
      content += `| ⚪ Common | ${tierCounts.common} |\n\n`;

      // SESSION 69: Add link to scoring guide for transparency
      content += `> 💡 **How to earn more XP:** Fix issues in your PR before analysis! Each resolved issue = +5 XP, critical = +20 XP bonus.\n`;
      content += `> [📖 Full Scoring Guide](https://codequal.dev/docs/scoring-guide)\n\n`;

      // Show achievements using the imported function
      if (achievements.length > 0) {
        content += generateAchievementsSection(achievements, achievementStyle, 3);
      } else {
        content += `### Start Your Journey!\n\n`;
        content += `Complete code analyses to earn achievements and level up.\n\n`;
        content += `**Next Achievements:**\n`;
        content += `- 🎯 **Early Adopter** — Complete your first analysis (+10 XP)\n`;
        content += `- ⭐ **Quality Champion** — Get 80+ score on 5 PRs (+100 XP)\n`;
        content += `- 🏅 **Dedicated Developer** — Complete 10 analyses (+75 XP)\n`;
      }

      return content;
    } catch (error) {
      console.error('[V9GroupedReportFormatter] Error generating XP/Achievements:', error);
      return ''; // Silent fail - optional section
    }
  }

  /**
   * Generate Community Impact Section
   * Shows how user's pattern contributions have helped other developers
   * Session 66: Integrated for tier differentiation
   */
  private async generateCommunityImpact(userEmail?: string): Promise<string> {
    if (!userEmail || !this.supabase) {
      return '';
    }

    try {
      // First try: Check pattern_contributions table (new schema - may not exist yet)
      let totalPatterns = 0;
      let totalUsageCount = 0;
      let topPatterns: any[] = [];

      // Try querying pattern_contributions table (if migrations have been applied)
      const { data: contributions, error: contribError } = await this.supabase
        .from('pattern_contributions')
        .select(`
          pattern_id,
          contributed_at,
          fix_patterns!inner(id, name, rule_id, apply_count, status)
        `)
        .eq('contributor_email', userEmail)
        .limit(10);

      if (!contribError && contributions && contributions.length > 0) {
        // Use pattern contributions data
        topPatterns = contributions
          .filter((c: any) => c.fix_patterns?.status === 'active')
          .map((c: any) => ({
            patternId: c.pattern_id,
            patternName: c.fix_patterns?.name || c.fix_patterns?.rule_id,
            ruleId: c.fix_patterns?.rule_id,
            language: 'java', // Default for now
            contributedAt: new Date(c.contributed_at),
            usageCount: c.fix_patterns?.apply_count || 0,
            usersHelped: Math.max(1, Math.floor((c.fix_patterns?.apply_count || 0) / 3)),
            timeSavedMinutes: (c.fix_patterns?.apply_count || 0) * 5
          }));

        totalPatterns = topPatterns.length;
        totalUsageCount = topPatterns.reduce((sum: number, p: any) => sum + p.usageCount, 0);
      } else {
        // Fallback: pattern_contributions table doesn't exist yet
        // Generate the "Start Contributing" section to encourage future contributions
        console.log(`[CommunityImpact] Contribution tracking not yet available: ${contribError?.message || 'no data'}`);
      }

      // Calculate community impact metrics
      const usersHelped = totalUsageCount > 0 ? Math.max(1, Math.floor(totalUsageCount / 3)) : 0;
      const timeSavedHours = (totalUsageCount * 5) / 60;

      // Build community impact summary
      const impact: CommunityImpactSummary = {
        totalPatternsContributed: totalPatterns,
        totalUsersHelped: usersHelped,
        totalTimeSavedHours: timeSavedHours,
        totalUsageCount: totalUsageCount,
        topPatterns: topPatterns.slice(0, 5),
        percentileRank: totalPatterns > 10 ? 10 : totalPatterns > 5 ? 25 : totalPatterns > 0 ? 50 : undefined
      };

      // Default privacy preferences (user_preferences table may not exist yet)
      const privacyPrefs = { isAnonymous: false, showOnLeaderboard: true, shareProfile: false };

      // Generate the section using imported function
      // SESSION 73: Pass userTier for tier-specific messaging
      return generateCommunityImpactSection(impact, privacyPrefs, this.userTier);
    } catch (error) {
      console.error('[V9GroupedReportFormatter] Error generating Community Impact:', error);
      return ''; // Silent fail - optional section
    }
  }

  /**
   * Generate Analysis Metadata with complete performance details
   */
  private generateAnalysisMetadata(metadata: any): string {
    return generateAnalysisMetadata(
      metadata,
      this.SHOW_AGENT_PERFORMANCE,
      this.SHOW_TOOL_PERFORMANCE,
      this.SHOW_EFFICIENCY_ANALYSIS,
      this.SHOW_SYSTEM_INFO
    );
  }

  private _REMOVED_generateAnalysisMetadata_LEGACY(metadata: any): string {
    const totalDuration = Math.max(metadata.totalDuration || metadata.analysisTime || 0, 0);
    const cloneTime = Math.max(metadata.cloneTime || 0, 0);
    const analysisTime = Math.max(metadata.analysisTime || 0, 0);
    const reportTime = Math.max(metadata.reportGenerationTime || 0, 0);

    const cachedNote = (cloneTime === 0) ? ' (cached)' : '';
    // BUG FIX #17: Removed duplicate "Performance Metrics" section (already shown at top of report)
    let content = `## 📊 Analysis Metadata

### Analysis Coverage
| Metric | Value |
|--------|-------|
| Total Repository Files | ${(metadata.totalFiles || 0).toLocaleString()} |
| Lines of Code | ${(metadata.totalLinesOfCode || 0).toLocaleString()} |
| Files Modified | ${Math.min(metadata.filesModified || 0, metadata.totalFiles || (metadata.filesModified || 0))} |
| Note | Files Modified is clamped to Total Repository Files to avoid overcount (renames/moves) |
| Lines Changed | ${(metadata.linesAdded || 0) + (metadata.linesDeleted || 0)} (+${metadata.linesAdded || 0}/-${metadata.linesDeleted || 0}) |
`;

    // Add Agent Performance if available (optional)
    // MODEL NAME BUG FIX (2025-10-30): Added "Model" column to show which AI model was used
    // FIX 3 (2025-12-07): Filter out agents with 0s duration (e.g., tools that were disabled or didn't run)
    if (this.SHOW_AGENT_PERFORMANCE && metadata.agentPerformance && Array.isArray(metadata.agentPerformance) && metadata.agentPerformance.length > 0) {
      // Filter to only show agents that actually ran (duration > 0)
      const activeAgents = metadata.agentPerformance.filter((agent: any) => {
        const duration = agent.duration || 0;
        return duration > 0; // Only include agents that actually ran
      });

      if (activeAgents.length > 0) {
        content += `\n### Agent Performance
| Agent | Model | Files Analyzed | Issues Found | Time | Cost |
|-------|-------|----------------|--------------|------|------|
`;
        activeAgents.forEach((agent: any) => {
          const issues = agent.issuesFound || agent.issues || 0;
          const time = agent.duration ? (agent.duration / 1000).toFixed(1) + 's' : 'N/A';
          const costValue = agent.cost || 0;
          // Check for zero cost (including 0, 0.0, 0.00, etc.) or very small values
          const cost = (costValue === 0 || costValue < 0.0001) ? 'FREE' : '$' + costValue.toFixed(4);

          // BUG #6 FIX: Lookup model dynamically if not provided in metadata
          let model = agent.model || 'N/A';
          if (model === 'N/A' && this.modelConfigResolver) {
            // Extract role from agent name (e.g., "Security Agent" → "security")
            const agentName = (agent.name || agent.agent || '').toLowerCase();
            let role = 'code_quality';  // default
            if (agentName.includes('security')) role = 'security';
            else if (agentName.includes('performance')) role = 'performance';
            else if (agentName.includes('architecture')) role = 'architecture';
            else if (agentName.includes('dependencies') || agentName.includes('dependency')) role = 'dependency';

            try {
              // Synchronously get cached model config (avoid await in forEach)
              const modelConfig = this.modelConfigResolver.getCachedConfiguration?.(role, this.detectedLanguage, this.detectedRepoSize);
              if (modelConfig?.primary_model) {
                model = modelConfig.primary_model;
              }
            } catch (e) {
              // Silently fall back to N/A if lookup fails
            }
          }

          content += `| ${agent.name || agent.agent} | ${model} | ${agent.filesAnalyzed || agent.files || 'N/A'} | ${issues} | ${time} | ${cost} |\n`;
        });
      } // End of activeAgents.length > 0 check
    }

    // Add Tool Performance if available (optional)
    // FIX 3 (2025-12-07): Filter out tools with 0s duration (same as Agent Performance)
    // FIX 4 (2025-12-15): Filter out tools with 0 issues - only show tools that found problems
    // SESSION 26: Show total tools ran + note about clean tools
    if (this.SHOW_TOOL_PERFORMANCE && metadata.toolPerformance && Array.isArray(metadata.toolPerformance) && metadata.toolPerformance.length > 0) {
      // Count tools that ran vs tools that found issues
      const allTools = metadata.toolPerformance.filter((tool: any) => (tool.duration || 0) > 0);
      const activeTools = allTools.filter((tool: any) => {
        const issues = tool.issuesFound || tool.issues || tool.issueCount || 0;
        return issues > 0;
      });
      const cleanTools = allTools.length - activeTools.length;

      if (activeTools.length > 0 || allTools.length > 0) {
        content += `\n### Tool Performance\n`;
        if (cleanTools > 0) {
          content += `*${allTools.length} tools executed, ${cleanTools} returned clean (0 issues)*\n\n`;
        }
        content += `| Tool | Issues Found | Duration |
|------|--------------|----------|
`;
        activeTools.forEach((tool: any) => {
          const duration = tool.duration ? (tool.duration / 1000).toFixed(1) + 's' : 'N/A';
          content += `| ${tool.tool || tool.name} | ${tool.issuesFound || tool.issues || tool.issueCount || 0} | ${duration} |\n`;
        });
      }
    }

    // Add Cost & Efficiency Analysis (optional)
    if (this.SHOW_EFFICIENCY_ANALYSIS && metadata.agentPerformance && Array.isArray(metadata.agentPerformance) && metadata.agentPerformance.length > 0) {
      content += `\n### Cost & Efficiency Analysis
`;

      // Calculate totals
      const totalCost = metadata.agentPerformance.reduce((sum: number, agent: any) => sum + (agent.cost || 0), 0);
      const totalIssues = metadata.agentPerformance.reduce((sum: number, agent: any) => sum + (agent.issuesFound || agent.issues || 0), 0);
      const totalTime = metadata.agentPerformance.reduce((sum: number, agent: any) => sum + (agent.duration || 0), 0);

      content += `\n**Overall Efficiency:**\n`;
      content += `- Total Cost: ${(totalCost === 0 || totalCost < 0.0001) ? 'FREE' : '$' + totalCost.toFixed(4)}\n`;
      content += `- Cost per Issue: ${(totalCost === 0 || totalCost < 0.0001) ? 'FREE' : '$' + (totalIssues > 0 ? (totalCost / totalIssues).toFixed(6) : '0.000000')}\n`;
      content += `- Issues per Second: ${totalTime > 0 ? ((totalIssues / totalTime) * 1000).toFixed(2) : '0.00'}\n`;
      content += `- Cost per Second: ${(totalCost === 0 || totalCost < 0.0001) ? 'FREE' : '$' + (totalTime > 0 ? ((totalCost / totalTime) * 1000).toFixed(6) : '0.000000') + '/s'}\n\n`;

      // Performance recommendations
      // MODEL NAME BUG FIX (2025-10-30): Include model in efficiency ranking
      content += `**Agent Efficiency Ranking:**\n\n`;
      const agentEfficiency = metadata.agentPerformance
        .map((agent: any) => {
          const issues = agent.issuesFound || agent.issues || 0;
          const cost = agent.cost || 0;
          const time = agent.duration || 1;
          const costPerIssue = issues > 0 ? cost / issues : Number.POSITIVE_INFINITY;
          const issuesPerSec = (issues / time) * 1000;

          // BUG #6 FIX: Lookup model dynamically if not provided in metadata
          let model = agent.model || 'N/A';
          if (model === 'N/A' && this.modelConfigResolver) {
            const agentName = (agent.name || agent.agent || '').toLowerCase();
            let role = 'code_quality';
            if (agentName.includes('security')) role = 'security';
            else if (agentName.includes('performance')) role = 'performance';
            else if (agentName.includes('architecture')) role = 'architecture';
            else if (agentName.includes('dependencies') || agentName.includes('dependency')) role = 'dependency';

            try {
              const modelConfig = this.modelConfigResolver.getCachedConfiguration?.(role, this.detectedLanguage, this.detectedRepoSize);
              if (modelConfig?.primary_model) {
                model = modelConfig.primary_model;
              }
            } catch (e) {
              // Silently fall back to N/A
            }
          }

          return {
            name: agent.name || agent.agent,
            model,
            issues,
            cost,
            costPerIssue,
            issuesPerSec,
            efficiency: issues > 0 ? (issues / (cost * 1000 + 1)) : 0 // Issues per $1000 spent
          };
        })
        .sort((a: any, b: any) => b.efficiency - a.efficiency);

      agentEfficiency.forEach((agent: any, idx: number) => {
        const rank = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `${idx + 1}.`;
        const isFree = agent.cost === 0 || agent.cost < 0.0001;
        const badge = isFree
          ? '🎁 FREE'
          : !isFinite(agent.costPerIssue)
            ? 'N/A'
            : agent.costPerIssue < 0.001 ? '⚡ Excellent'
              : agent.costPerIssue < 0.01 ? '✅ Good'
                : agent.costPerIssue < 0.1 ? '⚠️ Average' : '🔴 Expensive';
        const costPerIssueStr = isFree
          ? 'FREE/issue'
          : isFinite(agent.costPerIssue) ? `$${agent.costPerIssue.toFixed(6)}/issue` : 'N/A cost/issue';
        const modelInfo = agent.model !== 'N/A' ? ` (${agent.model})` : '';
        content += `${rank} **${agent.name}**${modelInfo}: ${agent.issues} issues @ ${costPerIssueStr} ${badge}\n`;
      });

      // Replacement recommendations (only for paid models)
      const expensiveAgents = agentEfficiency.filter((a: any) => a.cost >= 0.0001 && a.costPerIssue > 0.05);
      if (expensiveAgents.length > 0) {
        content += `\n**💡 Optimization Opportunities:**\n`;
        expensiveAgents.forEach((agent: any) => {
          content += `- Consider optimizing **${agent.name}** (high cost/issue: $${agent.costPerIssue.toFixed(4)})\n`;
        });
      } else if (agentEfficiency.every((a: any) => a.cost === 0 || a.cost < 0.0001)) {
        content += `\n**💡 Cost Optimization:**\n`;
        content += `- All agents using FREE models - excellent cost efficiency! 🎉\n`;
      }
    }

    // Add Tool Efficiency Analysis
    // FIX 4 (2025-12-15): Only show tools that found issues
    if (metadata.toolPerformance && Array.isArray(metadata.toolPerformance) && metadata.toolPerformance.length > 0) {
      const toolEfficiency = metadata.toolPerformance
        .map((tool: any) => {
          const issues = tool.issuesFound || tool.issues || tool.issueCount || 0;
          const time = tool.duration || 1;
          const issuesPerSec = (issues / time) * 1000;
          return {
            name: tool.tool || tool.name,
            issues,
            time,
            issuesPerSec,
            efficiency: issuesPerSec
          };
        })
        .filter((tool: any) => tool.issues > 0) // Only include tools that found issues
        .sort((a: any, b: any) => b.efficiency - a.efficiency);

      // Only show section if there are tools with issues
      if (toolEfficiency.length > 0) {
        content += `\n### Tool Efficiency Analysis
`;

        content += `\n**Tool Performance Ranking:**\n\n`;
        toolEfficiency.forEach((tool: any, idx: number) => {
          const rank = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `${idx + 1}.`;
          const speed = tool.issuesPerSec > 10 ? '⚡ Fast' :
            tool.issuesPerSec > 1 ? '✅ Good' :
              tool.issuesPerSec > 0.1 ? '⚠️ Slow' : '🐌 Very Slow';
          content += `${rank} **${tool.name}**: ${tool.issues} issues in ${(tool.time / 1000).toFixed(1)}s (${tool.issuesPerSec.toFixed(2)}/s) ${speed}\n`;
        });
      }

      // BUG FIX #18: Removed "Performance Concerns" section
      // Can't compare tools with different purposes (CheckStyle finds 498K style issues, Semgrep finds 11 security issues)
      // Each tool has its own nature - execution time varies by codebase size and tool purpose
    }

    // Add Models Used if available
    if (metadata.modelsUsed && (Array.isArray(metadata.modelsUsed) || typeof metadata.modelsUsed === 'object')) {
      content += `\n### Models Used
`;
      if (Array.isArray(metadata.modelsUsed)) {
        metadata.modelsUsed.forEach((model: any) => {
          content += `- **${model.agent || model.role}:** ${model.model || model.modelName || 'default'}\n`;
        });
      } else {
        // Object format: { SecurityAnalyzer: 'claude-opus-4', ... }
        Object.entries(metadata.modelsUsed).forEach(([agent, model]) => {
          content += `- **${agent}:** ${model}\n`;
        });
      }
    }

    if (this.SHOW_SYSTEM_INFO) {
      content += `\n### System Information
 - **Analyzer Version:** ${metadata.analyzerVersion || 'V9 Grouped Report Formatter'}
 - **Analysis Date:** ${metadata.analyzedAt ? new Date(metadata.analyzedAt).toLocaleString() : new Date().toLocaleString()}
 - **Report Format:** Grouped (Compact with 99.8% cost reduction)
 - **Issue Grouping:** ${metadata.totalGroups || 'Enabled'} unique issue types`;
    }

    return content;
  }

  /**
   * Generate PR Comment (personalized, ready-to-paste)
   */
  private generatePRComment(issues: EnrichedIssue[], groups: IssueGroup[], metadata: any): string {
    return generatePRComment(issues, groups, metadata);
  }

  private _REMOVED_generatePRComment_LEGACY(issues: EnrichedIssue[], groups: IssueGroup[], metadata: any): string {
    const blocking = issues.filter(i =>
      (i.category === 'NEW' || i.category === 'EXISTING_MODIFIED') &&
      (i.severity === 'critical' || i.severity === 'high')
    );
    const resolved = issues.filter(i => i.category === 'RESOLVED');

    const emoji = metadata.decision === 'APPROVED' ? '✅' : '⛔';
    const decision = metadata.decision || 'PENDING';

    const greeting = this.getPersonalizedGreeting(metadata.prAuthor);
    const encouragement = this.getPersonalizedEncouragement(blocking.length, resolved.length);

    return `## 💬 PR Comment Template

**Ready-to-paste comment for your pull request:**

\`\`\`markdown
## ${emoji} Code Quality Analysis: ${decision}

${greeting} @${metadata.prAuthor || 'developer'}! I've completed a comprehensive analysis of your PR.

${encouragement}

### Summary
- **Total Issues:** ${issues.length} (${groups.length} unique types)
- **Blocking Issues:** ${blocking.length} ${blocking.length > 0 ? '⛔' : '✅'}
- **Resolved Issues:** ${resolved.length} ${resolved.length > 0 ? '🎉' : ''}
- **Analysis Time:** ${((metadata.analysisTime || 0) / 1000).toFixed(1)}s

${blocking.length > 0 ? `### ⛔ Blocking Issues
Please fix these before merge:
${blocking.slice(0, 5).map(i => `- **${i.rule}** in \`${i.file}\`${i.line ? `:${i.line}` : ''}`).join('\n')}
${blocking.length > 5 ? `\n... and ${blocking.length - 5} more` : ''}` : '### ✅ No Blocking Issues\nThis PR can be merged once approved by reviewers.'}

### 💡 Quick Stats

**Fix Recommendations:**
${(() => {
        // SESSION 92 FIX: Separate code fixes vs text guidance
        const codeFixCount = issues.filter(i => this.hasActualCodeFix(i)).length;
        const guidanceCount = issues.filter(i => this.hasTextGuidanceOnly(i)).length;
        const codeFixPercent = issues.length > 0 ? Math.round(codeFixCount / issues.length * 100) : 0;
        const guidancePercent = issues.length > 0 ? Math.round(guidanceCount / issues.length * 100) : 0;
        const noFixCount = issues.length - codeFixCount - guidanceCount;

        // Session 91: Tier-aware content - SESSION 92: Show separate counts
        if (this.userTier === 'pro' || this.userTier === 'enterprise') {
          return `- ✅ **AI Code Fixes**: ${codeFixCount} issues (${codeFixPercent}%) ready-to-apply
- 📖 **Text Guidance**: ${guidanceCount} issues (${guidancePercent}%) manual review
- ⏳ **Needs Attention**: ${noFixCount} issues`;
        } else {
          const safeCount = issues.filter(i => this.isSafeToAutoApply({ rule: i.rule, tool: i.tool, severity: i.severity } as any)).length;
          const safePercent = Math.round(safeCount / issues.length * 100);
          return `- 📚 **Pattern Fixes**: ${safeCount} issues (${safePercent}%)
- 📖 **IDE Guidance**: ${issues.length - safeCount} issues
- 💡 Upgrade to PRO for AI-generated fixes`;
        }
      })()}

**By Severity:**
- Critical: ${issues.filter(i => i.severity === 'critical').length}
- High: ${issues.filter(i => i.severity === 'high').length}
- Medium: ${issues.filter(i => i.severity === 'medium').length}
- Low: ${issues.filter(i => i.severity === 'low').length}
\`\`\``;
  }

  /**
   * Get personalized greeting
   *
   * GREETING FIX (2025-10-30): Use time-neutral greeting
   * User feedback: "We don't know when user reads the report"
   * Changed from time-based (Good morning/afternoon/evening) to simple "Hi"
   */
  private getPersonalizedGreeting(author?: string): string {
    // Always use time-neutral greeting (user may read report hours/days later)
    return 'Hi';
  }

  /**
   * Get personalized encouragement
   */
  private getPersonalizedEncouragement(blockingCount: number, resolvedCount: number): string {
    if (resolvedCount > 10) {
      return `🎉 Excellent work! You've resolved ${resolvedCount} existing issues. ${blockingCount === 0 ? 'And no new blocking issues!' : `Just ${blockingCount} items to address before merge.`}`;
    } else if (blockingCount === 0) {
      return `✅ Great job! No blocking issues found. ${resolvedCount > 0 ? `Plus you resolved ${resolvedCount} issues!` : 'Clean PR!'}`;
    } else if (blockingCount === 1) {
      return `Just one small issue to fix before we can merge. You've got this! 💪`;
    } else if (blockingCount <= 3) {
      return `Found a few items that need attention before merge. Nothing major! 👍`;
    } else {
      return `There are ${blockingCount} issues that need to be addressed. I've provided detailed fix suggestions for each. Let me know if you need any help! 🚀`;
    }
  }

  /**
   * Generate footer
   */
  private generateFooter(
    groups: IssueGroup[],
    ideFixFiles: IDEFixFile[],
    metadata: any,
    enrichedIssues?: EnrichedIssue[]
  ): string {
    return generateFooter(groups, ideFixFiles, metadata, enrichedIssues);
  }

  private _REMOVED_generateFooter_LEGACY(
    groups: IssueGroup[],
    ideFixFiles: IDEFixFile[]
  ): string {
    // BUG FIX #48, #49, #70: Updated footer for Bug #34 lazy loading architecture
    // ENHANCEMENT #3: Removed Issue Groups Mapping (not useful for end users)
    // BUG FIX #70: Don't show empty "Attachments" header - combine with IDE Fix Files section
    let footer = '';

    if (ideFixFiles.length > 0) {
      footer += `## 🔗 Attachments\n\n`;
      footer += `### 🛠️ IDE Fix Files (Lazy Loading)\n\n`;

      // BUG FIX #48: Explain Bug #34 lazy loading architecture
      footer += `**🚀 Instant-start IDE integration** with lazy loading:\n\n`;
      footer += `📦 **1 manifest file** to load in your IDE:\n`;
      footer += `- [all-issues-manifest.json](attachments/all-issues-manifest.json) - **Load this file first!**\n\n`;
      footer += `**What you get**:\n`;
      footer += `- ✅ **Critical issues** embedded (instant access, zero wait time)\n`;
      footer += `- ⬇️  **High/Medium/Low issues** lazy loaded in background\n`;
      footer += `- 🎯 **Priority-based download** (critical → high → medium → low)\n`;
      footer += `- 📊 **Progress tracking** while you fix issues\n\n`;

      // BUG FIX: Filter out manifest file (groupId='all-issues') and use optional chaining
      const issueFiles = ideFixFiles.filter(f => f.groupId !== 'all-issues');
      const totalFixable = issueFiles.reduce((sum, f) => sum + (f.content.metadata?.total_occurrences || 0), 0);

      // BUG #6 FIX: Calculate actual auto-fixable count from manifest data
      const manifestFile = ideFixFiles.find(f => f.groupId === 'all-issues');
      let autoFixableCount = totalFixable;
      if (manifestFile && (manifestFile.content as any).files) {
        const filesObj = (manifestFile.content as any).files;
        autoFixableCount = (Object.values(filesObj).flat().reduce((sum: number, entry: any) =>
          sum + (entry.autoFixable ? entry.occurrences : 0), 0
        ) as number);
      }
      const criticalCount = issueFiles.filter(f => f.content.severity === 'critical').reduce((sum, f) => sum + (f.content.metadata?.total_occurrences || 0), 0);
      const highCount = issueFiles.filter(f => f.content.severity === 'high').reduce((sum, f) => sum + (f.content.metadata?.total_occurrences || 0), 0);
      const mediumCount = issueFiles.filter(f => f.content.severity === 'medium').reduce((sum, f) => sum + (f.content.metadata?.total_occurrences || 0), 0);
      const lowCount = issueFiles.filter(f => f.content.severity === 'low').reduce((sum, f) => sum + (f.content.metadata?.total_occurrences || 0), 0);

      // AUTO-FIX COUNT BUG FIX (2025-10-30): Use autoFixableCount (not totalFixable)
      // totalFixable includes ALL issues, autoFixableCount includes ONLY auto-fixable ones
      footer += `**Total auto-fixable issues**: ${autoFixableCount.toLocaleString()}\n`;
      footer += `- 🔴 Critical: ${criticalCount} (embedded, instant access)\n`;
      if (highCount > 0) footer += `- 🟠 High: ${highCount} (lazy loaded after critical)\n`;
      if (mediumCount > 0) footer += `- 🟡 Medium: ${mediumCount} (lazy loaded after high)\n`;
      if (lowCount > 0) footer += `- 🟢 Low: ${lowCount} (lazy loaded after medium)\n`;

      // ENHANCEMENT #4: Universal IDE instructions with prompt examples
      footer += `\n**How to use** (Universal IDE Integration):\n\n`;
      footer += `**For Any IDE** (Cursor, VS Code, IntelliJ, Windsurf, etc.):\n\n`;

      footer += `**Step 1: Load the Manifest**\n`;
      footer += `1. Download \`all-issues-manifest.json\` from \`attachments/\` directory\n`;
      footer += `2. Open your IDE\n`;
      footer += `3. Load/import the JSON file (method varies by IDE)\n\n`;

      footer += `**Step 2: Fix Issues with Single Command**\n\n`;
      footer += `**Simple prompt** (one command does everything):\n`;
      footer += `\`\`\`\n`;
      footer += `👤 You: "Create a todo list and fix all issues divided by severity groups,\n`;
      footer += `        starting from critical and ending with low, with constant progress updates"\n\n`;
      footer += `🤖 IDE: [Creates structured todo list]\n`;
      footer += `        ✅ Critical issues (${criticalCount}) - Starting...\n`;
      if (highCount > 0) {
        footer += `        ⏳ High issues (${highCount}) - Waiting...\n`;
      }
      if (mediumCount > 0) {
        footer += `        ⏳ Medium issues (${mediumCount.toLocaleString()}) - Waiting...\n`;
      }
      if (lowCount > 0) {
        footer += `        ⏳ Low issues (${lowCount.toLocaleString()}) - Waiting...\n`;
      }
      footer += `\n`;
      footer += `        [Applies fixes with real-time progress]\n`;
      footer += `        ✅ Critical: 2/2 fixed (100%)\n`;
      if (highCount > 0) {
        footer += `        🔄 High: 5/${highCount} fixed (${Math.round((5 / highCount) * 100)}%)...\n`;
      }
      footer += `        ⏳ Medium: Waiting for high to complete...\n`;
      footer += `\`\`\`\n\n`;
      footer += `**That's it!** The IDE handles everything:\n`;
      footer += `- Loads the manifest automatically\n`;
      footer += `- Creates a prioritized todo list\n`;
      footer += `- Fixes issues in severity order (critical → high → medium → low)\n`;
      footer += `- Shows live progress updates\n`;
      footer += `- Downloads next priority issues in background\n\n`;

      // BUG FIX #64: Updated validation workflow (CodeQual re-scan, not IDE)
      footer += `**Step 3: Validate Your Fixes with CodeQual**\n\n`;
      footer += `After committing your fixes, CodeQual will automatically re-analyze your PR to confirm the issues are resolved:\n\n`;
      footer += `\`\`\`bash\n`;
      footer += `# Commit your fixes\n`;
      footer += `git add .\n`;
      footer += `git commit -m "fix: resolve ${criticalCount + highCount} security issues"\n\n`;
      footer += `# Push to PR branch\n`;
      footer += `git push origin your-branch\n\n`;
      footer += `# CodeQual automatically triggers:\n`;
      footer += `🤖 CodeQual: [Running analysis on new commit...]\n`;
      footer += `             ✅ Before: ${criticalCount} critical, ${highCount} high\n`;
      // BUG #6 FIX: Show realistic scenario - auto-fix handles most but not necessarily all issues
      if (autoFixableCount === totalFixable) {
        footer += `             ✅ After:  0 critical, 0 high\n`;
        footer += `             🎉 All blockers resolved! PR approved.\n`;
      } else {
        const remainingPercent = Math.round(((totalFixable - autoFixableCount) / totalFixable) * 100);
        footer += `             ✅ After:  ${Math.ceil((criticalCount + highCount) * remainingPercent / 100)} issues remaining (${remainingPercent}% require manual review)\n`;
        footer += `             🎯 Significant progress! Review remaining issues.\n`;
      }
      footer += `\`\`\`\n\n`;
      footer += `**Why CodeQual re-scan?**\n`;
      footer += `- ✅ Automated validation on every commit\n`;
      footer += `- 📊 Compare before/after results objectively\n`;
      footer += `- 🎯 Catch any regressions or incomplete fixes\n`;
      footer += `- 🏆 Earn "First Clean PR" achievement\n\n`;
      footer += `> **Note:** Auto-fix tools can resolve most style and formatting issues (${Math.round((autoFixableCount / totalFixable) * 100)}% in this PR), but complex security or logic issues may require manual review.\n\n`;

      footer += `**Why this works**:\n`;
      footer += `- ⚡ **Zero wait time** - critical issues embedded for instant access\n`;
      footer += `- 🎯 **Priority-first** - most important issues available immediately\n`;
      footer += `- 📦 **Efficient** - high/medium/low issues lazy-loaded in background\n`;
      footer += `- 🤖 **Universal format** - works with any AI-powered IDE\n`;
      footer += `- 🛡️  **Human-in-the-loop** - you review before applying for safety\n`;
      footer += `- 🔄 **Validation workflow** - automated before/after comparison\n`;
    }

    footer += `\n---\n\n`;
    footer += `*Generated by CodeQual V9 - Grouped Report Format (Bug #34 Lazy Loading)*  \n`;
    footer += `*${new Date().toISOString()}*`;

    return footer;
  }

  // Helper methods

  private sanitizeGroupId(group: IssueGroup): string {
    return `${group.rule}-${group.severity}-${group.tool}`.toLowerCase().replace(/[^a-z0-9-]/g, '-');
  }

  private groupBySeverity(issues: EnrichedIssue[]): Record<string, number> {
    return groupBySeverity(issues);
  }

  private groupByCategory(issues: EnrichedIssue[]): Record<string, number> {
    return groupByCategory(issues);
  }

  private groupByTool(issues: EnrichedIssue[]): Record<string, number> {
    return groupByTool(issues);
  }
}

