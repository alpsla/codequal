/**
 * V9 PR Comment Generator
 * Generates personalized GitHub PR comments based on analysis results
 */

import { AnalysisResult } from './v9-types';
import { logger } from '../utils/logger';

export interface PRCommentOptions {
  includeEducationalResources?: boolean;
  includeSkillScore?: boolean;
  includeBusinessImpact?: boolean;
  maxIssuesInComment?: number;
  tone?: 'friendly' | 'professional' | 'constructive';
}

export class V9PRCommentGenerator {
  private readonly defaultOptions: PRCommentOptions = {
    includeEducationalResources: true,
    includeSkillScore: true,
    includeBusinessImpact: false,
    maxIssuesInComment: 5,
    tone: 'constructive'
  };

  /**
   * Generate personalized PR comment for the author
   */
  async generatePRComment(
    result: AnalysisResult,
    options: PRCommentOptions = {}
  ): Promise<string> {
    const opts = { ...this.defaultOptions, ...options };
    
    // Get author name from metadata
    const authorName = this.getAuthorFirstName((result.metadata as any)?.prAuthor || 'there');
    
    const sections: string[] = [];
    
    // Add personalized greeting
    sections.push(this.generateGreeting(authorName, result, opts.tone || 'constructive'));
    
    // Add decision summary
    sections.push(this.generateDecisionSummary(result));
    
    // Add personalized feedback based on issues
    sections.push(this.generatePersonalizedFeedback(result, opts));
    
    // Add skill development section if enabled
    if (opts.includeSkillScore && result.skillScore) {
      sections.push(this.generateSkillDevelopment(result, authorName));
    }
    
    // Add top issues that need attention
    sections.push(this.generateTopIssues(result, opts.maxIssuesInComment || 5));
    
    // Add educational resources if enabled
    if (opts.includeEducationalResources && result.educationalResources && result.educationalResources.length > 0) {
      sections.push(this.generateEducationalSection(result, authorName));
    }
    
    // Add encouraging closing
    sections.push(this.generateClosing(result, authorName, opts.tone || 'constructive'));
    
    // Add metadata footer
    sections.push(this.generateFooter(result));
    
    return sections.filter(s => s).join('\n\n---\n\n');
  }

  /**
   * Generate personalized greeting based on analysis results
   */
  private generateGreeting(authorName: string, result: AnalysisResult, tone: string): string {
    const greetings = {
      friendly: [
        `Hey ${authorName}! 👋`,
        `Hi ${authorName}!`,
        `Hello ${authorName}! 🎯`
      ],
      professional: [
        `Hello ${authorName},`,
        `Dear ${authorName},`,
        `Greetings ${authorName},`
      ],
      constructive: [
        `Hi ${authorName}!`,
        `Hello ${authorName},`,
        `Thanks for your contribution, ${authorName}!`
      ]
    };

    const greeting = greetings[tone as keyof typeof greetings][0];
    
    if (result.decision === 'approved') {
      return `${greeting} Great work on this PR! Your code quality score is **${result.qualityScore.toFixed(1)}/100** (${result.grade}). 🎉`;
    } else if (result.qualityScore >= 60) {
      return `${greeting} Thanks for your contribution! Your code quality score is **${result.qualityScore.toFixed(1)}/100** (${result.grade}). With a few improvements, this PR will be ready to merge.`;
    } else {
      return `${greeting} I've reviewed your PR and found some areas that need attention. Your current code quality score is **${result.qualityScore.toFixed(1)}/100** (${result.grade}).`;
    }
  }

