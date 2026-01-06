/**
 * Fix Pattern Registry Types
 *
 * This module defines the types for the Fix Pattern Registry system.
 * The registry stores reusable fix patterns that can be applied automatically
 * when a rule is detected, eliminating the need for AI generation each time.
 *
 * Flow: Manual Fix → Capture → Generalize → Store → Auto-Apply
 */

// =============================================================================
// Core Types
// =============================================================================

/**
 * A fix pattern that can be applied to resolve a specific rule violation
 */
export interface FixPattern {
  /** Unique identifier for this pattern */
  id: string;

  /** The rule ID this pattern fixes (e.g., "yaml.github-actions.security.run-shell-injection") */
  ruleId: string;

  /** The tool that detects this rule (e.g., "semgrep", "eslint") */
  tool: string;

  /**
   * Context key for matching similar code contexts (SESSION 77)
   *
   * Examples:
   * - CloseResource with FileInputStream → contextKey: "FileInputStream"
   * - CloseResource with ReadableByteChannel → contextKey: "ReadableByteChannel"
   * - CloseResource with Connection → contextKey: "Connection"
   *
   * This allows multiple patterns per rule, each for a different context.
   * Pattern lookup: rule_id + tool + context_key
   */
  contextKey?: string;

  /** Human-readable name for this fix */
  name: string;

  /** Description of what this fix does */
  description: string;

  /** The type of transformation this fix performs */
  transformationType: TransformationType;

  /** File types this pattern applies to */
  fileTypes: string[];

  /** The detection pattern (how to find the issue in code) */
  detection: DetectionPattern;

  /** The fix template (how to transform the code) */
  fixTemplate: FixTemplate;

  /** Example before/after pairs for validation and documentation */
  examples: FixExample[];

  /** Confidence score (0-100) for auto-applying this fix */
  confidence: number;

  /** Whether this fix is safe for auto-apply without review */
  safeForAutoApply: boolean;

  /** Status in the review pipeline */
  status: PatternStatus;

  /** Metadata about creation and updates */
  metadata: PatternMetadata;
}

/**
 * Types of code transformations
 */
export type TransformationType =
  | 'replace'      // Simple text replacement
  | 'wrap'         // Wrap code in a structure (e.g., add env: block)
  | 'inject'       // Inject new code (e.g., add import statement)
  | 'remove'       // Remove code
  | 'restructure'  // Complex structural change
  | 'refactor';    // Multi-location refactoring

/**
 * Pattern status in the approval pipeline
 */
export type PatternStatus =
  | 'pending_review'  // Submitted, waiting for review
  | 'approved'        // Reviewed and approved
  | 'active'          // In production use
  | 'deprecated'      // No longer recommended
  | 'rejected';       // Rejected during review

/**
 * Detection pattern to find the issue in code
 */
export interface DetectionPattern {
  /** Regex pattern for simple detection */
  regex?: string;

  /** AST pattern for structural detection (tool-specific) */
  astPattern?: string;

  /** Context requirements (e.g., must be inside a specific block) */
  context?: {
    /** Parent node type (e.g., "step", "function") */
    parentType?: string;
    /** Sibling requirements */
    siblings?: string[];
    /** File path pattern */
    pathPattern?: string;
  };

  /** Variables to extract from the match */
  extractVariables?: VariableExtraction[];
}

/**
 * Variable extraction definition
 */
export interface VariableExtraction {
  /** Name of the variable (e.g., "INPUT_EXPR") */
  name: string;
  /** Regex group or AST path to extract from */
  source: string;
  /** Optional transformation to apply (e.g., "toUpperCase", "toSnakeCase") */
  transform?: string;
}

/**
 * Fix template for generating the corrected code
 */
export interface FixTemplate {
  /** Template string with {{VARIABLE}} placeholders */
  template: string;

  /** How to handle indentation */
  indentation: 'preserve' | 'auto' | 'none';

  /** Variables that must be provided */
  requiredVariables: string[];

  /** Default values for optional variables */
  defaultVariables?: Record<string, string>;

  /** Post-processing steps */
  postProcess?: PostProcessStep[];
}

/**
 * Post-processing step after template application
 */
export interface PostProcessStep {
  type: 'format' | 'lint' | 'validate' | 'custom';
  command?: string;
  options?: Record<string, unknown>;
}

/**
 * Example before/after pair
 */
export interface FixExample {
  /** Description of this example */
  description: string;
  /** Code before the fix */
  before: string;
  /** Code after the fix */
  after: string;
  /** File name for context */
  fileName?: string;
  /** Variables extracted/used in this example */
  variables?: Record<string, string>;
}

/**
 * Metadata about pattern creation and updates
 */
export interface PatternMetadata {
  /** Who created this pattern */
  createdBy: string;
  /** When it was created */
  createdAt: string;
  /** Who last updated it */
  updatedBy?: string;
  /** When it was last updated */
  updatedAt?: string;
  /** Number of times this pattern has been applied */
  applyCount: number;
  /** Number of successful applications */
  successCount: number;
  /** Number of times users reverted the fix */
  revertCount: number;
  /** Source of this pattern */
  source: 'manual_capture' | 'ai_generated' | 'community' | 'codequal_team';
  /** Tags for categorization */
  tags?: string[];
}

// =============================================================================
// API Types
// =============================================================================

/**
 * Request to capture a manual fix
 */
