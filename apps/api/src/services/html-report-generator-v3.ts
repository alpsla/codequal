import * as fs from 'fs';
import * as path from 'path';

export class HtmlReportGeneratorV3 {
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
    const decisionIcon = isBlocked ? '⛔' : '✅';
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
        /* CSS Variables for Theming */
        :root {
            /* Light Mode Colors */
            --bg-primary: #ffffff;
            --bg-secondary: #f8f9fa;
            --bg-tertiary: #e9ecef;
            --text-primary: #212529;
            --text-secondary: #6c757d;
            --text-tertiary: #adb5bd;
            
            /* Brand Colors */
            --primary: #6366f1;
            --primary-dark: #4f46e5;
            --primary-light: #818cf8;
            --secondary: #ec4899;
            --success: #10b981;
            --warning: #f59e0b;
            --danger: #ef4444;
            --info: #3b82f6;
            
            /* Gradients */
            --primary-gradient: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            --success-gradient: linear-gradient(135deg, #10b981 0%, #059669 100%);
            --danger-gradient: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
            --warning-gradient: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
            --info-gradient: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
            
            /* Shadows */
            --shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
            --shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06);
            --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
            --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
            --shadow-xl: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
            
            /* Transitions */
            --transition-base: all 0.2s ease;
            --transition-slow: all 0.3s ease;
            --transition-fast: all 0.1s ease;
            
            /* Spacing */
            --header-height: 60px;
        }
        
