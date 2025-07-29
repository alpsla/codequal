/**
 * Example: Reporting Agent using Tavily for Presentable Data Organization
 * Shows how Tavily helps organize web data into structured reports
 */

import { AgentRole } from '../core/interfaces';
import { toolResultsAggregator } from './tool-results-aggregator';

interface ReportSection {
  title: string;
  priority: 'high' | 'medium' | 'low';
  content: string;
  sources: string[];
  visualizationType?: 'chart' | 'table' | 'timeline' | 'diagram';
}

export class ReportingAgentWithTavily {
  role: AgentRole = 'reporting';
  
  async generateReport(repository: string, prNumber: number): Promise<any> {
    // Get pre-computed tool context including Tavily results
    const toolContext = await toolResultsAggregator.getToolContextForAgent(
      repository,
      prNumber,
      'reporting'
    );
    
    if (!toolContext) {
      throw new Error('No tool context found for reporting');
    }
    
    // Extract Tavily search results
    const tavilyChunks = toolContext.chunks.filter(c => c.toolId === 'tavily-mcp');
    
    // Organize data into presentable sections
    const reportSections: ReportSection[] = [];
    
    // 1. Executive Summary Section
    const executiveSummary = this.createExecutiveSummary(toolContext);
    reportSections.push(executiveSummary);
    
    // 2. Key Findings Section (organized from Tavily searches)
    const keyFindings = this.organizeKeyFindings(tavilyChunks);
    reportSections.push(keyFindings);
    
    // 3. Technical Details Section
    const technicalDetails = this.organizeTechnicalDetails(toolContext);
    reportSections.push(technicalDetails);
    
    // 4. External Resources Section (from Tavily)
    const externalResources = this.organizeExternalResources(tavilyChunks);
    reportSections.push(externalResources);
    
    // 5. Metrics Dashboard Section
    const metricsDashboard = this.createMetricsDashboard(toolContext);
    reportSections.push(metricsDashboard);
    
    // Generate final structured report
    return {
      title: `Code Review Report - PR #${prNumber}`,
      generatedAt: new Date(),
      sections: reportSections,
      metadata: {
        totalTools: toolContext.aggregatedMetrics.toolsExecuted.length,
        totalFindings: toolContext.aggregatedMetrics.totalFindings,
        criticalIssues: toolContext.aggregatedMetrics.criticalFindings,
        tavilySearches: toolContext.aggregatedMetrics.tavilySearches || 0
      },
      visualizations: this.generateVisualizations(toolContext)
    };
  }
  
  private createExecutiveSummary(context: any): ReportSection {
    return {
      title: 'Executive Summary',
      priority: 'high',
      content: `
        This pull request has been analyzed using ${context.aggregatedMetrics.toolsExecuted.length} tools.
        
        Key Statistics:
        • Total Issues Found: ${context.aggregatedMetrics.totalFindings}
        • Critical Issues: ${context.aggregatedMetrics.criticalFindings}
        • Web Searches Performed: ${context.aggregatedMetrics.tavilySearches || 0}
        
        The analysis covered security, code quality, dependencies, performance, and architecture aspects.
      `.trim(),
      sources: ['Automated Analysis'],
      visualizationType: 'chart'
    };
  }
  
  private organizeKeyFindings(tavilyChunks: any[]): ReportSection {
    // Organize Tavily findings into presentable categories
    const categories = new Map<string, any[]>();
    
    tavilyChunks.forEach(chunk => {
      chunk.chunk.findings.forEach((finding: any) => {
        const category = this.categorizeForPresentation(finding);
        if (!categories.has(category)) {
          categories.set(category, []);
        }
        categories.get(category)!.push(finding);
      });
    });
    
    // Format for presentation
    let content = '';
    categories.forEach((findings, category) => {
      content += `\n### ${category}\n\n`;
      
      // Sort by severity for better presentation
      findings.sort((a, b) => {
        const severityOrder = { critical: 0, high: 1, medium: 2, low: 3, info: 4 };
        return severityOrder[a.severity as keyof typeof severityOrder] - 
               severityOrder[b.severity as keyof typeof severityOrder];
      });
      
      findings.forEach(finding => {
        content += `**${finding.severity.toUpperCase()}**: ${finding.message}\n`;
        if (finding.documentation) {
          content += `> ${finding.documentation.substring(0, 200)}...\n`;
        }
        content += '\n';
      });
    });
    
    return {
      title: 'Key Findings & Recommendations',
      priority: 'high',
      content: content.trim(),
      sources: ['Tavily Web Search', 'Industry Best Practices'],
      visualizationType: 'table'
    };
  }
  
