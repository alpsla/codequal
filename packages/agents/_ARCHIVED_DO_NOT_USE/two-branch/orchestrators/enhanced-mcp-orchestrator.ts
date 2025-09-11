/**
 * Enhanced MCP-Based Orchestrator
 * 
 * Integrates all security agents including GitHub/GitLab
 * Properly handles platform detection and parallel execution
 */

import { MCPOrchestrationService } from '../services/mcp-orchestration-service';
import { EnhancedComparisonService, SpecializedAgentReports } from '../services/enhanced-comparison-service';
import { GitDiffService } from '../services/git-diff-service';
import { RepositoryManager } from '../core/RepositoryManager';

// Multi-tool Agents
import { MultiToolSecurityAgent } from '../agents/MultiToolSecurityAgent';
import { MultiToolPerformanceAgent } from '../agents/MultiToolPerformanceAgent';
import { MultiToolCodeQualityAgent } from '../agents/MultiToolCodeQualityAgent';
import { MultiToolDependencyAgent } from '../agents/MultiToolDependencyAgent';
import { MultiToolArchitectureAgent } from '../agents/MultiToolArchitectureAgent';

// Platform-specific Security Agents
import { GitHubSecurityAgent } from '../agents/GitHubSecurityAgent';
import { GitLabSecurityAgent } from '../agents/GitLabSecurityAgent';

// License Compliance Agent
import { LicenseComplianceAgent } from '../agents/LicenseComplianceAgent';

// Language-specific Security Agents
import { JavaSecurityAgent } from '../agents/JavaSecurityAgent';
import { CppSecurityAgent } from '../agents/CppSecurityAgent';
import { RubySecurityAgent } from '../agents/RubySecurityAgent';
import { GoSecurityAgent } from '../agents/GoSecurityAgent';

// Specialized Agents
import { EducatorAgent } from '../../specialized/educator-agent';

// Skills tracking
interface ISkillProvider {
  getSkills(): Promise<any>;
  updateSkills(skills: any): Promise<void>;
}

export interface PlatformInfo {
  platform: 'github' | 'gitlab' | 'bitbucket' | 'other';
  owner?: string;
  repo?: string;
  namespace?: string;
  project?: string;
}

export class EnhancedMCPOrchestrator {
  private mcpService: MCPOrchestrationService;
  private comparisonService: EnhancedComparisonService;
  private gitDiffService: GitDiffService;
  private educatorAgent: EducatorAgent;
  private repositoryManager: RepositoryManager;
  
  // Multi-tool agents
  private agents: {
    security: MultiToolSecurityAgent;
    performance: MultiToolPerformanceAgent;
    codeQuality: MultiToolCodeQualityAgent;
    dependency: MultiToolDependencyAgent;
    architecture: MultiToolArchitectureAgent;
    githubSecurity: GitHubSecurityAgent;
    gitlabSecurity: GitLabSecurityAgent;
    licenseCompliance: LicenseComplianceAgent;
    javaSecurity: JavaSecurityAgent;
    cppSecurity: CppSecurityAgent;
    rubySecurity: RubySecurityAgent;
    goSecurity: GoSecurityAgent;
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
    
    // Initialize all agents
    this.agents = {
      security: new MultiToolSecurityAgent(),
      performance: new MultiToolPerformanceAgent(),
      codeQuality: new MultiToolCodeQualityAgent(),
      dependency: new MultiToolDependencyAgent(),
      architecture: new MultiToolArchitectureAgent(),
      githubSecurity: new GitHubSecurityAgent(),
      gitlabSecurity: new GitLabSecurityAgent(),
      licenseCompliance: new LicenseComplianceAgent(),
      javaSecurity: new JavaSecurityAgent(),
      cppSecurity: new CppSecurityAgent(),
      rubySecurity: new RubySecurityAgent(),
      goSecurity: new GoSecurityAgent()
    };
  }
  
