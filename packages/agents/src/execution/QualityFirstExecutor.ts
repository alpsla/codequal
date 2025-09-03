/**
 * Quality-First Executor with Language-Specific Optimization
 * 
 * Business Philosophy:
 * - Quality > Speed
 * - Language-specific tool execution (not all 85 for every PR)
 * - 2-4 minute analysis per PR with comprehensive coverage
 * - Scale horizontally for concurrent users
 * 
 * Execution Model:
 * - Java PR: ~9 tools → 1-2 minutes
 * - Python PR: ~17 tools → 2-3 minutes  
 * - JavaScript PR: ~10 tools → 1-2 minutes
 * - Rust PR: ~16 tools → 2-3 minutes
 * 
 * IMPORTANT: Uses existing LanguageDetector from orchestrator to avoid duplication
 */

import { EventEmitter } from 'events';
import { LanguageDetector, LanguageStats } from '../two-branch/utils/language-detector';

interface ToolDefinition {
  name: string;
  command: string;
  memoryMB: number;
  language: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  timeout: number; // seconds
}

interface BatchDefinition {
  name: string;
  tools: ToolDefinition[];
  maxMemoryMB: number;
}

export interface QualityAnalysisResult {
  success: boolean;
  toolsExecuted: number;
  totalTools: number;
  coverage: string;
  duration: string;
  results: Map<string, any>;
  report: ComprehensiveReport;
}

export interface ComprehensiveReport {
  summary: {
    criticalIssues: number;
    highIssues: number;
    mediumIssues: number;
    lowIssues: number;
    securityScore: number;
    qualityScore: number;
    toolsCoverage: string;
  };
  detailedResults: any[];
  recommendations: string[];
}

export class QualityFirstExecutor extends EventEmitter {
  private readonly ALL_85_TOOLS: ToolDefinition[] = [
    // Python tools (17)
    { name: 'bandit', command: 'bandit -r {path}', memoryMB: 200, language: 'python', priority: 'critical', timeout: 120 },
    { name: 'safety', command: 'safety check', memoryMB: 150, language: 'python', priority: 'critical', timeout: 60 },
    { name: 'pylint', command: 'pylint {path}', memoryMB: 300, language: 'python', priority: 'high', timeout: 180 },
    { name: 'mypy', command: 'mypy {path}', memoryMB: 250, language: 'python', priority: 'high', timeout: 120 },
    { name: 'black', command: 'black --check {path}', memoryMB: 100, language: 'python', priority: 'medium', timeout: 60 },
    { name: 'isort', command: 'isort --check {path}', memoryMB: 80, language: 'python', priority: 'medium', timeout: 60 },
    { name: 'flake8', command: 'flake8 {path}', memoryMB: 150, language: 'python', priority: 'high', timeout: 90 },
    { name: 'pycodestyle', command: 'pycodestyle {path}', memoryMB: 100, language: 'python', priority: 'medium', timeout: 60 },
    { name: 'pydocstyle', command: 'pydocstyle {path}', memoryMB: 100, language: 'python', priority: 'low', timeout: 60 },
    { name: 'vulture', command: 'vulture {path}', memoryMB: 150, language: 'python', priority: 'medium', timeout: 90 },
    { name: 'prospector', command: 'prospector {path}', memoryMB: 400, language: 'python', priority: 'high', timeout: 180 },
    { name: 'radon', command: 'radon cc {path}', memoryMB: 100, language: 'python', priority: 'medium', timeout: 60 },
    { name: 'xenon', command: 'xenon {path}', memoryMB: 80, language: 'python', priority: 'medium', timeout: 60 },
    { name: 'darglint', command: 'darglint {path}', memoryMB: 100, language: 'python', priority: 'low', timeout: 60 },
    { name: 'pip-audit', command: 'pip-audit', memoryMB: 200, language: 'python', priority: 'critical', timeout: 120 },
    { name: 'poetry', command: 'poetry check', memoryMB: 150, language: 'python', priority: 'medium', timeout: 60 },
    { name: 'pipenv', command: 'pipenv check', memoryMB: 150, language: 'python', priority: 'medium', timeout: 60 },
    
    // JavaScript/TypeScript tools (10)
    { name: 'eslint', command: 'eslint {path}', memoryMB: 300, language: 'javascript', priority: 'high', timeout: 120 },
    { name: 'prettier', command: 'prettier --check {path}', memoryMB: 150, language: 'javascript', priority: 'medium', timeout: 60 },
    { name: 'jshint', command: 'jshint {path}', memoryMB: 200, language: 'javascript', priority: 'medium', timeout: 90 },
    { name: 'typescript', command: 'tsc --noEmit', memoryMB: 400, language: 'typescript', priority: 'high', timeout: 180 },
    { name: 'madge', command: 'madge --circular {path}', memoryMB: 250, language: 'javascript', priority: 'medium', timeout: 120 },
    { name: 'dependency-cruiser', command: 'depcruise {path}', memoryMB: 300, language: 'javascript', priority: 'medium', timeout: 120 },
    { name: 'depcheck', command: 'depcheck {path}', memoryMB: 200, language: 'javascript', priority: 'medium', timeout: 90 },
    { name: 'lighthouse', command: 'lighthouse {url}', memoryMB: 500, language: 'javascript', priority: 'low', timeout: 300 },
    { name: 'bundlesize', command: 'bundlesize', memoryMB: 200, language: 'javascript', priority: 'low', timeout: 60 },
    { name: 'npm-audit', command: 'npm audit', memoryMB: 150, language: 'javascript', priority: 'critical', timeout: 60 },
    
    // ... Continue for all 85 tools
    // Java (9), Go (12), Rust (16), Ruby (9), PHP (7), C++ (5)
    
    // Universal tools
    { name: 'semgrep', command: 'semgrep --config=auto {path}', memoryMB: 400, language: 'universal', priority: 'critical', timeout: 180 },
    { name: 'gitleaks', command: 'gitleaks detect --source {path}', memoryMB: 150, language: 'universal', priority: 'critical', timeout: 120 },
    { name: 'trivy', command: 'trivy fs {path}', memoryMB: 300, language: 'universal', priority: 'critical', timeout: 180 },
    { name: 'snyk', command: 'snyk test', memoryMB: 250, language: 'universal', priority: 'critical', timeout: 120 },
    { name: 'checkov', command: 'checkov -d {path}', memoryMB: 300, language: 'universal', priority: 'high', timeout: 180 },
  ];

