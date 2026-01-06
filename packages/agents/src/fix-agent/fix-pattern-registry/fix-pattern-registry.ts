/**
 * Fix Pattern Registry
 *
 * Central registry for storing and applying fix patterns.
 * Patterns can be manually added, captured from user fixes, or AI-generated.
 *
 * Storage: Supabase (with local cache)
 */

import {
  FixPattern,
  FixCaptureRequest,
  FixCaptureResponse,
  FixApplyRequest,
  FixApplyResponse,
  PatternLookupRequest,
  PatternLookupResponse,
  PatternStatus,
  IFixPatternRegistry,
  TransformationType,
  UserContributionRecord,
  UserTrustStatus,
  ContributorRank,
} from './types';
import { v4 as uuidv4 } from 'uuid';
import { getFixSecurityValidator } from './fix-security-validator';
import { getSupabasePatternStore, SupabasePatternStore, extractContextKey } from './supabase-pattern-store';

// =============================================================================
// In-Memory Pattern Store (with Supabase persistence)
// - In-memory cache for fast lookups
// - Supabase for cross-session persistence
// =============================================================================

const patternStore: Map<string, FixPattern> = new Map();
const ruleIndex: Map<string, string[]> = new Map(); // ruleId -> patternIds
const userRecords: Map<string, UserContributionRecord> = new Map(); // userId -> record

// =============================================================================
// Fix Pattern Registry Implementation
// =============================================================================

export class FixPatternRegistry implements IFixPatternRegistry {
  private patterns: Map<string, FixPattern>;
  private ruleToPatterns: Map<string, string[]>;
  private users: Map<string, UserContributionRecord>;
  private securityValidator = getFixSecurityValidator();
  private supabaseStore: SupabasePatternStore;
  private supabaseInitialized = false;

  constructor() {
    this.patterns = patternStore;
    this.ruleToPatterns = ruleIndex;
    this.users = userRecords;
    this.supabaseStore = getSupabasePatternStore();

    // Load built-in patterns
    this.loadBuiltInPatterns();
  }

  /**
   * Load built-in fix patterns (shipped with CodeQual)
   */
  private loadBuiltInPatterns(): void {
    // Register built-in patterns
    for (const pattern of BUILT_IN_PATTERNS) {
      this.registerPattern(pattern);
    }
  }

  /**
   * Register a pattern in the store
   */
  private registerPattern(pattern: FixPattern): void {
    this.patterns.set(pattern.id, pattern);

    // Update rule index
    const existing = this.ruleToPatterns.get(pattern.ruleId) || [];
    if (!existing.includes(pattern.id)) {
      existing.push(pattern.id);
      this.ruleToPatterns.set(pattern.ruleId, existing);
    }
  }

  /**
   * Lookup patterns for a rule
   *
   * OPTIMIZATION: First checks Supabase for persisted patterns (pattern reuse).
   * If found, skip expensive AI generation.
   */
  async lookup(request: PatternLookupRequest): Promise<PatternLookupResponse> {
    // STEP 1: Check Supabase first for persisted patterns (pattern reuse optimization)
    try {
      const supabasePatterns = await this.supabaseStore.lookupPatterns(
        request.ruleId,
        request.tool,
        request.fileType,
        request.activeOnly ?? false
      );

      if (supabasePatterns.length > 0) {
        console.log(`[FixPatternRegistry] Found ${supabasePatterns.length} patterns in Supabase for ${request.ruleId}`);

        // Cache them locally for faster subsequent lookups
        for (const pattern of supabasePatterns) {
          if (!this.patterns.has(pattern.id)) {
            this.registerPattern(pattern);
          }
        }

        return {
          found: true,
          patterns: supabasePatterns,
          recommended: supabasePatterns[0],
        };
      }
    } catch (err) {
      // Supabase lookup failed, continue with in-memory
      console.debug('[FixPatternRegistry] Supabase lookup failed, using in-memory:', (err as Error).message);
    }

    // STEP 2: Fall back to in-memory patterns
    const patternIds = this.ruleToPatterns.get(request.ruleId) || [];

    if (patternIds.length === 0) {
      return { found: false, patterns: [] };
    }

    let patterns = patternIds
      .map((id) => this.patterns.get(id))
      .filter((p): p is FixPattern => p !== undefined);

    // Apply filters
    if (request.tool) {
      patterns = patterns.filter((p) => p.tool === request.tool);
    }
    if (request.fileType) {
      patterns = patterns.filter((p) => p.fileTypes.includes(request.fileType!));
    }
    if (request.activeOnly) {
      patterns = patterns.filter((p) => p.status === 'active');
    }

    // Sort by confidence
    patterns.sort((a, b) => b.confidence - a.confidence);

    return {
      found: patterns.length > 0,
      patterns,
      recommended: patterns[0],
    };
  }