  /**
   * Generate decision summary with personalized explanation
   */
  private generateDecisionSummary(result: AnalysisResult): string {
    const emoji = result.decision === 'approved' ? '✅' : '⚠️';
    const decision = result.decision === 'approved' ? 'APPROVED' : 'NEEDS WORK';
    
    let summary = `## ${emoji} PR Status: ${decision}\n\n`;
    summary += `**Confidence Level:** ${result.confidence}%\n\n`;
    
    if (result.reason) {
      summary += `> ${result.reason}\n`;
    }
    
    // Add comprehensive stats table
    summary += `\n### 📊 Issue Statistics\n\n`;
    summary += `| Category | Count | Status |\n`;
    summary += `|----------|-------|--------|\n`;
    summary += `| ✅ Resolved Issues | ${result.resolvedIssues.length} | Fixed in this PR |\n`;
    summary += `| 🆕 New Issues | ${result.newIssues.length} | **${result.blockingIssues.length > 0 ? `${result.blockingIssues.length} blocking` : 'None blocking'}** |\n`;
    
    // Calculate existing issues in modified files
    const existingInModified = result.existingIssues.filter(issue => 
      result.modifiedFiles.includes(issue.file)
    ).length;
    const existingNotInModified = result.existingIssues.length - existingInModified;
    
    summary += `| 📌 Existing Issues (in modified files) | ${existingInModified} | Not blocking |\n`;
    summary += `| 📋 Existing Issues (other files) | ${existingNotInModified} | Not blocking |\n`;
    summary += `| **Total Issues** | **${result.newIssues.length + result.existingIssues.length}** | - |\n`;
    
    // Add files summary
    summary += `\n### 📁 Files Summary\n`;
    summary += `- **Files Modified:** ${result.modifiedFiles.length}\n`;
    summary += `- **Files Analyzed:** ${result.modifiedFiles.length}\n`;
    
    // Add lines of code if available
    const metadata = result.metadata as any;
    if (metadata?.totalLinesOfCode) {
      summary += `- **Total Lines of Code:** ${metadata.totalLinesOfCode.toLocaleString()}\n`;
    }
    if (metadata?.linesAdded) {
      summary += `- **Lines Added:** +${metadata.linesAdded}\n`;
    }
    if (metadata?.linesDeleted) {
      summary += `- **Lines Deleted:** -${metadata.linesDeleted}\n`;
    }
    
    return summary;
  }

  /**
   * Generate personalized feedback based on the developer's patterns
   */
  private generatePersonalizedFeedback(result: AnalysisResult, options: PRCommentOptions): string {
    const feedback: string[] = [];
    
    feedback.push('## 💡 Personalized Feedback\n');
    
    // Analyze patterns in issues
    const issueCategories = this.categorizeIssues(result.newIssues);
    
    // Provide specific feedback for each category
    if (issueCategories.security > 0) {
      feedback.push(`🔒 **Security Focus:** I noticed ${issueCategories.security} security-related issue${issueCategories.security > 1 ? 's' : ''} in your code. Security should always be a top priority - consider reviewing OWASP guidelines for your specific use case.`);
    }
    
    if (issueCategories.performance > 0) {
      feedback.push(`⚡ **Performance Consideration:** Your code has ${issueCategories.performance} performance-related issue${issueCategories.performance > 1 ? 's' : ''}. Consider profiling your code to identify bottlenecks.`);
    }
    
    if (issueCategories.quality > 0) {
      feedback.push(`✨ **Code Quality:** There are ${issueCategories.quality} code quality issue${issueCategories.quality > 1 ? 's' : ''} that could improve maintainability. Clean code pays dividends in the long run!`);
    }
    
    // Add positive reinforcement for resolved issues
    if (result.resolvedIssues.length > 0) {
      feedback.push(`\n🎯 **Great job fixing ${result.resolvedIssues.length} existing issue${result.resolvedIssues.length > 1 ? 's' : ''}!** This shows attention to code quality beyond just your changes.`);
    }
    
    // Pattern-based suggestions
    if (this.hasPatternIssues(result.newIssues)) {
      feedback.push(`\n📝 **Pattern Detected:** I see similar issues across multiple files. Consider creating a shared utility or abstraction to address these consistently.`);
    }
    
    return feedback.join('\n\n');
  }

