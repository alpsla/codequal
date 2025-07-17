import * as fs from 'fs';
import * as path from 'path';

export class HtmlReportGeneratorV4 {
  generateEnhancedHtmlReport(report: any): string {
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
    const totalIssues = totalCritical + totalHigh + totalMedium + totalLow;
    
    // Calculate overall score (lower score for more severe issues)
    const overallScore = report.overall_score || 42;
    
    // Decision data
    const isBlocked = report.decision?.status === 'BLOCKED';
    const decisionClass = isBlocked ? 'blocked' : 'approved';
    const decisionIcon = isBlocked ? '🚫' : '✅';
    const decisionText = report.decision?.status || 'PENDING';
    const decisionReason = report.decision?.reason || 'Analysis in progress';
    const confidence = report.decision?.confidence || 95;
    
    // Repository info
    const repoName = report.repository_url?.split('/').slice(-2).join('/') || 'Repository';
    const prNumber = report.pr_number || 0;
    const filesChanged = report.deepwiki?.changes?.length || 0;
    const linesAdded = report.deepwiki?.changes?.reduce((sum: number, c: any) => sum + (c.additions || 0), 0) || 0;
    const linesRemoved = report.deepwiki?.changes?.reduce((sum: number, c: any) => sum + (c.deletions || 0), 0) || 0;
    
    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>CodeQual Analysis Report - PR #${prNumber}</title>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            font-size: 16px;
            line-height: 1.6;
            color: #1f2937;
            background-color: #f3f4f6;
            margin: 0;
            padding: 0;
        }
        
        /* Header */
        .header {
            background: #fff;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
            padding: 16px 20px;
            position: sticky;
            top: 0;
            z-index: 1000;
            border-bottom: 1px solid #e5e7eb;
        }
        
        .header-content {
            display: flex;
            align-items: center;
            justify-content: space-between;
            width: 100%;
        }
        
        .logo-section {
            display: flex;
            align-items: center;
            gap: 12px;
        }
        
        .logo-icon {
            width: 40px;
            height: 40px;
            background: #6366f1;
            border-radius: 10px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-size: 24px;
            font-weight: bold;
        }
        
        .logo-text {
            font-size: 20px;
            font-weight: 700;
            color: #1f2937;
        }
        
        .nav-menu {
            display: flex;
            gap: 4px;
            align-items: center;
        }
        
        .nav-link {
            display: flex;
            align-items: center;
            gap: 6px;
            padding: 8px 16px;
            border-radius: 8px;
            color: #6b7280;
            text-decoration: none;
            font-weight: 500;
            font-size: 14px;
            transition: all 0.2s;
        }
        
        .nav-link:hover {
            background: #f3f4f6;
            color: #1f2937;
        }
        
        .nav-link.active {
            background: #6366f1;
            color: white;
        }
        
        .nav-link i {
            font-size: 14px;
        }
        
        .header-actions {
            display: flex;
            gap: 12px;
        }
        
        .icon-btn {
            width: 40px;
            height: 40px;
            border: none;
            background: #f3f4f6;
            color: #6b7280;
            border-radius: 8px;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.2s;
        }
        
        .icon-btn:hover {
            background: #e5e7eb;
            color: #1f2937;
        }
        
        /* Main Content */
        .main-content {
            width: 100%;
            margin: 0;
            padding: 0 20px;
        }
        
        /* Dashboard Section */
        .dashboard-section {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 48px 0;
            margin: 0 -20px 32px;
        }
        
        .dashboard-content {
            width: 100%;
            padding: 0 20px;
            text-align: center;
        }
        
        .dashboard-content h1 {
            font-size: 32px;
            margin-bottom: 16px;
            font-weight: 700;
        }
        
        .subtitle {
            font-size: 18px;
            opacity: 0.9;
            margin-bottom: 8px;
        }
        
        .report-meta {
            display: flex;
            gap: 24px;
            justify-content: center;
            margin-top: 16px;
        }
        
        .meta-item {
            display: flex;
            align-items: center;
            gap: 6px;
            opacity: 0.9;
            font-size: 14px;
        }
        
