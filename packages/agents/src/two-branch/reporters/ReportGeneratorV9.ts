/**
 * Report Generator V9 - Two-Branch Analysis Edition
 * 
 * Adapted from V8 with:
 * 1. Full integration with ModelResearcherService for dynamic model selection
 * 2. Specialized agent results formatting
 * 3. Educational content integration
 * 4. Clean markdown output (no HTML needed)
 * 5. Support for two-branch comparison results
 */

import { 
  TwoBranchAnalysisResult,
  SpecializedAnalysisResult,
  EducationalContent,
  FinalReport
} from '../core/TwoBranchAnalyzer';
import { 
  ComparisonResult,
  ToolIssue,
  EnhancedIssue,
  IssueCategory,
  IssueSeverity
} from '../types';
import { ModelResearcherService } from '../../standard/services/model-researcher-service';
import { logger } from '../utils/logger';

export interface V9ReportOptions {
  includeEducation?: boolean;
  includeArchitectureDiagram?: boolean;
  includeMetrics?: boolean;
  includeActionItems?: boolean;
  includeModelInfo?: boolean;
  verbosity?: 'minimal' | 'standard' | 'detailed';
  maxIssuesPerSection?: number;
}

interface ModelConfig {
  primary: {
    model: string;
    provider?: string;
  };
  fallback: {
    model: string;
    provider?: string;
  };
}

export class ReportGeneratorV9 {
  private modelResearcher: ModelResearcherService;
  private modelCache: Map<string, ModelConfig> = new Map();
  
  constructor(private options: V9ReportOptions = {}) {
    this.modelResearcher = new ModelResearcherService();
  }
  
  /**
   * Generate complete markdown report for two-branch analysis
   */
  async generateReport(result: TwoBranchAnalysisResult): Promise<string> {
    const sections: string[] = [];
    
    // Header
    sections.push(this.generateHeader(result));
    
    // Executive Summary
    sections.push(this.generateExecutiveSummary(result));
    
    // Risk Assessment
    sections.push(this.generateRiskAssessment(result.report.riskAssessment));
    
    // Key Metrics
    if (this.options.includeMetrics !== false) {
      sections.push(this.generateMetricsSection(result.comparison.metrics));
    }
    
    // Issues Summary
    sections.push(this.generateIssuesSummary(result.comparison));
    
    // Specialized Agent Analysis
    sections.push(this.generateSpecializedAnalysis(result.specializedAnalysis));
    
    // Educational Content
    if (this.options.includeEducation && result.educationalContent) {
      sections.push(this.generateEducationalSection(result.educationalContent));
    }
    
    // Detailed Findings
    sections.push(this.generateDetailedFindings(result.comparison));
    
    // Action Items
    if (this.options.includeActionItems !== false) {
      sections.push(this.generateActionItems(result.report.recommendations));
    }
    
    // Architecture Diagram
    if (this.options.includeArchitectureDiagram) {
      sections.push(this.generateArchitectureDiagram(result));
    }
    
    // Footer with metadata
    sections.push(this.generateFooter(result));
    
    return sections.join('\n\n');
  }
  
  /**
   * Generate report with dynamic model selection
   */
  async generateReportWithDynamicModels(
    result: TwoBranchAnalysisResult,
    context?: {
      repositorySize?: 'small' | 'medium' | 'large';
      language?: string;
      priority?: 'quality' | 'speed' | 'cost';
    }
  ): Promise<string> {
    // Get optimal model for report generation
    const modelConfig = await this.getModelForRole('reporting', context);
    
    // Log model selection if requested
    if (this.options.includeModelInfo) {
      logger.info(`Using model: ${modelConfig.primary.model} (fallback: ${modelConfig.fallback.model})`);
    }
    
    // Generate report with selected model context
    return this.generateReport(result);
  }
  
  /**
   * Get optimal model configuration for a role
   */
  private async getModelForRole(
    role: string,
    context?: any
  ): Promise<ModelConfig> {
    const cacheKey = `${role}:${JSON.stringify(context)}`;
    
    // Check cache
    if (this.modelCache.has(cacheKey)) {
      return this.modelCache.get(cacheKey)!;
    }
    
    try {
      // Request optimal model from researcher
      const optimalModel = await this.modelResearcher.getOptimalModelForContext({
        language: context?.language || 'typescript',
        repo_size: context?.repositorySize || 'medium',
        task_type: 'analysis',
        specific_requirements: [role]
      });
      
      // Use same model as fallback since getFallbackModel is private
      const fallbackModel = optimalModel;
      
      const config: ModelConfig = {
        primary: { model: optimalModel },
        fallback: { model: fallbackModel }
      };
      
      // Cache configuration
      this.modelCache.set(cacheKey, config);
      
      return config;
    } catch (error) {
      logger.warn(`Failed to get optimal model for ${role}, using defaults`);
      return {
        primary: { model: 'openai/gpt-4o-mini' },
        fallback: { model: 'anthropic/claude-3-haiku' }
      };
    }
  }
  