  /**
   * Capture a manual fix and create a pattern
   * SECURITY: All submissions go through security validation, even from trusted users
   */
  async capture(request: FixCaptureRequest): Promise<FixCaptureResponse> {
    try {
      // STEP 1: Check if user is banned
      const userRecord = this.getOrCreateUserRecord(request.userId);
      if (userRecord.trustStatus === 'banned') {
        console.log(`[FixPatternRegistry] Blocked submission from banned user: ${request.userId}`);
        return {
          success: false,
          status: 'rejected',
          message: 'Your account has been permanently banned from contributing fix patterns.',
          autoApproved: false,
        };
      }

      // STEP 2: ALWAYS run security validation (even for trusted users)
      const securityResult = this.securityValidator.validate(
        request.beforeCode,
        request.afterCode,
        request.ruleId,
        request.filePath
      );

      console.log(`[FixPatternRegistry] Security validation for ${request.userId}:`, {
        score: securityResult.score,
        isBlocked: securityResult.isBlocked,
        shouldBanUser: securityResult.shouldBanUser,
        risks: securityResult.risks.length,
      });

      // STEP 3: Handle malicious submissions - PERMANENT BAN
      if (securityResult.shouldBanUser) {
        // Ban the user permanently
        this.banUser(request.userId, securityResult.banReason || 'Submitted malicious code', 'system');

        console.error(`[FixPatternRegistry] BANNED USER ${request.userId}: ${securityResult.banReason}`);

        return {
          success: false,
          status: 'rejected',
          message: 'Submission blocked: Security validation detected malicious patterns. Your account has been permanently banned from contributing.',
          autoApproved: false,
        };
      }

      // STEP 4: Handle blocked (non-ban worthy) submissions
      if (securityResult.isBlocked) {
        // Update user's rejected count
        userRecord.rejectedCount++;
        userRecord.lastActive = new Date().toISOString();

        return {
          success: false,
          status: 'rejected',
          message: `Submission rejected: ${securityResult.reviewReason}. Risks detected: ${securityResult.risks.map(r => r.description).join(', ')}`,
          autoApproved: false,
        };
      }

      // STEP 5: Analyze the diff to extract pattern
      const analysis = this.analyzeDiff(request);

      // Generate pattern
      const pattern: FixPattern = {
        id: uuidv4(),
        ruleId: request.ruleId,
        tool: request.tool,
        name: `Fix for ${request.ruleId.split('.').pop()}`,
        description: `Auto-captured fix pattern for ${request.ruleId}`,
        transformationType: analysis.transformationType,
        fileTypes: [this.getFileType(request.filePath)],
        detection: analysis.detection,
        fixTemplate: analysis.fixTemplate,
        examples: [
          {
            description: 'Captured from user fix',
            before: request.beforeCode,
            after: request.afterCode,
            fileName: request.filePath,
            variables: analysis.variables,
          },
        ],
        confidence: 70, // Start with moderate confidence
        safeForAutoApply: false, // NEVER auto-apply, always require review
        status: 'pending_review', // ALL submissions go to review
        metadata: {
          createdBy: request.userId,
          createdAt: new Date().toISOString(),
          applyCount: 0,
          successCount: 0,
          revertCount: 0,
          source: 'manual_capture',
          tags: [`security_score:${securityResult.score}`],
        },
      };

      // Trusted users: pattern goes directly to active (after security validation passed)
      // New users: pattern goes to review queue
      const isTrusted = userRecord.trustStatus === 'trusted';

      if (isTrusted) {
        // Trusted user + passed security = directly activate
        pattern.status = 'active';
        pattern.confidence = 85; // Higher confidence for trusted contributors
      }
      // New users stay at 'pending_review' status

      // Update user stats
      userRecord.totalSubmissions++;
      userRecord.lastActive = new Date().toISOString();

      // Register pattern
      this.registerPattern(pattern);

      return {
        success: true,
        pattern,
        patternId: pattern.id,
        status: pattern.status,
        message: isTrusted
          ? 'Pattern activated! Thank you, trusted contributor.'
          : 'Pattern captured and submitted for review. You\'ll be notified when approved.',
        autoApproved: isTrusted,
      };
    } catch (error) {
      return {
        success: false,
        status: 'rejected',
        message: `Failed to capture pattern: ${(error as Error).message}`,
        autoApproved: false,
      };
    }
  }