  /**
   * Generate skill development section
   */
  private generateSkillDevelopment(result: AnalysisResult, authorName: string): string {
    if (!result.skillScore) return '';
    
    const sections: string[] = [];
    sections.push(`## 📈 Your Development Journey\n`);
    
    // Overall skill assessment
    sections.push(`${authorName}, your overall skill level is **${result.skillScore.score}/100** (${this.getSkillLevel(result.skillScore.score)}).\n`);
    
    // Category breakdown with visual bars
    sections.push('### Skill Breakdown');
    sections.push('```');
    sections.push(`Security:     ${this.generateProgressBar(result.skillScore.categories.security)} ${result.skillScore.categories.security}%`);
    sections.push(`Performance:  ${this.generateProgressBar(result.skillScore.categories.performance)} ${result.skillScore.categories.performance}%`);
    sections.push(`Architecture: ${this.generateProgressBar(result.skillScore.categories.architecture)} ${result.skillScore.categories.architecture}%`);
    sections.push(`Dependencies: ${this.generateProgressBar(result.skillScore.categories.dependency)} ${result.skillScore.categories.dependency}%`);
    sections.push(`Code Quality: ${this.generateProgressBar(result.skillScore.categories.quality)} ${result.skillScore.categories.quality}%`);
    sections.push('```');
    
    // Trend analysis
    if (result.skillScore.trend && result.skillScore.trend.length > 0) {
      const trend = this.analyzeTrend(result.skillScore.trend);
      sections.push(`\n**Trend:** ${trend}`);
    }
    
    // Top recommendations
    if (result.skillScore.recommendations && result.skillScore.recommendations.length > 0) {
      sections.push('\n### 🎯 Focus Areas for Growth');
      result.skillScore.recommendations.slice(0, 3).forEach(rec => {
        sections.push(`- ${rec}`);
      });
    }
    
    return sections.join('\n');
  }

  /**
   * Generate top issues section
   */
  private generateTopIssues(result: AnalysisResult, maxIssues: number): string {
    if (result.blockingIssues.length === 0 && result.newIssues.length === 0) {
      return '## ✅ No Issues Found\n\nExcellent work! Your code is clean and ready to merge.';
    }
    
    const sections: string[] = [];
    sections.push('## 🔍 Key Issues to Address\n');
    
    // Show blocking issues first
    if (result.blockingIssues.length > 0) {
      sections.push('### 🚨 Blocking Issues (Must Fix)');
      result.blockingIssues.slice(0, Math.min(3, maxIssues)).forEach((issue, index) => {
        sections.push(this.formatIssueForComment(issue, index + 1));
      });
    }
    
    // Show other new issues
    const remainingSlots = maxIssues - result.blockingIssues.length;
    if (remainingSlots > 0 && result.newIssues.length > result.blockingIssues.length) {
      sections.push('\n### ⚠️ Other Issues');
      const otherIssues = result.newIssues.filter(i => !result.blockingIssues.includes(i));
      otherIssues.slice(0, remainingSlots).forEach((issue, index) => {
        sections.push(this.formatIssueForComment(issue, index + 1));
      });
    }
    
    // Add summary if there are more issues
    const totalIssues = result.newIssues.length;
    if (totalIssues > maxIssues) {
      sections.push(`\n*View the full report for ${totalIssues - maxIssues} additional issue${totalIssues - maxIssues > 1 ? 's' : ''}.*`);
    }
    
    return sections.join('\n');
  }

  /**
   * Generate educational resources section
   */
  private generateEducationalSection(result: AnalysisResult, authorName: string): string {
    if (!result.educationalResources || result.educationalResources.length === 0) {
      return '';
    }
    
    const sections: string[] = [];
    sections.push(`## 📚 Learning Resources for You, ${authorName}\n`);
    sections.push(`Based on the issues in your PR, here are some resources that might help:\n`);
    
    // Group resources by type
    const docs = result.educationalResources.filter(r => r.type === 'documentation');
    const tutorials = result.educationalResources.filter(r => r.type === 'tutorial');
    const videos = result.educationalResources.filter(r => r.type === 'video');
    
    if (docs.length > 0) {
      sections.push('### 📖 Documentation');
      docs.slice(0, 2).forEach(resource => {
        sections.push(`- [${resource.title}](${resource.url})`);
        if (resource.description) {
          sections.push(`  ${resource.description}`);
        }
      });
    }
    
    if (tutorials.length > 0) {
      sections.push('\n### 🎓 Tutorials');
      tutorials.slice(0, 2).forEach(resource => {
        sections.push(`- [${resource.title}](${resource.url})`);
      });
    }
    
    if (videos.length > 0) {
      sections.push('\n### 🎥 Video Resources');
      videos.slice(0, 1).forEach(resource => {
        sections.push(`- [${resource.title}](${resource.url})`);
      });
    }
    
    return sections.join('\n');
  }

