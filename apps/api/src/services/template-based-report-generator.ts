import * as path from 'path';
import * as fs from 'fs';

/**
 * Generate a test report using templates
 */
export async function generateTestReport(): Promise<string> {
  // Mock data for testing
  const templateData = {
    repositoryName: 'Test Repository',
    prNumber: '123',
    analysisDate: new Date().toLocaleDateString(),
    
    overview: {
      score: 75,
      findings: 12,
      criticalIssues: 2,
      recommendations: 8
    },
    
    findings: [
      {
        severity: 'critical',
        title: 'Security Vulnerability',
        description: 'SQL injection vulnerability detected',
        file: 'src/controllers/user.js',
        line: 42,
        recommendation: 'Use parameterized queries'
      },
      {
        severity: 'high',
        title: 'Performance Issue',
        description: 'N+1 query problem detected',
        file: 'src/services/data.js',
        line: 156,
        recommendation: 'Use eager loading or batch queries'
      }
    ],
    
    recommendations: [
      {
        priority: 'high',
        title: 'Fix Security Issues',
        description: 'Address critical security vulnerabilities immediately',
        estimatedTime: '2 hours'
      },
      {
        priority: 'medium',
        title: 'Optimize Database Queries',
        description: 'Improve query performance to reduce response times',
        estimatedTime: '4 hours'
      }
    ]
  };
  
  // Generate HTML from template
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>CodeQual Analysis Report - ${templateData.repositoryName}</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f5f7fa;
        }
        .header {
            background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
            color: white;
            padding: 40px;
            border-radius: 12px;
            margin-bottom: 30px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        }
        .header h1 {
            margin: 0 0 10px 0;
            font-size: 2.5em;
        }
        .header p {
            margin: 5px 0;
            opacity: 0.9;
        }
        .metrics-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            margin-bottom: 40px;
        }
        .metric-card {
            background: white;
            padding: 25px;
            border-radius: 10px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.08);
            text-align: center;
            transition: transform 0.2s;
        }
        .metric-card:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 8px rgba(0,0,0,0.12);
        }
        .metric-value {
            font-size: 3em;
            font-weight: bold;
            margin: 10px 0;
        }
        .metric-label {
            color: #666;
            font-size: 0.9em;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        .section {
            background: white;
            padding: 30px;
            border-radius: 10px;
            margin-bottom: 20px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.08);
        }
        .section h2 {
            color: #1a202c;
            border-bottom: 2px solid #e2e8f0;
            padding-bottom: 10px;
            margin-bottom: 20px;
        }
        .finding-item, .recommendation-item {
            border-left: 4px solid #6366f1;
            padding: 15px 20px;
            margin-bottom: 15px;
            background: #f8fafc;
            border-radius: 0 8px 8px 0;
        }
        .severity-critical {
            border-left-color: #ef4444;
            background-color: #fef2f2;
        }
        .severity-high {
            border-left-color: #f59e0b;
            background-color: #fffbeb;
        }
        .severity-medium {
            border-left-color: #3b82f6;
            background-color: #eff6ff;
        }
        .severity-low {
            border-left-color: #10b981;
            background-color: #f0fdf4;
        }
        .badge {
            display: inline-block;
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 0.75em;
            font-weight: 600;
            text-transform: uppercase;
        }
        .badge-critical { background-color: #ef4444; color: white; }
        .badge-high { background-color: #f59e0b; color: white; }
        .badge-medium { background-color: #3b82f6; color: white; }
        .badge-low { background-color: #10b981; color: white; }
        .code-location {
            font-family: 'Consolas', 'Monaco', monospace;
            font-size: 0.9em;
            color: #64748b;
            margin: 5px 0;
        }
        .recommendation {
            background: #e0e7ff;
            color: #4338ca;
            padding: 10px 15px;
            border-radius: 6px;
            margin-top: 10px;
            font-size: 0.95em;
        }
        .score-indicator {
            display: inline-block;
            width: 120px;
            height: 120px;
            border-radius: 50%;
            background: conic-gradient(#10b981 0deg, #10b981 ${templateData.overview.score * 3.6}deg, #e5e7eb ${templateData.overview.score * 3.6}deg);
            position: relative;
            margin: 20px auto;
        }
        .score-indicator::before {
            content: '${templateData.overview.score}';
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: white;
            width: 90px;
            height: 90px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 2em;
            font-weight: bold;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>CodeQual Analysis Report</h1>
        <p><strong>Repository:</strong> ${templateData.repositoryName}</p>
        <p><strong>Pull Request:</strong> #${templateData.prNumber}</p>
        <p><strong>Analysis Date:</strong> ${templateData.analysisDate}</p>
    </div>
    
    <div class="metrics-grid">
        <div class="metric-card">
            <div class="metric-label">Quality Score</div>
            <div class="score-indicator"></div>
        </div>
        <div class="metric-card">
            <div class="metric-label">Total Findings</div>
            <div class="metric-value">${templateData.overview.findings}</div>
            <div class="metric-label">Issues Detected</div>
        </div>
        <div class="metric-card">
            <div class="metric-label">Critical Issues</div>
            <div class="metric-value" style="color: #ef4444;">${templateData.overview.criticalIssues}</div>
            <div class="metric-label">Require Immediate Attention</div>
        </div>
        <div class="metric-card">
            <div class="metric-label">Recommendations</div>
            <div class="metric-value" style="color: #6366f1;">${templateData.overview.recommendations}</div>
            <div class="metric-label">Improvement Suggestions</div>
        </div>
    </div>
    
    <div class="section">
        <h2>Findings</h2>
        ${templateData.findings.map(finding => `
            <div class="finding-item severity-${finding.severity}">
                <h3>
                    ${finding.title}
                    <span class="badge badge-${finding.severity}">${finding.severity}</span>
                </h3>
                <p>${finding.description}</p>
                <p class="code-location">📍 ${finding.file}:${finding.line}</p>
                <div class="recommendation">
                    💡 <strong>Recommendation:</strong> ${finding.recommendation}
                </div>
            </div>
        `).join('')}
    </div>
    
    <div class="section">
        <h2>Recommendations</h2>
        ${templateData.recommendations.map(rec => `
            <div class="recommendation-item">
                <h3>
                    ${rec.title}
                    <span class="badge badge-${rec.priority}">${rec.priority} priority</span>
                </h3>
                <p>${rec.description}</p>
                <p><strong>Estimated Time:</strong> ${rec.estimatedTime}</p>
            </div>
        `).join('')}
    </div>
    
    <div class="section" style="text-align: center; color: #64748b;">
        <p>Generated by CodeQual Analysis Engine</p>
        <p>For more information, visit <a href="https://codequal.ai" style="color: #6366f1;">codequal.ai</a></p>
    </div>
</body>
</html>
  `;
  
  return html;
}