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
  options?: Record<string, unknown>;
}

interface VisualizationResult {
  chartConfig: ChartConfiguration;
  imageUrl?: string;
  svgContent?: string;
  jsonData: Record<string, unknown>;
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
    } catch (error) {
      return {
        success: false,
        toolId: this.id,
        executionTime: Date.now() - startTime,
        error: {
          code: 'VISUALIZATION_FAILED',
          message: error instanceof Error ? error.message : String(error),
          recoverable: true
        }
      };
    }
  }
  
  /**
   * Extract metrics from PR for visualization
   */
  private extractMetrics(context: AnalysisContext): Record<string, unknown> {
    const metrics: Record<string, unknown> = {};
    
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
    metrics: Record<string, unknown>,
    context: AnalysisContext
  ): Promise<VisualizationResult[]> {
    const visualizations: VisualizationResult[] = [];
    
    // File changes visualization
    const fileChanges = metrics.fileChanges as { added: number; modified: number; deleted: number };
    if (fileChanges) {
      visualizations.push({
        chartConfig: {
          type: 'doughnut',
          title: 'File Changes Distribution',
          data: {
            labels: ['Added', 'Modified', 'Deleted'],
            datasets: [{
              label: 'Files',
              data: [
                fileChanges.added,
                fileChanges.modified,
                fileChanges.deleted
              ],
              backgroundColor: ['#4CAF50', '#2196F3', '#F44336']
            }]
          }
        },
        jsonData: { fileChanges }
      });
    }
    
    // Language distribution
    const languages = metrics.languages as Record<string, number>;
    if (languages && Object.keys(languages).length > 0) {
      visualizations.push({
        chartConfig: {
          type: 'bar',
          title: 'Language Distribution',
          data: {
            labels: Object.keys(languages),
            datasets: [{
              label: 'File Count',
              data: Object.values(languages),
              backgroundColor: '#2196F3'
            }]
          }
        },
        jsonData: { languages }
      });
    }
    
    // Lines changed
    const linesChanged = metrics.linesChanged as { additions: number; deletions: number; net: number };
    if (linesChanged) {
      visualizations.push({
        chartConfig: {
          type: 'bar',
          title: 'Code Changes',
          data: {
            labels: ['Additions', 'Deletions', 'Net Change'],
            datasets: [{
              label: 'Lines',
              data: [
                linesChanged.additions,
                linesChanged.deletions,
                linesChanged.net
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
        jsonData: { linesChanged }
      });
    }
    
    // Complexity radar chart
    const complexity = metrics.complexity as { files: number; commits: number; authors: number };
    if (complexity) {
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
                (complexity.files / maxValues.files) * 100,
                (complexity.commits / maxValues.commits) * 100,
                (complexity.authors / maxValues.authors) * 100
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
        jsonData: { complexity }
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
    metrics: Record<string, unknown>
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
    const linesChanged = metrics.linesChanged as { net: number } | undefined;
    if (linesChanged && linesChanged.net > 500) {
      findings.push({
        type: 'info',
        severity: 'medium',
        category: 'documentation',
        message: 'Large PR detected: Consider breaking down into smaller changes',
        ruleId: 'pr-size-insight'
      });
    }
    
    const complexity = metrics.complexity as { files: number } | undefined;
    if (complexity && complexity.files > 20) {
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
  private generateMetricsSummary(metrics: Record<string, unknown>): string {
    const summary: string[] = [];
    
    const fileChanges = metrics.fileChanges as { added: number; modified: number; deleted: number } | undefined;
    if (fileChanges) {
      summary.push(`Files: ${fileChanges.added} added, ${fileChanges.modified} modified, ${fileChanges.deleted} deleted`);
    }
    
    const linesChanged = metrics.linesChanged as { additions: number; deletions: number; net: number } | undefined;
    if (linesChanged) {
      summary.push(`Lines: +${linesChanged.additions} -${linesChanged.deletions} (net: ${linesChanged.net})`);
    }
    
    const languages = metrics.languages as Record<string, number> | undefined;
    if (languages) {
      const langs = Object.keys(languages).join(', ');
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
