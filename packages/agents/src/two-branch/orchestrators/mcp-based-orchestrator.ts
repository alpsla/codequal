/**
 * MCP-Based Orchestrator
 * 
 * Complete orchestration without DeepWiki
 * Uses MCP tools + Specialized Agents + Enhanced Comparison
 */

import { MCPOrchestrationService } from '../services/mcp-orchestration-service';
import { EnhancedComparisonService, SpecializedAgentReports } from '../services/enhanced-comparison-service';
import { GitDiffService } from '../services/git-diff-service';
import { IssueComparisonService } from '../services/issue-comparison-service';
import { RepositoryManager } from '../core/RepositoryManager';

// Specialized Agents
import { MultiToolSecurityAgent } from '../agents/MultiToolSecurityAgent';
import { MultiToolPerformanceAgent } from '../agents/MultiToolPerformanceAgent';
import { MultiToolCodeQualityAgent } from '../agents/MultiToolCodeQualityAgent';
import { EducatorAgent } from '../agents/EducatorAgent';

// Skills tracking
import { ISkillProvider } from './interfaces/skill-provider.interface';

export class MCPBasedOrchestrator {
  private mcpService: MCPOrchestrationService;
  private comparisonService: EnhancedComparisonService;
  private gitDiffService: GitDiffService;
  private educatorAgent: EducatorAgent;
  private repositoryManager: RepositoryManager;
  
  // Specialized agents
  private agents: {
    security: MultiToolSecurityAgent;
    performance: MultiToolPerformanceAgent;
    codeQuality: MultiToolCodeQualityAgent;
    // TODO: Add dependency and architecture agents
  };
  
  constructor(
    private skillProvider?: ISkillProvider,
    private logger?: any,
    private useCache: boolean = true
  ) {
    // Initialize services
    this.mcpService = new MCPOrchestrationService();
    this.comparisonService = new EnhancedComparisonService();
    this.gitDiffService = new GitDiffService(process.env.GITHUB_TOKEN);
    this.educatorAgent = new EducatorAgent();
    
    // Use CachedRepositoryManager if caching is enabled
    if (this.useCache) {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { CachedRepositoryManager } = require('../core/CachedRepositoryManager');
      this.repositoryManager = new CachedRepositoryManager(
        undefined, // Use default cache directory
        process.env.REDIS_URL // Optional Redis for metadata
      );
    } else {
      this.repositoryManager = new RepositoryManager();
    }
    
    // Initialize agents
    this.agents = {
      security: new MultiToolSecurityAgent(),
      performance: new MultiToolPerformanceAgent(),
      codeQuality: new MultiToolCodeQualityAgent()
    };
  }
  
  /**
   * Main entry point - analyzes a PR
   */
  async analyzePullRequest(
    repoUrl: string,
    prNumber: number,
    options?: {
      includeEducation?: boolean;
      updateSkills?: boolean;
    }
  ) {
    this.log('info', `Starting PR analysis for ${repoUrl}#${prNumber}`);
    const startTime = Date.now();
    
    try {
      // Step 1: Get git diff and PR metadata
      this.log('info', 'Fetching git diff and PR metadata...');
      const [gitDiff, prMetadata] = await Promise.all([
        this.gitDiffService.getDiffDetails(repoUrl, prNumber),
        this.gitDiffService.getPRMetadata(repoUrl, prNumber)
      ]);
      
      // Step 2: Setup branches for analysis
      this.log('info', 'Setting up branches for analysis...');
      const { mainPath, prPath } = await this.setupBranches(repoUrl, prNumber, prMetadata);
      
      // Step 3: Detect language
      const language = await this.detectLanguage(mainPath);
      this.log('info', `Detected language: ${language}`);
      
      // Step 4: Run MCP tools on both branches in parallel
      this.log('info', 'Running MCP tools on both branches...');
      const [mainMCPResults, prMCPResults] = await Promise.all([
        this.mcpService.analyzeBranch({
          targetPath: mainPath,
          language,
          branch: 'main'
        }),
        this.mcpService.analyzeBranch({
          targetPath: prPath,
          language,
          branch: 'pr'
        })
      ]);
      
      // Step 5: Run specialized agents on MCP results
      this.log('info', 'Running specialized agents...');
      const [mainAgentReports, prAgentReports] = await Promise.all([
        this.runSpecializedAgents(mainMCPResults, language),
        this.runSpecializedAgents(prMCPResults, language)
      ]);
      
      // Step 6: Get developer profile for skill tracking
      const developerProfile = prMetadata.author && this.skillProvider && this.skillProvider.getUserSkills
        ? await this.skillProvider.getUserSkills()
        : null;
      
      // Step 7: Run comparison and educator in parallel
      this.log('info', 'Running comparison and education generation...');
      const [comparisonResult, educationalContent] = await Promise.all([
        // Comparison with git diff integration
        this.comparisonService.compareWithFullMetadata(
          mainAgentReports,
          prAgentReports,
          gitDiff,
          prMetadata
        ),
        // Educational content (optional)
        options?.includeEducation && this.educatorAgent
          ? this.generateEducationalContent(prAgentReports, developerProfile)
          : Promise.resolve(null)
      ]);
      
      // Step 8: Calculate skill impact
      let skillUpdate = null;
      if (options?.updateSkills && developerProfile && this.skillProvider) {
        skillUpdate = await this.calculateAndUpdateSkills(
          comparisonResult,
          developerProfile,
          prMetadata
        );
      }
      
      // Step 9: Generate final report
      const finalReport = this.assembleFinalReport(
        comparisonResult,
        educationalContent,
        skillUpdate,
        prMetadata,
        Date.now() - startTime
      );
      
      this.log('info', `Analysis complete in ${Date.now() - startTime}ms`);
      
      return finalReport;
      
    } catch (error) {
      this.log('error', 'Analysis failed', error);
      throw error;
    }
  }
  
