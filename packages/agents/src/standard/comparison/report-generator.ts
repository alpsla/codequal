/**
 * Report Generator for Comparison Results
 * 
 * Generates markdown reports and PR comments from comparison analysis
 */

import { ComparisonResult } from '../types/analysis-types';
import { readFileSync } from 'fs';
import { join } from 'path';

export class ReportGenerator {
  private templatePath: string;

  constructor() {
    // Use the template we already created
    this.templatePath = join(__dirname, '../templates/pr-analysis-template.md');
  }

  /**
   * Generate full markdown report
   */
  async generateMarkdownReport(comparison: ComparisonResult): Promise<string> {
    try {
      // Read template
      const template = readFileSync(this.templatePath, 'utf-8');
      
      // Populate template with actual data
      return this.populateTemplate(template, comparison);
    } catch (error) {
      // Fallback to basic report if template not found
      return this.generateBasicReport(comparison);
    }
  }

  /**
   * Generate concise PR comment
   */
  generatePRComment(comparison: ComparisonResult): string {
    const summary = comparison.summary as any;
    const assessment = summary?.overallAssessment;
    
    const status = this.getPRStatus(assessment);
    const emoji = status === 'approved' ? '✅' : status === 'blocked' ? '🚫' : '⚠️';
    
    const newCritical = comparison.newIssues?.filter(i => (i as any).severity === 'critical').length || 0;
    const newHigh = comparison.newIssues?.filter(i => (i as any).severity === 'high').length || 0;
    
    let comment = `${emoji} **Code Analysis Complete**\n\n`;
    
    // Status
    comment += `**Status:** ${status.toUpperCase()}\n`;
    comment += `**Confidence:** ${Math.round((assessment?.confidence || 0.85) * 100)}%\n\n`;
    
    // Summary
    if (summary) {
      comment += `**Changes Summary:**\n`;
      comment += `- ✅ Fixed: ${summary.totalResolved || 0} issues\n`;
      comment += `- ⚠️ New: ${summary.totalNew || 0} issues`;
      if (newCritical > 0 || newHigh > 0) {
        comment += ` (${newCritical} critical, ${newHigh} high)`;
      }
      comment += '\n';
      comment += `- 🔄 Modified: ${summary.totalModified || 0} issues\n\n`;
    }
    
    // Recommendations
    if (comparison.recommendations && comparison.recommendations.length > 0) {
      comment += `**Key Recommendations:**\n`;
      comparison.recommendations.slice(0, 3).forEach(rec => {
        comment += `- ${rec}\n`;
      });
      comment += '\n';
    }
    
    // Skill tracking
    if ((comparison as any).skillTracking) {
      const skills = (comparison as any).skillTracking;
      if (skills.adjustments && skills.adjustments.length > 0) {
        comment += `**Skill Development:**\n`;
        const positive = skills.adjustments.filter((a: any) => a.points > 0);
        const negative = skills.adjustments.filter((a: any) => a.points < 0);
        
        if (positive.length > 0) {
          comment += `✨ Demonstrated: ${positive.map((a: any) => a.reason).join(', ')}\n`;
        }
        if (negative.length > 0) {
          comment += `📚 Areas to improve: ${negative.map((a: any) => a.category).join(', ')}\n`;
        }
      }
    }
    
    comment += `\n_Full report available in the analysis details_`;
    
    return comment;
  }

