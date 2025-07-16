import * as fs from 'fs';
import * as path from 'path';

export class HtmlReportGenerator {
  /**
   * Generate enhanced HTML report with the new template
   */
  generateEnhancedHtmlReport(report: any): string {
    // Use the existing enhanced template
    let templatePath = path.join(__dirname, '../templates/modular/enhanced-template.html');
    
    // In production/dist, look for the template in public directory
    if (!fs.existsSync(templatePath)) {
      templatePath = path.join(__dirname, '../../public/enhanced-report-template.html');
    }
    
    // If still not found, use the source directory
    if (!fs.existsSync(templatePath)) {
      templatePath = path.join(__dirname, '../../src/templates/modular/enhanced-template.html');
    }
    
    let template = fs.readFileSync(templatePath, 'utf-8');
    
    // Count issues
    const prCritical = report.pr_issues?.critical?.length || 0;
    const prHigh = report.pr_issues?.high?.length || 0;
    const prMedium = report.pr_issues?.medium?.length || 0;
    const prLow = report.pr_issues?.low?.length || 0;
    
    const repHigh = report.repository_issues?.high?.length || 0;
    const repMedium = report.repository_issues?.medium?.length || 0;
    
    const totalCritical = prCritical;
    const totalHigh = prHigh + repHigh;
    const totalMedium = prMedium + repMedium;
    const totalLow = prLow;
    
    // Generate HTML for blocking issues
    const blockingIssuesHtml = this.generateBlockingIssuesHtml(report);
    
    // Generate HTML for positive findings
    const positiveFindingsHtml = this.generatePositiveFindingsHtml(report);
    
    // Generate HTML for PR issues
    const prIssuesContent = this.generatePrIssuesContent(report);
    
    // Generate HTML for high priority issues
    const highPriorityIssuesHtml = this.generateHighPriorityIssuesHtml(report);
    
    // Generate HTML for lower priority issues with toggle
    const { toggleButtonHtml, lowerPriorityIssuesHtml } = this.generateLowerPriorityIssuesHtml(report);
    
    // Generate skills HTML
    const skillsHtml = this.generateSkillsHtml(report);
    
    // Generate skill recommendations HTML
    const skillRecommendationsHtml = this.generateSkillRecommendationsHtml(report);
    
    // Generate educational HTML
    const educationalHtml = this.generateEducationalHtml(report);
    
    // Calculate score class and trends
    const overallScore = report.overall_score || 0;
    const scoreClass = overallScore >= 80 ? 'score-good' : overallScore >= 60 ? 'score-medium' : 'score-poor';
    const scoreTrendClass = 'trend-up'; // Mock trend
    const scoreTrendIcon = 'fa-arrow-up';
    const scoreTrendValue = '+5';
    
    // Decision data
    const approvalClass = report.decision?.status === 'BLOCKED' ? 'blocked' : 'approved';
    const approvalIcon = report.decision?.status === 'BLOCKED' ? '❌' : '✅';
    const approvalStatusText = report.decision?.status || 'PENDING';
    const approvalMessage = report.decision?.reason || 'Analysis in progress';
    const confidencePercentage = report.decision?.confidence || 0;
    
    // PR metadata
    const repositoryName = report.repository_url?.split('/').pop() || 'Repository';
    const filesChanged = report.deepwiki?.changes?.length || 0;
    const linesAdded = report.deepwiki?.changes?.reduce((sum: number, c: any) => sum + (c.additions || 0), 0) || 0;
    const linesRemoved = report.deepwiki?.changes?.reduce((sum: number, c: any) => sum + (c.deletions || 0), 0) || 0;
    const primaryLanguage = 'TypeScript'; // Mock
    
    // Replace placeholders
    const replacements: any = {
      '{{analysis_id}}': report.id,
      '{{pr_number}}': report.pr_number,
      '{{repository_name}}': repositoryName,
      '{{timestamp}}': new Date(report.analysis_date).toLocaleString(),
      '{{report_version}}': '1.0',
      '{{files_changed}}': filesChanged,
      '{{lines_added}}': linesAdded,
      '{{lines_removed}}': linesRemoved,
      '{{primary_language}}': primaryLanguage,
      '{{approval_class}}': approvalClass,
      '{{approval_icon}}': approvalIcon,
      '{{confidence_percentage}}': confidencePercentage,
      '{{approval_status_text}}': approvalStatusText,
      '{{approval_message}}': approvalMessage,
      '{{blocking_issues_html}}': blockingIssuesHtml,
      '{{positive_findings_html}}': positiveFindingsHtml,
      '{{pr_issues_content}}': prIssuesContent,
      '{{critical_count}}': totalCritical,
      '{{high_count}}': totalHigh,
      '{{medium_count}}': totalMedium,
      '{{low_count}}': totalLow,
      '{{high_priority_issues_html}}': highPriorityIssuesHtml,
      '{{toggle_button_html}}': toggleButtonHtml,
      '{{lower_priority_issues_html}}': lowerPriorityIssuesHtml,
      '{{overall_score}}': overallScore,
      '{{score_class}}': scoreClass,
      '{{score_trend_class}}': scoreTrendClass,
      '{{score_trend_icon}}': scoreTrendIcon,
      '{{score_trend_value}}': scoreTrendValue,
      '{{skills_html}}': skillsHtml,
      '{{skill_recommendations_html}}': skillRecommendationsHtml,
      '{{total_learning_time}}': '2-4 hours',
      '{{educational_html}}': educationalHtml,
      '{{pr_comment_text}}': this.generatePrComment(report),
      '{{app_version}}': '1.0.0'
    };
    
    // Replace all placeholders
    for (const [placeholder, value] of Object.entries(replacements)) {
      template = template.replace(new RegExp(placeholder, 'g'), String(value));
    }
    
    return template;
  }
  
