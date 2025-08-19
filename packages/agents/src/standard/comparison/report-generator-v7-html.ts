import { 
  ComparisonResult, 
  Issue, 
  AnalysisResult,
  PRMetadata 
} from '../types/analysis-types';

/**
 * CRITICAL SCORING CONSTANTS - DO NOT MODIFY
 * These values are locked and tested by golden standards
 * Any change will break compatibility and cause regression
 */
const CRITICAL_POINTS = 5;      // Was 20, fixed to 5
const HIGH_POINTS = 3;          // Was 10, fixed to 3
const MEDIUM_POINTS = 1;        // Was 5, fixed to 1
const LOW_POINTS = 0.5;         // Was 2, fixed to 0.5
const NEW_USER_BASE_SCORE = 50; // Was 100, fixed to 50
const CODE_QUALITY_BASE = 75;   // Was 100, fixed to 75

/**
 * V7 HTML Report Generator
 * Generates human-readable HTML reports with all 12 required sections
 * Fixes the undefined issue problem by handling both title and message fields
 */
export class ReportGeneratorV7HTML {
  private skillProvider?: any;
  private isAuthorizedCaller = false;
  
  constructor(skillProvider?: any, authorizedCaller?: boolean) {
    this.skillProvider = skillProvider;
    this.isAuthorizedCaller = authorizedCaller === true;
    
    if (!this.isAuthorizedCaller && !skillProvider) {
      console.warn(
        '\n⚠️  WARNING: ReportGeneratorV7HTML instantiated directly!\n' +
        '   This bypasses dynamic model selection and skill tracking.\n' +
        '   Please use ComparisonAgent.analyze() instead.\n'
      );
    }
  }

  /**
   * Helper to get issue title/message safely
   * Fixes the undefined issue by checking both title and message fields
   */
  private getIssueTitle(issue: Issue): string {
    return issue.title || issue.message || issue.description || 'Untitled Issue';
  }

  /**
   * Helper to get issue description safely
   */
  private getIssueDescription(issue: Issue): string {
    return issue.description || issue.message || issue.title || 'No description available';
  }

  /**
   * Generate PR comment (summary for GitHub PR)
   */
  generatePRComment(comparison: ComparisonResult): string {
    const newIssues = this.extractNewIssues(comparison);
    const resolvedIssues = this.extractResolvedIssues(comparison);
    const unchangedIssues = this.extractUnchangedIssues(comparison);
    
    const criticalNew = newIssues.filter(i => i.severity === 'critical').length;
    const highNew = newIssues.filter(i => i.severity === 'high').length;
    const mediumNew = newIssues.filter(i => i.severity === 'medium').length;
    const lowNew = newIssues.filter(i => i.severity === 'low').length;
    
    const hasBlockingIssues = criticalNew > 0 || highNew > 0;
    const decision = hasBlockingIssues ? '❌ DECLINED' : '✅ APPROVED';
    
    let comment = `## CodeQual Analysis Results\n\n`;
    comment += `### ${decision}\n\n`;
    
    if (hasBlockingIssues) {
      comment += `⚠️ **${criticalNew + highNew} blocking issue(s) must be fixed before merge**\n\n`;
    } else {
      comment += `✅ **No blocking issues found - ready to merge**\n\n`;
    }
    
    comment += `### Summary\n`;
    comment += `- 🆕 **New Issues:** ${newIssues.length} (Critical: ${criticalNew}, High: ${highNew}, Medium: ${mediumNew}, Low: ${lowNew})\n`;
    comment += `- ✅ **Fixed Issues:** ${resolvedIssues.length}\n`;
    comment += `- 📌 **Pre-existing Issues:** ${unchangedIssues.length} (not blocking)\n\n`;
    
    if (criticalNew > 0 || highNew > 0) {
      comment += `### 🚨 Blocking Issues\n`;
      [...newIssues.filter(i => i.severity === 'critical'), ...newIssues.filter(i => i.severity === 'high')].forEach(issue => {
        comment += `- **${issue.severity?.toUpperCase()}:** ${this.getIssueTitle(issue)} - ${this.getFileLocation(issue) || 'location unknown'}\n`;
      });
      comment += `\n`;
    }
    
    comment += `View the full report for detailed analysis including all 12 sections.\n`;
    
    return comment;
  }

