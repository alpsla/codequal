import { StandardReport } from '@codequal/agents';
import * as fs from 'fs';
import * as path from 'path';

export class HtmlReportGenerator {
  /**
   * Generate HTML report from StandardReport
   */
  generateHtmlReport(report: StandardReport, prContext: any): string {
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