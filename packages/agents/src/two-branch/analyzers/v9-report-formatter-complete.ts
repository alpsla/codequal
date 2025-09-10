/**
 * V9 Complete Report Formatter Module
 * 
 * Generates comprehensive reports with ALL metadata including:
 * - Performance data for agents and tools
 * - Cost per agent and total scan cost
 * - Models used by each agent
 * - Owner and author information
 * - Lines of code analyzed
 * - Duration times per component
 */

import { 
  Issue, 
  IssueCategory, 
  IssueSeverity,
  AnalysisResult, 
  ReportOptions,
  BusinessImpact,
  EducationalResource,
  SkillScore
} from './v9-types';
import { V9ScoringCalculator } from './v9-scoring-calculator';
import { V9BusinessImpact } from './v9-business-impact';
import { V9EducationalResources } from './v9-educational-resources';

// Extended metadata interfaces for complete tracking
export interface AgentPerformance {
  agentName: string;
  executionTime: number;
  issuesFound: number;
  filesAnalyzed: number;
  tokensUsed: number;
  modelUsed: {
    provider: string;
    model: string;
    temperature?: number;
  };
  cost: number;
  status: 'success' | 'failed' | 'timeout';
  errorMessage?: string;
}

export interface ToolPerformance {
  toolName: string;
  executionTime: number;
  filesScanned: number;
  issuesFound: number;
  exitCode: number;
  stdout: string;
  stderr?: string;
}

export interface CompleteMetadata {
  // Repository Information
  repository: string;
  repoUrl: string;
  prNumber: number;
  prTitle?: string;
  branch: string;
  baseBranch: string;
  
  // Author Information
  prAuthor: string;
  prAuthorEmail?: string;
  repoOwner: string;
  organizationName?: string;
  
  // Code Statistics
  totalLinesOfCode: number;
  linesAdded: number;
  linesDeleted: number;
  linesModified: number;
  filesModified: number;
  totalFiles: number;
  languageBreakdown: Record<string, number>; // e.g., { "Java": 15000, "XML": 500 }
  
  // Performance Metrics
  totalDuration: number;
  cloneTime: number;
  analysisTime: number;
  reportGenerationTime: number;
  
  // Agent Performance
  agentsUsed: AgentPerformance[];
  
  // Tool Performance
  toolsUsed: ToolPerformance[];
  
  // Cost Analysis
  totalCost: number;
  costBreakdown: {
    aiModels: number;
    infrastructure: number;
    tools: number;
  };
  estimatedMonthlyCost?: number;
  
  // Analysis Configuration
  analyzer: string;
  analyzerVersion: string;
  smartFileSelection: boolean;
  maxFilesAnalyzed: number;
  
  // Timestamps
  startTime: string;
  endTime: string;
  timestamp: string;
}

export class V9ReportFormatterComplete {
  private readonly scoringCalculator: V9ScoringCalculator;
  private readonly businessImpact: V9BusinessImpact;
  private readonly educationalResources: V9EducationalResources;

  constructor() {
    this.scoringCalculator = new V9ScoringCalculator();
    this.businessImpact = new V9BusinessImpact();
    this.educationalResources = new V9EducationalResources();
  }