  private generateHeader(result: TwoBranchAnalysisResult): string {
    return `# 📊 Pull Request Analysis Report

**Repository:** [${result.repository.owner}/${result.repository.name}](${result.repository.url})  
**Pull Request:** #${result.prNumber}  
**Branch:** \`${result.branches.pr}\` → \`${result.branches.main}\`  
**Generated:** ${new Date().toLocaleString()}

---`;
  }
  
  private generateExecutiveSummary(result: TwoBranchAnalysisResult): string {
    const { comparison, report } = result;
    const improvement = comparison.metrics.improvement;
    const trend = improvement > 0 ? '📈 Improvement' : improvement < 0 ? '📉 Regression' : '➡️ No Change';
    
    return `## 📋 Executive Summary

${report.executiveSummary}

### Overall Assessment
- **Risk Level:** ${this.formatRiskLevel(report.riskAssessment.level)}
- **Quality Score:** ${comparison.metrics.scores.overall}/100
- **Trend:** ${trend} (${improvement > 0 ? '+' : ''}${improvement.toFixed(1)}%)

### Key Statistics
| Metric | Count | Change |
|--------|-------|--------|
| 🆕 New Issues | ${comparison.newIssues.length} | - |
| ✅ Fixed Issues | ${comparison.fixedIssues.length} | - |
| 📌 Unchanged Issues | ${comparison.unchangedIssues.length} | - |
| **Total Active** | ${comparison.newIssues.length + comparison.unchangedIssues.length} | ${improvement > 0 ? '↓' : '↑'} |`;
  }
  
  private generateRiskAssessment(risk: FinalReport['riskAssessment']): string {
    const riskEmoji = {
      low: '🟢',
      medium: '🟡',
      high: '🟠',
      critical: '🔴'
    };
    
    return `## 🎯 Risk Assessment

### ${riskEmoji[risk.level]} ${risk.level.toUpperCase()} Risk
**Score:** ${risk.score}/100

${risk.factors.length > 0 ? '### Risk Factors\n' + risk.factors.map(f => `- ${f}`).join('\n') : ''}`;
  }
  
  private generateMetricsSection(metrics: any): string {
    return `## 📊 Detailed Metrics

### Severity Distribution
| Level | Count | Percentage |
|-------|-------|------------|
| 🔴 Critical | ${metrics.critical} | ${this.getPercentage(metrics.critical, metrics.total)}% |
| 🟠 High | ${metrics.high} | ${this.getPercentage(metrics.high, metrics.total)}% |
| 🟡 Medium | ${metrics.medium} | ${this.getPercentage(metrics.medium, metrics.total)}% |
| 🟢 Low | ${metrics.low} | ${this.getPercentage(metrics.low, metrics.total)}% |
| ℹ️ Info | ${metrics.info} | ${this.getPercentage(metrics.info, metrics.total)}% |

### Category Breakdown
| Category | Issues | Score |
|----------|--------|-------|
| 🔒 Security | ${metrics.byCategory.security || 0} | ${metrics.scores.security}/100 |
| ⚡ Performance | ${metrics.byCategory.performance || 0} | ${metrics.scores.performance}/100 |
| 🏗️ Architecture | ${metrics.byCategory.architecture || 0} | - |
| 📦 Dependencies | ${metrics.byCategory.dependency || 0} | - |
| ✨ Code Quality | ${metrics.byCategory.quality || 0} | ${metrics.scores.quality}/100 |`;
  }
  
