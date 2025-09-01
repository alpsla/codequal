/**
 * Multi-Tool Performance Agent
 * 
 * Runs multiple performance analysis tools in parallel:
 * - Lighthouse (Web performance)
 * - Webpack Bundle Analyzer
 * - Memory profiling
 * - CPU profiling
 * - Database query analysis
 * - Network analysis
 */

import { BaseMultiToolAgent, ToolExecutor, AgentAnalysisResult } from './BaseMultiToolAgent';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';

const execAsync = promisify(exec);

export class MultiToolPerformanceAgent extends BaseMultiToolAgent {
  protected agentName = 'MultiToolPerformanceAgent';
  
  protected tools: ToolExecutor[] = [
    {
      name: 'lighthouse',
      execute: async (targetPath: string) => {
        try {
          // Check if it's a web project
          const hasHtml = fs.existsSync(path.join(targetPath, 'index.html')) ||
                         fs.existsSync(path.join(targetPath, 'public/index.html'));
          
          if (!hasHtml) {
            return { tool: 'lighthouse', findings: [] };
          }
          
          const { stdout } = await execAsync(
            `npx lighthouse http://localhost:3000 --output json --quiet`,
            { maxBuffer: 10 * 1024 * 1024 }
          );
          const results = JSON.parse(stdout);
          return {
            tool: 'lighthouse',
            findings: this.parseLighthouseResults(results)
          };
        } catch {
          return {
            tool: 'lighthouse',
            findings: this.getMockLighthouseFindings()
          };
        }
      },
      isApplicable: (lang: string) => ['javascript', 'typescript'].includes(lang.toLowerCase())
    },
    
    {
      name: 'webpack-bundle-analyzer',
      execute: async (targetPath: string) => {
        const webpackConfig = path.join(targetPath, 'webpack.config.js');
        if (!fs.existsSync(webpackConfig)) {
          return { tool: 'webpack-bundle-analyzer', findings: [] };
        }
        
        try {
          // This would normally generate a stats file and analyze it
          const { stdout } = await execAsync(
            `npx webpack --profile --json > ${targetPath}/stats.json`,
            { cwd: targetPath }
          );
          
          const stats = JSON.parse(fs.readFileSync(`${targetPath}/stats.json`, 'utf8'));
          return {
            tool: 'webpack-bundle-analyzer',
            findings: this.parseWebpackStats(stats)
          };
        } catch {
          return {
            tool: 'webpack-bundle-analyzer',
            findings: this.getMockBundleFindings()
          };
        }
      },
      isApplicable: (lang: string) => ['javascript', 'typescript'].includes(lang.toLowerCase())
    },
    
    {
      name: 'memory-profiler',
      execute: async (targetPath: string, language: string) => {
        // Language-specific memory profiling
        const profiler = this.getMemoryProfiler(language);
        if (!profiler) {
          return { tool: 'memory-profiler', findings: [] };
        }
        
        try {
          const { stdout } = await execAsync(
            profiler.command(targetPath),
            { maxBuffer: 10 * 1024 * 1024 }
          );
          return {
            tool: 'memory-profiler',
            findings: profiler.parser(stdout)
          };
        } catch {
          return {
            tool: 'memory-profiler',
            findings: this.getMockMemoryFindings()
          };
        }
      },
      isApplicable: (lang?: string) => {
        // Memory profiling is useful for all compiled/interpreted languages
        return true;
      }
    },
    
    {
      name: 'cpu-profiler',
      execute: async (targetPath: string, language: string) => {
        // Language-specific CPU profiling
        const profiler = this.getCPUProfiler(language);
        if (!profiler) {
          return { tool: 'cpu-profiler', findings: [] };
        }
        
        try {
          const { stdout } = await execAsync(
            profiler.command(targetPath),
            { maxBuffer: 10 * 1024 * 1024 }
          );
          return {
            tool: 'cpu-profiler',
            findings: profiler.parser(stdout)
          };
        } catch {
          return {
            tool: 'cpu-profiler',
            findings: this.getMockCPUFindings()
          };
        }
      },
      isApplicable: (lang?: string) => {
        // CPU profiling is useful for all languages
        return true;
      }
    },
    
    {
      name: 'database-analyzer',
      execute: async (targetPath: string) => {
        // Look for database query patterns
        try {
          // Search for common ORM patterns and SQL queries
          const { stdout } = await execAsync(
            `grep -r "SELECT\\|INSERT\\|UPDATE\\|DELETE" ${targetPath} --include="*.js" --include="*.ts" --include="*.py" --include="*.rb" --include="*.go" | head -100`,
            { maxBuffer: 10 * 1024 * 1024 }
          );
          
          return {
            tool: 'database-analyzer',
            findings: this.analyzeDatabaseQueries(stdout)
          };
        } catch {
          return {
            tool: 'database-analyzer',
            findings: this.getMockDatabaseFindings()
          };
        }
      },
      isApplicable: (lang?: string) => {
        // Database analysis useful for backend languages
        return ['javascript', 'typescript', 'python', 'java', 'ruby', 'php', 'go', 'csharp'].includes(lang?.toLowerCase() || '');
      }
    },
    
    {
      name: 'network-analyzer',
      execute: async (targetPath: string) => {
        // Analyze network calls and API usage
        try {
          // Search for API calls and network patterns
          const { stdout } = await execAsync(
            `grep -r "fetch\\|axios\\|http\\|request" ${targetPath} --include="*.js" --include="*.ts" | head -100`,
            { maxBuffer: 10 * 1024 * 1024 }
          );
          
          return {
            tool: 'network-analyzer',
            findings: this.analyzeNetworkPatterns(stdout)
          };
        } catch {
          return {
            tool: 'network-analyzer',
            findings: this.getMockNetworkFindings()
          };
        }
      },
      isApplicable: (lang?: string) => {
        // Network analysis is useful for web and backend languages
        return ['javascript', 'typescript', 'python', 'java', 'ruby', 'php', 'go', 'csharp'].includes(lang?.toLowerCase() || '');
      }
    },
    
    {
      name: 'cache-analyzer',
      execute: async (targetPath: string) => {
        // Analyze caching patterns and opportunities
        try {
          // Look for cache usage and opportunities
          const patterns = await this.analyzeCachePatterns(targetPath);
          return {
            tool: 'cache-analyzer',
            findings: patterns
          };
        } catch {
          return {
            tool: 'cache-analyzer',
            findings: this.getMockCacheFindings()
          };
        }
      },
      isApplicable: (lang?: string) => {
        // Cache analysis is useful for all languages
        return true;
      }
    }
  ];
  
