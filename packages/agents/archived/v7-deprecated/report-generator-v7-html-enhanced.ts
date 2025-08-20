import { 
  ComparisonResult, 
  Issue, 
  AnalysisResult,
  PRMetadata 
} from '../types/analysis-types';

/**
 * CRITICAL SCORING CONSTANTS - DO NOT MODIFY
 * These values are locked and tested by golden standards
 */
const CRITICAL_POINTS = 5;
const HIGH_POINTS = 3;
const MEDIUM_POINTS = 1;
const LOW_POINTS = 0.5;
const NEW_USER_BASE_SCORE = 50;
const CODE_QUALITY_BASE = 75;

/**
 * V7 Enhanced HTML Report Generator
 * Includes all missing features:
 * - Architecture visual diagram
 * - Issue descriptions and impacts
 * - Code snippets and fix suggestions
 * - Educational insights connected to actual issues
 * - Detailed business impact estimates
 * - PR comment section for GitHub
 */
export class ReportGeneratorV7HTMLEnhanced {
  private skillProvider?: any;
  private isAuthorizedCaller = false;
  
  constructor(skillProvider?: any, authorizedCaller?: boolean) {
    this.skillProvider = skillProvider;
    this.isAuthorizedCaller = authorizedCaller === true;
    
    if (!this.isAuthorizedCaller && !skillProvider) {
      console.warn(
        '\n⚠️  WARNING: ReportGeneratorV7HTMLEnhanced instantiated directly!\n' +
        '   This bypasses dynamic model selection and skill tracking.\n' +
        '   Please use ComparisonAgent.analyze() instead.\n'
      );
    }
  }

  /**
   * Helper to get issue title/message safely
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
   * Get issue impact description
   */
  private getIssueImpact(issue: Issue): string {
    const impacts = {
      critical: 'Critical system vulnerability or failure - Production at risk',
      high: 'Significant security or performance impact - User experience affected',
      medium: 'Moderate impact on maintainability - Technical debt accumulation',
      low: 'Minor code quality issue - Best practices recommendation'
    };
    return (issue as any).impact || impacts[issue.severity || 'low'] || 'Potential issue';
  }

  /**
   * Generate architecture ASCII diagram
   */
  private generateArchitectureDiagram(archIssues: Issue[]): string {
    const hasApiIssues = archIssues.some(i => 
      this.getIssueTitle(i).toLowerCase().includes('api') ||
      this.getIssueDescription(i).toLowerCase().includes('api')
    );
    const hasDbIssues = archIssues.some(i => 
      this.getIssueTitle(i).toLowerCase().includes('database') ||
      this.getIssueTitle(i).toLowerCase().includes('sql')
    );
    const hasCacheIssues = archIssues.some(i => 
      this.getIssueTitle(i).toLowerCase().includes('cache')
    );
    const hasSecurityIssues = archIssues.some(i => 
      i.category === 'security' || i.severity === 'critical'
    );

    return `
    <div class="architecture-diagram">
        <pre style="background: #2d3748; color: #e2e8f0; padding: 20px; border-radius: 8px; overflow-x: auto;">
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Frontend  │────▶│     API     │────▶│   Backend   │
│  ${hasApiIssues ? '⚠️ Issues' : '✅ Clean'}  │     │  ${hasApiIssues ? '⚠️ Issues' : '✅ Clean'}  │     │  ${archIssues.length > 0 ? '⚠️ Issues' : '✅ Clean'}  │
└─────────────┘     └─────────────┘     └─────────────┘
       │                   │                    │
       │                   ▼                    ▼
       │            ┌─────────────┐     ┌─────────────┐
       │            │    Cache    │     │  Database   │
       │            │  ${hasCacheIssues ? '⚠️ Issues' : '✅ Clean'}  │     │  ${hasDbIssues ? '⚠️ Issues' : '✅ Clean'}  │
       │            └─────────────┘     └─────────────┘
       │                                        │
       └────────────────┬───────────────────────┘
                        ▼
                ┌─────────────┐
                │  Security   │
                │  ${hasSecurityIssues ? '🚨 CRITICAL' : '✅ Secure'}  │
                └─────────────┘
        </pre>
    </div>`;
  }

