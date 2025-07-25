/**
 * Enhanced DeepWiki Mock for Realistic Testing
 * 
 * Generates realistic analysis results that match the reference report format
 */

import { ParsedAnalysis } from './deepwiki-api-manager';
import { createLogger } from '@codequal/core/utils';

const logger = createLogger('deepwiki-mock-enhanced');

export function generateEnhancedMockAnalysis(repositoryUrl: string): ParsedAnalysis {
  const isNextJs = repositoryUrl.includes('next.js');
  const isReact = repositoryUrl.includes('react');
  const isVSCode = repositoryUrl.includes('vscode');
  const isCodeQual = repositoryUrl.includes('codequal');
  
  // Base vulnerabilities that apply to most repos
  const baseVulnerabilities = [
    {
      id: 'SEC-001',
      severity: 'CRITICAL',
      category: 'Security',
      title: 'Hardcoded API Keys in Repository',
      location: {
        file: isCodeQual ? 'k8s/deployments/production/api-deployment.yaml' : 'config/secrets.js',
        line: 23,
        column: 5
      },
      cwe: {
        id: 'CWE-798',
        name: 'Use of Hard-coded Credentials'
      },
      cvss: {
        score: 9.8,
        vector: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H'
      },
      impact: 'Complete system compromise if repository is breached',
      evidence: {
        snippet: isCodeQual 
          ? `- name: OPENROUTER_API_KEY\n  value: "sk-or-v1-1234567890abcdef"  # EXPOSED!`
          : `const API_KEY = 'sk-proj-1234567890abcdef'; // TODO: move to env`
      },
      remediation: {
        immediate: 'Remove all hardcoded secrets immediately',
        steps: [
          'Remove hardcoded credentials from all files',
          'Rotate all exposed API keys',
          'Implement proper secret management (e.g., Kubernetes secrets, environment variables)',
          'Add pre-commit hooks to prevent future credential commits'
        ]
      }
    },
    {
      id: 'SEC-002',
      severity: 'CRITICAL',
      category: 'Security',
      title: 'SQL Injection Vulnerability',
      location: {
        file: 'packages/database/src/services/analysis-service.ts',
        line: 234,
        column: 12
      },
      cwe: {
        id: 'CWE-89',
        name: 'SQL Injection'
      },
      cvss: {
        score: 9.1,
        vector: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:N'
      },
      impact: 'Database compromise, data exfiltration, privilege escalation',
      evidence: {
        snippet: `const query = \`SELECT * FROM analyses WHERE user_id = \${userId} AND status = '\${status}'\`;\n// INJECTABLE! Attack: userId = "1 OR 1=1; DROP TABLE users;--"`
      },
      remediation: {
        immediate: 'Use parameterized queries',
        steps: [
          'Replace string concatenation with parameterized queries',
          'Use prepared statements for all database operations',
          'Implement input validation and sanitization',
          'Enable SQL query logging for security monitoring'
        ]
      }
    },
    {
      id: 'PERF-001',
      severity: 'HIGH',
      category: 'Performance',
      title: 'N+1 Query Problem',
      location: {
        file: 'packages/database/src/services/report-service.ts',
        line: 145,
        column: 8
      },
      cwe: {
        id: 'CWE-1049',
        name: 'Excessive Data Query Operations in a Large Data Table'
      },
      cvss: {
        score: 6.5,
        vector: 'CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:U/C:N/I:N/A:H'
      },
      impact: 'Causes 3+ second load times, 147 queries per report load',
      evidence: {
        snippet: `const report = await Report.findById(id);\nfor (const finding of report.findings) {\n  finding.details = await FindingDetails.findById(finding.detailId);\n  finding.recommendations = await Recommendation.findByFindingId(finding.id);\n}`
      },
      remediation: {
        immediate: 'Use eager loading or DataLoader pattern',
        steps: [
          'Implement eager loading with populate/include',
          'Use DataLoader for batch loading',
          'Add database query monitoring',
          'Optimize with proper indexes'
        ]
      }
    }
  ];

  // Add framework-specific vulnerabilities
  const frameworkVulnerabilities = [];
  
  if (isNextJs || isReact) {
    frameworkVulnerabilities.push({
      id: 'SEC-003',
      severity: 'HIGH',
      category: 'Security',
      title: 'XSS Vulnerability in React Component',
      location: {
        file: isNextJs ? 'components/MarkdownRenderer.tsx' : 'src/components/UserContent.jsx',
        line: 45,
        column: 10
      },
      cwe: {
        id: 'CWE-79',
        name: 'Cross-site Scripting (XSS)'
      },
      cvss: {
        score: 7.2,
        vector: 'CVSS:3.1/AV:N/AC:L/PR:H/UI:N/S:U/C:H/I:H/A:N'
      },
      impact: 'Allows attackers to execute arbitrary JavaScript in user context',
      evidence: {
        snippet: `<div dangerouslySetInnerHTML={{ __html: userInput }} />`
      },
      remediation: {
        immediate: 'Sanitize user input before rendering',
        steps: [
          'Use DOMPurify or similar library to sanitize HTML',
          'Avoid dangerouslySetInnerHTML when possible',
          'Implement Content Security Policy headers',
          'Use React.createElement for dynamic content'
        ]
      }
    });
  }

  // Performance issues
  const performanceIssues = [
    {
      id: 'PERF-002',
      severity: 'HIGH',
      category: 'Performance',
      title: 'Oversized Frontend Bundle',
      location: {
        file: 'webpack.config.js',
        line: 89,
        column: 3
      },
      cwe: {
        id: 'CWE-1050',
        name: 'Excessive Platform Resource Consumption within a Loop'
      },
      cvss: {
        score: 5.3,
        vector: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:N/I:N/A:L'
      },
      impact: 'Bundle size 2.3MB, parse time 1.2s on mobile',
      evidence: {
        snippet: `lodash: 524KB (using only 3 functions!)\nmoment: 329KB (date-fns is 23KB)\n@mui/material: 892KB (importing entire library)`
      },
      remediation: {
        immediate: 'Implement code splitting and tree shaking',
        steps: [
          'Replace lodash with lodash-es or specific imports',
          'Replace moment.js with date-fns',
          'Use modular imports for Material-UI',
          'Enable webpack tree shaking'
        ]
      }
    }
  ];

  // Code quality issues
  const qualityIssues = [
    {
      id: 'QUAL-001',
      severity: 'MEDIUM',
      category: 'Maintainability',
      title: 'High Complexity Function',
      location: {
        file: 'packages/agents/src/services/result-orchestrator.ts',
        line: 234,
        column: 2
      },
      cwe: {
        id: 'CWE-1121',
        name: 'Excessive McCabe Cyclomatic Complexity'
      },
      cvss: {
        score: 3.7,
        vector: 'CVSS:3.1/AV:N/AC:H/PR:N/UI:N/S:U/C:N/I:L/A:N'
      },
      impact: 'Cyclomatic complexity of 24, difficult to test and maintain',
      evidence: {
        snippet: `function processAnalysis() {\n  // 234 lines of nested if/else and loops\n  // Cyclomatic complexity: 24\n}`
      },
      remediation: {
        immediate: 'Break down into smaller functions',
        steps: [
          'Extract logical sections into separate methods',
          'Implement strategy pattern for different cases',
          'Add unit tests for each extracted function',
          'Target complexity < 10 per function'
        ]
      }
    }
  ];

  // Dependency issues
  const dependencyIssues = [
    {
      id: 'DEP-001',
      severity: 'HIGH',
      category: 'Dependencies',
      title: 'Vulnerable Dependency: lodash < 4.17.21',
      location: {
        file: 'package.json',
        line: 45,
        column: 5
      },
      cwe: {
        id: 'CWE-1104',
        name: 'Use of Unmaintained Third Party Components'
      },
      cvss: {
        score: 7.5,
        vector: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:N/I:N/A:H'
      },
      impact: 'Prototype pollution vulnerability (CVE-2021-23337)',
      evidence: {
        snippet: `"lodash": "^4.17.15"`
      },
      remediation: {
        immediate: 'Update to lodash@4.17.21 or later',
        steps: [
          'Run npm update lodash',
          'Test for breaking changes',
          'Consider migrating to lodash-es',
          'Enable automated dependency updates'
        ]
      }
    }
  ];

  // Combine all vulnerabilities
  const allVulnerabilities = [
    ...baseVulnerabilities,
    ...frameworkVulnerabilities,
    ...performanceIssues,
    ...qualityIssues,
    ...dependencyIssues
  ];

  // Generate recommendations based on issues
  const recommendations = [
    {
      id: 'REC-001',
      priority: 'HIGH',
      category: 'Security',
      title: 'Implement Security Best Practices',
      description: 'Address critical security vulnerabilities immediately',
      impact: 'Prevents data breaches and unauthorized access',
      effort: '2-3 days',
      estimated_hours: 20,
      steps: [
        'Remove all hardcoded secrets',
        'Fix SQL injection vulnerabilities',
        'Implement proper authentication',
        'Add security headers'
      ]
    },
    {
      id: 'REC-002',
      priority: 'MEDIUM',
      category: 'Performance',
      title: 'Optimize Database Queries',
      description: 'Fix N+1 queries and add proper indexing',
      impact: 'Reduces API response time by 50%',
      effort: '3-4 days',
      estimated_hours: 24,
      steps: [
        'Implement eager loading',
        'Add database indexes',
        'Use query caching',
        'Monitor query performance'
      ]
    },
    {
      id: 'REC-003',
      priority: 'LOW',
      category: 'Code Quality',
      title: 'Refactor Complex Functions',
      description: 'Break down functions with high complexity',
      impact: 'Improves code readability and reduces bugs',
      effort: '1 week',
      estimated_hours: 40,
      steps: [
        'Identify functions with complexity > 10',
        'Extract logical sections',
        'Add comprehensive tests',
        'Update documentation'
      ]
    }
  ];

  return {
    vulnerabilities: allVulnerabilities,
    recommendations,
    scores: {
      overall: 72,
      security: 65,
      performance: 70,
      maintainability: 78,
      testing: 68
    },
    statistics: {
      files_analyzed: 1247,
      total_issues: allVulnerabilities.length,
      issues_by_severity: {
        critical: allVulnerabilities.filter(v => v.severity === 'CRITICAL').length,
        high: allVulnerabilities.filter(v => v.severity === 'HIGH').length,
        medium: allVulnerabilities.filter(v => v.severity === 'MEDIUM').length,
        low: allVulnerabilities.filter(v => v.severity === 'LOW').length
      },
      languages: {
        TypeScript: 65,
        JavaScript: 20,
        CSS: 10,
        Other: 5
      }
    },
    quality: {
      metrics: {
        cyclomatic_complexity: 8.5,
        cognitive_complexity: 12.3,
        maintainability_index: 72
      },
      duplicated_lines_percent: 15.3,
      technical_debt_hours: 234
    },
    testing: {
      coverage_percent: 68.4,
      missing_tests: 156
    },
    dependencies: {
      total: 842,
      direct: 127,
      vulnerable: 23,
      outdated: 89,
      deprecated: 12
    }
  };
}