  /**
   * Generate complete report with all metadata
   */
  async generateCompleteReport(
    result: AnalysisResult,
    metadata: CompleteMetadata,
    language: string,
    options: ReportOptions = {
      format: 'markdown',
      includeCodeSnippets: true,
      includeEducationalResources: true,
      includeBusinessImpact: true,
      includeSkillScore: true,
      groupSimilarIssues: false
    }
  ): Promise<string> {
    const report: string[] = [];
    
    // ============= HEADER WITH COMPLETE METADATA =============
    report.push('# 🔍 V9 Code Quality Analysis Report - Complete Edition');
    report.push('');
    
    // Repository and PR Information
    report.push('## 📋 Pull Request Information');
    report.push('');
    report.push('| Property | Value |');
    report.push('|----------|-------|');
    report.push(`| **Repository** | ${metadata.repository} |`);
    report.push(`| **Repository URL** | [${metadata.repoUrl}](${metadata.repoUrl}) |`);
    report.push(`| **Pull Request** | #${metadata.prNumber}${metadata.prTitle ? ` - ${metadata.prTitle}` : ''} |`);
    report.push(`| **PR Author** | ${metadata.prAuthor}${metadata.prAuthorEmail ? ` (${metadata.prAuthorEmail})` : ''} |`);
    report.push(`| **Repository Owner** | ${metadata.repoOwner} |`);
    if (metadata.organizationName) {
      report.push(`| **Organization** | ${metadata.organizationName} |`);
    }
    report.push(`| **Source Branch** | ${metadata.branch} |`);
    report.push(`| **Target Branch** | ${metadata.baseBranch} |`);
    report.push(`| **Analysis Date** | ${metadata.timestamp} |`);
    report.push(`| **Analyzer** | ${metadata.analyzer} v${metadata.analyzerVersion} |`);
    report.push('');
    
    // Code Statistics
    report.push('## 📊 Code Statistics');
    report.push('');
    report.push('### Repository Metrics');
    report.push('| Metric | Value |');
    report.push('|--------|-------|');
    report.push(`| **Total Lines of Code** | ${metadata.totalLinesOfCode.toLocaleString()} |`);
    report.push(`| **Lines Added** | +${metadata.linesAdded.toLocaleString()} |`);
    report.push(`| **Lines Deleted** | -${metadata.linesDeleted.toLocaleString()} |`);
    report.push(`| **Lines Modified** | ±${metadata.linesModified.toLocaleString()} |`);
    report.push(`| **Files Modified** | ${metadata.filesModified} |`);
    report.push(`| **Total Files in Repo** | ${metadata.totalFiles.toLocaleString()} |`);
    report.push(`| **Files Analyzed** | ${metadata.maxFilesAnalyzed} |`);
    report.push(`| **Smart Selection** | ${metadata.smartFileSelection ? '✅ Enabled' : '❌ Disabled'} |`);
    report.push('');
    
    // Language Breakdown
    if (metadata.languageBreakdown && Object.keys(metadata.languageBreakdown).length > 0) {
      report.push('### Language Distribution');
      report.push('| Language | Lines of Code | Percentage |');
      report.push('|----------|---------------|------------|');
      const total = Object.values(metadata.languageBreakdown).reduce((a, b) => a + b, 0);
      for (const [lang, lines] of Object.entries(metadata.languageBreakdown)) {
        const percentage = ((lines / total) * 100).toFixed(1);
        report.push(`| ${lang} | ${lines.toLocaleString()} | ${percentage}% |`);
      }
      report.push('');
    }
    
    // ============= PERFORMANCE METRICS =============
    report.push('## ⚡ Performance Metrics');
    report.push('');
    
    // Overall Performance
    report.push('### Overall Analysis Performance');
    report.push('| Stage | Duration | Percentage |');
    report.push('|-------|----------|------------|');
    const totalTime = metadata.totalDuration;
    report.push(`| **Repository Clone** | ${this.formatDuration(metadata.cloneTime)} | ${this.calculatePercentage(metadata.cloneTime, totalTime)}% |`);
    report.push(`| **Code Analysis** | ${this.formatDuration(metadata.analysisTime)} | ${this.calculatePercentage(metadata.analysisTime, totalTime)}% |`);
    report.push(`| **Report Generation** | ${this.formatDuration(metadata.reportGenerationTime)} | ${this.calculatePercentage(metadata.reportGenerationTime, totalTime)}% |`);
    report.push(`| **Total Duration** | ${this.formatDuration(totalTime)} | 100% |`);
    report.push('');
    
    // Agent Performance Details
    if (metadata.agentsUsed.length > 0) {
      report.push('### Agent Performance & Cost Analysis');
      report.push('| Agent | Execution Time | Issues Found | Files | Model Used | Tokens | Cost |');
      report.push('|-------|----------------|--------------|-------|------------|--------|------|');
      
      for (const agent of metadata.agentsUsed) {
        const modelInfo = `${agent.modelUsed.provider}/${agent.modelUsed.model}`;
        const status = agent.status === 'success' ? '✅' : agent.status === 'failed' ? '❌' : '⏱️';
        report.push(`| ${status} ${agent.agentName} | ${this.formatDuration(agent.executionTime)} | ${agent.issuesFound} | ${agent.filesAnalyzed} | ${modelInfo} | ${agent.tokensUsed.toLocaleString()} | $${agent.cost.toFixed(4)} |`);
      }
      report.push('');
      
      // Agent Summary
      const totalAgentTime = metadata.agentsUsed.reduce((sum, a) => sum + a.executionTime, 0);
      const totalAgentCost = metadata.agentsUsed.reduce((sum, a) => sum + a.cost, 0);
      const totalTokens = metadata.agentsUsed.reduce((sum, a) => sum + a.tokensUsed, 0);
      
      report.push('**Agent Summary:**');
      report.push(`- Total Agents Used: ${metadata.agentsUsed.length}`);
      report.push(`- Total Agent Execution Time: ${this.formatDuration(totalAgentTime)}`);
      report.push(`- Total Tokens Used: ${totalTokens.toLocaleString()}`);
      report.push(`- Total Agent Cost: $${totalAgentCost.toFixed(4)}`);
      report.push('');
    }
    
    // Tool Performance Details
    if (metadata.toolsUsed.length > 0) {
      report.push('### Tool Performance');
      report.push('| Tool | Execution Time | Files Scanned | Issues Found | Status |');
      report.push('|------|----------------|---------------|--------------|--------|');
      
      for (const tool of metadata.toolsUsed) {
        const status = tool.exitCode === 0 ? '✅ Success' : `❌ Exit ${tool.exitCode}`;
        report.push(`| ${tool.toolName} | ${this.formatDuration(tool.executionTime)} | ${tool.filesScanned} | ${tool.issuesFound} | ${status} |`);
      }
      
      const totalToolTime = metadata.toolsUsed.reduce((sum, t) => sum + t.executionTime, 0);
      report.push('');
      report.push(`**Total Tool Execution Time:** ${this.formatDuration(totalToolTime)}`);
      report.push('');
    }
    
    // ============= COST ANALYSIS =============
    report.push('## 💰 Cost Analysis');
    report.push('');
    report.push('### Cost Breakdown');
    report.push('| Category | Cost | Percentage |');
    report.push('|----------|------|------------|');
    report.push(`| **AI Models** | $${metadata.costBreakdown.aiModels.toFixed(4)} | ${this.calculatePercentage(metadata.costBreakdown.aiModels, metadata.totalCost)}% |`);
    report.push(`| **Infrastructure** | $${metadata.costBreakdown.infrastructure.toFixed(4)} | ${this.calculatePercentage(metadata.costBreakdown.infrastructure, metadata.totalCost)}% |`);
    report.push(`| **Tools** | $${metadata.costBreakdown.tools.toFixed(4)} | ${this.calculatePercentage(metadata.costBreakdown.tools, metadata.totalCost)}% |`);
    report.push(`| **Total Cost** | **$${metadata.totalCost.toFixed(4)}** | 100% |`);
    report.push('');
    
    if (metadata.estimatedMonthlyCost) {
      report.push(`**Estimated Monthly Cost (at current rate):** $${metadata.estimatedMonthlyCost.toFixed(2)}`);
      report.push('');
    }
    
    // Model Usage Details
    report.push('### AI Model Usage');
    const modelUsageMap = new Map<string, { count: number, tokens: number, cost: number }>();
    
    for (const agent of metadata.agentsUsed) {
      const key = `${agent.modelUsed.provider}/${agent.modelUsed.model}`;
      const existing = modelUsageMap.get(key) || { count: 0, tokens: 0, cost: 0 };
      modelUsageMap.set(key, {
        count: existing.count + 1,
        tokens: existing.tokens + agent.tokensUsed,
        cost: existing.cost + agent.cost
      });
    }
    
    if (modelUsageMap.size > 0) {
      report.push('| Model | Usage Count | Total Tokens | Total Cost |');
      report.push('|-------|-------------|--------------|------------|');
      
      for (const [model, usage] of modelUsageMap.entries()) {
        report.push(`| ${model} | ${usage.count} | ${usage.tokens.toLocaleString()} | $${usage.cost.toFixed(4)} |`);
      }
      report.push('');
    }
    
    // ============= EXECUTIVE SUMMARY (Original sections) =============
    report.push('---');
    report.push('');
    report.push('## 📊 Executive Summary');
    report.push('');
    
    // PR Decision Section
    report.push('### 🎯 PR Decision');
    const decisionEmoji = result.decision === 'approved' ? '✅' : '❌';
    const decisionText = result.decision === 'approved' ? 'APPROVED' : 'REJECTED';
    report.push(`**Decision:** ${decisionEmoji} **${decisionText}**`);
    report.push(`**Confidence Level:** ${(result.confidence * 100).toFixed(0)}%`);
    report.push(`**Quality Score:** ${result.qualityScore.toFixed(1)}/100 (Grade: **${result.grade}**)`);
    report.push('');
    report.push('**Decision Reasoning:**');
    report.push(`> ${result.reason}`);
    report.push('');
    
    // Quick Stats
    report.push('### 📈 Analysis Statistics');
    report.push('| Metric | Value |');
    report.push('|--------|-------|');
    report.push(`| Total Issues Found | ${result.newIssues.length + result.existingIssues.length} |`);
    report.push(`| New Issues (This PR) | ${result.newIssues.length} |`);
    report.push(`| Blocking Issues | ${result.blockingIssues.length} |`);
    report.push(`| Resolved Issues | ${result.resolvedIssues.length} |`);
    report.push(`| Analysis Start | ${metadata.startTime} |`);
    report.push(`| Analysis End | ${metadata.endTime} |`);
    report.push(`| Total Duration | ${this.formatDuration(metadata.totalDuration)} |`);
    report.push('');
    
    // Issue Severity Distribution
    report.push('### 🔥 Issue Severity Distribution');
    const allIssues = [...result.newIssues, ...result.existingIssues];
    const severityBreakdown = this.scoringCalculator.getSeverityBreakdown(allIssues);
    report.push('| Severity | Count | Impact Points |');
    report.push('|----------|-------|---------------|');
    report.push(`| 🔴 Critical | ${severityBreakdown.critical || 0} | ${(severityBreakdown.critical || 0) * 5} |`);
    report.push(`| 🟠 High | ${severityBreakdown.high || 0} | ${(severityBreakdown.high || 0) * 3} |`);
    report.push(`| 🟡 Medium | ${severityBreakdown.medium || 0} | ${(severityBreakdown.medium || 0) * 1} |`);
    report.push(`| 🟢 Low | ${severityBreakdown.low || 0} | ${((severityBreakdown.low || 0) * 0.5).toFixed(1)} |`);
    report.push('');
    
    // ============= ISSUES SECTIONS (continue with existing format) =============
    // ... (rest of the issue sections remain the same as in v9-report-formatter-enhanced.ts)
    
    if (result.blockingIssues.length > 0) {
      report.push('---');
      report.push('');
      report.push('## 🚨 BLOCKING ISSUES - MUST FIX BEFORE MERGE');
      report.push('');
      report.push('These critical issues must be resolved before this PR can be approved:');
      report.push('');
      
      for (let i = 0; i < result.blockingIssues.length; i++) {
        const issue = result.blockingIssues[i];
        await this.addDetailedIssue(report, issue, i + 1, language, options, 'blocking');
      }
    }
    
    // ... (continue with other issue sections)
    
    // ============= INTERNAL METRICS FOOTER =============
    report.push('---');
    report.push('');
    report.push('## 📊 Internal Metrics Summary');
    report.push('');
    report.push('### Performance Summary');
    report.push(`- **Total Scan Duration:** ${this.formatDuration(metadata.totalDuration)}`);
    report.push(`- **Lines Analyzed:** ${metadata.totalLinesOfCode.toLocaleString()}`);
    report.push(`- **Analysis Speed:** ${(metadata.totalLinesOfCode / (metadata.totalDuration / 1000)).toFixed(0)} lines/second`);
    report.push(`- **Cost per 1K Lines:** $${((metadata.totalCost / metadata.totalLinesOfCode) * 1000).toFixed(4)}`);
    report.push(`- **Cost per Issue Found:** $${(metadata.totalCost / Math.max(1, allIssues.length)).toFixed(4)}`);
    report.push('');
    
    report.push('### Efficiency Metrics');
    const successfulAgents = metadata.agentsUsed.filter(a => a.status === 'success').length;
    const failedAgents = metadata.agentsUsed.filter(a => a.status === 'failed').length;
    report.push(`- **Agent Success Rate:** ${((successfulAgents / metadata.agentsUsed.length) * 100).toFixed(1)}%`);
    report.push(`- **Failed Agents:** ${failedAgents}`);
    report.push(`- **Average Agent Cost:** $${(metadata.costBreakdown.aiModels / metadata.agentsUsed.length).toFixed(4)}`);
    report.push(`- **Total Tokens Used:** ${metadata.agentsUsed.reduce((sum, a) => sum + a.tokensUsed, 0).toLocaleString()}`);
    report.push('');
    
    // ============= FOOTER =============
    report.push('---');
    report.push('');
    report.push('*Generated by V9 Code Quality Analyzer - Complete Edition*');
    report.push(`*Analysis ID: ${metadata.prNumber}-${Date.now()}*`);
    report.push(`*Repository: ${metadata.repoUrl}*`);
    report.push(`*Total Cost: $${metadata.totalCost.toFixed(4)}*`);
    
    return report.join('\n');
  }

