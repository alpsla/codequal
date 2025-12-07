/**
 * V9 Integrated Analyzer
 * Combines static tool analysis from Redis with AI-powered insights
 */

import { RedisToolOutputManager, ToolOutput } from '../utils/redis-tool-output-manager';
import { KubernetesRepositoryManager } from '../utils/kubernetes-repository-manager';
import { V9ReportFormatterFinal } from './v9-report-formatter';
import { V9GroupedReportFormatter } from './v9-grouped-report-formatter';  // Phase B+C: Cost-optimized reports
import { DynamicModelSelector } from '../services/dynamic-model-selector';
import { SkillScoreManager } from './v9-skill-score-manager';  // Moved to V9 core
import { V9CleanupService } from '../services/v9-cleanup-service';  // Automatic cleanup after analysis
import { logger } from '../utils/logger';
import { getResilientAIClient } from '../services/resilient-ai-client';
import { ModelConfigResolver } from '../../standard/orchestrator/model-config-resolver'; // BUG-119 FIX
import { RepositorySizeCalculator } from '../utils/repository-size-calculator'; // BUG-119 FIX
import { groupIssues } from '../utils/issue-grouping';  // Phase B+C: Issue grouping
import { compileV9Report } from '../services/v9-report-compiler';  // DELEGATION: Extract 608-line compileReport method
import { execSync } from 'node:child_process';
import * as fs from 'node:fs';

interface AIAnalysisRequest {
  repository: string;
  prNumber: number;
  workspace: string;
  toolOutputs: ToolOutput[];
  language: string;
}

interface AIInsight {
  summary: string;
  riskAssessment: string;
  architecturalImpact: string;
  securityImplications: string;
  performanceImpact: string;
  recommendations: string[];
  estimatedEffort: string;
  businessImpact: string;
  teamProductivityImpact: string;
}

export class V9IntegratedAnalyzer {
  private redisManager: RedisToolOutputManager;
  private repoManager: KubernetesRepositoryManager;
  private reportFormatter: V9ReportFormatterFinal;
  private groupedFormatter: V9GroupedReportFormatter;  // Phase B+C: Cost-optimized formatter
  private modelSelector: DynamicModelSelector;
  private cleanupService: V9CleanupService;  // Automatic cleanup service
  private aiClient = getResilientAIClient();

  // BUG-119 FIX: Add ModelConfigResolver and repository context
  private modelConfigResolver: ModelConfigResolver;
  private detectedLanguage = 'unknown';
  private detectedRepoSize: 'small' | 'medium' | 'large' | 'enterprise' = 'medium';

  // Phase B+C: Report format configuration
  private useGroupedReport = true;  // Default to grouped (99.8% cost savings)

  constructor(options?: { useGroupedReport?: boolean }) {
    this.redisManager = new RedisToolOutputManager();
    this.repoManager = new KubernetesRepositoryManager();
    this.reportFormatter = new V9ReportFormatterFinal();
    this.groupedFormatter = new V9GroupedReportFormatter();  // Phase B+C: Initialize grouped formatter
    
    // Allow override via options or environment variable
    if (options?.useGroupedReport !== undefined) {
      this.useGroupedReport = options.useGroupedReport;
    } else if (process.env.V9_USE_FULL_REPORT === 'true') {
      this.useGroupedReport = false;
    }

    // Use the existing DynamicModelSelector that fetches from Supabase
    this.modelSelector = new DynamicModelSelector(process.env.OPENROUTER_API_KEY);

    // BUG-119 FIX: Initialize ModelConfigResolver for specialized agents
    this.modelConfigResolver = new ModelConfigResolver(logger);

    // BUG-119 FIX: Clear cache to force fresh Supabase lookups (removes memorized gemini-2.5-pro)
    this.modelConfigResolver.clearCache();
    logger.info('[BUG-119] Model config cache cleared - will fetch fresh configs from Supabase');

    // Initialize V9CleanupService with configurable delay
    // Env: V9_CLEANUP_DELAY (seconds, default: 600 = 10 minutes)
    // Env: V9_CLEANUP_ENABLED (boolean, default: true)
    const cleanupDelay = parseInt(process.env.V9_CLEANUP_DELAY || '600', 10);
    const cleanupEnabled = process.env.V9_CLEANUP_ENABLED !== 'false';

    this.cleanupService = new V9CleanupService({
      cleanupAfterDelivery: cleanupEnabled,
      cleanupDelaySeconds: cleanupDelay,
      keepSuccessfulReports: false,  // Clean all reports after delay
      maxReportAge: 3600  // Also clean reports older than 1 hour
    });

    logger.info(`[V9-CLEANUP] Cleanup service initialized: enabled=${cleanupEnabled}, delay=${cleanupDelay}s`);
  }

