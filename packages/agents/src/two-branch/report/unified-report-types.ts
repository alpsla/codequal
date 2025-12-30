/**
 * Unified Report Types
 *
 * Complete type definitions for the CodeQual web report system.
 * Both BASIC and PRO tiers use the same structure with different content depth.
 *
 * @version 2.0
 * @see docs/implementation-todos/backend-complete-requirements.md
 */

// ============================================================
// COMMON TYPES
// ============================================================

/**
 * Issue categories for classification
 */
export type IssueCategory =
  | 'security'
  | 'code_quality'
  | 'performance'
  | 'architecture'
  | 'dependencies';

/**
 * Severity levels for issues
 */
export type Severity = 'critical' | 'high' | 'medium' | 'low';

/**
 * Fix tiers for auto-fix routing
 */
export type FixTier =
  | 'tier1_native'
  | 'tier2_dedicated'
  | 'tier2_5_pattern'
  | 'tier2_5_cloud'
  | 'tier3_ai';

/**
 * Report tier determines content depth
 */
export type ReportTier = 'basic' | 'pro';

/**
 * Analysis modes
 */
export type AnalysisMode = 'fast' | 'standard' | 'thorough' | 'complete';

/**
 * Grade values
 */
export type Grade = 'A' | 'B' | 'C' | 'D' | 'F';

/**
 * Decision status
 */
export type DecisionStatus = 'APPROVED' | 'DECLINED';

/**
 * Reasons why an issue could not be auto-fixed
 */
export type UnfixedReason =
  | 'no_pattern_match'
  | 'cloud_api_failed'
  | 'ai_generation_failed'
  | 'verification_failed'
  | 'regression_introduced'
  | 'code_context_insufficient'
  | 'complex_refactoring'
  | 'external_dependency'
  | 'cost_limit_exceeded'
  | 'timeout';

// ============================================================
// MAIN REPORT INTERFACE
// ============================================================

/**
 * Main unified report structure
 * Both BASIC and PRO tiers use this structure
 */
export interface UnifiedReport {
  // Metadata
  id: string;
  version: string;
  generatedAt: string;
  tier: ReportTier;

  // Sections
  header: ReportHeader;
  progressHistory: ProgressHistory;
  fixSummary?: FixSummary;              // PRO only
  remainingIssues: RemainingIssues;
  businessImpact: BusinessImpact;
  educational: EducationalContent;
  ideIntegration?: IDEIntegration;      // BASIC only - IDE export formats
  skillsAndAchievements: SkillsAndAchievements;
  commitInfo?: CommitInfo;               // PRO only
  metadata: UnifiedReportMetadata;
}

// ============================================================
// SECTION 1: HEADER & SCORE
// ============================================================

/**
 * Report header section with repository, PR, analysis info and score
 */
export interface ReportHeader {
  // Repository Info
  repository: {
    url: string;
    name: string;
    owner: string;
    defaultBranch: string;
  };

  // PR Info
  pullRequest: {
    number: number;
    title: string;
    author: string;
    sourceBranch: string;
    targetBranch: string;
    url: string;
  };

  // Analysis Info
  analysis: {
    id: string;
    timestamp: string;
    mode: AnalysisMode;
    duration: number;  // milliseconds
  };

  // Score
  score: {
    value: number;                    // 0-100
    grade: Grade;
    gradeLabel: string;               // "Excellent", "Good", etc.
    previous?: number;                // PRO: score before fixes
    improvement?: number;             // PRO: value - previous
    improvementPercent?: number;      // PRO: percentage change
  };

  // Decision
  decision: {
    status: DecisionStatus;
    reason: string;
    blockingIssuesCount: number;
    previousStatus?: DecisionStatus;  // PRO: before fixes
  };

  // Quick Stats
  stats: {
    totalIssuesFound: number;
    issuesByStatus: {
      new: number;
      existing: number;
      resolved: number;
    };
    issuesBySeverity: {
      critical: number;
      high: number;
      medium: number;
      low: number;
    };
    // PRO only
    issuesFixed?: number;
    issuesRemaining?: number;
    issuesRequiringReview?: number;
  };
}

