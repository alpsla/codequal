/**
 * Demo script to generate a PR analysis report with fix suggestions
 * This uses mock data to demonstrate the fix suggestion system
 */

import { ReportGeneratorV8Final } from './dist/standard/comparison/report-generator-v8-final';
import { ComparisonResult, Issue } from './dist/standard/types/analysis-types';
import * as fs from 'fs';
import * as path from 'path';

async function generateDemoReport() {
  console.log('🚀 Generating demo PR analysis report with fix suggestions...\n');

  // Create mock issues that will trigger our P0 templates
  const mockIssues: Issue[] = [
    {
      id: 'sql-injection-001',
      severity: 'critical',
      category: 'security',
      type: 'vulnerability',
      location: {
        file: 'src/api/users.ts',
        line: 45,
        column: 10
      },
      message: 'SQL injection vulnerability detected',
      title: 'SQL Injection Risk in User Query',
      description: 'User input is directly concatenated into SQL query without proper sanitization',
      codeSnippet: `const query = "SELECT * FROM users WHERE id = " + userId + " AND status = '" + status + "'";
const result = await db.query(query);`,
      suggestedFix: 'Use parameterized queries to prevent SQL injection'
    },
    {
      id: 'xss-001',
      severity: 'high',
      category: 'security',
      type: 'vulnerability',
      location: {
        file: 'src/components/UserProfile.tsx',
        line: 78,
        column: 15
      },
      message: 'Cross-Site Scripting (XSS) vulnerability',
      title: 'XSS Risk - Unescaped User Input',
      description: 'User input is rendered directly to DOM without escaping',
      codeSnippet: `function renderUserBio(userBio: string) {
  document.getElementById('bio').innerHTML = userBio;
}`,
      suggestedFix: 'Escape HTML entities or use textContent'
    },
    {
      id: 'validation-001',
      severity: 'high',
      category: 'code-quality',
      type: 'bug',
      location: {
        file: 'src/services/payment.ts',
        line: 23,
        column: 5
      },
      message: 'Missing input validation for payment amount',
      title: 'Missing Validation for Payment Amount',
      description: 'Payment amount is not validated before processing',
      codeSnippet: `function processPayment(amount, userId) {
  // No validation!
  return chargeUser(userId, amount);
}`,
      suggestedFix: 'Add input validation for amount parameter'
    },
    {
      id: 'null-check-001',
      severity: 'medium',
      category: 'code-quality',
      type: 'bug',
      location: {
        file: 'src/utils/helpers.js',
        line: 156,
        column: 8
      },
      message: 'Potential null pointer exception',
      title: 'Missing Null Check for User Object',
      description: 'Accessing properties on potentially null object',
      codeSnippet: `function getUserName(user) {
  return user.profile.displayName; // user might be null
}`,
      suggestedFix: 'Add null/undefined check before accessing properties'
    },
    {
      id: 'auth-001',
      severity: 'critical',
      category: 'security',
      type: 'vulnerability',
      location: {
        file: 'src/api/admin.ts',
        line: 12,
        column: 1
      },
      message: 'Missing authentication check on admin endpoint',
      title: 'Unauthorized Access to Admin Endpoint',
      description: 'Admin endpoint lacks proper authentication middleware',
      codeSnippet: `app.delete('/api/admin/users/:id', async (req, res) => {
  // No auth check!
  await deleteUser(req.params.id);
  res.json({ success: true });
});`,
      suggestedFix: 'Add authentication middleware to protect endpoint'
    },
    {
      id: 'error-handling-001',
      severity: 'medium',
      category: 'code-quality',
      type: 'bug',
      location: {
        file: 'src/services/data-fetcher.ts',
        line: 89,
        column: 3
      },
      message: 'Missing error handling for async operation',
      title: 'Unhandled Promise Rejection',
      description: 'Async operation lacks proper error handling',
      codeSnippet: `async function fetchUserData(userId: string) {
  const response = await fetch(\`/api/users/\${userId}\`);
  const data = await response.json();
  return data;
}`,
      suggestedFix: 'Add try-catch block for error handling'
    }
  ];

  // Create a mock comparison result
  const comparisonResult: ComparisonResult = {
    mainBranch: {
      issues: mockIssues.slice(2), // Some issues in main
      issueCount: 4,
      criticalCount: 0,
      highCount: 2,
      mediumCount: 2,
      lowCount: 0
    },
    prBranch: {
      issues: mockIssues, // All issues in PR
      issueCount: 6,
      criticalCount: 2,
      highCount: 2,
      mediumCount: 2,
      lowCount: 0
    },
    newIssues: mockIssues.slice(0, 2), // First 2 are new
    resolvedIssues: [], // No issues fixed
    unchangedIssues: mockIssues.slice(2), // Rest are unchanged
    repository: 'example/demo-repo',
    prNumber: 123,
    prTitle: 'Feature: Add user authentication and payment processing',
    prDescription: 'This PR adds new authentication system and payment processing capabilities',
    prAuthor: 'developer',
    prUrl: 'https://github.com/example/demo-repo/pull/123',
    timestamp: new Date().toISOString(),
    scanDuration: '15.3s',
    filesAnalyzed: 42,
    
    // Summary counts
    summary: {
      totalIssues: 6,
      newIssues: 2,
      fixedIssues: 0,
      unchangedIssues: 4,
      criticalIssues: 2,
      highIssues: 2,
      mediumIssues: 2,
      lowIssues: 0,
      score: 35, // Low score due to critical issues
      recommendation: 'NEEDS_WORK'
    },
    
    // Developer skills (mock data)
    developerSkills: {
      userId: 'developer',
      languages: {
        typescript: { level: 3, issuesFixed: 15, issuesIntroduced: 2 },
        javascript: { level: 2, issuesFixed: 8, issuesIntroduced: 3 }
      },
      categories: {
        security: { level: 2, issuesFixed: 5, issuesIntroduced: 2 },
        performance: { level: 3, issuesFixed: 10, issuesIntroduced: 1 },
        'code-quality': { level: 3, issuesFixed: 12, issuesIntroduced: 3 }
      },
      overallLevel: 2.5,
      totalIssuesFixed: 35,
      totalIssuesIntroduced: 8,
      lastUpdated: new Date().toISOString()
    }
  };

  // Generate the report with fix suggestions
  const generator = new ReportGeneratorV8Final();
  const report = await generator.generateReport(comparisonResult);

  // Save the report
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const reportDir = path.join(__dirname, 'demo-reports');
  
  if (!fs.existsSync(reportDir)) {
    fs.mkdirSync(reportDir, { recursive: true });
  }

  const mdPath = path.join(reportDir, `pr-analysis-with-fixes-${timestamp}.md`);
  const htmlPath = path.join(reportDir, `pr-analysis-with-fixes-${timestamp}.html`);

  // Save markdown
  fs.writeFileSync(mdPath, report);
  console.log(`✅ Markdown report saved: ${mdPath}\n`);

  // Create HTML wrapper
  const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>PR Analysis Report with Fix Suggestions</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
            background: #f6f8fa;
        }
        pre {
            background: #f0f0f0;
            padding: 10px;
            border-radius: 5px;
            overflow-x: auto;
        }
        code {
            background: #e9ecef;
            padding: 2px 5px;
            border-radius: 3px;
        }
        .issue {
            background: white;
            border: 1px solid #d1d5da;
            border-radius: 6px;
            padding: 16px;
            margin: 16px 0;
        }
        .issue-critical { border-left: 4px solid #d73a49; }
        .issue-high { border-left: 4px solid #fb8500; }
        .issue-medium { border-left: 4px solid #ffd60a; }
        .issue-low { border-left: 4px solid #0969da; }
        h1, h2, h3, h4, h5 {
            color: #24292e;
        }
        a {
            color: #0969da;
            text-decoration: none;
        }
        a:hover {
            text-decoration: underline;
        }
    </style>
</head>
<body>
    <div id="content">
        ${report.replace(/```(\w+)?\n([\s\S]*?)```/g, '<pre><code class="language-$1">$2</code></pre>')}
    </div>
</body>
</html>`;

  fs.writeFileSync(htmlPath, htmlContent);
  console.log(`✅ HTML report saved: ${htmlPath}\n`);

  // Print summary
  console.log('📊 Report Summary:');
  console.log('─'.repeat(50));
  console.log(`Repository: ${comparisonResult.repository}`);
  console.log(`PR #${comparisonResult.prNumber}: ${comparisonResult.prTitle}`);
  console.log(`\nIssues with Fix Suggestions:`);
  console.log(`  🆕 New Issues: ${comparisonResult.newIssues.length}`);
  console.log(`  📌 Pre-existing: ${comparisonResult.unchangedIssues.length}`);
  console.log(`  ✅ Fixed: ${comparisonResult.resolvedIssues.length}`);
  console.log(`\nSeverity Breakdown:`);
  console.log(`  🔴 Critical: ${comparisonResult.summary.criticalIssues}`);
  console.log(`  🟠 High: ${comparisonResult.summary.highIssues}`);
  console.log(`  🟡 Medium: ${comparisonResult.summary.mediumIssues}`);
  console.log(`  🟢 Low: ${comparisonResult.summary.lowIssues}`);
  console.log('─'.repeat(50));
  console.log('\n✨ Each issue now includes:');
  console.log('  • Copy-paste ready fix code');
  console.log('  • Time estimates (5-15 minutes per fix)');
  console.log('  • Confidence scores (high/medium/low)');
  console.log('  • Template tracking for consistency');
  
  return mdPath;
}

// Run the demo
generateDemoReport()
  .then(reportPath => {
    console.log('\n🎉 Demo complete! Check the report for fix suggestions.');
    console.log(`\n📄 Report location: ${reportPath}`);
  })
  .catch(error => {
    console.error('❌ Error generating demo report:', error);
    process.exit(1);
  });