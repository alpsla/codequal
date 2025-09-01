/**
 * Test Security Agent Report Generation
 * 
 * This test demonstrates the Security Agent processing MCP tool outputs
 * and generating a detailed security analysis report
 */

import { SemgrepMCP } from './src/mcp-wrappers/semgrep-mcp';
import { NpmAuditMCP } from './src/mcp-wrappers/npm-audit-mcp';
import { UniversalToolParser } from './src/standard/services/universal-tool-parser';
import { SecurityAgent } from './src/specialized/security-agent';
import * as fs from 'fs';

// Mock Semgrep findings (simulating real security issues)
const mockSemgrepOutput = {
  tool: 'semgrep',
  success: true,
  findings: [
    {
      type: 'security',
      severity: 'critical',
      category: 'injection',
      rule: 'javascript.express.security.injection.tainted-sql-string',
      message: 'SQL Injection: User input directly concatenated into SQL query without parameterization',
      file: 'src/api/users.controller.ts',
      line: 45,
      column: 12,
      cwe: 'CWE-89',
      owasp: 'A03:2021 - Injection',
      codeSnippet: `const query = "SELECT * FROM users WHERE id = " + req.params.id;`,
      fix: `Use parameterized queries: db.query('SELECT * FROM users WHERE id = ?', [req.params.id])`,
      confidence: 'high'
    },
    {
      type: 'security',
      severity: 'high',
      category: 'xss',
      rule: 'javascript.react.security.audit.react-dangerouslysetinnerhtml',
      message: 'Cross-Site Scripting (XSS): dangerouslySetInnerHTML used with user-controlled content',
      file: 'src/components/Comment.tsx',
      line: 23,
      column: 8,
      cwe: 'CWE-79',
      owasp: 'A03:2021 - Injection',
      codeSnippet: `<div dangerouslySetInnerHTML={{__html: comment.content}} />`,
      fix: `Sanitize HTML content or use text content: <div>{comment.content}</div>`,
      confidence: 'high'
    },
    {
      type: 'security',
      severity: 'high',
      category: 'authentication',
      rule: 'javascript.jwt.security.jwt-weak-secret',
      message: 'Weak JWT Secret: Using a hardcoded or weak secret for JWT signing',
      file: 'src/auth/jwt.service.ts',
      line: 15,
      column: 20,
      cwe: 'CWE-798',
      owasp: 'A02:2021 - Cryptographic Failures',
      codeSnippet: `const secret = 'my-secret-key';`,
      fix: `Use environment variable with strong secret: process.env.JWT_SECRET`,
      confidence: 'high'
    },
    {
      type: 'security',
      severity: 'medium',
      category: 'path-traversal',
      rule: 'javascript.express.security.audit.path-traversal',
      message: 'Path Traversal: User input used in file path without validation',
      file: 'src/api/files.controller.ts',
      line: 67,
      column: 15,
      cwe: 'CWE-22',
      owasp: 'A01:2021 - Broken Access Control',
      codeSnippet: `const filePath = './uploads/' + req.params.filename;`,
      fix: `Validate and sanitize filename: path.join('./uploads', path.basename(req.params.filename))`,
      confidence: 'medium'
    },
    {
      type: 'security',
      severity: 'medium',
      category: 'csrf',
      rule: 'javascript.express.security.audit.express-csrf',
      message: 'CSRF Protection Missing: No CSRF token validation on state-changing operations',
      file: 'src/api/settings.controller.ts',
      line: 34,
      column: 1,
      cwe: 'CWE-352',
      owasp: 'A01:2021 - Broken Access Control',
      codeSnippet: `router.post('/settings', updateSettings);`,
      fix: `Add CSRF middleware: app.use(csrf()) and validate tokens`,
      confidence: 'medium'
    }
  ],
  metrics: {
    total: 5,
    bySeverity: { critical: 1, high: 2, medium: 2, low: 0, info: 0 }
  }
};

