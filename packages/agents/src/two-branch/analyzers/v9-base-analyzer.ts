/**
 * V9 Base Analyzer - Orchestrates all V9 analyzer modules
 * 
 * This base class coordinates the various V9 modules with enhanced features:
 * - Modified file blocking logic
 * - Consistent scoring weights
 * - Issue comparison and categorization
 * - Educational resources with diverse sources
 * - Business impact analysis
 * - Report generation
 * 
 * Language-specific analyzers extend this class and provide:
 * - Tool configuration
 * - Tool output parsing
 */

import * as fs from 'fs';
import * as path from 'path';
import { execSync, exec } from 'child_process';
import { promisify } from 'util';
import { createClient } from '@supabase/supabase-js';

// Import V9 modules
import { 
  Issue, 
  LanguageConfig, 
  AnalysisResult,
  ModelConfig,
  ReportOptions 
} from './v9-types';
import { V9ScoringCalculator } from './v9-scoring-calculator';
import { V9IssueComparator } from './v9-issue-comparator';
import { V9EducationalResources } from './v9-educational-resources';
import { V9BusinessImpact } from './v9-business-impact';
import { V9ReportFormatter } from './v9-report-formatter';

// Import utilities
import { getRepoManager, getFileSelector } from '../utils/repository-utils-factory';
import type { CloudRepositoryManager } from '../utils/cloud-repository-manager';
import type { SmartFileSelector, SelectedFiles } from '../utils/smart-file-selector';
import { DynamicModelSelector } from '../services/dynamic-model-selector';

export abstract class V9BaseAnalyzer {
  protected repoManager: CloudRepositoryManager;
  protected modelSelector: DynamicModelSelector;
  protected fileSelector: SmartFileSelector;
  protected supabase: any;
  protected logger: Console = console;
  
  // V9 Modules
  protected scoringCalculator: V9ScoringCalculator;
  protected issueComparator: V9IssueComparator;
  protected educationalResources: V9EducationalResources;
  protected businessImpact: V9BusinessImpact;
  protected reportFormatter: V9ReportFormatter;
  
  // Cache
  protected modelConfigs: Map<string, ModelConfig> = new Map();
  protected cachedWorkspacePath = '';
  
  // Configuration
  protected analysisConfig = {
    useSmartSelection: true,  // Default to smart selection
    maxFiles: 500,            // Default file limit
    forceFullAnalysis: false  // Override for full repo analysis
  };
  
  constructor() {
    // Initialize utilities using factory
    this.repoManager = getRepoManager();
    this.modelSelector = new DynamicModelSelector(process.env.OPENROUTER_API_KEY);
    this.fileSelector = getFileSelector();
    
    // Initialize Supabase
    const supabaseUrl = process.env.SUPABASE_URL || '';
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
    this.supabase = createClient(supabaseUrl, supabaseKey);
    
    // Initialize V9 modules
    this.scoringCalculator = new V9ScoringCalculator();
    this.issueComparator = new V9IssueComparator();
    this.educationalResources = new V9EducationalResources();
    this.businessImpact = new V9BusinessImpact();
    this.reportFormatter = new V9ReportFormatter();
    
    // Check environment variables for configuration overrides
    if (process.env.CODEQUAL_FORCE_FULL_ANALYSIS === 'true') {
      this.analysisConfig.forceFullAnalysis = true;
      this.analysisConfig.useSmartSelection = false;
    }
    if (process.env.CODEQUAL_MAX_FILES) {
      this.analysisConfig.maxFiles = parseInt(process.env.CODEQUAL_MAX_FILES, 10);
    }
  }
  
  /**
   * Abstract method to be implemented by language-specific analyzers
   */
  abstract getLanguageConfig(): LanguageConfig;
  
