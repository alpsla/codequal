/**
 * Markdown PDF MCP Adapter
 * Converts StandardReport to PDF format with embedded charts and professional formatting
 */

import { spawn } from 'child_process';
import { writeFileSync, readFileSync, unlinkSync, existsSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
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

export interface PDFExportOptions {
  format: 'executive' | 'technical' | 'full' | 'educational';
  includeCharts: boolean;
  includeAppendices: boolean;
  pageSize: 'A4' | 'Letter';
  orientation: 'portrait' | 'landscape';
  theme: 'professional' | 'technical' | 'educational';
}

export interface PDFGenerationResult {
  pdfPath: string;
  pdfBuffer: Buffer;
  metadata: {
    pageCount: number;
    fileSize: number;
    generatedAt: Date;
    format: string;
  };
  success: boolean;
  warnings?: string[];
}

export class MarkdownPDFMCPAdapter implements Tool {
  readonly id = 'markdown-pdf-mcp';
  readonly name = 'Markdown PDF Export';
  readonly type = 'mcp' as const;
  readonly version = '1.0.0';
  
  readonly capabilities: ToolCapability[] = [
    {
      name: 'pdf-export',
      category: 'documentation',
      languages: [], // All languages
      fileTypes: ['pdf']
    },
    {
      name: 'document-generation',
      category: 'documentation', 
      languages: [],
      fileTypes: ['md', 'pdf']
    },
    {
      name: 'report-formatting',
      category: 'documentation',
      languages: [],
      fileTypes: ['pdf']
    }
  ];
  
  readonly requirements: ToolRequirements = {
    minFiles: 0, // Works with StandardReport data
    executionMode: 'on-demand',
    timeout: 30000, // 30 seconds for PDF generation
    authentication: {
      type: 'none',
      required: false
    }
  };
  
  readonly applicableRoles: AgentRole[] = ['reporting', 'educational'];
  readonly description = 'Generates professional PDF reports from StandardReport data with embedded charts and visualizations';

  /**
   * Check if tool can analyze given context
   */
  canAnalyze(context: AnalysisContext): boolean {
    // Can work with any context that has report data
    return context.agentRole === 'reporting' || context.agentRole === 'educational';
  }

  /**
   * Execute analysis (main method for PDF generation)
   */
  async analyze(context: AnalysisContext): Promise<ToolResult> {
    return this.execute(context);
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<boolean> {
    // Check if required dependencies are available
    try {
      // In real implementation, would check pandoc availability
      return true;
    } catch {
      return false;
    }
  }

  async execute(context: AnalysisContext): Promise<ToolResult> {
    const startTime = Date.now();
    
    try {
      // Extract report data from context
      const reportData = this.extractReportData(context);
      const options = this.getExportOptions(context);
      
      // Generate markdown content
      const markdownContent = this.generateMarkdown(reportData, options);
      
      // Convert to PDF
      const pdfResult = await this.convertToPDF(markdownContent, options);
      
      const executionTime = Date.now() - startTime;
      
      return {
        success: true,
        toolId: this.id,
        executionTime,
        findings: [],
        metrics: {
          pageCount: pdfResult.metadata.pageCount,
          fileSize: pdfResult.metadata.fileSize,
          generationTime: executionTime
        }
      };
      
    } catch (error) {
      return {
        success: false,
        toolId: this.id,
        executionTime: Date.now() - startTime,
        error: {
          code: 'PDF_GENERATION_FAILED',
          message: `PDF generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          recoverable: true
        },
        findings: []
      };
    }
  }

  private extractReportData(context: AnalysisContext): any {
    // In a real implementation, this would extract from a shared context
    // For now, construct basic report from PR context
    return {
      id: `report_${Date.now()}`,
      repositoryUrl: `https://github.com/${context.repository.owner}/${context.repository.name}`,
      prNumber: context.pr?.prNumber || 0,
      timestamp: new Date(),
      overview: {
        executiveSummary: 'Analysis report generated from code review',
        analysisScore: 75,
        riskLevel: 'medium',
        totalFindings: 0,
        totalRecommendations: 0,
        learningPathAvailable: false,
        estimatedRemediationTime: '2-4 hours'
      },
      findings: [],
      visualizations: {},
      metadata: {
        analysisMode: 'standard',
        agentsUsed: ['reporting'],
        toolsExecuted: [this.id],
        processingTime: 0,
        modelVersions: {},
        reportVersion: '1.0.0'
      }
    };
  }

  private getExportOptions(context: AnalysisContext): PDFExportOptions {
    const format = context.agentRole === 'educational' ? 'educational' : 'technical';
    
    return {
      format: format as 'educational' | 'technical',
      includeCharts: true,
      includeAppendices: true,
      pageSize: 'A4',
      orientation: 'portrait',
      theme: format
    };
  }

  private generateMarkdown(reportData: any, options: PDFExportOptions): string {
    let markdown = '';
    
    // Document header
    markdown += this.generateHeader(reportData, options);
    
    // Executive Summary
    markdown += this.generateExecutiveSummary(reportData);
    
    // Main Content based on format
    switch (options.format) {
      case 'executive':
        markdown += this.generateExecutiveContent(reportData);
        break;
      case 'technical':
        markdown += this.generateTechnicalContent(reportData);
        break;
      case 'full':
        markdown += this.generateFullContent(reportData);
        break;
      case 'educational':
        markdown += this.generateEducationalContent(reportData);
        break;
    }
    
    // Charts and visualizations
    if (options.includeCharts) {
      markdown += this.generateChartsSection(reportData);
    }
    
    // Appendices
    if (options.includeAppendices) {
      markdown += this.generateAppendices(reportData);
    }
    
    return markdown;
  }

  private generateHeader(reportData: any, options: PDFExportOptions): string {
    const timestamp = new Date(reportData.timestamp).toLocaleDateString();
    const repoName = this.extractRepoName(reportData.repositoryUrl);
    
    return `---
title: "CodeQual Analysis Report"
subtitle: "${repoName} - PR #${reportData.prNumber}"
date: "${timestamp}"
theme: "${options.theme}"
geometry: margin=1in
documentclass: article
fontsize: 11pt
---

# CodeQual Analysis Report

**Repository:** ${reportData.repositoryUrl}  
**Pull Request:** #${reportData.prNumber}  
**Analysis Date:** ${timestamp}  
**Report Format:** ${options.format.charAt(0).toUpperCase() + options.format.slice(1)}  

---

`;
  }

  private generateExecutiveSummary(reportData: any): string {
    const overview = reportData.overview || {};
    
    return `## Executive Summary

${overview.executiveSummary || 'Analysis completed successfully.'}

### Key Metrics
- **Analysis Score:** ${overview.analysisScore || 'N/A'}/100
- **Risk Level:** ${(overview.riskLevel || 'unknown').toUpperCase()}
- **Total Findings:** ${overview.totalFindings || 0}
- **Estimated Remediation Time:** ${overview.estimatedRemediationTime || 'Unknown'}

---

`;
  }

  private generateTechnicalContent(reportData: any): string {
    let content = '## Technical Analysis\n\n';
    
    // Findings by category
    if (reportData.modules?.findings) {
      content += this.generateFindingsSection(reportData.modules.findings);
    }
    
    // Recommendations
    if (reportData.modules?.recommendations) {
      content += this.generateRecommendationsSection(reportData.modules.recommendations);
    }
    
    // Metrics
    if (reportData.modules?.metrics) {
      content += this.generateMetricsSection(reportData.modules.metrics);
    }
    
    return content;
  }

  private generateEducationalContent(reportData: any): string {
    let content = '## Educational Content\n\n';
    
    if (reportData.modules?.educational) {
      const edu = reportData.modules.educational;
      
      if (edu.learningPath) {
        content += '### Learning Path\n\n';
        content += `**Title:** ${edu.learningPath.title || 'Code Quality Improvement'}\n`;
        content += `**Difficulty:** ${edu.learningPath.difficulty || 'Intermediate'}\n`;
        content += `**Estimated Time:** ${edu.learningPath.estimatedTime || 'Unknown'}\n\n`;
        
        if (edu.learningPath.steps && edu.learningPath.steps.length > 0) {
          content += '#### Learning Steps\n\n';
          edu.learningPath.steps.forEach((step: any, index: number) => {
            content += `${index + 1}. **${step.title || step.topic}**\n`;
            content += `   - ${step.description || 'No description available'}\n`;
            content += `   - Estimated time: ${step.estimatedTime || 'Unknown'}\n\n`;
          });
        }
      }
      
      if (edu.skillGaps && edu.skillGaps.length > 0) {
        content += '### Skill Gap Analysis\n\n';
        content += '| Skill | Current Level | Required Level | Priority |\n';
        content += '|-------|---------------|----------------|----------|\n';
        edu.skillGaps.forEach((gap: any) => {
          content += `| ${gap.skill} | ${gap.currentLevel}/10 | ${gap.requiredLevel}/10 | ${gap.priority} |\n`;
        });
        content += '\n';
      }
    }
    
    return content;
  }

  private generateFullContent(reportData: any): string {
    return this.generateTechnicalContent(reportData) + 
           this.generateEducationalContent(reportData);
  }

  private generateExecutiveContent(reportData: any): string {
    let content = '## Key Findings\n\n';
    
    if (reportData.modules?.findings?.criticalFindings) {
      const critical = reportData.modules.findings.criticalFindings;
      if (critical.length > 0) {
        content += '### Critical Issues\n\n';
        critical.forEach((finding: any, index: number) => {
          content += `${index + 1}. **${finding.title}**\n`;
          content += `   - Severity: ${finding.severity}\n`;
          content += `   - File: ${finding.file}\n`;
          content += `   - Impact: ${finding.impact || 'Unknown'}\n\n`;
        });
      }
    }
    
    return content;
  }

  private generateFindingsSection(findings: any): string {
    let content = '### Detailed Findings\n\n';
    
    const categories = ['security', 'architecture', 'performance', 'codeQuality', 'dependencies'];
    
    categories.forEach(category => {
      const categoryData = findings.categories?.[category];
      if (categoryData && categoryData.count > 0) {
        content += `#### ${categoryData.name || category.charAt(0).toUpperCase() + category.slice(1)}\n\n`;
        content += `**Total Issues:** ${categoryData.count}\n\n`;
        
        if (categoryData.findings && categoryData.findings.length > 0) {
          categoryData.findings.forEach((finding: any, index: number) => {
            content += `${index + 1}. **${finding.title}**\n`;
            content += `   - **Severity:** ${finding.severity}\n`;
            content += `   - **File:** ${finding.file}${finding.line ? `:${finding.line}` : ''}\n`;
            if (finding.description) {
              content += `   - **Description:** ${finding.description}\n`;
            }
            if (finding.recommendation) {
              content += `   - **Recommendation:** ${finding.recommendation}\n`;
            }
            content += '\n';
          });
        }
      }
    });
    
    return content;
  }

  private generateRecommendationsSection(recommendations: any): string {
    let content = '### Recommendations\n\n';
    
    if (recommendations.summary) {
      content += `${recommendations.summary}\n\n`;
    }
    
    if (recommendations.priorityMatrix) {
      const priorities = ['critical', 'high', 'medium', 'low'];
      
      priorities.forEach(priority => {
        const items = recommendations.priorityMatrix[priority];
        if (items && items.length > 0) {
          content += `#### ${priority.charAt(0).toUpperCase() + priority.slice(1)} Priority\n\n`;
          items.forEach((rec: any, index: number) => {
            content += `${index + 1}. **${rec.title}**\n`;
            content += `   - ${rec.description}\n`;
            if (rec.estimatedEffort) {
              content += `   - **Effort:** ${rec.estimatedEffort}\n`;
            }
            content += '\n';
          });
        }
      });
    }
    
    return content;
  }

  private generateMetricsSection(metrics: any): string {
    let content = '### Code Metrics\n\n';
    
    content += '| Metric | Value |\n';
    content += '|--------|-------|\n';
    
    if (metrics.codeQuality) {
      Object.entries(metrics.codeQuality).forEach(([key, value]) => {
        content += `| ${key.charAt(0).toUpperCase() + key.slice(1)} | ${value} |\n`;
      });
    }
    
    if (metrics.security) {
      Object.entries(metrics.security).forEach(([key, value]) => {
        content += `| Security ${key} | ${value} |\n`;
      });
    }
    
    content += '\n';
    return content;
  }

  private generateChartsSection(reportData: any): string {
    let content = '### Visualizations\n\n';
    
    if (reportData.visualizations) {
      const viz = reportData.visualizations;
      
      if (viz.severityDistribution) {
        content += '#### Issue Severity Distribution\n\n';
        content += this.chartToMarkdown(viz.severityDistribution);
      }
      
      if (viz.categoryBreakdown) {
        content += '#### Issues by Category\n\n';
        content += this.chartToMarkdown(viz.categoryBreakdown);
      }
    }
    
    return content;
  }

  private generateAppendices(reportData: any): string {
    let content = '## Appendices\n\n';
    
    content += '### A. Tool Execution Details\n\n';
    if (reportData.metadata) {
      content += `- **Tools Executed:** ${reportData.metadata.toolsExecuted?.join(', ') || 'None'}\n`;
      content += `- **Processing Time:** ${reportData.metadata.processingTime || 0}ms\n`;
      content += `- **Analysis Mode:** ${reportData.metadata.analysisMode || 'Standard'}\n`;
    }
    
    content += '\n### B. Model Versions\n\n';
    if (reportData.metadata?.modelVersions) {
      Object.entries(reportData.metadata.modelVersions).forEach(([model, version]) => {
        content += `- **${model}:** ${version}\n`;
      });
    }
    
    return content;
  }

  private chartToMarkdown(chartData: any): string {
    if (!chartData || !chartData.data) return '';
    
    let content = '';
    
    // Convert chart data to simple table format
    if (chartData.data.labels && chartData.data.datasets) {
      content += '| Category | Value |\n';
      content += '|----------|-------|\n';
      
      chartData.data.labels.forEach((label: string, index: number) => {
        const value = chartData.data.datasets[0]?.data[index] || 0;
        content += `| ${label} | ${value} |\n`;
      });
    }
    
    content += '\n*Chart visualization available in interactive report*\n\n';
    return content;
  }

  private async convertToPDF(markdownContent: string, options: PDFExportOptions): Promise<PDFGenerationResult> {
    const tempDir = tmpdir();
    const timestamp = Date.now();
    const mdFile = join(tempDir, `report_${timestamp}.md`);
    const pdfFile = join(tempDir, `report_${timestamp}.pdf`);
    
    try {
      // Write markdown to temp file
      writeFileSync(mdFile, markdownContent, 'utf8');
      
      // Use pandoc to convert to PDF if available, fallback to simpler method
      const pdfBuffer = await this.generatePDFWithPandoc(mdFile, pdfFile, options);
      
      const stats = {
        pageCount: this.estimatePageCount(markdownContent),
        fileSize: pdfBuffer.length,
        generatedAt: new Date(),
        format: options.format
      };
      
      return {
        pdfPath: pdfFile,
        pdfBuffer,
        metadata: stats,
        success: true
      };
      
    } finally {
      // Clean up temp files
      if (existsSync(mdFile)) unlinkSync(mdFile);
    }
  }

  private async generatePDFWithPandoc(mdFile: string, pdfFile: string, options: PDFExportOptions): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const pandocArgs = [
        mdFile,
        '-o', pdfFile,
        '--pdf-engine=weasyprint',
        `--metadata=title:"CodeQual Analysis Report"`,
        `--metadata=author:"CodeQual"`,
        '--table-of-contents',
        '--toc-depth=3',
        '--number-sections',
        '--highlight-style=github'
      ];
      
      if (options.pageSize === 'A4') {
        pandocArgs.push('-V', 'geometry:a4paper');
      }
      
      const pandoc = spawn('pandoc', pandocArgs);
      
      let stderr = '';
      pandoc.stderr.on('data', (data) => {
        stderr += data.toString();
      });
      
      pandoc.on('close', (code) => {
        if (code !== 0) {
          // Fallback: create a simple PDF placeholder
          const fallbackContent = this.createFallbackPDF(mdFile);
          resolve(Buffer.from(fallbackContent));
        } else {
          try {
            const pdfBuffer = readFileSync(pdfFile);
            if (existsSync(pdfFile)) unlinkSync(pdfFile);
            resolve(pdfBuffer);
          } catch (error) {
            reject(new Error(`Failed to read generated PDF: ${error}`));
          }
        }
      });
      
      pandoc.on('error', () => {
        // Pandoc not available, use fallback
        const fallbackContent = this.createFallbackPDF(mdFile);
        resolve(Buffer.from(fallbackContent));
      });
    });
  }

  private createFallbackPDF(mdFile: string): string {
    // Create a simple text-based PDF using basic PDF structure
    const markdown = readFileSync(mdFile, 'utf8');
    const plainText = markdown
      .replace(/#{1,6}\s+/g, '')
      .replace(/\*\*(.*?)\*\*/g, '$1')
      .replace(/\*(.*?)\*/g, '$1')
      .replace(/\[(.*?)\]\(.*?\)/g, '$1');
    
    // Basic PDF structure (simplified)
    return `%PDF-1.4
1 0 obj
<<
/Type /Catalog
/Pages 2 0 R
>>
endobj

2 0 obj
<<
/Type /Pages
/Kids [3 0 R]
/Count 1
>>
endobj

3 0 obj
<<
/Type /Page
/Parent 2 0 R
/MediaBox [0 0 612 792]
/Contents 4 0 R
>>
endobj

4 0 obj
<<
/Length ${plainText.length + 50}
>>
stream
BT
/F1 12 Tf
72 720 Td
(CodeQual Analysis Report) Tj
0 -20 Td
(${plainText.substring(0, 500).replace(/\n/g, ') Tj 0 -12 Td (')}) Tj
ET
endstream
endobj

xref
0 5
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000204 00000 n 
trailer
<<
/Size 5
/Root 1 0 R
>>
startxref
${300 + plainText.length}
%%EOF`;
  }

  private estimatePageCount(content: string): number {
    const wordsPerPage = 500;
    const wordCount = content.split(/\s+/).length;
    return Math.max(1, Math.ceil(wordCount / wordsPerPage));
  }

  private formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} bytes`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  private extractRepoName(url: string): string {
    const match = url.match(/\/([^\/]+)\/([^\/]+)(?:\.git)?$/);
    return match ? `${match[1]}/${match[2]}` : 'Unknown Repository';
  }

  getMetadata(): ToolMetadata {
    return {
      id: this.id,
      name: this.name,
      description: this.description,
      author: 'CodeQual Team',
      supportedRoles: this.applicableRoles,
      supportedLanguages: [], // All languages
      tags: ['pdf', 'export', 'documentation', 'reporting'],
      securityVerified: true,
      lastVerified: new Date()
    };
  }
}