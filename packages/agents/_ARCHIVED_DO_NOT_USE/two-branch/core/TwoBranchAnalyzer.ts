/**
 * Two-Branch Analyzer Orchestrator
 * 
 * Main orchestrator that coordinates the entire analysis flow:
 * 1. Clone repositories (with caching/indexing)
 * 2. Initialize specialized agents in parallel
 * 3. Run tools on both branches
 * 4. Specialized agents analyze results
 * 5. Educator provides training materials
 * 6. Generate final report
 */

import { RepositoryManager, RepositoryInfo } from './RepositoryManager';
import { BranchAnalyzer, SpecializedAgent } from '../analyzers/BranchAnalyzer';
import { TwoBranchComparator } from '../comparators/TwoBranchComparator';
import { AnalysisCacheService } from '../cache/AnalysisCacheService';
import { CacheManager } from '../cache/CacheManager';
import { DualBranchIndexer } from '../indexing/DualBranchIndexer';
import { 
  BranchAnalysisResult,
  ComparisonResult,
  ToolIssue,
  IssueCategory,
  AnalysisMetrics,
  ToolName
} from '../types';
import { logger } from '../utils/logger';
import { IndividualToolResponse } from '../types/mcp-types';

// Import existing specialized agents
import { ArchitectureAgent } from '../../specialized/architecture-agent';
import { DependencyAgent } from '../../specialized/dependency-agent';

export interface TwoBranchAnalysisOptions {
  useCache?: boolean;
  parallel?: boolean;
  includeEducational?: boolean;
  includeMetrics?: boolean;
  tools?: string[];
  specializedAgents?: SpecializedAgent[];
}

export interface TwoBranchAnalysisResult {
  prUrl: string;
  prNumber: number;
  repository: {
    owner: string;
    name: string;
    url: string;
  };
  branches: {
    main: string;
    pr: string;
  };
  comparison: ComparisonResult;
  specializedAnalysis: Map<IssueCategory, SpecializedAnalysisResult>;
  educationalContent?: EducationalContent;
  report: FinalReport;
  metadata: {
    startTime: Date;
    endTime: Date;
    duration: number;
    cached: boolean;
    toolsUsed: string[];
  };
}

export interface SpecializedAnalysisResult {
  category: IssueCategory;
  issues: ToolIssue[];
  insights: string[];
  recommendations: string[];
  metrics?: Record<string, any>;
}

export interface EducationalContent {
  keyLearnings: Learning[];
  bestPractices: BestPractice[];
  resources: Resource[];
}

export interface Learning {
  topic: string;
  description: string;
  relatedIssues: string[];
  resources: string[];
}

export interface BestPractice {
  category: IssueCategory;
  title: string;
  description: string;
  examples: string[];
}

export interface Resource {
  title: string;
  url: string;
  type: 'documentation' | 'tutorial' | 'video' | 'article';
  relevance: number;
}

export interface FinalReport {
  executiveSummary: string;
  riskAssessment: {
    level: 'low' | 'medium' | 'high' | 'critical';
    score: number;
    factors: string[];
  };
  detailedFindings: {
    newIssues: ToolIssue[];
    fixedIssues: ToolIssue[];
    unchangedIssues: ToolIssue[];
  };
  recommendations: {
    immediate: string[];
    shortTerm: string[];
    longTerm: string[];
  };
  metrics: AnalysisMetrics;
}

export class TwoBranchAnalyzer {
  private repoManager: RepositoryManager;
  private branchAnalyzer: BranchAnalyzer;
  private comparator: TwoBranchComparator;
  private cacheService: AnalysisCacheService;
  private cacheManager: CacheManager;
  private indexer: DualBranchIndexer;
  private specializedAgents: Map<IssueCategory, SpecializedAgent>;
  