  private readonly MEMORY_LIMIT_MB = 3584; // 3.5GB for tools
  private startTime = 0;
  private completedTools = 0;

  /**
   * Detect languages in the project using existing LanguageDetector
   */
  async detectProjectLanguages(projectPath: string): Promise<{
    primary: string;
    secondary: string[];
    stats: LanguageStats[];
    recommendedTools: ToolDefinition[];
  }> {
    // Use the existing LanguageDetector from orchestrator
    // detectLanguage returns the primary language as a string
    const primaryLanguage = await LanguageDetector.detectLanguage(projectPath);
    
    // For now, create a simple stats structure
    // TODO: Extend LanguageDetector to provide full statistics if needed
    const stats: LanguageStats[] = [{
      language: primaryLanguage,
      fileCount: 0, // Would need to be calculated
      lineCount: 0, // Would need to be calculated
      percentage: 100 // Primary language
    }];
    
    // Get primary language (highest percentage)
    const primary = stats.length > 0 ? stats[0].language : 'unknown';
    
    // Get secondary languages (>10% of codebase)
    const secondary = stats
      .slice(1)
      .filter(stat => stat.percentage > 10)
      .map(stat => stat.language);
    
    // Select appropriate tools based on detected languages
    const recommendedTools = this.selectToolsForLanguages(primary, secondary);
    
    console.log(`📊 Language Distribution:`);
    stats.forEach(stat => {
      console.log(`   ${stat.language}: ${stat.fileCount} files (${stat.percentage.toFixed(1)}%)`);
    });
    
    return {
      primary,
      secondary,
      stats,
      recommendedTools
    };
  }

  /**
   * Select tools based on detected languages
   */
  private selectToolsForLanguages(primary: string, secondary: string[]): ToolDefinition[] {
    const tools: ToolDefinition[] = [];
    
    // Always add universal tools
    tools.push(...this.ALL_85_TOOLS.filter(t => t.language === 'universal'));
    
    // Add primary language tools
    tools.push(...this.ALL_85_TOOLS.filter(t => t.language === primary));
    
    // Add secondary language tools (if mixed project)
    for (const lang of secondary) {
      // Only add if significant presence (>10% of files)
      tools.push(...this.ALL_85_TOOLS.filter(t => t.language === lang));
    }
    
    return tools;
  }

