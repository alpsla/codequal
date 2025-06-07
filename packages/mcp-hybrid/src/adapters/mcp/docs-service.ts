/**
 * MCP Documentation Service Adapter
 * Analyzes documentation quality and structure for Educational and Reporting agents
 */

import { spawn } from 'child_process';
import * as path from 'path';
import {
  Tool,
  ToolResult,
  ToolFinding,
  AnalysisContext,
  ToolMetadata,
  ToolCapability,
  ToolRequirements,
  AgentRole,
  FileData
} from '../../core/interfaces';

interface DocumentationMetrics {
  coverage: number;
  quality: number;
  completeness: number;
  readability: number;
  structure: {
    hasReadme: boolean;
    hasContributing: boolean;
    hasChangelog: boolean;
    hasApiDocs: boolean;
    hasTutorials: boolean;
  };
  missingTopics: string[];
  suggestions: string[];
}

export class MCPDocsServiceAdapter implements Tool {
  readonly id = 'mcp-docs-service';
  readonly name = 'MCP Documentation Service';
  readonly type = 'mcp' as const;
  readonly version = '1.0.0';
  
  readonly capabilities: ToolCapability[] = [
    {
      name: 'documentation-analysis',
      category: 'documentation',
      languages: [], // All languages
      fileTypes: ['.md', '.rst', '.txt', '.adoc']
    },
    {
      name: 'quality-metrics',
      category: 'documentation',
      languages: [],
      fileTypes: ['.md', '.rst']
    },
    {
      name: 'structure-analysis',
      category: 'documentation',
      languages: [],
      fileTypes: []
    }
  ];
  
  readonly requirements: ToolRequirements = {
    minFiles: 0, // Can work even if no docs in PR
    executionMode: 'on-demand',
    timeout: 45000, // 45 seconds
    authentication: {
      type: 'none',
      required: false
    }
  };
  
  /**
   * Check if tool can analyze given context
   */
  canAnalyze(context: AnalysisContext): boolean {
    // Always return true for educational/reporting agents
    // They need doc analysis even if no docs in PR
    const role = context.agentRole;
    return role === 'educational' || role === 'reporting' || this.hasDocumentationFiles(context);
  }
  
  /**
   * Check if PR contains documentation files
   */
  private hasDocumentationFiles(context: AnalysisContext): boolean {
    return context.pr.files.some(file => 
      this.isDocumentationFile(file.path)
    );
  }
  
  /**
   * Check if a file is a documentation file
   */
  private isDocumentationFile(filePath: string): boolean {
    const docExtensions = ['.md', '.rst', '.txt', '.adoc'];
    const docPatterns = [
      /README/i,
      /CONTRIBUTING/i,
      /CHANGELOG/i,
      /LICENSE/i,
      /docs?\//i,
      /documentation/i
    ];
    
    return docExtensions.some(ext => filePath.endsWith(ext)) ||
           docPatterns.some(pattern => pattern.test(filePath));
  }
  
  /**
   * Execute documentation analysis
   */
  async analyze(context: AnalysisContext): Promise<ToolResult> {
    const startTime = Date.now();
    const findings: ToolFinding[] = [];
    
    try {
      // Get documentation files from PR
      const docFiles = context.pr.files.filter(file =>
        file.changeType !== 'deleted' && this.isDocumentationFile(file.path)
      );
      
      // Analyze documentation
      const metrics = await this.analyzeDocumentation(docFiles, context);
      
      // Generate findings based on analysis
      findings.push(...this.generateFindings(metrics, context));
      
      // Add educational insights for educational agent
      if (context.agentRole === 'educational') {
        findings.push(...this.generateEducationalInsights(metrics, context));
      }
      
      // Add reporting metrics for reporting agent
      if (context.agentRole === 'reporting') {
        findings.push(...this.generateReportingMetrics(metrics));
      }
      
      return {
        success: true,
        toolId: this.id,
        executionTime: Date.now() - startTime,
        findings,
        metrics: {
          documentationCoverage: metrics.coverage,
          documentationQuality: metrics.quality,
          readabilityScore: metrics.readability,
          missingTopicsCount: metrics.missingTopics.length,
          improvementSuggestions: metrics.suggestions.length
        }
      };
    } catch (error: any) {
      return {
        success: false,
        toolId: this.id,
        executionTime: Date.now() - startTime,
        error: {
          code: 'ANALYSIS_FAILED',
          message: error.message,
          recoverable: true
        }
      };
    }
  }
  