  constructor(options: {
    cacheService?: AnalysisCacheService;
    specializedAgents?: SpecializedAgent[];
  } = {}) {
    this.repoManager = new RepositoryManager();
    this.branchAnalyzer = new BranchAnalyzer();
    this.comparator = new TwoBranchComparator();
    this.cacheService = options.cacheService || new AnalysisCacheService();
    this.cacheManager = new CacheManager({}); // CacheManager creates its own AnalysisCacheService
    this.indexer = new DualBranchIndexer();
    this.specializedAgents = new Map();
    
    // Register default specialized agents if provided
    if (options.specializedAgents) {
      for (const agent of options.specializedAgents) {
        this.specializedAgents.set(agent.category, agent);
        this.branchAnalyzer.registerSpecializedAgent(agent);
      }
    }
  }
  
  /**
   * Main entry point for two-branch analysis
   */
  async analyzePullRequest(
    prUrl: string,
    options: TwoBranchAnalysisOptions = {}
  ): Promise<TwoBranchAnalysisResult> {
    const startTime = Date.now();
    logger.info(`🚀 Starting Two-Branch Analysis for PR: ${prUrl}`);
    
    try {
      // Parse PR URL
      const { owner, name, prNumber } = this.parsePRUrl(prUrl);
      const repoUrl = `https://github.com/${owner}/${name}`;
      
      // Check cache first
      if (options.useCache !== false) {
        const cached = await this.checkCache(prUrl);
        if (cached) {
          logger.info('📦 Using cached analysis results');
          return cached;
        }
      }
      
      // Step 1: Clone repositories (main and PR branches)
      logger.info('\n📂 Step 1: Cloning repositories...');
      const { main: mainRepo, pr: prRepo } = await this.repoManager.cloneForPRAnalysis(
        repoUrl,
        prNumber
      );
      
      // Step 2: Index both branches in parallel
      logger.info('\n📑 Step 2: Indexing repositories...');
      const indices = await this.indexer.buildDualIndices(
        repoUrl,
        {
          main: mainRepo.localPath,
          pr: prRepo.localPath
        },
        {
          main: 'main',
          pr: `pr-${prNumber}`
        }
      );
      logger.info(`   Indexed ${indices.main.stats.totalFiles} files in main, ${indices.pr.stats.totalFiles} in PR`);
      logger.info(`   Found ${indices.crossReference.size} file mappings`);
      
      // Step 3: Initialize specialized agents
      logger.info('\n🤖 Step 3: Initializing specialized agents...');
      await this.initializeSpecializedAgents();
      
      // Step 4: Run analysis on both branches in parallel
      logger.info('\n🔬 Step 4: Running tools on both branches...');
      const [mainAnalysis, prAnalysis] = await Promise.all([
        this.analyzeBranchWithCaching(mainRepo, options),
        this.analyzeBranchWithCaching(prRepo, options)
      ]);
      
      // Step 5: Compare results
      logger.info('\n📊 Step 5: Comparing branch results...');
      const comparison = await this.comparator.compareAnalyses(
        mainAnalysis,
        prAnalysis,
        indices,
        { includeUnchanged: true }
      );
      
      // Step 6: Run specialized analysis
      logger.info('\n🎯 Step 6: Running specialized analysis...');
      const specializedAnalysis = await this.runSpecializedAnalysis(
        comparison,
        mainAnalysis,
        prAnalysis
      );
      
      // Step 7: Get educational content if requested
      let educationalContent: EducationalContent | undefined;
      if (options.includeEducational !== false) {
        logger.info('\n📚 Step 7: Generating educational content...');
        educationalContent = await this.generateEducationalContent(
          comparison,
          specializedAnalysis
        );
      }
      
      // Step 8: Generate final report
      logger.info('\n📝 Step 8: Generating final report...');
      const report = this.generateFinalReport(
        comparison,
        specializedAnalysis,
        educationalContent
      );
      
      // Clean up temporary directories
      await this.repoManager.cleanupAll();
      
      // Prepare result
      const result: TwoBranchAnalysisResult = {
        prUrl,
        prNumber,
        repository: {
          owner,
          name,
          url: repoUrl
        },
        branches: {
          main: mainRepo.mainBranch,
          pr: prRepo.prBranch || `pr-${prNumber}`
        },
        comparison,
        specializedAnalysis,
        educationalContent,
        report,
        metadata: {
          startTime: new Date(startTime),
          endTime: new Date(),
          duration: Date.now() - startTime,
          cached: false,
          toolsUsed: options.tools || []
        }
      };
      
      // Cache the result
      if (options.useCache !== false) {
        await this.cacheResult(prUrl, result);
      }
      
      logger.info(`\n✅ Analysis complete in ${result.metadata.duration}ms`);
      return result;
      
    } catch (error) {
      logger.error(`Analysis failed: ${error}`);
      throw error;
    }
  }
  