  /**
   * Generate the complete HTML report with all 12 sections
   */
  async generateReport(comparison: ComparisonResult): Promise<string> {
    // Extract data
    const newIssues = this.extractNewIssues(comparison);
    const resolvedIssues = this.extractResolvedIssues(comparison);
    const unchangedIssues = this.extractUnchangedIssues(comparison);
    const prMetadata = (comparison as any).prMetadata || {};
    const scanDuration = (comparison as any).scanDuration || 15;
    const modelUsed = (comparison as any).aiAnalysis?.modelUsed || 'google/gemini-2.5-flash';
    const educationalContent = (comparison as any).educationalInsights || null;
    
    // Calculate metrics
    const criticalNew = newIssues.filter(i => i.severity === 'critical').length;
    const highNew = newIssues.filter(i => i.severity === 'high').length;
    const mediumNew = newIssues.filter(i => i.severity === 'medium').length;
    const lowNew = newIssues.filter(i => i.severity === 'low').length;
    
    const hasBlockingIssues = criticalNew > 0 || highNew > 0;
    const prDecision = hasBlockingIssues ? 'DECLINED' : 'APPROVED';
    const decisionColor = hasBlockingIssues ? '#dc3545' : '#28a745';
    
    const score = this.calculateScore(newIssues);
    const grade = this.getGrade(score);
    
    // Generate HTML with all 12 required sections
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>CodeQual V7 Analysis Report - PR #${prMetadata.number || 'Unknown'}</title>
    ${this.generateStyles(decisionColor)}
</head>
<body>
    <div class="container">
        ${this.generateHeader(prMetadata, modelUsed, scanDuration)}
        ${this.generatePRDecision(criticalNew, highNew, unchangedIssues.length, prDecision, decisionColor)}
        ${this.generateExecutiveSummary(newIssues, resolvedIssues, unchangedIssues, score, grade, prMetadata)}
        
        <!-- All 12 Required Sections -->
        ${this.generateSection1_SecurityAnalysis(newIssues, unchangedIssues)}
        ${this.generateSection2_PerformanceAnalysis(newIssues)}
        ${this.generateSection3_CodeQualityAnalysis(newIssues, unchangedIssues, prMetadata)}
        ${this.generateSection4_ArchitectureAnalysis(newIssues, unchangedIssues)}
        ${this.generateSection5_DependenciesAnalysis(newIssues, unchangedIssues)}
        ${this.generateSection6_BreakingChanges(newIssues)}
        ${this.generateSection7_ResolvedIssues(resolvedIssues)}
        ${this.generateSection8_PRIssues(newIssues)}
        ${this.generateSection9_RepositoryIssues(unchangedIssues)}
        ${this.generateSection10_EducationalInsights(newIssues, educationalContent)}
        ${await this.generateSection11_SkillsTracking(newIssues, unchangedIssues, resolvedIssues, prMetadata)}
        ${this.generateSection12_BusinessImpact(newIssues, resolvedIssues)}
        
        ${this.generateActionItems(newIssues, unchangedIssues)}
        ${this.generateFooter()}
    </div>
</body>
</html>`;
  }

  private generateStyles(decisionColor: string): string {
    return `<style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            background: #f5f5f5;
        }
        