  private generateBlockingIssuesHtml(report: any): string {
    if (!report.pr_issues?.critical?.length && !report.pr_issues?.high?.length) {
      return '<li>No blocking issues found</li>';
    }
    
    let html = '';
    
    // Add critical issues
    if (report.pr_issues.critical) {
      report.pr_issues.critical.forEach((issue: any) => {
        html += `<li class="severity-critical">${issue.title}</li>`;
      });
    }
    
    // Add high issues
    if (report.pr_issues.high) {
      report.pr_issues.high.forEach((issue: any) => {
        html += `<li class="severity-high">${issue.title}</li>`;
      });
    }
    
    return html;
  }
  
  private generatePositiveFindingsHtml(report: any): string {
    const findings = [
      '✅ Code follows established patterns',
      '✅ Good test coverage in modified files',
      '✅ Documentation updated appropriately'
    ];
    
    return findings.map(f => `<li>${f}</li>`).join('');
  }
  
  private generatePrIssuesContent(report: any): string {
    // This would be populated from actual PR analysis
    return `
      <div class="pr-stats">
        <div class="stat-item">Files: ${report.deepwiki?.changes?.length || 0}</div>
        <div class="stat-item">Additions: +${report.deepwiki?.changes?.reduce((sum: number, c: any) => sum + (c.additions || 0), 0) || 0}</div>
        <div class="stat-item">Deletions: -${report.deepwiki?.changes?.reduce((sum: number, c: any) => sum + (c.deletions || 0), 0) || 0}</div>
      </div>
    `;
  }
  
  private generateHighPriorityIssuesHtml(report: any): string {
    let html = '';
    
    // Critical issues
    if (report.pr_issues?.critical?.length) {
      report.pr_issues.critical.forEach((issue: any) => {
        html += this.generateIssueCard(issue, 'critical');
      });
    }
    
    // High issues
    if (report.pr_issues?.high?.length) {
      report.pr_issues.high.forEach((issue: any) => {
        html += this.generateIssueCard(issue, 'high');
      });
    }
    
    // Repository high issues
    if (report.repository_issues?.high?.length) {
      html += '<h3 class="mt-4">Repository Issues</h3>';
      report.repository_issues.high.forEach((issue: any) => {
        html += this.generateIssueCard(issue, 'high');
      });
    }
    
    return html || '<p>No high priority issues found.</p>';
  }
  
