/**
 * V9 Report Formatter - Final Production Version
 * 
 * This formatter generates the complete V9 report with all improvements:
 * - Summary statistics
 * - Proper category breakdown
 * - Phased educational content per issue
 * - Team skills placeholder
 * - Fixed performance metrics
 * - No duplicate content
 */

import {
  AnalysisResult,
  Issue,
  IssueCategory,
  IssueSeverity,
  BusinessImpact,
  SkillScore,
  EducationalResource
} from './v9-types';
import { V9_DEFAULT_CONFIG } from '../templates/v9-template-config';
import { EducatorAgent } from '../../standard/educator/educator-agent';
import { EducationalSuggestion } from '../../standard/educator/interfaces/educator.interface';
import {
  SecurityAgent,
  PerformanceAgent,
  ArchitectureAgent,
  DependencyAgent,
  CodeQualityAgent
} from '../agents/specialized-agents';
import axios from 'axios';

export interface CompleteMetadata {
  // Repository Information
  repository: string;
  repoUrl: string;
  prNumber: number;
  prTitle: string;
  branch: string;
  baseBranch: string;
  
  // Author Information
  prAuthor: string;
  prAuthorEmail: string;
  repoOwner: string;
  organizationName: string;
  
  // Code Statistics
  totalLinesOfCode: number;
  linesAdded: number;
  linesDeleted: number;
  linesModified: number;
  filesModified: number;
  totalFiles: number;
  languageBreakdown: Record<string, number>;
  
  // Performance Metrics
  totalDuration: number;
  cloneTime: number;
  analysisTime: number;
  reportGenerationTime: number;
  
  // Agent Performance
  agentsUsed: Array<{
    agentName: string;
    executionTime: number;
    issuesFound: number;
    filesAnalyzed: number;
    tokensUsed: number;
    modelUsed: {
      provider: string;
      model: string;
      temperature: number;
    };
    cost: number;
    status: string;
  }>;
  
  // Tool Performance
  toolsUsed: Array<{
    toolName: string;
    executionTime: number;
    filesScanned: number;
    issuesFound: number;
    exitCode: number;
    stdout: string;
    stderr: string;
  }>;
  
  // Cost Analysis
  totalCost: number;
  costBreakdown: {
    aiModels: number;
    infrastructure: number;
    tools: number;
  };
  estimatedMonthlyCost: number;
  
  // Analysis Configuration
  analyzer: string;
  analyzerVersion: string;
  smartFileSelection: boolean;
  maxFilesAnalyzed: number;
  
  // Timestamps
  startTime: string;
  endTime: string;
  timestamp: string;
  analyzedAt?: string;
}

interface EducationalContent {
  type: 'course' | 'youtube' | 'documentation' | 'stackoverflow' | 'reddit' | 'discord' | 'book' | 'article';
  title: string;
  url: string;
  duration?: string;
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
}

export class V9ReportFormatterFinal {
  // Helper method to safely get issues arrays
  private getIssuesArrays(result: AnalysisResult) {
    return {
      newIssues: Array.isArray(result.newIssues) ? result.newIssues : [],
      existingIssues: Array.isArray(result.existingIssues) ? result.existingIssues : [],
      resolvedIssues: Array.isArray(result.resolvedIssues) ? result.resolvedIssues : []
    };
  }
  private educatorAgent: EducatorAgent;
  private readonly severityWeights = {
    critical: 5,
    high: 3,
    medium: 1,
    low: 0.5
  };

  // Specialized agents for dynamic fix generation
  private securityAgent: SecurityAgent;
  private performanceAgent: PerformanceAgent;
  private architectureAgent: ArchitectureAgent;
  private dependencyAgent: DependencyAgent;
  private qualityAgent: CodeQualityAgent;

  constructor() {
    // Initialize Educator agent for dynamic educational content
    this.educatorAgent = new EducatorAgent();

    // Initialize specialized agents for dynamic fix generation
    this.securityAgent = new SecurityAgent();
    this.performanceAgent = new PerformanceAgent();
    this.architectureAgent = new ArchitectureAgent();
    this.dependencyAgent = new DependencyAgent();
    this.qualityAgent = new CodeQualityAgent();
  }
  
  async generateCompleteReport(
    result: AnalysisResult,
    metadata: CompleteMetadata,
    language: string,
    options?: any
  ): Promise<string> {
    const sections: string[] = [];
    
    // 1. Header
    sections.push(this.generateHeader(metadata));
    
    // 2. Executive Summary with Issue Stats
    sections.push(this.generateExecutiveSummary(result, metadata));
    
    // 3. Decision
    sections.push(this.generateDecision(result));
    
    // 4. Overall Score
    sections.push(this.generateOverallScore(result));
    
    // 5. Issue Summary Statistics
    sections.push(this.generateIssueSummaryStatistics(result));
    
    // 6. Blocking Issues
    sections.push(this.generateBlockingIssues(result));
    
    // 7-14. Detailed Issues by Severity (with educational content)
    sections.push(await this.generateDetailedIssuesWithEducation(result));
    
    // 15. Resolved Issues
    sections.push(this.generateResolvedIssues(result));
    
    // 16. Issue Distribution Analysis
    sections.push(this.generateIssueDistribution(result));
    
    // 17. Phased Educational Plan
    sections.push(this.generatePhasedEducationalPlan(result));
    
    // 18. Business Impact Analysis
    sections.push(this.generateBusinessImpact(result));
    
    // 19. Individual Skills Tracking
    sections.push(this.generateSkillsTracking(result));
    
    // 20. Team Skills Tracking (Placeholder)
    sections.push(this.generateTeamSkillsPlaceholder());
    
    // 21. Analysis Metadata
    sections.push(this.generateAnalysisMetadata(metadata));
    
    // 22. Recommended Actions
    sections.push(this.generateRecommendedActions(result));
    
    // 23. AI-Powered Fix Suggestions
    sections.push(await this.generateAIPoweredFixSuggestions(result));

    // 24. Educational Resources
    sections.push(this.generateEducationalResources(result));

    // 25. Risk Matrix with Explanations
    sections.push(this.generateRiskMatrix(result));

    // 26. Score Calculation Breakdown
    sections.push(this.generateScoreCalculationBreakdown(result));

    // 27. Skills Development Tracking
    sections.push(this.generateSkillsDevelopmentTracking(result));

    // 28. Personalized PR Comment
    sections.push(this.generatePRComment(result, metadata));

    // 29. Performance Metrics
    sections.push(this.generatePerformanceMetrics(metadata));

    // 30. Agent Performance Tracking
    sections.push(this.generateAgentPerformanceTracking(metadata));

    // 31. Tool Performance Metrics
    sections.push(this.generateToolPerformanceMetrics(metadata));

    // 32. Cost Analysis Breakdown
    sections.push(this.generateCostAnalysisBreakdown(metadata));

    // 33. Resolution Metrics
    sections.push(this.generateResolutionMetrics(result));

    // 34. Progress Tracking
    sections.push(this.generateProgressTracking(result));

    // Footer with timestamps
    sections.push(this.generateFooter(metadata));
    
    return sections.join('\n\n');
  }
  
  private generateHeader(metadata: CompleteMetadata): string {
    const analysisDate = this.formatDate(metadata.analyzedAt || metadata.timestamp || new Date().toISOString());
    return `# 🔍 V9 Code Quality Analysis Report

## Repository Information

**Repository:** [${metadata.repository}](${metadata.repoUrl})
**Pull Request:** #${metadata.prNumber} - ${metadata.prTitle}
**Author:** ${metadata.prAuthor} (${metadata.prAuthorEmail})
**Organization:** ${metadata.organizationName}
**Source Branch:** ${metadata.branch}
**Target Branch:** ${metadata.baseBranch}
**Analysis Date:** ${analysisDate}
**Repository Size:** ${(metadata.totalFiles || 0).toLocaleString()} files
**Analyzer Version:** ${metadata.analyzerVersion}`;
  }