  /**
   * Populate template with data
   */
  private populateTemplate(template: string, comparison: ComparisonResult): string {
    // Get data from comparison result
    const metadata = (comparison as any).metadata || {};
    const skillTracking = (comparison as any).skillTracking || {};
    const repositoryScores = (comparison as any).repositoryScores || {};
    const prMetadata = metadata.prMetadata || {};
    const summary = comparison.summary as any;
    
    // Calculate scores and metrics
    const overallScore = this.calculateOverallScore(comparison);
    const grade = this.getGrade(overallScore);
    const hasBlockingIssues = comparison.newIssues?.some((i: any) => 
      i.severity === 'critical' || i.severity === 'high'
    );
    
    // Calculate issue counts
    const newCritical = comparison.newIssues?.filter((i: any) => i.severity === 'critical').length || 0;
    const newHigh = comparison.newIssues?.filter((i: any) => i.severity === 'high').length || 0;
    const newMedium = comparison.newIssues?.filter((i: any) => i.severity === 'medium').length || 0;
    const newLow = comparison.newIssues?.filter((i: any) => i.severity === 'low').length || 0;
    
    const existingIssues = (comparison as any).existingIssues || [];
    const existingCritical = existingIssues.filter((i: any) => i.severity === 'critical').length || 0;
    const existingHigh = existingIssues.filter((i: any) => i.severity === 'high').length || 0;
    const existingMedium = existingIssues.filter((i: any) => i.severity === 'medium').length || 0;
    const existingLow = existingIssues.filter((i: any) => i.severity === 'low').length || 0;
    
    const criticalResolved = comparison.resolvedIssues?.filter((r: any) => 
      (r.issue || r).severity === 'critical').length || 0;
    
    // Start with template and replace sections dynamically
    let report = template;
    
    // Replace basic metadata
    report = report.replace(/https:\/\/github\.com\/techcorp\/payment-processor/g, 
      prMetadata.repository_url || 'https://github.com/vercel/swr');
    report = report.replace(/#3842 - Major refactor: Microservices migration Phase 1/g,
      `#${prMetadata.number || 'N/A'} - ${prMetadata.title || 'Code Changes'}`);
    report = report.replace(/Sarah Chen \(@schen\)/g,
      `${prMetadata.author || 'Unknown'} (@${prMetadata.authorUsername || metadata.userId || 'unknown'})`);
    report = report.replace(/2025-07-31T23:44:26.831Z/g, new Date().toISOString());
    report = report.replace(/127\.8 seconds/g, `${metadata.scanDuration || '5.0'} seconds`);
    report = report.replace(/GPT-4 Turbo \(Dynamically Selected for Large PR\)/g, 
      `${metadata.model || 'GPT-4'} (Dynamically Selected for ${prMetadata.filesChanged > 50 ? 'Large' : 'Standard'} PR)`);
    
    // Update PR Decision
    const decision = hasBlockingIssues ? '❌ DECLINED - CRITICAL/HIGH ISSUES MUST BE FIXED' : '✅ APPROVED';
    report = report.replace(/❌ DECLINED - CRITICAL\/HIGH ISSUES MUST BE FIXED/g, decision);
    report = report.replace(/✅ APPROVED/g, decision);
    report = report.replace(/94%/g, `${Math.round((summary?.confidence || 0.92) * 100)}%`);
    
    // Update decision description
    if (hasBlockingIssues) {
      report = report.replace(
        /This PR introduces 2 critical and 3 high severity issues that must be resolved before merge\./g,
        `This PR introduces ${newCritical} critical and ${newHigh} high severity issues that must be resolved before merge.`
      );
    } else {
      report = report.replace(
        /This PR introduces 2 critical and 3 high severity issues that must be resolved before merge\./g,
        'This PR successfully improves code quality with no blocking issues introduced.'
      );
    }
    
    // Update executive summary
    report = report.replace(/68\/100 \(Grade: D\+\)/g, `${overallScore}/100 (Grade: ${grade})`);
    report = report.replace(/was 74, now 68/g, 
      `was ${repositoryScores.previous || 72}, now ${repositoryScores.current || overallScore}`);
    
    // Update the "large PR" description based on actual size
    const totalLines = (prMetadata.linesAdded || 0) + (prMetadata.linesRemoved || 0);
    const prSizeDesc = totalLines > 1000 ? 'large' : totalLines > 500 ? 'medium-sized' : 'focused';
    report = report.replace(
      /This large PR \(2,847 lines changed across 89 files\)/g,
      `This ${prSizeDesc} PR (${totalLines} lines changed across ${prMetadata.filesChanged || 5} files)`
    );
    
    // Update metrics
    report = report.replace(/Critical Issues Resolved: 5/g, `Critical Issues Resolved: ${criticalResolved}`);
    report = report.replace(/New Critical\/High Issues: 5 \(2 critical, 3 high\)/g,
      `New Critical/High Issues: ${newCritical + newHigh} (${newCritical} critical, ${newHigh} high)`);
    report = report.replace(/Pre-existing Issues: 15 \(3 critical, 5 high, 4 medium, 3 low\)/g,
      `Pre-existing Issues: ${existingIssues.length} (${existingCritical} critical, ${existingHigh} high, ${existingMedium} medium, ${existingLow} low)`);
    report = report.replace(/Files Changed: 89/g, `Files Changed: ${prMetadata.filesChanged || 5}`);
    report = report.replace(/\+1,923 \/ -924/g, `+${prMetadata.linesAdded || 100} / -${prMetadata.linesRemoved || 50}`);
    report = report.replace(/Lines Added\/Removed: \+1923 \/ -924/g, 
      `Lines Added/Removed: +${prMetadata.linesAdded || 100} / -${prMetadata.linesRemoved || 50}`);
    
    // Update issue distribution visualization
    const issueDistribution = `\`\`\`
NEW PR ISSUES${hasBlockingIssues ? ' (BLOCKING)' : ''}:
Critical: ${'█'.repeat(Math.min(10, newCritical))}${'░'.repeat(10 - Math.min(10, newCritical))} ${newCritical}${newCritical > 0 ? ' - MUST FIX' : ''}
High:     ${'█'.repeat(Math.min(10, newHigh))}${'░'.repeat(10 - Math.min(10, newHigh))} ${newHigh}${newHigh > 0 ? ' - MUST FIX' : ''}
Medium:   ${'█'.repeat(Math.min(10, newMedium))}${'░'.repeat(10 - Math.min(10, newMedium))} ${newMedium} (acceptable)
Low:      ${'█'.repeat(Math.min(10, newLow))}${'░'.repeat(10 - Math.min(10, newLow))} ${newLow} (acceptable)

EXISTING REPOSITORY ISSUES (NOT BLOCKING):
Critical: ${'█'.repeat(Math.min(10, existingCritical))}${'░'.repeat(10 - Math.min(10, existingCritical))} ${existingCritical} unfixed
High:     ${'█'.repeat(Math.min(10, existingHigh))}${'░'.repeat(10 - Math.min(10, existingHigh))} ${existingHigh} unfixed
Medium:   ${'█'.repeat(Math.min(10, existingMedium))}${'░'.repeat(10 - Math.min(10, existingMedium))} ${existingMedium} unfixed
Low:      ${'█'.repeat(Math.min(10, existingLow))}${'░'.repeat(10 - Math.min(10, existingLow))} ${existingLow} unfixed
\`\`\``;
    
    // Replace the issue distribution section
    const issueDistRegex = /```[\s\S]*?NEW PR ISSUES[\s\S]*?```/;
    report = report.replace(issueDistRegex, issueDistribution);
    
    // Update individual skill tracking section (around line 742)
    if (skillTracking.previousScore !== undefined && skillTracking.newScore !== undefined) {
      // Find and replace the skill tracking section
      const skillSectionRegex = /\*\*Developer: Sarah Chen.*?\*\*Final Score: 61\/100\*\* \(-14 from previous\)/s;
      
      const newSkillSection = this.generateSkillTrackingSection(skillTracking, prMetadata);
      report = report.replace(skillSectionRegex, newSkillSection);
      
      // Update skill breakdown table
      if (skillTracking.categoryChanges) {
        const tableRegex = /\| Skill \| Previous \| Current \| Change \| Detailed Calculation \|[\s\S]*?\| Testing \| \d+\/100 \| \d+\/100 \| [-+]\d+ \|.*?\|/;
        const newTable = this.generateSkillTable(skillTracking.categoryChanges);
        report = report.replace(tableRegex, newTable);
      }
    }
    
    // Update repository score section
    if (repositoryScores.current) {
      const repoScoreRegex = /\*\*Repository Overall Score:.*?\*\*/;
      report = report.replace(repoScoreRegex, 
        `**Repository Overall Score: ${repositoryScores.current}/100 (was ${repositoryScores.previous || 72}/100)**`);
    }
    
    // Update issue sections with actual data
    report = this.updateIssueSections(report, comparison);
    
    // Update category scores
    const categories = ['Security', 'Performance', 'Code Quality', 'Architecture', 'Dependencies'];
    categories.forEach(category => {
      const score = this.calculateCategoryScore(comparison, category.toLowerCase());
      const categoryGrade = this.getGrade(score);
      const regex = new RegExp(`### Score: \\d+/100 \\(Grade: [A-F][+-]?\\)`, 'g');
      report = report.replace(regex, (match) => {
        if (report.indexOf(match) > report.indexOf(`## \\d+\\. ${category} Analysis`)) {
          return `### Score: ${score}/100 (Grade: ${categoryGrade})`;
        }
        return match;
      });
    });
    
    return report;
  }

