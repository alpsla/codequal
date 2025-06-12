/**
 * Bundlephobia Direct Adapter
 * Analyzes npm package bundle sizes using Bundlephobia API
 */

import { DirectToolAdapter } from './base-adapter';
import {
  ToolResult,
  ToolFinding,
  AnalysisContext,
  ToolMetadata,
  ToolCapability,
  ToolRequirements,
  AgentRole
} from '../../core/interfaces';

interface BundleInfo {
  name: string;
  version: string;
  gzip: number; // Size in bytes
  size: number; // Size in bytes
  dependencyCount: number;
  hasJSModule?: boolean;
  hasSideEffects?: boolean;
}

interface PackageJson {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
}

export class BundlephobiaDirectAdapter extends DirectToolAdapter {
  readonly id = 'bundlephobia-direct';
  readonly name = 'Bundlephobia Direct';
  readonly version = '1.0.0';
  
  private readonly API_BASE = 'https://bundlephobia.com/api';
  private readonly SIZE_THRESHOLDS = {
    small: 50 * 1024,      // 50KB
    medium: 200 * 1024,    // 200KB
    large: 500 * 1024,     // 500KB
    veryLarge: 1024 * 1024 // 1MB
  };
  
  readonly capabilities: ToolCapability[] = [
    {
      name: 'bundle-size-analysis',
      category: 'performance',
      languages: ['javascript', 'typescript'],
      fileTypes: ['package.json']
    },
    {
      name: 'dependency-weight',
      category: 'performance',
      languages: ['javascript', 'typescript'],
      fileTypes: ['package.json']
    }
  ];
  
  readonly requirements: ToolRequirements = {
    minFiles: 1,
    executionMode: 'on-demand',
    timeout: 60000, // 60s - API calls can be slow
    authentication: {
      type: 'none',
      required: false
    }
  };
  
  /**
   * Get health check command
   */
  protected getHealthCheckCommand(): { cmd: string; args: string[] } {
    return { cmd: 'echo', args: ['Bundlephobia API check'] };
  }
  
  /**
   * Check if tool can analyze given context
   */
  canAnalyze(context: AnalysisContext): boolean {
    // Only for performance agent
    if (context.agentRole !== 'performance') {
      return false;
    }
    
    // Check for package.json
    return context.pr.files.some(file => 
      file.path === 'package.json' || 
      file.path.endsWith('/package.json')
    );
  }
  
  /**
   * Execute bundle size analysis
   */
  async analyze(context: AnalysisContext): Promise<ToolResult> {
    const startTime = Date.now();
    
    try {
      // Find all package.json files
      const packageJsonFiles = context.pr.files.filter(file => 
        file.path.endsWith('package.json')
      );
      
      if (packageJsonFiles.length === 0) {
        return this.createEmptyResult(startTime);
      }
      
      const findings: ToolFinding[] = [];
      const allBundleInfo: BundleInfo[] = [];
      
      // Analyze each package.json
      for (const packageFile of packageJsonFiles) {
        try {
          // Parse package.json content
          const packageJson: PackageJson = JSON.parse(packageFile.content);
          
          // Get all production dependencies
          const dependencies = Object.entries(packageJson.dependencies || {});
          
          if (dependencies.length === 0) {
            continue;
          }
          
          // Analyze bundle sizes (with rate limiting)
          const bundleInfos = await this.analyzeDependencies(dependencies);
          allBundleInfo.push(...bundleInfos);
          
          // Generate findings
          const dirFindings = this.generateFindings(
            bundleInfos, 
            packageFile.path
          );
          findings.push(...dirFindings);
          
        } catch (error) {
          console.warn(`Error analyzing ${packageFile.path}:`, error);
        }
      }
      
      // Calculate metrics
      const metrics = this.calculateMetrics(allBundleInfo);
      
      return {
        success: true,
        toolId: this.id,
        executionTime: Date.now() - startTime,
        findings,
        metrics
      };
    } catch (error) {
      return {
        success: false,
        toolId: this.id,
        executionTime: Date.now() - startTime,
        error: {
          code: 'BUNDLEPHOBIA_FAILED',
          message: error instanceof Error ? error.message : String(error),
          recoverable: true
        }
      };
    }
  }
  
  /**
   * Analyze dependencies using Bundlephobia API
   */
  private async analyzeDependencies(
    dependencies: Array<[string, string]>
  ): Promise<BundleInfo[]> {
    const bundleInfos: BundleInfo[] = [];
    
    // Analyze top 20 dependencies (to avoid rate limiting)
    const topDeps = dependencies.slice(0, 20);
    
    for (const [name, version] of topDeps) {
      try {
        const info = await this.fetchBundleInfo(name, version);
        if (info) {
          bundleInfos.push(info);
        }
        
        // Rate limiting - wait 100ms between requests
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        console.warn(`Failed to fetch bundle info for ${name}@${version}:`, error);
      }
    }
    
    return bundleInfos;
  }
  