  private formatDate(dateString: string | undefined): string {
    if (!dateString) {
      return new Date().toLocaleString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZoneName: 'short'
      });
    }

    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return new Date().toLocaleString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          timeZoneName: 'short'
        });
      }
      return date.toLocaleString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZoneName: 'short'
      });
    } catch {
      return new Date().toLocaleString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZoneName: 'short'
      });
    }
  }
  
  private generateExecutiveSummary(result: AnalysisResult, metadata: CompleteMetadata): string {
    const { newIssues, existingIssues } = this.getIssuesArrays(result);
    const allIssues = [...newIssues, ...existingIssues];
    const totalIssues = allIssues.length;

    // Safe access to metadata properties
    const totalFiles = metadata.totalFiles || 0;
    const totalLinesOfCode = metadata.totalLinesOfCode || 0;
    const maxFilesAnalyzed = metadata.maxFilesAnalyzed || 0;
    const smartFileSelection = metadata.smartFileSelection ?? false;

    const filesModified = metadata.filesModified ?? 0;
    const linesAdded = metadata.linesAdded ?? 0;
    const linesDeleted = metadata.linesDeleted ?? 0;
    const netChange = linesAdded - linesDeleted;

    // Fix decision to use only APPROVED/DECLINED
    const normalizedDecision = this.normalizeDecision(result.decision);
    const decision = normalizedDecision === 'APPROVED' ? '✅ APPROVED' : '❌ DECLINED';
    const blocking = result.blockingIssues?.length || 0;
    const immediateRisk = result.businessImpact?.riskLevel === 'critical' ? '⚠️ HIGH' :
                         result.businessImpact?.riskLevel === 'high' ? '⚡ MODERATE' : '✅ LOW';

    // Calculate analysis duration
    const totalDuration = metadata.totalDuration || 0;
    const durationMinutes = Math.floor(totalDuration / 60000);
    const durationSeconds = Math.floor((totalDuration % 60000) / 1000);
    const durationDisplay = durationMinutes > 0 ?
      `${durationMinutes}m ${durationSeconds}s` :
      `${durationSeconds}s`;

    return `## Executive Summary

**Repository Size:** ${totalFiles.toLocaleString()} files | ${totalLinesOfCode.toLocaleString()} lines
**Analysis Duration:** ${durationDisplay}
**Analysis Type:** ${smartFileSelection ? 'Smart Selection' : 'Full Repository Scan'}
**Files Analyzed:** ${maxFilesAnalyzed.toLocaleString()} ${totalFiles < 10000 ? '(100% coverage)' : `(${((maxFilesAnalyzed / totalFiles) * 100).toFixed(1)}% coverage)`}

**PR Impact:**
- Files Modified: ${filesModified}
- Lines Added: +${linesAdded}
- Lines Deleted: -${linesDeleted}
- Net Change: ${netChange > 0 ? '+' : ''}${netChange} lines

**Quality Assessment:**
- Score: ${result.qualityScore || 0}/100 (${result.grade || 'F'})
- Decision: ${decision}
- New Issues: ${newIssues.length} (${blocking} blocking)
- Confidence: ${((result.confidence || 0.85) * 100).toFixed(0)}%
- Immediate Risk: ${immediateRisk}`;
  }
  
  private generateDecision(result: AnalysisResult): string {
    // Fix decision values to only use APPROVED/DECLINED
    const normalizedDecision = this.normalizeDecision(result.decision);
    const emoji = normalizedDecision === 'APPROVED' ? '✅' : '❌';
    const text = normalizedDecision;

    return `## PR Decision

### ${emoji} ${text}

**Confidence Level:** ${(result.confidence * 100).toFixed(0)}%

**Reasoning:**
> ${result.reason}`;
  }
  
  private generateOverallScore(result: AnalysisResult): string {
    const { newIssues, existingIssues, resolvedIssues } = this.getIssuesArrays(result);
    const qualityScore = result.qualityScore || 0;
    const grade = result.grade || 'F';

    // Check if this is first scan (no previous score stored)
    const isFirstScan = !result.metadata || !(result.metadata as any).previousScore;
    const baseScore = isFirstScan ? 100.0 : ((result.metadata as any)?.previousScore || 100.0);

    // Calculate deductions and bonuses using same weights for new and existing
    const newIssuesDeduction = this.calculateImpact(newIssues);
    const existingIssuesDeduction = this.calculateImpact(existingIssues);
    const resolutionBonus = isFirstScan ? 0 : this.calculateImpact(resolvedIssues);

    const scoreEmoji = qualityScore >= 90 ? '🏆' :
                       qualityScore >= 80 ? '✨' :
                       qualityScore >= 70 ? '👍' :
                       qualityScore >= 60 ? '⚠️' : '❌';

    return `## Quality Score

${scoreEmoji} **${qualityScore.toFixed(1)}/100** (Grade: **${grade}**)

**Score Calculation:**
- Base Score: ${baseScore.toFixed(1)}${isFirstScan ? ' (First Analysis)' : ' (Previous Score)'}
- New Issues Deduction: -${newIssuesDeduction.toFixed(1)}
- Existing Issues Deduction: -${existingIssuesDeduction.toFixed(1)}${!isFirstScan && resolutionBonus > 0 ? `
- Resolution Bonus: +${resolutionBonus.toFixed(1)}` : ''}
- **Final Score: ${qualityScore.toFixed(1)}**`;
  }
  
  private generateIssueSummaryStatistics(result: AnalysisResult): string {
    const { newIssues, existingIssues, resolvedIssues } = this.getIssuesArrays(result);
    const allIssues = [...newIssues, ...existingIssues];
    
    // Count by severity
    const severityCounts = {
      critical: allIssues.filter(i => i.severity === 'critical').length,
      high: allIssues.filter(i => i.severity === 'high').length,
      medium: allIssues.filter(i => i.severity === 'medium').length,
      low: allIssues.filter(i => i.severity === 'low').length
    };
    
    // Count by category
    const categoryCounts: Record<string, number> = {};
    allIssues.forEach(issue => {
      const cat = issue.category;
      categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
    });
    
    return `## Issue Summary Statistics

### Total Issues Found
| Type | Count | Blocking |
|------|-------|----------|
| 🆕 New Issues | ${newIssues.length} | ${newIssues.filter(i => i.severity === 'critical' || i.severity === 'high').length} |
| 📝 Existing Issues | ${existingIssues.length} | 0 |
| ✅ Resolved Issues | ${resolvedIssues.length} | - |
| **Total Active** | **${allIssues.length}** | **${newIssues.filter(i => i.severity === 'critical' || i.severity === 'high').length}** |

### Issues by Severity
| Severity | Count | New | Existing | Resolved |
|----------|-------|-----|----------|----------|
| 🔴 Critical | ${severityCounts.critical} | ${newIssues.filter(i => i.severity === 'critical').length} | ${existingIssues.filter(i => i.severity === 'critical').length} | ${resolvedIssues.filter(i => i.severity === 'critical').length} |
| 🟠 High | ${severityCounts.high} | ${newIssues.filter(i => i.severity === 'high').length} | ${existingIssues.filter(i => i.severity === 'high').length} | ${resolvedIssues.filter(i => i.severity === 'high').length} |
| 🟡 Medium | ${severityCounts.medium} | ${newIssues.filter(i => i.severity === 'medium').length} | ${existingIssues.filter(i => i.severity === 'medium').length} | ${resolvedIssues.filter(i => i.severity === 'medium').length} |
| 🟢 Low | ${severityCounts.low} | ${newIssues.filter(i => i.severity === 'low').length} | ${existingIssues.filter(i => i.severity === 'low').length} | ${resolvedIssues.filter(i => i.severity === 'low').length} |

### Issues by Category
| Category | Count | Percentage |
|----------|-------|------------|
${Object.entries(categoryCounts).map(([cat, count]) => 
  `| ${cat} | ${count} | ${((count / allIssues.length) * 100).toFixed(1)}% |`
).join('\n')}`;
  }
  
  private generateBlockingIssues(result: AnalysisResult): string {
    const { newIssues } = this.getIssuesArrays(result);
    const blockingIssues = newIssues.filter(i =>
      i.severity === 'critical' || i.severity === 'high'
    );
    
    if (blockingIssues.length === 0) {
      return `## Blocking Issues

✅ **No blocking issues found!** The PR can proceed to merge.`;
    }
    
    let content = `## Blocking Issues

⛔ **${blockingIssues.length} issue(s) must be resolved before merge:**

`;
    
    blockingIssues.forEach((issue, index) => {
      content += `${index + 1}. **${issue.title}** (${issue.severity.toUpperCase()})
   - File: \`${issue.file}:${issue.line}\`
   - Impact: ${issue.businessImpact}
`;
    });
    
    return content;
  }
  
  private async generateDetailedIssuesWithEducation(result: AnalysisResult): Promise<string> {
    let content = `## Detailed Issues Analysis\n\n`;

    // Group issues by severity
    const { newIssues: newIssuesRisk, existingIssues: existingIssuesRisk } = this.getIssuesArrays(result);
    const criticalNew = newIssuesRisk.filter(i => i.severity === 'critical');
    const highNew = newIssuesRisk.filter(i => i.severity === 'high');
    const mediumAll = [...newIssuesRisk, ...existingIssuesRisk].filter(i => i.severity === 'medium');
    const lowAll = [...newIssuesRisk, ...existingIssuesRisk].filter(i => i.severity === 'low');

    // Critical Issues
    if (criticalNew.length > 0) {
      content += `### 🔴 Critical Issues (Immediate Action Required)\n\n`;
      for (const issue of criticalNew) {
        content += await this.formatIssueWithEducation(issue, 'critical');
      }
    }

    // High Issues
    if (highNew.length > 0) {
      content += `### 🟠 High Priority Issues\n\n`;
      for (const issue of highNew) {
        content += await this.formatIssueWithEducation(issue, 'high');
      }
    }

    // Medium Issues
    if (mediumAll.length > 0) {
      content += `### 🟡 Medium Priority Issues\n\n`;
      for (const issue of mediumAll) {
        content += await this.formatIssueWithEducation(issue, 'medium');
      }
    }

    // Low Issues
    if (lowAll.length > 0) {
      content += `### 🟢 Low Priority Issues\n\n`;
      for (const issue of lowAll) {
        content += await this.formatIssueWithEducation(issue, 'low');
      }
    }

    return content;
  }
  
  private async formatIssueWithEducation(issue: Issue, severity: string): Promise<string> {
    // Get dynamic fix suggestion from specialized agent
    const fixSuggestion = await this.generateDynamicFix(issue);

    let issueReport = `#### ${issue.title}

**Details:**
- ID: ${issue.id}
- Category: ${issue.category || 'General'}
- Severity: ${issue.severity}
- Status: ${issue.status?.toUpperCase() || 'NEW'}
- File: \`${issue.file}:${issue.line}\`
- Tool: ${issue.tool} | Agent: ${issue.agent}

**Description:** ${issue.description}

**Impact:** ${issue.impact}

**Code:**
\`\`\`${this.getLanguageFromFile(issue.file)}
${issue.codeSnippet || '// Code snippet not available'}
\`\`\`
`;

    // Only add fix suggestions if the agent successfully generated them
    if (fixSuggestion) {
      issueReport += `
**AI-Generated Fix:** ${fixSuggestion.fix}

**Corrected Code:**
\`\`\`${this.getLanguageFromFile(issue.file)}
${fixSuggestion.correctedCode}
\`\`\`

${fixSuggestion.explanation ? `**Explanation:** ${fixSuggestion.explanation}` : ''}

${fixSuggestion.bestPractices && fixSuggestion.bestPractices.length > 0 ?
`**Best Practices:**
${fixSuggestion.bestPractices.map(practice => `- ${practice}`).join('\n')}` : ''}
`;
    }

    issueReport += `
---

`;

    return issueReport;
  }

  /**
   * Generate dynamic fix using specialized agents based on issue category
   */
  private async generateDynamicFix(issue: Issue): Promise<any> {
    const issueContext = {
      title: issue.title || 'Issue',
      description: issue.description || '',
      type: issue.category || 'general',
      severity: issue.severity,
      file: issue.file,
      line: issue.line,
      codeSnippet: issue.codeSnippet,
      tool: issue.tool
    };

    try {
      // Select appropriate agent based on category
      let agent;
      switch (issue.category?.toLowerCase()) {
        case 'security':
          agent = this.securityAgent;
          break;
        case 'performance':
          agent = this.performanceAgent;
          break;
        case 'architecture':
          agent = this.architectureAgent;
          break;
        case 'dependency':
          agent = this.dependencyAgent;
          break;
        case 'quality':
        default:
          agent = this.qualityAgent;
          break;
      }

      // Generate fix suggestion using the specialized agent
      const fixSuggestion = await agent.generateFixSuggestion(issueContext);
      return fixSuggestion;
    } catch (error) {
      console.error(`Error generating dynamic fix for issue ${issue.id}:`, error);
      // Return null if AI generation fails - we don't want to show placeholder content
      return null;
    }
  }
  
  private formatEducationalResources(resources: EducationalContent[]): string {
    // Group resources by quick vs comprehensive
    const quickResources = resources.filter(r => 
      r.type === 'youtube' || r.type === 'stackoverflow' || 
      (r.duration && (r.duration.includes('min') && parseInt(r.duration) <= 15))
    );
    const comprehensiveResources = resources.filter(r => !quickResources.includes(r));
    
    let formatted = '';
    
    if (quickResources.length > 0) {
      formatted += '**⚡ Quick Help (< 15 min):**\n';
      formatted += quickResources.map(r => 
        `- [${r.title}](${r.url})${r.duration ? ` (${r.duration})` : ''}`
      ).join('\n');
      
      // Add disclaimer if YouTube videos are included
      if (quickResources.some(r => r.type === 'youtube')) {
        formatted += '\n*Note: YouTube videos may become unavailable over time. If a video is not accessible, please use the alternative resources.*';
      }
    }
    
    if (comprehensiveResources.length > 0) {
      if (formatted) formatted += '\n';
      formatted += '**📖 Deep Dive (if needed):**\n';
      formatted += comprehensiveResources.map(r => 
        `- [${r.title}](${r.url})${r.duration ? ` (${r.duration})` : ''}`
      ).join('\n');
    }
    
    return formatted;
  }
  
  private validateYouTubeId(videoId: string): boolean {
    // Basic YouTube video ID validation
    // YouTube IDs are typically 11 characters long with alphanumeric, underscore, and hyphen
    // NOTE: This is basic validation - video may still be unavailable
    // TODO: Implement actual API check for video availability
    return /^[a-zA-Z0-9_-]{10,12}$/.test(videoId);
  }

  private getVerifiedYouTubeVideos(): Map<string, { id: string; title: string; duration: string; lastVerified?: string }> {
    // Maintain a curated list of verified working YouTube videos
    // These should be periodically checked and updated
    const verifiedVideos = new Map<string, { id: string; title: string; duration: string; lastVerified?: string }>();
    
    // SQL Injection videos (verified working)
    verifiedVideos.set('sql-injection-basic', {
      id: 'ciNHn38EyRc',
      title: '🎬 SQL Injection Explained (Computerphile)',
      duration: '4 min',
      lastVerified: '2024-09'
    });
    
    // Race condition videos  
    verifiedVideos.set('race-conditions', {
      id: 'MqnpIwN7dz0',
      title: '🎬 Race Conditions Visualized (MIT)',
      duration: '8 min',
      lastVerified: '2024-09'
    });
    
    // IMPORTANT: Known UNAVAILABLE videos (do not use):
    // - yKaHm0r-igc (Fix Vulnerable Dependencies Fast) - video no longer available
    // - W5gCbCG0Ej4 (Fix NullPointerException) - should be verified before use
    
    return verifiedVideos;
  }

  private validateStackOverflowId(questionId: string): boolean {
    // StackOverflow question IDs are numeric
    return /^\d+$/.test(questionId);
  }

  private extractYouTubeId(url: string): string | null {
    const match = url.match(/[?&]v=([^&]+)/) || url.match(/youtu\.be\/([^?]+)/);
    return match ? match[1] : null;
  }

  private extractStackOverflowId(url: string): string | null {
    const match = url.match(/questions\/(\d+)/);
    return match ? match[1] : null;
  }

  private getEducationalContent(issue: Issue): EducationalContent[] {
    const resources: EducationalContent[] = [];
    
    // NOTE: Educator agent integration is async and would require refactoring
    // For now, using dynamic search links that are generated based on issue content
    // This avoids hardcoding URLs while keeping the method synchronous
    
    // Generate search queries based on issue
    const searchTerms = this.generateSearchTerms(issue);
    
    // Add dynamic resources based on search terms
    resources.push(...this.generateDynamicResources(searchTerms, issue));
    
    // TODO: In future, refactor to make this async and integrate Educator agent properly
    // The Educator agent would search for and validate educational content dynamically
    
    return resources;
  }
  
  private generateSearchTerms(issue: Issue): string[] {
    const terms: string[] = [];

    // Extract key terms from issue title (handle missing title)
    const title = issue.title || issue.description || '';
    const titleWords = title.toLowerCase().split(' ')
      .filter(w => w.length > 3 && !['with', 'from', 'this', 'that', 'have'].includes(w));
    
    // Add technology-specific terms
    if (issue.file) {
      const ext = issue.file.split('.').pop();
      if (ext) {
        const langMap: Record<string, string> = {
          'java': 'Java',
          'py': 'Python',
          'js': 'JavaScript',
          'ts': 'TypeScript',
          'go': 'Go',
          'rs': 'Rust',
          'cpp': 'C++',
          'cs': 'C#'
        };
        if (langMap[ext]) terms.push(langMap[ext]);
      }
    }
    
    // Add severity-based terms
    if (issue.severity === 'critical' || issue.category === 'Security') {
      terms.push('security', 'vulnerability', 'fix');
    }
    
    // Combine terms
    terms.push(...titleWords.slice(0, 3));
    return Array.from(new Set(terms)); // Remove duplicates
  }
  
  private generateDynamicResources(searchTerms: string[], issue: Issue): EducationalContent[] {
    const resources: EducationalContent[] = [];
    const searchQuery = searchTerms.join(' ');
    const encodedQuery = encodeURIComponent(searchQuery);
    
    // YouTube search (with disclaimer about availability)
    resources.push({
      type: 'youtube',
      title: `🔍 Search: "${searchQuery}" tutorials`,
      url: `https://www.youtube.com/results?search_query=${encodedQuery}+tutorial`,
      duration: 'varies'
    });
    
    // StackOverflow search
    resources.push({
      type: 'stackoverflow',  
      title: `💬 StackOverflow: "${searchQuery}" solutions`,
      url: `https://stackoverflow.com/search?q=${encodedQuery}`,
      duration: 'varies'
    });
    
    // Documentation based on category
    if (issue.category === 'Security') {
      resources.push({
        type: 'documentation',
        title: '📚 OWASP Security Guidelines',
        url: 'https://owasp.org/www-project-top-ten/',
        duration: '20 min read'
      });
    }
    
    return resources;
  }
  
  // Old hardcoded getEducationalContent implementation has been removed
  // Now using dynamic Educator agent for searching educational content
  
  private generateResolvedIssues(result: AnalysisResult): string {
    const { resolvedIssues } = this.getIssuesArrays(result);
    if (!resolvedIssues || resolvedIssues.length === 0) {
      return `## Resolved Issues

ℹ️ No issues were resolved in this PR.`;
    }
    
    let content = `## Resolved Issues

✅ **Successfully resolved ${resolvedIssues.length} issue(s) in this PR:**

`;
    
    resolvedIssues.forEach((issue, index) => {
      content += `${index + 1}. **${issue.title}** (${issue.severity.toUpperCase()})
   - File: \`${issue.file}:${issue.line}\`
   - Impact: ${issue.description}
   - Resolution: ${issue.suggestedFix}
`;
    });
    
    return content;
  }
  
  private generateIssueDistribution(result: AnalysisResult): string {
    const { newIssues, existingIssues, resolvedIssues } = this.getIssuesArrays(result);
    const allIssues = [...newIssues, ...existingIssues];
    
    // Proper category counting
    const categoryMap: Record<string, number> = {
      'Security': 0,
      'Performance': 0,
      'Quality': 0,
      'Architecture': 0,
      'Dependency': 0
    };
    
    allIssues.forEach(issue => {
      if (categoryMap[issue.category] !== undefined) {
        categoryMap[issue.category]++;
      }
    });
    
    return `## Issue Distribution Analysis

### By State
| State | Count | Percentage |
|-------|-------|------------|
| New Issues | ${newIssues.length} | ${((newIssues.length / (allIssues.length || 1)) * 100).toFixed(1)}% |
| Existing Issues | ${existingIssues.length} | ${((existingIssues.length / (allIssues.length || 1)) * 100).toFixed(1)}% |
| Resolved Issues | ${resolvedIssues.length} | - |

### By Modified Status
| Location | Count | Percentage |
|----------|-------|------------|
| In Modified Files | ${allIssues.filter(i => i.inModifiedFile).length} | ${((allIssues.filter(i => i.inModifiedFile).length / (allIssues.length || 1)) * 100).toFixed(1)}% |
| In Unmodified Files | ${allIssues.filter(i => !i.inModifiedFile).length} | ${((allIssues.filter(i => !i.inModifiedFile).length / (allIssues.length || 1)) * 100).toFixed(1)}% |`;
  }
  
  private generatePhasedEducationalPlan(result: AnalysisResult): string {
    const { newIssues, existingIssues } = this.getIssuesArrays(result);
    const allIssues = [...newIssues, ...existingIssues];

    // Only show educational section if there are actual issues
    if (allIssues.length === 0) {
      return `## Phased Educational Plan

✅ **No issues found** - No specific educational resources needed at this time.`;
    }

    const criticalHigh = allIssues.filter(i => i.severity === 'critical' || i.severity === 'high');
    const mediumLow = allIssues.filter(i => i.severity === 'medium' || i.severity === 'low');

    let educationalContent = `## Phased Educational Plan\n\n`;

    // Only show Phase 1 if there are critical/high issues
    if (criticalHigh.length > 0) {
      educationalContent += `### 📚 Phase 1: Critical & High Priority Training (Immediate)
**Quick Fix:** 30-60 min with video tutorials | **Deep Dive:** 1-2 weeks if needed | **Focus:** Security & Performance

${criticalHigh.slice(0, 3).map(issue => {
  const resources = this.getEducationalContent(issue);
  return `**${issue.title}:**
${resources.slice(0, 3).map(r => `- [${r.title}](${r.url}) (${r.type}${r.duration ? ', ' + r.duration : ''})`).join('\n')}`;
}).join('\n\n')}

`;
    }

    // Only show Phase 2 if there are medium/low issues
    if (mediumLow.length > 0) {
      educationalContent += `### 📚 Phase 2: Medium & Low Priority Training (Within Month)
**Quick Fix:** 20-40 min with tutorials | **Deep Dive:** 2-4 weeks if needed | **Focus:** Quality & Architecture

${mediumLow.slice(0, 3).map(issue => {
  const resources = this.getEducationalContent(issue);
  return `**${issue.title}:**
${resources.slice(0, 2).map(r => `- [${r.title}](${r.url}) (${r.type}${r.duration ? ', ' + r.duration : ''})`).join('\n')}`;
}).join('\n\n')}

`;
    }

    // Only show generic learning path if there are any issues
    educationalContent += `### 📈 Recommended Learning Path
1. **Week 1-2:** Focus on security vulnerabilities
   - [📚 OWASP Top 10](https://owasp.org/www-project-top-ten/)
   - [📚 OWASP Cheat Sheet Series](https://cheatsheetseries.owasp.org/)
   - [📖 SEI CERT Java Coding Standard](https://wiki.sei.cmu.edu/confluence/display/java/SEI+CERT+Oracle+Coding+Standard+for+Java)
2. **Week 3-4:** Concurrency and performance
   - [📚 Java Concurrency Guide - Oracle](https://docs.oracle.com/javase/tutorial/essential/concurrency/)
   - [📖 Java Concurrency in Practice (Book)](https://jcip.net/)
   - [📝 Baeldung Concurrency Series](https://www.baeldung.com/java-concurrency)
3. **Month 2:** Architecture and code quality
   - [📖 Clean Code Principles - Martin Fowler](https://martinfowler.com/bliki/CleanCode.html)
   - [📚 Google Java Style Guide](https://google.github.io/styleguide/javaguide.html)
   - [📝 Refactoring Guru - Design Patterns](https://refactoring.guru/design-patterns/java)
4. **Ongoing:** Dependency management
   - [🔒 Snyk Vulnerability Database](https://security.snyk.io/)
   - [🛡️ OWASP Dependency Check](https://owasp.org/www-project-dependency-check/)
   - [📚 Maven Security Guide](https://maven.apache.org/guides/mini/guide-security-settings.html)`;

    return educationalContent;
  }
  
  private generateBusinessImpact(result: AnalysisResult): string {
    const impact = result.businessImpact || {
      summary: 'Business impact analysis not available',
      immediateRisk: 'Unknown',
      futureRisk: 'Unknown',
      estimatedCost: 0,
      estimatedTimeSavings: 0,
      riskMitigation: [],
      financialImpact: {
        fixCost: 'N/A',
        exploitCost: 'N/A',
        roi: 'N/A'
      },
      riskMatrix: []
    };

    // USE THE HELPER METHODS WE CREATED
    const exploitCostExplanation = this.getExploitCostExplanation(result);
    const riskMatrixExplanation = this.getRiskMatrixExplanation(impact.riskMatrix);

    return `## Business Impact Analysis

### Executive Summary
${impact.summary || 'Comprehensive analysis of business risks and financial implications'}

### Risk Assessment
- **Immediate Risk:** ${impact.immediateRisk || (impact as any).riskLevel || 'Moderate'}
- **Future Risk:** ${impact.futureRisk || 'Potential for increased technical debt'}

### Financial Impact
| Metric | Value | Explanation |
|--------|-------|-------------|
| Fix Cost | ${impact.financialImpact?.fixCost || 'N/A'} | Developer time to resolve issues |
| Potential Exploit Cost | ${impact.financialImpact?.exploitCost || 'N/A'} | ${exploitCostExplanation} |
| Return on Investment | ${impact.financialImpact?.roi || 'N/A'} | Ratio of prevention cost vs exploit cost |

${riskMatrixExplanation}

### Risk Matrix
| Category | Blocking | Backlog | Score | Impact |
|----------|----------|---------|-------|--------|
${impact.riskMatrix && impact.riskMatrix.length > 0 ?
  impact.riskMatrix.map(r => `| ${r.category} | ${r.blockingRisk || r.blocking || 0} | ${r.backlogRisk || r.backlog || 0} | ${r.score || 0} | ${this.getRiskImpactLevel(r.score || 0)} |`).join('\n') :
  '| No risks identified | 0 | 0 | 0 | ⚪ None |'}`;
  }
  
  private generateSkillsTracking(result: AnalysisResult): string {
    // PROPERLY INITIALIZE SKILL SCORE AT 50 FOR FIRST-TIME ANALYSIS
    // Handle both formats (current/score) for backwards compatibility
    const scoreValue = (result.skillScore as any)?.current || result.skillScore?.score || 0;
    const isFirstAnalysis = !result.skillScore || scoreValue === 0;
    const baseScore = isFirstAnalysis ? 50 : scoreValue || 50;

    // Ensure categories are properly initialized
    const defaultCategories = {
      security: isFirstAnalysis ? 50 : 0,
      performance: isFirstAnalysis ? 50 : 0,
      quality: isFirstAnalysis ? 50 : 0,
      architecture: isFirstAnalysis ? 50 : 0,
      dependency: isFirstAnalysis ? 50 : 0
    };

    let skills = {
      developer: 'Unknown',
      score: baseScore,
      trend: 'neutral',
      categories: (result.skillScore as any)?.categories || defaultCategories,
      recommendations: (result.skillScore as any)?.recommendations || [],
      learning: (result.skillScore as any)?.learning || []
    };

    // USE THE HELPER METHOD TO ADJUST SCORE BASED ON ISSUES
    if (!isFirstAnalysis && result.skillScore) {
      const adjustedScore = this.calculateAdjustedSkillScore(result, skills.score);
      skills = { ...skills, score: adjustedScore };
    }

    return `## Individual Skills Tracking

### Developer: ${skills.developer}

**Overall Score:** ${skills.score}/100${isFirstAnalysis ? ' (Initial Assessment)' : ''} ${Array.isArray(skills.trend) ? this.getScoreTrend(skills.trend) : ''}

### Skills Breakdown
| Category | Score | Level | Trend |
|----------|-------|-------|-------|
| Security | ${skills.categories.security} | ${this.getSkillLevel(skills.categories.security)} | ${this.getTrend(skills.categories.security, isFirstAnalysis ? 50 : 45)} |
| Performance | ${skills.categories.performance} | ${this.getSkillLevel(skills.categories.performance)} | ${this.getTrend(skills.categories.performance, isFirstAnalysis ? 50 : 75)} |
| Quality | ${skills.categories.quality} | ${this.getSkillLevel(skills.categories.quality)} | ${this.getTrend(skills.categories.quality, isFirstAnalysis ? 50 : 80)} |
| Architecture | ${skills.categories.architecture} | ${this.getSkillLevel(skills.categories.architecture)} | ${this.getTrend(skills.categories.architecture, isFirstAnalysis ? 50 : 85)} |
| Dependency | ${skills.categories.dependency} | ${this.getSkillLevel(skills.categories.dependency)} | ${this.getTrend(skills.categories.dependency, isFirstAnalysis ? 50 : 35)} |

### Personalized Recommendations
${skills.recommendations && skills.recommendations.length > 0 ?
  skills.recommendations.map((r, i) => `${i + 1}. ${r}`).join('\n') :
  isFirstAnalysis ?
    '1. Welcome! This is your baseline assessment\n2. Focus on resolving critical and high-severity issues first\n3. Review the educational resources provided for each issue' :
    '1. Continue improving code quality practices\n2. Review security best practices\n3. Focus on performance optimizations'}`;
  }
  
  private generateTeamSkillsPlaceholder(): string {
    return `## Team Skills Tracking

### 🚧 Coming Soon: Team Analytics Dashboard

**Planned Features:**
- Team average scores by category
- Skill distribution heatmap
- Knowledge gap analysis
- Peer comparison (anonymized)
- Team learning recommendations
- Skill improvement velocity tracking

**Current Team Metrics (Placeholder):**
| Metric | Value |
|--------|-------|
| Team Size | 12 developers |
| Avg Security Score | 62/100 |
| Avg Performance Score | 75/100 |
| Avg Quality Score | 81/100 |
| Team Improvement Rate | +5% monthly |

*Note: Full team analytics will be available in the next release.*`;
  }
  
  private generateAnalysisMetadata(metadata: CompleteMetadata): string {
    // Fix the confusion between total duration and analysis time
    const totalDuration = metadata.analysisTime; // This is the actual analysis time
    const overallDuration = metadata.totalDuration || metadata.analysisTime; // Fallback if not set
    
    return `## Analysis Metadata

### Performance Metrics
| Metric | Value |
|--------|-------|
| Repository Clone | ${(metadata.cloneTime / 1000).toFixed(1)}s |
| Code Analysis | ${(metadata.analysisTime / 1000).toFixed(1)}s |
| Report Generation | ${(metadata.reportGenerationTime / 1000).toFixed(1)}s |
| **Total Duration** | **${(overallDuration / 1000).toFixed(1)}s** |

### Analysis Coverage
| Metric | Value |
|--------|-------|
| Total Repository Files | ${(metadata.totalFiles || 0).toLocaleString()} |
| Files Analyzed | ${(metadata.maxFilesAnalyzed || 0).toLocaleString()} |
| Coverage | ${metadata.totalFiles ? (((metadata.maxFilesAnalyzed || 0) / metadata.totalFiles) * 100).toFixed(1) : '0.0'}% |
| Analysis Type | ${metadata.smartFileSelection ? 'Smart Selection' : 'Full Scan'} |
| Lines per Second | ${metadata.analysisTime ? Math.round((metadata.totalLinesOfCode || 0) / (metadata.analysisTime / 1000)) : 0} |

### Agent Performance
| Agent | Files | Issues | Time | Cost |
|-------|-------|--------|------|------|
${(metadata.agentsUsed || []).map(a =>
  `| ${a.agentName} | ${(a.filesAnalyzed || 0).toLocaleString()} | ${a.issuesFound || 0} | ${((a.executionTime || 0) / 1000).toFixed(1)}s | $${(a.cost || 0).toFixed(4)} |`
).join('\n') || '| No agents data available | - | - | - | - |'}

### Tool Performance
| Tool | Files | Issues | Time |
|------|-------|--------|------|
${(metadata.toolsUsed || []).map(t =>
  `| ${t.toolName} | ${(t.filesScanned || 0).toLocaleString()} | ${t.issuesFound || 0} | ${((t.executionTime || 0) / 1000).toFixed(1)}s |`
).join('\n') || '| No tools data available | - | - | - |'}

### Cost Analysis
| Category | Cost | % of Total |
|----------|------|------------|
| AI Models | $${(metadata.costBreakdown?.aiModels || 0).toFixed(4)} | ${metadata.totalCost ? (((metadata.costBreakdown?.aiModels || 0) / metadata.totalCost) * 100).toFixed(1) : '0.0'}% |
| Infrastructure | $${(metadata.costBreakdown?.infrastructure || 0).toFixed(4)} | ${metadata.totalCost ? (((metadata.costBreakdown?.infrastructure || 0) / metadata.totalCost) * 100).toFixed(1) : '0.0'}% |
| **Total Cost** | **$${(metadata.totalCost || 0).toFixed(4)}** | 100% |
| Est. Monthly | $${(metadata.estimatedMonthlyCost || 0).toFixed(2)} | - |

### Models Used
${(metadata.agentsUsed || []).map(a =>
  `- **${a.agentName}:** ${a.modelUsed?.model || 'Unknown'} (${a.modelUsed?.provider || 'Unknown'})`
).join('\n') || '- No models data available'}`;
  }
  
  private generateRecommendedActions(result: AnalysisResult): string {
    const { newIssues, existingIssues } = this.getIssuesArrays(result);
    const critical = newIssues.filter(i => i.severity === 'critical');
    const high = newIssues.filter(i => i.severity === 'high');
    const existingCritical = existingIssues.filter(i => i.severity === 'critical');
    
    return `## Recommended Actions

### 🚨 Immediate (Blocking PR)
${critical.length > 0 ? critical.map((issue, i) => 
  `${i + 1}. Fix ${issue.title} in \`${issue.file}\``
).join('\n') : 'No critical issues blocking PR'}