  /**
   * Analyze a branch with caching
   */
  private async analyzeBranchWithCaching(
    repo: RepositoryInfo,
    options: TwoBranchAnalysisOptions
  ): Promise<BranchAnalysisResult> {
    const branch = repo.prBranch || repo.mainBranch || 'main';
    
    if (options.useCache !== false) {
      const cached = await this.cacheService.getCachedBranchAnalysis(repo.url, branch);
      if (cached) {
        logger.info(`   Using cached analysis for ${repo.prBranch || repo.mainBranch}`);
        return cached;
      }
    }
    
    const result = await this.branchAnalyzer.analyzeBranch(repo, {
      tools: options.tools as any,
      parallel: options.parallel,
      includeMetrics: options.includeMetrics,
      useSpecializedAgents: true
    });
    
    if (options.useCache !== false) {
      await this.cacheService.cacheBranchAnalysis(repo.url, branch, result);
    }
    
    return result;
  }
  
  /**
   * Initialize specialized agents
   */
  private async initializeSpecializedAgents(): Promise<void> {
    // Architecture Agent
    if (!this.specializedAgents.has('architecture')) {
      const archAgent = new ArchitectureAgentAdapter();
      this.specializedAgents.set('architecture', archAgent);
      this.branchAnalyzer.registerSpecializedAgent(archAgent);
    }
    
    // Dependency Agent
    if (!this.specializedAgents.has('dependency')) {
      const depAgent = new DependencyAgentAdapter();
      this.specializedAgents.set('dependency', depAgent);
      this.branchAnalyzer.registerSpecializedAgent(depAgent);
    }
    
    // TODO: Add Security, Performance, and CodeQuality agents
    logger.info(`   Initialized ${this.specializedAgents.size} specialized agents`);
  }
  
  /**
   * Run specialized analysis on comparison results
   */
  private async runSpecializedAnalysis(
    comparison: ComparisonResult,
    mainAnalysis: BranchAnalysisResult,
    prAnalysis: BranchAnalysisResult
  ): Promise<Map<IssueCategory, SpecializedAnalysisResult>> {
    const results = new Map<IssueCategory, SpecializedAnalysisResult>();
    
    // Group issues by category
    const allIssues = [
      ...comparison.newIssues,
      ...comparison.fixedIssues,
      ...comparison.unchangedIssues
    ];
    
    const issuesByCategory = new Map<IssueCategory, ToolIssue[]>();
    for (const issue of allIssues) {
      const category = issue.category;
      if (!issuesByCategory.has(category)) {
        issuesByCategory.set(category, []);
      }
      issuesByCategory.get(category)!.push(issue);
    }
    
    // Process each category
    for (const [category, issues] of issuesByCategory) {
      const agent = this.specializedAgents.get(category);
      if (agent) {
        logger.info(`   Running ${category} specialized analysis...`);
        // Agent would provide deeper insights here
        results.set(category, {
          category,
          issues,
          insights: this.generateInsights(category, issues),
          recommendations: this.generateRecommendations(category, issues),
          metrics: this.calculateCategoryMetrics(category, issues)
        });
      }
    }
    
    return results;
  }
  