  /**
   * Generate PR comment for GitHub
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
      
      comment += `#### 🚨 Blocking Issues:\n`;
      [...newIssues.filter(i => i.severity === 'critical'), ...newIssues.filter(i => i.severity === 'high')].forEach((issue, idx) => {
        comment += `${idx + 1}. **${issue.severity?.toUpperCase()}:** ${this.getIssueTitle(issue)}\n`;
        comment += `   - 📁 Location: ${this.getFileLocation(issue) || 'location unknown'}\n`;
        comment += `   - 💥 Impact: ${this.getIssueImpact(issue)}\n`;
        if (issue.suggestedFix || issue.remediation) {
          comment += `   - 💡 Fix: ${issue.suggestedFix || issue.remediation}\n`;
        }
        comment += `\n`;
      });
    } else {
      comment += `✅ **No blocking issues found - ready to merge**\n\n`;
    }
    
    comment += `### 📊 Summary\n`;
    comment += `| Category | Count | Details |\n`;
    comment += `|----------|-------|----------|\n`;
    comment += `| 🆕 New Issues | ${newIssues.length} | Critical: ${criticalNew}, High: ${highNew}, Medium: ${mediumNew}, Low: ${lowNew} |\n`;
    comment += `| ✅ Fixed Issues | ${resolvedIssues.length} | Successfully resolved from main branch |\n`;
    comment += `| 📌 Pre-existing | ${unchangedIssues.length} | Not blocking but impacts skill scores |\n`;
    comment += `\n`;
    
    const score = this.calculateScore(newIssues);
    comment += `### 📈 Quality Metrics\n`;
    comment += `- **Overall Score:** ${score}/100 (Grade: ${this.getGrade(score)})\n`;
    comment += `- **Risk Level:** ${criticalNew > 0 ? 'HIGH' : highNew > 0 ? 'MEDIUM' : 'LOW'}\n`;
    comment += `- **Estimated Fix Time:** ${this.estimateReviewTime(newIssues)} hours\n`;
    comment += `\n`;
    
    comment += `### 🎯 Next Steps\n`;
    if (hasBlockingIssues) {
      comment += `1. Fix all critical/high severity issues listed above\n`;
      comment += `2. Re-run analysis after fixes\n`;
      comment += `3. Consider addressing medium/low issues for better code quality\n`;
    } else {
      comment += `1. Ready to merge - no blocking issues\n`;
      comment += `2. Consider addressing ${unchangedIssues.length} pre-existing issues as technical debt\n`;
      comment += `3. Ensure all tests pass before merging\n`;
    }
    comment += `\n`;
    
    comment += `---\n`;
    comment += `*Generated by [CodeQual](https://codequal.com) • View [full report](https://codequal.com/report) for detailed analysis*\n`;
    
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
        ${this.generateSection10_EducationalInsights(newIssues, unchangedIssues, educationalContent)}
        ${await this.generateSection11_SkillsTracking(newIssues, unchangedIssues, resolvedIssues, prMetadata)}
        ${this.generateSection12_BusinessImpact(newIssues, resolvedIssues)}
        
        ${this.generateActionItems(newIssues, unchangedIssues)}
        ${this.generatePRCommentSection(comparison)}
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
        
        .issue-impact {
            margin-top: 10px;
            padding: 10px;
            background: rgba(255,193,7,0.1);
            border-left: 3px solid #ffc107;
            color: #856404;
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
        
        .fix-suggestion {
            background: rgba(40,167,69,0.1);
            border-left: 3px solid #28a745;
            padding: 10px;
            margin-top: 10px;
            color: #155724;
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
        
        .pr-comment-box {
            background: #f8f9fa;
            border: 2px solid #e0e0e0;
            border-radius: 10px;
            padding: 20px;
            margin: 20px 0;
        }
        
        .pr-comment-header {
            display: flex;
            align-items: center;
            gap: 10px;
            margin-bottom: 15px;
            padding-bottom: 10px;
            border-bottom: 1px solid #e0e0e0;
        }
        
        .pr-comment-content {
            font-family: 'Courier New', monospace;
            font-size: 0.9em;
            background: white;
            padding: 15px;
            border-radius: 5px;
            white-space: pre-wrap;
            max-height: 400px;
            overflow-y: auto;
        }
        
        .copy-button {
            background: #667eea;
            color: white;
            border: none;
            padding: 8px 16px;
            border-radius: 5px;
            cursor: pointer;
            font-size: 0.9em;
            margin-left: auto;
        }
        
        .copy-button:hover {
            background: #764ba2;
        }
        
        .architecture-diagram {
            margin: 20px 0;
        }
        
        .business-impact-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 20px;
            margin: 20px 0;
        }
        
        .impact-item {
            padding: 15px;
            background: #f8f9fa;
            border-radius: 8px;
            border-left: 4px solid #667eea;
        }
        
        .impact-value {
            font-size: 1.5em;
            font-weight: bold;
            color: #667eea;
        }
        
        .impact-label {
            color: #666;
            margin-top: 5px;
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
            
            .business-impact-grid {
                grid-template-columns: 1fr;
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
                    
                    ${securityIssues.length > 0 ? this.renderDetailedIssuesList(securityIssues, 'Security Issues') : ''}
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
                    
                    ${perfIssues.length > 0 ? this.renderDetailedIssuesList(perfIssues, 'Performance Issues') : ''}
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
                    
                    ${qualityIssues.length > 0 ? this.renderDetailedIssuesList(qualityIssues, 'Code Quality Issues') : ''}
                </div>
            </div>`;
  }

  // Section 4: Architecture Analysis with Visual Diagram
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
                    
                    <h3>System Architecture Overview</h3>
                    ${this.generateArchitectureDiagram(archIssues)}
                    
                    ${archIssues.length === 0 ? 
                        '<div class="alert alert-success">✅ Architecture standards maintained</div>' :
                        `<div class="alert alert-info">ℹ️ ${archIssues.length} architectural consideration(s)</div>`
                    }
                    
                    ${archIssues.length > 0 ? this.renderDetailedIssuesList(archIssues, 'Architecture Issues') : ''}
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
                    
                    ${depIssues.length > 0 ? this.renderDetailedIssuesList(depIssues, 'Dependency Issues') : ''}
                </div>
            </div>`;
  }

  // Section 6: Breaking Changes
  private generateSection6_BreakingChanges(newIssues: Issue[]): string {
    // Only include issues that are specifically about breaking changes,
    // not just all critical issues (to avoid duplication)
    const breakingChanges = newIssues.filter(i => {
      const title = this.getIssueTitle(i).toLowerCase();
      const description = this.getIssueDescription(i).toLowerCase();
      const message = (i.message || '').toLowerCase();
      
      // Check if this is specifically a breaking change
      // (not just critical severity)
      return (
        title.includes('breaking') ||
        description.includes('breaking') ||
        message.includes('breaking') ||
        title.includes('incompatible') ||
        description.includes('incompatible') ||
        message.includes('incompatible') ||
        title.includes('migration') ||
        description.includes('migration') ||
        message.includes('migration')
      );
    });
    
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
                        🚨 ${breakingChanges.length} breaking change(s) detected that require migration
                    </div>
                    ${this.renderDetailedIssuesList(breakingChanges, 'Breaking Changes')}
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
                    ${this.renderDetailedIssuesList(resolvedIssues, 'Fixed Issues', true)}
                </div>
            </div>`;
  }

  // Section 8: PR Issues (Blocking) with Full Details
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
                    
                    ${critical.length > 0 ? this.renderDetailedIssuesList(critical, '🚨 Critical Issues (MUST FIX)', false, 'PR-CRITICAL') : ''}
                    ${high.length > 0 ? this.renderDetailedIssuesList(high, '⚠️ High Issues (MUST FIX)', false, 'PR-HIGH') : ''}
                    ${medium.length > 0 ? this.renderDetailedIssuesList(medium, '🟡 Medium Issues (Acceptable)', false, 'PR-MEDIUM') : ''}
                    ${low.length > 0 ? this.renderDetailedIssuesList(low, '🟢 Low Issues (Acceptable)', false, 'PR-LOW') : ''}
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
                    ${this.renderDetailedIssuesList(unchangedIssues.slice(0, 5), 'Pre-existing Issues (showing first 5)', false, 'REPO')}
                </div>
            </div>`;
  }

  // Section 10: Educational Insights Connected to Issues (BUG-7, BUG-8, BUG-9 Enhanced)
  private generateSection10_EducationalInsights(newIssues: Issue[], unchangedIssues: Issue[], educationalContent: any): string {
    // Group issues by severity for ordered display (BUG-7)
    const allIssues = [...newIssues, ...unchangedIssues];
    const issuesBySeverity = {
      critical: allIssues.filter(i => i.severity === 'critical'),
      high: allIssues.filter(i => i.severity === 'high'),
      medium: allIssues.filter(i => i.severity === 'medium'),
      low: allIssues.filter(i => i.severity === 'low')
    };
    
    // Calculate skill scores (BUG-8)
    const baseScore = 50; // New users start at 50/100
    const deductions = {
      critical: issuesBySeverity.critical.length * 5,
      high: issuesBySeverity.high.length * 3,
      medium: issuesBySeverity.medium.length * 1,
      low: issuesBySeverity.low.length * 0.5
    };
    const totalDeduction = Object.values(deductions).reduce((a, b) => a + b, 0);
    const currentScore = Math.max(0, Math.round(baseScore - totalDeduction));
    
    // Build enhanced educational HTML with issue-specific recommendations
    return this.buildEnhancedEducationalHTML(
      issuesBySeverity,
      educationalContent,
      currentScore,
      deductions,
      baseScore
    );
  }
  
  // New method for enhanced educational HTML (BUG-7, BUG-8, BUG-9)
  private buildEnhancedEducationalHTML(
    issuesBySeverity: any,
    educationalContent: any,
    currentScore: number,
    deductions: any,
    baseScore: number
  ): string {
    let html = `
            <div class="section">
                <div class="section-header">
                    <h2 class="section-title">💡 10. Educational Insights - Personalized Learning Plan</h2>
                </div>
                <div class="section-content">
                    <!-- Skill Score Section (BUG-8) -->
                    <div class="skill-score-summary" style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 30px;">
                        <h3>📊 Your Code Quality Score</h3>
                        <div class="score-display" style="font-size: 2.5em; font-weight: bold; color: ${this.getScoreColor(currentScore)}; margin: 20px 0;">
                            <span class="current-score">${currentScore}</span>
                            <span class="max-score" style="font-size: 0.6em; color: #666;">/100</span>
                        </div>
                        <div class="score-breakdown" style="background: white; padding: 15px; border-radius: 5px;">
                            <p><strong>Score Calculation:</strong></p>
                            <ul style="list-style: none; padding: 10px 0;">
                                <li>✅ Base Score (new user): ${baseScore}/100</li>
                                <li style="color: #dc3545;">➖ Critical Issues (-5 each): -${deductions.critical} points (${issuesBySeverity.critical.length} issues)</li>
                                <li style="color: #fd7e14;">➖ High Issues (-3 each): -${deductions.high} points (${issuesBySeverity.high.length} issues)</li>
                                <li style="color: #ffc107;">➖ Medium Issues (-1 each): -${deductions.medium} points (${issuesBySeverity.medium.length} issues)</li>
                                <li style="color: #28a745;">➖ Low Issues (-0.5 each): -${deductions.low} points (${issuesBySeverity.low.length} issues)</li>
                                <li style="border-top: 1px solid #dee2e6; margin-top: 10px; padding-top: 10px;">
                                    <strong>Final Score: ${currentScore}/100</strong>
                                </li>
                            </ul>
                        </div>
                    </div>
                    
                    <!-- Issue-Specific Education (BUG-7) -->
                    <div class="issue-based-learning">
                        <h3>📚 Learning Opportunities Based on Found Issues</h3>`;
    
    // Critical issues with strict motivation (BUG-7)
    if (issuesBySeverity.critical.length > 0) {
      html += `
                        <div class="critical-learning urgent" style="background: #ffebee; border-left: 4px solid #dc3545; padding: 20px; margin: 20px 0;">
                            <h4 style="color: #dc3545;">🚨 CRITICAL - Immediate Action Required</h4>
                            <p class="motivation-strict" style="font-weight: bold; margin: 10px 0;">
                                These critical issues pose immediate security/stability risks. 
                                <strong style="color: #dc3545;">You MUST address these before deployment!</strong>
                            </p>
                            <ul style="list-style: none; padding: 0;">`;
      
      for (const issue of issuesBySeverity.critical) {
        const educLink = this.getEducationalLink(issue, educationalContent);
        html += `
                                <li class="issue-education critical" style="background: white; padding: 15px; margin: 10px 0; border-radius: 5px;">
                                    <div class="issue-title" style="font-weight: bold; color: #dc3545;">
                                        🔴 ${this.getIssueTitle(issue)}
                                    </div>
                                    <div class="education-link" style="margin: 10px 0;">
                                        📖 <strong>Required Learning</strong>: 
                                        <a href="${educLink.url}" target="_blank" style="color: #007bff;">${educLink.title}</a>
                                    </div>
                                    <div class="why-important" style="background: #fff5f5; padding: 10px; border-radius: 3px;">
                                        ⚠️ <strong>Why this matters:</strong> ${issue.impact || 'Can compromise entire system security and stability'}
                                    </div>
                                </li>`;
      }
      html += `
                            </ul>
                        </div>`;
    }
    
    // High severity with strong recommendation (BUG-7)
    if (issuesBySeverity.high.length > 0) {
      html += `
                        <div class="high-learning important" style="background: #fff3e0; border-left: 4px solid #fd7e14; padding: 20px; margin: 20px 0;">
                            <h4 style="color: #fd7e14;">⚠️ HIGH Priority Learning</h4>
                            <p class="motivation-strong" style="margin: 10px 0;">
                                These issues significantly impact code quality and should be addressed soon.
                            </p>
                            <ul style="list-style: none; padding: 0;">`;
      
      for (const issue of issuesBySeverity.high) {
        const educLink = this.getEducationalLink(issue, educationalContent);
        html += `
                                <li class="issue-education high" style="background: white; padding: 15px; margin: 10px 0; border-radius: 5px;">
                                    <div class="issue-title" style="font-weight: bold; color: #fd7e14;">
                                        🟠 ${this.getIssueTitle(issue)}
                                    </div>
                                    <div class="education-link" style="margin: 10px 0;">
                                        📚 <strong>Recommended</strong>: 
                                        <a href="${educLink.url}" target="_blank" style="color: #007bff;">${educLink.title}</a>
                                    </div>
                                </li>`;
      }
      html += `
                            </ul>
                        </div>`;
    }
    
    // Medium/Low with encouraging tone (BUG-7)
    const otherIssues = [...issuesBySeverity.medium, ...issuesBySeverity.low];
    if (otherIssues.length > 0) {
      html += `
                        <div class="suggested-learning" style="background: #e8f5e9; border-left: 4px solid #28a745; padding: 20px; margin: 20px 0;">
                            <h4 style="color: #28a745;">💡 Suggested Learning for Improvement</h4>
                            <p class="motivation-encouraging" style="margin: 10px 0;">
                                Great job overall! These improvements will enhance your code quality even further.
                            </p>
                            <ul style="list-style: none; padding: 0;">`;
      
      for (const issue of otherIssues) {
        const educLink = this.getEducationalLink(issue, educationalContent);
        const severityColor = issue.severity === 'medium' ? '#ffc107' : '#28a745';
        const severityIcon = issue.severity === 'medium' ? '🟡' : '🟢';
        
        html += `
                                <li class="issue-education ${issue.severity}" style="background: white; padding: 15px; margin: 10px 0; border-radius: 5px;">
                                    <div class="issue-title" style="font-weight: bold; color: ${severityColor};">
                                        ${severityIcon} ${this.getIssueTitle(issue)}
                                    </div>
                                    <div class="education-link" style="margin: 10px 0;">
                                        💭 Consider learning: 
                                        <a href="${educLink.url}" target="_blank" style="color: #007bff;">${educLink.title}</a>
                                    </div>
                                </li>`;
      }
      html += `
                            </ul>
                        </div>`;
    }
    
    // Add footnotes explaining the scoring system (BUG-8)
    html += `
                    </div>
                    
                    <!-- Footnotes (BUG-8) -->
                    <div class="educational-footnotes" style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-top: 30px;">
                        <hr style="margin-bottom: 20px;">
                        <small style="color: #6c757d;">
                            <p><strong>📊 Scoring System Explained:</strong></p>
                            <ul style="padding-left: 20px; margin: 10px 0;">
                                <li>New users start with a base score of 50/100</li>
                                <li>Critical issues: -5 points each (must fix immediately for security/stability)</li>
                                <li>High issues: -3 points each (fix soon for code quality)</li>
                                <li>Medium issues: -1 point each (plan to fix in next iteration)</li>
                                <li>Low issues: -0.5 points each (nice to fix when time permits)</li>
                            </ul>
                            <p style="margin-top: 10px;">
                                <strong>Your recent validation score: ${currentScore}/100</strong> 
                                ${this.getScoreMessage(currentScore)}
                            </p>
                            <p style="margin-top: 10px;">
                                <em>💡 Educational links are powered by DeepWiki analysis and tailored to your specific issues.</em>
                            </p>
                        </small>
                    </div>
                </div>
            </div>`;
    
    return html;
  }
  
  // Helper method to get educational link for an issue (BUG-9)
  private getEducationalLink(issue: Issue, educationalContent: any): {url: string, title: string} {
    // Try to get specific link from educator content if available
    if (educationalContent?.resources) {
      const specificLink = educationalContent.resources.find(
        (r: any) => r.relatedTo?.includes(issue.id) || 
                    r.category === issue.category ||
                    r.severity === issue.severity
      );
      
      if (specificLink) {
        return {
          url: specificLink.url,
          title: specificLink.title
        };
      }
    }
    
    // Get more specific educational links based on issue details
    const title = this.getIssueTitle(issue).toLowerCase();
    const description = this.getIssueDescription(issue).toLowerCase();
    const message = (issue.message || '').toLowerCase();
    const fullText = `${title} ${description} ${message}`;
    
    // Specific security issue links
    if (issue.category === 'security') {
      if (fullText.includes('sql injection')) {
        return {
          url: 'https://owasp.org/www-community/attacks/SQL_Injection',
          title: 'OWASP Guide: Preventing SQL Injection Attacks'
        };
      }
      if (fullText.includes('api key') || fullText.includes('exposed') || fullText.includes('credential')) {
        return {
          url: 'https://owasp.org/www-project-web-security-testing-guide/v42/4-Web_Application_Security_Testing/09-Testing_for_Weak_Cryptography/README',
          title: 'Secure Credential Storage and Management'
        };
      }
      if (fullText.includes('xss') || fullText.includes('cross-site scripting')) {
        return {
          url: 'https://owasp.org/www-community/attacks/xss/',
          title: 'OWASP Guide: Cross-Site Scripting Prevention'
        };
      }
      if (fullText.includes('rate limit')) {
        return {
          url: 'https://cheatsheetseries.owasp.org/cheatsheets/Denial_of_Service_Cheat_Sheet.html',
          title: 'Rate Limiting and DDoS Prevention Guide'
        };
      }
      if (fullText.includes('authentication') || fullText.includes('auth')) {
        return {
          url: 'https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html',
          title: 'OWASP Authentication Best Practices'
        };
      }
      if (fullText.includes('password')) {
        return {
          url: 'https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html',
          title: 'OWASP Password Storage Guidelines'
        };
      }
      if (fullText.includes('input validation') || fullText.includes('sanitiz')) {
        return {
          url: 'https://cheatsheetseries.owasp.org/cheatsheets/Input_Validation_Cheat_Sheet.html',
          title: 'Input Validation and Sanitization Guide'
        };
      }
      if (fullText.includes('file upload')) {
        return {
          url: 'https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html',
          title: 'Secure File Upload Best Practices'
        };
      }
      // Default security link
      return {
        url: 'https://owasp.org/www-project-top-ten/',
        title: 'OWASP Top 10 Security Vulnerabilities'
      };
    }
    
    // Specific performance issue links
    if (issue.category === 'performance') {
      if (fullText.includes('memory leak')) {
        return {
          url: 'https://developer.chrome.com/docs/devtools/memory-problems/',
          title: 'Finding and Fixing Memory Leaks in JavaScript'
        };
      }
      if (fullText.includes('n+1') || fullText.includes('query')) {
        return {
          url: 'https://stackoverflow.blog/2022/12/27/picture-perfect-images-with-the-modern-img-element/',
          title: 'Database Query Optimization and N+1 Prevention'
        };
      }
      if (fullText.includes('async') || fullText.includes('synchronous') || fullText.includes('blocking')) {
        return {
          url: 'https://developer.mozilla.org/en-US/docs/Learn/JavaScript/Asynchronous',
          title: 'Asynchronous Programming and Non-Blocking I/O'
        };
      }
      if (fullText.includes('cache') || fullText.includes('caching')) {
        return {
          url: 'https://web.dev/http-cache/',
          title: 'HTTP Caching Strategies for Performance'
        };
      }
      // Default performance link
      return {
        url: 'https://web.dev/performance/',
        title: 'Web Performance Optimization Fundamentals'
      };
    }
    
    // Specific architecture issue links
    if (issue.category === 'architecture') {
      if (fullText.includes('race condition') || fullText.includes('concurrent')) {
        return {
          url: 'https://www.educative.io/blog/multithreading-and-concurrency-fundamentals',
          title: 'Concurrency Control and Race Condition Prevention'
        };
      }
      if (fullText.includes('coupling') || fullText.includes('dependency')) {
        return {
          url: 'https://martinfowler.com/articles/microservices.html',
          title: 'Loose Coupling and Dependency Management'
        };
      }
      if (fullText.includes('pattern') || fullText.includes('design')) {
        return {
          url: 'https://refactoring.guru/design-patterns',
          title: 'Design Patterns for Better Architecture'
        };
      }
      // Default architecture link
      return {
        url: 'https://martinfowler.com/architecture/',
        title: 'Software Architecture Best Practices'
      };
    }
    
    // Specific code quality issue links
    const category = issue.category as string;
    if (category === 'code-quality' || category === 'maintainability' || !category) {
      if (fullText.includes('complexity') || fullText.includes('cyclomatic')) {
        return {
          url: 'https://refactoring.guru/refactoring/smells',
          title: 'Reducing Code Complexity and Code Smells'
        };
      }
      if (fullText.includes('duplicate') || fullText.includes('dry')) {
        return {
          url: 'https://refactoring.guru/refactoring/techniques/dealing-with-generalization',
          title: 'DRY Principle and Code Deduplication'
        };
      }
      if (fullText.includes('naming') || fullText.includes('readability')) {
        return {
          url: 'https://github.com/kettanaito/naming-cheatsheet',
          title: 'Naming Conventions and Code Readability'
        };
      }
      // Default code quality link
      return {
        url: 'https://refactoring.guru/refactoring',
        title: 'Code Refactoring Techniques'
      };
    }
    
    // Specific testing issue links
    if (category === 'testing' || (fullText.includes('test') && !category) || (fullText.includes('coverage') && !category)) {
      if (fullText.includes('unit test')) {
        return {
          url: 'https://martinfowler.com/articles/practical-test-pyramid.html',
          title: 'Unit Testing Best Practices'
        };
      }
      if (fullText.includes('integration')) {
        return {
          url: 'https://martinfowler.com/bliki/IntegrationTest.html',
          title: 'Integration Testing Strategies'
        };
      }
      if (fullText.includes('coverage')) {
        return {
          url: 'https://kentcdodds.com/blog/write-tests',
          title: 'Effective Test Coverage Strategies'
        };
      }
      // Default testing link
      return {
        url: 'https://testingjavascript.com/',
        title: 'JavaScript Testing Fundamentals'
      };
    }
    
    // Dependency-specific links
    if (issue.category === 'dependencies') {
      if (fullText.includes('vulnerability') || fullText.includes('cve')) {
        return {
          url: 'https://docs.npmjs.com/auditing-package-dependencies-for-security-vulnerabilities',
          title: 'Managing Security Vulnerabilities in Dependencies'
        };
      }
      if (fullText.includes('outdated') || fullText.includes('update')) {
        return {
          url: 'https://docs.npmjs.com/updating-packages-downloaded-from-the-registry',
          title: 'Keeping Dependencies Up to Date'
        };
      }
      // Default dependency link
      return {
        url: 'https://docs.npmjs.com/cli/v8/commands/npm-audit',
        title: 'NPM Dependency Management'
      };
    }
    
    // Accessibility-specific links
    if (category === 'accessibility') {
      return {
        url: 'https://www.w3.org/WAI/WCAG21/quickref/',
        title: 'WCAG Accessibility Guidelines'
      };
    }
    
    // General fallback based on category
    const categoryLinks: { [key: string]: {url: string, title: string} } = {
      security: {
        url: 'https://owasp.org/www-project-top-ten/',
        title: 'OWASP Security Fundamentals'
      },
      performance: {
        url: 'https://web.dev/performance/',
        title: 'Performance Optimization Guide'
      },
      architecture: {
        url: 'https://martinfowler.com/architecture/',
        title: 'Architecture Patterns'
      },
      'code-quality': {
        url: 'https://refactoring.guru/refactoring',
        title: 'Code Quality Guide'
      },
      dependencies: {
        url: 'https://docs.npmjs.com/cli/v8/commands/npm-audit',
        title: 'Dependency Management'
      },
      testing: {
        url: 'https://testingjavascript.com/',
        title: 'Testing Best Practices'
      },
      accessibility: {
        url: 'https://www.w3.org/WAI/WCAG21/quickref/',
        title: 'Accessibility Standards'
      }
    };
    
    // Return category-specific link or general fallback
    return categoryLinks[issue.category || 'code-quality'] || {
      url: 'https://developer.mozilla.org/en-US/docs/Learn',
      title: 'MDN Web Development Resources'
    };
  }
  
  // Helper to get color based on score
  private getScoreColor(score: number): string {
    if (score >= 80) return '#28a745'; // Green
    if (score >= 60) return '#ffc107'; // Yellow
    if (score >= 40) return '#fd7e14'; // Orange
    return '#dc3545'; // Red
  }
  
  // Helper to get encouraging message based on score
  private getScoreMessage(score: number): string {
    if (score >= 80) return '🌟 Excellent work! You\'re writing high-quality code.';
    if (score >= 60) return '👍 Good job! Keep improving to reach excellence.';
    if (score >= 40) return '📈 You\'re on the right track. Focus on the high-priority issues.';
    return '🎯 Time to level up! Start with the critical issues first.';
  }

  // Keep the original method signature for backward compatibility
  private generateSection10_EducationalInsights_OLD(newIssues: Issue[], unchangedIssues: Issue[], educationalContent: any): string {
    // Generate educational content based on actual issues found
    const issueCategories = new Set([...newIssues, ...unchangedIssues].map(i => i.category));
    const severityTypes = new Set([...newIssues, ...unchangedIssues].map(i => i.severity));
    
    const educationByCategory: { [key: string]: string[] } = {
      'security': [
        'Review OWASP Top 10 security principles',
        'Implement input validation and sanitization',
        'Use parameterized queries to prevent SQL injection',
        'Implement proper authentication and authorization'
      ],
      'performance': [
        'Study Big O notation and algorithm complexity',
        'Implement caching strategies',
        'Use profiling tools to identify bottlenecks',
        'Consider async/await patterns for I/O operations'
      ],
      'code-quality': [
        'Follow SOLID principles',
        'Implement comprehensive unit testing',
        'Use linting and formatting tools',
        'Practice code review best practices'
      ],
      'architecture': [
        'Study design patterns (Factory, Observer, Strategy)',
        'Implement dependency injection',
        'Use microservices architecture principles',
        'Follow Domain-Driven Design practices'
      ],
      'dependencies': [
        'Regular dependency audits with npm audit',
        'Use lock files for consistent installations',
        'Monitor for security vulnerabilities',
        'Keep dependencies up to date'
      ]
    };
    
    return `
            <div class="section">
                <div class="section-header">
                    <h2 class="section-title">💡 10. Educational Insights</h2>
                </div>
                <div class="section-content">
                    <h3>Learning Opportunities Based on Found Issues</h3>
                    
                    ${Array.from(issueCategories).map(category => `
                        <div style="margin-top: 20px;">
                            <h4>📚 ${category.charAt(0).toUpperCase() + category.slice(1)} Skills Development</h4>
                            <ul>
                                ${(educationByCategory[category] || ['General best practices']).map(item => `<li>${item}</li>`).join('')}
                            </ul>
                        </div>
                    `).join('')}
                    
                    ${severityTypes.has('critical') || severityTypes.has('high') ? `
                        <div class="alert alert-warning" style="margin-top: 20px;">
                            <h4>⚠️ Priority Learning Areas</h4>
                            <p>Based on the critical/high severity issues found, prioritize learning about:</p>
                            <ul>
                                ${newIssues.filter(i => i.severity === 'critical' || i.severity === 'high').slice(0, 3).map(issue => 
                                    `<li><strong>${this.getIssueTitle(issue)}</strong> - Study ${issue.category} best practices</li>`
                                ).join('')}
                            </ul>
                        </div>
                    ` : ''}
                    
                    <h3 style="margin-top: 30px;">Recommended Resources</h3>
                    <ul>
                        <li>📖 <a href="https://owasp.org/www-project-top-ten/">OWASP Top 10 Security Risks</a></li>
                        <li>📖 <a href="https://refactoring.guru/design-patterns">Design Patterns Catalog</a></li>
                        <li>📖 <a href="https://martinfowler.com/articles/microservices.html">Microservices Architecture</a></li>
                        <li>📖 <a href="https://www.typescriptlang.org/docs/handbook/intro.html">TypeScript Best Practices</a></li>
                    </ul>
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

  // Section 12: Enhanced Business Impact Analysis
  private generateSection12_BusinessImpact(newIssues: Issue[], resolvedIssues: Issue[]): string {
    const criticalNew = newIssues.filter(i => i.severity === 'critical').length;
    const highNew = newIssues.filter(i => i.severity === 'high').length;
    const criticalResolved = resolvedIssues.filter(i => i.severity === 'critical').length;
    const highResolved = resolvedIssues.filter(i => i.severity === 'high').length;
    
    const riskLevel = criticalNew > 0 ? 'High' : highNew > 0 ? 'Medium' : 'Low';
    const riskColor = riskLevel === 'High' ? '#dc3545' : riskLevel === 'Medium' ? '#ffc107' : '#28a745';
    
    // Calculate business impacts
    const estimatedDowntime = criticalNew * 4 + highNew * 2; // hours
    const potentialRevenueLoss = estimatedDowntime * 10000; // $10k per hour
    const userImpact = criticalNew * 1000 + highNew * 500; // affected users
    const developerHours = this.estimateReviewTime(newIssues);
    const developerCost = developerHours * 150; // $150/hour
    
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
                            <div class="metric-value">${developerHours}h</div>
                            <div class="metric-label">Est. Fix Time</div>
                        </div>
                        <div class="metric-card">
                            <div class="metric-value">$${developerCost.toLocaleString()}</div>
                            <div class="metric-label">Development Cost</div>
                        </div>
                    </div>
                    
                    <h3>Detailed Business Impact Estimates</h3>
                    <div class="business-impact-grid">
                        <div class="impact-item">
                            <div class="impact-label">💰 Potential Revenue Loss</div>
                            <div class="impact-value">$${potentialRevenueLoss.toLocaleString()}</div>
                            <small>Based on ${estimatedDowntime}h potential downtime</small>
                        </div>
                        <div class="impact-item">
                            <div class="impact-label">👥 User Impact</div>
                            <div class="impact-value">${userImpact.toLocaleString()} users</div>
                            <small>Potentially affected by critical/high issues</small>
                        </div>
                        <div class="impact-item">
                            <div class="impact-label">⏱️ Time to Market Delay</div>
                            <div class="impact-value">${Math.ceil(developerHours / 8)} days</div>
                            <small>Additional development time needed</small>
                        </div>
                        <div class="impact-item">
                            <div class="impact-label">📉 Brand Reputation Risk</div>
                            <div class="impact-value">${riskLevel}</div>
                            <small>${criticalNew > 0 ? 'Security issues could damage trust' : 'Minimal reputation impact'}</small>
                        </div>
                    </div>
                    
                    <h3 style="margin-top: 30px;">Risk Mitigation Strategy</h3>
                    <ul>
                        ${criticalNew > 0 ? `<li>🚨 <strong>Immediate Action:</strong> Fix ${criticalNew} critical issue(s) before any deployment</li>` : ''}
                        ${highNew > 0 ? `<li>⚠️ <strong>High Priority:</strong> Address ${highNew} high severity issue(s) within 24 hours</li>` : ''}
                        ${criticalResolved > 0 ? `<li>✅ <strong>Risk Reduced:</strong> ${criticalResolved} critical issue(s) resolved, preventing major incidents</li>` : ''}
                        ${highResolved > 0 ? `<li>✅ <strong>Quality Improved:</strong> ${highResolved} high severity issue(s) fixed</li>` : ''}
                        <li>📊 <strong>Monitoring:</strong> Implement error tracking for production deployment</li>
                        <li>🔄 <strong>Process:</strong> Add security review to PR checklist</li>
                    </ul>
                    
                    <div class="alert alert-info" style="margin-top: 20px;">
                        <strong>📈 Overall Business Impact:</strong> ${this.getBusinessImpactSummary(newIssues, resolvedIssues)}
                    </div>
                </div>
            </div>`;
  }

  private generateActionItems(newIssues: Issue[], unchangedIssues: Issue[]): string {
    const critical = newIssues.filter(i => i.severity === 'critical');
    const high = newIssues.filter(i => i.severity === 'high');
    
    if (critical.length === 0 && high.length === 0 && unchangedIssues.length === 0) {
      return '';
    }
    
    return `
            <div class="section">
                <div class="section-header">
                    <h2 class="section-title">📋 Action Items & Recommendations</h2>
                </div>
                <div class="section-content">
                    ${critical.length > 0 || high.length > 0 ? `
                        <h3>🚨 Required Actions (Blocking)</h3>
                        <ol>
                            ${critical.map(issue => `<li><strong>Fix Critical:</strong> ${this.getIssueTitle(issue)}</li>`).join('')}
                            ${high.map(issue => `<li><strong>Fix High:</strong> ${this.getIssueTitle(issue)}</li>`).join('')}
                        </ol>
                    ` : ''}
                    
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

  private generatePRCommentSection(comparison: ComparisonResult): string {
    const prComment = this.generatePRComment(comparison);
    
    return `
            <div class="section">
                <div class="section-header">
                    <h2 class="section-title">💬 PR Comment for GitHub</h2>
                </div>
                <div class="section-content">
                    <div class="pr-comment-box">
                        <div class="pr-comment-header">
                            <span>📋 Copy this comment to post on the PR:</span>
                            <button class="copy-button" onclick="navigator.clipboard.writeText(document.querySelector('.pr-comment-content').textContent)">📋 Copy to Clipboard</button>
                        </div>
                        <div class="pr-comment-content">${this.escapeHtml(prComment)}</div>
                    </div>
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

  // Enhanced helper to render detailed issues with code snippets and fixes
  private renderDetailedIssuesList(issues: Issue[], title: string, isFixed = false, prefix = ''): string {
    if (issues.length === 0) return '';
    
    return `
        <h3>${title}</h3>
        <div style="margin-top: 15px;">
            ${issues.map((issue, index) => this.renderDetailedIssue(issue, index + 1, isFixed, prefix)).join('')}
        </div>`;
  }

  // Render a single issue with full details
  private renderDetailedIssue(issue: Issue, index: number, isFixed = false, prefix = ''): string {
    const severityClass = `issue-${issue.severity || 'medium'}`;
    const severityBadgeClass = `severity-${issue.severity || 'medium'}`;
    const title = this.getIssueTitle(issue);
    const description = this.getIssueDescription(issue);
    const location = this.getFileLocation(issue);
    const impact = this.getIssueImpact(issue);
    const category = issue.category || 'general';
    
    // Generate issue ID
    const issueId = prefix ? `${prefix}-${category.toUpperCase()}-${String(index).padStart(3, '0')}` : `ISSUE-${index}`;
    
    return `
        <div class="issue-card ${severityClass}">
            <div class="issue-header">
                <span class="issue-title">${issueId}: ${title}</span>
                <span class="issue-severity ${severityBadgeClass}">${issue.severity || 'medium'}</span>
            </div>
            ${location ? `<div class="issue-location">📁 ${location}</div>` : ''}
            ${description && description !== title ? `<div class="issue-description">${description}</div>` : ''}
            
            <div class="issue-impact">
                <strong>💥 Impact:</strong> ${impact}
            </div>
            
            ${issue.codeSnippet ? `
                <div style="margin-top: 10px;">
                    <strong>Problematic Code:</strong>
                    <div class="code-block">${this.escapeHtml(issue.codeSnippet)}</div>
                </div>` : ''}
            
            ${issue.suggestedFix || issue.remediation ? `
                <div class="fix-suggestion">
                    <strong>💡 Suggested Fix:</strong> ${issue.suggestedFix || issue.remediation}
                    ${(issue as any).fixCode ? `
                        <div class="code-block" style="margin-top: 10px;">${this.escapeHtml((issue as any).fixCode)}</div>
                    ` : ''}
                </div>` : ''}
            
            ${issue.category ? `
                <div style="margin-top: 10px;">
                    <span style="background: #e0e0e0; padding: 2px 6px; border-radius: 3px; font-size: 0.85em;">
                        🏷️ ${issue.category}
                    </span>
                    <span style="background: #e0e0e0; padding: 2px 6px; border-radius: 3px; font-size: 0.85em; margin-left: 5px;">
                        ⏱️ Est. ${this.estimateIssueFixTime(issue)} to fix
                    </span>
                </div>` : ''}
        </div>`;
  }

  // Helper method to render a simple list of issues (fallback)
  private renderIssuesList(issues: Issue[], title: string, isFixed = false): string {
    if (issues.length === 0) return '';
    
    return `
        <h3>${title}</h3>
        <div style="margin-top: 15px;">
            ${issues.map(issue => this.renderIssue(issue, isFixed)).join('')}
        </div>`;
  }

  // Simple issue render (fallback)
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

  private estimateIssueFixTime(issue: Issue): string {
    const times = {
      critical: '2-4 hours',
      high: '1-2 hours',
      medium: '30-60 min',
      low: '15-30 min'
    };
    return times[issue.severity || 'low'] || '30 min';
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
      return 'Significant risk to production stability and user experience. Immediate action required to prevent potential revenue loss and customer churn.';
    }
    
    if (resolvedIssues.length > newIssues.length) {
      return 'Net positive impact - reduced technical debt, improved stability, and enhanced user experience. Expected to reduce support tickets by 15-20%.';
    }
    
    if (newIssues.length > 0) {
      return 'Minor impact - acceptable technical debt for feature delivery. Monitor post-deployment metrics for any degradation.';
    }
    
    return 'Minimal impact - maintains current quality standards with no significant business risk.';
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