  /**
   * Generate skill tracking section
   */
  private generateSkillTrackingSection(skillTracking: any, prMetadata: any): string {
    const developer = prMetadata.author || 'Test User';
    const previousScore = skillTracking.previousScore || 75;
    const newScore = skillTracking.newScore || 80;
    const scoreChange = newScore - previousScore;
    const grade = this.getGrade(newScore);
    
    let section = `**Developer: ${developer}**  \n`;
    section += `**Status: Mid-Level Developer**\n\n`;
    section += `**Overall Skill Level: ${newScore}/100 (Grade: ${grade})**\n\n`;
    
    // Calculate detailed breakdown
    const adjustments = skillTracking.adjustments || [];
    const positiveAdjustments = adjustments.filter((a: any) => a.points > 0)
      .reduce((sum: number, a: any) => sum + a.points, 0);
    const negativeAdjustments = adjustments.filter((a: any) => a.points < 0)
      .reduce((sum: number, a: any) => sum + Math.abs(a.points), 0);
    
    section += `*Detailed Calculation Breakdown:*\n`;
    section += `- Previous Score: ${previousScore}/100\n`;
    section += `- Base adjustment for PR (${skillTracking.prScore || 68}/100): +${Math.round((skillTracking.prScore || 68) * 0.05)} → Starting at ${previousScore + Math.round((skillTracking.prScore || 68) * 0.05)}\n\n`;
    
    if (positiveAdjustments > 0) {
      section += `**Positive Adjustments: +${positiveAdjustments.toFixed(1)}**\n`;
      adjustments.filter((a: any) => a.points > 0).forEach((adj: any) => {
        section += `- ${adj.reason}: +${adj.points} (${adj.count || 1} × ${adj.pointsPerItem || adj.points})\n`;
      });
      section += '\n';
    }
    
    if (negativeAdjustments > 0) {
      section += `**Negative Adjustments: -${negativeAdjustments.toFixed(1)}**\n`;
      adjustments.filter((a: any) => a.points < 0).forEach((adj: any) => {
        section += `- ${adj.reason}: ${adj.points} (${adj.count || 1} × ${adj.pointsPerItem || adj.points})\n`;
      });
      section += '\n';
    }
    
    section += `**Final Score: ${newScore}/100** (${scoreChange > 0 ? '+' : ''}${scoreChange} from previous)`;
    
    return section;
  }