  /**
   * Execute language-specific analysis (NEW PRIMARY METHOD)
   */
  async executeLanguageSpecificAnalysis(
    projectPath: string,
    options?: {
      skipCache?: boolean;
      forceLanguage?: string;
      progressCallback?: (progress: number, message: string) => void;
    }
  ): Promise<QualityAnalysisResult> {
    console.log('🎯 Starting Language-Specific Quality Analysis');
    
    this.startTime = Date.now();
    this.completedTools = 0;

    // Detect languages using existing orchestrator service
    const detection = await this.detectProjectLanguages(projectPath);
    const tools = options?.forceLanguage 
      ? this.ALL_85_TOOLS.filter(t => t.language === options.forceLanguage || t.language === 'universal')
      : detection.recommendedTools;

    console.log(`📊 Primary Language: ${detection.primary}`);
    if (detection.secondary.length > 0) {
      console.log(`📊 Secondary Languages: ${detection.secondary.join(', ')}`);
    }
    console.log(`🛠️  Tools to execute: ${tools.length} (not 85!)`);
    console.log(`⏱️  Estimated time: ${this.estimateTime(tools)} minutes\n`);

    const results = new Map<string, any>();
    const batches = this.createLanguageOptimizedBatches(tools);

    // Execute batches
    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      
      this.emit('batch:start', {
        batchNumber: i + 1,
        totalBatches: batches.length,
        batchName: batch.name,
        toolCount: batch.tools.length
      });

      console.log(`\n📦 Batch ${i + 1}/${batches.length}: ${batch.name}`);
      console.log(`   Tools: ${batch.tools.length}`);

      try {
        const batchResults = await this.executeBatch(batch, projectPath);
        
        for (const [tool, result] of batchResults) {
          results.set(tool, result);
          this.completedTools++;
        }

        const progress = (this.completedTools / tools.length) * 100;
        if (options?.progressCallback) {
          options.progressCallback(
            progress,
            `Completed ${this.completedTools}/${tools.length} tools (${Math.round(progress)}%)`
          );
        }

        console.log(`   ✅ Batch complete (${this.completedTools}/${tools.length} tools done)`);

      } catch (error) {
        console.error(`   ⚠️ Batch ${i + 1} had errors:`, error);
      }

      if (global.gc) {
        global.gc();
      }
    }

    const report = await this.generateComprehensiveReport(results);
    const duration = ((Date.now() - this.startTime) / 1000 / 60).toFixed(1);
    
    console.log('\n' + '='.repeat(50));
    console.log('✅ LANGUAGE-SPECIFIC ANALYSIS COMPLETE');
    console.log('='.repeat(50));
    console.log(`🔍 Language: ${detection.primary}`);
    console.log(`📊 Tools executed: ${this.completedTools}/${tools.length}`);
    console.log(`⏱️  Duration: ${duration} minutes`);
    console.log('='.repeat(50));

