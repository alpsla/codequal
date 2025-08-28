/**
 * Code Quality Agent
 * Specialized agent for code quality analysis
 */

import { BaseAgent } from '../base/base-agent';
import { AnalysisResult } from '../agent';
import { AgentCapability } from '../types/agent-types';

export interface CodeQualityContext {
  repositoryPath: string;
  branchName: string;
  files: string[];
  codeMetrics?: CodeMetrics;
  styleGuide?: any;
  toolResults?: any;
}

export interface CodeMetrics {
  linesOfCode: number;
  cyclomaticComplexity: number;
  codeSmells: number;
  technicalDebt: number;
  duplicatedLines: number;
  testCoverage: number;
}

export interface QualityIssue {
  id: string;
  type: 'code-smell' | 'complexity' | 'duplication' | 'naming' | 'structure' | 'maintainability';
  severity: 'critical' | 'high' | 'medium' | 'low';
  category: string;
  title: string;
  description: string;
  location?: {
    file: string;
    line?: number;
    column?: number;
  };
  suggestion: string;
  effort: 'low' | 'medium' | 'high';
  impact: string;
}

export class CodeQualityAgent extends BaseAgent {
  private readonly agentName = 'CodeQualityAgent';
  
  capabilities: AgentCapability[] = [
    { 
      name: 'Code Smell Detection', 
      description: 'Identify code smells and anti-patterns', 
      tools: ['sonarqube', 'eslint', 'tslint'] 
    },
    { 
      name: 'Complexity Analysis', 
      description: 'Analyze cyclomatic complexity and cognitive load', 
      tools: ['complexity-analyzer'] 
    },
    { 
      name: 'Duplication Detection', 
      description: 'Find duplicated code blocks', 
      tools: ['jscpd', 'duplicate-finder'] 
    },
    { 
      name: 'Naming Convention Checks', 
      description: 'Validate naming conventions and standards', 
      tools: ['naming-validator'] 
    },
    { 
      name: 'Structure Analysis', 
      description: 'Analyze code structure and organization', 
      tools: ['structure-analyzer'] 
    }
  ];

  async analyze(context: any): Promise<AnalysisResult> {
    try {
      // Mock code quality analysis
      const mockResults = context.toolResults || [];
      const qualityIssues = this.extractQualityIssues(mockResults);

      if (qualityIssues.length === 0) {
        return {
          insights: [],
          suggestions: [],
          metadata: {
            qualityScan: 'completed',
            issues: 0,
            agent: this.agentName
          }
        };
      }

      // Convert quality issues to insights and suggestions
      const insights = qualityIssues.map(issue => ({
        type: 'code-quality',
        severity: this.mapSeverity(issue.severity),
        message: issue.description || issue.title || 'Code quality issue detected',
        location: issue.location
      }));

      const suggestions = qualityIssues.map(issue => ({
        file: issue.location?.file || 'unknown',
        line: issue.location?.line || 0,
        suggestion: issue.suggestion
      }));

      return {
        insights,
        suggestions,
        metadata: {
          qualityScan: 'completed',
          issues: qualityIssues.length,
          severityDistribution: this.countBySeverity(qualityIssues),
          qualityMetrics: this.calculateQualityMetrics(qualityIssues),
          agent: this.agentName
        }
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  protected formatResult(rawResult: any): AnalysisResult {
    // Convert raw quality results to AnalysisResult format
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

  private extractQualityIssues(toolResults: any[]): QualityIssue[] {
    // Mock quality issue extraction
    return [
      {
        id: 'QUAL-001',
        type: 'complexity',
        severity: 'medium',
        category: 'maintainability',
        title: 'High Cyclomatic Complexity',
        description: 'Function has cyclomatic complexity of 12 (exceeds limit of 10)',
        location: {
          file: 'src/utils/data-processor.ts',
          line: 45
        },
        suggestion: 'Break down function into smaller, more focused functions',
        effort: 'medium',
        impact: 'Reduces maintainability and testability'
      },
      {
        id: 'QUAL-002',
        type: 'duplication',
        severity: 'low',
        category: 'maintainability',
        title: 'Code Duplication',
        description: 'Similar code block found in multiple locations',
        location: {
          file: 'src/components/UserCard.tsx',
          line: 23
        },
        suggestion: 'Extract common logic to shared utility function',
        effort: 'low',
        impact: 'Improves code reusability and maintainability'
      }
    ];
  }

  private countBySeverity(issues: QualityIssue[]) {
    return issues.reduce((acc, issue) => {
      acc[issue.severity] = (acc[issue.severity] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }

  private calculateQualityMetrics(issues: QualityIssue[]) {
    const totalIssues = issues.length;
    const highPriorityIssues = issues.filter(i => i.severity === 'high' || i.severity === 'critical').length;
    const complexityIssues = issues.filter(i => i.type === 'complexity').length;
    const duplicationIssues = issues.filter(i => i.type === 'duplication').length;
    
    return {
      totalIssues,
      highPriorityIssues,
      complexityIssues,
      duplicationIssues,
      qualityScore: Math.max(0, 100 - (totalIssues * 5) - (highPriorityIssues * 10))
    };
  }

  private generateRefactoringRecommendations(issues: QualityIssue[]): string[] {
    const recommendations = [];
    const complexityIssues = issues.filter(i => i.type === 'complexity');
    const duplicationIssues = issues.filter(i => i.type === 'duplication');
    
    if (complexityIssues.length > 0) {
      recommendations.push('Consider refactoring complex functions to improve readability');
    }
    
    if (duplicationIssues.length > 0) {
      recommendations.push('Extract common functionality to reduce code duplication');
    }
    
    return recommendations;
  }
}