  /**
   * Setup branches for analysis (clone/checkout)
   */
  /**
   * Setup branches for analysis using RepositoryManager
   */
  private async setupBranches(repoUrl: string, prNumber: number, prMetadata: any) {
    this.log('info', `Setting up branches for PR #${prNumber}`);
    
    try {
      // Use RepositoryManager to clone both branches
      const { main, pr } = await this.repositoryManager.cloneForPRAnalysis(
        repoUrl,
        prNumber,
        prMetadata.baseRef || 'main'
      );
      
      this.log('info', `✅ Branches ready: main=${main.localPath}, pr=${pr.localPath}`);
      
      // Clean up repositories after analysis completes
      process.on('exit', async () => {
        await this.repositoryManager.cleanupAll();
      });
      
      return {
        mainPath: main.localPath,
        prPath: pr.localPath,
        mainInfo: main,
        prInfo: pr
      };
    } catch (error) {
      this.log('error', `Failed to setup branches: ${error}`);
      throw new Error(`Branch setup failed: ${error.message}`);
    }
  }
  
  /**
   * Detect primary language of the repository
   */
  /**
   * Detect primary language of the repository
   */
  private async detectLanguage(repoPath: string): Promise<string> {
    try {
      // Use the LanguageDetector utility
      const { LanguageDetector } = await import('../utils/language-detector');
      const detectedLanguage = await LanguageDetector.detectLanguage(repoPath);
      
      this.log('info', `Detected primary language: ${detectedLanguage}`);
      
      // Also get statistics for logging
      const stats = await LanguageDetector.getLanguageStats(repoPath);
      if (stats.length > 0) {
        this.log('info', 'Language breakdown:');
        stats.slice(0, 3).forEach(stat => {
          this.log('info', `  - ${stat.language}: ${stat.fileCount} files (${stat.percentage.toFixed(1)}%)`);
        });
      }
      
      return detectedLanguage;
    } catch (error) {
      this.log('warn', `Language detection failed, defaulting to JavaScript: ${error}`);
      return 'javascript'; // Safe default
    }
  }
  
  /**
   * Run specialized agents on MCP results
   */
  private async runSpecializedAgents(
    mcpResults: any,
    language: string
  ): Promise<SpecializedAgentReports> {
    // Each agent processes relevant findings
    const [securityReport, performanceReport, codeQualityReport] = await Promise.all([
      this.agents.security.analyze({
        findings: mcpResults.security,
        language,
        context: { files: mcpResults.metadata.filesAnalyzed }
      }),
      this.agents.performance.analyze({
        findings: mcpResults.performance,
        language,
        context: { files: mcpResults.metadata.filesAnalyzed }
      }),
      this.agents.codeQuality.analyze({
        findings: mcpResults.codeQuality,
        language,
        context: { files: mcpResults.metadata.filesAnalyzed }
      })
    ]);
    
    // Format for comparison service
    return {
      security: {
        agent: 'SecurityAgent',
        tools: ['semgrep'],
        issues: securityReport.issues,
        summary: securityReport.summary
      },
      performance: {
        agent: 'PerformanceAgent',
        tools: ['lighthouse'],
        issues: performanceReport.issues,
        summary: performanceReport.summary
      },
      codeQuality: {
        agent: 'CodeQualityAgent',
        tools: ['eslint'],
        issues: codeQualityReport.issues,
        summary: codeQualityReport.summary
      },
      // TODO: Add dependency and architecture
      dependency: {
        agent: 'DependencyAgent',
        tools: [],
        issues: [],
        summary: { vulnerabilities: 0, outdated: 0, unused: 0 }
      },
      architecture: {
        agent: 'ArchitectureAgent',
        tools: [],
        issues: [],
        summary: { circularDeps: 0, violations: 0, antiPatterns: 0 }
      }
    };
  }
  
