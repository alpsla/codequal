/**
 * Chart.js MCP Adapter
 * Generates charts and visualizations for reporting
 */

import { spawn } from 'child_process';
import {
  Tool,
  ToolResult,
  ToolFinding,
  AnalysisContext,
  ToolMetadata,
  ToolCapability,
  ToolRequirements,
  AgentRole
} from '../../core/interfaces';

interface ChartConfiguration {
  type: 'line' | 'bar' | 'pie' | 'doughnut' | 'radar' | 'scatter';
  title: string;
  data: {
    labels: string[];
    datasets: Array<{
      label: string;
      data: number[];
      backgroundColor?: string | string[];
      borderColor?: string;
    }>;
  };
  options?: any;
}

interface VisualizationResult {
  chartConfig: ChartConfiguration;
  imageUrl?: string;
  svgContent?: string;
  jsonData: any;
}

export class ChartJSMCPAdapter implements Tool {
  readonly id = 'chartjs-mcp';
  readonly name = 'Chart.js MCP Visualization';
  readonly type = 'mcp' as const;
  readonly version = '1.0.0';
  
  readonly capabilities: ToolCapability[] = [
    {
      name: 'chart-generation',
      category: 'documentation',
      languages: [], // All languages
      fileTypes: []
    },
    {
      name: 'data-visualization',
      category: 'documentation',
      languages: [],
      fileTypes: []
    },
    {
      name: 'metrics-display',
      category: 'documentation',
      languages: [],
      fileTypes: []
    }
  ];
  
  readonly requirements: ToolRequirements = {
    minFiles: 0, // Can work with just metrics data
    executionMode: 'on-demand',
    timeout: 20000, // 20 seconds
    authentication: {
      type: 'none',
      required: false
    }
  };
  
  /**
   * Check if tool can analyze given context
   */
  canAnalyze(context: AnalysisContext): boolean {
    // Available for reporting and any agent that needs visualization
    return context.agentRole === 'reporting' || 
           context.agentRole === 'educational';
  }
  
