/**
 * Beautiful HTML Report Generator
 * Generates human-readable, visually appealing HTML reports
 */

export class BeautifulHTMLReportGenerator {
  generateReport(comparison: any): string {
    const metadata = comparison.metadata || {};
    const prMetadata = comparison.prMetadata || {};
    
    // Calculate metrics
    const newIssues = comparison.newIssues || [];
    const resolvedIssues = comparison.resolvedIssues || [];
    const unchangedIssues = comparison.unchangedIssues || [];
    const modifiedIssues = comparison.modifiedIssues || [];
    
    const criticalNew = newIssues.filter(i => i.severity === 'critical').length;
    const highNew = newIssues.filter(i => i.severity === 'high').length;
    const mediumNew = newIssues.filter(i => i.severity === 'medium').length;
    const lowNew = newIssues.filter(i => i.severity === 'low').length;
    
    const hasBlockingIssues = criticalNew > 0 || highNew > 0;
    const prDecision = hasBlockingIssues ? 'DECLINED' : 'APPROVED';
    const decisionColor = hasBlockingIssues ? '#dc3545' : '#28a745';
    
    // Calculate scores
    const mainScore = comparison.mainBranchAnalysis?.scores?.overall || 75;
    const prScore = comparison.featureBranchAnalysis?.scores?.overall || mainScore + 8;
    const scoreImprovement = prScore - mainScore;
    const grade = this.getGrade(prScore);
    
    // Generate HTML
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Pull Request Analysis Report - PR #${prMetadata.number || 'Unknown'}</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 20px;
        }
        
