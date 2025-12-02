/**
 * Type definitions for CodeQual VSCode Extension
 * Includes SARIF 2.1.0 schema types and LSP CodeAction types
 */

import * as vscode from 'vscode';

// ============================================================================
// SARIF 2.1.0 Types
// ============================================================================

export interface SarifLog {
  version: string;
  $schema?: string;
  runs: SarifRun[];
}

export interface SarifRun {
  tool: SarifTool;
  results?: SarifResult[];
  artifacts?: SarifArtifact[];
  invocations?: SarifInvocation[];
  properties?: Record<string, unknown>;
}

export interface SarifTool {
  driver: SarifToolComponent;
  extensions?: SarifToolComponent[];
}

export interface SarifToolComponent {
  name: string;
  version?: string;
  informationUri?: string;
  rules?: SarifReportingDescriptor[];
  notifications?: SarifReportingDescriptor[];
}

export interface SarifReportingDescriptor {
  id: string;
  name?: string;
  shortDescription?: SarifMultiformatMessageString;
  fullDescription?: SarifMultiformatMessageString;
  helpUri?: string;
  help?: SarifMultiformatMessageString;
  defaultConfiguration?: SarifReportingConfiguration;
  properties?: Record<string, unknown>;
}

export interface SarifReportingConfiguration {
  level?: 'none' | 'note' | 'warning' | 'error';
  enabled?: boolean;
  rank?: number;
}

export interface SarifMultiformatMessageString {
  text: string;
  markdown?: string;
}

export interface SarifResult {
  ruleId?: string;
  ruleIndex?: number;
  rule?: SarifReportingDescriptor;
  message: SarifMessage;
  level?: 'none' | 'note' | 'warning' | 'error';
  locations?: SarifLocation[];
  fixes?: SarifFix[];
  properties?: Record<string, unknown>;
  analysisTarget?: SarifArtifactLocation;
  relatedLocations?: SarifLocation[];
  codeFlows?: SarifCodeFlow[];
  suppressions?: SarifSuppression[];
}

export interface SarifMessage {
  text: string;
  markdown?: string;
  arguments?: string[];
}

export interface SarifLocation {
  physicalLocation?: SarifPhysicalLocation;
  logicalLocations?: SarifLogicalLocation[];
  message?: SarifMessage;
  properties?: Record<string, unknown>;
}

export interface SarifPhysicalLocation {
  artifactLocation?: SarifArtifactLocation;
  region?: SarifRegion;
  contextRegion?: SarifRegion;
}

export interface SarifArtifactLocation {
  uri?: string;
  uriBaseId?: string;
  index?: number;
}

export interface SarifRegion {
  startLine?: number;
  startColumn?: number;
  endLine?: number;
  endColumn?: number;
  charOffset?: number;
  charLength?: number;
  snippet?: SarifArtifactContent;
  message?: SarifMessage;
}

export interface SarifArtifactContent {
  text?: string;
  binary?: string;
  rendered?: SarifMultiformatMessageString;
}

export interface SarifLogicalLocation {
  name?: string;
  index?: number;
  fullyQualifiedName?: string;
  decoratedName?: string;
  parentIndex?: number;
  kind?: string;
}

export interface SarifFix {
  description?: SarifMessage;
  artifactChanges: SarifArtifactChange[];
  properties?: Record<string, unknown>;
}

export interface SarifArtifactChange {
  artifactLocation: SarifArtifactLocation;
  replacements: SarifReplacement[];
}

export interface SarifReplacement {
  deletedRegion: SarifRegion;
  insertedContent?: SarifArtifactContent;
}

export interface SarifArtifact {
  location?: SarifArtifactLocation;
  length?: number;
  contents?: SarifArtifactContent;
  encoding?: string;
  sourceLanguage?: string;
  hashes?: Record<string, string>;
  properties?: Record<string, unknown>;
}