  private organizeTechnicalDetails(context: any): ReportSection {
    // Extract technical findings from all tools
    const technicalFindings = context.chunks
      .filter((c: any) => c.toolType === 'direct' || c.toolId.includes('semgrep') || c.toolId.includes('sonar'))
      .flatMap((c: any) => c.chunk.findings);
    
    // Group by file for better organization
    const byFile = new Map<string, any[]>();
    technicalFindings.forEach((finding: any) => {
      const file = finding.file || 'General';
      if (!byFile.has(file)) {
        byFile.set(file, []);
      }
      byFile.get(file)!.push(finding);
    });
    
    let content = '';
    byFile.forEach((findings, file) => {
      content += `\n### ${file}\n`;
      findings.forEach(f => {
        content += `- Line ${f.line || 'N/A'}: ${f.message}\n`;
      });
    });
    
    return {
      title: 'Technical Analysis Details',
      priority: 'medium',
      content: content.trim(),
      sources: context.aggregatedMetrics.toolsExecuted,
      visualizationType: 'diagram'
    };
  }
  
  private organizeExternalResources(tavilyChunks: any[]): ReportSection {
    // Extract all documentation and external resources from Tavily
    const resources: any[] = [];
    
    tavilyChunks.forEach(chunk => {
      chunk.chunk.findings
        .filter((f: any) => f.documentation || f.category === 'educational')
        .forEach((f: any) => {
          resources.push({
            title: f.message,
            description: f.documentation || '',
            relevance: f.severity === 'info' ? 'supplementary' : 'important'
          });
        });
    });
    
    // Organize by relevance
    const important = resources.filter(r => r.relevance === 'important');
    const supplementary = resources.filter(r => r.relevance === 'supplementary');
    
    let content = '';
    
    if (important.length > 0) {
      content += '### Important Resources\n\n';
      important.forEach(r => {
        content += `**${r.title}**\n`;
        content += `${r.description.substring(0, 300)}...\n\n`;
      });
    }
    
    if (supplementary.length > 0) {
      content += '### Additional Reading\n\n';
      supplementary.forEach(r => {
        content += `- ${r.title}\n`;
      });
    }
    
    return {
      title: 'External Resources & Documentation',
      priority: 'low',
      content: content.trim() || 'No external resources found.',
      sources: ['Tavily Web Search'],
      visualizationType: 'table'
    };
  }
  
  private createMetricsDashboard(context: any): ReportSection {
    // Aggregate all metrics from tools
    const allMetrics: Record<string, any> = {};
    
    context.chunks.forEach((chunk: any) => {
      Object.entries(chunk.chunk.metrics).forEach(([key, value]) => {
        allMetrics[key] = value;
      });
    });
    
    // Format as dashboard-ready content
    const content = '```json\n' + JSON.stringify(allMetrics, null, 2) + '\n```';
    
    return {
      title: 'Metrics Dashboard',
      priority: 'medium',
      content,
      sources: ['Automated Analysis Tools'],
      visualizationType: 'chart'
    };
  }
  
  private categorizeForPresentation(finding: any): string {
    // Smart categorization for better report organization
    if (finding.category) {
      return this.humanizeCategory(finding.category);
    }
    
    // Infer from content
    const message = finding.message.toLowerCase();
    if (message.includes('security') || message.includes('vulnerability')) {
      return 'Security Concerns';
    } else if (message.includes('performance') || message.includes('optimization')) {
      return 'Performance Optimizations';
    } else if (message.includes('best practice') || message.includes('pattern')) {
      return 'Best Practices';
    } else if (message.includes('dependency') || message.includes('package')) {
      return 'Dependencies & Libraries';
    }
    
    return 'General Findings';
  }
  
  private humanizeCategory(category: string): string {
    const categoryMap: Record<string, string> = {
      'security': 'Security Concerns',
      'code-quality': 'Code Quality Issues',
      'performance': 'Performance Optimizations',
      'architecture': 'Architecture & Design',
      'dependencies': 'Dependencies & Libraries',
      'educational': 'Learning Resources',
      'best-practices': 'Best Practices'
    };
    
    return categoryMap[category] || category.split('-').map(w => 
      w.charAt(0).toUpperCase() + w.slice(1)
    ).join(' ');
  }
  
  private generateVisualizations(context: any): any[] {
    return [
      {
        type: 'pie-chart',
        title: 'Issues by Severity',
        data: this.calculateSeverityDistribution(context)
      },
      {
        type: 'bar-chart',
        title: 'Findings by Tool',
        data: this.calculateToolDistribution(context)
      },
      {
        type: 'timeline',
        title: 'Analysis Timeline',
        data: this.createAnalysisTimeline(context)
      }
    ];
  }
  
  private calculateSeverityDistribution(context: any): any {
    const distribution = {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
      info: 0
    };
    
    context.chunks.forEach((chunk: any) => {
      chunk.chunk.findings.forEach((f: any) => {
        distribution[f.severity as keyof typeof distribution]++;
      });
    });
    
    return distribution;
  }
  
  private calculateToolDistribution(context: any): any {
    const distribution: Record<string, number> = {};
    
    context.chunks.forEach((chunk: any) => {
      distribution[chunk.toolId] = chunk.chunk.findings.length;
    });
    
    return distribution;
  }
  
  private createAnalysisTimeline(context: any): any[] {
    return context.chunks.map((chunk: any) => ({
      tool: chunk.toolId,
      timestamp: chunk.metadata.timestamp,
      duration: chunk.metadata.executionTime
    }));
  }
}