// ============================================================
// SECTION 2: PROGRESS HISTORY
// ============================================================

/**
 * Progress history section for tracking analysis over time
 */
export interface ProgressHistory {
  // User context
  isFirstTimeUser: boolean;
  userId: string;
  repositoryId: string;

  // For first-time users
  firstTimeMessage?: string;

  // Historical data (for returning users)
  history?: {
    analyses: HistoricalAnalysis[];
    displayCount: number;       // Default 5, user configurable
    totalAvailable: number;
  };

  // Trend (for returning users)
  trend?: {
    direction: 'improving' | 'declining' | 'stable';
    changePoints: number;       // Total change over history
    changePercent: number;
    bestScore: number;
    worstScore: number;
    averageScore: number;
  };

  // Chart data (for visualization)
  chartData?: ChartDataPoint[];
}

/**
 * Historical analysis record
 */
export interface HistoricalAnalysis {
  id: string;
  prNumber: number;
  prTitle: string;
  timestamp: string;
  scoreBefore: number;
  scoreAfter: number;
  grade: string;
  issuesFixed: number;
}

/**
 * Chart data point for visualization
 */
export interface ChartDataPoint {
  x: string;                  // PR identifier or date
  y: number;                  // Score
  label: string;              // Tooltip text
  isCurrent: boolean;
}

// ============================================================
// SECTION 3: FIX SUMMARY (PRO ONLY)
// ============================================================

/**
 * Fix summary section showing all fixes applied (PRO only)
 */
export interface FixSummary {
  // Overview
  overview: {
    totalAttempted: number;
    totalSuccessful: number;
    totalRequiringReview: number;
    totalRolledBack: number;
    totalCannotFix: number;
    successRate: number;        // percentage
  };

  // Successfully fixed (grouped by rule)
  successfullyFixed: {
    total: number;
    byCategory: Record<IssueCategory, number>;
    byTier: {
      tier1Native: number;
      tier2Dedicated: number;
      tier2_5Pattern: number;
      tier2_5CloudAPI: number;
      tier3AI: number;
    };
    byRule: FixedRuleGroup[];
  };

  // Requires review
  requiresReview: {
    total: number;
    highPriority: ReviewItem[];     // Security/Deps/Performance
    lowConfidence: ReviewItem[];    // Below threshold
  };

  // Rolled back
  rolledBack: RolledBackItem[];

  // Cannot auto-fix
  cannotAutoFix: {
    total: number;
    byReason: Record<UnfixedReason, number>;
    items: UnfixedItem[];
  };
}

/**
 * Group of fixes for a single rule
 */
export interface FixedRuleGroup {
  ruleId: string;
  ruleName: string;
  ruleDescription: string;
  category: IssueCategory;
  severity: Severity;
  count: number;
  tier: FixTier;
  tierLabel: string;
  confidence: number;
  confidenceLabel: 'high' | 'medium' | 'low';
  verificationStatus: 'passed' | 'passed_with_warnings';

  // Files affected (collapsed by default)
  files: FixedFile[];

  // Individual fixes (for deep dive, lazy loaded)
  fixes?: IndividualFix[];
}

/**
 * File affected by fixes
 */
export interface FixedFile {
  path: string;
  relativePath: string;
  lines: number[];
  fixCount: number;
}

/**
 * Individual fix details
 */
export interface IndividualFix {
  id: string;
  file: string;
  line: number;
  column?: number;
  originalCode: string;
  fixedCode: string;
  explanation: string;
}

/**
 * Item requiring human review
 */
export interface ReviewItem {
  id: string;
  ruleId: string;
  ruleName: string;
  category: IssueCategory;
  severity: Severity;
  file: string;
  line: number;
  confidence: number;
  reviewReason: 'security' | 'dependency' | 'performance' | 'low_confidence';
  reviewReasonLabel: string;
  originalCode: string;
  fixedCode: string;
  explanation: string;
  recommendation: string;
}

