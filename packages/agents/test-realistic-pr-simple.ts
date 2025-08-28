#!/usr/bin/env ts-node

/**
 * Simplified PR Analysis Test with Fix Suggestions
 * Using the correct ComparisonResult structure
 */

import { ReportGeneratorV8Final } from './dist/standard/comparison/report-generator-v8-final';
import { Issue } from './dist/standard/types/analysis-types';
import * as fs from 'fs';
import * as path from 'path';

// Create realistic issues that will trigger fix suggestions
const prBranchIssues: Issue[] = [
  {
    id: 'ky-700-sql-001',
    severity: 'critical',
    category: 'security',
    type: 'vulnerability',
    location: {
      file: 'source/database/query.ts',
      line: 89
    },
    message: 'SQL injection vulnerability detected',
    title: 'SQL Injection in User Query',
    description: 'Direct string concatenation in SQL query allows injection attacks',
    codeSnippet: `const query = "SELECT * FROM users WHERE id = " + userId + " AND role = '" + role + "'";
const result = await db.execute(query);`,
    suggestedFix: 'Use parameterized queries'
  },
  {
    id: 'ky-700-xss-001',
    severity: 'high',
    category: 'security',
    type: 'vulnerability',
    location: {
      file: 'source/render/profile.tsx',
      line: 156
    },
    message: 'XSS vulnerability - user input rendered without escaping',
    title: 'Cross-Site Scripting Risk',
    description: 'User bio rendered directly to DOM without sanitization',
    codeSnippet: `function renderProfile(user) {
  document.getElementById('bio').innerHTML = user.bio;
}`,
    suggestedFix: 'Sanitize HTML or use textContent'
  },
  {
    id: 'ky-700-auth-001',
    severity: 'critical',
    category: 'security',
    type: 'vulnerability',
    location: {
      file: 'source/api/admin.ts',
      line: 34
    },
    message: 'Admin endpoint lacks authentication',
    title: 'Missing Authentication on Admin Endpoint',
    description: 'DELETE endpoint for users has no auth check',
    codeSnippet: `app.delete('/api/admin/users/:id', async (req, res) => {
  // No auth middleware!
  await deleteUser(req.params.id);
  res.json({ success: true });
});`,
    suggestedFix: 'Add authentication middleware'
  },
  {
    id: 'ky-700-validation-001',
    severity: 'high',
    category: 'security',
    type: 'bug',
    location: {
      file: 'source/api/payment.ts',
      line: 67
    },
    message: 'Payment amount not validated',
    title: 'Missing Payment Validation',
    description: 'Amount parameter accepts any value without validation',
    codeSnippet: `function processPayment(amount, userId) {
  // No validation
  return stripe.charge(userId, amount);
}`,
    suggestedFix: 'Validate amount is positive number within limits'
  },
  {
    id: 'ky-700-null-001',
    severity: 'medium',
    category: 'code-quality',
    type: 'bug',
    location: {
      file: 'source/utils/helpers.ts',
      line: 234
    },
    message: 'Possible null reference exception',
    title: 'Missing Null Check',
    description: 'User object accessed without null check',
    codeSnippet: `function getUserEmail(user) {
  return user.profile.email; // user might be null
}`,
    suggestedFix: 'Add null/undefined check'
  },
  {
    id: 'ky-700-error-001',
    severity: 'medium',
    category: 'code-quality',
    type: 'bug',
    location: {
      file: 'source/api/fetch.ts',
      line: 89
    },
    message: 'Unhandled promise rejection',
    title: 'Missing Error Handling',
    description: 'Async operation without error handling',
    codeSnippet: `async function fetchData(url) {
  const response = await fetch(url);
  return response.json(); // No error handling
}`,
    suggestedFix: 'Add try-catch block'
  }
];

// Some issues in main branch (pre-existing)
const mainBranchIssues = prBranchIssues.slice(3); // Last 3 issues were already there

