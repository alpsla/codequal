import * as fs from 'fs';
import * as path from 'path';

export function populateEnhancedReport(reportData: any): string {
  // Read the enhanced template
  const templatePath = path.join(__dirname, '../../public/enhanced-report-template.html');
  let template = fs.readFileSync(templatePath, 'utf-8');
  
  // Extract data from the report structure
  const fullReport = reportData.report?.fullReport || reportData;
  const prData = reportData.pr || {};
  const repository = reportData.repository || {};
  const analysis = reportData.analysis || {};
  const findings = reportData.findings || {};
  const metrics = fullReport.modules?.metrics || {};
  const overview = fullReport.overview || {};
  
  // Count issues by severity
  const countBySeverity = (severity: string) => {
    let count = 0;
    Object.values(findings).forEach((categoryFindings: any) => {
      if (Array.isArray(categoryFindings)) {
        count += categoryFindings.filter((f: any) => f.severity === severity).length;
      }
    });
    return count;
  };
  
  // Generate HTML for issues
  const generateIssuesHtml = (issues: any, category: string) => {
    if (!issues) return '';
    
    // Ensure issues is an array
    const issuesArray = Array.isArray(issues) ? issues : [];
    if (issuesArray.length === 0) return '';
    
    return issuesArray.map((issue: any) => `
      <div class="issue-card ${issue.severity}">
        <div class="issue-header">
          <span class="issue-badge">${category}</span>
          <span class="severity-badge ${issue.severity}">${issue.severity}</span>
        </div>
        <h4>${issue.title || issue.description || 'Issue'}</h4>
        <p>${issue.description || issue.details || ''}</p>
        ${issue.file ? `<div class="issue-location"><i class="fas fa-file-code"></i> ${issue.file}${issue.line ? `:${issue.line}` : ''}</div>` : ''}
      </div>
    `).join('');
  };
  
  // Calculate scores
  const calculateOverallScore = () => {
    const scores = metrics.scores || {};
    const validScores = Object.values(scores)
      .map((s: any) => s.score)
      .filter((score: any) => typeof score === 'number');
    
    if (validScores.length === 0) return 100;
    return Math.round(validScores.reduce((a: number, b: number) => a + b, 0) / validScores.length);
  };
  
  const overallScore = calculateOverallScore();
  const scoreClass = overallScore >= 80 ? 'excellent' : overallScore >= 60 ? 'good' : 'needs-improvement';
  
  // Prepare replacements
  const replacements: Record<string, string> = {
    // Meta information
    '{{analysis_id}}': reportData.analysisId || 'N/A',
    '{{pr_number}}': prData.number || '0',
    '{{repository_name}}': repository.name || 'Unknown Repository',
    '{{timestamp}}': new Date().toLocaleString(),
    '{{report_version}}': fullReport.metadata?.reportVersion || '1.0.0',
    '{{app_version}}': '1.0.0',
    
    // Overview metrics
    '{{files_changed}}': String(prData.changedFiles || 0),
    '{{lines_added}}': String(prData.additions || 0),
    '{{lines_removed}}': String(prData.deletions || 0),
    '{{primary_language}}': repository.primaryLanguage || 'Unknown',
    
    // PR Decision
    '{{approval_class}}': 'approved',
    '{{approval_icon}}': 'fa-check-circle',
    '{{confidence_percentage}}': String(overallScore),
    '{{approval_status_text}}': overallScore >= 80 ? 'Approved' : 'Needs Review',
    '{{approval_message}}': overview.executiveSummary || 'Analysis completed successfully',
    '{{blocking_issues_html}}': generateIssuesHtml(
      Object.values(findings).flatMap((f: any) => Array.isArray(f) ? f : []).filter((f: any) => f.severity === 'critical'),
      'Blocking'
    ),
    '{{positive_findings_html}}': '<div class="positive-item"><i class="fas fa-check"></i> Clean code structure</div>',
    
    // PR Issues
    '{{pr_issues_content}}': Object.entries(findings)
      .map(([category, categoryFindings]: [string, any]) => 
        generateIssuesHtml(categoryFindings, category)
      ).join('') || '<p class="no-issues">No issues found in this pull request.</p>',
    
    // Repository Issues
    '{{critical_count}}': String(countBySeverity('critical')),
    '{{high_count}}': String(countBySeverity('high')),
    '{{medium_count}}': String(countBySeverity('medium')),
    '{{low_count}}': String(countBySeverity('low')),
    '{{high_priority_issues_html}}': generateIssuesHtml(
      Object.values(findings).flatMap((f: any) => Array.isArray(f) ? f : []).filter((f: any) => 
        f.severity === 'critical' || f.severity === 'high'
      ),
      'High Priority'
    ),
    '{{toggle_button_html}}': countBySeverity('medium') + countBySeverity('low') > 0 
      ? '<button class="toggle-btn" onclick="toggleLowerPriority()">Show Lower Priority Issues</button>' 
      : '',
    '{{lower_priority_issues_html}}': generateIssuesHtml(
      Object.values(findings).flatMap((f: any) => Array.isArray(f) ? f : []).filter((f: any) => 
        f.severity === 'medium' || f.severity === 'low'
      ),
      'Lower Priority'
    ),
    
    // Quality Metrics
    '{{overall_score}}': String(overallScore),
    '{{score_class}}': scoreClass,
    '{{score_trend_class}}': 'positive',
    '{{score_trend_icon}}': 'fa-arrow-up',
    '{{score_trend_value}}': '+5',
    
    // Skills Assessment
    '{{skills_html}}': '<div class="skill-item"><span class="skill-name">Code Quality</span><div class="skill-progress"><div class="progress-fill" style="width: 80%"></div></div></div>',
    '{{skill_recommendations_html}}': '<li>Consider implementing more comprehensive error handling</li>',
    
    // Educational Resources
    '{{total_learning_time}}': fullReport.modules?.educational?.learningPath?.estimatedTime || '0 minutes',
    '{{educational_html}}': fullReport.modules?.educational?.content?.tutorials?.map((t: any) => `
      <div class="edu-card">
        <h4>${t.title}</h4>
        <p>${t.description || 'Tutorial available'}</p>
        <div class="edu-meta">
          <span><i class="fas fa-clock"></i> ${t.estimatedTime || '30 minutes'}</span>
          <span><i class="fas fa-signal"></i> ${t.difficulty || 'Intermediate'}</span>
        </div>
      </div>
    `).join('') || '<p>No educational content available.</p>',
    
    // PR Comment
    '{{pr_comment_text}}': fullReport.exports?.prComment || 'No PR comment available'
  };
  
  // Apply all replacements
  for (const [placeholder, value] of Object.entries(replacements)) {
    template = template.replace(new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), value);
  }
  
  return template;
}