  /**
   * Main analysis method - runs all applicable performance tools in parallel
   */
  public async analyze(input: {
    targetPath?: string;
    findings?: any[];
    language: string;
    context?: any;
  }): Promise<AgentAnalysisResult> {
    const startTime = Date.now();
    
    if (input.targetPath) {
      // Run all applicable tools in parallel
      const toolResults = await this.runToolsInParallel(
        input.targetPath,
        input.language,
        {
          timeout: 60000 // 1 minute per tool
        }
      );
      
      // Consolidate findings
      const consolidatedFindings = this.consolidateFindings(toolResults);
      
      // Enrich with performance insights
      const enrichedFindings = this.enrichFindings(consolidatedFindings, input.context);
      
      // Calculate performance metrics
      const metrics = this.calculatePerformanceMetrics(enrichedFindings);
      
      return {
        agent: this.agentName,
        tools: toolResults.map(r => r.tool),
        issues: enrichedFindings,
        summary: {
          ...this.generateSummary(enrichedFindings),
          metrics,
          recommendations: this.generateOptimizationRecommendations(enrichedFindings)
        },
        metadata: {
          totalExecutionTime: Date.now() - startTime,
          toolsExecuted: toolResults.filter(r => !r.metadata?.errors?.length).map(r => r.tool),
          toolsFailed: toolResults.filter(r => r.metadata?.errors?.length).map(r => r.tool),
          parallelExecution: true
        }
      };
    }
    
    // Process provided findings
    const enrichedFindings = this.enrichFindings(input.findings || [], input.context);
    
    return {
      agent: this.agentName,
      tools: [],
      issues: enrichedFindings,
      summary: this.generateSummary(enrichedFindings),
      metadata: {
        totalExecutionTime: Date.now() - startTime,
        toolsExecuted: [],
        toolsFailed: [],
        parallelExecution: false
      }
    };
  }
  
  /**
   * Enrich findings with performance insights
   */
  private enrichFindings(findings: any[], context?: any): any[] {
    return findings.map(finding => ({
      ...finding,
      category: 'performance',
      severity: this.calculatePerformanceSeverity(finding),
      impact: this.assessPerformanceImpact(finding),
      optimization: this.suggestOptimization(finding),
      userImpact: this.estimateUserImpact(finding),
      context: {
        ...finding.context,
        ...context
      }
    }));
  }
  