  /**
   * Generate encouraging closing message
   */
  private generateClosing(result: AnalysisResult, authorName: string, tone: string): string {
    const closings: string[] = [];
    
    if (result.decision === 'approved') {
      closings.push(`## 🎉 Ready to Merge!\n`);
      closings.push(`Excellent work, ${authorName}! Your code meets our quality standards and is ready for production.`);
    } else if (result.blockingIssues.length > 0) {
      closings.push(`## 💪 Almost There!\n`);
      closings.push(`${authorName}, once you address the ${result.blockingIssues.length} blocking issue${result.blockingIssues.length > 1 ? 's' : ''} above, this PR will be ready for another review. You've got this!`);
    } else {
      closings.push(`## 🚀 Next Steps\n`);
      closings.push(`Great effort, ${authorName}! Consider addressing the issues above to improve your code quality score. Remember, every improvement makes the codebase better for everyone.`);
    }
    
    // Add motivational note based on improvement
    if (result.resolvedIssues.length > result.newIssues.length) {
      closings.push(`\n*PS: You fixed more issues than you introduced - that's the mark of a thoughtful developer! 🌟*`);
    }
    
    return closings.join('\n');
  }

  /**
   * Generate footer with metadata
   */
  private generateFooter(result: AnalysisResult): string {
    const footer: string[] = [];
    
    footer.push('---');
    footer.push('*🤖 Generated by CodeQual V9 Analyzer*');
    footer.push(`*Analysis completed in ${(result.metadata?.analysisTime || 0) / 1000}s using ${result.metadata?.model || 'AI model'}*`);
    footer.push(`*[View Full Report](${this.generateReportUrl(result)}) | [Learn More](https://codequal.dev)*`);
    
    return footer.join('\n');
  }

  /**
   * Helper: Format issue for PR comment with full details
   */
  private formatIssueForComment(issue: any, index: number): string {
    const severity = this.getSeverityEmoji(issue.severity);
    const categoryEmoji = this.getCategoryEmoji(issue.category);
    const sections: string[] = [];
    
    // Issue header with title
    sections.push(`\n### ${index}. ${severity} ${issue.title || issue.description}`);
    sections.push('');
    
    // Metadata table
    sections.push('| Property | Value |');
    sections.push('|----------|-------|');
    sections.push(`| **Category** | ${categoryEmoji} ${issue.category} |`);
    sections.push(`| **Severity** | ${severity} **${issue.severity.toUpperCase()}** |`);
    sections.push(`| **File Location** | \`${issue.file}:${issue.line}\` |`);
    sections.push(`| **Detection Tool** | ${issue.tool} |`);
    sections.push(`| **Analysis Agent** | ${issue.agent} |`);
    sections.push(`| **Status** | ${issue.status === 'New' ? '🆕 New' : '📌 Existing'} |`);
    if (issue.inModifiedFile !== undefined) {
      sections.push(`| **In Modified File** | ${issue.inModifiedFile ? '✅ Yes' : '❌ No'} |`);
    }
    sections.push('');
    
    // Description
    sections.push('**Description:**');
    sections.push(`> ${issue.description}`);
    sections.push('');
    
    // Impact sections
    if (issue.impact) {
      sections.push('**Technical Impact:**');
      sections.push(`> ${issue.impact}`);
      sections.push('');
    }
    
    if (issue.businessImpact) {
      sections.push('**Business Impact:**');
      sections.push(`> ${issue.businessImpact}`);
      sections.push('');
    }
    
    // Code snippet if available
    if (issue.codeSnippet) {
      sections.push('**📄 Code Snippet:**');
      sections.push('```' + this.getLanguageForFile(issue.file));
      
      // Add line numbers context if available
      if (issue.line) {
        const startLine = Math.max(1, issue.line - 2);
        const endLine = issue.line + 2;
        sections.push(`    ${startLine}: // Lines ${startLine}-${endLine}`);
      }
      
      // Add the actual code with highlight
      const codeLines = issue.codeSnippet.split('\n');
      codeLines.forEach((line: string, idx: number) => {
        if (idx === Math.min(2, codeLines.length - 1)) {
          sections.push(`>>> ${line}`);
        } else {
          sections.push(`    ${line}`);
        }
      });
      sections.push('```');
      sections.push('');
    }
    
    // Recommended fix
    if (issue.suggestedFix) {
      sections.push('**✨ Recommended Fix:**');
      sections.push(`> ${issue.suggestedFix}`);
      sections.push('');
    }
    
    // Fixed code snippet if available
    if (issue.suggestedCodeSnippet) {
      sections.push('**Fixed Code:**');
      sections.push('```' + this.getLanguageForFile(issue.file));
      sections.push(issue.suggestedCodeSnippet);
      sections.push('```');
      sections.push('');
    }
    
    return sections.join('\n');
  }
  
