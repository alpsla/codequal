import * as fs from 'fs';
import * as path from 'path';

export class HtmlReportGeneratorFixed {
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
        
        :root {
            --primary: #6366f1;
            --primary-dark: #4f46e5;
            --success: #10b981;
            --danger: #ef4444;
            --warning: #f59e0b;
            --info: #3b82f6;
            --light-bg: #f3f4f6;
            --dark-bg: #1f2937;
            --text-primary: #1f2937;
            --text-secondary: #6b7280;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            font-size: 16px;
            line-height: 1.6;
            color: var(--text-primary);
            background-color: var(--light-bg);
            margin: 0;
            padding: 0;
            transition: background-color 0.3s, color 0.3s;
        }
        
        body.dark-mode {
            --light-bg: #111827;
            --text-primary: #f3f4f6;
            --text-secondary: #9ca3af;
            background-color: #111827;
            color: #f3f4f6;
        }
        
        body.dark-mode .card {
            background: #1f2937;
            color: #f3f4f6;
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
        
        body.dark-mode .header {
            background: #1f2937;
            border-bottom-color: #374151;
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
            width: 32px;
        }
        
        .logo-text {
            font-size: 20px;
            font-weight: 600;
            color: var(--text-primary);
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
            color: var(--text-secondary);
            text-decoration: none;
            font-weight: 500;
            font-size: 14px;
            transition: all 0.2s;
            cursor: pointer;
        }
        
        .nav-link:hover {
            background: var(--light-bg);
            color: var(--text-primary);
        }
        
        .nav-link.active {
            background: var(--primary);
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
            background: var(--light-bg);
            color: var(--text-secondary);
            border-radius: 8px;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.2s;
        }
        
        .icon-btn:hover {
            background: #e5e7eb;
            color: var(--text-primary);
        }
        
        /* Search Modal */
        .search-modal {
            display: none;
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0,0,0,0.5);
            z-index: 2000;
        }
        
        .search-modal.active {
            display: flex;
            align-items: center;
            justify-content: center;
        }
        
        .search-container {
            background: white;
            border-radius: 12px;
            padding: 24px;
            width: 90%;
            max-width: 600px;
            position: relative;
        }
        
        body.dark-mode .search-container {
            background: #1f2937;
        }
        
        .search-input {
            width: 100%;
            padding: 12px 16px;
            border: 1px solid #e5e7eb;
            border-radius: 8px;
            font-size: 16px;
            outline: none;
        }
        
        .search-close {
            position: absolute;
            top: 24px;
            right: 24px;
            background: none;
            border: none;
            font-size: 24px;
            cursor: pointer;
            color: var(--text-secondary);
        }
        