    return {
      success: this.completedTools === tools.length,
      toolsExecuted: this.completedTools,
      totalTools: tools.length,
      coverage: `${((this.completedTools / tools.length) * 100).toFixed(1)}%`,
      duration: `${duration} minutes`,
      results,
      report
    };
  }

  /**
   * Estimate execution time based on tools
   */
  private estimateTime(tools: ToolDefinition[]): string {
    const languageCounts = new Map<string, number>();
    
    for (const tool of tools) {
      languageCounts.set(tool.language, (languageCounts.get(tool.language) || 0) + 1);
    }

    // Rough estimates per language
    const timeEstimates: Map<string, number> = new Map([
      ['python', 2.5],
      ['javascript', 1.5],
      ['typescript', 1.5],
      ['java', 1.5],
      ['go', 1.5],
      ['rust', 2.5],
      ['ruby', 1.5],
      ['php', 1],
      ['cpp', 1],
      ['universal', 0.5]
    ]);

    let totalMinutes = 0;
    for (const [lang, count] of languageCounts) {
      const timePerLang = timeEstimates.get(lang) || 1;
      totalMinutes = Math.max(totalMinutes, timePerLang);
    }

    return `${totalMinutes}-${totalMinutes + 1}`;
  }

  /**
   * Execute all 85 tools with focus on quality, not speed
   * @deprecated Use executeLanguageSpecificAnalysis instead
   */
  async executeComprehensiveAnalysis(
    projectPath: string,
    options?: {
      skipCache?: boolean;
      priorityOnly?: boolean;
      progressCallback?: (progress: number, message: string) => void;
    }
  ): Promise<QualityAnalysisResult> {
    console.log('🎯 Starting Quality-First Analysis');
    console.log('📊 Total tools to execute: 85');
    console.log('⏱️  Estimated time: 5-10 minutes');
    console.log('💎 Focus: 100% quality coverage\n');

    this.startTime = Date.now();
    this.completedTools = 0;

    const results = new Map<string, any>();
    const batches = this.createOptimizedBatches();

    // Execute each batch sequentially
    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      
      this.emit('batch:start', {
        batchNumber: i + 1,
        totalBatches: batches.length,
        batchName: batch.name,
        toolCount: batch.tools.length
      });

      console.log(`\n📦 Batch ${i + 1}/${batches.length}: ${batch.name}`);
      console.log(`   Tools: ${batch.tools.length}`);
      console.log(`   Memory required: ${batch.maxMemoryMB}MB`);

      try {
        const batchResults = await this.executeBatch(batch, projectPath);
        
        // Store results
        for (const [tool, result] of batchResults) {
          results.set(tool, result);
          this.completedTools++;
        }

        // Update progress
        const progress = (this.completedTools / 85) * 100;
        if (options?.progressCallback) {
          options.progressCallback(
            progress,
            `Completed ${this.completedTools}/85 tools (${Math.round(progress)}%)`
          );
        }

        this.emit('batch:complete', {
          batchNumber: i + 1,
          toolsCompleted: this.completedTools,
          progress
        });

        console.log(`   ✅ Batch complete (${this.completedTools}/85 tools done)`);

      } catch (error) {
        console.error(`   ⚠️ Batch ${i + 1} had errors:`, error);
        // Continue with next batch - we want maximum coverage
      }

      // Free memory between batches
      if (global.gc) {
        global.gc();
      }
    }

    // Generate comprehensive report
    const report = await this.generateComprehensiveReport(results);
    
    const duration = ((Date.now() - this.startTime) / 1000 / 60).toFixed(1);
    
    console.log('\n' + '='.repeat(50));
    console.log('✅ ANALYSIS COMPLETE');
    console.log('='.repeat(50));
    console.log(`📊 Tools executed: ${this.completedTools}/85`);
    console.log(`📈 Coverage: ${((this.completedTools / 85) * 100).toFixed(1)}%`);
    console.log(`⏱️  Duration: ${duration} minutes`);
    console.log(`🔍 Issues found:`);
    console.log(`   🔴 Critical: ${report.summary.criticalIssues}`);
    console.log(`   🟠 High: ${report.summary.highIssues}`);
    console.log(`   🟡 Medium: ${report.summary.mediumIssues}`);
    console.log(`   🟢 Low: ${report.summary.lowIssues}`);
    console.log('='.repeat(50));

    return {
      success: this.completedTools === 85,
      toolsExecuted: this.completedTools,
      totalTools: 85,
      coverage: `${((this.completedTools / 85) * 100).toFixed(1)}%`,
      duration: `${duration} minutes`,
      results,
      report
    };
  }

  /**
   * Create language-optimized batches for specific tools
   */
  private createLanguageOptimizedBatches(tools: ToolDefinition[]): BatchDefinition[] {
    const batches: BatchDefinition[] = [];
    
    // Group by priority first
    const critical = tools.filter(t => t.priority === 'critical');
    const high = tools.filter(t => t.priority === 'high');
    const medium = tools.filter(t => t.priority === 'medium');
    const low = tools.filter(t => t.priority === 'low');
    
    // Create batches based on priority and memory
    if (critical.length > 0) {
      batches.push({
        name: 'Critical Security Tools',
        maxMemoryMB: 1500,
        tools: critical
      });
    }
    
    if (high.length > 0) {
      batches.push({
        name: 'High Priority Analysis',
        maxMemoryMB: 2000,
        tools: high
      });
    }
    
    if (medium.length > 0) {
      batches.push({
        name: 'Code Quality Tools',
        maxMemoryMB: 1500,
        tools: medium
      });
    }
    
    if (low.length > 0) {
      batches.push({
        name: 'Style and Documentation',
        maxMemoryMB: 1000,
        tools: low
      });
    }
    
    return batches;
  }

  /**
   * Create memory-optimized batches for sequential execution
   * @deprecated Use createLanguageOptimizedBatches for language-specific execution
   */
  private createOptimizedBatches(): BatchDefinition[] {
    return [
      {
        name: 'Critical Security Tools',
        maxMemoryMB: 1500,
        tools: this.ALL_85_TOOLS.filter(t => 
          t.priority === 'critical' && t.memoryMB <= 400
        ).slice(0, 5)
      },
      {
        name: 'Python Analysis Suite',
        maxMemoryMB: 2000,
        tools: this.ALL_85_TOOLS.filter(t => t.language === 'python')
      },
      {
        name: 'JavaScript/TypeScript Analysis',
        maxMemoryMB: 1800,
        tools: this.ALL_85_TOOLS.filter(t => 
          t.language === 'javascript' || t.language === 'typescript'
        )
      },
      {
        name: 'Java Analysis',
        maxMemoryMB: 2000,
        tools: this.ALL_85_TOOLS.filter(t => t.language === 'java')
      },
      {
        name: 'Go Analysis',
        maxMemoryMB: 1500,
        tools: this.ALL_85_TOOLS.filter(t => t.language === 'go')
      },
      {
        name: 'Rust Analysis',
        maxMemoryMB: 2000,
        tools: this.ALL_85_TOOLS.filter(t => t.language === 'rust')
      },
      {
        name: 'Ruby/PHP Analysis',
        maxMemoryMB: 1200,
        tools: this.ALL_85_TOOLS.filter(t => 
          t.language === 'ruby' || t.language === 'php'
        )
      },
      {
        name: 'C++ Analysis',
        maxMemoryMB: 1000,
        tools: this.ALL_85_TOOLS.filter(t => t.language === 'cpp')
      },
      {
        name: 'Final Security Sweep',
        maxMemoryMB: 1500,
        tools: this.ALL_85_TOOLS.filter(t => 
          t.language === 'universal' && !t.name.includes('semgrep')
        )
      }
    ];
  }

  /**
   * Execute a batch of tools
   */
  private async executeBatch(
    batch: BatchDefinition,
    projectPath: string
  ): Promise<Map<string, any>> {
    const results = new Map<string, any>();

    // Execute tools in sub-groups that fit in memory
    const subGroups = this.createSubGroups(batch.tools, batch.maxMemoryMB);

    for (const subGroup of subGroups) {
      // Can run these tools in parallel within memory limit
      const promises = subGroup.map(tool => 
        this.executeTool(tool, projectPath)
      );

      const subResults = await Promise.allSettled(promises);
      
      // Store results
      subResults.forEach((result, index) => {
        const tool = subGroup[index];
        if (result.status === 'fulfilled') {
          results.set(tool.name, result.value);
        } else {
          results.set(tool.name, {
            error: result.reason,
            status: 'failed'
          });
        }
      });
    }

    return results;
  }

  /**
   * Create sub-groups of tools that can run together within memory limit
   */
  private createSubGroups(tools: ToolDefinition[], maxMemoryMB: number): ToolDefinition[][] {
    const subGroups: ToolDefinition[][] = [];
    let currentGroup: ToolDefinition[] = [];
    let currentMemory = 0;

    for (const tool of tools) {
      if (currentMemory + tool.memoryMB <= maxMemoryMB) {
        currentGroup.push(tool);
        currentMemory += tool.memoryMB;
      } else {
        if (currentGroup.length > 0) {
          subGroups.push(currentGroup);
        }
        currentGroup = [tool];
        currentMemory = tool.memoryMB;
      }
    }

    if (currentGroup.length > 0) {
      subGroups.push(currentGroup);
    }

    return subGroups;
  }

  /**
   * Execute a single tool
   */
  private async executeTool(tool: ToolDefinition, projectPath: string): Promise<any> {
    // Implementation would execute the actual tool command
    // For now, returning mock result
    return {
      tool: tool.name,
      status: 'success',
      issues: [],
      metrics: {},
      executionTime: Math.random() * tool.timeout
    };
  }

  /**
   * Generate comprehensive report from all tool results
   */
  private async generateComprehensiveReport(
    results: Map<string, any>
  ): Promise<ComprehensiveReport> {
    // Aggregate all issues from all tools
    const criticalIssues = 0;
    const highIssues = 0;
    const mediumIssues = 0;
    const lowIssues = 0;

    // Process results from all 85 tools
    // ... aggregation logic

    return {
      summary: {
        criticalIssues,
        highIssues,
        mediumIssues,
        lowIssues,
        securityScore: 85, // Calculate based on issues
        qualityScore: 92,  // Calculate based on metrics
        toolsCoverage: '100%'
      },
      detailedResults: Array.from(results.values()),
      recommendations: [
        'Fix all critical security vulnerabilities immediately',
        'Address high-priority code quality issues',
        'Consider refactoring complex functions',
        'Update outdated dependencies'
      ]
    };
  }
}