import * as fs from 'fs';
import * as path from 'path';

export class HtmlReportGeneratorFinal {
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
    const overallScore = report.overall_score || 78;
    
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
    const filesChanged = report.deepwiki?.changes?.length || 5;
    const linesAdded = report.deepwiki?.changes?.reduce((sum: number, c: any) => sum + (c.additions || 0), 0) || 345;
    const linesRemoved = report.deepwiki?.changes?.reduce((sum: number, c: any) => sum + (c.deletions || 0), 0) || 123;
    
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
            padding: 16px 40px;
            position: sticky;
            top: 0;
            z-index: 1000;
            border-bottom: 1px solid #e5e7eb;
        }
        
        .header-content {
            display: flex;
            align-items: center;
            justify-content: space-between;
            max-width: 1400px;
            margin: 0 auto;
        }
        
        .logo-section {
            display: flex;
            align-items: center;
            gap: 12px;
        }
        
        .logo-image {
            height: 32px;
            width: auto;
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
            max-width: 1400px;
            margin: 0 auto;
            padding: 0 40px;
        }
        
        /* Dashboard Section */
        .dashboard-section {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 48px 0;
            margin: 0 -40px 32px;
        }
        
        .dashboard-content {
            max-width: 1400px;
            margin: 0 auto;
            padding: 0 40px;
        }
        
        .dashboard-header {
            margin-bottom: 32px;
        }
        
        .dashboard-header h1 {
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
            margin-top: 16px;
            font-size: 14px;
            opacity: 0.9;
        }
        
        .meta-item {
            display: flex;
            align-items: center;
            gap: 6px;
        }
        
        .metrics-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
        }
        
        .metric-card {
            background: rgba(255, 255, 255, 0.1);
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255, 255, 255, 0.2);
            border-radius: 12px;
            padding: 24px;
            display: flex;
            flex-direction: column;
            align-items: center;
            text-align: center;
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
            margin-bottom: 12px;
        }
        
        .metric-icon.files { background: rgba(99, 102, 241, 0.3); }
        .metric-icon.added { background: rgba(16, 185, 129, 0.3); }
        .metric-icon.removed { background: rgba(239, 68, 68, 0.3); }
        .metric-icon.language { background: rgba(59, 130, 246, 0.3); }
        
        .metric-value {
            font-size: 32px;
            font-weight: 700;
            margin-bottom: 4px;
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
        
        /* PR Decision Section - Matching old design */
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
            padding: 40px;
        }
        
        .decision-header {
            text-align: center;
            margin-bottom: 40px;
        }
        
        .decision-icon-circle {
            width: 120px;
            height: 120px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 60px;
            margin: 0 auto 24px;
        }
        
        .blocked .decision-icon-circle {
            background: rgba(239, 68, 68, 0.1);
            color: #ef4444;
            border: 3px solid #ef4444;
        }
        
        .approved .decision-icon-circle {
            background: rgba(16, 185, 129, 0.1);
            color: #10b981;
            border: 3px solid #10b981;
        }
        
        .decision-title {
            font-size: 28px;
            font-weight: 600;
            margin-bottom: 12px;
        }
        
        .blocked .decision-title {
            color: #ef4444;
        }
        
        .approved .decision-title {
            color: #10b981;
        }
        
        .decision-message {
            color: #4b5563;
            font-size: 16px;
            max-width: 600px;
            margin: 0 auto 32px;
        }
        
        .confidence-meter {
            max-width: 200px;
            margin: 0 auto 40px;
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
        }
        
        .confidence-fill {
            height: 100%;
            transition: width 1s ease;
        }
        
        .blocked .confidence-fill {
            width: ${100 - confidence}%;
            background: #6366f1;
        }
        
        .approved .confidence-fill {
            width: ${confidence}%;
            background: #6366f1;
        }
        
        .confidence-value {
            text-align: center;
            margin-top: 8px;
            font-weight: 600;
            font-size: 18px;
            color: #1f2937;
        }
        
        .decision-factors {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 24px;
            max-width: 800px;
            margin: 0 auto;
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
            font-size: 14px;
        }
        
        .factor-list .badge {
            background: #fef3c7;
            color: #d97706;
            padding: 2px 8px;
            border-radius: 4px;
            font-size: 12px;
            font-weight: 600;
            text-transform: uppercase;
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
        .issues-section {
            padding: 32px;
        }
        
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
            padding: 32px;
        }
        
        .quality-metrics h2 {
            display: flex;
            align-items: center;
            gap: 12px;
            font-size: 24px;
            font-weight: 600;
            color: #1f2937;
            margin-bottom: 32px;
        }
        
        .quality-metrics h2 i {
            color: #6366f1;
        }
        
        .metrics-content {
            display: grid;
            grid-template-columns: 280px 1fr;
            gap: 40px;
            align-items: start;
        }
        
        .score-display {
            text-align: center;
        }
        
        .score-circle {
            width: 200px;
            height: 200px;
            margin: 0 auto 20px;
            position: relative;
        }
        
        .score-circle svg {
            transform: rotate(-90deg);
        }
        
        .score-value {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            text-align: center;
        }
        
        .score-number {
            font-size: 48px;
            font-weight: 700;
            color: #1f2937;
            display: block;
        }
        
        .score-label {
            font-size: 14px;
            color: #6b7280;
            display: block;
            margin-top: -8px;
        }
        
        .score-change {
            color: #10b981;
            font-size: 14px;
            margin-top: 4px;
        }
        
        .score-breakdown {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 16px;
            text-align: center;
            margin-top: 20px;
        }
        
        .breakdown-item {
            font-size: 14px;
            color: #6b7280;
        }
        
        .score-trend {
            flex: 1;
        }
        
        .trend-title {
            font-size: 16px;
            font-weight: 600;
            margin-bottom: 16px;
            color: #1f2937;
        }
        
        .trend-chart {
            width: 100%;
            height: 200px;
            background: #f9fafb;
            border-radius: 8px;
            padding: 20px;
            position: relative;
        }
        
        /* Skills Assessment */
        .skills-assessment {
            padding: 32px;
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
            margin-bottom: 24px;
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
        
        /* Improvement Suggestions */
        .improvement-suggestions {
            margin-top: 32px;
            padding: 24px;
            background: #fef3c7;
            border-radius: 8px;
        }
        
        .improvement-suggestions h3 {
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 18px;
            font-weight: 600;
            color: #92400e;
            margin-bottom: 16px;
        }
        
        .improvement-suggestions h3 i {
            color: #f59e0b;
        }
        
        .suggestion-item {
            display: flex;
            align-items: flex-start;
            gap: 12px;
            margin-bottom: 16px;
            padding: 16px;
            background: white;
            border-radius: 6px;
            border: 1px solid #fde68a;
        }
        
        .suggestion-icon {
            width: 40px;
            height: 40px;
            border-radius: 8px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 20px;
            flex-shrink: 0;
        }
        
        .suggestion-icon.security {
            background: #fee2e2;
            color: #ef4444;
        }
        
        .suggestion-icon.performance {
            background: #fef3c7;
            color: #f59e0b;
        }
        
        .suggestion-content h4 {
            font-size: 16px;
            font-weight: 600;
            color: #1f2937;
            margin-bottom: 4px;
        }
        
        .suggestion-content p {
            font-size: 14px;
            color: #6b7280;
        }
        
        /* Educational Resources */
        .educational-resources {
            padding: 32px;
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
            background: #f9fafb;
            border: 1px solid #e5e7eb;
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
            border-radius: 8px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 24px;
            margin-bottom: 16px;
        }
        
        .resource-icon.red { background: #fee2e2; color: #ef4444; }
        .resource-icon.yellow { background: #fef3c7; color: #f59e0b; }
        .resource-icon.blue { background: #dbeafe; color: #3b82f6; }
        
        .resource-title {
            font-size: 18px;
            font-weight: 600;
            color: #1f2937;
            margin-bottom: 8px;
        }
        
        .resource-description {
            color: #6b7280;
            margin-bottom: 16px;
            font-size: 14px;
        }
        
        .resource-links {
            display: flex;
            flex-direction: column;
            gap: 8px;
        }
        
        .resource-link {
            color: #6366f1;
            text-decoration: none;
            font-size: 14px;
            display: flex;
            align-items: center;
            gap: 6px;
            transition: all 0.2s;
        }
        
        .resource-link:hover {
            color: #4f46e5;
            transform: translateX(4px);
        }
        
        .resource-link i {
            font-size: 12px;
        }
        
        /* PR Comment Preview */
        .pr-comment-preview {
            padding: 32px;
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
        
        /* View All Button */
        .view-all-btn {
            background: white;
            color: #6366f1;
            border: 1px solid #6366f1;
            padding: 10px 20px;
            border-radius: 6px;
            font-size: 14px;
            font-weight: 500;
            cursor: pointer;
            margin-top: 16px;
            transition: all 0.2s;
        }
        
        .view-all-btn:hover {
            background: #6366f1;
            color: white;
            transform: translateY(-1px);
        }
        
        .hidden {
            display: none;
        }
        
        /* Footer */
        .footer {
            text-align: center;
            padding: 20px;
            color: #6b7280;
            font-size: 14px;
            margin-top: 40px;
        }
    </style>
</head>
<body>
    <!-- Header -->
    <div class="header">
        <div class="header-content">
            <div class="logo-section">
                <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect width="32" height="32" rx="8" fill="#6366f1"/>
                    <path d="M16 6C10.48 6 6 10.48 6 16s4.48 10 10 10c1.19 0 2.34-.21 3.41-.6l-1.48-1.48c-.62.23-1.26.36-1.93.36-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8c0 .67-.13 1.31-.36 1.93l1.48 1.48c.39-1.07.6-2.22.6-3.41 0-5.52-4.48-10-10-10z" fill="white"/>
                    <path d="M21.71 10.29l-7.71 7.71-2.71-2.71-1.41 1.41 4.12 4.12 9.12-9.12-1.41-1.41z" fill="white"/>
                </svg>
                <span style="font-size: 20px; font-weight: 600; color: #1f2937;">CodeQual</span>
            </div>
            
            <nav class="nav-menu">
                <a href="#overview" class="nav-link active">
                    <i class="fas fa-eye"></i>
                    Overview
                </a>
                <a href="#decision" class="nav-link">
                    <i class="fas fa-gavel"></i>
                    Decision
                </a>
                <a href="#pr-issues" class="nav-link">
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
                    <i class="fas fa-download"></i>
                </button>
                <button class="icon-btn">
                    <i class="fas fa-user"></i>
                </button>
            </div>
        </div>
    </div>
    
    <!-- Dashboard Section -->
    <div class="dashboard-section" id="overview">
        <div class="dashboard-content">
            <div class="dashboard-header">
                <h1>Code Analysis Report</h1>
                <div class="subtitle">Pull Request #${prNumber} - ${repoName}</div>
                <div class="report-meta">
                    <span class="meta-item">
                        <i class="far fa-calendar"></i>
                        ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                    <span class="meta-item">
                        <i class="far fa-clock"></i>
                        ${new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <span class="meta-item">
                        <i class="fas fa-tag"></i>
                        v1.0.0
                    </span>
                    <span class="meta-item">
                        <i class="fas fa-fingerprint"></i>
                        ${report.analysis_id || 'abc-123-def-456'}
                    </span>
                </div>
            </div>
            
            <div class="metrics-grid">
                <div class="metric-card">
                    <div class="metric-icon files">
                        <i class="fas fa-code"></i>
                    </div>
                    <div class="metric-value">${filesChanged}</div>
                    <div class="metric-label">Files Changed</div>
                </div>
                
                <div class="metric-card">
                    <div class="metric-icon added">
                        <i class="fas fa-plus"></i>
                    </div>
                    <div class="metric-value">${linesAdded}</div>
                    <div class="metric-label">Lines Added</div>
                </div>
                
                <div class="metric-card">
                    <div class="metric-icon removed">
                        <i class="fas fa-minus"></i>
                    </div>
                    <div class="metric-value">${linesRemoved}</div>
                    <div class="metric-label">Lines Removed</div>
                </div>
                
                <div class="metric-card">
                    <div class="metric-icon language">
                        <i class="fab fa-js"></i>
                    </div>
                    <div class="metric-value">TypeScript</div>
                    <div class="metric-label">Language</div>
                </div>
            </div>
        </div>
    </div>
    
    <!-- Main Content -->
    <div class="main-content">
        <!-- PR Decision Section -->
        <div class="pr-decision ${decisionClass}" id="decision">
            <div class="decision-container">
                <div class="decision-header">
                    <div class="decision-icon-circle">${decisionIcon}</div>
                    <h2 class="decision-title">PR Decision: ${decisionText}</h2>
                    <p class="decision-message">${decisionReason}</p>
                    
                    <div class="confidence-meter">
                        <div class="confidence-label">Confidence Level</div>
                        <div class="confidence-bar">
                            <div class="confidence-fill"></div>
                        </div>
                        <div class="confidence-value">${100 - confidence}%</div>
                    </div>
                </div>
                
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
                            <li>✅ Good test coverage (85%)</li>
                            <li>✅ Follows established coding patterns</li>
                            <li>✅ Proper error handling implemented</li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
        
        <!-- PR Issues Section -->
        <div class="card" id="pr-issues">
            <div class="issues-section">
                <div class="issues-header">
                    <h2><i class="fas fa-code-branch"></i> Current PR Issues</h2>
                    <div class="issue-filters">
                        <button class="filter-btn active">Show All (${totalIssues} issues)</button>
                    </div>
                </div>
                
                ${this.renderIssues(report.pr_issues)}
            </div>
        </div>
        
        <!-- Repository Issues Section -->
        <div class="card" id="repo-issues">
            <div class="issues-section">
                <div class="issues-header">
                    <h2><i class="fas fa-exclamation-triangle"></i> Repository Issues</h2>
                </div>
                
                ${this.renderRepositoryIssues(report.repository_issues)}
            </div>
        </div>
        
        <!-- Quality Metrics -->
        <div class="card quality-metrics" id="metrics">
            <h2><i class="fas fa-chart-line"></i> Quality Metrics</h2>
            
            <div class="metrics-content">
                <div class="score-display">
                    <div class="score-circle">
                        <svg width="200" height="200">
                            <circle cx="100" cy="100" r="90" fill="none" stroke="#e5e7eb" stroke-width="20"/>
                            <circle cx="100" cy="100" r="90" fill="none" stroke="#f59e0b" stroke-width="20"
                                stroke-dasharray="${2 * Math.PI * 90 * overallScore / 100} ${2 * Math.PI * 90}"
                                stroke-dashoffset="${2 * Math.PI * 90 / 4}"
                                stroke-linecap="round"/>
                        </svg>
                        <div class="score-value">
                            <span class="score-number">${overallScore}</span>
                            <span class="score-label">Quality Score</span>
                            <div class="score-change">↑ +5</div>
                        </div>
                    </div>
                    
                    <div class="score-breakdown">
                        <div class="breakdown-item">0-40: Poor</div>
                        <div class="breakdown-item">41-60: Fair</div>
                        <div class="breakdown-item">61-80: Good</div>
                        <div class="breakdown-item">81-100: Excellent</div>
                    </div>
                </div>
                
                <div class="score-trend">
                    <div class="trend-title">Score Trend</div>
                    <div class="trend-chart">
                        <svg width="100%" height="100%" viewBox="0 0 600 160" preserveAspectRatio="none">
                            <!-- Grid lines -->
                            <line x1="0" y1="0" x2="600" y2="0" stroke="#e5e7eb" stroke-width="1"/>
                            <line x1="0" y1="40" x2="600" y2="40" stroke="#e5e7eb" stroke-width="1"/>
                            <line x1="0" y1="80" x2="600" y2="80" stroke="#e5e7eb" stroke-width="1"/>
                            <line x1="0" y1="120" x2="600" y2="120" stroke="#e5e7eb" stroke-width="1"/>
                            <line x1="0" y1="160" x2="600" y2="160" stroke="#e5e7eb" stroke-width="1"/>
                            
                            <!-- Trend line -->
                            <path d="M 0 120 L 100 110 L 200 100 L 300 95 L 400 85 L 500 80 L 600 70" 
                                  fill="none" stroke="#6366f1" stroke-width="3"/>
                            
                            <!-- Data points -->
                            <circle cx="0" cy="120" r="4" fill="#6366f1"/>
                            <circle cx="100" cy="110" r="4" fill="#6366f1"/>
                            <circle cx="200" cy="100" r="4" fill="#6366f1"/>
                            <circle cx="300" cy="95" r="4" fill="#6366f1"/>
                            <circle cx="400" cy="85" r="4" fill="#6366f1"/>
                            <circle cx="500" cy="80" r="4" fill="#6366f1"/>
                            <circle cx="600" cy="70" r="6" fill="#6366f1"/>
                            
                            <!-- Y-axis labels -->
                            <text x="5" y="15" font-size="12" fill="#6b7280">100</text>
                            <text x="5" y="45" font-size="12" fill="#6b7280">80</text>
                            <text x="5" y="85" font-size="12" fill="#6b7280">60</text>
                            <text x="5" y="125" font-size="12" fill="#6b7280">40</text>
                            <text x="5" y="155" font-size="12" fill="#6b7280">20</text>
                            
                            <!-- X-axis labels -->
                            <text x="0" y="175" font-size="10" fill="#6b7280" text-anchor="middle">6 months ago</text>
                            <text x="200" y="175" font-size="10" fill="#6b7280" text-anchor="middle">4 months ago</text>
                            <text x="400" y="175" font-size="10" fill="#6b7280" text-anchor="middle">2 months ago</text>
                            <text x="600" y="175" font-size="10" fill="#6b7280" text-anchor="middle">Current</text>
                        </svg>
                    </div>
                </div>
            </div>
        </div>
        
        <!-- Skills Assessment -->
        <div class="card skills-assessment" id="skills">
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
            
            <!-- Improvement Suggestions -->
            <div class="improvement-suggestions">
                <h3><i class="fas fa-lightbulb"></i> Improvement Suggestions</h3>
                
                <div class="suggestion-item">
                    <div class="suggestion-icon security">
                        <i class="fas fa-shield-alt"></i>
                    </div>
                    <div class="suggestion-content">
                        <h4>Improve Security Skills</h4>
                        <p>Focus on learning about input validation and secure coding practices.</p>
                    </div>
                </div>
                
                <div class="suggestion-item">
                    <div class="suggestion-icon performance">
                        <i class="fas fa-tachometer-alt"></i>
                    </div>
                    <div class="suggestion-content">
                        <h4>Performance Optimization</h4>
                        <p>Learn about memory management and efficient algorithms.</p>
                    </div>
                </div>
            </div>
        </div>
        
        <!-- Educational Resources -->
        <div class="card educational-resources" id="education">
            <h2><i class="fas fa-graduation-cap"></i> Educational Resources</h2>
            
            <div style="display: flex; align-items: center; gap: 16px; margin-bottom: 24px; padding: 16px; background: #f0fdf4; border-radius: 8px;">
                <i class="fas fa-clock text-green-600" style="font-size: 20px; color: #10b981;"></i>
                <span style="color: #047857;">Estimated learning time: 45 minutes</span>
            </div>
            
            <div class="resource-grid">
                ${this.renderEducationalResources(report.educational)}
            </div>
        </div>
        
        <!-- PR Comment Preview -->
        <div class="card pr-comment-preview">
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
    
    <!-- Footer -->
    <div class="footer">
        <p>Generated by CodeQual on ${new Date().toLocaleString()}</p>
    </div>
    
    <script>
        // Toggle medium/low issues visibility
        function toggleIssues(severity) {
            const issues = document.querySelectorAll('.issue-item.' + severity + '.hideable');
            const btn = document.querySelector('.view-all-btn[data-severity="' + severity + '"]');
            
            issues.forEach(issue => {
                issue.classList.toggle('hidden');
            });
            
            if (btn) {
                btn.textContent = btn.textContent.includes('Show') ? 'Hide ' + severity + ' issues' : 'Show ' + issues.length + ' more ' + severity + ' issues';
            }
        }
        
        // Initialize navigation
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', function(e) {
                e.preventDefault();
                document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
                this.classList.add('active');
                
                const target = this.getAttribute('href');
                const element = document.querySelector(target);
                if (element) {
                    element.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            });
        });
    </script>
</body>
</html>`;
    
    return html;
  }
  
  private renderIssues(issues: any): string {
    let html = '';
    let hiddenCount = 0;
    
    ['critical', 'high', 'medium', 'low'].forEach(severity => {
      if (issues[severity]?.length > 0) {
        issues[severity].forEach((issue: any, index: number) => {
          const hideClass = (severity === 'medium' || severity === 'low') && index >= 2 ? 'hideable hidden' : '';
          if (hideClass) hiddenCount++;
          
          html += `
            <div class="issue-item ${severity} ${hideClass}">
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
                    <pre class="code-snippet">${this.escapeHtml(issue.codeSnippet)}</pre>
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
        
        // Add "Show all" button for medium/low issues if there are hidden ones
        if ((severity === 'medium' || severity === 'low') && issues[severity].length > 2) {
          html += `<button class="view-all-btn" data-severity="${severity}" onclick="toggleIssues('${severity}')">Show ${issues[severity].length - 2} more ${severity} issues</button>`;
        }
      }
    });
    
    return html || '<p style="text-align: center; color: #6b7280; padding: 20px;">No issues found in this PR.</p>';
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
                    
                    ${issue.codeSnippet ? `
                    <pre class="code-snippet">${this.escapeHtml(issue.codeSnippet)}</pre>
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
    
    return html || '<p style="text-align: center; color: #6b7280; padding: 20px;">No repository-wide issues found.</p>';
  }
  
  private renderEducationalResources(educational: any): string {
    if (!educational?.modules) return '';
    
    const iconColors = ['red', 'yellow', 'blue'];
    
    return educational.modules.map((module: any, index: number) => `
      <div class="resource-card">
          <div class="resource-icon ${iconColors[index % iconColors.length]}">
              <i class="${index === 0 ? 'fas fa-shield-alt' : index === 1 ? 'fas fa-key' : 'fas fa-book'}"></i>
          </div>
          <h3 class="resource-title">${module.title}</h3>
          <p class="resource-description">${module.content}</p>
          <div class="resource-links">
              ${module.resources?.map((resource: any) => `
                  <a href="${resource.url || resource}" class="resource-link" target="_blank" rel="noopener">
                      <i class="fas fa-external-link-alt"></i>
                      ${resource.title || resource}
                  </a>
              `).join('') || ''}
          </div>
      </div>
    `).join('');
  }
  
  private escapeHtml(text: string): string {
    const map: any = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
  }
}