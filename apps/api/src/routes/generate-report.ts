import { Router, Request, Response } from 'express';
import * as fs from 'fs/promises';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

interface ReportRequest {
  analysisData: any; // The PR analysis results
  language?: string; // Requested language (default: 'en')
}

interface ReportResponse {
  success: boolean;
  reportUrl?: string;
  availableLanguages?: string[];
  error?: string;
}

// Available languages with their display names
const AVAILABLE_LANGUAGES = {
  en: 'English',
  ru: 'Русский',
  es: 'Español',
  fr: 'Français',
  de: 'Deutsch',
  ja: '日本語',
  zh: '中文',
  pt: 'Português',
  it: 'Italiano',
  ko: '한국어'
};

// Simple template processor that actually works
// Adapter to map existing data structure to enhanced template placeholders
function mapToEnhancedTemplate(data: any, translations: any): any {
  // Map approval status to class
  const approvalClassMap: Record<string, string> = {
    'approved': 'approved',
    'conditionally_approved': 'conditionally-approved',
    'blocked': 'blocked'
  };
  
  // Map approval status to icon
  const approvalIconMap: Record<string, string> = {
    'approved': '✅',
    'conditionally_approved': '⚠️',
    'blocked': '❌'
  };
  
  // Calculate confidence percentage (mock for now)
  const confidenceMap: Record<string, number> = {
    'approved': 95,
    'conditionally_approved': 75,
    'blocked': 30
  };
  
  // Count issues by severity
  const countIssues = (issues: any[], severity: string) => 
    issues?.filter(i => i.severity?.toLowerCase() === severity.toLowerCase()).length || 0;
  
  const allIssues = [...(data.pr_issues || []), ...(data.high_priority_repo_issues || []), ...(data.lower_priority_repo_issues || [])];
  
  // Convert blocking issues to HTML
  const blockingIssuesHtml = data.blocking_issues?.map((issue: any) => 
    `<li><span class="badge ${issue.severity?.toLowerCase() || 'high'}">${issue.severity || 'HIGH'}</span> ${issue.description}</li>`
  ).join('') || '<li>No blocking issues found</li>';
  
  // Convert positive findings to HTML
  const positiveFindingsHtml = data.positive_findings?.map((finding: any) => 
    `<li>✅ ${finding.description}</li>`
  ).join('') || '<li>✅ Code follows best practices</li>';
  
  // Convert PR issues to HTML
  const prIssuesContent = data.pr_issues?.map((issue: any) => `
    <div class="finding ${issue.severity_class || issue.severity?.toLowerCase() || 'medium'}" data-severity="${issue.severity?.toLowerCase() || 'medium'}" data-type="${issue.type || 'quality'}">
      <span class="badge ${issue.severity_class || issue.severity?.toLowerCase() || 'medium'}">${issue.severity || 'MEDIUM'}</span>
      <h3>${issue.title}</h3>
      <p><strong>File:</strong> ${issue.file_path}:${issue.line_number}</p>
      <p>${issue.description}</p>
      ${issue.code_snippet ? `<div class="code-snippet">${issue.code_snippet}</div>` : ''}
      <div class="recommendation-box">
        <strong>Recommendation:</strong> ${issue.recommendation}
      </div>
    </div>
  `).join('') || '<p>No issues found in this PR.</p>';
  
  // Convert repository issues to HTML
  const highPriorityIssuesHtml = data.high_priority_repo_issues?.map((issue: any) => `
    <div class="finding ${issue.severity_class || issue.severity?.toLowerCase() || 'high'}" data-severity="${issue.severity?.toLowerCase() || 'high'}" data-type="${issue.type || 'quality'}">
      <span class="badge ${issue.severity_class || issue.severity?.toLowerCase() || 'high'}">${issue.severity || 'HIGH'}</span>
      <h3>${issue.title}</h3>
      <p>${issue.description}</p>
      ${issue.recommendation ? `<div class="recommendation-box"><strong>Recommendation:</strong> ${issue.recommendation}</div>` : ''}
    </div>
  `).join('') || '';
  
  const lowerPriorityIssuesHtml = data.lower_priority_repo_issues?.length > 0 ? `
    <div id="lowerPriorityIssues" style="display: none;">
      ${data.lower_priority_repo_issues.map((issue: any) => `
        <div class="finding ${issue.severity_class || issue.severity?.toLowerCase() || 'medium'}" data-severity="${issue.severity?.toLowerCase() || 'medium'}" data-type="${issue.type || 'quality'}">
          <span class="badge ${issue.severity_class || issue.severity?.toLowerCase() || 'medium'}">${issue.severity || 'MEDIUM'}</span>
          <h3>${issue.title}</h3>
          <p>${issue.description}</p>
          ${issue.recommendation ? `<div class="recommendation-box"><strong>Recommendation:</strong> ${issue.recommendation}</div>` : ''}
        </div>
      `).join('')}
    </div>
  ` : '';
  
  const toggleButtonHtml = data.lower_priority_repo_issues?.length > 0 ? `
    <button class="toggle-button" id="toggleRepoIssues" onclick="toggleLowerPriorityIssues()">
      <span id="toggleText">Show All</span> <span id="toggleArrow">▼</span> (${data.lower_priority_repo_issues.length} more issues)
    </button>
  ` : '';
  
  // Convert skills to HTML
  const skillsHtml = data.skills?.map((skill: any) => `
    <div class="skill-card">
      <div class="skill-header">
        <span>${skill.name}</span>
        <span>${skill.score}/100</span>
      </div>
      <div class="skill-bar">
        <div class="skill-fill" style="width: ${skill.score}%"></div>
      </div>
    </div>
  `).join('') || `
    <div class="skill-card">
      <div class="skill-header">
        <span>Code Quality</span>
        <span>${data.overall_score || 70}/100</span>
      </div>
      <div class="skill-bar">
        <div class="skill-fill" style="width: ${data.overall_score || 70}%"></div>
      </div>
    </div>
  `;
  
  // Convert educational modules to HTML
  const educationalHtml = data.educational_modules?.map((module: any) => `
    <div class="edu-module">
      <h3>${module.icon || '📚'} ${module.title}</h3>
      <p>${module.description}</p>
      <a href="${module.real_link || '#'}" class="edu-link" target="_blank">Start Learning →</a>
    </div>
  `).join('') || '<p>No educational resources available for this analysis.</p>';
  
  // Calculate score trend
  const scoreTrend = data.score_trend || 0;
  const scoreTrendClass = scoreTrend > 0 ? 'positive' : scoreTrend < 0 ? 'negative' : 'neutral';
  const scoreTrendIcon = scoreTrend > 0 ? 'fa-arrow-up' : scoreTrend < 0 ? 'fa-arrow-down' : 'fa-equals';
  const scoreTrendValue = scoreTrend > 0 ? `+${scoreTrend}` : scoreTrend.toString();
  
  // Return enhanced data structure
  return {
    ...data,
    // Approval
    approval_class: approvalClassMap[data.approval_status] || 'conditionally-approved',
    approval_icon: approvalIconMap[data.approval_status] || '⚠️',
    confidence_percentage: confidenceMap[data.approval_status] || 75,
    
    // HTML content
    blocking_issues_html: blockingIssuesHtml,
    positive_findings_html: positiveFindingsHtml,
    pr_issues_content: prIssuesContent,
    high_priority_issues_html: highPriorityIssuesHtml,
    lower_priority_issues_html: lowerPriorityIssuesHtml,
    toggle_button_html: toggleButtonHtml,
    skills_html: skillsHtml,
    educational_html: educationalHtml,
    skill_recommendations_html: data.skill_recommendations?.map((rec: any) => `
      <div class="recommendation-card">
        <h4>${rec.icon || '💡'} ${rec.title}</h4>
        <p>${rec.description}</p>
      </div>
    `).join('') || '',
    
    // Counts
    critical_count: countIssues(allIssues, 'critical'),
    high_count: countIssues(allIssues, 'high'),
    medium_count: countIssues(allIssues, 'medium'),
    low_count: countIssues(allIssues, 'low'),
    
    // Score
    score_class: data.overall_score >= 80 ? 'high' : data.overall_score >= 60 ? 'medium' : 'low',
    score_trend_class: scoreTrendClass,
    score_trend_icon: scoreTrendIcon,
    score_trend_value: scoreTrendValue,
    
    // Metadata
    app_version: '2.1.0',
    total_learning_time: data.total_learning_time || '30 minutes',
    
    // PR Comment
    pr_comment_text: data.pr_comment || `## CodeQual Analysis Report\n\n**Decision:** ${data.approval_status_text}\n\n${data.approval_message}\n\n### Code Quality Score: ${data.overall_score}/100`
  };
}

