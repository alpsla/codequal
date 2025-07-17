import * as fs from 'fs';
import * as path from 'path';

export class HtmlReportGeneratorV2 {
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
    const decisionIcon = isBlocked ? 'fa-times-circle' : 'fa-check-circle';
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
        /* Reset and Base */
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            background-color: #f5f6fa;
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
            backdrop-filter: blur(10px);
            background: rgba(255, 255, 255, 0.95);
        }
        
        .header-container {
            max-width: 100%;
            margin: 0 auto;
            height: 100%;
            padding: 0 40px;
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
            color: var(--primary);
            position: relative;
            z-index: 100;
            margin-right: 20px;
        }
        
        .logo-icon {
            width: 40px;
            height: 40px;
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
            gap: 5px;
            align-items: center;
            margin-left: 20px;
        }
        
        .nav-link {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 6px 12px;
            border-radius: 8px;
            color: var(--text-secondary);
            text-decoration: none;
            font-weight: 500;
            font-size: 0.85rem;
            white-space: nowrap;
            transition: var(--transition-base);
            position: relative;
            z-index: 2;
        }
        
        .nav-link:hover {
            background: var(--bg-secondary);
            color: var(--text-primary);
        }
        
        .nav-link.active {
            background: var(--primary);
            color: white;
        }
        
        .nav-link i {
            font-size: 0.875rem;
            margin-right: 0.5rem;
        }
        
        .nav-link:first-child {
            margin-left: 10px;
        }
        
        /* Main Content */
        .main-content {
            margin-top: var(--header-height);
            padding: 20px 40px;
            max-width: 100%;
            margin-left: auto;
            margin-right: auto;
        }
        
        /* Sections */
        .section {
            background: var(--bg-primary);
            border-radius: 12px;
            padding: 30px;
            margin-bottom: 30px;
            box-shadow: var(--shadow);
            transition: var(--transition-base);
            max-width: 1600px;
            margin-left: auto;
            margin-right: auto;
        }
        
        .section:hover {
            box-shadow: var(--shadow-md);
        }
        
        /* Dashboard Section */
        .dashboard-section {
            background: var(--primary-gradient);
            color: white;
            padding: 40px;
            border-radius: 12px;
            margin-bottom: 30px;
            position: relative;
            overflow: hidden;
            max-width: 1600px;
            margin-left: auto;
            margin-right: auto;
        }
        
        .dashboard-section::before {
            content: '';
            position: absolute;
            top: -50%;
            right: -30%;
            width: 60%;
            height: 200%;
            background: radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%);
            transform: rotate(45deg);
        }
        
        .dashboard-header {
            text-align: center;
            margin-bottom: 20px;
            position: relative;
        }
        
        .dashboard-header h1 {
            font-size: 1.8rem;
            margin-bottom: 5px;
        }
        
        .subtitle {
            font-size: 1rem;
            opacity: 0.9;
            margin-bottom: 10px;
        }
        
        .report-meta {
            display: flex;
            gap: 20px;
            flex-wrap: wrap;
            justify-content: center;
            position: relative;
        }
        
        .meta-item {
            display: flex;
            align-items: center;
            gap: 5px;
            opacity: 0.9;
            font-size: 0.9rem;
        }
        
        /* Metrics Grid */
        .metrics-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 15px;
            margin-top: 15px;
            position: relative;
        }
        
        .metric-card {
            background: rgba(255, 255, 255, 0.1);
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255, 255, 255, 0.2);
            border-radius: 12px;
            padding: 15px;
            display: flex;
            align-items: center;
            gap: 15px;
            transition: var(--transition-base);
        }
        
        .metric-card:hover {
            transform: translateY(-2px);
            background: rgba(255, 255, 255, 0.15);
        }
        
        .metric-icon {
            width: 40px;
            height: 40px;
            border-radius: 10px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 1.2rem;
            color: white;
        }
        
        .metric-value {
            font-size: 1.5rem;
            font-weight: 700;
        }
        
        .metric-label {
            font-size: 0.875rem;
            opacity: 0.9;
        }
        
        /* PR Decision Section */
        .pr-decision-section {
            border-top: 4px solid transparent;
            position: relative;
            margin-bottom: 30px;
            padding: 40px;
        }
        
        .pr-decision-section.approved {
            border-top-color: var(--success);
        }
        
        .pr-decision-section.conditionally-approved {
            border-top-color: var(--warning);
        }
        
        .pr-decision-section.blocked {
            border-top-color: var(--danger);
        }
        
        .decision-container {
            display: grid;
            grid-template-columns: 300px 1fr;
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
            font-size: 5rem;
            animation: bounce 2s infinite;
        }
        
        .blocked .decision-icon {
            color: var(--danger);
        }
        
        .approved .decision-icon {
            color: var(--success);
        }
        
        @keyframes bounce {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-10px); }
        }
        
        .decision-ring {
            position: absolute;
            top: 50%;
            left: 50%;
            width: 120px;
            height: 120px;
            border: 3px solid currentColor;
            border-radius: 50%;
            transform: translate(-50%, -50%);
            opacity: 0.2;
            animation: pulse 2s infinite;
        }
        
        @keyframes pulse {
            0% { transform: translate(-50%, -50%) scale(1); opacity: 0.2; }
            50% { transform: translate(-50%, -50%) scale(1.1); opacity: 0.1; }
            100% { transform: translate(-50%, -50%) scale(1); opacity: 0.2; }
        }
        
        .confidence-meter {
            margin-top: 20px;
        }
        
        .confidence-label {
            font-size: 0.875rem;
            color: var(--text-secondary);
            margin-bottom: 5px;
        }
        
        .confidence-bar {
            height: 8px;
            background: var(--bg-tertiary);
            border-radius: 4px;
            overflow: hidden;
        }
        
        .confidence-fill {
            height: 100%;
            background: var(--primary-gradient);
            transition: width 1s ease;
        }
        
        .confidence-value {
            text-align: center;
            margin-top: 5px;
            font-weight: 600;
        }
        
        .pr-decision-section.blocked .confidence-fill {
            width: 25% !important;
        }
        
        .decision-title {
            font-size: 2rem;
            margin-bottom: 10px;
        }
        
        .pr-decision-section.blocked .decision-title {
            color: var(--danger);
        }
        
        .pr-decision-section.approved .decision-title {
            color: var(--success);
        }
        
        .decision-message {
            color: var(--text-secondary);
            margin-bottom: 30px;
        }
        
        /* Issues Section */
        .section-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 15px;
            flex-wrap: nowrap;
        }
        
        .section-header h2 {
            font-size: 1.3rem;
            font-weight: 600;
            display: flex;
            align-items: center;
            gap: 10px;
            margin: 0;
        }
        
        .section-header i {
            color: var(--primary);
        }
        
        .section-subtitle {
            text-align: center;
            color: var(--text-secondary);
            margin-bottom: 15px;
            font-size: 0.9rem;
        }
        
        .issues-stats {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 20px;
            margin-bottom: 30px;
            max-width: 600px;
            margin-left: auto;
            margin-right: auto;
        }
        
        .stat-card {
            background: var(--bg-secondary);
            padding: 20px;
            border-radius: 8px;
            text-align: center;
            transition: var(--transition-base);
            border-top: 3px solid;
        }
        
        .stat-card:hover {
            transform: translateY(-2px);
            box-shadow: var(--shadow-md);
        }
        
        .stat-card.critical {
            border-color: var(--danger);
        }
        
        .stat-card.high {
            border-color: var(--warning);
        }
        
        .stat-card.medium {
            border-color: #eab308;
        }
        
        .stat-card.low {
            border-color: var(--success);
        }
        
        .stat-value {
            font-size: 2rem;
            font-weight: 700;
            display: block;
        }
        
        .stat-label {
            color: var(--text-secondary);
            font-size: 0.875rem;
        }
        
        /* Finding Cards */
        .finding, .issue-card {
            background: var(--bg-secondary);
            border-left: 4px solid var(--primary);
            border-radius: 8px;
            padding: 15px;
            margin-bottom: 10px;
            transition: var(--transition-base);
            position: relative;
            display: flex;
            flex-direction: column;
            gap: 1rem;
        }
        
        .finding:hover, .issue-card:hover {
            transform: translateX(5px);
            box-shadow: var(--shadow-md);
        }
        
        .finding.critical, .issue-card.severity-critical {
            border-left-color: var(--danger);
            background: rgba(239, 68, 68, 0.05);
        }
        
        .finding.high, .issue-card.severity-high {
            border-left-color: var(--warning);
            background: rgba(245, 158, 11, 0.05);
        }
        
        .finding.medium, .issue-card.severity-medium {
            border-left-color: #eab308;
            background: rgba(234, 179, 8, 0.05);
        }
        
        .finding.low, .issue-card.severity-low {
            border-left-color: var(--success);
            background: rgba(16, 185, 129, 0.05);
        }
        
        .issue-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 5px;
        }
        
        .issue-title {
            font-weight: 600;
            font-size: 1.1rem;
            color: var(--text-primary);
        }
        
        .finding h3 {
            margin-bottom: 5px;
            font-size: 1.1rem;
        }
        
        .finding p {
            margin-bottom: 8px;
        }
        
        /* Badges */
        .badge, .severity-badge {
            display: inline-flex;
            align-items: center;
            padding: 3px 10px;
            border-radius: 20px;
            font-size: 0.7rem;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-right: 0.5rem;
        }
        
        .badge.critical, .severity-badge.critical {
            background: var(--danger);
            color: white;
        }
        
        .badge.high, .severity-badge.high {
            background: var(--warning);
            color: white;
        }
        
        .badge.medium, .severity-badge.medium {
            background: #eab308;
            color: #713f12;
        }
        
        .badge.low, .severity-badge.low {
            background: var(--success);
            color: white;
        }
        
        .issue-file {
            font-family: 'Monaco', 'Consolas', monospace;
            font-size: 0.9rem;
            color: var(--text-secondary);
            margin: 10px 0;
        }
        
        .issue-description {
            color: var(--text-secondary);
            margin-bottom: 15px;
            line-height: 1.6;
        }
        
        /* Code Snippets */
        .code-snippet {
            background: #1e293b;
            color: #e2e8f0;
            padding: 12px;
            border-radius: 8px;
            overflow-x: auto;
            margin: 8px 0;
            font-family: 'Monaco', 'Consolas', 'Courier New', monospace;
            font-size: 0.875rem;
            line-height: 1.5;
            position: relative;
            white-space: pre;
        }
        
        /* Recommendation Box */
        .recommendation, .recommendation-box {
            background: rgba(99, 102, 241, 0.1);
            padding: 12px;
            border-radius: 8px;
            margin-top: 10px;
            border-left: 3px solid var(--primary);
            width: 100%;
        }
        
        .recommendation strong {
            color: var(--primary);
        }
        
        /* Toggle Button */
        .toggle-section {
            margin-top: 20px;
        }
        
        .toggle-button, .toggle-btn {
            background: var(--bg-secondary);
            border: 2px solid var(--bg-tertiary);
            padding: 10px 20px;
            border-radius: 8px;
            cursor: pointer;
            font-weight: 500;
            font-size: 1rem;
            display: flex;
            align-items: center;
            gap: 0.5rem;
            transition: var(--transition-base);
            margin: 20px 0;
            white-space: nowrap;
        }
        
        .toggle-button:hover, .toggle-btn:hover {
            border-color: var(--primary);
            background: var(--bg-tertiary);
        }
        
        .collapsible-content {
            max-height: 0;
            overflow: hidden;
            transition: max-height 0.3s ease;
        }
        
        .collapsible-content.expanded {
            max-height: 2000px;
        }
        
        /* Skills Container */
        .skills-container {
            max-width: 600px;
            margin: 0 auto;
        }
        
        .skills-list {
            display: grid;
            gap: 15px;
        }
        
        /* Skill Cards */
        .skill-card, .skill-item {
            background: var(--bg-secondary);
            padding: 8px 12px;
            border-radius: 8px;
            transition: var(--transition-base);
            margin-bottom: 8px;
        }
        
        .skill-card:hover {
            transform: translateY(-2px);
            box-shadow: var(--shadow-md);
        }
        
        .skill-header {
            display: flex;
            justify-content: space-between;
            margin-bottom: 10px;
            font-weight: 600;
            font-size: 0.875rem;
        }
        
        .skill-name {
            font-weight: 600;
            display: flex;
            align-items: center;
            gap: 10px;
        }
        
        .skill-score {
            font-size: 1.5rem;
            font-weight: bold;
        }
        
        .skill-bar, .progress-bar {
            height: 5px;
            background: var(--bg-tertiary);
            border-radius: 4px;
            overflow: hidden;
        }
        
        .skill-fill, .progress-bar {
            height: 100%;
            background: var(--primary-gradient);
            border-radius: 4px;
            transition: width 1s ease;
        }
        
        /* Educational Modules */
        .educational-container {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
            gap: 1.5rem;
            margin-top: 2rem;
        }
        
        .learning-time {
            color: var(--text-secondary);
            font-size: 0.9rem;
        }
        
        .edu-module, .educational-card {
            background: var(--bg-secondary);
            padding: 24px;
            border-radius: 8px;
            border: 2px solid transparent;
            transition: var(--transition-base);
            position: relative;
            overflow: hidden;
        }
        
        .edu-module:hover, .educational-card:hover {
            border-color: var(--primary);
            transform: translateY(-2px);
            box-shadow: var(--shadow-md);
        }
        
        .edu-module h3, .educational-card h4 {
            color: var(--primary);
            margin-bottom: 10px;
        }
        
        .resources {
            margin-top: 15px;
            padding-top: 15px;
            border-top: 1px solid var(--bg-tertiary);
        }
        
        .resources ul {
            list-style: none;
            padding-left: 20px;
        }
        
        .resources li:before {
            content: "→ ";
            color: var(--primary);
            font-weight: bold;
            margin-left: -20px;
            margin-right: 10px;
        }
        
        /* Skill Recommendations */
        .skill-recommendations {
            margin-top: 30px;
        }
        
        .skill-recommendations h3 {
            font-size: 1.1rem;
            margin-bottom: 12px;
        }
        
        .skill-recommendations h3::before {
            content: "💡 ";
            color: var(--primary);
        }
        
        .recommendations-grid {
            display: grid;
            gap: 10px;
        }
        
        .recommendation-card {
            padding: 10px 14px;
            margin-bottom: 8px;
            display: flex;
            align-items: center;
            gap: 10px;
            background: var(--bg-secondary);
            border-radius: 8px;
            transition: var(--transition-base);
        }
        
        .recommendation-card:hover {
            transform: translateY(-2px);
            box-shadow: var(--shadow-md);
        }
        
        .recommendation-card h4 {
            font-size: 0.9rem;
            margin: 0;
            display: inline-flex;
            align-items: center;
            gap: 8px;
            color: var(--text-primary);
        }
        
        .recommendation-card p {
            font-size: 0.825rem;
            margin: 0;
            color: var(--text-secondary);
        }
        
        .rec-meta {
            display: flex;
            gap: 20px;
            margin-top: 10px;
            font-size: 0.9rem;
            color: var(--text-secondary);
        }
        
        /* Score Visual */
        .score-display {
            text-align: center;
            margin: 30px 0;
        }
        
        .score-circle {
            width: 200px;
            height: 200px;
            margin: 0 auto;
            position: relative;
        }
        
        .score-number {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            font-size: 3rem;
            font-weight: bold;
        }
        
        .score-label {
            font-size: 1.2rem;
            color: var(--text-secondary);
            margin-top: 10px;
        }
        
        /* Decisions Factors */
        .decision-factors {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
        }
        
        .factor-card {
            background: var(--bg-secondary);
            padding: 20px;
            border-radius: 8px;
        }
        
        .factor-card h3 {
            display: flex;
            align-items: center;
            gap: 10px;
            margin-bottom: 15px;
            font-size: 1.125rem;
        }
        
        .factor-card h3 i {
            color: var(--text-primary);
        }
        
        .decision-factors .fa-ban {
            color: var(--danger) !important;
        }
        
        .decision-factors .fa-check-circle {
            color: var(--success) !important;
        }
        
        .factor-card ul li {
            line-height: 2;
        }
        
        /* PR Comment Preview */
        .pr-comment-preview {
            background: var(--bg-secondary);
            border: 2px solid var(--bg-tertiary);
            border-radius: 8px;
            padding: 20px;
            margin-top: 20px;
        }
        
        .pr-comment-preview pre {
            white-space: pre-wrap;
            font-family: 'Monaco', 'Consolas', monospace;
            font-size: 0.875rem;
            line-height: 1.6;
            margin: 0;
        }
        
        .pr-comment-text {
            color: var(--text-primary);
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
        
        /* Utility Classes */
        .mt-4 { margin-top: 2rem; }
        .mb-4 { margin-bottom: 2rem; }
        .text-center { text-align: center; }
        .hidden { display: none; }
    </style>
</head>
<body>
    <!-- Header -->
    <header class="fixed-header">
        <div class="header-container">
            <div class="logo-section">
                <img src="/codequal-logo.svg" alt="CodeQual" class="logo-icon" />
                <span class="logo-text">CodeQual</span>
            </div>
            
            <nav class="nav-menu">
                <a href="#overview" class="nav-link"><i class="fas fa-tachometer-alt"></i> Overview</a>
                <a href="#decision" class="nav-link"><i class="fas fa-gavel"></i> Decision</a>
                <a href="#issues" class="nav-link"><i class="fas fa-exclamation-triangle"></i> Issues</a>
                <a href="#skills" class="nav-link"><i class="fas fa-chart-bar"></i> Metrics</a>
                <a href="#education" class="nav-link"><i class="fas fa-graduation-cap"></i> Learn</a>
            </nav>
        </div>
    </header>

    <!-- Main Content -->
    <main class="main-content">
        <!-- Overview Section -->
        <section id="overview" class="section">
            <div class="dashboard-header">
                <h1>Code Analysis Report</h1>
                <div class="subtitle">Pull Request #${prNumber} - ${repoName}</div>
                <div class="report-meta">
                    <span class="meta-item"><i class="fas fa-clock"></i> ${new Date(report.analysis_date).toLocaleString()}</span>
                    <span class="meta-item"><i class="fas fa-fingerprint"></i> ${report.id}</span>
                </div>
            </div>
            
            <div class="metrics-grid">
                <div class="metric-card">
                    <div class="metric-icon" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%)">
                        <i class="fas fa-code"></i>
                    </div>
                    <div class="metric-content">
                        <div class="metric-value">${filesChanged}</div>
                        <div class="metric-label">Files Changed</div>
                    </div>
                </div>
                
                <div class="metric-card">
                    <div class="metric-icon" style="background: linear-gradient(135deg, #10b981 0%, #059669 100%)">
                        <i class="fas fa-plus"></i>
                    </div>
                    <div class="metric-content">
                        <div class="metric-value">${linesAdded}</div>
                        <div class="metric-label">Lines Added</div>
                    </div>
                </div>
                
                <div class="metric-card">
                    <div class="metric-icon" style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%)">
                        <i class="fas fa-minus"></i>
                    </div>
                    <div class="metric-content">
                        <div class="metric-value">${linesRemoved}</div>
                        <div class="metric-label">Lines Removed</div>
                    </div>
                </div>
                
                <div class="metric-card">
                    <div class="metric-icon" style="background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)">
                        <i class="fas fa-bug"></i>
                    </div>
                    <div class="metric-content">
                        <div class="metric-value">${totalIssues}</div>
                        <div class="metric-label">Total Issues</div>
                    </div>
                </div>
            </div>
        </section>

        <!-- PR Decision Section -->
        <section id="decision" class="pr-decision-section ${decisionClass}">
            <div class="decision-container">
                <div class="decision-visual">
                    <div class="decision-icon-wrapper">
                        <div class="decision-icon">
                            <i class="fas ${decisionIcon}"></i>
                        </div>
                    </div>
                    <div class="confidence-meter">
                        <div class="confidence-label">Confidence Level</div>
                        <div class="confidence-bar">
                            <div class="confidence-fill" style="width: ${confidence}%"></div>
                        </div>
                        <div class="confidence-value">${confidence}%</div>
                    </div>
                </div>
                
                <div class="decision-content">
                    <h2 class="decision-title">PR Decision: ${decisionText}</h2>
                    <p class="decision-message">${decisionReason}</p>
                    
                    ${report.deepwiki?.summary ? `
                    <div style="margin-top: 20px; padding: 15px; background: rgba(0,0,0,0.05); border-radius: 8px;">
                        <h3 style="margin-bottom: 10px; color: #666;">Summary</h3>
                        <p>${report.deepwiki.summary}</p>
                    </div>
                    ` : ''}
                </div>
            </div>
        </section>

        <!-- Issues Section -->
        <section id="issues" class="section">
            <h2 style="margin-bottom: 30px;">Issues Analysis</h2>
            
            <!-- Issues Statistics -->
            <div class="issues-stats">
                <div class="stat-card critical">
                    <div class="stat-value">${totalCritical}</div>
                    <div class="stat-label">Critical</div>
                </div>
                <div class="stat-card high">
                    <div class="stat-value">${totalHigh}</div>
                    <div class="stat-label">High</div>
                </div>
                <div class="stat-card medium">
                    <div class="stat-value">${totalMedium}</div>
                    <div class="stat-label">Medium</div>
                </div>
                <div class="stat-card low">
                    <div class="stat-value">${totalLow}</div>
                    <div class="stat-label">Low</div>
                </div>
            </div>
            
            <!-- Critical & High Priority Issues -->
            ${(totalCritical > 0 || totalHigh > 0) ? `
            <div style="margin-top: 30px;">
                <h3 style="margin-bottom: 20px; color: #ef4444;">
                    <i class="fas fa-exclamation-triangle"></i> Critical & High Priority Issues
                </h3>
                ${this.generateIssuesList(report.pr_issues?.critical || [], 'critical')}
                ${this.generateIssuesList(report.pr_issues?.high || [], 'high')}
                ${repHigh > 0 ? `
                    <h4 style="margin: 20px 0 15px; color: #666;">Repository Issues</h4>
                    ${this.generateIssuesList(report.repository_issues?.high || [], 'high')}
                ` : ''}
            </div>
            ` : ''}
            
            <!-- Medium & Low Priority Issues (Collapsible) -->
            ${(totalMedium > 0 || totalLow > 0) ? `
            <div class="toggle-section">
                <button class="toggle-btn" onclick="toggleSection('lower-issues')">
                    <i class="fas fa-chevron-down" id="toggle-icon"></i>
                    View ${totalMedium + totalLow} Medium & Low Priority Issues
                </button>
                <div id="lower-issues" class="collapsible-content">
                    <div style="padding-top: 20px;">
                        ${this.generateIssuesList(report.pr_issues?.medium || [], 'medium')}
                        ${this.generateIssuesList(report.pr_issues?.low || [], 'low')}
                        ${repMedium > 0 ? `
                            <h4 style="margin: 20px 0 15px; color: #666;">Repository Issues</h4>
                            ${this.generateIssuesList(report.repository_issues?.medium || [], 'medium')}
                        ` : ''}
                    </div>
                </div>
            </div>
            ` : ''}
        </section>

        <!-- Skills/Metrics Section -->
        <section id="skills" class="section">
            <h2 style="margin-bottom: 30px;">Quality Metrics</h2>
            
            <div class="score-display">
                <div class="score-circle">
                    <svg width="200" height="200">
                        <circle cx="100" cy="100" r="90" fill="none" stroke="#e5e7eb" stroke-width="20"/>
                        <circle cx="100" cy="100" r="90" fill="none" stroke="${overallScore >= 80 ? '#10b981' : overallScore >= 60 ? '#f59e0b' : '#ef4444'}" 
                                stroke-width="20" stroke-dasharray="${overallScore * 5.65} 565" 
                                transform="rotate(-90 100 100)" stroke-linecap="round"/>
                    </svg>
                    <div class="score-number" style="color: ${overallScore >= 80 ? '#10b981' : overallScore >= 60 ? '#f59e0b' : '#ef4444'}">
                        ${overallScore}
                    </div>
                </div>
                <div class="score-label">Overall Score</div>
            </div>
            
            <div class="skills-grid">
                ${this.generateSkillItem('Security', report.agents?.security?.score || 10, 'shield-alt')}
                ${this.generateSkillItem('Code Quality', report.agents?.codeQuality?.score || 75, 'code')}
                ${this.generateSkillItem('Performance', report.agents?.performance?.score || 65, 'tachometer-alt')}
                ${this.generateSkillItem('Architecture', report.agents?.architecture?.score || 72, 'sitemap')}
                ${this.generateSkillItem('Dependencies', report.agents?.dependencies?.score || 45, 'cube')}
            </div>
        </section>

        <!-- Recommendations Section -->
        ${report.recommendations?.length ? `
        <section class="section">
            <h2 style="margin-bottom: 30px;">Prioritized Recommendations</h2>
            ${report.recommendations.map((rec: any) => `
                <div class="recommendation-card" data-priority="${rec.priority}">
                    <h3 style="margin-bottom: 10px; color: #333;">${rec.title}</h3>
                    <p style="color: #666; margin-bottom: 10px;">${rec.description}</p>
                    <div class="rec-meta">
                        <span><i class="fas fa-clock"></i> <strong>Effort:</strong> ${rec.effort}</span>
                        <span><i class="fas fa-chart-line"></i> <strong>Impact:</strong> ${rec.impact}</span>
                    </div>
                </div>
            `).join('')}
        </section>
        ` : ''}

        <!-- Educational Section -->
        ${report.educational ? `
        <section id="education" class="section">
            <div class="section-header">
                <h2><i class="fas fa-graduation-cap"></i> Educational Resources</h2>
                <div class="learning-time">
                    <i class="fas fa-clock"></i> Estimated learning time: 30 mins
                </div>
            </div>
            
            <div class="educational-container">
                ${report.educational.modules?.map((module: any) => `
                    <div class="edu-module">
                        <h3>${module.title}</h3>
                        <p>${module.content}</p>
                        ${module.codeExample ? `
                            <pre class="code-snippet">${this.escapeHtml(module.codeExample)}</pre>
                        ` : ''}
                        ${module.resources?.length ? `
                            <div class="resources">
                                <h4>Resources:</h4>
                                <ul>
                                    ${module.resources.map((r: string) => `<li>${r}</li>`).join('')}
                                </ul>
                            </div>
                        ` : ''}
                    </div>
                `).join('') || ''}
            </div>
            
            ${report.educational.tips?.length ? `
                <div style="margin-top: 30px; padding: 20px; background: var(--bg-secondary); border-radius: 8px;">
                    <h3 style="color: var(--primary); margin-bottom: 15px;"><i class="fas fa-lightbulb"></i> Quick Tips</h3>
                    <ul style="list-style: none; padding: 0;">
                        ${report.educational.tips.map((tip: string) => `
                            <li style="padding: 12px 0; border-bottom: 1px solid var(--bg-tertiary);">
                                <i class="fas fa-arrow-right" style="color: var(--primary); margin-right: 10px;"></i>
                                ${tip}
                            </li>
                        `).join('')}
                    </ul>
                </div>
            ` : ''}
        </section>
        ` : ''}
        
        <!-- PR Comment Preview -->
        <section class="section">
            <div class="section-header">
                <h2><i class="fas fa-comment"></i> PR Comment Preview</h2>
                <button class="btn-primary" onclick="navigator.clipboard.writeText(document.querySelector('.pr-comment-text').textContent); alert('Copied to clipboard!');">
                    <i class="fas fa-copy"></i> Copy Comment
                </button>
            </div>
            <div class="pr-comment-preview">
                <pre class="pr-comment-text">## 🔍 CodeQual Analysis Report