export interface FixCaptureRequest {
  /** The rule ID being fixed */
  ruleId: string;
  /** The tool that detected the issue */
  tool: string;
  /** File path where the fix was applied */
  filePath: string;
  /** Code before the fix */
  beforeCode: string;
  /** Code after the fix */
  afterCode: string;
  /** Line number where the issue was reported */
  lineNumber: number;
  /** The original issue message */
  issueMessage: string;
  /** User who made the fix */
  userId: string;
  /** Optional: Additional context */
  context?: {
    /** Surrounding code for context */
    surroundingCode?: string;
    /** Framework detected */
    framework?: string;
    /** Language */
    language?: string;
  };
}

/**
 * Response from fix capture API
 */
export interface FixCaptureResponse {
  success: boolean;
  /** Generated pattern (for review) */
  pattern?: Partial<FixPattern>;
  /** Pattern ID if saved */
  patternId?: string;
  /** Status of the captured pattern */
  status: PatternStatus;
  /** Message to display to user */
  message: string;
  /** Whether the pattern was auto-approved */
  autoApproved: boolean;
}

/**
 * Request to apply a fix pattern
 */
export interface FixApplyRequest {
  /** Pattern ID to apply */
  patternId: string;
  /** File content to fix */
  fileContent: string;
  /** File path */
  filePath: string;
  /** Line number of the issue */
  lineNumber: number;
  /** Variables to use (if pre-extracted) */
  variables?: Record<string, string>;
}

/**
 * Response from fix apply API
 */
export interface FixApplyResponse {
  success: boolean;
  /** Fixed code */
  fixedCode?: string;
  /** Diff showing changes */
  diff?: string;
  /** Variables used */
  variables?: Record<string, string>;
  /** Confidence of this specific application */
  confidence: number;
  /** Error if failed */
  error?: string;
}

/**
 * Request to lookup patterns for a rule
 */
export interface PatternLookupRequest {
  ruleId: string;
  tool?: string;
  fileType?: string;
  /** Only return active patterns */
  activeOnly?: boolean;
}

/**
 * Response from pattern lookup
 */
export interface PatternLookupResponse {
  found: boolean;
  patterns: FixPattern[];
  /** Best matching pattern */
  recommended?: FixPattern;
}

// =============================================================================
// User Trust System Types
// =============================================================================

/**
 * User trust status for contribution management
 */
export type UserTrustStatus =
  | 'new'           // First-time contributor, needs full review
  | 'trusted'       // Has approved contributions, still security-checked
  | 'banned';       // Submitted malicious pattern, permanently blocked

/**
 * User contribution record
 */
export interface UserContributionRecord {
  /** User identifier (email or ID) */
  userId: string;

  /** Current trust status */
  trustStatus: UserTrustStatus;

  /** Total patterns submitted */
  totalSubmissions: number;

  /** Approved patterns */
  approvedCount: number;

  /** Rejected patterns */
  rejectedCount: number;

  /** Blocked/malicious submissions (even 1 = permanent ban) */
  blockedSubmissions: number;

  /** When the user was first seen */
  firstSeen: string;

  /** When the user was last active */
  lastActive: string;

  /** If banned, reason and timestamp */
  banInfo?: {
    bannedAt: string;
    reason: string;
    offendingPatternId: string;
    reviewedBy: string;
  };

  /** Contributor rank (for gamification) */
  rank: ContributorRank;

  /** Total points earned */
  points: number;
}

/**
 * Contributor rank based on approved contributions
 */
export type ContributorRank =
  | 'bronze'    // 0-4 approved
  | 'silver'    // 5-19 approved
  | 'gold'      // 20-49 approved
  | 'platinum'; // 50+ approved

/**
 * Security validation result for captured fixes
 */
export interface SecurityValidationResult {
  /** Whether the fix passes security checks */
  passed: boolean;

  /** Security score 0-100 (higher = safer) */
  score: number;

  /** Detected risks */
  risks: Array<{
    type: string;
    severity: 'critical' | 'high' | 'medium' | 'low';
    description: string;
    blocked: boolean;
  }>;

  /** Warnings that don't block but should be reviewed */
  warnings: string[];

  /** Whether manual review is required (even for trusted users) */
  requiresReview: boolean;

  /** Reason for requiring review */
  reviewReason?: string;

  /** Whether submission is completely blocked (malicious) */
  isBlocked: boolean;

  /** If blocked, should user be banned? */
  shouldBanUser: boolean;
}

// =============================================================================
// Registry Interface
// =============================================================================

/**
 * Interface for the Fix Pattern Registry
 */
export interface IFixPatternRegistry {
  /**
   * Lookup patterns for a rule
   */
  lookup(request: PatternLookupRequest): Promise<PatternLookupResponse>;

  /**
   * Capture a manual fix and create a pattern
   */
  capture(request: FixCaptureRequest): Promise<FixCaptureResponse>;

  /**
   * Apply a pattern to fix code
   */
  apply(request: FixApplyRequest): Promise<FixApplyResponse>;

  /**
   * Get a pattern by ID
   */
  getPattern(patternId: string): Promise<FixPattern | null>;

  /**
   * Update pattern status (for admin approval flow)
   */
  updateStatus(patternId: string, status: PatternStatus, reviewerId: string): Promise<boolean>;

  /**
   * Record pattern application result (for learning)
   */
  recordApplication(patternId: string, success: boolean, reverted: boolean): Promise<void>;

  /**
   * List all patterns (with optional filters)
   */
  listPatterns(filters?: {
    tool?: string;
    status?: PatternStatus;
    fileType?: string;
    minConfidence?: number;
  }): Promise<FixPattern[]>;
}