/**
 * Fix that was rolled back due to failure
 */
export interface RolledBackItem {
  id: string;
  ruleId: string;
  ruleName: string;
  file: string;
  line: number;
  reason: 'verification_failed' | 'regression_introduced';
  reasonLabel: string;
  attemptedFix: string;
  errorDetails: string;
  regressionCount?: number;
  manualFixGuide: string;
}

/**
 * Issue that could not be auto-fixed
 */
export interface UnfixedItem {
  id: string;
  ruleId: string;
  ruleName: string;
  category: IssueCategory;
  severity: Severity;
  file: string;
  line: number;
  reason: UnfixedReason;
  reasonLabel: string;
  explanation: string;
  manualFixSteps: string[];
  estimatedEffort: 'trivial' | 'minor' | 'moderate' | 'significant';
  estimatedTime: string;
  blocksMerge: boolean;
}

// ============================================================
// SECTION 4: REMAINING ISSUES
// ============================================================

/**
 * Remaining issues section showing what still needs attention
 */
export interface RemainingIssues {
  // Summary
  summary: {
    total: number;
    bySeverity: Record<Severity, number>;
    byCategory: Record<IssueCategory, number>;
    byStatus: {
      new: number;
      existingModified: number;
      existingRest: number;
    };
  };

  // Blocking issues (full detail)
  blocking: DetailedIssue[];

  // High priority (full detail)
  highPriority: DetailedIssue[];

  // Medium/Low (grouped by rule)
  mediumLow: GroupedIssue[];
}

/**
 * Detailed issue information
 */
export interface DetailedIssue {
  // Identity
  id: string;
  ruleId: string;
  ruleName: string;

  // Classification
  category: IssueCategory;
  severity: Severity;
  status: 'new' | 'existing_modified' | 'existing_rest';
  blocksMerge: boolean;

  // Location
  file: string;
  relativePath: string;
  line: number;
  column?: number;
  endLine?: number;
  endColumn?: number;

  // Educational content
  title: string;
  description: string;
  whyItMatters: string;
  commonCauses: string[];
  impactIfNotFixed: string;
  riskLevel: 'critical' | 'high' | 'medium' | 'low';

  // Code context
  codeSnippet: string;
  codeLanguage: string;

  // Fix guidance
  manualFixSteps: string[];
  recommendedCode?: string;
  bestPractices: string[];

  // For PRO: why auto-fix failed
  autoFixFailureReason?: UnfixedReason;
  autoFixFailureExplanation?: string;

  // Occurrences
  occurrenceCount: number;
  otherLocations?: IssueLocation[];

  // Related resources
  documentationUrl?: string;
  learnMoreUrl?: string;
}

/**
 * Issue location reference
 */
export interface IssueLocation {
  file: string;
  line: number;
}

/**
 * Grouped issue (for medium/low priority)
 */
export interface GroupedIssue {
  ruleId: string;
  ruleName: string;
  category: IssueCategory;
  severity: Severity;
  count: number;
  briefDescription: string;
  files: GroupedIssueFile[];
  // Expanded details (lazy loaded)
  expandedDetails?: DetailedIssue[];
}

/**
 * File in a grouped issue
 */
export interface GroupedIssueFile {
  path: string;
  lines: number[];
}

// ============================================================
// SECTION 5: BUSINESS IMPACT
// ============================================================

/**
 * Business impact analysis section
 */
export interface BusinessImpact {
  // Time analysis
  time: {
    // For BASIC: estimated time to fix manually
    // For PRO: actual time saved
    automated: TimeValue;
    manual: TimeValue;
    saved?: TimeValueWithPercent;      // PRO only
  };

  // Cost analysis
  cost: {
    hourlyRate: number;
    manualEstimate: number;
    codequalCost: number;
    netSavings?: number;      // PRO only
  };

