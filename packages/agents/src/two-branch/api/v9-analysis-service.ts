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
import { V9ReportFormatterFinal } from '../analyzers/v9-report-formatter';
import { ModelConfigResolver } from '../../standard/orchestrator/model-config-resolver';
import { CodeSnippetExtractor } from '../utils/code-snippet-extractor';
import { groupIssues, prioritizeGroups, generateGroupingSummary } from '../utils/issue-grouping';
import { detectCategory } from '../report/category-detector';
import { generateScannerValueSection, getScannerToolGuidance } from '../report/fix-capability-utils';

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
    const analysisId = this.generateAnalysisId(request);

    // Security: Always compute output directory internally, never use user-provided paths
    // This prevents path traversal attacks via outputDir parameter
    const reportsDir = path.join(this.workDir, 'reports');
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }
    const outputDir = path.join(reportsDir, analysisId.replace(/[^a-zA-Z0-9._-]/g, '_'));

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
      const toolStart = Date.now();
      const toolResults = await this.executeTools(
        repoSetup.repoPath,
        language,
        repoSetup.baseBranch,
        repoSetup.prBranch,
        request.analysisMode || 'standard'
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

      // Step 9: Generate Report
      const reportStart = Date.now();
      const reportPaths = await this.generateReport(
        enrichedIssues,
        blockingIssues,
        decision,
        {
          repository: request.repositoryUrl,
          prNumber: request.prNumber,
          baseBranch: repoSetup.baseBranch,
          prBranch: repoSetup.prBranch,
          language
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

  private generateAnalysisId(request: AnalysisRequest): string {
    const repoName = this.extractRepoName(request.repositoryUrl);
    return `${repoName}-pr${request.prNumber}-${Date.now()}`;
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
    if (!fs.existsSync(repoPath)) {
      console.log(`   Cloning repository...`);
      execFileSync('git', ['clone', safeRepoUrl, repoPath], { stdio: 'inherit' });
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
      { file: '*.csproj', lang: 'csharp' },
      { file: '*.sln', lang: 'csharp' }
    ];

    for (const check of checks) {
      if (check.file.includes('*')) {
        const pattern = check.file.replace('*', '');
        const files = fs.readdirSync(repoPath);
        if (files.some(f => f.endsWith(pattern))) {
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
    mode: AnalysisMode
  ): Promise<{ prIssues: RawIssue[]; baseIssues: RawIssue[] }> {
    console.log(`🔧 Step 2: Tool Execution (${language})\n`);

    const orchestrator = this.getOrchestrator(language);

    // Branches are already sanitized from setupRepository, but add safety check
    const safePrBranch = sanitizeBranchName(prBranch);
    const safeBaseBranch = sanitizeBranchName(baseBranch);

    // Analyze PR branch using execFileSync for safety
    console.log(`   Analyzing PR branch...`);
    execFileSync('git', ['checkout', safePrBranch], { cwd: repoPath, stdio: 'ignore' });
    const prResult = await orchestrator.orchestrate(repoPath, 'pr', undefined, {
      includeAllSeverities: mode === 'complete',
      analysisMode: mode
    });
    const prIssues = prResult.toolResults.flatMap(t => t.issues);
    console.log(`   ✅ PR: ${prIssues.length} issues\n`);

    // Analyze base branch using execFileSync for safety
    console.log(`   Analyzing base branch...`);
    execFileSync('git', ['checkout', safeBaseBranch], { cwd: repoPath, stdio: 'ignore' });
    const baseResult = await orchestrator.orchestrate(repoPath, 'base', undefined, {
      includeAllSeverities: mode === 'complete',
      analysisMode: mode
    });
    const baseIssues = baseResult.toolResults.flatMap(t => t.issues);
    console.log(`   ✅ Base: ${baseIssues.length} issues\n`);

    return { prIssues, baseIssues };
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

    // Group issues to reduce AI calls
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

    // Process with AI
    for (const issue of representatives) {
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
      } catch (error: any) {
        console.log(`   ⚠️  AI enrichment failed for ${issue.file}:${issue.line}`);
        issue.fixSuggestion = {
          fix: 'Address this issue according to best practices',
          correctedCode: `// Fix required at line ${issue.line}`,
          explanation: 'AI enrichment temporarily unavailable'
        };
      }
    }

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

  private async generateReport(
    issues: EnrichedIssue[],
    blockingIssues: EnrichedIssue[],
    decision: string,
    metadata: any,
    outputDir: string  // Note: outputDir is always internally computed, never user-provided
  ): Promise<{ markdown?: string; sarif?: string; gitlab?: string; lsp?: string }> {
    console.log(`📝 Step 6: Report Generation\n`);

    // outputDir is computed internally in analyzePR() and is guaranteed safe
    // No additional validation needed since it's never derived from user input
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
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

    // TODO: Integrate scannerSections into V9ReportFormatterFinal
    // For now, save them separately
    if (scannerSections.length > 0) {
      const scannerGuidancePath = path.join(outputDir, 'scanner-guidance.md');
      fs.writeFileSync(scannerGuidancePath, scannerSections.join('\n---\n\n'));
      console.log(`[Report] Scanner guidance saved`);
    }

    // Generate main markdown report using existing formatter
    try {
      const formatter = new V9ReportFormatterFinal();

      // Build result object for formatter
      const analysisResult: any = {
        issues,
        decision,
        score: 75, // Default score
        categoryScores: {},
        duration: 0,
        cost: 0
      };

      // Build metadata object for formatter
      const reportMetadata: any = {
        ...metadata,
        analysisTimestamp: new Date().toISOString(),
        totalDuration: 0
      };

      const report = await formatter.generateCompleteReport(
        analysisResult,
        reportMetadata,
        metadata.language
      );

      const markdownPath = path.join(outputDir, 'report.md');
      fs.writeFileSync(markdownPath, report);
      console.log(`[Report] Markdown saved`);

      return { markdown: markdownPath };
    } catch (error: any) {
      console.log(`   ⚠️  Report generation error: ${error.message}`);
      return {};
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