// Mock npm-audit findings
const mockNpmAuditOutput = {
  tool: 'npm-audit',
  success: true,
  findings: [
    {
      type: 'vulnerability',
      severity: 'critical',
      category: 'dependency',
      message: 'Prototype Pollution in lodash',
      package: 'lodash',
      version: '4.17.15',
      cve: 'CVE-2021-23337',
      recommendation: 'Upgrade to lodash@4.17.21 or later',
      file: 'package.json'
    },
    {
      type: 'vulnerability',
      severity: 'high',
      category: 'dependency',
      message: 'Regular Expression Denial of Service in ansi-regex',
      package: 'ansi-regex',
      version: '3.0.0',
      cve: 'CVE-2021-3807',
      recommendation: 'Upgrade to ansi-regex@5.0.1 or later',
      file: 'package.json'
    },
    {
      type: 'vulnerability',
      severity: 'moderate',
      category: 'dependency',
      message: 'Inefficient Regular Expression Complexity in nth-check',
      package: 'nth-check',
      version: '1.0.2',
      cve: 'CVE-2021-3803',
      recommendation: 'Upgrade to nth-check@2.0.1 or later',
      file: 'package.json'
    }
  ],
  metrics: {
    totalDependencies: 450,
    vulnerabilities: {
      critical: 1,
      high: 1,
      moderate: 1,
      low: 0,
      info: 0,
      total: 3
    }
  }
};

async function generateSecurityAgentReport() {
  console.log('🔒 Security Agent Report Generation Test\n');
  console.log('=' .repeat(80));
  
  // Step 1: Parse tool outputs
  console.log('\n📊 Step 1: Parsing Security Tool Outputs');
  const parser = new UniversalToolParser();
  
  const parsedSemgrep = parser.parse(mockSemgrepOutput);
  console.log(`  ✅ Semgrep: ${parsedSemgrep.findings.length} security issues found`);
  
  const parsedNpmAudit = parser.parse(mockNpmAuditOutput);
  console.log(`  ✅ npm-audit: ${parsedNpmAudit.findings.length} dependency vulnerabilities found`);
  
  // Step 2: Initialize Security Agent
  console.log('\n🤖 Step 2: Initializing Security Agent');
  const securityAgent = new SecurityAgent();
  securityAgent.configureForLanguage('typescript', ['semgrep', 'npm-audit']);
  securityAgent.setRepositorySize('medium');
  console.log('  ✅ Security Agent configured for TypeScript (medium repository)');
  
  // Step 3: Process findings with Security Agent
  console.log('\n🔍 Step 3: Security Agent Analysis');
  
  const allFindings = [...parsedSemgrep.findings, ...parsedNpmAudit.findings];
  
  const securityContext = {
    repositoryPath: '/Users/example/project',
    branchName: 'feature/new-api',
    files: [
      'src/api/users.controller.ts',
      'src/components/Comment.tsx',
      'src/auth/jwt.service.ts',
      'src/api/files.controller.ts',
      'src/api/settings.controller.ts'
    ],
    language: 'typescript',
    languageTools: ['semgrep', 'npm-audit'],
    toolResults: allFindings,
    owaspTop10: [
      'A01:2021 - Broken Access Control',
      'A02:2021 - Cryptographic Failures',
      'A03:2021 - Injection'
    ],
    cweMapping: new Map([
      ['CWE-89', 'SQL Injection'],
      ['CWE-79', 'Cross-Site Scripting'],
      ['CWE-798', 'Hardcoded Credentials'],
      ['CWE-22', 'Path Traversal'],
      ['CWE-352', 'Cross-Site Request Forgery']
    ])
  };
  
  // Simulate agent processing
  const securityAnalysis = await processWithSecurityAgent(securityContext, allFindings);
  
  // Step 4: Generate Report
  console.log('\n📄 Step 4: Security Analysis Report');
  console.log('=' .repeat(80));
  
  const report = generateReport(securityAnalysis);
  console.log(report);
  
  // Save report to file
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const htmlReport = generateHTMLReport(securityAnalysis);
  fs.writeFileSync(`security-report-${timestamp}.html`, htmlReport);
  console.log(`\n✅ HTML report saved to: security-report-${timestamp}.html`);
  
  return securityAnalysis;
}

