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
  language?: string;  // Language detected by orchestrator
  languageTools?: string[];  // Language-specific performance tools from orchestrator
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
  agentName = 'Performance Optimizer';
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
    const basePrompt = `You are an expert performance engineer specializing in ${language} optimization.

CONTEXT:
- Language: ${language}
- Repository Size: ${repoSize}
- Available Tools: ${this.languageSpecificTools?.join(', ') || 'general profiling'}`;

    const expertiseAreas = `
EXPERTISE AREAS:
- Algorithm Complexity Analysis
- Memory Management & Leaks
- Database Query Optimization
- Caching Strategies
- Concurrency & Threading Issues
- ${language}-Specific Performance Patterns`;

    const sizeApproach = this.getSizeSpecificApproach(repoSize);
    const languagePatterns = this.getLanguagePerformancePatterns(language);
    
    const outputRequirements = `
OUTPUT REQUIREMENTS:
- Quantify performance impact (time/memory)
- Provide benchmarks where possible
- Suggest specific optimizations with code
- Consider trade-offs (performance vs maintainability)`;

    return `${basePrompt}\n${expertiseAreas}\n\nANALYSIS APPROACH:\n${sizeApproach}\n\n${languagePatterns}\n${outputRequirements}`;
  }

  private getSizeSpecificApproach(size: 'small' | 'medium' | 'large'): string {
    const approaches = {
      small: `- Complete performance profiling
- Detailed algorithmic analysis
- Micro-optimization opportunities
- Full memory leak detection`,
      medium: `- Focus on hot paths and bottlenecks
- Database query analysis
- API response time optimization
- Critical path analysis`,
      large: `- Architecture-level performance patterns
- Service boundary optimization
- Distributed system considerations
- Sampling-based profiling`
    };
    return approaches[size];
  }

  private getLanguagePerformancePatterns(language: string): string {
    const patterns: Record<string, string> = {
      javascript: `LANGUAGE-SPECIFIC PATTERNS:
- Event loop optimization
- Memory leaks in closures
- Async/await vs callbacks performance
- Bundle size optimization
- V8 engine optimizations`,
      typescript: `LANGUAGE-SPECIFIC PATTERNS:
- Type checking overhead
- Compilation optimization
- Bundle size with type imports
- Generic type performance
- Enum vs const performance`,
      python: `LANGUAGE-SPECIFIC PATTERNS:
- GIL (Global Interpreter Lock) considerations
- NumPy/Pandas vectorization
- Generator vs list comprehension
- Cython optimization opportunities
- Async/await patterns`,
      java: `LANGUAGE-SPECIFIC PATTERNS:
- JVM tuning and garbage collection
- Thread pool optimization
- Stream API performance
- JIT compilation patterns
- Memory heap optimization`,
      go: `LANGUAGE-SPECIFIC PATTERNS:
- Goroutine optimization
- Channel buffer sizing
- Memory allocation patterns
- Garbage collection tuning
- Compiler optimizations`,
      ruby: `LANGUAGE-SPECIFIC PATTERNS:
- Rails N+1 query problems
- Ruby VM optimization
- Memory bloat in long-running processes
- String allocation optimization
- Caching strategies`,
      php: `LANGUAGE-SPECIFIC PATTERNS:
- OpCache configuration
- Database connection pooling
- Memory limit optimization
- Laravel query optimization
- Session handling performance`,
      csharp: `LANGUAGE-SPECIFIC PATTERNS:
- .NET garbage collection tuning
- LINQ performance optimization
- Async/await patterns
- Entity Framework query optimization
- Memory allocation patterns`,
      rust: `LANGUAGE-SPECIFIC PATTERNS:
- Zero-cost abstractions
- Ownership and borrowing optimization
- Compile-time optimization
- Memory allocation strategies
- Unsafe code performance`,
      cpp: `LANGUAGE-SPECIFIC PATTERNS:
- Template metaprogramming optimization
- Cache-friendly data structures
- SIMD vectorization
- Memory allocation strategies
- Compiler optimization flags`,
      c: `LANGUAGE-SPECIFIC PATTERNS:
- Cache optimization
- Loop unrolling
- Memory alignment
- Compiler intrinsics
- Function inlining`,
      swift: `LANGUAGE-SPECIFIC PATTERNS:
- ARC optimization
- Value vs reference types
- Protocol-oriented performance
- Core Data optimization
- SwiftUI rendering performance`,
      kotlin: `LANGUAGE-SPECIFIC PATTERNS:
- Coroutines optimization
- JVM interop overhead
- Inline functions and classes
- Collection performance
- Android-specific optimizations`,
      objectivec: `LANGUAGE-SPECIFIC PATTERNS:
- ARC vs manual memory management
- Core Data performance
- GCD optimization
- UIKit rendering performance
- Objective-C runtime overhead`,
      scala: `LANGUAGE-SPECIFIC PATTERNS:
- Collections performance
- Future and Promise optimization
- Akka actor performance
- JVM optimization
- Tail recursion optimization`,
      r: `LANGUAGE-SPECIFIC PATTERNS:
- Vectorization strategies
- Data.table vs dplyr performance
- Memory management for large datasets
- Parallel processing with foreach
- C++ integration via Rcpp`,
      dart: `LANGUAGE-SPECIFIC PATTERNS:
- Flutter rendering performance
- Isolate optimization
- Widget rebuild optimization
- Async performance patterns
- AOT vs JIT compilation`
    };
    
    return patterns[language.toLowerCase()] || `LANGUAGE-SPECIFIC PATTERNS:\n- General performance optimization for ${language}`;
  }

  private updateCapabilitiesForLanguage(language: string, tools: string[]): void {
    // Update agent capabilities based on available tools
    const capabilities = [];
    
    if (tools.includes('lighthouse')) {
      capabilities.push('Web performance metrics', 'Core Web Vitals analysis');
    }
    if (tools.includes('pprof') && language === 'go') {
      capabilities.push('Go profiling and visualization');
    }
    if (tools.includes('jmh') && (language === 'java' || language === 'kotlin')) {
      capabilities.push('JVM microbenchmarking');
    }
    if (tools.includes('valgrind') && (language === 'c' || language === 'cpp')) {
      capabilities.push('Memory profiling', 'Cache analysis');
    }
    
    // Store capabilities for use in analysis
    this.capabilities = capabilities;
  }

  async analyze(context: any): Promise<AnalysisResult> {
    try {
      // Generate appropriate prompt if language is known
      if (this.currentLanguage) {
        const rolePrompt = this.generateRolePrompt(this.currentLanguage, this.repoSize);
        // This prompt would be used when calling AI models for analysis
        context.rolePrompt = rolePrompt;
      }

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
            agent: this.agentName,
            language: this.currentLanguage,
            tools: this.languageSpecificTools
          }
        };
      }

      // Convert performance issues to insights and suggestions
      const insights = performanceIssues.map(issue => ({
        type: 'performance' as const,
        severity: this.mapSeverity(issue.severity) as 'high' | 'medium' | 'low',
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
          agent: this.agentName,
          language: this.currentLanguage,
          tools: this.languageSpecificTools
        }
      };
    } catch (error) {
      return this.handleError(error);
    }
  }
  
  private extractPerformanceIssues(results: any[]): any[] {
    const issues = [];
    for (const result of results) {
      if (result.issues) {
        issues.push(...result.issues.filter((i: any) => 
          i.type === 'performance' || 
          i.category?.includes('performance') ||
          i.category?.includes('complexity')
        ));
      }
    }
    return issues;
  }
  
  private mapSeverity(severity: string): string {
    const mapping: Record<string, string> = {
      'critical': 'high',
      'high': 'high',
      'medium': 'medium',
      'low': 'low',
      'info': 'low'
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