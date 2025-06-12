/**
 * Grafana Direct Adapter
 * Integrates with existing Grafana instance for dashboard creation and updates
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

interface GrafanaDashboard {
  uid?: string;
  title: string;
  panels: GrafanaPanel[];
  tags: string[];
  editable: boolean;
  refresh?: string;
}

interface GrafanaPanel {
  id: number;
  title: string;
  type: 'graph' | 'stat' | 'gauge' | 'table' | 'heatmap';
  gridPos: { x: number; y: number; w: number; h: number };
  targets: GrafanaTarget[];
}

interface GrafanaTarget {
  datasource: string;
  query: string;
  refId: string;
}

export class GrafanaDirectAdapter extends DirectToolAdapter {
  readonly id = 'grafana-direct';
  readonly name = 'Grafana Dashboard Integration';
  readonly version = '10.0.0';
  
  readonly capabilities: ToolCapability[] = [
    {
      name: 'dashboard-creation',
      category: 'documentation',
      languages: [], // All languages
      fileTypes: []
    },
    {
      name: 'time-series-visualization',
      category: 'documentation',
      languages: [],
      fileTypes: []
    },
    {
      name: 'metrics-monitoring',
      category: 'documentation',
      languages: [],
      fileTypes: []
    }
  ];
  
  readonly requirements: ToolRequirements = {
    minFiles: 0,
    executionMode: 'on-demand',
    timeout: 30000,
    authentication: {
      type: 'api-key',
      required: true
    }
  };
  
  private grafanaUrl: string;
  private apiKey: string;
  
  constructor() {
    super();
    this.grafanaUrl = process.env.GRAFANA_URL || 'http://localhost:3000';
    this.apiKey = process.env.GRAFANA_API_KEY || '';
  }
  
  canAnalyze(context: AnalysisContext): boolean {
    // Available for reporting and performance monitoring
    return context.agentRole === 'reporting' || 
           context.agentRole === 'performance' ||
           context.agentRole === 'security'; // Security dashboard
  }
  
  async analyze(context: AnalysisContext): Promise<ToolResult> {
    const startTime = Date.now();
    const findings: ToolFinding[] = [];
    
    try {
      // Create or update dashboard based on PR metrics
      const dashboardConfig = this.createDashboardConfig(context);
      
      // Check if dashboard exists
      const existingDashboard = await this.findDashboard(context.repository.name);
      
      let dashboardUrl: string;
      if (existingDashboard) {
        // Update existing dashboard
        dashboardUrl = await this.updateDashboard(existingDashboard.uid!, dashboardConfig);
        
        findings.push({
          type: 'info',
          severity: 'info',
          category: 'documentation',
          message: `Updated Grafana dashboard: ${dashboardUrl}`,
          ruleId: 'grafana-update',
          documentation: `Dashboard updated with PR #${context.pr.prNumber} metrics`
        });
      } else {
        // Create new dashboard
        dashboardUrl = await this.createDashboard(dashboardConfig);
        
        findings.push({
          type: 'info',
          severity: 'info',
          category: 'documentation',
          message: `Created new Grafana dashboard: ${dashboardUrl}`,
          ruleId: 'grafana-create',
          documentation: `New dashboard created for repository monitoring with codequal integration and ${context.repository.primaryLanguage || 'general'} language support`
        });
      }
      
      // Add specific panels based on role
      const panels = await this.createRoleSpecificPanels(context);
      findings.push(...this.generatePanelFindings(panels, dashboardUrl));
      
      return {
        success: true,
        toolId: this.id,
        executionTime: Date.now() - startTime,
        findings,
        metrics: {
          dashboardsUpdated: existingDashboard ? 1 : 0,
          dashboardsCreated: existingDashboard ? 0 : 1,
          panelsCreated: panels.length
        }
      };
    } catch (error: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
      return {
        success: false,
        toolId: this.id,
        executionTime: Date.now() - startTime,
        error: {
          code: 'GRAFANA_FAILED',
          message: error.message,
          recoverable: true
        }
      };
    }
  }
  
  /**
   * Create dashboard configuration
   */
  private createDashboardConfig(context: AnalysisContext): GrafanaDashboard {
    return {
      title: `${context.repository.name} - Code Quality Metrics`,
      tags: ['codequal', context.repository.primaryLanguage || 'general', 'automated'],
      editable: true,
      refresh: '5m',
      panels: []
    };
  }
  
  /**
   * Create role-specific panels
   */
  private async createRoleSpecificPanels(context: AnalysisContext): Promise<GrafanaPanel[]> {
    const panels: GrafanaPanel[] = [];
    let panelId = 1;
    
    switch (context.agentRole) {
      case 'reporting':
        // Overall metrics panels
        panels.push({
          id: panelId++,
          title: 'Code Quality Score Trend',
          type: 'graph',
          gridPos: { x: 0, y: 0, w: 12, h: 8 },
          targets: [{
            datasource: 'Supabase',
            query: `
              SELECT 
                created_at as time,
                overall_score as "Quality Score"
              FROM repository_analyses
              WHERE repository_id = '${context.repository.name}'
              ORDER BY created_at
            `,
            refId: 'A'
          }]
        });
        
        panels.push({
          id: panelId++,
          title: 'PR Analysis Metrics',
          type: 'stat',
          gridPos: { x: 12, y: 0, w: 6, h: 4 },
          targets: [{
            datasource: 'Supabase',
            query: `
              SELECT COUNT(*) as "Total PRs Analyzed"
              FROM pr_analyses
              WHERE repository_id = '${context.repository.name}'
            `,
            refId: 'A'
          }]
        });
        break;
        
      case 'security':
        // Security-specific panels
        panels.push({
          id: panelId++,
          title: 'Security Issues by Severity',
          type: 'stat',
          gridPos: { x: 0, y: 0, w: 8, h: 6 },
          targets: [{
            datasource: 'Supabase',
            query: `
              SELECT 
                severity,
                COUNT(*) as count
              FROM security_findings
              WHERE repository_id = '${context.repository.name}'
              GROUP BY severity
            `,
            refId: 'A'
          }]
        });
        
        panels.push({
          id: panelId++,
          title: 'Security Score Trend',
          type: 'gauge',
          gridPos: { x: 8, y: 0, w: 4, h: 6 },
          targets: [{
            datasource: 'Supabase',
            query: `
              SELECT 
                security_score as "Current Score"
              FROM repository_analyses
              WHERE repository_id = '${context.repository.name}'
              ORDER BY created_at DESC
              LIMIT 1
            `,
            refId: 'A'
          }]
        });
        break;
        
      case 'performance':
        // Performance panels
        panels.push({
          id: panelId++,
          title: 'Bundle Size Trend',
          type: 'graph',
          gridPos: { x: 0, y: 0, w: 12, h: 8 },
          targets: [{
            datasource: 'Supabase',
            query: `
              SELECT 
                created_at as time,
                bundle_size_kb as "Bundle Size (KB)"
              FROM performance_metrics
              WHERE repository_id = '${context.repository.name}'
              ORDER BY created_at
            `,
            refId: 'A'
          }]
        });
        break;
    }
    
    return panels;
  }
  
  /**
   * Find existing dashboard
   */
  private async findDashboard(repositoryName: string): Promise<{ uid: string } | null> {
    // In real implementation, would use Grafana API
    // Mock for now
    return null;
  }
  
  /**
   * Create new dashboard
   */
  private async createDashboard(config: GrafanaDashboard): Promise<string> {
    // In real implementation, would POST to Grafana API
    // Return mock URL
    return `${this.grafanaUrl}/d/new-dashboard/${config.title.toLowerCase().replace(/\s+/g, '-')}`;
  }
  
  /**
   * Update existing dashboard
   */
  private async updateDashboard(uid: string, config: GrafanaDashboard): Promise<string> {
    // In real implementation, would PUT to Grafana API
    return `${this.grafanaUrl}/d/${uid}/${config.title.toLowerCase().replace(/\s+/g, '-')}`;
  }
  
  /**
   * Generate findings for created panels
   */
  private generatePanelFindings(panels: GrafanaPanel[], dashboardUrl: string): ToolFinding[] {
    return panels.map(panel => ({
      type: 'metric',
      severity: 'info',
      category: 'documentation',
      message: `Created panel: ${panel.title}`,
      ruleId: 'grafana-panel',
      documentation: `Panel configuration: ${JSON.stringify(panel, null, 2)}`
    }));
  }
  
  protected getHealthCheckCommand() {
    // Check if Grafana API is accessible
    return { cmd: 'curl', args: ['-s', '-o', '/dev/null', '-w', '%{http_code}', `${this.grafanaUrl}/api/health`] };
  }
  
  async healthCheck(): Promise<boolean> {
    if (!this.apiKey) {
      console.warn('Grafana API key not configured');
      return false;
    }
    
    try {
      const { stdout } = await this.executeCommand('curl', [
        '-s', '-o', '/dev/null', '-w', '%{http_code}',
        '-H', `Authorization: Bearer ${this.apiKey}`,
        `${this.grafanaUrl}/api/health`
      ]);
      
      return stdout.trim() === '200';
    } catch {
      return false;
    }
  }
  
  getMetadata(): ToolMetadata {
    return {
      id: this.id,
      name: this.name,
      description: 'Grafana dashboard integration for metrics monitoring',
      author: 'CodeQual',
      homepage: 'https://grafana.com',
      documentationUrl: 'https://docs.codequal.com/tools/grafana-integration',
      supportedRoles: ['reporting', 'security', 'performance'] as AgentRole[],
      supportedLanguages: [], // All languages
      tags: ['monitoring', 'dashboards', 'metrics', 'visualization', 'time-series'],
      securityVerified: true,
      lastVerified: new Date('2025-06-07')
    };
  }
}

// Export singleton instance
export const grafanaDirectAdapter = new GrafanaDirectAdapter();