  /**
   * Apply a pattern to fix code
   */
  async apply(request: FixApplyRequest): Promise<FixApplyResponse> {
    const pattern = this.patterns.get(request.patternId);

    if (!pattern) {
      // DEBUG: Check if pattern exists in Map
      console.log(`[FixPatternRegistry:apply] Pattern ${request.patternId.substring(0, 8)} NOT in memory Map. Map has ${this.patterns.size} patterns.`);
      return {
        success: false,
        confidence: 0,
        error: `Pattern not found in memory: ${request.patternId}`,
      };
    }

    try {
      // FALLBACK: If fixTemplate.template is empty, use examples[0].after as the fix
      let templateToApply = pattern.fixTemplate?.template;

      if (!templateToApply) {
        // Try to get fixed code from examples
        const example = pattern.examples?.[0];
        if (example?.after) {
          console.log(`[FixPatternRegistry:apply] Pattern ${request.patternId.substring(0, 8)} has empty template, using example.after fallback`);
          templateToApply = example.after;
        } else {
          console.log(`[FixPatternRegistry:apply] Pattern ${request.patternId.substring(0, 8)} has no template AND no examples - cannot apply`);
          return {
            success: false,
            confidence: 0,
            error: `Pattern has no fixTemplate.template and no examples to use as fallback`,
          };
        }
      }

      // Extract variables from code if not provided
      const variables =
        request.variables || this.extractVariables(request.fileContent, pattern.detection);

      // Create fixTemplate with resolved template
      const effectiveFixTemplate = {
        ...pattern.fixTemplate,
        template: templateToApply,
      };

      // Apply template
      const fixedCode = this.applyTemplate(
        request.fileContent,
        request.lineNumber,
        effectiveFixTemplate,
        variables
      );

      // Generate diff
      const diff = this.generateDiff(request.fileContent, fixedCode);

      return {
        success: true,
        fixedCode,
        diff,
        variables,
        confidence: pattern.confidence,
      };
    } catch (error) {
      console.log(`[FixPatternRegistry:apply] Error applying pattern ${request.patternId.substring(0, 8)}: ${(error as Error).message}`);
      return {
        success: false,
        confidence: 0,
        error: `Failed to apply pattern: ${(error as Error).message}`,
      };
    }
  }

  /**
   * Get a pattern by ID
   */
  async getPattern(patternId: string): Promise<FixPattern | null> {
    return this.patterns.get(patternId) || null;
  }

  /**
   * Update pattern status
   */
  async updateStatus(
    patternId: string,
    status: PatternStatus,
    reviewerId: string
  ): Promise<boolean> {
    const pattern = this.patterns.get(patternId);
    if (!pattern) return false;

    pattern.status = status;
    pattern.metadata.updatedBy = reviewerId;
    pattern.metadata.updatedAt = new Date().toISOString();

    return true;
  }

  /**
   * Record pattern application result
   */
  async recordApplication(patternId: string, success: boolean, reverted: boolean): Promise<void> {
    const pattern = this.patterns.get(patternId);
    if (!pattern) return;

    pattern.metadata.applyCount++;
    if (success) pattern.metadata.successCount++;
    if (reverted) pattern.metadata.revertCount++;

    // Adjust confidence based on success rate
    const successRate = pattern.metadata.successCount / pattern.metadata.applyCount;
    const revertRate = pattern.metadata.revertCount / pattern.metadata.applyCount;

    // Increase confidence if success rate is high
    if (pattern.metadata.applyCount >= 10 && successRate > 0.9 && revertRate < 0.05) {
      pattern.confidence = Math.min(95, pattern.confidence + 5);
      pattern.safeForAutoApply = true;
    }

    // Decrease confidence if revert rate is high
    if (revertRate > 0.2) {
      pattern.confidence = Math.max(50, pattern.confidence - 10);
      pattern.safeForAutoApply = false;
    }

    // Persist to Supabase (async, don't wait)
    this.supabaseStore.recordApplication(patternId, success, reverted).catch((err) => {
      console.debug('[FixPatternRegistry] Failed to record application to Supabase:', (err as Error).message);
    });
  }

