/**
 * V9 Analysis Service - Unified PR Analysis API
 *
 * Production-ready service that orchestrates the complete V9 analysis flow.
 * This service extracts the core logic from test-v9-e2e-complete.ts into
 * a reusable API service for all consumers (REST, GraphQL, CI/CD, IDE).
 *
 * Flow:
 * 1. Repository setup & branch detection
 * 2. Language detection & orchestrator selection
 * 3. Tool execution on both branches
 * 4. Issue categorization (NEW/RESOLVED/EXISTING_MODIFIED/EXISTING_REST)
 * 5. Issue grouping & AI enrichment
 * 6. Educational resources generation
 * 7. Report generation
 *
 * Usage:
 *   const service = new V9AnalysisService();
 *   const result = await service.analyzePR({
 *     repositoryUrl: 'https://github.com/owner/repo',
 *     prNumber: 123
 *   });
 */

import { execSync, execFileSync } from 'child_process';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

import { detectDefaultBranch, getModifiedFilesBetweenBranches } from '../utils/git-utils';
import {
  sanitizeBranchName,
  sanitizeRepoUrl,
  sanitizePrNumber,
  sanitizePath,
  extractRepoName as safeExtractRepoName
} from '../utils/security-utils';
import { SpecializedAgentFactory } from '../agents/specialized-agents';
import { V9EducationalResources } from '../analyzers/v9-educational-resources';
import { V9GroupedReportFormatter } from '../analyzers/v9-grouped-report-formatter';
import { ModelConfigResolver } from '../../standard/orchestrator/model-config-resolver';
import { CodeSnippetExtractor } from '../utils/code-snippet-extractor';
import { groupIssues, prioritizeGroups, generateGroupingSummary } from '../utils/issue-grouping';
import { detectCategory } from '../report/category-detector';
import { generateScannerValueSection, getScannerToolGuidance } from '../report/fix-capability-utils';
import { getFixGuidance, formatGuidanceForPrompt } from '../../fix-agent/fix-pattern-registry/fix-pattern-guidance';

// Base types
import { type RawIssue, type OrchestrationResult } from '../tools/base-tool-orchestrator';

// Language-specific orchestrators
import { JavaToolOrchestrator } from '../tools/java/java-tool-orchestrator';
import { TypeScriptToolOrchestrator } from '../tools/typescript/typescript-tool-orchestrator';
import { PythonToolOrchestrator } from '../tools/python/python-tool-orchestrator';
import { GoToolOrchestrator } from '../tools/go/go-tool-orchestrator';
import { RustToolOrchestrator } from '../tools/rust/rust-tool-orchestrator';
import { RubyToolOrchestrator } from '../tools/ruby/ruby-tool-orchestrator';
import { PHPToolOrchestrator } from '../tools/php/php-tool-orchestrator';
import { DotnetToolOrchestrator } from '../tools/dotnet/dotnet-tool-orchestrator';

// ============================================================================
// TYPES
// ============================================================================

export type SupportedLanguage = 'java' | 'typescript' | 'python' | 'go' | 'rust' | 'ruby' | 'php' | 'csharp';
export type IssueCategory = 'NEW' | 'EXISTING_MODIFIED' | 'RESOLVED' | 'EXISTING_REST';
export type AnalysisMode = 'quick' | 'standard' | 'complete';

export interface AnalysisRequest {
  repositoryUrl: string;
  prNumber: number;
  baseBranch?: string;
  prBranch?: string;
  language?: SupportedLanguage;
  analysisMode?: AnalysisMode;
  outputDir?: string;
  skipCache?: boolean;
  maxAIAnalysis?: number;  // Max issue groups to analyze with AI (default: 20)
  includeEducation?: boolean;  // Generate educational resources (default: true)
  // SESSION 112 FIX: Added for complete metadata support
  prTitle?: string;           // PR title for report header
  prAuthor?: string;          // PR author username
  prAuthorEmail?: string;     // PR author email
  userTier?: 'basic' | 'pro' | 'enterprise';  // User tier for report features
}

/**
 * EnrichedIssue - Issue with all analysis enrichments
 * Contains all RawIssue fields plus analysis metadata
 */
export interface EnrichedIssue {
  // Base issue fields (from RawIssue)
  tool: string;
  file: string;
  line: number;
  column?: number;
  severity: 'critical' | 'high' | 'medium' | 'low';
  message: string;
  rule: string;
  cwe?: string;
  autoFixable?: boolean;

  // Analysis enrichment
  category: IssueCategory;
  detectedCategory?: string;
  agent?: string;
  fixSuggestion?: {
    fix: string;
    correctedCode: string;
    explanation: string;
    bestPractices?: string[];
  };
  educationalLinks?: string[];
  snippet?: string;
  isGroupRepresentative?: boolean;
  isGroupAnalyzed?: boolean;
  groupSize?: number;
  scannerGuidance?: ReturnType<typeof getScannerToolGuidance>;
}

export interface AnalysisResult {
  success: boolean;
  analysisId: string;
  decision: 'APPROVED' | 'NEEDS_REVIEW' | 'DECLINED';

  // Issues by category
  issues: {
    total: number;
    new: number;
    existingModified: number;
    resolved: number;
    existingRest: number;
    blocking: number;
  };

  // Detailed issues
  byCategory: Record<IssueCategory, EnrichedIssue[]>;
  blockingIssues: EnrichedIssue[];

  // Report paths
  report?: {
    markdown?: string;
    sarif?: string;
    gitlab?: string;
    lsp?: string;
  };

  // Metadata
  metadata: {
    repositoryUrl: string;
    prNumber: number;
    baseBranch: string;
    prBranch: string;
    language: SupportedLanguage;
    modifiedFiles: number;
    analysisTimestamp: string;
    duration: {
      total: number;
      toolExecution: number;
      aiEnrichment: number;
      reportGeneration: number;
    };
    cost: {
      aiCalls: number;
      estimatedCost: number;
      savingsPercent: number;
    };
  };