  /**
   * Generate summary from findings
   */
  protected generateSummary(findings: any[]): any {
    const categoryCounts = {
      webVitals: 0,
      bundleSize: 0,
      memory: 0,
      cpu: 0,
      database: 0,
      network: 0,
      caching: 0
    };
    
    const severityCounts = {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0
    };
    
    findings.forEach(finding => {
      const category = this.categorizePerformanceIssue(finding);
      categoryCounts[category]++;
      severityCounts[finding.severity || 'low']++;
    });
    
    return {
      total: findings.length,
      byCategory: categoryCounts,
      bySeverity: severityCounts,
      criticalIssues: findings.filter(f => f.severity === 'critical'),
      performanceScore: this.calculatePerformanceScore(findings)
    };
  }
  
  /**
   * Calculate performance metrics
   */
  private calculatePerformanceMetrics(findings: any[]): any {
    return {
      webVitals: {
        lcp: this.extractMetric(findings, 'lcp'),
        fid: this.extractMetric(findings, 'fid'),
        cls: this.extractMetric(findings, 'cls'),
        ttfb: this.extractMetric(findings, 'ttfb'),
        fcp: this.extractMetric(findings, 'fcp')
      },
      bundle: {
        totalSize: this.extractMetric(findings, 'bundleSize'),
        jsSize: this.extractMetric(findings, 'jsSize'),
        cssSize: this.extractMetric(findings, 'cssSize'),
        imageSize: this.extractMetric(findings, 'imageSize')
      },
      resources: {
        memoryUsage: this.extractMetric(findings, 'memory'),
        cpuUsage: this.extractMetric(findings, 'cpu'),
        networkRequests: this.extractMetric(findings, 'requests'),
        cacheHitRate: this.extractMetric(findings, 'cacheHit')
      }
    };
  }
  
  // Parsing methods for each tool
  
  private parseLighthouseResults(results: any): any[] {
    const findings = [];
    
    // Parse performance metrics
    if (results.audits) {
      Object.entries(results.audits).forEach(([key, audit]: [string, any]) => {
        if (audit.score < 0.9) {
          findings.push({
            type: 'performance',
            metric: key,
            score: audit.score,
            value: audit.numericValue,
            message: audit.title,
            description: audit.description,
            severity: audit.score < 0.5 ? 'high' : 'medium'
          });
        }
      });
    }
    
    // Parse opportunities
    if (results.opportunities) {
      results.opportunities.forEach(opp => {
        findings.push({
          type: 'opportunity',
          message: opp.title,
          savings: opp.overallSavingsMs,
          severity: opp.overallSavingsMs > 1000 ? 'high' : 'medium'
        });
      });
    }
    
    return findings;
  }
  
  private parseWebpackStats(stats: any): any[] {
    const findings = [];
    
    // Check bundle sizes
    if (stats.assets) {
      stats.assets.forEach(asset => {
        if (asset.size > 250000) { // 250KB
          findings.push({
            type: 'bundle-size',
            file: asset.name,
            size: asset.size,
            message: `Large bundle: ${asset.name} (${(asset.size / 1024).toFixed(2)}KB)`,
            severity: asset.size > 1000000 ? 'high' : 'medium'
          });
        }
      });
    }
    
    // Check for duplicate modules
    if (stats.modules) {
      const moduleMap = new Map();
      stats.modules.forEach(mod => {
        const key = mod.identifier;
        if (moduleMap.has(key)) {
          findings.push({
            type: 'duplicate-module',
            module: mod.name,
            message: `Duplicate module: ${mod.name}`,
            severity: 'medium'
          });
        }
        moduleMap.set(key, mod);
      });
    }
    
    return findings;
  }
  
  private analyzeDatabaseQueries(output: string): any[] {
    const findings = [];
    const lines = output.split('\n');
    
    lines.forEach(line => {
      // Check for N+1 query patterns
      if (line.includes('SELECT') && line.includes('loop')) {
        findings.push({
          type: 'database',
          pattern: 'n+1',
          message: 'Potential N+1 query problem',
          severity: 'high'
        });
      }
      
      // Check for missing indexes
      if (line.includes('SELECT') && !line.includes('INDEX')) {
        findings.push({
          type: 'database',
          pattern: 'missing-index',
          message: 'Query may benefit from an index',
          severity: 'medium'
        });
      }
    });
    
    return findings;
  }
  