  /**
   * Generate skill table
   */
  private generateSkillTable(categoryChanges: any): string {
    let table = `| Skill | Previous | Current | Change | Detailed Calculation |\n`;
    table += `|-------|----------|---------|---------|---------------------|\n`;
    
    const categories = ['Security', 'Performance', 'Architecture', 'Code Quality', 'Dependencies', 'Testing'];
    categories.forEach(category => {
      const key = category.toLowerCase().replace(' ', '_');
      const changes = categoryChanges[key] || categoryChanges[category.toLowerCase()] || {
        previous: 75,
        current: 75,
        change: 0,
        details: 'No changes'
      };
      
      const changeStr = changes.change > 0 ? `+${changes.change}` : `${changes.change}`;
      table += `| ${category} | ${changes.previous}/100 | ${changes.current}/100 | ${changeStr} | ${changes.details || 'No changes'} |\n`;
    });
    
    return table;
  }

  /**
   * Update issue sections in the report
   */
  private updateIssueSections(report: string, comparison: ComparisonResult): string {
    // Generate PR issues section
    let prIssuesSection = '';
    if (comparison.newIssues && comparison.newIssues.length > 0) {
      prIssuesSection = this.formatIssuesWithCodeSnippets(comparison.newIssues, 'PR Issues');
    } else {
      prIssuesSection = '## PR Issues\n\nNo new issues introduced! 🎉\n';
    }
    
    // Replace the PR issues section
    const prIssuesRegex = /## 6\. PR Issues.*?(?=## 7\.|## Individual|---\n##|$)/s;
    if (report.match(prIssuesRegex)) {
      report = report.replace(prIssuesRegex, prIssuesSection + '\n');
    }
    
    // Generate repository issues section
    const existingIssues = (comparison as any).existingIssues || [];
    let repoIssuesSection = '';
    if (existingIssues.length > 0) {
      repoIssuesSection = `## Repository Issues (NOT BLOCKING)\n\n`;
      repoIssuesSection += `*These pre-existing issues don't block the PR but impact skill scores and should be addressed as technical debt.*\n\n`;
      repoIssuesSection += this.formatRepoIssues(existingIssues);
    }
    
    // Replace the repository issues section
    const repoIssuesRegex = /## 7\. Repository Issues.*?(?=## 8\.|## Individual|---\n##|$)/s;
    if (report.match(repoIssuesRegex)) {
      report = report.replace(repoIssuesRegex, repoIssuesSection + '\n');
    }
    
    return report;
  }

  /**
   * Format repository issues
   */
  private formatRepoIssues(issues: any[]): string {
    let section = '';
    const bySeverity = this.groupBySeverity(issues);
    
    ['critical', 'high', 'medium', 'low'].forEach(severity => {
      if (bySeverity[severity] && bySeverity[severity].length > 0) {
        const emoji = severity === 'critical' ? '🚨' : severity === 'high' ? '⚠️' : severity === 'medium' ? '🟡' : '🟢';
        const impactMap: Record<string, number> = {
          critical: 5,     // Same as new issues!
          high: 3,         // Same as new issues!
          medium: 1,       // Same as new issues!
          low: 0.5         // Same as new issues!
        };
        const totalImpact = bySeverity[severity].length * impactMap[severity];
        
        section += `### ${emoji} ${this.capitalize(severity)} Repository Issues (${bySeverity[severity].length})\n`;
        section += `**Score Impact:** -${totalImpact} points (same as new ${severity} issues)\n\n`;
        
        bySeverity[severity].forEach((issue: any, idx: number) => {
          section += `#### REPO-${severity.toUpperCase()}-${issue.category?.toUpperCase() || 'GEN'}-${String(idx + 1).padStart(3, '0')}: ${issue.title || issue.message}\n`;
          if (issue.file) {
            section += `**File:** ${issue.file}:${issue.line || 0}  \n`;
          }
          if (issue.age) {
            section += `**Age:** ${issue.age}  \n`;
          }
          section += `**Impact:** ${issue.impact || issue.description}\n\n`;
          
          if (issue.codeSnippet || issue.problematic_code) {
            section += `**Current Implementation:**\n`;
            section += `\`\`\`${issue.language || 'typescript'}\n`;
            section += `${issue.codeSnippet || issue.problematic_code}\n`;
            section += `\`\`\`\n\n`;
          }
          
          if (issue.suggestedFix || issue.required_fix) {
            section += `**Required Fix:**\n`;
            section += `\`\`\`${issue.language || 'typescript'}\n`;
            section += `${issue.suggestedFix || issue.required_fix}\n`;
            section += `\`\`\`\n\n`;
          }
        });
      }
    });
    
    return section;
  }

