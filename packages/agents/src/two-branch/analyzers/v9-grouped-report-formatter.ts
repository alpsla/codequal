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
import { IssueGroup } from '../utils/issue-grouping';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { AppScoreManager } from './v9-app-score-manager';
import { SkillScoreManager } from './v9-skill-score-manager';

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
  // Feature toggles for optional sections
  private readonly SHOW_FIX_COVERAGE: boolean = false;
  private readonly SHOW_QUICK_WINS: boolean = false;
  private readonly SHOW_SYSTEM_INFO: boolean = false;
  private readonly SHOW_AGENT_PERFORMANCE: boolean = false;
  private readonly SHOW_TOOL_PERFORMANCE: boolean = false;
  private readonly SHOW_EFFICIENCY_ANALYSIS: boolean = false;
  
  constructor() {
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
    const map: Record<string, Array<{ title: string; url: string }>> = {
      'java.lang.security.audit.command-injection-process-builder': [
        { title: 'OWASP OS Command Injection Defense', url: 'https://cheatsheetseries.owasp.org/cheatsheets/OS_Command_Injection_Defense_Cheat_Sheet.html' },
        { title: 'ProcessBuilder best practices (Oracle docs)', url: 'https://docs.oracle.com/javase/8/docs/api/java/lang/ProcessBuilder.html' }
      ],
      'java.lang.security.audit.unsafe-reflection': [
        { title: 'CWE-470: Use of Externally-Controlled Input to Select Classes or Code', url: 'https://cwe.mitre.org/data/definitions/470.html' },
        { title: 'Java Secure Coding Guidelines: Reflection', url: 'https://www.oracle.com/java/technologies/javase/seccodeguide.html' }
      ],
      'AvoidThrowingRawExceptionTypes': [
        { title: 'Effective Java: Exceptions', url: 'https://www.oreilly.com/library/view/effective-java-3rd/9780134686097/' },
        { title: 'Java Exceptions Best Practices', url: 'https://www.baeldung.com/java-exceptions' }
      ],
      'GuardLogStatement': [
        { title: 'SLF4J Parameterized Logging', url: 'http://www.slf4j.org/faq.html#logging_performance' }
      ],
      'SystemPrintln': [
        { title: 'Why use a logging framework instead of System.out.println', url: 'https://www.baeldung.com/java-system-out-println-vs-logger' }
      ]
    };
    // Normalize known semgrep duplication suffix
    const normalized = ruleId.endsWith('.command-injection-process-builder')
      ? 'java.lang.security.audit.command-injection-process-builder'
      : ruleId;
    return map[normalized] || [];
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
    const attachments: LocationAttachment[] = [];
    const ideFixFiles: IDEFixFile[] = [];
    
    // Store repoPath for snippet extraction
    this.repoPath = metadata.repoPath || null;
    
    // Header
    markdown.push(this.generateHeader(metadata));
    markdown.push('');
    
    // Executive Summary
    markdown.push(await this.generateExecutiveSummary(issues, groups, metadata));
    markdown.push('');
    
    // Issue Groups by Severity (CRITICAL FIRST, then HIGH)
    const critical = groups.filter(g => g.severity === 'critical');
    const high = groups.filter(g => g.severity === 'high');
    const medium = groups.filter(g => g.severity === 'medium');
    const low = groups.filter(g => g.severity === 'low');
    
    // Critical Issues (highest priority)
    if (critical.length > 0) {
      markdown.push('## 🔴 Critical Issues (Immediate Action Required)\n');
      for (const group of critical) {
        markdown.push(await this.generateGroupSection(group, issues, true));
        
        // Generate attachments (BUG FIX #24: Now async for snippet extraction)
        const { locationAttachment, ideFixFile } = await this.generateAttachments(group, issues);
        attachments.push(locationAttachment);
        if (ideFixFile) ideFixFiles.push(ideFixFile);
      }
      markdown.push('');
    }
    
    // High Priority Issues
    if (high.length > 0) {
      markdown.push('## 🟠 High Priority Issues\n');
      for (const group of high) {
        markdown.push(await this.generateGroupSection(group, issues, true));
        
        // Generate attachments (BUG FIX #24)
        const { locationAttachment, ideFixFile } = await this.generateAttachments(group, issues);
        attachments.push(locationAttachment);
        if (ideFixFile) ideFixFiles.push(ideFixFile);
      }
      markdown.push('');
    }
    
    if (medium.length > 0) {
      markdown.push('## 🟡 Medium Priority Issues\n');
      for (const group of medium) {
        markdown.push(await this.generateGroupSection(group, issues, true)); // Changed: Show full metadata for ALL severities
        
        const { locationAttachment, ideFixFile } = await this.generateAttachments(group, issues); // BUG FIX #24
        attachments.push(locationAttachment);
        if (ideFixFile) ideFixFiles.push(ideFixFile);
      }
      markdown.push('');
    }
    
    if (low.length > 0) {
      markdown.push('## 🟢 Low Priority Issues\n');
      for (const group of low) {
        markdown.push(await this.generateGroupSection(group, issues, true)); // Changed: Show full metadata for ALL severities
        
        const { locationAttachment, ideFixFile } = await this.generateAttachments(group, issues); // BUG FIX #24
        attachments.push(locationAttachment);
        if (ideFixFile) ideFixFiles.push(ideFixFile);
      }
      markdown.push('');
    }
    
    // BUG FIX #19: Add CheckStyle auto-fix guidance if CheckStyle issues found
    const checkstyleGroups = groups.filter(g => g.tool === 'checkstyle');
    if (checkstyleGroups.length > 0) {
      const checkstyleCount = issues.filter(i => i.tool === 'checkstyle').length;
      markdown.push(this.generateCheckStyleAutoFixGuide(checkstyleCount));
      markdown.push('');
    }
    
    // Business Impact Analysis (aggregate from issues)
    markdown.push(this.generateBusinessImpact(issues, groups));
    markdown.push('');
    
    // Educational Resources (aggregate from issues)
    if ((process.env.EDU_USE_BRAVE || '').toLowerCase() === 'true') {
      markdown.push(await this.generateEducationalResourcesBrave(issues));
    } else {
      markdown.push(this.generateEducationalResources(issues));
    }
    markdown.push('');
    
    // Skills Tracking (developer progress and ranking)
    markdown.push(await this.generateSkillsTracking(issues, metadata));
    markdown.push('');
    
    // Analysis Metadata (performance metrics)
    markdown.push(this.generateAnalysisMetadata(metadata));
    markdown.push('');
    
    // PR Comment (personalized, ready-to-paste)
    markdown.push(this.generatePRComment(issues, groups, metadata));
    markdown.push('');
    
    // Footer
    markdown.push(this.generateFooter(groups, attachments, ideFixFiles));
    
    // Generate mapping index
    const mapping = this.generateMapping(issues, groups, metadata, attachments, ideFixFiles);
    
    return {
      markdown: markdown.join('\n'),
      attachments,
      mapping,
      ideFixFiles
    };
  }
  
  /**
   * BUG FIX #24: Extract code snippets for issue locations (for IDE integration)
   * Extracts snippets on-demand with intelligent batching for performance
   */
  private async extractSnippetsForLocations(issues: EnrichedIssue[]): Promise<IssueLocation[]> {
    if (!this.repoPath) {
      // No repoPath available - return locations without snippets
      return issues.map(issue => ({
        file: issue.file,
        line: issue.line || 0,
        column: issue.column,
        snippet: issue.snippet || '',
        category: issue.category
      }));
    }

    const { CodeSnippetExtractor } = await import('../utils/code-snippet-extractor');
    const path = await import('path');
    
    // Performance optimization: Extract snippets for first 100 issues only
    // (Full extraction for 450K issues would take too long)
    const SNIPPET_LIMIT = 100;
    const locations: IssueLocation[] = [];
    
    for (let i = 0; i < issues.length; i++) {
      const issue = issues[i];
      let snippet = issue.snippet || '';
      
      // Extract snippet if missing and within limit
      if (i < SNIPPET_LIMIT && (!snippet || snippet === 'N/A' || snippet.trim().length === 0) && issue.file && issue.line) {
        try {
          // BUG FIX #25: Strip container paths (/workspace/) that break path.join()
          let relativePath = issue.file;
          if (relativePath.startsWith('/workspace/')) {
            relativePath = relativePath.replace('/workspace/', '');
          } else if (relativePath.startsWith('workspace/')) {
            relativePath = relativePath.replace('workspace/', '');
          }
          
          const fullPath = path.join(this.repoPath!, relativePath);
          snippet = await CodeSnippetExtractor.extractSnippet(fullPath, issue.line, 3) || '';
        } catch (error) {
          // Extraction failed - use empty snippet
          snippet = '';
        }
      }
      
      locations.push({
        file: issue.file,
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
    const icon = metadata.decision === 'APPROVED' ? '✅' : '⛔';
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
    if (!dateString) {
      return new Date().toLocaleString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZoneName: 'short'
      });
    }
    
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return new Date().toLocaleString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          timeZoneName: 'short'
        });
      }
      return date.toLocaleString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZoneName: 'short'
      });
    } catch {
      return new Date().toLocaleString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZoneName: 'short'
      });
    }
  }
  
  /**
   * Format duration in milliseconds to human-readable string
   */
  private formatDuration(durationMs?: number): string {
    if (!durationMs) return '0s';
    
    const seconds = Math.floor(durationMs / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      const remainingMinutes = minutes % 60;
      return `${hours}h ${remainingMinutes}m`;
    } else if (minutes > 0) {
      const remainingSeconds = seconds % 60;
      return `${minutes}m ${remainingSeconds}s`;
    } else {
      return `${seconds}s`;
    }
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
    appScore?: number;
    skillScore?: number;
  }> {
    // Use full V9 scoring if Supabase is available
    if (this.appScoreManager && this.skillScoreManager && metadata.repository) {
      // BUG FIX #9: Check for cached scores if commit SHA provided (prevents score decay on re-runs)
      if (metadata.commitSHA && metadata.prNumber) {
        const cached = await this.checkCachedScoresForCommit(metadata);
        if (cached) {
          console.log(`[V9ReportFormatter] ⚡ Using cached scores for commit ${metadata.commitSHA.slice(0, 7)} - no recalculation needed`);
          return cached;
        }
      }
      
      return await this.calculateFullV9Score(issues, metadata);
    }
    
    // Fall back to simplified scoring
    return this.calculateSimplifiedScore(issues);
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
        
        // BUG FIX #10: Reconstruct categoryScores from individual columns
        const categoryScores = {
          security: appScore.security_score || 50,
          performance: appScore.performance_score || 50,
          architecture: appScore.architecture_score || 50,
          dependency: appScore.dependency_score || 50,
          codeQuality: appScore.code_quality_score || 50
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
            overallMethod: 'MIN (weakest link)',
            skillScoreMethod: 'ISSUE_WEIGHTED_BASELINE_50',
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
      
      // Calculate APP score (minimum of categories - weakest link)
      const appScore = Math.min(
        categoryScores.security,
        categoryScores.performance,
        categoryScores.architecture,
        categoryScores.dependency,
        categoryScores.codeQuality
      );
      
      // Calculate Skill score (baseline 50 adjusted by found/resolved issues)
      const skillScore = this.calculateIssueWeightedSkillScore(issues);
      
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
          decision: appScore >= 70 ? 'APPROVED' : 'DECLINED',
          quality_score: appScore,
          analyzed_at: new Date().toISOString(),
          new_issues_count: newIssues.length,
          existing_issues_count: existingModified.length + existingRest.length,
          resolved_issues_count: resolvedIssues.length,
          blocking_issues_count: newIssues.filter(i => i.severity === 'critical' || i.severity === 'high').length
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
          overallMethod: 'MIN (weakest link)',
          skillScoreMethod: 'ISSUE_WEIGHTED_BASELINE_50'
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
    const BASE = 100;  // App health starts at 100 per category
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
- 👨‍💻 **Skill Score**: ${qualityResult.skillScore}/100 (ISSUE-WEIGHTED baseline 50)

> Scores saved to Supabase for tracking trends over time
` : `
- Base Score: 100.0
- NEW issues: ${qualityResult.breakdown.newIssuesDeduction?.toFixed(1) || '0.0'} (${issues.filter(i => i.category === 'NEW').length} issues, full weight)
- EXISTING_MODIFIED issues: ${qualityResult.breakdown.existingModifiedDeduction?.toFixed(1) || '0.0'} (${issues.filter(i => i.category === 'EXISTING_MODIFIED').length} issues, 50% weight)
- EXISTING_REST issues: ${qualityResult.breakdown.existingRestDeduction?.toFixed(1) || '0.0'} (${issues.filter(i => i.category === 'EXISTING_REST').length} issues, 10% weight)${qualityResult.breakdown.blockingPenalty !== undefined && qualityResult.breakdown.blockingPenalty !== 0 ? `
- Blocking issues penalty: ${qualityResult.breakdown.blockingPenalty.toFixed(1)} (${blockingIssues.length} critical/high in PR)` : ''}${qualityResult.breakdown.resolutionBonus > 0 ? `
- RESOLVED issues bonus: +${qualityResult.breakdown.resolutionBonus.toFixed(1)} (${issues.filter(i => i.category === 'RESOLVED').length} fixed)` : ''}
- **Final Score: ${qualityResult.breakdown.finalScore}**

> Severity weights: Critical=-5.0, High=-3.0, Medium=-1.0, Low=-0.5
`}

---

### Issue Summary

**Total Issues**: ${issues.length.toLocaleString()} (${groups.length} unique types)

**By Severity**:
- 🔴 Critical: ${bySeverity.critical} (${((bySeverity.critical / issues.length) * 100).toFixed(1)}%)
- 🟠 High: ${bySeverity.high} (${((bySeverity.high / issues.length) * 100).toFixed(1)}%)
- 🟡 Medium: ${bySeverity.medium} (${((bySeverity.medium / issues.length) * 100).toFixed(1)}%)
- 🟢 Low: ${bySeverity.low} (${((bySeverity.low / issues.length) * 100).toFixed(1)}%)

**By Category**:
- 🆕 NEW: ${byCategory.NEW} (introduced in this PR)
- ⚠️  EXISTING_MODIFIED: ${byCategory.EXISTING_MODIFIED} (pre-existing in modified files)
- ✅ RESOLVED: ${byCategory.RESOLVED} (fixed by this PR)
- 📝 EXISTING_REST: ${byCategory.EXISTING_REST} (pre-existing in unchanged files)

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

${this.generateCriticalBlockers(groups, blockingIssues)}

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
  private generateCriticalBlockers(groups: IssueGroup[], blockingIssues: EnrichedIssue[]): string {
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
    
    return content;
  }
  
  /**
   * Generate quick wins section
   */
  private generateQuickWins(groups: IssueGroup[], autoFixableGroups: IssueGroup[]): string {
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
    // Common patterns in rule names
    const friendlyTitles: Record<string, string> = {
      // ===== PMD Rules =====
      // Exception Handling
      'AvoidThrowingRawExceptionTypes': 'Throwing Generic Exception Types',
      'AvoidThrowingNullPointerException': 'Throwing NullPointerException',
      'AvoidCatchingThrowable': 'Catching Throwable or Error',
      'AvoidCatchingNPE': 'Catching NullPointerException',
      'ExceptionAsFlowControl': 'Using Exceptions for Flow Control',
      'AvoidRethrowingException': 'Rethrowing Exception Without Context',
      'DoNotThrowExceptionInFinally': 'Throwing Exception in Finally Block',
      
      // Logging & Debugging
      'SystemPrintln': 'Using System.out.println for Logging',
      'GuardLogStatement': 'Unguarded Log Statements',
      'MoreThanOneLogger': 'Multiple Logger Declarations',
      'AvoidPrintStackTrace': 'Using printStackTrace()',
      'ProperLogger': 'Incorrect Logger Declaration',
      
      // Concurrency
      'AvoidUsingVolatile': 'Using Volatile Variables',
      'AvoidSynchronizedAtMethodLevel': 'Method-Level Synchronization',
      'UnsynchronizedStaticDateFormatter': 'Unsynchronized Static DateFormat',
      'UseConcurrentHashMap': 'Using Hashtable Instead of ConcurrentHashMap',
      'DoubleCheckedLocking': 'Broken Double-Checked Locking',
      'AvoidThreadGroup': 'Using ThreadGroup',
      'DontCallThreadRun': 'Calling Thread.run() Instead of start()',
      
      // Code Quality
      'ClassWithOnlyPrivateConstructorsShouldBeFinal': 'Utility Class Not Marked Final',
      'AvoidReassigningParameters': 'Reassigning Method Parameters',
      'ReturnEmptyCollectionRatherThanNull': 'Returning Null Instead of Empty Collection',
      'AvoidFileStream': 'Using FileInputStream/FileOutputStream',
      'ConstructorCallsOverridableMethod': 'Constructor Calls Overridable Method',
      'UseProperClassLoader': 'Improper ClassLoader Usage',
      'SimplifyBooleanReturns': 'Complex Boolean Return Logic',
      'SimplifyBooleanExpressions': 'Unnecessarily Complex Boolean Expressions',
      'CollapsibleIfStatements': 'Nested If Statements That Can Be Combined',
      'AvoidDeeplyNestedIfStmts': 'Deeply Nested If Statements',
      'SwitchStmtsShouldHaveDefault': 'Switch Statement Missing Default Case',
      'AvoidBranchingStatementAsLastInLoop': 'Break/Continue as Last Statement in Loop',
      'ForLoopCanBeForeach': 'For Loop Can Use Enhanced For-Each',
      
      // Resource Management
      'CloseResource': 'Resource Not Properly Closed',
      'UseProperJDBCClose': 'JDBC Resources Not Properly Closed',
      'UseTryWithResources': 'Not Using Try-With-Resources',
      
      // Performance
      'UseStringBufferForStringAppends': 'String Concatenation in Loop',
      'ConsecutiveLiteralAppends': 'Multiple Consecutive String Appends',
      'InefficientStringBuffering': 'Inefficient StringBuffer Usage',
      'AppendCharacterWithChar': 'Appending String Instead of Char',
      'AvoidInstantiatingObjectsInLoops': 'Object Creation in Loops',
      'UseArraysAsList': 'Not Using Arrays.asList()',
      'OptimizableToArrayCall': 'Non-Optimized toArray() Call',
      
      // ===== Semgrep Security Rules =====
      'java.lang.security.audit.command-injection': 'Command Injection Vulnerability',
      'java.lang.security.audit.command-injection-process-builder': 'Command Injection via ProcessBuilder',
      'java.lang.security.audit.command-injection-process-builder.command-injection-process-builder': 'Command Injection via ProcessBuilder',
      'java.lang.security.audit.unsafe-reflection': 'Unsafe Reflection Usage',
      'java.lang.security.audit.sql-injection': 'SQL Injection Vulnerability',
      'java.lang.security.audit.xpath-injection': 'XPath Injection Vulnerability',
      'java.lang.security.audit.xxe': 'XML External Entity (XXE) Injection',
      'java.lang.security.audit.crypto.weak-cipher': 'Weak Cryptographic Cipher',
      'java.lang.security.audit.crypto.weak-hash': 'Weak Hashing Algorithm',
      'java.lang.security.audit.crypto.weak-rsa': 'Weak RSA Key Size',
      'java.lang.security.audit.crypto.insecure-randomness': 'Insecure Random Number Generator',
      'java.lang.security.audit.path-traversal': 'Path Traversal Vulnerability',
      'java.lang.security.audit.ldap-injection': 'LDAP Injection Vulnerability',
      'java.lang.security.audit.deserialization': 'Unsafe Deserialization',
      'java.lang.security.audit.cookie-missing-httponly': 'Cookie Missing HttpOnly Flag',
      'java.lang.security.audit.cookie-missing-secure': 'Cookie Missing Secure Flag',
      'java.lang.security.audit.hardcoded-credentials': 'Hard-Coded Credentials',
      'java.lang.security.audit.jwt-exposed-credentials': 'JWT Credentials Exposed',
      
      // ===== Checkstyle Rules =====
      'LineLength': 'Line Too Long',
      'MagicNumber': 'Magic Numbers in Code',
      'MissingJavadocMethod': 'Missing Method Documentation',
      'MissingJavadocType': 'Missing Class Documentation',
      'WhitespaceAround': 'Incorrect Whitespace',
      'WhitespaceAfter': 'Missing Whitespace After Token',
      'EmptyBlock': 'Empty Code Block',
      'NeedBraces': 'Missing Braces Around Code Block',
      'LeftCurly': 'Incorrect Left Curly Brace Placement',
      'RightCurly': 'Incorrect Right Curly Brace Placement',
      'AvoidStarImport': 'Using Wildcard Imports',
      'UnusedImports': 'Unused Import Statements',
      'RedundantImport': 'Redundant Import Statements',
      'IllegalImport': 'Importing Forbidden Package',
      'ParameterName': 'Parameter Name Convention Violation',
      'LocalVariableName': 'Local Variable Name Convention Violation',
      'MemberName': 'Member Variable Name Convention Violation',
      'MethodName': 'Method Name Convention Violation',
      'TypeName': 'Class/Interface Name Convention Violation',
      'PackageName': 'Package Name Convention Violation',
      'ConstantName': 'Constant Name Convention Violation',
      
      // ===== SpotBugs Rules =====
      'NP_NULL_ON_SOME_PATH': 'Potential Null Pointer Dereference',
      'NP_ALWAYS_NULL': 'Null Pointer Dereference (Always Null)',
      'NP_NULL_PARAM_DEREF': 'Null Parameter Passed to Method',
      'RCN_REDUNDANT_NULLCHECK_OF_NONNULL_VALUE': 'Redundant Null Check',
      'DLS_DEAD_LOCAL_STORE': 'Dead Store to Local Variable',
      'UC_USELESS_CONDITION': 'Useless Condition',
      'UC_USELESS_OBJECT': 'Useless Object Created',
      'RV_RETURN_VALUE_IGNORED': 'Return Value Ignored',
      'RV_RETURN_VALUE_IGNORED_BAD_PRACTICE': 'Important Return Value Ignored',
      'SQL_PREPARED_STATEMENT_GENERATED_FROM_NONCONSTANT_STRING': 'Dynamic SQL Query Construction',
      'DMI_CONSTANT_DB_PASSWORD': 'Hard-Coded Database Password',
      'DMI_EMPTY_DB_PASSWORD': 'Empty Database Password',
      'SE_BAD_FIELD': 'Non-Serializable Field in Serializable Class',
      'EQ_COMPARETO_USE_OBJECT_EQUALS': 'compareTo() Inconsistent with equals()',
      'HE_EQUALS_USE_HASHCODE': 'equals() Defined Without hashCode()',
      'CO_COMPARETO_INCORRECT_FLOATING': 'Incorrect Floating Point Comparison in compareTo()',
      
      // ===== Dependency Check Rules =====
      'CVE': 'Known Security Vulnerability (CVE)',
      'high-severity-vulnerability': 'High Severity Dependency Vulnerability',
      'critical-severity-vulnerability': 'Critical Severity Dependency Vulnerability',
      'outdated-dependency': 'Outdated Dependency Version'
    };
    
    // Normalize rule name - remove duplicate suffix (e.g., "command-injection.command-injection" → "command-injection")
    let normalizedRule = rule;
    const parts = rule.split('.');
    if (parts.length >= 2 && parts[parts.length - 1] === parts[parts.length - 2]) {
      // Remove duplicate suffix
      normalizedRule = parts.slice(0, -1).join('.');
    }
    
    // Check direct mapping with normalized rule first
    if (friendlyTitles[normalizedRule]) {
      return friendlyTitles[normalizedRule];
    }
    
    // Check direct mapping with original rule
    if (friendlyTitles[rule]) {
      return friendlyTitles[rule];
    }
    
    // Try lowercase match for case-insensitive rules (especially Semgrep)
    const ruleLower = normalizedRule.toLowerCase();
    const matchingKey = Object.keys(friendlyTitles).find(key => key.toLowerCase() === ruleLower);
    if (matchingKey) {
      return friendlyTitles[matchingKey];
    }
    
    // Clean up technical rule names (especially for Semgrep with long prefixes)
    const cleaned = normalizedRule
      .replace(/^java\.lang\.security\.audit\./gi, '') // Remove Semgrep Java security prefix
      .replace(/^java\.lang\./gi, '')                   // Remove Java lang prefix
      .replace(/\./g, ' ')                              // Replace dots with spaces
      .replace(/-/g, ' ')                               // Replace hyphens with spaces
      .replace(/_/g, ' ')                               // Replace underscores with spaces
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1)) // Title case
      .join(' ')
      .trim();
    
    return cleaned;
  }
  
  /**
   * Detect issue category from rule name, tool, and message
   * Phase E: Category-specific enhancements
   */
  private detectCategory(rule: string, tool: string, message: string): string {
    const ruleLower = rule.toLowerCase();
    const messageLower = message.toLowerCase();
    
    // Security patterns
    if (
      tool === 'semgrep' ||
      ruleLower.includes('security') ||
      ruleLower.includes('injection') ||
      ruleLower.includes('xss') ||
      ruleLower.includes('csrf') ||
      ruleLower.includes('auth') ||
      messageLower.includes('vulnerability') ||
      messageLower.includes('exploit')
    ) {
      return 'Security';
    }
    
    // Performance patterns
    if (
      ruleLower.includes('performance') ||
      ruleLower.includes('optimization') ||
      ruleLower.includes('cache') ||
      ruleLower.includes('memory') ||
      ruleLower.includes('inefficient') ||
      ruleLower.includes('guard') ||
      messageLower.includes('performance') ||
      messageLower.includes('slow')
    ) {
      return 'Performance';
    }
    
    // Architecture/Design patterns
    if (
      ruleLower.includes('architecture') ||
      ruleLower.includes('design') ||
      ruleLower.includes('pattern') ||
      ruleLower.includes('solid') ||
      ruleLower.includes('coupling') ||
      ruleLower.includes('cohesion') ||
      messageLower.includes('design')
    ) {
      return 'Architecture';
    }
    
    // Code Quality/Best Practices
    if (
      tool === 'pmd' ||
      tool === 'checkstyle' ||
      ruleLower.includes('naming') ||
      ruleLower.includes('style') ||
      ruleLower.includes('convention') ||
      messageLower.includes('best practice')
    ) {
      return 'Code Quality';
    }
    
    // Dependency/Vulnerability
    if (
      tool === 'dependency-check' ||
      tool === 'owasp' ||
      ruleLower.includes('dependency') ||
      ruleLower.includes('cve') ||
      messageLower.includes('outdated')
    ) {
      return 'Dependencies';
    }
    
    // Bug/Reliability
    if (
      tool === 'spotbugs' ||
      ruleLower.includes('null') ||
      ruleLower.includes('exception') ||
      ruleLower.includes('bug') ||
      messageLower.includes('potential bug')
    ) {
      return 'Reliability';
    }
    
    return 'Code Quality'; // Default fallback
  }
  
  /**
   * Calculate risk level based on category and severity
   * Phase E: Risk assessment
   */
  private calculateRiskLevel(category: string, severity: string): {
    level: string;
    color: string;
    emoji: string;
    description: string;
  } {
    // Risk multipliers by category
    const categoryRisk: Record<string, number> = {
      'Security': 2.0,
      'Dependencies': 1.8,
      'Reliability': 1.5,
      'Performance': 1.2,
      'Architecture': 1.0,
      'Code Quality': 0.8
    };
    
    // Base risk by severity
    const severityRisk: Record<string, number> = {
      'critical': 10,
      'high': 7,
      'medium': 4,
      'low': 2
    };
    
    const baseRisk = severityRisk[severity] || 4;
    const multiplier = categoryRisk[category] || 1.0;
    const totalRisk = baseRisk * multiplier;
    
    // Determine risk level
    if (totalRisk >= 12) {
      return {
        level: 'CRITICAL RISK',
        color: '🔴',
        emoji: '⚠️',
        description: 'Immediate action required - may lead to security breaches, data loss, or system failures'
      };
    } else if (totalRisk >= 8) {
      return {
        level: 'HIGH RISK',
        color: '🟠',
        emoji: '⚡',
        description: 'High priority - could cause significant problems in production'
      };
    } else if (totalRisk >= 5) {
      return {
        level: 'MODERATE RISK',
        color: '🟡',
        emoji: '📊',
        description: 'Should be addressed - may impact system quality or maintainability'
      };
    } else {
      return {
        level: 'LOW RISK',
        color: '🟢',
        emoji: '✨',
        description: 'Nice to fix - improves code quality and developer experience'
      };
    }
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
    const contexts: Record<string, any> = {
      'Security': {
        focus: 'Protecting against attacks, vulnerabilities, and unauthorized access',
        businessImpact: 'Security breaches can lead to data loss, legal liability, reputation damage, and financial losses. GDPR/HIPAA compliance may be affected.',
        urgency: severity === 'critical' || severity === 'high' 
          ? 'Fix immediately - security issues are exploitable' 
          : 'Address in next sprint - reduces attack surface',
        stakeholders: ['Security Team', 'Compliance', 'Legal', 'Executive Leadership'],
        resources: [
          'OWASP Top 10: https://owasp.org/www-project-top-ten/',
          'CWE Database: https://cwe.mitre.org/',
          'NIST Guidelines: https://www.nist.gov/cyberframework'
        ]
      },
      'Performance': {
        focus: 'Optimizing speed, resource usage, and scalability',
        businessImpact: 'Performance issues lead to poor user experience, higher infrastructure costs, and potential revenue loss from slow response times.',
        urgency: severity === 'critical' || severity === 'high'
          ? 'Address urgently - impacts user experience'
          : 'Plan for optimization sprint',
        stakeholders: ['DevOps', 'Product Team', 'Infrastructure', 'End Users'],
        resources: [
          'Java Performance Tuning: https://www.oracle.com/technical-resources/',
          'JVM Performance: https://docs.oracle.com/javase/8/docs/technotes/guides/vm/',
          'Profiling Tools: JProfiler, YourKit, VisualVM'
        ]
      },
      'Reliability': {
        focus: 'Preventing bugs, crashes, and unexpected behavior',
        businessImpact: 'Reliability issues cause system downtime, data corruption, and user frustration. Critical for SLAs and customer trust.',
        urgency: severity === 'critical' || severity === 'high'
          ? 'Fix before production - potential crashes'
          : 'Include in quality improvement cycle',
        stakeholders: ['QA Team', 'Support Team', 'Product Team', 'End Users'],
        resources: [
          'Effective Java by Joshua Bloch',
          'Java Concurrency in Practice',
          'Error Handling Best Practices'
        ]
      },
      'Architecture': {
        focus: 'Improving system design, maintainability, and extensibility',
        businessImpact: 'Poor architecture increases development costs, slows feature delivery, and makes the system brittle and hard to change.',
        urgency: severity === 'critical' || severity === 'high'
          ? 'Refactor in next sprint - technical debt accumulating'
          : 'Plan for architecture review',
        stakeholders: ['Architecture Team', 'Engineering Leads', 'Product Team'],
        resources: [
          'Clean Architecture by Robert C. Martin',
          'Design Patterns by Gang of Four',
          'SOLID Principles'
        ]
      },
      'Dependencies': {
        focus: 'Managing third-party libraries and known vulnerabilities',
        businessImpact: 'Outdated dependencies expose the system to known exploits and security vulnerabilities. May violate compliance requirements.',
        urgency: severity === 'critical' || severity === 'high'
          ? 'Update immediately - known CVE exploits'
          : 'Plan dependency update cycle',
        stakeholders: ['Security Team', 'DevOps', 'Compliance', 'Engineering Leads'],
        resources: [
          'National Vulnerability Database: https://nvd.nist.gov/',
          'Snyk Vulnerability Database: https://snyk.io/vuln/',
          'OWASP Dependency Check'
        ]
      },
      'Code Quality': {
        focus: 'Maintaining clean, readable, and maintainable code',
        businessImpact: 'Code quality issues slow down development, increase bug rates, and make onboarding new developers more difficult.',
        urgency: severity === 'critical' || severity === 'high'
          ? 'Address in code review - blocks merge'
          : 'Continuous improvement opportunity',
        stakeholders: ['Development Team', 'Code Reviewers', 'Tech Leads'],
        resources: [
          'Clean Code by Robert C. Martin',
          'Refactoring by Martin Fowler',
          'Team Coding Standards Document'
        ]
      }
    };
    
    return contexts[category] || {
      focus: 'Improving overall code quality and maintainability',
      businessImpact: 'Impacts development velocity and code maintainability',
      urgency: 'Address based on severity and team capacity',
      stakeholders: ['Development Team'],
      resources: ['Team Documentation', 'Coding Standards']
    };
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
    // High impact categories get higher priority
    const isHighImpactCategory = ['Security', 'Dependencies', 'Reliability'].includes(category);
    const isHighSeverity = severity === 'critical' || severity === 'high';
    const isWidespread = count > 50;
    
    if (riskLevel === 'CRITICAL RISK') {
      return {
        priority: 'P0 - Critical',
        timeframe: 'Fix immediately (within 24 hours)',
        effort: isWidespread ? 'High (requires coordinated effort across team)' : 'Medium (focused fix)',
        recommendation: 'Drop current work. Assemble team. Fix and deploy hotfix. Post-mortem required.'
      };
    } else if (riskLevel === 'HIGH RISK') {
      return {
        priority: 'P1 - High',
        timeframe: isHighImpactCategory ? 'Fix in current sprint' : 'Fix within 2 weeks',
        effort: isWidespread ? 'High (may need refactoring)' : 'Medium (targeted fixes)',
        recommendation: isWidespread 
          ? 'Create fix pattern, apply systematically, add automated tests'
          : 'Fix in next PR, add regression test, update documentation'
      };
    } else if (riskLevel === 'MODERATE RISK') {
      return {
        priority: 'P2 - Medium',
        timeframe: 'Plan for next sprint or two',
        effort: isWidespread ? 'High (batch fix recommended)' : 'Low to Medium',
        recommendation: isWidespread
          ? 'Add to backlog, batch fix in refactoring sprint, use linter rules to prevent recurrence'
          : 'Fix opportunistically during related work, add code review checklist item'
      };
    } else {
      return {
        priority: 'P3 - Low',
        timeframe: 'Address in quality improvement cycle',
        effort: 'Low (good for new contributors)',
        recommendation: 'Good first issue for onboarding, fix during code cleanup sprints, enable automated formatting/linting'
      };
    }
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
    
    // Generic description based on tool and severity
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
    const issueDesc = this.getIssueDescription(group.rule, group.tool, group.severity);
    
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
    const riskLevel = this.calculateRiskLevel(detectedCategory, group.severity);
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
    
    // Phase D: Improved code example section with dynamic extraction
    // Try representative first; if unavailable, try another issue from the same group
    let exampleIssue: EnrichedIssue | undefined = representative;
    if (!exampleIssue?.file || !exampleIssue.line) {
      exampleIssue = groupIssues.find(i => !!i.file && !!i.line) || representative;
    }

    if (exampleIssue?.file) {
      section += `#### 📍 Representative Example\n\n`;
      
        section += `**Location**: \`${exampleIssue.file}\``;
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
          
          // BUG FIX #25: Strip container paths (/workspace/) that break path.join()
          let relativePath = exampleIssue.file;
          if (relativePath.startsWith('/workspace/')) {
            relativePath = relativePath.replace('/workspace/', '');
          } else if (relativePath.startsWith('workspace/')) {
            relativePath = relativePath.replace('workspace/', '');
          }
          
          // Build full file path if repoPath is available
          const fullPath = this.repoPath ? path.join(this.repoPath, relativePath) : relativePath;
          snippet = await CodeSnippetExtractor.extractSnippet(fullPath, exampleIssue.line, 3);
          
          if (!snippet || snippet.trim().length === 0) {
            console.warn(`[V9GroupedReportFormatter] Empty snippet extracted for ${exampleIssue.file}:${exampleIssue.line}`);
          }
        } catch (error: any) {
          console.warn(`[V9GroupedReportFormatter] Failed to extract snippet for ${exampleIssue.file}:${exampleIssue.line}: ${error.message}`);
          // Continue without snippet
        }
      }
      
      if (snippet && snippet !== 'N/A' && snippet.trim().length > 0) {
        section += `**Code**:\n\n`;
        const language = this.getLanguageFromFile(exampleIssue.file);
        section += `\`\`\`${language}\n`;
        section += snippet;
        section += '\n```\n\n';
      } else {
        // Do not print a noisy placeholder if snippet isn't available
      }
    }
    
    // Phase D: Improved fix recommendations
    if (expanded && representative?.fixSuggestion) {
      section += `#### 🔧 How to Fix\n\n`;
      
      // BUG FIX #11: Clean ALL AI content using helper function
      const cleanFix = this.cleanAIContent(representative.fixSuggestion.fix);
      section += `${cleanFix}\n\n`;
      
      // Only show code example if we have actual code (not "N/A")
      const hasValidSnippet = representative.snippet && representative.snippet !== 'N/A' && representative.snippet.trim().length > 0;
      const hasValidFix = representative.fixSuggestion.correctedCode && representative.fixSuggestion.correctedCode.trim().length > 0;
      
      if (hasValidFix) {
        // BUG FIX #11 & #12: Clean correctedCode and check if it's just a fallback message
        const cleanCorrectedCode = this.cleanAIContent(representative.fixSuggestion.correctedCode);
        
        // If after cleaning, the code is empty or very short (< 20 chars), it was just a fallback
        if (!cleanCorrectedCode || cleanCorrectedCode.length < 20) {
          // Skip showing code block - the fix text should have the guidance
          section += `> ⚠️ Specific code fix requires additional context. Review the fix guidance above and apply to your codebase.\n\n`;
        } else if (hasValidSnippet) {
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
      } else {
        // No valid fix code available
        section += `> ⚠️ Specific code fix requires additional context. Review the fix guidance above.\n\n`;
      }
      
      if (representative.fixSuggestion.bestPractices && representative.fixSuggestion.bestPractices.length > 0) {
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
   * BUG FIX #11 & #12: Remove all <think> tags, internal references, and fallback messages
   * CRITICAL: AI often generates <think> WITHOUT closing tag
   */
  private cleanAIContent(content: string): string {
    if (!content) return content;
    return content
      .replace(/<think>[\s\S]*?<\/think>/gi, '')    // Remove <think>...</think> blocks (with closing tag)
      .replace(/<think>[\s\S]*?(?=\n\n|$)/gi, '')   // Remove <think>... (WITHOUT closing tag - until double newline or end)
      .replace(/\*\*BUG-\d+.*?:\*\*/g, '')          // Remove **BUG-XXX FIX:**
      .replace(/\(BUG-\d+.*?\)/g, '')                // Remove (BUG-XXX FIX - ...)
      .replace(/\/\/\s*⚠️\s*AI-generated fix not available.*$/gm, '') // Remove fallback messages
      .replace(/\/\/\s*Issue:.*$/gm, '')            // Remove generic issue comments
      .replace(/\/\/\s*See .* documentation.*$/gm, '') // Remove documentation references
      .replace(/\/\/\s*Context:.*$/gm, '')          // Remove context comments
      .replace(/^\s*\d+:\s*$/gm, '')                 // Remove standalone line numbers
      .trim();
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
   * Generate attachments for a group (BUG FIX #24: Now async for snippet extraction)
   */
  private async generateAttachments(
    group: IssueGroup,
    allIssues: EnrichedIssue[]
  ): Promise<{ locationAttachment: LocationAttachment; ideFixFile?: IDEFixFile }> {
    const groupIssues = allIssues.filter(i => 
      i.rule === group.rule && i.tool === group.tool && i.severity === group.severity
    );
    
    const representative = groupIssues[0];
    const groupId = this.sanitizeGroupId(group);
    
    // Location attachment
    const locationAttachment: LocationAttachment = {
      groupId,
      filename: `group-${groupId}-locations.json`,
      content: {
        group_id: groupId,
        rule: group.rule,
        tool: group.tool,
        severity: group.severity,
        category: group.category,
        total_occurrences: group.count,
        representative: {
          file: representative?.file || '',
          line: representative?.line || 0,
          column: representative?.column,
          snippet: representative?.snippet || ''
        },
        ai_fix: {
          fix: representative?.fixSuggestion?.fix || 'No fix available',
          corrected_code: representative?.fixSuggestion?.correctedCode || '',
          explanation: representative?.fixSuggestion?.explanation || '',
          best_practices: representative?.fixSuggestion?.bestPractices
        },
        locations: await this.extractSnippetsForLocations(groupIssues),
        statistics: {
          files_affected: group.count,
          lines_affected: group.count,
          categories: this.groupByCategory(groupIssues)
        }
      }
    };
    
    // IDE fix file (if auto-fixable)
    let ideFixFile: IDEFixFile | undefined;
    if (this.canAutoFix(group) && representative?.fixSuggestion) {
      ideFixFile = {
        groupId,
        filename: `group-${groupId}-cursor-fix.json`,
        content: await this.generateCursorFixData(group, groupIssues, representative) // BUG FIX #24
      };
    }
    
    return { locationAttachment, ideFixFile };
  }
  
  /**
   * Generate Cursor IDE fix data (BUG FIX #24: Now async for snippet extraction)
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
    const fix = representative.fixSuggestion?.correctedCode || '';
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
    attachments: LocationAttachment[],
    ideFixFiles: IDEFixFile[]
  ): IssueGroupMapping {
    return {
      version: "1.0",
      generated_at: new Date().toISOString(),
      repository: metadata.repository,
      pr_number: metadata.prNumber,
      total_issues: issues.length,
      total_groups: groups.length,
      groups: groups.map(group => {
        const groupId = this.sanitizeGroupId(group);
        return {
          id: groupId,
          rule: group.rule,
          tool: group.tool,
          severity: group.severity,
          count: group.count,
          category: group.category,
          attachment: `group-${groupId}-locations.json`,
          ide_fix_file: this.canAutoFix(group) ? `group-${groupId}-cursor-fix.json` : undefined
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
    if (criticalCount > 0 && securityCount > 0) {
      return `${criticalCount} critical security vulnerabilities could lead to data breach, system compromise, or service disruption`;
    } else if (highCount > 0 && securityCount > 0) {
      return `${highCount} high-severity security issues could result in security incidents or operational failures`;
    } else if (criticalCount > 0) {
      return `${criticalCount} critical issues could cause system instability or reliability problems`;
    } else {
      return `Low risk of security incidents; main concerns are code quality and maintainability`;
    }
  }
  
  /**
   * Get risk impact level helper
   */
  private getRiskImpactLevel(categoryIssues: EnrichedIssue[]): string {
    const critical = categoryIssues.filter(i => i.severity === 'critical').length;
    const high = categoryIssues.filter(i => i.severity === 'high').length;
    
    if (critical >= 3) return '🔴 Critical';
    if (critical >= 1 || high >= 5) return '🟠 High';
    if (high >= 2 || categoryIssues.length >= 10) return '🟡 Medium';
    if (categoryIssues.length > 0) return '🟢 Low';
    return '⚪ None';
  }

  /**
   * Compute Skill Score from issues: start at 50, deduct NEW/EXISTING_MODIFIED
   * by severity weights, add resolved by same weights. Clamp to 0..100.
   */
  private calculateIssueWeightedSkillScore(issues: EnrichedIssue[]): number {
    const weight = (severity: string): number => ({
      critical: 5.0,
      high: 3.0,
      medium: 1.0,
      low: 0.5
    } as any)[severity] || 1.0;

    let deductions = 0;
    let additions = 0;
    for (const i of issues) {
      const w = weight(i.severity);
      if (i.category === 'NEW' || i.category === 'EXISTING_MODIFIED') deductions += w;
      if (i.category === 'RESOLVED') additions += w;
    }
    const score = 50 - deductions + additions;
    return Math.max(0, Math.min(100, Math.round(score)));
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
    
    // Add recommended learning path
    content += `### 📈 Recommended Learning Path\n\n`;
    content += `**Week 1-2:** Focus on immediate priority areas identified above\n`;
    content += `**Week 3-4:** Deep dive into specific patterns and advanced techniques\n`;
    content += `**Ongoing:** Integrate static analysis into CI/CD, establish code review standards\n\n`;
    
    content += `### 🎓 Additional Resources\n\n`;
    content += `- [📺 Pluralsight](https://www.pluralsight.com/) - Video courses on all topics\n`;
    content += `- [📚 Baeldung](https://www.baeldung.com/) - Comprehensive Java tutorials\n`;
    content += `- [🎯 Java Code Geeks](https://www.javacodegeeks.com/) - Java best practices\n`;
    content += `- [🔬 DZone Java Zone](https://dzone.com/java-jdk-development-tutorials-tools-news) - Articles and guides\n\n`;
    
    content += `**💡 Tip:** Detailed issue-specific resources are linked in each section above.`;
    
    return content;
  }

  private async generateEducationalResourcesBrave(issues: EnrichedIssue[]): Promise<string> {
    // Focus on BLOCKERS only: NEW/EXISTING_MODIFIED + critical/high
    const criticalIssues = issues.filter(i =>
      (i.category === 'NEW' || i.category === 'EXISTING_MODIFIED') && i.severity === 'critical'
    );
    const highIssues = issues.filter(i =>
      (i.category === 'NEW' || i.category === 'EXISTING_MODIFIED') && i.severity === 'high'
    );
    
    const mod = await import('../services/EducationalSearchService');
    const svc = new mod.EducationalSearchService();
    if (!svc.isEnabled()) {
      return this.generateEducationalResources(issues);
    }

    let content = `## 📚 Phased Educational Plan\n\n`;

    // Phase 1: Critical & High Priority (Immediate) - Limit to top 3 issues
    if (criticalIssues.length > 0 || highIssues.length > 0) {
      content += `### 📚 Phase 1: Critical & High Priority Training (Immediate)\n`;
      content += `**Quick Learning:** 30-60 min | **Deep Dive:** 1-2 weeks\n\n`;
      
      const phase1Issues = [...criticalIssues, ...highIssues];
      const freq = new Map<string, number>();
      for (const i of phase1Issues) freq.set(i.rule, (freq.get(i.rule) || 0) + 1);
      const topRules = Array.from(freq.entries()).sort((a,b)=>b[1]-a[1]).slice(0, 3).map(([r]) => r);

      for (const ruleId of topRules) {
        const sample = phase1Issues.find(i => i.rule === ruleId);
        const title = this.getUserFriendlyTitle(ruleId, sample ? sample.tool : '');
        const language = (sample && (sample as any).language) ? (sample as any).language as string : 'Java';
        
        content += `**${title}:**\n`;
        
        // Add curated YouTube channel/playlist
        const youtubeQuery = `${language} ${title.toLowerCase()}`.replace(/[^\w\s]/g, ' ').trim();
        content += `- [🎥 YouTube Tutorial](https://www.youtube.com/results?search_query=${encodeURIComponent(youtubeQuery + ' tutorial')})\n`;
        
        // Add curated documentation
        const curated = this.getCuratedResourcesForRule(ruleId);
        if (curated.length > 0) {
          for (const r of curated.slice(0, 2)) {
            content += `- [📚 ${r.title}](${r.url})\n`;
          }
        } else {
          content += `- [📚 OWASP Security Guide](https://owasp.org/www-project-top-ten/)\n`;
        }
        content += `\n`;
      }
    }

    // Phase 2: Comprehensive Learning Path
    content += `### 📚 Phase 2: Comprehensive Training (Long-term)\n\n`;
    content += `**Security (Week 1-2):**\n`;
    content += `- [📚 OWASP Top 10](https://owasp.org/www-project-top-10/)\n`;
    content += `- [📚 SEI CERT Java Coding Standard](https://wiki.sei.cmu.edu/confluence/display/java/SEI+CERT+Oracle+Coding+Standard+for+Java)\n\n`;
    content += `**Performance (Week 3-4):**\n`;
    content += `- [📚 Java Concurrency - Oracle](https://docs.oracle.com/javase/tutorial/essential/concurrency/)\n`;
    content += `- [📖 Java Concurrency in Practice](https://jcip.net/)\n\n`;
    content += `**Code Quality (Month 2):**\n`;
    content += `- [📖 Clean Code Principles](https://martinfowler.com/bliki/CleanCode.html)\n`;
    content += `- [📚 Google Java Style Guide](https://google.github.io/styleguide/javaguide.html)\n`;

    if (criticalIssues.length === 0 && highIssues.length === 0) {
      return this.generateEducationalResources(issues);
    }

    return content.trim();
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
      
      const currentPRScore = Math.round(
        (categoryScores.security + categoryScores.performance + categoryScores.architecture + 
         categoryScores.dependencies + categoryScores.codeQuality) / 5
      );
      
      // Build team leaderboard (only actual teammates from git/Supabase)
      let teamLeaderboard = await this.skillScoreManager.getLeaderboard(100); // Get larger set
      
      // Filter out obviously fake test data (names like "unknown", "Test Developer", etc.)
      const fakeNames = ['unknown', 'test developer', 'alice developer', 'bob developer', 'test'];
      teamLeaderboard = teamLeaderboard.filter((dev: any) => {
        const nameLower = (dev.name || '').toLowerCase();
        return !fakeNames.some(fake => nameLower.includes(fake));
      });
      
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
        const cost = agent.cost ? '$' + agent.cost.toFixed(4) : (issues === 0 ? 'N/A' : '$0.0000');
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
      content += `- Total Cost: $${totalCost.toFixed(4)}\n`;
      content += `- Cost per Issue: $${totalIssues > 0 ? (totalCost / totalIssues).toFixed(6) : '0.000000'}\n`;
      content += `- Issues per Second: ${totalTime > 0 ? ((totalIssues / totalTime) * 1000).toFixed(2) : '0.00'}\n`;
      content += `- Cost per Second: $${totalTime > 0 ? ((totalCost / totalTime) * 1000).toFixed(6) : '0.000000'}/s\n\n`;
      
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
        const badge = !isFinite(agent.costPerIssue)
          ? 'N/A'
          : agent.costPerIssue < 0.001 ? '⚡ Excellent'
          : agent.costPerIssue < 0.01 ? '✅ Good'
          : agent.costPerIssue < 0.1 ? '⚠️ Average' : '🔴 Expensive';
        const costPerIssueStr = isFinite(agent.costPerIssue) ? `$${agent.costPerIssue.toFixed(6)}/issue` : 'N/A cost/issue';
        content += `${rank} **${agent.name}**: ${agent.issues} issues @ ${costPerIssueStr} ${badge}\n`;
      });
      
      // Replacement recommendations
      const expensiveAgents = agentEfficiency.filter((a: any) => a.costPerIssue > 0.05);
      if (expensiveAgents.length > 0) {
        content += `\n**💡 Optimization Opportunities:**\n`;
        expensiveAgents.forEach((agent: any) => {
          content += `- Consider optimizing **${agent.name}** (high cost/issue: $${agent.costPerIssue.toFixed(4)})\n`;
        });
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
- Auto-fixable: ${groups.filter(g => this.canAutoFix(g)).length}/${groups.length} issue types
- Critical: ${issues.filter(i => i.severity === 'critical').length}
- High: ${issues.filter(i => i.severity === 'high').length}
- Medium: ${issues.filter(i => i.severity === 'medium').length}
- Low: ${issues.filter(i => i.severity === 'low').length}

---
*Generated by V9 Code Quality Analyzer | [View Full Report](${metadata.repoUrl || '#'})*
\`\`\`

**📋 Instructions:**
1. Copy the markdown content above
2. Paste it as a comment on your pull request
3. Customize if needed (greeting, additional context, etc.)`;
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
    attachments: LocationAttachment[],
    ideFixFiles: IDEFixFile[]
  ): string {
    let footer = '## 🔗 Attachments\n\n';
    footer += `1. [Issue Groups Mapping](issue-groups-map.json) - Index of all ${groups.length} groups\n`;
    
    attachments.forEach((attachment, idx) => {
      footer += `${idx + 2}. [Group ${idx + 1} Locations](attachments/${attachment.filename}) - ${attachment.content.rule} (${attachment.content.total_occurrences} files)\n`;
    });
    
    if (ideFixFiles.length > 0) {
      footer += `\n## 🔧 IDE Integration Files\n\n`;
      footer += `**${ideFixFiles.length} groups** support one-click fix in Cursor IDE:\n\n`;
      ideFixFiles.forEach((file, idx) => {
        footer += `${idx + 1}. [Fix Group ${idx + 1}](attachments/${file.filename}) - ${file.content.rule}\n`;
      });
      footer += `\n**How to use**: Download the fix file and open in Cursor. Click "Apply All Fixes" to automatically fix all ${ideFixFiles.reduce((sum, f) => sum + f.content.metadata.total_occurrences, 0)} occurrences.\n`;
    }
    
    footer += `\n---\n\n`;
    footer += `*Generated by CodeQual V9 - Grouped Report Format*  \n`;
    footer += `*${new Date().toISOString()}*`;
    
    return footer;
  }
  
  // Helper methods
  
  private sanitizeGroupId(group: IssueGroup): string {
    return `${group.rule}-${group.severity}-${group.tool}`.toLowerCase().replace(/[^a-z0-9-]/g, '-');
  }
  
  private groupBySeverity(issues: EnrichedIssue[]): Record<string, number> {
    return {
      critical: issues.filter(i => i.severity === 'critical').length,
      high: issues.filter(i => i.severity === 'high').length,
      medium: issues.filter(i => i.severity === 'medium').length,
      low: issues.filter(i => i.severity === 'low').length
    };
  }
  
  private groupByCategory(issues: EnrichedIssue[]): Record<string, number> {
    const result: Record<string, number> = {
      'NEW': 0,
      'EXISTING_MODIFIED': 0,
      'RESOLVED': 0,
      'EXISTING_REST': 0
    };
    issues.forEach(issue => {
      const cat = issue.category || 'unknown';
      result[cat] = (result[cat] || 0) + 1;
    });
    return result;
  }
  
  private groupByTool(issues: EnrichedIssue[]): Record<string, number> {
    const result: Record<string, number> = {};
    issues.forEach(issue => {
      result[issue.tool] = (result[issue.tool] || 0) + 1;
    });
    return result;
  }
}