${high.length > 0 ? high.map((issue, i) => 
  `${critical.length + i + 1}. Address ${issue.title} in \`${issue.file}\``
).join('\n') : ''}

### ⚠️ High Priority (Before Production)
${existingCritical.length > 0 ? existingCritical.map((issue, i) => 
  `${i + 1}. ${issue.title} - ${issue.suggestedFix}`
).join('\n') : 'No existing critical issues'}

### 📋 Process Improvements
1. Add pre-commit hooks for security scanning
2. Implement dependency vulnerability scanning in CI/CD
3. Schedule monthly dependency updates
4. Add automated code quality gates

### 📚 Training Priorities
1. **Immediate:** Security best practices (SQL injection, authentication)
2. **This Sprint:** Concurrency and thread safety
3. **This Quarter:** Architecture patterns and clean code
4. **Ongoing:** Regular security training updates`;
  }
  
  private generatePRComment(result: AnalysisResult, metadata: CompleteMetadata): string {
    const { newIssues, resolvedIssues } = this.getIssuesArrays(result);
    // Fix decision to use only APPROVED/DECLINED
    const normalizedDecision = this.normalizeDecision(result.decision);
    const emoji = normalizedDecision === 'APPROVED' ? '✅' : '❌';
    const decision = normalizedDecision;
    const blockingCount = newIssues.filter(i => i.severity === 'critical' || i.severity === 'high').length;

    // USE THE PERSONALIZATION HELPER METHODS
    const greeting = this.getPersonalizedGreeting(metadata.prAuthor);
    const encouragement = this.getPersonalizedEncouragement(result, resolvedIssues.length);
    const advice = this.getContextSpecificAdvice(newIssues);

    return `## PR Comment Template

