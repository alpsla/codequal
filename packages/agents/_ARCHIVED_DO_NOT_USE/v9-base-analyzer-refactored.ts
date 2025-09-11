/**
 * V9 Base Analyzer - Refactored with ModelAwareBaseAgent
 * 
 * This base class extends ModelAwareBaseAgent to provide:
 * - Automatic model selection from Supabase
 * - Fallback logic for model failures
 * - Cost tracking and optimization
 * - Proper error handling
 * 
 * Language-specific analyzers extend this class and provide:
 * - Tool configuration
 * - Tool output parsing
 */

import * as fs from 'fs';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { ModelAwareBaseAgent, ModelConfiguration, AgentContext } from '../agents/ModelAwareBaseAgent';
import { logger } from '../utils/logger';

// Import V9 modules
import { 
  Issue, 
  LanguageConfig, 
  AnalysisResult,
  ReportOptions,
  ModelConfig,
  EducationalResource,
  SkillScore
} from './v9-types';
import { V9ScoringCalculator } from './v9-scoring-calculator';
import { V9IssueComparator } from './v9-issue-comparator';
import { V9EducationalResources } from './v9-educational-resources';
import { V9BusinessImpact } from './v9-business-impact';
import { V9ReportFormatter } from './v9-report-formatter';
import { V9RepositoryManager, RepositoryConfig } from './v9-repository-manager';
import { DynamicModelSelector } from '../services/dynamic-model-selector';
import { SelectedFiles } from '../utils/smart-file-selector';

const execAsync = promisify(exec);

export abstract class V9BaseAnalyzer extends ModelAwareBaseAgent {
  // V9 Modules
  protected scoringCalculator: V9ScoringCalculator;
  protected issueComparator: V9IssueComparator;
  protected educationalResources: V9EducationalResources;
  protected businessImpact: V9BusinessImpact;
  protected reportFormatter: V9ReportFormatter;
  protected repositoryManager: V9RepositoryManager;
  protected modelSelector: DynamicModelSelector;
  
  // Configuration
  protected analysisConfig: RepositoryConfig = {
    useSmartSelection: true,
    maxFiles: 500,
    forceFullAnalysis: false
  };
  
  constructor(agentName: string) {
    super(agentName);
    
    // Initialize V9 modules
    this.scoringCalculator = new V9ScoringCalculator();
    this.issueComparator = new V9IssueComparator();
    this.educationalResources = new V9EducationalResources();
    this.businessImpact = new V9BusinessImpact();
    this.reportFormatter = new V9ReportFormatter();
    this.modelSelector = new DynamicModelSelector();
    
    // Check environment variables for configuration overrides
    if (process.env.CODEQUAL_FORCE_FULL_ANALYSIS === 'true') {
      this.analysisConfig.forceFullAnalysis = true;
      this.analysisConfig.useSmartSelection = false;
    }
    if (process.env.CODEQUAL_MAX_FILES) {
      this.analysisConfig.maxFiles = parseInt(process.env.CODEQUAL_MAX_FILES, 10);
    }
    
    // Initialize repository manager with config
    this.repositoryManager = new V9RepositoryManager(this.analysisConfig);
  }
  
  /**
   * Abstract method to be implemented by language-specific analyzers
   */
  abstract getLanguageConfig(): LanguageConfig;
  