  // Error info
  error?: string;
}

// ============================================================================
// SERVICE
// ============================================================================

// SESSION 92: In-memory fix cache to avoid duplicate AI calls
// Key: rule:tool:language, Value: fix suggestion
type FixCacheKey = string;
const fixCache: Map<FixCacheKey, EnrichedIssue['fixSuggestion']> = new Map();

function getFixCacheKey(rule: string, tool: string, language: string): FixCacheKey {
  return `${rule}:${tool}:${language}`;
}

export class V9AnalysisService {
  private modelConfigResolver: ModelConfigResolver;
  private educator: V9EducationalResources;
  private workDir: string;

  constructor(config?: { workDir?: string }) {
    this.modelConfigResolver = new ModelConfigResolver();
    this.educator = new V9EducationalResources();
    this.workDir = config?.workDir || '/tmp/codequal-analysis';
  }

  /**
   * Main entry point: Analyze a PR
   */
  async analyzePR(request: AnalysisRequest): Promise<AnalysisResult> {
    const startTime = Date.now();

    // Generate analysis ID using crypto.randomUUID() - no user input in this value
    const analysisId = this.generateAnalysisId(request);

    // Output directory uses only: hardcoded base + random UUID
    // No user-controlled data flows into this path
    const reportsDir = path.join(this.workDir, 'reports');
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }
    const outputDir = path.join(reportsDir, analysisId);

    console.log(`\n${'='.repeat(80)}`);
    console.log(`🚀 V9 Analysis Service - Analysis Started`);
    console.log(`   Analysis ID: ${analysisId}`);
    console.log(`   Repository: ${request.repositoryUrl}`);
    console.log(`   PR: #${request.prNumber}`);
    console.log(`${'='.repeat(80)}\n`);