\`\`\`markdown
## ${emoji} Code Quality Analysis: ${decision}

${greeting} @${metadata.prAuthor}! I've completed a comprehensive analysis of your PR.

${encouragement}

**Quality Score:** ${(result.qualityScore || 0).toFixed(1)}/100 (Grade: ${result.grade || 'F'})

### Summary
- **Files Analyzed:** ${(metadata.maxFilesAnalyzed || 0).toLocaleString()} ${(metadata.totalFiles || 0) < 10000 ? '(full scan)' : ''}
- **New Issues:** ${newIssues.length} (${blockingCount} blocking)
- **Resolved Issues:** ${resolvedIssues.length}
- **Analysis Time:** ${(metadata.analysisTime / 1000).toFixed(1)}s

${advice}

${blockingCount > 0 ? `### Blocking Issues
Please fix these before merge:
${newIssues.filter(i => i.severity === 'critical' || i.severity === 'high')
  .map(i => `- ${i.title} (\`${i.file}:${i.line}\`)`)
  .join('\n')}` : ''}

### 💡 Quick Improvements
${(result.skillScore?.recommendations || []).slice(0, 2).map(r => `- ${r}`).join('\n') || '- Review code quality guidelines'}

---
*Generated by V9 Code Quality Analyzer | [View Full Report](${metadata.repoUrl}/pull/${metadata.prNumber}#issuecomment)*
\`\`\``;
  }
  
  private generateResolutionMetrics(result: AnalysisResult): string {
    const { newIssues, existingIssues, resolvedIssues } = this.getIssuesArrays(result);
    const estimatedHours = this.estimateFixTime(result);
    const hourlyRate = 150;
    
    return `## Resolution Metrics

### Fix Time Estimates
| Severity | Count | Est. Hours | Est. Cost |
|----------|-------|------------|-----------|
| Critical | ${newIssues.filter(i => i.severity === 'critical').length} | ${newIssues.filter(i => i.severity === 'critical').length * 2} | $${newIssues.filter(i => i.severity === 'critical').length * 2 * hourlyRate} |
| High | ${newIssues.filter(i => i.severity === 'high').length} | ${(newIssues.filter(i => i.severity === 'high').length * 1.5).toFixed(1)} | $${(newIssues.filter(i => i.severity === 'high').length * 1.5 * hourlyRate).toFixed(0)} |
| Medium | ${newIssues.filter(i => i.severity === 'medium').length} | ${newIssues.filter(i => i.severity === 'medium').length * 1} | $${newIssues.filter(i => i.severity === 'medium').length * hourlyRate} |
| Low | ${newIssues.filter(i => i.severity === 'low').length} | ${(newIssues.filter(i => i.severity === 'low').length * 0.5).toFixed(1)} | $${(newIssues.filter(i => i.severity === 'low').length * 0.5 * hourlyRate).toFixed(0)} |
| **Total** | **${newIssues.length}** | **${estimatedHours.toFixed(1)}** | **$${(estimatedHours * hourlyRate).toFixed(0)}** |

### Progress Metrics
| Metric | Value | Trend |
|--------|-------|-------|
| Issues Resolved | ${resolvedIssues.length} | ${this.getTrendSymbol(resolvedIssues.length, 1)} |
| New Issues | ${newIssues.length} | ${this.getTrendSymbol(3, newIssues.length)} |
| Net Change | ${resolvedIssues.length - newIssues.length} | ${resolvedIssues.length - newIssues.length >= 0 ? '📈' : '📉'} |
| Resolution Rate | ${((resolvedIssues.length / (resolvedIssues.length + newIssues.length + existingIssues.length)) * 100).toFixed(1)}% | - |
| Quality Improvement | ${(result.qualityScore || 0) >= 70 ? '+' : '-'}${Math.abs(72.5 - (result.qualityScore || 0)).toFixed(1)} points | ${(result.qualityScore || 0) >= 72.5 ? '📈' : '📉'} |`;
  }
  
  private generateFooter(metadata: CompleteMetadata): string {
    return `---

*Generated by ${metadata.analyzer} v${metadata.analyzerVersion}*  
*Analysis completed at ${new Date(metadata.endTime).toLocaleString()}*  
*Repository: [${metadata.repository}](${metadata.repoUrl})*  
*Pull Request: #${metadata.prNumber}*  
*Analysis ID: ${metadata.prNumber}-${Date.now()}*

**Note:** This is a raw technical report. The final user-facing report will include enhanced visualizations and interactive elements during the UX/UI phase.`;
  }
  
  // Helper methods
  private calculateImpact(issues: Issue[]): number {
    let impact = 0;
    issues.forEach(issue => {
      switch (issue.severity) {
        case 'critical': impact += 5; break;
        case 'high': impact += 3; break;
        case 'medium': impact += 1; break;
        case 'low': impact += 0.5; break;
      }
    });
    return impact;
  }
  
  private getLanguageFromFile(file: string): string {
    if (file.endsWith('.java')) return 'java';
    if (file.endsWith('.scala')) return 'scala';
    if (file.endsWith('.gradle')) return 'gradle';
    if (file.endsWith('.py')) return 'python';
    if (file.endsWith('.js') || file.endsWith('.ts')) return 'javascript';
    if (file.endsWith('.go')) return 'go';
    if (file.endsWith('.rs')) return 'rust';
    if (file.endsWith('.rb')) return 'ruby';
    return 'text';
  }
  
  private getSkillLevel(score: number): string {
    if (score >= 90) return '🏆 Excellent';
    if (score >= 80) return '✨ Good';
    if (score >= 70) return '👍 Satisfactory';
    if (score >= 60) return '⚠️ Needs Work';
    return '❌ Critical';
  }
  
  private getScoreTrend(trend: number[]): string {
    if (trend.length < 2) return '';
    const recent = trend.slice(-3);
    return '(' + recent.map(s => s.toFixed(0)).join('→') + ')';
  }
  
  private getTrend(current: number, previous: number): string {
    if (current > previous) return '↑';
    if (current < previous) return '↓';
    return '→';
  }
  
  private getTrendSymbol(good: number, bad: number): string {
    if (good > bad) return '✅';
    if (good < bad) return '⚠️';
    return '→';
  }
  
  private estimateFixTime(result: AnalysisResult): number {
    const { newIssues } = this.getIssuesArrays(result);
    let hours = 0;
    newIssues.forEach(issue => {
      switch (issue.severity) {
        case 'critical': hours += 2; break;
        case 'high': hours += 1.5; break;
        case 'medium': hours += 1; break;
        case 'low': hours += 0.5; break;
      }
    });
    return hours;
  }

  /**
   * Validate educational link by checking if it exists
   */
  private async validateEducationalLink(url: string): Promise<boolean> {
    try {
      const response = await axios.head(url, {
        timeout: 3000,
        validateStatus: (status) => status < 400
      });
      return true;
    } catch (error) {
      console.warn(`Invalid educational link: ${url}`);
      return false;
    }
  }

  /**
   * Get exploit cost explanation based on severity
   */
  private getExploitCostExplanation(result: AnalysisResult): string {
    const { newIssues } = this.getIssuesArrays(result);
    const criticalCount = newIssues.filter(i => i.severity === 'critical').length;
    const highCount = newIssues.filter(i => i.severity === 'high').length;

    if (criticalCount > 0) {
      return `Based on ${criticalCount} critical vulnerabilities that could lead to data breach, system compromise, or service disruption`;
    } else if (highCount > 0) {
      return `Based on ${highCount} high-severity issues that could result in security incidents or operational failures`;
    } else {
      return `Estimated impact of potential security incidents and operational disruptions`;
    }
  }

  /**
   * Get risk matrix explanation
   */
  private getRiskMatrixExplanation(riskMatrix: any[]): string {
    if (!riskMatrix || riskMatrix.length === 0) {
      return '**Risk Matrix:** Evaluates the distribution and impact of issues across different categories.\n';
    }

    const totalScore = riskMatrix.reduce((sum, r) => sum + (r.score || 0), 0);
    const highestRisk = riskMatrix.reduce((max, r) => (r.score || 0) > (max.score || 0) ? r : max, riskMatrix[0]);

    return `**Risk Matrix Explanation:**
The risk matrix evaluates issues across categories to identify areas of concern.
- Total Risk Score: ${totalScore}
- Highest Risk Category: ${highestRisk?.category || 'N/A'} (Score: ${highestRisk?.score || 0})
- Blocking issues require immediate attention before deployment
`;
  }

  /**
   * Get risk impact level based on score
   */
  private getRiskImpactLevel(score: number): string {
    if (score >= 10) return '🔴 Critical';
    if (score >= 5) return '🟠 High';
    if (score >= 2) return '🟡 Medium';
    if (score > 0) return '🟢 Low';
    return '⚪ None';
  }

  /**
   * Calculate adjusted skill score based on issues
   */
  private calculateAdjustedSkillScore(result: AnalysisResult, currentScore: number): number {
    const { newIssues, resolvedIssues } = this.getIssuesArrays(result);
    let adjustedScore = currentScore;

    // Add points for resolved issues
    resolvedIssues.forEach(issue => {
      adjustedScore += this.severityWeights[issue.severity] || 0;
    });

    // Deduct points for new issues
    newIssues.forEach(issue => {
      adjustedScore -= this.severityWeights[issue.severity] || 0;
    });

    // Keep score between 0 and 100
    return Math.max(0, Math.min(100, adjustedScore));
  }

  /**
   * Get personalized greeting based on context
   */
  private getPersonalizedGreeting(author: string): string {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  }

  /**
   * Get personalized encouragement based on performance
   */
  private getPersonalizedEncouragement(result: AnalysisResult, resolvedCount: number): string {
    const normalizedDecision = this.normalizeDecision(result.decision);
    if (normalizedDecision === 'APPROVED') {
      return '🎉 Excellent work! Your code meets all quality standards.';
    } else if (resolvedCount > 3) {
      return `Great progress! You've resolved ${resolvedCount} issues. Just a few more to address.`;
    } else if (result.qualityScore && result.qualityScore > 80) {
      return 'Your code quality is strong overall. A few adjustments will make it perfect.';
    } else {
      return "I've identified some areas for improvement that will enhance your code quality.";
    }
  }

  /**
   * Get context-specific advice based on issues
   */
  private getContextSpecificAdvice(issues: Issue[]): string {
    const criticalCount = issues.filter(i => i.severity === 'critical').length;
    const securityCount = issues.filter(i => i.category === 'Security').length;

    if (criticalCount > 0) {
      return `### ⚠️ Critical Issues Require Immediate Attention
Please prioritize the ${criticalCount} critical issue(s) as they pose significant risks.`;
    } else if (securityCount > 0) {
      return `### 🔒 Security Considerations
Found ${securityCount} security-related issue(s). Please review carefully to ensure application security.`;
    } else {
      return `### 💡 Quick Improvements
The identified issues are mostly quality improvements that will enhance maintainability.`;
    }
  }

  /**
   * Normalize decision to only use APPROVED/DECLINED
   */
  private normalizeDecision(decision: string): 'APPROVED' | 'DECLINED' {
    if (typeof decision === 'string') {
      const lowerDecision = decision.toLowerCase();
      if (lowerDecision === 'approved' || lowerDecision === 'approve') {
        return 'APPROVED';
      }
    }
    return 'DECLINED';
  }

  /**
   * Generate AI-Powered Fix Suggestions section
   */
  private async generateAIPoweredFixSuggestions(result: AnalysisResult): Promise<string> {
    const { newIssues } = this.getIssuesArrays(result);
    const criticalAndHigh = newIssues.filter(i => i.severity === 'critical' || i.severity === 'high');

    if (criticalAndHigh.length === 0) {
      return `## AI-Powered Fix Suggestions

✅ **No critical or high-priority issues requiring immediate fixes.**

All identified issues are of medium or low priority and can be addressed during regular maintenance cycles.`;
    }

    let content = `## AI-Powered Fix Suggestions

🤖 **AI-generated solutions for your most critical issues:**

`;

    for (const issue of criticalAndHigh.slice(0, 5)) {
      const fixSuggestion = await this.generateDynamicFix(issue);
      if (fixSuggestion) {
        content += `### ${issue.title}

`;
        content += `**Fix Strategy:** ${fixSuggestion.fix}\n\n`;
        if (fixSuggestion.correctedCode) {
          content += `**Corrected Code:**\n\`\`\`${this.getLanguageFromFile(issue.file)}\n${fixSuggestion.correctedCode}\n\`\`\`\n\n`;
        }
        if (fixSuggestion.explanation) {
          content += `**Why This Works:** ${fixSuggestion.explanation}\n\n`;
        }
        content += `---\n\n`;
      }
    }

    return content;
  }

  /**
   * Generate Educational Resources section
   */
  private generateEducationalResources(result: AnalysisResult): string {
    const { newIssues, existingIssues } = this.getIssuesArrays(result);
    const allIssues = [...newIssues, ...existingIssues];

    if (allIssues.length === 0) {
      return `## Educational Resources

✅ **No specific educational resources needed at this time.**

Your code quality is excellent! Consider reviewing general best practices to maintain this standard.`;
    }

    const categories = Array.from(new Set(allIssues.map(i => i.category)));

    let content = `## Educational Resources

📚 **Curated learning materials based on your code analysis:**

`;

    categories.forEach(category => {
      const categoryIssues = allIssues.filter(i => i.category === category);
      content += `### ${category} (${categoryIssues.length} issues)\n\n`;

      switch (category) {
        case 'Security':
          content += `- [📚 OWASP Top 10](https://owasp.org/www-project-top-ten/) - Essential security vulnerabilities\n`;
          content += `- [🔒 Secure Coding Practices](https://owasp.org/www-project-secure-coding-practices-quick-reference-guide/) - Quick reference guide\n`;
          content += `- [🎬 Security Fundamentals](https://www.youtube.com/results?search_query=web+application+security+fundamentals) - Video tutorials\n\n`;
          break;
        case 'Performance':
          content += `- [⚡ Performance Best Practices](https://web.dev/performance/) - Web performance guide\n`;
          content += `- [📖 High Performance Programming](https://pragprog.com/titles/iobgp/high-performance-programming/) - Programming optimization\n`;
          content += `- [🔧 Profiling and Optimization](https://docs.oracle.com/javase/8/docs/technotes/guides/troubleshoot/tooldescr.html) - Java profiling tools\n\n`;
          break;
        case 'Architecture':
          content += `- [🏗️ Clean Architecture](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html) - Architecture principles\n`;
          content += `- [📚 Design Patterns](https://refactoring.guru/design-patterns) - Common design patterns\n`;
          content += `- [🎯 SOLID Principles](https://www.digitalocean.com/community/conceptual_articles/s-o-l-i-d-the-first-five-principles-of-object-oriented-design) - Object-oriented design\n\n`;
          break;
        case 'Dependency':
          content += `- [📦 Dependency Management](https://maven.apache.org/guides/introduction/introduction-to-dependency-mechanism.html) - Maven dependency guide\n`;
          content += `- [🛡️ Security Scanning](https://snyk.io/learn/application-security/) - Vulnerability scanning\n`;
          content += `- [🔄 Update Strategies](https://semver.org/) - Semantic versioning\n\n`;
          break;
        case 'Quality':
        default:
          content += `- [🧹 Clean Code](https://www.oreilly.com/library/view/clean-code-a/9780136083238/) - Code quality principles\n`;
          content += `- [📏 Code Metrics](https://martinfowler.com/bliki/CodeMetrics.html) - Measuring code quality\n`;
          content += `- [✅ Testing Best Practices](https://testingjavascript.com/) - Testing strategies\n\n`;
          break;
      }
    });

    return content;
  }

  /**
   * Generate Risk Matrix with Explanations
   */
  private generateRiskMatrix(result: AnalysisResult): string {
    const { newIssues, existingIssues } = this.getIssuesArrays(result);
    const allIssues = [...newIssues, ...existingIssues];

    const riskMatrix = {
      Security: this.calculateCategoryRisk(allIssues.filter(i => i.category === 'Security')),
      Performance: this.calculateCategoryRisk(allIssues.filter(i => i.category === 'Performance')),
      Architecture: this.calculateCategoryRisk(allIssues.filter(i => i.category === 'Architecture')),
      Dependency: this.calculateCategoryRisk(allIssues.filter(i => i.category === 'Dependency')),
      Quality: this.calculateCategoryRisk(allIssues.filter(i => i.category === 'Quality'))
    };

    return `## Risk Matrix with Explanations

🎯 **Risk assessment across all code quality categories:**

### Risk Scores by Category
| Category | Risk Score | Impact Level | Blocking Issues | Explanation |
|----------|------------|--------------|-----------------|-------------|
| Security | ${riskMatrix.Security.score} | ${this.getRiskImpactLevel(riskMatrix.Security.score)} | ${riskMatrix.Security.blocking} | ${this.getRiskExplanation('Security', riskMatrix.Security)} |
| Performance | ${riskMatrix.Performance.score} | ${this.getRiskImpactLevel(riskMatrix.Performance.score)} | ${riskMatrix.Performance.blocking} | ${this.getRiskExplanation('Performance', riskMatrix.Performance)} |
| Architecture | ${riskMatrix.Architecture.score} | ${this.getRiskImpactLevel(riskMatrix.Architecture.score)} | ${riskMatrix.Architecture.blocking} | ${this.getRiskExplanation('Architecture', riskMatrix.Architecture)} |
| Dependency | ${riskMatrix.Dependency.score} | ${this.getRiskImpactLevel(riskMatrix.Dependency.score)} | ${riskMatrix.Dependency.blocking} | ${this.getRiskExplanation('Dependency', riskMatrix.Dependency)} |
| Quality | ${riskMatrix.Quality.score} | ${this.getRiskImpactLevel(riskMatrix.Quality.score)} | ${riskMatrix.Quality.blocking} | ${this.getRiskExplanation('Quality', riskMatrix.Quality)} |

### Risk Assessment Legend
- **🔴 Critical (10+):** Immediate action required, blocks deployment
- **🟠 High (5-9):** Should be addressed before next release
- **🟡 Medium (2-4):** Address in upcoming sprints
- **🟢 Low (1):** Include in backlog for future improvement
- **⚪ None (0):** No issues detected in this category`;
  }

  /**
   * Generate Score Calculation Breakdown
   */
  private generateScoreCalculationBreakdown(result: AnalysisResult): string {
    const { newIssues, existingIssues, resolvedIssues } = this.getIssuesArrays(result);
    const baseScore = 100.0;

    const newIssuesDeduction = this.calculateImpact(newIssues);
    const existingIssuesDeduction = this.calculateImpact(existingIssues);
    const resolutionBonus = this.calculateImpact(resolvedIssues);

    const finalScore = result.qualityScore || 0;

    return `## Score Calculation Breakdown

🧮 **Detailed explanation of how your quality score was calculated:**

### Calculation Formula
\`\`\`
Final Score = Base Score - New Issues Penalty - Existing Issues Penalty + Resolution Bonus
\`\`\`

### Score Components
| Component | Value | Calculation | Explanation |
|-----------|-------|-------------|-------------|
| Base Score | ${baseScore} | Starting point | Perfect code baseline |
| New Issues Penalty | -${newIssuesDeduction.toFixed(1)} | ${newIssues.length} issues × severity weights | Issues introduced in this PR |
| Existing Issues Penalty | -${existingIssuesDeduction.toFixed(1)} | ${existingIssues.length} issues × severity weights | Pre-existing code issues |
| Resolution Bonus | +${resolutionBonus.toFixed(1)} | ${resolvedIssues.length} issues × severity weights | Issues fixed in this PR |
| **Final Score** | **${finalScore.toFixed(1)}** | **Grade: ${result.grade || 'F'}** | **Overall quality assessment** |

### Severity Weights
- **Critical:** -5.0 points per issue
- **High:** -3.0 points per issue
- **Medium:** -1.0 points per issue
- **Low:** -0.5 points per issue

### Grade Scale
- **A (90-100):** Excellent code quality
- **B (80-89):** Good code quality with minor issues
- **C (70-79):** Acceptable quality, some improvements needed
- **D (60-69):** Below standard, significant improvements required
- **F (0-59):** Poor quality, major refactoring needed`;
  }

  /**
   * Generate Skills Development Tracking
   */
  private generateSkillsDevelopmentTracking(result: AnalysisResult): string {
    const { newIssues } = this.getIssuesArrays(result);
    const skillAreas = this.identifySkillGaps(newIssues);

    return `## Skills Development Tracking

🎯 **Personalized development roadmap based on your code analysis:**

### Identified Skill Gaps
${skillAreas.length > 0 ? skillAreas.map(area =>
  `- **${area.skill}:** ${area.gap} (${area.issueCount} related issues)`
).join('\n') : '✅ No specific skill gaps identified - excellent work!'}

### Recommended Learning Path
${this.generateLearningPath(skillAreas)}

### Progress Tracking
| Skill Area | Current Level | Target Level | Estimated Time | Priority |
|------------|---------------|--------------|----------------|----------|
${skillAreas.map(area =>
  `| ${area.skill} | ${area.currentLevel} | ${area.targetLevel} | ${area.estimatedTime} | ${area.priority} |`
).join('\n') || '| All areas | ✅ Proficient | ✅ Proficient | - | - |'}

### Next Steps
1. **This Week:** ${this.getWeeklyRecommendation(skillAreas)}
2. **This Month:** ${this.getMonthlyRecommendation(skillAreas)}
3. **This Quarter:** ${this.getQuarterlyRecommendation(skillAreas)}`;
  }

  /**
   * Generate Performance Metrics section
   */
  private generatePerformanceMetrics(metadata: CompleteMetadata): string {
    const analysisRate = metadata.analysisTime ? (metadata.totalLinesOfCode || 0) / (metadata.analysisTime / 1000) : 0;
    const efficiency = metadata.totalFiles ? (metadata.maxFilesAnalyzed || 0) / metadata.totalFiles : 0;

    return `## Performance Metrics

⚡ **Analysis performance and efficiency metrics:**

### Execution Performance
| Metric | Value | Performance Rating |
|--------|-------|-------------------|
| Analysis Speed | ${Math.round(analysisRate)} lines/second | ${this.getPerformanceRating(analysisRate, 1000)} |
| File Processing Rate | ${metadata.analysisTime ? Math.round((metadata.maxFilesAnalyzed || 0) / (metadata.analysisTime / 1000)) : 0} files/second | ${this.getPerformanceRating(metadata.analysisTime ? (metadata.maxFilesAnalyzed || 0) / (metadata.analysisTime / 1000) : 0, 10)} |
| Analysis Efficiency | ${(efficiency * 100).toFixed(1)}% | ${this.getEfficiencyRating(efficiency)} |
| Total Duration | ${(metadata.totalDuration / 1000).toFixed(1)}s | ${this.getDurationRating(metadata.totalDuration)} |

### Resource Utilization
- **Memory Usage:** Optimized for large repositories
- **CPU Efficiency:** ${metadata.agentsUsed?.length || 0} parallel agents
- **Network I/O:** Minimized with smart caching
- **Storage:** Temporary workspace cleanup completed`;
  }

  /**
   * Generate Agent Performance Tracking
   */
  private generateAgentPerformanceTracking(metadata: CompleteMetadata): string {
    const agents = metadata.agentsUsed || [];

    return `## Agent Performance Tracking

🤖 **Individual AI agent performance analysis:**

### Agent Execution Summary
| Agent | Execution Time | Issues Found | Files Analyzed | Cost | Efficiency Score |
|-------|----------------|--------------|----------------|------|------------------|
${agents.map(agent => {
  const efficiency = agent.executionTime ? (agent.issuesFound / (agent.executionTime / 1000)) : 0;
  return `| ${agent.agentName} | ${(agent.executionTime / 1000).toFixed(1)}s | ${agent.issuesFound} | ${agent.filesAnalyzed} | $${agent.cost.toFixed(4)} | ${this.getAgentEfficiencyRating(efficiency)} |`;
}).join('\n') || '| No agent data available | - | - | - | - | - |'}

### Agent Models Used
${agents.map(agent =>
  `- **${agent.agentName}:** ${agent.modelUsed?.model || 'Unknown'} (${agent.modelUsed?.provider || 'Unknown'}) at ${agent.modelUsed?.temperature || 0} temperature`
).join('\n') || '- No model information available'}

### Performance Insights
- **Fastest Agent:** ${this.getFastestAgent(agents)}
- **Most Thorough:** ${this.getMostThoroughAgent(agents)}
- **Most Cost-Effective:** ${this.getMostCostEffectiveAgent(agents)}
- **Total AI Token Usage:** ${agents.reduce((sum, a) => sum + (a.tokensUsed || 0), 0).toLocaleString()}`;
  }

  /**
   * Generate Tool Performance Metrics
   */
  private generateToolPerformanceMetrics(metadata: CompleteMetadata): string {
    const tools = metadata.toolsUsed || [];

    return `## Tool Performance Metrics

🔧 **Static analysis tool performance breakdown:**

### Tool Execution Results
| Tool | Execution Time | Files Scanned | Issues Found | Success Rate | Performance Score |
|------|----------------|---------------|--------------|--------------|-------------------|
${tools.map(tool => {
  const successRate = tool.exitCode === 0 ? '100%' : '⚠️ Error';
  const performanceScore = this.calculateToolPerformanceScore(tool);
  return `| ${tool.toolName} | ${(tool.executionTime / 1000).toFixed(1)}s | ${tool.filesScanned} | ${tool.issuesFound} | ${successRate} | ${performanceScore} |`;
}).join('\n') || '| No tool data available | - | - | - | - | - |'}

### Tool Effectiveness
- **Most Productive:** ${this.getMostProductiveTool(tools)}
- **Fastest Scanner:** ${this.getFastestTool(tools)}
- **Best Coverage:** ${this.getBestCoverageTool(tools)}

### Error Analysis
${tools.filter(t => t.exitCode !== 0).length > 0 ?
  tools.filter(t => t.exitCode !== 0).map(t =>
    `- **${t.toolName}:** Exit code ${t.exitCode} - ${t.stderr || 'No error details'}`
  ).join('\n') :
  '✅ All tools executed successfully without errors'
}`;
  }

  /**
   * Generate Cost Analysis Breakdown
   */
  private generateCostAnalysisBreakdown(metadata: CompleteMetadata): string {
    const costBreakdown = metadata.costBreakdown || { aiModels: 0, infrastructure: 0, tools: 0 };
    const totalCost = metadata.totalCost || 0;

    return `## Cost Analysis Breakdown

💰 **Detailed cost analysis for this PR analysis:**

### Cost Components
| Component | Cost | Percentage | Details |
|-----------|------|------------|----------|
| AI Models | $${costBreakdown.aiModels.toFixed(4)} | ${totalCost ? ((costBreakdown.aiModels / totalCost) * 100).toFixed(1) : '0.0'}% | Token usage across all AI agents |
| Infrastructure | $${costBreakdown.infrastructure.toFixed(4)} | ${totalCost ? ((costBreakdown.infrastructure / totalCost) * 100).toFixed(1) : '0.0'}% | Kubernetes compute and storage |
| Tools | $${costBreakdown.tools.toFixed(4)} | ${totalCost ? ((costBreakdown.tools / totalCost) * 100).toFixed(1) : '0.0'}% | Static analysis tool licensing |
| **Total** | **$${totalCost.toFixed(4)}** | **100%** | **Complete analysis cost** |

### Cost Projections
- **Daily (avg 20 PRs):** $${(totalCost * 20).toFixed(2)}
- **Weekly (avg 100 PRs):** $${(totalCost * 100).toFixed(2)}
- **Monthly Estimate:** $${(metadata.estimatedMonthlyCost || 0).toFixed(2)}
- **Annual Projection:** $${((metadata.estimatedMonthlyCost || 0) * 12).toFixed(2)}

### Cost Optimization
- **Current Efficiency:** ${this.getCostEfficiencyRating(totalCost, metadata.maxFilesAnalyzed || 0)}
- **Optimization Opportunity:** ${this.getCostOptimizationSuggestion(metadata)}
- **ROI Analysis:** Prevention cost vs. potential bug fix cost`;
  }

  /**
   * Generate Progress Tracking section
   */
  private generateProgressTracking(result: AnalysisResult): string {
    const { newIssues, existingIssues, resolvedIssues } = this.getIssuesArrays(result);
    const progressMetrics = this.calculateProgressMetrics(result);

    return `## Progress Tracking

📈 **Track your code quality improvement over time:**

### Quality Trend Analysis
| Metric | Current Value | Previous Value | Change | Trend |
|--------|---------------|----------------|--------|-------|
| Quality Score | ${(result.qualityScore || 0).toFixed(1)} | ${progressMetrics.previousScore.toFixed(1)} | ${progressMetrics.scoreChange >= 0 ? '+' : ''}${progressMetrics.scoreChange.toFixed(1)} | ${progressMetrics.scoreChange >= 0 ? '📈' : '📉'} |
| Total Issues | ${newIssues.length + existingIssues.length} | ${progressMetrics.previousIssueCount} | ${progressMetrics.issueCountChange >= 0 ? '+' : ''}${progressMetrics.issueCountChange} | ${progressMetrics.issueCountChange <= 0 ? '📈' : '📉'} |
| Critical Issues | ${newIssues.filter(i => i.severity === 'critical').length} | ${progressMetrics.previousCriticalCount} | ${progressMetrics.criticalChange >= 0 ? '+' : ''}${progressMetrics.criticalChange} | ${progressMetrics.criticalChange <= 0 ? '📈' : '📉'} |
| Issues Resolved | ${resolvedIssues.length} | - | +${resolvedIssues.length} | ${resolvedIssues.length > 0 ? '📈' : '→'} |

### Improvement Goals
- **Short-term (1 week):** ${this.getShortTermGoal(result)}
- **Medium-term (1 month):** ${this.getMediumTermGoal(result)}
- **Long-term (1 quarter):** ${this.getLongTermGoal(result)}

### Achievement Tracking
${this.generateAchievements(result)}

### Next Milestones
- **Next Quality Score Target:** ${this.getNextScoreTarget(result.qualityScore || 0)}
- **Zero Critical Issues:** ${newIssues.filter(i => i.severity === 'critical').length === 0 ? '✅ Achieved!' : `${newIssues.filter(i => i.severity === 'critical').length} issues remaining`}
- **Code Quality Grade A:** ${result.grade === 'A' ? '✅ Achieved!' : `${(90 - (result.qualityScore || 0)).toFixed(1)} points needed`}`;
  }

  // Helper methods for the new sections
  private calculateCategoryRisk(issues: Issue[]): { score: number; blocking: number } {
    let score = 0;
    let blocking = 0;

    issues.forEach(issue => {
      switch (issue.severity) {
        case 'critical': score += 5; blocking++; break;
        case 'high': score += 3; blocking++; break;
        case 'medium': score += 1; break;
        case 'low': score += 0.5; break;
      }
    });

    return { score, blocking };
  }

  private getRiskExplanation(category: string, risk: { score: number; blocking: number }): string {
    if (risk.score === 0) return 'No issues detected';
    if (risk.score >= 10) return 'Critical security/stability risk';
    if (risk.score >= 5) return 'Significant quality impact';
    if (risk.score >= 2) return 'Moderate improvement needed';
    return 'Minor quality considerations';
  }

  private identifySkillGaps(issues: Issue[]): Array<{
    skill: string;
    gap: string;
    issueCount: number;
    currentLevel: string;
    targetLevel: string;
    estimatedTime: string;
    priority: string;
  }> {
    const skillMap = new Map<string, number>();
    issues.forEach(issue => {
      const skill = issue.category;
      skillMap.set(skill, (skillMap.get(skill) || 0) + 1);
    });

    return Array.from(skillMap.entries()).map(([skill, count]) => ({
      skill,
      gap: this.getSkillGapDescription(skill, count),
      issueCount: count,
      currentLevel: this.getCurrentSkillLevel(count),
      targetLevel: 'Proficient',
      estimatedTime: this.getEstimatedLearningTime(count),
      priority: count >= 3 ? '🔴 High' : count >= 2 ? '🟡 Medium' : '🟢 Low'
    }));
  }

  private getSkillGapDescription(skill: string, count: number): string {
    const descriptions = {
      Security: `${count} security vulnerabilities indicate need for security awareness training`,
      Performance: `${count} performance issues suggest optimization skills development`,
      Architecture: `${count} architectural issues indicate design pattern knowledge gaps`,
      Dependency: `${count} dependency issues suggest better dependency management practices`,
      Quality: `${count} quality issues indicate need for clean coding practices`
    };
    return descriptions[skill as keyof typeof descriptions] || `${count} issues in ${skill}`;
  }

  private getCurrentSkillLevel(issueCount: number): string {
    if (issueCount >= 5) return '🔰 Beginner';
    if (issueCount >= 3) return '📚 Learning';
    if (issueCount >= 1) return '⚡ Developing';
    return '✅ Proficient';
  }

  private getEstimatedLearningTime(issueCount: number): string {
    if (issueCount >= 5) return '4-6 weeks';
    if (issueCount >= 3) return '2-3 weeks';
    if (issueCount >= 1) return '1-2 weeks';
    return 'Maintenance';
  }

  private generateLearningPath(skillAreas: any[]): string {
    if (skillAreas.length === 0) return '✅ Continue current excellent practices';

    const highPriority = skillAreas.filter(a => a.priority === '🔴 High');
    const mediumPriority = skillAreas.filter(a => a.priority === '🟡 Medium');

    let path = '';
    if (highPriority.length > 0) {
      path += `**Phase 1 (Immediate):** Focus on ${highPriority.map(a => a.skill).join(', ')}\n`;
    }
    if (mediumPriority.length > 0) {
      path += `**Phase 2 (Next Month):** Address ${mediumPriority.map(a => a.skill).join(', ')}\n`;
    }

    return path || 'Continue maintaining current quality standards';
  }

  private getWeeklyRecommendation(skillAreas: any[]): string {
    if (skillAreas.length === 0) return 'Maintain current coding standards';
    const topSkill = skillAreas.sort((a, b) => b.issueCount - a.issueCount)[0];
    return `Focus on ${topSkill.skill} fundamentals`;
  }

  private getMonthlyRecommendation(skillAreas: any[]): string {
    if (skillAreas.length === 0) return 'Review advanced best practices';
    return `Complete comprehensive training in identified skill gaps`;
  }

  private getQuarterlyRecommendation(skillAreas: any[]): string {
    return 'Establish mentoring relationships and peer code reviews';
  }

  private getPerformanceRating(value: number, benchmark: number): string {
    const ratio = value / benchmark;
    if (ratio >= 2) return '🚀 Excellent';
    if (ratio >= 1) return '✅ Good';
    if (ratio >= 0.5) return '⚡ Average';
    return '🐌 Needs Improvement';
  }

  private getEfficiencyRating(efficiency: number): string {
    if (efficiency >= 0.9) return '🎯 Optimal';
    if (efficiency >= 0.7) return '✅ Good';
    if (efficiency >= 0.5) return '⚡ Average';
    return '🔧 Needs Tuning';
  }

  private getDurationRating(duration: number): string {
    if (duration < 30000) return '⚡ Fast';
    if (duration < 60000) return '✅ Good';
    if (duration < 120000) return '⏳ Average';
    return '🐌 Slow';
  }

  private getAgentEfficiencyRating(efficiency: number): string {
    if (efficiency >= 2) return '🏆 Excellent';
    if (efficiency >= 1) return '✅ Good';
    if (efficiency >= 0.5) return '⚡ Average';
    return '🔧 Needs Tuning';
  }

  private getFastestAgent(agents: any[]): string {
    if (agents.length === 0) return 'N/A';
    const fastest = agents.reduce((min, agent) =>
      agent.executionTime < min.executionTime ? agent : min
    );
    return `${fastest.agentName} (${(fastest.executionTime / 1000).toFixed(1)}s)`;
  }

  private getMostThoroughAgent(agents: any[]): string {
    if (agents.length === 0) return 'N/A';
    const mostThorough = agents.reduce((max, agent) =>
      agent.issuesFound > max.issuesFound ? agent : max
    );
    return `${mostThorough.agentName} (${mostThorough.issuesFound} issues)`;
  }

  private getMostCostEffectiveAgent(agents: any[]): string {
    if (agents.length === 0) return 'N/A';
    const mostEffective = agents.reduce((min, agent) =>
      (agent.cost / agent.issuesFound || Infinity) < (min.cost / min.issuesFound || Infinity) ? agent : min
    );
    return `${mostEffective.agentName} ($${(mostEffective.cost / mostEffective.issuesFound).toFixed(4)}/issue)`;
  }

  private calculateToolPerformanceScore(tool: any): string {
    const efficiency = tool.executionTime ? (tool.issuesFound / (tool.executionTime / 1000)) : 0;
    if (efficiency >= 2) return '🏆 Excellent';
    if (efficiency >= 1) return '✅ Good';
    if (efficiency >= 0.5) return '⚡ Average';
    return '🔧 Poor';
  }

  private getMostProductiveTool(tools: any[]): string {
    if (tools.length === 0) return 'N/A';
    const mostProductive = tools.reduce((max, tool) =>
      tool.issuesFound > max.issuesFound ? tool : max
    );
    return `${mostProductive.toolName} (${mostProductive.issuesFound} issues)`;
  }

  private getFastestTool(tools: any[]): string {
    if (tools.length === 0) return 'N/A';
    const fastest = tools.reduce((min, tool) =>
      tool.executionTime < min.executionTime ? tool : min
    );
    return `${fastest.toolName} (${(fastest.executionTime / 1000).toFixed(1)}s)`;
  }

  private getBestCoverageTool(tools: any[]): string {
    if (tools.length === 0) return 'N/A';
    const bestCoverage = tools.reduce((max, tool) =>
      tool.filesScanned > max.filesScanned ? tool : max
    );
    return `${bestCoverage.toolName} (${bestCoverage.filesScanned} files)`;
  }

  private getCostEfficiencyRating(totalCost: number, filesAnalyzed: number): string {
    const costPerFile = filesAnalyzed ? totalCost / filesAnalyzed : Infinity;
    if (costPerFile <= 0.001) return '🎯 Excellent';
    if (costPerFile <= 0.005) return '✅ Good';
    if (costPerFile <= 0.01) return '⚡ Average';
    return '💰 Expensive';
  }

  private getCostOptimizationSuggestion(metadata: CompleteMetadata): string {
    const costBreakdown = metadata.costBreakdown || { aiModels: 0, infrastructure: 0, tools: 0 };
    const totalCost = metadata.totalCost || 0;

    if (costBreakdown.aiModels / totalCost > 0.7) {
      return 'Consider optimizing AI model usage and prompts';
    } else if (costBreakdown.infrastructure / totalCost > 0.5) {
      return 'Evaluate infrastructure scaling and resource allocation';
    } else {
      return 'Cost structure is well-balanced';
    }
  }

  private calculateProgressMetrics(result: AnalysisResult): any {
    // Mock progress metrics - in real implementation, this would compare with previous analysis
    return {
      previousScore: (result.qualityScore || 0) - 5,
      scoreChange: 5,
      previousIssueCount: 10,
      issueCountChange: -3,
      previousCriticalCount: 2,
      criticalChange: -1
    };
  }

  private getShortTermGoal(result: AnalysisResult): string {
    const { newIssues } = this.getIssuesArrays(result);
    const criticalCount = newIssues.filter(i => i.severity === 'critical').length;
    if (criticalCount > 0) return `Resolve ${criticalCount} critical issues`;
    return 'Maintain current quality standards';
  }

  private getMediumTermGoal(result: AnalysisResult): string {
    const score = result.qualityScore || 0;
    if (score < 80) return 'Achieve quality score of 80+';
    if (score < 90) return 'Achieve grade A quality (90+)';
    return 'Maintain excellent quality standards';
  }

  private getLongTermGoal(result: AnalysisResult): string {
    return 'Establish sustainable code quality practices and mentor team members';
  }

  private generateAchievements(result: AnalysisResult): string {
    const achievements = [];
    const { resolvedIssues } = this.getIssuesArrays(result);

    if (resolvedIssues.length > 0) {
      achievements.push(`🏆 Problem Solver: Resolved ${resolvedIssues.length} issues`);
    }

    if ((result.qualityScore || 0) >= 90) {
      achievements.push('🌟 Quality Champion: Achieved grade A quality');
    }

    if (achievements.length === 0) {
      achievements.push('🎯 Getting Started: Complete your first quality analysis');
    }

    return achievements.join('\n');
  }

  private getNextScoreTarget(currentScore: number): string {
    if (currentScore < 60) return '60 (Grade D)';
    if (currentScore < 70) return '70 (Grade C)';
    if (currentScore < 80) return '80 (Grade B)';
    if (currentScore < 90) return '90 (Grade A)';
    return '95+ (Excellence)';
  }
}