  /**
   * Generate educational content
   */
  private async generateEducationalContent(
    comparison: ComparisonResult,
    specializedAnalysis: Map<IssueCategory, SpecializedAnalysisResult>
  ): Promise<EducationalContent> {
    // This would integrate with the Educator agent
    const learnings: Learning[] = [];
    const bestPractices: BestPractice[] = [];
    const resources: Resource[] = [];
    
    // Generate learnings from new issues
    for (const issue of comparison.newIssues.slice(0, 5)) { // Top 5 new issues
      learnings.push({
        topic: issue.message,
        description: issue.details || issue.message,
        relatedIssues: [issue.id],
        resources: issue.documentation ? [issue.documentation] : []
      });
    }
    
    // Generate best practices from fixed issues
    const categorizedFixes = new Map<IssueCategory, ToolIssue[]>();
    for (const issue of comparison.fixedIssues) {
      if (!categorizedFixes.has(issue.category)) {
        categorizedFixes.set(issue.category, []);
      }
      categorizedFixes.get(issue.category)!.push(issue);
    }
    
    for (const [category, fixes] of categorizedFixes) {
      if (fixes.length > 0) {
        bestPractices.push({
          category,
          title: `${category} improvements`,
          description: `Fixed ${fixes.length} ${category} issues`,
          examples: fixes.slice(0, 3).map(f => f.message)
        });
      }
    }
    
    // Add relevant resources
    resources.push(
      {
        title: 'OWASP Security Guidelines',
        url: 'https://owasp.org/www-project-top-ten/',
        type: 'documentation',
        relevance: 0.9
      },
      {
        title: 'Clean Code Principles',
        url: 'https://cleancoders.com',
        type: 'article',
        relevance: 0.8
      }
    );
    
    return {
      keyLearnings: learnings,
      bestPractices,
      resources
    };
  }
  
  /**
   * Generate final report
   */
  private generateFinalReport(
    comparison: ComparisonResult,
    specializedAnalysis: Map<IssueCategory, SpecializedAnalysisResult>,
    educationalContent?: EducationalContent
  ): FinalReport {
    // Calculate risk assessment
    const riskLevel = comparison.metrics.riskLevel;
    const riskScore = comparison.metrics.scores.security;
    const riskFactors = [];
    
    if (comparison.metrics.critical > 0) {
      riskFactors.push(`${comparison.metrics.critical} critical issues found`);
    }
    if (comparison.metrics.high > 0) {
      riskFactors.push(`${comparison.metrics.high} high severity issues`);
    }
    
    // Generate recommendations
    const immediate: string[] = [];
    const shortTerm: string[] = [];
    const longTerm: string[] = [];
    
    // Immediate: Critical security issues
    const criticalIssues = comparison.newIssues.filter(i => i.severity === 'critical');
    if (criticalIssues.length > 0) {
      immediate.push(`Fix ${criticalIssues.length} critical security vulnerabilities immediately`);
    }
    
    // Short-term: High priority issues
    const highIssues = comparison.newIssues.filter(i => i.severity === 'high');
    if (highIssues.length > 0) {
      shortTerm.push(`Address ${highIssues.length} high priority issues in the next sprint`);
    }
    
    // Long-term: Architecture and quality improvements
    const archAnalysis = specializedAnalysis.get('architecture');
    if (archAnalysis && archAnalysis.recommendations.length > 0) {
      longTerm.push(...archAnalysis.recommendations.slice(0, 3));
    }
    
    return {
      executiveSummary: this.generateExecutiveSummary(comparison),
      riskAssessment: {
        level: riskLevel,
        score: riskScore,
        factors: riskFactors
      },
      detailedFindings: {
        newIssues: comparison.newIssues,
        fixedIssues: comparison.fixedIssues,
        unchangedIssues: comparison.unchangedIssues
      },
      recommendations: {
        immediate,
        shortTerm,
        longTerm
      },
      metrics: comparison.metrics
    };
  }
  
  /**
   * Helper methods
   */
  
  private parsePRUrl(url: string): { owner: string; name: string; prNumber: number } {
    const match = url.match(/github\.com\/([^/]+)\/([^/]+)\/pull\/(\d+)/);
    if (!match) {
      throw new Error(`Invalid PR URL: ${url}`);
    }
    return {
      owner: match[1],
      name: match[2],
      prNumber: parseInt(match[3])
    };
  }
  
  private async checkCache(prUrl: string): Promise<TwoBranchAnalysisResult | null> {
    const cacheKey = `analysis:${prUrl}`;
    // Implementation would check cache
    return null;
  }
  