  /**
   * Analyze documentation files
   */
  private async analyzeDocumentation(
    docFiles: FileData[],
    context: AnalysisContext
  ): Promise<DocumentationMetrics> {
    // If using actual MCP docs service
    if (await this.isMCPDocsServiceAvailable()) {
      return this.runMCPDocsService(docFiles);
    }
    
    // Fallback to built-in analysis
    return this.performBuiltInAnalysis(docFiles, context);
  }
  
  /**
   * Check if MCP docs service is available
   */
  private async isMCPDocsServiceAvailable(): Promise<boolean> {
    return new Promise((resolve) => {
      const child = spawn('npm', ['run', 'mcp-docs-service', '--', '--version'], {
        timeout: 5000
      });
      
      child.on('close', (code) => {
        resolve(code === 0);
      });
      
      child.on('error', () => {
        resolve(false);
      });
    });
  }
  
  /**
   * Run actual MCP docs service
   */
  private async runMCPDocsService(docFiles: FileData[]): Promise<DocumentationMetrics> {
    return new Promise((resolve, reject) => {
      const args = [
        'run',
        'mcp-docs-service',
        '--',
        'analyze',
        '--format', 'json'
      ];
      
      // Add file paths
      args.push(...docFiles.map(f => f.path));
      
      const child = spawn('npm', args, {
        timeout: this.requirements.timeout
      });
      
      let stdout = '';
      let stderr = '';
      
      child.stdout.on('data', (data) => {
        stdout += data.toString();
      });
      
      child.stderr.on('data', (data) => {
        stderr += data.toString();
      });
      
      child.on('close', (code) => {
        if (code === 0) {
          try {
            const result = JSON.parse(stdout);
            resolve(this.parseMCPDocsResult(result));
          } catch {
            reject(new Error('Failed to parse MCP docs service output'));
          }
        } else {
          reject(new Error(`MCP docs service failed: ${stderr}`));
        }
      });
      
      child.on('error', (error) => {
        reject(error);
      });
    });
  }
  
  /**
   * Parse MCP docs service result
   */
  private parseMCPDocsResult(result: any): DocumentationMetrics {
    return {
      coverage: result.coverage || 0,
      quality: result.quality || 0,
      completeness: result.completeness || 0,
      readability: result.readability || 0,
      structure: {
        hasReadme: result.structure?.hasReadme || false,
        hasContributing: result.structure?.hasContributing || false,
        hasChangelog: result.structure?.hasChangelog || false,
        hasApiDocs: result.structure?.hasApiDocs || false,
        hasTutorials: result.structure?.hasTutorials || false
      },
      missingTopics: result.missingTopics || [],
      suggestions: result.suggestions || []
    };
  }
  
  /**
   * Perform built-in documentation analysis
   */
  private performBuiltInAnalysis(
    docFiles: FileData[],
    context: AnalysisContext
  ): DocumentationMetrics {
    const structure = {
      hasReadme: false,
      hasContributing: false,
      hasChangelog: false,
      hasApiDocs: false,
      hasTutorials: false
    };
    
    // Check structure
    for (const file of docFiles) {
      const upperPath = file.path.toUpperCase();
      if (upperPath.includes('README')) structure.hasReadme = true;
      if (upperPath.includes('CONTRIBUTING')) structure.hasContributing = true;
      if (upperPath.includes('CHANGELOG')) structure.hasChangelog = true;
      if (upperPath.includes('API') && file.path.endsWith('.md')) structure.hasApiDocs = true;
      if (upperPath.includes('TUTORIAL') || upperPath.includes('GUIDE')) structure.hasTutorials = true;
    }
    
    // Calculate basic metrics
    const coverage = this.calculateCoverage(docFiles, context);
    const quality = this.assessQuality(docFiles);
    const readability = this.calculateReadability(docFiles);
    
    // Identify missing topics
    const missingTopics = this.identifyMissingTopics(structure, context);
    
    // Generate suggestions
    const suggestions = this.generateSuggestions(structure, docFiles, context);
    
    return {
      coverage,
      quality,
      completeness: this.calculateCompleteness(structure),
      readability,
      structure,
      missingTopics,
      suggestions
    };
  }
  