  /**
   * Helper: Get category emoji
   */
  private getCategoryEmoji(category: string): string {
    const emojis: Record<string, string> = {
      Security: '🔒',
      Performance: '⚡',
      Quality: '✨',
      Architecture: '🏗️',
      Dependency: '📦'
    };
    return emojis[category] || '📋';
  }
  
  /**
   * Helper: Get language for syntax highlighting
   */
  private getLanguageForFile(filename: string): string {
    const ext = filename.split('.').pop()?.toLowerCase();
    const langMap: Record<string, string> = {
      'java': 'java',
      'js': 'javascript',
      'ts': 'typescript',
      'py': 'python',
      'go': 'go',
      'rs': 'rust',
      'cpp': 'cpp',
      'c': 'c',
      'cs': 'csharp',
      'rb': 'ruby',
      'php': 'php',
      'swift': 'swift',
      'kt': 'kotlin',
      'scala': 'scala',
      'xml': 'xml',
      'yaml': 'yaml',
      'yml': 'yaml',
      'json': 'json',
      'sql': 'sql',
      'sh': 'bash',
      'gradle': 'groovy'
    };
    return langMap[ext || ''] || '';
  }

  /**
   * Helper: Get author's first name
   */
  private getAuthorFirstName(fullName: string): string {
    if (!fullName || fullName === 'unknown') return 'there';
    const parts = fullName.split(/[\s@]/);
    return parts[0] || 'there';
  }

  /**
   * Helper: Categorize issues
   */
  private categorizeIssues(issues: any[]): Record<string, number> {
    const categories = {
      security: 0,
      performance: 0,
      quality: 0,
      dependency: 0,
      architecture: 0
    };
    
    issues.forEach(issue => {
      if (issue.category in categories) {
        categories[issue.category as keyof typeof categories]++;
      } else {
        categories.quality++;
      }
    });
    
    return categories;
  }

  /**
   * Helper: Check for pattern issues
   */
  private hasPatternIssues(issues: any[]): boolean {
    const typeCount: Record<string, number> = {};
    issues.forEach(issue => {
      typeCount[issue.type] = (typeCount[issue.type] || 0) + 1;
    });
    return Object.values(typeCount).some(count => count >= 3);
  }

  /**
   * Helper: Get skill level description
   */
  private getSkillLevel(score: number): string {
    if (score >= 90) return 'Expert';
    if (score >= 75) return 'Senior';
    if (score >= 60) return 'Mid-Level';
    if (score >= 40) return 'Junior';
    return 'Beginner';
  }

  /**
   * Helper: Generate progress bar
   */
  private generateProgressBar(percentage: number): string {
    const filled = Math.round(percentage / 10);
    const empty = 10 - filled;
    return '█'.repeat(filled) + '░'.repeat(empty);
  }

  /**
   * Helper: Analyze trend
   */
  private analyzeTrend(trend: number[]): string {
    if (trend.length < 2) return 'Not enough data';
    
    const recent = trend.slice(-3);
    const average = recent.reduce((a, b) => a + b, 0) / recent.length;
    const lastValue = trend[trend.length - 1];
    
    if (lastValue > average + 5) return '📈 Improving';
    if (lastValue < average - 5) return '📉 Declining';
    return '➡️ Stable';
  }

  /**
   * Helper: Get severity emoji
   */
  private getSeverityEmoji(severity: string): string {
    const emojis = {
      critical: '🔴',
      high: '🟠',
      medium: '🟡',
      low: '🟢',
      info: '🔵'
    };
    return emojis[severity as keyof typeof emojis] || '⚪';
  }

  /**
   * Helper: Generate report URL
   */
  private generateReportUrl(result: AnalysisResult): string {
    // This would be the actual URL to the full report
    return `#report-${result.metadata?.prNumber}`;
  }
}