  /**
   * Add detailed issue (reuse from enhanced formatter)
   */
  private async addDetailedIssue(
    report: string[],
    issue: Issue,
    index: number,
    language: string,
    options: ReportOptions,
    context: 'blocking' | 'new' | 'backlog'
  ): Promise<void> {
    // ... (same implementation as in v9-report-formatter-enhanced.ts)
    const severityIcon = this.getSeverityIcon(issue.severity);
    const categoryIcon = this.getCategoryIcon(issue.category);
    
    report.push(`### ${index}. ${severityIcon} ${issue.title}`);
    report.push('');
    
    report.push('| Property | Value |');
    report.push('|----------|-------|');
    report.push(`| **Category** | ${categoryIcon} ${issue.category} |`);
    report.push(`| **Severity** | ${this.getSeverityBadge(issue.severity)} |`);
    report.push(`| **File Location** | \`${issue.file}:${issue.line}\` |`);
    report.push(`| **Detection Tool** | ${issue.tool} |`);
    report.push(`| **Analysis Agent** | ${issue.agent} |`);
    report.push(`| **Status** | ${this.getStatusBadge(issue.status)} |`);
    report.push('');
    
    report.push('**Description:**');
    report.push(`> ${issue.description}`);
    report.push('');
    
    if (issue.impact) {
      report.push('**Technical Impact:**');
      report.push(`> ${issue.impact}`);
      report.push('');
    }
    
    if (issue.businessImpact) {
      report.push('**Business Impact:**');
      report.push(`> ${issue.businessImpact}`);
      report.push('');
    }
    
    report.push('---');
    report.push('');
  }