  /**
   * Generate educational content based on issues
   */
  private async generateEducationalContent(
    agentReports: SpecializedAgentReports,
    developerProfile: any
  ) {
    // Collect all issues for education
    const allIssues = [
      ...agentReports.security.issues,
      ...agentReports.performance.issues,
      ...agentReports.codeQuality.issues
    ];
    
    return this.educatorAgent.generateTrainingMaterials({
      issues: allIssues,
      developerLevel: developerProfile?.level || 'intermediate',
      focusAreas: this.identifyFocusAreas(allIssues)
    });
  }
  
  /**
   * Calculate and update skill scores
   */
  private async calculateAndUpdateSkills(
    comparisonResult: any,
    developerProfile: any,
    prMetadata: any
  ) {
    // Calculate impact based on:
    // - Resolved issues (+points)
    // - New issues introduced (-points)
    // - Existing issues not cleaned (-small points)
    
    const scoreChange = {
      resolved: comparisonResult.summary.totalResolved * 2,
      newIntroduced: -comparisonResult.summary.totalNewInDiff * 5,
      notCleaned: -comparisonResult.summary.totalNewInFiles * 1,
      existing: -comparisonResult.summary.totalExisting * 0.5, // Small penalty for existing
    };
    
    const totalChange = Object.values(scoreChange).reduce((a, b) => a + b, 0);
    
    // Update in database if provider exists
    if (this.skillProvider) {
      await this.skillProvider.updateSkills([{
        userId: prMetadata.author,
        prId: `${prMetadata.number}`,
        timestamp: new Date(),
        previousScore: developerProfile.overallScore,
        newScore: Math.max(0, Math.min(100, developerProfile.overallScore + totalChange)),
        adjustments: [
          { category: 'resolved', points: scoreChange.resolved },
          { category: 'introduced', points: scoreChange.newIntroduced },
          { category: 'notCleaned', points: scoreChange.notCleaned },
          { category: 'existing', points: scoreChange.existing }
        ],
        categoryChanges: {}
      }]);
    }
    
    return {
      previousScore: developerProfile.overallScore,
      newScore: developerProfile.overallScore + totalChange,
      change: totalChange,
      breakdown: scoreChange
    };
  }
  
  /**
   * Assemble the final report
   */
  private assembleFinalReport(
    comparisonResult: any,
    educationalContent: any,
    skillUpdate: any,
    prMetadata: any,
    executionTime: number
  ) {
    return {
      // Core results
      comparison: comparisonResult,
      education: educationalContent,
      skillUpdate,
      
      // PR info
      pr: {
        url: `${prMetadata.repository_url}/pull/${prMetadata.number}`,
        title: prMetadata.title,
        author: prMetadata.author,
        branch: prMetadata.headBranch,
        baseBranch: prMetadata.baseBranch
      },
      
      // Summary
      summary: {
        decision: comparisonResult.summary.recommendation.action,
        confidence: comparisonResult.summary.recommendation.confidence,
        reasons: comparisonResult.summary.recommendation.reasons,
        qualityScore: comparisonResult.summary.prQualityScore
      },
      
      // Reports
      reports: {
        markdown: comparisonResult.detailedReport.markdown,
        prComment: comparisonResult.prComment,
        json: comparisonResult.detailedReport.json
      },
      
      // Metadata
      metadata: {
        executionTime,
        timestamp: new Date().toISOString(),
        toolsUsed: this.mcpService.getToolsForLanguage('typescript')
      }
    };
  }
  
  /**
   * Identify focus areas for education
   */
  private identifyFocusAreas(issues: any[]): string[] {
    const areas = new Set<string>();
    
    issues.forEach(issue => {
      if (issue.category === 'security') areas.add('security-best-practices');
      if (issue.category === 'performance') areas.add('performance-optimization');
      if (issue.severity === 'critical') areas.add('critical-issue-prevention');
    });
    
    return Array.from(areas);
  }
  
  private log(level: string, message: string, data?: any) {
    if (this.logger) {
      this.logger[level](message, data);
    } else {
      console.log(`[MCPOrchestrator] ${level.toUpperCase()}: ${message}`, data || '');
    }
  }
}