  /**
   * List all patterns
   */
  async listPatterns(filters?: {
    tool?: string;
    status?: PatternStatus;
    fileType?: string;
    minConfidence?: number;
  }): Promise<FixPattern[]> {
    let patterns = Array.from(this.patterns.values());

    if (filters) {
      if (filters.tool) {
        patterns = patterns.filter((p) => p.tool === filters.tool);
      }
      if (filters.status) {
        patterns = patterns.filter((p) => p.status === filters.status);
      }
      if (filters.fileType) {
        patterns = patterns.filter((p) => p.fileTypes.includes(filters.fileType!));
      }
      if (filters.minConfidence) {
        patterns = patterns.filter((p) => p.confidence >= filters.minConfidence!);
      }
    }

    return patterns;
  }

  // ==========================================================================
  // Helper Methods
  // ==========================================================================

  /**
   * Analyze diff between before/after to extract pattern
   */
  private analyzeDiff(request: FixCaptureRequest): {
    transformationType: TransformationType;
    detection: FixPattern['detection'];
    fixTemplate: FixPattern['fixTemplate'];
    variables: Record<string, string>;
  } {
    const before = request.beforeCode;
    const after = request.afterCode;

    // Determine transformation type
    let transformationType: TransformationType = 'replace';

    if (after.length > before.length * 1.5) {
      transformationType = 'wrap'; // Added significant structure
    } else if (after.length < before.length * 0.5) {
      transformationType = 'remove'; // Removed code
    } else if (this.hasStructuralChange(before, after)) {
      transformationType = 'restructure';
    }

    // Extract variables (patterns that differ)
    const variables = this.extractDiffVariables(before, after);

    // Create detection pattern
    const detection: FixPattern['detection'] = {
      regex: this.createDetectionRegex(before),
      extractVariables: Object.keys(variables).map((name) => ({
        name,
        source: `group_${name}`,
      })),
    };

    // Create fix template
    const fixTemplate: FixPattern['fixTemplate'] = {
      template: this.createFixTemplate(after, variables),
      indentation: 'preserve',
      requiredVariables: Object.keys(variables),
    };

    return { transformationType, detection, fixTemplate, variables };
  }

  /**
   * Check if change involves structural modification
   */
  private hasStructuralChange(before: string, after: string): boolean {
    const beforeLines = before.split('\n').length;
    const afterLines = after.split('\n').length;
    return Math.abs(beforeLines - afterLines) > 3;
  }

  /**
   * Extract variables that differ between before and after
   */
  private extractDiffVariables(before: string, after: string): Record<string, string> {
    const variables: Record<string, string> = {};

    // Look for GitHub Actions expressions
    const exprRegex = /\$\{\{\s*([^}]+)\s*\}\}/g;
    let match;

    while ((match = exprRegex.exec(before)) !== null) {
      const expr = match[1].trim();
      const varName = expr
        .replace(/[^a-zA-Z0-9]/g, '_')
        .toUpperCase()
        .replace(/_+/g, '_');
      variables[varName] = match[0];
    }