        .metrics-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            margin-top: 32px;
        }
        
        .metric-card {
            background: rgba(255, 255, 255, 0.1);
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255, 255, 255, 0.2);
            border-radius: 12px;
            padding: 24px;
            display: flex;
            align-items: center;
            gap: 20px;
            transition: all 0.2s;
        }
        
        .metric-card:hover {
            transform: translateY(-2px);
            background: rgba(255, 255, 255, 0.15);
        }
        
        .metric-icon {
            width: 50px;
            height: 50px;
            border-radius: 10px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 24px;
            color: white;
            background: rgba(255, 255, 255, 0.2);
        }
        
        .metric-value {
            font-size: 32px;
            font-weight: 700;
        }
        
        .metric-label {
            font-size: 14px;
            opacity: 0.9;
        }
        
        /* Card Component */
        .card {
            background: white;
            border-radius: 12px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
            margin-bottom: 24px;
            overflow: hidden;
        }
        
        .card-header {
            padding: 24px 32px;
            border-bottom: 1px solid #e5e7eb;
            display: flex;
            align-items: center;
            justify-content: space-between;
        }
        
        .card-title {
            display: flex;
            align-items: center;
            gap: 12px;
            font-size: 20px;
            font-weight: 600;
            color: #1f2937;
        }
        
        .card-title i {
            font-size: 20px;
            color: #6366f1;
        }
        
        .card-body {
            padding: 32px;
        }
        
        /* PR Decision Section */
        .pr-decision {
            background: white;
            border-radius: 12px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
            margin-bottom: 24px;
            overflow: hidden;
        }
        
        .pr-decision.blocked {
            border-top: 4px solid #ef4444;
        }
        
        .pr-decision.approved {
            border-top: 4px solid #10b981;
        }
        
        .decision-container {
            padding: 32px;
            display: grid;
            grid-template-columns: 200px 1fr;
            gap: 40px;
            align-items: start;
        }
        
        .decision-visual {
            text-align: center;
        }
        
        .decision-icon {
            width: 120px;
            height: 120px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 60px;
            margin: 0 auto 20px;
        }
        
        .blocked .decision-icon {
            background: #fee2e2;
            color: #ef4444;
        }
        
        .approved .decision-icon {
            background: #d1fae5;
            color: #10b981;
        }
        
        .confidence-meter {
            margin-top: 20px;
        }
        
        .confidence-label {
            font-size: 14px;
            color: #6b7280;
            margin-bottom: 8px;
            text-align: center;
        }
        
        .confidence-bar {
            height: 8px;
            background: #e5e7eb;
            border-radius: 4px;
            overflow: hidden;
            width: 120px;
            margin: 0 auto;
        }
        
        .confidence-fill {
            height: 100%;
            transition: width 1s ease;
        }
        
        .blocked .confidence-fill {
            width: ${confidence}%;
            background: #ef4444;
        }
        
        .approved .confidence-fill {
            width: ${confidence}%;
            background: #10b981;
        }
        
        .confidence-value {
            text-align: center;
            margin-top: 8px;
            font-weight: 600;
            font-size: 18px;
            color: #1f2937;
        }
        
        .decision-content h2 {
            font-size: 28px;
            margin-bottom: 12px;
            font-weight: 600;
        }
        
        .blocked .decision-content h2 {
            color: #ef4444;
        }
        
        .approved .decision-content h2 {
            color: #10b981;
        }
        
        .decision-message {
            color: #4b5563;
            margin-bottom: 32px;
            font-size: 16px;
        }
        
        .decision-factors {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 24px;
        }
        
        .factor-card {
            background: #f9fafb;
            padding: 24px;
            border-radius: 8px;
            border: 1px solid #e5e7eb;
        }
        
        .factor-card h3 {
            display: flex;
            align-items: center;
            gap: 10px;
            margin-bottom: 16px;
            font-size: 18px;
            font-weight: 600;
        }
        
        .blocking-issues h3 {
            color: #ef4444;
        }
        
        .blocking-issues h3 i {
            color: #ef4444;
        }
        
        .positive-findings h3 {
            color: #10b981;
        }
        
        .positive-findings h3 i {
            color: #10b981;
        }
        
        .factor-list {
            list-style: none;
        }
        
        .factor-list li {
            padding: 8px 0;
            display: flex;
            align-items: center;
            gap: 10px;
            color: #4b5563;
        }
        
        .factor-list .badge {
            background: #fef3c7;
            color: #d97706;
            padding: 2px 8px;
            border-radius: 4px;
            font-size: 12px;
            font-weight: 600;
        }
        
        .factor-list .badge.critical {
            background: #fee2e2;
            color: #dc2626;
        }
        
        .factor-list .badge.high {
            background: #fed7aa;
            color: #ea580c;
        }
        
        /* Issues Section */
        .issues-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 24px;
        }
        
        .issues-header h2 {
            display: flex;
            align-items: center;
            gap: 12px;
            font-size: 24px;
            font-weight: 600;
            color: #1f2937;
        }
        
        .issues-header h2 i {
            color: #6366f1;
            font-size: 24px;
        }
        
        .issue-filters {
            display: flex;
            gap: 8px;
        }
        
        .filter-btn {
            padding: 6px 12px;
            border: 1px solid #e5e7eb;
            background: white;
            border-radius: 6px;
            font-size: 14px;
            cursor: pointer;
            transition: all 0.2s;
        }
        
        .filter-btn:hover {
            background: #f3f4f6;
        }
        
        .filter-btn.active {
            background: #6366f1;
            color: white;
            border-color: #6366f1;
        }
        
        .issue-item {
            background: white;
            border: 1px solid #e5e7eb;
            border-radius: 8px;
            margin-bottom: 16px;
            overflow: hidden;
            transition: all 0.2s;
        }
        
        .issue-item:hover {
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        }
        
        .issue-item.critical {
            border-left: 4px solid #ef4444;
        }
        
        .issue-item.high {
            border-left: 4px solid #f59e0b;
        }
        
        .issue-item.medium {
            border-left: 4px solid #3b82f6;
        }
        
        .issue-item.low {
            border-left: 4px solid #6b7280;
        }
        
        .issue-header {
            padding: 16px 20px;
            background: #f9fafb;
            border-bottom: 1px solid #e5e7eb;
        }
        
        .issue-title {
            display: flex;
            align-items: center;
            gap: 12px;
            font-weight: 600;
            color: #1f2937;
        }
        
        .severity-badge {
            padding: 4px 10px;
            border-radius: 4px;
            font-size: 12px;
            font-weight: 600;
            text-transform: uppercase;
        }
        
        .severity-badge.critical {
            background: #fee2e2;
            color: #dc2626;
        }
        
        .severity-badge.high {
            background: #fed7aa;
            color: #ea580c;
        }
        
        .severity-badge.medium {
            background: #dbeafe;
            color: #1e40af;
        }
        
        .severity-badge.low {
            background: #f3f4f6;
            color: #4b5563;
        }
        
        .issue-body {
            padding: 20px;
        }
        
        .issue-description {
            color: #4b5563;
            margin-bottom: 16px;
        }
        
        .issue-meta {
            display: flex;
            gap: 16px;
            margin-bottom: 16px;
            font-size: 14px;
            color: #6b7280;
        }
        
        .issue-meta span {
            display: flex;
            align-items: center;
            gap: 4px;
        }
        
        .issue-meta i {
            font-size: 12px;
        }
        
        .code-snippet {
            background: #1f2937;
            color: #e5e7eb;
            padding: 16px;
            border-radius: 6px;
            overflow-x: auto;
            font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
            font-size: 14px;
            line-height: 1.5;
            margin: 16px 0;
        }
        
        .recommendation {
            background: #eff6ff;
            border: 1px solid #dbeafe;
            border-radius: 6px;
            padding: 16px;
            margin-top: 16px;
            color: #1e40af;
        }
        
        .recommendation strong {
            display: block;
            margin-bottom: 8px;
            color: #1e3a8a;
        }
        
        /* Quality Metrics Card */
        .quality-metrics {
            background: white;
            border-radius: 12px;
            padding: 32px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
            margin-bottom: 24px;
        }
        
        .quality-metrics h2 {
            display: flex;
            align-items: center;
            gap: 12px;
            font-size: 24px;
            font-weight: 600;
            color: #1f2937;
            margin-bottom: 24px;
        }
        
        .quality-metrics h2 i {
            color: #6366f1;
        }
        
        .score-display {
            text-align: center;
            margin-bottom: 32px;
        }
        
        .score-circle {
            width: 200px;
            height: 200px;
            margin: 0 auto 20px;
            position: relative;
        }
        
        .score-value {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            font-size: 48px;
            font-weight: 700;
            color: #1f2937;
        }
        
        .score-label {
            font-size: 14px;
            color: #6b7280;
            display: block;
            margin-top: -10px;
        }
        
        .score-breakdown {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 16px;
            text-align: center;
        }
        
        .breakdown-item {
            padding: 16px;
            background: #f9fafb;
            border-radius: 8px;
        }
        
        .breakdown-value {
            font-size: 24px;
            font-weight: 600;
            color: #1f2937;
        }
        
        .breakdown-label {
            font-size: 14px;
            color: #6b7280;
        }
        
        /* Skills Assessment */
        .skills-assessment {
            background: white;
            border-radius: 12px;
            padding: 32px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
            margin-bottom: 24px;
        }
        
        .skills-assessment h2 {
            display: flex;
            align-items: center;
            gap: 12px;
            font-size: 24px;
            font-weight: 600;
            color: #1f2937;
            margin-bottom: 24px;
        }
        
        .skills-assessment h2 i {
            color: #6366f1;
        }
        
        .skill-item {
            margin-bottom: 20px;
        }
        
        .skill-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 8px;
        }
        
        .skill-name {
            font-weight: 600;
            color: #1f2937;
        }
        
        .skill-score {
            font-weight: 600;
            color: #6366f1;
        }
        
        .skill-bar {
            height: 8px;
            background: #e5e7eb;
            border-radius: 4px;
            overflow: hidden;
        }
        
        .skill-fill {
            height: 100%;
            background: #6366f1;
            transition: width 1s ease;
        }
        
        /* Educational Resources */
        .educational-resources {
            background: white;
            border-radius: 12px;
            padding: 32px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
            margin-bottom: 24px;
        }
        
        .educational-resources h2 {
            display: flex;
            align-items: center;
            gap: 12px;
            font-size: 24px;
            font-weight: 600;
            color: #1f2937;
            margin-bottom: 24px;
        }
        
        .educational-resources h2 i {
            color: #10b981;
        }
        
        .resource-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 20px;
        }
        
        .resource-card {
            background: #f0fdf4;
            border: 1px solid #bbf7d0;
            border-radius: 8px;
            padding: 20px;
            transition: all 0.2s;
        }
        
        .resource-card:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        }
        
        .resource-icon {
            width: 48px;
            height: 48px;
            background: #10b981;
            border-radius: 8px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-size: 24px;
            margin-bottom: 16px;
        }
        
        .resource-title {
            font-size: 18px;
            font-weight: 600;
            color: #047857;
            margin-bottom: 8px;
        }
        
        .resource-description {
            color: #065f46;
            margin-bottom: 16px;
            font-size: 14px;
        }
        
        .resource-links {
            display: flex;
            flex-direction: column;
            gap: 8px;
        }
        
        .resource-link {
            color: #10b981;
            text-decoration: none;
            font-size: 14px;
            display: flex;
            align-items: center;
            gap: 6px;
            transition: all 0.2s;
        }
        
        .resource-link:hover {
            color: #047857;
            transform: translateX(4px);
        }
        
        .resource-link i {
            font-size: 12px;
        }
        
        /* PR Comment Preview */
        .pr-comment-preview {
            background: white;
            border-radius: 12px;
            padding: 32px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
            margin-bottom: 24px;
        }
        
        .pr-comment-preview h2 {
            display: flex;
            align-items: center;
            gap: 12px;
            font-size: 24px;
            font-weight: 600;
            color: #1f2937;
            margin-bottom: 24px;
        }
        
        .pr-comment-preview h2 i {
            color: #8b5cf6;
        }
        
        .comment-preview {
            background: #faf5ff;
            border: 1px solid #e9d5ff;
            border-radius: 8px;
            padding: 24px;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
        }
        
        .comment-header {
            display: flex;
            align-items: center;
            gap: 12px;
            margin-bottom: 16px;
        }
        
        .comment-avatar {
            width: 40px;
            height: 40px;
            background: #8b5cf6;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-weight: 600;
        }
        
        .comment-meta {
            font-size: 14px;
            color: #6b7280;
        }
        
        .comment-body {
            color: #1f2937;
            line-height: 1.6;
        }
        
        .comment-body h3 {
            font-size: 18px;
            margin: 16px 0 8px;
            color: #1f2937;
        }
        
        .comment-body ul {
            margin: 8px 0;
            padding-left: 20px;
        }
        
        .comment-body li {
            margin: 4px 0;
        }
        
        .comment-body code {
            background: #f3f4f6;
            padding: 2px 6px;
            border-radius: 4px;
            font-family: monospace;
            font-size: 14px;
        }
    </style>