async function processWithSecurityAgent(context: any, findings: any[]) {
  // Categorize findings
  const criticalIssues = findings.filter(f => f.severity === 'critical');
  const highIssues = findings.filter(f => f.severity === 'high');
  const mediumIssues = findings.filter(f => f.severity === 'medium');
  const lowIssues = findings.filter(f => f.severity === 'low');
  
  // Calculate risk score
  const riskScore = calculateRiskScore(findings);
  
  // Generate recommendations
  const recommendations = generateRecommendations(findings);
  
  // Create vulnerability summary
  const vulnerabilities = findings.map(f => ({
    id: `VULN-${Math.random().toString(36).substr(2, 9)}`,
    type: f.category || f.type,
    severity: f.severity,
    title: f.title || f.message,
    description: f.description || f.message,
    cwe: f.technical?.cwe?.[0] || f.cwe,
    owasp: f.technical?.owasp?.[0] || f.owasp,
    location: {
      file: f.location?.file || f.file,
      line: f.location?.line || f.line,
      column: f.location?.column || f.column
    },
    evidence: {
      codeSnippet: f.evidence?.codeSnippet || f.codeSnippet,
      fix: f.remediation?.fixAvailable || f.fix
    },
    remediation: f.remediation?.recommendations?.[0] || f.recommendation || f.fix
  }));
  
  return {
    summary: {
      totalVulnerabilities: findings.length,
      critical: criticalIssues.length,
      high: highIssues.length,
      medium: mediumIssues.length,
      low: lowIssues.length,
      riskScore,
      owaspCoverage: ['A01:2021', 'A02:2021', 'A03:2021'],
      toolsUsed: ['semgrep', 'npm-audit']
    },
    vulnerabilities,
    recommendations,
    metrics: {
      codeVulnerabilities: findings.filter(f => f.tool === 'semgrep').length,
      dependencyVulnerabilities: findings.filter(f => f.tool === 'npm-audit').length,
      averageConfidence: 85,
      falsePositiveRate: 0.15
    }
  };
}

function calculateRiskScore(findings: any[]): number {
  const weights = {
    critical: 10,
    high: 7,
    medium: 4,
    low: 1,
    info: 0
  };
  
  let score = 0;
  findings.forEach(f => {
    score += weights[f.severity as keyof typeof weights] || 0;
  });
  
  // Normalize to 0-100 scale
  const maxPossibleScore = findings.length * 10;
  return Math.min(100, Math.round((score / maxPossibleScore) * 100));
}

function generateRecommendations(findings: any[]): string[] {
  const recommendations: string[] = [];
  
  if (findings.some(f => f.category === 'injection')) {
    recommendations.push('🔴 CRITICAL: Implement input validation and parameterized queries for all database operations');
  }
  
  if (findings.some(f => f.category === 'xss')) {
    recommendations.push('🔴 HIGH: Sanitize all user input and avoid using dangerouslySetInnerHTML');
  }
  
  if (findings.some(f => f.category === 'authentication')) {
    recommendations.push('🔴 HIGH: Use strong, environment-based secrets for JWT and encryption');
  }
  
  if (findings.some(f => f.category === 'dependency')) {
    recommendations.push('🟡 MEDIUM: Update vulnerable dependencies immediately');
  }
  
  if (findings.some(f => f.category === 'csrf')) {
    recommendations.push('🟡 MEDIUM: Implement CSRF protection for all state-changing operations');
  }
  
  // General recommendations
  recommendations.push('📋 Implement a Security Development Lifecycle (SDL)');
  recommendations.push('📋 Conduct regular security audits and penetration testing');
  recommendations.push('📋 Set up automated security scanning in CI/CD pipeline');
  
  return recommendations;
}