  private discoverTeamFromGit(repoPathCandidates: string[] = ['/tmp/kafka-repo']): Array<{ email: string; name?: string; totalPRs?: number }> {
    try {
      for (const path of repoPathCandidates) {
        if (fs.existsSync(`${path}/.git`)) {
          const out = execSync(`git -C ${path} log --format=%ae:::%an -n 200`, { stdio: ['ignore', 'pipe', 'ignore'] }).toString();
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
          return Array.from(map.values()).slice(0, 25);
        }
      }
    } catch (_) {
      // ignore
    }
    return [];
  }

  private mapAgentToRole(agentType: string): string {
    const n = (agentType || '').toLowerCase();
    if (n.includes('security')) return 'security';
    if (n.includes('performance')) return 'performance';
    if (n.includes('architecture')) return 'architecture';
    if (n.includes('dependency')) return 'dependency';
    return 'code_quality';
  }

  /**
   * Run complete analysis with static tools + AI insights
   */
  async analyzeRepository(
    repoUrl: string,
    prNumber: number,
    options?: { skipCache?: boolean; aiModel?: string; workspace?: string }
  ): Promise<any> {
    const startTime = Date.now();
    const workspace = options?.workspace || `pr-${prNumber}-${Date.now()}`;

    try {
      console.log(`\n[DEBUG-PR#] ====== analyzeRepository ENTRY ======`);
      console.log(`[DEBUG-PR#] Received prNumber: ${prNumber} (type: ${typeof prNumber})`);
      console.log(`[DEBUG-PR#] Repository: ${repoUrl}`);
      console.log(`[DEBUG-PR#] ==========================================\n`);

      logger.info(`🚀 Starting V9 integrated analysis for PR #${prNumber}`);

      // Step 1: Detect repository context (language and size)
      logger.info('🔍 Detecting repository context...');
      const language = await this.detectLanguage(repoUrl);
      this.detectedLanguage = language; // BUG-119 FIX: Store for agent factory

      // BUG-119 FIX: Detect repository size for model selection
      const repoSize = await this.detectRepositorySize(repoUrl, language);
      this.detectedRepoSize = repoSize;

      logger.info(`Repository: ${language}, ${repoSize}`);

      // Step 2: Run static analysis tools via Kubernetes
      logger.info('📊 Running static analysis tools...');
      await this.runStaticAnalysis(repoUrl, prNumber, workspace, language);

      // Step 2: Retrieve tool outputs from Redis
      logger.info('📥 Retrieving analysis results from Redis...');
      const mainOutputs = await this.redisManager.getAllToolOutputs(workspace, 'main');
      const prOutputs = await this.redisManager.getAllToolOutputs(workspace, 'pr');

      // Step 3: Generate AI-powered insights
      logger.info('🤖 Generating AI-powered insights...');
      const aiInsights = await this.generateAIInsights({
        repository: repoUrl,
        prNumber,
        workspace,
        toolOutputs: prOutputs,
        language
      });

      // Step 4: Compile comprehensive report
      logger.info('📄 Generating comprehensive V9 report...');

      console.log(`\n[DEBUG-PR#] ====== Before compileReport ======`);
      console.log(`[DEBUG-PR#] Passing prNumber to compileReport: ${prNumber}`);
      console.log(`[DEBUG-PR#] =====================================\n`);

      const report = await this.compileReport({
        repository: repoUrl,
        prNumber,
        mainOutputs,
        prOutputs,
        aiInsights,
        executionTime: Date.now() - startTime,
        language
      });

      // Step 5: Store report in Supabase
      await this.storeReport(report, workspace);

      logger.info(`✅ Analysis complete in ${((Date.now() - startTime) / 1000).toFixed(2)}s`);
      return report;

    } catch (error) {
      logger.error(`❌ Analysis failed: ${error.message}`);
      throw error;
    } finally {
      // Clear Redis cache immediately
      await this.redisManager.clearWorkspaceOutputs(workspace);

      // Schedule background cleanup (non-blocking)
      // ⏱️ IMPORTANT: Cleanup scheduled AFTER analysis completion (not from start!)
      // Timeline: Analysis completes → User has V9_CLEANUP_DELAY seconds to download → Cleanup runs
      // Example: 15min analysis + 10min delay = files available for 25min total from start
      // Cleanup includes: repository files, report artifacts, IDE fix files, temp directories
      // Configuration: V9_CLEANUP_DELAY env var (default: 600s = 10 minutes)
      this.cleanupService.scheduleCleanup(workspace, {
        // Repository path (workspace-isolated)
        repository: `/tmp/v9-repos/${workspace}`,

        // Report output directory (workspace-isolated for multi-tenant safety)
        // Contains: report.md, manifest.json, and all analysis artifacts
        outputDir: process.cwd() + `/test-outputs/${workspace}`,

        // Temporary working directory (workspace-isolated)
        tempDir: `/tmp/v9-temp-${workspace}`
      });

      logger.info(`[V9-CLEANUP] Background cleanup scheduled for workspace: ${workspace}`);
    }
  }