        /* Reset and Base */
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            font-size: 16px;
            line-height: 1.6;
            color: var(--text-primary);
            background-color: var(--bg-tertiary);
            margin: 0;
            padding: 0;
        }
        
        /* Fixed Header */
        .fixed-header {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            height: var(--header-height);
            background: var(--bg-primary);
            box-shadow: var(--shadow);
            z-index: 1000;
            transition: var(--transition-base);
        }
        
        .header-container {
            max-width: 100%;
            margin: 0 auto;
            height: 100%;
            padding: 0 20px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 20px;
        }
        
        .logo-section {
            display: flex;
            align-items: center;
            gap: 10px;
            font-size: 1.25rem;
            font-weight: 700;
        }
        
        .logo-icon {
            width: 30px;
            height: 30px;
            background: var(--primary);
            border-radius: 8px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-size: 1.2rem;
        }
        
        .logo-text {
            font-size: 1.25rem;
            font-weight: 700;
            color: var(--primary);
        }
        
        /* Navigation */
        .nav-menu {
            flex: 1;
            display: flex;
            gap: 8px;
            align-items: center;
            justify-content: center;
        }
        
        .nav-link {
            display: flex;
            align-items: center;
            gap: 6px;
            padding: 8px 16px;
            border-radius: 8px;
            color: var(--text-secondary);
            text-decoration: none;
            font-weight: 500;
            font-size: 0.9rem;
            white-space: nowrap;
            transition: var(--transition-base);
        }
        
        .nav-link:hover {
            background: var(--bg-secondary);
            color: var(--text-primary);
        }
        
        .nav-link.active,
        .nav-link.pr-issues {
            background: var(--primary);
            color: white;
        }
        
        .nav-link i {
            font-size: 0.875rem;
            color: inherit;
        }
        
        /* Header Actions */
        .header-actions {
            display: flex;
            align-items: center;
            gap: 10px;
        }
        
        .icon-btn {
            width: 40px;
            height: 40px;
            border: none;
            background: var(--bg-secondary);
            color: var(--text-primary);
            border-radius: 8px;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: var(--transition-base);
        }
        
        .icon-btn:hover {
            background: var(--bg-tertiary);
            transform: translateY(-1px);
        }
        
        /* Main Content */
        .main-content {
            margin-top: var(--header-height);
            padding: 0;
            width: 100%;
        }
        
        /* Sections */
        .section {
            background: var(--bg-primary);
            padding: 40px;
            margin: 20px;
            border-radius: 12px;
            box-shadow: var(--shadow);
        }
        
        /* Dashboard Section */
        .dashboard-section {
            background: var(--primary-gradient);
            color: white;
            padding: 40px;
            margin: 0;
            border-radius: 0;
            margin-bottom: 20px;
        }
        
        .dashboard-header {
            text-align: center;
            margin-bottom: 30px;
        }
        
        .dashboard-header h1 {
            font-size: 2rem;
            margin-bottom: 10px;
        }
        
        .subtitle {
            font-size: 1.1rem;
            opacity: 0.9;
            margin-bottom: 10px;
        }
        
        .report-meta {
            display: flex;
            gap: 20px;
            flex-wrap: wrap;
            justify-content: center;
        }
        
        .meta-item {
            display: flex;
            align-items: center;
            gap: 5px;
            opacity: 0.9;
            font-size: 0.9rem;
        }
        
        .meta-item i {
            color: white;
        }
        
        /* Metrics Grid */
        .metrics-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            margin-top: 30px;
            max-width: 1200px;
            margin-left: auto;
            margin-right: auto;
        }
        
        .metric-card {
            background: rgba(255, 255, 255, 0.1);
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255, 255, 255, 0.2);
            border-radius: 12px;
            padding: 20px;
            display: flex;
            align-items: center;
            gap: 20px;
            transition: var(--transition-base);
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
            font-size: 1.5rem;
            color: white;
        }
        
        .metric-value {
            font-size: 2rem;
            font-weight: 700;
        }
        
        .metric-label {
            font-size: 0.875rem;
            opacity: 0.9;
        }
        
        /* PR Decision Section */
        .pr-decision-section {
            background: #fff;
            border: 1px solid #e5e7eb;
            border-radius: 12px;
            padding: 40px;
            margin: 20px;
            position: relative;
        }
        
        .pr-decision-section.blocked {
            border-top: 4px solid var(--danger);
        }
        
        .pr-decision-section.approved {
            border-top: 4px solid var(--success);
        }
        
        .decision-container {
            display: grid;
            grid-template-columns: 200px 1fr;
            gap: 40px;
            align-items: start;
        }
        
        .decision-visual {
            text-align: center;
        }
        
        .decision-icon-wrapper {
            position: relative;
            display: inline-block;
            margin-bottom: 20px;
        }
        
        .decision-icon {
            width: 120px;
            height: 120px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 60px;
            background: #fff;
            border: 3px solid;
        }
        
        .blocked .decision-icon {
            border-color: var(--danger);
            color: var(--danger);
        }
        
        .approved .decision-icon {
            border-color: var(--success);
            color: var(--success);
        }
        
        .confidence-meter {
            margin-top: 20px;
        }
        
        .confidence-label {
            font-size: 0.875rem;
            color: var(--text-secondary);
            margin-bottom: 8px;
            text-align: center;
        }
        
        .confidence-bar {
            height: 8px;
            background: var(--bg-tertiary);
            border-radius: 4px;
            overflow: hidden;
            width: 120px;
            margin: 0 auto;
        }
        
        .confidence-fill {
            height: 100%;
            background: var(--primary);
            transition: width 1s ease;
        }
        
        .pr-decision-section.blocked .confidence-fill {
            width: 25% !important;
            background: var(--danger);
        }
        
        .confidence-value {
            text-align: center;
            margin-top: 8px;
            font-weight: 600;
            font-size: 1.2rem;
        }
        
        .decision-content h2 {
            font-size: 1.8rem;
            margin-bottom: 10px;
        }
        
        .decision-content h2.blocked {
            color: var(--danger);
        }
        
        .decision-content h2.approved {
            color: var(--success);
        }
        
        .decision-message {
            color: var(--text-secondary);
            margin-bottom: 30px;
            font-size: 1.1rem;
        }
        
        .decision-factors {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 30px;
            margin-top: 30px;
        }
        
        .factor-card {
            background: var(--bg-secondary);
            padding: 25px;
            border-radius: 8px;
        }
        
        .factor-card h3 {
            display: flex;
            align-items: center;
            gap: 10px;
            margin-bottom: 20px;
            font-size: 1.2rem;
        }
        
        .factor-card h3 i {
            color: inherit;
        }
        
        .blocking-issues h3 i {
            color: var(--danger);
        }
        
        .positive-findings h3 i {
            color: var(--success);
        }
        
        .factor-list {
            list-style: none;
        }
        
        .factor-list li {
            padding: 8px 0;
            display: flex;
            align-items: center;
            gap: 10px;
        }
        
        .summary-box {
            background: var(--bg-secondary);
            padding: 20px;
            border-radius: 8px;
            margin-top: 20px;
        }
        
        .summary-box h3 {
            margin-bottom: 10px;
            color: var(--text-primary);
        }
        
        /* Section Headers */
        .section-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 30px;
        }
        
        .section-header h2 {
            font-size: 1.5rem;
            font-weight: 600;
            display: flex;
            align-items: center;
            gap: 10px;
        }
        
        .section-header h2 i {
            color: var(--primary);
        }
        
        .section-actions {
            display: flex;
            gap: 10px;
            align-items: center;
        }
        
        /* Badges */
        .badge {
            display: inline-flex;
            align-items: center;
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 0.75rem;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        
        .badge.critical {
            background: var(--danger);
            color: white;
        }
        
        .badge.high {
            background: var(--warning);
            color: white;
        }
        
        .badge.medium {
            background: #eab308;
            color: white;
        }
        
        .badge.low {
            background: var(--success);
            color: white;
        }
        
        /* Issue Cards */
        .finding, .issue-card {
            background: var(--bg-secondary);
            border-radius: 8px;
            padding: 20px;
            margin-bottom: 15px;
            position: relative;
        }
        
        .finding.critical, .issue-card.critical {
            background: #fef2f2;
            border-left: 4px solid var(--danger);
        }
        
        .finding.high, .issue-card.high {
            background: #fffbeb;
            border-left: 4px solid var(--warning);
        }
        
        .finding.medium, .issue-card.medium {
            background: #fefce8;
            border-left: 4px solid #eab308;
        }
        
        .finding.low, .issue-card.low {
            background: #f0fdf4;
            border-left: 4px solid var(--success);
        }
        
        .finding h3 {
            font-size: 1.1rem;
            margin-bottom: 8px;
            cursor: pointer;
        }
        
        .finding p {
            color: var(--text-secondary);
            margin-bottom: 12px;
        }
        
        /* Code Snippets */
        .code-snippet {
            background: #1e293b;
            color: #e2e8f0;
            padding: 16px;
            border-radius: 8px;
            overflow-x: auto;
            margin: 12px 0;
            font-family: 'Monaco', 'Consolas', 'Courier New', monospace;
            font-size: 0.875rem;
            line-height: 1.5;
            white-space: pre;
        }
        
        /* Recommendation Box */
        .recommendation-box {
            background: rgba(99, 102, 241, 0.1);
            padding: 12px;
            border-radius: 6px;
            margin-top: 12px;
            border-left: 3px solid var(--primary);
        }
        
        .recommendation-box strong {
            color: var(--primary);
        }
        
        /* Toggle Button */
        .toggle-button {
            background: var(--bg-secondary);
            border: 2px solid var(--bg-tertiary);
            padding: 10px 20px;
            border-radius: 8px;
            cursor: pointer;
            font-weight: 500;
            font-size: 1rem;
            display: flex;
            align-items: center;
            gap: 10px;
            transition: var(--transition-base);
            margin: 20px 0;
        }
        
        .toggle-button:hover {
            border-color: var(--primary);
            background: var(--bg-tertiary);
        }
        
        .toggle-button i {
            color: var(--primary);
        }
        
        /* Issues separator */
        .issues-separator {
            margin: 40px 0;
            padding: 30px 0;
            border-top: 2px solid var(--bg-tertiary);
        }
        
        .issues-separator h3 {
            font-size: 1.3rem;
            margin-bottom: 20px;
            display: flex;
            align-items: center;
            gap: 10px;
        }
        
        .issues-separator h3 i {
            color: var(--warning);
        }
        
        /* Quality Metrics */
        .score-container {
            display: grid;
            grid-template-columns: 300px 1fr;
            gap: 40px;
            align-items: start;
        }
        
        .score-visual {
            text-align: center;
        }
        
        .score-circle {
            width: 200px;
            height: 200px;
            margin: 0 auto;
            position: relative;
        }
        
        .score-circle svg {
            transform: rotate(-90deg);
        }
        
        .score-circle circle {
            fill: none;
            stroke-width: 20;
        }
        
        .score-bg {
            stroke: var(--bg-tertiary);
        }
        
        .score-progress {
            stroke: var(--warning);
            stroke-dasharray: 565.48;
            stroke-dashoffset: ${565.48 - (565.48 * overallScore / 100)};
            stroke-linecap: round;
            transition: stroke-dashoffset 1s ease;
        }
        
        .score-circle.good .score-progress {
            stroke: var(--success);
        }
        
        .score-circle.medium .score-progress {
            stroke: var(--warning);
        }
        
        .score-circle.poor .score-progress {
            stroke: var(--danger);
        }
        
        .score-content {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            text-align: center;
        }
        
        .score-number {
            font-size: 3rem;
            font-weight: 700;
        }
        
        .score-label {
            color: var(--text-secondary);
            font-size: 0.9rem;
        }
        
        .score-trend {
            margin-top: 5px;
            font-size: 0.875rem;
            font-weight: 600;
        }
        
        .score-trend.positive {
            color: var(--success);
        }
        
        .score-legend {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 10px;
            margin-top: 20px;
            font-size: 0.875rem;
        }
        
        /* Skills Assessment */
        .skills-container {
            margin-top: 30px;
        }
        
        .skill-item {
            margin-bottom: 20px;
        }
        
        .skill-header {
            display: flex;
            justify-content: space-between;
            margin-bottom: 8px;
            font-weight: 600;
        }
        
        .skill-bar {
            height: 8px;
            background: var(--bg-tertiary);
            border-radius: 4px;
            overflow: hidden;
        }
        
        .skill-fill {
            height: 100%;
            background: var(--primary);
            border-radius: 4px;
            transition: width 1s ease;
        }
        
        .skill-fill.low {
            background: var(--danger);
        }
        
        .skill-fill.medium {
            background: var(--warning);
        }
        
        .skill-fill.high {
            background: var(--success);
        }
        
        /* Improvement Suggestions */
        .improvement-suggestions {
            margin-top: 40px;
        }
        
        .improvement-suggestions h3 {
            font-size: 1.2rem;
            margin-bottom: 20px;
            display: flex;
            align-items: center;
            gap: 10px;
        }
        
        .improvement-suggestions h3 i {
            color: var(--warning);
        }
        
        .suggestion-card {
            background: var(--bg-secondary);
            padding: 20px;
            border-radius: 8px;
            margin-bottom: 15px;
            display: flex;
            gap: 15px;
        }
        
        .suggestion-card h4 {
            margin-bottom: 8px;
            color: var(--primary);
        }
        
        .suggestion-card p {
            color: var(--text-secondary);
            font-size: 0.9rem;
        }
        
        /* Educational Modules */
        .educational-container {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
            gap: 20px;
            margin-top: 30px;
        }
        
        .edu-module {
            background: var(--bg-secondary);
            padding: 25px;
            border-radius: 8px;
            transition: var(--transition-base);
            cursor: pointer;
        }
        
        .edu-module:hover {
            transform: translateY(-2px);
            box-shadow: var(--shadow-md);
        }
        
        .edu-module h3 {
            margin-bottom: 12px;
            color: var(--primary);
            font-size: 1.1rem;
        }
        
        .edu-module p {
            color: var(--text-secondary);
            margin-bottom: 15px;
        }
        
        .edu-link {
            color: var(--primary);
            text-decoration: none;
            font-weight: 500;
            display: inline-flex;
            align-items: center;
            gap: 5px;
        }
        
        .edu-link:hover {
            color: var(--primary-dark);
        }
        
        /* PR Comment Preview */
        .pr-comment-preview {
            background: var(--bg-secondary);
            border: 1px solid var(--bg-tertiary);
            border-radius: 8px;
            padding: 25px;
            margin-top: 20px;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }
        
        .pr-comment-header {
            display: flex;
            align-items: center;
            gap: 10px;
            margin-bottom: 20px;
            padding-bottom: 15px;
            border-bottom: 1px solid var(--bg-tertiary);
        }
        
        .pr-comment-avatar {
            width: 40px;
            height: 40px;
            border-radius: 50%;
            background: var(--primary);
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-weight: 600;
        }
        
        .pr-comment-meta {
            flex: 1;
        }
        
        .pr-comment-author {
            font-weight: 600;
            margin-bottom: 2px;
        }
        
        .pr-comment-time {
            font-size: 0.875rem;
            color: var(--text-secondary);
        }
        
        .pr-comment-body {
            line-height: 1.6;
        }
        
        .pr-comment-body h2 {
            font-size: 1.3rem;
            margin-bottom: 15px;
        }
        
        .pr-comment-body h3 {
            font-size: 1.1rem;
            margin-top: 20px;
            margin-bottom: 10px;
        }
        
        .pr-comment-body ul {
            margin-left: 20px;
            margin-bottom: 15px;
        }
        
        .pr-comment-body li {
            margin-bottom: 5px;
        }
        
        .pr-comment-body code {
            background: var(--bg-tertiary);
            padding: 2px 4px;
            border-radius: 3px;
            font-size: 0.9em;
        }
        
        .btn-primary {
            background: var(--primary);
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 8px;
            cursor: pointer;
            font-weight: 500;
            transition: var(--transition-base);
            display: inline-flex;
            align-items: center;
            gap: 8px;
        }
        
        .btn-primary:hover {
            background: var(--primary-dark);
            transform: translateY(-1px);
            box-shadow: var(--shadow-md);
        }
        
        /* Filter Button */
        .filter-btn {
            background: var(--bg-secondary);
            border: 1px solid var(--bg-tertiary);
            padding: 8px 16px;
            border-radius: 6px;
            cursor: pointer;
            font-size: 0.9rem;
            display: flex;
            align-items: center;
            gap: 6px;
            transition: var(--transition-base);
        }
        
        .filter-btn:hover {
            background: var(--bg-tertiary);
        }
        
        .filter-btn i {
            color: var(--primary);
        }
        
        /* View Toggle */
        .view-toggle {
            display: flex;
            background: var(--bg-secondary);
            border-radius: 6px;
            padding: 4px;
        }
        
        .view-btn {
            background: none;
            border: none;
            padding: 6px 10px;
            border-radius: 4px;
            cursor: pointer;
            color: var(--text-secondary);
            transition: var(--transition-base);
        }
        
        .view-btn.active {
            background: white;
            color: var(--primary);
            box-shadow: var(--shadow-sm);
        }
        
        .view-btn i {
            font-size: 0.875rem;
        }
    </style>
</head>
<body>
    <!-- Header -->
    <header class="fixed-header">
        <div class="header-container">
            <div class="logo-section">
                <div class="logo-icon">
                    <i class="fas fa-shield-alt"></i>
                </div>
                <span class="logo-text">CodeQual</span>
            </div>
            
            <nav class="nav-menu">
                <a href="#overview" class="nav-link"><i class="fas fa-th-large"></i> Overview</a>
                <a href="#decision" class="nav-link"><i class="fas fa-gavel"></i> Decision</a>
                <a href="#pr-issues" class="nav-link pr-issues"><i class="fas fa-code-branch"></i> PR Issues</a>
                <a href="#repo-issues" class="nav-link"><i class="fas fa-exclamation-triangle"></i> Repo Issues</a>
                <a href="#metrics" class="nav-link"><i class="fas fa-chart-line"></i> Metrics</a>
                <a href="#skills" class="nav-link"><i class="fas fa-brain"></i> Skills</a>
                <a href="#education" class="nav-link"><i class="fas fa-graduation-cap"></i> Education</a>
            </nav>
            
            <div class="header-actions">
                <button class="icon-btn"><i class="fas fa-search"></i></button>
                <button class="icon-btn"><i class="fas fa-moon"></i></button>
                <button class="icon-btn"><i class="fas fa-user"></i></button>
            </div>
        </div>
    </header>

    <!-- Main Content -->
    <main class="main-content">
        <!-- Overview Section -->
        <section id="overview" class="dashboard-section">
            <div class="dashboard-header">
                <h1>Code Analysis Report</h1>
                <div class="subtitle">Pull Request #${prNumber} - ${repoName}</div>
                <div class="report-meta">
                    <span class="meta-item"><i class="fas fa-clock"></i> ${new Date(report.analysis_date).toLocaleString()}</span>
                    <span class="meta-item"><i class="fas fa-code-branch"></i> v1.0.0</span>
                    <span class="meta-item"><i class="fas fa-fingerprint"></i> ${report.id}</span>
                </div>
            </div>
            
            <div class="metrics-grid">
                <div class="metric-card">
                    <div class="metric-icon" style="background: var(--primary-gradient)">
                        <i class="fas fa-code"></i>
                    </div>
                    <div class="metric-content">
                        <div class="metric-value">${filesChanged}</div>
                        <div class="metric-label">Files Changed</div>
                    </div>
                </div>
                
                <div class="metric-card">
                    <div class="metric-icon" style="background: var(--success-gradient)">
                        <i class="fas fa-plus"></i>
                    </div>
                    <div class="metric-content">
                        <div class="metric-value">${linesAdded}</div>
                        <div class="metric-label">Lines Added</div>
                    </div>
                </div>
                
                <div class="metric-card">
                    <div class="metric-icon" style="background: var(--danger-gradient)">
                        <i class="fas fa-minus"></i>
                    </div>
                    <div class="metric-content">
                        <div class="metric-value">${linesRemoved}</div>
                        <div class="metric-label">Lines Removed</div>
                    </div>
                </div>
                
                <div class="metric-card">
                    <div class="metric-icon" style="background: var(--info-gradient)">
                        <i class="fas fa-laptop-code"></i>
                    </div>
                    <div class="metric-content">
                        <div class="metric-value">TypeScript</div>
                        <div class="metric-label">Language</div>
                    </div>
                </div>
            </div>
        </section>

        <!-- PR Decision Section -->
        <section id="decision" class="pr-decision-section ${decisionClass}">
            <div class="decision-container">
                <div class="decision-visual">
                    <div class="decision-icon-wrapper">
                        <div class="decision-icon ${decisionClass}">
                            ${decisionIcon}
                        </div>
                    </div>
                    <div class="confidence-meter">
                        <div class="confidence-label">Confidence</div>
                        <div class="confidence-bar">
                            <div class="confidence-fill" style="width: ${isBlocked ? 25 : confidence}%"></div>
                        </div>
                        <div class="confidence-value">${isBlocked ? 25 : confidence}%</div>
                    </div>
                </div>
                
                <div class="decision-content">
                    <h2 class="${decisionClass}">PR Decision: ${decisionText === 'BLOCKED' ? 'Blocked' : 'Approved'}</h2>
                    <p class="decision-message">${decisionText === 'BLOCKED' ? 'This PR cannot be merged due to critical security issues.' : decisionReason}</p>
                    
                    <div class="decision-factors">
                        <div class="factor-card blocking-issues">
                            <h3><i class="fas fa-ban"></i> Blocking Issues</h3>
                            <ul class="factor-list">
                                ${report.pr_issues?.critical?.map((issue: any) => `
                                    <li>
                                        <span class="badge critical">CRITICAL</span>
                                        ${issue.title}
                                    </li>
                                `).join('') || ''}
                                ${report.pr_issues?.high?.slice(0, 2).map((issue: any) => `
                                    <li>
                                        <span class="badge high">HIGH</span>
                                        ${issue.title}
                                    </li>
                                `).join('') || ''}
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
                    
                    ${report.deepwiki?.summary ? `
                    <div class="summary-box">
                        <h3>Summary</h3>
                        <p>${report.deepwiki.summary}</p>
                    </div>
                    ` : ''}
                </div>
            </div>
        </section>

        <!-- PR Issues Section -->
        <section id="pr-issues" class="section">
            <div class="section-header">
                <h2><i class="fas fa-code-branch"></i> Current PR Issues</h2>
                <div class="section-actions">
                    <button class="filter-btn">
                        <i class="fas fa-filter"></i> Filter
                    </button>
                    <div class="view-toggle">
                        <button class="view-btn active"><i class="fas fa-th"></i></button>
                        <button class="view-btn"><i class="fas fa-list"></i></button>
                    </div>
                </div>
            </div>
            
            <!-- Critical & High Priority Issues -->
            ${(totalCritical > 0 || totalHigh > 0) ? `
                ${this.generateIssuesList(report.pr_issues?.critical || [], 'critical')}
                ${this.generateIssuesList(report.pr_issues?.high || [], 'high')}
            ` : ''}
            
            <!-- Medium & Low Priority Issues (Collapsible) -->
            ${(prMedium > 0 || prLow > 0) ? `
                <button class="toggle-button" onclick="document.getElementById('lower-pr-issues').style.display = document.getElementById('lower-pr-issues').style.display === 'none' ? 'block' : 'none';">
                    <i class="fas fa-eye"></i>
                    View ${prMedium + prLow} Medium & Low Priority Issues
                </button>
                <div id="lower-pr-issues" style="display: none;">
                    ${this.generateIssuesList(report.pr_issues?.medium || [], 'medium')}
                    ${this.generateIssuesList(report.pr_issues?.low || [], 'low')}
                </div>
            ` : ''}
        </section>

        <!-- Repository Issues Section -->
        <section id="repo-issues" class="section">
            <div class="section-header">
                <h2><i class="fas fa-exclamation-triangle"></i> Repository Issues</h2>
                <p style="color: var(--text-secondary); margin-top: 5px;">Existing issues in your codebase that need attention</p>
            </div>
            
            ${this.generateIssuesList(report.repository_issues?.high || [], 'high')}
            ${this.generateIssuesList(report.repository_issues?.medium || [], 'medium')}
        </section>

        <!-- Quality Metrics Section -->
        <section id="metrics" class="section">
            <div class="section-header">
                <h2><i class="fas fa-chart-line"></i> Quality Metrics</h2>
            </div>
            
            <div class="score-container">
                <div class="score-visual">
                    <div class="score-circle ${overallScore >= 80 ? 'good' : overallScore >= 60 ? 'medium' : 'poor'}">
                        <svg width="200" height="200">
                            <circle class="score-bg" cx="100" cy="100" r="90" />
                            <circle class="score-progress" cx="100" cy="100" r="90" />
                        </svg>
                        <div class="score-content">
                            <div class="score-number">${overallScore}</div>
                            <div class="score-label">Quality Score</div>
                            <div class="score-trend positive">
                                <i class="fas fa-arrow-up"></i> +5
                            </div>
                        </div>
                    </div>
                    <div class="score-legend">
                        <div>0-40: Poor</div>
                        <div>41-60: Fair</div>
                        <div>61-80: Good</div>
                        <div>81-100: Excellent</div>
                    </div>
                </div>
                
                <div class="timeline-container">
                    <h3>Score Trend</h3>
                    <div style="height: 300px; background: var(--bg-secondary); border-radius: 8px; display: flex; align-items: center; justify-content: center; color: var(--text-secondary);">
                        <i class="fas fa-chart-line" style="font-size: 3rem; opacity: 0.2;"></i>
                    </div>
                </div>
            </div>
        </section>

        <!-- Skills Assessment Section -->
        <section id="skills" class="section">
            <div class="section-header">
                <h2><i class="fas fa-brain"></i> Skills Assessment</h2>
                <button class="btn-secondary" style="background: var(--bg-secondary); color: var(--text-primary); border: 1px solid var(--bg-tertiary);">
                    <i class="fas fa-info-circle"></i> How it works
                </button>
            </div>
            
            <div class="skills-container">
                ${this.generateSkillItem('Security', report.agents?.security?.score || 10, 'low')}
                ${this.generateSkillItem('Code Quality', report.agents?.codeQuality?.score || 75, 'high')}
                ${this.generateSkillItem('Performance', report.agents?.performance?.score || 65, 'medium')}
                ${this.generateSkillItem('Architecture', report.agents?.architecture?.score || 72, 'medium')}
            </div>
            
            <div class="improvement-suggestions">
                <h3><i class="fas fa-lightbulb"></i> Improvement Suggestions</h3>
                
                <div class="suggestion-card">
                    <div>🛡️</div>
                    <div>
                        <h4>Improve Security Skills</h4>
                        <p>Focus on learning about input validation and secure coding practices.</p>
                    </div>
                </div>
                
                <div class="suggestion-card">
                    <div>⚡</div>
                    <div>
                        <h4>Performance Optimization</h4>
                        <p>Learn about memory management and efficient algorithms.</p>
                    </div>
                </div>
            </div>
        </section>

        <!-- Educational Resources Section -->
        <section id="education" class="section">
            <div class="section-header">
                <h2><i class="fas fa-graduation-cap"></i> Educational Resources</h2>
                <div style="color: var(--text-secondary); font-size: 0.9rem;">
                    <i class="fas fa-clock"></i> Estimated learning time: 45 minutes
                </div>
            </div>
            
            <div class="educational-container">
                <div class="edu-module">
                    <h3>🛡️ Preventing SQL Injection</h3>
                    <p>Learn how to protect your application from SQL injection attacks.</p>
                    <a href="https://owasp.org/www-community/attacks/SQL_Injection" target="_blank" class="edu-link">
                        Start Learning →
                    </a>
                </div>
                
                <div class="edu-module">
                    <h3>🔐 Secure API Key Management</h3>
                    <p>Best practices for storing and using API keys securely.</p>
                    <a href="https://blog.gitguardian.com/secrets-api-management/" target="_blank" class="edu-link">
                        Start Learning →
                    </a>
                </div>
                
                <div class="edu-module">
                    <h3>💾 Memory Management in JavaScript</h3>
                    <p>Understanding and preventing memory leaks in your applications.</p>
                    <a href="https://developer.mozilla.org/en-US/docs/Web/JavaScript/Memory_Management" target="_blank" class="edu-link">
                        Start Learning →
                    </a>
                </div>
            </div>
        </section>

        <!-- PR Comment Preview Section -->
        <section class="section">
            <div class="section-header">
                <h2><i class="fas fa-comment"></i> PR Comment Preview</h2>
                <button class="btn-primary" onclick="navigator.clipboard.writeText(document.querySelector('.pr-comment-body').innerText); alert('Copied to clipboard!');">
                    <i class="fas fa-copy"></i> Copy Comment
                </button>
            </div>
            
            <div class="pr-comment-preview">
                <div class="pr-comment-header">
                    <div class="pr-comment-avatar">CQ</div>
                    <div class="pr-comment-meta">
                        <div class="pr-comment-author">CodeQual Bot</div>
                        <div class="pr-comment-time">Just now</div>
                    </div>
                </div>
                
                <div class="pr-comment-body">
                    <h2>🔍 CodeQual Analysis Report</h2>
                    
                    <h3>Decision: ${report.decision?.status || 'PENDING'} ${report.decision?.status === 'BLOCKED' ? '🚫' : '✅'}</h3>
                    <p>${report.decision?.reason || 'Analysis in progress'}</p>
                    
                    <p><strong>Overall Score:</strong> ${overallScore}/100</p>
                    
                    <h3>Summary</h3>
                    <ul>
                        <li>📊 <strong>Files Changed:</strong> ${filesChanged}</li>
                        <li>❗ <strong>Critical Issues:</strong> ${prCritical}</li>
                        <li>⚠️ <strong>High Priority Issues:</strong> ${totalHigh}</li>
                        <li>📝 <strong>Total Issues:</strong> ${totalIssues}</li>
                    </ul>
                    
                    <h3>Top Recommendations</h3>
                    ${report.recommendations?.slice(0, 3).map((rec: any, i: number) => 
                        `<p>${i + 1}. ${rec.title}</p>`
                    ).join('') || '<p>No recommendations</p>'}
                    
                    <p><a href="#">View Full Report →</a></p>
                </div>
            </div>
        </section>
    </main>

    <script>
        // Smooth scroll to sections
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const targetId = link.getAttribute('href').substring(1);
                const targetSection = document.getElementById(targetId);
                if (targetSection) {
                    targetSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            });
        });
    </script>
</body>
</html>
    `;
    
    return html;
  }
  
  private generateIssuesList(issues: any[], severity: string): string {
    if (!issues || issues.length === 0) return '';
    
    return issues.map(issue => `
      <div class="finding ${severity}">
        <span class="badge ${severity}">${severity.toUpperCase()}</span>
        <h3>${issue.title}</h3>
        <p>${issue.description}</p>
        ${issue.codeSnippet ? `<div class="code-snippet">${this.escapeHtml(issue.codeSnippet)}</div>` : ''}
        <div class="recommendation-box">
            <strong>Recommendation:</strong> ${issue.recommendation || 'Review and fix this issue.'}
        </div>
      </div>
    `).join('');
  }
  
  private generateSkillItem(name: string, score: number, level: string): string {
    return `
      <div class="skill-item">
        <div class="skill-header">
          <span>${name}</span>
          <span>${score}/100</span>
        </div>
        <div class="skill-bar">
          <div class="skill-fill ${level}" style="width: ${score}%"></div>
        </div>
      </div>
    `;
  }
  
  private escapeHtml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');
  }
}