  private generateIssuesSummary(comparison: ComparisonResult): string {
    const sections: string[] = ['## 🔍 Issues Summary'];
    
    // New Issues
    if (comparison.newIssues.length > 0) {
      sections.push(`### 🆕 New Issues (${comparison.newIssues.length})`);
      sections.push(this.formatIssuesList(
        comparison.newIssues.slice(0, this.options.maxIssuesPerSection || 10),
        'new'
      ));
    }
    
    // Fixed Issues
    if (comparison.fixedIssues.length > 0) {
      sections.push(`### ✅ Fixed Issues (${comparison.fixedIssues.length})`);
      sections.push(this.formatIssuesList(
        comparison.fixedIssues.slice(0, this.options.maxIssuesPerSection || 5),
        'fixed'
      ));
    }
    
    // Critical Unchanged Issues
    const criticalUnchanged = comparison.unchangedIssues.filter(i => i.severity === 'critical');
    if (criticalUnchanged.length > 0) {
      sections.push(`### ⚠️ Critical Pre-existing Issues (${criticalUnchanged.length})`);
      sections.push(this.formatIssuesList(criticalUnchanged, 'unchanged'));
    }
    
    return sections.join('\n\n');
  }
  
  private generateSpecializedAnalysis(
    analysis: Map<IssueCategory, SpecializedAnalysisResult>
  ): string {
    if (analysis.size === 0) return '';
    
    const sections: string[] = ['## 🤖 Specialized Agent Analysis'];
    
    for (const [category, result] of analysis) {
      const emoji = this.getCategoryEmoji(category);
      sections.push(`### ${emoji} ${this.capitalize(category)} Analysis`);
      
      if (result.insights.length > 0) {
        sections.push('**Key Insights:**');
        sections.push(result.insights.map(i => `- ${i}`).join('\n'));
      }
      
      if (result.recommendations.length > 0) {
        sections.push('\n**Recommendations:**');
        sections.push(result.recommendations.map(r => `- ${r}`).join('\n'));
      }
      
      if (result.metrics) {
        sections.push('\n**Metrics:**');
        sections.push(this.formatMetricsTable(result.metrics));
      }
    }
    
    return sections.join('\n\n');
  }
  
  private generateEducationalSection(education: EducationalContent): string {
    const sections: string[] = ['## 📚 Educational Resources'];
    
    // Key Learnings
    if (education.keyLearnings.length > 0) {
      sections.push('### 🎓 Key Learnings');
      education.keyLearnings.slice(0, 5).forEach(learning => {
        sections.push(`#### ${learning.topic}`);
        sections.push(learning.description);
        if (learning.resources.length > 0) {
          sections.push('**Resources:**');
          sections.push(learning.resources.map(r => `- ${r}`).join('\n'));
        }
      });
    }
    
    // Best Practices
    if (education.bestPractices.length > 0) {
      sections.push('### ✨ Best Practices Applied');
      education.bestPractices.forEach(practice => {
        sections.push(`- **${practice.title}:** ${practice.description}`);
      });
    }
    
    // Resources
    if (education.resources.length > 0) {
      sections.push('### 📖 Additional Resources');
      const grouped = this.groupResourcesByType(education.resources);
      for (const [type, resources] of Object.entries(grouped)) {
        sections.push(`**${this.capitalize(type)}:**`);
        sections.push(resources.map(r => `- [${r.title}](${r.url})`).join('\n'));
      }
    }
    
    return sections.join('\n\n');
  }
  
  private generateDetailedFindings(comparison: ComparisonResult): string {
    if (this.options.verbosity === 'minimal') {
      return '';
    }
    
    const sections: string[] = ['## 📝 Detailed Findings'];
    
    // Group issues by file
    const issuesByFile = this.groupIssuesByFile([
      ...comparison.newIssues,
      ...comparison.unchangedIssues
    ]);
    
    for (const [file, issues] of issuesByFile.entries()) {
      sections.push(`### 📄 ${file}`);
      sections.push(this.formatFileIssues(issues));
    }
    
    return sections.join('\n\n');
  }
  
  private generateActionItems(recommendations: FinalReport['recommendations']): string {
    const sections: string[] = ['## ✅ Action Items'];
    
    if (recommendations.immediate.length > 0) {
      sections.push('### 🚨 Immediate (Block PR)');
      sections.push(recommendations.immediate.map(r => `- [ ] ${r}`).join('\n'));
    }
    
    if (recommendations.shortTerm.length > 0) {
      sections.push('### ⏱️ Short Term (Next Sprint)');
      sections.push(recommendations.shortTerm.map(r => `- [ ] ${r}`).join('\n'));
    }
    
    if (recommendations.longTerm.length > 0) {
      sections.push('### 📅 Long Term (Backlog)');
      sections.push(recommendations.longTerm.map(r => `- [ ] ${r}`).join('\n'));
    }
    
    return sections.join('\n\n');
  }
  