  /**
   * Detect platform from repository URL
   */
  private detectPlatform(repoUrl: string): PlatformInfo {
    if (repoUrl.includes('github.com')) {
      const match = repoUrl.match(/github\.com[/:]([^/]+)\/([^/]+)/);
      if (match) {
        return {
          platform: 'github',
          owner: match[1],
          repo: match[2].replace('.git', '')
        };
      }
    }
    
    if (repoUrl.includes('gitlab.com')) {
      const match = repoUrl.match(/gitlab\.com[/:](.+?)\/([^/]+?)(?:\.git)?$/);
      if (match) {
        return {
          platform: 'gitlab',
          namespace: match[1],
          project: match[2]
        };
      }
    }
    
    if (repoUrl.includes('bitbucket.org')) {
      return { platform: 'bitbucket' };
    }
    
    return { platform: 'other' };
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
      // Step 1: Detect platform
      const platformInfo = this.detectPlatform(repoUrl);
      this.log('info', `Detected platform: ${platformInfo.platform}`);
      
      // Step 2: Get git diff and PR metadata (platform-specific)
      this.log('info', 'Fetching git diff and PR metadata...');
      const [gitDiff, prMetadata] = await Promise.all([
        this.gitDiffService.getDiffDetails(repoUrl, prNumber),
        this.gitDiffService.getPRMetadata(repoUrl, prNumber)
      ]);
      
      // Step 3: Setup branches for analysis (clone/cache)
      this.log('info', 'Setting up branches for analysis...');
      const { mainPath, prPath } = await this.setupBranches(repoUrl, prNumber, prMetadata);
      
      // Step 4: Detect language
      const language = await this.detectLanguage(mainPath);
      this.log('info', `Detected language: ${language}`);
      
      // Step 5: Run ALL tools in parallel on both branches
      this.log('info', 'Running all analysis tools on both branches...');
      const [mainAnalysis, prAnalysis] = await Promise.all([
        this.runCompleteAnalysis(mainPath, repoUrl, language, 'main', platformInfo),
        this.runCompleteAnalysis(prPath, repoUrl, language, 'pr', platformInfo)
      ]);
      
      // Step 6: Get developer profile for skill tracking
      const developerProfile = prMetadata.author && this.skillProvider
        ? await this.skillProvider.getSkills()
        : null;
      
      // Step 7: Run comparison and educator in parallel
      this.log('info', 'Running comparison and education generation...');
      const [comparisonResult, educationalContent] = await Promise.all([
        // Comparison with git diff integration
        this.comparisonService.compareWithFullMetadata(
          mainAnalysis,
          prAnalysis,
          gitDiff,
          prMetadata
        ),
        // Educational content (optional)
        options?.includeEducation && this.educatorAgent
          ? this.generateEducationalContent(prAnalysis, developerProfile)
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
        Date.now() - startTime,
        platformInfo
      );
      
      this.log('info', `Analysis complete in ${Date.now() - startTime}ms`);
      
      return finalReport;
      
    } catch (error) {
      this.log('error', 'Analysis failed', error);
      throw error;
    }
  }
  