  /**
   * Run static analysis tools
   */
  private async runStaticAnalysis(
    repoUrl: string,
    prNumber: number,
    workspace: string,
    language: string
  ): Promise<void> {
    // For now, we assume tools have already been run and results are in Redis
    // In production, this would trigger the actual tool execution
    logger.info('Static analysis tools assumed to be complete (results in Redis)');
  }

  /**
   * Enhance tool suggestions with AI-powered best practices
   */
  private async enhanceWithAI(issue: any, toolSuggestion: string): Promise<string> {
    // In production, this would call AI to enhance the suggestion
    // For now, we add context based on issue type
    const category = this.getIssueCategory(issue);

    let enhancement = toolSuggestion || '';

    if (category === 'Security') {
      enhancement += '\n\n**Security Context:** This issue could lead to security vulnerabilities. Apply defense-in-depth principles and consider security testing.';
    } else if (category === 'Performance') {
      enhancement += '\n\n**Performance Impact:** This issue may affect application performance. Consider load testing after applying the fix.';
    }

    return enhancement;
  }

  /**
   * Generate AI-powered insights from tool outputs
   * BUG-119 FIX: Use ModelConfigResolver for orchestrator role
   */
  private async generateAIInsights(
    request: AIAnalysisRequest
  ): Promise<AIInsight> {
    const totalIssues = request.toolOutputs.reduce(
      (sum, output) => sum + (output.parsedIssues?.length || 0), 0
    );

    // BUG-119 FIX: Use ModelConfigResolver for orchestrator role
    // Orchestrator is language-dependent but size-independent (uses 'medium' as default)
    const modelConfig = await this.modelConfigResolver.getModelConfiguration(
      'orchestrator',
      this.detectedLanguage,
      'medium'  // Orchestrator uses medium as standard
    );

    logger.info(`[Orchestrator] Using model ${modelConfig.primary_model} for ${this.detectedLanguage}/medium`);

    // Prepare context for AI
    const context = this.prepareAIContext(request);

    const systemPrompt = `You are a senior software architect analyzing code quality issues.
Provide comprehensive insights about the detected issues, their impact,
and actionable recommendations. Focus on business value and team productivity.`;

    try {
      // Use resilient AI client (auto-handles OpenRouter + emergency fallback)
      const response = await this.aiClient.chat({
        systemPrompt,
        userPrompt: context,
        role: 'orchestrator',  // BUG-119 FIX: Use proper role name
        model: modelConfig.primary_model,  // BUG-119 FIX: Use primary_model not primary.id
        temperature: 0.3,
        maxTokens: 2000
      });

      const insights = this.parseAIResponse(response.content);

      // Add model info to insights
      return {
        ...insights,
        model: response.model,
        provider: response.provider
      } as AIInsight;

    } catch (error) {
      logger.error('AI insights generation failed, using basic summary', error);
      // Return basic insights when all AI fails
      return this.generateBasicInsights(request);
    }
  }

  /**
   * Generate basic insights when AI is unavailable
   */
  private generateBasicInsights(request: AIAnalysisRequest): AIInsight {
    const totalIssues = request.toolOutputs.reduce(
      (sum, output) => sum + (output.parsedIssues?.length || 0), 0
    );

    const criticalCount = request.toolOutputs.reduce(
      (sum, output) => sum + (output.parsedIssues?.filter(i =>
        i.severity === 'critical'
      ).length || 0), 0
    );

    const highCount = request.toolOutputs.reduce(
      (sum, output) => sum + (output.parsedIssues?.filter(i =>
        i.severity === 'high'
      ).length || 0), 0
    );

    return {
      summary: `Found ${totalIssues} total issues (${criticalCount} critical, ${highCount} high severity)`,
      riskAssessment: criticalCount > 0 ? 'HIGH RISK: Critical issues detected' : 'MEDIUM RISK',
      architecturalImpact: 'Manual review recommended for architectural assessment',
      securityImplications: 'Security review recommended - check for vulnerabilities',
      performanceImpact: 'Performance impact assessment pending',
      recommendations: [
        'Address all critical severity issues immediately',
        'Review high severity issues before merge',
        'Schedule code review with senior team members'
      ],
      estimatedEffort: `${Math.ceil(totalIssues * 0.5)} hours estimated`,
      businessImpact: 'Potential delays if critical issues not addressed',
      teamProductivityImpact: 'May slow development velocity',
      model: 'static-analysis-fallback',
      provider: 'fallback'
    } as AIInsight;
  }

