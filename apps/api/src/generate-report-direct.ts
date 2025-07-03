import * as fs from 'fs/promises';
import * as path from 'path';

async function generateDirectReport() {
  // Read the template
  const templatePath = path.join(__dirname, 'templates/analysis-report-template.html');
  const template = await fs.readFile(templatePath, 'utf-8');
  
  // Read English translations
  const translationsPath = path.join(__dirname, 'templates/languages/en.json');
  const translations = JSON.parse(await fs.readFile(translationsPath, 'utf-8'));
  
  // Prepare the data with translations merged
  const data = {
    // Language settings
    lang: 'en',
    lang_en: true,
    title: 'CodeQual Analysis Report - PR #1247',
    
    // Header translations
    header_title: translations.header.title,
    header_subtitle: translations.header.subtitle,
    repository_label: translations.header.repository,
    language_label: translations.header.primaryLanguage,
    files_changed_label: translations.header.filesChanged,
    lines_modified_label: translations.header.linesModified,
    
    // PR Decision translations
    pr_decision_label: translations.prDecision.title,
    blocking_issues_title: translations.prDecision.blockingIssues,
    positive_findings_title: translations.prDecision.positiveFindings,
    
    // Issues translations
    pr_issues_title: translations.prIssues.title,
    file_label: translations.prIssues.file,
    recommendation_label: translations.prIssues.recommendation,
    no_issues_message: translations.prIssues.noIssues,
    
    repo_issues_title: translations.repoIssues.title,
    repo_issues_subtitle: translations.repoIssues.subtitle,
    impact_label: translations.repoIssues.impact,
    show_all_issues_label: translations.repoIssues.showAll,
    
    // Score translations
    score_title: translations.score.title,
    current_score_label: translations.score.currentScore,
    
    // Skills translations
    skills_title: translations.skills.title,
    
    // Educational translations
    educational_title: translations.educational.title,
    duration_label: translations.educational.duration,
    hours_label: translations.educational.hours,
    level_label: translations.educational.level,
    start_learning_label: translations.educational.startLearning,
    
    // PR Comment translations
    pr_comment_title: translations.prComment.title,
    
    // Footer translations
    generated_by_label: translations.footer.generatedBy,
    analysis_id_label: translations.footer.analysisId,
    
    // Actual data
    pr_number: '#1247',
    repository_full_name: 'techcorp/enterprise-api',
    primary_language: 'TypeScript',
    files_changed: 32,
    lines_added: 1847,
    lines_removed: 423,
    
    approval_status: translations.prDecision.statuses.conditionallyApproved,
    approval_status_class: 'conditionally-approved',
    approval_icon: '⚠️',
    approval_message: 'This PR can be merged after addressing 2 critical security issues',
    
    blocking_issues: [
      {
        severity: 'Critical',
        icon: '🛡️',
        description: 'SQL injection vulnerability in user search endpoint'
      },
      {
        severity: 'High',
        icon: '🔐',
        description: 'Missing authentication on /api/admin/export endpoint'
      }
    ],
    
    positive_findings: [
      { description: 'Comprehensive test coverage (92%)' },
      { description: 'Well-documented API endpoints with OpenAPI specs' },
      { description: 'Proper error handling and logging implemented' },
      { description: 'Performance optimizations reduced query time by 40%' }
    ],
    
    has_pr_issues: true,
    pr_issues: [
      {
        severity: translations.severity.critical,
        severity_class: 'critical',
        title: 'SQL Injection Vulnerability',
        file_path: 'src/controllers/user-controller.ts',
        line_number: '156',
        description: 'User input is directly concatenated into SQL query without parameterization',
        code_snippet: "const query = `SELECT * FROM users WHERE name LIKE '%${searchTerm}%'`;",
        recommendation: 'Use parameterized queries or an ORM like TypeORM/Prisma to prevent SQL injection'
      },
      {
        severity: translations.severity.high,
        severity_class: 'high',
        title: 'Missing Authentication',
        file_path: 'src/routes/admin-routes.ts',
        line_number: '45',
        description: 'Admin export endpoint lacks authentication middleware',
        code_snippet: "router.get('/api/admin/export', exportController.exportData);",
        recommendation: "Add authentication middleware: router.get('/api/admin/export', authenticate, authorize('admin'), exportController.exportData);"
      },
      {
        severity: translations.severity.medium,
        severity_class: 'medium',
        title: 'Sensitive Data in Logs',
        file_path: 'src/middleware/logger.ts',
        line_number: '78',
        description: 'Password field is being logged in authentication requests',
        code_snippet: "logger.info('Auth request:', { email: req.body.email, password: req.body.password });",
        recommendation: 'Remove sensitive fields before logging or use a sanitization library'
      }
    ],
    
    high_priority_repo_issues: [
      {
        severity: translations.severity.critical,
        severity_class: 'critical',
        title: 'Outdated Dependencies with Known Vulnerabilities',
        description: '8 dependencies have critical security vulnerabilities',
        code_snippet: `"dependencies": {
  "express": "4.16.0",  // CVE-2022-24999: RCE vulnerability
  "jsonwebtoken": "8.3.0",  // CVE-2022-23529: JWT verification bypass
  "lodash": "4.17.11"  // Multiple prototype pollution vulnerabilities
}`,
        impact_color: '#dc3545',
        impact_description: 'Production systems are vulnerable to remote code execution and authentication bypass'
      },
      {
        severity: translations.severity.high,
        severity_class: 'high',
        title: 'No Security Testing in CI/CD',
        description: 'Pipeline lacks SAST, DAST, and dependency scanning',
        code_snippet: `# .github/workflows/ci.yml
jobs:
  test:
    steps:
      - run: npm test  # Only unit tests, no security scanning`,
        impact_color: '#fd7e14',
        impact_description: 'Security vulnerabilities may reach production undetected'
      }
    ],
    
    has_lower_priority_issues: true,
    lower_priority_repo_issues: [
      {
        severity: translations.severity.medium,
        severity_class: 'medium',
        title: 'Incomplete API Documentation',
        description: '40% of endpoints lack proper OpenAPI documentation',
        code_snippet: `// Missing documentation
router.post('/api/users/bulk-import', bulkImportHandler);
router.delete('/api/cache/purge', purgeCache);`,
        impact_color: '#ffc107',
        impact_description: 'Integration difficulties and increased support burden'
      }
    ],
    
    overall_score: 65,
    score_message: 'Your code quality score has decreased by 15 points due to critical security issues',
    
    skill_categories: [
      {
        icon: '🛡️',
        name: translations.skills.categories.security,
        current_level: 35,
        skill_color: '#dc3545',
        skill_message: '-30 points: SQL injection and missing authentication are serious security flaws'
      },
      {
        icon: '🧪',
        name: translations.skills.categories.testing,
        current_level: 85,
        skill_color: '#28a745',
        skill_message: '+10 points: Excellent test coverage at 92%'
      },
      {
        icon: '📚',
        name: translations.skills.categories.documentation,
        current_level: 70,
        skill_color: '#ffc107',
        skill_message: '-5 points: Some endpoints lack proper documentation'
      },
      {
        icon: '⚡',
        name: translations.skills.categories.performance,
        current_level: 80,
        skill_color: '#28a745',
        skill_message: '+15 points: Great optimization work reducing query times'
      }
    ],
    
    educational_modules: [
      {
        title: 'Secure Coding Practices',
        duration: '3',
        level: 'Intermediate',
        description: 'Learn how to prevent SQL injection, XSS, and other common vulnerabilities',
        link: 'https://owasp.org/www-project-secure-coding-practices-quick-reference-guide/'
      },
      {
        title: 'API Security Best Practices',
        duration: '2',
        level: 'Advanced',
        description: 'Master authentication, authorization, and API security patterns',
        link: 'https://github.com/OWASP/API-Security'
      },
      {
        title: 'Dependency Management & Security',
        duration: '1.5',
        level: 'Intermediate',
        description: 'Learn to manage and audit dependencies for security vulnerabilities',
        link: 'https://docs.github.com/en/code-security/supply-chain-security'
      }
    ],
    
    pr_comment_text: `## Code Review Summary 🔍

**Status:** ⚠️ Conditionally Approved

### Critical Issues Found:
1. **🛡️ SQL Injection** in user-controller.ts:156
2. **🔐 Missing Authentication** on admin export endpoint

### Positive Highlights:
- ✅ Excellent test coverage (92%)
- ✅ 40% performance improvement
- ✅ Well-documented API endpoints

### Required Actions:
1. Fix SQL injection by using parameterized queries
2. Add authentication middleware to admin routes
3. Update vulnerable dependencies

Please address these security issues before merging.`,
    
    analysis_id: 'CQ-2024-1247-FINAL',
    report_timestamp: new Date().toLocaleString()
  };
  
  // Simple template replacement
  let html = template;
  
  // Replace all placeholders
  Object.entries(data).forEach(([key, value]) => {
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      const regex = new RegExp(`{{${key}}}`, 'g');
      html = html.replace(regex, String(value));
    }
  });
  
  // Handle arrays (simplified)
  // Replace blocking_issues
  const blockingIssuesHtml = data.blocking_issues.map(issue => 
    `<li style="margin-bottom: 10px;">
      <strong>${issue.icon}&nbsp;${issue.severity}:</strong>&nbsp;${issue.description}
    </li>`
  ).join('');
  html = html.replace(/{{#each blocking_issues}}[\s\S]*?{{\/each}}/g, blockingIssuesHtml);
  
  // Replace positive_findings
  const positiveFindingsHtml = data.positive_findings.map(finding =>
    `<li style="margin-bottom: 10px;">✓&nbsp;${finding.description}</li>`
  ).join('');
  html = html.replace(/{{#each positive_findings}}[\s\S]*?{{\/each}}/g, positiveFindingsHtml);
  
  // Handle conditionals
  html = html.replace(/{{#if has_pr_issues}}([\s\S]*?){{else}}[\s\S]*?{{\/if}}/g, '$1');
  html = html.replace(/{{#if has_lower_priority_issues}}([\s\S]*?){{\/if}}/g, '$1');
  
  // Save the report
  const outputPath = path.join(__dirname, '..', 'test-report-final-review.html');
  await fs.writeFile(outputPath, html);
  
  // Also copy CSS and JS files
  const cssSource = path.join(__dirname, 'templates/base/styles.css');
  const jsSource = path.join(__dirname, 'templates/base/scripts.js');
  const cssTarget = path.join(__dirname, '..', 'styles.css');
  const jsTarget = path.join(__dirname, '..', 'scripts.js');
  
  await fs.copyFile(cssSource, cssTarget);
  await fs.copyFile(jsSource, jsTarget);
  
  console.log('✅ Report generated successfully!');
  console.log(`📄 Report location: ${outputPath}`);
  return outputPath;
}

// Run the generator
generateDirectReport().catch(console.error);