  /**
   * Run complete analysis with all tools in parallel
   */
  private async runCompleteAnalysis(
    localPath: string,
    repoUrl: string,
    language: string,
    branch: string,
    platformInfo: PlatformInfo
  ): Promise<SpecializedAgentReports> {
    // Prepare all analysis tasks
    const analysisTasks: Promise<any>[] = [];
    
    // 1. Local security tools (Semgrep, Bandit, etc.)
    analysisTasks.push(
      this.agents.security.analyze({
        targetPath: localPath,
        language,
        context: { branch }
      })
    );
    
    // 2. Platform-specific security (GitHub/GitLab API)
    if (platformInfo.platform === 'github') {
      analysisTasks.push(
        this.agents.githubSecurity.analyze({
          repoUrl,
          owner: platformInfo.owner,
          repo: platformInfo.repo,
          language,
          branch,
          context: { branch }
        })
      );
    } else if (platformInfo.platform === 'gitlab') {
      analysisTasks.push(
        this.agents.gitlabSecurity.analyze({
          repoUrl,
          namespace: platformInfo.namespace,
          project: platformInfo.project,
          language,
          branch,
          context: { branch }
        })
      );
    }
    
    // 3. Performance analysis
    analysisTasks.push(
      this.agents.performance.analyze({
        targetPath: localPath,
        language,
        context: { branch }
      })
    );
    
    // 4. Code quality analysis
    analysisTasks.push(
      this.agents.codeQuality.analyze({
        targetPath: localPath,
        language,
        context: { branch }
      })
    );
    
    // 5. Dependency analysis
    analysisTasks.push(
      this.agents.dependency.analyze({
        targetPath: localPath,
        language,
        context: { branch }
      })
    );
    
    // 6. Architecture analysis
    analysisTasks.push(
      this.agents.architecture.analyze({
        targetPath: localPath,
        language,
        context: { branch }
      })
    );
    
    // 7. License compliance analysis
    analysisTasks.push(
      this.agents.licenseCompliance.analyze({
        targetPath: localPath,
        language,
        context: { branch }
      })
    );
    
    // 8. Java-specific security analysis (if applicable)
    let javaSecurityIndex = -1;
    if (await this.agents.javaSecurity.isApplicable(localPath)) {
      javaSecurityIndex = analysisTasks.length;
      analysisTasks.push(
        this.agents.javaSecurity.analyze({
          targetPath: localPath,
          language: 'java',
          context: { branch }
        })
      );
    }
    
    // 9. C/C++-specific security analysis (if applicable)
    let cppSecurityIndex = -1;
    if (await this.agents.cppSecurity.isApplicable(localPath)) {
      cppSecurityIndex = analysisTasks.length;
      analysisTasks.push(
        this.agents.cppSecurity.analyze({
          targetPath: localPath,
          language: 'cpp',
          context: { branch }
        })
      );
    }
    
    // 10. Ruby-specific security analysis (if applicable)
    let rubySecurityIndex = -1;
    if (await this.agents.rubySecurity.isApplicable(localPath)) {
      rubySecurityIndex = analysisTasks.length;
      analysisTasks.push(
        this.agents.rubySecurity.analyze({
          targetPath: localPath,
          language: 'ruby',
          context: { branch }
        })
      );
    }
    
    // 11. Go-specific security analysis (if applicable)
    let goSecurityIndex = -1;
    if (await this.agents.goSecurity.isApplicable(localPath)) {
      goSecurityIndex = analysisTasks.length;
      analysisTasks.push(
        this.agents.goSecurity.analyze({
          targetPath: localPath,
          language: 'go',
          context: { branch }
        })
      );
    }
    
    // Run all in parallel
    const results = await Promise.all(analysisTasks);
    
    // Merge security results from local, platform-specific, and language-specific tools
    const localSecurityResult = results[0];
    const platformSecurityResult = platformInfo.platform !== 'other' ? results[1] : null;
    const javaSecurityResult = javaSecurityIndex !== -1 ? results[javaSecurityIndex] : null;
    const cppSecurityResult = cppSecurityIndex !== -1 ? results[cppSecurityIndex] : null;
    const rubySecurityResult = rubySecurityIndex !== -1 ? results[rubySecurityIndex] : null;
    const goSecurityResult = goSecurityIndex !== -1 ? results[goSecurityIndex] : null;
    
    const mergedSecurityIssues = this.mergeSecurityResults(
      localSecurityResult,
      platformSecurityResult,
      javaSecurityResult,
      cppSecurityResult,
      rubySecurityResult,
      goSecurityResult
    );
    
    // Format for comparison service
    return {
      security: {
        agent: 'SecurityAgent',
        tools: [
          ...(localSecurityResult?.tools || []),
          ...(platformSecurityResult?.tools || []),
          ...(javaSecurityResult?.metadata?.toolsRun || []),
          ...(cppSecurityResult?.metadata?.toolsRun || [])
        ],
        issues: mergedSecurityIssues,
        summary: this.generateSecuritySummary(mergedSecurityIssues)
      },
      performance: {
        agent: 'PerformanceAgent',
        tools: results[2]?.tools || [],
        issues: results[2]?.issues || [],
        summary: results[2]?.summary || {}
      },
      codeQuality: {
        agent: 'CodeQualityAgent',
        tools: results[3]?.tools || [],
        issues: results[3]?.issues || [],
        summary: results[3]?.summary || {}
      },
      dependency: {
        agent: 'DependencyAgent',
        tools: results[4]?.tools || [],
        issues: results[4]?.issues || [],
        summary: results[4]?.summary || {}
      },
      architecture: {
        agent: 'ArchitectureAgent',
        tools: results[5]?.tools || [],
        issues: results[5]?.issues || [],
        summary: results[5]?.summary || {}
      },
      licenseCompliance: {
        agent: 'LicenseComplianceAgent',
        tools: results[6]?.tools || [],
        issues: results[6]?.issues || [],
        summary: results[6]?.summary || {}
      }
    };
  }
  