function processTemplate(template: string, data: any, translations: any): string {
  let html = template;
  
  // First, handle all the data replacements
  Object.entries(data).forEach(([key, value]) => {
    const regex = new RegExp(`{{${key}}}`, 'g');
    html = html.replace(regex, String(value));
  });
  
  // Handle translations
  html = html.replace(/{{i18n\.([^}]+)}}/g, (match, path) => {
    const keys = path.split('.');
    let value = translations;
    for (const key of keys) {
      value = value?.[key];
    }
    return value || match;
  });
  
  // Handle conditionals - simple approach
  // For has_pr_issues
  if (data.has_pr_issues) {
    html = html.replace(/{{#if has_pr_issues}}([\s\S]*?){{else}}([\s\S]*?){{\/if}}/g, '$1');
    html = html.replace(/{{#if has_pr_issues}}([\s\S]*?){{\/if}}/g, '$1');
  } else {
    html = html.replace(/{{#if has_pr_issues}}([\s\S]*?){{else}}([\s\S]*?){{\/if}}/g, '$2');
    html = html.replace(/{{#if has_pr_issues}}([\s\S]*?){{\/if}}/g, '');
  }
  
  // For has_lower_priority_issues
  if (data.has_lower_priority_issues) {
    html = html.replace(/{{#if has_lower_priority_issues}}([\s\S]*?){{\/if}}/g, '$1');
  } else {
    html = html.replace(/{{#if has_lower_priority_issues}}([\s\S]*?){{\/if}}/g, '');
  }
  
  // Handle arrays by replacing with actual content
  html = processArrays(html, data, translations);
  
  return html;
}

function processArrays(html: string, data: any, translations: any): string {
  // Process blocking issues
  if (data.blocking_issues) {
    const blockingIssuesHtml = data.blocking_issues.map((issue: any) => 
      `<li style="margin-bottom: 10px;">
        <strong>${issue.icon}&nbsp;${issue.severity}:</strong>&nbsp;${issue.description}
      </li>`
    ).join('');
    html = html.replace(/{{#each blocking_issues}}[\s\S]*?{{\/each}}/g, blockingIssuesHtml);
  }
  
  // Process positive findings
  if (data.positive_findings) {
    const positiveFindingsHtml = data.positive_findings.map((finding: any) =>
      `<li style="margin-bottom: 10px;">✓&nbsp;${finding.description}</li>`
    ).join('');
    html = html.replace(/{{#each positive_findings}}[\s\S]*?{{\/each}}/g, positiveFindingsHtml);
  }
  
  // Process PR issues
  if (data.pr_issues) {
    const prIssuesHtml = data.pr_issues.map((issue: any) => `
      <div class="finding ${issue.severity_class}">
        <h4>
          <span class="badge ${issue.severity_class}">${issue.severity}</span>
          ${issue.title}
        </h4>
        <p><strong>${translations.prIssues.file}:</strong> ${issue.file_path}:${issue.line_number}</p>
        <p>${issue.description}</p>
        ${issue.code_snippet ? `<div class="code-snippet"><code>${issue.code_snippet}</code></div>` : ''}
        <div class="recommendation-box">
          <strong>${translations.prIssues.recommendation}:</strong>
          ${issue.recommendation}
        </div>
      </div>
    `).join('');
    html = html.replace(/{{#each pr_issues}}[\s\S]*?{{\/each}}/g, prIssuesHtml);
  }
  
  // Similar processing for other arrays...
  
  return html;
}

router.post('/', async (req: Request<{}, {}, ReportRequest>, res: Response<ReportResponse>) => {
  try {
    const { analysisData, language = 'en' } = req.body;
    
    // Validate language
    if (!AVAILABLE_LANGUAGES[language as keyof typeof AVAILABLE_LANGUAGES]) {
      return res.status(400).json({
        success: false,
        error: `Language '${language}' not supported`,
        availableLanguages: Object.keys(AVAILABLE_LANGUAGES)
      });
    }
    
    // Load template and translations
    const templatePath = path.join(__dirname, '../templates/modular/enhanced-template.html');
    const template = await fs.readFile(templatePath, 'utf-8');
    
    const translationsPath = path.join(__dirname, `../templates/modular/languages/${language}.json`);
    let translations;
    
    try {
      translations = JSON.parse(await fs.readFile(translationsPath, 'utf-8'));
    } catch (error) {
      // Fall back to English if translation doesn't exist
      translations = JSON.parse(await fs.readFile(
        path.join(__dirname, '../templates/modular/languages/en.json'), 
        'utf-8'
      ));
    }
    
    // Prepare data with computed fields
    const reportData = {
      ...analysisData,
      lang: language,
      // Fix the approval status text based on language
      approval_status_text: analysisData.approval_status === 'approved' 
        ? translations.prDecision.statuses.approved
        : analysisData.approval_status === 'conditionally_approved'
        ? translations.prDecision.statuses.conditionallyApproved
        : translations.prDecision.statuses.blocked,
      // Computed flags
      has_pr_issues: analysisData.pr_issues && analysisData.pr_issues.length > 0,
      has_lower_priority_issues: analysisData.lower_priority_repo_issues && analysisData.lower_priority_repo_issues.length > 0,
      total_lower_priority_issues: analysisData.lower_priority_repo_issues?.length || 0,
      approval_class: analysisData.approval_status.replace(/_/g, '-'),
      // Fix educational links
      educational_modules_fixed: analysisData.educational_modules?.map((module: any) => ({
        ...module,
        real_link: mapEducationalLink(module)
      })) || []
    };
    
    // Map to enhanced template structure
    const enhancedData = mapToEnhancedTemplate(reportData, translations);
    
    // Process template with enhanced data
    const html = processTemplate(template, enhancedData, translations);
    
    // Generate unique filename
    const reportId = uuidv4();
    const reportFilename = `report-${reportId}-${language}.html`;
    const reportPath = path.join(__dirname, '../../public/reports', reportFilename);
    
    // Ensure reports directory exists
    await fs.mkdir(path.dirname(reportPath), { recursive: true });
    
    // Save report
    await fs.writeFile(reportPath, html);
    
    // Copy CSS and JS files if they don't exist
    const assetsSource = path.join(__dirname, '../templates/modular/assets');
    const assetsTarget = path.join(__dirname, '../../public/reports');
    
    try {
      // Copy enhanced CSS and JS files
      await fs.copyFile(
        path.join(assetsSource, 'enhanced-styles.css'),
        path.join(assetsTarget, 'enhanced-styles.css')
      );
      await fs.copyFile(
        path.join(assetsSource, 'enhanced-scripts.js'),
        path.join(assetsTarget, 'enhanced-scripts.js')
      );
      // Also copy original files for backward compatibility
      await fs.copyFile(
        path.join(assetsSource, 'styles.css'),
        path.join(assetsTarget, 'styles.css')
      );
      await fs.copyFile(
        path.join(assetsSource, 'scripts.js'),
        path.join(assetsTarget, 'scripts.js')
      );
      
      // Check if logo exists in reports directory, if not copy it
      const logoPath = path.join(assetsTarget, 'codequal-logo.svg');
      try {
        await fs.access(logoPath);
      } catch {
        // Logo doesn't exist, check if it exists in the source location
        const sourceLogo = path.join(assetsTarget, 'codequal-logo.svg');
        try {
          await fs.access(sourceLogo);
          // Logo already exists in target
        } catch {
          // Logo doesn't exist anywhere, we already created it
        }
      }
    } catch (error) {
      // Files might already exist
    }
    
    // Return the URL
    const reportUrl = `/reports/${reportFilename}`;
    
    res.json({
      success: true,
      reportUrl,
      availableLanguages: Object.keys(AVAILABLE_LANGUAGES)
    });
    
  } catch (error) {
    console.error('Error generating report:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate report'
    });
  }
});

// Helper function to map educational links
function mapEducationalLink(module: any): string {
  const linkMappings: { [key: string]: string } = {
    'secure-coding': 'https://owasp.org/www-project-secure-coding-practices-quick-reference-guide/',
    'api-security': 'https://github.com/OWASP/API-Security',
    'dependency-security': 'https://docs.github.com/en/code-security/supply-chain-security',
    'testing': 'https://github.com/goldbergyoni/javascript-testing-best-practices',
    'performance': 'https://web.dev/fast/',
    'documentation': 'https://www.writethedocs.org/guide/writing/beginners-guide-to-docs/'
  };
  
  // Try to match based on title or use a default
  const key = Object.keys(linkMappings).find(k => 
    module.title.toLowerCase().includes(k.replace('-', ' '))
  );
  
  return linkMappings[key || 'documentation'];
}

export default router;