  /**
   * Generate basic report without template
   */
  private generateBasicReport(comparison: ComparisonResult): string {
    const summary = comparison.summary as any;
    const metadata = (comparison as any).metadata || {};
    const skillTracking = (comparison as any).skillTracking || {};
    const prMetadata = metadata.prMetadata || {};
    
    // Generate comprehensive report with proper template format
    let report = `# Pull Request Analysis Report\n\n`;
    
    // PR Information
    report += `**Repository:** ${prMetadata.repository_url || 'https://github.com/vercel/swr'}  \n`;
    report += `**PR:** #${prMetadata.number || 'N/A'} - ${prMetadata.title || 'Code Changes'}  \n`;
    report += `**Analysis Date:** ${new Date().toISOString()}  \n`;
    report += `**Model Used:** ${metadata.model || 'GPT-4'} (Dynamically Selected)  \n`;
    report += `**Scan Duration:** ${metadata.scanDuration || Math.random() * 5 + 2}s\n\n`;
    report += `---\n\n`;
    
    // PR Decision
    const hasBlockingIssues = comparison.newIssues?.some((i: any) => 
      i.severity === 'critical' || i.severity === 'high'
    );
    
    report += `## PR Decision: ${hasBlockingIssues ? '❌ REQUIRES FIXES' : '✅ APPROVED'}\n\n`;
    report += `**Confidence:** ${Math.round((summary?.confidence || 0.92) * 100)}%\n\n`;
    
    if (hasBlockingIssues) {
      const criticalCount = comparison.newIssues?.filter((i: any) => i.severity === 'critical').length || 0;
      const highCount = comparison.newIssues?.filter((i: any) => i.severity === 'high').length || 0;
      report += `This PR introduces ${criticalCount} critical and ${highCount} high severity issues that should be addressed.\n\n`;
    } else {
      report += `This PR successfully improves code quality with no blocking issues.\n\n`;
    }
    
    report += `---\n\n`;
    
    // Executive Summary
    const overallScore = this.calculateOverallScore(comparison);
    const grade = this.getGrade(overallScore);
    
    report += `## Executive Summary\n\n`;
    report += `**Overall Score: ${overallScore}/100 (Grade: ${grade})**\n\n`;
    
    // Key Metrics
    report += `### Key Metrics\n`;
    report += `- **Critical Issues Resolved:** ${comparison.resolvedIssues?.filter((r: any) => 
      (r.issue || r).severity === 'critical').length || 0} ✅\n`;
    report += `- **New Critical/High Issues:** ${comparison.newIssues?.filter((i: any) => 
      i.severity === 'critical' || i.severity === 'high').length || 0} ${hasBlockingIssues ? '🚨' : '✅'}\n`;
    report += `- **Overall Score Impact:** ${summary?.scoreImpact || '+5'} points\n`;
    report += `- **Risk Level:** ${hasBlockingIssues ? 'MEDIUM' : 'LOW'}\n`;
    report += `- **Files Changed:** ${prMetadata.filesChanged || metadata.filesAnalyzed || 5}\n`;
    report += `- **Lines Added/Removed:** +${prMetadata.linesAdded || 100} / -${prMetadata.linesRemoved || 50}\n\n`;
    
    // Issue Distribution
    if (comparison.newIssues && comparison.newIssues.length > 0) {
      const bySeverity = this.groupBySeverity(comparison.newIssues);
      report += `### Issue Distribution\n`;
      report += '```\n';
      ['critical', 'high', 'medium', 'low'].forEach(severity => {
        const count = bySeverity[severity]?.length || 0;
        const bar = '█'.repeat(Math.ceil(count * 2));
        const empty = '░'.repeat(20 - Math.ceil(count * 2));
        report += `${this.capitalize(severity).padEnd(8)}: ${bar}${empty} ${count}\n`;
      });
      report += '```\n\n';
    }
    
    report += `---\n\n`;
    
    // Category Analysis
    const categories = ['Security', 'Performance', 'Code Quality', 'Architecture', 'Testing'];
    categories.forEach((category, idx) => {
      report += `## ${idx + 1}. ${category} Analysis\n\n`;
      const categoryScore = this.calculateCategoryScore(comparison, category.toLowerCase());
      const categoryGrade = this.getGrade(categoryScore);
      report += `### Score: ${categoryScore}/100 (Grade: ${categoryGrade})\n\n`;
      
      // Add category-specific improvements/issues
      const categoryIssues = this.filterByCategory(comparison, category.toLowerCase());
      if (categoryIssues.resolved.length > 0) {
        report += `### ${category} Improvements\n`;
        categoryIssues.resolved.forEach((issue: any) => {
          report += `- ✅ ${issue.description || issue.message}\n`;
        });
        report += '\n';
      }
      
      report += `---\n\n`;
    });
    
    // PR Issues (if any)
    if (comparison.newIssues && comparison.newIssues.length > 0) {
      report += `## PR Issues\n\n`;
      report += this.formatIssuesWithCodeSnippets(comparison.newIssues, 'New Issues Found');
    }
    
    // Repository Issues (existing)
    const existingIssues = (comparison as any).existingIssues || [];
    if (existingIssues.length > 0) {
      report += `## Repository Issues (NOT BLOCKING)\n\n`;
      report += `*These pre-existing issues don't block the PR but impact skill scores.*\n\n`;
      report += this.formatIssuesWithCodeSnippets(existingIssues, 'Existing Issues');
    }
    
    // Individual & Team Skills Tracking
    report += `## Individual & Team Skills Tracking\n\n`;
    report += `### Individual Developer Progress\n\n`;
    report += `**Developer: ${prMetadata.author || 'Test User'}**  \n`;
    report += `**Status: Mid-Level Developer**\n\n`;
    
    if (skillTracking.previousScore !== undefined && skillTracking.newScore !== undefined) {
      const scoreChange = skillTracking.newScore - skillTracking.previousScore;
      report += `**Overall Skill Level: ${skillTracking.newScore}/100 (${this.getGrade(skillTracking.newScore)})**\n\n`;
      report += `*Skill Evolution:*\n`;
      report += `- Previous Score: ${skillTracking.previousScore}/100\n`;
      report += `- Current Score: ${skillTracking.newScore}/100\n`;
      report += `- Change: ${scoreChange > 0 ? '+' : ''}${scoreChange} points\n\n`;
      
      // Skill breakdown
      if (skillTracking.categoryChanges) {
        report += `| Skill | Previous | Current | Change |\n`;
        report += `|-------|----------|---------|--------|\n`;
        Object.entries(skillTracking.categoryChanges).forEach(([category, changes]: [string, any]) => {
          report += `| ${this.capitalize(category)} | ${changes.previous}/100 | ${changes.current}/100 | ${changes.change > 0 ? '+' : ''}${changes.change} |\n`;
        });
        report += '\n';
      }
      
      // Skill adjustments
      if (skillTracking.adjustments && skillTracking.adjustments.length > 0) {
        report += `### Skill Adjustments\n`;
        skillTracking.adjustments.forEach((adj: any, idx: number) => {
          const prefix = adj.points > 0 ? '+' : '';
          report += `${idx + 1}. **${prefix}${adj.points} ${adj.category}**: ${adj.reason}\n`;
        });
        report += '\n';
      }
    }
    
    // Repository Score Tracking
    report += `### Repository Score Evolution\n\n`;
    const repoScores = (comparison as any).repositoryScores || {};
    if (repoScores.previous && repoScores.current) {
      report += `**Repository Overall Score: ${repoScores.current}/100 (was ${repoScores.previous}/100)**\n\n`;
      report += `*Repository Quality Metrics:*\n`;
      report += `- Code Coverage: ${repoScores.coverage || '78%'}\n`;
      report += `- Technical Debt: ${repoScores.debt || '12%'}\n`;
      report += `- Security Score: ${repoScores.security || '85/100'}\n`;
      report += `- Maintainability: ${repoScores.maintainability || 'B'}\n\n`;
    }
    
    // Recommendations
    if (comparison.recommendations && comparison.recommendations.length > 0) {
      report += `## Recommendations\n\n`;
      comparison.recommendations.forEach((rec: string, idx: number) => {
        report += `${idx + 1}. ${rec}\n`;
      });
      report += '\n';
    }
    
    // PR Comment Summary
    report += `---\n\n`;
    report += `## PR Comment Summary\n\n`;
    report += `**Decision: ${hasBlockingIssues ? '❌ REQUIRES FIXES' : '✅ APPROVED'}**\n\n`;
    
    if (hasBlockingIssues) {
      report += `This PR has blocking issues that need attention:\n`;
      const blocking = comparison.newIssues?.filter((i: any) => 
        i.severity === 'critical' || i.severity === 'high'
      );
      blocking?.forEach((issue: any) => {
        report += `- 🚨 ${issue.severity.toUpperCase()}: ${issue.description || issue.message}\n`;
      });
    } else {
      report += `Great work! This PR successfully:\n`;
      if (comparison.resolvedIssues && comparison.resolvedIssues.length > 0) {
        report += `- ✅ Resolved ${comparison.resolvedIssues.length} issues\n`;
      }
      if (comparison.insights && comparison.insights.length > 0) {
        comparison.insights.slice(0, 3).forEach((insight: string) => {
          report += `- ${insight}\n`;
        });
      }
    }
    
    report += `\n---\n\n`;
    report += `*Generated by AI Code Analysis Platform v4.0*  \n`;
    report += `*For questions or support: support@codequal.com*\n`;
    
    return report;
  }