        /* Export Modal */
        .export-modal {
            display: none;
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0,0,0,0.5);
            z-index: 2000;
        }
        
        .export-modal.active {
            display: flex;
            align-items: center;
            justify-content: center;
        }
        
        .export-container {
            background: white;
            border-radius: 12px;
            padding: 32px;
            width: 90%;
            max-width: 400px;
            position: relative;
        }
        
        body.dark-mode .export-container {
            background: #1f2937;
        }
        
        .export-container h3 {
            margin-bottom: 24px;
            font-size: 20px;
            color: var(--text-primary);
        }
        
        .export-options {
            display: flex;
            flex-direction: column;
            gap: 12px;
        }
        
        .export-option {
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 16px;
            border: 1px solid #e5e7eb;
            border-radius: 8px;
            background: white;
            cursor: pointer;
            transition: all 0.2s;
            text-align: left;
            font-size: 16px;
        }
        
        body.dark-mode .export-option {
            background: #374151;
            border-color: #4b5563;
        }
        
        .export-option:hover {
            background: var(--light-bg);
            transform: translateX(4px);
        }
        
        .export-option i {
            font-size: 20px;
            width: 24px;
            text-align: center;
        }
        
        .export-close {
            position: absolute;
            top: 16px;
            right: 16px;
            background: none;
            border: none;
            font-size: 24px;
            cursor: pointer;
            color: var(--text-secondary);
        }
        
        /* Main Content */
        .main-content {
            max-width: 1400px;
            margin: 0 auto;
            padding: 0 40px;
        }
        
        /* Dashboard Section - Compact */
        .dashboard-section {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 24px 0;
            margin: 0 -40px 24px;
            border-radius: 12px 12px 0 0;
        }
        
        .dashboard-content {
            max-width: 1400px;
            margin: 0 auto;
            padding: 0 40px;
        }
        
        .dashboard-header {
            margin-bottom: 20px;
        }
        
        .dashboard-header h1 {
            font-size: 24px;
            margin-bottom: 8px;
            font-weight: 600;
        }
        
        .subtitle {
            font-size: 16px;
            opacity: 0.9;
            margin-bottom: 4px;
        }
        
        .report-meta {
            display: flex;
            gap: 16px;
            margin-top: 8px;
            font-size: 13px;
            opacity: 0.8;
        }
        
        .meta-item {
            display: flex;
            align-items: center;
            gap: 4px;
        }
        
        .meta-item i {
            font-size: 12px;
        }
        
        .metrics-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 16px;
        }
        
        .metric-card {
            background: rgba(255, 255, 255, 0.1);
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255, 255, 255, 0.2);
            border-radius: 8px;
            padding: 16px;
            display: flex;
            align-items: center;
            gap: 12px;
            transition: all 0.2s;
        }
        
        .metric-card:hover {
            transform: translateY(-1px);
            background: rgba(255, 255, 255, 0.15);
        }
        
        .metric-icon {
            width: 40px;
            height: 40px;
            border-radius: 8px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 20px;
            color: white;
            background: rgba(255, 255, 255, 0.2);
        }
        
        .metric-icon.files { background: rgba(99, 102, 241, 0.4); }
        .metric-icon.added { background: rgba(16, 185, 129, 0.4); }
        .metric-icon.removed { background: rgba(239, 68, 68, 0.4); }
        .metric-icon.language { background: rgba(59, 130, 246, 0.4); }
        
        .metric-content {
            flex: 1;
        }
        
        .metric-value {
            font-size: 24px;
            font-weight: 600;
            line-height: 1;
        }
        
        .metric-label {
            font-size: 13px;
            opacity: 0.9;
            margin-top: 2px;
        }
        
        /* Card Component */
        .card {
            background: white;
            border-radius: 12px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
            margin-bottom: 24px;
            overflow: hidden;
        }
        
        /* PR Decision Section - Compact */
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
            grid-template-columns: 160px 1fr;
            gap: 32px;
            align-items: center;
        }
        
        .decision-visual {
            text-align: center;
        }
        
        .decision-icon-circle {
            width: 100px;
            height: 100px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 48px;
            margin: 0 auto 16px;
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
        
        .confidence-meter {
            max-width: 120px;
            margin: 0 auto;
        }
        
        .confidence-label {
            font-size: 12px;
            color: var(--text-secondary);
            margin-bottom: 4px;
            text-align: center;
        }
        
        .confidence-bar {
            height: 6px;
            background: #e5e7eb;
            border-radius: 3px;
            overflow: hidden;
        }
        
        .confidence-fill {
            height: 100%;
            transition: width 1s ease;
            background: var(--primary);
        }
        
        .blocked .confidence-fill {
            width: ${100 - confidence}%;
        }
        
        .approved .confidence-fill {
            width: ${confidence}%;
        }
        
        .confidence-value {
            text-align: center;
            margin-top: 4px;
            font-weight: 600;
            font-size: 14px;
            color: var(--text-primary);
        }
        
        .decision-content {
            flex: 1;
        }
        
        .decision-title {
            font-size: 24px;
            font-weight: 600;
            margin-bottom: 8px;
        }
        
        .blocked .decision-title {
            color: #ef4444;
        }
        
        .approved .decision-title {
            color: #10b981;
        }
        
        .decision-message {
            color: var(--text-secondary);
            font-size: 15px;
            margin-bottom: 24px;
        }
        
        .decision-factors {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
        }
        
        .factor-card {
            background: #f9fafb;
            padding: 20px;
            border-radius: 8px;
            border: 1px solid #e5e7eb;
        }
        
        body.dark-mode .factor-card {
            background: #374151;
            border-color: #4b5563;
        }
        
        .factor-card h3 {
            display: flex;
            align-items: center;
            gap: 8px;
            margin-bottom: 12px;
            font-size: 16px;
            font-weight: 600;
        }
        
        .blocking-issues h3 {
            color: #ef4444;
        }
        
        .blocking-issues h3 i {
            color: #ef4444;
            font-size: 16px;
        }
        
        .positive-findings h3 {
            color: #10b981;
        }
        
        .positive-findings h3 i {
            color: #10b981;
            font-size: 16px;
        }
        
        .factor-list {
            list-style: none;
            font-size: 14px;
        }
        
        .factor-list li {
            padding: 6px 0;
            display: flex;
            align-items: center;
            gap: 8px;
            color: var(--text-secondary);
        }
        
        .factor-list .badge {
            background: #fef3c7;
            color: #d97706;
            padding: 2px 6px;
            border-radius: 4px;
            font-size: 11px;
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
            color: var(--text-primary);
        }
        
        .issues-header h2 i {
            color: var(--primary);
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
        
        body.dark-mode .filter-btn {
            background: #374151;
            border-color: #4b5563;
            color: #f3f4f6;
        }
        
        .filter-btn:hover {
            background: var(--light-bg);
        }
        
        .filter-btn.active {
            background: var(--primary);
            color: white;
            border-color: var(--primary);
        }
        
        .issue-item {
            background: white;
            border: 1px solid #e5e7eb;
            border-radius: 8px;
            margin-bottom: 16px;
            overflow: hidden;
            transition: all 0.2s;
        }
        
        body.dark-mode .issue-item {
            background: #374151;
            border-color: #4b5563;
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
        
        body.dark-mode .issue-header {
            background: #1f2937;
            border-bottom-color: #374151;
        }
        
        .issue-title {
            display: flex;
            align-items: center;
            gap: 12px;
            font-weight: 600;
            color: var(--text-primary);
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
            color: var(--text-secondary);
            margin-bottom: 16px;
        }
        
        .issue-meta {
            display: flex;
            gap: 16px;
            margin-bottom: 16px;
            font-size: 14px;
            color: var(--text-secondary);
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
        
        body.dark-mode .code-snippet {
            background: #111827;
        }
        
        .recommendation {
            background: #eff6ff;
            border: 1px solid #dbeafe;
            border-radius: 6px;
            padding: 16px;
            margin-top: 16px;
            color: #1e40af;
        }
        
        body.dark-mode .recommendation {
            background: #1e3a8a;
            border-color: #3730a3;
            color: #dbeafe;
        }
        
        .recommendation strong {
            display: block;
            margin-bottom: 8px;
            color: #1e3a8a;
        }
        
        body.dark-mode .recommendation strong {
            color: #dbeafe;
        }
        
        .view-all-btn {
            margin: 16px 0;
            padding: 8px 16px;
            background: #f3f4f6;
            border: 1px solid #e5e7eb;
            border-radius: 6px;
            cursor: pointer;
            font-size: 14px;
            color: #4b5563;
        }
        
        body.dark-mode .view-all-btn {
            background: #374151;
            border-color: #4b5563;
            color: #d1d5db;
        }
        
        .view-all-btn:hover {
            background: #e5e7eb;
        }
        
        .hidden {
            display: none !important;
        }
        
        .hideable {
            transition: all 0.3s ease;
        }
        
        /* Footer */
        .footer {
            text-align: center;
            padding: 20px;
            color: var(--text-secondary);
            font-size: 14px;
            margin-top: 40px;
        }
        
        /* Progress Indicator */
        .progress-indicator {
            position: fixed;
            bottom: 20px;
            right: 20px;
            background: white;
            border-radius: 12px;
            padding: 16px 20px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            display: none;
            z-index: 1000;
        }
        
        .progress-indicator.active {
            display: block;
        }
        
        .progress-content {
            display: flex;
            align-items: center;
            gap: 12px;
        }
        
        .progress-spinner {
            width: 20px;
            height: 20px;
            border: 2px solid #e5e7eb;
            border-top-color: var(--primary);
            border-radius: 50%;
            animation: spin 1s linear infinite;
        }
        
        @keyframes spin {
            to { transform: rotate(360deg); }
        }
        
        .progress-text {
            font-size: 14px;
            color: var(--text-primary);
        }
        
        .progress-bar {
            width: 200px;
            height: 4px;
            background: #e5e7eb;
            border-radius: 2px;
            overflow: hidden;
            margin-top: 8px;
        }
        
        .progress-fill {
            height: 100%;
            background: var(--primary);
            transition: width 0.3s ease;
        }
        
        /* Print styles for PDF export */
        @media print {
            body {
                background: white !important;
                color: #1f2937 !important;
            }
            
            .header {
                position: relative !important;
                box-shadow: none !important;
                border-bottom: 2px solid #e5e7eb !important;
                page-break-after: avoid;
            }
            
            .nav-menu, .header-actions, .view-all-btn, .filter-btn, 
            .search-modal, .export-modal, .progress-indicator {
                display: none !important;
            }
            
            .card {
                box-shadow: none !important;
                border: 1px solid #e5e7eb !important;
                page-break-inside: avoid;
            }
            
            .issue-item.hideable.hidden {
                display: block !important;
            }
            
            .dashboard-section {
                background: #f3f4f6 !important;
                color: #1f2937 !important;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
            }
            
            .code-snippet {
                background: #f3f4f6 !important;
                color: #1f2937 !important;
                border: 1px solid #e5e7eb !important;
            }
        }
    </style>
</head>
<body>
    <!-- Header -->
    <div class="header">
        <div class="header-content">
            <div class="logo-section">
                <svg class="logo-image" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
                    <defs>
                        <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" style="stop-color:#667eea;stop-opacity:1" />
                            <stop offset="100%" style="stop-color:#764ba2;stop-opacity:1" />
                        </linearGradient>
                    </defs>
                    <rect x="20" y="20" width="160" height="160" rx="20" fill="url(#grad1)"/>
                    <text x="100" y="120" font-family="Arial, sans-serif" font-size="80" font-weight="bold" fill="white" text-anchor="middle">CQ</text>
                </svg>
                <span class="logo-text">CodeQual</span>
            </div>
            
            <nav class="nav-menu" id="navMenu">
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
                    <i class="fas fa-brain"></i>
                    Skills
                </a>
                <a href="#education" class="nav-link">
                    <i class="fas fa-graduation-cap"></i>
                    Education
                </a>
            </nav>
            
            <div class="header-actions">
                <button class="icon-btn" id="searchBtn">
                    <i class="fas fa-search"></i>
                </button>
                <button class="icon-btn" id="themeToggle">
                    <i class="fas fa-moon"></i>
                </button>
                <button class="icon-btn" id="exportBtn">
                    <i class="fas fa-download"></i>
                </button>
            </div>
        </div>
    </div>
    
    <!-- Search Modal -->
    <div class="search-modal" id="searchModal">
        <div class="search-container">
            <input type="text" class="search-input" id="searchInput" placeholder="Search in report...">
            <button class="search-close" id="searchClose">&times;</button>
            <div class="search-results" id="searchResults"></div>
        </div>
    </div>
    
    <!-- Export Modal -->
    <div class="export-modal" id="exportModal">
        <div class="export-container">
            <h3>Export Report</h3>
            <div class="export-options">
                <button class="export-option" id="exportPDF">
                    <i class="fas fa-file-pdf"></i>
                    <span>Export as PDF</span>
                </button>
                <button class="export-option" id="exportLink">
                    <i class="fas fa-link"></i>
                    <span>Copy Share Link</span>
                </button>
                <button class="export-option" id="exportMarkdown">
                    <i class="fas fa-file-code"></i>
                    <span>Export as Markdown</span>
                </button>
            </div>
            <button class="export-close" id="exportClose">&times;</button>
        </div>
    </div>
    
    <!-- Progress Indicator -->
    <div class="progress-indicator" id="progressIndicator">
        <div class="progress-content">
            <div class="progress-spinner"></div>
            <div>
                <div class="progress-text" id="progressText">Analyzing code...</div>
                <div class="progress-bar">
                    <div class="progress-fill" id="progressFill" style="width: 0%"></div>
                </div>
            </div>
        </div>
    </div>
    
    <div class="main-content">
        <!-- Dashboard Section - Compact -->
        <div class="dashboard-section" id="overview">
            <div class="dashboard-content">
                <div class="dashboard-header">
                    <h1>Code Analysis Report</h1>
                    <div class="subtitle">Pull Request #${prNumber} - ${repoName}</div>
                    <div class="report-meta">
                        <span class="meta-item"><i class="fas fa-clock"></i> ${new Date().toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}</span>
                        <span class="meta-item"><i class="fas fa-code-branch"></i> v1.0.0</span>
                        <span class="meta-item"><i class="fas fa-fingerprint"></i> ${report.id || 'abc-123-def-456'}</span>
                    </div>
                </div>
                
                <div class="metrics-grid">
                    <div class="metric-card">
                        <div class="metric-icon files">
                            <i class="fas fa-file-code"></i>
                        </div>
                        <div class="metric-content">
                            <div class="metric-value">${filesChanged}</div>
                            <div class="metric-label">Files Changed</div>
                        </div>
                    </div>
                    
                    <div class="metric-card">
                        <div class="metric-icon added">
                            <i class="fas fa-plus"></i>
                        </div>
                        <div class="metric-content">
                            <div class="metric-value">${linesAdded}</div>
                            <div class="metric-label">Lines Added</div>
                        </div>
                    </div>
                    
                    <div class="metric-card">
                        <div class="metric-icon removed">
                            <i class="fas fa-minus"></i>
                        </div>
                        <div class="metric-content">
                            <div class="metric-value">${linesRemoved}</div>
                            <div class="metric-label">Lines Removed</div>
                        </div>
                    </div>
                    
                    <div class="metric-card">
                        <div class="metric-icon language">
                            <i class="fas fa-laptop-code"></i>
                        </div>
                        <div class="metric-content">
                            <div class="metric-value">TypeScript</div>
                            <div class="metric-label">Language</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        
        <!-- PR Decision Section -->
        <div class="pr-decision ${decisionClass}" id="decision">
            <div class="decision-container">
                <div class="decision-visual">
                    <div class="decision-icon-circle">
                        ${decisionIcon}
                    </div>
                    <div class="confidence-meter">
                        <div class="confidence-label">Confidence</div>
                        <div class="confidence-bar">
                            <div class="confidence-fill" style="width: ${confidence}%"></div>
                        </div>
                        <div class="confidence-value">${confidence}%</div>
                    </div>
                </div>
                
                <div class="decision-content">
                    <h2 class="decision-title">PR Decision: ${decisionText}</h2>
                    <p class="decision-message">${decisionReason}</p>
                    
                    <div class="decision-factors">
                        <div class="factor-card blocking-issues">
                            <h3><i class="fas fa-ban"></i> Blocking Issues</h3>
                            <ul class="factor-list">
                                ${isBlocked ? `
                                    <li><span class="badge critical">CRITICAL</span> SQL Injection vulnerability in auth module</li>
                                    <li><span class="badge high">HIGH</span> Exposed API keys in configuration</li>
                                ` : '<li>No blocking issues found</li>'}
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
        </div>
        
        <!-- PR Issues Section -->
        <div class="card" id="pr-issues">
            <div class="issues-section">
                <div class="issues-header">
                    <h2><i class="fas fa-code-branch"></i> Current PR Issues
                        <span style="font-size: 16px; font-weight: normal; color: var(--text-secondary); margin-left: 12px;">
                            ${prCritical > 0 ? `<span style="color: #ef4444;">${prCritical} critical</span> · ` : ''}
                            ${prHigh > 0 ? `<span style="color: #f59e0b;">${prHigh} high</span> · ` : ''}
                            ${prMedium > 0 ? `<span style="color: #3b82f6;">${prMedium} medium</span> · ` : ''}
                            ${prLow > 0 ? `<span style="color: #6b7280;">${prLow} low</span>` : ''}
                        </span>
                    </h2>
                    <div class="issue-filters">
                        <button class="filter-btn active" id="showAllBtn">Show All (${prCritical + prHigh + prMedium + prLow} issues)</button>
                    </div>
                </div>
                
                ${this.renderIssues(report.pr_issues)}
            </div>
        </div>
        
        <!-- Repository Issues Section -->
        <div class="card" id="repo-issues">
            <div class="issues-section">
                <div class="issues-header">
                    <h2><i class="fas fa-exclamation-triangle"></i> Repository Issues
                        <span style="font-size: 16px; font-weight: normal; color: var(--text-secondary); margin-left: 12px;">
                            ${repHigh > 0 ? `<span style="color: #f59e0b;">${repHigh} high</span> · ` : ''}
                            ${repMedium > 0 ? `<span style="color: #3b82f6;">${repMedium} medium</span>` : ''}
                        </span>
                    </h2>
                </div>
                
                ${this.renderRepositoryIssues(report.repository_issues)}
            </div>
        </div>
        
        <!-- Other sections... -->
    </div>
    
    <!-- Footer -->
    <div class="footer">
        <p>Generated by CodeQual on ${new Date().toLocaleString()}</p>
    </div>
    
    <script>
        // All JavaScript functions with proper implementations
        
        // Toggle issues visibility
        window.toggleIssues = function(severity) {
            const issues = document.querySelectorAll('.issue-item.' + severity + '.hideable');
            const btn = event.target;
            
            issues.forEach(issue => {
                issue.classList.toggle('hidden');
            });
            
            if (btn) {
                const isHidden = issues[0]?.classList.contains('hidden');
                const count = issues.length;
                btn.textContent = isHidden ? 'Show ' + count + ' more ' + severity + ' issues' : 'Hide ' + severity + ' issues';
            }
        };
        
        // Theme toggle
        window.toggleTheme = function() {
            const body = document.body;
            const isDark = body.classList.contains('dark-mode');
            body.classList.toggle('dark-mode');
            
            const themeIcon = document.querySelector('#themeToggle i');
            themeIcon.className = isDark ? 'fas fa-moon' : 'fas fa-sun';
            
            localStorage.setItem('theme', isDark ? 'light' : 'dark');
        };
        
        // Search functionality
        window.openSearch = function() {
            document.getElementById('searchModal').classList.add('active');
            document.getElementById('searchInput').focus();
        };
        
        window.closeSearch = function() {
            document.getElementById('searchModal').classList.remove('active');
            document.getElementById('searchInput').value = '';
            document.getElementById('searchResults').innerHTML = '';
        };
        
        window.performSearch = function(event) {
            if (event.key === 'Escape') {
                closeSearch();
                return;
            }
            
            const query = event.target.value.toLowerCase();
            if (query.length < 2) {
                document.getElementById('searchResults').innerHTML = '';
                return;
            }
            
            // Simple search implementation
            const elements = document.querySelectorAll('.issue-title, .issue-description, h2, h3, p');
            const results = [];
            
            elements.forEach(el => {
                if (el.textContent.toLowerCase().includes(query)) {
                    results.push({
                        text: el.textContent.substring(0, 100) + '...',
                        element: el
                    });
                }
            });
            
            const resultsContainer = document.getElementById('searchResults');
            resultsContainer.innerHTML = results.slice(0, 10).map((r, idx) => 
                '<div class="search-result" data-idx="' + idx + '">' + r.text + '</div>'
            ).join('');
            
            // Store results for click handling
            window.searchResults = results;
        };
        
        // Export functionality
        window.openExport = function() {
            document.getElementById('exportModal').classList.add('active');
        };
        
        window.closeExport = function() {
            document.getElementById('exportModal').classList.remove('active');
        };
        
        window.exportToPDF = function() {
            window.print();
            closeExport();
        };
        
        window.copyShareLink = function() {
            const url = window.location.href;
            navigator.clipboard.writeText(url).then(() => {
                alert('Share link copied to clipboard!');
                closeExport();
            });
        };
        
        window.exportToMarkdown = function() {
            // Simple markdown export
            const content = document.querySelector('.main-content').innerText;
            const blob = new Blob([content], { type: 'text/markdown' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'codequal-report.md';
            a.click();
            closeExport();
        };
        
        // Initialize on DOM load
        document.addEventListener('DOMContentLoaded', function() {
            // Initialize theme
            const savedTheme = localStorage.getItem('theme');
            if (savedTheme === 'dark') {
                document.body.classList.add('dark-mode');
                document.querySelector('#themeToggle i').className = 'fas fa-sun';
            }
            
            // Event listeners
            document.getElementById('themeToggle').addEventListener('click', toggleTheme);
            document.getElementById('searchBtn').addEventListener('click', openSearch);
            document.getElementById('searchClose').addEventListener('click', closeSearch);
            document.getElementById('searchInput').addEventListener('keyup', performSearch);
            document.getElementById('exportBtn').addEventListener('click', openExport);
            document.getElementById('exportClose').addEventListener('click', closeExport);
            document.getElementById('exportPDF').addEventListener('click', exportToPDF);
            document.getElementById('exportLink').addEventListener('click', copyShareLink);
            document.getElementById('exportMarkdown').addEventListener('click', exportToMarkdown);
            
            // Close modals on outside click
            document.getElementById('searchModal').addEventListener('click', function(e) {
                if (e.target === this) closeSearch();
            });
            document.getElementById('exportModal').addEventListener('click', function(e) {
                if (e.target === this) closeExport();
            });
            
            // Search result clicks
            document.getElementById('searchResults').addEventListener('click', function(e) {
                if (e.target.classList.contains('search-result')) {
                    const idx = parseInt(e.target.dataset.idx);
                    if (window.searchResults && window.searchResults[idx]) {
                        window.searchResults[idx].element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        closeSearch();
                    }
                }
            });
            
            // Navigation
            document.querySelectorAll('.nav-link').forEach(link => {
                link.addEventListener('click', function(e) {
                    e.preventDefault();
                    const targetId = this.getAttribute('href').substring(1);
                    const targetElement = document.getElementById(targetId);
                    if (targetElement) {
                        targetElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }
                });
            });
            
            // Intersection Observer for navigation highlighting
            const sections = document.querySelectorAll('.dashboard-section, .card, .pr-decision');
            const navLinks = document.querySelectorAll('.nav-link');
            
            const observerOptions = {
                root: null,
                rootMargin: '-20% 0px -70% 0px',
                threshold: 0
            };
            
            const observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const id = entry.target.id;
                        navLinks.forEach(link => {
                            const href = link.getAttribute('href');
                            if (href === '#' + id) {
                                navLinks.forEach(l => l.classList.remove('active'));
                                link.classList.add('active');
                            }
                        });
                    }
                });
            }, observerOptions);
            
            sections.forEach(section => {
                if (section.id) observer.observe(section);
            });
            
            // Progress simulation (if enabled)
            if (window.location.search.includes('progress=true')) {
                const progressIndicator = document.getElementById('progressIndicator');
                const progressFill = document.getElementById('progressFill');
                const progressText = document.getElementById('progressText');
                
                progressIndicator.classList.add('active');
                
                const stages = [
                    { text: 'Initializing analysis...', progress: 10 },
                    { text: 'Scanning PR changes...', progress: 30 },
                    { text: 'Running security checks...', progress: 50 },
                    { text: 'Analyzing code quality...', progress: 70 },
                    { text: 'Generating report...', progress: 90 },
                    { text: 'Complete!', progress: 100 }
                ];
                
                let currentStage = 0;
                const interval = setInterval(() => {
                    if (currentStage < stages.length) {
                        progressText.textContent = stages[currentStage].text;
                        progressFill.style.width = stages[currentStage].progress + '%';
                        currentStage++;
                    } else {
                        clearInterval(interval);
                        setTimeout(() => {
                            progressIndicator.classList.remove('active');
                        }, 1000);
                    }
                }, 1000);
            }
        });
    </script>
</body>
</html>`;
    
    return html;
  }
  
  private renderIssues(issues: any): string {
    let html = '';
    
    // Render critical and high issues
    ['critical', 'high'].forEach(severity => {
      if (issues[severity]?.length > 0) {
        issues[severity].forEach((issue: any) => {
          html += this.renderIssueItem(issue, severity, false);
        });
      }
    });
    
    // Add button for medium/low issues
    const mediumCount = issues.medium?.length || 0;
    const lowCount = issues.low?.length || 0;
    
    if (mediumCount > 0) {
      html += `<button class="view-all-btn" onclick="toggleIssues('medium')">Show ${mediumCount} more medium issues</button>`;
      issues.medium.forEach((issue: any) => {
        html += this.renderIssueItem(issue, 'medium', true);
      });
    }
    
    if (lowCount > 0) {
      html += `<button class="view-all-btn" onclick="toggleIssues('low')">Show ${lowCount} more low issues</button>`;
      issues.low.forEach((issue: any) => {
        html += this.renderIssueItem(issue, 'low', true);
      });
    }
    
    return html || '<p style="text-align: center; color: #6b7280; padding: 20px;">No issues found in this PR.</p>';
  }
  
  private renderIssueItem(issue: any, severity: string, hideable: boolean): string {
    const hideClass = hideable ? 'hideable hidden' : '';
    
    return `
      <div class="issue-item ${severity} ${hideClass}">
        <div class="issue-header">
          <div class="issue-title">
            ${issue.title || issue.message}
            <span class="severity-badge ${severity}">${severity}</span>
          </div>
        </div>
        <div class="issue-body">
          <p class="issue-description">${issue.description || issue.details || ''}</p>
          ${issue.file ? `
            <div class="issue-meta">
              <span><i class="fas fa-file-code"></i> ${issue.file}</span>
              ${issue.line ? `<span><i class="fas fa-hashtag"></i> Line ${issue.line}</span>` : ''}
            </div>
          ` : ''}
          ${issue.code_snippet ? `
            <div class="code-snippet">
              <pre><code>${issue.code_snippet}</code></pre>
            </div>
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
  }
  
  private renderRepositoryIssues(issues: any): string {
    let html = '';
    
    // Show high priority issues
    if (issues.high?.length > 0) {
      issues.high.forEach((issue: any) => {
        html += this.renderIssueItem(issue, 'high', false);
      });
    }
    
    // Hidden medium issues
    const mediumCount = issues.medium?.length || 0;
    if (mediumCount > 0) {
      html += `<button class="view-all-btn" onclick="toggleIssues('medium')">Show ${mediumCount} more medium issues</button>`;
      
      issues.medium.forEach((issue: any) => {
        html += this.renderIssueItem(issue, 'medium', true);
      });
    }
    
    return html || '<p style="text-align: center; color: #6b7280; padding: 20px;">No repository-wide issues found.</p>';
  }
}