  /**
   * Main entry point for PR analysis
   */
  async analyzePR(repoUrl: string, prNumber: number): Promise<void> {
    try {
      this.logger.log(`🚀 Starting V9 analysis for PR #${prNumber}`);
      
      // Load model configurations from Supabase
      await this.loadModelConfigs();
      
      // Clone and prepare repositories
      const { mainPath, prPath, modifiedFiles } = await this.prepareRepositories(repoUrl, prNumber);
      
      // Determine if we should use smart file selection
      const shouldUseSmartSelection = await this.shouldUseSmartSelection(prPath);
      
      // Run analysis tools on both branches
      const { mainIssues, prIssues } = await this.analyzeWithTools(
        mainPath, 
        prPath, 
        modifiedFiles,
        repoUrl,
        prNumber,
        shouldUseSmartSelection
      );
      
      // Compare and categorize issues
      const { newIssues, existingIssues, resolvedIssues } = 
        this.issueComparator.compareIssues(mainIssues, prIssues, modifiedFiles);
      
      // Categorize by priority
      const { blockingIssues, backlogIssues } = 
        this.issueComparator.categorizeByPriority(newIssues, existingIssues);
      
      // Calculate scores and metrics
      const qualityScore = this.scoringCalculator.calculateQualityScore(
        newIssues, 
        existingIssues, 
        resolvedIssues
      );
      const grade = this.scoringCalculator.getGrade(qualityScore);
      const confidence = this.scoringCalculator.getConfidenceLevel(
        newIssues, 
        existingIssues, 
        resolvedIssues
      );
      
      // Determine approval decision
      const decision = this.scoringCalculator.shouldApprove(qualityScore) ? 'approved' : 'rejected';
      const reason = this.generateDecisionReason(decision, blockingIssues, qualityScore);
      
      // Calculate business impact
      const businessImpactData = this.businessImpact.calculateBusinessImpact(
        blockingIssues, 
        backlogIssues
      );
      
      // Calculate skill score
      const skillScore = this.businessImpact.calculateSkillScore(
        'Developer',
        newIssues,
        resolvedIssues,
        existingIssues
      );
      
      // Prepare metadata
      const config = this.getLanguageConfig();
      const timestamp = new Date().toISOString();
      const metadata = {
        repository: repoUrl,
        prNumber,
        branch: `pr-${prNumber}`,
        language: config.name,
        totalFiles: await this.countFiles(prPath),
        modifiedFiles: modifiedFiles.length,
        analysisTime: Date.now(),
        tools: config.tools.map(t => t.name),
        timestamp,
        // Required extended metadata fields
        analyzedAt: timestamp,
        analyzer: this.constructor.name,
        repoUrl,
        executionTime: Date.now()
      };
      
      // Build result object
      const result: AnalysisResult = {
        decision,
        confidence,
        reason,
        qualityScore,
        grade,
        newIssues,
        existingIssues,
        resolvedIssues,
        blockingIssues,
        backlogIssues,
        modifiedFiles,
        businessImpact: businessImpactData,
        skillScore,
        metadata
      };
      
      // Generate and save report
      const report = await this.reportFormatter.generateReport(result, config.name);
      await this.saveReport(report, prNumber);
      
      this.logger.log('✅ Analysis complete!');
      
    } catch (error) {
      this.logger.error('❌ Analysis failed:', error);
      throw error;
    }
  }
  
  /**
   * Load model configurations from Supabase
   */
  protected async loadModelConfigs(): Promise<void> {
    try {
      const { data, error } = await this.supabase
        .from('model_configurations')
        .select('*')
        .order('last_updated', { ascending: false });
      
      if (error) throw error;
      
      // Store configs in map for quick lookup
      for (const config of data || []) {
        this.modelConfigs.set(config.agent_name, config);
      }
      
      this.logger.log(`📊 Loaded ${this.modelConfigs.size} model configurations`);
    } catch (error) {
      this.logger.warn('Failed to load model configs, using defaults:', error);
    }
  }
  
