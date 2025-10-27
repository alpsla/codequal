/**
 * V9 Report Types
 * 
 * Shared type definitions for V9 grouped report generation.
 */

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
    bestPractices?: string[];
  };
  educationalLinks?: string[];
  isGroupRepresentative?: boolean;
  groupSize?: number;
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
  severity: string;
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
  groups: GroupMetadata[];
}

export interface GroupMetadata {
  id: string;
  rule: string;
  tool: string;
  severity: string;
  category: string;
  count: number;
  attachment_file: string;
  has_ai_fix: boolean;
  auto_fixable: boolean;
}

export interface IDEFixFile {
  type: 'cursor' | 'vscode' | 'jetbrains';
  filename: string;
  content: any;
}

export interface ReportMetadata {
  repositoryUrl: string;
  repositoryName?: string;
  prNumber: number;
  prTitle?: string;
  prAuthor?: string;
  baseBranch: string;
  prBranch?: string;
  analysisDate: string;
  duration: string;
  totalDuration?: string;
  commit?: string;
}

export interface ScoreBreakdown {
  overall: number;
  security: number;
  performance: number;
  quality: number;
  architecture: number;
  dependencies: number;
  grade: string;
  interpretation: {
    emoji: string;
    label: string;
    description: string;
  };
}