  // ============= UTILITY METHODS =============
  
  private formatDuration(ms: number): string {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    const minutes = Math.floor(ms / 60000);
    const seconds = ((ms % 60000) / 1000).toFixed(0);
    return `${minutes}m ${seconds}s`;
  }
  
  private calculatePercentage(value: number, total: number): string {
    if (total === 0) return '0.0';
    return ((value / total) * 100).toFixed(1);
  }
  
  private getCategoryIcon(category: IssueCategory): string {
    const icons: Record<IssueCategory, string> = {
      'Security': '🔒',
      'Performance': '⚡',
      'Architecture': '🏗️',
      'Dependency': '📦',
      'Quality': '✨'
    };
    return icons[category] || '📌';
  }
  
  private getSeverityIcon(severity: IssueSeverity): string {
    const icons: Record<IssueSeverity, string> = {
      'critical': '🔴',
      'high': '🟠',
      'medium': '🟡',
      'low': '🟢'
    };
    return icons[severity] || '⚪';
  }
  
  private getSeverityBadge(severity: IssueSeverity): string {
    const badges: Record<IssueSeverity, string> = {
      'critical': '🔴 **CRITICAL**',
      'high': '🟠 **HIGH**',
      'medium': '🟡 **MEDIUM**',
      'low': '🟢 **LOW**'
    };
    return badges[severity] || severity;
  }
  
  private getStatusBadge(status: string): string {
    switch (status) {
      case 'new': return '🆕 New';
      case 'existing': return '📌 Existing';
      case 'resolved': return '✅ Resolved';
      default: return status;
    }
  }
}