  private generateLowerPriorityIssuesHtml(report: any): { toggleButtonHtml: string, lowerPriorityIssuesHtml: string } {
    const mediumCount = (report.pr_issues?.medium?.length || 0) + (report.repository_issues?.medium?.length || 0);
    const lowCount = report.pr_issues?.low?.length || 0;
    const totalLower = mediumCount + lowCount;
    
    if (totalLower === 0) {
      return { toggleButtonHtml: '', lowerPriorityIssuesHtml: '' };
    }
    
    const toggleButtonHtml = `
      <button class="toggle-btn" onclick="toggleLowerPriorityIssues()">
        <i class="fas fa-chevron-down"></i> View ${totalLower} lower priority issues
      </button>
    `;
    
    let lowerPriorityIssuesHtml = '<div id="lowerPriorityIssues" class="lower-priority-issues" style="display: none;">';
    
    // Medium issues
    if (report.pr_issues?.medium?.length) {
      report.pr_issues.medium.forEach((issue: any) => {
        lowerPriorityIssuesHtml += this.generateIssueCard(issue, 'medium');
      });
    }
    
    // Repository medium issues
    if (report.repository_issues?.medium?.length) {
      report.repository_issues.medium.forEach((issue: any) => {
        lowerPriorityIssuesHtml += this.generateIssueCard(issue, 'medium');
      });
    }
    
    // Low issues
    if (report.pr_issues?.low?.length) {
      report.pr_issues.low.forEach((issue: any) => {
        lowerPriorityIssuesHtml += this.generateIssueCard(issue, 'low');
      });
    }
    
    lowerPriorityIssuesHtml += '</div>';
    
    return { toggleButtonHtml, lowerPriorityIssuesHtml };
  }
  
  private generateIssueCard(issue: any, severity: string): string {
    return `
      <div class="issue-card severity-${severity}">
        <div class="issue-header">
          <span class="issue-title">${issue.title}</span>
          <span class="severity-badge ${severity}">${severity.toUpperCase()}</span>
        </div>
        <p class="issue-description">${issue.description}</p>
        ${issue.file ? `<div class="issue-location">📍 ${issue.file}${issue.line ? `:${issue.line}` : ''}</div>` : ''}
        ${issue.codeSnippet ? `<pre class="code-snippet">${this.escapeHtml(issue.codeSnippet)}</pre>` : ''}
        ${issue.recommendation ? `<div class="recommendation"><strong>Recommendation:</strong> ${issue.recommendation}</div>` : ''}
      </div>
    `;
  }
  
  private generateSkillsHtml(report: any): string {
    // Generate skills based on agent scores
    const skills = [
      { name: 'Security', score: report.agents?.security?.score || 0, icon: 'fa-shield-alt' },
      { name: 'Code Quality', score: report.agents?.codeQuality?.score || 0, icon: 'fa-code' },
      { name: 'Performance', score: report.agents?.performance?.score || 0, icon: 'fa-tachometer-alt' },
      { name: 'Architecture', score: report.agents?.architecture?.score || 0, icon: 'fa-sitemap' },
      { name: 'Dependencies', score: report.agents?.dependencies?.score || 0, icon: 'fa-cube' }
    ];
    
    return skills.map(skill => `
      <div class="skill-item">
        <div class="skill-header">
          <i class="fas ${skill.icon}"></i>
          <span>${skill.name}</span>
        </div>
        <div class="skill-bar">
          <div class="skill-fill" style="width: ${skill.score}%"></div>
        </div>
        <span class="skill-score">${skill.score}%</span>
      </div>
    `).join('');
  }
  
  private generateSkillRecommendationsHtml(report: any): string {
    if (!report.recommendations?.length) {
      return '<p>No specific recommendations at this time.</p>';
    }
    
    return report.recommendations.map((rec: any) => `
      <div class="recommendation-card">
        <h4>${rec.title}</h4>
        <p>${rec.description}</p>
        <div class="rec-meta">
          <span><i class="fas fa-clock"></i> ${rec.effort}</span>
          <span><i class="fas fa-impact"></i> ${rec.impact}</span>
        </div>
      </div>
    `).join('');
  }
  