### Decision: ${report.decision?.status || 'PENDING'} ${report.decision?.status === 'BLOCKED' ? '🚫' : '✅'}
${report.decision?.reason || 'Analysis in progress'}

**Overall Score:** ${report.overall_score}/100

### Summary
- 📊 **Files Changed:** ${report.deepwiki?.changes?.length || 0}
- ❗ **Critical Issues:** ${report.pr_issues?.critical?.length || 0}
- ⚠️ **High Priority Issues:** ${(report.pr_issues?.high?.length || 0) + (report.repository_issues?.high?.length || 0)}
- 📝 **Total Issues:** ${totalIssues}

### Top Recommendations
${report.recommendations?.slice(0, 3).map((rec: any, i: number) => `${i + 1}. ${rec.title}`).join('\n') || 'No recommendations'}

[View Full Report →](${typeof window !== 'undefined' ? window.location.href : '#'})</pre>
            </div>
        </section>
    </main>

    <script>
        // Toggle collapsible sections
        function toggleSection(sectionId) {
            const section = document.getElementById(sectionId);
            const icon = document.getElementById('toggle-icon');
            
            if (section.classList.contains('expanded')) {
                section.classList.remove('expanded');
                icon.classList.remove('fa-chevron-up');
                icon.classList.add('fa-chevron-down');
            } else {
                section.classList.add('expanded');
                icon.classList.remove('fa-chevron-down');
                icon.classList.add('fa-chevron-up');
            }
        }
        
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
      <div class="issue-card severity-${severity}">
        <div class="issue-header">
          <span class="issue-title">${issue.title}</span>
          <span class="severity-badge ${severity}">${severity.toUpperCase()}</span>
        </div>
        ${issue.file ? `<div class="issue-file">📍 ${issue.file}${issue.line ? `:${issue.line}` : ''}</div>` : ''}
        <div class="issue-description">${issue.description}</div>
        ${issue.codeSnippet ? `<pre class="code-snippet">${this.escapeHtml(issue.codeSnippet)}</pre>` : ''}
        ${issue.recommendation ? `
          <div class="recommendation">
            <strong>Recommendation:</strong> ${issue.recommendation}
          </div>
        ` : ''}
      </div>
    `).join('');
  }
  
  private generateSkillItem(name: string, score: number, icon: string): string {
    const color = score >= 80 ? '#10b981' : score >= 60 ? '#f59e0b' : '#ef4444';
    
    return `
      <div class="skill-item">
        <div class="skill-header">
          <div class="skill-name">
            <i class="fas fa-${icon}" style="color: ${color};"></i>
            <span>${name}</span>
          </div>
          <div class="skill-score" style="color: ${color};">${score}</div>
        </div>
        <div class="skill-bar">
          <div class="skill-fill" style="width: ${score}%; background: ${color};"></div>
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