    return variables;
  }

  /**
   * Create detection regex from before code
   */
  private createDetectionRegex(before: string): string {
    // Escape regex special characters
    let regex = before.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    // Replace GitHub expressions with capture groups
    regex = regex.replace(
      /\\\$\\\{\\\{\s*([^}]+)\s*\\\}\\\}/g,
      '\\$\\{\\{\\s*([^}]+)\\s*\\}\\}'
    );

    return regex;
  }

  /**
   * Create fix template from after code
   */
  private createFixTemplate(after: string, variables: Record<string, string>): string {
    let template = after;

    // Replace actual values with placeholders
    for (const [name, value] of Object.entries(variables)) {
      template = template.replace(value, `{{${name}}}`);
    }

    return template;
  }

  /**
   * Extract variables from code using detection pattern
   */
  private extractVariables(
    code: string,
    detection: FixPattern['detection']
  ): Record<string, string> {
    const variables: Record<string, string> = {};

    if (detection.regex) {
      const regex = new RegExp(detection.regex);
      const match = regex.exec(code);

      if (match && detection.extractVariables) {
        detection.extractVariables.forEach((v, index) => {
          // Use !== undefined to allow empty strings as valid values
          if (match[index + 1] !== undefined) {
            variables[v.name] = match[index + 1];
          }
        });
      }
    }

    return variables;
  }

  /**
   * Apply template to generate fixed code
   */
  private applyTemplate(
    originalCode: string,
    lineNumber: number,
    template: FixPattern['fixTemplate'],
    variables: Record<string, string>
  ): string {
    let result = template.template;

    // Compute derived variables before replacement
    const computedVariables = this.computeDerivedVariables(variables, template.defaultVariables || {});

    // Merge computed variables with original
    const allVariables = { ...variables, ...computedVariables };

    // Replace variables (use string replacement for empty strings since regex won't match them properly)
    for (const [name, value] of Object.entries(allVariables)) {
      const placeholder = `{{${name}}}`;
      // Use split/join for reliable replacement (handles empty values better than regex)
      result = result.split(placeholder).join(value);
    }

    // Apply defaults for missing variables
    if (template.defaultVariables) {
      for (const [name, value] of Object.entries(template.defaultVariables)) {
        const placeholder = `{{${name}}}`;
        result = result.split(placeholder).join(value);
      }
    }

    // Handle indentation
    if (template.indentation === 'preserve') {
      const lines = originalCode.split('\n');
      const targetLine = lines[lineNumber - 1] || '';
      const indent = targetLine.match(/^\s*/)?.[0] || '';
      result = result
        .split('\n')
        .map((line) => indent + line)
        .join('\n');
    }

    return result;
  }

  /**
   * Compute derived variables that depend on other extracted variables
   * For example, RUN_CONTENT_FIXED is computed from RUN_CONTENT
   */
  private computeDerivedVariables(
    variables: Record<string, string>,
    defaults: Record<string, string>
  ): Record<string, string> {
    const computed: Record<string, string> = {};

    // RUN_CONTENT_FIXED: The run content with ${{ }} replaced by shell variable reference
    if (variables.RUN_CONTENT !== undefined) {
      const varName = variables.VAR_NAME || defaults.VAR_NAME || 'INPUT_VALUE';
      // The RUN_CONTENT is the part before the ${{ }} expression
      // We need to reconstruct the full command with the shell variable
      const runContent = variables.RUN_CONTENT.trim();
      // Replace any remaining ${{ }} with shell variable reference wrapped in quotes
      computed.RUN_CONTENT_FIXED = `${runContent}"$${varName}".yaml`;
    }

    // Handle INPUT_NAME trailing spaces (trim)
    if (variables.INPUT_NAME !== undefined) {
      computed.INPUT_NAME = variables.INPUT_NAME.trim();
    }

    return computed;
  }

  /**
   * Generate diff between original and fixed code
   */
  private generateDiff(original: string, fixed: string): string {
    const originalLines = original.split('\n');
    const fixedLines = fixed.split('\n');

    let diff = '';
    const maxLines = Math.max(originalLines.length, fixedLines.length);

    for (let i = 0; i < maxLines; i++) {
      const origLine = originalLines[i];
      const fixedLine = fixedLines[i];

      if (origLine !== fixedLine) {
        if (origLine) diff += `- ${origLine}\n`;
        if (fixedLine) diff += `+ ${fixedLine}\n`;
      }
    }

    return diff;
  }

  /**
   * Get file type from path
   */
  private getFileType(filePath: string): string {
    const ext = filePath.split('.').pop()?.toLowerCase() || '';
    const typeMap: Record<string, string> = {
      yml: 'yaml',
      yaml: 'yaml',
      ts: 'typescript',
      tsx: 'typescript',
      js: 'javascript',
      jsx: 'javascript',
      py: 'python',
      java: 'java',
      go: 'go',
      rs: 'rust',
    };
    return typeMap[ext] || ext;
  }

  // ==========================================================================
  // User Trust Management Methods
  // ==========================================================================

  /**
   * Get or create a user contribution record
   */
  private getOrCreateUserRecord(userId: string): UserContributionRecord {
    let record = this.users.get(userId);

    if (!record) {
      record = {
        userId,
        trustStatus: 'new',
        totalSubmissions: 0,
        approvedCount: 0,
        rejectedCount: 0,
        blockedSubmissions: 0,
        firstSeen: new Date().toISOString(),
        lastActive: new Date().toISOString(),
        rank: 'bronze',
        points: 0,
      };
      this.users.set(userId, record);
    }

    return record;
  }

  /**
   * Ban a user permanently
   */
  private banUser(userId: string, reason: string, reviewerId: string): void {
    const record = this.getOrCreateUserRecord(userId);

    record.trustStatus = 'banned';
    record.blockedSubmissions++;
    record.banInfo = {
      bannedAt: new Date().toISOString(),
      reason,
      offendingPatternId: 'N/A', // Pattern was not stored
      reviewedBy: reviewerId,
    };

    console.error(`[FixPatternRegistry] USER PERMANENTLY BANNED: ${userId}`);
    console.error(`[FixPatternRegistry] Ban reason: ${reason}`);
    console.error(`[FixPatternRegistry] Reviewed by: ${reviewerId}`);

    // TODO: Store in database and potentially notify administrators
  }

  /**
   * Get user contribution record (public method)
   */
  getUserRecord(userId: string): UserContributionRecord | null {
    return this.users.get(userId) || null;
  }

  /**
   * Check if a user is banned
   */
  isUserBanned(userId: string): boolean {
    const record = this.users.get(userId);
    return record?.trustStatus === 'banned';
  }

  /**
   * Update user trust status after pattern approval
   * Call this when an admin approves a pattern
   */
  async onPatternApproved(patternId: string): Promise<void> {
    const pattern = this.patterns.get(patternId);
    if (!pattern) return;

    const record = this.getOrCreateUserRecord(pattern.metadata.createdBy);
    record.approvedCount++;
    record.points += 50; // Award points

    // Upgrade trust status based on approved count
    if (record.approvedCount >= 5 && record.trustStatus === 'new') {
      record.trustStatus = 'trusted';
      console.log(`[FixPatternRegistry] User ${record.userId} upgraded to trusted contributor`);
    }

    // Update rank
    record.rank = this.calculateRank(record.approvedCount);
  }

  /**
   * Calculate contributor rank based on approved patterns
   */
  private calculateRank(approvedCount: number): ContributorRank {
    if (approvedCount >= 50) return 'platinum';
    if (approvedCount >= 20) return 'gold';
    if (approvedCount >= 5) return 'silver';
    return 'bronze';
  }

  /**
   * List all banned users (for admin UI)
   */
  listBannedUsers(): UserContributionRecord[] {
    return Array.from(this.users.values()).filter(u => u.trustStatus === 'banned');
  }

  /**
   * Get contributor stats for a user
   */
  getContributorStats(userId: string): {
    totalContributions: number;
    acceptedContributions: number;
    rank: ContributorRank;
    points: number;
    trustStatus: UserTrustStatus;
  } | null {
    const record = this.users.get(userId);
    if (!record) return null;

    return {
      totalContributions: record.totalSubmissions,
      acceptedContributions: record.approvedCount,
      rank: record.rank,
      points: record.points,
      trustStatus: record.trustStatus,
    };
  }

  // ==========================================================================
  // AI Fixer Integration Methods
  // ==========================================================================

  /**
   * Submit an AI-generated fix to the registry
   *
   * AI Fixer is an internal automation tool that is inherently trusted:
   * - Skips security validation (internal tool, not external contributor)
   * - Fixes that pass verification go directly to 'active' status
   * - No pending review queue needed for verified AI fixes
   *
   * @param submission The AI-generated fix to submit
   * @param options.verified Whether the fix has been tested and passed verification
   * @returns The capture response with pattern status
   */
  async submitAIFix(
    submission: {
      ruleId: string;
      tool: string;
      filePath: string;
      beforeCode: string;
      afterCode: string;
      lineNumber: number;
      issueMessage: string;
      aiModel?: string;
      aiConfidence?: number;
    },
    options: { verified?: boolean } = {}
  ): Promise<FixCaptureResponse> {
    const aiFixerUserId = 'ai-fixer@codequal.dev';

    try {
      // Analyze the diff to extract pattern
      const analysis = this.analyzeDiff({
        ruleId: submission.ruleId,
        tool: submission.tool,
        filePath: submission.filePath,
        beforeCode: submission.beforeCode,
        afterCode: submission.afterCode,
        lineNumber: submission.lineNumber,
        issueMessage: submission.issueMessage,
        userId: aiFixerUserId,
      });

      // Generate pattern - AI Fixer is trusted, so:
      // - Skip security validation
      // - If verified (tested), go directly to 'active'
      // - If not verified, go to 'pending_review' for manual check
      const isVerified = options.verified ?? false;

      // SESSION 77: Extract context key for context-aware pattern matching
      const contextKey = extractContextKey(submission.ruleId, submission.beforeCode);

      const pattern: FixPattern = {
        id: uuidv4(),
        ruleId: submission.ruleId,
        tool: submission.tool,
        contextKey, // SESSION 77: Context-aware pattern matching
        name: `AI Fix for ${submission.ruleId.split('.').pop()}${contextKey ? ` (${contextKey})` : ''}`,
        description: `AI-generated fix pattern for ${submission.ruleId}${contextKey ? ` with ${contextKey}` : ''}`,
        transformationType: analysis.transformationType,
        fileTypes: [this.getFileType(submission.filePath)],
        detection: analysis.detection,
        fixTemplate: analysis.fixTemplate,
        examples: [
          {
            description: 'AI-generated fix',
            before: submission.beforeCode,
            after: submission.afterCode,
            fileName: submission.filePath,
            variables: analysis.variables,
          },
        ],
        confidence: submission.aiConfidence || 85,
        safeForAutoApply: isVerified, // Only auto-apply if verified
        status: isVerified ? 'active' : 'pending_review',
        metadata: {
          createdBy: aiFixerUserId,
          createdAt: new Date().toISOString(),
          applyCount: 0,
          successCount: 0,
          revertCount: 0,
          source: 'ai_generated',
          tags: [
            'ai-generated',
            isVerified ? 'verified' : 'unverified',
            submission.aiModel ? `model:${submission.aiModel}` : 'model:unknown',
            submission.aiConfidence ? `confidence:${submission.aiConfidence}` : '',
          ].filter(Boolean),
        },
      };

      // Register pattern in memory
      this.registerPattern(pattern);

      // PERSIST TO SUPABASE for cross-session reuse
      try {
        const saved = await this.supabaseStore.savePattern(pattern);
        if (saved) {
          console.log(
            `[FixPatternRegistry] AI Fix persisted to Supabase: ${pattern.id.substring(0, 8)} → ${pattern.status}`
          );
        } else {
          console.log(
            `[FixPatternRegistry] AI Fix saved to memory only (Supabase unavailable): ${pattern.id.substring(0, 8)}`
          );
        }
      } catch (persistError) {
        // Don't fail the whole operation if persistence fails
        console.warn(
          `[FixPatternRegistry] Failed to persist to Supabase (saved to memory): ${(persistError as Error).message}`
        );
      }

      console.log(
        `[FixPatternRegistry] AI Fix submitted: ${pattern.id.substring(0, 8)} → ${pattern.status}`
      );

      return {
        success: true,
        pattern,
        patternId: pattern.id,
        status: pattern.status,
        message: isVerified
          ? 'Verified AI fix activated immediately.'
          : 'AI fix submitted for review (not verified).',
        autoApproved: isVerified,
      };
    } catch (error) {
      return {
        success: false,
        status: 'rejected',
        message: `Failed to submit AI fix: ${(error as Error).message}`,
        autoApproved: false,
      };
    }
  }

  /**
   * Get AI Fixer statistics
   *
   * Note: AI Fixer is an internal trusted tool, so trust status is not
   * used for approval decisions. This is for monitoring/reporting only.
   */
  getAIFixerStats(): {
    totalPatterns: number;
    activePatterns: number;
    pendingPatterns: number;
  } {
    const aiFixerUserId = 'ai-fixer@codequal.dev';
    const allPatterns = Array.from(this.patterns.values()).filter(
      (p) => p.metadata.createdBy === aiFixerUserId
    );

    return {
      totalPatterns: allPatterns.length,
      activePatterns: allPatterns.filter((p) => p.status === 'active').length,
      pendingPatterns: allPatterns.filter((p) => p.status === 'pending_review').length,
    };
  }
}

