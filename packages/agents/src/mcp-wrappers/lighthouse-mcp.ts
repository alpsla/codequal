import { exec } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';
import * as fs from 'fs';

const execAsync = promisify(exec);

interface LighthouseAudit {
  id: string;
  title: string;
  description: string;
  score: number | null;
  scoreDisplayMode: string;
  numericValue?: number;
  numericUnit?: string;
  displayValue?: string;
  warnings?: string[];
  details?: {
    type: string;
    items?: any[];
    headings?: any[];
  };
}

interface LighthouseCategory {
  id: string;
  title: string;
  score: number;
  auditRefs: Array<{
    id: string;
    weight: number;
    group?: string;
  }>;
}

interface LighthouseResult {
  requestedUrl: string;
  finalUrl: string;
  fetchTime: string;
  lighthouseVersion: string;
  categories: {
    performance?: LighthouseCategory;
    accessibility?: LighthouseCategory;
    'best-practices'?: LighthouseCategory;
    seo?: LighthouseCategory;
    pwa?: LighthouseCategory;
  };
  audits: Record<string, LighthouseAudit>;
  timing: {
    total: number;
  };
}

interface MCPPerformanceFinding {
  type: 'performance';
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  category: string;
  metric: string;
  message: string;
  score: number;
  impact: string;
  value?: number;
  unit?: string;
  url?: string;
  recommendations?: string[];
  resources?: Array<{
    url: string;
    size?: number;
    wastedBytes?: number;
    wastedMs?: number;
  }>;
}

export class LighthouseMCP {
  private readonly performanceMetrics = [
    'first-contentful-paint',
    'largest-contentful-paint',
    'total-blocking-time',
    'cumulative-layout-shift',
    'speed-index',
    'time-to-interactive',
    'first-meaningful-paint',
    'max-potential-fid'
  ];

  private readonly criticalAudits = [
    'render-blocking-resources',
    'unused-javascript',
    'unused-css-rules',
    'unminified-javascript',
    'unminified-css',
    'uses-responsive-images',
    'offscreen-images',
    'uses-optimized-images',
    'uses-webp-images',
    'efficient-animated-content',
    'duplicated-javascript',
    'legacy-javascript'
  ];