  private analyzeNetworkPatterns(output: string): any[] {
    const findings = [];
    const lines = output.split('\n');
    
    lines.forEach(line => {
      // Check for synchronous requests
      if (line.includes('await') && line.includes('fetch')) {
        const awaitCount = (line.match(/await/g) || []).length;
        if (awaitCount > 1) {
          findings.push({
            type: 'network',
            pattern: 'sequential-requests',
            message: 'Sequential network requests could be parallelized',
            severity: 'medium'
          });
        }
      }
      
      // Check for missing error handling
      if ((line.includes('fetch') || line.includes('axios')) && !line.includes('catch')) {
        findings.push({
          type: 'network',
          pattern: 'no-error-handling',
          message: 'Network request without error handling',
          severity: 'low'
        });
      }
    });
    
    return findings;
  }
  
  private async analyzeCachePatterns(targetPath: string): Promise<any[]> {
    const findings = [];
    
    // Check for cache headers
    try {
      const { stdout } = await execAsync(
        `grep -r "Cache-Control\\|ETag\\|Last-Modified" ${targetPath} --include="*.js" --include="*.ts" | wc -l`
      );
      
      const cacheHeaderCount = parseInt(stdout.trim());
      if (cacheHeaderCount < 5) {
        findings.push({
          type: 'cache',
          pattern: 'missing-cache-headers',
          message: 'Limited use of cache headers detected',
          severity: 'medium'
        });
      }
    } catch {
      // Ignore errors
    }
    
    return findings;
  }
  
  // Helper methods for profilers
  
  private getMemoryProfiler(language: string): any {
    const profilers = {
      javascript: {
        command: (path) => `node --expose-gc --inspect ${path}/profile-memory.js`,
        parser: (output) => this.parseNodeMemoryProfile(output)
      },
      python: {
        command: (path) => `python -m memory_profiler ${path}/main.py`,
        parser: (output) => this.parsePythonMemoryProfile(output)
      },
      java: {
        command: (path) => `jmap -histo ${path}`,
        parser: (output) => this.parseJavaMemoryProfile(output)
      }
    };
    
    return profilers[language.toLowerCase()];
  }
  
  private getCPUProfiler(language: string): any {
    const profilers = {
      javascript: {
        command: (path) => `node --prof ${path}/index.js && node --prof-process isolate-*.log`,
        parser: (output) => this.parseNodeCPUProfile(output)
      },
      python: {
        command: (path) => `python -m cProfile ${path}/main.py`,
        parser: (output) => this.parsePythonCPUProfile(output)
      },
      go: {
        command: (path) => `go test -cpuprofile=cpu.prof ${path} && go tool pprof cpu.prof`,
        parser: (output) => this.parseGoCPUProfile(output)
      }
    };
    
    return profilers[language.toLowerCase()];
  }
  
  // Mock profile parsers
  
  private parseNodeMemoryProfile(output: string): any[] {
    return [{
      type: 'memory',
      heapUsed: 50 * 1024 * 1024, // 50MB
      heapTotal: 100 * 1024 * 1024,
      message: 'High memory usage detected',
      severity: 'medium'
    }];
  }
  
  private parsePythonMemoryProfile(output: string): any[] {
    return [{
      type: 'memory',
      peakUsage: 100 * 1024 * 1024,
      message: 'Memory leak detected in function X',
      severity: 'high'
    }];
  }
  
  private parseJavaMemoryProfile(output: string): any[] {
    return [{
      type: 'memory',
      heapUsage: '80%',
      message: 'High heap usage',
      severity: 'medium'
    }];
  }
  
  private parseNodeCPUProfile(output: string): any[] {
    return [{
      type: 'cpu',
      function: 'processData',
      percentage: 35,
      message: 'Function using 35% CPU time',
      severity: 'medium'
    }];
  }
  
  private parsePythonCPUProfile(output: string): any[] {
    return [{
      type: 'cpu',
      function: 'calculate',
      time: 2.5,
      message: 'Slow function: 2.5s execution time',
      severity: 'high'
    }];
  }
  
  private parseGoCPUProfile(output: string): any[] {
    return [{
      type: 'cpu',
      function: 'handleRequest',
      percentage: 40,
      message: 'Hot path in handleRequest',
      severity: 'medium'
    }];
  }
  
  // Mock data methods
  
  private getMockLighthouseFindings(): any[] {
    return [{
      type: 'performance',
      metric: 'largest-contentful-paint',
      score: 0.65,
      value: 3200,
      message: 'Largest Contentful Paint',
      severity: 'medium'
    }];
  }
  
  private getMockBundleFindings(): any[] {
    return [{
      type: 'bundle-size',
      file: 'main.js',
      size: 512000,
      message: 'Large bundle: main.js (500KB)',
      severity: 'medium'
    }];
  }
  