// =============================================================================
// Built-in Patterns
// =============================================================================

const BUILT_IN_PATTERNS: FixPattern[] = [
  // GitHub Actions Shell Injection Fix
  {
    id: 'builtin-github-actions-shell-injection-001',
    ruleId: 'yaml.github-actions.security.run-shell-injection.run-shell-injection',
    tool: 'semgrep',
    name: 'Fix GitHub Actions Shell Injection',
    description:
      'Moves GitHub context variables from direct interpolation to env: block to prevent shell injection',
    transformationType: 'wrap',
    fileTypes: ['yaml', 'yml'],
    detection: {
      regex: '(\\s*)-\\s*name:\\s*([^\\n]+)\\n\\s*run:\\s*\\|([\\s\\S]*?)\\$\\{\\{\\s*github\\.event\\.inputs\\.([^}]+)\\s*\\}\\}',
      extractVariables: [
        { name: 'INDENT', source: 'group_1' },
        { name: 'STEP_NAME', source: 'group_2' },
        { name: 'RUN_CONTENT', source: 'group_3' },
        { name: 'INPUT_NAME', source: 'group_4' },
      ],
    },
    fixTemplate: {
      template: `{{INDENT}}- name: {{STEP_NAME}}
{{INDENT}}  env:
{{INDENT}}    {{VAR_NAME}}: \${{ github.event.inputs.{{INPUT_NAME}} }}
{{INDENT}}  run: |
{{INDENT}}    {{RUN_CONTENT_FIXED}}`,
      indentation: 'preserve',
      requiredVariables: ['INDENT', 'STEP_NAME', 'INPUT_NAME'],
      defaultVariables: {
        VAR_NAME: 'INPUT_VALUE',
      },
    },
    examples: [
      {
        description: 'Fix shell injection in kubectl command',
        before: `    - name: Create namespace
      run: |
        kubectl create namespace codequal-\${{ github.event.inputs.environment }}`,
        after: `    - name: Create namespace
      env:
        DEPLOY_ENV: \${{ github.event.inputs.environment }}
      run: |
        kubectl create namespace "codequal-$DEPLOY_ENV"`,
        variables: {
          INPUT_NAME: 'environment',
          VAR_NAME: 'DEPLOY_ENV',
        },
      },
    ],
    confidence: 90,
    safeForAutoApply: false, // Security fix, require review
    status: 'active',
    metadata: {
      createdBy: 'codequal-team',
      createdAt: '2025-12-04T00:00:00Z',
      applyCount: 0,
      successCount: 0,
      revertCount: 0,
      source: 'codequal_team',
      tags: ['security', 'github-actions', 'shell-injection'],
    },
  },
];