  /**
   * Calculate documentation coverage
   */
  private calculateCoverage(docFiles: FileData[], context: AnalysisContext): number {
    const codeFiles = context.pr.files.filter(f => 
      !this.isDocumentationFile(f.path) && f.changeType !== 'deleted'
    );
    
    if (codeFiles.length === 0) return 100;
    
    // Simple heuristic: expect at least some docs for code changes
    const docToCodeRatio = docFiles.length / codeFiles.length;
    return Math.min(100, docToCodeRatio * 100);
  }
  
  /**
   * Assess documentation quality
   */
  private assessQuality(docFiles: FileData[]): number {
    if (docFiles.length === 0) return 0;
    
    let totalScore = 0;
    
    for (const file of docFiles) {
      const content = file.content;
      let fileScore = 50; // Base score
      
      // Check for quality indicators
      if (content.includes('## ') || content.includes('# ')) fileScore += 10; // Headers
      if (content.includes('```')) fileScore += 15; // Code examples
      if (content.includes('![') || content.includes('[')) fileScore += 5; // Links/images
      if (content.length > 500) fileScore += 10; // Substantial content
      if (content.match(/\d+\./g)) fileScore += 5; // Numbered lists
      if (content.includes('Example:') || content.includes('Usage:')) fileScore += 5; // Examples
      
      totalScore += Math.min(100, fileScore);
    }
    
    return totalScore / docFiles.length;
  }
  
  /**
   * Calculate readability score
   */
  private calculateReadability(docFiles: FileData[]): number {
    if (docFiles.length === 0) return 0;
    
    let totalScore = 0;
    
    for (const file of docFiles) {
      const content = file.content;
      
      // Simple readability metrics
      const sentences = content.split(/[.!?]+/).length;
      const words = content.split(/\s+/).length;
      const avgWordsPerSentence = words / sentences;
      
      // Ideal is 15-20 words per sentence
      let score = 100;
      if (avgWordsPerSentence > 25) score -= 20;
      if (avgWordsPerSentence > 30) score -= 20;
      if (avgWordsPerSentence < 10) score -= 10;
      
      totalScore += Math.max(0, score);
    }
    
    return totalScore / docFiles.length;
  }
  
  /**
   * Calculate completeness score
   */
  private calculateCompleteness(structure: DocumentationMetrics['structure']): number {
    const components = [
      structure.hasReadme,
      structure.hasContributing,
      structure.hasChangelog,
      structure.hasApiDocs,
      structure.hasTutorials
    ];
    
    const present = components.filter(c => c).length;
    return (present / components.length) * 100;
  }
  
  /**
   * Identify missing documentation topics
   */
  private identifyMissingTopics(
    structure: DocumentationMetrics['structure'],
    context: AnalysisContext
  ): string[] {
    const missing: string[] = [];
    
    if (!structure.hasReadme) missing.push('README file');
    if (!structure.hasContributing) missing.push('Contributing guidelines');
    if (!structure.hasChangelog) missing.push('Changelog');
    
    // Check for code-specific documentation needs
    const hasTests = context.pr.files.some(f => f.path.includes('test'));
    if (hasTests && !structure.hasApiDocs) missing.push('Test documentation');
    
    const hasConfig = context.pr.files.some(f => 
      f.path.includes('config') || f.path.endsWith('.json')
    );
    if (hasConfig) missing.push('Configuration documentation');
    
    return missing;
  }
  
  /**
   * Generate improvement suggestions
   */
  private generateSuggestions(
    structure: DocumentationMetrics['structure'],
    docFiles: FileData[],
    context: AnalysisContext
  ): string[] {
    const suggestions: string[] = [];
    
    if (!structure.hasReadme) {
      suggestions.push('Add a README.md file with project overview and setup instructions');
    }
    
    if (!structure.hasContributing) {
      suggestions.push('Create CONTRIBUTING.md to guide contributors');
    }
    
    // Check for code examples
    const hasCodeExamples = docFiles.some(f => f.content.includes('```'));
    if (!hasCodeExamples) {
      suggestions.push('Add code examples to documentation');
    }
    
    // Language-specific suggestions
    if (context.repository.languages.includes('typescript')) {
      suggestions.push('Consider adding TSDoc comments for public APIs');
    }
    
    if (context.repository.languages.includes('python')) {
      suggestions.push('Use docstrings for function documentation');
    }
    
    return suggestions;
  }
  