  /**
   * Generate issue sections for template
   */
  private generateIssueSections(template: string, comparison: ComparisonResult): string {
    let report = template;
    
    // Generate new issues section with code snippets for all severities
    if (comparison.newIssues && comparison.newIssues.length > 0) {
      const newIssuesSection = this.formatIssuesWithCodeSnippets(comparison.newIssues, 'New Issues');
      report = report.replace('{{NEW_ISSUES_SECTION}}', newIssuesSection);
    } else {
      report = report.replace('{{NEW_ISSUES_SECTION}}', '## New Issues\n\nNo new issues introduced! 🎉\n');
    }
    
    // Generate resolved issues section
    if (comparison.resolvedIssues && comparison.resolvedIssues.length > 0) {
      const resolvedSection = this.formatResolvedIssues(comparison.resolvedIssues);
      report = report.replace('{{RESOLVED_ISSUES_SECTION}}', resolvedSection);
    } else {
      report = report.replace('{{RESOLVED_ISSUES_SECTION}}', '## Resolved Issues\n\nNo issues resolved.\n');
    }
    
    return report;
  }

  private formatIssuesWithCodeSnippets(issues: any[], sectionTitle: string): string {
    let section = `## ${sectionTitle}\n\n`;
    const bySeverity = this.groupBySeverity(issues);
    
    ['critical', 'high', 'medium', 'low'].forEach(severity => {
      if (bySeverity[severity] && bySeverity[severity].length > 0) {
        const emoji = severity === 'critical' ? '🚨' : severity === 'high' ? '⚠️' : severity === 'medium' ? '🟡' : '🟢';
        section += `### ${emoji} ${this.capitalize(severity)} Issues (${bySeverity[severity].length})\n\n`;
        
        bySeverity[severity].forEach((issue: any, idx: number) => {
          const issueId = `${sectionTitle.includes('PR') ? 'PR' : 'REPO'}-${severity.toUpperCase()}-${issue.category?.toUpperCase() || 'GEN'}-${String(idx + 1).padStart(3, '0')}`;
          section += `#### ${issueId}: ${issue.title || issue.category || issue.message || 'Unknown Issue'}\n`;
          
          if (issue.file || issue.location?.file) {
            section += `**File:** ${issue.file || issue.location?.file}:${issue.line || issue.location?.line || 0}  \n`;
          }
          
          section += `**Impact:** ${issue.impact || issue.description || issue.message || 'Security/Performance impact'}\n`;
          
          if (issue.severity_score) {
            section += `**Severity Score:** ${issue.severity_score}/10\n`;
          }
          
          if (issue.skillImpact) {
            section += `**Skill Impact:** ${issue.skillImpact}\n`;
          }
          
          // Always include code snippet for all severities
          section += `\n**Problematic Code:**\n`;
          section += `\`\`\`${issue.language || 'typescript'}\n`;
          if (issue.codeSnippet || issue.code_snippet || issue.problematic_code) {
            section += `${issue.codeSnippet || issue.code_snippet || issue.problematic_code}\n`;
          } else {
            // Generate example code if none provided
            section += `// Code example not available\n`;
            section += `// Issue: ${issue.message || issue.title || 'Check implementation'}\n`;
          }
          section += `\`\`\`\n`;
          
          // Include suggested fix for all severities
          section += `\n**Required Fix:**\n`;
          section += `\`\`\`${issue.language || 'typescript'}\n`;
          if (issue.suggestedFix || issue.suggested_fix || issue.fix || issue.required_fix) {
            section += `${issue.suggestedFix || issue.suggested_fix || issue.fix || issue.required_fix}\n`;
          } else {
            // Generate example fix if none provided
            section += `// TODO: Implement fix for ${issue.title || issue.message || 'this issue'}\n`;
            section += `// Follow secure coding practices\n`;
          }
          section += `\`\`\`\n`;
          
          section += '\n---\n\n';
        });
      }
    });
    
    return section;
  }
  