  /**
   * Get model configuration for a specific agent
   */
  protected async getModelForAgent(role: string): Promise<any> {
    // Check cached configs first
    if (this.modelConfigs.has(role)) {
      const config = this.modelConfigs.get(role)!;
      return {
        id: config.model_id,
        temperature: config.temperature,
        maxTokens: config.max_tokens
      };
    }
    
    // Fallback to dynamic selection
    const requirements = {
      role,
      description: `Agent for ${role}`,
      repositorySize: 'medium' as const,
      weights: { quality: 0.7, speed: 0.2, cost: 0.1 }
    };
    
    const { primary } = await this.modelSelector.selectModelsForRole(requirements);
    return primary;
  }
  
  /**
   * Prepare repositories for analysis
   */
  protected async prepareRepositories(
    repoUrl: string, 
    prNumber: number
  ): Promise<{ mainPath: string; prPath: string; modifiedFiles: string[] }> {
    // Parse GitHub URL
    const urlParts = repoUrl.replace('https://github.com/', '').split('/');
    const owner = urlParts[0];
    const repo = urlParts[1].replace('.git', '');
    
    // Setup repository in cloud
    const mainWorkspace = await this.repoManager.setupRepository(repoUrl, 'main');

    // Create PR workspace in cloud
    const prWorkspace = await this.repoManager.createPRWorkspace(repoUrl, prNumber);

    // For cloud workspaces, we use workspace IDs instead of local paths
    const mainPath = mainWorkspace.cloudPath;
    const prPath = prWorkspace.cloudPath;

    // Get list of modified files
    const modifiedFiles = prWorkspace.modifiedFiles || [];
    
    return { mainPath, prPath, modifiedFiles };
  }
  
  /**
   * Get list of modified files between branches
   */
  protected async getModifiedFiles(mainPath: string, prPath: string): Promise<string[]> {
    try {
      const diff = execSync('git diff --name-only HEAD~1', { 
        cwd: prPath, 
        encoding: 'utf8' 
      });
      return diff.split('\n').filter(f => f.length > 0);
    } catch {
      return [];
    }
  }
  
  /**
   * Get code snippet for an issue
   */
  protected async getCodeSnippet(file: string, line: number, contextLines = 3): Promise<string> {
    try {
      const filePath = path.join(this.cachedWorkspacePath, file);
      const content = fs.readFileSync(filePath, 'utf8');
      const lines = content.split('\n');
      
      const startLine = Math.max(0, line - contextLines - 1);
      const endLine = Math.min(lines.length, line + contextLines);
      
      let snippet = '';
      for (let i = startLine; i < endLine; i++) {
        const lineNum = i + 1;
        const prefix = lineNum === line ? '>' : ' ';
        snippet += `${prefix} ${lineNum.toString().padStart(4)} | ${lines[i]}\n`;
      }
      
      return snippet;
    } catch (error) {
      this.logger.error(`Failed to get code snippet for ${file}:${line}`, error);
      return '// Code snippet unavailable';
    }
  }
  
  /**
   * Determine if smart file selection should be used based on repository size
   */
  protected async shouldUseSmartSelection(repoPath: string): Promise<boolean> {
    // Check if force full analysis is enabled
    if (this.analysisConfig.forceFullAnalysis) {
      this.logger.log('⚠️  Force full analysis enabled - analyzing entire repository');
      return false;
    }
    
    // Check if smart selection is disabled
    if (!this.analysisConfig.useSmartSelection) {
      return false;
    }
    
    try {
      // Count total files in repository
      const { stdout: fileCountOutput } = await promisify(exec)(
        `find ${repoPath} -type f \\( -name "*.java" -o -name "*.rs" -o -name "*.js" -o -name "*.ts" -o -name "*.py" -o -name "*.go" -o -name "*.rb" -o -name "*.cpp" -o -name "*.cs" \\) | wc -l`
      );
      const fileCount = parseInt(fileCountOutput.trim(), 10);
      
      // Count lines of code (LOC) in repository
      const { stdout: locOutput } = await promisify(exec)(
        `find ${repoPath} -type f \\( -name "*.java" -o -name "*.rs" -o -name "*.js" -o -name "*.ts" -o -name "*.py" -o -name "*.go" -o -name "*.rb" -o -name "*.cpp" -o -name "*.cs" \\) -exec wc -l {} + | tail -1 | awk '{print $1}'`
      );
      const lineCount = parseInt(locOutput.trim(), 10);
      
      // Use smart selection for large repositories (≥10,000 files OR ≥50,000 LOC)
      // IMPORTANT: V9 spec says <10,000 files should analyze ALL files
      if (fileCount >= 10000 || lineCount >= 50000) {
        this.logger.log(`📊 Large repository detected:`);
        this.logger.log(`   - Files: ${fileCount.toLocaleString()}`);
        this.logger.log(`   - Lines of code: ${lineCount.toLocaleString()}`);
        this.logger.log(`   → Using smart file selection (500 file limit)`);
        return true;
      } else {
        this.logger.log(`📊 Small/medium repository (< 10,000 files):`);
        this.logger.log(`   - Files: ${fileCount.toLocaleString()}`);
        this.logger.log(`   - Lines of code: ${lineCount.toLocaleString()}`);
        this.logger.log(`   → Analyzing ALL files (100% coverage)`);
        return false;
      }
    } catch (error) {
      this.logger.warn('Failed to count files/LOC, defaulting to full analysis:', error);
      return false;
    }
  }
  