  /**
   * Generate findings from metrics
   */
  private generateFindings(
    metrics: DocumentationMetrics,
    context: AnalysisContext
  ): ToolFinding[] {
    const findings: ToolFinding[] = [];
    
    // Coverage issues
    if (metrics.coverage < 50) {
      findings.push({
        type: 'issue',
        severity: 'medium',
        category: 'documentation',
        message: `Documentation coverage is low (${metrics.coverage.toFixed(0)}%). Consider adding more documentation for code changes.`,
        ruleId: 'doc-coverage'
      });
    }
    
    // Quality issues
    if (metrics.quality < 60) {
      findings.push({
        type: 'suggestion',
        severity: 'low',
        category: 'documentation',
        message: 'Documentation quality could be improved. Consider adding headers, code examples, and more detailed explanations.',
        ruleId: 'doc-quality'
      });
    }
    
    // Missing topics
    for (const topic of metrics.missingTopics) {
      findings.push({
        type: 'suggestion',
        severity: 'medium',
        category: 'documentation',
        message: `Missing documentation: ${topic}`,
        ruleId: 'missing-docs'
      });
    }
    
    // Suggestions
    for (const suggestion of metrics.suggestions) {
      findings.push({
        type: 'suggestion',
        severity: 'low',
        category: 'documentation',
        message: suggestion,
        ruleId: 'doc-improvement'
      });
    }
    
    return findings;
  }
  
  /**
   * Generate educational insights
   */
  private generateEducationalInsights(
    metrics: DocumentationMetrics,
    context: AnalysisContext
  ): ToolFinding[] {
    const insights: ToolFinding[] = [];
    
    // Learning opportunities from missing docs
    if (metrics.missingTopics.length > 0) {
      insights.push({
        type: 'info',
        severity: 'info',
        category: 'documentation',
        message: `Learning opportunity: This PR would benefit from documentation on: ${metrics.missingTopics.join(', ')}. This helps new developers understand the changes.`,
        ruleId: 'educational-docs'
      });
    }
    
    // Best practices reminder
    if (!metrics.structure.hasReadme && context.pr.files.some(f => f.path.includes('src/'))) {
      insights.push({
        type: 'info',
        severity: 'info',
        category: 'documentation',
        message: 'Best practice: When adding new features, update the README with usage examples. This helps users discover and use your functionality.',
        ruleId: 'educational-readme'
      });
    }
    
    return insights;
  }
  
  /**
   * Generate reporting metrics
   */
  private generateReportingMetrics(metrics: DocumentationMetrics): ToolFinding[] {
    return [
      {
        type: 'metric',
        severity: 'info',
        category: 'documentation',
        message: `Documentation metrics: Coverage=${metrics.coverage.toFixed(0)}%, Quality=${metrics.quality.toFixed(0)}%, Readability=${metrics.readability.toFixed(0)}%`,
        ruleId: 'doc-metrics'
      }
    ];
  }
  
  /**
   * Health check
   */
  async healthCheck(): Promise<boolean> {
    // Check if we can run documentation analysis
    return true; // Always available as we have fallback
  }
  
  /**
   * Get tool metadata
   */
  getMetadata(): ToolMetadata {
    return {
      id: this.id,
      name: this.name,
      description: 'Documentation analysis service for quality metrics and improvement suggestions',
      author: 'CodeQual',
      homepage: 'https://github.com/codequal/mcp-docs-service',
      documentationUrl: 'https://docs.codequal.com/tools/mcp-docs-service',
      supportedRoles: ['educational', 'reporting'] as AgentRole[],
      supportedLanguages: [], // All languages
      supportedFrameworks: [],
      tags: ['documentation', 'quality', 'metrics', 'education'],
      securityVerified: true,
      lastVerified: new Date('2025-06-07')
    };
  }
}

// Export singleton instance
export const mcpDocsServiceAdapter = new MCPDocsServiceAdapter();