  private generateArchitectureDiagram(result: TwoBranchAnalysisResult): string {
    // Simple ASCII diagram showing issue flow
    return `## 🏗️ Architecture Impact

\`\`\`
┌─────────────────┐
│   Main Branch   │
│   ${result.comparison.unchangedIssues.length} issues    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│    PR Branch    │
│  +${result.comparison.newIssues.length} new issues  │
│  -${result.comparison.fixedIssues.length} fixed      │
└─────────────────┘
         │
         ▼
┌─────────────────┐
│  Final State    │
│   ${result.comparison.newIssues.length + result.comparison.unchangedIssues.length} issues    │
└─────────────────┘
\`\`\``;
  }
  
  private generateFooter(result: TwoBranchAnalysisResult): string {
    return `---

## 📌 Report Metadata

- **Analysis Duration:** ${result.metadata.duration}ms
- **Tools Used:** ${result.metadata.toolsUsed.length || 'Multiple'}
- **Cached Results:** ${result.metadata.cached ? 'Yes' : 'No'}
- **Report Version:** V9 (Two-Branch Analysis)
- **Generated By:** CodeQual Analysis Platform

---

*This report was generated automatically. For questions or improvements, please contact the development team.*`;
  }
  
  // Helper methods
  
  private formatRiskLevel(level: string): string {
    const emoji = {
      low: '🟢 Low',
      medium: '🟡 Medium',
      high: '🟠 High',
      critical: '🔴 Critical'
    };
    return emoji[level as keyof typeof emoji] || level;
  }
  
  private formatIssuesList(issues: EnhancedIssue[], type: string): string {
    return issues.map(issue => {
      const severity = this.getSeverityEmoji(issue.severity);
      const location = issue.file ? `\`${issue.file}:${issue.startLine || 0}\`` : '`Unknown location`';
      const status = type === 'new' ? '🆕' : type === 'fixed' ? '✅' : '📌';
      
      return `- ${status} ${severity} **${issue.message}** ${location}`;
    }).join('\n');
  }
  
  private formatFileIssues(issues: EnhancedIssue[]): string {
    return issues.map(issue => {
      const severity = this.getSeverityEmoji(issue.severity);
      const line = issue.startLine ? `Line ${issue.startLine}` : 'Unknown line';
      
      let text = `- ${severity} **${line}:** ${issue.message}`;
      
      if (issue.suggestion && this.options.verbosity === 'detailed') {
        text += `\n  - 💡 **Suggestion:** ${issue.suggestion}`;
      }
      
      return text;
    }).join('\n');
  }
  
  private formatMetricsTable(metrics: Record<string, any>): string {
    const rows = Object.entries(metrics).map(([key, value]) => 
      `| ${this.capitalize(key)} | ${value} |`
    );
    
    return `| Metric | Value |\n|--------|-------|\n${rows.join('\n')}`;
  }
  
  private groupIssuesByFile(issues: EnhancedIssue[]): Map<string, EnhancedIssue[]> {
    const grouped = new Map<string, EnhancedIssue[]>();
    
    for (const issue of issues) {
      const file = issue.file || 'Unknown';
      if (!grouped.has(file)) {
        grouped.set(file, []);
      }
      grouped.get(file)!.push(issue);
    }
    
    // Sort by number of issues
    return new Map([...grouped.entries()].sort((a, b) => b[1].length - a[1].length));
  }
  
  private groupResourcesByType(resources: any[]): Record<string, any[]> {
    const grouped: Record<string, any[]> = {};
    
    for (const resource of resources) {
      const type = resource.type || 'other';
      if (!grouped[type]) {
        grouped[type] = [];
      }
      grouped[type].push(resource);
    }
    
    return grouped;
  }
  
  private getSeverityEmoji(severity: IssueSeverity): string {
    const map = {
      critical: '🔴',
      high: '🟠',
      medium: '🟡',
      low: '🟢',
      info: 'ℹ️'
    };
    return map[severity] || '⚪';
  }
  
  private getCategoryEmoji(category: IssueCategory): string {
    const map = {
      security: '🔒',
      performance: '⚡',
      architecture: '🏗️',
      quality: '✨',
      dependency: '📦'
    };
    return map[category] || '📌';
  }
  
  private getPercentage(value: number, total: number): string {
    if (total === 0) return '0';
    return ((value / total) * 100).toFixed(1);
  }
  
  private capitalize(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }
}

export default ReportGeneratorV9;