/**
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
import { IssueGroup } from '../utils/issue-grouping';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { AppScoreManager } from './v9-app-score-manager';
import { SkillScoreManager } from './v9-skill-score-manager';

// Service Imports for Delegation Pattern
import {
  formatDate,
  formatDuration,
  cleanAIContent,
  getUserFriendlyTitle
} from '../report/formatter-utils';
import { getCuratedResourcesForRule, enrichIssuesWithAI, enrichIssuesWithSeverityClassification } from '../report/ai-enrichment';
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
  attachment: string;
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
  type: 'regex' | 'ast' | 'template';
  
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
  private repoPath: string | null = null;  // Local repo path for snippet extraction
  // BUG-76: AI enrichment dependencies
  private modelConfigResolver: any = null;
  private detectedLanguage = 'java';
  private detectedRepoSize: 'small' | 'medium' | 'large' | 'enterprise' = 'medium';
  // Feature toggles for optional sections
  private readonly SHOW_FIX_COVERAGE: boolean = false;
  private readonly SHOW_QUICK_WINS: boolean = false;
  private readonly SHOW_SYSTEM_INFO: boolean = false;
  private readonly SHOW_AGENT_PERFORMANCE: boolean = true;  // BUG #9 FIX: Enable AI performance tracking
  private readonly SHOW_TOOL_PERFORMANCE: boolean = true;   // BUG #8 FIX: Enable tool performance tracking
  private readonly SHOW_EFFICIENCY_ANALYSIS: boolean = true; // BUG #10 FIX: Enable cost analysis

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
        // Supabase scoring managers initialized successfully
      } else {
        // Supabase credentials not found - will use simplified scoring
      }
    } catch (error) {
      // Failed to initialize Supabase - will fall back to simplified scoring
    }
  }

  /**
   * Curated resource fallback for known rules (deterministic, zero-API)
   */
  private getCuratedResourcesForRule(ruleId: string): Array<{ title: string; url: string }> {
    return getCuratedResourcesForRule(ruleId);
  }
  
  /**
   * BUG-76: Enrich issues with AI-generated fix suggestions
   * Strategy: 1 AI call per group (cost-optimized)
   * Cost: ~600 tokens per group = $0.0003 per group
   */
  private async enrichIssuesWithAI(
    issues: EnrichedIssue[],
    groups: IssueGroup[]
  ): Promise<EnrichedIssue[]> {
    return enrichIssuesWithAI(
      issues,
      groups,
      this.modelConfigResolver,
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
    }
  ): Promise<GroupedReportOutput> {
    
    const markdown: string[] = [];
    const ideFixFiles: IDEFixFile[] = [];  // BUG FIX #33: Removed separate location attachments

    console.log(`\n[DEBUG-PR#] ====== generateGroupedReport ENTRY ======`);
    console.log(`[DEBUG-PR#] metadata.prNumber: ${metadata.prNumber} (type: ${typeof metadata.prNumber})`);
    console.log(`[DEBUG-PR#] metadata.repository: ${metadata.repository}`);
    console.log(`[DEBUG-PR#] ==========================================\n`);

    // Store repoPath for snippet extraction
    this.repoPath = metadata.repoPath || null;

    // SESSION 13 FIX #2 (MANDATORY): AI-powered severity classification FIRST
    // This re-classifies severity intelligently (e.g., Javadoc HIGH → LOW)
    // Cost: ~150 tokens per group = ~$0.0001 per group = ~$0.002 per PR
    // This is a CORE FEATURE - always enabled for consistent, high-quality results
    // If AI fails, gracefully falls back to original severity (handled in catch blocks)
    // SESSION 13 FIX #3 (CONFIG-BASED): Pass modelConfigResolver for config-based Qwen model
    const severityClassifiedIssues = await enrichIssuesWithSeverityClassification(issues, groups, this.modelConfigResolver);

    // SESSION 13 FIX #4 (BUG-87): Update group severities based on AI-classified issues
    // After AI classification updates individual issue severities, we need to update
    // each group's severity to reflect the AI-classified issues (not original severities)
    // Match issues to groups by rule + tool (not severity, since it changed)
    const updatedGroups = groups.map(group => {
      // Find all issues in this group (match by rule + tool, not severity)
      const groupIssues = severityClassifiedIssues.filter(issue =>
        issue.rule === group.rule && issue.tool === group.tool
      );

      if (groupIssues.length === 0) {
        return group; // No issues, keep original
      }

      // Determine the highest severity among AI-classified issues
      const severities = groupIssues.map(issue => issue.severity);
      const hasCritical = severities.includes('critical');
      const hasHigh = severities.includes('high');
      const hasMedium = severities.includes('medium');

      // Update group severity to highest severity found
      const aiSeverity = hasCritical ? 'critical' :
                         hasHigh ? 'high' :
                         hasMedium ? 'medium' : 'low';

      return {
        ...group,
        severity: aiSeverity as 'critical' | 'high' | 'medium' | 'low'
      };
    });

    // SESSION 13 FIX #5 (BUG-88): Recalculate blockingCount after AI severity classification
    // The original blockingCount was calculated before AI changed severities (high → low)
    // Now we need to count blocking issues using AI-classified severities
    const updatedBlockingCount = severityClassifiedIssues.filter(i =>
      (i.category === 'NEW' || i.category === 'EXISTING_MODIFIED') &&
      (i.severity === 'critical' || i.severity === 'high')
    ).length;

    // Update metadata with correct blocking count
    metadata.blockingCount = updatedBlockingCount;

    // Also update decision based on updated blocking count
    metadata.decision = updatedBlockingCount > 0 ? 'DECLINED' : 'APPROVED';

    // BUG-76: AI-enrich issues BEFORE generating report sections
    // This runs in parallel and adds fixSuggestion to each issue
    const enrichedIssues = await this.enrichIssuesWithAI(severityClassifiedIssues, updatedGroups);

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

    // Issue Groups by Severity (CRITICAL FIRST, then HIGH)
    // SESSION 13 FIX #4 (BUG-87): Filter by AI-classified severities (updatedGroups)
    const critical = updatedGroups.filter(g => g.severity === 'critical');
    const high = updatedGroups.filter(g => g.severity === 'high');
    const medium = updatedGroups.filter(g => g.severity === 'medium');
    const low = updatedGroups.filter(g => g.severity === 'low');
    
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
    
    // High Priority Issues
    if (high.length > 0) {
      markdown.push('## 🟠 High Priority Issues\n');
      for (const group of high) {
        markdown.push(await this.generateGroupSection(group, enrichedIssues, true));
        
        // Generate IDE fix file (BUG FIX #33: Simplified)
        const ideFixFile = await this.generateIDEFixFile(group, enrichedIssues);
        if (ideFixFile) ideFixFiles.push(ideFixFile);
      }
      markdown.push('');
    }
    
    if (medium.length > 0) {
      markdown.push('## 🟡 Medium Priority Issues\n');
      for (const group of medium) {
        markdown.push(await this.generateGroupSection(group, enrichedIssues, true)); // Changed: Show full metadata for ALL severities
        
        const ideFixFile = await this.generateIDEFixFile(group, enrichedIssues); // BUG FIX #33: Simplified
        if (ideFixFile) ideFixFiles.push(ideFixFile);
      }
      markdown.push('');
    }
    
    if (low.length > 0) {
      markdown.push('## 🟢 Low Priority Issues\n');
      for (const group of low) {
        markdown.push(await this.generateGroupSection(group, enrichedIssues, true)); // Changed: Show full metadata for ALL severities
        
        const ideFixFile = await this.generateIDEFixFile(group, enrichedIssues); // BUG FIX #33: Simplified
        if (ideFixFile) ideFixFiles.push(ideFixFile);
      }
      markdown.push('');
    }
    
    // BUG FIX #73: Generate manifest file for IDE lazy loading
    // ENHANCEMENT: Add descriptions, category, priority for better IDE UX
    if (ideFixFiles.length > 0) {
      const enrichManifestEntry = (f: IDEFixFile) => {
        const issueDesc = this.getIssueDescription(f.content.rule, f.content.tool, f.content.severity);
        return {
          filename: f.filename,
          url: `attachments/${f.filename}`,
          severity: f.content.severity,
          category: this.getCategoryFromTool(f.content.tool),
          rule: f.content.rule,
          title: this.formatRuleTitle(f.content.rule),
          description: issueDesc.what.substring(0, 150) + (issueDesc.what.length > 150 ? '...' : ''),
          impact: this.getImpactSummary(f.content.rule, f.content.tool, f.content.severity),
          occurrences: f.content.metadata?.total_occurrences || 0,
          autoFixable: this.canAutoFix({ rule: f.content.rule, tool: f.content.tool, severity: f.content.severity } as any),
          priority: this.calculatePriority(
            f.content.severity,
            this.getCategoryFromTool(f.content.tool),
            f.content.locations?.length || 0
          ),
          tool: f.content.tool
        };
      };

      const manifestFile: IDEFixFile = {
        groupId: 'all-issues',
        filename: 'all-issues-manifest.json',
        content: {
          version: "2.0",  // Version bump for enhanced manifest
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
      ideFixFiles.push(manifestFile);
    }
    
    // BUG FIX #19: Add CheckStyle auto-fix guidance if CheckStyle issues found
    const checkstyleGroups = groups.filter(g => g.tool === 'checkstyle');
    if (checkstyleGroups.length > 0) {
      const checkstyleCount = enrichedIssues.filter(i => i.tool === 'checkstyle').length;
      markdown.push(this.generateCheckStyleAutoFixGuide(checkstyleCount));
      markdown.push('');
    }
    
    // Business Impact Analysis (aggregate from enrichedIssues)
    markdown.push(this.generateBusinessImpact(enrichedIssues, groups));
    markdown.push('');
    
    // Educational Resources (aggregate from enrichedIssues)
    if ((process.env.EDU_USE_BRAVE || '').toLowerCase() === 'true') {
      markdown.push(await this.generateEducationalResourcesBrave(enrichedIssues));
    } else {
      markdown.push(this.generateEducationalResources(enrichedIssues));
    }
    markdown.push('');
    
    // Skills Tracking (developer progress and ranking)
    markdown.push(await this.generateSkillsTracking(enrichedIssues, metadata));
    markdown.push('');
    
    // Analysis Metadata (performance metrics)
    markdown.push(this.generateAnalysisMetadata(metadata));
    markdown.push('');
    
    // PR Comment (personalized, ready-to-paste)
    markdown.push(this.generatePRComment(enrichedIssues, groups, metadata));
    markdown.push('');
    
    // Footer (BUG FIX #33: Only IDE fix files now, no separate location attachments)
    markdown.push(this.generateFooter(groups, ideFixFiles));
    
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
        `find "${this.repoPath}" -type f -name "${basename}" | grep -v "/\\.git/" | head -1`,
        { encoding: 'utf-8' }
      ).trim();
      
      if (result) {
        // Convert to relative path
        return result.replace(this.repoPath + '/', '');
      }
    } catch (error) {
      // File not found or command failed
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
      return issues.map(issue => {
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
          const fullPath = path.join(this.repoPath!, normalizedPath);
          snippet = await CodeSnippetExtractor.extractSnippet(fullPath, issue.line, 3) || '';
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
    
    return locations;
  }
  
  /**
   * Generate report header with complete metadata
   */
  private generateHeader(metadata: any): string {
    return generateHeader(metadata, this.SHOW_PERF_SUBMETRICS);
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
          commit_sha: metadata.commitSHA || null,
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
          commit_sha: metadata.commitSHA || null,
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
  private calculateCategoryScore(categoryIssues: EnrichedIssue[]): number {
    return calculateCategoryScore(categoryIssues);
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
    
    // Calculate auto-fixable coverage
    const autoFixableGroups = groups.filter(g => this.canAutoFix(g));
    const autoFixableIssues = issues.filter(i => 
      autoFixableGroups.some(g => g.rule === i.rule && g.tool === i.tool && g.severity === i.severity)
    );
    const fixCoverage = issues.length > 0 ? (autoFixableIssues.length / issues.length * 100) : 0;
    
    return `## 📊 Executive Summary

### Quality Score

${scoreInterpretation.emoji} **${qualityResult.score.toFixed(1)}/100** (Grade: **${qualityResult.grade}**) - ${scoreInterpretation.label}

> ${scoreInterpretation.description}

**Score Breakdown**:
${qualityResult.categoryScores ? `
**Category Scores** (Repository Health):
- 🔒 Security: ${qualityResult.categoryScores.security}/100
- ⚡ Performance: ${qualityResult.categoryScores.performance}/100
- 🏗️  Architecture: ${qualityResult.categoryScores.architecture}/100
- 📦 Dependencies: ${qualityResult.categoryScores.dependency}/100
- ✨ Code Quality: ${qualityResult.categoryScores.codeQuality}/100

**Overall Scores**:
- 📱 **APP Score**: ${qualityResult.appScore}/100 (MIN of categories - "weakest link")
- 👨‍💻 **Skill Score**: ${qualityResult.skillScore}/100 (AVG of categories)

> Scores saved to Supabase for tracking trends over time

${(() => {
  // Enhancement #1: Calculate auto-fixable issues
  const autoFixableGroups = groups.filter(g => this.canAutoFix(g));
  const autoFixableCount = autoFixableGroups.reduce((sum, g) => sum + g.count, 0);
  const autoFixPercent = issues.length > 0 ? Math.round((autoFixableCount / issues.length) * 100) : 0;
  
  if (autoFixableCount > 0) {
    return `\n> 🚀 **Quick Win**: ${autoFixableCount.toLocaleString()} issues (${autoFixPercent}%) can be automatically fixed using the attached manifest file!\n`;
  }
  return '';
})()}
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

**Total Issues**: ${issues.length.toLocaleString()} (${groups.length} unique types)

**By Severity**:
- 🔴 Critical: ${bySeverity.critical} (${((bySeverity.critical / issues.length) * 100).toFixed(1)}%)
- 🟠 High: ${bySeverity.high} (${((bySeverity.high / issues.length) * 100).toFixed(1)}%)
- 🟡 Medium: ${bySeverity.medium} (${((bySeverity.medium / issues.length) * 100).toFixed(1)}%)
- 🟢 Low: ${bySeverity.low} (${((bySeverity.low / issues.length) * 100).toFixed(1)}%)

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

**By Detected Category** (for scoring):

${(() => {
  // SESSION 13 FIX: Group issues by detectedCategory (Security, Performance, etc.)
  const byDetectedCategory: Record<string, {critical: number, high: number, medium: number, low: number, total: number}> = {
    'Security': { critical: 0, high: 0, medium: 0, low: 0, total: 0 },
    'Performance': { critical: 0, high: 0, medium: 0, low: 0, total: 0 },
    'Architecture': { critical: 0, high: 0, medium: 0, low: 0, total: 0 },
    'Dependencies': { critical: 0, high: 0, medium: 0, low: 0, total: 0 },
    'Code Quality': { critical: 0, high: 0, medium: 0, low: 0, total: 0 }
  };

  issues.forEach(issue => {
    const cat = issue.detectedCategory || 'Code Quality';
    if (byDetectedCategory[cat]) {
      const sev = issue.severity;
      byDetectedCategory[cat][sev] = (byDetectedCategory[cat][sev] || 0) + 1;
      byDetectedCategory[cat].total += 1;
    }
  });

  return `| Category | Critical | High | Medium | Low | Total | Score |
|----------|----------|------|--------|-----|-------|-------|
| 🔒 Security | ${byDetectedCategory['Security'].critical} | ${byDetectedCategory['Security'].high} | ${byDetectedCategory['Security'].medium} | ${byDetectedCategory['Security'].low} | **${byDetectedCategory['Security'].total}** | **${qualityResult.breakdown?.skillCategoryScores?.security ?? qualityResult.skillCategoryScores?.security ?? 'N/A'}/100** |
| ⚡ Performance | ${byDetectedCategory['Performance'].critical} | ${byDetectedCategory['Performance'].high} | ${byDetectedCategory['Performance'].medium} | ${byDetectedCategory['Performance'].low} | **${byDetectedCategory['Performance'].total}** | **${qualityResult.breakdown?.skillCategoryScores?.performance ?? qualityResult.skillCategoryScores?.performance ?? 'N/A'}/100** |
| 🏗️ Architecture | ${byDetectedCategory['Architecture'].critical} | ${byDetectedCategory['Architecture'].high} | ${byDetectedCategory['Architecture'].medium} | ${byDetectedCategory['Architecture'].low} | **${byDetectedCategory['Architecture'].total}** | **${qualityResult.breakdown?.skillCategoryScores?.architecture ?? qualityResult.skillCategoryScores?.architecture ?? 'N/A'}/100** |
| 📦 Dependencies | ${byDetectedCategory['Dependencies'].critical} | ${byDetectedCategory['Dependencies'].high} | ${byDetectedCategory['Dependencies'].medium} | ${byDetectedCategory['Dependencies'].low} | **${byDetectedCategory['Dependencies'].total}** | **${qualityResult.breakdown?.skillCategoryScores?.dependency ?? qualityResult.skillCategoryScores?.dependency ?? 'N/A'}/100** |
| ✨ Code Quality | ${byDetectedCategory['Code Quality'].critical} | ${byDetectedCategory['Code Quality'].high} | ${byDetectedCategory['Code Quality'].medium} | ${byDetectedCategory['Code Quality'].low} | **${byDetectedCategory['Code Quality'].total}** | **${qualityResult.breakdown?.skillCategoryScores?.codeQuality ?? qualityResult.skillCategoryScores?.codeQuality ?? 'N/A'}/100** |
| **TOTAL** | **${bySeverity.critical}** | **${bySeverity.high}** | **${bySeverity.medium}** | **${bySeverity.low}** | **${issues.length}** | - |`;
})()}

> **Score Calculation:** Categories start at base score (APP=100, Skill=50), then deduct: Critical (-5), High (-3), Medium (-1), Low (-0.5). APP Score = MIN(all categories), Skill Score = AVG(all categories).

---

### Decision & Actions

**Blocking Decision**:
- ${blockingIssues.length} blocking issues (NEW or EXISTING_MODIFIED with critical/high severity)
- ${metadata.decision === 'APPROVED' ? '✅ **PR CAN BE MERGED**' : '⛔ **PR REQUIRES FIXES BEFORE MERGE**'}

${this.SHOW_FIX_COVERAGE ? `**Fix Coverage**:
- **${autoFixableGroups.length}/${groups.length} issue groups** support auto-fix (${((autoFixableGroups.length / groups.length) * 100).toFixed(1)}%)
- **${autoFixableIssues.length.toLocaleString()}/${issues.length.toLocaleString()} issues** can be fixed automatically (${fixCoverage.toFixed(1)}%)` : ''}

**Analysis Results**:
- AI-analyzed groups: ${groups.length}
- Cost-optimized analysis: ${(((issues.length - groups.length) / issues.length) * 100).toFixed(1)}% reduction
- Coverage: 100% of detected issues
- Duration: ${this.formatDuration(Math.max(metadata.totalDuration || metadata.analysisTime || 0, 0))}

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
          
          content += `**Developer Trend**: ${trendIcon} Code quality is **${trend}**\n`;
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
    content += `**Recommendations for Leadership:**\n\n`;
    
    const newIssues = issues.filter(i => i.category === 'NEW');
    const criticalCount = issues.filter(i => i.severity === 'critical').length;
    const securityIssues = issues.filter(i => i.detectedCategory === 'Security');
    
    // Enhancement #1: Auto-fix mention in recommendations
    const autoFixableIssues = issues.filter(i => 
      this.canAutoFix({ rule: i.rule, tool: i.tool, severity: i.severity } as IssueGroup)
    );
    const autoFixPercent = issues.length > 0 ? Math.round((autoFixableIssues.length / issues.length) * 100) : 0;
    
    if (autoFixableIssues.length > 0) {
      content += `🚀 **Quick Win**: Use the attached manifest file to automatically fix ${autoFixableIssues.length.toLocaleString()} issues (${autoFixPercent}%) - saving significant development time!\n\n`;
    }
    
    if (criticalCount > 0) {
      content += `1. **Immediate Action**: ${criticalCount} critical issues require senior developer review before deployment\n`;
    } else {
      content += `1. **Quality Status**: No critical issues - PR meets baseline quality standards\n`;
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
    
    const autoFixable = issues.filter(i => 
      this.canAutoFix({ rule: i.rule, tool: i.tool, severity: i.severity } as IssueGroup)
    );
    if (autoFixable.length > issues.length * 0.3) {
      content += `4. **Automation Opportunity**: ${((autoFixable.length / issues.length) * 100).toFixed(0)}% of issues auto-fixable - consider pre-commit hooks\n`;
    } else {
      if (issues.length > 0) {
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
   */
  private getIssueDescription(rule: string, tool: string, severity: string): {
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
    
    // CVE (Dependency vulnerabilities)
    if (ruleText.startsWith('cve-') || tool.toLowerCase() === 'dependency-check') {
      const cveMatch = rule.match(/CVE-(\d{4})-(\d+)/i);
      const year = cveMatch ? cveMatch[1] : 'unknown';
      return {
        what: `Known security vulnerability ${rule} in dependency. This vulnerability was publicly disclosed in ${year} and has a known exploit.`,
        why: `Attackers actively scan for known CVEs in web applications. Public exploits exist, making this vulnerability easy to exploit at scale.`,
        causes: [
          'Using outdated dependency versions',
          'Not regularly updating dependencies',
          'Lack of automated dependency scanning in CI/CD',
          'Delayed security patch application'
        ],
        impact: `${severity === 'critical' ? 'Critical' : 'High'} security risk with publicly available exploits. Could lead to remote code execution, data theft, or system compromise. Compliance frameworks (SOC2, ISO 27001) require timely patching of known vulnerabilities.`
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
    
    // Generic description based on tool and severity (last resort)
    const genericWhat = `This issue was detected by ${tool} as a ${severity} severity problem. Rule: ${rule}`;
    const genericWhy = severity === 'critical' || severity === 'high'
      ? 'This pattern can lead to security vulnerabilities, bugs, or system failures.'
      : 'This pattern can lead to technical debt, maintenance issues, or code quality degradation.';
    const genericCauses = [
      `Code patterns that violate ${tool} best practices`,
      'Legacy code that needs refactoring',
      'Quick implementation without following standards',
      'Lack of code review or static analysis integration'
    ];
    const genericImpact = severity === 'critical' || severity === 'high' 
      ? 'Could lead to security breaches, data loss, system instability, or production outages. Requires immediate attention.'
      : 'May reduce code quality, increase maintenance costs, and accumulate technical debt over time.';
    
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
    
    // CVE/Dependency issues
    if (ruleLower.startsWith('cve-') || toolLower === 'dependency-check') {
      const cveMatch = rule.match(/CVE-(\d{4})-(\d+)/i);
      const cveId = cveMatch ? `${cveMatch[0]}` : rule;
      return `**Fix Strategy**:
1. Update the vulnerable dependency to the latest patched version
2. Check [NVD database](https://nvd.nist.gov/vuln/detail/${cveId}) for official patch information
3. Run \`mvn versions:display-dependency-updates\` or \`gradle dependencyUpdates\`
4. Test thoroughly after updating to ensure compatibility
5. Consider using automated dependency scanning in CI/CD`;
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
    expanded: boolean
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

    // Phase D: User-friendly title
    const friendlyTitle = this.getUserFriendlyTitle(group.rule, group.tool);

    // BUG #89 FIX: Use AI-enriched structured description when available
    // Try to find an issue with AI-enriched issueDescription (prefer issues with code snippets)
    const representativeWithAI = groupIssues.find(i => i.fixSuggestion?.issueDescription) || representative;
    let issueDesc: { what: string; why: string; causes: string[]; impact: string };

    if (representativeWithAI?.fixSuggestion?.issueDescription) {
      // Use AI-generated structured description
      issueDesc = representativeWithAI.fixSuggestion.issueDescription;
      console.log(`[BUG #89] Using AI-enriched description for ${group.rule}`);
    } else {
      // Fallback to hardcoded database
      issueDesc = this.getIssueDescription(group.rule, group.tool, group.severity);
      console.log(`[BUG #89] Using fallback description for ${group.rule}`);
    }

    let section = `### ${severityIcon} ${friendlyTitle}\n\n`;
    
    // Phase D: Quick metadata bar
    section += `**Severity**: ${group.severity.toUpperCase()} | `;
    section += `**Tool**: ${group.tool} | `;
    section += `**Found in**: ${group.count} files | `;
    section += `**Category**: ${representative?.category || group.category}`;
    
    if (canAutoFix) {
      section += ` | **Auto-fix**: ✅ [Available](attachments/group-${this.sanitizeGroupId(group)}-cursor-fix.json)`;
    }
    
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
          snippet = await CodeSnippetExtractor.extractSnippet(fullPath, exampleIssue.line, 3);
          
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
        const aiCode = representative.fixSuggestion.correctedCode.trim();
        // Only remove <think> tags, keep everything else
        const cleanCode = aiCode.replace(/<think>[\s\S]*?<\/think>/gi, '').replace(/<think>[\s\S]*$/gi, '').trim();
        
        if (cleanCode && cleanCode.length >= 20) {
          section += `**Code** (AI-generated example):\n\n`;
          const language = this.getLanguageFromFile(exampleIssue.file);
          section += `\`\`\`${language}\n`;
          section += cleanCode;
        section += '\n```\n\n';
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
        
        // Show AI-generated code example if available
        if (hasValidFix) {
          const cleanCorrectedCode = this.cleanAIContent(representative.fixSuggestion.correctedCode);
          
          // If after cleaning, the code is valid, show it
          if (cleanCorrectedCode && cleanCorrectedCode.length >= 20) {
            if (hasValidSnippet) {
              section += `**Suggested Change**:\n\n`;
              section += '```diff\n';
              section += '- // Before:\n';
              section += (representative.snippet || '').split('\n').map(line => `- ${line}`).join('\n');
              section += '\n\n';
              section += '+ // After:\n';
              section += cleanCorrectedCode.split('\n').map(line => `+ ${line}`).join('\n');
              section += '\n```\n\n';
            } else {
              section += `**Recommended Code**:\n\n`;
              const language = representative?.file ? this.getLanguageFromFile(representative.file) : 'text';
              section += `\`\`\`${language}\n`;
              section += cleanCorrectedCode;
              section += '\n```\n\n';
            }
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
    section += `View complete list: [group-${this.sanitizeGroupId(group)}-locations.json](attachments/group-${this.sanitizeGroupId(group)}-locations.json)\n\n`;
    
    if (canAutoFix) {
      section += `> 💡 **Tip**: Download the IDE fix file to resolve all ${group.count} occurrences with one click!\n\n`;
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
   * Extract fix pattern for IDE automation
   */
  private extractFixPattern(group: IssueGroup, representative: EnrichedIssue): FixPattern {
    // Extract pattern based on rule type
    const fix = representative.fixSuggestion;
    
    if (group.rule === 'AvoidUsingVolatile') {
      return {
        type: 'regex',
        find_regex: 'private volatile (\\w+) (\\w+)( = .+)?;',
        replace_template: 'private final Atomic$1 $2 = new Atomic$1($3);',
        example: {
          before: 'private volatile boolean running = true;',
          after: 'private final AtomicBoolean running = new AtomicBoolean(true);'
        },
        instructions: 'Replace volatile primitive types with AtomicXXX equivalents'
      };
    }
    
    // Generic pattern
    return {
      type: 'template',
      example: {
        before: representative.snippet || '',
        after: fix?.correctedCode || ''
      },
      instructions: fix?.fix || 'Apply the suggested fix'
    };
  }
  
  /**
   * Determine if group can be auto-fixed
   * BUG FIX #13: Include all CheckStyle rules (100% auto-fixable with IDE formatters)
   */
  private canAutoFix(group: IssueGroup): boolean {
    // CheckStyle issues are 100% auto-fixable with IDE formatters (google-java-format, IntelliJ, etc.)
    if (group.tool === 'checkstyle') {
      return true;
    }
    
    // PMD rules that support automated fixing
    const autoFixablePMDRules = [
      'AvoidUsingVolatile',
      'GuardLogStatement',
      'SystemPrintln',
      'ClassWithOnlyPrivateConstructorsShouldBeFinal',
      'ReturnEmptyCollectionRatherThanNull'
    ];
    
    return autoFixablePMDRules.includes(group.rule);
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
   * ENHANCEMENT: Get short impact summary for manifest
   */
  private getImpactSummary(rule: string, tool: string, severity: string): string {
    const fullDescription = this.getIssueDescription(rule, tool, severity);
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
    if (group.rule === 'AvoidUsingVolatile') return 'high';
    if (group.rule === 'GuardLogStatement') return 'medium';
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
   * Determine if safe to auto-apply without review
   */
  private isSafeToAutoApply(group: IssueGroup): boolean {
    // Only simple, non-breaking changes
    const safeRules = [
      'GuardLogStatement',
      'ClassWithOnlyPrivateConstructorsShouldBeFinal'
    ];
    return safeRules.includes(group.rule);
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
   */
  private generateBusinessImpact(issues: EnrichedIssue[], groups: IssueGroup[]): string {
    return generateBusinessImpact(issues, groups);
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
| Category | Blocking | Backlog | Total Issues | Risk Level |
|----------|----------|---------|--------------|------------|
| **Security** | ${securityIssues.filter(i => (i.severity === 'critical' || i.severity === 'high') && (i.category === 'NEW' || i.category === 'EXISTING_MODIFIED')).length} | ${securityIssues.length - securityIssues.filter(i => (i.severity === 'critical' || i.severity === 'high') && (i.category === 'NEW' || i.category === 'EXISTING_MODIFIED')).length} | ${securityIssues.length} | ${this.getRiskImpactLevel(securityIssues)} |
| **Performance** | ${performanceIssues.filter(i => (i.severity === 'critical' || i.severity === 'high') && (i.category === 'NEW' || i.category === 'EXISTING_MODIFIED')).length} | ${performanceIssues.length - performanceIssues.filter(i => (i.severity === 'critical' || i.severity === 'high') && (i.category === 'NEW' || i.category === 'EXISTING_MODIFIED')).length} | ${performanceIssues.length} | ${this.getRiskImpactLevel(performanceIssues)} |
| **Architecture** | ${architectureIssues.filter(i => (i.severity === 'critical' || i.severity === 'high') && (i.category === 'NEW' || i.category === 'EXISTING_MODIFIED')).length} | ${architectureIssues.length - architectureIssues.filter(i => (i.severity === 'critical' || i.severity === 'high') && (i.category === 'NEW' || i.category === 'EXISTING_MODIFIED')).length} | ${architectureIssues.length} | ${this.getRiskImpactLevel(architectureIssues)} |
| **Dependencies** | ${dependencyIssues.filter(i => (i.severity === 'critical' || i.severity === 'high') && (i.category === 'NEW' || i.category === 'EXISTING_MODIFIED')).length} | ${dependencyIssues.length - dependencyIssues.filter(i => (i.severity === 'critical' || i.severity === 'high') && (i.category === 'NEW' || i.category === 'EXISTING_MODIFIED')).length} | ${dependencyIssues.length} | ${this.getRiskImpactLevel(dependencyIssues)} |
| **Code Quality** | ${codeQualityIssues.filter(i => (i.severity === 'critical' || i.severity === 'high') && (i.category === 'NEW' || i.category === 'EXISTING_MODIFIED')).length} | ${codeQualityIssues.length - codeQualityIssues.filter(i => (i.severity === 'critical' || i.severity === 'high') && (i.category === 'NEW' || i.category === 'EXISTING_MODIFIED')).length} | ${codeQualityIssues.length} | ${this.getRiskImpactLevel(codeQualityIssues)} |

**Legend:**
- **Blocking:** Critical/High severity issues in NEW or EXISTING_MODIFIED files (must fix before merge)
- **Backlog:** Medium/Low severity or pre-existing issues (can be addressed later)
- **Risk Level:** Overall impact assessment based on severity distribution

### Recommendations
${blocking.length > 0 ? `
1. **Immediate Action:** Resolve ${blocking.length} blocking issues before deployment
2. **Priority:** Address remaining blockers first
3. **Planning:** Schedule time for ${backlogMedium.length} medium-severity issues in upcoming sprints
4. **Continuous Improvement:** Track and reduce ${backlogLow.length} low-severity issues over time
` : blockingCritical.length + blockingHigh.length > 0 ? `
1. **Priority:** Address ${blockingCritical.length} critical issues in current sprint
2. **Planning:** Schedule ${blockingHigh.length} high-severity issues for upcoming work
3. **Continuous Improvement:** Integrate static analysis into CI/CD to prevent new issues
` : `
1. **Maintain Quality:** Continue current development practices
2. **Address Backlog:** Systematically reduce ${backlogMedium.length + backlogLow.length} identified issues
3. **Prevention:** Integrate static analysis into CI/CD pipeline
`}

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
    
    return generateEducationalResources(issues);
  }

  private async generateEducationalResourcesBrave(issues: EnrichedIssue[]): Promise<string> {
    return generateEducationalResourcesBrave(issues);
  }
  
  /**
   * BUG FIX #32: Extract Git teammates from repository history
   * Adapted from v9-integrated-analyzer.ts discoverTeamFromGit()
   */
  private discoverTeamFromGit(repoPath: string): Array<{ email: string; name?: string; totalPRs?: number }> {
    try {
      
      if (!fs.existsSync(`${repoPath}/.git`)) {
        return [];
      }
      
      // Get last 200 commits (email::name format)
      const out = execSync(`git -C ${repoPath} log --format=%ae:::%an -n 200`, { 
        stdio: ['ignore', 'pipe', 'ignore'] 
      }).toString();
      
      const lines = out.split('\n').filter(Boolean);
      const map = new Map<string, { email: string; name?: string; totalPRs: number }>();
      
      for (const line of lines) {
        const [email, name] = line.split(':::');
        if (!email) continue;
        
        const key = email.trim().toLowerCase();
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
   * Generate skills tracking section with ranking and trends
   */
  private async generateSkillsTracking(issues: EnrichedIssue[], metadata: any): Promise<string> {
    // Skip if no Supabase or no author info
    if (!this.skillScoreManager || !metadata.prAuthor || !metadata.prAuthorEmail) {
      return '';
    }
    
    try {
      // BUG FIX #14-16: Calculate current PR scores first, then build accurate leaderboard
      // This fixes: ranking logic, score mismatch, and fake teammates
      
      // Get score trend (last 5 PRs)
      const history = await this.skillScoreManager.getScoreTrend(metadata.prAuthorEmail, metadata.repository);
      
      // Calculate current category scores from this PR
      const security = issues.filter(i => i.detectedCategory === 'Security');
      const performance = issues.filter(i => i.detectedCategory === 'Performance');
      const architecture = issues.filter(i => i.detectedCategory === 'Architecture');
      const dependencies = issues.filter(i => i.detectedCategory === 'Dependencies');
      const codeQuality = issues.filter(i => i.detectedCategory === 'Code Quality');
      
      const categoryScores = {
        security: this.calculateCategoryScore(security),
        performance: this.calculateCategoryScore(performance),
        architecture: this.calculateCategoryScore(architecture),
        dependencies: this.calculateCategoryScore(dependencies),
        codeQuality: this.calculateCategoryScore(codeQuality)
      };
      
      // BUG FIX #44: Skill score = AVERAGE of category scores
      const currentPRScore = Math.round(
        (categoryScores.security + categoryScores.performance + categoryScores.architecture + 
         categoryScores.dependencies + categoryScores.codeQuality) / 5
      );
      
      // BUG FIX #32: Fetch Git teammates first, then merge with Supabase data
      let gitTeammates: Array<{ email: string; name?: string; totalPRs?: number }> = [];
      if (this.repoPath) {
        gitTeammates = this.discoverTeamFromGit(this.repoPath);
        console.log(`[V9GroupedReportFormatter] Discovered ${gitTeammates.length} Git teammates from repository`);
      }
      
      // BUG FIX #57: Pass repository to get repo-specific leaderboard (prevents cross-repo contamination)
      // Build team leaderboard from Supabase (only actual teammates from this repository)
      let supabaseLeaderboard = await this.skillScoreManager.getLeaderboard(100, metadata.repository); // Repository-specific
      
      // Filter out obviously fake test data (names like "unknown", "Test Developer", etc.)
      const fakeNames = ['unknown', 'test developer', 'alice developer', 'bob developer', 'test'];
      supabaseLeaderboard = supabaseLeaderboard.filter((dev: any) => {
        const nameLower = (dev.name || '').toLowerCase();
        return !fakeNames.some(fake => nameLower.includes(fake));
      });
      
      // BUG FIX #32: Merge Git teammates with Supabase teammates
      // For Git teammates not in Supabase, add them with baseline 50/100 score
      const teamLeaderboard = [...supabaseLeaderboard];
      
      for (const gitDev of gitTeammates) {
        const existsInSupabase = teamLeaderboard.some((dev: any) => 
          dev.email && dev.email.toLowerCase() === gitDev.email.toLowerCase()
        );
        
        if (!existsInSupabase) {
          // Add Git teammate with baseline score (hasn't been analyzed yet)
          teamLeaderboard.push({
            name: gitDev.name || gitDev.email,
            email: gitDev.email,
            score: 50,  // Baseline: neutral score
            avgScore: 50,
            totalPRs: 0  // No analyzed PRs yet (from Supabase)
          });
        }
      }
      
      // Update or add current developer with current PR score
      const currentDevIndex = teamLeaderboard.findIndex((d: any) => d.email === metadata.prAuthorEmail);
      if (currentDevIndex >= 0) {
        // Update existing entry with current PR score
        teamLeaderboard[currentDevIndex].score = currentPRScore;
      } else {
        // Add current developer
        teamLeaderboard.push({
          name: metadata.prAuthor,
          email: metadata.prAuthorEmail,
          score: currentPRScore,
          avgScore: currentPRScore,
          totalPRs: 1
        });
      }
      
      // Sort by score (descending) to get correct ranking
      teamLeaderboard.sort((a: any, b: any) => b.score - a.score);
      
      // Calculate rank (position in sorted leaderboard)
      const rank = teamLeaderboard.findIndex((d: any) => d.email === metadata.prAuthorEmail) + 1;
      const totalDevelopers = teamLeaderboard.length;
      
      // Team average from cleaned leaderboard
      const teamAvg = teamLeaderboard.length > 0
        ? Math.round(teamLeaderboard.reduce((sum: number, dev: any) => sum + dev.score, 0) / teamLeaderboard.length)
        : 50;
      
      let content = `## 👥 Skills Tracking\n\n`;
      
      // Developer Score Card
      content += `### ${metadata.prAuthor}'s Performance\n\n`;
      content += `**Overall Score:** ${currentPRScore}/100\n`;
      if (rank > 0) {
        content += `**Ranking:** #${rank} of ${totalDevelopers} developers\n`;
      }
      content += `**Team Average:** ${teamAvg}/100\n\n`;
      
      // Category Breakdown
      content += `### Category Breakdown\n\n`;
      content += `| Category | Your Score | Team Avg | Status |\n`;
      content += `|----------|------------|----------|--------|\n`;
      content += `| 🔒 Security | ${categoryScores.security}/100 | ${teamAvg}/100 | ${this.getStatusEmoji(categoryScores.security, teamAvg)} |\n`;
      content += `| ⚡ Performance | ${categoryScores.performance}/100 | ${teamAvg}/100 | ${this.getStatusEmoji(categoryScores.performance, teamAvg)} |\n`;
      content += `| 🏗️  Architecture | ${categoryScores.architecture}/100 | ${teamAvg}/100 | ${this.getStatusEmoji(categoryScores.architecture, teamAvg)} |\n`;
      content += `| 📦 Dependencies | ${categoryScores.dependencies}/100 | ${teamAvg}/100 | ${this.getStatusEmoji(categoryScores.dependencies, teamAvg)} |\n`;
      content += `| ✨ Code Quality | ${categoryScores.codeQuality}/100 | ${teamAvg}/100 | ${this.getStatusEmoji(categoryScores.codeQuality, teamAvg)} |\n\n`;
      
      // Trend Analysis (if history available) – hide if flat or insufficient
      if (history && history.length > 1 && !history.every((v: number) => v === history[0])) {
        const trend = history[history.length - 1] > history[0] ? '📈 Improving' : 
                     history[history.length - 1] < history[0] ? '📉 Declining' : '➡️  Stable';
        
        content += `### Trend (Last ${history.length} PRs)\n\n`;
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
      
      if (weakCategories.length > 0) {
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
        teamLeaderboard.slice(0, 5).forEach((dev: any, idx: number) => {
          const isCurrent = dev.email === metadata.prAuthorEmail;
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
  
  private getStatusEmoji(yourScore: number, teamAvg: number): string {
    if (yourScore >= teamAvg + 10) return '🌟 Excellent';
    if (yourScore >= teamAvg) return '✅ Above Average';
    if (yourScore >= teamAvg - 10) return '➡️ Average';
    return '⚠️ Below Average';
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
    if (this.SHOW_AGENT_PERFORMANCE && metadata.agentPerformance && Array.isArray(metadata.agentPerformance) && metadata.agentPerformance.length > 0) {
      content += `\n### Agent Performance
| Agent | Files Analyzed | Issues Found | Time | Cost |
|-------|----------------|--------------|------|------|
`;
      metadata.agentPerformance.forEach((agent: any) => {
        const issues = agent.issuesFound || agent.issues || 0;
        const time = agent.duration ? (agent.duration / 1000).toFixed(1) + 's' : 'N/A';
        const costValue = agent.cost || 0;
        const cost = costValue === 0 ? 'FREE' : '$' + costValue.toFixed(4);
        content += `| ${agent.name || agent.agent} | ${agent.filesAnalyzed || agent.files || 'N/A'} | ${issues} | ${time} | ${cost} |\n`;
      });
    }

    // Add Tool Performance if available (optional)
    if (this.SHOW_TOOL_PERFORMANCE && metadata.toolPerformance && Array.isArray(metadata.toolPerformance) && metadata.toolPerformance.length > 0) {
      content += `\n### Tool Performance
| Tool | Files Scanned | Issues Found | Duration |
|------|---------------|--------------|----------|
`;
      metadata.toolPerformance.forEach((tool: any) => {
        const duration = tool.duration ? (tool.duration / 1000).toFixed(1) + 's' : 'N/A';
        content += `| ${tool.tool || tool.name} | ${tool.filesScanned || tool.files || 'N/A'} | ${tool.issuesFound || tool.issues || 0} | ${duration} |\n`;
      });
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
      content += `- Total Cost: ${totalCost === 0 ? 'FREE' : '$' + totalCost.toFixed(4)}\n`;
      content += `- Cost per Issue: ${totalCost === 0 ? 'FREE' : '$' + (totalIssues > 0 ? (totalCost / totalIssues).toFixed(6) : '0.000000')}\n`;
      content += `- Issues per Second: ${totalTime > 0 ? ((totalIssues / totalTime) * 1000).toFixed(2) : '0.00'}\n`;
      content += `- Cost per Second: ${totalCost === 0 ? 'FREE' : '$' + (totalTime > 0 ? ((totalCost / totalTime) * 1000).toFixed(6) : '0.000000') + '/s'}\n\n`;
      
      // Performance recommendations
      content += `**Agent Efficiency Ranking:**\n\n`;
      const agentEfficiency = metadata.agentPerformance
        .map((agent: any) => {
          const issues = agent.issuesFound || agent.issues || 0;
          const cost = agent.cost || 0;
          const time = agent.duration || 1;
          const costPerIssue = issues > 0 ? cost / issues : Number.POSITIVE_INFINITY;
          const issuesPerSec = (issues / time) * 1000;
          return {
            name: agent.name || agent.agent,
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
        const badge = agent.cost === 0
          ? '🎁 FREE'
          : !isFinite(agent.costPerIssue)
          ? 'N/A'
          : agent.costPerIssue < 0.001 ? '⚡ Excellent'
          : agent.costPerIssue < 0.01 ? '✅ Good'
          : agent.costPerIssue < 0.1 ? '⚠️ Average' : '🔴 Expensive';
        const costPerIssueStr = agent.cost === 0
          ? 'FREE/issue'
          : isFinite(agent.costPerIssue) ? `$${agent.costPerIssue.toFixed(6)}/issue` : 'N/A cost/issue';
        content += `${rank} **${agent.name}**: ${agent.issues} issues @ ${costPerIssueStr} ${badge}\n`;
      });
      
      // Replacement recommendations (only for paid models)
      const expensiveAgents = agentEfficiency.filter((a: any) => a.cost > 0 && a.costPerIssue > 0.05);
      if (expensiveAgents.length > 0) {
        content += `\n**💡 Optimization Opportunities:**\n`;
        expensiveAgents.forEach((agent: any) => {
          content += `- Consider optimizing **${agent.name}** (high cost/issue: $${agent.costPerIssue.toFixed(4)})\n`;
        });
      } else if (agentEfficiency.every((a: any) => a.cost === 0)) {
        content += `\n**💡 Cost Optimization:**\n`;
        content += `- All agents using FREE models - excellent cost efficiency! 🎉\n`;
      }
    }
    
    // Add Tool Efficiency Analysis
    if (metadata.toolPerformance && Array.isArray(metadata.toolPerformance) && metadata.toolPerformance.length > 0) {
      content += `\n### Tool Efficiency Analysis
`;
      
      const toolEfficiency = metadata.toolPerformance
        .map((tool: any) => {
          const issues = tool.issuesFound || tool.issues || 0;
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
        .sort((a: any, b: any) => b.efficiency - a.efficiency);
      
      content += `\n**Tool Performance Ranking:**\n\n`;
      toolEfficiency.forEach((tool: any, idx: number) => {
        const rank = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `${idx + 1}.`;
        const speed = tool.issuesPerSec > 10 ? '⚡ Fast' : 
                     tool.issuesPerSec > 1 ? '✅ Good' : 
                     tool.issuesPerSec > 0.1 ? '⚠️ Slow' : '🐌 Very Slow';
        content += `${rank} **${tool.name}**: ${tool.issues} issues in ${(tool.time / 1000).toFixed(1)}s (${tool.issuesPerSec.toFixed(2)}/s) ${speed}\n`;
      });
      
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
- Auto-fixable: ${issues.filter(i => this.canAutoFix({ rule: i.rule, tool: i.tool, severity: i.severity } as any)).length}/${issues.length} issues (${groups.filter(g => this.canAutoFix(g)).length}/${groups.length} types)
- Critical: ${issues.filter(i => i.severity === 'critical').length}
- High: ${issues.filter(i => i.severity === 'high').length}
- Medium: ${issues.filter(i => i.severity === 'medium').length}
- Low: ${issues.filter(i => i.severity === 'low').length}
\`\`\`

> 💡 **Tip**: Copy the markdown above and paste it as a comment on your pull request.`;
  }
  
  /**
   * Get personalized greeting
   */
  private getPersonalizedGreeting(author?: string): string {
    if (!author) return 'Hello';
    
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
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
    ideFixFiles: IDEFixFile[]
  ): string {
    return generateFooter(groups, ideFixFiles);
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
      const criticalCount = issueFiles.filter(f => f.content.severity === 'critical').reduce((sum, f) => sum + (f.content.metadata?.total_occurrences || 0), 0);
      const highCount = issueFiles.filter(f => f.content.severity === 'high').reduce((sum, f) => sum + (f.content.metadata?.total_occurrences || 0), 0);
      const mediumCount = issueFiles.filter(f => f.content.severity === 'medium').reduce((sum, f) => sum + (f.content.metadata?.total_occurrences || 0), 0);
      const lowCount = issueFiles.filter(f => f.content.severity === 'low').reduce((sum, f) => sum + (f.content.metadata?.total_occurrences || 0), 0);
      
      footer += `**Total auto-fixable issues**: ${totalFixable.toLocaleString()}\n`;
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
        footer += `        🔄 High: 5/${highCount} fixed (${Math.round((5/highCount)*100)}%)...\n`;
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
      footer += `             ✅ After:  0 critical, 0 high\n`;
      footer += `             🎉 All blockers resolved! PR approved.\n`;
      footer += `\`\`\`\n\n`;
      footer += `**Why CodeQual re-scan?**\n`;
      footer += `- ✅ Automated validation on every commit\n`;
      footer += `- 📊 Compare before/after results objectively\n`;
      footer += `- 🎯 Catch any regressions or incomplete fixes\n`;
      footer += `- 🏆 Earn "First Clean PR" achievement\n\n`;
      
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