  /**
   * Run language-specific tools on both branches
   */
  protected async analyzeWithTools(
    mainPath: string, 
    prPath: string, 
    modifiedFiles: string[],
    repoUrl: string,
    prNumber: number,
    useSmartSelection: boolean
  ): Promise<{ mainIssues: Issue[]; prIssues: Issue[] }> {
    const mainIssues: Issue[] = [];
    const prIssues: Issue[] = [];
    
    // Store workspace path for code snippet retrieval
    this.cachedWorkspacePath = prPath;
    
    const config = this.getLanguageConfig();
    
    // Get selected files if using smart selection
    let selectedFiles: SelectedFiles | null = null;
    if (useSmartSelection) {
      try {
        const urlParts = repoUrl.replace('https://github.com/', '').split('/');
        const baseBranch = 'main';
        const prBranch = `pr-${prNumber}`;
        
        selectedFiles = await this.fileSelector.selectFiles({
          repository: repoUrl,
          prNumber,
          baseBranch,
          prBranch,
          language: config.name.toLowerCase(),
          maxFiles: this.analysisConfig.maxFiles,
          repoPath: prPath
        });
        
        this.logger.log(`📁 Smart selection: ${selectedFiles.totalSelected} files selected for analysis`);
        this.logger.log(`   - PR changes: ${selectedFiles.prChangedFiles.length}`);
        this.logger.log(`   - Critical files: ${selectedFiles.criticalFiles.length}`);
        this.logger.log(`   - Entry points: ${selectedFiles.entryPoints.length}`);
      } catch (error) {
        this.logger.warn('Smart file selection failed, falling back to full analysis:', error);
        selectedFiles = null;
      }
    }
    
    for (const tool of config.tools) {
      try {
        // Build command with file selection if applicable
        let mainCommand = tool.command;
        let prCommand = tool.command;
        
        if (selectedFiles && selectedFiles.totalSelected > 0) {
          // Modify command to only analyze selected files
          const fileList = Array.from(new Set([
            ...selectedFiles.prChangedFiles,
            ...selectedFiles.criticalFiles,
            ...selectedFiles.entryPoints,
            ...selectedFiles.configFiles
          ])).join(' ');
          
          // Adjust command based on tool (this is tool-specific)
          if (tool.name === 'spotbugs' || tool.name === 'pmd') {
            // These tools can accept file lists
            mainCommand = tool.command.replace(/\.$/, fileList);
            prCommand = tool.command.replace(/\.$/, fileList);
          }
        }
        
        // Analyze main branch
        const mainOutput = execSync(mainCommand, { 
          cwd: mainPath, 
          encoding: 'utf8',
          maxBuffer: 10 * 1024 * 1024 // 10MB buffer
        });
        const mainToolIssues = await tool.parser(mainOutput, mainPath);
        
        // Filter issues to selected files if using smart selection
        const filteredMainIssues = this.filterIssuesToSelectedFiles(mainToolIssues, selectedFiles);
        
        // Add code snippets to issues
        for (const issue of filteredMainIssues) {
          issue.codeSnippet = await this.getCodeSnippet(issue.file, issue.line);
        }
        mainIssues.push(...filteredMainIssues);
        
        // Analyze PR branch
        const prOutput = execSync(prCommand, { 
          cwd: prPath, 
          encoding: 'utf8',
          maxBuffer: 10 * 1024 * 1024
        });
        const prToolIssues = await tool.parser(prOutput, prPath);
        
        // Filter issues to selected files if using smart selection
        const filteredPrIssues = this.filterIssuesToSelectedFiles(prToolIssues, selectedFiles);
        
        // Add code snippets to issues
        for (const issue of filteredPrIssues) {
          issue.codeSnippet = await this.getCodeSnippet(issue.file, issue.line);
        }
        prIssues.push(...filteredPrIssues);
        
      } catch (error: any) {
        this.logger.error(`Tool ${tool.name} failed:`, error.message);
      }
    }
    
    if (selectedFiles) {
      this.logger.log(`✅ Analysis complete: ${mainIssues.length} issues in main, ${prIssues.length} issues in PR`);
    }
    
    return { mainIssues, prIssues };
  }
  