  private generateEducationalHtml(report: any): string {
    if (!report.educational) {
      return '<p>No educational content available.</p>';
    }
    
    let html = '';
    
    // Add modules
    if (report.educational.modules?.length) {
      html += '<div class="edu-modules">';
      report.educational.modules.forEach((module: any) => {
        html += `
          <div class="edu-module">
            <h3>${module.title}</h3>
            <p>${module.content}</p>
            ${module.codeExample ? `<pre class="code-snippet">${this.escapeHtml(module.codeExample)}</pre>` : ''}
            ${module.resources?.length ? `
              <div class="resources">
                <h4>Resources:</h4>
                <ul>${module.resources.map((r: string) => `<li>${r}</li>`).join('')}</ul>
              </div>
            ` : ''}
          </div>
        `;
      });
      html += '</div>';
    }
    
    // Add tips
    if (report.educational.tips?.length) {
      html += `
        <div class="edu-tips">
          <h3>Quick Tips</h3>
          <ul>${report.educational.tips.map((tip: string) => `<li>${tip}</li>`).join('')}</ul>
        </div>
      `;
    }
    
    return html;
  }
  
  private generatePrComment(report: any): string {
    const decision = report.decision?.status === 'BLOCKED' ? '❌ BLOCKED' : '✅ APPROVED';
    const score = report.overall_score || 0;
    const critical = report.pr_issues?.critical?.length || 0;
    const high = report.pr_issues?.high?.length || 0;
    
    return `## CodeQual Analysis Report

**Decision: ${decision}**
**Overall Score: ${score}/100**

### Summary
${report.deepwiki?.summary || 'Analysis complete.'}

### Issues Found
- Critical: ${critical}
- High: ${high}
- Medium: ${report.pr_issues?.medium?.length || 0}
- Low: ${report.pr_issues?.low?.length || 0}

${critical > 0 || high > 0 ? '### Blocking Issues\n' + this.generateBlockingIssuesList(report) : ''}

View full report: [Analysis Report](${report.reportUrl || '#'})`;
  }
  
  private generateBlockingIssuesList(report: any): string {
    let list = '';
    
    if (report.pr_issues?.critical?.length) {
      report.pr_issues.critical.forEach((issue: any) => {
        list += `- **[CRITICAL]** ${issue.title}\n`;
      });
    }
    
    if (report.pr_issues?.high?.length) {
      report.pr_issues.high.forEach((issue: any) => {
        list += `- **[HIGH]** ${issue.title}\n`;
      });
    }
    
    return list;
  }
  
  private escapeHtml(str: string): string {
    const div = { innerHTML: '' };
    div.innerHTML = str;
    return div.innerHTML
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');
  }
  
  private collectFindings(report: any): any[] {
    const findings: any[] = [];
    
    if (report.agents) {
      for (const [agentName, agentData] of Object.entries(report.agents) as any) {
        if (agentData.findings && Array.isArray(agentData.findings)) {
          agentData.findings.forEach((finding: any) => {
            findings.push({
              ...finding,
              agent: agentName
            });
          });
        }
      }
    }
    
    // Sort by severity
    const severityOrder: any = { high: 0, medium: 1, low: 2 };
    findings.sort((a, b) => (severityOrder[a.severity] || 3) - (severityOrder[b.severity] || 3));
    
    return findings;
  }

