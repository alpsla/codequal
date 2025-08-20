/**
 * End-to-End Analysis Wrapper
 * 
 * Complete flow from PR URL to final analysis report.
 * Handles environment preparation, repository cloning, branch management,
 * analysis execution, and report generation - all from a single PR URL input.
 * 
 * Flow:
 * 1. Parse PR URL and extract context
 * 2. Prepare environment (clone repo, checkout branches)
 * 3. Extract PR metadata (files changed, commits, etc.)
 * 4. Run unified analysis on both branches
 * 5. Generate comparison report
 * 6. Clean up resources
 */

import { UnifiedAnalysisWrapper, UnifiedAnalysisResult } from './unified-analysis-wrapper';
import { ComparisonAgent } from '../comparison/comparison-agent';
import { ILogger } from './interfaces/logger.interface';
import { execSync, exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';
import axios from 'axios';

const execAsync = promisify(exec);

export interface PRContext {
  owner: string;
  repo: string;
  prNumber: number;
  prUrl: string;
  baseBranch: string;
  headBranch: string;
  title?: string;
  description?: string;
  author?: string;
  createdAt?: string;
  filesChanged?: number;
  additions?: number;
  deletions?: number;
  commits?: number;
}

export interface EnvironmentConfig {
  workDir?: string;
  useCache?: boolean;
  keepClone?: boolean;
  githubToken?: string;
  deepWikiUrl?: string;
  supabaseUrl?: string;
  supabaseKey?: string;
  redisUrl?: string;
}

export interface EndToEndResult {
  success: boolean;
  prContext: PRContext;
  mainAnalysis?: UnifiedAnalysisResult;
  prAnalysis?: UnifiedAnalysisResult;
  comparison?: {
    unchanged: number;
    resolved: number;
    new: number;
    score: number;
    decision: 'approved' | 'needs_work';
  };
  report?: {
    markdown: string;
    html?: string;
    prComment?: string;
  };
  metadata: {
    totalDuration: number;
    steps: StepResult[];
    repoPath?: string;
    errors: string[];
  };
}

export interface StepResult {
  name: string;
  status: 'success' | 'failed' | 'skipped';
  duration: number;
  details?: any;
  error?: string;
}

export class EndToEndAnalysisWrapper {
  private unifiedWrapper: UnifiedAnalysisWrapper;
  private comparisonAgent: ComparisonAgent;
  private logger?: ILogger;
  private config: EnvironmentConfig;
  private steps: StepResult[] = [];
  private errors: string[] = [];
  
  constructor(config?: EnvironmentConfig, logger?: ILogger) {
    this.config = config || {};
    this.logger = logger;
    this.unifiedWrapper = new UnifiedAnalysisWrapper(logger);
    this.comparisonAgent = new ComparisonAgent(logger);
    
    // Set environment variables if provided
    if (config?.deepWikiUrl) {
      process.env.DEEPWIKI_API_URL = config.deepWikiUrl;
    }
    if (config?.supabaseUrl) {
      process.env.SUPABASE_URL = config.supabaseUrl;
    }
    if (config?.supabaseKey) {
      process.env.SUPABASE_SERVICE_ROLE_KEY = config.supabaseKey;
    }
    if (config?.redisUrl) {
      process.env.REDIS_URL = config.redisUrl;
    }
  }
  
  /**
   * Main entry point - analyze a PR from just its URL
   */
  async analyzeFromPRUrl(prUrl: string): Promise<EndToEndResult> {
    const startTime = Date.now();
    this.steps = [];
    this.errors = [];
    
    this.log('info', `Starting end-to-end analysis for PR: ${prUrl}`);
    
    let prContext: PRContext | undefined;
    let repoPath: string | undefined;
    let mainAnalysis: UnifiedAnalysisResult | undefined;
    let prAnalysis: UnifiedAnalysisResult | undefined;
    
    try {
      // Step 1: Parse PR URL and extract context
      prContext = await this.extractPRContext(prUrl);
      
      // Step 2: Prepare environment
      repoPath = await this.prepareEnvironment(prContext);
      
      // Step 3: Fetch additional PR metadata
      await this.enrichPRContext(prContext);
      
      // Step 4: Analyze main branch
      mainAnalysis = await this.analyzeMainBranch(prContext);
      
      // Step 5: Analyze PR branch
      prAnalysis = await this.analyzePRBranch(prContext);
      
      // Step 6: Generate comparison
      const comparison = await this.generateComparison(
        prContext,
        mainAnalysis,
        prAnalysis
      );
      
      // Step 7: Generate reports
      const report = await this.generateReports(
        prContext,
        mainAnalysis,
        prAnalysis,
        comparison
      );
      
      // Step 8: Clean up (if configured)
      if (!this.config.keepClone && repoPath) {
        await this.cleanup(repoPath);
      }
      
      const totalDuration = Date.now() - startTime;
      
      return {
        success: true,
        prContext,
        mainAnalysis,
        prAnalysis,
        comparison,
        report,
        metadata: {
          totalDuration,
          steps: this.steps,
          repoPath: this.config.keepClone ? repoPath : undefined,
          errors: this.errors
        }
      };
      
    } catch (error) {
      const totalDuration = Date.now() - startTime;
      this.log('error', 'End-to-end analysis failed', { error });
      
      // Clean up on error
      if (repoPath && !this.config.keepClone) {
        try {
          await this.cleanup(repoPath);
        } catch (cleanupError) {
          this.log('warn', 'Cleanup failed after error', { cleanupError });
        }
      }
      
      return {
        success: false,
        prContext: prContext || this.parseBasicPRInfo(prUrl),
        metadata: {
          totalDuration,
          steps: this.steps,
          errors: [...this.errors, (error as Error).message]
        }
      };
    }
  }
  
  /**
   * Step 1: Extract PR context from URL
   */
  private async extractPRContext(prUrl: string): Promise<PRContext> {
    const stepStart = Date.now();
    
    try {
      this.log('info', 'Step 1: Extracting PR context from URL');
      
      // Parse GitHub PR URL
      const match = prUrl.match(/github\.com\/([^\/]+)\/([^\/]+)\/pull\/(\d+)/);
      if (!match) {
        throw new Error(`Invalid GitHub PR URL: ${prUrl}`);
      }
      
      const [, owner, repo, prNumber] = match;
      
      // Get PR info via GitHub API
      let baseBranch = 'main';
      let headBranch = `pr/${prNumber}`;
      let title = `PR #${prNumber}`;
      let author = 'unknown';
      
      if (this.config.githubToken) {
        try {
          const response = await axios.get(
            `https://api.github.com/repos/${owner}/${repo}/pulls/${prNumber}`,
            {
              headers: {
                'Authorization': `token ${this.config.githubToken}`,
                'Accept': 'application/vnd.github.v3+json'
              }
            }
          );
          
          baseBranch = response.data.base.ref;
          headBranch = response.data.head.ref;
          title = response.data.title;
          author = response.data.user.login;
          
          this.log('info', 'Retrieved PR details from GitHub API');
        } catch (apiError) {
          this.log('warn', 'Failed to get PR details from GitHub API, using defaults');
        }
      }
      
      const context: PRContext = {
        owner,
        repo,
        prNumber: parseInt(prNumber),
        prUrl,
        baseBranch,
        headBranch,
        title,
        author
      };
      
      this.steps.push({
        name: 'Extract PR Context',
        status: 'success',
        duration: Date.now() - stepStart,
        details: { owner, repo, prNumber, baseBranch, headBranch }
      });
      
      return context;
      
    } catch (error) {
      this.steps.push({
        name: 'Extract PR Context',
        status: 'failed',
        duration: Date.now() - stepStart,
        error: (error as Error).message
      });
      throw error;
    }
  }
  
  /**
   * Step 2: Prepare environment (clone repo, checkout branches)
   */
  private async prepareEnvironment(prContext: PRContext): Promise<string> {
    const stepStart = Date.now();
    
    try {
      this.log('info', 'Step 2: Preparing environment');
      
      const workDir = this.config.workDir || '/tmp/codequal-analysis';
      const repoPath = path.join(workDir, `${prContext.owner}-${prContext.repo}-pr-${prContext.prNumber}`);
      
      // Check if already cloned
      if (fs.existsSync(repoPath) && this.config.useCache) {
        this.log('info', 'Using cached repository clone');
        
        // Update the clone
        await execAsync(`cd "${repoPath}" && git fetch origin`);
      } else {
        // Remove old clone if exists
        if (fs.existsSync(repoPath)) {
          await execAsync(`rm -rf "${repoPath}"`);
        }
        
        // Clone repository
        this.log('info', 'Cloning repository...');
        const cloneUrl = `https://github.com/${prContext.owner}/${prContext.repo}.git`;
        
        await execAsync(
          `git clone --depth 50 "${cloneUrl}" "${repoPath}"`,
          { maxBuffer: 1024 * 1024 * 10 } // 10MB buffer
        );
      }
      
      // Fetch PR branch
      this.log('info', 'Fetching PR branch...');
      await execAsync(
        `cd "${repoPath}" && git fetch origin pull/${prContext.prNumber}/head:pr-${prContext.prNumber}`
      );
      
      // Checkout base branch
      await execAsync(`cd "${repoPath}" && git checkout ${prContext.baseBranch}`);
      
      this.steps.push({
        name: 'Prepare Environment',
        status: 'success',
        duration: Date.now() - stepStart,
        details: { repoPath, cached: fs.existsSync(repoPath) && this.config.useCache }
      });
      
      return repoPath;
      
    } catch (error) {
      this.steps.push({
        name: 'Prepare Environment',
        status: 'failed',
        duration: Date.now() - stepStart,
        error: (error as Error).message
      });
      throw error;
    }
  }
  
  /**
   * Step 3: Enrich PR context with additional metadata
   */
  private async enrichPRContext(prContext: PRContext): Promise<void> {
    const stepStart = Date.now();
    
    try {
      this.log('info', 'Step 3: Enriching PR context');
      
      if (this.config.githubToken) {
        // Get PR details
        const response = await axios.get(
          `https://api.github.com/repos/${prContext.owner}/${prContext.repo}/pulls/${prContext.prNumber}`,
          {
            headers: {
              'Authorization': `token ${this.config.githubToken}`,
              'Accept': 'application/vnd.github.v3+json'
            }
          }
        );
        
        prContext.description = response.data.body;
        prContext.createdAt = response.data.created_at;
        prContext.filesChanged = response.data.changed_files;
        prContext.additions = response.data.additions;
        prContext.deletions = response.data.deletions;
        prContext.commits = response.data.commits;
      } else {
        // Use git commands to get basic stats
        const repoPath = path.join(
          this.config.workDir || '/tmp/codequal-analysis',
          `${prContext.owner}-${prContext.repo}-pr-${prContext.prNumber}`
        );
        
        if (fs.existsSync(repoPath)) {
          try {
            const { stdout } = await execAsync(
              `cd "${repoPath}" && git diff --stat ${prContext.baseBranch}...pr-${prContext.prNumber}`
            );
            
            const lines = stdout.trim().split('\n');
            const lastLine = lines[lines.length - 1];
            const match = lastLine.match(/(\d+) files? changed/);
            
            if (match) {
              prContext.filesChanged = parseInt(match[1]);
            }
          } catch (gitError) {
            this.log('warn', 'Failed to get git stats', { gitError });
          }
        }
      }
      
      this.steps.push({
        name: 'Enrich PR Context',
        status: 'success',
        duration: Date.now() - stepStart,
        details: {
          filesChanged: prContext.filesChanged,
          additions: prContext.additions,
          deletions: prContext.deletions
        }
      });
      
    } catch (error) {
      this.steps.push({
        name: 'Enrich PR Context',
        status: 'failed',
        duration: Date.now() - stepStart,
        error: (error as Error).message
      });
      // Don't throw - this is optional enrichment
      this.errors.push(`Failed to enrich PR context: ${(error as Error).message}`);
    }
  }
  
  /**
   * Step 4: Analyze main branch
   */
  private async analyzeMainBranch(prContext: PRContext): Promise<UnifiedAnalysisResult> {
    const stepStart = Date.now();
    
    try {
      this.log('info', 'Step 4: Analyzing main branch');
      
      const repoUrl = `https://github.com/${prContext.owner}/${prContext.repo}`;
      
      const result = await this.unifiedWrapper.analyzeRepository(repoUrl, {
        branch: prContext.baseBranch,
        validateLocations: true,
        requireMinConfidence: 70,
        maxClarificationAttempts: 2,
        skipCache: !this.config.useCache
      });
      
      this.steps.push({
        name: 'Analyze Main Branch',
        status: 'success',
        duration: Date.now() - stepStart,
        details: {
          issues: result.validationStats.totalIssues,
          validLocations: result.validationStats.validLocations,
          score: result.analysis.scores.overall
        }
      });
      
      return result;
      
    } catch (error) {
      this.steps.push({
        name: 'Analyze Main Branch',
        status: 'failed',
        duration: Date.now() - stepStart,
        error: (error as Error).message
      });
      throw error;
    }
  }
  
  /**
   * Step 5: Analyze PR branch
   */
  private async analyzePRBranch(prContext: PRContext): Promise<UnifiedAnalysisResult> {
    const stepStart = Date.now();
    
    try {
      this.log('info', 'Step 5: Analyzing PR branch');
      
      const repoUrl = `https://github.com/${prContext.owner}/${prContext.repo}`;
      
      const result = await this.unifiedWrapper.analyzeRepository(repoUrl, {
        branch: `pr/${prContext.prNumber}`,
        prId: prContext.prNumber.toString(),
        validateLocations: true,
        requireMinConfidence: 70,
        maxClarificationAttempts: 2,
        skipCache: !this.config.useCache
      });
      
      this.steps.push({
        name: 'Analyze PR Branch',
        status: 'success',
        duration: Date.now() - stepStart,
        details: {
          issues: result.validationStats.totalIssues,
          validLocations: result.validationStats.validLocations,
          score: result.analysis.scores.overall
        }
      });
      
      return result;
      
    } catch (error) {
      this.steps.push({
        name: 'Analyze PR Branch',
        status: 'failed',
        duration: Date.now() - stepStart,
        error: (error as Error).message
      });
      throw error;
    }
  }
  
  /**
   * Step 6: Generate comparison
   */
  private async generateComparison(
    prContext: PRContext,
    mainAnalysis: UnifiedAnalysisResult,
    prAnalysis: UnifiedAnalysisResult
  ): Promise<EndToEndResult['comparison']> {
    const stepStart = Date.now();
    
    try {
      this.log('info', 'Step 6: Generating comparison');
      
      // Create fingerprints for matching
      const createFingerprint = (issue: any) => 
        `${issue.location.file}:${issue.location.line}:${issue.title}`;
      
      const mainFingerprints = new Set(
        mainAnalysis.analysis.issues.map(createFingerprint)
      );
      const prFingerprints = new Set(
        prAnalysis.analysis.issues.map(createFingerprint)
      );
      
      // Calculate differences
      const unchanged = [...mainFingerprints].filter(fp => prFingerprints.has(fp)).length;
      const resolved = [...mainFingerprints].filter(fp => !prFingerprints.has(fp)).length;
      const newIssues = [...prFingerprints].filter(fp => !mainFingerprints.has(fp)).length;
      
      // Calculate score and decision
      const score = prAnalysis.analysis.scores.overall;
      const decision: 'approved' | 'needs_work' = score >= 70 && newIssues <= 5 ? 'approved' : 'needs_work';
      
      const comparison = {
        unchanged,
        resolved,
        new: newIssues,
        score,
        decision
      };
      
      this.steps.push({
        name: 'Generate Comparison',
        status: 'success',
        duration: Date.now() - stepStart,
        details: comparison
      });
      
      return comparison;
      
    } catch (error) {
      this.steps.push({
        name: 'Generate Comparison',
        status: 'failed',
        duration: Date.now() - stepStart,
        error: (error as Error).message
      });
      throw error;
    }
  }
  
  /**
   * Step 7: Generate reports
   */
  private async generateReports(
    prContext: PRContext,
    mainAnalysis: UnifiedAnalysisResult,
    prAnalysis: UnifiedAnalysisResult,
    comparison: EndToEndResult['comparison']
  ): Promise<EndToEndResult['report']> {
    const stepStart = Date.now();
    
    try {
      this.log('info', 'Step 7: Generating reports');
      
      // Prepare comparison result for report generator
      const comparisonResult = {
        mainAnalysis: mainAnalysis.analysis,
        featureAnalysis: prAnalysis.analysis,
        newIssues: prAnalysis.analysis.issues.filter(issue =>
          !mainAnalysis.analysis.issues.some(mainIssue =>
            mainIssue.location.file === issue.location.file &&
            mainIssue.location.line === issue.location.line &&
            mainIssue.title === issue.title
          )
        ),
        resolvedIssues: mainAnalysis.analysis.issues.filter(issue =>
          !prAnalysis.analysis.issues.some(prIssue =>
            prIssue.location.file === issue.location.file &&
            prIssue.location.line === issue.location.line &&
            prIssue.title === issue.title
          )
        ),
        unchangedIssues: mainAnalysis.analysis.issues.filter(issue =>
          prAnalysis.analysis.issues.some(prIssue =>
            prIssue.location.file === issue.location.file &&
            prIssue.location.line === issue.location.line &&
            prIssue.title === issue.title
          )
        ),
        score: comparison!.score,
        decision: comparison!.decision,
        confidence: prAnalysis.validationStats.averageConfidence,
        prMetadata: {
          repository: `${prContext.owner}/${prContext.repo}`,
          prNumber: prContext.prNumber,
          prUrl: prContext.prUrl,
          title: prContext.title,
          author: prContext.author,
          baseBranch: prContext.baseBranch,
          headBranch: prContext.headBranch,
          filesChanged: prContext.filesChanged,
          additions: prContext.additions,
          deletions: prContext.deletions
        }
      };
      
      // Generate markdown report
      const markdown = await this.comparisonAgent.generateReport(comparisonResult as any);
      
      // Generate PR comment
      const prComment = this.generatePRComment(prContext, comparison!, prAnalysis);
      
      const report = {
        markdown,
        prComment
      };
      
      this.steps.push({
        name: 'Generate Reports',
        status: 'success',
        duration: Date.now() - stepStart,
        details: {
          markdownLength: markdown.length,
          prCommentLength: prComment.length
        }
      });
      
      return report;
      
    } catch (error) {
      this.steps.push({
        name: 'Generate Reports',
        status: 'failed',
        duration: Date.now() - stepStart,
        error: (error as Error).message
      });
      throw error;
    }
  }
  
  /**
   * Step 8: Clean up resources
   */
  private async cleanup(repoPath: string): Promise<void> {
    const stepStart = Date.now();
    
    try {
      this.log('info', 'Step 8: Cleaning up resources');
      
      if (fs.existsSync(repoPath)) {
        await execAsync(`rm -rf "${repoPath}"`);
      }
      
      this.steps.push({
        name: 'Cleanup',
        status: 'success',
        duration: Date.now() - stepStart
      });
      
    } catch (error) {
      this.steps.push({
        name: 'Cleanup',
        status: 'failed',
        duration: Date.now() - stepStart,
        error: (error as Error).message
      });
      // Don't throw - cleanup failure is not critical
      this.errors.push(`Cleanup failed: ${(error as Error).message}`);
    }
  }
  
  /**
   * Generate PR comment
   */
  private generatePRComment(
    prContext: PRContext,
    comparison: EndToEndResult['comparison'],
    prAnalysis: UnifiedAnalysisResult
  ): string {
    const icon = comparison.decision === 'approved' ? '✅' : '⚠️';
    const status = comparison.decision === 'approved' ? 'Approved' : 'Needs Work';
    
    let comment = `## ${icon} CodeQual Analysis: ${status}\n\n`;
    
    // Summary
    comment += `**Repository:** ${prContext.owner}/${prContext.repo}\n`;
    comment += `**PR:** #${prContext.prNumber} - ${prContext.title || 'Untitled'}\n`;
    comment += `**Author:** @${prContext.author || 'unknown'}\n\n`;
    
    // Scores
    comment += `### 📊 Quality Scores\n\n`;
    comment += `| Metric | Score |\n`;
    comment += `|--------|-------|\n`;
    comment += `| **Overall** | ${comparison.score}/100 |\n`;
    comment += `| Security | ${prAnalysis.analysis.scores.security}/100 |\n`;
    comment += `| Performance | ${prAnalysis.analysis.scores.performance}/100 |\n`;
    comment += `| Maintainability | ${prAnalysis.analysis.scores.maintainability}/100 |\n\n`;
    
    // Changes
    comment += `### 📈 Issue Changes\n\n`;
    comment += `| Type | Count | Description |\n`;
    comment += `|------|-------|-------------|\n`;
    comment += `| ✅ Resolved | ${comparison.resolved} | Issues fixed in this PR |\n`;
    comment += `| 🆕 New | ${comparison.new} | Issues introduced by this PR |\n`;
    comment += `| ↔️ Unchanged | ${comparison.unchanged} | Pre-existing issues |\n\n`;
    
    // Location validation
    const validationRate = Math.round(
      (prAnalysis.validationStats.validLocations / prAnalysis.validationStats.totalIssues) * 100
    );
    comment += `### 📍 Location Accuracy\n\n`;
    comment += `**${validationRate}%** of issue locations verified (${prAnalysis.validationStats.validLocations}/${prAnalysis.validationStats.totalIssues})\n`;
    
    if (prAnalysis.validationStats.clarifiedLocations > 0) {
      comment += `- ${prAnalysis.validationStats.clarifiedLocations} locations auto-corrected\n`;
    }
    comment += '\n';
    
    // Top issues
    if (comparison.new > 0) {
      comment += `### ⚠️ New Issues to Address\n\n`;
      
      const newIssues = prAnalysis.analysis.issues
        .filter(issue => issue.severity === 'critical' || issue.severity === 'high')
        .slice(0, 3);
      
      for (const issue of newIssues) {
        comment += `- **${issue.severity.toUpperCase()}:** ${issue.title}\n`;
        comment += `  📍 \`${issue.location.file}:${issue.location.line}\`\n`;
      }
      comment += '\n';
    }
    
    // Decision
    comment += `### 🎯 Decision\n\n`;
    if (comparison.decision === 'approved') {
      comment += `✅ **This PR is ready to merge** - Code quality meets standards.\n`;
    } else {
      comment += `⚠️ **This PR needs attention** - Please address the new issues before merging.\n`;
    }
    
    // Footer
    comment += `\n---\n`;
    comment += `*Analysis completed in ${Math.round(prAnalysis.metadata.duration / 1000)}s`;
    comment += ` • [View Full Report](${prContext.prUrl}#codequal-report)*\n`;
    
    return comment;
  }
  
  /**
   * Parse basic PR info from URL
   */
  private parseBasicPRInfo(prUrl: string): PRContext {
    const match = prUrl.match(/github\.com\/([^\/]+)\/([^\/]+)\/pull\/(\d+)/);
    
    if (match) {
      const [, owner, repo, prNumber] = match;
      return {
        owner,
        repo,
        prNumber: parseInt(prNumber),
        prUrl,
        baseBranch: 'main',
        headBranch: `pr/${prNumber}`
      };
    }
    
    return {
      owner: 'unknown',
      repo: 'unknown',
      prNumber: 0,
      prUrl,
      baseBranch: 'main',
      headBranch: 'unknown'
    };
  }
  
  /**
   * Log messages
   */
  private log(level: 'info' | 'warn' | 'error', message: string, data?: any) {
    const prefix = '[EndToEndWrapper]';
    
    if (this.logger) {
      this.logger[level](`${prefix} ${message}`, data);
    } else {
      const logMessage = data
        ? `${prefix} ${message} ${JSON.stringify(data)}`
        : `${prefix} ${message}`;
      
      if (level === 'error') {
        console.error(logMessage);
      } else if (level === 'warn') {
        console.warn(logMessage);
      } else {
        console.log(logMessage);
      }
    }
  }
  
  /**
   * Generate comprehensive execution report
   */
  async generateExecutionReport(result: EndToEndResult): Promise<string> {
    let report = '# End-to-End Analysis Execution Report\n\n';
    
    // Status
    const icon = result.success ? '✅' : '❌';
    report += `## ${icon} Status: ${result.success ? 'SUCCESS' : 'FAILED'}\n\n`;
    
    // PR Context
    report += '## Pull Request Context\n\n';
    report += `- **URL:** ${result.prContext.prUrl}\n`;
    report += `- **Repository:** ${result.prContext.owner}/${result.prContext.repo}\n`;
    report += `- **PR Number:** #${result.prContext.prNumber}\n`;
    report += `- **Title:** ${result.prContext.title || 'N/A'}\n`;
    report += `- **Author:** ${result.prContext.author || 'N/A'}\n`;
    report += `- **Base Branch:** ${result.prContext.baseBranch}\n`;
    report += `- **Head Branch:** ${result.prContext.headBranch}\n`;
    
    if (result.prContext.filesChanged) {
      report += `- **Files Changed:** ${result.prContext.filesChanged}\n`;
      report += `- **Lines Added:** +${result.prContext.additions || 0}\n`;
      report += `- **Lines Deleted:** -${result.prContext.deletions || 0}\n`;
    }
    report += '\n';
    
    // Execution Steps
    report += '## Execution Steps\n\n';
    report += '| Step | Status | Duration | Details |\n';
    report += '|------|--------|----------|---------|n';
    
    for (const step of result.metadata.steps) {
      const statusIcon = step.status === 'success' ? '✅' : 
                         step.status === 'failed' ? '❌' : '⏭️';
      const duration = `${step.duration}ms`;
      const details = step.details ? JSON.stringify(step.details).substring(0, 50) : '';
      
      report += `| ${step.name} | ${statusIcon} | ${duration} | ${details} |\n`;
    }
    report += '\n';
    
    // Analysis Results
    if (result.success && result.comparison) {
      report += '## Analysis Results\n\n';
      
      report += '### Main Branch\n';
      if (result.mainAnalysis) {
        report += `- Issues: ${result.mainAnalysis.validationStats.totalIssues}\n`;
        report += `- Valid Locations: ${result.mainAnalysis.validationStats.validLocations}\n`;
        report += `- Score: ${result.mainAnalysis.analysis.scores.overall}/100\n\n`;
      }
      
      report += '### PR Branch\n';
      if (result.prAnalysis) {
        report += `- Issues: ${result.prAnalysis.validationStats.totalIssues}\n`;
        report += `- Valid Locations: ${result.prAnalysis.validationStats.validLocations}\n`;
        report += `- Score: ${result.prAnalysis.analysis.scores.overall}/100\n\n`;
      }
      
      report += '### Comparison\n';
      report += `- Unchanged Issues: ${result.comparison.unchanged}\n`;
      report += `- Resolved Issues: ${result.comparison.resolved}\n`;
      report += `- New Issues: ${result.comparison.new}\n`;
      report += `- **Decision:** ${result.comparison.decision === 'approved' ? '✅ Approved' : '⚠️ Needs Work'}\n\n`;
    }
    
    // Errors
    if (result.metadata.errors.length > 0) {
      report += '## Errors\n\n';
      for (const error of result.metadata.errors) {
        report += `- ${error}\n`;
      }
      report += '\n';
    }
    
    // Performance
    report += '## Performance\n\n';
    report += `- **Total Duration:** ${Math.round(result.metadata.totalDuration / 1000)}s\n`;
    
    if (result.metadata.repoPath) {
      report += `- **Repository Path:** ${result.metadata.repoPath}\n`;
    }
    
    return report;
  }
}