// =============================================================================
// AI Fixer Integration
// =============================================================================

/**
 * Predefined AI Fixer user ID
 * AI Fixer is treated as a contributor that can earn trust over time
 */
export const AI_FIXER_USER_ID = 'ai-fixer@codequal.dev';

/**
 * Request to submit an AI-generated fix to the registry
 */
export interface AIFixSubmission {
  /** The rule ID being fixed */
  ruleId: string;
  /** The tool that detected the issue */
  tool: string;
  /** File path where the fix was applied */
  filePath: string;
  /** Code before the fix */
  beforeCode: string;
  /** Code after the fix (AI-generated) */
  afterCode: string;
  /** Line number where the issue was reported */
  lineNumber: number;
  /** The original issue message */
  issueMessage: string;
  /** AI model that generated the fix */
  aiModel?: string;
  /** Confidence score from AI (0-100) */
  aiConfidence?: number;
}

// =============================================================================
// Singleton Instance
// =============================================================================

let registryInstance: FixPatternRegistry | null = null;

export function getFixPatternRegistry(): FixPatternRegistry {
  if (!registryInstance) {
    registryInstance = new FixPatternRegistry();
  }
  return registryInstance;
}

/**
 * Reset the registry singleton (for testing only)
 */
export function resetFixPatternRegistry(): void {
  registryInstance = null;
}

export default FixPatternRegistry;