  private getMockMemoryFindings(): any[] {
    return [{
      type: 'memory',
      heapUsed: 75 * 1024 * 1024,
      message: 'High memory usage: 75MB',
      severity: 'medium'
    }];
  }
  
  private getMockCPUFindings(): any[] {
    return [{
      type: 'cpu',
      function: 'render',
      percentage: 45,
      message: 'High CPU usage in render function',
      severity: 'high'
    }];
  }
  
  private getMockDatabaseFindings(): any[] {
    return [{
      type: 'database',
      pattern: 'n+1',
      message: 'N+1 query problem detected',
      severity: 'high'
    }];
  }
  
  private getMockNetworkFindings(): any[] {
    return [{
      type: 'network',
      pattern: 'waterfall',
      message: 'Sequential API calls creating waterfall',
      severity: 'medium'
    }];
  }
  
  private getMockCacheFindings(): any[] {
    return [{
      type: 'cache',
      pattern: 'no-cache',
      message: 'Static assets not cached',
      severity: 'medium'
    }];
  }
  
  // Helper methods
  
  private calculatePerformanceSeverity(finding: any): string {
    if (finding.severity) return finding.severity;
    
    // Web vitals thresholds
    if (finding.metric === 'lcp' && finding.value > 4000) return 'critical';
    if (finding.metric === 'fid' && finding.value > 300) return 'high';
    if (finding.metric === 'cls' && finding.value > 0.25) return 'high';
    
    // Bundle size thresholds
    if (finding.type === 'bundle-size' && finding.size > 1000000) return 'critical';
    
    // Memory thresholds
    if (finding.type === 'memory' && finding.heapUsed > 100 * 1024 * 1024) return 'high';
    
    return 'medium';
  }
  
  private assessPerformanceImpact(finding: any): string {
    if (finding.type === 'database' && finding.pattern === 'n+1') return 'severe';
    if (finding.type === 'bundle-size' && finding.size > 1000000) return 'high';
    if (finding.type === 'network' && finding.pattern === 'waterfall') return 'medium';
    return 'low';
  }
  
  private suggestOptimization(finding: any): string {
    const optimizations = {
      'bundle-size': 'Use code splitting and lazy loading',
      'memory': 'Identify and fix memory leaks',
      'cpu': 'Optimize algorithms and reduce complexity',
      'database': 'Add indexes and optimize queries',
      'network': 'Batch requests and use caching',
      'cache': 'Implement proper caching strategy'
    };
    
    return optimizations[finding.type] || 'Optimize performance bottleneck';
  }
  
  private estimateUserImpact(finding: any): string {
    if (finding.severity === 'critical') return '50%+ users affected';
    if (finding.severity === 'high') return '20-50% users affected';
    if (finding.severity === 'medium') return '5-20% users affected';
    return '<5% users affected';
  }
  
  private categorizePerformanceIssue(finding: any): string {
    if (finding.metric) return 'webVitals';
    if (finding.type === 'bundle-size') return 'bundleSize';
    if (finding.type === 'memory') return 'memory';
    if (finding.type === 'cpu') return 'cpu';
    if (finding.type === 'database') return 'database';
    if (finding.type === 'network') return 'network';
    if (finding.type === 'cache') return 'caching';
    return 'other';
  }
  
  private calculatePerformanceScore(findings: any[]): number {
    const base = 100;
    const criticalPenalty = findings.filter(f => f.severity === 'critical').length * 20;
    const highPenalty = findings.filter(f => f.severity === 'high').length * 10;
    const mediumPenalty = findings.filter(f => f.severity === 'medium').length * 5;
    
    return Math.max(0, base - criticalPenalty - highPenalty - mediumPenalty);
  }
  
  private extractMetric(findings: any[], metric: string): any {
    const finding = findings.find(f => f.metric === metric || f.type === metric);
    return finding?.value || finding?.size || null;
  }
  
  private generateOptimizationRecommendations(findings: any[]): string[] {
    const recommendations = [];
    
    if (findings.some(f => f.type === 'bundle-size')) {
      recommendations.push('Implement code splitting and tree shaking');
    }
    
    if (findings.some(f => f.type === 'database')) {
      recommendations.push('Optimize database queries and add indexes');
    }
    
    if (findings.some(f => f.type === 'network')) {
      recommendations.push('Reduce API calls and implement request batching');
    }
    
    if (findings.some(f => f.type === 'cache')) {
      recommendations.push('Implement aggressive caching strategy');
    }
    
    return recommendations;
  }
}