  // Risk reduction (PRO only)
  riskReduction?: {
    securityIssuesFixed: number;
    criticalIssuesFixed: number;
    highIssuesFixed: number;
    technicalDebtReduced: number;
  };

  // Remaining effort
  remainingEffort: {
    totalHours: number;
    formatted: string;
    issueCount: number;
    byEffort: EffortBreakdown;
  };

  // ROI summary (PRO only)
  roi?: {
    timeSavedPercent: number;
    costSavedPercent: number;
    issuesResolvedPercent: number;
    summary: string;
  };
}

/**
 * Time value with formatting
 */
export interface TimeValue {
  value: number;          // minutes
  formatted: string;      // "2 minutes" or "4.5 hours"
}

/**
 * Time value with percentage
 */
export interface TimeValueWithPercent extends TimeValue {
  percent: number;
}

/**
 * Effort breakdown by category
 */
export interface EffortBreakdown {
  trivial: { count: number; totalMinutes: number };
  minor: { count: number; totalMinutes: number };
  moderate: { count: number; totalMinutes: number };
  significant: { count: number; totalMinutes: number };
}

// ============================================================
// SECTION 6: EDUCATIONAL CONTENT
// ============================================================

/**
 * Educational content section
 */
export interface EducationalContent {
  // Learning paths (only for remaining unfixed issues)
  learningPaths: LearningPath[];

  // Phased remediation plan
  phasedPlan: {
    phases: RemediationPhase[];
    totalEstimatedTime: string;
  };

  // Quick wins (easy fixes for immediate impact)
  quickWins?: QuickWin[];
}

/**
 * Learning path for a category
 */
export interface LearningPath {
  category: IssueCategory;
  categoryLabel: string;
  issueCount: number;
  priorityLevel: 'high' | 'medium' | 'low';
  modules: LearningModule[];
}

/**
 * Learning module within a path
 */
export interface LearningModule {
  id: string;
  title: string;
  description: string;
  estimatedTime: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  resources: LearningResource[];
}

/**
 * Learning resource
 */
export interface LearningResource {
  type: 'article' | 'video' | 'tutorial' | 'documentation';
  title: string;
  url: string;
  provider?: string;
}

/**
 * Remediation phase
 */
export interface RemediationPhase {
  number: number;
  title: string;
  focus: string;
  description: string;
  ruleIds: string[];
  issueCount: number;
  estimatedTime: string;
  priority: 'immediate' | 'short_term' | 'long_term';
}

/**
 * Quick win opportunity
 */
export interface QuickWin {
  ruleId: string;
  title: string;
  effort: string;
  impact: string;
  count: number;
}

// ============================================================
// SECTION 7: SKILLS & ACHIEVEMENTS
// ============================================================

/**
 * Skills and achievements section
 */
export interface SkillsAndAchievements {
  // Overall level (cross-repo)
  level: {
    current: number;
    title: string;                    // "Code Quality Expert"
    xp: number;
    xpForCurrentLevel: number;
    xpForNextLevel: number;
    progressPercent: number;
  };

  // Skills by category
  skills: Record<IssueCategory, CategorySkill>;

  // XP earned this session
  xpEarned: {
    total: number;
    breakdown: XPBreakdownItem[];
  };

  // Achievements
  achievements: {
    unlocked: UnlockedAchievement[];
    inProgress: InProgressAchievement[];
    totalUnlocked: number;
    totalAvailable: number;
  };

  // Community impact (PRO only)
  communityImpact?: CommunityImpact;
}

/**
 * Skill for a single category
 */
export interface CategorySkill {
  score: number;                    // 0-100
  scoreLabel: string;               // "Expert", "Proficient", etc.
  trend: 'improving' | 'declining' | 'stable';
  trendValue: number;               // +5, -3, 0
  issuesFixedLifetime: number;
  issuesFixedThisSession: number;
}

/**
 * XP breakdown item
 */