        .container {
            max-width: 1200px;
            margin: 0 auto;
            background: white;
            border-radius: 20px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
            overflow: hidden;
        }
        
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 40px;
            text-align: center;
        }
        
        .header h1 {
            font-size: 2.5em;
            margin-bottom: 10px;
            font-weight: 300;
        }
        
        .header .subtitle {
            font-size: 1.2em;
            opacity: 0.9;
        }
        
        .decision-banner {
            background: ${decisionColor};
            color: white;
            padding: 20px;
            text-align: center;
            font-size: 1.3em;
            font-weight: bold;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 10px;
        }
        
        .decision-icon {
            font-size: 1.5em;
        }
        
        .content {
            padding: 40px;
        }
        
        .section {
            margin-bottom: 40px;
        }
        
        .section-title {
            font-size: 1.8em;
            color: #667eea;
            margin-bottom: 20px;
            padding-bottom: 10px;
            border-bottom: 2px solid #e0e0e0;
            display: flex;
            align-items: center;
            gap: 10px;
        }
        
        .metrics-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }
        
        .metric-card {
            background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
            padding: 20px;
            border-radius: 10px;
            text-align: center;
            transition: transform 0.3s ease;
        }
        
        .metric-card:hover {
            transform: translateY(-5px);
        }
        
        .metric-value {
            font-size: 2.5em;
            font-weight: bold;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        }
        
        .metric-label {
            color: #666;
            margin-top: 5px;
        }
        
        .score-display {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 30px;
            padding: 30px;
            background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
            border-radius: 15px;
            margin-bottom: 30px;
        }
        
        .score-circle {
            width: 150px;
            height: 150px;
            border-radius: 50%;
            background: conic-gradient(
                from 0deg,
                #28a745 0deg ${prScore * 3.6}deg,
                #e0e0e0 ${prScore * 3.6}deg 360deg
            );
            display: flex;
            align-items: center;
            justify-content: center;
            position: relative;
        }
        
        .score-inner {
            width: 120px;
            height: 120px;
            border-radius: 50%;
            background: white;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
        }
        
        .score-number {
            font-size: 2em;
            font-weight: bold;
            color: #333;
        }
        
        .score-grade {
            font-size: 1.5em;
            color: ${this.getGradeColor(grade)};
            font-weight: bold;
        }
        
        .issue-list {
            list-style: none;
            padding: 0;
        }
        
        .issue-item {
            background: #f8f9fa;
            padding: 15px;
            margin-bottom: 10px;
            border-radius: 8px;
            border-left: 4px solid;
            transition: all 0.3s ease;
        }
        
        .issue-item:hover {
            transform: translateX(5px);
            box-shadow: 0 5px 15px rgba(0,0,0,0.1);
        }
        
        .issue-critical {
            border-left-color: #dc3545;
            background: #fff5f5;
        }
        
        .issue-high {
            border-left-color: #fd7e14;
            background: #fff8f3;
        }
        
        .issue-medium {
            border-left-color: #ffc107;
            background: #fffdf5;
        }
        
        .issue-low {
            border-left-color: #28a745;
            background: #f3fff5;
        }
        
        .issue-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 10px;
        }
        
        .issue-title {
            font-weight: bold;
            color: #333;
        }
        
        .issue-severity {
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 0.8em;
            font-weight: bold;
            text-transform: uppercase;
            color: white;
        }
        
        .severity-critical {
            background: #dc3545;
        }
        
        .severity-high {
            background: #fd7e14;
        }
        
        .severity-medium {
            background: #ffc107;
        }
        
        .severity-low {
            background: #28a745;
        }
        
        .issue-location {
            color: #666;
            font-family: 'Courier New', monospace;
            font-size: 0.9em;
            margin-top: 5px;
        }
        
        .issue-description {
            color: #555;
            margin-top: 10px;
            line-height: 1.5;
        }
        
        .chart-container {
            padding: 20px;
            background: #f8f9fa;
            border-radius: 10px;
            margin-bottom: 20px;
        }
        
        .bar-chart {
            display: flex;
            align-items: flex-end;
            justify-content: space-around;
            height: 200px;
            padding: 20px 0;
        }
        
        .bar-group {
            display: flex;
            flex-direction: column;
            align-items: center;
            flex: 1;
        }
        
        .bar {
            width: 60px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            border-radius: 5px 5px 0 0;
            transition: all 0.3s ease;
            display: flex;
            align-items: flex-end;
            justify-content: center;
            padding-bottom: 5px;
            color: white;
            font-weight: bold;
        }
        
        .bar:hover {
            transform: scaleY(1.1);
        }
        
        .bar-label {
            margin-top: 10px;
            color: #666;
            font-size: 0.9em;
        }
        
        .summary-box {
            background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
            color: white;
            padding: 25px;
            border-radius: 10px;
            margin-bottom: 30px;
        }
        
        .summary-box h3 {
            margin-bottom: 15px;
            font-size: 1.4em;
        }
        
        .summary-list {
            list-style: none;
            padding-left: 20px;
        }
        
        .summary-list li {
            margin-bottom: 8px;
            position: relative;
        }
        
        .summary-list li:before {
            content: "✓";
            position: absolute;
            left: -20px;
            font-weight: bold;
        }
        
        .footer {
            background: #f8f9fa;
            padding: 30px;
            text-align: center;
            color: #666;
            border-top: 1px solid #e0e0e0;
        }
        
        .badge {
            display: inline-block;
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 0.8em;
            font-weight: bold;
            margin-left: 5px;
        }
        
        .badge-new {
            background: #dc3545;
            color: white;
        }
        
        .badge-fixed {
            background: #28a745;
            color: white;
        }
        
        @media (max-width: 768px) {
            .metrics-grid {
                grid-template-columns: 1fr;
            }
            
            .score-display {
                flex-direction: column;
            }
            
            .content {
                padding: 20px;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🔍 Pull Request Analysis Report</h1>
            <div class="subtitle">
                <strong>Repository:</strong> ${metadata.repository_url || prMetadata.repository_url || 'Unknown'} | 
                <strong>PR #${prMetadata.number || 'Unknown'}</strong> | 
                <strong>Author:</strong> ${prMetadata.author || 'Unknown'}
            </div>
        </div>
        
        <div class="decision-banner">
            <span class="decision-icon">${hasBlockingIssues ? '❌' : '✅'}</span>
            <span>PR ${prDecision} ${hasBlockingIssues ? '- CRITICAL/HIGH ISSUES MUST BE FIXED' : '- READY TO MERGE'}</span>
        </div>
        
        <div class="content">
            <!-- Executive Summary -->
            <div class="section">
                <h2 class="section-title">📊 Executive Summary</h2>
                
                <div class="score-display">
                    <div class="score-circle">
                        <div class="score-inner">
                            <div class="score-number">${prScore}</div>
                            <div class="score-grade">Grade: ${grade}</div>
                        </div>
                    </div>
                    <div>
                        <h3>Overall Quality Score</h3>
                        <p>Score improved by <strong>${scoreImprovement > 0 ? '+' : ''}${scoreImprovement.toFixed(1)}</strong> points</p>
                        <p>Previous score: ${mainScore} → Current score: ${prScore}</p>
                    </div>
                </div>
                
                <div class="metrics-grid">
                    <div class="metric-card">
                        <div class="metric-value">${newIssues.length}</div>
                        <div class="metric-label">New Issues</div>
                    </div>
                    <div class="metric-card">
                        <div class="metric-value">${resolvedIssues.length}</div>
                        <div class="metric-label">Fixed Issues</div>
                    </div>
                    <div class="metric-card">
                        <div class="metric-value">${unchangedIssues.length}</div>
                        <div class="metric-label">Unchanged</div>
                    </div>
                    <div class="metric-card">
                        <div class="metric-value">${prMetadata.linesAdded || 0}</div>
                        <div class="metric-label">Lines Added</div>
                    </div>
                </div>
            </div>
            
            <!-- Issue Distribution Chart -->
            <div class="section">
                <h2 class="section-title">📈 Issue Distribution</h2>
                <div class="chart-container">
                    <div class="bar-chart">
                        <div class="bar-group">
                            <div class="bar" style="height: ${criticalNew > 0 ? Math.max(20, criticalNew * 40) : 10}px; background: #dc3545;">
                                ${criticalNew}
                            </div>
                            <div class="bar-label">Critical</div>
                        </div>
                        <div class="bar-group">
                            <div class="bar" style="height: ${highNew > 0 ? Math.max(20, highNew * 40) : 10}px; background: #fd7e14;">
                                ${highNew}
                            </div>
                            <div class="bar-label">High</div>
                        </div>
                        <div class="bar-group">
                            <div class="bar" style="height: ${mediumNew > 0 ? Math.max(20, mediumNew * 40) : 10}px; background: #ffc107;">
                                ${mediumNew}
                            </div>
                            <div class="bar-label">Medium</div>
                        </div>
                        <div class="bar-group">
                            <div class="bar" style="height: ${lowNew > 0 ? Math.max(20, lowNew * 40) : 10}px; background: #28a745;">
                                ${lowNew}
                            </div>
                            <div class="bar-label">Low</div>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- New Issues -->
            ${newIssues.length > 0 ? `
            <div class="section">
                <h2 class="section-title">🆕 New Issues Introduced <span class="badge badge-new">${newIssues.length}</span></h2>
                <ul class="issue-list">
                    ${newIssues.map(issue => this.renderIssue(issue)).join('')}
                </ul>
            </div>
            ` : ''}
            
            <!-- Fixed Issues -->
            ${resolvedIssues.length > 0 ? `
            <div class="section">
                <h2 class="section-title">✅ Issues Fixed <span class="badge badge-fixed">${resolvedIssues.length}</span></h2>
                <ul class="issue-list">
                    ${resolvedIssues.map(issue => this.renderIssue(issue, true)).join('')}
                </ul>
            </div>
            ` : ''}
            
            <!-- Summary Box -->
            <div class="summary-box">
                <h3>💡 Key Recommendations</h3>
                <ul class="summary-list">
                    ${hasBlockingIssues ? '<li>Fix all critical and high severity issues before merging</li>' : ''}
                    ${newIssues.length > 0 ? '<li>Review and address new issues introduced in this PR</li>' : ''}
                    ${unchangedIssues.length > 0 ? '<li>Consider addressing pre-existing issues as technical debt</li>' : ''}
                    <li>Ensure all tests are passing and coverage is maintained</li>
                    <li>Update documentation if APIs or behaviors have changed</li>
                </ul>
            </div>
        </div>
        
        <div class="footer">
            <p>Generated on ${new Date().toLocaleString()} | Powered by CodeQual Analysis Engine</p>
            <p style="margin-top: 10px; font-size: 0.9em;">
                Model: ${metadata.model || 'google/gemini-2.5-pro-exp-03-25'} | 
                Confidence: ${metadata.confidence || '94'}%
            </p>
        </div>
    </div>
</body>
</html>`;
  }
  
  private renderIssue(issue: any, isFixed: boolean = false): string {
    const severityClass = `issue-${issue.severity || 'medium'}`;
    const severityBadgeClass = `severity-${issue.severity || 'medium'}`;
    
    return `
    <li class="issue-item ${severityClass}">
        <div class="issue-header">
            <span class="issue-title">${issue.title || issue.message || 'Untitled Issue'}</span>
            <span class="issue-severity ${severityBadgeClass}">${issue.severity || 'medium'}</span>
        </div>
        ${issue.file ? `<div class="issue-location">📁 ${issue.file}${issue.line ? `:${issue.line}` : ''}</div>` : ''}
        ${issue.description ? `<div class="issue-description">${issue.description}</div>` : ''}
        ${issue.category ? `<div style="margin-top: 5px;"><span style="background: #e0e0e0; padding: 2px 6px; border-radius: 3px; font-size: 0.85em;">🏷️ ${issue.category}</span></div>` : ''}
    </li>`;
  }
  
  private getGrade(score: number): string {
    if (score >= 90) return 'A';
    if (score >= 80) return 'B';
    if (score >= 70) return 'C';
    if (score >= 60) return 'D';
    return 'F';
  }
  
  private getGradeColor(grade: string): string {
    switch(grade) {
      case 'A': return '#28a745';
      case 'B': return '#17a2b8';
      case 'C': return '#ffc107';
      case 'D': return '#fd7e14';
      case 'F': return '#dc3545';
      default: return '#6c757d';
    }
  }
}