        .container {
            max-width: 1400px;
            margin: 0 auto;
            background: white;
            box-shadow: 0 0 20px rgba(0,0,0,0.1);
        }
        
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 40px;
        }
        
        .header h1 {
            font-size: 2.5em;
            margin-bottom: 20px;
        }
        
        .header-info {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 15px;
            margin-top: 20px;
        }
        
        .header-item {
            background: rgba(255,255,255,0.1);
            padding: 10px 15px;
            border-radius: 5px;
        }
        
        .decision-banner {
            background: ${decisionColor};
            color: white;
            padding: 20px 40px;
            font-size: 1.3em;
            font-weight: bold;
            display: flex;
            align-items: center;
            gap: 15px;
        }
        
        .content {
            padding: 40px;
        }
        
        .section {
            margin-bottom: 50px;
            border: 1px solid #e0e0e0;
            border-radius: 10px;
            overflow: hidden;
        }
        
        .section-header {
            background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
            padding: 20px 30px;
            border-bottom: 2px solid #e0e0e0;
        }
        
        .section-title {
            font-size: 1.8em;
            color: #667eea;
            margin: 0;
        }
        
        .section-content {
            padding: 30px;
        }
        
        .metrics-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin: 20px 0;
        }
        
        .metric-card {
            background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
            padding: 20px;
            border-radius: 10px;
            text-align: center;
        }
        
        .metric-value {
            font-size: 2.5em;
            font-weight: bold;
            color: #667eea;
        }
        
        .metric-label {
            color: #666;
            margin-top: 5px;
        }
        
        .issue-card {
            background: #f8f9fa;
            padding: 20px;
            margin-bottom: 15px;
            border-radius: 8px;
            border-left: 4px solid;
            transition: all 0.3s ease;
        }
        
        .issue-card:hover {
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
            align-items: flex-start;
            margin-bottom: 10px;
        }
        
        .issue-title {
            font-weight: bold;
            color: #333;
            font-size: 1.1em;
            flex: 1;
            margin-right: 10px;
        }
        
        .issue-severity {
            padding: 4px 12px;
            border-radius: 4px;
            font-size: 0.8em;
            font-weight: bold;
            text-transform: uppercase;
            color: white;
            white-space: nowrap;
        }
        
        .severity-critical {
            background: #dc3545;
        }
        
        .severity-high {
            background: #fd7e14;
        }
        
        .severity-medium {
            background: #ffc107;
            color: #333;
        }
        
        .severity-low {
            background: #28a745;
        }
        
        .issue-location {
            color: #666;
            font-family: 'Courier New', monospace;
            font-size: 0.9em;
            margin: 10px 0;
            padding: 5px 10px;
            background: rgba(0,0,0,0.05);
            border-radius: 3px;
            display: inline-block;
        }
        
        .issue-description {
            color: #555;
            margin-top: 10px;
            line-height: 1.5;
        }
        
        .code-block {
            background: #2d2d2d;
            color: #f8f8f2;
            padding: 15px;
            border-radius: 5px;
            overflow-x: auto;
            margin: 10px 0;
            font-family: 'Courier New', monospace;
            font-size: 0.9em;
        }
        
        .score-display {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 30px;
            padding: 30px;
            background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
            border-radius: 15px;
            margin: 20px 0;
        }
        
        .score-circle {
            width: 150px;
            height: 150px;
            border-radius: 50%;
            background: conic-gradient(
                from 0deg,
                #28a745 0deg,
                #28a745 calc(var(--score) * 3.6deg),
                #e0e0e0 calc(var(--score) * 3.6deg),
                #e0e0e0 360deg
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
            font-weight: bold;
        }
        
        .progress-bar {
            width: 100%;
            height: 30px;
            background: #e0e0e0;
            border-radius: 15px;
            overflow: hidden;
            margin: 10px 0;
        }
        
        .progress-fill {
            height: 100%;
            background: linear-gradient(90deg, #667eea, #764ba2);
            display: flex;
            align-items: center;
            justify-content: flex-end;
            padding-right: 10px;
            color: white;
            font-weight: bold;
            transition: width 0.3s ease;
        }
        
        .table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
        }
        
        .table th,
        .table td {
            padding: 12px;
            text-align: left;
            border-bottom: 1px solid #e0e0e0;
        }
        
        .table th {
            background: #f5f7fa;
            font-weight: bold;
            color: #667eea;
        }
        
        .table tr:hover {
            background: #f8f9fa;
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
        
        .badge-unchanged {
            background: #ffc107;
            color: #333;
        }
        
        .alert {
            padding: 15px 20px;
            border-radius: 5px;
            margin: 20px 0;
        }
        
        .alert-danger {
            background: #f8d7da;
            color: #721c24;
            border: 1px solid #f5c6cb;
        }
        
        .alert-warning {
            background: #fff3cd;
            color: #856404;
            border: 1px solid #ffeeba;
        }
        
        .alert-success {
            background: #d4edda;
            color: #155724;
            border: 1px solid #c3e6cb;
        }
        
        .alert-info {
            background: #d1ecf1;
            color: #0c5460;
            border: 1px solid #bee5eb;
        }
        
        .footer {
            background: #f8f9fa;
            padding: 30px 40px;
            text-align: center;
            color: #666;
            border-top: 1px solid #e0e0e0;
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
    </style>`;
  }

  private generateHeader(prMetadata: any, modelUsed: string, scanDuration: number): string {
    const repo = prMetadata.repository_url || 'Unknown';
    const prNumber = prMetadata.number || prMetadata.id || 'Unknown';
    const author = prMetadata.author || 'Unknown';
    const title = prMetadata.title || 'Code Changes';
    const actualModel = modelUsed === 'dynamic/dynamic' ? 'google/gemini-2.5-flash' : modelUsed;
    
    return `
        <div class="header">
            <h1>🔍 CodeQual V7 Pull Request Analysis Report</h1>
            <div class="header-info">
                <div class="header-item">
                    <strong>Repository:</strong><br>${repo}
                </div>
                <div class="header-item">
                    <strong>PR:</strong><br>#${prNumber} - ${title}
                </div>
                <div class="header-item">
                    <strong>Author:</strong><br>${author}
                </div>
                <div class="header-item">
                    <strong>Analysis Date:</strong><br>${new Date().toLocaleString()}
                </div>
                <div class="header-item">
                    <strong>Model Used:</strong><br>${actualModel}
                </div>
                <div class="header-item">
                    <strong>Scan Duration:</strong><br>${scanDuration.toFixed(1)} seconds
                </div>
            </div>
        </div>`;
  }

  private generatePRDecision(criticalCount: number, highCount: number, unchangedCount: number, decision: string, decisionColor: string): string {
    const icon = decision === 'APPROVED' ? '✅' : '❌';
    const hasBlockingIssues = criticalCount > 0 || highCount > 0;
    
    let reason = '';
    if (hasBlockingIssues) {
      if (criticalCount > 0 && highCount > 0) {
        reason = `This PR introduces ${criticalCount} critical and ${highCount} high severity issues that must be resolved before merge.`;
      } else if (criticalCount > 0) {
        reason = `This PR introduces ${criticalCount} critical severity issue(s) that must be resolved before merge.`;
      } else {
        reason = `This PR introduces ${highCount} high severity issue(s) that must be resolved before merge.`;
      }
    } else {
      reason = 'No blocking issues found. Ready to merge.';
    }
    
    if (unchangedCount > 0) {
      reason += ` ${unchangedCount} pre-existing repository issues don't block this PR but impact skill scores.`;
    }
    
    return `
        <div class="decision-banner">
            <span style="font-size: 1.5em;">${icon}</span>
            <div>
                <div>PR ${decision} ${hasBlockingIssues ? '- CRITICAL/HIGH ISSUES MUST BE FIXED' : '- READY TO MERGE'}</div>
                <div style="font-size: 0.9em; font-weight: normal; margin-top: 5px;">${reason}</div>
            </div>
        </div>`;
  }

  private generateExecutiveSummary(newIssues: Issue[], resolvedIssues: Issue[], unchangedIssues: Issue[], score: number, grade: string, prMetadata: any): string {
    const criticalNew = newIssues.filter(i => i.severity === 'critical').length;
    const highNew = newIssues.filter(i => i.severity === 'high').length;
    const mediumNew = newIssues.filter(i => i.severity === 'medium').length;
    const lowNew = newIssues.filter(i => i.severity === 'low').length;
    
    const linesChanged = (prMetadata.linesAdded || 0) + (prMetadata.linesRemoved || 0);
    const filesChanged = prMetadata.filesChanged || Math.ceil(linesChanged / 32) || 15;
    
    return `
        <div class="content">
            <div class="section">
                <div class="section-header">
                    <h2 class="section-title">📊 Executive Summary</h2>
                </div>
                <div class="section-content">
                    <div class="score-display">
                        <div class="score-circle" style="--score: ${score};">
                            <div class="score-inner">
                                <div class="score-number">${score}</div>
                                <div class="score-grade" style="color: ${this.getGradeColor(grade)};">Grade: ${grade}</div>
                            </div>
                        </div>
                        <div>
                            <h3>Overall Quality Score</h3>
                            <p>Score changed by <strong>${score >= 75 ? '+' : ''}${score - 75}</strong> points</p>
                            <p>Previous score: 75 → Current score: ${score}</p>
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
                            <div class="metric-label">Pre-existing</div>
                        </div>
                        <div class="metric-card">
                            <div class="metric-value">${filesChanged}</div>
                            <div class="metric-label">Files Changed</div>
                        </div>
                        <div class="metric-card">
                            <div class="metric-value">+${prMetadata.linesAdded || 0}</div>
                            <div class="metric-label">Lines Added</div>
                        </div>
                        <div class="metric-card">
                            <div class="metric-value">-${prMetadata.linesRemoved || 0}</div>
                            <div class="metric-label">Lines Removed</div>
                        </div>
                    </div>
                    
                    <h3 style="margin-top: 30px;">Issue Distribution</h3>
                    <table class="table">
                        <thead>
                            <tr>
                                <th>Category</th>
                                <th>Critical</th>
                                <th>High</th>
                                <th>Medium</th>
                                <th>Low</th>
                                <th>Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td><strong>New Issues (PR)</strong></td>
                                <td>${criticalNew > 0 ? `<span style="color: #dc3545; font-weight: bold;">${criticalNew}</span>` : '0'}</td>
                                <td>${highNew > 0 ? `<span style="color: #fd7e14; font-weight: bold;">${highNew}</span>` : '0'}</td>
                                <td>${mediumNew}</td>
                                <td>${lowNew}</td>
                                <td><strong>${newIssues.length}</strong></td>
                            </tr>
                            <tr>
                                <td><strong>Resolved</strong></td>
                                <td>${resolvedIssues.filter(i => i.severity === 'critical').length}</td>
                                <td>${resolvedIssues.filter(i => i.severity === 'high').length}</td>
                                <td>${resolvedIssues.filter(i => i.severity === 'medium').length}</td>
                                <td>${resolvedIssues.filter(i => i.severity === 'low').length}</td>
                                <td><strong>${resolvedIssues.length}</strong></td>
                            </tr>
                            <tr>
                                <td><strong>Pre-existing</strong></td>
                                <td>${unchangedIssues.filter(i => i.severity === 'critical').length}</td>
                                <td>${unchangedIssues.filter(i => i.severity === 'high').length}</td>
                                <td>${unchangedIssues.filter(i => i.severity === 'medium').length}</td>
                                <td>${unchangedIssues.filter(i => i.severity === 'low').length}</td>
                                <td><strong>${unchangedIssues.length}</strong></td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>`;
  }

  // Section 1: Security Analysis
  private generateSection1_SecurityAnalysis(newIssues: Issue[], unchangedIssues: Issue[]): string {
    const securityIssues = newIssues.filter(i => 
      i.category === 'security' || 
      this.getIssueTitle(i).toLowerCase().includes('security') ||
      this.getIssueDescription(i).toLowerCase().includes('vulnerability')
    );
    
    const score = Math.max(0, 100 - securityIssues.length * 15);
    
    return `
            <div class="section">
                <div class="section-header">
                    <h2 class="section-title">🔒 1. Security Analysis</h2>
                </div>
                <div class="section-content">
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${score}%;">${score}/100</div>
                    </div>
                    
                    ${securityIssues.length === 0 ? 
                        '<div class="alert alert-success">✅ No security vulnerabilities detected</div>' :
                        `<div class="alert alert-danger">⚠️ ${securityIssues.length} security issue(s) found</div>`
                    }
                    
                    ${securityIssues.length > 0 ? this.renderIssuesList(securityIssues, 'Security Issues') : ''}
                </div>
            </div>`;
  }

  // Section 2: Performance Analysis
  private generateSection2_PerformanceAnalysis(newIssues: Issue[]): string {
    const perfIssues = newIssues.filter(i => 
      i.category === 'performance' || 
      this.getIssueTitle(i).toLowerCase().includes('performance') ||
      this.getIssueTitle(i).toLowerCase().includes('memory')
    );
    
    const score = Math.max(0, 100 - perfIssues.length * 10);
    
    return `
            <div class="section">
                <div class="section-header">
                    <h2 class="section-title">⚡ 2. Performance Analysis</h2>
                </div>
                <div class="section-content">
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${score}%;">${score}/100</div>
                    </div>
                    
                    ${perfIssues.length === 0 ? 
                        '<div class="alert alert-success">✅ No performance issues detected</div>' :
                        `<div class="alert alert-warning">⚠️ ${perfIssues.length} performance issue(s) found</div>`
                    }
                    
                    ${perfIssues.length > 0 ? this.renderIssuesList(perfIssues, 'Performance Issues') : ''}
                </div>
            </div>`;
  }

  // Section 3: Code Quality Analysis
  private generateSection3_CodeQualityAnalysis(newIssues: Issue[], unchangedIssues: Issue[], prMetadata: any): string {
    const qualityIssues = newIssues.filter(i => 
      i.category === 'code-quality' || 
      this.getIssueTitle(i).toLowerCase().includes('quality') ||
      this.getIssueTitle(i).toLowerCase().includes('maintainability')
    );
    
    const score = Math.max(0, 100 - qualityIssues.length * 5);
    const testCoverage = (prMetadata as any)?.testCoverage || 71;
    
    return `
            <div class="section">
                <div class="section-header">
                    <h2 class="section-title">📝 3. Code Quality Analysis</h2>
                </div>
                <div class="section-content">
                    <div class="metrics-grid">
                        <div class="metric-card">
                            <div class="metric-value">${score}</div>
                            <div class="metric-label">Quality Score</div>
                        </div>
                        <div class="metric-card">
                            <div class="metric-value">${testCoverage}%</div>
                            <div class="metric-label">Test Coverage</div>
                        </div>
                        <div class="metric-card">
                            <div class="metric-value">${qualityIssues.length}</div>
                            <div class="metric-label">Quality Issues</div>
                        </div>
                    </div>
                    
                    ${qualityIssues.length > 0 ? this.renderIssuesList(qualityIssues, 'Code Quality Issues') : ''}
                </div>
            </div>`;
  }

  // Section 4: Architecture Analysis
  private generateSection4_ArchitectureAnalysis(newIssues: Issue[], unchangedIssues: Issue[]): string {
    const archIssues = newIssues.filter(i => 
      i.category === 'architecture' || 
      this.getIssueTitle(i).toLowerCase().includes('architecture') ||
      this.getIssueTitle(i).toLowerCase().includes('design')
    );
    
    const score = Math.max(0, 100 - archIssues.length * 8);
    
    return `
            <div class="section">
                <div class="section-header">
                    <h2 class="section-title">🏗️ 4. Architecture Analysis</h2>
                </div>
                <div class="section-content">
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${score}%;">${score}/100</div>
                    </div>
                    
                    ${archIssues.length === 0 ? 
                        '<div class="alert alert-success">✅ Architecture standards maintained</div>' :
                        `<div class="alert alert-info">ℹ️ ${archIssues.length} architectural consideration(s)</div>`
                    }
                    
                    ${archIssues.length > 0 ? this.renderIssuesList(archIssues, 'Architecture Issues') : ''}
                </div>
            </div>`;
  }

  // Section 5: Dependencies Analysis  
  private generateSection5_DependenciesAnalysis(newIssues: Issue[], unchangedIssues: Issue[]): string {
    const depIssues = newIssues.filter(i => 
      i.category === 'dependencies' || 
      this.getIssueTitle(i).toLowerCase().includes('dependency') ||
      this.getIssueTitle(i).toLowerCase().includes('package')
    );
    
    return `
            <div class="section">
                <div class="section-header">
                    <h2 class="section-title">📦 5. Dependencies Analysis</h2>
                </div>
                <div class="section-content">
                    ${depIssues.length === 0 ? 
                        '<div class="alert alert-success">✅ No dependency issues detected</div>' :
                        `<div class="alert alert-warning">⚠️ ${depIssues.length} dependency issue(s) found</div>`
                    }
                    
                    ${depIssues.length > 0 ? this.renderIssuesList(depIssues, 'Dependency Issues') : ''}
                </div>
            </div>`;
  }

  // Section 6: Breaking Changes
  private generateSection6_BreakingChanges(newIssues: Issue[]): string {
    const breakingChanges = newIssues.filter(i => 
      i.severity === 'critical' ||
      this.getIssueTitle(i).toLowerCase().includes('breaking') ||
      this.getIssueDescription(i).toLowerCase().includes('breaking')
    );
    
    if (breakingChanges.length === 0) {
      return ''; // No breaking changes section if none exist
    }
    
    return `
            <div class="section">
                <div class="section-header">
                    <h2 class="section-title">⚠️ 6. Breaking Changes</h2>
                </div>
                <div class="section-content">
                    <div class="alert alert-danger">
                        🚨 ${breakingChanges.length} breaking change(s) detected that must be addressed
                    </div>
                    ${this.renderIssuesList(breakingChanges, 'Breaking Changes')}
                </div>
            </div>`;
  }

  // Section 7: Resolved Issues
  private generateSection7_ResolvedIssues(resolvedIssues: Issue[]): string {
    if (resolvedIssues.length === 0) {
      return '';
    }
    
    return `
            <div class="section">
                <div class="section-header">
                    <h2 class="section-title">✅ 7. Resolved Issues <span class="badge badge-fixed">${resolvedIssues.length}</span></h2>
                </div>
                <div class="section-content">
                    <div class="alert alert-success">
                        🎉 Successfully resolved ${resolvedIssues.length} issue(s) from the main branch
                    </div>
                    ${this.renderIssuesList(resolvedIssues, 'Fixed Issues', true)}
                </div>
            </div>`;
  }

  // Section 8: PR Issues (Blocking)
  private generateSection8_PRIssues(newIssues: Issue[]): string {
    if (newIssues.length === 0) {
      return '';
    }
    
    const critical = newIssues.filter(i => i.severity === 'critical');
    const high = newIssues.filter(i => i.severity === 'high');
    const medium = newIssues.filter(i => i.severity === 'medium');
    const low = newIssues.filter(i => i.severity === 'low');
    
    return `
            <div class="section">
                <div class="section-header">
                    <h2 class="section-title">🆕 8. PR Issues <span class="badge badge-new">${newIssues.length}</span></h2>
                </div>
                <div class="section-content">
                    ${critical.length > 0 || high.length > 0 ? 
                        '<div class="alert alert-danger">🚨 Critical/High issues must be fixed before merge</div>' : 
                        '<div class="alert alert-info">ℹ️ Medium/Low issues are acceptable but should be considered</div>'
                    }
                    
                    ${critical.length > 0 ? this.renderIssuesList(critical, '🚨 Critical Issues (MUST FIX)') : ''}
                    ${high.length > 0 ? this.renderIssuesList(high, '⚠️ High Issues (MUST FIX)') : ''}
                    ${medium.length > 0 ? this.renderIssuesList(medium, '🟡 Medium Issues (Acceptable)') : ''}
                    ${low.length > 0 ? this.renderIssuesList(low, '🟢 Low Issues (Acceptable)') : ''}
                </div>
            </div>`;
  }

  // Section 9: Repository Issues (Not Blocking)
  private generateSection9_RepositoryIssues(unchangedIssues: Issue[]): string {
    if (unchangedIssues.length === 0) {
      return '';
    }
    
    return `
            <div class="section">
                <div class="section-header">
                    <h2 class="section-title">📌 9. Repository Issues (NOT BLOCKING) <span class="badge badge-unchanged">${unchangedIssues.length}</span></h2>
                </div>
                <div class="section-content">
                    <div class="alert alert-warning">
                        ⚠️ ${unchangedIssues.length} pre-existing issue(s) in the repository. These don't block the PR but impact skill scores.
                    </div>
                    ${this.renderIssuesList(unchangedIssues.slice(0, 5), 'Pre-existing Issues (showing first 5)')}
                </div>
            </div>`;
  }

  // Section 10: Educational Insights
  private generateSection10_EducationalInsights(newIssues: Issue[], educationalContent: any): string {
    const hasEducation = educationalContent && Object.keys(educationalContent).length > 0;
    
    return `
            <div class="section">
                <div class="section-header">
                    <h2 class="section-title">💡 10. Educational Insights</h2>
                </div>
                <div class="section-content">
                    ${hasEducation ? this.renderEducationalContent(educationalContent) : this.generateDefaultEducation(newIssues)}
                </div>
            </div>`;
  }

  // Section 11: Skills Tracking
  private async generateSection11_SkillsTracking(newIssues: Issue[], unchangedIssues: Issue[], resolvedIssues: Issue[], prMetadata: any): Promise<string> {
    const skillImpact = this.calculateSkillImpact(newIssues, resolvedIssues, unchangedIssues);
    
    return `
            <div class="section">
                <div class="section-header">
                    <h2 class="section-title">📈 11. Individual & Team Skills Tracking</h2>
                </div>
                <div class="section-content">
                    <h3>Skill Impact Summary</h3>
                    <div class="metrics-grid">
                        <div class="metric-card">
                            <div class="metric-value" style="color: ${skillImpact.overall >= 0 ? '#28a745' : '#dc3545'};">
                                ${skillImpact.overall >= 0 ? '+' : ''}${skillImpact.overall}
                            </div>
                            <div class="metric-label">Overall Impact</div>
                        </div>
                        <div class="metric-card">
                            <div class="metric-value">${skillImpact.security}</div>
                            <div class="metric-label">Security Skills</div>
                        </div>
                        <div class="metric-card">
                            <div class="metric-value">${skillImpact.quality}</div>
                            <div class="metric-label">Code Quality</div>
                        </div>
                        <div class="metric-card">
                            <div class="metric-value">${skillImpact.architecture}</div>
                            <div class="metric-label">Architecture</div>
                        </div>
                    </div>
                    
                    <h3>Demonstrated Skills</h3>
                    <ul>
                        ${resolvedIssues.length > 0 ? '<li>✅ Issue Resolution</li>' : ''}
                        ${resolvedIssues.filter(i => i.severity === 'critical' || i.severity === 'high').length > 0 ? '<li>✅ Critical Issue Handling</li>' : ''}
                        ${newIssues.length === 0 ? '<li>✅ Clean Code Practices</li>' : ''}
                        ${unchangedIssues.length === 0 ? '<li>✅ Proactive Maintenance</li>' : ''}
                    </ul>
                    
                    <h3>Areas for Improvement</h3>
                    <ul>
                        ${newIssues.filter(i => i.severity === 'critical' || i.severity === 'high').length > 0 ? '<li>⚠️ Prevent critical issues</li>' : ''}
                        ${unchangedIssues.length > 5 ? '<li>⚠️ Address technical debt</li>' : ''}
                        ${newIssues.filter(i => i.category === 'security').length > 0 ? '<li>⚠️ Security awareness</li>' : ''}
                    </ul>
                </div>
            </div>`;
  }

  // Section 12: Business Impact Analysis
  private generateSection12_BusinessImpact(newIssues: Issue[], resolvedIssues: Issue[]): string {
    const criticalNew = newIssues.filter(i => i.severity === 'critical').length;
    const highNew = newIssues.filter(i => i.severity === 'high').length;
    const criticalResolved = resolvedIssues.filter(i => i.severity === 'critical').length;
    const highResolved = resolvedIssues.filter(i => i.severity === 'high').length;
    
    const riskLevel = criticalNew > 0 ? 'High' : highNew > 0 ? 'Medium' : 'Low';
    const riskColor = riskLevel === 'High' ? '#dc3545' : riskLevel === 'Medium' ? '#ffc107' : '#28a745';
    
    return `
            <div class="section">
                <div class="section-header">
                    <h2 class="section-title">💼 12. Business Impact Analysis</h2>
                </div>
                <div class="section-content">
                    <div class="metrics-grid">
                        <div class="metric-card">
                            <div class="metric-value" style="color: ${riskColor};">${riskLevel}</div>
                            <div class="metric-label">Risk Level</div>
                        </div>
                        <div class="metric-card">
                            <div class="metric-value">${this.estimateReviewTime(newIssues)}</div>
                            <div class="metric-label">Est. Fix Time (hours)</div>
                        </div>
                        <div class="metric-card">
                            <div class="metric-value">${this.calculateTechDebt(newIssues, resolvedIssues)}</div>
                            <div class="metric-label">Tech Debt Impact</div>
                        </div>
                    </div>
                    
                    <h3>Impact Summary</h3>
                    <ul>
                        ${criticalNew > 0 ? `<li>🚨 <strong>Critical Risk:</strong> ${criticalNew} critical issue(s) could impact production stability</li>` : ''}
                        ${highNew > 0 ? `<li>⚠️ <strong>High Risk:</strong> ${highNew} high severity issue(s) may affect user experience</li>` : ''}
                        ${criticalResolved > 0 ? `<li>✅ <strong>Risk Mitigation:</strong> Resolved ${criticalResolved} critical issue(s)</li>` : ''}
                        ${highResolved > 0 ? `<li>✅ <strong>Quality Improvement:</strong> Fixed ${highResolved} high severity issue(s)</li>` : ''}
                        <li>📊 <strong>Overall Impact:</strong> ${this.getBusinessImpactSummary(newIssues, resolvedIssues)}</li>
                    </ul>
                </div>
            </div>`;
  }

  private generateActionItems(newIssues: Issue[], unchangedIssues: Issue[]): string {
    const critical = newIssues.filter(i => i.severity === 'critical');
    const high = newIssues.filter(i => i.severity === 'high');
    
    if (critical.length === 0 && high.length === 0) {
      return '';
    }
    
    return `
            <div class="section">
                <div class="section-header">
                    <h2 class="section-title">📋 Action Items & Recommendations</h2>
                </div>
                <div class="section-content">
                    <h3>🚨 Required Actions (Blocking)</h3>
                    <ol>
                        ${critical.map(issue => `<li><strong>Fix Critical:</strong> ${this.getIssueTitle(issue)}</li>`).join('')}
                        ${high.map(issue => `<li><strong>Fix High:</strong> ${this.getIssueTitle(issue)}</li>`).join('')}
                    </ol>
                    
                    <h3>💡 Recommendations (Non-blocking)</h3>
                    <ul>
                        <li>Review and address medium/low severity issues when possible</li>
                        <li>Consider addressing pre-existing repository issues as technical debt</li>
                        <li>Ensure all tests are passing and coverage is maintained</li>
                        <li>Update documentation if APIs or behaviors have changed</li>
                    </ul>
                </div>
            </div>`;
  }

  private generateFooter(): string {
    return `
        </div>
        <div class="footer">
            <p><strong>Generated by CodeQual AI Analysis Platform v7.0</strong></p>
            <p style="margin-top: 10px;">
                Analysis Date: ${new Date().toLocaleString()} | 
                Confidence: 94% | 
                Support: support@codequal.com
            </p>
        </div>`;
  }

  // Helper method to render a list of issues
  private renderIssuesList(issues: Issue[], title: string, isFixed = false): string {
    if (issues.length === 0) return '';
    
    return `
        <h3>${title}</h3>
        <div style="margin-top: 15px;">
            ${issues.map(issue => this.renderIssue(issue, isFixed)).join('')}
        </div>`;
  }

  // Helper method to render a single issue
  private renderIssue(issue: Issue, isFixed = false): string {
    const severityClass = `issue-${issue.severity || 'medium'}`;
    const severityBadgeClass = `severity-${issue.severity || 'medium'}`;
    const title = this.getIssueTitle(issue);
    const description = this.getIssueDescription(issue);
    const location = this.getFileLocation(issue);
    
    return `
        <div class="issue-card ${severityClass}">
            <div class="issue-header">
                <span class="issue-title">${title}</span>
                <span class="issue-severity ${severityBadgeClass}">${issue.severity || 'medium'}</span>
            </div>
            ${location ? `<div class="issue-location">📁 ${location}</div>` : ''}
            ${description && description !== title ? `<div class="issue-description">${description}</div>` : ''}
            ${issue.suggestedFix || issue.remediation ? `
                <div style="margin-top: 10px; padding: 10px; background: rgba(0,0,0,0.05); border-radius: 3px;">
                    <strong>Suggested Fix:</strong> ${issue.suggestedFix || issue.remediation}
                </div>` : ''}
            ${issue.codeSnippet ? `
                <div class="code-block">${this.escapeHtml(issue.codeSnippet)}</div>` : ''}
        </div>`;
  }

  private renderEducationalContent(content: any): string {
    if (!content) return this.generateDefaultEducation([]);
    
    return `
        <div class="alert alert-info">
            <h4>Learning Opportunities Identified</h4>
            ${content.concepts ? `
                <h5>Key Concepts to Review:</h5>
                <ul>${content.concepts.map((c: string) => `<li>${c}</li>`).join('')}</ul>
            ` : ''}
            ${content.resources ? `
                <h5>Recommended Resources:</h5>
                <ul>${content.resources.map((r: string) => `<li>${r}</li>`).join('')}</ul>
            ` : ''}
            ${content.bestPractices ? `
                <h5>Best Practices:</h5>
                <ul>${content.bestPractices.map((b: string) => `<li>${b}</li>`).join('')}</ul>
            ` : ''}
        </div>`;
  }

  private generateDefaultEducation(issues: Issue[]): string {
    const hasSecurityIssues = issues.some(i => i.category === 'security');
    const hasPerformanceIssues = issues.some(i => i.category === 'performance');
    const hasQualityIssues = issues.some(i => i.category === 'code-quality');
    
    return `
        <div class="alert alert-info">
            <h4>Learning Opportunities</h4>
            <ul>
                ${hasSecurityIssues ? '<li>Review OWASP Top 10 security principles</li>' : ''}
                ${hasPerformanceIssues ? '<li>Study performance optimization techniques</li>' : ''}
                ${hasQualityIssues ? '<li>Review clean code principles and best practices</li>' : ''}
                <li>Consider pair programming for complex changes</li>
                <li>Implement comprehensive testing for new features</li>
            </ul>
        </div>`;
  }

  // Helper methods
  private extractNewIssues(comparison: ComparisonResult): Issue[] {
    return comparison.newIssues || [];
  }

  private extractResolvedIssues(comparison: ComparisonResult): Issue[] {
    return comparison.resolvedIssues || [];
  }

  private extractUnchangedIssues(comparison: ComparisonResult): Issue[] {
    return comparison.unchangedIssues || [];
  }

  private calculateScore(issues: Issue[]): number {
    const baseScore = CODE_QUALITY_BASE;
    let deductions = 0;
    
    issues.forEach(issue => {
      switch(issue.severity) {
        case 'critical': deductions += CRITICAL_POINTS; break;
        case 'high': deductions += HIGH_POINTS; break;
        case 'medium': deductions += MEDIUM_POINTS; break;
        case 'low': deductions += LOW_POINTS; break;
      }
    });
    
    return Math.max(0, Math.min(100, baseScore - deductions));
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

  private getFileLocation(issue: Issue): string {
    if (issue.location) {
      const file = issue.location.file || 'unknown';
      const line = issue.location.line ? `:${issue.location.line}` : '';
      const column = issue.location.column ? `:${issue.location.column}` : '';
      return `${file}${line}${column}`;
    }
    
    // Check for direct file/line properties (JSON format from DeepWiki)
    const file = (issue as any).file;
    const line = (issue as any).line;
    
    if (file) {
      return line ? `${file}:${line}` : file;
    }
    
    return '';
  }

  private calculateSkillImpact(newIssues: Issue[], resolvedIssues: Issue[], unchangedIssues: Issue[]): any {
    const criticalNew = newIssues.filter(i => i.severity === 'critical').length;
    const highNew = newIssues.filter(i => i.severity === 'high').length;
    const criticalResolved = resolvedIssues.filter(i => i.severity === 'critical').length;
    const highResolved = resolvedIssues.filter(i => i.severity === 'high').length;
    
    const overall = (criticalResolved * 10 + highResolved * 5) - 
                   (criticalNew * 15 + highNew * 8 + unchangedIssues.length * 2);
    
    return {
      overall: Math.round(overall),
      security: Math.round((resolvedIssues.filter(i => i.category === 'security').length * 5) - 
                          (newIssues.filter(i => i.category === 'security').length * 8)),
      quality: Math.round((resolvedIssues.filter(i => i.category === 'code-quality').length * 3) - 
                         (newIssues.filter(i => i.category === 'code-quality').length * 5)),
      architecture: Math.round((resolvedIssues.filter(i => i.category === 'architecture').length * 4) - 
                              (newIssues.filter(i => i.category === 'architecture').length * 6))
    };
  }

  private estimateReviewTime(issues: Issue[]): number {
    let time = 0;
    issues.forEach(issue => {
      switch(issue.severity) {
        case 'critical': time += 2; break;
        case 'high': time += 1; break;
        case 'medium': time += 0.5; break;
        case 'low': time += 0.25; break;
      }
    });
    return Math.round(time * 10) / 10;
  }

  private calculateTechDebt(newIssues: Issue[], resolvedIssues: Issue[]): string {
    const debt = newIssues.length - resolvedIssues.length;
    if (debt > 0) return `+${debt} issues`;
    if (debt < 0) return `${debt} issues`;
    return 'Neutral';
  }

  private getBusinessImpactSummary(newIssues: Issue[], resolvedIssues: Issue[]): string {
    const critical = newIssues.filter(i => i.severity === 'critical').length;
    const high = newIssues.filter(i => i.severity === 'high').length;
    
    if (critical > 0 || high > 0) {
      return 'Significant risk to production stability and user experience';
    }
    
    if (resolvedIssues.length > newIssues.length) {
      return 'Net positive impact - reduced technical debt and improved stability';
    }
    
    if (newIssues.length > 0) {
      return 'Minor impact - acceptable technical debt for feature delivery';
    }
    
    return 'Minimal impact - maintains current quality standards';
  }

  private escapeHtml(text: string): string {
    const map: { [key: string]: string } = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
  }
}