  /**
   * Merge security results from local, platform-specific, and language-specific tools
   */
  private mergeSecurityResults(
    localResult: any, 
    platformResult: any,
    javaResult: any = null,
    cppResult: any = null,
    rubyResult: any = null,
    goResult: any = null
  ): any[] {
    const allIssues = [
      ...(localResult?.issues || []),
      ...(platformResult?.issues || []),
      ...(javaResult?.issues || []),
      ...(cppResult?.issues || []),
      ...(rubyResult?.issues || []),
      ...(goResult?.issues || [])
    ];
    
    // Deduplicate based on file/line/type
    const uniqueIssues = new Map();
    
    allIssues.forEach(issue => {
      const key = `${issue.file || 'unknown'}:${issue.line || 0}:${issue.type || 'unknown'}`;
      
      // Prefer platform-native findings (GitHub/GitLab) as they have fewer false positives
      if (!uniqueIssues.has(key)) {
        uniqueIssues.set(key, issue);
      } else if (issue.gitHubNative || issue.gitlabNative) {
        uniqueIssues.set(key, issue);
      }
    });
    
    return Array.from(uniqueIssues.values());
  }
  
  /**
   * Generate security summary from merged issues
   */
  private generateSecuritySummary(issues: any[]): any {
    const summary = {
      total: issues.length,
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
      bySource: {
        local: 0,
        github: 0,
        gitlab: 0
      }
    };
    
    issues.forEach(issue => {
      // Count by severity
      const severity = issue.severity?.toLowerCase() || 'medium';
      if (severity in summary) {
        summary[severity as keyof typeof summary]++;
      }
      
      // Count by source
      if (issue.gitHubNative) {
        summary.bySource.github++;
      } else if (issue.gitlabNative) {
        summary.bySource.gitlab++;
      } else {
        summary.bySource.local++;
      }
    });
    
    return summary;
  }
  
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
        prMetadata.baseBranch || prMetadata.baseRef || 'main'
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
  private async detectLanguage(repoPath: string): Promise<string> {
    try {
      // Use the LanguageDetector utility
      const { LanguageDetector } = await import('../utils/language-detector');
      const detectedLanguage = await LanguageDetector.detectLanguage(repoPath);
      
      this.log('info', `Detected primary language: ${detectedLanguage}`);
      
      return detectedLanguage;
    } catch (error) {
      this.log('warn', `Language detection failed, defaulting to JavaScript: ${error}`);
      return 'javascript'; // Safe default
    }
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
      ...agentReports.codeQuality.issues,
      ...agentReports.dependency.issues,
      ...agentReports.architecture.issues,
      ...(agentReports.licenseCompliance?.issues || [])
    ];
    
    // Use a method that exists on EducatorAgent
    return this.educatorAgent.analyze({
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
    const scoreChange = {
      resolved: comparisonResult.summary.totalResolved * 2,
      newIntroduced: -comparisonResult.summary.totalNewInDiff * 5,
      notCleaned: -comparisonResult.summary.totalNewInFiles * 1,
      existing: -comparisonResult.summary.totalExisting * 0.5,
    };
    
    const totalChange = Object.values(scoreChange).reduce((a, b) => a + b, 0);
    
    if (this.skillProvider) {
      await this.skillProvider.updateSkills([{
        userId: prMetadata.author,
        prId: `${prMetadata.number}`,
        timestamp: new Date(),
        previousScore: developerProfile.overallScore,
        newScore: Math.max(0, Math.min(100, developerProfile.overallScore + totalChange)),
        adjustments: Object.entries(scoreChange).map(([category, points]) => ({
          category,
          points
        }))
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
    executionTime: number,
    platformInfo: PlatformInfo
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
        owner: prMetadata.owner,
        branch: prMetadata.headBranch,
        baseBranch: prMetadata.baseBranch,
        duration: prMetadata.duration,
        platform: platformInfo.platform
      },
      
      // Summary
      summary: {
        decision: comparisonResult.summary.recommendation.action,
        confidence: comparisonResult.summary.recommendation.confidence,
        reasons: comparisonResult.summary.recommendation.reasons,
        qualityScore: comparisonResult.summary.prQualityScore,
        platform: platformInfo.platform
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
        platform: platformInfo.platform,
        toolsUsed: this.getAllToolsUsed()
      }
    };
  }
  
  /**
   * Get all tools used across all agents
   */
  private getAllToolsUsed(): string[] {
    return [
      // Security tools
      'semgrep', 'bandit', 'gosec', 'npm-audit', 'gitleaks',
      // Platform security
      'github-dependabot', 'github-code-scanning', 'gitlab-sast',
      // Performance tools
      'lighthouse', 'webpack-bundle-analyzer',
      // Code quality tools
      'eslint', 'rubocop', 'pylint',
      // Dependency tools
      'npm-audit', 'retire-js', 'nancy',
      // Architecture tools
      'madge', 'dependency-cruiser', 'jscpd'
    ];
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
      console.log(`[EnhancedOrchestrator] ${level.toUpperCase()}: ${message}`, data || '');
    }
  }
}