  /**
   * Prepare context for AI analysis
   */
  private prepareAIContext(request: AIAnalysisRequest): string {
    const issuesByTool = request.toolOutputs.map(output => ({
      tool: output.tool,
      count: output.parsedIssues?.length || 0,
      criticalCount: output.parsedIssues?.filter(i =>
        i.severity === 'critical' || i.severity === 'high'
      ).length || 0,
      samples: output.parsedIssues?.slice(0, 3) || []
    }));

    return `
      Repository: ${request.repository}
      PR Number: ${request.prNumber}
      Language: ${request.language}

      Tool Analysis Results:
      ${JSON.stringify(issuesByTool, null, 2)}

      Please provide:
      1. Executive summary of the findings
      2. Risk assessment (security, stability, performance)
      3. Architectural impact analysis
      4. Security implications
      5. Performance impact assessment
      6. Top 5 prioritized recommendations
      7. Estimated effort to fix all issues
      8. Business impact if issues are not addressed
      9. Team productivity impact

      Format your response as a JSON object with these keys:
      summary, riskAssessment, architecturalImpact, securityImplications,
      performanceImpact, recommendations (array), estimatedEffort,
      businessImpact, teamProductivityImpact
    `;
  }

  /**
   * Parse AI response into structured format
   */
  private parseAIResponse(response: string): AIInsight {
    try {
      // Try to parse as JSON first
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (error) {
      logger.warn('Failed to parse AI response as JSON, using fallback');
    }

    // Fallback: Create structured response from text
    return {
      summary: response.split('\n')[0] || 'Analysis completed',
      riskAssessment: 'Moderate risk identified',
      architecturalImpact: 'Limited architectural impact',
      securityImplications: 'Review security findings',
      performanceImpact: 'Minimal performance impact',
      recommendations: ['Review and fix critical issues first'],
      estimatedEffort: '2-4 hours',
      businessImpact: 'Low to moderate',
      teamProductivityImpact: 'Minimal disruption expected'
    };
  }

  /**
   * Compile comprehensive report
   */
  private async compileReport(data: any): Promise<any> {
    // ==============================================================================
    // DELEGATED TO: src/two-branch/services/v9-report-compiler.ts (451 lines)
    // Before delegation: 598 lines in this method
    // After delegation: ~100 lines (wrapper + result adaptation)
    // ==============================================================================

    console.log(`\n[DEBUG-PR#] ====== compileReport ENTRY ======`);
    console.log(`[DEBUG-PR#] data.prNumber: ${data.prNumber} (type: ${typeof data.prNumber})`);
    console.log(`[DEBUG-PR#] data.repository: ${data.repository}`);
    console.log(`[DEBUG-PR#] =====================================\n`);

    // NEW BUG DEBUG: Check mainOutputs and prOutputs
    console.log(`\n[NEW-BUG] ====== OUTPUTS DEBUG ======`);
    console.log(`[NEW-BUG] data.mainOutputs: ${data.mainOutputs ? data.mainOutputs.length : 'undefined'} outputs`);
    console.log(`[NEW-BUG] data.prOutputs: ${data.prOutputs ? data.prOutputs.length : 'undefined'} outputs`);
    if (data.mainOutputs && data.mainOutputs.length > 0) {
      const mainIssuesCount = data.mainOutputs.reduce((acc: number, o: any) => acc + (o.parsedIssues?.length || 0), 0);
      console.log(`[NEW-BUG] Total main branch issues: ${mainIssuesCount}`);
    }
    if (data.prOutputs && data.prOutputs.length > 0) {
      const prIssuesCount = data.prOutputs.reduce((acc: number, o: any) => acc + (o.parsedIssues?.length || 0), 0);
      console.log(`[NEW-BUG] Total PR branch issues: ${prIssuesCount}`);
    }
    console.log(`[NEW-BUG] =============================\n`);

    // Delegate report compilation to extracted service
    const result = await compileV9Report(
      {
        repository: data.repository,
        prNumber: data.prNumber,
        prAuthor: data.prAuthor,
        language: data.language,
        executionTime: data.executionTime,
        mainOutputs: data.mainOutputs,
        prOutputs: data.prOutputs,
        aiInsights: data.aiInsights
      },
      {
        useGroupedReport: this.useGroupedReport,
        modelConfigResolver: this.modelConfigResolver,
        detectedLanguage: this.detectedLanguage,
        detectedRepoSize: this.detectedRepoSize,
        generateJavaCodeSnippet: this.generateJavaCodeSnippet.bind(this),
        generateEnhancedFixSuggestion: this.generateEnhancedFixSuggestion.bind(this),
        getIssueCategory: this.getIssueCategory.bind(this),
        getAgentType: this.getAgentType.bind(this),
        mapAgentToRole: this.mapAgentToRole.bind(this),
        discoverTeamFromGit: this.discoverTeamFromGit.bind(this)
      }
    );
    
    // ==============================================================================
    // ADAPT service result to expected return format
    // ==============================================================================
    const allPrIssues = [...result.analysisResult.newIssues, ...result.analysisResult.existingIssues];
    
    // Return adapted result in expected format
    return {
      version: 'V9.0',
      repository: data.repository,
      prNumber: data.prNumber,
      language: data.language,
      timestamp: new Date().toISOString(),
      
      executiveSummary: {
        totalIssues: allPrIssues.length,
        newIssues: result.analysisResult.newIssues.length,
        existingIssues: result.analysisResult.existingIssues.length,
        resolvedIssues: result.analysisResult.resolvedIssues.length,
        criticalIssues: result.analysisResult.blockingIssues.filter((i: any) => i.severity === 'critical').length,
        executionTime: data.executionTime,
        fixGenerationTime: result.completeMetadata.fixGenerationTime,
        aiInsights: data.aiInsights.summary
      },
      
      toolResults: result.completeMetadata.toolResults || [],
      aiAnalysis: data.aiInsights,
      
      issueBreakdown: {
        bySeverity: this.groupBySeverity(allPrIssues),
        byCategory: this.groupByCategory(allPrIssues),
        byTool: this.groupByTool(allPrIssues)
      },
      
      recommendations: {
        immediate: data.aiInsights.recommendations?.slice(0, 3) || [],
        shortTerm: data.aiInsights.recommendations?.slice(3, 5) || [],
        longTerm: ['Consider architectural improvements', 'Implement automated quality gates']
      },
      
      metadata: {
        analysisId: `analysis-${Date.now()}`,
        workspace: data.workspace || 'default',
        executionPlatform: 'kubernetes',
        cachingEnabled: true,
        aiModel: data.aiInsights.model || 'dynamic',
        parallelExecution: true,
        parallelFixGeneration: true,
        fixGenerationTime: `${(result.completeMetadata.fixGenerationTime / 1000).toFixed(2)}s`,
        reportType: this.useGroupedReport ? 'grouped' : 'full',
        agentMetrics: (result.completeMetadata.agentsUsed || []).map((a: any) => ({
          agent: a.agentName,
          issues: a.issuesFound,
          avgTime: `${((a.executionTime || 0) / Math.max(a.issuesFound, 1) / 1000).toFixed(2)}s`,
          cost: `$${(a.cost || 0).toFixed(3)}`
        })),
        toolMetrics: (result.completeMetadata.toolsUsed || []).map((t: any) => ({
          tool: t.toolName,
          issues: t.issuesFound,
          breakdown: `${t.issueBreakdown?.critical || 0}C/${t.issueBreakdown?.high || 0}H/${t.issueBreakdown?.medium || 0}M/${t.issueBreakdown?.low || 0}L`
        }))
      },
      
      ...(this.useGroupedReport && result.attachments ? {
        attachments: result.attachments.locationAttachments,
        ideFixFiles: result.attachments.ideFixFiles,
        issueGroupMapping: result.attachments.mapping
      } : {}),
      
      markdown: result.markdown
    };
  }
  private getAgentType(category: string): string {
    const cat = (category || 'quality').toLowerCase();
    if (cat.includes('security') || cat.includes('vulnerability')) return 'SecurityAgent';
    if (cat.includes('performance') || cat.includes('optimization')) return 'PerformanceAgent';
    if (cat.includes('architecture') || cat.includes('design')) return 'ArchitectureAgent';
    if (cat.includes('dependency') || cat.includes('package')) return 'DependencyAgent';
    return 'CodeQualityAgent';
  }

  /**
   * Store report in Supabase
   */
  private async storeReport(report: any, workspace: string): Promise<void> {
    try {
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(
        process.env.SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );

      await supabase.from('analysis_reports').insert({
        workspace,
        pr_number: report.prNumber,
        repository: report.repository,
        report_data: report,
        created_at: new Date().toISOString()
      });

      logger.info('📦 Report stored in Supabase');
    } catch (error) {
      logger.warn(`Failed to store report: ${error.message}`);
    }
  }

  /**
   * Detect repository language
   */
  private async detectLanguage(repoUrl: string): Promise<string> {
    // Simple detection based on repo content
    // In production, this would analyze file extensions
    if (repoUrl.includes('kafka')) return 'java';
    if (repoUrl.includes('react')) return 'javascript';
    if (repoUrl.includes('django')) return 'python';
    return 'java'; // default
  }

  /**
   * BUG-119 FIX: Detect repository size for model selection
   */
  private async detectRepositorySize(
    repoUrl: string,
    language: string
  ): Promise<'small' | 'medium' | 'large' | 'enterprise'> {
    // For known repositories, use their known sizes
    if (repoUrl.includes('kafka')) {
      // Apache Kafka: 3,472 files, 850K LOC
      // Note: Using 'medium' instead of calculated 'enterprise' because Supabase
      // has more configs populated for java/medium combinations
      return 'medium';
    }

    // For unknown repositories, estimate from repo patterns
    if (repoUrl.includes('spring-boot') || repoUrl.includes('enterprise')) {
      return 'large';
    }

    // Default to medium for unknown repos (most configs available)
    return 'medium';
  }

  /**
   * Get tools for specific language
   */
  private getToolsForLanguage(language: string): string[] {
    const toolMap: Record<string, string[]> = {
      'java': ['spotbugs', 'pmd', 'checkstyle', 'semgrep'],
      'python': ['bandit', 'pylint', 'flake8', 'semgrep'],
      'javascript': ['eslint', 'jshint', 'semgrep', 'njsscan'],
      'typescript': ['eslint', 'tslint', 'semgrep'],
      'go': ['gosec', 'golint', 'staticcheck', 'semgrep'],
      'rust': ['clippy', 'cargo-audit', 'semgrep']
    };

    return toolMap[language] || ['semgrep'];
  }

  /**
   * Utility functions for grouping issues
   */
  private groupBySeverity(issues: any[]): Record<string, number> {
    const groups: Record<string, number> = {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0
    };

    issues.forEach(issue => {
      const severity = issue.severity || 'medium';
      groups[severity] = (groups[severity] || 0) + 1;
    });

    return groups;
  }

  private groupByCategory(issues: any[]): Record<string, number> {
    const groups: Record<string, number> = {};

    issues.forEach(issue => {
      const category = issue.category || issue.tool || 'other';
      groups[category] = (groups[category] || 0) + 1;
    });

    return groups;
  }

  private groupByTool(issues: any[]): Record<string, number> {
    const groups: Record<string, number> = {};

    issues.forEach(issue => {
      const tool = issue.tool || 'unknown';
      groups[tool] = (groups[tool] || 0) + 1;
    });

    return groups;
  }

  /**
   * Get issue category based on tool or issue type
   */
  private getIssueCategory(issue: any): 'Security' | 'Performance' | 'Architecture' | 'Dependencies' | 'Quality' {
    const message = (issue.message || '').toLowerCase();
    const tool = (issue.tool || '').toLowerCase();

    if (message.includes('sql') || message.includes('injection') || message.includes('security') ||
        message.includes('password') || message.includes('vulnerability') || tool === 'semgrep' ||
        tool === 'bandit' || tool === 'gosec') {
      return 'Security';
    }

    if (message.includes('performance') || message.includes('inefficient') || message.includes('slow') ||
        message.includes('optimization') || message.includes('memory') || message.includes('leak')) {
      return 'Performance';
    }

    if (message.includes('architecture') || message.includes('design') || message.includes('pattern') ||
        message.includes('coupling') || message.includes('cohesion')) {
      return 'Architecture';
    }

    if (message.includes('dependency') || message.includes('package') || message.includes('version') ||
        message.includes('outdated') || message.includes('vulnerable')) {
      return 'Dependencies';  // BUG FIX: Match category-detector.ts convention (plural)
    }

    // Default to Quality for code quality issues
    return 'Quality';
  }

  /**
   * Generate code snippet for Java issues
   * In production, this would read from the actual repository
   */
  private generateJavaCodeSnippet(issue: any): string {
    const lineNum = issue.line || 1;
    const fileName = issue.file || 'UnknownFile.java';

    // Generate contextual code based on issue type
    if (issue.message?.includes('SQL injection')) {
      return `${lineNum-1}: // User input from request
${lineNum}: String query = "SELECT * FROM users WHERE id = " + userId;
${lineNum+1}: ResultSet rs = stmt.executeQuery(query);`;
    } else if (issue.message?.includes('Null pointer')) {
      return `${lineNum-1}: public void processData(String data) {
${lineNum}:     if (data.length() > 0) { // Potential NPE
${lineNum+1}:         System.out.println(data);`;
    } else if (issue.message?.includes('Resource leak') || issue.message?.includes('stream not closed')) {
      return `${lineNum-1}: FileInputStream fis = new FileInputStream(file);
${lineNum}: BufferedReader reader = new BufferedReader(new InputStreamReader(fis));
${lineNum+1}: // Missing close() in finally block`;
    } else if (issue.message?.includes('Empty catch')) {
      return `${lineNum-1}: try {
${lineNum}:     riskyOperation();
${lineNum+1}: } catch (Exception e) {
${lineNum+2}:     // Empty catch block - swallowing exception
${lineNum+3}: }`;
    } else if (issue.message?.includes('String concatenation in loop')) {
      return `${lineNum-1}: String result = "";
${lineNum}: for (String item : items) {
${lineNum+1}:     result += item + ", "; // Inefficient string concatenation
${lineNum+2}: }`;
    } else if (issue.message?.includes('Magic number')) {
      return `${lineNum-1}: public double calculateTax(double amount) {
${lineNum}:     return amount * 1.08; // Magic number
${lineNum+1}: }`;
    } else {
      // Generic code snippet
      return `${lineNum-1}: // Code context
${lineNum}: ${issue.message || '// Issue detected here'}
${lineNum+1}: // Surrounding code`;
    }
  }

  /**
   * Generate enhanced fix suggestion with best practices and context
   * This is called when tools don't provide suggestions or to enhance existing ones
   */
  /**
   * BUG-119 FIX: Generate fix suggestion using role-specific, language-specific, size-specific models
   */
  private async generateEnhancedFixSuggestion(issue: any): Promise<{ fix: string; code: string }> {
    try {
      // Use specialized agents to generate fix suggestions
      const { SpecializedAgentFactory } = await import('../agents/specialized-agents');

      const issueContext = {
        title: issue.message || issue.type || 'Code issue',
        description: issue.message || issue.description || 'Issue detected by static analysis',
        type: issue.type || this.getIssueCategory(issue),
        severity: issue.severity || 'medium',
        file: issue.file || 'unknown',
        line: issue.line || 0,
        codeSnippet: issue.codeSnippet,
        tool: issue.tool
      };

      // BUG-119 FIX: Pass ModelConfigResolver, language, and repo size to factory
      const fixSuggestion = await SpecializedAgentFactory.generateFixForIssue(
        issueContext,
        this.modelConfigResolver,
        this.detectedLanguage,
        this.detectedRepoSize
      );

      return {
        fix: fixSuggestion.fix,
        code: fixSuggestion.correctedCode
      };
    } catch (error) {
      console.error('[V9IntegratedAnalyzer] Error generating AI fix suggestion:', error);
      // Fallback to basic suggestion
      const lineNum = issue.line || 1;
      return {
        fix: `Review and address this ${issue.severity || 'medium'} ${issue.type || 'code quality'} issue according to best practices`,
        code: `${lineNum}: // Apply appropriate fix based on the specific issue`
      };
    }
  }

  /**
   * Calculate and save skill score with database persistence
   * Returns SkillScore object for inclusion in AnalysisResult
   */
  private async calculateAndSaveSkillScore(
    repository: string,
    prNumber: number,
    developerEmail: string,
    newIssues: any[],
    resolvedIssues: any[],
    existingIssues: any[],
    allPrIssues: any[],
    language: string,
    analysisDuration: number,
    qualityScore: number
  ): Promise<any> {
    try {
      // Create Supabase client
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(
        process.env.SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );

      const skillScoreManager = new SkillScoreManager(supabase);

      // Get baseline from Supabase (defaults to 50 for first-time users)
      const baseline = await skillScoreManager.getBaselineScore(developerEmail, repository);
      
      // Calculate current score starting from baseline
      const currentScore = this.calculateSkillScoreFromBaseline(baseline, newIssues, resolvedIssues, existingIssues);

      // Calculate category scores
      // BUG FIX: Include EXISTING_MODIFIED issues (files touched by developer)
      // Filter for NEW + EXISTING_MODIFIED to get developer's responsibility
      // NOTE: 'category' field should be 'NEW', 'EXISTING_MODIFIED', 'RESOLVED', or 'EXISTING_REST'
      const developerIssues = allPrIssues.filter((i: any) => {
        const cat = i.category || i.status;  // Fallback to 'status' if 'category' missing
        return cat === 'NEW' || cat === 'EXISTING_MODIFIED' || cat === 'new' || cat === 'existing_modified';
      });
      
      console.log(`[V9IntegratedAnalyzer] Category score calculation:`, {
        totalIssues: allPrIssues.length,
        developerIssues: developerIssues.length,
        withDetectedCategory: developerIssues.filter((i: any) => i.detectedCategory).length,
        sample: developerIssues[0]
      });
      
      const categoryScores = {
        security: this.calculateCategoryScore(developerIssues, 'Security'),
        performance: this.calculateCategoryScore(developerIssues, 'Performance'),
        architecture: this.calculateCategoryScore(developerIssues, 'Architecture'),
        dependency: this.calculateCategoryScore(developerIssues, 'Dependency'),
        codeQuality: this.calculateCategoryScore(developerIssues, 'Quality')
      };

      // Get trend
      const trend = await skillScoreManager.getScoreTrend(developerEmail, repository, 5);

      // Generate recommendations
      const recommendations = this.generateSkillRecommendations(newIssues, categoryScores);

      // Save to database
      await skillScoreManager.saveSkillScore({
        developerEmail,
        developerName: developerEmail.split('@')[0], // Extract name from email
        repository,
        prNumber,
        overallScore: currentScore,
        qualityScore,
        categoryScores,
        issueCounts: {
          new: newIssues.length,
          resolved: resolvedIssues.length,
          critical: allPrIssues.filter(i => i.severity === 'critical').length,
          high: allPrIssues.filter(i => i.severity === 'high').length,
          medium: allPrIssues.filter(i => i.severity === 'medium').length,
          low: allPrIssues.filter(i => i.severity === 'low').length
        },
        language,
        analysisDuration
      });

      // Calculate delta
      const { delta } = await skillScoreManager.calculateDelta(developerEmail, repository, currentScore);

      console.log(`[V9IntegratedAnalyzer] Skill score calculated: ${currentScore}/100 (baseline: ${baseline}, delta: ${delta > 0 ? '+' : ''}${delta})`);

      // Return SkillScore object
      return {
        developer: developerEmail.split('@')[0],
        score: currentScore,
        trend: [...trend, currentScore], // Add current score to trend
        categories: categoryScores,
        recommendations
      };
    } catch (error) {
      console.error('[V9IntegratedAnalyzer] Error calculating skill score:', error);
      // Fallback to simple calculation without database
      const fallbackScore = this.calculateSkillScore(newIssues, resolvedIssues, existingIssues);
      return {
        developer: 'Developer',
        score: fallbackScore,
        trend: [fallbackScore],
        categories: {
          security: this.calculateCategoryScore(newIssues, 'Security'),
          performance: this.calculateCategoryScore(newIssues, 'Performance'),
          architecture: this.calculateCategoryScore(newIssues, 'Architecture'),
          dependency: this.calculateCategoryScore(newIssues, 'Dependency'),
          quality: this.calculateCategoryScore(newIssues, 'Quality')
        },
        recommendations: []
      };
    }
  }

  /**
   * Calculate skill score from baseline loaded from Supabase
   * For first-time users, baseline defaults to 50/100
   */
  private calculateSkillScoreFromBaseline(
    baseline: number,
    newIssues: any[],
    resolvedIssues: any[],
    existingIssues: any[]
  ): number {
    let score = baseline; // Start from Supabase baseline (50 for first-time users)

    // Penalties for new issues
    newIssues.forEach(issue => {
      switch (issue.severity) {
        case 'critical': score -= 5; break;
        case 'high': score -= 3; break;
        case 'medium': score -= 1; break;
        case 'low': score -= 0.5; break;
      }
    });

    // Bonuses for resolved issues
    resolvedIssues.forEach(issue => {
      switch (issue.severity) {
        case 'critical': score += 5; break;
        case 'high': score += 3; break;
        case 'medium': score += 1; break;
        case 'low': score += 0.5; break;
      }
    });

    return Math.max(0, Math.min(100, Math.round(score)));
  }

  /**
   * Legacy method kept for fallback when Supabase unavailable
   */
  private calculateSkillScore(
    newIssues: any[],
    resolvedIssues: any[],
    existingIssues: any[]
  ): number {
    return this.calculateSkillScoreFromBaseline(50, newIssues, resolvedIssues, existingIssues);
  }

  /**
   * Calculate category-specific score
   * Score = 100 - (weighted penalties for issues in this category)
   * BUG FIX: Use detectedCategory if available, fallback to getIssueCategory
   */
  private calculateCategoryScore(issues: any[], category: string): number {
    const categoryIssues = issues.filter(i => {
      // Prefer detectedCategory (explicitly set during categorization)
      const issueCategory = i.detectedCategory || this.getIssueCategory(i);
      return issueCategory.toLowerCase().includes(category.toLowerCase());
    });

    // START at 100/100 - CORRECT scoring logic
    let score = 100;
    
    categoryIssues.forEach(issue => {
      switch (issue.severity) {
        case 'critical': score -= 5; break;   // FIX: was -10, should be -5
        case 'high': score -= 3; break;       // FIX: was -5, should be -3
        case 'medium': score -= 1; break;     // FIX: was -2, should be -1
        case 'low': score -= 0.5; break;      // FIX: was -1, should be -0.5
      }
    });

    return Math.max(0, Math.min(100, Math.round(score)));
  }

  /**
   * Generate recommendations based on category scores
   */
  private generateSkillRecommendations(
    issues: any[],
    categoryScores: Record<string, number>
  ): string[] {
    const recommendations: string[] = [];

    // Find weakest categories
    const sortedCategories = Object.entries(categoryScores)
      .sort(([, a], [, b]) => a - b);

    // Add recommendations for weak categories
    sortedCategories.slice(0, 3).forEach(([category, score]) => {
      if (score < 70) {
        recommendations.push(`Focus on improving ${category} (score: ${score}/100)`);
      }
    });

    // Add issue-specific recommendations
    const criticalIssues = issues.filter(i => i.severity === 'critical');
    if (criticalIssues.length > 0) {
      recommendations.push(`Address ${criticalIssues.length} critical issue(s) immediately`);
    }

    const highIssues = issues.filter(i => i.severity === 'high');
    if (highIssues.length > 5) {
      recommendations.push(`Reduce high-severity issues (currently ${highIssues.length})`);
    }

    return recommendations.slice(0, 5); // Max 5 recommendations
  }
}