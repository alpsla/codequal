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
  agentName = 'Code Quality Analyst';
  capabilities: string[] = [];
  private currentLanguage?: string;
  private languageSpecificTools?: string[];
  private repoSize: 'small' | 'medium' | 'large' = 'medium';

  constructor(config?: any) {
    super(config);
  }

  configureForLanguage(language: string, tools: string[]): void {
    this.currentLanguage = language;
    this.languageSpecificTools = tools;
    
    // Update capabilities based on language
    this.updateCapabilitiesForLanguage(language, tools);
  }

  setRepositorySize(size: 'small' | 'medium' | 'large'): void {
    this.repoSize = size;
  }

  private generateRolePrompt(language: string, repoSize: 'small' | 'medium' | 'large'): string {
    const basePrompt = `You are an expert code quality analyst specializing in ${language} best practices.

CONTEXT:
- Language: ${language}
- Repository Size: ${repoSize}
- Available Tools: ${this.languageSpecificTools?.join(', ') || 'general linting'}
- Analysis Timestamp: ${new Date().toISOString()}`;

    const expertiseAreas = `
EXPERTISE AREAS:
- Code Complexity Metrics
- Design Patterns & Anti-patterns
- ${language} Idioms and Best Practices
- Test Coverage Analysis
- Documentation Quality
- Maintainability Index`;

    const sizeApproach = this.getSizeSpecificApproach(repoSize);
    const languageStandards = this.getLanguageStandards(language);
    
    const outputRequirements = `
OUTPUT REQUIREMENTS:
- Complexity scores (cyclomatic, cognitive)
- Maintainability index
- Code smell identification
- Refactoring suggestions with examples
- Priority based on impact`;

    return `${basePrompt}\n${expertiseAreas}\n\nANALYSIS APPROACH:\n${sizeApproach}\n\n${languageStandards}\n${outputRequirements}`;
  }

  private getSizeSpecificApproach(size: 'small' | 'medium' | 'large'): string {
    const approaches = {
      small: `- Complete code quality analysis
- Detailed review of every function
- Full documentation coverage check
- All code smells identified`,
      medium: `- Focus on complex modules
- Sample-based quality checks
- Key documentation review
- Priority code smells`,
      large: `- Architecture-level quality
- Hotspot analysis
- Critical path review
- High-impact refactoring opportunities`
    };
    return approaches[size];
  }

  private getLanguageStandards(language: string): string {
    const standards: Record<string, string> = {
      javascript: `CODING STANDARDS:
- ESLint recommended rules
- Airbnb style guide compliance
- React/Vue/Angular best practices
- Modern ES6+ patterns
- Proper async/await usage`,
      typescript: `CODING STANDARDS:
- TypeScript strict mode compliance
- Proper type definitions (no 'any')
- Interface over type aliases
- Enum best practices
- Generic type patterns`,
      python: `CODING STANDARDS:
- PEP 8 compliance
- Type hints usage (PEP 484)
- Docstring completeness (PEP 257)
- Pythonic idioms
- Context managers and decorators`,
      java: `CODING STANDARDS:
- Google Java Style Guide
- SOLID principles adherence
- Spring Boot best practices
- Effective Java guidelines
- Proper exception handling`,
      go: `CODING STANDARDS:
- Effective Go guidelines
- gofmt compliance
- Error handling patterns
- Interface design
- Goroutine best practices`,
      ruby: `CODING STANDARDS:
- Ruby Style Guide
- Rails best practices
- DRY principle adherence
- Convention over configuration
- Proper metaprogramming`,
      php: `CODING STANDARDS:
- PSR-12 coding standard
- PSR-4 autoloading
- Laravel/Symfony best practices
- Type declarations usage
- Proper error handling`,
      csharp: `CODING STANDARDS:
- .NET coding conventions
- C# coding standards
- SOLID principles
- Async/await best practices
- LINQ optimization`,
      rust: `CODING STANDARDS:
- Rust API guidelines
- Ownership best practices
- Error handling with Result
- Trait design patterns
- Zero-cost abstractions`,
      cpp: `CODING STANDARDS:
- C++ Core Guidelines
- RAII principles
- Modern C++ features (C++17/20)
- Template best practices
- Memory management patterns`,
      c: `CODING STANDARDS:
- C coding standards
- Memory management discipline
- Error handling patterns
- Modular design
- Header organization`,
      swift: `CODING STANDARDS:
- Swift API Design Guidelines
- Protocol-oriented programming
- Optionals best practices
- Value vs reference types
- SwiftUI patterns`,
      kotlin: `CODING STANDARDS:
- Kotlin coding conventions
- Null safety patterns
- Coroutines best practices
- Extension functions usage
- Data class patterns`,
      objectivec: `CODING STANDARDS:
- Apple coding guidelines
- Memory management (ARC)
- Delegate patterns
- KVO/KVC best practices
- Block usage patterns`,
      scala: `CODING STANDARDS:
- Scala style guide
- Functional programming patterns
- Immutability preferences
- Pattern matching usage
- Type safety practices`,
      r: `CODING STANDARDS:
- R style guide (tidyverse)
- Vectorization patterns
- Function documentation
- Package structure
- Data manipulation best practices`,
      dart: `CODING STANDARDS:
- Dart style guide
- Flutter best practices
- Widget composition patterns
- State management
- Async programming patterns`
    };
    
    return standards[language.toLowerCase()] || `CODING STANDARDS:\n- General best practices for ${language}`;
  }

  private updateCapabilitiesForLanguage(language: string, tools: string[]): void {
    // Update agent capabilities based on available tools
    const capabilities = [];
    
    if (tools.includes('eslint') && (language === 'javascript' || language === 'typescript')) {
      capabilities.push('ESLint rule checking', 'Code style enforcement');
    }
    if (tools.includes('pylint') && language === 'python') {
      capabilities.push('PEP 8 compliance checking', 'Python best practices');
    }
    if (tools.includes('rubocop') && language === 'ruby') {
      capabilities.push('Ruby style guide enforcement');
    }
    if (tools.includes('jscpd')) {
      capabilities.push('Duplicate code detection');
    }
    
    // Store capabilities for use in analysis
    this.capabilities = capabilities;
  }

  private extractQualityIssues(results: any[]): any[] {
    // Extract quality issues from tool results
    const issues = [];
    
    for (const result of results) {
      if (result.tool === 'eslint' || result.tool === 'pylint') {
        issues.push(...this.parseLinterResults(result));
      } else if (result.tool === 'jscpd') {
        issues.push(...this.parseDuplicationResults(result));
      }
    }
    
    return issues;
  }

  private parseLinterResults(result: any): any[] {
    // Parse linter results into quality issues
    return result.issues || [];
  }

  private parseDuplicationResults(result: any): any[] {
    // Parse duplication results into quality issues
    return result.duplicates || [];
  }

  private mapSeverity(severity: string): string {
    const mapping: Record<string, string> = {
      'error': 'high',
      'warning': 'medium',
      'info': 'low',
      'hint': 'low'
    };
    return mapping[severity.toLowerCase()] || 'medium';
  }

  private countBySeverity(issues: any[]): Record<string, number> {
    const counts: Record<string, number> = {
      high: 0,
      medium: 0,
      low: 0
    };
    
    for (const issue of issues) {
      const severity = this.mapSeverity(issue.severity || 'medium');
      counts[severity]++;
    }
    
    return counts;
  }

  private calculateQualityMetrics(issues: any[]): Record<string, any> {
    // Calculate various quality metrics
    return {
      totalIssues: issues.length,
      complexityScore: this.calculateComplexityScore(issues),
      maintainabilityIndex: this.calculateMaintainabilityIndex(issues),
      technicalDebt: this.estimateTechnicalDebt(issues)
    };
  }

  private calculateComplexityScore(issues: any[]): number {
    // Calculate average complexity score
    const complexityIssues = issues.filter(i => i.type === 'complexity');
    if (complexityIssues.length === 0) return 0;
    
    const total = complexityIssues.reduce((sum, i) => sum + (i.complexity || 0), 0);
    return total / complexityIssues.length;
  }

  private calculateMaintainabilityIndex(issues: any[]): number {
    // Calculate maintainability index (0-100)
    const baseScore = 100;
    const deduction = Math.min(issues.length * 2, 50);
    return Math.max(baseScore - deduction, 0);
  }

  private estimateTechnicalDebt(issues: any[]): string {
    // Estimate time to fix all issues
    const hoursPerIssue = {
      high: 2,
      medium: 1,
      low: 0.5
    };
    
    let totalHours = 0;
    for (const issue of issues) {
      const severity = this.mapSeverity(issue.severity || 'medium');
      totalHours += hoursPerIssue[severity as keyof typeof hoursPerIssue];
    }
    
    if (totalHours < 8) return `${totalHours} hours`;
    const days = Math.ceil(totalHours / 8);
    return `${days} days`;
  }

  async analyze(context: any): Promise<AnalysisResult> {
    try {
      // Generate appropriate prompt if language is known
      if (this.currentLanguage) {
        const rolePrompt = this.generateRolePrompt(this.currentLanguage, this.repoSize);
        // This prompt would be used when calling AI models for analysis
        context.rolePrompt = rolePrompt;
      }

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
            agent: this.agentName,
            language: this.currentLanguage,
            tools: this.languageSpecificTools
          }
        };
      }

      // Convert quality issues to insights and suggestions
      const insights = qualityIssues.map(issue => ({
        type: 'code-quality' as const,
        severity: this.mapSeverity(issue.severity) as 'high' | 'medium' | 'low',
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
          agent: this.agentName,
          language: this.currentLanguage,
          tools: this.languageSpecificTools
        }
      };
    } catch (error) {
      return this.handleError(error);
    }
  }
  
  formatResult(rawResult: unknown): AnalysisResult {
    if (typeof rawResult === 'object' && rawResult !== null && 'insights' in rawResult) {
      return rawResult as AnalysisResult;
    }
    return {
      insights: [],
      suggestions: [],
      metadata: { agent: this.agentName }
    };
  }
}