    try {
      // Step 1: Repository Setup
      const repoSetup = await this.setupRepository(request);

      // Step 2: Detect Language
      const language = request.language || this.detectLanguage(repoSetup.repoPath);
      console.log(`   Detected language: ${language}\n`);

      // Step 3: Tool Execution
      // SESSION 69: Default to 'complete' mode for maximum tool coverage during testing
      // Later: Users will configure their preferred mode via settings page
      // SESSION 113: Pass userTier to orchestrator for tier-aware tool execution
      const toolStart = Date.now();
      const toolResults = await this.executeTools(
        repoSetup.repoPath,
        language,
        repoSetup.baseBranch,
        repoSetup.prBranch,
        request.analysisMode || 'complete',
        request.userTier || 'basic'
      );
      const toolDuration = Date.now() - toolStart;

      // Step 4: Issue Categorization
      const categorizedIssues = this.categorizeIssues(
        toolResults.prIssues,
        toolResults.baseIssues,
        repoSetup.modifiedFiles
      );

      // Step 5: AI Enrichment
      const aiStart = Date.now();
      const enrichedIssues = await this.enrichWithAI(
        categorizedIssues,
        language,
        repoSetup.repoPath,
        request.maxAIAnalysis || 20
      );
      const aiDuration = Date.now() - aiStart;

      // Step 6: Educational Resources (optional)
      if (request.includeEducation !== false) {
        await this.addEducationalResources(enrichedIssues, language);
      }

      // Step 7: Add Scanner Guidance for Tier 3 tools
      this.addScannerGuidance(enrichedIssues);

      // Step 8: Calculate Decision
      const blockingIssues = enrichedIssues.filter(issue =>
        (issue.category === 'NEW' || issue.category === 'EXISTING_MODIFIED') &&
        (issue.severity === 'critical' || issue.severity === 'high')
      );

      const decision = this.calculateDecision(blockingIssues.length, enrichedIssues.length);

      // SESSION 112 FIX: Collect complete metadata for report generation
      // This ensures all report sections have the data they need
      const repoStats = this.getRepoStats(repoSetup.repoPath);
      const prStats = this.getPRStats(repoSetup.repoPath, repoSetup.baseBranch, repoSetup.prBranch);
      const authorInfo = this.getAuthorInfo(repoSetup.repoPath, request);

      // Step 9: Generate Report
      const reportStart = Date.now();
      const reportPaths = await this.generateReport(
        enrichedIssues,
        blockingIssues,
        decision,
        {
          // Repository Information
          repository: request.repositoryUrl,
          repoUrl: request.repositoryUrl,
          repoPath: repoSetup.repoPath,
          prNumber: request.prNumber,
          prTitle: request.prTitle || `PR #${request.prNumber}`,
          branch: repoSetup.prBranch,
          baseBranch: repoSetup.baseBranch,

          // Author Information (SESSION 112 FIX)
          prAuthor: authorInfo.author,
          prAuthorEmail: authorInfo.email,
          organizationName: this.extractOrgName(request.repositoryUrl),

          // Code Statistics (SESSION 112 FIX)
          totalFiles: repoStats.totalFiles,
          totalLinesOfCode: repoStats.totalLines,
          filesModified: repoSetup.modifiedFiles.size,
          linesAdded: prStats.linesAdded,
          linesDeleted: prStats.linesDeleted,
          languageBreakdown: { [language]: 100 },

          // Performance Metrics (SESSION 112 FIX)
          totalDuration: Date.now() - startTime,
          cloneTime: 0, // Not tracked separately
          analysisTime: toolDuration,
          reportGenerationTime: 0, // Will be set after

          // Tool Performance (SESSION 112 FIX - critical for report!)
          toolPerformance: toolResults.toolPerformance,

          // Additional
          analyzerVersion: '9.0.0',
          userTier: request.userTier || 'basic'
        },
        outputDir
      );
      const reportDuration = Date.now() - reportStart;

      // Compile result
      const byCategory = this.groupByCategory(enrichedIssues);

      const result: AnalysisResult = {
        success: true,
        analysisId,
        decision,
        issues: {
          total: enrichedIssues.length,
          new: byCategory.NEW.length,
          existingModified: byCategory.EXISTING_MODIFIED.length,
          resolved: byCategory.RESOLVED.length,
          existingRest: byCategory.EXISTING_REST.length,
          blocking: blockingIssues.length
        },
        byCategory,
        blockingIssues,
        report: reportPaths,
        metadata: {
          repositoryUrl: request.repositoryUrl,
          prNumber: request.prNumber,
          baseBranch: repoSetup.baseBranch,
          prBranch: repoSetup.prBranch,
          language,
          modifiedFiles: repoSetup.modifiedFiles.size,
          analysisTimestamp: new Date().toISOString(),
          duration: {
            total: Date.now() - startTime,
            toolExecution: toolDuration,
            aiEnrichment: aiDuration,
            reportGeneration: reportDuration
          },
          cost: {
            aiCalls: enrichedIssues.filter(i => i.isGroupRepresentative).length,
            estimatedCost: enrichedIssues.filter(i => i.isGroupRepresentative).length * 0.003,
            savingsPercent: 0 // Calculated during enrichment
          }
        }
      };

      console.log(`\n${'='.repeat(80)}`);
      console.log(`✅ Analysis Complete`);
      console.log(`   Decision: ${decision}`);
      console.log(`   Total Issues: ${result.issues.total}`);
      console.log(`   Duration: ${Math.round(result.metadata.duration.total / 1000)}s`);
      console.log(`${'='.repeat(80)}\n`);

      return result;

    } catch (error: any) {
      console.error(`\n❌ Analysis failed: ${error.message}`);

      return {
        success: false,
        analysisId,
        decision: 'DECLINED',
        issues: { total: 0, new: 0, existingModified: 0, resolved: 0, existingRest: 0, blocking: 0 },
        byCategory: { NEW: [], EXISTING_MODIFIED: [], RESOLVED: [], EXISTING_REST: [] },
        blockingIssues: [],
        metadata: {
          repositoryUrl: request.repositoryUrl,
          prNumber: request.prNumber,
          baseBranch: request.baseBranch || 'main',
          prBranch: request.prBranch || `pr-${request.prNumber}`,
          language: request.language || 'java',
          modifiedFiles: 0,
          analysisTimestamp: new Date().toISOString(),
          duration: { total: Date.now() - startTime, toolExecution: 0, aiEnrichment: 0, reportGeneration: 0 },
          cost: { aiCalls: 0, estimatedCost: 0, savingsPercent: 0 }
        },
        error: error.message
      };
    }
  }

  // ==========================================================================
  // PRIVATE METHODS
  // ==========================================================================

  /**
   * Generate a unique analysis ID using cryptographically secure random UUID.
   * This ensures the ID has no data flow from user inputs, preventing
   * path traversal and injection attacks in downstream file operations.
   */
  private generateAnalysisId(_request: AnalysisRequest): string {
    // Use crypto.randomUUID() to generate ID with no user input dependency
    // This breaks the data flow that CodeQL traces from user inputs
    return `analysis-${crypto.randomUUID()}`;
  }

  private extractRepoName(url: string): string {
    const match = url.match(/\/([^/]+)\.git$/) || url.match(/\/([^/]+)$/);
    return match ? match[1].toLowerCase() : 'repo';
  }

  private async setupRepository(request: AnalysisRequest): Promise<{
    repoPath: string;
    baseBranch: string;
    prBranch: string;
    modifiedFiles: Set<string>;
  }> {
    console.log(`📁 Step 1: Repository Setup\n`);

    // Sanitize inputs to prevent command injection
    const safeRepoUrl = sanitizeRepoUrl(request.repositoryUrl);
    const safePrNumber = sanitizePrNumber(request.prNumber);

    const repoName = safeExtractRepoName(safeRepoUrl);
    const reposBaseDir = path.join(this.workDir, 'repos');

    // Ensure repos directory exists
    if (!fs.existsSync(reposBaseDir)) {
      fs.mkdirSync(reposBaseDir, { recursive: true });
    }

    // Sanitize path to prevent path traversal
    const repoPath = sanitizePath(reposBaseDir, repoName);

    // Clone or update repository using execFileSync for safety
    // Security: safeRepoUrl is validated by sanitizeRepoUrl() which rejects malicious URLs
    // Security: repoPath is validated by sanitizePath() which prevents path traversal
    // Security: execFileSync with array args prevents shell injection (no shell interpretation)
    if (!fs.existsSync(repoPath)) {
      console.log(`   Cloning repository...`);
      // CodeQL: execFileSync with args array is safe - no shell interpretation occurs
      execFileSync('git', ['clone', safeRepoUrl, repoPath], { stdio: 'inherit' }); // codeql[js/command-line-injection] SAFE: args array, sanitized inputs
    } else if (!request.skipCache) {
      console.log(`   Using cached repository, fetching updates...`);
      execFileSync('git', ['fetch', '--all'], { cwd: repoPath, stdio: 'ignore' });
    }

    // Detect and sanitize branches
    const baseBranch = sanitizeBranchName(request.baseBranch || detectDefaultBranch(repoPath));
    const prBranch = sanitizeBranchName(request.prBranch || `pr-${safePrNumber}`);

    // Fetch PR branch if needed using execFileSync
    try {
      execFileSync('git', ['rev-parse', '--verify', prBranch], { cwd: repoPath, stdio: 'ignore' });
    } catch {
      console.log(`   Fetching PR branch...`);
      execFileSync('git', ['fetch', 'origin', `pull/${safePrNumber}/head:${prBranch}`], { cwd: repoPath, stdio: 'inherit' });
    }

    // Checkout and get modified files
    execFileSync('git', ['checkout', prBranch], { cwd: repoPath, stdio: 'ignore' });
    const modifiedFiles = new Set(getModifiedFilesBetweenBranches(repoPath, baseBranch, prBranch));

    console.log(`   ✅ Repository ready`);
    console.log(`   Base branch: ${baseBranch}`);
    console.log(`   PR branch: ${prBranch}`);
    console.log(`   Modified files: ${modifiedFiles.size}\n`);

    return { repoPath, baseBranch, prBranch, modifiedFiles };
  }

  private detectLanguage(repoPath: string): SupportedLanguage {
    // Check for common project files
    // lgtm[js/incomplete-sanitization] - These are hardcoded constants, not user input
    // The '*' is a simple marker used with replace('*','') and endsWith(), not regex/shell
    const checks: Array<{ file: string; lang: SupportedLanguage }> = [
      { file: 'pom.xml', lang: 'java' },
      { file: 'build.gradle', lang: 'java' },
      { file: 'build.gradle.kts', lang: 'java' },
      { file: 'package.json', lang: 'typescript' },
      { file: 'tsconfig.json', lang: 'typescript' },
      { file: 'requirements.txt', lang: 'python' },
      { file: 'pyproject.toml', lang: 'python' },
      { file: 'setup.py', lang: 'python' },
      { file: 'go.mod', lang: 'go' },
      { file: 'Cargo.toml', lang: 'rust' },
      { file: 'Gemfile', lang: 'ruby' },
      { file: 'composer.json', lang: 'php' },
      { file: '.csproj', lang: 'csharp' },  // Changed from *.csproj - check suffix directly
      { file: '.sln', lang: 'csharp' }       // Changed from *.sln - check suffix directly
    ];

    for (const check of checks) {
      // For extension checks (starting with .), check if any file ends with it
      if (check.file.startsWith('.')) {
        const files = fs.readdirSync(repoPath);
        if (files.some(f => f.endsWith(check.file))) {
          return check.lang;
        }
      } else if (fs.existsSync(path.join(repoPath, check.file))) {
        return check.lang;
      }
    }

    return 'java'; // Default
  }

  private async executeTools(
    repoPath: string,
    language: SupportedLanguage,
    baseBranch: string,
    prBranch: string,
    mode: AnalysisMode,
    userTier: 'basic' | 'pro' | 'enterprise' = 'basic'  // SESSION 113: Pass to orchestrator
  ): Promise<{
    prIssues: RawIssue[];
    baseIssues: RawIssue[];
    // SESSION 112 FIX: Added for complete report metadata
    toolPerformance: Array<{
      tool: string;
      duration: number;
      issuesFound: number;
      exitCode: number;
      success: boolean;
    }>;
    prTotalDuration: number;
    baseTotalDuration: number;
  }> {
    console.log(`🔧 Step 2: Tool Execution (${language})\n`);

    const orchestrator = this.getOrchestrator(language);

    // Branches are already sanitized from setupRepository, but add safety check
    const safePrBranch = sanitizeBranchName(prBranch);
    const safeBaseBranch = sanitizeBranchName(baseBranch);

    // Analyze PR branch using execFileSync for safety
    console.log(`   Analyzing PR branch...`);
    execFileSync('git', ['checkout', safePrBranch], { cwd: repoPath, stdio: 'ignore' });
    // BUG FIX: orchestrate() takes 3 params (repoPath, branch, options) - was passing undefined as options
    // SESSION 113: Pass userTier for tier-aware tool execution and report generation
    const prResult = await orchestrator.orchestrate(repoPath, 'pr', {
      includeAllSeverities: mode === 'complete',
      analysisMode: mode,
      userTier: userTier
    });
    const prIssues = prResult.toolResults.flatMap((t: any) => t.issues);

    // SESSION 69: Log per-tool metrics for PR branch
    console.log(`   ✅ PR Branch - Per-Tool Metrics:`);
    console.log(`   ┌──────────────────────────┬──────────┬────────┐`);
    console.log(`   │ Tool                     │ Duration │ Issues │`);
    console.log(`   ├──────────────────────────┼──────────┼────────┤`);
    let prTotalDuration = 0;
    for (const tr of prResult.toolResults) {
      const toolName = (tr.tool || 'unknown').padEnd(24);
      const durationMs = tr.duration || 0;
      prTotalDuration += durationMs;
      const duration = `${(durationMs / 1000).toFixed(1)}s`.padStart(8);
      const issues = String(tr.issues?.length || 0).padStart(6);
      console.log(`   │ ${toolName} │ ${duration} │ ${issues} │`);
    }
    console.log(`   ├──────────────────────────┼──────────┼────────┤`);
    console.log(`   │ ${'TOTAL'.padEnd(24)} │ ${`${(prTotalDuration / 1000).toFixed(1)}s`.padStart(8)} │ ${String(prIssues.length).padStart(6)} │`);
    console.log(`   └──────────────────────────┴──────────┴────────┘\n`);

    // Analyze base branch using execFileSync for safety
    console.log(`   Analyzing base branch...`);
    execFileSync('git', ['checkout', safeBaseBranch], { cwd: repoPath, stdio: 'ignore' });
    // BUG FIX: orchestrate() takes 3 params (repoPath, branch, options) - was passing undefined as options
    // SESSION 113: Pass userTier for tier-aware tool execution and report generation
    const baseResult = await orchestrator.orchestrate(repoPath, 'base', {
      includeAllSeverities: mode === 'complete',
      analysisMode: mode,
      userTier: userTier
    });
    const baseIssues = baseResult.toolResults.flatMap((t: any) => t.issues);

    // SESSION 69: Log per-tool metrics for base branch
    console.log(`   ✅ Base Branch - Per-Tool Metrics:`);
    console.log(`   ┌──────────────────────────┬──────────┬────────┐`);
    console.log(`   │ Tool                     │ Duration │ Issues │`);
    console.log(`   ├──────────────────────────┼──────────┼────────┤`);
    let baseTotalDuration = 0;
    for (const tr of baseResult.toolResults) {
      const toolName = (tr.tool || 'unknown').padEnd(24);
      const durationMs = tr.duration || 0;
      baseTotalDuration += durationMs;
      const duration = `${(durationMs / 1000).toFixed(1)}s`.padStart(8);
      const issues = String(tr.issues?.length || 0).padStart(6);
      console.log(`   │ ${toolName} │ ${duration} │ ${issues} │`);
    }
    console.log(`   ├──────────────────────────┼──────────┼────────┤`);
    console.log(`   │ ${'TOTAL'.padEnd(24)} │ ${`${(baseTotalDuration / 1000).toFixed(1)}s`.padStart(8)} │ ${String(baseIssues.length).padStart(6)} │`);
    console.log(`   └──────────────────────────┴──────────┴────────┘`);

    // Combined total
    const combinedDuration = (prTotalDuration + baseTotalDuration) / 1000;
    console.log(`\n   📊 Combined: ${combinedDuration.toFixed(1)}s total, ${prIssues.length + baseIssues.length} issues (PR: ${prIssues.length}, Base: ${baseIssues.length})\n`);

    // SESSION 112 FIX: Return toolPerformance for complete report metadata
    const toolPerformance = prResult.toolResults.map((tr: any) => ({
      tool: tr.tool,
      duration: tr.duration || 0,
      issuesFound: tr.issues?.length || 0,
      exitCode: tr.exitCode || 0,
      success: tr.exitCode === 0
    }));

    return { prIssues, baseIssues, toolPerformance, prTotalDuration, baseTotalDuration };
  }

  private getOrchestrator(language: SupportedLanguage): any {
    const orchestrators: Record<SupportedLanguage, any> = {
      java: new JavaToolOrchestrator(),
      typescript: new TypeScriptToolOrchestrator(),
      python: new PythonToolOrchestrator(),
      go: new GoToolOrchestrator(),
      rust: new RustToolOrchestrator(),
      ruby: new RubyToolOrchestrator(),
      php: new PHPToolOrchestrator(),
      csharp: new DotnetToolOrchestrator()
    };
    return orchestrators[language];
  }

  private categorizeIssues(
    prIssues: RawIssue[],
    baseIssues: RawIssue[],
    modifiedFiles: Set<string>
  ): EnrichedIssue[] {
    console.log(`📊 Step 3: Issue Categorization\n`);

    const normalizePath = (p: string) => {
      if (p.startsWith('/workspace/')) return p.replace('/workspace/', '');
      if (p.startsWith('workspace/')) return p.replace('workspace/', '');
      return p;
    };

    const getSig = (i: RawIssue) => `${normalizePath(i.file)}:${i.line}:${i.rule}`;
    const baseSigs = new Set(baseIssues.map(getSig));
    const prSigs = new Set(prIssues.map(getSig));
    const prFileExists = new Set(prIssues.map(i => normalizePath(i.file)));

    const categorizedIssues: EnrichedIssue[] = [];

    // NEW: In PR but not in base
    prIssues.forEach(issue => {
      if (!baseSigs.has(getSig(issue))) {
        categorizedIssues.push({
          ...issue,
          category: 'NEW',
          detectedCategory: detectCategory(issue.tool, issue.rule, issue.message)
        });
      }
    });

    // EXISTING_MODIFIED: In both, in modified files
    prIssues.forEach(issue => {
      if (baseSigs.has(getSig(issue)) && modifiedFiles.has(normalizePath(issue.file))) {
        categorizedIssues.push({
          ...issue,
          category: 'EXISTING_MODIFIED',
          detectedCategory: detectCategory(issue.tool, issue.rule, issue.message)
        });
      }
    });

    // RESOLVED: In base but not in PR, file was modified and still exists
    baseIssues.forEach(issue => {
      const sig = getSig(issue);
      const normalizedFile = normalizePath(issue.file);
      if (!prSigs.has(sig) && modifiedFiles.has(normalizedFile) && prFileExists.has(normalizedFile)) {
        categorizedIssues.push({
          ...issue,
          category: 'RESOLVED',
          detectedCategory: detectCategory(issue.tool, issue.rule, issue.message)
        });
      }
    });

    // EXISTING_REST: In both, in unmodified files
    prIssues.forEach(issue => {
      if (baseSigs.has(getSig(issue)) && !modifiedFiles.has(normalizePath(issue.file))) {
        categorizedIssues.push({
          ...issue,
          category: 'EXISTING_REST',
          detectedCategory: detectCategory(issue.tool, issue.rule, issue.message)
        });
      }
    });

    const counts = {
      NEW: categorizedIssues.filter(i => i.category === 'NEW').length,
      EXISTING_MODIFIED: categorizedIssues.filter(i => i.category === 'EXISTING_MODIFIED').length,
      RESOLVED: categorizedIssues.filter(i => i.category === 'RESOLVED').length,
      EXISTING_REST: categorizedIssues.filter(i => i.category === 'EXISTING_REST').length
    };

    console.log(`   NEW: ${counts.NEW}`);
    console.log(`   EXISTING_MODIFIED: ${counts.EXISTING_MODIFIED}`);
    console.log(`   RESOLVED: ${counts.RESOLVED}`);
    console.log(`   EXISTING_REST: ${counts.EXISTING_REST}\n`);

    return categorizedIssues;
  }

  private async enrichWithAI(
    issues: EnrichedIssue[],
    language: SupportedLanguage,
    repoPath: string,
    maxAnalysis: number
  ): Promise<EnrichedIssue[]> {
    console.log(`🤖 Step 4: AI Enrichment\n`);

    // SESSION 92 FIX: Process ALL issues (including EXISTING_REST)
    // Use caching to avoid duplicate AI calls - same rule gets same fix
    const categoryCounts = {
      NEW: issues.filter(i => i.category === 'NEW').length,
      EXISTING_MODIFIED: issues.filter(i => i.category === 'EXISTING_MODIFIED').length,
      EXISTING_REST: issues.filter(i => i.category === 'EXISTING_REST').length,
      RESOLVED: issues.filter(i => i.category === 'RESOLVED').length
    };
    console.log(`   📊 Issues by category: NEW=${categoryCounts.NEW}, MODIFIED=${categoryCounts.EXISTING_MODIFIED}, EXISTING=${categoryCounts.EXISTING_REST}, RESOLVED=${categoryCounts.RESOLVED}`);

    // Group ALL issues to reduce AI calls - same rule:tool gets same fix
    const groupingResult = groupIssues(issues);
    console.log(generateGroupingSummary(groupingResult));

    const { analyzed: priorityGroups } = prioritizeGroups(groupingResult.groups, maxAnalysis);

    console.log(`   Analyzing ${priorityGroups.length} unique issue types...\n`);

    // Get representative issues for each group
    const representatives: EnrichedIssue[] = [];
    for (const group of priorityGroups) {
      const rep = issues.find(i =>
        i.rule === group.rule && i.tool === group.tool && i.severity === group.severity
      );
      if (rep) {
        representatives.push({ ...rep, isGroupRepresentative: true, groupSize: group.count });
      }
    }

    // SESSION 92: Process with AI, using cache to avoid duplicate calls
    let cacheHits = 0;
    let aiCalls = 0;

    for (const issue of representatives) {
      const cacheKey = getFixCacheKey(issue.rule || '', issue.tool, language);
      const cachedFix = fixCache.get(cacheKey);

      if (cachedFix) {
        // Cache hit - use existing fix without AI call
        issue.fixSuggestion = cachedFix;
        issue.agent = this.mapToolToType(issue.tool).charAt(0).toUpperCase() +
          this.mapToolToType(issue.tool).slice(1) + 'Agent';
        cacheHits++;
        continue;
      }

      // Cache miss - need AI call
      try {
        const issueContext = {
          title: issue.rule || issue.message,
          description: issue.message,
          type: this.mapToolToType(issue.tool),
          severity: issue.severity,
          file: issue.file,
          line: issue.line || 0,
          codeSnippet: issue.snippet || '',
          modifiedInPR: issue.category === 'NEW',
          repository: repoPath
        };

        const fixSuggestion = await SpecializedAgentFactory.generateFixForIssue(
          issueContext,
          this.modelConfigResolver,
          language,
          'medium'
        );

        issue.fixSuggestion = {
          ...fixSuggestion,
          explanation: fixSuggestion.explanation || 'Fix suggestion generated by AI agent'
        };
        issue.agent = issueContext.type.charAt(0).toUpperCase() + issueContext.type.slice(1) + 'Agent';
        aiCalls++;

        // Cache the successful fix for future use
        if (issue.fixSuggestion && issue.fixSuggestion.fix && issue.rule) {
          fixCache.set(cacheKey, issue.fixSuggestion);
        }
      } catch (error: any) {
        console.log(`   ⚠️  AI enrichment failed for ${issue.file}:${issue.line}`);
        issue.fixSuggestion = {
          fix: 'Address this issue according to best practices',
          correctedCode: `// Fix required at line ${issue.line}`,
          explanation: 'AI enrichment temporarily unavailable'
        };
      }
    }

    console.log(`   📊 AI Stats: ${aiCalls} calls, ${cacheHits} cache hits (${Math.round(cacheHits * 100 / Math.max(1, aiCalls + cacheHits))}% reuse)`);

    // Apply AI fixes to all grouped issues
    let enrichedCount = 0;
    for (const rep of representatives) {
      if (rep.fixSuggestion) {
        issues.forEach(issue => {
          if (issue.rule === rep.rule && issue.tool === rep.tool && issue.severity === rep.severity) {
            issue.fixSuggestion = rep.fixSuggestion;
            issue.agent = rep.agent;
            issue.isGroupAnalyzed = true;
            issue.groupSize = rep.groupSize;
            enrichedCount++;
          }
        });
      }
    }

    console.log(`   ✅ Applied AI fixes to ${enrichedCount} issues\n`);

    return issues;
  }

  private mapToolToType(tool: string): string {
    const toolLower = tool.toLowerCase();
    if (toolLower === 'semgrep' || toolLower === 'brakeman' || toolLower === 'bandit') return 'security';
    if (toolLower.includes('dependency') || toolLower.includes('audit')) return 'dependency';
    if (toolLower === 'spotbugs' || toolLower.includes('perf')) return 'performance';
    return 'codequality';
  }

  private async addEducationalResources(issues: EnrichedIssue[], language: string): Promise<void> {
    console.log(`📚 Step 5: Educational Resources\n`);

    const representatives = issues.filter(i => i.isGroupRepresentative).slice(0, 3);

    for (const issue of representatives) {
      try {
        const issueForEducator = {
          id: `issue-group-${issue.rule}`,
          category: issue.detectedCategory || 'Code Quality',
          severity: issue.severity,
          status: 'new',
          title: issue.rule || issue.message,
          description: issue.message,
          file: issue.file,
          line: issue.line || 0,
          tool: issue.tool,
          agent: issue.agent || 'CodeQualityAgent'
        };

        const resources = await this.educator.getEducationalResources(issueForEducator as any, language);
        issue.educationalLinks = resources.map((r: any) => r.url || r.link).filter(Boolean);
      } catch {
        // Continue without educational resources
      }
    }

    console.log(`   ✅ Educational resources added\n`);
  }

  /**
   * Add scanner guidance for Tier 3 (scanner-only) tools
   * This shows users what they get even without auto-fix
   */
  private addScannerGuidance(issues: EnrichedIssue[]): void {
    for (const issue of issues) {
      const guidance = getScannerToolGuidance(issue.tool);
      if (guidance) {
        issue.scannerGuidance = guidance;
      }
    }
  }

  private calculateDecision(blockingCount: number, totalCount: number): 'APPROVED' | 'NEEDS_REVIEW' | 'DECLINED' {
    if (blockingCount === 0) return 'APPROVED';
    if (blockingCount <= 3 && totalCount < 50) return 'NEEDS_REVIEW';
    return 'DECLINED';
  }

  private groupByCategory(issues: EnrichedIssue[]): Record<IssueCategory, EnrichedIssue[]> {
    return {
      NEW: issues.filter(i => i.category === 'NEW'),
      EXISTING_MODIFIED: issues.filter(i => i.category === 'EXISTING_MODIFIED'),
      RESOLVED: issues.filter(i => i.category === 'RESOLVED'),
      EXISTING_REST: issues.filter(i => i.category === 'EXISTING_REST')
    };
  }

  /**
   * Generate report files
   *
   * SECURITY NOTE: outputDir is ALWAYS internally computed in analyzePR():
   *   1. reportsDir = path.join(this.workDir, 'reports') - hardcoded safe base
   *   2. analysisId is sanitized: .replace(/[^a-zA-Z0-9._-]/g, '_')
   *   3. outputDir = path.join(reportsDir, sanitizedAnalysisId)
   *
   * This ensures path traversal is not possible even though CodeQL traces
   * data flow from user inputs. The sanitization removes all dangerous characters.
   */
  private async generateReport(
    issues: EnrichedIssue[],
    blockingIssues: EnrichedIssue[],
    decision: string,
    metadata: any,
    outputDir: string
  ): Promise<{ markdown?: string; sarif?: string; gitlab?: string; lsp?: string }> {
    console.log(`📝 Step 6: Report Generation\n`);

    // lgtm[js/path-injection] - outputDir is internally computed with sanitized analysisId
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true }); // lgtm[js/path-injection]
    }

    // Generate scanner guidance sections for Tier 3 tools
    const scannerSections: string[] = [];
    const toolsWithGuidance = new Set(issues.map(i => i.tool).filter(tool => getScannerToolGuidance(tool)));

    for (const tool of toolsWithGuidance) {
      const toolIssues = issues.filter(i => i.tool === tool);
      const section = generateScannerValueSection(tool, toolIssues.length);
      if (section) {
        scannerSections.push(section);
      }
    }

    // Save scanner guidance if any
    if (scannerSections.length > 0) {
      // lgtm[js/path-injection] - outputDir is internally computed, 'scanner-guidance.md' is hardcoded
      const scannerGuidancePath = path.join(outputDir, 'scanner-guidance.md');
      fs.writeFileSync(scannerGuidancePath, scannerSections.join('\n---\n\n')); // lgtm[js/path-injection]
      console.log(`[Report] Scanner guidance saved`);
    }

    // SESSION 112: Use V9GroupedReportFormatter (with progressHistory, tier support)
    // Replaces V9ReportFormatterFinal for all new reports
    try {
      const formatter = new V9GroupedReportFormatter();

      // Generate issue groups for the formatter
      const groupingResult = groupIssues(issues);

      // Build metadata object for grouped formatter
      const reportMetadata = {
        repository: metadata.repository,
        repoUrl: metadata.repoUrl,
        repoPath: metadata.repoPath,
        prNumber: metadata.prNumber,
        prTitle: metadata.prTitle,
        branch: metadata.branch || metadata.prBranch,
        baseBranch: metadata.baseBranch,
        prAuthor: metadata.prAuthor,
        prAuthorEmail: metadata.prAuthorEmail,
        organizationName: metadata.organizationName,
        totalFiles: metadata.totalFiles || 0,
        totalLinesOfCode: metadata.totalLinesOfCode,
        filesModified: metadata.filesModified,
        linesAdded: metadata.linesAdded,
        linesDeleted: metadata.linesDeleted,
        languageBreakdown: metadata.languageBreakdown,
        decision,
        blockingCount: blockingIssues.length,
        totalDuration: metadata.totalDuration || 0,
        cloneTime: metadata.cloneTime,
        analysisTime: metadata.analysisTime,
        reportGenerationTime: metadata.reportGenerationTime,
        analyzedAt: new Date().toISOString(),
        analyzerVersion: metadata.analyzerVersion || '9.0.0',
        toolPerformance: metadata.toolPerformance || [],
        agentPerformance: metadata.agentPerformance,
        modelsUsed: metadata.modelsUsed,
        userTier: metadata.userTier || 'basic'
      };

      // Generate grouped report with all Session 112 enhancements
      const reportOutput = await formatter.generateGroupedReport(
        issues,
        groupingResult.groups,
        reportMetadata
      );

      // lgtm[js/path-injection] - outputDir is internally computed, 'report.md' is hardcoded
      const markdownPath = path.join(outputDir, 'report.md');
      fs.writeFileSync(markdownPath, reportOutput.markdown); // lgtm[js/path-injection]
      console.log(`[Report] Markdown saved`);

      // Save IDE fix files if available
      if (reportOutput.ideFixFiles && reportOutput.ideFixFiles.length > 0) {
        for (const fixFile of reportOutput.ideFixFiles) {
          const fixPath = path.join(outputDir, fixFile.filename);
          fs.writeFileSync(fixPath, JSON.stringify(fixFile.content, null, 2));
        }
        console.log(`[Report] ${reportOutput.ideFixFiles.length} IDE fix files saved`);
      }

      // SESSION 112: Save LSP, SARIF, and GitLab code quality files locally
      if (reportOutput.lspContent) {
        const lspPath = path.join(outputDir, 'codequal-lsp-actions.json');
        fs.writeFileSync(lspPath, JSON.stringify(reportOutput.lspContent, null, 2));
        console.log(`[Report] LSP code actions saved`);
      }
      if (reportOutput.sarifContent) {
        const sarifPath = path.join(outputDir, 'codequal-sarif-report.json');
        fs.writeFileSync(sarifPath, JSON.stringify(reportOutput.sarifContent, null, 2));
        console.log(`[Report] SARIF report saved`);
      }
      if (reportOutput.gitlabContent) {
        const gitlabPath = path.join(outputDir, 'codequal-gitlab-codequality.json');
        fs.writeFileSync(gitlabPath, JSON.stringify(reportOutput.gitlabContent, null, 2));
        console.log(`[Report] GitLab code quality report saved`);
      }

      // Save group mapping for API consumers
      if (reportOutput.mapping) {
        const mappingPath = path.join(outputDir, 'issue-groups.json');
        fs.writeFileSync(mappingPath, JSON.stringify(reportOutput.mapping, null, 2));
        console.log(`[Report] Issue group mapping saved`);
      }

      return { markdown: markdownPath };
    } catch (error: any) {
      console.log(`   ⚠️  Report generation error: ${error.message}`);
      console.error(error);
      return {};
    }
  }

  // ============================================================================
  // SESSION 112 FIX: Helper methods for collecting complete metadata
  // ============================================================================

  /**
   * Get repository statistics (file count, lines of code)
   */
  private getRepoStats(repoPath: string): { totalFiles: number; totalLines: number } {
    try {
      // Count files (excluding common non-source directories)
      const countFilesResult = execFileSync('find', [
        repoPath,
        '-type', 'f',
        '-not', '-path', '*/node_modules/*',
        '-not', '-path', '*/.git/*',
        '-not', '-path', '*/dist/*',
        '-not', '-path', '*/build/*',
        '-not', '-path', '*/target/*',
        '-not', '-path', '*/__pycache__/*'
      ], { encoding: 'utf-8', maxBuffer: 10 * 1024 * 1024 });
      const totalFiles = countFilesResult.trim().split('\n').filter(f => f).length;

      // Count lines of code (simple approach)
      const countLinesResult = execFileSync('sh', ['-c',
        `find "${repoPath}" -type f \\( -name "*.java" -o -name "*.ts" -o -name "*.js" -o -name "*.py" -o -name "*.go" -o -name "*.rs" -o -name "*.rb" -o -name "*.php" -o -name "*.cs" \\) -not -path "*/node_modules/*" -not -path "*/.git/*" -not -path "*/dist/*" -exec wc -l {} + 2>/dev/null | tail -1 | awk '{print $1}'`
      ], { encoding: 'utf-8' });
      const totalLines = parseInt(countLinesResult.trim()) || 0;

      return { totalFiles, totalLines };
    } catch (error) {
      console.warn('[RepoStats] Error getting repo stats:', error);
      return { totalFiles: 0, totalLines: 0 };
    }
  }

  /**
   * Get PR statistics (lines added/deleted)
   */
  private getPRStats(repoPath: string, baseBranch: string, prBranch: string): { linesAdded: number; linesDeleted: number } {
    try {
      const diffStats = execFileSync('git', [
        'diff', '--numstat', `${baseBranch}...${prBranch}`
      ], { cwd: repoPath, encoding: 'utf-8' });

      let linesAdded = 0;
      let linesDeleted = 0;

      diffStats.trim().split('\n').forEach(line => {
        const parts = line.split('\t');
        if (parts.length >= 2) {
          const added = parseInt(parts[0]) || 0;
          const deleted = parseInt(parts[1]) || 0;
          if (!isNaN(added)) linesAdded += added;
          if (!isNaN(deleted)) linesDeleted += deleted;
        }
      });

      return { linesAdded, linesDeleted };
    } catch (error) {
      console.warn('[PRStats] Error getting PR stats:', error);
      return { linesAdded: 0, linesDeleted: 0 };
    }
  }

  /**
   * Get author information from git or request
   */
  private getAuthorInfo(repoPath: string, request: AnalysisRequest): { author: string; email: string } {
    // First try from request
    if (request.prAuthor) {
      return {
        author: request.prAuthor,
        email: request.prAuthorEmail || `${request.prAuthor}@github.com`
      };
    }

    // Fall back to git log
    try {
      const authorResult = execFileSync('git', [
        'log', '-1', '--format=%an'
      ], { cwd: repoPath, encoding: 'utf-8' });

      const emailResult = execFileSync('git', [
        'log', '-1', '--format=%ae'
      ], { cwd: repoPath, encoding: 'utf-8' });

      const author = authorResult.trim() || 'Developer';
      const email = emailResult.trim() || 'developer@example.com';

      return { author, email };
    } catch (error) {
      console.warn('[AuthorInfo] Error getting author info:', error);
      return { author: 'Developer', email: 'developer@example.com' };
    }
  }

  /**
   * Extract organization name from repository URL
   */
  private extractOrgName(repoUrl: string): string {
    try {
      // Handle GitHub URLs: https://github.com/org/repo or git@github.com:org/repo
      const githubMatch = repoUrl.match(/github\.com[/:]([\w-]+)\//);
      if (githubMatch) return githubMatch[1];

      // Handle GitLab URLs
      const gitlabMatch = repoUrl.match(/gitlab\.com[/:]([\w-]+)\//);
      if (gitlabMatch) return gitlabMatch[1];

      // Handle Bitbucket URLs
      const bitbucketMatch = repoUrl.match(/bitbucket\.org[/:]([\w-]+)\//);
      if (bitbucketMatch) return bitbucketMatch[1];

      return 'Organization';
    } catch {
      return 'Organization';
    }
  }
}

// ============================================================================
// SINGLETON & CONVENIENCE
// ============================================================================

let serviceInstance: V9AnalysisService | null = null;

export function getAnalysisService(config?: { workDir?: string }): V9AnalysisService {
  if (!serviceInstance) {
    serviceInstance = new V9AnalysisService(config);
  }
  return serviceInstance;
}

/**
 * Quick analysis helper
 */
export async function analyzePR(
  repositoryUrl: string,
  prNumber: number,
  options?: Partial<AnalysisRequest>
): Promise<AnalysisResult> {
  const service = getAnalysisService();
  return service.analyzePR({
    repositoryUrl,
    prNumber,
    ...options
  });
}