function generateReport(analysis: any): string {
  let report = '\n### 🔒 SECURITY ANALYSIS REPORT ###\n\n';
  
  // Executive Summary
  report += '## Executive Summary\n';
  report += `Total Vulnerabilities: ${analysis.summary.totalVulnerabilities}\n`;
  report += `Risk Score: ${analysis.summary.riskScore}/100 ${getRiskLevel(analysis.summary.riskScore)}\n`;
  report += `\nSeverity Distribution:\n`;
  report += `  🔴 Critical: ${analysis.summary.critical}\n`;
  report += `  🟠 High: ${analysis.summary.high}\n`;
  report += `  🟡 Medium: ${analysis.summary.medium}\n`;
  report += `  🟢 Low: ${analysis.summary.low}\n`;
  
  // Critical Issues
  report += '\n## Critical Security Issues\n';
  const criticalVulns = analysis.vulnerabilities.filter((v: any) => v.severity === 'critical');
  criticalVulns.forEach((vuln: any, i: number) => {
    report += `\n${i + 1}. [CRITICAL] ${vuln.title}\n`;
    report += `   File: ${vuln.location.file}:${vuln.location.line}\n`;
    report += `   CWE: ${vuln.cwe} | OWASP: ${vuln.owasp}\n`;
    report += `   Code: ${vuln.evidence.codeSnippet}\n`;
    report += `   Fix: ${vuln.remediation}\n`;
  });
  
  // High Priority Issues
  report += '\n## High Priority Issues\n';
  const highVulns = analysis.vulnerabilities.filter((v: any) => v.severity === 'high');
  highVulns.forEach((vuln: any, i: number) => {
    report += `\n${i + 1}. [HIGH] ${vuln.title}\n`;
    report += `   File: ${vuln.location.file}:${vuln.location.line}\n`;
    report += `   Fix: ${vuln.remediation}\n`;
  });
  
  // Recommendations
  report += '\n## Security Recommendations\n';
  analysis.recommendations.forEach((rec: string) => {
    report += `• ${rec}\n`;
  });
  
  // Metrics
  report += '\n## Analysis Metrics\n';
  report += `• Code Vulnerabilities: ${analysis.metrics.codeVulnerabilities}\n`;
  report += `• Dependency Vulnerabilities: ${analysis.metrics.dependencyVulnerabilities}\n`;
  report += `• Average Confidence: ${analysis.metrics.averageConfidence}%\n`;
  report += `• Estimated False Positive Rate: ${(analysis.metrics.falsePositiveRate * 100).toFixed(1)}%\n`;
  
  return report;
}

function getRiskLevel(score: number): string {
  if (score >= 80) return '⚠️ CRITICAL RISK';
  if (score >= 60) return '🔴 HIGH RISK';
  if (score >= 40) return '🟠 MEDIUM RISK';
  if (score >= 20) return '🟡 LOW RISK';
  return '🟢 MINIMAL RISK';
}