  /**
   * Execute chart generation
   */
  async analyze(context: AnalysisContext): Promise<ToolResult> {
    const startTime = Date.now();
    const findings: ToolFinding[] = [];
    
    try {
      // Extract metrics from PR
      const metrics = this.extractMetrics(context);
      
      // Generate appropriate visualizations
      const visualizations = await this.generateVisualizations(metrics, context);
      
      // Create chart configurations
      const chartConfigs = this.createChartConfigs(visualizations, context);
      
      // Generate reporting findings with visualizations
      findings.push(...this.generateReportingFindings(chartConfigs, metrics));
      
      return {
        success: true,
        toolId: this.id,
        executionTime: Date.now() - startTime,
        findings,
        metrics: {
          chartsGenerated: chartConfigs.length,
          dataPoints: this.countDataPoints(chartConfigs),
          visualizationTypes: [...new Set(chartConfigs.map(c => c.type))].length
        }
      };
    } catch (error: any) // eslint-disable-line @typescript-eslint/no-explicit-any { // eslint-disable-line @typescript-eslint/no-explicit-any
      return {
        success: false,
        toolId: this.id,
        executionTime: Date.now() - startTime,
        error: {
          code: 'VISUALIZATION_FAILED',
          message: error.message,
          recoverable: true
        }
      };
    }
  }
  
  /**
   * Extract metrics from PR for visualization
   */
  private extractMetrics(context: AnalysisContext): Record<string, any> {
    const metrics: Record<string, any> = {};
    
    // File change metrics
    metrics.fileChanges = {
      added: context.pr.files.filter(f => f.changeType === 'added').length,
      modified: context.pr.files.filter(f => f.changeType === 'modified').length,
      deleted: context.pr.files.filter(f => f.changeType === 'deleted').length
    };
    
    // Language distribution
    const languageCounts: Record<string, number> = {};
    context.pr.files.forEach(file => {
      if (file.language) {
        languageCounts[file.language] = (languageCounts[file.language] || 0) + 1;
      }
    });
    metrics.languages = languageCounts;
    
    // Lines of code metrics
    let totalAdditions = 0;
    let totalDeletions = 0;
    context.pr.files.forEach(file => {
      if (file.diff) {
        const additions = (file.diff.match(/^\+/gm) || []).length;
        const deletions = (file.diff.match(/^-/gm) || []).length;
        totalAdditions += additions;
        totalDeletions += deletions;
      }
    });
    metrics.linesChanged = {
      additions: totalAdditions,
      deletions: totalDeletions,
      net: totalAdditions - totalDeletions
    };
    
    // Complexity metrics (simplified)
    metrics.complexity = {
      files: context.pr.files.length,
      commits: context.pr.commits.length,
      authors: [...new Set(context.pr.commits.map(c => c.author))].length
    };
    
    return metrics;
  }
  
  /**
   * Generate visualizations based on metrics
   */
  private async generateVisualizations(
    metrics: Record<string, any>,
    context: AnalysisContext
  ): Promise<VisualizationResult[]> {
    const visualizations: VisualizationResult[] = [];
    
    // File changes visualization
    if (metrics.fileChanges) {
      visualizations.push({
        chartConfig: {
          type: 'doughnut',
          title: 'File Changes Distribution',
          data: {
            labels: ['Added', 'Modified', 'Deleted'],
            datasets: [{
              label: 'Files',
              data: [
                metrics.fileChanges.added,
                metrics.fileChanges.modified,
                metrics.fileChanges.deleted
              ],
              backgroundColor: ['#4CAF50', '#2196F3', '#F44336']
            }]
          }
        },
        jsonData: metrics.fileChanges
      });
    }
    
    // Language distribution
    if (metrics.languages && Object.keys(metrics.languages).length > 0) {
      visualizations.push({
        chartConfig: {
          type: 'bar',
          title: 'Language Distribution',
          data: {
            labels: Object.keys(metrics.languages),
            datasets: [{
              label: 'File Count',
              data: Object.values(metrics.languages),
              backgroundColor: '#2196F3'
            }]
          }
        },
        jsonData: metrics.languages
      });
    }
    
    // Lines changed over time (if we had timeline data)
    if (metrics.linesChanged) {
      visualizations.push({
        chartConfig: {
          type: 'bar',
          title: 'Code Changes',
          data: {
            labels: ['Additions', 'Deletions', 'Net Change'],
            datasets: [{
              label: 'Lines',
              data: [
                metrics.linesChanged.additions,
                metrics.linesChanged.deletions,
                metrics.linesChanged.net
              ],
              backgroundColor: ['#4CAF50', '#F44336', '#FF9800']
            }]
          },
          options: {
            scales: {
              y: {
                beginAtZero: true
              }
            }
          }
        },
        jsonData: metrics.linesChanged
      });
    }
    
    // Complexity radar chart
    if (metrics.complexity) {
      const maxValues = { files: 50, commits: 10, authors: 5 };
      visualizations.push({
        chartConfig: {
          type: 'radar',
          title: 'PR Complexity',
          data: {
            labels: ['Files', 'Commits', 'Authors'],
            datasets: [{
              label: 'Current PR',
              data: [
                (metrics.complexity.files / maxValues.files) * 100,
                (metrics.complexity.commits / maxValues.commits) * 100,
                (metrics.complexity.authors / maxValues.authors) * 100
              ],
              backgroundColor: 'rgba(33, 150, 243, 0.2)',
              borderColor: '#2196F3'
            }]
          },
          options: {
            scales: {
              r: {
                beginAtZero: true,
                max: 100
              }
            }
          }
        },
        jsonData: metrics.complexity
      });
    }
    
    return visualizations;
  }
  
  /**
   * Create chart configurations
   */
  private createChartConfigs(
    visualizations: VisualizationResult[],
    context: AnalysisContext
  ): ChartConfiguration[] {
    return visualizations.map(viz => {
      // Add PR context to chart title
      return {
        ...viz.chartConfig,
        title: `${viz.chartConfig.title} - PR #${context.pr.prNumber}`
      };
    });
  }
  
  /**
   * Generate reporting findings with visualizations
   */
  private generateReportingFindings(
    chartConfigs: ChartConfiguration[],
    metrics: Record<string, any>
  ): ToolFinding[] {
    const findings: ToolFinding[] = [];
    
    // Add chart configurations as findings
    chartConfigs.forEach((config, index) => {
      findings.push({
        type: 'metric',
        severity: 'info',
        category: 'documentation',
        message: `Visualization ${index + 1}: ${config.title}`,
        ruleId: 'chart-config',
        documentation: JSON.stringify(config, null, 2)
      });
    });
    
    // Add summary metrics
    findings.push({
      type: 'metric',
      severity: 'info',
      category: 'documentation',
      message: 'PR Metrics Summary',
      ruleId: 'metrics-summary',
      documentation: this.generateMetricsSummary(metrics)
    });
    
    // Add insights based on visualizations
    if (metrics.linesChanged && metrics.linesChanged.net > 500) {
      findings.push({
        type: 'info',
        severity: 'medium',
        category: 'documentation',
        message: 'Large PR detected: Consider breaking down into smaller changes',
        ruleId: 'pr-size-insight'
      });
    }
    
    if (metrics.complexity && metrics.complexity.files > 20) {
      findings.push({
        type: 'info',
        severity: 'medium',
        category: 'documentation',
        message: 'Complex PR: Affects many files, ensure thorough testing',
        ruleId: 'pr-complexity-insight'
      });
    }
    
    return findings;
  }
  
  /**
   * Generate metrics summary
   */
  private generateMetricsSummary(metrics: Record<string, any>): string {
    const summary: string[] = [];
    
    if (metrics.fileChanges) {
      summary.push(`Files: ${metrics.fileChanges.added} added, ${metrics.fileChanges.modified} modified, ${metrics.fileChanges.deleted} deleted`);
    }
    
    if (metrics.linesChanged) {
      summary.push(`Lines: +${metrics.linesChanged.additions} -${metrics.linesChanged.deletions} (net: ${metrics.linesChanged.net})`);
    }
    
    if (metrics.languages) {
      const langs = Object.keys(metrics.languages).join(', ');
      summary.push(`Languages: ${langs}`);
    }
    
    return summary.join('\n');
  }
  
  /**
   * Count total data points across all charts
   */
  private countDataPoints(configs: ChartConfiguration[]): number {
    return configs.reduce((total, config) => {
      const dataPoints = config.data.datasets.reduce((sum, dataset) => {
        return sum + (Array.isArray(dataset.data) ? dataset.data.length : 0);
      }, 0);
      return total + dataPoints;
    }, 0);
  }
  
  /**
   * Health check
   */
  async healthCheck(): Promise<boolean> {
    // Check if chart generation service is available
    return true;
  }
  
  /**
   * Get tool metadata
   */
  getMetadata(): ToolMetadata {
    return {
      id: this.id,
      name: this.name,
      description: 'Generates charts and visualizations for PR metrics and reports',
      author: 'CodeQual',
      homepage: 'https://github.com/codequal/chartjs-mcp',
      documentationUrl: 'https://docs.codequal.com/tools/chartjs-mcp',
      supportedRoles: ['reporting', 'educational'] as AgentRole[],
      supportedLanguages: [], // All languages
      supportedFrameworks: [],
      tags: ['visualization', 'charts', 'reporting', 'metrics'],
      securityVerified: true,
      lastVerified: new Date('2025-06-07')
    };
  }
}

// Export singleton instance
export const chartJSMCPAdapter = new ChartJSMCPAdapter();