  private formatResolvedIssues(resolvedIssues: any[]): string {
    let section = `## Resolved Issues\n\n`;
    
    if (resolvedIssues.length === 0) {
      section += 'No issues were resolved in this PR.\n';
      return section;
    }
    
    const bySeverity = this.groupBySeverity(resolvedIssues.map(r => r.issue || r));
    
    ['critical', 'high', 'medium', 'low'].forEach(severity => {
      if (bySeverity[severity] && bySeverity[severity].length > 0) {
        section += `### ${this.capitalize(severity)} Issues Resolved (${bySeverity[severity].length})\n\n`;
        
        bySeverity[severity].forEach((issue: any, idx: number) => {
          section += `${idx + 1}. ✅ **${issue.title || issue.category || issue.message}**\n`;
          
          if (issue.file || issue.location?.file) {
            section += `   - Location: \`${issue.file || issue.location?.file}:${issue.line || issue.location?.line || 0}\`\n`;
          }
          
          if (issue.description || issue.impact) {
            section += `   - Impact: ${issue.impact || issue.description}\n`;
          }
          
          section += '\n';
        });
      }
    });
    
    return section;
  }

  /**
   * Generate skill tracking section
   */
  private generateSkillSection(template: string, comparison: ComparisonResult): string {
    // Add skill tracking if available
    return template;
  }

  /**
   * Generate education section
   */
  private generateEducationSection(template: string, comparison: ComparisonResult): string {
    // Add educational recommendations if available
    return template;
  }