export interface XPBreakdownItem {
  action: string;
  description: string;
  amount: number;
}

/**
 * Unlocked achievement
 */
export interface UnlockedAchievement {
  id: string;
  name: string;
  description: string;
  icon: string;                   // Icon identifier
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
  unlockedAt: string;
  isNew: boolean;                 // Unlocked this session
}

/**
 * Achievement in progress
 */
export interface InProgressAchievement {
  id: string;
  name: string;
  description: string;
  current: number;
  target: number;
  progressPercent: number;
}

/**
 * Community impact metrics (PRO only)
 */
export interface CommunityImpact {
  patternsContributed: number;
  patternsContributedThisSession: number;
  developersHelped: number;
  timeSavedForOthers: string;       // "42 hours"
  contributorRank?: string;          // "Top 5%"
  contributorTier?: 'bronze' | 'silver' | 'gold' | 'platinum';
}

// ============================================================
// SECTION 8: COMMIT INFO (PRO ONLY)
// ============================================================

/**
 * Commit information section (PRO only)
 */
export interface CommitInfo {
  // Branch info
  branch: {
    name: string;
    url: string;
    isNew: boolean;
  };

  // Commit info
  commit: {
    sha: string;
    shortSha: string;
    message: string;
    url: string;
  };

  // Files modified
  filesModified: {
    total: number;
    added: number;
    modified: number;
    deleted: number;
    list: ModifiedFile[];
  };

  // Pull request (if created)
  pullRequest?: {
    number: number;
    title: string;
    url: string;
    status: 'open' | 'merged' | 'closed';
  };

  // Review document
  reviewDocument: {
    filename: string;                 // "CODEQUAL_FIXES.md"
    url: string;
    content: string;
  };
}

/**
 * Modified file in commit
 */
export interface ModifiedFile {
  path: string;
  changeType: 'added' | 'modified' | 'deleted';
  additions: number;
  deletions: number;
}

// ============================================================
// SECTION 9: METADATA
// ============================================================

/**
 * Report metadata section
 */
export interface UnifiedReportMetadata {
  // Analysis details
  analysis: {
    id: string;
    startTime: string;
    endTime: string;
    duration: {
      total: number;                  // milliseconds
      formatted: string;              // "2m 35s"
      breakdown: DurationBreakdown;
    };
    mode: AnalysisMode;
    modeDescription: string;
  };

  // Tools used
  tools: ToolUsage[];

  // Agents used
  agents: AgentUsage[];

  // Cost breakdown
  costs: CostBreakdown;

  // Export options
  exports: {
    available: ExportFormat[];
    urls: Record<string, string>;
  };

  // Report URLs
  urls: {
    web: string;
    api: string;
    raw: string;
  };
}

/**
 * Duration breakdown
 */
export interface DurationBreakdown {
  cloning: number;
  scanning: number;
  comparison: number;
  enrichment: number;
  fixing?: number;              // PRO only
  reporting: number;
}

/**
 * Tool usage information
 */
export interface ToolUsage {
  name: string;
  version: string;
  category: IssueCategory;
  issuesFound: number;
  executionTime: number;
  status: 'success' | 'partial' | 'failed';
}

/**
 * Agent usage information
 */
export interface AgentUsage {
  name: string;
  role: string;
  model: string;
  tokensUsed: number;
  cost: number;
  executionTime: number;
}

/**
 * Cost breakdown
 */
export interface CostBreakdown {
  analysis: {
    apiCalls: number;
    tokens: number;
    cost: number;
  };
  fixing?: {                        // PRO only
    apiCalls: number;
    tokens: number;
    cost: number;
  };
  total: number;
}

/**
 * Available export formats
 */
export type ExportFormat = 'markdown' | 'html' | 'pdf' | 'sarif' | 'json' | 'lsp' | 'gitlab';

// ============================================================
// SECTION 10: IDE INTEGRATION (BASIC TIER ONLY)
// ============================================================