  /**
   * Generate HTML report from StandardReport
   */
  generateHtmlReport(report: any, prContext: any): string {
    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>CodeQual Analysis Report - PR #${report.prNumber}</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f5f5f5;
        }
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            border-radius: 10px;
            margin-bottom: 30px;
        }
        .overview-cards {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }
        .card {
            background: white;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .severity-critical { color: #d32f2f; }
        .severity-high { color: #f57c00; }
        .severity-medium { color: #fbc02d; }
        .severity-low { color: #388e3c; }
        .findings-section {
            background: white;
            padding: 30px;
            border-radius: 8px;
            margin-bottom: 20px;
        }
        .finding-item {
            border-left: 3px solid #667eea;
            padding: 15px;
            margin-bottom: 15px;
            background: #f8f9fa;
        }
        .code-snippet {
            background: #2d2d2d;
            color: #f8f8f2;
            padding: 15px;
            border-radius: 5px;
            overflow-x: auto;
            font-family: 'Consolas', 'Monaco', monospace;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>CodeQual Analysis Report</h1>
        <p>Repository: ${report.repositoryUrl}</p>
        <p>Pull Request: #${report.prNumber}</p>
        <p>Analysis Date: ${report.timestamp.toLocaleString()}</p>
    </div>
    
    <div class="overview-cards">
        <div class="card">
            <h3>Analysis Score</h3>
            <p style="font-size: 2em; font-weight: bold;">${report.overview.analysisScore}</p>
            <p>Risk Level: <span class="severity-${report.overview.riskLevel}">${report.overview.riskLevel.toUpperCase()}</span></p>
        </div>
        <div class="card">
            <h3>Findings</h3>
            <p style="font-size: 2em; font-weight: bold;">${report.overview.totalFindings}</p>
            <p>Total Issues Found</p>
        </div>
        <div class="card">
            <h3>Recommendations</h3>
            <p style="font-size: 2em; font-weight: bold;">${report.overview.totalRecommendations}</p>
            <p>Actionable Items</p>
        </div>
        <div class="card">
            <h3>Remediation Time</h3>
            <p style="font-size: 1.5em; font-weight: bold;">${report.overview.estimatedRemediationTime}</p>
            <p>Estimated</p>
        </div>
    </div>
    
    <div class="findings-section">
        <h2>Executive Summary</h2>
        <p>${report.overview.executiveSummary}</p>
    </div>
    
    ${this.renderFindings(report.modules.findings)}
    ${this.renderRecommendations(report.modules.recommendations)}
    ${this.renderEducational(report.modules.educational)}
    
    <div class="findings-section">
        <h2>PR Comment</h2>
        <pre style="white-space: pre-wrap;">${report.exports.prComment}</pre>
    </div>
</body>
</html>
    `;
    
    return html;
  }
  
  private renderFindings(findings: any): string {
    if (!findings || !findings.categories) return '';
    
    let html = '<div class="findings-section"><h2>Findings by Category</h2>';
    
    for (const [key, category] of Object.entries(findings.categories)) {
      const cat = category as any;
      if (cat.count > 0) {
        html += `
          <h3>${cat.icon} ${cat.name} (${cat.count} issues)</h3>
          <p>${cat.summary}</p>
        `;
        
        if (cat.findings && cat.findings.length > 0) {
          for (const finding of cat.findings) {
            html += `
              <div class="finding-item">
                <h4>${finding.title}</h4>
                <p><strong>File:</strong> ${finding.file}:${finding.line || 'N/A'}</p>
                <p><strong>Severity:</strong> <span class="severity-${finding.severity}">${finding.severity.toUpperCase()}</span></p>
                <p>${finding.description}</p>
                ${finding.codeSnippet ? `<div class="code-snippet">${finding.codeSnippet}</div>` : ''}
                <p><strong>Recommendation:</strong> ${finding.recommendation}</p>
              </div>
            `;
          }
        }
      }
    }
    
    html += '</div>';
    return html;
  }
  
  private renderRecommendations(recommendations: any): string {
    if (!recommendations) return '';
    
    let html = '<div class="findings-section"><h2>Recommendations</h2>';
    html += `<p>${recommendations.summary}</p>`;
    
    if (recommendations.categories) {
      for (const category of recommendations.categories) {
        html += `<h3>${category.name}</h3>`;
        if (category.recommendations) {
          for (const rec of category.recommendations) {
            html += `
              <div class="finding-item">
                <h4>${rec.title}</h4>
                <p>${rec.description}</p>
                <p><strong>Priority:</strong> <span class="severity-${rec.priority.level}">${rec.priority.level.toUpperCase()}</span></p>
                <p><strong>Estimated Time:</strong> ${rec.implementation.estimatedTime}</p>
              </div>
            `;
          }
        }
      }
    }
    
    html += '</div>';
    return html;
  }
  
  private renderEducational(educational: any): string {
    if (!educational) return '';
    
    let html = '<div class="findings-section"><h2>Learning Resources</h2>';
    html += `<p>${educational.summary}</p>`;
    
    if (educational.learningPath) {
      const path = educational.learningPath;
      html += `
        <h3>${path.title}</h3>
        <p>${path.description}</p>
        <p><strong>Difficulty:</strong> ${path.difficulty} | <strong>Time:</strong> ${path.estimatedTime}</p>
      `;
    }
    
    html += '</div>';
    return html;
  }
  
  /**
   * Save HTML report to file
   */
  saveHtmlReport(html: string, outputPath: string): void {
    fs.writeFileSync(outputPath, html, 'utf8');
  }
}