  /**
   * Filter issues to only those in selected files
   */
  protected filterIssuesToSelectedFiles(issues: Issue[], selectedFiles: SelectedFiles | null): Issue[] {
    if (!selectedFiles || selectedFiles.totalSelected === 0) {
      return issues;
    }
    
    const allSelectedFiles = new Set([
      ...selectedFiles.prChangedFiles,
      ...selectedFiles.criticalFiles,
      ...selectedFiles.entryPoints,
      ...selectedFiles.configFiles,
      ...selectedFiles.testFiles
    ]);
    
    return issues.filter(issue => {
      // Check if issue file is in selected files
      return Array.from(allSelectedFiles).some(file => 
        issue.file === file || issue.file.endsWith('/' + file)
      );
    });
  }
  
  /**
   * Generate decision reason
   */
  protected generateDecisionReason(
    decision: string, 
    blockingIssues: Issue[], 
    score: number
  ): string {
    if (decision === 'approved') {
      if (blockingIssues.length === 0) {
        return `Code quality meets standards with a score of ${score.toFixed(1)}/100. No blocking issues found.`;
      } else {
        return `Despite ${blockingIssues.length} issue(s), code quality score of ${score.toFixed(1)}/100 meets minimum requirements.`;
      }
    } else {
      if (blockingIssues.length > 0) {
        const critical = blockingIssues.filter(i => i.severity === 'critical').length;
        const high = blockingIssues.filter(i => i.severity === 'high').length;
        
        if (critical > 0) {
          return `${critical} critical issue(s) must be resolved before merging. Code quality score: ${score.toFixed(1)}/100.`;
        } else if (high > 0) {
          return `${high} high-priority issue(s) in modified files require attention. Code quality score: ${score.toFixed(1)}/100.`;
        }
      }
      return `Code quality score of ${score.toFixed(1)}/100 is below the required threshold of 70/100.`;
    }
  }
  
  /**
   * Count files in directory
   */
  protected async countFiles(dirPath: string): Promise<number> {
    try {
      const output = execSync('find . -type f -name "*.rs" -o -name "*.java" -o -name "*.py" -o -name "*.js" -o -name "*.ts" | wc -l', {
        cwd: dirPath,
        encoding: 'utf8'
      });
      return parseInt(output.trim(), 10);
    } catch {
      return 0;
    }
  }
  
  /**
   * Save report to file
   */
  protected async saveReport(report: string, prNumber: number): Promise<void> {
    const reportDir = path.join(process.cwd(), 'reports');
    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true });
    }
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const reportPath = path.join(reportDir, `v8-pr-${prNumber}-${timestamp}.md`);
    
    fs.writeFileSync(reportPath, report);
    this.logger.log(`📄 Report saved to: ${reportPath}`);
  }
}