export interface SarifInvocation {
  executionSuccessful: boolean;
  exitCode?: number;
  exitCodeDescription?: string;
  startTimeUtc?: string;
  endTimeUtc?: string;
  properties?: Record<string, unknown>;
}

export interface SarifCodeFlow {
  message?: SarifMessage;
  threadFlows: SarifThreadFlow[];
}

export interface SarifThreadFlow {
  locations: SarifThreadFlowLocation[];
  message?: SarifMessage;
}

export interface SarifThreadFlowLocation {
  location?: SarifLocation;
  state?: Record<string, unknown>;
  nestingLevel?: number;
  executionOrder?: number;
}

export interface SarifSuppression {
  kind: string;
  status?: string;
  justification?: string;
}

// ============================================================================
// LSP CodeAction Types
// ============================================================================

export interface LSPActionsFile {
  version?: string;
  actions: LSPCodeAction[];
  metadata?: LSPMetadata;
}

export interface LSPMetadata {
  generatedAt?: string;
  repository?: string;
  branch?: string;
  commit?: string;
  totalActions?: number;
}

export interface LSPCodeAction {
  title: string;
  kind?: string;
  diagnostics?: LSPDiagnostic[];
  edit?: LSPWorkspaceEdit;
  command?: LSPCommand;
  isPreferred?: boolean;
  disabled?: {
    reason: string;
  };
  data?: unknown;
}

export interface LSPDiagnostic {
  range: LSPRange;
  severity?: number; // 1=Error, 2=Warning, 3=Information, 4=Hint
  code?: string | number;
  codeDescription?: {
    href: string;
  };
  source?: string;
  message: string;
  tags?: number[];
  relatedInformation?: LSPDiagnosticRelatedInformation[];
  data?: unknown;
}

export interface LSPDiagnosticRelatedInformation {
  location: LSPLocation;
  message: string;
}

export interface LSPLocation {
  uri: string;
  range: LSPRange;
}

export interface LSPRange {
  start: LSPPosition;
  end: LSPPosition;
}

export interface LSPPosition {
  line: number; // 0-based
  character: number; // 0-based
}

export interface LSPWorkspaceEdit {
  changes?: Record<string, LSPTextEdit[]>;
  documentChanges?: LSPTextDocumentEdit[];
}

export interface LSPTextEdit {
  range: LSPRange;
  newText: string;
}

export interface LSPTextDocumentEdit {
  textDocument: LSPVersionedTextDocumentIdentifier;
  edits: LSPTextEdit[];
}

export interface LSPVersionedTextDocumentIdentifier {
  uri: string;
  version: number | null;
}

export interface LSPCommand {
  title: string;
  command: string;
  arguments?: unknown[];
}

// ============================================================================
// Internal Extension Types
// ============================================================================

export interface CodeQualIssue {
  id: string;
  ruleId: string;
  message: string;
  severity: 'error' | 'warning' | 'information' | 'hint';
  file: string;
  range: vscode.Range;
  source: 'sarif' | 'lsp';
  fix?: CodeQualFix;
  properties?: Record<string, unknown>;
}

export interface CodeQualFix {
  title: string;
  edits: vscode.TextEdit[];
  isPreferred?: boolean;
}

export interface IssueStatistics {
  total: number;
  errors: number;
  warnings: number;
  information: number;
  hints: number;
  fixable: number;
}

export interface LoadResult {
  success: boolean;
  issueCount: number;
  message?: string;
  error?: Error;
}

// ============================================================================
// Tree View Types
// ============================================================================

export interface IssueTreeItem {
  type: 'file' | 'issue';
  label: string;
  file?: string;
  issue?: CodeQualIssue;
  children?: IssueTreeItem[];
}

// ============================================================================
// Configuration Types
// ============================================================================

export interface CodeQualConfiguration {
  lspFilePath: string;
  sarifFilePath: string;
  autoLoadLSP: boolean;
  autoLoadSARIF: boolean;
  showDiagnostics: boolean;
  supabaseUrl?: string;
  supabaseAnonKey?: string;
}