/**
 * IDE Integration section for BASIC tier users
 * Provides export formats and IDE setup guidance for manual fix application
 */
export interface IDEIntegration {
  // Report ID for API calls
  reportId: string;
  analysisId: string;

  // IDE Setup Guides
  ideGuides: IDEGuide[];

  // Export Formats
  exportFormats: ExportFormatInfo[];

  // CI/CD Integration Snippets
  ciIntegration: CIIntegrationSnippet[];

  // API Endpoints
  apiEndpoints: APIEndpointInfo[];
}

/**
 * IDE setup guide
 */
export interface IDEGuide {
  ide: 'vscode' | 'cursor' | 'jetbrains' | 'neovim' | 'vim';
  displayName: string;
  extensionUrl?: string;
  pluginUrl?: string;
  setupInstructions: string;
  applyFixCommand: string;
}

/**
 * Export format information
 */
export interface ExportFormatInfo {
  format: ExportFormat;
  displayName: string;
  description: string;
  useCase: string;
  filename: string;
  downloadUrl: string;
  contentType: string;
}

/**
 * CI/CD integration snippet
 */
export interface CIIntegrationSnippet {
  platform: 'github' | 'gitlab' | 'jenkins' | 'circleci';
  displayName: string;
  description: string;
  codeSnippet: string;
  language: string;
}

/**
 * API endpoint information
 */
export interface APIEndpointInfo {
  endpoint: string;
  method: 'GET' | 'POST';
  description: string;
  format: ExportFormat;
}

// ============================================================
// GENERATION INPUT TYPES
// ============================================================

/**
 * Input for generating a unified report
 */
export interface GenerateReportInput {
  analysisResult: V9AnalysisResultInput;
  fixResult?: FixOrchestrationResultInput;
  userId: string;
  repositoryId: string;
  tier: ReportTier;
}

/**
 * V9 analysis result (input for report generation)
 */
export interface V9AnalysisResultInput {
  id: string;
  repositoryUrl: string;
  prNumber: number;
  prTitle: string;
  prAuthor: string;
  prBranch: string;
  baseBranch: string;
  mode: AnalysisMode;
  timestamp: string;
  duration: number;
  score: number;
  blockingCount: number;
  issues: AnalyzedIssue[];
}

/**
 * Analyzed issue from V9 analysis
 */
export interface AnalyzedIssue {
  id: string;
  ruleId: string;
  tool: string;
  file: string;
  line: number;
  column?: number;
  endLine?: number;
  endColumn?: number;
  message: string;
  category: IssueCategory;
  severity: Severity;
  status: 'new' | 'existing_modified' | 'existing_rest' | 'resolved';
  codeSnippet?: string;
  language?: string;
}

/**
 * Fix orchestration result (input for PRO reports)
 */
export interface FixOrchestrationResultInput {
  score: number;
  execution: {
    totalFixesApplied: number;
    totalRolledBack: number;
    totalRequiringReview: number;
  };
  fixes: AppliedFix[];
  reviewRequired: ReviewRequiredFix[];
  rolledBack: RolledBackFix[];
  unfixed: UnfixedIssue[];
  commitInfo?: CommitInfo;
}

/**
 * Applied fix from orchestration
 */
export interface AppliedFix {
  issueId: string;
  ruleId: string;
  tier: FixTier;
  confidence: number;
  file: string;
  line: number;
  originalCode: string;
  fixedCode: string;
  explanation: string;
  verificationStatus: 'passed' | 'passed_with_warnings';
}

/**
 * Fix requiring review
 */
export interface ReviewRequiredFix extends AppliedFix {
  reviewReason: 'security' | 'dependency' | 'performance' | 'low_confidence';
  recommendation: string;
}

/**
 * Rolled back fix
 */
export interface RolledBackFix {
  issueId: string;
  ruleId: string;
  file: string;
  line: number;
  attemptedFix: string;
  reason: 'verification_failed' | 'regression_introduced';
  errorDetails: string;
  regressionCount?: number;
}