  /**
   * Analyzes performance using Lighthouse
   * @param url URL to analyze (for web apps)
   * @param options Lighthouse options
   * @returns MCP-formatted performance findings
   */
  async analyzeURL(url: string, options?: {
    device?: 'mobile' | 'desktop';
    throttling?: boolean;
    onlyCategories?: string[];
  }) {
    try {
      // Build Lighthouse command
      const command = this.buildLighthouseCommand(url, options);
      
      // Execute Lighthouse
      const { stdout } = await execAsync(command, {
        timeout: 120000, // 2 minute timeout
        maxBuffer: 50 * 1024 * 1024 // 50MB buffer
      });
      
      // Parse results
      const result: LighthouseResult = JSON.parse(stdout);
      
      // Convert to MCP format
      return {
        tool: 'lighthouse',
        success: true,
        url: result.finalUrl,
        findings: this.convertToMCPFormat(result),
        metrics: this.extractMetrics(result),
        scores: this.extractScores(result)
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Analyzes bundle size and performance for static files
   */
  async analyzeBundleSize(buildPath: string) {
    try {
      // Find all JS and CSS files
      const files = await this.findStaticAssets(buildPath);
      
      // Analyze each file
      const findings: MCPPerformanceFinding[] = [];
      let totalSize = 0;
      let totalGzipSize = 0;
      
      for (const file of files) {
        const stats = fs.statSync(file);
        const size = stats.size;
        totalSize += size;
        
        // Check if file is too large
        if (size > 244 * 1024) { // 244KB threshold
          findings.push({
            type: 'performance',
            severity: 'high',
            category: 'bundle-size',
            metric: 'large-bundle',
            message: `Large bundle detected: ${path.basename(file)}`,
            score: 0,
            impact: 'Increases load time and bandwidth usage',
            value: size,
            unit: 'bytes',
            recommendations: [
              'Consider code splitting',
              'Remove unused dependencies',
              'Use dynamic imports for large libraries'
            ]
          });
        }
        
        // Estimate gzip size
        const gzipSize = await this.estimateGzipSize(file);
        totalGzipSize += gzipSize;
      }
      
      return {
        tool: 'lighthouse',
        success: true,
        type: 'bundle-analysis',
        findings,
        metrics: {
          totalFiles: files.length,
          totalSize,
          totalGzipSize,
          averageSize: Math.round(totalSize / files.length),
          largeFiles: findings.length
        }
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Analyzes runtime performance using Chrome DevTools Protocol
   */
  async analyzeRuntime(url: string, scenario?: string) {
    try {
      // This would use Puppeteer or Playwright for runtime analysis
      // For now, we'll use Lighthouse with performance hints
      const command = `npx lighthouse ${url} --only-categories=performance --output=json --chrome-flags="--headless"`;
      
      const { stdout } = await execAsync(command, {
        timeout: 180000, // 3 minute timeout
        maxBuffer: 50 * 1024 * 1024
      });
      
      const result: LighthouseResult = JSON.parse(stdout);
      
      // Extract runtime metrics
      const runtimeMetrics = this.extractRuntimeMetrics(result);
      
      return {
        tool: 'lighthouse',
        success: true,
        type: 'runtime-analysis',
        scenario,
        findings: this.convertRuntimeMetrics(runtimeMetrics),
        metrics: runtimeMetrics
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Builds Lighthouse command
   */
  private buildLighthouseCommand(url: string, options?: any): string {
    const baseCommand = 'npx lighthouse';
    const outputFormat = '--output=json';
    const chromeFlags = '--chrome-flags="--headless --no-sandbox"';
    
    const flags = [];
    
    // Device emulation
    if (options?.device === 'desktop') {
      flags.push('--preset=desktop');
    } else {
      flags.push('--preset=mobile'); // Default to mobile
    }
    
    // Throttling
    if (options?.throttling === false) {
      flags.push('--throttling-method=provided');
    }
    
    // Categories
    if (options?.onlyCategories?.length) {
      flags.push(`--only-categories=${options.onlyCategories.join(',')}`);
    }
    
    // Quiet mode
    flags.push('--quiet');
    
    return `${baseCommand} ${url} ${outputFormat} ${chromeFlags} ${flags.join(' ')}`;
  }

  /**
   * Converts Lighthouse results to MCP format
   */
  private convertToMCPFormat(result: LighthouseResult): MCPPerformanceFinding[] {
    const findings: MCPPerformanceFinding[] = [];
    
    // Process performance metrics
    for (const metricId of this.performanceMetrics) {
      const audit = result.audits[metricId];
      if (!audit) continue;
      
      const severity = this.calculateSeverity(audit.score);
      
      findings.push({
        type: 'performance',
        severity,
        category: 'core-web-vitals',
        metric: metricId,
        message: audit.title,
        score: audit.score || 0,
        impact: audit.description,
        value: audit.numericValue,
        unit: audit.numericUnit
      });
    }
    
    // Process critical audits
    for (const auditId of this.criticalAudits) {
      const audit = result.audits[auditId];
      if (!audit || audit.score === 1) continue; // Skip passed audits
      
      const severity = this.calculateSeverity(audit.score);
      const recommendations = this.extractRecommendations(audit);
      
      findings.push({
        type: 'performance',
        severity,
        category: this.categorizeAudit(auditId),
        metric: auditId,
        message: audit.title,
        score: audit.score || 0,
        impact: audit.displayValue || audit.description,
        value: audit.numericValue,
        unit: audit.numericUnit,
        recommendations,
        resources: this.extractResources(audit)
      });
    }
    
    return findings;
  }

  /**
   * Calculates severity based on score
   */
  private calculateSeverity(score: number | null): MCPPerformanceFinding['severity'] {
    if (score === null) return 'info';
    if (score >= 0.9) return 'info';
    if (score >= 0.7) return 'low';
    if (score >= 0.5) return 'medium';
    if (score >= 0.3) return 'high';
    return 'critical';
  }

  /**
   * Categorizes audit by ID
   */
  private categorizeAudit(auditId: string): string {
    if (auditId.includes('render') || auditId.includes('paint')) return 'rendering';
    if (auditId.includes('javascript') || auditId.includes('js')) return 'javascript';
    if (auditId.includes('css') || auditId.includes('style')) return 'css';
    if (auditId.includes('image') || auditId.includes('webp')) return 'images';
    if (auditId.includes('font')) return 'fonts';
    if (auditId.includes('cache') || auditId.includes('cdn')) return 'caching';
    if (auditId.includes('network') || auditId.includes('request')) return 'network';
    return 'optimization';
  }

  /**
   * Extracts recommendations from audit
   */
  private extractRecommendations(audit: LighthouseAudit): string[] {
    const recommendations: string[] = [];
    
    // Add base recommendation
    if (audit.description) {
      recommendations.push(audit.description);
    }
    
    // Add specific recommendations based on audit type
    if (audit.id === 'render-blocking-resources') {
      recommendations.push('Defer non-critical CSS');
      recommendations.push('Inline critical CSS');
      recommendations.push('Use async/defer for scripts');
    } else if (audit.id === 'unused-javascript') {
      recommendations.push('Remove unused code');
      recommendations.push('Use code splitting');
      recommendations.push('Implement tree shaking');
    } else if (audit.id === 'uses-responsive-images') {
      recommendations.push('Serve images in next-gen formats');
      recommendations.push('Use srcset for responsive images');
      recommendations.push('Implement lazy loading');
    }
    
    return recommendations;
  }

  /**
   * Extracts resource details from audit
   */
  private extractResources(audit: LighthouseAudit): any[] {
    if (!audit.details?.items) return [];
    
    return audit.details.items.slice(0, 10).map(item => ({
      url: item.url,
      size: item.totalBytes,
      wastedBytes: item.wastedBytes,
      wastedMs: item.wastedMs
    }));
  }

  /**
   * Extracts key metrics from results
   */
  private extractMetrics(result: LighthouseResult) {
    const metrics: any = {
      performance: result.categories.performance?.score || 0,
      fcp: result.audits['first-contentful-paint']?.numericValue,
      lcp: result.audits['largest-contentful-paint']?.numericValue,
      tbt: result.audits['total-blocking-time']?.numericValue,
      cls: result.audits['cumulative-layout-shift']?.numericValue,
      si: result.audits['speed-index']?.numericValue,
      tti: result.audits['time-to-interactive']?.numericValue
    };
    
    return metrics;
  }

  /**
   * Extracts category scores
   */
  private extractScores(result: LighthouseResult) {
    return {
      performance: result.categories.performance?.score || 0,
      accessibility: result.categories.accessibility?.score || 0,
      bestPractices: result.categories['best-practices']?.score || 0,
      seo: result.categories.seo?.score || 0,
      pwa: result.categories.pwa?.score || 0
    };
  }

  /**
   * Extracts runtime metrics
   */
  private extractRuntimeMetrics(result: LighthouseResult) {
    return {
      jsExecutionTime: result.audits['mainthread-work-breakdown']?.numericValue,
      domSize: result.audits['dom-size']?.numericValue,
      bootupTime: result.audits['bootup-time']?.numericValue,
      memoryUsage: result.audits['total-byte-weight']?.numericValue,
      networkRequests: result.audits['network-requests']?.details?.items?.length || 0
    };
  }

  /**
   * Converts runtime metrics to findings
   */
  private convertRuntimeMetrics(metrics: any): MCPPerformanceFinding[] {
    const findings: MCPPerformanceFinding[] = [];
    
    if (metrics.jsExecutionTime > 3500) {
      findings.push({
        type: 'performance',
        severity: 'high',
        category: 'runtime',
        metric: 'js-execution-time',
        message: 'High JavaScript execution time',
        score: 0,
        impact: 'Causes UI freezing and poor interactivity',
        value: metrics.jsExecutionTime,
        unit: 'ms',
        recommendations: [
          'Reduce JavaScript bundle size',
          'Defer non-critical scripts',
          'Use web workers for heavy computations'
        ]
      });
    }
    
    if (metrics.domSize > 1500) {
      findings.push({
        type: 'performance',
        severity: 'medium',
        category: 'runtime',
        metric: 'dom-size',
        message: 'Large DOM size',
        score: 0,
        impact: 'Increases memory usage and style calculations',
        value: metrics.domSize,
        unit: 'nodes',
        recommendations: [
          'Implement virtual scrolling',
          'Paginate large lists',
          'Remove unnecessary DOM nodes'
        ]
      });
    }
    
    return findings;
  }

  /**
   * Finds static assets in build directory
   */
  private async findStaticAssets(buildPath: string): Promise<string[]> {
    const files: string[] = [];
    
    const walkDir = (dir: string) => {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        
        if (entry.isDirectory()) {
          walkDir(fullPath);
        } else if (entry.isFile()) {
          const ext = path.extname(entry.name);
          if (['.js', '.css', '.mjs', '.cjs'].includes(ext)) {
            files.push(fullPath);
          }
        }
      }
    };
    
    if (fs.existsSync(buildPath)) {
      walkDir(buildPath);
    }
    
    return files;
  }

  /**
   * Estimates gzip size of a file
   */
  private async estimateGzipSize(filePath: string): Promise<number> {
    try {
      const { stdout } = await execAsync(`gzip -c "${filePath}" | wc -c`);
      return parseInt(stdout.trim());
    } catch {
      // Fallback: estimate as 30% of original size
      const stats = fs.statSync(filePath);
      return Math.round(stats.size * 0.3);
    }
  }

  /**
   * Handles errors
   */
  private handleError(error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    if (errorMessage.includes('command not found')) {
      return {
        tool: 'lighthouse',
        success: false,
        error: 'Lighthouse is not installed. Please install it using: npm install -g lighthouse',
        findings: [],
        metrics: null
      };
    }
    
    return {
      tool: 'lighthouse',
      success: false,
      error: errorMessage,
      findings: [],
      metrics: null
    };
  }

  /**
   * Gets a performance summary
   */
  async getSummary(url: string): Promise<string> {
    const result = await this.analyzeURL(url);
    
    if (!result.success) {
      return `Error running Lighthouse: ${(result as any).error}`;
    }
    
    const scores = result.scores;
    const metrics = result.metrics;
    
    const parts = [];
    parts.push(`Performance: ${Math.round(scores.performance * 100)}/100`);
    
    if (metrics.fcp) parts.push(`FCP: ${Math.round(metrics.fcp)}ms`);
    if (metrics.lcp) parts.push(`LCP: ${Math.round(metrics.lcp)}ms`);
    if (metrics.tbt) parts.push(`TBT: ${Math.round(metrics.tbt)}ms`);
    if (metrics.cls) parts.push(`CLS: ${metrics.cls.toFixed(3)}`);
    
    return parts.join(', ');
  }

  /**
   * Checks if Lighthouse is installed
   */
  async isInstalled(): Promise<boolean> {
    try {
      await execAsync('npx lighthouse --version');
      return true;
    } catch {
      return false;
    }
  }
}

export default LighthouseMCP;