  /**
   * Fetch bundle info from Bundlephobia API
   */
  private async fetchBundleInfo(
    packageName: string, 
    version: string
  ): Promise<BundleInfo | null> {
    try {
      // Clean version string (remove ^, ~, etc.)
      const cleanVersion = version.replace(/^[\^~]/, '');
      
      // Bundlephobia API endpoint
      const url = `${this.API_BASE}/size?package=${encodeURIComponent(packageName)}@${encodeURIComponent(cleanVersion)}`;
      
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'CodeQual/1.0'
        }
      });
      
      if (!response.ok) {
        return null;
      }
      
      const data = await response.json();
      
      return {
        name: packageName,
        version: cleanVersion,
        gzip: (data as any).gzip || 0,
        size: (data as any).size || 0,
        dependencyCount: (data as any).dependencyCount || 0,
        hasJSModule: (data as any).hasJSModule,
        hasSideEffects: (data as any).hasSideEffects
      };
    } catch (error) {
      return null;
    }
  }
  
  /**
   * Generate findings from bundle analysis
   */
  private generateFindings(
    bundleInfos: BundleInfo[], 
    filePath: string
  ): ToolFinding[] {
    const findings: ToolFinding[] = [];
    
    // Find large bundles
    const largePackages = bundleInfos.filter(b => b.gzip > this.SIZE_THRESHOLDS.large);
    const veryLargePackages = bundleInfos.filter(b => b.gzip > this.SIZE_THRESHOLDS.veryLarge);
    
    // Critical: Very large packages
    if (veryLargePackages.length > 0) {
      findings.push({
        type: 'issue',
        severity: 'critical',
        category: 'performance',
        message: `🚨 ${veryLargePackages.length} dependencies exceed 1MB (gzipped)`,
        ruleId: 'excessive-bundle-size',
        file: filePath,
        documentation: this.formatLargeBundles(veryLargePackages, 'critical')
      });
    }
    
    // High: Large packages
    if (largePackages.length > 0) {
      findings.push({
        type: 'issue',
        severity: 'high',
        category: 'performance',
        message: `⚠️ ${largePackages.length} dependencies are larger than 500KB (gzipped)`,
        ruleId: 'large-bundle-size',
        file: filePath,
        documentation: this.formatLargeBundles(largePackages, 'warning')
      });
    }
    
    // Calculate total bundle size
    const totalSize = bundleInfos.reduce((sum, b) => sum + b.gzip, 0);
    if (totalSize > 5 * 1024 * 1024) { // 5MB total
      findings.push({
        type: 'issue',
        severity: 'high',
        category: 'performance',
        message: `📦 Total bundle size is ${this.formatSize(totalSize)} (gzipped)`,
        ruleId: 'total-bundle-excessive',
        file: filePath,
        documentation: this.generateBundleReport(bundleInfos)
      });
    }
    
    // Check for packages without ES modules
    const noESModules = bundleInfos.filter(b => b.hasJSModule === false);
    if (noESModules.length > 3) {
      findings.push({
        type: 'suggestion',
        severity: 'medium',
        category: 'performance',
        message: `🎯 ${noESModules.length} dependencies don't support ES modules`,
        ruleId: 'no-esm-support',
        file: filePath,
        documentation: this.formatNoESModules(noESModules)
      });
    }
    
    // Packages with many sub-dependencies
    const heavyDeps = bundleInfos.filter(b => b.dependencyCount > 50);
    if (heavyDeps.length > 0) {
      findings.push({
        type: 'issue',
        severity: 'medium',
        category: 'performance',
        message: `🕸️ ${heavyDeps.length} dependencies have 50+ sub-dependencies`,
        ruleId: 'heavy-dependencies',
        file: filePath,
        documentation: this.formatHeavyDependencies(heavyDeps)
      });
    }
    
    // Optimization suggestions
    const optimizationCandidates = this.findOptimizationCandidates(bundleInfos);
    if (optimizationCandidates.length > 0) {
      findings.push({
        type: 'info',
        severity: 'low',
        category: 'performance',
        message: `💡 ${optimizationCandidates.length} optimization opportunities found`,
        ruleId: 'bundle-optimization',
        file: filePath,
        documentation: this.formatOptimizations(optimizationCandidates)
      });
    }
    
    return findings;
  }
  
  /**
   * Calculate metrics from bundle analysis
   */
  private calculateMetrics(bundleInfos: BundleInfo[]): Record<string, any> {
    const totalGzipSize = bundleInfos.reduce((sum, b) => sum + b.gzip, 0);
    const totalSize = bundleInfos.reduce((sum, b) => sum + b.size, 0);
    const avgGzipSize = bundleInfos.length > 0 ? totalGzipSize / bundleInfos.length : 0;
    
    // Calculate performance score (0-10)
    const performanceScore = this.calculatePerformanceScore(bundleInfos);
    
    return {
      totalDependencies: bundleInfos.length,
      totalBundleSize: totalSize,
      totalGzipSize: totalGzipSize,
      averagePackageSize: Math.round(avgGzipSize),
      largestPackages: bundleInfos
        .sort((a, b) => b.gzip - a.gzip)
        .slice(0, 5)
        .map(b => ({ name: b.name, size: b.gzip })),
      performanceScore,
      bundleSizeBreakdown: {
        small: bundleInfos.filter(b => b.gzip < this.SIZE_THRESHOLDS.small).length,
        medium: bundleInfos.filter(b => 
          b.gzip >= this.SIZE_THRESHOLDS.small && b.gzip < this.SIZE_THRESHOLDS.medium
        ).length,
        large: bundleInfos.filter(b => 
          b.gzip >= this.SIZE_THRESHOLDS.medium && b.gzip < this.SIZE_THRESHOLDS.large
        ).length,
        veryLarge: bundleInfos.filter(b => b.gzip >= this.SIZE_THRESHOLDS.large).length
      },
      esmSupport: {
        withESM: bundleInfos.filter(b => b.hasJSModule === true).length,
        withoutESM: bundleInfos.filter(b => b.hasJSModule === false).length
      }
    };
  }
  
  /**
   * Calculate performance score based on bundle sizes
   */
  private calculatePerformanceScore(bundleInfos: BundleInfo[]): number {
    if (bundleInfos.length === 0) return 10;
    
    let score = 10;
    
    // Deduct for large packages
    const largeCount = bundleInfos.filter(b => b.gzip > this.SIZE_THRESHOLDS.large).length;
    const veryLargeCount = bundleInfos.filter(b => b.gzip > this.SIZE_THRESHOLDS.veryLarge).length;
    
    score -= (largeCount * 0.5);
    score -= (veryLargeCount * 1.5);
    
    // Deduct for total size
    const totalSize = bundleInfos.reduce((sum, b) => sum + b.gzip, 0);
    if (totalSize > 10 * 1024 * 1024) score -= 2; // >10MB
    else if (totalSize > 5 * 1024 * 1024) score -= 1; // >5MB
    
    // Bonus for ES modules support
    const esmRatio = bundleInfos.filter(b => b.hasJSModule).length / bundleInfos.length;
    score += (esmRatio * 0.5);
    
    return Math.max(0, Math.min(10, Math.round(score * 10) / 10));
  }
  
  /**
   * Find optimization candidates
   */
  private findOptimizationCandidates(bundleInfos: BundleInfo[]): Array<{
    package: string;
    suggestion: string;
    impact: string;
  }> {
    const candidates: Array<{ package: string; suggestion: string; impact: string }> = [];
    
    // Check for common heavy packages with lighter alternatives
    const alternatives: Record<string, { alternative: string; savings: string }> = {
      'moment': { alternative: 'dayjs or date-fns', savings: '~70%' },
      'lodash': { alternative: 'lodash-es or individual imports', savings: '~50%' },
      'jquery': { alternative: 'vanilla JS or modern framework', savings: '100%' },
      'axios': { alternative: 'native fetch or ky', savings: '~80%' },
      'underscore': { alternative: 'lodash-es or native methods', savings: '~60%' }
    };
    
    bundleInfos.forEach(info => {
      const alt = alternatives[info.name];
      if (alt && info.gzip > this.SIZE_THRESHOLDS.medium) {
        candidates.push({
          package: info.name,
          suggestion: `Consider replacing with ${alt.alternative}`,
          impact: `Could save ${alt.savings} of bundle size`
        });
      }
    });
    
    return candidates;
  }
  
  /**
   * Format size in human-readable format
   */
  private formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
  }
  
  /**
   * Format large bundles documentation
   */
  private formatLargeBundles(packages: BundleInfo[], severity: string): string {
    let doc = severity === 'critical' 
      ? '🚨 These packages significantly impact load time:\n\n'
      : '⚠️ These packages add substantial weight to your bundle:\n\n';
    
    packages
      .sort((a, b) => b.gzip - a.gzip)
      .forEach(pkg => {
        doc += `• **${pkg.name}** (${pkg.version}): ${this.formatSize(pkg.gzip)} gzipped\n`;
        if (pkg.dependencyCount > 20) {
          doc += `  └─ Has ${pkg.dependencyCount} sub-dependencies\n`;
        }
      });
    
    doc += '\n**Impact**: Each MB adds ~1s to load time on 3G networks.';
    doc += '\n\n**Solutions**:\n';
    doc += '• Use dynamic imports for large libraries\n';
    doc += '• Consider lighter alternatives\n';
    doc += '• Tree-shake unused code\n';
    doc += '• Load heavy dependencies asynchronously';
    
    return doc;
  }
  
  /**
   * Generate bundle report
   */
  private generateBundleReport(bundleInfos: BundleInfo[]): string {
    const sorted = bundleInfos.sort((a, b) => b.gzip - a.gzip);
    const top10 = sorted.slice(0, 10);
    
    let report = '## Bundle Size Report\n\n';
    report += '### Top 10 Largest Dependencies:\n\n';
    
    top10.forEach((pkg, i) => {
      const percentage = (pkg.gzip / sorted.reduce((sum, b) => sum + b.gzip, 0) * 100).toFixed(1);
      report += `${i + 1}. **${pkg.name}**: ${this.formatSize(pkg.gzip)} (${percentage}% of total)\n`;
    });
    
    report += '\n### Bundle Composition:\n';
    report += `• Total packages: ${bundleInfos.length}\n`;
    report += `• Total size: ${this.formatSize(sorted.reduce((sum, b) => sum + b.size, 0))}\n`;
    report += `• Gzipped size: ${this.formatSize(sorted.reduce((sum, b) => sum + b.gzip, 0))}\n`;
    
    return report;
  }
  
  /**
   * Format packages without ES modules
   */
  private formatNoESModules(packages: BundleInfo[]): string {
    let doc = 'Packages without ES module support prevent effective tree-shaking:\n\n';
    
    packages.forEach(pkg => {
      doc += `• ${pkg.name} (${this.formatSize(pkg.gzip)})\n`;
    });
    
    doc += '\n**Impact**: Cannot tree-shake unused code, larger bundles.';
    doc += '\n**Solution**: Look for ESM versions or alternatives.';
    
    return doc;
  }
  
  /**
   * Format heavy dependencies
   */
  private formatHeavyDependencies(packages: BundleInfo[]): string {
    let doc = 'Packages with many sub-dependencies increase complexity and size:\n\n';
    
    packages
      .sort((a, b) => b.dependencyCount - a.dependencyCount)
      .forEach(pkg => {
        doc += `• **${pkg.name}**: ${pkg.dependencyCount} dependencies (${this.formatSize(pkg.gzip)})\n`;
      });
    
    doc += '\n**Risks**: Version conflicts, security vulnerabilities, larger attack surface.';
    
    return doc;
  }
  
  /**
   * Format optimization suggestions
   */
  private formatOptimizations(candidates: Array<{ package: string; suggestion: string; impact: string }>): string {
    let doc = '## Bundle Optimization Opportunities\n\n';
    
    candidates.forEach(candidate => {
      doc += `### ${candidate.package}\n`;
      doc += `• ${candidate.suggestion}\n`;
      doc += `• ${candidate.impact}\n\n`;
    });
    
    doc += '**Additional Tips**:\n';
    doc += '• Use webpack-bundle-analyzer to visualize your bundle\n';
    doc += '• Enable gzip/brotli compression on your server\n';
    doc += '• Consider code splitting for large applications';
    
    return doc;
  }
  
  /**
   * Create empty result
   */
  private createEmptyResult(startTime: number): ToolResult {
    return {
      success: true,
      toolId: this.id,
      executionTime: Date.now() - startTime,
      findings: [],
      metrics: {
        totalDependencies: 0,
        totalBundleSize: 0,
        totalGzipSize: 0,
        averagePackageSize: 0,
        largestPackages: [],
        performanceScore: 10,
        bundleSizeBreakdown: {
          small: 0,
          medium: 0,
          large: 0,
          veryLarge: 0
        },
        esmSupport: {
          withESM: 0,
          withoutESM: 0
        }
      } as any
    };
  }
  
  /**
   * Get tool metadata
   */
  getMetadata(): ToolMetadata {
    return {
      id: this.id,
      name: this.name,
      description: 'Analyzes npm package bundle sizes and their impact on performance',
      author: 'CodeQual',
      homepage: 'https://bundlephobia.com',
      documentationUrl: 'https://docs.codequal.com/tools/bundlephobia',
      supportedRoles: ['performance'] as AgentRole[],
      supportedLanguages: ['javascript', 'typescript'],
      supportedFrameworks: ['react', 'vue', 'angular', 'svelte', 'next', 'nuxt', 'gatsby'],
      tags: ['bundle', 'size', 'performance', 'optimization', 'dependencies', 'webpack'],
      securityVerified: true,
      lastVerified: new Date('2025-06-11')
    };
  }
}

// Export singleton instance
export const bundlephobiaDirectAdapter = new BundlephobiaDirectAdapter();
