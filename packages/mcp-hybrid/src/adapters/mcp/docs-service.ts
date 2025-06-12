/**
 * MCP Documentation Service Adapter
 * Analyzes documentation quality and structure for Educational and Reporting agents
 */

import * as path from 'path';
import { BaseMCPAdapter } from './base-mcp-adapter';
import {
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
    hasExamples: boolean;
  };
  analysis: {
    totalFiles: number;
    documentedFiles: number;
    codeExamples: number;
    brokenLinks: number;
    todos: number;
  };
  missingTopics: string[];
  suggestions: DocumentationSuggestion[];
}

interface DocumentationSuggestion {
  type: 'missing' | 'improvement' | 'quality';
  priority: 'high' | 'medium' | 'low';
  topic: string;
  description: string;
  example?: string;
}

interface MCPDocsResponse {
  metrics: DocumentationMetrics;
  fileAnalysis: Array<{
    file: string;
    score: number;
    issues: string[];
    suggestions: string[];
  }>;
  overallScore: number;
  badge: 'excellent' | 'good' | 'needs-improvement' | 'poor';
}

export class MCPDocsServiceAdapter extends BaseMCPAdapter {
  readonly id = 'mcp-docs-service';
  readonly name = 'MCP Documentation Service';
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
  
  protected readonly mcpServerArgs = ['@codequal/mcp-docs-service'];
  
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
    