  private async cacheResult(prUrl: string, result: TwoBranchAnalysisResult): Promise<void> {
    const cacheKey = `analysis:${prUrl}`;
    // Implementation would cache result
  }
  
  private generateExecutiveSummary(comparison: ComparisonResult): string {
    return `Pull Request Analysis Summary:
    
- **New Issues**: ${comparison.newIssues.length} introduced
- **Fixed Issues**: ${comparison.fixedIssues.length} resolved
- **Unchanged Issues**: ${comparison.unchangedIssues.length} pre-existing
- **Overall Score**: ${comparison.metrics.scores.overall}/100
- **Risk Level**: ${comparison.metrics.riskLevel}
- **Improvement Rate**: ${comparison.metrics.improvement.toFixed(1)}%`;
  }
  
  private generateInsights(category: IssueCategory, issues: ToolIssue[]): string[] {
    const insights: string[] = [];
    
    // Category-specific insights
    switch (category) {
      case 'security':
        insights.push(`Found ${issues.length} security vulnerabilities`);
        break;
      case 'performance':
        insights.push(`Identified ${issues.length} performance bottlenecks`);
        break;
      case 'architecture':
        insights.push(`Detected ${issues.length} architectural issues`);
        break;
      case 'quality':
        insights.push(`Found ${issues.length} code quality issues`);
        break;
      case 'dependency':
        insights.push(`Identified ${issues.length} dependency problems`);
        break;
    }
    
    return insights;
  }
  
  private generateRecommendations(category: IssueCategory, issues: ToolIssue[]): string[] {
    const recommendations: string[] = [];
    
    if (issues.length > 0) {
      recommendations.push(`Review and fix ${category} issues before merging`);
    }
    
    return recommendations;
  }
  
  private calculateCategoryMetrics(category: IssueCategory, issues: ToolIssue[]): Record<string, any> {
    return {
      total: issues.length,
      critical: issues.filter(i => i.severity === 'critical').length,
      high: issues.filter(i => i.severity === 'high').length,
      medium: issues.filter(i => i.severity === 'medium').length,
      low: issues.filter(i => i.severity === 'low').length
    };
  }
}

/**
 * Adapter classes to bridge existing agents with new interface
 */
class ArchitectureAgentAdapter implements SpecializedAgent {
  category: IssueCategory = 'architecture';
  private agent: ArchitectureAgent;
  
  constructor() {
    this.agent = new ArchitectureAgent({});
  }
  
  async analyzeToolResults(results: IndividualToolResponse[]): Promise<ToolIssue[]> {
    // Convert tool results to format expected by ArchitectureAgent
    const context = {
      prData: {},
      deepwikiContext: {},
      toolResults: results,
      vectorContext: {}
    };
    
    const analysis = await this.agent.analyze(context);
    
    // Convert insights to ToolIssue format
    return analysis.insights.map((insight: any, index: number) => ({
      id: `arch-${index}`,
      tool: insight.tool || 'architecture-analyzer',
      ruleId: insight.type,
      category: 'architecture' as IssueCategory,
      file: insight.location?.file || 'unknown',
      startLine: insight.location?.line || 0,
      endLine: insight.location?.line || 0,
      severity: insight.severity,
      message: insight.message,
      tags: []
    }));
  }
  
  getRelevantTools(): ToolName[] {
    return ['dependency-cruiser', 'madge', 'complexity-report', 'sonarjs'] as ToolName[];
  }
}

class DependencyAgentAdapter implements SpecializedAgent {
  category: IssueCategory = 'dependency';
  private agent: DependencyAgent;
  
  constructor() {
    this.agent = new DependencyAgent({});
  }
  
  async analyzeToolResults(results: IndividualToolResponse[]): Promise<ToolIssue[]> {
    // Similar adapter logic for DependencyAgent
    return [];
  }
  
  getRelevantTools(): ToolName[] {
    return ['npm-audit', 'dependency-check', 'cargo-audit', 'safety'] as ToolName[];
  }
}

export default TwoBranchAnalyzer;