/**
 * Issue that could not be fixed
 */
export interface UnfixedIssue {
  issueId: string;
  ruleId: string;
  file: string;
  line: number;
  reason: UnfixedReason;
  explanation: string;
}

// ============================================================
// REPOSITORY INTERFACES
// ============================================================

/**
 * Dependencies for report generation
 */
export interface GenerateReportDependencies {
  userPreferencesRepo: UserPreferencesRepository;
  analysisHistoryRepo: AnalysisHistoryRepository;
  userSkillsRepo: UserSkillsRepository;
  achievementsRepo: AchievementsRepository;
}

/**
 * User preferences repository interface
 */
export interface UserPreferencesRepository {
  getByUserId(userId: string): Promise<UserPreferences>;
  update(userId: string, preferences: Partial<UserPreferences>): Promise<UserPreferences>;
}

/**
 * Analysis history repository interface
 */
export interface AnalysisHistoryRepository {
  getByRepository(userId: string, repositoryId: string): Promise<HistoricalAnalysis[]>;
  create(analysis: CreateAnalysisHistoryInput): Promise<void>;
}

/**
 * User skills repository interface
 */
export interface UserSkillsRepository {
  getByUserId(userId: string): Promise<UserSkills>;
  updateFromAnalysis(
    userId: string,
    analysisResult: V9AnalysisResultInput,
    fixResult?: FixOrchestrationResultInput
  ): Promise<void>;
}

/**
 * Achievements repository interface
 */
export interface AchievementsRepository {
  getByUserId(userId: string): Promise<UserAchievements>;
  unlock(userId: string, achievementId: string): Promise<void>;
  updateProgress(userId: string, achievementId: string, progress: number): Promise<void>;
}

// ============================================================
// DATABASE ENTITY TYPES
// ============================================================

/**
 * User preferences entity
 */
export interface UserPreferences {
  userId: string;
  historyDisplayCount: number;
  defaultOutputMethod: 'commit' | 'branch' | 'pull_request' | 'patch';
  defaultCommitStyle: 'single' | 'grouped_category' | 'grouped_tier';
  defaultFixScope: 'safe' | 'recommended' | 'maximum' | 'always_ask';
  commitMessageTemplate: string;
  reviewConfidenceThreshold: number;
  alwaysReviewSecurity: boolean;
  alwaysReviewDependencies: boolean;
  alwaysReviewPerformance: boolean;
  hourlyRate: number;
  achievementStyle: 'professional' | 'gamified';
  createdAt: string;
  updatedAt: string;
}

/**
 * User skills entity
 */
export interface UserSkills {
  userId: string;
  level: number;
  totalXp: number;
  securityScore: number;
  codeQualityScore: number;
  dependenciesScore: number;
  performanceScore: number;
  architectureScore: number;
  issuesFixedTotal: number;
  analysesCompleted: number;
  patternsContributed: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * User achievements entity
 */
export interface UserAchievements {
  unlocked: UnlockedAchievement[];
  inProgress: InProgressAchievement[];
  totalUnlocked: number;
  totalAvailable: number;
}

/**
 * Create analysis history input
 */
export interface CreateAnalysisHistoryInput {
  userId: string;
  repositoryId: string;
  prNumber: number;
  prTitle: string;
  scoreBefore: number;
  scoreAfter: number;
  grade: string;
  tier: ReportTier;
  issuesFound: number;
  issuesFixed: number;
  reportId: string;
}

// ============================================================
// UTILITY TYPES
// ============================================================

/**
 * Report section names for lazy loading
 */
export type ReportSectionName =
  | 'header'
  | 'progressHistory'
  | 'fixSummary'
  | 'remainingIssues'
  | 'businessImpact'
  | 'educational'
  | 'skillsAndAchievements'
  | 'commitInfo'
  | 'metadata';

/**
 * Options for getting a report section
 */
export interface GetSectionOptions {
  expand?: string[];
  limit?: number;
  offset?: number;
}