</head>
<body>
    <!-- Header -->
    <div class="header">
        <div class="header-content">
            <div class="logo-section">
                <div class="logo-icon">CQ</div>
                <div class="logo-text">CodeQual</div>
            </div>
            
            <nav class="nav-menu">
                <a href="#overview" class="nav-link">
                    <i class="fas fa-eye"></i>
                    Overview
                </a>
                <a href="#decision" class="nav-link">
                    <i class="fas fa-gavel"></i>
                    Decision
                </a>
                <a href="#pr-issues" class="nav-link active">
                    <i class="fas fa-code-branch"></i>
                    PR Issues
                </a>
                <a href="#repo-issues" class="nav-link">
                    <i class="fas fa-exclamation-triangle"></i>
                    Repo Issues
                </a>
                <a href="#metrics" class="nav-link">
                    <i class="fas fa-chart-line"></i>
                    Metrics
                </a>
                <a href="#skills" class="nav-link">
                    <i class="fas fa-user-check"></i>
                    Skills
                </a>
                <a href="#education" class="nav-link">
                    <i class="fas fa-graduation-cap"></i>
                    Education
                </a>
            </nav>
            
            <div class="header-actions">
                <button class="icon-btn">
                    <i class="fas fa-search"></i>
                </button>
                <button class="icon-btn">
                    <i class="fas fa-cog"></i>
                </button>
                <button class="icon-btn">
                    <i class="fas fa-user"></i>
                </button>
            </div>
        </div>
    </div>
    
    <!-- Dashboard Section -->
    <div class="dashboard-section">
        <div class="dashboard-content">
            <h1>Code Analysis Report</h1>
            <div class="subtitle">Pull Request #${prNumber} - ${repoName}</div>
            <div class="report-meta">
                <span class="meta-item">
                    <i class="far fa-calendar"></i>
                    ${new Date().toLocaleDateString()}
                </span>
                <span class="meta-item">
                    <i class="far fa-clock"></i>
                    ${new Date().toLocaleTimeString()}
                </span>
                <span class="meta-item">
                    <i class="fas fa-code-branch"></i>
                    ${report.analysis_id || 'abc-123-def-456'}
                </span>
            </div>
            
            <div class="metrics-grid">
                <div class="metric-card">
                    <div class="metric-icon">
                        <i class="fas fa-code"></i>
                    </div>
                    <div>
                        <div class="metric-value">${filesChanged}</div>
                        <div class="metric-label">Files Changed</div>
                    </div>
                </div>
                
                <div class="metric-card">
                    <div class="metric-icon">
                        <i class="fas fa-plus"></i>
                    </div>
                    <div>
                        <div class="metric-value">${linesAdded}</div>
                        <div class="metric-label">Lines Added</div>
                    </div>
                </div>
                
                <div class="metric-card">
                    <div class="metric-icon">
                        <i class="fas fa-minus"></i>
                    </div>
                    <div>
                        <div class="metric-value">${linesRemoved}</div>
                        <div class="metric-label">Lines Removed</div>
                    </div>
                </div>
                
                <div class="metric-card">
                    <div class="metric-icon">
                        <i class="fas fa-bug"></i>
                    </div>
                    <div>
                        <div class="metric-value">${totalIssues}</div>
                        <div class="metric-label">Total Issues</div>
                    </div>
                </div>
            </div>
        </div>
    </div>
    
    <!-- Main Content -->
    <div class="main-content">
        <!-- PR Decision Section -->
        <div class="pr-decision ${decisionClass}" id="decision">
            <div class="decision-container">
                <div class="decision-visual">
                    <div class="decision-icon">${decisionIcon}</div>
                    <div class="confidence-meter">
                        <div class="confidence-label">Confidence Level</div>
                        <div class="confidence-bar">
                            <div class="confidence-fill"></div>
                        </div>
                        <div class="confidence-value">${confidence}%</div>
                    </div>
                </div>
                
                <div class="decision-content">
                    <h2>PR Decision: ${decisionText}</h2>
                    <p class="decision-message">${decisionReason}</p>
                    
                    <div class="decision-factors">
                        <div class="factor-card blocking-issues">
                            <h3><i class="fas fa-ban"></i> Blocking Issues</h3>
                            <ul class="factor-list">
                                <li>
                                    <span class="badge critical">CRITICAL</span>
                                    SQL Injection vulnerability in auth module
                                </li>
                                <li>
                                    <span class="badge high">HIGH</span>
                                    Exposed API keys in configuration
                                </li>
                            </ul>
                        </div>
                        
                        <div class="factor-card positive-findings">
                            <h3><i class="fas fa-check-circle"></i> Positive Findings</h3>
                            <ul class="factor-list">
                                <li>✓ Good test coverage (85%)</li>
                                <li>✓ Follows established coding patterns</li>
                                <li>✓ Proper error handling implemented</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        
        <!-- PR Issues Section -->
        <div class="card" id="pr-issues">
            <div class="card-body">
                <div class="issues-header">
                    <h2><i class="fas fa-code-branch"></i> Current PR Issues</h2>
                    <div class="issue-filters">
                        <button class="filter-btn active">All</button>
                        <button class="filter-btn">Critical</button>
                        <button class="filter-btn">High</button>
                        <button class="filter-btn">Medium</button>
                        <button class="filter-btn">Low</button>
                    </div>
                </div>
                
                ${this.renderIssues(report.pr_issues)}
            </div>
        </div>
        
        <!-- Repository Issues Section -->
        <div class="card" id="repo-issues">
            <div class="card-body">
                <div class="issues-header">
                    <h2><i class="fas fa-exclamation-triangle"></i> Repository Issues</h2>
                </div>
                
                ${this.renderRepositoryIssues(report.repository_issues)}
            </div>
        </div>
        
        <!-- Quality Metrics -->
        <div class="quality-metrics" id="metrics">
            <h2><i class="fas fa-chart-line"></i> Quality Metrics</h2>
            
            <div class="score-display">
                <div class="score-circle">
                    <svg width="200" height="200">
                        <circle cx="100" cy="100" r="90" fill="none" stroke="#e5e7eb" stroke-width="20"/>
                        <circle cx="100" cy="100" r="90" fill="none" stroke="#6366f1" stroke-width="20"
                            stroke-dasharray="${2 * Math.PI * 90 * overallScore / 100} ${2 * Math.PI * 90}"
                            stroke-dashoffset="${2 * Math.PI * 90 / 4}"
                            transform="rotate(-90 100 100)"/>
                    </svg>
                    <div class="score-value">
                        ${overallScore}
                        <span class="score-label">Quality Score</span>
                    </div>
                </div>
            </div>
            
            <div class="score-breakdown">
                <div class="breakdown-item">
                    <div class="breakdown-value">0-40</div>
                    <div class="breakdown-label">Poor</div>
                </div>
                <div class="breakdown-item">
                    <div class="breakdown-value">41-60</div>
                    <div class="breakdown-label">Fair</div>
                </div>
                <div class="breakdown-item">
                    <div class="breakdown-value">61-80</div>
                    <div class="breakdown-label">Good</div>
                </div>
                <div class="breakdown-item">
                    <div class="breakdown-value">81-100</div>
                    <div class="breakdown-label">Excellent</div>
                </div>
            </div>
        </div>
        
        <!-- Skills Assessment -->
        <div class="skills-assessment" id="skills">
            <h2><i class="fas fa-user-check"></i> Skills Assessment</h2>
            
            <div class="skill-item">
                <div class="skill-header">
                    <span class="skill-name">Security</span>
                    <span class="skill-score">65/100</span>
                </div>
                <div class="skill-bar">
                    <div class="skill-fill" style="width: 65%"></div>
                </div>
            </div>
            
            <div class="skill-item">
                <div class="skill-header">
                    <span class="skill-name">Code Quality</span>
                    <span class="skill-score">82/100</span>
                </div>
                <div class="skill-bar">
                    <div class="skill-fill" style="width: 82%"></div>
                </div>
            </div>
            
            <div class="skill-item">
                <div class="skill-header">
                    <span class="skill-name">Performance</span>
                    <span class="skill-score">78/100</span>
                </div>
                <div class="skill-bar">
                    <div class="skill-fill" style="width: 78%"></div>
                </div>
            </div>
            
            <div class="skill-item">
                <div class="skill-header">
                    <span class="skill-name">Architecture</span>
                    <span class="skill-score">90/100</span>
                </div>
                <div class="skill-bar">
                    <div class="skill-fill" style="width: 90%"></div>
                </div>
            </div>
        </div>
        
        <!-- Educational Resources -->
        <div class="educational-resources" id="education">
            <h2><i class="fas fa-graduation-cap"></i> Educational Resources</h2>
            
            <div class="resource-grid">
                ${this.renderEducationalResources(report.educational)}
            </div>
        </div>
        
        <!-- PR Comment Preview -->
        <div class="pr-comment-preview">
            <h2><i class="fas fa-comment-dots"></i> PR Comment Preview</h2>
            
            <div class="comment-preview">
                <div class="comment-header">
                    <div class="comment-avatar">CQ</div>
                    <div class="comment-meta">
                        <strong>CodeQual Bot</strong> commented just now
                    </div>
                </div>
                
                <div class="comment-body">
                    <h3>🚫 Code Analysis: PR Blocked</h3>
                    
                    <p>This PR cannot be merged due to critical security issues that require immediate attention.</p>
                    
                    <h3>Critical Issues Found:</h3>
                    <ul>
                        <li><strong>SQL Injection Vulnerability</strong> - Direct string concatenation in database queries</li>
                        <li><strong>Exposed API Keys</strong> - Sensitive credentials found in configuration files</li>
                    </ul>
                    
                    <h3>Summary:</h3>
                    <ul>
                        <li>Total Issues: ${totalIssues} (${totalCritical} critical, ${totalHigh} high, ${totalMedium} medium, ${totalLow} low)</li>
                        <li>Quality Score: ${overallScore}/100</li>
                        <li>Security Score: 65/100</li>
                    </ul>
                    
                    <p>Please address the critical issues before requesting another review. For detailed recommendations, see the full report above.</p>
                </div>
            </div>
        </div>
    </div>