async function generateRealisticReport() {
  console.log('🚀 Generating Realistic PR Analysis Report\n');
  console.log('Repository: sindresorhus/ky');
  console.log('PR #700: Improve error handling and retry logic\n');

  const comparisonResult: any = {
    success: true,
    
    mainBranch: {
      name: 'main',
      issues: mainBranchIssues,
      metrics: {
        totalIssues: mainBranchIssues.length,
        highIssues: mainBranchIssues.filter(i => i.severity === 'high').length,
        mediumIssues: mainBranchIssues.filter(i => i.severity === 'medium').length
      }
    },
    
    prBranch: {
      name: 'PR #700',
      issues: prBranchIssues,
      metrics: {
        totalIssues: prBranchIssues.length,
        criticalIssues: prBranchIssues.filter(i => i.severity === 'critical').length,
        highIssues: prBranchIssues.filter(i => i.severity === 'high').length,
        mediumIssues: prBranchIssues.filter(i => i.severity === 'medium').length
      }
    },
    
    // New issues introduced in PR
    addedIssues: prBranchIssues.slice(0, 3),
    
    // No issues fixed in this PR
    fixedIssues: [],
    
    // Unchanged issues
    unchangedIssues: mainBranchIssues,
    
    // Metadata
    repository: 'sindresorhus/ky',
    prNumber: 700,
    prTitle: 'Improve error handling and retry logic',
    prDescription: 'This PR improves error handling for failed requests and adds configurable retry logic with exponential backoff. It also addresses some security concerns.',
    prAuthor: 'contributor',
    prUrl: 'https://github.com/sindresorhus/ky/pull/700',
    timestamp: new Date().toISOString(),
    scanDuration: '18.3s',
    filesAnalyzed: 24,
    
    // Developer skills tracking
    developerSkills: {
      userId: 'contributor',
      languages: {
        typescript: { level: 3, issuesFixed: 28, issuesIntroduced: 3 },
        javascript: { level: 3, issuesFixed: 15, issuesIntroduced: 2 }
      },
      categories: {
        security: { level: 2, issuesFixed: 5, issuesIntroduced: 3 },
        performance: { level: 3, issuesFixed: 12, issuesIntroduced: 0 },
        'code-quality': { level: 3, issuesFixed: 18, issuesIntroduced: 2 }
      },
      overallLevel: 2.7,
      totalIssuesFixed: 43,
      totalIssuesIntroduced: 5,
      lastUpdated: new Date().toISOString()
    },
    
    // Summary for easy access
    summary: {
      totalNew: 3,
      totalResolved: 0,
      totalUnchanged: 3,
      overallAssessment: 'This PR introduces 2 critical security vulnerabilities that must be addressed before merging.'
    }
  };

  // Generate the report
  console.log('📝 Generating report with fix suggestions...\n');
  const generator = new ReportGeneratorV8Final();
  const report = await generator.generateReport(comparisonResult);

  // Save the report
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const outputDir = path.join(__dirname, 'pr-analysis-reports');
  
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const mdPath = path.join(outputDir, `ky-pr-700-analysis-${timestamp}.md`);
  
  fs.writeFileSync(mdPath, report);
  
  // Display summary
  console.log('✅ Report Generated Successfully!\n');
  console.log('📊 Analysis Summary:');
  console.log('─'.repeat(50));
  console.log(`Total Issues: ${prBranchIssues.length}`);
  console.log(`  🆕 New Issues: ${comparisonResult.addedIssues.length}`);
  console.log(`     - ${comparisonResult.addedIssues.filter(i => i.severity === 'critical').length} Critical`);
  console.log(`     - ${comparisonResult.addedIssues.filter(i => i.severity === 'high').length} High`);
  console.log(`  📌 Pre-existing: ${comparisonResult.unchangedIssues.length}`);
  console.log(`  ✅ Fixed: ${comparisonResult.fixedIssues.length}`);
  console.log('─'.repeat(50));
  console.log('\n✨ Fix Suggestion Features:');
  console.log('  • Copy-paste ready fix code for each issue');
  console.log('  • Time estimates (5-15 minutes per fix)');
  console.log('  • Confidence scores (high/medium/low)');
  console.log('  • Template tracking for consistency');
  console.log('  • Multi-language support');
  console.log('─'.repeat(50));
  console.log(`\n📄 Full report saved to:\n   ${mdPath}`);
  
  // Also create HTML version for better viewing
  const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>CodeQual PR Analysis - sindresorhus/ky #700</title>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/github-markdown-css/5.5.0/github-markdown.min.css">
    <style>
        body {
            box-sizing: border-box;
            min-width: 200px;
            max-width: 1200px;
            margin: 0 auto;
            padding: 45px;
            background: #f6f8fa;
        }
        .markdown-body {
            background: white;
            padding: 30px;
            border-radius: 8px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }
        pre {
            background: #f6f8fa;
            border-radius: 6px;
        }
        .issue-critical { border-left: 4px solid #d73a49; padding-left: 16px; }
        .issue-high { border-left: 4px solid #fb8500; padding-left: 16px; }
        .issue-medium { border-left: 4px solid #ffd60a; padding-left: 16px; }
        .issue-low { border-left: 4px solid #0969da; padding-left: 16px; }
    </style>
</head>
<body>
    <div class="markdown-body">
        ${report.replace(/```(\w+)?\n([\s\S]*?)```/g, '<pre><code class="language-$1">$2</code></pre>')}
    </div>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/prism.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/components/prism-typescript.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/components/prism-javascript.min.js"></script>
</body>
</html>`;

  const htmlPath = path.join(outputDir, `ky-pr-700-analysis-${timestamp}.html`);
  fs.writeFileSync(htmlPath, htmlContent);
  console.log(`\n🌐 HTML version saved to:\n   ${htmlPath}`);
  
  return { mdPath, htmlPath };
}

// Execute the analysis
generateRealisticReport()
  .then(({ mdPath, htmlPath }) => {
    console.log('\n🎉 Analysis complete! Review the reports for fix suggestions.');
    console.log('\n💡 Next steps:');
    console.log('  1. Review the generated markdown report');
    console.log('  2. Open the HTML version in a browser for better formatting');
    console.log('  3. Copy fix suggestions directly from the report');
    console.log('  4. Estimated total fix time: ~45 minutes for all issues');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Error generating report:', error);
    process.exit(1);
  });