  /**
   * Main analysis entry point with model-aware execution
   */
  async analyzePR(repoUrl: string, prNumber: number): Promise<void> {
    const startTime = Date.now();
    const languageConfig = this.getLanguageConfig();
    
    logger.info(`🚀 Starting V9 ${languageConfig.name} analysis for PR #${prNumber}`);
    
    // Execute with model selection and fallback
    await this.executeWithModel(languageConfig.name, async () => {
      try {
        // Prepare repositories
        const { mainPath, prPath } = await this.repositoryManager.prepareRepositories(
          repoUrl, 
          prNumber
        );
        
        // Get modified files
        const modifiedFiles = await this.repositoryManager.getModifiedFiles(mainPath, prPath);
        logger.info(`📝 Found ${modifiedFiles.length} modified files`);
        
        // Select files for analysis
        const selectedFiles = await this.repositoryManager.selectFilesForAnalysis(
          prPath,
          languageConfig.fileExtensions
        );
        
        // Analyze with tools
        const issues = await this.analyzeWithTools(
          prPath,
          languageConfig,
          selectedFiles
        );
        
        // Filter issues to selected files if using smart selection
        const filteredIssues = this.filterIssuesToSelectedFiles(issues, selectedFiles);
        
        // Compare issues (main vs PR)
        // For testing, treat all issues as PR issues
        const comparisonResult = await this.issueComparator.compareIssues(
          [], // main branch issues
          filteredIssues, // PR branch issues
          modifiedFiles
        );
        
        // Calculate scores
        const qualityScore = this.scoringCalculator.calculateQualityScore(
          comparisonResult.newIssues,
          comparisonResult.existingIssues,
          comparisonResult.resolvedIssues
        );
        const grade = this.scoringCalculator.getGrade(qualityScore);
        const confidence = this.scoringCalculator.getConfidenceLevel(
          comparisonResult.newIssues,
          comparisonResult.existingIssues,
          comparisonResult.resolvedIssues
        );
        
        // Categorize issues for blocking/backlog
        const blockingIssues = comparisonResult.newIssues.filter(i => i.severity === 'critical');
        const backlogIssues = comparisonResult.existingIssues.filter(i => i.severity !== 'critical');
        
        // Generate business impact
        const businessImpactAnalysis = this.businessImpact.calculateBusinessImpact(
          blockingIssues,
          backlogIssues
        );
        
        // Get educational resources for all new issues
        const resources: EducationalResource[] = [];
        for (const issue of comparisonResult.newIssues.slice(0, 3)) {
          const resourceList = await this.educationalResources.getEducationalResources(issue, languageConfig.name);
          resources.push(...resourceList);
        }
        
        // Generate skill score
        const skillScore: SkillScore = {
          developer: 'unknown',
          score: this.scoringCalculator.calculateSkillScore(
            comparisonResult.newIssues,
            comparisonResult.existingIssues
          ),
          trend: [],
          categories: {
            security: 75,
            performance: 75,
            architecture: 75,
            dependency: 75,
            quality: 75
          },
          recommendations: []
        };
        
        // Prepare analysis result
        const analysisResult: AnalysisResult = {
          decision: qualityScore >= 70 && blockingIssues.length === 0 ? 'approved' : 'rejected',
          confidence,
          reason: this.generateDecisionReason({ ...comparisonResult, blockingIssues }, qualityScore),
          qualityScore,
          grade,
          ...comparisonResult,
          blockingIssues,
          backlogIssues,
          modifiedFiles,
          businessImpact: businessImpactAnalysis,
          skillScore,
          educationalResources: resources,
          metadata: {
            repository: repoUrl.split('/').slice(-2).join('/'),
            prNumber,
            branch: 'main',
            language: languageConfig.name,
            totalFiles: selectedFiles?.totalSelected || 0,
            modifiedFiles: modifiedFiles.length,
            analysisTime: Date.now() - startTime,
            tools: languageConfig.tools.map(t => t.name),
            timestamp: new Date().toISOString(),
            analyzedAt: new Date().toISOString(),
            analyzer: 'V9',
            repoUrl,
            executionTime: Date.now() - startTime,
            model: this.getCurrentModel()
          }
        };
        
        // Generate report
        const report = await this.reportFormatter.generateReport(analysisResult, languageConfig.name, {
          format: 'markdown',
          includeCodeSnippets: true,
          includeBusinessImpact: true,
          includeEducationalResources: true,
          includeSkillScore: true,
          groupSimilarIssues: false
        });
        
        // Save report
        await this.saveReport(report, prNumber);
        
        // Track execution metrics
        const executionTime = Date.now() - startTime;
        const estimatedTokens = Math.round(executionTime / 10);
        
        logger.info(`✅ V9 Analysis completed in ${executionTime}ms`);
        logger.info(`💰 Estimated cost: $${this.estimateCost(estimatedTokens).toFixed(4)}`);
        
      } catch (error) {
        logger.error('V9 Analysis failed', error);
        throw error;
      }
    });
  }
  
  /**
   * Override getAgentRole for V9 analyzers
   */
  protected getAgentRole(): string {
    const languageConfig = this.getLanguageConfig();
    return `v9-${languageConfig.name.toLowerCase()}-analyzer`;
  }
  