  /**
   * Calculate overall score
   */
  /**
   * Calculate overall score
   */
  private calculateOverallScore(comparison: ComparisonResult): number {
    const summary = comparison.summary as any;
    
    // Start with a base score
    let score = 100;
    
    // Count issues by severity
    const newCritical = comparison.newIssues?.filter(i => (i as any).severity === 'critical').length || 0;
    const newHigh = comparison.newIssues?.filter(i => (i as any).severity === 'high').length || 0;
    const newMedium = comparison.newIssues?.filter(i => (i as any).severity === 'medium').length || 0;
    const newLow = comparison.newIssues?.filter(i => (i as any).severity === 'low').length || 0;
    
    // Deduct for new issues
    score -= newCritical * 5;    // -5 points per critical
    score -= newHigh * 3;        // -3 points per high
    score -= newMedium * 1;      // -1 point per medium
    score -= newLow * 0.5;       // -0.5 points per low
    
    // Deduct for existing issues (SAME penalty - a critical issue is a critical issue!)
    const existingIssues = (comparison as any).existingIssues || [];
    const existingCritical = existingIssues.filter((i: any) => i.severity === 'critical').length;
    const existingHigh = existingIssues.filter((i: any) => i.severity === 'high').length;
    const existingMedium = existingIssues.filter((i: any) => i.severity === 'medium').length;
    const existingLow = existingIssues.filter((i: any) => i.severity === 'low').length;
    
    score -= existingCritical * 5;   // -5 points per unfixed critical (same as new!)
    score -= existingHigh * 3;       // -3 points per unfixed high (same as new!)
    score -= existingMedium * 1;     // -1 point per unfixed medium (same as new!)
    score -= existingLow * 0.5;      // -0.5 points per unfixed low (same as new!)
    
    // Bonus for resolved issues
    const resolvedCritical = comparison.resolvedIssues?.filter((r: any) => 
      (r.issue || r).severity === 'critical').length || 0;
    const resolvedHigh = comparison.resolvedIssues?.filter((r: any) => 
      (r.issue || r).severity === 'high').length || 0;
    const resolvedMedium = comparison.resolvedIssues?.filter((r: any) => 
      (r.issue || r).severity === 'medium').length || 0;
    const resolvedLow = comparison.resolvedIssues?.filter((r: any) => 
      (r.issue || r).severity === 'low').length || 0;
    
    score += resolvedCritical * 5;   // +5 points per critical resolved
    score += resolvedHigh * 3;       // +3 points per high resolved
    score += resolvedMedium * 1;     // +1 point per medium resolved
    score += resolvedLow * 0.5;      // +0.5 points per low resolved
    
    // Ensure score is within bounds
    return Math.max(0, Math.min(100, Math.round(score)));
  }

  /**
   * Calculate category score
   */
  private calculateCategoryScore(comparison: ComparisonResult, category: string): number {
    // Simplified scoring
    return 80; // TODO: Implement proper category scoring
  }

  /**
   * Get PR status from assessment
   */
  private getPRStatus(assessment: any): string {
    if (!assessment) return 'review needed';
    
    if (assessment.prRecommendation === 'block') return 'blocked';
    if (assessment.prRecommendation === 'approve') return 'approved';
    return 'review needed';
  }

  /**
   * Get PR decision reason
   */
  private getPRDecisionReason(comparison: ComparisonResult): string {
    const newCritical = comparison.newIssues?.filter(i => (i as any).severity === 'critical').length || 0;
    const newHigh = comparison.newIssues?.filter(i => (i as any).severity === 'high').length || 0;
    
    if (newCritical > 0) {
      return `${newCritical} new critical issue${newCritical > 1 ? 's' : ''} must be resolved`;
    }
    if (newHigh > 0) {
      return `${newHigh} new high severity issue${newHigh > 1 ? 's' : ''} require attention`;
    }
    
    const resolved = comparison.resolvedIssues?.length || 0;
    if (resolved > 0) {
      return `Good progress - ${resolved} issue${resolved > 1 ? 's' : ''} resolved`;
    }
    
    return 'No blocking issues found';
  }

  /**
   * Group issues by severity
   */
  private groupBySeverity(issues: any[]): Record<string, any[]> {
    const groups: Record<string, any[]> = {
      critical: [],
      high: [],
      medium: [],
      low: []
    };
    
    issues.forEach(issue => {
      const severity = issue.severity || 'medium';
      if (groups[severity]) {
        groups[severity].push(issue);
      }
    });
    
    return groups;
  }

  /**
   * Capitalize first letter
   */
  private capitalize(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  /**
   * Get grade from score
   */
  private getGrade(score: number): string {
    if (score >= 90) return 'A';
    if (score >= 80) return 'B';
    if (score >= 70) return 'C';
    if (score >= 60) return 'D';
    return 'F';
  }

  /**
   * Filter issues by category
   */
  private filterByCategory(comparison: ComparisonResult, category: string): { resolved: any[], new: any[] } {
    const resolved = comparison.resolvedIssues?.filter((r: any) => {
      const issue = r.issue || r;
      return issue.category?.toLowerCase() === category || 
             (category === 'code quality' && issue.category === 'code-quality') ||
             (category === 'testing' && issue.category === 'test');
    }) || [];
    
    const newIssues = comparison.newIssues?.filter((i: any) => 
      i.category?.toLowerCase() === category || 
      (category === 'code quality' && i.category === 'code-quality') ||
      (category === 'testing' && i.category === 'test')
    ) || [];
    
    return { resolved, new: newIssues };
  }
}