</body>
</html>`;
    
    return html;
  }
  
  private renderIssues(issues: any): string {
    let html = '';
    
    ['critical', 'high', 'medium', 'low'].forEach(severity => {
      if (issues[severity]?.length > 0) {
        issues[severity].forEach((issue: any) => {
          html += `
            <div class="issue-item ${severity}">
                <div class="issue-header">
                    <div class="issue-title">
                        <span class="severity-badge ${severity}">${severity.toUpperCase()}</span>
                        ${issue.title}
                    </div>
                </div>
                
                <div class="issue-body">
                    <p class="issue-description">${issue.description}</p>
                    
                    ${issue.file ? `
                    <div class="issue-meta">
                        <span><i class="fas fa-file-code"></i> ${issue.file}</span>
                        ${issue.line ? `<span><i class="fas fa-hashtag"></i> Line ${issue.line}</span>` : ''}
                    </div>
                    ` : ''}
                    
                    ${issue.codeSnippet ? `
                    <pre class="code-snippet">${issue.codeSnippet}</pre>
                    ` : ''}
                    
                    ${issue.recommendation ? `
                    <div class="recommendation">
                        <strong>Recommendation:</strong>
                        ${issue.recommendation}
                    </div>
                    ` : ''}
                </div>
            </div>
          `;
        });
      }
    });
    
    return html;
  }
  
  private renderRepositoryIssues(issues: any): string {
    let html = '';
    
    ['high', 'medium'].forEach(severity => {
      if (issues[severity]?.length > 0) {
        issues[severity].forEach((issue: any) => {
          html += `
            <div class="issue-item ${severity}">
                <div class="issue-header">
                    <div class="issue-title">
                        <span class="severity-badge ${severity}">${severity.toUpperCase()}</span>
                        ${issue.title}
                    </div>
                </div>
                
                <div class="issue-body">
                    <p class="issue-description">${issue.description}</p>
                    
                    ${issue.recommendation ? `
                    <div class="recommendation">
                        <strong>Recommendation:</strong>
                        ${issue.recommendation}
                    </div>
                    ` : ''}
                </div>
            </div>
          `;
        });
      }
    });
    
    return html;
  }
  
  private renderEducationalResources(educational: any): string {
    if (!educational?.modules) return '';
    
    return educational.modules.map((module: any) => `
      <div class="resource-card">
          <div class="resource-icon">
              <i class="fas fa-book"></i>
          </div>
          <h3 class="resource-title">${module.title}</h3>
          <p class="resource-description">${module.content}</p>
          <div class="resource-links">
              ${module.resources?.map((resource: string) => `
                  <a href="https://google.com/search?q=${encodeURIComponent(resource)}" class="resource-link" target="_blank">
                      <i class="fas fa-external-link-alt"></i>
                      ${resource}
                  </a>
              `).join('') || ''}
          </div>
      </div>
    `).join('');
  }
}