    try {
      // Initialize MCP server
      await this.initializeMCPServer();
      
      // Get all files for analysis (not just docs)
      const allFiles = context.pr.files.filter(f => f.changeType !== 'deleted');
      const docFiles = allFiles.filter(f => this.isDocumentationFile(f.path));
      
      // Create temp directory and write files
      const tempDir = await this.createTempDirectory(context);
      
      try {
        if (allFiles.length > 0) {
          await this.writeFilesToTemp(allFiles, tempDir);
        }
        
        // Analyze documentation via MCP
        const analysisResult = await this.analyzeDocumentationViaMCP(
          tempDir,
          allFiles,
          docFiles,
          context
        );
        
        // Generate findings based on analysis
        const findings = this.generateFindings(analysisResult, context);
        
        // Calculate metrics
        const metrics = this.extractMetrics(analysisResult);
        
        return {
          success: true,
          toolId: this.id,
          executionTime: Date.now() - startTime,
          findings,
          metrics
        };
      } finally {
        await this.cleanupTempDirectory(tempDir);
      }
    } catch (error) {
      return this.createErrorResult(
        error instanceof Error ? error : new Error(String(error)),
        startTime
      );
    }
  }
  
  /**
   * Analyze documentation via MCP
   */
  private async analyzeDocumentationViaMCP(
    tempDir: string,
    allFiles: FileData[],
    docFiles: FileData[],
    context: AnalysisContext
  ): Promise<MCPDocsResponse> {
    // Prepare analysis parameters
    const params = {
      projectPath: tempDir,
      files: allFiles.map(f => ({
        path: path.join(tempDir, f.path),
        relativePath: f.path,
        isDocumentation: this.isDocumentationFile(f.path)
      })),
      repository: {
        name: context.repository.name,
        languages: context.repository.languages,
        frameworks: context.repository.frameworks
      },
      analysisOptions: {
        checkBrokenLinks: true,
        assessReadability: true,
        findTodos: true,
        suggestImprovements: true,
        analyzeStructure: true
      }
    };
    
    // Execute analysis via MCP
    const response = await this.executeMCPCommand<MCPDocsResponse>({
      method: 'analyzeDocumentation',
      params
    });
    
    return response;
  }
  
  /**
   * Generate findings from analysis results
   */
  private generateFindings(
    analysis: MCPDocsResponse,
    context: AnalysisContext
  ): ToolFinding[] {
    const findings: ToolFinding[] = [];
    const metrics = analysis.metrics;
    
    // Overall documentation score
    const badgeEmoji = {
      'excellent': '🏆',
      'good': '✅',
      'needs-improvement': '⚠️',
      'poor': '❌'
    };
    
    findings.push({
      type: 'metric',
      severity: 'info',
      category: 'documentation',
      message: `${badgeEmoji[analysis.badge]} Documentation Score: ${analysis.overallScore}/100 (${analysis.badge})`,
      ruleId: 'doc-score',
      documentation: this.generateScoreDetails(analysis)
    });
    
    // Coverage issues
    if (metrics.coverage < 50) {
      findings.push({
        type: 'issue',
        severity: 'medium',
        category: 'documentation',
        message: `📊 Low documentation coverage: ${metrics.coverage.toFixed(0)}%`,
        ruleId: 'doc-coverage',
        documentation: 'Consider adding documentation for new code. Well-documented code is easier to maintain and onboard new developers.'
      });
    }
    
    // Structure findings
    if (!metrics.structure.hasReadme) {
      findings.push({
        type: 'issue',
        severity: 'high',
        category: 'documentation',
        message: '📄 Missing README.md file',
        ruleId: 'missing-readme',
        documentation: 'Every project should have a README that explains what it does, how to set it up, and how to use it.',
        autoFixable: true,
        fix: {
          description: 'Create a basic README.md template',
          changes: [{
            file: 'README.md',
            line: 1,
            oldText: '',
            newText: this.generateReadmeTemplate(context)
          }]
        }
      });
    }
    
    // Quality issues from file analysis
    for (const fileAnalysis of analysis.fileAnalysis) {
      if (fileAnalysis.score < 60) {
        findings.push({
          type: 'suggestion',
          severity: 'low',
          category: 'documentation',
          message: `📝 ${path.basename(fileAnalysis.file)} needs improvement (score: ${fileAnalysis.score}/100)`,
          file: fileAnalysis.file,
          ruleId: 'doc-quality',
          documentation: fileAnalysis.issues.join('\n')
        });
      }
    }
    
    // Missing topics
    for (const topic of metrics.missingTopics) {
      findings.push({
        type: 'suggestion',
        severity: 'medium',
        category: 'documentation',
        message: `📚 Missing documentation topic: ${topic}`,
        ruleId: 'missing-topic'
      });
    }
    
    // High-priority suggestions
    const highPrioritySuggestions = metrics.suggestions.filter(s => s.priority === 'high');
    for (const suggestion of highPrioritySuggestions) {
      findings.push({
        type: 'suggestion',
        severity: 'medium',
        category: 'documentation',
        message: `💡 ${suggestion.topic}: ${suggestion.description}`,
        ruleId: `doc-suggestion-${suggestion.type}`,
        documentation: suggestion.example
      });
    }
    
    // Educational insights
    if (context.agentRole === 'educational') {
      findings.push(...this.generateEducationalFindings(metrics, analysis));
    }
    
    // Reporting metrics
    if (context.agentRole === 'reporting') {
      findings.push(...this.generateReportingFindings(metrics, analysis));
    }
    
    return findings;
  }
  
  /**
   * Generate score details documentation
   */
  private generateScoreDetails(analysis: MCPDocsResponse): string {
    const metrics = analysis.metrics;
    const details = [
      `**Overall Score: ${analysis.overallScore}/100**`,
      '',
      '**Breakdown:**',
      `- Coverage: ${metrics.coverage.toFixed(0)}%`,
      `- Quality: ${metrics.quality.toFixed(0)}%`,
      `- Completeness: ${metrics.completeness.toFixed(0)}%`,
      `- Readability: ${metrics.readability.toFixed(0)}%`,
      '',
      '**Structure:**',
      `- README: ${metrics.structure.hasReadme ? '✅' : '❌'}`,
      `- Contributing Guide: ${metrics.structure.hasContributing ? '✅' : '❌'}`,
      `- Changelog: ${metrics.structure.hasChangelog ? '✅' : '❌'}`,
      `- API Docs: ${metrics.structure.hasApiDocs ? '✅' : '❌'}`,
      `- Examples: ${metrics.structure.hasExamples ? '✅' : '❌'}`
    ];
    
    if (metrics.analysis.brokenLinks > 0) {
      details.push('', `⚠️ Found ${metrics.analysis.brokenLinks} broken links`);
    }
    
    if (metrics.analysis.todos > 0) {
      details.push(`📌 Found ${metrics.analysis.todos} TODO items in documentation`);
    }
    
    return details.join('\n');
  }
  
  /**
   * Generate README template
   */
  private generateReadmeTemplate(context: AnalysisContext): string {
    return `# ${context.repository.name}

## Description
Brief description of what this project does.

## Installation
\`\`\`bash
# Installation instructions
\`\`\`

## Usage
\`\`\`${context.repository.primaryLanguage || 'javascript'}
// Usage example
\`\`\`

## Contributing
Please read [CONTRIBUTING.md](CONTRIBUTING.md) for details on our code of conduct and the process for submitting pull requests.

## License
This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
`;
  }
  
  /**
   * Generate educational findings
   */
  private generateEducationalFindings(
    metrics: DocumentationMetrics,
    analysis: MCPDocsResponse
  ): ToolFinding[] {
    const findings: ToolFinding[] = [];
    
    // Documentation best practices
    if (metrics.analysis.codeExamples < 3) {
      findings.push({
        type: 'info',
        severity: 'info',
        category: 'documentation',
        message: '🎓 Learning tip: Add more code examples to your documentation',
        ruleId: 'educational-examples',
        documentation: 'Code examples help users understand how to use your code. Try to include examples for common use cases, edge cases, and error handling.'
      });
    }
    
    // Readability tips
    if (metrics.readability < 70) {
      findings.push({
        type: 'info',
        severity: 'info',
        category: 'documentation',
        message: '📖 Improve readability by using shorter sentences and simpler language',
        ruleId: 'educational-readability',
        documentation: 'Good documentation is easy to read. Aim for 15-20 words per sentence, use active voice, and avoid jargon when possible.'
      });
    }
    
    return findings;
  }
  
  /**
   * Generate reporting findings
   */
  private generateReportingFindings(
    metrics: DocumentationMetrics,
    analysis: MCPDocsResponse
  ): ToolFinding[] {
    return [{
      type: 'metric',
      severity: 'info',
      category: 'documentation',
      message: '📈 Documentation Report',
      ruleId: 'doc-report',
      documentation: JSON.stringify({
        metrics: {
          coverage: metrics.coverage,
          quality: metrics.quality,
          completeness: metrics.completeness,
          readability: metrics.readability
        },
        statistics: {
          totalFiles: metrics.analysis.totalFiles,
          documentedFiles: metrics.analysis.documentedFiles,
          codeExamples: metrics.analysis.codeExamples,
          todos: metrics.analysis.todos
        },
        badge: analysis.badge
      }, null, 2)
    }];
  }
  
  /**
   * Extract metrics for result
   */
  private extractMetrics(analysis: MCPDocsResponse): Record<string, number> {
    const metrics = analysis.metrics;
    
    return {
      documentationScore: analysis.overallScore,
      documentationCoverage: metrics.coverage,
      documentationQuality: metrics.quality,
      readabilityScore: metrics.readability,
      completenessScore: metrics.completeness,
      missingTopicsCount: metrics.missingTopics.length,
      improvementSuggestions: metrics.suggestions.length,
      codeExamples: metrics.analysis.codeExamples,
      brokenLinks: metrics.analysis.brokenLinks,
      todos: metrics.analysis.todos
    };
  }
  
  /**
   * Get tool metadata
   */
  getMetadata(): ToolMetadata {
    return {
      id: this.id,
      name: this.name,
      description: 'MCP-based documentation analysis service for quality metrics and improvement suggestions',
      author: 'CodeQual',
      homepage: 'https://github.com/codequal/mcp-docs-service',
      documentationUrl: 'https://docs.codequal.com/tools/mcp-docs-service',
      supportedRoles: ['educational', 'reporting'] as AgentRole[],
      supportedLanguages: [], // All languages
      supportedFrameworks: [],
      tags: ['documentation', 'quality', 'metrics', 'education', 'readability'],
      securityVerified: true,
      lastVerified: new Date('2025-06-07')
    };
  }
}

// Export singleton instance
export const mcpDocsServiceAdapter = new MCPDocsServiceAdapter();