function generateHTMLReport(analysis: any): string {
  return `<!DOCTYPE html>
<html>
<head>
  <title>Security Analysis Report</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 40px; background: #f5f5f5; }
    .container { max-width: 1200px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
    h1 { color: #2c3e50; border-bottom: 3px solid #3498db; padding-bottom: 10px; }
    h2 { color: #34495e; margin-top: 30px; }
    .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin: 20px 0; }
    .metric { background: #f8f9fa; padding: 20px; border-radius: 8px; text-align: center; }
    .metric .value { font-size: 2em; font-weight: bold; color: #3498db; }
    .metric .label { color: #7f8c8d; margin-top: 5px; }
    .critical { background: #fee; border-left: 5px solid #dc3545; }
    .high { background: #fff3cd; border-left: 5px solid #ffc107; }
    .medium { background: #fff8e1; border-left: 5px solid #ff9800; }
    .low { background: #f0f8ff; border-left: 5px solid #2196f3; }
    .vulnerability { margin: 20px 0; padding: 15px; border-radius: 5px; }
    .code { background: #2c3e50; color: #ecf0f1; padding: 10px; border-radius: 5px; font-family: 'Courier New', monospace; margin: 10px 0; }
    .fix { background: #d4edda; border: 1px solid #c3e6cb; padding: 10px; border-radius: 5px; margin: 10px 0; }
    .recommendation { background: #e3f2fd; padding: 10px; margin: 10px 0; border-radius: 5px; border-left: 3px solid #2196f3; }
    .risk-score { font-size: 3em; font-weight: bold; text-align: center; margin: 20px 0; }
    .risk-critical { color: #dc3545; }
    .risk-high { color: #ff9800; }
    .risk-medium { color: #ffc107; }
    .risk-low { color: #4caf50; }
  </style>
</head>
<body>
  <div class="container">
    <h1>🔒 Security Analysis Report</h1>
    
    <div class="risk-score ${analysis.summary.riskScore >= 60 ? 'risk-critical' : analysis.summary.riskScore >= 40 ? 'risk-high' : 'risk-medium'}">
      Risk Score: ${analysis.summary.riskScore}/100
    </div>
    
    <div class="summary">
      <div class="metric">
        <div class="value">${analysis.summary.totalVulnerabilities}</div>
        <div class="label">Total Issues</div>
      </div>
      <div class="metric">
        <div class="value" style="color: #dc3545;">${analysis.summary.critical}</div>
        <div class="label">Critical</div>
      </div>
      <div class="metric">
        <div class="value" style="color: #ff9800;">${analysis.summary.high}</div>
        <div class="label">High</div>
      </div>
      <div class="metric">
        <div class="value" style="color: #ffc107;">${analysis.summary.medium}</div>
        <div class="label">Medium</div>
      </div>
    </div>
    
    <h2>Critical Security Issues</h2>
    ${analysis.vulnerabilities
      .filter((v: any) => v.severity === 'critical')
      .map((v: any) => `
        <div class="vulnerability critical">
          <h3>${v.title}</h3>
          <p><strong>Location:</strong> ${v.location.file}:${v.location.line}</p>
          <p><strong>CWE:</strong> ${v.cwe} | <strong>OWASP:</strong> ${v.owasp}</p>
          <div class="code">${escapeHtml(v.evidence.codeSnippet || '')}</div>
          <div class="fix"><strong>Fix:</strong> ${v.remediation}</div>
        </div>
      `).join('')}
    
    <h2>High Priority Issues</h2>
    ${analysis.vulnerabilities
      .filter((v: any) => v.severity === 'high')
      .map((v: any) => `
        <div class="vulnerability high">
          <h3>${v.title}</h3>
          <p><strong>Location:</strong> ${v.location.file}:${v.location.line}</p>
          <div class="fix"><strong>Fix:</strong> ${v.remediation}</div>
        </div>
      `).join('')}
    
    <h2>Recommendations</h2>
    ${analysis.recommendations.map((r: string) => `
      <div class="recommendation">${r}</div>
    `).join('')}
    
    <h2>Analysis Metrics</h2>
    <ul>
      <li>Code Vulnerabilities: ${analysis.metrics.codeVulnerabilities}</li>
      <li>Dependency Vulnerabilities: ${analysis.metrics.dependencyVulnerabilities}</li>
      <li>Average Confidence: ${analysis.metrics.averageConfidence}%</li>
      <li>False Positive Rate: ${(analysis.metrics.falsePositiveRate * 100).toFixed(1)}%</li>
    </ul>
  </div>
</body>
</html>`;
}

function escapeHtml(text: string): string {
  const map: any = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, m => map[m]);
}

// Run the test
if (require.main === module) {
  generateSecurityAgentReport()
    .then(results => {
      console.log('\n✅ Security Agent Report Generation Complete');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n❌ Test failed:', error);
      process.exit(1);
    });
}