  /**
   * Override getAgentContext for V9 specific context
   */
  protected async getAgentContext(language: string): Promise<AgentContext> {
    const baseContext = await super.getAgentContext(language);
    
    // V9 analyzers are complex by nature (orchestrating multiple tools)
    return {
      ...baseContext,
      role: 'analyzer',
      taskComplexity: 'complex',
      sizeCategory: 'large'
    };
  }
  
  /**
   * Handle model failure with fallback
   */
  protected async handleModelFailure(error: any): Promise<void> {
    logger.error('Model execution failed, attempting fallback', error);
    
    if (!this.currentModel) {
      throw new Error('No model configuration available');
    }
    
    // Switch to fallback model
    const fallbackModel: ModelConfiguration = {
      primary_provider: this.currentModel.fallback_provider,
      primary_model: this.currentModel.fallback_model,
      fallback_provider: 'deepseek',
      fallback_model: 'deepseek-r1-distill-llama-8b'
    };
    
    this.currentModel = fallbackModel;
    logger.info(`🔄 Switched to fallback model: ${fallbackModel.primary_provider}/${fallbackModel.primary_model}`);
  }
  
  /**
   * Analyze with language-specific tools
   */
  protected async analyzeWithTools(
    workspacePath: string,
    config: LanguageConfig,
    selectedFiles: SelectedFiles | null
  ): Promise<Issue[]> {
    const allIssues: Issue[] = [];
    
    for (const tool of config.tools) {
      try {
        logger.info(`🔧 Running ${tool.name}...`);
        
        // Build command with file restrictions if using smart selection
        let command = tool.command.replace('${workspacePath}', workspacePath);
        
        if (selectedFiles && tool.supportsFileList) {
          const fileList = [
            ...selectedFiles.prChangedFiles,
            ...selectedFiles.criticalFiles,
            ...selectedFiles.entryPoints,
            ...selectedFiles.configFiles,
            ...selectedFiles.testFiles
          ].join(' ');
          command = `${command} ${fileList}`;
        }
        
        // Execute tool
        const { stdout, stderr } = await execAsync(command, {
          cwd: workspacePath,
          maxBuffer: 50 * 1024 * 1024,
          timeout: 300000
        });
        
        // Parse output
        const issues = await tool.parser(stdout, workspacePath);
        
        // Add code snippets to issues
        for (const issue of issues) {
          if (issue.file && issue.line) {
            issue.codeSnippet = await this.repositoryManager.getCodeSnippet(
              issue.file,
              issue.line
            );
          }
        }
        
        allIssues.push(...issues);
        logger.info(`   Found ${issues.length} issues`);
        
      } catch (error) {
        logger.error(`Failed to run ${tool.name}:`, error);
      }
    }
    
    return allIssues;
  }
  
  /**
   * Generate decision reason
   */
  protected generateDecisionReason(
    comparisonResult: any,
    qualityScore: number
  ): string {
    const { blockingIssues, newIssues } = comparisonResult;
    
    if (blockingIssues.length > 0) {
      return `PR contains ${blockingIssues.length} critical issues that must be fixed before merge.`;
    }
    
    if (qualityScore < 70) {
      return `Quality score (${qualityScore.toFixed(1)}) is below passing threshold.`;
    }
    
    if (newIssues.length > 10) {
      return `Too many new issues introduced (${newIssues.length}).`;
    }
    
    return `PR meets quality standards with ${newIssues.length} minor issues.`;
  }
  
  /**
   * Filter issues to selected files
   */
  protected filterIssuesToSelectedFiles(
    issues: Issue[], 
    selectedFiles: SelectedFiles | null
  ): Issue[] {
    if (!selectedFiles) {
      return issues;
    }
    
    const selectedFilePaths = new Set([
      ...selectedFiles.prChangedFiles,
      ...selectedFiles.criticalFiles,
      ...selectedFiles.entryPoints,
      ...selectedFiles.configFiles,
      ...selectedFiles.testFiles
    ]);
    
    return issues.filter(issue => {
      if (!issue.file) return true;
      return selectedFilePaths.has(issue.file);
    });
  }
  
  /**
   * Save report to file system
   */
  protected async saveReport(report: string, prNumber: number): Promise<void> {
    const reportsDir = path.join(
      __dirname,
      '../../reports'
    );
    
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }
    
    const filename = `v9-pr-${prNumber}-${Date.now()}.md`;
    const filepath = path.join(reportsDir, filename);
    
    fs.writeFileSync(filepath, report);
    logger.info(`📄 Report saved to: ${filepath}`);
  }
}