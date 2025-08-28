/**
 * Performance Agent
 * Specialized agent for performance issue analysis
 */

import { BaseAgent } from '../base/base-agent';
import { AnalysisResult } from '../agent';
import { AgentCapability } from '../types/agent-types';

export interface PerformanceContext {
  repositoryPath: string;
  branchName: string;
  files: string[];
  benchmarks?: any;
  metrics?: PerformanceMetrics;
  toolResults?: any;
}

export interface PerformanceMetrics {
  executionTime: number;
  memoryUsage: number;
  cpuUtilization: number;
  diskIO: number;
  networkLatency: number;
}

export interface PerformanceIssue {
  id: string;
  type: 'memory-leak' | 'cpu-intensive' | 'slow-query' | 'blocking-operation' | 'resource-waste';
  severity: 'critical' | 'high' | 'medium' | 'low';
  category: string;
  title: string;
  description: string;
  location?: {
    file: string;
    line?: number;
    column?: number;
  };
  impact: string;
  suggestion: string;
  benchmarkData?: any;
}

export class PerformanceAgent extends BaseAgent {
  private readonly agentName = 'PerformanceAgent';
  
  capabilities: AgentCapability[] = [
    { 
      name: 'Memory Leak Detection', 
      description: 'Identify memory leaks and excessive allocations', 
      tools: ['valgrind', 'memory-profiler'] 
    },
    { 
      name: 'CPU Usage Analysis', 
      description: 'Analyze CPU-intensive operations', 
      tools: ['perf', 'cpu-profiler'] 
    },
    { 
      name: 'Database Query Optimization', 
      description: 'Find slow and inefficient database queries', 
      tools: ['query-analyzer', 'db-profiler'] 
    },
    { 
      name: 'Blocking Operation Detection', 
      description: 'Identify blocking I/O and synchronous operations', 
      tools: ['async-analyzer'] 
    },
    { 
      name: 'Resource Utilization Analysis', 
      description: 'Analyze resource usage patterns', 
      tools: ['resource-monitor'] 
    }
  ];

  async analyze(context: any): Promise<AnalysisResult> {
    try {
      // Mock performance analysis
      const mockResults = context.toolResults || [];
      const performanceIssues = this.extractPerformanceIssues(mockResults);

      if (performanceIssues.length === 0) {
        return {
          insights: [],
          suggestions: [],
          metadata: {
            performanceScan: 'completed',
            issues: 0,
            agent: this.agentName
          }
        };
      }

      // Convert performance issues to insights and suggestions
      const insights = performanceIssues.map(issue => ({
        type: 'performance',
        severity: this.mapSeverity(issue.severity),
        message: issue.description || issue.title || 'Performance issue detected',
        location: issue.location
      }));

      const suggestions = performanceIssues.map(issue => ({
        file: issue.location?.file || 'unknown',
        line: issue.location?.line || 0,
        suggestion: issue.suggestion
      }));

      return {
        insights,
        suggestions,
        metadata: {
          performanceScan: 'completed',
          issues: performanceIssues.length,
          severityDistribution: this.countBySeverity(performanceIssues),
          agent: this.agentName
        }
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  protected formatResult(rawResult: any): AnalysisResult {
    // Convert raw performance results to AnalysisResult format
    return {
      insights: rawResult.insights || [],
      suggestions: rawResult.suggestions || [],
      metadata: rawResult.metadata || { agent: this.agentName }
    };
  }

  private mapSeverity(severity: 'critical' | 'high' | 'medium' | 'low'): 'high' | 'medium' | 'low' {
    // Map critical to high since AnalysisResult only supports high/medium/low
    return severity === 'critical' ? 'high' : severity;
  }

  private extractPerformanceIssues(toolResults: any[]): PerformanceIssue[] {
    // Mock performance issue extraction
    return [
      {
        id: 'PERF-001',
        type: 'slow-query',
        severity: 'medium',
        category: 'database',
        title: 'Slow Database Query',
        description: 'Query execution time exceeds recommended threshold',
        location: {
          file: 'src/services/data-service.ts',
          line: 123
        },
        impact: 'Response time increased by 200ms',
        suggestion: 'Add database index or optimize query structure'
      },
      {
        id: 'PERF-002', 
        type: 'memory-leak',
        severity: 'high',
        category: 'memory',
        title: 'Potential Memory Leak',
        description: 'Event listeners not properly cleaned up',
        location: {
          file: 'src/components/DataTable.tsx',
          line: 78
        },
        impact: 'Memory usage grows over time',
        suggestion: 'Add cleanup in useEffect return or componentWillUnmount'
      }
    ];
  }

  private countBySeverity(issues: PerformanceIssue[]) {
    return issues.reduce((acc, issue) => {
      acc[issue.severity] = (acc[issue.severity] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }

  private generateOptimizationRecommendations(issues: PerformanceIssue[]): string[] {
    const recommendations = [];
    const memoryIssues = issues.filter(i => i.type === 'memory-leak');
    const queryIssues = issues.filter(i => i.type === 'slow-query');
    
    if (memoryIssues.length > 0) {
      recommendations.push('Implement proper cleanup for event listeners and subscriptions');
    }
    
    if (queryIssues.length > 0) {
      recommendations.push('Review database queries and add appropriate indexes');
    }
    
    return recommendations;
  }
}